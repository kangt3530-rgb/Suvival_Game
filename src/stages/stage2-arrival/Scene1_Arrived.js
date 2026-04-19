import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../config/GameConfig.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, _runLines, AR1_ARRIVED_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { addProtagonistIllustration } from '../stage1-background/stage1NotebookShared.js';

const CURTAIN_OUT_MS = 220;
/** 帘幕揭开后保持全黑再睁眼，避免多瞥一次村庄 */
const EYELID_HOLD_BLACK_MS = 420;
/** 缓慢睁眼 */
const EYELID_OPEN_MS = 4800;
/** 略长于眼睑，与苏醒感一致 */
const CAMERA_WAKE_FADEIN_MS = 5400;
/** 环境从略暗到正常 */
const DIM_VEIL_MS = 5600;

/** 清晨抵达村庄 + Day 1 / 30 */
export default class Scene1Arrived extends Phaser.Scene {
  constructor() {
    super({ key: 'AR1ArrivedScene' });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image('bg_village', gameAssetUrl('Village1.png'));
    this.load.image('ar1_sleep', gameAssetUrl('main-character-sleeping.png'));
    this.load.image('ar1_awake', gameAssetUrl('main character-png.png'));
  }

  create() {
    configureMainCameraSmoothPixels(this);
    const boot = this.sys.settings.data || {};
    const fromTimeTravel = !!boot.fromTimeTravel;

    if (!fromTimeTravel) {
      this.cameras.main.fadeIn(800, 0, 0, 0);
    }

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add
      .image(cx, cy, 'bg_village')
      .setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, 'bg_village');
    scaleFullscreenBackgroundImage(bg);

    /** @type {Phaser.FX.Blur|null} */
    let blurFx = null;
    if (fromTimeTravel && bg.postFX && typeof bg.postFX.addBlur === 'function') {
      try {
        blurFx = bg.postFX.addBlur(0, 2, 2, 14);
        if (blurFx && typeof blurFx.setQualityLow === 'function') {
          blurFx.setQualityLow();
        }
      } catch {
        blurFx = null;
      }
    }

    const dawn = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0xffc9a0, 0.22)
      .setDepth(100);
    this.tweens.add({
      targets: dawn,
      alpha: { from: 0.12, to: 0.28 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const sun = this.add.circle(GAME_WIDTH * 0.18, GAME_HEIGHT * 0.2, 42, 0xffe8b8, 0.55).setDepth(120);
    this.tweens.add({
      targets: sun,
      alpha: { from: 0.35, to: 0.75 },
      scale: { from: 0.92, to: 1.06 },
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (fromTimeTravel) {
      this._playTimeTravelEyelidWake(cx, cy, blurFx);
    }

    this.add
      .text(GAME_WIDTH - 20, 20, 'Day 1 / 30', {
        fontSize: '14px',
        color: '#3d2817',
        backgroundColor: '#f5e6d3',
        padding: { x: 6, y: 6 },
      })
      .setOrigin(1, 0)
      .setDepth(5000);

    const portraitSleep = addProtagonistIllustration(this, 'ar1_sleep', {
      ...AR1_ARRIVED_DIALOG,
      portraitAdjustY: -14,
    });
    const portraitAwake = addProtagonistIllustration(this, 'ar1_awake', {
      ...AR1_ARRIVED_DIALOG,
      portraitAdjustY: 0,
    });
    portraitAwake.setVisible(false);

    const applyPortraitForLine = (lineIndex) => {
      if (lineIndex <= 0) {
        portraitSleep.setVisible(true);
        portraitAwake.setVisible(false);
      } else {
        portraitSleep.setVisible(false);
        portraitAwake.setVisible(true);
      }
    };

    const dialog = createDialogBox(this, AR1_ARRIVED_DIALOG);
    const lines = [
      '...This place… this is the town… before it all began.',
      'I am back… Everyone is still alive…',
      'This means… I still have time to save them all.',
    ];

    const startLine = typeof boot.startLine === 'number' ? boot.startLine : 0;
    applyPortraitForLine(startLine);

    _runLines(
      lines,
      dialog,
      this,
      () => {
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.time.delayedCall(600, () => {
          transitionScene(this, SCENE_KEYS.AR2);
        });
      },
      { startLine },
      {
        onLineChange: (i) => {
          applyPortraitForLine(i);
        },
      }
    );
    addSceneBackButton(this);
  }

  /**
   * 黑场切入 → 帘幕揭开（底下眼睑已闭合，只见黑）→ 短停顿 → 缓慢睁眼 + 相机淡入 + 背景由糊变清
   * @param {Phaser.FX.Blur|null} blurFx
   */
  _playTimeTravelEyelidWake(cx, cy, blurFx) {
    const w = GAME_WIDTH + 32;
    const hHalf = GAME_HEIGHT / 2 + 18;

    // 一开始就「闭着眼」叠在村庄上，帘幕揭开后也不会先闪一下村庄
    const topLid = this.add
      .rectangle(cx, cy, w, hHalf, 0x000000, 1)
      .setOrigin(0.5, 1)
      .setDepth(49000);

    const bottomLid = this.add
      .rectangle(cx, cy, w, hHalf, 0x000000, 1)
      .setOrigin(0.5, 0)
      .setDepth(49000);

    const curtain = this.add
      .rectangle(cx, cy, GAME_WIDTH + 24, GAME_HEIGHT + 24, 0x000000, 1)
      .setDepth(50000);

    const dimVeil = this.add
      .rectangle(cx, cy, GAME_WIDTH + 24, GAME_HEIGHT + 24, 0x000000, 1)
      .setAlpha(0)
      .setDepth(8000);

    const beginSlowOpen = () => {
      dimVeil.setAlpha(0.48);
      this.cameras.main.fadeIn(CAMERA_WAKE_FADEIN_MS, 0, 0, 0);

      this.tweens.add({
        targets: dimVeil,
        alpha: 0,
        duration: DIM_VEIL_MS,
        ease: 'Sine.easeOut',
      });

      if (blurFx && typeof blurFx.strength === 'number') {
        blurFx.strength = Math.max(blurFx.strength, 10);
        this.tweens.add({
          targets: blurFx,
          strength: 0,
          duration: EYELID_OPEN_MS + 600,
          ease: 'Sine.easeOut',
        });
      }

      this.tweens.add({
        targets: topLid,
        y: -hHalf - 8,
        duration: EYELID_OPEN_MS,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          topLid.destroy();
        },
      });
      this.tweens.add({
        targets: bottomLid,
        y: GAME_HEIGHT + hHalf + 8,
        duration: EYELID_OPEN_MS,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          bottomLid.destroy();
        },
      });
    };

    this.tweens.add({
      targets: curtain,
      alpha: 0,
      duration: CURTAIN_OUT_MS,
      ease: 'Sine.easeOut',
      onComplete: () => {
        curtain.destroy();
        this.time.delayedCall(EYELID_HOLD_BLACK_MS, beginSlowOpen);
      },
    });
  }

  getResumePayload() {
    return { startLine: this._dialogueLineIndex != null ? this._dialogueLineIndex : 0 };
  }
}
