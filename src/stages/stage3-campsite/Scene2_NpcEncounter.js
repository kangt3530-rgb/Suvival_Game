import { GAME_WIDTH, GAME_HEIGHT } from '../../config/GameConfig.js';
import { STAGE3_SCENE_KEYS, STAGE3_ASSETS } from './stage3Config.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';

/** Stage 3 — 森林小径上与老人相遇 */
export default class Stage3NpcEncounterScene extends Phaser.Scene {
  constructor() {
    super({ key: STAGE3_SCENE_KEYS.NPC_ENCOUNTER });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image(STAGE3_ASSETS.BG_NPC_MEET.key, gameAssetUrl(STAGE3_ASSETS.BG_NPC_MEET.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_PLAYER_PNG.key, gameAssetUrl(STAGE3_ASSETS.PORTRAIT_PLAYER_PNG.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_OLDMAN.key, gameAssetUrl(STAGE3_ASSETS.PORTRAIT_OLDMAN.file));
  }

  create() {
    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.image(cx, cy, STAGE3_ASSETS.BG_NPC_MEET.key).setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, STAGE3_ASSETS.BG_NPC_MEET.key);
    scaleFullscreenBackgroundImage(bg);

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.45).setDepth(1);

    const portraitOldman = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_OLDMAN.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });
    const portraitPlayer = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_PLAYER_PNG.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });

    portraitOldman.setAlpha(1);
    portraitPlayer.setAlpha(0);

    const dialogueData = [
      { speaker: 'oldman', text: "What are you doing out here?" },
      { speaker: 'player', text: "I'm looking for some herbs." },
      {
        speaker: 'oldman',
        text: "Well, that I can't help you with. But I have to warn you—if you're staying out here for the night, don't just pick the first place you see. That's how you get into trouble.",
      },
      { speaker: 'player', text: 'What should I look for?' },
      {
        speaker: 'oldman',
        text: "Ground, water, wind… and what's above you. Check all four, and you'll be alright.",
      },
      { speaker: 'oldman', text: 'Safe travels.' },
    ];

    const lines = dialogueData.map((d) => d.text);

    const SWITCH_MS = 250;
    const switchSpeaker = (speaker) => {
      const targetOldman = speaker === 'oldman' ? 1 : 0;
      const targetPlayer = speaker === 'player' ? 1 : 0;
      this.tweens.add({ targets: portraitOldman, alpha: targetOldman, duration: SWITCH_MS, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: portraitPlayer, alpha: targetPlayer, duration: SWITCH_MS, ease: 'Sine.easeOut' });
    };

    const dialog = createDialogBox(this, GENERIC_DIALOG);

    const boot = this.sys.settings.data || {};
    const startLine = typeof boot.startLine === 'number' ? boot.startLine : 0;

    if (startLine < dialogueData.length) {
      const initialSpeaker = dialogueData[startLine].speaker;
      portraitOldman.setAlpha(initialSpeaker === 'oldman' ? 1 : 0);
      portraitPlayer.setAlpha(initialSpeaker === 'player' ? 1 : 0);
    }

    _runLines(
      lines,
      dialog,
      this,
      () => {
        this.tweens.add({
          targets: portraitOldman,
          alpha: 0,
          duration: 800,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this.cameras.main.fadeOut(600, 0, 0, 0);
            this.time.delayedCall(600, () => {
              transitionScene(this, STAGE3_SCENE_KEYS.SCOUTING);
            });
          },
        });
      },
      { startLine },
      {
        onLineChange: (i) => {
          if (i < dialogueData.length) {
            switchSpeaker(dialogueData[i].speaker);
          }
        },
      }
    );

    addSceneBackButton(this);
  }

  getResumePayload() {
    return { startLine: this._dialogueLineIndex != null ? this._dialogueLineIndex : 0 };
  }
}

// 注册：在 MainConfig.js 的 SCENE_KEY_TO_CLASS 和 DEFAULT_SCENE_ORDER 中手动添加
