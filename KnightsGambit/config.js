// config.js





let sfx = {};
const bgMusic = new Audio();
bgMusic.loop = true;
const victoryMusicPlayer = new Audio();
victoryMusicPlayer.loop = false;
let isMuted = false;
let audioInitialized = false;
let musicVolume = 0.3;
let sfxVolume = 0.6;

const BASE_GRID_COLS = 8;
const BASE_GRID_ROWS = 10;
const ENEMY_SPAWN_ROWS_PERCENT = 0.5;
const PLAYER_SPAWN_ROWS_PERCENT = 0.2;
const MIN_ENEMY_PLAYER_START_DISTANCE = 4;

const DEFAULT_ICON_WIDTH = 40;
const DEFAULT_ICON_HEIGHT = 40;

const LEVELS_PER_WORLD = 15;
const TOTAL_WORLDS = 4;
const TOTAL_LEVELS_BASE = LEVELS_PER_WORLD * TOTAL_WORLDS;
const ENABLE_INFINITE_LEVELS = true;
const INFINITE_LEVEL_START = TOTAL_LEVELS_BASE + 1;
const INFINITE_HP_BONUS_PER_CYCLE = 1;
const INFINITE_ATK_BONUS_PER_CYCLE = 1;
const IMMUNITY_LEVEL_START = INFINITE_LEVEL_START;

const FORFEIT_MOVE_THRESHOLD = 2;

const MAX_OWNED_PER_TYPE = 12;
const MAX_ACTIVE_ROSTER_SIZE_BASE = 8;
const MAX_ACTIVE_ROSTER_SIZE_MAX = 12;

const NET_DURATION = 2;
const NET_COOLDOWN = 3;
const SHAMAN_HEAL_AMOUNT = 1;
const SHAMAN_TOTEM_HP = 1;
const SHAMAN_TOTEM_ATK = 0;
const SHAMAN_TOTEM_HEAL = 1;
const SHAMAN_TOTEM_RANGE = 5;
const SHAMAN_TOTEM_COOLDOWN = 3;
const PYRO_FIREBALL_DAMAGE = 2;
const PYRO_FLAME_WAVE_DAMAGE = 2;
const PYRO_FLAME_WAVE_COOLDOWN = 4;
const SAPPER_EXPLOSION_DAMAGE = 3;
const SAPPER_EXPLOSION_RADIUS = 1;
const GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN = 1;
const GOBLIN_TREASURE_HUNTER_GOLD_DROP_MAX = 4;
const TREASURE_HUNTER_SPAWN_COOLDOWN = 30;
const TREASURE_HUNTER_SPAWN_CHANCE = 0.1;
const GOLD_MAGNET_BASE_RADIUS = 1;
const ROGUE_STEALTH_MOVE_PENALTY = 2;
const ROGUE_QUICK_STRIKE_MOVE_PENALTY = 2;
const ROGUE_STEALTH_DAMAGE_BONUS = 1;

const GOBLIN_ARCHER_INTRO_LEVEL = 3;
const CLUBBER_INTRO_LEVEL = 7;
const JUGGERNAUT_INTRO_LEVEL = 10;
const GOBLIN_NETTER_INTRO_LEVEL = 12;
const GOBLIN_SHAMAN_INTRO_LEVEL = 14;
const GOBLIN_TREASURE_HUNTER_INTRO_LEVEL = 15;
const GOBLIN_PYROMANCER_INTRO_LEVEL = 16;
const GOBLIN_SAPPER_INTRO_LEVEL = 18;
const SNOWMAN_INTRO_LEVEL = 46;
const ELITE_ENEMY_START_LEVEL = 10;
const ELITE_ENEMY_CHANCE = 0.15;
const JUGGERNAUT_SPAWN_LEVEL_MULTIPLE = 15;

const GOBLIN_RED_ATK_BONUS = 1;
const GOBLIN_BLUE_HP_BONUS = 1;
const GOBLIN_BLUE_SLOW_DURATION = 2;
const GOBLIN_YELLOW_MOV_BONUS = 1;
const GOBLIN_YELLOW_DOUBLE_TURN = true;
const ELITE_STAT_BONUS = { hp: 1, atk: 1 };

const FIREBALL_UNLOCK_LEVEL = 4;
const FLAME_WAVE_UNLOCK_LEVEL = 8;
const FROST_NOVA_UNLOCK_LEVEL = 12;
const HEAL_UNLOCK_LEVEL = 16;

const FIREBALL_BASE_DAMAGE = 2;
const FLAME_WAVE_BASE_DAMAGE = 1;
const FROST_NOVA_BASE_DURATION = 3;
const FROST_NOVA_BASE_RADIUS_LEVEL = 1;
const HEAL_BASE_AMOUNT = 3;

const RECRUIT_BASE_COSTS = {
    knight: 50,
    archer: 80,
    champion: 120,
    rogue: 150,
};
const RECRUIT_COST_INCREASE_PER_UNIT = 5;

const UNIT_UPGRADE_COSTS = {
    knight_hp: { baseCost: 50, costIncrease: 25 }, knight_atk: { baseCost: 50, costIncrease: 25 },
    archer_hp: { baseCost: 50, costIncrease: 25 }, archer_atk: { baseCost: 80, costIncrease: 40 },
    champion_hp: { baseCost: 100, costIncrease: 50 }, champion_atk: { baseCost: 100, costIncrease: 50 },
    rogue_hp: { baseCost: 75, costIncrease: 35 }, rogue_atk: { baseCost: 75, costIncrease: 35 },
};

