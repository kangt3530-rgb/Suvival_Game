/**
 * 资源注册表 — 所有贴图文件名与 Phaser 纹理 key 的单一来源。
 *
 * 设计约束（刻意保持朴素）：
 *   - 不包含音频、图集等当前没用到的类别；等到真要用再加。
 *   - `key` 由 ASSET 分类决定前缀（bg_* / char_* / ui_*），便于在 devtools / 纹理 cache 里定位来源。
 *   - 同一纹理在多个场景被用 → 只写一次；场景 preload 通过 `preloadAssets(scene, [refs])` 去重加载。
 *
 * 添加资源：把文件放到 /public/assets/，然后在下面按类别加一行。
 */
import { applyAssetPathPrefix, gameAssetUrl } from '../utils/assets.js';

/** @typedef {{ key: string, file: string }} AssetRef */

/** @type {{ bg: Record<string, AssetRef>, character: Record<string, AssetRef>, ui: Record<string, AssetRef> }} */
export const ASSETS = {
  bg: {
    notebook: { key: 'bg_notebook', file: 'notebook intro.png' },
    notebook1: { key: 'bg_notebook1', file: 'notebook1.png' },
    notebook2: { key: 'bg_notebook2', file: 'notebook2.png' },
    village: { key: 'bg_village', file: 'Village1.png' },
  },
  character: {
    // 同一文件可被多个语义 ref 指向（thinking 三场景共用）。key 仍是 texture cache 的真正主键。
    hero_thinking: { key: 'char_hero_thinking', file: 'main character-thinking.png' },
    hero_sleeping: { key: 'char_hero_sleeping', file: 'main-character-sleeping.png' },
    hero_awake: { key: 'char_hero_awake', file: 'main character-png.png' },
  },
  ui: {
    backpack: { key: 'ui_backpack', file: 'backpack.png' },
  },
};

/**
 * 点语法资源 ref 解析：`'bg.notebook'` → ASSETS.bg.notebook。
 * 未命中则抛错（提早暴露拼写问题）。
 * @param {string} ref
 * @returns {AssetRef}
 */
export function resolveAssetRef(ref) {
  if (!ref || typeof ref !== 'string') {
    throw new Error(`[assets] invalid asset ref: ${ref}`);
  }
  const [category, name] = ref.split('.');
  const bucket = ASSETS[category];
  if (!bucket || !bucket[name]) {
    throw new Error(`[assets] unknown asset ref: ${ref}`);
  }
  return bucket[name];
}

/**
 * 批量预加载；跳过已注册纹理，允许同一 ref 被多处列出。
 * @param {Phaser.Scene} scene
 * @param {string[]} refs 形如 ['bg.notebook', 'character.hero_thinking']
 */
export function preloadAssets(scene, refs) {
  if (!Array.isArray(refs) || refs.length === 0) return;
  applyAssetPathPrefix(scene);
  const seen = new Set();
  for (const r of refs) {
    if (seen.has(r)) continue;
    seen.add(r);
    const a = resolveAssetRef(r);
    if (scene.textures.exists(a.key)) continue;
    scene.load.image(a.key, gameAssetUrl(a.file));
  }
}
