/**
 * Stage 3 Camping 配置 — 集中管理资源文件名、scene key 和配置常量。
 * 新增 scene 或资源时在这里注册。
 */

/** Phaser scene keys */
export const STAGE3_SCENE_KEYS = {
  ENTER_FOREST: 'Stage3_EnterForest',
  NPC_ENCOUNTER: 'Stage3_NpcEncounter',
  SCOUTING: 'Stage3_Scouting',
  SCOUTING_SUB_WATER: 'Stage3_Scene3SubWater',
  SCOUTING_SUB_GROUND: 'Stage3_Scene3SubGround',
  SCOUTING_SUB_WIND: 'Stage3_Scene3SubWind',
  SCOUTING_SUB_OVERHEAD: 'Stage3_Scene3SubOverhead',
  SITE_INSPECTION: 'Stage3_SiteInspection',
  SITE_CLOSEUP: 'Stage3_SiteCloseup',
  DECISION: 'Stage3_Decision',
  NIGHT: 'Stage3_Night',
  // 后续 scene 在此追加
};

/** 资源文件（相对 public/assets/）*/
export const STAGE3_ASSETS = {
  BG_FOREST_ENTRY: { key: 'stage3_forest_entry', file: 'forest.png' },
  /** Scene2 与老人相遇 — 林间空地 */
  BG_NPC_MEET: { key: 'stage3_forest2', file: 'forest2.png' },
  PORTRAIT_MAIN: { key: 'stage3_main', file: 'main character-thinking.png' },
  /** Scene2 主角 — 与 AR3 `main character-png` 一致 */
  PORTRAIT_PLAYER_PNG: { key: 'stage3_player_png', file: 'main character-png.png' },
  PORTRAIT_OLDMAN: { key: 'stage3_oldman', file: 'NPC charater.png' },
  /** Scene 3 Scouting 主画面（子图 BG 预注册，供后续子 scene 使用） */
  BG_SCOUTING_MAIN: { key: 'stage3_scouting_main', file: 's3-scouting-main.png' },
  BG_SCOUTING_WATER: { key: 'stage3_scouting_water', file: 's3-scouting-water.png' },
  BG_SCOUTING_GROUND: { key: 'stage3_scouting_ground', file: 's3-scouting-ground.png' },
  /** 仓库内实际文件名为双后缀 s3-scouting-wind.png.png（非 s3-scouting-wind.png） */
  BG_SCOUTING_WIND: { key: 'stage3_scouting_wind', file: 's3-scouting-wind.png.png' },
  BG_SCOUTING_OVERHEAD: { key: 'stage3_scouting_overhead', file: 's3-scouting-overhead.png' },
  /** 仓库内为 `main character-thinking.png`（含空格），非 main-character-thinking.png */
  PORTRAIT_THINKING: { key: 'stage3_thinking', file: 'main character-thinking.png' },
  /** Scene 4 营地考察 — 主画面与 Site 近景（近景 preload 在子 scene） */
  BG_INSPECTION_MAIN: { key: 'stage3_inspection_main', file: 's4-inspection-main.png' },
  BG_SITE_A: { key: 'stage3_site_a', file: 's4-site-a.png' },
  BG_SITE_B: { key: 'stage3_site_b', file: 's4-site-b.png' },
  /** Scene 5 — 入夜 / 深夜 */
  BG_SITE_A_DUSK: { key: 'stage3_site_a_dusk', file: 's5-site-a-dusk.png' },
  BG_SITE_A_NIGHT: { key: 'stage3_site_a_night', file: 's5-site-a-night.png' },
  BG_SITE_B_DUSK: { key: 'stage3_site_b_dusk', file: 's5-site-b-dusk.png' },
  BG_SITE_B_NIGHT: { key: 'stage3_site_b_night', file: 's5-site-b-night.png' },
  // 后续资源在此追加
};

/**
 * Scene 3 Scouting 主画面 hotspot — x/y/radius 为游戏逻辑画布（GAME_WIDTH×GAME_HEIGHT），
 * 与 ?debug=1 面板及「Copy JSON」一致。
 */
export const SCENE3_HOTSPOT_CONFIG = {
  water: { x: 736, y: 566, radius: 15, label: 'Water' },
  ground: { x: 1078, y: 567, radius: 15, label: 'Ground' },
  wind: { x: 923, y: 249, radius: 15, label: 'Wind' },
  overhead: { x: 350, y: 140, radius: 15, label: 'Overhead' },
};

/**
 * Water 子画面二级 hotspot — 初始估计值，用 ?debug=1 + Shift 拖动调整后回填（导出为逻辑坐标时需按设计分辨率换算）
 */
