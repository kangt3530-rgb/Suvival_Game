/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
export function mixinCampSelectScene6(Proto) {
  Object.assign(Proto.prototype, {
  buildScene6OverheadScan() {
    const cam = this.cameras.main;
    this.dialogText.setText('I have to check not just the ground… but also look up… and around…');

    const size = 58;
    const spots = [
      {
        id: 'branches',
        cartX: 130,
        cartY: 175,
        color: 0x6d4c41,
        label: 'Dead branches overhead',
        line: '…Dead wood… If the wind gets stronger, this could fall.',
        drawExtra: (g, center) => {
          g.lineStyle(4, 0x4e342e, 0.95);
          g.beginPath();
          g.moveTo(center.x - 44, center.y - 88);
          g.lineTo(center.x - 8, center.y - 102);
          g.strokePath();
          g.beginPath();
          g.moveTo(center.x - 20, center.y - 92);
          g.lineTo(center.x + 28, center.y - 98);
          g.strokePath();
          g.beginPath();
          g.moveTo(center.x + 8, center.y - 84);
          g.lineTo(center.x + 48, center.y - 76);
          g.strokePath();
        },
      },
      {
        id: 'tracks',
        cartX: 290,
        cartY: 175,
        color: 0x7cb342,
        label: 'Animal tracks',
        line: '…Animals pass through here.',
        drawExtra: (g, center) => {
          g.fillStyle(0x3e2723, 0.75);
          g.fillEllipse(center.x - 22, center.y + 8, 14, 9);
          g.fillEllipse(center.x + 6, center.y + 18, 16, 10);
          g.fillEllipse(center.x + 28, center.y + 6, 13, 8);
        },
      },
    ];

    const continueBtn = this.add
      .text(cam.width / 2, cam.height - 128, 'Continue', {
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
    continueBtn.on('pointerdown', () => this.enterState(7));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    spots.forEach((loc) => {
      const g = this.add.graphics();
      this.pushStage(g);

      const co = this.getIsoTileCorners(loc.cartX, loc.cartY, size);

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
      if (loc.drawExtra) loc.drawExtra(g, center);
      g.setDepth(center.y + 20);

      const lblY = Math.max(co.bl.y, co.br.y) + 10;
      const lbl = this.add
        .text(center.x, lblY, loc.label, {
          fontSize: '12px',
          color: '#f0e6dc',
          align: 'center',
          wordWrap: { width: 200 },
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
          if (loc.id === 'branches') {
            this.cameras.main.shake(200, 0.006);
          }
          continueBtn.setVisible(true);
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });
  }

  /**
   * Draft Scene 7：Site A（近水、低洼、林密）vs Site B（远水、开阔、较平）。
   */
  });
}
