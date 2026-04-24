import { GAME_WIDTH, GAME_HEIGHT } from '../../config/GameConfig.js';
import {
  STAGE3_SCENE_KEYS,
  STAGE3_ASSETS,
  SCENE4_INSPECTION_HOTSPOT_CONFIG,
  STAGE3_REGISTRY_KEYS,
} from './stage3Config.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';
import { createHotspotGroup } from '../../utils/hotspot.js';
import { attachHotspotDebugPanel } from '../../utils/hotspotDebugPanel.js';

/** Stage 3 — Scene 4 营地考察主画面（Site A / Site B） */
export default class Stage3SiteInspectionScene extends Phaser.Scene {
  constructor() {
    super({ key: STAGE3_SCENE_KEYS.SITE_INSPECTION });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image(STAGE3_ASSETS.BG_INSPECTION_MAIN.key, gameAssetUrl(STAGE3_ASSETS.BG_INSPECTION_MAIN.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_THINKING.key, gameAssetUrl(STAGE3_ASSETS.PORTRAIT_THINKING.file));
  }

  create() {
    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.image(cx, cy, STAGE3_ASSETS.BG_INSPECTION_MAIN.key).setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, STAGE3_ASSETS.BG_INSPECTION_MAIN.key);
    scaleFullscreenBackgroundImage(bg);

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.2).setDepth(1);

    const portrait = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_THINKING.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });
    portrait.setAlpha(0);
    this.tweens.add({ targets: portrait, alpha: 1, duration: 600, ease: 'Sine.easeOut' });

    const dialog = createDialogBox(this, GENERIC_DIALOG);

    const rawChecked = this.registry.get(STAGE3_REGISTRY_KEYS.INSPECTION_CHECKED);
    const checkedIds = Array.isArray(rawChecked) ? rawChecked.slice() : [];
    const inspectionIds = Object.keys(SCENE4_INSPECTION_HOTSPOT_CONFIG);
    const resumeAlreadyComplete =
      inspectionIds.length > 0 && inspectionIds.every((id) => checkedIds.includes(id));

    /** @type {ReturnType<typeof createHotspotGroup>|null} */
    let hotspotGroup = null;

    const onHotspotClick = (id) => {
      if (id === 'siteA') {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          transitionScene(this, STAGE3_SCENE_KEYS.SITE_CLOSEUP, { site: 'A' });
        });
        return;
      }
      if (id === 'siteB') {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          transitionScene(this, STAGE3_SCENE_KEYS.SITE_CLOSEUP, { site: 'B' });
        });
        return;
      }
    };

    const hotspotsConfig = Object.entries(SCENE4_INSPECTION_HOTSPOT_CONFIG).map(([id, cfg]) => ({
      id,
      x: cfg.x,
      y: cfg.y,
      radius: cfg.radius,
      label: cfg.label,
      depth: 4000,
      debugDraggable: true,
      onClick: () => onHotspotClick(id),
      onDebugDrag: (newX, newY) => {
        SCENE4_INSPECTION_HOTSPOT_CONFIG[id].x = newX;
        SCENE4_INSPECTION_HOTSPOT_CONFIG[id].y = newY;
      },
    }));

    const goToDecision = () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        transitionScene(this, STAGE3_SCENE_KEYS.DECISION);
      });
    };

    const runAllSitesExploredFlow = () => {
      if (resumeAlreadyComplete) {
        this.time.delayedCall(500, goToDecision);
        return;
      }
      goToDecision();
    };

    hotspotGroup = createHotspotGroup(this, {
      hotspots: hotspotsConfig,
      initialCheckedIds: checkedIds,
      onAllChecked: () => {
        runAllSitesExploredFlow();
      },
    });
    this._hotspotGroup = hotspotGroup;

    attachHotspotDebugPanel(this, hotspotGroup, {
      title: 'Scene 4 Inspection',
    });

    const introLineFirst = 'Two spots caught my eye. Let me take a closer look at each.';
    const introLineAfterFirstSite = 'Let me check another one.';
    const hasInspectedAnySite = checkedIds.some((id) => id === 'siteA' || id === 'siteB');
    const introLine = hasInspectedAnySite ? introLineAfterFirstSite : introLineFirst;

    if (!resumeAlreadyComplete) {
      dialog.say(introLine, () => {
        this.input.once('pointerdown', () => {
          this.hidePortraitAndDialog(dialog, portrait);
        });
      });
    }

    addSceneBackButton(this);
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

  getResumePayload() {
    return {};
  }
}

// 注册：在 MainConfig.js 的 SCENE_KEY_TO_CLASS 和 DEFAULT_SCENE_ORDER 中手动添加
