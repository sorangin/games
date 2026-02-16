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


let playerGold = 0;


let playerOwnedUnits = { knight: 2, archer: 0, champion: 0, rogue: 0 };


let playerActiveRoster = {};


let activeRosterAtLevelStart = {};


let playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 };


let playerAbilityUpgrades = { rogue_quickstrike: 0, war_bow: 0, flame_ring: 0, glacier_bow: 0 };
let equippedWarBow = false;
let equippedGlacierBow = false;
let equippedFlameRing = false;
let playerChainLightningCooldownReduction = 0;


let playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };


let playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 };


let playerOwnedArmor = { grey: 1 };


let equippedArmorId = 'grey';


let equippedHelmetId = 'none'; // New helmet slot


let equippedFlameCloak = false; // Flame Cloak is separate from armor, can be equipped with any armor


let playerCheatSpellAttackBonus = 0;


let maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE;


let lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN;


let gameSettings = { ...DEFAULT_GAME_SETTINGS };


let achievementProgress = {};


let currentGridCols = BASE_GRID_COLS;


let currentGridRows = BASE_GRID_ROWS;


let currentTerrainInfo = { url: '', variant: 'green', name: 'grass', quadrant: 0 };


let deathSpriteTimeouts = new Map();


let forestArmorActiveTurns = 0;


let forestArmorUses = false;


let isProcessing = false;


let pendingFlameWaves = [];
let pendingFrostNovas = []; // Track Kri'zak Frost Nova targets for UI warning


