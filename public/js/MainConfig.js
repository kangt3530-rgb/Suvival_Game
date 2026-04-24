/**
 * MainConfig.js — 场景栈、跳转工具、Phaser 配置与启动
 * 由 src/main.js 动态导入；SCENE_KEYS / 分辨率等见 src/config/GameConfig.js。
 */
import {
  SCENE_KEYS,
  GAME_WIDTH,
  GAME_HEIGHT,
  DEV_START_SCENE,
} from '../../src/config/GameConfig.js';
import { SCENE_NAV_STACK } from '../../src/utils/SceneNav.js';
import Stage3EnterForestScene from '../../src/stages/stage3-campsite/Scene1_EnterForest.js';
import Stage3NpcEncounterScene from '../../src/stages/stage3-campsite/Scene2_NpcEncounter.js';
import Stage3ScoutingScene from '../../src/stages/stage3-campsite/Scene3_Scouting.js';
import Stage3Scene3SubWaterScene from '../../src/stages/stage3-campsite/Scene3Sub_Water.js';
import Stage3Scene3SubGroundScene from '../../src/stages/stage3-campsite/Scene3Sub_Ground.js';
import Stage3Scene3SubWindScene from '../../src/stages/stage3-campsite/Scene3Sub_Wind.js';
import Stage3Scene3SubOverheadScene from '../../src/stages/stage3-campsite/Scene3Sub_Overhead.js';
import '../../src/scenes/test/TestHotspotScene.js';

/** Phaser 场景 key → 类（由各 Scene 模块挂到 globalThis） */
var SCENE_KEY_TO_CLASS = {
  BG0TitleScene: globalThis.BG0TitleScene,
  BG1OutbreakScene: globalThis.BG1OutbreakScene,
  BG2StruggleScene: globalThis.BG2StruggleScene,
  BG3DiscoveryScene: globalThis.BG3DiscoveryScene,
  BG4TimeTravelScene: globalThis.BG4TimeTravelScene,
  AR1ArrivedScene: globalThis.AR1ArrivedScene,
  AR2BackpackScene: globalThis.AR2BackpackScene,
  AR3ForestScene: globalThis.AR3ForestScene,
  CampSelectScene: globalThis.CampSelectScene,
  NpcScene: globalThis.NpcScene,
  FireSpotScene: globalThis.FireSpotScene,
  FireSitePrepScene: globalThis.FireSitePrepScene,
  CollectMaterialsScene: globalThis.CollectMaterialsScene,
  SortingMaterialsScene: globalThis.SortingMaterialsScene,
  ConstructFireScene: globalThis.ConstructFireScene,
  MaintainFireScene: globalThis.MaintainFireScene,
  HerbHuntScene: globalThis.HerbHuntScene,
  FirebuildingNpcScene: globalThis.FirebuildingNpcScene,
  FireSpotInspectScene: globalThis.FireSpotInspectScene,
  TestHotspotScene: globalThis.TestHotspotScene,
  Stage3_EnterForest: Stage3EnterForestScene,
  Stage3_NpcEncounter: Stage3NpcEncounterScene,
  Stage3_Scouting: Stage3ScoutingScene,
  Stage3_Scene3SubWater: Stage3Scene3SubWaterScene,
  Stage3_Scene3SubGround: Stage3Scene3SubGroundScene,
  Stage3_Scene3SubWind: Stage3Scene3SubWindScene,
  Stage3_Scene3SubOverhead: Stage3Scene3SubOverheadScene,
};

/** 默认播放顺序（与发布流程一致）；DEV 时可将其中某一类移到首位启动 */
var DEFAULT_SCENE_ORDER = [
  globalThis.BG0TitleScene,
  globalThis.BG1OutbreakScene,
  globalThis.BG2StruggleScene,
  globalThis.BG3DiscoveryScene,
  globalThis.BG4TimeTravelScene,
  globalThis.AR1ArrivedScene,
  globalThis.AR2BackpackScene,
  globalThis.AR3ForestScene,
  globalThis.CampSelectScene,
  globalThis.NpcScene,
  globalThis.FireSpotScene,
  globalThis.FireSitePrepScene,
  globalThis.CollectMaterialsScene,
  globalThis.SortingMaterialsScene,
  globalThis.ConstructFireScene,
  globalThis.MaintainFireScene,
  globalThis.HerbHuntScene,
  globalThis.FirebuildingNpcScene,
  globalThis.FireSpotInspectScene,
  globalThis.TestHotspotScene,
  Stage3EnterForestScene,
  Stage3NpcEncounterScene,
  Stage3ScoutingScene,
  Stage3Scene3SubWaterScene,
  Stage3Scene3SubGroundScene,
  Stage3Scene3SubWindScene,
  Stage3Scene3SubOverheadScene,
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
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      var sp = new URLSearchParams(window.location.search);
      if (sp.get('start')) {
        SCENE_NAV_STACK.length = 0;
      }
    }
  } catch (e) {}
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
// 自适应布局：逻辑画布固定 1280×720，Scale.FIT 等比铺满浏览器并居中（留黑边，不裁剪、不拉伸）。
var PHASER_GAME_CONFIG = {
  type: Phaser.AUTO,
  backgroundColor: '#1a1008',
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
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

// 窗口尺寸变化时重算 FIT 比例；避免切屏 / 调窗口后画布位置错位。
window.addEventListener('resize', () => {
  game.scale.refresh();
});
