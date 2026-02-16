// config.js





let sfx = {};
const bgMusic = new Audio();
bgMusic.loop = true;
bgMusic.preload = 'auto';
bgMusic.autoplay = true; // Suggest autoplay to browser
const victoryMusicPlayer = new Audio();
victoryMusicPlayer.loop = false;
const defeatMusicPlayer = new Audio();
defeatMusicPlayer.loop = true;
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
const MAX_ACTIVE_ROSTER_SIZE_BASE = 4;
const MAX_ACTIVE_ROSTER_SIZE_MAX = 12;
const EXECUTIONER_THRESHOLD = 2;

const NET_DURATION = 2;
const NET_COOLDOWN = 3;
const SHAMAN_HEAL_AMOUNT = 1;
const SHAMAN_TOTEM_HP = 1;
const SHAMAN_TOTEM_ATK = 0;
const SHAMAN_TOTEM_HEAL = 1;
const SHAMAN_TOTEM_RANGE = 7;
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
const GOBLIN_SHADOWSTALKER_INTRO_LEVEL = 61;
const WIZARD_UNLOCK_LEVEL = 60;

const GOBLIN_ARCHER_INTRO_LEVEL = 5;
const ARCHER_RESCUE_LEVEL = 10;
const CLUBBER_INTRO_LEVEL = 9;
const CHAMPION_RESCUE_LEVEL = 24;
const JUGGERNAUT_INTRO_LEVEL = 15;
const ROGUE_RESCUE_LEVEL = 40;
const GOBLIN_NETTER_INTRO_LEVEL = 31;
const GOBLIN_MOTHER_INTRO_LEVEL = 70;
const GOBLIN_MOTHER_SPAWN_COOLDOWN = 3;
const GOBLIN_MOTHER_SPAWN_CHANCE = 0.05;
const GOBLIN_SHAMAN_INTRO_LEVEL = 12;
const GOBLIN_TREASURE_HUNTER_INTRO_LEVEL = 40;
const GOBLIN_PYROMANCER_INTRO_LEVEL = 16;
const GOBLIN_SAPPER_INTRO_LEVEL = 24;
const SNOWMAN_INTRO_LEVEL = 46;
const V_THARAK_INTRO_LEVEL = 120;
const ZULKASH_INTRO_LEVEL = 130;
const ZULFAR_INTRO_LEVEL = 141;
const V_THARAK_SPAWN_CHANCE = 0.02;
const ZULKASH_SPAWN_CHANCE = 0.004; // Super rare: 0.4% chance
const ZULFAR_SPAWN_CHANCE = 0.003; // Ultra rare: 0.3% chance
const KRIZAK_INTRO_LEVEL = 226;
const KRIZAK_SPAWN_CHANCE = 0.003;
const ELITE_ENEMY_START_LEVEL = 61;
const ELITE_ENEMY_CHANCE = 0.05;
const JUGGERNAUT_SPAWN_LEVEL_MULTIPLE = 15;

const GOBLIN_RED_ATK_BONUS = 1;
const GOBLIN_BLUE_HP_BONUS = 1;
const GOBLIN_BLUE_SLOW_DURATION = 2;
const GOBLIN_YELLOW_MOV_BONUS = 1;
const GOBLIN_YELLOW_DOUBLE_TURN = true;
const ELITE_STAT_BONUS = { hp: 1, atk: 1 };

const FIREBALL_UNLOCK_LEVEL = 8;
const FLAME_WAVE_UNLOCK_LEVEL = 16;
const FROST_NOVA_UNLOCK_LEVEL = 24;
const HEAL_UNLOCK_LEVEL = 32;

const FIREBALL_BASE_DAMAGE = 2;
const FLAME_WAVE_BASE_DAMAGE = 1;
const FROST_NOVA_BASE_DURATION = 3;
const FROST_NOVA_BASE_RADIUS_LEVEL = 1;
const HEAL_BASE_AMOUNT = 3;

const LOOT_DROP_CHANCE_BARREL = 0.6;
const LOOT_DROP_CHANCE_CRATE = 0.5;
const BARREL_BASE_GOLD_AMOUNT = 2;
const CRATE_BASE_GOLD_AMOUNT = 1;
const BARREL_MAX_BONUS_GOLD = 5;
const CRATE_MAX_BONUS_GOLD = 3;
const POTION_DROP_CHANCE_BARREL = 0.15;
const GEM_DROP_CHANCE_BARREL = 0.05;
const EXPLODING_BARREL_DAMAGE = 4;
const EXPLODING_BARREL_RADIUS = 1;


const RECRUIT_COST_INCREASE_PER_UNIT = 20;

const UNIT_UPGRADE_COSTS = {
    knight_hp: { baseCost: 150, costIncrease: 75 }, knight_atk: { baseCost: 150, costIncrease: 75 },
    archer_hp: { baseCost: 150, costIncrease: 75 }, archer_atk: { baseCost: 240, costIncrease: 120 },
    champion_hp: { baseCost: 300, costIncrease: 150 }, champion_atk: { baseCost: 300, costIncrease: 150 },
    rogue_hp: { baseCost: 225, costIncrease: 105 }, rogue_atk: { baseCost: 225, costIncrease: 105 },
    wizard_hp: { baseCost: 400, costIncrease: 200 }, wizard_atk: { baseCost: 400, costIncrease: 200 },
};

const ABILITY_UPGRADE_COSTS = {
    rogue_quickstrike: 300,
    war_bow: 450,
    wizard_polymorph: 500,
};

const SPELL_UPGRADE_CONFIG = {
    fireball: { baseCost: 80, costIncrease: 10, effectIncrease: 1, requiredLevel: 12, maxLevel: 99, stat: 'damage', name: "Fireball" },
    flameWave: { baseCost: 100, costIncrease: 30, effectIncrease: 1, requiredLevel: 20, maxLevel: 99, stat: 'damage', name: "Flame Wave" },
    frostNova: { baseCost: 80, costIncrease: 20, effectIncrease: 1, requiredLevel: 28, maxLevel: 5, stat: 'radiusLevel', name: "Frost Nova" },
    heal: { baseCost: 80, costIncrease: 10, effectIncrease: 2, requiredLevel: 36, maxLevel: 99, stat: 'amount', name: "Heal" }
};

const PASSIVE_UPGRADE_COSTS = {
    tactical_command: 200,
    loot_hoarder: 250,
    vampiric_aura: 450,
    evasion: 300,
    thorns: 350
};

const PASSIVE_UPGRADE_CONFIG = {
    evasion: { maxLevel: 5, levelStep: 10, effectStep: 0.01, baseLevel: 25 },
    thorns: { maxLevel: Infinity, levelStep: 60, effectStep: 1, baseLevel: 35 },
    vampiric_aura: { maxLevel: Infinity, levelStep: 60, effectStep: 1, baseLevel: 50 }
};

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
const MOBILE_TOOLTIP_DURATION_MS = 3000;
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
const CHEST_BASE_GOLD_AMOUNT = 2;
const CHEST_MAX_BONUS_GOLD_PER_LEVEL = 0.25;
const CHEST_MAX_TOTAL_GOLD = 15;
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

// Barrel, Crate, and Exploding Barrel Constants
const BARREL_SPAWN_CHANCE_PER_LEVEL = 0.2;
const MAX_BARRELS_PER_LEVEL = 3;
const CRATE_SPAWN_CHANCE_PER_LEVEL = 0.2;
const MAX_CRATES_PER_LEVEL = 3;
const EXPLODING_BARREL_SPAWN_CHANCE_PER_LEVEL = 0.15;
const MAX_EXPLODING_BARRELS_PER_LEVEL = 2;


