// config.js

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
    levelComplete: 'audio/level_cleared.wav', // Changed
    levelSelect: 'audio/start_beep.wav',
    menuOpen: 'audio/sfxSelect.wav',
    menuClose: 'audio/sfxSelect.wav',
    select: 'audio/sfxSelect.wav',
    shopBuy: 'audio/pickup.wav',
    startBeep: 'audio/start_beep.wav',
    spellUnlock: 'audio/Success.wav', // Use success for spell unlock feedback
    forfeit: 'audio/Error.wav',
    cheat: 'audio/Success.wav',

    // Unit Actions
    move: 'audio/sfxMove.wav',
    hit: 'audio/sfxHit.wav',
    playerHurt1: 'audio/player_hurt1.wav',
    playerHurt2: 'audio/player_hurt2.wav',
    defeat: 'audio/sfxGoblinDead.wav', // Enemy death
    playerDie: 'audio/player_die.wav', // Player unit death
    arrowShoot: 'audio/arrow_shoot.wav',
    net_throw: 'audio/net_throw.wav',
    net_hit: 'audio/net_hit.wav',
    slow_inflicted: 'audio/sfxFrostboltHit.wav', // Reuse frost sound
    sapperExplode: 'audio/sfxFireballHit.wav',
    shamanHeal: 'audio/heal.wav',
    shamanTotem: 'audio/sfxSelect.wav', // Placeholder for totem placement
    pyroFireball: 'audio/fireball_shoot.wav',
    pyroFlameWave: 'audio/fireball_shoot.wav',

    // Spells
    fireballShoot: 'audio/fireball_shoot.wav',
    fireballHit: 'audio/sfxFireballHit.wav',
    flameWaveCast: 'audio/fireball_shoot.wav',
    frostNovaCast: 'audio/sfxFrostboltCast.wav',
    frostNovaHit: 'audio/sfxFrostboltHit.wav',
    heal: 'audio/heal.wav',

    // Items & Obstacles
    pickup: 'audio/pickup.wav', // Generic pickup
    goldDrop: 'audio/gold_drop.wav',
    gemPickup: 'audio/gem.wav', // Specific gem sound
    potionPickup: 'audio/powerup.wav', // Reuse pickup for potion
    chestOpen: 'audio/chest.wav',
    doorDestroy: 'audio/sfxHit.wav',
    towerDestroy: 'audio/sfxHit.wav',
    towerEnter: 'audio/sfxSelect.wav',
    towerExit: 'audio/sfxMove.wav',
    snowmanReveal: 'audio/sfxGoblinDead.wav', // Sound when goblin pops out
};

// Audio state (managed here for simplicity as requested)
let sfx = {};
const bgMusic = new Audio();
bgMusic.loop = true;
bgMusic.volume = 0.3;
const victoryMusicPlayer = new Audio();
victoryMusicPlayer.loop = false; // Victory music typically doesn't loop
victoryMusicPlayer.volume = 0.5;
let isMuted = false;
let audioInitialized = false;

/**
 * Grid & Level Configuration
 */
const BASE_GRID_COLS = 8;
const BASE_GRID_ROWS = 10;
const ENEMY_SPAWN_ROWS_PERCENT = 0.5;
const PLAYER_SPAWN_ROWS_PERCENT = 0.2;
const MIN_ENEMY_PLAYER_START_DISTANCE = 4;

const LEVELS_PER_WORLD = 15;
const TOTAL_WORLDS = 4;
const TOTAL_LEVELS_BASE = LEVELS_PER_WORLD * TOTAL_WORLDS; // 60 base levels
const ENABLE_INFINITE_LEVELS = true;
const INFINITE_LEVEL_START = TOTAL_LEVELS_BASE + 1; // Level 61
const INFINITE_HP_BONUS_PER_CYCLE = 1;
const INFINITE_ATK_BONUS_PER_CYCLE = 1;
const IMMUNITY_LEVEL_START = INFINITE_LEVEL_START; // Start immunity in infinite

