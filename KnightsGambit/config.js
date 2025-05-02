/**
 * Knight's Gambit - Configuration File
 */

/**
 * Audio Configuration
 */
const MUSIC_TRACKS = [
    'audio/music_WarcraftOrc.mp3',
    'audio/music_Luffy.mp3',
    'audio/music_WormsTheme.mp3'
];
const VICTORY_MUSIC = 'audio/music_victory.mp3';

const SFX_FILES = {
    // UI & Game Flow
    success: 'audio/Success.wav',
    error: 'audio/Error.wav',
    gameOver: 'audio/GameOver.wav',
    levelComplete: 'audio/level_cleared.wav',
    levelSelect: 'audio/start_beep.wav',
    menuOpen: 'audio/sfxSelect.wav',
    menuClose: 'audio/sfxSelect.wav',
    select: 'audio/sfxSelect.wav',
    shopBuy: 'audio/pickup.wav',
    startBeep: 'audio/start_beep.wav',
    spellUnlock: 'audio/Success.wav', // Feedback for new spell unlock
    achievementUnlock: 'audio/Success.wav', // Feedback for achievement
    armorEquip: 'audio/armor_equip.wav', // PLACEHOLDER
    armorActivate: 'audio/armor_activate.wav', // PLACEHOLDER (Forest Armor Activation)
    forfeit: 'audio/Error.wav',
    cheat: 'audio/Success.wav',

    // Unit Actions
    move: 'audio/sfxMove.wav',
    hit: 'audio/sfxHit.wav',
    playerHurt1: 'audio/player_hurt1.wav',
    playerHurt2: 'audio/player_hurt2.wav',
    defeat: 'audio/sfxGoblinDead.wav', // Enemy death
    playerDie: 'audio/player_die.wav', // Player unit death
    arrowShoot: 'audio/arrow_shoot.wav', // Only for archers now
    net_throw: 'audio/net_throw.wav',
    net_hit: 'audio/net_hit.wav',
    slow_inflicted: 'audio/sfxFrostboltHit.wav',
    sapperExplode: 'audio/sfxFireballHit.wav',
    shamanHeal: 'audio/heal.wav',
    shamanTotem: 'audio/sfxSelect.wav',
    pyroFireball: 'audio/fireball_shoot.wav', // Pyro specific shoot
    pyroFlameWave: 'audio/fireball_shoot.wav', // Pyro specific shoot
    rogueStealth: 'audio/sfxMove.wav', // PLACEHOLDER (Use quiet move?)
    rogueAttack: 'audio/sfxHit.wav', // PLACEHOLDER (Use regular hit?)
    rogueQuickStrike: 'audio/sfxSelect.wav', // PLACEHOLDER

    // Spells
    fireballShoot: 'audio/fireball_shoot.wav',
    fireballHit: 'audio/sfxFireballHit.wav',
    flameWaveCast: 'audio/fireball_shoot.wav', // Can reuse shoot
    frostNovaCast: 'audio/sfxFrostboltCast.wav',
    frostNovaHit: 'audio/sfxFrostboltHit.wav',
    heal: 'audio/heal.wav',

    // Items & Obstacles
    pickup: 'audio/pickup.wav', // Generic pickup
    goldDrop: 'audio/gold_drop.wav',
    gemPickup: 'audio/gem.wav',
    potionPickup: 'audio/powerup.wav',
    spellbookPickup: 'audio/spellbook_pickup.wav', // PLACEHOLDER
    chestOpen: 'audio/chest.wav',
    doorDestroy: 'audio/sfxHit.wav',
    towerDestroy: 'audio/sfxHit.wav',
    towerEnter: 'audio/sfxSelect.wav',
    towerExit: 'audio/sfxMove.wav',
    snowmanDestroy: 'audio/snowman_break.wav', // PLACEHOLDER (Use generic hit?)
    snowmanReveal: 'audio/snowman_break.wav', // Goblin pops out
};

// Audio state (managed here for simplicity)
let sfx = {};
const bgMusic = new Audio();
bgMusic.loop = true;
bgMusic.volume = 0.3; // Default volume
const victoryMusicPlayer = new Audio();
victoryMusicPlayer.loop = false;
victoryMusicPlayer.volume = 0.5; // Default volume
let isMuted = false;
let audioInitialized = false;
let musicVolume = 0.3; // Default value matches bgMusic.volume
let sfxVolume = 0.6; // Default value, adjust based on average SFX volumes

/**
 * Grid & Level Configuration
 */
const BASE_GRID_COLS = 8;
const BASE_GRID_ROWS = 10;
const ENEMY_SPAWN_ROWS_PERCENT = 0.5;
const PLAYER_SPAWN_ROWS_PERCENT = 0.2;
const MIN_ENEMY_PLAYER_START_DISTANCE = 4;

const LEVELS_PER_WORLD = 15;
const TOTAL_WORLDS = 4; // Grass, Castle, Wasteland, Snow
const TOTAL_LEVELS_BASE = LEVELS_PER_WORLD * TOTAL_WORLDS; // 60 base levels
const ENABLE_INFINITE_LEVELS = true;
const INFINITE_LEVEL_START = TOTAL_LEVELS_BASE + 1; // Level 61
const INFINITE_HP_BONUS_PER_CYCLE = 1;
const INFINITE_ATK_BONUS_PER_CYCLE = 1;
const IMMUNITY_LEVEL_START = INFINITE_LEVEL_START; // Start immunity in infinite

const FORFEIT_MOVE_THRESHOLD = 2;

/**
 * Unit Configuration
 */
