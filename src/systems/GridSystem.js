export default class GridSystem {
  constructor(scene, gridWidth, gridHeight, tileSize = null) {
  this.scene = scene;
  this.gridWidth = gridWidth;
  this.gridHeight = gridHeight;
  console.log('GridSystem constructor called:', gridWidth, 'x', gridHeight);
  if (tileSize === null) {
    const { width, height } = scene.cameras.main;
    console.log('Screen size:', width, 'x', height);
    const maxGridWidth = width * 0.7;  // Use 70% of screen width
    const maxGridHeight = height * 0.8; // Use 80% of screen height
    
    const tileSizeByWidth = Math.floor(maxGridWidth / gridWidth);
    const tileSizeByHeight = Math.floor(maxGridHeight / gridHeight);
    console.log('Calculated tile sizes - by width:', tileSizeByWidth, 'by height:', tileSizeByHeight);
    this.tileSize = Math.min(tileSizeByWidth, tileSizeByHeight);
    this.tileSize = Math.max(this.tileSize, 40); // Minimum 40px
    this.tileSize = Math.min(this.tileSize, 80); // Maximum 80px
  } else {
    this.tileSize = tileSize;
  }
  console.log('Final tile size:', this.tileSize);

  this.tiles = [];
  this.units = new Map();
}
  createGrid() {
  const { width, height } = this.scene.cameras.main;
  const gridPixelWidth = this.gridWidth * this.tileSize;    // Use this.gridWidth
  const gridPixelHeight = this.gridHeight * this.tileSize;  // Use this.gridHeight
  const offsetX = (width - gridPixelWidth) / 2;
  const offsetY = (height - gridPixelHeight) / 2;

  console.log('Creating grid:', this.gridWidth, 'x', this.gridHeight, 'tiles');
  console.log('Pixel dimensions:', gridPixelWidth, 'x', gridPixelHeight);
  console.log('Offset:', offsetX, offsetY);

  for (let y = 0; y < this.gridHeight; y++) {
    for (let x = 0; x < this.gridWidth; x++) {
      const tile = this.scene.add.rectangle(
        offsetX + x * this.tileSize + this.tileSize / 2,
        offsetY + y * this.tileSize + this.tileSize / 2,
        this.tileSize - 2,
        this.tileSize - 2,
        0x2a2a2a
      );
      
      tile.setStrokeStyle(2, 0x444444);
      tile.setInteractive();
      tile.setData('gridX', x);
      tile.setData('gridY', y);
      
      // Hover effect
      tile.on('pointerover', () => {
        if (tile.fillColor === 0x2a2a2a) {
          tile.setFillStyle(0x3a3a3a);
        }
      });
      
      tile.on('pointerout', () => {
        if (tile.fillColor === 0x3a3a3a) {
          tile.setFillStyle(0x2a2a2a);
        }
      });
      
      this.tiles.push(tile);
    }
  }
  
  console.log('Created', this.tiles.length, 'tiles');
  
  return { offsetX, offsetY };
}

  getTileAt(gridX, gridY) {
    return this.tiles.find(tile => 
      tile.getData('gridX') === gridX && tile.getData('gridY') === gridY
    );
  }

  worldToGrid(worldX, worldY, offsetX, offsetY) {
    const gridX = Math.floor((worldX - offsetX) / this.tileSize);
    const gridY = Math.floor((worldY - offsetY) / this.tileSize);
    return { gridX, gridY };
  }

  gridToWorld(gridX, gridY, offsetX, offsetY) {
    const worldX = offsetX + gridX * this.tileSize + this.tileSize / 2;
    const worldY = offsetY + gridY * this.tileSize + this.tileSize / 2;
    return { worldX, worldY };
  }

  isValidPosition(gridX, gridY) {
  const valid = gridX >= 0 && gridX < this.gridWidth &&   // Use gridWidth
                gridY >= 0 && gridY < this.gridHeight;     // Use gridHeight
  
  console.log('isValidPosition:', gridX, gridY, '=', valid, 
              '(grid size:', this.gridWidth, 'x', this.gridHeight + ')');
  
  return valid;
}

  getPositionKey(gridX, gridY) {
    return `${gridX},${gridY}`;
  }

  isOccupied(gridX, gridY) {
    return this.units.has(this.getPositionKey(gridX, gridY));
  }

  placeUnit(unit, gridX, gridY) {
    const key = this.getPositionKey(gridX, gridY);
    this.units.set(key, unit);
  }

  removeUnit(gridX, gridY) {
    const key = this.getPositionKey(gridX, gridY);
    this.units.delete(key);
  }

  getUnitAt(gridX, gridY) {
    const key = this.getPositionKey(gridX, gridY);
    return this.units.get(key);
  }

  highlightTiles(positions, color) {
    console.log('highlightTiles called with', positions.length, 'positions, color:', color.toString(16));
  
    positions.forEach(pos => {
      const tile = this.getTileAt(pos.x, pos.y);
      if (tile) {
        tile.setFillStyle(color);
      } else {
        console.warn('No tile found at:', pos.x, pos.y);
      }
    });
  }

  clearHighlights() {
    console.log('Clearing highlights on', this.tiles.length, 'tiles');
    this.tiles.forEach(tile => {
      tile.setFillStyle(0x2a2a2a);
    });
  }

  calculateMovementRange(gridX, gridY, range) {
  console.log('calculateMovementRange called:', { gridX, gridY, range });
  console.log('Grid dimensions:', this.gridWidth, 'x', this.gridHeight);
  
  const validMoves = [];
  
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const distance = Math.abs(dx) + Math.abs(dy); // Manhattan distance
      const newX = gridX + dx;
      const newY = gridY + dy;
      
      console.log('Checking position:', newX, newY, 'distance:', distance);
      
      if (distance <= range && 
          distance > 0) { // Don't include current position
        
        const valid = this.isValidPosition(newX, newY);
        const occupied = this.isOccupied(newX, newY);
        
        console.log('  Valid:', valid, 'Occupied:', occupied);
        
        if (valid && !occupied) {
          validMoves.push({ x: newX, y: newY });
        }
      }
    }
  }
  
  console.log('calculateMovementRange returning:', validMoves.length, 'moves');
  return validMoves;
}
}
