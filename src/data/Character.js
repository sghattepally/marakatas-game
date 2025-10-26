// src/data/Character.js
// Character and session data models for The Marakatas game
// Ported from vyuha VTT SQLAlchemy models

export class CharacterStats {
  /**
   * Core character statistics with attribute-based system
   * Attributes: Bala (strength), Dakshata (dexterity), Dhriti (constitution),
   *             Buddhi (intelligence), Prajna (wisdom), Samkalpa (charisma)
   */
  constructor(name, options = {}) {
    this.id = options.id || generateId();
    this.name = name;
    this.level = options.level || 1;
    this.race = options.race || 'Human';
    this.class = options.class || 'Chara';
    
    // Base attributes (10 is average)
    this.bala = options.bala || 10;           // Strength/Power
    this.dakshata = options.dakshata || 10;   // Dexterity/Skill
    this.dhriti = options.dhriti || 10;       // Durability/Endurance
    this.buddhi = options.buddhi || 10;       // Intellect/Reasoning
    this.prajna = options.prajna || 10;       // Wisdom/Intuition
    this.samkalpa = options.samkalpa || 10;   // Will/Determination
    
    // Derived resource pools
    this.maxPrana = this.calculateMaxPrana();
    this.maxTapas = this.calculateMaxTapas();
    this.maxMaya = this.calculateMaxMaya();
    
    // Skills and abilities
    this.abilities = options.abilities || [];
    this.inventory = options.inventory || [];
    this.equipment = options.equipment || {};
  }
  
  /**
   * Get modifier for an attribute (D&D 5e style)
   * Formula: (score - 10) / 2, rounded down
   */
  getModifier(attributeValue) {
    return Math.floor((attributeValue - 10) / 2);
  }
  
  /**
   * Calculate maximum Prana (health/life force)
   * Based on Dhriti (endurance) and Buddhi (constitution-like)
   */
  calculateMaxPrana() {
    const baseHealth = 20;
    const durabilityBonus = this.dhriti * 2;
    const constitutionBonus = this.buddhi;
    const levelBonus = (this.level - 1) * 5;
    
    return Math.max(1, baseHealth + durabilityBonus + constitutionBonus + levelBonus);
  }
  
  /**
   * Calculate maximum Tapas (physical/martial energy)
   * Based on Bala and Dakshata (strength and skill)
   */
  calculateMaxTapas() {
    const base = 10 + this.level * 2;
    const balaBonus = this.getModifier(this.bala) * 2;
    const dakshataMod = this.getModifier(this.dakshata);
    
    return Math.max(5, base + balaBonus + dakshataMod);
  }
  
  /**
   * Calculate maximum Maya (magical/mental energy)
   * Based on Buddhi and Prajna (intellect and wisdom)
   */
  calculateMaxMaya() {
    const base = 10 + this.level * 2;
    const buddhiBonus = this.getModifier(this.buddhi) * 2;
    const prajnaMod = this.getModifier(this.prajna);
    
    return Math.max(5, base + buddhiBonus + prajnaMod);
  }
  
  /**
   * Get derived skill check bonus
   * Skills are paired attributes from game_rules.py
   */
  getSkillModifier(skillName) {
    const DERIVED_SKILLS = {
      "moha": ["prajna", "samkalpa"],           // Charm / Deception
      "bhaya": ["bala", "samkalpa"],            // Intimidation
      "chhalana": ["dakshata", "buddhi"],       // Stealth / Sleight of Hand
      "anveshana": ["buddhi", "prajna"],        // Investigation
      "sahanashakti": ["dhriti", "samkalpa"],   // Resilience / Fortitude
      "yukti": ["dakshata", "prajna"],          // Tactics / Strategy
      "prerana": ["prajna", "samkalpa"],        // Performance / Inspiration
      "atindriya": ["bala", "prajna"]           // Perception / Insight
    };
    
    if (!DERIVED_SKILLS[skillName]) {
      return 0;
    }
    
    const [attr1, attr2] = DERIVED_SKILLS[skillName];
    const mod1 = this.getModifier(this[attr1]);
    const mod2 = this.getModifier(this[attr2]);
    
    // Average the two modifiers
    return Math.floor((mod1 + mod2) / 2);
  }
  
