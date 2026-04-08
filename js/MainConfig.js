/**
 * MainConfig.js — 全局变量、场景键注册、Phaser 配置与启动
 * 必须在本文件之前加载 Scene0_Background.js → Scene1_CampsiteChoose.js → Scene2_Firebuilding.js（定义各 Scene 类）。
 * 场景跳转请统一使用 SCENE_KEYS，勿手写 Phaser 场景名字符串。
 * 新增场景：在此增加 SCENE_KEYS 项，并把类加入 PHASER_GAME_CONFIG.scene 数组。
 */

// ---------- 逻辑分辨率（800×600，经 Scale.FIT 铺满浏览器；使用 var 保证多脚本全局可见） ----------
var GAME_WIDTH = 1280;
var GAME_HEIGHT = 720;

/**
 * 开发调试：从 Scene2 等任意已注册场景直接启动，跳过序章与营地。
 * - 设为 null：正常从 BG0 标题开始。
 * - 设为 SCENE_KEYS 短名（如 'FIRE_NPC'、'FIRE_PREP'）或 Phaser 场景 key。
 * - 或浏览器地址加参数：?start=FIRE_NPC（优先于本变量）。
 * 发布前请改回 null，或删除 URL 参数。
 */
var DEV_START_SCENE = null;

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
  /** Scene 7：Maintain 胜利后 — 火把照明寻草（勿与营地 Scene 9 点击采集混淆） */
  HERBS: 'HerbHuntScene',
  /** 生火线 Scene 1：路遇旅行者（营地 Scene 9 结束后由此进入；HerbHuntScene 完成后回标题，不再进入本场景） */
  FIRE_NPC: 'FirebuildingNpcScene',
  /** 生火线 Scene 2：四处检视选火点（接在 FirebuildingNpcScene 之后） */
  FIRE_SPOT_INSPECT: 'FireSpotInspectScene',
};

/** Phaser 场景 key → 类，用于 DEV 启动时重排 scene 数组首位 */
var SCENE_KEY_TO_CLASS = {
  BG0TitleScene: BG0TitleScene,
  BG1OutbreakScene: BG1OutbreakScene,
  BG2StruggleScene: BG2StruggleScene,
  BG3DiscoveryScene: BG3DiscoveryScene,
  BG4TimeTravelScene: BG4TimeTravelScene,
  AR1ArrivedScene: AR1ArrivedScene,
  AR2BackpackScene: AR2BackpackScene,
  AR3ForestScene: AR3ForestScene,
  CampSelectScene: CampSelectScene,
  NpcScene: NpcScene,
  FireSpotScene: FireSpotScene,
  FireSitePrepScene: FireSitePrepScene,
  CollectMaterialsScene: CollectMaterialsScene,
  SortingMaterialsScene: SortingMaterialsScene,
  ConstructFireScene: ConstructFireScene,
  MaintainFireScene: MaintainFireScene,
  HerbHuntScene: HerbHuntScene,
  FirebuildingNpcScene: FirebuildingNpcScene,
  FireSpotInspectScene: FireSpotInspectScene,
};

/** 默认播放顺序（与发布流程一致）；DEV 时可将其中某一类移到首位启动 */
var DEFAULT_SCENE_ORDER = [
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
  FirebuildingNpcScene,
  FireSpotInspectScene,
];

/**
 * 解析开发入口：URL ?start= 优先，其次 DEV_START_SCENE。
 * @returns {string|null} Phaser 场景 key，如 'FireSitePrepScene'
 */
function resolveDevStartSceneKey() {
  var fromUrl = null;
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      var p = new URLSearchParams(window.location.search);
      var q = p.get('start');
      if (q) {
        if (SCENE_KEYS[q]) fromUrl = SCENE_KEYS[q];
        else if (SCENE_KEY_TO_CLASS[q]) fromUrl = q;
      }
    }
  } catch (e) {}
  if (fromUrl) return fromUrl;

  var d = typeof DEV_START_SCENE !== 'undefined' ? DEV_START_SCENE : null;
  if (!d) return null;
  if (SCENE_KEYS[d]) return SCENE_KEYS[d];
  if (SCENE_KEY_TO_CLASS[d]) return d;
  return null;
}

function buildSceneListForBoot() {
  var devKey = resolveDevStartSceneKey();
  var list = DEFAULT_SCENE_ORDER.slice();
  if (devKey && SCENE_KEY_TO_CLASS[devKey]) {
    var First = SCENE_KEY_TO_CLASS[devKey];
    list = list.filter(function (C) {
      return C !== First;
    });
    list.unshift(First);
  }
  return list;
}

// ---------- Phaser 根配置 ----------
var PHASER_GAME_CONFIG = {
  type: Phaser.AUTO,
  backgroundColor: '#2a1a0a',
  resolution: window.devicePixelRatio || 1,
  scale: {
    parent: 'game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: buildSceneListForBoot(),
};

var game = new Phaser.Game(PHASER_GAME_CONFIG);

(function allowDevBootConstruct() {
  var k = resolveDevStartSceneKey();
  if (k === 'ConstructFireScene') {
    game.registry.set('fireSortComplete', true);
  }
})();

window.addEventListener('resize', () => {
  game.scale.refresh();
});