export const SCENE3_WATER_HOTSPOT_CONFIG = {
  /** 由 debug 导出 close≈(941,315) far≈(229,118) r=15（逻辑坐标）换算到 2560×1440 */
  close: { x: 1882, y: 630, radius: 30, label: 'Close to water' },
  far: { x: 458, y: 236, radius: 30, label: 'A bit farther' },
};

/**
 * Ground 子画面二级 hotspot — x/y/radius 为游戏逻辑画布（GameConfig 的 GAME_WIDTH×GAME_HEIGHT），
 * 与 ?debug=1 面板数值及「Copy JSON」导出一致；非 2560×1440 设计稿倍率。
 */
export const SCENE3_GROUND_HOTSPOT_CONFIG = {
  low: { x: 896, y: 649, radius: 15, label: 'Low dip' },
  slope: { x: 1164, y: 451, radius: 15, label: 'Slope' },
  flat: { x: 917, y: 346, radius: 15, label: 'Flat high ground' },
};

/**
 * Wind 子画面二级 hotspot — x/y/radius 为游戏逻辑画布（GAME_WIDTH×GAME_HEIGHT），
 * 与 ?debug=1 面板及「Copy JSON」一致。
 */
export const SCENE3_WIND_HOTSPOT_CONFIG = {
  sheltered: { x: 360, y: 550, radius: 15, label: 'Under the trees' },
  open: { x: 920, y: 550, radius: 15, label: 'Open ground' },
};

/**
 * Overhead 子画面二级 hotspot — x/y/radius 为游戏逻辑画布（GAME_WIDTH×GAME_HEIGHT），
 * 与 ?debug=1 面板一致；仰视构图，热区偏画面上半部。
 */
export const SCENE3_OVERHEAD_HOTSPOT_CONFIG = {
  deadwood: { x: 394, y: 242, radius: 15, label: 'Dead branches overhead' },
  open: { x: 968, y: 441, radius: 15, label: 'Open sky' },
};

/**
 * Scene 4 考察主画面 hotspot — x/y/radius 为游戏逻辑画布（GAME_WIDTH×GAME_HEIGHT），与 ?debug=1 面板一致。
 */
export const SCENE4_INSPECTION_HOTSPOT_CONFIG = {
  siteA: { x: 316, y: 414, radius: 15, label: 'Site A' },
  siteB: { x: 1013, y: 300, radius: 15, label: 'Site B' },
};

/**
 * Scene 4 Site A 近景 — 2560×1440；左下溪、中下洼地、左中树荫、上枯枝。由 ?debug=1 导出逻辑坐标换算回填。
 */
export const SCENE4_SITE_A_HOTSPOT_CONFIG = {
  water: { x: 1188, y: 1128, radius: 30, label: 'Water' },
  ground: { x: 492, y: 924, radius: 30, label: 'Ground' },
  wind: { x: 712, y: 514, radius: 30, label: 'Wind' },
  overhead: { x: 1544, y: 168, radius: 30, label: 'Overhead' },
};

/**
 * Scene 4 Site B 近景 — 2560×1440；远溪、中下平地、开阔侧风区、上天空。由 ?debug=1 导出逻辑坐标换算回填。
 */
export const SCENE4_SITE_B_HOTSPOT_CONFIG = {
  water: { x: 1922, y: 1116, radius: 30, label: 'Water' },
  ground: { x: 650, y: 1056, radius: 30, label: 'Ground' },
  wind: { x: 1142, y: 896, radius: 30, label: 'Wind' },
  overhead: { x: 450, y: 636, radius: 30, label: 'Overhead' },
};

/** scene.registry 的 key 命名空间，避免与项目其他 registry 冲突 */
export const STAGE3_REGISTRY_KEYS = {
  SCOUTING_CHECKED: 'stage3_scouting_checked', // string[]，已探索过的 hotspot id 数组
  SCOUTING_SUB_WATER_CHECKED: 'stage3_scouting_sub_water_checked', // string[]，Water 子画面已探索二级 id
  SCOUTING_SUB_GROUND_CHECKED: 'stage3_scouting_sub_ground_checked', // string[]，Ground 子画面已探索二级 id
  SCOUTING_SUB_WIND_CHECKED: 'stage3_scouting_sub_wind_checked', // string[]，Wind 子画面已探索二级 id
  SCOUTING_SUB_OVERHEAD_CHECKED: 'stage3_scouting_sub_overhead_checked', // string[]，Overhead 子画面已探索二级 id
  INSPECTION_CHECKED: 'stage3_inspection_checked', // string[]，Scene 4 已探索 site id
  SITE_A_CHECKED: 'stage3_site_a_checked', // string[]，Site A 近景二级 hotspot id
  SITE_B_CHECKED: 'stage3_site_b_checked', // string[]，Site B 近景二级 hotspot id
  /** 玩家最终营地 — 本 scene 不写，留给 Decision；仅声明 key */
  CHOSEN_SITE: 'stage3_chosen_site',
};
