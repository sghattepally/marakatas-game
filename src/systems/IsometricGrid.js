// src/systems/IsometricGrid.js
/**
 * Isometric Grid System for The Marakatas
 * Handles coordinate conversion, depth sorting, and visual rendering
 * Inspired by Transistor's clean tactical grid
 */

export default class IsometricGrid {
  /**
   * @param {Phaser.Scene} scene - The Phaser scene
   * @param {number} gridWidth - Number of columns
   * @param {number} gridHeight - Number of rows
   * @param {object} options - Configuration options
   */
  constructor(scene, gridWidth, gridHeight, options = {}) {
    this.scene = scene;
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    
    // Isometric tile dimensions
    this.tileWidth = options.tileWidth || 64;   // Width of diamond
    this.tileHeight = options.tileHeight || 32;  // Height of diamond
    
    // Camera view mode
    this.viewMode = 'isometric'; // 'isometric' or 'topdown'
    
    // Grid offset to center the battlefield
    this.offsetX = options.offsetX || 400;
    this.offsetY = options.offsetY || 100;
    
    // Storage for grid tiles and units
    this.tiles = [];
    this.units = {}; // participantId -> {x, y, sprite}
    
    // Visual elements
    this.tileGraphics = null;
    this.highlightLayer = null;
    
    // Depth sorting groups
    this.depthLayers = {
      ground: 0,
      gridLines: 10,
      shadows: 20,
      units: 100,
      effects: 200,
      ui: 300
    };
  }
  
  /**
   * Create and render the isometric grid
   */
  createGrid() {
    this.tileGraphics = this.scene.add.graphics();
    this.highlightLayer = this.scene.add.graphics();
    
    // Create tile data structure
    for (let y = 0; y < this.gridHeight; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        const screenPos = this.gridToScreen(x, y);
        this.tiles[y][x] = {
          gridX: x,
          gridY: y,
          screenX: screenPos.x,
          screenY: screenPos.y,
          occupied: false,
          walkable: true,
          elevation: 0
        };
      }
    }
    
    this.renderGrid();
    