const MAX_OWNED_PER_TYPE = 12;
const MAX_ACTIVE_ROSTER_SIZE_BASE = 8;
const MAX_ACTIVE_ROSTER_SIZE_MAX = 12;
const NET_DURATION = 2; // Turns unit is netted
const NET_COOLDOWN = 3; // Turns between net throws
const SHAMAN_HEAL_AMOUNT = 1; // Shaman direct heal
const SHAMAN_TOTEM_HP = 1;
const SHAMAN_TOTEM_ATK = 0;
const SHAMAN_TOTEM_HEAL = 1; // Totem heal amount
const SHAMAN_TOTEM_RANGE = 5; // Totem heal range
const SHAMAN_TOTEM_COOLDOWN = 3; // Turns between totem summons
const PYRO_FIREBALL_DAMAGE = 2;
const PYRO_FLAME_WAVE_DAMAGE = 2;
const PYRO_FLAME_WAVE_COOLDOWN = 4;
const SAPPER_EXPLOSION_DAMAGE = 3;
const SAPPER_EXPLOSION_RADIUS = 1;
const GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN = 1;
const GOBLIN_TREASURE_HUNTER_GOLD_DROP_MAX = 4;
const TREASURE_HUNTER_SPAWN_COOLDOWN = 30; // Levels between guaranteed spawns
const TREASURE_HUNTER_SPAWN_CHANCE = 0.1; // Chance per level if cooldown met
const GOLD_MAGNET_BASE_RADIUS = 1;
const ROGUE_STEALTH_MOVE_PENALTY = 2; // Movement reduction for stealth
const ROGUE_QUICK_STRIKE_MOVE_PENALTY = 2; // Movement reduction for quick strike
const ROGUE_STEALTH_DAMAGE_BONUS = 1;

// --- Enemy Intro Levels (Used for initial unlock/appearance, main spawning uses pools) ---
const GOBLIN_ARCHER_INTRO_LEVEL = 3;
const CLUBBER_INTRO_LEVEL = 7;
const JUGGERNAUT_INTRO_LEVEL = 10;
const GOBLIN_NETTER_INTRO_LEVEL = 12;
const GOBLIN_SHAMAN_INTRO_LEVEL = 14;
const GOBLIN_TREASURE_HUNTER_INTRO_LEVEL = 15;
const GOBLIN_SAPPER_INTRO_LEVEL = 18;
const GOBLIN_PYROMANCER_INTRO_LEVEL = 16; // Moved to start of Castle (Level 16-30)
const SNOWMAN_INTRO_LEVEL = 46; // Start of Snow World (Level 46-60)
const ELITE_ENEMY_START_LEVEL = 10;
const ELITE_ENEMY_CHANCE = 0.15;
const JUGGERNAUT_SPAWN_LEVEL_MULTIPLE = 15; // Guaranteed Juggernaut Boss on levels divisible by this

// --- Enemy Variant Stats ---
const GOBLIN_RED_ATK_BONUS = 1;
const GOBLIN_BLUE_HP_BONUS = 1;
const GOBLIN_BLUE_SLOW_DURATION = 2;
const GOBLIN_YELLOW_MOV_BONUS = 1;
const GOBLIN_YELLOW_DOUBLE_TURN = true; // For non-boss units
const ELITE_STAT_BONUS = { hp: 1, atk: 1 };

// --- Spell Unlock Levels ---
const FIREBALL_UNLOCK_LEVEL = 4;
const FLAME_WAVE_UNLOCK_LEVEL = 8;
const FROST_NOVA_UNLOCK_LEVEL = 12;
const HEAL_UNLOCK_LEVEL = 16;

// --- Spell Base Stats ---
const FIREBALL_BASE_DAMAGE = 2;
const FLAME_WAVE_BASE_DAMAGE = 1;
const FLAME_WAVE_BURN_TURNS = 1;
const FROST_NOVA_BASE_DURATION = 3;
const FROST_NOVA_BASE_RADIUS_LEVEL = 1; // 0 = 1x1, 1 = 3x3, 2 = 5x5 etc.
const HEAL_BASE_AMOUNT = 3;

// --- Shop & Upgrade Costs ---
const RECRUIT_BASE_COSTS = {
    knight: 50,
    archer: 80,
    champion: 120,
    rogue: 150, // NEW
};
const RECRUIT_COST_INCREASE_PER_UNIT = 5;

const UNIT_UPGRADE_COSTS = {
    knight_hp: 50,
    knight_atk: 50,
    archer_hp: 50,
    archer_atk: 80,
    champion_hp: 100,
    champion_atk: 100,
    rogue_hp: 75, // NEW
    rogue_atk: 75, // NEW
};

const ABILITY_UPGRADE_COSTS = {
    rogue_quickstrike: 100, // NEW
};

const SPELL_UPGRADE_CONFIG = {
    fireball: { baseCost: 80, costIncrease: 10, effectIncrease: 1, requiredLevel: 6, maxLevel: 99, stat: 'damage', name: "Fireball" },
    flameWave: { baseCost: 100, costIncrease: 30, effectIncrease: 1, requiredLevel: 10, maxLevel: 99, stat: 'damage', name: "Flame Wave" },
    frostNova: { baseCost: 80, costIncrease: 20, effectIncrease: 1, requiredLevel: 14, maxLevel: 4, stat: 'radiusLevel', name: "Frost Nova" }, // Max radius 4 (9x9)
    heal: { baseCost: 80, costIncrease: 10, effectIncrease: 2, requiredLevel: 18, maxLevel: 99, stat: 'amount', name: "Heal" }
};

const PASSIVE_UPGRADE_COSTS = {
    tactical_command: 200,
};
const TACTICAL_COMMAND_UNLOCK_UNITS = 8;

/**
 * Animation & Timing Configuration
 */
