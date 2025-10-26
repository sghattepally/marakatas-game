// src/scenes/MissionScene_Isometric.js
/**
 * The Marakatas - Isometric Mission Scene
 * 2.5D tactical combat with Transistor-inspired presentation
 * 
 * Features:
 * - Isometric grid with depth sorting
 * - Toggle between isometric and top-down views
 * - Collapsible UI panels
 * - Clean, minimal HUD
 * - Character shadows and lighting
 */

import Phaser from 'phaser';
import IsometricGrid from '../systems/IsometricGrid.js';
import { AbilitySystem, calculateDistance } from '../systems/AbilitySystem.js';
import { CharacterStats, SessionCharacter, GameSession, MARAKATAS_ROSTER } from '../data/Character.js';
import { ABILITY_DATABASE, CLASS_ABILITIES, MISSIONS, getAbility } from '../data/Abilities.js';

const UI_COLORS = {
  action: 0x4ade80,      // Green
  bonusAction: 0xef4444, // Red
  reaction: 0xa855f7,    // Purple
  free: 0x94a3b8,        // Gray
  tapas: 0xf97316,       // Orange
  maya: 0x3b82f6,        // Blue
  speed: 0xfbbf24        // Yellow
};

export default class MissionSceneIsometric extends Phaser.Scene {
    constructor() {
    super({ key: 'MissionSceneIsometric' });
    
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
    this.movementMode = false;
    this.uiCollapsed = false;
    
    // Visual elements
    this.participantSprites = {}; // id -> {sprite, shadow, nameText, healthBar, etc}
    this.eventLog = [];
    this.movementHighlight = null;
    
    // Grid system
    this.grid = null;
    
    // Camera controls
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.cameraOffsetX = 0;
    this.cameraOffsetY = 0;
    
    // UI Panels
    this.uiPanels = {};
  }
  
  init(data) {
    this.missionId = data.missionId || 'merchant_ship_heist';
  }
  
  create() {
    const { width, height } = this.cameras.main;
    
    // Create background (dark ocean/night)
    this.createBackground();
    // Initialize isometric grid (20x10 for merchant ship)
    this.grid = new IsometricGrid(this, 20, 10, {
      tileWidth: 64,
      tileHeight: 32,
      offsetX: width / 2 - 200,
      offsetY: 150
    });
    
    this.grid.createGrid();
    
    // Initialize game systems
    this.initializeGameSystems();
    
    // Create participants
    this.createParticipants();
    
    // Create character sprites with shadows
    this.createCharacterSprites();
    
    // Create UI
    this.createUI();
    
    // Setup input handlers
    this.setupInputHandlers();
    
    // Start combat
    this.startCombat();
  }
  
