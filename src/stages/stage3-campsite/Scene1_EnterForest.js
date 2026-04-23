/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
export function mixinCampSelectScene1(Proto) {
  Object.assign(Proto.prototype, {
  onScene1IntroPointer(pointer) {
    if (this.gameState !== 1 || !this.scene1IntroActive) return;

    const lines = [
      "…It's farther than I thought. And the light's fading already…",
      "If I keep going like this, I won't make it through the night.",
      'I need to stop here… just for now.',
    ];

    const advance = () => {
      this.scene1IntroStep += 1;

      if (this.scene1IntroStep === 1) {
        this.tweens.add({
          targets: this.eveningDimOverlay,
          alpha: 0.52,
          duration: 900,
          ease: 'Sine.easeInOut',
        });
      }

      if (this.scene1IntroStep < lines.length) {
        this.dialogText.setText(lines[this.scene1IntroStep]);
        return;
      }

      this.input.off('pointerdown', this._scene1IntroPointer);
      this.scene1IntroActive = false;
      this.dialogText.setText(lines[lines.length - 1]);
      this.buildScene1FourTerrains();
    };

    this.movePlayerThen(pointer.x, pointer.y, advance);
  },

  buildScene1IntroSequence() {
    this.scene1IntroActive = true;
    this.scene1IntroStep = 0;
    this.eveningDimOverlay.setAlpha(0);
    this.dialogText.setText(
      "…It's farther than I thought. And the light's fading already…"
    );
    this.input.off('pointerdown', this._scene1IntroPointer);
    this.input.on('pointerdown', this._scene1IntroPointer);
  },

  /**
   * Scene 1：2×2 笛卡尔网格上的四块地貌；Graphics 画等距菱形，树地块叠加三角树冠。
   * 命中：与可见菱形一致的 Phaser.Geom.Polygon，Zone 取包围盒左上角 + origin(0,0)，多边形为相对该点的局部坐标（与 Phaser 命中检测一致）。
   */
  buildScene1FourTerrains() {
    const size = 60;
    const spots = [
      {
        id: 'flat',
        cartX: 0,
        cartY: 0,
        color: 0x3d8b4a,
        label: 'Flat Open Ground',
        line: 'Clear... but exposed.',
        slopeLift: 0,
        isTree: false,
      },
      {
        id: 'water',
        cartX: 160,
        cartY: 0,
        color: 0x2196f3,
        label: 'Near Water',
        line: "Ground's damp",
        slopeLift: 0,
        isTree: false,
      },
      {
        id: 'slope',
        cartX: 0,
        cartY: 160,
        color: 0x795548,
        label: 'Uneven Slope',
        line: 'Too steep',
        slopeLift: 20,
        isTree: false,
      },
      {
        id: 'tree',
        cartX: 160,
        cartY: 160,
        color: 0x8bc34a,
        label: 'Near Tree',
        line: 'Dense cover',
        slopeLift: 0,
        isTree: true,
      },
    ];

    spots.forEach((loc) => {
      const g = this.add.graphics();
      this.pushStage(g);

      const co = this.getIsoTileCorners(loc.cartX, loc.cartY, size);
      if (loc.slopeLift) {
        co.tl.y -= loc.slopeLift;
        co.tr.y -= loc.slopeLift;
      }

      g.fillStyle(loc.color, 1);
      g.beginPath();
      g.moveTo(co.tl.x, co.tl.y);
      g.lineTo(co.tr.x, co.tr.y);
      g.lineTo(co.br.x, co.br.y);
      g.lineTo(co.bl.x, co.bl.y);
      g.closePath();
      g.fillPath();
      g.lineStyle(2, 0xffffff, 0.45);
      g.strokePath();

      const center = this.cartesianToIso(loc.cartX, loc.cartY);
      if (loc.isTree) {
        g.fillStyle(0x1b5e20, 1);
        g.fillTriangle(center.x, center.y - 8, center.x - 22, center.y - 72, center.x + 22, center.y - 72);
      }

      g.setDepth(center.y);

      const lblY = Math.max(co.bl.y, co.br.y, co.tl.y, co.tr.y) + 12;
      const lbl = this.add
        .text(center.x, lblY, loc.label, {
          fontSize: '13px',
          color: '#f0e6dc',
        })
        .setOrigin(0.5, 0)
        .setDepth(WORLD_UI_LABEL_DEPTH);
      this.pushStage(lbl);

      const vx = [co.tl.x, co.tr.x, co.br.x, co.bl.x];
      const vy = [co.tl.y, co.tr.y, co.br.y, co.bl.y];
      const tb = lbl.getBounds();
      const minX = Math.min(vx[0], vx[1], vx[2], vx[3], tb.x);
      const minY = Math.min(vy[0], vy[1], vy[2], vy[3], tb.y);
      const maxX = Math.max(vx[0], vx[1], vx[2], vx[3], tb.x + tb.width);
      const maxY = Math.max(vy[0], vy[1], vy[2], vy[3], tb.y + tb.height);
      const bw = Math.max(maxX - minX, 1);
      const bh = Math.max(maxY - minY, 1);
      const hitPoly = new Phaser.Geom.Polygon([
        co.tl.x - minX,
        co.tl.y - minY,
        co.tr.x - minX,
        co.tr.y - minY,
        co.br.x - minX,
        co.br.y - minY,
        co.bl.x - minX,
        co.bl.y - minY,
      ]);
      const zone = this.add.zone(minX, minY, bw, bh).setOrigin(0, 0);
      zone.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
      zone.setDepth(center.y + 2);
      this.pushStage(zone);

      zone.on('pointerdown', (pointer) => {
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.dialogText.setText(loc.line);
          if (loc.id === 'slope') {
            this.tweens.add({
              targets: g,
              x: g.x - 6,
              duration: 45,
              yoyo: true,
              repeat: 5,
              onComplete: () => {
                g.x = 0;
              },
            });
          }
          if (loc.id === 'water') {
            this.cameras.main.shake(280, 0.008);
          }
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });

    const continueScene1 = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true });
    this.pushStage(continueScene1);
    continueScene1.on('pointerdown', () => this.enterState(2));
    continueScene1.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueScene1.on('pointerout', () => this.input.setDefaultCursor('default'));

    const tileStand = this.cartesianToIso(80, 80);
    this.ensurePlayerDot();
    this.tweens.killTweensOf(this.playerDot);
    this.playerDot.setPosition(tileStand.x, tileStand.y + 8);
  }
  });
}
