/** 收集 Tinder / Kindling / Fuel — CollectMaterialsScene */
import { FireIso } from "../../utils/FireIso.js";
import { addSceneBackButton } from "../../utils/SceneNav.js";
import {
  COLLECT_ITEM_DEPTH_OFFSET,
  COLLECT_PLAYER_DEPTH,
  COLLECT_DRAG_DEPTH,
  COLLECT_TOP_SCREEN_MIN_Y,
} from "./fireConstants.js";

export default class CollectMaterialsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CollectMaterialsScene' });
  }

  setCollectItemDepth(go) {
    if (go && typeof go.setDepth === 'function') {
      go.setDepth(go.y + COLLECT_ITEM_DEPTH_OFFSET);
    }
  }

  /** 与 FireSitePrepScene 一致的选址偏移（registry.fireSpotId） */
  getFireSiteCart() {
    const spotId = this.registry.get('fireSpotId') || 'open';
    const SITE_CART = {
      open: [0, 0],
      branches: [-0.42, -0.38],
      grass: [0.4, -0.35],
      gear: [-0.38, 0.44],
    };
    const pair = SITE_CART[spotId] || SITE_CART.open;
    return { x: pair[0], y: pair[1], spotId };
  }

  drawPreparedFireSite(fcx, fcy) {
    const fp = FireIso.cartesianToIso(this.isoC, fcx, fcy);
    this.add
      .ellipse(fp.x, fp.y, 72, 38, 0x3d3428, 1)
      .setStrokeStyle(2, 0x524438, 1)
      .setDepth(fp.y - 3);
    const ring = [
      [1.45, 0],
      [0.72, 0.95],
      [-0.72, 0.95],
      [-1.45, 0],
      [-0.72, -0.95],
      [0.72, -0.95],
    ];
    ring.forEach(([gx, gy]) => {
      const p = FireIso.cartesianToIso(this.isoC, fcx + gx * 1.75, fcy + gy * 1.75);
      this.add.circle(p.x, p.y, 8, 0x6a6e78, 1).setStrokeStyle(1, 0x4a4e58, 1).setDepth(p.y);
    });
  }

  /** 简单背包图标（不依赖外部贴图） */
  createBackpackIcon(screenX, screenY) {
    const c = this.add.container(screenX, screenY);
    const body = this.add.rectangle(0, 8, 54, 46, 0x6d4c41).setStrokeStyle(2, 0x4e342e, 1);
    const pocket = this.add.rectangle(0, 14, 30, 16, 0x5d4037, 0.75).setStrokeStyle(1, 0x3e2723, 0.9);
    const flap = this.add.rectangle(0, -12, 46, 18, 0x8d6e63).setStrokeStyle(2, 0x5d4037, 1);
    const strapL = this.add.rectangle(-22, 4, 7, 32, 0x4e342e);
    const strapR = this.add.rectangle(22, 4, 7, 32, 0x4e342e);
    c.add([strapL, strapR, body, pocket, flap]);
    c.setDepth(1200);
    c.setSize(58, 72);
    return c;
  }

  assignSlotsWithDampBias(types, slotPool, fcx, fcy) {
    const damp = [];
    const dry = [];
    slotPool.forEach((s) => {
      const lx = s.gx - fcx * 0.08;
      const ly = s.gy - fcy * 0.08;
      if (ly < -1.02 || Math.abs(lx) > 2.12) damp.push(s);
      else dry.push(s);
    });
    Phaser.Utils.Array.Shuffle(damp);
    Phaser.Utils.Array.Shuffle(dry);
    /** 每格只用一次。旧逻辑用 backup 复制全池，会与 damp/dry 重复同一坐标，多件叠在同格 → 看起来像「缺 fuel」 */
    const out = [];
    const takeWet = () => damp.pop() || dry.pop();
    const takeDry = () => dry.pop() || damp.pop();
    types.forEach((t) => {
      const slot = t === 'wet' ? takeWet() : takeDry();
      out.push(slot);
    });
    const merged = Phaser.Utils.Array.Shuffle([...damp, ...dry]);
    for (let i = 0; i < out.length; i++) {
      if (!out[i] && merged.length) out[i] = merged.pop();
    }
    return out;
  }

  /** 底部状态：仅显示收集进度（与开场对白、湿木短评分开） */
  refreshStashDialog() {
    if (!this.collectDialog || !this.collectDialog.active) return;
    this.collectDialog.setText(`Temporary stash: ${this.validCount} / 8 valid pieces.`);
  }

  /** 地面材料：tinder = 叶/树皮/苔藓；kindling = 小枝；fuel = 大木；wet = 潮湿深色 */
  addGroundItem(x, y, itemType, id, enableInput) {
    let g = null;
    if (itemType === 'tinder') {
      const variant = Phaser.Math.RND.pick(['leaf', 'bark', 'moss']);
      if (variant === 'leaf') {
        g = this.add.ellipse(x, y, 14, 9, 0xd7a86a, 1);
        g.setStrokeStyle(1, 0xa67c52, 1);
        g.rotation = Phaser.Math.FloatBetween(-0.5, 0.5);
      } else if (variant === 'bark') {
        g = this.add.rectangle(x, y, 18, 11, 0x5d4037);
        g.setStrokeStyle(1, 0x3e2723, 1);
        g.rotation = Phaser.Math.FloatBetween(-0.45, 0.45);
      } else {
        g = this.add.ellipse(x, y, 16, 11, 0x689f38, 1);
        g.setStrokeStyle(1, 0x33691e, 1);
      }
      g.setData('tinderVariant', variant);
    } else if (itemType === 'kindling') {
      g = this.add.rectangle(x, y, Phaser.Math.Between(26, 34), Phaser.Math.Between(5, 8), 0x6b4423);
      g.setStrokeStyle(1, 0x3d2815, 1);
      g.rotation = Phaser.Math.FloatBetween(-0.75, 0.75);
    } else if (itemType === 'fuel') {
      const thick = Math.random() > 0.45;
      if (thick) {
        g = this.add.rectangle(x, y, Phaser.Math.Between(40, 50), Phaser.Math.Between(14, 20), 0x4e342e);
        g.setStrokeStyle(2, 0x3e2723, 1);
      } else {
        g = this.add.rectangle(x, y, Phaser.Math.Between(36, 48), Phaser.Math.Between(5, 7), 0x5c3d2a);
        g.setStrokeStyle(2, 0x3a2618, 1);
        g.rotation = Phaser.Math.FloatBetween(-0.35, 0.35);
      }
    } else if (itemType === 'wet') {
      g = this.add.rectangle(x, y, Phaser.Math.Between(16, 22), Phaser.Math.Between(14, 20), 0x1a2f4a);
      g.setStrokeStyle(2, 0x0d1b2e, 1);
      g.setAlpha(0.92);
    }
    g.setData('itemType', itemType);
    g.setData('itemId', id);
    this.setCollectItemDepth(g);
    if (enableInput !== false) {
      g.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(g);
    }
    return g;
  }

  ensurePlayerDot() {
    if (this.playerDot && this.playerDot.active) return;
    const fc = this.fireSiteCart || this.getFireSiteCart();
    const p = FireIso.cartesianToIso(this.isoC, fc.x - 1.2, fc.y + 0.45);
    this.playerDot = this.add.circle(p.x, p.y, 14, 0xffffff).setDepth(COLLECT_PLAYER_DEPTH);
    if (this.playerDot.disableInteractive) this.playerDot.disableInteractive();
  }

  movePlayerThen(x, y, onComplete) {
    this.ensurePlayerDot();
    this.tweens.killTweensOf(this.playerDot);
    const dist = Phaser.Math.Distance.Between(this.playerDot.x, this.playerDot.y, x, y);
    if (dist < 10) {
      if (onComplete) onComplete();
      return;
    }
    const dur = Phaser.Math.Clamp(200 + dist * 0.38, 260, 880);
    this.tweens.add({
      targets: this.playerDot,
      x,
      y,
      duration: dur,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.playerDot && this.playerDot.setDepth) this.playerDot.setDepth(COLLECT_PLAYER_DEPTH);
        if (onComplete) onComplete();
      },
    });
  }

  /**
   * 生成 12 个地面类型：3 湿 + 引火物/细枝/燃料各 3。
   * 任意 8 件有效组合必能包含三类（后续仍校验至少各 1 才开放背包）。
   */
  generate12Types() {
    const types = [];
    for (let i = 0; i < 3; i++) types.push('wet');
    for (let i = 0; i < 3; i++) types.push('tinder');
    for (let i = 0; i < 3; i++) types.push('kindling');
    for (let i = 0; i < 3; i++) types.push('fuel');
    Phaser.Utils.Array.Shuffle(types);
    return types;
  }

  inventoryHasAllThreeTypes() {
    const c = { tinder: 0, kindling: 0, fuel: 0 };
    this.validInventory.forEach((e) => {
      if (c[e.type] !== undefined) c[e.type] += 1;
    });
    return c.tinder >= 1 && c.kindling >= 1 && c.fuel >= 1;
  }

  countRemainingNonWetOnGround() {
    let n = 0;
    this.groundItems.forEach((g) => {
      if (g && g.active && !g.getData('taken') && g.getData('itemType') !== 'wet') n += 1;
    });
    return n;
  }

  tryCollectItem(item) {
    if (!item.active || item.getData('taken')) return;
    const t = item.getData('itemType');
    const idx = item.getData('itemId');
    if (t !== 'wet' && this.validCount >= 8 && this.inventoryHasAllThreeTypes()) return;

    item.setData('taken', true);
    item.disableInteractive();
    this.input.setDraggable(item, false);

    if (t === 'wet') {
      if (this.wetDialogTimer) {
        this.wetDialogTimer.remove(false);
        this.wetDialogTimer = null;
      }
      this.collectDialog.setText('…Too damp.\n\nThis will smoke more than it burns.');
      this.wetDialogTimer = this.time.delayedCall(2600, () => {
        this.refreshStashDialog();
        this.wetDialogTimer = null;
      });
      this.tweens.add({
        targets: item,
        alpha: 0,
        scaleX: 0.7,
        scaleY: 0.7,
        duration: 200,
        onComplete: () => {
          if (item && item.scene) item.destroy();
          this.maybeRestartCollectIfStuck();
        },
      });
      return;
    }

    const feedback =
      t === 'tinder'
        ? 'Light, dry… this should catch quickly.'
        : t === 'kindling'
          ? 'These will help the flame grow.'
          : "Too big to start with… but I'll need them later.";

    this.validInventory.push({ type: t, id: `v-${this.validCount}-${idx}` });
    this.validCount += 1;
    this.collectDialog.setText(`${feedback}\n\nTemporary stash: ${this.validCount} / 8 valid pieces.`);

    this.tweens.add({
      targets: item,
      alpha: 0,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: 180,
      onComplete: () => {
        if (item && item.scene) item.destroy();
      },
    });

    if (this.validCount >= 8 && this.inventoryHasAllThreeTypes()) {
      this.freezeRemainingGroundItems();
      this.unlockBackpackSort();
    } else if (this.validCount >= 8 && !this.inventoryHasAllThreeTypes()) {
      this.collectDialog.setText(
        `${feedback}\n\nI need tinder, kindling, and fuel — not only one kind. (${this.validCount} pieces — keep collecting.)`
      );
    }
    this.maybeRestartCollectIfStuck();
  }

  /**
   * 地面已无非湿木仍无法达成「8 件且三类齐全」→ 本关重来（避免软锁）。
   */
  maybeRestartCollectIfStuck() {
    if (this.sortUnlocked) return;
    if (this.countRemainingNonWetOnGround() > 0) return;
    const ok = this.validCount >= 8 && this.inventoryHasAllThreeTypes();
    if (ok) return;
    this.collectDialog.setText(
      '…Not enough of each size left on the ground. I\'ll search again from the start.'
    );
    this.time.delayedCall(2000, () => {
      this.registry.remove('fireSortComplete');
      this.scene.restart();
    });
  }

  unlockBackpackSort() {
    if (this.sortUnlocked) return;
    this.sortUnlocked = true;
    this.collectDialog.setText(
      `Temporary stash: ${this.validCount} / 8 valid pieces.\n\nYou have enough — open your backpack to sort.`
    );

    const hw = 40;
    const hh = 48;
    this.backpackIcon.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-hw, -hh, hw * 2, hh * 2),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.backpackIcon.on('pointerdown', () => {
      this.backpackIcon.disableInteractive().setAlpha(0.75);
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.pause(SCENE_KEYS.COLLECT);
        this.scene.launch(SCENE_KEYS.SORTING, { items: this.validInventory.slice() });
      });
    });

    this.tweens.add({
      targets: this.backpackIcon,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 420,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.inOut',
    });
  }

  /** 开场对白（底部对话框，与 FirebuildingNpc 一致），结束后才进入拾取 */
  startCollectIntro() {
    const cx = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT - 96;
    const lines = [
      'A fire won\'t build itself… I have to gather fuel before the sun fully goes down.',
      'I need dry tinder, kindling, and fuel — eight good pieces in all.',
    ];

    this.introBg = this.add
      .rectangle(cx, boxY, GAME_WIDTH - 40, 138, 0x000000, 0.82)
      .setStrokeStyle(1, 0x5c4033, 0.85)
      .setDepth(2500);
    this.introTitle = this.add
      .text(cx, boxY - 46, 'Collecting Materials', {
        fontSize: '22px',
        color: '#e8dcc8',
      })
      .setOrigin(0.5)
      .setDepth(2501);
    this.introText = this.add
      .text(cx, boxY + 6, lines[0], {
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
      .text(cx, boxY + 58, 'Next', {
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
        this.beginCollectGameplay();
      }
    });
  }

  beginCollectGameplay() {
    this.collectGameplayActive = true;
    if (this.hudTopBar) this.hudTopBar.setAlpha(1);
    if (this.collectTitle) this.collectTitle.setAlpha(1);
    if (this.collectInstr) this.collectInstr.setAlpha(1);
    if (this.collectDialog) this.collectDialog.setAlpha(1);
    if (this.backpackIcon) this.backpackIcon.setAlpha(1);
    this.refreshStashDialog();
    this.groundItems.forEach((g) => {
      if (!g || !g.active || g.getData('taken')) return;
      g.setAlpha(1);
      g.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(g);
    });
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.input.off('drag');
    this.input.off('dragend');

    this.wetDialogTimer = null;
    this.sortUnlocked = false;
    this.collectGameplayActive = false;
    this.fireSiteCart = this.getFireSiteCart();
    const fcx = this.fireSiteCart.x;
    const fcy = this.fireSiteCart.y;

    this.isoC = FireIso.createConfig(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1e14, 1).setDepth(-250);
    FireIso.drawGround(this, this.isoC);
    this.drawPreparedFireSite(fcx, fcy);

    // Thin top strip — title + instruction only (no narrative); keep alpha low so the grid stays visible.
    const hudH = 96;
    this.hudTopBar = this.add
      .rectangle(GAME_WIDTH / 2, hudH / 2, GAME_WIDTH, hudH, 0x121610, 0.42)
      .setDepth(998)
      .setStrokeStyle(0)
      .setAlpha(0);

    this.collectTitle = this.add
      .text(GAME_WIDTH / 2, 18, 'Collecting Materials', {
        fontSize: '18px',
        color: '#e8f0e0',
      })
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);
    this.collectInstr = this.add
      .text(
        GAME_WIDTH / 2,
        44,
        'Walk: tap an item. Or drag it to the backpack. Need 8 valid pieces (tinder · kindling · fuel).',
        {
          fontSize: '12px',
          color: '#c5d4ba',
          align: 'center',
          lineSpacing: 4,
          wordWrap: { width: GAME_WIDTH - 40 },
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setAlpha(0);

    this.collectDialog = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 58, 'Temporary stash: 0 / 8 valid pieces.', {
        fontSize: '15px',
        color: '#f5e6d3',
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: GAME_WIDTH - 44 },
      })
      .setOrigin(0.5)
      .setDepth(1000)
      .setAlpha(0);

    const bx = GAME_WIDTH - 88;
    const by = GAME_HEIGHT - 102;
    this.backpackIcon = this.createBackpackIcon(bx, by);
    this.backpackIcon.setAlpha(0);
    this.backpackDropRect = new Phaser.Geom.Rectangle(bx - 52, by - 52, 104, 108);

    this.validInventory = [];
    this.validCount = 0;
    this.groundItems = [];
    const types = this.generate12Types();

    const slotPool = [];
    const STEP = 0.58;
    const pushSlots = (useScreenFloor) => {
      slotPool.length = 0;
      for (let gx = -3.35; gx <= 3.35; gx += STEP) {
        for (let gy = -1.55; gy <= 3.35; gy += STEP) {
          if (Math.hypot(gx - fcx, gy - fcy) < 1.32) continue;
          const pos = FireIso.cartesianToIso(this.isoC, gx, gy);
          if (useScreenFloor && pos.y < COLLECT_TOP_SCREEN_MIN_Y) continue;
          slotPool.push({
            gx: gx + Phaser.Math.FloatBetween(-0.08, 0.08),
            gy: gy + Phaser.Math.FloatBetween(-0.08, 0.08),
          });
        }
      }
    };
    pushSlots(true);
    if (slotPool.length < 16) pushSlots(false);
    Phaser.Utils.Array.Shuffle(slotPool);
    const positions = this.assignSlotsWithDampBias(types, slotPool, fcx, fcy);

    types.forEach((t, idx) => {
      const grid = positions[idx];
      const pos = FireIso.cartesianToIso(this.isoC, grid.gx, grid.gy);
      const item = this.addGroundItem(pos.x, pos.y, t, idx, false);
      item.setData('homeX', pos.x);
      item.setData('homeY', pos.y);
      item.setAlpha(0);
      this.groundItems.push(item);

      item.on('dragstart', (pointer) => {
        if (!this.collectGameplayActive) return;
        if (!item.active || item.getData('taken')) return;
        item.setData('ptrDownX', pointer.x);
        item.setData('ptrDownY', pointer.y);
        item.setDepth(COLLECT_DRAG_DEPTH);
      });

      item.on('dragend', (pointer) => {
        if (!this.collectGameplayActive) return;
        if (!item.active || item.getData('taken')) return;
        const hx = item.getData('homeX');
        const hy = item.getData('homeY');
        const moved = Phaser.Math.Distance.Between(
          item.getData('ptrDownX'),
          item.getData('ptrDownY'),
          pointer.x,
          pointer.y
        );
        if (moved < 18) {
          item.x = hx;
          item.y = hy;
          this.setCollectItemDepth(item);
          this.movePlayerThen(hx, hy, () => this.tryCollectItem(item));
          return;
        }
        if (Phaser.Geom.Rectangle.Contains(this.backpackDropRect, pointer.x, pointer.y)) {
          this.tryCollectItem(item);
          return;
        }
        this.tweens.add({
          targets: item,
          x: hx,
          y: hy,
          duration: 200,
          ease: 'Cubic.easeOut',
          onComplete: () => this.setCollectItemDepth(item),
        });
      });
    });

    this.openPackBtn = this.backpackIcon;
    this.startCollectIntro();
    addSceneBackButton(this);
  }

  /** 收满 8 件有效物后，禁止继续点击地面剩余物件 */
  freezeRemainingGroundItems() {
    this.groundItems.forEach((g) => {
      if (g && g.active && !g.getData('taken')) {
        g.disableInteractive();
        this.input.setDraggable(g, false);
        g.setAlpha(0.45);
      }
    });
  }

  getResumePayload() {
    return {};
  }
}
