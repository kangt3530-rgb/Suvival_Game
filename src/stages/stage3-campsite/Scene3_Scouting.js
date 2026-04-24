import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../config/GameConfig.js';
import {
  STAGE3_SCENE_KEYS,
  STAGE3_ASSETS,
  SCENE3_HOTSPOT_CONFIG,
  STAGE3_REGISTRY_KEYS,
} from './stage3Config.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';
import { createHotspotGroup } from '../../utils/hotspot.js';
import { attachHotspotDebugPanel } from '../../utils/hotspotDebugPanel.js';

/** Stage 3 — Scouting 主画面（四维度环境评估 hotspot） */
export default class Stage3ScoutingScene extends Phaser.Scene {
  constructor() {
    super({ key: STAGE3_SCENE_KEYS.SCOUTING });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image(STAGE3_ASSETS.BG_SCOUTING_MAIN.key,     gameAssetUrl(STAGE3_ASSETS.BG_SCOUTING_MAIN.file));
    this.load.image(STAGE3_ASSETS.BG_SCOUTING_OVERHEAD.key, gameAssetUrl(STAGE3_ASSETS.BG_SCOUTING_OVERHEAD.file));
    this.load.image(STAGE3_ASSETS.BG_SCOUTING_GROUND.key,   gameAssetUrl(STAGE3_ASSETS.BG_SCOUTING_GROUND.file));
    this.load.image(STAGE3_ASSETS.BG_SCOUTING_WIND.key,     gameAssetUrl(STAGE3_ASSETS.BG_SCOUTING_WIND.file));
    this.load.image(STAGE3_ASSETS.BG_SCOUTING_WATER.key,    gameAssetUrl(STAGE3_ASSETS.BG_SCOUTING_WATER.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_THINKING.key,    gameAssetUrl(STAGE3_ASSETS.PORTRAIT_THINKING.file));
  }

  create() {
    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // ── 主场景层 ──────────────────────────────────────────
    const bg = this.add.image(cx, cy, STAGE3_ASSETS.BG_SCOUTING_MAIN.key).setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, STAGE3_ASSETS.BG_SCOUTING_MAIN.key);
    scaleFullscreenBackgroundImage(bg);

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.2).setDepth(1);

