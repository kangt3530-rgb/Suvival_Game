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
