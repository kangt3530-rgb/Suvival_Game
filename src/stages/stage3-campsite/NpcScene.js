import { SCENE_KEYS } from '../../config/GameConfig.js';

/** 兼容入口：跳转至 CampSelectScene state 2 */
export default class NpcScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NpcScene' });
  }

  create() {
    this.scene.start(SCENE_KEYS.CAMP, { startState: 2 });
  }
}
