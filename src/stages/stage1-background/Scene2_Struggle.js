/**
 * 1898-06-12 —— 疲惫、研究草药。
 * 内容在 content/scripts/stage1Diary.js；本文件只把 Phaser 场景 key 绑到剧本上。
 */
import ScriptedScene from '../ScriptedScene.js';
import { SCRIPT_STAGE1_STRUGGLE } from '../../content/scripts/stage1Diary.js';

export default class Scene2Struggle extends ScriptedScene {
  constructor() {
    super('BG2StruggleScene', SCRIPT_STAGE1_STRUGGLE);
  }
}
