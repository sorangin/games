//config.js
const MUSIC_TRACKS = [
    'audio/music_WarcraftOrc.mp3',
    'audio/music_Luffy.mp3',
    'audio/music_WormsTheme.mp3'
];

const SFX_FILES = {
    success: 'audio/Success.wav',
    error: 'audio/Error.wav',
    gameOver: 'audio/GameOver.wav',
    hit: 'audio/sfxHit.wav',
    defeat: 'audio/sfxGoblinDead.wav',
    move: 'audio/sfxMove.wav',
    select: 'audio/sfxSelect.wav',
    fireballShoot: 'audio/fireball_shoot.wav',
    fireballHit: 'audio/sfxFireballHit.wav',
    flameWaveCast: 'audio/fireball_shoot.wav',
    frostNovaCast: 'audio/sfxFrostboltCast.wav',
    frostNovaHit: 'audio/sfxFrostboltHit.wav',
    playerDie: 'audio/player_die.wav',
    startBeep: 'audio/start_beep.wav',
    heal: 'audio/heal.wav',
    arrowShoot: 'audio/arrow_shoot.wav',
    pickup: 'audio/pickup.wav',
    goldDrop: 'audio/gold_drop.wav',
    chestOpen: 'audio/chest.wav',
    cheat: 'audio/Success.wav',
    menuOpen: 'audio/sfxSelect.wav',
    menuClose: 'audio/sfxSelect.wav',
    levelSelect: 'audio/start_beep.wav',
    net_throw: 'audio/net_throw.wav',
    net_hit: 'audio/net_hit.wav',
    slow_inflicted: 'audio/sfxFrostboltHit.wav',
    shopBuy: 'audio/pickup.wav',
    levelComplete: 'audio/Success.wav',
    forfeit: 'audio/Error.wav',
    potionPickup: 'audio/pickup.wav',
    gemPickup: 'audio/pickup.wav',
    doorDestroy: 'audio/sfxHit.wav',
    towerDestroy: 'audio/sfxHit.wav',
    towerEnter: 'audio/sfxSelect.wav',
    towerExit: 'audio/sfxMove.wav',
};

const BASE_GRID_COLS = 8;
const BASE_GRID_ROWS = 10;
const ENEMY_SPAWN_ROWS_PERCENT = 0.3;
const PLAYER_SPAWN_ROWS_PERCENT = 0.2;
const TOTAL_LEVELS = 40;
const LEVELS_PER_QUADRANT = 10;
const MAX_OWNED_PER_TYPE = 12;
const MAX_ACTIVE_ROSTER_SIZE = 12;
const NET_DURATION = 2;
const NET_COOLDOWN = 3;
const FORFEIT_MOVE_THRESHOLD = 2;

const GOBLIN_ARCHER_INTRO_LEVEL = 3;
const GOBLIN_NETTER_INTRO_LEVEL = 12;
const CLUBBER_INTRO_LEVEL = 7;
const JUGGERNAUT_INTRO_LEVEL = 10;
const JUGGERNAUT_SPAWN_MULTIPLE = 10;

const GOBLIN_RED_ATK_BONUS = 1;
const GOBLIN_BLUE_HP_BONUS = 1;
const GOBLIN_BLUE_SLOW_DURATION = 2;
const GOBLIN_YELLOW_MOV_BONUS = 1;
const GOBLIN_YELLOW_RETREAT_MOV = 2;

const FIREBALL_UNLOCK_LEVEL = 4;
const FLAME_WAVE_UNLOCK_LEVEL = 8;
const FROST_NOVA_UNLOCK_LEVEL = 12;
const HEAL_UNLOCK_LEVEL = 16;

const FIREBALL_BASE_DAMAGE = 2;
const FLAME_WAVE_BASE_DAMAGE = 1;
const FROST_NOVA_BASE_DURATION = 3;
const FROST_NOVA_BASE_RADIUS_LEVEL = 1;
const HEAL_BASE_AMOUNT = 3;

const RECRUIT_COSTS = {
    knight: 100,
    archer: 150,
    champion: 200,
};

const UNIT_UPGRADE_COSTS = {
    knight_hp: 100,
    knight_atk: 100,
    archer_hp: 100,
    archer_atk: 100,
    champion_hp: 150,
    champion_atk: 150,
};

const SPELL_UPGRADE_CONFIG = {
    fireball: {
        baseCost: 100, costIncrease: 20, effectIncrease: 1,
        requiredLevel: 6, maxLevel: 99, stat: 'damage'
    },
    flameWave: {
        baseCost: 150, costIncrease: 50, effectIncrease: 1,
        requiredLevel: 10, maxLevel: 99, stat: 'damage'
    },
    frostNova: {
        baseCost: 100, costIncrease: 30, effectIncrease: 1,
        requiredLevel: 14, maxLevel: 4, stat: 'radiusLevel'
    },
    heal: {
        baseCost: 100, costIncrease: 20, effectIncrease: 2,
        requiredLevel: 18, maxLevel: 99, stat: 'amount'
    }
};

