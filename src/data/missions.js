export const MISSION_TYPES = {
  STEALTH_HEIST: 'stealth_heist',
  DEFENSE: 'defense',
  STORY_BATTLE: 'story_battle',
  BOSS_FIGHT: 'boss_fight'
};

export const CONTROL_MODES = {
  ALL_PARTY: 'all_party',      // Control all units each turn
  SINGLE_CHARACTER: 'single',   // Control one character (VN style)
  SELECTED_PARTY: 'selected'    // Choose 3-4 from roster
};

export const MISSIONS = {
  rajasa_heist: {
    id: 'rajasa_heist',
    name: 'The Rajasa Heist',
    type: MISSION_TYPES.STEALTH_HEIST,
    controlMode: CONTROL_MODES.ALL_PARTY,
    
    description: 'Loot the merchant ship Rajasa under cover of darkness. Avoid detection or face the entire crew.',
    
    map: {
      id: 'ship_deck',
      width: 14,
      height: 10,
      tiles: [] // We'll define this later
    },
    
    availableCharacters: ['kona', 'lachi', 'gopa', 'reddy', 'chennappa'],
    forcedCharacters: ['kona', 'lachi', 'gopa', 'reddy', 'chennappa'], // All must be used
    
    startingPositions: {
      kona: { x: 1, y: 5 },
      lachi: { x: 0, y: 8, special: 'crows_nest' }, // Starts on elevation
      gopa: { x: 1, y: 6 },
      reddy: { x: 1, y: 4 },
      chennappa: { x: 0, y: 5 }
    },
    
    enemies: [
      { type: 'sailor', x: 10, y: 5, patrol: [[10,5], [10,7], [12,7], [12,5]], state: 'patrolling' },
      { type: 'sailor', x: 8, y: 2, state: 'sleeping' },
      { type: 'sailor', x: 6, y: 8, patrol: [[6,8], [6,9], [8,9], [8,8]], state: 'patrolling' },
      // More enemies...
    ],
    
    objectives: [
      {
        id: 'steal_cargo',
        type: 'interact',
        target: 'cargo_crates',
        positions: [[13, 5], [13, 6]],
        description: 'Move cargo to your cutter',
        required: true
      },
      {
        id: 'no_kills',
        type: 'constraint',
        condition: 'no_enemy_deaths',
        description: 'Complete without killing anyone',
        required: false,
        bonus: { experience: 200 }
      },
      {
        id: 'stealth',
        type: 'constraint',
        condition: 'not_detected',
        description: 'Complete without being detected',
        required: false,
        bonus: { experience: 300 }
      }
    ],
    
    failureConditions: [
      { type: 'all_units_defeated' },
      { type: 'time_limit', turns: 15 }
    ],
    
    turnSystem: {
      type: 'simultaneous', // All player units can act, then all enemy units
      timeLimit: null // null = no limit, or number for turn limit
    },
    
    specialRules: {
      stealth: true,           // Enemies have detection radius
      alertLevel: 0,           // Increases when detected
      reinforcements: {        // Enemies arrive when alerted
        triggerAt: 50,         // Alert level threshold
        waves: [
          { units: [{ type: 'sailor', x: 13, y: 0 }], turn: 'immediate' }
        ]
      }
    },
    
    rewards: {
      experience: 500,
      unlocks: ['mission:masula_escape'],
      items: ['jewels_cache'],
      story: 'rajasa_success'
    }
  },

  koya_attack: {
    id: 'koya_attack',
    name: 'Defense of Bhojadasa Estate',
    type: MISSION_TYPES.DEFENSE,
    controlMode: CONTROL_MODES.ALL_PARTY,
    
    description: 'Koya warriors breach the estate walls. Protect Bhojadasa and survive the assault.',
    
    map: {
      id: 'estate_courtyard',
      width: 12,
      height: 10
    },
    
    availableCharacters: ['kona', 'chennappa'],
    forcedCharacters: ['kona', 'chennappa'],
    npcs: [
      { id: 'bhojadasa', name: 'Bhojadasa', mustSurvive: true }
    ],
    
    startingPositions: {
      kona: { x: 5, y: 5 },
      chennappa: { x: 6, y: 5 },
      bhojadasa: { x: 5, y: 6 }
    },
    
    enemies: [
      { type: 'koya_warrior', x: 2, y: 2 },
      { type: 'koya_warrior', x: 3, y: 2 },
      { type: 'koya_hunter', x: 1, y: 3 },
      // ... 17 more
    ],
    
    objectives: [
      {
        id: 'survive',
        type: 'survive',
        turns: 10,
        description: 'Survive 10 turns',
        required: true
      },
      {
        id: 'protect_bhojadasa',
        type: 'protect',
        targetId: 'bhojadasa',
        description: 'Keep Bhojadasa alive',
        required: true
      }
    ],
    
    failureConditions: [
      { type: 'npc_death', targetId: 'bhojadasa' },
      { type: 'all_player_units_defeated' }
    ],
    
    turnSystem: {
      type: 'alternating', // Player turn, then enemy turn
      timeLimit: null
    },
    
    specialRules: {
      reinforcements: {
        waves: [
          { units: [{ type: 'koya_berserker', x: 0, y: 0 }], turn: 5 }
        ]
      }
    },
    
    rewards: {
      experience: 800,
      unlocks: ['reddy', 'gopa', 'lachi'], // Companions join after this
      story: 'koya_aftermath'
    }
  }
};

