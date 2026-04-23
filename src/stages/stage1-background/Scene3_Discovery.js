/**
 * 1900-10-03 —— 重获希望。
 * 内容在 content/scripts/stage1Diary.js；本文件只把 Phaser 场景 key 绑到剧本上。
 */
import ScriptedScene from '../ScriptedScene.js';
import { SCRIPT_STAGE1_DISCOVERY } from '../../content/scripts/stage1Diary.js';

export default class Scene3Discovery extends ScriptedScene {
  constructor() {
    super('BG3DiscoveryScene', SCRIPT_STAGE1_DISCOVERY);
  }
}
