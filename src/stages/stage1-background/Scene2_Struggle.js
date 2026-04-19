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

const PORTRAIT_KEY = 'st1_portrait_tired';

/** 1898-06-12 — 疲惫、研究草药（思索立绘） */
export default class Scene2Struggle extends Phaser.Scene {
  constructor() {
    super({ key: 'BG2StruggleScene' });
  }

  preload() {
    ensureNotebookIntroLoaded(this);
    this.load.image(PORTRAIT_KEY, gameAssetUrl('main character-thinking.png'));
  }

  create() {
    addDiaryDateLine(this, 'June 12, 1898');

    this.cameras.main.fadeIn(600, 0, 0, 0);
    addNotebookBackground(this, 0);
    const dialog = createDialogBox(this, STAGE1_DIARY_DIALOG);
    addProtagonistIllustration(this, PORTRAIT_KEY);
    const lines = [
      'Another page, another dead end.',
      "I've tried Mandrake, Silverleaf, Moonflower… none seem to work.",
      'Each failure weighs heavier. Yet I cannot give up.',
    ];

    const boot = this.sys.settings.data || {};
    _runLines(
      lines,
      dialog,
      this,
      () => {
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          transitionScene(this, SCENE_KEYS.BG3);
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