  /**
   * Determine which resource type this attribute maps to
   * (Tapas for physical, Maya for mental)
   */
  static getResourceType(attribute) {
    const ATTRIBUTE_TO_RESOURCE = {
      "bala": "tapas",
      "dakshata": "tapas",
      "dhriti": "tapas",
      "buddhi": "maya",
      "prajna": "maya",
      "samkalpa": "maya"
    };
    return ATTRIBUTE_TO_RESOURCE[attribute] || null;
  }
  
  /**
   * Recalculate derived pools (call after attribute modifications)
   */
  recalculatePools() {
    this.maxPrana = this.calculateMaxPrana();
    this.maxTapas = this.calculateMaxTapas();
    this.maxMaya = this.calculateMaxMaya();
  }
  
  /**
   * Get summary of character for display
   */
  getSummary() {
    return {
      name: this.name,
      level: this.level,
      race: this.race,
      class: this.class,
      attributes: {
        bala: this.bala,
        dakshata: this.dakshata,
        dhriti: this.dhriti,
        buddhi: this.buddhi,
        prajna: this.prajna,
        samkalpa: this.samkalpa
      },
      resources: {
        maxPrana: this.maxPrana,
        maxTapas: this.maxTapas,
        maxMaya: this.maxMaya
      }
    };
  }
}

export class SessionCharacter {
  /**
   * Runtime instance of a character in active session/combat
   * Tracks position, current resources, action economy, status effects
   */
  constructor(character, sessionId, options = {}) {
    this.id = options.id || generateId();
    this.character = character;      // Reference to CharacterStats
    this.sessionId = sessionId;
    this.team = options.team || 'player';  // 'player', 'ally', 'enemy', etc.
    
    // Position on battlefield (grid-based, 2.5D perspective)
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.z = options.z || 0;  // For 2.5D elevation
    
    // Current resource pools (depleted during combat)
    this.currentPrana = character.maxPrana;
    this.currentTapas = character.maxTapas;
    this.currentMaya = character.maxMaya;
    
    // Movement and action economy
    this.remainingSpeed = options.movementSpeed || 6;  // Grid squares per turn
    this.actions = 1;
    this.bonusActions = 1;
    this.reactions = 4;
    
    // Combat status
    this.status = 'active';  // 'active', 'downed', 'dead', 'stunned', etc.
    this.statusEffects = [];  // Array of active status effects
    
    // Combat history (for logging/UI)
    this.damageDealt = 0;
    this.damageReceived = 0;
    this.actionsTaken = [];
  }
  
  /**
   * Reset action economy at the start of a turn
   */
  reset() {
    this.actions = 1;
    this.bonusActions = 1;
    this.reactions = 4;
    this.remainingSpeed = 6;  // Full movement reset
    
    // Decay status effects with 1-turn duration
    this.statusEffects = this.statusEffects.filter(effect => {
      effect.duration -= 1;
      return effect.duration > 0;
    });
  }
  
  /**
   * Check if character can take an action of given type
   */
  canTakeAction(actionType) {
    switch(actionType) {
      case 'action':
        return this.actions > 0;
      case 'bonus_action':
        return this.bonusActions > 0;
      case 'reaction':
        return this.reactions > 0 && this.status !== 'downed';
      case 'free':
        return this.status !== 'downed';
      default:
        return false;
    }
  }
  
  /**
   * Spend an action point
   */
  spendAction(actionType) {
    if (actionType === 'action') {
      this.actions = Math.max(0, this.actions - 1);
    } else if (actionType === 'bonus_action') {
      this.bonusActions = Math.max(0, this.bonusActions - 1);
    } else if (actionType === 'reaction') {
      this.reactions = Math.max(0, this.reactions - 1);
    }
  }
  
  /**
   * Spend a resource (Prana, Tapas, Maya)
   * Returns true if successful, false if insufficient
   */
  spendResource(resourceType, amount) {
    if (resourceType === 'prana') {
      if (this.currentPrana >= amount) {
        this.currentPrana -= amount;
        return true;
      }
      return false;
    } else if (resourceType === 'tapas') {
      if (this.currentTapas >= amount) {
        this.currentTapas -= amount;
        return true;
      }
      return false;
    } else if (resourceType === 'maya') {
      if (this.currentMaya >= amount) {
        this.currentMaya -= amount;
        return true;
      }
      return false;
    } else if (resourceType === 'speed') {
      if (this.remainingSpeed >= amount) {
        this.remainingSpeed -= amount;
        return true;
      }
      return false;
    }
    return false;
  }
  
