import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig.js';
import { setTextureLinearByKey, scaleImageToRectCover } from './imageQuality.js';

/** 与旧 createDialogBox 一致，略低于全屏 UI、高于世界标签 */
const DEFAULT_DEPTH = 5000;

/**
 * 底部对话 UI：可选图片边框、Ren'Py 风格名字标签 + 深色渐变底、左右立绘（淡入淡出）、逐字打字机。
 *
 * 使用前请在场景的 `preload()` 中自行加载纹理，例如：
 *   this.load.image('dialog_frame', gameAssetUrl('dialog-frame.png'));
 *   this.load.image('hero_portrait', gameAssetUrl('main character-png.png'));
 * 再 `new DialogueUI(this, { borderTextureKey: 'dialog_frame', ... })`。
 */
export default class DialogueUI {
  /**
   * @param {Phaser.Scene} scene
   * @param {{
   *   depth?: number,
   *   boxHeight?: number,
   *   boxMarginX?: number,
   *   boxBottomMargin?: number,
   *   typewriterDelayMs?: number,
   *   renpyMode?: boolean,
   *   borderTextureKey?: string | null,
   *   nameTagWidth?: number,
   *   nameTagHeight?: number,
   *   portraitMaxHeight?: number,
   *   portraitFadeMs?: number,
   * }} [options]
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.depth = options.depth ?? DEFAULT_DEPTH;
    this.typewriterDelayMs = options.typewriterDelayMs ?? 35;
    this.renpyMode = options.renpyMode !== false;
    this.borderTextureKey = options.borderTextureKey ?? null;
    this.portraitFadeMs = options.portraitFadeMs ?? 420;

    const boxH = options.boxHeight ?? Math.round(GAME_HEIGHT * 0.3);
    const marginX = options.boxMarginX ?? 24;
    const bottomM = options.boxBottomMargin ?? 18;
    const boxW = GAME_WIDTH - marginX * 2;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT - bottomM - boxH / 2;
    const boxLeft = boxX - boxW / 2;
    const boxTop = boxY - boxH / 2;

    this._box = { x: boxX, y: boxY, w: boxW, h: boxH, left: boxLeft, top: boxTop };

    const nameTagW = options.nameTagWidth ?? 168;
    const nameTagH = options.nameTagHeight ?? 36;
    const portraitMaxH = options.portraitMaxHeight ?? Math.min(280, boxH + 120);

    /** 立绘：首次 `setPortrait` 且纹理有效时创建，避免占位纹理 */
    this.portraitLeft = null;
    this.portraitRight = null;
    this._portraitMaxH = portraitMaxH;

    /** 渐变底板（Graphics 多段模拟纵向渐变） */
    this.bodyGradient = scene.add.graphics();
    this.bodyGradient.setDepth(this.depth - 1);
    this._drawBodyGradient(boxLeft, boxTop, boxW, boxH);

    /** 可选：整框边框图（铺在渐变之上、文字之下） */
    this.borderImage = null;
    if (this.borderTextureKey && scene.textures.exists(this.borderTextureKey)) {
      const bw = boxW + 28;
      const bh = boxH + 36;
      this.borderImage = scene.add
        .image(boxX, boxY, this.borderTextureKey)
        .setOrigin(0.5, 0.5)
        .setDepth(this.depth);
      setTextureLinearByKey(scene, this.borderTextureKey);
      scaleImageToRectCover(this.borderImage, bw, bh);
    }

