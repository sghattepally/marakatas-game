// src/systems/AbilitySystem.js
// Core ability execution and resolution system for The Marakatas
// Ported from vyuha VTT ability_system.py

/**
 * Utility to calculate distance on grid (Chebyshev - 8-directional)
 */
export function calculateDistance(x1, y1, x2, y2) {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

/**
 * Parse dice notation like "2d6" or "1d8+3"
 */
export function parseDiceNotation(notation) {
  if (!notation) return { dice: 0, sides: 0, bonus: 0 };
  
  const match = notation.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!match) return { dice: 0, sides: 0, bonus: 0 };
  
  return {
    dice: parseInt(match[1]),
    sides: parseInt(match[2]),
    bonus: match[3] ? parseInt(match[3]) : 0
  };
}

/**
 * Roll dice and return total
 * Example: rollDice({ dice: 2, sides: 6, bonus: 3 }) -> 4-15
 */
export function rollDice(diceSpec) {
  let total = diceSpec.bonus || 0;
  for (let i = 0; i < diceSpec.dice; i++) {
    total += Phaser.Math.Between(1, diceSpec.sides);
  }
  return total;
}

export class AbilitySystem {
  /**
   * Central system for ability resolution
   * Handles validation, targeting, resource management, effect application
   * 
   * Designed to work with Phaser Scene context
   */
  constructor(scene) {
    this.scene = scene;
    this.participants = scene.participants || [];
    this.abilities = scene.abilities || [];
    this.gameSession = scene.gameSession || null;
  }
  
  // ==========================================
  // VALIDATION LAYER
  // ==========================================
  
  /**
   * Validate if an actor can use an ability
   * Returns { valid: boolean, message: string }
   */
  validateAbilityUse(actor, ability) {
    // Check if actor is downed
    if (actor.status === 'downed') {
      return {
        valid: false,
        message: `${actor.character.name} is downed and cannot act.`
      };
    }
    
    // Check action economy
    if (ability.actionType === 'action' && !actor.canTakeAction('action')) {
      return {
        valid: false,
        message: 'No actions remaining this turn.'
      };
    }
    
    if (ability.actionType === 'bonus_action' && !actor.canTakeAction('bonus_action')) {
      return {
        valid: false,
        message: 'No bonus actions remaining this turn.'
      };
    }
    
    if (ability.actionType === 'reaction' && !actor.canTakeAction('reaction')) {
      return {
        valid: false,
        message: 'No reactions remaining this turn.'
      };
    }
    
    if (ability.actionType === 'free' && actor.status === 'downed') {
      return {
        valid: false,
        message: 'Cannot take free actions while downed.'
      };
    }
    
    // Check resource costs
    if (ability.resourceCost > 0) {
      const resourceType = ability.resourceType || 'tapas';
      
      if (resourceType === 'prana' && actor.currentPrana < ability.resourceCost) {
        return {
          valid: false,
          message: `Insufficient Prana (need ${ability.resourceCost}, have ${actor.currentPrana}).`
        };
      }
      
      if (resourceType === 'tapas' && actor.currentTapas < ability.resourceCost) {
        return {
          valid: false,
          message: `Insufficient Tapas (need ${ability.resourceCost}, have ${actor.currentTapas}).`
        };
      }
      
      if (resourceType === 'maya' && actor.currentMaya < ability.resourceCost) {
        return {
          valid: false,
          message: `Insufficient Maya (need ${ability.resourceCost}, have ${actor.currentMaya}).`
        };
      }
      
      if (resourceType === 'speed' && actor.remainingSpeed < ability.resourceCost) {
        return {
          valid: false,
          message: `Insufficient movement (need ${ability.resourceCost}, have ${actor.remainingSpeed}).`
        };
      }
    }
    
    // Check movement for teleport/move abilities
    if (ability.effectType === 'teleport' && ability.resourceType !== 'speed') {
      if (actor.remainingSpeed < 1) {
        return {
          valid: false,
          message: 'No movement speed remaining this turn.'
        };
      }
    }
    
    return { valid: true, message: '' };
  }
  