let armoryVisited = false;
let isNakedChallengeActive = false;
let unlockedUnits = { knight: true, archer: false, champion: false, rogue: false, wizard: false };





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
function _bresenhamLOS(startX, startY, endX, endY, canShootOverUnits, startUnitId) {
    if (startX === endX && startY === endY) return true;

    let x = startX; let y = startY;
    const dx = Math.abs(endX - startX); const dy = -Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1; const sy = startY < endY ? 1 : -1;
    let err = dx + dy; let e2;
    let safety = 0; const maxSafety = (currentGridCols + currentGridRows) * 2;

    while (safety < maxSafety) {
        if (!(x === startX && y === startY) && !(x === endX && y === endY)) {
            const obs = getObstacleAt(x, y);
            if (obs && OBSTACLE_DATA[obs.type]?.blocksLOS && isObstacleIntact(obs)) {
                return false;
            }

            // Only check units if the attacker cannot shoot over them
            if (!canShootOverUnits) {
                const unit = getUnitAt(x, y);
                if (unit && unit.id !== startUnitId) {
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
    return true;
}

function hasLineOfSight(startUnit, endPos, ignoreStealthOnTarget = false) {


    if (!startUnit || !endPos) return false;


    const startX = startUnit.x; const startY = startUnit.y;


    const endX = endPos.x; const endY = endPos.y;


    if (startX === endX && startY === endY) return true;


    // Archers (and goblin archers), Wizards, and Pyromancers can shoot over units
    const canShootOverUnits = startUnit.type === 'archer' || startUnit.type === 'goblin_archer' || startUnit.type === 'goblin_pyro' || startUnit.type === 'wizard';

    // Symmetric LOS: check both directions — if either ray is clear, LOS is granted
    const forwardClear = _bresenhamLOS(startX, startY, endX, endY, canShootOverUnits, startUnit.id);
    const reverseClear = _bresenhamLOS(endX, endY, startX, startY, canShootOverUnits, startUnit.id);

    if (!forwardClear && !reverseClear) return false;


    const endUnit = getUnitAt(endX, endY);
    if (endUnit && endUnit.id !== startUnit.id && endUnit.isStealthed && !ignoreStealthOnTarget && getDistance(startUnit, endUnit) > 1) {


        return false;


    }


    return true;


}





async function preloadAssetsAndStart() {


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


    // Reset aggressive play tracking for UI
    if (typeof updateParUI === 'function') updateParUI();


    selectedUnit = null;


    validMoves = [];


    validAttacks = { units: [], obstacles: [] };


    currentTurn = 'player';


    gridState = [];


    clearLevelItemsAndObstacles();


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
    resetLevelState();
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


    levelToRestartOnLoss = currentLevel;


    activeRosterAtLevelStart = { ...playerActiveRoster };





    resetLevelState();


    calculateGridDimensions(currentLevel);


    resetSpellStateForNewLevel();





    try {


        if (typeof calculateCellSize === 'function') calculateCellSize();


        currentTerrainInfo = getTilesetForLevel(currentLevel);


        if (typeof setupBoard === 'function') setupBoard(currentTerrainInfo.url);


        if (typeof updateUiForNewLevel === 'function') updateUiForNewLevel();





        // Reset level-specific flags
        window.rescueMessageShown = false;
        window.victoryTriggered = false; // Ensure victory flag is also reset

        initializeGridState();


        spawnObstacles();


        spawnInitialUnits();


        applyArmorBonuses();


        spawnEnemies();


        spawnItems();


        spawnBarrelsAndCrates();





        units.forEach(u => {


            u.acted = false; u.actionsTakenThisTurn = 0;


            u.isFrozen = false; u.frozenTurnsLeft = 0; u.slowedTurnsLeft = 0; u.slowedMovPenalty = 0;


            u.isNetted = false; u.nettedTurnsLeft = 0;


            u.isSlowed = false; u.slowedTurnsLeft = 0;


            u.isStealthed = false; u.quickStrikeActive = false;


            u.stealthAttackBonusUsed = false; u.netCooldownTurnsLeft = 0;


            u.totemCooldown = 0; u.flameWaveCooldown = 0;


            u.inTower = null; u.currentRange = u.baseRange;


            u.unstealthedThisTurn = false; // Reset re-stealth prevention
        });

        // Ensure all unit stats (including bow bonuses) are calculated correctly from turn 1
        if (typeof recalculateAllUnitsStats === 'function') recalculateAllUnitsStats();





        if (typeof renderAll === 'function') renderAll();


        if (typeof createAllWorldHpBars === 'function') createAllWorldHpBars();


        if (typeof applyLayout === 'function') applyLayout();


        if (typeof centerView === 'function') centerView(true);





        // playSfx('startBeep'); // Removed per user request


        playerTurnCount = 1; // Start at turn 1


        selectAndLoadMusic();


        startMusicIfNotPlaying();





        // Fix for syncing issues: Reset specific UI trackers AND update UI with finalized parTurns

        if (typeof updateParUI === 'function') updateParUI();

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
        else if (currentLevel === 24 && !unlockedUnits.champion) cageType = 'cage_champion';
        else if (currentLevel === 40 && !unlockedUnits.rogue) cageType = 'cage_rogue';
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


    const archetypes = ['open', 'choke', 'arena', 'maze', 'river', 'village'];


    let archetype = archetypes[Math.floor(Math.random() * archetypes.length)];





    // Theme-based preferences


    if (currentTerrainInfo.name === 'castle') {


        archetype = Math.random() < 0.6 ? 'village' : (Math.random() < 0.5 ? 'arena' : 'choke');


    } else if (currentTerrainInfo.name === 'snow') {


        archetype = Math.random() < 0.4 ? 'river' : (Math.random() < 0.5 ? 'open' : 'maze');


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





                    console.log(`Cleared tower entrance at (${cell.x}, ${cell.y}) for tower at (${towerX}, ${towerY})`);


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


    const rosterOrder = Object.keys(playerActiveRoster).sort();


    for (const unitType of rosterOrder) {


        const count = playerActiveRoster[unitType] || 0;


        for (let i = 0; i < count && posIndex < shuffledPlayerPositions.length; i++) {


            const pos = shuffledPlayerPositions[posIndex++];


            if (pos) createUnit(unitType, pos.x, pos.y);


            else break;


        }


        if (posIndex >= shuffledPlayerPositions.length) break;


    }


    if (units.filter(u => u.team === 'player').length === 0) {


        const totalOwned = Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0);


        gameOver(false, totalOwned > 0 ? "Error: No units placed from roster. Check 'Choose Troops'." : "No units available!");


    }


}





// Helper: Get enemy pool filtered by intro levels


// Helper: Get enemy pool filtered by intro levels
function getFilteredEnemyPool(effectivePool, introUnitsThisLevel, introLevels) {
    const filterFn = (type) => {
        if (introUnitsThisLevel.includes(type)) return false;

        // Use lookup if available, otherwise assume no intro level requirement (or 1)
        const requiredLevel = introLevels && introLevels[type] ? introLevels[type] : 0;
        if (currentLevel < requiredLevel) return false;

        // Biome restrictions for specific shamans
        if (type === 'goblin_blood_caller' || type === 'goblin_witchdoctor') {
            const worldInfo = getTilesetForLevel(currentLevel);
            if (type === 'goblin_blood_caller' && worldInfo.name !== 'castle') return false;
            if (type === 'goblin_witchdoctor' && worldInfo.name !== 'grass') return false;
        }

        return true;
    };

    return {
        common: (effectivePool.common || []).filter(filterFn),
        uncommon: (effectivePool.uncommon || []).filter(filterFn),
        rare: (effectivePool.rare || []).filter(filterFn),
        boss: effectivePool.boss
    };
}





// Helper: Determine special enemy spawns (bosses, treasure hunters, etc.)


function getSpecialEnemySpawns(filteredPool, unitsToSpawnTypes) {


    const specialUnits = [];





    // Check for Juggernaut spawn


    const isJuggernautLevel = (currentLevel >= JUGGERNAUT_INTRO_LEVEL && currentLevel % JUGGERNAUT_SPAWN_LEVEL_MULTIPLE === 0);


    if (isJuggernautLevel && filteredPool.boss?.length > 0) {


        // ALWAYS force Orc Juggernaut on final world levels (15, 30, 45, 60), never Zul'kash


        const bossType = 'orc_juggernaut';


        if (!unitsToSpawnTypes.includes(bossType)) {


            specialUnits.push(bossType);


        }


    }





    // Check for Treasure Hunter spawn


    if (currentLevel >= GOBLIN_TREASURE_HUNTER_INTRO_LEVEL &&


        (currentLevel - lastTreasureHunterLevel) >= TREASURE_HUNTER_SPAWN_COOLDOWN &&


        Math.random() < TREASURE_HUNTER_SPAWN_CHANCE) {


        specialUnits.push('goblin_treasure_hunter');


        lastTreasureHunterLevel = currentLevel;


        saveGameData();


    }





    // Check for Goblin Mother spawn


    if (currentLevel >= GOBLIN_MOTHER_INTRO_LEVEL &&


        Math.random() < GOBLIN_MOTHER_SPAWN_CHANCE &&


        !unitsToSpawnTypes.includes('goblin_mother')) {


        specialUnits.push('goblin_mother');


    }





    // Check for V'tharak spawn
    if (currentLevel >= V_THARAK_INTRO_LEVEL &&
        Math.random() < V_THARAK_SPAWN_CHANCE &&
        !unitsToSpawnTypes.includes('vtharak')) {
        specialUnits.push('vtharak');
    }

    // Check for Zulkash spawn
    if (currentLevel >= ZULKASH_INTRO_LEVEL &&
        Math.random() < ZULKASH_SPAWN_CHANCE &&
        !unitsToSpawnTypes.includes('zulkash')) {
        specialUnits.push('zulkash');
    }

    // Check for Zulfar spawn
    if (currentLevel >= ZULFAR_INTRO_LEVEL &&
        Math.random() < ZULFAR_SPAWN_CHANCE &&
        !unitsToSpawnTypes.includes('zulfar')) {
        specialUnits.push('zulfar');
    }

    // Check for Krizak spawn (Winter levels level 226+ only)
    const worldInfo = getTilesetForLevel(currentLevel);
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
        'goblin_shadowstalker': GOBLIN_SHADOWSTALKER_INTRO_LEVEL
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





function spawnEnemies() {


    const occupied = new Set(units.map(u => `${u.x},${u.y}`));


    obstacles.forEach(obs => {


        if (obs.blocksMove && !obs.enterable) {


            occupied.add(`${obs.x},${obs.y}`);


        }


    });






    // Calculate infinite mode bonuses


    let cycle = 0;


    if (currentLevel >= INFINITE_LEVEL_START) {


        cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);


    }


    const infiniteHpBonus = cycle * INFINITE_HP_BONUS_PER_CYCLE;


    const infiniteAtkBonus = cycle * INFINITE_ATK_BONUS_PER_CYCLE;





    // Calculate spawn area and enemy count


    const enemySpawnMaxY = Math.min(


        Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT) - 1,


        currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT) - 1 - MIN_ENEMY_PLAYER_START_DISTANCE


    );


    const numEnemiesBase = 3 + Math.floor(currentLevel / 2.5);


    const numEnemies = Math.min(numEnemiesBase, Math.floor(currentGridCols * (enemySpawnMaxY + 1) * 0.4));





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

    // Updated Blitz Formula: Stricter calculation to reduce excess turns
    // (Grid/5) + (Enemies * 0.65) + (Bosses * 3)
    window.parTurns = Math.floor(((currentGridCols + currentGridRows) / 5) + (enemyCount * 0.65) + (bossCount * 3));

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


        ... ((({


            knockback, cleaveDamage, canNet, canSummonTotem, totemType,


            suicideExplode, explodeOnDeath, explosionDamage, explosionRadius,



            shootsProjectileType, meleeOnlyAttack, baseMeleeAtk, canCastFlameWave, flameWaveRows,


            fireballDamage, flameWaveDamage, isTreasureHunter, flees, fireballRadius,


            canStealth, canQuickStrike, isBoss, dropsArmor, dropsWarBow, dropsFlameCloak, dropsFlameRing, dropsGlacierBow, dropsGoblinMotherSkull, isTotem, healAmount,
            canCastFrostNova, frostNovaCooldown, scale,
            isBloodlustTotem, buffAmount, isCursedTotem, debuffAmount, forceCssVariant,
            ability, spawnCooldown

        }) => ({


            knockback: knockback ?? false, cleaveDamage: cleaveDamage ?? 0, canNet: canNet ?? false,


            canSummonTotem: canSummonTotem ?? false, totemType: totemType ?? null,


            suicideExplode: suicideExplode ?? false, explodeOnDeath: explodeOnDeath ?? false,


            explosionDamage: explosionDamage ?? 0, explosionRadius: explosionRadius ?? 0,


            shootsProjectileType: shootsProjectileType ?? null, meleeOnlyAttack: meleeOnlyAttack ?? false,


            baseMeleeAtk: baseMeleeAtk ?? 0, canCastFlameWave: canCastFlameWave ?? false, flameWaveRows: flameWaveRows ?? 1,


            fireballDamage: fireballDamage ?? PYRO_FIREBALL_DAMAGE, flameWaveDamage: flameWaveDamage ?? PYRO_FLAME_WAVE_DAMAGE,


            isTreasureHunter: isTreasureHunter ?? false, flees: flees ?? false, fireballRadius: fireballRadius ?? 0,
            canStealth: canStealth ?? false, canQuickStrike: canQuickStrike ?? false,
            isBoss: isBoss ?? false, dropsArmor: dropsArmor ?? false, dropsWarBow: dropsWarBow ?? false, dropsFlameCloak: dropsFlameCloak ?? false, dropsFlameRing: dropsFlameRing ?? false,
            dropsGlacierBow: dropsGlacierBow ?? false, dropsGoblinMotherSkull: dropsGoblinMotherSkull ?? false,
            canCastFrostNova: canCastFrostNova ?? false, frostNovaCooldown: frostNovaCooldown ?? 0, isChargingFrostNova: false, frostNovaTarget: null, scale: scale ?? 1.0,
            isTotem: isTotem ?? false, healAmount: healAmount ?? 0,
            isBloodlustTotem: isBloodlustTotem ?? false, buffAmount: buffAmount ?? 0,
            isCursedTotem: isCursedTotem ?? false, debuffAmount: debuffAmount ?? 0,
            forceCssVariant: forceCssVariant ?? null,

            ability: ability ?? null, spawnCooldown: spawnCooldown ?? 0


        }))(data)),


        netCooldownTurnsLeft: 0,


        totemCooldown: 0,


        flameWaveCooldown: 0,


        spriteUrl: '',


        portraitUrl: '',


        deadSpriteUrl: '',


    };





    unit.maxHp = unit.baseHp;


    unit.atk = unit.baseAtk;


    unit.mov = unit.baseMov;





    if (unit.team === 'player') {


        unit.variantType = unit.armor_type || 'grey';

        // Apply armor-specific bonuses from ARMOR_DATA
        const armorData = ARMOR_DATA[unit.armor_type || equippedArmorId];
        if (armorData) {
            unit.maxHp += armorData.hpBonus || 0;
            unit.atk += armorData.atkBonus || 0;
            unit.mov += armorData.movBonus || 0;
        }
        // Ensure minimum 1 HP (for No Armor which has hpBonus: -99)
        if (unit.maxHp < 1) unit.maxHp = 1;

        unit.maxHp += playerUnitUpgrades[`${type}_hp`] || 0;
        if (equippedFlameCloak) unit.maxHp += 2;
        unit.atk += playerUnitUpgrades[`${type}_atk`] || 0;
        if (equippedGlacierBow && unit.baseRange > 1) {
            unit.atk += 2;
        }


        if (type === 'rogue' && playerAbilityUpgrades.rogue_quickstrike > 0) {


            unit.canQuickStrike = true;


        }


        if (type === 'wizard' && playerAbilityUpgrades.wizard_polymorph > 0) {


            unit.canCastPolymorph = true;


        }

        // Apply War Bow range bonus to ranged units
        if ((equippedWarBow || equippedGlacierBow) && unit.baseRange > 1) {
            unit.baseRange += 1;
            unit.currentRange = unit.baseRange;
        }
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


            prefix = 'Azure '; unit.maxHp += GOBLIN_BLUE_HP_BONUS; unit.inflictsSlow = true;


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





        if (prefix) { unit.name = `${prefix}${unit.name}`; }


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


            const baseUnitData = UNIT_DATA[unit.type]; if (!baseUnitData) return;


            // Store current HP percentage to maintain it after maxHp change


            const hpPercentage = unit.hp / unit.maxHp;





            const armorLevel = playerOwnedArmor[equippedArmorId] || 0;





            unit.maxHp = (baseUnitData.baseHp || 1) + (playerUnitUpgrades[`${unit.type}_hp`] || 0);
            if (equippedFlameCloak) unit.maxHp += 2;
            unit.atk = (baseUnitData.baseAtk || 0) + (playerUnitUpgrades[`${unit.type}_atk`] || 0);
            if (equippedGlacierBow && baseUnitData.range > 1) {
                unit.atk += 2;
            }


            unit.mov = (baseUnitData.mov || 1);





            if (armorData.id === 'none') {


                unit.maxHp = 1;


                unit.mov += armorData.movBonus || 0;


            } else {


                // Specific Stat Scaling:


                // Only scale a stat if the base armor provides a positive bonus for it.


                // Formula: Base + (Level - 1) for levels > 1.


                const hpBonus = armorData.hpBonus || 0;


                const atkBonus = armorData.atkBonus || 0;


                const movBonus = armorData.movBonus || 0;





                if (armorData.id === 'yellow') {


                    // Custom Scaling for Sand Armor:


                    // Level 1: +1 MOV


                    // Level 2: +2 MOV


                    // Level 3+: +2 MOV, +(Level-2) HP


                    unit.mov += Math.min(2, armorLevel);


                    if (armorLevel > 2) {


                        unit.maxHp += (armorLevel - 2);


                    }


                } else if (equippedArmorId === 'blue') {
                    // Azure Armor Scaling: Stat (HP) on Odd, Resist on Even
                    const statBonus = Math.ceil(armorLevel / 2); // 1->1, 2->1, 3->2
                    unit.maxHp += statBonus;
                } else if (equippedArmorId === 'red') {
                    // Ember Armor Scaling: Stat (ATK) on Odd, Resist on Even
                    const statBonus = Math.ceil(armorLevel / 2);
                    unit.atk += statBonus;
                } else {
                    // Standard Scaling for other armors
                    unit.maxHp += hpBonus + (hpBonus > 0 ? Math.max(0, armorLevel - 1) : 0);
                    unit.atk += atkBonus + (atkBonus > 0 ? Math.max(0, armorLevel - 1) : 0);
                    unit.mov += movBonus + (movBonus > 0 ? Math.max(0, armorLevel - 1) : 0);
                }


            }





            unit.maxHp = Math.max(1, unit.maxHp);


            // Apply the HP percentage to the new maxHp, then cap at new maxHp


            unit.hp = Math.min(Math.ceil(unit.maxHp * hpPercentage), unit.maxHp);


            unit.atk = Math.max(0, unit.atk);


            unit.mov = Math.max(1, unit.mov);


            unit.baseMov = unit.mov;





            unit.immuneToFire = (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (armorData.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE);


            unit.immuneToFrost = (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (armorData.resistances?.frost ?? 0) >= ARMOR_RESISTANCE_VALUE);





            unit.armor_type = equippedArmorId;


            unit.variantType = equippedArmorId; // Ensure variantType matches armor


            unit.spriteUrl = getUnitSpriteUrl(unit.type, unit.variantType, unit.armor_type);


            unit.portraitUrl = getUnitSpriteUrl(unit.type, unit.variantType, unit.armor_type);


            unit.deadSpriteUrl = getUnitSpriteUrl(unit.type, unit.variantType, unit.armor_type);





            if (typeof updateUnitSprite === 'function') updateUnitSprite(unit);


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


        value: data.value ?? 0,


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


        const maxBonusGold = Math.min(CHEST_MAX_TOTAL_GOLD - item.baseGoldAmount, Math.floor(CHEST_MAX_BONUS_GOLD_PER_LEVEL * currentLevel));


        item.value = item.baseGoldAmount + Math.floor(Math.random() * (maxBonusGold + 1));


        item.value = Math.max(1, Math.min(CHEST_MAX_TOTAL_GOLD, item.value));


    } else if (type === 'shiny_gem') {


        item.value = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin;


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


            if (unit.quickStrikeActive && unit.canQuickStrike) {


                unit.quickStrikeUsedThisLevel = true;


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


    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);





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





function activateRogueQuickStrike(unit) {


    if (!unit || !unit.canQuickStrike || unit.acted || unit.isFrozen || unit.isNetted || levelClearedAwaitingInput) {


        playSfx('error');


        showFeedback("Cannot use Quick Strike now.", "feedback-error");


        return false;


    }


    if (unit.quickStrikeUsedThisLevel) {


        playSfx('error');


        showFeedback("Quick Strike already used.", "feedback-error");


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


        if (typeof createWorldHpBar === 'function') createWorldHpBar(goblin);





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


    playSfx('towerEnter');





    // Range bonus only for Ranged units (Range > 1) and NOT Melee-Only units


    const isRangedUnit = unit.baseRange > 1 && !unit.meleeOnlyAttack;


    unit.currentRange = unit.baseRange + (isRangedUnit ? tower.rangeBonus : 0);





    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);


    if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);


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





function leaveTower(unit) {


    if (!unit || !unit.inTower) return;


    const tower = obstacles.find(o => o.id === unit.inTower);


    let targetX = unit.x; let targetY = unit.y + 1;


    if (tower) { targetX = tower.x; targetY = tower.y + 1; tower.occupantUnitId = null; }





    if (!isCellInBounds(targetX, targetY) || getUnitAt(targetX, targetY) || getObstacleAt(targetX, targetY)?.blocksMove) {


        const adjacentExits = getAdjacentCells(unit.x, unit.y).find(cell => isCellInBounds(cell.x, cell.y) && !getUnitAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y)?.blocksMove);


        if (adjacentExits) { targetX = adjacentExits.x; targetY = adjacentExits.y; }


        else { console.warn(`Unit ${unit.id} trapped in tower ${unit.inTower}`); if (tower) tower.occupantUnitId = unit.id; return; }


    }





    unit.x = targetX; unit.y = targetY; unit.inTower = null; unit.currentRange = unit.baseRange;


    playSfx('towerExit');


    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);


    if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);


    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


    if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);


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


            if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition({ ...unit, x: step.x, y: step.y });


            if (typeof animateUnitMove === 'function') await animateUnitMove(unit, currentPathX, currentPathY, step.x, step.y);


            else { unit.x = step.x; unit.y = step.y; if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); }


            currentPathX = step.x; currentPathY = step.y;


        }


        if (unit.x === entryCell.x && unit.y === entryCell.y) await enterTower(unit, tower);


        else { console.warn("Tower entry animation sync issue."); unit.x = entryCell.x; unit.y = entryCell.y; if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); await enterTower(unit, tower); }


    } catch (error) { console.error("Error during tower entry sequence:", error); if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); }


}