    return {
      width: this.gridWidth,
      height: this.gridHeight,
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight
    };
  }
  
  /**
   * Convert grid coordinates to screen coordinates
   * Uses standard isometric projection
   */
  gridToScreen(gridX, gridY) {
    if (this.viewMode === 'topdown') {
      return {
        x: this.offsetX + (gridX * this.tileWidth),
        y: this.offsetY + (gridY * this.tileHeight)
      };
    }
    
    // Isometric projection
   const screenX = this.offsetX + (gridX + gridY) * (this.tileWidth / 2);
  const screenY = this.offsetY + (gridY - gridX) * (this.tileHeight / 2);
    
    return { x: screenX, y: screenY };
  }
  
  /**
   * Convert screen coordinates to grid coordinates
   */
  screenToGrid(screenX, screenY) {
    if (this.viewMode === 'topdown') {
      const gridX = Math.floor((screenX - this.offsetX) / this.tileWidth);
      const gridY = Math.floor((screenY - this.offsetY) / this.tileHeight);
      return { x: gridX, y: gridY };
    }
    
    // Reverse isometric projection
    const relX = screenX - this.offsetX;
    const relY = screenY - this.offsetY;
    
    const gridX = Math.floor((relX / (this.tileWidth / 2) - relY / (this.tileHeight / 2)) / 2);
  const gridY = Math.floor((relX / (this.tileWidth / 2) + relY / (this.tileHeight / 2)) / 2);
  
    
    return { x: gridX, y: gridY };
  }
  
  /**
   * Calculate depth value for sorting sprites
   * Objects further back (higher x+y) should render first
   */
  calculateDepth(gridX, gridY, layer = 'units') {
    const baseDepth = this.depthLayers[layer];
    // Use grid sum for depth - higher sum = further back = lower depth
    const gridDepth = (gridX + gridY) * 0.1;
    return baseDepth + gridDepth;
  }
  
  /**
   * Render the grid tiles
   */
  renderGrid() {
    this.tileGraphics.clear();
    
    // Draw tiles back to front for proper layering
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.drawTile(x, y);
      }
    }
  }
  
  /**
   * Draw a single tile
   */
  drawTile(gridX, gridY) {
    const tile = this.tiles[gridY][gridX];
    const { x, y } = this.gridToScreen(gridX, gridY);
    
    if (this.viewMode === 'topdown') {
      // Top-down: draw squares
      this.tileGraphics.lineStyle(1, 0x4a5568, 0.5);
      this.tileGraphics.strokeRect(
        x - this.tileWidth / 2,
        y - this.tileHeight / 2,
        this.tileWidth,
        this.tileHeight
      );
      
      // Subtle fill
      this.tileGraphics.fillStyle(0x1e293b, 0.3);
      this.tileGraphics.fillRect(
        x - this.tileWidth / 2,
        y - this.tileHeight / 2,
        this.tileWidth,
        this.tileHeight
      );
    } else {
      // Isometric: draw diamond
      const halfWidth = this.tileWidth / 2;
      const halfHeight = this.tileHeight / 2;
      
      // Fill (deck wood color)
      this.tileGraphics.fillStyle(0x8b6914, 0.2);
      this.tileGraphics.beginPath();
      this.tileGraphics.moveTo(x, y - halfHeight);
      this.tileGraphics.lineTo(x + halfWidth, y);
      this.tileGraphics.lineTo(x, y + halfHeight);
      this.tileGraphics.lineTo(x - halfWidth, y);
      this.tileGraphics.closePath();
      this.tileGraphics.fillPath();
      
      // Stroke (grid lines)
      this.tileGraphics.lineStyle(1, 0x64748b, 0.4);
      this.tileGraphics.strokePath();
    }
  }
  
  /**
   * Highlight tiles (for movement range, ability range, etc.)
   */
  highlightTiles(positions, color = 0x4ade80, alpha = 0.3) {
    this.clearHighlights();
    
    for (const pos of positions) {
      const { x, y } = this.gridToScreen(pos.x, pos.y);
      
      if (this.viewMode === 'topdown') {
        this.highlightLayer.fillStyle(color, alpha);
        this.highlightLayer.fillRect(
          x - this.tileWidth / 2,
          y - this.tileHeight / 2,
          this.tileWidth,
          this.tileHeight
        );
      } else {
        const halfWidth = this.tileWidth / 2;
        const halfHeight = this.tileHeight / 2;
        
        this.highlightLayer.fillStyle(color, alpha);
        this.highlightLayer.beginPath();
        this.highlightLayer.moveTo(x, y - halfHeight);
        this.highlightLayer.lineTo(x + halfWidth, y);
        this.highlightLayer.lineTo(x, y + halfHeight);
        this.highlightLayer.lineTo(x - halfWidth, y);
        this.highlightLayer.closePath();
        this.highlightLayer.fillPath();
      }
    }
    
    this.highlightLayer.setDepth(this.depthLayers.gridLines + 1);
  }
  
  /**
   * Clear all highlights
   */
  clearHighlights() {
    this.highlightLayer.clear();
  }
  
  /**
   * Place a unit on the grid
   */
  placeUnit(participant, gridX, gridY) {
    this.units[participant.id] = {
      participant: participant,
      gridX: gridX,
      gridY: gridY,
      sprite: null
    };
    
    if (this.tiles[gridY] && this.tiles[gridY][gridX]) {
      this.tiles[gridY][gridX].occupied = true;
    }
  }
  
  /**
   * Move a unit to new position
   */
  moveUnit(participantId, newX, newY) {
    const unit = this.units[participantId];
    if (!unit) return;
    
    // Clear old position
    if (this.tiles[unit.gridY] && this.tiles[unit.gridY][unit.gridX]) {
      this.tiles[unit.gridY][unit.gridX].occupied = false;
    }
    
    // Set new position
    unit.gridX = newX;
    unit.gridY = newY;
    
    if (this.tiles[newY] && this.tiles[newY][newX]) {
      this.tiles[newY][newX].occupied = true;
    }
    
    // Update sprite position and depth
    if (unit.sprite) {
      const screenPos = this.gridToScreen(newX, newY);
      unit.sprite.setPosition(screenPos.x, screenPos.y);
      unit.sprite.setDepth(this.calculateDepth(newX, newY, 'units'));
    }
  }
  
  /**
   * Check if a tile is valid and walkable
   */
  isValidTile(gridX, gridY) {
    if (gridX < 0 || gridX >= this.gridWidth) return false;
    if (gridY < 0 || gridY >= this.gridHeight) return false;
    return this.tiles[gridY][gridX].walkable;
  }
  
  /**
   * Check if a tile is occupied
   */
  isOccupied(gridX, gridY) {
    if (!this.isValidTile(gridX, gridY)) return true;
    return this.tiles[gridY][gridX].occupied;
  }
  
  /**
   * Calculate movement range using BFS
   */
  calculateMovementRange(startX, startY, maxDistance, ignoreUnits = false) {
    const validMoves = [];
    const visited = new Set();
    const queue = [{ x: startX, y: startY, dist: 0 }];
    
    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      // Add to valid moves if within range
      if (current.dist <= maxDistance && 
          this.isValidTile(current.x, current.y) &&
          (ignoreUnits || !this.isOccupied(current.x, current.y) || 
           (current.x === startX && current.y === startY))) {
        validMoves.push({ x: current.x, y: current.y, dist: current.dist });
      }
      
      // Explore neighbors
      if (current.dist < maxDistance) {
        const neighbors = [
          { x: current.x + 1, y: current.y },
          { x: current.x - 1, y: current.y },
          { x: current.x, y: current.y + 1 },
          { x: current.x, y: current.y - 1 }
        ];
        
        for (const neighbor of neighbors) {
          if (this.isValidTile(neighbor.x, neighbor.y)) {
            queue.push({ ...neighbor, dist: current.dist + 1 });
          }
        }
      }
    }
    
    return validMoves;
  }
  
  /**
   * Toggle between isometric and top-down view
   */
  toggleView() {
    this.viewMode = this.viewMode === 'isometric' ? 'topdown' : 'isometric';
    this.renderGrid();
    
    // Update all unit positions
    for (const participantId in this.units) {
      const unit = this.units[participantId];
      if (unit.sprite) {
        const screenPos = this.gridToScreen(unit.gridX, unit.gridY);
        unit.sprite.setPosition(screenPos.x, screenPos.y);
      }
    }
    
    return this.viewMode;
  }
  
  /**
   * Destroy the grid
   */
  destroy() {
    if (this.tileGraphics) this.tileGraphics.destroy();
    if (this.highlightLayer) this.highlightLayer.destroy();
  }
}