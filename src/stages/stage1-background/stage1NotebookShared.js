import { GAME_WIDTH, GAME_HEIGHT } from '../../config/GameConfig.js';
import { applyAssetPathPrefix, gameAssetUrl } from '../../utils/assets.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  setGameObjectTextureLinear,
  scaleFullscreenBackgroundImage,
} from '../../utils/imageQuality.js';
import { DIALOG_DEPTH_PORTRAIT_UNDER_DIALOG, STAGE1_DIARY_DIALOG } from '../../utils/Dialogue.js';
import { TEXT_DATE_PILL } from '../../utils/typography.js';

export const NOTEBOOK_INTRO_FILE = 'notebook intro.png';
export const NOTEBOOK_TEX_KEY = 'st1_notebook_bg';

/** 与 `createDialogBox(scene, STAGE1_DIARY_DIALOG)` 一致，供立绘对齐 */
export { STAGE1_DIARY_DIALOG };

/** 若尚未加载则注册统一笔记本背景图 */
export function ensureNotebookIntroLoaded(scene) {
  applyAssetPathPrefix(scene);
  if (!scene.textures.exists(NOTEBOOK_TEX_KEY)) {
    scene.load.image(NOTEBOOK_TEX_KEY, gameAssetUrl(NOTEBOOK_INTRO_FILE));
  }
}

/**
 * P3/VN 式立绘：大半身、在整条对白 UI（半透明底 + 字）**下面**一层，脚底可裁切；不同原图高度用同一目标屏上高度，视觉一致。
 *
 * @param {Phaser.Scene} scene
 * @param {string} textureKey 已在本场景 preload 的立绘 key
 * @param {Partial<typeof STAGE1_DIARY_DIALOG> & {
 *   portraitDepth?: number,
 *   portraitAdjustY?: number,
 *   portraitLiftPx?: number,
 * }} [dialogLayoutOpts] 与 `STAGE1_DIARY_DIALOG` 合并；某张立绘头偏高/偏低可设 `portraitAdjustY`（像素，负号上移）
 */
export function addProtagonistIllustration(scene, textureKey, dialogLayoutOpts = {}) {
  const opts = { ...STAGE1_DIARY_DIALOG, ...dialogLayoutOpts };
  const depth = opts.portraitDepth ?? DIALOG_DEPTH_PORTRAIT_UNDER_DIALOG;

  const anchorXR = opts.portraitScreenAnchorXRatio ?? 0.18;
  const x = GAME_WIDTH * anchorXR;

  const bottomBleed = opts.portraitBottomBleed ?? 40;
  const lift = opts.portraitLiftPx ?? 0;
  const adjustY = opts.portraitAdjustY ?? 0;
  const y = GAME_HEIGHT + bottomBleed - lift + adjustY;

  const img = scene.add.image(x, y, textureKey).setOrigin(0.5, 1).setDepth(depth);
  setGameObjectTextureLinear(img);

  const fw = img.frame.width;
  const fh = img.frame.height;
  if (fw > 0 && fh > 0) {
    const wRatio = opts.portraitMaxWidthScreenRatio ?? 1 / 3;
    const hRatio = opts.portraitMaxHeightScreenRatio ?? 0.62;
    const maxW = GAME_WIDTH * wRatio;
    const maxH = GAME_HEIGHT * hRatio;
    const raw = Math.min(maxW / fw, maxH / fh);
    const sc = Math.min(3.5, Math.max(0.05, raw));
    img.setScale(sc);
  }
  return img;
}

export function addNotebookBackground(scene, depth = 0) {
  configureMainCameraSmoothPixels(scene);
  const img = scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, NOTEBOOK_TEX_KEY)
    .setOrigin(0.5, 0.5)
    .setDepth(depth);
  setTextureLinearByKey(scene, NOTEBOOK_TEX_KEY);
  scaleFullscreenBackgroundImage(img);
  return img;
}

/** 顶部日期条（与对白深度协调） */
export function addDiaryDateLine(scene, text, depth = 6000) {
  return scene.add
    .text(GAME_WIDTH / 2, 28, text, TEXT_DATE_PILL)
    .setOrigin(0.5)
    .setDepth(depth);
}
