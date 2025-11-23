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
let levelToRestartOnLoss = 1;
let currentSpell = null;
let spellUses = {};
let spellsUnlocked = {};
let spellsUsedThisLevel = false;
let unlimitedSpellsCheat = false;
let winCheckTimeout = null;
let levelClearedAwaitingInput = false;
let isGameActiveFlag = false;
let playerActionsTakenThisLevel = 0;
let goldCollectedThisLevel = 0;
let baseGoldEarnedThisLevel = 0;
let enemiesKilledThisLevel = 0;
let unitsLostThisLevel = 0;
let highestLevelReached = 1;
let playerGold = 0;
let playerOwnedUnits = { knight: 3, archer: 0, champion: 0, rogue: 0 };
let playerActiveRoster = {};
let activeRosterAtLevelStart = {};
let playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 };
let playerAbilityUpgrades = { rogue_quickstrike: 0 };
let playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
let playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 };
let playerOwnedArmor = { grey: 1 };
let equippedArmorId = 'grey';
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
let isProcessing = false;

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

    // Archers (and goblin archers) can shoot over units
    const canShootOverUnits = startUnit.type === 'archer' || startUnit.type === 'goblin_archer' || startUnit.type === 'goblin_pyro';

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
                    if (unit.isStealthed && getDistance(startUnit, unit) > 1) {
                        return false;
                    }
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
    if (endUnit && endUnit.id !== startUnit.id && endUnit.isStealthed && !ignoreStealthOnTarget && getDistance(startUnit, endUnit) > 1) {
        return false;
    }
    return true;
}

async function preloadAssetsAndStart() {
    loadGameData();
    setVolume('music', musicVolume);
    setVolume('sfx', sfxVolume);
    if (isMuted) toggleMute(false);
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
    spellsUnlocked[spellName] = highestLevelReached > unlockLevel;
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
        spellsUnlocked[name] = highestLevelReached > unlockCheckLevel;
        if (spellsUnlocked[name] && !previouslyUnlocked) {
            justUnlockedFeedback.push(config?.name || name);
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
    units = [];
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

    if (typeof clearAllWorldHpBars === 'function') clearAllWorldHpBars();
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = null;
}

function fullGameReset() {
    resetLevelState();
    stopMusic();
    isGameActiveFlag = false;
    currentLevel = 1;
    levelToRestartOnLoss = 1;
    saveSettings();
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

        initializeGridState();
        spawnObstacles();
        spawnInitialUnits();
        applyArmorBonuses();
        spawnEnemies();
        spawnItems();

        units.forEach(u => {
            u.acted = false; u.actionsTakenThisTurn = 0;
            u.isFrozen = false; u.frozenTurnsLeft = 0;
            u.isNetted = false; u.nettedTurnsLeft = 0;
            u.isSlowed = false; u.slowedTurnsLeft = 0;
            u.isStealthed = false; u.quickStrikeActive = false;
            u.stealthAttackBonusUsed = false; u.netCooldownTurnsLeft = 0;
            u.totemCooldown = 0; u.flameWaveCooldown = 0;
            u.inTower = null; u.currentRange = u.baseRange;
        });

        if (typeof renderAll === 'function') renderAll();
        if (gameSettings.showHpBars && typeof createAllWorldHpBars === 'function') createAllWorldHpBars();
        if (typeof applyLayout === 'function') applyLayout();
        if (typeof centerView === 'function') centerView(true);

        playSfx('startBeep');
        selectAndLoadMusic();
        startMusicIfNotPlaying();

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
        let doorsToPlace = spawnPool.filter(pos => Math.random() < DOOR_CHANCE).length;
        doorsToPlace = Math.min(doorsToPlace, Math.floor(numObstacles * 0.2));
        for (let i = 0; i < spawnPool.length && placedFeatures.doors < doorsToPlace; i++) {
            const pos = spawnPool[i];
            const isVertical = Math.random() < 0.5;
            if (tryPlaceObstacle('door', pos.x, pos.y, isVertical)) {
                placedFeatures.doors++; spawnedCount++; spawnPool.splice(i, 1); i--;
            }
        }
    }

    if (currentTerrainInfo.name === 'castle') {
        generateCastleLayout(numObstacles, occupied, gridState);
        return;
    }

    let attempts = 0;
    const maxAttempts = (numObstacles - spawnedCount) * 10;
    const clusterCount = Math.max(1, Math.floor(numObstacles / 4)); // Roughly 4 blocks per cluster

    while (spawnedCount < numObstacles && attempts < maxAttempts && spawnPool.length > 0) {
        attempts++;
        // Pick a random seed from the pool
        const seedIndex = Math.floor(Math.random() * spawnPool.length);
        const seed = spawnPool[seedIndex]; // Don't splice yet, we might fail to place

        // Decide cluster type: 0=Block, 1=Line Horizontal, 2=Line Vertical, 3=Random Walk
        const clusterType = Math.floor(Math.random() * 4);
        const clusterSize = Math.min(numObstacles - spawnedCount, Math.floor(Math.random() * 3) + 2); // 2-4 size

        let currentCluster = [];

        if (clusterType === 0) { // Block (2x2ish)
            currentCluster.push({ x: seed.x, y: seed.y });
            currentCluster.push({ x: seed.x + 1, y: seed.y });
            currentCluster.push({ x: seed.x, y: seed.y + 1 });
            currentCluster.push({ x: seed.x + 1, y: seed.y + 1 });
        } else if (clusterType === 1) { // Horizontal Line
            for (let i = 0; i < clusterSize; i++) currentCluster.push({ x: seed.x + i, y: seed.y });
        } else if (clusterType === 2) { // Vertical Line
            for (let i = 0; i < clusterSize; i++) currentCluster.push({ x: seed.x, y: seed.y + i });
        } else { // Random Walk
            let curr = { x: seed.x, y: seed.y };
            for (let i = 0; i < clusterSize; i++) {
                currentCluster.push({ ...curr });
                if (Math.random() < 0.5) curr.x += (Math.random() < 0.5 ? 1 : -1);
                else curr.y += (Math.random() < 0.5 ? 1 : -1);
            }
        }

        // Try to place the cluster
        let placedInCluster = 0;
        for (const pos of currentCluster) {
            if (spawnedCount >= numObstacles) break;
            // Check if pos is in spawnPool (valid and unoccupied)
            // We need to find the exact object in spawnPool to remove it
            const poolIndex = spawnPool.findIndex(p => p.x === pos.x && p.y === pos.y);
            if (poolIndex !== -1) {
                const validPos = spawnPool[poolIndex];
                if (!occupied.has(`${validPos.x},${validPos.y}`) && !gridState[validPos.y]?.[validPos.x]) {
                    const type = Math.random() < WALL_ROCK_CHANCE ? 'wall_rock' : 'rock';
                    if (tryPlaceObstacle(type, validPos.x, validPos.y)) {
                        spawnedCount++;
                        placedInCluster++;
                        spawnPool.splice(poolIndex, 1); // Remove used spot
                    }
                }
            }
        }

        // If we barely placed anything, maybe try a single random spot
        if (placedInCluster === 0) {
            const fallbackIndex = Math.floor(Math.random() * spawnPool.length);
            const fallbackPos = spawnPool.splice(fallbackIndex, 1)[0];
            if (fallbackPos) {
                const type = Math.random() < WALL_ROCK_CHANCE ? 'wall_rock' : 'rock';
                if (tryPlaceObstacle(type, fallbackPos.x, fallbackPos.y)) spawnedCount++;
            }
        }
    }
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
                        tryPlace('door', wallPos.x, wallPos.y, false);
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
            if (isCellInBounds(x, y) && gridState[y]?.[x] === null && !getUnitAt(x, y) && !getObstacleAt(x, y)) {
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

function spawnEnemies() {
    const occupied = new Set(units.map(u => `${u.x},${u.y}`));
    obstacles.forEach(obs => occupied.add(`${obs.x},${obs.y}`));

    let cycle = 0;
    if (currentLevel >= INFINITE_LEVEL_START) {
        cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);
    }
    const infiniteHpBonus = cycle * INFINITE_HP_BONUS_PER_CYCLE;
    const infiniteAtkBonus = cycle * INFINITE_ATK_BONUS_PER_CYCLE;

    const enemySpawnMaxY = Math.min(
        Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT) - 1,
        currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT) - 1 - MIN_ENEMY_PLAYER_START_DISTANCE
    );

    const numEnemiesBase = 3 + Math.floor(currentLevel / 2.5);
    const numEnemies = Math.min(numEnemiesBase, Math.floor(currentGridCols * (enemySpawnMaxY + 1) * 0.4));

    const worldInfo = getTilesetForLevel(currentLevel);
    const poolNameForLevel = currentLevel >= INFINITE_LEVEL_START ? 'infinite' : worldInfo.name;
    const effectivePool = WORLD_ENEMY_POOL[poolNameForLevel] || WORLD_ENEMY_POOL.infinite;

    const unitsToSpawnTypes = [];
    const isJuggernautLevel = (currentLevel >= JUGGERNAUT_INTRO_LEVEL && currentLevel % JUGGERNAUT_SPAWN_LEVEL_MULTIPLE === 0);
    let spawnTreasureHunter = false;
    if (currentLevel >= GOBLIN_TREASURE_HUNTER_INTRO_LEVEL &&
        (currentLevel - lastTreasureHunterLevel) >= TREASURE_HUNTER_SPAWN_COOLDOWN &&
        Math.random() < TREASURE_HUNTER_SPAWN_CHANCE) {
        spawnTreasureHunter = true;
        lastTreasureHunterLevel = currentLevel;
        saveGameData();
    }

    if (isJuggernautLevel && effectivePool.boss?.length > 0) {
        unitsToSpawnTypes.push(effectivePool.boss[Math.floor(Math.random() * effectivePool.boss.length)]);
    }
    if (spawnTreasureHunter) {
        unitsToSpawnTypes.push('goblin_treasure_hunter');
    }

    const remainingCount = numEnemies - unitsToSpawnTypes.length;
    if (remainingCount > 0) {
        const weightedPool = [];
        (effectivePool.common || []).forEach(type => weightedPool.push(type, type, type));
        (effectivePool.uncommon || []).forEach(type => weightedPool.push(type, type));
        (effectivePool.rare || []).forEach(type => weightedPool.push(type));
        if (weightedPool.length === 0) weightedPool.push('goblin');
        for (let i = 0; i < remainingCount; i++) {
            unitsToSpawnTypes.push(weightedPool[Math.floor(Math.random() * weightedPool.length)]);
        }
    }

    let spawnPoolPositions = [];
    const playerMidX = Math.floor(currentGridCols / 2);
    const playerStartY = currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);
    for (let y = 0; y <= enemySpawnMaxY; y++) {
        for (let x = 0; x < currentGridCols; x++) {
            if (isCellInBounds(x, y) && !occupied.has(`${x},${y}`) && !getObstacleAt(x, y) && getDistance({ x, y }, { x: playerMidX, y: playerStartY }) >= MIN_ENEMY_PLAYER_START_DISTANCE) {
                spawnPoolPositions.push({ x, y });
            }
        }
    }
    spawnPoolPositions.sort(() => 0.5 - Math.random());

    for (const typeToSpawn of unitsToSpawnTypes) {
        if (spawnPoolPositions.length === 0) break;
        const pos = spawnPoolPositions.pop();
        const variant = typeToSpawn === 'goblin_treasure_hunter' ? GOBLIN_TREASURE_HUNTER_VARIANT : (WORLD_THEME_MAP[worldInfo.name] || 'green');
        const isElite = !UNIT_DATA[typeToSpawn]?.isBoss &&
            typeToSpawn !== 'goblin_treasure_hunter' && typeToSpawn !== 'shaman_totem' &&
            currentLevel >= ELITE_ENEMY_START_LEVEL && Math.random() < ELITE_ENEMY_CHANCE;

        const newUnit = createUnit(typeToSpawn, pos.x, pos.y, variant, isElite, infiniteHpBonus, infiniteAtkBonus);
        if (newUnit) occupied.add(`${pos.x},${pos.y}`);
    }
}

