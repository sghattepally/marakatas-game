import Phaser from 'phaser';
import { MISSIONS } from '../data/missions';

export default class MissionSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MissionSelect' });
  }

  create() {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, 50, 'SELECT MISSION', {
      fontSize: '48px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // List available missions
    const availableMissions = Object.values(MISSIONS);
    
    availableMissions.forEach((mission, index) => {
      const yPos = 150 + (index * 120);
      
      // Mission card
      const card = this.add.rectangle(width / 2, yPos, 700, 100, 0x2a2a2a);
      card.setStrokeStyle(2, 0x444444);
      card.setInteractive();
      
      const title = this.add.text(width / 2 - 330, yPos - 30, mission.name, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      
      const desc = this.add.text(width / 2 - 330, yPos, mission.description, {
        fontSize: '16px',
        color: '#cccccc',
        wordWrap: { width: 650 }
      });
      
      const type = this.add.text(width / 2 - 330, yPos + 30, `Type: ${mission.type}`, {
        fontSize: '14px',
        color: '#888888'
      });

      // Hover effect
      card.on('pointerover', () => {
        card.setFillStyle(0x3a3a3a);
      });
      
      card.on('pointerout', () => {
        card.setFillStyle(0x2a2a2a);
      });
      
      card.on('pointerdown', () => {
        this.scene.start('MissionScene', { missionId: mission.id });
      });
    });

    // Back button
    const backButton = this.add.text(50, height - 50, '← Back to Menu', {
      fontSize: '20px',
      color: '#888888'
    }).setInteractive();

    backButton.on('pointerover', () => {
      backButton.setColor('#ffffff');
    });

    backButton.on('pointerout', () => {
      backButton.setColor('#888888');
    });

    backButton.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }
}