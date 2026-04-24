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
  // 后续资源在此追加
};

/**
 * Scene 3 Scouting 主画面 hotspot 配置
 * 位置是初始估计值，通过 ?debug=1 + Shift 拖动调整后，用面板"Copy All Coords as JSON"
 * 导出真实坐标回填到这里。
 */
export const SCENE3_HOTSPOT_CONFIG = {
  water: { x: 1280, y: 1180, radius: 30, label: 'Water' },
  ground: { x: 640, y: 1100, radius: 30, label: 'Ground' },
  wind: { x: 1920, y: 700, radius: 30, label: 'Wind' },
  overhead: { x: 700, y: 280, radius: 30, label: 'Overhead' },
};

/**
 * Water 子画面二级 hotspot — 初始估计值，用 ?debug=1 + Shift 拖动调整后回填（导出为逻辑坐标时需按设计分辨率换算）
 */
export const SCENE3_WATER_HOTSPOT_CONFIG = {
  /** 由 debug 导出 close≈(941,315) far≈(229,118) r=15（逻辑坐标）换算到 2560×1440 */
  close: { x: 1882, y: 630, radius: 30, label: 'Close to water' },
  far: { x: 458, y: 236, radius: 30, label: 'A bit farther' },
};

/** scene.registry 的 key 命名空间，避免与项目其他 registry 冲突 */
export const STAGE3_REGISTRY_KEYS = {
  SCOUTING_CHECKED: 'stage3_scouting_checked', // string[]，已探索过的 hotspot id 数组
  SCOUTING_SUB_WATER_CHECKED: 'stage3_scouting_sub_water_checked', // string[]，Water 子画面已探索二级 id
};