async function moveUnit(unit, targetX, targetY) {


    if (!unit || !isUnitAliveAndValid(unit)) return false;





    // Prevent movement while attacking


    if (unit.isAttacking) return false;





    // Prevent movement if it's not player's turn (unless level cleared)


    // Prevent movement if it's not the unit's team's turn (unless level cleared)


    if (unit.team !== currentTurn && !levelClearedAwaitingInput) return false;





    let canAct = (!levelClearedAwaitingInput && !unit.acted);


    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;


    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) {


        if (unit.actionsTakenTypes && unit.actionsTakenTypes.includes('move')) canAct = false; // Prevent 2 moves


        else canAct = true;


    }


    const canMoveForItems = levelClearedAwaitingInput;





    // If level is cleared, allow movement to collect items regardless of 'acted' status


    if (levelClearedAwaitingInput) {


        canAct = true;


    }





    if (!canAct) return false;


    if (unit.isFrozen || unit.isNetted) return false;


    if (!isCellInBounds(targetX, targetY)) return false;





    const possibleMoves = getValidMoves(unit, levelClearedAwaitingInput);


    if (!possibleMoves.some(move => move.x === targetX && move.y === targetY)) {


        if (unit.x === targetX && unit.y === targetY) return false;


        playSfx('error'); showFeedback("Cannot move there.", "feedback-error");


        return false;


    }





    const startX = unit.x; const startY = unit.y;


    const obstacleAtTarget = getObstacleAt(targetX, targetY);


    const towerUnitIsIn = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;


    let enteringTower = false; let moveSuccessful = false;





    try {


        // Only play move sound if visible. Re-check visibility for safety.


        let isAudible = true;


        if (unit.team === 'enemy' && unit.isStealthed) {


            const isDetected = units.some(u => u.team === 'player' && isUnitAliveAndValid(u) && (Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y) === 1));


            if (!isDetected) isAudible = false;


        }


        if (isAudible) playSfx('move');


        let animationStartX = startX; let animationStartY = startY;





        if (towerUnitIsIn && targetX === towerUnitIsIn.x && targetY === towerUnitIsIn.y + 1) {


            leaveTower(unit); animationStartX = towerUnitIsIn.x; animationStartY = towerUnitIsIn.y;


        } else if (obstacleAtTarget?.enterable && obstacleAtTarget.type === 'tower') {


            enteringTower = true;


        } else {


            unit.x = targetX; unit.y = targetY;


        }





        if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);





        if (typeof animateUnitMove === 'function' && !enteringTower) {


            await animateUnitMove(unit, animationStartX, animationStartY, unit.x, unit.y);


            // Check if unit still exists in the game (e.g. level skipped during animation)


            if (!units.includes(unit)) { moveSuccessful = false; return false; }


        } else if (typeof updateUnitPosition === 'function' && !enteringTower) {


            updateUnitPosition(unit, true);


        } else if (enteringTower) {


            const path = findPathToTarget(unit, targetX, targetY);


            if (path !== null) {


                const towerObstacle = getObstacleAt(targetX, targetY);


                if (towerObstacle) { await initiateTowerEntrySequence(unit, towerObstacle, path); }


                else { throw new Error("Tower disappeared"); }


            } else { throw new Error("Path to tower invalid"); }


        }





        if (!enteringTower) {


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


        }


        moveSuccessful = true;


        return true;





    } catch (e) {


        console.error(`Error during moveUnit for unit ${unit?.id} to (${targetX},${targetY}):`, e);


        if (!enteringTower) { unit.x = startX; unit.y = startY; }


        if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);


        moveSuccessful = false;


        return false;


    } finally {


        if (moveSuccessful && !enteringTower && !levelClearedAwaitingInput) {


            finishAction(unit, 'move');





            // Refresh all enemy visual states to update stealth detection


            if (unit.team === 'player' && typeof updateUnitVisualState === 'function') {


                units.forEach(enemyUnit => {


                    if (enemyUnit.team === 'enemy' && isUnitAliveAndValid(enemyUnit)) {


                        updateUnitVisualState(enemyUnit);


                    }


                });


            }


        } else if (moveSuccessful && levelClearedAwaitingInput) {


            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);


        } else if (!moveSuccessful && unit && !unit.acted) {


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


        if (item.type === 'health_potion' && unit.hp >= unit.maxHp && !levelClearedAwaitingInput) canPickup = false;


        if (item.type === 'spellbook') {


            // Check if there's any spell that is unlocked and currently used (spellUses[s] === false)


            const hasUsedSpellToRestore = Object.keys(spellUses).some(sName => spellsUnlocked[sName] && spellUses[sName] === false);


            if (!hasUsedSpellToRestore && !unlimitedSpellsCheat) canPickup = false;


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


                    } else if (levelClearedAwaitingInput) {


                        goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP; baseGoldEarnedThisLevel += POTION_GOLD_VALUE_IF_FULL_HP; collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP;


                        // Popup handled by consolidated gold popup at end


                    }


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
                    } else {
                        goldFromThisPickup += 5; baseGoldEarnedThisLevel += 5; collectedCounts.gold += 5;
                        if (typeof showFeedback === 'function') {
                            setTimeout(() => showFeedback(`Spellbook converted to 5 Gold!`, 'feedback-gold'), feedbackDelay);
                            feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                        }
                    }
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


        // Let's just show the total gold gained if it's > 0, excluding gems if they showed a popup.


        // Actually, simpler: just show one popup for the total gold gained in this step.


        // But wait, gems show a specific "Gem" popup.


        // If I show a "+10G" popup and also a "+10G" Gem popup, it might be confusing.


        // Let's rely on collectedCounts.





        let goldOnlyValue = goldFromThisPickup;


        // If we collected gems, their value is in goldFromThisPickup.


        // We don't easily know the exact value of gems here without re-iterating.


        // But we know we want to consolidate "multiple gold pickups".


        // Let's just show the popup for gold items.


        // If we iterate again? No.


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


            if (attacker.actionsTakenTypes && attacker.actionsTakenTypes.includes('attack')) canAttack = false;


            else canAttack = true;


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


    // Units with fireballRadius always use ranged attacks (even at distance 1)


    const isRanged = distance > 1 || (attacker.fireballRadius > 0 && attacker.shootsProjectileType === 'fireball');


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


    let damage = (attacker.atk || 0) + (attacker.temporaryAttackBonus || 0) - (attacker.temporaryAttackDebuff || 0);


    let isStealthAttack = false;





    if (attacker.isStealthed && !attacker.stealthAttackBonusUsed) {


        damage += ROGUE_STEALTH_DAMAGE_BONUS; isStealthAttack = true;


    }





    let impactDelay = 0;


    const projectileType = isRanged ? attacker.shootsProjectileType : 'melee';


    const effectiveProjectileType = projectileType;





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


        if (isUnitAliveAndValid(attacker) && !attacker.acted) {


            finishAction(attacker, 'attack');


            // Unstealth on attack miss/kill if applicable


            if (attacker.isStealthed) {


                attacker.isStealthed = false;


                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(attacker);


            }


            finishAction(attacker, 'attack');


            if (attacker.isStealthed) {


                attacker.isStealthed = false;


                if (attacker.type === 'goblin_shadowstalker') attacker.mov = 5; // Restore speed


                if (typeof updateUnitVisualState === 'function') updateUnitVisualState(attacker);


            }


        }


        checkWinLossConditions(); return;


    }





    if (currentTargetObject.type === 'snowman' && !currentTargetObject.revealed) {


        await revealSnowman(currentTargetObject, attacker);


        if (isUnitAliveAndValid(attacker) && !attacker.acted) finishAction(attacker, 'attack');


        return;


    }





    // Kri'zak/Glacier Bow effect application moved below evasion check

    try {


        // Sound will play after damage calculation





        let effectiveDamage = damage;

        let isDodged = false;
        let changed = false;
        // Evasion: 5% chance to dodge
        if ((currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') && typeof playerPassiveUpgrades !== 'undefined' && playerPassiveUpgrades.evasion > 0) {
            const dodgeChance = playerPassiveUpgrades.evasion * 0.01;
            if (Math.random() < dodgeChance) {
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
                effectiveDamage = 1;
            } else if (targetFrostResistance > 0) {
                effectiveDamage = Math.max(1, effectiveDamage - targetFrostResistance);
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
                effectiveDamage = 1;
            } else if (totalFireResistance > 0) {
                effectiveDamage = Math.max(1, effectiveDamage - totalFireResistance);
            }
        }


        effectiveDamage = Math.max(0, effectiveDamage);





        // Break Polymorph on damage - do this BEFORE applying damage so unit reverts at full HP then takes damage


        if (currentTargetObject.isPolymorphed) {


            revertPolymorph(currentTargetObject);


            if (typeof showFeedback === 'function') showFeedback("Polymorph broken!", "feedback-error");


        }





        currentTargetObject.hp -= effectiveDamage;

        if (effectiveDamage > 0) {
            playSfx(isStealthAttack ? 'rogueAttack' : 'hit');
            if (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') {
                playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
            }

            // Aggressive Play Hook: Reset damage window if player hits enemy
            if (attacker.team === 'player' && currentTargetObject.team === 'enemy') {
                window.turnsSinceLastDamage = 0;
            }
        }

        // Thorns: Melee attackers take damage (only if attacker is adjacent)
        // Trigger even if effectiveDamage is 0 (e.g. Forest Armor active) but NOT if dodged
        if (!isDodged && (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') && playerPassiveUpgrades.thorns > 0) {
            const dist = Math.abs(attacker.x - currentTargetObject.x) + Math.abs(attacker.y - currentTargetObject.y);
            if (dist <= 1 && attacker.team === 'enemy') {
                const thornDamage = playerPassiveUpgrades.thorns;
                attacker.hp -= thornDamage;
                if (typeof showDamagePopup === 'function') showDamagePopup(attacker.x, attacker.y, thornDamage);
                if (typeof updateWorldHpBar === 'function') updateWorldHpBar(attacker);

                // NEW: Handle death from Thorns
                if (attacker.hp <= 0) {
                    attacker.hp = 0;
                    await removeUnit(attacker);
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





        if (typeof showDamagePopup === 'function') showDamagePopup(targetOriginalData.x, targetOriginalData.y, effectiveDamage);


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

                // Vampiric Aura: Heal on kill
                // Only trigger if unit is missing health
                if (attacker && attacker.team === 'player' && playerPassiveUpgrades.vampiric_aura > 0 && attacker.hp < attacker.maxHp) {
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
                // if (unitToDamageAfterTower.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit');
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
                            actualSplashDamage = 1;
                        } else if (targetFireResistanceSplash > 0) {
                            actualSplashDamage = Math.max(1, actualSplashDamage - targetFireResistanceSplash);
                        }





                        if (splashUnit.isPolymorphed) {
                            splashUnit.hp = splashUnit.maxHp;
                            revertPolymorph(splashUnit);
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





        if (attacker.type === 'champion' && attacker.cleaveDamage > 0 && currentTargetObject) {


            const currentAttacker = units.find(u => u.id === attacker.id);


            if (currentAttacker && isUnitAliveAndValid(currentAttacker)) {


                const attackDirX = Math.sign(targetOriginalData.x - currentAttacker.x); const attackDirY = Math.sign(targetOriginalData.y - currentAttacker.y);


                const potentialCleaveCellsCoords = [];
                let cleaveHits = 1; // Start at 1 to count the primary target

                const px = targetOriginalData.x, py = targetOriginalData.y;


                if (attackDirX !== 0) potentialCleaveCellsCoords.push({ x: px, y: py - 1 }, { x: px, y: py + 1 }, { x: px + attackDirX, y: py });


                else if (attackDirY !== 0) potentialCleaveCellsCoords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py + attackDirY });


                else potentialCleaveCellsCoords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py - 1 }, { x: px, y: py + 1 });


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


                    let effectiveCleaveDamage = Math.max(1, Math.floor(damage / 2));

                    if (forestArmorActiveTurns > 0 && (cleaveTargetObject.team === 'player' || unitInCleaveTower?.team === 'player')) {
                        const armorLevel = playerOwnedArmor[equippedArmorId] || 0;
                        const damageReduction = armorLevel > 0 ? armorLevel : 1;
                        effectiveCleaveDamage = Math.max(0, effectiveCleaveDamage - damageReduction);
                    }

                    effectiveCleaveDamage = Math.max(0, effectiveCleaveDamage);

                    if (effectiveCleaveDamage > 0) {
                        if (cleaveTargetObject.team === 'player' || unitInCleaveTower?.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit');
                    }


                    cleaveTargetObject.hp -= effectiveCleaveDamage; if (cleaveTargetObject.hp < 0) cleaveTargetObject.hp = 0;


                    if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, effectiveCleaveDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(cleaveTargetObject.element);


                    const isCleaveTargetUnit = !!cleaveTargetObject.team; if (isCleaveTargetUnit) { if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(cleaveTargetObject); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(cleaveTargetObject); }


                    if (cleaveTargetObject.hp <= 0) { if (isCleaveTargetUnit) { deathPromises.push(removeUnit(cleaveTargetObject)); } else { const unitToDamageAfterCleavedTower = unitInCleaveTower && isUnitAliveAndValid(unitInCleaveTower) ? unitInCleaveTower : null; deathPromises.push(removeObstacle(cleaveTargetObject)); if (unitToDamageAfterCleavedTower) { let towerCleaveDamage = Math.max(1, Math.floor(effectiveCleaveDamage / 2)); if (unitToDamageAfterCleavedTower.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit'); unitToDamageAfterCleavedTower.hp -= towerCleaveDamage; if (unitToDamageAfterCleavedTower.hp < 0) unitToDamageAfterCleavedTower.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, towerCleaveDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterCleaveTower.element); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterCleavedTower); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterCleavedTower); if (unitToDamageAfterCleavedTower.hp <= 0) deathPromises.push(removeUnit(unitToDamageAfterCleavedTower)); } } }


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
            actualExplosionDamage = 1;
        } else if (totalFireResistance > 0) {
            actualExplosionDamage = Math.max(1, actualExplosionDamage - totalFireResistance);
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


                const goldAmount = baseGold + Math.floor(Math.random() * (maxBonus + 1));


                const droppedItems = [];
                // Fall damage logic REMOVED as per user request






                // Drop gold


                for (let i = 0; i < goldAmount; i++) {


                    const item = createItem('gold', obsX, obsY, 0);


                    if (item) droppedItems.push(item);


                }





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





                    if (droppedItems.some(i => i.type === 'gold')) playSfx('goldDrop');


                    if (droppedItems.some(i => i.type === 'shiny_gem')) playSfx('gem');


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
                        actualBarrelDamage = 1;
                    } else if (targetFireResistanceBar > 0) {
                        actualBarrelDamage = Math.max(1, actualBarrelDamage - targetFireResistanceBar);
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


        checkAchievements('kill', { type: unitType, isBoss: isBoss, world: currentTerrainInfo.name });


        checkAchievements('kill_multiple', {


            targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"],


            count: 1


        });


    } else if (unitTeam === 'player') {


        unitsLostThisLevel++;


    }





    let itemsToDrop = [];


    let goldFromDrops = 0;





    if (unitTeam === 'enemy' && !unit.isTotem) {


        if (isBoss && dropsArmorFlag) {


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

        // Handle Legendary Drops (Independent of standard World Boss armor)
        if (dropsWarBowFlag) {
            if (!playerAbilityUpgrades.war_bow || playerAbilityUpgrades.war_bow === 0) {
                const item = createItem('war_bow', finalX, finalY, 0);
                if (item) itemsToDrop.push(item);
            }
        }

        if (dropsFlameCloakFlag) {
            if (!playerOwnedArmor.flame_cloak) {
                const item = createItem('flame_cloak', finalX, finalY, 0);
                if (item) itemsToDrop.push(item);
            }
        }

        if (dropsFlameRingFlag) {
            if (!playerAbilityUpgrades.flame_ring || playerAbilityUpgrades.flame_ring === 0) {
                const item = createItem('flame_ring', finalX, finalY, 0);
                if (item) itemsToDrop.push(item);
            }
        }

        if (dropsGlacierBowFlag) {
            if (!playerAbilityUpgrades.glacier_bow || playerAbilityUpgrades.glacier_bow === 0) {
                const item = createItem('glacier_bow', finalX, finalY, 0);
                if (item) itemsToDrop.push(item);
            }
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
        else if (isTreasureGoblin) {


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
                const item = createItem('tome_of_chain_lightning', finalX, finalY, itemsToDrop.length);
                if (item) itemsToDrop.push(item);
            }
            if (Math.random() < GOLD_DROP_CHANCE) {


                let goldAmountToDrop = BASE_GOLD_DROP_AMOUNT;


                if (ADVANCED_ENEMY_TYPES.includes(unitType) && Math.random() < ADVANCED_GOBLIN_EXTRA_GOLD_CHANCE) {


                    goldAmountToDrop += ADVANCED_GOBLIN_EXTRA_GOLD_AMOUNT;


                }


                goldFromDrops += goldAmountToDrop;


                for (let i = 0; i < goldAmountToDrop; i++) {


                    itemsToDrop.push(createItem('gold', finalX, finalY, itemsToDrop.length));


                }


            }


            const potionDropChance = POTION_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE));


            if (Math.random() < potionDropChance) {


                itemsToDrop.push(createItem('health_potion', finalX, finalY, itemsToDrop.length));


            }


            const gemDropChance = currentLevel >= 30 ? GEM_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE)) : 0;
            if (gemDropChance > 0 && Math.random() < gemDropChance) {
                itemsToDrop.push(createItem('shiny_gem', finalX, finalY, itemsToDrop.length));
            }


            if (SPELLBOOK_REQUIRED_SPELL_USE && spellsUsedThisLevel && Math.random() < SPELLBOOK_DROP_CHANCE_ENEMY) {


                itemsToDrop.push(createItem('spellbook', finalX, finalY, itemsToDrop.length));


            }


        }





        if (itemsToDrop.length > 0) {
            items.push(...itemsToDrop);


            if (goldFromDrops > 0) playSfx('goldDrop');


            if (itemsToDrop.some(i => i.type === 'shiny_gem')) playSfx('gem');
            if (itemsToDrop.some(i => i.type === 'health_potion')) playSfx('potionDrop');


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


    const isUnitSpell = spellName === 'chainLightning' || spellName === 'polymorph';





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
                            actualDamage = 1;
                        } else if (targetFireResistance > 0) {
                            actualDamage = Math.max(1, actualDamage - targetFireResistance);
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
                                        actualSplashDamage = 1;
                                    } else if (splashTargetFireResistance > 0) {
                                        actualSplashDamage = Math.max(1, actualSplashDamage - splashTargetFireResistance);
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
                                // Kri'zak and frost-immune units are immune to Frost Nova
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
                    success = true;
                }


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
        unit.temporaryAttackBonus = 0;
        unit.temporaryAttackDebuff = 0;


        if (unit.team === team) {


            // Reset Forest Armor uses at start of player turn


            recalculateAllUnitsStats();

            if (team === 'player') {
                if (typeof turnCCApplied !== 'undefined') turnCCApplied.clear();


                if (forestArmorActiveTurns > 0) forestArmorActiveTurns--;


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
                                const healAmount = SHAMAN_TOTEM_HEAL;
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





            // Goblin Mother Spawning


            if (unit.ability === 'spawnGoblins' && team === 'enemy' && !unit.isFrozen && !unit.isNetted) {


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


                        // Calculate bonuses based on level (same logic as spawnEnemies)


                        let cycle = 0;


                        if (currentLevel >= INFINITE_LEVEL_START) {


                            cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);


                        }


                        const infiniteHpBonus = cycle * INFINITE_HP_BONUS_PER_CYCLE;


                        const infiniteAtkBonus = cycle * INFINITE_ATK_BONUS_PER_CYCLE;





                        // Determine variant based on level theme


                        const worldInfo = getTilesetForLevel(currentLevel);


                        const variant = WORLD_THEME_MAP[worldInfo.name] || 'green';





                        const count = Math.random() < 0.5 ? 1 : 2;


                        let spawned = 0;


                        for (let i = 0; i < count && validSpawns.length > 0; i++) {


                            const idx = Math.floor(Math.random() * validSpawns.length);


                            const pos = validSpawns[idx];


                            validSpawns.splice(idx, 1);





                            const newGoblin = createUnit('goblin', pos.x, pos.y, variant, false, infiniteHpBonus, infiniteAtkBonus);


                            if (newGoblin) {


                                newGoblin.acted = true; // Summoned units don't act immediately


                                playSfx('summon'); // Assuming a summon sound or reuse another


                                if (typeof renderUnit === 'function') renderUnit(newGoblin);


                                if (typeof createWorldHpBar === 'function') createWorldHpBar(newGoblin);


                                spawned++;


                            }


                        }


                        if (spawned > 0) {


                            unit.spawnCooldown = GOBLIN_MOTHER_SPAWN_COOLDOWN;


                            if (typeof showFeedback === 'function') showFeedback(`${unit.name} spawns Goblins!`, "feedback-turn");


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
                        actualDamageFW = 1;
                    } else if (totalFireResistanceFW > 0) {
                        actualDamageFW = Math.max(1, actualDamageFW - totalFireResistanceFW);
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

    // Check for Forest Armor ability: if available and not active, don't auto-end
    if (typeof equippedArmorId !== 'undefined' && equippedArmorId === 'green' && forestArmorUses && forestArmorActiveTurns <= 0) return;

    // 3. Auto-end turn
    console.log("Auto-ending turn: No moves or spells left.");
    endTurn();
}

function endTurn() {


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


                if (u.team === 'player' && isUnitAliveAndValid(u) && u.hp < u.maxHp) {


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


    const livingPlayers = units.filter(u => u.team === 'player' && u.hp > 0 && (!u.isStealthed || getDistance(unit, u) <= 1));


    if (livingPlayers.length === 0) { finishAction(unit); return; }


    let actionTaken = false; let hasMoved = false;





    let targetPlayer = livingPlayers.reduce((best, player) => {
        const dist = getDistance(unit, player);
        if (dist < best.dist) {
            return { player, dist };
        } else if (dist === best.dist) {
            // Strategic tie-break: target the one with lower HP
            return player.hp < best.player.hp ? { player, dist } : best;
        }
        return best;
    }, { player: null, dist: Infinity }).player;

    if (!targetPlayer) { finishAction(unit); return; }

    let finalTargetObject = targetPlayer;
    if (targetPlayer.inTower) {
        const tower = obstacles.find(o => o.id === targetPlayer.inTower);
        if (tower && isObstacleIntact(tower)) finalTargetObject = tower;
    }

    const minDist = getDistance(unit, finalTargetObject);

    if (unit.flees) {


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


            const alliesToHeal = units.filter(u => u.team === 'enemy' && !u.isTotem && u.hp < u.maxHp && getDistance(unit, u) <= unit.range && hasLineOfSight(unit, u) && isUnitAliveAndValid(u)).sort((a, b) => a.hp - b.hp);


            // Fix for Shaman Totem limit: Check if THIS shaman has a totem


            const myTotemExists = units.some(u => u.isTotem && u.summonerId === unit.id && isUnitAliveAndValid(u));


            const canSummon = unit.canSummonTotem && unit.totemCooldown <= 0 && !myTotemExists;


            if (alliesToHeal.length > 0) {


                const targetAlly = alliesToHeal[0];


                const healAmount = unit.healAmount || SHAMAN_HEAL_AMOUNT;


                const actualHeal = Math.min(healAmount, targetAlly.maxHp - targetAlly.hp);


                if (actualHeal > 0) {


                    targetAlly.hp += actualHeal; playSfx('shamanHeal');


                    if (typeof showHealPopup === 'function') showHealPopup(targetAlly.x, targetAlly.y, actualHeal);


                    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetAlly);


                    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetAlly);


                    actionTaken = true; finishAction(unit); return;


                }


            } else if (canSummon) {


                const nearestPlayerDist = livingPlayers.reduce((minDist, p) => Math.min(minDist, getDistance(unit, p)), Infinity);


                if (nearestPlayerDist <= 5) {


                    const validSpot = getAdjacentCells(unit.x, unit.y).find(spot => isCellInBounds(spot.x, spot.y) && !getUnitAt(spot.x, spot.y) && !getObstacleAt(spot.x, spot.y));


                    if (validSpot) {


                        const newTotem = createUnit(unit.totemType, validSpot.x, validSpot.y);


                        if (newTotem) {


                            newTotem.summonerId = unit.id; // Link totem to summoner


                            if (typeof renderUnit === 'function') renderUnit(newTotem);


                            if (typeof createWorldHpBar === 'function') createWorldHpBar(newTotem);


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
                        actualDamageFB = 1;
                    } else if (targetFireResistanceFB > 0) {
                        actualDamageFB = Math.max(1, actualDamageFB - targetFireResistanceFB);
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





    let canStillMove = !hasMoved && !actionTaken;


    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 1 && !hasMoved) canStillMove = true;


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





            const moveCost = getMoveCost(nextX, nextY);


            const newDistance = current.distance + moveCost;





            if (newDistance > distanceLimit) continue;


            if (visited.has(key) && visited.get(key) <= newDistance) continue;





            const obstacle = getObstacleAt(nextX, nextY); const unitOnCell = getUnitAt(nextX, nextY); let isBlocked = false; if (unitOnCell && unitOnCell.id !== unit.id) isBlocked = true; if (obstacle && obstacle.blocksMove && !obstacle.enterable) isBlocked = true; if (unitInTower) { if (nextX !== unitInTower.x || nextY !== unitInTower.y + 1) isBlocked = true; } else if (obstacle?.enterable) { if (current.y !== nextY + 1 || current.x !== nextX) isBlocked = true; if (obstacle.occupantUnitId && obstacle.occupantUnitId !== unit.id) isBlocked = true; } if (!isBlocked) { moves.push({ x: nextX, y: nextY }); visited.set(key, newDistance); queue.push({ x: nextX, y: nextY, distance: newDistance }); }


        }


    } return moves;


}





function getValidAttackTargets(unit) {


    const targets = { units: [], obstacles: [] };


    if (!unit || !isUnitAliveAndValid(unit) || unit.isFrozen || unit.type === 'goblin_sapper') return targets; // Netted units CAN attack, Sappers CANNOT attack normally


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


            if (unitOnCell && !isTargetCell) isWalkable = false;


            if (obstacle && obstacle.blocksMove && !obstacle.enterable) isWalkable = false;


            if (unitInTower && currentNode.parent === null) { if (nextX !== unitInTower.x || nextY !== unitInTower.y + 1) isWalkable = false; }


            else if (obstacle?.enterable) {
                // Enemies treat enterable obstacles (towers) as solid walls, UNLESS it is their target destination
                if (unit.team === 'enemy' && !isTargetCell) isWalkable = false;
                else {
                    // REMOVED: if (currentNode.y !== nextY + 1 || currentNode.x !== nextX) isWalkable = false;
                    if (obstacle.occupantUnitId && !isTargetCell) isWalkable = false;
                }
            }


            if (isWalkable) { const moveCost = getMoveCost(nextX, nextY); const gScore = currentNode.g + moveCost; const hScore = getDistance({ x: nextX, y: nextY }, { x: targetX, y: targetY }); const existingNode = openSet.get(key); if (!existingNode || gScore < existingNode.g) { const neighbor = { x: nextX, y: nextY, g: gScore, h: hScore, parent: currentNode }; openSet.set(key, neighbor); } else if (existingNode && gScore === existingNode.g && hScore < existingNode.h) { existingNode.parent = currentNode; existingNode.h = hScore; } }


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
        // removed levelClearedAwaitingInput check to allow re-evaluation for rescue condition


        const playersLeft = units.some(u => u.team === 'player' && isUnitAliveAndValid(u));

        if (!playersLeft) { if (!isGameOver()) gameOver(false); return; }

        // Level Clear Check
        const enemiesLeft = units.some(u => u.team === 'enemy' && !u.isTotem && isUnitAliveAndValid(u));
        // Also check if there are any active cages that contain units
        // Also check if there are any active cages that contain units
        const cagesLeft = obstacles.some(o => o.type.startsWith('cage_') && o.type !== 'cage_broken' && isObstacleIntact(o));

        if (!enemiesLeft) {
            // Enemies defeated: Enable Free Move Mode immediately
            if (!levelClearedAwaitingInput) {
                levelClearedAwaitingInput = true;
                if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
                if (typeof updateAllUnitVisuals === 'function') updateAllUnitVisuals();
                // Refresh highlights
                if (selectedUnit && selectedUnit.team === 'player' && typeof highlightMovesAndAttacks === 'function') {
                    highlightMovesAndAttacks(selectedUnit);
                }
            }

            // If cages remain, do NOT trigger victory yet
            if (cagesLeft) {
                if (!window.rescueMessageShown) {
                    window.rescueMessageShown = true;
                    if (typeof showFeedback === 'function') showFeedback("Rescue the prisoner!", "feedback-neutral", 3000);
                }
                return;
            }

            // Victory Condition: No enemies AND no cages
            if (window.victoryTriggered) return; // Prevent spam
            window.victoryTriggered = true;

            // levelClearedAwaitingInput is already true



            playSfx('levelComplete');


            if (typeof deselectUnit === 'function') {


                if (!selectedUnit || selectedUnit.team !== 'player') {


                    deselectUnit(false);


                } else {


                    // Refresh highlights because movement rules change when levelClearedAwaitingInput is true


                    if (typeof highlightMovesAndAttacks === 'function') highlightMovesAndAttacks(selectedUnit);


                }


            }


            if (typeof setActiveSpell === 'function') setActiveSpell(null);


            if (typeof showFeedback === 'function') showFeedback("Level Cleared! Collect items or Proceed.", "feedback-levelup", 3000);


            if (typeof updateTurnDisplay === 'function') updateTurnDisplay();


            if (typeof updateAllUnitVisuals === 'function') updateAllUnitVisuals();


            // Do NOT show level complete screen yet. Wait for user to click Proceed.


        }


    }, 100);





}





function startNextLevel() { if (isGameOver()) return; if (victoryMusicPlayer) { victoryMusicPlayer.pause(); victoryMusicPlayer.currentTime = 0; } currentLevel++; levelToRestartOnLoss = currentLevel; levelClearedAwaitingInput = false; pendingFrostNovas = []; if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings(); initGame(currentLevel); }


function forfeitLevel() { if (!isGameActiveFlag || isProcessing || isGameOver()) return; isGameActiveFlag = false; levelClearedAwaitingInput = false; stopMusic(); if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null; playSfx('forfeit'); const goldBeforeLevel = playerGold - baseGoldEarnedThisLevel; const penaltyPercentage = 0.05; const startGoldPenalty = Math.floor(goldBeforeLevel * penaltyPercentage); const levelGainLost = baseGoldEarnedThisLevel; const totalPenalty = levelGainLost + startGoldPenalty; const goldBeforePenalty = playerGold; playerGold = Math.max(0, goldBeforeLevel - startGoldPenalty); let messageText = `Level ${currentLevel} Forfeited!<br>`; messageText += `<span style="color: var(--color-error);">Penalty: -${totalPenalty}<span class="icon icon-inline icon-gold"></span></span><br>`; messageText += `Gold Remaining: ${playerGold}<span class="icon icon-inline icon-gold"></span>`; if (typeof saveScoreToLeaderboard === 'function') { const achCount = Object.values(achievementProgress || {}).filter(a => a.unlocked).length; saveScoreToLeaderboard(currentLevel - 1, playerGold, gameSettings.playerName, achCount); } saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showGameOverScreen === 'function') showGameOverScreen(false, messageText, true); }


function gameOver(playerWonGame, customMessage = "", isForfeit = false) { if (isGameOver()) return; isGameActiveFlag = false; levelClearedAwaitingInput = false; stopMusic(); if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null; let messageText = customMessage || ""; let isTrueVictory = playerWonGame; if (!messageText && !isTrueVictory && !isForfeit) { playSfx('gameOver'); const goldBeforeLevel = playerGold - baseGoldEarnedThisLevel; const penaltyPercentage = 0.05; const startGoldPenalty = Math.floor(goldBeforeLevel * penaltyPercentage); const levelGainLost = baseGoldEarnedThisLevel; const totalPenalty = levelGainLost + startGoldPenalty; playerGold = Math.max(0, goldBeforeLevel - startGoldPenalty); messageText = `You have fallen on Level ${currentLevel}!<br>`; messageText += `<span style="color: var(--color-error);">Penalty: -${totalPenalty}<span class="icon icon-inline icon-gold"></span></span><br>`; messageText += `Gold Remaining: ${playerGold}<span class="icon icon-inline icon-gold"></span>`; if (typeof saveScoreToLeaderboard === 'function') { const achCount = Object.values(achievementProgress || {}).filter(a => a.unlocked).length; saveScoreToLeaderboard(currentLevel - 1, playerGold, gameSettings.playerName, achCount); } } else if (!playerWonGame && !isForfeit) playSfx('gameOver'); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showGameOverScreen === 'function') showGameOverScreen(isTrueVictory, messageText, isForfeit); }


function isGameOver() { return typeof isGameOverScreenVisible === 'function' && isGameOverScreenVisible(); }


function isGameActive() { return isGameActiveFlag; }





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
        if (unitType === 'knight' && currentOwned >= 2 && highestLevelReached <= 5) {
            playSfx('error');
            showFeedback(`3rd Knight requires beating Level 5!`, "feedback-error");
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

    // New Multi-Rank Logic for Evasion, Thorns, Vampiric Aura
    const config = typeof PASSIVE_UPGRADE_CONFIG !== 'undefined' ? PASSIVE_UPGRADE_CONFIG[passiveId] : null;
    if (config) {
        const nextLevel = currentLevel + 1;
        if (nextLevel > config.maxLevel) return false;

        const requiredLevel = config.baseLevel + (currentLevel * config.levelStep);
        const meetsLevelReq = highestLevelReached >= requiredLevel;

        if (playerGold >= cost && meetsLevelReq) {
            playerGold -= cost;
            playerPassiveUpgrades[passiveId] = nextLevel;
            saveSettings();
            saveGameData();
            return true;
        }
        return false;
    }

    // Default logic for other passives (upgrade level)
    if (playerGold >= cost && currentLevel === 0) {
        playerGold -= cost;
        playerPassiveUpgrades[passiveId] = 1;
        saveSettings();
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

function cleanProfileName(name) {
    if (typeof name !== 'string') return "";
    return name.substring(0, 25).trim();
}

function addProfileToList(name) {
    if (!name) return;
    const cleanName = cleanProfileName(name);
    if (!cleanName) return;
    const list = getProfileList();
    if (!list.includes(cleanName)) {
        list.push(cleanName);
        localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(list));
    }
}

function switchProfile(name) {
    if (!name) return;
    saveGameData(); // Save old profile
    updateSetting('playerName', name);
    addProfileToList(name); // Ensure NEW profile is in the list
    loadGameData(); // Load new profile
    saveGameData(); // Initial save for new profile

    // Targeted UI Update instead of aggressive refresh
    if (typeof updateProfileDisplay === 'function') updateProfileDisplay();
    if (typeof renderProfilesList === 'function') renderProfilesList();
    if (typeof updateLevelSelectScreen === 'function') updateLevelSelectScreen();

    // Only refresh board if game is active
    if (typeof isGameActive === 'function' && isGameActive()) {
        if (typeof updateUiForNewLevel === 'function') updateUiForNewLevel();
    } else if (typeof showLevelSelect === 'function') {
        showLevelSelect();
    }
}

function deleteProfile(name) {
    if (!name) return;
    const profiles = getProfileList();
    const updatedProfiles = profiles.filter(p => p !== name);

    // Sync with Firebase: Release name and remove score
    if (window.OnlineLeaderboard && window.OnlineLeaderboard.deleteProfileData) {
        window.OnlineLeaderboard.deleteProfileData(name);
    }

    // keys linked to the profile
    const keysToDelete = [
        STORAGE_KEY_HIGHEST_LEVEL, STORAGE_KEY_GOLD, STORAGE_KEY_OWNED_UNITS,
        STORAGE_KEY_ACTIVE_ROSTER, STORAGE_KEY_UNIT_UPGRADES, STORAGE_KEY_SPELL_UPGRADES,
        STORAGE_KEY_ABILITY_UPGRADES, STORAGE_KEY_PASSIVE_UPGRADES, STORAGE_KEY_OWNED_ARMOR,
        STORAGE_KEY_EQUIPPED_ARMOR, STORAGE_KEY_EQUIPPED_HELMET, STORAGE_KEY_EQUIPPED_FLAME_CLOAK,
        STORAGE_KEY_ACHIEVEMENT_PROGRESS, STORAGE_KEY_ARMORY_VISITED, STORAGE_KEY_CHEAT_SPELL_ATK,
        STORAGE_KEY_MAX_ROSTER_SIZE, STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL,
        STORAGE_KEY_SPELL_NOTIFICATIONS_SHOWN, STORAGE_KEY_UNLOCKED_UNITS, STORAGE_KEY_NAKED_CHALLENGE,
        STORAGE_KEY_EQUIPPED_WAR_BOW, STORAGE_KEY_EQUIPPED_FLAME_RING,
        STORAGE_KEY_CHEATER, STORAGE_KEY_CHAIN_LIGHTNING_REDUCTION, STORAGE_KEY_EQUIPPED_GLACIER_BOW
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

        if (typeof updateProfileDisplay === 'function') updateProfileDisplay();
        if (typeof renderProfilesList === 'function') renderProfilesList();

        // Safety: only refresh board state if game is active. 
        // If in menu, just refresh level select but don't hide everything.
        if (typeof isGameActive === 'function' && isGameActive()) {
            if (typeof updateUiForNewLevel === 'function') updateUiForNewLevel();
        } else if (typeof updateLevelSelectScreen === 'function') {
            updateLevelSelectScreen();
        }
    }
}

window.getProfileKey = getProfileKey;
window.getProfileList = getProfileList;
window.addProfileToList = addProfileToList;
window.switchProfile = switchProfile;
window.deleteProfile = deleteProfile;
window.cleanProfileName = cleanProfileName;

function markAsCheater() {
    if (!isPlayerCheater) {
        isPlayerCheater = true;
        console.log("Profile permanently marked as cheater.");
        saveGameData();
        if (typeof updateCheatResetButtonVisibility === 'function') updateCheatResetButtonVisibility();
    }
}

// Cheat reset functionality removed to enforce permanent cheater status


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
        localStorage.setItem(getProfileKey(STORAGE_KEY_UNLOCKED_UNITS, name), JSON.stringify(unlockedUnits));
        localStorage.setItem(getProfileKey(STORAGE_KEY_CHAIN_LIGHTNING_REDUCTION, name), playerChainLightningCooldownReduction.toString());
        localStorage.setItem(getProfileKey(STORAGE_KEY_CHEATER, name), isPlayerCheater.toString());
        saveSettings();
    } catch (e) { console.warn("Could not save game data.", e); }
}


function loadGameData() {
    try {
        const name = gameSettings.playerName;
        highestLevelReached = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_HIGHEST_LEVEL, name)) || '1', 10) || 1;
        playerGold = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_GOLD, name)) || '0', 10) || 0;
        armoryVisited = localStorage.getItem(getProfileKey(STORAGE_KEY_ARMORY_VISITED, name)) === 'true';
        playerCheatSpellAttackBonus = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_CHEAT_SPELL_ATK, name)) || '0', 10) || 0;
        maxActiveRosterSize = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_MAX_ROSTER_SIZE, name)) || MAX_ACTIVE_ROSTER_SIZE_BASE.toString(), 10) || MAX_ACTIVE_ROSTER_SIZE_BASE;
        lastTreasureHunterLevel = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL, name)) || (-TREASURE_HUNTER_SPAWN_COOLDOWN).toString(), 10) || -TREASURE_HUNTER_SPAWN_COOLDOWN;
        const storedSpellNotifications = localStorage.getItem(getProfileKey(STORAGE_KEY_SPELL_NOTIFICATIONS_SHOWN, name));
        spellUnlockNotificationsShown = storedSpellNotifications ? JSON.parse(storedSpellNotifications) : {};
        isNakedChallengeActive = localStorage.getItem(getProfileKey(STORAGE_KEY_NAKED_CHALLENGE, name)) === 'true';
        equippedGlacierBow = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_GLACIER_BOW, name)) === 'true';
        isPlayerCheater = localStorage.getItem(getProfileKey(STORAGE_KEY_CHEATER, name)) === 'true';
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
        const defaultAbilityUpgrades = { rogue_quickstrike: 0, war_bow: 0, flame_ring: 0, glacier_bow: 0 };
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
        const defaultPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 };
        const storedPassiveUpgrades = localStorage.getItem(getProfileKey(STORAGE_KEY_PASSIVE_UPGRADES, name));
        playerPassiveUpgrades = storedPassiveUpgrades ? JSON.parse(storedPassiveUpgrades) : { ...defaultPassiveUpgrades };
        Object.keys(defaultPassiveUpgrades).forEach(key => { if (!(key in playerPassiveUpgrades)) playerPassiveUpgrades[key] = defaultPassiveUpgrades[key]; if (key === 'gold_magnet' || key === 'tactical_command') playerPassiveUpgrades[key] = Math.max(0, parseInt(playerPassiveUpgrades[key] || '0', 10)); });
        maxActiveRosterSize = Math.max(MAX_ACTIVE_ROSTER_SIZE_BASE, Math.min(MAX_ACTIVE_ROSTER_SIZE_BASE + (playerPassiveUpgrades.tactical_command || 0), MAX_ACTIVE_ROSTER_SIZE_MAX));
        const defaultOwnedArmor = { grey: 1 };
        const storedOwnedArmor = localStorage.getItem(getProfileKey(STORAGE_KEY_OWNED_ARMOR, name));
        playerOwnedArmor = storedOwnedArmor ? JSON.parse(storedOwnedArmor) : { ...defaultOwnedArmor };
        playerOwnedArmor['grey'] = Math.max(1, playerOwnedArmor['grey'] || 1); Object.keys(ARMOR_DATA).forEach(id => { if (id !== 'none' && id !== 'grey' && !(id in playerOwnedArmor)) { playerOwnedArmor[id] = 0; } }); Object.keys(playerOwnedArmor).forEach(id => { if (id !== 'grey') playerOwnedArmor[id] = Math.max(0, playerOwnedArmor[id] || 0); });
        equippedArmorId = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_ARMOR, name)) || 'grey';



        equippedHelmetId = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_HELMET, name)) || 'none';
        equippedFlameCloak = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_FLAME_CLOAK, name)) === 'true';
        equippedWarBow = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_WAR_BOW, name)) === 'true';
        equippedFlameRing = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_FLAME_RING, name)) === 'true'; if (!playerOwnedArmor[equippedArmorId] && equippedArmorId !== 'none') equippedArmorId = 'grey';
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


        playerChainLightningCooldownReduction = parseInt(localStorage.getItem(getProfileKey(STORAGE_KEY_CHAIN_LIGHTNING_REDUCTION, name)) || '0', 10) || 0;
        playerGold = Math.max(0, playerGold); playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); loadSettings(); resetSpellStateForNewLevel();
        pendingFrostNovas = []; if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings();


    } catch (e) {


        console.warn("Load game data error. Starting fresh.", e); highestLevelReached = 1; playerGold = 0; playerOwnedUnits = { knight: 2, archer: 0, champion: 0, rogue: 0 }; maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE; playerActiveRoster = { knight: Math.min(2, maxActiveRosterSize) }; playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 }; playerAbilityUpgrades = { rogue_quickstrike: 0, war_bow: 0, flame_ring: 0, glacier_bow: 0 }; playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 }; playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 }; playerOwnedArmor = { grey: 1 }; equippedArmorId = 'grey';


        equippedHelmetId = 'none';

        pendingFrostNovas = []; if (typeof clearPendingFrostNovaWarnings === 'function') clearPendingFrostNovaWarnings();
        equippedFlameCloak = false; achievementProgress = {}; armoryVisited = false; playerCheatSpellAttackBonus = 0; lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN; spellUnlockNotificationsShown = {}; gameSettings = { ...DEFAULT_GAME_SETTINGS }; saveSettings();


    }


}


