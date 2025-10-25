import Phaser from 'phaser';
import GridSystem from '../systems/GridSystem';
import MissionManager from '../systems/MissionManager';
import Unit from '../entities/Unit';
import { MISSIONS, CHARACTERS, ENEMY_TYPES } from '../data/missions';

export default class MissionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MissionScene' });
  }

  init(data) {
    // Receive mission ID from previous scene
    this.missionId = data.missionId || 'koya_attack'; // Default for testing
    this.missionData = MISSIONS[this.missionId];
    
    console.log('Loading mission:', this.missionData.name);
  }

  create() {
    console.log('=== MISSION SCENE CREATE START ===');
  console.log('Mission ID:', this.missionId);
  console.log('Mission Data:', this.missionData);
  
  if (!this.missionData) {
    console.error('NO MISSION DATA!');
    return;
  }
  
  console.log('Map dimensions:', this.missionData.map.width, 'x', this.missionData.map.height);
  
    this.gridSystem = new GridSystem(
  this, 
  this.missionData.map.width, 
  this.missionData.map.height
  // No tile size specified - will auto-calculate
);
console.log('GridSystem created, tile size:', this.gridSystem.tileSize);
    
    const { offsetX, offsetY } = this.gridSystem.createGrid();
    this.gridSystem.offsetX = offsetX;
    this.gridSystem.offsetY = offsetY;

    // Initialize mission manager
    this.missionManager = new MissionManager(this, this.missionData);

    // Game state
    this.selectedUnit = null;
    this.validMoves = [];
    this.currentTurn = 'player';
    this.turnPhase = 'select';
    this.controlMode = this.missionData.controlMode;

    // Create units based on mission data
    this.units = [];
    this.playerUnits = [];
    this.enemyUnits = [];
    this.npcs = [];
    
    this.loadMissionUnits();
    
    // UI
    this.createUI();
    this.createObjectivesPanel();

    // Event listeners
    this.setupEventListeners();

    console.log('Mission loaded:', this.missionData.name);
    console.log('Control mode:', this.controlMode);
  }

  loadMissionUnits() {
    // Load player characters
    this.missionData.forcedCharacters.forEach(charId => {
      const charData = CHARACTERS[charId];
      const pos = this.missionData.startingPositions[charId];
      
      if (charData && pos) {
        const unit = this.createUnit(charData, pos.x, pos.y);
        this.playerUnits.push(unit);
      }
    });

    // Load NPCs if any
    if (this.missionData.npcs) {
      this.missionData.npcs.forEach(npcData => {
        const pos = this.missionData.startingPositions[npcData.id];
        const unit = this.createUnit({
          ...npcData,
          team: 'npc',
          hp: npcData.hp || 100,
          maxHp: npcData.maxHp || 100,
          movement: 0, // NPCs don't move
          attackRange: 0,
          damage: 0,
          defense: 5
        }, pos.x, pos.y);
        this.npcs.push(unit);
      });
    }

    // Load enemies
    this.missionData.enemies.forEach((enemyData, index) => {
      const enemyType = ENEMY_TYPES[enemyData.type];
      const unit = this.createUnit({
        id: `enemy_${index}`,
        name: enemyType.name,
        team: 'enemy',
        ...enemyType
      }, enemyData.x, enemyData.y);
      
      // Add special AI data
      if (enemyData.patrol) {
        unit.patrolPath = enemyData.patrol;
        unit.patrolIndex = 0;
      }
      unit.aiType = enemyType.aiType;
      
      this.enemyUnits.push(unit);
    });
  }

  createUnit(data, gridX, gridY) {
    const unit = new Unit(this, gridX, gridY, data, this.gridSystem);
    this.units.push(unit);
    return unit;
  }

  createObjectivesPanel() {
    const { width } = this.cameras.main;
    
    this.objectivesPanel = this.add.container(width - 270, 80);
    
    const panelBg = this.add.rectangle(0, 0, 250, 200, 0x1a1a1a, 0.9);
    panelBg.setOrigin(0);
    
    const titleText = this.add.text(10, 10, 'OBJECTIVES', {
      fontSize: '18px',
      color: '#4ade80',
      fontStyle: 'bold'
    });
    
    this.objectiveTexts = [];
    this.missionData.objectives.forEach((obj, index) => {
      const objText = this.add.text(10, 40 + (index * 30), '', {
        fontSize: '14px',
        color: '#ffffff'
      });
      this.objectiveTexts.push(objText);
      this.objectivesPanel.add(objText);
    });
    
    this.objectivesPanel.add([panelBg, titleText]);
    this.updateObjectivesDisplay();
  }

  updateObjectivesDisplay() {
    this.missionManager.objectives.forEach((obj, index) => {
      if (this.objectiveTexts[index]) {
        const icon = obj.completed ? '✓' : '○';
        const color = obj.completed ? '#4ade80' : '#ffffff';
        const required = obj.required ? '*' : '';
        
        let progressText = '';
        if (obj.type === 'survive') {
          progressText = ` (${this.missionManager.turnCount}/${obj.turns})`;
        }
        
        this.objectiveTexts[index].setText(`${icon} ${obj.description}${progressText}${required}`);
        this.objectiveTexts[index].setColor(color);
      }
    });
  }

  setupEventListeners() {
    this.events.on('unitClicked', this.onUnitClicked, this);
    this.events.on('unitAttackTarget', this.attemptAttack, this);
    this.events.on('objectiveCompleted', this.onObjectiveCompleted, this);
    
    this.gridSystem.tiles.forEach(tile => {
      tile.on('pointerdown', () => {
        const gridX = tile.getData('gridX');
        const gridY = tile.getData('gridY');
        this.onTileClicked(gridX, gridY);
      });
    });

    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('MainMenu');
    });
  }

  createUI() {
    const { width, height } = this.cameras.main;

    // Turn indicator
    this.turnText = this.add.text(width / 2, 20, 'PLAYER TURN', {
      fontSize: '24px',
      color: '#4ade80',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Phase indicator
    this.phaseText = this.add.text(width / 2, 50, 'Select a unit', {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // End turn button
    this.endTurnButton = this.add.text(width - 20, 20, 'END TURN', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 15, y: 8 }
    }).setOrigin(1, 0).setInteractive();

    this.endTurnButton.on('pointerover', () => {
      this.endTurnButton.setStyle({ backgroundColor: '#4ade80', color: '#000000' });
    });

    this.endTurnButton.on('pointerout', () => {
      this.endTurnButton.setStyle({ backgroundColor: '#333333', color: '#ffffff' });
    });

    this.endTurnButton.on('pointerdown', () => {
      this.endPlayerTurn();
    });

    // Selected unit info panel
    this.unitInfoPanel = this.add.container(20, height - 150);
    this.unitInfoPanel.setVisible(false);
    
    const panelBg = this.add.rectangle(0, 0, 250, 120, 0x1a1a1a, 0.9);
    panelBg.setOrigin(0);
    
    this.unitNameText = this.add.text(10, 10, '', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    
    this.unitHPText = this.add.text(10, 40, '', {
      fontSize: '16px',
      color: '#ffffff'
    });
    
    this.unitStatsText = this.add.text(10, 65, '', {
      fontSize: '14px',
      color: '#cccccc'
    });

    this.unitInfoPanel.add([panelBg, this.unitNameText, this.unitHPText, this.unitStatsText]);
  }

attemptAttack(attacker, target) {
  if (attacker.hasActed) {
    console.log('Attacker has already acted');
    return;
  }

  const distance = Math.abs(target.gridX - attacker.gridX) +
                  Math.abs(target.gridY - attacker.gridY);
  
  console.log(`Attempt attack - Distance: ${distance}, Range: ${attacker.attackRange}`);
  
  if (distance <= attacker.attackRange) {
    this.attackUnit(attacker, target);
  } else {
    this.phaseText.setText(`Too far! Distance: ${distance}, Range: ${attacker.attackRange}`);
  }
}


onUnitClicked(unit) {
    console.log('=== UNIT CLICKED ===');
  console.log('Unit:', unit.name, 'Team:', unit.team, 'Current Turn:', this.currentTurn);
  
  if (this.currentTurn !== unit.team) {
    console.log('Not this unit\'s turn');
    
    // Show enemy info when clicking them
    if (unit.team === 'enemy') {
      this.updateUnitInfo(unit);
    }
    return;
  }
  
  // Deselect previous
  if (this.selectedUnit) {
    this.selectedUnit.highlight(false);
    this.gridSystem.clearHighlights();
  }

  // Select new unit
  this.selectedUnit = unit;
  unit.highlight(true);

  console.log(`Selected ${unit.name} - Moved: ${unit.hasMoved}, Acted: ${unit.hasActed}`);
  console.log('Remaining movement:', unit.remainingMovement, 'Total movement:', unit.movement);


  // Initialize remaining movement if not set
  if (unit.remainingMovement === undefined) {
    unit.remainingMovement = unit.movement;
    console.log('Initialized remaining movement to:', unit.remainingMovement);
  }

  // Check if unit is completely exhausted
  if (unit.remainingMovement <= 0 && unit.hasActed) {
    this.phaseText.setText(`${unit.name} has finished their turn. Select another unit or end turn.`);
    this.updateUnitInfo(unit);
    return;
  }

  // Show movement range if unit still has movement
  if (unit.remainingMovement > 0) {
     console.log('Calculating movement range from:', unit.gridX, unit.gridY, 'with range:', unit.remainingMovement);
    
    this.validMoves = this.gridSystem.calculateMovementRange(
      unit.gridX,
      unit.gridY,
      unit.remainingMovement
    );
    console.log('Valid moves calculated:', this.validMoves.length, 'positions');
    console.log('Valid moves:', this.validMoves);
    this.gridSystem.highlightTiles(this.validMoves, 0x1a472a);
    console.log('Tiles highlighted');
    this.turnPhase = 'move';
    this.phaseText.setText(`Movement: ${unit.remainingMovement} remaining. Click tile to move or enemy to attack`);
    
    // Also show attack range
    this.showAttackRange();
  } else if (!unit.hasActed) {
    this.turnPhase = 'action';
    this.phaseText.setText('No movement left. Click an enemy to attack or end turn.');
    this.showAttackRange();
  }

  // Update UI
  this.updateUnitInfo(unit);
}

onTileClicked(gridX, gridY) {
  if (!this.selectedUnit) return;

  const target = this.gridSystem.getUnitAt(gridX, gridY);

  // Check if clicking on an enemy (attack action)
  if (target && target.team !== this.selectedUnit.team && !this.selectedUnit.hasActed) {
    const distance = Math.abs(target.gridX - this.selectedUnit.gridX) +
                    Math.abs(target.gridY - this.selectedUnit.gridY);
    
    console.log(`Attempting attack - Distance: ${distance}, Attack Range: ${this.selectedUnit.attackRange}`);
    
    if (distance <= this.selectedUnit.attackRange) {
      this.attackUnit(this.selectedUnit, target);
    } else {
      console.log('Target out of range!');
    }
    return;
  }

  // Otherwise, try to move
  if (this.selectedUnit.remainingMovement > 0) {
    const isValidMove = this.validMoves.some(m => m.x === gridX && m.y === gridY);
    
    if (isValidMove) {
      // Calculate distance of this move
      const moveDistance = Math.abs(gridX - this.selectedUnit.gridX) +
                          Math.abs(gridY - this.selectedUnit.gridY);
      
      console.log(`Moving ${moveDistance} tiles`);
      
      this.selectedUnit.moveTo(gridX, gridY);
      
      // Reduce remaining movement
      this.selectedUnit.remainingMovement -= moveDistance;
      
      if (this.selectedUnit.remainingMovement <= 0) {
        this.selectedUnit.hasMoved = true;
      }
      
      this.gridSystem.clearHighlights();
      
      // Reselect the unit to show updated ranges
      this.time.delayedCall(320, () => {
        this.onUnitClicked(this.selectedUnit);
      });
    }
  }
}

showAttackRange() {
  const attackTiles = [];
  const { gridX, gridY } = this.selectedUnit;
  const range = this.selectedUnit.attackRange;

  console.log(`Showing attack range for ${this.selectedUnit.name} at (${gridX}, ${gridY}) with range ${range}`);

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const distance = Math.abs(dx) + Math.abs(dy);
      const newX = gridX + dx;
      const newY = gridY + dy;
      
      if (distance <= range && distance > 0 &&
          this.gridSystem.isValidPosition(newX, newY)) {
        
        const target = this.gridSystem.getUnitAt(newX, newY);
        if (target && target.team !== this.selectedUnit.team) {
          console.log(`Found enemy ${target.name} at (${newX}, ${newY})`);
          attackTiles.push({ x: newX, y: newY });
        }
      }
    }
  }

  console.log(`Found ${attackTiles.length} attackable tiles`);
  this.gridSystem.highlightTiles(attackTiles, 0x4a1a1a);
}

attackUnit(attacker, target) {
  console.log(`${attacker.name} attacks ${target.name} for ${attacker.damage} damage!`);
  
  const isDead = target.takeDamage(attacker.damage);
  attacker.hasActed = true;

  // Show damage number
  this.showDamageNumber(target.sprite.x, target.sprite.y, attacker.damage);

  if (isDead) {
    console.log(`${target.name} has been defeated!`);
    this.units = this.units.filter(u => u !== target);
    this.time.delayedCall(500, () => {
      target.destroy();
      this.checkVictoryConditions();
    });
  }

  // Deselect
  attacker.highlight(false);
  this.gridSystem.clearHighlights();
  this.selectedUnit = null;
  this.turnPhase = 'select';
  this.phaseText.setText('Select a unit');
  this.unitInfoPanel.setVisible(false);
}

showDamageNumber(x, y, damage) {
  const damageText = this.add.text(x, y - 30, `-${damage}`, {
    fontSize: '24px',
    color: '#ff0000',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4
  }).setOrigin(0.5);

  this.tweens.add({
    targets: damageText,
    y: y - 60,
    alpha: 0,
    duration: 1000,
    ease: 'Power2',
    onComplete: () => damageText.destroy()
  });
}

updateUnitInfo(unit) {
  this.unitNameText.setText(unit.name);
  this.unitHPText.setText(`HP: ${unit.hp}/${unit.maxHp}`);
  
  const remainingMove = unit.remainingMovement !== undefined ? unit.remainingMovement : unit.movement;
  
  this.unitStatsText.setText(
    `Move: ${remainingMove}/${unit.movement} | Range: ${unit.attackRange} | Dmg: ${unit.damage}\n` +
    `${unit.hasMoved ? '✓ Moved' : '○ Moving'} | ${unit.hasActed ? '✓ Acted' : '○ Can Act'}`
  );
  this.unitInfoPanel.setVisible(true);
}

  endPlayerTurn() {
    // Reset player units
    this.playerUnits.forEach(unit => {
      if (unit.hp > 0) {
        unit.resetTurn();
      }
    });

    if (this.selectedUnit) {
      this.selectedUnit.highlight(false);
      this.selectedUnit = null;
    }

    this.gridSystem.clearHighlights();
    
    // Increment turn counter
    this.missionManager.incrementTurn();
    this.updateObjectivesDisplay();
    
    // Check victory/defeat
    const victory = this.missionManager.checkVictoryConditions();
    if (victory) {
      this.showVictory();
      return;
    }
    
    const defeat = this.missionManager.checkFailureConditions({
      playerUnits: this.playerUnits,
      npcs: this.npcs
    });
    if (defeat) {
      this.showDefeat();
      return;
    }

    // Start enemy turn
    this.currentTurn = 'enemy';
    this.turnPhase = 'select';
    this.turnText.setText(`ENEMY TURN - Turn ${this.missionManager.turnCount}`);
    this.turnText.setColor('#ef4444');
    this.phaseText.setText('Enemy is thinking...');
    this.unitInfoPanel.setVisible(false);

    this.time.delayedCall(1000, () => {
      this.performEnemyTurn();
    });
  }
  performEnemyTurn() {
    const enemies = this.units.filter(u => u.team === 'enemy' && u.hp > 0);
    const players = this.units.filter(u => u.team === 'player' && u.hp > 0);

    if (players.length === 0) {
      this.showDefeat();
      return;
    }

    let actionsPerformed = 0;

    enemies.forEach((enemy, index) => {
      this.time.delayedCall(1000 * (index + 1), () => {
        // Find closest player
        let closest = null;
        let minDistance = Infinity;

        players.forEach(player => {
          const distance = Math.abs(player.gridX - enemy.gridX) +
                          Math.abs(player.gridY - enemy.gridY);
          if (distance < minDistance) {
            minDistance = distance;
            closest = player;
          }
        });

        if (!closest) return;

        // If in attack range, attack
        if (minDistance <= enemy.attackRange) {
          this.attackUnit(enemy, closest);
        } else {
          // Move toward player
          const dx = Math.sign(closest.gridX - enemy.gridX);
          const dy = Math.sign(closest.gridY - enemy.gridY);
          
          let newX = enemy.gridX + dx;
          let newY = enemy.gridY + dy;

          // Check if position is valid and not occupied
          if (this.gridSystem.isValidPosition(newX, newY) && 
              !this.gridSystem.isOccupied(newX, newY)) {
            enemy.moveTo(newX, newY);
          }
        }

        actionsPerformed++;

        // End enemy turn after all enemies acted
        if (actionsPerformed === enemies.length) {
          this.time.delayedCall(500, () => {
            this.startPlayerTurn();
          });
        }
      });
    });
  }

  startPlayerTurn() {
    this.currentTurn = 'player';
    this.turnPhase = 'select';
    this.turnText.setText('PLAYER TURN');
    this.turnText.setColor('#4ade80');
    this.phaseText.setText('Select a unit');
  }

  checkVictoryConditions() {
    const enemies = this.units.filter(u => u.team === 'enemy' && u.hp > 0);
    const players = this.units.filter(u => u.team === 'player' && u.hp > 0);

    if (enemies.length === 0) {
      this.time.delayedCall(1000, () => {
        this.showVictory();
      });
    } else if (players.length === 0) {
      this.time.delayedCall(1000, () => {
        this.showDefeat();
      });
    }
  }

  showVictory() {
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    ).setDepth(1000);

    const victoryText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'VICTORY!',
      {
        fontSize: '64px',
        color: '#4ade80',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(1001);

    const continueText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'Click to continue',
      {
        fontSize: '24px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setDepth(1001).setInteractive();

    continueText.on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }

  showDefeat() {
    const overlay = this.add.rectangle(
      this.cameras.main.centerX,
      this.cameras.main.centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    ).setDepth(1000);

    const defeatText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 50,
      'DEFEAT',
      {
        fontSize: '64px',
        color: '#ef4444',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(1001);

    const retryText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY + 50,
      'Click to retry',
      {
        fontSize: '24px',
        color: '#ffffff'
      }
    ).setOrigin(0.5).setDepth(1001).setInteractive();

    retryText.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  onObjectiveCompleted(objective) {
    console.log('Objective completed:', objective.description);
    
    // Show notification
    const notification = this.add.text(
      this.cameras.main.centerX,
      100,
      `✓ ${objective.description}`,
      {
        fontSize: '24px',
        color: '#4ade80',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5).setDepth(1000);

    this.tweens.add({
      targets: notification,
      y: 60,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => notification.destroy()
    });
  }

  
}