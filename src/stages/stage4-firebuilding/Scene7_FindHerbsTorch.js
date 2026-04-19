/** 火把照明寻药 — HerbHuntScene */
import { goToTitleScene, addSceneBackButton } from "../../utils/SceneNav.js";

export default class HerbHuntScene extends Phaser.Scene {
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
      .setDepth(ISO_GAMEPLAY_LABEL_DEPTH);
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
      .setDepth(ISO_GAMEPLAY_LABEL_DEPTH);
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
      .setDepth(ISO_GAMEPLAY_LABEL_DEPTH);

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
    addSceneBackButton(this);
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
        goToTitleScene(this);
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