function loadSettings() { const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS); if (storedSettings) { try { const parsedSettings = JSON.parse(storedSettings); gameSettings = { ...DEFAULT_GAME_SETTINGS, ...parsedSettings }; gameSettings.playerName = typeof gameSettings.playerName === 'string' ? gameSettings.playerName.substring(0, 25).trim() : DEFAULT_GAME_SETTINGS.playerName; gameSettings.musicVolume = typeof gameSettings.musicVolume === 'number' ? Math.max(0, Math.min(1, gameSettings.musicVolume)) : DEFAULT_GAME_SETTINGS.musicVolume; gameSettings.sfxVolume = typeof gameSettings.sfxVolume === 'number' ? Math.max(0, Math.min(1, gameSettings.sfxVolume)) : DEFAULT_GAME_SETTINGS.sfxVolume; gameSettings.mute = gameSettings.mute === true; } catch (e) { console.warn("Failed to parse settings, using defaults.", e); gameSettings = { ...DEFAULT_GAME_SETTINGS }; } } else { gameSettings = { ...DEFAULT_GAME_SETTINGS }; } musicVolume = gameSettings.musicVolume; sfxVolume = gameSettings.sfxVolume; isMuted = gameSettings.mute; if (typeof applyMuteState === 'function') applyMuteState(isMuted); if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility(); if (typeof updateMuteButtonVisual === 'function') updateMuteButtonVisual(); if (typeof updateAudioVolumeDisplays === 'function') updateAudioVolumeDisplays(); if (typeof updatePlayerNameInput === 'function') updatePlayerNameInput(); }


