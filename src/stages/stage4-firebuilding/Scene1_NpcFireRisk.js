/** 旅行者介绍生火风险 — FirebuildingNpcScene */
import { FireIso } from "../../utils/FireIso.js";
import { transitionScene, addSceneBackButton } from "../../utils/SceneNav.js";
import { FIREBUILDING_HERB_NAME } from "./fireConstants.js";

export default class FirebuildingNpcScene extends Phaser.Scene {
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
    const npcBoot = this.sys.settings.data || {};
    const herb = FIREBUILDING_HERB_NAME;
    if (npcBoot.animPlayed) {
      this.step = 0;
      this.advanceDialog();
    } else if (
      npcBoot.npcStep === 3 &&
      (npcBoot.npcChoice === 'a' || npcBoot.npcChoice === 'b')
    ) {
      this.step = 3;
      this._npcChoice = npcBoot.npcChoice;
      if (npcBoot.npcChoice === 'a') {
        this.dialogText.setText('Traveler: "Fire isn\'t the danger… where you put it is."');
      } else {
        this.dialogText.setText(
          'Traveler: "Wind, ground, what\'s around you… that decides everything."'
        );
      }
      this.nextBtn.off('pointerdown');
      this.nextBtn.on('pointerdown', () => this.advanceDialog());
    } else if (npcBoot.npcStep === 4) {
      this.step = 4;
      this.dialogText.setText(
        `(You): "Also… I need to ask — do you know where to find ${herb}?"\n\nTraveler: "Ah… ${herb}? They grow around here, but you\'ll want to watch for them in the dark." "They have a way of standing out under the light of a fire."`
      );
      this.nextBtn.off('pointerdown');
      this.nextBtn.on('pointerdown', () => this.advanceDialog());
    } else if (
      typeof npcBoot.npcStep === 'number' &&
      npcBoot.npcStep >= 1 &&
      npcBoot.npcStep <= 2
    ) {
      this.step = npcBoot.npcStep;
      this.animPlayed = false;
      if (npcBoot.npcStep === 1) {
        this.dialogText.setText('Traveler: "You\'re not from around here, are you?"');
      } else {
        this.dialogText.setText(
          'Traveler: "If you\'re staying the night, don\'t rush your fire. Most people get that part wrong."'
        );
      }
      this.nextBtn.off('pointerdown');
      this.nextBtn.on('pointerdown', () => this.advanceDialog());
    } else {
      this.step = 0;
      this.advanceDialog();
    }
    addSceneBackButton(this);
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
      this._npcChoice = which;
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
      transitionScene(this, SCENE_KEYS.FIRE_SPOT_INSPECT);
    });
  }

  getResumePayload() {
    return {
      npcStep: this.step,
      animPlayed: !!this.animPlayed,
      npcChoice: this._npcChoice === 'a' || this._npcChoice === 'b' ? this._npcChoice : undefined,
    };
  }
}