  /**
   * Restore a resource
   */
  restoreResource(resourceType, amount) {
    if (resourceType === 'prana') {
      this.currentPrana = Math.min(this.currentPrana + amount, this.character.maxPrana);
    } else if (resourceType === 'tapas') {
      this.currentTapas = Math.min(this.currentTapas + amount, this.character.maxTapas);
    } else if (resourceType === 'maya') {
      this.currentMaya = Math.min(this.currentMaya + amount, this.character.maxMaya);
    }
  }
  
  /**
   * Move character to new position
   * Returns distance moved
   */
  moveTo(newX, newY, newZ = 0) {
    const oldX = this.x;
    const oldY = this.y;
    this.x = newX;
    this.y = newY;
    this.z = newZ;
    
    // Calculate Chebyshev distance (8-directional grid)
    const distance = Math.max(
      Math.abs(newX - oldX),
      Math.abs(newY - oldY)
    );
    
    return distance;
  }
  
  /**
   * Add a temporary status effect
   */
  addStatusEffect(effectName, duration = 1) {
    // Check if effect already exists
    const existing = this.statusEffects.find(e => e.name === effectName);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
    } else {
      this.statusEffects.push({
        name: effectName,
        duration: duration,
        startedAt: Date.now()
      });
    }
  }
  
  /**
   * Remove a status effect
   */
  removeStatusEffect(effectName) {
    this.statusEffects = this.statusEffects.filter(e => e.name !== effectName);
  }
  
  /**
   * Check if character has a status effect
   */
  hasStatusEffect(effectName) {
    return this.statusEffects.some(e => e.name === effectName);
  }
  
  /**
   * Take damage to Prana (health)
   */
  takeDamage(amount) {
    const oldPrana = this.currentPrana;
    this.currentPrana = Math.max(0, this.currentPrana - amount);
    this.damageReceived += amount;
    
    // Auto-downed if Prana reaches 0
    if (this.currentPrana <= 0) {
      this.status = 'downed';
    }
    
    return oldPrana - this.currentPrana;
  }
  
  /**
   * Heal Prana
   */
  heal(amount) {
    const oldPrana = this.currentPrana;
    this.currentPrana = Math.min(this.currentPrana + amount, this.character.maxPrana);
    
    const actualHealing = this.currentPrana - oldPrana;
    
    // Wake up if healed from downed
    if (this.status === 'downed' && this.currentPrana > 0) {
      this.status = 'active';
    }
    
    return actualHealing;
  }
  
  /**
   * Get health percentage for UI display
   */
  getHealthPercent() {
    return (this.currentPrana / this.character.maxPrana) * 100;
  }
  
  /**
   * Get resource percentages for UI display
   */
  getResourcePercents() {
    return {
      prana: (this.currentPrana / this.character.maxPrana) * 100,
      tapas: (this.currentTapas / this.character.maxTapas) * 100,
      maya: (this.currentMaya / this.character.maxMaya) * 100,
      speed: (this.remainingSpeed / 6) * 100  // Assuming base speed is 6
    };
  }
  
  /**
   * Get summary for UI/logging
   */
  getSummary() {
    return {
      id: this.id,
      name: this.character.name,
      status: this.status,
      position: { x: this.x, y: this.y, z: this.z },
      resources: {
        prana: `${this.currentPrana}/${this.character.maxPrana}`,
        tapas: `${this.currentTapas}/${this.character.maxTapas}`,
        maya: `${this.currentMaya}/${this.character.maxMaya}`,
        speed: this.remainingSpeed
      },
      actionEconomy: {
        actions: this.actions,
        bonusActions: this.bonusActions,
        reactions: this.reactions
      },
      statusEffects: this.statusEffects.map(e => e.name),
      team: this.team
    };
  }
}

