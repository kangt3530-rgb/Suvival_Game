/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
import { SCENE_KEYS } from '../../config/GameConfig.js';
import { transitionSceneNoHistory } from '../../utils/SceneNav.js';

export function mixinCampSelectScene9(Proto) {
  Object.assign(Proto.prototype, {
  buildScene9HerbsDiscovery() {
    const w = GAME_WIDTH;
    const h = GAME_HEIGHT;
    this.dialogText.setText('…That should hold for the night.');

    const sky = this.add
      .rectangle(w / 2, h * 0.32, w, h * 0.65, 0x0c1018, 1)
      .setDepth(38);
    this.pushStage(sky);
    const ground = this.add
      .rectangle(w / 2, h * 0.82, w, h * 0.38, 0x1a1510, 1)
      .setDepth(39);
    this.pushStage(ground);

    const tPeakX = w * 0.28;
    const tBaseY = h * 0.74;
    const tentG = this.add.graphics().setDepth(52);
    tentG.fillStyle(0x6d5344, 1);
    tentG.fillTriangle(tPeakX, tBaseY - 88, tPeakX - 58, tBaseY, tPeakX + 48, tBaseY);
    tentG.fillStyle(0x4a3b30, 0.95);
    tentG.fillTriangle(tPeakX + 6, tBaseY - 78, tPeakX + 44, tBaseY - 6, tPeakX + 52, tBaseY);
    tentG.lineStyle(2, 0x2e241c, 0.9);
    tentG.beginPath();
    tentG.moveTo(tPeakX - 58, tBaseY);
    tentG.lineTo(tPeakX + 48, tBaseY);
    tentG.strokePath();
    this.pushStage(tentG);

    const fireG = this.add.graphics().setDepth(53);
    fireG.fillStyle(0xff6f30, 0.9);
    fireG.fillCircle(tPeakX + 38, tBaseY - 12, 9);
    fireG.fillStyle(0xffcc66, 0.75);
    fireG.fillCircle(tPeakX + 38, tBaseY - 14, 4);
    this.pushStage(fireG);

    for (let i = 0; i < 18; i++) {
      const bx = Phaser.Math.Between(w * 0.34, w * 0.96);
      const by = Phaser.Math.Between(h * 0.14, h * 0.48);
      const gw = Phaser.Math.Between(44, 78);
      const gh = Phaser.Math.Between(26, 42);
      const g = this.add.graphics().setDepth(45 + (i % 4));
      g.fillStyle(0x153018, 0.95);
      g.fillEllipse(bx, by, gw, gh);
      g.fillStyle(0x2e6b32, 0.92);
      g.fillEllipse(bx - Phaser.Math.Between(8, 18), by - 10, gw * 0.55, gh * 0.65);
      this.pushStage(g);
    }

    const bushY = h * 0.4;
    const herbX = w * 0.62;
    const herbY = bushY + 36;
    const walkEndX = herbX - 52;
    const walkEndY = herbY + 44;

    this.ensurePlayerDot();
    this.playerDot.setDepth(WORLD_PLAYER_MARKER_DEPTH);

    const herbRoot = this.add.container(herbX, herbY).setDepth(200).setVisible(false);
    const herbGlow = this.add.graphics();
    herbGlow.fillStyle(0xc8e6c9, 0.35);
    herbGlow.fillEllipse(0, 0, 56, 40);
    const herbDraw = this.add.graphics();
    herbDraw.fillStyle(0x43a047, 1);
    herbDraw.fillEllipse(0, 4, 44, 26);
    herbDraw.fillStyle(0x2e7d32, 1);
    herbDraw.fillTriangle(-16, 10, -2, -30, 8, 10);
    herbDraw.fillTriangle(-2, 10, 10, -34, 22, 10);
    herbDraw.fillStyle(0xa5d6a7, 1);
    herbDraw.fillEllipse(6, -4, 24, 16);
    herbDraw.lineStyle(1, 0xe8f5e9, 0.9);
    herbDraw.strokeEllipse(6, -4, 24, 16);
    herbRoot.add([herbGlow, herbDraw]);
    herbRoot.setScale(0.85);
    this.pushStage(herbRoot);

    let phase = 'line0';

    const nextBtn = this.add
      .text(w / 2, h - 128, 'Next', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });
    this.pushStage(nextBtn);

    const collectBtn = this.add
      .text(w / 2, h - 128, 'Collect the herb', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#2e7d32',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(collectBtn);

    const runWalk = () => {
      phase = 'walking';
      nextBtn.disableInteractive();
      nextBtn.setVisible(false);
      this.dialogText.setText('(You get up and walk toward the bushes.)');
      this.tweens.add({
        targets: this.playerDot,
        x: walkEndX,
        y: walkEndY,
        duration: 1650,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          herbRoot.setVisible(true);
          herbRoot.setAlpha(0);
          herbRoot.setScale(0.75);
          this.tweens.add({
            targets: herbRoot,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 450,
            ease: 'Cubic.easeOut',
            onComplete: () => {
              this.tweens.add({
                targets: herbRoot,
                scaleX: 1.04,
                scaleY: 1.04,
                duration: 220,
                yoyo: true,
                repeat: 1,
                ease: 'Sine.easeInOut',
              });
            },
          });
          this.dialogText.setText('…Wait… These match the ones in my notes…');
          phase = 'afterWalk';
          nextBtn.setVisible(true);
          nextBtn.setInteractive({ useHandCursor: true });
        },
      });
    };

    nextBtn.on('pointerdown', () => {
      if (phase === 'line0') {
        this.dialogText.setText('…Those leaves… That shape and color looks familiar…');
        phase = 'line1';
        return;
      }
      if (phase === 'line1') {
        runWalk();
        return;
      }
      if (phase === 'afterWalk') {
        this.dialogText.setText('…Same structure… same edges… This is it.');
        phase = 'beforeCollect';
        return;
      }
      if (phase === 'beforeCollect') {
        nextBtn.setVisible(false);
        collectBtn.setVisible(true);
        phase = 'collect';
      }
    });
    nextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    nextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    collectBtn.on('pointerdown', () => {
      if (phase !== 'collect') return;
      this.dialogText.setText(
        '…So they were here all along…\n…This time… I can save those people.'
      );
      collectBtn.disableInteractive();
      herbRoot.setVisible(false);
      this.time.delayedCall(2200, () => {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.time.delayedCall(500, () => {
          transitionSceneNoHistory(this, SCENE_KEYS.FIRE_NPC);
        });
      });
    });
    collectBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    collectBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
  }
  });
}
