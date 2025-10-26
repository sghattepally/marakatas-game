// src/data/abilities.js
// Canonical ability definitions for The Marakatas
// Based on character descriptions from the novel

export const ABILITY_DATABASE = {
 'basic_move': {
  id: 'basic_move',
  name: 'Move',
  description: 'Move up to your remaining Speed on the battlefield',
  actionType: 'free',
  targetType: 'ground',
  effectType: 'teleport',
  range: 'speed',  // ← Special: uses actor's remaining speed, not fixed range
  effectRadius: 0,
  resourceType: null,
  resourceCost: 0,
  requirements: null
},
  
    // Lachi's Abilities (Dhanurdhara - Blowpipe Specialist)
  'blowpipe_shot': {
    id: 'blowpipe_shot',
    name: 'Blowpipe Shot',
    description: 'Fire a dart from blowpipe at a target',
    actionType: 'action',
    targetType: 'enemy',
    effectType: 'damage',
    damageDice: '1d8',
    damageAttribute: 'dakshata',
    range: 8,
    effectRadius: 0,
    resourceType: null,
    resourceCost: 0,
    requirements: null
  },
  
  'rapid_fire': {
    id: 'rapid_fire',
    name: 'Rapid Fire',
    description: 'Fire multiple darts in quick succession',
    actionType: 'action',
    targetType: 'enemy',
    effectType: 'damage',
    damageDice: '2d6',
    damageAttribute: 'dakshata',
    range: 6,
    effectRadius: 0,
    resourceType: 'tapas',
    resourceCost: 3,
    requirements: null
  },
  
  'precision_shot': {
    id: 'precision_shot',
    name: 'Precision Shot',
    description: 'A carefully aimed shot for increased accuracy and damage',
    actionType: 'bonus_action',
    targetType: 'enemy',
    effectType: 'damage',
    damageDice: '1d10+2',
    damageAttribute: 'dakshata',
    range: 10,
    effectRadius: 0,
    resourceType: 'maya',
    resourceCost: 2,
    requirements: { minPrajna: 12 }
  },
  
  'scatter_shot': {
    id: 'scatter_shot',
    name: 'Scatter Shot',
    description: 'Fire darts in an area to hit multiple targets',
    actionType: 'action',
    targetType: 'ground',
    effectType: 'damage',
    damageDice: '1d6',
    damageAttribute: 'dakshata',
    range: 8,
    effectRadius: 2,
    resourceType: 'tapas',
    resourceCost: 2,
    requirements: null
  },
  
  // Kona's Abilities (Yodha - Warrior/Rower)
  'basic_strike': {
    id: 'basic_strike',
    name: 'Basic Strike',
    description: 'A straightforward melee attack',
    actionType: 'action',
    targetType: 'enemy',
    effectType: 'damage',
    damageDice: '1d8',
    damageAttribute: 'bala',
    range: 1,
    effectRadius: 0,
    resourceType: null,
    resourceCost: 0,
    requirements: null
  },
  
  'power_attack': {
    id: 'power_attack',
    name: 'Power Attack',
    description: 'A devastating blow that costs a bonus action',
    actionType: 'bonus_action',
    targetType: 'enemy',
    effectType: 'damage',
    damageDice: '2d8+2',
    damageAttribute: 'bala',
    range: 1,
    effectRadius: 0,
    resourceType: 'tapas',
    resourceCost: 3,
    requirements: null
  },
  
  'intimidating_shout': {
    id: 'intimidating_shout',
    name: 'Intimidating Shout',
    description: 'Intimidate enemies in a radius',
    actionType: 'action',
    targetType: 'ground',
    effectType: 'status',
    range: 5,
    effectRadius: 3,
    resourceType: 'tapas',
    resourceCost: 1,
    statusEffect: 'frightened',
    requirements: null
  },
  
  'defensive_stance': {
    id: 'defensive_stance',
    name: 'Defensive Stance',
    description: 'Enter a defensive position, reducing incoming damage',
    actionType: 'free',
    targetType: 'self',
    effectType: 'status',
    range: 0,
    effectRadius: 0,
    resourceType: null,
    resourceCost: 0,
    statusEffect: 'defended',
    requirements: null
  },
  
  // Reddy's Abilities (Chara - Shield/Scout)
  'shield_bash': {
    id: 'shield_bash',
    name: 'Shield Bash',
    description: 'Bash with shield to damage and push back',
    actionType: 'action',
    targetType: 'enemy',
    effectType: 'damage',
    damageDice: '1d6',
    damageAttribute: 'bala',
    range: 1,
    effectRadius: 0,
    resourceType: null,
    resourceCost: 0,
    requirements: null
  },
  
  'shield_ward': {
    id: 'shield_ward',
    name: 'Shield Ward',
    description: 'Raise shield to protect self and nearby allies',
    actionType: 'reaction',
    targetType: 'self',
    effectType: 'status',
    range: 0,
    effectRadius: 2,
    resourceType: 'tapas',
    resourceCost: 2,
    statusEffect: 'shielded',
    requirements: null
  },
  
  'quick_movement': {
    id: 'quick_movement',
    name: 'Quick Movement',
    description: 'Move rapidly across the battlefield',
    actionType: 'bonus_action',
    targetType: 'ground',
    effectType: 'teleport',
    range: 6,
    effectRadius: 0,
    resourceType: 'speed',
    resourceCost: 0,
    requirements: null
  },
  
  // Universal/Support Abilities
  'first_aid': {
    id: 'first_aid',
    name: 'First Aid',
    description: 'Provide medical assistance to restore Prana',
    actionType: 'action',
    targetType: 'ally',
    effectType: 'heal',
    damageDice: '1d8+2',
    damageAttribute: 'buddhi',
    range: 2,
    effectRadius: 0,
    resourceType: null,
    resourceCost: 0,
    requirements: null
  },
  
  'healing_herbs': {
    id: 'healing_herbs',
    name: 'Healing Herbs',
    description: 'Use medicinal herbs to heal wounds',
    actionType: 'action',
    targetType: 'ally',
    effectType: 'heal',
    damageDice: '2d6+1',
    damageAttribute: 'buddhi',
    range: 3,
    effectRadius: 0,
    resourceType: 'maya',
    resourceCost: 2,
    requirements: null
  },
  
  'tactical_repositioning': {
    id: 'tactical_repositioning',
    name: 'Tactical Repositioning',
    description: 'Move to a better position on the battlefield',
    actionType: 'free',
    targetType: 'ground',
    effectType: 'teleport',
    range: 5,
    effectRadius: 0,
    resourceType: 'speed',
    resourceCost: 0,
    requirements: null
  }
};