const ARROW_FLY_DURATION_MS = 300;
const FIREBALL_PROJECTILE_DURATION_MS = 400;
const FIREBALL_EXPLOSION_DURATION_MS = 800;
const NET_FLY_DURATION_MS = 400;
const MOVE_ANIMATION_DURATION_MS = 250;
const DEATH_FADE_DURATION_MS = 1000;
const DEATH_VISIBLE_DURATION_MS = 5000;
const FLAME_WAVE_STAGGER_DELAY_MS = 50;
const FLAME_WAVE_EFFECT_DELAY_MS = 1000;
const FROST_NOVA_EXPAND_DURATION_MS = 500;
const POPUP_DURATION_MS = 1100;
const MOBILE_TOOLTIP_DURATION_MS = 1000; // Duration for temporary mobile tooltips
const ITEM_DROP_ANIMATION_DURATION_MS = 400;
const ITEM_PICKUP_ANIMATION_DURATION_MS = 300;
const ITEM_MAGNET_FLY_DURATION_MS = 500;
const OBSTACLE_DESTROY_DURATION_MS = 300;
const FROST_VISUAL_FADE_OFFSET = 300;

/**
 * Obstacle Configuration
 */
const MIN_OBSTACLES = 4;
const MAX_OBSTACLES_PER_LEVEL_FACTOR = 0.08;
const WALL_ROCK_CHANCE = 0.4;
const DOOR_CHANCE = 0.15;
const TOWER_SPAWN_CHANCE_PER_LEVEL = 0.1;
const MAX_TOWERS_PER_LEVEL = 1;
const SNOWMAN_SPAWN_CHANCE_IN_SNOW = 0.3; // Chance per eligible cell in snow world
const SNOWMAN_MAX_PER_LEVEL = 3;

/**
 * Item Configuration
 */
const GOLD_DROP_CHANCE = 0.35;
const BASE_GOLD_DROP_AMOUNT = 1;
const ADVANCED_GOBLIN_EXTRA_GOLD_CHANCE = 0.25;
const ADVANCED_GOBLIN_EXTRA_GOLD_AMOUNT = 1;
const CHEST_SPAWN_CHANCE_PER_LEVEL = 0.3;
const CHEST_BASE_GOLD_AMOUNT = 5;
const CHEST_MAX_BONUS_GOLD_PER_LEVEL = 0.5;
const CHEST_MAX_TOTAL_GOLD = 30;
const MAX_CHESTS_PER_LEVEL = 2;
const POTION_DROP_CHANCE_ENEMY = 0.02;
const POTION_DROP_CHANCE_CHEST_BASE = 0.3;
const POTION_DROP_CHANCE_CHEST_PER_LEVEL = 0.005;
const POTION_DROP_CHANCE_CHEST_MAX = 0.7;
const POTION_GOLD_VALUE_IF_FULL_HP = 2;
const GEM_DROP_CHANCE_ENEMY = 0.005;
const GEM_DROP_CHANCE_CHEST_BASE = 0.15;
const GEM_DROP_CHANCE_CHEST_PER_LEVEL = 0.005;
const GEM_DROP_CHANCE_CHEST_MAX = 0.5;
const SHINY_GEM_MIN_GOLD = 8;
const SHINY_GEM_MAX_GOLD = 20;
const HEALTH_POTION_HEAL_AMOUNT = 1;
const SPELLBOOK_DROP_CHANCE_ENEMY = 0.01; // Ultra rare
const SPELLBOOK_DROP_CHANCE_CHEST = 0.05; // Slightly less rare from chests
const SPELLBOOK_REQUIRED_SPELL_USE = true; // Only drops if player used a spell

/**
 * Entity Data Definitions
 */
