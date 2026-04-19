import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../config/GameConfig.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleImageToSquareSide,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';

/** 第一人称检查背包：开合动画 + 可按 B 打开 */
export default class Scene2Backpack extends Phaser.Scene {
  constructor() {
    super({ key: 'AR2BackpackScene' });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image('backpack', gameAssetUrl('backpack.png'));
  }

  create() {
    configureMainCameraSmoothPixels(this);
    this.cameras.main.setBackgroundColor('#2a1f14');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2a1f14);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 20;

    const bag = this.add.image(cx, cy, 'backpack').setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, 'backpack');
    scaleImageToSquareSide(bag, GAME_HEIGHT);
    bag.setBlendMode(Phaser.BlendModes.SCREEN);

    const notebook = this.add.rectangle(cx - 34, cy, 80, 60, 0xf5e6d3).setAlpha(0);
    notebook.setStrokeStyle(1, 0xc4a882);
    const gear = this.add.rectangle(cx + 38, cy, 60, 60, 0x888888).setAlpha(0);
    gear.setStrokeStyle(1, 0x555555);

    this.add
      .text(cx, 48, 'Press B to open your pack and inspect gear.', {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#d8c8b0',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 80 },
      })
      .setOrigin(0.5)
      .setDepth(4800);

    const dialog = createDialogBox(this);
    const lines = [
      'My bag… it came with me.',
      "I'm glad I wrote everything down.",
      'If I can gather the ingredients in time, I can stop Crimson Fever.',
    ];

    const openBag = () => {
      if (this._bagOpened) return;
      this._bagOpened = true;
      this.tweens.add({
        targets: bag,
        scaleY: 0,
        duration: 300,
        ease: 'Linear',
        onComplete: () => {
          this.tweens.add({
            targets: bag,
            scaleY: 1,
            duration: 300,
            ease: 'Linear',
            onComplete: () => {
              notebook.setAlpha(1);
              gear.setAlpha(1);
            },
          });
        },
      });
    };

    this._bagOpened = false;
    this.input.keyboard.on('keydown-B', () => openBag());

    let index = 0;
    let ready = false;

    const showLine = (i) => {
      this._ar2LineIndex = i;
      ready = false;
      dialog.say(lines[i], () => {
        ready = true;
        if (i === 1) openBag();
      });
    };

    const advance = () => {
      if (!ready) {
        return;
      }
      index++;
      this._ar2LineIndex = index;
      if (index < lines.length) {
        showLine(index);
      } else {
        this.input.off('pointerdown', advance);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          transitionScene(this, SCENE_KEYS.AR3);
        });
      }
    };

    this._ar2Lines = lines;
    this._ar2Dialog = dialog;
    this._ar2ShowLine = showLine;
    this._ar2Advance = advance;
    this._ar2Notebook = notebook;
    this._ar2Gear = gear;
    this._ar2Bag = bag;

    const boot = this.sys.settings.data || {};
    const startIdx = typeof boot.ar2LineIndex === 'number' ? boot.ar2LineIndex : 0;
    if (startIdx >= lines.length) {
      let readyDone = false;
      this._ar2LineIndex = lines.length;
      dialog.say(lines[lines.length - 1], () => {
        readyDone = true;
      });
      openBag();
      const finishAr2 = () => {
        if (!readyDone) {
          return;
        }
        this.input.off('pointerdown', finishAr2);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          transitionScene(this, SCENE_KEYS.AR3);
        });
      };
      this.input.on('pointerdown', finishAr2);
      addSceneBackButton(this);
      return;
    }

    index = startIdx;
    this._ar2LineIndex = index;
    showLine(index);
    this.input.on('pointerdown', advance);
    addSceneBackButton(this);
  }

  getResumePayload() {
    return { ar2LineIndex: this._ar2LineIndex != null ? this._ar2LineIndex : 0 };
  }

  tryConsumeInternalBack() {
    if (this._ar2LineIndex == null || this._ar2LineIndex <= 0) return false;
    this.input.off('pointerdown', this._ar2Advance);
    this._ar2LineIndex--;
    const i = this._ar2LineIndex;
    if (i < 1) {
      this._ar2Notebook.setAlpha(0);
      this._ar2Gear.setAlpha(0);
    }
    this._ar2ShowLine(i);
    this.input.on('pointerdown', this._ar2Advance);
    return true;
  }
}
