import { SCENE_KEYS } from '../../config/GameConfig.js';
import { createDialogBox, _runLines, STAGE1_DIARY_DIALOG } from '../../utils/Dialogue.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { gameAssetUrl } from '../../utils/assets.js';
import {
  ensureNotebookIntroLoaded,
  addNotebookBackground,
  addProtagonistIllustration,
  addDiaryDateLine,
} from './stage1NotebookShared.js';

const PORTRAIT_KEY = 'st1_portrait_hope';

/** 1900-10-03 — 重获希望（思索立绘） */
export default class Scene3Discovery extends Phaser.Scene {
  constructor() {
    super({ key: 'BG3DiscoveryScene' });
  }

  preload() {
    ensureNotebookIntroLoaded(this);
    this.load.image(PORTRAIT_KEY, gameAssetUrl('main character-thinking.png'));
  }

  create() {
    addDiaryDateLine(this, 'October 3, 1900');

    this.cameras.main.fadeIn(600, 0, 0, 0);
    addNotebookBackground(this, 0);
    const dialog = createDialogBox(this, STAGE1_DIARY_DIALOG);
    addProtagonistIllustration(this, PORTRAIT_KEY);
    const lines = [
      'The pattern steadies under my hand.',
      'Finally… I see it clearly. The cure is possible.',
      "The thought of saving lives gives me hope I haven't felt in years.",
    ];

    const boot = this.sys.settings.data || {};
    _runLines(
      lines,
      dialog,
      this,
      () => {
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          transitionScene(this, SCENE_KEYS.BG4);
        });
      },
      { startLine: typeof boot.startLine === 'number' ? boot.startLine : 0 }
    );
    addSceneBackButton(this);
  }

  getResumePayload() {
    return { startLine: this._dialogueLineIndex != null ? this._dialogueLineIndex : 0 };
  }
}
