/**
 * Scene0_Background.js — 序章背景场景及全局工具函数
 * 必须在 MainConfig.js 之前加载。
 */

// ============================================================
// 全局辅助函数：createDialogBox(scene)
// 在场景底部创建半透明对话框 + typewriter 控制器
// 返回 { say, clear, bg, text, arrow }
// ============================================================
function createDialogBox(scene) {
  const boxH = 110;
  const boxW = GAME_WIDTH - 80;
  const boxX = GAME_WIDTH / 2;
  const boxY = GAME_HEIGHT - 20 - boxH / 2;

  // 半透明底色
  const bg = scene.add.rectangle(boxX, boxY, boxW, boxH, 0x000000, 0.62);
  bg.setStrokeStyle(1, 0x5c4033, 0.8);

  // 对话文字
  const txt = scene.add.text(
    boxX - boxW / 2 + 20,
    boxY - boxH / 2 + 16,
    '',
    {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#f5e6d3',
      wordWrap: { width: GAME_WIDTH - 120 },
      lineSpacing: 4,
    }
  );

  // 右下角闪烁 ▼ 提示符
  const arrow = scene.add
    .text(boxX + boxW / 2 - 28, boxY + boxH / 2 - 22, '▼', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#c4a882',
    })
    .setAlpha(0);

  // 闪烁 tween（始终运行，通过 alpha 初始值控制显隐）
  scene.tweens.add({
    targets: arrow,
    alpha: { from: 0, to: 1 },
    duration: 520,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // --- 内部状态 ---
  let _typingEvent = null;   // 当前 TimeEvent
  let _fullText    = '';     // 当前目标字符串
  let _charIndex   = 0;      // 已显示字符数

  function _finishNow() {
    if (_typingEvent) {
      _typingEvent.remove(false);
      _typingEvent = null;
    }
    txt.setText(_fullText);
    arrow.setAlpha(1);
  }

  // ---- 公开 API ----

  /**
   * say(text, onComplete?)
   * 如果上一条还在打字，立即完成它，再开始新文字。
   */
  function say(text, onComplete) {
    // 先结束正在进行的打字
    if (_typingEvent) {
      _finishNow();
    }

    _fullText  = text;
    _charIndex = 0;
    txt.setText('');
    arrow.setAlpha(0);

    _typingEvent = scene.time.addEvent({
      delay: 35,
      repeat: text.length - 1,
      callback: () => {
        _charIndex++;
        txt.setText(_fullText.slice(0, _charIndex));

        if (_charIndex >= _fullText.length) {
          _typingEvent = null;
          arrow.setAlpha(1);
          if (typeof onComplete === 'function') onComplete();
        }
      },
    });
  }

  /** clear() — 清空文字，隐藏 ▼ */
  function clear() {
    if (_typingEvent) {
      _typingEvent.remove(false);
      _typingEvent = null;
    }
    _fullText  = '';
    _charIndex = 0;
    txt.setText('');
    arrow.setAlpha(0);
  }

  return { say, clear, bg, text: txt, arrow };
}

// ============================================================
// 内部辅助：创建支持逐台词翻页的场景驱动器
// lines      — 台词数组
// dialog     — createDialogBox 返回的 controller
// scene      — 当前 Phaser.Scene
// onFinished — 全部台词走完后的回调
// ============================================================
function _runLines(lines, dialog, scene, onFinished) {
  let index = 0;
  let ready = false; // typewriter 完成、等待点击

  function showLine(i) {
    ready = false;
    dialog.say(lines[i], () => { ready = true; });
  }

  function advance() {
    if (!ready) {
      // 打字未完成：加速完成当前行
      dialog.say(dialog.text.text + '', () => { ready = true; });
      // 实际上 say() 会立刻 finishNow，直接标记
      ready = true;
      return;
    }
    index++;
    if (index < lines.length) {
      showLine(index);
    } else {
      // 全部台词结束
      scene.input.off('pointerdown', advance);
      onFinished();
    }
  }

  showLine(0);
  scene.input.on('pointerdown', advance);
}

// ============================================================
// BG1OutbreakScene
// ============================================================
class BG1OutbreakScene extends Phaser.Scene {
  constructor() { super({ key: 'BG1OutbreakScene' }); }

  create() {
    this.cameras.main.setBackgroundColor('#1a1008');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // 背景色块占位
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1008);

    const dialog = createDialogBox(this);

    const lines = [
      'March 5, 1898.',
      'Crimson Fever has claimed over a hundred lives this week.',
      'My clinic is overflowing. I watch neighbors fall… powerless to stop it.',
    ];

    _runLines(lines, dialog, this, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => {
        this.scene.start('BG2StruggleScene');
      });
    });
  }
}

// ============================================================
// BG2StruggleScene
// ============================================================
class BG2StruggleScene extends Phaser.Scene {
  constructor() { super({ key: 'BG2StruggleScene' }); }

  create() {
    this.cameras.main.setBackgroundColor('#0e1208');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0e1208);

    const dialog = createDialogBox(this);

    const lines = [
      'June 12, 1898.',
      "I've tried Mandrake, Silverleaf, Moonflower… none seem to work.",
      'Each failure weighs heavier. Yet I cannot give up.',
    ];

    _runLines(lines, dialog, this, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => {
        this.scene.start('BG3DiscoveryScene');
      });
    });
  }
}

