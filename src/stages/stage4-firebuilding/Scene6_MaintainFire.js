/** 点火、吹气、添柴 — MaintainFireScene */
import { FireIso } from "../../utils/FireIso.js";
import { transitionScene, addSceneBackButton } from "../../utils/SceneNav.js";

export default class MaintainFireScene extends Phaser.Scene {
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
    addSceneBackButton(this);
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
        transitionScene(this, SCENE_KEYS.HERBS);
      });
    });
  }
}
