import './bootstrap-asset-prefix.js';
import {
  SCENE_KEYS,
  GAME_WIDTH,
  GAME_HEIGHT,
  WORLD_UI_LABEL_DEPTH,
  WORLD_PLAYER_MARKER_DEPTH,
  ISO_GAMEPLAY_LABEL_DEPTH,
  DEV_START_SCENE,
} from './config/GameConfig.js';
import { createDialogBox, _runLines } from './utils/Dialogue.js';
import { FireIso } from './utils/FireIso.js';
import BG1OutbreakScene from './stages/stage1-background/Scene1_Outbreak.js';
import BG2StruggleScene from './stages/stage1-background/Scene2_Struggle.js';
import BG3DiscoveryScene from './stages/stage1-background/Scene3_Discovery.js';
import BG4TimeTravelScene from './stages/stage1-background/Scene4_TimeTravel.js';
import AR1ArrivedScene from './stages/stage2-arrival/Scene1_Arrived.js';
import AR2BackpackScene from './stages/stage2-arrival/Scene2_Backpack.js';
import AR3ForestScene from './stages/stage2-arrival/Scene3_ForestEntry.js';

Object.assign(globalThis, {
  SCENE_KEYS,
  GAME_WIDTH,
  GAME_HEIGHT,
  WORLD_UI_LABEL_DEPTH,
  WORLD_PLAYER_MARKER_DEPTH,
  ISO_GAMEPLAY_LABEL_DEPTH,
  DEV_START_SCENE,
});
globalThis.createDialogBox = createDialogBox;
globalThis._runLines = _runLines;
globalThis.FireIso = FireIso;

Object.assign(globalThis, {
  BG1OutbreakScene,
  BG2StruggleScene,
  BG3DiscoveryScene,
  BG4TimeTravelScene,
  AR1ArrivedScene,
  AR2BackpackScene,
  AR3ForestScene,
});

async function bootGameScripts() {
  await import('../public/js/Scene0_Background.js');
  await import('../public/js/Scene1_CampsiteChoose.js');
  await import('../public/js/Scene2_Firebuilding.js');
  await import('../public/js/MainConfig.js');
}

bootGameScripts().catch(function (err) {
  console.error('[boot]', err);
});
