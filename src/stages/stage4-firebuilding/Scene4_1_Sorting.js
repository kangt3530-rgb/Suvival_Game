/** 背包排序 — SortingMaterialsScene */
import { transitionToConstructFromSortingComplete } from "../../utils/SceneNav.js";

export default class SortingMaterialsScene extends Phaser.Scene {
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
        .setDepth(ISO_GAMEPLAY_LABEL_DEPTH);
      this.add
        .text(z.x, z.y - 34, z.blurb, {
          fontSize: '11px',
          color: '#a89880',
          align: 'center',
          wordWrap: { width: z.w - 8 },
        })
        .setOrigin(0.5, 0)
        .setDepth(ISO_GAMEPLAY_LABEL_DEPTH);
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
      transitionToConstructFromSortingComplete(this);
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
