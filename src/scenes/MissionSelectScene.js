// src/scenes/MissionSelectScene.js
/**
 * The Marakatas - Mission Select Scene
 * Allows player to choose which mission to play
 * Shows mission descriptions, objectives, and difficulty options
 */

import Phaser from 'phaser';
import { MISSIONS, getAllMissions } from '../data/Abilities.js';

export default class MissionSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MissionSelect' });
  }

  create() {
    const { width, height } = this.cameras.main;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a2e4a)
      .setDepth(-100);

    // Title
    this.add.text(width / 2, 40, 'SELECT MISSION', {
      fontSize: '36px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Get all missions
    const missions = getAllMissions();

    // Mission list
    let missionY = 100;
    const missionSpacing = 180;

    for (const mission of missions) {
      this.createMissionButton(mission, width / 2, missionY);
      missionY += missionSpacing;
    }

    // Back button
    const backButton = this.add.rectangle(width - 100, height - 40, 150, 50, 0x333333);
    backButton.setStrokeStyle(2, 0x888888);
    backButton.setInteractive();

    this.add.text(width - 100, height - 40, 'BACK', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    backButton.on('pointerover', () => {
      backButton.setStrokeStyle(2, 0x4ade80);
    });
    backButton.on('pointerout', () => {
      backButton.setStrokeStyle(2, 0x888888);
    });
    backButton.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }

  /**
   * Create a clickable mission button
   */
  createMissionButton(mission, x, y) {
    // Mission panel background
    const panel = this.add.rectangle(x, y, 700, 160, 0x1a1a1a);
    panel.setStrokeStyle(2, 0x4ade80);
    panel.setInteractive();

    // Mission name
    this.add.text(x - 340, y - 65, mission.name, {
      fontSize: '18px',
      color: '#4ade80',
      fontStyle: 'bold'
    });

    // Mission description
    this.add.text(x - 340, y - 35, mission.description, {
      fontSize: '12px',
      color: '#cccccc',
      wordWrap: { width: 400 }
    });

    // Objective
    this.add.text(x - 340, y + 10, `Objective: ${mission.objective}`, {
      fontSize: '11px',
      color: '#ffaa00'
    });

    // Difficulty selector
    const difficulties = ['normal', 'hard', 'nightmare'];
    let selectedDifficulty = 'normal';
    
    let diffX = x + 250;
    for (const difficulty of difficulties) {
      const diffButton = this.add.rectangle(diffX, y + 30, 80, 30, 0x333333);
      diffButton.setStrokeStyle(1, difficulty === 'normal' ? 0x4ade80 : 0x666666);
      diffButton.setInteractive();

      this.add.text(diffX, y + 30, difficulty.toUpperCase(), {
        fontSize: '11px',
        color: difficulty === 'normal' ? '#4ade80' : '#888888'
      }).setOrigin(0.5);

      diffButton.on('pointerover', () => {
        diffButton.setStrokeStyle(1, 0x4ade80);
      });

      diffButton.on('pointerout', () => {
        diffButton.setStrokeStyle(1, difficulty === selectedDifficulty ? 0x4ade80 : 0x666666);
      });

      diffButton.on('pointerdown', () => {
        // Update visual state
        difficulties.forEach(d => {
          const button = this.children.list.find(
            child => child.x === (d === difficulties[0] ? diffX - 80 : d === difficulties[1] ? diffX : diffX + 80)
          );
          if (button && button.isInteractive && button.isInteractive()) {
            button.setStrokeStyle(1, 0x666666);
          }
        });
        
        diffButton.setStrokeStyle(1, 0x4ade80);
        selectedDifficulty = difficulty;
      });

      diffX += 90;
    }

    // Play button
    const playButton = this.add.rectangle(x + 280, y - 30, 100, 50, 0x4ade80);
    playButton.setInteractive();

    this.add.text(x + 280, y - 30, 'PLAY', {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    playButton.on('pointerover', () => {
      playButton.setFillStyle(0x5ed95f);
    });

    playButton.on('pointerout', () => {
      playButton.setFillStyle(0x4ade80);
    });

    playButton.on('pointerdown', () => {
      this.scene.start('MissionSceneIsometric', {
        missionId: mission.id,
        difficulty: selectedDifficulty
      });
    });

    // Panel click interaction
    panel.on('pointerover', () => {
      panel.setStrokeStyle(2, 0x5ed95f);
    });

    panel.on('pointerout', () => {
      panel.setStrokeStyle(2, 0x4ade80);
    });
  }
}