function spawnItems() {
    const occupiedSet = new Set(units.map(u => `${u.x},${u.y}`));
    obstacles.forEach(obs => occupiedSet.add(`${obs.x},${obs.y}`));
    let chestsToTry = 0;
    const chestChance = CHEST_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE);
    if (Math.random() < chestChance) {
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

function createUnit(type, x, y, variantType = 'green', isElite = false, infiniteHpBonus = 0, infiniteAtkBonus = 0) {
    const data = UNIT_DATA[type];
    if (!data) { console.error(`Invalid unit type: ${type}`); return null; }

    const unit = {
        id: `${data.id_prefix}${unitCounter++}`, type, x, y,
        baseHp: data.baseHp, baseAtk: data.baseAtk, baseMov: data.mov, baseRange: data.range,
        name: data.name, team: data.team, acted: false, actionsTakenThisTurn: 0,
        element: null,
        isFrozen: false, frozenTurnsLeft: 0,
        isNetted: false, nettedTurnsLeft: 0,
        isSlowed: false, slowedTurnsLeft: 0,
        isStealthed: false,
        quickStrikeActive: false,
        stealthAttackBonusUsed: false,
        variantType: null,
        isElite: false,
        inTower: null,
        currentRange: data.range,
        armor_type: data.armor_type || null,
        immuneToFire: false,
        immuneToFrost: false,
        ... (({
            knockback, cleaveDamage, canNet, canSummonTotem, totemType,
            suicideExplode, explodeOnDeath, explosionDamage, explosionRadius,
            shootsProjectileType, meleeOnlyAttack, baseMeleeAtk, canCastFlameWave,
            fireballDamage, flameWaveDamage, isTreasureHunter, flees,
            canStealth, canQuickStrike, isBoss, dropsArmor, isTotem, healAmount
        }) => ({
            knockback: knockback ?? false, cleaveDamage: cleaveDamage ?? 0, canNet: canNet ?? false,
            canSummonTotem: canSummonTotem ?? false, totemType: totemType ?? null,
            suicideExplode: suicideExplode ?? false, explodeOnDeath: explodeOnDeath ?? false,
            explosionDamage: explosionDamage ?? 0, explosionRadius: explosionRadius ?? 0,
            shootsProjectileType: shootsProjectileType ?? 'none', meleeOnlyAttack: meleeOnlyAttack ?? false,
            baseMeleeAtk: baseMeleeAtk ?? 0,
            canCastFlameWave: canCastFlameWave ?? false, fireballDamage: fireballDamage ?? 0,
            flameWaveDamage: flameWaveDamage ?? 0, isTreasureHunter: isTreasureHunter ?? false,
            flees: flees ?? false, canStealth: canStealth ?? false, canQuickStrike: canQuickStrike ?? false,
            isBoss: isBoss ?? false, dropsArmor: dropsArmor ?? false, isTotem: isTotem ?? false,
            healAmount: healAmount ?? 0,
        }))(data),
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
        unit.maxHp += playerUnitUpgrades[`${type}_hp`] || 0;
        unit.atk += playerUnitUpgrades[`${type}_atk`] || 0;
        if (type === 'rogue' && playerAbilityUpgrades.rogue_quickstrike > 0) {
            unit.canQuickStrike = true;
        }
    } else if (unit.team === 'enemy' && !unit.isTotem) {
        unit.variantType = variantType || 'green';
        let prefix = '';
        if (unit.variantType === 'red') {
            prefix = 'Ember '; unit.atk += GOBLIN_RED_ATK_BONUS;
            if (type === 'orc_juggernaut') unit.atk++;
            if (currentLevel >= IMMUNITY_LEVEL_START) unit.immuneToFire = true;
        } else if (unit.variantType === 'blue') {
            prefix = 'Azure '; unit.maxHp += GOBLIN_BLUE_HP_BONUS; unit.inflictsSlow = true;
            if (type === 'orc_juggernaut') unit.maxHp += 2;
            if (currentLevel >= IMMUNITY_LEVEL_START) unit.immuneToFrost = true;
        } else if (unit.variantType === 'yellow') {
            prefix = 'Sand '; unit.mov += GOBLIN_YELLOW_MOV_BONUS;
            if (GOBLIN_YELLOW_DOUBLE_TURN && type !== 'orc_juggernaut') unit.canMoveAndAttack = true;
        }
        if (isElite) {
            prefix = `Elite ${prefix}`; unit.isElite = true;
            unit.maxHp += ELITE_STAT_BONUS.hp; unit.atk += ELITE_STAT_BONUS.atk;
        }
        unit.maxHp += infiniteHpBonus; unit.atk += infiniteAtkBonus;
        if (prefix) { unit.name = `${prefix}${unit.name}`; }
    }

    unit.hp = unit.maxHp;

    unit.spriteUrl = getUnitSpriteUrl(type, unit.variantType, unit.armor_type);
    unit.portraitUrl = getUnitSpriteUrl(type, unit.variantType, unit.armor_type);
    unit.deadSpriteUrl = getUnitSpriteUrl(type, unit.variantType, unit.armor_type);

    units.push(unit);
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

            unit.maxHp = (baseUnitData.baseHp || 1) + (playerUnitUpgrades[`${unit.type}_hp`] || 0);
            unit.atk = (baseUnitData.baseAtk || 0) + (playerUnitUpgrades[`${unit.type}_atk`] || 0);
            unit.mov = (baseUnitData.mov || 1);

            if (armorData.id === 'none') {
                unit.maxHp = 1;
                unit.mov += armorData.movBonus || 0;
            } else {
                unit.maxHp += armorData.hpBonus || 0;
                unit.atk += armorData.atkBonus || 0;
                unit.mov += armorData.movBonus || 0;
            }

            unit.maxHp = Math.max(1, unit.maxHp);
            // Apply the HP percentage to the new maxHp, then cap at new maxHp
            unit.hp = Math.min(Math.ceil(unit.maxHp * hpPercentage), unit.maxHp);
            unit.atk = Math.max(0, unit.atk);
            unit.mov = Math.max(1, unit.mov);
            unit.baseMov = unit.mov;

            const armorLevel = playerOwnedArmor[equippedArmorId] || 0;
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
    const ownedLevel = playerOwnedArmor[armorId] || 0;
    if (ownedLevel > 0 || armorId === 'grey' || armorId === 'none') {
        equippedArmorId = armorId;
        applyArmorBonuses();
        saveGameData();
        if (typeof updateShopDisplay === 'function') updateShopDisplay();
        if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit);
        return true;
    }
    return false;
}

function createObstacle(type, x, y) {
    const data = OBSTACLE_DATA[type];
    if (!data) return null;

    const obstacle = {
        id: `obs${obstacleCounter++}`, type, x, y,
        hp: data.hp, maxHp: data.hp,
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
        clickable: data.clickable || false
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

    if (type === 'chest') {
        item.baseGoldAmount = data.baseGoldAmount;
        item.potionChance = Math.min(POTION_DROP_CHANCE_CHEST_MAX, POTION_DROP_CHANCE_CHEST_BASE + POTION_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1));
        item.gemChance = Math.min(GEM_DROP_CHANCE_CHEST_MAX, GEM_DROP_CHANCE_CHEST_BASE + GEM_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1));
        item.spellbookChance = SPELLBOOK_REQUIRED_SPELL_USE && spellsUsedThisLevel ? SPELLBOOK_DROP_CHANCE_CHEST : 0;
        const maxBonusGold = Math.min(CHEST_MAX_TOTAL_GOLD - item.baseGoldAmount, Math.floor(CHEST_MAX_BONUS_GOLD_PER_LEVEL * currentLevel));
        item.value = item.baseGoldAmount + Math.floor(Math.random() * (maxBonusGold + 1));
        item.value = Math.max(1, Math.min(CHEST_MAX_TOTAL_GOLD, item.value));
    } else if (type === 'shiny_gem') {
        item.value = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin;
    } else if (type === 'armor') {
        const worldInfo = getTilesetForLevel(currentLevel);
        item.armorId = WORLD_ARMOR_MAP[worldInfo.name] || 'grey';
    }

    items.push(item);
    return item;
}

function finishAction(unit, actionType = 'other') {
    if (!unit || !isUnitAliveAndValid(unit)) return;

    if (!levelClearedAwaitingInput) {
        unit.actionsTakenThisTurn++;
        const maxActions = (unit.canQuickStrike && unit.quickStrikeActive) ? 2 : 1;

        if (unit.isStealthed && actionType !== 'stealth' && actionType !== 'move') {
            unit.isStealthed = false;
            if (actionType === 'attack') unit.stealthAttackBonusUsed = true;
            else unit.stealthAttackBonusUsed = false;
        }

        if (unit.actionsTakenThisTurn >= maxActions || (actionType === 'stealth' && !unit.quickStrikeActive)) {
            unit.acted = true;
            unit.quickStrikeActive = false;
        } else {
            unit.acted = false;
        }

        if (unit.team === 'player' && (actionType === 'move' || actionType === 'attack' || actionType === 'ability' || actionType === 'stealth')) {
            playerActionsTakenThisLevel++;
            if (typeof updateQuitButton === 'function') updateQuitButton();
        }
    } else {
        unit.acted = false;
        unit.actionsTakenThisTurn = 0;
    }

    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    if (gameSettings.showHpBars && typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);

    if (selectedUnit?.id === unit.id) {
        if (unit.acted && !levelClearedAwaitingInput) {
            if (typeof deselectUnit === 'function') deselectUnit(false);
        } else {
            if (typeof highlightMovesAndAttacks === 'function') highlightMovesAndAttacks(unit);
            if (typeof updateUnitInfo === 'function') updateUnitInfo(unit);
        }
    }

    if (!levelClearedAwaitingInput) checkWinLossConditions();
}

function activateRogueStealth(unit) {
    if (!unit || !unit.canStealth || unit.isStealthed || unit.acted || unit.isFrozen || unit.isNetted || levelClearedAwaitingInput) {
        playSfx('error');
        showFeedback("Cannot use Stealth now.", "feedback-error");
        return false;
    }
    playSfx('rogueStealth');
    unit.isStealthed = true;
    unit.stealthAttackBonusUsed = false;
    finishAction(unit, 'stealth');
    showFeedback(`${unit.name} uses Stealth!`, "feedback-turn");
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    if (typeof updateUnitInfo === 'function') updateUnitInfo(unit);
    return true;
}

function activateRogueQuickStrike(unit) {
    if (!unit || !unit.canQuickStrike || unit.quickStrikeActive || unit.acted || unit.isFrozen || unit.isNetted || unit.isStealthed || levelClearedAwaitingInput) {
        playSfx('error');
        showFeedback("Cannot use Quick Strike now.", "feedback-error");
        return false;
    }
    playSfx('rogueQuickStrike');
    unit.quickStrikeActive = true;
    // finishAction(unit, 'ability'); // Do not consume action for activating ability
    showFeedback(`${unit.name} readies Quick Strike!`, "feedback-turn");
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    if (typeof updateUnitInfo === 'function') updateUnitInfo(unit);
    if (typeof highlightMovesAndAttacks === 'function') highlightMovesAndAttacks(unit);
    return true;
}

async function revealSnowman(snowmanObstacle, revealedByUnit = null) {
    if (!snowmanObstacle || snowmanObstacle.revealed || !snowmanObstacle.hidesUnit || !isObstacleIntact(snowmanObstacle)) return;
    snowmanObstacle.revealed = true;
    snowmanObstacle.hp = 0;

    const goblinType = snowmanObstacle.hiddenUnitType || 'goblin';
    const goblinVariant = snowmanObstacle.hiddenUnitVariant || 'blue';
    const goblinX = snowmanObstacle.x;
    const goblinY = snowmanObstacle.y;

    await removeObstacle(snowmanObstacle);

    if (!getUnitAt(goblinX, goblinY) && !getObstacleAt(goblinX, goblinY)) {
        const goblin = createUnit(goblinType, goblinX, goblinY, goblinVariant);
        if (goblin) {
            goblin.hp = goblin.maxHp; // Ensure full HP
            playSfx('snowmanReveal');
            if (typeof renderUnit === 'function') renderUnit(goblin);
            if (gameSettings.showHpBars && typeof createWorldHpBar === 'function') createWorldHpBar(goblin);
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
        }
    } else {
        console.warn("Snowman cell blocked after destruction, goblin couldn't spawn.");
        playSfx('error');
    }
    checkWinLossConditions();
}

async function enterTower(unit, tower) {
    if (!unit || !tower || tower.occupantUnitId || !tower.enterable || !isUnitAliveAndValid(unit) || unit.y !== tower.y + 1 || unit.x !== tower.x || levelClearedAwaitingInput) return false;
    if (unit.inTower) leaveTower(unit);

    const startX = unit.x; const startY = unit.y;
    unit.x = tower.x; unit.y = tower.y;
    tower.occupantUnitId = unit.id; unit.inTower = tower.id;
    playSfx('towerEnter');
    unit.currentRange = unit.baseRange + (unit.baseRange > 1 ? tower.rangeBonus : 0);

    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
    if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
    if (typeof animateUnitMove === 'function') await animateUnitMove(unit, startX, startY, unit.x, unit.y);
    else if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);

    finishAction(unit, 'move');
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
    if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
}

