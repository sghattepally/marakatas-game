export default class MissionManager {
  constructor(scene, missionData) {
    this.scene = scene;
    this.missionData = missionData;
    
    this.objectives = [];
    this.completedObjectives = [];
    this.turnCount = 0;
    this.missionState = 'active'; // 'active', 'victory', 'defeat'
    
    this.initializeObjectives();
  }

  initializeObjectives() {
    this.missionData.objectives.forEach(obj => {
      this.objectives.push({
        ...obj,
        completed: false,
        progress: 0
      });
    });
  }

  checkObjective(objectiveId, progress = null) {
    const objective = this.objectives.find(o => o.id === objectiveId);
    if (!objective) return;

    if (progress !== null) {
      objective.progress = progress;
    }

    // Check if objective is complete
    switch (objective.type) {
      case 'survive':
        if (this.turnCount >= objective.turns) {
          objective.completed = true;
        }
        break;
        
      case 'protect':
        // Checked elsewhere - NPC must stay alive
        break;
        
      case 'interact':
        // Updated when player interacts with target
        break;
        
      case 'defeat_all':
        // Checked when enemies defeated
        break;
    }

    if (objective.completed && !this.completedObjectives.includes(objectiveId)) {
      this.completedObjectives.push(objectiveId);
      this.scene.events.emit('objectiveCompleted', objective);
    }
  }

  checkFailureConditions(gameState) {
    for (const condition of this.missionData.failureConditions) {
      switch (condition.type) {
        case 'all_units_defeated':
          if (gameState.playerUnits.filter(u => u.hp > 0).length === 0) {
            return 'defeat';
          }
          break;
          
        case 'npc_death':
          const npc = gameState.npcs.find(n => n.id === condition.targetId);
          if (npc && npc.hp <= 0) {
            return 'defeat';
          }
          break;
          
        case 'time_limit':
          if (this.turnCount >= condition.turns) {
            return 'defeat';
          }
          break;
      }
    }
    return null;
  }

  checkVictoryConditions() {
    // All required objectives must be complete
    const requiredObjectives = this.objectives.filter(o => o.required);
    const allRequired = requiredObjectives.every(o => o.completed);
    
    if (allRequired) {
      return 'victory';
    }
    return null;
  }

  incrementTurn() {
    this.turnCount++;
    
    // Check survive objectives
    this.objectives.forEach(obj => {
      if (obj.type === 'survive') {
        this.checkObjective(obj.id);
      }
    });
  }

  getMissionProgress() {
    return {
      turnCount: this.turnCount,
      objectives: this.objectives,
      completedObjectives: this.completedObjectives,
      missionState: this.missionState
    };
  }
}