    /** Ren'Py 名字标签：左上角「小耳朵」 */
    const tagX = boxLeft + 18;
    const tagY = boxTop - nameTagH * 0.35;
    this.nameTagBg = scene.add
      .rectangle(tagX + nameTagW / 2, tagY + nameTagH / 2, nameTagW, nameTagH, 0x5a9ec8, 0.92)
      .setStrokeStyle(2, 0xa8d8f0, 0.55)
      .setDepth(this.depth + 1)
      .setVisible(this.renpyMode);
    this.nameText = scene.add
      .text(tagX + 12, tagY + nameTagH / 2, '', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#1f5c2d',
      })
      .setOrigin(0, 0.5)
      .setDepth(this.depth + 2)
      .setVisible(this.renpyMode);

    const textPadX = 22;
    const textPadY = this.renpyMode ? 38 : 20;
    const textTop = boxTop + textPadY;

    this.bodyText = scene.add
      .text(boxLeft + textPadX, textTop, '', {
        fontFamily: 'Segoe UI, Georgia, serif',
        fontSize: '17px',
        color: '#f2f4f8',
        wordWrap: { width: boxW - textPadX * 2 },
        lineSpacing: 5,
      })
      .setDepth(this.depth + 3);

    this.arrow = scene.add
      .text(boxLeft + boxW - 28, boxTop + boxH - 22, '▼', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#a8d8f0',
      })
      .setAlpha(0)
      .setDepth(this.depth + 4);

    scene.tweens.add({
      targets: this.arrow,
      alpha: { from: 0, to: 1 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    /** 与 createDialogBox 一致：供 _runLines 等使用 `dialog.bg` */
    this.bg = scene.add
      .rectangle(boxX, boxY, boxW, boxH, 0x000000, 0)
      .setDepth(this.depth)
      .setInteractive({ useHandCursor: false });

    this._typingEvent = null;
    this._fullText = '';
    this._charIndex = 0;
    this._onCompleteCallback = null;
    this._currentName = '';
  }

  _fireOnCompleteOnce() {
    const cb = this._onCompleteCallback;
    this._onCompleteCallback = null;
    if (typeof cb === 'function') cb();
  }

  _layoutPortraits() {
    const y = this._box.top + 8;
    if (this.portraitLeft) this.portraitLeft.setPosition(140, y);
    if (this.portraitRight) this.portraitRight.setPosition(GAME_WIDTH - 140, y);
  }

  _drawBodyGradient(left, top, w, h) {
    const g = this.bodyGradient;
    g.clear();
    const steps = 14;
    const maxI = Math.max(steps - 1, 1);
    const c1 = Phaser.Display.Color.IntegerToColor(0x05070c);
    const c2 = Phaser.Display.Color.IntegerToColor(0x142434);
    for (let i = 0; i < steps; i++) {
      const t = i / maxI;
      const col = Phaser.Display.Color.GetColor(
        Phaser.Math.Linear(c1.red, c2.red, t),
        Phaser.Math.Linear(c1.green, c2.green, t),
        Phaser.Math.Linear(c1.blue, c2.blue, t)
      );
      const a = 0.78 + t * 0.14;
      const sh = h / steps + 1;
      g.fillStyle(col, a);
      g.fillRect(left, top + (i * h) / steps, w, sh);
    }
  }

  /** 与 createDialogBox 返回字段对齐 */
  get text() {
    return this.bodyText;
  }

  /**
   * @param {string} name 显示在名字标签上；空字符串则隐藏标签（Ren'Py 模式）
   */
  setSpeakerName(name) {
    this._currentName = name == null ? '' : String(name);
    if (!this.renpyMode) return;
    const show = this._currentName.length > 0;
    this.nameTagBg.setVisible(show);
    this.nameText.setVisible(show);
    if (show) {
      this.nameText.setText(this._currentName);
    }
  }

  /**
   * @param {'left'|'right'} side
   * @param {string | null} textureKey 已加载的纹理 key；null 则淡出隐藏
   * @param {{ fadeMs?: number }} [opts]
   */
  setPortrait(side, textureKey, opts) {
    const fadeMs = (opts && opts.fadeMs) ?? this.portraitFadeMs;
    let img = side === 'right' ? this.portraitRight : this.portraitLeft;

    if (!textureKey || !this.scene.textures.exists(textureKey)) {
      if (img) {
        this.scene.tweens.killTweensOf(img);
        this.scene.tweens.add({
          targets: img,
          alpha: 0,
          duration: fadeMs,
          ease: 'Sine.easeOut',
          onComplete: () => {
            img.setVisible(false);
          },
        });
      }
      return;
    }

    if (!img) {
      const y = this._box.top + 8;
      const x = side === 'right' ? GAME_WIDTH - 140 : 140;
      img = this.scene.add
        .image(x, y, textureKey)
        .setOrigin(0.5, 1)
        .setDepth(this.depth - 2)
        .setAlpha(0)
        .setVisible(true);
      if (side === 'right') this.portraitRight = img;
      else this.portraitLeft = img;
    } else {
      this.scene.tweens.killTweensOf(img);
      img.setTexture(textureKey);
    }

    setTextureLinearByKey(this.scene, textureKey);

    this._layoutPortraits();
    const fh = img.height > 0 ? img.height : 256;
    const scale = this._portraitMaxH / fh;
    img.setScale(scale);
    img.setVisible(true);
    img.setAlpha(0);
    this.scene.tweens.add({
      targets: img,
      alpha: 1,
      duration: fadeMs,
      ease: 'Sine.easeIn',
    });
  }

  /** 两侧立绘均淡出 */
  hidePortraits(fadeMs) {
    const ms = fadeMs ?? this.portraitFadeMs;
    this.setPortrait('left', null, { fadeMs: ms });
    this.setPortrait('right', null, { fadeMs: ms });
  }

  _finishTypewriterNow() {
    if (this._typingEvent) {
      this._typingEvent.remove(false);
      this._typingEvent = null;
    }
    this.bodyText.setText(this._fullText);
    this.arrow.setAlpha(1);
    this._fireOnCompleteOnce();
  }

  /**
   * 逐字显示（与 createDialogBox 行为一致）；点击跳过由外层 _runLines 等处理。
   * @param {string} text
   * @param {() => void} [onComplete]
   */
  say(text, onComplete) {
    if (this._typingEvent) {
      this._finishTypewriterNow();
    }

    this._fullText = text != null ? String(text) : '';
    this._charIndex = 0;
    this._onCompleteCallback = onComplete;
    this.bodyText.setText('');
    this.arrow.setAlpha(0);

    if (this._fullText.length === 0) {
      this.arrow.setAlpha(1);
      this._fireOnCompleteOnce();
      return;
    }

    this._typingEvent = this.scene.time.addEvent({
      delay: this.typewriterDelayMs,
      repeat: this._fullText.length - 1,
      callback: () => {
        this._charIndex++;
        this.bodyText.setText(this._fullText.slice(0, this._charIndex));

        if (this._charIndex >= this._fullText.length) {
          this._typingEvent = null;
          this.arrow.setAlpha(1);
          this._fireOnCompleteOnce();
        }
      },
    });
  }

  clear() {
    if (this._typingEvent) {
      this._typingEvent.remove(false);
      this._typingEvent = null;
    }
    this._onCompleteCallback = null;
    this._fullText = '';
    this._charIndex = 0;
    this.bodyText.setText('');
    this.arrow.setAlpha(0);
  }

  destroy() {
    this._onCompleteCallback = null;
    if (this._typingEvent) {
      this._typingEvent.remove(false);
      this._typingEvent = null;
    }
    this.scene.tweens.killTweensOf(this.arrow);
    if (this.portraitLeft) this.scene.tweens.killTweensOf(this.portraitLeft);
    if (this.portraitRight) this.scene.tweens.killTweensOf(this.portraitRight);
    const list = [
      this.bodyGradient,
      this.borderImage,
      this.nameTagBg,
      this.nameText,
      this.bodyText,
      this.arrow,
      this.bg,
      this.portraitLeft,
      this.portraitRight,
    ];
    list.forEach((o) => {
      if (o && o.destroy) o.destroy();
    });
    this.portraitLeft = null;
    this.portraitRight = null;
    this.borderImage = null;
  }
}

/**
 * 与 `createDialogBox` 相同的返回形态，便于把 `_runLines` 接到 Ren'Py UI 上。
 * @param {Phaser.Scene} scene
 * @param {ConstructorParameters<typeof DialogueUI>[1]} [options]
 */
export function createDialogueUI(scene, options) {
  const ui = new DialogueUI(scene, options);
  return {
    say: (t, c) => ui.say(t, c),
    clear: () => ui.clear(),
    finishNow: () => ui._finishTypewriterNow(),
    bg: ui.bg,
    text: ui.bodyText,
    arrow: ui.arrow,
    /** 完整实例：名字、立绘、销毁 */
    ui,
  };
}
