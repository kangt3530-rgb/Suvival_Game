import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../config/GameConfig.js';
import { STAGE3_SCENE_KEYS, STAGE3_ASSETS, STAGE3_REGISTRY_KEYS } from './stage3Config.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { transitionScene } from '../../utils/SceneNav.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';

const MORNING_LINES = [
  '…I made it through.',
  'Morning light… everything looks different now.',
  'Wait… those leaves. That shape, that color…',
  'These match the ones in my notes. Same structure. Same edges.',
  '…This is it.',
  'They were here all along…',
  'This time… I can save them.',
];

/** Stage 3 — Scene 6 晨光、草药、感慨 → Stage 4 */
export default class Stage3MorningScene extends Phaser.Scene {
  constructor() {
    super({ key: STAGE3_SCENE_KEYS.MORNING });
  }

  preload() {
    applyAssetPathPrefix(this);
    const raw = this.registry.get(STAGE3_REGISTRY_KEYS.CHOSEN_SITE);
    const site = raw === 'B' ? 'B' : 'A';
    if (raw !== 'A' && raw !== 'B') {
      console.warn('[Stage3 Morning] CHOSEN_SITE missing or invalid; defaulting to A');
    }
    const morning = site === 'B' ? STAGE3_ASSETS.BG_SITE_B_MORNING : STAGE3_ASSETS.BG_SITE_A_MORNING;
    this.load.image(morning.key, gameAssetUrl(morning.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_THINKING.key, gameAssetUrl(STAGE3_ASSETS.PORTRAIT_THINKING.file));
  }

  create() {
    const raw = this.registry.get(STAGE3_REGISTRY_KEYS.CHOSEN_SITE);
    this._site = raw === 'B' ? 'B' : 'A';
    if (raw !== 'A' && raw !== 'B') {
      console.warn('[Stage3 Morning] CHOSEN_SITE missing or invalid; defaulting to A');
    }

    const morningAsset = this._site === 'B' ? STAGE3_ASSETS.BG_SITE_B_MORNING : STAGE3_ASSETS.BG_SITE_A_MORNING;

    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(800, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this._bgImage = this.add.image(cx, cy, morningAsset.key).setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, morningAsset.key);
    scaleFullscreenBackgroundImage(this._bgImage);

    this._dimOverlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.1).setDepth(1);

    this._portrait = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_THINKING.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });
    this._portrait.setAlpha(0);
    this.tweens.add({ targets: this._portrait, alpha: 1, duration: 800, ease: 'Sine.easeOut' });

    this._dialog = createDialogBox(this, GENERIC_DIALOG);

    _runLines(MORNING_LINES, this._dialog, this, () => this._endScene(), { startLine: 0 });
  }

  _endScene() {
    this.tweens.add({
      targets: [this._portrait, this._dialog.bg, this._dialog.text, this._dialog.arrow],
      alpha: 0,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.cameras.main.fadeOut(1000, 0, 0, 0);
        this.time.delayedCall(1000, () => {
          console.log('[Stage 3] Complete. Chosen site:', this._site, '→ transitioning to Stage 4');
          transitionScene(this, SCENE_KEYS.FIRE_NPC);
        });
      },
    });
  }

  getResumePayload() {
    return {};
  }
}
