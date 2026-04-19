/** Live Server 从仓库根打开时由 main 设 public/；Vite 在 index head 注入 GAME_ASSET_PREFIX */
if (!('GAME_ASSET_PREFIX' in globalThis) || globalThis.GAME_ASSET_PREFIX === undefined) {
  globalThis.GAME_ASSET_PREFIX = globalThis.__SERVED_BY_VITE__ ? '' : 'public/';
}
