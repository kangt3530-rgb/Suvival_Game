/**
 * MainConfig.js — 全局变量、场景键注册、Phaser 配置与启动
 * 必须在本文件之前加载 Scene0_Background.js → Scene1_CampsiteChoose.js → Scene2_Firebuilding.js（定义各 Scene 类）。
 * 场景跳转请统一使用 SCENE_KEYS 与 transitionScene()，勿手写裸 this.scene.start（标题/例外见各文件注释）。
 * 新增场景：在此增加 SCENE_KEYS 项，并把类加入 PHASER_GAME_CONFIG.scene 数组。
 */

// ---------- 逻辑分辨率（800×600，经 Scale.FIT 铺满浏览器；使用 var 保证多脚本全局可见） ----------
var GAME_WIDTH = 1280;
var GAME_HEIGHT = 720;

/** 世界层：地块说明文字 — 高于等距图形与玩家圆点，低于底部对白条(dialog ~5000) */
var WORLD_UI_LABEL_DEPTH = 4900;
/** 世界层：玩家位置圆点 — 低于 WORLD_UI_LABEL_DEPTH，避免挡住地块标签 */
var WORLD_PLAYER_MARKER_DEPTH = 4600;
/** Scene2 等距关：分区/材料说明文字 — 高于地块与 pile，低于全屏 intro 遮罩(2500+) */
var ISO_GAMEPLAY_LABEL_DEPTH = 1100;

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

/** 前进跳转前压入当前场景 key；角落 Back 弹出并回到上一场景 */
var SCENE_NAV_STACK = [];
/** 离开某场景 forward 时快照，Back 时 scene.start(prevKey, SCENE_RESUME[prevKey]) 以恢复对话/阶段 */
var SCENE_RESUME = {};

function snapshotSceneForNav(fromScene) {
  if (!fromScene || !fromScene.scene || !fromScene.scene.key) return;
  var k = fromScene.scene.key;
  if (typeof fromScene.getResumePayload === 'function') {
    SCENE_RESUME[k] = fromScene.getResumePayload();
  }
}

/**
 * 带历史的场景切换（替代直接 this.scene.start）。
 * @param {Phaser.Scene} fromScene 当前场景 this
 * @param {string} toKey 目标 Phaser 场景 key
 * @param {*} [data] 可选 init 数据
 */
function transitionScene(fromScene, toKey, data) {
  snapshotSceneForNav(fromScene);
  if (fromScene && fromScene.scene && fromScene.scene.key) {
    SCENE_NAV_STACK.push(fromScene.scene.key);
  }
  if (arguments.length >= 3) {
    fromScene.scene.start(toKey, data);
  } else {
    fromScene.scene.start(toKey);
  }
}

/**
 * 前进但不压栈：用于「同一剧情页」内的跳转（例如营地多 stage 仍算一页，进入生火链后 Back 应回到进入营地前的场景，而不是重置营地）。
 */
function transitionSceneNoHistory(fromScene, toKey, data) {
  snapshotSceneForNav(fromScene);
  if (arguments.length >= 3) {
    fromScene.scene.start(toKey, data);
  } else {
    fromScene.scene.start(toKey);
  }
}

/** 回标题并清空返回栈 */
function goToTitleScene(fromScene) {
  SCENE_NAV_STACK.length = 0;
  SCENE_RESUME = {};
  fromScene.scene.start(SCENE_KEYS.BG0);
}

/**
 * Sorting 完成后进入 Construct：Collect 与 Sorting 均被 stop，栈上应回到 Collect。
 */
function transitionToConstructFromSortingComplete(sortScene) {
  var collectScene = sortScene.scene.get(SCENE_KEYS.COLLECT);
  if (collectScene && typeof collectScene.getResumePayload === 'function') {
    SCENE_RESUME[SCENE_KEYS.COLLECT] = collectScene.getResumePayload();
  }
  SCENE_NAV_STACK.push(SCENE_KEYS.COLLECT);
  sortScene.registry.set('fireSortComplete', true);
  sortScene.scene.stop(SCENE_KEYS.COLLECT);
  sortScene.scene.stop(SCENE_KEYS.SORTING);
  sortScene.scene.start(SCENE_KEYS.CONSTRUCT);
}

/**
 * 左上角返回；无历史时隐藏（例如标题页）。
 * @param {Phaser.Scene} scene
 * @param {{ x?: number, y?: number, depth?: number, label?: string }} [opts]
 */
function addSceneBackButton(scene, opts) {
  opts = opts || {};
  var x = opts.x != null ? opts.x : 16;
  var y = opts.y != null ? opts.y : 14;
  var depth = opts.depth != null ? opts.depth : 200000;
  var label = opts.label != null ? opts.label : 'Back';
  var btn = scene.add
    .text(x, y, label, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '15px',
      color: '#f5ecd8',
      backgroundColor: '#3d3228',
      padding: { x: 12, y: 8 },
    })
    .setOrigin(0, 0)
    .setDepth(depth)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });
  function syncVis() {
    btn.setVisible(SCENE_NAV_STACK.length > 0);
  }
  syncVis();
  btn.on('pointerover', function () {
    btn.setStyle({ backgroundColor: '#524638' });
  });
  btn.on('pointerout', function () {
    btn.setStyle({ backgroundColor: '#3d3228' });
  });
  btn.on('pointerdown', function () {
    if (typeof scene.tryConsumeInternalBack === 'function' && scene.tryConsumeInternalBack()) {
      return;
    }
    if (SCENE_NAV_STACK.length === 0) return;
    var prevKey = SCENE_NAV_STACK.pop();
    var data = SCENE_RESUME[prevKey];
    if (data === undefined || data === null) data = {};
    scene.scene.start(prevKey, data);
  });
  return btn;
}

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