async function initiateTowerEntrySequence(unit, tower, path) {
    if (!unit || !tower || !path) return;
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

async function moveUnit(unit, targetX, targetY) {
    if (!unit || !isUnitAliveAndValid(unit)) return false;

    let canAct = (!levelClearedAwaitingInput && !unit.acted);
    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;
    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAct = true;
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
        playSfx('move');
        let animationStartX = startX; let animationStartY = startY;

        if (towerUnitIsIn && targetX === towerUnitIsIn.x && targetY === towerUnitIsIn.y + 1) {
            leaveTower(unit); animationStartX = towerUnitIsIn.x; animationStartY = towerUnitIsIn.y;
        } else if (obstacleAtTarget?.enterable) {
            enteringTower = true;
        } else {
            unit.x = targetX; unit.y = targetY;
        }

        if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);

        if (typeof animateUnitMove === 'function' && !enteringTower) {
            await animateUnitMove(unit, animationStartX, animationStartY, unit.x, unit.y);
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
                    if (typeof showPopup === 'function') {
                        setTimeout(() => {
                            if (item.type === 'shiny_gem') showGemPopup(x, y, goldValue);
                            else showGoldPopup(x, y, goldValue);
                        }, feedbackDelay);
                    }
                    feedbackDelay += 250; // Smaller delay for popups
                    break;
                case 'healUnit':
                    const healAmount = itemData.value || 0;
                    if (unit.hp < unit.maxHp) {
                        const healApplied = Math.min(healAmount, unit.maxHp - unit.hp);
                        unit.hp += healApplied; healAppliedTotal += healApplied; collectedCounts.health_potion++;
                    } else if (levelClearedAwaitingInput) {
                        goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP; baseGoldEarnedThisLevel += POTION_GOLD_VALUE_IF_FULL_HP; collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP;
                        if (typeof showGoldPopup === 'function') {
                            setTimeout(() => showGoldPopup(x, y, POTION_GOLD_VALUE_IF_FULL_HP), feedbackDelay);
                        }
                        feedbackDelay += 250;
                    }
                    break;
                case 'openChest':
                    if (!item.opened) {
                        item.opened = true; chestOpenedThisCheck = true;
                        if (typeof updateVisualItemState === 'function') updateVisualItemState(item);
                        const chestGold = item.value || 0;
                        goldFromThisPickup += chestGold; baseGoldEarnedThisLevel += chestGold; collectedCounts.gold += chestGold;
                        if (typeof showGoldPopup === 'function') {
                            setTimeout(() => showGoldPopup(x, y, chestGold), feedbackDelay);
                        }
                        feedbackDelay += 250;

                        if (Math.random() < item.potionChance) {
                            if (unit.hp < unit.maxHp) {
                                const healApplied = Math.min(HEALTH_POTION_HEAL_AMOUNT, unit.maxHp - unit.hp);
                                unit.hp += healApplied; healAppliedTotal += healApplied; collectedCounts.health_potion++;
                            } else if (levelClearedAwaitingInput) {
                                goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP; baseGoldEarnedThisLevel += POTION_GOLD_VALUE_IF_FULL_HP; collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP;
                                if (typeof showGoldPopup === 'function') {
                                    setTimeout(() => showGoldPopup(x, y, POTION_GOLD_VALUE_IF_FULL_HP), feedbackDelay);
                                }
                                feedbackDelay += 250;
                            }
                        }
                        if (Math.random() < item.gemChance) {
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
                case 'collectArmor':
                    const armorId = item.armorId || 'grey';
                    const currentArmorLevel = playerOwnedArmor[armorId] || 0;
                    playerOwnedArmor[armorId] = currentArmorLevel + 1; collectedCounts.armor++; saveGameData();
                    if (typeof showFeedback === 'function') {
                        setTimeout(() => showFeedback(`${ARMOR_DATA[armorId]?.name || 'Armor'} obtained (Lvl ${currentArmorLevel + 1})!`, 'feedback-levelup'), feedbackDelay);
                        feedbackDelay += FEEDBACK_DELAY_INCREMENT;
                    }
                    checkAchievements('collect_armor', { armorId: armorId });
                    if (typeof updateShopDisplay === 'function') updateShopDisplay();
                    break;
                default: console.warn(`Unknown item pickup action: ${itemData.pickupAction}`); break;
            }
        }
    });

    playerGold += goldFromThisPickup; goldCollectedThisLevel += goldFromThisPickup;

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
                    if (item.type === 'shiny_gem') gemsCollected++;
                    if (typeof animateItemMagnetPull === 'function') animateItemMagnetPull(item, unit);
                    else if (item.element) item.element.remove();
                });
            }
        }
    });

    if (goldCollected > 0) {
        playerGold += goldCollected; goldCollectedThisLevel += goldCollected;
        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
        let feedbackMsg = `Magnet Lvl ${magnetLevel}: +${goldCollected}<span class="icon icon-inline icon-gold"></span>`;
        if (gemsCollected > 0) feedbackMsg += ` (${gemsCollected} Gem${gemsCollected > 1 ? 's' : ''})`;
        if (typeof showFeedback === 'function') showFeedback(feedbackMsg, 'feedback-gold', 1500);
        if (gemsCollected > 0) playSfx('gemPickup');
        if (goldCollected > (gemsCollected * SHINY_GEM_MIN_GOLD)) playSfx('pickup');

        setTimeout(() => {
            items = items.filter(item => !collectedItems.has(item.id));
        }, ITEM_MAGNET_FLY_DURATION_MS + 50);
    }
}

