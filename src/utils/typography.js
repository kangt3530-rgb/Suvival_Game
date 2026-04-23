/**
 * 全局排版常量 — 游戏内所有文字样式的单一来源。
 *
 * 规则：
 *   - 每种 UI 元素类型只定义一套样式；场景直接 spread 使用，不自行写 fontSize。
 *   - 基准以首个对白场景（BG1OutbreakScene / createDialogBox）为标准。
 *   - Phaser text style 对象可直接传给 scene.add.text(x, y, str, TEXT_XXX)。
 *
 * 层级速查：
 *   TEXT_DIALOG_BODY   — 对白框内的叙事/对话文字（最大，最优先）
 *   TEXT_BTN_PRIMARY   — 推进按钮（Continue / Next）
 *   TEXT_BTN_CONFIRM   — 确认/收集类绿色按钮
 *   TEXT_SCENE_TITLE   — 场景顶部标题栏
 *   TEXT_CARD_TITLE    — 章节引导卡片大标题
 *   TEXT_CARD_BODY     — 章节引导卡片说明
 *   TEXT_DATE_PILL     — 日期徽章（日记顶部）
 *   TEXT_HUD           — 右上角 HUD 数值标签（Day X / 30）
 *   TEXT_WORLD_LABEL   — 等距地图区域名称
 *   TEXT_HINT          — 小字提示（操作说明、标注）
 */

/** 对白框主文字 — Georgia 27px 暖白 */
export const TEXT_DIALOG_BODY = {
  fontFamily: 'Georgia, serif',
  fontSize: '27px',
  color: '#f5e6d3',
  lineSpacing: 7,
};

/** 推进按钮（Continue / Next）— Segoe UI 17px 深棕底 */
export const TEXT_BTN_PRIMARY = {
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: '17px',
  color: '#fff8e7',
  backgroundColor: '#5c3d2e',
  padding: { x: 22, y: 10 },
};

/** 确认/收集类按钮 — 绿色底 */
export const TEXT_BTN_CONFIRM = {
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: '17px',
  color: '#fff8e7',
  backgroundColor: '#2e7d32',
  padding: { x: 22, y: 10 },
};

/** 场景顶部标题条（全游戏通用） */
export const TEXT_SCENE_TITLE = {
  fontFamily: 'Georgia, serif',
  fontSize: '20px',
  color: '#c8c0a8',
};

/** 章节引导卡片大标题 */
export const TEXT_CARD_TITLE = {
  fontFamily: 'Georgia, serif',
  fontSize: '22px',
  color: '#e8d8b8',
};

/** 章节引导卡片说明文字 */
export const TEXT_CARD_BODY = {
  fontFamily: 'Georgia, serif',
  fontSize: '15px',
  color: '#d4c4a8',
  lineSpacing: 4,
};

/** 日记日期徽章 — 顶部居中浅色胶囊 */
export const TEXT_DATE_PILL = {
  fontFamily: 'Georgia, serif',
  fontSize: '16px',
  color: '#2a2218',
  backgroundColor: 'rgba(245, 236, 220, 0.55)',
  padding: { x: 10, y: 4 },
};

/** HUD 数值标签（Day X / 30、Intensity 等） */
export const TEXT_HUD = {
  fontFamily: 'Georgia, serif',
  fontSize: '14px',
  color: '#2a2218',
  backgroundColor: 'rgba(245, 236, 220, 0.85)',
  padding: { x: 8, y: 4 },
};

/** 等距世界/区域名称标签 */
export const TEXT_WORLD_LABEL = {
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: '13px',
  color: '#e8d8b8',
};

/** 小字操作提示 */
export const TEXT_HINT = {
  fontFamily: 'Segoe UI, Arial, sans-serif',
  fontSize: '13px',
  color: '#b0a090',
};