const UNIT_DATA = {
    // Player Units
    knight:   { name: "Knight",   baseHp: 6, baseAtk: 1, mov: 3, range: 1, team: 'player', spriteUrl: './sprites/knight.png', deadSpriteUrl: './sprites/knight_dead.png', portraitUrl: './sprites/knight_portrait.png', id_prefix: 'k', armor_type: 'grey' },
    archer:   { name: "Archer",   baseHp: 3, baseAtk: 1, mov: 2, range: 4, team: 'player', spriteUrl: './sprites/archer.png', deadSpriteUrl: './sprites/archer_dead.png', portraitUrl: './sprites/archer_portrait.png', id_prefix: 'a', shootsProjectileType: 'arrow', armor_type: 'grey' },
    champion: { name: "Champion", baseHp: 5, baseAtk: 2, mov: 3, range: 1, team: 'player', cleaveDamage: 1, spriteUrl: './sprites/champion.png', deadSpriteUrl: './sprites/champion_dead.png', portraitUrl: './sprites/champion_portrait.png', id_prefix: 'c', armor_type: 'grey' },
    rogue:    { name: "Rogue",    baseHp: 3, baseAtk: 1, mov: 5, range: 1, team: 'player', spriteUrl: './sprites/rogue.png', deadSpriteUrl: './sprites/rogue_dead.png', portraitUrl: './sprites/rogue_portrait.png', id_prefix: 'r', canStealth: true, canQuickStrike: false /* Purchasable */, armor_type: 'grey' }, // NEW Rogue Unit

    // Enemy Units
    goblin:         { name: "Goblin",           baseHp: 2, baseAtk: 1, mov: 4, range: 1, team: 'enemy', spriteUrl: './sprites/goblin.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_portrait.png', id_prefix: 'g' },
    goblin_archer:  { name: "Goblin Archer",    baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy', spriteUrl: './sprites/goblin_archer.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_archer_portrait.png', id_prefix: 'ga', shootsProjectileType: 'arrow' },
    goblin_netter:  { name: "Goblin Netter",    baseHp: 1, baseAtk: 0, mov: 3, range: 3, team: 'enemy', canNet: true, netCooldown: NET_COOLDOWN, spriteUrl: './sprites/goblin_netter.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_netter_portrait.png', id_prefix: 'gn', meleeOnlyAttack: true /* Can only attack adjacent */ },
    goblin_club:    { name: "Goblin Clubber",   baseHp: 3, baseAtk: 2, mov: 3, range: 1, team: 'enemy', knockback: true, spriteUrl: './sprites/goblin_club.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_club_portrait.png', id_prefix: 'gc' },
    orc_juggernaut: { name: "Orc Juggernaut",   baseHp: 8, baseAtk: 3, mov: 2, range: 1, team: 'enemy', knockback: true, spriteUrl: './sprites/orc_juggernaut.png', deadSpriteUrl: './sprites/orc_juggernaut_dead.png', portraitUrl: './sprites/orc_juggernaut_portrait.png', id_prefix: 'oj', isBoss: true, dropsArmor: true }, // Added boss/armor flags
    goblin_shaman:  { name: "Goblin Shaman",    baseHp: 2, baseAtk: 0, mov: 3, range: 5 /* Heal range */, team: 'enemy', healAmount: SHAMAN_HEAL_AMOUNT, canSummonTotem: true, totemCooldown: SHAMAN_TOTEM_COOLDOWN, totemType: 'shaman_totem', spriteUrl: './sprites/goblin_shaman.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_shaman_portrait.png', id_prefix: 'gsh', meleeOnlyAttack: true /* Can only attack adjacent */ },
    shaman_totem:   { name: "Healing Totem",    baseHp: SHAMAN_TOTEM_HP, baseAtk: SHAMAN_TOTEM_ATK, mov: 0, range: SHAMAN_TOTEM_RANGE /* Heal range */, team: 'enemy', healAmount: SHAMAN_TOTEM_HEAL, spriteUrl: './sprites/totem.png', deadSpriteUrl: './sprites/totem_dead.png', portraitUrl: './sprites/totem.png', id_prefix: 'gst', isTotem: true },
    goblin_sapper:  { name: "Goblin Sapper",    baseHp: 1, baseAtk: 1, mov: 2, range: 1, team: 'enemy', suicideExplode: true, explodeOnDeath: true, explosionDamage: SAPPER_EXPLOSION_DAMAGE, explosionRadius: SAPPER_EXPLOSION_RADIUS, spriteUrl: './sprites/goblin_sapper.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_sapper_portrait.png', id_prefix: 'gsa' },
    goblin_pyromancer:{ name: "Goblin Pyromancer", baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy', shootsProjectileType: 'fireball', canCastFlameWave: true, fireballDamage: PYRO_FIREBALL_DAMAGE, flameWaveDamage: PYRO_FLAME_WAVE_DAMAGE, flameWaveCooldown: PYRO_FLAME_WAVE_COOLDOWN, spriteUrl: './sprites/goblin_pyromancer.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_pyromancer_portrait.png', id_prefix: 'gp' },
    goblin_treasure_hunter: { name: "Goblin Treasure Hunter", baseHp: 5, baseAtk: 1, mov: 5, range: 1, team: 'enemy', isTreasureHunter: true, flees: true /* AI hint */, spriteUrl: './sprites/goblin_treasure.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_treasure_portrait.png', id_prefix: 'gth' },
};

const OBSTACLE_DATA = {
    rock:       { hp: 999, blocksMove: true,  blocksLOS: false, spriteClass: 'rock',      destructible: false, enterable: false },
    wall_rock:  { hp: 999, blocksMove: true,  blocksLOS: true,  spriteClass: 'wall_rock', destructible: false, enterable: false },
    door:       { hp: 1,   blocksMove: true,  blocksLOS: true,  spriteClass: 'door',      destructible: true,  enterable: false, canBeAttacked: true }, // Added flag
    tower:      { hp: 3,   blocksMove: false, blocksLOS: false, spriteClass: 'tower',     destructible: true,  enterable: true, rangeBonus: 1 },
    snowman:    { hp: 1,   blocksMove: true,  blocksLOS: false, spriteClass: 'snowman',   destructible: true,  enterable: false, hiddenUnitType: 'goblin', hiddenUnitVariant: 'blue', hidesUnit: true, clickable: true /* Added flag */, canBeAttacked: true },
};

const ITEM_DATA = {
    gold:           { spriteClass: 'gold-coin',     zIndex: 9, pickupAction: 'addGold', value: 1 },
    chest:          { spriteClass: 'chest',         zIndex: 7, pickupAction: 'openChest', baseGoldAmount: CHEST_BASE_GOLD_AMOUNT },
    health_potion:  { spriteClass: 'health-potion', zIndex: 8, pickupAction: 'healUnit', value: HEALTH_POTION_HEAL_AMOUNT },
    shiny_gem:      { spriteClass: 'shiny-gem',     zIndex: 8, pickupAction: 'addGold', valueMin: SHINY_GEM_MIN_GOLD, valueMax: SHINY_GEM_MAX_GOLD },
    gold_magnet:    { spriteClass: 'gold-magnet',   zIndex: 8, pickupAction: 'upgradeGoldMagnet', value: 1 },
    spellbook:      { spriteClass: 'spellbook',     zIndex: 8, pickupAction: 'restoreSpell', value: 1 }, // NEW Spellbook
    armor:          { spriteClass: 'armor',         zIndex: 8, pickupAction: 'collectArmor', value: 1 } // Placeholder for armor drops
};

const PASSIVE_DATA = {
    gold_magnet: { name: "Gold Magnet", description: "Automatically collect gold from nearby squares.", icon: "./sprites/gold_magnet.png" },
    tactical_command: { name: "Tactical Command", description: `Increases max roster size by 1 (Max ${MAX_ACTIVE_ROSTER_SIZE_MAX}).`, icon: "./sprites/icon_troop_increase.png" }, // Updated icon
};

const ARMOR_DATA = {
    none:   { id: 'none',   name: 'No Armor',       description: 'All Units: +1 MOV, 1 HP Max.', icon: './sprites/armor.png', hpBonus: -99, atkBonus: 0, movBonus: 1, resistances: {}, activation: null, color: '#ffdab9' /* Peach */ },
    grey:   { id: 'grey',   name: 'Grey Armor',     description: 'Standard issue, no bonuses.', icon: './sprites/armor.png', hpBonus: 0, atkBonus: 0, movBonus: 0, resistances: {}, activation: null, color: '#9a9a9a' },
    forest: { id: 'forest', name: 'Forest Armor',   description: 'Activate: -1 ATK from enemies (1 turn, once/level).', icon: './sprites/armor.png', hpBonus: 0, atkBonus: 0, movBonus: 0, resistances: {}, activation: { type: 'debuff_enemy_atk', value: 1, duration: 1, uses: 1 }, color: '#228B22' /* Forest Green */ },
    azure:  { id: 'azure',  name: 'Azure Armor',    description: 'All Units: +1 Max HP. Lvl 2+: +1 Frost Resist.', icon: './sprites/armor.png', hpBonus: 1, atkBonus: 0, movBonus: 0, resistances: { frost: 1 }, activation: null, color: '#007FFF' /* Azure Blue */ },
    ember:  { id: 'ember',  name: 'Ember Armor',    description: 'All Units: +1 ATK. Lvl 2+: +1 Fire Resist.', icon: './sprites/armor.png', hpBonus: 0, atkBonus: 1, movBonus: 0, resistances: { fire: 1 }, activation: null, color: '#D22B2B' /* Fire Red */ },
    sand:   { id: 'sand',   name: 'Sand Armor',     description: 'All Units: +1 MOV.', icon: './sprites/armor.png', hpBonus: 0, atkBonus: 0, movBonus: 1, resistances: {}, activation: null, color: '#C19A6B' /* Sand */ },
};

const ARMOR_RESISTANCE_UPGRADE_LEVEL = 2; // Armor level at which resistance is gained
const ARMOR_RESISTANCE_VALUE = 1; // Amount of resistance gained

/**
 * World & Level Select Configuration
 */
const TILESET_IMAGES = {
    grass: './sprites/tile_grass.png',
    castle: './sprites/tile_castle.png',
    wasteland: './sprites/tile_wasteland.png',
    snow: './sprites/tile_snow.png'
};
const TILESET_GOBLIN_VARIANT_MAP = {
    grass: 'green',
    castle: 'red',
    wasteland: 'yellow',
    snow: 'blue'
};
const WORLD_ARMOR_MAP = { // Maps world name to armor ID dropped by boss
    grass: 'forest',
    castle: 'ember',
    wasteland: 'sand',
    snow: 'azure'
};
const GOBLIN_TREASURE_HUNTER_VARIANT = 'green'; // Treasure hunter appearance doesn't change

// --- World Enemy Pools --- Revamped based on request
const WORLD_ENEMY_POOL = {
    grass: { // Levels 1-15
        common: ['goblin'],
        uncommon: ['goblin_archer', 'goblin_club'], // Introduce archers and clubbers
        rare: ['goblin_netter', 'goblin_shaman'], // Netters and Shamans are rarer here
        boss: ['orc_juggernaut']
    },
    castle: { // Levels 16-30 - Ember/Fire themed
        common: ['goblin', 'goblin_sapper'], // More Sappers
        uncommon: ['goblin_club', 'goblin_archer'], // Clubbers still around
        rare: ['goblin_pyromancer'], // Pyromancer EXCLUSIVE to Castle
        boss: ['orc_juggernaut']
    },
    wasteland: { // Levels 31-45 - Sand/Tough themed
        common: ['goblin', 'goblin_archer'],
        uncommon: ['goblin_club', 'goblin_netter'], // Netters more frequent
        rare: ['goblin_shaman'], // Shamans appear again
        boss: ['orc_juggernaut']
    },
    snow: { // Levels 46-60 - Azure/Ice themed
        common: ['goblin', 'goblin_archer'],
        uncommon: ['goblin_club', 'goblin_shaman'], // Clubbers and Shamans common
        rare: [], // No other specific rare types, rely on Snowmen (obstacles) and Blue variant
        boss: ['orc_juggernaut']
    },
    infinite: { // Levels 61+ - Mix of all, increased difficulty via elites/stats
        common: ['goblin', 'goblin_archer'],
        uncommon: ['goblin_club', 'goblin_netter', 'goblin_shaman', 'goblin_sapper', 'goblin_pyromancer'], // All non-boss types possible
        rare: [], // Rely on variants/elites for difficulty increase
        boss: ['orc_juggernaut'] // Bosses continue to appear
    }
};
// List of units considered "advanced" for drop chances etc.
const ADVANCED_ENEMY_TYPES = ['goblin_archer', 'goblin_netter', 'goblin_club', 'orc_juggernaut', 'goblin_shaman', 'goblin_sapper', 'goblin_pyromancer', 'goblin_treasure_hunter'];

const WORLD_MAP_IMAGE_URL = './sprites/world_map.png';
const VISUAL_QUADRANT_CENTERS = [ { x: 37, y: 27 }, { x: 62, y: 28 }, { x: 39, y: 73 }, { x: 62, y: 73 } ];
const MOBILE_VISUAL_QUADRANT_CENTERS = [ { x: 27, y: 39 }, { x: 73, y: 39 }, { x: 30, y: 60 }, { x: 73, y: 60 } ];
const LEVEL_DOT_SPIRAL_DISTANCE_STEP = 1.5;
const LEVEL_DOT_SPIRAL_ANGLE_STEP = 137.5;
const MOBILE_LEVEL_DOT_SPIRAL_DISTANCE_STEP = 0.8;
const MOBILE_LEVEL_DOT_SPIRAL_ANGLE_STEP = 137.5;
const MOBILE_HORIZONTAL_STRETCH_FACTOR = 3.4;
const INITIAL_MAP_ZOOM_LEVEL = 2.6;
const MOBILE_INITIAL_MAP_ZOOM_LEVEL = 6;
const LEVELS_PER_PAGE = 60; // Can be adjusted

const LEVEL_COMPLETE_BONUS_GOLD = {
    noSpells: 10,
    fullHp: 20, // All surviving units at full HP
    noLosses: 10, // No units lost (even if not full HP)
    noArmor: 25, // Beating level with 'No Armor' equipped (and no losses)
};

/**
 * Storage & Leaderboard Configuration
 */
const STORAGE_KEY_GAME_PREFIX = 'knightsGambitRevamped_';
const STORAGE_KEY_HIGHEST_LEVEL = `${STORAGE_KEY_GAME_PREFIX}highestLevel`;
const STORAGE_KEY_GOLD = `${STORAGE_KEY_GAME_PREFIX}gold`;
const STORAGE_KEY_OWNED_UNITS = `${STORAGE_KEY_GAME_PREFIX}ownedUnits`;
const STORAGE_KEY_ACTIVE_ROSTER = `${STORAGE_KEY_GAME_PREFIX}activeRoster`;
const STORAGE_KEY_UNIT_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}unitUpgrades`;
const STORAGE_KEY_SPELL_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}spellUpgrades`;
const STORAGE_KEY_ABILITY_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}abilityUpgrades`; // NEW for rogue
const STORAGE_KEY_PASSIVE_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}passiveUpgrades`;
const STORAGE_KEY_OWNED_ARMOR = `${STORAGE_KEY_GAME_PREFIX}ownedArmor`; // NEW
const STORAGE_KEY_EQUIPPED_ARMOR = `${STORAGE_KEY_GAME_PREFIX}equippedArmor`; // NEW
const STORAGE_KEY_ACHIEVEMENT_PROGRESS = `${STORAGE_KEY_GAME_PREFIX}achievementProgress`; // NEW
const STORAGE_KEY_CHEAT_SPELL_ATK = `${STORAGE_KEY_GAME_PREFIX}cheatSpellAtkBonus`;
const STORAGE_KEY_SETTINGS = `${STORAGE_KEY_GAME_PREFIX}settings`;
const STORAGE_KEY_MAX_ROSTER_SIZE = `${STORAGE_KEY_GAME_PREFIX}maxRosterSize`;
const STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL = `${STORAGE_KEY_GAME_PREFIX}lastTreasureHunterLevel`;
const LEADERBOARD_STORAGE_KEY = `${STORAGE_KEY_GAME_PREFIX}leaderboard`;
const MAX_LEADERBOARD_ENTRIES = 10;

