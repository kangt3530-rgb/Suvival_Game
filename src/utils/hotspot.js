/**
 * Stage 3 点击热区：多层同心圆奶油金发光 + 呼吸 pulse + hover / 点击反馈 + 可选 ✓ 状态。
 *
 * createHotspot 可选参数：
 * - `id` (string)：热区标识，供 debug 面板与 `createHotspotGroup.getHotspot(id)` 使用。
 * - `debugDraggable` (boolean，默认 false)：为 true 时，可用 **右键拖动** 或 **Shift + 左键** 拖动热区；拖动中不触发 `onClick`。
 * - `onDebugDrag` ((x, y) => void)：仅在 `debugDraggable` 为 true 时，每次拖动导致位置变化时回调（世界坐标）。
 *
 * 返回对象除原有方法外新增：
 * - `setPosition(x, y)`：设置热区世界坐标。
 * - `setRadius(r)`：重绘同心圆、更新点击区域与附属 UI。
 * - `getRadius()`：当前半径（调试面板与导出 JSON 使用）。
 */

const GLOW_COLOR = 0xffe8c0;

const LAYER_RADIUS_MULTS = [1.0, 1.3, 1.6, 2.0];
const LAYER_ALPHAS = [0.5, 0.35, 0.2, 0.08];

/**
 * @param {Phaser.Scene} scene
 * @param {{
 *   x: number,
 *   y: number,
 *   radius: number,
 *   onClick: () => void,
 *   depth?: number,
 *   label?: string,
 *   id?: string,
 *   debugDraggable?: boolean,
 *   onDebugDrag?: (x: number, y: number) => void,
 * }} options
 */