/**
 * Ability sets for each character class
 */
export const CLASS_ABILITIES = {
  'Dhanurdhara': [  // Archer/Marksman
    'basic_move', 
    'blowpipe_shot',
    'rapid_fire',
    'precision_shot',
    'scatter_shot',
    'tactical_repositioning'
  ],
  'Yodha': [        // Warrior
    'basic_move', 
    'basic_strike',
    'power_attack',
    'intimidating_shout',
    'defensive_stance',
    'first_aid'
  ],
  'Chara': [        // Scout/Defender
    'basic_move', 
    'shield_bash',
    'shield_ward',
    'quick_movement',
    'tactical_repositioning',
    'first_aid'
  ],
  'Rishi': [        // Mystic/Healer
    'basic_move', 
    'healing_herbs',
    'tactical_repositioning',
    'first_aid'
  ]
};

// =====================================================
// MISSION DATA
// =====================================================

export const MISSIONS = {
  'merchant_ship_heist': {
    id: 'merchant_ship_heist',
    name: 'The Merchant Ship Heist',
    description: 'Four nights ago... The Marakatas plan a daring midnight raid on a merchant vessel off the coast of Masuli.',
    novelChapter: 13,
    mapWidth: 20,
    mapHeight: 15,
    environmentType: 'ship_deck',
    objective: 'Neutralize merchant crew without sinking the ship',
    turnLimit: null,  // No turn limit
    
    // Player-controlled party
    playerParty: [
      {
        character: 'lachi',
        startX: 2,
        startY: 7,
        role: 'ranged damage'
      },
      {
        character: 'kona',
        startX: 3,
        startY: 7,
        role: 'melee damage'
      },
      {
        character: 'reddy',
        startX: 2,
        startY: 8,
        role: 'tank/support'
      },
      {
        character: 'gopa',
        startX: 3,
        startY: 8,
        role: 'melee damage'
      }
    ],
    
    // Enemy encounter
    enemies: [
      {
        name: 'Merchant Guard A',
        class: 'Yodha',
        level: 3,
        startX: 15,
        startY: 6,
        attributes: {
          bala: 12,
          dakshata: 10,
          dhriti: 11,
          buddhi: 9,
          prajna: 9,
          samkalpa: 10
        },
        team: 'enemy'
      },
      {
        name: 'Merchant Guard B',
        class: 'Yodha',
        level: 3,
        startX: 16,
        startY: 8,
        attributes: {
          bala: 11,
          dakshata: 11,
          dhriti: 12,
          buddhi: 8,
          prajna: 8,
          samkalpa: 9
        },
        team: 'enemy'
      },
      {
        name: 'Ship Captain',
        class: 'Yodha',
        level: 4,
        startX: 17,
        startY: 7,
        attributes: {
          bala: 13,
          dakshata: 12,
          dhriti: 13,
          buddhi: 10,
          prajna: 10,
          samkalpa: 11
        },
        team: 'enemy'
      }
    ],
    
    // Victory/Defeat conditions
    victoryConditions: [
      'all_enemies_downed'  // Defeat all enemies without allies being downed
    ],
    
    defeatConditions: [
      'all_players_downed'  // All player characters downed
    ],
    
    // Story events that trigger during mission
    storyEvents: [
      {
        trigger: 'turn_5',
        text: 'Lachi takes a blow to the head and collapses to the deck...'
      },
      {
        trigger: 'any_enemy_downed',
        text: 'The guards shout for backup!'
      }
    ],
    
    // Reward/consequences
    rewards: {
      experience: 500,
      gold: 200,
      narrative: 'The merchant vessel secured. Now to escape...'
    },
    
    failureConsequences: {
      experience: 100,
      narrative: 'The guards overwhelmed the Marakatas. A dangerous setback.'
    }
  },
  
  'protecting_lachi': {
    id: 'protecting_lachi',
    name: 'Protecting Lachi',
    description: 'Lachi is hurt and vulnerable. The Marakatas must defend her while she recovers.',
    novelChapter: 13,
    mapWidth: 18,
    mapHeight: 12,
    environmentType: 'ship_cabin',
    objective: 'Protect Lachi for 8 rounds',
    turnLimit: 8,
    
    playerParty: [
      {
        character: 'kona',
        startX: 5,
        startY: 5,
        role: 'defender'
      },
      {
        character: 'reddy',
        startX: 4,
        startY: 6,
        role: 'protector'
      },
      {
        character: 'gopa',
        startX: 6,
        startY: 6,
        role: 'attacker'
      }
    ],
    
    // Lachi is downed at start - must be protected
    protectedUnit: {
      character: 'lachi',
      startX: 5,
      startY: 6,
      initialStatus: 'downed'
    },
    
    enemies: [
      {
        name: 'Reinforcement Guard 1',
        class: 'Yodha',
        level: 3,
        startX: 14,
        startY: 4,
        team: 'enemy'
      },
      {
        name: 'Reinforcement Guard 2',
        class: 'Chara',
        level: 3,
        startX: 14,
        startY: 8,
        team: 'enemy'
      }
    ],
    
    victoryConditions: [
      'survive_8_rounds',
      'lachi_protected'  // Lachi must not take fatal damage
    ],
    
    defeatConditions: [
      'lachi_downed',  // Lachi's Prana reaches 0
      'all_defenders_downed'
    ],
    
    rewards: {
      experience: 400,
      gold: 100,
      narrative: 'Lachi stirs. She will live. The Marakatas escape into the night.'
    }
  }
};

/**
 * Get ability object by ID
 */
export function getAbility(abilityId) {
  return ABILITY_DATABASE[abilityId] || null;
}

/**
 * Get all abilities for a character class
 */
export function getClassAbilities(className) {
  const abilityIds = CLASS_ABILITIES[className] || [];
  return abilityIds.map(id => getAbility(id)).filter(a => a !== null);
}

/**
 * Get mission data by ID
 */
export function getMission(missionId) {
  return MISSIONS[missionId] || null;
}

/**
 * Get all available missions
 */
export function getAllMissions() {
  return Object.values(MISSIONS);
}