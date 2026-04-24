import { GAME_WIDTH, GAME_HEIGHT } from '../../config/GameConfig.js';
import {
  STAGE3_SCENE_KEYS,
  STAGE3_ASSETS,
  SCENE4_INSPECTION_HOTSPOT_CONFIG,
  STAGE3_REGISTRY_KEYS,
} from './stage3Config.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { createDialogBox, GENERIC_DIALOG } from '../../utils/Dialogue.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import { addProtagonistIllustration, PORTRAIT_SLOTS } from '../stage1-background/stage1NotebookShared.js';

const LAYER_RADIUS_MULTS = [1.0, 1.3, 1.6, 2.0];
const LAYER_ALPHAS = [0.5, 0.35, 0.2, 0.08];
const WARM_GLOW_COLOR = 0xffb070;
const PULSE_ALPHA_MIN = 0.55;
const PULSE_ALPHA_MAX = 0.95;
const PULSE_SCALE_MIN = 0.92;
const PULSE_SCALE_MAX = 1.08;
const PULSE_HALF_MS = 1000;
const HOVER_SCALE = 1.15;
const HOVER_TWEEN_MS = 180;

/** Stage 3 — Scene 4 营地抉择（与考察主画面同景，暖色光点选择） */
export default class Stage3Scene4DecisionScene extends Phaser.Scene {
  constructor() {
    super({ key: STAGE3_SCENE_KEYS.DECISION });
  }

  preload() {
    applyAssetPathPrefix(this);
    this.load.image(STAGE3_ASSETS.BG_INSPECTION_MAIN.key, gameAssetUrl(STAGE3_ASSETS.BG_INSPECTION_MAIN.file));
    this.load.image(STAGE3_ASSETS.PORTRAIT_THINKING.key, gameAssetUrl(STAGE3_ASSETS.PORTRAIT_THINKING.file));
  }

  create() {
    configureMainCameraSmoothPixels(this);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.image(cx, cy, STAGE3_ASSETS.BG_INSPECTION_MAIN.key).setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, STAGE3_ASSETS.BG_INSPECTION_MAIN.key);
    scaleFullscreenBackgroundImage(bg);