const SPRITESHEET_CONFIG = {
    player: {
        basePathFormat: './sprites/humans_{variant}.png',
        columns: 3, rows: 5,
        sheetWidth: 120, sheetHeight: 200, iconWidth: 40, iconHeight: 40,
        unitRows: { knight: 0, archer: 1, champion: 2, rogue: 3, wizard: 4 }
    },
    prisoners: {
        imageUrl: './sprites/prisoners.png',
        columns: 5, rows: 1,
        sheetWidth: 200, sheetHeight: 40, iconWidth: 40, iconHeight: 40
    },
    goblin: {
        basePathFormat: './sprites/goblins_{variant}.png',
        columns: 3, rows: 11,
        sheetWidth: 120, sheetHeight: 440, iconWidth: 40, iconHeight: 40,
        unitRows: { goblin: 0, goblin_archer: 1, goblin_club: 2, goblin_netter: 3, goblin_pyromancer: 4, goblin_sapper: 5, goblin_shaman: 6, goblin_treasure_hunter: 7, orc_juggernaut: 8, goblin_shadowstalker: 9, goblin_mother: 10, vtharak: 1, zulkash: 4, zulfar: 0, krizak: 1, goblin_blood_caller: 6, goblin_witchdoctor: 6 }
    },
    gear: {
        imageUrl: './sprites/gear.png',
        columns: 3, rows: 5,
        sheetWidth: 120, sheetHeight: 200, iconWidth: 40, iconHeight: 40,
        unitRows: { knight: 0, archer: 1, champion: 2, rogue: 3, wizard: 4 },
        itemColumns: { flame_cloak: 0, goblin_mother_skull: 1, war_bow: 2, glacier_bow: 2 }
    },
    items: {
        imageUrl: './sprites/items.png',
        columns: 4, rows: 5,
        sheetWidth: 160, sheetHeight: 200, iconWidth: 40, iconHeight: 40,
        icons: {
            // Row 0: Chest, Chest Open, Barrel, Barrel Dead
            chest_closed: { col: 0, row: 0 }, chest_opened: { col: 1, row: 0 }, barrel_closed: { col: 2, row: 0 }, barrel_dead: { col: 3, row: 0 },
            // Row 1: Gold, Gold Magnet, Crate, Crate Dead
            gold: { col: 0, row: 1 }, gold_magnet: { col: 1, row: 1 }, crate_closed: { col: 2, row: 1 }, crate_dead: { col: 3, row: 1 },
            // Row 2: Healing Potion, Shiny Gem, Exploding Barrel, Exploding Barrel Dead
            health_potion: { col: 0, row: 2 }, shiny_gem: { col: 1, row: 2 }, exploding_barrel_closed: { col: 2, row: 2 }, exploding_barrel_dead: { col: 3, row: 2 },
            // Row 3: Spellbook, War Bow, Goblin Mother Skull, Flame Ring (Zul'kash's Pyre-Seal)
            spellbook: { col: 0, row: 3 }, war_bow: { col: 1, row: 3 }, goblin_mother_skull: { col: 2, row: 3 }, flame_ring: { col: 3, row: 3 },
            // Row 4: Flame Cloak (Cinder-Draped Shroud)
            flame_cloak: { col: 0, row: 4 },
            glacier_bow: { col: 1, row: 4 },
            tome_of_chain_lightning: { col: 0, row: 3 },
            // Legacy net sprite (not in new sheet, keep for compatibility)
            net: { col: 1, row: 3 } // Placeholder, may need updating
        }
    },
    armor_icons: {
        imageUrl: './sprites/armor.png',
        columns: 5, rows: 1,
        sheetWidth: 200, sheetHeight: 40, iconWidth: 40, iconHeight: 40,
        icons: { grey: { col: 0, row: 0 }, green: { col: 1, row: 0 }, red: { col: 2, row: 0 }, yellow: { col: 3, row: 0 }, blue: { col: 4, row: 0 } }
    },
    enemy_obj: {
        imageUrl: './sprites/enemy_obj.png',
        columns: 3, rows: 2,
        sheetWidth: 120, sheetHeight: 80, iconWidth: 40, iconHeight: 40,
        icons: {
            totem: { col: 0, row: 0 }, totem_dead: { col: 1, row: 0 },
            snowman: { col: 0, row: 1 }, snowman_dead: { col: 1, row: 1 }, snowman_portrait: { col: 2, row: 1 }
        }
    },
    skills: {
        imageUrl: './sprites/skills.png',
        columns: 5, rows: 3,
        sheetWidth: 200, sheetHeight: 120, iconWidth: 40, iconHeight: 40
    },
    projectiles: {
        imageUrl: './sprites/projectiles.png',
        columns: 3, rows: 1,
        sheetWidth: 120, sheetHeight: 40, iconWidth: 40, iconHeight: 40
    },

    snowman: {
        useSpritesheet: 'enemy_obj',
        iconPosition: { col: 0, row: 1 }
    },
    totem: {
        useSpritesheet: 'enemy_obj',
        iconPosition: { col: 0, row: 0 }
    },
    door: {
        useSpritesheet: 'doodads',
        iconPosition: { col: 2, row: 3 }
    },
    doodads: {
        imageUrl: './sprites/doodads.png',
        columns: 4, rows: 5,
        sheetWidth: 160, sheetHeight: 200, iconWidth: 40, iconHeight: 40,
        icons: {
            rock_1: { col: 0, row: 0 }, rock_2: { col: 1, row: 0 }, rock_3: { col: 2, row: 0 }, mud: { col: 3, row: 0 },
            bones_1: { col: 0, row: 1 }, bones_2: { col: 1, row: 1 }, bones_3: { col: 2, row: 1 }, bone_spear: { col: 3, row: 1 },
            goblin_banner_1: { col: 0, row: 2 }, goblin_banner_2: { col: 1, row: 2 }, cauldron: { col: 2, row: 2 }, bonfire: { col: 3, row: 2 },
            pallisade_wall_1: { col: 0, row: 3 }, pallisade_wall_2: { col: 1, row: 3 }, pallisade_door: { col: 2, row: 3 }, pallisade_door_broken: { col: 3, row: 3 },
            wall_rock: { col: 0, row: 4 }, tower: { col: 1, row: 4 }, tower_destroyed: { col: 2, row: 4 }, tree_stump: { col: 3, row: 4 }
        }
    }
};