async function attack(attacker, targetX, targetY) {
    if (!attacker || !isUnitAliveAndValid(attacker)) return;

    let canAttack = !levelClearedAwaitingInput && !attacker.acted;
    if (levelClearedAwaitingInput) canAttack = true; // Allow attacking if level is cleared
    if (attacker.canMoveAndAttack && attacker.actionsTakenThisTurn < 2) canAttack = true;
    if (attacker.quickStrikeActive && attacker.actionsTakenThisTurn < 2) canAttack = true;
    if (!canAttack || attacker.isFrozen) { return; }

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

    if (!targetObject) { playSfx('error'); return; }

    const isTargetAttackable = (targetObject.team && targetObject.team !== attacker.team) || targetObject.canBeAttacked;
    if (!isTargetAttackable) { playSfx('error'); showFeedback("Cannot attack that.", "feedback-error"); return; }

    const distance = getDistance(attacker, targetObject);
    const range = attacker.currentRange;
    const isRanged = distance > 1;
    const ignoreStealthLOS = attacker.isStealthed && distance <= 1;
    const endUnit = targetUnit || unitInTargetTower;
    const targetIsVisible = !endUnit?.isStealthed || distance <= 1 || (attacker.isStealthed && distance <= 1);

    if (!targetIsVisible || distance > range || (isRanged && !hasLineOfSight(attacker, targetObject, ignoreStealthLOS) && targetObject.type !== 'door')) {
        playSfx('error'); showFeedback("Cannot attack target (Range/LOS/Stealth).", "feedback-error"); return;
    }
    if (attacker.isFrozen) { playSfx('error'); showFeedback("Unit is frozen!", "feedback-error"); return; }
    if (attacker.meleeOnlyAttack && isRanged) {
        playSfx('error'); showFeedback("Unit can only melee attack.", "feedback-error"); return;
    }
    if (attacker.team === 'player' && attacker.shootsProjectileType === 'none' && !attacker.meleeOnlyAttack && isRanged) { // Non-archer player ranged like Netter
        // Allow if it's a special ability or if we decide they can range attack. But for Netter, they are melee only.
        // If config says meleeOnlyAttack, it's handled above.
    }

    if (isRanged && targetObject.type === 'door') { /* Allow attacking doors */ }
    if (isRanged && attacker.team === 'player' && targetObject.type === 'snowman' && !targetObject.revealed) { /* Allow */ }
    else if (isRanged && targetObject.type === 'snowman') { playSfx('error'); showFeedback("Snowman already broken.", "feedback-error"); return; }

    const targetIsUnit = !!targetObject.team;
    const targetOriginalData = { id: targetObject.id, x: targetX, y: targetY, type: targetObject.type };
    let damage = attacker.atk;
    let isStealthAttack = false;

    if (attacker.isStealthed && !attacker.stealthAttackBonusUsed) {
        damage += ROGUE_STEALTH_DAMAGE_BONUS; isStealthAttack = true;
    }

    let impactDelay = 0;
    const projectileType = isRanged ? attacker.shootsProjectileType : 'melee';
    const effectiveProjectileType = (targetObject.type === 'snowman' && isRanged && attacker.team === 'player') ? 'arrow' : projectileType;

    if (typeof animateAttack === 'function') {
        impactDelay = await animateAttack(attacker, targetObject, isRanged, effectiveProjectileType);
    }

    await new Promise(resolve => setTimeout(resolve, impactDelay));

    let currentTargetObject = targetIsUnit ? units.find(u => u.id === targetOriginalData.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === targetOriginalData.id && isObstacleIntact(o));
    let currentUnitInTower = null;
    if (!targetIsUnit && currentTargetObject?.enterable && currentTargetObject.occupantUnitId) { currentUnitInTower = units.find(u => u.id === currentTargetObject.occupantUnitId && isUnitAliveAndValid(u)); }
    else if (targetIsUnit && currentTargetObject?.inTower) { const currentTower = obstacles.find(o => o.id === currentTargetObject.inTower); if (currentTower && isObstacleIntact(currentTower)) { currentTargetObject = currentTower; currentUnitInTower = units.find(u => u.id === targetOriginalData.id && isUnitAliveAndValid(u)); } else { currentTargetObject = null; } }

    if (!currentTargetObject) {
        if (isUnitAliveAndValid(attacker) && !attacker.acted) finishAction(attacker, 'attack');
        checkWinLossConditions(); return;
    }

    if (currentTargetObject.type === 'snowman' && !currentTargetObject.revealed) {
        await revealSnowman(currentTargetObject, attacker);
        if (isUnitAliveAndValid(attacker) && !attacker.acted) finishAction(attacker, 'attack');
        return;
    }

    try {
        playSfx(isStealthAttack ? 'rogueAttack' : 'hit');
        if (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');

        let effectiveDamage = damage;
        const targetArmor = (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') ? ARMOR_DATA[equippedArmorId] : null;
        const targetArmorLevel = targetArmor ? (playerOwnedArmor[equippedArmorId] || 0) : 0;
        const targetImmuneFire = currentTargetObject.immuneToFire || (targetArmor && targetArmorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (targetArmor.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE);
        const targetImmuneFrost = currentTargetObject.immuneToFrost || (targetArmor && targetArmorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (targetArmor.resistances?.frost ?? 0) >= ARMOR_RESISTANCE_VALUE);

        if (forestArmorActiveTurns > 0 && attacker.team === 'enemy') {
            effectiveDamage = Math.max(1, effectiveDamage - 1);
        }
        effectiveDamage = Math.max(0, effectiveDamage);

        currentTargetObject.hp -= effectiveDamage;
        if (currentTargetObject.hp < 0) currentTargetObject.hp = 0;
        if (typeof showDamagePopup === 'function') showDamagePopup(targetOriginalData.x, targetOriginalData.y, effectiveDamage);
        if (typeof flashElementOnHit === 'function') flashElementOnHit(currentTargetObject.element);

        if (currentTargetObject.team) {
            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(currentTargetObject);
            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(currentTargetObject);
        }

        let deathPromises = [];
        let primaryTargetRemoved = false;
        let changed = false;

        if (currentTargetObject.hp <= 0) {
            primaryTargetRemoved = true;
            if (currentTargetObject.team) { deathPromises.push(removeUnit(currentTargetObject)); }
            else {
                const unitToDamageAfterTower = currentUnitInTower && isUnitAliveAndValid(currentUnitInTower) ? currentUnitInTower : null;
                deathPromises.push(removeObstacle(currentTargetObject));
                currentTargetObject = null;

                if (unitToDamageAfterTower) {
                    let towerDestroyDamage = Math.max(1, Math.floor(effectiveDamage / 2));
                    if (unitToDamageAfterTower.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit');
                    unitToDamageAfterTower.hp -= towerDestroyDamage;
                    if (unitToDamageAfterTower.hp < 0) unitToDamageAfterTower.hp = 0;
                    if (typeof showDamagePopup === 'function') showDamagePopup(unitToDamageAfterTower.x, unitToDamageAfterTower.y, towerDestroyDamage);
                    if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterTower.element);
                    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterTower);
                    if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterTower);
                    if (unitToDamageAfterTower.hp <= 0) deathPromises.push(removeUnit(unitToDamageAfterTower));
                }
            }
        }
        else if (currentTargetObject.team) {
            if (attacker.inflictsSlow) { currentTargetObject.isSlowed = true; currentTargetObject.slowedTurnsLeft = GOBLIN_BLUE_SLOW_DURATION; playSfx('slow_inflicted'); changed = true; }
            if (attacker.knockback) { /* knockback logic */ }
            if (changed && typeof updateUnitVisualState === 'function') updateUnitVisualState(currentTargetObject);
            if (changed && typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(currentTargetObject);
        }

        await Promise.all(deathPromises); deathPromises = [];

        if (attacker.type === 'champion' && attacker.cleaveDamage > 0 && currentTargetObject) {
            const currentAttacker = units.find(u => u.id === attacker.id);
            if (currentAttacker && isUnitAliveAndValid(currentAttacker)) {
                const attackDirX = Math.sign(targetOriginalData.x - currentAttacker.x); const attackDirY = Math.sign(targetOriginalData.y - currentAttacker.y);
                const potentialCleaveCellsCoords = [];
                const px = targetOriginalData.x, py = targetOriginalData.y;
                if (attackDirX !== 0) potentialCleaveCellsCoords.push({ x: px, y: py - 1 }, { x: px, y: py + 1 }, { x: px + attackDirX, y: py });
                else if (attackDirY !== 0) potentialCleaveCellsCoords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py + attackDirY });
                else potentialCleaveCellsCoords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py - 1 }, { x: px, y: py + 1 });
                await new Promise(r => setTimeout(r, 50));
                for (const { x: cleaveX, y: cleaveY } of potentialCleaveCellsCoords) {
                    if (!isCellInBounds(cleaveX, cleaveY)) continue;
                    let cleaveTarget = getUnitAt(cleaveX, cleaveY); let cleaveObstacle = getObstacleAt(cleaveX, cleaveY); let cleaveTargetObject = null; let unitInCleaveTower = null;
                    if (cleaveTarget && isUnitAliveAndValid(cleaveTarget) && cleaveTarget.team !== currentAttacker.team) { if (cleaveTarget.inTower) { const towerCleaveTargetIsIn = obstacles.find(o => o.id === cleaveTarget.inTower); if (towerCleaveTargetIsIn && isObstacleIntact(towerCleaveTargetIsIn)) { cleaveTargetObject = towerCleaveTargetIsIn; unitInCleaveTower = cleaveTarget; } else continue; } else { cleaveTargetObject = cleaveTarget; } }
                    else if (cleaveObstacle && cleaveObstacle.canBeAttacked && isObstacleIntact(cleaveObstacle)) { if (cleaveObstacle.enterable && cleaveObstacle.occupantUnitId) { const unitInside = units.find(u => u.id === cleaveObstacle.occupantUnitId); if (unitInside && unitInside.team !== currentAttacker.team) { cleaveTargetObject = cleaveObstacle; unitInCleaveTower = unitInside; } else { cleaveTargetObject = cleaveObstacle; } } else { cleaveTargetObject = cleaveObstacle; } }
                    if (!cleaveTargetObject || cleaveTargetObject.id === targetOriginalData.id) continue;
                    if (cleaveTargetObject.team === 'player' || unitInCleaveTower?.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit');
                    let effectiveCleaveDamage = attacker.cleaveDamage;
                    if (forestArmorActiveTurns > 0 && (cleaveTargetObject.team === 'player' || unitInCleaveTower?.team === 'player')) effectiveCleaveDamage = Math.max(1, effectiveCleaveDamage - 1);
                    effectiveCleaveDamage = Math.max(0, effectiveCleaveDamage);
                    cleaveTargetObject.hp -= effectiveCleaveDamage; if (cleaveTargetObject.hp < 0) cleaveTargetObject.hp = 0;
                    if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, effectiveCleaveDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(cleaveTargetObject.element);
                    const isCleaveTargetUnit = !!cleaveTargetObject.team; if (isCleaveTargetUnit) { if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(cleaveTargetObject); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(cleaveTargetObject); }
                    if (cleaveTargetObject.hp <= 0) { if (isCleaveTargetUnit) { deathPromises.push(removeUnit(cleaveTargetObject)); } else { const unitToDamageAfterCleavedTower = unitInCleaveTower && isUnitAliveAndValid(unitInCleaveTower) ? unitInCleaveTower : null; deathPromises.push(removeObstacle(cleaveTargetObject)); if (unitToDamageAfterCleavedTower) { let towerCleaveDamage = Math.max(1, Math.floor(effectiveCleaveDamage / 2)); if (unitToDamageAfterCleavedTower.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit'); unitToDamageAfterCleavedTower.hp -= towerCleaveDamage; if (unitToDamageAfterCleavedTower.hp < 0) unitToDamageAfterCleavedTower.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, towerCleaveDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterCleavedTower.element); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterCleavedTower); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterCleavedTower); if (unitToDamageAfterCleavedTower.hp <= 0) deathPromises.push(removeUnit(unitToDamageAfterCleavedTower)); } } }
                }
                await Promise.all(deathPromises);
            }
        }

        const finalAttackerCheck = units.find(u => u.id === attacker.id);
        if (finalAttackerCheck && isUnitAliveAndValid(finalAttackerCheck)) {
            finishAction(finalAttackerCheck, 'attack');
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
    if (!unit || !unit.explosionDamage || unit.explosionRadius < 0) return;
    const centerX = unit.x; const centerY = unit.y; const radius = unit.explosionRadius; const damage = unit.explosionDamage;
    playSfx('sapperExplode'); if (typeof createExplosionEffect === 'function') createExplosionEffect(centerX, centerY, 'fireball');
    await new Promise(r => setTimeout(r, 100));
    const affectedUnits = getUnitsInArea(centerX, centerY, radius); let deathPromises = [];
    affectedUnits.forEach(targetUnit => { if (targetUnit.id === unit.id || !isUnitAliveAndValid(targetUnit)) return; if (targetUnit.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit'); targetUnit.hp -= damage; if (targetUnit.hp < 0) targetUnit.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(targetUnit.x, targetUnit.y, damage); if (typeof flashElementOnHit === 'function') flashElementOnHit(targetUnit.element); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetUnit); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetUnit); if (targetUnit.hp <= 0) deathPromises.push(removeUnit(targetUnit)); });
    if (!isDeathExplosion) deathPromises.push(removeUnit(unit));
    await Promise.all(deathPromises); checkWinLossConditions();
}

function removeObstacle(obstacle) {
    return new Promise(resolve => {
        if (!obstacle) { resolve(); return; } const obsId = obstacle.id; const obsX = obstacle.x; const obsY = obstacle.y; const obsType = obstacle.type; obstacle.hp = 0;
        if (gridState[obsY]?.[obsX]?.type === obsType) gridState[obsY][obsX] = null;
        if (obstacle.occupantUnitId) { const unitInside = units.find(u => u.id === obstacle.occupantUnitId); if (unitInside) leaveTower(unitInside); obstacle.occupantUnitId = null; }
        if (typeof handleObstacleDestroyAnimation === 'function') { handleObstacleDestroyAnimation(obstacle).then(() => { const index = obstacles.findIndex(o => o.id === obsId); if (index !== -1) obstacles.splice(index, 1); if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY); resolve(); }); }
        else { obstacle.element?.remove(); const index = obstacles.findIndex(o => o.id === obsId); if (index !== -1) obstacles.splice(index, 1); if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY); resolve(); }
    });
}

async function removeUnit(unit) {
    if (!unit) return;
    const unitId = unit.id; const unitTeam = unit.team; const unitType = unit.type; const finalX = unit.x; const finalY = unit.y; const wasSelected = selectedUnit?.id === unitId; const shouldExplodeOnDeath = unit.explodeOnDeath || false; const isTreasureGoblin = unit.isTreasureHunter || false; const isBoss = unit.isBoss || false; const dropsArmorFlag = unit.dropsArmor || false;
    unit.hp = 0; if (unit.inTower) leaveTower(unit);
    if (unitTeam === 'enemy') { enemiesKilledThisLevel++; checkAchievements('kill', { type: unitType, isBoss: isBoss, world: currentTerrainInfo.name }); checkAchievements('kill_multiple', { targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 1 }); }
    else if (unitTeam === 'player') unitsLostThisLevel++;
    let itemsToDrop = []; let goldFromDrops = 0;
    if (unitTeam === 'enemy' && !unit.isTotem) {
        if (isBoss && dropsArmorFlag) {
            const worldInfo = getTilesetForLevel(currentLevel); const armorId = WORLD_ARMOR_MAP[worldInfo.name] || 'grey';
            if (armorId && ARMOR_DATA[armorId]) {
                const item = createItem('armor', finalX, finalY, 0);
                if (item) { item.armorId = armorId; itemsToDrop.push(item); }
            }
        }
        else if (isTreasureGoblin) { if ((playerPassiveUpgrades.gold_magnet || 0) === 0) itemsToDrop.push(createItem('gold_magnet', finalX, finalY, itemsToDrop.length)); const adjacentCells = getAdjacentCells(finalX, finalY, true).sort(() => 0.5 - Math.random()); const goldDrops = Math.floor(Math.random() * (GOBLIN_TREASURE_HUNTER_GOLD_DROP_MAX - GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN + 1)) + GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN; for (let i = 0; i < goldDrops && i < adjacentCells.length; i++) { const cell = adjacentCells[i]; if (!getUnitAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y)) { itemsToDrop.push(createItem('gold', cell.x, cell.y, i + 1)); goldFromDrops += 1; } } const gemDropCell = adjacentCells.find(cell => !getItemAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y) && !(cell.x === finalX && cell.y === finalY)); if (gemDropCell) itemsToDrop.push(createItem('shiny_gem', gemDropCell.x, gemDropCell.y, 100)); }
        else { if (Math.random() < GOLD_DROP_CHANCE) { let goldAmountToDrop = BASE_GOLD_DROP_AMOUNT; if (ADVANCED_ENEMY_TYPES.includes(unitType) && Math.random() < ADVANCED_GOBLIN_EXTRA_GOLD_CHANCE) goldAmountToDrop += ADVANCED_GOBLIN_EXTRA_GOLD_AMOUNT; goldFromDrops += goldAmountToDrop; for (let i = 0; i < goldAmountToDrop; i++) itemsToDrop.push(createItem('gold', finalX, finalY, itemsToDrop.length)); } const potionDropChance = POTION_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE)); if (Math.random() < potionDropChance) itemsToDrop.push(createItem('health_potion', finalX, finalY, itemsToDrop.length)); const gemDropChance = GEM_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE)); if (Math.random() < gemDropChance) itemsToDrop.push(createItem('shiny_gem', finalX, finalY, itemsToDrop.length)); if (SPELLBOOK_REQUIRED_SPELL_USE && spellsUsedThisLevel && Math.random() < SPELLBOOK_DROP_CHANCE_ENEMY) itemsToDrop.push(createItem('spellbook', finalX, finalY, itemsToDrop.length)); }
        if (itemsToDrop.length > 0) { if (goldFromDrops > 0) playSfx('goldDrop'); itemsToDrop = itemsToDrop.filter(Boolean); if (typeof animateItemDrop === 'function' && itemsToDrop.length > 0) await animateItemDrop(itemsToDrop, finalX, finalY); else if (typeof renderAll === 'function') renderAll(); }
    } else if (unitTeam === 'player') { playSfx('playerDie'); }
    if (unitTeam === 'enemy' && !itemsToDrop.some(i => i.type === 'gold')) {
        playSfx('goblinDie');
    }
    let explosionPromise = shouldExplodeOnDeath ? explodeUnit(unit, true) : Promise.resolve();
    if (wasSelected && typeof deselectUnit === 'function') deselectUnit(false); if (typeof updateUnitInfoOnDeath === 'function') updateUnitInfoOnDeath(unitId);
    // if (typeof removeWorldHpBar === 'function') removeWorldHpBar(unit.id); // Removed to keep HP bar visible during death animation
    if (typeof handleUnitDeathAnimation === 'function') handleUnitDeathAnimation(unit, finalX, finalY, deathSpriteTimeouts); else unit.element?.remove();
    const unitIndex = units.findIndex(u => u.id === unitId); if (unitIndex !== -1) units.splice(unitIndex, 1);
    await explosionPromise; checkWinLossConditions();
}

