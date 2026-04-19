import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig.js';

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
  boxHeight: 182,
  /** 对白条底边距屏底越小，整条越靠下（少挡脸） */
  bottomMargin: 48,
  horizontalMargin: 84,
  reservedLeftForPortrait: 240,
  /** 立绘在屏上的最大宽度 = 屏宽 × 该比例（约画面 1/3 宽），与 maxHeight 取 min 缩放 */
  portraitMaxWidthScreenRatio: 1 / 3,
  /** 立绘在屏上的最大高度比例，避免超高原图占满整屏 */
  portraitMaxHeightScreenRatio: 0.62,
  /** 立绘水平中心：相对整屏宽度 0~1，约 0.16~0.22 为左侧车道（参考 VN 左 1/3 区） */
  portraitScreenAnchorXRatio: 0.18,
  /** 锚点在下沿时，略低于屏幕底边，形成脚底裁切 */
  portraitBottomBleed: 40,
  /** 整体上移立绘（像素，从脚底锚点 Y 减去），让胸以上露在条顶之上 */
  portraitLiftPx: 88,
};

/** AR1 抵达村庄：与日记相同的 VN 立绘车道，略加高对白区、略收边距，避免首句多行时被裁切感 */
export const AR1_ARRIVED_DIALOG = {
  ...STAGE1_DIARY_DIALOG,
  boxHeight: 208,
  bottomMargin: 50,
  horizontalMargin: 68,
  reservedLeftForPortrait: 228,
  portraitMaxWidthScreenRatio: 0.34,
  portraitLiftPx: 82,
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
  const textPadL = 14;
  const textPadR = 20;
  const textX = left + reservedLeft + textPadL;
  const wordWrapW = Math.max(120, boxW - reservedLeft - textPadL - textPadR);

  const bg = scene.add.rectangle(boxX, boxY, boxW, boxH, 0x000000, 0.62);
  bg.setStrokeStyle(1, 0x5c4033, 0.8);
  bg.setDepth(DIALOG_DEPTH_BG);

  const txt = scene.add.text(textX, top + 18, '', {
    fontFamily: 'Georgia, serif',
    fontSize: '18px',
    color: '#f5e6d3',
    wordWrap: { width: wordWrapW, useAdvancedWrap: true },
    lineSpacing: 5,
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