export function createHotspot(scene, options) {
  const {
    x,
    y,
    radius: initialRadius,
    onClick,
    depth = 5000,
    label,
    id: hotspotId,
    debugDraggable = false,
    onDebugDrag,
  } = options;

  /** @type {number} */
  let currentRadius = initialRadius;

  const container = scene.add.container(x, y);
  container.setDepth(depth);

  const glow = scene.add.graphics();
  const drawGlow = () => {
    glow.clear();
    for (let i = LAYER_RADIUS_MULTS.length - 1; i >= 0; i--) {
      const r = currentRadius * LAYER_RADIUS_MULTS[i];
      const a = LAYER_ALPHAS[i];
      glow.fillStyle(GLOW_COLOR, Math.min(1, a));
      glow.fillCircle(0, 0, r);
    }
  };
  drawGlow();

  const checkText = scene.add
    .text(0, -(currentRadius + 15), '✓', {
      fontSize: `${Math.max(18, Math.round(currentRadius * 1.1))}px`,
      color: '#ffffff',
      stroke: '#1a1a1a',
      strokeThickness: 4,
    })
    .setOrigin(0.5, 1)
    .setVisible(false);

  /** @type {Phaser.GameObjects.Container|null} */
  let labelContainer = null;
  if (label) {
    const pad = 6;
    const txt = scene.add
      .text(0, 0, label, { fontSize: '14px', color: '#f5f5f5' })
      .setOrigin(0.5);
    const bg = scene.add
      .rectangle(0, 0, txt.width + pad * 2, txt.height + pad * 2, 0x000000, 0.55)
      .setOrigin(0.5);
    labelContainer = scene.add.container(0, currentRadius + 20);
    labelContainer.add([bg, txt]);
    labelContainer.setVisible(false);
  }

  container.add([glow, ...(labelContainer ? [labelContainer] : []), checkText]);

  const refreshHitArea = () => {
    container.setInteractive(
      new Phaser.Geom.Circle(0, 0, currentRadius),
      Phaser.Geom.Circle.Contains
    );
    if (container.input) {
      container.input.cursor = 'pointer';
    }
  };
  refreshHitArea();

  const PULSE_ALPHA_MIN = 0.55;
  const PULSE_ALPHA_MAX = 0.95;
  const PULSE_SCALE_MIN = 0.92;
  const PULSE_SCALE_MAX = 1.08;
  const PULSE_HALF_MS = 1000;
  const CONTAINER_ALPHA_CHECKED = 0.25;
  const HOVER_SCALE = 1.15;
  const HOVER_TWEEN_MS = 180;
  const CLICK_PRESS_MS = 85;
  const CLICK_RELEASE_MS = 130;

  let enabled = true;
  /** @internal 是否已探索（与 setChecked 同步） */
  let isChecked = false;
  let hovered = false;

  /** @type {Phaser.Tweens.Tween|null} */
  let pulseTween = null;

  let dragActive = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  /** @type {((pointer: Phaser.Input.Pointer) => void)|null} */
  let onSceneMove = null;
  /** @type {((pointer: Phaser.Input.Pointer) => void)|null} */
  let onSceneUp = null;

  const killNonPulseContainerTweens = () => {
    const list = scene.tweens.getTweensOf(container);
    if (list && list.length) {
      const copy = list.slice();
      for (let i = 0; i < copy.length; i++) {
        const t = copy[i];
        if (t && t !== pulseTween) t.stop();
      }
    }
    scene.tweens.killTweensOf(glow);
  };

  const stopPulse = () => {
    if (pulseTween) {
      pulseTween.stop();
      pulseTween = null;
    }
  };

  const startPulse = () => {
    stopPulse();
    if (!enabled || isChecked) return;
    glow.setAlpha(1);
    container.setAlpha(PULSE_ALPHA_MIN);
    container.setScale(PULSE_SCALE_MIN);
    pulseTween = scene.tweens.add({
      targets: container,
      alpha: PULSE_ALPHA_MAX,
      scaleX: PULSE_SCALE_MAX,
      scaleY: PULSE_SCALE_MAX,
      duration: PULSE_HALF_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  };

  if (debugDraggable) {
    onSceneMove = (pointer) => {
      if (!dragActive) return;
      const nx = pointer.worldX + dragOffsetX;
      const ny = pointer.worldY + dragOffsetY;
      container.setPosition(nx, ny);
      if (typeof onDebugDrag === 'function') {
        onDebugDrag(nx, ny);
      }
      if (hotspotId != null) {
        scene.events.emit('hotspot-debug-drag', { id: hotspotId, x: nx, y: ny });
      }
    };
    onSceneUp = () => {
      const wasDragging = dragActive;
      dragActive = false;
      if (wasDragging && !isChecked && pulseTween && enabled) {
        pulseTween.resume();
      }
    };
    scene.input.on('pointermove', onSceneMove);
    scene.input.on('pointerup', onSceneUp);
  }

  container.on('pointerover', () => {
    if (!enabled || dragActive) return;
    if (isChecked) {
      if (labelContainer) labelContainer.setVisible(true);
      return;
    }
    hovered = true;
    if (labelContainer) labelContainer.setVisible(true);
    if (pulseTween) pulseTween.pause();
    killNonPulseContainerTweens();
    scene.tweens.add({
      targets: container,
      alpha: 1,
      scaleX: HOVER_SCALE,
      scaleY: HOVER_SCALE,
      duration: HOVER_TWEEN_MS,
      ease: 'Sine.easeOut',
    });
  });

  container.on('pointerout', () => {
    if (!enabled || dragActive) return;
    hovered = false;
    if (labelContainer) labelContainer.setVisible(false);
    if (isChecked) return;
    killNonPulseContainerTweens();
    if (pulseTween) pulseTween.resume();
  });

  container.on('pointerdown', (pointer) => {
    if (!enabled) return;
    const ev = pointer.event;
    const shift = !!(ev && ev.shiftKey);
    const wantDebugDrag =
      debugDraggable &&
      (pointer.rightButtonDown() || (shift && pointer.leftButtonDown()));
    if (wantDebugDrag) {
      if (ev && typeof ev.preventDefault === 'function') {
        ev.preventDefault();
      }
      dragActive = true;
      dragOffsetX = container.x - pointer.worldX;
      dragOffsetY = container.y - pointer.worldY;
      if (!isChecked && pulseTween) pulseTween.pause();
      killNonPulseContainerTweens();
      return;
    }
    if (!pointer.leftButtonDown()) return;
    if (!isChecked && pulseTween) pulseTween.pause();
    killNonPulseContainerTweens();
    const releaseScale = isChecked ? 1 : hovered ? HOVER_SCALE : 1;
    scene.tweens.add({
      targets: container,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: CLICK_PRESS_MS,
      ease: 'Sine.easeIn',
      onComplete: () => {
        scene.tweens.add({
          targets: container,
          scaleX: releaseScale,
          scaleY: releaseScale,
          duration: CLICK_RELEASE_MS,
          ease: 'Sine.easeOut',
          onComplete: () => {
            onClick();
            if (!isChecked) {
              if (hovered) {
                scene.tweens.add({
                  targets: container,
                  alpha: 1,
                  scaleX: HOVER_SCALE,
                  scaleY: HOVER_SCALE,
                  duration: HOVER_TWEEN_MS,
                  ease: 'Sine.easeOut',
                });
              } else if (pulseTween) {
                pulseTween.resume();
              }
            }
          },
        });
      },
    });
  });

  glow.setAlpha(1);
  startPulse();

  return {
    setChecked(checkedVal) {
      isChecked = !!checkedVal;
      checkText.setVisible(isChecked);
      if (labelContainer) labelContainer.setVisible(false);
      killNonPulseContainerTweens();
      if (isChecked) {
        stopPulse();
        glow.setAlpha(1);
        container.setAlpha(CONTAINER_ALPHA_CHECKED);
        container.setScale(1);
      } else {
        glow.setAlpha(1);
        hovered = false;
        startPulse();
      }
    },
    setEnabled(isEnabled) {
      enabled = !!isEnabled;
      if (enabled) {
        refreshHitArea();
        if (container.input) {
          container.input.cursor = 'pointer';
        }
        hovered = false;
        if (labelContainer) labelContainer.setVisible(false);
        killNonPulseContainerTweens();
        if (isChecked) {
          stopPulse();
          glow.setAlpha(1);
          container.setAlpha(CONTAINER_ALPHA_CHECKED);
          container.setScale(1);
        } else {
          startPulse();
        }
      } else {
        container.disableInteractive();
        stopPulse();
        killNonPulseContainerTweens();
        if (labelContainer) labelContainer.setVisible(false);
        hovered = false;
        container.setAlpha(0.45);
        container.setScale(1);
        glow.setAlpha(isChecked ? 0.2 : 0.35);
      }
    },
    setPosition(px, py) {
      container.setPosition(px, py);
    },
    setRadius(r) {
      currentRadius = Math.max(10, r);
      stopPulse();
      drawGlow();
      checkText.setY(-(currentRadius + 15));
      checkText.setStyle({
        fontSize: `${Math.max(18, Math.round(currentRadius * 1.1))}px`,
        color: '#ffffff',
        stroke: '#1a1a1a',
        strokeThickness: 4,
      });
      if (labelContainer) {
        labelContainer.setY(currentRadius + 20);
      }
      if (enabled) {
        refreshHitArea();
      }
      killNonPulseContainerTweens();
      if (isChecked) {
        glow.setAlpha(1);
        container.setAlpha(CONTAINER_ALPHA_CHECKED);
        container.setScale(1);
      } else {
        startPulse();
      }
    },
    getRadius() {
      return currentRadius;
    },
    destroy() {
      stopPulse();
      killNonPulseContainerTweens();
      scene.tweens.killTweensOf(glow);
      if (debugDraggable && onSceneMove && onSceneUp) {
        scene.input.off('pointermove', onSceneMove);
        scene.input.off('pointerup', onSceneUp);
      }
      container.destroy(true);
    },
    container,
  };
}

/**
 * @param {Phaser.Scene} scene
 * @param {{
 *   hotspots: Array<{
 *     id: string,
 *     x: number,
 *     y: number,
 *     radius: number,
 *     onClick: () => void,
 *     label?: string,
 *     depth?: number,
 *     debugDraggable?: boolean,
 *     onDebugDrag?: (x: number, y: number) => void,
 *   }>,
 *   initialCheckedIds?: string[],
 *   onAllChecked: () => void,
 * }} options
 */
export function createHotspotGroup(scene, options) {
  const { hotspots, initialCheckedIds = [], onAllChecked } = options;
  const ids = hotspots.map((h) => h.id);
  const checkedIds = new Set();
  const clickedIds = new Set();
  /** @type {Map<string, ReturnType<typeof createHotspot>>} */
  const hotspotsById = new Map();
  let allCheckedFired = false;

  const tryFireAllChecked = () => {
    if (allCheckedFired) return;
    if (ids.every((id) => checkedIds.has(id))) {
      allCheckedFired = true;
      onAllChecked();
    }
  };

  for (const h of hotspots) {
    const { id, onClick: userOnClick, ...rest } = h;
    const api = createHotspot(scene, {
      ...rest,
      id,
      onClick: () => {
        userOnClick();
        clickedIds.add(id);
      },
    });
    hotspotsById.set(id, api);
  }

  for (const id of initialCheckedIds) {
    const api = hotspotsById.get(id);
    if (api) {
      checkedIds.add(id);
      api.setChecked(true);
    }
  }
  tryFireAllChecked();

  return {
    markChecked(id) {
      if (checkedIds.has(id)) {
        tryFireAllChecked();
        return;
      }
      const api = hotspotsById.get(id);
      if (!api) return;
      checkedIds.add(id);
      api.setChecked(true);
      tryFireAllChecked();
    },
    isAllChecked() {
      return ids.every((id) => checkedIds.has(id));
    },
    getCheckedIds() {
      return [...checkedIds];
    },
    getHotspot(id) {
      return hotspotsById.get(id) ?? null;
    },
    destroy() {
      for (const api of hotspotsById.values()) {
        api.destroy();
      }
      hotspotsById.clear();
    },
    hotspotsById,
  };
}