const ABILITY_UPGRADE_COSTS = {
    rogue_quickstrike: 100,
};

const SPELL_UPGRADE_CONFIG = {
    fireball: { baseCost: 80, costIncrease: 10, effectIncrease: 1, requiredLevel: 6, maxLevel: 99, stat: 'damage', name: "Fireball" },
    flameWave: { baseCost: 100, costIncrease: 30, effectIncrease: 1, requiredLevel: 10, maxLevel: 99, stat: 'damage', name: "Flame Wave" },
    frostNova: { baseCost: 80, costIncrease: 20, effectIncrease: 1, requiredLevel: 14, maxLevel: 4, stat: 'radiusLevel', name: "Frost Nova" },
    heal: { baseCost: 80, costIncrease: 10, effectIncrease: 2, requiredLevel: 18, maxLevel: 99, stat: 'amount', name: "Heal" }
};

const PASSIVE_UPGRADE_COSTS = {
    tactical_command: 200,
};
const TACTICAL_COMMAND_UNLOCK_UNITS = 8;

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
const MOBILE_TOOLTIP_DURATION_MS = 1000;
const ITEM_DROP_ANIMATION_DURATION_MS = 400;
const ITEM_PICKUP_ANIMATION_DURATION_MS = 300;
const ITEM_MAGNET_FLY_DURATION_MS = 500;
const OBSTACLE_DESTROY_DURATION_MS = 300;
const FROST_VISUAL_FADE_OFFSET = 300;

const MIN_OBSTACLES = 4;
const MAX_OBSTACLES_PER_LEVEL_FACTOR = 0.08;
const WALL_ROCK_CHANCE = 0.4;
const DOOR_CHANCE = 0.15;
const TOWER_SPAWN_CHANCE_PER_LEVEL = 0.1;
const MAX_TOWERS_PER_LEVEL = 1;
const SNOWMAN_SPAWN_CHANCE_IN_SNOW = 0.3;
const SNOWMAN_MAX_PER_LEVEL = 3;

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
const SPELLBOOK_DROP_CHANCE_ENEMY = 0.005;
const SPELLBOOK_DROP_CHANCE_CHEST = 0.008;
const SPELLBOOK_REQUIRED_SPELL_USE = true;

const SPRITESHEET_CONFIG = {
    player: {
        basePathFormat: './sprites/humans_{variant}.png',
        columns: 3, rows: 4,
        sheetWidth: 120, sheetHeight: 160, iconWidth: 40, iconHeight: 40,
        unitRows: { knight: 0, archer: 1, champion: 2, rogue: 3 }
    },
    goblin: {
        basePathFormat: './sprites/goblins_{variant}.png',
        columns: 3, rows: 9,
        sheetWidth: 120, sheetHeight: 360, iconWidth: 40, iconHeight: 40,
        unitRows: { goblin: 0, goblin_archer: 1, goblin_club: 2, goblin_netter: 3, goblin_pyromancer: 4, goblin_sapper: 5, goblin_shaman: 6, goblin_treasure_hunter: 7, orc_juggernaut: 8 }
    },
    items: {
        imageUrl: './sprites/items.png',
        columns: 2, rows: 4,
        sheetWidth: 80, sheetHeight: 160, iconWidth: 40, iconHeight: 40,
        icons: { chest_opened: { col: 1, row: 0 }, chest_closed: { col: 0, row: 0 }, gold: { col: 0, row: 1 }, gold_magnet: { col: 1, row: 1 }, health_potion: { col: 0, row: 2 }, shiny_gem: { col: 1, row: 2 }, spellbook: { col: 0, row: 3 }, net: { col: 1, row: 3 } }
    },
    armor_icons: {
        imageUrl: './sprites/armor.png',
        columns: 5, rows: 1,
        sheetWidth: 200, sheetHeight: 40, iconWidth: 40, iconHeight: 40,
        icons: { grey: { col: 0, row: 0 }, green: { col: 1, row: 0 }, red: { col: 2, row: 0 }, yellow: { col: 3, row: 0 }, blue: { col: 4, row: 0 } }
    }
};

