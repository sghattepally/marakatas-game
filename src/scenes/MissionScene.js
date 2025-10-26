// src/scenes/MissionScene.js
/**
 * The Marakatas - Mission Scene (Improved)
 * 
 * CHANGES:
 * - Integrated GridSystem for proper positioning
 * - Implemented movement mechanics (Move ability)
 * - Improved UI layout (non-overlapping panels)
 * - Better character visibility
 * - Prepared for 2.5D sprite integration
 */

import Phaser from 'phaser';
import { AbilitySystem, calculateDistance } from '../systems/AbilitySystem.js';
import GridSystem from '../systems/GridSystem.js';
import { CharacterStats, SessionCharacter, GameSession, MARAKATAS_ROSTER } from '../data/Character.js';
import { ABILITY_DATABASE, CLASS_ABILITIES, MISSIONS, getAbility } from '../data/Abilities.js';

export default class MissionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MissionScene' });
    
    // Combat state
    this.combatActive = false;
    this.participants = [];
    this.abilitySystem = null;
    this.gameSession = null;
    this.currentActorId = null;
    
    // Grid system for positioning
    this.gridSystem = null;
    
    // UI state
    this.selectedAbility = null;
    this.targetingMode = false;
    this.movementMode = false;
    this.targetingAbility = null;
    this.selectedTargetId = null;
    
    // Visual elements
    this.participantSprites = {};
    this.abilityButtons = {};
    this.eventLog = [];
    
    // Movement visualization
    this.movementTiles = [];
    
    // UI Panels
    this.uiPanels = {
      info: null,
      abilities: null,
      log: null,
      turn: null
    };
  }

  init(data) {
    this.missionId = data?.missionId || 'merchant_ship_heist';
    this.difficulty = data?.difficulty || 'normal';
  }

  create() {
    const { width, height } = this.cameras.main;
    
    // Initialize mission
    this.initializeMission();
    
    // Create grid system (10x8 for compact tactical battles)
    this.gridSystem = new GridSystem(this, 20, 10); 
    const { offsetX, offsetY } = this.gridSystem.createGrid();
    this.gridSystem.offsetX = offsetX;
    this.gridSystem.offsetY = offsetY;
    
    // Initialize game systems
    this.gameSession = new GameSession(this.missionId, {
      mapWidth: 12,
      mapHeight: 8,
      environmentType: 'ship_deck'
    });
    
    this.abilitySystem = new AbilitySystem(this);
this.abilitySystem.participants = this.participants;
this.abilitySystem.abilities = Object.values(ABILITY_DATABASE);
this.gameSession.participants = this.participants;
this.abilitySystem.gameSession = this.gameSession;
    
    // Create battlefield background
    this.createBattlefield();
    
    // Create character sprites on grid
    this.createCharacterSprites();
    
    // Create improved UI layout
    this.createUILayout();
    this.updateAbilityPanel();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start combat
    this.startCombat();
  }

  // ==========================================
  // MISSION INITIALIZATION
  // ==========================================

  initializeMission() {
    const missionData = MISSIONS[this.missionId];
    if (!missionData) {
      console.error(`Mission ${this.missionId} not found!`);
      return;
    }
    
    this.missionData = missionData;
    this.participants = [];
    
    // Create player team
    for (const partyMember of missionData.playerParty) {
      // MARAKATAS_ROSTER contains factory functions, so we need to call them
      const characterFactory = MARAKATAS_ROSTER[partyMember.character];
      if (!characterFactory) {
        console.warn(`Character ${partyMember.character} not found in roster`);
        continue;
      }
      
      const character = characterFactory(); // Call the factory function
      
      const sessionChar = new SessionCharacter(character, this.missionId, {
        id: `${partyMember.character}_${Date.now()}`,
        team: 'player',
        x: partyMember.startX || 2,
        y: partyMember.startY || 4,
        movementSpeed: 4
      });
      
      this.participants.push(sessionChar);
    }
    
    // Create enemy team
    for (const enemyData of missionData.enemies) {
      const character = new CharacterStats(enemyData.name, {
  level: enemyData.level,
  class: enemyData.class,
  bala: enemyData.attributes?.bala || 10,
  dakshata: enemyData.attributes?.dakshata || 10,
  dhriti: enemyData.attributes?.dhriti || 10,
  buddhi: enemyData.attributes?.buddhi || 10,
  prajna: enemyData.attributes?.prajna || 10,
  samkalpa: enemyData.attributes?.samkalpa || 10
});
      
      const sessionChar = new SessionCharacter(character, this.missionId, {
        id: `enemy_${enemyData.name}_${Date.now()}`,
        team: 'enemy',
        x: enemyData.startX || 9,
        y: enemyData.startY || 4,
        movementSpeed: 3
      });
      
      this.participants.push(sessionChar);
    }
  }

  // ==========================================
  // VISUAL SETUP
  // ==========================================

  createBattlefield() {
    const { width, height } = this.cameras.main;
    
    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a2e4a)
      .setDepth(-100);
    
    // Mission title
    this.add.text(width / 2, 20, this.missionData.name, {
      fontSize: '20px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(100);
    
    // Objective
    this.add.text(width / 2, 45, this.missionData.objective, {
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5).setDepth(100);
  }

  createCharacterSprites() {
    for (const participant of this.participants) {
      // Convert grid position to world position
      const { worldX, worldY } = this.gridSystem.gridToWorld(
        participant.x,
        participant.y,
        this.gridSystem.offsetX,
        this.gridSystem.offsetY
      );
      
      // Character circle (placeholder for 2.5D sprite)
      const color = participant.team === 'player' ? 0x4ade80 : 0xef4444;
      const sprite = this.add.circle(worldX, worldY, 25, color);
      sprite.setStrokeStyle(3, 0xffffff);
      sprite.setInteractive();
      sprite.setDepth(50);
      sprite.participantId = participant.id;
      
      // Click handler
      sprite.on('pointerdown', () => this.onCharacterClick(participant.id));
      
      // Name text
      const nameText = this.add.text(worldX, worldY - 45, participant.character.name, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      }).setOrigin(0.5).setDepth(51);
      
      // Health bar
      const healthBarBg = this.add.rectangle(worldX, worldY + 40, 60, 6, 0x333333)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x666666)
        .setDepth(51);
      
      const healthPercent = participant.getHealthPercent() / 100;
      const healthBarColor = healthPercent > 0.5 ? 0x4ade80 : 
                              healthPercent > 0.25 ? 0xfbbf24 : 0xef4444;
      const healthBar = this.add.rectangle(
  worldX - 30,  // Same x as background
  worldY + 40,
  60 * healthPercent,
  6,
  healthBarColor
).setOrigin(0, 0.5).setDepth(52);
      
      // Health text
      const healthText = this.add.text(
        worldX,
        worldY + 52,
        `${participant.currentPrana}/${participant.character.maxPrana}`,
        {
          fontSize: '10px',
          color: '#ffffff'
        }
      ).setOrigin(0.5).setDepth(51);

      
      // Store sprite references
      this.participantSprites[participant.id] = {
        sprite,
        nameText,
        healthBar,
        healthBarBg,
        healthText,
        participant
      };
      
      // Register unit in grid
      this.gridSystem.placeUnit(participant, participant.x, participant.y);
    }
  }

  // ==========================================
  // UI LAYOUT (IMPROVED)
  // ==========================================

  createUILayout() {
    const { width, height } = this.cameras.main;
    
    // BOTTOM PANEL: Abilities (full width, not overlapping)
    this.uiPanels.abilities = this.createAbilityPanel(width / 2, height - 90, width - 40, 160);
    
    // TOP LEFT: Event Log
    this.uiPanels.log = this.createEventLogPanel(20, 80, 280, 150);
    
    // TOP RIGHT: Turn Info & End Turn
    this.uiPanels.turn = this.createTurnPanel(width - 290, 80, 280, 120);
    
    // Cancel Button (hidden by default)
    this.cancelButton = this.add.rectangle(width / 2, 100, 140, 40, 0x666666)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive()
      .setVisible(false)
      .setDepth(150);
    
    const cancelText = this.add.text(width / 2, 100, 'Cancel', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false).setDepth(151);
    
    this.cancelButton.on('pointerover', () => {
      this.cancelButton.setFillStyle(0x888888);
    });
    
    this.cancelButton.on('pointerout', () => {
      this.cancelButton.setFillStyle(0x666666);
    });
    
    this.cancelButton.on('pointerdown', () => {
      this.cancelTargeting();
      this.cancelMovement();
    });
    
    this.cancelButtonText = cancelText;
  }

  createAbilityPanel(x, y, panelWidth, panelHeight) {
    const panel = this.add.container(x, y);
    panel.setDepth(100);
    
    // Background
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1a1a1a, 0.95);
    bg.setStrokeStyle(2, 0x4ade80);
    panel.add(bg);
    
    // Title
    const title = this.add.text(0, -panelHeight/2 + 15, 'Abilities', {
      fontSize: '16px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);
    
    // Ability buttons container
    this.abilityButtonsContainer = this.add.container(0, 20);
    panel.add(this.abilityButtonsContainer);
    
    return panel;
  }

  createEventLogPanel(x, y, panelWidth, panelHeight) {
    const panel = this.add.container(x, y);
    panel.setDepth(100);
    
    // Background
    const bg = this.add.rectangle(panelWidth/2, panelHeight/2, panelWidth, panelHeight, 0x1a1a1a, 0.9);
    bg.setStrokeStyle(2, 0x666666);
    panel.add(bg);
    
    // Title
    const title = this.add.text(panelWidth/2, 15, 'Combat Log', {
      fontSize: '14px',
      color: '#888888',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(title);
    
    // Log text area
    this.logText = this.add.text(10, 35, '', {
      fontSize: '11px',
      color: '#ffffff',
      wordWrap: { width: panelWidth - 20 }
    });
    panel.add(this.logText);
    
    return panel;
  }

  createTurnPanel(x, y, panelWidth, panelHeight) {
    const panel = this.add.container(x, y);
    panel.setDepth(100);
    
    // Background
    const bg = this.add.rectangle(panelWidth/2, panelHeight/2, panelWidth, panelHeight, 0x1a1a1a, 0.9);
    bg.setStrokeStyle(2, 0x666666);
    panel.add(bg);
    
    // Round counter
    this.roundText = this.add.text(panelWidth/2, 20, 'Round: 0', {
      fontSize: '14px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(this.roundText);
    
    // Current turn
    this.currentTurnText = this.add.text(panelWidth/2, 45, '', {
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    panel.add(this.currentTurnText);
    
    // End Turn button
    const endTurnBtn = this.add.rectangle(panelWidth/2, 90, 120, 35, 0x4ade80);
    endTurnBtn.setStrokeStyle(2, 0xffffff);
    endTurnBtn.setInteractive();
    panel.add(endTurnBtn);
    
    const endTurnText = this.add.text(panelWidth/2, 90, 'End Turn', {
      fontSize: '14px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    panel.add(endTurnText);
    
    endTurnBtn.on('pointerover', () => endTurnBtn.setFillStyle(0x6ee7b7));
    endTurnBtn.on('pointerout', () => endTurnBtn.setFillStyle(0x4ade80));
    endTurnBtn.on('pointerdown', () => this.handleEndTurn());
    
    this.endTurnButton = endTurnBtn;
    
    return panel;
  }

  // ==========================================
  // ABILITY PANEL UPDATE
  // ==========================================

  updateAbilityPanel() {
    // Clear existing buttons
    this.abilityButtonsContainer.removeAll(true);
    this.abilityButtons = {};
    
    const actor = this.gameSession.getCurrentActor();
    if (!actor || actor.team !== 'player') return;
    
    // Get abilities for current character
    const classAbilities = CLASS_ABILITIES[actor.character.class] || [];
    const abilities = [
      getAbility('basic_move'), // Always include Move
      ...classAbilities.map(id => getAbility(id)).filter(a => a)
    ];
    
    // Create ability buttons
    const buttonWidth = 110;
    const buttonHeight = 70;
    const spacing = 15;
    const startX = -((abilities.length - 1) * (buttonWidth + spacing)) / 2;
    
    abilities.forEach((ability, index) => {
      const btnX = startX + index * (buttonWidth + spacing);
      const btnY = 0;
      
      // Button container
      const btnContainer = this.add.container(btnX, btnY);
      
      // Background
      const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2d2d2d);
      bg.setStrokeStyle(2, 0x4ade80);
      bg.setInteractive();
      btnContainer.add(bg);
      
      // Ability name
      const nameText = this.add.text(0, -20, ability.name, {
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: buttonWidth - 10 }
      }).setOrigin(0.5);
      btnContainer.add(nameText);
      
      // Cost text
      let costText = '';
if (ability.id === 'basic_move') {
  costText = 'Free';
} else if (ability.resourceCost > 0) {
  if (ability.resourceType === 'tapas') {
    costText = `${ability.resourceCost}T`;
  } else if (ability.resourceType === 'maya') {
    costText = `${ability.resourceCost}M`;
  } else if (ability.resourceType === 'speed') {
    costText = `${ability.resourceCost}S`;
  }
} else {
  costText = 'Free';
}
      const cost = this.add.text(0, 5, costText, {
        fontSize: '11px',
        color: '#fbbf24'
      }).setOrigin(0.5);
      btnContainer.add(cost);
      
      // Action type
      const actionType = this.add.text(0, 20, ability.actionType.replace('_', ' '), {
        fontSize: '9px',
        color: '#888888'
      }).setOrigin(0.5);
      btnContainer.add(actionType);
      
      // Hover effects
      bg.on('pointerover', () => {
        bg.setFillStyle(0x3d3d3d);
      });
      
      bg.on('pointerout', () => {
        bg.setFillStyle(0x2d2d2d);
      });
      
      bg.on('pointerdown', () => {
        this.onAbilityClick(ability.id, ability);
      });
      
      this.abilityButtonsContainer.add(btnContainer);
      this.abilityButtons[ability.id] = {
        container: btnContainer,
        bg,
        ability
      };
    });
  }

  // ==========================================
  // MOVEMENT SYSTEM
  // ==========================================

  onAbilityClick(abilityId, ability) {
    const actor = this.gameSession.getCurrentActor();
    if (!actor || actor.team !== 'player') return;
    
    if (abilityId === 'basic_move') {
      this.startMovementMode(actor);
    } else {
      this.startTargeting(actor, ability);
    }
  }

  startMovementMode(actor) {
    console.log('Starting movement mode for', actor.character.name);
    
    this.movementMode = true;
    this.targetingMode = false;
    
    // Show cancel button
    this.cancelButton.setVisible(true);
    this.cancelButtonText.setVisible(true);
    
    // Hide ability panel
    this.uiPanels.abilities.setVisible(false);
    
    // Calculate valid movement tiles
    const validMoves = this.gridSystem.calculateMovementRange(
      actor.x,
      actor.y,
      actor.remainingSpeed
    );
    
    console.log('Valid moves:', validMoves);
    
    // Highlight valid tiles
    this.gridSystem.highlightTiles(validMoves, 0x4ade80);
    this.movementTiles = validMoves;
    
    // Set up tile click handlers
    this.setupMovementHandlers(actor, validMoves);
    
    this.addLog(`Select a tile to move to (Range: ${actor.remainingSpeed})`);
  }

  setupMovementHandlers(actor, validMoves) {
    this.gridSystem.tiles.forEach(tile => {
      const gridX = tile.getData('gridX');
      const gridY = tile.getData('gridY');
      
      const isValid = validMoves.some(pos => pos.x === gridX && pos.y === gridY);
      
      if (isValid) {
        tile.on('pointerdown', () => {
          this.executeMove(actor, gridX, gridY);
        });
      }
    });
  }

  executeMove(actor, targetX, targetY) {
    console.log(`Moving ${actor.character.name} to (${targetX}, ${targetY})`);
    
    // Remove from old position in grid
    this.gridSystem.removeUnit(actor.x, actor.y);
    
    // Update actor position
    actor.x = targetX;
    actor.y = targetY;
    actor.remainingSpeed = 0; // Used movement
    
    // Place in new position
    this.gridSystem.placeUnit(actor, targetX, targetY);
    
    // Animate sprite
    const { worldX, worldY } = this.gridSystem.gridToWorld(
      targetX,
      targetY,
      this.gridSystem.offsetX,
      this.gridSystem.offsetY
    );
    
    const spriteData = this.participantSprites[actor.id];
    
    this.tweens.add({
      targets: spriteData.sprite,
      x: worldX,
      y: worldY,
      duration: 300,
      ease: 'Power2'
    });
    
    this.tweens.add({
      targets: spriteData.nameText,
      x: worldX,
      y: worldY - 45,
      duration: 300,
      ease: 'Power2'
    });
    
    this.tweens.add({
      targets: [spriteData.healthBar, spriteData.healthBarBg],
      x: worldX,
      duration: 300,
      ease: 'Power2'
    });
    
    this.tweens.add({
      targets: spriteData.healthText,
      x: worldX,
      y: worldY + 52,
      duration: 300,
      ease: 'Power2'
    });
    
    this.addLog(`${actor.character.name} moved to (${targetX}, ${targetY})`);
    
    // Clean up movement mode
    this.cancelMovement();
  }

  cancelMovement() {
    this.movementMode = false;
    this.gridSystem.clearHighlights();
    this.movementTiles = [];
    
    // Remove tile handlers
    this.gridSystem.tiles.forEach(tile => {
      tile.removeAllListeners('pointerdown');
    });
    
    // Show ability panel again
    this.uiPanels.abilities.setVisible(true);
    this.cancelButton.setVisible(false);
    this.cancelButtonText.setVisible(false);
  }

  // ==========================================
  // TARGETING SYSTEM (For other abilities)
  // ==========================================

  startTargeting(actor, ability) {
    console.log('Starting targeting for', ability.name);
    
    this.targetingMode = true;
    this.targetingAbility = ability;
    this.movementMode = false;
    
    // Show cancel button
    this.cancelButton.setVisible(true);
    this.cancelButtonText.setVisible(true);
    
    // Hide ability panel
    this.uiPanels.abilities.setVisible(false);
    
    // Highlight valid targets based on range
    const validTargets = this.getValidTargets(actor, ability);
    
    // Highlight target characters
    validTargets.forEach(targetId => {
      const spriteData = this.participantSprites[targetId];
      if (spriteData) {
        spriteData.sprite.setStrokeStyle(4, 0xfbbf24);
      }
    });
    
    this.addLog(`Select a target for ${ability.name}`);
  }

  getValidTargets(actor, ability) {
    const validTargets = [];
    
    for (const participant of this.participants) {
      if (participant.id === actor.id) continue;
      if (participant.status === 'downed' || participant.status === 'dead') continue;
      
      // Check range
      const distance = calculateDistance(actor.x, actor.y, participant.x, participant.y);
      
      if (distance <= ability.range) {
        // Check targeting rules
        if (ability.targetType === 'enemy' && participant.team !== actor.team) {
          validTargets.push(participant.id);
        } else if (ability.targetType === 'ally' && participant.team === actor.team) {
          validTargets.push(participant.id);
        } else if (ability.targetType === 'any') {
          validTargets.push(participant.id);
        }
      }
    }
    
    return validTargets;
  }

  onCharacterClick(participantId) {
    if (this.targetingMode && this.targetingAbility) {
      const actor = this.gameSession.getCurrentActor();
      const target = this.participants.find(p => p.id === participantId);
      
      if (!target) return;
      
      // Execute ability
      this.executeAbility(actor, this.targetingAbility, target);
      
      // Cancel targeting
      this.cancelTargeting();
    }
  }

  executeAbility(actor, ability, target) {
  console.log(`${actor.character.name} uses ${ability.name} on ${target.character.name}`);
  
  // Use ability system with correct format
  const result = this.abilitySystem.executeAbility({
    actorId: actor.id,
    abilityId: ability.id,
    primaryTarget: { participantId: target.id }
  });
  
  if (result.success) {
    this.addLog(result.message);
    
    // Update health bars for all affected
    this.updateHealthBars();
    
    // Check if any characters died
    for (const participantId of result.affectedParticipants) {
      const participant = this.participants.find(p => p.id === participantId);
      if (participant && participant.status === 'downed') {
        this.handleCharacterDeath(participant);
      }
    }
    
    // Check victory/defeat conditions
    const combatResult = this.gameSession.checkCombatEnd();
    if (combatResult === 'players_won') {
      this.showVictory();
    } else if (combatResult === 'enemies_won') {
      this.showDefeat();
    }
  } else {
    this.addLog(`Failed: ${result.message}`);
  }
}

handleCharacterDeath(participant) {
  const sprites = this.participantSprites[participant.id];
  if (!sprites) return;
  
  // Make sprite gray and semi-transparent
  sprites.sprite.setAlpha(0.4);
  sprites.sprite.setFillStyle(0x666666);
  sprites.nameText.setAlpha(0.4);
  sprites.healthBarBg.setAlpha(0.4);
  sprites.healthBar.setAlpha(0.4);
  sprites.healthText.setText('DOWNED');
  sprites.healthText.setColor('#ff0000');
  
  this.addLog(`💀 ${participant.character.name} has been downed!`);
}

  cancelTargeting() {
    this.targetingMode = false;
    this.targetingAbility = null;
    
    // Clear highlights
    for (const participantId in this.participantSprites) {
      const spriteData = this.participantSprites[participantId];
      spriteData.sprite.setStrokeStyle(3, 0xffffff);
    }
    
    // Show ability panel again
    this.uiPanels.abilities.setVisible(true);
    this.cancelButton.setVisible(false);
    this.cancelButtonText.setVisible(false);
  }

  // ==========================================
  // COMBAT FLOW
  // ==========================================

  setupEventListeners() {
    // Add any additional event listeners here
  }

  startCombat() {
    this.combatActive = true;
    this.gameSession.establishTurnOrder();
    this.gameSession.isActive = true;
    this.addLog('⚔️ Combat started!');
    this.startTurn();
  }

  startTurn() {
    const actor = this.gameSession.getCurrentActor();
    if (!actor) {
      this.endCombat();
      return;
    }
    this.currentActorId = actor.id;
    actor.reset();
    
    this.updateAbilityPanel();
    this.updateTurnPanel();
    
    this.addLog(`\n🎯 ${actor.character.name}'s turn!`);
    
    // Enemy AI placeholder
    if (actor.team === 'enemy') {
      this.time.delayedCall(1500, () => {
        this.handleEndTurn();
      });
    }
  }

  handleEndTurn() {
  this.cancelTargeting();
  this.cancelMovement();
  this.gameSession.nextTurn();
  
  // Check if next actor is AI
  const nextActor = this.gameSession.getCurrentActor();
  if (nextActor && nextActor.team === 'enemy') {
    // Process AI turn
    this.processAITurn(nextActor);
  } else {
    this.startTurn();
  }
}

processAITurn(actor) {
  this.addLog(`${actor.character.name}'s turn...`);
  
  // Simple AI: move closer and attack if in range
  setTimeout(() => {
    const playerTargets = this.participants.filter(p => p.team === 'player' && p.status === 'active');
    if (playerTargets.length === 0) {
      this.handleEndTurn();
      return;
    }
    
    // Pick closest player
    const target = playerTargets[0];
    const distance = Math.abs(actor.x - target.x) + Math.abs(actor.y - target.y);
    
    // Try to attack if in range
    if (distance <= 1) {
      const ability = getAbility('basic_strike');
      if (ability) {
        this.executeAbility(actor, ability, target);
      }
    }
    
    // End AI turn
    setTimeout(() => this.handleEndTurn(), 500);
  }, 1000);
}

  updateTurnPanel() {
    const actor = this.gameSession.getCurrentActor();
    
    this.roundText.setText(`Round: ${this.gameSession.round}`);
    
    if (actor) {
      this.currentTurnText.setText(
    `Turn: ${actor.character.name}\n` +
    `Actions: ${actor.actions} | Bonus: ${actor.bonusActions}\n` +
    `Movement: ${actor.remainingSpeed}`
  );
    }
  }

  updateHealthBars() {
    for (const participantId in this.participantSprites) {
    const spriteData = this.participantSprites[participantId];
    const participant = spriteData.participant;
    
    const healthPercent = participant.getHealthPercent() / 100;
    const healthBarColor = healthPercent > 0.5 ? 0x4ade80 : 
                            healthPercent > 0.25 ? 0xfbbf24 : 0xef4444;
    
    // Destroy old bar and create new one with correct size
    spriteData.healthBar.destroy();
    spriteData.healthBar = this.add.rectangle(
      spriteData.healthBarBg.x,  // Same x as background
      spriteData.healthBarBg.y,
      60 * healthPercent,
      6,
      healthBarColor
    ).setOrigin(0, 0.5).setDepth(52);
    
    spriteData.healthText.setText(`${participant.currentPrana}/${participant.character.maxPrana}`);
  }
}

  endCombat() {
    this.combatActive = false;
    const result = this.gameSession.checkCombatEnd();
    
    if (result === 'players_won') {
      this.showVictory();
    } else if (result === 'enemies_won') {
      this.showDefeat();
    }
  }

  showVictory() {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0.8)
      .setDepth(200);
    
    this.add.text(width / 2, height / 2 - 60, '🏆 VICTORY! 🏆', {
      fontSize: '48px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(201);
    
    const returnBtn = this.add.rectangle(width / 2, height / 2 + 60, 200, 50, 0x4ade80);
    returnBtn.setInteractive();
    returnBtn.setDepth(201);
    
    this.add.text(width / 2, height / 2 + 60, 'Return to Menu', {
      fontSize: '18px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(202);
    
    returnBtn.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }

  showDefeat() {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0.8)
      .setDepth(200);
    
    this.add.text(width / 2, height / 2 - 60, '💀 DEFEAT 💀', {
      fontSize: '48px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(201);
    
    const returnBtn = this.add.rectangle(width / 2, height / 2 + 60, 200, 50, 0xef4444);
    returnBtn.setInteractive();
    returnBtn.setDepth(201);
    
    this.add.text(width / 2, height / 2 + 60, 'Return to Menu', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(202);
    
    returnBtn.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }

  // ==========================================
  // EVENT LOG
  // ==========================================

  addLog(message) {
    this.eventLog.push(message);
    
    // Keep only last 8 entries
    if (this.eventLog.length > 8) {
      this.eventLog.shift();
    }
    
    this.logText.setText(this.eventLog.join('\n'));
  }
}