const UNIT_DATA = {
    knight: { name: "Knight", baseHp: 6, baseAtk: 1, mov: 3, range: 1, team: 'player', id_prefix: 'k', useSpritesheet: 'player' },
    archer: { name: "Archer", baseHp: 3, baseAtk: 1, mov: 2, range: 4, team: 'player', id_prefix: 'a', useSpritesheet: 'player', shootsProjectileType: 'arrow' },
    champion: { name: "Champion", baseHp: 5, baseAtk: 2, mov: 3, range: 1, team: 'player', id_prefix: 'c', useSpritesheet: 'player', cleaveDamage: 1 },
    rogue: { name: "Rogue", baseHp: 3, baseAtk: 1, mov: 5, range: 1, team: 'player', id_prefix: 'r', useSpritesheet: 'player', canStealth: true, canQuickStrike: false },

    goblin: { name: "Goblin", baseHp: 2, baseAtk: 1, mov: 4, range: 1, team: 'enemy', id_prefix: 'g', useSpritesheet: 'goblin' },
    goblin_archer: { name: "Goblin Archer", baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy', id_prefix: 'ga', useSpritesheet: 'goblin', shootsProjectileType: 'arrow' },
    goblin_netter: { name: "Goblin Netter", baseHp: 1, baseAtk: 0, mov: 3, range: 3, team: 'enemy', id_prefix: 'gn', useSpritesheet: 'goblin', canNet: true, netCooldown: NET_COOLDOWN, shootsProjectileType: 'net', baseMeleeAtk: 1 },
    goblin_club: { name: "Goblin Clubber", baseHp: 3, baseAtk: 2, mov: 3, range: 1, team: 'enemy', id_prefix: 'gc', useSpritesheet: 'goblin' },
    goblin_shaman: { name: "Goblin Shaman", baseHp: 2, baseAtk: 0, mov: 3, range: 1, team: 'enemy', id_prefix: 'gsh', useSpritesheet: 'goblin', healAmount: SHAMAN_HEAL_AMOUNT, canSummonTotem: true, totemCooldown: SHAMAN_TOTEM_COOLDOWN, totemType: 'shaman_totem', meleeOnlyAttack: true, baseMeleeAtk: 1 },
    goblin_sapper: { name: "Goblin Sapper", baseHp: 1, baseAtk: 3, mov: 2, range: 1, team: 'enemy', id_prefix: 'gsa', useSpritesheet: 'goblin', suicideExplode: true, explodeOnDeath: true, explosionRadius: SAPPER_EXPLOSION_RADIUS },
    goblin_pyromancer: { name: "Goblin Pyromancer", baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy', id_prefix: 'gp', useSpritesheet: 'goblin', shootsProjectileType: 'fireball', canCastFlameWave: true, flameWaveCooldown: PYRO_FLAME_WAVE_COOLDOWN },
    goblin_treasure_hunter: { name: "Goblin Treasure Hunter", baseHp: 5, baseAtk: 1, mov: 5, range: 1, team: 'enemy', id_prefix: 'gth', useSpritesheet: 'goblin', isTreasureHunter: true, flees: true },
    orc_juggernaut: { name: "Orc Juggernaut", baseHp: 8, baseAtk: 3, mov: 2, range: 1, team: 'enemy', id_prefix: 'oj', useSpritesheet: 'goblin', isBoss: true, dropsArmor: true, scale: 1.3, knockback: true },
    goblin_shadowstalker: { name: "Goblin Shadow Stalker", baseHp: 2, baseAtk: 2, mov: 5, range: 1, team: 'enemy', id_prefix: 'gss', useSpritesheet: 'goblin', canStealth: true, inflictsBleed: true, bleedDuration: 2, bleedDamage: 1, aiBehavior: 'shadowstalker' },
    vtharak: { name: "V'tharak, Bow Master", baseHp: 8, baseAtk: 2, mov: 5, range: 6, team: 'enemy', id_prefix: 'vth', useSpritesheet: 'goblin', shootsProjectileType: 'arrow', isBoss: false, dropsWarBow: true, scale: 1.3, spriteRow: 1, baseSpriteVariant: 'green', forceCssVariant: 'purple' },
    zulkash: { name: "Zul'kash, the Blazer", baseHp: 10, baseAtk: 3, mov: 5, range: 4, team: 'enemy', id_prefix: 'zk', useSpritesheet: 'goblin', shootsProjectileType: 'fireball', isBoss: false, dropsFlameCloak: true, scale: 1.3, spriteRow: 4, baseSpriteVariant: 'green', forceCssVariant: 'gold', canCastFlameWave: true, flameWaveCooldown: PYRO_FLAME_WAVE_COOLDOWN, flameWaveRows: 2 },
    zulfar: { name: "Zul'far, the Cinder-Lord", baseHp: 10, baseAtk: 4, mov: 4, range: 5, team: 'enemy', id_prefix: 'zf', useSpritesheet: 'goblin', shootsProjectileType: 'fireball', isBoss: false, dropsFlameRing: true, scale: 1.3, spriteRow: 0, baseSpriteVariant: 'green', forceCssVariant: 'bloodOrange', fireballRadius: 1 },
    krizak: { name: "Kri'zak Frigid-Finger", baseHp: 15, baseAtk: 3, mov: 5, range: 6, team: 'enemy', id_prefix: 'krz', useSpritesheet: 'goblin', shootsProjectileType: 'arrow', isBoss: true, dropsGlacierBow: true, scale: 1.3, spriteRow: 1, baseSpriteVariant: 'green', forceCssVariant: 'ice-blue', canCastFrostNova: true, frostNovaCooldown: 3, knockback: true },
    shaman_totem: { name: "Healing Totem", baseHp: SHAMAN_TOTEM_HP, baseAtk: SHAMAN_TOTEM_ATK, mov: 0, range: SHAMAN_TOTEM_RANGE, team: 'enemy', id_prefix: 'gst', useSpritesheet: 'enemy_obj', iconPosition: { col: 0, row: 0 }, deadIconPosition: { col: 1, row: 0 }, portraitIconPosition: { col: 2, row: 0 }, isTotem: true, healAmount: SHAMAN_TOTEM_HEAL },

    // New Shaman Variants
    goblin_blood_caller: { name: "Goblin Blood-Caller", baseHp: 3, baseAtk: 1, mov: 3, range: 1, team: 'enemy', id_prefix: 'gbc', useSpritesheet: 'goblin', canSummonTotem: true, totemCooldown: SHAMAN_TOTEM_COOLDOWN, totemType: 'bloodlust_totem', meleeOnlyAttack: true, baseMeleeAtk: 2, introLevel: 80, spriteRow: 6, baseSpriteVariant: 'green', forceCssVariant: 'blood-caller' },
    bloodlust_totem: { name: "Bloodlust Totem", baseHp: SHAMAN_TOTEM_HP, baseAtk: 0, mov: 0, range: SHAMAN_TOTEM_RANGE, team: 'enemy', id_prefix: 'gbt', useSpritesheet: 'enemy_obj', iconPosition: { col: 0, row: 0 }, deadIconPosition: { col: 1, row: 0 }, portraitIconPosition: { col: 2, row: 0 }, isTotem: true, isBloodlustTotem: true, buffAmount: 1, forceCssVariant: 'blood-caller' },

    goblin_witchdoctor: { name: "Goblin Witchdoctor", baseHp: 4, baseAtk: 1, mov: 3, range: 2, team: 'enemy', id_prefix: 'gwd', useSpritesheet: 'goblin', canSummonTotem: true, totemCooldown: SHAMAN_TOTEM_COOLDOWN, totemType: 'cursed_totem', meleeOnlyAttack: true, baseMeleeAtk: 1, introLevel: 121, spriteRow: 6, baseSpriteVariant: 'green', forceCssVariant: 'witchdoctor' },
    cursed_totem: { name: "Cursed Totem", baseHp: SHAMAN_TOTEM_HP, baseAtk: 0, mov: 0, range: SHAMAN_TOTEM_RANGE, team: 'enemy', id_prefix: 'gct', useSpritesheet: 'enemy_obj', iconPosition: { col: 0, row: 0 }, deadIconPosition: { col: 1, row: 0 }, portraitIconPosition: { col: 2, row: 0 }, isTotem: true, isCursedTotem: true, debuffAmount: 1, forceCssVariant: 'witchdoctor' },
    goblin_mother: { name: "Goblin Mother", baseHp: 10, baseAtk: 1, mov: 0, range: 1, team: 'enemy', id_prefix: 'gm', useSpritesheet: 'goblin', ability: 'spawnGoblins', spawnCooldown: GOBLIN_MOTHER_SPAWN_COOLDOWN, scale: 1.3, dropsGoblinMotherSkull: true },
    wizard: { name: "Wizard", baseHp: 2, baseAtk: 2, mov: 3, range: 3, team: 'player', id_prefix: 'wiz', useSpritesheet: 'player', canCastChainLightning: true, chainLightningCooldown: 3, canCastPolymorph: false, polymorphCooldown: 2, spriteRow: 4, shootsProjectileType: 'fireball', ignoreUnitsForLOS: true },
    sheep: { name: "Sheep", baseHp: 1, baseAtk: 0, mov: 0, range: 0, team: 'enemy', id_prefix: 'sh', useSpritesheet: 'skills', iconPosition: { col: 4, row: 0 }, isPolymorphed: true, scale: 0.8, variantType: 'green' },
};

const RECRUIT_BASE_COSTS = {
    knight: 20,
    archer: 80,
    champion: 130,
    rogue: 180,
    wizard: 250,
};

const OBSTACLE_DATA = {
    rock: { hp: 999, blocksMove: true, blocksLOS: false, spriteClass: 'rock', destructible: false, enterable: false, canBeAttacked: false },
    wall_rock: { hp: 999, blocksMove: true, blocksLOS: true, spriteClass: 'wall_rock', destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 0, row: 4 } },
    door: { id: 'door', name: 'Door', hp: 1, maxHp: 1, blocksMove: true, blocksLOS: true, spriteClass: 'door', destructible: true, enterable: false, canBeAttacked: true, useSpritesheet: 'doodads', iconPosition: { col: 2, row: 3 }, deadIconPosition: { col: 3, row: 3 } },
    tower: { hp: 3, blocksMove: false, blocksLOS: false, spriteClass: 'tower', destructible: true, enterable: true, canBeAttacked: true, rangeBonus: 1, useSpritesheet: 'doodads', iconPosition: { col: 1, row: 4 }, deadIconPosition: { col: 2, row: 4 }, name: 'Tower' },
    snowman: { id: 'snowman', name: 'Happy Innocent Snowman', hp: 1, maxHp: 1, blocksMove: true, blocksLOS: false, spriteClass: 'snowman', destructible: true, enterable: false, canBeAttacked: true, hidesUnit: true, hiddenUnitType: 'goblin', hiddenUnitVariant: 'blue', clickable: true, description: "Seems suspicious..", useSpritesheet: 'enemy_obj', iconPosition: { col: 0, row: 1 }, deadIconPosition: { col: 1, row: 1 }, portraitIconPosition: { col: 2, row: 1 } },
    barrel: { id: 'barrel', name: 'Barrel', hp: 1, maxHp: 1, blocksMove: true, blocksLOS: false, spriteClass: 'barrel', destructible: true, enterable: false, canBeAttacked: true, dropsLoot: true, useSpritesheet: 'items', iconPosition: { col: 2, row: 0 }, deadIconPosition: { col: 3, row: 0 } },
    crate: { id: 'crate', name: 'Crate', hp: 1, maxHp: 1, blocksMove: true, blocksLOS: false, spriteClass: 'crate', destructible: true, enterable: false, canBeAttacked: true, dropsLoot: true, useSpritesheet: 'items', iconPosition: { col: 2, row: 1 }, deadIconPosition: { col: 3, row: 1 } },
    exploding_barrel: { id: 'exploding_barrel', name: 'Exploding Barrel', hp: 1, maxHp: 1, blocksMove: true, blocksLOS: false, spriteClass: 'exploding_barrel', destructible: true, enterable: false, canBeAttacked: true, explodes: true, explosionDamage: EXPLODING_BARREL_DAMAGE, explosionRadius: EXPLODING_BARREL_RADIUS, useSpritesheet: 'items', iconPosition: { col: 2, row: 2 }, deadIconPosition: { col: 3, row: 2 } },

    // Cages
    cage_archer: { id: 'cage_archer', name: 'Caged Archer', hp: 3, maxHp: 3, blocksMove: true, blocksLOS: false, destructible: true, enterable: false, canBeAttacked: true, useSpritesheet: 'prisoners', iconPosition: { col: 0, row: 0 } },
    cage_champion: { id: 'cage_champion', name: 'Caged Champion', hp: 3, maxHp: 3, blocksMove: true, blocksLOS: false, destructible: true, enterable: false, canBeAttacked: true, useSpritesheet: 'prisoners', iconPosition: { col: 1, row: 0 } },
    cage_rogue: { id: 'cage_rogue', name: 'Caged Rogue', hp: 3, maxHp: 3, blocksMove: true, blocksLOS: false, destructible: true, enterable: false, canBeAttacked: true, useSpritesheet: 'prisoners', iconPosition: { col: 2, row: 0 } },
    cage_wizard: { id: 'cage_wizard', name: 'Caged Wizard', hp: 3, maxHp: 3, blocksMove: true, blocksLOS: false, destructible: true, enterable: false, canBeAttacked: true, useSpritesheet: 'prisoners', iconPosition: { col: 3, row: 0 } },
    cage_broken: { id: 'cage_broken', name: 'Broken Cage', hp: 999, blocksMove: false, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'prisoners', iconPosition: { col: 4, row: 0 }, zIndex: 0 },


    // Doodads
    // Doodads
    // Doodads
    rock_1: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 0, row: 0 } },
    rock_2: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 1, row: 0 } },
    rock_3: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 2, row: 0 } },
    mud: { hp: 999, blocksMove: false, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, movementCost: 2, useSpritesheet: 'doodads', iconPosition: { col: 3, row: 0 }, zIndex: 0 }, // Low zIndex for floor
    bones_1: { hp: 999, blocksMove: false, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 0, row: 1 }, zIndex: 0 },
    bones_2: { hp: 999, blocksMove: false, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 1, row: 1 }, zIndex: 0 },
    bones_3: { hp: 999, blocksMove: false, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 2, row: 1 }, zIndex: 0 },
    bone_spear: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 3, row: 1 } },
    goblin_banner_1: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 0, row: 2 } },
    goblin_banner_2: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 1, row: 2 } },
    cauldron: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 2, row: 2 } },
    bonfire: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 3, row: 2 } },
    pallisade_wall_1: { hp: 999, blocksMove: true, blocksLOS: true, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 0, row: 3 } },
    pallisade_wall_2: { hp: 999, blocksMove: true, blocksLOS: true, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 1, row: 3 } },
    pallisade_door: { id: 'pallisade_door', name: 'Pallisade Door', hp: 2, maxHp: 2, blocksMove: true, blocksLOS: true, destructible: true, enterable: false, canBeAttacked: true, useSpritesheet: 'doodads', iconPosition: { col: 2, row: 3 }, deadIconPosition: { col: 3, row: 3 } },
    pallisade_door_broken: { hp: 999, blocksMove: false, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 3, row: 3 } },
    tower_destroyed: { hp: 999, blocksMove: false, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 2, row: 4 } },
    tree_stump: { hp: 999, blocksMove: true, blocksLOS: false, destructible: false, enterable: false, canBeAttacked: false, useSpritesheet: 'doodads', iconPosition: { col: 3, row: 4 } }
};

