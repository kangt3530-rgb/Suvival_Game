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

const SCENE3_DESIGN_WIDTH = 2560;
const SCENE3_DESIGN_HEIGHT = 1440;

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

    const sx = GAME_WIDTH / SCENE3_DESIGN_WIDTH;
    const sy = GAME_HEIGHT / SCENE3_DESIGN_HEIGHT;

    const onHotspotClick = (id) => {
      hotspotGroup.markChecked(id);
      const current = this.registry.get(STAGE3_REGISTRY_KEYS.SCOUTING_CHECKED);
      const list = Array.isArray(current) ? current.slice() : [];
      if (!list.includes(id)) {
        this.registry.set(STAGE3_REGISTRY_KEYS.SCOUTING_CHECKED, [...list, id]);
      }
      openBranch(id);
    };

    const hotspotsConfig = Object.entries(SCENE3_HOTSPOT_CONFIG).map(([id, cfg]) => ({
      id,
      x: cfg.x * sx,
      y: cfg.y * sy,
      radius: cfg.radius * sx,
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

    // ── 开场对白（skipIntro 时直接隐藏，进入热区） ──────────
    const boot = this.sys.settings.data || {};
    const introLines = [
      "Alright… ground, water, wind, and what's above me. Let's take a proper look.",
    ];
    if (boot.skipIntro) {
      portrait.setAlpha(0);
      dialog.bg.setAlpha(0);
      dialog.text.setAlpha(0);
      dialog.arrow.setAlpha(0);
    } else {
      dialog.say(introLines[0], () => {
        this.input.once('pointerdown', () => {
          this.hidePortraitAndDialog(dialog, portrait);
        });
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
      "Let me see what's around here…",
    ];
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
