import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig.js';
import { TEXT_DIALOG_BODY, TEXT_DATE_PILL } from './typography.js';

/** 对话框分层 */
export const DIALOG_DEPTH_BG = 4998;
/** 旧布局：立绘夹在底条与文字之间（一般不再用于 Stage1 日记） */
export const DIALOG_DEPTH_PORTRAIT = 4999;
export const DIALOG_DEPTH_TEXT = 5000;
export const DIALOG_DEPTH_ARROW = 5001;
/** P3/VN 式：大半身立绘在整条对白 UI（含半透明底）之下，由对话框叠在立绘上 */
export const DIALOG_DEPTH_PORTRAIT_UNDER_DIALOG = 4550;

/**
 * @param {{ boxHeight?: number, bottomMargin?: number, horizontalMargin?: number }} [opts]
 */
export function getDialogBoxLayout(opts = {}) {
  const boxH = opts.boxHeight ?? 158;
  const bottomMargin = opts.bottomMargin ?? 68;
  const marginX = opts.horizontalMargin ?? 32;
  const boxW = GAME_WIDTH - marginX * 2;
  const boxX = GAME_WIDTH / 2;
  const boxY = GAME_HEIGHT - bottomMargin - boxH / 2;
  const left = boxX - boxW / 2;
  const top = boxY - boxH / 2;
  return { boxH, boxW, boxX, boxY, left, top, right: boxX + boxW / 2, bottom: boxY + boxH / 2 };
}

/**
 * Stage1 日记：对白条 + VN 式立绘（大半身在对话框 layer 之下）。
 * `getDialogBoxLayout` / `createDialogBox` 只读取 box 相关字段；立绘字段由 `addProtagonistIllustration` 读取。
 */
export const STAGE1_DIARY_DIALOG = {
  boxHeight: 190,
  /** 0 = 对话框底边与画面下边框完全对齐 */
  bottomMargin: 0,
  /** 画面左右各留 16px 给边框，让对话框尽量宽 */
  horizontalMargin: 16,
  /** 立绘已在右侧，文字左侧无需留白 */
  reservedLeftForPortrait: 0,
  /** 右侧为立绘预留宽度（像素），文字不超过此区域 */
  reservedRightForPortrait: 320,
  /** 立绘宽度上限：屏宽 × 比例（较原值放大 30%） */
  portraitMaxWidthScreenRatio: 0.338,
  portraitMaxHeightScreenRatio: 0.806,
  /** 立绘水平锚点：右侧车道，约距右边框 200px */
  portraitScreenAnchorXRatio: 0.8375,
  /** 脚底锚点与屏底持平（bottomMargin=0 时保持一致） */
  portraitBottomBleed: 0,
  /** 0 = 立绘底边与对话框底边对齐 */
  portraitLiftPx: 0,
};

/**
 * 通用对白框：与 STAGE1_DIARY_DIALOG 外观一致但不留立绘位，文字用全宽。
 * 供无立绘场景（AR2 背包、AR3 森林入口等）使用。
 */
export const GENERIC_DIALOG = {
  ...STAGE1_DIARY_DIALOG,
  reservedRightForPortrait: 0,
};

/** AR1 抵达村庄：继承右侧立绘布局，略加高对白区给首句多行留空间 */
export const AR1_ARRIVED_DIALOG = {
  ...STAGE1_DIARY_DIALOG,
  boxHeight: 190,
  reservedRightForPortrait: 340,
  portraitMaxWidthScreenRatio: 0.28,
  portraitLiftPx: 88,
};

/**
 * 在场景底部创建半透明对话框 + typewriter 控制器
 * @param {Phaser.Scene} scene
 * @param {{
 *   boxHeight?: number,
 *   bottomMargin?: number,
 *   horizontalMargin?: number,
 *   reservedLeftForPortrait?: number,
 *   portraitMaxWidthScreenRatio?: number,
 *   portraitMaxHeightScreenRatio?: number,
 *   portraitScreenAnchorXRatio?: number,
 *   portraitBottomBleed?: number,
 *   portraitLiftPx?: number,
 * }} [layoutOpts] 不传则用默认（略加大并上移）；日记场景传入 `STAGE1_DIARY_DIALOG`
 * @returns {{ say: Function, clear: Function, bg: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text, arrow: Phaser.GameObjects.Text }}
 */
