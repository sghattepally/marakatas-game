export default class Unit {
  constructor(scene, gridX, gridY, data, gridSystem) {
    this.scene = scene;
    this.gridX = gridX;
    this.gridY = gridY;
    this.gridSystem = gridSystem;
    console.log(`Creating unit ${data.name} at (${gridX}, ${gridY})`);
    // Unit data
    this.id = data.id;
    this.name = data.name;
    this.team = data.team; // 'player' or 'enemy'
    this.hp = data.hp || 100;
    this.maxHp = data.maxHp || 100;
    this.movement = data.movement || 3;
    this.attackRange = data.attackRange || 1;
    this.damage = data.damage || 20;
    
    // State
    this.hasMoved = false;
    this.hasActed = false;
    
    // Visual representation (for now, simple circle)
    const { worldX, worldY } = this.gridSystem.gridToWorld(
      gridX,
      gridY,
      this.gridSystem.offsetX,
      this.gridSystem.offsetY
    );
    
    const circleRadius = Math.floor(gridSystem.tileSize * 0.35); // 35% of tile size

const color = this.team === 'player' ? 0x4ade80 : 
              this.team === 'enemy' ? 0xef4444 : 0x888888;
              
this.sprite = scene.add.circle(worldX, worldY, circleRadius, color);
this.sprite.setStrokeStyle(2, 0xffffff);
this.sprite.setInteractive();
this.sprite.setDepth(10);

// Scale text sizes too
const fontSize = Math.max(10, Math.floor(gridSystem.tileSize * 0.22));
const nameOffsetY = gridSystem.tileSize * 0.6;
const hpBarOffsetY = gridSystem.tileSize * 0.55;
const hpBarWidth = gridSystem.tileSize * 0.75;

this.nameText = scene.add.text(worldX, worldY - nameOffsetY, this.name, {
  fontSize: `${fontSize}px`,
  color: '#ffffff',
  backgroundColor: '#000000',
  padding: { x: 3, y: 1 }
}).setOrigin(0.5).setDepth(11);

this.hpBarBg = scene.add.rectangle(worldX, worldY + hpBarOffsetY, hpBarWidth, 5, 0x333333).setDepth(11);
this.hpBar = scene.add.rectangle(worldX - hpBarWidth/2, worldY + hpBarOffsetY, hpBarWidth, 5, 0x4ade80).setDepth(11);
this.hpBar.setOrigin(0, 0.5);
    
    // Register with grid
    gridSystem.placeUnit(this, gridX, gridY);
    
    // Click handler
    this.sprite.on('pointerdown', (pointer) => {
  pointer.event.stopPropagation(); // Prevent tile click
  
  // Check if this is an attack (clicking enemy when unit selected)
  const selectedUnit = scene.selectedUnit;
  if (selectedUnit && selectedUnit.team !== this.team && !selectedUnit.hasActed) {
    console.log('Enemy clicked, attempting attack');
    scene.events.emit('unitAttackTarget', selectedUnit, this);
  } else {
    // Normal unit selection
    scene.events.emit('unitClicked', this);
  }
});
  }

moveTo(gridX, gridY) {
  // Remove from old position
  this.gridSystem.removeUnit(this.gridX, this.gridY);
  
  // Update grid position
  this.gridX = gridX;
  this.gridY = gridY;
  
  // Register at new position
  this.gridSystem.placeUnit(this, gridX, gridY);
  
  // Animate sprite to new position
  const { worldX, worldY } = this.gridSystem.gridToWorld(
    gridX,
    gridY,
    this.gridSystem.offsetX,
    this.gridSystem.offsetY
  );
  
  const nameOffsetY = this.gridSystem.tileSize * 0.6;
  const hpBarOffsetY = this.gridSystem.tileSize * 0.55;
  const hpBarWidth = this.gridSystem.tileSize * 0.75;
  
  this.scene.tweens.add({
    targets: this.sprite,
    x: worldX,
    y: worldY,
    duration: 300,
    ease: 'Power2'
  });

  this.scene.tweens.add({
    targets: this.nameText,
    x: worldX,
    y: worldY - nameOffsetY,
    duration: 300,
    ease: 'Power2'
  });

  this.scene.tweens.add({
    targets: this.hpBarBg,
    x: worldX,
    y: worldY + hpBarOffsetY,
    duration: 300,
    ease: 'Power2'
  });

  this.scene.tweens.add({
    targets: this.hpBar,
    x: worldX - hpBarWidth/2,
    y: worldY + hpBarOffsetY,
    duration: 300,
    ease: 'Power2'
  });
  
  this.hasMoved = true;
}

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.updateHPBar();
    
    // Flash red
    this.scene.tweens.add({
      targets: this.sprite,
      fillColor: 0xff0000,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        const color = this.team === 'player' ? 0x4ade80 : 0xef4444;
        this.sprite.setFillStyle(color);
      }
    });
    
    return this.hp <= 0;
  }

  updateHPBar() {
    const hpPercent = this.hp / this.maxHp;
    this.hpBar.width = 48 * hpPercent;
    
    // Color based on HP
    if (hpPercent > 0.5) {
      this.hpBar.setFillStyle(0x4ade80);
    } else if (hpPercent > 0.25) {
      this.hpBar.setFillStyle(0xfbbf24);
    } else {
      this.hpBar.setFillStyle(0xef4444);
    }
  }

  highlight(active) {
    if (active) {
      this.sprite.setStrokeStyle(4, 0xfbbf24);
    } else {
      this.sprite.setStrokeStyle(3, 0xffffff);
    }
  }

resetTurn() {
  this.hasMoved = false;
  this.hasActed = false;
  this.remainingMovement = this.movement;
}

  destroy() {
    this.sprite.destroy();
    this.nameText.destroy();
    this.hpBarBg.destroy();
    this.hpBar.destroy();
    this.gridSystem.removeUnit(this.gridX, this.gridY);
  }
}
