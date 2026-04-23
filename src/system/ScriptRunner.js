/**
 * ScriptRunner —— 对 content/scripts/*.js 里的 node 列表逐节点执行。
 *
 * 设计原则：
 *   - 渲染全部委托给现有 helper（createDialogBox、addDiaryDateLine、
 *     addNotebookBackground、addProtagonistIllustration、scaleFullscreenBackgroundImage），
 *     不新造视觉元素；这次重构聚焦在「内容 / 展现 / 系统」三层分离，不改外观。
 *   - 状态极简：scene._scriptIndex 供 getResumePayload() 回收；其他状态全部局部化在闭包里。
 *   - 不做 save / rewind / log；需要时再扩。
 */
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig.js';
import {
  createDialogBox,
  STAGE1_DIARY_DIALOG,
  AR1_ARRIVED_DIALOG,
} from '../utils/Dialogue.js';
import { transitionScene, addSceneBackButton } from '../utils/SceneNav.js';
import { preloadAssets, resolveAssetRef } from '../content/assets.js';
import {
  configureMainCameraSmoothPixels,
  setTextureLinearByKey,
  scaleFullscreenBackgroundImage,
} from '../utils/imageQuality.js';
import {
  addDiaryDateLine,
  addProtagonistIllustration,
} from '../stages/stage1-background/stage1NotebookShared.js';

/** 布局预设集 —— 仍用 Dialogue.js 里原有两个常量，避免改 UI。 */
const LAYOUTS = {
  diary: STAGE1_DIARY_DIALOG,
  ar1: AR1_ARRIVED_DIALOG,
};

/**
 * 把 script 中引用到的资源交给 scene.load。
 * 调用时机：Phaser `preload()` 内。
 * @param {Phaser.Scene} scene
 * @param {{ nodes: Array<{ type: string, asset?: string }> }} script
 */
export function preloadForScript(scene, script) {
  const refs = [];
  for (const n of script.nodes || []) {
    if ((n.type === 'bg' || n.type === 'character') && n.asset) {
      refs.push(n.asset);
    }
  }
  // 日记布局：预加载场景指定的笔记本图页（默认 notebook1）
  refs.push(script.notebookAsset || 'bg.notebook1');
  preloadAssets(scene, refs);
}

function buildLabelMap(nodes) {
  const m = {};
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n && n.label) m[n.label] = i;
  }
  return m;
}

/**
 * 最近一个 `say` 节点 —— 用于 resume 时把「已播完」的场景重放到最后一句。
 * @returns {number} 若没有 `say`，返回 -1
 */
function lastSayIndex(nodes) {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodes[i] && nodes[i].type === 'say') return i;
  }
  return -1;
}

/**
 * 执行剧本。非 say 节点立即处理并步进；say 节点绘字、等待 pointerdown 继续。
 * @param {Phaser.Scene} scene
 * @param {{
 *   scene?: string,
 *   next?: string,
 *   layout?: 'diary' | 'ar1',
 *   nodes: Array<any>
 * }} script
 * @param {{
 *   startIndex?: number,
 *   onComplete?: (scene: Phaser.Scene) => void,
 *   addBackButton?: boolean,
 * }} [opts]
 * @returns {{ getIndex: () => number }}
 */
