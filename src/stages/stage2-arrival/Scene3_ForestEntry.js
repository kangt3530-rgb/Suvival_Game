import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../config/GameConfig.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';

/** 森林小径入口 — 对白后前往营地 */
export default class Scene3ForestEntry extends Phaser.Scene {
  constructor() {
    super({ key: 'AR3ForestScene' });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image('bg_forest_path', gameAssetUrl('forest-path.png'));
    this.load.image('ar3_portrait', gameAssetUrl('main character-png.png'));
  }

  create() {
    const boot = this.sys.settings.data || {};
    const sl = typeof boot.startLine === 'number' ? boot.startLine : 0;
    const lines = [
      "The herbs… they won't be found in the village.",
      "I'll have to search the forest… and beyond.",
    ];

    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.image(cx, cy, 'bg_forest_path').setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, 'bg_forest_path');
    scaleFullscreenBackgroundImage(bg);

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.3).setDepth(1);

    const portrait = addProtagonistIllustration(this, 'ar3_portrait', {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });
    this._portrait = portrait;
    if (sl >= lines.length) {
      portrait.setAlpha(1);
    } else {
      portrait.setAlpha(0);
      this.tweens.add({ targets: portrait, alpha: 1, duration: 600, ease: 'Sine.easeOut' });
    }

    const dialog = createDialogBox(this, GENERIC_DIALOG);

    const runOutro = () => {
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.time.delayedCall(600, () => {
        transitionScene(this, SCENE_KEYS.CAMP);
      });
    };

    if (sl >= lines.length) {
      this._dialogueLineIndex = lines.length;
      dialog.say(lines[lines.length - 1], () => {});
      const toCamp = () => {
        this.input.off('pointerdown', toCamp);
        runOutro();
      };
      this.input.once('pointerdown', toCamp);
      addSceneBackButton(this);
      return;
    }

    _runLines(lines, dialog, this, runOutro, { startLine: sl });
    addSceneBackButton(this);
  }

  getResumePayload() {
    return { startLine: this._dialogueLineIndex != null ? this._dialogueLineIndex : 0 };
  }
}