const UNIT_DATA = {
    knight: { name: "Knight", baseHp: 6, baseAtk: 1, mov: 3, range: 1, team: 'player', id_prefix: 'k', useSpritesheet: 'player', armor_type: 'grey', iconPath: './sprites/knight_icon.png' },
    archer: { name: "Archer", baseHp: 3, baseAtk: 1, mov: 2, range: 4, team: 'player', id_prefix: 'a', useSpritesheet: 'player', shootsProjectileType: 'arrow', armor_type: 'grey', iconPath: './sprites/archer_icon.png' },
    champion: { name: "Champion", baseHp: 5, baseAtk: 2, mov: 3, range: 1, team: 'player', id_prefix: 'c', useSpritesheet: 'player', cleaveDamage: 1, armor_type: 'grey', iconPath: './sprites/champion_icon.png' },
    rogue: { name: "Rogue", baseHp: 3, baseAtk: 1, mov: 5, range: 1, team: 'player', id_prefix: 'r', useSpritesheet: 'player', canStealth: true, canQuickStrike: false, armor_type: 'grey', iconPath: './sprites/rogue_icon.png' },

    goblin: { name: "Goblin", baseHp: 2, baseAtk: 1, mov: 4, range: 1, team: 'enemy', id_prefix: 'g', useSpritesheet: 'goblin' },
    goblin_archer: { name: "Goblin Archer", baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy', id_prefix: 'ga', useSpritesheet: 'goblin', shootsProjectileType: 'arrow' },
    goblin_netter: { name: "Goblin Netter", baseHp: 1, baseAtk: 0, mov: 3, range: 3, team: 'enemy', id_prefix: 'gn', useSpritesheet: 'goblin', canNet: true, netCooldown: NET_COOLDOWN, shootsProjectileType: 'net', baseMeleeAtk: 1 },
    goblin_club: { name: "Goblin Clubber", baseHp: 3, baseAtk: 2, mov: 3, range: 1, team: 'enemy', id_prefix: 'gc', useSpritesheet: 'goblin', knockback: true },
    goblin_shaman: { name: "Goblin Shaman", baseHp: 2, baseAtk: 0, mov: 3, range: 5, team: 'enemy', id_prefix: 'gsh', useSpritesheet: 'goblin', healAmount: SHAMAN_HEAL_AMOUNT, canSummonTotem: true, totemCooldown: SHAMAN_TOTEM_COOLDOWN, totemType: 'shaman_totem', meleeOnlyAttack: true, baseMeleeAtk: 1 },
    goblin_sapper: { name: "Goblin Sapper", baseHp: 1, baseAtk: 1, mov: 2, range: 1, team: 'enemy', id_prefix: 'gsa', useSpritesheet: 'goblin', suicideExplode: true, explodeOnDeath: true, explosionDamage: SAPPER_EXPLOSION_DAMAGE, explosionRadius: SAPPER_EXPLOSION_RADIUS },
    goblin_pyromancer: { name: "Goblin Pyromancer", baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy', id_prefix: 'gp', useSpritesheet: 'goblin', shootsProjectileType: 'fireball', canCastFlameWave: true, fireballDamage: PYRO_FIREBALL_DAMAGE, flameWaveDamage: PYRO_FLAME_WAVE_DAMAGE, flameWaveCooldown: PYRO_FLAME_WAVE_COOLDOWN },
    goblin_treasure_hunter: { name: "Goblin Treasure Hunter", baseHp: 5, baseAtk: 1, mov: 5, range: 1, team: 'enemy', id_prefix: 'gth', useSpritesheet: 'goblin', isTreasureHunter: true, flees: true },
    orc_juggernaut: { name: "Orc Juggernaut", baseHp: 8, baseAtk: 3, mov: 2, range: 1, team: 'enemy', id_prefix: 'oj', useSpritesheet: 'goblin', isBoss: true, dropsArmor: true },
    shaman_totem: { name: "Healing Totem", baseHp: SHAMAN_TOTEM_HP, baseAtk: SHAMAN_TOTEM_ATK, mov: 0, range: SHAMAN_TOTEM_RANGE, team: 'enemy', id_prefix: 'gst', iconPath: './sprites/totem.png', deadSpriteUrl: './sprites/totem_dead.png', isTotem: true, healAmount: SHAMAN_TOTEM_HEAL },
};

const OBSTACLE_DATA = {
    rock: { hp: 999, blocksMove: true, blocksLOS: false, spriteClass: 'rock', destructible: false, enterable: false, canBeAttacked: false },
    wall_rock: { hp: 999, blocksMove: true, blocksLOS: true, spriteClass: 'wall_rock', destructible: false, enterable: false, canBeAttacked: false },
    door: { id: 'door', name: 'Door', hp: 1, maxHp: 1, blocksMove: true, blocksLOS: true, spriteClass: 'door', destructible: true, enterable: false, canBeAttacked: true },
    tower: { hp: 3, blocksMove: false, blocksLOS: false, spriteClass: 'tower', destructible: true, enterable: true, canBeAttacked: true, rangeBonus: 1 },
    snowman: { id: 'snowman', name: 'Happy Innocent Snowman', hp: 1, maxHp: 1, blocksMove: true, blocksLOS: false, spriteClass: 'snowman', destructible: true, enterable: false, canBeAttacked: true, hidesUnit: true, hiddenUnitType: 'goblin', hiddenUnitVariant: 'blue', clickable: true, description: "A cheerful snowman. It seems to be hiding something...", portraitUrl: './sprites/snowman.png', spriteUrl: './sprites/snowman.png' },
};

const ITEM_DATA = {
    gold: { pickupAction: 'addGold', value: 1, zIndex: 9, spriteClass: 'icon-gold' },
    chest: { pickupAction: 'openChest', baseGoldAmount: CHEST_BASE_GOLD_AMOUNT, zIndex: 7, spriteClass: 'icon-chest-closed', openedSpriteClass: 'icon-chest-opened' },
    health_potion: { pickupAction: 'healUnit', value: HEALTH_POTION_HEAL_AMOUNT, zIndex: 8, spriteClass: 'icon-potion' },
    shiny_gem: { pickupAction: 'addGold', valueMin: SHINY_GEM_MIN_GOLD, valueMax: SHINY_GEM_MAX_GOLD, zIndex: 8, spriteClass: 'icon-gem' },
    gold_magnet: { pickupAction: 'upgradeGoldMagnet', value: 1, zIndex: 8, spriteClass: 'icon-goldmagnet' },
    spellbook: { pickupAction: 'restoreSpell', value: 1, zIndex: 8, spriteClass: 'icon-spellbook' },
    armor: { pickupAction: 'collectArmor', value: 1, zIndex: 8 }
};

const PASSIVE_DATA = {
    gold_magnet: { name: "Gold Magnet", description: "Automatically collect gold from nearby squares.", iconClass: "icon-goldmagnet" },
    tactical_command: { name: "Tactical Command", description: `Increases max roster size by 1 (Max ${MAX_ACTIVE_ROSTER_SIZE_MAX}).`, iconClass: "icon-tacticalcommand" },
};
const ARMOR_DATA = {
    none: { id: 'none', name: 'No Armor', description: '+1 MOV', hpBonus: -99, atkBonus: 0, movBonus: 1, resistances: {}, activation: null, color: '#ffdab9', iconClass: 'icon-armor-none', iconPath: './sprites/armor_none.png' },
    grey: { id: 'grey', name: 'Grey Armor', description: 'Standard issue, no bonuses.', hpBonus: 0, atkBonus: 0, movBonus: 0, resistances: {}, activation: null, color: '#9a9a9a', iconClass: 'icon-armor-grey', iconPath: './sprites/armor_grey.png' },
    green: { id: 'green', name: 'Forest Armor', description: '-1 ATK from enemies (1 Turn)', hpBonus: 0, atkBonus: 0, movBonus: 0, resistances: {}, activation: { type: 'debuff_enemy_atk', value: 1, duration: 1, uses: 1 }, color: '#228B22', iconClass: 'icon-armor-green', iconPath: './sprites/armor_green.png' },
    blue: { id: 'blue', name: 'Azure Armor', description: '+1 HP', hpBonus: 1, atkBonus: 0, movBonus: 0, resistances: { frost: 1 }, activation: null, color: '#007FFF', iconClass: 'icon-armor-blue', iconPath: './sprites/armor_blue.png' },
    red: { id: 'red', name: 'Ember Armor', description: '+1 ATK', hpBonus: 0, atkBonus: 1, movBonus: 0, resistances: { fire: 1 }, activation: null, color: '#D22B2B', iconClass: 'icon-armor-red', iconPath: './sprites/armor_red.png' },
    yellow: { id: 'yellow', name: 'Sand Armor', description: '+1 MOV', hpBonus: 0, atkBonus: 0, movBonus: 1, resistances: {}, activation: null, color: '#C19A6B', iconClass: 'icon-armor-yellow', iconPath: './sprites/armor_yellow.png' },
};
const ARMOR_RESISTANCE_UPGRADE_LEVEL = 2;
const ARMOR_RESISTANCE_VALUE = 1;
const WORLD_ARMOR_MAP = { grass: 'green', castle: 'red', wasteland: 'yellow', snow: 'blue' };

const TILESET_IMAGES = {
    grass: './sprites/tile_grass.png',
    castle: './sprites/tile_castle.png',
    wasteland: './sprites/tile_wasteland.png',
    snow: './sprites/tile_snow.png'
};

const WORLD_THEME_MAP = {
    grass: 'green',
    castle: 'red',
    wasteland: 'yellow',
    snow: 'blue'
};

const GOBLIN_TREASURE_HUNTER_VARIANT = 'green';

const WORLD_ENEMY_POOL = {
    grass: { common: ['goblin'], uncommon: ['goblin_archer', 'goblin_club'], rare: ['goblin_netter', 'goblin_shaman'], boss: ['orc_juggernaut'] },
    castle: { common: ['goblin', 'goblin_sapper'], uncommon: ['goblin_club', 'goblin_archer'], rare: ['goblin_pyromancer'], boss: ['orc_juggernaut'] },
    wasteland: { common: ['goblin', 'goblin_archer'], uncommon: ['goblin_club', 'goblin_netter'], rare: ['goblin_shaman'], boss: ['orc_juggernaut'] },
    snow: { common: ['goblin', 'goblin_archer'], uncommon: ['goblin_club', 'goblin_shaman'], rare: [], boss: ['orc_juggernaut'] },
    infinite: { common: ['goblin', 'goblin_archer'], uncommon: ['goblin_club', 'goblin_netter', 'goblin_shaman', 'goblin_sapper', 'goblin_pyromancer'], rare: [], boss: ['orc_juggernaut'] }
};
const ADVANCED_ENEMY_TYPES = ['goblin_archer', 'goblin_netter', 'goblin_club', 'orc_juggernaut', 'goblin_shaman', 'goblin_sapper', 'goblin_pyromancer', 'goblin_treasure_hunter'];

const WORLD_MAP_IMAGE_URL = './sprites/world_map.png';
const VISUAL_QUADRANT_CENTERS = [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }];
const MOBILE_VISUAL_QUADRANT_CENTERS = [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }];
const WORLD_PATHS = [
    // World 1: Forest (Top Left)
    [
        { x: 42, y: 42 }, { x: 30, y: 45 }, { x: 15, y: 35 }, { x: 15, y: 20 }, { x: 25, y: 12 }, { x: 38, y: 20 }, { x: 28, y: 28 }
    ],
    // World 2: Castle (Top Right)
    [
        { x: 58, y: 42 }, { x: 70, y: 45 }, { x: 85, y: 35 }, { x: 85, y: 20 }, { x: 75, y: 12 }, { x: 62, y: 20 }, { x: 72, y: 28 }
    ],
    // World 3: Desert (Bottom Left)
    [
        { x: 42, y: 58 }, { x: 30, y: 55 }, { x: 15, y: 65 }, { x: 15, y: 80 }, { x: 25, y: 88 }, { x: 38, y: 80 }, { x: 28, y: 72 }
    ],
    // World 4: Ice (Bottom Right)
    [
        { x: 58, y: 58 }, { x: 70, y: 55 }, { x: 85, y: 65 }, { x: 85, y: 80 }, { x: 75, y: 88 }, { x: 62, y: 80 }, { x: 72, y: 72 }
    ]
];
const MOBILE_HORIZONTAL_STRETCH_FACTOR = 1.0;
const INITIAL_MAP_ZOOM_LEVEL = 1.0;
const MOBILE_INITIAL_MAP_ZOOM_LEVEL = 1.0;
const LEVELS_PER_PAGE = 60;