// Character data (will be expanded with abilities later)
export const CHARACTERS = {
  kona: {
    id: 'kona',
    name: 'Kona',
    class: 'Yodha',
    team: 'player',
    hp: 120,
    maxHp: 120,
    movement: 3,
    attackRange: 1,
    damage: 25,
    defense: 5,
    abilities: ['vibration_sense', 'whirlwind_strike']
  },
  
  lachi: {
    id: 'lachi',
    name: 'Lachi',
    class: 'Dhanurdhara',
    team: 'player',
    hp: 80,
    maxHp: 80,
    movement: 3,
    attackRange: 4,
    damage: 20,
    defense: 2,
    abilities: ['sleep_dart', 'poison_dart']
  },
  
  gopa: {
    id: 'gopa',
    name: 'Gopa',
    class: 'Chara',
    team: 'player',
    hp: 70,
    maxHp: 70,
    movement: 4,
    attackRange: 1,
    damage: 30,
    defense: 1,
    abilities: ['no_presence', 'backstab']
  },
  
  reddy: {
    id: 'reddy',
    name: 'Reddy',
    class: 'Yodha',
    team: 'player',
    hp: 140,
    maxHp: 140,
    movement: 2,
    attackRange: 1,
    damage: 20,
    defense: 8,
    abilities: ['shield_bash', 'defend']
  },
  
  chennappa: {
    id: 'chennappa',
    name: 'Chennappa',
    class: 'Sutradhara',
    team: 'player',
    hp: 90,
    maxHp: 90,
    movement: 3,
    attackRange: 2,
    damage: 15,
    defense: 3,
    abilities: ['tactical_command', 'inspire']
  }
};

export const ENEMY_TYPES = {
  sailor: {
    name: 'Sailor',
    hp: 80,
    maxHp: 80,
    movement: 2,
    attackRange: 1,
    damage: 15,
    defense: 2,
    detectionRange: 3, // For stealth missions
    aiType: 'patrol'
  },
  
  guard: {
    name: 'Guard',
    hp: 100,
    maxHp: 100,
    movement: 2,
    attackRange: 1,
    damage: 15,
    defense: 3,
    aiType: 'aggressive'
  },
  
  koya_warrior: {
    name: 'Koya Warrior',
    hp: 90,
    maxHp: 90,
    movement: 3,
    attackRange: 1,
    damage: 20,
    defense: 4,
    aiType: 'aggressive'
  },
  
  koya_hunter: {
    name: 'Koya Hunter',
    hp: 70,
    maxHp: 70,
    movement: 3,
    attackRange: 3,
    damage: 18,
    defense: 2,
    aiType: 'ranged'
  },
  
  koya_berserker: {
    name: 'Koya Berserker',
    hp: 150,
    maxHp: 150,
    movement: 2,
    attackRange: 1,
    damage: 35,
    defense: 3,
    aiType: 'berserker'
  }
};