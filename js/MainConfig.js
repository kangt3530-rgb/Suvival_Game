/**
 * MainConfig.js — 全局变量、场景键注册、Phaser 配置与启动
 * 必须在本文件之前加载 Scene1_Forest.js / Scene4_Fire.js / Scene7_Herbs.js（定义各 Scene 类）。
 * 场景跳转请统一使用 SCENE_KEYS，勿手写 Phaser 场景名字符串。
 * 新增场景：在此增加 SCENE_KEYS 项，并把类加入 PHASER_GAME_CONFIG.scene 数组。
 */

// ---------- 逻辑分辨率（800×600，经 Scale.FIT 铺满浏览器；使用 var 保证多脚本全局可见） ----------
var GAME_WIDTH = 1280;
var GAME_HEIGHT = 720;

/**
 * Phaser 场景注册键 — 与各类 constructor 中 super({ key }) 一致
 * 所有 this.scene.start / launch / pause 等均应通过此处常量跳转
 */
var SCENE_KEYS = {
  BG0: 'BG0TitleScene',
  BG1: 'BG1OutbreakScene',
  BG2: 'BG2StruggleScene',
  BG3: 'BG3DiscoveryScene',
  BG4: 'BG4TimeTravelScene',
  AR1: 'AR1ArrivedScene',
  AR2: 'AR2BackpackScene',
  AR3: 'AR3ForestScene',
  CAMP: 'CampSelectScene',
  NPC: 'NpcScene',
  FIRE_SPOT: 'FireSpotScene',
  FIRE_PREP: 'FireSitePrepScene',
  COLLECT: 'CollectMaterialsScene',
  SORTING: 'SortingMaterialsScene',
  CONSTRUCT: 'ConstructFireScene',
  MAINTAIN: 'MaintainFireScene',
  HERBS: 'HerbHuntScene',
};

// ---------- Phaser 根配置 ----------
var PHASER_GAME_CONFIG = {
  type: Phaser.AUTO,
  resolution: window.devicePixelRatio || 1,
  scale: {
    parent: 'game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [
    BG0TitleScene,
    BG1OutbreakScene,
    BG2StruggleScene,
    BG3DiscoveryScene,
    BG4TimeTravelScene,
    AR1ArrivedScene,
    AR2BackpackScene,
    AR3ForestScene,
    CampSelectScene,
    NpcScene,
    FireSpotScene,
    FireSitePrepScene,
    CollectMaterialsScene,
    SortingMaterialsScene,
    ConstructFireScene,
    MaintainFireScene,
    HerbHuntScene,
  ],
};

var game = new Phaser.Game(PHASER_GAME_CONFIG);

window.addEventListener('resize', () => {
  game.scale.refresh();
});
