// src/main.js
/**
 * The Marakatas - Main Game Entry Point
 * Initializes Phaser and loads all scenes
 */

import Phaser from 'phaser';
import { GameConfig } from './config.js';
import BootScene from './scenes/BootScene.js';
import MainMenu from './scenes/MainMenu.js';
import MissionSelectScene from './scenes/MissionSelectScene.js';
import MissionSceneIsometric from './scenes/MissionScene_Isometric.js';

// Add all scenes to config
GameConfig.scene = [BootScene, MainMenu, MissionSelectScene, MissionSceneIsometric];

const game = new Phaser.Game(GameConfig);
window.game = game;

console.log('╔════════════════════════════════════════════╗');
console.log('║     THE MARAKATAS - Game Initialized      ║');
console.log('║          Pirates of the Loka Verse        ║');
console.log('╚════════════════════════════════════════════╝');
console.log('Phaser Version:', Phaser.VERSION);
console.log('Scene Order: BootScene → MainMenu → MissionSelect → MissionScene');