function saveSettings() { gameSettings.musicVolume = musicVolume; gameSettings.sfxVolume = sfxVolume; gameSettings.mute = isMuted; try { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(gameSettings)); } catch (e) { console.warn("Could not save settings.", e); } }


function updateSetting(key, value) {


    if (gameSettings.hasOwnProperty(key)) {


        let changed = false;


        if (key === 'playerName' && typeof value === 'string') {
            const cleanName = cleanProfileName(value);


            if (gameSettings.playerName !== cleanName) {


                gameSettings.playerName = cleanName || DEFAULT_GAME_SETTINGS.playerName;


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

    const stats = calculateLevelStats();
    checkAchievements('level_complete', { stats, equippedArmor: equippedArmorId });


    playerGold += (stats.totalGoldEarned || 0) - (stats.goldGained || 0); // Add bonus gold


    playerGold = Math.max(0, playerGold);


    if (highestLevelReached <= 60 && currentLevel === 60) {


        if (typeof showFeedback === 'function') setTimeout(() => showFeedback("Armory Unlocked!", "feedback-achievement-unlock", 4000), 1000);


    }


    if (currentLevel >= highestLevelReached) highestLevelReached = currentLevel + 1;


    if (typeof saveScoreToLeaderboard === 'function') {
        const achCount = Object.values(achievementProgress || {}).filter(a => a.unlocked).length;
        saveScoreToLeaderboard(currentLevel, playerGold, gameSettings.playerName, achCount);
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





    // Always create HP bar


    if (typeof createWorldHpBar === 'function') {


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


    // 3. Auto-Check for End Turn if no actions left
    checkAutoEndTurn();


}





// Add hotkey '5' for Forest Armor


document.addEventListener('keydown', (e) => {


    if (e.key === '5' && equippedArmorId === 'green' && forestArmorUses && forestArmorActiveTurns <= 0 && !isAnyOverlayVisible()) {


        // Check if input is focused (e.g. player name input)


        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;





        e.preventDefault();


        activateForestArmor();


    }


});





function isLevelCleared() {


    return levelClearedAwaitingInput;


}

function isGameActive() {
    return isGameActiveFlag;
}
window.isGameActive = isGameActive;

/**
 * Retrieves the local leaderboard scores from localStorage.
 * @returns {Array} An array of leaderboard entries.
 */
function getLeaderboard() {
    const lbJSON = localStorage.getItem('knightGambitLeaderboard');
    if (!lbJSON) return [];
    try {
        const data = JSON.parse(lbJSON);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("Error parsing local leaderboard:", e);
        return [];
    }
}
window.getLeaderboard = getLeaderboard;

function saveScoreToLeaderboard(level, gold, name, achievements = 0) {
    const isCheater = (typeof isPlayerCheater !== 'undefined' && isPlayerCheater === true);
    if (isCheater) {
        console.log("Leaderboard: Score suppressed (Cheat status detected).");
        return;
    }
    if (level < 3) return; // Requirement level 3 to reduce spam

    // Capture current equipment
    const armorId = (typeof equippedArmorId !== 'undefined') ? equippedArmorId : (localStorage.getItem('knightGambit_equippedArmor') || 'grey');
    const helmetId = (typeof equippedHelmetId !== 'undefined') ? equippedHelmetId : (localStorage.getItem('knightGambit_equippedHelmet') || 'none');
    const flameCloak = (typeof equippedFlameCloak !== 'undefined') ? equippedFlameCloak : (localStorage.getItem('knightGambit_equippedFlameCloak') === 'true');

    // 2. Online Leaderboard handling (Local storage removed per request)
    if (window.OnlineLeaderboard && window.OnlineLeaderboard.isInitialized()) {
        const isCheater = (typeof isPlayerCheater !== 'undefined' && isPlayerCheater === true);
        window.OnlineLeaderboard.submitScore(
            name, level, achievements, isCheater,
            (typeof isNakedChallengeActive !== 'undefined' ? isNakedChallengeActive : false),
            armorId, helmetId, flameCloak
        ).catch(err => {
            console.error("Async online submission error:", err);
        });
    }
}
window.saveScoreToLeaderboard = saveScoreToLeaderboard;


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
        if (typeof showFeedback === 'function') showFeedback(`${UNIT_DATA[unitType].name} Rescued!`, 'feedback-levelup', 3000);
        playSfx('powerup');
    }
}
window.rescueUnit = rescueUnit;

window.debugSpawnTome = function () { const playerUnit = units.find(u => u.team === 'player' && isUnitAliveAndValid(u)); const x = playerUnit ? playerUnit.x : 1; const y = playerUnit ? playerUnit.y : 1; const item = createItem('tome_of_chain_lightning', x, y, 0); if (item && typeof animateItemDrop === 'function') { animateItemDrop([item], x, y); } console.log('Debug: Spawned Tome of Chain Lightning at', x, y); };

function recalculateUnitStats(unit) {
    if (!unit || !isUnitAliveAndValid(unit)) return;

    const baseUnitData = UNIT_DATA[unit.type];
    if (!baseUnitData) return;

    // Re-calculating "Base" ATK
    let calculatedAtk = (baseUnitData.baseAtk || 0);

    if (unit.team === 'player') {
        calculatedAtk += (playerUnitUpgrades[`${unit.type}_atk`] || 0);
        if (equippedGlacierBow && unit.baseRange > 1) {
            calculatedAtk += 2;
        }
        // Armor
        const armorData = ARMOR_DATA[unit.armor_type || equippedArmorId];
        if (armorData) {
            const armorLevel = playerOwnedArmor[unit.armor_type || equippedArmorId] || 0;
            const atkBonus = armorData.atkBonus || 0;
            if (armorData.id === 'red') {
                calculatedAtk += Math.ceil(armorLevel / 2);
            } else {
                calculatedAtk += atkBonus + (atkBonus > 0 ? Math.max(0, armorLevel - 1) : 0);
            }
        }
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

    // Apply Totem Auras
    const totems = units.filter(u => u.team === 'enemy' && u.isTotem && isUnitAliveAndValid(u));
    let atkModifier = 0;
    let hasBloodlustAura = false;
    let hasCursedAura = false;

    totems.forEach(totem => {
        const distance = Math.abs(unit.x - totem.x) + Math.abs(unit.y - totem.y);
        const totemRange = UNIT_DATA[totem.type]?.range || 2;

        if (distance <= totemRange && hasLineOfSight(totem, unit)) {
            if (totem.type === 'bloodlust_totem' && unit.team === 'enemy' && !unit.isTotem) {
                atkModifier += 1;
                hasBloodlustAura = true;
            } else if (totem.type === 'cursed_totem' && unit.team === 'player') {
                atkModifier -= 1;
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
    // Use unit.baseMov which includes armor bonuses from unit creation
    let calculatedMov = (unit.baseMov !== undefined) ? unit.baseMov : (baseUnitData.mov || 0);

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
    unit.range = unit.currentRange;

    // Ensure min 1 ATK only if base ATK > 0
    if (baseUnitData.baseAtk > 0) {
        unit.atk = Math.max(1, calculatedAtk + atkModifier);
    } else {
        unit.atk = Math.max(0, calculatedAtk + atkModifier);
    }

    // Update UI if selected
    if (selectedUnit && selectedUnit.id === unit.id && typeof updateUnitInfo === 'function') {
        updateUnitInfo(selectedUnit);
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
window.debugSpawnTome = window.debugSpawnTome;
