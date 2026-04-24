import { GAME_WIDTH, GAME_HEIGHT } from '../../config/GameConfig.js';
import { createHotspotGroup } from '../../utils/hotspot.js';
import { addSceneBackButton } from '../../utils/SceneNav.js';

export default class TestHotspotScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TestHotspotScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#2a3a2a');

    this.add
      .text(GAME_WIDTH / 2, 24, 'Test: click all 3 hotspots', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0);

    let group;
    group = createHotspotGroup(this, {
      hotspots: [
        {
          id: 'a',
          x: 400,
          y: 400,
          radius: 40,
          label: 'Water',
          onClick: () => {
            console.log('clicked a');
            group.markChecked('a');
          },
        },
        {
          id: 'b',
          x: 800,
          y: 400,
          radius: 40,
          label: 'Ground',
          onClick: () => {
            console.log('clicked b');
            group.markChecked('b');
          },
        },
        {
          id: 'c',
          x: 1200,
          y: 400,
          radius: 40,
          label: 'Wind',
          onClick: () => {
            console.log('clicked c');
            group.markChecked('c');
          },
        },
      ],
      onAllChecked: () => {
        console.log('All checked!');
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'All hotspots checked ✓', {
            fontSize: '32px',
            color: '#ffffff',
          })
          .setOrigin(0.5);
      },
    });

    addSceneBackButton(this);
  }
}

globalThis.TestHotspotScene = TestHotspotScene;
