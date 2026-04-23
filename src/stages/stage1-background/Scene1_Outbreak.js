/**
 * 1898-03-05 —— 笔记本页 + 主角思索立绘。
 * 内容在 content/scripts/stage1Diary.js；本文件只把 Phaser 场景 key 绑到剧本上。
 */
import ScriptedScene from '../ScriptedScene.js';
import { SCRIPT_STAGE1_OUTBREAK } from '../../content/scripts/stage1Diary.js';

export default class Scene1Outbreak extends ScriptedScene {
  constructor() {
    super('BG1OutbreakScene', SCRIPT_STAGE1_OUTBREAK);
  }
}
