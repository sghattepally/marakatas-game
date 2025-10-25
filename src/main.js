import Phaser from 'phaser';
import { GameConfig } from './config';
import BootScene from './scenes/BootScene';
import MainMenu from './scenes/MainMenu';
import MissionSelectScene from './scenes/MissionSelectScene';
import MissionScene from './scenes/MissionScene';

// Add all scenes to config
GameConfig.scene = [BootScene, MainMenu, MissionSelectScene, MissionScene];

const game = new Phaser.Game(GameConfig);
window.game = game;

console.log('The Marakatas - Phaser 3 Game Started');
console.log('Phaser Version:', Phaser.VERSION);