/**
 * 生火教学全流程 — 实现已迁至 src/stages/stage4-firebuilding/，本文件保留为兼容入口。
 */
import FirebuildingNpcScene from '../../src/stages/stage4-firebuilding/Scene1_NpcFireRisk.js';
import FireSpotInspectScene from '../../src/stages/stage4-firebuilding/Scene2_LocationInspect.js';
import FireSitePrepScene from '../../src/stages/stage4-firebuilding/Scene3_SitePrep.js';
import CollectMaterialsScene from '../../src/stages/stage4-firebuilding/Scene4_CollectMaterials.js';
import SortingMaterialsScene from '../../src/stages/stage4-firebuilding/Scene4_1_Sorting.js';
import ConstructFireScene from '../../src/stages/stage4-firebuilding/Scene5_Construction.js';
import MaintainFireScene from '../../src/stages/stage4-firebuilding/Scene6_MaintainFire.js';
import HerbHuntScene from '../../src/stages/stage4-firebuilding/Scene7_FindHerbsTorch.js';

Object.assign(globalThis, {
  FirebuildingNpcScene,
  FireSpotInspectScene,
  FireSitePrepScene,
  CollectMaterialsScene,
  SortingMaterialsScene,
  ConstructFireScene,
  MaintainFireScene,
  HerbHuntScene,
});