const FORFEIT_MOVE_THRESHOLD = 2; // Actions needed before forfeit option appears

/**
 * Unit Configuration
 */
const MAX_OWNED_PER_TYPE = 12;
const MAX_ACTIVE_ROSTER_SIZE_BASE = 8;
const MAX_ACTIVE_ROSTER_SIZE_MAX = 12; // Absolute max with upgrades
const NET_DURATION = 2;
const NET_COOLDOWN = 3;
const SHAMAN_HEAL_AMOUNT = 1;
const SHAMAN_TOTEM_HP = 1;
const SHAMAN_TOTEM_ATK = 0;
const SHAMAN_TOTEM_HEAL = 1;
const SHAMAN_TOTEM_COOLDOWN = 3;
const PYRO_FIREBALL_DAMAGE = 2; // Reduced from 3 for balance
const PYRO_FLAME_WAVE_DAMAGE = 2;
const PYRO_FLAME_WAVE_COOLDOWN = 4;
const SAPPER_EXPLOSION_DAMAGE = 3;
const SAPPER_EXPLOSION_RADIUS = 1;
const GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN = 1;
const GOBLIN_TREASURE_HUNTER_GOLD_DROP_MAX = 4;
const TREASURE_HUNTER_SPAWN_COOLDOWN = 30;
const GOLD_MAGNET_BASE_RADIUS = 1; // Initial radius = adjacent

// --- Enemy Intro Levels ---
const GOBLIN_ARCHER_INTRO_LEVEL = 3;
const CLUBBER_INTRO_LEVEL = 7;
const JUGGERNAUT_INTRO_LEVEL = 10;
const GOBLIN_NETTER_INTRO_LEVEL = 12;
const GOBLIN_SHAMAN_INTRO_LEVEL = 14;
const GOBLIN_TREASURE_HUNTER_INTRO_LEVEL = 15;
const GOBLIN_SAPPER_INTRO_LEVEL = 18;
const GOBLIN_PYROMANCER_INTRO_LEVEL = 24;
const SNOWMAN_INTRO_LEVEL = 46; // Start of Snow World (Level 46-60)
const ELITE_ENEMY_START_LEVEL = 10;
const JUGGERNAUT_SPAWN_MULTIPLE = 10; // Juggernaut guaranteed on levels divisible by this

// --- Enemy Variant Stats ---
const GOBLIN_RED_ATK_BONUS = 1;
const GOBLIN_BLUE_HP_BONUS = 1;
const GOBLIN_BLUE_SLOW_DURATION = 2;
const GOBLIN_YELLOW_MOV_BONUS = 1;
const GOBLIN_YELLOW_DOUBLE_TURN = true;
const ELITE_STAT_BONUS = { hp: 1, atk: 1 };

/**
 * Spell Configuration
 */
// --- Spell Unlock Levels ---
const FIREBALL_UNLOCK_LEVEL = 4;
const FLAME_WAVE_UNLOCK_LEVEL = 8;
const FROST_NOVA_UNLOCK_LEVEL = 12;
const HEAL_UNLOCK_LEVEL = 16;

// --- Spell Base Stats ---
const FIREBALL_BASE_DAMAGE = 2;
const FLAME_WAVE_BASE_DAMAGE = 1;
const FLAME_WAVE_BURN_TURNS = 1; // Duration of visual ground effect
const FROST_NOVA_BASE_DURATION = 3; // Base freeze turns
const FROST_NOVA_BASE_RADIUS_LEVEL = 1; // 1 = 3x3, 2 = 5x5, etc.
const HEAL_BASE_AMOUNT = 3;

/**
 * Shop & Upgrade Costs
 */
const RECRUIT_BASE_COSTS = {
    knight: 50,
    archer: 80,
    champion: 120,
};
const RECRUIT_COST_INCREASE_PER_UNIT = 5;

const UNIT_UPGRADE_COSTS = {
    knight_hp: 50,
    knight_atk: 50,
    archer_hp: 50,
    archer_atk: 80,
    champion_hp: 100,
    champion_atk: 100,
};