  /**
   * Validate targeting for an ability
   * Returns { valid: boolean, message: string, target: SessionCharacter|null, position: {x,y}|null }
   */
  validateTargeting(actor, ability, targetInfo) {
    // Self-targeting is always valid
    if (ability.targetType === 'self') {
      return {
        valid: true,
        message: '',
        target: actor,
        position: null
      };
    }
    
    // Ground targeting (area effect)
    if (ability.targetType === 'ground') {
      if (targetInfo.x === undefined || targetInfo.y === undefined) {
        return {
          valid: false,
          message: 'Ground target requires x, y coordinates.',
          target: null,
          position: null
        };
      }
      
      const distance = calculateDistance(actor.x, actor.y, targetInfo.x, targetInfo.y);
      if (distance > ability.range) {
        return {
          valid: false,
          message: `Target location out of range (max ${ability.range} squares).`,
          target: null,
          position: null
        };
      }
      
      return {
        valid: true,
        message: '',
        target: null,
        position: { x: targetInfo.x, y: targetInfo.y }
      };
    }
    
    // Enemy/Ally targeting
    if (ability.targetType === 'enemy' || ability.targetType === 'ally') {
      if (!targetInfo.participantId) {
        return {
          valid: false,
          message: 'Must specify a target participant.',
          target: null,
          position: null
        };
      }
      
      const target = this.participants.find(p => p.id === targetInfo.participantId);
      if (!target) {
        return {
          valid: false,
          message: 'Target not found.',
          target: null,
          position: null
        };
      }
      
      // Check range
      const distance = calculateDistance(actor.x, actor.y, target.x, target.y);
      if (distance > ability.range) {
        return {
          valid: false,
          message: `Target out of range (max ${ability.range} squares).`,
          target: null,
          position: null
        };
      }
      
      // Check team alignment
      if (ability.targetType === 'enemy' && actor.team === target.team) {
        return {
          valid: false,
          message: 'Cannot target allies with this ability.',
          target: null,
          position: null
        };
      }
      
      if (ability.targetType === 'ally' && actor.team !== target.team) {
        return {
          valid: false,
          message: 'Can only target allies with this ability.',
          target: null,
          position: null
        };
      }
      
      return {
        valid: true,
        message: '',
        target: target,
        position: null
      };
    }
    
    return {
      valid: false,
      message: 'Unknown target type.',
      target: null,
      position: null
    };
  }
  
  /**
   * Check custom requirements (equipped items, attribute minimums, etc.)
   */
  validateCustomRequirements(actor, requirements) {
    if (!requirements) {
      return { valid: true, message: '' };
    }
    
    // Example: minimum attribute requirement
    if (requirements.minPrajna && actor.character.prajna < requirements.minPrajna) {
      return {
        valid: false,
        message: `Requires Prajna ${requirements.minPrajna} or higher.`
      };
    }
    
    if (requirements.minBala && actor.character.bala < requirements.minBala) {
      return {
        valid: false,
        message: `Requires Bala ${requirements.minBala} or higher.`
      };
    }
    
    // Add more requirement types as needed
    
    return { valid: true, message: '' };
  }
  
  // ==========================================
  // RESOURCE CONSUMPTION
  // ==========================================
  
  /**
   * Consume resources for ability use
   */
  consumeResources(actor, ability) {
    // Spend action point
    if (ability.actionType === 'action') {
      actor.spendAction('action');
    } else if (ability.actionType === 'bonus_action') {
      actor.spendAction('bonus_action');
    } else if (ability.actionType === 'reaction') {
      actor.spendAction('reaction');
    }
    
    // Spend resource cost
    if (ability.resourceCost > 0) {
      const resourceType = ability.resourceType || 'tapas';
      actor.spendResource(resourceType, ability.resourceCost);
    }
  }
  
  // ==========================================
  // EFFECT APPLICATION
  // ==========================================
  
  /**
   * Apply damage effect to a target
   * Returns event log entry
   */
  applyDamageEffect(actor, target, ability) {
    // Parse damage dice
    const diceSpec = parseDiceNotation(ability.damageDice);
    
    // Roll damage
    let totalDamage = rollDice(diceSpec);
    
    // Add attribute modifier if specified
    if (ability.damageAttribute) {
      const modifier = actor.character.getModifier(
        actor.character[ability.damageAttribute]
      );
      totalDamage += modifier;
    }
    
    // Apply damage to target
    const actualDamage = target.takeDamage(totalDamage);
    actor.damageDealt += actualDamage;
    
    // Log entry
    return {
      eventType: 'damage',
      actor: actor.character.name,
      target: target.character.name,
      ability: ability.name,
      damage: actualDamage,
      targetStatus: target.status,
      remainingPrana: target.currentPrana
    };
  }
  