// ============================================================
// BG3DiscoveryScene
// ============================================================
class BG3DiscoveryScene extends Phaser.Scene {
  constructor() { super({ key: 'BG3DiscoveryScene' }); }

  create() {
    this.cameras.main.setBackgroundColor('#0a1015');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a1015);

    const dialog = createDialogBox(this);

    const lines = [
      'October 3, 1900.',
      'Finally… I see it clearly. The cure is possible.',
      "The thought of saving lives gives me hope I haven't felt in years.",
    ];

    _runLines(lines, dialog, this, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => {
        this.scene.start('BG4TimeTravelScene');
      });
    });
  }
}

// ============================================================
// BG4TimeTravelScene
// ============================================================
class BG4TimeTravelScene extends Phaser.Scene {
  constructor() { super({ key: 'BG4TimeTravelScene' }); }

  create() {
    this.cameras.main.setBackgroundColor('#0a1015');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a1015);

    const dialog = createDialogBox(this);

    const lines = [
      'If only I had known this earlier…',
    ];

    _runLines(lines, dialog, this, () => {
      // 白光转场：顶层全屏白色矩形 alpha 0 → 1
      const flash = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff)
        .setAlpha(0)
        .setDepth(999);

      this.tweens.add({
        targets: flash,
        alpha: 1,
        duration: 800,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.time.delayedCall(300, () => {
            this.scene.start('AR1ArrivedScene');
          });
        },
      });
    });
  }
}

// ============================================================
// AR1ArrivedScene
// ============================================================
class AR1ArrivedScene extends Phaser.Scene {
  constructor() { super({ key: 'AR1ArrivedScene' }); }

  create() {
    this.cameras.main.setBackgroundColor('#c8a96e');
    this.cameras.main.fadeIn(800, 0, 0, 0);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xc8a96e);

    // 右上角倒计时占位
    this.add.text(GAME_WIDTH - 20, 20, 'Day 1 / 30', {
      fontSize: '14px',
      color: '#3d2817',
      backgroundColor: '#f5e6d3',
      padding: { x: 6, y: 6 },
    }).setOrigin(1, 0);

    const dialog = createDialogBox(this);

    const lines = [
      '...This place… this is the town… before it all began.',
      'I am back… Everyone is still alive…',
      'This means… I still have time to save them all.',
    ];

    _runLines(lines, dialog, this, () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => {
        this.scene.start('AR2BackpackScene');
      });
    });
  }
}

// ============================================================
// AR2BackpackScene
// ============================================================
class AR2BackpackScene extends Phaser.Scene {
  constructor() { super({ key: 'AR2BackpackScene' }); }

  create() {
    this.cameras.main.setBackgroundColor('#2a1f14');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2a1f14);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 20;

    // 背包色块
    const bag = this.add.rectangle(cx, cy, 180, 140, 0x5c4033);
    bag.setStrokeStyle(2, 0x3a2218);

    // 背包内容（初始隐藏）
    const notebook = this.add.rectangle(cx - 34, cy, 80, 60, 0xf5e6d3).setAlpha(0);
    notebook.setStrokeStyle(1, 0xc4a882);
    const gear = this.add.rectangle(cx + 38, cy, 60, 60, 0x888888).setAlpha(0);
    gear.setStrokeStyle(1, 0x555555);

    const dialog = createDialogBox(this);

    const lines = [
      'My bag… it came with me.',
      "I'm glad I wrote everything down.",
      'If I can gather the ingredients in time, I can stop Crimson Fever.',
    ];

    const openBag = () => {
      this.tweens.add({
        targets: bag,
        scaleY: 0,
        duration: 300,
        ease: 'Linear',
        onComplete: () => {
          bag.setFillStyle(0x8b6914);
          this.tweens.add({
            targets: bag,
            scaleY: 1,
            duration: 300,
            ease: 'Linear',
            onComplete: () => {
              notebook.setAlpha(1);
              gear.setAlpha(1);
            },
          });
        },
      });
    };

    let index = 0;
    let ready = false;

    const showLine = (i) => {
      ready = false;
      dialog.say(lines[i], () => {
        ready = true;
        if (i === 1) openBag();
      });
    };

    const advance = () => {
      if (!ready) { return; }
      index++;
      if (index < lines.length) {
        showLine(index);
      } else {
        this.input.off('pointerdown', advance);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          this.scene.start('AR3ForestScene');
        });
      }
    };

    showLine(0);
    this.input.on('pointerdown', advance);
  }
}

// ============================================================
// AR3ForestScene
// ============================================================
class AR3ForestScene extends Phaser.Scene {
  constructor() { super({ key: 'AR3ForestScene' }); }

  create() {
    this.cameras.main.setBackgroundColor('#1a2e1a');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a2e1a);

    // 右侧森林入口色块
    const forestX = GAME_WIDTH - 160;
    this.add.rectangle(forestX, GAME_HEIGHT / 2, 260, GAME_HEIGHT, 0x0d1f0d, 0.7);

    // 玩家占位圆
    const player = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 20, 0xffffff);

    const dialog = createDialogBox(this);

    const lines = [
      "The herbs… they won't be found in the village.",
      "I'll have to search the forest… and beyond.",
    ];

    _runLines(lines, dialog, this, () => {
      this.tweens.add({
        targets: player,
        x: forestX,
        duration: 1200,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.cameras.main.fadeOut(600, 0, 0, 0);
          this.time.delayedCall(600, () => {
            this.scene.start('CampSelectScene');
          });
        },
      });
    });
  }
}
