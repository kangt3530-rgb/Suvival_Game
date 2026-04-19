/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
export function mixinCampSelectScene3(Proto) {
  Object.assign(Proto.prototype, {
  buildScene3WaterDistance() {
    const cam = this.cameras.main;
    this.dialogText.setText('…Water would help… But how close is too close?');

    const riverCartX = 0;
    const riverCartY = -120;
    const riverSize = 100;
    const gRiver = this.add.graphics();
    this.pushStage(gRiver);
    const r = this.getIsoTileCorners(riverCartX, riverCartY, riverSize);
    gRiver.fillStyle(0x2a6b9e, 1);
    gRiver.beginPath();
    gRiver.moveTo(r.tl.x, r.tl.y);
    gRiver.lineTo(r.tr.x, r.tr.y);
    gRiver.lineTo(r.br.x, r.br.y);
    gRiver.lineTo(r.bl.x, r.bl.y);
    gRiver.closePath();
    gRiver.fillPath();
    gRiver.lineStyle(2, 0x90caf9, 0.45);
    gRiver.strokePath();
    const riverDepth = this.cartesianToIso(riverCartX, riverCartY).y;
    gRiver.setDepth(riverDepth);

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
    continueBtn.on('pointerdown', () => this.enterState(4));
    continueBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    continueBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    const spots = [
      {
        cartX: 20,
        cartY: 20,
        size: 40,
        color: 0x3d8b4a,
        label: 'Near the bank',
        line: '…Too close and the ground is damp… and if it rains, this could flood.',
        isGood: false,
      },
      {
        cartX: -100,
        cartY: -20,
        size: 40,
        color: 0x6b8f4a,
        label: 'Slightly farther uphill',
        line: '…Still close enough to reach.… Safer distance.',
        isGood: true,
      },
    ];

    spots.forEach((loc) => {
      this.drawIsoHotspot({
        cartX: loc.cartX,
        cartY: loc.cartY,
        size: loc.size,
        color: loc.color,
        label: loc.label,
        onPointerDown: () => {
          this.dialogText.setText(loc.line);
          if (!loc.isGood) {
            this.cameras.main.shake(220, 0.007);
          } else {
            continueBtn.setVisible(true);
          }
        },
      });
    });
  }

  /**
   * Draft Scene 4：洼地 / 缓坡 / 平坦略高 三地块。
   */
  });
}
