import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig.js';

/**
 * 主相机不将坐标取整到整数像素，避免缩放时出现额外锯齿。
 * （全局 `render.roundPixels` 应在 MainConfig 中一并关闭。）
 * @param {Phaser.Scene} scene
 */
export function configureMainCameraSmoothPixels(scene) {
  const cam = scene.cameras && scene.cameras.main;
  if (!cam) return;
  cam.roundPixels = false;
}

/**
 * WebGL 纹理双线性过滤；高清位图缩小时比默认更清晰顺滑。
 * @param {Phaser.Scene} scene
 * @param {string} textureKey
 */
export function setTextureLinearByKey(scene, textureKey) {
  if (typeof Phaser === 'undefined' || !scene || !textureKey) return;
  if (!scene.textures.exists(textureKey)) return;
  const tex = scene.textures.get(textureKey);
  if (tex && typeof tex.setFilter === 'function') {
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
}

/** @param {Phaser.GameObjects.Image | Phaser.GameObjects.Sprite} go */
export function setGameObjectTextureLinear(go) {
  if (!go || !go.texture || !go.scene) return;
  setTextureLinearByKey(go.scene, go.texture.key);
}

/**
 * 全屏背景：源图任一边大于逻辑分辨率时，用等比 `setScale`（cover）代替 `setDisplaySize`，
 * 避免非等比拉伸与过大纹理缩放质量差。
 * @param {Phaser.GameObjects.Image} img
 * @param {number} [gw]
 * @param {number} [gh]
 */
export function scaleFullscreenBackgroundImage(img, gw = GAME_WIDTH, gh = GAME_HEIGHT) {
  const frame = img.frame;
  const srcW = frame.width;
  const srcH = frame.height;
  if (!srcW || !srcH) return;

  if (srcW > gw || srcH > gh) {
    const s = Math.max(gw / srcW, gh / srcH);
    img.setScale(s);
  } else {
    img.setDisplaySize(gw, gh);
  }
}

/**
 * 将图像 cover 到目标矩形（源大于目标边时用等比 scale）。
 * @param {Phaser.GameObjects.Image} img
 * @param {number} targetW
 * @param {number} targetH
 */
export function scaleImageToRectCover(img, targetW, targetH) {
  const frame = img.frame;
  const srcW = frame.width;
  const srcH = frame.height;
  if (!srcW || !srcH) return;
  if (srcW > targetW || srcH > targetH) {
    const s = Math.max(targetW / srcW, targetH / srcH);
    img.setScale(s);
  } else {
    img.setDisplaySize(targetW, targetH);
  }
}

/**
 * 装入正方形视口（边长 `side`）；用于背包等「近似方形」大图。
 * @param {Phaser.GameObjects.Image} img
 * @param {number} side
 */
export function scaleImageToSquareSide(img, side) {
  const frame = img.frame;
  const srcW = frame.width;
  const srcH = frame.height;
  if (!srcW || !srcH) return;
  if (srcW > side || srcH > side) {
    const s = side / Math.max(srcW, srcH);
    img.setScale(s);
  } else {
    img.setDisplaySize(side, side);
  }
}