  /**
   * Apply healing effect to a target
   * Returns event log entry
   */
  applyHealEffect(actor, target, ability) {
    // Parse healing dice (uses damageDice field)
    const diceSpec = parseDiceNotation(ability.damageDice);
    
    // Roll healing
    let totalHealing = rollDice(diceSpec);
    
    // Add attribute modifier if specified
    if (ability.damageAttribute) {
      const modifier = actor.character.getModifier(
        actor.character[ability.damageAttribute]
      );
      totalHealing += modifier;
    }
    
    // Apply healing to target
    const actualHealing = target.heal(totalHealing);
    
    // Log entry
    return {
      eventType: 'heal',
      actor: actor.character.name,
      target: target.character.name,
      ability: ability.name,
      healing: actualHealing,
      targetStatus: target.status,
      remainingPrana: target.currentPrana
    };
  }
  
  /**
   * Apply teleport/movement effect
   * Returns event log entry
   */
  applyTeleportEffect(actor, targetPosition, ability) {
    const oldPos = { x: actor.x, y: actor.y };
    
    // Calculate distance
    const distance = calculateDistance(
      actor.x, actor.y,
      targetPosition.x, targetPosition.y
    );
    
    // Check if enough speed (for movement-based teleports)
    if (ability.resourceType === 'speed' && distance > actor.remainingSpeed) {
      return {
        eventType: 'error',
        message: `Cannot move ${distance} squares with only ${actor.remainingSpeed} speed remaining.`
      };
    }
    
    // Update position
    actor.moveTo(targetPosition.x, targetPosition.y);
    
    // Consume speed if movement-based
    if (ability.resourceType === 'speed') {
      actor.spendResource('speed', distance);
    }
    
    // Apply status effect if any (e.g., invisible)
    if (ability.statusEffect) {
      actor.addStatusEffect(ability.statusEffect, 1);
    }
    
    // Log entry
    return {
      eventType: 'teleport',
      actor: actor.character.name,
      ability: ability.name,
      oldPos: oldPos,
      newPos: { x: actor.x, y: actor.y },
      statusApplied: ability.statusEffect || null
    };
  }
  
  /**
   * Get all participants within a radius (for area effects)
   */
  getParticipantsInRadius(centerX, centerY, radius) {
    return this.participants.filter(p => {
      const distance = calculateDistance(centerX, centerY, p.x, p.y);
      return distance <= radius && p.status !== 'downed';
    });
  }
  
  /**
   * Apply status effect to target
   * Returns event log entry
   */
  applyStatusEffect(actor, target, ability) {
    if (ability.statusEffect) {
      target.addStatusEffect(ability.statusEffect, 1);
    }
    
    return {
      eventType: 'status_applied',
      actor: actor.character.name,
      target: target.character.name,
      ability: ability.name,
      statusEffect: ability.statusEffect
    };
  }
  
  // ==========================================
  // MAIN EXECUTION
  // ==========================================
  