const PASSIVE_UPGRADE_COSTS = {
    gold_magnet: 100,
};

const ARROW_FLY_DURATION_MS = 300;
const FIREBALL_PROJECTILE_DURATION_MS = 400;
const FIREBALL_EXPLOSION_DURATION_MS = 800;
const NET_FLY_DURATION_MS = 400;
const MOVE_ANIMATION_DURATION_MS = 250;
const DEATH_FADE_DURATION_MS = 1000;
const DEATH_VISIBLE_DURATION_MS = 5000;
const FLAME_WAVE_STAGGER_DELAY_MS = 50;
const POPUP_DURATION_MS = 1100;
const ITEM_DROP_ANIMATION_DURATION_MS = 400;
const ITEM_PICKUP_ANIMATION_DURATION_MS = 300;
const ITEM_MAGNET_FLY_DURATION_MS = 500;
const OBSTACLE_DESTROY_DURATION_MS = 300;

const MIN_OBSTACLES = 4;
const MAX_OBSTACLES_PER_LEVEL = 0.08;
const WALL_ROCK_CHANCE = 0.4;
const DOOR_CHANCE = 0.15;
const TOWER_SPAWN_CHANCE_PER_LEVEL = 0.1;
const MAX_TOWERS_PER_LEVEL = 1;

const GOLD_DROP_CHANCE = 0.4;
const BASE_GOLD_DROP_AMOUNT = 1;
const ADVANCED_GOBLIN_TYPES = ['goblin_archer', 'goblin_netter', 'goblin_clubber', 'orc_juggernaut'];
const ADVANCED_GOBLIN_EXTRA_GOLD_CHANCE = 0.25;
const ADVANCED_GOBLIN_EXTRA_GOLD_AMOUNT = 1;

const CHEST_SPAWN_CHANCE_PER_LEVEL = 0.3;
const CHEST_BASE_GOLD_AMOUNT = 5;
const CHEST_MAX_BONUS_GOLD_PER_LEVEL = 0.5;
const CHEST_MAX_TOTAL_GOLD = 30;
const MAX_CHESTS_PER_LEVEL = 2;

const POTION_DROP_CHANCE_ENEMY = 0.05;
const POTION_DROP_CHANCE_CHEST_BASE = 0.3;
const POTION_DROP_CHANCE_CHEST_PER_LEVEL = 0.01;
const POTION_DROP_CHANCE_CHEST_MAX = 0.7;
const GEM_DROP_CHANCE_ENEMY = 0.01;
const GEM_DROP_CHANCE_CHEST_BASE = 0.15;
const GEM_DROP_CHANCE_CHEST_PER_LEVEL = 0.0075;
const GEM_DROP_CHANCE_CHEST_MAX = 0.5;

const SHINY_GEM_MIN_GOLD = 10;
const SHINY_GEM_MAX_GOLD = 20;
const HEALTH_POTION_HEAL_AMOUNT = 1;

const UNIT_DATA = {
    knight:        { name: "Knight",   baseHp: 6, baseAtk: 1, mov: 3, range: 1, team: 'player', spriteUrl: './sprites/Knight.png', deadSpriteUrl: './sprites/Knight_dead.png', portraitUrl: './sprites/knight_portrait.png', id_prefix: 'k' },
    archer:        { name: "Archer",   baseHp: 3, baseAtk: 1, mov: 2, range: 4, team: 'player', spriteUrl: './sprites/archer.png', deadSpriteUrl: './sprites/archer_dead.png', portraitUrl: './sprites/archer_portrait.png', id_prefix: 'a' },
    champion:      { name: "Champion", baseHp: 5, baseAtk: 2, mov: 3, range: 1, team: 'player', cleaveDamage: 1, spriteUrl: './sprites/champion.png', deadSpriteUrl: './sprites/champion_dead.png', portraitUrl: './sprites/champion_portrait.png', id_prefix: 'c' },
    goblin:        { name: "Goblin",         baseHp: 2, baseAtk: 1, mov: 4, range: 1, team: 'enemy',  spriteUrl: './sprites/Goblin.png', deadSpriteUrl: './sprites/Goblin_dead.png', portraitUrl: './sprites/goblin_portrait.png', id_prefix: 'g' },
    goblin_archer: { name: "Goblin Archer",  baseHp: 1, baseAtk: 1, mov: 3, range: 4, team: 'enemy',  spriteUrl: './sprites/goblin_archer.png', deadSpriteUrl: './sprites/Goblin_dead.png', portraitUrl: './sprites/goblin_archer_portrait.png', id_prefix: 'ga' },
    goblin_netter: { name: "Goblin Netter",  baseHp: 1, baseAtk: 0, mov: 3, range: 3, team: 'enemy',  spriteUrl: './sprites/goblin_netter.png', deadSpriteUrl: './sprites/Goblin_dead.png', portraitUrl: './sprites/goblin_netter_portrait.png', id_prefix: 'gn' },
    goblin_clubber:{ name: "Goblin Clubber", baseHp: 3, baseAtk: 2, mov: 3, range: 1, team: 'enemy',  knockback: true, spriteUrl: './sprites/goblin_club.png', deadSpriteUrl: './sprites/Goblin_dead.png', portraitUrl: './sprites/goblin_club_portrait.png', id_prefix: 'gc' },
    orc_juggernaut:{ name: "Orc Juggernaut", baseHp: 8, baseAtk: 3, mov: 2, range: 1, team: 'enemy',  knockback: true, spriteUrl: './sprites/orc_juggernaut.png', deadSpriteUrl: './sprites/orc_juggernaut_dead.png', portraitUrl: './sprites/orc_juggernaut_portrait.png', id_prefix: 'oj' }
};

