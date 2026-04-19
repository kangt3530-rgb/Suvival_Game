/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
export function mixinCampSelectScene7(Proto) {
  Object.assign(Proto.prototype, {
  buildScene7CompareCampsites() {
    const cam = this.cameras.main;
    this.dialogText.setText('…No place is perfect… I need to choose what matters more.');

    const size = 68;
    const sites = [
      {
        key: 'A',
        cartX: 95,
        cartY: 185,
        color: 0x2e7d32,
        title: 'Site A',
        blurb: 'Near water · Lower · Dense trees',
        drawExtra: (g, c) => {
          g.fillStyle(0x1565c0, 0.85);
          const wx = c.cartX - 55;
          const wy = c.cartY;
          const ws = 26;
          const wq = this.getIsoTileCorners(wx, wy, ws);
          g.beginPath();
          g.moveTo(wq.tl.x, wq.tl.y);
          g.lineTo(wq.tr.x, wq.tr.y);
          g.lineTo(wq.br.x, wq.br.y);
          g.lineTo(wq.bl.x, wq.bl.y);
          g.closePath();
          g.fillPath();
          g.fillStyle(0x1b5e20, 1);
          g.fillTriangle(c.cx, c.cy - 4, c.cx - 30, c.cy - 86, c.cx + 30, c.cy - 86);
          g.fillTriangle(c.cx - 14, c.cy - 12, c.cx - 44, c.cy - 72, c.cx + 8, c.cy - 68);
        },
      },
      {
        key: 'B',
        cartX: 315,
        cartY: 185,
        color: 0xc5e1a5,
        title: 'Site B',
        blurb: 'Farther from water · Flatter · More open',
        drawExtra: (g, c) => {
          g.fillStyle(0x42a5f5, 0.55);
          const ox = c.cartX - 95;
          const oy = c.cartY - 25;
          const ws = 18;
          const wq = this.getIsoTileCorners(ox, oy, ws);
          g.beginPath();
          g.moveTo(wq.tl.x, wq.tl.y);
          g.lineTo(wq.tr.x, wq.tr.y);
          g.lineTo(wq.br.x, wq.br.y);
          g.lineTo(wq.bl.x, wq.bl.y);
          g.closePath();
          g.fillPath();
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
    continueBtn.on('pointerdown', () => this.enterState(8));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    sites.forEach((loc) => {
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
      g.lineStyle(2, 0xffffff, 0.5);
      g.strokePath();

      const center = this.cartesianToIso(loc.cartX, loc.cartY);
      const cx = center.x;
      const cy = center.y;
      if (loc.drawExtra) loc.drawExtra(g, { cx, cy, cartX: loc.cartX, cartY: loc.cartY });
      g.setDepth(center.y + 20);

      const lblY = Math.max(co.bl.y, co.br.y) + 12;
      const lbl = this.add
        .text(center.x, lblY, `${loc.title}\n${loc.blurb}`, {
          fontSize: '12px',
          color: '#f5e6d3',
          align: 'center',
          lineSpacing: 4,
          wordWrap: { width: 220 },
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
          this.campsiteChoice = loc.key;
          this.dialogText.setText(`…You choose Site ${loc.key}.`);
          continueBtn.setVisible(true);
        });
      });
      zone.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      zone.on('pointerout', () => this.input.setDefaultCursor('default'));
    });
  }

  /**
   * Draft Scene 8：放大检视所选营地；点水面 / 地面 / 树冠(或开阔上方)；收尾对白；放置背包与帐篷。
   */
  });
}
