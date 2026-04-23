import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../config/GameConfig.js';
import { createDialogBox, _runLines, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';

/** 走向森林入口 */
export default class Scene3ForestEntry extends Phaser.Scene {
  constructor() {
    super({ key: 'AR3ForestScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a2e1a');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a2e1a);
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.52)
      .setDepth(1);

    const forestX = GAME_WIDTH - 160;
    this.add.rectangle(forestX, GAME_HEIGHT / 2, 260, GAME_HEIGHT, 0x0d1f0d, 0.7);

    const player = this.add.circle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 20, 0xffffff);

    const dialog = createDialogBox(this, GENERIC_DIALOG);
    const lines = [
      "The herbs… they won't be found in the village.",
      "I'll have to search the forest… and beyond.",
    ];

    const boot = this.sys.settings.data || {};
    const sl = typeof boot.startLine === 'number' ? boot.startLine : 0;

    const runWalkToCamp = () => {
      this.tweens.add({
        targets: player,
        x: forestX,
        duration: 1200,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.cameras.main.fadeOut(600, 0, 0, 0);
          this.time.delayedCall(600, () => {
            transitionScene(this, SCENE_KEYS.CAMP);
          });
        },
      });
    };

    if (sl >= lines.length) {
      this._dialogueLineIndex = lines.length;
      player.setPosition(forestX, GAME_HEIGHT / 2);
      dialog.say(lines[lines.length - 1], () => {});
      const toCamp = () => {
        this.input.off('pointerdown', toCamp);
        runWalkToCamp();
      };
      this.input.once('pointerdown', toCamp);
      addSceneBackButton(this);
      return;
    }

    _runLines(lines, dialog, this, runWalkToCamp, { startLine: sl });
    addSceneBackButton(this);
  }

  getResumePayload() {
    return { startLine: this._dialogueLineIndex != null ? this._dialogueLineIndex : 0 };
  }
}
