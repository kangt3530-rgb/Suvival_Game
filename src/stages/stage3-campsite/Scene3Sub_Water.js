import { GAME_WIDTH, GAME_HEIGHT } from '../../config/GameConfig.js';
import {
  STAGE3_SCENE_KEYS,
  STAGE3_ASSETS,
  SCENE3_WATER_HOTSPOT_CONFIG,
  STAGE3_REGISTRY_KEYS,
} from './stage3Config.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { SCENE_NAV_STACK, SCENE_RESUME } from '../../utils/SceneNav.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';
import { createHotspotGroup } from '../../utils/hotspot.js';
import { attachHotspotDebugPanel } from '../../utils/hotspotDebugPanel.js';

const SCENE3_DESIGN_WIDTH = 2560;
const SCENE3_DESIGN_HEIGHT = 1440;

/** Stage 3 — Scouting 子画面：Water */
export default class Stage3Scene3SubWaterScene extends Phaser.Scene {
  constructor() {
    super({ key: STAGE3_SCENE_KEYS.SCOUTING_SUB_WATER });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image(STAGE3_ASSETS.BG_SCOUTING_WATER.key, gameAssetUrl(STAGE3_ASSETS.BG_SCOUTING_WATER.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_THINKING.key, gameAssetUrl(STAGE3_ASSETS.PORTRAIT_THINKING.file));
  }

  create() {
    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.image(cx, cy, STAGE3_ASSETS.BG_SCOUTING_WATER.key).setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, STAGE3_ASSETS.BG_SCOUTING_WATER.key);
    scaleFullscreenBackgroundImage(bg);

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.2).setDepth(1);

    const portrait = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_THINKING.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });

    const dialog = createDialogBox(this, GENERIC_DIALOG);

    const rawSub = this.registry.get(STAGE3_REGISTRY_KEYS.SCOUTING_SUB_WATER_CHECKED);
    const checkedIds = Array.isArray(rawSub) ? rawSub.slice() : [];
    const waterSubIds = Object.keys(SCENE3_WATER_HOTSPOT_CONFIG);
    const resumeSubComplete =
      waterSubIds.length > 0 && waterSubIds.every((id) => checkedIds.includes(id));

    if (resumeSubComplete) {
      portrait.setAlpha(0);
      dialog.bg.setAlpha(0);
      dialog.text.setAlpha(0);
      dialog.arrow.setAlpha(0);
    } else {
      portrait.setAlpha(0);
      this.tweens.add({ targets: portrait, alpha: 1, duration: 600, ease: 'Sine.easeOut' });
    }

    const sx = GAME_WIDTH / SCENE3_DESIGN_WIDTH;
    const sy = GAME_HEIGHT / SCENE3_DESIGN_HEIGHT;

    const backBtn = this.add
      .text(16, 14, 'Back', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '15px',
        color: '#f5ecd8',
        backgroundColor: '#3d3228',
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0, 0)
      .setDepth(200000)
      .setScrollFactor(0)
      .setAlpha(0.35);

    const handleBackClick = () => {
      const mainChecked = this.registry.get(STAGE3_REGISTRY_KEYS.SCOUTING_CHECKED);
      const ml = Array.isArray(mainChecked) ? mainChecked.slice() : [];
      if (!ml.includes('water')) ml.push('water');
      this.registry.set(STAGE3_REGISTRY_KEYS.SCOUTING_CHECKED, ml);
      this.registry.remove(STAGE3_REGISTRY_KEYS.SCOUTING_SUB_WATER_CHECKED);

      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        if (SCENE_NAV_STACK.length > 0) {
          const prevKey = SCENE_NAV_STACK.pop();
          let data = SCENE_RESUME[prevKey];
          if (data === undefined || data === null) data = {};
          this.scene.start(prevKey, data);
        } else {
          this.scene.start(STAGE3_SCENE_KEYS.SCOUTING);
        }
      });
    };

    let backActivated = false;
    const activateBackButton = () => {
      if (backActivated) return;
      backActivated = true;
      this.tweens.add({
        targets: backBtn,
        alpha: 1,
        duration: 300,
        ease: 'Sine.easeIn',
        onComplete: () => {
          backBtn.setInteractive({ useHandCursor: true });
          backBtn.on('pointerover', () => backBtn.setStyle({ backgroundColor: '#524638' }));
          backBtn.on('pointerout', () => backBtn.setStyle({ backgroundColor: '#3d3228' }));
          backBtn.once('pointerdown', handleBackClick);
        },
      });
    };

    const subLineQueue = [];
    let subVisualBusy = false;

    const pumpSubVisual = () => {
      if (subVisualBusy || subLineQueue.length === 0) return;
      subVisualBusy = true;
      const line = subLineQueue.shift();
      dialog.clear();
      this.showPortraitAndDialog(dialog, portrait);
      this.time.delayedCall(300, () => {
        dialog.say(line, () => {
          this.time.delayedCall(100, () => {
            this.input.once('pointerdown', () => {
              this.hidePortraitAndDialog(dialog, portrait);
              this.time.delayedCall(300, () => {
                subVisualBusy = false;
                pumpSubVisual();
              });
            });
          });
        });
      });
    };

    const enqueueSubVisual = (line) => {
      subLineQueue.push(line);
      pumpSubVisual();
    };

    /** @type {ReturnType<typeof createHotspotGroup>|null} */
    let hotspotGroup = null;

    const handleSubHotspotClick = (id) => {
      const raw = this.registry.get(STAGE3_REGISTRY_KEYS.SCOUTING_SUB_WATER_CHECKED);
      const list = Array.isArray(raw) ? raw.slice() : [];
      if (list.includes(id)) return;

      hotspotGroup.markChecked(id);
      if (!list.includes(id)) {
        this.registry.set(STAGE3_REGISTRY_KEYS.SCOUTING_SUB_WATER_CHECKED, [...list, id]);
      }

      const line =
        id === 'close'
          ? "The ground's damp here… water's right there, but if it rains tonight, this spot could flood."
          : "A bit of a walk for water… but the ground feels dry. Safer if the weather turns.";

      enqueueSubVisual(line);
    };

    const hotspotsConfig = Object.entries(SCENE3_WATER_HOTSPOT_CONFIG).map(([id, cfg]) => ({
      id,
      x: cfg.x * sx,
      y: cfg.y * sy,
      radius: cfg.radius * sx,
      label: cfg.label,
      depth: 4000,
      debugDraggable: true,
      onClick: () => handleSubHotspotClick(id),
      onDebugDrag: (newX, newY) => {
        SCENE3_WATER_HOTSPOT_CONFIG[id].x = newX;
        SCENE3_WATER_HOTSPOT_CONFIG[id].y = newY;
      },
    }));

    hotspotGroup = createHotspotGroup(this, {
      hotspots: hotspotsConfig,
      initialCheckedIds: checkedIds,
      onAllChecked: () => {
        activateBackButton();
      },
    });
    this._hotspotGroup = hotspotGroup;

    attachHotspotDebugPanel(this, hotspotGroup, {
      title: 'Water Sub',
    });

    const introLine = 'Let me check the water. How close is too close?';

    if (!resumeSubComplete) {
      dialog.say(introLine, () => {
        this.input.once('pointerdown', () => {
          this.hidePortraitAndDialog(dialog, portrait);
        });
      });
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

  getResumePayload() {
    return {};
  }
}
