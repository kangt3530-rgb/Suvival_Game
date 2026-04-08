/**
 * Scene1_Forest.js — 游戏阶段：选址、NPC、火堆位置（Scene 1–3）
 * 内含：CampSelectScene, NpcScene（重定向至 CampSelectScene state 2）, FireSpotScene
 */

// ---------- Scene 1：选择营地（2.5D 等距；gameState 1–9 在 CampSelectScene 内推进）----------
class CampSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CampSelectScene' });
  }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#2a1f14');

    this.isoAnchorX = cam.width / 2;
    this.isoAnchorY = cam.height * 0.35;
    this.gameState = 1;
    this.stageObjects = [];
    this.campsiteChoice = null;

    this.add
      .rectangle(0, 0, cam.width, cam.height, 0x111133, 0.35)
      .setOrigin(0, 0)
      .setDepth(-1);

    this.eveningDimOverlay = this.add
      .rectangle(0, 0, cam.width, cam.height, 0x0a0612, 0)
      .setOrigin(0, 0)
      .setDepth(50)
      .setScrollFactor(0);

    this.dialogBg = this.add.rectangle(
      cam.width / 2,
      cam.height - 60,
      cam.width - 40,
      96,
      0x000000,
      0.6
    );
    this.dialogBg.setStrokeStyle(1, 0x5c4033, 0.85);
    this.dialogBg.setDepth(5000);

    this.dialogText = this.add
      .text(cam.width / 2, cam.height - 60, '', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#f5e6d3',
        align: 'center',
        wordWrap: { width: cam.width - 80 },
      })
      .setOrigin(0.5)
      .setDepth(5001);

    this._scene1IntroPointer = (pointer) => this.onScene1IntroPointer(pointer);

    const boot = this.sys.settings.data;
    const startState = boot && typeof boot.startState === 'number' ? boot.startState : 1;
    this.enterState(startState);
  }

  /** Scene 1 开场三句台词：全屏点击推进；第 2 句时傍晚变暗；第 3 句点完后显示四地块。 */
  onScene1IntroPointer(pointer) {
    if (this.gameState !== 1 || !this.scene1IntroActive) return;

    const lines = [
      "…It's farther than I thought. And the light's fading already…",
      "If I keep going like this, I won't make it through the night.",
      'I need to stop here… just for now.',
    ];

    const advance = () => {
      this.scene1IntroStep += 1;

      if (this.scene1IntroStep === 1) {
        this.tweens.add({
          targets: this.eveningDimOverlay,
          alpha: 0.52,
          duration: 900,
          ease: 'Sine.easeInOut',
        });
      }

      if (this.scene1IntroStep < lines.length) {
        this.dialogText.setText(lines[this.scene1IntroStep]);
        return;
      }

      this.input.off('pointerdown', this._scene1IntroPointer);
      this.scene1IntroActive = false;
      this.dialogText.setText(lines[lines.length - 1]);
      this.buildScene1FourTerrains();
    };

    this.movePlayerThen(pointer.x, pointer.y, advance);
  }

  /** 2:1 等距：屏幕 x = 锚点 + (cartX - cartY)，y = 锚点 + (cartX + cartY) / 2 */
  cartesianToIso(cartX, cartY) {
    return {
      x: this.isoAnchorX + (cartX - cartY),
      y: this.isoAnchorY + (cartX + cartY) / 2,
    };
  }

  /**
   * 笛卡尔「地图格」上、以 (cartX,cartY) 为中心、半边长 size 的轴对齐正方形
   * → 屏幕上为四条边均倾斜的等距菱形（非轴对齐矩形）。占位与后续菱形贴图对齐用此口径。
   */
  getIsoTileCorners(cartX, cartY, size) {
    return {
      tl: this.cartesianToIso(cartX - size, cartY - size),
      tr: this.cartesianToIso(cartX + size, cartY - size),
      br: this.cartesianToIso(cartX + size, cartY + size),
      bl: this.cartesianToIso(cartX - size, cartY + size),
    };
  }

  /**
   * Scene 3 等距菱形地块 + 标签；合并包围盒矩形 + Zone(Rectangle.Contains)，避免 Graphics 直接交互偏移。
   * @param {{ cartX: number, cartY: number, size: number, color: number, label: string, onPointerDown: function }} opts
   */
  drawIsoHotspot(opts) {
    const { cartX, cartY, size, color, label, onPointerDown } = opts;

    const c = this.getIsoTileCorners(cartX, cartY, size);
    const tileXs = [c.tl.x, c.tr.x, c.br.x, c.bl.x];
    const tileYs = [c.tl.y, c.tr.y, c.br.y, c.bl.y];

    const g = this.add.graphics();
    this.pushStage(g);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(c.tl.x, c.tl.y);
    g.lineTo(c.tr.x, c.tr.y);
    g.lineTo(c.br.x, c.br.y);
    g.lineTo(c.bl.x, c.bl.y);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokePath();

    const center = this.cartesianToIso(cartX, cartY);
    const bottomY = Math.max(c.bl.y, c.br.y, c.tl.y, c.tr.y);
    const lbl = this.add
      .text(center.x, bottomY + 10, label, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        color: '#f0e6dc',
      })
      .setOrigin(0.5, 0)
      .setDepth(center.y + 21);
    this.pushStage(lbl);

    const tb = lbl.getBounds();
    const tr = tb.x + tb.width;
    const tbottom = tb.y + tb.height;
    const pad = 6;
    const minX = Math.min(tileXs[0], tileXs[1], tileXs[2], tileXs[3], tb.x) - pad;
    const minY = Math.min(tileYs[0], tileYs[1], tileYs[2], tileYs[3], tb.y) - pad;
    const maxX = Math.max(tileXs[0], tileXs[1], tileXs[2], tileXs[3], tr) + pad;
    const maxY = Math.max(tileYs[0], tileYs[1], tileYs[2], tileYs[3], tbottom) + pad;
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);

    g.setDepth(center.y + 20);

    const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
    zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, bw, bh), Phaser.Geom.Rectangle.Contains);
    zone.setDepth(center.y + 22);
    this.pushStage(zone);

    zone.on('pointerdown', (pointer) => {
      this.movePlayerThen(pointer.x, pointer.y, () => {
        onPointerDown(pointer);
      });
    });
    zone.on('pointerover', () => {
      this.input.setDefaultCursor('pointer');
      this.tweens.add({ targets: g, alpha: 0.78, duration: 100, ease: 'Sine.easeOut' });
    });
    zone.on('pointerout', () => {
      this.input.setDefaultCursor('default');
      this.tweens.add({ targets: g, alpha: 1, duration: 100, ease: 'Sine.easeOut' });
    });

    return { g, lbl, zone };
  }

  clearStageLayer() {
    this.stageObjects.forEach((o) => {
      if (o && o.destroy) o.destroy();
    });
    this.stageObjects = [];
  }

  /**
   * gameState 1–9 = Draft Scenes 1–9（营地线）。
   * Scene 9（Discovering the Herbs）为营地点击采集，结束后进入生火链起点 FIRE_NPC；
   * 深夜火把寻草（HerbHuntScene / Scene 7）仅在 Maintain 胜利后进入，勿与此混淆。
   */
  enterState(state) {
    if (state !== 1) {
      this.input.off('pointerdown', this._scene1IntroPointer);
      this.scene1IntroActive = false;
    }
    this.clearStageLayer();
    this.gameState = state;
    if (state === 1) {
      this.buildScene1IntroSequence();
    } else if (state === 2) {
      this.buildScene2NPCEncounter();
    } else if (state === 3) {
      this.buildScene3WaterDistance();
    } else if (state === 4) {
      this.buildScene4TerrainTriple();
    } else if (state === 5) {
      this.buildScene5WindExposure();
    } else if (state === 6) {
      this.buildScene6OverheadScan();
    } else if (state === 7) {
      this.buildScene7CompareCampsites();
    } else if (state === 8) {
      this.buildScene8FinalSafetyCheck();
    } else if (state === 9) {
      this.buildScene9HerbsDiscovery();
    }
    this.placePlayerForState(state);
  }

  pushStage(obj) {
    this.stageObjects.push(obj);
  }

  /** 与 Scene0 AR3ForestScene 一致：白色圆占位玩家（不放入 stageObjects，避免 clearStageLayer 销毁）。 */
  ensurePlayerDot() {
    if (this.playerDot && this.playerDot.active) return;
    const cam = this.cameras.main;
    this.playerDot = this.add
      .circle(cam.width / 2, cam.height * 0.72, 20, 0xffffff)
      .setDepth(4800);
  }

  movePlayerThen(x, y, onComplete) {
    this.ensurePlayerDot();
    this.tweens.killTweensOf(this.playerDot);
    const dist = Phaser.Math.Distance.Between(this.playerDot.x, this.playerDot.y, x, y);
    if (dist < 6) {
      if (onComplete) onComplete();
      return;
    }
    const dur = Phaser.Math.Clamp(220 + dist * 0.42, 280, 1000);
    this.tweens.add({
      targets: this.playerDot,
      x,
      y,
      duration: dur,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });
  }

  /** 进入各关时重置玩家站位（Scene 1 四地块阶段在 buildScene1FourTerrains 末尾再调一次）。 */
  placePlayerForState(state) {
    this.ensurePlayerDot();
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;
    let px = w * 0.35;
    let py = h * 0.68;
    if (state === 1) {
      px = w * 0.38;
      py = h * 0.72;
    } else if (state === 2) {
      px = w * 0.26;
      py = h * 0.58;
    } else if (state === 3 || state === 4 || state === 5 || state === 6) {
      px = this.isoAnchorX - 20;
      py = this.isoAnchorY + 105;
    } else if (state === 7) {
      px = this.isoAnchorX - 90;
      py = this.isoAnchorY + 95;
    } else if (state === 8) {
      const baseX = 230;
      const baseY = 168;
      const ctr = this.cartesianToIso(baseX, baseY);
      px = ctr.x;
      py = ctr.y + 28;
    } else if (state === 9) {
      px = w * 0.4;
      py = h * 0.735;
    }
    this.tweens.killTweensOf(this.playerDot);
    this.playerDot.setPosition(px, py);
  }

  /**
   * Scene 1：先仅对白 + 全屏点击；不显示地块。
   */
  buildScene1IntroSequence() {
    this.scene1IntroActive = true;
    this.scene1IntroStep = 0;
    this.eveningDimOverlay.setAlpha(0);
    this.dialogText.setText(
      "…It's farther than I thought. And the light's fading already…"
    );
    this.input.off('pointerdown', this._scene1IntroPointer);
    this.input.on('pointerdown', this._scene1IntroPointer);
  }

  /**
   * Scene 1：2×2 笛卡尔网格上的四块地貌；Graphics 画等距菱形，树地块叠加三角树冠。
   * 命中：与可见菱形一致的 Phaser.Geom.Polygon，Zone 取包围盒左上角 + origin(0,0)，多边形为相对该点的局部坐标（与 Phaser 命中检测一致）。
   */
  buildScene1FourTerrains() {
    const size = 60;
    const spots = [
      {
        id: 'flat',
        cartX: 0,
        cartY: 0,
        color: 0x3d8b4a,
        label: 'Flat Open Ground',
        line: 'Clear... but exposed.',
        slopeLift: 0,
        isTree: false,
      },
      {
        id: 'water',
        cartX: 160,
        cartY: 0,
        color: 0x2196f3,
        label: 'Near Water',
        line: "Ground's damp",
        slopeLift: 0,
        isTree: false,
      },
      {
        id: 'slope',
        cartX: 0,
        cartY: 160,
        color: 0x795548,
        label: 'Uneven Slope',
        line: 'Too steep',
        slopeLift: 20,
        isTree: false,
      },
      {
        id: 'tree',
        cartX: 160,
        cartY: 160,
        color: 0x8bc34a,
        label: 'Near Tree',
        line: 'Dense cover',
        slopeLift: 0,
        isTree: true,
      },
    ];

    spots.forEach((loc) => {
      const g = this.add.graphics();
      this.pushStage(g);

      const co = this.getIsoTileCorners(loc.cartX, loc.cartY, size);
      if (loc.slopeLift) {
        co.tl.y -= loc.slopeLift;
        co.tr.y -= loc.slopeLift;
      }

      g.fillStyle(loc.color, 1);
      g.beginPath();
      g.moveTo(co.tl.x, co.tl.y);
      g.lineTo(co.tr.x, co.tr.y);
      g.lineTo(co.br.x, co.br.y);
      g.lineTo(co.bl.x, co.bl.y);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xffffff, 0.45);
      g.strokePath();

      const center = this.cartesianToIso(loc.cartX, loc.cartY);
      if (loc.isTree) {
        g.fillStyle(0x1b5e20, 1);
        g.fillTriangle(center.x, center.y - 8, center.x - 22, center.y - 72, center.x + 22, center.y - 72);
      }

      g.setDepth(center.y);

      const lblY = Math.max(co.bl.y, co.br.y, co.tl.y, co.tr.y) + 12;
      const lbl = this.add
        .text(center.x, lblY, loc.label, {
          fontSize: '13px',
          color: '#f0e6dc',
        })
        .setOrigin(0.5, 0)
        .setDepth(center.y + 1);
      this.pushStage(lbl);

      const vx = [co.tl.x, co.tr.x, co.br.x, co.bl.x];
      const vy = [co.tl.y, co.tr.y, co.br.y, co.bl.y];
      const tb = lbl.getBounds();
      const minX = Math.min(vx[0], vx[1], vx[2], vx[3], tb.x);
      const minY = Math.min(vy[0], vy[1], vy[2], vy[3], tb.y);
      const maxX = Math.max(vx[0], vx[1], vx[2], vx[3], tb.x + tb.width);
      const maxY = Math.max(vy[0], vy[1], vy[2], vy[3], tb.y + tb.height);
      const bw = Math.max(maxX - minX, 1);
      const bh = Math.max(maxY - minY, 1);
      const hitPoly = new Phaser.Geom.Polygon([
        co.tl.x - minX,
        co.tl.y - minY,
        co.tr.x - minX,
        co.tr.y - minY,
        co.br.x - minX,
        co.br.y - minY,
        co.bl.x - minX,
        co.bl.y - minY,
      ]);
      const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
      zone.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
      zone.setDepth(center.y + 2);
      this.pushStage(zone);

      zone.on('pointerdown', (pointer) => {
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.dialogText.setText(loc.line);
          if (loc.id === 'slope') {
            this.tweens.add({
              targets: g,
              x: g.x - 6,
              duration: 45,
              yoyo: true,
              repeat: 5,
              onComplete: () => {
                g.x = 0;
              },
            });
          }
          if (loc.id === 'water') {
            this.cameras.main.shake(280, 0.008);
          }
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });

    const cam = this.cameras.main;
    const continueScene1 = this.add
      .text(cam.width / 2, cam.height - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });
    this.pushStage(continueScene1);
    continueScene1.on('pointerdown', () => this.enterState(2));
    continueScene1.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueScene1.on('pointerout', () => this.input.setDefaultCursor('default'));

    const tileStand = this.cartesianToIso(80, 80);
    this.ensurePlayerDot();
    this.tweens.killTweensOf(this.playerDot);
    this.playerDot.setPosition(tileStand.x, tileStand.y + 8);
  }

  /**
   * Draft Scene 2：路人旅行者；台词见 Scene Draft.md
   */
  buildScene2NPCEncounter() {
    const cam = this.cameras.main;
    const travelerPos = this.cartesianToIso(140, 60);
    const firePos = this.cartesianToIso(220, 100);

    const traveler = this.add.circle(travelerPos.x, travelerPos.y, 34, 0x888888);
    traveler.setStrokeStyle(2, 0x555555);
    traveler.setDepth(travelerPos.y);
    this.pushStage(traveler);

    const fire = this.add.circle(firePos.x, firePos.y, 9, 0xe02020);
    fire.setDepth(firePos.y + 1);
    this.pushStage(fire);
    this.tweens.add({
      targets: fire,
      alpha: 0.35,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const lines = [
      { t: 'Traveler: "What are you doing out here?"' },
      { t: 'You: "I am looking for some herbs."' },
      {
        t: 'Traveler: "Well that I can\'t help you. But I have to warn you, if you\'re staying out here for the night, don\'t just pick the first place you see, that\'s how you get into trouble."',
      },
      { t: 'You: "What should I look for?"' },
      { t: 'Traveler: "Ground, water, wind… and also what\'s above you."' },
    ];

    let idx = 0;
    this.dialogText.setText(lines[0].t);

    const nextBtn = this.add
      .text(cam.width / 2, cam.height - 128, 'Next', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });
    this.pushStage(nextBtn);

    const advance = () => {
      idx += 1;
      if (idx < lines.length) {
        this.dialogText.setText(lines[idx].t);
        if (idx === lines.length - 1) {
          nextBtn.setText('Continue');
        }
      } else {
        this.enterState(3);
      }
    };

    nextBtn.on('pointerdown', advance);
    nextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    nextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
  }

  /**
   * Draft Scene 3：河流（固定坐标菱形）+ 近岸 / 稍远上坡 两评估点；drawIsoHotspot 矩形热区。
   */
  buildScene3WaterDistance() {
    const cam = this.cameras.main;
    this.dialogText.setText('…Water would help… But how close is too close?');

    const riverCartX = 0;
    const riverCartY = -120;
    const riverSize = 100;
    const gRiver = this.add.graphics();
    this.pushStage(gRiver);
    const r = this.getIsoTileCorners(riverCartX, riverCartY, riverSize);
    gRiver.fillStyle(0x2a6b9e, 1);
    gRiver.beginPath();
    gRiver.moveTo(r.tl.x, r.tl.y);
    gRiver.lineTo(r.tr.x, r.tr.y);
    gRiver.lineTo(r.br.x, r.br.y);
    gRiver.lineTo(r.bl.x, r.bl.y);
    gRiver.closePath();
    gRiver.fillPath();
    gRiver.lineStyle(2, 0x90caf9, 0.45);
    gRiver.strokePath();
    const riverDepth = this.cartesianToIso(riverCartX, riverCartY).y;
    gRiver.setDepth(riverDepth);

    const continueBtn = this.add
      .text(cam.width / 2, cam.height - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(continueBtn);
    continueBtn.on('pointerdown', () => this.enterState(4));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    const spots = [
      {
        cartX: 20,
        cartY: 20,
        size: 40,
        color: 0x3d8b4a,
        label: 'Near the bank',
        line: '…Too close and the ground is damp… and if it rains, this could flood.',
        isGood: false,
      },
      {
        cartX: -100,
        cartY: -20,
        size: 40,
        color: 0x6b8f4a,
        label: 'Slightly farther uphill',
        line: '…Still close enough to reach.… Safer distance.',
        isGood: true,
      },
    ];

    spots.forEach((loc) => {
      this.drawIsoHotspot({
        cartX: loc.cartX,
        cartY: loc.cartY,
        size: loc.size,
        color: loc.color,
        label: loc.label,
        onPointerDown: () => {
          this.dialogText.setText(loc.line);
          if (!loc.isGood) {
            this.cameras.main.shake(220, 0.007);
          } else {
            continueBtn.setVisible(true);
          }
        },
      });
    });
  }

  /**
   * Draft Scene 4：洼地 / 缓坡 / 平坦略高 三地块。
   */
  buildScene4TerrainTriple() {
    const cam = this.cameras.main;
    this.dialogText.setText('These all look fine at first… But what happens if the weather changes?');

    const size = 56;
    const spots = [
      {
        id: 'dip',
        cartX: 30,
        cartY: 175,
        color: 0x3e2723,
        label: 'Low dip',
        line: '…Water will collect here. Cold air too.',
        slopeLift: 0,
        isGood: false,
      },
      {
        id: 'slope',
        cartX: 195,
        cartY: 175,
        color: 0x795548,
        label: 'Slight slope',
        line: "…Water will run off… But I won't rest well.",
        slopeLift: 16,
        isGood: false,
      },
      {
        id: 'flat',
        cartX: 360,
        cartY: 175,
        color: 0x558b2f,
        label: 'Flat, elevated',
        line: '…Dry and stable… this place will be better than the other if it rains.',
        slopeLift: 0,
        isGood: true,
      },
    ];

    const continueBtn = this.add
      .text(cam.width / 2, cam.height - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(continueBtn);
    continueBtn.on('pointerdown', () => this.enterState(5));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    spots.forEach((loc) => {
      const g = this.add.graphics();
      this.pushStage(g);

      const co = this.getIsoTileCorners(loc.cartX, loc.cartY, size);
      if (loc.slopeLift) {
        co.tl.y -= loc.slopeLift;
        co.tr.y -= loc.slopeLift;
      }

      g.fillStyle(loc.color, 1);
      g.beginPath();
      g.moveTo(co.tl.x, co.tl.y);
      g.lineTo(co.tr.x, co.tr.y);
      g.lineTo(co.br.x, co.br.y);
      g.lineTo(co.bl.x, co.bl.y);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xffffff, 0.45);
      g.strokePath();

      const center = this.cartesianToIso(loc.cartX, loc.cartY);
      g.setDepth(center.y + 20);

      const lblY = Math.max(co.bl.y, co.br.y) + 10;
      const lbl = this.add
        .text(center.x, lblY, loc.label, {
          fontSize: '12px',
          color: '#f0e6dc',
        })
        .setOrigin(0.5, 0)
        .setDepth(center.y + 21);
      this.pushStage(lbl);

      const vx = [co.tl.x, co.tr.x, co.br.x, co.bl.x];
      const vy = [co.tl.y, co.tr.y, co.br.y, co.bl.y];
      const tb = lbl.getBounds();
      const minX = Math.min(vx[0], vx[1], vx[2], vx[3], tb.x);
      const minY = Math.min(vy[0], vy[1], vy[2], vy[3], tb.y);
      const maxX = Math.max(vx[0], vx[1], vx[2], vx[3], tb.x + tb.width);
      const maxY = Math.max(vy[0], vy[1], vy[2], vy[3], tb.y + tb.height);
      const bw = Math.max(maxX - minX, 1);
      const bh = Math.max(maxY - minY, 1);
      const hitPoly = new Phaser.Geom.Polygon([
        co.tl.x - minX,
        co.tl.y - minY,
        co.tr.x - minX,
        co.tr.y - minY,
        co.br.x - minX,
        co.br.y - minY,
        co.bl.x - minX,
        co.bl.y - minY,
      ]);
      const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
      zone.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
      zone.setDepth(center.y + 22);
      this.pushStage(zone);

      zone.on('pointerdown', (pointer) => {
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.dialogText.setText(loc.line);
          if (!loc.isGood) {
            this.cameras.main.shake(200, 0.006);
          } else {
            continueBtn.setVisible(true);
          }
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });
  }

  /**
   * Draft Scene 5：开阔 vs 林下 — 两种权衡；点任一处后可 Continue。
   */
  buildScene5WindExposure() {
    const cam = this.cameras.main;
    this.dialogText.setText("…Wind's picking up… That will change things.");

    const size = 58;
    const spots = [
      {
        id: 'open',
        cartX: 120,
        cartY: 175,
        color: 0xa5d6a7,
        label: 'Open ground',
        line:
          '…Nothing to block the wind… Both starting fire and resting could be harder.',
        drawExtra: (g, center) => {
          g.lineStyle(2, 0xe0f2f1, 0.55);
          for (let i = -1; i <= 1; i++) {
            g.beginPath();
            g.moveTo(center.x - 38 + i * 14, center.y - 28);
            g.lineTo(center.x - 8 + i * 14, center.y - 48);
            g.strokePath();
          }
        },
      },
      {
        id: 'trees',
        cartX: 300,
        cartY: 175,
        color: 0x558b2f,
        label: 'Tree cover',
        line: '…Less wind… But not without risk.',
        drawExtra: (g, center) => {
          g.fillStyle(0x1b5e20, 1);
          g.fillTriangle(center.x, center.y - 6, center.x - 26, center.y - 78, center.x + 26, center.y - 78);
          g.fillStyle(0x33691e, 0.85);
          g.fillTriangle(center.x - 18, center.y - 18, center.x - 40, center.y - 62, center.x + 4, center.y - 58);
        },
      },
    ];

    const continueBtn = this.add
      .text(cam.width / 2, cam.height - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(continueBtn);
    continueBtn.on('pointerdown', () => this.enterState(6));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    spots.forEach((loc) => {
      const g = this.add.graphics();
      this.pushStage(g);

      const co = this.getIsoTileCorners(loc.cartX, loc.cartY, size);

      g.fillStyle(loc.color, 1);
      g.beginPath();
      g.moveTo(co.tl.x, co.tl.y);
      g.lineTo(co.tr.x, co.tr.y);
      g.lineTo(co.br.x, co.br.y);
      g.lineTo(co.bl.x, co.bl.y);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xffffff, 0.45);
      g.strokePath();

      const center = this.cartesianToIso(loc.cartX, loc.cartY);
      if (loc.drawExtra) loc.drawExtra(g, center);
      g.setDepth(center.y + 20);

      const lblY = Math.max(co.bl.y, co.br.y) + 10;
      const lbl = this.add
        .text(center.x, lblY, loc.label, {
          fontSize: '13px',
          color: '#f0e6dc',
        })
        .setOrigin(0.5, 0)
        .setDepth(center.y + 21);
      this.pushStage(lbl);

      const vx = [co.tl.x, co.tr.x, co.br.x, co.bl.x];
      const vy = [co.tl.y, co.tr.y, co.br.y, co.bl.y];
      const tb = lbl.getBounds();
      const minX = Math.min(vx[0], vx[1], vx[2], vx[3], tb.x);
      const minY = Math.min(vy[0], vy[1], vy[2], vy[3], tb.y);
      const maxX = Math.max(vx[0], vx[1], vx[2], vx[3], tb.x + tb.width);
      const maxY = Math.max(vy[0], vy[1], vy[2], vy[3], tb.y + tb.height);
      const bw = Math.max(maxX - minX, 1);
      const bh = Math.max(maxY - minY, 1);
      const hitPoly = new Phaser.Geom.Polygon([
        co.tl.x - minX,
        co.tl.y - minY,
        co.tr.x - minX,
        co.tr.y - minY,
        co.br.x - minX,
        co.br.y - minY,
        co.bl.x - minX,
        co.bl.y - minY,
      ]);
      const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
      zone.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
      zone.setDepth(center.y + 22);
      this.pushStage(zone);

      zone.on('pointerdown', (pointer) => {
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.dialogText.setText(loc.line);
          continueBtn.setVisible(true);
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });
  }

  /**
   * Draft Scene 6：枯枝 overhead vs 地面兽迹。
   */
  buildScene6OverheadScan() {
    const cam = this.cameras.main;
    this.dialogText.setText('I have to check not just the ground… but also look up… and around…');

    const size = 58;
    const spots = [
      {
        id: 'branches',
        cartX: 130,
        cartY: 175,
        color: 0x6d4c41,
        label: 'Dead branches overhead',
        line: '…Dead wood… If the wind gets stronger, this could fall.',
        drawExtra: (g, center) => {
          g.lineStyle(4, 0x4e342e, 0.95);
          g.beginPath();
          g.moveTo(center.x - 44, center.y - 88);
          g.lineTo(center.x - 8, center.y - 102);
          g.strokePath();
          g.beginPath();
          g.moveTo(center.x - 20, center.y - 92);
          g.lineTo(center.x + 28, center.y - 98);
          g.strokePath();
          g.beginPath();
          g.moveTo(center.x + 8, center.y - 84);
          g.lineTo(center.x + 48, center.y - 76);
          g.strokePath();
        },
      },
      {
        id: 'tracks',
        cartX: 290,
        cartY: 175,
        color: 0x7cb342,
        label: 'Animal tracks',
        line: '…Animals pass through here.',
        drawExtra: (g, center) => {
          g.fillStyle(0x3e2723, 0.75);
          g.fillEllipse(center.x - 22, center.y + 8, 14, 9);
          g.fillEllipse(center.x + 6, center.y + 18, 16, 10);
          g.fillEllipse(center.x + 28, center.y + 6, 13, 8);
        },
      },
    ];

    const continueBtn = this.add
      .text(cam.width / 2, cam.height - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(continueBtn);
    continueBtn.on('pointerdown', () => this.enterState(7));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    spots.forEach((loc) => {
      const g = this.add.graphics();
      this.pushStage(g);

      const co = this.getIsoTileCorners(loc.cartX, loc.cartY, size);

      g.fillStyle(loc.color, 1);
      g.beginPath();
      g.moveTo(co.tl.x, co.tl.y);
      g.lineTo(co.tr.x, co.tr.y);
      g.lineTo(co.br.x, co.br.y);
      g.lineTo(co.bl.x, co.bl.y);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xffffff, 0.45);
      g.strokePath();

      const center = this.cartesianToIso(loc.cartX, loc.cartY);
      if (loc.drawExtra) loc.drawExtra(g, center);
      g.setDepth(center.y + 20);

      const lblY = Math.max(co.bl.y, co.br.y) + 10;
      const lbl = this.add
        .text(center.x, lblY, loc.label, {
          fontSize: '12px',
          color: '#f0e6dc',
          align: 'center',
          wordWrap: { width: 200 },
        })
        .setOrigin(0.5, 0)
        .setDepth(center.y + 21);
      this.pushStage(lbl);

      const vx = [co.tl.x, co.tr.x, co.br.x, co.bl.x];
      const vy = [co.tl.y, co.tr.y, co.br.y, co.bl.y];
      const tb = lbl.getBounds();
      const minX = Math.min(vx[0], vx[1], vx[2], vx[3], tb.x);
      const minY = Math.min(vy[0], vy[1], vy[2], vy[3], tb.y);
      const maxX = Math.max(vx[0], vx[1], vx[2], vx[3], tb.x + tb.width);
      const maxY = Math.max(vy[0], vy[1], vy[2], vy[3], tb.y + tb.height);
      const bw = Math.max(maxX - minX, 1);
      const bh = Math.max(maxY - minY, 1);
      const hitPoly = new Phaser.Geom.Polygon([
        co.tl.x - minX,
        co.tl.y - minY,
        co.tr.x - minX,
        co.tr.y - minY,
        co.br.x - minX,
        co.br.y - minY,
        co.bl.x - minX,
        co.bl.y - minY,
      ]);
      const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
      zone.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
      zone.setDepth(center.y + 22);
      this.pushStage(zone);

      zone.on('pointerdown', (pointer) => {
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.dialogText.setText(loc.line);
          if (loc.id === 'branches') {
            this.cameras.main.shake(200, 0.006);
          }
          continueBtn.setVisible(true);
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });
  }

  /**
   * Draft Scene 7：Site A（近水、低洼、林密）vs Site B（远水、开阔、较平）。
   */
  buildScene7CompareCampsites() {
    const cam = this.cameras.main;
    this.dialogText.setText('…No place is perfect… I need to choose what matters more.');

    const size = 68;
    const sites = [
      {
        key: 'A',
        cartX: 95,
        cartY: 185,
        color: 0x2e7d32,
        title: 'Site A',
        blurb: 'Near water · Lower · Dense trees',
        drawExtra: (g, c) => {
          g.fillStyle(0x1565c0, 0.85);
          const wx = c.cartX - 55;
          const wy = c.cartY;
          const ws = 26;
          const wq = this.getIsoTileCorners(wx, wy, ws);
          g.beginPath();
          g.moveTo(wq.tl.x, wq.tl.y);
          g.lineTo(wq.tr.x, wq.tr.y);
          g.lineTo(wq.br.x, wq.br.y);
          g.lineTo(wq.bl.x, wq.bl.y);
          g.closePath();
          g.fillPath();
          g.fillStyle(0x1b5e20, 1);
          g.fillTriangle(c.cx, c.cy - 4, c.cx - 30, c.cy - 86, c.cx + 30, c.cy - 86);
          g.fillTriangle(c.cx - 14, c.cy - 12, c.cx - 44, c.cy - 72, c.cx + 8, c.cy - 68);
        },
      },
      {
        key: 'B',
        cartX: 315,
        cartY: 185,
        color: 0xc5e1a5,
        title: 'Site B',
        blurb: 'Farther from water · Flatter · More open',
        drawExtra: (g, c) => {
          g.fillStyle(0x42a5f5, 0.55);
          const ox = c.cartX - 95;
          const oy = c.cartY - 25;
          const ws = 18;
          const wq = this.getIsoTileCorners(ox, oy, ws);
          g.beginPath();
          g.moveTo(wq.tl.x, wq.tl.y);
          g.lineTo(wq.tr.x, wq.tr.y);
          g.lineTo(wq.br.x, wq.br.y);
          g.lineTo(wq.bl.x, wq.bl.y);
          g.closePath();
          g.fillPath();
        },
      },
    ];

    const continueBtn = this.add
      .text(cam.width / 2, cam.height - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(continueBtn);
    continueBtn.on('pointerdown', () => this.enterState(8));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    sites.forEach((loc) => {
      const g = this.add.graphics();
      this.pushStage(g);

      const co = this.getIsoTileCorners(loc.cartX, loc.cartY, size);

      g.fillStyle(loc.color, 1);
      g.beginPath();
      g.moveTo(co.tl.x, co.tl.y);
      g.lineTo(co.tr.x, co.tr.y);
      g.lineTo(co.br.x, co.br.y);
      g.lineTo(co.bl.x, co.bl.y);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokePath();

      const center = this.cartesianToIso(loc.cartX, loc.cartY);
      const cx = center.x;
      const cy = center.y;
      if (loc.drawExtra) loc.drawExtra(g, { cx, cy, cartX: loc.cartX, cartY: loc.cartY });
      g.setDepth(center.y + 20);

      const lblY = Math.max(co.bl.y, co.br.y) + 12;
      const lbl = this.add
        .text(center.x, lblY, `${loc.title}\n${loc.blurb}`, {
          fontSize: '12px',
          color: '#f5e6d3',
          align: 'center',
          lineSpacing: 4,
          wordWrap: { width: 220 },
        })
        .setOrigin(0.5, 0)
        .setDepth(center.y + 21);
      this.pushStage(lbl);

      const vx = [co.tl.x, co.tr.x, co.br.x, co.bl.x];
      const vy = [co.tl.y, co.tr.y, co.br.y, co.bl.y];
      const tb = lbl.getBounds();
      const minX = Math.min(vx[0], vx[1], vx[2], vx[3], tb.x);
      const minY = Math.min(vy[0], vy[1], vy[2], vy[3], tb.y);
      const maxX = Math.max(vx[0], vx[1], vx[2], vx[3], tb.x + tb.width);
      const maxY = Math.max(vy[0], vy[1], vy[2], vy[3], tb.y + tb.height);
      const bw = Math.max(maxX - minX, 1);
      const bh = Math.max(maxY - minY, 1);
      const hitPoly = new Phaser.Geom.Polygon([
        co.tl.x - minX,
        co.tl.y - minY,
        co.tr.x - minX,
        co.tr.y - minY,
        co.br.x - minX,
        co.br.y - minY,
        co.bl.x - minX,
        co.bl.y - minY,
      ]);
      const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
      zone.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
      zone.setDepth(center.y + 22);
      this.pushStage(zone);

      zone.on('pointerdown', (pointer) => {
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.campsiteChoice = loc.key;
          this.dialogText.setText(`…You choose Site ${loc.key}.`);
          continueBtn.setVisible(true);
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });
  }

  /**
   * Draft Scene 8：放大检视所选营地；点水面 / 地面 / 树冠(或开阔上方)；收尾对白；放置背包与帐篷。
   */
  buildScene8FinalSafetyCheck() {
    const cam = this.cameras.main;
    const choice = this.campsiteChoice === 'A' ? 'A' : 'B';
    this.scene8Hits = { water: false, ground: false, tree: false };

    const copy = {
      A: {
        water: '…Closer to water… that makes things easier now.',
        ground:
          '…But the ground is lower… if it rains, water could collect here. And the soil is damp… everything might stay wet through the night.',
        tree: '…And these trees… If the wind gets stronger, those branches could fall.',
        final: '…This place works… but only if nothing changes too much.',
      },
      B: {
        water: "…Farther from water… I'll have to walk for it.",
        ground:
          '…But the ground is higher… water should drain away if it rains… better for resting and for fire.',
        tree:
          "…Nothing above me… no risk from falling branches. …But I'm exposed… If the wind picks up, I'll feel it here.",
        final: '…Still… fewer things can go wrong if the weather turns.',
      },
    };
    const L = copy[choice];

    this.dialogText.setText('…One more look. What happens if things get worse tonight?');

    const baseX = 230;
    const baseY = 168;
    const size = 86;

    const g = this.add.graphics();
    this.pushStage(g);

    const mainC = this.getIsoTileCorners(baseX, baseY, size);
    const fillCol = choice === 'A' ? 0x33691e : 0xdcedc8;
    g.fillStyle(fillCol, 1);
    g.beginPath();
    g.moveTo(mainC.tl.x, mainC.tl.y);
    g.lineTo(mainC.tr.x, mainC.tr.y);
    g.lineTo(mainC.br.x, mainC.br.y);
    g.lineTo(mainC.bl.x, mainC.bl.y);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xfff8e7, 0.35);
    g.strokePath();

    const ctr = this.cartesianToIso(baseX, baseY);
    g.setDepth(ctr.y + 15);

    if (choice === 'A') {
      g.fillStyle(0x1565c0, 0.9);
      const wx = baseX - 72;
      const wy = baseY + 8;
      const wsz = 34;
      const wq = this.getIsoTileCorners(wx, wy, wsz);
      g.beginPath();
      g.moveTo(wq.tl.x, wq.tl.y);
      g.lineTo(wq.tr.x, wq.tr.y);
      g.lineTo(wq.br.x, wq.br.y);
      g.lineTo(wq.bl.x, wq.bl.y);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x1b5e20, 1);
      g.fillTriangle(ctr.x, ctr.y - 8, ctr.x - 36, ctr.y - 96, ctr.x + 36, ctr.y - 96);
    } else {
      g.fillStyle(0x64b5f6, 0.45);
      const wx = baseX - 105;
      const wy = baseY - 35;
      const wsz = 22;
      const wq = this.getIsoTileCorners(wx, wy, wsz);
      g.beginPath();
      g.moveTo(wq.tl.x, wq.tl.y);
      g.lineTo(wq.tr.x, wq.tr.y);
      g.lineTo(wq.br.x, wq.br.y);
      g.lineTo(wq.bl.x, wq.bl.y);
      g.closePath();
      g.fillPath();
    }

    this.scene8Phase = 'inspect';

    const midBtn = this.add
      .text(cam.width / 2, cam.height - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(midBtn);

    midBtn.on('pointerdown', () => {
      if (this.scene8Phase === 'final') {
        this.scene8Phase = 'epilogue';
        this.dialogText.setText(
          "…It's not perfect…\n…But it will have to do.\n…I just need to be ready for what comes."
        );
        midBtn.setText('Set up camp');
        return;
      }
      if (this.scene8Phase === 'epilogue') {
        this.scene8Phase = 'setup';
        this.dialogText.setText('You set the pack down and work the poles into the soil. The tent rises, tight and quiet.');
        midBtn.setText('Rest inside');
        return;
      }
      if (this.scene8Phase === 'setup') {
        this.enterState(9);
      }
    });
    midBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    midBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    const tryInspectDone = () => {
      if (!(this.scene8Hits.water && this.scene8Hits.ground && this.scene8Hits.tree)) return;
      this.scene8Phase = 'final';
      this.dialogText.setText(L.final);
      midBtn.setText('Continue');
      midBtn.setVisible(true);
    };

    const mkZone = (lx, ly, r, key) => {
      const p = this.cartesianToIso(lx, ly);
      const z = this.add.zone(p.x, p.y, 2, 2).setCircleDropZone(r);
      z.setDepth(ctr.y + 40);
      z.setInteractive();
      this.pushStage(z);
      z.on('pointerdown', (pointer) => {
        if (this.scene8Phase && this.scene8Phase !== 'inspect') return;
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.scene8Hits[key] = true;
          this.dialogText.setText(L[key]);
          tryInspectDone();
        });
      });
      z.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      z.on('pointerout', () => this.input.setDefaultCursor('default'));
    };

    if (choice === 'A') {
      mkZone(baseX - 58, baseY + 6, 40, 'water');
      mkZone(baseX, baseY, 44, 'ground');
      mkZone(baseX, baseY - 38, 36, 'tree');
    } else {
      mkZone(baseX - 88, baseY - 28, 32, 'water');
      mkZone(baseX, baseY, 44, 'ground');
      mkZone(baseX, baseY - 42, 38, 'tree');
    }

    const hint = this.add
      .text(ctr.x, ctr.y + 108, 'Tap water · ground · canopy / sky', {
        fontSize: '13px',
        color: '#d7ccc8',
      })
      .setOrigin(0.5)
      .setDepth(ctr.y + 25);
    this.pushStage(hint);
  }

  /**
   * Scene 9：Discovering the Herbs — 营地坐望 → 对白 → 走向灌木 → 采集（点击）。
   * 结束后进入 FirebuildingNpcScene（生火链），非 HerbHuntScene（火把寻草在 Maintain 之后）。
   */
  buildScene9HerbsDiscovery() {
    const cam = this.cameras.main;
    const w = cam.width;
    const h = cam.height;
    this.dialogText.setText('…That should hold for the night.');

    const sky = this.add
      .rectangle(w / 2, h * 0.32, w, h * 0.65, 0x0c1018, 1)
      .setDepth(38);
    this.pushStage(sky);
    const ground = this.add
      .rectangle(w / 2, h * 0.82, w, h * 0.38, 0x1a1510, 1)
      .setDepth(39);
    this.pushStage(ground);

    const tPeakX = w * 0.28;
    const tBaseY = h * 0.74;
    const tentG = this.add.graphics().setDepth(52);
    tentG.fillStyle(0x6d5344, 1);
    tentG.fillTriangle(tPeakX, tBaseY - 88, tPeakX - 58, tBaseY, tPeakX + 48, tBaseY);
    tentG.fillStyle(0x4a3b30, 0.95);
    tentG.fillTriangle(tPeakX + 6, tBaseY - 78, tPeakX + 44, tBaseY - 6, tPeakX + 52, tBaseY);
    tentG.lineStyle(2, 0x2e241c, 0.9);
    tentG.beginPath();
    tentG.moveTo(tPeakX - 58, tBaseY);
    tentG.lineTo(tPeakX + 48, tBaseY);
    tentG.strokePath();
    this.pushStage(tentG);

    const fireG = this.add.graphics().setDepth(53);
    fireG.fillStyle(0xff6f30, 0.9);
    fireG.fillCircle(tPeakX + 38, tBaseY - 12, 9);
    fireG.fillStyle(0xffcc66, 0.75);
    fireG.fillCircle(tPeakX + 38, tBaseY - 14, 4);
    this.pushStage(fireG);

    for (let i = 0; i < 18; i++) {
      const bx = Phaser.Math.Between(w * 0.34, w * 0.96);
      const by = Phaser.Math.Between(h * 0.14, h * 0.48);
      const gw = Phaser.Math.Between(44, 78);
      const gh = Phaser.Math.Between(26, 42);
      const g = this.add.graphics().setDepth(45 + (i % 4));
      g.fillStyle(0x153018, 0.95);
      g.fillEllipse(bx, by, gw, gh);
      g.fillStyle(0x2e6b32, 0.92);
      g.fillEllipse(bx - Phaser.Math.Between(8, 18), by - 10, gw * 0.55, gh * 0.65);
      this.pushStage(g);
    }

    const bushY = h * 0.4;
    const herbX = w * 0.62;
    const herbY = bushY + 36;
    const walkEndX = herbX - 52;
    const walkEndY = herbY + 44;

    this.ensurePlayerDot();
    this.playerDot.setDepth(54);

    const herbRoot = this.add.container(herbX, herbY).setDepth(200).setVisible(false);
    const herbGlow = this.add.graphics();
    herbGlow.fillStyle(0xc8e6c9, 0.35);
    herbGlow.fillEllipse(0, 0, 56, 40);
    const herbDraw = this.add.graphics();
    herbDraw.fillStyle(0x43a047, 1);
    herbDraw.fillEllipse(0, 4, 44, 26);
    herbDraw.fillStyle(0x2e7d32, 1);
    herbDraw.fillTriangle(-16, 10, -2, -30, 8, 10);
    herbDraw.fillTriangle(-2, 10, 10, -34, 22, 10);
    herbDraw.fillStyle(0xa5d6a7, 1);
    herbDraw.fillEllipse(6, -4, 24, 16);
    herbDraw.lineStyle(1, 0xe8f5e9, 0.9);
    herbDraw.strokeEllipse(6, -4, 24, 16);
    herbRoot.add([herbGlow, herbDraw]);
    herbRoot.setScale(0.85);
    this.pushStage(herbRoot);

    let phase = 'line0';

    const nextBtn = this.add
      .text(w / 2, h - 128, 'Next', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });
    this.pushStage(nextBtn);

    const collectBtn = this.add
      .text(w / 2, h - 128, 'Collect the herb', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#2e7d32',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(collectBtn);

    const runWalk = () => {
      phase = 'walking';
      nextBtn.disableInteractive();
      nextBtn.setVisible(false);
      this.dialogText.setText('(You get up and walk toward the bushes.)');
      this.tweens.add({
        targets: this.playerDot,
        x: walkEndX,
        y: walkEndY,
        duration: 1650,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          herbRoot.setVisible(true);
          herbRoot.setAlpha(0);
          herbRoot.setScale(0.75);
          this.tweens.add({
            targets: herbRoot,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 450,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              this.tweens.add({
                targets: herbRoot,
                scaleX: 1.04,
                scaleY: 1.04,
                duration: 220,
                yoyo: true,
                repeat: 1,
                ease: 'Sine.easeInOut',
              });
            },
          });
          this.dialogText.setText('…Wait… These match the ones in my notes…');
          phase = 'afterWalk';
          nextBtn.setVisible(true);
          nextBtn.setInteractive({ useHandCursor: true });
        },
      });
    };

    nextBtn.on('pointerdown', () => {
      if (phase === 'line0') {
        this.dialogText.setText('…Those leaves… That shape and color looks familiar…');
        phase = 'line1';
        return;
      }
      if (phase === 'line1') {
        runWalk();
        return;
      }
      if (phase === 'afterWalk') {
        this.dialogText.setText('…Same structure… same edges… This is it.');
        phase = 'beforeCollect';
        return;
      }
      if (phase === 'beforeCollect') {
        nextBtn.setVisible(false);
        collectBtn.setVisible(true);
        phase = 'collect';
      }
    });
    nextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    nextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    collectBtn.on('pointerdown', () => {
      if (phase !== 'collect') return;
      this.dialogText.setText(
        '…So they were here all along…\n…This time… I can save those people.'
      );
      collectBtn.disableInteractive();
      herbRoot.setVisible(false);
      this.time.delayedCall(2200, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
          this.scene.start(SCENE_KEYS.FIRE_NPC);
        });
      });
    });
    collectBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    collectBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
  }
}
// ---------- 兼容：旧 NpcScene 键并入 CampSelectScene 的 state 2（避免两套 NPC 剧本）----------
class NpcScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NpcScene' });
  }

  create() {
    this.scene.start(SCENE_KEYS.CAMP, { startState: 2 });
  }
}
// ---------- Scene 3：选择火堆位置 ----------
class FireSpotScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FireSpotScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#3a4a3a');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.add
      .text(GAME_WIDTH / 2, 36, 'A flat area... Where should you build the fire?', {
        fontSize: '19px',
        color: '#e8f0e8',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5);

    // 四个可点击区域：用半透明色块表示（无外部图片）
    const zones = [
      {
        key: 'branches',
        label: 'Under low branches',
        x: 180,
        y: 220,
        w: 150,
        h: 100,
        color: 0x5c4a3a,
        warn:
          "Warning: Dry branches overhead can catch sparks. Do not build under the canopy.",
      },
      {
        key: 'grass',
        label: 'Near dry grass',
        x: 470,
        y: 220,
        w: 150,
        h: 100,
        color: 0x6b8f4a,
        warn: 'Warning: Dry grass ignites fast and spreads flames. Move farther away.',
      },
      {
        key: 'backpack',
        label: 'Close to backpack',
        x: 180,
        y: 380,
        w: 150,
        h: 100,
        color: 0x7a6b5c,
        warn:
          'Warning: Gear and fuel belong out of the heat—trips, spills, and burns. Pick a safer spot.',
      },
      {
        key: 'open',
        label: 'Open, clear ground',
        x: 470,
        y: 380,
        w: 150,
        h: 100,
        color: 0x8a9e8a,
        warn: null, // 唯一正确
      },
    ];

    this.spotDialog = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, 'Tap an area to choose.', {
        fontSize: '16px',
        color: '#f0f5f0',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 50 },
      })
      .setOrigin(0.5);

    // 是否已通过“开阔平地”进入下一步（避免重复叠加结束文案）
    this.fireSpotResolved = false;
    const wrongRects = [];

    zones.forEach((z) => {
      const rect = this.add.rectangle(z.x + z.w / 2, z.y + z.h / 2, z.w, z.h, z.color, 0.85);
      rect.setStrokeStyle(2, 0xffffff, 0.4);
      rect.setInteractive({ useHandCursor: true });
      if (z.key !== 'open') wrongRects.push(rect);

      this.add
        .text(z.x + z.w / 2, z.y + z.h / 2, z.label, {
          fontSize: '13px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: z.w - 8 },
        })
        .setOrigin(0.5);

      rect.on('pointerdown', () => {
        // 已通过开阔平地则不再处理任何点击（含重复点正确区）
        if (this.fireSpotResolved) return;

        if (z.key !== 'open') {
          // 错误位置：显示剧本里的警告
          this.spotDialog.setText(z.warn);
          this.cameras.main.shake(250, 0.008);
        } else {
          // 只有开阔平地进入 Scene 4：淡出后准备火场
          this.fireSpotResolved = true;
          this.spotDialog.setText(
            'Open ground lets you clear fuel, ring the fire, and keep sparks from climbing into brush. You scrape a safe patch and get ready to build.'
          );
          // 选对后禁用三处危险区域，避免重复误触刷屏
          wrongRects.forEach((r) => r.disableInteractive());
          this.cameras.main.fadeOut(700, 0, 0, 0);
          this.time.delayedCall(700, () => {
            this.scene.start(SCENE_KEYS.FIRE_PREP);
          });
        }
      });
    });
  }
}
