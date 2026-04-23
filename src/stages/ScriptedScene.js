/**
 * ScriptedScene —— 纯剧本线性叙事场景基类。
 *
 * 把原先 Stage 1 三幕 create() 里重复的样板（fadeIn / 预载 / 运行 / 回收 resume）
 * 收敛到一处。派生类通常只用来绑定 Phaser 场景 key 与要播的剧本数据。
 *
 * 典型用法：
 *   export default class Foo extends ScriptedScene {
 *     constructor() { super('FooSceneKey', SCRIPT_FOO); }
 *   }
 *
 * 想加点场景特例（如入场前额外预载、播完前的 VFX）时，在子类里覆盖对应钩子：
 *   - `preloadExtra(scene)` — 额外 preload
 *   - `createBefore(scene)` — runScript 之前
 *   - `onScriptComplete(scene)` — 覆盖默认「fadeOut→transitionScene(next)」
 */
import { preloadForScript, runScript } from '../system/ScriptRunner.js';

export default class ScriptedScene extends Phaser.Scene {
  /**
   * @param {string} key Phaser 场景 key，需与 SCENE_KEYS 对齐
   * @param {import('../system/ScriptRunner.js').Script} script 剧本对象
   */
  constructor(key, script) {
    super({ key });
    this.__script = script;
  }

  preload() {
    preloadForScript(this, this.__script);
    if (typeof this.preloadExtra === 'function') this.preloadExtra(this);
  }

  create() {
    this.cameras.main.fadeIn(600, 0, 0, 0);
    if (typeof this.createBefore === 'function') this.createBefore(this);

    const boot = this.sys.settings.data || {};
    const startIndex =
      typeof boot.scriptIndex === 'number'
        ? boot.scriptIndex
        : typeof boot.startLine === 'number'
          ? boot.startLine // 兼容旧 resume 载荷
          : 0;

    runScript(this, this.__script, {
      startIndex,
      onComplete:
        typeof this.onScriptComplete === 'function'
          ? (scene) => this.onScriptComplete(scene)
          : undefined,
    });
  }

  getResumePayload() {
    return { scriptIndex: this._scriptIndex != null ? this._scriptIndex : 0 };
  }
}
