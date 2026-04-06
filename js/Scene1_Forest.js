/**
 * Scene1_Forest.js — 游戏阶段：选址、NPC、火堆位置（Scene 1–3）
 * 内含：CampSelectScene, NpcScene, FireSpotScene
 */

// ---------- Scene 1：选择营地 ----------
class CampSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CampSelectScene' });
  }

  create() {
    // 深褐色黄昏背景
    this.cameras.main.setBackgroundColor('#3d2817');

    // 开场剧本：底部半透明对话框里显示
    const introLine = "…It's farther than I thought...";

    // 底部半透明黑色条（对话框背景）
    const dialogBg = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 55,
      GAME_WIDTH - 40,
      90,
      0x000000,
      0.55
    );
    dialogBg.setStrokeStyle(1, 0x5c4033, 0.8);

    // 对话框文字（会随交互更新）— 相对画布水平居中
    this.dialogText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 55, introLine, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        color: '#f5e6d3',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 80 },
      })
      .setOrigin(0.5);

    // 屏幕中央三个色块：坡地（褐）、水边（蓝）、平地（绿）
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 30;
    const gap = 140;

    // 褐色 — 坡地
    this.slopeBlock = this.add.rectangle(cx - gap, cy, 100, 100, 0x6b4423);
    this.slopeBlock.setStrokeStyle(2, 0x4a2f18);
    this.slopeBlock.setInteractive({ useHandCursor: true });

    // 蓝色 — 水边
    this.waterBlock = this.add.rectangle(cx, cy, 100, 100, 0x2a6b9e);
    this.waterBlock.setStrokeStyle(2, 0x1a4a6e);
    this.waterBlock.setInteractive({ useHandCursor: true });

    // 绿色 — 平地
    this.flatBlock = this.add.rectangle(cx + gap, cy, 100, 100, 0x3d8b4a);
    this.flatBlock.setStrokeStyle(2, 0x2a5c32);
    this.flatBlock.setInteractive({ useHandCursor: true });

    // 小标签，帮助辨认（非必须，教学用）
    this.add
      .text(cx - gap, cy + 70, 'Uneven Slope', {
        fontSize: '13px',
        color: '#d4a574',
        align: 'center',
        wordWrap: { width: 110 },
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 70, 'Near Water', {
        fontSize: '13px',
        color: '#8ec8ff',
        align: 'center',
        wordWrap: { width: 110 },
      })
      .setOrigin(0.5);
    this.add
      .text(cx + gap, cy + 70, 'Flat Open Ground', {
        fontSize: '12px',
        color: '#a8e6b0',
        align: 'center',
        wordWrap: { width: 120 },
      })
      .setOrigin(0.5);

    // “进入营地”按钮：初始隐藏，只有选对平地才显示
    this.enterBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 120, 'Enter camp', {
        fontSize: '20px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.enterBtn.on('pointerover', () => this.enterBtn.setStyle({ backgroundColor: '#7a5540' }));
    this.enterBtn.on('pointerout', () => this.enterBtn.setStyle({ backgroundColor: '#5c3d2e' }));

    // 平地“发光”用的 tween 引用，避免重复创建
    this.flatGlowTween = null;

    // --- 点击坡地：方块抖动 + 台词 ---
    this.slopeBlock.on('pointerdown', () => {
      this.dialogText.setText('Too steep');
      // 左右快速位移模拟抖动
      this.tweens.add({
        targets: this.slopeBlock,
        x: this.slopeBlock.x - 8,
        duration: 40,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          this.slopeBlock.x = cx - gap;
        },
      });
    });

    // --- 点击水边：屏幕晃动 + 台词 ---
    this.waterBlock.on('pointerdown', () => {
      this.dialogText.setText("Ground's damp");
      this.cameras.main.shake(400, 0.012);
    });

    // --- 点击平地：发光提示 + 台词 + 显示进入按钮 ---
    this.flatBlock.on('pointerdown', () => {
      this.dialogText.setText('I can rest here');
      // 发光：用描边加亮 + 轻微缩放脉冲
      this.flatBlock.setStrokeStyle(4, 0xffffaa, 1);
      if (this.flatGlowTween) this.flatGlowTween.stop();
      this.flatGlowTween = this.tweens.add({
        targets: this.flatBlock,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 350,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.enterBtn.setVisible(true);
    });

    // 点击进入营地：淡出后进入场景2
    this.enterBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => {
        this.scene.start(SCENE_KEYS.NPC);
      });
    });
  }
}
// ---------- Scene 2：遇到 NPC（旅行者 + 火堆） ----------
class NpcScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NpcScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#2a2520');
    // 从新场景进入时淡入
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // 灰色圆圈：旅行者
    const traveler = this.add.circle(GAME_WIDTH / 2 - 40, GAME_HEIGHT / 2, 36, 0x888888);
    traveler.setStrokeStyle(2, 0x555555);

    // 红色小点：火堆，闪烁（透明度循环）
    const fire = this.add.circle(GAME_WIDTH / 2 + 50, GAME_HEIGHT / 2, 10, 0xe02020);
    this.tweens.add({
      targets: fire,
      alpha: 0.35,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 底部剧本区：旅行者开场白
    this.npcDialog = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 110, "You're not from around here...", {
        fontSize: '16px',
        color: '#f5e6d3',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 60 },
      })
      .setOrigin(0.5);

    // 三个选项按钮（剧本分支）
    const btnStyle = {
      fontSize: '14px',
      color: '#fff',
      backgroundColor: '#4a3f35',
      padding: { x: 12, y: 8 },
      align: 'center',
      wordWrap: { width: 720 },
    };

    const btnY0 = GAME_HEIGHT - 240;
    const btn1 = this.add
      .text(GAME_WIDTH / 2, btnY0, "It's just a fire...", btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const btn2 = this.add
      .text(GAME_WIDTH / 2, btnY0 + 42, "Fire isn't the danger...", btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const btn3 = this.add
      .text(GAME_WIDTH / 2, btnY0 + 84, 'What should I be careful about?', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // 点击选项1：对应回复（英文台词）
    btn1.on('pointerdown', () => {
      this.npcDialog.setText(
        'Traveler: "Just a fire—until it is not. Respect it, or it will surprise you."'
      );
    });

    // 点击选项2：对应回复
    btn2.on('pointerdown', () => {
      this.npcDialog.setText(
        'Traveler: "True. The danger is what is around it—wind, tinder, and a moment of carelessness."'
      );
    });

    // 点击选项3：对应回复
    btn3.on('pointerdown', () => {
      this.npcDialog.setText(
        'Traveler: "Clear a wide space, mind the wind, keep fuel away, and never walk away from live embers."'
      );
    });

    // 进入下一幕：选择火堆位置
    const nextBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Continue — choose the fire site', {
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start(SCENE_KEYS.FIRE_SPOT);
      });
    });
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