const LEVEL_COMPLETE_BONUS_GOLD = {
    noSpells: 10,
    fullHp: 20,
    noLosses: 10,
    noArmor: 25,
};

const STORAGE_KEY_GAME_PREFIX = 'knightsGambitRevamped_';
const STORAGE_KEY_HIGHEST_LEVEL = `${STORAGE_KEY_GAME_PREFIX}highestLevel`;
const STORAGE_KEY_GOLD = `${STORAGE_KEY_GAME_PREFIX}gold`;
const STORAGE_KEY_OWNED_UNITS = `${STORAGE_KEY_GAME_PREFIX}ownedUnits`;
const STORAGE_KEY_ACTIVE_ROSTER = `${STORAGE_KEY_GAME_PREFIX}activeRoster`;
const STORAGE_KEY_UNIT_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}unitUpgrades`;
const STORAGE_KEY_SPELL_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}spellUpgrades`;
const STORAGE_KEY_ABILITY_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}abilityUpgrades`;
const STORAGE_KEY_PASSIVE_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}passiveUpgrades`;
const STORAGE_KEY_OWNED_ARMOR = `${STORAGE_KEY_GAME_PREFIX}ownedArmor`;
const STORAGE_KEY_EQUIPPED_ARMOR = `${STORAGE_KEY_GAME_PREFIX}equippedArmor`;
const STORAGE_KEY_ACHIEVEMENT_PROGRESS = `${STORAGE_KEY_GAME_PREFIX}achievementProgress`;
const STORAGE_KEY_CHEAT_SPELL_ATK = `${STORAGE_KEY_GAME_PREFIX}cheatSpellAtkBonus`;
const STORAGE_KEY_SETTINGS = `${STORAGE_KEY_GAME_PREFIX}settings`;
const STORAGE_KEY_MAX_ROSTER_SIZE = `${STORAGE_KEY_GAME_PREFIX}maxRosterSize`;
const STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL = `${STORAGE_KEY_GAME_PREFIX}lastTreasureHunterLevel`;
const LEADERBOARD_STORAGE_KEY = `${STORAGE_KEY_GAME_PREFIX}leaderboard`;
const MAX_LEADERBOARD_ENTRIES = 10;

