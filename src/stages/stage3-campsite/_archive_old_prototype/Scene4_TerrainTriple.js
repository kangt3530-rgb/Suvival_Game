/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
export function mixinCampSelectScene4(Proto) {
  Object.assign(Proto.prototype, {
  buildScene4TerrainTriple() {
    this.dialogText.setText('These all look fine at first… But what happens if the weather changes?');

    const size = 56;
    const spots = [
      {
        id: 'dip',
        cartX: 30,
        cartY: 175,
        color: 0x3e2723,
        label: 'Low dip',
        line: '…Water will collect here. Cold air too.',
        slopeLift: 0,
        isGood: false,
      },
      {
        id: 'slope',
        cartX: 195,
        cartY: 175,
        color: 0x795548,
        label: 'Slight slope',
        line: "…Water will run off… But I won't rest well.",
        slopeLift: 16,
        isGood: false,
      },
      {
        id: 'flat',
        cartX: 360,
        cartY: 175,
        color: 0x558b2f,
        label: 'Flat, elevated',
        line: '…Dry and stable… this place will be better than the other if it rains.',
        slopeLift: 0,
        isGood: true,
      },
    ];

    const continueBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 128, 'Continue', {
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '17px',
        color: '#fff8e7',
        backgroundColor: '#5c3d2e',
        padding: { x: 22, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(5002)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    this.pushStage(continueBtn);
    continueBtn.on('pointerdown', () => this.enterState(5));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

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
      g.setDepth(center.y + 20);

      const lblY = Math.max(co.bl.y, co.br.y) + 10;
      const lbl = this.add
        .text(center.x, lblY, loc.label, {
          fontSize: '12px',
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
      zone.setDepth(center.y + 22);
      this.pushStage(zone);

      zone.on('pointerdown', (pointer) => {
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.dialogText.setText(loc.line);
          if (!loc.isGood) {
            this.cameras.main.shake(200, 0.006);
          } else {
            continueBtn.setVisible(true);
          }
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });
  }

  /**
   * Draft Scene 5：开阔 vs 林下 — 两种权衡；点任一处后可 Continue。
   */
  });
}