function getSpellEffectValue(spellName, baseValue, getNextLevelValue = false) { let upgradeLevel = playerSpellUpgrades[spellName] || 0; if (getNextLevelValue) upgradeLevel++; const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return baseValue; const cheatBonus = (config.stat === 'damage' && playerCheatSpellAttackBonus > 0) ? playerCheatSpellAttackBonus : 0; const effectIncrease = config.effectIncrease ?? 0; let calculationLevel = getNextLevelValue ? Math.min(upgradeLevel, config.maxLevel + 1) : Math.min(upgradeLevel, config.maxLevel); calculationLevel = upgradeLevel > config.maxLevel ? config.maxLevel : upgradeLevel; if (spellName === 'frostNova' && config.stat === 'radiusLevel') return Math.min(FROST_NOVA_BASE_RADIUS_LEVEL + calculationLevel, config.maxLevel); return baseValue + (calculationLevel * effectIncrease) + cheatBonus; }
function getFrostNovaRadiusLevel(getNextLevelValue = false) { let upgradeLevel = playerSpellUpgrades['frostNova'] || 0; if (getNextLevelValue) upgradeLevel++; const config = SPELL_UPGRADE_CONFIG['frostNova']; const maxUpgradeLevel = config?.maxLevel ?? 4; upgradeLevel = Math.min(upgradeLevel, maxUpgradeLevel); return Math.min(FROST_NOVA_BASE_RADIUS_LEVEL + upgradeLevel, maxUpgradeLevel); }

async function castSpell(spellName, target, originElement = null) {
    if ((!spellUses[spellName] && !unlimitedSpellsCheat) || currentTurn !== 'player') {
        playSfx('error'); if (typeof showFeedback === 'function') showFeedback("Cannot cast spell now.", "feedback-error"); return false;
    }
    if (!unlimitedSpellsCheat) spellUses[spellName] = false;
    spellsUsedThisLevel = true;
    if (typeof setActiveSpell === 'function') setActiveSpell(null);
    if (typeof updateSpellUI === 'function') updateSpellUI();

    let success = false; let deathPromises = [];
    try {
        switch (spellName) {
            case 'fireball':
                let fbTargetObject = null; let targetPos = null;
                if (target?.team === 'enemy' && isUnitAliveAndValid(target)) { fbTargetObject = target; targetPos = { x: target.x, y: target.y }; }
                else if (target && !target.team && target.canBeAttacked === true && isObstacleIntact(target)) { fbTargetObject = target; targetPos = { x: target.x, y: target.y }; }
                if (fbTargetObject && originElement && targetPos) {
                    playSfx('fireballShoot'); if (typeof animateFireball === 'function') animateFireball(originElement, targetPos.x, targetPos.y);
                    await new Promise(resolve => setTimeout(resolve, FIREBALL_PROJECTILE_DURATION_MS));
                    playSfx('fireballHit'); if (typeof createExplosionEffect === 'function') createExplosionEffect(targetPos.x, targetPos.y, 'fireball');
                    const stillTarget = fbTargetObject.team ? units.find(u => u.id === fbTargetObject.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === fbTargetObject.id && isObstacleIntact(o));
                    if (stillTarget) {
                        let actualDamage = getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE); let tookDamage = false;
                        if (stillTarget.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) { actualDamage = 1; }
                        actualDamage = Math.max(0, actualDamage);
                        stillTarget.hp -= actualDamage; tookDamage = true;
                        if (tookDamage) {
                            if (stillTarget.hp < 0) stillTarget.hp = 0;
                            if (typeof showDamagePopup === 'function') showDamagePopup(targetPos.x, targetPos.y, actualDamage);
                            if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element);
                            if (stillTarget.team && typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget);
                            if (stillTarget.hp <= 0) deathPromises.push(stillTarget.team ? removeUnit(stillTarget) : removeObstacle(stillTarget));
                            else if (stillTarget.team && typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(stillTarget);
                        }
                    }
                    success = true;
                } else { playSfx('error'); showFeedback("Invalid Fireball target.", "feedback-error"); success = false; }
                break;
            case 'flameWave':
                const targetRowFW = target.y;
                if (!isCellInBounds(0, targetRowFW)) { playSfx('error'); success = false; break; }
                const actualDamageFW = getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE);
                playSfx('flameWaveCast');
                if (typeof animateFlameWave === 'function') animateFlameWave(targetRowFW, true);
                setTimeout(() => { applyFlameWaveDamage(targetRowFW, actualDamageFW); }, FLAME_WAVE_STAGGER_DELAY_MS);
                success = true;
                break;
            case 'frostNova':
                const centerX = target.x; const centerY = target.y; playSfx('frostNovaCast');
                const radiusLevelFN = getFrostNovaRadiusLevel();
                // Radius 1 for level 1 (3x3), Radius 2 for level 2 (5x5), etc.
                const radiusFN = radiusLevelFN;
                const freezeDurationFN = FROST_NOVA_BASE_DURATION; let unitsFrozenCount = 0;
                if (typeof animateFrostNova === 'function') animateFrostNova(centerX, centerY, radiusLevelFN);
                await new Promise(r => setTimeout(r, 50));
                const affectedUnitsFN = getUnitsInArea(centerX, centerY, radiusFN);
                affectedUnitsFN.forEach(unit => {
                    if (unit?.team === 'enemy' && isUnitAliveAndValid(unit) && !unit.isFrozen) {
                        if (!(unit.immuneToFrost && currentLevel >= IMMUNITY_LEVEL_START)) {
                            unit.isFrozen = true; unit.frozenTurnsLeft = freezeDurationFN; unitsFrozenCount++;
                            if (typeof showFreezePopup === 'function') showFreezePopup(unit.x, unit.y);
                            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
                        }
                    }
                });
                if (unitsFrozenCount > 0) playSfx('frostNovaHit'); success = true;
                break;
            case 'heal':
                if (target?.team === 'player' && isUnitAliveAndValid(target)) {
                    const actualHealAmount = getSpellEffectValue(spellName, HEAL_BASE_AMOUNT);
                    const healApplied = Math.min(actualHealAmount, target.maxHp - target.hp);
                    if (healApplied > 0) {
                        playSfx('heal'); target.hp += healApplied;
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
        if (!success && !unlimitedSpellsCheat && spellName && !spellUses[spellName]) {
            spellUses[spellName] = true; spellsUsedThisLevel = false;
            if (typeof updateSpellUI === 'function') updateSpellUI();
        }
        await Promise.all(deathPromises);
        checkWinLossConditions();
        if (typeof clearSpellHighlights === 'function') clearSpellHighlights();
    }
    return success;
}

function processTurnStart(team) {
    units.slice().forEach(unit => {
        if (!isUnitAliveAndValid(unit)) return;
        if (unit.team === team) {
            unit.actionsTakenThisTurn = 0;
            unit.acted = false;
            if (unit.netCooldownTurnsLeft > 0) unit.netCooldownTurnsLeft--;
            if (unit.totemCooldown > 0) unit.totemCooldown--;
            if (unit.flameWaveCooldown > 0) unit.flameWaveCooldown--;
            // Totem healing at start of turn
            if (unit.isTotem && team === 'enemy') {
                const alliesInRange = getUnitsInArea(unit.x, unit.y, SHAMAN_TOTEM_RANGE)
                    .filter(u => u.team === 'enemy' && !u.isTotem && u.hp < u.maxHp && isUnitAliveAndValid(u))
                    .sort((a, b) => a.hp - b.hp);
                if (alliesInRange.length > 0) {
                    const targetAlly = alliesInRange[0];
                    const healAmount = SHAMAN_TOTEM_HEAL;
                    const actualHeal = Math.min(healAmount, targetAlly.maxHp - targetAlly.hp);
                    if (actualHeal > 0) {
                        targetAlly.hp += actualHeal; playSfx('shamanHeal');
                        if (typeof showHealPopup === 'function') showHealPopup(targetAlly.x, targetAlly.y, actualHeal);
                        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetAlly);
                        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetAlly);
                    }
                }
            }
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
        }
    });
}