/**
 * Achievement Configuration
 */
const ACHIEVEMENT_DATA = {
    // Kill Counts
    kill_10_goblins: { title: "Goblin Foe", description: "Kill 10 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 10 }, reward: { gold: 10 } },
    kill_50_goblins: { title: "Goblin Slayer", description: "Kill 50 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 50 }, reward: { gold: 50 } },
    kill_100_goblins: { title: "Goblin Bane", description: "Kill 100 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 100 }, reward: { gold: 100 } },
    kill_500_goblins: { title: "Goblin Terror", description: "Kill 500 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 500 }, reward: { gold: 500 } },
    kill_1000_goblins: { title: "Goblin Nightmare", description: "Kill 1000 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 1000 }, reward: { gold: 1000 } },

    kill_boss_forest: { title: "Forest Guardian", description: "Defeat the Forest World Boss (Level 15).", icon: "boss_defeat", condition: { type: "kill_boss", world: "grass" }, reward: { gold: 150 } },
    kill_boss_castle: { title: "Castle Crasher", description: "Defeat the Castle World Boss (Level 30).", icon: "boss_defeat", condition: { type: "kill_boss", world: "castle" }, reward: { gold: 200 } },
    kill_boss_wasteland: { title: "Wasteland Wanderer", description: "Defeat the Wasteland World Boss (Level 45).", icon: "boss_defeat", condition: { type: "kill_boss", world: "wasteland" }, reward: { gold: 250 } },
    kill_boss_snow: { title: "Snow Conqueror", description: "Defeat the Snow World Boss (Level 60).", icon: "boss_defeat", condition: { type: "kill_boss", world: "snow" }, reward: { gold: 300 } },

    // World Progression
    beat_forest_world: { title: "Forest Explorer", description: "Complete the Forest World (Level 15).", icon: "world_complete", condition: { type: "reach_level", level: 16 }, reward: { gold: 100 } },
    beat_castle_world: { title: "Castle Sieger", description: "Complete the Castle World (Level 30).", icon: "world_complete", condition: { type: "reach_level", level: 31 }, reward: { gold: 150 } },
    beat_wasteland_world: { title: "Wasteland Survivor", description: "Complete the Wasteland World (Level 45).", icon: "world_complete", condition: { type: "reach_level", level: 46 }, reward: { gold: 200 } },
    beat_snow_world: { title: "Tundra Tamer", description: "Complete the Snow World (Level 60).", icon: "world_complete", condition: { type: "reach_level", level: 61 }, reward: { gold: 250 } },

    // Gameplay Challenges
    no_armor_victory: { title: "Born Leader", description: "Beat any level with 'No Armor' equipped (no losses).", icon: "no_armor", condition: { type: "level_complete_condition", condition: "no_armor" }, reward: { gold: 50 } },
    flawless_victory: { title: "Flawless Victory", description: "Beat a level with all units at full HP.", icon: "flawless", condition: { type: "level_complete_condition", condition: "full_hp" }, reward: { gold: 75 } },
    no_losses: { title: "No One Left Behind", description: "Beat a level without losing any units.", icon: "no_losses", condition: { type: "level_complete_condition", condition: "no_losses" }, reward: { gold: 40 } },
    no_spells: { title: "Might Over Magic", description: "Beat a level after unlocking spells without using any.", icon: "no_spells", condition: { type: "level_complete_condition", condition: "no_spells" }, reward: { gold: 30 } },

    // Collection/Recruitment
    recruit_knight: { title: "First Knight", description: "Recruit your first Knight.", icon: "recruit", condition: { type: "recruit", target: "knight", count: 1 }, reward: {} },
    recruit_archer: { title: "First Archer", description: "Recruit your first Archer.", icon: "recruit", condition: { type: "recruit", target: "archer", count: 1 }, reward: {} },
    recruit_champion: { title: "First Champion", description: "Recruit your first Champion.", icon: "recruit", condition: { type: "recruit", target: "champion", count: 1 }, reward: {} },
    recruit_rogue: { title: "First Rogue", description: "Recruit your first Rogue.", icon: "recruit", condition: { type: "recruit", target: "rogue", count: 1 }, reward: {} },
    full_party: { title: "Full Roster", description: "Fill your active roster to the maximum size.", icon: "full_party", condition: { type: "roster_full" }, reward: { gold: 100 } },
    collect_all_armor: { title: "Armored Core", description: "Collect all basic armor types (Forest, Azure, Ember, Sand).", icon: "all_armor", condition: { type: "collect_armor", count: 4 }, reward: { gold: 200 } }, // Forest, Azure, Ember, Sand
};

/**
 * Recolor Configuration
 */
const SPRITE_KEYS_FOR_RECOLOR = [
    'goblin_club', 'goblin', 'goblin_archer',
    'goblin_netter', 'goblin_pyromancer', 'goblin_sapper',
    'goblin_shaman', 'goblin_treasure', 'goblin_dead', // Base dead sprite
    // Portraits
    'goblin_portrait', 'goblin_archer_portrait', 'goblin_netter_portrait',
    'goblin_club_portrait', 'goblin_shaman_portrait', 'goblin_sapper_portrait',
    'goblin_pyromancer_portrait', 'goblin_treasure_portrait',
    // Armor (Base grey needs recoloring)
    'armor' // Base sprite for armor recoloring
];
const TARGET_GREEN_RGB = { r: 34, g: 135, b: 28 }; // Target color in goblin sprites
const TARGET_GREY_RGB = { r: 154, g: 154, b: 154 };
const COLOR_TOLERANCE = 15;
const GOBLIN_REPLACEMENT_VARIANTS = {
    red:    { r: 191, g: 13,  b: 40 }, // Castle
    blue:   { r: 0,  g: 147, b: 255 }, // Snow
    yellow: { r: 255, g: 186, b: 0 }  // Wasteland
};



const ARMOR_REPLACEMENT_COLORS = {
    none:   { r: 253, g: 198, b: 137 }, // Peach (#ffdab9)
    forest: { r: 34,  g: 135, b: 28 },  // Forest Green (#228B22)
    azure:  { r: 0,   g: 147, b: 255 }, // Azure Blue (#007FFF)
    ember:  { r: 191, g: 13,  b: 40 },  // Fire Red (#D22B2B)
    sand:   { r: 255, g: 186, b: 0 }, // Sand (#C19A6B)
};

/**
 * Audio Initialization & Playback Functions
 */
function loadSfx() {
    if (Object.keys(sfx).length > 0 || typeof Audio === 'undefined') return;
    Object.keys(SFX_FILES).forEach(key => {
        try {
            sfx[key] = new Audio(SFX_FILES[key]);
            sfx[key].preload = 'auto';
            // Assign initial volumes based on new sfxVolume default
            sfx[key].volume = sfxVolume;
            // Adjust specific sounds relative to the base SFX volume if needed
            if (['gameOver', 'fireballHit', 'sapperExplode', 'playerHurt1', 'playerHurt2'].includes(key)) {
                 sfx[key].volume = Math.min(1, sfxVolume * 1.3); // Make louder sounds relatively louder
            } else if (['move', 'towerExit', 'rogueStealth'].includes(key)) {
                 sfx[key].volume = Math.max(0, sfxVolume * 0.7); // Make quieter sounds relatively quieter
            }
        } catch (e) { console.error(`Error loading SFX ${key}: ${SFX_FILES[key]}`, e); }
    });
}

function playSfx(soundKey) {
    const sound = sfx[soundKey];
    if (isMuted || !audioInitialized || !sound) return;
    try {
        // Update volume in case it changed in settings
        sound.volume = sfxVolume;
        // Adjust specific sounds relative to the base SFX volume if needed
        if (['gameOver', 'fireballHit', 'sapperExplode', 'playerHurt1', 'playerHurt2'].includes(soundKey)) {
             sound.volume = Math.min(1, sfxVolume * 1.3);
        } else if (['move', 'towerExit', 'rogueStealth'].includes(soundKey)) {
             sound.volume = Math.max(0, sfxVolume * 0.7);
        }

        if (!sound.paused) { sound.pause(); sound.currentTime = 0; }
        sound.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`SFX play error (${soundKey}): ${error.name} - ${error.message}`); } });
    } catch (e) { console.error(`Error attempting to play SFX ${soundKey}:`, e); }
}

function playMusic(trackUrl) {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined' || !trackUrl) return;
    const musicUrl = new URL(trackUrl, window.location.href).href;
    bgMusic.volume = musicVolume; // Update volume
    if (bgMusic.src !== musicUrl) { bgMusic.src = musicUrl; bgMusic.load(); }
    if (bgMusic.paused) { bgMusic.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Music play error: ${error.name} - ${error.message}`); } }); }
}

function startMusic() {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined') return;
    bgMusic.volume = musicVolume; // Ensure volume is set
    if (!bgMusic.src || bgMusic.ended) { selectAndLoadMusic(); }
    if (bgMusic.paused) { bgMusic.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Music play error: ${error.name} - ${error.message}`); } }); }
}