export function runScript(scene, script, opts = {}) {
  const nodes = script.nodes || [];
  const labels = buildLabelMap(nodes);
  const layoutKey = script.layout || 'diary';
  const layout = LAYOUTS[layoutKey] || STAGE1_DIARY_DIALOG;

  /** 播完后默认行为：淡出 600ms → transitionScene 到 script.next。 */
  const defaultComplete = () => {
    if (!script.next) return;
    scene.cameras.main.fadeOut(600, 0, 0, 0);
    scene.time.delayedCall(600, () => {
      transitionScene(scene, script.next);
    });
  };
  const onComplete = typeof opts.onComplete === 'function' ? opts.onComplete : defaultComplete;

  configureMainCameraSmoothPixels(scene);

  /** 展现层桥接 —— 每个 case 都复用 helpers；状态留存在闭包里 */
  const presentation = createPresentation(scene, script.notebookAsset || 'bg.notebook1');

  const dialog = createDialogBox(scene, layout);

  // 入场 fadeIn 统一放在 scene.create 里（剧本不介入相机淡入），保持各场景既有行为。
  // 若场景需要跳过「首帧闪原图」，继续自己在 create() 开头 fadeIn。

  let i = clampStartIndex(opts.startIndex, nodes);
  scene._scriptIndex = i;

  presentation.activateFocusEffect();

  // 统计 startIndex 之前已有多少 say 节点，判断是否需要 openPhase。
  let preSayCount = 0;
  for (let k = 0; k < i; k++) {
    if (nodes[k] && nodes[k].type === 'say') preSayCount++;
  }
  // openPhase：等待第一次点击再显示 notebook1 + 开始第一句。
  // resume 时（已经过了至少一句）直接显示。
  let openPhase = preSayCount === 0;
  if (!openPhase) presentation.revealNotebook1();

  let waitingForSay = false;
  /** @type {any} */
  let currentSayNode = null;
  let dialogReady = false;

  function renderUpTo(targetIndex) {
    // 非 say 节点同步跑完，遇到 say 停下等 pointerdown。
    while (i < targetIndex && i < nodes.length) {
      const node = nodes[i];
      if (!node) {
        i++;
        continue;
      }
      if (node.type === 'say') break;
      applySideEffect(node);
      i++;
    }
    scene._scriptIndex = i;
  }

  function applySideEffect(node) {
    switch (node.type) {
      case 'bg':
        presentation.setBackground(node.asset);
        break;
      case 'date':
        presentation.setDate(node.text);
        break;
      case 'character':
        presentation.setCharacter(node.slot || 'hero', node.asset, layout);
        break;
      case 'jump': {
        const tIdx = resolveJumpTarget(node.target, labels, nodes);
        if (tIdx >= 0) i = tIdx - 1; // -1 抵消外层 i++
        break;
      }
      // 'choice' 在 step() 里处理（需要等待输入）；其它类型静默忽略。
      default:
        break;
    }
  }

  function step() {
    scene._scriptIndex = i;

    // 从当前位置推进到下一个 say 或终点。
    while (i < nodes.length) {
      const node = nodes[i];
      if (!node) {
        i++;
        continue;
      }

      if (node.type === 'choice') {
        showChoice(node);
        return;
      }

      if (node.type === 'say') {
        // openPhase 中不启动打字；等 onPointerDown 触发 revealNotebook1 + 再次 step()。
        if (openPhase) return;
        currentSayNode = node;
        waitingForSay = true;
        dialogReady = false;
        dialog.say(node.text, () => {
          dialogReady = true;
        });
        scene._scriptIndex = i;
        return;
      }

      // 非 say / 非 choice：立即执行副作用并步进
      applySideEffect(node);
      i++;
    }

    // 所有节点耗尽
    scene._scriptIndex = nodes.length;
    scene.input.off('pointerdown', onPointerDown);
    onComplete(scene);
  }

  function onPointerDown() {
    // openPhase：第一次点击用于显示 notebook1 + 启动第一句，不做对话推进。
    if (openPhase) {
      openPhase = false;
      presentation.revealNotebook1();
      // 立即执行 step()，让第一个 say 节点开始打字。
      step();
      return;
    }
    if (!waitingForSay || !currentSayNode) return;
    if (!dialogReady) {
      // 点击跳过逐字机 —— 用现有 dialog.say 的"已在打字中则瞬完成"语义。
      dialog.say(currentSayNode.text, () => {
        dialogReady = true;
      });
      dialogReady = true;
      return;
    }
    waitingForSay = false;
    currentSayNode = null;
    i++;
    step();
  }

  /** 选项 UI：按钮纵向排列在对白框下方。 */
  function showChoice(node) {
    waitingForSay = false;
    scene.input.off('pointerdown', onPointerDown);

    const prompt = scene.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 300, node.prompt || '', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#f5e6d3',
        backgroundColor: 'rgba(0,0,0,0.62)',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(5100);

    /** @type {Phaser.GameObjects.Text[]} */
    const btns = [];
    (node.options || []).forEach((opt, idx) => {
      const btn = scene.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT - 250 + idx * 44, opt.label, {
          fontFamily: 'Segoe UI, Arial, sans-serif',
          fontSize: '16px',
          color: '#fff8e7',
          backgroundColor: '#5c3d2e',
          padding: { x: 18, y: 8 },
        })
        .setOrigin(0.5)
        .setDepth(5101)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => {
        btns.forEach((b) => b.destroy());
        prompt.destroy();
        const tIdx = resolveJumpTarget(opt.goto, labels, nodes);
        i = tIdx >= 0 ? tIdx : i + 1;
        scene.input.on('pointerdown', onPointerDown);
        step();
      });
      btns.push(btn);
    });
  }

  scene.input.on('pointerdown', onPointerDown);

  if (opts.addBackButton !== false) {
    addSceneBackButton(scene);
  }

  step();

  return { getIndex: () => scene._scriptIndex };
}

/** 有 `say` 时把越界 startIndex 夹到最后一句；否则夹到 0。 */
function clampStartIndex(raw, nodes) {
  const n = typeof raw === 'number' && raw >= 0 ? raw : 0;
  if (n < nodes.length) return n;
  const last = lastSayIndex(nodes);
  return last >= 0 ? last : 0;
}

function resolveJumpTarget(target, labels, nodes) {
  if (typeof target === 'number') return target;
  if (typeof target === 'string' && labels[target] != null) return labels[target];
  return nodes.length; // 未知目标 → 落到末尾，交由 onComplete
}