const ITEM_DATA = {
    gold: { name: 'Gold Coin', description: 'Currency', pickupAction: 'addGold', value: 1, zIndex: 300, spriteClass: 'icon-gold' },
    chest: { name: 'Chest', description: 'Contains gold and items', pickupAction: 'openChest', baseGoldAmount: CHEST_BASE_GOLD_AMOUNT, zIndex: 300, spriteClass: 'icon-chest-closed', openedSpriteClass: 'icon-chest-opened' },
    health_potion: { name: 'Health Potion', description: 'Restores HP', pickupAction: 'healUnit', value: HEALTH_POTION_HEAL_AMOUNT, zIndex: 300, spriteClass: 'icon-potion' },
    shiny_gem: { name: 'Shiny Gem', description: 'Valuable gem', pickupAction: 'addGold', valueMin: SHINY_GEM_MIN_GOLD, valueMax: SHINY_GEM_MAX_GOLD, zIndex: 300, spriteClass: 'icon-gem' },
    gold_magnet: { name: 'Gold Magnet', description: 'Pulls nearby gold!', pickupAction: 'upgradeGoldMagnet', value: 1, zIndex: 300, spriteClass: 'icon-goldmagnet' },
    spellbook: { name: 'Spellbook', description: 'Restores 1 spell charge.', pickupAction: 'restoreSpell', value: 1, zIndex: 300, spriteClass: 'icon-spellbook' },
    war_bow: { name: 'War Bow', description: '+1 RNG', pickupAction: 'unlockWarBow', value: 1, zIndex: 300, spriteClass: 'icon-warbow', color: 'var(--color-green-bright)' },
    flame_cloak: { name: 'Flame Cloak', pickupAction: 'unlockFlameCloak', value: 1, zIndex: 300, spriteClass: 'icon-flame-cloak', color: 'var(--color-orange-highlight)' },
    flame_ring: { name: 'Flame Ring', description: '<span style="color:var(--color-gold-light)">+1 Fireball radius</span>', pickupAction: 'unlockFlameRing', value: 1, zIndex: 300, spriteClass: 'icon-flame-ring', color: 'var(--color-orange-highlight)' },
    armor: { name: 'Armor', pickupAction: 'collectArmor', value: 1, zIndex: 300 },
    helmet: { name: 'Helmet', pickupAction: 'collectArmor', value: 1, zIndex: 300 },
    tome_of_chain_lightning: { name: 'Tome of Chain Lightning', description: 'Reduces Chain Lightning cooldown by 1 turn.', pickupAction: 'reduceChainLightningCooldown', value: 1, zIndex: 300, spriteClass: 'icon-tome-of-chain-lightning' },
    glacier_bow: { name: 'Legendary Glacier Longbow', description: '<span style="color:var(--color-gold-light)">+2 ATK, +1 RNG</span><br><span style="color:var(--color-gold-light)">Slows enemy on hit (-1 MOV for 2 turns)</span>', pickupAction: 'unlockGlacierBow', value: 1, zIndex: 300, spriteClass: 'icon-glacier-bow', color: 'var(--color-legendary)', isLegendary: true },
};

