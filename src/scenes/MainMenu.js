import Phaser from 'phaser';

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Title
    this.add.text(width / 2, height / 3, 'THE MARAKATAS', {
      fontSize: '64px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 3 + 80, 'Pirates of the Loka Verse', {
      fontSize: '24px',
      color: '#888888'
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.text(width / 2, height / 2 + 50, 'START CAMPAIGN', {
  fontSize: '32px',
  color: '#ffffff',
  backgroundColor: '#333333',
  padding: { x: 20, y: 10 }
}).setOrigin(0.5).setInteractive();

startButton.on('pointerover', () => {
  startButton.setStyle({ backgroundColor: '#4ade80', color: '#000000' });
});

startButton.on('pointerout', () => {
  startButton.setStyle({ backgroundColor: '#333333', color: '#ffffff' });
});

startButton.on('pointerdown', () => {
  this.scene.start('MissionSelect'); // Changed from 'GameScene'
});

    // Credits
    this.add.text(width / 2, height - 40, 'Built with Phaser 3 | MIT License', {
      fontSize: '14px',
      color: '#666666'
    }).setOrigin(0.5);
  }
}