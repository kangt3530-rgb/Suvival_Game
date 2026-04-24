import { GAME_WIDTH, GAME_HEIGHT } from '../../config/GameConfig.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl, warmTextureCache } from '../../utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';
import { STAGE3_SCENE_KEYS, STAGE3_ASSETS } from './stage3Config.js';

/** Stage 3 — 进入森林暮色、决定停留 */
export default class Stage3EnterForestScene extends Phaser.Scene {
  constructor() {
    super({ key: STAGE3_SCENE_KEYS.ENTER_FOREST });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image(STAGE3_ASSETS.BG_FOREST_ENTRY.key, gameAssetUrl(STAGE3_ASSETS.BG_FOREST_ENTRY.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_MAIN.key, gameAssetUrl(STAGE3_ASSETS.PORTRAIT_MAIN.file));
  }

  create() {
    const boot = this.sys.settings.data || {};
    const sl = typeof boot.startLine === 'number' ? boot.startLine : 0;
    const lines = [
      "…It's farther than I thought. And the light's fading already…",
      "If I keep going like this, I won't make it through the night.",
      'I need to stop here… just for now.',
    ];

    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    warmTextureCache(this, [
      { key: STAGE3_ASSETS.BG_NPC_MEET.key, file: STAGE3_ASSETS.BG_NPC_MEET.file },
      { key: STAGE3_ASSETS.PORTRAIT_PLAYER_PNG.key, file: STAGE3_ASSETS.PORTRAIT_PLAYER_PNG.file },
      { key: STAGE3_ASSETS.PORTRAIT_OLDMAN.key, file: STAGE3_ASSETS.PORTRAIT_OLDMAN.file },
    ]);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.image(cx, cy, STAGE3_ASSETS.BG_FOREST_ENTRY.key).setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, STAGE3_ASSETS.BG_FOREST_ENTRY.key);
    scaleFullscreenBackgroundImage(bg);

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.3).setDepth(1);

    const portrait = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_MAIN.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
      /** thinking 原图较方、角色占比小于 main character-png，略放大以与 AR3 观感一致 */
      portraitScaleMultiplier: 1.38,
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
      const FADE_MS = 420;
      this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
      this.time.delayedCall(FADE_MS, () => {
        transitionScene(this, STAGE3_SCENE_KEYS.NPC_ENCOUNTER);
      });
    };

    if (sl >= lines.length) {
      this._dialogueLineIndex = lines.length;
      dialog.say(lines[lines.length - 1], () => {});
      const advance = () => {
        this.input.off('pointerdown', advance);
        runOutro();
      };
      this.input.once('pointerdown', advance);
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

// 注册：在 MainConfig.js 的 SCENE_KEY_TO_CLASS 和 DEFAULT_SCENE_ORDER 中手动添加
