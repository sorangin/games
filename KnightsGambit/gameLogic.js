// gameLogic.js





let units = [];


let items = [];


let obstacles = [];


let gridState = [];


let selectedUnit = null;


let currentTurn = 'player';


let validMoves = [];


let validAttacks = { units: [], obstacles: [] };


let unitCounter = 0;


let itemCounter = 0;


let obstacleCounter = 0;


let currentLevel = 1;
let turnCCApplied = new Set();


let levelToRestartOnLoss = 1;


let currentSpell = null;


let spellUses = {};


let spellsUnlocked = {};


let spellUnlockNotificationsShown = null; // Will be set by loadGameData()


let spellsUsedThisLevel = false;


let unlimitedSpellsCheat = false;
let isPlayerCheater = false;


let winCheckTimeout = null;


let levelClearedAwaitingInput = false;


let isGameActiveFlag = false;
function isGameActive() { return isGameActiveFlag; }


let playerActionsTakenThisLevel = 0;
window.turnsCountThisLevel = 1;
window.parTurns = 0;
window.turnsSinceLastDamage = 0;
window.failedExecutionerBonus = false;


let goldCollectedThisLevel = 0;


let baseGoldEarnedThisLevel = 0;


let enemiesKilledThisLevel = 0;


let unitsLostThisLevel = 0;


let highestLevelReached = 1;
let isSkeletonWorldActive = false;
let skeletonWorldLevel = 0;
let isSkeletonPortalSpawned = false; // Secret portal visibility


let shardUpgradeCount = 0;
let playerGold = 0;


let playerOwnedUnits = { knight: 2, archer: 0, champion: 0, rogue: 0 };


let playerActiveRoster = {};


let activeRosterAtLevelStart = {};


let playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 };


let playerAbilityUpgrades = { rogue_quickstrike: 0, champion_cleave: 0, war_bow: 0, flame_ring: 0, glacier_bow: 0 };
let equippedWarBow = false;
let equippedGlacierBow = false;
let equippedFlameRing = false;
let playerChainLightningCooldownReduction = 0;


let playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };


let playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0, evasion: 0, thorns: 0, vampiric_aura: 0, critical_strike: 0 };


let playerOwnedArmor = { grey: 1 };


let equippedArmorId = 'grey';
let equippedBootsId = 'none';
let stashedItems = new Set();
let equippedHelmetId = 'none'; // New helmet slot


let equippedFlameCloak = false; // Flame Cloak is separate from armor, can be equipped with any armor


let playerCheatSpellAttackBonus = 0;
let playerInventory = { nets: 0 };
window.playerInventory = playerInventory; // Ensure global access for UI


let maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE;


let lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN;


let gameSettings = { ...DEFAULT_GAME_SETTINGS };
let gameMode = 'normal'; // 'normal', 'naked', 'hardcore'


let achievementProgress = {};


let currentGridCols = BASE_GRID_COLS;


let currentGridRows = BASE_GRID_ROWS;


let currentTerrainInfo = { url: '', variant: 'green', name: 'grass', quadrant: 0 };
let currentLevelObjective = OBJECTIVE_TYPES.KILL_ALL;
let lifetimeKills = 0;
let lifetimeGold = 0;
let lifetimeWins = 0;
let lifetimeLosses = 0;
let objectiveProgress = {};
let objectiveTarget = null;


let deathSpriteTimeouts = new Map();


let forestArmorActiveTurns = 0;


let forestArmorUses = false;


let isProcessing = false;


let pendingFlameWaves = [];
let pendingFrostNovas = []; // Track Kri'zak Frost Nova targets for UI warning


let seenShopItems = {};
let armoryVisited = false;
let isNakedChallengeActive = false;
let unlockedUnits = { knight: true, archer: false, champion: false, rogue: false, wizard: false };
let ownedAvatars = { knight: true };
let selectedAvatar = 'knight';





// function isUnitAliveAndValid(unit) is above


let playerTurnCount = 0;





function isUnitAliveAndValid(unit) {


    return unit?.hp > 0 && units.some(u => u.id === unit.id);


}





function isObstacleIntact(obstacle) {


    return obstacle?.hp > 0 && obstacles.some(o => o.id === obstacle.id);


}





function isCellInBounds(x, y) {


    return x >= 0 && x < currentGridCols && y >= 0 && y < currentGridRows;


}





function getObstacleAt(x, y) {


    return obstacles.find(obs => obs.x === x && obs.y === y && isObstacleIntact(obs));


}





function getItemAt(x, y) {


    const itemsOnCell = items.filter(item => item.x === x && item.y === y && !item.collected);


    if (itemsOnCell.length === 0) return null;


    const unopenedChest = itemsOnCell.find(item => item.type === 'chest' && !item.opened);


    if (unopenedChest) return unopenedChest;


    itemsOnCell.sort((a, b) => (ITEM_DATA[b.type]?.zIndex || 0) - (ITEM_DATA[a.type]?.zIndex || 0));


    return itemsOnCell[0] || null;


}





function getUnitAt(x, y) {
    return units.find(unit => unit.x === x && unit.y === y && isUnitAliveAndValid(unit));
}

function getPassiveValue(passiveId) {
    const level = playerPassiveUpgrades[passiveId] || 0;
    if (level === 0) return 0;

    switch (passiveId) {
        case 'evasion':
            // 1% per level, max 5%
            return Math.min(5, level);
        case 'thorns':
            // 1 damage per level
            return level;
        case 'vampiric_aura':
            // 1 HP per level
            return level;
        case 'gold_magnet':
            return level;
        case 'tactical_command':
            return level;
        default:
            return 0;
    }
}





function getUnitsInArea(centerX, centerY, radius) {


    const affectedUnits = [];


    for (let dx = -radius; dx <= radius; dx++) {


        for (let dy = -radius; dy <= radius; dy++) {


            // Square radius (Chebyshev distance) - no diamond check needed


            const nx = centerX + dx;


            const ny = centerY + dy;


            if (isCellInBounds(nx, ny)) {


                const unit = getUnitAt(nx, ny);


                if (unit) affectedUnits.push(unit);


            }


        }


    }


    return affectedUnits;


}





function getAdjacentCells(x, y, includeDiagonal = false) {


    const cells = [];


    const directions = includeDiagonal


        ? [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]]


        : [[0, -1], [0, 1], [-1, 0], [1, 0]];





    for (const [dx, dy] of directions) {


        const nx = x + dx;


        const ny = y + dy;


        if (isCellInBounds(nx, ny)) {


            cells.push({ x: nx, y: ny });


        }


    }


    return cells;


}





function getDistance(posA, posB) {


    if (!posA || !posB) return Infinity;


    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);


}





function getMoveCost(x, y) {


    if (!isCellInBounds(x, y)) return 999;


    const obs = getObstacleAt(x, y);


    if (obs && OBSTACLE_DATA[obs.type]?.movementCost) {


        return OBSTACLE_DATA[obs.type].movementCost;


    }


    return 1;


}





function hasLineOfSight(startUnit, endPos, ignoreStealthOnTarget = false) {


    if (!startUnit || !endPos) return false;


    const startX = startUnit.x; const startY = startUnit.y;


    const endX = endPos.x; const endY = endPos.y;


    if (startX === endX && startY === endY) return true;





    let x = startX; let y = startY;


    const dx = Math.abs(endX - startX); const dy = -Math.abs(endY - startY);


    const sx = startX < endX ? 1 : -1; const sy = startY < endY ? 1 : -1;


    let err = dx + dy; let e2;


    let safety = 0; const maxSafety = (currentGridCols + currentGridRows) * 2;





    // Archers, Wizards, and Aerial units can shoot over units and some obstacles
    const canShootOverUnits = startUnit.type === 'archer' || startUnit.type === 'goblin_archer' || startUnit.type === 'goblin_pyromancer' || startUnit.type === 'wizard' || startUnit.isAerial;





    while (safety < maxSafety) {


        if (!(x === startX && y === startY) && !(x === endX && y === endY)) {


            const obs = getObstacleAt(x, y);


            if (obs && OBSTACLE_DATA[obs.type]?.blocksLOS && isObstacleIntact(obs)) {


                return false;


            }





            // Only check units if the attacker cannot shoot over them


            if (!canShootOverUnits) {


                const unit = getUnitAt(x, y);


                if (unit && unit.id !== startUnit.id) {


                    // Only non-stealthed units block LOS


                    if (!unit.isStealthed) {


                        return false;


                    }


                }


            }


        }


        if (x === endX && y === endY) break;


        e2 = 2 * err;


        let moved = false;


        if (e2 >= dy) {


            if (x === endX) break;


            err += dy; x += sx; moved = true;


        }


        if (e2 <= dx) {


            if (y === endY) break;


            err += dx; y += sy; moved = true;


        }


        if (!moved) break;


        safety++;


    }


    if (safety >= maxSafety) { console.error("LOS safety limit reached!"); return false; }





    const endUnit = getUnitAt(endX, endY);


    if (endUnit && endUnit.id !== startUnit.id && endUnit.isStealthed && !ignoreStealthOnTarget) {
        // 1-turn grace period for adjacent stealthed Rogues
        const dist = getDistance(startUnit, endUnit);
        if (dist <= 1 && (endUnit.stealthTurnsAdjacent || 0) < 1) {
            return false;
        }
        if (dist > 1) {
            return false;
        }
    }


    return true;


}





async function preloadAssetsAndStart() {
    resetProfileState();
    loadGameData();


    setVolume('music', musicVolume);


    setVolume('sfx', sfxVolume);


    initializeAudio();





    // Synchronize mute state to audio objects
    applyMuteState(isMuted);





    showMainMenu();


}





function calculateGridDimensions(level) {


    const baseLevel = ((level - 1) % TOTAL_LEVELS_BASE) + 1;


    const levelFactor = Math.floor((baseLevel - 1) / 5);


    currentGridCols = BASE_GRID_COLS + Math.floor(levelFactor / 2) + (levelFactor % 2);


    currentGridRows = BASE_GRID_ROWS + Math.floor(levelFactor / 2);


    currentGridCols = Math.max(BASE_GRID_COLS, Math.min(currentGridCols, 15));


    currentGridRows = Math.max(BASE_GRID_ROWS, Math.min(currentGridRows, 15));


    document.documentElement.style.setProperty('--grid-cols', currentGridCols);


    document.documentElement.style.setProperty('--grid-rows', currentGridRows);


    document.documentElement.style.setProperty('--board-aspect-ratio', currentGridCols / currentGridRows);


}





function checkSpellUnlock(spellName, unlockLevel) {


    const wasUnlocked = !!spellsUnlocked[spellName];


    spellsUnlocked[spellName] = highestLevelReached >= unlockLevel;


    return spellsUnlocked[spellName];


}





function resetSpellStateForNewLevel() {


    currentSpell = null;


    spellsUsedThisLevel = false;


    let justUnlockedFeedback = [];


    const spellNames = Object.keys(SPELL_UPGRADE_CONFIG);


    spellNames.forEach(name => {


        const config = SPELL_UPGRADE_CONFIG[name];


        let unlockCheckLevel = 999;


        if (name === 'fireball') unlockCheckLevel = FIREBALL_UNLOCK_LEVEL;


        else if (name === 'flameWave') unlockCheckLevel = FLAME_WAVE_UNLOCK_LEVEL;


        else if (name === 'frostNova') unlockCheckLevel = FROST_NOVA_UNLOCK_LEVEL;


        else if (name === 'heal') unlockCheckLevel = HEAL_UNLOCK_LEVEL;





        const previouslyUnlocked = spellsUnlocked[name];


        spellsUnlocked[name] = highestLevelReached >= unlockCheckLevel;





        // Safeguard: Ensure notification tracker exists


        if (!spellUnlockNotificationsShown) spellUnlockNotificationsShown = {};





        // Only show notification if spell is unlocked AND notification has never been shown


        if (spellsUnlocked[name] && !spellUnlockNotificationsShown[name]) {


            justUnlockedFeedback.push(config?.name || name);


            spellUnlockNotificationsShown[name] = true;


            saveGameData(); // Save immediately so notification doesn't show again


        }


    });





    spellUses = {


        fireball: !!spellsUnlocked.fireball,


        flameWave: !!spellsUnlocked.flameWave,


        frostNova: !!spellsUnlocked.frostNova,


        heal: !!spellsUnlocked.heal


    };





    if (unlimitedSpellsCheat) {


        Object.keys(spellUses).forEach(key => {


            if (spellsUnlocked[key]) spellUses[key] = true;


        });


    }





    if (typeof updateSpellUI === 'function') updateSpellUI();





    if (justUnlockedFeedback.length > 0 && typeof showFeedback === 'function' && typeof playSfx === 'function') {


        setTimeout(() => {


            justUnlockedFeedback.forEach(spellDisplayName => {


                showFeedback(`Spell Unlocked: ${spellDisplayName}!`, 'feedback-spell-unlock', 3000);


            });


            playSfx('spellUnlock');


        }, 150);


    }


}





function clearLevelItemsAndObstacles() {


    items.forEach(item => item.element?.remove());


    items = [];


    obstacles.forEach(obs => obs.element?.remove());


    obstacles = [];


    clearTimeoutMap(deathSpriteTimeouts);


}





function clearTimeoutMap(timeoutMap) {


    timeoutMap.forEach(timeoutId => clearTimeout(timeoutId));


    timeoutMap.clear();


}





function resetLevelState() {


    units.forEach(unit => {


        unit.element?.remove();


        if (typeof removeWorldHpBar === 'function') removeWorldHpBar(unit.id);


    });


    // Reset level-specific aggressive play counters
    window.turnsCountThisLevel = 1;
    window.parTurns = 0; // Reset parTurns to avoid stale UI calculations
    window.turnsSinceLastDamage = 0;
    window.failedExecutionerBonus = false;


    units = [];
    currentLevelObjective = OBJECTIVE_TYPES.KILL_ALL;
    objectiveProgress = {};
    objectiveTarget = null;


    // Reset aggressive play tracking for UI
    if (typeof updateParUI === 'function') updateParUI();


    selectedUnit = null;


    validMoves = [];


    validAttacks = { units: [], obstacles: [] };


    currentTurn = 'player';


    gridState = [];


    clearLevelItemsAndObstacles();

    if (typeof clearRainEffect === 'function') clearRainEffect();

    levelClearedAwaitingInput = false;


    isProcessing = false;


    unitCounter = 0;


    itemCounter = 0;


    obstacleCounter = 0;


    playerActionsTakenThisLevel = 0;


    goldCollectedThisLevel = 0;


    baseGoldEarnedThisLevel = 0;


    enemiesKilledThisLevel = 0;


    unitsLostThisLevel = 0;


    forestArmorActiveTurns = 0;


    forestArmorUses = true;


    pendingFlameWaves = []; // Clear pending flame waves from previous level/pyromancers





    if (typeof clearAllWorldHpBars === 'function') clearAllWorldHpBars();


    if (typeof clearPendingFlameWaveWarnings === 'function') clearPendingFlameWaveWarnings();


    if (winCheckTimeout) clearTimeout(winCheckTimeout);


    winCheckTimeout = null;


}





function fullGameReset() {
    if (typeof isSkeletonWorldActive !== 'undefined' && isSkeletonWorldActive) {
        isSkeletonWorldActive = false;
        isSkeletonPortalSpawned = false; // Portal disappears if exited early
        saveGameData();
    }
    resetLevelState();
    seenShopItems = {};
    // stopMusic(); // Removed to allow menu music to play uninterrupted
    isGameActiveFlag = false;


    currentLevel = 1;


    levelToRestartOnLoss = 1;


    saveSettings();


    if (typeof hideUnitInfo === 'function') hideUnitInfo();
}





function initGame(startLevel = 1) {


    isGameActiveFlag = true;


    isProcessing = true;


    loadGameData();
    currentLevel = startLevel;
    playerInventory = { nets: 0 }; // Reset temporary inventory for new level
    window.playerInventory = playerInventory;



    levelToRestartOnLoss = currentLevel;


    activeRosterAtLevelStart = { ...playerActiveRoster };





    resetLevelState();

    // Objective Selection (Must happen AFTER resetLevelState)
    const isBossLevel = (currentLevel >= JUGGERNAUT_INTRO_LEVEL && currentLevel % JUGGERNAUT_SPAWN_LEVEL_MULTIPLE === 0);
    const isSkeletonBossLevel = (isSkeletonWorldActive && currentLevel % 5 === 0);

    if (currentLevel % 5 === 0 && !isBossLevel && !isSkeletonBossLevel) {
        let types = Object.keys(OBJECTIVE_TYPES).filter(t => OBJECTIVE_TYPES[t] !== OBJECTIVE_TYPES.KILL_ALL);
        // Requirement: Duel of Champions only level 45+
        if (currentLevel < 45) {
            types = types.filter(t => OBJECTIVE_TYPES[t] !== OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS);
        }
        const randomKey = types[Math.floor(Math.random() * types.length)];
        currentLevelObjective = OBJECTIVE_TYPES[randomKey];
    } else {
        currentLevelObjective = OBJECTIVE_TYPES.KILL_ALL;
    }


    calculateGridDimensions(currentLevel);


    resetSpellStateForNewLevel();





    try {
        if (typeof calculateCellSize === 'function') calculateCellSize();
        currentTerrainInfo = getTilesetForLevel(currentLevel);
        if (typeof setupBoard === 'function') setupBoard(currentTerrainInfo.url);
        if (typeof updateUiForNewLevel === 'function') updateUiForNewLevel();

        // Check for Duel selection before proceeding
        if (currentLevelObjective === OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS && !objectiveProgress.unitType) {
            if (typeof showDuelSelection === 'function') {
                showDuelSelection();
                return; // Wait for user choice
            }
        }

        proceedWithLevelSetup();

    } catch (initError) {
        console.error("Error during game initialization:", initError);
        isGameActiveFlag = false;
        if (typeof showFeedback === 'function') showFeedback("Error loading level!", "feedback-error", 5000);
    } finally {
        isProcessing = false;
        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
        if (typeof updateQuitButton === 'function') updateQuitButton();
        if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility();
    }
}

/**
 * Continues level setup after any prerequisite steps (like Duel selection) are complete
 */
function proceedWithLevelSetup() {
    isProcessing = true; // Re-ensure flag if called from UI

    // Reset level-specific flags
    window.rescueMessageShown = false;
    window.victoryTriggered = false;

    initializeGridState();
    spawnObstacles();
    initObjectiveLogic();
    spawnInitialUnits();
    window.isInitializingLevel = true;
    applyArmorBonuses();
    window.isInitializingLevel = false;

    spawnEnemies();
    spawnItems();
    spawnBarrelsAndCrates();

    units.forEach(u => {
        if (u.team === 'player') u.hp = u.maxHp; // Final absolute sync
        u.acted = false; u.actionsTakenThisTurn = 0;
        u.isFrozen = false; u.frozenTurnsLeft = 0; u.slowedTurnsLeft = 0; u.slowedMovPenalty = 0;
        u.isNetted = false; u.nettedTurnsLeft = 0;
        u.isSlowed = false; u.slowedTurnsLeft = 0;
        u.isStealthed = false; u.quickStrikeActive = false;
        u.stealthAttackBonusUsed = false; u.netCooldownTurnsLeft = 0;
        u.totemCooldown = 0; u.flameWaveCooldown = 0;
        u.inTower = null; u.currentRange = u.baseRange;
        u.unstealthedThisTurn = false;
    });

    if (typeof recalculateAllUnitsStats === 'function') recalculateAllUnitsStats();

    // Final balancing for Duel Boss
    if (currentLevelObjective === OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) {
        if (typeof balanceDuelBoss === 'function') balanceDuelBoss();
    }

    units.forEach(u => {
        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(u);
    });

    if (typeof renderAll === 'function') renderAll();
    if (gameSettings.showHpBars && typeof createAllWorldHpBars === 'function') createAllWorldHpBars();
    if (typeof applyLayout === 'function') applyLayout();
    if (typeof centerView === 'function') centerView(true);

    playerTurnCount = 1;
    selectAndLoadMusic();
    startMusicIfNotPlaying();
    if (typeof updateParUI === 'function') updateParUI();

    isProcessing = false;
    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
}








function initializeGridState() {


    gridState = Array.from({ length: currentGridRows }, () => Array(currentGridCols).fill(null));


}





const DOODAD_TYPES = [


    'rock_1', 'rock_2', 'rock_3',


    'bones_1', 'bones_2', 'bones_3', 'bone_spear',


    'goblin_banner_1', 'goblin_banner_2', 'cauldron', 'bonfire',


    'tree_stump'


];





function getRandomDoodad() {


    return DOODAD_TYPES[Math.floor(Math.random() * DOODAD_TYPES.length)];


}





function spawnObstacles() {


    const totalCells = currentGridCols * currentGridRows;


    const numObstacles = Math.max(MIN_OBSTACLES, Math.floor(totalCells * MAX_OBSTACLES_PER_LEVEL_FACTOR));


    const enemySpawnHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT);


    const playerSpawnHeight = Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);


    const validSpawnMinY = enemySpawnHeight;


    const validSpawnMaxY = currentGridRows - playerSpawnHeight - 1;


    let spawnedCount = 0;


    const occupied = new Set();





    if (!gridState || gridState.length !== currentGridRows || gridState[0].length !== currentGridCols) {


        initializeGridState();


    }





    const tryPlaceObstacle = (type, x, y, isVertical = false) => {


        if (!isCellInBounds(x, y) || occupied.has(`${x},${y}`) || gridState[y]?.[x]) {


            return null;


        }


        const obs = createObstacle(type, x, y);


        if (obs) {


            obs.isVertical = isVertical;


            occupied.add(`${x},${y}`);


            gridState[y][x] = { type: type };


            return obs;


        }


        return null;


    };

    // Spawn Cages for Unit Rescues
    const spawnCages = () => {
        let cageType = null;
        if (currentLevel === 10 && !unlockedUnits.archer) cageType = 'cage_archer';
        else if (currentLevel === 24 && !unlockedUnits.rogue) cageType = 'cage_rogue';
        else if (currentLevel === 40 && !unlockedUnits.champion) cageType = 'cage_champion';
        else if (currentLevel === 60 && !unlockedUnits.wizard) cageType = 'cage_wizard';

        if (cageType) {
            const cageY = Math.random() < 0.5 ? 0 : 1;
            let cageX = Math.floor(Math.random() * currentGridCols);
            let attempts = 0;
            while ((!isCellInBounds(cageX, cageY) || occupied.has(`${cageX},${cageY}`) || gridState[cageY]?.[cageX]) && attempts < 20) {
                cageX = Math.floor(Math.random() * currentGridCols);
                attempts++;
            }

            if (attempts < 20) {
                tryPlaceObstacle(cageType, cageX, cageY);
            } else {
                console.warn("Could not place cage!");
            }
        }
    };
    spawnCages();





    // Spawn Mud Patches (Level 11+)


    if (currentLevel >= 11) {


        const mudChance = 0.06;


        for (let y = 0; y < currentGridRows; y++) {


            for (let x = 0; x < currentGridCols; x++) {


                if (Math.random() < mudChance) {


                    tryPlaceObstacle('mud', x, y);


                }


            }


        }


    }

    // Spawn Spiked Traps (Level 65+)
    if (currentLevel >= 65) {
        const trapChance = 0.05;
        const tileset = getTilesetForLevel(currentLevel);
        const trapType = (tileset.name === 'grass' || tileset.name === 'skeleton') ? 'spiked_vines' : 'spiked_balls';

        for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) {
            for (let x = 0; x < currentGridCols; x++) {
                if (Math.random() < trapChance) {
                    tryPlaceObstacle(trapType, x, y);
                }
            }
        }
    }





    let spawnPool = [];


    if (validSpawnMinY <= validSpawnMaxY) {


        for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) {


            for (let x = 0; x < currentGridCols; x++) {


                if (isCellInBounds(x, y)) spawnPool.push({ x, y });


            }


        }


        spawnPool.sort(() => 0.5 - Math.random());


    } else {


        console.warn("No valid Y range for obstacle spawning.");


        return;


    }





    // --- Special Features (Towers, Snowmen, Doors) ---


    let placedFeatures = { towers: 0, snowmen: 0, doors: 0 };





    if (currentLevel >= SNOWMAN_INTRO_LEVEL && currentTerrainInfo.name === 'snow') {


        let snowmenToTry = spawnPool.filter(pos => Math.random() < SNOWMAN_SPAWN_CHANCE_IN_SNOW).length;


        snowmenToTry = Math.min(snowmenToTry, SNOWMAN_MAX_PER_LEVEL);


        for (let i = 0; i < spawnPool.length && placedFeatures.snowmen < snowmenToTry; i++) {


            const pos = spawnPool[i];


            if (tryPlaceObstacle('snowman', pos.x, pos.y)) {


                placedFeatures.snowmen++; spawnedCount++; spawnPool.splice(i, 1); i--;


            }


        }


    }





    const towerChance = TOWER_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE * 2);


    if (Math.random() < towerChance) {


        for (let i = 0; i < spawnPool.length && placedFeatures.towers < MAX_TOWERS_PER_LEVEL; i++) {


            const pos = spawnPool[i];


            if (tryPlaceObstacle('tower', pos.x, pos.y)) {


                placedFeatures.towers++; spawnedCount++; spawnPool.splice(i, 1); i--; break;


            }


        }


    }





    const allowDoors = (currentTerrainInfo.name === 'castle' || currentTerrainInfo.name === 'wasteland' || currentTerrainInfo.name === 'snow') && currentTerrainInfo.name !== 'forest';


    if (allowDoors) {


        // Find suitable spots for doors (between two walls)


        const isWallType = (x, y) => {


            const obs = getObstacleAt(x, y);


            return obs && ['wall_rock', 'pallisade_wall_1', 'pallisade_wall_2'].includes(obs.type);


        };





        const clearForDoor = (x, y, isVertical) => {


            // Clear the 2 tiles orthogonal to the door orientation


            const paths = isVertical ? [{ x: x - 1, y: y }, { x: x + 1, y: y }] : [{ x: x, y: y - 1 }, { x: x, y: y + 1 }];


            paths.forEach(p => {


                if (!isCellInBounds(p.x, p.y)) return;


                const obsAtP = obstacles.find(o => o.x === p.x && o.y === p.y);


                if (obsAtP && !obsAtP.enterable) {


                    const idx = obstacles.indexOf(obsAtP);


                    if (idx > -1) {


                        obstacles.splice(idx, 1);


                        if (obsAtP.element) obsAtP.element.remove();


                    }


                    if (gridState[p.y]) gridState[p.y][p.x] = null;


                    occupied.delete(`${p.x},${p.y}`);


                }


            });


        };





        let doorsToPlace = Math.min(5, Math.floor(numObstacles * 0.15));


        for (let i = 0; i < spawnPool.length && placedFeatures.doors < doorsToPlace; i++) {


            const pos = spawnPool[i];





            // Door candidates must be between EXACTLY two walls on opposite sides


            const wallLeft = isWallType(pos.x - 1, pos.y);


            const wallRight = isWallType(pos.x + 1, pos.y);


            const wallUp = isWallType(pos.x, pos.y - 1);


            const wallDown = isWallType(pos.x, pos.y + 1);





            let doorVertical = false;


            let validSpot = false;





            // Only horizontal/vertical bridge, no corners or isolated spots


            if (wallLeft && wallRight && !wallUp && !wallDown) {


                doorVertical = false; // bridges walls -> faces Up/Down


                validSpot = true;


            } else if (wallUp && wallDown && !wallLeft && !wallRight) {


                doorVertical = true; // bridges walls -> faces Left/Right


                validSpot = true;


            }





            if (validSpot) {


                if (tryPlaceObstacle('door', pos.x, pos.y, doorVertical)) {


                    clearForDoor(pos.x, pos.y, doorVertical);


                    placedFeatures.doors++; spawnedCount++; spawnPool.splice(i, 1); i--;


                }


            }


        }


    }





    // --- Archetype Selection ---


    const archetypes = ['open', 'choke', 'arena', 'maze', 'river', 'village', 'stone_circle'];


    let archetype = archetypes[Math.floor(Math.random() * archetypes.length)];





    // Theme-based preferences


    if (currentTerrainInfo.name === 'castle') {
        const castleArchetypes = ['village', 'arena', 'choke', 'maze'];
        archetype = castleArchetypes[Math.floor(Math.random() * castleArchetypes.length)];
    } else if (currentTerrainInfo.name === 'snow') {
        const snowArchetypes = ['river', 'open', 'maze'];
        archetype = snowArchetypes[Math.floor(Math.random() * snowArchetypes.length)];
    }





    // Fallback for very small maps or specific conditions


    if (numObstacles < 5) archetype = 'open';





    console.log(`Generating Level ${currentLevel} with Archetype: ${archetype}`);





    const minX = 0;


    const maxX = currentGridCols - 1;


    const minY = validSpawnMinY;


    const maxY = validSpawnMaxY;





    switch (archetype) {


        case 'choke':


            generateChokePoints(tryPlaceObstacle, minX, maxX, minY, maxY);


            break;


        case 'arena':


            generateArena(tryPlaceObstacle, minX, maxX, minY, maxY);


            break;


        case 'maze':


            generateMaze(tryPlaceObstacle, minX, maxX, minY, maxY);


            break;


        case 'river':


            generateRiver(tryPlaceObstacle, minX, maxX, minY, maxY);


            break;


        case 'village':
            generateVillage(tryPlaceObstacle, minX, maxX, minY, maxY, occupied, gridState);
            break;

        case 'stone_circle':
            generateStoneCircle(tryPlaceObstacle, minX, maxX, minY, maxY);
            break;


        case 'open':


        default:


            generateOpenField(tryPlaceObstacle, minX, maxX, minY, maxY, numObstacles - spawnedCount);


            break;


    }





    // --- Protect Tower Entrances (ensure top and bottom cells are clear) ---


    obstacles.forEach(obs => {


        if (obs.type === 'tower' && obs.enterable) {


            const towerX = obs.x;


            const towerY = obs.y;





            // Clear cells above and below the tower (these are entrance/exit points)


            const entranceCells = [


                { x: towerX, y: towerY - 1 }, // Top entrance


                { x: towerX, y: towerY + 1 }  // Bottom entrance


            ];





            entranceCells.forEach(cell => {


                if (!isCellInBounds(cell.x, cell.y)) return;





                const blockingObstacle = obstacles.find(o =>


                    o.x === cell.x && o.y === cell.y && o.type !== 'mud'


                );





                if (blockingObstacle) {


                    // Remove blocking obstacle


                    const idx = obstacles.indexOf(blockingObstacle);


                    if (idx > -1) {


                        obstacles.splice(idx, 1);


                        if (blockingObstacle.element) blockingObstacle.element.remove();


                    }





                    // Reset level-specific tracking
                    window.rescuedUnitsThisLevel = [];

                    // Clear gridState
                    if (gridState[cell.y] && gridState[cell.y][cell.x]) {


                        gridState[cell.y][cell.x] = null;


                    }





                    // Remove from occupied set


                    occupied.delete(`${cell.x},${cell.y}`);

                }


            });


        }


    });





    validateAndFixPath();


}





// --- Archetype Generators ---





function validateAndFixPath() {


    // 1. Identify start (player zone) and goal (enemy zone)


    const startX = Math.floor(currentGridCols / 2);


    const startY = currentGridRows - 1; // Bottom center


    // Target Y is the bottom of the enemy spawn zone (highest Y value that is still in enemy zone? No, enemy zone is 0 to enemySpawnHeight)


    // Actually enemySpawnHeight is the MAX Y for enemies?


    // Line 380: const enemySpawnHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT);


    // Line 382: const validSpawnMinY = enemySpawnHeight.


    // Wait, spawnObstacles uses validSpawnMinY = enemySpawnHeight.


    // Let's re-read spawnObstacles logic.


    // Line 380: enemySpawnHeight = rows * 0.4 (e.g.)


    // Line 382: validSpawnMinY = enemySpawnHeight.


    // So obstacles spawn from enemySpawnHeight downwards?


    // No, usually Y=0 is top.


    // If ENEMY_SPAWN_ROWS_PERCENT is 0.4, then enemies spawn in top 40%.


    // So valid enemy spawn Y is 0 to enemySpawnHeight.


    // But spawnObstacles uses validSpawnMinY = enemySpawnHeight.


    // This implies obstacles spawn *between* enemy zone and player zone?


    // Line 383: validSpawnMaxY = currentGridRows - playerSpawnHeight - 1.


    // Yes, obstacles spawn in the middle band.





    // So we need to ensure path from Player Zone (bottom) to Enemy Zone (top).


    // Target Y should be <= enemySpawnHeight.


    const targetY = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT);





    // 2. BFS to find reachable area


    const queue = [{ x: startX, y: startY }];


    const visited = new Set([`${startX},${startY}`]);


    let reachedTarget = false;


    let closestNode = { x: startX, y: startY };





    while (queue.length > 0) {


        const current = queue.shift();





        // Update closest node (closest to top/targetY)


        if (current.y < closestNode.y) {


            closestNode = current;


        }





        if (current.y <= targetY) {


            reachedTarget = true;


            break;


        }





        const neighbors = [


            { x: current.x, y: current.y - 1 },


            { x: current.x, y: current.y + 1 },


            { x: current.x - 1, y: current.y },


            { x: current.x + 1, y: current.y }


        ];





        for (const n of neighbors) {


            if (isCellInBounds(n.x, n.y) && !visited.has(`${n.x},${n.y}`)) {


                const obs = getObstacleAt(n.x, n.y);


                const isBlocked = obs && OBSTACLE_DATA[obs.type]?.blocksMove && isObstacleIntact(obs);





                if (!isBlocked) {


                    visited.add(`${n.x},${n.y}`);


                    queue.push(n);


                }


            }


        }


    }





    // 3. If no path, drill one from closestNode to targetY


    if (!reachedTarget) {


        console.log("No path found! Drilling hole...", closestNode);


        let drillX = closestNode.x;


        let drillY = closestNode.y;





        // Simple drill: Move straight up towards targetY


        while (drillY > targetY) {


            drillY--;


            // Remove obstacle at drillY


            const obs = getObstacleAt(drillX, drillY);


            if (obs) {


                // Remove from obstacles array


                const idx = obstacles.indexOf(obs);


                if (idx > -1) {


                    obstacles.splice(idx, 1);


                    if (obs.element) obs.element.remove();


                }


                // Update gridState


                if (gridState[drillY] && gridState[drillY][drillX]) {


                    gridState[drillY][drillX] = null;


                }


                console.log(`Removed obstacle at ${drillX},${drillY} to clear path.`);


            }


        }


    }


}





// --- Archetype Generators ---





function generateOpenField(tryPlace, minX, maxX, minY, maxY, count) {


    for (let i = 0; i < count; i++) {


        const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;


        const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;


        const type = Math.random() < 0.6 ? getRandomDoodad() : (Math.random() < WALL_ROCK_CHANCE ? 'wall_rock' : 'rock');


        tryPlace(type, x, y);


    }


}





function generateChokePoints(tryPlace, minX, maxX, minY, maxY) {


    const y = Math.floor((minY + maxY) / 2);





    // Guarantee at least 2 gaps


    const gap1 = Math.floor(Math.random() * (maxX - minX + 1)) + minX;


    let gap2 = Math.floor(Math.random() * (maxX - minX + 1)) + minX;


    // Ensure gap2 is different and not adjacent if possible


    let attempts = 0;


    while ((gap2 === gap1 || Math.abs(gap2 - gap1) < 2) && attempts < 10) {


        gap2 = Math.floor(Math.random() * (maxX - minX + 1)) + minX;


        attempts++;


    }





    // Create a wall across the middle


    for (let x = minX; x <= maxX; x++) {


        // Skip gaps


        if (x === gap1 || x === gap2) continue;





        // High chance of wall


        if (Math.random() > 0.1) {


            tryPlace('pallisade_wall_1', x, y); // Use pallisade for choke points


            // Add some thickness/cover near the wall


            if (Math.random() < 0.3) tryPlace(getRandomDoodad(), x, y + (Math.random() < 0.5 ? 1 : -1));


        }


    }


}





function generateArena(tryPlace, minX, maxX, minY, maxY) {


    const centerX = (minX + maxX) / 2;


    const centerY = (minY + maxY) / 2;


    const radius = Math.min(maxX - minX, maxY - minY) / 2.5;





    for (let y = minY; y <= maxY; y++) {


        for (let x = minX; x <= maxX; x++) {


            const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);


            // Clear center, obstacles on periphery


            if (dist > radius) {


                if (Math.random() < 0.35) tryPlace(getRandomDoodad(), x, y);


            } else if (dist > radius * 0.5) {


                // Sparse cover inner ring


                if (Math.random() < 0.1) tryPlace(getRandomDoodad(), x, y);


            }


        }


    }
}

function generateStoneCircle(tryPlace, minX, maxX, minY, maxY) {
    const centerX = Math.floor((minX + maxX) / 2);
    const centerY = Math.floor((minY + maxY) / 2);
    const radius = 3;

    // Place a circle of stones
    for (let angle = 0; angle < 360; angle += 45) {
        const rad = angle * (Math.PI / 180);
        const x = Math.round(centerX + Math.cos(rad) * radius);
        const y = Math.round(centerY + Math.sin(rad) * radius);

        tryPlace(getRandomDoodad(), x, y);
    }
}

function generateMaze(tryPlace, minX, maxX, minY, maxY) {


    // Simple randomized walls


    for (let x = minX; x <= maxX; x += 2) {


        for (let y = minY; y <= maxY; y += 2) {


            if (Math.random() < 0.5) {


                tryPlace('wall_rock', x, y);


                // Extend wall


                if (Math.random() < 0.5) tryPlace('wall_rock', x + 1, y);


                else tryPlace('wall_rock', x, y + 1);


            }


        }


    }


}





function generateRiver(tryPlace, minX, maxX, minY, maxY) {


    const riverX = Math.floor((minX + maxX) / 2);


    const riverWidth = Math.random() < 0.5 ? 1 : 2;





    for (let y = minY; y <= maxY; y++) {


        // Leave bridges


        if (y % 4 !== 0 && y % 4 !== 1) {


            for (let w = 0; w < riverWidth; w++) {


                tryPlace('wall_rock', riverX + w, y);


            }


        } else {


            // Bridge - maybe add a rock for cover


            if (Math.random() < 0.2) tryPlace('rock', riverX - 1, y);


        }


    }


}





function generateVillage(tryPlace, minX, maxX, minY, maxY, occupied, gridState) {


    // Reuse the castle layout logic but generalized


    generateCastleLayout(10, occupied, gridState);


}





function generateCastleLayout(targetObstacles, occupied, gridState) {


    // Define spawnable area (same as spawnObstacles)


    const enemySpawnHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT);


    const playerSpawnHeight = Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);


    const minY = enemySpawnHeight;


    const maxY = currentGridRows - playerSpawnHeight - 1;





    if (minY > maxY) return;





    const tryPlace = (type, x, y, isVertical = false) => {


        if (!isCellInBounds(x, y) || occupied.has(`${x},${y}`) || gridState[y]?.[x]) return false;


        const obs = createObstacle(type, x, y);


        if (obs) {


            obs.isVertical = isVertical;


            occupied.add(`${x},${y}`);


            gridState[y][x] = { type: type };


            return true;


        }


        return false;


    };





    // 1. Create 1 or 2 "Rooms"


    const numRooms = Math.random() < 0.5 ? 1 : 2;





    for (let i = 0; i < numRooms; i++) {


        // Random room dimensions (3x3 to 5x5 approx)


        const w = Math.floor(Math.random() * 3) + 3;


        const h = Math.floor(Math.random() * 3) + 3;





        // Random position within bounds


        const x = Math.floor(Math.random() * (currentGridCols - w));


        const y = Math.floor(Math.random() * (maxY - minY - h + 1)) + minY;





        // Build Walls


        let wallTiles = [];


        // Top & Bottom


        for (let dx = 0; dx < w; dx++) {


            wallTiles.push({ x: x + dx, y: y });


            wallTiles.push({ x: x + dx, y: y + h - 1 });


        }


        // Left & Right (excluding corners already added)


        for (let dy = 1; dy < h - 1; dy++) {


            wallTiles.push({ x: x, y: y + dy });


            wallTiles.push({ x: x + w - 1, y: y + dy });


        }





        // Place Walls


        wallTiles.forEach(pos => tryPlace('wall_rock', pos.x, pos.y));





        // Create Doors/Openings (At least 2 to prevent dead ends)


        // Filter wallTiles that were actually placed


        const placedWalls = wallTiles.filter(pos => occupied.has(`${pos.x},${pos.y}`));





        if (placedWalls.length > 0) {


            // Pick 2-3 random wall spots to turn into doors or empty space


            const numOpenings = Math.floor(Math.random() * 2) + 2;


            for (let j = 0; j < numOpenings; j++) {


                const index = Math.floor(Math.random() * placedWalls.length);


                const wallPos = placedWalls[index];





                // Remove the wall obstacle


                const obsIndex = obstacles.findIndex(o => o.x === wallPos.x && o.y === wallPos.y);


                if (obsIndex !== -1) {


                    const obs = obstacles[obsIndex];


                    if (obs.element) obs.element.remove();


                    obstacles.splice(obsIndex, 1);


                    occupied.delete(`${wallPos.x},${wallPos.y}`);


                    gridState[wallPos.y][wallPos.x] = null;





                    // 50% chance to place a Door, 50% chance to leave empty


                    if (Math.random() < 0.5) {


                        const isSideWall = wallPos.x === x || wallPos.x === x + w - 1;


                        // Side walls bridge top/bottom (vertical door), top/bottom walls bridge left/right (horizontal door)


                        if (tryPlace('door', wallPos.x, wallPos.y, isSideWall)) {


                            // Clear passageway (orthogonal to door alignment)


                            const paths = isSideWall ? [{ x: wallPos.x - 1, y: wallPos.y }, { x: wallPos.x + 1, y: wallPos.y }] : [{ x: wallPos.x, y: wallPos.y - 1 }, { x: wallPos.x, y: wallPos.y + 1 }];


                            paths.forEach(p => {


                                const obsAtP = obstacles.find(o => o.x === p.x && o.y === p.y);


                                if (obsAtP && !obsAtP.enterable) {


                                    const idx = obstacles.indexOf(obsAtP);


                                    if (idx > -1) {


                                        obstacles.splice(idx, 1);


                                        if (obsAtP.element) obsAtP.element.remove();


                                    }


                                    if (gridState[p.y]) gridState[p.y][p.x] = null;


                                    occupied.delete(`${p.x},${p.y}`);


                                }


                            });


                        }


                    }


                }


                placedWalls.splice(index, 1);


            }


        }


    }


}





function spawnInitialUnits() {


    const playerSpawnMinY = currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);


    let playerPositions = [];


    for (let y = currentGridRows - 1; y >= playerSpawnMinY; y--) {


        for (let x = 0; x < currentGridCols; x++) {


            const obs = getObstacleAt(x, y);


            const isBlocked = obs && obs.blocksMove && !obs.enterable;


            if (isCellInBounds(x, y) && !isBlocked && !getUnitAt(x, y)) {


                playerPositions.push({ x, y });


            }


        }


    }


    const shuffledPlayerPositions = [...playerPositions].sort(() => 0.5 - Math.random());
    let posIndex = 0;

    // Solo Mission / Duel Constraint
    if (currentLevelObjective === OBJECTIVE_TYPES.SOLO_MISSION || currentLevelObjective === OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) {
        let allowedType = objectiveProgress.unitType;
        if (!allowedType) {
            // Pick the first available unit from the active roster
            const rosterKeys = Object.keys(playerActiveRoster).filter(k => playerActiveRoster[k] > 0).sort();
            allowedType = rosterKeys[0] || 'knight';
        }
        const pos = shuffledPlayerPositions[posIndex++];
        if (pos) createUnit(allowedType, pos.x, pos.y);
        if (typeof updateAllUnitVisuals === 'function') updateAllUnitVisuals();
        return;
    }

    const rosterOrder = Object.keys(playerActiveRoster).sort();


    for (const unitType of rosterOrder) {
        const count = playerActiveRoster[unitType] || 0;
        for (let i = 0; i < count; i++) {
            if (posIndex < shuffledPlayerPositions.length) {
                const pos = shuffledPlayerPositions[posIndex++];
                if (pos) createUnit(unitType, pos.x, pos.y);
            } else {
                // Fallback: Search the rest of the board row by row (bottom to top) above the spawn area
                let spawned = false;
                for (let y = playerSpawnMinY - 1; y >= 0; y--) {
                    let availableCols = [];
                    for (let x = 0; x < currentGridCols; x++) {
                        const obs = getObstacleAt(x, y);
                        const isBlocked = obs && obs.blocksMove && !obs.enterable;
                        if (!isBlocked && !getUnitAt(x, y)) availableCols.push(x);
                    }
                    if (availableCols.length > 0) {
                        const fallbackX = availableCols[Math.floor(Math.random() * availableCols.length)];
                        createUnit(unitType, fallbackX, y);
                        spawned = true;
                        break;
                    }
                }
                if (!spawned) {
                    // Extreme fallback: check the original spawn area again in case it was skipped or units moved? Unlikely, but just break if board is fully 100% packed.
                    break;
                }
            }
        }
    }

    if (units.filter(u => u.team === 'player').length === 0) {


        const totalOwned = Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0);


        gameOver(false, totalOwned > 0 ? "Error: No units placed from roster. Check 'Choose Troops'." : "No units available!");


    }


}





// Helper: Get enemy pool filtered by intro levels
function getFilteredEnemyPool(effectivePool, introUnitsThisLevel, introLevels) {
    const worldInfo = getTilesetForLevel(currentLevel);
    const isSkeletonTheme = worldInfo.name === 'skeleton';

    const filterFn = (type) => {
        if (introUnitsThisLevel.includes(type)) return false;

        // Strict world separation
        const data = UNIT_DATA[type];
        if (data) {
            const isSkeletonUnit = data.useSpritesheet === 'skeleton';
            if (isSkeletonTheme && !isSkeletonUnit) return false;
            if (!isSkeletonTheme && isSkeletonUnit) return false;
        }

        // Use lookup if available, otherwise assume no intro level requirement (or 1)
        const requiredLevel = introLevels && introLevels[type] ? introLevels[type] : 0;
        if (currentLevel < requiredLevel) return false;

        // Biome restrictions for specific shamans
        if (type === 'goblin_blood_caller' || type === 'goblin_witchdoctor') {
            if (type === 'goblin_blood_caller' && worldInfo.name !== 'castle') return false;
            if (type === 'goblin_witchdoctor' && worldInfo.name !== 'grass') return false;
        }

        return true;
    };

    return {
        common: (effectivePool.common || []).filter(filterFn),
        uncommon: (effectivePool.uncommon || []).filter(filterFn),
        rare: (effectivePool.rare || []).filter(filterFn),
        boss: (effectivePool.boss || []).filter(filterFn)
    };
}





// Helper: Determine special enemy spawns (bosses, treasure hunters, etc.)
function getSpecialEnemySpawns(filteredPool, unitsToSpawnTypes) {
    const specialUnits = [];
    const worldInfo = getTilesetForLevel(currentLevel);
    const isSkeletonTheme = worldInfo.name === 'skeleton';
    const isSkeletonBossLevel = isSkeletonTheme && (typeof skeletonWorldLevel !== 'undefined' && skeletonWorldLevel === 5);


    // Check for Juggernaut spawn / Skeleton King spawn
    const isBossLevel = (currentLevel >= JUGGERNAUT_INTRO_LEVEL && currentLevel % JUGGERNAUT_SPAWN_LEVEL_MULTIPLE === 0);

    // Skeleton World: Force Skeleton King on level 5, 10, etc. (the "5th and last level" of a world chunk)
    if (isSkeletonBossLevel) {
        specialUnits.push('skeleton_king');
    } else if (isBossLevel && filteredPool.boss?.length > 0) {
        // Pick a boss from the filtered pool (handles Orc Juggernaut)
        // Ensure we don't pick skeleton_king here for non-boss levels or non-skeleton worlds
        const availableBosses = filteredPool.boss.filter(b => b !== 'skeleton_king');
        if (availableBosses.length > 0) {
            const bossType = availableBosses[Math.floor(Math.random() * availableBosses.length)];
            if (!unitsToSpawnTypes.includes(bossType)) {
                specialUnits.push(bossType);
            }
        }
    }


    // Check for Treasure Hunter spawn (Only in non-skeleton worlds)
    if (!isSkeletonTheme && currentLevel >= GOBLIN_TREASURE_HUNTER_INTRO_LEVEL &&
        (currentLevel - lastTreasureHunterLevel) >= TREASURE_HUNTER_SPAWN_COOLDOWN &&
        Math.random() < TREASURE_HUNTER_SPAWN_CHANCE) {
        specialUnits.push('goblin_treasure_hunter');
        lastTreasureHunterLevel = currentLevel;
        saveGameData();
    }


    // Check for Goblin Mother spawn (Only in non-skeleton worlds)
    if (!isSkeletonTheme && currentLevel >= GOBLIN_MOTHER_INTRO_LEVEL &&
        Math.random() < GOBLIN_MOTHER_SPAWN_CHANCE &&
        !unitsToSpawnTypes.includes('goblin_mother')) {
        specialUnits.push('goblin_mother');
    }


    // Check for V'tharak spawn (Only in non-skeleton worlds)
    if (!isSkeletonTheme && currentLevel >= V_THARAK_INTRO_LEVEL &&
        Math.random() < V_THARAK_SPAWN_CHANCE &&
        !unitsToSpawnTypes.includes('vtharak')) {
        specialUnits.push('vtharak');
    }

    // Check for Zulkash spawn (Only in non-skeleton worlds)
    if (!isSkeletonTheme && currentLevel >= ZULKASH_INTRO_LEVEL &&
        Math.random() < ZULKASH_SPAWN_CHANCE &&
        !unitsToSpawnTypes.includes('zulkash')) {
        specialUnits.push('zulkash');
    }

    // Check for Zulfar spawn (Only in non-skeleton worlds)
    if (!isSkeletonTheme && currentLevel >= ZULFAR_INTRO_LEVEL &&
        Math.random() < ZULFAR_SPAWN_CHANCE &&
        !unitsToSpawnTypes.includes('zulfar')) {
        specialUnits.push('zulfar');
    }

    // Check for Krizak spawn (Winter levels level 226+ only)
    if (currentLevel >= KRIZAK_INTRO_LEVEL &&
        worldInfo.name === 'snow' &&
        Math.random() < KRIZAK_SPAWN_CHANCE &&
        !unitsToSpawnTypes.includes('krizak')) {
        specialUnits.push('krizak');
    }





    return specialUnits;


}





// Helper: Get list of unit types to spawn this level


function getEnemyTypesToSpawn(numEnemies, effectivePool, introUnitsThisLevel) {
    const override = (typeof LEVEL_SPAWN_OVERRIDES !== 'undefined') ? LEVEL_SPAWN_OVERRIDES[currentLevel] : null;

    if (override && override.types && override.types.length > 0) {
        // Expand shorthand syntax (e.g., 'goblin:3' -> ['goblin', 'goblin', 'goblin'])
        const expandedTypes = [];
        override.types.forEach(entry => {
            if (typeof entry === 'string' && entry.includes(':')) {
                const [type, countStr] = entry.split(':');
                const count = parseInt(countStr);
                if (!isNaN(count)) {
                    for (let i = 0; i < count; i++) expandedTypes.push(type.trim());
                } else {
                    expandedTypes.push(entry);
                }
            } else {
                expandedTypes.push(entry);
            }
        });

        const result = [];
        if (expandedTypes.length === numEnemies) {
            // EXACT LIST: Use provided types exactly (good for precise counts)
            result.push(...expandedTypes);
        } else {
            // POOL PICKING: Randomly pick from the pool until count is reached
            for (let i = 0; i < numEnemies; i++) {
                result.push(expandedTypes[Math.floor(Math.random() * expandedTypes.length)]);
            }
        }

        // Shuffle the result so they spawn in random locations
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    const unitsToSpawnTypes = [];

    // Define intro level mappings
    const introLevels = {
        'goblin_archer': GOBLIN_ARCHER_INTRO_LEVEL,
        'goblin_club': CLUBBER_INTRO_LEVEL,
        'goblin_netter': GOBLIN_NETTER_INTRO_LEVEL,
        'goblin_shaman': GOBLIN_SHAMAN_INTRO_LEVEL,
        'goblin_blood_caller': 80,
        'goblin_witchdoctor': 121,
        'goblin_sapper': GOBLIN_SAPPER_INTRO_LEVEL,
        'goblin_pyromancer': GOBLIN_PYROMANCER_INTRO_LEVEL,
        'goblin_mother': GOBLIN_MOTHER_INTRO_LEVEL,
        'vtharak': V_THARAK_INTRO_LEVEL,
        'zulkash': ZULKASH_INTRO_LEVEL,
        'zulfar': ZULFAR_INTRO_LEVEL,
        'krizak': KRIZAK_INTRO_LEVEL,
        'orc_juggernaut': JUGGERNAUT_INTRO_LEVEL,
        'goblin_shadowstalker': GOBLIN_SHADOWSTALKER_INTRO_LEVEL,
        'goblin_wyvern_rider': 80
    };

    // Add intro units for this level
    Object.keys(introLevels).forEach(type => {
        if (currentLevel === introLevels[type]) {
            // Rare units (V'tharak, Zulkash, Zulfar, Krizak) do NOT spawn automatically on their intro level.
            // They follow their small random chance from the beginning.
            const isRare = (type === 'vtharak' || type === 'zulkash' || type === 'zulfar' || type === 'krizak');

            if (!isRare) {
                unitsToSpawnTypes.push(type);
                introUnitsThisLevel.push(type);
            }
        }
    });

    // Filter pool and add special spawns
    const filteredPool = getFilteredEnemyPool(effectivePool, introUnitsThisLevel, introLevels);
    const specialUnits = getSpecialEnemySpawns(filteredPool, unitsToSpawnTypes);
    unitsToSpawnTypes.push(...specialUnits);

    // FAIL-SAFE: Re-filter for biome restrictions to prevent leaks in infinite mode or special spawns
    const worldInfo = getTilesetForLevel(currentLevel);
    const finalSpawns = unitsToSpawnTypes.filter(type => {
        if (type === 'goblin_blood_caller' && worldInfo.name !== 'castle') return false;
        if (type === 'goblin_witchdoctor' && worldInfo.name !== 'grass') return false;
        return true;
    });

    // Re-assign to the list we continue from
    unitsToSpawnTypes.length = 0;
    unitsToSpawnTypes.push(...finalSpawns);

    // Fill remaining slots with random units from weighted pool
    const remainingCount = numEnemies - unitsToSpawnTypes.length;

    if (remainingCount > 0) {
        const weightedPool = [];
        (filteredPool.common || []).forEach(type => weightedPool.push(type, type, type));
        (filteredPool.uncommon || []).forEach(type => weightedPool.push(type, type));

        // Rare units are handled primarily by getSpecialEnemySpawns, 
        // but we add other rares to the pool if they exist.
        (filteredPool.rare || []).forEach(type => {
            if (type !== 'zulkash' && type !== 'zulfar' && type !== 'vtharak' && type !== 'krizak') {
                weightedPool.push(type);
            }
        });

        if (weightedPool.length === 0) weightedPool.push('goblin');

        for (let i = 0; i < remainingCount; i++) {
            let picked = null;
            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                picked = weightedPool[Math.floor(Math.random() * weightedPool.length)];

                // --- Introduction Period Caps ---
                const introLvl = introLevels[picked];
                if (introLvl !== undefined) {
                    const currentCountInList = unitsToSpawnTypes.filter(t => t === picked).length;

                    // Level 1 of intro: Max 1
                    if (currentLevel === introLvl && currentCountInList >= 1) {
                        attempts++;
                        continue;
                    }

                    // Levels 2-6 (Next 5 levels): Max 2
                    if (currentLevel > introLvl && currentLevel <= introLvl + 5 && currentCountInList >= 2) {
                        attempts++;
                        continue;
                    }
                }
                break; // Valid pick
            }

            if (!picked) picked = 'goblin';
            unitsToSpawnTypes.push(picked);
        }
    }

    return unitsToSpawnTypes;
}





// Helper: Get valid spawn positions for enemies


function getValidEnemySpawnPositions(occupied, enemySpawnMaxY) {


    const spawnPoolPositions = [];


    const playerMidX = Math.floor(currentGridCols / 2);


    const playerStartY = currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);





    for (let y = 0; y <= enemySpawnMaxY; y++) {


        for (let x = 0; x < currentGridCols; x++) {


            if (isCellInBounds(x, y) &&


                !occupied.has(`${x},${y}`) &&


                !getObstacleAt(x, y) &&


                getDistance({ x, y }, { x: playerMidX, y: playerStartY }) >= MIN_ENEMY_PLAYER_START_DISTANCE) {


                spawnPoolPositions.push({ x, y });


            }


        }


    }





    spawnPoolPositions.sort(() => 0.5 - Math.random());


    return spawnPoolPositions;


}





function spawnHordeWave() {
    if (currentLevelObjective !== OBJECTIVE_TYPES.SURVIVE_THE_HORDE && currentLevelObjective !== OBJECTIVE_TYPES.HOLD_THE_KEEP) return;

    // Spawn 1-2 new enemies every turn
    const numToSpawn = 1 + Math.floor(Math.random() * 2);

    const worldInfo = getTilesetForLevel(currentLevel);
    const poolNameForLevel = currentLevel >= INFINITE_LEVEL_START ? 'infinite' : worldInfo.name;
    const effectivePool = WORLD_ENEMY_POOL[poolNameForLevel] || WORLD_ENEMY_POOL.infinite;

    const unitsToSpawnTypes = getEnemyTypesToSpawn(numToSpawn, effectivePool, []);

    // Find backmost row available spots
    let spawnCells = [];
    for (let r = 0; r < Math.floor(currentGridRows / 2); r++) {
        let cellsInRow = [];
        for (let c = 0; c < currentGridCols; c++) {
            const obs = getObstacleAt(c, r);
            if (!getUnitAt(c, r) && (!obs || (!obs.blocksMove && !obs.blocksLOS))) {
                cellsInRow.push({ x: c, y: r });
            }
        }
        if (cellsInRow.length > 0) {
            spawnCells = cellsInRow;
            break; // Stop at the first row from the top (y=0) that has space
        }
    }

    spawnCells.sort(() => 0.5 - Math.random());

    for (let i = 0; i < Math.min(numToSpawn, spawnCells.length); i++) {
        const typeToSpawn = unitsToSpawnTypes[i];
        if (!typeToSpawn) continue;
        const pos = spawnCells[i];
        const newUnit = createUnit(typeToSpawn, pos.x, pos.y);

        if (newUnit) {
            if (typeof renderUnit === 'function') renderUnit(newUnit);
            if (gameSettings.showHpBars && typeof createWorldHpBar === 'function') createWorldHpBar(newUnit);
            // Flash them to show they just spawned
            if (newUnit.element && typeof flashElementOnHit === 'function') {
                newUnit.element.style.filter = 'brightness(2)';
                setTimeout(() => { if (newUnit.element) newUnit.element.style.filter = getUnitFilterString(newUnit, false); }, 500);
            }
        }
    }
}

function spawnEnemies() {
    if (currentLevelObjective === OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) return;

    const occupied = new Set(units.map(u => `${u.x},${u.y}`));


    obstacles.forEach(obs => {


        if (obs.blocksMove && !obs.enterable) {


            occupied.add(`${obs.x},${obs.y}`);


        }


    });






    // Calculate infinite mode bonuses
    const infiniteHpBonus = 0;
    const infiniteAtkBonus = 0;





    // Calculate spawn area and enemy count


    const enemySpawnMaxY = Math.min(


        Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT) - 1,


        currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT) - 1 - MIN_ENEMY_PLAYER_START_DISTANCE


    );


    const override = (typeof LEVEL_SPAWN_OVERRIDES !== 'undefined') ? LEVEL_SPAWN_OVERRIDES[currentLevel] : null;

    let numEnemiesBase = override && typeof override.count === 'number'
        ? override.count
        : 3 + Math.floor(currentLevel / 2.5);

    if (currentLevelObjective === OBJECTIVE_TYPES.SURVIVE_THE_HORDE) {
        numEnemiesBase = Math.floor(numEnemiesBase * 1.5) + 2;
    }

    // Skeleton World: Extra Hard (Increase enemy count by 30-50%)
    if (typeof isSkeletonWorldActive !== 'undefined' && isSkeletonWorldActive) {
        numEnemiesBase = Math.floor(numEnemiesBase * 1.5) + (skeletonWorldLevel * 2);
    }

    let numEnemies = Math.min(numEnemiesBase, Math.floor(currentGridCols * (enemySpawnMaxY + 1) * 0.4));

    // Solo Mission / Duel - Reduce enemy count
    if (currentLevelObjective === OBJECTIVE_TYPES.SOLO_MISSION || currentLevelObjective === OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) {
        numEnemies = Math.max(1, Math.floor(numEnemies * 0.5));
    }





    // Get enemy pool for this level


    const worldInfo = getTilesetForLevel(currentLevel);


    const poolNameForLevel = currentLevel >= INFINITE_LEVEL_START ? 'infinite' : worldInfo.name;


    const effectivePool = WORLD_ENEMY_POOL[poolNameForLevel] || WORLD_ENEMY_POOL.infinite;





    // Determine which units to spawn


    const introUnitsThisLevel = [];


    const unitsToSpawnTypes = getEnemyTypesToSpawn(numEnemies, effectivePool, introUnitsThisLevel);

    // Calculate Par Turns for this level
    const enemyCount = unitsToSpawnTypes.length;
    const bossCount = unitsToSpawnTypes.filter(type => UNIT_DATA[type]?.isBoss).length;
    window.parTurns = Math.floor(((currentGridCols + currentGridRows) / 4) + enemyCount + (bossCount * 3));
    // Set a minimum par of 6 as discussed
    window.parTurns = Math.max(6, window.parTurns);

    // Sync UI after par calculation is finalized
    if (typeof updateParUI === 'function') updateParUI();





    // Get valid spawn positions


    const spawnPoolPositions = getValidEnemySpawnPositions(occupied, enemySpawnMaxY);





    // Spawn all units


    for (const typeToSpawn of unitsToSpawnTypes) {


        if (spawnPoolPositions.length === 0) break;





        // Find appropriate position (Goblin Mother prefers back of map)


        let posIndex = spawnPoolPositions.length - 1;


        if (typeToSpawn === 'goblin_mother') {


            let bestIdx = -1;


            let minY = 999;


            for (let i = 0; i < spawnPoolPositions.length; i++) {


                if (spawnPoolPositions[i].y < minY) {


                    minY = spawnPoolPositions[i].y;


                    bestIdx = i;


                }


            }


            if (bestIdx !== -1) posIndex = bestIdx;


        }





        const pos = spawnPoolPositions[posIndex];


        spawnPoolPositions.splice(posIndex, 1);





        // Determine variant and elite status


        const variant = typeToSpawn === 'goblin_treasure_hunter'


            ? GOBLIN_TREASURE_HUNTER_VARIANT


            : (WORLD_THEME_MAP[worldInfo.name] || 'green');


        const isElite = !UNIT_DATA[typeToSpawn]?.isBoss &&


            typeToSpawn !== 'goblin_treasure_hunter' &&


            typeToSpawn !== 'shaman_totem' &&


            typeToSpawn !== 'zulkash' &&


            typeToSpawn !== 'zulfar' &&


            typeToSpawn !== 'vtharak' &&


            currentLevel >= ELITE_ENEMY_START_LEVEL &&


            Math.random() < ELITE_ENEMY_CHANCE;





        const newUnit = createUnit(typeToSpawn, pos.x, pos.y, variant, isElite, infiniteHpBonus, infiniteAtkBonus);


        if (newUnit) occupied.add(`${pos.x},${pos.y}`);


    }


}





function spawnItems() {
    const occupiedSet = new Set(units.map(u => `${u.x},${u.y}`));
    obstacles.forEach(obs => occupiedSet.add(`${obs.x},${obs.y}`));

    // Solo Mission - Environmental Advantages (Potions near player)
    if (currentLevelObjective === OBJECTIVE_TYPES.SOLO_MISSION) {
        const playerSpawnMinY = currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);
        const potionPositions = [];
        for (let y = currentGridRows - 1; y >= playerSpawnMinY; y--) {
            for (let x = 0; x < currentGridCols; x++) {
                if (isCellInBounds(x, y) && !occupiedSet.has(`${x},${y}`) && !getObstacleAt(x, y)) {
                    potionPositions.push({ x, y });
                }
            }
        }
        potionPositions.sort(() => 0.5 - Math.random());
        for (let i = 0; i < 2 && potionPositions.length > 0; i++) {
            const pos = potionPositions.pop();
            createItem('potion_health', pos.x, pos.y);
            occupiedSet.add(`${pos.x},${pos.y}`);
        }
    }


    let chestsToTry = 0;


    const chestChance = (currentLevel >= 10) ? CHEST_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE) : 0;
    if (chestChance > 0 && Math.random() < chestChance) {
        chestsToTry = Math.floor(Math.random() * MAX_CHESTS_PER_LEVEL) + 1;
    }


    if (chestsToTry === 0) return;





    const enemySpawnAreaHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT);


    const playerSpawnAreaHeight = Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);


    const validSpawnMinY = enemySpawnAreaHeight;


    const validSpawnMaxY = currentGridRows - playerSpawnAreaHeight - 1;


    if (validSpawnMinY > validSpawnMaxY) return;





    const spawnPool = [];


    for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) {


        for (let x = 0; x < currentGridCols; x++) {


            if (isCellInBounds(x, y) && !occupiedSet.has(`${x},${y}`) && !getObstacleAt(x, y)) {


                spawnPool.push({ x, y });


            }


        }


    }


    spawnPool.sort(() => 0.5 - Math.random());


    for (let i = 0; i < chestsToTry && spawnPool.length > 0; i++) {


        const pos = spawnPool.pop();


        createItem('chest', pos.x, pos.y);


        occupiedSet.add(`${pos.x},${pos.y}`);


    }


}





function spawnBarrelsAndCrates() {


    const occupiedSet = new Set(units.map(u => `${u.x},${u.y}`));


    obstacles.forEach(obs => occupiedSet.add(`${obs.x},${obs.y}`));


    items.forEach(item => occupiedSet.add(`${item.x},${item.y}`));





    const enemySpawnAreaHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT);


    const playerSpawnAreaHeight = Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);


    const validSpawnMinY = enemySpawnAreaHeight;


    const validSpawnMaxY = currentGridRows - playerSpawnAreaHeight - 1;


    if (validSpawnMinY > validSpawnMaxY) return;





    const spawnPool = [];


    for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) {


        for (let x = 0; x < currentGridCols; x++) {


            if (isCellInBounds(x, y) && !occupiedSet.has(`${x},${y}`) && !getObstacleAt(x, y)) {


                spawnPool.push({ x, y });


            }


        }


    }


    spawnPool.sort(() => 0.5 - Math.random());





    // Spawn barrels


    let barrelsToTry = 0;


    const barrelChance = BARREL_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE);


    if (Math.random() < barrelChance) {


        barrelsToTry = Math.floor(Math.random() * MAX_BARRELS_PER_LEVEL) + 1;


    }


    for (let i = 0; i < barrelsToTry && spawnPool.length > 0; i++) {


        const pos = spawnPool.pop();


        createObstacle('barrel', pos.x, pos.y);


        occupiedSet.add(`${pos.x},${pos.y}`);


    }





    // Spawn crates


    let cratesToTry = 0;


    const crateChance = CRATE_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE);


    if (Math.random() < crateChance) {


        cratesToTry = Math.floor(Math.random() * MAX_CRATES_PER_LEVEL) + 1;


    }


    for (let i = 0; i < cratesToTry && spawnPool.length > 0; i++) {


        const pos = spawnPool.pop();


        createObstacle('crate', pos.x, pos.y);


        occupiedSet.add(`${pos.x},${pos.y}`);


    }





    // Spawn exploding barrels (Only from Level 8 onwards)


    let explodingBarrelsToTry = 0;


    const explodingBarrelChance = (currentLevel >= 8) ? (EXPLODING_BARREL_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE)) : 0;


    if (explodingBarrelChance > 0 && Math.random() < explodingBarrelChance) {


        explodingBarrelsToTry = Math.floor(Math.random() * MAX_EXPLODING_BARRELS_PER_LEVEL) + 1;


    }


    for (let i = 0; i < explodingBarrelsToTry && spawnPool.length > 0; i++) {


        const pos = spawnPool.pop();


        createObstacle('exploding_barrel', pos.x, pos.y);


        occupiedSet.add(`${pos.x},${pos.y}`);


    }


}








function createUnit(type, x, y, variantType = 'green', isElite = false, infiniteHpBonus = 0, infiniteAtkBonus = 0) {


    const data = UNIT_DATA[type];


    if (!data) { console.error(`Invalid unit type: ${type}`); return null; }





    const unit = {


        id: `${data.id_prefix}${unitCounter++}`, type, x, y,


        hp: data.baseHp, maxHp: data.baseHp, atk: data.baseAtk, mov: data.mov, range: data.range,
        baseHp: data.baseHp, baseAtk: data.baseAtk, baseMov: data.mov, baseRange: data.range,
        temporaryAttackBonus: 0, temporaryAttackDebuff: 0, temporaryRangeBonus: 0,
        name: data.name, team: data.team, acted: false, actionsTakenThisTurn: 0,


        element: null,


        isFrozen: false, frozenTurnsLeft: 0,


        isNetted: false, nettedTurnsLeft: 0,


        isSlowed: false, slowedTurnsLeft: 0,


        isStealthed: false,


        quickStrikeActive: false,


        stealthAttackBonusUsed: false,


        variantType: variantType || 'green',


        isElite: false,


        inTower: null,


        currentRange: data.range,


        armor_type: (data.team === 'player' && typeof equippedArmorId !== 'undefined') ? equippedArmorId : (data.armor_type || null),


        immuneToFire: false,


        immuneToFrost: false,
        useSpritesheet: data.useSpritesheet || 'goblin',


        ... ((({


            knockback, cleaveDamage, canNet, canSummonTotem, totemType,


            suicideExplode, explodeOnDeath, explosionDamage, explosionRadius,



            shootsProjectileType, meleeOnlyAttack, baseMeleeAtk, canCastFlameWave, flameWaveRows,


            fireballDamage, flameWaveDamage, isTreasureHunter, flees, fireballRadius,


            canStealth, canQuickStrike, isBoss, dropsArmor, dropsWarBow, dropsFlameCloak, dropsFlameRing, dropsGlacierBow, dropsGoblinMotherSkull, dropsCursedCleaver, isTotem, healAmount,
            canCastFrostNova, frostNovaCooldown, scale, isAerial,
            isBloodlustTotem, buffAmount, isCursedTotem, debuffAmount, forceCssVariant,
            ability, spawnCooldown, canMindControl, mindControlCooldownDuration,
            isKeep, isWagon, isVillager
        }) => ({
            knockback: knockback ?? false, cleaveDamage: cleaveDamage ?? 0, canNet: canNet ?? false,
            canSummonTotem: canSummonTotem ?? false, totemType: totemType ?? null,
            suicideExplode: suicideExplode ?? false, explodeOnDeath: explodeOnDeath ?? false,
            explosionDamage: explosionDamage ?? 0, explosionRadius: explosionRadius ?? 0,
            isAerial: isAerial ?? false,
            shootsProjectileType: shootsProjectileType ?? null, meleeOnlyAttack: meleeOnlyAttack ?? false,


            baseMeleeAtk: baseMeleeAtk ?? 0, canCastFlameWave: canCastFlameWave ?? false, flameWaveRows: flameWaveRows ?? 1,


            fireballDamage: fireballDamage ?? PYRO_FIREBALL_DAMAGE, flameWaveDamage: flameWaveDamage ?? PYRO_FLAME_WAVE_DAMAGE,


            isTreasureHunter: isTreasureHunter ?? false, flees: flees ?? false, fireballRadius: fireballRadius ?? 0,
            canStealth: canStealth ?? false, canQuickStrike: canQuickStrike ?? false,
            isBoss: isBoss ?? false, dropsArmor: dropsArmor ?? false, dropsWarBow: dropsWarBow ?? false, dropsFlameCloak: dropsFlameCloak ?? false, dropsFlameRing: dropsFlameRing ?? false,
            dropsGlacierBow: dropsGlacierBow ?? false, dropsGoblinMotherSkull: dropsGoblinMotherSkull ?? false, dropsCursedCleaver: dropsCursedCleaver ?? false,
            canCastFrostNova: canCastFrostNova ?? false, frostNovaCooldown: frostNovaCooldown ?? 0, isChargingFrostNova: false, frostNovaTarget: null, scale: scale ?? 1.0,
            isTotem: isTotem ?? false, healAmount: healAmount ?? 0,
            isBloodlustTotem: isBloodlustTotem ?? false, buffAmount: buffAmount ?? 0,
            isCursedTotem: isCursedTotem ?? false, debuffAmount: debuffAmount ?? 0,
            forceCssVariant: forceCssVariant ?? null,

            ability: ability ?? null, spawnCooldown: spawnCooldown ?? 0,
            canMindControl: canMindControl ?? false, mindControlCooldownDuration: mindControlCooldownDuration ?? 6,
            isKeep: isKeep ?? false, isWagon: isWagon ?? false, isVillager: isVillager ?? false


        }))(data)),

        netCooldownTurnsLeft: 0,


        totemCooldown: 0,
        flameWaveCooldown: 0,
        mindControlCooldown: 0,
        isMindControlled: false,
        mindControlTurnsLeft: 0,
        originalTeam: null,
        spriteUrl: '',


        portraitUrl: '',


        deadSpriteUrl: '',


    };





    unit.maxHp = unit.baseHp;


    unit.atk = unit.baseAtk;


    unit.mov = unit.baseMov;





    if (unit.team === 'player' && !unit.isKeep && !unit.isWagon && !unit.isVillager) {


        unit.variantType = unit.armor_type || 'grey';

        unit.variantType = unit.armor_type || 'grey';

        // Stats and upgrades are now handled in recalculateUnitStats(unit) 
        // which should be called after unit creation when needed.
        // We call it here for initial setup.
        recalculateUnitStats(unit);

        // Ensure starting HP is full
        unit.hp = unit.maxHp;

        if (type === 'rogue' && playerAbilityUpgrades.rogue_quickstrike > 0) {
            unit.canQuickStrike = true;
        }

        if (type === 'wizard' && playerAbilityUpgrades.wizard_polymorph > 0) {
            unit.canCastPolymorph = true;
        }

        // Solo Mission / Duel Buff
        if (currentLevelObjective === OBJECTIVE_TYPES.SOLO_MISSION || currentLevelObjective === OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) {
            // No buffs for player units in solo/duel missions
        }
    } else if (unit.team === 'player' && (unit.isKeep || unit.isWagon || unit.isVillager)) {
        // Keep, Wagon and Villager: no armor bonuses, no upgrades, no weapon bonuses
        unit.variantType = 'grey';
    } else if (unit.team === 'enemy' && !unit.isTotem) {
        unit.variantType = variantType || 'green';




        // Override CSS variant if unit has forceCssVariant (e.g., V'tharak displays purple)


        if (data.forceCssVariant) {


            unit.variantType = data.forceCssVariant;


        }





        let prefix = '';


        if (unit.variantType === 'red') {


            if (type !== 'goblin_blood_caller') { prefix = 'Ember '; } unit.atk += GOBLIN_RED_ATK_BONUS;


            if (type === 'orc_juggernaut') unit.atk++;


            if (currentLevel >= IMMUNITY_LEVEL_START) {
                // Scaling resistance instead of full immunity: -1 per difficulty cycle (60 levels)
                unit.fireResistance = Math.floor((currentLevel - 1) / 60);
            }


        } else if (unit.variantType === 'blue') {

            let blueBonus = typeof GOBLIN_BLUE_HP_BONUS !== 'undefined' ? GOBLIN_BLUE_HP_BONUS : 1;
            if (typeof currentLevel !== 'undefined' && currentLevel > 60) {
                blueBonus += Math.floor((currentLevel - 1) / 60);
            }
            prefix = 'Azure '; unit.maxHp += blueBonus; unit.inflictsSlow = true;


            if (type === 'orc_juggernaut') unit.maxHp += 2;


            if (currentLevel >= IMMUNITY_LEVEL_START) unit.immuneToFrost = true;


        } else if (unit.variantType === 'yellow') {


            prefix = 'Sand ';
            if (unit.baseMov > 0) unit.mov += GOBLIN_YELLOW_MOV_BONUS;


            if (GOBLIN_YELLOW_DOUBLE_TURN && type !== 'orc_juggernaut') unit.canMoveAndAttack = true;


        }


        if (isElite) {


            prefix = `Elite ${prefix}`; unit.isElite = true;


            unit.maxHp += ELITE_STAT_BONUS.hp; unit.atk += ELITE_STAT_BONUS.atk;


        }


        unit.infiniteHpBonus = infiniteHpBonus; // Store for recalculation
        unit.infiniteAtkBonus = infiniteAtkBonus; // Store for recalculation
        unit.maxHp += infiniteHpBonus; unit.atk += infiniteAtkBonus;

        // Linear scaling for late game (replacing exponential Math.pow to prevent billion HP bugs)
        if (typeof currentLevel !== 'undefined' && unit.team === 'enemy' && !unit.isTotem) {
            const isRareSpawn = type === 'zulkash' || type === 'zulfar' || type === 'vtharak' || type === 'krizak' || type === 'goblin_mother';

            let multiplier = 1;
            let cycles = 0;

            // Bosses and Rares scale 25% every 15 levels passing 15
            if (unit.isBoss || isRareSpawn) {
                if (currentLevel > 15) {
                    cycles = Math.floor((currentLevel - 15) / 15);
                    multiplier += cycles * 0.25;
                }
            }
            // Elites scale 10% every 60 levels passing 60
            else if (unit.isElite) {
                if (currentLevel > 60) {
                    cycles = Math.floor((currentLevel - 60) / 60);
                    multiplier += cycles * 0.10;
                }
            }
            // Basic enemies scale 5% every 60 levels passing 60
            else {
                if (currentLevel > 60) {
                    cycles = Math.floor((currentLevel - 60) / 60);
                    multiplier += cycles * 0.05;
                }
            }

            if (cycles > 0) {
                // Apply a baseline +1 HP growth per cycle so mathematically weak base HPs (e.g., 2 HP) don't get stuck doing flat 0.1 gains forever.
                unit.maxHp += cycles;

                // Use Math.ceil for HP so even a 5% boost on 3 HP (0.15) grants at least +1 HP
                unit.maxHp = Math.ceil(unit.maxHp * multiplier);
            }

            // ATK scales linearly +1 AND 2% every 60 levels for all enemies
            if (currentLevel > 60) {
                let atkCycles = Math.floor((currentLevel - 1) / 60);
                let oldAtk = unit.atk;
                unit.atk = Math.floor((unit.atk + atkCycles) * (1 + (atkCycles * 0.02)));

                // Store the extra ATK in infiniteAtkBonus so recalculateUnitStats doesn't wipe it out on turn start
                unit.infiniteAtkBonus = (unit.infiniteAtkBonus || 0) + (unit.atk - oldAtk);
            }
        }


        if (prefix) { unit.name = `${prefix}${unit.name}`; }


    } else if (unit.team === 'enemy' && unit.isTotem) {
        // Totems scale their HP by +2 every 60 levels
        if (typeof currentLevel !== 'undefined' && currentLevel > 60) {
            let totemCycles = Math.floor((currentLevel - 1) / 60);
            unit.maxHp += totemCycles * 2;
        }
    }


    // Solo Mission / Duel - Weaken enemies (Final Override)
    if (currentLevelObjective === OBJECTIVE_TYPES.SOLO_MISSION || currentLevelObjective === OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) {
        if (unit.team === 'enemy') {
            unit.maxHp = 1;
            unit.atk = 1;
        }
    }

    unit.hp = unit.maxHp;





    // For sprite URL generation, use baseSpriteVariant if specified (e.g., V'tharak uses green sprites)


    const spriteVariant = data.baseSpriteVariant || unit.variantType;


    unit.spriteVariant = spriteVariant; // Store for later rendering





    // Debug logging for V'tharak


    // Kri'zak / V'tharak special properties
    unit.canCastFrostNova = data.canCastFrostNova || false;
    unit.frostNovaCooldown = 0;
    unit.isChargingFrostNova = false;
    unit.frostNovaTarget = null;

    if (type === 'vtharak' || type === 'krizak') {
        console.log(`${type} created:`, {
            type,
            variantType: unit.variantType,
            baseSpriteVariant: data.baseSpriteVariant,
            spriteVariant,
            dropsWarBow: data.dropsWarBow || false,
            dropsGlacierBow: data.dropsGlacierBow || false,
            canCastFrostNova: unit.canCastFrostNova,
            knockback: unit.knockback
        });
    }





    unit.spriteUrl = getUnitSpriteUrl(type, spriteVariant, unit.armor_type);


    unit.portraitUrl = getUnitSpriteUrl(type, spriteVariant, unit.armor_type);


    unit.deadSpriteUrl = getUnitSpriteUrl(type, spriteVariant, unit.armor_type);





    // Debug sprite URLs for V'tharak


    if (type === 'vtharak') {


        console.log('V\'tharak sprite URLs:', {


            spriteUrl: unit.spriteUrl,


            portraitUrl: unit.portraitUrl,


            deadSpriteUrl: unit.deadSpriteUrl


        });


    }





    unit.baseCalculatedAtk = unit.atk;
    units.push(unit);


    if (type === 'goblin_shadowstalker') {


        unit.isStealthed = true;


        unit.mov = 3; // Reduced speed while stealthed


        unit.unstealthedThisTurn = false; // Initialize stealth tracking


    }





    return unit;


}





function applyArmorBonuses() {


    const armorData = ARMOR_DATA[equippedArmorId];


    if (!armorData) { console.error(`Equipped armor ID "${equippedArmorId}" invalid.`); return; }





    units.forEach(unit => {
        if (unit.team === 'player' && isUnitAliveAndValid(unit)) {
            if (unit.isKeep || unit.isWagon || unit.isVillager) return;

            const hpPercentageBefore = unit.hp / unit.maxHp;
            const armorLevel = playerOwnedArmor[equippedArmorId] || 0;

            // Use the single source of truth for stats
            recalculateUnitStats(unit);

            // Restore HP percentage (or force full if called during level init)
            if (window.isInitializingLevel) {
                unit.hp = unit.maxHp;
            } else {
                unit.hp = Math.min(Math.ceil(unit.maxHp * hpPercentageBefore), unit.maxHp);
            }

            // Update Armor Properties
            unit.armor_type = equippedArmorId;
            unit.variantType = equippedArmorId;
            unit.immuneToFire = (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (armorData.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE);
            unit.immuneToFrost = (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (armorData.resistances?.frost ?? 0) >= ARMOR_RESISTANCE_VALUE);

            // Update Sprites
            unit.spriteUrl = getUnitSpriteUrl(unit.type, unit.variantType, unit.armor_type);
            unit.portraitUrl = getUnitSpriteUrl(unit.type, unit.variantType, unit.armor_type);
            unit.deadSpriteUrl = getUnitSpriteUrl(unit.type, unit.variantType, unit.armor_type);

            if (typeof updateUnitSprite === 'function') updateUnitSprite(unit);
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
            if (selectedUnit && selectedUnit.id === unit.id && typeof updateUnitInfo === 'function') updateUnitInfo(selectedUnit);
            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);
        }
    });


}





function equipArmor(armorId) {


    if (!ARMOR_DATA[armorId]) return false;

    // Naked Challenge: only 'none' armor allowed
    if (isNakedChallengeActive && armorId !== 'none') {
        return false;
    }

    const ownedLevel = playerOwnedArmor[armorId] || 0;


    if (ownedLevel > 0 || armorId === 'grey' || armorId === 'none') {


        equippedArmorId = armorId;


        applyArmorBonuses();


        saveGameData();


        if (typeof updateShopDisplay === 'function') updateShopDisplay();


        if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit);


        if (typeof updateForestArmorButton === 'function') updateForestArmorButton();


        return true;


    }


    return false;


}





function createObstacle(type, x, y) {


    const data = OBSTACLE_DATA[type];


    if (!data) return null;





    const obstacle = {
        id: `obs${obstacleCounter++}`, type, name: data.name, x, y,


        hp: data.hp + (type === 'tower' ? Math.floor((currentLevel - 1) / 60) : 0),


        maxHp: data.hp + (type === 'tower' ? Math.floor((currentLevel - 1) / 60) : 0),


        blocksMove: data.blocksMove, blocksLOS: data.blocksLOS,


        destructible: data.destructible,


        canBeAttacked: data.canBeAttacked,


        enterable: data.enterable || false,


        rangeBonus: data.rangeBonus || 0,


        element: null,


        occupantUnitId: null,


        isVertical: false,
        isDangerTile: data.isDangerTile || false,
        hidesUnit: data.hidesUnit || false,


        hiddenUnitType: data.hiddenUnitType || null,


        hiddenUnitVariant: data.hiddenUnitVariant || null,


        revealed: false,


        clickable: data.clickable || false,


        dropsLoot: data.dropsLoot || false,


        explodes: data.explodes || false,


        explosionDamage: data.explosionDamage || 0,


        explosionRadius: data.explosionRadius || 0


    };


    obstacles.push(obstacle);


    gridState[y][x] = { type: type };


    return obstacle;


}





function createItem(type, x, y, stackIndex = 0) {


    const data = ITEM_DATA[type];


    if (!data) return null;





    const item = {


        id: `item${itemCounter++}`, type, x, y,


        element: null, stackIndex,


        opened: false,


        collected: false,


        value: (function () {
            let base = data.value || 0;
            if (type === 'chest' && data.baseGoldAmount !== undefined) base = data.baseGoldAmount;
            if (data.valueMin !== undefined) {
                base = Math.floor(Math.random() * (data.valueMax - data.valueMin + 1)) + data.valueMin;
            }
            return Math.floor(base * (1 + (currentLevel - 1) / 50));
        })(),


        armorId: null,


    };





    // Add random offset for gold to create scattered appearance


    if (type === 'gold') {


        item.offsetX = (Math.random() - 0.5) * 0.6; // Random offset -30% to +30% of tile width


        item.offsetY = (Math.random() - 0.5) * 0.6; // Random offset -30% to +30% of tile height


    }





    if (type === 'chest') {
        item.baseGoldAmount = data.baseGoldAmount;
        item.potionChance = Math.min(POTION_DROP_CHANCE_CHEST_MAX, POTION_DROP_CHANCE_CHEST_BASE + POTION_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1));
        item.gemChance = (currentLevel >= 30) ? Math.min(GEM_DROP_CHANCE_CHEST_MAX, GEM_DROP_CHANCE_CHEST_BASE + GEM_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1)) : 0;
        item.spellbookChance = SPELLBOOK_REQUIRED_SPELL_USE && spellsUsedThisLevel ? SPELLBOOK_DROP_CHANCE_CHEST : 0;

        // Note: value is already calculated with scaling in the constructor closure
        // We just ensure it respects the (now much higher) cap for safety
        item.value = Math.max(1, Math.min(CHEST_MAX_TOTAL_GOLD, item.value));

    } else if (type === 'shiny_gem') {
        // value already calculated in closure
    } else if (type === 'armor') {


        const worldInfo = getTilesetForLevel(currentLevel);


        item.armorId = WORLD_ARMOR_MAP[worldInfo.name] || 'grey';


    } else if (type === 'helmet') {


        // Helmet (currently only one type, but good to be explicit or set in handler)


        // Handled by caller setting armorId mostly, but we define the type here


        item.armorId = 'goblin_mother_skull'; // Default or set by caller


    }





    items.push(item);


    return item;
}

/**
 * Distributes a gold value into a list of items (Gold, Purse, Bar)
 * capped at MAX_GOLD_ITEMS_PER_TILE (7) to prevent overcrowding.
 */
function createLootItems(totalValue, x, y) {
    if (totalValue <= 0) return [];

    const spawnedItems = [];
    let remainingValue = totalValue;

    // 1. Try to use Gold Bars for the bulk of high values
    if (currentLevel >= 40) {
        while (remainingValue >= ITEM_DATA.gold_bar.valueMin && spawnedItems.length < MAX_GOLD_ITEMS_PER_TILE - 1) {
            const bar = createItem('gold_bar', x, y, spawnedItems.length);
            if (bar) {
                spawnedItems.push(bar);
                remainingValue -= bar.value;
            } else break;
            if (remainingValue < ITEM_DATA.gold_bar.valueMin) break;
        }
    }

    // 2. Try to use Coin Purses for the middle range
    if (currentLevel >= 25) {
        while (remainingValue >= ITEM_DATA.coin_purse.valueMin && spawnedItems.length < MAX_GOLD_ITEMS_PER_TILE - 1) {
            const purse = createItem('coin_purse', x, y, spawnedItems.length);
            if (purse) {
                spawnedItems.push(purse);
                remainingValue -= purse.value;
            } else break;
            if (remainingValue < ITEM_DATA.coin_purse.valueMin) break;
        }
    }

    // 3. Use individual gold pieces for the remainder (up to the cap)
    while (remainingValue > 0 && spawnedItems.length < MAX_GOLD_ITEMS_PER_TILE) {
        const amount = Math.min(remainingValue, 1); // Each 'gold' item is worth 1+ scaled
        const goldItem = createItem('gold', x, y, spawnedItems.length);
        if (goldItem) {
            spawnedItems.push(goldItem);
            remainingValue -= goldItem.value;
        } else break;
        if (remainingValue <= 0) break;
    }

    // Special Case: If we STILL have value left but reached the cap, 
    // we must upgrade the last item or just accept the loss (it shouldn't happen with high thresholds)
    // For now, we return what we have.
    return spawnedItems;
}





function finishAction(unit, actionType = 'other') {


    if (!unit || !isUnitAliveAndValid(unit)) return;





    if (!levelClearedAwaitingInput) {


        unit.actionsTakenThisTurn++;


        if (!unit.actionsTakenTypes) unit.actionsTakenTypes = [];


        unit.actionsTakenTypes.push(actionType);
        if (unit.type === 'krizak') console.log(`[AI-DEBUG] finishAction for Krizak. Type: ${actionType}. actionsTakenTypes: ${JSON.stringify(unit.actionsTakenTypes)}. isFrozen: ${unit.isFrozen}`);





        const maxActions = (unit.canQuickStrike && unit.quickStrikeActive) ? 2 : 1;





        if (unit.isStealthed && actionType !== 'stealth' && actionType !== 'move' && actionType !== 'other') {


            unit.isStealthed = false;


            unit.unstealthedThisTurn = true; // Prevent re-stealth this turn


            if (actionType === 'attack') unit.stealthAttackBonusUsed = true;


            else unit.stealthAttackBonusUsed = false;


        }





        if (unit.actionsTakenThisTurn >= maxActions || (actionType === 'stealth' && !unit.quickStrikeActive)) {


            unit.acted = true;


            // Mark Quick Strike as used when the rogue finishes using it


            if (unit.quickStrikeActive && (unit.type === 'rogue')) {
                unit.quickStrikeCooldown = 5;
            }
            unit.quickStrikeActive = false;


        } else {


            // Mark Quick Strike as used on first action (so it can't be cancelled mid-use)


            if (unit.quickStrikeActive && unit.actionsTakenThisTurn === 1 && unit.canQuickStrike) {


                unit.quickStrikeUsedThisLevel = true;


            }


            unit.acted = false;


        }





        // Reset attack lock


        unit.isAttacking = false;





        if (unit.team === 'player' && (actionType === 'move' || actionType === 'attack' || actionType === 'ability' || actionType === 'stealth')) {


            playerActionsTakenThisLevel++;


            if (typeof updateQuitButton === 'function') updateQuitButton();


        }


    } else {


        // Level is cleared: Allow infinite movement and attacks to destroy crates/barrels


        unit.acted = false;


        unit.actionsTakenThisTurn = 0;


        unit.actionsTakenTypes = [];


        unit.isAttacking = false; // Reset attack lock for level-cleared state too


    }





    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


    if (gameSettings.showHpBars && typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);





    if (selectedUnit?.id === unit.id) {
        // Always keep the unit selected after actions, just update visuals and highlights
        if (unit.team === 'enemy') {
            const currentRange = unit.currentRange || unit.range;
            if (currentRange > 1 && typeof highlightEnemyRange === 'function') {
                highlightEnemyRange(unit);
            }
        } else {
            if (typeof highlightMovesAndAttacks === 'function') highlightMovesAndAttacks(unit);
        }

        if (typeof updateUnitInfo === 'function') updateUnitInfo(unit);
    }





    if (!levelClearedAwaitingInput) {
        checkWinLossConditions();
        checkAutoEndTurn();
    }
}





function activateRogueStealth(unit) {


    if (!unit || !unit.canStealth || unit.acted || unit.isFrozen || unit.isNetted || levelClearedAwaitingInput) {


        playSfx('error');


        showFeedback("Cannot use Stealth now.", "feedback-error");


        return false;


    }





    if (unit.isStealthed) {


        unit.isStealthed = false;


        playSfx('stealth'); // Or a different sound for unstealth


        showFeedback(`${unit.name} unstealths.`, "feedback-turn");


        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


        if (typeof updateUnitInfo === 'function') updateUnitInfo(unit);


        return true;


    }





    playSfx('stealth');


    unit.isStealthed = true;


    unit.stealthAttackBonusUsed = false;


    finishAction(unit, 'stealth');


    showFeedback(`${unit.name} uses Stealth!`, "feedback-turn");


    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


    if (typeof updateUnitInfo === 'function') updateUnitInfo(unit);


    return true;


}





/**
 * Activates or cancels the Rogue's Quick Strike ability.
 * Quick Strike grants an extra attack but imposes a move penalty.
 * Now implements a 5-turn cooldown.
 */
function activateRogueQuickStrike(unit) {
    if (!unit || unit.type !== 'rogue') return false;

    // Check if player has the ability unlocked
    if (unit.team === 'player' && (typeof playerAbilityUpgrades === 'undefined' || !playerAbilityUpgrades.rogue_quickstrike)) {
        return false;
    }

    if (unit.acted || unit.isFrozen || unit.isNetted || (typeof levelClearedAwaitingInput !== 'undefined' && levelClearedAwaitingInput)) {
        playSfx('error');
        showFeedback("Cannot use Quick Strike now.", "feedback-error");
        return false;
    }

    // Cooldown check
    if (!unit.quickStrikeActive && unit.quickStrikeCooldown > 0) {
        playSfx('error');
        showFeedback(`Quick Strike on cooldown (${unit.quickStrikeCooldown} turns).`, "feedback-error");
        return false;
    }

    // Toggle Quick Strike on/off
    if (unit.quickStrikeActive) {
        // Cancel Quick Strike
        unit.quickStrikeActive = false;
        playSfx('cancel');
        showFeedback(`${unit.name} cancels Quick Strike.`, "feedback-turn");
    } else {
        // Activate Quick Strike
        playSfx('rogueQuickStrike');
        unit.quickStrikeActive = true;
        showFeedback(`${unit.name} readies Quick Strike!`, "feedback-turn");
    }

    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    if (typeof updateUnitInfo === 'function') updateUnitInfo(unit);

    if (unit.team === 'enemy') {
        const currentRange = unit.currentRange || unit.range;
        if (currentRange > 1 && typeof highlightEnemyRange === 'function') {
            highlightEnemyRange(unit);
        }
    } else {
        if (typeof highlightMovesAndAttacks === 'function') highlightMovesAndAttacks(unit);
    }

    return true;
}


function toggleChampionCleave(unit) {
    if (!unit || unit.type !== 'champion' || playerAbilityUpgrades.champion_cleave <= 0) return;
    if (unit.acted && !unit.canMoveAndAttack && !unit.actionsTakenTypes?.includes('move')) return;
    if (unit.acted && !unit.canMoveAndAttack && unit.actionsTakenTypes?.some(type => type !== 'move' && type !== 'ability')) return;
    unit.cleaveActive = !unit.cleaveActive;
    if (unit.cleaveActive) {
        if (typeof showFeedback === 'function') showFeedback("Cleave Readied!", "feedback-info");
        playSfx('buff');
    }
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    if (selectedUnit && selectedUnit.id === unit.id && typeof updateUnitInfo === 'function') updateUnitInfo(selectedUnit);
}


async function revealSnowman(snowmanObstacle, revealedByUnit = null) {


    if (!snowmanObstacle || snowmanObstacle.revealed || !snowmanObstacle.hidesUnit || !isObstacleIntact(snowmanObstacle)) return;


    snowmanObstacle.revealed = true;
    playSfx('snowmanBreak');


    snowmanObstacle.hp = 0;





    const goblinType = snowmanObstacle.hiddenUnitType || 'goblin';


    const goblinVariant = snowmanObstacle.hiddenUnitVariant || 'blue';


    const goblinX = snowmanObstacle.x;


    const goblinY = snowmanObstacle.y;





    // Immediately show dead snowman sprite and spawn goblin on top


    if (snowmanObstacle.element) {


        const data = OBSTACLE_DATA[snowmanObstacle.type];


        if (data?.useSpritesheet && typeof getSpritePositionStyles === 'function') {


            const deadStyles = getSpritePositionStyles(snowmanObstacle.type, 'dead');


            snowmanObstacle.element.style.backgroundImage = deadStyles.backgroundImage;


            snowmanObstacle.element.style.backgroundPosition = deadStyles.backgroundPosition;


            snowmanObstacle.element.style.backgroundSize = deadStyles.backgroundSize;


        }


        snowmanObstacle.element.classList.add('dead');


        snowmanObstacle.element.style.zIndex = '1'; // Put snowman below goblin


    }





    // Calculate infinite mode bonuses for snowman goblin


    let cycle = 0;


    if (currentLevel >= INFINITE_LEVEL_START) {


        cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);


    }


    const infiniteHpBonus = cycle * INFINITE_HP_BONUS_PER_CYCLE;


    const infiniteAtkBonus = cycle * INFINITE_ATK_BONUS_PER_CYCLE;





    // Spawn goblin immediately on the same tile


    const goblin = createUnit(goblinType, goblinX, goblinY, goblinVariant, false, infiniteHpBonus, infiniteAtkBonus);


    if (goblin) {


        goblin.hp = goblin.maxHp; // Ensure full HP


        playSfx('snowmanReveal');


        if (typeof renderUnit === 'function') renderUnit(goblin);


        if (gameSettings.showHpBars && typeof createWorldHpBar === 'function') createWorldHpBar(goblin);





        // Remove snowman after a short delay so goblin is visible on top


        setTimeout(async () => {


            await removeObstacle(snowmanObstacle);


        }, 1000);





        if (revealedByUnit?.team === 'player' && currentTurn === 'player' && getDistance(goblin, revealedByUnit) <= 1) {


            const attackTargets = getValidAttackTargets(goblin);


            if (attackTargets.units.includes(revealedByUnit.id)) {


                await attack(goblin, revealedByUnit.x, revealedByUnit.y);


            } else {


                finishAction(goblin);


            }


        } else {


            finishAction(goblin);


        }


    } else {


        console.warn("Snowman cell blocked after destruction, goblin couldn't spawn.");


        playSfx('error');


    }


    checkWinLossConditions();


}





async function enterTower(unit, tower) {


    if (!unit || !tower || tower.occupantUnitId || !tower.enterable || !isUnitAliveAndValid(unit)) return false;


    // Fix: Allow entry from any adjacent cell


    if (Math.abs(unit.x - tower.x) + Math.abs(unit.y - tower.y) > 1) return false;


    if (unit.inTower) leaveTower(unit);





    const startX = unit.x; const startY = unit.y;


    unit.x = tower.x; unit.y = tower.y;
    tower.occupantUnitId = unit.id; unit.inTower = tower.id;

    // Fix: Pick up items inside the tower
    checkForItemPickup(unit, unit.x, unit.y);


    playSfx('towerEnter');





    // Range bonus only for Ranged units (Range > 1) and NOT Melee-Only units


    const isRangedUnit = unit.baseRange > 1 && !unit.meleeOnlyAttack;


    unit.currentRange = unit.baseRange + (isRangedUnit ? tower.rangeBonus : 0);





    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);


    if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);


    if (typeof animateUnitMove === 'function') await animateUnitMove(unit, startX, startY, unit.x, unit.y);


    else if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);





    finishAction(unit, 'move');
    recalculateAllUnitsStats();

    // Ensure unit is visible ON TOP of the tower
    if (unit.element) {
        unit.element.style.zIndex = 150 + unit.y; // Ensure it's higher than the tower (110 + y)
    }

    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


    return true;


}





function leaveTower(unit, exitX = null, exitY = null) {
    if (!unit || !unit.inTower) return;

    const tower = obstacles.find(o => o.id === unit.inTower);

    let targetX = (exitX !== null) ? exitX : unit.x;
    let targetY = (exitY !== null) ? exitY : unit.y + 1;

    if (tower) {
        if (exitX === null && exitY === null) {
            targetX = tower.x;
            targetY = tower.y + 1;
        }
        tower.occupantUnitId = null;
    }





    if (!isCellInBounds(targetX, targetY) || getUnitAt(targetX, targetY) || getObstacleAt(targetX, targetY)?.blocksMove) {


        const adjacentExits = getAdjacentCells(unit.x, unit.y).find(cell => isCellInBounds(cell.x, cell.y) && !getUnitAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y)?.blocksMove);


        if (adjacentExits) { targetX = adjacentExits.x; targetY = adjacentExits.y; }


        else {
            console.warn(`Unit ${unit.id} trapped in tower ${unit.inTower}`);
            if (tower && isObstacleIntact(tower)) {
                tower.occupantUnitId = unit.id;
                return;
            } else {
                // Tower is destroyed or gone, force unit out
                targetX = unit.x;
                targetY = unit.y;
            }
        }


    }





    unit.x = targetX; unit.y = targetY; unit.inTower = null; unit.currentRange = unit.baseRange;

    // Fix: Pick up items when leaving the tower
    checkForItemPickup(unit, unit.x, unit.y);


    playSfx('towerExit');


    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);


    if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);


    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


    if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);


}





async function initiateTowerEntrySequence(unit, tower, path) {


    if (!unit || !tower || !path) return;





    // If path is empty, unit is already at the entry point


    if (path.length === 0) {


        await enterTower(unit, tower);


        return;


    }





    const entryCell = path[path.length - 1];


    try {


        let currentPathX = unit.x; let currentPathY = unit.y;


        for (const step of path) {


            if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition({ ...unit, x: step.x, y: step.y });


            if (typeof animateUnitMove === 'function') await animateUnitMove(unit, currentPathX, currentPathY, step.x, step.y);


            else { unit.x = step.x; unit.y = step.y; if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); }


            currentPathX = step.x; currentPathY = step.y;


        }


        if (unit.x === entryCell.x && unit.y === entryCell.y) await enterTower(unit, tower);


        else { console.warn("Tower entry animation sync issue."); unit.x = entryCell.x; unit.y = entryCell.y; if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); await enterTower(unit, tower); }


    } catch (error) { console.error("Error during tower entry sequence:", error); if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); }


}





async function triggerTrap(unit, obstacle) {
    if (!unit || !obstacle || !isUnitAliveAndValid(unit) || !isObstacleIntact(obstacle)) return;
    if (unit.isAerial || unit.isFlying) return; // Flyers ignore traps

    let damage = Math.floor((currentLevel - 1) / 60) + 1;
    if (unit.team === 'player' && typeof equippedBootsId !== 'undefined' && equippedBootsId === 'chain_boots') {
        damage = Math.max(1, Math.round(damage * 0.5));
    }
    unit.hp -= damage;
    if (unit.hp < 0) unit.hp = 0;

    if (typeof showDamagePopup === 'function') showDamagePopup(obstacle.x, obstacle.y, damage);
    if (typeof flashElementOnHit === 'function') flashElementOnHit(unit.element);
    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);

    if (unit.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
    else if (unit.type && unit.type.includes('goblin')) playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2');
    else playSfx('hit');

    // Trigger trap destruction
    await removeObstacle(obstacle);

    if (unit.hp <= 0) {
        await removeUnit(unit);
        return true; // Unit died
    }
    return false; // Unit survived
}

async function moveUnit(unit, targetX, targetY) {
    if (!unit || !isUnitAliveAndValid(unit)) return false;
    if (unit.isAttacking || unit.isFrozen || unit.isNetted) return false;
    if (unit.team !== currentTurn && !levelClearedAwaitingInput) return false;

    let canAct = (!levelClearedAwaitingInput && !unit.acted);
    if (levelClearedAwaitingInput) canAct = true;
    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;
    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) {
        if (unit.actionsTakenTypes && unit.actionsTakenTypes.includes('move')) canAct = false;
        else canAct = true;
    }

    if (!canAct) return false;
    if (!isCellInBounds(targetX, targetY)) return false;

    const possibleMoves = getValidMoves(unit, levelClearedAwaitingInput);
    if (!possibleMoves.some(move => move.x === targetX && move.y === targetY)) {
        if (unit.x === targetX && unit.y === targetY) return false;
        if (unit.team === 'player') { playSfx('error'); showFeedback("Cannot move there.", "feedback-error"); }
        return false;
    }

    const startX = unit.x;
    const startY = unit.y;
    // Calculate path BEFORE moving
    const path = findPathToTarget(unit, targetX, targetY);
    const obstacleAtTarget = getObstacleAt(targetX, targetY);
    const towerUnitIsIn = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;
    let enteringTower = (obstacleAtTarget?.enterable && obstacleAtTarget.type === 'tower');
    let moveSuccessful = false;

    if (unit.isKeep && enteringTower) return false;

    try {
        let isAudible = true;
        if (unit.team === 'enemy' && unit.isStealthed) {
            const isDetected = units.some(u => u.team === 'player' && isUnitAliveAndValid(u) && (Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y) === 1));
            if (!isDetected) isAudible = false;
        }
        if (isAudible) playSfx('move');

        let animationStartX = startX;
        let animationStartY = startY;

        if (towerUnitIsIn) {
            leaveTower(unit, targetX, targetY);
            animationStartX = towerUnitIsIn.x;
            animationStartY = towerUnitIsIn.y;
        }

        if (!enteringTower) {
            unit.x = targetX;
            unit.y = targetY;
            if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);

            if (typeof animateUnitMove === 'function') {
                await animateUnitMove(unit, animationStartX, animationStartY, targetX, targetY);
                if (!units.includes(unit)) return false; // Unit died during animation (unlikely but safe)
            } else if (typeof updateUnitPosition === 'function') {
                updateUnitPosition(unit, true);
            }

            // Trigger traps along the pre-calculated path
            if (path && path.length > 0) {
                for (const step of path) {
                    const trap = getObstacleAt(step.x, step.y);
                    if (trap && trap.isDangerTile) {
                        const died = await triggerTrap(unit, trap);
                        if (died) {
                            moveSuccessful = true;
                            return true;
                        }
                    }
                }
            }

            if (unit.team === 'player') {
                checkForItemPickup(unit, unit.x, unit.y);
                if (playerPassiveUpgrades.gold_magnet > 0) triggerGoldMagnetPassive(unit);
                const adjacentCells = getAdjacentCells(unit.x, unit.y);
                for (const { x: nx, y: ny } of adjacentCells) {
                    const adjObstacle = getObstacleAt(nx, ny);
                    if (adjObstacle?.type === 'snowman' && !adjObstacle.revealed) {
                        await revealSnowman(adjObstacle, unit);
                        break;
                    }
                }
            }

            const sapper = getUnitAt(unit.x, unit.y);
            if (sapper?.type === 'goblin_sapper' && sapper.id !== unit.id && sapper.suicideExplode) {
                await explodeUnit(sapper);
            }
        } else {
            // enteringTower is true
            if (path !== null) {
                await initiateTowerEntrySequence(unit, obstacleAtTarget, path);
            } else {
                throw new Error("Path to tower invalid");
            }
        }

        moveSuccessful = true;
        return true;

    } catch (e) {
        console.error(`Error during moveUnit for unit ${unit?.id}:`, e);
        if (!enteringTower) { unit.x = startX; unit.y = startY; }
        if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
        return false;
    } finally {
        if (moveSuccessful && !enteringTower && !levelClearedAwaitingInput) {
            finishAction(unit, 'move');
            if (unit.team === 'player' && typeof updateUnitVisualState === 'function') {
                units.forEach(enemyUnit => {
                    if (enemyUnit.team === 'enemy' && isUnitAliveAndValid(enemyUnit)) updateUnitVisualState(enemyUnit);
                });
            }
        } else if (moveSuccessful) {
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
        }
    }
}





function checkForItemPickup(unit, x, y) {


    if (!unit || unit.team !== 'player' || !isUnitAliveAndValid(unit) || !isCellInBounds(x, y)) return;





    const itemsOnCell = items.filter(item => !item.collected && item.x === x && item.y === y);


    if (itemsOnCell.length === 0) return;





    let goldFromThisPickup = 0;


    let chestOpenedThisCheck = false;


    let itemsToAnimateRemoval = [];


    let healAppliedTotal = 0;


    let spellRestored = false;


    let collectedCounts = { gold: 0, shiny_gem: 0, health_potion: 0, gold_magnet: 0, spellbook: 0, armor: 0 };





    let feedbackDelay = 0;


    const FEEDBACK_DELAY_INCREMENT = 600;





    itemsOnCell.forEach(item => {
        const itemData = ITEM_DATA[item.type];
        if (!itemData || item.collected) return;

        let canPickup = true;

        if ((item.type === 'health_potion' && unit.hp >= unit.maxHp && !levelClearedAwaitingInput) || (item.type === 'health_potion' && unit.isKeep)) canPickup = false;

        if (item.type === 'spellbook') {
            const hasUsedSpellToRestore = Object.keys(spellUses).some(sName => spellsUnlocked[sName] && spellUses[sName] === false);
            if (!hasUsedSpellToRestore && !unlimitedSpellsCheat) canPickup = false;
        }

        // --- Persistent Weapon Checks ---
        if (itemData.pickupAction === 'applyTempBonus') {
            const isArcher = unit.type === 'archer';
            const isMelee = ['knight', 'champion', 'rogue', 'knight_clubber'].includes(unit.type) || (unit.type && unit.type.includes('club'));

            if (unit.hasTemporaryWeapon) {
                if (typeof showFeedback === 'function') showFeedback("Already has a temporary weapon!", "feedback-neutral");
                canPickup = false;
            } else if (item.type === 'goblin_bow' && !isArcher) {
                if (typeof showFeedback === 'function') showFeedback("Only Archers can use this!", "feedback-neutral");
                canPickup = false;
            } else if (item.type === 'goblin_club' && !isMelee) {
                if (typeof showFeedback === 'function') showFeedback("Only Melee units can use this!", "feedback-neutral");
                canPickup = false;
            }
        }

        // Cursed Cleaver pickup restriction (melee only, no existing temp weapon)
        if (itemData.pickupAction === 'applyCursedCleaver') {
            const isMelee = ['knight', 'champion', 'rogue', 'knight_clubber'].includes(unit.type) || (unit.type && unit.type.includes('club'));
            if (unit.hasTemporaryWeapon) {
                if (typeof showFeedback === 'function') showFeedback("Already has a temporary weapon!", "feedback-neutral");
                canPickup = false;
            } else if (!isMelee) {
                if (typeof showFeedback === 'function') showFeedback("Only Melee units can use this!", "feedback-neutral");
                canPickup = false;
            }
        }

        // Old Worn Pan: only 1 at a time
        if (itemData.pickupAction === 'pickupOldWornPan' && unit.hasOldWornPan) {
            canPickup = false;
        }

        if (canPickup) {
            item.collected = true;
            if (item.type !== 'chest') itemsToAnimateRemoval.push(item);

            switch (itemData.pickupAction) {


                case 'addGold':


                    const goldValue = item.value || 0;


                    goldFromThisPickup += goldValue; baseGoldEarnedThisLevel += goldValue;


                    collectedCounts[item.type === 'shiny_gem' ? 'shiny_gem' : 'gold']++;


                    if (item.type === 'shiny_gem' && typeof showGemPopup === 'function') {


                        setTimeout(() => {


                            showGemPopup(x, y, goldValue);


                        }, feedbackDelay);


                        feedbackDelay += 250;


                    }


                    // Gold popup is now handled consolidated at the end


                    break;


                case 'healUnit':


                    if (typeof isNakedChallengeActive !== 'undefined' && isNakedChallengeActive) {


                        if (typeof showFeedback === 'function') {


                            showFeedback("Empty Health Potion. Nice try.", "feedback-negative");


                        }


                        break;


                    }


                    // Calculate infinite mode healing bonus


                    let cycle = 0;


                    if (currentLevel >= INFINITE_LEVEL_START) {


                        cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);


                    }


                    const baseHealAmount = itemData.value || 0;


                    const healAmount = baseHealAmount + cycle; // Scale with difficulty





                    if (unit.hp < unit.maxHp) {
                        playSfx('potion');
                        const healApplied = Math.min(healAmount, unit.maxHp - unit.hp);
                        unit.hp += healApplied; healAppliedTotal += healApplied; collectedCounts.health_potion++;
                    } else if (typeof levelClearedAwaitingInput !== 'undefined' && levelClearedAwaitingInput) {
                        goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP; baseGoldEarnedThisLevel += POTION_GOLD_VALUE_IF_FULL_HP; collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP;
                    }
                    break;

                case 'upgradeAllUnitsPermanently':
                    shardUpgradeCount++;
                    playSfx('levelup_classic'); // Use a satisfying sound
                    if (typeof showFeedback === 'function') {
                        showFeedback("Primordial Shard! All units PERMANENTLY +1 ATK/HP!", "feedback-levelup", 4000);
                    }
                    recalculateAllUnitsStats();
                    saveGameData();
                    break;


                case 'openChest':


                    if (!item.opened) {


                        item.opened = true; chestOpenedThisCheck = true;


                        if (typeof updateVisualItemState === 'function') updateVisualItemState(item);

                        if (item.type === 'glacier_bow') {
                            equippedGlacierBow = true;
                            if (equippedWarBow) {
                                equippedWarBow = false;
                                showFeedback("Unequipped War Bow (Glacier Bow equipped)", "feedback-info");
                                // Recalculate stats for range
                                recalculateAllUnitsStats();
                            }
                        } else if (item.type === 'war_bow') {
                            equippedWarBow = true;
                            if (equippedGlacierBow) {
                                equippedGlacierBow = false;
                                showFeedback("Unequipped Glacier Bow (War Bow equipped)", "feedback-info");
                                recalculateAllUnitsStats();
                            }
                        }


                        const chestGold = item.value || 0;


                        goldFromThisPickup += chestGold; baseGoldEarnedThisLevel += chestGold; collectedCounts.gold += chestGold;


                        if (typeof showGoldPopup === 'function') {


                            // setTimeout(() => showGoldPopup(x, y, chestGold), feedbackDelay); // Consolidated


                        }


                        // feedbackDelay += 250;





                        if (Math.random() < item.potionChance) {


                            if (typeof isNakedChallengeActive !== 'undefined' && isNakedChallengeActive) {


                                if (typeof showFeedback === 'function') {


                                    showFeedback("Empty Chest Potion. Nice try.", "feedback-negative");


                                }


                            } else {


                                // Calculate infinite mode healing bonus for chest potion


                                let potionCycle = 0;


                                if (currentLevel >= INFINITE_LEVEL_START) {


                                    potionCycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);


                                }


                                const potionHealAmount = HEALTH_POTION_HEAL_AMOUNT + potionCycle;





                                if (unit.hp < unit.maxHp) {
                                    playSfx('potion');
                                    const healApplied = Math.min(potionHealAmount, unit.maxHp - unit.hp);


                                    unit.hp += healApplied; healAppliedTotal += healApplied; collectedCounts.health_potion++;


                                } else if (levelClearedAwaitingInput) {


                                    goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP; baseGoldEarnedThisLevel += POTION_GOLD_VALUE_IF_FULL_HP; collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP;


                                    // Popup handled by consolidated gold popup at end


                                }


                            }


                        }


                        if (currentLevel >= 30 && Math.random() < item.gemChance) {


                            const gemVal = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin;


                            goldFromThisPickup += gemVal; baseGoldEarnedThisLevel += gemVal; collectedCounts.shiny_gem++; playSfx('gemPickup');


                            if (typeof showGemPopup === 'function') {


                                setTimeout(() => showGemPopup(x, y, gemVal), feedbackDelay);


                            }


                            feedbackDelay += 250;


                        }


                        if (item.spellbookChance > 0 && Math.random() < item.spellbookChance) {


                            const spellsToRestore = Object.keys(spellUses).filter(sName => spellsUnlocked[sName] && spellUses[sName] === false);


                            if (spellsToRestore.length > 0) {


                                const spellToRestore = spellsToRestore[Math.floor(Math.random() * spellsToRestore.length)];


                                spellUses[spellToRestore] = true; spellRestored = true; collectedCounts.spellbook++;


                                if (typeof updateSpellUI === 'function') updateSpellUI();


                            }


                        }


                    }


                    break;


                case 'upgradeGoldMagnet':


                    playerPassiveUpgrades.gold_magnet = (playerPassiveUpgrades.gold_magnet || 0) + 1;


                    collectedCounts.gold_magnet++; saveGameData();


                    if (typeof updateShopDisplay === 'function') updateShopDisplay();


                    if (typeof showFeedback === 'function') {


                        setTimeout(() => showFeedback(`Gold Magnet Lvl ${playerPassiveUpgrades.gold_magnet}!`, 'feedback-levelup'), feedbackDelay);


                        feedbackDelay += FEEDBACK_DELAY_INCREMENT;


                    }


                    break;


                case 'restoreSpell':
                    const spellsToRestore = Object.keys(spellUses).filter(sName => spellsUnlocked[sName] && spellUses[sName] === false);
                    if (spellsToRestore.length > 0) {
                        const spellToRestore = spellsToRestore[Math.floor(Math.random() * spellsToRestore.length)];
                        spellUses[spellToRestore] = true; spellRestored = true; collectedCounts.spellbook++;
                        if (typeof updateSpellUI === 'function') updateSpellUI();
                        if (typeof showFeedback === 'function') {
                            setTimeout(() => showFeedback(`Spellbook restored ${SPELL_UPGRADE_CONFIG[spellToRestore]?.name || 'a spell'}!`, 'feedback-levelup'), feedbackDelay);
                            feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                        }
                    }
                    break;

                case 'pickupNet':
                    unit.nets = (unit.nets || 0) + 1;
                    if (typeof showFeedback === 'function') {
                        setTimeout(() => showFeedback(`Net Obtained! (Total: ${unit.nets})`, "feedback-levelup"), feedbackDelay);
                        feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                    }
                    if (typeof updateUnitInfo === 'function') updateUnitInfo(unit);
                    break;

                case 'collectRelic':
                    objectiveProgress.relics = (objectiveProgress.relics || 0) + 1;
                    if (typeof showFeedback === 'function') {
                        setTimeout(() => showFeedback(`Relic Recovered! (${objectiveProgress.relics}/${(OBJECTIVE_CONFIG[OBJECTIVE_TYPES.RECOVER_RELICS] || {}).totalRelics})`, "feedback-levelup"), feedbackDelay);
                        feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                    }
                    if (typeof updateObjectiveDisplay === 'function') updateObjectiveDisplay();
                    break;
                    break;
                case 'reduceChainLightningCooldown':
                    playerChainLightningCooldownReduction = (playerChainLightningCooldownReduction || 0) + 1;
                    saveGameData();
                    if (typeof showFeedback === 'function') {
                        setTimeout(() => showFeedback(`Chain Lightning CD reduced! (Total -${playerChainLightningCooldownReduction})`, 'feedback-levelup'), feedbackDelay);
                        feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                    }
                    playSfx('powerup');
                    break;


                case 'unlockWarBow':


                    playerAbilityUpgrades.war_bow = 1;


                    collectedCounts.war_bow = (collectedCounts.war_bow || 0) + 1;


                    if (typeof showFeedback === 'function') {


                        setTimeout(() => showFeedback("War Bow obtained!", 'feedback-levelup'), feedbackDelay);


                        feedbackDelay += FEEDBACK_DELAY_INCREMENT;


                    }


                    if (typeof saveGameData === 'function') saveGameData();


                    console.log('War Bow unlocked!', playerAbilityUpgrades);


                    break;


                case 'unlockFlameCloak':


                    playerOwnedArmor.flame_cloak = 1;


                    collectedCounts.flame_cloak = (collectedCounts.flame_cloak || 0) + 1;


                    if (typeof showFeedback === 'function') {


                        setTimeout(() => showFeedback("Flame Cloak obtained!", 'feedback-levelup'), feedbackDelay);


                        feedbackDelay += FEEDBACK_DELAY_INCREMENT;


                    }


                    if (typeof saveGameData === 'function') saveGameData();


                    console.log('Flame Cloak unlocked!', playerOwnedArmor);


                    break;


                case 'collectArmor':


                    const armorId = item.armorId || 'grey';


                    const armorLevel = item.armorLevel || 1; // Get level from item (default to 1 for legacy items)


                    const currentArmorLevel = playerOwnedArmor[armorId] || 0;





                    // Only upgrade if new level is higher than current


                    if (armorLevel > currentArmorLevel) {


                        playerOwnedArmor[armorId] = armorLevel;


                        collectedCounts.armor++;


                        saveGameData();


                        checkAchievements('collect_armor');


                        if (typeof showFeedback === 'function') {


                            setTimeout(() => showFeedback(`${ARMOR_DATA[armorId]?.name || 'Armor'} obtained (Lvl ${armorLevel})!`, 'feedback-levelup'), feedbackDelay);


                            feedbackDelay += FEEDBACK_DELAY_INCREMENT;


                        }


                        if (typeof updateShopDisplay === 'function') updateShopDisplay();


                    }


                    break;


                case 'unlockWarBow':


                    if (!playerAbilityUpgrades.war_bow) {


                        playerAbilityUpgrades.war_bow = 1;
                        // Looted War Bow is unequipped by default as requested


                        collectedCounts.gold_magnet++; // Use generic count for sound


                        saveGameData();


                        if (typeof updateShopDisplay === 'function') updateShopDisplay();

                        // Archer range bonus is now applied only when EQUIPPED in the Barracks


                        if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit);


                    } else {


                        // Fallback if already unlocked (shouldn't happen due to drop logic, but safe)


                        goldFromThisPickup += 50; baseGoldEarnedThisLevel += 50; collectedCounts.gold += 50;


                        if (typeof showGoldPopup === 'function') {


                            setTimeout(() => showGoldPopup(x, y, 50), feedbackDelay);


                        }


                        feedbackDelay += 250;


                    }


                    break;


                    break;


                case 'unlockFlameCloak':


                    if (!playerOwnedArmor.flame_cloak) {


                        playerOwnedArmor.flame_cloak = 1;


                        if (typeof showFeedback === 'function') showFeedback('Flame Cloak Unlocked! (Check Shop)', 'feedback-levelup', 4000);


                        playSfx('powerup');


                        saveGameData();


                        if (typeof updateShopDisplay === 'function') updateShopDisplay();


                    } else {


                        goldFromThisPickup += 50; baseGoldEarnedThisLevel += 50; collectedCounts.gold += 50;


                        if (typeof showGoldPopup === 'function') setTimeout(() => showGoldPopup(x, y, 50), feedbackDelay);


                        feedbackDelay += 250;


                    }


                    break;


                case 'unlockFlameRing':
                    if (!playerAbilityUpgrades.flame_ring) {
                        playerAbilityUpgrades.flame_ring = 1;
                        // Looted Flame Ring is unequipped by default as requested
                        if (typeof showFeedback === 'function') showFeedback('Flame Ring Unlocked! (Check Shop)', 'feedback-levelup', 4000);
                        playSfx('powerup');
                        saveGameData();
                        if (typeof updateShopDisplay === 'function') updateShopDisplay();
                    } else {
                        goldFromThisPickup += 75; baseGoldEarnedThisLevel += 75; collectedCounts.gold += 75;
                        if (typeof showGoldPopup === 'function') setTimeout(() => showGoldPopup(x, y, 75), feedbackDelay);
                        feedbackDelay += 250;
                    }
                    break;

                case 'pickupOldWornPan':
                    if (unit) {
                        unit.hasOldWornPan = true;
                        console.log('[OLD WORN PAN] Picked up by', unit.name, 'unit.element:', unit.element, 'hasOldWornPan:', unit.hasOldWornPan);
                        if (typeof showFeedback === 'function') showFeedback(`${unit.name} found an Old Worn Pan!`, 'feedback-info');
                        playSfx('pickup');
                        if (typeof updateUnitVisualState === 'function') {
                            updateUnitVisualState(unit);
                            console.log('[OLD WORN PAN] After updateUnitVisualState, overlay:', unit.element?.querySelector('.old-worn-pan-overlay'));
                        }
                    }
                    break;

                case 'unlockSturdyBoots':
                    if (!playerAbilityUpgrades.sturdy_boots) {
                        playerAbilityUpgrades.sturdy_boots = 1;
                        if (typeof showFeedback === 'function') showFeedback("Sturdy Boots obtained!", 'feedback-levelup', 4000);
                        playSfx('powerup');
                        saveGameData();
                        if (typeof updateShopDisplay === 'function') updateShopDisplay();
                    } else {
                        goldFromThisPickup += 50; baseGoldEarnedThisLevel += 50; collectedCounts.gold += 50;
                        if (typeof showGoldPopup === 'function') setTimeout(() => showGoldPopup(x, y, 50), feedbackDelay);
                        feedbackDelay += 250;
                    }
                    break;

                case 'unlockChainBoots':
                    if (!playerAbilityUpgrades.chain_boots) {
                        playerAbilityUpgrades.chain_boots = 1;
                        if (typeof showFeedback === 'function') showFeedback("Chain Boots obtained!", 'feedback-levelup', 4000);
                        playSfx('powerup');
                        saveGameData();
                        if (typeof updateShopDisplay === 'function') updateShopDisplay();
                    } else {
                        goldFromThisPickup += 100; baseGoldEarnedThisLevel += 100; collectedCounts.gold += 100;
                        if (typeof showGoldPopup === 'function') setTimeout(() => showGoldPopup(x, y, 100), feedbackDelay);
                        feedbackDelay += 250;
                    }
                    break;

                case 'unlockGlacierBow':

                    if (!playerAbilityUpgrades.glacier_bow) {

                        playerAbilityUpgrades.glacier_bow = 1;
                        // Looted bow is unequipped by default

                        if (typeof showFeedback === 'function') showFeedback("Legendary Glacier Longbow obtained!", 'feedback-levelup', 4000);

                        playSfx('powerup');
                        saveGameData();
                        if (typeof updateShopDisplay === 'function') updateShopDisplay();

                    } else {

                        goldFromThisPickup += 100; baseGoldEarnedThisLevel += 100; collectedCounts.gold += 100;
                        if (typeof showGoldPopup === 'function') setTimeout(() => showGoldPopup(x, y, 100), feedbackDelay);
                        feedbackDelay += 250;

                    }

                    break;

                case 'applyTempBonus':
                    // Item is accepted! (Type check handled above)
                    unit.hasTemporaryWeapon = item.type;
                    unit.temporaryAttackBonus = 1;

                    if (typeof showFeedback === 'function') {
                        const weaponName = itemData.name || "Weapon";
                        setTimeout(() => showFeedback(`${weaponName} obtained!`, 'feedback-temp-white'), feedbackDelay);
                        feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                    }
                    playSfx('powerup');
                    recalculateUnitStats(unit);
                    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                    break;

                case 'applyCursedCleaver': {
                    // Check if unit is below 50% of their actual max HP - the curse kills them
                    const halfMaxHp = Math.floor(unit.maxHp / 2);

                    if (unit.hp <= halfMaxHp) {
                        // The curse is too strong - kill the unit
                        if (typeof showFeedback === 'function') {
                            setTimeout(() => showFeedback("The curse was too strong...", 'feedback-error'), feedbackDelay);
                            feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                        }
                        playSfx('debuff');
                        setTimeout(() => {
                            if (isUnitAliveAndValid(unit)) removeUnit(unit);
                        }, 300);
                    } else {
                        // Apply the cursed bonus: +30% ATK (of current ATK), +5% Crit, -50% of current max HP
                        const atkBonus = Math.max(1, Math.floor(unit.atk * 0.30));
                        const hpPenalty = Math.floor(unit.maxHp * 0.50);

                        unit.hasTemporaryWeapon = 'cursed_cleaver';
                        unit.temporaryAttackBonus = atkBonus;
                        unit.critChance = (unit.critChance || 0) + 0.05;
                        unit.hp = Math.max(1, unit.hp - hpPenalty);

                        if (typeof showFeedback === 'function') {
                            setTimeout(() => showFeedback(`Cursed Cleaver: +${atkBonus} ATK, +5% Crit, -${hpPenalty} HP!`, 'feedback-temp-white'), feedbackDelay);
                            feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                        }
                        playSfx('powerup');
                        recalculateUnitStats(unit);
                        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);
                        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
                    }
                    break;
                }
            }


        }


    });





    // Loot Hoarder passive check
    let finalGoldGain = goldFromThisPickup; // Start with the base gold collected from items
    if (typeof playerPassiveUpgrades !== 'undefined' && playerPassiveUpgrades.loot_hoarder > 0) {
        const bonus = Math.floor(finalGoldGain * (0.15 * playerPassiveUpgrades.loot_hoarder));
        finalGoldGain += bonus;
    }
    playerGold += finalGoldGain; goldCollectedThisLevel += finalGoldGain;
    lifetimeGold += finalGoldGain;





    if (chestOpenedThisCheck) playSfx('chestOpen');


    else if (collectedCounts.armor > 0) playSfx('armorEquip');


    else if (spellRestored) playSfx('spellbookPickup');


    else if (collectedCounts.health_potion > 0 && healAppliedTotal > 0) playSfx('potionPickup');


    else if (collectedCounts.shiny_gem > 0 && collectedCounts.gold === 0) playSfx('gemPickup');


    else if (collectedCounts.gold > 0 || collectedCounts.gold_magnet > 0) playSfx('pickup');





    if (healAppliedTotal > 0) {


        if (typeof showHealPopup === 'function') {


            setTimeout(() => showHealPopup(x, y, healAppliedTotal), feedbackDelay);


        }


        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);


        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);


    }


    if (goldFromThisPickup > 0 && typeof updateGoldDisplay === 'function') updateGoldDisplay();


    // Consolidated Gold Popup


    if (goldFromThisPickup > 0 && collectedCounts.gold > 0) {


        // Subtract gem values if any, to show only gold pickup value if we want to separate them, 


        // but user asked for consolidated display. 


        // If we picked up a gem, it showed its own popup.


        // Let's calculate gold-only value to avoid double counting if gem logic is separate.


        // Actually, addGold case adds to goldFromThisPickup for gems too.


        // But gems have their own popup.


        // So we should subtract gem values from the consolidated popup if gems show their own.


        // In addGold case: collectedCounts['shiny_gem']++ and showGemPopup is called.


        // So we should filter out gem value?


        // The user said "Gold Pickup Display: Consolidate the display of multiple gold pickups".


        // Gems are "shiny_gem". Gold items are "gold".


        // I will assume "gold pickups" means the gold coin items.


        // But goldFromThisPickup includes everything.


        // Let's just show the total. If a gem was picked up, it shows a gem popup AND this total popup?


        // Maybe suppress gem popup in addGold?


        // No, gems are special.


        // Let's just show the popup if collectedCounts.gold > 0.


        // And try to estimate or just show total.


        // Let's show total gold collected.


        if (typeof showGoldPopup === 'function') {


            setTimeout(() => showGoldPopup(x, y, goldFromThisPickup), feedbackDelay);


        }


    }





    if (itemsToAnimateRemoval.length > 0) {


        if (typeof animateItemPickup === 'function') animateItemPickup(itemsToAnimateRemoval);


        else removeVisualItems(itemsToAnimateRemoval);


        setTimeout(() => { items = items.filter(item => !itemsToAnimateRemoval.some(rem => rem.id === item.id)); }, ITEM_PICKUP_ANIMATION_DURATION_MS + 50);


    }


    setTimeout(() => updateCellItemStatus(x, y), 50);





    const remainingCollectibles = items.some(item => !item.collected && (item.type !== 'chest' || !item.opened));


    if (levelClearedAwaitingInput && !remainingCollectibles && typeof showFeedback === 'function') {


        setTimeout(() => showFeedback("All items collected!", "feedback-levelup"), feedbackDelay + 500);


        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();


    }


}





function triggerGoldMagnetPassive(movedUnit = null) {


    const magnetLevel = playerPassiveUpgrades.gold_magnet || 0;


    if (magnetLevel === 0) return;


    const radius = GOLD_MAGNET_BASE_RADIUS + magnetLevel - 1;


    let collectedItems = new Set();


    let goldCollected = 0;


    let gemsCollected = 0;





    // Track gold per cell for consolidated popups


    let goldPerCell = new Map(); // key: "x,y", value: total gold





    let unitsToCheck = movedUnit ? [movedUnit] : units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));





    unitsToCheck.forEach(unit => {


        for (let dx = -radius; dx <= radius; dx++) {


            for (let dy = -radius; dy <= radius; dy++) {


                if (Math.abs(dx) + Math.abs(dy) > radius) continue;


                const checkX = unit.x + dx; const checkY = unit.y + dy;


                if (!isCellInBounds(checkX, checkY)) continue;





                const itemsOnCell = items.filter(item =>


                    item.x === checkX && item.y === checkY && !item.collected && !collectedItems.has(item.id) &&


                    (item.type === 'gold' || item.type === 'shiny_gem')


                );





                itemsOnCell.forEach(item => {


                    item.collected = true; collectedItems.add(item.id);


                    const value = item.value || ITEM_DATA[item.type]?.value || 0;


                    goldCollected += value; baseGoldEarnedThisLevel += value;


                    if (item.type === 'shiny_gem') {


                        gemsCollected++;


                        // Show gem popup immediately (gems are special)


                        if (typeof showGemPopup === 'function') {


                            showGemPopup(item.x, item.y, value);


                        }


                    } else {


                        // Accumulate gold per cell for consolidated popup


                        const cellKey = `${item.x},${item.y}`;


                        goldPerCell.set(cellKey, (goldPerCell.get(cellKey) || 0) + value);


                    }


                    if (typeof animateItemMagnetPull === 'function') animateItemMagnetPull(item, unit);


                    else if (item.element) item.element.remove();


                });


            }


        }


    });





    // Show consolidated gold popups per cell


    goldPerCell.forEach((totalGold, cellKey) => {


        const [x, y] = cellKey.split(',').map(Number);


        if (typeof showGoldPopup === 'function') {


            showGoldPopup(x, y, totalGold);


        }


    });





    if (goldCollected > 0) {


        let goldWithPassives = goldCollected;
        if (typeof playerPassiveUpgrades !== 'undefined' && playerPassiveUpgrades.loot_hoarder > 0) {
            goldWithPassives += Math.floor(goldCollected * (0.15 * playerPassiveUpgrades.loot_hoarder));
        }
        playerGold += goldWithPassives; goldCollectedThisLevel += goldWithPassives;


        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();


        if (gemsCollected > 0) playSfx('gemPickup');


        if (goldCollected > (gemsCollected * SHINY_GEM_MIN_GOLD)) playSfx('pickup');





        setTimeout(() => {


            items = items.filter(item => !collectedItems.has(item.id));


        }, ITEM_MAGNET_FLY_DURATION_MS + 50);


    }


}





async function attack(attacker, targetX, targetY) {


    if (!attacker || !isUnitAliveAndValid(attacker)) return;


    if (attacker.isAttacking) return; // Prevent multi-attack glitch





    // Immediately clear highlights when attack starts
    if (typeof clearHighlights === 'function') clearHighlights();

    // RESTORE HIGHLIGHTS if this is the selected enemy
    // This ensures the red range border doesn't disappear during the attack animation
    if (attacker && selectedUnit && attacker.id === selectedUnit.id && attacker.team === 'enemy') {
        if (attacker.element) attacker.element.classList.add('selected-enemy'); // FORCE PERSISTENCE

        if ((attacker.currentRange || attacker.range) > 1 && typeof highlightEnemyRange === 'function') {
            highlightEnemyRange(attacker);
        }
        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(attacker);
    }





    // Level cleared = unlimited attacks allowed


    let canAttack = false;


    if (levelClearedAwaitingInput) {


        canAttack = true; // Unlimited attacks when level is cleared


    } else {


        canAttack = !attacker.acted;


        if (attacker.canMoveAndAttack && attacker.actionsTakenThisTurn < 2) canAttack = true;


        if (attacker.quickStrikeActive && attacker.actionsTakenThisTurn < 2) {


            if (attacker.actionsTakenTypes && attacker.actionsTakenTypes.includes('attack')) canAct = false;


            else canAct = true;


        }


    }


    if (!canAttack || attacker.isFrozen) { return; }





    attacker.isAttacking = true;





    let targetUnit = getUnitAt(targetX, targetY);


    let targetObstacle = getObstacleAt(targetX, targetY);


    let targetObject = targetUnit || targetObstacle;


    let unitInTargetTower = null;





    if (targetObstacle?.enterable && targetObstacle.occupantUnitId) {


        unitInTargetTower = units.find(u => u.id === targetObstacle.occupantUnitId);


        if (unitInTargetTower?.team !== attacker.team) { targetObject = targetObstacle; }


        else { unitInTargetTower = null; targetObject = null; }


    } else if (targetUnit?.inTower) {


        const towerUnitIsIn = obstacles.find(o => o.id === targetUnit.inTower);


        if (towerUnitIsIn && isObstacleIntact(towerUnitIsIn)) { targetObject = towerUnitIsIn; unitInTargetTower = targetUnit; }


        else { targetObject = null; }


    }





    if (!targetObject) { playSfx('error'); attacker.isAttacking = false; return; }





    // Tower Invulnerability: Cannot attack empty towers


    if (targetObject.enterable && !targetObject.occupantUnitId) {


        playSfx('error');


        if (typeof showFeedback === 'function') showFeedback("Tower is empty!", "feedback-error");


        attacker.isAttacking = false;


        return;


    }





    const isTargetAttackable = (targetObject.team && targetObject.team !== attacker.team) || targetObject.canBeAttacked;


    if (!isTargetAttackable) { playSfx('error'); showFeedback("Cannot attack that.", "feedback-error"); attacker.isAttacking = false; return; }





    const distance = getDistance(attacker, targetObject);


    const range = attacker.currentRange;


    // Aerial Invulnerability: Only ranged units/attacks can hit aerial units
    const endUnitForInvul = targetUnit || unitInTargetTower;
    if (endUnitForInvul && endUnitForInvul.isAerial) {
        // A unit is considered ranged if they have range > 1 OR they shoot a projectile
        const isAttackerRanged = (attacker.range > 1 || (attacker.shootsProjectileType && attacker.shootsProjectileType !== 'none'));
        if (!isAttackerRanged) {
            if (attacker.team === 'player') {
                if (typeof showFeedback === 'function') showFeedback("Cannot hit aerial units with melee!", 'error');
                playSfx('error');
            }
            attacker.isAttacking = false;
            return;
        }
    }

    // Units with fireballRadius or fire_bomb always use ranged attacks (even at distance 1)
    const isRanged = distance > 1 || (attacker.fireballRadius > 0 && attacker.shootsProjectileType === 'fireball') || (attacker.shootsProjectileType === 'fire_bomb');


    const ignoreStealthLOS = attacker.isStealthed && distance <= 1;


    const endUnit = targetUnit || unitInTargetTower;


    const targetIsVisible = !endUnit?.isStealthed || distance <= 1 || (attacker.isStealthed && distance <= 1) ||


        units.some(u => u.team === attacker.team && isUnitAliveAndValid(u) && (Math.abs(u.x - targetObject.x) + Math.abs(u.y - targetObject.y) === 1));





    if (!targetIsVisible || distance > range || (isRanged && !hasLineOfSight(attacker, targetObject, endUnit?.isStealthed && targetIsVisible) && targetObject.type !== 'door')) {


        playSfx('error'); showFeedback("Cannot attack target (Range/LOS/Stealth).", "feedback-error"); attacker.isAttacking = false; return;


    }


    if (attacker.isFrozen) { playSfx('error'); showFeedback("Unit is frozen!", "feedback-error"); attacker.isAttacking = false; return; }


    if (attacker.meleeOnlyAttack && isRanged) {


        playSfx('error'); showFeedback("Unit can only melee attack.", "feedback-error"); attacker.isAttacking = false; return;


    }


    if (attacker.team === 'player' && attacker.shootsProjectileType === 'none' && !attacker.meleeOnlyAttack && isRanged) { // Non-archer player ranged like Netter


        // Allow if it's a special ability or if we decide they can range attack. But for Netter, they are melee only.


        // If config says meleeOnlyAttack, it's handled above.


    }





    if (isRanged && targetObject.type === 'door') { /* Allow attacking doors */ }


    if (isRanged && attacker.team === 'player' && targetObject.type === 'snowman' && !targetObject.revealed) { /* Allow */ }


    else if (isRanged && targetObject.type === 'snowman') { playSfx('error'); showFeedback("Snowman already broken.", "feedback-error"); attacker.isAttacking = false; return; }





    const targetIsUnit = !!targetObject.team;


    const targetOriginalData = { id: targetObject.id, x: targetX, y: targetY, type: targetObject.type };


    // Base damage from ATK and permanent upgrades
    let damage = (attacker.atk || 0);

    // Apply temporary weapon chance (50% for +1) - only for goblin weapons, not cursed cleaver
    if (attacker.hasTemporaryWeapon && attacker.hasTemporaryWeapon !== 'cursed_cleaver') {
        if (Math.random() < 0.5) {
            damage += 1;
        }
    }

    // Apply temporary debuffs (penalties)
    damage -= (attacker.temporaryAttackDebuff || 0);

    // --- Crit Check (Player Only) ---
    let isCrit = false;
    if (attacker.team === 'player' && attacker.critChance > 0) {
        if (Math.random() < attacker.critChance) {
            isCrit = true;
            damage *= 2;
        }
    }
    if (isCrit) {
        playSfx('success');
    }


    let isStealthAttack = false;





    if (attacker.isStealthed && !attacker.stealthAttackBonusUsed) {


        damage += ROGUE_STEALTH_DAMAGE_BONUS; isStealthAttack = true;


    }





    let impactDelay = 0;


    const projectileType = isRanged ? attacker.shootsProjectileType : 'melee';


    const effectiveProjectileType = (targetObject.type === 'snowman' && isRanged && attacker.team === 'player') ? 'arrow' : projectileType;





    const isFrostAttack = (attacker.team === 'player' && equippedGlacierBow && (effectiveProjectileType === 'arrow' || (effectiveProjectileType === 'fireball' && attacker.type === 'wizard')));

    if (typeof animateAttack === 'function') {
        impactDelay = await animateAttack(attacker, targetObject, isRanged, effectiveProjectileType, isFrostAttack);
    }





    // Skip delay when level is cleared to allow faster actions


    if (!levelClearedAwaitingInput && impactDelay > 0) {


        await new Promise(resolve => setTimeout(resolve, impactDelay));


    }





    // Check validity after delay - level might have been skipped


    if (!units.includes(attacker)) { attacker.isAttacking = false; return; }





    let currentTargetObject = targetIsUnit ? units.find(u => u.id === targetOriginalData.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === targetOriginalData.id && isObstacleIntact(o));


    let currentUnitInTower = null;


    if (!targetIsUnit && currentTargetObject?.enterable && currentTargetObject.occupantUnitId) { currentUnitInTower = units.find(u => u.id === currentTargetObject.occupantUnitId && isUnitAliveAndValid(u)); }


    else if (targetIsUnit && currentTargetObject?.inTower) { const currentTower = obstacles.find(o => o.id === currentTargetObject.inTower); if (currentTower && isObstacleIntact(currentTower)) { currentTargetObject = currentTower; currentUnitInTower = units.find(u => u.id === targetOriginalData.id && isUnitAliveAndValid(u)); } else { currentTargetObject = null; } }





    if (!currentTargetObject) {
        // Unstealth on attack
        if (attacker.isStealthed) {
            attacker.isStealthed = false;
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(attacker);
        }

        // Reset Cleave after attack
        if (attacker.cleaveActive) {
            attacker.cleaveActive = false;
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(attacker);
        }

        if (attacker.quickStrikeActive) {
            attacker.quickStrikeActive = false;
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(attacker);
        }

        if (isUnitAliveAndValid(attacker) && !attacker.acted) {
            attacker.isStealthed = false;


            if (attacker.type === 'goblin_shadowstalker') attacker.mov = 5; // Restore speed


            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(attacker);
        }
        checkWinLossConditions(); return;
    }


    if (currentTargetObject.type === 'snowman' && !currentTargetObject.revealed) {


        await revealSnowman(currentTargetObject, attacker);


        if (isUnitAliveAndValid(attacker) && !attacker.acted) finishAction(attacker, 'attack');


        return;


    }





    // Kri'zak/Glacier Bow effect application moved below evasion check
    if (projectileType === 'fire_bomb') {
        if (!gridState[targetY]) gridState[targetY] = [];
        if (!gridState[targetY][targetX]) gridState[targetY][targetX] = {};
        gridState[targetY][targetX].fireTurns = 4; // Lasts longer
        gridState[targetY][targetX].fireAtk = attacker.atk;
        if (typeof updateCellVisual === 'function') updateCellVisual(targetX, targetY);
    }

    try {


        // Sound will play after damage calculation





        let effectiveDamage = damage;

        let isDodged = false;
        let changed = false;
        // Evasion: 5% chance to dodge
        if ((currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') && !currentTargetObject.isKeep && typeof playerPassiveUpgrades !== 'undefined' && playerPassiveUpgrades.evasion > 0) {
            if (Math.random() < 0.05) {
                if (typeof showFeedback === 'function') showFeedback("Dodged!", "feedback-success");
                if (typeof showDamagePopup === 'function') showDamagePopup(currentTargetObject.x, currentTargetObject.y, "Dodge");
                if (typeof playSfx === 'function') playSfx('dodge');
                effectiveDamage = 0; // Set damage to 0 instead of returning early
                isDodged = true;
            }
        }

        // Apply Freezing Arrows / Slow effects only if NOT dodged
        if (!isDodged && targetUnit && (attacker.type === 'krizak' || isFrostAttack)) {
            const freezeDuration = 1;
            const slowDuration = 2;

            // Only Krizak (boss) freezes now. Player Glacier Bow only slows.
            if (!targetUnit.isFrozen && attacker.type === 'krizak') {
                targetUnit.isFrozen = true;
                targetUnit.frozenTurnsLeft = freezeDuration;
                if (typeof showFeedback === 'function') showFeedback(`${targetUnit.name} frozen!`, "feedback-info");
            }

            targetUnit.isSlowed = true;
            targetUnit.slowedTurnsLeft = slowDuration;
            targetUnit.slowedMovPenalty = 1;
            recalculateAllUnitsStats();
            changed = true;
        }


        const targetArmor = (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') ? ARMOR_DATA[equippedArmorId] : null;


        const targetArmorLevel = targetArmor ? (playerOwnedArmor[equippedArmorId] || 0) : 0;


        const targetImmuneFire = currentTargetObject.immuneToFire || (targetArmor && targetArmorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (targetArmor.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE);


        const targetImmuneFrost = currentTargetObject.immuneToFrost || (targetArmor && targetArmorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (targetArmor.resistances?.frost ?? 0) >= ARMOR_RESISTANCE_VALUE);





        if (forestArmorActiveTurns > 0 && (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player')) {
            // Scale damage reduction with armor level
            const armorLevel = playerOwnedArmor[equippedArmorId] || 0;
            const damageReduction = armorLevel > 0 ? armorLevel : 1;
            effectiveDamage = effectiveDamage - damageReduction;
        }

        // Apply Resistance/Immunity logic
        if (isFrostAttack && (effectiveProjectileType === 'fireball' || effectiveProjectileType === 'arrow')) {
            // Frost Attack: Check frost resistance/immunity
            const targetFrostResistance = currentTargetObject.frostResistance || 0;
            if (targetImmuneFrost && currentLevel >= IMMUNITY_LEVEL_START) {
                effectiveDamage = Math.max(1, Math.floor(effectiveDamage * 0.25));
            } else if (targetFrostResistance > 0) {
                effectiveDamage = Math.max(1, Math.floor(effectiveDamage - targetFrostResistance));
            }
        } else if (effectiveProjectileType === 'fireball' || attacker.type === 'goblin_pyromancer' || attacker.type === 'zulfar') {
            // Fire Attack: Check fire resistance/immunity
            let totalFireResistance = currentTargetObject.fireResistance || 0;
            // ... (rest of the fire resistance logic, I'll keep it mostly as is but condensed)
            if (currentTargetObject.team === 'player') {
                if (typeof equippedArmorId !== 'undefined' && ARMOR_DATA[equippedArmorId]) {
                    if (equippedArmorId === 'red') totalFireResistance += Math.floor((playerOwnedArmor['red'] || 1) / 2);
                    else totalFireResistance += ARMOR_DATA[equippedArmorId].resistances?.fire || 0;
                }
                if (typeof equippedFlameRing !== 'undefined' && equippedFlameRing) totalFireResistance += 1;
            }

            if (targetImmuneFire && currentLevel >= IMMUNITY_LEVEL_START) {
                effectiveDamage = Math.max(1, Math.floor(effectiveDamage * 0.25));
            } else if (totalFireResistance > 0) {
                effectiveDamage = Math.max(1, Math.floor(effectiveDamage - totalFireResistance));
            }
        }


        effectiveDamage = Math.max(0, effectiveDamage);

        // Old Worn Pan: Block 1 damage from enemy attack, then break
        if (currentTargetObject.hasOldWornPan && attacker.team === 'enemy' && effectiveDamage > 0) {
            effectiveDamage = Math.max(0, effectiveDamage - 1);
            currentTargetObject.hasOldWornPan = false;
            console.log('[OLD WORN PAN] Blocked 1 DMG! Pan broke. Playing block SFX.');
            if (typeof showFeedback === 'function') {
                showFeedback("Old Worn Pan blocked 1 DMG and broke!", "feedback-neutral", 2000);
            }
            playSfx('block');
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(currentTargetObject);
        }





        // Break Polymorph on damage - do this BEFORE applying damage so unit reverts at full HP then takes damage


        if (currentTargetObject.isPolymorphed) {


            revertPolymorph(currentTargetObject);


            if (typeof showFeedback === 'function') showFeedback("Polymorph broken!", "feedback-error");


        }





        currentTargetObject.hp -= effectiveDamage;

        if (effectiveDamage > 0) {
            playSfx(isStealthAttack ? 'rogueAttack' : 'hit');
            if (currentTargetObject && currentTargetObject.type && currentTargetObject.type.includes('goblin') && currentTargetObject.hp > 0) {
                playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2');
            }
            if (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') {
                playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
            }

            // Aggressive Play Hook: Reset damage window if player hits enemy
            if (attacker.team === 'player' && currentTargetObject.team === 'enemy') {
                window.turnsSinceLastDamage = 0;
            }
        }

        // Thorns: Melee attackers take damage equal to thorns level (only if attacker is adjacent)
        if (effectiveDamage > 0 && !isRanged && (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') && !currentTargetObject.isKeep && !currentTargetObject.isVillager && !currentUnitInTower?.isVillager && !currentTargetObject.isWagon && playerPassiveUpgrades.thorns > 0) {
            const dist = Math.abs(attacker.x - currentTargetObject.x) + Math.abs(attacker.y - currentTargetObject.y);
            if (dist <= 1 && attacker.team === 'enemy') {
                const thornsDamage = playerPassiveUpgrades.thorns;
                attacker.hp -= thornsDamage;
                if (typeof showDamagePopup === 'function') showDamagePopup(attacker.x, attacker.y, thornsDamage);
                if (typeof updateWorldHpBar === 'function') updateWorldHpBar(attacker);

                // NEW: Handle death from Thorns
                if (attacker.hp <= 0) {
                    attacker.hp = 0;
                    const deathPromise = removeUnit(attacker);

                    // Vampiric Aura Trigger for Thorns deaths - Only for actual enemies (not totems)
                    if (currentTargetObject && currentTargetObject.team === 'player' && !currentTargetObject.isKeep && !currentTargetObject.isVillager && !currentUnitInTower?.isVillager && !currentTargetObject.isWagon && playerPassiveUpgrades.vampiric_aura > 0 &&
                        currentTargetObject.hp < currentTargetObject.maxHp && !attacker.isTotem) {
                        const healAmt = playerPassiveUpgrades.vampiric_aura;
                        currentTargetObject.hp = Math.min(currentTargetObject.maxHp, currentTargetObject.hp + healAmt);
                        if (typeof showHealPopup === 'function') showHealPopup(currentTargetObject.x, currentTargetObject.y, healAmt);
                        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(currentTargetObject);
                        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(currentTargetObject);
                    }

                    await deathPromise;
                }
            }
        }


        // Cage Destruction / Rescue handled by removeObstacle when HP <= 0


        if (currentTargetObject.hp < 0) currentTargetObject.hp = 0;





        // Unstealth if rogue or shadowstalker takes damage


        if ((currentTargetObject.type === 'rogue' || currentTargetObject.type === 'goblin_shadowstalker') && currentTargetObject.isStealthed) {


            currentTargetObject.isStealthed = false;


            if (currentTargetObject.type === 'goblin_shadowstalker') currentTargetObject.mov = 5; // Restore speed


            if (typeof showFeedback === 'function') showFeedback(`${currentTargetObject.name} revealed!`, "feedback-error");


            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(currentTargetObject);


        }





        if (typeof showDamagePopup === 'function' && !isDodged) {
            const popupClass = isCrit ? 'crit-popup' : 'damage-popup';
            showDamagePopup(targetOriginalData.x, targetOriginalData.y, effectiveDamage, popupClass);
        }


        if (typeof flashElementOnHit === 'function') flashElementOnHit(currentTargetObject.element);





        if (currentTargetObject.team) {


            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(currentTargetObject);


            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(currentTargetObject);


            // Force update if this is the selected unit (ensures real-time side panel update)


            if (selectedUnit && selectedUnit.id === currentTargetObject.id && typeof updateUnitInfo === 'function') {


                updateUnitInfo(currentTargetObject);


            }


        }





        let deathPromises = [];


        let primaryTargetRemoved = false;





        if (currentTargetObject.hp <= 0) {


            primaryTargetRemoved = true;


            if (currentTargetObject.team) {
                deathPromises.push(removeUnit(currentTargetObject));

                // Vampiric Aura: Heal on kill (actual enemies only, no totems)
                // Only trigger if unit is missing health
                if (attacker && attacker.team === 'player' && !attacker.isKeep && !attacker.isVillager && !attacker.isWagon && playerPassiveUpgrades.vampiric_aura > 0 &&
                    attacker.hp < attacker.maxHp && !currentTargetObject.isTotem) {
                    const healAmt = playerPassiveUpgrades.vampiric_aura;
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
                    // Use standard showHealPopup (Green +X)
                    if (typeof showHealPopup === 'function') showHealPopup(attacker.x, attacker.y, healAmt);
                    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(attacker);
                    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(attacker);
                }
            }


            else {


                const unitToDamageAfterTower = currentUnitInTower && isUnitAliveAndValid(currentUnitInTower) ? currentUnitInTower : null;


                deathPromises.push(removeObstacle(currentTargetObject));


                currentTargetObject = null;





                if (unitToDamageAfterTower) {
                    // FIX: User requested NO damage when tower is destroyed.
                    // Previously: unitToDamageAfterTower.hp -= towerDestroyDamage;
                    // Now: We just ensure they are safe.
                    // (optional: adding a small visual effect or sound could be nice, but user wants NO damage)
                }
                // The following lines were originally inside the `if (unitToDamageAfterTower)` block,
                // but the instruction implies they should be outside or removed.
                // Given the "NO damage" request, the damage-related lines are removed.
                // The visual feedback lines are kept, but without a `towerDestroyDamage` variable,
                // they would need to be adjusted or removed if no damage is applied.
                // For now, assuming the instruction implies removing the damage application,
                // and thus also removing the visual feedback directly tied to that damage.
                // The instruction's formatting is a bit ambiguous here, but "NO damage" is clear.
                // The instruction's provided snippet `}       if (typeof showDamagePopup === 'function') showDamagePopup(unitToDamageAfterTower.x, unitToDamageAfterTower.y, towerDestroyDamage);`
                // seems to indicate that the `showDamagePopup` line should be *outside* the `if (unitToDamageAfterTower)` block,
                // and the damage calculation inside should be removed.
                // However, `towerDestroyDamage` would then be undefined.
                // I will interpret "NO damage" as removing the damage calculation and application,
                // and thus also removing the visual feedback directly tied to that damage.
                // The `if (unitToDamageAfterTower)` block will now only contain the comments.
                // The original lines were:
                // let towerDestroyDamage = Math.max(1, Math.floor(effectiveDamage / 2));
                // if (unitToDamageAfterTower.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else if (unitToDamageAfterTower && unitToDamageAfterTower.type && unitToDamageAfterTower.type.includes('goblin')) { playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2'); } else { playSfx('hit'); };
                // unitToDamageAfterTower.hp -= towerDestroyDamage;
                // if (unitToDamageAfterTower.hp < 0) unitToDamageAfterTower.hp = 0;
                // if (typeof showDamagePopup === 'function') showDamagePopup(unitToDamageAfterTower.x, unitToDamageAfterTower.y, towerDestroyDamage);
                // if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterTower.element);
                // if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterTower);
                // if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterTower);
                // if (unitToDamageAfterTower.hp <= 0) deathPromises.push(removeUnit(unitToDamageAfterTower));
                // All these lines are removed as per "NO damage" request.
            }


        }


        else if (currentTargetObject.team) {


            if (!isDodged && attacker.inflictsSlow) {
                let slowDuration = GOBLIN_BLUE_SLOW_DURATION;
                if (currentTargetObject.team === 'player' && typeof equippedArmorId !== 'undefined' && equippedArmorId === 'blue') {
                    const azureLevel = playerOwnedArmor['blue'] || 1;
                    const resistBonus = Math.floor(azureLevel / 2);
                    if (azureLevel >= 5) slowDuration = 0; // Immune at level 5+
                    else slowDuration = Math.max(0, slowDuration - resistBonus);
                }
                if (slowDuration > 0) {
                    currentTargetObject.isSlowed = true; currentTargetObject.slowedTurnsLeft = slowDuration; playSfx('slow_inflicted'); changed = true;
                }
            }


            if (!isDodged && attacker.inflictsBleed) {


                currentTargetObject.bleedTurnsLeft = attacker.bleedDuration;


                currentTargetObject.bleedDamage = attacker.bleedDamage;


                if (typeof showFeedback === 'function') showFeedback("Bleeding!", "feedback-error");


                changed = true;


            }


            if (!isDodged && attacker.knockback) {
                // Knockback Logic: Push target 1 tile away from attacker
                const kbDirX = Math.sign(targetOriginalData.x - attacker.x);
                const kbDirY = Math.sign(targetOriginalData.y - attacker.y);
                const kbTargetX = targetOriginalData.x + kbDirX;
                const kbTargetY = targetOriginalData.y + kbDirY;

                // Check if knockback tile is valid (in bounds, no obstacle blocking movement)
                // Note: We ignore units for collision to allow "pushing into unit" (or just failing to push if occupied)
                // Let's implement simple check: needs to be empty or contain enterable obstacle without unit

                if (isCellInBounds(kbTargetX, kbTargetY) && !currentTargetObject.inTower) {
                    const kbObstacle = getObstacleAt(kbTargetX, kbTargetY);
                    const kbUnit = getUnitAt(kbTargetX, kbTargetY);

                    let canKnockback = true;
                    if (kbUnit) canKnockback = false;
                    if (kbObstacle && (!kbObstacle.enterable || (kbObstacle.blocksMove && !kbObstacle.enterable))) canKnockback = false;
                    if (kbObstacle && kbObstacle.enterable && kbObstacle.occupantUnitId) canKnockback = false;

                    if (canKnockback) {
                        // Move unit visually and logically
                        currentTargetObject.x = kbTargetX;
                        currentTargetObject.y = kbTargetY;

                        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(currentTargetObject);
                        if (typeof updateUnitPosition === 'function') updateUnitPosition(currentTargetObject, true);

                        // Check for trap on landing cell
                        const landingTrap = getObstacleAt(kbTargetX, kbTargetY);
                        if (landingTrap && landingTrap.isDangerTile) {
                            await triggerTrap(currentTargetObject, landingTrap);
                        }

                        // Add slight visual feedback?
                        if (typeof showFeedback === 'function') showFeedback("Knockback!", "feedback-neutral");
                        changed = true;
                    }
                }
            }


            if (changed && typeof updateUnitVisualState === 'function') updateUnitVisualState(currentTargetObject);


            if (changed && typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(currentTargetObject);


        } else {


            // Tower survived (or other obstacle)


            // Tower survived (or other obstacle)


            // Unit inside is fully protected until tower is destroyed.


        }





        // Skip waiting for death animations when level is cleared for faster actions


        if (!levelClearedAwaitingInput) {


            await Promise.all(deathPromises);


        }


        deathPromises = [];





        // Zul'far's Fireball Splash Damage - hits all tiles in radius around target


        if (attacker.fireballRadius > 0 && attacker.shootsProjectileType === 'fireball' && isRanged) {


            const splashRadius = attacker.fireballRadius;


            const splashDamage = Math.max(1, Math.floor(effectiveDamage / 2)); // Half damage for splash


            const targetCenterX = targetOriginalData.x;


            const targetCenterY = targetOriginalData.y;





            // Create a SINGLE large explosion effect centered on the target


            if (typeof createExplosionEffect === 'function') {
                createExplosionEffect(targetCenterX, targetCenterY, isFrostAttack ? 'frostFireball' : 'fireball', splashRadius);

                // Fire Bomb (Wyvern Rider) effect
                if (attacker.type === 'goblin_wyvern_rider') {
                    const finalX = Math.round(targetX);
                    const finalY = Math.round(targetY);
                    if (isCellInBounds(finalX, finalY)) {
                        if (!gridState[finalY]) gridState[finalY] = [];
                        if (!gridState[finalY][finalX]) gridState[finalY][finalX] = {};
                        gridState[finalY][finalX].fireTurns = 4;
                        gridState[finalY][finalX].fireAtk = attacker.atk;
                        if (typeof updateCellVisual === 'function') updateCellVisual(finalX, finalY);
                    }
                }
            }





            // Get all cells in the splash radius (including diagonals for a 3x3 area when radius=1)


            for (let dx = -splashRadius; dx <= splashRadius; dx++) {


                for (let dy = -splashRadius; dy <= splashRadius; dy++) {


                    if (dx === 0 && dy === 0) continue; // Skip center (already hit)


                    const splashX = targetCenterX + dx;


                    const splashY = targetCenterY + dy;


                    if (!isCellInBounds(splashX, splashY)) continue;





                    // Damage unit at splash location


                    const splashUnit = getUnitAt(splashX, splashY);


                    if (splashUnit && isUnitAliveAndValid(splashUnit) && splashUnit.team !== attacker.team) {


                        let actualSplashDamage = splashDamage;


                        if (forestArmorActiveTurns > 0 && splashUnit.team === 'player') {
                            const armorLevel = playerOwnedArmor[equippedArmorId] || 0;
                            const damageReduction = armorLevel > 0 ? armorLevel : 1;
                            actualSplashDamage = Math.max(0, actualSplashDamage - damageReduction);
                        }

                        // Fireball Splash resistance
                        const targetImmuneFireSplash = splashUnit.immuneToFire;
                        const targetFireResistanceSplash = splashUnit.fireResistance || 0;
                        if (targetImmuneFireSplash && currentLevel >= IMMUNITY_LEVEL_START) {
                            actualSplashDamage = Math.max(1, Math.floor(actualSplashDamage * 0.25));
                        } else if (targetFireResistanceSplash > 0) {
                            actualSplashDamage = Math.max(1, Math.floor(actualSplashDamage - targetFireResistanceSplash));
                        }





                        if (splashUnit.isPolymorphed) {
                            splashUnit.hp = splashUnit.maxHp;
                            revertPolymorph(splashUnit);
                        }
                        if (splashUnit.hasOldWornPan && attacker.team === 'enemy' && actualSplashDamage > 0) {
                            actualSplashDamage = Math.max(0, actualSplashDamage - 1);
                            splashUnit.hasOldWornPan = false;
                            playSfx('block');
                            if (typeof showFeedback === 'function') showFeedback("Old Worn Pan blocked 1 DMG and broke!", "feedback-neutral", 2000);
                        }
                        splashUnit.hp -= actualSplashDamage;


                        if (splashUnit.hp < 0) splashUnit.hp = 0;


                        if (typeof showDamagePopup === 'function') showDamagePopup(splashX, splashY, actualSplashDamage);


                        if (typeof flashElementOnHit === 'function') flashElementOnHit(splashUnit.element);


                        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(splashUnit);


                        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(splashUnit);





                        // Unstealth rogues hit by splash


                        if (splashUnit.type === 'rogue' && splashUnit.isStealthed) {


                            splashUnit.isStealthed = false;


                            if (typeof showFeedback === 'function') showFeedback(`${splashUnit.name} revealed!`, "feedback-error");


                            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(splashUnit);


                        }





                        // Vampiric Aura Trigger - Only for actual enemies (not totems), and not for keep
                        if (attacker.team === 'player' && !attacker.isKeep && !attacker.isVillager && !attacker.isWagon && playerPassiveUpgrades.vampiric_aura > 0 && attacker.hp < attacker.maxHp && !splashUnit.isTotem) {
                            const healAmt = playerPassiveUpgrades.vampiric_aura;
                            attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmt);
                            if (typeof showHealPopup === 'function') showHealPopup(attacker.x, attacker.y, healAmt);
                            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(attacker);
                            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(attacker);
                        }

                        if (splashUnit.hp <= 0) deathPromises.push(removeUnit(splashUnit));


                    }





                    // Damage obstacles at splash location


                    const splashObstacle = getObstacleAt(splashX, splashY);


                    if (splashObstacle && splashObstacle.canBeAttacked && isObstacleIntact(splashObstacle)) {


                        if (!(splashObstacle.enterable && !splashObstacle.occupantUnitId)) { // Don't damage empty towers


                            splashObstacle.hp -= splashDamage;


                            if (splashObstacle.hp <= 0) {


                                splashObstacle.hp = 0;


                                deathPromises.push(removeObstacle(splashObstacle));


                            }


                        }


                    }


                }


            }


            // Skip waiting for death animations when level is cleared


            if (!levelClearedAwaitingInput) {


                await Promise.all(deathPromises);


            }


            deathPromises = [];


        }





        if ((attacker.type === 'champion' && attacker.cleaveActive || attacker.type === 'cleaver') && currentTargetObject) {


            const currentAttacker = units.find(u => u.id === attacker.id);


            if (currentAttacker && isUnitAliveAndValid(currentAttacker)) {


                const attackDirX = Math.sign(targetOriginalData.x - currentAttacker.x); const attackDirY = Math.sign(targetOriginalData.y - currentAttacker.y);


                const potentialCleaveCellsCoords = [];
                let cleaveHits = 1; // Start at 1 to count the primary target
                const cx = currentAttacker.x, cy = currentAttacker.y;

                if (attackDirX !== 0) {
                    // Horizontal (Right/Left): 3 in front column, 1 further in middle row
                    potentialCleaveCellsCoords.push(
                        { x: cx + attackDirX, y: cy - 1 },
                        { x: cx + attackDirX, y: cy },
                        { x: cx + attackDirX, y: cy + 1 },
                        { x: cx + (attackDirX * 2), y: cy }
                    );
                } else if (attackDirY !== 0) {
                    // Vertical (Down/Up): 3 in front row, 1 further in middle column
                    potentialCleaveCellsCoords.push(
                        { x: cx - 1, y: cy + attackDirY },
                        { x: cx, y: cy + attackDirY },
                        { x: cx + 1, y: cy + attackDirY },
                        { x: cx, y: cy + (attackDirY * 2) }
                    );
                } else {
                    // Fallback
                    const px = targetOriginalData.x, py = targetOriginalData.y;
                    potentialCleaveCellsCoords.push({ x: px, y: py }, { x: px + 1, y: py }, { x: px, y: py + 1 }, { x: px + 1, y: py + 1 });
                }


                // Skip cleave delay when level is cleared


                if (!levelClearedAwaitingInput) {


                    await new Promise(r => setTimeout(r, 50));


                }


                for (const { x: cleaveX, y: cleaveY } of potentialCleaveCellsCoords) {


                    if (!isCellInBounds(cleaveX, cleaveY)) continue;


                    let cleaveTarget = getUnitAt(cleaveX, cleaveY); let cleaveObstacle = getObstacleAt(cleaveX, cleaveY); let cleaveTargetObject = null; let unitInCleaveTower = null;


                    if (cleaveTarget && isUnitAliveAndValid(cleaveTarget) && cleaveTarget.team !== currentAttacker.team) {
                        if (cleaveTarget.inTower) { const towerCleaveTargetIsIn = obstacles.find(o => o.id === cleaveTarget.inTower); if (towerCleaveTargetIsIn && isObstacleIntact(towerCleaveTargetIsIn)) { cleaveTargetObject = towerCleaveTargetIsIn; unitInCleaveTower = cleaveTarget; } else continue; } else { cleaveTargetObject = cleaveTarget; }
                        if ((cleaveTargetObject.type && cleaveTargetObject.team === 'enemy') || (unitInCleaveTower && unitInCleaveTower.team === 'enemy')) {
                            cleaveHits++;
                        }
                    } else if (cleaveObstacle && cleaveObstacle.canBeAttacked && isObstacleIntact(cleaveObstacle)) {


                        // Empty towers cannot be cleaved


                        if (cleaveObstacle.enterable && !cleaveObstacle.occupantUnitId) continue;


                        if (cleaveObstacle.enterable && cleaveObstacle.occupantUnitId) { const unitInside = units.find(u => u.id === cleaveObstacle.occupantUnitId); if (unitInside && unitInside.team !== currentAttacker.team) { cleaveTargetObject = cleaveObstacle; unitInCleaveTower = unitInside; } else { cleaveTargetObject = cleaveObstacle; } } else { cleaveTargetObject = cleaveObstacle; }
                    }
                    if (!cleaveTargetObject || cleaveTargetObject.id === targetOriginalData.id) continue;


                    let effectiveCleaveDamage = (attacker.cleaveDamage !== undefined && attacker.cleaveDamage > 0) ? attacker.cleaveDamage : 1;
                    if (isCrit) effectiveCleaveDamage *= 2; // Cleave also crits? Why not!

                    if (forestArmorActiveTurns > 0 && (cleaveTargetObject.team === 'player' || unitInCleaveTower?.team === 'player')) {
                        const armorLevel = playerOwnedArmor[equippedArmorId] || 0;
                        const damageReduction = armorLevel > 0 ? armorLevel : 1;
                        effectiveCleaveDamage = Math.max(0, effectiveCleaveDamage - damageReduction);
                    }

                    effectiveCleaveDamage = Math.max(0, effectiveCleaveDamage);

                    if (effectiveCleaveDamage > 0) {
                        if (cleaveTargetObject.team === 'player' || unitInCleaveTower?.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else { playSfx('hit'); if (cleaveTargetObject && cleaveTargetObject.type && cleaveTargetObject.type.includes('goblin') && cleaveTargetObject.hp > 0) playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2'); };
                    }


                    cleaveTargetObject.hp -= effectiveCleaveDamage; if (cleaveTargetObject.hp < 0) cleaveTargetObject.hp = 0;


                    if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, effectiveCleaveDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(cleaveTargetObject.element);


                    const isCleaveTargetUnit = !!cleaveTargetObject.team; if (isCleaveTargetUnit) { if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(cleaveTargetObject); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(cleaveTargetObject); }


                    if (cleaveTargetObject.hp <= 0) { if (isCleaveTargetUnit) { deathPromises.push(removeUnit(cleaveTargetObject)); } else { const unitToDamageAfterCleavedTower = unitInCleaveTower && isUnitAliveAndValid(unitInCleaveTower) ? unitInCleaveTower : null; deathPromises.push(removeObstacle(cleaveTargetObject)); if (unitToDamageAfterCleavedTower) { let towerCleaveDamage = Math.max(1, Math.floor(effectiveCleaveDamage / 2)); if (unitToDamageAfterCleavedTower.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else { playSfx('hit'); if (unitToDamageAfterCleavedTower && unitToDamageAfterCleavedTower.type && unitToDamageAfterCleavedTower.type.includes('goblin') && unitToDamageAfterCleavedTower.hp > 0) playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2'); }; unitToDamageAfterCleavedTower.hp -= towerCleaveDamage; if (unitToDamageAfterCleavedTower.hp < 0) unitToDamageAfterCleavedTower.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, towerCleaveDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterCleaveTower.element); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterCleavedTower); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterCleavedTower); if (unitToDamageAfterCleavedTower.hp <= 0) deathPromises.push(removeUnit(unitToDamageAfterCleavedTower)); } } }


                }


                // Skip waiting for death animations when level is cleared


                if (!levelClearedAwaitingInput) {


                    await Promise.all(deathPromises);


                }




                if (cleaveHits >= 3) {
                    checkAchievements('cleave_multi_hit', { count: 3 });
                }
                if (cleaveHits >= 4) {
                    checkAchievements('cleave_multi_hit', { count: 4 });
                }
            }


        }





        const finalAttackerCheck = units.find(u => u.id === attacker.id);


        if (finalAttackerCheck && isUnitAliveAndValid(finalAttackerCheck)) {


            finishAction(finalAttackerCheck, 'attack');


            if (finalAttackerCheck.isStealthed) {


                finalAttackerCheck.isStealthed = false;


                if (finalAttackerCheck.type === 'goblin_shadowstalker') finalAttackerCheck.mov = 5; // Restore speed


                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(finalAttackerCheck);


            }


        }





    } catch (e) {


        console.error("Error during attack resolution:", e);


        const errorAttackerCheck = units.find(u => u.id === attacker.id);


        if (errorAttackerCheck && isUnitAliveAndValid(errorAttackerCheck) && !errorAttackerCheck.acted) finishAction(errorAttackerCheck, 'attack');


    } finally {


        checkWinLossConditions();


    }


}





async function explodeUnit(unit, isDeathExplosion = false) {


    if (!unit || unit.explosionRadius < 0) return;


    const centerX = unit.x; const centerY = unit.y; const radius = unit.explosionRadius; const damage = unit.explosionDamage || unit.atk || unit.attack || unit.baseAtk || 0;


    playSfx('sapperExplode'); if (typeof createExplosionEffect === 'function') createExplosionEffect(centerX, centerY, 'fireball');

    // Calculate affected units BEFORE delay to avoid hitting units spawned by the explosion (e.g. rescued prisoners)
    const affectedUnits = getUnitsInArea(centerX, centerY, radius);
    let deathPromises = [];

    await new Promise(r => setTimeout(r, 100));

    affectedUnits.forEach(targetUnit => {
        if (targetUnit.id === unit.id || !isUnitAliveAndValid(targetUnit)) return;

        // Unstealth any unit hit by explosion (e.g. Goblin Stalker)
        if (targetUnit.isStealthed) {
            targetUnit.isStealthed = false;
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(targetUnit);
        }

        if (targetUnit.inTower) return; // Unit in tower is protected from explosion

        let actualExplosionDamage = damage;
        let totalFireResistance = targetUnit.fireResistance || 0;

        if (targetUnit.team === 'player') {
            if (typeof equippedArmorId !== 'undefined' && ARMOR_DATA[equippedArmorId]) {
                // Ember Armor (red) scales resist with level, others use static value
                if (equippedArmorId === 'red') {
                    const resistBonus = Math.floor((playerOwnedArmor['red'] || 1) / 2); // 1->0, 2->1, 3->1
                    totalFireResistance += resistBonus;
                } else {
                    totalFireResistance += ARMOR_DATA[equippedArmorId].resistances?.fire || 0;
                }
            }
            if (typeof equippedFlameRing !== 'undefined' && equippedFlameRing) {
                totalFireResistance += 1;
            }
        }

        const targetImmuneFireExp = targetUnit.immuneToFire || (targetUnit.team === 'player' && typeof equippedArmorId !== 'undefined' && (ARMOR_DATA[equippedArmorId]?.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE && (playerOwnedArmor[equippedArmorId] || 0) >= ARMOR_RESISTANCE_UPGRADE_LEVEL);

        if (targetImmuneFireExp && currentLevel >= IMMUNITY_LEVEL_START) {
            actualExplosionDamage = Math.max(1, Math.floor(actualExplosionDamage * 0.25));
        } else if (totalFireResistance > 0) {
            actualExplosionDamage = Math.max(1, Math.floor(actualExplosionDamage - totalFireResistance));
        }


        if (targetUnit.team === 'player' && forestArmorActiveTurns > 0) {


            const armorLevel = playerOwnedArmor[equippedArmorId] || 0;


            const damageReduction = armorLevel > 0 ? armorLevel : 1;


            actualExplosionDamage = Math.max(0, actualExplosionDamage - damageReduction);


        }





        // Friendly Fire Prevention: Only nullify damage if a PLAYER unit's explosion hits another PLAYER
        // Enemy explosions (sappers) should still damage players!
        if (targetUnit.team === 'player' && unit.team === 'player') {
            // Player-caused explosion hitting player = friendly fire, nullify
            actualExplosionDamage = 0;
        }

        if (actualExplosionDamage > 0) {
            if (targetUnit.team === 'player') {
                playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
            } else {
                playSfx('hit');
                if (targetUnit && targetUnit.type && targetUnit.type.includes('goblin') && targetUnit.hp > 0) {
                    playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2');
                }
            }
        }


        if (targetUnit.isInvulnerableForTurn) return; // Immune
        targetUnit.hp -= actualExplosionDamage;


        if (targetUnit.hp < 0) targetUnit.hp = 0;


        if (typeof showDamagePopup === 'function') showDamagePopup(targetUnit.x, targetUnit.y, actualExplosionDamage);


        if (typeof flashElementOnHit === 'function') flashElementOnHit(targetUnit.element);


        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetUnit);


        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetUnit);


        // Unstealth if rogue is hit by explosion


        if (targetUnit.type === 'rogue' && targetUnit.isStealthed) {


            targetUnit.isStealthed = false;


            if (typeof showFeedback === 'function') showFeedback(`${targetUnit.name} revealed!`, "feedback-error");


            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(targetUnit);


        }


        if (targetUnit.hp <= 0) deathPromises.push(removeUnit(targetUnit));


    });


    if (!isDeathExplosion) { unit.explodeOnDeath = false; deathPromises.push(removeUnit(unit)); }


    await Promise.all(deathPromises); checkWinLossConditions();


}





function removeObstacle(obstacle) {
    if (obstacle && obstacle.type === 'supply_crate' && currentLevelObjective === OBJECTIVE_TYPES.GATHER_SUPPLIES) {
        objectiveProgress.gathered = (objectiveProgress.gathered || 0) + 1;
        if (typeof showFeedback === 'function') showFeedback(`Supplies Gathered! (${objectiveProgress.gathered}/${OBJECTIVE_CONFIG[OBJECTIVE_TYPES.GATHER_SUPPLIES].totalSupplies})`, "feedback-levelup");
        if (typeof updateObjectiveDisplay === 'function') updateObjectiveDisplay();
    }

    return new Promise(resolve => {


        if (!obstacle) { resolve(); return; }


        const obsId = obstacle.id;


        const obsX = obstacle.x;


        const obsY = obstacle.y;


        const obsType = obstacle.type;

        // Special handling for cages - don't remove, replace with broken cage and rescue unit
        if (obsType.startsWith('cage_') && obsType !== 'cage_broken') {
            console.log('[DEBUG] Cage handler triggered for:', obsType, 'at', obsX, obsY);
            obstacle.element.remove(); // Remove old element
            gridState[obsY][obsX] = null;
            // Note: 'occupied' is not in scope here - grid state is the source of truth

            // Remove old obstacle from array FIRST
            const idx = obstacles.indexOf(obstacle);
            if (idx > -1) obstacles.splice(idx, 1);

            // Determine the unit type from cage type (e.g., 'cage_archer' -> 'archer')
            const unitType = obsType.replace('cage_', '');

            // Trigger rescue - this spawns the unit AND creates the broken cage
            if (typeof rescueUnit === 'function') {
                rescueUnit(unitType, obsX, obsY);
            }

            resolve();
            return;
        }

        obstacle.hp = 0;





        // Play destruction sounds


        if (obsType === 'barrel') playSfx('barrelBreak');


        else if (obsType === 'crate') playSfx('crateBreak');





        // Handle barrel and crate loot drops


        if ((obsType === 'barrel' || obsType === 'crate') && obstacle.dropsLoot) {


            // Check loot drop chance


            const dropChance = obsType === 'barrel' ? LOOT_DROP_CHANCE_BARREL : LOOT_DROP_CHANCE_CRATE;


            if (Math.random() <= dropChance) {


                const baseGold = obsType === 'barrel' ? BARREL_BASE_GOLD_AMOUNT : CRATE_BASE_GOLD_AMOUNT;


                const maxBonus = obsType === 'barrel' ? BARREL_MAX_BONUS_GOLD : CRATE_MAX_BONUS_GOLD;


                const levelBonusMult = 1 + (currentLevel - 1) / 25;
                const goldAmount = Math.floor((baseGold + Math.floor(Math.random() * (maxBonus + 1))) * levelBonusMult);


                const droppedItems = [];
                // Fall damage logic REMOVED as per user request

                // Drop gold (using conversion helper to avoid overcrowding)
                const goldItems = createLootItems(goldAmount, obsX, obsY);
                if (goldItems.length > 0) droppedItems.push(...goldItems);





                // Chance for potion


                if (Math.random() < POTION_DROP_CHANCE_BARREL) {


                    const item = createItem('health_potion', obsX, obsY, 0);


                    if (item) {


                        item.offsetX = (Math.random() - 0.5) * 0.6;


                        item.offsetY = (Math.random() - 0.5) * 0.6;


                        droppedItems.push(item);


                    }


                }





                // Chance for gem (Level 30+)
                if (currentLevel >= 30 && Math.random() < GEM_DROP_CHANCE_BARREL) {
                    const item = createItem('shiny_gem', obsX, obsY, 0);


                    if (item) {


                        item.offsetX = (Math.random() - 0.5) * 0.6;


                        item.offsetY = (Math.random() - 0.5) * 0.6;


                        droppedItems.push(item);


                    }


                }





                if (droppedItems.length > 0) {


                    if (typeof animateItemDrop === 'function') animateItemDrop(droppedItems, obsX, obsY);


                    else if (typeof renderAll === 'function') renderAll();





                    if (droppedItems.some(i => i?.type === 'gold')) playSfx('goldDrop');
                    if (droppedItems.some(i => i?.type === 'shiny_gem')) playSfx('gem');
                    if (droppedItems.some(i => i?.type === 'goblin_bow')) playSfx('bowDrop');
                    if (droppedItems.some(i => i?.type === 'goblin_club')) playSfx('clubDrop');
                    if (droppedItems.some(i => i?.type === 'sturdy_boots')) playSfx('bootsDrop');


                }





                playSfx('chestOpen');


            }


        }





        // Handle exploding barrel explosion


        if (obsType === 'exploding_barrel' && obstacle.explodes) {


            // Difficulty Scaling: +1 Damage per World Cycle (every 60 levels)


            // Levels 1-60: 0 bonus -> 2 dmg


            // Levels 61-120: 1 bonus -> 3 dmg


            const difficultyBonus = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);


            const baseExplosionDamage = EXPLODING_BARREL_DAMAGE; // 2


            const explosionDamage = baseExplosionDamage + difficultyBonus;


            const explosionRadius = obstacle.explosionRadius || EXPLODING_BARREL_RADIUS;





            playSfx('sapperExplode');





            // Damage all units in surrounding tiles


            const affectedUnits = getUnitsInArea(obsX, obsY, explosionRadius);


            affectedUnits.forEach(unit => {


                if (isUnitAliveAndValid(unit)) {


                    let actualBarrelDamage = explosionDamage;
                    const targetFireResistanceBar = unit.fireResistance || 0;
                    const targetImmuneFireBar = unit.immuneToFire || (unit.team === 'player' && typeof equippedArmorId !== 'undefined' && (ARMOR_DATA[equippedArmorId]?.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE && (playerOwnedArmor[equippedArmorId] || 0) >= ARMOR_RESISTANCE_UPGRADE_LEVEL);

                    if (targetImmuneFireBar && currentLevel >= IMMUNITY_LEVEL_START) {
                        actualBarrelDamage = Math.max(1, Math.floor(actualBarrelDamage * 0.25));
                    } else if (targetFireResistanceBar > 0) {
                        actualBarrelDamage = Math.max(1, Math.floor(actualBarrelDamage - targetFireResistanceBar));
                    }


                    // FIX: Units in towers should be protected from barrel explosions too
                    if (unit.inTower) return;

                    if (unit.team === 'player' && forestArmorActiveTurns > 0) {


                        const armorLevel = playerOwnedArmor[equippedArmorId] || 0;


                        const damageReduction = armorLevel > 0 ? armorLevel : 1;


                        actualBarrelDamage = Math.max(0, actualBarrelDamage - damageReduction);


                    }





                    unit.hp -= actualBarrelDamage;


                    if (unit.hp < 0) unit.hp = 0;





                    if (typeof showDamagePopup === 'function') {


                        showDamagePopup(unit.x, unit.y, actualBarrelDamage);


                    }


                    if (typeof flashElementOnHit === 'function') {


                        flashElementOnHit(unit.element);


                    }


                    if (typeof updateWorldHpBar === 'function') {


                        updateWorldHpBar(unit);


                    }


                    if (typeof updateUnitInfoDisplay === 'function') {


                        updateUnitInfoDisplay(unit);


                    }





                    // Remove unit if dead


                    if (unit.hp <= 0) {


                        removeUnit(unit);


                    }


                }


            });





            // Damage obstacles (barrels and crates) in explosion radius


            const affectedObstacles = [];


            for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {


                for (let dy = -explosionRadius; dy <= explosionRadius; dy++) {


                    const targetX = obsX + dx;


                    const targetY = obsY + dy;


                    if (isCellInBounds(targetX, targetY)) {


                        const targetObstacle = getObstacleAt(targetX, targetY);


                        if (targetObstacle && targetObstacle.id !== obsId &&


                            (targetObstacle.type === 'barrel' || targetObstacle.type === 'crate' ||


                                targetObstacle.type === 'exploding_barrel')) {


                            affectedObstacles.push(targetObstacle);


                        }


                    }


                }


            }





            // Apply damage to affected obstacles


            affectedObstacles.forEach(targetObs => {


                if (isObstacleIntact(targetObs)) {


                    targetObs.hp -= explosionDamage;


                    if (targetObs.hp <= 0) {


                        targetObs.hp = 0;


                        // This will trigger their own explosion/loot if applicable


                        removeObstacle(targetObs);


                    }


                }


            });





            // Visual explosion effect


            if (typeof createExplosionEffect === 'function') {


                createExplosionEffect(obsX, obsY, 'fireball');


            } else if (typeof showFeedback === 'function') {


                showFeedback('EXPLOSION!', 'feedback-error');


            }


        }





        if (gridState[obsY]?.[obsX]?.type === obsType) gridState[obsY][obsX] = null;


        if (obstacle.occupantUnitId) {


            const unitInside = units.find(u => u.id === obstacle.occupantUnitId);


            if (unitInside) {
                // Nuclear Option: Make them invulnerable for this turn so they take ZERO damage from the collapse/traps/etc.
                unitInside.isInvulnerableForTurn = true;

                leaveTower(unitInside);

                // We can keep the safety check just in case, but the invulnerability should handle it.
                if (unitInside.hp <= 0) {
                    unitInside.hp = 1;
                }
            }


            obstacle.occupantUnitId = null;


        }





        if (typeof handleObstacleDestroyAnimation === 'function') {


            handleObstacleDestroyAnimation(obstacle).then(() => {


                const index = obstacles.findIndex(o => o.id === obsId);


                if (index !== -1) obstacles.splice(index, 1);


                if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY);


                resolve();


            });


        } else {


            obstacle.element?.remove();


            const index = obstacles.findIndex(o => o.id === obsId);


            if (index !== -1) obstacles.splice(index, 1);


            if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY);


            resolve();


        }


    });


}





async function removeUnit(unit) {


    if (!unit || unit.isRemoving) return;
    unit.isRemoving = true;

    // CRITICAL: Remove from array immediately to prevent "zombie" logic interference
    // This MUST happen before animations or delays to ensure game state is consistent
    const unitIndex = units.findIndex(u => u.id === unit.id);
    if (unitIndex !== -1) {
        units.splice(unitIndex, 1);
        recalculateAllUnitsStats();
    }

    if (unit.type === 'orc_juggernaut') {
        playSfx('orc_die');
    } else if (unit.team === 'enemy') {
        if (unit.type === 'goblin_mother') {
            playSfx('mother_die');
        } else if (unit.isTotem) {
            playSfx('totem');
        } else if (unit.useSpritesheet === 'skeleton') {
            playSfx('skeleton_die');
        } else {
            playSfx('goblinDie');
        }
    } else if (unit.team === 'player') {
        playSfx('playerDie');
    }


    // Make stealthed units visible when dying


    if (unit.isStealthed) {


        unit.isStealthed = false;


        // CRITICAL: Remove ALL stealth-related classes - there are TWO separate ones
        unit.element.classList.remove('stealth');
        unit.element.classList.remove('stealth-invisible');
        unit.element.classList.remove('stealth-fading-in');


        unit.element.style.opacity = '1';

        // Set isRemoving FIRST so updateUnitVisuals/updateUnitVisualState will bail out
        // This prevents the game loop from clearing our forced opacity/visibility
        unit.isRemoving = true;

        if (typeof updateUnitVisuals === 'function') updateUnitVisuals(unit);
        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);

        // Force opacity and filter aggressively to override ANY other styles/classes
        // This runs BEFORE the delay, ensuring the unit is visible as a corpse
        if (unit.element) {
            // DISABLE TRANSITIONS to ensure instant visibility
            unit.element.style.setProperty('transition', 'none', 'important');
            unit.element.style.setProperty('opacity', '1', 'important');
            // Do NOT force filter: none, or we lose Elite/Color variants. 
            // updateUnitVisuals called above should have set the correct non-stealth filter.
            unit.element.style.setProperty('visibility', 'visible', 'important');
            unit.element.style.setProperty('display', 'block', 'important');
            // Remove stealth classes AGAIN in case something re-added them
            unit.element.classList.remove('stealth', 'stealth-invisible', 'stealth-fading-in');
        }
        // FORCE WAIT to ensure the unstealth is seen before removal
        await new Promise(resolve => setTimeout(resolve, 600));
    }

    const unitId = unit.id;

    const unitTeam = unit.team;

    const unitType = unit.type;

    const finalX = unit.x;

    const finalY = unit.y;

    // Immediate stat recalculation when a unit (potentially a totem) starts dying
    recalculateAllUnitsStats();

    const wasSelected = selectedUnit?.id === unitId;





    // Deselect immediately if this unit was selected


    if (wasSelected && typeof deselectUnit === 'function') {


        deselectUnit(false);


    }





    // Fix: Disable explosion if polymorphed


    const shouldExplodeOnDeath = (unit.explodeOnDeath && !unit.isPolymorphed) || false;


    const isTreasureGoblin = unit.isTreasureHunter || false;


    const isBoss = unit.isBoss || false;


    const dropsArmorFlag = unit.dropsArmor || false;


    const dropsWarBowFlag = unit.dropsWarBow || false;


    const dropsFlameCloakFlag = unit.dropsFlameCloak || false;


    const dropsFlameRingFlag = unit.dropsFlameRing || false;


    const dropsGoblinMotherSkullFlag = unit.dropsGoblinMotherSkull || false;
    const dropsGlacierBowFlag = unit.dropsGlacierBow || false;
    const dropsRoyalCrownFlag = unit.dropsRoyalCrown || false;
    const dropsCursedCleaverFlag = unit.dropsCursedCleaver || false;





    // Debug V'tharak death


    if (unitType === 'vtharak') {


        console.log('V\'tharak dying!', {


            isBoss,


            dropsArmorFlag,


            dropsWarBowFlag,


            isTreasureGoblin,


            unitTeam


        });


    }





    unit.hp = 0;

    if (unit.type === 'krizak') {
        if (typeof pendingFrostNovas !== 'undefined') {
            pendingFrostNovas = pendingFrostNovas.filter(p => p.summonerId !== unit.id);
        }
        if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings();
        if (typeof showPendingFrostNovaWarnings === 'function') showPendingFrostNovaWarnings();
    }

    // Cancel pending Flame Waves if the caster dies
    if (unit.canCastFlameWave || unit.type === 'pyromancer' || unit.type === 'zulkash') {
        if (typeof pendingFlameWaves !== 'undefined') {
            pendingFlameWaves = pendingFlameWaves.filter(p => p.summonerId !== unit.id);
        }
        if (typeof clearPendingFlameWaveWarnings === 'function') clearPendingFlameWaveWarnings();
        if (typeof showPendingFlameWaveWarnings === 'function') showPendingFlameWaveWarnings();
    }


    if (unit.inTower) leaveTower(unit);





    if (unitTeam === 'enemy') {


        enemiesKilledThisLevel++;
        lifetimeKills++;


        checkAchievements('kill', { type: unitType, isBoss: isBoss, world: currentTerrainInfo.name });


        checkAchievements('kill_multiple', {


            targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"],


            count: 1


        });

        if (currentLevelObjective === OBJECTIVE_TYPES.INTIMIDATION) {
            objectiveProgress.killsThisTurn = (objectiveProgress.killsThisTurn || 0) + 1;
            const reqKills = (OBJECTIVE_CONFIG[OBJECTIVE_TYPES.INTIMIDATION] && OBJECTIVE_CONFIG[OBJECTIVE_TYPES.INTIMIDATION].killsRequired) || 3;
            if (objectiveProgress.killsThisTurn >= reqKills && !objectiveProgress.retreatTriggered) {
                objectiveProgress.retreatTriggered = true;
                if (typeof showFeedback === 'function') showFeedback("Enemies are fleeing!", "feedback-important");
                if (typeof updateObjectiveDisplay === 'function') updateObjectiveDisplay();
            }
        }

    } else if (unitTeam === 'player') {
        unitsLostThisLevel++;
        lifetimeLosses++;
        if (gameMode === 'hardcore') {
            // Permanent death: decrement owned units
            if (playerOwnedUnits[unitType] > 0) {
                playerOwnedUnits[unitType]--;
                // Also update active roster if it was tracking counts
                if (playerActiveRoster[unitType] > 0) {
                    playerActiveRoster[unitType]--;
                }
                saveGameData();
                if (typeof updateStatsUI === 'function') updateStatsUI();
                if (typeof showFeedback === 'function') showFeedback(`${unitType.charAt(0).toUpperCase() + unitType.slice(1)} lost forever!`, "feedback-bad");
            }
        }
    }





    let itemsToDrop = [];


    let goldFromDrops = 0;





    if (unitTeam === 'enemy' && !unit.isTotem) {

        if (isBoss && dropsArmorFlag && currentLevelObjective !== OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) {

            const worldInfo = getTilesetForLevel(currentLevel);

            const armorId = WORLD_ARMOR_MAP[worldInfo.name] || 'grey';

            const cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);

            const armorLevel = Math.min(cycle + 1, 99);

            const currentArmorLevel = playerOwnedArmor[armorId] || 0;

            if (armorId && ARMOR_DATA[armorId] && currentArmorLevel < armorLevel) {

                const item = createItem('armor', finalX, finalY, 0);

                if (item) {

                    item.armorId = armorId;

                    item.armorLevel = armorLevel;

                    itemsToDrop.push(item);

                }

            }

        }

        // Calculate spawn coordinates early (especially for aerial units over obstacles)
        let spawnX = finalX;
        let spawnY = finalY;
        if (unit.isAerial) {
            const obs = getObstacleAt(finalX, finalY);
            if (obs && obs.blocksMove) {
                const adj = getAdjacentCells(finalX, finalY, false).filter(c => {
                    const o = getObstacleAt(c.x, c.y);
                    const u = getUnitAt(c.x, c.y);
                    return (!o || !o.blocksMove) && !u;
                });
                if (adj.length > 0) {
                    spawnX = adj[0].x;
                    spawnY = adj[0].y;
                }
            }
        }
        const useX = spawnX;
        const useY = spawnY;

        const isElite = unit.isElite;
        const isRare = RARE_ENEMY_TYPES.includes(unitType);

        if (currentLevelObjective !== OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) {
            // Handle Legendary Drops (Independent of standard World Boss armor)
            if (dropsWarBowFlag) {
                if (!playerAbilityUpgrades.war_bow || playerAbilityUpgrades.war_bow === 0) {
                    const item = createItem('war_bow', useX, useY, 0);
                    if (item) itemsToDrop.push(item);
                }
            }

            if (dropsFlameCloakFlag) {
                if (!playerOwnedArmor.flame_cloak) {
                    const item = createItem('flame_cloak', useX, useY, 0);
                    if (item) itemsToDrop.push(item);
                }
            }

            // Primordial Shard (Secret Portal Bosses - Skeleton King)
            if (isBoss && (isSkeletonWorldActive || unitType === 'skeleton_king')) {
                const shard = createItem('upgrade_shard', finalX, finalY, itemsToDrop.length);
                if (shard) itemsToDrop.push(shard);
            }

            if (dropsFlameRingFlag) {
                if (!playerAbilityUpgrades.flame_ring || playerAbilityUpgrades.flame_ring === 0) {
                    const item = createItem('flame_ring', useX, useY, 0);
                    if (item) itemsToDrop.push(item);
                }
            }

            if (dropsGlacierBowFlag) {
                if (!playerAbilityUpgrades.glacier_bow || playerAbilityUpgrades.glacier_bow === 0) {
                    const item = createItem('glacier_bow', useX, useY, 0);
                    if (item) itemsToDrop.push(item);
                }
            }

            // New Item Drops for common goblins
            if (unitType === 'goblin_archer' && Math.random() < 0.05) {
                const item = createItem('goblin_bow', finalX, finalY, itemsToDrop.length);
                if (item) itemsToDrop.push(item);
            } else if (unitType === 'goblin_club' && Math.random() < 0.05) {
                const item = createItem('goblin_club', finalX, finalY, itemsToDrop.length);
                if (item) itemsToDrop.push(item);
            }

            if (dropsGoblinMotherSkullFlag) {
                const skullLevelCalculated = Math.max(1, Math.floor((currentLevel - 1) / 60));
                const currentOwnedSkullLevel = playerOwnedArmor.goblin_mother_skull || 0;
                if (currentOwnedSkullLevel < skullLevelCalculated) {
                    const item = createItem('helmet', finalX, finalY, 0);
                    if (item) {
                        item.armorId = 'goblin_mother_skull';
                        const skullLevel = Math.max(1, Math.floor((currentLevel - 1) / 60));
                        item.armorLevel = Math.min(skullLevel, 99);
                        itemsToDrop.push(item);
                    }
                }
            }

            if (dropsRoyalCrownFlag) {
                const item = createItem('royal_jeweled_crown', finalX, finalY, itemsToDrop.length);
                if (item) itemsToDrop.push(item);
            }

            if (dropsCursedCleaverFlag && Math.random() < 0.05) {
                const item = createItem('cursed_cleaver', useX, useY, itemsToDrop.length);
                if (item) itemsToDrop.push(item);
            }

            // --- Tiered Loot Drops (Purses, Bars, Crowns) ---
            const alreadyDroppedSpecial = itemsToDrop.length > 0;

            // 1. Boss Crown Chance (Adjacent Tile)
            if (isBoss && currentLevel >= 60 && Math.random() < ROYAL_CROWN_DROP_CHANCE_BOSS) {
                const adjacentCells = getAdjacentCells(finalX, finalY, true).sort(() => 0.5 - Math.random());
                const crownCell = adjacentCells.find(cell => !getItemAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y));
                if (crownCell) {
                    const crown = createItem('royal_jeweled_crown', crownCell.x, crownCell.y, 0);
                    if (crown) {
                        // Boss crown is separate from standard tile drops
                        items.push(crown);
                        if (typeof animateItemDrop === 'function') animateItemDrop([crown], crownCell.x, crownCell.y);
                    }
                }
            }

            // 2. Rare Gold Bar (Guaranteed if no other special item)
            if (isRare && currentLevel >= 40) {
                const barChance = alreadyDroppedSpecial ? GOLD_BAR_DROP_CHANCE_RARE : 1.0;
                if (Math.random() < barChance) {
                    const bar = createItem('gold_bar', useX, useY, itemsToDrop.length);
                    if (bar) itemsToDrop.push(bar);
                }
            }
        }

        // 3. Mob Coin Purse Chance
        const purseChance = isElite ? COIN_PURSE_DROP_CHANCE_ELITE : COIN_PURSE_DROP_CHANCE_MOB;
        if (!isRare && !isBoss && currentLevel >= 25 && Math.random() < purseChance) {
            const purse = createItem('coin_purse', useX, useY, itemsToDrop.length);
            if (purse) itemsToDrop.push(purse);
        }

        if (isTreasureGoblin) {


            itemsToDrop.push(createItem('gold_magnet', finalX, finalY, 0));


            const adjacentCells = getAdjacentCells(finalX, finalY, true).sort(() => 0.5 - Math.random());


            adjacentCells.forEach((cell) => {


                if (!getObstacleAt(cell.x, cell.y)) {


                    const goldPerTile = Math.floor(Math.random() * 4) + 3;


                    for (let g = 0; g < goldPerTile; g++) {


                        itemsToDrop.push(createItem('gold', cell.x, cell.y, 0));


                        goldFromDrops += 1;


                    }


                }


            });


            const gemDropCell = adjacentCells.find(cell => !getItemAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y) && !(cell.x === finalX && cell.y === finalY));


            if (currentLevel >= 30 && gemDropCell) itemsToDrop.push(createItem('shiny_gem', gemDropCell.x, gemDropCell.y, 0));


        }
        else {

            if (currentLevel >= 120 && unlockedUnits.wizard && Math.random() < 0.003) {
                const item = createItem('tome_of_chain_lightning', useX, useY, itemsToDrop.length);
                if (item) itemsToDrop.push(item);
            }
            if (unitType === 'goblin_netter' && Math.random() < 0.2) {
                const item = createItem('net', useX, useY, itemsToDrop.length);
                if (item) itemsToDrop.push(item);
            }

            if (currentLevel >= 30 && (!playerAbilityUpgrades || !playerAbilityUpgrades.sturdy_boots) && Math.random() < STURDY_BOOTS_DROP_CHANCE) {
                const item = createItem('sturdy_boots', useX, useY, itemsToDrop.length);
                if (item) {
                    itemsToDrop.push(item);
                    // Auto-equip if nothing else is equipped
                    if (typeof equippedBootsId !== 'undefined' && equippedBootsId === 'none') {
                        equippedBootsId = 'sturdy_boots';
                    }
                }
            }

            if (playerAbilityUpgrades.sturdy_boots && !playerAbilityUpgrades.chain_boots && unitType.includes('goblin') && Math.random() < CHAIN_BOOTS_DROP_CHANCE) {
                const item = createItem('chain_boots', useX, useY, itemsToDrop.length);
                if (item) {
                    itemsToDrop.push(item);
                    // Auto-equip Chain Boots if only Sturdy Boots or none were equipped
                    if (typeof equippedBootsId !== 'undefined' && (equippedBootsId === 'none' || equippedBootsId === 'sturdy_boots')) {
                        equippedBootsId = 'chain_boots';
                    }
                }
            }

            if (unitType === 'goblin' && Math.random() < OLD_WORN_PAN_DROP_CHANCE) {
                const item = createItem('old_worn_pan', useX, useY, itemsToDrop.length);
                if (item) {
                    itemsToDrop.push(item);
                    playSfx('block');
                }
            }
            if (Math.random() < GOLD_DROP_CHANCE) {
                let goldAmountToDrop = BASE_GOLD_DROP_AMOUNT;
                if (ADVANCED_ENEMY_TYPES.includes(unitType) && Math.random() < ADVANCED_GOBLIN_EXTRA_GOLD_CHANCE) {
                    goldAmountToDrop += ADVANCED_GOBLIN_EXTRA_GOLD_AMOUNT;
                }

                // If gold value is extremely high, convert to higher tier items
                if (goldAmountToDrop >= COIN_PURSE_CONVERSION_THRESHOLD) {
                    const convertedItems = createLootItems(goldAmountToDrop, useX, useY);
                    itemsToDrop.push(...convertedItems);
                    goldFromDrops += goldAmountToDrop; // Track total value
                } else {
                    // Standard small drops
                    for (let i = 0; i < goldAmountToDrop; i++) {
                        itemsToDrop.push(createItem('gold', useX, useY, itemsToDrop.length));
                        goldFromDrops += 1;
                    }
                }
            }


            const potionDropChance = POTION_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE));


            if (Math.random() < potionDropChance) {


                itemsToDrop.push(createItem('health_potion', useX, useY, itemsToDrop.length));


            }


            const gemDropChance = currentLevel >= 30 ? GEM_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE)) : 0;
            if (gemDropChance > 0 && Math.random() < gemDropChance) {
                itemsToDrop.push(createItem('shiny_gem', useX, useY, itemsToDrop.length));
            }


            if (SPELLBOOK_REQUIRED_SPELL_USE && spellsUsedThisLevel && Math.random() < SPELLBOOK_DROP_CHANCE_ENEMY) {


                itemsToDrop.push(createItem('spellbook', useX, useY, itemsToDrop.length));


            }


        }





        if (itemsToDrop.length > 0) {
            items.push(...itemsToDrop);


            if (goldFromDrops > 0) playSfx('goldDrop');


            if (itemsToDrop.some(i => i?.type === 'shiny_gem')) playSfx('gem');
            if (itemsToDrop.some(i => i?.type === 'health_potion')) playSfx('potionDrop');
            if (itemsToDrop.some(i => i?.type === 'goblin_bow')) playSfx('bowDrop');
            if (itemsToDrop.some(i => i?.type === 'goblin_club')) playSfx('clubDrop');
            if (itemsToDrop.some(i => i?.type === 'sturdy_boots' || i?.type === 'chain_boots')) playSfx('bootsDrop');


            itemsToDrop = itemsToDrop.filter(Boolean);


            if (typeof animateItemDrop === 'function' && itemsToDrop.length > 0) {


                await animateItemDrop(itemsToDrop, finalX, finalY);


            } else if (typeof renderAll === 'function') {


                renderAll();


            }


        }
    }

    let explosionPromise = shouldExplodeOnDeath ? explodeUnit(unit, true) : Promise.resolve();

    if (wasSelected && typeof deselectUnit === 'function') deselectUnit(false);

    if (typeof updateUnitInfoOnDeath === 'function') updateUnitInfoOnDeath(unitId);


    if (typeof handleUnitDeathAnimation === 'function') {
        handleUnitDeathAnimation(unit, finalX, finalY, deathSpriteTimeouts);
    } else {
        unit.element?.remove();
    }


    await explosionPromise;

    checkWinLossConditions();
}





function getSpellEffectValue(spellName, baseValue, getNextLevelValue = false) { let upgradeLevel = playerSpellUpgrades[spellName] || 0; if (getNextLevelValue) upgradeLevel++; const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return baseValue; const cheatBonus = (config.stat === 'damage' && playerCheatSpellAttackBonus > 0) ? playerCheatSpellAttackBonus : 0; const effectIncrease = config.effectIncrease ?? 0; let calculationLevel = getNextLevelValue ? Math.min(upgradeLevel, config.maxLevel + 1) : Math.min(upgradeLevel, config.maxLevel); calculationLevel = upgradeLevel > config.maxLevel ? config.maxLevel : upgradeLevel; if (spellName === 'frostNova' && config.stat === 'radiusLevel') return Math.min(FROST_NOVA_BASE_RADIUS_LEVEL + calculationLevel, config.maxLevel); return baseValue + (calculationLevel * effectIncrease) + cheatBonus; }


function getFrostNovaRadiusLevel(getNextLevelValue = false) { let upgradeLevel = playerSpellUpgrades['frostNova'] || 0; if (getNextLevelValue) upgradeLevel++; const config = SPELL_UPGRADE_CONFIG['frostNova']; const maxUpgradeLevel = config?.maxLevel ?? 5; upgradeLevel = Math.min(upgradeLevel, maxUpgradeLevel); return Math.min(FROST_NOVA_BASE_RADIUS_LEVEL + upgradeLevel, 5); }





async function castSpell(spellName, target, originElement = null) {


    const isUnitSpell = spellName === 'chainLightning' || spellName === 'polymorph' || spellName === 'net';





    // Allow casting if level is cleared, cheat is on, AND it's a valid spell for this phase (fireball)


    const canCastOverride = levelClearedAwaitingInput && unlimitedSpellsCheat;





    if (!isUnitSpell && !canCastOverride && ((!spellUses[spellName] && !unlimitedSpellsCheat) || currentTurn !== 'player')) {


        playSfx('error'); if (typeof showFeedback === 'function') showFeedback("Cannot cast spell now.", "feedback-error"); return false;


    }


    if (!isUnitSpell && !unlimitedSpellsCheat && !canCastOverride) spellUses[spellName] = false;


    if (!isUnitSpell) spellsUsedThisLevel = true;


    if (typeof setActiveSpell === 'function') setActiveSpell(null);


    if (typeof updateSpellUI === 'function') updateSpellUI();





    let success = false; let deathPromises = [];


    try {


        switch (spellName) {


            case 'chainLightning':


                if (selectedUnit && selectedUnit.type === 'wizard') {


                    success = await castChainLightning(selectedUnit, target);


                }


                break;


            case 'polymorph':


                if (selectedUnit && selectedUnit.type === 'wizard') {


                    success = castPolymorph(selectedUnit, target);


                }


                break;


            case 'net':
                if (!selectedUnit || !selectedUnit.nets || selectedUnit.nets <= 0) {
                    playSfx('error');
                    if (typeof showFeedback === 'function') showFeedback("No nets remaining!", "feedback-error");
                    success = false;
                    break;
                }
                const netTarget = (target?.team === 'enemy' && isUnitAliveAndValid(target)) ? target : null;
                if (!netTarget) {
                    playSfx('error');
                    if (typeof showFeedback === 'function') showFeedback("Select an enemy to Net!", "feedback-error");
                    success = false;
                    break;
                }
                selectedUnit.nets--;
                success = true;
                if (typeof animateAttack === 'function') {
                    // Use animateAttack for the net projectile
                    const origin = originElement ? { element: originElement, x: 0, y: 0 } : (selectedUnit || { x: 0, y: 0 });
                    await animateAttack(origin, netTarget, true, 'net');
                }
                playSfx('net_hit');
                netTarget.isNetted = true;
                netTarget.nettedTurnsLeft = 3;
                if (typeof showFeedback === 'function') showFeedback(`${netTarget.name} Netted!`, "feedback-neutral");
                if (typeof updateUnitInfo === 'function') updateUnitInfo(netTarget);
                if (typeof updateAllUnitVisuals === 'function') updateAllUnitVisuals();
                break;

            case 'fireball':


                let fbTargetObject = null; let targetPos = null;


                if (target?.team === 'enemy' && isUnitAliveAndValid(target)) { fbTargetObject = target; targetPos = { x: target.x, y: target.y }; }


                else if (target && !target.team && target.canBeAttacked === true && isObstacleIntact(target)) { fbTargetObject = target; targetPos = { x: target.x, y: target.y }; }





                // Fireball Tower Logic


                if (fbTargetObject) {


                    // If targeting unit in tower, redirect to tower


                    if (fbTargetObject.team && fbTargetObject.inTower) {


                        const tower = obstacles.find(o => o.id === fbTargetObject.inTower);


                        if (tower && isObstacleIntact(tower)) { fbTargetObject = tower; }


                    }


                    // If targeting empty tower, fail


                    if (fbTargetObject.enterable && !fbTargetObject.occupantUnitId) {


                        playSfx('error'); showFeedback("Tower is empty!", "feedback-error"); success = false; break;


                    }


                }





                if (fbTargetObject && originElement && targetPos) {

                    playSfx('fireballShoot');
                    if (typeof animateFireball === 'function') {
                        animateFireball(originElement, targetPos.x, targetPos.y, false);
                    }


                    await new Promise(resolve => setTimeout(resolve, FIREBALL_PROJECTILE_DURATION_MS));


                    playSfx('fireballHit');
                    if (typeof createExplosionEffect === 'function') {
                        createExplosionEffect(targetPos.x, targetPos.y, 'fireball');
                    }


                    const stillTarget = fbTargetObject.team ? units.find(u => u.id === fbTargetObject.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === fbTargetObject.id && isObstacleIntact(o));


                    if (stillTarget) {

                        // Thaw Mechanic: Fireball thaws frozen units.
                        if (stillTarget.isFrozen) {
                            stillTarget.isFrozen = false;
                            stillTarget.frozenTurnsLeft = 0;
                            if (typeof showFeedback === 'function') showFeedback(`${stillTarget.name} thawed!`, "feedback-success");
                        }


                        let actualDamage = getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE);

                        // Fire Damage: Check fire resistance/immunity
                        const targetFireResistance = stillTarget.fireResistance || 0;
                        if (stillTarget.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) {
                            actualDamage = Math.max(1, Math.floor(actualDamage * 0.25));
                        } else if (targetFireResistance > 0) {
                            actualDamage = Math.max(1, Math.floor(actualDamage - targetFireResistance));
                        }





                        if (stillTarget.team === 'player' && forestArmorActiveTurns > 0) {
                            const armorLevel = playerOwnedArmor[equippedArmorId] || 0;
                            const damageReduction = armorLevel > 0 ? armorLevel : 1;
                            actualDamage = Math.max(0, actualDamage - damageReduction);
                        }






                        actualDamage = Math.max(0, actualDamage);


                        actualDamage = Math.max(0, actualDamage);

                        // Strict Player Immunity: Player spells do NOT damage player units
                        if (stillTarget.team === 'player') {
                            actualDamage = 0;
                        }

                        stillTarget.hp -= actualDamage; let tookDamage = true;

                        // Aggressive Play: Reset damage window for player spells
                        if (stillTarget.team === 'enemy') {
                            window.turnsSinceLastDamage = 0;
                        }


                        // Play hit sound on unit


                        if (stillTarget.team === 'enemy') playSfx('fireballHit');


                        if (tookDamage) {


                            if (stillTarget.hp < 0) stillTarget.hp = 0;


                            if (typeof showDamagePopup === 'function') showDamagePopup(targetPos.x, targetPos.y, actualDamage);


                            if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element);


                            if (stillTarget.team && typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget);


                            if (stillTarget.hp <= 0) deathPromises.push(stillTarget.team ? removeUnit(stillTarget) : removeObstacle(stillTarget));


                            else if (stillTarget.team && typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(stillTarget);





                            // Unstealth ANY unit if hit by Fireball
                            if (stillTarget.isStealthed) {
                                stillTarget.isStealthed = false;
                                if (typeof showFeedback === 'function') showFeedback(`${stillTarget.name} revealed!`, "feedback-error");
                                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(stillTarget);
                            }


                        }


                    }


                    success = true;





                    // Flame Ring bonus: 3x3 AoE splash damage


                    if (equippedFlameRing) {


                        const splashRadius = 1; // 3x3 area


                        const splashDamage = Math.max(1, Math.floor(getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE) / 2));


                        for (let dx = -splashRadius; dx <= splashRadius; dx++) {


                            for (let dy = -splashRadius; dy <= splashRadius; dy++) {


                                if (dx === 0 && dy === 0) continue; // Skip center


                                const splashX = targetPos.x + dx;


                                const splashY = targetPos.y + dy;


                                if (!isCellInBounds(splashX, splashY)) continue;





                                // Damage unit at splash location


                                const splashUnit = getUnitAt(splashX, splashY);


                                if (splashUnit && isUnitAliveAndValid(splashUnit) && splashUnit.team === 'enemy') {


                                    if (splashUnit.inTower) continue; // Tower protects


                                    let actualSplashDamage = splashDamage;
                                    const splashTargetFireResistance = splashUnit.fireResistance || 0;
                                    if (splashUnit.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) {
                                        actualSplashDamage = Math.max(1, Math.floor(actualSplashDamage * 0.25));
                                    } else if (splashTargetFireResistance > 0) {
                                        actualSplashDamage = Math.max(1, Math.floor(actualSplashDamage - splashTargetFireResistance));
                                    }

                                    if (!splashUnit.isInvulnerableForTurn) {
                                        splashUnit.hp -= actualSplashDamage;
                                    }


                                    if (splashUnit.hp < 0) splashUnit.hp = 0;


                                    if (typeof showDamagePopup === 'function') showDamagePopup(splashX, splashY, splashDamage);


                                    if (typeof flashElementOnHit === 'function') flashElementOnHit(splashUnit.element);


                                    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(splashUnit);


                                    if (splashUnit.hp <= 0) deathPromises.push(removeUnit(splashUnit));


                                }





                                // Damage obstacles at splash location


                                const splashObs = getObstacleAt(splashX, splashY);


                                if (splashObs && splashObs.canBeAttacked && isObstacleIntact(splashObs)) {


                                    if (!(splashObs.enterable && !splashObs.occupantUnitId)) { // Don't damage empty towers


                                        splashObs.hp -= splashDamage;


                                        if (splashObs.hp <= 0) {


                                            splashObs.hp = 0;


                                            deathPromises.push(removeObstacle(splashObs));


                                        }


                                    }


                                }


                            }


                        }


                    }


                } else { playSfx('error'); showFeedback("Invalid Fireball target.", "feedback-error"); success = false; }


                break;


            case 'flameWave':


                const targetRowFW = target.y;


                if (!isCellInBounds(0, targetRowFW)) { playSfx('error'); success = false; break; }


                const actualDamageFW = getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE);


                playSfx('flameWaveCast');


                if (typeof animateFlameWave === 'function') animateFlameWave(targetRowFW, true);


                setTimeout(() => { applyFlameWaveDamage(targetRowFW, actualDamageFW, 'enemy'); }, FLAME_WAVE_STAGGER_DELAY_MS);





                // Flame Cloak bonus: Hit an additional row (toward enemy side, which is row 0)


                if (equippedFlameCloak) {


                    const bonusRow = targetRowFW - 1; // Row closer to enemies


                    if (isCellInBounds(0, bonusRow)) {


                        if (typeof animateFlameWave === 'function') animateFlameWave(bonusRow, true);


                        setTimeout(() => { applyFlameWaveDamage(bonusRow, actualDamageFW, 'enemy'); }, FLAME_WAVE_STAGGER_DELAY_MS + 100);


                    }


                }


                success = true;


                break;


            case 'frostNova':


                const centerX = target.x; const centerY = target.y; playSfx('frostNovaCast');


                const radiusLevelFN = getFrostNovaRadiusLevel();


                // Radius 1 for level 1 (3x3), Radius 2 for level 2 (5x5), etc.


                const radiusFN = radiusLevelFN;

                // At max level (5 upgrades), freeze duration increases to 4 turns
                const frostNovaUpgradeLevel = playerSpellUpgrades['frostNova'] || 0;
                const freezeDurationFN = frostNovaUpgradeLevel >= 5 ? 4 : FROST_NOVA_BASE_DURATION; let unitsFrozenCount = 0;


                if (typeof animateFrostNova === 'function') animateFrostNova(centerX, centerY, radiusLevelFN);


                await new Promise(r => setTimeout(r, 50));


                const affectedUnitsFN = getUnitsInArea(centerX, centerY, radiusFN);


                affectedUnitsFN.forEach(unit => {


                    if (unit.inTower) return; // Unit in tower is protected


                    if (unit?.team === 'enemy' && isUnitAliveAndValid(unit)) {

                        // Unstealth on Frost Nova hit (even if immune to freeze, they are hit by the blast)
                        if (unit.isStealthed) {
                            unit.isStealthed = false;
                            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                        }

                        if (!unit.isFrozen) {


                            if (unit.type === 'krizak' || (unit.immuneToFrost && currentLevel >= IMMUNITY_LEVEL_START)) {
                                // Kri'zak and frost-immune units take reduced duration (1 turn) instead of full immunity
                                unit.isFrozen = true; unit.frozenTurnsLeft = 1; unitsFrozenCount++;


                                if (typeof showFreezePopup === 'function') showFreezePopup(unit.x, unit.y);


                                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


                                if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
                            } else {


                                unit.isFrozen = true; unit.frozenTurnsLeft = freezeDurationFN; unitsFrozenCount++;


                                if (typeof showFreezePopup === 'function') showFreezePopup(unit.x, unit.y);


                                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


                                if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);


                            }


                        }


                    }
                });


                if (unitsFrozenCount > 0) {
                    playSfx('frostNovaHit');
                    if (typeof turnCCApplied !== 'undefined') {
                        turnCCApplied.add('freeze');
                        if (turnCCApplied.has('polymorph')) checkAchievements('crowd_control_combo');
                    }
                }
                success = true;


                break;


            case 'heal':


                if (target?.team === 'player' && isUnitAliveAndValid(target)) {


                    const actualHealAmount = getSpellEffectValue(spellName, HEAL_BASE_AMOUNT);


                    const healApplied = Math.min(actualHealAmount, target.maxHp - target.hp);


                    if (healApplied > 0) {


                        playSfx('potion'); target.hp += healApplied;


                        if (typeof showHealPopup === 'function') showHealPopup(target.x, target.y, healApplied);


                        if (typeof flashElementOnHit === 'function') flashElementOnHit(target.element);


                        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(target);


                        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(target);


                        success = true;


                    } else {


                        if (typeof showFeedback === 'function') showFeedback("Unit already full health.", "feedback-error"); playSfx('error');


                    }


                } else {


                    playSfx('error'); showFeedback("Invalid Heal target.", "feedback-error");


                }


                break;


        }


    } catch (e) { console.error(`Error casting spell ${spellName}:`, e); success = false; }


    finally {


        if (!success && !unlimitedSpellsCheat && spellName && !spellUses[spellName] && !isUnitSpell) {


            spellUses[spellName] = true; spellsUsedThisLevel = false;


            if (typeof updateSpellUI === 'function') updateSpellUI();


        }


        await Promise.all(deathPromises);


        checkWinLossConditions();


        if (typeof clearSpellHighlights === 'function') clearSpellHighlights();


    }


    checkAutoEndTurn();
    return success;
}





function processTurnStart(team) {


    units.slice().forEach(unit => {


        if (!isUnitAliveAndValid(unit)) return;

        // Clear temporary totem effects is NOT needed here as recalculateAllUnitsStats handles it dynamically
        // and setting hasBloodlust/isCursed to false here every turn was causing the glow to repeat.
        if (unit.hasTemporaryWeapon !== 'cursed_cleaver') {
            unit.temporaryAttackBonus = 0;
        }
        unit.temporaryAttackDebuff = 0;


        if (unit.team === team) {


            // Reset Forest Armor uses at start of player turn


            recalculateAllUnitsStats();

            if (team === 'player') {
                if (typeof turnCCApplied !== 'undefined') turnCCApplied.clear();


                if (forestArmorActiveTurns > 0) forestArmorActiveTurns--;

                // Handle Tile Fire Damage (Moved to processTurnEnd)


                // forestArmorUses = true; // Removed to limit to once per level


                if (typeof updateForestArmorButton === 'function') updateForestArmorButton();

                // Show Frost Nova warnings for player turn
                if (typeof showPendingFrostNovaWarnings === 'function') showPendingFrostNovaWarnings();





                // wizard Cooldowns


                if (unit.chainLightningCooldown > 0) unit.chainLightningCooldown--;


                if (unit.polymorphCooldown > 0) unit.polymorphCooldown--;
            }





            unit.actionsTakenThisTurn = 0;


            unit.actionsTakenTypes = [];


            unit.acted = false;


            if (unit.netCooldownTurnsLeft > 0) unit.netCooldownTurnsLeft--;



            if (unit.quickStrikeCooldown > 0) unit.quickStrikeCooldown--;

            // Track turns spent adjacent to enemies while stealthed
            if (unit.isStealthed) {
                const adjacentEnemies = units.filter(u => u.team !== unit.team && isUnitAliveAndValid(u) && getDistance(unit, u) <= 1);
                if (adjacentEnemies.length > 0) {
                    unit.stealthTurnsAdjacent = (unit.stealthTurnsAdjacent || 0) + 1;
                } else {
                    unit.stealthTurnsAdjacent = 0;
                }
            } else {
                unit.stealthTurnsAdjacent = 0;
            }

            if (unit.frostNovaCooldown > 0) unit.frostNovaCooldown--;
            if (unit.flameWaveCooldown > 0) unit.flameWaveCooldown--;


            // Polymorph Duration Logic (Check at start of unit's turn)


            if (unit.isPolymorphed) {


                if (unit.polymorphTurnsLeft > 0) {


                    unit.polymorphTurnsLeft--;


                    if (unit.polymorphTurnsLeft <= 0) {


                        revertPolymorph(unit);


                        // Fix: Unit takes no action on the turn it reverts


                        unit.acted = true;


                        if (typeof showFeedback === 'function') showFeedback(`${unit.name} reverts form!`, "feedback-turn");


                    }


                }


            }





            // Reset re-stealth prevention flag for enemy units


            if (team === 'enemy') {


                unit.unstealthedThisTurn = false;


            }





            // Bleed Effect


            if (unit.bleedTurnsLeft > 0) {


                unit.bleedTurnsLeft--;


                const bleedDamage = unit.bleedDamage || 1;


                unit.hp -= bleedDamage;
                if (unit.team === 'enemy') turnsSinceLastDamage = 0;


                if (typeof showDamagePopup === 'function') showDamagePopup(unit.x, unit.y, bleedDamage, 'bleed-popup'); // Need to ensure bleed-popup style exists or use generic


                if (typeof showFeedback === 'function') showFeedback(`${unit.name} takes bleed damage!`, "feedback-error");


                if (unit.hp < 0) unit.hp = 0;


                if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);


                if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);





                if (unit.hp <= 0) {


                    // Handle death by bleed


                    if (unit.team === 'enemy') {


                        enemiesKilledThisLevel++; checkAchievements('kill', { type: unit.type, isBoss: unit.isBoss, world: currentTerrainInfo.name });


                        removeUnit(unit);


                    } else {


                        unitsLostThisLevel++;
                        lifetimeLosses++;


                        removeUnit(unit);


                    }


                    return; // Unit died, stop processing


                }


            }





            // Shadowstalker AI: Stealth Logic


            if (unit.type === 'goblin_shadowstalker' && team === 'enemy' && !unit.isFrozen && !unit.isNetted && !unit.isPolymorphed) {


                if (!unit.isStealthed && !unit.unstealthedThisTurn) {


                    // Only re-stealth if no player units are within attack range


                    // This prevents stealthing then immediately attacking (breaking stealth)


                    const playersInRange = units.filter(u =>


                        u.team === 'player' &&


                        isUnitAliveAndValid(u) &&


                        getDistance(unit, u) <= unit.currentRange


                    );





                    // Stealth when there are no immediate targets (ambush setup)


                    if (playersInRange.length === 0) {


                        unit.isStealthed = true;


                        unit.mov = 3; // Reduce speed


                        unit.acted = true; // Stealthing takes the whole turn


                        playSfx('stealth');


                        if (typeof showFeedback === 'function') showFeedback(`${unit.name} fades...`, "feedback-turn");


                        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


                    }


                }


            }


            // Totem healing at start of turn


            // Totem healing at start of turn


            if (unit.isTotem && team === 'enemy' && !unit.isPolymorphed) {
                if (unit.totemCooldown <= 0) {

                    // -- HEALING TOTEM --
                    if (!unit.isBloodlustTotem && !unit.isCursedTotem) {
                        const alliesInRange = getUnitsInArea(unit.x, unit.y, SHAMAN_TOTEM_RANGE)
                            .filter(u => {
                                const distance = Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y);
                                return u.team === 'enemy' && !u.isTotem && u.hp < u.maxHp && isUnitAliveAndValid(u) && distance <= SHAMAN_TOTEM_RANGE && hasLineOfSight(unit, u);
                            });

                        if (alliesInRange.length > 0) {
                            alliesInRange.forEach(targetAlly => {
                                let healAmount = SHAMAN_TOTEM_HEAL;
                                if (typeof currentLevel !== 'undefined' && currentLevel > 60) {
                                    healAmount += Math.floor((currentLevel - 1) / 60);
                                }
                                const actualHeal = Math.min(healAmount, targetAlly.maxHp - targetAlly.hp);
                                if (actualHeal > 0) {
                                    targetAlly.hp += actualHeal;
                                    if (typeof showHealPopup === 'function') showHealPopup(targetAlly.x, targetAlly.y, actualHeal);
                                    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetAlly);
                                    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetAlly);
                                }
                            });
                            playSfx('heal');
                            if (typeof createTotemHealPulse === 'function') createTotemHealPulse(unit.x, unit.y, SHAMAN_TOTEM_RANGE);

                            // Visual glow on totem activation
                            const totemCell = getCellElement(unit.x, unit.y);
                            if (totemCell) {
                                totemCell.classList.remove('totem-glow-green');
                                void totemCell.offsetWidth; // Force reflow
                                totemCell.classList.add('totem-glow-green');
                                setTimeout(() => totemCell.classList.remove('totem-glow-green'), 1000);
                            }

                            unit.totemCooldown = SHAMAN_TOTEM_COOLDOWN;
                        }
                    }
                }
            }





            // Skeleton King Mind Control
            if (unit.canMindControl && unit.mindControlCooldown <= 0 && team === 'enemy' && !unit.isFrozen && !unit.isNetted && !unit.isPolymorphed) {
                const playerUnits = units.filter(u =>
                    u.team === 'player' &&
                    isUnitAliveAndValid(u) &&
                    !u.isTotem &&
                    hasLineOfSight(unit, u)
                );

                if (playerUnits.length > 1) { // Only if player has more than 1 unit
                    // Target nearest player unit with LOS
                    playerUnits.sort((a, b) => getDistance(unit.x, unit.y, a.x, a.y) - getDistance(unit.x, unit.y, b.x, b.y));
                    const target = playerUnits[0];

                    if (target) {
                        target.isMindControlled = true;
                        target.mindControlTurnsLeft = 3;
                        target.originalTeam = 'player';
                        target.team = 'enemy';
                        target.acted = true; // Can't act the same turn it's controlled

                        unit.mindControlCooldown = unit.mindControlCooldownDuration || 6;

                        if (typeof showFeedback === 'function') {
                            showFeedback(`${unit.name} mind-controls ${target.name}!`, "feedback-turn");
                        }
                        playSfx('powerup'); // Reusing powerup sound
                        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(target);
                    }
                }
            } else if (unit.canMindControl && unit.mindControlCooldown > 0 && team === 'enemy') {
                unit.mindControlCooldown--;
            }

            // Goblin Mother & Skeleton Summoning
            if ((unit.ability === 'spawnGoblins' || unit.ability === 'spawnSkeletons' || unit.ability === 'spawnSkeletonArmy') && team === 'enemy' && !unit.isFrozen && !unit.isNetted && !unit.isPolymorphed) {

                if (unit.spawnCooldown > 0) {
                    unit.spawnCooldown--;
                } else {
                    // Try to spawn
                    const adjacent = getAdjacentCells(unit.x, unit.y, true);
                    const validSpawns = adjacent.filter(pos =>
                        isCellInBounds(pos.x, pos.y) &&
                        !getUnitAt(pos.x, pos.y) &&
                        !getObstacleAt(pos.x, pos.y)
                    );

                    if (validSpawns.length > 0) {
                        // Calculate bonuses based on level
                        let cycle = 0;
                        if (currentLevel >= INFINITE_LEVEL_START) {
                            cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);
                        }
                        const infiniteHpBonus = cycle * INFINITE_HP_BONUS_PER_CYCLE;
                        const infiniteAtkBonus = cycle * INFINITE_ATK_BONUS_PER_CYCLE;

                        const worldInfo = getTilesetForLevel(currentLevel);
                        const variant = WORLD_THEME_MAP[worldInfo.name] || 'grey';

                        let count = 1;
                        let spawnType = 'goblin';

                        if (unit.ability === 'spawnGoblins') {
                            count = Math.random() < 0.5 ? 1 : 2;
                            spawnType = 'goblin';
                        } else if (unit.ability === 'spawnSkeletons') {
                            count = 1;
                            spawnType = 'skeleton';
                        } else if (unit.ability === 'spawnSkeletonArmy') {
                            count = Math.floor(Math.random() * 2) + 2; // 2-3
                            spawnType = 'skeleton';
                        }

                        let spawned = 0;
                        for (let i = 0; i < count && validSpawns.length > 0; i++) {
                            const idx = Math.floor(Math.random() * validSpawns.length);
                            const pos = validSpawns[idx];
                            validSpawns.splice(idx, 1);

                            const newUnit = createUnit(spawnType, pos.x, pos.y, variant, false, infiniteHpBonus, infiniteAtkBonus);
                            if (newUnit) {
                                newUnit.acted = true; // Summoned units don't act immediately
                                playSfx('summon');
                                if (typeof renderUnit === 'function') renderUnit(newUnit);
                                if (gameSettings.showHpBars && typeof createWorldHpBar === 'function') createWorldHpBar(newUnit);
                                spawned++;
                            }
                        }

                        if (spawned > 0) {
                            // Reset cooldown based on ability
                            unit.spawnCooldown = UNIT_DATA[unit.type].spawnCooldown || 3;
                            if (typeof showFeedback === 'function') {
                                showFeedback(`${unit.name} summons reinforcements!`, "feedback-turn");
                            }
                        }
                    }
                }
            }


        }


        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);


        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);


    });





    if (team === 'enemy') {


        // Execute pending Flame Waves from previous turn


        if (pendingFlameWaves.length > 0) {


            pendingFlameWaves.forEach(fw => {


                if (typeof animateFlameWave === 'function') animateFlameWave(fw.row, true);


                setTimeout(() => { applyFlameWaveDamage(fw.row, fw.damage, 'player'); }, FLAME_WAVE_STAGGER_DELAY_MS);


            });


            pendingFlameWaves = [];


            // Clear all warnings after Flame Waves execute


            if (typeof clearPendingFlameWaveWarnings === 'function') clearPendingFlameWaveWarnings();


        }


    }


}





function processTurnEnd(team) {
    // Decrement Tile Fire
    for (let y = 0; y < gridState.length; y++) {
        if (!gridState[y]) continue;
        for (let x = 0; x < gridState[y].length; x++) {
            if (gridState[y][x] && gridState[y][x].fireTurns > 0) {
                gridState[y][x].fireTurns--;
                if (typeof updateCellVisual === 'function') updateCellVisual(x, y);
            }
        }
    }


    units.slice().forEach(unit => {


        if (!isUnitAliveAndValid(unit)) return;


        if (unit.team === team) {


            let changed = false;


            if (unit.acted) { unit.acted = false; changed = true; }


            // Frost Nova execution removed from here - handled by performAIAction on enemy turn

            if (unit.isFrozen) {
                unit.frozenTurnsLeft--;
                if (unit.frozenTurnsLeft <= 0) { unit.isFrozen = false; changed = true; }
            }

            if (unit.isNetted) {
                unit.nettedTurnsLeft--;
                if (unit.nettedTurnsLeft <= 0) { unit.isNetted = false; changed = true; }
            }

            if (unit.isSlowed || unit.slowedTurnsLeft > 0) {
                unit.slowedTurnsLeft--;
                if (unit.slowedTurnsLeft <= 0) {
                    unit.isSlowed = false;
                    unit.slowedMovPenalty = 0;
                    changed = true;
                    recalculateAllUnitsStats();
                }
            }


            if (unit.quickStrikeActive) { unit.quickStrikeActive = false; changed = true; }
            if (unit.cleaveActive) { unit.cleaveActive = false; changed = true; }

            if (unit.isMindControlled && unit.team === team) {
                unit.mindControlTurnsLeft--;
                if (unit.mindControlTurnsLeft <= 0) {
                    unit.isMindControlled = false;
                    unit.team = unit.originalTeam || 'player';
                    changed = true;
                    if (typeof showFeedback === 'function') {
                        showFeedback(`${unit.name} is no longer mind-controlled!`, "feedback-turn");
                    }
                    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                }
            }





            if (team === 'enemy' && forestArmorActiveTurns > 0) {


                forestArmorActiveTurns--;


                if (forestArmorActiveTurns === 0 && typeof showFeedback === 'function') {


                    showFeedback("Forest Armor protection fades.", "feedback-turn");


                }


            }





            if (changed) {
                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
            }

            // Handle Tile Fire Damage at End of Turn
            if (gridState[unit.y] && gridState[unit.y][unit.x] && gridState[unit.y][unit.x].fireTurns > 0) {
                const fireAtk = gridState[unit.y][unit.x].fireAtk || 5; // Fallback to 5 if not set
                let fireDmg = Math.max(1, Math.floor(fireAtk * 0.1));

                if (unit.fireResistance) fireDmg = Math.max(0, fireDmg - unit.fireResistance);
                if (unit.immuneToFire) fireDmg = 0;

                if (fireDmg > 0) {
                    unit.hp -= fireDmg;
                    if (unit.hp < 0) unit.hp = 0;
                    if (typeof showDamagePopup === 'function') showDamagePopup(unit.x, unit.y, fireDmg, 'fire');
                    if (typeof flashElementOnHit === 'function') flashElementOnHit(unit.element);
                    if (unit.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
                    else { playSfx('hit'); if (unit && unit.type && unit.type.includes('goblin') && unit.hp > 0) playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2'); };
                    if (unit.hp <= 0) removeUnit(unit); // Simple remove at end of turn (no deathPromises here)
                }
            }
        }
    });


}





function applyFlameWaveDamage(targetRow, damage, targetTeam) {


    playSfx('fireballHit'); let deathPromises = [];


    for (let x = 0; x < currentGridCols; x++) {


        const fw_unit = getUnitAt(x, targetRow);


        const fw_obstacle = getObstacleAt(x, targetRow);





        // Damage obstacles regardless of team (player Flame Wave can hit barrels/crates)


        if (fw_obstacle && fw_obstacle.canBeAttacked && isObstacleIntact(fw_obstacle)) {


            // Empty towers are invulnerable


            if (!(fw_obstacle.enterable && !fw_obstacle.occupantUnitId)) {


                fw_obstacle.hp -= damage; if (fw_obstacle.hp < 0) fw_obstacle.hp = 0;


                if (typeof showDamagePopup === 'function') showDamagePopup(fw_obstacle.x, fw_obstacle.y, damage);


                if (typeof flashElementOnHit === 'function') flashElementOnHit(fw_obstacle.element);


                if (fw_obstacle.hp <= 0) deathPromises.push(removeObstacle(fw_obstacle));


            }


        }





        if (fw_unit && isUnitAliveAndValid(fw_unit)) {
            // Thaw Mechanic: Flame Wave thaws ANY frozen units hit
            if (fw_unit.isFrozen) {
                fw_unit.isFrozen = false;
                fw_unit.frozenTurnsLeft = 0;
                if (typeof showFeedback === 'function') showFeedback(`${fw_unit.name} thawed!`, "feedback-success");
                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(fw_unit);
            }

            if (fw_unit.team === targetTeam) {


                // Unit in tower is protected


                if (!fw_unit.inTower) {


                    const targetArmor = (fw_unit.team === 'player') ? ARMOR_DATA[equippedArmorId] : null;


                    const targetArmorLevel = targetArmor ? (playerOwnedArmor[equippedArmorId] || 0) : 0;


                    const isImmune = fw_unit.immuneToFire || (targetArmor && targetArmorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (targetArmor.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE);





                    let actualDamageFW = damage;
                    let totalFireResistanceFW = fw_unit.fireResistance || 0;
                    if (fw_unit.team === 'player' || (fw_unit.inTower && fw_unit.team === 'player')) { // Ensure we catch player units
                        if (typeof equippedArmorId !== 'undefined' && ARMOR_DATA[equippedArmorId]) {
                            if (equippedArmorId === 'red') totalFireResistanceFW += Math.floor((playerOwnedArmor['red'] || 1) / 2);
                            else totalFireResistanceFW += ARMOR_DATA[equippedArmorId].resistances?.fire || 0;
                        }
                        if (typeof equippedFlameRing !== 'undefined' && equippedFlameRing) totalFireResistanceFW += 1;
                    }

                    if (isImmune && currentLevel >= IMMUNITY_LEVEL_START) {
                        actualDamageFW = Math.max(1, Math.floor(actualDamageFW * 0.25));
                    } else if (totalFireResistanceFW > 0) {
                        actualDamageFW = Math.max(1, Math.floor(actualDamageFW - totalFireResistanceFW));
                    }





                    if (fw_unit.team === 'player' && forestArmorActiveTurns > 0) {


                        const armorLevel = playerOwnedArmor[equippedArmorId] || 0;


                        const damageReduction = armorLevel > 0 ? armorLevel : 1;


                        actualDamageFW = Math.max(0, actualDamageFW - damageReduction);


                    }





                    actualDamageFW = Math.max(0, actualDamageFW);

                    // Unstealth on damage
                    if (actualDamageFW > 0 && fw_unit.isStealthed) {
                        fw_unit.isStealthed = false;
                        if (typeof updateUnitVisuals === 'function') updateUnitVisuals(fw_unit);
                    }

                    // Only protect units with explicit invulnerability flag (e.g., just exited destroyed tower)
                    if (fw_unit.isInvulnerableForTurn) {
                        // Strict Immunity for this turn only
                    } else {
                        if (fw_unit.isPolymorphed) {
                            fw_unit.hp = fw_unit.maxHp;
                            revertPolymorph(fw_unit);
                        }
                        fw_unit.hp -= actualDamageFW;

                        // Aggressive Play: Reset damage window for player spells
                        if (fw_unit.team === 'enemy') {
                            window.turnsSinceLastDamage = 0;
                        }
                    }


                    if (fw_unit.hp < 0) fw_unit.hp = 0;


                    if (typeof showDamagePopup === 'function') showDamagePopup(fw_unit.x, fw_unit.y, actualDamageFW);


                    if (typeof flashElementOnHit === 'function') flashElementOnHit(fw_unit.element);


                    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(fw_unit);


                    if (fw_unit.hp <= 0) deathPromises.push(removeUnit(fw_unit));





                    // Unstealth if rogue is hit by Flame Wave


                    if (fw_unit.type === 'rogue' && fw_unit.isStealthed) {


                        fw_unit.isStealthed = false;


                        if (typeof showFeedback === 'function') showFeedback(`${fw_unit.name} revealed!`, "feedback-error");


                        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(fw_unit);


                    }


                }


            }


        }
    }
    Promise.all(deathPromises).then(checkWinLossConditions);
}






/**
 * Automatically ends the player's turn if no more actions (unit moves/attacks or spells) are available.
 */
function checkAutoEndTurn() {
    // Basic phase check
    if (currentTurn !== 'player' || isProcessing || isGameOver() || levelClearedAwaitingInput) return;

    // Optional: If unlimited spells are active, don't auto-end (player might want to spam)
    if (typeof unlimitedSpellsCheat !== 'undefined' && unlimitedSpellsCheat) return;

    // 1. Check if all player units have acted
    const playerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));
    if (playerUnits.length === 0) return; // Should not happen if game is active

    const allUnitsActed = playerUnits.every(u => u.acted);
    if (!allUnitsActed) return;

    // 2. Check if any spells are available
    // Look through unlocked spells that aren't 'unit spells' (wizard abilities)
    // because wizard abilities are capped by the unit's 'acted' status.
    const unlockedSpellNames = Object.keys(spellsUnlocked).filter(sName => spellsUnlocked[sName]);

    // If there are any unlocked general spells that haven't been used this turn/level
    const anyGeneralSpellsAvailable = unlockedSpellNames.some(sName => {
        // Only fireball, flameWave, frostNova, heal are 'general' spells tracked in spellUses
        const isGeneralSpell = ['fireball', 'flameWave', 'frostNova', 'heal'].includes(sName);
        return isGeneralSpell && spellUses[sName] === true;
    });

    if (anyGeneralSpellsAvailable) return;

    // 3. Auto-end turn
    console.log("Auto-ending turn: No moves or spells left.");
    endTurn();
}

function endTurn() {
    handleObjectiveTurnUpdates();


    // ALLOW Free Move: Do not auto-complete level here. 
    // Level completion is triggered by the 'Next Level' button or specific interactions.
    /*
    if (levelClearedAwaitingInput) {
        completeLevelAndShowSummary();
        return;
    }
    */


    if (currentTurn !== 'player' || isProcessing || isGameOver()) return;





    isProcessing = true;

    // Aggressive Play: Track turns and check Executioner window
    // Increment at START of turn (already moved    // Aggressive Play: Track turns and check Executioner window
    window.turnsSinceLastDamage++;
    if (window.turnsSinceLastDamage > EXECUTIONER_THRESHOLD) {
        if (!window.failedExecutionerBonus) {
            window.failedExecutionerBonus = true;
            if (typeof showFeedback === 'function') showFeedback("Executioner Bonus Lost!", "feedback-error");
        }
    }


    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    if (typeof updateParUI === 'function') updateParUI();


    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();


    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();


    // Selection persists through turn end



    // pendingFlameWaves = []; // REMOVED: Do not clear pending waves here, they need to persist for enemy turn start


    if (typeof clearAllFlameWaveWarnings === 'function') clearAllFlameWaveWarnings();





    currentTurn = 'enemy';





    units.forEach(u => {


        if (u.team === 'player' && isUnitAliveAndValid(u)) {


            u.acted = false; u.actionsTakenThisTurn = 0;


            if (u.quickStrikeActive) u.quickStrikeActive = false;


            u.stealthAttackBonusUsed = false;


        }


    });





    triggerGoldMagnetPassive();


    processTurnEnd('player'); // End of player turn





    units.forEach(u => {


        if (u.team === 'enemy' && isUnitAliveAndValid(u)) {


            u.acted = false; u.actionsTakenThisTurn = 0;


        }


    });





    processTurnStart('enemy'); // Start of enemy turn








    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();


    setTimeout(runAITurn, 400);


}





function runAITurn() {


    const unitsToAct = units


        .filter(u => u.team === 'enemy' && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen && !u.isPolymorphed)


        .sort((a, b) => {


            if (a.type === 'goblin_sapper' && b.type !== 'goblin_sapper') return -1;


            if (b.type === 'goblin_sapper' && a.type !== 'goblin_sapper') return 1;


            if (a.flees && !b.flees) return -1;


            if (!a.flees && b.flees) return 1;


            return b.mov - a.mov;


        });





    if (unitsToAct.length === 0) { endAITurnSequence(); return; }


    let currentAIUnitIndex = 0;


    const baseActionInterval = 150;


    const minActionDuration = Math.max(MOVE_ANIMATION_DURATION_MS, NET_FLY_DURATION_MS, ARROW_FLY_DURATION_MS, FIREBALL_PROJECTILE_DURATION_MS) + 100;





    async function processNextAIUnit() {


        if (!isGameActiveFlag || isGameOver() || currentAIUnitIndex >= unitsToAct.length) {


            endAITurnSequence(); return;


        }


        const unitToProcess = unitsToAct[currentAIUnitIndex++];


        const stillValidUnit = units.find(u => u.id === unitToProcess?.id && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen);


        if (stillValidUnit) {


            const actionStartTime = Date.now();


            let unitDidSomething = false;





            // Track original position and state


            const originalX = stillValidUnit.x;


            const originalY = stillValidUnit.y;


            // Store player HP before action to detect attacks


            units.forEach(u => { if (u.team === 'player') u._prevHp = u.hp; });





            try {


                await performAIAction(stillValidUnit);





                // Check if unit actually moved or attacked (position changed or HP changed in enemies)


                const movedOrActed = (stillValidUnit.x !== originalX || stillValidUnit.y !== originalY);


                // Check if any player unit HP decreased (unit attacked)


                const playerHpChanged = units.some(u => u.team === 'player' && u.hp < u._prevHp);





                unitDidSomething = movedOrActed || playerHpChanged;


            }


            catch (e) {


                console.error(`AI Error (${stillValidUnit?.id}):`, e);


                if (isUnitAliveAndValid(stillValidUnit) && !stillValidUnit.acted) try { finishAction(stillValidUnit); } catch { }


            } finally {


                const duration = Date.now() - actionStartTime;


                // Units that did nothing get 1ms delay, active units get normal delay


                const delayNeeded = unitDidSomething ? Math.max(baseActionInterval, minActionDuration - duration) : 1;


                setTimeout(processNextAIUnit, delayNeeded);


            }


        } else {


            setTimeout(processNextAIUnit, 30);


        }


    }


    setTimeout(processNextAIUnit, 50);


}





function endAITurnSequence() {


    try {


        if (!isGameActiveFlag || isGameOver()) return;


        currentTurn = 'player';
        // Aggressive Play: Increment turn count at START of player turn
        // Lock increment if level is already cleared (free move phase)
        if (true) { // Always increment to ensure proper tracking even in free move
            window.turnsCountThisLevel++;
        }
        if (typeof updateParUI === 'function') updateParUI();


        playerTurnCount++;





        // Goblin Mother's Skull Regeneration Effect (Every 3 Turns)


        if (equippedHelmetId === 'goblin_mother_skull' && playerTurnCount % 3 === 0) {


            let regenApplied = false;


            units.forEach(u => {


                if (u.team === 'player' && isUnitAliveAndValid(u) && !u.isKeep && !u.isVillager && !u.isWagon && u.hp < u.maxHp) {


                    const skullLevel = playerOwnedArmor['goblin_mother_skull'] || 1;
                    const regenAmount = 1 + Math.max(0, skullLevel - 1);
                    u.hp = Math.min(u.maxHp, u.hp + regenAmount);


                    regenApplied = true;


                    if (typeof showHealPopup === 'function') showHealPopup(u.x, u.y, regenAmount);


                    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(u);


                    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(u);


                }


            });


            if (regenApplied) {


                playSfx('heal');


                if (typeof showFeedback === 'function') showFeedback("Goblin Skull regenerates HP!", "feedback-heal");


            }


        }





        processTurnEnd('enemy'); // End of enemy turn

        if (typeof spawnHordeWave === 'function') spawnHordeWave();

        processTurnStart('player'); // Start of player turn


        units.forEach(u => {


            if (u.team === 'player' && isUnitAliveAndValid(u)) {


                u.acted = false; u.actionsTakenThisTurn = 0;


                if (u.quickStrikeActive) u.quickStrikeActive = false;


                u.stealthAttackBonusUsed = false;


                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(u);


            }


        });


        if (typeof showFeedback === 'function') showFeedback("Player Turn!", "feedback-turn");


        if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit);


        if (typeof highlightMovesAndAttacks === 'function' && selectedUnit && selectedUnit.team === 'player') {


            highlightMovesAndAttacks(selectedUnit);


        }


        if (typeof updateWorldHpBars === 'function') updateWorldHpBars();


    }


    catch (e) { console.error("Error in endAITurnSequence:", e); }


    finally {


        isProcessing = false;


        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();


        checkWinLossConditions();


    }


}





// Helper function to find a random cell 3-5 tiles away for fleeing units


/* Shadowed findFarthestValidCell removed - active version is at line ~3621 */





async function performAIAction(unit) {
    if (unit.type === 'krizak') console.log(`[AI-DEBUG] performAIAction for Krizak. Acted: ${unit.acted}, Charging: ${unit.isChargingFrostNova}, ActionsTypes: ${JSON.stringify(unit.actionsTakenTypes)}`);

    // Frost Nova Execution ALWAYS fires (even if Kri'zak is frozen/incapacitated)
    // Safety Lock: Prevent Executing immediately after Charging in the same turn
    if (unit.type === 'krizak' && unit.isChargingFrostNova && unit.frostNovaTarget &&
        (!unit.actionsTakenTypes || !unit.actionsTakenTypes.includes('charge_frost_nova'))) {

        console.log('[AI-DEBUG] Entering Frost Nova Execution Block');
        const target = unit.frostNovaTarget;
        if (typeof showFeedback === 'function') showFeedback(`${unit.name} releases Frost Nova!`, "feedback-turn");

        // Use existing frostNova logic but from AI
        // Frost Nova is a 5x5 area (radius 2)
        for (let y = target.y - 2; y <= target.y + 2; y++) {
            for (let x = target.x - 2; x <= target.x + 2; x++) {
                const targetUnit = getUnitAt(x, y);
                if (targetUnit && targetUnit.team === 'player' && isUnitAliveAndValid(targetUnit)) {
                    targetUnit.isFrozen = true;
                    targetUnit.frozenTurnsLeft = 3; // 3 turn freeze
                    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(targetUnit);
                }
            }
        }

        // Play Frost Nova visual effect and SFX
        if (typeof animateFrostNova === 'function') animateFrostNova(target.x, target.y, 2);
        playSfx('frostNova');
        unit.isChargingFrostNova = false;
        unit.frostNovaTarget = null;
        unit.frostNovaCooldown = 4; // Boss cooldown

        // Cleanup pending array and UI
        pendingFrostNovas = pendingFrostNovas.filter(p => p.summonerId !== unit.id);
        if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings();
        if (typeof showPendingFrostNovaWarnings === 'function') showPendingFrostNovaWarnings();

        console.log('[AI-DEBUG] Frost Nova Executed. Proceeding to Move/Attack.');
    }

    if (!unit || !isUnitAliveAndValid(unit) || unit.acted || unit.isFrozen) { if (unit && !unit.acted && isUnitAliveAndValid(unit)) finishAction(unit); return; }


    const isSapper = unit.type === 'goblin_sapper';
    const livingPlayers = units.filter(u => {
        if (u.team !== 'player' || u.hp <= 0) return false;
        if (u.isStealthed) {
            // Rogues are detectable if they've been adjacent to ANY enemy for >= 1 turn
            const detectableByGeneralEnemies = (u.stealthTurnsAdjacent || 0) >= 1;
            // But Sappers specifically only "detect" (target) them if they are CURRENTLY adjacent TO THIS SAPPER
            if (isSapper) {
                const distToSapper = Math.abs(unit.x - u.x) + Math.abs(unit.y - u.y);
                return distToSapper <= 1;
            }
            return detectableByGeneralEnemies;
        }
        return true;
    });


    if (livingPlayers.length === 0) { finishAction(unit); return; }


    let actionTaken = false; let hasMoved = false;





    let targetPlayer = null;
    if (currentLevelObjective === OBJECTIVE_TYPES.HOLD_THE_KEEP && objectiveTarget && isUnitAliveAndValid(objectiveTarget)) {
        targetPlayer = objectiveTarget;
    } else {
        targetPlayer = livingPlayers.reduce((closest, player) => {
            const dist = getDistance(unit, player);
            return dist < closest.dist ? { player, dist } : closest;
        }, { player: null, dist: Infinity }).player;
    }

    if (!targetPlayer) { finishAction(unit); return; }

    // Tower Seeking for Ranged Enemies (Flyers don't seek towers)
    const isRangedEnemySeeker = unit.baseRange > 1 && !unit.inTower && unit.team === 'enemy' && !unit.isAerial;
    if (isRangedEnemySeeker) {
        const nearestEmptyTower = obstacles.reduce((closest, obs) => {
            if (obs.type === 'tower' && !obs.occupantUnitId && isObstacleIntact(obs)) {
                const dist = getDistance(unit, obs);
                return dist < closest.dist ? { tower: obs, dist } : closest;
            }
            return closest;
        }, { tower: null, dist: Infinity }).tower;

        if (nearestEmptyTower) {
            const distToTower = getDistance(unit, nearestEmptyTower);
            const distToPlayer = getDistance(unit, targetPlayer);

            // Move to tower if it's reachable or strategically closer than the player
            if (distToTower <= unit.mov || distToTower < distToPlayer) {
                const movedToTower = await moveUnit(unit, nearestEmptyTower.x, nearestEmptyTower.y);
                if (movedToTower) {
                    actionTaken = true; hasMoved = true;
                    if (!isUnitAliveAndValid(unit) || unit.acted) return; // Entered tower or died (e.g. trap/thorns if any)
                }
            }
        }
    }

    let finalTargetObject = targetPlayer;
    if (targetPlayer.inTower) {
        const tower = obstacles.find(o => o.id === targetPlayer.inTower);
        if (tower && isObstacleIntact(tower)) finalTargetObject = tower;
    }

    const minDist = getDistance(unit, finalTargetObject);

    // Tower Camping: Ranged enemies in towers should stay put (no fleeing)
    const isRangedInTower = unit.baseRange > 1 && unit.inTower;

    if (unit.flees && !isRangedInTower) {


        const fleeGoal = findFarthestValidCell(unit, livingPlayers);


        const currentMinDist = Math.min(...livingPlayers.map(p => getDistance(unit, p)));





        // Check if we can actually improve our situation by fleeing


        if (fleeGoal) {


            const fleeMinDist = Math.min(...livingPlayers.map(p => getDistance(fleeGoal, p)));





            // Only flee if it actually increases distance from enemies


            if (fleeMinDist > currentMinDist) {


                // Use full MOV to flee


                await moveUnit(unit, fleeGoal.x, fleeGoal.y);


                actionTaken = true;


            }


        }





        // If still no action taken (cornered), fight back


        if (!actionTaken) {
            // Already initialized targetPlayer and finalTargetObject above





            if (targetPlayer && getDistance(unit, targetPlayer) <= unit.currentRange) {


                let finalTarget = finalTargetObject;


                if (targetPlayer.inTower) {


                    const tower = obstacles.find(o => o.id === targetPlayer.inTower);


                    if (tower && isObstacleIntact(tower)) finalTarget = tower;


                }


                await attack(unit, finalTarget.x, finalTarget.y);


                return; // attack calls finishAction


            }


        }


    } else {
        // Already initialized targetPlayer and finalTargetObject above





        if (!actionTaken && unit.suicideExplode) {


            if (minDist <= unit.explosionRadius) { await explodeUnit(unit); return; }


            else {


                const path = findPathToTarget(unit, targetPlayer.x, targetPlayer.y);


                if (path && path.length > 0) {
                    // Try to find the furthest cell on the path that is actually a valid move (not blocked by units/obstacles)
                    // and within the unit's MOV range.
                    let targetCell = null;
                    const maxPathIndexToCheck = Math.min(unit.mov - 1, path.length - 1);
                    const validMovesForUnit = getValidMoves(unit);

                    for (let i = maxPathIndexToCheck; i >= 0; i--) {
                        const cell = path[i];
                        if (validMovesForUnit.some(m => m.x === cell.x && m.y === cell.y)) {
                            targetCell = cell;
                            break;
                        }
                    }

                    if (targetCell) {
                        await moveUnit(unit, targetCell.x, targetCell.y);
                        hasMoved = true;

                        // Immediate check after move: If cardinally adjacent to the target object (handling towers), explode now!
                        // No diagonal explosions per user request (Manhattan distance <= 1)
                        const dx = Math.abs(unit.x - finalTargetObject.x);
                        const dy = Math.abs(unit.y - finalTargetObject.y);

                        if ((dx + dy) <= 1) {
                            await explodeUnit(unit);
                            return;
                        }
                    }


                }


            }


            if (hasMoved && !unit.acted) { finishAction(unit); return; }


        }



        else if (!actionTaken && (unit.type === 'goblin_shaman' || unit.canSummonTotem)) {


            // Fix for Shaman Totem limit: Check if THIS shaman has a totem
            const myTotemExists = units.some(u => u.isTotem && u.summonerId === unit.id && isUnitAliveAndValid(u));


            const canSummon = unit.canSummonTotem && unit.totemCooldown <= 0 && !myTotemExists;


            if (canSummon) {


                const nearestPlayerDist = livingPlayers.reduce((minDist, p) => Math.min(minDist, getDistance(unit, p)), Infinity);


                if (nearestPlayerDist <= 5) {


                    const validSpot = getAdjacentCells(unit.x, unit.y).find(spot => isCellInBounds(spot.x, spot.y) && !getUnitAt(spot.x, spot.y) && !getObstacleAt(spot.x, spot.y));


                    if (validSpot) {


                        const newTotem = createUnit(unit.totemType, validSpot.x, validSpot.y);


                        if (newTotem) {


                            newTotem.summonerId = unit.id; // Link totem to summoner


                            if (typeof renderUnit === 'function') renderUnit(newTotem);


                            if (gameSettings.showHpBars && typeof createWorldHpBar === 'function') createWorldHpBar(newTotem);


                            playSfx('shamanTotem');
                            playSfx('totem');
                            unit.totemCooldown = SHAMAN_TOTEM_COOLDOWN; actionTaken = true; finishAction(unit); return;
                        }
                    }
                }
            }
        }


        if (unit.type === 'krizak' && unit.canCastFrostNova && unit.frostNovaCooldown <= 0 && !unit.isChargingFrostNova) {
            // Find best 5x5 target area (most players)
            let bestPos = null;
            let maxPlayers = 0;

            for (let r = 0; r < currentGridRows; r++) {
                for (let c = 0; c < currentGridCols; c++) {
                    // Boss must have LOS to the center of the Nova
                    if (!hasLineOfSight(unit, { x: c, y: r })) continue;

                    let playersInArea = 0;
                    for (let y = r - 2; y <= r + 2; y++) {
                        for (let x = c - 2; x <= c + 2; x++) {
                            const p = getUnitAt(x, y);
                            if (p && p.team === 'player' && isUnitAliveAndValid(p)) playersInArea++;
                        }
                    }
                    if (playersInArea > maxPlayers) {
                        maxPlayers = playersInArea;
                        bestPos = { x: c, y: r };
                    }
                }
            }

            // Strategic use: only if 2 or more players targeted
            if (bestPos && maxPlayers >= 2) {
                unit.isChargingFrostNova = true;
                unit.frostNovaTarget = bestPos;
                pendingFrostNovas.push({ x: bestPos.x, y: bestPos.y, summonerId: unit.id });
                if (typeof showPendingFrostNovaWarnings === 'function') showPendingFrostNovaWarnings();
                if (typeof showFeedback === 'function') showFeedback(`${unit.name} charges Frost Nova!`, "feedback-turn");
                console.log('[AI-DEBUG] Frost Nova CHARGED. calling finishAction.');
                actionTaken = true; finishAction(unit, 'charge_frost_nova'); return;
            }
        }


        const attackTargetsFB = getValidAttackTargets(unit);


        if (unit.canCastFlameWave && unit.flameWaveCooldown <= 0 && Math.random() < 0.5) {


            const bestRow = findBestFlameWaveRow(unit);


            if (bestRow !== null) {


                // Queue Flame Wave for next turn


                const numRows = unit.flameWaveRows || 1;


                for (let i = 0; i < numRows; i++) {


                    const targetRow = bestRow + i;


                    if (targetRow >= 0 && targetRow < currentGridRows) {


                        pendingFlameWaves.push({ row: targetRow, damage: unit.atk, summonerId: unit.id });


                    }


                }


                if (typeof showPendingFlameWaveWarnings === 'function') showPendingFlameWaveWarnings();


                const chargerName = unit.type === 'zulkash' ? "Zul'kash" : "Pyromancer";


                if (typeof showFeedback === 'function') showFeedback(`${chargerName} charges Flame Wave!`, "feedback-turn");





                unit.flameWaveCooldown = PYRO_FLAME_WAVE_COOLDOWN;


                actionTaken = true; finishAction(unit); return;


            }


        }


        const isFireballAttacker = unit.type === 'goblin_pyromancer' || unit.type === 'zulkash' || unit.type === 'zulfar';

        if (isFireballAttacker && attackTargetsFB.units.includes(finalTargetObject.id) && hasLineOfSight(unit, finalTargetObject)) {


            if (unit.atk > 0) {


                playSfx('fireballShoot');


                if (typeof animateFireball === 'function') animateFireball(unit.element, finalTargetObject.x, finalTargetObject.y);


                await new Promise(r => setTimeout(r, FIREBALL_PROJECTILE_DURATION_MS));


                playSfx('fireballHit'); if (typeof createExplosionEffect === 'function') createExplosionEffect(finalTargetObject.x, finalTargetObject.y, 'fireball');


                const stillTarget = units.find(u => u.id === finalTargetObject.id && isUnitAliveAndValid(u));


                if (stillTarget) {


                    const targetArmor = (stillTarget.team === 'player') ? ARMOR_DATA[equippedArmorId] : null;


                    const targetArmorLevel = targetArmor ? (playerOwnedArmor[equippedArmorId] || 0) : 0;


                    const isImmune = stillTarget.immuneToFire || (targetArmor && targetArmorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (targetArmor.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE);





                    let actualDamageFB = unit.atk;
                    const targetFireResistanceFB = stillTarget.fireResistance || 0;
                    if (isImmune && currentLevel >= IMMUNITY_LEVEL_START) {
                        actualDamageFB = Math.max(1, Math.floor(actualDamageFB * 0.25));
                    } else if (targetFireResistanceFB > 0) {
                        actualDamageFB = Math.max(1, Math.floor(actualDamageFB - targetFireResistanceFB));
                    }





                    if (stillTarget.team === 'player' && forestArmorActiveTurns > 0) {


                        const armorLevel = playerOwnedArmor[equippedArmorId] || 0;


                        const damageReduction = armorLevel > 0 ? armorLevel : 1;


                        actualDamageFB = Math.max(0, actualDamageFB - damageReduction);


                    }





                    actualDamageFB = Math.max(0, actualDamageFB);


                    if (stillTarget.isPolymorphed) {
                        stillTarget.hp = stillTarget.maxHp;
                        revertPolymorph(stillTarget);
                    }
                    stillTarget.hp -= actualDamageFB;
                    if (stillTarget.team === 'enemy') window.turnsSinceLastDamage = 0;


                    if (stillTarget.hp < 0) stillTarget.hp = 0;


                    if (typeof showDamagePopup === 'function') showDamagePopup(stillTarget.x, stillTarget.y, actualDamageFB);


                    if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element);


                    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget);





                    // Unstealth ANY unit if hit by Pyromancer Fireball
                    if (stillTarget.isStealthed) {
                        stillTarget.isStealthed = false;
                        if (typeof showFeedback === 'function') showFeedback(`${stillTarget.name} revealed!`, "feedback-error");
                        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(stillTarget);
                    }





                    if (stillTarget.hp <= 0) await removeUnit(stillTarget);
                }
                actionTaken = true; finishAction(unit); return;
            }
        }
    }

    if (!actionTaken) {


        const attackTargets = getValidAttackTargets(unit);


        const targetIsUnit = !!finalTargetObject.team;


        const canAttackDirectly = targetIsUnit ? attackTargets.units.includes(finalTargetObject.id) : attackTargets.obstacles.includes(finalTargetObject.id);


        const effectiveAtk = unit.meleeOnlyAttack ? (unit.baseMeleeAtk || unit.atk) : unit.atk;





        if ((effectiveAtk > 0 || unit.canNet) && canAttackDirectly) {


            if (unit.canNet && unit.netCooldownTurnsLeft <= 0 && !targetPlayer.isNetted && minDist > 1 && minDist <= unit.currentRange && hasLineOfSight(unit, targetPlayer)) {


                actionTaken = await throwNet(unit, targetPlayer); if (actionTaken) return;


            } else if (effectiveAtk > 0 && (!unit.meleeOnlyAttack || minDist <= 1)) {


                await attack(unit, finalTargetObject.x, finalTargetObject.y);


                actionTaken = true; if (!unit.canMoveAndAttack) return;


            }


        }


    }





    let canStillMove = !hasMoved && !actionTaken && !isRangedInTower;
    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 1 && !hasMoved && !isRangedInTower) canStillMove = true;


    if (canStillMove && !unit.isNetted) {


        const movementBudget = unit.mov;


        if (movementBudget > 0) {


            const path = findPathToTarget(unit, targetPlayer.x, targetPlayer.y);


            let chosenMove = null;


            let canAttackAfterMoving = false;


            if (path && path.length > 0) {


                const validMovesAI = getValidMoves(unit);


                let furthestValidMove = null;





                for (let i = Math.min(movementBudget - 1, path.length - 1); i >= 0; i--) {


                    const step = path[i];


                    if (validMovesAI.some(m => m.x === step.x && m.y === step.y)) {


                        // Capture the furthest valid move (since we iterate backwards from furthest)


                        if (!furthestValidMove) furthestValidMove = step;





                        const tempUnitState = { ...unit, x: step.x, y: step.y };


                        const tempTargets = getValidAttackTargets(tempUnitState);


                        const tempTargetIsUnit = !!finalTargetObject.team;


                        canAttackAfterMoving = tempTargetIsUnit


                            ? tempTargets.units.includes(finalTargetObject.id)


                            : tempTargets.obstacles.includes(finalTargetObject.id);





                        if (canAttackAfterMoving) {


                            chosenMove = step;


                            break;


                        }


                    }


                }





                // If we didn't find a move that allows attacking, use the furthest valid move


                if (!chosenMove) {


                    chosenMove = furthestValidMove;


                }





                if (!chosenMove) {


                    // Fallback: Just take one step if we haven't chosen a move yet


                    if (validMovesAI.some(m => m.x === path[0].x && m.y === path[0].y)) {


                        chosenMove = path[0];


                    }


                }


            }





            if (chosenMove && (chosenMove.x !== unit.x || chosenMove.y !== unit.y)) {


                const moved = await moveUnit(unit, chosenMove.x, chosenMove.y);


                if (moved) {


                    actionTaken = true; hasMoved = true;


                    const currentFinalTarget = units.find(u => u.id === finalTargetObject.id && isUnitAliveAndValid(u)) || obstacles.find(o => o.id === finalTargetObject.id && isObstacleIntact(o));


                    if (currentFinalTarget) {


                        const postMoveTargets = getValidAttackTargets(unit);


                        const postMoveTargetIsUnit = !!currentFinalTarget.team;


                        const canAttackNow = postMoveTargetIsUnit


                            ? postMoveTargets.units.includes(currentFinalTarget.id)


                            : postMoveTargets.obstacles.includes(currentFinalTarget.id);


                        const effectiveAtkAfterMove = unit.meleeOnlyAttack ? (unit.baseMeleeAtk || unit.atk) : unit.atk;





                        if (canAttackNow && (!unit.meleeOnlyAttack || getDistance(unit, currentFinalTarget) <= 1)) {


                            if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2 && effectiveAtkAfterMove > 0) {


                                await attack(unit, currentFinalTarget.x, currentFinalTarget.y);


                                return;


                            } else if (!unit.canMoveAndAttack && effectiveAtkAfterMove > 0) {


                                console.warn(`Unit ${unit.id} moved but cannot attack after move (likely action already finished).`);


                            }


                        }


                    }


                }


            }


        }

        // Fallback: If unit couldn't reach target and hasn't attacked, try destroying blocking obstacles in the way
        if (!unit.acted && isUnitAliveAndValid(unit)) {
            const adjacentCells = getAdjacentCells(unit.x, unit.y);
            let bestObstacle = null;
            let bestDist = Infinity;
            for (const cell of adjacentCells) {
                const obs = getObstacleAt(cell.x, cell.y);
                // Explicitly forbid attacking snowmen
                if (obs && obs.canBeAttacked && isObstacleIntact(obs) && obs.blocksMove && obs.type !== 'snowman') {
                    // Prefer obstacles that are between us and the target
                    const distToTarget = getDistance(cell, targetPlayer);
                    if (distToTarget < bestDist) {
                        bestDist = distToTarget;
                        bestObstacle = obs;
                    }
                }
            }
            if (bestObstacle && unit.atk > 0) {
                await attack(unit, bestObstacle.x, bestObstacle.y);
                return;
            }
        }
        if (!unit.acted && isUnitAliveAndValid(unit)) finishAction(unit);
    }
}





function findFarthestValidCell(unit, players) {


    const validMovesFlee = getValidMoves(unit);


    if (validMovesFlee.length === 0) return null;


    let bestCell = null;


    let maxAvgDist = -1;


    validMovesFlee.forEach(cell => {


        let totalDist = 0;


        players.forEach(p => { totalDist += getDistance(cell, p); });


        const avgDist = players.length > 0 ? totalDist / players.length : 0;


        if (avgDist > maxAvgDist) {


            maxAvgDist = avgDist;


            bestCell = cell;


        }


    });


    return bestCell || validMovesFlee[0];


}





function findBestFlameWaveRow(unit) {


    let bestRow = null;


    let maxDamage = -1;


    for (let y = 0; y < currentGridRows; y++) {


        let potentialDamage = 0;


        let canHit = false;


        for (let x = 0; x < currentGridCols; x++) {


            const targetUnit = getUnitAt(x, y);


            if (targetUnit && targetUnit.team === 'player' && isUnitAliveAndValid(targetUnit) && (!targetUnit.isStealthed || getDistance(unit, targetUnit) <= 1)) {


                if (hasLineOfSight(unit, { x, y })) {


                    canHit = true;


                    potentialDamage += Math.min(targetUnit.hp, unit.atk);


                }


            }


        }


        if (canHit && potentialDamage > maxDamage) {


            maxDamage = potentialDamage;


            bestRow = y;


        }


    }


    return bestRow;


}





// Helper: Check if the selected unit can target a row with Flame Wave (requires LOS to at least one cell in the row)


function canTargetFlameWaveRow(unit, targetRow) {


    if (!unit || typeof targetRow !== 'number' || targetRow < 0 || targetRow >= currentGridRows) {


        return false;


    }





    // Check if unit has line of sight to at least ONE cell in the target row


    for (let x = 0; x < currentGridCols; x++) {


        if (hasLineOfSight(unit, { x, y: targetRow })) {


            return true; // Can target this row - has LOS to at least one cell


        }


    }





    return false; // No line of sight to any cell in this row


}








async function throwNet(unit, target) {


    if (!unit || !target || !unit.canNet || unit.netCooldownTurnsLeft > 0 || target.isNetted || !isUnitAliveAndValid(unit) || !isUnitAliveAndValid(target) || levelClearedAwaitingInput) return false;


    if (!hasLineOfSight(unit, target)) return false;





    if (typeof animateAttack === 'function') {


        const impactDelay = await animateAttack(unit, target, true, 'net');


        await new Promise(resolve => setTimeout(resolve, impactDelay));


    } else {
        // playSfx('net_throw'); // Removed to avoid duplication with net_hit
        await new Promise(resolve => setTimeout(resolve, NET_FLY_DURATION_MS / 2));
    }





    const stillValidTarget = units.find(u => u.id === target.id && isUnitAliveAndValid(u) && !u.isNetted);


    if (!stillValidTarget) {


        if (isUnitAliveAndValid(unit) && !unit.acted) finishAction(unit, 'ability');


        return false;


    }





    playSfx('net_hit');


    stillValidTarget.isNetted = true;


    stillValidTarget.nettedTurnsLeft = NET_DURATION;


    unit.netCooldownTurnsLeft = unit.netCooldown || NET_COOLDOWN;





    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(stillValidTarget);


    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(stillValidTarget);





    finishAction(unit, 'ability');


    return true;


}





function getValidMoves(unit, ignoreActionState = false) {


    if (!unit || !isUnitAliveAndValid(unit)) return [];
    if (unit.isKeep || unit.isVillager) return [];


    let canMove = (!levelClearedAwaitingInput && !unit.acted);


    if (levelClearedAwaitingInput) canMove = true; // Allow movement after level clear


    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canMove = true;


    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canMove = true;


    if (ignoreActionState) canMove = true;


    if (!canMove || unit.isFrozen || unit.isNetted) return [];





    let distanceLimit = unit.mov;


    if (!ignoreActionState) {


        let penalty = 0;


        if (unit.isStealthed && unit.type !== 'goblin_shadowstalker') penalty = Math.max(penalty, ROGUE_STEALTH_MOVE_PENALTY);


        if (unit.quickStrikeActive) {


            penalty = Math.max(penalty, ROGUE_QUICK_STRIKE_MOVE_PENALTY);


            // Fix: If Quick Strike is active and we've already moved (actionsTakenTypes includes 'move'), we can't move again.


            if (unit.actionsTakenTypes && unit.actionsTakenTypes.includes('move')) {


                return [];


            }


        }


        distanceLimit -= penalty;


    }


    // Slow penalty already applied in recalculateUnitStats


    distanceLimit = Math.max(0, distanceLimit);


    if (distanceLimit <= 0) return [];





    const moves = []; const queue = [{ x: unit.x, y: unit.y, distance: 0 }]; const visited = new Map(); visited.set(`${unit.x},${unit.y}`, 0); const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; const unitInTower = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;


    while (queue.length > 0) {


        // Sort queue by distance to ensure we process shortest paths first (Dijkstra-like)


        queue.sort((a, b) => a.distance - b.distance);


        const current = queue.shift();





        for (const [dx, dy] of directions) {


            const nextX = current.x + dx; const nextY = current.y + dy; const key = `${nextX},${nextY}`;


            if (!isCellInBounds(nextX, nextY)) continue;





            let moveCost = unit.isAerial ? 1 : getMoveCost(nextX, nextY);
            if (unit.team === 'player' && typeof equippedBootsId !== 'undefined' && (equippedBootsId === 'sturdy_boots' || equippedBootsId === 'chain_boots')) {
                moveCost = 1;
            }

            const newDistance = current.distance + moveCost;





            if (newDistance > distanceLimit) continue;


            if (visited.has(key) && visited.get(key) <= newDistance) continue;





            const obstacle = getObstacleAt(nextX, nextY);
            const unitOnCell = getUnitAt(nextX, nextY);
            let isBlockedForLanding = false;
            let isBlockedForFlight = false;

            if (unitOnCell && unitOnCell.id !== unit.id) {
                isBlockedForLanding = true;
                if (!unit.isAerial) isBlockedForFlight = true; // Flyers can fly over other units
            }

            if (obstacle && obstacle.blocksMove && !obstacle.enterable) {
                if (unit.isAerial) {
                    isBlockedForLanding = true; // Can fly over, but cannot land
                    isBlockedForFlight = false;
                } else {
                    isBlockedForLanding = true;
                    isBlockedForFlight = true;
                }
            }

            if (unitInTower) {
                /* No movement restriction while inside a tower cell during pathfinding */
            } else if (obstacle?.enterable) {
                if (Math.abs(current.x - nextX) + Math.abs(current.y - nextY) !== 1) {
                    isBlockedForLanding = true;
                    if (!unit.isAerial) isBlockedForFlight = true;
                }
                if (obstacle.occupantUnitId && obstacle.occupantUnitId !== unit.id) {
                    isBlockedForLanding = true;
                    if (!unit.isAerial) isBlockedForFlight = true;
                }
            }

            if (!isBlockedForFlight) {
                if (!isBlockedForLanding) {
                    moves.push({ x: nextX, y: nextY });
                }
                visited.set(key, newDistance);
                queue.push({ x: nextX, y: nextY, distance: newDistance });
            }


        }


    } return moves;


}





function getValidAttackTargets(unit) {


    const targets = { units: [], obstacles: [] };


    if (!unit || !isUnitAliveAndValid(unit) || unit.isFrozen || unit.type === 'goblin_sapper' || unit.isVillager) return targets; // Netted units CAN attack, Sappers CANNOT attack normally


    let canAttack = !levelClearedAwaitingInput && !unit.acted;


    if (levelClearedAwaitingInput) canAttack = true; // Allow attacking if level is cleared


    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAttack = true;


    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAttack = true;





    const effectiveAtk = unit.meleeOnlyAttack ? (unit.baseMeleeAtk || unit.atk) : unit.atk;


    if (!canAttack || (effectiveAtk <= 0 && !unit.canNet)) return targets;





    const unitRange = (unit.meleeOnlyAttack && unit.team !== 'player') ? 1 : unit.currentRange;


    // ignoreStealthLOS: if attacker is stealthed and target is adjacent, ignore LOS blockers? 


    // Actually should be used when the ATTACKER is stealthed and attacking from melee range.


    const ignoreStealthLOS = unit.isStealthed && unitRange <= 1;





    for (const target of units) {


        if (target.team !== unit.team && isUnitAliveAndValid(target)) {


            let targetPosForCheck = target; let targetIdForList = target.id; let finalTargetIsTower = false;


            if (target.inTower) { const tower = obstacles.find(o => o.id === target.inTower); if (tower && isObstacleIntact(tower)) { targetPosForCheck = tower; finalTargetIsTower = true; } else continue; }





            const distance = getDistance(unit, targetPosForCheck);


            if (distance > unitRange || (unit.meleeOnlyAttack && distance > 1)) continue;





            // Visibility Logic: Visible if not stealthed, OR adjacent to attacker, OR adjacent to ANY of attacker's allies


            let targetIsVisible = !target.isStealthed || distance <= 1;


            if (!targetIsVisible && target.isStealthed) {


                // Check if any ally of the attacker is adjacent to the target (4-way)


                const isSpotted = units.some(u => u.team === unit.team && isUnitAliveAndValid(u) && (Math.abs(u.x - target.x) + Math.abs(u.y - target.y) === 1));


                if (isSpotted) targetIsVisible = true;


            }





            if (!targetIsVisible || (distance > 1 && !hasLineOfSight(unit, targetPosForCheck, target.isStealthed && targetIsVisible))) continue;


            const targetId = finalTargetIsTower ? targetPosForCheck.id : targetIdForList;


            const list = finalTargetIsTower ? targets.obstacles : targets.units;


            if (!list.includes(targetId)) list.push(targetId);


        }


    }


    for (const target of obstacles) {


        if (target.canBeAttacked && isObstacleIntact(target) && !targets.obstacles.includes(target.id)) {


            // Empty towers cannot be attacked


            if (target.enterable && !target.occupantUnitId) continue;





            const distance = getDistance(unit, target);


            if (distance > unitRange || (unit.meleeOnlyAttack && distance > 1)) continue;


            if (distance > 1 && target.type !== 'door' && !hasLineOfSight(unit, target, ignoreStealthLOS)) continue;


            if (target.enterable && target.occupantUnitId) { const unitInside = units.find(u => u.id === target.occupantUnitId); if (unitInside?.team === unit.team) continue; }


            targets.obstacles.push(target.id);


        }


    }


    return targets;


}





function findPathToTarget(unit, targetX, targetY) {


    if (!unit || unit.isFrozen || unit.isNetted || !isUnitAliveAndValid(unit)) return null;


    if (unit.x === targetX && unit.y === targetY) return [];


    const startNode = { x: unit.x, y: unit.y, g: 0, h: getDistance(unit, { x: targetX, y: targetY }), parent: null };


    const openSet = new Map(); openSet.set(`${startNode.x},${startNode.y}`, startNode);


    const closedSet = new Set(); const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];


    const maxSearchNodes = currentGridCols * currentGridRows * 2; let nodesSearched = 0;


    const unitInTower = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;


    while (openSet.size > 0 && nodesSearched < maxSearchNodes) {


        nodesSearched++; let currentNode = null; let minF = Infinity;


        for (const node of openSet.values()) { const f = node.g + node.h; if (f < minF) { minF = f; currentNode = node; } else if (f === minF && node.h < currentNode.h) currentNode = node; }


        if (!currentNode) break;


        const currentKey = `${currentNode.x},${currentNode.y}`; openSet.delete(currentKey); closedSet.add(currentKey);


        if (currentNode.x === targetX && currentNode.y === targetY) { const path = []; let temp = currentNode; while (temp.parent) { path.push({ x: temp.x, y: temp.y }); temp = temp.parent; } return path.reverse(); }


        for (const [dx, dy] of directions) {


            const nextX = currentNode.x + dx; const nextY = currentNode.y + dy; const key = `${nextX},${nextY}`;


            if (!isCellInBounds(nextX, nextY) || closedSet.has(key)) continue;


            const obstacle = getObstacleAt(nextX, nextY); const unitOnCell = getUnitAt(nextX, nextY);


            const isTargetCell = (nextX === targetX && nextY === targetY);


            let isWalkable = true;
            if (unitOnCell && !isTargetCell && !unit.isAerial) isWalkable = false;
            if (obstacle && obstacle.blocksMove && !obstacle.enterable && !unit.isAerial) isWalkable = false;


            if (unitInTower && currentNode.parent === null) { /* No initial step restriction for leaving tower */ }

            else if (obstacle?.enterable) {
                // Enemies treat enterable obstacles (towers) as solid walls, UNLESS it is their target destination
                if (unit.team === 'enemy' && !isTargetCell) isWalkable = false;
                else {
                    // REMOVED: if (currentNode.y !== nextY + 1 || currentNode.x !== nextX) isWalkable = false;
                    if (obstacle.occupantUnitId && !isTargetCell) isWalkable = false;
                }
            }

            let extraMoveCost = 0;
            // CRITICAL ADDITION: Allow enemies to path 'through' destructible obstacles but at a high cost
            if (unit.team === 'enemy' && obstacle && obstacle.blocksMove && obstacle.canBeAttacked && obstacle.type !== 'snowman' && !unit.isAerial) {
                isWalkable = true; // Override previous blockage
                extraMoveCost = 10; // High cost discourages it unless necessary
            }

            if (isWalkable) {
                let moveCost = unit.isAerial ? 1 : getMoveCost(nextX, nextY);
                if (unit.team === 'player' && typeof equippedBootsId !== 'undefined' && (equippedBootsId === 'sturdy_boots' || equippedBootsId === 'chain_boots')) {
                    moveCost = 1;
                }
                moveCost += extraMoveCost;

                const gScore = currentNode.g + moveCost;
                const hScore = getDistance({ x: nextX, y: nextY }, { x: targetX, y: targetY });
                const existingNode = openSet.get(key);
                if (!existingNode || gScore < existingNode.g) {
                    const neighbor = { x: nextX, y: nextY, g: gScore, h: hScore, parent: currentNode };
                    openSet.set(key, neighbor);
                } else if (existingNode && gScore === existingNode.g && hScore < existingNode.h) {
                    existingNode.parent = currentNode;
                    existingNode.h = hScore;
                }
            }


        }


    }


    if (nodesSearched >= maxSearchNodes) console.warn("A* limit reached."); return null;


}





async function castChainLightning(caster, targetUnit) {


    if (!caster || !targetUnit) return false;


    if (caster.chainLightningCooldown > 0) { showFeedback("Cooldown!", "feedback-error"); return false; }


    if (caster.acted) { showFeedback("Already acted!", "feedback-error"); return false; }





    // Check range - target must be within caster's attack range + 3


    const spellRange = caster.currentRange + 3;


    const distance = getDistance(caster, targetUnit);


    if (distance > spellRange) {


        showFeedback("Out of range!", "feedback-error");


        return false;


    }





    // Main Target Damage - Use caster's ATK


    const primaryDamage = caster.atk;


    const chainDamage = Math.ceil(caster.atk / 2);





    // Animate lightning from caster to primary target


    if (typeof animateChainLightning === 'function') {


        animateChainLightning(caster, targetUnit);


    }





    // Apply damage to primary target


    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for visual





    // Store primary target position before it potentially dies
    const primaryX = targetUnit.x;
    const primaryY = targetUnit.y;

    // Find ALL connected enemies using flood-fill algorithm (BFS) BEFORE applying damage
    // This ensures the chain is "locked in" even if units are removed from logic array immediately
    const visitedIds = new Set([targetUnit.id]);
    const chainQueue = [{ x: primaryX, y: primaryY, sourceUnit: targetUnit }];
    const chainTargetsOrdered = [];

    while (chainQueue.length > 0) {
        const current = chainQueue.shift();
        const adjacentCells = getAdjacentCells(current.x, current.y, true);
        for (const cell of adjacentCells) {
            const unitAtCell = getUnitAt(cell.x, cell.y);
            if (unitAtCell && unitAtCell.team === 'enemy' && !visitedIds.has(unitAtCell.id) && isUnitAliveAndValid(unitAtCell)) {
                visitedIds.add(unitAtCell.id);
                chainTargetsOrdered.push({
                    unit: unitAtCell,
                    sourceX: current.x,
                    sourceY: current.y,
                    sourceUnit: current.sourceUnit || targetUnit
                });
                chainQueue.push({ x: unitAtCell.x, y: unitAtCell.y, sourceUnit: unitAtCell });
            }
        }
    }

    // Apply damage to primary target
    if (isUnitAliveAndValid(targetUnit)) {
        if (!targetUnit.isInvulnerableForTurn) {
            if (targetUnit.isPolymorphed) {
                targetUnit.hp = targetUnit.maxHp;
                revertPolymorph(targetUnit);
            }
            targetUnit.hp -= primaryDamage;

            // Aggressive Play: Reset damage window for player spells
            if (targetUnit.team === 'enemy') {
                turnsSinceLastDamage = 0;
            }
            if (targetUnit.hp < 0) targetUnit.hp = 0;
            if (typeof showDamagePopup === 'function') showDamagePopup(targetUnit.x, targetUnit.y, primaryDamage);
            if (typeof flashElementOnHit === 'function') flashElementOnHit(targetUnit.element);
            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetUnit);

            if (targetUnit.hp <= 0) {
                // CRITICAL: Do NOT await here if we want the chain to jump immediately
                // removeUnit is async but it updates the units array sync at the top
                removeUnit(targetUnit);
            } else {
                if (targetUnit.type && targetUnit.type.includes('goblin')) playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2');
                if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetUnit);
            }
        }
    }

    // Damage all chained enemies with staggered timing
    for (let i = 0; i < chainTargetsOrdered.length; i++) {
        const chainData = chainTargetsOrdered[i];
        const chainTarget = chainData.unit;
        const sourceUnit = chainData.sourceUnit;

        setTimeout(async () => {
            // Check if target is still valid (it might have died to something else in between, or be a "zombie")
            // Since we removed it from units array sync, isUnitAliveAndValid will return false if it's already dying.
            // BUT we want the chain to visually finish if it was already locked in.
            // Actually, if it died to a PREVIOUS jump in this same cast, it would be in visitedIds and not here.
            // So we just check if it's still in the units array or is currently HP > 0.
            if (chainTarget && chainTarget.hp > 0) {
                if (typeof animateChainLightning === 'function') {
                    animateChainLightning(sourceUnit, chainTarget);
                }
                if (chainTarget.isPolymorphed) {
                    chainTarget.hp = chainTarget.maxHp;
                    revertPolymorph(chainTarget);
                }
                chainTarget.hp -= chainDamage;
                if (chainTarget.team === 'enemy') window.turnsSinceLastDamage = 0;
                if (chainTarget.hp < 0) chainTarget.hp = 0;
                playSfx('chainLightningImpact');
                if (typeof showDamagePopup === 'function') showDamagePopup(chainTarget.x, chainTarget.y, chainDamage);
                if (typeof flashElementOnHit === 'function') flashElementOnHit(chainTarget.element);
                if (typeof updateWorldHpBar === 'function') updateWorldHpBar(chainTarget);

                if (chainTarget.hp <= 0) {
                    await removeUnit(chainTarget);
                } else {
                    if (chainTarget.type && chainTarget.type.includes('goblin')) playSfx(Math.random() < 0.5 ? 'goblinHurt1' : 'goblinHurt2');
                    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(chainTarget);
                }
            }
        }, 150 * (i + 1));
    }

    const baseCooldown = UNIT_DATA.wizard.chainLightningCooldown;
    const reducedCooldown = Math.max(0, baseCooldown - (playerChainLightningCooldownReduction || 0));
    caster.chainLightningCooldown = unlimitedSpellsCheat ? 0 : reducedCooldown;

    if (!unlimitedSpellsCheat) caster.acted = true;
    if (typeof updateUnitInfo === 'function') updateUnitInfo(caster);
    if (typeof renderUnit === 'function') renderUnit(caster);
    playSfx('chainLightning');

    // Trigger Achievement Check
    const totalHits = 1 + chainTargetsOrdered.length;
    checkAchievements('chain_lightning', { count: totalHits });

    // FINAL WIN CHECK: The staggered timeouts call removeUnit which calls checkWinLossConditions.
    // We only call it here for the primary target impact case.
    checkWinLossConditions();


    return true;


}





function castPolymorph(caster, targetUnit) {


    if (!caster || !targetUnit) return false;


    if (caster.polymorphCooldown > 0) { showFeedback("Cooldown!", "feedback-error"); return false; }


    if (caster.acted) { showFeedback("Already acted!", "feedback-error"); return false; }





    // Check range - target must be within caster's attack range + 3


    const spellRange = caster.currentRange + 3;


    const distance = getDistance(caster, targetUnit);


    if (distance > spellRange) {


        showFeedback("Out of range!", "feedback-error");


        return false;


    }





    if (targetUnit.isBoss) { showFeedback("Cannot polymorph Boss!", "feedback-error"); return false; }


    if (targetUnit.isPolymorphed) { showFeedback("Already polymorphed!", "feedback-error"); return false; }





    // Revert any existing sheep from this caster


    if (caster.activePolymorphTargetId) {


        const existingSheep = units.find(u => u.id === caster.activePolymorphTargetId);


        if (existingSheep && existingSheep.isPolymorphed) {


            revertPolymorph(existingSheep);


        }


    }





    // Store original data


    targetUnit.originalType = targetUnit.type;


    targetUnit.originalHp = targetUnit.hp;


    targetUnit.originalMaxHp = targetUnit.maxHp;


    targetUnit.originalAtk = targetUnit.atk;


    targetUnit.originalMov = targetUnit.mov;


    targetUnit.originalRange = targetUnit.range || 1;


    targetUnit.originalName = targetUnit.name;


    targetUnit.originalSpriteVariant = targetUnit.spriteVariant;


    targetUnit.originalVariantType = targetUnit.variantType;





    // Transform to Sheep - Heal to full immediately
    targetUnit.hp = targetUnit.maxHp;
    targetUnit.type = 'sheep';
    targetUnit.name = "Sheep";


    targetUnit.atk = UNIT_DATA.sheep?.baseAtk || 0;


    targetUnit.mov = UNIT_DATA.sheep?.mov || 2;


    targetUnit.range = UNIT_DATA.sheep?.range || 1;


    targetUnit.isPolymorphed = true;


    targetUnit.polymorphTurnsLeft = 3; // Duration


    targetUnit.polymorphSourceId = caster.id;





    // Visuals


    targetUnit.spriteVariant = 'sheep';


    targetUnit.variantType = 'sheep';





    caster.activePolymorphTargetId = targetUnit.id;


    caster.polymorphCooldown = unlimitedSpellsCheat ? 0 : (UNIT_DATA.wizard?.polymorphCooldown || 3);


    if (!unlimitedSpellsCheat) caster.acted = true;





    if (typeof updateUnitInfo === 'function') updateUnitInfo(caster);


    if (typeof renderUnit === 'function') renderUnit(targetUnit);


    if (typeof updateUnitInfo === 'function' && selectedUnit?.id === targetUnit.id) updateUnitInfo(targetUnit);


    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetUnit);


    playSfx('spell_cast');

    // Add to CC tracking for Crowd Control achievement
    if (typeof turnCCApplied !== 'undefined') {
        turnCCApplied.add('polymorph');
        if (turnCCApplied.has('freeze')) checkAchievements('crowd_control_combo');
    }

    return true;


}





function revertPolymorph(unit) {


    if (!unit || !unit.isPolymorphed) return;





    unit.type = unit.originalType;


    unit.name = unit.originalName;


    unit.maxHp = unit.originalMaxHp;


    unit.hp = unit.originalMaxHp; // Heal to full original HP when polymorph breaks (damage applied after)


    unit.atk = unit.originalAtk;


    unit.mov = unit.originalMov;


    unit.range = unit.originalRange;


    unit.spriteVariant = unit.originalSpriteVariant;


    unit.variantType = unit.originalVariantType;





    unit.isPolymorphed = false;


    unit.polymorphTurnsLeft = 0;


    unit.polymorphSourceId = null;





    // Clear reference from caster


    const caster = units.find(u => u.id === unit.polymorphSourceId);


    if (caster && caster.activePolymorphTargetId === unit.id) {


        caster.activePolymorphTargetId = null;


    }





    if (typeof renderUnit === 'function') renderUnit(unit);


    if (typeof updateUnitInfo === 'function' && selectedUnit?.id === unit.id) updateUnitInfo(unit);


}





// Hook into damage logic to break polymorph


// NOTE: This needs to be added to attackUnit or takeDamage function. 


// I will add a check in attackUnit.





function calculateLevelStats() {
    const initialPlayerUnits = Object.values(activeRosterAtLevelStart || {}).reduce((a, b) => a + b, 0);
    const finalPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)).length;

    let canUseAnySpell = Object.keys(spellsUnlocked).some(spell => spellsUnlocked[spell]);
    const bonusGoldNoSpells = (!spellsUsedThisLevel && canUseAnySpell) ? LEVEL_COMPLETE_BONUS_GOLD.noSpells : 0;

    let bonusGoldNoLosses = (unitsLostThisLevel === 0 && finalPlayerUnits > 0) ? LEVEL_COMPLETE_BONUS_GOLD.noLosses : 0;

    const bonusGoldNoArmor = (equippedArmorId === 'none' && unitsLostThisLevel === 0 && finalPlayerUnits > 0) ? LEVEL_COMPLETE_BONUS_GOLD.noArmor : 0;

    // Par bonus: always calculate directly to ensure 100% sync with variables
    const bonusGoldUnderPar = Math.max(0, (window.parTurns - window.turnsCountThisLevel + 1) * 5);

    const bonusExecutioner = (window.failedExecutionerBonus || window.turnsCountThisLevel === 0) ? 0 : LEVEL_COMPLETE_BONUS_GOLD.executioner;

    const isFullHp = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)).every(u => u.hp >= (u.maxHp || u.baseHp || 0));

    const totalBonusGold = bonusGoldNoSpells + bonusGoldUnderPar + bonusGoldNoLosses + bonusExecutioner + bonusGoldNoArmor;

    const totalGoldEarnedThisLevel = baseGoldEarnedThisLevel + totalBonusGold;

    return {
        enemiesKilled: enemiesKilledThisLevel,
        unitsLost: unitsLostThisLevel,
        goldGained: baseGoldEarnedThisLevel,
        bonusGoldNoSpells,
        bonusGoldSpeed: bonusGoldUnderPar,
        bonusGoldNoLosses,
        bonusGoldNoArmor,
        bonusGoldExecutioner: bonusExecutioner,
        totalGoldEarned: totalGoldEarnedThisLevel,
        isFullHp,
        initialPlayerUnits
    };
}





function checkWinLossConditions() {
    if (winCheckTimeout) clearTimeout(winCheckTimeout);

    winCheckTimeout = setTimeout(() => {
        if (!isGameActiveFlag || isGameOver()) return;

        const playersLeft = units.some(u => u.team === 'player' && isUnitAliveAndValid(u));
        if (!playersLeft) { if (!isGameOver()) gameOver(false); return; }

        if (evaluateObjectiveLoss()) return;

        const isCleared = evaluateObjectiveVictory();
        const cagesLeft = obstacles.some(o => o.type.startsWith('cage_') && o.type !== 'cage_broken' && isObstacleIntact(o));

        if (isCleared) {
            if (!levelClearedAwaitingInput) {
                levelClearedAwaitingInput = true;
                units.forEach(u => {
                    if (u.team === 'player' && isUnitAliveAndValid(u)) {
                        u.isFrozen = false; u.frozenTurnsLeft = 0; u.slowedTurnsLeft = 0; u.slowedMovPenalty = 0;
                        u.isNetted = false; u.nettedTurnsLeft = 0;
                        u.isSlowed = false; u.slowedTurnsLeft = 0;
                        u.isBleeding = false; u.bleedingTurnsLeft = 0;
                        const slowBadge = u.element?.querySelector('.status-badge.slow');
                        if (slowBadge) slowBadge.remove();
                        const freezeBadge = u.element?.querySelector('.status-badge.freeze');
                        if (freezeBadge) freezeBadge.remove();
                        const netBadge = u.element?.querySelector('.status-badge.net');
                        if (netBadge) netBadge.remove();
                        if (typeof updateUnitPosition === 'function') updateUnitPosition(u, true);
                        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(u);
                    }
                });
                if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
                if (typeof updateAllUnitVisuals === 'function') updateAllUnitVisuals();
                if (selectedUnit && selectedUnit.team === 'player' && typeof highlightMovesAndAttacks === 'function') {
                    highlightMovesAndAttacks(selectedUnit);
                }
            }

            if (cagesLeft) {
                if (!window.rescueMessageShown) {
                    window.rescueMessageShown = true;
                    if (typeof showFeedback === 'function') showFeedback("Rescue the prisoner!", "feedback-neutral", 3000);
                }
                return;
            }

            if (window.victoryTriggered) return;
            window.victoryTriggered = true;
            playSfx('levelComplete');

            if (typeof deselectUnit === 'function') {
                if (!selectedUnit || selectedUnit.team !== 'player') {
                    deselectUnit(false);
                } else {
                    if (typeof highlightMovesAndAttacks === 'function') highlightMovesAndAttacks(selectedUnit);
                }
            }
            if (typeof setActiveSpell === 'function') setActiveSpell(null);
            if (typeof showFeedback === 'function') showFeedback("Level Cleared! Collect items or Proceed.", "feedback-levelup", 3000);
            if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
            if (typeof updateAllUnitVisuals === 'function') updateAllUnitVisuals();
            if (typeof updateObjectiveDisplay === 'function') updateObjectiveDisplay();
        }
    }, 100);
}





function startNextLevel() {
    if (isGameOver()) return;
    if (victoryMusicPlayer) {
        victoryMusicPlayer.pause();
        victoryMusicPlayer.currentTime = 0;
    }

    if (typeof isSkeletonWorldActive !== 'undefined' && isSkeletonWorldActive) {
        skeletonWorldLevel++;
        if (skeletonWorldLevel > 5) {
            isSkeletonWorldActive = false;
            const rewardGold = 5000;
            playerGold += rewardGold;
            saveGameData();
            if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
            if (typeof showFeedback === 'function') showFeedback(`Skeleton World Clear! Reward: ${rewardGold}G`, "feedback-levelup", 5000);
            if (typeof showLevelSelect === 'function') showLevelSelect();
            return;
        }
        levelClearedAwaitingInput = false;
        pendingFrostNovas = [];
        if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings();
        initGame(currentLevel);
        return;
    }

    currentLevel++;
    levelToRestartOnLoss = currentLevel;
    levelClearedAwaitingInput = false;
    pendingFrostNovas = [];
    if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings();
    initGame(currentLevel);
}

function startSkeletonWorld() {
    isSkeletonWorldActive = true;
    isSkeletonPortalSpawned = false; // Consume the portal
    skeletonWorldLevel = 1;
    saveGameData(); // CRITICAL: Save state before initGame calls loadGameData
    if (typeof hideLevelSelect === 'function') hideLevelSelect();
    initGame(currentLevel);
}


function forfeitLevel() { if (!isGameActiveFlag || isProcessing || isGameOver()) return; isGameActiveFlag = false; levelClearedAwaitingInput = false; stopMusic(); if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null; playSfx('forfeit'); const goldBeforeLevel = playerGold - baseGoldEarnedThisLevel; const penaltyPercentage = 0.05; const startGoldPenalty = Math.floor(goldBeforeLevel * penaltyPercentage); const levelGainLost = baseGoldEarnedThisLevel; const totalPenalty = levelGainLost + startGoldPenalty; const goldBeforePenalty = playerGold; playerGold = Math.max(0, goldBeforeLevel - startGoldPenalty); let messageText = `Level ${currentLevel} Forfeited!<br>`; messageText += `<span style="color: var(--color-error);">Penalty: -${totalPenalty}<span class="icon icon-inline icon-gold"></span></span><br>`; messageText += `Gold Remaining: ${playerGold}<span class="icon icon-inline icon-gold"></span>`; saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showGameOverScreen === 'function') showGameOverScreen(false, messageText, true); }


function gameOver(playerWonGame, customMessage = "", isForfeit = false) { if (isGameOver()) return; isGameActiveFlag = false; levelClearedAwaitingInput = false; stopMusic(); if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null; let messageText = customMessage || ""; let isTrueVictory = playerWonGame; if (!messageText && !isTrueVictory && !isForfeit) { playSfx('gameOver'); const goldBeforeLevel = playerGold - baseGoldEarnedThisLevel; const penaltyPercentage = 0.05; const startGoldPenalty = Math.floor(goldBeforeLevel * penaltyPercentage); const levelGainLost = baseGoldEarnedThisLevel; const totalPenalty = levelGainLost + startGoldPenalty; playerGold = Math.max(0, goldBeforeLevel - startGoldPenalty); messageText = `You have fallen on Level ${currentLevel}!<br>`; messageText += `<span style="color: var(--color-error);">Penalty: -${totalPenalty}<span class="icon icon-inline icon-gold"></span></span><br>`; messageText += `Gold Remaining: ${playerGold}<span class="icon icon-inline icon-gold"></span>`; } else if (!playerWonGame && !isForfeit) playSfx('gameOver'); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showGameOverScreen === 'function') showGameOverScreen(isTrueVictory, messageText, isForfeit); }


function isGameOver() { return typeof isGameOverScreenVisible === 'function' && isGameOverScreenVisible(); }







function getRecruitCost(unitType) { const baseCost = RECRUIT_BASE_COSTS[unitType] || 99999; const ownedCount = playerOwnedUnits[unitType] || 0; return baseCost + (ownedCount * RECRUIT_COST_INCREASE_PER_UNIT); }


function calculateSpellCost(spellName) { const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return 99999; const currentLevel = playerSpellUpgrades[spellName] || 0; if (currentLevel >= config.maxLevel) return Infinity; return config.baseCost + (currentLevel * config.costIncrease); }


function purchaseUnit(unitType) {


    if (!UNIT_DATA[unitType]) {


        console.error(`Invalid unit type: ${unitType}`);


        return { success: false };


    }





    // Level Requirements
    const currentOwned = playerOwnedUnits[unitType] || 0;

    if (unitType === 'champion' && highestLevelReached < CHAMPION_RESCUE_LEVEL) {
        playSfx('error');
        showFeedback(`Requires Level ${CHAMPION_RESCUE_LEVEL}!`, "feedback-error");
        return { success: false };
    }
    if (unitType === 'rogue' && highestLevelReached < ROGUE_RESCUE_LEVEL) {
        playSfx('error');
        showFeedback(`Requires Level ${ROGUE_RESCUE_LEVEL}!`, "feedback-error");
        return { success: false };
    }
    if (unitType === 'archer' && highestLevelReached < ARCHER_RESCUE_LEVEL) {
        playSfx('error');
        showFeedback(`Requires Level ${ARCHER_RESCUE_LEVEL}!`, "feedback-error");
        return { success: false };
    }

    // Level Requirements for 2nd+ units
    if (currentOwned >= 1) {
        const reqLvl = RECRUIT_UNLOCK_LEVELS_MAP[unitType] || 1;
        if (unitType === 'knight' && currentOwned >= 2 && highestLevelReached < reqLvl + 1) {
            playSfx('error');
            showFeedback(`Requires Level ${reqLvl} to recruit more Knights!`, "feedback-error");
            return { success: false };
        }
        if (unitType === 'archer' && highestLevelReached < (ARCHER_RESCUE_LEVEL + 10)) {
            playSfx('error');
            showFeedback(`2nd Archer requires Level ${ARCHER_RESCUE_LEVEL + 10}!`, "feedback-error");
            return { success: false };
        }
        if (unitType === 'champion' && highestLevelReached < (CHAMPION_RESCUE_LEVEL + 10)) {
            playSfx('error');
            showFeedback(`2nd Champion requires Level ${CHAMPION_RESCUE_LEVEL + 10}!`, "feedback-error");
            return { success: false };
        }
        if (unitType === 'rogue' && highestLevelReached < (ROGUE_RESCUE_LEVEL + 10)) {
            playSfx('error');
            showFeedback(`2nd Rogue requires Level ${ROGUE_RESCUE_LEVEL + 10}!`, "feedback-error");
            return { success: false };
        }
    }

    if (unitType === 'wizard' && highestLevelReached < WIZARD_UNLOCK_LEVEL) {


        playSfx('error');


        showFeedback(`Requires Level ${WIZARD_UNLOCK_LEVEL}!`, "feedback-error");


        return { success: false };


    }





    const cost = getRecruitCost(unitType);


    const maxOwned = MAX_OWNED_PER_TYPE; // Or specific limit





    if (currentOwned >= maxOwned) {


        return { success: false };


    }





    // wizard Limit


    if (unitType === 'wizard' && currentOwned >= 1) {


        playSfx('error');


        showFeedback("Limit 1 wizard!", "feedback-error");


        return { success: false };


    }





    if (playerGold < cost) {


        return { success: false };


    }





    playerGold -= cost;


    playerOwnedUnits[unitType] = currentOwned + 1;





    // Auto-add to roster if there's space


    const currentActiveCount = getTotalActiveUnits();


    if (currentActiveCount < maxActiveRosterSize) {


        playerActiveRoster[unitType] = (playerActiveRoster[unitType] || 0) + 1;


        saveGameData(); // Save immediately after adding to roster


        checkAchievements('recruit', { target: unitType, count: playerOwnedUnits[unitType] });
        checkAchievements('roster_full');


        return { success: true, showTroopsPopup: false }; // Don't show popup, just add


    }





    saveGameData(); // Save if not auto-added to roster


    checkAchievements('recruit', { target: unitType, count: playerOwnedUnits[unitType] });


    return { success: true, showTroopsPopup: true };


}


function getUnitUpgradeCost(upgradeType) {


    if (!UNIT_UPGRADE_COSTS.hasOwnProperty(upgradeType)) return 99999;


    const data = UNIT_UPGRADE_COSTS[upgradeType];


    const currentLevel = playerUnitUpgrades[upgradeType] || 0;


    return data.baseCost + (currentLevel * data.costIncrease);


}





function purchaseUnitUpgrade(upgradeType) {


    if (!UNIT_UPGRADE_COSTS.hasOwnProperty(upgradeType)) {


        console.error(`Invalid unit upgrade type: ${upgradeType}`);


        return false;


    }





    // Requirement: Unit must be unlocked first


    const unitType = upgradeType.split('_')[0]; // e.g. 'archer_range' -> 'archer'


    // Special case for 'knight' upgrades if they exist, or just check generic type existence


    // Assuming upgrade keys start with unit type. 


    // Actually, upgrade keys are like 'knight_hp', 'archer_range'.


    // Let's extract the unit type more reliably if possible, or just check if we own any.


    // Simpler: Check if playerOwnedUnits[unitType] > 0.


    // But we need to know the unit type from the upgrade key.


    // Most upgrade keys are formatted as `${unitType}_${stat}`.


    let associatedUnitType = null;


    for (const type in UNIT_DATA) {


        if (upgradeType.startsWith(type)) {


            associatedUnitType = type;


            break;


        }


    }





    if (associatedUnitType && (playerOwnedUnits[associatedUnitType] || 0) <= 0) {


        playSfx('error');


        showFeedback(`Unlock ${UNIT_DATA[associatedUnitType].name} first!`, "feedback-error");


        return false;


    }





    // New Requirement: Level 16+ for Unit Upgrades (General Rule)


    // The user said "upgrades shouldn't be available until unit is unlocked".


    // And "Champion... Level 16. Rogue... Level 31. And the upgrades the same".


    // So if it's a Champion upgrade, it needs Level 16. If Rogue, 31.


    // If it's a generic upgrade (if any), maybe keep the Level 16 rule?


    // Let's enforce the Level Requirements


    let requiredLevel = 16; // Base requirement for upgrades


    if (associatedUnitType === 'champion') requiredLevel = 16;


    if (associatedUnitType === 'rogue') requiredLevel = 31;


    if (associatedUnitType === 'archer') requiredLevel = 10;





    // Also keep the general Level 16 rule for *any* upgrade if not specified? 


    // The prompt said "Unit Upgrades... minimum... Level 16" initially.


    // Then "Champion... 16. Rogue... 31".


    // So: Champion=16, Rogue=31. Others (Knight, Archer, Cleric)? 


    // Let's assume the base Level 16 applies to everything, but Rogue overrides it to 31.


    // Or maybe Knight/Archer are lower?


    // "Unit Upgrades... minimum... Level 16" implies ALL upgrades.


    // So: Max(16, UnitReq).





    const baseUpgradeLevelReq = 16;


    const finalReqLevel = Math.max(baseUpgradeLevelReq, requiredLevel);





    if (highestLevelReached < finalReqLevel) {


        playSfx('error');


        showFeedback(`Requires Level ${finalReqLevel}!`, "feedback-error");


        return false;


    }





    const cost = getUnitUpgradeCost(upgradeType);


    if (playerGold < cost) return false;


    playerGold -= cost;


    playerUnitUpgrades[upgradeType] = (playerUnitUpgrades[upgradeType] || 0) + 1;


    saveGameData();


    return true;


}


function purchaseAbilityUpgrade(abilityId) {


    abilityId = abilityId.replace('upgrade_', '');


    if (!ABILITY_UPGRADE_COSTS.hasOwnProperty(abilityId)) {


        console.error(`Invalid ability upgrade type: ${abilityId}`);


        return false;


    }


    const cost = ABILITY_UPGRADE_COSTS[abilityId];


    if (playerGold < cost || (playerAbilityUpgrades[abilityId] || 0) >= 1) return false;





    // Level Requirements for Abilities


    let requiredLevel = 0;


    if (abilityId === 'upgrade_rogue_quickstrike') requiredLevel = 40;


    if (abilityId === 'upgrade_wizard_polymorph') requiredLevel = WIZARD_UNLOCK_LEVEL;





    if (highestLevelReached < requiredLevel) return false;





    playerGold -= cost;


    playerAbilityUpgrades[abilityId] = 1;
    if (abilityId === 'war_bow') equippedWarBow = true;
    if (abilityId === 'flame_ring') equippedFlameRing = true;


    saveGameData();





    if (abilityId === 'rogue_quickstrike') {


        units.forEach(u => {


            if (u.type === 'rogue') u.canQuickStrike = true;


        });


    } else if (abilityId === 'wizard_polymorph') {


        units.forEach(u => {


            if (u.type === 'wizard') u.canCastPolymorph = true;


        });


    } else if (abilityId === 'war_bow') {


        units.forEach(u => {


            if (u.team === 'player' && u.range > 1) {


                u.baseRange = (u.baseRange || u.range) + 1;


                u.currentRange = u.baseRange;


            }


        });


    }





    return true;


}


function purchaseSpellUpgrade(spellName) { const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return false; const currentUpgradeLevel = playerSpellUpgrades[spellName] || 0; const cost = calculateSpellCost(spellName); const meetsLevelReq = highestLevelReached > config.requiredLevel; if (playerGold >= cost && currentUpgradeLevel < config.maxLevel && meetsLevelReq) { playerGold -= cost; playerSpellUpgrades[spellName]++; saveGameData(); return true; } return false; }

function purchasePassive(passiveId) {
    const cost = PASSIVE_UPGRADE_COSTS[passiveId];
    if (cost === undefined) return false;
    const currentLevel = playerPassiveUpgrades[passiveId] || 0;
    const config = PASSIVE_UPGRADE_CONFIG[passiveId];
    const maxLevel = config ? config.maxLevel : 1;

    if (currentLevel >= maxLevel) return false;

    // Tactical Command has special logic for roster size
    if (passiveId === 'tactical_command') {
        const canBuyMore = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentLevel) < MAX_ACTIVE_ROSTER_SIZE_MAX;
        const requiredLevel = 15 * (currentLevel + 1);
        const meetsLevelReq = highestLevelReached > requiredLevel;
        if (playerGold >= cost && canBuyMore && meetsLevelReq) {
            playerGold -= cost;
            playerPassiveUpgrades.tactical_command = currentLevel + 1;
            maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE + playerPassiveUpgrades.tactical_command;
            saveGameData();
            checkAchievements('roster_full');
            return true;
        }
        return false;
    }

    // Default logic for other passives (upgrade level)
    if (playerGold >= cost) {
        playerGold -= cost;
        playerPassiveUpgrades[passiveId] = currentLevel + 1;
        saveGameData();
        return true;
    }
    return false;
}


function getTotalActiveUnits() { if (!playerActiveRoster) return 0; return Object.values(playerActiveRoster).reduce((sum, count) => sum + (parseInt(count, 10) || 0), 0); } function addUnitToActiveRoster(unitType) { const currentOwned = playerOwnedUnits[unitType] || 0; const currentActive = playerActiveRoster[unitType] || 0; const totalActive = getTotalActiveUnits(); if (currentActive < currentOwned && totalActive < maxActiveRosterSize) { playerActiveRoster[unitType] = currentActive + 1; saveGameData(); checkAchievements('roster_full'); return true; } return false; } function removeUnitFromActiveRoster(unitType) { const currentActive = playerActiveRoster[unitType] || 0; if (currentActive > 0) { playerActiveRoster[unitType] = currentActive - 1; if (playerActiveRoster[unitType] === 0) delete playerActiveRoster[unitType]; saveGameData(); return true; } return false; }






function getProfileKey(baseKey, playerName) {
    const name = playerName || (typeof gameSettings !== 'undefined' ? gameSettings.playerName : null) || "Hero";
    return `${baseKey}_${name}`;
}

function getProfileList() {
    let list = [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY_PROFILES);
        if (stored) {
            list = JSON.parse(stored);
        }
    } catch (e) {
        console.warn("Error parsing profile list, resetting to default.", e);
    }

    // Auto-discovery of "lost" profiles
    try {
        const prefix = STORAGE_KEY_HIGHEST_LEVEL + "_";
        let updated = false;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                const name = key.substring(prefix.length);
                if (name && !list.includes(name)) {
                    list.push(name);
                    updated = true;
                }
            }
        }
        if (updated) {
            localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
        }
    } catch (e) {
        console.warn("Error during profile auto-discovery.", e);
    }

    // Ensure current playerName is in the list
    if (typeof gameSettings !== 'undefined' && gameSettings.playerName && !list.includes(gameSettings.playerName)) {
        list.push(gameSettings.playerName);
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
    }

    return list;
}

function addProfileToList(name) {
    if (!name) return;
    const list = getProfileList();
    if (!list.includes(name)) {
        list.push(name);
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
    }
}

function switchProfile(name, mode = 'normal') {
    if (!name) return;
    saveGameData(); // Save old profile
    updateSetting('playerName', name);

    // Set game mode and reset state FIRST
    gameMode = mode;
    resetProfileState();

    // Persist immediately for new profiles so loadGameData sees it
    const modeKey = getProfileKey(STORAGE_KEY_GAME_MODE, name);
    if (!localStorage.getItem(modeKey)) {
        localStorage.setItem(modeKey, gameMode);
        localStorage.setItem(getProfileKey(STORAGE_KEY_NAKED_CHALLENGE, name), isNakedChallengeActive.toString());
        if (typeof playerOwnedArmor !== 'undefined') localStorage.setItem(getProfileKey(STORAGE_KEY_OWNED_ARMOR, name), JSON.stringify(playerOwnedArmor));
        if (typeof equippedArmorId !== 'undefined') localStorage.setItem(getProfileKey(STORAGE_KEY_EQUIPPED_ARMOR, name), equippedArmorId);
    }

    addProfileToList(name);
    loadGameData();

    if (typeof updateUiForNewLevel === 'function') updateUiForNewLevel();
    if (typeof showLevelSelect === 'function') showLevelSelect();
}

function deleteProfile(name) {
    if (!name) return;
    const profiles = getProfileList();
    const updatedProfiles = profiles.filter(p => p !== name);

    // keys linked to the profile
    const keysToDelete = [
        STORAGE_KEY_HIGHEST_LEVEL, STORAGE_KEY_GOLD, STORAGE_KEY_OWNED_UNITS,
        STORAGE_KEY_ACTIVE_ROSTER, STORAGE_KEY_UNIT_UPGRADES, STORAGE_KEY_SPELL_UPGRADES,
        STORAGE_KEY_ABILITY_UPGRADES, STORAGE_KEY_PASSIVE_UPGRADES, STORAGE_KEY_OWNED_ARMOR,
        STORAGE_KEY_EQUIPPED_ARMOR, STORAGE_KEY_EQUIPPED_HELMET, STORAGE_KEY_EQUIPPED_FLAME_CLOAK,
        STORAGE_KEY_ACHIEVEMENT_PROGRESS, STORAGE_KEY_ARMORY_VISITED, STORAGE_KEY_CHEAT_SPELL_ATK,
        STORAGE_KEY_MAX_ROSTER_SIZE, STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL,
        STORAGE_KEY_SPELL_NOTIFICATIONS_SHOWN, STORAGE_KEY_UNLOCKED_UNITS, STORAGE_KEY_NAKED_CHALLENGE,
        STORAGE_KEY_GAME_MODE,
        STORAGE_KEY_EQUIPPED_WAR_BOW, STORAGE_KEY_EQUIPPED_FLAME_RING, 'shard_upgrades'
    ];

    keysToDelete.forEach(baseKey => {
        localStorage.removeItem(getProfileKey(baseKey, name));
    });

    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(updatedProfiles));

    // If we deleted the active profile, switch to the first available one or "Hero"
    if (gameSettings.playerName === name) {
        const nextHero = updatedProfiles[0] || "";
        updateSetting('playerName', nextHero);
        loadGameData();
    }
}

window.getProfileKey = getProfileKey;
window.getProfileList = getProfileList;
window.addProfileToList = addProfileToList;
window.switchProfile = switchProfile;
window.deleteProfile = deleteProfile;

function markAsCheater() {
    if (!isPlayerCheater) {
        isPlayerCheater = true;
        console.log("Profile permanently marked as cheater.");
        saveGameData();
    }
}


function resetProfileState() {
    // Player Progress / Stats - reset only these, keep board state as-is
    highestLevelReached = 1;
    isSkeletonWorldActive = false;
    skeletonWorldLevel = 0;
    isSkeletonPortalSpawned = false;
    shardUpgradeCount = 0;
    playerGold = 0;
    playerOwnedUnits = { knight: 2, archer: 0, champion: 0, rogue: 0 };
    playerActiveRoster = {};
    activeRosterAtLevelStart = {};
    playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 };
    playerAbilityUpgrades = { rogue_quickstrike: 0, champion_cleave: 0, war_bow: 0, flame_ring: 0, glacier_bow: 0 };
    equippedWarBow = false;
    equippedGlacierBow = false;
    equippedFlameRing = false;
    playerChainLightningCooldownReduction = 0;
    playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
    playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0, evasion: 0, thorns: 0, vampiric_aura: 0, critical_strike: 0 };
    playerOwnedArmor = { grey: 1 };
    equippedArmorId = 'grey';
    equippedHelmetId = 'none';
    equippedFlameCloak = false;
    playerCheatSpellAttackBonus = 0;
    maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE;
    lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN;
    achievementProgress = {};
    seenShopItems = {};
    armoryVisited = false;
    isNakedChallengeActive = (gameMode === 'naked');
    if (isNakedChallengeActive) {
        equippedArmorId = 'none';
        playerOwnedArmor = { none: 1 };
    } else {
        playerOwnedArmor = { grey: 1 };
        equippedArmorId = 'grey';
    }
    unlockedUnits = { knight: true, archer: false, champion: false, rogue: false, wizard: false };
    spellsUnlocked = {};
    spellUnlockNotificationsShown = {};
    currentLevelObjective = OBJECTIVE_TYPES.KILL_ALL;
    lifetimeKills = 0;
    lifetimeGold = 0;
    lifetimeWins = 0;
    lifetimeLosses = 0;
    ownedAvatars = { knight: true };
    selectedAvatar = 'knight';
}

function saveGameData() {
    try {
        const name = gameSettings.playerName;
        addProfileToList(name);
        localStorage.setItem(getProfileKey(STORAGE_KEY_HIGHEST_LEVEL, name), highestLevelReached.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_GOLD, name), playerGold.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_OWNED_UNITS, name), JSON.stringify(playerOwnedUnits));
        localStorage.setItem(getProfileKey(STORAGE_KEY_ACTIVE_ROSTER, name), JSON.stringify(playerActiveRoster));
        localStorage.setItem(getProfileKey(STORAGE_KEY_UNIT_UPGRADES, name), JSON.stringify(playerUnitUpgrades));
        localStorage.setItem(getProfileKey(STORAGE_KEY_SPELL_UPGRADES, name), JSON.stringify(playerSpellUpgrades));
        localStorage.setItem(getProfileKey(STORAGE_KEY_ABILITY_UPGRADES, name), JSON.stringify(playerAbilityUpgrades));
        localStorage.setItem(getProfileKey(STORAGE_KEY_PASSIVE_UPGRADES, name), JSON.stringify(playerPassiveUpgrades));
        localStorage.setItem(getProfileKey(STORAGE_KEY_OWNED_ARMOR, name), JSON.stringify(playerOwnedArmor));
        localStorage.setItem(getProfileKey(STORAGE_KEY_EQUIPPED_ARMOR, name), equippedArmorId);
        localStorage.setItem(getProfileKey(STORAGE_KEY_EQUIPPED_BOOTS, name), equippedBootsId || 'none');
        localStorage.setItem(getProfileKey(STORAGE_KEY_EQUIPPED_HELMET, name), equippedHelmetId || 'none');
        localStorage.setItem(getProfileKey(STORAGE_KEY_EQUIPPED_FLAME_CLOAK, name), equippedFlameCloak.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_EQUIPPED_WAR_BOW, name), equippedWarBow.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_EQUIPPED_FLAME_RING, name), equippedFlameRing.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_EQUIPPED_GLACIER_BOW, name), equippedGlacierBow.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_ACHIEVEMENT_PROGRESS, name), JSON.stringify(achievementProgress));
        localStorage.setItem(getProfileKey(STORAGE_KEY_ARMORY_VISITED, name), armoryVisited.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_CHEAT_SPELL_ATK, name), playerCheatSpellAttackBonus.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_MAX_ROSTER_SIZE, name), maxActiveRosterSize.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL, name), lastTreasureHunterLevel.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_SPELL_NOTIFICATIONS_SHOWN, name), JSON.stringify(spellUnlockNotificationsShown));
        localStorage.setItem(getProfileKey(STORAGE_KEY_NAKED_CHALLENGE, name), isNakedChallengeActive.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_GAME_MODE, name), gameMode);
        localStorage.setItem(getProfileKey(STORAGE_KEY_UNLOCKED_UNITS, name), JSON.stringify(unlockedUnits));
        localStorage.setItem(getProfileKey(STORAGE_KEY_CHAIN_LIGHTNING_REDUCTION, name), playerChainLightningCooldownReduction.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_CHEATER, name), isPlayerCheater.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_SEEN_SHOP_ITEMS, name), JSON.stringify(seenShopItems));
        localStorage.setItem(getProfileKey(STORAGE_KEY_CURRENT_LEVEL, name), currentLevel.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_RESTART_LEVEL, name), levelToRestartOnLoss.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_SKELETON_PORTAL_SPAWNED, name), isSkeletonPortalSpawned.toString());
        localStorage.setItem(getProfileKey('shard_upgrades', name), shardUpgradeCount.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_LIFETIME_KILLS, name), lifetimeKills.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_LIFETIME_GOLD, name), lifetimeGold.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_LIFETIME_WINS, name), lifetimeWins.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_LIFETIME_LOSSES, name), lifetimeLosses.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_OWNED_AVATARS, name), JSON.stringify(ownedAvatars));
        localStorage.setItem(getProfileKey(STORAGE_KEY_SELECTED_AVATAR, name), selectedAvatar);
        localStorage.setItem(getProfileKey(STORAGE_KEY_STASHED_ITEMS, name), JSON.stringify(Array.from(stashedItems)));
        saveSettings();
    } catch (e) { console.warn("Could not save game data.", e); }
}


function loadGameData() {
    try {
        const name = gameSettings.playerName;
        highestLevelReached = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_HIGHEST_LEVEL, name)) || '1', 10) || 1;
        currentLevel = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_CURRENT_LEVEL, name)) || '1', 10) || 1;
        levelToRestartOnLoss = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_RESTART_LEVEL, name)) || currentLevel.toString(), 10) || currentLevel;
        playerGold = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_GOLD, name)) || '0', 10) || 0;
        armoryVisited = localStorage.getItem(getProfileKey(STORAGE_KEY_ARMORY_VISITED, name)) === 'true';
        playerCheatSpellAttackBonus = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_CHEAT_SPELL_ATK, name)) || '0', 10) || 0;
        maxActiveRosterSize = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_MAX_ROSTER_SIZE, name)) || MAX_ACTIVE_ROSTER_SIZE_BASE.toString(), 10) || MAX_ACTIVE_ROSTER_SIZE_BASE;
        lastTreasureHunterLevel = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL, name)) || (-TREASURE_HUNTER_SPAWN_COOLDOWN).toString(), 10) || -TREASURE_HUNTER_SPAWN_COOLDOWN;
        const storedSpellNotifications = localStorage.getItem(getProfileKey(STORAGE_KEY_SPELL_NOTIFICATIONS_SHOWN, name));
        spellUnlockNotificationsShown = storedSpellNotifications ? JSON.parse(storedSpellNotifications) : {};
        isNakedChallengeActive = localStorage.getItem(getProfileKey(STORAGE_KEY_NAKED_CHALLENGE, name)) === 'true';
        gameMode = localStorage.getItem(getProfileKey(STORAGE_KEY_GAME_MODE, name)) || 'normal';
        lifetimeKills = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_LIFETIME_KILLS, name)) || '0', 10) || 0;
        lifetimeGold = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_LIFETIME_GOLD, name)) || '0', 10) || 0;
        lifetimeWins = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_LIFETIME_WINS, name)) || '0', 10) || 0;
        lifetimeLosses = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_LIFETIME_LOSSES, name)) || '0', 10) || 0;
        isSkeletonPortalSpawned = localStorage.getItem(getProfileKey(STORAGE_KEY_SKELETON_PORTAL_SPAWNED, name)) === 'true';
        shardUpgradeCount = parseInt(localStorage.getItem(getProfileKey('shard_upgrades', name)) || '0', 10) || 0;
        equippedGlacierBow = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_GLACIER_BOW, name)) === 'true';
        isPlayerCheater = localStorage.getItem(getProfileKey(STORAGE_KEY_CHEATER, name)) === 'true';

        const storedStashedItems = localStorage.getItem(getProfileKey(STORAGE_KEY_STASHED_ITEMS, name));
        stashedItems = new Set(storedStashedItems ? JSON.parse(storedStashedItems) : []);

        const storedUnlockedUnits = localStorage.getItem(getProfileKey(STORAGE_KEY_UNLOCKED_UNITS, name));
        if (storedUnlockedUnits) {
            unlockedUnits = JSON.parse(storedUnlockedUnits);
        } else {
            // CRITICAL: Reset to default for new game!
            unlockedUnits = { knight: true, archer: false, champion: false, rogue: false, wizard: false };
        }



        const defaultOwnedUnits = { knight: 2, archer: 0, champion: 0, rogue: 0 };
        const storedOwnedUnits = localStorage.getItem(getProfileKey(STORAGE_KEY_OWNED_UNITS, name));
        playerOwnedUnits = storedOwnedUnits ? JSON.parse(storedOwnedUnits) : { ...defaultOwnedUnits };

        // --- Migration: archmage to wizard ---
        if (playerOwnedUnits.archmage !== undefined) {
            playerOwnedUnits.wizard = (playerOwnedUnits.wizard || 0) + playerOwnedUnits.archmage;
            delete playerOwnedUnits.archmage;
        }

        Object.keys(UNIT_DATA).forEach(key => { if (UNIT_DATA[key].team === 'player') { if (!(key in playerOwnedUnits)) playerOwnedUnits[key] = 0; playerOwnedUnits[key] = Math.max(0, Math.min(parseInt(playerOwnedUnits[key] || '0', 10), MAX_OWNED_PER_TYPE)); } }); if (Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) === 0 && highestLevelReached <= 1) playerOwnedUnits = { ...defaultOwnedUnits };
        const storedActiveRoster = localStorage.getItem(getProfileKey(STORAGE_KEY_ACTIVE_ROSTER, name));
        let loadedRoster = storedActiveRoster ? JSON.parse(storedActiveRoster) : {};

        if (loadedRoster.archmage !== undefined) {
            loadedRoster.wizard = (loadedRoster.wizard || 0) + loadedRoster.archmage;
            delete loadedRoster.archmage;
        }

        let totalActive = 0; const validatedRoster = {}; Object.keys(playerOwnedUnits).forEach(type => { if (!UNIT_DATA[type] || UNIT_DATA[type].team !== 'player') return; const ownedCount = playerOwnedUnits[type] || 0; const activeCount = Math.min(ownedCount, parseInt(loadedRoster[type] || '0', 10)); if (activeCount > 0) { if (totalActive + activeCount <= maxActiveRosterSize) { validatedRoster[type] = activeCount; totalActive += activeCount; } else if (totalActive < maxActiveRosterSize) { const canAdd = maxActiveRosterSize - totalActive; validatedRoster[type] = canAdd; totalActive += canAdd; } } }); playerActiveRoster = validatedRoster; if (totalActive === 0 && Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) > 0) { playerActiveRoster = {}; let currentTotal = 0; const ownedOrder = Object.keys(playerOwnedUnits).sort((a, b) => (a === 'knight' ? -1 : (b === 'knight' ? 1 : playerOwnedUnits[b] - playerOwnedUnits[a]))); for (const type of ownedOrder) { if (!UNIT_DATA[type] || UNIT_DATA[type].team !== 'player') continue; const canAdd = Math.min(playerOwnedUnits[type], maxActiveRosterSize - currentTotal); if (canAdd > 0) { playerActiveRoster[type] = canAdd; currentTotal += canAdd; } if (currentTotal >= maxActiveRosterSize) break; } }
        const defaultUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 };
        const storedUnitUpgrades = localStorage.getItem(getProfileKey(STORAGE_KEY_UNIT_UPGRADES, name));
        playerUnitUpgrades = storedUnitUpgrades ? JSON.parse(storedUnitUpgrades) : { ...defaultUnitUpgrades };

        if (playerUnitUpgrades.archmage_hp !== undefined) {
            playerUnitUpgrades.wizard_hp = playerUnitUpgrades.archmage_hp;
            delete playerUnitUpgrades.archmage_hp;
        }
        if (playerUnitUpgrades.archmage_atk !== undefined) {
            playerUnitUpgrades.wizard_atk = playerUnitUpgrades.archmage_atk;
            delete playerUnitUpgrades.archmage_atk;
        }

        Object.keys(defaultUnitUpgrades).forEach(key => { if (!(key in playerUnitUpgrades)) playerUnitUpgrades[key] = defaultUnitUpgrades[key]; playerUnitUpgrades[key] = Math.max(0, parseInt(playerUnitUpgrades[key] || '0', 10)); });
        const defaultAbilityUpgrades = { rogue_quickstrike: 0, champion_cleave: 0, war_bow: 0, flame_ring: 0, glacier_bow: 0 };
        const storedAbilityUpgrades = localStorage.getItem(getProfileKey(STORAGE_KEY_ABILITY_UPGRADES, name));
        playerAbilityUpgrades = storedAbilityUpgrades ? JSON.parse(storedAbilityUpgrades) : { ...defaultAbilityUpgrades };

        if (playerAbilityUpgrades.archmage_polymorph !== undefined) {
            playerAbilityUpgrades.wizard_polymorph = playerAbilityUpgrades.archmage_polymorph;
            delete playerAbilityUpgrades.archmage_polymorph;
        }
        Object.keys(defaultAbilityUpgrades).forEach(key => { if (!(key in playerAbilityUpgrades)) playerAbilityUpgrades[key] = defaultAbilityUpgrades[key]; playerAbilityUpgrades[key] = Math.max(0, Math.min(1, parseInt(playerAbilityUpgrades[key] || '0', 10))); });
        const defaultSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
        const storedSpellUpgrades = localStorage.getItem(getProfileKey(STORAGE_KEY_SPELL_UPGRADES, name));
        playerSpellUpgrades = storedSpellUpgrades ? JSON.parse(storedSpellUpgrades) : { ...defaultSpellUpgrades };
        Object.keys(defaultSpellUpgrades).forEach(key => { if (!(key in playerSpellUpgrades)) playerSpellUpgrades[key] = defaultSpellUpgrades[key]; const maxLvl = SPELL_UPGRADE_CONFIG[key]?.maxLevel ?? 99; playerSpellUpgrades[key] = Math.max(0, Math.min(parseInt(playerSpellUpgrades[key] || '0', 10), maxLvl)); });
        const defaultPassiveUpgrades = { gold_magnet: 0, tactical_command: 0, evasion: 0, thorns: 0, vampiric_aura: 0, critical_strike: 0 };
        const storedPassiveUpgrades = localStorage.getItem(getProfileKey(STORAGE_KEY_PASSIVE_UPGRADES, name));
        playerPassiveUpgrades = storedPassiveUpgrades ? JSON.parse(storedPassiveUpgrades) : { ...defaultPassiveUpgrades };
        Object.keys(defaultPassiveUpgrades).forEach(key => {
            if (!(key in playerPassiveUpgrades)) playerPassiveUpgrades[key] = defaultPassiveUpgrades[key];
            playerPassiveUpgrades[key] = Math.max(0, parseInt(playerPassiveUpgrades[key] || '0', 10));
        });
        maxActiveRosterSize = Math.max(MAX_ACTIVE_ROSTER_SIZE_BASE, Math.min(MAX_ACTIVE_ROSTER_SIZE_BASE + (playerPassiveUpgrades.tactical_command || 0), MAX_ACTIVE_ROSTER_SIZE_MAX));
        const defaultOwnedArmor = { grey: 1 };
        const storedOwnedArmor = localStorage.getItem(getProfileKey(STORAGE_KEY_OWNED_ARMOR, name));
        playerOwnedArmor = storedOwnedArmor ? JSON.parse(storedOwnedArmor) : { ...defaultOwnedArmor };
        playerOwnedArmor['grey'] = Math.max(1, playerOwnedArmor['grey'] || 1); Object.keys(ARMOR_DATA).forEach(id => { if (id !== 'none' && id !== 'grey' && !(id in playerOwnedArmor)) { playerOwnedArmor[id] = 0; } }); Object.keys(playerOwnedArmor).forEach(id => { if (id !== 'grey') playerOwnedArmor[id] = Math.max(0, playerOwnedArmor[id] || 0); });
        equippedArmorId = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_ARMOR, name)) || 'grey';
        equippedBootsId = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_BOOTS, name)) || 'none';



        equippedHelmetId = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_HELMET, name)) || 'none';
        equippedFlameCloak = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_FLAME_CLOAK, name)) === 'true';
        equippedWarBow = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_WAR_BOW, name)) === 'true';
        equippedFlameRing = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_FLAME_RING, name)) === 'true'; if (!playerOwnedArmor[equippedArmorId] && equippedArmorId !== 'none') equippedArmorId = 'grey';

        const storedAvatars = localStorage.getItem(getProfileKey(STORAGE_KEY_OWNED_AVATARS, name));
        ownedAvatars = storedAvatars ? JSON.parse(storedAvatars) : { knight: true };
        selectedAvatar = localStorage.getItem(getProfileKey(STORAGE_KEY_SELECTED_AVATAR, name)) || 'knight';

        const storedAchievements = localStorage.getItem(getProfileKey(STORAGE_KEY_ACHIEVEMENT_PROGRESS, name));
        if (storedAchievements) {
            achievementProgress = JSON.parse(storedAchievements);
        } else {
            achievementProgress = {};
        }

        // Retroactive checks for new achievements
        checkAchievements('roster_full');
        checkAchievements('recruit', { target: 'knight', count: playerOwnedUnits['knight'] || 0 });
        checkAchievements('recruit', { target: 'archer', count: playerOwnedUnits['archer'] || 0 });
        checkAchievements('recruit', { target: 'champion', count: playerOwnedUnits['champion'] || 0 });
        checkAchievements('recruit', { target: 'rogue', count: playerOwnedUnits['rogue'] || 0 });
        checkAchievements('recruit', { target: 'wizard', count: playerOwnedUnits['wizard'] || 0 });
        checkAchievements('collect_armor');
        checkAchievements('all_armor_level');



        checkAchievements('load_game'); // Trigger achievements that check state on load
        checkAchievements('reach_level'); // Retroactive progression achievements based on highest level
        checkAchievements('buy_everything'); // Retroactive shop completion check


        playerChainLightningCooldownReduction = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_CHAIN_LIGHTNING_REDUCTION, name)) || '0', 10) || 0;
        const storedSeenItems = localStorage.getItem(getProfileKey(STORAGE_KEY_SEEN_SHOP_ITEMS, name));
        seenShopItems = storedSeenItems ? JSON.parse(storedSeenItems) : {};
        playerGold = Math.max(0, playerGold); playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); loadSettings(); resetSpellStateForNewLevel();
        pendingFrostNovas = []; if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings();


    } catch (e) {


        console.warn("Load game data error. Starting fresh.", e); highestLevelReached = 1; playerGold = 0; playerOwnedUnits = { knight: 2, archer: 0, champion: 0, rogue: 0 }; maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE; playerActiveRoster = { knight: Math.min(2, maxActiveRosterSize) }; playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 }; playerAbilityUpgrades = { rogue_quickstrike: 0, champion_cleave: 0, war_bow: 0, flame_ring: 0, glacier_bow: 0 }; playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
        playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0, evasion: 0, thorns: 0, vampiric_aura: 0, critical_strike: 0 };
        playerOwnedArmor = { grey: 1 }; equippedArmorId = 'grey';


        equippedHelmetId = 'none';

        pendingFrostNovas = []; if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings();
        equippedFlameCloak = false; achievementProgress = {}; armoryVisited = false; playerCheatSpellAttackBonus = 0; lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN; spellUnlockNotificationsShown = {}; gameSettings = { ...DEFAULT_GAME_SETTINGS }; saveSettings();


    }


}


function loadSettings() { const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS); if (storedSettings) { try { const parsedSettings = JSON.parse(storedSettings); gameSettings = { ...DEFAULT_GAME_SETTINGS, ...parsedSettings }; gameSettings.showHpBars = gameSettings.showHpBars === true; gameSettings.playerName = typeof gameSettings.playerName === 'string' ? gameSettings.playerName.substring(0, 12).trim() : DEFAULT_GAME_SETTINGS.playerName; gameSettings.musicVolume = typeof gameSettings.musicVolume === 'number' ? Math.max(0, Math.min(1, gameSettings.musicVolume)) : DEFAULT_GAME_SETTINGS.musicVolume; gameSettings.sfxVolume = typeof gameSettings.sfxVolume === 'number' ? Math.max(0, Math.min(1, gameSettings.sfxVolume)) : DEFAULT_GAME_SETTINGS.sfxVolume; gameSettings.mute = gameSettings.mute === true; } catch (e) { console.warn("Failed to parse settings, using defaults.", e); gameSettings = { ...DEFAULT_GAME_SETTINGS }; } } else { gameSettings = { ...DEFAULT_GAME_SETTINGS }; } musicVolume = gameSettings.musicVolume; sfxVolume = gameSettings.sfxVolume; isMuted = gameSettings.mute; if (typeof applyMuteState === 'function') applyMuteState(isMuted); if (typeof updateHpBarSettingUI === 'function') updateHpBarSettingUI(gameSettings.showHpBars); if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility(); if (typeof updateMuteButtonVisual === 'function') updateMuteButtonVisual(); if (typeof updateAudioVolumeDisplays === 'function') updateAudioVolumeDisplays(); if (typeof updatePlayerNameInput === 'function') updatePlayerNameInput(); }


function saveSettings() { gameSettings.musicVolume = musicVolume; gameSettings.sfxVolume = sfxVolume; gameSettings.mute = isMuted; try { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(gameSettings)); } catch (e) { console.warn("Could not save settings.", e); } }


function updateSetting(key, value) {


    if (gameSettings.hasOwnProperty(key)) {


        let changed = false;


        if (key === 'playerName' && typeof value === 'string') {
            const cleanName = value.substring(0, 32).trim();


            if (gameSettings.playerName !== cleanName) {


                gameSettings.playerName = cleanName || DEFAULT_GAME_SETTINGS.playerName;


                changed = true;


            }


        } else if (key === 'showHpBars') {


            const boolValue = value === true;


            if (gameSettings.showHpBars !== boolValue) {


                gameSettings.showHpBars = boolValue;


                if (typeof updateWorldHpBarsVisibility === 'function') {
                    // Only update if game has started to avoid "random healthbar" on menu
                    if (gameStarted) updateWorldHpBarsVisibility();
                }


                changed = true;


            }


        } else if (key === 'musicVolume') {


            const numValue = Math.max(0, Math.min(1, parseFloat(value)));


            // Fix: Compare against gameSettings.musicVolume (saved state) to detect change


            if (gameSettings.musicVolume !== numValue) {


                setVolume('music', numValue);


                gameSettings.musicVolume = musicVolume;


                changed = true;


            }


        } else if (key === 'sfxVolume') {


            const numValue = Math.max(0, Math.min(1, parseFloat(value)));


            // Fix: Compare against gameSettings.sfxVolume (saved state) to detect change


            if (gameSettings.sfxVolume !== numValue) {


                setVolume('sfx', numValue);


                gameSettings.sfxVolume = sfxVolume;


                changed = true;


            }


        } else if (key === 'mute') {


            const boolValue = value === true;


            if (gameSettings.mute !== boolValue) {
                if (typeof handleMuteToggle === 'function') {
                    // Force the state without saving here, as we save at the end of updateSetting
                    handleMuteToggle(false, boolValue);
                } else {
                    isMuted = boolValue;
                    if (isMuted) stopMusic(); else startMusicIfNotPlaying();
                    if (typeof updateMuteButtonVisual === 'function') updateMuteButtonVisual();
                }
                gameSettings.mute = boolValue;
                changed = true;
            }


        }


        if (changed) saveSettings();


    }


}





function applyCheatGold(amount) {
    markAsCheater();
    playerGold += amount; playerGold = Math.max(0, playerGold); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof updateShopDisplay === 'function') updateShopDisplay(); if (typeof updateChooseTroopsScreen === 'function') updateChooseTroopsScreen(); playSfx('cheat'); if (typeof showFeedback === 'function') showFeedback(`CHEAT: +${amount} Gold!`, "feedback-cheat");
}


function applyCheatSpellAttack(amount) {
    markAsCheater();
    playerCheatSpellAttackBonus += amount; playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); saveGameData(); playSfx('cheat'); if (typeof showFeedback === 'function') showFeedback(`CHEAT: Spell ATK +${amount}!`, "feedback-cheat"); if (typeof updateSpellUI === 'function') updateSpellUI();
}


function toggleWorldHpBarsVisibility() { updateSetting('showHpBars', !gameSettings.showHpBars); if (typeof updateHpBarSettingUI === 'function') updateHpBarSettingUI(gameSettings.showHpBars); }





function checkAchievements(eventType, data = {}) {


    let achievementUnlocked = false;


    for (const id in ACHIEVEMENT_DATA) {


        const achData = ACHIEVEMENT_DATA[id];


        const progress = achievementProgress[id] || { current: 0, unlocked: false };


        if (progress.unlocked) continue;


        let conditionMet = false;


        const condition = achData.condition;


        try {


            switch (condition.type) {


                case 'kill': if (eventType === 'kill' && data.type === condition.target) { progress.current = (progress.current || 0) + 1; if (progress.current >= condition.count) conditionMet = true; } break;


                case 'kill_multiple': if (eventType === 'kill' && condition.targets.includes(data.type)) { progress.current = (progress.current || 0) + 1; if (progress.current >= condition.count) conditionMet = true; } break;


                case 'kill_boss': if (eventType === 'kill' && data.isBoss && data.world === condition.world) conditionMet = true; break;




                case 'recruit':
                    if (eventType === 'recruit' && data.target === condition.target) {
                        progress.current = data.count;
                        if (progress.current >= condition.count) conditionMet = true;
                    } else if (eventType === 'load_game' && condition.target === 'wizard' && (playerOwnedUnits['wizard'] || 0) >= condition.count) {
                        conditionMet = true;
                    }
                    break;
                case 'rescue':
                    if (eventType === 'rescue' && data.target === condition.target) {
                        progress.current = data.count;
                        if (progress.current >= condition.count) conditionMet = true;
                    }
                    break;


                case 'roster_full': if (eventType === 'recruit' || eventType === 'roster_change' || eventType === 'passive_purchase') { if (getTotalActiveUnits() >= 12) conditionMet = true; } break;


                case 'collect_armor': if (eventType === 'collect_armor' || eventType === 'load_game') { const coreArmorIds = ['green', 'blue', 'red', 'yellow']; const ownedCoreCount = coreArmorIds.filter(armorId => (playerOwnedArmor[armorId] || 0) >= 1).length; progress.current = ownedCoreCount; if (progress.current >= condition.count) conditionMet = true; } break;


                case 'all_armor_level': if (eventType === 'collect_armor' || eventType === 'load_game') { const coreArmorIds = ['green', 'blue', 'red', 'yellow']; const meetLevelCount = coreArmorIds.filter(armorId => (playerOwnedArmor[armorId] || 0) >= condition.level).length; progress.current = meetLevelCount; if (progress.current >= coreArmorIds.length) conditionMet = true; } break;


                case 'total_unit_count': if (eventType === 'recruit' || eventType === 'load_game') { const totalUnits = Object.values(playerOwnedUnits).reduce((sum, count) => sum + count, 0); progress.current = totalUnits; if (progress.current >= condition.count) conditionMet = true; } break;


                case 'chain_lightning': if (eventType === 'chain_lightning') { progress.current = Math.max(progress.current || 0, data.count); if (progress.current >= condition.count) conditionMet = true; } break;


                case 'cleave_multi_hit': if (eventType === 'cleave_multi_hit' && data.count >= condition.count) conditionMet = true; break;


                case 'crowd_control_combo': if (eventType === 'crowd_control_combo') conditionMet = true; break;

                case 'buy_everything':
                    if (eventType === 'buy_everything' || eventType === 'load_game') {
                        const requiredUnits = Object.keys(RECRUIT_BASE_COSTS);
                        const requiredPassives = Object.keys(PASSIVE_UPGRADE_COSTS);
                        const requiredSpells = Object.keys(SPELL_UPGRADE_CONFIG);

                        const allUnits = requiredUnits.every(u => (playerOwnedUnits[u] || 0) >= 1);
                        const allPassives = requiredPassives.every(p => (playerPassiveUpgrades[p] || 0) >= 1);
                        const allSpells = requiredSpells.every(s => (playerSpellUpgrades[s] || 0) >= 1);
                        const allArmor = ['green', 'blue', 'red', 'yellow'].every(a => (playerOwnedArmor[a] || 0) >= 1);

                        if (allUnits && allPassives && allSpells && allArmor) conditionMet = true;
                    }
                    break;

                case 'reach_level': if (eventType === 'level_complete' || eventType === 'load_game' || eventType === 'reach_level') { if (highestLevelReached >= condition.level) conditionMet = true; } break;

                case 'level_complete_condition': if (eventType === 'level_complete') {
                    const isNaked = data.equippedArmor === 'none' || (typeof isNakedChallengeActive !== 'undefined' && isNakedChallengeActive);
                    if (condition.condition === 'no_armor' && isNaked && data.stats?.unitsLost === 0) conditionMet = true;
                    if (condition.condition === 'naked_normal' && isNaked && currentLevel === 60) conditionMet = true;
                    if (condition.condition === 'naked_nightmare' && isNaked && currentLevel === 120) conditionMet = true;
                    if (condition.condition === 'naked_hell' && isNaked && currentLevel === 180) conditionMet = true;
                    if (condition.condition === 'naked_apocalypse' && isNaked && currentLevel === 240) conditionMet = true;
                    if (condition.condition === 'full_hp' && currentLevel >= 25 && currentLevel >= (highestLevelReached - 1) && data.stats?.unitsLost === 0 && (data.stats?.isFullHp || data.stats?.bonusGoldFullHp > 0)) conditionMet = true;
                    if (condition.condition === 'no_losses' && data.stats?.bonusGoldNoLosses > 0) conditionMet = true;
                    if (condition.condition === 'no_spells' && data.stats?.bonusGoldNoSpells > 0) conditionMet = true;
                    if (condition.condition === 'lone_wolf' && currentLevel >= 10 && currentLevel >= (highestLevelReached - 1) && data.stats?.initialPlayerUnits === 1) {
                        conditionMet = true;
                    }
                } break;


            }
        } catch (e) { console.error(`Ach error ${id}:`, e); }


        achievementProgress[id] = progress;


        if (conditionMet && !progress.unlocked) {


            progress.unlocked = true; achievementUnlocked = true;


            if (achData.reward?.gold > 0) {


                playerGold += achData.reward.gold; if (typeof updateGoldDisplay === 'function') updateGoldDisplay();


                setTimeout(() => { if (typeof showFeedback === 'function') showFeedback(`Achievement: ${achData.title} (+${achData.reward.gold}G)!`, 'feedback-achievement-unlock', 4000); playSfx('achievementUnlock'); }, 200);


            } else {


                setTimeout(() => { if (typeof showFeedback === 'function') showFeedback(`Achievement Unlocked: ${achData.title}!`, 'feedback-achievement-unlock', 3500); playSfx('achievementUnlock'); }, 200);


            }


            if (typeof isAchievementsOpen === 'function' && isAchievementsOpen() && typeof updateAchievementsScreen === 'function') updateAchievementsScreen();


        }


    }


    if (achievementUnlocked) saveGameData();


}





window.onerror = function (message, source, lineno, colno, error) {


    console.error("!! Global Error Caught !!", { message, source, lineno, colno, error });


    isProcessing = false;


    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();


    return false;


}





// Audio System Implementation


function toggleMute(forceMute) {
    if (typeof handleMuteToggle === 'function') {
        handleMuteToggle(true, forceMute);
    } else {
        isMuted = forceMute !== undefined ? forceMute : !isMuted;
        if (isMuted) {
            stopMusic();
            if (victoryMusicPlayer) { victoryMusicPlayer.pause(); victoryMusicPlayer.currentTime = 0; }
        } else {
            startMusicIfNotPlaying();
        }
        if (typeof updateMuteButtonVisual === 'function') updateMuteButtonVisual();
        saveSettings();
    }
};


function completeLevelAndShowSummary() {
    isProcessing = true;
    stopMusic();
    playSfx('victory');
    lifetimeWins++;

    // Process Rescued Units
    if (window.rescuedUnitsThisLevel && window.rescuedUnitsThisLevel.length > 0) {
        window.rescuedUnitsThisLevel.forEach(unitType => {
            // Unlocked or not, we record that we rescued it for achievements
            playerOwnedUnits[unitType] = (playerOwnedUnits[unitType] || 0) + 1;

            if (typeof checkAchievements === 'function') {
                checkAchievements('rescue', { target: unitType, count: playerOwnedUnits[unitType] });
            }

            if (!unlockedUnits[unitType]) {
                unlockedUnits[unitType] = true;
                if (typeof showFeedback === 'function')
                    setTimeout(() => showFeedback(`${UNIT_DATA[unitType].name} Unlocked!`, "feedback-levelup", 4000), 1000);
            } else {
                // If already unlocked, just show that we rescued a unit
                if (typeof showFeedback === 'function')
                    setTimeout(() => showFeedback(`${UNIT_DATA[unitType].name} Rescued!`, "feedback-levelup", 4000), 1000);
            }
        });
        saveGameData();
        window.rescuedUnitsThisLevel = []; // Clear
    }

    // Roll for Skeleton Portal Spawn
    if (currentLevel >= 60 && !isSkeletonWorldActive && !isSkeletonPortalSpawned) {
        if (Math.random() < 0.9) {
            isSkeletonPortalSpawned = true;
            saveGameData(); // Ensure portal persists even if map is loaded before next save
            // No need for a separate toast here if it's on the summary screen, 
            // but we'll keep a small feedback for immediate impact.
            if (typeof showFeedback === 'function') {
                setTimeout(() => showFeedback("A mysterious portal has appeared!", "feedback-levelup", 5000), 2000);
            }
        }
    }

    const stats = calculateLevelStats();

    // Clear status effects on surviving player units
    units.forEach(u => {
        if (u.team === 'player' && isUnitAliveAndValid(u)) {
            u.isFrozen = false; u.frozenTurnsLeft = 0; u.slowedTurnsLeft = 0; u.slowedMovPenalty = 0;
            u.isNetted = false; u.nettedTurnsLeft = 0;
            u.isSlowed = false; u.slowedTurnsLeft = 0;
            u.isBleeding = false; u.bleedingTurnsLeft = 0;

            // Remove UI status badges
            const slowBadge = u.element?.querySelector('.status-badge.slow');
            if (slowBadge) slowBadge.remove();
            const freezeBadge = u.element?.querySelector('.status-badge.freeze');
            if (freezeBadge) freezeBadge.remove();
            const netBadge = u.element?.querySelector('.status-badge.net');
            if (netBadge) netBadge.remove();

            if (typeof updateUnitPosition === 'function') updateUnitPosition(u, true);
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(u);
        }
    });

    checkAchievements('level_complete', { stats, equippedArmor: equippedArmorId });


    playerGold += (stats.totalGoldEarned || 0) - (stats.goldGained || 0); // Add bonus gold


    playerGold = Math.max(0, playerGold);


    if (highestLevelReached <= 60 && currentLevel === 60) {


        if (typeof showFeedback === 'function') setTimeout(() => showFeedback("Armory Unlocked!", "feedback-achievement-unlock", 4000), 1000);


    }


    if (currentLevel >= highestLevelReached) highestLevelReached = currentLevel + 1;


    if (typeof saveScoreToLeaderboard === 'function') {


        const achCount = Object.values(achievementProgress || {}).filter(a => a.unlocked).length;
        const armor = typeof equippedArmorId !== 'undefined' ? equippedArmorId : 'grey';
        const helmet = typeof equippedHelmetId !== 'undefined' ? equippedHelmetId : 'none';
        const cloak = typeof equippedFlameCloak !== 'undefined' ? equippedFlameCloak : false;
        const naked = typeof isNakedChallengeActive !== 'undefined' ? isNakedChallengeActive : false;

        const avatarId = typeof selectedAvatar !== 'undefined' ? selectedAvatar : 'knight';
        saveScoreToLeaderboard(currentLevel, playerGold, gameSettings.playerName, achCount, naked, armor, helmet, cloak, avatarId);

        // Attempt online submission
        if (window.OnlineLeaderboard && window.OnlineLeaderboard.isInitialized() && currentLevel >= 5) {
            const isCheater = isPlayerCheater || (typeof unlimitedSpellsCheat !== 'undefined' && unlimitedSpellsCheat) || (typeof playerCheatSpellAttackBonus !== 'undefined' && playerCheatSpellAttackBonus > 0);
            window.OnlineLeaderboard.submitScore(gameSettings.playerName, currentLevel, achCount, isCheater, naked, armor, helmet, cloak, avatarId);
        }


    }


    saveGameData();


    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();


    if (typeof showLevelCompleteScreen === 'function') showLevelCompleteScreen(stats, playerGold);


}





// Debug function to spawn enemies at specific coordinates


function debugSpawnEnemy(enemyType, x, y, variant = 'green') {


    if (!isGameActiveFlag) {


        console.warn('Cannot spawn enemy: game not active');


        return false;


    }





    if (!isCellInBounds(x, y)) {


        console.warn('Cannot spawn enemy: coordinates out of bounds');


        return false;


    }





    if (getUnitAt(x, y) || getObstacleAt(x, y)) {


        console.warn('Cannot spawn enemy: cell occupied');


        return false;


    }





    const unitData = UNIT_DATA[enemyType];


    if (!unitData) {


        console.warn(`Invalid unit type: ${enemyType}`);


        return false;


    }





    // Calculate bonuses based on current level (same as normal spawn)


    let cycle = 0;


    if (currentLevel >= INFINITE_LEVEL_START) {


        cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);


    }


    const infiniteHpBonus = cycle * INFINITE_HP_BONUS_PER_CYCLE;


    const infiniteAtkBonus = cycle * INFINITE_ATK_BONUS_PER_CYCLE;





    // Create the unit (enemy or player)


    const isPlayerUnit = unitData.team === 'player';


    const unit = createUnit(enemyType, x, y, isPlayerUnit ? 'grey' : variant, false, isPlayerUnit ? 0 : infiniteHpBonus, isPlayerUnit ? 0 : infiniteAtkBonus);


    if (!unit) {


        console.warn('Failed to create unit');


        return false;


    }





    // Render the unit


    if (typeof renderUnit === 'function') {


        renderUnit(unit);


    }





    // Create HP bar if enabled


    if (gameSettings.showHpBars && typeof createWorldHpBar === 'function') {


        createWorldHpBar(unit);


    }





    console.log(`Debug spawned: ${unit.name} at (${x}, ${y})`);


    return true;


}





function activateForestArmor() {


    if (equippedArmorId !== 'green' || !forestArmorUses || forestArmorActiveTurns > 0) return;





    const armorLevel = playerOwnedArmor[equippedArmorId] || 1;


    forestArmorActiveTurns = 1; // Lasts 1 turn (until start of next player turn)


    forestArmorUses = false;





    playSfx('armorActivate'); // Assuming this sfx exists, otherwise might need a fallback or new sfx


    showFeedback(`Forest Armor activated! -${armorLevel} enemy ATK for 1 turn`, 'feedback-spell-unlock');





    if (typeof updateAllUnitVisuals === 'function') updateAllUnitVisuals();


    if (typeof updateForestArmorButton === 'function') updateForestArmorButton();
}

/**
 * Instantly kills all enemies on the screen (Cheat).
 */
async function killAllEnemiesCheat() {
    if (typeof cheatsUnlocked === 'undefined' ? !window.cheatsUnlocked : !cheatsUnlocked) return;

    // Mark player as cheater if not already
    if (typeof isPlayerCheater !== 'undefined') isPlayerCheater = true;

    const enemies = units.filter(u => u.team === 'enemy' && isUnitAliveAndValid(u));
    for (const enemy of enemies) {
        enemy.hp = 0;
        if (typeof removeUnit === 'function') await removeUnit(enemy);
    }
    if (typeof checkWinCondition === 'function') checkWinCondition();
}

// Add hotkey '5' for Forest Armor


document.addEventListener('keydown', (e) => {


    if (e.key === '5' && equippedArmorId === 'green' && forestArmorUses && forestArmorActiveTurns <= 0 && !isAnyOverlayVisible()) {


        // Check if input is focused (e.g. player name input)


        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

        e.preventDefault();
        activateForestArmor();
    }
    if (e.key.toLowerCase() === 'c' && selectedUnit && selectedUnit.team === 'player' && selectedUnit.type === 'champion' && playerAbilityUpgrades.champion_cleave > 0 && !isAnyOverlayVisible()) {
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        e.preventDefault();
        toggleChampionCleave(selectedUnit);
    }
});



function isLevelCleared() {


    return levelClearedAwaitingInput;


}

function isGameActive() {
    return isGameActiveFlag;
}
window.isGameActive = isGameActive;

// Redundant functions removed. Using ui.js implementations.


function recalculateAllUnitsStats() {
    units.forEach(u => recalculateUnitStats(u));
}



function rescueUnit(unitType, x, y) {
    // Mark as unlocked if not already
    // Mark as unlocked if not already - MOVED TO LEVEL COMPLETE
    /*
    if (!unlockedUnits[unitType]) {
        unlockedUnits[unitType] = true;
        playerOwnedUnits[unitType] = (playerOwnedUnits[unitType] || 0) + 1; // Give one for free on first unlock
        saveGameData();
    }
    */

    // Auto-add to active roster if space exists
    // playerActiveRoster is an OBJECT {unitType: count}, not an array!
    const currentRosterCount = Object.values(playerActiveRoster).reduce((sum, count) => sum + count, 0);
    if (currentRosterCount < maxActiveRosterSize) {
        playerActiveRoster[unitType] = (playerActiveRoster[unitType] || 0) + 1;
        saveGameData();
    }

    // Spawn the unit for the player to use immediately
    // Unit uses default creation logic (respecting equippedArmorId via ui.js)
    const rescuedUnit = createUnit(unitType, x, y);
    if (rescuedUnit) {
        // Track for level completion unlock
        if (!window.rescuedUnitsThisLevel) window.rescuedUnitsThisLevel = [];
        window.rescuedUnitsThisLevel.push(unitType);

        // Do NOT force 'grey' armor/variant. Let it match player's gear.
        rescuedUnit.isInvulnerableForTurn = true; // Prevent immediate friendly fire death

        units.push(rescuedUnit);
        rescuedUnit.acted = false; // Ready to act

        // Spawn Broken Cage debris
        if (typeof createObstacle === 'function') {
            const debris = createObstacle('cage_broken', x, y);
            if (debris) {
                // Remove the old cage obstacle if it's still there (it might be removed by damage already)
                // But rescueUnit is usually called AFTER removal or triggers removal?
                // Actually rescueUnit is called from destroyObstacle?
                // If so, the old obstacle is gone. We just add the broken one.
                obstacles.push(debris);
                if (typeof renderObstacle === 'function') {
                    // We need to render it to the DOM
                    // renderObstacle(debris); // This might assume parentElement
                    // Better: let the main loop close it or call a targeted update
                    // But we want it instant.
                    const fragment = document.createDocumentFragment();
                    renderObstacle(debris, fragment);
                    if (gridContent) gridContent.appendChild(fragment);
                }
            }
        }

        // Visuals - CRITICAL: Must render the unit to the DOM!
        if (typeof renderUnit === 'function') {
            renderUnit(rescuedUnit);
        }
        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(rescuedUnit);
        if (typeof updateUnitVisuals === 'function') updateUnitVisuals();

        // Rescue dialogue - show speech bubble on the unit
        const rescueDialogues = {
            archer: "Thank you, friend. You have my bow.",
            rogue: "I thought I was finished.. You have my daggers.",
            champion: "I owe you my life! You have my spear!",
        };

        if (unitType === 'wizard') {
            // Wizard has interactive dialogue
            if (typeof showFeedback === 'function') showFeedback(`${UNIT_DATA[unitType].name} Rescued!`, 'feedback-levelup', 3000);
            playSfx('powerup');
            setTimeout(() => {
                if (typeof showWizardDialogue === 'function') {
                    showWizardDialogue(rescuedUnit);
                }
            }, 500);
        } else if (rescueDialogues[unitType]) {
            if (typeof showFeedback === 'function') showFeedback(`${UNIT_DATA[unitType].name} Rescued!`, 'feedback-levelup', 3000);
            playSfx('powerup');
            // Show speech bubble on the rescued unit
            if (rescuedUnit.element && gridContent) {
                setTimeout(() => {
                    const bubbleContainer = document.createElement('div');
                    bubbleContainer.style.position = 'absolute';
                    bubbleContainer.style.left = `calc(${rescuedUnit.x} * var(--cell-size))`;
                    bubbleContainer.style.top = `calc(${rescuedUnit.y} * var(--cell-size))`;
                    bubbleContainer.style.width = 'var(--cell-size)';
                    bubbleContainer.style.height = 'var(--cell-size)';
                    bubbleContainer.style.zIndex = '99999';
                    bubbleContainer.style.pointerEvents = 'none';

                    const bubble = document.createElement('div');
                    bubble.className = 'speech-bubble rescue-speech';
                    if (rescuedUnit.y <= 1) bubble.classList.add('bubble-below');
                    bubble.textContent = rescueDialogues[unitType];

                    if (unitType === 'archer') playSfx('rescue_archer2');
                    else if (unitType === 'champion') playSfx('rescue_champion2');
                    else if (unitType === 'rogue') playSfx('rescue_rogue2');

                    bubbleContainer.appendChild(bubble);
                    const targetOverlay = (typeof unitHpBarsOverlay !== 'undefined' && unitHpBarsOverlay) ? unitHpBarsOverlay : gridContent;
                    targetOverlay.appendChild(bubbleContainer);

                    setTimeout(() => {
                        bubble.classList.add('fade-out');
                        setTimeout(() => bubbleContainer.remove(), 600);
                    }, 5000);
                }, 400);
            }
        } else {
            if (typeof showFeedback === 'function') showFeedback(`${UNIT_DATA[unitType].name} Rescued!`, 'feedback-levelup', 3000);
            playSfx('powerup');
        }
    }
}
window.rescueUnit = rescueUnit;

function showWizardDialogue(wizardUnit) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'wizard-dialogue-overlay';

    const box = document.createElement('div');
    box.className = 'wizard-dialogue-box';

    const portrait = document.createElement('div');
    portrait.className = 'wizard-dialogue-portrait';
    if (typeof getSpritePositionStyles === 'function') {
        const styles = getSpritePositionStyles('wizard', 'portrait');
        portrait.style.backgroundImage = styles.backgroundImage;
        portrait.style.backgroundPosition = styles.backgroundPosition;
        portrait.style.backgroundSize = styles.backgroundSize;
    }

    const textArea = document.createElement('div');
    textArea.className = 'wizard-dialogue-text';

    const nameTag = document.createElement('div');
    nameTag.className = 'wizard-dialogue-name';
    nameTag.textContent = 'Wizard';

    const messageEl = document.createElement('div');
    messageEl.className = 'wizard-dialogue-message';
    messageEl.textContent = 'You have any gold for me?';

    const choicesEl = document.createElement('div');
    choicesEl.className = 'wizard-dialogue-choices';

    const choice1 = document.createElement('button');
    choice1.className = 'wizard-dialogue-choice';
    choice1.textContent = '1) Yes, here is 100 gold.';
    choice1.addEventListener('click', () => {
        playSfx('select');
        playerGold -= Math.min(playerGold, 100);
        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
        saveGameData();

        // Immediately close overlay and show speech bubble on board
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 400);

        if (wizardUnit?.element && gridContent) {
            const bubbleContainer = document.createElement('div');
            bubbleContainer.style.position = 'absolute';
            bubbleContainer.style.left = `calc(${wizardUnit.x} * var(--cell-size))`;
            bubbleContainer.style.top = `calc(${wizardUnit.y} * var(--cell-size))`;
            bubbleContainer.style.width = 'var(--cell-size)';
            bubbleContainer.style.height = 'var(--cell-size)';
            bubbleContainer.style.zIndex = '99999';
            bubbleContainer.style.pointerEvents = 'none';

            const bubble = document.createElement('div');
            bubble.className = 'speech-bubble rescue-speech';
            if (wizardUnit.y <= 1) bubble.classList.add('bubble-below');
            bubble.textContent = 'You have my staff!';

            playSfx('rescue_wizard2');

            bubbleContainer.appendChild(bubble);
            const targetOverlay = (typeof unitHpBarsOverlay !== 'undefined' && unitHpBarsOverlay) ? unitHpBarsOverlay : gridContent;
            targetOverlay.appendChild(bubbleContainer);

            setTimeout(() => { bubble.classList.add('fade-out'); setTimeout(() => bubbleContainer.remove(), 600); }, 4000);
        }
    });

    const choice2 = document.createElement('button');
    choice2.className = 'wizard-dialogue-choice';
    choice2.textContent = '2) Get back in the cage..';
    choice2.addEventListener('click', () => {
        playSfx('select');
        messageEl.textContent = 'Okay okay, 10 gold is fine.';
        choicesEl.innerHTML = '';
        playerGold -= Math.min(playerGold, 10);
        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
        saveGameData();
        const doneBtn = document.createElement('button');
        doneBtn.className = 'wizard-dialogue-choice wizard-dialogue-done';
        doneBtn.textContent = 'Continue';
        doneBtn.addEventListener('click', () => {
            playSfx('select');
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 400);
            if (wizardUnit?.element && gridContent) {
                const bubbleContainer = document.createElement('div');
                bubbleContainer.style.position = 'absolute';
                bubbleContainer.style.left = `calc(${wizardUnit.x} * var(--cell-size))`;
                bubbleContainer.style.top = `calc(${wizardUnit.y} * var(--cell-size))`;
                bubbleContainer.style.width = 'var(--cell-size)';
                bubbleContainer.style.height = 'var(--cell-size)';
                bubbleContainer.style.zIndex = '99999';
                bubbleContainer.style.pointerEvents = 'none';

                const bubble = document.createElement('div');
                bubble.className = 'speech-bubble rescue-speech';
                if (wizardUnit.y <= 1) bubble.classList.add('bubble-below');
                bubble.textContent = "You have my staff!";

                playSfx('rescue_wizard2');

                bubbleContainer.appendChild(bubble);
                const targetOverlay = (typeof unitHpBarsOverlay !== 'undefined' && unitHpBarsOverlay) ? unitHpBarsOverlay : gridContent;
                targetOverlay.appendChild(bubbleContainer);

                setTimeout(() => { bubble.classList.add('fade-out'); setTimeout(() => bubbleContainer.remove(), 600); }, 4000);
            }
        });
        choicesEl.appendChild(doneBtn);
    });

    choicesEl.appendChild(choice1);
    choicesEl.appendChild(choice2);

    textArea.appendChild(nameTag);
    textArea.appendChild(messageEl);
    textArea.appendChild(choicesEl);

    box.appendChild(portrait);
    box.appendChild(textArea);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    // Trigger entrance animation
    requestAnimationFrame(() => overlay.classList.add('visible'));
}
window.showWizardDialogue = showWizardDialogue;

window.debugSpawnTome = function () { const playerUnit = units.find(u => u.team === 'player' && isUnitAliveAndValid(u)); const x = playerUnit ? playerUnit.x : 1; const y = playerUnit ? playerUnit.y : 1; const item = createItem('tome_of_chain_lightning', x, y, 0); if (item && typeof animateItemDrop === 'function') { animateItemDrop([item], x, y); } console.log('Debug: Spawned Tome of Chain Lightning at', x, y); };

function recalculateUnitStats(unit) {
    if (!unit || !isUnitAliveAndValid(unit)) return;

    const baseUnitData = UNIT_DATA[unit.type];
    if (!baseUnitData) return;

    // Re-calculating "Base" ATK
    let calculatedAtk = (baseUnitData.baseAtk || 0);

    if (unit.team === 'player' && !unit.isKeep && !unit.isWagon && !unit.isVillager) {
        let atkUpgradeMultiplier = (unit.type === 'rogue') ? 2 : 1;
        calculatedAtk += (playerUnitUpgrades[`${unit.type}_atk`] || 0) * atkUpgradeMultiplier;
        if (equippedGlacierBow && unit.baseRange > 1) {
            calculatedAtk += 2;
        }
        // Armor
        const armorData = ARMOR_DATA[unit.armor_type || equippedArmorId];
        if (armorData) {
            const armorLevel = playerOwnedArmor[unit.armor_type || equippedArmorId] || 0;
            const atkBonus = armorData.atkBonus || 0;
            calculatedAtk += (atkBonus > 0 ? Math.ceil(armorLevel / 2) : 0);
        }
        calculatedAtk += shardUpgradeCount; // Apply shard bonus
    } else if (unit.team === 'player' && (unit.isKeep || unit.isWagon || unit.isVillager)) {
        // Keep, Wagon and Villager: no bonuses
    } else if (unit.team === 'enemy') {
        // Enemy Scaling
        if (unit.variantType === 'red') {
            calculatedAtk += GOBLIN_RED_ATK_BONUS;
            if (unit.type === 'orc_juggernaut') calculatedAtk++;
        }
        if (unit.isElite) calculatedAtk += ELITE_STAT_BONUS.atk;
        calculatedAtk += (unit.infiniteAtkBonus || 0);
    }
    unit.baseCalculatedAtk = calculatedAtk;

    // HP Calculation (Permanent Upgrades + Shards)
    if (unit.team === 'player' && !unit.isKeep && !unit.isWagon && !unit.isVillager) {
        let calculatedMaxHp = baseUnitData.baseHp + shardUpgradeCount;

        // Armor HP
        const armorDataForHp = ARMOR_DATA[unit.armor_type || equippedArmorId];
        if (armorDataForHp) {
            const armorLevel = playerOwnedArmor[unit.armor_type || equippedArmorId] || 0;
            const hpBonus = armorDataForHp.hpBonus || 0;
            if (armorDataForHp.id === 'yellow') {
                calculatedMaxHp += Math.max(0, armorLevel - 2);
            } else if (armorDataForHp.id === 'none') {
                calculatedMaxHp = 1; // "No Armor" challenge
            } else {
                calculatedMaxHp += (hpBonus > 0 ? Math.ceil(armorLevel / 2) : 0);
            }
        }

        // Apply HP Upgrades (+2 for Knight, +1 for others) - MUST MATCH createUnit
        let hpUpgradeMultiplier = (unit.type === 'knight') ? 2 : 1;
        calculatedMaxHp += (playerUnitUpgrades[`${unit.type}_hp`] || 0) * hpUpgradeMultiplier;

        if (typeof equippedFlameCloak !== 'undefined' && equippedFlameCloak) {
            calculatedMaxHp += 2;
        }

        unit.maxHp = Math.max(1, calculatedMaxHp);
        if (unit.hp > unit.maxHp) unit.hp = unit.maxHp;
    }

    // Apply Totem Auras
    const totems = units.filter(u => u.team === 'enemy' && u.isTotem && isUnitAliveAndValid(u));
    let atkModifier = 0;
    let hasBloodlustAura = false;
    let hasCursedAura = false;

    totems.forEach(totem => {
        const distance = Math.abs(unit.x - totem.x) + Math.abs(unit.y - totem.y);
        const totemRange = UNIT_DATA[totem.type]?.range || 2;

        if (distance <= totemRange && hasLineOfSight(totem, unit)) {
            // Totem auras scale every 60 levels just like baseline ATK
            let totemStrength = 1;
            if (typeof currentLevel !== 'undefined' && currentLevel > 60) {
                totemStrength += Math.floor((currentLevel - 1) / 60);
            }

            if (totem.type === 'bloodlust_totem' && unit.team === 'enemy' && !unit.isTotem) {
                atkModifier += totemStrength;
                hasBloodlustAura = true;
            } else if (totem.type === 'cursed_totem' && unit.team === 'player') {
                atkModifier -= totemStrength;
                hasCursedAura = true;
            }
        }
    });

    // Bloodlust Visual Feedback (Glow when buff is FIRST received)
    if (hasBloodlustAura && !unit.hasBloodlust) {
        if (unit.element) {
            unit.element.classList.remove('unit-glow-red');
            void unit.element.offsetWidth; // Force reflow
            unit.element.classList.add('unit-glow-red');
            playSfx('buff');
        }
    }
    unit.hasBloodlust = hasBloodlustAura;

    // Cursed Visual Feedback (Glow when debuff is FIRST received)
    if (hasCursedAura && !unit.isCursed) {
        if (unit.element) {
            unit.element.classList.remove('unit-glow-purple');
            void unit.element.offsetWidth; // Force reflow
            unit.element.classList.add('unit-glow-purple');
            if (unit.team === 'player') playSfx('debuff');
        }
    }
    unit.isCursed = hasCursedAura;

    // Movement Calculation (Base + Armor Bonuses - Penalties)
    // Use base data as single source of truth to avoid stacking bugs
    let calculatedMov = (unit.team === 'player' && !unit.isKeep && !unit.isWagon && !unit.isVillager)
        ? (baseUnitData.mov || 0)
        : ((unit.baseMov !== undefined) ? unit.baseMov : (baseUnitData.mov || 0));

    // Apply Armor Movement Bonus (e.g. Sand Armor)
    if (unit.team === 'player' && !unit.isKeep && !unit.isWagon && !unit.isVillager) {
        const currentEquippedId = unit.armor_type || equippedArmorId;
        const armorData = ARMOR_DATA[currentEquippedId];
        const armorLevel = playerOwnedArmor[currentEquippedId] || 1;

        if (armorData && armorData.id === 'yellow') {
            calculatedMov += Math.min(2, armorLevel);
        } else if (armorData && armorData.id === 'none') {
            calculatedMov += 1;
        }
    }

    // Only apply bonuses/penalties if the unit is intended to be mobile
    if (calculatedMov > 0) {
        if (unit.variantType === 'red') {
            // Note: Currently no MOV bonus for red in createUnit, but keeping it if intended elsewhere
            // but ONLY if the unit already has movement.
        }

        if (unit.isSlowed || (unit.slowedTurnsLeft && unit.slowedTurnsLeft > 0)) {
            const penalty = unit.slowedMovPenalty || 1;
            // Clamp to 1 for mobile units so they can still move at least 1 square
            calculatedMov = Math.max(1, calculatedMov - penalty);
        }
    } else {
        // Force 0 for immobile units regardless of status effects
        calculatedMov = 0;
    }
    unit.mov = calculatedMov;

    // Range Calculation (Base + Bow Bonuses + Tower)
    let calculatedRange = baseUnitData.range || 1;
    if (unit.team === 'player' && (equippedWarBow || equippedGlacierBow) && calculatedRange > 1) {
        calculatedRange += 1;
    }
    unit.baseRange = calculatedRange;
    if (unit.inTower) {
        const tower = obstacles.find(o => o.id === unit.inTower);
        if (tower) {
            unit.currentRange = unit.baseRange + (tower.rangeBonus || 0);
        } else {
            unit.currentRange = unit.baseRange;
        }
    } else {
        unit.currentRange = unit.baseRange;
    }

    // Apply Weather Debuff
    if (currentLevelObjective === OBJECTIVE_TYPES.WEATHER_RAIN && calculatedRange > 1) {
        unit.currentRange = Math.max(1, unit.currentRange - 1);
    }

    unit.range = unit.currentRange;

    // Ensure min 1 ATK only if base ATK > 0
    let finalAtk = calculatedAtk + atkModifier + (unit.temporaryAttackBonus || 0);
    if (baseUnitData.baseAtk > 0) {
        unit.atk = Math.max(1, finalAtk);
    } else {
        unit.atk = Math.max(0, finalAtk);
    }

    // --- Unit & Totem Dynamic Descriptions ---
    if (unit.team === 'enemy') {
        let levelScale = 0;
        if (typeof currentLevel !== 'undefined' && currentLevel > 60) {
            levelScale = Math.floor((currentLevel - 1) / 60);
        }

        if (unit.isTotem) {
            if (unit.type === 'shaman_totem') {
                let healAmount = (typeof SHAMAN_TOTEM_HEAL !== 'undefined' ? SHAMAN_TOTEM_HEAL : 1) + levelScale;
                unit.description = `Heals nearby allies by ${healAmount} HP.`;
            } else if (unit.type === 'bloodlust_totem') {
                unit.description = `Buffs nearby allies by ${1 + levelScale} ATK.`;
            } else if (unit.type === 'cursed_totem') {
                unit.description = `Curses nearby players by ${1 + levelScale} ATK.`;
            }
        }
    }

    // --- Crit Chance (Player Only) ---
    if (unit.team === 'player') {
        let critPassiveLevel = (typeof playerPassiveUpgrades !== 'undefined' ? (playerPassiveUpgrades.critical_strike || 0) : 0);
        unit.critChance = (1 + critPassiveLevel) / 100; // 1% base + 1% per level (max 6%)
    } else {
        unit.critChance = 0;
    }

    // Update UI if selected
    if (selectedUnit && selectedUnit.id === unit.id && typeof updateUnitInfo === 'function') {
        updateUnitInfo(selectedUnit);
    }

    // --- DECISIVE DEBUG OVERRIDES ---
    if (unit.debugOverrides) {
        if (unit.debugOverrides.atk !== undefined) unit.atk = unit.debugOverrides.atk;
        if (unit.debugOverrides.mov !== undefined) unit.mov = unit.debugOverrides.mov;
        if (unit.debugOverrides.currentRange !== undefined) {
            unit.currentRange = unit.debugOverrides.currentRange;
            unit.range = unit.debugOverrides.currentRange;
        }
        if (unit.debugOverrides.critChance !== undefined) unit.critChance = unit.debugOverrides.critChance;
    }
}

// Exports and Globals to ensure ui.js can access game state
window.equippedArmorId = typeof equippedArmorId !== 'undefined' ? equippedArmorId : 'grey';
window.isProcessing = typeof isProcessing !== 'undefined' ? isProcessing : false;
window.currentTurn = typeof currentTurn !== 'undefined' ? currentTurn : 'player';
window.units = typeof units !== 'undefined' ? units : [];
window.playerOwnedUnits = typeof playerOwnedUnits !== 'undefined' ? playerOwnedUnits : {};
window.playerGold = typeof playerGold !== 'undefined' ? playerGold : 0;
window.fullGameReset = typeof fullGameReset !== 'undefined' ? fullGameReset : function () { location.reload(); };
window.forfeitLevel = typeof forfeitLevel !== 'undefined' ? forfeitLevel : function () { console.warn("forfeitLevel not defined"); };
window.rescueUnit = typeof rescueUnit !== 'undefined' ? rescueUnit : null;
window.recalculateUnitStats = typeof recalculateUnitStats !== 'undefined' ? recalculateUnitStats : null;
window.recalculateAllUnitsStats = typeof recalculateAllUnitsStats !== 'undefined' ? recalculateAllUnitsStats : null;

/**
 * Determines if the Troops tab needs attention (e.g. rescued unit not in roster).
 */
function shouldTroopsGlow() {
    // Check if any owned units are not currently in the active roster
    for (const unitType in playerOwnedUnits) {
        if (playerOwnedUnits[unitType] > 0) {
            const rosterCount = (playerActiveRoster[unitType] || 0);
            if (rosterCount < playerOwnedUnits[unitType]) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Centrally determines if the Barracks (Shop) needs the player's attention.
 * Triggers glow and arrows on the Barracks buttons.
 */
function shouldBarracksGlow() {
    // 1. Armor Check: If player owns armor but hasn't equipped anything better than 'grey'
    const hasBetterArmorOwned = Object.keys(playerOwnedArmor).some(id => id !== 'grey' && id !== 'none' && playerOwnedArmor[id] > 0);
    if (hasBetterArmorOwned && (equippedArmorId === 'grey' || equippedArmorId === 'none')) {
        return true;
    }

    // 2. Recruitment Check (Knight + Rescued Units)
    for (const unitType in UNIT_DATA) {
        if (UNIT_DATA[unitType].team !== 'player') continue;

        const owned = playerOwnedUnits[unitType] || 0;
        const max = MAX_OWNED_PER_TYPE;
        if (owned >= max) continue;

        // Level Requirements
        const unlockLvl = RECRUIT_UNLOCK_LEVELS_MAP[unitType] || 1;
        if (highestLevelReached < unlockLvl) continue;

        // 3rd Knight / 2nd Archer Check
        if (owned >= 1) {
            if (unitType === 'knight' && owned >= 2 && highestLevelReached < unlockLvl + 1) continue;
            else if (unitType !== 'knight' && unitType !== 'wizard' && highestLevelReached < (unlockLvl + 10)) continue;
        }

        // Knight Special Case: Ignore gold check for first-time unlock glow
        const cost = getRecruitCost(unitType);
        const itemId = 'recruit_' + unitType;
        if (playerGold >= cost || (unitType === 'knight' && !seenShopItems[itemId])) {
            if (!seenShopItems[itemId]) return true;
        }
    }

    // 3. Passives Check
    for (const passiveId in PASSIVE_DATA) {
        const passiveLevel = playerPassiveUpgrades[passiveId] || 0;
        if (passiveLevel > 0) continue; // One-time passives for now

        const config = PASSIVE_DATA[passiveId];
        if (config.requiredLevel && highestLevelReached <= config.requiredLevel) continue;

        // Tactical Command special check
        if (passiveId === 'tactical_command') {
            const requiredUnits = (playerPassiveUpgrades.tactical_command || 0) === 0 ? 5 : 8;
            const meetsUnitReq = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0) >= requiredUnits;
            const requiredLevel = 15 * ((playerPassiveUpgrades.tactical_command || 0) + 1);
            if (!meetsUnitReq || highestLevelReached <= requiredLevel) continue;
        }

        const cost = PASSIVE_UPGRADE_COSTS[passiveId] || 999;
        if (playerGold >= cost && !seenShopItems[passiveId]) return true;
    }

    // 4. Equipment Check
    const equipmentItems = [
        { id: 'flame_cloak', cost: 150 },
        { id: 'flame_ring', cost: 100 },
        { id: 'war_bow', cost: 80 },
        { id: 'glacier_bow', cost: 200, reqLvl: 60 }
    ];
    for (const item of equipmentItems) {
        if (item.reqLvl && highestLevelReached < item.reqLvl) continue;
        if (playerGold >= item.cost && !seenShopItems[item.id]) return true;
    }

    // 5. Unit Upgrades Check
    for (const upgradeId in UNIT_UPGRADE_COSTS) {
        const unitType = upgradeId.split('_')[0];
        const stat = upgradeId.split('_')[1];

        let unlockLevel = 1;
        if (unitType === 'archer') unlockLevel = 10;
        else if (unitType === 'champion') unlockLevel = 24;
        else if (unitType === 'rogue') unlockLevel = 40;
        else if (unitType === 'wizard') unlockLevel = 60;
        if (highestLevelReached < unlockLevel) continue;

        const cost = getUnitUpgradeCost(upgradeId);
        if (playerGold >= cost && !seenShopItems[upgradeId]) return true;
    }

    // 6. Spell Upgrades Check
    for (const spellName in SPELL_UPGRADE_CONFIG) {
        const config = SPELL_UPGRADE_CONFIG[spellName];
        const currentLevel = playerSpellUpgrades[spellName] || 0;
        if (currentLevel >= config.maxLevel) continue;

        if (highestLevelReached <= (config.requiredLevel || 0) && currentLevel === 0) continue;

        const cost = calculateSpellCost(spellName);
        if (playerGold >= cost && !seenShopItems['upgrade_' + spellName]) return true;
    }

    // 7. Troops Glow Fallback
    if (shouldTroopsGlow()) return true;

    return false;
}

// Initialize Debug Features
// (No automatic trigger needed; toggled via hotkeys)

function initObjectiveLogic() {
    if (currentLevelObjective === OBJECTIVE_TYPES.KILL_ALL) return;

    // Preserve unitType if it already exists (from Duel selection UI)
    const savedUnitType = (objectiveProgress && objectiveProgress.unitType) ? objectiveProgress.unitType : null;

    objectiveProgress = {};
    if (savedUnitType) objectiveProgress.unitType = savedUnitType;

    objectiveTarget = null;

    switch (currentLevelObjective) {
        case OBJECTIVE_TYPES.DEFEND_CARAVAN:
            // Spawn Wagon at player start area
            const wagonPos = findRandomEmptyTile(0, true); // player area
            if (wagonPos) {
                objectiveTarget = createUnit('wagon', wagonPos.x, wagonPos.y);
                if (objectiveTarget) {
                    objectiveTarget.maxHp = 10 + Math.floor(currentLevel / 2);
                    objectiveTarget.hp = objectiveTarget.maxHp;
                    objectiveTarget.isWagon = true;
                    if (typeof renderUnit === 'function') renderUnit(objectiveTarget);
                }
            }
            break;

        case OBJECTIVE_TYPES.HOLD_THE_KEEP:
            const centerX = Math.floor(currentGridCols / 2), centerY = Math.floor(currentGridRows / 2);
            objectiveProgress.keepPos = { x: centerX, y: centerY };
            // Ensure keep tile is empty by moving units and removing obstacles
            const existingUnit = getUnitAt(centerX, centerY);
            if (existingUnit) moveUnitToEmptyTile(existingUnit);
            const existingObs = getObstacleAt(centerX, centerY);
            if (existingObs) removeObstacle(existingObs);
            objectiveTarget = createUnit('keep', centerX, centerY);
            if (objectiveTarget) {
                objectiveTarget.isKeep = true;
                objectiveTarget.maxHp = 20 + Math.floor(currentLevel / 4);
                objectiveTarget.hp = objectiveTarget.maxHp;
                if (typeof renderUnit === 'function') renderUnit(objectiveTarget);
            }
            break;

        case OBJECTIVE_TYPES.CAPTURE_POINTS:
            objectiveProgress.pointsHeld = 0;
            objectiveProgress.shrinePositions = [];
            for (let i = 0; i < 3; i++) {
                const pos = findRandomEmptyTile(2);
                if (pos) {
                    const shrineObs = createObstacle('shrine', pos.x, pos.y);
                    if (shrineObs && typeof renderObstacle === 'function') renderObstacle(shrineObs);
                    objectiveProgress.shrinePositions.push(pos);
                }
            }
            break;

        case OBJECTIVE_TYPES.SOLO_MISSION:
            const available = Object.keys(unlockedUnits).filter(u => unlockedUnits[u]);
            objectiveProgress.unitType = available[Math.floor(Math.random() * available.length)] || 'knight';
            break;

        case OBJECTIVE_TYPES.GATHER_SUPPLIES:
            objectiveProgress.gathered = 0;
            for (let i = 0; i < 5; i++) {
                const pos = findRandomEmptyTile(1);
                if (pos) {
                    const crateObs = createObstacle('supply_crate', pos.x, pos.y);
                    if (crateObs && typeof renderObstacle === 'function') renderObstacle(crateObs);
                }
            }
            break;

        case OBJECTIVE_TYPES.RECOVER_RELICS:
            objectiveProgress.relics = 0;
            const relicsToSpawn = (OBJECTIVE_CONFIG[OBJECTIVE_TYPES.RECOVER_RELICS] && OBJECTIVE_CONFIG[OBJECTIVE_TYPES.RECOVER_RELICS].relicsToSpawn) || 3;
            for (let i = 0; i < relicsToSpawn; i++) {
                const pos = findRandomEmptyTile(1) || findRandomEmptyTile(2) || findRandomEmptyTile();
                if (pos) {
                    const relicItem = createItem('relic', pos.x, pos.y);
                    if (relicItem && typeof renderItem === 'function') renderItem(relicItem);
                }
            }
            break;

        case OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS:
            objectiveProgress.unitType = objectiveProgress.unitType || null; // Preservation
            const centerX_duel = Math.floor(currentGridCols / 2);
            const enemyDuelPos = { x: centerX_duel, y: 1 };

            // Randomize Boss
            const bossPool = ['goblin_champion', 'orc_juggernaut', 'vtharak', 'cleaver'];
            const bossType = bossPool[Math.floor(Math.random() * bossPool.length)];
            const duelEnemy = createUnit(bossType, enemyDuelPos.x, enemyDuelPos.y);

            if (duelEnemy) {
                duelEnemy.isDuelBoss = true;
                // Stats will be finalized in balanceDuelBoss based on player selection
                if (typeof renderUnit === 'function') renderUnit(duelEnemy);
            }

            // Add some terrain and items to the Duel Arena
            // 1. Center Rocks for cover
            if (centerX_duel > 1) {
                createObstacle('rock_1', centerX_duel - 1, 4);
                createObstacle('rock_2', centerX_duel + 1, 4);
            }

            // 1.5 Frost Totem (Balancing mechanic)
            objectiveProgress.totemPos = { x: 0, y: 1 }; // Corner spot
            const ft = createObstacle('shrine', 0, 1);
            if (ft) {
                ft.name = "Frost Totem";
                ft.isFrostTotem = true;
                ft.clickable = true;
                if (typeof renderObstacle === 'function') renderObstacle(ft);
            }
            objectiveProgress.totemCooldown = 0;

            // 2. Tactical Exploding Barrel near the boss (but not too close)
            createObstacle('exploding_barrel', 1, 2);
            createObstacle('exploding_barrel', currentGridCols - 2, 2);

            // 3. A Health Potion in the middle for the player (Safe Spawn)
            const potionPos = findRandomEmptyTile(0, true); // Search in player area
            if (potionPos) {
                createItem('health_potion', potionPos.x, potionPos.y);
            } else {
                // Fallback to center area if possible, but still check
                const safeX = centerX_duel;
                const safeY = Math.min(currentGridRows - 2, 5);
                const obs = getObstacleAt(safeX, safeY);
                if (!obs || !obs.blocksMove) {
                    createItem('health_potion', safeX, safeY);
                }
            }
            break;

        case OBJECTIVE_TYPES.DEFEND_VILLAGERS:
            objectiveProgress.villagersAlive = 0;
            objectiveProgress.villagerIds = [];
            const villagersToSpawn = (OBJECTIVE_CONFIG[OBJECTIVE_TYPES.DEFEND_VILLAGERS] && OBJECTIVE_CONFIG[OBJECTIVE_TYPES.DEFEND_VILLAGERS].villagersToSpawn) || 5;
            for (let i = 0; i < villagersToSpawn; i++) {
                const vPos = findRandomEmptyTile(1);
                if (vPos) {
                    const villager = createUnit('villager', vPos.x, vPos.y);
                    if (villager) {
                        villager.maxHp = 3 + Math.floor(currentLevel / 10);
                        villager.hp = villager.maxHp;
                        objectiveProgress.villagerIds.push(villager.id);
                        objectiveProgress.villagersAlive++;
                        if (typeof renderUnit === 'function') renderUnit(villager);
                    }
                }
            }
            break;

        case OBJECTIVE_TYPES.RECLAIM_VILLAGE:
            objectiveProgress.housesReclaimed = 0;
            objectiveProgress.housePositions = [];
            const housesToSpawn = (OBJECTIVE_CONFIG[OBJECTIVE_TYPES.RECLAIM_VILLAGE] && OBJECTIVE_CONFIG[OBJECTIVE_TYPES.RECLAIM_VILLAGE].housesToSpawn) || 4;
            for (let i = 0; i < housesToSpawn; i++) {
                const hPos = findRandomEmptyTile(2);
                if (hPos) {
                    const house = createObstacle('shrine', hPos.x, hPos.y);
                    if (house) {
                        house.name = 'Village House';
                        house.isHouse = true;
                        if (typeof renderObstacle === 'function') renderObstacle(house);
                    }
                    objectiveProgress.housePositions.push(hPos);
                }
            }
            break;

        case OBJECTIVE_TYPES.LAVA_FLOW:
            objectiveProgress.lavaWave = 0;
            objectiveProgress.lavaTiles = [];
            objectiveProgress.turnsSinceLastWave = 0;
            break;

        case OBJECTIVE_TYPES.INTIMIDATION:
            objectiveProgress.killsThisTurn = 0;
            objectiveProgress.retreatTriggered = false;
            break;

        case OBJECTIVE_TYPES.WEATHER_RAIN:
            objectiveProgress.rainActive = true;
            // Apply rain visual to all cells
            if (typeof cellElementsMap !== 'undefined') {
                cellElementsMap.forEach(cell => cell.classList.add('tile-rain'));
            }
            break;
    }
    if (typeof updateObjectiveDisplay === 'function') updateObjectiveDisplay();
}


function handleObjectiveTurnUpdates() {
    if (currentLevelObjective === OBJECTIVE_TYPES.KILL_ALL) return;

    switch (currentLevelObjective) {
        case OBJECTIVE_TYPES.DEFEND_CARAVAN:
            // Move wagon towards top (Y decreases)
            if (objectiveTarget && isUnitAliveAndValid(objectiveTarget)) {
                const nextY = objectiveTarget.y - 1;
                if (nextY < 0) {
                    objectiveProgress.success = true;
                    if (typeof showFeedback === 'function') showFeedback("Caravan reached the exit!", "feedback-levelup");
                } else if (!getObstacleAt(objectiveTarget.x, nextY) && !getUnitAt(objectiveTarget.x, nextY)) {
                    // Force move for NPC
                    objectiveTarget.y = nextY;
                    if (typeof updateUnitPosition === 'function') updateUnitPosition(objectiveTarget, true);
                }
            }
            break;
        case OBJECTIVE_TYPES.HOLD_THE_KEEP:
            // Loss is handled by evaluateObjectiveLoss when unit dies
            break;
        case OBJECTIVE_TYPES.CAPTURE_POINTS:
            let points = 0;
            if (objectiveProgress.shrinePositions) {
                objectiveProgress.shrinePositions.forEach(pos => {
                    const u = getUnitAt(pos.x, pos.y);
                    if (u && u.team === 'player') points++;
                });
            }
            objectiveProgress.pointsHeld = points;
            break;
        case OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS:
            // Frost Totem cooldown logic
            if (objectiveProgress.totemCooldown > 0) {
                objectiveProgress.totemCooldown--;
            }
            break;

        case OBJECTIVE_TYPES.DEFEND_VILLAGERS:
            if (objectiveProgress.villagerIds) {
                let aliveCount = 0;
                objectiveProgress.villagerIds.forEach(id => {
                    const villager = units.find(u => u.id === id);
                    if (villager && isUnitAliveAndValid(villager)) {
                        aliveCount++;
                        // Wander logic
                        const adj = getAdjacentCells(villager.x, villager.y, false).filter(c => !getUnitAt(c.x, c.y) && (!getObstacleAt(c.x, c.y) || !getObstacleAt(c.x, c.y).blocksMove));
                        if (adj.length > 0) {
                            const target = adj[Math.floor(Math.random() * adj.length)];
                            villager.x = target.x;
                            villager.y = target.y;
                            if (typeof updateUnitPosition === 'function') updateUnitPosition(villager, true);
                        }
                    }
                });
                objectiveProgress.villagersAlive = aliveCount;
            }
            break;

        case OBJECTIVE_TYPES.RECLAIM_VILLAGE:
            if (objectiveProgress.housePositions) {
                let reclaimed = 0;
                objectiveProgress.housePositions.forEach(pos => {
                    const u = getUnitAt(pos.x, pos.y);
                    if (u && u.team === 'player') reclaimed++;
                });
                objectiveProgress.housesReclaimed = reclaimed;
            }
            break;

        case OBJECTIVE_TYPES.LAVA_FLOW:
            objectiveProgress.turnsSinceLastWave++;
            const lavaConfig = OBJECTIVE_CONFIG[OBJECTIVE_TYPES.LAVA_FLOW] || { waveInterval: 2, lavaDamage: 3 };
            if (objectiveProgress.turnsSinceLastWave >= lavaConfig.waveInterval) {
                objectiveProgress.turnsSinceLastWave = 0;
                const wave = objectiveProgress.lavaWave;

                // Add new lava tiles for this wave
                for (let x = 0; x < currentGridCols; x++) {
                    for (let y = 0; y < currentGridRows; y++) {
                        // Edge expansion
                        if ((x === wave || x === currentGridCols - 1 - wave || y === wave || y === currentGridRows - 1 - wave) &&
                            (x >= wave && x <= currentGridCols - 1 - wave && y >= wave && y <= currentGridRows - 1 - wave)) {
                            if (!objectiveProgress.lavaTiles.some(t => t.x === x && t.y === y)) {
                                objectiveProgress.lavaTiles.push({ x, y });
                                const cell = getCellElement(x, y);
                                if (cell) cell.classList.add('tile-lava');
                            }
                        }
                    }
                }
                objectiveProgress.lavaWave++;
            }
            // Deal damage to all units standing on lava
            objectiveProgress.lavaTiles.forEach(tile => {
                const u = getUnitAt(tile.x, tile.y);
                if (u && isUnitAliveAndValid(u)) {
                    const dmg = lavaConfig.lavaDamage || 3;
                    u.hp -= dmg;
                    if (typeof createDamageText === 'function') createDamageText(u.x, u.y, dmg, 'fire');
                    if (u.hp <= 0) {
                        removeUnit(u);
                    } else if (typeof updateCombatDisplay === 'function') {
                        updateCombatDisplay(u);
                    }
                }
            });
            break;

        case OBJECTIVE_TYPES.INTIMIDATION:
            objectiveProgress.killsThisTurn = 0; // Reset at start of enemy turn (end of player turn)
            break;
    }

    if (typeof updateObjectiveDisplay === 'function') updateObjectiveDisplay();
    checkWinLossConditions();
}

function activateFrostTotem(totem) {
    if (!totem || !totem.isFrostTotem || objectiveProgress.totemCooldown > 0) return;

    playSfx('frostnova_hit'); // Use frostnova sound
    if (typeof createFrostParticles === 'function') createFrostParticles(totem.x, totem.y, 20);

    const boss = units.find(u => u.isDuelBoss && isUnitAliveAndValid(u));
    if (boss) {
        boss.isFrozen = true;
        boss.frozenTurnsLeft = 1; // Freeze for 1 turn (effectively skips their NEXT action if they haven't acted, or current if they have? Actually turns decrease at turn start)
        // Set to 2 if we want to ensure they skip a full turn regardless of when it's activated?
        // Let's stick with 1 turn, usually players act during their turn.
        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(boss);
        if (typeof flashElementOnHit === 'function') flashElementOnHit(boss.element);

        showFeedback("Frost Totem activated! Boss frozen.", "feedback-info");
    } else {
        showFeedback("Frost Totem activated! (No target)", "feedback-info");
    }

    objectiveProgress.totemCooldown = 5; // 5-turn cooldown
}

/**
 * Proportional Stat Balancing for Duel of Champions Boss
 */
function balanceDuelBoss() {
    if (currentLevelObjective !== OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS) return;

    const playerUnit = units.find(u => u.team === 'player' && isUnitAliveAndValid(u));
    const boss = units.find(u => u.isDuelBoss && isUnitAliveAndValid(u));

    if (!playerUnit || !boss) return;

    const playerBase = UNIT_DATA[playerUnit.type];
    const bossBase = UNIT_DATA[boss.type];

    if (!playerBase || !bossBase) return;

    // Proportional Scaling: BossStats = PlayerStats * (BossBase / PlayerBase)
    // This maintains the "difficulty ratio" of the units while keeping it fair

    // HP Scaling
    const hpRatio = bossBase.baseHp / playerBase.baseHp;
    boss.maxHp = Math.max(1, Math.round(playerUnit.maxHp * hpRatio));
    boss.hp = boss.maxHp;

    // ATK Scaling
    const atkRatio = bossBase.baseAtk / playerBase.baseAtk;
    boss.atk = Math.max(1, Math.round(playerUnit.atk * atkRatio));

    // Minimum floor for boss threat (Optional: can add currentLevel influence if desired, 
    // but the ratio already handles player progression)

    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(boss);
}

/**
 * Finds a random tile that is not blocked by units or obstacles
 */
function findRandomEmptyTile(edgeBuffer = 0, playerArea = false) {
    let tiles = [];
    const minY = playerArea ? (currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT)) : edgeBuffer;
    const maxY = playerArea ? currentGridRows : (currentGridRows - edgeBuffer);

    for (let y = minY; y < maxY; y++) {
        for (let x = edgeBuffer; x < currentGridCols - edgeBuffer; x++) {
            if (isCellInBounds(x, y)) {
                const obs = getObstacleAt(x, y);
                const unit = getUnitAt(x, y);
                const item = typeof getItemAt === 'function' ? getItemAt(x, y) : null;

                // STRICT: Must not have unit, must not have item, and must not have ANY obstacle at all
                if (!unit && !item && !obs) {
                    tiles.push({ x, y });
                }
            }
        }
    }
    if (tiles.length === 0) return null;
    return tiles[Math.floor(Math.random() * tiles.length)];
}

/**
 * Checks if current objective victory conditions are met
 */
function evaluateObjectiveVictory() {
    switch (currentLevelObjective) {
        case OBJECTIVE_TYPES.KILL_ALL:
            return !units.some(u => u.team === 'enemy' && !u.isTotem && isUnitAliveAndValid(u));

        case OBJECTIVE_TYPES.DEFEND_CARAVAN:
            if (objectiveProgress.success) return true;
            return !units.some(u => u.team === 'enemy' && !u.isTotem && isUnitAliveAndValid(u));

        case OBJECTIVE_TYPES.HOLD_THE_KEEP:
        case OBJECTIVE_TYPES.SURVIVE_THE_HORDE:
            const turnsNeeded = (OBJECTIVE_CONFIG[currentLevelObjective] && OBJECTIVE_CONFIG[currentLevelObjective].turns) || 15;
            return (window.turnsCountThisLevel - 1) >= turnsNeeded;

        case OBJECTIVE_TYPES.CAPTURE_POINTS:
            const pointsRequired = (OBJECTIVE_CONFIG[currentLevelObjective] && OBJECTIVE_CONFIG[currentLevelObjective].pointsRequired) || 3;
            return (objectiveProgress.pointsHeld || 0) >= pointsRequired;

        case OBJECTIVE_TYPES.GATHER_SUPPLIES:
            const suppliesRequired = (OBJECTIVE_CONFIG[currentLevelObjective] && OBJECTIVE_CONFIG[currentLevelObjective].totalSupplies) || 5;
            return (objectiveProgress.gathered || 0) >= suppliesRequired;

        case OBJECTIVE_TYPES.RECOVER_RELICS:
            const relicsRequired = (OBJECTIVE_CONFIG[currentLevelObjective] && OBJECTIVE_CONFIG[currentLevelObjective].totalRelics) || 3;
            return (objectiveProgress.relics || 0) >= relicsRequired;

        case OBJECTIVE_TYPES.DUEL_OF_CHAMPIONS:
            return !units.some(u => u.isDuelBoss && isUnitAliveAndValid(u));

        case OBJECTIVE_TYPES.SOLO_MISSION:
            return !units.some(u => u.team === 'enemy' && !u.isTotem && isUnitAliveAndValid(u));

        case OBJECTIVE_TYPES.DEFEND_VILLAGERS:
            if (objectiveProgress.villagersAlive >= (OBJECTIVE_CONFIG[OBJECTIVE_TYPES.DEFEND_VILLAGERS].minAlive || 3)) {
                return !units.some(u => u.team === 'enemy' && !u.isTotem && isUnitAliveAndValid(u));
            }
            return false;

        case OBJECTIVE_TYPES.RECLAIM_VILLAGE:
            const housesRequired = (OBJECTIVE_CONFIG[OBJECTIVE_TYPES.RECLAIM_VILLAGE].housesToSpawn || 4);
            return (objectiveProgress.housesReclaimed >= housesRequired) && !units.some(u => u.team === 'enemy' && !u.isTotem && isUnitAliveAndValid(u));

        case OBJECTIVE_TYPES.LAVA_FLOW:
        case OBJECTIVE_TYPES.WEATHER_RAIN:
            return !units.some(u => u.team === 'enemy' && !u.isTotem && isUnitAliveAndValid(u));

        case OBJECTIVE_TYPES.INTIMIDATION:
            return objectiveProgress.retreatTriggered;
    }
    return false;
}

/**
 * Checks for objective-specific immediate losses
 */
function evaluateObjectiveLoss() {
    if (isGameOver()) return true;

    if (currentLevelObjective === OBJECTIVE_TYPES.DEFEND_CARAVAN) {
        if (objectiveTarget && (!isUnitAliveAndValid(objectiveTarget) || objectiveTarget.hp <= 0)) {
            gameOver(false, "The Caravan was destroyed!");
            return true;
        }
    }
    if (currentLevelObjective === OBJECTIVE_TYPES.HOLD_THE_KEEP) {
        if (objectiveTarget && (!isUnitAliveAndValid(objectiveTarget) || objectiveTarget.hp <= 0)) {
            gameOver(false, "The Keep has fallen!");
            return true;
        }
    }
    if (currentLevelObjective === OBJECTIVE_TYPES.DEFEND_VILLAGERS) {
        const minAlive = OBJECTIVE_CONFIG[OBJECTIVE_TYPES.DEFEND_VILLAGERS].minAlive || 3;
        if (objectiveProgress.villagersAlive !== undefined && objectiveProgress.villagersAlive < minAlive) {
            gameOver(false, "Too many villagers died!");
            return true;
        }
    }
    return false;
}