    const dimOverlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000).setAlpha(0.35).setDepth(1);

    const portrait = addProtagonistIllustration(this, STAGE3_ASSETS.PORTRAIT_THINKING.key, {
      ...GENERIC_DIALOG,
      ...PORTRAIT_SLOTS.right,
    });
    portrait.setAlpha(0);
    this.tweens.add({ targets: portrait, alpha: 1, duration: 600, ease: 'Sine.easeOut' });

    const dialog = createDialogBox(this, GENERIC_DIALOG);

    /** 与 Scene4_SiteInspection 一致：SCENE4_INSPECTION_HOTSPOT_CONFIG 为逻辑画布坐标 */
    const cfgA = SCENE4_INSPECTION_HOTSPOT_CONFIG.siteA;
    const cfgB = SCENE4_INSPECTION_HOTSPOT_CONFIG.siteB;
    const xA = cfgA.x;
    const yA = cfgA.y;
    const xB = cfgB.x;
    const yB = cfgB.y;
    const rA = cfgA.radius;
    const rB = cfgB.radius;

    /** @type {{ container: Phaser.GameObjects.Container; startPulse: () => void; stopPulse: () => void; labelContainer: Phaser.GameObjects.Container; setHoverGuard: (v: boolean) => void; killNonPulseTweens: () => void } | null} */
    let apiA = null;
    /** @type {typeof apiA} */
    let apiB = null;

    let choiceActive = false;

    const handlePick = (letter, picked, other) => {
      if (!choiceActive) return;
      choiceActive = false;

      picked.container.removeInteractive();
      other.container.removeInteractive();
      picked.setHoverGuard(false);
      other.setHoverGuard(false);
      picked.labelContainer.setVisible(false);
      other.labelContainer.setVisible(false);

      picked.stopPulse();
      other.stopPulse();
      picked.killNonPulseTweens();
      other.killNonPulseTweens();

      this.tweens.add({
        targets: picked.container,
        alpha: 1,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 300,
        ease: 'Sine.easeOut',
      });

      this.tweens.add({
        targets: other.container,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeIn',
      });

      this.tweens.add({
        targets: dimOverlay,
        alpha: 0.5,
        duration: 400,
        ease: 'Sine.easeInOut',
      });

      this.time.delayedCall(800, () => {
        this.registry.set(STAGE3_REGISTRY_KEYS.CHOSEN_SITE, letter);
        this.cameras.main.fadeOut(700, 0, 0, 0);
        this.time.delayedCall(700, () => {
          console.warn(
            '[Stage 3] Scene 5 not yet implemented. Chosen site:',
            this.registry.get(STAGE3_REGISTRY_KEYS.CHOSEN_SITE)
          );
        });
      });
    };

    apiA = this._createWarmHotspot(xA, yA, rA, () => handlePick('A', apiA, apiB));
    apiB = this._createWarmHotspot(xB, yB, rB, () => handlePick('B', apiB, apiA));

    apiA.container.removeInteractive();
    apiB.container.removeInteractive();
    apiA.container.setAlpha(0);
    apiB.container.setAlpha(0);

    const introLine = "It's getting late. Time to choose.";
    dialog.say(introLine, () => {
      this.input.once('pointerdown', () => {
        this.hidePortraitAndDialog(dialog, portrait);
        this.time.delayedCall(300, () => {
          choiceActive = true;
          this.tweens.add({
            targets: [apiA.container, apiB.container],
            alpha: PULSE_ALPHA_MIN,
            scaleX: PULSE_SCALE_MIN,
            scaleY: PULSE_SCALE_MIN,
            duration: 500,
            ease: 'Sine.easeOut',
            onComplete: () => {
              apiA.startPulse();
              apiB.startPulse();
              apiA.container.setInteractive(new Phaser.Geom.Circle(0, 0, rA), Phaser.Geom.Circle.Contains);
              apiB.container.setInteractive(new Phaser.Geom.Circle(0, 0, rB), Phaser.Geom.Circle.Contains);
              if (apiA.container.input) apiA.container.input.cursor = 'pointer';
              if (apiB.container.input) apiB.container.input.cursor = 'pointer';
            },
          });
        });
      });
    });
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {() => void} onPick
   */
  _createWarmHotspot(x, y, radius, onPick) {
    const container = this.add.container(x, y).setDepth(4000);
    const glow = this.add.graphics();
    let currentRadius = radius;

    const drawGlow = () => {
      glow.clear();
      for (let i = LAYER_RADIUS_MULTS.length - 1; i >= 0; i--) {
        const r = currentRadius * LAYER_RADIUS_MULTS[i];
        const a = LAYER_ALPHAS[i];
        glow.fillStyle(WARM_GLOW_COLOR, Math.min(1, a));
        glow.fillCircle(0, 0, r);
      }
    };
    drawGlow();

    const pad = 6;
    const txt = this.add
      .text(0, 0, 'Choose this', { fontSize: '14px', color: '#f5f5f5' })
      .setOrigin(0.5);
    const lblBg = this.add
      .rectangle(0, 0, txt.width + pad * 2, txt.height + pad * 2, 0x000000, 0.55)
      .setOrigin(0.5);
    const labelContainer = this.add.container(0, currentRadius + 20, [lblBg, txt]).setVisible(false);

    container.add([glow, labelContainer]);

    /** @type {Phaser.Tweens.Tween|null} */
    let pulseTween = null;
    let hoverGuard = true;

    const killNonPulseTweens = () => {
      const list = this.tweens.getTweensOf(container);
      if (list && list.length) {
        for (const t of list.slice()) {
          if (t && t !== pulseTween) t.stop();
        }
      }
    };

    const stopPulse = () => {
      if (pulseTween) {
        pulseTween.stop();
        pulseTween = null;
      }
    };

    const startPulse = () => {
      stopPulse();
      glow.setAlpha(1);
      container.setAlpha(PULSE_ALPHA_MIN);
      container.setScale(PULSE_SCALE_MIN);
      pulseTween = this.tweens.add({
        targets: container,
        alpha: PULSE_ALPHA_MAX,
        scaleX: PULSE_SCALE_MAX,
        scaleY: PULSE_SCALE_MAX,
        duration: PULSE_HALF_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    };

    container.setInteractive(new Phaser.Geom.Circle(0, 0, currentRadius), Phaser.Geom.Circle.Contains);
    if (container.input) container.input.cursor = 'pointer';

    container.on('pointerover', () => {
      if (!hoverGuard) return;
      labelContainer.setVisible(true);
      if (pulseTween) pulseTween.pause();
      killNonPulseTweens();
      this.tweens.add({
        targets: container,
        alpha: 1,
        scaleX: HOVER_SCALE,
        scaleY: HOVER_SCALE,
        duration: HOVER_TWEEN_MS,
        ease: 'Sine.easeOut',
      });
    });

    container.on('pointerout', () => {
      if (!hoverGuard) return;
      labelContainer.setVisible(false);
      killNonPulseTweens();
      if (pulseTween) pulseTween.resume();
    });

    container.on('pointerdown', () => {
      if (!hoverGuard) return;
      onPick();
    });

    return {
      container,
      labelContainer,
      startPulse,
      stopPulse,
      killNonPulseTweens,
      setHoverGuard(v) {
        hoverGuard = v;
      },
    };
  }

  hidePortraitAndDialog(dialog, portrait, durationMs = 300) {
    this.tweens.add({
      targets: [portrait, dialog.bg, dialog.text, dialog.arrow],
      alpha: 0,
      duration: durationMs,
      ease: 'Sine.easeOut',
    });
  }

  showPortraitAndDialog(dialog, portrait, durationMs = 300) {
    this.tweens.add({
      targets: [portrait, dialog.bg, dialog.text],
      alpha: 1,
      duration: durationMs,
      ease: 'Sine.easeIn',
    });
  }

  getResumePayload() {
    return {};
  }
}
