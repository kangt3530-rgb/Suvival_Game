/**
 * Stage 1 日记三幕剧本 —— 纯内容层，不依赖 Phaser。
 *
 * 节点类型（最小 schema，详见 README/架构说明）：
 *   - { type: 'bg', asset }          切换全屏背景
 *   - { type: 'date', text }         顶部日期条
 *   - { type: 'character', asset, slot?: 'hero' }
 *   - { type: 'say', text, speaker? }      一条对白（逐字机 + 等待点击）
 *   - { type: 'choice', prompt, options: [{ label, goto }] }  分支（goto 为 label 名）
 *   - { type: 'jump', target }       跳到同一剧本内的 label
 *   - 任意节点可加 `label: 'foo'`     作为 jump/choice 的跳转目标
 *
 * 剧本元信息：
 *   - `scene`: Phaser 场景 key（对齐 SCENE_KEYS），主要用于调试/关联
 *   - `next`: 播完自动切到的下一 Phaser 场景 key；若传 `onComplete` 给 runScript 则优先那个
 *   - `layout`: 'diary' | 'ar1'，控制对白框/立绘布局；缺省 'diary'
 */

export const SCRIPT_STAGE1_OUTBREAK = {
  scene: 'BG1OutbreakScene',
  next: 'BG2StruggleScene',
  layout: 'diary',
  nodes: [
    { type: 'bg', asset: 'bg.notebook' },
    { type: 'date', text: 'March 5, 1898' },
    { type: 'character', asset: 'character.hero_thinking', slot: 'hero' },
    { type: 'say', text: 'It begins…' },
    { type: 'say', text: 'My clinic is overflowing. I cannot save them all.' },
    { type: 'say', text: 'I watch neighbors and friends fall, powerless to stop it.' },
  ],
};

export const SCRIPT_STAGE1_STRUGGLE = {
  scene: 'BG2StruggleScene',
  next: 'BG3DiscoveryScene',
  layout: 'diary',
  notebookAsset: 'bg.notebook2',
  nodes: [
    { type: 'bg', asset: 'bg.notebook' },
    { type: 'date', text: 'June 12, 1898' },
    { type: 'character', asset: 'character.hero_thinking', slot: 'hero' },
    { type: 'say', text: 'Another page, another dead end.' },
    { type: 'say', text: "I've tried Mandrake, Silverleaf, Moonflower… none seem to work." },
    { type: 'say', text: 'Each failure weighs heavier. Yet I cannot give up.' },
  ],
};

export const SCRIPT_STAGE1_DISCOVERY = {
  scene: 'BG3DiscoveryScene',
  next: 'BG4TimeTravelScene',
  layout: 'diary',
  nodes: [
    { type: 'bg', asset: 'bg.notebook' },
    { type: 'date', text: 'October 3, 1900' },
    { type: 'character', asset: 'character.hero_thinking', slot: 'hero' },
    { type: 'say', text: 'The pattern steadies under my hand.' },
    { type: 'say', text: 'Finally… I see it clearly. The cure is possible.' },
    { type: 'say', text: "The thought of saving lives gives me hope I haven't felt in years." },
  ],
};