function processTurnEnd(team) {
    units.slice().forEach(unit => {
        if (!isUnitAliveAndValid(unit)) return;
        if (unit.team === team) {
            let changed = false;
            if (unit.isFrozen) {
                unit.frozenTurnsLeft--;
                if (unit.frozenTurnsLeft <= 0) { unit.isFrozen = false; changed = true; }
            }
            if (unit.isNetted) { unit.nettedTurnsLeft--; if (unit.nettedTurnsLeft <= 0) { unit.isNetted = false; changed = true; } }
            if (unit.isSlowed) { unit.slowedTurnsLeft--; if (unit.slowedTurnsLeft <= 0) { unit.isSlowed = false; changed = true; } }
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

function applyFlameWaveDamage(targetRow, damage) {
    playSfx('fireballHit'); let deathPromises = [];
    for (let x = 0; x < currentGridCols; x++) {
        const fw_unit = getUnitAt(x, targetRow);
        const fw_obstacle = getObstacleAt(x, targetRow);
        if (fw_unit && fw_unit.team === 'enemy' && isUnitAliveAndValid(fw_unit)) {
            let actualDamage = damage;
            if (fw_unit.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) actualDamage = 1;
            actualDamage = Math.max(0, actualDamage);
            playSfx('hit'); fw_unit.hp -= actualDamage;
            if (fw_unit.hp < 0) fw_unit.hp = 0;
            if (typeof showDamagePopup === 'function') showDamagePopup(fw_unit.x, fw_unit.y, actualDamage);
            if (typeof flashElementOnHit === 'function') flashElementOnHit(fw_unit.element);
            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(fw_unit);
            if (fw_unit.hp <= 0) deathPromises.push(removeUnit(fw_unit));
        }
        if (fw_obstacle && fw_obstacle.canBeAttacked && isObstacleIntact(fw_obstacle)) {
            fw_obstacle.hp -= damage; if (fw_obstacle.hp < 0) fw_obstacle.hp = 0;
            if (typeof showDamagePopup === 'function') showDamagePopup(fw_obstacle.x, fw_obstacle.y, damage);
            if (typeof flashElementOnHit === 'function') flashElementOnHit(fw_obstacle.element);
            if (fw_obstacle.hp <= 0) deathPromises.push(removeObstacle(fw_obstacle));
        }
    }
    Promise.all(deathPromises).then(checkWinLossConditions);
}

function endTurn() {
    if (levelClearedAwaitingInput) { playSfx('error'); return; }
    if (currentTurn !== 'player' || isProcessing || isGameOver()) return;

    isProcessing = true;
    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    if (typeof setActiveSpell === 'function') setActiveSpell(null);
    if (typeof deselectUnit === 'function') deselectUnit(false);

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
    processTurnStart('enemy'); // Start of enemy turn

    units.forEach(u => {
        if (u.team === 'enemy' && isUnitAliveAndValid(u)) {
            u.acted = false; u.actionsTakenThisTurn = 0;
        }
    });

    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    setTimeout(runAITurn, 400);
}

function runAITurn() {
    const unitsToAct = units
        .filter(u => u.team === 'enemy' && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen)
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
            try { await performAIAction(stillValidUnit); }
            catch (e) {
                console.error(`AI Error (${stillValidUnit?.id}):`, e);
                if (isUnitAliveAndValid(stillValidUnit) && !stillValidUnit.acted) try { finishAction(stillValidUnit); } catch { }
            } finally {
                const duration = Date.now() - actionStartTime;
                const delayNeeded = Math.max(baseActionInterval, minActionDuration - duration);
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
        if (typeof updateWorldHpBars === 'function') updateWorldHpBars();
    }
    catch (e) { console.error("Error in endAITurnSequence:", e); }
    finally {
        isProcessing = false;
        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
        checkWinLossConditions();
    }
}

async function performAIAction(unit) {
    if (!unit || !isUnitAliveAndValid(unit) || unit.acted || unit.isFrozen) { if (unit && !unit.acted && isUnitAliveAndValid(unit)) finishAction(unit); return; }
    const livingPlayers = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));
    if (livingPlayers.length === 0) { finishAction(unit); return; }
    let actionTaken = false; let hasMoved = false;

    if (unit.flees) {
        const fleeGoal = findFarthestValidCell(unit, livingPlayers);
        if (fleeGoal) {
            const path = findPathToTarget(unit, fleeGoal.x, fleeGoal.y);
            if (path && path.length > 0 && getValidMoves(unit).some(m => m.x === path[0].x && m.y === path[0].y)) {
                await moveUnit(unit, path[0].x, path[0].y);
                actionTaken = true;
            }
        }
    } else {
        const targetPlayer = livingPlayers.reduce((closest, player) => { const dist = getDistance(unit, player); return dist < closest.dist ? { player, dist } : closest; }, { player: null, dist: Infinity }).player;
        if (!targetPlayer) { finishAction(unit); return; }
        let finalTargetObject = targetPlayer;
        if (targetPlayer.inTower) { const tower = obstacles.find(o => o.id === targetPlayer.inTower); if (tower && isObstacleIntact(tower)) { finalTargetObject = tower; } else { finishAction(unit); return; } }
        const minDist = getDistance(unit, finalTargetObject);

        if (!actionTaken && unit.suicideExplode) {
            if (minDist <= unit.explosionRadius) { await explodeUnit(unit); return; }
            else {
                const path = findPathToTarget(unit, targetPlayer.x, targetPlayer.y);
                if (path && path.length > 0 && getValidMoves(unit).some(m => m.x === path[0].x && m.y === path[0].y)) {
                    await moveUnit(unit, path[0].x, path[0].y); hasMoved = true;
                    if (getDistance(unit, targetPlayer) <= unit.explosionRadius) { await explodeUnit(unit); return; }
                }
            }
            if (hasMoved && !unit.acted) { finishAction(unit); return; }
        }
        else if (!actionTaken && unit.type === 'goblin_shaman') {
            const alliesToHeal = units.filter(u => u.team === 'enemy' && !u.isTotem && u.hp < u.maxHp && getDistance(unit, u) <= unit.range && hasLineOfSight(unit, u) && isUnitAliveAndValid(u)).sort((a, b) => a.hp - b.hp);
            const totemsExist = units.some(u => u.isTotem && isUnitAliveAndValid(u));
            const canSummon = unit.canSummonTotem && unit.totemCooldown <= 0 && !totemsExist;
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
                const validSpot = getAdjacentCells(unit.x, unit.y).find(spot => isCellInBounds(spot.x, spot.y) && !getUnitAt(spot.x, spot.y) && !getObstacleAt(spot.x, spot.y));
                if (validSpot) {
                    const newTotem = createUnit(unit.totemType, validSpot.x, validSpot.y);
                    if (newTotem) {
                        if (typeof renderUnit === 'function') renderUnit(newTotem);
                        if (gameSettings.showHpBars && typeof createWorldHpBar === 'function') createWorldHpBar(newTotem);
                        playSfx('shamanTotem'); unit.totemCooldown = SHAMAN_TOTEM_COOLDOWN; actionTaken = true; finishAction(unit); return;
                    }
                }
            }
        }
        else if (!actionTaken && unit.type === 'goblin_pyromancer') {
            if (unit.canCastFlameWave && unit.flameWaveCooldown <= 0 && Math.random() < 0.5) {
                const bestRow = findBestFlameWaveRow(unit);
                if (bestRow !== null) {
                    const target = { y: bestRow };
                    playSfx('flameWaveCast');
                    if (typeof animateFlameWave === 'function') animateFlameWave(bestRow, true);
                    setTimeout(() => { applyFlameWaveDamage(bestRow, unit.flameWaveDamage); }, FLAME_WAVE_STAGGER_DELAY_MS);
                    unit.flameWaveCooldown = PYRO_FLAME_WAVE_COOLDOWN;
                    actionTaken = true; finishAction(unit); return;
                }
            }
            const attackTargetsFB = getValidAttackTargets(unit);
            if (attackTargetsFB.units.includes(finalTargetObject.id) && hasLineOfSight(unit, finalTargetObject)) {
                if (unit.fireballDamage > 0) {
                    playSfx('pyroFireball');
                    if (typeof animateFireball === 'function') animateFireball(unit.element, finalTargetObject.x, finalTargetObject.y);
                    await new Promise(r => setTimeout(r, FIREBALL_PROJECTILE_DURATION_MS));
                    playSfx('fireballHit'); if (typeof createExplosionEffect === 'function') createExplosionEffect(finalTargetObject.x, finalTargetObject.y, 'fireball');
                    const stillTarget = units.find(u => u.id === finalTargetObject.id && isUnitAliveAndValid(u));
                    if (stillTarget) {
                        let actualDamage = unit.fireballDamage;
                        if (stillTarget.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) actualDamage = 1;
                        actualDamage = Math.max(0, actualDamage);
                        stillTarget.hp -= actualDamage;
                        if (stillTarget.hp < 0) stillTarget.hp = 0;
                        if (typeof showDamagePopup === 'function') showDamagePopup(stillTarget.x, stillTarget.y, actualDamage);
                        if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element);
                        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget);
                        if (stillTarget.hp <= 0) await removeUnit(stillTarget);
                    }
                    actionTaken = true; finishAction(unit); return;
                }
            }
        }
        else if (!actionTaken && unit.canNet && unit.netCooldownTurnsLeft <= 0 && !targetPlayer.isNetted && minDist <= unit.currentRange && hasLineOfSight(unit, targetPlayer)) {
            actionTaken = await throwNet(unit, targetPlayer); if (actionTaken) return;
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
            const movementBudget = unit.mov - (unit.isSlowed ? 1 : 0);
            if (movementBudget > 0) {
                const path = findPathToTarget(unit, targetPlayer.x, targetPlayer.y);
                let chosenMove = null;
                let canAttackAfterMoving = false;
                if (path && path.length > 0) {
                    const validMovesAI = getValidMoves(unit);
                    for (let i = Math.min(movementBudget - 1, path.length - 1); i >= 0; i--) {
                        const step = path[i];
                        if (validMovesAI.some(m => m.x === step.x && m.y === step.y)) {
                            chosenMove = step;
                            const tempUnitState = { ...unit, x: step.x, y: step.y };
                            const tempTargets = getValidAttackTargets(tempUnitState);
                            const tempTargetIsUnit = !!finalTargetObject.team;
                            canAttackAfterMoving = tempTargetIsUnit
                                ? tempTargets.units.includes(finalTargetObject.id)
                                : tempTargets.obstacles.includes(finalTargetObject.id);
                            if (canAttackAfterMoving) break;
                        }
                    }
                    if (!chosenMove) {
                        // AI Improvement: If we have LOS and are relatively close, move as far as possible towards target
                        // even if we can't attack this turn.
                        const distToTarget = getDistance(unit, targetPlayer);
                        if (hasLineOfSight(unit, targetPlayer) && distToTarget < 12) {
                            for (let i = Math.min(movementBudget - 1, path.length - 1); i >= 0; i--) {
                                const step = path[i];
                                if (validMovesAI.some(m => m.x === step.x && m.y === step.y)) {
                                    chosenMove = step;
                                    break;
                                }
                            }
                        }

                        // Fallback: Just take one step if we haven't chosen a move yet
                        if (!chosenMove && validMovesAI.some(m => m.x === path[0].x && m.y === path[0].y)) {
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
        }
    }
    if (!unit.acted && isUnitAliveAndValid(unit)) finishAction(unit);
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
            if (targetUnit && targetUnit.team === 'player' && isUnitAliveAndValid(targetUnit)) {
                if (hasLineOfSight(unit, { x, y })) {
                    canHit = true;
                    potentialDamage += Math.min(targetUnit.hp, unit.flameWaveDamage || FLAME_WAVE_BASE_DAMAGE);
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

async function throwNet(unit, target) {
    if (!unit || !target || !unit.canNet || unit.netCooldownTurnsLeft > 0 || target.isNetted || !isUnitAliveAndValid(unit) || !isUnitAliveAndValid(target) || levelClearedAwaitingInput) return false;
    if (!hasLineOfSight(unit, target)) return false;

    if (typeof animateAttack === 'function') {
        const impactDelay = await animateAttack(unit, target, true, 'net');
        await new Promise(resolve => setTimeout(resolve, impactDelay));
    } else {
        playSfx('net_throw');
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
        if (unit.isStealthed) distanceLimit -= ROGUE_STEALTH_MOVE_PENALTY;
        if (unit.quickStrikeActive) distanceLimit -= ROGUE_QUICK_STRIKE_MOVE_PENALTY;
    }
    if (unit.isSlowed) distanceLimit -= 1;
    distanceLimit = Math.max(0, distanceLimit);
    if (distanceLimit <= 0) return [];

    const moves = []; const queue = [{ x: unit.x, y: unit.y, distance: 0 }]; const visited = new Set([`${unit.x},${unit.y}`]); const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; const unitInTower = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;
    while (queue.length > 0) { const current = queue.shift(); for (const [dx, dy] of directions) { const nextX = current.x + dx; const nextY = current.y + dy; const key = `${nextX},${nextY}`; if (!isCellInBounds(nextX, nextY) || visited.has(key)) continue; const newDistance = current.distance + 1; if (newDistance > distanceLimit) continue; const obstacle = getObstacleAt(nextX, nextY); const unitOnCell = getUnitAt(nextX, nextY); let isBlocked = false; if (unitOnCell && unitOnCell.id !== unit.id) isBlocked = true; if (obstacle && obstacle.blocksMove && !obstacle.enterable) isBlocked = true; if (unitInTower) { if (nextX !== unitInTower.x || nextY !== unitInTower.y + 1) isBlocked = true; } else if (obstacle?.enterable) { if (current.y !== nextY + 1 || current.x !== nextX) isBlocked = true; if (obstacle.occupantUnitId && obstacle.occupantUnitId !== unit.id) isBlocked = true; } if (!isBlocked) { moves.push({ x: nextX, y: nextY }); visited.add(key); queue.push({ x: nextX, y: nextY, distance: newDistance }); } } } return moves;
}

function getValidAttackTargets(unit) {
    const targets = { units: [], obstacles: [] };
    if (!unit || !isUnitAliveAndValid(unit) || unit.isFrozen) return targets; // Netted units CAN attack
    let canAttack = !levelClearedAwaitingInput && !unit.acted;
    if (levelClearedAwaitingInput) canAttack = true; // Allow attacking if level is cleared
    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAttack = true;
    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAttack = true;

    const effectiveAtk = unit.meleeOnlyAttack ? (unit.baseMeleeAtk || unit.atk) : unit.atk;
    if (!canAttack || (effectiveAtk <= 0 && !unit.canNet)) return targets;

    const unitRange = (unit.meleeOnlyAttack && unit.team !== 'player') ? 1 : unit.currentRange;
    const ignoreStealthLOS = unit.isStealthed && getDistance(unit, {}) <= 1;

    for (const target of units) {
        if (target.team !== unit.team && isUnitAliveAndValid(target)) {
            let targetPosForCheck = target; let targetIdForList = target.id; let finalTargetIsTower = false;
            if (target.inTower) { const tower = obstacles.find(o => o.id === target.inTower); if (tower && isObstacleIntact(tower)) { targetPosForCheck = tower; finalTargetIsTower = true; } else continue; }
            const distance = getDistance(unit, targetPosForCheck);
            if (distance > unitRange || (unit.meleeOnlyAttack && distance > 1)) continue;
            const targetIsVisible = !target.isStealthed || distance <= 1 || (unit.isStealthed && distance <= 1);
            if (!targetIsVisible || (distance > 1 && !hasLineOfSight(unit, targetPosForCheck, ignoreStealthLOS))) continue;
            const targetId = finalTargetIsTower ? targetPosForCheck.id : targetIdForList;
            const list = finalTargetIsTower ? targets.obstacles : targets.units;
            if (!list.includes(targetId)) list.push(targetId);
        }
    }
    for (const target of obstacles) {
        if (target.canBeAttacked && isObstacleIntact(target) && !targets.obstacles.includes(target.id)) {
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
            else if (obstacle?.enterable) { if (currentNode.y !== nextY + 1 || currentNode.x !== nextX) isWalkable = false; if (obstacle.occupantUnitId && !isTargetCell) isWalkable = false; }
            if (isWalkable) { const gScore = currentNode.g + 1; const hScore = getDistance({ x: nextX, y: nextY }, { x: targetX, y: targetY }); const existingNode = openSet.get(key); if (!existingNode || gScore < existingNode.g) { const neighbor = { x: nextX, y: nextY, g: gScore, h: hScore, parent: currentNode }; openSet.set(key, neighbor); } else if (existingNode && gScore === existingNode.g && hScore < existingNode.h) { existingNode.parent = currentNode; existingNode.h = hScore; } }
        }
    }
    if (nodesSearched >= maxSearchNodes) console.warn("A* limit reached."); return null;
}

function calculateLevelStats() {
    const initialPlayerUnits = Object.values(activeRosterAtLevelStart || {}).reduce((a, b) => a + b, 0);
    const finalPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)).length;
    let canUseAnySpell = Object.keys(spellsUnlocked).some(spell => spellsUnlocked[spell]);
    const bonusGoldNoSpells = (!spellsUsedThisLevel && canUseAnySpell) ? LEVEL_COMPLETE_BONUS_GOLD.noSpells : 0;
    let bonusGoldFlawless = 0; let bonusGoldNoLosses = 0;
    if (unitsLostThisLevel === 0 && finalPlayerUnits > 0) {
        const survivingPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));
        const allSurvivingFullHp = survivingPlayerUnits.every(u => u.hp === u.maxHp);
        if (allSurvivingFullHp) bonusGoldFlawless = LEVEL_COMPLETE_BONUS_GOLD.fullHp;
        bonusGoldNoLosses = LEVEL_COMPLETE_BONUS_GOLD.noLosses;
    }
    const bonusGoldNoArmor = (equippedArmorId === 'none' && unitsLostThisLevel === 0 && finalPlayerUnits > 0) ? LEVEL_COMPLETE_BONUS_GOLD.noArmor : 0;
    const totalBonusGold = bonusGoldNoSpells + bonusGoldFlawless + bonusGoldNoLosses + bonusGoldNoArmor;
    const totalGoldEarnedThisLevel = baseGoldEarnedThisLevel + totalBonusGold;
    return { enemiesKilled: enemiesKilledThisLevel, unitsLost: unitsLostThisLevel, goldGained: baseGoldEarnedThisLevel, bonusGoldNoSpells, bonusGoldFullHp: bonusGoldFlawless, bonusGoldNoLosses, bonusGoldNoArmor, totalGoldEarned: totalGoldEarnedThisLevel };
}

function checkWinLossConditions() {
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = setTimeout(() => {
        if (!isGameActiveFlag || isGameOver() || levelClearedAwaitingInput) return;
        const playersLeft = units.some(u => u.team === 'player' && isUnitAliveAndValid(u));
        if (!playersLeft) { if (!isGameOver()) gameOver(false); return; }
        const enemiesLeft = units.some(u => u.team === 'enemy' && isUnitAliveAndValid(u));
        if (!enemiesLeft) {
            levelClearedAwaitingInput = true;
            playSfx('levelComplete');
            if (typeof deselectUnit === 'function') deselectUnit(false);
            if (typeof setActiveSpell === 'function') setActiveSpell(null);
            if (typeof showFeedback === 'function') showFeedback("Level Cleared! Collect items or Proceed.", "feedback-levelup", 3000);
            if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
            // Do NOT show level complete screen yet. Wait for user to click Proceed.
        }
    }, 100);
}

function startNextLevel() { if (isGameOver()) return; currentLevel++; levelToRestartOnLoss = currentLevel; levelClearedAwaitingInput = false; initGame(currentLevel); }
function forfeitLevel() { if (!isGameActiveFlag || isProcessing || isGameOver()) return; isGameActiveFlag = false; levelClearedAwaitingInput = false; stopMusic(); if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null; playSfx('forfeit'); const goldBeforeLevel = playerGold - baseGoldEarnedThisLevel; const penaltyPercentage = 0.05; const startGoldPenalty = Math.floor(goldBeforeLevel * penaltyPercentage); const levelGainLost = baseGoldEarnedThisLevel; const totalPenalty = levelGainLost + startGoldPenalty; const goldBeforePenalty = playerGold; playerGold = Math.max(0, goldBeforeLevel - startGoldPenalty); let messageText = `Level ${currentLevel} Forfeited!<br>`; messageText += `Penalty: Lost ${levelGainLost} <span class="icon icon-inline icon-gold"></span> (level gain) + ${startGoldPenalty} <span class="icon icon-inline icon-gold"></span> (5% penalty).<br>`; messageText += `Gold: ${goldBeforePenalty} -> ${playerGold}`; if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel - 1, playerGold, gameSettings.playerName); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showGameOverScreen === 'function') showGameOverScreen(false, messageText, true); }
function gameOver(playerWonGame, customMessage = "", isForfeit = false) { if (isGameOver()) return; isGameActiveFlag = false; levelClearedAwaitingInput = false; stopMusic(); if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null; let messageText = customMessage || ""; let isTrueVictory = playerWonGame; if (!messageText && !isTrueVictory && !isForfeit) { playSfx('gameOver'); const goldBeforeLevel = playerGold - baseGoldEarnedThisLevel; const penaltyPercentage = 0.05; const penaltyAmount = Math.floor(goldBeforeLevel * penaltyPercentage); const goldBeforePenalty = playerGold; playerGold = Math.max(0, goldBeforeLevel - penaltyAmount); messageText = `You have fallen on Level ${currentLevel}!<br>`; messageText += `Lost ${penaltyAmount} <span class="icon icon-inline icon-gold"></span> (5% penalty).<br>`; messageText += `Gold: ${goldBeforePenalty} -> ${playerGold}`; if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel - 1, playerGold, gameSettings.playerName); } else if (!playerWonGame && !isForfeit) playSfx('gameOver'); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showGameOverScreen === 'function') showGameOverScreen(isTrueVictory, messageText, isForfeit); }
function isGameOver() { return typeof isGameOverScreenVisible === 'function' && isGameOverScreenVisible(); }
function isGameActive() { return isGameActiveFlag; }