  /**
   * Execute an ability - main entry point
   * Orchestrates entire resolution pipeline
   * 
   * Request format:
   * {
   *   actorId: string,
   *   abilityId: string,
   *   primaryTarget: { participantId?: string, x?: number, y?: number },
   *   secondaryTargets?: []
   * }
   * 
   * Returns:
   * {
   *   success: boolean,
   *   message: string,
   *   logEvents: Array,
   *   affectedParticipants: Array<string>
   * }
   */
  executeAbility(request) {
    const { actorId, abilityId, primaryTarget, secondaryTargets = [] } = request;
    
    console.log(`[AbilitySystem] Executing ability ${abilityId} by actor ${actorId}`);
    console.log(`[AbilitySystem] Target info:`, primaryTarget);
    
    // Step 1: Load actor and ability
    const actor = this.participants.find(p => p.id === actorId);
    const ability = this.abilities.find(a => a.id === abilityId);
    
    if (!actor) {
      return {
        success: false,
        message: 'Actor not found.',
        logEvents: [],
        affectedParticipants: []
      };
    }
    
    if (!ability) {
      return {
        success: false,
        message: 'Ability not found.',
        logEvents: [],
        affectedParticipants: []
      };
    }
    
    // Step 2: Validate ability use
    const useValidation = this.validateAbilityUse(actor, ability);
    if (!useValidation.valid) {
      return {
        success: false,
        message: useValidation.message,
        logEvents: [],
        affectedParticipants: []
      };
    }
    
    // Step 3: Validate targeting
    const targetValidation = this.validateTargeting(actor, ability, primaryTarget);
    if (!targetValidation.valid) {
      return {
        success: false,
        message: targetValidation.message,
        logEvents: [],
        affectedParticipants: []
      };
    }
    
    // Step 4: Check custom requirements
    if (ability.requirements) {
      const reqValidation = this.validateCustomRequirements(actor, ability.requirements);
      if (!reqValidation.valid) {
        return {
          success: false,
          message: reqValidation.message,
          logEvents: [],
          affectedParticipants: []
        };
      }
    }
    
    // Step 5: Consume resources
    // Special case: teleport with speed doesn't consume until effect applied
    if (!(ability.effectType === 'teleport' && ability.resourceType === 'speed')) {
      this.consumeResources(actor, ability);
    }
    
    // Step 6: Apply effects to affected participants
    const logEvents = [];
    let affectedParticipants = [];
    
    // Handle self-targeting
    if (ability.targetType === 'self') {
      affectedParticipants = [actor.id];
      
      if (ability.effectType === 'damage') {
        // Self-damage (e.g., sacrificial ability)
        const event = this.applyDamageEffect(actor, actor, ability);
        logEvents.push(event);
      } else if (ability.effectType === 'heal') {
        const event = this.applyHealEffect(actor, actor, ability);
        logEvents.push(event);
      }
    }
    
    // Handle teleport (movement) effects
    else if (ability.effectType === 'teleport') {
      const event = this.applyTeleportEffect(actor, targetValidation.position, ability);
      logEvents.push(event);
      affectedParticipants = [actor.id];
    }
    
    // Handle ground-targeted effects
    else if (ability.targetType === 'ground') {
      const affected = this.getParticipantsInRadius(
        targetValidation.position.x,
        targetValidation.position.y,
        ability.effectRadius
      );
      
      affectedParticipants = affected.map(p => p.id);
      
      for (const target of affected) {
        if (ability.effectType === 'damage') {
          const event = this.applyDamageEffect(actor, target, ability);
          logEvents.push(event);
        } else if (ability.effectType === 'heal') {
          const event = this.applyHealEffect(actor, target, ability);
          logEvents.push(event);
        } else if (ability.effectType === 'status') {
          const event = this.applyStatusEffect(actor, target, ability);
          logEvents.push(event);
        }
      }
    }
    
    // Handle single/multiple target effects
    else if (ability.targetType === 'enemy' || ability.targetType === 'ally') {
      let affected = [];
      
      if (ability.effectRadius > 0) {
        // Area effect around target
        affected = this.getParticipantsInRadius(
          targetValidation.target.x,
          targetValidation.target.y,
          ability.effectRadius
        );
      } else {
        // Single target
        affected = [targetValidation.target];
      }
      
      affectedParticipants = affected.map(p => p.id);
      
      for (const target of affected) {
        if (ability.effectType === 'damage') {
          const event = this.applyDamageEffect(actor, target, ability);
          logEvents.push(event);
        } else if (ability.effectType === 'heal') {
          const event = this.applyHealEffect(actor, target, ability);
          logEvents.push(event);
        } else if (ability.effectType === 'status') {
          const event = this.applyStatusEffect(actor, target, ability);
          logEvents.push(event);
        }
      }
    }
    
    // Step 7: Log to session if available
    if (this.gameSession) {
      this.gameSession.logEvent('ability_used', {
        actor: actor.character.name,
        ability: ability.name,
        affectedCount: affectedParticipants.length
      });
    }
    
    return {
      success: true,
      message: `${actor.character.name} used ${ability.name}!`,
      logEvents: logEvents,
      affectedParticipants: affectedParticipants
    };
  }
}