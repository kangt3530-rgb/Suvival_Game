/**
 * 营地选址主场景 — 状态 1–9 由 ./Scene*_*.js 的 mixin 注入 build 方法。
 */
import { addSceneBackButton } from '../../utils/SceneNav.js';
import { TEXT_DIALOG_BODY } from '../../utils/typography.js';
import { mixinCampSelectScene1 } from './Scene1_EnterForest.js';
import { mixinCampSelectScene2 } from './Scene2_NpcEncounter.js';
import { mixinCampSelectScene3 } from './Scene3_WaterDistance.js';
import { mixinCampSelectScene4 } from './Scene4_TerrainTriple.js';
import { mixinCampSelectScene5 } from './Scene5_WindExposure.js';
import { mixinCampSelectScene6 } from './Scene6_ScanOverhead.js';
import { mixinCampSelectScene7 } from './Scene7_FinalDecision.js';
import { mixinCampSelectScene8 } from './Scene8_FinalCheck.js';
import { mixinCampSelectScene9 } from './Scene9_HerbDiscovery.js';

export default class CampSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CampSelectScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#2a1f14');

    this.isoAnchorX = GAME_WIDTH / 2;
    this.isoAnchorY = GAME_HEIGHT * 0.35;
    this.gameState = 1;
    this.stageObjects = [];
    this.campsiteChoice = null;

    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x111133, 0.35)
      .setOrigin(0, 0)
      .setDepth(-1);

    this.eveningDimOverlay = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0612, 0)
      .setOrigin(0, 0)
      .setDepth(50)
      .setScrollFactor(0);

    // boxH=130 → flush bottom (center at GAME_HEIGHT-65, bottom at GAME_HEIGHT)
    this.dialogBg = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 65,
      GAME_WIDTH - 40,
      130,
      0x000000,
      0.62
    );
    this.dialogBg.setStrokeStyle(1, 0x5c4033, 0.8);
    this.dialogBg.setDepth(5000);

    this.dialogText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 65, '', {
        ...TEXT_DIALOG_BODY,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 80 },
      })
      .setOrigin(0.5)
      .setDepth(5001);

    this._scene1IntroPointer = (pointer) => this.onScene1IntroPointer(pointer);

    const boot = this.sys.settings.data;
    const startState = boot && typeof boot.startState === 'number' ? boot.startState : 1;
    this.enterState(startState);
    addSceneBackButton(this);
  }

  /** 2:1 等距：屏幕 x = 锚点 + (cartX - cartY)，y = 锚点 + (cartX + cartY) / 2 */
  cartesianToIso(cartX, cartY) {
    return {
      x: this.isoAnchorX + (cartX - cartY),
      y: this.isoAnchorY + (cartX + cartY) / 2,
    };
  }

  /**
   * 笛卡尔「地图格」上、以 (cartX,cartY) 为中心、半边长 size 的轴对齐正方形
   * → 屏幕上为四条边均倾斜的等距菱形（非轴对齐矩形）。占位与后续菱形贴图对齐用此口径。
   */
  getIsoTileCorners(cartX, cartY, size) {
    return {
      tl: this.cartesianToIso(cartX - size, cartY - size),
      tr: this.cartesianToIso(cartX + size, cartY - size),
      br: this.cartesianToIso(cartX + size, cartY + size),
      bl: this.cartesianToIso(cartX - size, cartY + size),
    };
  }

  /**
   * Scene 3 等距菱形地块 + 标签；合并包围盒矩形 + Zone(Rectangle.Contains)，避免 Graphics 直接交互偏移。
   * @param {{ cartX: number, cartY: number, size: number, color: number, label: string, onPointerDown: function }} opts
   */
  drawIsoHotspot(opts) {
    const { cartX, cartY, size, color, label, onPointerDown } = opts;

    const c = this.getIsoTileCorners(cartX, cartY, size);
    const tileXs = [c.tl.x, c.tr.x, c.br.x, c.bl.x];
    const tileYs = [c.tl.y, c.tr.y, c.br.y, c.bl.y];

    const g = this.add.graphics();
    this.pushStage(g);
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(c.tl.x, c.tl.y);
    g.lineTo(c.tr.x, c.tr.y);
    g.lineTo(c.br.x, c.br.y);
    g.lineTo(c.bl.x, c.bl.y);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokePath();

    const center = this.cartesianToIso(cartX, cartY);
    const bottomY = Math.max(c.bl.y, c.br.y, c.tl.y, c.tr.y);
    const lbl = this.add
      .text(center.x, bottomY + 10, label, {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '13px',
        color: '#f0e6dc',
      })
      .setOrigin(0.5, 0)
      .setDepth(WORLD_UI_LABEL_DEPTH);
    this.pushStage(lbl);

    const tb = lbl.getBounds();
    const tr = tb.x + tb.width;
    const tbottom = tb.y + tb.height;
    const pad = 6;
    const minX = Math.min(tileXs[0], tileXs[1], tileXs[2], tileXs[3], tb.x) - pad;
    const minY = Math.min(tileYs[0], tileYs[1], tileYs[2], tileYs[3], tb.y) - pad;
    const maxX = Math.max(tileXs[0], tileXs[1], tileXs[2], tileXs[3], tr) + pad;
    const maxY = Math.max(tileYs[0], tileYs[1], tileYs[2], tileYs[3], tbottom) + pad;
    const bw = Math.max(maxX - minX, 1);
    const bh = Math.max(maxY - minY, 1);

    g.setDepth(center.y + 20);

    const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
    zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, bw, bh), Phaser.Geom.Rectangle.Contains);
    zone.setDepth(center.y + 22);
    this.pushStage(zone);

    zone.on('pointerdown', (pointer) => {
      this.movePlayerThen(pointer.x, pointer.y, () => {
        onPointerDown(pointer);
      });
    });
    zone.on('pointerover', () => {
      this.input.setDefaultCursor('pointer');
      this.tweens.add({ targets: g, alpha: 0.78, duration: 100, ease: 'Sine.easeOut' });
    });
    zone.on('pointerout', () => {
      this.input.setDefaultCursor('default');
      this.tweens.add({ targets: g, alpha: 1, duration: 100, ease: 'Sine.easeOut' });
    });

    return { g, lbl, zone };
  }

  clearStageLayer() {
    this.stageObjects.forEach((o) => {
      if (o && o.destroy) o.destroy();
    });
    this.stageObjects = [];
  }

  /**
   * gameState 1–9 = Draft Scenes 1–9（营地线）。
   * Scene 9（Discovering the Herbs）为营地点击采集，结束后进入生火链起点 FIRE_NPC；
   * 深夜火把寻草（HerbHuntScene / Scene 7）仅在 Maintain 胜利后进入，勿与此混淆。
   */
  enterState(state) {
    if (state !== 1) {
      this.input.off('pointerdown', this._scene1IntroPointer);
      this.scene1IntroActive = false;
    }
    this.clearStageLayer();
    this.gameState = state;
    if (state === 1) {
      this.buildScene1IntroSequence();
    } else if (state === 2) {
      this.buildScene2NPCEncounter();
    } else if (state === 3) {
      this.buildScene3WaterDistance();
    } else if (state === 4) {
      this.buildScene4TerrainTriple();
    } else if (state === 5) {
      this.buildScene5WindExposure();
    } else if (state === 6) {
      this.buildScene6OverheadScan();
    } else if (state === 7) {
      this.buildScene7CompareCampsites();
    } else if (state === 8) {
      this.buildScene8FinalSafetyCheck();
    } else if (state === 9) {
      this.buildScene9HerbsDiscovery();
    }
    this.placePlayerForState(state);
  }

  pushStage(obj) {
    this.stageObjects.push(obj);
  }

  /** 与 Scene0 AR3ForestScene 一致：白色圆占位玩家（不放入 stageObjects，避免 clearStageLayer 销毁）。 */
  ensurePlayerDot() {
    if (this.playerDot && this.playerDot.active) return;
    this.playerDot = this.add
      .circle(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, 20, 0xffffff)
      .setDepth(WORLD_PLAYER_MARKER_DEPTH);
  }

  movePlayerThen(x, y, onComplete) {
    this.ensurePlayerDot();
    this.tweens.killTweensOf(this.playerDot);
    const dist = Phaser.Math.Distance.Between(this.playerDot.x, this.playerDot.y, x, y);
    if (dist < 6) {
      if (onComplete) onComplete();
      return;
    }
    const dur = Phaser.Math.Clamp(220 + dist * 0.42, 280, 1000);
    this.tweens.add({
      targets: this.playerDot,
      x,
      y,
      duration: dur,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (onComplete) onComplete();
      },
    });
  }

  /** 进入各关时重置玩家站位（Scene 1 四地块阶段在 buildScene1FourTerrains 末尾再调一次）。 */
  placePlayerForState(state) {
    this.ensurePlayerDot();
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    let px = w * 0.35;
    let py = h * 0.68;
    if (state === 1) {
      px = w * 0.38;
      py = h * 0.72;
    } else if (state === 2) {
      px = w * 0.26;
      py = h * 0.58;
    } else if (state === 3 || state === 4 || state === 5 || state === 6) {
      px = this.isoAnchorX - 20;
      py = this.isoAnchorY + 105;
    } else if (state === 7) {
      px = this.isoAnchorX - 90;
      py = this.isoAnchorY + 95;
    } else if (state === 8) {
      const baseX = 230;
      const baseY = 168;
      const ctr = this.cartesianToIso(baseX, baseY);
      px = ctr.x;
      py = ctr.y + 28;
    } else if (state === 9) {
      px = w * 0.4;
      py = h * 0.735;
    }
    this.tweens.killTweensOf(this.playerDot);
    this.playerDot.setPosition(px, py);
  }

  /**
   * Scene 1：先仅对白 + 全屏点击；不显示地块。
   */
  getResumePayload() {
    return { startState: this.gameState };
  }

  /** Back 优先退回营地上一关（state），到 state 1 再退回栈中上一 Phaser 场景 */
  tryConsumeInternalBack() {
    if (this.gameState > 1) {
      this.enterState(this.gameState - 1);
      return true;
    }
    return false;
  }
}

mixinCampSelectScene1(CampSelectScene);
mixinCampSelectScene2(CampSelectScene);
mixinCampSelectScene3(CampSelectScene);
mixinCampSelectScene4(CampSelectScene);
mixinCampSelectScene5(CampSelectScene);
mixinCampSelectScene6(CampSelectScene);
mixinCampSelectScene7(CampSelectScene);
mixinCampSelectScene8(CampSelectScene);
mixinCampSelectScene9(CampSelectScene);