function getRecruitCost(unitType) { const baseCost = RECRUIT_BASE_COSTS[unitType] || 99999; const ownedCount = playerOwnedUnits[unitType] || 0; return baseCost + (ownedCount * RECRUIT_COST_INCREASE_PER_UNIT); }
function calculateSpellCost(spellName) { const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return 99999; const currentLevel = playerSpellUpgrades[spellName] || 0; if (currentLevel >= config.maxLevel) return Infinity; return config.baseCost + (currentLevel * config.costIncrease); }
function purchaseUnit(unitType) { const cost = getRecruitCost(unitType); const currentOwnedForType = playerOwnedUnits[unitType] || 0; const totalOwnedBefore = Object.values(playerOwnedUnits).reduce((sum, count) => sum + count, 0); if (playerGold >= cost && currentOwnedForType < MAX_OWNED_PER_TYPE) { playerGold -= cost; playerOwnedUnits[unitType] = currentOwnedForType + 1; const totalOwnedAfter = totalOwnedBefore + 1; const shouldPopup = (totalOwnedBefore < TACTICAL_COMMAND_UNLOCK_UNITS && totalOwnedAfter >= TACTICAL_COMMAND_UNLOCK_UNITS); if (getTotalActiveUnits() < maxActiveRosterSize && !shouldPopup) addUnitToActiveRoster(unitType); saveGameData(); checkAchievements('recruit', { target: unitType, count: playerOwnedUnits[unitType] }); return { success: true, showTroopsPopup: shouldPopup }; } return { success: false }; }
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
    const cost = getUnitUpgradeCost(upgradeType);
    if (playerGold < cost) return false;
    playerGold -= cost;
    playerUnitUpgrades[upgradeType] = (playerUnitUpgrades[upgradeType] || 0) + 1;
    saveGameData();
    return true;
}
function purchaseAbilityUpgrade(abilityId) { if (!ABILITY_UPGRADE_COSTS.hasOwnProperty(abilityId)) { console.error(`Invalid ability upgrade type: ${abilityId}`); return false; } const cost = ABILITY_UPGRADE_COSTS[abilityId]; if (playerGold < cost || (playerAbilityUpgrades[abilityId] || 0) >= 1) return false; playerGold -= cost; playerAbilityUpgrades[abilityId] = 1; saveGameData(); if (abilityId === 'rogue_quickstrike') units.forEach(u => { if (u.type === 'rogue') u.canQuickStrike = true; }); return true; }
function purchaseSpellUpgrade(spellName) { const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return false; const currentUpgradeLevel = playerSpellUpgrades[spellName] || 0; const cost = calculateSpellCost(spellName); const meetsLevelReq = highestLevelReached > config.requiredLevel; if (playerGold >= cost && currentUpgradeLevel < config.maxLevel && meetsLevelReq) { playerGold -= cost; playerSpellUpgrades[spellName]++; saveGameData(); return true; } return false; }
function purchasePassive(passiveId) { const cost = PASSIVE_UPGRADE_COSTS[passiveId]; if (cost === undefined || passiveId !== 'tactical_command') return false; const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0; const canBuyMore = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) < MAX_ACTIVE_ROSTER_SIZE_MAX; const meetsUnitReq = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0) >= TACTICAL_COMMAND_UNLOCK_UNITS; if (playerGold >= cost && canBuyMore && meetsUnitReq) { playerGold -= cost; playerPassiveUpgrades.tactical_command = currentBonusSlots + 1; maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE + playerPassiveUpgrades.tactical_command; saveGameData(); checkAchievements('roster_full'); return true; } return false; }
function getTotalActiveUnits() { if (!playerActiveRoster) return 0; return Object.values(playerActiveRoster).reduce((sum, count) => sum + (parseInt(count, 10) || 0), 0); } function addUnitToActiveRoster(unitType) { const currentOwned = playerOwnedUnits[unitType] || 0; const currentActive = playerActiveRoster[unitType] || 0; const totalActive = getTotalActiveUnits(); if (currentActive < currentOwned && totalActive < maxActiveRosterSize) { playerActiveRoster[unitType] = currentActive + 1; saveGameData(); checkAchievements('roster_full'); return true; } return false; } function removeUnitFromActiveRoster(unitType) { const currentActive = playerActiveRoster[unitType] || 0; if (currentActive > 0) { playerActiveRoster[unitType] = currentActive - 1; if (playerActiveRoster[unitType] === 0) delete playerActiveRoster[unitType]; saveGameData(); return true; } return false; }