const OBSTACLE_DATA = {
    rock:       { hp: 999, blocksMove: true,  blocksLOS: false, spriteClass: 'rock',      destructible: false, enterable: false },
    wall_rock:  { hp: 999, blocksMove: true,  blocksLOS: true,  spriteClass: 'wall_rock', destructible: false, enterable: false },
    door:       { hp: 1,   blocksMove: true,  blocksLOS: true,  spriteClass: 'door',      destructible: true,  enterable: false },
    tower:      { hp: 3,   blocksMove: false, blocksLOS: false, spriteClass: 'tower',     destructible: true,  enterable: true, rangeBonus: 1 }
};

const ITEM_DATA = {
    gold:           { spriteClass: 'gold-coin',     zIndex: 9, pickupAction: 'addGold', value: 1 },
    chest:          { spriteClass: 'chest',         zIndex: 7, pickupAction: 'openChest', baseGoldAmount: CHEST_BASE_GOLD_AMOUNT },
    health_potion:  { spriteClass: 'health-potion', zIndex: 8, pickupAction: 'healUnit', value: HEALTH_POTION_HEAL_AMOUNT },
    shiny_gem:      { spriteClass: 'shiny-gem',     zIndex: 8, pickupAction: 'addGold', valueMin: SHINY_GEM_MIN_GOLD, valueMax: SHINY_GEM_MAX_GOLD }
};

const PASSIVE_DATA = {
    gold_magnet: { name: "Greed", description: "Automatically collect gold from adjacent squares when moving/ending turn nearby.", icon: "./sprites/gold.png" }
};

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

const WORLD_MAP_IMAGE_URL = './sprites/world_map.png';

const VISUAL_QUADRANT_CENTERS = [
    { x: 28, y: 27 }, // Forest (Top-Left)
    { x: 72, y: 28 }, // Castle (Top-Right)
    { x: 27, y: 73 }, // Desert (Bottom-Left)
    { x: 73, y: 73 }  // Snow (Bottom-Right)
];
const LEVEL_DOT_SPREAD_FACTOR_UI = 12;
const INITIAL_MAP_ZOOM_LEVEL = 2.8;

const LEVEL_COMPLETE_BONUS_GOLD = {
    noSpells: 10,
    fullHp: 15,
    noLosses: 10
};

const STORAGE_KEY_GAME_PREFIX = 'knightsGambitRevamped_';
const STORAGE_KEY_LEVEL = `${STORAGE_KEY_GAME_PREFIX}level`;
const STORAGE_KEY_GOLD = `${STORAGE_KEY_GAME_PREFIX}gold`;
const STORAGE_KEY_OWNED_UNITS = `${STORAGE_KEY_GAME_PREFIX}ownedUnits`;
const STORAGE_KEY_ACTIVE_ROSTER = `${STORAGE_KEY_GAME_PREFIX}activeRoster`;
const STORAGE_KEY_UNIT_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}unitUpgrades`;
const STORAGE_KEY_SPELL_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}spellUpgrades`;
const STORAGE_KEY_PASSIVE_UPGRADES = `${STORAGE_KEY_GAME_PREFIX}passiveUpgrades`;
const STORAGE_KEY_CHEAT_SPELL_ATK = `${STORAGE_KEY_GAME_PREFIX}cheatSpellAtkBonus`;
const STORAGE_KEY_SETTINGS = `${STORAGE_KEY_GAME_PREFIX}settings`;
const LEADERBOARD_STORAGE_KEY = `${STORAGE_KEY_GAME_PREFIX}leaderboard`;
const MAX_LEADERBOARD_ENTRIES = 10;

