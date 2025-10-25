import Phaser from 'phaser';
import GridSystem from '../systems/GridSystem';
import Unit from '../entities/Unit';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    // Initialize grid system
    this.gridSystem = new GridSystem(this, 10, 64);
    const { offsetX, offsetY } = this.gridSystem.createGrid();
    this.gridSystem.offsetX = offsetX;
    this.gridSystem.offsetY = offsetY;

    // Game state
    this.selectedUnit = null;
    this.validMoves = [];
    this.currentTurn = 'player';
    this.turnPhase = 'select'; // 'select', 'move', 'action'

    // Create units
    this.units = [];
    
    // Player units
    this.createUnit({
      id: 'kona',
      name: 'Kona',
      team: 'player',
      hp: 120,
      maxHp: 120,
      movement: 3,
      attackRange: 1,
      damage: 25
    }, 2, 2);

    this.createUnit({
      id: 'lachi',
      name: 'Lachi',
      team: 'player',
      hp: 80,
      maxHp: 80,
      movement: 3,
      attackRange: 4,
      damage: 20
    }, 3, 2);

    // Enemy units
    this.createUnit({
      id: 'guard1',
      name: 'Guard',
      team: 'enemy',
      hp: 100,
      maxHp: 100,
      movement: 2,
      attackRange: 1,
      damage: 15
    }, 7, 7);

    this.createUnit({
      id: 'guard2',
      name: 'Guard',
      team: 'enemy',
      hp: 100,
      maxHp: 100,
      movement: 2,
      attackRange: 1,
      damage: 15
    }, 8, 7);

    // UI
    this.createUI();

    // Event listeners
    this.events.on('unitClicked', this.onUnitClicked, this);
    

    this.events.on('unitAttackTarget', (attacker, target) => {
  console.log('Attack event received:', attacker.name, 'vs', target.name);
  this.attemptAttack(attacker, target);
}, this);
    
    // Tile click handler
    this.gridSystem.tiles.forEach(tile => {
      tile.on('pointerdown', () => {
        const gridX = tile.getData('gridX');
        const gridY = tile.getData('gridY');
        this.onTileClicked(gridX, gridY);
      });
    });

    // ESC to menu
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('MainMenu');
    });

    console.log('Tactical Grid Ready!');
  }

  createUnit(data, gridX, gridY) {
    const unit = new Unit(this, gridX, gridY, data, this.gridSystem);
    this.units.push(unit);
    return unit;
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

  console.log(`Selected ${unit.name} - Moved: ${unit.hasMoved}, Acted: ${unit.hasActed}, Movement: ${unit.movement}, Remaining: ${unit.remainingMovement || unit.movement}`);

  // Initialize remaining movement if not set
  if (unit.remainingMovement === undefined) {
    unit.remainingMovement = unit.movement;
  }

  // Check if unit is completely exhausted
  if (unit.remainingMovement <= 0 && unit.hasActed) {
    this.phaseText.setText(`${unit.name} has finished their turn. Select another unit or end turn.`);
    this.updateUnitInfo(unit);
    return;
  }

  // Show movement range if unit still has movement
  if (unit.remainingMovement > 0) {
    this.validMoves = this.gridSystem.calculateMovementRange(
      unit.gridX,
      unit.gridY,
      unit.remainingMovement
    );
    this.gridSystem.highlightTiles(this.validMoves, 0x1a472a);
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
    this.units.forEach(unit => {
      if (unit.team === 'player') {
        unit.resetTurn();
      }
    });

    if (this.selectedUnit) {
      this.selectedUnit.highlight(false);
      this.selectedUnit = null;
    }

    this.gridSystem.clearHighlights();
    this.currentTurn = 'enemy';
    this.turnPhase = 'select';
    this.turnText.setText('ENEMY TURN');
    this.turnText.setColor('#ef4444');
    this.phaseText.setText('Enemy is thinking...');
    this.unitInfoPanel.setVisible(false);

    // Enemy AI acts after 1 second
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
}