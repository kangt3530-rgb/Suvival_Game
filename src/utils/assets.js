/**
 * 资源路径：配合 globalThis.GAME_ASSET_PREFIX（Vite 为空，Live Server 根目录为 public/）
 * 实际文件位于仓库 /public/assets/，在站点上为 /assets/… 或 /public/assets/…
 */
export function applyAssetPathPrefix(scene) {
  if (typeof globalThis !== 'undefined' && globalThis.GAME_ASSET_PREFIX) {
    scene.load.setPath(String(globalThis.GAME_ASSET_PREFIX).replace(/\/?$/, '/'));
  }
}

export function gameAssetUrl(fileName) {
  return 'assets/' + String(fileName).split('/').map(encodeURIComponent).join('/');
}

/**
 * 在当前场景停留期间，把下一关要用的贴图提前塞进 Loader（已在 cache 则跳过）。
 * 减轻 `scene.start` 后下一场景 preload 带来的纯色底 / 黑屏断层。
 * @param {Phaser.Scene} scene
 * @param {Array<{ key: string, file: string }>} entries
 */
export function warmTextureCache(scene, entries) {
  applyAssetPathPrefix(scene);
  let queued = 0;
  for (const e of entries) {
    if (!e || !e.key || !e.file) continue;
    if (!scene.textures.exists(e.key)) {
      scene.load.image(e.key, gameAssetUrl(e.file));
      queued++;
    }
  }
  if (queued > 0) {
    scene.load.start();
  }
}