const PASSIVE_DATA = {
    gold_magnet: { name: "Gold Magnet", description: "Automatically collect gold from nearby squares.", iconClass: "icon-goldmagnet" },
    tactical_command: { name: "Tactical Command", description: "Increases max roster size by 1.", iconClass: "icon-skill-tacticalcommand" },
    loot_hoarder: { name: "Loot Hoarder", description: "+15% Gold drop chance.", iconClass: "icon-skill-loothoarder" },
    vampiric_aura: { name: "Vampiric Aura", description: "Units heal {n} HP whenever they kill an enemy.", iconClass: "icon-skill-vampiricaura", requiredLevel: 50 },
    evasion: { name: "Evasion", description: "{n}% chance to dodge attacks.", iconClass: "icon-skill-evasion", requiredLevel: 25 },
    thorns: { name: "Thorns", description: "Melee attackers take {n} damage when hitting your units.", iconClass: "icon-skill-thorns", requiredLevel: 35 }
};
const ARMOR_DATA = {
    none: { id: 'none', name: 'No Armor', description: 'Max HP: 1<br>+1 MOV', hpBonus: -99, atkBonus: 0, movBonus: 1, resistances: {}, activation: null, color: '#ffdab9', iconClass: 'icon-armor-none', iconPath: './sprites/armor_none.png' },
    grey: { id: 'grey', name: 'Grey Armor', description: 'Standard issue, no bonuses.', hpBonus: 0, atkBonus: 0, movBonus: 0, resistances: {}, activation: null, color: 'var(--color-disabled-text)', iconClass: 'icon-armor-grey', iconPath: './sprites/armor_grey.png' },
    green: { id: 'green', name: 'Forest Armor', description: 'Activate Forest Armor. -1 damage from all enemy attacks.(1 turn)', hpBonus: 0, atkBonus: 0, movBonus: 0, resistances: {}, activation: { type: 'debuff_enemy_atk', value: 1, duration: 1, uses: 1 }, color: 'var(--color-green-base)', iconClass: 'icon-armor-green', iconPath: './sprites/armor_green.png' },
    blue: { id: 'blue', name: 'Azure Armor', description: '+ HP (Odd Lvls), + Frost Res (Even Lvls).<br>Lvl 5: Immune to Frost.', hpBonus: 1, atkBonus: 0, movBonus: 0, resistances: { frost: 1 }, activation: null, color: 'var(--color-blue-base)', iconClass: 'icon-armor-blue', iconPath: './sprites/armor_blue.png' },
    red: { id: 'red', name: 'Ember Armor', description: '+ ATK (Odd Lvls), + Fire Res (Even Lvls).', hpBonus: 0, atkBonus: 1, movBonus: 0, resistances: { fire: 1 }, activation: null, color: 'var(--color-red-base)', iconClass: 'icon-armor-red', iconPath: './sprites/armor_red.png' },
    yellow: { id: 'yellow', name: 'Sand Armor', description: '+1 MOV', hpBonus: 0, atkBonus: 0, movBonus: 1, resistances: {}, activation: null, color: '#C19A6B', iconClass: 'icon-armor-yellow', iconPath: './sprites/armor_yellow.png' },
    flame_cloak: { id: 'flame_cloak', name: 'Flame Cloak', description: '<span style="color:var(--color-gold-light)">+2 HP</span><br><span style="color:var(--color-gold-light)">+1 Fire Resist</span><br><span style="color:var(--color-gold-light)">+1 Flame Wave radius</span>', hpBonus: 2, atkBonus: 0, movBonus: 0, resistances: { fire: 1 }, activation: null, color: '#FF4500', iconClass: 'icon-flame-cloak', iconPath: './sprites/items.png', useSpritesheet: 'items', iconPosition: { col: 0, row: 4 } },
    goblin_mother_skull: { id: 'goblin_mother_skull', type: 'helmet', name: "Goblin Mother Skull", description: 'Regenerates +1 HP every 3 turns.', hpBonus: 0, atkBonus: 0, movBonus: 0, resistances: {}, activation: null, color: '#e0e0e0', iconClass: 'icon-goblin-mother-skull', iconPath: './sprites/items.png', useSpritesheet: 'items', iconPosition: { col: 2, row: 3 } },
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
    grass: { common: ['goblin'], uncommon: ['goblin_archer', 'goblin_club'], rare: ['goblin_netter', 'goblin_shaman', 'goblin_witchdoctor'], boss: ['orc_juggernaut'] },
    castle: { common: ['goblin', 'goblin_sapper'], uncommon: ['goblin_club', 'goblin_archer'], rare: ['goblin_pyromancer', 'goblin_blood_caller'], boss: ['orc_juggernaut'] },
    wasteland: { common: ['goblin', 'goblin_archer'], uncommon: ['goblin_club', 'goblin_netter'], rare: ['goblin_shaman'], boss: ['orc_juggernaut'] },
    snow: { common: ['goblin', 'goblin_archer'], uncommon: ['goblin_club', 'goblin_shaman'], rare: ['goblin_shadowstalker'], boss: ['orc_juggernaut'] },
    infinite: { common: ['goblin', 'goblin_archer'], uncommon: ['goblin_club', 'goblin_netter', 'goblin_shaman', 'goblin_sapper', 'goblin_pyromancer', 'goblin_blood_caller', 'goblin_witchdoctor'], rare: ['goblin_shadowstalker', 'zulkash', 'zulfar'], boss: ['orc_juggernaut'] }
};
const ADVANCED_ENEMY_TYPES = ['goblin_archer', 'goblin_netter', 'goblin_club', 'orc_juggernaut', 'goblin_shaman', 'goblin_sapper', 'goblin_pyromancer', 'goblin_treasure_hunter', 'goblin_shadowstalker', 'vtharak', 'zulkash', 'zulfar'];

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
const MOBILE_INITIAL_MAP_ZOOM_LEVEL = 2.0;
const LEVELS_PER_PAGE = 60;