const ACHIEVEMENT_DATA = {
    kill_10_goblins: { title: "Goblin Foe", description: "Kill 10 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 10 }, reward: { gold: 10 } },
    kill_50_goblins: { title: "Goblin Slayer", description: "Kill 50 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 50 }, reward: { gold: 50 } },
    kill_100_goblins: { title: "Goblin Bane", description: "Kill 100 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 100 }, reward: { gold: 100 } },
    kill_500_goblins: { title: "Goblin Terror", description: "Kill 500 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 500 }, reward: { gold: 500 } },
    kill_1000_goblins: { title: "Goblin Nightmare", description: "Kill 1000 Goblins.", icon: "kill_goblin", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 1000 }, reward: { gold: 1000 } },
    kill_boss_forest: { title: "Forest Guardian", description: "Defeat the Forest World Boss (Level 15).", icon: "boss_defeat", condition: { type: "kill_boss", world: "grass" }, reward: { gold: 150 } },
    kill_boss_castle: { title: "Castle Crasher", description: "Defeat the Castle World Boss (Level 30).", icon: "boss_defeat", condition: { type: "kill_boss", world: "castle" }, reward: { gold: 200 } },
    kill_boss_wasteland: { title: "Wasteland Wanderer", description: "Defeat the Wasteland World Boss (Level 45).", icon: "boss_defeat", condition: { type: "kill_boss", world: "wasteland" }, reward: { gold: 250 } },
    kill_boss_snow: { title: "Snow Conqueror", description: "Defeat the Snow World Boss (Level 60).", icon: "boss_defeat", condition: { type: "kill_boss", world: "snow" }, reward: { gold: 300 } },
    beat_forest_world: { title: "Forest Explorer", description: "Complete the Forest World (Level 15).", icon: "world_complete", condition: { type: "reach_level", level: 16 }, reward: { gold: 100 } },
    beat_castle_world: { title: "Castle Sieger", description: "Complete the Castle World (Level 30).", icon: "world_complete", condition: { type: "reach_level", level: 31 }, reward: { gold: 150 } },
    beat_wasteland_world: { title: "Wasteland Survivor", description: "Complete the Wasteland World (Level 45).", icon: "world_complete", condition: { type: "reach_level", level: 46 }, reward: { gold: 200 } },
    beat_snow_world: { title: "Tundra Tamer", description: "Complete the Snow World (Level 60).", icon: "world_complete", condition: { type: "reach_level", level: 61 }, reward: { gold: 250 } },
    no_armor_victory: { title: "Born Leader", description: "Beat any level with 'No Armor' equipped (no losses).", icon: "no_armor", condition: { type: "level_complete_condition", condition: "no_armor" }, reward: { gold: 50 } },
    flawless_victory: { title: "Flawless Victory", description: "Beat a level with all units at full HP.", icon: "flawless", condition: { type: "level_complete_condition", condition: "full_hp" }, reward: { gold: 75 } },
    no_losses: { title: "No One Left Behind", description: "Beat a level without losing any units.", icon: "no_losses", condition: { type: "level_complete_condition", condition: "no_losses" }, reward: { gold: 40 } },
    no_spells: { title: "Might Over Magic", description: "Beat a level after unlocking spells without using any.", icon: "no_spells", condition: { type: "level_complete_condition", condition: "no_spells" }, reward: { gold: 30 } },
    recruit_knight: { title: "First Knight", description: "Recruit your first Knight.", icon: "recruit", condition: { type: "recruit", target: "knight", count: 1 }, reward: {} },
    recruit_archer: { title: "First Archer", description: "Recruit your first Archer.", icon: "recruit", condition: { type: "recruit", target: "archer", count: 1 }, reward: {} },
    recruit_champion: { title: "First Champion", description: "Recruit your first Champion.", icon: "recruit", condition: { type: "recruit", target: "champion", count: 1 }, reward: {} },
    recruit_rogue: { title: "First Rogue", description: "Recruit your first Rogue.", icon: "recruit", condition: { type: "recruit", target: "rogue", count: 1 }, reward: {} },
    full_party: { title: "Full Roster", description: "Fill your active roster to the maximum size.", icon: "full_party", condition: { type: "roster_full" }, reward: { gold: 100 } },
    collect_all_armor: { title: "Armored Core", description: "Collect all basic armor types (Forest, Azure, Ember, Sand).", icon: "all_armor", condition: { type: "collect_armor", count: 4 }, reward: { gold: 200 } },
};

const SFX_FILES = {
    error: './audio/Error.wav',
    gameOver: './audio/GameOver.wav',
    success: './audio/Success.wav',
    armorActivate: './audio/armor_activate.wav',
    armorEquip: './audio/armor_equip.wav',
    arrowShoot: './audio/arrow_shoot.wav',
    chestOpen: './audio/chest.wav',
    coin: './audio/coin.wav',
    enemyDie: './audio/enemy_die.wav',
    enemyHit: './audio/enemy_hit.wav',
    fireballShoot: './audio/fireball_shoot.wav',
    gem: './audio/gem.wav',
    goblinDie: './audio/goblin_die.mp3',
    goldDrop: './audio/gold_drop.wav',
    heal: './audio/heal.wav',
    jump: './audio/jump.wav',
    levelCleared: './audio/level_cleared.wav',
    netHit: './audio/net_hit.wav',
    netThrow: './audio/net_throw.wav',
    pickup: './audio/pickup.wav',
    playerDie: './audio/player_die.wav',
    playerHurt1: './audio/player_hurt1.wav',
    playerHurt2: './audio/player_hurt2.wav',
    powerup: './audio/powerup.wav',
    fireballCast: './audio/sfxFireballCast.wav',
    fireballHit: './audio/sfxFireballHit.wav',
    frostboltCast: './audio/sfxFrostboltCast.wav',
    frostboltHit: './audio/sfxFrostboltHit.wav',
    goblinDead: './audio/sfxGoblinDead.wav',
    hit: './audio/sfxHit.wav',
    move: './audio/sfxMove.wav',
    select: './audio/sfxSelect.wav',
    shoot: './audio/shoot.wav',
    snowmanBreak: './audio/snowman_break.wav',
    spellbookPickup: './audio/spellbook_pickup.wav',
    startBeep: './audio/start_beep.wav'
};

const MUSIC_TRACKS = [
    './audio/music_Luffy.mp3',
    './audio/music_Treasure.mp3',
    './audio/music_WarcraftOrc.mp3',
    './audio/music_WormsTheme.mp3'
];

const VICTORY_MUSIC = './audio/music_victory.mp3';

const DEFAULT_GAME_SETTINGS = {
    showHpBars: false,
    playerName: "Hero",
    musicVolume: 0.3,
    sfxVolume: 0.6,
    mute: false,
};

function getSpritePositionStyles(unitType, frameType = 'idle', variant = null) {
    const unitData = UNIT_DATA[unitType] || OBSTACLE_DATA[unitType];
    if (!unitData || (!unitData.useSpritesheet && !unitData.portraitUrl && !unitData.iconPath && !unitData.deadSpriteUrl && !unitData.spriteUrl)) {
        // Fallback for obstacles that might not have full data but have a sprite class
        // Return empty string for backgroundImage so CSS class styles (like .snowman) aren't overridden by 'none'
        if (OBSTACLE_DATA[unitType]) return { backgroundPosition: 'center', backgroundSize: 'contain', backgroundImage: '' };
        return { backgroundPosition: '0% 0%', backgroundSize: 'auto', backgroundImage: 'none' };
    }

    if (!unitData.useSpritesheet) {
        // Handle non-spritesheet units (e.g. Totem, Snowman) that might have a dead sprite or icon or portrait
        if (frameType === 'dead' && unitData.deadSpriteUrl) {
            return { backgroundPosition: '0% 0%', backgroundSize: 'contain', backgroundImage: `url('${unitData.deadSpriteUrl}')`, backgroundRepeat: 'no-repeat' };
        }
        if (frameType === 'portrait' && unitData.portraitUrl) {
            return { backgroundPosition: 'center', backgroundSize: 'contain', backgroundImage: `url('${unitData.portraitUrl}')`, backgroundRepeat: 'no-repeat' };
        }
        if (unitData.iconPath && frameType !== 'dead') {
            // For units like Totem that use iconPath as their sprite
            return { backgroundPosition: 'center', backgroundSize: 'contain', backgroundImage: `url('${unitData.iconPath}')`, backgroundRepeat: 'no-repeat' };
        }
        if (unitData.spriteUrl && frameType !== 'dead') {
            return { backgroundPosition: 'center', backgroundSize: 'contain', backgroundImage: `url('${unitData.spriteUrl}')`, backgroundRepeat: 'no-repeat' };
        }
        return { backgroundPosition: '0% 0%', backgroundSize: 'auto', backgroundImage: 'none' };
    }
    const sheetConfig = SPRITESHEET_CONFIG[unitData.useSpritesheet];
    if (!sheetConfig || typeof unitData.spriteRow === 'undefined') {
        console.warn(`Missing sheetConfig or spriteRow for ${unitType}`);
        return { backgroundPosition: '0% 0%', backgroundSize: 'auto', backgroundImage: 'none' };
    }

    let colIndex = 0;
    if (frameType === 'dead') colIndex = 1;
    if (frameType === 'portrait') colIndex = 2;

    const columns = sheetConfig.columns;
    const rows = sheetConfig.rows;

    // Calculate percentages for position
    // Formula: (index / (total - 1)) * 100
    // We guard against division by zero if there's only 1 column or row
    const xPercent = columns > 1 ? (colIndex / (columns - 1)) * 100 : 0;
    const yPercent = rows > 1 ? (unitData.spriteRow / (rows - 1)) * 100 : 0;
    const bgPos = `${xPercent}% ${yPercent}%`;

    // Calculate percentages for size
    // Formula: total * 100
    const widthPercent = columns * 100;
    const heightPercent = rows * 100;
    const bgSize = `${widthPercent}% ${heightPercent}%`;

    let effectiveSpriteUrl;
    if (frameType === 'dead' && unitData.deadSpriteUrl) {
        effectiveSpriteUrl = variant ? getUnitSpriteUrl(unitType, variant) : unitData.deadSpriteUrl;
    } else if (frameType === 'portrait' && unitData.portraitUrl) {
        effectiveSpriteUrl = variant ? getUnitSpriteUrl(unitType, variant) : unitData.portraitUrl;
    } else {
        effectiveSpriteUrl = variant ? getUnitSpriteUrl(unitType, variant) : unitData.spriteUrl;
    }

    if (!effectiveSpriteUrl) {
        console.warn(`No sprite URL found for ${unitType}, frame ${frameType}`);
        return { backgroundPosition: '0% 0%', backgroundSize: 'auto', backgroundImage: 'none' };
    }
    const bgImage = `url('${effectiveSpriteUrl}')`;

    return {
        backgroundPosition: bgPos,
        backgroundSize: bgSize,
        backgroundImage: bgImage
    };
}

function loadSfx() {
    if (Object.keys(sfx).length > 0 || typeof Audio === 'undefined') return;
    Object.keys(SFX_FILES).forEach(key => {
        try {
            sfx[key] = new Audio(SFX_FILES[key]);
            sfx[key].preload = 'auto';
            sfx[key].volume = sfxVolume;
        } catch (e) { console.error(`Error loading SFX ${key}: ${SFX_FILES[key]}`, e); }
    });
}

function playSfx(soundKey) {
    const sound = sfx[soundKey];
    if (isMuted || !audioInitialized || !sound) return;
    try {
        sound.volume = sfxVolume;
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
    bgMusic.volume = musicVolume;
    if (bgMusic.src !== musicUrl) { bgMusic.src = musicUrl; bgMusic.load(); }
    if (bgMusic.paused) { bgMusic.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Music play error: ${error.name} - ${error.message}`); } }); }
}

function startMusic() {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined') return;
    bgMusic.volume = musicVolume;
    if (!bgMusic.src || bgMusic.ended) { selectAndLoadMusic(); }
    if (bgMusic.paused) { bgMusic.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Music play error: ${error.name} - ${error.message}`); } }); }
}

