/**
 * 全局布局与场景键 — 原 MainConfig.js 顶部常量
 * 逻辑分辨率（经 Scale.FIT 等比铺满浏览器，保持 16:9 画面构图，空白处由浏览器底色填补）
 */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** 世界层：地块说明文字 — 高于等距图形与玩家圆点，低于底部对白条(dialog ~5000) */
export const WORLD_UI_LABEL_DEPTH = 4900;
/** 世界层：玩家位置圆点 — 低于 WORLD_UI_LABEL_DEPTH，避免挡住地块标签 */
export const WORLD_PLAYER_MARKER_DEPTH = 4600;
/** Scene2 等距关：分区/材料说明文字 — 高于地块与 pile，低于全屏 intro 遮罩(2500+) */
export const ISO_GAMEPLAY_LABEL_DEPTH = 1100;

/**
 * 开发调试：从 Scene2 等任意已注册场景直接启动，跳过序章与营地。
 * URL ?start= 优先（见 MainConfig.resolveDevStartSceneKey）。
 */
export const DEV_START_SCENE = null;

/**
 * Phaser 场景注册键 — 与各类 constructor 中 super({ key }) 一致
 */
export const SCENE_KEYS = {
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
  FIRE_NPC: 'FirebuildingNpcScene',
  FIRE_SPOT_INSPECT: 'FireSpotInspectScene',
};
