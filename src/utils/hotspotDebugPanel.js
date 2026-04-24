/**
 * Hotspot debug panel — runtime tuning for hotspot positions and radii.
 *
 * Usage:
 *   1. Create hotspots with debugDraggable: true
 *   2. Call attachHotspotDebugPanel(scene, hotspotGroup)
 *   3. Open the game with ?debug=1 in URL
 *   4. Shift + drag any hotspot to reposition
 *   5. Adjust radii via the sidebar panel
 *   6. Click "Copy All Coords as JSON" and paste back to stage3Config.js
 */

import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig.js';

/**
 * @param {Phaser.Scene} scene
 * @param {ReturnType<import('./hotspot.js').createHotspotGroup>} hotspotGroup
 * @param {{ title?: string, enabled?: boolean }} [options]
 */
export function attachHotspotDebugPanel(scene, hotspotGroup, options) {
  options = options || {};

  let urlDebug = false;
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      urlDebug = new URLSearchParams(window.location.search).get('debug') === '1';
    }
  } catch (e) {}

  const forceOn = options.enabled === true;
  const forceOff = options.enabled === false;
  if (forceOff) return;
  if (!urlDebug && !forceOn) return;

  if (!hotspotGroup || !hotspotGroup.hotspotsById) return;

  const GUIClass = typeof window !== 'undefined' && (window.lil?.GUI || window.GUI);
  if (!GUIClass) {
    console.warn('[hotspotDebugPanel] lil-gui not found (window.lil.GUI / window.GUI).');
    return;
  }

  const panelTitle = options.title != null ? options.title : `${scene.scene.key} Hotspots`;
  const gui = new GUIClass({ title: panelTitle });

  const HINT_TEXT = 'Shift + drag to reposition hotspots';
  const pad = 8;
  const hintX = 12;
  const hintY = GAME_HEIGHT - 12;
  const hintText = scene.add
    .text(hintX + pad, hintY - pad, HINT_TEXT, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
    })
    .setOrigin(0, 1)
    .setScrollFactor(0)
    .setDepth(999999);

  const bw = hintText.width + pad * 2;
  const bh = hintText.height + pad * 2;
  const hintBg = scene.add
    .rectangle(hintX + bw / 2, hintY - bh / 2, bw, bh, 0x000000, 0.55)
    .setOrigin(0.5, 0.5)
    .setScrollFactor(0)
    .setDepth(999998);

  /** @type {Map<string, { displayData: { x: number, y: number, radius: number }, controllers: { x: any, y: any, radius: any } }>} */
  const registry = new Map();

  const idList = Array.from(hotspotGroup.hotspotsById.keys());
  for (const id of idList) {
    const api = hotspotGroup.getHotspot(id);
    if (!api) continue;

    const displayData = {
      x: api.container.x,
      y: api.container.y,
      radius: api.getRadius(),
    };

    const folder = gui.addFolder(id);
    const cX = folder
      .add(displayData, 'x', 0, GAME_WIDTH)
      .step(1)
      .onChange((v) => {
        api.setPosition(v, displayData.y);
      });
    const cY = folder
      .add(displayData, 'y', 0, GAME_HEIGHT)
      .step(1)
      .onChange((v) => {
        api.setPosition(displayData.x, v);
      });
    const cR = folder
      .add(displayData, 'radius', 10, 200)
      .step(1)
      .onChange((v) => {
        api.setRadius(v);
      });

    registry.set(id, { displayData, controllers: { x: cX, y: cY, radius: cR } });
    folder.open();
  }

  const onDebugDragSync = (ev) => {
    const rec = registry.get(ev.id);
    if (!rec) return;
    rec.displayData.x = ev.x;
    rec.displayData.y = ev.y;
    rec.controllers.x.updateDisplay();
    rec.controllers.y.updateDisplay();
  };
  scene.events.on('hotspot-debug-drag', onDebugDragSync);

  const copyPayload = {
    copyAllCoordsJson() {
      const payload = {};
      for (const id of idList) {
        const api = hotspotGroup.getHotspot(id);
        if (!api) continue;
        payload[id] = {
          x: Math.round(api.container.x),
          y: Math.round(api.container.y),
          radius: Math.round(api.getRadius()),
        };
      }
      const str = JSON.stringify(payload, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str).catch(() => {
          window.prompt('Copy JSON:', str);
        });
      } else {
        window.prompt('Copy JSON:', str);
      }
    },
  };
  gui.add(copyPayload, 'copyAllCoordsJson').name('📋 Copy All Coords as JSON');

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    scene.events.off('hotspot-debug-drag', onDebugDragSync);
    if (gui && typeof gui.destroy === 'function') {
      gui.destroy();
    }
    hintBg.destroy();
    hintText.destroy();
  };

  scene.events.once('shutdown', cleanup);
  scene.events.once('destroy', cleanup);
}
