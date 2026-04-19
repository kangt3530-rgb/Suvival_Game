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

const PORTRAIT_KEY = 'st1_portrait_anxious';

/** 1898-03-05 — 笔记本页 + 主角思索立绘 */
export default class Scene1Outbreak extends Phaser.Scene {
  constructor() {
    super({ key: 'BG1OutbreakScene' });
  }

  preload() {
    ensureNotebookIntroLoaded(this);
    this.load.image(PORTRAIT_KEY, gameAssetUrl('main character-thinking.png'));
  }

  create() {
    addDiaryDateLine(this, 'March 5, 1898');

    this.cameras.main.fadeIn(600, 0, 0, 0);
    addNotebookBackground(this, 0);
    const dialog = createDialogBox(this, STAGE1_DIARY_DIALOG);
    addProtagonistIllustration(this, PORTRAIT_KEY);
    const lines = [
      'It begins…',
      'My clinic is overflowing. I cannot save them all.',
      'I watch neighbors and friends fall, powerless to stop it.',
    ];

    const boot = this.sys.settings.data || {};
    _runLines(
      lines,
      dialog,
      this,
      () => {
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          transitionScene(this, SCENE_KEYS.BG2);
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