/**
 * 展现桥：每个 case 都委托给既有 helpers，维持当前外观。
 * - 背景：使用注册表中的 key 直接渲染（避免和旧 helper 的内部 key 冲突）。
 * - 立绘：hero slot 走 `addProtagonistIllustration`（VN 式左 1/3 车道）。
 * - 日期：`addDiaryDateLine`。
 */
function createPresentation(scene, notebookAssetRef = 'bg.notebook1') {
  /** @type {Phaser.GameObjects.Image | null} */
  let bgImage = null;
  let currentBgRef = null;
  /** @type {Phaser.GameObjects.Image | null} */
  let notebook1Image = null;
  /** @type {Phaser.GameObjects.Text | null} */
  let dateText = null;
  /** @type {Map<string, Phaser.GameObjects.Image>} */
  const characterBySlot = new Map();
  let focusEffectActive = false;

  return {
    setBackground(ref) {
      if (ref === currentBgRef) return;
      if (bgImage) { bgImage.destroy(); bgImage = null; }
      if (notebook1Image) { notebook1Image.destroy(); notebook1Image = null; }
      currentBgRef = ref;
      if (!ref) return;
      const a = resolveAssetRef(ref);
      if (!scene.textures.exists(a.key)) {
        // 明确报错，避免静默掉 missing texture（绿黑斜纹）
        // eslint-disable-next-line no-console
        console.error(`[ScriptRunner] background texture not loaded: ${ref} (key=${a.key})`);
        return;
      }
      configureMainCameraSmoothPixels(scene);
      bgImage = scene.add
        .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, a.key)
        .setOrigin(0.5, 0.5)
        .setDepth(0);
      setTextureLinearByKey(scene, a.key);
      scaleFullscreenBackgroundImage(bgImage);
    },

    /** 第一次点击时调用：notebookAsset 出现（仅第一次有弹入动效） */
    revealNotebook1() {
      if (notebook1Image) return;
      const nb1Key = resolveAssetRef(notebookAssetRef).key;
      if (!scene.textures.exists(nb1Key)) return;
      notebook1Image = scene.add
        .image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, nb1Key)
        .setOrigin(0.5, 0.5)
        .setDepth(50)
        .setAlpha(0);
      setTextureLinearByKey(scene, nb1Key);
      const fw = notebook1Image.frame.realWidth || notebook1Image.width;
      const fh = notebook1Image.frame.realHeight || notebook1Image.height;
      const targetScale = (fw > 0 && fh > 0)
        ? Math.min(GAME_WIDTH / fw, GAME_HEIGHT / fh) * 0.8
        : 1;

      const firstTime = !scene.game.registry.get('notebook1_shown');
      if (firstTime) {
        scene.game.registry.set('notebook1_shown', true);
        notebook1Image.setScale(targetScale * 0.88);
        scene.tweens.add({
          targets: notebook1Image,
          alpha: 1,
          scaleX: targetScale,
          scaleY: targetScale,
          duration: 480,
          ease: 'Back.easeOut',
        });
      } else {
        notebook1Image.setScale(targetScale).setAlpha(1);
      }
    },

    setDate(text) {
      if (dateText) dateText.setText(text || '');
      else dateText = addDiaryDateLine(scene, text || '');
    },

    setCharacter(slot, ref, layout) {
      const prev = characterBySlot.get(slot);
      if (prev) {
        prev.destroy();
        characterBySlot.delete(slot);
      }
      if (!ref) return;
      if (slot !== 'hero') {
        // 目前只实现 hero 槽（VN 左车道）；其它 slot 作为扩展点留到真有需求时实现。
        // eslint-disable-next-line no-console
        console.warn('[ScriptRunner] character slot not yet supported:', slot);
        return;
      }
      const a = resolveAssetRef(ref);
      const img = addProtagonistIllustration(scene, a.key, layout || {});
      characterBySlot.set(slot, img);
    },

    /**
     * 叠加「景深虚化」：背景高斯模糊 + 暗遮罩，立即生效。
     * 立绘（depth 4550）和对话框（depth 4998+）均在遮罩层之上，不受影响。
     */
    activateFocusEffect() {
      if (focusEffectActive) return;
      focusEffectActive = true;

      // 暗遮罩：位于 bg(0) 之上、立绘(4550) 之下
      const TARGET_ALPHA = 0.52;
      const TARGET_OFFSET = 9;
      const TARGET_STRENGTH = 2.1;

      scene.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
        .setAlpha(TARGET_ALPHA)
        .setDepth(1);

      // 背景模糊：仅作用于 bgImage 本身，不影响上层对象
      if (bgImage && bgImage.postFX) {
        bgImage.postFX.addBlur(1, TARGET_OFFSET, TARGET_STRENGTH, 12);
      }
    },
  };
}
