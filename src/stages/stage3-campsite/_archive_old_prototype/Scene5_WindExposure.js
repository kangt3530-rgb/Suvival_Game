/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
export function mixinCampSelectScene5(Proto) {
  Object.assign(Proto.prototype, {
  buildScene5WindExposure() {
    this.dialogText.setText("…Wind's picking up… That will change things.");

    const size = 58;
    const spots = [
      {
        id: 'open',
        cartX: 120,
        cartY: 175,
        color: 0xa5d6a7,
        label: 'Open ground',
        line:
          '…Nothing to block the wind… Both starting fire and resting could be harder.',
        drawExtra: (g, center) => {
          g.lineStyle(2, 0xe0f2f1, 0.55);
          for (let i = -1; i <= 1; i++) {
            g.beginPath();
            g.moveTo(center.x - 38 + i * 14, center.y - 28);
            g.lineTo(center.x - 8 + i * 14, center.y - 48);
            g.strokePath();
          }
        },
      },
      {
        id: 'trees',
        cartX: 300,
        cartY: 175,
        color: 0x558b2f,
        label: 'Tree cover',
        line: '…Less wind… But not without risk.',
        drawExtra: (g, center) => {
          g.fillStyle(0x1b5e20, 1);
          g.fillTriangle(center.x, center.y - 6, center.x - 26, center.y - 78, center.x + 26, center.y - 78);
          g.fillStyle(0x33691e, 0.85);
          g.fillTriangle(center.x - 18, center.y - 18, center.x - 40, center.y - 62, center.x + 4, center.y - 58);
        },
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
    continueBtn.on('pointerdown', () => this.enterState(6));
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
      zone.setDepth(center.y + 22);
      this.pushStage(zone);

      zone.on('pointerdown', (pointer) => {
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.dialogText.setText(loc.line);
          continueBtn.setVisible(true);
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });
  }

  /**
   * Draft Scene 6：枯枝 overhead vs 地面兽迹。
   */
  });
}
