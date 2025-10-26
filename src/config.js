import Phaser from 'phaser';

export const GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#2d2d2d',
  scene: [], // We'll add scenes in main.js
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 }, // No gravity for top-down tactical
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};