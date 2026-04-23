import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENE_KEYS,
  WORLD_UI_LABEL_DEPTH,
} from '../../config/GameConfig.js';
import { transitionScene, addSceneBackButton } from '../../utils/SceneNav.js';
import { TEXT_SCENE_TITLE, TEXT_HINT } from '../../utils/typography.js';

/** 营地线：选择开阔平地作为生火点 */
export default class FireSpotScene extends Phaser.Scene {
  constructor() {
    super({ key: 'FireSpotScene' });
  }

  create() {
    this.cameras.main.setBackgroundColor('#3a4a3a');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.add
      .text(GAME_WIDTH / 2, 36, 'A flat area... Where should you build the fire?', {
        ...TEXT_SCENE_TITLE,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5)
      .setDepth(WORLD_UI_LABEL_DEPTH);

    const zones = [
      {
        key: 'branches',
        label: 'Under low branches',
        x: 180,
        y: 220,
        w: 150,
        h: 100,
        color: 0x5c4a3a,
        warn:
          "Warning: Dry branches overhead can catch sparks. Do not build under the canopy.",
      },
      {
        key: 'grass',
        label: 'Near dry grass',
        x: 470,
        y: 220,
        w: 150,
        h: 100,
        color: 0x6b8f4a,
        warn: 'Warning: Dry grass ignites fast and spreads flames. Move farther away.',
      },
      {
        key: 'backpack',
        label: 'Close to backpack',
        x: 180,
        y: 380,
        w: 150,
        h: 100,
        color: 0x7a6b5c,
        warn:
          'Warning: Gear and fuel belong out of the heat—trips, spills, and burns. Pick a safer spot.',
      },
      {
        key: 'open',
        label: 'Open, clear ground',
        x: 470,
        y: 380,
        w: 150,
        h: 100,
        color: 0x8a9e8a,
        warn: null,
      },
    ];

    this.spotDialog = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 70, 'Tap an area to choose.', {
        ...TEXT_HINT,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 50 },
      })
      .setOrigin(0.5)
      .setDepth(WORLD_UI_LABEL_DEPTH);

    this.fireSpotResolved = false;
    const wrongRects = [];

    zones.forEach((z) => {
      const rect = this.add.rectangle(z.x + z.w / 2, z.y + z.h / 2, z.w, z.h, z.color, 0.85);
      rect.setStrokeStyle(2, 0xffffff, 0.4);
      rect.setDepth(200);
      rect.setInteractive({ useHandCursor: true });
      if (z.key !== 'open') wrongRects.push(rect);

      this.add
        .text(z.x + z.w / 2, z.y + z.h / 2, z.label, {
          fontSize: '13px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: z.w - 8 },
        })
        .setOrigin(0.5)
        .setDepth(WORLD_UI_LABEL_DEPTH);

      rect.on('pointerdown', () => {
        if (this.fireSpotResolved) return;

        if (z.key !== 'open') {
          this.spotDialog.setText(z.warn);
          this.cameras.main.shake(250, 0.008);
        } else {
          this.fireSpotResolved = true;
          this.spotDialog.setText(
            'Open ground lets you clear fuel, ring the fire, and keep sparks from climbing into brush. You scrape a safe patch and get ready to build.'
          );
          wrongRects.forEach((r) => r.disableInteractive());
          this.cameras.main.fadeOut(700, 0, 0, 0);
          this.time.delayedCall(700, () => {
            transitionScene(this, SCENE_KEYS.FIRE_PREP);
          });
        }
      });
    });
    addSceneBackButton(this);
  }
}
