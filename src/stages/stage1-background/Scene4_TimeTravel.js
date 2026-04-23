import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../config/GameConfig.js';
import { createDialogBox, _runLines, STAGE1_DIARY_DIALOG } from '../../utils/Dialogue.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import {
  addProtagonistIllustration,
} from './stage1NotebookShared.js';

const PORTRAIT_KEY = 'st1_portrait_time';

/** 失去意识：画面与立绘沉入深黑 */
const LOSING_CONSCIOUSNESS_MS = 3000;
/** 全黑中的静默 */
const VOID_SILENCE_MS = 1000;
/** 泪珠缓坠 */
const TEAR_FALL_MS = 4200;
/** 泪珠在中心消散 */
const TEAR_VANISH_MS = 900;
/** 时空白光（正常速率感） */
const FLASH_IN_MS = 320;
const FLASH_HOLD_MS = 140;
const FLASH_OUT_MS = 420;
/** 白光褪尽后、切场景前的黑场 */
const PRE_LEAP_BLACK_MS = 280;

/**
 * 入梦：对白结束 → 极慢沉入纯黑 → 静谧 → 孤泪缓落并消散 → 白光 → 黑场 → AR1（眼睑苏醒）
 */
export default class Scene4TimeTravel extends Phaser.Scene {
  constructor() {
    super({ key: 'BG4TimeTravelScene' });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image('bg_tt_notebook', gameAssetUrl('notebook intro.png'));
    this.load.image(PORTRAIT_KEY, gameAssetUrl('main-character-sleeping.png'));
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1510');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // ── 背景层（始终可见）
    configureMainCameraSmoothPixels(this);
    this._notebookBg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_tt_notebook')
      .setOrigin(0.5, 0.5)
      .setDepth(0);
    setTextureLinearByKey(this, 'bg_tt_notebook');
    scaleFullscreenBackgroundImage(this._notebookBg);

    this._focusOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.28)
      .setDepth(1);
    if (this._notebookBg.postFX) {
      this._notebookBg.postFX.addBlur(1, 0.5, 0.15, 4);
    }

    this._backBtn = addSceneBackButton(this);

    const boot = this.sys.settings.data || {};
    const startLine = typeof boot.startLine === 'number' ? boot.startLine : 0;

    // resume 时直接跳过等待，立即展开内容
    if (startLine > 0) {
      this._showNotebookAndDialog(startLine);
      return;
    }

    // 首次进入：等待第一次点击再展开 notebook1 + 对话框
    this.input.once('pointerdown', () => {
      this._showNotebookAndDialog(0);
    });
  }

  _showNotebookAndDialog(startLine) {
    // 对话框 + 立绘同时出现
    this._dialog = createDialogBox(this, STAGE1_DIARY_DIALOG);
    this._pageIllust = addProtagonistIllustration(this, PORTRAIT_KEY, {
      portraitScreenAnchorXRatio: 0.5,
      portraitMaxWidthScreenRatio: 0.338 * 1.6 * 0.9,
      portraitMaxHeightScreenRatio: 0.806 * 1.6 * 0.9,
      portraitLiftPx: 70,
      portraitBottomBleed: 0,
    });
    if (this._pageIllust) {
      this._pageIllust.setAlpha(0);
      this.tweens.add({
        targets: this._pageIllust,
        alpha: 1,
        duration: 600,
        ease: 'Sine.easeOut',
      });
    }

    _runLines(
      ['If only I had known this earlier…'],
      this._dialog,
      this,
      () => { this._beginTimeTravelSequence(); },
      { startLine }
    );
  }

  _beginTimeTravelSequence() {
    this.input.enabled = false;
    if (this._backBtn) this._backBtn.setVisible(false);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const d = this._dialog;

    const voidBlack = this.add
      .rectangle(cx, cy, GAME_WIDTH + 8, GAME_HEIGHT + 8, 0x000000, 1)
      .setAlpha(0)
      .setDepth(12000);

    const fadeTargets = [
      this._notebookBg,
      this._focusOverlay,
      this._pageIllust,
      d.bg,
      d.text,
      d.arrow,
    ].filter(Boolean);

    this.tweens.add({
      targets: fadeTargets,
      alpha: 0,
      duration: LOSING_CONSCIOUSNESS_MS,
      ease: 'Sine.easeIn',
    });

    this.tweens.add({
      targets: voidBlack,
      alpha: 1,
      duration: LOSING_CONSCIOUSNESS_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.tweens.killTweensOf(fadeTargets);
        fadeTargets.forEach((go) => {
          if (go && go.destroy) go.destroy();
        });
        this._notebookBg = null;
        this._focusOverlay = null;
        this._pageIllust = null;
        this._dialog = null;

        this.cameras.main.setBackgroundColor('#000000');
        voidBlack.setDepth(500);
        voidBlack.setAlpha(1);

        this.time.delayedCall(VOID_SILENCE_MS, () => {
          this._playTearVanishAndFlash(cx, cy, voidBlack);
        });
      },
    });
  }

  _playTearVanishAndFlash(cx, cy, voidBlack) {
    const startY = -56;
    const tear = this.add.container(cx, startY).setDepth(15000).setAlpha(0.88);

    const rim = this.add.ellipse(0, 2.4, 20, 30, 0x6a9ec4, 0.35);
    const body = this.add
      .ellipse(0, 0, 24, 36, 0xb8e0ff, 0.52)
      .setStrokeStyle(1.5, 0xe8fbff, 0.38);
    const spec = this.add.ellipse(-6, -10, 6.4, 5.2, 0xffffff, 0.55);
    tear.add([rim, body, spec]);

    this.tweens.add({
      targets: tear,
      y: cy,
      alpha: { from: 0.35, to: 0.82 },
      scaleX: { from: 0.92, to: 1.02 },
      scaleY: { from: 0.92, to: 1.06 },
      duration: TEAR_FALL_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: tear,
          alpha: 0,
          scaleX: 0.65,
          scaleY: 0.5,
          y: cy + 6,
          duration: TEAR_VANISH_MS,
          ease: 'Sine.easeIn',
          onComplete: () => {
            tear.destroy();
            this._whiteFlashThenLeap(cx, cy, voidBlack);
          },
        });
      },
    });
  }

  _whiteFlashThenLeap(cx, cy, voidBlack) {
    const flash = this.add
      .rectangle(cx, cy, GAME_WIDTH + 24, GAME_HEIGHT + 24, 0xffffff, 1)
      .setAlpha(0)
      .setDepth(200000);

    voidBlack.setDepth(199000);

    this.tweens.add({
      targets: flash,
      alpha: 1,
      duration: FLASH_IN_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.time.delayedCall(FLASH_HOLD_MS, () => {
          this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: FLASH_OUT_MS,
            ease: 'Quad.easeOut',
            onComplete: () => {
              flash.destroy();
              voidBlack.setDepth(500);
              voidBlack.setAlpha(1);
              this.time.delayedCall(PRE_LEAP_BLACK_MS, () => {
                transitionScene(this, SCENE_KEYS.AR1, { fromTimeTravel: true });
              });
            },
          });
        });
      },
    });
  }

  getResumePayload() {
    return { startLine: this._dialogueLineIndex != null ? this._dialogueLineIndex : 0 };
  }
}
