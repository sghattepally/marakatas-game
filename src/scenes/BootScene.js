import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Show loading text
    const loadingText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      'Loading The Marakatas...',
      {
        fontSize: '32px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    // Load assets here (we'll add actual assets later)
    // For now, just a delay to show loading screen
  }

  create() {
    // Move to main menu after loading
    this.time.delayedCall(1000, () => {
      this.scene.start('MainMenu');
    });
  }
}