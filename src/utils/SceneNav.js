/**
 * 场景栈与前进/返回 — 供 MainConfig 与各 Scene 模块 import（ESM 下不能依赖未导入的全局名）。
 */
import { SCENE_KEYS } from '../config/GameConfig.js';

export const SCENE_NAV_STACK = [];
export const SCENE_RESUME = {};

export function snapshotSceneForNav(fromScene) {
  if (!fromScene || !fromScene.scene || !fromScene.scene.key) return;
  const k = fromScene.scene.key;
  if (typeof fromScene.getResumePayload === 'function') {
    SCENE_RESUME[k] = fromScene.getResumePayload();
  }
}

export function transitionScene(fromScene, toKey, data) {
  snapshotSceneForNav(fromScene);
  if (fromScene && fromScene.scene && fromScene.scene.key) {
    SCENE_NAV_STACK.push(fromScene.scene.key);
  }
  if (arguments.length >= 3) {
    fromScene.scene.start(toKey, data);
  } else {
    fromScene.scene.start(toKey);
  }
}

export function transitionSceneNoHistory(fromScene, toKey, data) {
  snapshotSceneForNav(fromScene);
  if (arguments.length >= 3) {
    fromScene.scene.start(toKey, data);
  } else {
    fromScene.scene.start(toKey);
  }
}

export function goToTitleScene(fromScene) {
  SCENE_NAV_STACK.length = 0;
  for (const k of Object.keys(SCENE_RESUME)) {
    delete SCENE_RESUME[k];
  }
  fromScene.scene.start(SCENE_KEYS.BG0);
}

export function transitionToConstructFromSortingComplete(sortScene) {
  const collectScene = sortScene.scene.get(SCENE_KEYS.COLLECT);
  if (collectScene && typeof collectScene.getResumePayload === 'function') {
    SCENE_RESUME[SCENE_KEYS.COLLECT] = collectScene.getResumePayload();
  }
  SCENE_NAV_STACK.push(SCENE_KEYS.COLLECT);
  sortScene.registry.set('fireSortComplete', true);
  sortScene.scene.stop(SCENE_KEYS.COLLECT);
  sortScene.scene.stop(SCENE_KEYS.SORTING);
  sortScene.scene.start(SCENE_KEYS.CONSTRUCT);
}

export function addSceneBackButton(scene, opts) {
  opts = opts || {};
  const x = opts.x != null ? opts.x : 16;
  const y = opts.y != null ? opts.y : 14;
  const depth = opts.depth != null ? opts.depth : 200000;
  const label = opts.label != null ? opts.label : 'Back';
  const btn = scene.add
    .text(x, y, label, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '15px',
      color: '#f5ecd8',
      backgroundColor: '#3d3228',
      padding: { x: 12, y: 8 },
    })
    .setOrigin(0, 0)
    .setDepth(depth)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  function syncVis() {
    btn.setVisible(SCENE_NAV_STACK.length > 0);
  }
  syncVis();
  scene.time.delayedCall(0, syncVis);
  btn.on('pointerover', function () {
    btn.setStyle({ backgroundColor: '#524638' });
  });
  btn.on('pointerout', function () {
    btn.setStyle({ backgroundColor: '#3d3228' });
  });
  btn.on('pointerdown', function () {
    if (typeof scene.tryConsumeInternalBack === 'function' && scene.tryConsumeInternalBack()) {
      return;
    }
    if (SCENE_NAV_STACK.length === 0) return;
    const prevKey = SCENE_NAV_STACK.pop();
    let data = SCENE_RESUME[prevKey];
    if (data === undefined || data === null) data = {};
    scene.scene.start(prevKey, data);
  });
  return btn;
}
