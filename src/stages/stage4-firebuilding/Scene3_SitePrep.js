/** 清理杂物、围火圈 — FireSitePrepScene */
import { FireIso } from "../../utils/FireIso.js";
import { transitionScene, addSceneBackButton } from "../../utils/SceneNav.js";
import { FIRE_PREP_LAYER_OFFSET, FIRE_PREP_PLAYER_DEPTH } from "./fireConstants.js";

export default class FireSitePrepScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FireSitePrepScene' });
  }

  cartesianToIso(gx, gy) {
    return FireIso.cartesianToIso(this.isoC, gx, gy);
  }

  isoToCartesian(sx, sy) {
    return FireIso.isoToCartesian(this.isoC, sx, sy);
  }

  setDepthFromY(go) {
    FireIso.setDepthFromY(go);
  }

  /**
   * 杂物/石头：在接地点 y 上加较大偏移，保证绘制与点击始终压在「背景松树」之上；
   * 松树单独用较低的 depth，避免遮挡清理区。
   */
  setPrepInteractiveDepth(go) {
    if (go && typeof go.setDepth === 'function') {
      go.setDepth(go.y + FIRE_PREP_LAYER_OFFSET);
    }
  }

  ensurePlayerDot() {
    if (this.playerDot && this.playerDot.active) return;
    const p = this.cartesianToIso(-1.25, 0.35);
    this.playerDot = this.add.circle(p.x, p.y, 20, 0xffffff).setDepth(FIRE_PREP_PLAYER_DEPTH);
    if (this.playerDot.disableInteractive) this.playerDot.disableInteractive();
  }

  movePlayerThen(x, y, onComplete) {
    this.ensurePlayerDot();
    this.tweens.killTweensOf(this.playerDot);
    const dist = Phaser.Math.Distance.Between(this.playerDot.x, this.playerDot.y, x, y);
    if (dist < 8) {
      if (onComplete) onComplete();
      return;
    }
    const dur = Phaser.Math.Clamp(220 + dist * 0.4, 280, 900);
    this.tweens.add({
      targets: this.playerDot,
      x,
      y,
      duration: dur,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.playerDot && this.playerDot.setDepth) {
          this.playerDot.setDepth(FIRE_PREP_PLAYER_DEPTH);
        }
        if (onComplete) onComplete();
      },
    });
  }

  drawIsoGround() {
    FireIso.drawGround(this, this.isoC);
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
    root.setDepth(Phaser.Math.Clamp(screenY - 95, 12, 228));
    return root;
  }

  addInspectBushAt(screenX, screenY, depthY) {
    const g = this.add.graphics().setDepth(depthY);
    g.fillStyle(0x1b5e20, 0.88);
    g.fillEllipse(screenX, screenY + 6, 40, 24);
    for (let i = 0; i < 6; i++) {
      const ox = Phaser.Math.FloatBetween(-16, 16);
      const oy = Phaser.Math.FloatBetween(-10, 10);
      g.fillStyle(0x2e7d32, 0.92);
      g.fillEllipse(screenX + ox, screenY + oy, 20, 12);
    }
  }

  addInspectBranchesAt(screenX, screenY, depthY) {
    const g = this.add.graphics().setDepth(depthY);
    for (let i = 0; i < 5; i++) {
      const x0 = screenX + Phaser.Math.FloatBetween(-22, 22);
      const y0 = screenY + Phaser.Math.FloatBetween(-8, 8);
      const w = Phaser.Math.FloatBetween(26, 48);
      g.fillStyle(0x5d4037, 1);
      g.fillRect(x0 - w / 2, y0 - 3, w, 6);
      g.lineStyle(1, 0x3e2723, 0.9);
      g.strokeRect(x0 - w / 2, y0 - 3, w, 6);
    }
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
    this.prepGameplayActive = false;
    this.prepInspectHits = [];
    this.debrisPieces = [];

    const cfg = this.sys.game.config;
    const gw = Number(cfg.width) || (typeof GAME_WIDTH !== 'undefined' ? GAME_WIDTH : 800);
    const gh = Number(cfg.height) || (typeof GAME_HEIGHT !== 'undefined' ? GAME_HEIGHT : 600);
    this.isoC = FireIso.createConfig(gw, gh);

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

    const spotId = this.registry.get('fireSpotId') || 'open';
    const SITE_CART = {
      open: [0, 0],
      branches: [-0.42, -0.38],
      grass: [0.4, -0.35],
      gear: [-0.38, 0.44],
    };
    const [fcx, fcy] = SITE_CART[spotId] || SITE_CART.open;
    this.fireSiteCart = { x: fcx, y: fcy };

    const siteTitles = {
      branches: 'Under low branches',
      grass: 'Near dry grass',
      gear: 'Close to resting area',
      open: 'Open, clear ground',
    };
    this.siteTitle = siteTitles[spotId] || siteTitles.open;

    const firePos = this.cartesianToIso(fcx, fcy);
    this.add
      .ellipse(firePos.x, firePos.y, 62, 32, 0x1a120c, 1)
      .setStrokeStyle(2, 0x140c08, 1)
      .setDepth(firePos.y);

    const pPos = this.cartesianToIso(fcx - 1.25, fcy + 0.35);
    this.playerDot = this.add.circle(pPos.x, pPos.y, 20, 0xffffff).setDepth(FIRE_PREP_PLAYER_DEPTH);
    if (this.playerDot.disableInteractive) this.playerDot.disableInteractive();

    /** 松树略向外推，减少与火坑清理区重叠 */
    const treeGrids = [
      [-3.45, -2.28],
      [3.45, -2.18],
      [-4.35, 1.32],
      [4.05, 1.08],
      [-5.0, 0.22],
      [4.85, 0.12],
      [0.22, -3.85],
    ];
    this.prepTreeCartesian = treeGrids.map(([gx, gy]) => ({ gx, gy }));
    treeGrids.forEach(([gx, gy]) => {
      const tp = this.cartesianToIso(gx, gy);
      this.addIsoPineTreeAt(tp.x, tp.y);
    });

    const inspectSpots = [
      {
        gx: fcx - 2.4,
        gy: fcy + 2.6,
        kind: 'bush',
        line: '…Close enough to catch if the fire grows.',
      },
      {
        gx: fcx + 0.2,
        gy: fcy - 3.3,
        kind: 'branch',
        line: 'If the flames get higher… that could be a problem.',
      },
    ];
    /** cartesian：杂物生成时远离检视点，避免与小块点击区重叠 */
    const INSPECT_EXCLUDE_CART_R = 0.92;
    const TREE_EXCLUDE_CART_R = 1.25;
    const isClearOfInspectSpots = (gx, gy) =>
      inspectSpots.every((sp) => Math.hypot(gx - sp.gx, gy - sp.gy) >= INSPECT_EXCLUDE_CART_R);
    const isClearOfTrees = (gx, gy) =>
      this.prepTreeCartesian.every((t) => Math.hypot(gx - t.gx, gy - t.gy) >= TREE_EXCLUDE_CART_R);

    inspectSpots.forEach((sp) => {
      const ip = this.cartesianToIso(sp.gx, sp.gy);
      if (sp.kind === 'bush') {
        this.addInspectBushAt(ip.x, ip.y, ip.y);
      } else {
        this.addInspectBranchesAt(ip.x, ip.y, ip.y);
      }
      const hit = this.add
        .circle(ip.x, ip.y, 20, 0x2a4a22, 0.14)
        .setStrokeStyle(1, 0x4a6a3a, 0.45)
        .setDepth(ip.y + 300);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (pointer) => {
        if (!this.prepGameplayActive) return;
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.prepDialog.setText(sp.line);
        });
      });
      this.prepInspectHits.push(hit);
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
      const sp = this.cartesianToIso(fcx + gx * 1.75, fcy + gy * 1.75);
      this.addDashedGhostEllipse(sp.x, sp.y, 26, 13);
      this.rockSlots.push({ x: sp.x, y: sp.y, filled: false, index: i });
    });

    const cx = gw / 2;
    const prepHudH = 96;
    this.prepHudBar = this.add
      .rectangle(cx, prepHudH / 2, gw, prepHudH, 0x121610, 0.42)
      .setDepth(998)
      .setStrokeStyle(0)
      .setAlpha(0);
    this.prepTitle = this.add
      .text(cx, 14, 'Preparing the Fire Site', {
        fontSize: '18px',
        color: '#e8f0e0',
      })
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);
    this.prepSiteLine = this.add
      .text(cx, 36, `Chosen location: ${this.siteTitle}`, {
        fontSize: '11px',
        color: '#a8b898',
        align: 'center',
        wordWrap: { width: gw - 36 },
      })
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);
    this.prepInstr = this.add
      .text(
        cx,
        52,
        'Tap debris to walk over and kick it aside. Then drag rocks onto the ring.',
        {
          fontSize: '12px',
          color: '#c5d4ba',
          align: 'center',
          lineSpacing: 4,
          wordWrap: { width: gw - 36 },
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);

    this.prepDialog = this.add
      .text(cx, gh - 62, '', {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: gw - 48 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setAlpha(0);

    const PREP_DRAG_DEPTH = 10050;

    const debrisTotal = Phaser.Math.Between(10, 15);
    this.slotsFilled = 0;
    this.prepComplete = false;

    let safety = 0;
    while (this.debrisPieces.length < debrisTotal && safety < 2500) {
      safety += 1;
      const gx = Phaser.Math.FloatBetween(-2.8, 2.8) + fcx * 0.15;
      const gy = Phaser.Math.FloatBetween(-1.8, 2.6) + fcy * 0.15;
      if (Math.hypot(gx - fcx, gy - fcy) < 1.15) continue;
      if (!isClearOfInspectSpots(gx, gy)) continue;
      if (!isClearOfTrees(gx, gy)) continue;
      const pos = this.cartesianToIso(gx, gy);
      const kind = Phaser.Math.RND.pick(['leaf', 'grass', 'twig']);
      let piece;
      if (kind === 'grass') {
        piece = this.add.ellipse(
          pos.x,
          pos.y,
          Phaser.Math.Between(11, 18),
          Phaser.Math.Between(7, 11),
          0x7cb342,
          1
        );
        piece.setStrokeStyle(1, 0x558b2f, 0.95);
        piece.rotation = Phaser.Math.FloatBetween(-0.4, 0.4);
      } else if (kind === 'twig') {
        piece = this.add.rectangle(
          pos.x,
          pos.y,
          Phaser.Math.Between(20, 34),
          Phaser.Math.Between(3, 5),
          0x5d4037
        );
        piece.setStrokeStyle(1, 0x3e2723, 0.95);
        piece.rotation = Phaser.Math.FloatBetween(-0.85, 0.85);
      } else {
        piece = this.add.rectangle(
          pos.x,
          pos.y,
          Phaser.Math.Between(9, 15),
          Phaser.Math.Between(5, 10),
          0x6d4c41
        );
        piece.setStrokeStyle(1, 0x4e342e, 0.9);
        piece.rotation = Phaser.Math.FloatBetween(-0.55, 0.55);
      }
      piece.setData('type', 'debris');
      piece.setData('debrisKind', kind);
      this.setPrepInteractiveDepth(piece);
      piece.setInteractive({ useHandCursor: true });
      this.debrisPieces.push(piece);
    }
    this.debrisRemaining = this.debrisPieces.length;

    const rockHomeGrids = [
      [-4.8, -1.1],
      [4.8, -1.1],
      [-4.6, 2.4],
      [4.6, 2.4],
      [0, -3.4],
      [0, 3.5],
    ];
    this.prepRocks = [];
    rockHomeGrids.forEach(([gx, gy], idx) => {
      const pos = this.cartesianToIso(gx + fcx * 0.25, gy + fcy * 0.25);
      const rock = this.createHexRock(pos.x, pos.y, 21);
      rock.setData('type', 'rock');
      rock.setData('placed', false);
      rock.setData('slotIndex', null);
      rock.setData('rockId', idx);
      this.setPrepInteractiveDepth(rock);
      this.input.setDraggable(rock);
      this.prepRocks.push(rock);
    });

    this.prepRocks.forEach((rock) => {
      rock.on('dragstart', () => {
        if (!this.prepGameplayActive || this.prepComplete) return;
        rock.setDepth(PREP_DRAG_DEPTH);
        if (this.debrisRemaining > 0) {
          this.prepDialog.setText('I should clear the dry debris first before building the ring.');
        } else {
          this.prepDialog.setText('This should keep it contained…');
        }
      });
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (!this.prepGameplayActive) return;
      if (!gameObject || !gameObject.active) return;
      if (gameObject.getData('type') === 'debris') return;
      if (gameObject.getData('placed')) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
      gameObject.setDepth(PREP_DRAG_DEPTH);
    });

    const sweepDebrisAway = (piece) => {
      if (!piece || !piece.active || piece.getData('gone')) return;
      piece.setData('gone', true);
      piece.disableInteractive();
      const ang = Phaser.Math.FloatBetween(-Math.PI * 0.35, Math.PI * 0.35) + Math.atan2(piece.y - gh * 0.42, piece.x - gw * 0.5);
      const dist = Phaser.Math.Between(120, 220);
      const tx = piece.x + Math.cos(ang) * dist;
      const ty = piece.y + Math.sin(ang) * dist * 0.85;
      this.tweens.add({
        targets: piece,
        x: tx,
        y: ty,
        alpha: 0,
        rotation: piece.rotation + Phaser.Math.FloatBetween(-1.2, 1.2),
        scaleX: 0.75,
        scaleY: 0.75,
        duration: 320,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          if (piece && piece.scene) piece.destroy();
          this.debrisRemaining -= 1;
          this.updateNextButtonState();
          this.checkPrepComplete();
        },
      });
    };

    this.input.on('dragend', (pointer, gameObject) => {
      if (!this.prepGameplayActive) return;
      if (!gameObject || !gameObject.active) return;
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
        this.setPrepInteractiveDepth(gameObject);
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
            this.setPrepInteractiveDepth(gameObject);
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

        this.prepDialog.setText('This should keep it contained…');
        this.updateNextButtonState();
        this.checkPrepComplete();
      } else {
        this.setPrepInteractiveDepth(gameObject);
      }
    });

    this.debrisPieces.forEach((piece) => {
      piece.on('pointerdown', () => {
        if (!this.prepGameplayActive || this.prepComplete || piece.getData('gone')) return;
        this.prepDialog.setText('Too dry… this would catch immediately.');
        this.movePlayerThen(piece.x, piece.y + 6, () => {
          if (!piece.active || piece.getData('gone')) return;
          sweepDebrisAway(piece);
        });
      });
    });

    this.debrisPieces.forEach((piece) => {
      if (piece && piece.disableInteractive) piece.disableInteractive();
    });
    this.prepRocks.forEach((rock) => {
      this.input.setDraggable(rock, false);
    });
    this.prepInspectHits.forEach((hit) => {
      if (hit && hit.disableInteractive) hit.disableInteractive();
    });

    this.nextMaterialsBtn = this.add
      .text(cx, gh - 120, 'Next: Collect Materials', {
        fontSize: '18px',
        color: '#fff8e7',
        backgroundColor: '#4a6b3a',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setAlpha(0)
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
        transitionScene(this, SCENE_KEYS.COLLECT);
      });
    });

    this.startPrepIntro();
    addSceneBackButton(this);
  }

  updateNextButtonState() {
    if (!this.nextMaterialsBtn || this.prepComplete) return;
    if (!this.prepGameplayActive) {
      this.nextMaterialsBtn.setAlpha(0);
      this.nextMaterialsBtn.disableInteractive();
      return;
    }
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
        '…That should do it.\n\nNow it won\'t spread beyond where I intend.'
      );
      this.nextMaterialsBtn.setAlpha(1);
      this.nextMaterialsBtn.setInteractive({ useHandCursor: true });
    }
  }

  /** 底部对白结束后才启用清理/搬石 */
  startPrepIntro() {
    const cx = this.sys.game.config.width / 2;
    const gh = Number(this.sys.game.config.height) || GAME_HEIGHT;
    const boxY = gh - 96;
    const lines = [
      'I have to clean it first.',
      'Even a small flame could spread if I leave it like this.',
    ];

    this.introBg = this.add
      .rectangle(cx, boxY, this.sys.game.config.width - 40, 128, 0x000000, 0.82)
      .setStrokeStyle(1, 0x5c4033, 0.85)
      .setDepth(2500);
    this.introTitle = this.add
      .text(cx, boxY - 42, 'Preparing the Fire Site', {
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
        wordWrap: { width: this.sys.game.config.width - 72 },
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
        this.beginPrepGameplay();
      }
    });
  }

  beginPrepGameplay() {
    this.prepGameplayActive = true;
    if (this.prepHudBar) this.prepHudBar.setAlpha(1);
    if (this.prepTitle) this.prepTitle.setAlpha(1);
    if (this.prepSiteLine) this.prepSiteLine.setAlpha(1);
    if (this.prepInstr) this.prepInstr.setAlpha(1);
    if (this.prepDialog) {
      this.prepDialog.setAlpha(1);
      this.prepDialog.setText('');
    }
    if (this.nextMaterialsBtn) this.nextMaterialsBtn.setAlpha(0.38);

    this.debrisPieces.forEach((piece) => {
      if (!piece || !piece.active || piece.getData('gone')) return;
      piece.setInteractive({ useHandCursor: true });
    });
    this.prepRocks.forEach((rock) => {
      if (!rock || !rock.active) return;
      this.input.setDraggable(rock);
    });
    this.prepInspectHits.forEach((hit) => {
      if (hit && hit.active) hit.setInteractive({ useHandCursor: true });
    });

    this.updateNextButtonState();
  }
}
