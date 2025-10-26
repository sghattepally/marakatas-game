// src/scenes/MissionScene.js
/**
 * The Marakatas - Mission Scene (Updated)
 * Main combat scene with:
 * - Range visualization (particle effect rings + outlines)
 * - Auto-hiding UI panels during targeting
 * - Valid/invalid target highlighting
 * - AOE preview for ground-targeted abilities
 * - Clean separation of targeting and non-targeting modes
 */

import Phaser from 'phaser';
import { AbilitySystem, calculateDistance } from '../systems/AbilitySystem.js';
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
    
    // UI state
    this.selectedAbility = null;
    this.targetingMode = false;
    this.targetingAbility = null;
    this.selectedTargetId = null;
    
    // Visual elements
    this.participantSprites = {};
    this.abilityButtons = {};
    this.eventLog = [];
    
    // Range visualization
    this.rangeVisualization = {
      particles: null,
      emitter: null,
      outline: null,
      aoePreview: null,
      validTargets: [],
      invalidTargets: []
    };
    
    // UI Panels
    this.uiPanels = {
      info: null,
      abilities: null,
      log: null,
      turn: null
    };
  }

  /**
   * Initialize a mission by ID
   * Called from MissionSelectScene
   */
  init(data) {
    this.missionId = data?.missionId || 'merchant_ship_heist';
    this.difficulty = data?.difficulty || 'normal';
  }

  create() {
    const { width, height } = this.cameras.main;
    console.log(`Camera size: ${width}x${height}`);
  console.log(`Physics world bounds:`, this.physics.world.bounds);
    
    // Set up physics world
    this.physics.world.setBounds(0, 0, 2000, 1500);
    
    // Create mission from data
    this.initializeMission();
    
    // Initialize game systems
    this.gameSession = new GameSession(this.missionId, {
      mapWidth: 20,
      mapHeight: 15,
      environmentType: 'ship_deck'
    });
    
    this.abilitySystem = new AbilitySystem(this);
    this.gameSession.participants = this.participants;
    this.abilitySystem.gameSession = this.gameSession;
    
    // Create particle emitter for range visualization
    this.createParticleEmitter();
    
    // Create battlefield (NO GRID - will be replaced with 2.5D layers)
    this.createBattlefield();
    
    // Create character sprites
    this.createCharacterSprites();
    
    // Create UI panels
    this.createUILayout();
    this.updateAbilityPanel();
    
    // Start combat
    this.startCombat();
  }

  // ==========================================
  // MISSION INITIALIZATION
  // ==========================================

  initializeMission() {
    const missionData = MISSIONS[this.missionId];
    if (!missionData) {
      console.error(`Mission ${this.missionId} not found`);
      return;
    }

    this.missionData = missionData;
    
    // Create player party
    for (const partyMember of missionData.playerParty) {
      const character = this.createCharacter(partyMember.character);
      const sessionChar = new SessionCharacter(character, this.missionId, {
        x: partyMember.startX,
        y: partyMember.startY,
        team: 'player'
      });
      
      sessionChar.character.abilities = CLASS_ABILITIES[character.class] || [];
      this.participants.push(sessionChar);
    }
    
    // Create enemies
    for (const enemyData of missionData.enemies) {
      const character = new CharacterStats(enemyData.name, {
        level: enemyData.level,
        class: enemyData.class,
        ...enemyData.attributes
      });
      
      const sessionChar = new SessionCharacter(character, this.missionId, {
        x: enemyData.startX,
        y: enemyData.startY,
        team: 'enemy'
      });
      
      sessionChar.character.abilities = CLASS_ABILITIES[character.class] || [];
      this.participants.push(sessionChar);
    }
  }

  createCharacter(characterId) {
    const roster = {
      lachi: () => MARAKATAS_ROSTER.lachi(),
      kona: () => MARAKATAS_ROSTER.kona(),
      reddy: () => MARAKATAS_ROSTER.reddy(),
      gopa: () => MARAKATAS_ROSTER.gopa()
    };
    
    if (roster[characterId]) {
      return roster[characterId]();
    }
    
    return new CharacterStats(characterId, { level: 1 });
  }

  // ==========================================
  // VISUAL SETUP
  // ==========================================

  /**
   * Create particle emitter for range visualization
   */
  createParticleEmitter() {
}

  /**
   * Create the battlefield background (no grid - ready for 2.5D layers)
   */
  createBattlefield() {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBounds(0, 0, 2000, 1500);
    // Background - will be replaced with 2.5D layers
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1a2e4a)
      .setDepth(-100);
     console.log('Background created at depth:', bg.depth);
    // Mission objective text (top)
    this.add.text(20, 10, this.missionData.objective, {
      fontSize: '16px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setDepth(100);
  }

  /**
   * Create character sprites with health displays
   */
  createCharacterSprites() {
    const spacing = 80; // Pixel distance per grid square
    
    for (const participant of this.participants) {
      const screenX = 50 + participant.x * spacing;
    const screenY = 50 + participant.y * spacing;
      console.log(`Character: ${participant.character.name}`);
  console.log(`Position: x=${participant.x}, y=${participant.y}`);
  console.log(`Screen pos: ${screenX}, ${screenY}`);
      // Character circle (will be replaced with 2.5D sprite)
      console.log(`Creating circle at: ${screenX}, ${screenY}`);
      const color = participant.team === 'player' ? 0x4ade80 : 0xef4444;
      const sprite = this.add.circle(screenX, screenY, 20, color);
      console.log(`Circle created:`, sprite);
  console.log(`Circle depth:`, sprite.depth);
      sprite.setInteractive();
      sprite.participantId = participant.id;
      
      // Click handler for targeting
      sprite.on('pointerdown', () => this.onCharacterClick(participant.id));
      
      // Hover effects (will show/hide during targeting mode)
      sprite.on('pointerover', () => {
        if (this.targetingMode) {
          this.onCharacterHover(participant.id);
        }
      });
      sprite.on('pointerout', () => {
        if (this.targetingMode) {
          this.clearCharacterHighlight(participant.id);
        }
      });
      
      // Name text above
      const nameText = this.add.text(screenX, screenY - 40, participant.character.name, {
        fontSize: '12px',
        color: color === 0x4ade80 ? '#4ade80' : '#ef4444',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(50);
      
      // Health bar background
      const healthBarBg = this.add.rectangle(screenX, screenY + 35, 50, 6, 0x333333)
        .setOrigin(0.5)
        .setStrokeStyle(1, 0x666666);
      
      // Health bar foreground
      const healthPercent = participant.getHealthPercent() / 100;
      const healthBarColor = healthPercent > 0.5 ? 0x4ade80 : healthPercent > 0.25 ? 0xfbbf24 : 0xef4444;
      const healthBar = this.add.rectangle(
        screenX - 25 + (50 * healthPercent / 2),
        screenY + 35,
        50 * healthPercent,
        6,
        healthBarColor
      ).setOrigin(0, 0.5).setDepth(51);
      
      // Health text
      const healthText = this.add.text(
        screenX,
        screenY + 50,
        `${Math.max(0, participant.currentPrana)}/${participant.character.maxPrana}`,
        {
          fontSize: '10px',
          color: '#ffffff'
        }
      ).setOrigin(0.5);
      
      // Status effect indicator
      const statusText = this.add.text(screenX, screenY + 65, '', {
        fontSize: '10px',
        color: '#ffaa00'
      }).setOrigin(0.5);
      
      this.participantSprites[participant.id] = {
        sprite,
        nameText,
        healthBar,
        healthBarBg,
        healthText,
        statusText,
        screenX,
        screenY,
        glowOutline: null // Will be created when needed
      };
    }
  }

  /**
   * Create UI layout with collapsible panels
   */
  createUILayout() {
    const { width, height } = this.cameras.main;
    
    // ===== LEFT PANEL: Character Info =====
    this.uiPanels.info = this.createInfoPanel(100, height - 100, 180, 180);
    
    // ===== CENTER PANEL: Ability Buttons =====
    this.uiPanels.abilities = this.createAbilityPanel(width / 2, height - 80, 700, 160);
    
    // ===== RIGHT PANEL: Turn Info & End Turn =====
    this.uiPanels.turn = this.createTurnPanel(width - 100, height - 100, 180, 180);
    
    // ===== BOTTOM-LEFT PANEL: Event Log =====
    this.uiPanels.log = this.createEventLogPanel(10, 10, 300, 100);
    
    // ===== Cancel Targeting Button =====
    this.cancelTargetingButton = this.add.rectangle(width / 2, 50, 120, 40, 0x666666);
    this.cancelTargetingButton.setInteractive();
    this.cancelTargetingButton.setDepth(101);
    this.cancelTargetingButton.setVisible(false);
    
    this.add.text(width / 2, 50, 'Cancel', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);
    
    this.cancelTargetingButton.on('pointerdown', () => this.cancelTargeting());
  }

  /**
   * Create info panel
   */
  createInfoPanel(x, y, w, h) {
    const panel = this.add.rectangle(x, y, w, h, 0x1a1a1a);
    panel.setStrokeStyle(2, 0x4ade80);
    panel.setOrigin(0);
    panel.setDepth(100);
    
    return {
      background: panel,
      nameText: this.add.text(x + 10, y + 10, '', {
        fontSize: '12px',
        color: '#4ade80',
        fontStyle: 'bold'
      }).setDepth(101),
      statsText: this.add.text(x + 10, y + 30, '', {
        fontSize: '10px',
        color: '#ffffff'
      }).setDepth(101),
      actionText: this.add.text(x + 10, y + 85, '', {
        fontSize: '10px',
        color: '#ffaa00'
      }).setDepth(101),
      resourceText: this.add.text(x + 10, y + 120, '', {
        fontSize: '10px',
        color: '#88ccff'
      }).setDepth(101)
    };
  }

  /**
   * Create ability panel
   */
  createAbilityPanel(x, y, w, h) {
    const panel = this.add.rectangle(x, y, w, h, 0x1a1a1a);
    panel.setStrokeStyle(2, 0x4ade80);
    panel.setOrigin(0.5);
    panel.setDepth(100);
    
    return {
      background: panel,
      buttons: [],
      titleText: this.add.text(x, y - 70, 'Abilities', {
        fontSize: '14px',
        color: '#4ade80',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(101)
    };
  }

  /**
   * Create turn panel
   */
  createTurnPanel(x, y, w, h) {
    const panel = this.add.rectangle(x, y, w, h, 0x1a1a1a);
    panel.setStrokeStyle(2, 0x4ade80);
    panel.setOrigin(1, 1);
    panel.setDepth(100);
    
    // End Turn button
    const endTurnButton = this.add.rectangle(x - 90, y - 40, 100, 40, 0x333333);
    endTurnButton.setStrokeStyle(2, 0x888888);
    endTurnButton.setInteractive();
    endTurnButton.setDepth(101);
    
    this.add.text(x - 90, y - 40, 'End Turn', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);
    
    endTurnButton.on('pointerover', () => {
      endTurnButton.setStrokeStyle(2, 0x4ade80);
    });
    endTurnButton.on('pointerout', () => {
      endTurnButton.setStrokeStyle(2, 0x888888);
    });
    endTurnButton.on('pointerdown', () => this.handleEndTurn());
    
    return {
      background: panel,
      endTurnButton: endTurnButton,
      roundText: this.add.text(x - 10, y - 85, '', {
        fontSize: '11px',
        color: '#ffffff'
      }).setOrigin(1, 0).setDepth(101),
      turnText: this.add.text(x - 10, y - 70, '', {
        fontSize: '11px',
        color: '#ffaa00'
      }).setOrigin(1, 0).setDepth(101)
    };
  }

  /**
   * Create event log panel
   */
  createEventLogPanel(x, y, w, h) {
    const panel = this.add.rectangle(x, y, w, h, 0x1a1a1a);
    panel.setStrokeStyle(2, 0x666666);
    panel.setOrigin(0);
    panel.setDepth(100);
    
    return {
      background: panel,
      text: this.add.text(x + 5, y + 5, '', {
        fontSize: '10px',
        color: '#cccccc',
        wordWrap: { width: w - 10 }
      }).setDepth(101)
    };
  }

  /**
   * Update ability panel with current actor's abilities
   */
  updateAbilityPanel() {
    if (!this.currentActorId) return;
    
    const actor = this.participants.find(p => p.id === this.currentActorId);
    if (!actor) return;
    
    // Remove old buttons
    this.uiPanels.abilities.buttons.forEach(button => button.destroy?.());
    this.uiPanels.abilities.buttons = [];
    
    // Create ability buttons
    const abilityIds = actor.character.abilities || [];
    const { width, height } = this.cameras.main;
    const panelCenterX = width / 2;
    const panelY = height - 80;
    const spacing = 110;
    const startX = panelCenterX - (abilityIds.length * spacing / 2);
    
    for (let i = 0; i < abilityIds.length; i++) {
      const abilityId = abilityIds[i];
      const ability = getAbility(abilityId);
      if (!ability) continue;
      
      const buttonX = startX + i * spacing;
      
      const button = this.add.rectangle(buttonX, panelY, 90, 50, 0x333333);
      button.setStrokeStyle(2, 0x666666);
      button.setInteractive();
      button.setDepth(101);
      
      // Validate if ability can be used
      const validation = this.abilitySystem.validateAbilityUse(actor, ability);
      if (!validation.valid) {
        button.setFillStyle(0x663333);
        button.setAlpha(0.5);
      }
      
      const buttonText = this.add.text(buttonX, panelY - 5, `${ability.name}\n`, {
        fontSize: '10px',
        color: validation.valid ? '#ffffff' : '#888888',
        align: 'center',
        wordWrap: { width: 85 }
      }).setOrigin(0.5).setDepth(102);
      
      // Resource cost indicator
      let costText = '';
      if (ability.resourceCost > 0) {
        costText = `${ability.resourceCost}${this.getResourceSymbol(ability.resourceType)}`;
      } else {
        costText = this.getActionSymbol(ability.actionType);
      }
      
      this.add.text(buttonX, panelY + 18, costText, {
        fontSize: '9px',
        color: '#ffaa00'
      }).setOrigin(0.5).setDepth(102);
      
      // Button interactions
      button.on('pointerover', () => {
        button.setStrokeStyle(2, 0x4ade80);
        this.showAbilityTooltip(ability, buttonX, panelY);
      });
      
      button.on('pointerout', () => {
        button.setStrokeStyle(2, 0x666666);
        this.clearTooltip();
      });
      
      button.on('pointerdown', () => {
        if (validation.valid) {
          this.selectAbility(ability);
        }
      });
      
      this.uiPanels.abilities.buttons.push(button);
      this.uiPanels.abilities.buttons.push(buttonText);
    }
  }

  /**
   * Show ability tooltip
   */
  showAbilityTooltip(ability, x, y) {
    this.clearTooltip();
    
    const tooltipText = `${ability.name}\n${ability.description}\nRange: ${ability.range}${ability.effectRadius > 0 ? ` (Radius: ${ability.effectRadius})` : ''}`;
    
    this.tooltip = this.add.text(x, y - 80, tooltipText, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
      wordWrap: { width: 200 }
    }).setOrigin(0.5).setDepth(105);
  }

  clearTooltip() {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  getActionSymbol(actionType) {
    const symbols = {
      'action': 'A',
      'bonus_action': 'B',
      'reaction': 'R',
      'free': 'F'
    };
    return symbols[actionType] || '?';
  }

  getResourceSymbol(resourceType) {
    const symbols = {
      'tapas': 'T',
      'maya': 'M',
      'prana': 'P',
      'speed': 'S'
    };
    return symbols[resourceType] || '?';
  }

  // ==========================================
  // RANGE VISUALIZATION
  // ==========================================

  /**
   * Show range visualization for selected ability
   */
  showRangeVisualization(actor, ability) {
  const { screenX, screenY } = this.participantSprites[actor.id];
  let effectiveRange = ability.range;
  if (ability.range === 'speed') {
    effectiveRange = actor.remainingSpeed;
  }
  console.log(`Actor position: ${actor.character.name} at ${screenX}, ${screenY}`);
  console.log(`Ability range: ${effectiveRange} pixels: ${effectiveRange * 80}`);
  
  
  
  this.clearRangeVisualization();
  
  // Just draw the dashed circle - no particles needed
  this.rangeVisualization.outline = this.createDashedCircle(
    screenX,
    screenY,
    effectiveRange * 80,  // ← Use effectiveRange, not ability.range
    0x4ade80
  );
  
  // Skip particle emission for now
  // this.rangeVisualization.emitter.emitParticleAt(screenX, screenY, 20);
  
  this.updateTargetValidity(actor, ability);
}

  /**
   * Create dashed circle outline
   */
  createDashedCircle(centerX, centerY, radius, color) {
  if (!radius || radius <= 0 || isNaN(radius)) {
    console.warn('Invalid radius:', radius);
    return null;
  }
  
    // Draw a solid circle outline using graphics
  const graphics = this.make.graphics({ x: 0, y: 0, add: false });
  graphics.lineStyle(2, color, 0.5);  // 0.5 = 50% transparency
  graphics.strokeCircle(centerX, centerY, radius);
  
  // Generate texture from graphics
  const textureKey = `circle_${Math.random()}`;
  graphics.generateTexture(textureKey, radius * 2 + 20, radius * 2 + 20);
  graphics.destroy();
  
  // Add circle to scene
  const circle = this.add.image(centerX, centerY, textureKey);
  circle.setDepth(40);
  circle.setOrigin(0.5, 0.5);
  circle.setAlpha(0.5);  // Semi-transparent
  
  return circle;
}

  /**
   * Update which targets are valid/invalid for current ability
   */
  updateTargetValidity(actor, ability) {
    this.rangeVisualization.validTargets = [];
    this.rangeVisualization.invalidTargets = [];
    
    for (const participant of this.participants) {
      if (participant.id === actor.id) continue; // Skip self
      
      const validation = this.abilitySystem.validateTargeting(actor, ability, {
        participantId: participant.id
      });
      
      if (validation.valid) {
        this.rangeVisualization.validTargets.push(participant.id);
      } else {
        this.rangeVisualization.invalidTargets.push(participant.id);
      }
    }
  }

  /**
   * Show AOE preview at mouse position (for ground-targeted abilities)
   */
  showAOEPreview(position, ability) {
    if (!ability.effectRadius || ability.effectRadius === 0) return;
    
    // Clear old preview
    if (this.rangeVisualization.aoePreview) {
      this.rangeVisualization.aoePreview.destroy();
    }
    
    const radiusPixels = ability.effectRadius * 80;
    this.rangeVisualization.aoePreview = this.createDashedCircle(
      position.x,
      position.y,
      radiusPixels,
      0xff6b6b // Red for AOE
    );
  }

  /**
   * Clear all range visualizations
   */
  clearRangeVisualization() {
    if (this.rangeVisualization.outline) {
      this.rangeVisualization.outline.destroy();
      this.rangeVisualization.outline = null;
    }
    
    if (this.rangeVisualization.aoePreview) {
      this.rangeVisualization.aoePreview.destroy();
      this.rangeVisualization.aoePreview = null;
    }
    
    this.rangeVisualization.validTargets = [];
    this.rangeVisualization.invalidTargets = [];
  }

  // ==========================================
  // TARGET HIGHLIGHTING
  // ==========================================

  /**
   * Highlight a character when hovering (glow effect)
   */
  onCharacterHover(participantId) {
    const sprites = this.participantSprites[participantId];
    if (!sprites || !sprites.sprite) return;
    
    // Check if this is a valid target
    const isValid = this.rangeVisualization.validTargets.includes(participantId);
    
    if (isValid) {
      // Create glow outline
      sprites.sprite.setStrokeStyle(3, 0xffff00);
    } else {
      // Dim invalid target
      sprites.sprite.setStrokeStyle(3, 0xff6b6b);
      sprites.sprite.setAlpha(0.5);
    }
  }

  /**
   * Clear character highlight
   */
  clearCharacterHighlight(participantId) {
    const sprites = this.participantSprites[participantId];
    if (!sprites || !sprites.sprite) return;
    
    sprites.sprite.setStrokeStyle(0);
    sprites.sprite.setAlpha(1);
  }

  // ==========================================
  // COMBAT FLOW
  // ==========================================

  startCombat() {
    this.combatActive = true;
    this.gameSession.establishTurnOrder();
    this.gameSession.isActive = true;
    this.addLog('Combat started!');
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
    
    this.updateInfoPanel();
    this.updateAbilityPanel();
    this.updateTurnPanel();
    
    this.addLog(`${actor.character.name}'s turn!`);
    
    // Enemy AI placeholder
    if (actor.team === 'enemy') {
      this.time.delayedCall(1000, () => {
        this.handleEndTurn();
      });
    }
  }

  handleEndTurn() {
    this.cancelTargeting();
    this.gameSession.nextTurn();
    this.startTurn();
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
      .setAlpha(0.7)
      .setDepth(200);
    
    this.add.text(width / 2, height / 2 - 80, 'VICTORY!', {
      fontSize: '48px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(201);
    
    this.add.text(width / 2, height / 2, this.missionData.rewards.narrative, {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: 400 }
    }).setOrigin(0.5).setDepth(201);
    
    const continueButton = this.add.rectangle(width / 2, height / 2 + 100, 150, 50, 0x4ade80);
    continueButton.setInteractive();
    continueButton.setDepth(201);
    
    this.add.text(width / 2, height / 2 + 100, 'Continue', {
      fontSize: '20px',
      color: '#000000',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(202);
    
    continueButton.on('pointerdown', () => {
      this.scene.start('MissionSelect');
    });
  }

  showDefeat() {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0.7)
      .setDepth(200);
    
    this.add.text(width / 2, height / 2 - 80, 'DEFEAT', {
      fontSize: '48px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(201);
    
    this.add.text(width / 2, height / 2, this.missionData.failureConsequences.narrative, {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: 400 }
    }).setOrigin(0.5).setDepth(201);
    
    const retryButton = this.add.rectangle(width / 2 - 100, height / 2 + 100, 150, 50, 0xef4444);
    retryButton.setInteractive();
    retryButton.setDepth(201);
    
    this.add.text(width / 2 - 100, height / 2 + 100, 'Retry', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(202);
    
    const menuButton = this.add.rectangle(width / 2 + 100, height / 2 + 100, 150, 50, 0x666666);
    menuButton.setInteractive();
    menuButton.setDepth(201);
    
    this.add.text(width / 2 + 100, height / 2 + 100, 'Menu', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(202);
    
    retryButton.on('pointerdown', () => {
      this.scene.restart();
    });
    
    menuButton.on('pointerdown', () => {
      this.scene.start('MissionSelect');
    });
  }

  // ==========================================
  // ABILITY SELECTION & TARGETING
  // ==========================================

  selectAbility(ability) {
  
    console.log('Selected ability:', ability);
  console.log('Ability ID:', ability.id);
  console.log('Ability range:', ability.range);
  console.log('Target type:', ability.targetType);
  
    this.selectedAbility = ability;
    this.targetingAbility = ability;
    this.targetingMode = true;
    
    // Hide ability panel, show cancel button
    this.uiPanels.abilities.background.setVisible(false);
    this.uiPanels.abilities.titleText.setVisible(false);
    this.uiPanels.abilities.buttons.forEach(btn => btn.setVisible(false));
    this.cancelTargetingButton.setVisible(true);
    
    const actor = this.participants.find(p => p.id === this.currentActorId);
    
    // Self-targeted ability executes immediately
    if (ability.targetType === 'self') {
      this.executeSelectedAbility({ participantId: this.currentActorId });
      return;
    }
    
    // Show range visualization
    this.showRangeVisualization(actor, ability);
    
    this.addLog(`Select target for ${ability.name}...`);
    this.input.setDefaultCursor('crosshair');
    
    // Enable ground clicking for ground-targeted abilities
    if (ability.targetType === 'ground') {
      this.input.on('pointermove', this.onPointerMove, this);
      this.input.on('pointerdown', this.onGroundClick, this);
    }
  }

  /**
   * Handle mouse movement for ground AOE preview
   */
  onPointerMove(pointer) {
    if (!this.targetingMode || this.targetingAbility.targetType !== 'ground') return;
    
    const actor = this.participants.find(p => p.id === this.currentActorId);
    
    // Check if position is in range
    const distance = calculateDistance(
      this.participantSprites[actor.id].screenX / 80,
      this.participantSprites[actor.id].screenY / 80,
      Math.floor(pointer.x / 80),
      Math.floor(pointer.y / 80)
    );
    
    if (distance <= this.targetingAbility.range) {
      this.showAOEPreview(
        { x: pointer.x, y: pointer.y },
        this.targetingAbility
      );
    }
  }

  onCharacterClick(participantId) {
    if (!this.targetingMode) return;
    if (!this.targetingAbility) return;
    
    const target = this.participants.find(p => p.id === participantId);
    if (!target) return;
    
    // Check if target is valid
    if (!this.rangeVisualization.validTargets.includes(participantId)) {
      this.addLog('Invalid target!');
      return;
    }
    
    this.executeSelectedAbility({ participantId });
  }

  onGroundClick(pointer) {
    if (!this.targetingMode) return;
    if (this.targetingAbility.targetType !== 'ground') return;
    
    const actor = this.participants.find(p => p.id === this.currentActorId);
    const gridX = Math.floor(pointer.x / 80);
    const gridY = Math.floor(pointer.y / 80);
    
    const validation = this.abilitySystem.validateTargeting(
      actor,
      this.targetingAbility,
      { x: gridX, y: gridY }
    );
    
    if (!validation.valid) {
      this.addLog(validation.message);
      return;
    }
    
    this.executeSelectedAbility({ x: gridX, y: gridY });
  }

  cancelTargeting() {
    if (!this.targetingMode) return;
    
    this.targetingMode = false;
    this.selectedAbility = null;
    this.targetingAbility = null;
    this.cancelTargetingButton.setVisible(false);
    
    // Show ability panel again
    this.uiPanels.abilities.background.setVisible(true);
    this.uiPanels.abilities.titleText.setVisible(true);
    this.uiPanels.abilities.buttons.forEach(btn => btn.setVisible(true));
    
    this.input.setDefaultCursor('default');
    this.input.off('pointerdown', this.onGroundClick, this);
    this.input.off('pointermove', this.onPointerMove, this);
    
    this.clearRangeVisualization();
    
    // Clear all target highlights
    for (const participantId of this.rangeVisualization.validTargets.concat(this.rangeVisualization.invalidTargets)) {
      this.clearCharacterHighlight(participantId);
    }
    
    this.addLog('Targeting cancelled.');
  }

  executeSelectedAbility(targetInfo) {
    if (!this.selectedAbility) return;
    
    const actor = this.participants.find(p => p.id === this.currentActorId);
    if (!actor) return;
    
    const result = this.abilitySystem.executeAbility({
      actorId: this.currentActorId,
      abilityId: this.selectedAbility.id,
      primaryTarget: targetInfo
    });
    
    if (result.success) {
      this.addLog(result.message);
      
      for (const event of result.logEvents) {
        this.displayEventLog(event);
        this.animateAbilityEffect(event);
      }
      
      for (const participantId of result.affectedParticipants) {
        this.updateParticipantDisplay(participantId);
      }
      
      const combatResult = this.gameSession.checkCombatEnd();
      if (combatResult) {
        this.endCombat();
      }
    } else {
      this.addLog(`❌ ${result.message}`);
    }
    
    this.cancelTargeting();
    this.updateInfoPanel();
    this.updateAbilityPanel();
  }

  // ==========================================
  // VISUAL UPDATES & ANIMATIONS
  // ==========================================

  updateParticipantDisplay(participantId) {
    const participant = this.participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const sprites = this.participantSprites[participantId];
    if (!sprites) return;
    
    const healthPercent = participant.getHealthPercent() / 100;
    const healthBarColor = healthPercent > 0.5 ? 0x4ade80 : healthPercent > 0.25 ? 0xfbbf24 : 0xef4444;
    
    sprites.healthBar.destroy();
    sprites.healthBar = this.add.rectangle(
      sprites.screenX - 25 + (50 * healthPercent / 2),
      sprites.screenY + 35,
      50 * healthPercent,
      6,
      healthBarColor
    ).setOrigin(0, 0.5);
    
    sprites.healthText.setText(
      `${Math.max(0, participant.currentPrana)}/${participant.character.maxPrana}`
    );
    
    const statusNames = participant.statusEffects.map(e => e.name).join(', ');
    sprites.statusText.setText(statusNames);
    
    if (participant.status === 'downed') {
      sprites.sprite.setAlpha(0.5);
      sprites.sprite.setFillStyle(0x666666);
    } else {
      sprites.sprite.setAlpha(1);
      const color = participant.team === 'player' ? 0x4ade80 : 0xef4444;
      sprites.sprite.setFillStyle(color);
    }
  }

  displayEventLog(event) {
    let message = '';
    
    switch (event.eventType) {
      case 'damage':
        message = `${event.actor} → ${event.target}: ${event.damage} dmg`;
        break;
      case 'heal':
        message = `${event.actor} → ${event.target}: +${event.healing}`;
        break;
      case 'teleport':
        message = `${event.actor} moved`;
        break;
      case 'status_applied':
        message = `${event.actor} → ${event.target}: ${event.statusEffect}`;
        break;
      case 'error':
        message = `❌ ${event.message}`;
        break;
      default:
        message = event.eventType;
    }
    
    this.addLog(message);
  }

  animateAbilityEffect(event) {
    if (event.eventType === 'damage' && event.target) {
      const targetParticipant = this.participants.find(p => p.character.name === event.target);
      if (targetParticipant && this.participantSprites[targetParticipant.id]) {
        const sprite = this.participantSprites[targetParticipant.id].sprite;
        
        this.tweens.add({
          targets: sprite,
          alpha: 0.3,
          duration: 100,
          yoyo: true,
          repeat: 1
        });
      }
    }
    
    if (event.eventType === 'heal' && event.target) {
      const targetParticipant = this.participants.find(p => p.character.name === event.target);
      if (targetParticipant && this.participantSprites[targetParticipant.id]) {
        const sprite = this.participantSprites[targetParticipant.id].sprite;
        
        this.tweens.add({
          targets: sprite,
          scale: 1.2,
          duration: 200,
          yoyo: true,
          repeat: 1
        });
      }
    }
    
    if (event.eventType === 'teleport' && event.actor) {
      const actor = this.participants.find(p => p.character.name === event.actor);
      if (actor && this.participantSprites[actor.id]) {
        const sprites = this.participantSprites[actor.id];
        const newScreenX = 400 + actor.x * 80;
        const newScreenY = 300 + actor.y * 80;
        
        this.tweens.add({
          targets: [sprites.sprite, sprites.nameText, sprites.healthBar, sprites.statusText],
          x: newScreenX,
          y: newScreenY,
          duration: 300,
          ease: 'Power2.easeInOut'
        });
        
        sprites.screenX = newScreenX;
        sprites.screenY = newScreenY;
      }
    }
  }

  updateInfoPanel() {
    const actor = this.participants.find(p => p.id === this.currentActorId);
    if (!actor) return;
    
    this.uiPanels.info.nameText.setText(`${actor.character.name}`);
    
    this.uiPanels.info.statsText.setText(
      `Bala:${actor.character.bala} Dak:${actor.character.dakshata}\n` +
      `Dhr:${actor.character.dhriti} Bud:${actor.character.buddhi}`
    );
    
    this.uiPanels.info.actionText.setText(
      `A:${actor.actions} B:${actor.bonusActions} R:${actor.reactions} S:${actor.remainingSpeed}`
    );
    
    this.uiPanels.info.resourceText.setText(
      `HP:${actor.currentPrana}/${actor.character.maxPrana}\n` +
      `Tapas:${actor.currentTapas}/${actor.character.maxTapas}\n` +
      `Maya:${actor.currentMaya}/${actor.character.maxMaya}`
    );
  }

  updateTurnPanel() {
    this.uiPanels.turn.roundText.setText(`Round: ${this.gameSession.round}`);
    this.uiPanels.turn.turnText.setText(`Turn: ${this.gameSession.currentTurnIndex + 1}/${this.gameSession.turnOrder.length}`);
  }

  addLog(message) {
    this.eventLog.unshift(message);
    
    if (this.eventLog.length > 5) {
      this.eventLog.pop();
    }
    
    this.uiPanels.log.text.setText(this.eventLog.join('\n'));
  }
}