export class GameSession {
  /**
   * Container for active combat session
   * Manages participants, turn order, battlefield state
   */
  constructor(sessionId, options = {}) {
    this.id = sessionId;
    this.name = options.name || 'Combat Session';
    this.participants = [];  // Array of SessionCharacter
    this.turnOrder = [];     // Ordered array of participant IDs
    this.currentTurnIndex = 0;
    this.round = 0;
    
    // Map/battlefield
    this.mapWidth = options.mapWidth || 20;
    this.mapHeight = options.mapHeight || 15;
    this.environmentType = options.environmentType || 'generic';
    
    // Tracking
    this.logEntries = [];
    this.isActive = false;
  }
  
  /**
   * Add a participant to the session
   */
  addParticipant(sessionCharacter) {
    this.participants.push(sessionCharacter);
  }
  
  /**
   * Remove a participant from session
   */
  removeParticipant(participantId) {
    this.participants = this.participants.filter(p => p.id !== participantId);
    this.turnOrder = this.turnOrder.filter(id => id !== participantId);
  }
  
  /**
   * Get current acting participant
   */
  getCurrentActor() {
    if (this.turnOrder.length === 0) return null;
    return this.participants.find(p => p.id === this.turnOrder[this.currentTurnIndex]);
  }
  
  /**
   * Advance to next turn
   */
  nextTurn() {
    this.currentTurnIndex += 1;
    
    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.currentTurnIndex = 0;
      this.round += 1;
      
      // Reset all participants at round start
      for (const participant of this.participants) {
        participant.reset();
      }
    }
    
    return this.getCurrentActor();
  }
  
  /**
   * Establish turn order based on initiative (Dakshata modifier)
   */
  establishTurnOrder() {
    // Sort by Dakshata modifier (dexterity)
    const sorted = [...this.participants].sort((a, b) => {
      const modA = a.character.getModifier(a.character.dakshata);
      const modB = b.character.getModifier(b.character.dakshata);
      return modB - modA;
    });
    
    this.turnOrder = sorted.map(p => p.id);
    this.currentTurnIndex = 0;
  }
  
  /**
   * Get all participants on a specific team
   */
  getTeamMembers(teamName) {
    return this.participants.filter(p => p.team === teamName);
  }
  
  /**
   * Add entry to combat log
   */
  logEvent(eventType, details) {
    this.logEntries.push({
      timestamp: Date.now(),
      round: this.round,
      turn: this.currentTurnIndex,
      eventType: eventType,
      details: details
    });
  }
  
  /**
   * Check if combat should end (all one team downed)
   */
  checkCombatEnd() {
    const playerTeam = this.participants.filter(p => p.team === 'player' || p.team === 'ally');
    const enemyTeam = this.participants.filter(p => p.team === 'enemy');
    
    const playersActive = playerTeam.some(p => p.status === 'active');
    const enemiesActive = enemyTeam.some(p => p.status === 'active');
    
    if (!playersActive) return 'enemies_won';
    if (!enemiesActive) return 'players_won';
    return null;  // Combat continues
  }
}

/**
 * Simple ID generator for development
 * Replace with UUID library in production
 */
let idCounter = 0;
export function generateId() {
  return `id_${++idCounter}_${Date.now()}`;
}

/**
 * Factory function to create canonical Marakatas characters
 */
export const MARAKATAS_ROSTER = {
  lachi: () => new CharacterStats('Lachi', {
    race: 'Human',
    class: 'Dhanurdhara',  // Archer/Blowpipe user
    level: 5,
    bala: 11,
    dakshata: 14,
    dhriti: 12,
    buddhi: 10,
    prajna: 13,
    samkalpa: 11
  }),
  
  kona: () => new CharacterStats('Kona', {
    race: 'Human',
    class: 'Yodha',  // Warrior/Rower
    level: 5,
    bala: 15,
    dakshata: 11,
    dhriti: 13,
    buddhi: 9,
    prajna: 10,
    samkalpa: 12
  }),
  
  reddy: () => new CharacterStats('Reddy', {
    race: 'Human',
    class: 'Chara',  // Scout/Shield user
    level: 5,
    bala: 12,
    dakshata: 13,
    dhriti: 14,
    buddhi: 10,
    prajna: 11,
    samkalpa: 10
  }),
  
  gopa: () => new CharacterStats('Gopa', {
    race: 'Human',
    class: 'Yodha',
    level: 4,
    bala: 14,
    dakshata: 10,
    dhriti: 12,
    buddhi: 8,
    prajna: 9,
    samkalpa: 11
  })
};