let sfx = {};
const bgMusic = new Audio();
bgMusic.loop = true;
bgMusic.volume = 0.3;
let isMuted = false;
let audioInitialized = false;

function loadSfx() {
    if (Object.keys(sfx).length > 0 || typeof Audio === 'undefined') return;
    Object.keys(SFX_FILES).forEach(key => {
        try {
            sfx[key] = new Audio(SFX_FILES[key]);
            sfx[key].preload = 'auto';
        } catch (e) {
            console.error(`Error loading SFX ${key}: ${SFX_FILES[key]}`, e);
        }
    });
    try {
        sfx.success.volume = 0.6; sfx.error.volume = 0.6; sfx.gameOver.volume = 0.8;
        sfx.hit.volume = 0.7; sfx.defeat.volume = 0.7; sfx.move.volume = 0.4;
        sfx.select.volume = 0.5; sfx.fireballShoot.volume = 0.7; sfx.fireballHit.volume = 0.8;
        sfx.flameWaveCast.volume = 0.7; sfx.frostNovaCast.volume = 0.6; sfx.frostNovaHit.volume = 0.7;
        sfx.playerDie.volume = 0.7; sfx.startBeep.volume = 0.6; sfx.heal.volume = 0.7;
        sfx.arrowShoot.volume = 0.5; sfx.pickup.volume = 0.7; sfx.goldDrop.volume = 0.6;
        sfx.chestOpen.volume = 0.7; sfx.cheat.volume = 0.7; sfx.menuOpen.volume = 0.5;
        sfx.menuClose.volume = 0.5; sfx.levelSelect.volume = 0.6;
        sfx.net_throw.volume = 0.6; sfx.net_hit.volume = 0.6;
        sfx.slow_inflicted.volume = 0.7; sfx.shopBuy.volume = 0.7;
        sfx.levelComplete.volume = 0.7; sfx.forfeit.volume = 0.6;
        sfx.potionPickup.volume = 0.7; sfx.gemPickup.volume = 0.7;
        sfx.doorDestroy.volume = 0.7; sfx.towerDestroy.volume = 0.7; sfx.towerEnter.volume = 0.5;
        sfx.towerExit.volume = 0.4;
    } catch (e) {
        console.warn("Error setting SFX volumes:", e);
    }
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

function startMusic() {
    if (isMuted || !audioInitialized || typeof Audio === 'undefined') return;
    if (!bgMusic.src || bgMusic.ended) {
        selectAndLoadMusic();
        if (!bgMusic.src) return;
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
    const nextTrackUrl = new URL(nextTrack, window.location.href).href;
    if (nextTrack && bgMusic.src !== nextTrackUrl) { bgMusic.src = nextTrack; bgMusic.load(); }
    else if (!nextTrack) { bgMusic.src = ''; }
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
            if (!audioInitialized) { audioInitialized = true; loadSfx(); }
        });
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
    if (!audioInitialized || isMuted) return;

    const uiCheckFunctionsAvailable =
        typeof isGameActive === 'function' &&
        typeof isGameOver === 'function' &&
        typeof isMenuOpen === 'function' &&
        typeof isLeaderboardOpen === 'function' &&
        typeof isShopOpen === 'function' &&
        typeof isLevelSelectOpen === 'function' &&
        typeof isMainMenuOpen === 'function' &&
        typeof isLevelCompleteOpen === 'function' &&
        typeof isChooseTroopsScreenOpen === 'function';

    if (!uiCheckFunctionsAvailable) {
        console.warn("Cannot determine music state: UI check functions missing or not yet defined.");
        if (!document.querySelector('.overlay.visible') && bgMusic.paused) {
             startMusic();
        }
        return;
    }

    const canPlayMusic = isGameActive() && !isGameOver() && !isMenuOpen() && !isLeaderboardOpen() && !isShopOpen() && !isLevelSelectOpen() && !isMainMenuOpen() && !isLevelCompleteOpen() && !isChooseTroopsScreenOpen();

    if (canPlayMusic && bgMusic.paused) {
        startMusic();
    }
}

function getTilesetForLevel(level) {
    const levelIndex = level - 1;
    const quadrantIndex = Math.floor(levelIndex / LEVELS_PER_QUADRANT) % 4;
    let tilesetName;

    switch (quadrantIndex) {
        case 0: tilesetName = 'grass'; break;
        case 1: tilesetName = 'castle'; break;
        case 2: tilesetName = 'wasteland'; break;
        case 3: tilesetName = 'snow'; break;
        default: tilesetName = 'grass';
    }

    const tilesetUrl = TILESET_IMAGES[tilesetName] || TILESET_IMAGES.grass;
    const variant = TILESET_GOBLIN_VARIANT_MAP[tilesetName] || 'green';

    return { url: tilesetUrl, variant: variant, name: tilesetName, quadrant: quadrantIndex };
}