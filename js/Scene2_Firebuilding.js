/**
 * Scene2_Firebuilding.js — 生火教学全流程 + Scene 7 火把寻药（HerbHuntScene）
 * 营地 Scene 9「Discovering the Herbs」在 Scene1_CampsiteChoose.js，勿与此文件的 HerbHuntScene 混淆。
 * 内含：FireSitePrepScene, CollectMaterialsScene, SortingMaterialsScene,
 *      ConstructFireScene, MaintainFireScene, HerbHuntScene
 */

/**
 * 生火链共用：30° 等距（π/6）。与 CampSelectScene 的 2:1 近似不同，本文件内统一用此配置。
 */
var FireIso = {
  createConfig(gw, gh) {
    return {
      isoAnchorX: gw / 2,
      isoAnchorY: gh / 4,
      isoScale: 26,
      isoCos: Math.cos(Math.PI / 6),
      isoSin: Math.sin(Math.PI / 6),
    };
  },
  cartesianToIso(c, gx, gy) {
    let ggx = Number(gx);
    let ggy = Number(gy);
    if (!Number.isFinite(ggx)) ggx = 0;
    if (!Number.isFinite(ggy)) ggy = 0;
    const k = c.isoScale * c.isoCos;
    const m = c.isoScale * c.isoSin;
    const x = c.isoAnchorX + (ggx - ggy) * k;
    const y = c.isoAnchorY + (ggx + ggy) * m;
    return {
      x: Number.isFinite(x) ? x : c.isoAnchorX,
      y: Number.isFinite(y) ? y : c.isoAnchorY,
    };
  },
  isoToCartesian(c, sx, sy) {
    let sx_ = Number(sx);
    let sy_ = Number(sy);
    if (!Number.isFinite(sx_)) sx_ = c.isoAnchorX;
    if (!Number.isFinite(sy_)) sy_ = c.isoAnchorY;
    const k = c.isoScale * c.isoCos;
    const m = c.isoScale * c.isoSin;
    const rx = (sx_ - c.isoAnchorX) / k;
    const ry = (sy_ - c.isoAnchorY) / m;
    const outX = (rx + ry) / 2;
    const outY = (ry - rx) / 2;
    return {
      x: Number.isFinite(outX) ? outX : 0,
      y: Number.isFinite(outY) ? outY : 0,
    };
  },
  setDepthFromY(go) {
    if (go && typeof go.setDepth === 'function') {
      go.setDepth(go.y);
    }
  },
  drawGround(scene, c) {
    const g = scene.add.graphics().setDepth(-100);
    const ox = c.isoAnchorX;
    const oy = c.isoAnchorY + 85;
    const poly = new Phaser.Geom.Polygon([
      ox,
      oy - 200,
      ox + 340,
      oy + 20,
      ox,
      oy + 240,
      ox - 340,
      oy + 20,
    ]);
    const pts = poly.points;
    g.fillStyle(0x1e4a28, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x0f2a16, 0.55);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      g.lineTo(pts[i].x, pts[i].y);
    }
    g.closePath();
    g.strokePath();

    g.lineStyle(1, 0x2a6a38, 0.28);
    for (let i = -9; i <= 9; i++) {
      const a = FireIso.cartesianToIso(c, i, -9);
      const b = FireIso.cartesianToIso(c, i, 9);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
    for (let j = -9; j <= 9; j++) {
      const a = FireIso.cartesianToIso(c, -9, j);
      const b = FireIso.cartesianToIso(c, 9, j);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
  },
};

/** 与剧本一致的草药名（可日后与全局状态同步） */
var FIREBUILDING_HERB_NAME = 'Moonleaf';

// ---------- Firebuilding Scene 1：Encounter NPC（营地 Scene 9 或入口 → 本场景 → FireSpotInspect → … → Maintain → HerbHuntScene） ----------
class FirebuildingNpcScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FirebuildingNpcScene' });
  }

  create() {
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#141008');

    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.add.rectangle(w / 2, h / 2, w, h, 0x0e0c08, 1).setDepth(-400);
    this.isoC = FireIso.createConfig(w, h);
    FireIso.drawGround(this, this.isoC);

    const firePos = FireIso.cartesianToIso(this.isoC, 0, 0);
    this.firePos = firePos;

    this.add
      .ellipse(firePos.x, firePos.y, 88, 44, 0x2a1810, 1)
      .setStrokeStyle(2, 0x1a1008, 1)
      .setDepth(firePos.y - 2);

    const glow = this.add.graphics().setDepth(firePos.y - 3).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      glow.fillStyle(0xff9944, 0.035 * (1 - t) * (1 - t));
      glow.fillEllipse(firePos.x, firePos.y - 6, 36 + (1 - t) * 100, 20 + (1 - t) * 50);
    }

    this.fireFlames = this.add.container(firePos.x, firePos.y).setDepth(firePos.y);
    for (let i = 0; i < 9; i++) {
      const tri = this.add.triangle(
        Phaser.Math.FloatBetween(-10, 10),
        Phaser.Math.FloatBetween(-8, 12),
        0,
        -14,
        -10,
        8,
        10,
        8,
        Phaser.Math.RND.pick([0xff6600, 0xff8800, 0xffaa33])
      );
      tri.setBlendMode(Phaser.BlendModes.ADD);
      this.fireFlames.add(tri);
      this.tweens.add({
        targets: tri,
        alpha: { from: 0.5, to: 1 },
        duration: Phaser.Math.Between(80, 180),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    const travPos = FireIso.cartesianToIso(this.isoC, 0.65, -0.35);
    this.npcRoot = this.add.container(travPos.x, travPos.y);
    this.npcRoot.setDepth(travPos.y + 1);
    const npcBody = this.add.ellipse(0, 8, 48, 30, 0x6a6a72).setStrokeStyle(2, 0x3a3a42);
    const npcHead = this.add.circle(0, -22, 16, 0xd8ccc0).setStrokeStyle(2, 0x8a7a70);
    this.npcRoot.add([npcBody, npcHead]);

    const pPos = FireIso.cartesianToIso(this.isoC, -1.35, 0.55);
    this.playerDot = this.add.circle(pPos.x, pPos.y, 20, 0xffffff).setDepth(travPos.y + 3);

    this.gestureTargets = [];
    [
      [-2.8, -1.4],
      [2.9, -1.2],
      [-2.2, 2.4],
    ].forEach(([gx, gy]) => {
      const tp = FireIso.cartesianToIso(this.isoC, gx, gy);
      const root = this.add.container(tp.x, tp.y);
      const tr = this.add.triangle(0, 0, 0, -36, -20, 8, 20, 8, 0x1a6630);
      tr.setStrokeStyle(1, 0x082010, 0.8);
      const tk = this.add.rectangle(0, 10, 10, 14, 0x4a3220);
      root.add([tk, tr]);
      root.setDepth(tp.y);
      this.gestureTargets.push(root);
    });

    this.dialogBg = this.add
      .rectangle(w / 2, h - 70, w - 32, 118, 0x000000, 0.7)
      .setStrokeStyle(1, 0x5c4033, 0.85)
      .setDepth(5000);
    this.dialogText = this.add
      .text(w / 2, h - 82, '', {
        fontFamily: 'Georgia, "Segoe UI", serif',
        fontSize: '16px',
        color: '#f5e6d3',
        align: 'center',
        wordWrap: { width: w - 72 },
        lineSpacing: 4,
      })
      .setOrigin(0.5)
      .setDepth(5001);

    this.nextBtn = this.add
      .text(w / 2, h - 124, 'Next', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });
    this.nextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.nextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.nextBtn.on('pointerdown', () => this.advanceDialog());

    this.choiceRowY = h - 118;
    this.step = 0;
    this.advanceDialog();
  }

  advanceDialog() {
    const herb = FIREBUILDING_HERB_NAME;
    if (this.step === 0) {
      this.dialogText.setText('Traveler: "You\'re not from around here, are you?"');
      this.step = 1;
      return;
    }
    if (this.step === 1) {
      this.dialogText.setText(
        'Traveler: "If you\'re staying the night, don\'t rush your fire. Most people get that part wrong."'
      );
      this.step = 2;
      return;
    }
    if (this.step === 2) {
      this.showChoices();
      return;
    }
    if (this.step === 3) {
      this.dialogText.setText(
        `(You): "Also… I need to ask — do you know where to find ${herb}?"\n\nTraveler: "Ah… ${herb}? They grow around here, but you\'ll want to watch for them in the dark." "They have a way of standing out under the light of a fire."`
      );
      this.step = 4;
      return;
    }
    if (this.step === 4) {
      this.playGestureAndSparks();
      return;
    }
  }

  showChoices() {
    this.nextBtn.setVisible(false);
    const y = this.choiceRowY;
    const cx = GAME_WIDTH / 2;

    this.choiceA = this.add
      .text(cx - 220, y, '“It’s just a fire. How hard can it be?”', {
        fontSize: '14px',
        color: '#f0e8d8',
        backgroundColor: '#4a3a2a',
        padding: { x: 14, y: 10 },
        wordWrap: { width: 200 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(5003)
      .setInteractive({ useHandCursor: true });

    this.choiceB = this.add
      .text(cx + 220, y, '“What should I be careful about?”', {
        fontSize: '14px',
        color: '#f0e8d8',
        backgroundColor: '#4a3a2a',
        padding: { x: 14, y: 10 },
        wordWrap: { width: 200 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(5003)
      .setInteractive({ useHandCursor: true });

    const pick = (which) => {
      if (this.choiceA) {
        this.choiceA.destroy();
        this.choiceA = null;
      }
      if (this.choiceB) {
        this.choiceB.destroy();
        this.choiceB = null;
      }
      this.nextBtn.setVisible(true);
      if (which === 'a') {
        this.dialogText.setText('Traveler: "Fire isn\'t the danger… where you put it is."');
      } else {
        this.dialogText.setText(
          'Traveler: "Wind, ground, what\'s around you… that decides everything."'
        );
      }
      this.step = 3;
    };

    this.choiceA.once('pointerdown', () => pick('a'));
    this.choiceB.once('pointerdown', () => pick('b'));
  }

  playGestureAndSparks() {
    if (this.animPlayed) return;
    this.animPlayed = true;
    this.nextBtn.setVisible(false);

    this.gestureTargets.forEach((tree, i) => {
      this.tweens.add({
        targets: tree,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 320,
        delay: i * 90,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });

    this.tweens.add({
      targets: this.npcRoot,
      x: this.npcRoot.x + 10,
      duration: 400,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    const fp = this.firePos;
    for (let s = 0; s < 16; s++) {
      const spark = this.add.circle(
        fp.x + Phaser.Math.FloatBetween(-16, 16),
        fp.y + Phaser.Math.FloatBetween(-8, 8),
        Phaser.Math.Between(2, 5),
        0xffcc66,
        1
      );
      spark.setDepth(fp.y + 5).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.FloatBetween(-40, 40),
        y: spark.y - Phaser.Math.Between(40, 90),
        alpha: 0,
        duration: Phaser.Math.Between(400, 700),
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: this.playerDot,
        x: GAME_WIDTH + 120,
        duration: 1800,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.dialogText.setText('(You head back toward camp — time to gather what you need for the fire.)');
          this.nextBtn.setVisible(true);
          this.nextBtn.off('pointerdown');
          this.nextBtn.on('pointerdown', () => this.goToCollect());
        },
      });
    });
  }

  goToCollect() {
    this.nextBtn.disableInteractive();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.start(SCENE_KEYS.FIRE_SPOT_INSPECT);
    });
  }
}

// ---------- Firebuilding Scene 2：Where to build — four inspect points ----------
class FireSpotInspectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FireSpotInspectScene' });
  }

  create() {
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(450, 0, 0, 0);

    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const cw = this.cameras.main.width;
    const ch = this.cameras.main.height;
    this.add.rectangle(w / 2, h / 2, w, h, 0x0f0e0a, 1).setDepth(-400);
    this.isoC = FireIso.createConfig(w, h);
    FireIso.drawGround(this, this.isoC);

    const p0 = FireIso.cartesianToIso(this.isoC, -1.2, 0.6);
    this.playerDot = this.add.circle(p0.x, p0.y, 20, 0xffffff).setDepth(2000);

    this.dialogBg = this.add
      .rectangle(cw / 2, ch - 65, cw - 28, 130, 0x000000, 0.72)
      .setStrokeStyle(1, 0x5c4033, 0.88)
      .setDepth(5000);
    this.dialogText = this.add
      .text(cw / 2, ch - 90, '', {
        fontFamily: 'Georgia, "Segoe UI", serif',
        fontSize: '16px',
        color: '#f5e6d3',
        align: 'center',
        wordWrap: { width: cw - 100 },
        lineSpacing: 5,
      })
      .setOrigin(0.5)
      .setDepth(5001);

    this.introStep = 0;
    this.zonesEnabled = false;

    this.nextBtn = this.add
      .text(cw / 2, ch - 35, 'Next', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });
    this.nextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.nextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.nextBtn.on('pointerdown', () => this.advanceIntro());

    this.hintText = this.add
      .text(w / 2, 52, '', {
        fontSize: '13px',
        color: '#c8c0a8',
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5)
      .setDepth(1500)
      .setAlpha(0);

    this.continueBtn = this.add
      .text(cw / 2, ch - 35, 'Continue — prepare the fire site', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#4a6b3a',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.continueBtn.on('pointerdown', () => this.goCollect());
    this.continueBtn.disableInteractive();

    this.spotGraphics = [];
    this.spotZones = [];

    const tileSize = 0.82;
    const spots = [
      {
        id: 'branches',
        cartX: -2.35,
        cartY: -2.05,
        color: 0x2e4a38,
        label: 'Under low branches',
        decor: 'branches',
      },
      {
        id: 'grass',
        cartX: 2.45,
        cartY: -1.75,
        color: 0x7cb342,
        label: 'Near dry grass',
        decor: 'grass',
      },
      {
        id: 'gear',
        cartX: -2.25,
        cartY: 2.15,
        color: 0x5d4a3a,
        label: 'Close to resting area',
        decor: 'gear',
      },
      {
        id: 'open',
        cartX: 2.15,
        cartY: 2.05,
        color: 0xa5d6a7,
        label: 'Open, clear ground',
        decor: 'open',
      },
    ];

    spots.forEach((sp) => {
      const c = this.isoTileCorners(sp.cartX, sp.cartY, tileSize);
      const g = this.add.graphics();
      g.fillStyle(sp.color, 1);
      g.beginPath();
      g.moveTo(c.tl.x, c.tl.y);
      g.lineTo(c.tr.x, c.tr.y);
      g.lineTo(c.br.x, c.br.y);
      g.lineTo(c.bl.x, c.bl.y);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xffffff, 0.38);
      g.strokePath();
      const ctr = FireIso.cartesianToIso(this.isoC, sp.cartX, sp.cartY);
      g.setDepth(ctr.y);

      if (sp.decor === 'branches') {
        const o = FireIso.cartesianToIso(this.isoC, sp.cartX, sp.cartY - 0.35);
        g.fillStyle(0x1a2818, 0.95);
        g.fillTriangle(o.x, o.y - 28, o.x - 36, o.y + 8, o.x + 36, o.y + 8);
        g.fillStyle(0x0d180d, 0.9);
        g.fillTriangle(o.x, o.y - 22, o.x - 28, o.y + 4, o.x + 28, o.y + 4);
      } else if (sp.decor === 'grass') {
        for (let k = 0; k < 6; k++) {
          const ox = Phaser.Math.FloatBetween(-18, 18);
          const oy = Phaser.Math.FloatBetween(-10, 10);
          g.fillStyle(0xcddc39, 0.55);
          g.fillEllipse(ctr.x + ox, ctr.y + oy, 8, 4);
        }
      } else if (sp.decor === 'gear') {
        const bx = ctr.x - 8;
        const by = ctr.y + 4;
        g.fillStyle(0x6d4c41, 1);
        g.fillRect(bx - 18, by - 22, 36, 28);
        g.lineStyle(2, 0x3e2723, 1);
        g.strokeRect(bx - 18, by - 22, 36, 28);
        g.fillStyle(0x8d6e63, 0.9);
        g.fillRect(bx - 10, by - 30, 20, 8);
      }

      const lblY = Math.max(c.bl.y, c.br.y, c.tl.y, c.tr.y) + 12;
      const lbl = this.add
        .text(ctr.x, lblY, sp.label, {
          fontSize: '12px',
          color: '#f0e8dc',
          align: 'center',
          wordWrap: { width: 160 },
        })
        .setOrigin(0.5, 0)
        .setDepth(ctr.y + 2);

      const minX = Math.min(c.tl.x, c.tr.x, c.br.x, c.bl.x, lbl.x - 80);
      const maxX = Math.max(c.tl.x, c.tr.x, c.br.x, c.bl.x, lbl.x + 80);
      const minY = Math.min(c.tl.y, c.tr.y, c.br.y, c.bl.y, lbl.y);
      const maxY = Math.max(c.tl.y, c.tr.y, c.br.y, c.bl.y, lbl.y + 40);
      const bw = Math.max(maxX - minX, 40);
      const bh = Math.max(maxY - minY, 40);
      const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
      zone.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, bw, bh),
        Phaser.Geom.Rectangle.Contains
      );
      zone.setDepth(ctr.y + 5);
      zone.setData('spotId', sp.id);
      zone.on('pointerdown', (pointer) => {
        if (!this.zonesEnabled) return;
        this.movePlayerThen(pointer.x, pointer.y, () => this.onSpotInspect(sp.id));
      });
      zone.on('pointerover', () => {
        if (this.zonesEnabled) this.input.setDefaultCursor('pointer');
      });
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));

      this.spotGraphics.push({ g, lbl, zone });
    });

    this.lastInspectedSpotId = null;
    this.advanceIntro();
  }

  isoTileCorners(cartX, cartY, size) {
    return {
      tl: FireIso.cartesianToIso(this.isoC, cartX - size, cartY - size),
      tr: FireIso.cartesianToIso(this.isoC, cartX + size, cartY - size),
      br: FireIso.cartesianToIso(this.isoC, cartX + size, cartY + size),
      bl: FireIso.cartesianToIso(this.isoC, cartX - size, cartY + size),
    };
  }

  movePlayerThen(x, y, onComplete) {
    this.tweens.killTweensOf(this.playerDot);
    const dist = Phaser.Math.Distance.Between(this.playerDot.x, this.playerDot.y, x, y);
    if (dist < 10) {
      if (onComplete) onComplete();
      return;
    }
    const dur = Phaser.Math.Clamp(200 + dist * 0.38, 260, 820);
    this.tweens.add({
      targets: this.playerDot,
      x,
      y,
      duration: dur,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.playerDot.setDepth(2000);
        if (onComplete) onComplete();
      },
    });
  }

  advanceIntro() {
    if (this.introStep === 0) {
      this.dialogText.setText('If I\'m building a fire here…');
      this.introStep = 1;
      return;
    }
    if (this.introStep === 1) {
      this.dialogText.setText(
        '…I need to think about where it will spread, not just where it starts.'
      );
      this.introStep = 2;
      return;
    }
    if (this.introStep === 2) {
      this.zonesEnabled = true;
      this.dialogText.setText('Tap each area to inspect.');
      this.nextBtn.setVisible(false).disableInteractive();
      this.tweens.add({ targets: this.hintText, alpha: 1, duration: 400 });
      this.hintText.setText('Inspect: low branches · dry grass · near your gear · open ground');
      this.continueBtn.setAlpha(1);
      this.continueBtn.setInteractive({ useHandCursor: true });
    }
  }

  onSpotInspect(id) {
    this.lastInspectedSpotId = id;
    if (this.pendingLine) {
      this.pendingLine.remove(false);
      this.pendingLine = null;
    }
    if (id === 'branches') {
      this.dialogText.setText('…There\'s cover here…');
      this.pendingLine = this.time.delayedCall(950, () => {
        this.dialogText.setText('…No. If the flames rise—those branches will catch.');
        this.pendingLine = null;
      });
      return;
    }
    if (id === 'grass') {
      this.dialogText.setText(
        '…This spot looks easy to light… But this grass would burn too fast.'
      );
      return;
    }
    if (id === 'gear') {
      this.dialogText.setText(
        '…It\'s close to my gear…That might not be a good idea.'
      );
      return;
    }
    if (id === 'open') {
      this.dialogText.setText(
        '…This area is more open… Fewer things to catch fire nearby.\n\n…It\'s a good spot—but it\'s not ready yet.'
      );
    }
  }

  goCollect() {
    const spotId = this.lastInspectedSpotId || 'open';
    this.registry.set('fireSpotId', spotId);
    this.continueBtn.disableInteractive();
    this.cameras.main.fadeOut(450, 0, 0, 0);
    this.time.delayedCall(450, () => {
      this.scene.start(SCENE_KEYS.FIRE_PREP);
    });
  }
}