const SPELL_UPGRADE_CONFIG = {
    fireball: {
        baseCost: 80, costIncrease: 10, effectIncrease: 1,
        requiredLevel: 6, maxLevel: 99, stat: 'damage'
    },
    flameWave: {
        baseCost: 100, costIncrease: 30, effectIncrease: 1,
        requiredLevel: 10, maxLevel: 99, stat: 'damage'
    },
    frostNova: {
        baseCost: 80, costIncrease: 20, effectIncrease: 1,
        requiredLevel: 14, maxLevel: 4, stat: 'radiusLevel' // Max level 4 = 6x6 AoE
    },
    heal: {
        baseCost: 80, costIncrease: 10, effectIncrease: 2,
        requiredLevel: 18, maxLevel: 99, stat: 'amount'
    }
};

const PASSIVE_UPGRADE_COSTS = {
    tactical_command: 200,
    // gold_magnet is now a drop, removed from purchasable passives
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
const FLAME_WAVE_EFFECT_DELAY_MS = 1000; // Delay before damage applies
const FROST_NOVA_EXPAND_DURATION_MS = 500;
const POPUP_DURATION_MS = 1100;
const ITEM_DROP_ANIMATION_DURATION_MS = 400;
const ITEM_PICKUP_ANIMATION_DURATION_MS = 300;
const ITEM_MAGNET_FLY_DURATION_MS = 500;
const OBSTACLE_DESTROY_DURATION_MS = 300;
const FROST_VISUAL_FADE_OFFSET = 300; // ms earlier visual effect fades


/**
 * Obstacle Configuration
 */
const MIN_OBSTACLES = 4;
const MAX_OBSTACLES_PER_LEVEL_FACTOR = 0.08;
const WALL_ROCK_CHANCE = 0.4;
const DOOR_CHANCE = 0.15;
const TOWER_SPAWN_CHANCE_PER_LEVEL = 0.1;
const MAX_TOWERS_PER_LEVEL = 1;

/**
 * Item Configuration
 */
const GOLD_DROP_CHANCE = 0.35;
const BASE_GOLD_DROP_AMOUNT = 1;
const ADVANCED_GOBLIN_TYPES = ['goblin_archer', 'goblin_netter', 'goblin_club', 'orc_juggernaut', 'goblin_shaman', 'goblin_sapper', 'goblin_pyromancer', 'goblin_treasure_hunter'];
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

/**
 * Entity Data Definitions
 */
const UNIT_DATA = {
    // Player Units
    knight:         { name: "Knight",           baseHp: 6, baseAtk: 1, mov: 3, range: 1, team: 'player', spriteUrl: './sprites/Knight.png', deadSpriteUrl: './sprites/Knight_dead.png', portraitUrl: './sprites/knight_portrait.png', id_prefix: 'k' },
    archer:         { name: "Archer",           baseHp: 3, baseAtk: 1, mov: 2, range: 4, team: 'player', spriteUrl: './sprites/archer.png', deadSpriteUrl: './sprites/archer_dead.png', portraitUrl: './sprites/archer_portrait.png', id_prefix: 'a' },
    champion:       { name: "Champion",         baseHp: 5, baseAtk: 2, mov: 3, range: 1, team: 'player', cleaveDamage: 1, spriteUrl: './sprites/champion.png', deadSpriteUrl: './sprites/champion_dead.png', portraitUrl: './sprites/champion_portrait.png', id_prefix: 'c' },
    // Enemy Units
    goblin:         { name: "Goblin",           baseHp: 2, baseAtk: 1, mov: 4, range: 1, team: 'enemy',  spriteUrl: './sprites/goblin.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_portrait.png', id_prefix: 'g' },
    goblin_archer:  { name: "Goblin Archer",    baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy',  spriteUrl: './sprites/goblin_archer.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_archer_portrait.png', id_prefix: 'ga' },
    goblin_netter:  { name: "Goblin Netter",    baseHp: 1, baseAtk: 0, mov: 3, range: 3, team: 'enemy',  canNet: true, netCooldown: NET_COOLDOWN, spriteUrl: './sprites/goblin_netter.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_netter_portrait.png', id_prefix: 'gn' },
    goblin_club: { name: "Goblin Clubber",   baseHp: 3, baseAtk: 2, mov: 3, range: 1, team: 'enemy',  knockback: true, spriteUrl: './sprites/goblin_club.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_club_portrait.png', id_prefix: 'gc' },
    orc_juggernaut: { name: "Orc Juggernaut",   baseHp: 8, baseAtk: 3, mov: 2, range: 1, team: 'enemy',  knockback: true, spriteUrl: './sprites/orc_juggernaut.png', deadSpriteUrl: './sprites/orc_juggernaut_dead.png', portraitUrl: './sprites/orc_juggernaut_portrait.png', id_prefix: 'oj' },
    goblin_shaman:  { name: "Goblin Shaman",    baseHp: 2, baseAtk: 0, mov: 3, range: 5, team: 'enemy',  healAmount: SHAMAN_HEAL_AMOUNT, canSummonTotem: true, totemCooldown: 0, totemType: 'shaman_totem', spriteUrl: './sprites/goblin_shaman.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_shaman_portrait.png', id_prefix: 'gsh' },
    shaman_totem:   { name: "Healing Totem",    baseHp: SHAMAN_TOTEM_HP, baseAtk: SHAMAN_TOTEM_ATK, mov: 0, range: 3, team: 'enemy', healAmount: SHAMAN_TOTEM_HEAL, spriteUrl: './sprites/totem.png', deadSpriteUrl: './sprites/totem_dead.png', portraitUrl: './sprites/totem.png', id_prefix: 'gst', isTotem: true },
    goblin_sapper:  { name: "Goblin Sapper",    baseHp: 1, baseAtk: 1, mov: 2, range: 1, team: 'enemy',  suicideExplode: true, explodeOnDeath: true, explosionDamage: SAPPER_EXPLOSION_DAMAGE, explosionRadius: SAPPER_EXPLOSION_RADIUS, spriteUrl: './sprites/goblin_sapper.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_sapper_portrait.png', id_prefix: 'gsa' },
    goblin_pyromancer:{ name: "Goblin Pyromancer", baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy', shootsFireball: true, canCastFlameWave: true, fireballDamage: PYRO_FIREBALL_DAMAGE, flameWaveDamage: PYRO_FLAME_WAVE_DAMAGE, flameWaveCooldown: PYRO_FLAME_WAVE_COOLDOWN, spriteUrl: './sprites/goblin_pyromancer.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_pyromancer_portrait.png', id_prefix: 'gp' },
    goblin_treasure_hunter: { name: "Goblin Treasure Hunter", baseHp: 5, baseAtk: 1, mov: 5, range: 1, team: 'enemy', isTreasureHunter: true, spriteUrl: './sprites/goblin_treasure.png', deadSpriteUrl: './sprites/goblin_dead.png', portraitUrl: './sprites/goblin_treasure_portrait.png', id_prefix: 'gth' },
};

const OBSTACLE_DATA = {
    rock:       { hp: 999, blocksMove: true,  blocksLOS: false, spriteClass: 'rock',      destructible: false, enterable: false },
    wall_rock:  { hp: 999, blocksMove: true,  blocksLOS: true,  spriteClass: 'wall_rock', destructible: false, enterable: false },
    door:       { hp: 1,   blocksMove: true,  blocksLOS: true,  spriteClass: 'door',      destructible: true,  enterable: false },
    tower:      { hp: 3,   blocksMove: false, blocksLOS: false, spriteClass: 'tower',     destructible: true,  enterable: true, rangeBonus: 1 },
    snowman:    { hp: 1,   blocksMove: true,  blocksLOS: false, spriteClass: 'snowman',   destructible: true,  enterable: false, hiddenUnitType: 'goblin', hiddenUnitVariant: 'blue', hidesUnit: true },
};

const ITEM_DATA = {
    gold:           { spriteClass: 'gold-coin',     zIndex: 9, pickupAction: 'addGold', value: 1 },
    chest:          { spriteClass: 'chest',         zIndex: 7, pickupAction: 'openChest', baseGoldAmount: CHEST_BASE_GOLD_AMOUNT },
    health_potion:  { spriteClass: 'health-potion', zIndex: 8, pickupAction: 'healUnit', value: HEALTH_POTION_HEAL_AMOUNT },
    shiny_gem:      { spriteClass: 'shiny-gem',     zIndex: 8, pickupAction: 'addGold', valueMin: SHINY_GEM_MIN_GOLD, valueMax: SHINY_GEM_MAX_GOLD },
    gold_magnet:    { spriteClass: 'gold-magnet',   zIndex: 8, pickupAction: 'upgradeGoldMagnet', value: 1 } // Value represents the level increase
};

const PASSIVE_DATA = {
    gold_magnet: { name: "Gold Magnet", description: "Automatically collect gold from nearby squares.", icon: "./sprites/gold_magnet.png" }, // Updated description
    tactical_command: { name: "Tactical Command", description: `Increases max roster size by 1 (Max ${MAX_ACTIVE_ROSTER_SIZE_MAX}).`, icon: "./sprites/icon_troop_increase.png" },
};

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
const GOBLIN_TREASURE_HUNTER_VARIANT = 'green'; // Treasure hunter always looks the same?

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
const LEVELS_PER_PAGE = 60;

const LEVEL_COMPLETE_BONUS_GOLD = {
    noSpells: 10,
    fullHp: 20,
    noLosses: 10
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
const STORAGE_KEY_PASSIVE_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}passiveUpgrades`;
const STORAGE_KEY_CHEAT_SPELL_ATK = `${STORAGE_KEY_GAME_PREFIX}cheatSpellAtkBonus`;
const STORAGE_KEY_SETTINGS = `${STORAGE_KEY_GAME_PREFIX}settings`;
const STORAGE_KEY_MAX_ROSTER_SIZE = `${STORAGE_KEY_GAME_PREFIX}maxRosterSize`;
const STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL = `${STORAGE_KEY_GAME_PREFIX}lastTreasureHunterLevel`; // For spawn cooldown
const LEADERBOARD_STORAGE_KEY = `${STORAGE_KEY_GAME_PREFIX}leaderboard`;
const MAX_LEADERBOARD_ENTRIES = 10;

/**
 * Recolor Configuration
 */
const SPRITE_KEYS_FOR_RECOLOR = [
    'goblin_club', 'goblin', 'goblin_archer',
    'goblin_netter', 'goblin_pyromancer', 'goblin_sapper',
    'goblin_shaman', 'goblin_dead', // Base dead sprite
    // Portraits
    'goblin_portrait', 'goblin_archer_portrait', 'goblin_netter_portrait',
    'goblin_club_portrait', 'goblin_shaman_portrait', 'goblin_sapper_portrait',
    'goblin_pyromancer_portrait'
    // Treasure hunter likely won't be recolored, Juggernaut might need its own base color
];
const TARGET_GREEN_RGB = { r: 34, g: 135, b: 28 };
const COLOR_TOLERANCE = 10;
const REPLACEMENT_VARIANTS = {
    red:    { r: 191, g: 13,  b: 40 }, // Castle
    blue:   { r: 0,  g: 147, b: 255 }, // Snow
    yellow: { r: 255, g: 186, b: 0 }  // Wasteland
};

/**
 * Audio Initialization & Playback Functions (Kept in config as requested)
 */
function loadSfx() {
    if (Object.keys(sfx).length > 0 || typeof Audio === 'undefined') return;
    Object.keys(SFX_FILES).forEach(key => {
        try {
            sfx[key] = new Audio(SFX_FILES[key]);
            sfx[key].preload = 'auto';
            // Assign initial volumes
            switch(key) {
                case 'success': case 'error': case 'levelSelect': case 'startBeep': case 'forfeit': sfx[key].volume = 0.6; break;
                case 'gameOver': case 'fireballHit': case 'sapperExplode': sfx[key].volume = 0.8; break;
                case 'hit': case 'defeat': case 'playerDie': case 'fireballShoot': case 'flameWaveCast':
                case 'frostNovaHit': case 'heal': case 'pickup': case 'chestOpen': case 'cheat':
                case 'net_hit': case 'slow_inflicted': case 'shopBuy': case 'levelComplete': case 'potionPickup':
                case 'gemPickup': case 'doorDestroy': case 'towerDestroy': case 'shamanHeal': case 'pyroFireball':
                case 'pyroFlameWave': case 'snowmanReveal': sfx[key].volume = 0.7; break;
                case 'move': case 'towerExit': sfx[key].volume = 0.4; break;
                case 'select': case 'menuOpen': case 'menuClose': case 'arrowShoot': case 'towerEnter':
                case 'shamanTotem': sfx[key].volume = 0.5; break;
                case 'goldDrop': case 'net_throw': sfx[key].volume = 0.6; break;
                case 'playerHurt1': case 'playerHurt2': sfx[key].volume = 0.9; break; // Make hurt sounds louder
                default: sfx[key].volume = 0.6; break;
            }
        } catch (e) {
            console.error(`Error loading SFX ${key}: ${SFX_FILES[key]}`, e);
        }
    });
}

function playSfx(soundKey) {
    const sound = sfx[soundKey];
    if (isMuted || !audioInitialized || !sound) return;
    try {
        if (!sound.paused) {
            sound.pause();
            sound.currentTime = 0;
        }
        sound.play().catch(error => {
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                 console.warn(`SFX play error (${soundKey}): ${error.name} - ${error.message}`);
            }
        });
    } catch (e) {
        console.error(`Error attempting to play SFX ${soundKey}:`, e);
    }
}

function playMusic(trackUrl) {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined' || !trackUrl) return;
    const musicUrl = new URL(trackUrl, window.location.href).href;
    if (bgMusic.src !== musicUrl) {
        bgMusic.src = musicUrl;
        bgMusic.load();
    }
    if (bgMusic.paused) {
        bgMusic.play().catch(error => {
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                 console.warn(`Music play error: ${error.name} - ${error.message}`);
            }
        });
    }
}

function startMusic() {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined') return;
    if (!bgMusic.src || bgMusic.ended) {
        selectAndLoadMusic(); // Selects random track
    }
    if (bgMusic.paused) {
        bgMusic.play().catch(error => {
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                 console.warn(`Music play error: ${error.name} - ${error.message}`);
            }
        });
    }
}

function stopMusic() {
    if (bgMusic && !bgMusic.paused) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
    if (victoryMusicPlayer && !victoryMusicPlayer.paused) {
        victoryMusicPlayer.pause();
        victoryMusicPlayer.currentTime = 0;
    }
}

function playVictoryMusic() {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined' || !VICTORY_MUSIC) return;
    stopMusic(); // Stop regular music first
    victoryMusicPlayer.src = new URL(VICTORY_MUSIC, window.location.href).href;
    victoryMusicPlayer.load();
    victoryMusicPlayer.play().catch(error => {
        if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
             console.warn(`Victory Music play error: ${error.name} - ${error.message}`);
        }
    });
}

function selectAndLoadMusic() {
    if (MUSIC_TRACKS.length === 0 || typeof Audio === 'undefined') { bgMusic.src = ''; return; }
    let nextTrackIndex;
    if (MUSIC_TRACKS.length === 1) { nextTrackIndex = 0; }
    else {
        const currentTrackName = bgMusic.src ? bgMusic.src.substring(bgMusic.src.lastIndexOf('/') + 1) : null;
        const currentTrackIndex = MUSIC_TRACKS.findIndex(track => track.endsWith(currentTrackName));
        do { nextTrackIndex = Math.floor(Math.random() * MUSIC_TRACKS.length); }
        while (nextTrackIndex === currentTrackIndex && MUSIC_TRACKS.length > 1);
    }
    const nextTrack = MUSIC_TRACKS[nextTrackIndex];
    playMusic(nextTrack); // Use playMusic to handle loading and playing
}

function initializeAudio() {
    if (audioInitialized || typeof Audio === 'undefined') return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn("Web Audio API not supported."); audioInitialized = true; loadSfx(); return true; }
    const context = new AC();

    const unlockAudio = () => {
        if (context.state === 'running') {
            document.removeEventListener('click', unlockAudio, true);
            document.removeEventListener('keydown', unlockAudio, true);
            document.removeEventListener('touchstart', unlockAudio, true);
            if (!audioInitialized) { audioInitialized = true; loadSfx(); startMusicIfNotPlaying(); }
            return;
        }
        context.resume().then(() => {
            if (!audioInitialized) { audioInitialized = true; loadSfx(); startMusicIfNotPlaying(); }
            document.removeEventListener('click', unlockAudio, true);
            document.removeEventListener('keydown', unlockAudio, true);
            document.removeEventListener('touchstart', unlockAudio, true);
        }).catch(err => {
            console.error("Failed to resume AudioContext:", err);
            if (!audioInitialized) { audioInitialized = true; loadSfx(); } // Load SFX even if resume fails
        });
    };

    if (context.state === 'suspended') {
        const eventOptions = { once: true, capture: true };
        document.addEventListener('click', unlockAudio, eventOptions);
        document.addEventListener('keydown', unlockAudio, eventOptions);
        document.addEventListener('touchstart', unlockAudio, eventOptions);
        return false; // Audio not yet unlocked
    } else {
        audioInitialized = true;
        loadSfx(); // Already running or unsupported, load SFX
        return true; // Audio is ready or not needed
    }
}

function startMusicIfNotPlaying() {
    if (!audioInitialized || isMuted || (victoryMusicPlayer && !victoryMusicPlayer.paused)) return; // Don't start if victory playing

    // Check if UI context is available (can be called before UI is fully defined)
    const canCheckUI = typeof isGameActive === 'function' && typeof isGameOver === 'function' &&
                       typeof isMenuOpen === 'function' && typeof isLeaderboardOpen === 'function' &&
                       typeof isShopOpen === 'function' && typeof isLevelSelectOpen === 'function' &&
                       typeof isMainMenuOpen === 'function' && typeof isLevelCompleteOpen === 'function' &&
                       typeof isChooseTroopsScreenOpen === 'function';

    if (!canCheckUI) {
        // Fallback: Play if no overlay seems visible (less reliable)
        if (!document.querySelector('.overlay.visible') && bgMusic.paused) {
            startMusic();
        }
        return;
    }

    // Determine if music should play based on current UI state
    const canPlayMusic = isGameActive() && !isGameOver() && !isMenuOpen() && !isLeaderboardOpen() &&
                         !isShopOpen() && !isLevelSelectOpen() && !isMainMenuOpen() &&
                         !isLevelCompleteOpen() && !isChooseTroopsScreenOpen();

    if (canPlayMusic && bgMusic.paused) {
        startMusic();
    }
}

/**
 * Helper function to get world/variant info (kept in config for access)
 */
function getTilesetForLevel(level) {
    const levelIndex = level - 1;
    // Use base level for visual cycling, handles infinite levels
    const baseLevelIndex = levelIndex % TOTAL_LEVELS_BASE;
    const effectiveQuadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS;

    let tilesetName;
    switch (effectiveQuadrantIndex) {
        case 0: tilesetName = 'grass'; break;
        case 1: tilesetName = 'castle'; break;
        case 2: tilesetName = 'wasteland'; break;
        case 3: tilesetName = 'snow'; break;
        default: tilesetName = 'grass';
    }
    const tilesetUrl = TILESET_IMAGES[tilesetName] || TILESET_IMAGES.grass;
    const variant = TILESET_GOBLIN_VARIANT_MAP[tilesetName] || 'green';
    return { url: tilesetUrl, variant: variant, name: tilesetName, quadrant: effectiveQuadrantIndex };
}