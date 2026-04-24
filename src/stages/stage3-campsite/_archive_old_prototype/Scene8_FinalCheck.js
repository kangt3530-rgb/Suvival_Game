/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
export function mixinCampSelectScene8(Proto) {
  Object.assign(Proto.prototype, {
  buildScene8FinalSafetyCheck() {
    const choice = this.campsiteChoice === 'A' ? 'A' : 'B';
    this.scene8Hits = { water: false, ground: false, tree: false };

    const copy = {
      A: {
        water: '…Closer to water… that makes things easier now.',
        ground:
          '…But the ground is lower… if it rains, water could collect here. And the soil is damp… everything might stay wet through the night.',
        tree: '…And these trees… If the wind gets stronger, those branches could fall.',
        final: '…This place works… but only if nothing changes too much.',
      },
      B: {
        water: "…Farther from water… I'll have to walk for it.",
        ground:
          '…But the ground is higher… water should drain away if it rains… better for resting and for fire.',
        tree:
          "…Nothing above me… no risk from falling branches. …But I'm exposed… If the wind picks up, I'll feel it here.",
        final: '…Still… fewer things can go wrong if the weather turns.',
      },
    };
    const L = copy[choice];

    this.dialogText.setText('…One more look. What happens if things get worse tonight?');

    const baseX = 230;
    const baseY = 168;
    const size = 86;

    const g = this.add.graphics();
    this.pushStage(g);

    const mainC = this.getIsoTileCorners(baseX, baseY, size);
    const fillCol = choice === 'A' ? 0x33691e : 0xdcedc8;
    g.fillStyle(fillCol, 1);
    g.beginPath();
    g.moveTo(mainC.tl.x, mainC.tl.y);
    g.lineTo(mainC.tr.x, mainC.tr.y);
    g.lineTo(mainC.br.x, mainC.br.y);
    g.lineTo(mainC.bl.x, mainC.bl.y);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xfff8e7, 0.35);
    g.strokePath();

    const ctr = this.cartesianToIso(baseX, baseY);
    g.setDepth(ctr.y + 15);

    if (choice === 'A') {
      g.fillStyle(0x1565c0, 0.9);
      const wx = baseX - 72;
      const wy = baseY + 8;
      const wsz = 34;
      const wq = this.getIsoTileCorners(wx, wy, wsz);
      g.beginPath();
      g.moveTo(wq.tl.x, wq.tl.y);
      g.lineTo(wq.tr.x, wq.tr.y);
      g.lineTo(wq.br.x, wq.br.y);
      g.lineTo(wq.bl.x, wq.bl.y);
      g.closePath();
      g.fillPath();
      g.fillStyle(0x1b5e20, 1);
      g.fillTriangle(ctr.x, ctr.y - 8, ctr.x - 36, ctr.y - 96, ctr.x + 36, ctr.y - 96);
    } else {
      g.fillStyle(0x64b5f6, 0.45);
      const wx = baseX - 105;
      const wy = baseY - 35;
      const wsz = 22;
      const wq = this.getIsoTileCorners(wx, wy, wsz);
      g.beginPath();
      g.moveTo(wq.tl.x, wq.tl.y);
      g.lineTo(wq.tr.x, wq.tr.y);
      g.lineTo(wq.br.x, wq.br.y);
      g.lineTo(wq.bl.x, wq.bl.y);
      g.closePath();
      g.fillPath();
    }

    this.scene8Phase = 'inspect';

    const midBtn = this.add
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
    this.pushStage(midBtn);

    midBtn.on('pointerdown', () => {
      if (this.scene8Phase === 'final') {
        this.scene8Phase = 'epilogue';
        this.dialogText.setText(
          "…It's not perfect…\n…But it will have to do.\n…I just need to be ready for what comes."
        );
        midBtn.setText('Set up camp');
        return;
      }
      if (this.scene8Phase === 'epilogue') {
        this.scene8Phase = 'setup';
        this.dialogText.setText('You set the pack down and work the poles into the soil. The tent rises, tight and quiet.');
        midBtn.setText('Rest inside');
        return;
      }
      if (this.scene8Phase === 'setup') {
        this.enterState(9);
      }
    });
    midBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    midBtn.on('pointerout', () => this.input.setDefaultCursor('default'));

    const tryInspectDone = () => {
      if (!(this.scene8Hits.water && this.scene8Hits.ground && this.scene8Hits.tree)) return;
      this.scene8Phase = 'final';
      this.dialogText.setText(L.final);
      midBtn.setText('Continue');
      midBtn.setVisible(true);
    };

    const mkZone = (lx, ly, r, key) => {
      const p = this.cartesianToIso(lx, ly);
      const z = this.add.zone(p.x, p.y, 2, 2).setCircleDropZone(r);
      z.setDepth(ctr.y + 40);
      z.setInteractive();
      this.pushStage(z);
      z.on('pointerdown', (pointer) => {
        if (this.scene8Phase && this.scene8Phase !== 'inspect') return;
        this.movePlayerThen(pointer.x, pointer.y, () => {
          this.scene8Hits[key] = true;
          this.dialogText.setText(L[key]);
          tryInspectDone();
        });
      });
      z.on('pointerover', () => this.input.setDefaultCursor('pointer'));
      z.on('pointerout', () => this.input.setDefaultCursor('default'));
    };

    if (choice === 'A') {
      mkZone(baseX - 58, baseY + 6, 40, 'water');
      mkZone(baseX, baseY, 44, 'ground');
      mkZone(baseX, baseY - 38, 36, 'tree');
    } else {
      mkZone(baseX - 88, baseY - 28, 32, 'water');
      mkZone(baseX, baseY, 44, 'ground');
      mkZone(baseX, baseY - 42, 38, 'tree');
    }

    const hint = this.add
      .text(ctr.x, ctr.y + 108, 'Tap water · ground · canopy / sky', {
        fontSize: '13px',
        color: '#d7ccc8',
      })
      .setOrigin(0.5)
      .setDepth(WORLD_UI_LABEL_DEPTH);
    this.pushStage(hint);
  }

  /**
   * Scene 9：Discovering the Herbs — 营地坐望 → 对白 → 走向灌木 → 采集（点击）。
   * 结束后进入 FirebuildingNpcScene（生火链），非 HerbHuntScene（火把寻草在 Maintain 之后）。
   */
  });
}