const LEVEL_COMPLETE_BONUS_GOLD = {
    noSpells: 5,
    executioner: 10,
    noLosses: 5,
    noArmor: 15,
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
const STORAGE_KEY_EQUIPPED_HELMET = `${STORAGE_KEY_GAME_PREFIX}equippedHelmet`;
const STORAGE_KEY_EQUIPPED_FLAME_CLOAK = `${STORAGE_KEY_GAME_PREFIX}equippedFlameCloak`;
const STORAGE_KEY_EQUIPPED_WAR_BOW = `${STORAGE_KEY_GAME_PREFIX}equippedWarBow`;
const STORAGE_KEY_EQUIPPED_FLAME_RING = `${STORAGE_KEY_GAME_PREFIX}equippedFlameRing`;
const STORAGE_KEY_EQUIPPED_GLACIER_BOW = `${STORAGE_KEY_GAME_PREFIX}equippedGlacierBow`;
const STORAGE_KEY_ACHIEVEMENT_PROGRESS = `${STORAGE_KEY_GAME_PREFIX}achievementProgress`;
const STORAGE_KEY_CHEAT_SPELL_ATK = `${STORAGE_KEY_GAME_PREFIX}cheatSpellAtkBonus`;
const STORAGE_KEY_CHEATER = `${STORAGE_KEY_GAME_PREFIX}isCheater`;
const STORAGE_KEY_SETTINGS = `${STORAGE_KEY_GAME_PREFIX}settings`;
const STORAGE_KEY_MAX_ROSTER_SIZE = `${STORAGE_KEY_GAME_PREFIX}maxRosterSize`;
const STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL = `${STORAGE_KEY_GAME_PREFIX}lastTreasureHunterLevel`;
const STORAGE_KEY_SPELL_NOTIFICATIONS_SHOWN = `${STORAGE_KEY_GAME_PREFIX}spellNotificationsShown`;
const STORAGE_KEY_ARMORY_VISITED = `${STORAGE_KEY_GAME_PREFIX}armoryVisited`;
const STORAGE_KEY_NAKED_CHALLENGE = `${STORAGE_KEY_GAME_PREFIX}nakedChallenge`;
const STORAGE_KEY_PROFILES = `${STORAGE_KEY_GAME_PREFIX}profiles`;
const STORAGE_KEY_CHAIN_LIGHTNING_REDUCTION = `${STORAGE_KEY_GAME_PREFIX}chainLightningReduction`;
const STORAGE_KEY_UNLOCKED_UNITS = `${STORAGE_KEY_GAME_PREFIX}unlockedUnits`;
const LEADERBOARD_STORAGE_KEY = `${STORAGE_KEY_GAME_PREFIX}leaderboard`;
const MAX_LEADERBOARD_ENTRIES = 10;

const ACHIEVEMENT_DATA = {
    // Combat Achievements
    kill_10_goblins: { title: "Goblin Foe", description: "Kill 10 Goblins.", icon: "kill_goblin", category: "combat", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 10 }, reward: { gold: 10 }, sortOrder: 1 },
    kill_50_goblins: { title: "Goblin Slayer", description: "Kill 50 Goblins.", icon: "kill_goblin", category: "combat", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 50 }, reward: { gold: 25 }, sortOrder: 2 },
    kill_100_goblins: { title: "Goblin Bane", description: "Kill 100 Goblins.", icon: "kill_goblin", category: "combat", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 100 }, reward: { gold: 50 }, sortOrder: 3 },
    kill_500_goblins: { title: "Goblin Terror", description: "Kill 500 Goblins.", icon: "kill_goblin", category: "combat", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 500 }, reward: { gold: 100 }, sortOrder: 4 },
    kill_1000_goblins: { title: "Goblin Nightmare", description: "Kill 1000 Goblins.", icon: "kill_goblin", category: "combat", condition: { type: "kill_multiple", targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 1000 }, reward: { gold: 200 }, sortOrder: 5 },
    chain_lightning_5: { title: "Shocking", description: "Hit 5 enemies with a single Chain Lightning.", icon: "spell_cast", category: "combat", condition: { type: "chain_lightning", count: 5 }, reward: { gold: 50 }, sortOrder: 10 },
    chain_lightning_10: { title: "High Voltage", description: "Hit 10 enemies with a single Chain Lightning.", icon: "spell_cast", category: "combat", condition: { type: "chain_lightning", count: 10 }, reward: { gold: 75 }, sortOrder: 11 },
    chain_lightning_15: { title: "Thunder God", description: "Hit 15 enemies with a single Chain Lightning.", icon: "spell_cast", category: "combat", condition: { type: "chain_lightning", count: 15 }, reward: { gold: 100 }, sortOrder: 12 },
    chain_lightning_20: { title: "Stormbringer", description: "Hit 20 enemies with a single Chain Lightning.", icon: "spell_cast", category: "combat", condition: { type: "chain_lightning", count: 20 }, reward: { gold: 200 }, sortOrder: 13 },
    line_em_up: { title: "Line 'Em Up", description: "Hit 3 enemies with a single Cleave attack.", icon: "cleave_hit", category: "combat", condition: { type: "cleave_multi_hit", count: 3 }, reward: { gold: 50 }, sortOrder: 14 },
    cleave_master: { title: "Cleave Master", description: "Hit 4 enemies with a single Cleave attack.", icon: "cleave_hit", category: "combat", condition: { type: "cleave_multi_hit", count: 4 }, reward: { gold: 75 }, sortOrder: 15 },
    crowd_control_master: { title: "Crowd Control", description: "Polymorph and Freeze enemies in the same turn.", icon: "spell_cast", category: "combat", condition: { type: "crowd_control_combo" }, reward: { gold: 50 }, sortOrder: 16 },
    // Progression Achievements
    beat_forest_world: { title: "Forest Explorer", description: "Complete the Forest World (Level 15).", icon: "world_complete", category: "progression", condition: { type: "reach_level", level: 16 }, reward: { gold: 50 }, sortOrder: 1 },
    beat_castle_world: { title: "Castle Sieger", description: "Complete the Castle World (Level 30).", icon: "world_complete", category: "progression", condition: { type: "reach_level", level: 31 }, reward: { gold: 50 }, sortOrder: 2 },
    beat_wasteland_world: { title: "Wasteland Survivor", description: "Complete the Wasteland World (Level 45).", icon: "world_complete", category: "progression", condition: { type: "reach_level", level: 46 }, reward: { gold: 50 }, sortOrder: 3 },
    beat_snow_world: { title: "Tundra Tamer", description: "Complete the Snow World (Level 60).", icon: "world_complete", category: "progression", condition: { type: "reach_level", level: 61 }, reward: { gold: 100 }, sortOrder: 4 },
    beat_nightmare_world: { title: "Nightmare Walker", description: "Complete Nightmare Difficulty (Beat Level 120).", icon: "world_complete", category: "progression", condition: { type: "reach_level", level: 121 }, reward: { gold: 200 }, sortOrder: 5 },
    beat_hell_world: { title: "Hell's Champion", description: "Complete Hell Difficulty (Beat Level 180).", icon: "world_complete", category: "progression", condition: { type: "reach_level", level: 181 }, reward: { gold: 300 }, sortOrder: 6 },
    beat_apocalypse_world: { title: "Apocalypse Survivor", description: "Complete Apocalypse Difficulty (Beat Level 240).", icon: "world_complete", category: "progression", condition: { type: "reach_level", level: 241 }, reward: { gold: 500 }, sortOrder: 7 },
    // Challenge Achievements
    naked_normal_victory: { title: "True Hero", description: "Beat Normal Difficulty (Level 60) during the 'No Armor' challenge.", icon: "no_armor", category: "challenges", condition: { type: "level_complete_condition", condition: "naked_normal" }, reward: { gold: 500 }, sortOrder: 50 },
    naked_nightmare_victory: { title: "True Legend", description: "Beat Nightmare Difficulty (Level 120) during the 'No Armor' challenge.", icon: "no_armor", category: "challenges", condition: { type: "level_complete_condition", condition: "naked_nightmare" }, reward: { gold: 750 }, sortOrder: 51 },
    naked_hell_victory: { title: "True Demigod", description: "Beat Hell Difficulty (Level 180) during the 'No Armor' challenge.", icon: "no_armor", category: "challenges", condition: { type: "level_complete_condition", condition: "naked_hell" }, reward: { gold: 1000 }, sortOrder: 52 },
    naked_apocalypse_victory: { title: "True God", description: "Beat Apocalypse Difficulty (Level 240) during the 'No Armor' challenge.", icon: "no_armor", category: "challenges", condition: { type: "level_complete_condition", condition: "naked_apocalypse" }, reward: { gold: 2000 }, sortOrder: 53 },
    lone_wolf: { title: "Lone Wolf", description: "Start and win Level 10+ with only 1 unit (Highest available level only).", icon: "lone_wolf", category: "challenges", condition: { type: "level_complete_condition", condition: "lone_wolf" }, reward: { gold: 50 }, sortOrder: 55 },
    no_armor_victory: { title: "Ultimate Triumph", description: "Beat any level with 'No Armor' equipped.", icon: "no_armor", category: "challenges", condition: { type: "level_complete_condition", condition: "no_armor" }, reward: { gold: 50 }, sortOrder: 56 },
    flawless_victory: { title: "Flawless Victory", description: "Beat Level 25+ at full HP (Highest available level only).", icon: "flawless", category: "challenges", condition: { type: "level_complete_condition", condition: "full_hp" }, reward: { gold: 50 }, sortOrder: 57 },

    no_spells: { title: "Might Over Magic", description: "Beat a level after unlocking spells without using any.", icon: "no_spells", category: "challenges", condition: { type: "level_complete_condition", condition: "no_spells" }, reward: { gold: 30 } },
    // Recruitment Achievements
    recruit_archer: { title: "First Archer", description: "Rescue the Archer.", icon: "recruit", category: "recruitment", condition: { type: "rescue", target: "archer", count: 1 }, reward: { gold: 50 }, sortOrder: 50 },
    recruit_champion: { title: "First Champion", description: "Rescue the Champion.", icon: "recruit", category: "recruitment", condition: { type: "rescue", target: "champion", count: 1 }, reward: { gold: 50 }, sortOrder: 51 },
    recruit_rogue: { title: "First Rogue", description: "Rescue the Rogue.", icon: "recruit", category: "recruitment", condition: { type: "rescue", target: "rogue", count: 1 }, reward: { gold: 50 }, sortOrder: 52 },
    wizard_recruit: { title: "The Wizard", description: "Rescue the Wizard.", icon: "recruit", category: "recruitment", condition: { type: "rescue", target: "wizard", count: 1 }, reward: { gold: 80 }, sortOrder: 53 },
    // Collection Achievements
    full_party: { title: "Full Roster", description: "Fill your active roster to the maximum size (12).", icon: "full_party", category: "collection", condition: { type: "roster_full" }, reward: { gold: 50 }, sortOrder: 60 },
    grand_battalion: { title: "Grand Battalion", description: "Own 12 Knights at once.", icon: "recruit", category: "collection", condition: { type: "recruit", target: "knight", count: 12 }, reward: { gold: 50 }, sortOrder: 61 },
    grand_archery: { title: "Grand Archery", description: "Own 12 Archers at once.", icon: "recruit", category: "collection", condition: { type: "recruit", target: "archer", count: 12 }, reward: { gold: 50 }, sortOrder: 62 },
    grand_champion: { title: "Grand Champion", description: "Own 12 Champions at once.", icon: "recruit", category: "collection", condition: { type: "recruit", target: "champion", count: 12 }, reward: { gold: 50 }, sortOrder: 63 },
    grand_syndicate: { title: "Grand Syndicate", description: "Own 12 Rogues at once.", icon: "recruit", category: "collection", condition: { type: "recruit", target: "rogue", count: 12 }, reward: { gold: 50 }, sortOrder: 64 },
    legion_commander: { title: "Legion Commander", description: "Own 49 units in total.", icon: "full_party", category: "collection", condition: { type: "total_unit_count", count: 49 }, reward: { gold: 100 }, sortOrder: 65 },
    collect_all_armor: { title: "Armored Core", description: "Collect all basic armor types (Forest, Azure, Ember, Sand).", icon: "all_armor", category: "collection", condition: { type: "collect_armor", count: 4 }, reward: { gold: 100 } },
    armored_elite: { title: "Armored Elite", description: "Upgrade all basic armor types to Level 2.", icon: "all_armor", category: "collection", condition: { type: "all_armor_level", level: 2 }, reward: { gold: 200 } },
};