  setupInputHandlers() {
    // Mouse button handling
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer);
      } else if (this.movementMode && pointer.leftButtonDown()) {
        // Left-click in move mode
        this.handleMovementClick(pointer);
      } else if (pointer.middleButtonDown()) {
        // Middle mouse button - start camera drag
        this.startCameraDrag(pointer);
      }
    });
    
    this.input.on('pointermove', (pointer) => {
      if (this.isDragging) {
        this.updateCameraDrag(pointer);
      }
    });
    
    this.input.on('pointerup', (pointer) => {
      if (pointer.button === 1) { // Middle mouse released
        this.stopCameraDrag();
      }
    });
    
    // Keyboard controls for camera
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });
    
    // Prevent context menu on right-click
    this.input.mouse.disableContextMenu();
  }
  
  startCameraDrag(pointer) {
    this.isDragging = true;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.input.setDefaultCursor('grab');
  }
  
  updateCameraDrag(pointer) {
    const deltaX = pointer.x - this.dragStartX;
    const deltaY = pointer.y - this.dragStartY;
    
    this.cameraOffsetX += deltaX;
    this.cameraOffsetY += deltaY;
    
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    
    // Update grid offset
    this.grid.offsetX += deltaX;
    this.grid.offsetY += deltaY;
    
    // Re-render grid
    this.grid.renderGrid();
    
    // Update all sprite positions
    this.updateAllSpritePositions();
  }
  
  stopCameraDrag() {
    this.isDragging = false;
    this.input.setDefaultCursor('default');
  }
  
  update() {
    // Keyboard camera panning
    const panSpeed = 5;
    let moved = false;
    
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      this.cameraOffsetX += panSpeed;
      this.grid.offsetX += panSpeed;
      moved = true;
    }
    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      this.cameraOffsetX -= panSpeed;
      this.grid.offsetX -= panSpeed;
      moved = true;
    }
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      this.cameraOffsetY += panSpeed;
      this.grid.offsetY += panSpeed;
      moved = true;
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      this.cameraOffsetY -= panSpeed;
      this.grid.offsetY -= panSpeed;
      moved = true;
    }
    
    if (moved) {
      this.grid.renderGrid();
      this.updateAllSpritePositions();
    }
  }
  
  handleMovementClick(pointer) {
    const actor = this.gameSession.getCurrentActor();
    if (!actor || actor.team !== 'player') return;
    
    const gridPos = this.grid.screenToGrid(pointer.x, pointer.y);
    
    // Check if valid movement destination
    if (!this.grid.isValidTile(gridPos.x, gridPos.y)) return;
    
    const distance = Math.abs(actor.x - gridPos.x) + Math.abs(actor.y - gridPos.y);
    if (distance > actor.remainingSpeed) {
      this.addLog(`⚠️ Out of movement range (${actor.remainingSpeed} remaining)`);
      return;
    }
    
    if (this.grid.isOccupied(gridPos.x, gridPos.y)) {
      this.addLog('⚠️ Tile occupied');
      return;
    }
    
    // Move character
    this.moveCharacter(actor, gridPos.x, gridPos.y);
  }
  
  handleRightClick(pointer) {
    const actor = this.gameSession.getCurrentActor();
    if (!actor || actor.team !== 'player') return;
    
    const gridPos = this.grid.screenToGrid(pointer.x, pointer.y);
    
    // Check if valid movement destination
    if (!this.grid.isValidTile(gridPos.x, gridPos.y)) return;
    
    const distance = Math.abs(actor.x - gridPos.x) + Math.abs(actor.y - gridPos.y);
    if (distance > actor.remainingSpeed) {
      this.addLog(`⚠️ Out of movement range (${actor.remainingSpeed} remaining)`);
      return;
    }
    
    if (this.grid.isOccupied(gridPos.x, gridPos.y)) {
      this.addLog('⚠️ Tile occupied');
      return;
    }
    
    // Move character
    this.moveCharacter(actor, gridPos.x, gridPos.y);
  }
  
  createBackground() {
    const { width, height } = this.cameras.main;
    
    // Dark gradient background (night ocean)
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(0x0f172a, 0x0f172a, 0x1e293b, 0x1e293b, 1);
    gradient.fillRect(0, 0, width, height);
    gradient.setDepth(-100);
    
    // Subtle water texture overlay
    const waterOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x1e40af, 0.05);
    waterOverlay.setDepth(-90);
  }
  
  initializeGameSystems() {
    this.gameSession = new GameSession(this.missionId, {
      mapWidth: 20,
      mapHeight: 10,
      environmentType: 'ship_deck'
    });
    
    this.abilitySystem = new AbilitySystem(this);
    this.abilitySystem.participants = this.participants;
    this.abilitySystem.abilities = Object.values(ABILITY_DATABASE);
    this.gameSession.participants = this.participants;
    this.abilitySystem.gameSession = this.gameSession;
  }
  
  createParticipants() {
    const missionData = MISSIONS[this.missionId];
    if (!missionData) {
      console.error(`Mission ${this.missionId} not found`);
      return;
    }
    
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
    
    return new CharacterStats(characterId, { level: 1, class: 'Yodha' });
  }
  
  createCharacterSprites() {
    for (const participant of this.participants) {
      const screenPos = this.grid.gridToScreen(participant.x, participant.y);
      const depth = this.grid.calculateDepth(participant.x, participant.y, 'units');
      
      // Shadow (drawn first, under character)
      const shadow = this.add.ellipse(
        screenPos.x,
        screenPos.y + 30,
        40,
        15,
        0x000000,
        0.3
      );
      shadow.setDepth(depth - 0.5);
      
      // Character sprite (simple circle for now, replace with actual sprites)
      const color = participant.team === 'player' ? 0x4ade80 : 0xef4444;
      const sprite = this.add.circle(screenPos.x, screenPos.y, 25, color)
        .setStrokeStyle(3, 0xffffff);
      sprite.setDepth(depth);
      sprite.setInteractive({ useHandCursor: true });
      
      // Character name (above sprite)
      const nameText = this.add.text(screenPos.x, screenPos.y - 45, participant.character.name, {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      nameText.setDepth(depth + 0.1);
      
      // Health bar container (simple bar below name)
      const healthBarBg = this.add.rectangle(screenPos.x, screenPos.y + 40, 60, 6, 0x1e293b)
        .setOrigin(0.5, 0.5)
        .setStrokeStyle(1, 0x475569);
      healthBarBg.setDepth(depth + 0.1);
      
      const healthPercent = participant.getHealthPercent() / 100;
      const healthBarColor = healthPercent > 0.5 ? 0x4ade80 : 
                              healthPercent > 0.25 ? 0xfbbf24 : 0xef4444;
      
      const healthBar = this.add.rectangle(
        screenPos.x - 30,
        screenPos.y + 40,
        60 * healthPercent,
        6,
        healthBarColor
      ).setOrigin(0, 0.5);
      healthBar.setDepth(depth + 0.1);
      
      // Store references
      this.participantSprites[participant.id] = {
        participant,
        sprite,
        shadow,
        nameText,
        healthBar,
        healthBarBg,
        screenX: screenPos.x,
        screenY: screenPos.y
      };
      
      // Click handler
      sprite.on('pointerdown', () => this.onCharacterClick(participant.id));
      sprite.on('pointerover', () => this.onCharacterHover(participant.id));
      sprite.on('pointerout', () => this.onCharacterHoverEnd(participant.id));
      
      // Place in grid
      this.grid.placeUnit(participant, participant.x, participant.y);
    }
  }
  
  createUI() {
    const { width, height } = this.cameras.main;
    
    // ===== TOP BAR (Always visible) =====
    this.createTopBar();
    
    // ===== COMBAT LOG PANEL (NEW - ADD THIS) =====
    this.createCombatLogPanel();  // ← ADD THIS LINE
    
    // ===== RIGHT PANEL (Collapsible) =====
    this.createRightPanel();
    
    // ===== LEFT PANEL (Actor Stats) =====
    this.createLeftPanel();
    
    // ===== BOTTOM ACTION BAR (Transistor style) =====
    this.createActionBar();
    
    // ===== VIEW TOGGLE BUTTON =====
    this.createViewToggle();
    
    // ===== HOVER TOOLTIP =====
    this.createHoverTooltip();
  }
  
  createHoverTooltip() {
    const tooltipWidth = 240;
    const tooltipHeight = 180;
    
    // Background
    const tooltipBg = this.add.rectangle(0, 0, tooltipWidth, tooltipHeight, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0x475569)
      .setDepth(400)
      .setVisible(false);
    
    // Name
    const tooltipName = this.add.text(0, -tooltipHeight/2 + 20, '', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(401).setVisible(false);
    
    // Stats
    const tooltipStats = this.add.text(-tooltipWidth/2 + 15, -tooltipHeight/2 + 50, '', {
      fontSize: '12px',
      color: '#94a3b8',
      lineSpacing: 6
    }).setDepth(401).setVisible(false);
    
    this.hoverTooltip = {
      bg: tooltipBg,
      name: tooltipName,
      stats: tooltipStats,
      visible: false
    };
  }
  
  createTopBar() {
    const { width } = this.cameras.main;
    
    // Semi-transparent dark bar
    const topBar = this.add.rectangle(width / 2, 25, width, 50, 0x0f172a, 0.9);
    topBar.setDepth(300);
    
    // Round indicator
    this.roundText = this.add.text(20, 25, 'Round: 1', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(301);
    
    // Current turn indicator
    this.currentTurnText = this.add.text(width / 2, 25, '', {
      fontSize: '18px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(301);
    
    // End turn button (right side)
    const endTurnBtn = this.add.rectangle(width - 100, 25, 150, 35, 0x3b82f6)
      .setInteractive({ useHandCursor: true })
      .setDepth(301);
    
    const endTurnText = this.add.text(width - 100, 25, 'END TURN', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);
    
    endTurnBtn.on('pointerdown', () => this.handleEndTurn());
    endTurnBtn.on('pointerover', () => endTurnBtn.setFillStyle(0x2563eb));
    endTurnBtn.on('pointerout', () => endTurnBtn.setFillStyle(0x3b82f6));
    
    this.uiPanels.topBar = { topBar, roundText: this.roundText, currentTurnText: this.currentTurnText };
  }
  
  createLeftPanel() {
    const { height } = this.cameras.main;
    const panelWidth = 280;
    const panelX = panelWidth / 2;
    
    // Panel background
    const panel = this.add.rectangle(panelX, height / 2, panelWidth, height, 0x1e293b, 0.95);
    panel.setDepth(300);
    
    // Title
    const titleText = this.add.text(panelX, 80, 'CURRENT ACTOR', {
      fontSize: '16px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(301);
    
    // Actor name
    const actorName = this.add.text(panelX, 120, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(301);
    
    // Stats section
    const statsY = 160;
    const statLabels = this.add.text(30, statsY, 
      'Bala:\nDakṣatā:\nDhṛti:\nBuddhi:\nPrajñā:\nSaṃkalpa:', {
      fontSize: '13px',
      color: '#94a3b8',
      lineSpacing: 8
    }).setDepth(301);
    
    const statValues = this.add.text(panelWidth - 30, statsY, '', {
      fontSize: '13px',
      color: '#e2e8f0',
      fontStyle: 'bold',
      lineSpacing: 8,
      align: 'right'
    }).setOrigin(1, 0).setDepth(301);
    
    // Resources section
    const resourcesY = 300;
    const resourceTitle = this.add.text(panelX, resourcesY, 'RESOURCES', {
      fontSize: '14px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(301);
    
    const resourceLabels = this.add.text(30, resourcesY + 30,
      'Prāṇa:\nTapas:\nMāyā:\nSpeed:', {
      fontSize: '13px',
      color: '#94a3b8',
      lineSpacing: 8
    }).setDepth(301);
    
    const resourceValues = this.add.text(panelWidth - 30, resourcesY + 30, '', {
      fontSize: '13px',
      color: '#e2e8f0',
      fontStyle: 'bold',
      lineSpacing: 8,
      align: 'right'
    }).setOrigin(1, 0).setDepth(301);
    
    // Action economy section
    const actionsY = 450;
    const actionsTitle = this.add.text(panelX, actionsY, 'ACTIONS', {
      fontSize: '14px',
      color: '#fbbf24',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(301);
    
    const actionLabels = this.add.text(30, actionsY + 30,
      'Actions:\nBonus:\nReactions:', {
      fontSize: '13px',
      color: '#94a3b8',
      lineSpacing: 8
    }).setDepth(301);
    
    const actionValues = this.add.text(panelWidth - 30, actionsY + 30, '', {
      fontSize: '13px',
      color: '#e2e8f0',
      fontStyle: 'bold',
      lineSpacing: 8,
      align: 'right'
    }).setOrigin(1, 0).setDepth(301);
    
    this.uiPanels.leftPanel = {
      panel,
      titleText,
      actorName,
      statValues,
      resourceValues,
      actionValues
    };
  }
  
  createRightPanel() {
    const { width, height } = this.cameras.main;
    const panelWidth = 300;
    const panelX = width - panelWidth / 2;
    
    // Panel background
    const panel = this.add.rectangle(panelX, height / 2, panelWidth, height, 0x1e293b, 0.95);
    panel.setDepth(300);
    
    // Title
    const titleText = this.add.text(panelX, 80, 'ABILITIES', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(301);
    
    // Collapse/Expand tab (stays visible when collapsed)
    const tabWidth = 30;
    const tabHeight = 80;
    const collapseTab = this.add.rectangle(
      width - panelWidth - tabWidth/2, 
      height / 2, 
      tabWidth, 
      tabHeight, 
      0x334155
    ).setInteractive({ useHandCursor: true }).setDepth(301);
    
    const collapseIcon = this.add.text(
      width - panelWidth - tabWidth/2, 
      height / 2, 
      '›', {
      fontSize: '24px',
      color: '#94a3b8',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);
    
    collapseTab.on('pointerdown', () => this.toggleRightPanel());
    collapseTab.on('pointerover', () => {
      collapseTab.setFillStyle(0x475569);
      collapseIcon.setColor('#ffffff');
    });
    collapseTab.on('pointerout', () => {
      collapseTab.setFillStyle(0x334155);
      collapseIcon.setColor('#94a3b8');
    });
    
    // Ability buttons (will be populated dynamically)
    this.abilityButtons = {};
    
    this.uiPanels.rightPanel = {
      panel,
      titleText,
      collapseTab,
      collapseIcon,
      visible: true,
      collapsedX: width + panelWidth / 2,
      expandedX: panelX,
      tabCollapsedX: width - tabWidth/2,
      tabExpandedX: width - panelWidth - tabWidth/2
    };
  }
  
  createActionBar() {
  const { width, height } = this.cameras.main;
  
  // Bottom bar (simplified - no log here)
  const barHeight = 80;
  const bar = this.add.rectangle(width / 2, height - barHeight / 2, width, barHeight, 0x0f172a, 0.9);
  bar.setDepth(300);
  
  // Move mode toggle button (center)
  const moveModeBtn = this.add.rectangle(width / 2, height - barHeight / 2, 150, 40, 0x334155)
    .setInteractive({ useHandCursor: true })
    .setDepth(301);
  
  const moveModeText = this.add.text(width / 2, height - barHeight / 2, '🚶 MOVE MODE', {
    fontSize: '14px',
    color: '#94a3b8',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(302);
  
  moveModeBtn.on('pointerdown', () => this.toggleMoveMode());
  moveModeBtn.on('pointerover', () => moveModeBtn.setFillStyle(0x475569));
  moveModeBtn.on('pointerout', () => {
    moveModeBtn.setFillStyle(this.movementMode ? 0x3b82f6 : 0x334155);
  });
  
  // Camera controls hint (right side)
  this.add.text(width - 20, height - 30, 'Camera: WASD or Middle Mouse', {
    fontSize: '11px',
    color: '#64748b',
    fontStyle: 'italic'
  }).setOrigin(1, 0).setDepth(301);
  
  this.uiPanels.actionBar = { 
    bar, 
    moveModeBtn,
    moveModeText
  };
}

createCombatLogPanel() {
  const { width } = this.cameras.main;
  
  const panelWidth = 600;
  const panelHeight = 160;
  const panelX = width / 2;
  const panelY = 130;
  
  const logBg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0f172a, 0.92);
  logBg.setStrokeStyle(2, 0x334155);
  logBg.setDepth(300);
  
  const logTitle = this.add.text(panelX, panelY - panelHeight/2 + 15, '⚔️ COMBAT LOG (Scroll: ↑↓)', {
    fontSize: '13px',
    color: '#4ade80',
    fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(301);
  
  // Create mask for scrollable area
  const maskShape = this.make.graphics();
  maskShape.fillStyle(0xffffff);
  maskShape.fillRect(
    panelX - panelWidth/2 + 10,
    panelY - panelHeight/2 + 35,
    panelWidth - 20,
    panelHeight - 45
  );
  const mask = maskShape.createGeometryMask();
  
  // FIXED: Container positioned at TOP of visible area
  this.logTextContainer = this.add.container(
    panelX - panelWidth/2 + 15,
    panelY + panelHeight/2 - 10  // ← FIXED: Start from bottom, text grows upward
  );
  this.logTextContainer.setDepth(301);
  this.logTextContainer.setMask(mask);
  
  // Text anchored to BOTTOM so new lines appear at bottom
  this.logText = this.add.text(0, 0, '', {
    fontSize: '12px',
    color: '#e2e8f0',
    lineSpacing: 6,
    wordWrap: { width: panelWidth - 30 },
    fontStyle: 'normal'
  }).setOrigin(0, 1); // ← FIXED: Origin at bottom-left (0, 1)
  
  this.logTextContainer.add(this.logText);
  
  // Scroll indicators
  this.logScrollUpIndicator = this.add.text(panelX + panelWidth/2 - 25, panelY - panelHeight/2 + 40, '▲', {
    fontSize: '12px',
    color: '#64748b'
  }).setDepth(302).setVisible(false);
  
  this.logScrollDownIndicator = this.add.text(panelX + panelWidth/2 - 25, panelY + panelHeight/2 - 20, '▼', {
    fontSize: '12px',
    color: '#64748b'
  }).setDepth(302).setVisible(true);
  
  // Scroll state
  this.logScrollOffset = 0;
  this.logLineHeight = 18;
  
  // Mouse wheel scrolling
  this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
    if (pointer.x >= panelX - panelWidth/2 && pointer.x <= panelX + panelWidth/2 &&
        pointer.y >= panelY - panelHeight/2 && pointer.y <= panelY + panelHeight/2) {
      this.scrollCombatLog(deltaY > 0 ? 1 : -1);
    }
  });
  
  this.input.keyboard.on('keydown-UP', () => this.scrollCombatLog(-1));
  this.input.keyboard.on('keydown-DOWN', () => this.scrollCombatLog(1));
  
  this.uiPanels.combatLog = {
    bg: logBg,
    title: logTitle,
    text: this.logText,
    container: this.logTextContainer,
    mask: mask,
    maxVisibleLines: 6,
    scrollUpIndicator: this.logScrollUpIndicator,
    scrollDownIndicator: this.logScrollDownIndicator
  };
}


  createViewToggle() {
    const { width } = this.cameras.main;
    
    const toggleBtn = this.add.rectangle(width - 200, 80, 120, 35, 0x475569)
      .setInteractive({ useHandCursor: true })
      .setDepth(301);
    
    const toggleText = this.add.text(width - 200, 80, '2.5D / TOP', {
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(302);
    
    toggleBtn.on('pointerdown', () => {
      // Calculate center of grid before switch
      const centerGridX = this.grid.gridWidth / 2;
      const centerGridY = this.grid.gridHeight / 2;
      const oldCenterScreen = this.grid.gridToScreen(centerGridX, centerGridY);
      
      // Toggle view mode
      const newMode = this.grid.toggleView();
      toggleText.setText(newMode === 'isometric' ? '2.5D / TOP' : 'TOP / 2.5D');
      
      // Calculate new center position and adjust offset to maintain same center
      const newCenterScreen = this.grid.gridToScreen(centerGridX, centerGridY);
      const deltaX = oldCenterScreen.x - newCenterScreen.x;
      const deltaY = oldCenterScreen.y - newCenterScreen.y;
      
      this.grid.offsetX += deltaX;
      this.grid.offsetY += deltaY;
      this.cameraOffsetX += deltaX;
      this.cameraOffsetY += deltaY;
      
      // Redraw with new offset
      this.grid.renderGrid();
      this.updateAllSpritePositions();
    });
    
    this.uiPanels.viewToggle = { toggleBtn, toggleText };
  }

  scrollCombatLog(direction) {
  const maxLines = this.eventLog.length;
  const visibleLines = this.uiPanels.combatLog.maxVisibleLines;
  
  // Can't scroll if everything fits
  if (maxLines <= visibleLines) {
    this.logScrollOffset = 0;
    this.updateScrollIndicators();
    return;
  }
  
  // Update scroll offset
  this.logScrollOffset += direction;
  
  // Clamp to valid range
  const maxScroll = Math.max(0, maxLines - visibleLines);
  this.logScrollOffset = Phaser.Math.Clamp(this.logScrollOffset, 0, maxScroll);
  
  // Update text position
  this.logText.y = -this.logScrollOffset * this.logLineHeight;
  
  // Update scroll indicators
  this.updateScrollIndicators();
}

updateScrollIndicators() {
  const maxLines = this.eventLog.length;
  const visibleLines = this.uiPanels.combatLog.maxVisibleLines;
  const maxScroll = Math.max(0, maxLines - visibleLines);
  
  // Show up arrow if we can scroll up
  this.logScrollUpIndicator.setVisible(this.logScrollOffset > 0);
  
  // Show down arrow if we can scroll down
  this.logScrollDownIndicator.setVisible(this.logScrollOffset < maxScroll);
  
  // Pulse effect on indicators
  if (this.logScrollUpIndicator.visible) {
    this.tweens.add({
      targets: this.logScrollUpIndicator,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }
  
  if (this.logScrollDownIndicator.visible) {
    this.tweens.add({
      targets: this.logScrollDownIndicator,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }
}
  
  toggleRightPanel() {
    const panel = this.uiPanels.rightPanel;
    panel.visible = !panel.visible;
    
    const targetX = panel.visible ? panel.expandedX : panel.collapsedX;
    const tabTargetX = panel.visible ? panel.tabExpandedX : panel.tabCollapsedX;
    
    // Get all ability button objects
    const abilityObjs = [];
    for (const key in this.abilityButtons) {
      if (this.abilityButtons[key]) {
        abilityObjs.push(this.abilityButtons[key]);
      }
    }
    
    // Animate panel sliding
    this.tweens.add({
      targets: [panel.panel, panel.titleText, ...abilityObjs],
      x: `+=${targetX - panel.panel.x}`,
      duration: 300,
      ease: 'Power2'
    });
    
    // Animate tab separately
    this.tweens.add({
      targets: [panel.collapseTab, panel.collapseIcon],
      x: tabTargetX,
      duration: 300,
      ease: 'Power2'
    });
    
    panel.collapseIcon.setText(panel.visible ? '›' : '‹');
  }
  
updateAllSpritePositions() {
  // FIXED: Clear any active highlights before repositioning
  this.grid.clearHighlights();
  this.targetingMode = false;
  this.movementMode = false;
  
  for (const participantId in this.participantSprites) {
    const data = this.participantSprites[participantId];
    const participant = data.participant;
    const screenPos = this.grid.gridToScreen(participant.x, participant.y);
    const depth = this.grid.calculateDepth(participant.x, participant.y, 'units');
    
    data.sprite.setPosition(screenPos.x, screenPos.y).setDepth(depth);
    data.shadow.setPosition(screenPos.x, screenPos.y + 30).setDepth(depth - 0.5);
    data.nameText.setPosition(screenPos.x, screenPos.y - 45).setDepth(depth + 0.1);
    
    // FIXED: Update health bar position AND recreate to avoid overflow
    data.healthBarBg.setPosition(screenPos.x, screenPos.y + 40).setDepth(depth + 0.1);
    
    // Recreate health bar at new position with correct size
    const healthPercent = participant.getHealthPercent() / 100;
    const color = healthPercent > 0.5 ? 0x4ade80 : 
                  healthPercent > 0.25 ? 0xfbbf24 : 0xef4444;
    const barWidth = Math.max(0, Math.min(60, 60 * healthPercent));
    
    data.healthBar.destroy();
    data.healthBar = this.add.rectangle(
      screenPos.x - 30,
      screenPos.y + 40,
      barWidth,
      6,
      color
    ).setOrigin(0, 0.5).setDepth(depth + 0.1);
    
    data.screenX = screenPos.x;
    data.screenY = screenPos.y;
  }
}


  
  // ==========================================
  // COMBAT FLOW
  // ==========================================
  
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
    
    this.updateTurnDisplay();
    this.updateAbilityPanel();
    
    this.addLog(`${actor.character.name}'s turn!`);
    
    // Highlight current actor
    this.highlightCurrentActor(actor.id);
    
    // Enemy AI
    if (actor.team === 'enemy') {
      this.time.delayedCall(1000, () => {
        this.processAITurn(actor);
      });
    }
  }
  
  highlightCurrentActor(participantId) {
    // Remove all highlights
    for (const id in this.participantSprites) {
      this.participantSprites[id].sprite.setStrokeStyle(3, 0xffffff);
    }
    
    // Highlight current actor
    const sprites = this.participantSprites[participantId];
    if (sprites) {
      sprites.sprite.setStrokeStyle(4, 0xfbbf24);
    }
  }
  
  updateTurnDisplay() {
    const actor = this.gameSession.getCurrentActor();
    this.roundText.setText(`Round: ${this.gameSession.round}`);
    this.currentTurnText.setText(`${actor.character.name}'s Turn`);
    
    // Update left panel with current actor stats
    this.updateLeftPanel(actor);
  }
  
  updateLeftPanel(actor) {
    if (!actor) return;
    
    const panel = this.uiPanels.leftPanel;
    
    // Update name
    panel.actorName.setText(actor.character.name);
    
    // Update stats
    const stats = 
      `${actor.character.bala} (${actor.character.getModifier(actor.character.bala) >= 0 ? '+' : ''}${actor.character.getModifier(actor.character.bala)})\n` +
      `${actor.character.dakshata} (${actor.character.getModifier(actor.character.dakshata) >= 0 ? '+' : ''}${actor.character.getModifier(actor.character.dakshata)})\n` +
      `${actor.character.dhriti} (${actor.character.getModifier(actor.character.dhriti) >= 0 ? '+' : ''}${actor.character.getModifier(actor.character.dhriti)})\n` +
      `${actor.character.buddhi} (${actor.character.getModifier(actor.character.buddhi) >= 0 ? '+' : ''}${actor.character.getModifier(actor.character.buddhi)})\n` +
      `${actor.character.prajna} (${actor.character.getModifier(actor.character.prajna) >= 0 ? '+' : ''}${actor.character.getModifier(actor.character.prajna)})\n` +
      `${actor.character.samkalpa} (${actor.character.getModifier(actor.character.samkalpa) >= 0 ? '+' : ''}${actor.character.getModifier(actor.character.samkalpa)})`;
    panel.statValues.setText(stats);
    
    // Update resources
    const resources =
      `${actor.currentPrana}/${actor.character.maxPrana}\n` +
      `${actor.currentTapas}/${actor.character.maxTapas}\n` +
      `${actor.currentMaya}/${actor.character.maxMaya}\n` +
      `${actor.remainingSpeed}/6`;
    panel.resourceValues.setText(resources);
    
    // Update actions
    const actions =
      `${actor.actions}\n` +
      `${actor.bonusActions}\n` +
      `${actor.reactions}`;
    panel.actionValues.setText(actions);
  }
  
updateAbilityPanel() {
  const actor = this.gameSession.getCurrentActor();
  if (!actor || actor.team !== 'player') {
    for (const btnId in this.abilityButtons) {
      if (this.abilityButtons[btnId].destroy) {
        this.abilityButtons[btnId].destroy();
      }
    }
    this.abilityButtons = {};
    return;
  }
  
  const abilities = actor.character.abilities.map(id => getAbility(id)).filter(a => a);
  const { width } = this.cameras.main;
  const panelX = width - 150;
  
  for (const btnId in this.abilityButtons) {
    if (this.abilityButtons[btnId].destroy) {
      this.abilityButtons[btnId].destroy();
    }
  }
  this.abilityButtons = {};
  
  abilities.forEach((ability, index) => {
    const y = 120 + index * 60;
    const btnWidth = 260;
    const btnHeight = 50;
    
    // FIXED: Check if ability is usable
    const validation = this.abilitySystem.validateAbilityUse(actor, ability);
    const isEnabled = validation.valid;
    
    // Button background (grayed if disabled)
    const btn = this.add.rectangle(
      panelX, y, btnWidth, btnHeight, 
      isEnabled ? 0x334155 : 0x1e293b  // Darker when disabled
    ).setInteractive({ useHandCursor: isEnabled })
      .setDepth(301);
    
    if (!isEnabled) {
      btn.setAlpha(0.5); // Semi-transparent when disabled
    }
    
    // Left trim - Action type (still show color when disabled)
    const actionColor = this.getActionTypeColor(ability.actionType);
    const leftTrim = this.add.rectangle(
      panelX - btnWidth/2 + 3, y, 6, btnHeight - 4, actionColor
    ).setDepth(302).setAlpha(isEnabled ? 1 : 0.4);
    
    // Right trim - Resource type (still show color when disabled)
    const resourceColor = this.getResourceTypeColor(ability.resourceType, ability.resourceCost);
    const rightTrim = this.add.rectangle(
      panelX + btnWidth/2 - 3, y, 6, btnHeight - 4, resourceColor
    ).setDepth(302).setAlpha(isEnabled ? 1 : 0.4);
    
    // Ability name
    const nameText = this.add.text(panelX - 80, y - 10, ability.name, {
      fontSize: '14px',
      color: isEnabled ? '#ffffff' : '#64748b',  // Gray text when disabled
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setDepth(302);
    
    // Action label
    const actionLabel = this.getActionTypeLabel(ability.actionType);
    const actionText = this.add.text(panelX - 80, y + 8, actionLabel, {
      fontSize: '10px',
      color: isEnabled ? '#94a3b8' : '#475569'  // Darker gray when disabled
    }).setOrigin(0, 0.5).setDepth(302);
    
    // Resource cost
    if (ability.resourceCost > 0) {
      const costLabel = this.getResourceCostLabel(ability.resourceType, ability.resourceCost);
      const costText = this.add.text(panelX + 110, y, costLabel, {
        fontSize: '13px',
        color: isEnabled ? this.getResourceTextColor(ability.resourceType) : '#475569',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5).setDepth(302);
      
      this.abilityButtons[ability.id + '_cost'] = costText;
    }
    
    // Range indicator
    const rangeText = this.add.text(panelX + 90, y + 10, `⭘ ${ability.range}`, {
      fontSize: '9px',
      color: isEnabled ? '#64748b' : '#334155'
    }).setOrigin(1, 0.5).setDepth(302);
    
    // FIXED: Only add hover/click if enabled
    if (isEnabled) {
      btn.on('pointerover', () => {
        btn.setFillStyle(0x475569);
        leftTrim.setAlpha(1);
        rightTrim.setAlpha(1);
      });
      
      btn.on('pointerout', () => {
        btn.setFillStyle(0x334155);
        leftTrim.setAlpha(0.8);
        rightTrim.setAlpha(0.8);
      });
      
      btn.on('pointerdown', () => this.selectAbility(ability));
    } else {
      // Show tooltip on hover explaining why it's disabled
      btn.on('pointerover', () => {
        this.showDisabledTooltip(validation.message, panelX, y);
      });
      btn.on('pointerout', () => {
        this.hideDisabledTooltip();
      });
    }
    
    // Store all components
    this.abilityButtons[ability.id] = btn;
    this.abilityButtons[ability.id + '_name'] = nameText;
    this.abilityButtons[ability.id + '_action'] = actionText;
    this.abilityButtons[ability.id + '_range'] = rangeText;
    this.abilityButtons[ability.id + '_leftTrim'] = leftTrim;
    this.abilityButtons[ability.id + '_rightTrim'] = rightTrim;
  });
}

// NEW: Show tooltip for disabled abilities
showDisabledTooltip(message, x, y) {
  if (!this.disabledTooltip) {
    this.disabledTooltip = this.add.text(x, y - 35, message, {
      fontSize: '11px',
      color: '#ef4444',
      backgroundColor: '#1e293b',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setDepth(400);
  } else {
    this.disabledTooltip.setText(message);
    this.disabledTooltip.setPosition(x, y - 35);
    this.disabledTooltip.setVisible(true);
  }
}

hideDisabledTooltip() {
  if (this.disabledTooltip) {
    this.disabledTooltip.setVisible(false);
  }
}
getActionTypeColor(actionType) {
  switch(actionType) {
    case 'action': return UI_COLORS.action;           // Green
    case 'bonus_action': return UI_COLORS.bonusAction; // Red
    case 'reaction': return UI_COLORS.reaction;        // Purple
    case 'free': return UI_COLORS.free;               // Gray
    default: return 0x64748b;                          // Default gray
  }
}

getResourceTypeColor(resourceType, cost) {
  if (!resourceType || cost === 0) return 0x334155; // No resource = dark gray
  
  switch(resourceType) {
    case 'tapas': return UI_COLORS.tapas;  // Orange
    case 'maya': return UI_COLORS.maya;    // Blue
    case 'speed': return UI_COLORS.speed;  // Yellow
    case 'prana': return 0xef4444;         // Red (health cost)
    default: return 0x64748b;              // Gray
  }
}

getResourceTextColor(resourceType) {
  switch(resourceType) {
    case 'tapas': return '#fb923c';  // Light orange
    case 'maya': return '#60a5fa';   // Light blue
    case 'speed': return '#fcd34d';  // Light yellow
    case 'prana': return '#f87171';  // Light red
    default: return '#94a3b8';       // Gray
  }
}

getActionTypeLabel(actionType) {
  switch(actionType) {
    case 'action': return 'ACTION';
    case 'bonus_action': return 'BONUS ACTION';
    case 'reaction': return 'REACTION';
    case 'free': return 'FREE';
    default: return '';
  }
}

getResourceCostLabel(resourceType, cost) {
  if (!resourceType || cost === 0) return '';
  
  switch(resourceType) {
    case 'tapas': return `${cost} Tapas`;
    case 'maya': return `${cost} Māyā`;
    case 'speed': return `${cost} Speed`;
    case 'prana': return `${cost} HP`;
    default: return `${cost}`;
  }
}
  
  selectAbility(ability) {
  // Exit movement mode if entering ability mode
  if (this.movementMode) {
    this.toggleMoveMode();
  }
  
  this.selectedAbility = ability;
  this.targetingMode = true;
  this.targetingAbility = ability;
  
  const actor = this.gameSession.getCurrentActor();
  this.addLog(`Select target for ${ability.name}...`);
  
  // ✅ UPDATED: Show range including potential movement
  const maxRange = ability.range + actor.remainingSpeed;
  const validMoves = this.grid.calculateMovementRange(actor.x, actor.y, maxRange, true);
  this.grid.highlightTiles(validMoves, 0x3b82f6, 0.3);
}

  
canReachAndAttack(actor, ability, target) {
  const distance = calculateDistance(actor.x, actor.y, target.x, target.y);
  
  // Already in range - attack directly
  if (distance <= ability.range) {
    return {
      canAttack: true,
      needsMovement: false,
      movePath: null
    };
  }
  
  // Out of range - check if we can move closer
  const requiredDistance = distance - ability.range;
  
  if (requiredDistance > actor.remainingSpeed) {
    return {
      canAttack: false,
      needsMovement: false,
      message: `Out of range! Need ${requiredDistance} movement, have ${actor.remainingSpeed}.`
    };
  }
  
  // Calculate closest valid attack position
  const closestPosition = this.findClosestAttackPosition(actor, target, ability.range);
  
  if (!closestPosition) {
    return {
      canAttack: false,
      needsMovement: false,
      message: 'No valid path to target!'
    };
  }
  
  return {
    canAttack: true,
    needsMovement: true,
    movePath: closestPosition
  };
}

findClosestAttackPosition(actor, target, attackRange) {
  const validPositions = [];
  
  // Check all tiles within movement range
  for (let dx = -actor.remainingSpeed; dx <= actor.remainingSpeed; dx++) {
    for (let dy = -actor.remainingSpeed; dy <= actor.remainingSpeed; dy++) {
      const newX = actor.x + dx;
      const newY = actor.y + dy;
      
      // Check if position is valid
      if (!this.grid.isValidTile(newX, newY)) continue;
      if (this.grid.isOccupied(newX, newY)) continue;
      
      // Check if this position would be in attack range
      const distanceToTarget = calculateDistance(newX, newY, target.x, target.y);
      if (distanceToTarget <= attackRange) {
        const moveDistance = Math.abs(dx) + Math.abs(dy); // Manhattan distance
        validPositions.push({ x: newX, y: newY, distance: moveDistance });
      }
    }
  }
  
  // Sort by shortest movement distance
  validPositions.sort((a, b) => a.distance - b.distance);
  
  return validPositions.length > 0 ? validPositions[0] : null;
}

  toggleMoveMode() {
    this.movementMode = !this.movementMode;
    
    const { moveModeBtn, moveModeText } = this.uiPanels.actionBar;
    
    if (this.movementMode) {
      // Entering move mode
      this.targetingMode = false;
      this.selectedAbility = null;
      
      moveModeBtn.setFillStyle(0x3b82f6);
      moveModeText.setColor('#ffffff');
      
      const actor = this.gameSession.getCurrentActor();
      if (actor && actor.team === 'player') {
        // Show movement range
        const validMoves = this.grid.calculateMovementRange(
          actor.x, 
          actor.y, 
          actor.remainingSpeed,
          false
        );
        this.grid.highlightTiles(validMoves, 0x4ade80, 0.3);
        this.addLog(`Click a tile to move (${actor.remainingSpeed} movement remaining)`);
      }
    } else {
      // Exiting move mode
      moveModeBtn.setFillStyle(0x334155);
      moveModeText.setColor('#94a3b8');
      this.grid.clearHighlights();
    }
  }
  
moveCharacter(participant, newX, newY) {
  const oldX = participant.x;
  const oldY = participant.y;
  const distance = Math.abs(newX - oldX) + Math.abs(newY - oldY);
  
  participant.moveTo(newX, newY);
  participant.spendResource('speed', distance);
  this.grid.moveUnit(participant.id, newX, newY);
  
  const sprites = this.participantSprites[participant.id];
  if (sprites) {
    const screenPos = this.grid.gridToScreen(newX, newY);
    const newDepth = this.grid.calculateDepth(newX, newY, 'units');
    
    // Animate sprite, shadow, name, and health bar background
    this.tweens.add({
      targets: [sprites.sprite, sprites.shadow, sprites.nameText, sprites.healthBarBg],
      x: screenPos.x,
      y: (target) => {
        if (target === sprites.shadow) return screenPos.y + 30;
        if (target === sprites.nameText) return screenPos.y - 45;    // ✅ FIXED
        if (target === sprites.healthBarBg) return screenPos.y + 40; // ✅ FIXED
        return screenPos.y;
      },
      duration: 300,
      ease: 'Power2',
      onUpdate: () => {
        sprites.sprite.setDepth(newDepth);
        sprites.shadow.setDepth(newDepth - 0.5);
        
        // Update health bar position during movement
        const healthPercent = participant.getHealthPercent() / 100;
        const barWidth = Math.max(0, Math.min(60, 60 * healthPercent));
        sprites.healthBar.x = sprites.healthBarBg.x - 30 + barWidth/2;
        sprites.healthBar.y = sprites.healthBarBg.y; // ✅ This now works because healthBarBg.y is correct
      },
      onComplete: () => {
        sprites.screenX = screenPos.x;
        sprites.screenY = screenPos.y;
        
        // Recreate health bar at final position
        this.updateHealthBars();
      }
    });
    
    // ✅ REMOVED: Separate tweens for nameText and healthBarBg
    // They're now handled in the main tween above
  }
  
  this.addLog(`${participant.character.name} moved to (${newX}, ${newY})`);
  
  if (this.movementMode) {
    this.toggleMoveMode();
  }
}
  
  onCharacterClick(participantId) {
  // If in movement mode, clicking character does nothing
  if (this.movementMode) {
    return;
  }
  
  // Handle ability targeting
  if (!this.targetingMode || !this.targetingAbility) return;
  
  const actor = this.gameSession.getCurrentActor();
  const target = this.participants.find(p => p.id === participantId);
  
  if (!target) return;
  
  // ✅ NEW: Check if we can reach and attack (with auto-movement)
  const reachCheck = this.canReachAndAttack(actor, this.targetingAbility, target);
  
  if (!reachCheck.canAttack) {
    this.addLog(`❌ ${reachCheck.message}`);
    return;
  }
  
  // ✅ NEW: If we need to move first, do it automatically
  if (reachCheck.needsMovement) {
    this.addLog(`→ Auto-moving to attack position...`);
    
    // Move the character
    this.moveCharacter(actor, reachCheck.movePath.x, reachCheck.movePath.y);
    
    // Small delay for visual feedback, then attack
    setTimeout(() => {
      this.executeAbility(actor, this.targetingAbility, target);
      
      // Clear targeting
      this.grid.clearHighlights();
      this.targetingMode = false;
      this.selectedAbility = null;
    }, 350); // Wait for movement animation
  } else {
    // Already in range - attack directly
    this.executeAbility(actor, this.targetingAbility, target);
    
    // Clear targeting
    this.grid.clearHighlights();
    this.targetingMode = false;
    this.selectedAbility = null;
  }
}

  
  executeAbility(actor, ability, target) {
  const result = this.abilitySystem.executeAbility({
    actorId: actor.id,
    abilityId: ability.id,
    primaryTarget: { participantId: target.id }
  });
  
  if (result.success) {
    this.addLog(result.message);
    this.updateHealthBars();
    
    // ✅ NEW: REFRESH ABILITY PANEL after action
    this.updateAbilityPanel();
    
    // ✅ NEW: Update character panel if visible
    if (this.uiPanels.leftPanel) {
      const currentActor = this.gameSession.getCurrentActor();
      if (currentActor) {
        this.updateLeftPanel(currentActor);
      }
    }
    
    // Check for deaths
    for (const pid of result.affectedParticipants) {
      const p = this.participants.find(x => x.id === pid);
      if (p && p.status === 'downed') {
        this.handleCharacterDeath(p);
      }
    }
    
    // Check victory
    const combatResult = this.gameSession.checkCombatEnd();
    if (combatResult) {
      setTimeout(() => {
        if (combatResult === 'players_won') this.showVictory();
        else this.showDefeat();
      }, 500);
    }
  } else {
    this.addLog(`❌ ${result.message}`);
  }
}

  
  handleCharacterDeath(participant) {
    const sprites = this.participantSprites[participant.id];
    if (!sprites) return;
    
    sprites.sprite.setAlpha(0.3);
    sprites.sprite.setFillStyle(0x64748b);
    sprites.nameText.setAlpha(0.5);
    sprites.shadow.setAlpha(0.1);
    
    this.addLog(`💀 ${participant.character.name} is down!`);
  }
  
  updateHealthBars() {
  for (const pid in this.participantSprites) {
    const data = this.participantSprites[pid];
    const p = data.participant;
    const healthPercent = p.getHealthPercent() / 100;
    const color = healthPercent > 0.5 ? 0x4ade80 : 
                  healthPercent > 0.25 ? 0xfbbf24 : 0xef4444;
    
    // FIXED: Destroy and recreate with proper width clamping
    data.healthBar.destroy();
    const barWidth = Math.max(0, Math.min(60, 60 * healthPercent)); // Clamp between 0-60
    data.healthBar = this.add.rectangle(
      data.healthBarBg.x - 30,  // Start from left edge
      data.healthBarBg.y,
      barWidth,  // FIXED: Clamped width
      6,
      color
    ).setOrigin(0, 0.5).setDepth(data.healthBarBg.depth);
  }
}
  
  onCharacterHover(participantId) {
    const sprites = this.participantSprites[participantId];
    if (!sprites) return;
    
    const participant = sprites.participant;
    
    // Glow effect
    sprites.sprite.setStrokeStyle(4, 0xfbbf24);
    
    // Show tooltip for enemies or other players
    const currentActor = this.gameSession.getCurrentActor();
    if (participant.id !== currentActor?.id) {
      this.showHoverTooltip(participant, sprites.screenX, sprites.screenY);
    }
  }
  
  onCharacterHoverEnd(participantId) {
    const sprites = this.participantSprites[participantId];
    if (!sprites) return;
    
    // Reset unless it's current actor
    if (participantId !== this.currentActorId) {
      sprites.sprite.setStrokeStyle(3, 0xffffff);
    }
    
    // Hide tooltip
    this.hideHoverTooltip();
  }
  
  showHoverTooltip(participant, screenX, screenY) {
    const { width, height } = this.cameras.main;
    const tooltip = this.hoverTooltip;
    
    // Position tooltip near character (offset to avoid covering)
    let tooltipX = screenX + 150;
    let tooltipY = screenY;
    
    // Keep tooltip on screen
    if (tooltipX + 120 > width - 300) tooltipX = screenX - 150; // Avoid right panel
    if (tooltipY + 90 > height - 140) tooltipY = height - 230; // Avoid action bar
    if (tooltipY - 90 < 60) tooltipY = 150; // Avoid top bar
    
    // Update content
    tooltip.name.setText(participant.character.name);
    
    const statsText = 
      `Prāṇa: ${participant.currentPrana}/${participant.character.maxPrana}\n` +
      `Tapas: ${participant.currentTapas}/${participant.character.maxTapas}\n` +
      `Māyā: ${participant.currentMaya}/${participant.character.maxMaya}\n\n` +
      `Bala: ${participant.character.bala} (${participant.character.getModifier(participant.character.bala) >= 0 ? '+' : ''}${participant.character.getModifier(participant.character.bala)})\n` +
      `Dakṣatā: ${participant.character.dakshata} (${participant.character.getModifier(participant.character.dakshata) >= 0 ? '+' : ''}${participant.character.getModifier(participant.character.dakshata)})\n` +
      `Dhṛti: ${participant.character.dhriti} (${participant.character.getModifier(participant.character.dhriti) >= 0 ? '+' : ''}${participant.character.getModifier(participant.character.dhriti)})`;
    
    tooltip.stats.setText(statsText);
    
    // Position and show
    tooltip.bg.setPosition(tooltipX, tooltipY).setVisible(true);
    tooltip.name.setPosition(tooltipX, tooltipY - 70).setVisible(true);
    tooltip.stats.setPosition(tooltipX - 105, tooltipY - 40).setVisible(true);
    
    tooltip.visible = true;
  }
  
  hideHoverTooltip() {
    const tooltip = this.hoverTooltip;
    tooltip.bg.setVisible(false);
    tooltip.name.setVisible(false);
    tooltip.stats.setVisible(false);
    tooltip.visible = false;
  }
  
  handleEndTurn() {
    this.grid.clearHighlights();
    this.targetingMode = false;
    this.gameSession.nextTurn();
    this.startTurn();
  }
  
processAITurn(actor) {
  this.addLog(`💭 ${actor.character.name} is thinking...`);
  
  const playerTargets = this.participants.filter(p => p.team === 'player' && p.status === 'active');
  if (playerTargets.length === 0) {
    this.handleEndTurn();
    return;
  }
  
  // FIXED: Get AI's actual abilities from their class
  const aiAbilities = (actor.character.abilities || [])
    .map(id => getAbility(id))
    .filter(a => a && a.effectType === 'damage'); // Only use damage abilities for simple AI
  
  // Fallback to basic_strike if no abilities
  if (aiAbilities.length === 0) {
    aiAbilities.push(getAbility('basic_strike'));
  }
  
  // Find closest player target
  let closestTarget = playerTargets[0];
  let closestDistance = calculateDistance(actor.x, actor.y, closestTarget.x, closestTarget.y);
  
  for (const target of playerTargets) {
    const dist = calculateDistance(actor.x, actor.y, target.x, target.y);
    if (dist < closestDistance) {
      closestDistance = dist;
      closestTarget = target;
    }
  }
  
  // Try to find a usable ability
  let selectedAbility = null;
  for (const ability of aiAbilities) {
    // Check if we can afford it
    const validation = this.abilitySystem.validateAbilityUse(actor, ability);
    if (!validation.valid) continue;
    
    // Check if target is in range
    if (closestDistance <= ability.range) {
      selectedAbility = ability;
      break;
    }
  }
  
  // If we have a valid ability, use it
  if (selectedAbility) {
    setTimeout(() => {
      this.executeAbility(actor, selectedAbility, closestTarget);
      setTimeout(() => this.handleEndTurn(), 500);
    }, 800);
  } else {
    // No ability in range - try to move closer
    const moveDistance = Math.min(actor.remainingSpeed, closestDistance - 1);
    if (moveDistance > 0) {
      // Simple movement towards target
      const dx = closestTarget.x - actor.x;
      const dy = closestTarget.y - actor.y;
      const moveX = actor.x + Math.sign(dx) * Math.min(Math.abs(dx), moveDistance);
      const moveY = actor.y + Math.sign(dy) * Math.min(Math.abs(dy), moveDistance - Math.abs(moveX - actor.x));
      
      if (this.grid.isValidTile(moveX, moveY) && !this.grid.isOccupied(moveX, moveY)) {
        this.moveCharacter(actor, moveX, moveY);
      }
    }
    
    setTimeout(() => this.handleEndTurn(), 1000);
  }
}

  
  endCombat() {
    this.combatActive = false;
    const result = this.gameSession.checkCombatEnd();
    if (result === 'players_won') this.showVictory();
    else if (result === 'enemies_won') this.showDefeat();
  }
  
  showVictory() {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setDepth(400);
    
    this.add.text(width / 2, height / 2 - 60, '🏆 VICTORY! 🏆', {
      fontSize: '48px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(401);
    
    const returnBtn = this.add.rectangle(width / 2, height / 2 + 60, 200, 50, 0x3b82f6)
      .setInteractive({ useHandCursor: true })
      .setDepth(401);
    
    this.add.text(width / 2, height / 2 + 60, 'Continue', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(402);
    
    returnBtn.on('pointerdown', () => this.scene.start('MainMenu'));
  }
  
  showDefeat() {
    const { width, height } = this.cameras.main;
    
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setDepth(400);
    
    this.add.text(width / 2, height / 2 - 60, '💀 DEFEAT 💀', {
      fontSize: '48px',
      color: '#ef4444',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(401);
    
    const returnBtn = this.add.rectangle(width / 2, height / 2 + 60, 200, 50, 0xef4444)
      .setInteractive({ useHandCursor: true })
      .setDepth(401);
    
    this.add.text(width / 2, height / 2 + 60, 'Retry', {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(402);
    
    returnBtn.on('pointerdown', () => this.scene.restart());
  }
  
  addLog(message) {
  // Don't add empty messages
  if (!message || message.trim() === '') {
    return;
  }
  
  this.eventLog.push(message);
  
  const maxEntries = 20;
  if (this.eventLog.length > maxEntries) {
    this.eventLog.shift();
    if (this.logScrollOffset > 0) {
      this.logScrollOffset = Math.max(0, this.logScrollOffset - 1);
    }
  }
  
  // ✅ FIXED: Filter out empty lines and join
  const displayText = this.eventLog
    .filter(line => line && line.trim() !== '')
    .join('\n');
  
  this.logText.setText(displayText);
  
  // Calculate proper scroll to show newest at bottom
  const visibleLines = this.uiPanels.combatLog?.maxVisibleLines || 20;
  
  // ✅ FIXED: Count non-empty lines only
  const nonEmptyLines = this.eventLog.filter(line => line && line.trim() !== '').length;
  const maxScroll = Math.max(0, nonEmptyLines - visibleLines);
  
  // Auto-scroll to bottom (showing newest messages)
  this.logScrollOffset = maxScroll;
  this.logText.y = -this.logScrollOffset * this.logLineHeight;
  console.log(this.logScrollOffset)
  console.log(this.logScrollOffset)
  
  this.updateScrollIndicators();
  console.log(`[Combat Log] ${message}`);
}



}