/**
 * Scene0_Background.js — 序章背景场景及全局工具函数
 * 由 src/main.js 动态导入；对白工具见 src/utils/Dialogue.js。
 */
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../../src/config/GameConfig.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../../src/utils/imageQuality.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../src/utils/assets.js';
import { transitionScene, addSceneBackButton } from '../../src/utils/SceneNav.js';

// ============================================================
// BG0TitleScene — 标题场景（notebook intro 全屏背景，点击进入序章）
// ============================================================
class BG0TitleScene extends Phaser.Scene {
  constructor() { super({ key: 'BG0TitleScene' }); }

  preload() {
    applyAssetPathPrefix(this);
    this.load.once('loaderror', function (file) {
      console.error('[load failed]', file && file.key, file && file.url);
    });
    this.load.image('bg_title', gameAssetUrl('notebook intro.png'));
  }

  create() {
    configureMainCameraSmoothPixels(this);

    const bg = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_title')
      .setOrigin(0.5, 0.5);
    setTextureLinearByKey(this, 'bg_title');
    scaleFullscreenBackgroundImage(bg);

    // "Click to open" 提示文字
    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.82, 'Click to open', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#f5e6d3',
    })
      .setOrigin(0.5)
      .setDepth(5000);

    this.tweens.add({
      targets: hint,
      alpha: { from: 0.5, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 快速跳转提示
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.91, 'S — skip to backpack   W — skip to scouting', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#a08060',
    })
      .setOrigin(0.5)
      .setDepth(5000);

    // 点击 → 淡出进 BG1
    let clicked = false;
    const goScene = (key, data) => {
      if (clicked) return;
      clicked = true;
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        if (data) {
          this.scene.start(key, data);
        } else {
          transitionScene(this, key);
        }
      });
    };

    this.input.on('pointerdown', () => goScene(SCENE_KEYS.BG1));
    this.input.keyboard.on('keydown-S', () => goScene(SCENE_KEYS.AR2));
    this.input.keyboard.on('keydown-W', () => goScene('Stage3_Scouting', { skipIntro: true }));

    addSceneBackButton(this);
  }
}

Object.assign(globalThis, {
  BG0TitleScene,
});