export function createDialogBox(scene, layoutOpts = {}) {
  const L = getDialogBoxLayout(layoutOpts);
  const { boxH, boxW, boxX, boxY, left, top } = L;
  const reservedLeft = Math.max(16, layoutOpts.reservedLeftForPortrait ?? 24);
  const reservedRight = Math.max(0, layoutOpts.reservedRightForPortrait ?? 0);
  const textPadL = 14;
  const textPadR = 20;
  const textX = left + reservedLeft + textPadL;
  const wordWrapW = Math.max(120, boxW - reservedLeft - reservedRight - textPadL - textPadR);

  const bg = scene.add.rectangle(boxX, boxY, boxW, boxH, 0x000000, 0.62);
  bg.setStrokeStyle(1, 0x5c4033, 0.8);
  bg.setDepth(DIALOG_DEPTH_BG);

  const txt = scene.add.text(textX, top + 18, '', {
    ...TEXT_DIALOG_BODY,
    wordWrap: { width: wordWrapW, useAdvancedWrap: true },
  });
  txt.setDepth(DIALOG_DEPTH_TEXT);

  const arrow = scene.add
    .text(left + boxW - 28, top + boxH - 22, '▼', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#c4a882',
    })
    .setAlpha(0)
    .setDepth(DIALOG_DEPTH_ARROW);

  scene.tweens.add({
    targets: arrow,
    alpha: { from: 0, to: 1 },
    duration: 520,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  let _typingEvent = null;
  let _fullText = '';
  let _charIndex = 0;

  function _finishNow() {
    if (_typingEvent) {
      _typingEvent.remove(false);
      _typingEvent = null;
    }
    txt.setText(_fullText);
    arrow.setAlpha(1);
  }

  function say(text, onComplete) {
    if (_typingEvent) {
      _finishNow();
    }

    _fullText = text;
    _charIndex = 0;
    txt.setText('');
    arrow.setAlpha(0);

    _typingEvent = scene.time.addEvent({
      delay: 35,
      repeat: text.length - 1,
      callback: () => {
        _charIndex++;
        txt.setText(_fullText.slice(0, _charIndex));

        if (_charIndex >= _fullText.length) {
          _typingEvent = null;
          arrow.setAlpha(1);
          if (typeof onComplete === 'function') onComplete();
        }
      },
    });
  }

  function clear() {
    if (_typingEvent) {
      _typingEvent.remove(false);
      _typingEvent = null;
    }
    _fullText = '';
    _charIndex = 0;
    txt.setText('');
    arrow.setAlpha(0);
  }

  return { say, clear, bg, text: txt, arrow };
}

/**
 * @param {string[]} lines
 * @param {ReturnType<typeof createDialogBox>} dialog
 * @param {Phaser.Scene} scene
 * @param {Function} onFinished
 * @param {{ startLine?: number }} [resume]
 * @param {{ onLineChange?: (index: number, line: string) => void }} [hooks]
 */
export function _runLines(lines, dialog, scene, onFinished, resume, hooks) {
  resume = resume || {};
  hooks = hooks || {};
  const onLineChange = hooks.onLineChange;
  let startLine = typeof resume.startLine === 'number' ? resume.startLine : 0;
  let index = startLine;
  let ready = false;
  scene._dialogueLineIndex = index;

  function showLine(i) {
    scene._dialogueLineIndex = i;
    ready = false;
    if (typeof onLineChange === 'function') {
      onLineChange(i, lines[i]);
    }
    dialog.say(lines[i], () => {
      ready = true;
    });
  }

  function advance() {
    if (!ready) {
      dialog.say(dialog.text.text + '', () => {
        ready = true;
      });
      ready = true;
      return;
    }
    index++;
    scene._dialogueLineIndex = index;
    if (index < lines.length) {
      showLine(index);
    } else {
      scene.input.off('pointerdown', advance);
      scene._dialogueLineIndex = lines.length;
      onFinished();
    }
  }

  if (index >= lines.length) {
    scene._dialogueLineIndex = lines.length;
    if (lines.length === 0) {
      onFinished();
      return;
    }
    const lastI = lines.length - 1;
    if (typeof onLineChange === 'function') {
      onLineChange(lastI, lines[lastI]);
    }
    dialog.say(lines[lastI], () => {
      ready = true;
    });
    scene.input.on('pointerdown', function resumeAdvance() {
      if (!ready) {
        ready = true;
        return;
      }
      scene.input.off('pointerdown', resumeAdvance);
      onFinished();
    });
    return;
  }

  showLine(index);
  scene.input.on('pointerdown', advance);
}