function stopMusic() {
    if (bgMusic && !bgMusic.paused) { bgMusic.pause(); bgMusic.currentTime = 0; }
    if (victoryMusicPlayer && !victoryMusicPlayer.paused) { victoryMusicPlayer.pause(); victoryMusicPlayer.currentTime = 0; }
}

function playVictoryMusic() {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined' || !VICTORY_MUSIC) return;
    stopMusic();
    victoryMusicPlayer.volume = musicVolume;
    victoryMusicPlayer.src = new URL(VICTORY_MUSIC, window.location.href).href;
    victoryMusicPlayer.load();
    victoryMusicPlayer.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Victory Music play error: ${error.name} - ${error.message}`); } });
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

    if (context.state === 'suspended') {
        const eventOptions = { once: true, capture: true };
        document.addEventListener('click', unlockAudio, eventOptions);
        document.addEventListener('keydown', unlockAudio, eventOptions);
        document.addEventListener('touchstart', unlockAudio, eventOptions);
        return false;
    } else {
        audioInitialized = true;
        loadSfx();
        return true;
    }
}

function startMusicIfNotPlaying() {
    if (!audioInitialized || isMuted || (victoryMusicPlayer && !victoryMusicPlayer.paused)) return;
    let canPlayMusic = true;
    if (typeof isAnyOverlayVisible === 'function') {
        canPlayMusic = !isAnyOverlayVisible(true);
    }
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
        Object.keys(sfx).forEach(key => {
            const sound = sfx[key];
            if (sound) {
                sound.volume = sfxVolume;
                if (['gameOver', 'fireballHit', 'sapperExplode', 'playerHurt1', 'playerHurt2'].includes(key)) {
                    sound.volume = Math.min(1, sfxVolume * 1.3);
                } else if (['move', 'towerExit', 'rogueStealth'].includes(key)) {
                    sound.volume = Math.max(0, sfxVolume * 0.7);
                }
            }
        });
    }
}

function getTilesetForLevel(level) {
    const levelIndex = level - 1;
    const baseLevelIndex = levelIndex % TOTAL_LEVELS_BASE;
    const effectiveQuadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS;
    let tilesetName, worldName;
    switch (effectiveQuadrantIndex) {
        case 0: tilesetName = 'grass'; worldName = 'grass'; break;
        case 1: tilesetName = 'castle'; worldName = 'castle'; break;
        case 2: tilesetName = 'wasteland'; worldName = 'wasteland'; break;
        case 3: tilesetName = 'snow'; worldName = 'snow'; break;
        default: tilesetName = 'grass'; worldName = 'grass';
    }
    const tilesetUrl = TILESET_IMAGES[tilesetName] || TILESET_IMAGES.grass;
    const variant = WORLD_THEME_MAP[tilesetName] || 'green';
    return { url: tilesetUrl, variant: variant, name: tilesetName, quadrant: effectiveQuadrantIndex };
}

function getUnitSpriteUrl(type, variant = 'grey', armorType = 'grey') {
    const unitData = UNIT_DATA[type];
    if (!unitData || !unitData.useSpritesheet) return '';
    const sheetConfig = SPRITESHEET_CONFIG[unitData.useSpritesheet];
    if (!sheetConfig) return '';
    let effectiveVariant = variant;
    if (unitData.team === 'player') {
        // If armorType is explicitly provided and not default, use it.
        // Otherwise, trust the variant passed in (which should be the armor type).
        if (armorType && armorType !== 'grey') {
            effectiveVariant = armorType;
        } else {
            effectiveVariant = variant;
        }
    }
    return sheetConfig.basePathFormat.replace('{variant}', effectiveVariant);
}

function addSpriteUrlsToUnitData() {
    Object.keys(UNIT_DATA).forEach(type => {
        const data = UNIT_DATA[type];
        if (!data.useSpritesheet) return;
        const sheetConfig = SPRITESHEET_CONFIG[data.useSpritesheet];
        if (!sheetConfig) return;
        data.baseSpriteUrlFormat = sheetConfig.basePathFormat;
        const defaultVariant = (data.team === 'player') ? (data.armor_type || 'grey') : 'green';
        data.spriteUrl = getUnitSpriteUrl(type, defaultVariant, data.armor_type);
        data.portraitUrl = getUnitSpriteUrl(type, defaultVariant, data.armor_type);
        data.deadSpriteUrl = getUnitSpriteUrl(type, defaultVariant, data.armor_type);
        data.spriteSheetInfo = sheetConfig;
        data.spriteRow = sheetConfig.unitRows[type];
    });
    Object.keys(ITEM_DATA).forEach(type => {
        const data = ITEM_DATA[type];
        const iconConfig = SPRITESHEET_CONFIG.items.icons[type];
        if (iconConfig) data.iconPosition = iconConfig;
        data.spriteClass = `icon-${type.replace(/_/g, '-')}`;
    });
    Object.keys(ARMOR_DATA).forEach(id => {
        const data = ARMOR_DATA[id];
        data.iconClass = `icon-armor-${id}`;
    });
    Object.keys(PASSIVE_DATA).forEach(id => {
        const data = PASSIVE_DATA[id];
        data.iconClass = `icon-${id.replace(/_/g, '-')}`;
    });
}

addSpriteUrlsToUnitData();