    const portrait = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_THINKING.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });
    portrait.setAlpha(0);
    this.tweens.add({ targets: portrait, alpha: 1, duration: 600, ease: 'Sine.easeOut' });

    const dialog = createDialogBox(this, GENERIC_DIALOG);

    // ── 分支覆盖层（depth 3000，低于 hotspot 4000 / 对话框 4998）────
    const BRANCH_DEPTH = 3000;
    const branchImg = this.add
      .image(cx, cy, STAGE3_ASSETS.BG_SCOUTING_MAIN.key)
      .setOrigin(0.5, 0.5)
      .setDepth(BRANCH_DEPTH)
      .setVisible(false);
    scaleFullscreenBackgroundImage(branchImg);

    const backBtn = this.add
      .text(28, 28, '← Back', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#f5e6d3',
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0, 0)
      .setDepth(BRANCH_DEPTH + 1)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    const BRANCH_KEY_MAP = {
      overhead: STAGE3_ASSETS.BG_SCOUTING_OVERHEAD.key,
      ground:   STAGE3_ASSETS.BG_SCOUTING_GROUND.key,
      wind:     STAGE3_ASSETS.BG_SCOUTING_WIND.key,
      water:    STAGE3_ASSETS.BG_SCOUTING_WATER.key,
    };

    let branchOpen = false;
    let allHotspotsComplete = false;
    let sceneBackBtnRef = null; // addSceneBackButton 创建后赋值

    const openBranch = (id) => {
      const key = BRANCH_KEY_MAP[id];
      if (!key) return;
      branchOpen = true;
      // 分支层 depth 低于 hotspot，否则会叠在分支图之上
      this._setMainHotspotsVisible(false);
      branchImg.setTexture(key).setVisible(true);
      setTextureLinearByKey(this, key);
      scaleFullscreenBackgroundImage(branchImg);
      backBtn.setVisible(true);
      if (sceneBackBtnRef) sceneBackBtnRef.setVisible(false);
    };

    const closeBranch = () => {
      branchOpen = false;
      branchImg.setVisible(false);
      backBtn.setVisible(false);
      this._setMainHotspotsVisible(true);
      if (sceneBackBtnRef) sceneBackBtnRef.setVisible(true);
      if (allHotspotsComplete) {
        allHotspotsComplete = false;
        this._onAllHotspotsChecked(dialog, portrait);
      }
    };

    backBtn.on('pointerdown', () => closeBranch());

    // ── Hotspot 配置 ──────────────────────────────────────
    const rawChecked = this.registry.get(STAGE3_REGISTRY_KEYS.SCOUTING_CHECKED);
    const checkedIds = Array.isArray(rawChecked) ? rawChecked.slice() : [];
    const completedCount = checkedIds.length;

    const onHotspotClick = (id) => {
      // Water：独立子场景（Back 时写 registry + markChecked），不打开分支覆盖层
      if (id === 'water') {
        this._setMainHotspotsVisible(false);
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          transitionScene(this, STAGE3_SCENE_KEYS.SCOUTING_SUB_WATER);
        });
        return;
      }
      if (id === 'ground') {
        this._setMainHotspotsVisible(false);
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          transitionScene(this, STAGE3_SCENE_KEYS.SCOUTING_SUB_GROUND);
        });
        return;
      }
      if (id === 'wind') {
        this._setMainHotspotsVisible(false);
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          transitionScene(this, STAGE3_SCENE_KEYS.SCOUTING_SUB_WIND);
        });
        return;
      }
      if (id === 'overhead') {
        this._setMainHotspotsVisible(false);
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          transitionScene(this, STAGE3_SCENE_KEYS.SCOUTING_SUB_OVERHEAD);
        });
        return;
      }
    };

    const hotspotsConfig = Object.entries(SCENE3_HOTSPOT_CONFIG).map(([id, cfg]) => ({
      id,
      x: cfg.x,
      y: cfg.y,
      radius: cfg.radius,
      label: cfg.label,
      depth: 4000,
      debugDraggable: true,
      onClick: () => onHotspotClick(id),
      onDebugDrag: (newX, newY) => {
        SCENE3_HOTSPOT_CONFIG[id].x = newX;
        SCENE3_HOTSPOT_CONFIG[id].y = newY;
      },
    }));

    const allHotspotIds = Object.keys(SCENE3_HOTSPOT_CONFIG);

    const hotspotGroup = createHotspotGroup(this, {
      hotspots: hotspotsConfig,
      initialCheckedIds: checkedIds,
      onAllChecked: () => {
        // 不立即触发，等用户点 Back 回到主场景后再触发
        allHotspotsComplete = true;
      },
    });
    this._hotspotGroup = hotspotGroup;

    attachHotspotDebugPanel(this, hotspotGroup, {
      title: 'Scene 3 Scouting',
    });

    // ── 开场 / 从子画面返回后的进度一句（skipIntro 时直接隐藏） ──────────
    const boot = this.sys.settings.data || {};
    const introLine =
      "Alright… ground, water, wind, and what's above me. Let's take a proper look.";
    const progressByRemaining = {
      3: 'Three more to go…',
      2: 'Two more to go…',
      1: 'One more to go…',
    };

    if (boot.skipIntro) {
      portrait.setAlpha(0);
      dialog.bg.setAlpha(0);
      dialog.text.setAlpha(0);
      dialog.arrow.setAlpha(0);
    } else if (completedCount === 0) {
      dialog.say(introLine, () => {
        this.input.once('pointerdown', () => {
          this.hidePortraitAndDialog(dialog, portrait);
        });
      });
    } else if (completedCount < 4) {
      const remaining = 4 - completedCount;
      const progressLine = progressByRemaining[remaining];
      if (progressLine) {
        dialog.clear();
        this.showPortraitAndDialog(dialog, portrait);
        dialog.say(progressLine, () => {
          this.input.once('pointerdown', () => {
            this.hidePortraitAndDialog(dialog, portrait);
          });
        });
      }
    } else {
      this.time.delayedCall(100, () => {
        this._onAllHotspotsChecked(dialog, portrait);
      });
    }

    // ── 按 H 直接跳到 inspect ────────────────────────────
    this.input.keyboard.on('keydown-H', () => {
      this.registry.remove(STAGE3_REGISTRY_KEYS.SCOUTING_CHECKED);
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        transitionScene(this, SCENE_KEYS.FIRE_SPOT_INSPECT);
      });
    });

    this._branchOpen = () => branchOpen;
    sceneBackBtnRef = addSceneBackButton(this);
  }

  /** 主画面四个维度 hotspot（depth 4000）在分支/子场景切换时隐藏，避免叠在分支图或残留到下一 scene */
  _setMainHotspotsVisible(visible) {
    const g = this._hotspotGroup;
    if (!g || !g.hotspotsById) return;
    const v = !!visible;
    for (const api of g.hotspotsById.values()) {
      api.container.setVisible(v);
    }
  }

  hidePortraitAndDialog(dialog, portrait, durationMs = 300) {
    this.tweens.add({
      targets: [portrait, dialog.bg, dialog.text, dialog.arrow],
      alpha: 0,
      duration: durationMs,
      ease: 'Sine.easeOut',
    });
  }

  showPortraitAndDialog(dialog, portrait, durationMs = 300) {
    this.tweens.add({
      targets: [portrait, dialog.bg, dialog.text],
      alpha: 1,
      duration: durationMs,
      ease: 'Sine.easeIn',
    });
  }

  _onAllHotspotsChecked(dialog, portrait) {
    const outroLines = [
      'Alright. I know what to look for now.',
      "Let me see what's actually around here…",
    ];

    // 避免淡入时仍显示开场独白的旧文案（dialog.text 在隐藏期间仍保留全文）
    dialog.clear();

    this.showPortraitAndDialog(dialog, portrait);
    this.time.delayedCall(300, () => {
      _runLines(outroLines, dialog, this, () => {
        this._playAfterAWhileTransition();
      }, { startLine: 0 });
    });
  }

  _playAfterAWhileTransition() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1)
        .setOrigin(0.5)
        .setDepth(99999);
      const sub = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '(After a while…)', {
          fontSize: '24px',
          color: '#ffffff',
          fontStyle: 'italic',
        })
        .setOrigin(0.5)
        .setDepth(100000)
        .setAlpha(0);
      this.tweens.add({ targets: sub, alpha: 0.8, duration: 1000, ease: 'Sine.easeOut' });
      this.time.delayedCall(1500, () => {
        this.tweens.add({
          targets: sub,
          alpha: 0,
          duration: 400,
          ease: 'Sine.easeIn',
          onComplete: () => sub.destroy(),
        });
        this.registry.remove(STAGE3_REGISTRY_KEYS.SCOUTING_CHECKED);
        this.time.delayedCall(500, () => {
          transitionScene(this, SCENE_KEYS.FIRE_SPOT_INSPECT);
        });
      });
    });
  }

  getResumePayload() {
    return {};
  }
}

// 注册：在 MainConfig.js 的 SCENE_KEY_TO_CLASS 和 DEFAULT_SCENE_ORDER 中手动添加