const SFX_FILES = {
    error: './audio/Error.wav',
    gameOver: './audio/GameOver.wav',
    success: './audio/Success.wav',
    armorActivate: './audio/armor_activate.wav',
    armorEquip: './audio/armor_equip.wav',
    arrowShoot: './audio/arrow_shoot.wav',
    chestOpen: './audio/chest.wav',
    crateBreak: './audio/crate_dead.wav', // New
    barrelBreak: './audio/barrel_dead.wav', // New
    fireballShoot: './audio/fireball_shoot.wav',
    gem: './audio/gem.wav',
    goblinDie: './audio/goblin_die.mp3',
    goldDrop: './audio/gold_drop.wav',
    heal: './audio/heal.wav',
    levelCleared: './audio/level_cleared.wav',
    net_hit: './audio/net_hit.wav',
    net_throw: './audio/net_throw.wav',
    pickup: './audio/pickup.wav',
    playerDie: './audio/player_die.wav',
    playerHurt1: './audio/player_hurt1.wav',
    playerHurt2: './audio/player_hurt2.wav',
    powerup: './audio/powerup.wav',
    fireballCast: './audio/sfxFireballCast.wav',
    fireballHit: './audio/sfxFireballHit.wav',
    frostboltCast: './audio/sfxFrostboltCast.wav',
    frostboltHit: './audio/sfxFrostboltHit.wav',
    hit: './audio/sfxHit.wav',
    move: './audio/sfxMove.wav',
    select: './audio/sfxSelect.wav',
    snowmanBreak: './audio/snowman_break.wav',
    spellbookPickup: './audio/spellbook_pickup.wav',
    chainLightning: './audio/chltning.wav',
    chainLightningImpact: './audio/elecimp1.wav',
    potion: './audio/potion.wav',
    orc_die: './audio/orc_die.wav',
    stealth: './audio/stealth.wav',
    potionDrop: './audio/potion_drop.wav',
    buff: './audio/buff.wav',
    debuff: './audio/debuff.wav',
    totem: './audio/totem.wav',
    mother_die: './audio/mother_die.wav',
    dodge: './audio/dodge.wav',
    sapperExplode: './audio/explode.wav'
};

const LOUD_SFX = ['gameOver', 'fireballHit', 'sapperExplode', 'playerHurt1', 'playerHurt2'];
const QUIET_SFX = ['move', 'towerExit', 'rogueStealth'];
const LOUD_VOLUME_MULTIPLIER = 1.3;
const QUIET_VOLUME_MULTIPLIER = 0.7;

function getAdjustedVolume(soundKey, baseVolume) {
    if (LOUD_SFX.includes(soundKey)) {
        return Math.min(1, baseVolume * LOUD_VOLUME_MULTIPLIER);
    }
    if (QUIET_SFX.includes(soundKey)) {
        return Math.max(0, baseVolume * QUIET_VOLUME_MULTIPLIER);
    }
    return baseVolume;
}

const MUSIC_TRACKS = [
    './audio/music_1.mp3',
    './audio/music_2.mp3',
    './audio/music_3.mp3'
];
const MENU_MUSIC = './audio/music_theme.mp3';
const BOSS_MUSIC = './audio/music_boss.mp3';

const DEFEAT_MUSIC = './audio/music_defeat.mp3';
const VICTORY_MUSIC = './audio/music_victory.mp3';

const DEFAULT_GAME_SETTINGS = {
    playerName: "",
    musicVolume: 0.3,
    sfxVolume: 0.6,
    mute: false,
};



function loadSfx() {
    if (Object.keys(sfx).length > 0 || typeof Audio === 'undefined') return;
    Object.keys(SFX_FILES).forEach(key => {
        try {
            sfx[key] = new Audio(SFX_FILES[key]);
            sfx[key].preload = 'auto';
            sfx[key].volume = sfxVolume;
        } catch (e) {
            console.error(`Error loading SFX ${key}: ${SFX_FILES[key]}`, e);
        }
    });
}

function playSfx(soundKey) {
    if (soundKey === 'error') {
        console.groupCollapsed("playSfx('error') triggered");
        console.trace();
        console.groupEnd();
    }
    const sound = sfx[soundKey];
    if (isMuted) return; // Removed !audioInitialized guard to allow best-effort playback

    // Check if we have a loaded Audio file
    if (sound && sound.readyState >= 2) {
        try {
            sound.volume = getAdjustedVolume(soundKey, sfxVolume);
            if (!sound.paused) { sound.pause(); sound.currentTime = 0; }
            sound.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`SFX play error (${soundKey}): ${error.name} - ${error.message}`); } });
        } catch (e) { console.error(`Error attempting to play SFX ${soundKey}:`, e); }
    }
}

function playMusic(trackUrl) {
    if (isMuted || typeof Audio === 'undefined' || !trackUrl) return;

    // Safety: Stop sub-players
    if (victoryMusicPlayer && !victoryMusicPlayer.paused) { victoryMusicPlayer.pause(); victoryMusicPlayer.currentTime = 0; }
    if (defeatMusicPlayer && !defeatMusicPlayer.paused) { defeatMusicPlayer.pause(); defeatMusicPlayer.currentTime = 0; }

    const musicUrl = new URL(trackUrl, window.location.href).href;
    const currentSrc = bgMusic.src ? new URL(bgMusic.src, window.location.href).href : "";

    bgMusic.volume = musicVolume;
    if (currentSrc !== musicUrl) {
        bgMusic.src = musicUrl;
        bgMusic.load();
        // Removed !audioInitialized guard to allow best-effort playback
        bgMusic.play().catch(error => {
            if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                console.warn(`Music play error: ${error.name} - ${error.message}`);
            }
        });
    } else if (bgMusic.paused) {
        bgMusic.play().catch(e => { });
    }
}

function startMusic() {
    if (isMuted || typeof Audio === 'undefined') return; // Removed !audioInitialized guard
    bgMusic.volume = musicVolume;
    if (!bgMusic.src || bgMusic.ended) { selectAndLoadMusic(); }
    if (bgMusic.paused) { bgMusic.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Music play error: ${error.name} - ${error.message}`); } }); }
}

function stopMusic() {
    if (bgMusic && !bgMusic.paused) { bgMusic.pause(); bgMusic.currentTime = 0; }
    if (victoryMusicPlayer && !victoryMusicPlayer.paused) { victoryMusicPlayer.pause(); victoryMusicPlayer.currentTime = 0; }
    if (defeatMusicPlayer && !defeatMusicPlayer.paused) { defeatMusicPlayer.pause(); defeatMusicPlayer.currentTime = 0; }
}

function playVictoryMusic() {
    if (isMuted || typeof Audio === 'undefined' || !VICTORY_MUSIC) return;
    stopMusic();
    victoryMusicPlayer.volume = musicVolume;
    victoryMusicPlayer.src = new URL(VICTORY_MUSIC, window.location.href).href;
    victoryMusicPlayer.load();
    victoryMusicPlayer.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Victory Music play error: ${error.name} - ${error.message}`); } });
}

