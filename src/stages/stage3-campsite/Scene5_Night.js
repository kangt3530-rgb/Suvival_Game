import { GAME_WIDTH, GAME_HEIGHT } from '../../config/GameConfig.js';
import { STAGE3_SCENE_KEYS, STAGE3_ASSETS, STAGE3_REGISTRY_KEYS } from './stage3Config.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';
import { transitionScene } from '../../utils/SceneNav.js';

const PART1_LINES = [
  'Alright. This is home for tonight.',
  "…It's not perfect. But it will have to do.",
  'I just need to be ready for what comes.',
];

const PART2_LINES_A = [
  "The wind's really picking up out there…",
  '…Hold together, up there.',
];

const PART2_LINES_B = [
  'Cold tonight… but the sky is clear.',
  '…I can see everything from up here.',
];

/** Stage 3 — Scene 5 扎营入夜 → 深夜 */
export default class Stage3NightScene extends Phaser.Scene {
  constructor() {
    super({ key: STAGE3_SCENE_KEYS.NIGHT });
  }

  preload() {
    applyAssetPathPrefix(this);
    const raw = this.registry.get(STAGE3_REGISTRY_KEYS.CHOSEN_SITE);
    const site = raw === 'B' ? 'B' : 'A';
    if (raw !== 'A' && raw !== 'B') {
      console.warn('[Stage3 Night] CHOSEN_SITE missing or invalid; defaulting to A');
    }
    const dusk = site === 'B' ? STAGE3_ASSETS.BG_SITE_B_DUSK : STAGE3_ASSETS.BG_SITE_A_DUSK;
    const night = site === 'B' ? STAGE3_ASSETS.BG_SITE_B_NIGHT : STAGE3_ASSETS.BG_SITE_A_NIGHT;
    this.load.image(dusk.key, gameAssetUrl(dusk.file));
    this.load.image(night.key, gameAssetUrl(night.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_THINKING.key, gameAssetUrl(STAGE3_ASSETS.PORTRAIT_THINKING.file));
  }

  create() {
    const raw = this.registry.get(STAGE3_REGISTRY_KEYS.CHOSEN_SITE);
    this._site = raw === 'B' ? 'B' : 'A';
    if (raw !== 'A' && raw !== 'B') {
      console.warn('[Stage3 Night] CHOSEN_SITE missing or invalid; defaulting to A');
    }

    const duskAsset = this._site === 'B' ? STAGE3_ASSETS.BG_SITE_B_DUSK : STAGE3_ASSETS.BG_SITE_A_DUSK;
    const nightAsset = this._site === 'B' ? STAGE3_ASSETS.BG_SITE_B_NIGHT : STAGE3_ASSETS.BG_SITE_A_NIGHT;
    this._nightBgKey = nightAsset.key;

    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this._bgImage = this.add.image(cx, cy, duskAsset.key).setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, duskAsset.key);
    scaleFullscreenBackgroundImage(this._bgImage);

    this._dimOverlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.2).setDepth(1);

    this._portrait = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_THINKING.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });
    this._portrait.setAlpha(0);
    this.tweens.add({ targets: this._portrait, alpha: 1, duration: 600, ease: 'Sine.easeOut' });

    this._dialog = createDialogBox(this, GENERIC_DIALOG);

    this._part2Lines = this._site === 'B' ? PART2_LINES_B : PART2_LINES_A;

    _runLines(PART1_LINES, this._dialog, this, () => this._fadeOutPortraitAndDialogForTransition(), {
      startLine: 0,
    });
  }

  _fadeOutPortraitAndDialogForTransition() {
    this.tweens.add({
      targets: [this._portrait, this._dialog.bg, this._dialog.text, this._dialog.arrow],
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this._playTransitionToNight();
      },
    });
  }

  _playTransitionToNight() {
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(600, () => {
      const blocker = this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1)
        .setOrigin(0.5)
        .setDepth(99999);
      const sub = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '(Later that night…)', {
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
          onComplete: () => {
            sub.destroy();
            this._bgImage.setTexture(this._nightBgKey);
            setTextureLinearByKey(this, this._nightBgKey);
            scaleFullscreenBackgroundImage(this._bgImage);
            this._dimOverlay.setAlpha(0.35);
            this.cameras.main.fadeIn(800, 0, 0, 0);
            this.time.delayedCall(800, () => {
              blocker.destroy();
              this.tweens.add({
                targets: [this._portrait, this._dialog.bg, this._dialog.text, this._dialog.arrow],
                alpha: 1,
                duration: 600,
                ease: 'Sine.easeIn',
                onComplete: () => this._playNightPart(),
              });
            });
          },
        });
      });
    });
  }

  _playNightPart() {
    this._dialog.clear();
    _runLines(this._part2Lines, this._dialog, this, () => this._endScene(), { startLine: 0 });
  }

  _endScene() {
    this.tweens.add({
      targets: [this._portrait, this._dialog.bg, this._dialog.text, this._dialog.arrow],
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.time.delayedCall(700, () => {
          transitionScene(this, STAGE3_SCENE_KEYS.MORNING);
        });
      },
    });
  }

  getResumePayload() {
    return {};
  }
}
