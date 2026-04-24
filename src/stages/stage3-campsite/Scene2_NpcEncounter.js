/**
 * Campsite flow — state chunk (applied to CampSelectScene prototype).
 */
export function mixinCampSelectScene2(Proto) {
  Object.assign(Proto.prototype, {
  buildScene2NPCEncounter() {
    const travelerPos = this.cartesianToIso(140, 60);
    const firePos = this.cartesianToIso(220, 100);

    const traveler = this.add.circle(travelerPos.x, travelerPos.y, 34, 0x888888);
    traveler.setStrokeStyle(2, 0x555555);
    traveler.setDepth(travelerPos.y);
    this.pushStage(traveler);

    const fire = this.add.circle(firePos.x, firePos.y, 9, 0xe02020);
    fire.setDepth(firePos.y + 1);
    this.pushStage(fire);
    this.tweens.add({
      targets: fire,
      alpha: 0.35,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const lines = [
      { t: 'Traveler: "What are you doing out here?"' },
      { t: 'You: "I am looking for some herbs."' },
      {
        t: 'Traveler: "Well that I can\'t help you. But I have to warn you, if you\'re staying out here for the night, don\'t just pick the first place you see, that\'s how you get into trouble."',
      },
      { t: 'You: "What should I look for?"' },
      
      { t: 'Traveler: "Ground, water, wind… and also what\'s above you."' },
    ];

    let idx = 0;
    this.dialogText.setText(lines[0].t);

    const nextBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 128, 'Next', {
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

    const advance = () => {
      idx += 1;
      if (idx < lines.length) {
        this.dialogText.setText(lines[idx].t);
        if (idx === lines.length - 1) {
          nextBtn.setText('Continue');
        }
      } else {
        this.enterState(3);
      }
    };

    nextBtn.on('pointerdown', advance);
    nextBtn.on('pointerover', () => this.input.setDefaultCursor('pointer'));
    nextBtn.on('pointerout', () => this.input.setDefaultCursor('default'));
  }
  });
}
