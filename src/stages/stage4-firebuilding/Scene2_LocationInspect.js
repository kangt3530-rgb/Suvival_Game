/** 四个生火位置安全性评估 — FireSpotInspectScene */
import { FireIso } from "../../utils/FireIso.js";
import { transitionScene, addSceneBackButton } from "../../utils/SceneNav.js";
import { TEXT_DIALOG_BODY, TEXT_BTN_PRIMARY, TEXT_HINT } from "../../utils/typography.js";

export default class FireSpotInspectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FireSpotInspectScene' });
  }

  create() {
    this.cameras.main.resetFX();
    this.cameras.main.setAlpha(1);
    this.cameras.main.fadeIn(450, 0, 0, 0);

    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    const cw = GAME_WIDTH;
    const ch = GAME_HEIGHT;
    this.add.rectangle(w / 2, h / 2, w, h, 0x0f0e0a, 1).setDepth(-400);
    this.isoC = FireIso.createConfig(w, h);
    FireIso.drawGround(this, this.isoC);

    const p0 = FireIso.cartesianToIso(this.isoC, -1.2, 0.6);
    this.playerDot = this.add.circle(p0.x, p0.y, 20, 0xffffff).setDepth(WORLD_PLAYER_MARKER_DEPTH);

    // boxH=150 flush bottom (center at ch-75, bottom at ch)
    this.dialogBg = this.add
      .rectangle(cw / 2, ch - 75, cw - 28, 150, 0x000000, 0.62)
      .setStrokeStyle(1, 0x5c4033, 0.8)
      .setDepth(5000);
    this.dialogText = this.add
      .text(cw / 2, ch - 75, '', {
        ...TEXT_DIALOG_BODY,
        align: 'center',
        wordWrap: { width: cw - 100 },
      })
      .setOrigin(0.5)
      .setDepth(5001);

    this.introStep = 0;
    this.zonesEnabled = false;

    const boot = this.sys.settings.data || {};
    const hasInspectResume = typeof boot.introStep === 'number';

    this.nextBtn = this.add
      .text(cw / 2, ch - 165, 'Next', TEXT_BTN_PRIMARY)
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });
    this.nextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    this.nextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
    this.nextBtn.on('pointerdown', () => this.advanceIntro());

    this.hintText = this.add
      .text(w / 2, 52, '', {
        ...TEXT_HINT,
        align: 'center',
        wordWrap: { width: w - 40 },
      })
      .setOrigin(0.5)
      .setDepth(1500)
      .setAlpha(0);

    this.continueBtn = this.add
      .text(cw / 2, ch - 165, 'Continue — prepare the fire site', {
        ...TEXT_BTN_PRIMARY,
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
        .setDepth(WORLD_UI_LABEL_DEPTH);

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
    if (hasInspectResume) {
      this.introStep = boot.introStep;
      this.zonesEnabled = !!boot.zonesEnabled;
      this.applyInspectResumeUi();
    } else {
      this.advanceIntro();
    }
    addSceneBackButton(this);
  }

  applyInspectResumeUi() {
    if (this.zonesEnabled) {
      this.dialogText.setText('Tap each area to inspect.');
      this.nextBtn.setVisible(false).disableInteractive();
      this.tweens.add({ targets: this.hintText, alpha: 1, duration: 200 });
      this.hintText.setText('Inspect: low branches · dry grass · near your gear · open ground');
      this.continueBtn.setAlpha(1);
      this.continueBtn.setInteractive({ useHandCursor: true });
      this.zonesEnabled = true;
      return;
    }
    if (this.introStep >= 2) {
      this.dialogText.setText(
        '…I need to think about where it will spread, not just where it starts.'
      );
      return;
    }
    if (this.introStep >= 1) {
      this.dialogText.setText('If I\'m building a fire here…');
    }
  }

  getResumePayload() {
    return { introStep: this.introStep, zonesEnabled: this.zonesEnabled };
  }

  tryConsumeInternalBack() {
    if (this.zonesEnabled) {
      this.zonesEnabled = false;
      this.introStep = 2;
      this.hintText.setAlpha(0);
      this.continueBtn.setAlpha(0).disableInteractive();
      this.nextBtn.setVisible(true).setInteractive({ useHandCursor: true });
      this.dialogText.setText(
        '…I need to think about where it will spread, not just where it starts.'
      );
      return true;
    }
    if (this.introStep > 1) {
      this.introStep -= 1;
      if (this.introStep === 1) {
        this.dialogText.setText('If I\'m building a fire here…');
      }
      return true;
    }
    return false;
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
        this.playerDot.setDepth(WORLD_PLAYER_MARKER_DEPTH);
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
      transitionScene(this, SCENE_KEYS.FIRE_PREP);
    });
  }
}