function saveGameData() { try { localStorage.setItem(STORAGE_KEY_HIGHEST_LEVEL, highestLevelReached.toString()); localStorage.setItem(STORAGE_KEY_GOLD, playerGold.toString()); localStorage.setItem(STORAGE_KEY_OWNED_UNITS, JSON.stringify(playerOwnedUnits)); localStorage.setItem(STORAGE_KEY_ACTIVE_ROSTER, JSON.stringify(playerActiveRoster)); localStorage.setItem(STORAGE_KEY_UNIT_UPGRADES, JSON.stringify(playerUnitUpgrades)); localStorage.setItem(STORAGE_KEY_SPELL_UPGRADES, JSON.stringify(playerSpellUpgrades)); localStorage.setItem(STORAGE_KEY_ABILITY_UPGRADES, JSON.stringify(playerAbilityUpgrades)); localStorage.setItem(STORAGE_KEY_PASSIVE_UPGRADES, JSON.stringify(playerPassiveUpgrades)); localStorage.setItem(STORAGE_KEY_OWNED_ARMOR, JSON.stringify(playerOwnedArmor)); localStorage.setItem(STORAGE_KEY_EQUIPPED_ARMOR, equippedArmorId); localStorage.setItem(STORAGE_KEY_ACHIEVEMENT_PROGRESS, JSON.stringify(achievementProgress)); localStorage.setItem(STORAGE_KEY_CHEAT_SPELL_ATK, playerCheatSpellAttackBonus.toString()); localStorage.setItem(STORAGE_KEY_MAX_ROSTER_SIZE, maxActiveRosterSize.toString()); localStorage.setItem(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL, lastTreasureHunterLevel.toString()); saveSettings(); } catch (e) { console.warn("Could not save game data.", e); } }
function loadGameData() { try { highestLevelReached = parseInt(localStorage.getItem(STORAGE_KEY_HIGHEST_LEVEL) || '1', 10) || 1; playerGold = parseInt(localStorage.getItem(STORAGE_KEY_GOLD) || '0', 10) || 0; playerCheatSpellAttackBonus = parseInt(localStorage.getItem(STORAGE_KEY_CHEAT_SPELL_ATK) || '0', 10) || 0; maxActiveRosterSize = parseInt(localStorage.getItem(STORAGE_KEY_MAX_ROSTER_SIZE) || MAX_ACTIVE_ROSTER_SIZE_BASE.toString(), 10) || MAX_ACTIVE_ROSTER_SIZE_BASE; lastTreasureHunterLevel = parseInt(localStorage.getItem(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL) || (-TREASURE_HUNTER_SPAWN_COOLDOWN).toString(), 10) || -TREASURE_HUNTER_SPAWN_COOLDOWN; const defaultOwnedUnits = { knight: 3, archer: 0, champion: 0, rogue: 0 }; const storedOwnedUnits = localStorage.getItem(STORAGE_KEY_OWNED_UNITS); playerOwnedUnits = storedOwnedUnits ? JSON.parse(storedOwnedUnits) : { ...defaultOwnedUnits }; Object.keys(UNIT_DATA).forEach(key => { if (UNIT_DATA[key].team === 'player') { if (!(key in playerOwnedUnits)) playerOwnedUnits[key] = 0; playerOwnedUnits[key] = Math.max(0, Math.min(parseInt(playerOwnedUnits[key] || '0', 10), MAX_OWNED_PER_TYPE)); } }); if (Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) === 0 && highestLevelReached <= 1) playerOwnedUnits = { ...defaultOwnedUnits }; const storedActiveRoster = localStorage.getItem(STORAGE_KEY_ACTIVE_ROSTER); let loadedRoster = storedActiveRoster ? JSON.parse(storedActiveRoster) : {}; let totalActive = 0; const validatedRoster = {}; Object.keys(playerOwnedUnits).forEach(type => { if (!UNIT_DATA[type] || UNIT_DATA[type].team !== 'player') return; const ownedCount = playerOwnedUnits[type] || 0; const activeCount = Math.min(ownedCount, parseInt(loadedRoster[type] || '0', 10)); if (activeCount > 0) { if (totalActive + activeCount <= maxActiveRosterSize) { validatedRoster[type] = activeCount; totalActive += activeCount; } else if (totalActive < maxActiveRosterSize) { const canAdd = maxActiveRosterSize - totalActive; validatedRoster[type] = canAdd; totalActive += canAdd; } } }); playerActiveRoster = validatedRoster; if (totalActive === 0 && Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) > 0) { playerActiveRoster = {}; let currentTotal = 0; const ownedOrder = Object.keys(playerOwnedUnits).sort((a, b) => (a === 'knight' ? -1 : (b === 'knight' ? 1 : playerOwnedUnits[b] - playerOwnedUnits[a]))); for (const type of ownedOrder) { if (!UNIT_DATA[type] || UNIT_DATA[type].team !== 'player') continue; const canAdd = Math.min(playerOwnedUnits[type], maxActiveRosterSize - currentTotal); if (canAdd > 0) { playerActiveRoster[type] = canAdd; currentTotal += canAdd; } if (currentTotal >= maxActiveRosterSize) break; } } const defaultUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 }; const storedUnitUpgrades = localStorage.getItem(STORAGE_KEY_UNIT_UPGRADES); playerUnitUpgrades = storedUnitUpgrades ? JSON.parse(storedUnitUpgrades) : { ...defaultUnitUpgrades }; Object.keys(defaultUnitUpgrades).forEach(key => { if (!(key in playerUnitUpgrades)) playerUnitUpgrades[key] = defaultUnitUpgrades[key]; playerUnitUpgrades[key] = Math.max(0, parseInt(playerUnitUpgrades[key] || '0', 10)); }); const defaultAbilityUpgrades = { rogue_quickstrike: 0 }; const storedAbilityUpgrades = localStorage.getItem(STORAGE_KEY_ABILITY_UPGRADES); playerAbilityUpgrades = storedAbilityUpgrades ? JSON.parse(storedAbilityUpgrades) : { ...defaultAbilityUpgrades }; Object.keys(defaultAbilityUpgrades).forEach(key => { if (!(key in playerAbilityUpgrades)) playerAbilityUpgrades[key] = defaultAbilityUpgrades[key]; playerAbilityUpgrades[key] = Math.max(0, Math.min(1, parseInt(playerAbilityUpgrades[key] || '0', 10))); }); const defaultSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 }; const storedSpellUpgrades = localStorage.getItem(STORAGE_KEY_SPELL_UPGRADES); playerSpellUpgrades = storedSpellUpgrades ? JSON.parse(storedSpellUpgrades) : { ...defaultSpellUpgrades }; Object.keys(defaultSpellUpgrades).forEach(key => { if (!(key in playerSpellUpgrades)) playerSpellUpgrades[key] = defaultSpellUpgrades[key]; const maxLvl = SPELL_UPGRADE_CONFIG[key]?.maxLevel ?? 99; playerSpellUpgrades[key] = Math.max(0, Math.min(parseInt(playerSpellUpgrades[key] || '0', 10), maxLvl)); }); const defaultPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 }; const storedPassiveUpgrades = localStorage.getItem(STORAGE_KEY_PASSIVE_UPGRADES); playerPassiveUpgrades = storedPassiveUpgrades ? JSON.parse(storedPassiveUpgrades) : { ...defaultPassiveUpgrades }; Object.keys(defaultPassiveUpgrades).forEach(key => { if (!(key in playerPassiveUpgrades)) playerPassiveUpgrades[key] = defaultPassiveUpgrades[key]; if (key === 'gold_magnet' || key === 'tactical_command') playerPassiveUpgrades[key] = Math.max(0, parseInt(playerPassiveUpgrades[key] || '0', 10)); }); maxActiveRosterSize = Math.max(MAX_ACTIVE_ROSTER_SIZE_BASE, Math.min(MAX_ACTIVE_ROSTER_SIZE_BASE + (playerPassiveUpgrades.tactical_command || 0), MAX_ACTIVE_ROSTER_SIZE_MAX)); const defaultOwnedArmor = { grey: 1 }; const storedOwnedArmor = localStorage.getItem(STORAGE_KEY_OWNED_ARMOR); playerOwnedArmor = storedOwnedArmor ? JSON.parse(storedOwnedArmor) : { ...defaultOwnedArmor }; playerOwnedArmor['grey'] = Math.max(1, playerOwnedArmor['grey'] || 1); Object.keys(ARMOR_DATA).forEach(id => { if (id !== 'none' && id !== 'grey' && !(id in playerOwnedArmor)) { playerOwnedArmor[id] = 0; } }); Object.keys(playerOwnedArmor).forEach(id => { if (id !== 'grey') playerOwnedArmor[id] = Math.max(0, playerOwnedArmor[id] || 0); }); equippedArmorId = localStorage.getItem(STORAGE_KEY_EQUIPPED_ARMOR) || 'grey'; if (!playerOwnedArmor[equippedArmorId] && equippedArmorId !== 'none') equippedArmorId = 'grey'; const storedAchievements = localStorage.getItem(STORAGE_KEY_ACHIEVEMENT_PROGRESS); achievementProgress = storedAchievements ? JSON.parse(storedAchievements) : {}; playerGold = Math.max(0, playerGold); playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); loadSettings(); } catch (e) { console.warn("Load game data error. Starting fresh.", e); highestLevelReached = 1; playerGold = 0; playerOwnedUnits = { knight: 3, archer: 0, champion: 0, rogue: 0 }; maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE; playerActiveRoster = { knight: Math.min(3, maxActiveRosterSize) }; playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 }; playerAbilityUpgrades = { rogue_quickstrike: 0 }; playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 }; playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 }; playerOwnedArmor = { grey: 1 }; equippedArmorId = 'grey'; achievementProgress = {}; playerCheatSpellAttackBonus = 0; lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN; gameSettings = { ...DEFAULT_GAME_SETTINGS }; saveSettings(); } }
function loadSettings() { const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS); if (storedSettings) { try { const parsedSettings = JSON.parse(storedSettings); gameSettings = { ...DEFAULT_GAME_SETTINGS, ...parsedSettings }; gameSettings.showHpBars = gameSettings.showHpBars === true; gameSettings.playerName = typeof gameSettings.playerName === 'string' ? gameSettings.playerName.substring(0, 12).trim() : DEFAULT_GAME_SETTINGS.playerName; gameSettings.musicVolume = typeof gameSettings.musicVolume === 'number' ? Math.max(0, Math.min(1, gameSettings.musicVolume)) : DEFAULT_GAME_SETTINGS.musicVolume; gameSettings.sfxVolume = typeof gameSettings.sfxVolume === 'number' ? Math.max(0, Math.min(1, gameSettings.sfxVolume)) : DEFAULT_GAME_SETTINGS.sfxVolume; gameSettings.mute = gameSettings.mute === true; } catch (e) { console.warn("Failed to parse settings, using defaults.", e); gameSettings = { ...DEFAULT_GAME_SETTINGS }; } } else { gameSettings = { ...DEFAULT_GAME_SETTINGS }; } musicVolume = gameSettings.musicVolume; sfxVolume = gameSettings.sfxVolume; isMuted = gameSettings.mute; if (typeof updateHpBarSettingUI === 'function') updateHpBarSettingUI(gameSettings.showHpBars); if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility(); if (typeof updateMuteButtonVisual === 'function') updateMuteButtonVisual(); if (typeof updateAudioVolumeDisplays === 'function') updateAudioVolumeDisplays(); if (typeof updatePlayerNameInput === 'function') updatePlayerNameInput(); }
function saveSettings() { gameSettings.musicVolume = musicVolume; gameSettings.sfxVolume = sfxVolume; gameSettings.mute = isMuted; try { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(gameSettings)); } catch (e) { console.warn("Could not save settings.", e); } }
function updateSetting(key, value) { if (gameSettings.hasOwnProperty(key)) { let changed = false; if (key === 'playerName' && typeof value === 'string') { const cleanName = value.substring(0, 12).trim(); if (gameSettings.playerName !== cleanName) { gameSettings.playerName = cleanName || DEFAULT_GAME_SETTINGS.playerName; changed = true; } } else if (key === 'showHpBars') { const boolValue = value === true; if (gameSettings.showHpBars !== boolValue) { gameSettings.showHpBars = boolValue; if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility(); changed = true; } } else if (key === 'musicVolume') { const numValue = Math.max(0, Math.min(1, parseFloat(value))); if (musicVolume !== numValue) { setVolume('music', numValue); gameSettings.musicVolume = musicVolume; changed = true; } } else if (key === 'sfxVolume') { const numValue = Math.max(0, Math.min(1, parseFloat(value))); if (sfxVolume !== numValue) { setVolume('sfx', numValue); gameSettings.sfxVolume = sfxVolume; changed = true; } } else if (key === 'mute') { const boolValue = value === true; if (isMuted !== boolValue) { toggleMute(false); gameSettings.mute = isMuted; changed = true; } } if (changed) saveSettings(); } }

function applyCheatGold(amount) { playerGold += amount; playerGold = Math.max(0, playerGold); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof updateShopDisplay === 'function') updateShopDisplay(); if (typeof updateChooseTroopsScreen === 'function') updateChooseTroopsScreen(); playSfx('cheat'); if (typeof showFeedback === 'function') showFeedback(`CHEAT: +${amount} Gold!`, "feedback-cheat"); }
function applyCheatSpellAttack(amount) { playerCheatSpellAttackBonus += amount; playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); saveGameData(); playSfx('cheat'); if (typeof showFeedback === 'function') showFeedback(`CHEAT: Spell ATK +${amount}!`, "feedback-cheat"); if (typeof updateSpellUI === 'function') updateSpellUI(); }
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
                case 'reach_level': if ((eventType === 'level_complete' || eventType === 'load_game') && highestLevelReached >= condition.level) conditionMet = true; break;
                case 'level_complete_condition': if (eventType === 'level_complete') { if (condition.condition === 'no_armor' && data.equippedArmor === 'none' && data.stats?.unitsLost === 0) conditionMet = true; if (condition.condition === 'full_hp' && data.stats?.bonusGoldFullHp > 0) conditionMet = true; if (condition.condition === 'no_losses' && data.stats?.bonusGoldNoLosses > 0) conditionMet = true; if (condition.condition === 'no_spells' && data.stats?.bonusGoldNoSpells > 0) conditionMet = true; } break;
                case 'recruit': if (eventType === 'recruit' && data.target === condition.target) { progress.current = data.count; if (progress.current >= condition.count) conditionMet = true; } break;
                case 'roster_full': if (eventType === 'recruit' || eventType === 'roster_change' || eventType === 'passive_purchase') { if (getTotalActiveUnits() >= maxActiveRosterSize) conditionMet = true; } break;
                case 'collect_armor': if (eventType === 'collect_armor' || eventType === 'load_game') { const coreArmorIds = ['green', 'blue', 'red', 'yellow']; const ownedCoreCount = coreArmorIds.filter(armorId => (playerOwnedArmor[armorId] || 0) >= 1).length; progress.current = ownedCoreCount; if (progress.current >= condition.count) conditionMet = true; } break;
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
    isMuted = forceMute !== undefined ? forceMute : !isMuted;
    if (isMuted) {
        stopMusic();
        if (victoryMusicPlayer) { victoryMusicPlayer.pause(); victoryMusicPlayer.currentTime = 0; }
    } else {
        startMusicIfNotPlaying();
    }
    if (typeof updateMuteButtonVisual === 'function') updateMuteButtonVisual();
    saveSettings();
};
function completeLevelAndShowSummary() {
    const stats = calculateLevelStats();
    playerGold += (stats.totalGoldEarned || 0) - (stats.goldGained || 0); // Add bonus gold
    playerGold = Math.max(0, playerGold);
    if (currentLevel >= highestLevelReached) highestLevelReached = currentLevel + 1;
    if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel, playerGold, gameSettings.playerName);
    saveGameData();
    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
    if (typeof showLevelCompleteScreen === 'function') showLevelCompleteScreen(stats, playerGold);
}
