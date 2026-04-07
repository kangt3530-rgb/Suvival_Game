/**
 * Scene4_Fire.js — 游戏阶段：生火教学全流程（Scene 4–6）
 * 内含：FireSitePrepScene, CollectMaterialsScene, SortingMaterialsScene,
 *      ConstructFireScene, MaintainFireScene
 */

// ---------- Scene 4：Preparing the Fire Site — Isometric 等距营地 ----------
class FireSitePrepScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FireSitePrepScene' });
  }

  /**
   * 逻辑平面 (gx, gy) → 屏幕等距坐标
   * x_screen = (gx - gy) * cos(30°) * isoScale + offset_x
   * y_screen = (gx + gy) * sin(30°) * isoScale + offset_y
   */
  cartesianToIso(gx, gy) {
    let ggx = Number(gx);
    let ggy = Number(gy);
    if (!Number.isFinite(ggx)) ggx = 0;
    if (!Number.isFinite(ggy)) ggy = 0;
    const k = this.isoScale * this.isoCos;
    const m = this.isoScale * this.isoSin;
    const x = this.isoAnchorX + (ggx - ggy) * k;
    const y = this.isoAnchorY + (ggx + ggy) * m;
    return {
      x: Number.isFinite(x) ? x : this.isoAnchorX,
      y: Number.isFinite(y) ? y : this.isoAnchorY,
    };
  }

  /** 屏幕坐标 → 逻辑格（逆变换；与 cartesianToIso 互逆） */
  isoToCartesian(sx, sy) {
    let sx_ = Number(sx);
    let sy_ = Number(sy);
    if (!Number.isFinite(sx_)) sx_ = this.isoAnchorX;
    if (!Number.isFinite(sy_)) sy_ = this.isoAnchorY;
    const k = this.isoScale * this.isoCos;
    const m = this.isoScale * this.isoSin;
    const rx = (sx_ - this.isoAnchorX) / k;
    const ry = (sy_ - this.isoAnchorY) / m;
    const outX = (rx + ry) / 2;
    const outY = (ry - rx) / 2;
    return {
      x: Number.isFinite(outX) ? outX : 0,
      y: Number.isFinite(outY) ? outY : 0,
    };
  }

  /** 深度排序：depth = 屏幕 y，保证下方物体遮挡上方（立体感） */
  setDepthFromY(go) {
    if (go && typeof go.setDepth === 'function') {
      go.setDepth(go.y);
    }
  }

  /** 等距菱形草地 + 斜向网格线（最底层） */
  drawIsoGround() {
    const g = this.add.graphics().setDepth(-100);
    const ox = this.isoAnchorX;
    const oy = this.isoAnchorY + 85;
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
      const a = this.cartesianToIso(i, -9);
      const b = this.cartesianToIso(i, 9);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
    for (let j = -9; j <= 9; j++) {
      const a = this.cartesianToIso(-9, j);
      const b = this.cartesianToIso(9, j);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokePath();
    }
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
    root.setDepth(screenY);
    return root;
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

    const cfg = this.sys.game.config;
    const gw = Number(cfg.width) || (typeof GAME_WIDTH !== 'undefined' ? GAME_WIDTH : 800);
    const gh = Number(cfg.height) || (typeof GAME_HEIGHT !== 'undefined' ? GAME_HEIGHT : 600);
    this.isoAnchorX = gw / 2;
    this.isoAnchorY = gh / 4;
    this.isoScale = 26;
    this.isoCos = Math.cos(Math.PI / 6);
    this.isoSin = Math.sin(Math.PI / 6);

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

    const firePos = this.cartesianToIso(0, 0);
    this.drawFireGlowElliptical(firePos.x, firePos.y);

    this.add
      .ellipse(firePos.x, firePos.y, 62, 32, 0x2a1810, 1)
      .setStrokeStyle(2, 0x140c08, 1)
      .setDepth(firePos.y);
    this.addProceduralFireAt(firePos.x, firePos.y);

    const pPos = this.cartesianToIso(-1.25, 0.35);
    const playerRoot = this.add.container(pPos.x, pPos.y);
    const footY = 6;
    const shadow = this.add.ellipse(0, footY + 2, 48, 17, 0x000000, 0.38).setOrigin(0.5, 0.5);
    const body = this.add.circle(0, -10, 20, 0x3a7ec8);
    body.setStrokeStyle(2, 0x1a5088, 1);
    const bodyShade = this.add.circle(5, -6, 12, 0x1a5088, 0.45);
    const head = this.add.circle(0, -44, 15, 0x6ab8f0);
    head.setStrokeStyle(2, 0x2a6090, 1);
    const headShade = this.add.circle(4, -41, 8, 0x2a6090, 0.4);
    const hi = this.add.circle(-11, -48, 5, 0xffffff, 0.3);
    playerRoot.add([shadow, body, bodyShade, head, headShade, hi]);
    playerRoot.setDepth(pPos.y);

    const treeGrids = [
      [-3.2, -2.1],
      [3.2, -2],
      [-4, 1.2],
      [3.8, 1],
      [-4.6, 0.2],
      [4.5, 0.1],
      [0.2, -3.6],
    ];
    treeGrids.forEach(([gx, gy]) => {
      const tp = this.cartesianToIso(gx, gy);
      this.addIsoPineTreeAt(tp.x, tp.y);
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
      const sp = this.cartesianToIso(gx * 1.75, gy * 1.75);
      this.addDashedGhostEllipse(sp.x, sp.y, 26, 13);
      this.rockSlots.push({ x: sp.x, y: sp.y, filled: false, index: i });
    });

    const cx = gw / 2;
    this.add
      .text(cx, 22, 'Preparing the Fire Site', {
        fontSize: '20px',
        color: '#e8dcc8',
      })
      .setOrigin(0.5)
      .setDepth(1000);
    this.add
      .text(cx, 46, 'Clear all dry fuel first. Then place each rock on a ghost ring.', {
        fontSize: '13px',
        color: '#b8a090',
        align: 'center',
        wordWrap: { width: gw - 40 },
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.prepDialog = this.add
      .text(cx, gh - 62, 'Move leaves and twigs off the bare soil.', {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        wordWrap: { width: gw - 48 },
      })
      .setOrigin(0.5)
      .setDepth(1000);

    const debrisTotal = Phaser.Math.Between(10, 15);
    this.debrisRemaining = debrisTotal;
    this.slotsFilled = 0;
    this.prepComplete = false;

    const debrisPieces = [];
    let safety = 0;
    while (debrisPieces.length < debrisTotal && safety < 80) {
      safety += 1;
      const gx = Phaser.Math.FloatBetween(-2.8, 2.8);
      const gy = Phaser.Math.FloatBetween(-1.8, 2.6);
      if (Math.hypot(gx, gy) < 1.1) continue;
      const pos = this.cartesianToIso(gx, gy);
      const piece = this.add.rectangle(
        pos.x,
        pos.y,
        Phaser.Math.Between(9, 15),
        Phaser.Math.Between(5, 10),
        0x5c3d2a
      );
      piece.setStrokeStyle(1, 0x3d2815, 0.9);
      piece.rotation = Phaser.Math.FloatBetween(-0.55, 0.55);
      piece.setData('type', 'debris');
      this.setDepthFromY(piece);
      piece.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(piece);
      debrisPieces.push(piece);
    }

    const rockHomeGrids = [
      [-4.8, -1.1],
      [4.8, -1.1],
      [-4.6, 2.4],
      [4.6, 2.4],
      [0, -3.4],
      [0, 3.5],
    ];
    rockHomeGrids.forEach(([gx, gy], idx) => {
      const pos = this.cartesianToIso(gx, gy);
      const rock = this.createHexRock(pos.x, pos.y, 21);
      rock.setData('type', 'rock');
      rock.setData('placed', false);
      rock.setData('slotIndex', null);
      rock.setData('rockId', idx);
      this.setDepthFromY(rock);
      this.input.setDraggable(rock);
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('placed')) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
      this.setDepthFromY(gameObject);
    });

    const fadeOutDebris = (piece) => {
      if (!piece || !piece.active || piece.getData('gone')) return;
      piece.setData('gone', true);
      this.input.setDraggable(piece, false);
      piece.disableInteractive();
      this.tweens.add({
        targets: piece,
        alpha: 0,
        scaleX: 0.82,
        scaleY: 0.82,
        duration: 260,
        ease: 'Sine.easeIn',
        onComplete: () => {
          if (piece && piece.scene) piece.destroy();
          this.debrisRemaining -= 1;
          this.prepDialog.setText('Too dry... this would catch immediately.');
          this.updateNextButtonState();
          this.checkPrepComplete();
        },
      });
    };

    this.input.on('dragend', (pointer, gameObject) => {
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('type') === 'debris') {
        fadeOutDebris(gameObject);
        return;
      }
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
            this.setDepthFromY(gameObject);
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

        this.prepDialog.setText('This should keep it contained...');
        this.updateNextButtonState();
        this.checkPrepComplete();
      }
    });

    debrisPieces.forEach((piece) => {
      piece.on('pointerup', () => fadeOutDebris(piece));
    });

    this.nextMaterialsBtn = this.add
      .text(cx, gh - 120, 'Next: Collect Materials', {
        fontSize: '18px',
        color: '#fff8e7',
        backgroundColor: '#4a6b3a',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setAlpha(0.38)
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

    this.updateNextButtonState();
  }

  updateNextButtonState() {
    if (!this.nextMaterialsBtn || this.prepComplete) return;
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
        "...That should do it. Now it won't spread beyond where I intend."
      );
      this.nextMaterialsBtn.setAlpha(1);
      this.nextMaterialsBtn.setInteractive({ useHandCursor: true });
    }
  }
}
// ---------- Scene 4-A：Collecting Materials（森林地面收集） ----------
class CollectMaterialsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CollectMaterialsScene' });
  }

  preload() {
    // 加载背包图片
    this.load.image('backpack', 'assets/backpack.png');
  }

  /** 根据类型生成不同几何外观（色块代替贴图） */
  addGroundItem(x, y, itemType, id) {
    let g = null;
    if (itemType === 'tinder') {
      g = this.add.rectangle(x, y, 14, 14, 0xf4d03f);
      g.setStrokeStyle(1, 0xc9a227, 1);
    } else if (itemType === 'kindling') {
      g = this.add.rectangle(x, y, 30, 7, 0x6b4423);
      g.setStrokeStyle(1, 0x3d2815, 1);
    } else if (itemType === 'fuel') {
      g = this.add.rectangle(x, y, 44, 18, 0x5c3d2a);
      g.setStrokeStyle(2, 0x3a2618, 1);
    } else if (itemType === 'wet') {
      g = this.add.rectangle(x, y, 18, 18, 0x1e3a5f);
      g.setStrokeStyle(1, 0x0f1f35, 1);
    }
    g.setData('itemType', itemType);
    g.setData('itemId', id);
    g.setDepth(5);
    g.setInteractive({ useHandCursor: true });
    return g;
  }

  /** 生成 12 个类型，保证至少 8 个非湿木 */
  generate12Types() {
    const types = [];
    for (let i = 0; i < 12; i++) {
      const r = Math.random();
      if (r < 0.22) types.push('wet');
      else if (r < 0.45) types.push('tinder');
      else if (r < 0.72) types.push('kindling');
      else types.push('fuel');
    }
    while (types.filter((t) => t !== 'wet').length < 8) {
      const j = types.indexOf('wet');
      if (j === -1) break;
      const rep = ['tinder', 'kindling', 'fuel'][Phaser.Math.Between(0, 2)];
      types[j] = rep;
    }
    return types;
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.input.off('drag');
    this.input.off('dragend');

    // 森林地面：深浅交错的土壤与苔藓色块
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2f3828, 1).setDepth(0);
    for (let i = 0; i < 18; i++) {
      const px = Phaser.Math.Between(40, GAME_WIDTH - 40);
      const py = Phaser.Math.Between(80, GAME_HEIGHT - 100);
      const s = Phaser.Math.Between(28, 70);
      this.add.rectangle(px, py, s, s * 0.55, 0x3a4a32, 0.35).setDepth(1).setRotation(Phaser.Math.FloatBetween(-0.3, 0.3));
    }

    this.add
      .text(GAME_WIDTH / 2, 26, 'Collecting Materials', {
        fontSize: '22px',
        color: '#e8f0e0',
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.add
      .text(GAME_WIDTH / 2, 52, 'Collect materials, then click the backpack to sort.', {
        fontSize: '13px',
        color: '#b8c4ae',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.collectDialog = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 58, 'Temporary stash: 0 / 8 valid pieces.', {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 44 },
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.validInventory = [];
    this.validCount = 0;
    this.groundItems = [];
    const types = this.generate12Types();

    const positions = Phaser.Utils.Array.Shuffle(
      Array.from({ length: 12 }, (_, i) => ({
        x: 120 + (i % 4) * 190 + Phaser.Math.Between(-25, 25),
        y: 150 + Math.floor(i / 4) * 120 + Phaser.Math.Between(-18, 18),
      }))
    );

    types.forEach((t, idx) => {
      const pos = positions[idx];
      const item = this.addGroundItem(pos.x, pos.y, t, idx);
      this.groundItems.push(item);
      item.on('pointerdown', () => {
        if (!item.active || item.getData('taken')) return;
        item.setData('taken', true);
        item.disableInteractive();

        if (t === 'wet') {
          this.collectDialog.setText(
            '...Too damp. This will smoke more than it burns.'
          );
          this.tweens.add({
            targets: item,
            alpha: 0,
            scaleX: 0.7,
            scaleY: 0.7,
            duration: 200,
            onComplete: () => item.destroy(),
          });
          return;
        }

        this.validInventory.push({ type: t, id: `v-${this.validCount}-${idx}` });
        this.validCount += 1;
        this.collectDialog.setText(`Temporary stash: ${this.validCount} / 8 valid pieces.`);
        this.tweens.add({
          targets: item,
          alpha: 0,
          scaleX: 0.6,
          scaleY: 0.6,
          duration: 180,
          onComplete: () => item.destroy(),
        });

        if (this.validCount >= 8) {
          this.freezeRemainingGroundItems();
          this.showOpenBackpackButton();
        }
      });
    });

    this.openPackBtn = null;
  }

  /** 收满 8 件有效物后，禁止继续点击地面剩余物件 */
  freezeRemainingGroundItems() {
    this.groundItems.forEach((g) => {
      if (g && g.active && !g.getData('taken')) {
        g.disableInteractive();
        g.setAlpha(0.45);
      }
    });
  }

  showOpenBackpackButton() {
    if (this.openPackBtn) return;
    // 创建背包按钮（右上角小图标，点击打开分类 UI）
    const ICON_SCALE = 0.1;
    this.openPackBtn = this.add.image(720, 80, 'backpack').setDepth(100).setScale(ICON_SCALE);

    // 交互区域与缩放后的显示尺寸一致（避免仍按原图大小命中）
    const hw = this.openPackBtn.displayWidth / 2;
    const hh = this.openPackBtn.displayHeight / 2;
    this.openPackBtn.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hw, -hh, this.openPackBtn.displayWidth, this.openPackBtn.displayHeight),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.openPackBtn.on('pointerover', () => {
      this.openPackBtn.setScale(ICON_SCALE * 1.08);
    });
    this.openPackBtn.on('pointerout', () => {
      this.openPackBtn.setScale(ICON_SCALE);
    });

    // 打开背包分类界面：并行启动 Sorting 场景并暂停收集场景（平滑过渡）
    this.openPackBtn.on('pointerdown', () => {
      this.openPackBtn.disableInteractive().setAlpha(0.55);
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.pause(SCENE_KEYS.COLLECT);
        this.scene.launch(SCENE_KEYS.SORTING, { items: this.validInventory.slice() });
      });
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

  /** 与收集关卡一致的外观工厂，用于左侧清单与拖拽 */
  createItemShape(x, y, itemType, id) {
    let g = null;
    if (itemType === 'tinder') {
      g = this.add.rectangle(x, y, 14, 14, 0xf4d03f);
      g.setStrokeStyle(1, 0xc9a227, 1);
    } else if (itemType === 'kindling') {
      g = this.add.rectangle(x, y, 30, 7, 0x6b4423);
      g.setStrokeStyle(1, 0x3d2815, 1);
    } else if (itemType === 'fuel') {
      g = this.add.rectangle(x, y, 44, 18, 0x5c3d2a);
      g.setStrokeStyle(2, 0x3a2618, 1);
    }
    g.setData('itemType', itemType);
    g.setData('itemId', id);
    g.setDepth(30);
    g.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(g);
    return g;
  }

  create() {
    this.input.off('drag');
    this.input.off('dragend');

    this.cameras.main.fadeIn(350, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // 全屏半透明遮罩：不开启交互，避免挡住背包内拖拽命中
    const dim = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0a0a0c, 0.62);
    dim.setDepth(18);
    dim.setAlpha(0);
    this.tweens.add({
      targets: dim,
      alpha: 1,
      duration: 320,
      ease: 'Sine.easeOut',
    });

    const panel = this.add.rectangle(cx, cy, 720, 500, 0x2a2218, 0.94);
    panel.setStrokeStyle(3, 0x5c4a3a, 0.9);
    panel.setDepth(20);

    this.sortDialog = this.add
      .text(cx, 64, 'Backpack — sort by size.', {
        fontSize: '18px',
        color: '#f0e8d8',
      })
      .setOrigin(0.5)
      .setDepth(25);

    this.hintText = this.add
      .text(cx, GAME_HEIGHT - 52, 'Drag each piece into the matching box.', {
        fontSize: '14px',
        color: '#d0c8b8',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 60 },
      })
      .setOrigin(0.5)
      .setDepth(25);

    // 右侧三个分类框（保存到 this，供 dragend 吸附坐标使用）
    this.zoneLayout = {
      tinder: { label: 'Tinder (Smallest)', x: 520, y: 175, w: 200, h: 120, color: 0x3a3530 },
      kindling: { label: 'Kindling (Medium)', x: 520, y: 305, w: 200, h: 120, color: 0x3a3530 },
      fuel: { label: 'Fuel (Largest)', x: 520, y: 435, w: 200, h: 120, color: 0x3a3530 },
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
        .text(z.x, z.y - 46, z.label, {
          fontSize: '13px',
          color: '#e8dcc8',
          align: 'center',
          wordWrap: { width: z.w - 10 },
        })
        .setOrigin(0.5, 0)
        .setDepth(24);
    });

    // 左侧：待分类物品列
    const leftX = 175;
    let y0 = 155;
    this.draggables = [];
    this.remaining = this.payloadItems.length;
    this.sortedCount = 0;

    this.payloadItems.forEach((entry, i) => {
      const sh = this.createItemShape(leftX, y0 + i * 46, entry.type, entry.id);
      sh.setData('homeX', leftX);
      sh.setData('homeY', y0 + i * 46);
      this.draggables.push(sh);
    });

    // 关闭按钮：平滑收起背包层
    const closeBtn = this.add
      .text(GAME_WIDTH - 48, 42, 'X', {
        fontSize: '22px',
        color: '#e0d8c8',
        backgroundColor: '#4a3a2a',
        padding: { x: 10, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      this.closeBackpackSmooth();
    });

    // ========== 【拖拽逻辑】背包内：拖动时跟随指针 ==========
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('locked')) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    // ========== 【拖拽逻辑】背包内：放置检测 / 弹回 ==========
    this.input.on('dragend', (pointer, gameObject) => {
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('locked')) return;

      const t = gameObject.getData('itemType');
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
            this.hintText.setText(`Sorted ${this.sortedCount} / ${this.remaining}.`);
            if (this.sortedCount >= this.remaining) {
              this.showConstructButton();
            }
          } else {
            const tr = rank[t];
            const kr = rank[key];
            let msg =
              tr > kr
                ? 'This is too big for this category.'
                : 'This is too small for this category.';
            this.hintText.setText(msg);
            this.tweens.add({
              targets: gameObject,
              x: gameObject.getData('homeX'),
              y: gameObject.getData('homeY'),
              duration: 220,
              ease: 'Cubic.easeOut',
            });
          }
        }
      });

      if (!placed) {
        this.tweens.add({
          targets: gameObject,
          x: gameObject.getData('homeX'),
          y: gameObject.getData('homeY'),
          duration: 200,
          ease: 'Cubic.easeOut',
        });
      }
    });

    this.constructBtn = null;
  }

  showConstructButton() {
    if (this.constructBtn) return;
    this.sortDialog.setText('All sorted. Ready to build.');
    this.hintText.setText('Nice — each size has its place.');
    this.constructBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 90, 'Next: Construct the Fire', {
        fontSize: '18px',
        color: '#fff8e7',
        backgroundColor: '#6b4a2a',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setInteractive({ useHandCursor: true });

    this.constructBtn.on('pointerdown', () => {
      // 结束并行场景并进入下一教学段
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

  create() {
    this.input.off('drag');
    this.input.off('dragend');

    this.cameras.main.fadeIn(450, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#2a2218');

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 12;
    const CENTER_SNAP_R = 72;

    // 与 Scene 4 火场一致：中央裸土 + 环形六颗石头
    this.add.rectangle(cx, cy, 520, 360, 0x3d2e22, 1).setDepth(0).setStrokeStyle(2, 0x5c4a3a, 0.5);
    const slotRingR = 88;
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      const sx = cx + Math.cos(ang) * slotRingR;
      const sy = cy + Math.sin(ang) * slotRingR;
      const rock = this.add.circle(sx, sy, 20, 0x5a5a5a);
      rock.setDepth(6);
      rock.setStrokeStyle(2, 0x3a3a3a);
    }

    // 火圈中心落点（用于检测拖拽，不单独画碰撞体）
    this.fireCenter = { x: cx, y: cy };

    this.add
      .text(cx, 24, 'Constructing the Fire', {
        fontSize: '22px',
        color: '#e8dcc8',
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.buildDialog = this.add
      .text(
        cx,
        GAME_HEIGHT - 56,
        '...All the materials are ready. I need to structure this right so the fire grows steadily.',
        {
          fontSize: '14px',
          color: '#f0e6d8',
          align: 'center',
          wordWrap: { width: GAME_WIDTH - 36 },
        }
      )
      .setOrigin(0.5)
      .setDepth(40);

    /** 搭建阶段：0=Tinder, 1=Kindling, 2=Fuel, 3=全部完成 */
    this.constructionStep = 0;

    this.layerRoot = this.add.container(0, 0);
    this.layerRoot.setDepth(10);

    // 底部三堆材料：不同大小的褐色块 + 标签（均可拖拽）
    const pileY = GAME_HEIGHT - 108;
    const piles = [
      { type: 'tinder', w: 26, h: 26, x: 175, color: 0x7a5c3a, label: 'Tinder' },
      { type: 'kindling', w: 44, h: 16, x: 400, color: 0x6b4a32, label: 'Kindling' },
      { type: 'fuel', w: 58, h: 24, x: 625, color: 0x5a3d28, label: 'Fuel' },
    ];

    this.materialPiles = [];
    piles.forEach((p) => {
      const rect = this.add.rectangle(p.x, pileY, p.w, p.h, p.color);
      rect.setStrokeStyle(2, 0x3d2815, 1);
      rect.setDepth(25);
      rect.setData('matPile', true);
      rect.setData('matType', p.type);
      rect.setData('homeX', p.x);
      rect.setData('homeY', pileY);
      rect.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(rect);
      this.materialPiles.push(rect);
      this.add
        .text(p.x, pileY + p.h / 2 + 14, p.label, {
          fontSize: '13px',
          color: '#d8c8b0',
        })
        .setOrigin(0.5)
        .setDepth(25);
    });

    this.strikeBtn = null;

    // ========== 【拖拽逻辑】移动材料堆 ==========
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (!gameObject || !gameObject.active) return;
      if (!gameObject.getData('matPile')) return;
      if (gameObject.getData('spent')) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
    });

    // ========== 【顺序检查逻辑】仅允许按 Tinder → Kindling → Fuel 依次放入火圈中心 ==========
    this.input.on('dragend', (pointer, gameObject) => {
      if (!gameObject || !gameObject.active) return;
      if (!gameObject.getData('matPile')) return;
      if (gameObject.getData('spent')) return;

      const matType = gameObject.getData('matType');
      const dist = Phaser.Math.Distance.Between(
        gameObject.x,
        gameObject.y,
        this.fireCenter.x,
        this.fireCenter.y
      );
      const inCenter = dist < CENTER_SNAP_R;

      const bounceHome = () => {
        this.tweens.add({
          targets: gameObject,
          x: gameObject.getData('homeX'),
          y: gameObject.getData('homeY'),
          duration: 240,
          ease: 'Cubic.easeOut',
        });
      };

      if (!inCenter) {
        bounceHome();
        return;
      }

      const order = ['tinder', 'kindling', 'fuel'];
      const expected = order[this.constructionStep];

      if (matType !== expected) {
        bounceHome();
        this.buildDialog.setText(
          'I need a base of smaller materials first. Small to large, steadily.'
        );
        return;
      }

      // 正确一步：吸附到中心略上方视觉点，标记已使用，并叠加对应结构层
      gameObject.setData('spent', true);
      this.input.setDraggable(gameObject, false);
      this.tweens.add({
        targets: gameObject,
        x: this.fireCenter.x,
        y: this.fireCenter.y - 8,
        alpha: 0.35,
        scaleX: 0.65,
        scaleY: 0.65,
        duration: 200,
        ease: 'Quad.easeIn',
        onComplete: () => {
          gameObject.setAlpha(0);
          gameObject.setPosition(gameObject.getData('homeX'), gameObject.getData('homeY'));
        },
      });

      if (this.constructionStep === 0) {
        this.addTinderLayer(cx, cy);
      } else if (this.constructionStep === 1) {
        this.addKindlingLayer(cx, cy);
      } else if (this.constructionStep === 2) {
        this.addFuelLayer(cx, cy);
      }

      this.constructionStep += 1;

      if (this.constructionStep === 1) {
        this.buildDialog.setText('Tinder down. Add kindling across it.');
      } else if (this.constructionStep === 2) {
        this.buildDialog.setText('Kindling set. Crown it with fuel.');
      } else if (this.constructionStep >= 3) {
        this.onConstructionComplete();
      }
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
    this.buildDialog.setText(
      "Now the structure is solid. It's time to bring it to life."
    );
    if (this.strikeBtn) return;
    const cx = GAME_WIDTH / 2;
    this.strikeBtn = this.add
      .text(cx, GAME_HEIGHT - 118, 'Next: Strike a Spark', {
        fontSize: '18px',
        color: '#fff8e7',
        backgroundColor: '#8b5a2b',
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(45)
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

    // 深夜底色（极暗）
    this.cameras.main.setBackgroundColor('#060504');
    this.add.rectangle(cx, cy, GAME_WIDTH + 40, GAME_HEIGHT + 40, 0x030201, 1).setDepth(-5);

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

    this.mainDialog = this.add
      .text(
        cx,
        GAME_HEIGHT - 96,
        '...All the materials are ready. I need to structure this right so the fire grows steadily.\nOpen your backpack — take the flint, then strike the tinder.',
        {
          fontSize: '14px',
          color: '#e8dcc8',
          align: 'center',
          lineSpacing: 4,
          wordWrap: { width: GAME_WIDTH - 40 },
        }
      )
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
    const bx = GAME_WIDTH - 44;
    const by = 46;
    this.backpackIcon = this.add
      .rectangle(bx, by, 38, 38, 0x5c3d2a)
      .setStrokeStyle(2, 0x3d2815, 1)
      .setDepth(60)
      .setInteractive({ useHandCursor: true });

    this.add.text(bx, by + 32, 'Pack', { fontSize: '11px', color: '#c8b8a0' }).setOrigin(0.5).setDepth(60);

    this.backpackIcon.on('pointerdown', () => this.toggleBackpackMenu(bx, by));
    this.applyButtonHover(this.backpackIcon, { idle: 0x5c3d2a, hover: 0x7a5540 }, 1.06);

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
        this.fireIntensity = Math.min(100, this.fireIntensity + 28);
        this.growFlameVisual();
        this.firePhase = 'need_fuel';
        this.mainDialog.setText('Steady — add fuel wood when the kindling is catching.');
        home();
      } else if (this.firePhase === 'need_fuel' && t === 'fuel') {
        gameObject.setAlpha(0);
        this.input.setDraggable(gameObject, false);
        this.fireIntensity = 100;
        this.firePhase = 'bonfire';
        this.showBonfire(cx, cy);
        this.showVictory();
      } else if (inFlame) {
        home();
        if (this.firePhase === 'need_kindling' && t === 'fuel') {
          this.mainDialog.setText('This is too big for this category.');
        } else if (this.firePhase === 'need_fuel' && t === 'kindling') {
          this.mainDialog.setText('This is too small for this category.');
        } else {
          this.mainDialog.setText('The flame is fragile. Feed it small sticks first.');
        }
      }
    });
  }

  toggleBackpackMenu(bx, by) {
    if (this.backpackMenu) {
      this.backpackMenu.destroy(true);
      this.backpackMenu = null;
      return;
    }
    const panel = this.add.container(bx - 120, by + 28);
    panel.setDepth(70);
    const bg = this.add.rectangle(0, 54, 160, 110, 0x2a2218, 0.96).setOrigin(0, 0);
    bg.setStrokeStyle(2, 0x5c4a3a, 1);
    const b1 = this.add
      .text(12, 14, 'Flint & Steel', {
        fontSize: '14px',
        color: '#f0e8d8',
        backgroundColor: '#4a3a2a',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    const b2 = this.add
      .text(12, 52, 'Diary', {
        fontSize: '14px',
        color: '#f0e8d8',
        backgroundColor: '#4a3a2a',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    panel.add([bg, b1, b2]);
    this.backpackMenu = panel;

    b1.on('pointerdown', () => {
      if (this.backpackMenu) {
        this.backpackMenu.destroy(true);
        this.backpackMenu = null;
      }
      this.toolMode = 'flint';
      this.flintFollower.setVisible(true);
      this.input.setDefaultCursor('none');
      this.mainDialog.setText('Hold and rub over the tinder base until sparks catch.');
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
        this.strikeMs += delta;
        if (this.strikeSparkEmitter && this.strikeSparkEmitter.emitParticleAt) {
          this.strikeSparkEmitter.emitParticleAt(p.x, p.y, 5);
        }
        if (this.strikeMs >= 3000) {
          this.spawnEmberAndSmoke();
          this.strikeMs = 0;
          this.firePhase = 'ember';
          this.fireIntensity = 15;
          this.flintFollower.setVisible(false);
          this.input.setDefaultCursor('default');
          this.toolMode = 'none';
          this.mainDialog.setText('An ember! Keep it alive — use Blow to feed it oxygen.');
          this.showBlowButton();
        }
      } else {
        this.strikeMs = 0;
      }
    }

    if (this.firePhase === 'ember') {
      this.emberDecayTimer = (this.emberDecayTimer || 0) + delta;
      if (this.emberDecayTimer > 120) {
        this.emberDecayTimer = 0;
        this.fireIntensity = Math.max(0, this.fireIntensity - 1.2);
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
    this.emberDot = this.add.circle(cx, cy - 6, 6, 0xff6622);
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
    const cx = GAME_WIDTH / 2;
    this.blowBtn = this.add
      .text(cx, GAME_HEIGHT - 128, 'Blow', {
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
    this.firePhase = 'small_flame';
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
    // 火苗跳动：随机缩放 tween 模拟闪烁（替代单一正弦）
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

    this.mainDialog.setText('The flame is fragile. Feed it small sticks first.');
    this.firePhase = 'need_kindling';
    this.spawnFuelDraggables();
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

  spawnFuelDraggables() {
    const y = GAME_HEIGHT - 100;
    this.kindlingPile = this.add.rectangle(280, y, 48, 14, 0x6b4423);
    this.kindlingPile.setStrokeStyle(1, 0x3d2815);
    this.kindlingPile.setDepth(55);
    this.kindlingPile.setData('fuelDrag', true);
    this.kindlingPile.setData('fuelType', 'kindling');
    this.kindlingPile.setData('hx', 280);
    this.kindlingPile.setData('hy', y);
    this.kindlingPile.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.kindlingPile);
    this.add.text(280, y + 22, 'Kindling', { fontSize: '12px', color: '#c8b8a0' }).setOrigin(0.5).setDepth(55);

    this.fuelPile = this.add.rectangle(520, y, 56, 22, 0x4a3220);
    this.fuelPile.setStrokeStyle(2, 0x2a1810);
    this.fuelPile.setDepth(55);
    this.fuelPile.setData('fuelDrag', true);
    this.fuelPile.setData('fuelType', 'fuel');
    this.fuelPile.setData('hx', 520);
    this.fuelPile.setData('hy', y);
    this.fuelPile.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(this.fuelPile);
    this.add.text(520, y + 26, 'Fuel', { fontSize: '12px', color: '#c8b8a0' }).setOrigin(0.5).setDepth(55);
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
    this.mainDialog.setText('Finally... a fire that will hold. Now I can focus on what comes next.');
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const banner = this.add
      .text(cx, cy - 80, 'Mission Accomplished:\nYou survived the first night.', {
        fontSize: '26px',
        color: '#fff8e0',
        align: 'center',
        fontStyle: 'bold',
        stroke: '#2a1810',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      scale: { from: 0.85, to: 1 },
      duration: 700,
      ease: 'Cubic.easeOut',
    });

    // 从火堆取燃烧木条，进入 Scene 7：深夜寻药
    const herbBtn = this.add
      .text(cx, cy + 28, 'Take a burning stick — search the forest for herbs', {
        fontSize: '16px',
        color: '#fff8e7',
        backgroundColor: '#4a5c3a',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(205)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    this.tweens.add({ targets: herbBtn, alpha: 1, delay: 400, duration: 450, ease: 'Sine.easeOut' });
    herbBtn.on('pointerover', () => herbBtn.setStyle({ backgroundColor: '#5d7348' }));
    herbBtn.on('pointerout', () => herbBtn.setStyle({ backgroundColor: '#4a5c3a' }));
    herbBtn.on('pointerdown', () => {
      herbBtn.disableInteractive().setAlpha(0.55);
      this.input.setDefaultCursor('default');
      this.cameras.main.fadeOut(550, 0, 0, 0);
      this.time.delayedCall(550, () => {
        this.scene.start(SCENE_KEYS.HERBS);
      });
    });
  }
}
