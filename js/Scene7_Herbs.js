/**
 * Scene7_Herbs.js — 游戏阶段：深夜寻药及后续（当前：Scene 7）
 * 内含：HerbHuntScene；后续新场景请追加于本文件。
 */

// ---------- Scene 7：The Herb Hunt（火把照明 / 镂空遮罩 + 药材收集） ----------
/**
 * 深夜森林：全屏黑色遮罩 + BlendModes.ERASE 圆形擦除 = 火把光柱。
 * 药材默认不可见（alpha=0），进入光照半径后显现；仅此时可点击（符合“只在照亮时可收集”）。
 */
class HerbHuntScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HerbHuntScene' });
  }

  create() {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#050807');

    // —— 随机 6–8 株植物：3 种目标药材 + 毒藤干扰 ——
    const totalPlants = Phaser.Math.Between(6, 8);
    const poisonCount = totalPlants - 3;
    const types = ['mandrake', 'silverleaf', 'moonflower'];
    for (let i = 0; i < poisonCount; i++) types.push('ivy');

    Phaser.Utils.Array.Shuffle(types);

    // 森林地面（与收集关类似的色块，整体偏暗以便衬托火把）
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

    this.add
      .text(GAME_WIDTH / 2, 22, 'The Herb Hunt', {
        fontSize: '20px',
        color: '#c8d4c0',
      })
      .setOrigin(0.5)
      .setDepth(100);

    // 底部对话框（全英文；必须在暗幕之上）
    this.herbDialog = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 58,
        'I took a burning stick from the fire. Three herbs — Mandrake, Silverleaf, Moonflower — hide in the dark.',
        {
          fontSize: '14px',
          color: '#e8e0d4',
          align: 'center',
          wordWrap: { width: GAME_WIDTH - 48 },
        }
      )
      .setOrigin(0.5)
      .setDepth(100);

    // 火把半径（误触毒藤会缩短，模拟亮度/体力损失）
    this.torchRadiusBase = 118;
    this.torchRadius = this.torchRadiusBase;
    this.torchRadiusMin = 62;

    // 植物对象列表（逻辑 + 显示）
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
      p.setDepth(10);
      p.setData('kind', kind);
      p.setData('collected', false);
      p.setData('wasLit', false);
      p.setAlpha(0);
      p.disableInteractive();
      p.on('pointerdown', () => this.onPlantPointerDown(p));
      this.plants.push(p);
    });

    // —— 使用 Graphics + ERASE：全屏黑幕，再“擦除”圆形区域，形成火把光洞（类似 RenderTexture 合成思路的轻量实现） ——
    this.darkOverlay = this.add.graphics().setDepth(85);

    // 鼠标火把：隐藏系统光标，用火点跟随（在暗幕之上，玩家始终看得见“火把尖”）
    this.input.setDefaultCursor('none');
    this.torchGlow = this.add
      .circle(-20, -20, 9, 0xffaa44, 0.85)
      .setStrokeStyle(2, 0xffdd88, 0.9)
      .setDepth(102)
      .setBlendMode(Phaser.BlendModes.ADD);

    // 简易“火把亮度”条（在暗幕之上）
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

    this.herbsFound = { mandrake: false, silverleaf: false, moonflower: false };
    this.completed = false;

    this.input.on('pointermove', (pointer) => {
      this.torchGlow.setPosition(pointer.x, pointer.y);
    });
  }

  /** 按类型生成占位几何体（曼德拉草=紫人形、银叶草=白光点、月亮花=黄月形、毒藤=红方块） */
  createPlantSprite(x, y, kind) {
    const container = this.add.container(x, y);
    if (kind === 'mandrake') {
      const body = this.add.rectangle(0, 2, 18, 22, 0x6b3d9e);
      body.setStrokeStyle(2, 0x3d2060);
      const head = this.add.circle(0, -12, 10, 0x8b5fbf);
      head.setStrokeStyle(1, 0x4a3080);
      const armL = this.add.rectangle(-14, 4, 8, 5, 0x5a3490);
      const armR = this.add.rectangle(14, 4, 8, 5, 0x5a3490);
      const legL = this.add.rectangle(-6, 18, 5, 10, 0x4a2880);
      const legR = this.add.rectangle(6, 18, 5, 10, 0x4a2880);
      container.add([legL, legR, body, armL, armR, head]);
      container.setSize(40, 44);
    } else if (kind === 'silverleaf') {
      const glow = this.add.circle(0, 0, 16, 0xffffff, 0.12);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      const leaf = this.add.ellipse(0, 0, 14, 22, 0xf0f8ff);
      leaf.setStrokeStyle(1, 0xffffff, 0.9);
      container.add([glow, leaf]);
      this.tweens.add({
        targets: glow,
        alpha: 0.22,
        scale: 1.15,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      container.setSize(28, 32);
    } else if (kind === 'moonflower') {
      const petal = this.add.circle(0, 0, 14, 0xffdd44);
      petal.setStrokeStyle(2, 0xffaa22);
      const shade = this.add.circle(4, -2, 10, 0x2a2218, 0.35);
      container.add([petal, shade]);
      container.setSize(30, 30);
    } else {
      const ivy = this.add.rectangle(0, 0, 26, 26, 0xb02020);
      ivy.setStrokeStyle(2, 0x601010);
      container.add(ivy);
      container.setSize(28, 28);
    }
    const hit = { mandrake: [40, 44], silverleaf: [32, 36], moonflower: [32, 32], ivy: [30, 30] };
    const [hw, hh] = hit[kind];
    container.setInteractive(
      new Phaser.Geom.Rectangle(-hw / 2, -hh / 2, hw, hh),
      Phaser.Geom.Rectangle.Contains
    );
    return container;
  }

  onPlantPointerDown(plant) {
    if (!plant || !plant.active || plant.getData('collected') || this.completed) return;
    if (!plant.getData('lit')) return;

    const kind = plant.getData('kind');
    if (kind === 'ivy') {
      this.herbDialog.setText("Ouch! That's toxic. I should be more careful.");
      this.cameras.main.flash(200, 180, 40, 40, false, undefined, 0.45);
      this.cameras.main.shake(220, 0.006);
      this.torchRadius = Math.max(this.torchRadiusMin, this.torchRadius - 14);
      return;
    }

    if (this.herbsFound[kind]) return;
    this.herbsFound[kind] = true;
    plant.setData('collected', true);
    plant.disableInteractive();
    this.tweens.add({
      targets: plant,
      alpha: 0,
      scale: 0.3,
      duration: 280,
      ease: 'Cubic.easeIn',
      onComplete: () => plant.destroy(),
    });

    this.herbDialog.setText('Found it! One step closer to the cure.');

    const done =
      this.herbsFound.mandrake && this.herbsFound.silverleaf && this.herbsFound.moonflower;
    if (done) {
      this.completed = true;
      this.time.delayedCall(500, () => this.showHerbHuntComplete());
    }
  }

  showHerbHuntComplete() {
    this.herbDialog.setText(
      'I have what I need for now. Time to head back before the fire dies.'
    );
    const cx = GAME_WIDTH / 2;
    const banner = this.add
      .text(cx, GAME_HEIGHT / 2 - 40, 'Herbs gathered.\nThe cure can wait for dawn.', {
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
  }

  update() {
    if (this.completed) return;
    const p = this.input.activePointer;
    const px = p.x;
    const py = p.y;

    // 更新亮度条（随火把半径相对基础值变化）
    if (this.torchBarFill) {
      const t = Phaser.Math.Clamp(this.torchRadius / this.torchRadiusBase, 0, 1);
      this.torchBarFill.width = Math.max(2, 118 * t);
    }

    // 植物：仅在光圈内显现并可点（状态变化时才改 interactive，避免每帧重复注册）
    this.plants.forEach((plant) => {
      if (!plant || !plant.active || plant.getData('collected')) return;
      const d = Phaser.Math.Distance.Between(px, py, plant.x, plant.y);
      const lit = d <= this.torchRadius;
      plant.setData('lit', lit);
      plant.setAlpha(lit ? 1 : 0);
      if (lit !== plant.getData('wasLit')) {
        plant.setData('wasLit', lit);
        if (lit) plant.setInteractive({ useHandCursor: true });
        else plant.disableInteractive();
      }
    });

    // 重绘暗幕 + 光洞（ERASE 擦除黑色，露出下层森林）
    const g = this.darkOverlay;
    g.clear();
    g.fillStyle(0x000000, 0.97);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.setBlendMode(Phaser.BlendModes.ERASE);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(px, py, this.torchRadius);
    g.setBlendMode(Phaser.BlendModes.NORMAL);
  }
}

/* ========== 后续场景（占位，按阶段扩展）==========
 * 例：返回营地、制药、回镇 — 新增 class X extends Phaser.Scene 于此处
 */
