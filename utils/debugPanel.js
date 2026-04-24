/**
 * 使用示例（需在地址栏加 ?debug=1 才会显示面板）：
 *
 * // 在场景的 create() 里：
 * import { attachLayoutPanel } from '../utils/debugPanel.js';
 *
 * this.layout = {
 *   padding: 24,
 *   titleColor: 0xffcc66,
 *   label: 'Hello',
 *   nested: { x: 0.5, visible: true }
 * };
 * attachLayoutPanel(this, this.layout, (layout) => {
 *   // 根据 layout 重算位置 / 样式
 *   this.titleText.setTint(layout.titleColor);
 * });
 */

/**
 * @param {import('phaser').Scene} scene
 * @param {object} layout
 * @param {(layout: object) => void} onUpdate
 */
export function attachLayoutPanel(scene, layout, onUpdate) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') !== '1') return;

  const GUI = typeof lil !== 'undefined' && lil.GUI ? lil.GUI : window.lil?.GUI;
  if (!GUI) return;

  const gui = new GUI({ title: scene.scene.key, closed: true });

  const notify = () => onUpdate(layout);

  const actions = {
    copy() {
      const text = JSON.stringify(layout, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        void navigator.clipboard.writeText(text).catch(() => {
          window.prompt('Copy layout JSON:', text);
        });
      } else {
        window.prompt('Copy layout JSON:', text);
      }
    },
  };
  gui.add(actions, 'copy').name('📋 Copy JSON');

  function isPlainObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  function isColorNumberField(key, value) {
    return typeof value === 'number' && /color/i.test(key);
  }

  function walk(folder, obj) {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (isPlainObject(value)) {
        const sub = folder.addFolder(key);
        walk(sub, value);
        continue;
      }
      if (isColorNumberField(key, value)) {
        folder.addColor(obj, key).onChange(notify);
        continue;
      }
      if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
        folder.add(obj, key).onChange(notify);
        continue;
      }
    }
  }

  walk(gui, layout);

  const cleanup = () => {
    try { gui.destroy(); } catch {}
  };
  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
}