function stopMusic() {
    if (bgMusic && !bgMusic.paused) { bgMusic.pause(); bgMusic.currentTime = 0; }
    if (victoryMusicPlayer && !victoryMusicPlayer.paused) { victoryMusicPlayer.pause(); victoryMusicPlayer.currentTime = 0; }
}

function playVictoryMusic() {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined' || !VICTORY_MUSIC) return;
    stopMusic(); // Stop regular music first
    victoryMusicPlayer.volume = musicVolume; // Use music volume setting
    victoryMusicPlayer.src = new URL(VICTORY_MUSIC, window.location.href).href;
    victoryMusicPlayer.load();
    victoryMusicPlayer.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Victory Music play error: ${error.name} - ${error.message}`); } });
}

function selectAndLoadMusic() {
    if (MUSIC_TRACKS.length === 0 || typeof Audio === 'undefined') { bgMusic.src = ''; return; }
    let nextTrackIndex;
    if (MUSIC_TRACKS.length === 1) { nextTrackIndex = 0; }
    else { const currentTrackName = bgMusic.src ? bgMusic.src.substring(bgMusic.src.lastIndexOf('/') + 1) : null; const currentTrackIndex = MUSIC_TRACKS.findIndex(track => track.endsWith(currentTrackName)); do { nextTrackIndex = Math.floor(Math.random() * MUSIC_TRACKS.length); } while (nextTrackIndex === currentTrackIndex && MUSIC_TRACKS.length > 1); }
    playMusic(MUSIC_TRACKS[nextTrackIndex]);
}

function initializeAudio() {
    if (audioInitialized || typeof Audio === 'undefined') return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn("Web Audio API not supported."); audioInitialized = true; loadSfx(); return true; }
    const context = new AC();

    const unlockAudio = () => {
        if (context.state === 'running') {
            document.removeEventListener('click', unlockAudio, true); document.removeEventListener('keydown', unlockAudio, true); document.removeEventListener('touchstart', unlockAudio, true);
            if (!audioInitialized) { audioInitialized = true; loadSfx(); startMusicIfNotPlaying(); }
            return;
        }
        context.resume().then(() => {
            if (!audioInitialized) { audioInitialized = true; loadSfx(); startMusicIfNotPlaying(); }
            document.removeEventListener('click', unlockAudio, true); document.removeEventListener('keydown', unlockAudio, true); document.removeEventListener('touchstart', unlockAudio, true);
        }).catch(err => { console.error("Failed to resume AudioContext:", err); if (!audioInitialized) { audioInitialized = true; loadSfx(); } });
    };

    if (context.state === 'suspended') { const eventOptions = { once: true, capture: true }; document.addEventListener('click', unlockAudio, eventOptions); document.addEventListener('keydown', unlockAudio, eventOptions); document.addEventListener('touchstart', unlockAudio, eventOptions); return false; }
    else { audioInitialized = true; loadSfx(); return true; }
}

function startMusicIfNotPlaying() {
    if (!audioInitialized || isMuted || (victoryMusicPlayer && !victoryMusicPlayer.paused)) return;
    const canCheckUI = typeof isGameActive === 'function' && typeof isGameOver === 'function' && typeof isMenuOpen === 'function' && typeof isLeaderboardOpen === 'function' && typeof isShopOpen === 'function' && typeof isLevelSelectOpen === 'function' && typeof isMainMenuOpen === 'function' && typeof isLevelCompleteOpen === 'function' && typeof isChooseTroopsScreenOpen === 'function' && typeof isSettingsOpen === 'function' && typeof isAchievementsOpen === 'function';
    if (!canCheckUI) { if (!document.querySelector('.overlay.visible') && bgMusic.paused) { startMusic(); } return; }
    const canPlayMusic = isGameActive() && !isGameOver() && !isMenuOpen() && !isLeaderboardOpen() && !isShopOpen() && !isLevelSelectOpen() && !isMainMenuOpen() && !isLevelCompleteOpen() && !isChooseTroopsScreenOpen() && !isSettingsOpen() && !isAchievementsOpen();
    if (canPlayMusic && bgMusic.paused) { startMusic(); }
}

function setVolume(type, volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (type === 'music') {
        musicVolume = clampedVolume;
        bgMusic.volume = musicVolume;
        victoryMusicPlayer.volume = musicVolume;
    } else if (type === 'sfx') {
        sfxVolume = clampedVolume;
        // Update existing SFX volumes (needed if changed mid-game)
        Object.keys(sfx).forEach(key => {
            const sound = sfx[key];
            if (sound) {
                 sound.volume = sfxVolume;
                 // Adjust specific sounds relative to the base SFX volume if needed
                 if (['gameOver', 'fireballHit', 'sapperExplode', 'playerHurt1', 'playerHurt2'].includes(key)) {
                     sound.volume = Math.min(1, sfxVolume * 1.3);
                 } else if (['move', 'towerExit', 'rogueStealth'].includes(key)) {
                     sound.volume = Math.max(0, sfxVolume * 0.7);
                 }
            }
        });
    }
}

/**
 * Helper function to get world/variant info
 */
function getTilesetForLevel(level) {
    const levelIndex = level - 1;
    const baseLevelIndex = levelIndex % TOTAL_LEVELS_BASE;
    const effectiveQuadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS;
    let tilesetName; let worldName;
    switch (effectiveQuadrantIndex) {
        case 0: tilesetName = 'grass'; worldName = 'grass'; break;
        case 1: tilesetName = 'castle'; worldName = 'castle'; break;
        case 2: tilesetName = 'wasteland'; worldName = 'wasteland'; break;
        case 3: tilesetName = 'snow'; worldName = 'snow'; break;
        default: tilesetName = 'grass'; worldName = 'grass';
    }
    const tilesetUrl = TILESET_IMAGES[tilesetName] || TILESET_IMAGES.grass;
    const variant = TILESET_GOBLIN_VARIANT_MAP[tilesetName] || 'green';
    return { url: tilesetUrl, variant: variant, name: worldName, quadrant: effectiveQuadrantIndex };
}

// Default game settings structure
const DEFAULT_GAME_SETTINGS = {
    showHpBars: false,
    playerName: "Hero",
    musicVolume: 0.3,
    sfxVolume: 0.6,
    mute: false,
};