function playDefeatMusic() {
    if (isMuted || typeof Audio === 'undefined' || !DEFEAT_MUSIC) return;
    stopMusic();
    defeatMusicPlayer.volume = musicVolume;
    defeatMusicPlayer.src = new URL(DEFEAT_MUSIC, window.location.href).href;
    defeatMusicPlayer.load();
    defeatMusicPlayer.play().catch(error => { if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') { console.warn(`Defeat Music play error: ${error.name} - ${error.message}`); } });
}

function selectAndLoadMusic() {
    if (typeof Audio === 'undefined') return;
    // stopMusic(); // REMOVED: Prevent music from restarting during menu navigation

    // 1. Check for any "Non-Battle" screens where Menu Music should play
    const shopVisible = document.getElementById('shop-screen')?.classList.contains('visible');
    const levelSelectVisible = document.getElementById('level-select-screen')?.classList.contains('visible');
    const troopsVisible = document.getElementById('choose-troops-screen')?.classList.contains('visible');
    const mainMenuVisible = document.getElementById('main-menu')?.classList.contains('visible');
    const namePromptVisible = document.getElementById('name-prompt-overlay')?.classList.contains('visible');

    if (mainMenuVisible || shopVisible || levelSelectVisible || troopsVisible || namePromptVisible) {
        playMusic(MENU_MUSIC);
        return;
    }

    // 2. Battle Logic (when in a level)
    const isBattle = typeof isGameActive === 'function' && isGameActive();
    if (isBattle) {
        if (typeof units !== 'undefined' && Array.isArray(units)) {
            const hasBoss = units.some(u =>
                u.type === 'orc_juggernaut' ||
                u.type === 'zulkash' ||
                u.type === 'zulfar' ||
                u.type === 'vtharak' ||
                u.type === 'krizak' ||
                u.type === 'goblin_mother'
            );
            if (hasBoss) {
                playMusic(BOSS_MUSIC);
                return;
            }
        }

        // Pick a battle track if not already playing one
        const currentTrack = bgMusic.src ? bgMusic.src.substring(bgMusic.src.lastIndexOf('/') + 1) : null;
        const isPlayingBattleMusic = MUSIC_TRACKS.some(track => track.endsWith(currentTrack));

        // Fix: If music is paused (e.g. after stopMusic() in Restart Level), re-trigger it
        if (!isPlayingBattleMusic || bgMusic.paused) {
            const nextTrackIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
            playMusic(MUSIC_TRACKS[nextTrackIndex]);
        }
        return;
    }

    // 3. Default to Menu Music
    playMusic(MENU_MUSIC);
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

function showMenu() { if (!isAnyOverlayVisible() && isGameActive()) { hideUnitInfo(); menuOverlay?.classList.remove('hidden'); menuOverlay?.classList.add('visible'); updateGoldDisplay(); updateQuitButton(); stopTooltipUpdater(); startTooltipUpdater(); } }

function setVolume(type, volume) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (type === 'music') {
        musicVolume = clampedVolume;
        bgMusic.volume = musicVolume;
        victoryMusicPlayer.volume = musicVolume;
        defeatMusicPlayer.volume = musicVolume;
    } else if (type === 'sfx') {
        sfxVolume = clampedVolume;
        Object.keys(sfx).forEach(key => {
            const sound = sfx[key];
            if (sound) {
                sound.volume = getAdjustedVolume(key, sfxVolume);
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

    // Map world names to sprite sheet biomes
    let biome = 'forest';
    if (tilesetName === 'grass') biome = 'forest';
    else if (tilesetName === 'castle') biome = 'castle';
    else if (tilesetName === 'wasteland') biome = 'desert';
    else if (tilesetName === 'snow') biome = 'winter';

    return { url: tilesetUrl, variant: variant, name: tilesetName, quadrant: effectiveQuadrantIndex, biome: biome };
}

function getSpritePositionStyles(unitType, frameType = 'idle', variant = null) {
    const unitData = UNIT_DATA[unitType] || OBSTACLE_DATA[unitType];
    if (!unitData || (!unitData.useSpritesheet && !unitData.portraitUrl && !unitData.iconPath && !unitData.deadSpriteUrl && !unitData.spriteUrl)) {
        // Fallback for obstacles that might not have full data but have a sprite class
        // Return empty string for backgroundImage so CSS class styles (like .snowman) aren't overridden by 'none'
        if (OBSTACLE_DATA[unitType]) return { backgroundPosition: 'center', backgroundSize: 'contain', backgroundImage: '' };
        return { backgroundPosition: '0% 0%', backgroundSize: 'auto', backgroundImage: 'none' };
    }

    if (!unitData.useSpritesheet) {
        // Handle non-spritesheet units (e.g. old Totem, Snowman) that might have a dead sprite or icon or portrait
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
    if (!sheetConfig) {
        console.warn(`Missing sheetConfig for ${unitType}`);
        return { backgroundPosition: '0% 0%', backgroundSize: 'auto', backgroundImage: 'none' };
    }

    // For obstacles with sprite sheets, spriteRow should be 0 (they only have 1 row)
    let spriteRow = typeof unitData.spriteRow !== 'undefined' ? unitData.spriteRow : 0;

    let colIndex = 0;
    if (unitData.iconPosition) {
        if (frameType === 'dead' && unitData.deadIconPosition) {
            colIndex = unitData.deadIconPosition.col;
            spriteRow = unitData.deadIconPosition.row;
        } else if (frameType === 'portrait' && unitData.portraitIconPosition) {
            colIndex = unitData.portraitIconPosition.col;
            spriteRow = unitData.portraitIconPosition.row;
        } else {
            colIndex = unitData.iconPosition.col;
            spriteRow = unitData.iconPosition.row;
        }
    } else {
        if (frameType === 'dead') colIndex = 1;
        if (frameType === 'portrait') colIndex = 2;
    }

    const columns = sheetConfig.columns;

    // Safety check: if requested column exceeds available columns, fallback to 0 (idle)
    // This handles cases like 'door' which has 2 columns (0, 1) but might be asked for portrait (2)
    if (colIndex >= columns) {
        colIndex = 0;
    }
    const rows = sheetConfig.rows;

    // Calculate percentages for position
    // Formula: (index / (total - 1)) * 100
    // We guard against division by zero if there's only 1 column or row
    const xPercent = columns > 1 ? (colIndex / (columns - 1)) * 100 : 0;
    const yPercent = rows > 1 ? (spriteRow / (rows - 1)) * 100 : 0;
    const bgPos = `${xPercent}% ${yPercent}%`;

    // Calculate percentages for size
    // Formula: total * 100
    const widthPercent = columns * 100;
    const heightPercent = rows * 100;
    const bgSize = `${widthPercent}% ${heightPercent}%`;

    // Get the sprite URL - obstacles use imageUrl, units use basePathFormat with variants
    let effectiveSpriteUrl;
    if (sheetConfig.imageUrl) {
        // Obstacles and items use direct imageUrl
        effectiveSpriteUrl = sheetConfig.imageUrl;
    } else if (sheetConfig.basePathFormat) {
        // Units use variant-based URL
        if (frameType === 'dead' && unitData.deadSpriteUrl) {
            effectiveSpriteUrl = variant ? getUnitSpriteUrl(unitType, variant) : unitData.deadSpriteUrl;
        } else if (frameType === 'portrait' && unitData.portraitUrl) {
            effectiveSpriteUrl = variant ? getUnitSpriteUrl(unitType, variant) : unitData.portraitUrl;
        } else {
            effectiveSpriteUrl = variant ? getUnitSpriteUrl(unitType, variant) : unitData.spriteUrl;
        }
    }

    if (!effectiveSpriteUrl) {
        console.warn(`No sprite URL found for ${unitType}, frame ${frameType}`);
        return { backgroundPosition: '0% 0%', backgroundSize: 'auto', backgroundImage: 'none' };
    }
    const bgImage = effectiveSpriteUrl.startsWith('url(') ? effectiveSpriteUrl : `url('${effectiveSpriteUrl}')`;

    return {
        backgroundPosition: bgPos,
        backgroundSize: bgSize,
        backgroundImage: bgImage
    };
}

function getUnitSpriteUrl(type, variant = 'grey', armorType = 'grey') {
    const unitData = UNIT_DATA[type];
    if (!unitData || !unitData.useSpritesheet) return '';
    const sheetConfig = SPRITESHEET_CONFIG[unitData.useSpritesheet];
    if (!sheetConfig) return '';

    // Some sprite sheets use imageUrl directly (e.g., totem) instead of basePathFormat with variants
    if (sheetConfig.imageUrl) {
        return sheetConfig.imageUrl;
    }

    // Regular units use basePathFormat with variants
    if (!sheetConfig.basePathFormat) return '';

    let effectiveVariant = variant || 'grey';
    if (unitData.team === 'player') {
        // If armorType is explicitly provided and not default, use it.
        // Otherwise, trust the variant passed in (which should be the armor type).
        if (armorType && armorType !== 'grey') {
            effectiveVariant = armorType;
        } else {
            effectiveVariant = variant || unitData.armor_type || 'grey';
        }
    }
    // Fallback for missing 'none' sprites was here, but humans_none.png exists now.
    // if (effectiveVariant === 'none') effectiveVariant = 'grey';

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
        if (sheetConfig.unitRows) {
            data.spriteRow = sheetConfig.unitRows[type];
        }
    });

    // Initialize obstacle sprite sheets
    Object.keys(OBSTACLE_DATA).forEach(type => {
        const data = OBSTACLE_DATA[type];
        if (!data.useSpritesheet) return;
        const sheetConfig = SPRITESHEET_CONFIG[data.useSpritesheet];
        if (!sheetConfig) return;

        if (data.iconPosition) {
            data.spriteSheetInfo = sheetConfig;
        } else {
            data.spriteUrl = sheetConfig.imageUrl;
            data.portraitUrl = sheetConfig.imageUrl;
            data.deadSpriteUrl = sheetConfig.imageUrl;
            data.spriteSheetInfo = sheetConfig;
        }
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
selectAndLoadMusic();