// ---------- Scene 3：Preparing the Fire Site — Isometric 等距营地 ----------
/** 可拖杂物/石头相对 y 的深度偏移，需大于背景松树 depth，避免被树冠挡住 */
var FIRE_PREP_LAYER_OFFSET = 450;
/** 玩家白点固定置于玩法层之下，避免挡住杂物/石头点击 */
var FIRE_PREP_PLAYER_DEPTH = 165;

/** Collect 关：地面材料永远在玩家圆点之上，避免遮挡拾取 */
var COLLECT_ITEM_DEPTH_OFFSET = 430;
var COLLECT_PLAYER_DEPTH = 158;
var COLLECT_DRAG_DEPTH = 10040;
/** Screen Y cutoff: do not spawn ground items in the thin top HUD strip (height matches CollectMaterialsScene bar). */
var COLLECT_TOP_SCREEN_MIN_Y = 96;

class FireSitePrepScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FireSitePrepScene' });
  }

  cartesianToIso(gx, gy) {
    return FireIso.cartesianToIso(this.isoC, gx, gy);
  }

  isoToCartesian(sx, sy) {
    return FireIso.isoToCartesian(this.isoC, sx, sy);
  }

  setDepthFromY(go) {
    FireIso.setDepthFromY(go);
  }

  /**
   * 杂物/石头：在接地点 y 上加较大偏移，保证绘制与点击始终压在「背景松树」之上；
   * 松树单独用较低的 depth，避免遮挡清理区。
   */
  setPrepInteractiveDepth(go) {
    if (go && typeof go.setDepth === 'function') {
      go.setDepth(go.y + FIRE_PREP_LAYER_OFFSET);
    }
  }

  ensurePlayerDot() {
    if (this.playerDot && this.playerDot.active) return;
    const p = this.cartesianToIso(-1.25, 0.35);
    this.playerDot = this.add.circle(p.x, p.y, 20, 0xffffff).setDepth(FIRE_PREP_PLAYER_DEPTH);
    if (this.playerDot.disableInteractive) this.playerDot.disableInteractive();
  }

  movePlayerThen(x, y, onComplete) {
    this.ensurePlayerDot();
    this.tweens.killTweensOf(this.playerDot);
    const dist = Phaser.Math.Distance.Between(this.playerDot.x, this.playerDot.y, x, y);
    if (dist < 8) {
      if (onComplete) onComplete();
      return;
    }
    const dur = Phaser.Math.Clamp(220 + dist * 0.4, 280, 900);
    this.tweens.add({
      targets: this.playerDot,
      x,
      y,
      duration: dur,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.playerDot && this.playerDot.setDepth) {
          this.playerDot.setDepth(FIRE_PREP_PLAYER_DEPTH);
        }
        if (onComplete) onComplete();
      },
    });
  }

  drawIsoGround() {
    FireIso.drawGround(this, this.isoC);
  }

  /** 扁平椭圆黄色径向光晕（等距透视下的火光） */
  drawFireGlowElliptical(fx, fy) {
    const glow = this.add.graphics().setDepth(fy).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 14; i >= 0; i--) {
      const t = i / 14;
      const rw = 28 + (1 - t) * 200;
      const rh = 14 + (1 - t) * 100;
      const a = 0.05 * (1 - t) * (1 - t);
      glow.fillStyle(0xffdd99, a);
      glow.fillEllipse(fx, fy, rw, rh);
    }
    glow.fillStyle(0xffaa55, 0.1);
    glow.fillEllipse(fx, fy - 4, 48, 24);
  }

  /** 槽位幽灵圈：扁椭圆线框 */
  addDashedGhostEllipse(sx, sy, rw, rh) {
    const g = this.add.graphics().setDepth(sy);
    g.lineStyle(1, 0xb8c8c0, 0.42);
    g.strokeEllipse(sx, sy, rw * 2, rh * 2);
    g.lineStyle(1, 0x889898, 0.22);
    g.strokeEllipse(sx, sy, rw * 2 + 4, rh * 2 + 2);
  }

  /** 倾斜六边形石块（扁平感） */
  createHexRock(screenX, screenY, radius) {
    const squash = 0.5;
    const flat = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      flat.push(Math.cos(a) * radius, Math.sin(a) * radius * squash);
    }
    const poly = this.add.polygon(screenX, screenY, flat, 0x6a6a72, 0x4a4a52);
    poly.setStrokeStyle(2, 0x3a3a42, 1);
    const hw = radius * 1.05;
    const hh = radius * squash * 1.15;
    poly.setInteractive(
      new Phaser.Geom.Rectangle(-hw, -hh, hw * 2, hh * 2),
      Phaser.Geom.Rectangle.Contains
    );
    poly.input.cursor = 'pointer';
    return poly;
  }

  /** 边缘松树：三层渐缩等边三角形 + 褐色树干，depth = 接地点 screenY */
  addIsoPineTreeAt(screenX, screenY) {
    const root = this.add.container(screenX, screenY);
    const trunk = this.add
      .rectangle(0, -6, 16, 14, 0x4a3220)
      .setStrokeStyle(1, 0x2a1a0e, 0.95)
      .setOrigin(0.5, 1);
    root.add(trunk);
    const eqH = (w) => (w * Math.sqrt(3)) / 2;
    const widths = [54, 40, 28];
    const greens = [0x124a22, 0x1a6630, 0x248040];
    let baseY = 0;
    for (let i = 0; i < 3; i++) {
      const w = widths[i];
      const h = eqH(w);
      const apexY = baseY - h;
      const tri = this.add.triangle(0, 0, 0, apexY, -w / 2, baseY, w / 2, baseY, greens[i]);
      tri.setStrokeStyle(1, 0x082010, 0.75);
      root.add(tri);
      baseY = apexY + 9;
    }
    root.setDepth(Phaser.Math.Clamp(screenY - 95, 12, 228));
    return root;
  }

  addInspectBushAt(screenX, screenY, depthY) {
    const g = this.add.graphics().setDepth(depthY);
    g.fillStyle(0x1b5e20, 0.88);
    g.fillEllipse(screenX, screenY + 6, 40, 24);
    for (let i = 0; i < 6; i++) {
      const ox = Phaser.Math.FloatBetween(-16, 16);
      const oy = Phaser.Math.FloatBetween(-10, 10);
      g.fillStyle(0x2e7d32, 0.92);
      g.fillEllipse(screenX + ox, screenY + oy, 20, 12);
    }
  }

  addInspectBranchesAt(screenX, screenY, depthY) {
    const g = this.add.graphics().setDepth(depthY);
    for (let i = 0; i < 5; i++) {
      const x0 = screenX + Phaser.Math.FloatBetween(-22, 22);
      const y0 = screenY + Phaser.Math.FloatBetween(-8, 8);
      const w = Phaser.Math.FloatBetween(26, 48);
      g.fillStyle(0x5d4037, 1);
      g.fillRect(x0 - w / 2, y0 - 3, w, 6);
      g.lineStyle(1, 0x3e2723, 0.9);
      g.strokeRect(x0 - w / 2, y0 - 3, w, 6);
    }
  }

  /**
   * 火堆：Phaser.Geom.Triangle 生成多枚小三角 + ADD 混合 + 随机 alpha 闪烁
   * depth = 容器接地点 fy
   */
  addProceduralFireAt(fx, fy) {
    const root = this.add.container(fx, fy);
    const palette = [0xff5500, 0xff8800, 0xffdd66, 0xffbb33, 0xff3300, 0xffaa44, 0xffcc00];
    for (let i = 0; i < 11; i++) {
      const jx = Phaser.Math.FloatBetween(-16, 16);
      const jy = Phaser.Math.FloatBetween(-26, 8);
      const size = Phaser.Math.FloatBetween(11, 24);
      const geom = new Phaser.Geom.Triangle(
        jx,
        jy - size * 0.9,
        jx - size * 0.55,
        jy + size * 0.4,
        jx + size * 0.55,
        jy + size * 0.4
      );
      const c = Phaser.Math.RND.pick(palette);
      const tri = this.add.triangle(
        0,
        0,
        geom.x1,
        geom.y1,
        geom.x2,
        geom.y2,
        geom.x3,
        geom.y3,
        c
      );
      tri.setStrokeStyle(1, 0xffe0a0, 0.35);
      tri.setBlendMode(Phaser.BlendModes.ADD);
      const baseA = Phaser.Math.FloatBetween(0.5, 0.98);
      tri.setAlpha(baseA);
      root.add(tri);
      const aLo = Phaser.Math.FloatBetween(0.28, 0.55);
      const aHi = Phaser.Math.FloatBetween(0.88, 1);
      this.tweens.add({
        targets: tri,
        alpha: { from: aLo, to: aHi },
        duration: Phaser.Math.Between(70, 200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        delay: Phaser.Math.Between(0, 500),
      });
    }
    root.setDepth(fy);
    return root;
  }

  create() {
    this.input.off('drag');
    this.input.off('dragend');
    this.prepGameplayActive = false;
    this.prepInspectHits = [];
    this.debrisPieces = [];

    const cfg = this.sys.game.config;
    const gw = Number(cfg.width) || (typeof GAME_WIDTH !== 'undefined' ? GAME_WIDTH : 800);
    const gh = Number(cfg.height) || (typeof GAME_HEIGHT !== 'undefined' ? GAME_HEIGHT : 600);
    this.isoC = FireIso.createConfig(gw, gh);

    // 上一场景 FireSpotScene 用 fadeOut 切场景时，主摄像机可能仍处在全黑淡出状态；必须清掉再画
    const cam = this.cameras.main;
    if (typeof cam.resetFX === 'function') {
      cam.resetFX();
    }
    cam.setAlpha(1);
    if (typeof cam.clearMask === 'function') {
      cam.clearMask();
    }
    cam.setBackgroundColor('#222222');
    // 不再叠加 fadeIn：避免与上一场景 fadeOut 状态叠加导致长时间全黑

    this.drawIsoGround();

    const spotId = this.registry.get('fireSpotId') || 'open';
    const SITE_CART = {
      open: [0, 0],
      branches: [-0.42, -0.38],
      grass: [0.4, -0.35],
      gear: [-0.38, 0.44],
    };
    const [fcx, fcy] = SITE_CART[spotId] || SITE_CART.open;
    this.fireSiteCart = { x: fcx, y: fcy };

    const siteTitles = {
      branches: 'Under low branches',
      grass: 'Near dry grass',
      gear: 'Close to resting area',
      open: 'Open, clear ground',
    };
    this.siteTitle = siteTitles[spotId] || siteTitles.open;

    const firePos = this.cartesianToIso(fcx, fcy);
    this.add
      .ellipse(firePos.x, firePos.y, 62, 32, 0x1a120c, 1)
      .setStrokeStyle(2, 0x140c08, 1)
      .setDepth(firePos.y);

    const pPos = this.cartesianToIso(fcx - 1.25, fcy + 0.35);
    this.playerDot = this.add.circle(pPos.x, pPos.y, 20, 0xffffff).setDepth(FIRE_PREP_PLAYER_DEPTH);
    if (this.playerDot.disableInteractive) this.playerDot.disableInteractive();

    /** 松树略向外推，减少与火坑清理区重叠 */
    const treeGrids = [
      [-3.45, -2.28],
      [3.45, -2.18],
      [-4.35, 1.32],
      [4.05, 1.08],
      [-5.0, 0.22],
      [4.85, 0.12],
      [0.22, -3.85],
    ];
    this.prepTreeCartesian = treeGrids.map(([gx, gy]) => ({ gx, gy }));
    treeGrids.forEach(([gx, gy]) => {
      const tp = this.cartesianToIso(gx, gy);
      this.addIsoPineTreeAt(tp.x, tp.y);
    });

    const inspectSpots = [
      {
        gx: fcx - 2.4,
        gy: fcy + 2.6,
        kind: 'bush',
        line: '…Close enough to catch if the fire grows.',
      },
      {
        gx: fcx + 0.2,
        gy: fcy - 3.3,
        kind: 'branch',
        line: 'If the flames get higher… that could be a problem.',
      },
    ];
    /** cartesian：杂物生成时远离检视点，避免与小块点击区重叠 */
    const INSPECT_EXCLUDE_CART_R = 0.92;
    const TREE_EXCLUDE_CART_R = 1.25;
    const isClearOfInspectSpots = (gx, gy) =>
      inspectSpots.every((sp) => Math.hypot(gx - sp.gx, gy - sp.gy) >= INSPECT_EXCLUDE_CART_R);
    const isClearOfTrees = (gx, gy) =>
      this.prepTreeCartesian.every((t) => Math.hypot(gx - t.gx, gy - t.gy) >= TREE_EXCLUDE_CART_R);

    inspectSpots.forEach((sp) => {
      const ip = this.cartesianToIso(sp.gx, sp.gy);
      if (sp.kind === 'bush') {
        this.addInspectBushAt(ip.x, ip.y, ip.y);
      } else {
        this.addInspectBranchesAt(ip.x, ip.y, ip.y);
      }
      const hit = this.add
        .circle(ip.x, ip.y, 20, 0x2a4a22, 0.14)
        .setStrokeStyle(1, 0x4a6a3a, 0.45)
        .setDepth(ip.y + 300);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (pointer) => {
        if (!this.prepGameplayActive) return;
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.prepDialog.setText(sp.line);
        });
      });
      this.prepInspectHits.push(hit);
    });

    const SNAP_PX = 54;
    const slotRing = [
      [1.45, 0],
      [0.72, 0.95],
      [-0.72, 0.95],
      [-1.45, 0],
      [-0.72, -0.95],
      [0.72, -0.95],
    ];
    this.rockSlots = [];
    slotRing.forEach(([gx, gy], i) => {
      const sp = this.cartesianToIso(fcx + gx * 1.75, fcy + gy * 1.75);
      this.addDashedGhostEllipse(sp.x, sp.y, 26, 13);
      this.rockSlots.push({ x: sp.x, y: sp.y, filled: false, index: i });
    });

    const cx = gw / 2;
    const prepHudH = 96;
    this.prepHudBar = this.add
      .rectangle(cx, prepHudH / 2, gw, prepHudH, 0x121610, 0.42)
      .setDepth(998)
      .setStrokeStyle(0)
      .setAlpha(0);
    this.prepTitle = this.add
      .text(cx, 14, 'Preparing the Fire Site', {
        fontSize: '18px',
        color: '#e8f0e0',
      })
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);
    this.prepSiteLine = this.add
      .text(cx, 36, `Chosen location: ${this.siteTitle}`, {
        fontSize: '11px',
        color: '#a8b898',
        align: 'center',
        wordWrap: { width: gw - 36 },
      })
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);
    this.prepInstr = this.add
      .text(
        cx,
        52,
        'Tap debris to walk over and kick it aside. Then drag rocks onto the ring.',
        {
          fontSize: '12px',
          color: '#c5d4ba',
          align: 'center',
          lineSpacing: 4,
          wordWrap: { width: gw - 36 },
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);

    this.prepDialog = this.add
      .text(cx, gh - 62, '', {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: gw - 48 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setAlpha(0);

    const PREP_DRAG_DEPTH = 10050;

    const debrisTotal = Phaser.Math.Between(10, 15);
    this.slotsFilled = 0;
    this.prepComplete = false;

    let safety = 0;
    while (this.debrisPieces.length < debrisTotal && safety < 2500) {
      safety += 1;
      const gx = Phaser.Math.FloatBetween(-2.8, 2.8) + fcx * 0.15;
      const gy = Phaser.Math.FloatBetween(-1.8, 2.6) + fcy * 0.15;
      if (Math.hypot(gx - fcx, gy - fcy) < 1.15) continue;
      if (!isClearOfInspectSpots(gx, gy)) continue;
      if (!isClearOfTrees(gx, gy)) continue;
      const pos = this.cartesianToIso(gx, gy);
      const kind = Phaser.Math.RND.pick(['leaf', 'grass', 'twig']);
      let piece;
      if (kind === 'grass') {
        piece = this.add.ellipse(
          pos.x,
          pos.y,
          Phaser.Math.Between(11, 18),
          Phaser.Math.Between(7, 11),
          0x7cb342,
          1
        );
        piece.setStrokeStyle(1, 0x558b2f, 0.95);
        piece.rotation = Phaser.Math.FloatBetween(-0.4, 0.4);
      } else if (kind === 'twig') {
        piece = this.add.rectangle(
          pos.x,
          pos.y,
          Phaser.Math.Between(20, 34),
          Phaser.Math.Between(3, 5),
          0x5d4037
        );
        piece.setStrokeStyle(1, 0x3e2723, 0.95);
        piece.rotation = Phaser.Math.FloatBetween(-0.85, 0.85);
      } else {
        piece = this.add.rectangle(
          pos.x,
          pos.y,
          Phaser.Math.Between(9, 15),
          Phaser.Math.Between(5, 10),
          0x6d4c41
        );
        piece.setStrokeStyle(1, 0x4e342e, 0.9);
        piece.rotation = Phaser.Math.FloatBetween(-0.55, 0.55);
      }
      piece.setData('type', 'debris');
      piece.setData('debrisKind', kind);
      this.setPrepInteractiveDepth(piece);
      piece.setInteractive({ useHandCursor: true });
      this.debrisPieces.push(piece);
    }
    this.debrisRemaining = this.debrisPieces.length;

    const rockHomeGrids = [
      [-4.8, -1.1],
      [4.8, -1.1],
      [-4.6, 2.4],
      [4.6, 2.4],
      [0, -3.4],
      [0, 3.5],
    ];
    this.prepRocks = [];
    rockHomeGrids.forEach(([gx, gy], idx) => {
      const pos = this.cartesianToIso(gx + fcx * 0.25, gy + fcy * 0.25);
      const rock = this.createHexRock(pos.x, pos.y, 21);
      rock.setData('type', 'rock');
      rock.setData('placed', false);
      rock.setData('slotIndex', null);
      rock.setData('rockId', idx);
      this.setPrepInteractiveDepth(rock);
      this.input.setDraggable(rock);
      this.prepRocks.push(rock);
    });

    this.prepRocks.forEach((rock) => {
      rock.on('dragstart', () => {
        if (!this.prepGameplayActive || this.prepComplete) return;
        rock.setDepth(PREP_DRAG_DEPTH);
        if (this.debrisRemaining > 0) {
          this.prepDialog.setText('I should clear the dry debris first before building the ring.');
        } else {
          this.prepDialog.setText('This should keep it contained…');
        }
      });
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (!this.prepGameplayActive) return;
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('type') === 'debris') return;
      if (gameObject.getData('placed')) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
      gameObject.setDepth(PREP_DRAG_DEPTH);
    });

    const sweepDebrisAway = (piece) => {
      if (!piece || !piece.active || piece.getData('gone')) return;
      piece.setData('gone', true);
      piece.disableInteractive();
      const ang = Phaser.Math.FloatBetween(-Math.PI * 0.35, Math.PI * 0.35) + Math.atan2(piece.y - gh * 0.42, piece.x - gw * 0.5);
      const dist = Phaser.Math.Between(120, 220);
      const tx = piece.x + Math.cos(ang) * dist;
      const ty = piece.y + Math.sin(ang) * dist * 0.85;
      this.tweens.add({
        targets: piece,
        x: tx,
        y: ty,
        alpha: 0,
        rotation: piece.rotation + Phaser.Math.FloatBetween(-1.2, 1.2),
        scaleX: 0.75,
        scaleY: 0.75,
        duration: 320,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          if (piece && piece.scene) piece.destroy();
          this.debrisRemaining -= 1;
          this.updateNextButtonState();
          this.checkPrepComplete();
        },
      });
    };

    this.input.on('dragend', (pointer, gameObject) => {
      if (!this.prepGameplayActive) return;
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('type') !== 'rock') return;
      if (gameObject.getData('placed')) return;

      if (this.debrisRemaining > 0) {
        let best = null;
        let bestD = Infinity;
        this.rockSlots.forEach((s) => {
          if (s.filled) return;
          const d = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, s.x, s.y);
          if (d < bestD) {
            bestD = d;
            best = s;
          }
        });
        if (best && bestD < SNAP_PX) {
          this.prepDialog.setText('I should clear the dry debris first before building the ring.');
        }
        this.setPrepInteractiveDepth(gameObject);
        return;
      }

      let targetSlot = null;
      let nearest = Infinity;
      this.rockSlots.forEach((s) => {
        if (s.filled) return;
        const d = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, s.x, s.y);
        if (d < SNAP_PX && d < nearest) {
          nearest = d;
          targetSlot = s;
        }
      });

      if (targetSlot) {
        targetSlot.filled = true;
        gameObject.setData('placed', true);
        gameObject.setData('slotIndex', targetSlot.index);
        this.input.setDraggable(gameObject, false);
        this.slotsFilled += 1;

        this.tweens.add({
          targets: gameObject,
          x: targetSlot.x,
          y: targetSlot.y,
          duration: 220,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            gameObject.setFillStyle(0x3d3d46);
            gameObject.setStrokeStyle(2, 0x2a2a32, 1);
            this.setPrepInteractiveDepth(gameObject);
            this.tweens.add({
              targets: gameObject,
              scaleX: 1.08,
              scaleY: 1.08,
              duration: 90,
              yoyo: true,
              ease: 'Sine.easeOut',
              onComplete: () => {
                gameObject.setScale(1);
              },
            });
          },
        });

        this.prepDialog.setText('This should keep it contained…');
        this.updateNextButtonState();
        this.checkPrepComplete();
      } else {
        this.setPrepInteractiveDepth(gameObject);
      }
    });

    this.debrisPieces.forEach((piece) => {
      piece.on('pointerdown', () => {
        if (!this.prepGameplayActive || this.prepComplete || piece.getData('gone')) return;
        this.prepDialog.setText('Too dry… this would catch immediately.');
        this.movePlayerThen(piece.x, piece.y + 6, () => {
          if (!piece.active || piece.getData('gone')) return;
          sweepDebrisAway(piece);
        });
      });
    });

    this.debrisPieces.forEach((piece) => {
      if (piece && piece.disableInteractive) piece.disableInteractive();
    });
    this.prepRocks.forEach((rock) => {
      this.input.setDraggable(rock, false);
    });
    this.prepInspectHits.forEach((hit) => {
      if (hit && hit.disableInteractive) hit.disableInteractive();
    });

    this.nextMaterialsBtn = this.add
      .text(cx, gh - 120, 'Next: Collect Materials', {
        fontSize: '18px',
        color: '#fff8e7',
        backgroundColor: '#4a6b3a',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(1000);
    this.nextMaterialsBtn.setInteractive({ useHandCursor: true });
    this.nextMaterialsBtn.disableInteractive();

    this.nextMaterialsBtn.on('pointerover', () => {
      if (!this.prepComplete) return;
      this.nextMaterialsBtn.setStyle({ backgroundColor: '#5d8548' });
    });
    this.nextMaterialsBtn.on('pointerout', () => {
      if (!this.prepComplete) return;
      this.nextMaterialsBtn.setStyle({ backgroundColor: '#4a6b3a' });
    });

    this.nextMaterialsBtn.on('pointerdown', () => {
      if (!this.prepComplete) return;
      this.nextMaterialsBtn.disableInteractive().setAlpha(0.55);
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(450, () => {
        this.scene.start(SCENE_KEYS.COLLECT);
      });
    });

    this.startPrepIntro();
  }

  updateNextButtonState() {
    if (!this.nextMaterialsBtn || this.prepComplete) return;
    if (!this.prepGameplayActive) {
      this.nextMaterialsBtn.setAlpha(0);
      this.nextMaterialsBtn.disableInteractive();
      return;
    }
    const ready =
      this.debrisRemaining <= 0 &&
      this.slotsFilled >= 6 &&
      this.rockSlots.every((s) => s.filled);
    if (ready) return;
    this.nextMaterialsBtn.setAlpha(0.38);
    this.nextMaterialsBtn.disableInteractive();
  }

  checkPrepComplete() {
    if (this.prepComplete) return;
    const allClear = this.debrisRemaining <= 0;
    const allRocks = this.slotsFilled >= 6 && this.rockSlots.every((s) => s.filled);
    if (allClear && allRocks) {
      this.prepComplete = true;
      this.prepDialog.setText(
        '…That should do it.\n\nNow it won\'t spread beyond where I intend.'
      );
      this.nextMaterialsBtn.setAlpha(1);
      this.nextMaterialsBtn.setInteractive({ useHandCursor: true });
    }
  }

  /** 底部对白结束后才启用清理/搬石 */
  startPrepIntro() {
    const cx = this.sys.game.config.width / 2;
    const gh = Number(this.sys.game.config.height) || GAME_HEIGHT;
    const boxY = gh - 96;
    const lines = [
      'I have to clean it first.',
      'Even a small flame could spread if I leave it like this.',
    ];

    this.introBg = this.add
      .rectangle(cx, boxY, this.sys.game.config.width - 40, 128, 0x000000, 0.82)
      .setStrokeStyle(1, 0x5c4033, 0.85)
      .setDepth(2500);
    this.introTitle = this.add
      .text(cx, boxY - 42, 'Preparing the Fire Site', {
        fontSize: '22px',
        color: '#e8dcc8',
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introText = this.add
      .text(cx, boxY + 4, lines[0], {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: this.sys.game.config.width - 72 },
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introStep = 0;
    this.introNextBtn = this.add
      .text(cx, boxY + 52, 'Next', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2502)
      .setInteractive({ useHandCursor: true });
    this.introNextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.introNextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.introNextBtn.on('pointerdown', () => {
      this.introStep += 1;
      if (this.introStep < lines.length) {
        this.introText.setText(lines[this.introStep]);
        if (this.introStep === lines.length - 1) {
          this.introNextBtn.setText('Begin');
        }
      } else {
        if (this.introBg) this.introBg.destroy();
        if (this.introTitle) this.introTitle.destroy();
        if (this.introText) this.introText.destroy();
        if (this.introNextBtn) this.introNextBtn.destroy();
        this.introBg = null;
        this.beginPrepGameplay();
      }
    });
  }

  beginPrepGameplay() {
    this.prepGameplayActive = true;
    if (this.prepHudBar) this.prepHudBar.setAlpha(1);
    if (this.prepTitle) this.prepTitle.setAlpha(1);
    if (this.prepSiteLine) this.prepSiteLine.setAlpha(1);
    if (this.prepInstr) this.prepInstr.setAlpha(1);
    if (this.prepDialog) {
      this.prepDialog.setAlpha(1);
      this.prepDialog.setText('');
    }
    if (this.nextMaterialsBtn) this.nextMaterialsBtn.setAlpha(0.38);

    this.debrisPieces.forEach((piece) => {
      if (!piece || !piece.active || piece.getData('gone')) return;
      piece.setInteractive({ useHandCursor: true });
    });
    this.prepRocks.forEach((rock) => {
      if (!rock || !rock.active) return;
      this.input.setDraggable(rock);
    });
    this.prepInspectHits.forEach((hit) => {
      if (hit && hit.active) hit.setInteractive({ useHandCursor: true });
    });

    this.updateNextButtonState();
  }
}
// ---------- Scene 4：Collecting Materials（森林地面收集） ----------
class CollectMaterialsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CollectMaterialsScene' });
  }

  setCollectItemDepth(go) {
    if (go && typeof go.setDepth === 'function') {
      go.setDepth(go.y + COLLECT_ITEM_DEPTH_OFFSET);
    }
  }

  /** 与 FireSitePrepScene 一致的选址偏移（registry.fireSpotId） */
  getFireSiteCart() {
    const spotId = this.registry.get('fireSpotId') || 'open';
    const SITE_CART = {
      open: [0, 0],
      branches: [-0.42, -0.38],
      grass: [0.4, -0.35],
      gear: [-0.38, 0.44],
    };
    const pair = SITE_CART[spotId] || SITE_CART.open;
    return { x: pair[0], y: pair[1], spotId };
  }

  drawPreparedFireSite(fcx, fcy) {
    const fp = FireIso.cartesianToIso(this.isoC, fcx, fcy);
    this.add
      .ellipse(fp.x, fp.y, 72, 38, 0x3d3428, 1)
      .setStrokeStyle(2, 0x524438, 1)
      .setDepth(fp.y - 3);
    const ring = [
      [1.45, 0],
      [0.72, 0.95],
      [-0.72, 0.95],
      [-1.45, 0],
      [-0.72, -0.95],
      [0.72, -0.95],
    ];
    ring.forEach(([gx, gy]) => {
      const p = FireIso.cartesianToIso(this.isoC, fcx + gx * 1.75, fcy + gy * 1.75);
      this.add.circle(p.x, p.y, 8, 0x6a6e78, 1).setStrokeStyle(1, 0x4a4e58, 1).setDepth(p.y);
    });
  }

  /** 简单背包图标（不依赖外部贴图） */
  createBackpackIcon(screenX, screenY) {
    const c = this.add.container(screenX, screenY);
    const body = this.add.rectangle(0, 8, 54, 46, 0x6d4c41).setStrokeStyle(2, 0x4e342e, 1);
    const pocket = this.add.rectangle(0, 14, 30, 16, 0x5d4037, 0.75).setStrokeStyle(1, 0x3e2723, 0.9);
    const flap = this.add.rectangle(0, -12, 46, 18, 0x8d6e63).setStrokeStyle(2, 0x5d4037, 1);
    const strapL = this.add.rectangle(-22, 4, 7, 32, 0x4e342e);
    const strapR = this.add.rectangle(22, 4, 7, 32, 0x4e342e);
    c.add([strapL, strapR, body, pocket, flap]);
    c.setDepth(1200);
    c.setSize(58, 72);
    return c;
  }

  assignSlotsWithDampBias(types, slotPool, fcx, fcy) {
    const damp = [];
    const dry = [];
    slotPool.forEach((s) => {
      const lx = s.gx - fcx * 0.08;
      const ly = s.gy - fcy * 0.08;
      if (ly < -1.02 || Math.abs(lx) > 2.12) damp.push(s);
      else dry.push(s);
    });
    Phaser.Utils.Array.Shuffle(damp);
    Phaser.Utils.Array.Shuffle(dry);
    /** 每格只用一次。旧逻辑用 backup 复制全池，会与 damp/dry 重复同一坐标，多件叠在同格 → 看起来像「缺 fuel」 */
    const out = [];
    const takeWet = () => damp.pop() || dry.pop();
    const takeDry = () => dry.pop() || damp.pop();
    types.forEach((t) => {
      const slot = t === 'wet' ? takeWet() : takeDry();
      out.push(slot);
    });
    const merged = Phaser.Utils.Array.Shuffle([...damp, ...dry]);
    for (let i = 0; i < out.length; i++) {
      if (!out[i] && merged.length) out[i] = merged.pop();
    }
    return out;
  }

  /** 底部状态：仅显示收集进度（与开场对白、湿木短评分开） */
  refreshStashDialog() {
    if (!this.collectDialog || !this.collectDialog.active) return;
    this.collectDialog.setText(`Temporary stash: ${this.validCount} / 8 valid pieces.`);
  }

  /** 地面材料：tinder = 叶/树皮/苔藓；kindling = 小枝；fuel = 大木；wet = 潮湿深色 */
  addGroundItem(x, y, itemType, id, enableInput) {
    let g = null;
    if (itemType === 'tinder') {
      const variant = Phaser.Math.RND.pick(['leaf', 'bark', 'moss']);
      if (variant === 'leaf') {
        g = this.add.ellipse(x, y, 14, 9, 0xd7a86a, 1);
        g.setStrokeStyle(1, 0xa67c52, 1);
        g.rotation = Phaser.Math.FloatBetween(-0.5, 0.5);
      } else if (variant === 'bark') {
        g = this.add.rectangle(x, y, 18, 11, 0x5d4037);
        g.setStrokeStyle(1, 0x3e2723, 1);
        g.rotation = Phaser.Math.FloatBetween(-0.45, 0.45);
      } else {
        g = this.add.ellipse(x, y, 16, 11, 0x689f38, 1);
        g.setStrokeStyle(1, 0x33691e, 1);
      }
      g.setData('tinderVariant', variant);
    } else if (itemType === 'kindling') {
      g = this.add.rectangle(x, y, Phaser.Math.Between(26, 34), Phaser.Math.Between(5, 8), 0x6b4423);
      g.setStrokeStyle(1, 0x3d2815, 1);
      g.rotation = Phaser.Math.FloatBetween(-0.75, 0.75);
    } else if (itemType === 'fuel') {
      const thick = Math.random() > 0.45;
      if (thick) {
        g = this.add.rectangle(x, y, Phaser.Math.Between(40, 50), Phaser.Math.Between(14, 20), 0x4e342e);
        g.setStrokeStyle(2, 0x3e2723, 1);
      } else {
        g = this.add.rectangle(x, y, Phaser.Math.Between(36, 48), Phaser.Math.Between(5, 7), 0x5c3d2a);
        g.setStrokeStyle(2, 0x3a2618, 1);
        g.rotation = Phaser.Math.FloatBetween(-0.35, 0.35);
      }
    } else if (itemType === 'wet') {
      g = this.add.rectangle(x, y, Phaser.Math.Between(16, 22), Phaser.Math.Between(14, 20), 0x1a2f4a);
      g.setStrokeStyle(2, 0x0d1b2e, 1);
      g.setAlpha(0.92);
    }
    g.setData('itemType', itemType);
    g.setData('itemId', id);
    this.setCollectItemDepth(g);
    if (enableInput !== false) {
      g.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(g);
    }
    return g;
  }

  ensurePlayerDot() {
    if (this.playerDot && this.playerDot.active) return;
    const fc = this.fireSiteCart || this.getFireSiteCart();
    const p = FireIso.cartesianToIso(this.isoC, fc.x - 1.2, fc.y + 0.45);
    this.playerDot = this.add.circle(p.x, p.y, 14, 0xffffff).setDepth(COLLECT_PLAYER_DEPTH);
    if (this.playerDot.disableInteractive) this.playerDot.disableInteractive();
  }

  movePlayerThen(x, y, onComplete) {
    this.ensurePlayerDot();
    this.tweens.killTweensOf(this.playerDot);
    const dist = Phaser.Math.Distance.Between(this.playerDot.x, this.playerDot.y, x, y);
    if (dist < 10) {
      if (onComplete) onComplete();
      return;
    }
    const dur = Phaser.Math.Clamp(200 + dist * 0.38, 260, 880);
    this.tweens.add({
      targets: this.playerDot,
      x,
      y,
      duration: dur,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.playerDot && this.playerDot.setDepth) this.playerDot.setDepth(COLLECT_PLAYER_DEPTH);
        if (onComplete) onComplete();
      },
    });
  }

  /**
   * 生成 12 个地面类型：3 湿 + 引火物/细枝/燃料各 3。
   * 任意 8 件有效组合必能包含三类（后续仍校验至少各 1 才开放背包）。
   */
  generate12Types() {
    const types = [];
    for (let i = 0; i < 3; i++) types.push('wet');
    for (let i = 0; i < 3; i++) types.push('tinder');
    for (let i = 0; i < 3; i++) types.push('kindling');
    for (let i = 0; i < 3; i++) types.push('fuel');
    Phaser.Utils.Array.Shuffle(types);
    return types;
  }

  inventoryHasAllThreeTypes() {
    const c = { tinder: 0, kindling: 0, fuel: 0 };
    this.validInventory.forEach((e) => {
      if (c[e.type] !== undefined) c[e.type] += 1;
    });
    return c.tinder >= 1 && c.kindling >= 1 && c.fuel >= 1;
  }

  countRemainingNonWetOnGround() {
    let n = 0;
    this.groundItems.forEach((g) => {
      if (g && g.active && !g.getData('taken') && g.getData('itemType') !== 'wet') n += 1;
    });
    return n;
  }

  tryCollectItem(item) {
    if (!item.active || item.getData('taken')) return;
    const t = item.getData('itemType');
    const idx = item.getData('itemId');
    if (t !== 'wet' && this.validCount >= 8 && this.inventoryHasAllThreeTypes()) return;

    item.setData('taken', true);
    item.disableInteractive();
    this.input.setDraggable(item, false);

    if (t === 'wet') {
      if (this.wetDialogTimer) {
        this.wetDialogTimer.remove(false);
        this.wetDialogTimer = null;
      }
      this.collectDialog.setText('…Too damp.\n\nThis will smoke more than it burns.');
      this.wetDialogTimer = this.time.delayedCall(2600, () => {
        this.refreshStashDialog();
        this.wetDialogTimer = null;
      });
      this.tweens.add({
        targets: item,
        alpha: 0,
        scaleX: 0.7,
        scaleY: 0.7,
        duration: 200,
        onComplete: () => {
          if (item && item.scene) item.destroy();
          this.maybeRestartCollectIfStuck();
        },
      });
      return;
    }

    const feedback =
      t === 'tinder'
        ? 'Light, dry… this should catch quickly.'
        : t === 'kindling'
          ? 'These will help the flame grow.'
          : "Too big to start with… but I'll need them later.";

    this.validInventory.push({ type: t, id: `v-${this.validCount}-${idx}` });
    this.validCount += 1;
    this.collectDialog.setText(`${feedback}\n\nTemporary stash: ${this.validCount} / 8 valid pieces.`);

    this.tweens.add({
      targets: item,
      alpha: 0,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: 180,
      onComplete: () => {
        if (item && item.scene) item.destroy();
      },
    });

    if (this.validCount >= 8 && this.inventoryHasAllThreeTypes()) {
      this.freezeRemainingGroundItems();
      this.unlockBackpackSort();
    } else if (this.validCount >= 8 && !this.inventoryHasAllThreeTypes()) {
      this.collectDialog.setText(
        `${feedback}\n\nI need tinder, kindling, and fuel — not only one kind. (${this.validCount} pieces — keep collecting.)`
      );
    }
    this.maybeRestartCollectIfStuck();
  }

  /**
   * 地面已无非湿木仍无法达成「8 件且三类齐全」→ 本关重来（避免软锁）。
   */
  maybeRestartCollectIfStuck() {
    if (this.sortUnlocked) return;
    if (this.countRemainingNonWetOnGround() > 0) return;
    const ok = this.validCount >= 8 && this.inventoryHasAllThreeTypes();
    if (ok) return;
    this.collectDialog.setText(
      '…Not enough of each size left on the ground. I\'ll search again from the start.'
    );
    this.time.delayedCall(2000, () => {
      this.registry.remove('fireSortComplete');
      this.scene.restart();
    });
  }

  unlockBackpackSort() {
    if (this.sortUnlocked) return;
    this.sortUnlocked = true;
    this.collectDialog.setText(
      `Temporary stash: ${this.validCount} / 8 valid pieces.\n\nYou have enough — open your backpack to sort.`
    );

    const hw = 40;
    const hh = 48;
    this.backpackIcon.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hw, -hh, hw * 2, hh * 2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.backpackIcon.on('pointerdown', () => {
      this.backpackIcon.disableInteractive().setAlpha(0.75);
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.pause(SCENE_KEYS.COLLECT);
        this.scene.launch(SCENE_KEYS.SORTING, { items: this.validInventory.slice() });
      });
    });

    this.tweens.add({
      targets: this.backpackIcon,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 420,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.inOut',
    });
  }

  /** 开场对白（底部对话框，与 FirebuildingNpc 一致），结束后才进入拾取 */
  startCollectIntro() {
    const cx = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT - 96;
    const lines = [
      'A fire won\'t build itself… I have to gather fuel before the sun fully goes down.',
      'I need dry tinder, kindling, and fuel — eight good pieces in all.',
    ];

    this.introBg = this.add
      .rectangle(cx, boxY, GAME_WIDTH - 40, 138, 0x000000, 0.82)
      .setStrokeStyle(1, 0x5c4033, 0.85)
      .setDepth(2500);
    this.introTitle = this.add
      .text(cx, boxY - 46, 'Collecting Materials', {
        fontSize: '22px',
        color: '#e8dcc8',
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introText = this.add
      .text(cx, boxY + 6, lines[0], {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: GAME_WIDTH - 72 },
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introStep = 0;
    this.introNextBtn = this.add
      .text(cx, boxY + 58, 'Next', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2502)
      .setInteractive({ useHandCursor: true });
    this.introNextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.introNextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.introNextBtn.on('pointerdown', () => {
      this.introStep += 1;
      if (this.introStep < lines.length) {
        this.introText.setText(lines[this.introStep]);
        if (this.introStep === lines.length - 1) {
          this.introNextBtn.setText('Begin');
        }
      } else {
        if (this.introBg) this.introBg.destroy();
        if (this.introTitle) this.introTitle.destroy();
        if (this.introText) this.introText.destroy();
        if (this.introNextBtn) this.introNextBtn.destroy();
        this.introBg = null;
        this.beginCollectGameplay();
      }
    });
  }

  beginCollectGameplay() {
    this.collectGameplayActive = true;
    if (this.hudTopBar) this.hudTopBar.setAlpha(1);
    if (this.collectTitle) this.collectTitle.setAlpha(1);
    if (this.collectInstr) this.collectInstr.setAlpha(1);
    if (this.collectDialog) this.collectDialog.setAlpha(1);
    if (this.backpackIcon) this.backpackIcon.setAlpha(1);
    this.refreshStashDialog();
    this.groundItems.forEach((g) => {
      if (!g || !g.active || g.getData('taken')) return;
      g.setAlpha(1);
      g.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(g);
    });
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.input.off('drag');
    this.input.off('dragend');

    this.wetDialogTimer = null;
    this.sortUnlocked = false;
    this.collectGameplayActive = false;
    this.fireSiteCart = this.getFireSiteCart();
    const fcx = this.fireSiteCart.x;
    const fcy = this.fireSiteCart.y;

    this.isoC = FireIso.createConfig(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1e14, 1).setDepth(-250);
    FireIso.drawGround(this, this.isoC);
    this.drawPreparedFireSite(fcx, fcy);

    // Thin top strip — title + instruction only (no narrative); keep alpha low so the grid stays visible.
    const hudH = 96;
    this.hudTopBar = this.add
      .rectangle(GAME_WIDTH / 2, hudH / 2, GAME_WIDTH, hudH, 0x121610, 0.42)
      .setDepth(998)
      .setStrokeStyle(0)
      .setAlpha(0);

    this.collectTitle = this.add
      .text(GAME_WIDTH / 2, 18, 'Collecting Materials', {
        fontSize: '18px',
        color: '#e8f0e0',
      })
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);
    this.collectInstr = this.add
      .text(
        GAME_WIDTH / 2,
        44,
        'Walk: tap an item. Or drag it to the backpack. Need 8 valid pieces (tinder · kindling · fuel).',
        {
          fontSize: '12px',
          color: '#c5d4ba',
          align: 'center',
          lineSpacing: 4,
          wordWrap: { width: GAME_WIDTH - 40 },
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);

    this.collectDialog = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 58, 'Temporary stash: 0 / 8 valid pieces.', {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: GAME_WIDTH - 44 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setAlpha(0);

    const bx = GAME_WIDTH - 88;
    const by = GAME_HEIGHT - 102;
    this.backpackIcon = this.createBackpackIcon(bx, by);
    this.backpackIcon.setAlpha(0);
    this.backpackDropRect = new Phaser.Geom.Rectangle(bx - 52, by - 52, 104, 108);

    this.validInventory = [];
    this.validCount = 0;
    this.groundItems = [];
    const types = this.generate12Types();

    const slotPool = [];
    const STEP = 0.58;
    const pushSlots = (useScreenFloor) => {
      slotPool.length = 0;
      for (let gx = -3.35; gx <= 3.35; gx += STEP) {
        for (let gy = -1.55; gy <= 3.35; gy += STEP) {
          if (Math.hypot(gx - fcx, gy - fcy) < 1.32) continue;
          const pos = FireIso.cartesianToIso(this.isoC, gx, gy);
          if (useScreenFloor && pos.y < COLLECT_TOP_SCREEN_MIN_Y) continue;
          slotPool.push({
            gx: gx + Phaser.Math.FloatBetween(-0.08, 0.08),
            gy: gy + Phaser.Math.FloatBetween(-0.08, 0.08),
          });
        }
      }
    };
    pushSlots(true);
    if (slotPool.length < 16) pushSlots(false);
    Phaser.Utils.Array.Shuffle(slotPool);
    const positions = this.assignSlotsWithDampBias(types, slotPool, fcx, fcy);

    types.forEach((t, idx) => {
      const grid = positions[idx];
      const pos = FireIso.cartesianToIso(this.isoC, grid.gx, grid.gy);
      const item = this.addGroundItem(pos.x, pos.y, t, idx, false);
      item.setData('homeX', pos.x);
      item.setData('homeY', pos.y);
      item.setAlpha(0);
      this.groundItems.push(item);

      item.on('dragstart', (pointer) => {
        if (!this.collectGameplayActive) return;
        if (!item.active || item.getData('taken')) return;
        item.setData('ptrDownX', pointer.x);
        item.setData('ptrDownY', pointer.y);
        item.setDepth(COLLECT_DRAG_DEPTH);
      });

      item.on('dragend', (pointer) => {
        if (!this.collectGameplayActive) return;
        if (!item.active || item.getData('taken')) return;
        const hx = item.getData('homeX');
        const hy = item.getData('homeY');
        const moved = Phaser.Math.Distance.Between(
          item.getData('ptrDownX'),
          item.getData('ptrDownY'),
          pointer.x,
          pointer.y
        );
        if (moved < 18) {
          item.x = hx;
          item.y = hy;
          this.setCollectItemDepth(item);
          this.movePlayerThen(hx, hy, () => this.tryCollectItem(item));
          return;
        }
        if (Phaser.Geom.Rectangle.Contains(this.backpackDropRect, pointer.x, pointer.y)) {
          this.tryCollectItem(item);
          return;
        }
        this.tweens.add({
          targets: item,
          x: hx,
          y: hy,
          duration: 200,
          ease: 'Cubic.easeOut',
          onComplete: () => this.setCollectItemDepth(item),
        });
      });
    });

    this.openPackBtn = this.backpackIcon;
    this.startCollectIntro();
  }

  /** 收满 8 件有效物后，禁止继续点击地面剩余物件 */
  freezeRemainingGroundItems() {
    this.groundItems.forEach((g) => {
      if (g && g.active && !g.getData('taken')) {
        g.disableInteractive();
        this.input.setDraggable(g, false);
        g.setAlpha(0.45);
      }
    });
  }
}
// ---------- Scene 4-1：Sorting Materials（背包分类 UI） ----------
class SortingMaterialsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SortingMaterialsScene' });
  }

  init(data) {
    this.payloadItems = (data && data.items) || [];
  }

  startSortIntro() {
    const cx = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT - 96;
    const lines = [
      '…If I don\'t organize this now…',
      '…I\'ll make mistakes when it matters.',
    ];

    this.introBg = this.add
      .rectangle(cx, boxY, GAME_WIDTH - 40, 128, 0x000000, 0.82)
      .setStrokeStyle(1, 0x5c4033, 0.85)
      .setDepth(2500);
    this.introTitle = this.add
      .text(cx, boxY - 42, 'Organize the Backpack', {
        fontSize: '22px',
        color: '#e8dcc8',
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introText = this.add
      .text(cx, boxY + 4, lines[0], {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: GAME_WIDTH - 72 },
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introStep = 0;
    this.introNextBtn = this.add
      .text(cx, boxY + 52, 'Next', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2502)
      .setInteractive({ useHandCursor: true });
    this.introNextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.introNextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.introNextBtn.on('pointerdown', () => {
      this.introStep += 1;
      if (this.introStep < lines.length) {
        this.introText.setText(lines[this.introStep]);
        if (this.introStep === lines.length - 1) {
          this.introNextBtn.setText('Begin');
        }
      } else {
        if (this.introBg) this.introBg.destroy();
        if (this.introTitle) this.introTitle.destroy();
        if (this.introText) this.introText.destroy();
        if (this.introNextBtn) this.introNextBtn.destroy();
        this.introBg = null;
        this.beginSortGameplay();
      }
    });
  }

  beginSortGameplay() {
    this.sortGameplayActive = true;
    this.draggables.forEach((sh) => {
      if (!sh || !sh.active) return;
      sh.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(sh);
    });
    if (this.closeBtn) this.closeBtn.setInteractive({ useHandCursor: true });
    if (this.hintText) this.hintText.setAlpha(1);
  }

  /** 与收集关一致的可辨类别；湿材单独反馈 */
  createItemShape(x, y, itemType, id) {
    let g = null;
    if (itemType === 'tinder') {
      const variant = Phaser.Math.RND.pick(['leaf', 'bark', 'moss']);
      if (variant === 'leaf') {
        g = this.add.ellipse(x, y, 14, 9, 0xd7a574, 1);
        g.setStrokeStyle(1, 0xa67c52, 1);
      } else if (variant === 'bark') {
        g = this.add.rectangle(x, y, 18, 11, 0x5d4037);
        g.setStrokeStyle(1, 0x3e2723, 1);
      } else {
        g = this.add.ellipse(x, y, 16, 11, 0x689f38, 1);
        g.setStrokeStyle(1, 0x33691e, 1);
      }
    } else if (itemType === 'kindling') {
      g = this.add.rectangle(x, y, Phaser.Math.Between(26, 32), 7, 0x6b4423);
      g.setStrokeStyle(1, 0x3d2815, 1);
    } else if (itemType === 'fuel') {
      g = this.add.rectangle(x, y, Phaser.Math.Between(40, 48), Phaser.Math.Between(14, 18), 0x4e342e);
      g.setStrokeStyle(2, 0x3e2723, 1);
    } else if (itemType === 'wet') {
      g = this.add.rectangle(x, y, 18, 20, 0x1a2f4a);
      g.setStrokeStyle(2, 0x0d1b2e, 1);
      g.setAlpha(0.92);
    } else {
      g = this.add.rectangle(x, y, 20, 14, 0x888888);
      g.setStrokeStyle(1, 0x555555, 1);
    }
    g.setData('itemType', itemType);
    g.setData('itemId', id);
    g.setDepth(30);
    g.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(g);
    return g;
  }

  drawOpenBackpackFrame(cx, cy) {
    const g = this.add.graphics().setDepth(19);
    const w = 740;
    const h = 520;
    const x0 = cx - w / 2;
    const y0 = cy - h / 2;
    g.fillStyle(0x3e2723, 0.95);
    g.fillRect(x0 - 8, y0 - 28, w + 16, h + 36);
    g.fillStyle(0x5d4037, 0.88);
    g.fillRect(x0, y0 - 18, w, 22);
    g.lineStyle(3, 0x4e342e, 1);
    g.strokeRect(x0 - 8, y0 - 28, w + 16, h + 36);
    g.lineStyle(2, 0x6d4c41, 0.9);
    g.fillStyle(0x4e342e, 0.92);
    g.beginPath();
    g.moveTo(x0 + w * 0.2, y0 - 20);
    g.lineTo(x0 + w * 0.5, y0 - 36);
    g.lineTo(x0 + w * 0.8, y0 - 20);
    g.closePath();
    g.fillPath();
    g.fillStyle(0x3a3028, 0.75);
    g.fillRect(x0 + 12, y0 + 8, w - 24, h - 20);
  }

  create() {
    this.input.off('drag');
    this.input.off('dragend');
    this.sortGameplayActive = false;

    this.wetFeedbackTimer = null;
    this.hintRestoreTimer = null;
    this.cameras.main.fadeIn(350, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0c, 0.62);
    dim.setDepth(18);
    dim.setAlpha(0);
    this.tweens.add({
      targets: dim,
      alpha: 1,
      duration: 320,
      ease: 'Sine.easeOut',
    });

    this.drawOpenBackpackFrame(cx, cy);

    const panel = this.add.rectangle(cx, cy, 720, 500, 0x2a2218, 0.94);
    panel.setStrokeStyle(3, 0x5c4a3a, 0.9);
    panel.setDepth(20);

    this.sortDialog = this.add
      .text(cx, GAME_HEIGHT - 168, '', {
        fontSize: '17px',
        color: '#f0e8d8',
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: GAME_WIDTH - 120 },
      })
      .setOrigin(0.5)
      .setDepth(25)
      .setAlpha(0);

    this.defaultSortHint = [
      'How to tell: Tinder — smallest, easiest to ignite. Kindling — medium, supports growth. Fuel — largest, sustains the fire.',
      'Drag each piece into the matching pocket.',
    ].join('\n');

    this.hintText = this.add
      .text(cx, GAME_HEIGHT - 56, this.defaultSortHint, {
        fontSize: '13px',
        color: '#c8c0b0',
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: GAME_WIDTH - 48 },
      })
      .setOrigin(0.5)
      .setDepth(25)
      .setAlpha(0);

    this.zoneLayout = {
      tinder: {
        title: 'Tinder',
        blurb: 'Smallest · easiest to ignite',
        x: 520,
        y: 175,
        w: 200,
        h: 120,
        color: 0x3a3530,
      },
      kindling: {
        title: 'Kindling',
        blurb: 'Medium · supports growth',
        x: 520,
        y: 305,
        w: 200,
        h: 120,
        color: 0x3a3530,
      },
      fuel: {
        title: 'Fuel',
        blurb: 'Largest · sustains fire',
        x: 520,
        y: 435,
        w: 200,
        h: 120,
        color: 0x3a3530,
      },
    };

    this.dropRects = {};
    Object.keys(this.zoneLayout).forEach((key) => {
      const z = this.zoneLayout[key];
      const r = this.add.rectangle(z.x, z.y, z.w, z.h, z.color, 0.55);
      r.setStrokeStyle(2, 0x8a7a60, 0.85);
      r.setDepth(22);
      r.setData('zoneType', key);
      this.dropRects[key] = new Phaser.Geom.Rectangle(z.x - z.w / 2, z.y - z.h / 2, z.w, z.h);
      this.add
        .text(z.x, z.y - 52, z.title, {
          fontSize: '14px',
          color: '#f5ead8',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0)
        .setDepth(24);
      this.add
        .text(z.x, z.y - 34, z.blurb, {
          fontSize: '11px',
          color: '#a89880',
          align: 'center',
          wordWrap: { width: z.w - 8 },
        })
        .setOrigin(0.5, 0)
        .setDepth(24);
    });

    const pileCx = 198;
    const pileCy = 310;
    this.draggables = [];
    this.remaining = this.payloadItems.length;
    this.sortedCount = 0;

    const order = Phaser.Utils.Array.Shuffle(this.payloadItems.map((_, i) => i));
    order.forEach((itemIndex, stackI) => {
      const entry = this.payloadItems[itemIndex];
      const ox = Phaser.Math.FloatBetween(-62, 62);
      const oy = Phaser.Math.FloatBetween(-48, 48);
      const px = pileCx + ox;
      const py = pileCy + oy;
      const sh = this.createItemShape(px, py, entry.type, entry.id);
      sh.setRotation(Phaser.Math.FloatBetween(-0.4, 0.4));
      sh.setData('homeX', px);
      sh.setData('homeY', py);
      const d = 31 + stackI * 0.5;
      sh.setData('pileDepth', d);
      sh.setDepth(d);
      sh.on('dragstart', () => {
        if (!this.sortGameplayActive) return;
        if (sh.getData('locked')) return;
        sh.setDepth(120);
      });
      this.draggables.push(sh);
    });

    this.draggables.forEach((sh) => {
      this.input.setDraggable(sh, false);
      if (sh.disableInteractive) sh.disableInteractive();
    });

    // 关闭按钮：平滑收起背包层
    this.closeBtn = this.add
      .text(GAME_WIDTH - 48, 42, 'X', {
        fontSize: '22px',
        color: '#e0d8c8',
        backgroundColor: '#4a3a2a',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setInteractive({ useHandCursor: true });
    this.closeBtn.disableInteractive();

    this.closeBtn.on('pointerdown', () => {
      if (!this.sortGameplayActive) return;
      this.closeBackpackSmooth();
    });

    // ========== 【拖拽逻辑】背包内：拖动时跟随指针 ==========
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (!this.sortGameplayActive) return;
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('locked')) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.restoreSortHintDelayed = (delay) => {
      if (this.hintRestoreTimer) this.hintRestoreTimer.remove(false);
      this.hintRestoreTimer = this.time.delayedCall(delay, () => {
        if (!this.hintText || !this.defaultSortHint) {
          this.hintRestoreTimer = null;
          return;
        }
        if (this.sortedCount > 0 && this.sortedCount < this.remaining) {
          this.hintText.setText(
            `Progress: ${this.sortedCount} / ${this.remaining}\n${this.defaultSortHint}`
          );
        } else {
          this.hintText.setText(this.defaultSortHint);
        }
        this.hintRestoreTimer = null;
      });
    };

    // ========== 【拖拽逻辑】背包内：放置检测 / 弹回 ==========
    this.input.on('dragend', (pointer, gameObject) => {
      if (!this.sortGameplayActive) return;
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('locked')) return;

      const t = gameObject.getData('itemType');
      const hx = gameObject.getData('homeX');
      const hy = gameObject.getData('homeY');

      if (t === 'wet') {
        if (this.wetFeedbackTimer) {
          this.wetFeedbackTimer.remove(false);
          this.wetFeedbackTimer = null;
        }
        this.hintText.setText('…Too damp.');
        this.wetFeedbackTimer = this.time.delayedCall(720, () => {
          this.hintText.setText('This will smoke more than it burns.');
          this.wetFeedbackTimer = null;
          this.restoreSortHintDelayed(3600);
        });
        this.tweens.add({
          targets: gameObject,
          x: hx,
          y: hy,
          duration: 220,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (!gameObject.getData('locked') && gameObject.getData('pileDepth') != null) {
              gameObject.setDepth(gameObject.getData('pileDepth'));
            }
          },
        });
        return;
      }

      const rank = { tinder: 0, kindling: 1, fuel: 2 };
      let placed = false;

      Object.keys(this.dropRects).forEach((key) => {
        if (placed) return;
        const rect = this.dropRects[key];
        if (rect.contains(gameObject.x, gameObject.y)) {
          placed = true;
          if (key === t) {
            gameObject.setData('locked', true);
            this.input.setDraggable(gameObject, false);
            const zx = this.zoneLayout[key].x;
            const zy = this.zoneLayout[key].y;
            this.tweens.add({
              targets: gameObject,
              x: zx,
              y: zy,
              duration: 180,
              ease: 'Quad.easeOut',
            });
            this.sortedCount += 1;
            this.hintText.setText(
              `Progress: ${this.sortedCount} / ${this.remaining}\n${this.defaultSortHint}`
            );
            if (this.sortedCount >= this.remaining) {
              this.showConstructButton();
            }
          } else {
            const tr = rank[t];
            const kr = rank[key];
            const msg =
              tr > kr
                ? 'This is too big for this category.'
                : 'This is too small for this category.';
            this.hintText.setText(msg);
            this.restoreSortHintDelayed(2800);
            this.tweens.add({
              targets: gameObject,
              x: hx,
              y: hy,
              duration: 220,
              ease: 'Cubic.easeOut',
              onComplete: () => {
                if (!gameObject.getData('locked') && gameObject.getData('pileDepth') != null) {
                  gameObject.setDepth(gameObject.getData('pileDepth'));
                }
              },
            });
          }
        }
      });

      if (!placed) {
        this.tweens.add({
          targets: gameObject,
          x: hx,
          y: hy,
          duration: 200,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (!gameObject.getData('locked') && gameObject.getData('pileDepth') != null) {
              gameObject.setDepth(gameObject.getData('pileDepth'));
            }
          },
        });
      }
    });

    this.constructBtn = null;

    this.startSortIntro();
  }

  showConstructButton() {
    if (this.constructBtn) return;
    this.sortDialog.setText('All sorted. Ready to build.');
    this.sortDialog.setAlpha(1);
    this.hintText.setText('Nice — each size has its place.');
    this.hintText.setY(GAME_HEIGHT - 132);
    this.constructBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 74, 'Next: Construct the Fire', {
        fontSize: '18px',
        color: '#fff8e7',
        backgroundColor: '#6b4a2a',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setInteractive({ useHandCursor: true });

    this.constructBtn.on('pointerdown', () => {
      this.registry.set('fireSortComplete', true);
      this.scene.stop(SCENE_KEYS.COLLECT);
      this.scene.stop(SCENE_KEYS.SORTING);
      this.scene.start(SCENE_KEYS.CONSTRUCT);
    });
  }

  /** 平滑关闭背包：淡出遮罩后停止本场景并恢复收集场景 */
  closeBackpackSmooth() {
    this.cameras.main.fadeOut(280, 0, 0, 0);
    this.time.delayedCall(280, () => {
      this.scene.stop(SCENE_KEYS.SORTING);
      this.scene.resume(SCENE_KEYS.COLLECT);
      const c = this.scene.get(SCENE_KEYS.COLLECT);
      if (c && c.cameras) c.cameras.main.fadeIn(320, 0, 0, 0);
    });
  }
}
// ---------- Scene 5：Constructing the Fire（火圈上按顺序搭 Tinder → Kindling → Fuel） ----------
class ConstructFireScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ConstructFireScene' });
  }

  getFireSiteCart() {
    const spotId = this.registry.get('fireSpotId') || 'open';
    const SITE_CART = {
      open: [0, 0],
      branches: [-0.42, -0.38],
      grass: [0.4, -0.35],
      gear: [-0.38, 0.44],
    };
    const p = SITE_CART[spotId] || SITE_CART.open;
    return { x: p[0], y: p[1] };
  }

  /** 叶/树皮/苔藓 + 标签 */
  createTinderPileContainer(x, y, depthY) {
    const c = this.add.container(x, y);
    for (let i = 0; i < 5; i++) {
      const ox = Phaser.Math.FloatBetween(-14, 14);
      const oy = Phaser.Math.FloatBetween(-10, 10);
      const leaf = this.add.ellipse(ox, oy, 10, 7, 0xd4a574, 1).setStrokeStyle(1, 0xa67c52, 1);
      leaf.setRotation(Phaser.Math.FloatBetween(-0.4, 0.4));
      c.add(leaf);
    }
    const bark = this.add.rectangle(-6, 4, 16, 9, 0x5d4037).setStrokeStyle(1, 0x3e2723, 1);
    bark.setRotation(0.2);
    c.add(bark);
    const moss = this.add.ellipse(8, -2, 12, 9, 0x558b2f, 1).setStrokeStyle(1, 0x33691e, 1);
    c.add(moss);
    c.setDepth(depthY);
    c.setSize(44, 36);
    return c;
  }

  createKindlingPileContainer(x, y, depthY) {
    const c = this.add.container(x, y);
    for (let i = 0; i < 4; i++) {
      const stick = this.add.rectangle(
        Phaser.Math.FloatBetween(-18, 18),
        Phaser.Math.FloatBetween(-8, 8),
        Phaser.Math.Between(28, 36),
        6,
        0x6b4423
      );
      stick.setStrokeStyle(1, 0x3d2815, 1);
      stick.setRotation(Phaser.Math.FloatBetween(-0.7, 0.7));
      c.add(stick);
    }
    c.setDepth(depthY);
    c.setSize(52, 28);
    return c;
  }

  createFuelPileContainer(x, y, depthY) {
    const c = this.add.container(x, y);
    const logs = [
      { ox: -12, oy: 6, w: 38, h: 12 },
      { ox: 10, oy: 2, w: 42, h: 13 },
      { ox: 0, oy: -8, w: 36, h: 14 },
    ];
    logs.forEach((L) => {
      const r = this.add.rectangle(L.ox, L.oy, L.w, L.h, 0x4e342e).setStrokeStyle(2, 0x3e2723, 1);
      c.add(r);
    });
    c.setDepth(depthY);
    c.setSize(58, 36);
    return c;
  }

  clearPileSelection() {
    if (this.selectedPile && this.selectedPile.active) {
      const base = this.selectedPile.getData('baseStroke');
      if (base) {
        this.selectedPile.setStrokeStyle(base.width, base.color, base.alpha);
      }
    }
    this.selectedPile = null;
  }

  selectPile(hitRect) {
    this.clearPileSelection();
    this.selectedPile = hitRect;
    hitRect.setStrokeStyle(3, 0xffe8a8, 1);
  }

  bouncePileHome(gameObject) {
    this.tweens.add({
      targets: gameObject,
      x: gameObject.getData('homeX'),
      y: gameObject.getData('homeY'),
      duration: 240,
      ease: 'Cubic.easeOut',
    });
  }

  tryCommitPlacement(pile, fromDrag) {
    if (!this.constructGameplayActive) return;
    if (!pile || !pile.active || pile.getData('spent')) return;
    const matType = pile.getData('matType');
    const order = ['tinder', 'kindling', 'fuel'];
    const expected = order[this.constructionStep];

    if (matType !== expected) {
      if (fromDrag) {
        this.bouncePileHome(pile);
        const px = pile.getData('dragProxy');
        if (px) this.bouncePileHome(px);
      } else {
        this.tweens.add({
          targets: pile,
          x: pile.x + 8,
          duration: 60,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.inOut',
        });
      }
      this.buildDialog.setText(
        'I need a base of smaller materials first. Build from small to large: tinder, then kindling, then fuel.'
      );
      return;
    }

    const cx = this.fireCx;
    const cy = this.fireCy;
    const proxy = pile.getData('dragProxy');

    pile.setData('spent', true);
    this.input.setDraggable(pile, false);
    this.clearPileSelection();

    const moveTargets = [pile];
    if (proxy) moveTargets.push(proxy);
    this.tweens.add({
      targets: moveTargets,
      x: this.fireCenter.x,
      y: this.fireCenter.y - 8,
      alpha: 0.35,
      scaleX: 0.65,
      scaleY: 0.65,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => {
        const hx = pile.getData('homeX');
        const hy = pile.getData('homeY');
        pile.setPosition(hx, hy);
        pile.setAlpha(0);
        if (proxy) {
          proxy.setPosition(hx, hy);
          proxy.setScale(1);
          proxy.setAlpha(0);
        }
      },
    });

    if (this.constructionStep === 0) {
      this.addTinderLayer(cx, cy);
      this.addTinderSoftHighlight(cx, cy);
    } else if (this.constructionStep === 1) {
      this.addKindlingLayer(cx, cy);
    } else if (this.constructionStep === 2) {
      this.addFuelLayer(cx, cy);
    }

    this.constructionStep += 1;

    if (this.constructionStep === 1) {
      this.buildDialog.setText('Tinder down. Add kindling across it.');
    } else if (this.constructionStep === 2) {
      this.buildDialog.setText('Kindling set. Crown it with fuel wood.');
    } else if (this.constructionStep >= 3) {
      this.onConstructionComplete();
    }
  }

  startConstructIntro() {
    const cx = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT - 96;
    const lines = [
      '…All the materials are ready.',
      '…If I pile them randomly, it might not catch.',
      '…I need to structure this right, from small to large, so the fire grows steadily.',
    ];

    this.introBg = this.add
      .rectangle(cx, boxY, GAME_WIDTH - 40, 128, 0x000000, 0.82)
      .setStrokeStyle(1, 0x5c4033, 0.85)
      .setDepth(2500);
    this.introTitle = this.add
      .text(cx, boxY - 42, 'Constructing the Fire', {
        fontSize: '22px',
        color: '#e8dcc8',
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introText = this.add
      .text(cx, boxY + 4, lines[0], {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: GAME_WIDTH - 72 },
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introStep = 0;
    this.introNextBtn = this.add
      .text(cx, boxY + 52, 'Next', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2502)
      .setInteractive({ useHandCursor: true });
    this.introNextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.introNextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.introNextBtn.on('pointerdown', () => {
      this.introStep += 1;
      if (this.introStep < lines.length) {
        this.introText.setText(lines[this.introStep]);
        if (this.introStep === lines.length - 1) {
          this.introNextBtn.setText('Begin');
        }
      } else {
        if (this.introBg) this.introBg.destroy();
        if (this.introTitle) this.introTitle.destroy();
        if (this.introText) this.introText.destroy();
        if (this.introNextBtn) this.introNextBtn.destroy();
        this.introBg = null;
        this.beginConstructGameplay();
      }
    });
  }

  beginConstructGameplay() {
    this.constructGameplayActive = true;
    if (this.constructHudBar) this.constructHudBar.setAlpha(1);
    if (this.constructTitle) this.constructTitle.setAlpha(1);
    if (this.constructKnowledge) this.constructKnowledge.setAlpha(1);
    if (this.constructInstr) this.constructInstr.setAlpha(1);
    if (this.buildDialog) {
      this.buildDialog.setAlpha(1);
      this.buildDialog.setText('');
    }
    if (this.skipBtn) {
      this.skipBtn.setAlpha(1);
      this.skipBtn.setInteractive({ useHandCursor: true });
    }
    this.materialPiles.forEach((rect) => {
      if (!rect || !rect.active) return;
      rect.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(rect);
    });
    if (this.firePitHit && this.firePitHit.setInteractive) {
      this.firePitHit.setInteractive({ useHandCursor: true });
    }
  }

  create() {
    this.input.off('drag');
    this.input.off('dragend');
    this.constructGameplayActive = false;

    if (!this.registry.get('fireSortComplete')) {
      this.scene.start(SCENE_KEYS.COLLECT);
      return;
    }
    this.registry.remove('fireSortComplete');

    this.registry.remove('fireBuiltProperly');

    this.cameras.main.fadeIn(450, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#1a1610');

    this.isoC = FireIso.createConfig(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1610, 1).setDepth(-250);
    FireIso.drawGround(this, this.isoC);

    const fc = this.getFireSiteCart();
    const fcx = fc.x;
    const fcy = fc.y;

    const fireCenterIso = FireIso.cartesianToIso(this.isoC, fcx, fcy);
    const cx = fireCenterIso.x;
    const cy = fireCenterIso.y;
    this.fireCx = cx;
    this.fireCy = cy;
    const CENTER_SNAP_R = 78;

    this.add
      .ellipse(cx, cy, 150, 76, 0x3a3228, 1)
      .setStrokeStyle(2, 0x5c4a3a, 0.55)
      .setDepth(cy - 4);

    const slotRing = [
      [1.35, 0],
      [0.68, 0.92],
      [-0.68, 0.92],
      [-1.35, 0],
      [-0.68, -0.92],
      [0.68, -0.92],
    ];
    slotRing.forEach(([gx, gy]) => {
      const sp = FireIso.cartesianToIso(this.isoC, fcx + gx * 1.2, fcy + gy * 1.2);
      const rock = this.add.circle(sp.x, sp.y, 18, 0x6a6e78, 1);
      rock.setDepth(sp.y);
      rock.setStrokeStyle(2, 0x4a4e58, 1);
    });

    this.fireCenter = { x: cx, y: cy };
    this.selectedPile = null;

    const constructHudH = 100;
    this.constructHudBar = this.add
      .rectangle(GAME_WIDTH / 2, constructHudH / 2, GAME_WIDTH, constructHudH, 0x121610, 0.42)
      .setDepth(998)
      .setStrokeStyle(0)
      .setAlpha(0);
    this.constructTitle = this.add
      .text(GAME_WIDTH / 2, 12, 'Constructing the Fire', {
        fontSize: '18px',
        color: '#e8f0e0',
      })
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);
    this.constructKnowledge = this.add
      .text(
        GAME_WIDTH / 2,
        34,
        'Tinder catches the spark; kindling bridges; fuel sustains heat. Stack small → large so air can feed the flame.',
        {
          fontSize: '11px',
          color: '#b0a898',
          align: 'center',
          lineSpacing: 3,
          wordWrap: { width: GAME_WIDTH - 36 },
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);
    this.constructInstr = this.add
      .text(
        GAME_WIDTH / 2,
        76,
        'Drag a pile onto the pit, or tap a pile to select it, then tap the stone ring.',
        {
          fontSize: '12px',
          color: '#c5d4ba',
          align: 'center',
          lineSpacing: 3,
          wordWrap: { width: GAME_WIDTH - 36 },
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);

    this.buildDialog = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 132, '', {
        fontSize: '14px',
        color: '#f0e6d8',
        align: 'center',
        lineSpacing: 7,
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setAlpha(0);

    this.constructionStep = 0;

    // Must sit above the pit floor ellipse (depth ~ cy − 4) or layers stay invisible under it.
    this.layerRoot = this.add.container(0, 0);
    this.layerRoot.setDepth(cy + 12);

    const pileGy = fcy + 3.05;
    const piles = [
      {
        type: 'tinder',
        gx: fcx - 2.55,
        label: 'Tinder — leaves, bark, moss',
        factory: 'tinder',
        hit: [60, 52],
      },
      { type: 'kindling', gx: fcx + 0, label: 'Kindling — small sticks', factory: 'kindling', hit: [68, 44] },
      { type: 'fuel', gx: fcx + 2.55, label: 'Fuel — logs', factory: 'fuel', hit: [74, 52] },
    ];

    this.materialPiles = [];
    piles.forEach((p) => {
      const pos = FireIso.cartesianToIso(this.isoC, p.gx, pileGy);
      let vis = null;
      if (p.factory === 'tinder') vis = this.createTinderPileContainer(pos.x, pos.y, pos.y);
      else if (p.factory === 'kindling') vis = this.createKindlingPileContainer(pos.x, pos.y, pos.y);
      else vis = this.createFuelPileContainer(pos.x, pos.y, pos.y);

      const bw = p.hit[0];
      const bh = p.hit[1];
      const pileDepth = Math.max(pos.y, cy) + 42;
      const rect = this.add.rectangle(pos.x, pos.y, bw, bh, 0x2a2218, 0);
      rect.setStrokeStyle(2, 0x8a7a6a, 0.92);
      rect.setData('baseStroke', { width: 2, color: 0x8a7a6a, alpha: 0.92 });
      rect.setDepth(pileDepth);
      vis.setDepth(pileDepth + 1);

      rect.setData('matPile', true);
      rect.setData('matType', p.type);
      rect.setData('homeX', pos.x);
      rect.setData('homeY', pos.y);
      rect.setData('dragProxy', vis);
      rect.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(rect);
      this.materialPiles.push(rect);

      this.add
        .text(pos.x, pos.y + bh / 2 + 32, p.label, {
          fontSize: '11px',
          color: '#d8c8b0',
          align: 'center',
          lineSpacing: 3,
          wordWrap: { width: 168 },
        })
        .setOrigin(0.5)
        .setDepth(pileDepth + 2);
    });

    this.materialPiles.forEach((rect) => {
      this.input.setDraggable(rect, false);
      if (rect.disableInteractive) rect.disableInteractive();
    });

    this.firePitHit = this.add
      .circle(cx, cy, CENTER_SNAP_R - 4, 0x000000, 0.001)
      .setDepth(cy + 5)
      .setInteractive({ useHandCursor: true });
    this.firePitHit.on('pointerdown', () => {
      if (!this.constructGameplayActive) return;
      if (this.selectedPile && !this.selectedPile.getData('spent')) {
        this.tryCommitPlacement(this.selectedPile, false);
      }
    });
    if (this.firePitHit.disableInteractive) this.firePitHit.disableInteractive();

    this.strikeBtn = null;

    this.skipBtn = this.add
      .text(GAME_WIDTH - 96, 28, 'Skip', {
        fontSize: '14px',
        color: '#c8b090',
        backgroundColor: '#3a3028',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(1001)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.skipBtn.disableInteractive();
    this.skipBtn.on('pointerover', () => this.skipBtn.setStyle({ backgroundColor: '#4a4038' }));
    this.skipBtn.on('pointerout', () => this.skipBtn.setStyle({ backgroundColor: '#3a3028' }));
    this.skipBtn.on('pointerdown', () => {
      if (!this.constructGameplayActive) return;
      this.registry.set('fireBuiltProperly', false);
      this.skipBtn.disableInteractive();
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(450, () => {
        this.scene.start(SCENE_KEYS.MAINTAIN);
      });
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (!this.constructGameplayActive) return;
      if (!gameObject || !gameObject.active) return;
      if (!gameObject.getData('matPile')) return;
      if (gameObject.getData('spent')) return;
      this.clearPileSelection();
      gameObject.x = dragX;
      gameObject.y = dragY;
      const proxy = gameObject.getData('dragProxy');
      if (proxy) {
        proxy.x = dragX;
        proxy.y = dragY;
      }
      FireIso.setDepthFromY(gameObject);
      if (proxy) proxy.setDepth(gameObject.depth + 1);
    });

    this.input.on('dragend', (pointer, gameObject) => {
      if (!this.constructGameplayActive) return;
      if (!gameObject || !gameObject.active) return;
      if (!gameObject.getData('matPile')) return;
      if (gameObject.getData('spent')) return;

      const dist = Phaser.Math.Distance.Between(
        gameObject.x,
        gameObject.y,
        this.fireCenter.x,
        this.fireCenter.y
      );
      const inCenter = dist < CENTER_SNAP_R;
      if (!inCenter) {
        this.bouncePileHome(gameObject);
        const proxy = gameObject.getData('dragProxy');
        if (proxy) {
          this.tweens.add({
            targets: proxy,
            x: gameObject.getData('homeX'),
            y: gameObject.getData('homeY'),
            duration: 240,
            ease: 'Cubic.easeOut',
          });
        }
        return;
      }

      this.tryCommitPlacement(gameObject, true);
    });

    this.materialPiles.forEach((rect) => {
      rect.on('pointerup', (pointer) => {
        if (!this.constructGameplayActive) return;
        if (!rect.active || rect.getData('spent')) return;
        const d = Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.x, pointer.y);
        if (d > 18) return;
        this.selectPile(rect);
      });
    });

    this.startConstructIntro();
  }

  /** 正确铺好 tinder 后：底层柔光高亮（示意“第一层就绪”） */
  addTinderSoftHighlight(cx, cy) {
    if (this.tinderBaseGlow) {
      this.tinderBaseGlow.destroy();
      this.tinderBaseGlow = null;
    }
    const g = this.add.graphics().setDepth(cy + 6).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(0xffdd99, 0.2);
    g.fillEllipse(cx, cy, 112, 60);
    g.fillStyle(0xffaa66, 0.12);
    g.fillEllipse(cx, cy - 3, 76, 42);
    this.tinderBaseGlow = g;
    g.setAlpha(0.75);
    this.tweens.add({
      targets: g,
      alpha: { from: 0.45, to: 0.95 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  /** 第一层：黄色碎屑（Tween 淡入） */
  addTinderLayer(cx, cy) {
    for (let i = 0; i < 14; i++) {
      const px = cx + Phaser.Math.Between(-26, 26);
      const py = cy + Phaser.Math.Between(-18, 18);
      const s = this.add.rectangle(px, py, Phaser.Math.Between(5, 9), Phaser.Math.Between(4, 7), 0xf4d03f);
      s.setStrokeStyle(1, 0xc9a227, 0.8);
      s.setDepth(11);
      s.setAlpha(0);
      s.setScale(0.4);
      this.layerRoot.add(s);
      this.tweens.add({
        targets: s,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 220,
        delay: i * 28,
        ease: 'Sine.easeOut',
      });
    }
  }

  /** 第二层：交叉细枝（覆盖在 Tinder 上） */
  addKindlingLayer(cx, cy) {
    const sticks = [
      { ox: -6, oy: 0, w: 44, h: 7, rot: 0.42 },
      { ox: 8, oy: 4, w: 44, h: 7, rot: -0.38 },
      { ox: 0, oy: -8, w: 38, h: 7, rot: 0.08 },
    ];
    sticks.forEach((s, i) => {
      const r = this.add.rectangle(cx + s.ox, cy + s.oy, s.w, s.h, 0x6b4423);
      r.setStrokeStyle(1, 0x3d2815, 1);
      r.setRotation(s.rot);
      r.setDepth(12);
      r.setAlpha(0);
      r.setScale(0.5);
      this.layerRoot.add(r);
      this.tweens.add({
        targets: r,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 260,
        delay: 80 + i * 70,
        ease: 'Back.easeOut',
      });
    });
  }

  /** 第三层：简易金字塔形木柴堆 */
  addFuelLayer(cx, cy) {
    const baseY = cy + 8;
    const rows = [
      { y: 0, count: 3, w: 30, h: 11, gap: 32 },
      { y: -16, count: 2, w: 32, h: 11, gap: 34 },
      { y: -32, count: 1, w: 34, h: 12, gap: 0 },
    ];
    let idx = 0;
    rows.forEach((row) => {
      const startX = cx - ((row.count - 1) * row.gap) / 2;
      for (let k = 0; k < row.count; k++) {
        const lx = startX + k * row.gap;
        const ly = baseY + row.y;
        const log = this.add.rectangle(lx, ly, row.w, row.h, 0x4a3220);
        log.setStrokeStyle(2, 0x2a1810, 1);
        log.setDepth(14);
        log.setAlpha(0);
        log.setScale(0.35);
        this.layerRoot.add(log);
        this.tweens.add({
          targets: log,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          duration: 280,
          delay: idx * 55,
          ease: 'Cubic.easeOut',
        });
        idx += 1;
      }
    });
  }

  onConstructionComplete() {
    this.registry.set('fireBuiltProperly', true);
    if (this.skipBtn) {
      this.skipBtn.setVisible(false).disableInteractive();
    }
    this.buildDialog.setText(
      "Now the structure is solid. It's time to bring it to life."
    );
    this.buildDialog.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 186);
    if (this.strikeBtn) return;
    const cx = GAME_WIDTH / 2;
    this.strikeBtn = this.add
      .text(cx, GAME_HEIGHT - 68, 'Next: Strike a Spark', {
        fontSize: '18px',
        color: '#fff8e7',
        backgroundColor: '#8b5a2b',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });

    this.strikeBtn.on('pointerover', () => {
      this.strikeBtn.setStyle({ backgroundColor: '#a66e36' });
      this.tweens.add({
        targets: this.strikeBtn,
        scaleX: 1.06,
        scaleY: 1.06,
        duration: 110,
        ease: 'Quad.easeOut',
      });
    });
    this.strikeBtn.on('pointerout', () => {
      this.strikeBtn.setStyle({ backgroundColor: '#8b5a2b' });
      this.tweens.add({
        targets: this.strikeBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 110,
        ease: 'Quad.easeOut',
      });
    });

    this.strikeBtn.on('pointerdown', () => {
      this.registry.set('fireBuiltProperly', true);
      this.strikeBtn.disableInteractive().setAlpha(0.55);
      this.cameras.main.fadeOut(450, 0, 0, 0);
      this.time.delayedCall(450, () => {
        this.scene.start(SCENE_KEYS.MAINTAIN);
      });
    });
  }
}
// ---------- Scene 6：Start and Maintain the Fire（点燃、吹气、添柴 — 火焰状态机） ----------
class MaintainFireScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MaintainFireScene' });
  }

  /** 生成粒子纹理：方块、烟（软圆）、火星（亮点） */
  ensureParticleTextures() {
    if (!this.textures.exists('pt_square')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff);
      g.fillRect(0, 0, 6, 6);
      g.generateTexture('pt_square', 6, 6);
    }
    if (!this.textures.exists('pt_smoke')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(10, 10, 10);
      g.generateTexture('pt_smoke', 20, 20);
    }
    if (!this.textures.exists('pt_spark')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff);
      g.fillCircle(5, 5, 5);
      g.generateTexture('pt_spark', 10, 10);
    }
  }

  /** 绘制与 Scene 5 结束时一致的“已搭好”火堆 */
  drawConstructedFire(cx, cy) {
    this.add.rectangle(cx, cy, 520, 360, 0x2a2218, 1).setDepth(0).setStrokeStyle(2, 0x4a3a2a, 0.45);
    const slotRingR = 88;
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      const sx = cx + Math.cos(ang) * slotRingR;
      const sy = cy + Math.sin(ang) * slotRingR;
      const rock = this.add.circle(sx, sy, 20, 0x4a4a4a);
      rock.setDepth(4);
      rock.setStrokeStyle(2, 0x2a2a2a);
    }
    for (let i = 0; i < 14; i++) {
      const px = cx + Phaser.Math.Between(-26, 26);
      const py = cy + Phaser.Math.Between(-18, 18);
      const s = this.add.rectangle(px, py, Phaser.Math.Between(5, 9), Phaser.Math.Between(4, 7), 0xd4b020);
      s.setStrokeStyle(1, 0xa88a18, 0.8);
      s.setDepth(8);
    }
    const sticks = [
      { ox: -6, oy: 0, w: 44, h: 7, rot: 0.42 },
      { ox: 8, oy: 4, w: 44, h: 7, rot: -0.38 },
      { ox: 0, oy: -8, w: 38, h: 7, rot: 0.08 },
    ];
    sticks.forEach((s) => {
      const r = this.add.rectangle(cx + s.ox, cy + s.oy, s.w, s.h, 0x5a3a28);
      r.setStrokeStyle(1, 0x3d2815, 1);
      r.setRotation(s.rot);
      r.setDepth(9);
    });
    const baseY = cy + 8;
    const rows = [
      { y: 0, count: 3, w: 30, h: 11, gap: 32 },
      { y: -16, count: 2, w: 32, h: 11, gap: 34 },
      { y: -32, count: 1, w: 34, h: 12, gap: 0 },
    ];
    rows.forEach((row) => {
      const startX = cx - ((row.count - 1) * row.gap) / 2;
      for (let k = 0; k < row.count; k++) {
        const lx = startX + k * row.gap;
        const ly = baseY + row.y;
        const log = this.add.rectangle(lx, ly, row.w, row.h, 0x3d2818);
        log.setStrokeStyle(2, 0x1a1008, 1);
        log.setDepth(10);
      }
    });
  }

  /** 火堆上方暖色渐变块（fillGradientStyle），强度随火焰变化 */
  redrawWarmWash(cx, cy, warmth) {
    if (!this.warmWashG) return;
    this.warmWashG.clear();
    const a = Phaser.Math.Clamp(warmth, 0.08, 0.42);
    this.warmWashG.fillGradientStyle(0xff8833, 0xff5522, 0x4a2810, 0x1a0e08, a * 0.5, a * 0.35, a * 0.12, a * 0.08);
    this.warmWashG.fillRect(cx - 260, cy - 200, 520, 420);
  }

  /** 光圈：中心最亮，向外递减；半径随 smoothIntensity 扩大 */
  refreshRadialLight(cx, cy, intensity01) {
    if (!this.radialLightG) return;
    this.radialLightG.clear();
    const baseR = 55 + intensity01 * 165;
    for (let i = 10; i >= 0; i--) {
      const t = i / 10;
      const rr = baseR * (0.35 + t * 0.65);
      const a = 0.045 * (1 - t) * (0.4 + intensity01 * 0.6);
      this.radialLightG.fillStyle(0xffaa66, a);
      this.radialLightG.fillCircle(cx, this.fireAnchorY, rr);
    }
  }

  create() {
    this.input.off('drag');
    this.input.off('dragend');

    this.ensureParticleTextures();
    this.cameras.main.fadeIn(650, 0, 0, 0);
    this.cameras.main.setZoom(1);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 10;
    this.fireAnchorX = cx;
    this.fireAnchorY = cy - 8;

    this.isoC = FireIso.createConfig(GAME_WIDTH, GAME_HEIGHT);
    FireIso.drawGround(this, this.isoC);

    // 深夜底色（极暗）
    this.cameras.main.setBackgroundColor('#060504');
    this.add.rectangle(cx, cy, GAME_WIDTH + 40, GAME_HEIGHT + 40, 0x030201, 0.38).setDepth(-5);

    // 环境洗光：fillGradientStyle 四角偏冷暗，营造月光/夜色体积感
    this.nightWashG = this.add.graphics().setDepth(-4);
    this.nightWashG.fillGradientStyle(0x1a1518, 0x0d0b0e, 0x08060a, 0x121018, 0.55, 0.65, 0.7, 0.5);
    this.nightWashG.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 火堆中心暖光洗墙（与径向光叠加）
    this.warmWashG = this.add.graphics().setDepth(-3);
    this.redrawWarmWash(cx, cy, 0.15);

    // 径向光圈：中心亮、外缘暗（每帧随强度略调）
    this.radialLightG = this.add.graphics().setDepth(-2).setBlendMode(Phaser.BlendModes.ADD);

    // 暗角 vignette：四边更暗，中间略透，突出中央火堆
    this.vignetteG = this.add.graphics().setDepth(42);
    this.vignetteG.fillGradientStyle(0x000000, 0x000000, 0x020104, 0x020104, 0.78, 0.78, 0.55, 0.55);
    this.vignetteG.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawConstructedFire(cx, cy);

    this.add
      .text(cx, 22, 'Start and Maintain the Fire', {
        fontSize: '20px',
        color: '#c8c0a8',
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.sceneCx = cx;
    this.sceneCy = cy;

    this.fireBuiltProperly = this.registry.get('fireBuiltProperly') !== false;
    this.strikeTimeRequired = this.fireBuiltProperly ? 3000 : 4500;
    this.emberDecayTickMs = this.fireBuiltProperly ? 120 : 82;
    this.emberDecayAmount = this.fireBuiltProperly ? 1.2 : 1.9;

    const maintainIntro = this.fireBuiltProperly
      ? '…The fire pit is ready, but nothing will burn until I spark the tinder.\n\n…Time to use the flint and steel.'
      : '…I skipped careful layering — the tinder is packed tight; sparks may smother instead of catch.\n\n…Still, nothing burns until I spark it.\n\n…Time to use the flint and steel.';

    // 底部 UI 分层（从下往上）：强度条 → 背包提示 → 操作按钮 → 对白（底边对齐，避免与按钮叠在同一带）
    this.maintainDialogBottomY = GAME_HEIGHT - 210;
    this.maintainActionBtnY = GAME_HEIGHT - 118;

    this.mainDialog = this.add
      .text(cx, this.maintainDialogBottomY, maintainIntro, {
        fontSize: '14px',
        color: '#e8dcc8',
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5, 1)
      .setDepth(50);

    this.backpackHint = this.add
      .text(cx, GAME_HEIGHT - 50, 'Open the backpack in the corner — choose flint & steel.', {
        fontSize: '12px',
        color: '#9a8a78',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 36 },
      })
      .setOrigin(0.5)
      .setDepth(50);

    // 底部 Fire Intensity 进度条（平滑跟随热量，停止操作后缓慢回落）
    this.smoothIntensity = 0;
    const barW = GAME_WIDTH - 56;
    const barH = 12;
    const barLeft = 28;
    const barY = GAME_HEIGHT - 24;
    this.add
      .text(barLeft, barY - 16, 'Fire Intensity', {
        fontSize: '11px',
        color: '#9a8a78',
      })
      .setOrigin(0, 0.5)
      .setDepth(46);
    this.intBarBg = this.add
      .rectangle(barLeft + barW / 2, barY, barW, barH, 0x140f0c, 0.95)
      .setStrokeStyle(1, 0x6b5038, 0.95)
      .setDepth(46);
    this.intBarFill = this.add
      .rectangle(barLeft, barY, 4, barH - 3, 0xff7722)
      .setOrigin(0, 0.5)
      .setDepth(47);

    // Tinder 区域（用于打火石击打判定）
    this.tinderZone = new Phaser.Geom.Circle(cx, cy + 4, 48);

    /** fireIntensity：0–100，跟踪热量/火焰成长（供状态机与视觉共用） */
    this.fireIntensity = 0;

    /**
     * 【火焰状态机】阶段说明：
     * strike — 需持打火石在引火物上累计摩擦；
     * ember — 已出现余烬，可吹气、余烬会衰减；
     * small_flame — 余烬足够→小火苗（三角形）；
     * need_kindling — 需把细枝拖入火中；
     * need_fuel — 需把木柴拖入；
     * bonfire — 旺火（胜利前最终形态）
     */
    this.firePhase = 'strike';

    this.strikeMs = 0;
    this.emberDecayTimer = 0;
    this.toolMode = 'none';
    this.strikeSparkEmitter = null;
    this.smokeEmitter = null;
    this.ambientSparkEmitter = null;
    this.emberDot = null;
    this.flameTriangle = null;
    this.bonfireGlow = null;

    // ---------- 背包（右上角） ----------
    this.backpackMenu = null;
    const bx = GAME_WIDTH - 48;
    const by = 52;
    const bp = this.add.container(bx, by);
    bp.add(this.add.rectangle(0, 6, 44, 40, 0x6d4c41).setStrokeStyle(2, 0x4e342e, 1));
    bp.add(this.add.rectangle(0, -8, 38, 16, 0x8d6e63).setStrokeStyle(1, 0x5d4037, 1));
    bp.add(this.add.rectangle(-16, 4, 6, 26, 0x4e342e));
    bp.add(this.add.rectangle(16, 4, 6, 26, 0x4e342e));
    bp.setDepth(60);
    bp.setSize(48, 52);
    bp.setInteractive(
      new Phaser.Geom.Rectangle(-24, -22, 48, 56),
      Phaser.Geom.Rectangle.Contains
    );
    bp.input.cursor = 'pointer';
    this.backpackIcon = bp;

    this.add.text(bx, by + 38, 'Pack', { fontSize: '11px', color: '#c8b8a0' }).setOrigin(0.5).setDepth(60);

    this.backpackIcon.on('pointerdown', () => this.toggleBackpackMenu(bx, by));
    bp.on('pointerover', () => bp.setScale(1.06));
    bp.on('pointerout', () => bp.setScale(1));

    this.flintFollower = this.add
      .rectangle(-100, -100, 14, 18, 0x6a6a72)
      .setStrokeStyle(1, 0x3a3a42)
      .setDepth(100)
      .setVisible(false);

    // 打火石火星：明亮黄/橙微粒，随机飞溅 + 重力下落
    this.strikeSparkEmitter = this.add.particles(0, 0, 'pt_spark', {
      lifespan: { min: 220, max: 520 },
      speed: { min: 90, max: 260 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.1, end: 0.05 },
      alpha: { start: 1, end: 0 },
      accelerationY: 260,
      tint: [0xffffaa, 0xffcc22, 0xff7711],
      blendMode: 'ADD',
      emitting: false,
      frequency: -1,
    });
    this.strikeSparkEmitter.setDepth(95);

    // 烟雾：大量半透明灰圆点上升、扩散、淡出
    this.smokeEmitter = this.add.particles(this.fireAnchorX, this.fireAnchorY - 18, 'pt_smoke', {
      lifespan: { min: 2000, max: 3600 },
      speedY: { min: -38, max: -14 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.18, end: 1.15 },
      alpha: { start: 0.5, end: 0 },
      rotate: { min: -20, max: 20 },
      angle: { min: 250, max: 290 },
      frequency: 32,
      quantity: 3,
      tint: [0x999999, 0x777777, 0xaaaaaa],
      emitting: false,
    });
    this.smokeEmitter.setDepth(92);

    // 火堆周围持续火星（余烬/旺火阶段），从中心向外溅射并受重力拉回
    this.ambientSparkEmitter = this.add.particles(this.fireAnchorX, this.fireAnchorY, 'pt_spark', {
      lifespan: { min: 300, max: 780 },
      speed: { min: 45, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0.06 },
      alpha: { start: 1, end: 0 },
      accelerationY: 280,
      tint: [0xffffee, 0xffaa44, 0xff5511],
      blendMode: 'ADD',
      frequency: 200,
      quantity: 1,
      emitting: false,
    });
    this.ambientSparkEmitter.setDepth(94);

    this.blowBtn = null;
    this.kindlingPile = null;
    this.fuelPile = null;
    this.kindlingPlaced = 0;
    this.kindlingNeeded = 3;
    this.kindlingPieces = [];
    this.strikeMissTimer = 0;

    this.input.on('pointermove', (pointer) => {
      if (this.toolMode === 'flint' && this.flintFollower.visible) {
        this.flintFollower.setPosition(pointer.x, pointer.y);
      }
    });

    this.refreshRadialLight(cx, cy, 0.12);
    this.flameFlickerEvent = null;

    // ---------- 拖拽：细枝 / 木柴 ----------
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (!gameObject || !gameObject.getData('fuelDrag')) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    this.input.on('dragend', (pointer, gameObject) => {
      if (!gameObject || !gameObject.getData('fuelDrag')) return;
      const t = gameObject.getData('fuelType');
      const dist = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, cx, cy - 15);
      const inFlame = dist < 85;

      const home = () => {
        this.tweens.add({
          targets: gameObject,
          x: gameObject.getData('hx'),
          y: gameObject.getData('hy'),
          duration: 220,
          ease: 'Cubic.easeOut',
        });
      };

      if (!inFlame) {
        home();
        return;
      }

      if (this.firePhase === 'need_kindling' && t === 'kindling') {
        gameObject.setAlpha(0);
        this.input.setDraggable(gameObject, false);
        this.kindlingPlaced += 1;
        this.fireIntensity = Math.min(100, this.fireIntensity + 12);
        this.growFlameVisual();

        if (this.kindlingPlaced < this.kindlingNeeded) {
          this.mainDialog.setText(
            `Small sticks, one at a time… (${this.kindlingPlaced} of ${this.kindlingNeeded})`
          );
        } else {
          this.kindlingPieces.forEach((k) => {
            if (k && k.destroy) k.destroy();
          });
          this.kindlingPieces = [];
          this.firePhase = 'need_fuel';
          this.mainDialog.setText(
            '…It\'s strong enough now.\n\n…Time to add larger wood—but carefully. If I rush this, I\'ll kill the flame.'
          );
          this.spawnFuelPile();
        }
        return;
      }

      if (this.firePhase === 'need_fuel' && t === 'fuel') {
        gameObject.setAlpha(0);
        this.input.setDraggable(gameObject, false);
        this.fireIntensity = 100;
        this.firePhase = 'bonfire';
        this.showBonfire(cx, cy);
        this.showVictory();
        return;
      }

      home();
      if (this.firePhase === 'need_kindling' && t === 'fuel') {
        this.mainDialog.setText('Too big yet — feed thin kindling first, a little at a time.');
      } else if (this.firePhase === 'need_fuel' && t === 'kindling') {
        this.mainDialog.setText('The flame is ready for heavier wood now — use the logs.');
      } else {
        this.mainDialog.setText('The flame is fragile. Feed it small sticks first.');
      }
    });
  }

  toggleBackpackMenu(bx, by) {
    if (this.backpackMenu) {
      this.backpackMenu.destroy(true);
      this.backpackMenu = null;
      return;
    }
    const panel = this.add.container(bx - 150, by + 36);
    panel.setDepth(70);
    const bg = this.add.rectangle(0, 0, 188, 168, 0x2a2218, 0.96).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x5c4a3a, 1);
    const title = this.add
      .text(14, 10, 'Inventory', { fontSize: '13px', color: '#c8b8a0' })
      .setOrigin(0, 0);
    const b1 = this.add
      .text(14, 34, 'Flint & steel', {
        fontSize: '14px',
        color: '#f0e8d8',
        backgroundColor: '#4a3a2a',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const bMatch = this.add
      .text(14, 72, 'Matches (optional)', {
        fontSize: '13px',
        color: '#c0b8a8',
        backgroundColor: '#3a3228',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const b2 = this.add
      .text(14, 112, 'Diary', {
        fontSize: '14px',
        color: '#f0e8d8',
        backgroundColor: '#4a3a2a',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    panel.add([bg, title, b1, bMatch, b2]);
    this.backpackMenu = panel;

    b1.on('pointerdown', () => {
      if (this.backpackMenu) {
        this.backpackMenu.destroy(true);
        this.backpackMenu = null;
      }
      if (this.firePhase !== 'strike') return;
      this.toolMode = 'flint';
      this.flintFollower.setVisible(true);
      this.input.setDefaultCursor('none');
      if (this.backpackHint) this.backpackHint.setAlpha(0);
      this.mainDialog.setText(
        'Hold the flint over the tinder and rub — sparks need to land on dry fuel.'
      );
    });

    bMatch.on('pointerdown', () => {
      this.mainDialog.setText('I’ll save the matches. Learning the flint matters more tonight.');
    });

    b2.on('pointerdown', () => {
      this.showDiaryModal();
    });
  }

  showDiaryModal() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setDepth(120).setInteractive();
    const box = this.add.rectangle(cx, cy, 460, 220, 0x2a2218, 0.98).setDepth(121).setStrokeStyle(2, 0x6b5a4a);
    const tx = this.add
      .text(
        cx,
        cy - 20,
        'Diary — Day 1\nDry fuel by dusk. Ring cleared. Tonight: spark, breath, flame.',
        {
          fontSize: '14px',
          color: '#e8dcc8',
          align: 'center',
          lineSpacing: 6,
          wordWrap: { width: 400 },
        }
      )
      .setOrigin(0.5)
      .setDepth(122);
    const close = this.add
      .text(cx, cy + 72, 'Close', {
        fontSize: '16px',
        color: '#fff8e7',
        backgroundColor: '#5c4a3a',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(122)
      .setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => {
      dim.destroy();
      box.destroy();
      tx.destroy();
      close.destroy();
    });
  }

  update(time, delta) {
    const p = this.input.activePointer;
    const inTinder =
      Phaser.Math.Distance.Between(p.x, p.y, this.tinderZone.x, this.tinderZone.y) <=
      this.tinderZone.radius;

    if (this.firePhase === 'strike' && this.toolMode === 'flint') {
      if (p.isDown && inTinder) {
        this.strikeMissTimer = 0;
        this.strikeMs += delta;
        if (this.strikeSparkEmitter && this.strikeSparkEmitter.emitParticleAt) {
          this.strikeSparkEmitter.emitParticleAt(p.x, p.y, 5);
        }
        if (this.strikeMs >= this.strikeTimeRequired) {
          this.spawnEmberAndSmoke();
          this.strikeMs = 0;
          this.firePhase = 'ember';
          this.flintFollower.setVisible(false);
          this.input.setDefaultCursor('default');
          this.toolMode = 'none';
          this.showBlowButton();
        }
      } else if (p.isDown && !inTinder) {
        this.strikeMs = 0;
        if (this.strikeSparkEmitter && this.strikeSparkEmitter.emitParticleAt) {
          this.strikeSparkEmitter.emitParticleAt(p.x, p.y, 1);
        }
        this.strikeMissTimer += delta;
        if (this.strikeMissTimer > 2200) {
          this.strikeMissTimer = 0;
          this.mainDialog.setText(
            'Sparks are landing off the tinder — hold the flint closer to the dry pile.'
          );
        }
      } else {
        this.strikeMs = 0;
      }
    }

    if (this.firePhase === 'ember') {
      this.emberDecayTimer = (this.emberDecayTimer || 0) + delta;
      if (this.emberDecayTimer > this.emberDecayTickMs) {
        this.emberDecayTimer = 0;
        this.fireIntensity = Math.max(0, this.fireIntensity - this.emberDecayAmount);
        if (this.emberDot && this.emberDot.active) {
          const s = 0.4 + (this.fireIntensity / 100) * 0.8;
          this.emberDot.setScale(s);
          this.emberDot.setAlpha(0.4 + (this.fireIntensity / 100) * 0.6);
        }
        if (this.fireIntensity <= 0) {
          this.mainDialog.setText('The ember faded. Open the pack and strike again.');
          this.firePhase = 'strike';
          if (this.emberDot) this.emberDot.destroy();
          if (this.smokeEmitter) {
            if (typeof this.smokeEmitter.setEmitting === 'function') {
              this.smokeEmitter.setEmitting(false);
            } else if (this.smokeEmitter.stop) {
              this.smokeEmitter.stop();
            }
          }
          this.emberDot = null;
          if (this.blowBtn) this.blowBtn.destroy();
          this.blowBtn = null;
        }
      }
      if (this.fireIntensity >= 42 && this.firePhase === 'ember') {
        this.promoteToSmallFlame();
      }
    }

    // 进度条平滑跟随 fireIntensity（停止吹气后数值下降 → 条缓慢回落）
    this.smoothIntensity = Phaser.Math.Linear(
      this.smoothIntensity,
      this.fireIntensity,
      0.085
    );
    if (this.intBarFill) {
      const maxW = GAME_WIDTH - 56;
      this.intBarFill.width = Math.max(4, maxW * Phaser.Math.Clamp(this.smoothIntensity / 100, 0, 1));
    }
    if (this.sceneCx !== undefined) {
      const hi = Phaser.Math.Clamp(this.smoothIntensity / 100, 0, 1);
      this.refreshRadialLight(this.sceneCx, this.sceneCy, hi);
      this.redrawWarmWash(this.sceneCx, this.sceneCy, 0.1 + hi * 0.34);
    }
    if (this.ambientSparkEmitter && this.ambientSparkEmitter.active) {
      this.ambientSparkEmitter.setPosition(this.fireAnchorX, this.fireAnchorY);
    }
  }

  /** 通用矩形按钮悬停：变色 + 轻微缩放 */
  applyButtonHover(rect, colors, scaleMul = 1.06) {
    if (!rect || !rect.setInteractive) return;
    rect.on('pointerover', () => {
      rect.setFillStyle(colors.hover);
      this.tweens.add({
        targets: rect,
        scaleX: scaleMul,
        scaleY: scaleMul,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    });
    rect.on('pointerout', () => {
      rect.setFillStyle(colors.idle);
      this.tweens.add({
        targets: rect,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: 'Quad.easeOut',
      });
    });
  }

  spawnEmberAndSmoke() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 10;
    const tight = !this.fireBuiltProperly;
    const r = tight ? 4 : 6;
    this.fireIntensity = tight ? 9 : 15;
    this.emberDot = this.add.circle(cx, cy - 6, r, tight ? 0xcc5522 : 0xff6622);
    this.emberDot.setStrokeStyle(2, 0xaa3300);
    this.emberDot.setDepth(96);
    this.tweens.add({
      targets: this.emberDot,
      scale: { from: 0.2, to: 1 },
      duration: 400,
      ease: 'Elastic.easeOut',
    });
    this.smokeEmitter.setPosition(cx, cy - 22);
    if (typeof this.smokeEmitter.setEmitting === 'function') {
      this.smokeEmitter.setEmitting(true);
    } else if (this.smokeEmitter.start) {
      this.smokeEmitter.start();
    } else {
      this.smokeEmitter.emitting = true;
    }

    if (this.ambientSparkEmitter) {
      if (typeof this.ambientSparkEmitter.setEmitting === 'function') {
        this.ambientSparkEmitter.setEmitting(true);
      } else if (this.ambientSparkEmitter.start) {
        this.ambientSparkEmitter.start();
      }
    }
  }

  showBlowButton() {
    if (this.blowBtn) return;
    const extra = !this.fireBuiltProperly
      ? '\n\nThe pile was tight — smoke stays weak until I give it room.'
      : '';
    this.mainDialog.setText(
      `Sparks caught — smoke rises, then a faint glow.\n\nNow it needs a little air… helps it grow without smothering the spark.${extra}`
    );
    this.mainDialog.setOrigin(0.5, 1);
    this.mainDialog.setY(this.maintainDialogBottomY);
    const cx = GAME_WIDTH / 2;
    this.blowBtn = this.add
      .text(cx, this.maintainActionBtnY, 'Blow', {
        fontSize: '20px',
        color: '#e8f8ff',
        backgroundColor: '#3a5a78',
        padding: { x: 28, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(55)
      .setInteractive({ useHandCursor: true });

    this.blowBtn.on('pointerover', () =>
      this.blowBtn.setStyle({ backgroundColor: '#4a6a98' })
    );
    this.blowBtn.on('pointerout', () =>
      this.blowBtn.setStyle({ backgroundColor: '#3a5a78' })
    );

    this.blowBtn.on('pointerdown', () => {
      if (this.firePhase !== 'ember') return;
      this.emberDecayTimer = 0;
      this.fireIntensity = Math.min(100, this.fireIntensity + 18);
      // 吹气镜头反馈：轻微 Zoom + Shake
      this.cameras.main.zoomTo(1.042, 150, 'Sine.easeOut');
      this.cameras.main.shake(220, 0.0075);
      this.time.delayedCall(240, () => {
        this.cameras.main.zoomTo(1, 200, 'Sine.easeInOut');
      });
      if (this.emberDot) {
        this.tweens.add({
          targets: this.emberDot,
          scale: 0.4 + (this.fireIntensity / 100) * 1.1,
          duration: 160,
          yoyo: true,
        });
      }
    });
  }

  promoteToSmallFlame() {
    if (this.firePhase !== 'ember') return;
    if (this.blowBtn) {
      this.blowBtn.destroy();
      this.blowBtn = null;
    }
    if (this.emberDot) {
      this.emberDot.destroy();
      this.emberDot = null;
    }
    if (this.smokeEmitter) {
      if (typeof this.smokeEmitter.setEmitting === 'function') {
        this.smokeEmitter.setEmitting(false);
      } else if (this.smokeEmitter.stop) {
        this.smokeEmitter.stop();
      }
    }

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 14;
    this.flameTriangle = this.add.triangle(cx, cy, 0, 22, -16, -14, 16, -14, 0xff7711);
    this.flameTriangle.setStrokeStyle(2, 0xffaa44);
    this.flameTriangle.setDepth(97);
    if (this.flameFlickerEvent) this.flameFlickerEvent.remove();
    this.flameFlickerEvent = this.time.addEvent({
      delay: 75,
      loop: true,
      callback: () => {
        if (!this.flameTriangle || !this.flameTriangle.active) return;
        this.flameTriangle.setScale(
          0.88 + Math.random() * 0.2,
          0.82 + Math.random() * 0.26
        );
      },
    });

    this.mainDialog.setText(
      '…Now the flame\'s alive, but it\'s fragile.\n\n…I need to feed it small sticks first—slowly, not all at once.'
    );
    this.firePhase = 'need_kindling';
    this.kindlingPlaced = 0;
    this.spawnKindlingSticks();
  }

  spawnKindlingSticks() {
    this.kindlingPieces.forEach((k) => {
      if (k && k.destroy) k.destroy();
    });
    this.kindlingPieces = [];
    if (this.kindlingHintText && this.kindlingHintText.destroy) {
      this.kindlingHintText.destroy();
    }
    const y = GAME_HEIGHT - 96;
    const xs = [220, 400, 580];
    for (let i = 0; i < this.kindlingNeeded; i++) {
      const stick = this.add.rectangle(xs[i], y, 40, 10, 0x6b4423);
      stick.setStrokeStyle(1, 0x3d2815);
      stick.setDepth(55);
      stick.setRotation(Phaser.Math.FloatBetween(-0.2, 0.2));
      stick.setData('fuelDrag', true);
      stick.setData('fuelType', 'kindling');
      stick.setData('hx', xs[i]);
      stick.setData('hy', y);
      stick.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(stick);
      this.kindlingPieces.push(stick);
    }
    this.kindlingHintText = this.add
      .text(GAME_WIDTH / 2, y + 28, 'Drag each stick into the flame — one at a time.', {
        fontSize: '12px',
        color: '#a89880',
      })
      .setOrigin(0.5)
      .setDepth(55);
  }

  spawnFuelPile() {
    if (this.fuelPile && this.fuelPile.active) return;
    if (this.kindlingHintText && this.kindlingHintText.destroy) {
      this.kindlingHintText.destroy();
      this.kindlingHintText = null;
    }
    const y = GAME_HEIGHT - 96;
    const fx = 400;
    this.fuelPile = this.add.rectangle(fx, y, 58, 22, 0x4a3220);
    this.fuelPile.setStrokeStyle(2, 0x2a1810);
    this.fuelPile.setDepth(55);
    this.fuelPile.setData('fuelDrag', true);
    this.fuelPile.setData('fuelType', 'fuel');
    this.fuelPile.setData('hx', fx);
    this.fuelPile.setData('hy', y);
    this.fuelPile.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.fuelPile);
    this.add
      .text(fx, y + 28, 'Fuel log — place near the burning kindling', {
        fontSize: '12px',
        color: '#a89880',
      })
      .setOrigin(0.5)
      .setDepth(55);
  }

  growFlameVisual() {
    if (!this.flameTriangle) return;
    this.tweens.add({
      targets: this.flameTriangle,
      scaleX: 1.25,
      scaleY: 1.35,
      duration: 350,
      ease: 'Elastic.easeOut',
    });
  }

  showBonfire(cx, cy) {
    if (this.flameFlickerEvent) {
      this.flameFlickerEvent.remove();
      this.flameFlickerEvent = null;
    }
    if (this.flameTriangle) {
      this.flameTriangle.destroy();
      this.flameTriangle = null;
    }
    this.bonfireGlow = this.add.ellipse(cx, cy - 10, 120, 140, 0xffaa33, 0.45);
    this.bonfireGlow.setDepth(90);
    this.tweens.add({
      targets: this.bonfireGlow,
      scaleX: { from: 0.9, to: 1.2 },
      scaleY: { from: 0.9, to: 1.25 },
      alpha: { from: 0.38, to: 0.62 },
      duration: 420,
      yoyo: true,
      repeat: -1,
    });

    const big = this.add.triangle(cx, cy - 8, 0, 55, -40, -35, 40, -35, 0xffcc44);
    big.setBlendMode(Phaser.BlendModes.ADD);
    big.setDepth(98);
    this.bonfireTri = big;
    this.flameFlickerEvent = this.time.addEvent({
      delay: 70,
      loop: true,
      callback: () => {
        if (!this.bonfireTri || !this.bonfireTri.active) return;
        this.bonfireTri.setScale(
          0.94 + Math.random() * 0.14,
          0.9 + Math.random() * 0.18
        );
      },
    });

  }

  showVictory() {
    this.mainDialog.setOrigin(0.5, 1);
    this.mainDialog.setY(this.maintainDialogBottomY);
    this.mainDialog.setText(
      '…Finally… a fire that will hold.\n\n…Now I can focus on what comes next.'
    );
    const cx = GAME_WIDTH / 2;
    const continueBtn = this.add
      .text(cx, GAME_HEIGHT - 88, 'Continue', {
        fontSize: '18px',
        color: '#fff8e7',
        backgroundColor: '#4a5c3a',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setInteractive({ useHandCursor: true });
    continueBtn.on('pointerover', () => {
      continueBtn.setStyle({ backgroundColor: '#5d7348' });
      this.input.setDefaultCursor('pointer');
    });
    continueBtn.on('pointerout', () => {
      continueBtn.setStyle({ backgroundColor: '#4a5c3a' });
      this.input.setDefaultCursor('default');
    });
    continueBtn.on('pointerdown', () => {
      continueBtn.disableInteractive().setAlpha(0.55);
      this.cameras.main.fadeOut(550, 0, 0, 0);
      this.time.delayedCall(550, () => {
        this.scene.start(SCENE_KEYS.HERBS);
      });
    });
  }
}


// ---------- Scene 7：Find Herbs（火把照明 + 收集；仅 Maintain 胜利后进入） ----------
/**
 * 三株目标草药：**同一外观**（避免与多 kind 布尔混用导致只能收到一株的 bug）。
 * 毒藤为红块干扰；收齐三株后结束本段并回标题（旅行者已在 FIRE_NPC 中见过）。
 */
class HerbHuntScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HerbHuntScene' });
  }

  startHerbIntro() {
    const cx = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT - 96;
    const lines = [
      '…This flame should help me see in the dark.',
      '…The herbs… they\'re supposed to glow under firelight.',
      '…Careful… I can\'t let the flame touch the bushes, or it\'ll spread.',
    ];

    this.introBg = this.add
      .rectangle(cx, boxY, GAME_WIDTH - 40, 128, 0x000000, 0.82)
      .setStrokeStyle(1, 0x3a4a38, 0.85)
      .setDepth(2500);
    this.introTitle = this.add
      .text(cx, boxY - 42, 'Find Herbs', {
        fontSize: '22px',
        color: '#c8d4c0',
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introText = this.add
      .text(cx, boxY + 4, lines[0], {
        fontSize: '15px',
        color: '#f0e8d8',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: GAME_WIDTH - 72 },
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introStep = 0;
    this.introNextBtn = this.add
      .text(cx, boxY + 52, 'Next', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#3d4a32',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(2502)
      .setInteractive({ useHandCursor: true });
    this.introNextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.introNextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.introNextBtn.on('pointerdown', () => {
      this.introStep += 1;
      if (this.introStep < lines.length) {
        this.introText.setText(lines[this.introStep]);
        if (this.introStep === lines.length - 1) {
          this.introNextBtn.setText('Continue');
        }
      } else {
        if (this.introBg) this.introBg.destroy();
        if (this.introTitle) this.introTitle.destroy();
        if (this.introText) this.introText.destroy();
        if (this.introNextBtn) this.introNextBtn.destroy();
        this.introBg = null;
        this.beginHerbGameplay();
      }
    });
  }

  /** 灌木丛前景（无人物） */
  addBushForeground() {
    const gy = GAME_HEIGHT * 0.58;
    const g = this.add.graphics().setDepth(48);
    g.fillStyle(0x0f1a12, 0.95);
    g.fillEllipse(GAME_WIDTH / 2 + 60, gy + 20, 320, 140);
    g.fillStyle(0x1b3a22, 0.92);
    g.fillEllipse(GAME_WIDTH / 2 + 40, gy, 260, 110);
    g.fillStyle(0x2d5a32, 0.88);
    for (let i = 0; i < 14; i++) {
      const ox = Phaser.Math.FloatBetween(-120, 120);
      const oy = Phaser.Math.FloatBetween(-40, 40);
      g.fillEllipse(GAME_WIDTH / 2 + 70 + ox, gy - 10 + oy, Phaser.Math.Between(36, 72), Phaser.Math.Between(22, 38));
    }
    this.add
      .text(GAME_WIDTH / 2, gy - 78, 'Dense brush — keep the flame clear of it.', {
        fontSize: '11px',
        color: '#6a7a68',
      })
      .setOrigin(0.5)
      .setDepth(49);
  }

  /** 炭火堆（开场与玩法共用，只创建一次） */
  createFirePit() {
    const fpX = GAME_WIDTH / 2;
    const fpY = GAME_HEIGHT - 42;
    this.firePitFx = fpX;
    this.firePitFy = fpY;
    this.add
      .ellipse(fpX, fpY, 96, 36, 0x2a1810, 0.9)
      .setStrokeStyle(2, 0x4a3020, 0.85)
      .setDepth(88);
    this.firePitEmber = this.add
      .ellipse(fpX, fpY - 2, 44, 22, 0xff6622, 0.55)
      .setDepth(89)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: this.firePitEmber,
      alpha: { from: 0.4, to: 0.75 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.firePitZone = this.add
      .circle(fpX, fpY, 52, 0x000000, 0.001)
      .setDepth(92)
      .setInteractive({ useHandCursor: true });
    this.firePitHintLabel = this.add
      .text(fpX, fpY + 38, 'Click — catch fire on the stick', {
        fontSize: '11px',
        color: '#9a9a88',
      })
      .setOrigin(0.5)
      .setDepth(93);
  }

  /**
   * 顺序：① 在炭火处点着木棍 → ② 走到灌木前 → ③ 对白 → ④ beginHerbGameplay 寻草
   */
  runHerbOpeningSequence() {
    this.herbOpeningLit = false;
    this.addBushForeground();
    this.createFirePit();

    const fpX = this.firePitFx;
    const fpY = this.firePitFy;
    const startX = fpX - 118;
    const startY = fpY - 54;
    const endGy = GAME_HEIGHT * 0.58;
    const endX = GAME_WIDTH * 0.28;
    const endY = endGy + 24;

    this.playerWalkContainer = this.add.container(startX, startY);
    this.playerWalkContainer.setDepth(55);
    const body = this.add.rectangle(0, 0, 36, 52, 0x1a1410, 0.92).setStrokeStyle(1, 0x0a0806, 0.8);
    const head = this.add.circle(0, -38, 14, 0x2a2218, 0.95).setStrokeStyle(1, 0x1a1410, 0.9);
    const stick = this.add.rectangle(28, -8, 36, 8, 0x1a1410, 0.9).setRotation(-0.35);
    this.playerWalkContainer.add([body, head, stick]);
    this.playerStickFlame = null;
    this.playerStickGlow = null;

    this.openingCaption = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 118, 'Step toward the coals and light your stick.', {
        fontSize: '13px',
        color: '#e8e0d4',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 48 },
      })
      .setOrigin(0.5)
      .setDepth(110);

    this.firePitZone.on('pointerdown', () => {
      if (this.herbOpeningLit || this.herbGameplayActive) return;
      this.herbOpeningLit = true;
      this.firePitZone.disableInteractive();

      const sg = this.add.circle(24, -22, 9, 0xffaa44, 0.8).setBlendMode(Phaser.BlendModes.ADD);
      const sf = this.add
        .triangle(22, -32, 0, 0, -4, 12, 4, 12, 0xff7722)
        .setStrokeStyle(1, 0xffcc88, 0.7)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setRotation(-0.35);
      this.playerWalkContainer.add([sg, sf]);
      this.playerStickGlow = sg;
      this.playerStickFlame = sf;

      this.cameras.main.flash(120, 255, 200, 120, false, undefined, 0.22);
      this.openingCaption.setText('Walking to the brush…');
      this.tweens.add({
        targets: this.playerWalkContainer,
        x: endX,
        y: endY,
        duration: 1000,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (this.playerWalkContainer) {
            this.playerWalkContainer.destroy(true);
            this.playerWalkContainer = null;
          }
          this.playerStickGlow = null;
          this.playerStickFlame = null;
          this.herbPreLitFromOpening = true;
          if (this.openingCaption && this.openingCaption.destroy) this.openingCaption.destroy();
          this.openingCaption = null;
          this.startHerbIntro();
        },
      });
    });
  }

  create() {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#050807');

    this.torchLit = false;
    this.herbGameplayActive = false;
    this.herbPreLitFromOpening = false;
    this.completed = false;
    this.totalGood = 3;
    this.poisonCount = 2;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a2218, 1).setDepth(0);
    for (let i = 0; i < 22; i++) {
      const px = Phaser.Math.Between(30, GAME_WIDTH - 30);
      const py = Phaser.Math.Between(70, GAME_HEIGHT - 90);
      const s = Phaser.Math.Between(24, 68);
      this.add
        .rectangle(px, py, s, s * 0.55, 0x243018, 0.4)
        .setDepth(1)
        .setRotation(Phaser.Math.FloatBetween(-0.35, 0.35));
    }
    for (let b = 0; b < 10; b++) {
      const bx = Phaser.Math.Between(60, GAME_WIDTH - 60);
      const by = Phaser.Math.Between(GAME_HEIGHT * 0.48, GAME_HEIGHT - 88);
      this.add
        .ellipse(bx, by, Phaser.Math.Between(64, 110), Phaser.Math.Between(32, 48), 0x122218, 0.72)
        .setDepth(79);
    }

    this.runHerbOpeningSequence();
  }

  beginHerbGameplay() {
    this.herbGameplayActive = true;
    const preLit = this.herbPreLitFromOpening === true;

    this.add
      .text(GAME_WIDTH / 2, 22, 'Find Herbs', {
        fontSize: '20px',
        color: '#c8d4c0',
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.herbDialogBottomY = GAME_HEIGHT - 200;
    const dialogStart = preLit
      ? 'Your stick is lit. Move the torch near the plants — they show themselves in the light.'
      : 'Light your stick from the coals below.';
    this.herbDialog = this.add
      .text(GAME_WIDTH / 2, this.herbDialogBottomY, dialogStart, {
        fontSize: '14px',
        color: '#e8e0d4',
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: GAME_WIDTH - 44 },
      })
      .setOrigin(0.5, 1)
      .setDepth(100);

    const hintStart = preLit
      ? 'Three matching herbs to collect. Red ivy will sting — it shrinks your light if you brush it.'
      : 'Click the coals to catch fire, then move the torch near plants. Three matching herbs; red ivy burns if you get too close.';
    this.herbHint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 46, hintStart, {
        fontSize: '11px',
        color: '#7a8a78',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: GAME_WIDTH - 48 },
      })
      .setOrigin(0.5)
      .setDepth(100);

    const totalGood = this.totalGood;
    const poisonCount = this.poisonCount;
    const totalPlants = totalGood + poisonCount;

    const types = [];
    for (let i = 0; i < totalGood; i++) types.push('herb');
    for (let i = 0; i < poisonCount; i++) types.push('ivy');
    Phaser.Utils.Array.Shuffle(types);

    this.torchRadiusBase = 118;
    this.torchRadius = this.torchRadiusBase;
    this.torchRadiusMin = 78;

    this.plants = [];
    const margin = 56;
    const positions = Phaser.Utils.Array.Shuffle(
      Array.from({ length: totalPlants }, () => ({
        x: Phaser.Math.Between(margin, GAME_WIDTH - margin),
        y: Phaser.Math.Between(margin + 36, GAME_HEIGHT - margin - 70),
      }))
    );

    types.forEach((kind, i) => {
      const pos = positions[i];
      const p = this.createPlantSprite(pos.x, pos.y, kind);
      p.setDepth(87);
      p.setData('kind', kind);
      p.setData('collected', false);
      p.setData('wasLit', false);
      p.setAlpha(0.12);
      p.disableInteractive();
      p.on('pointerdown', () => this.onPlantPointerDown(p));
      this.plants.push(p);
    });

    this.dimOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050807, 0.62)
      .setDepth(84)
      .setScrollFactor(0);

    this.torchHalo = this.add
      .circle(-100, -100, 128, 0x4a3a18, 0)
      .setStrokeStyle(40, 0xffcc66, 0.14)
      .setDepth(86)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);

    this.input.setDefaultCursor('none');
    this.torchGlow = this.add
      .circle(-20, -20, 9, 0xffaa44, 0.85)
      .setStrokeStyle(2, 0xffdd88, 0.9)
      .setDepth(102)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.torchGlow.setAlpha(0.28);
    this.torchGlow.setScale(0.55);

    this.torchFlame = this.add.triangle(-20, -32, 0, 0, -5, 12, 5, 12, 0xff8833);
    this.torchFlame.setStrokeStyle(1, 0xffcc66, 0.6);
    this.torchFlame.setDepth(103);
    this.torchFlame.setBlendMode(Phaser.BlendModes.ADD);
    this.torchFlame.setVisible(false);

    this.torchStick = this.add
      .rectangle(-30, -10, 10, 56, 0x4e3d2a)
      .setStrokeStyle(1, 0x2a1e14, 0.9)
      .setOrigin(0.5, 0.85)
      .setDepth(101)
      .setAngle(-38);

    if (!this.firePitZone) {
      this.createFirePit();
    }

    const lightTorchFromCoals = () => {
      if (this.torchLit) return;
      this.torchLit = true;
      this.torchGlow.setAlpha(0.95);
      this.torchGlow.setScale(1);
      this.torchFlame.setVisible(true);
      if (this.torchHalo) this.torchHalo.setVisible(true);
      this.herbHint.setText(
        'Drag or move the torch near the herbs — they glow in the light. Collect three matching herbs.'
      );
      this.cameras.main.flash(140, 255, 220, 140, false, undefined, 0.2);
      this.tweens.add({
        targets: this.torchFlame,
        scaleX: { from: 0.6, to: 1.15 },
        scaleY: { from: 0.6, to: 1.15 },
        duration: 220,
        yoyo: true,
        ease: 'Sine.out',
      });
    };

    if (preLit) {
      this.torchLit = true;
      if (this.firePitHintLabel && this.firePitHintLabel.setText) {
        this.firePitHintLabel.setText('The embers still glow.');
      }
      if (this.firePitZone && this.firePitZone.disableInteractive) {
        this.firePitZone.disableInteractive();
      }
      this.torchGlow.setAlpha(0.95);
      this.torchGlow.setScale(1);
      this.torchFlame.setVisible(true);
      if (this.torchHalo) this.torchHalo.setVisible(true);
    } else {
      this.firePitZone.on('pointerdown', () => {
        lightTorchFromCoals();
      });
    }

    const barY = 44;
    this.add.text(24, barY - 10, 'Torch', { fontSize: '11px', color: '#8a9a80' }).setDepth(100);
    this.torchBarBg = this.add
      .rectangle(70, barY, 120, 8, 0x0a0c08, 0.9)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x3a4a32, 0.8)
      .setDepth(100);
    this.torchBarFill = this.add
      .rectangle(70, barY, 118, 6, 0xff9933)
      .setOrigin(0, 0.5)
      .setDepth(101);

    this.goodHerbsRemaining = totalGood;
    this.completed = false;

    this.input.on('pointermove', (pointer) => {
      if (!this.herbGameplayActive) return;
      this.torchGlow.setPosition(pointer.x, pointer.y);
      if (this.torchFlame) {
        this.torchFlame.setPosition(pointer.x - 6, pointer.y - 36);
      }
      if (this.torchHalo) this.torchHalo.setPosition(pointer.x, pointer.y);
      if (this.torchStick) {
        this.torchStick.setPosition(pointer.x - 14, pointer.y + 6);
      }
    });
  }

  snapHerbDialogLayout() {
    if (!this.herbDialog || !this.herbDialog.active) return;
    this.herbDialog.setOrigin(0.5, 1);
    if (this.herbDialogBottomY != null) {
      this.herbDialog.setY(this.herbDialogBottomY);
    }
  }

  /** 目标草药统一外观；ivy=红方块干扰 */
  createPlantSprite(x, y, kind) {
    const container = this.add.container(x, y);
    if (kind === 'herb') {
      const g = this.add.graphics();
      g.fillStyle(0x2d4a28, 1);
      g.fillEllipse(0, 12, 28, 11);
      g.fillStyle(0x558b2f, 1);
      for (let i = -3; i <= 3; i++) {
        const ox = i * 5;
        const hi = 16 + (Math.abs(i) % 2) * 6;
        g.fillTriangle(ox - 2.5, 12, ox, 12 - hi, ox + 2.5, 12);
      }
      g.fillStyle(0x7cb342, 0.9);
      g.fillEllipse(4, 0, 18, 12);
      container.add(g);
      container.setSize(42, 46);
    } else {
      const ivy = this.add.rectangle(0, 0, 26, 26, 0xb02020);
      ivy.setStrokeStyle(2, 0x601010);
      container.add(ivy);
      container.setSize(28, 28);
    }
    const hit = kind === 'herb' ? [42, 46] : [30, 30];
    const [hw, hh] = hit;
    container.setInteractive(
      new Phaser.Geom.Rectangle(-hw / 2, -hh / 2, hw, hh),
      Phaser.Geom.Rectangle.Contains
    );
    return container;
  }

  onPlantPointerDown(plant) {
    if (!this.herbGameplayActive) return;
    if (!plant || !plant.active || plant.getData('collected') || this.completed) return;
    if (!this.torchLit) return;
    if (!plant.getData('lit')) return;

    const kind = plant.getData('kind');
    if (kind === 'ivy') {
      this.herbDialog.setText("Ouch! That's toxic. I should be more careful.");
      this.snapHerbDialogLayout();
      this.cameras.main.flash(200, 180, 40, 40, false, undefined, 0.45);
      this.cameras.main.shake(220, 0.006);
      this.torchRadius = Math.max(this.torchRadiusMin, this.torchRadius - 12);
      return;
    }

    plant.setData('collected', true);
    plant.disableInteractive();
    this.goodHerbsRemaining -= 1;

    this.tweens.add({
      targets: plant,
      alpha: 0,
      scale: 0.3,
      duration: 280,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        if (plant && plant.active) plant.destroy();
      },
    });

    this.herbDialog.setText('Found it! One step closer to the cure.');
    this.snapHerbDialogLayout();

    if (this.goodHerbsRemaining <= 0) {
      this.completed = true;
      this.time.delayedCall(450, () => this.showHerbHuntComplete());
    }
  }

  showHerbHuntComplete() {
    this.herbDialog.setText(
      'I have what I need for now. Time to gather fuel and tend the fire.'
    );
    this.snapHerbDialogLayout();
    const cx = GAME_WIDTH / 2;
    const banner = this.add
      .text(cx, GAME_HEIGHT / 2 - 52, 'Herbs gathered.\nThe cure can wait for dawn.', {
        fontSize: '22px',
        color: '#fff8e6',
        align: 'center',
        fontStyle: 'bold',
        stroke: '#1a1810',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 600,
      ease: 'Cubic.easeOut',
    });

    const continueBtn = this.add
      .text(cx, GAME_HEIGHT / 2 + 48, 'Return to title', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c4a32',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(201)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: continueBtn, alpha: 1, delay: 500, duration: 400 });
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    continueBtn.on('pointerdown', () => {
      continueBtn.disableInteractive();
      this.input.setDefaultCursor('default');
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start(SCENE_KEYS.BG0);
      });
    });
  }

  update() {
    if (!this.herbGameplayActive) return;
    if (this.completed) return;
    const p = this.input.activePointer;
    const px = p.x;
    const py = p.y;

    if (this.torchBarFill) {
      const t = Phaser.Math.Clamp(this.torchRadius / this.torchRadiusBase, 0, 1);
      this.torchBarFill.width = Math.max(2, 118 * t);
    }

    this.plants.forEach((plant) => {
      if (!plant || !plant.active || plant.getData('collected')) return;
      if (!this.torchLit) {
        plant.setData('lit', false);
        plant.setAlpha(0.12);
        plant.disableInteractive();
        return;
      }
      const d = Phaser.Math.Distance.Between(px, py, plant.x, plant.y);
      const lit = d <= this.torchRadius;
      plant.setData('lit', lit);
      const silhouette = 0.14;
      const a = lit ? 1 : silhouette;
      plant.setAlpha(a);
      if (lit !== plant.getData('wasLit')) {
        plant.setData('wasLit', lit);
        if (lit) plant.setInteractive({ useHandCursor: true });
        else plant.disableInteractive();
      }
    });

    if (this.torchHalo && this.torchLit) {
      this.torchHalo.setPosition(px, py);
      this.torchHalo.setRadius(this.torchRadius + 18);
    }
  }
}
