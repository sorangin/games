//gameLogic.js
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
let isProcessing = false;
let currentLevel = 1;
let levelToRestartOnLoss = 1;
let currentSpell = null;
let spellUses = {};
let spellsUsedThisLevel = false;
let unlimitedSpellsCheat = false;
let winCheckTimeout = null;
let levelClearedAwaitingInput = false;
let isGameActiveFlag = false;
let playerActionsTakenThisLevel = 0;
let goldCollectedThisLevel = 0;
let enemiesKilledThisLevel = 0;

let highestLevelUnlocked = 1;
let playerGold = 0;
let playerOwnedUnits = { knight: 3, archer: 0, champion: 0 };
let playerActiveRoster = {};
let activeRosterAtLevelStart = {};
let playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0 };
let playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
let playerPassiveUpgrades = { gold_magnet: false };
let playerCheatSpellAttackBonus = 0;

let gameSettings = {
    showHpBars: false,
};

let currentGridCols = BASE_GRID_COLS;
let currentGridRows = BASE_GRID_ROWS;
let currentTerrainInfo = { url: '', variant: 'green', name: 'grass', quadrant: 0 };
let deathSpriteTimeouts = new Map();


function isUnitAliveAndValid(unit) {
    return unit?.hp > 0;
}

function isObstacleIntact(obstacle) {
    return obstacle?.hp > 0;
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
    itemsOnCell.sort((a, b) => (b.stackIndex || 0) - (a.stackIndex || 0));
    return itemsOnCell[0];
}

function getUnitAt(x, y) {
    return units.find(unit => unit.x === x && unit.y === y && isUnitAliveAndValid(unit));
}

function getDistance(posA, posB) {
    if (!posA || !posB) return Infinity;
    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

function hasLineOfSight(startPos, endPos) {
    if (!startPos || !endPos) return false;
    const startX = startPos.x; const startY = startPos.y;
    const endX = endPos.x; const endY = endPos.y;
    if (startX === endX && startY === endY) return true;
    let x = startX; let y = startY;
    const dx = Math.abs(endX - startX); const dy = -Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1; const sy = startY < endY ? 1 : -1;
    let err = dx + dy; let e2;
    let safety = 0; const maxSafety = (currentGridCols + currentGridRows) * 2;

    while (safety < maxSafety) {
        if (!(x === startX && y === startY) && !(x === endX && y === endY)) {
            const obstacle = getObstacleAt(x, y);
            if (obstacle && OBSTACLE_DATA[obstacle.type]?.blocksLOS && isObstacleIntact(obstacle)) {
                return false;
            }
        }
        if (x === endX && y === endY) break;
        e2 = 2 * err; let moved = false;
        if (e2 >= dy) { if (x === endX) break; err += dy; x += sx; moved = true; }
        if (e2 <= dx) { if (y === endY) break; err += dx; y += sy; moved = true; }
        if (!moved) { console.warn("hasLineOfSight: No move!"); break; }
        safety++;
    }
    if (safety >= maxSafety) { console.error(`LOS safety limit!`); return false; }
    return true;
}

function calculateGridDimensions(level) {
    const levelFactor = Math.floor((level - 1) / 5);
    currentGridCols = BASE_GRID_COLS + Math.floor(levelFactor / 2) + (levelFactor % 2);
    currentGridRows = BASE_GRID_ROWS + Math.floor(levelFactor / 2);
    currentGridCols = Math.max(BASE_GRID_COLS, Math.min(currentGridCols, 15));
    currentGridRows = Math.max(BASE_GRID_ROWS, Math.min(currentGridRows, 15));
}

function resetSpellStateForNewLevel() {
    currentSpell = null;
    spellsUsedThisLevel = false;
    spellUses = {
        fireball: currentLevel >= FIREBALL_UNLOCK_LEVEL,
        flameWave: currentLevel >= FLAME_WAVE_UNLOCK_LEVEL,
        frostNova: currentLevel >= FROST_NOVA_UNLOCK_LEVEL,
        heal: currentLevel >= HEAL_UNLOCK_LEVEL
    };
    if (unlimitedSpellsCheat) {
        Object.keys(spellUses).forEach(key => { if(spellUses[key] !== undefined) spellUses[key] = true; });
    }
    if (typeof updateSpellUI === 'function') updateSpellUI();
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
    enemiesKilledThisLevel = 0;
    if (gameSettings.showHpBars && typeof updateWorldHpBarsVisibility === 'function') {
        updateWorldHpBarsVisibility();
    }
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

    calculateGridDimensions(currentLevel);
    resetLevelState();
    resetSpellStateForNewLevel();

    stopMusic();
    if (sfx.gameOver && !sfx.gameOver.paused) { sfx.gameOver.pause(); sfx.gameOver.currentTime = 0; }

    try {
        if (typeof calculateCellSize === 'function') calculateCellSize();
        currentTerrainInfo = getTilesetForLevel(currentLevel);
        if(typeof setupBoard === 'function') setupBoard(currentTerrainInfo.url);
        if(typeof updateUiForNewLevel === 'function') updateUiForNewLevel();

        initializeGridState();
        spawnObstacles();
        spawnInitialUnits();
        spawnEnemies();
        spawnItems();

        units.forEach(u => {
            u.acted = false; u.isFrozen = false; u.frozenTurnsLeft = 0;
            u.isNetted = false; u.nettedTurnsLeft = 0; u.isSlowed = false;
            u.slowedTurnsLeft = 0; u.netCooldownTurnsLeft = 0; u.inTower = null;
            u.currentRange = u.baseRange;
        });

        if(typeof renderAll === 'function') renderAll();
        if (typeof createAllWorldHpBars === 'function') createAllWorldHpBars();

        if(typeof applyLayout === 'function') applyLayout();
        if(typeof centerView === 'function') centerView(true);

        playSfx('startBeep');
        selectAndLoadMusic();
        startMusicIfNotPlaying();

    } catch (initError) {
        console.error("Error during game initialization:", initError);
        isGameActiveFlag = false;
    } finally {
        isProcessing = false;
        if(typeof updateTurnDisplay === 'function') updateTurnDisplay();
        if(typeof updateQuitButton === 'function') updateQuitButton();
        if(typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility();
    }
}

function initializeGridState() {
    gridState = Array.from({ length: currentGridRows }, () => Array(currentGridCols).fill(null));
}

function spawnObstacles() {
    const totalCells = currentGridCols * currentGridRows;
    const numObstacles = Math.max(MIN_OBSTACLES, Math.floor(totalCells * MAX_OBSTACLES_PER_LEVEL));
    const enemySpawnAreaHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT);
    const playerSpawnAreaHeight = Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);
    const validSpawnMinY = enemySpawnAreaHeight;
    const validSpawnMaxY = currentGridRows - playerSpawnAreaHeight - 1;

    let spawnedCount = 0;
    let towersSpawned = 0;
    const occupied = new Set(); // Track occupied cells `${x},${y}`

    // Ensure gridState is initialized before use
    if (!gridState || gridState.length !== currentGridRows || gridState[0].length !== currentGridCols) {
        initializeGridState(); // Make sure gridState is ready
    }

    // Helper to check if a cell is buildable and update state
    const tryPlaceObstacle = (type, x, y, isVertical = false) => {
        if (!isCellInBounds(x, y) || occupied.has(`${x},${y}`) || gridState[y]?.[x]) {
            return null; // Cannot place here
        }
        const obs = createObstacle(type, x, y); // Assumes createObstacle adds to obstacles array & element
        if (obs) {
            obs.isVertical = isVertical;
            occupied.add(`${x},${y}`); // Mark as occupied ON SUCCESS
            gridState[y][x] = type; // Update grid state
            // spawnedCount is incremented by the calling code upon success
            return obs; // Return the created obstacle
        }
        console.warn(`Failed to create obstacle type ${type} at ${x},${y}`);
        return null; // Failed to create
    };

    // Build initial spawn pool (excluding player/enemy spawn zones initially)
    // ***** FIXED LINE: Use 'let' instead of 'const' *****
    let spawnPool = [];
    // ****************************************************
    for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) {
        for (let x = 0; x < currentGridCols; x++) {
             if (isCellInBounds(x,y)) { // Check bounds just in case
                 spawnPool.push({ x, y });
             }
        }
    }
    spawnPool.sort(() => 0.5 - Math.random()); // Shuffle

    // --- Optional: Place Towers First ---
    const towerChance = TOWER_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS * 2);
    if (Math.random() < towerChance) {
        let towerAttempts = 0;
        const maxTowerAttempts = spawnPool.length > 0 ? Math.min(spawnPool.length, 15) : 0; // Limit attempts

        while (towersSpawned < MAX_TOWERS_PER_LEVEL && towerAttempts < maxTowerAttempts) {
             towerAttempts++;
             if (spawnPool.length === 0) break; // No more potential spots

             const posIndex = Math.floor(Math.random() * spawnPool.length);
             const pos = spawnPool[posIndex];

             if (tryPlaceObstacle('tower', pos.x, pos.y)) {
                 towersSpawned++;
                 spawnedCount++; // Increment count for the tower
                 spawnPool.splice(posIndex, 1); // Remove used spot
             } else {
                  // If failed, maybe remove it from pool to avoid retrying too much? Optional.
                  // spawnPool.splice(posIndex, 1);
             }
        }
    }

    // --- Castle Room Generation ---
    const isCastle = currentTerrainInfo.name === 'castle';
    if (isCastle && spawnedCount < numObstacles && validSpawnMaxY >= validSpawnMinY) {
        const numRoomsToTry = Math.floor(Math.random() * 2) + 1; // 1 or 2 rooms
        let roomsBuilt = 0;
        let roomAttempts = 0;
        const maxRoomAttempts = 15; // Limit attempts to find space

        while (roomsBuilt < numRoomsToTry && spawnedCount < numObstacles && roomAttempts < maxRoomAttempts) {
            roomAttempts++;

            const roomWidth = Math.floor(Math.random() * 3) + 3; // 3-5 wide
            const roomHeight = Math.floor(Math.random() * 3) + 3; // 3-5 high
            const roomBuffer = 1; // Min distance from grid edges

            if (currentGridCols <= roomWidth + 2*roomBuffer ||
                validSpawnMaxY - validSpawnMinY + 1 < roomHeight) {
                continue; // Not enough space for this room size on the grid/valid area
            }

            const startX = Math.floor(Math.random() * (currentGridCols - roomWidth - 2 * roomBuffer)) + roomBuffer;
            const startY = Math.floor(Math.random() * (validSpawnMaxY - validSpawnMinY - roomHeight + 1)) + validSpawnMinY;

            let potentialWallCoords = []; // For potential door replacement {x, y, isVertical}
            let interiorCoords = []; // For potential item/enemy spawns {x, y}
            let tempOccupiedRoom = new Set(); // Track cells for this specific room attempt
            let canBuildRoom = true;

            // 1. Check for overlap & Collect potential spots
            for (let dx = 0; dx < roomWidth; dx++) {
                for (let dy = 0; dy < roomHeight; dy++) {
                    const curX = startX + dx;
                    const curY = startY + dy;
                    if (!isCellInBounds(curX, curY)) {
                         canBuildRoom = false; break;
                    }
                    // Check against obstacles already permanently placed
                    if (occupied.has(`${curX},${curY}`) || gridState[curY]?.[curX]) {
                         canBuildRoom = false; break;
                    }
                    tempOccupiedRoom.add(`${curX},${curY}`); // Mark for this attempt

                    const isPerimeter = (dx === 0 || dx === roomWidth - 1 || dy === 0 || dy === roomHeight - 1);
                    if (isPerimeter) {
                        const isCorner = (dx === 0 || dx === roomWidth - 1) && (dy === 0 || dy === roomHeight - 1);
                        if (!isCorner) {
                            potentialWallCoords.push({ x: curX, y: curY, isVertical: (dx === 0 || dx === roomWidth - 1) });
                        }
                    } else {
                        interiorCoords.push({ x: curX, y: curY });
                    }
                }
                if (!canBuildRoom) break;
            }

            if (!canBuildRoom) continue; // Try another location/size

            // 2. Build Solid Walls
            let wallsActuallyPlaced = []; // Store coords of successfully placed walls
             for (let dx = 0; dx < roomWidth; dx++) {
                for (let dy = 0; dy < roomHeight; dy++) {
                    if (spawnedCount >= numObstacles) break; // Stop if limit reached
                    const curX = startX + dx;
                    const curY = startY + dy;
                    const isPerimeter = (dx === 0 || dx === roomWidth - 1 || dy === 0 || dy === roomHeight - 1);

                    if (isPerimeter) {
                        // Use the helper which checks 'occupied' and updates it
                        if (tryPlaceObstacle('wall_rock', curX, curY)) {
                            spawnedCount++; // Increment global count on success
                            wallsActuallyPlaced.push({x: curX, y: curY}); // Track placed wall
                        } else {
                            console.warn(`Failed to place wall_rock at ${curX},${curY} during room build (occupied?).`);
                            // If a wall failed, the room might be invalid, but we continue for simplicity
                        }
                    }
                }
                if (spawnedCount >= numObstacles) break;
            }

             // Check if enough walls were placed to form a basic room structure
             if (wallsActuallyPlaced.length < (roomWidth * 2 + roomHeight * 2 - 4) * 0.5) { // Heuristic: less than half the perimeter
                  console.warn("Room structure likely incomplete due to placement failures or obstacle limit.");
                  // Optionally, could attempt to remove the partial walls here
                  continue; // Try building another room elsewhere
             }

            // 3. Place Doors (Replace some walls)
            let validDoorSpots = potentialWallCoords.filter(potential =>
                 wallsActuallyPlaced.some(placed => placed.x === potential.x && placed.y === potential.y)
             );

            if (validDoorSpots.length > 0) {
                 validDoorSpots.sort(() => 0.5 - Math.random());
                 const numDoorsToPlace = Math.random() < 0.8 ? 1 : 2; // Higher chance for 1 door
                 let doorsPlaced = 0;

                 for (let i = 0; i < validDoorSpots.length && doorsPlaced < numDoorsToPlace; i++) {
                     const doorCoord = validDoorSpots[i];
                     const wallIndex = obstacles.findIndex(o => o.x === doorCoord.x && o.y === doorCoord.y && o.type === 'wall_rock');

                     if (wallIndex !== -1) {
                         const wallToRemove = obstacles[wallIndex];
                         wallToRemove.element?.remove();
                         obstacles.splice(wallIndex, 1);
                         spawnedCount--; // Adjust count
                         occupied.delete(`${doorCoord.x},${doorCoord.y}`); // Unmark cell temporarily
                         gridState[doorCoord.y][doorCoord.x] = null;

                         if(tryPlaceObstacle('door', doorCoord.x, doorCoord.y, doorCoord.isVertical)) {
                             doorsPlaced++;
                             spawnedCount++; // Add count for door
                         } else {
                             console.warn(`Failed to replace wall with door at ${doorCoord.x},${doorCoord.y}. Cell left empty.`);
                             // Ensure cell is marked as empty in gridState if door fails
                             gridState[doorCoord.y][doorCoord.x] = null;
                             occupied.delete(`${doorCoord.x},${doorCoord.y}`); // Ensure it's not marked occupied if door failed
                         }
                     }
                 }
                  if (doorsPlaced === 0) {
                       console.warn(`Could not place any doors in room at ${startX},${startY}`);
                       // Maybe force a door placement if none succeeded?
                  }
            } else {
                 console.warn(`No valid wall spots found to potentially place doors for room at ${startX},${startY}.`);
            }

            // 4. Spawn Inside Room (Optional)
            if (interiorCoords.length > 0) {
                interiorCoords.sort(() => 0.5 - Math.random());
                const maxInteriorSpawns = 2;
                let interiorSpawns = 0;

                for(let i = 0; i < interiorCoords.length && interiorSpawns < maxInteriorSpawns; i++) {
                    const spawnPos = interiorCoords[i];
                    // Double check if it's occupied (shouldn't be if logic is right)
                    if (occupied.has(`${spawnPos.x},${spawnPos.y}`) || gridState[spawnPos.y]?.[spawnPos.x]) {
                         continue;
                    }

                    const spawnTypeRoll = Math.random();
                    let spawnedSomething = false;
                    if (spawnTypeRoll < 0.4) { // 40% chest
                        if(createItem('chest', spawnPos.x, spawnPos.y)) {
                             occupied.add(`${spawnPos.x},${spawnPos.y}`); // Mark occupied
                             spawnedSomething = true;
                        }
                    } else if (spawnTypeRoll < 0.7) { // 30% goblin
                        const variant = currentTerrainInfo.variant;
                         if(createUnit('goblin', spawnPos.x, spawnPos.y, variant)) {
                             occupied.add(`${spawnPos.x},${spawnPos.y}`);
                             spawnedSomething = true;
                         }
                    }
                    // Add more types like goblin_archer etc. here with else if
                    // else if (spawnTypeRoll < 0.8 && currentLevel >= GOBLIN_ARCHER_INTRO_LEVEL) { ... }

                    if(spawnedSomething) interiorSpawns++;
                }
            }

            // 5. Finalize Room Occupancy & Remove from Pool
            tempOccupiedRoom.forEach(coordStr => occupied.add(coordStr)); // Ensure main set has all room cells
            // This line reassigns spawnPool, which is why we changed it to 'let'
            spawnPool = spawnPool.filter(p => !tempOccupiedRoom.has(`${p.x},${p.y}`));

            roomsBuilt++; // Mark room as successfully processed
        }
    } // End of castle room logic

    // --- Fill Remaining Obstacles Randomly ---
    let attempts = 0;
    const maxAttempts = numObstacles * 10; // Limit attempts for random fill

    // Re-shuffle pool after room potential removals
    spawnPool.sort(() => 0.5 - Math.random());

    while (spawnedCount < numObstacles && attempts < maxAttempts && spawnPool.length > 0) {
        attempts++;
        const posIndex = Math.floor(Math.random() * spawnPool.length);
        const pos = spawnPool.splice(posIndex, 1)[0];

        // Check main 'occupied' set which includes room interiors/walls/doors
        if (!occupied.has(`${pos.x},${pos.y}`) && !gridState[pos.y]?.[pos.x]) {
            const type = Math.random() < WALL_ROCK_CHANCE ? 'wall_rock' : 'rock';
            // Use the helper, it handles occupied set and count on success
            if(tryPlaceObstacle(type, pos.x, pos.y)) {
                spawnedCount++; // Increment here using the return value is safer
            }
        }
    }

    if (spawnedCount < numObstacles && attempts >= maxAttempts) {
        console.warn(`Obstacle spawn limit not reached, but max attempts hit. Spawned: ${spawnedCount}/${numObstacles}`);
    }
    if (spawnPool.length === 0 && spawnedCount < numObstacles) {
        console.warn(`Ran out of valid spawn pool locations. Spawned: ${spawnedCount}/${numObstacles}`);
    }
}


function spawnInitialUnits() {
    const playerSpawnMinY = currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);
    const playerPositions = [];
    for (let y = currentGridRows - 1; y >= playerSpawnMinY; y--) {
        for (let x = 0; x < currentGridCols; x++) {
            if (isCellInBounds(x,y) && gridState[y]?.[x] === null && !getUnitAt(x,y) && !getObstacleAt(x,y)) {
                playerPositions.push({ x, y });
            }
        }
    }
    const shuffledPlayerPositions = [...playerPositions].sort(() => 0.5 - Math.random());
    let posIndex = 0;

    for (const unitType in playerActiveRoster) {
        const count = playerActiveRoster[unitType];
        for (let i = 0; i < count && posIndex < shuffledPlayerPositions.length; i++) {
            const pos = shuffledPlayerPositions[posIndex++];
            if (pos) { createUnit(unitType, pos.x, pos.y); }
            else { console.warn(`Ran out of spawn positions placing active roster: ${unitType}`); break; }
        }
        if (posIndex >= shuffledPlayerPositions.length) { console.warn("Ran out of spawn positions for player units."); break; }
    }

    if (units.filter(u => u.team === 'player').length === 0) {
         const totalOwned = Object.values(playerOwnedUnits).reduce((a,b)=>a+b,0);
         if (totalOwned > 0) {
             console.error("Failed to spawn any units from active roster, despite owning units!");
             gameOver(false, "Error: No units placed from roster. Check 'Choose Troops'.");
         } else {
              console.error("No player units owned and none selected to spawn! Game cannot start.");
              gameOver(false, "No units available to start the level!");
         }
    }
}

function spawnEnemies() {
    const occupied = new Set(units.map(u => `${u.x},${u.y}`));
    obstacles.forEach(obs => occupied.add(`${obs.x},${obs.y}`));

    const enemySpawnMaxY = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT) - 1;
    const numEnemies = 3 + Math.floor(currentLevel / 1.5);

    const potentialTypesMasterList = ['goblin'];
    if (currentLevel >= GOBLIN_ARCHER_INTRO_LEVEL) potentialTypesMasterList.push('goblin_archer');
    if (currentLevel >= GOBLIN_NETTER_INTRO_LEVEL) potentialTypesMasterList.push('goblin_netter');
    if (currentLevel >= CLUBBER_INTRO_LEVEL) potentialTypesMasterList.push('goblin_clubber');
    if (currentLevel >= JUGGERNAUT_INTRO_LEVEL) potentialTypesMasterList.push('orc_juggernaut');

    const unitsToSpawnTypes = [];
    const isJuggernautLevel = (currentLevel >= JUGGERNAUT_INTRO_LEVEL && currentLevel % JUGGERNAUT_SPAWN_MULTIPLE === 0);

    if (isJuggernautLevel && potentialTypesMasterList.includes('orc_juggernaut')) {
        unitsToSpawnTypes.push('orc_juggernaut');
        const remainingCount = numEnemies - 1;
        const availablePool = potentialTypesMasterList.filter(t => t !== 'orc_juggernaut');
        const fallback = 'goblin';
        for(let i = 0; i < remainingCount; i++) {
            const pool = availablePool.length > 0 ? availablePool : [fallback];
            unitsToSpawnTypes.push(pool[Math.floor(Math.random() * pool.length)]);
        }
    } else {
        const availablePool = potentialTypesMasterList.filter(t => t !== 'orc_juggernaut');
        const fallback = 'goblin';
        for(let i = 0; i < numEnemies; i++) {
            const pool = availablePool.length > 0 ? availablePool : [fallback];
            unitsToSpawnTypes.push(pool[Math.floor(Math.random() * pool.length)]);
        }
    }

    const ensureUnit = (level, type) => { if (currentLevel === level && !unitsToSpawnTypes.includes(type) && unitsToSpawnTypes.length > 0 && potentialTypesMasterList.includes(type)) unitsToSpawnTypes[Math.floor(Math.random()*unitsToSpawnTypes.length)] = type; };
    ensureUnit(GOBLIN_ARCHER_INTRO_LEVEL, 'goblin_archer');
    ensureUnit(GOBLIN_NETTER_INTRO_LEVEL, 'goblin_netter');
    ensureUnit(CLUBBER_INTRO_LEVEL, 'goblin_clubber');

    let spawnPool = [];
    for (let y = 0; y <= enemySpawnMaxY; y++) {
        for (let x = 0; x < currentGridCols; x++) {
            if (isCellInBounds(x,y) && !occupied.has(`${x},${y}`) && !getObstacleAt(x,y)) {
                 spawnPool.push({x, y});
            }
        }
    }
     spawnPool.sort(() => 0.5 - Math.random());

    for (const typeToSpawn of unitsToSpawnTypes) {
         if(spawnPool.length === 0) {
             console.warn(`No more valid spawn positions for enemy type ${typeToSpawn}`);
             break;
         }
         const pos = spawnPool.pop();
         const variant = (typeToSpawn.startsWith('goblin')) ? currentTerrainInfo.variant : null;
         const newUnit = createUnit(typeToSpawn, pos.x, pos.y, variant);
         if(newUnit) occupied.add(`${pos.x},${pos.y}`);
     }
}

function spawnItems() {
    const occupiedSet = new Set(units.map(u => `${u.x},${u.y}`));
    obstacles.forEach(obs => occupiedSet.add(`${obs.x},${obs.y}`));

    let chestsToTry = 0;
    const chestChance = CHEST_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS);
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
             if (isCellInBounds(x, y) && !occupiedSet.has(`${x},${y}`) && !getObstacleAt(x,y)) {
                 spawnPool.push({x, y});
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

function createUnit(type, x, y, variantType = null) {
    const data = UNIT_DATA[type];
    if (!data) { console.error(`Invalid unit type: ${type}`); return null; }
    const unit = {
        id: `${data.id_prefix}${unitCounter++}`, type, x, y,
        baseHp: data.baseHp, baseAtk: data.baseAtk, baseMov: data.mov, baseRange: data.range,
        name: data.name, knockback: data.knockback || false, cleaveDamage: data.cleaveDamage || 0,
        team: data.team, acted: false, element: null, spriteUrl: data.spriteUrl,
        deadSpriteUrl: data.deadSpriteUrl, portraitUrl: data.portraitUrl,
        isFrozen: false, frozenTurnsLeft: 0, isNetted: false, nettedTurnsLeft: 0,
        isSlowed: false, slowedTurnsLeft: 0, netCooldownTurnsLeft: 0, variantType: null,
        canMoveAndAttack: false, inflictsSlow: false, inTower: null, currentRange: data.range
    };
    unit.maxHp = unit.baseHp; unit.atk = unit.baseAtk; unit.mov = unit.baseMov;
    if (unit.team === 'player') {
       const hpUpgradeKey = `${type}_hp`; const atkUpgradeKey = `${type}_atk`;
       unit.maxHp += playerUnitUpgrades[hpUpgradeKey] || 0;
       unit.atk += playerUnitUpgrades[atkUpgradeKey] || 0;
    }
    unit.hp = unit.maxHp;
   if (unit.team === 'enemy' && type.startsWith('goblin') && variantType && variantType !== 'green') {
       unit.variantType = variantType; let prefix = '';
       switch (variantType) {
           case 'red': prefix = 'Ember '; unit.atk += GOBLIN_RED_ATK_BONUS; break;
           case 'blue': prefix = 'Azure '; unit.maxHp += GOBLIN_BLUE_HP_BONUS; unit.hp = unit.maxHp; unit.inflictsSlow = true; break;
           case 'yellow': prefix = 'Sand '; unit.mov += GOBLIN_YELLOW_MOV_BONUS; unit.canMoveAndAttack = true; break;
       }
       unit.name = unit.name.replace(/goblin/i, `${prefix}Goblin`);
   } else if (unit.team === 'enemy' && type.startsWith('goblin')) {
       unit.variantType = 'green';
   }
    units.push(unit);
    return unit;
}

function createObstacle(type, x, y) {
    const data = OBSTACLE_DATA[type];
    if (!data) return null;
    const obstacle = {
        id: `obs${obstacleCounter++}`, type, x, y,
        hp: data.hp, maxHp: data.hp, blocksMove: data.blocksMove,
        blocksLOS: data.blocksLOS, destructible: data.destructible,
        enterable: data.enterable || false, rangeBonus: data.rangeBonus || 0,
        element: null, occupantUnitId: null, isVertical: false
    };
    obstacles.push(obstacle);
    gridState[y][x] = type;
    return obstacle;
}

function createItem(type, x, y, stackIndex = 0) {
    const data = ITEM_DATA[type];
    if (!data) return null;
    const item = {
        id: `item${itemCounter++}`, type, x, y, element: null, stackIndex,
        opened: false, collected: false, value: data.value || 0
    };
    if (type === 'chest') {
        item.baseGoldAmount = data.baseGoldAmount;
        item.potionChance = Math.min(POTION_DROP_CHANCE_CHEST_MAX, POTION_DROP_CHANCE_CHEST_BASE + POTION_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1));
        item.gemChance = Math.min(GEM_DROP_CHANCE_CHEST_MAX, GEM_DROP_CHANCE_CHEST_BASE + GEM_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1));
        const maxBonusGold = Math.min(CHEST_MAX_TOTAL_GOLD - item.baseGoldAmount, Math.floor(CHEST_MAX_BONUS_GOLD_PER_LEVEL * currentLevel));
        item.value = item.baseGoldAmount + Math.floor(Math.random() * (maxBonusGold + 1));
        item.value = Math.max(1, Math.min(CHEST_MAX_TOTAL_GOLD, item.value));
    } else if (type === 'shiny_gem') {
        item.value = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin;
    }
    items.push(item);
    return item;
}

function finishAction(unit, actionType = 'other') {
    if (!unit || !isUnitAliveAndValid(unit)) return;
    if (!levelClearedAwaitingInput && !unit.acted) {
        unit.acted = true;
        if (unit.team === 'player' && (actionType === 'move' || actionType === 'attack')) {
            playerActionsTakenThisLevel++;
             if(typeof updateQuitButton === 'function') updateQuitButton();
        }
    }
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    if (selectedUnit?.id === unit.id) {
        if (typeof deselectUnit === 'function') deselectUnit(false);
    }
    if (gameSettings.showHpBars && typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);
    checkWinLossConditions();
}

async function enterTower(unit, tower) {
    if (!unit || !tower || tower.occupantUnitId || !tower.enterable || !isUnitAliveAndValid(unit) || unit.y !== tower.y + 1 || unit.x !== tower.x) {
        console.error("Invalid enterTower call conditions.", unit, tower); return false;
    }
    if (unit.inTower) leaveTower(unit);
    const startX = unit.x; const startY = unit.y;
    unit.x = tower.x; unit.y = tower.y;
    tower.occupantUnitId = unit.id; unit.inTower = tower.id; playSfx('towerEnter');
    unit.currentRange = unit.baseRange + (unit.baseRange > 1 ? tower.rangeBonus : 0);
    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
    if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
    if (typeof animateUnitMove === 'function') await animateUnitMove(unit, startX, startY, unit.x, unit.y);
    else if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
    finishAction(unit, 'move');
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    return true;
}

function leaveTower(unit) {
    if (!unit || !unit.inTower) return;
    const tower = obstacles.find(o => o.id === unit.inTower);
    if (tower) {
        if (unit.x !== tower.x || unit.y !== tower.y) { console.warn("leaveTower: unit mismatch.", unit, tower); unit.x = tower.x; unit.y = tower.y; }
        unit.x = tower.x; unit.y = tower.y + 1; tower.occupantUnitId = null;
    } else {
        console.warn("leaveTower: tower not found:", unit.inTower);
        if (isCellInBounds(unit.x, unit.y + 1) && !getObstacleAt(unit.x, unit.y+1)?.blocksMove && !getUnitAt(unit.x, unit.y+1)) unit.y++;
    }
    unit.inTower = null; unit.currentRange = unit.baseRange; playSfx('towerExit');
    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
    if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
}

async function moveUnit(unit, targetX, targetY) {
    if (!unit || !isUnitAliveAndValid(unit)) return false;
    if (!levelClearedAwaitingInput && ((unit.acted && !unit.canMoveAndAttack) || unit.isFrozen || unit.isNetted)) return false;
    if (!isCellInBounds(targetX, targetY)) return false;

    const startX = unit.x;
    const startY = unit.y;
    const occupyingUnit = getUnitAt(targetX, targetY);
    const obstacleAtTarget = getObstacleAt(targetX, targetY);
    const towerUnitIsIn = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;

    if (occupyingUnit && occupyingUnit.id !== unit.id) return false;
    if (obstacleAtTarget && obstacleAtTarget.blocksMove) return false;
    if (towerUnitIsIn && (targetX !== towerUnitIsIn.x || targetY !== towerUnitIsIn.y + 1)) {
        playSfx('error');
        showFeedback("Must exit tower to the cell below.", "feedback-error");
        return false;
    }
    if (obstacleAtTarget?.enterable && obstacleAtTarget.occupantUnitId && obstacleAtTarget.occupantUnitId !== unit.id) return false;
    if (obstacleAtTarget?.enterable && startY !== targetY + 1) return false;

    if (startX === targetX && startY === targetY) return false;

    let processingWasSet = false;
    if (currentTurn === 'player' && !isProcessing) {
        isProcessing = true;
        processingWasSet = true;
        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    }

    let moveSuccessful = false;

    try {
        playSfx('move');
        let animationStartX = startX;
        let animationStartY = startY;

        if (towerUnitIsIn && targetX === towerUnitIsIn.x && targetY === towerUnitIsIn.y + 1) {
            leaveTower(unit);
        } else {
            unit.x = targetX;
            unit.y = targetY;
        }

        if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') {
            updateWorldHpBarPosition(unit);
        }

        if (typeof animateUnitMove === 'function') {
            await animateUnitMove(unit, animationStartX, animationStartY, unit.x, unit.y);
        } else if (typeof updateUnitPosition === 'function') {
            updateUnitPosition(unit, true);
        }

        if (unit.team === 'player') {
             checkForItemPickup(unit, unit.x, unit.y);
        }
        if (unit.team === 'player' && playerPassiveUpgrades.gold_magnet) {
            triggerGreedPassive(unit);
        }

        moveSuccessful = true;
        return true;

    } catch(e) {
        console.error(`Error during moveUnit for unit ${unit?.id} to (${targetX},${targetY}):`, e);
        unit.x = startX;
        unit.y = startY;
        if(towerUnitIsIn && !unit.inTower) {
             unit.inTower = towerUnitIsIn.id;
             towerUnitIsIn.occupantUnitId = unit.id;
             unit.currentRange = unit.baseRange + (unit.baseRange > 1 ? towerUnitIsIn.rangeBonus : 0);
             if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
        }
        if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
        if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
        moveSuccessful = false;
        return false;

    } finally {
        if (moveSuccessful) {
            if (!levelClearedAwaitingInput) {
                 if (unit.canMoveAndAttack && !unit.acted) {
                     if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                 } else {
                     finishAction(unit, 'move');
                 }
            } else {
                 if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                 checkWinLossConditions();
            }
        }
        if (processingWasSet) {
            isProcessing = false;
            if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
        }
    }
}


function checkForItemPickup(unit, x, y) {
    // Initial validation: Ensure it's a valid player unit and coordinates
    if (!unit || unit.team !== 'player' || !isUnitAliveAndValid(unit) || !isCellInBounds(x, y)) {
        return;
    }

    // Find all uncollected items on the target cell
    const itemsOnCell = items.filter(item => !item.collected && item.x === x && item.y === y);
    if (itemsOnCell.length === 0) {
        return; // No items to pick up
    }

    // --- Initialize variables for this pickup event ---
    let goldFromThisPickup = 0;
    let chestOpenedThisCheck = false;
    let itemsToAnimateRemoval = [];
    // Use an object to track the count/value of distinct items collected in this single event
    let collectedCounts = {
        gold: 0,
        shiny_gem: 0,
        health_potion: 0
        // Add other collectible types here if needed
    };
    let healAppliedTotal = 0; // Track total healing applied from potions this pickup

    // --- Process each item on the cell ---
    itemsOnCell.forEach(item => {
        const itemData = ITEM_DATA[item.type];
        if (!itemData || item.collected) return; // Skip if already collected or data missing

        item.collected = true; // Mark as collected FIRST
        itemsToAnimateRemoval.push(item); // Add to list for visual removal

        switch (itemData.pickupAction) {
            case 'addGold':
                const goldValue = item.value || itemData.value || 0;
                goldFromThisPickup += goldValue;
                // Don't count gem value directly as 'gold coins', just add to total gold
                if (item.type === 'shiny_gem') {
                    collectedCounts.shiny_gem++; // Count the gem itself
                } else if (item.type === 'gold') {
                     collectedCounts.gold += goldValue; // Count actual gold coins/value
                }
                break;

            case 'healUnit':
                const healAmount = itemData.value || 0;
                if (healAmount > 0 && unit.hp < unit.maxHp) {
                    const healApplied = Math.min(healAmount, unit.maxHp - unit.hp);
                    unit.hp += healApplied;
                    healAppliedTotal += healApplied; // Track total healing
                    collectedCounts.health_potion++; // Count the potion
                    // Defer UI updates until after loop
                }
                break;

            case 'openChest':
                if (!item.opened) { // Ensure chest isn't already open
                    item.opened = true;
                    chestOpenedThisCheck = true;
                    if (typeof updateVisualItemState === 'function') {
                        updateVisualItemState(item); // Update visual to opened chest
                    }

                    // Add base gold from chest
                    const chestGold = item.value || 0; // Use pre-calculated chest value
                    goldFromThisPickup += chestGold;
                    collectedCounts.gold += chestGold; // Add chest gold to gold count

                    // Check for potion drop
                    if (Math.random() < item.potionChance && unit.hp < unit.maxHp) {
                         const potionHealAmount = HEALTH_POTION_HEAL_AMOUNT; // Use constant
                         const healApplied = Math.min(potionHealAmount, unit.maxHp - unit.hp);
                         unit.hp += healApplied;
                         healAppliedTotal += healApplied;
                         collectedCounts.health_potion++; // Count the potion from chest
                    }

                    // Check for gem drop
                    if (Math.random() < item.gemChance) {
                        const gemVal = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin;
                        goldFromThisPickup += gemVal; // Add gem value to total gold
                        collectedCounts.shiny_gem++; // Count the gem from chest
                    }
                }
                // Note: We don't remove the chest item visually here, updateVisualItemState handles the appearance change
                // Remove the chest from the animation list if it was added mistakenly
                itemsToAnimateRemoval = itemsToAnimateRemoval.filter(animItem => animItem.id !== item.id);
                break;

            default:
                console.warn(`Unknown item pickup action: ${itemData.pickupAction} for item type: ${item.type}`);
                break;
        }
    });

    // --- Update Game State ---
    playerGold += goldFromThisPickup;
    goldCollectedThisLevel += goldFromThisPickup;

    // --- Play Sounds (Prioritized) ---
    if (chestOpenedThisCheck) {
        playSfx('chestOpen');
    } else if (collectedCounts.health_potion > 0) {
        playSfx('potionPickup'); // Potion sound takes precedence over gold/gem if no chest
    } else if (collectedCounts.gold > 0 || collectedCounts.shiny_gem > 0) {
        playSfx('pickup'); // Generic pickup for gold/gems
    }

    // --- Update UI ---
    if (healAppliedTotal > 0) {
        if (typeof showHealPopup === 'function') showHealPopup(x, y, healAppliedTotal); // Show total heal
        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);
    }
    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();

    // --- Build Consolidated Feedback Message ---
    let feedbackParts = [];
    const goldIcon = `<img src="./sprites/gold.png" class="feedback-gold-icon" alt="G">`;
    const gemIcon = `<img src="./sprites/shiny_gem.png" class="feedback-gold-icon" alt="💎">`; // Use appropriate icon
    const potionIcon = `<img src="./sprites/potion_heal.png" class="feedback-gold-icon" alt="❤️">`; // Use appropriate icon

    // Add gold amount if collected (from coins or chests)
    if (collectedCounts.gold > 0) {
        feedbackParts.push(`+${collectedCounts.gold}${goldIcon}`);
    }
    // Add gem count if collected
    if (collectedCounts.shiny_gem > 0) {
        feedbackParts.push(`+${collectedCounts.shiny_gem}${gemIcon}`);
    }
    // Add potion count if collected
    if (collectedCounts.health_potion > 0) {
         feedbackParts.push(`+${collectedCounts.health_potion}${potionIcon}`);
    }

    // Show the consolidated feedback if any items were collected
    if (feedbackParts.length > 0 && typeof showFeedback === 'function') {
        showFeedback(feedbackParts.join(' '), 'feedback-gold'); // Join parts with space
    }

    // --- Handle Visual Removal/Animation ---
    if (itemsToAnimateRemoval.length > 0) {
        if (typeof animateItemPickup === 'function') {
            animateItemPickup(itemsToAnimateRemoval); // Animate removal
        } else {
            removeVisualItems(itemsToAnimateRemoval); // Fallback: Instant removal
        }
        // Delay updating cell status until after animation might finish
        setTimeout(() => updateCellItemStatus(x, y), ITEM_PICKUP_ANIMATION_DURATION_MS + 50);
    } else if (chestOpenedThisCheck) {
        // If only a chest was opened (no other items to animate), update cell status immediately
        updateCellItemStatus(x, y);
    }

    // --- Check Win Conditions After Pickup ---
    // Check if level cleared and no collectibles remain
    const remainingCollectibles = items.some(item => !item.collected && (item.type !== 'chest' || !item.opened));
    if (levelClearedAwaitingInput && !remainingCollectibles && typeof showFeedback === 'function') {
        showFeedback("All items collected!", "feedback-levelup");
        if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); // Update End Turn button text maybe
    }
    // Let checkWinLossConditions handle the actual win state check if needed elsewhere
}

async function initiateTowerEntrySequence(unit, tower, path) {
    if (!unit || !tower || !path) { console.error("Missing args for tower entry"); isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); return; }
    const entryCell = path[path.length - 1];
    try {
        let currentPathX = unit.x; let currentPathY = unit.y;
        for (const step of path) {
            if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') { const tempUnit = { ...unit, x: step.x, y: step.y }; updateWorldHpBarPosition(tempUnit); }
            if (typeof animateUnitMove === 'function') await animateUnitMove(unit, currentPathX, currentPathY, step.x, step.y);
            else { unit.x = step.x; unit.y = step.y; if(typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); }
            currentPathX = step.x; currentPathY = step.y;
        }
        if (unit.x === entryCell.x && unit.y === entryCell.y) await enterTower(unit, tower);
        else { console.error("Unit position mismatch after path animation"); unit.x = entryCell.x; unit.y = entryCell.y; await enterTower(unit, tower); }
    } catch (error) { console.error("Error during tower entry sequence:", error); if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); }
    finally { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
}

async function attack(attacker, targetX, targetY, finishAttackerAction = true) {
    if (!attacker || !isUnitAliveAndValid(attacker)) return;
    if (levelClearedAwaitingInput) { playSfx('error'); if (typeof showFeedback === 'function') showFeedback("Level cleared, cannot attack.", "feedback-error"); if (currentTurn === 'player') isProcessing = false; return; }
    if ((attacker.acted && !attacker.canMoveAndAttack) || attacker.isFrozen) { if (currentTurn === 'enemy' && !attacker.acted && finishAttackerAction) finishAction(attacker); else if (currentTurn === 'player') isProcessing = false; return; }
    const targetUnit = getUnitAt(targetX, targetY);
    let targetObstacle = getObstacleAt(targetX, targetY); // Use let since it might be nullified
    if (!targetUnit && (!targetObstacle || !targetObstacle.destructible)) { playSfx('error'); return; }

    let targetObject = targetUnit || targetObstacle;
    let unitInTargetTower = null;

    if (targetObstacle?.enterable && targetObstacle.occupantUnitId) {
        unitInTargetTower = units.find(u => u.id === targetObstacle.occupantUnitId);
        if (unitInTargetTower && unitInTargetTower.team !== attacker.team) targetObject = targetObstacle;
        else { unitInTargetTower = null; targetObject = targetUnit || targetObstacle; }
    } else if (targetUnit?.inTower) {
        const towerUnitIsIn = obstacles.find(o => o.id === targetUnit.inTower);
        if (towerUnitIsIn && isObstacleIntact(towerUnitIsIn)) { targetObject = towerUnitIsIn; unitInTargetTower = targetUnit; }
    }
    if (!targetObject) { playSfx('error'); return; }
    const distance = getDistance(attacker, targetObject); const range = attacker.currentRange; const isRanged = distance > 1;

    if (distance > range || (isRanged && !hasLineOfSight(attacker, targetObject))) { playSfx('error'); showFeedback("Cannot attack target (out of range or LOS).", "feedback-error"); return; }

    // Special check for door: HP > 0 means it blocks LOS even if player is next to it for ranged attacks.
    if(isRanged && targetObject.type === 'door' && isObstacleIntact(targetObject)) {
        playSfx('error'); showFeedback("Cannot attack target (out of range or LOS).", "feedback-error"); return;
    }

    if (targetObject.type && OBSTACLE_DATA[targetObject.type] && !targetObject.destructible) { playSfx('error'); showFeedback("Cannot destroy that obstacle.", "feedback-error"); return; }
    const targetIsUnit = !!units.find(u => u.id === targetObject.id); const targetIsObstacle = !targetIsUnit;
    const targetOriginalData = { id: targetObject.id, x: targetX, y: targetY, type: targetIsUnit ? 'unit' : 'obstacle' };
    const damage = attacker.atk; const isChampion = attacker.type === 'champion'; const cleaveDamage = isChampion ? (attacker.cleaveDamage || 0) : 0;
    let processingWasSet = false; if (currentTurn === 'player' && !isProcessing) { isProcessing = true; processingWasSet = true; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
    let impactDelay = 0; if (typeof animateAttack === 'function') impactDelay = await animateAttack(attacker, { x: targetX, y: targetY }, isRanged);

    return new Promise(resolve => {
        setTimeout(async () => {
            let targetStillExists = targetIsUnit ? units.find(u => u.id === targetOriginalData.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === targetOriginalData.id && isObstacleIntact(o));
            if (!targetStillExists) { if (processingWasSet) isProcessing = false; resolve(); return; }
            targetObject = targetStillExists;
            if (targetIsObstacle && targetObject.enterable && targetObject.occupantUnitId) { unitInTargetTower = units.find(u => u.id === targetObject.occupantUnitId); if (!unitInTargetTower || unitInTargetTower.team === attacker.team) unitInTargetTower = null; } else { unitInTargetTower = null; }
            try {
                playSfx('hit'); targetObject.hp -= damage; if (targetObject.hp < 0) targetObject.hp = 0;
                if (typeof showDamagePopup === 'function') showDamagePopup(targetX, targetY, damage);
                if (typeof flashElementOnHit === 'function') flashElementOnHit(targetObject.element);
                if (targetIsUnit && typeof updateWorldHpBar === 'function') updateWorldHpBar(targetObject);
                if (targetIsUnit && typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetObject);
                let deathPromises = []; let primaryTargetRemoved = false;
                if (targetObject.hp <= 0) {
                    primaryTargetRemoved = true;
                    if (targetIsUnit) { playSfx(targetObject.team === 'player' ? 'playerDie' : 'defeat'); deathPromises.push(removeUnit(targetObject)); }
                    else {
                         playSfx(targetObject.type === 'door' ? 'doorDestroy' : 'towerDestroy');
                         const unitToDamageAfterTower = unitInTargetTower && isUnitAliveAndValid(unitInTargetTower) ? unitInTargetTower : null;
                         deathPromises.push(removeObstacle(targetObject));
                         targetObstacle = null; // Mark as removed for later checks
                         if (unitToDamageAfterTower) {
                            playSfx('hit'); unitToDamageAfterTower.hp -= damage; if (unitToDamageAfterTower.hp < 0) unitToDamageAfterTower.hp = 0;
                            if (typeof showDamagePopup === 'function') showDamagePopup(unitToDamageAfterTower.x, unitToDamageAfterTower.y, damage);
                            if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterTower.element);
                            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterTower);
                            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterTower);
                             if (unitToDamageAfterTower.hp <= 0) { playSfx(unitToDamageAfterTower.team === 'player' ? 'playerDie' : 'defeat'); deathPromises.push(removeUnit(unitToDamageAfterTower)); }
                         }
                    } targetObject = null;
                } else if (targetIsUnit) {
                    if (attacker.inflictsSlow) { targetObject.isSlowed = true; targetObject.slowedTurnsLeft = GOBLIN_BLUE_SLOW_DURATION; playSfx('slow_inflicted'); if (typeof updateUnitVisualState === 'function') updateUnitVisualState(targetObject); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetObject); }
                    if (attacker.knockback) {
                        const kbDirX = Math.sign(targetX - attacker.x); const kbDirY = Math.sign(targetY - attacker.y);
                        if (kbDirX !== 0 || kbDirY !== 0) {
                            const kbX = targetX + kbDirX; const kbY = targetY + kbDirY;
                            if (isCellInBounds(kbX, kbY) && !getUnitAt(kbX, kbY) && !getObstacleAt(kbX, kbY)?.blocksMove) {
                                const unitToMove = units.find(u => u.id === targetOriginalData.id); if(unitToMove) await moveUnit(unitToMove, kbX, kbY);
                            }
                        }
                    }
                }
                await Promise.all(deathPromises); deathPromises = [];
                if (isChampion && cleaveDamage > 0) {
                    const currentAttacker = units.find(u => u.id === attacker.id);
                    if (currentAttacker && isUnitAliveAndValid(currentAttacker)) {
                         const attackDirX = Math.sign(targetOriginalData.x - currentAttacker.x); const attackDirY = Math.sign(targetOriginalData.y - currentAttacker.y);
                         const potentialCleaveCellsCoords = [];
                        if (attackDirX !== 0) { potentialCleaveCellsCoords.push({ x: targetOriginalData.x, y: targetOriginalData.y - 1 }, { x: targetOriginalData.x, y: targetOriginalData.y + 1 }, { x: targetOriginalData.x + attackDirX, y: targetOriginalData.y }); }
                        else if (attackDirY !== 0) { potentialCleaveCellsCoords.push({ x: targetOriginalData.x - 1, y: targetOriginalData.y }, { x: targetOriginalData.x + 1, y: targetOriginalData.y }, { x: targetOriginalData.x, y: targetOriginalData.y + attackDirY }); }
                        else { potentialCleaveCellsCoords.push({ x: targetOriginalData.x-1, y: targetOriginalData.y }, { x: targetOriginalData.x+1, y: targetOriginalData.y }, { x: targetOriginalData.x, y: targetOriginalData.y-1 }, { x: targetOriginalData.x, y: targetOriginalData.y+1 }); }
                        await new Promise(r => setTimeout(r, 50));
                        for (const { x: cleaveX, y: cleaveY } of potentialCleaveCellsCoords) {
                             if (!isCellInBounds(cleaveX, cleaveY)) continue;
                             const secondaryUnit = getUnitAt(cleaveX, cleaveY); const secondaryObstacle = getObstacleAt(cleaveX, cleaveY);
                             let cleaveTargetObject = secondaryUnit || (secondaryObstacle?.destructible ? secondaryObstacle : null); let unitInCleaveTower = null;
                             if (!cleaveTargetObject || cleaveTargetObject.id === targetOriginalData.id) continue;
                             if (secondaryUnit && secondaryUnit.team === currentAttacker.team) continue;
                             if (secondaryObstacle?.enterable && secondaryObstacle.occupantUnitId) { const unitInside = units.find(u => u.id === secondaryObstacle.occupantUnitId); if (unitInside && unitInside.team !== currentAttacker.team) { cleaveTargetObject = secondaryObstacle; unitInCleaveTower = unitInside; } }
                             else if (secondaryUnit?.inTower) { const towerUnitIsIn = obstacles.find(o => o.id === secondaryUnit.inTower); if (towerUnitIsIn && isObstacleIntact(towerUnitIsIn)) { cleaveTargetObject = towerUnitIsIn; unitInCleaveTower = secondaryUnit; } }
                             if (!cleaveTargetObject) continue;
                             playSfx('hit'); cleaveTargetObject.hp -= cleaveDamage; if (cleaveTargetObject.hp < 0) cleaveTargetObject.hp = 0;
                             if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, cleaveDamage);
                             if (typeof flashElementOnHit === 'function') flashElementOnHit(cleaveTargetObject.element);
                             const isCleaveTargetUnit = !!units.find(u => u.id === cleaveTargetObject.id);
                             if (isCleaveTargetUnit) { if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(cleaveTargetObject); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(cleaveTargetObject); }
                             if (cleaveTargetObject.hp <= 0) {
                                 if (isCleaveTargetUnit) { playSfx('defeat'); deathPromises.push(removeUnit(cleaveTargetObject)); }
                                 else {
                                      playSfx(cleaveTargetObject.type === 'door' ? 'doorDestroy' : 'towerDestroy');
                                      const unitToDamageAfterCleavedTower = unitInCleaveTower && isUnitAliveAndValid(unitInCleaveTower) ? unitInCleaveTower : null;
                                      deathPromises.push(removeObstacle(cleaveTargetObject));
                                      if (unitToDamageAfterCleavedTower) {
                                            playSfx('hit'); unitToDamageAfterCleavedTower.hp -= cleaveDamage; if (unitToDamageAfterCleavedTower.hp < 0) unitToDamageAfterCleavedTower.hp = 0;
                                            if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, cleaveDamage);
                                            if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterCleavedTower.element);
                                            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterCleavedTower);
                                            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterCleavedTower);
                                            if (unitToDamageAfterCleavedTower.hp <= 0) { playSfx('defeat'); deathPromises.push(removeUnit(unitToDamageAfterCleavedTower)); }
                                      }
                                 }
                             }
                         } await Promise.all(deathPromises);
                    }
                }
                const finalAttackerCheck = units.find(u => u.id === attacker.id);
                if (finalAttackerCheck && isUnitAliveAndValid(finalAttackerCheck) && finishAttackerAction) {
                     if (!finalAttackerCheck.canMoveAndAttack || finalAttackerCheck.acted) { finishAction(finalAttackerCheck, 'attack'); }
                     else { finalAttackerCheck.acted = true; if (typeof updateUnitVisualState === 'function') updateUnitVisualState(finalAttackerCheck); if (gameSettings.showHpBars && typeof updateWorldHpBar === 'function') updateWorldHpBar(finalAttackerCheck); checkWinLossConditions(); }
                } else { checkWinLossConditions(); }
            } catch (e) { console.error("Error attack resolution:", e); }
            finally { if (processingWasSet) { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
            checkWinLossConditions();
            resolve(); }
        }, impactDelay);
    });
}

function removeObstacle(obstacle) {
     return new Promise(resolve => {
        if (!obstacle) { resolve(); return; }
        const obsId = obstacle.id; const obsX = obstacle.x; const obsY = obstacle.y;
        obstacle.hp = 0; gridState[obsY][obsX] = null;
        if (obstacle.occupantUnitId) { const unitInside = units.find(u => u.id === obstacle.occupantUnitId); if (unitInside) leaveTower(unitInside); obstacle.occupantUnitId = null; }
        if (typeof handleObstacleDestroyAnimation === 'function') {
             handleObstacleDestroyAnimation(obstacle).then(() => { const index = obstacles.findIndex(o => o.id === obsId); if (index !== -1) obstacles.splice(index, 1); if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY); resolve(); });
        } else { obstacle.element?.remove(); const index = obstacles.findIndex(o => o.id === obsId); if (index !== -1) obstacles.splice(index, 1); if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY); resolve(); }
     });
}

function removeUnit(unit) {
    return new Promise(resolve => {
        if (!unit) { resolve(); return; }
        const unitId = unit.id; const unitTeam = unit.team; const unitType = unit.type;
        const finalX = unit.x; const finalY = unit.y; const wasSelected = selectedUnit?.id === unitId;
        unit.hp = 0; if (unit.inTower) leaveTower(unit);
        if (unitTeam === 'enemy') enemiesKilledThisLevel++;
        let itemsToDrop = []; let goldFromDrops = 0;
        if (unitTeam === 'enemy') {
             if (Math.random() < GOLD_DROP_CHANCE) { let goldAmountToDrop = BASE_GOLD_DROP_AMOUNT; if (ADVANCED_GOBLIN_TYPES.includes(unitType) && Math.random() < ADVANCED_GOBLIN_EXTRA_GOLD_CHANCE) { goldAmountToDrop += ADVANCED_GOBLIN_EXTRA_GOLD_AMOUNT; } goldFromDrops += goldAmountToDrop; for (let i = 0; i < goldAmountToDrop; i++) { itemsToDrop.push(createItem('gold', finalX, finalY, i)); } }
             const potionDropChance = POTION_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS)); if (Math.random() < potionDropChance) { itemsToDrop.push(createItem('health_potion', finalX, finalY, itemsToDrop.length)); }
             const gemDropChance = GEM_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS)); if (Math.random() < gemDropChance) { itemsToDrop.push(createItem('shiny_gem', finalX, finalY, itemsToDrop.length)); }
        }
        if (itemsToDrop.length > 0) { playSfx('goldDrop'); itemsToDrop = itemsToDrop.filter(item => item !== null); if(typeof animateItemDrop === 'function' && itemsToDrop.length > 0) { animateItemDrop(itemsToDrop, finalX, finalY); } else if (typeof renderAll === 'function'){ renderAll(); } }
        if (wasSelected && typeof deselectUnit === 'function') deselectUnit(false);
        if (typeof updateUnitInfoOnDeath === 'function') updateUnitInfoOnDeath(unitId);
        if (typeof removeWorldHpBar === 'function') removeWorldHpBar(unit.id);
        if (typeof handleUnitDeathAnimation === 'function') handleUnitDeathAnimation(unit, finalX, finalY, deathSpriteTimeouts); else unit.element?.remove();
        const unitIndex = units.findIndex(u => u.id === unitId); if (unitIndex !== -1) units.splice(unitIndex, 1);
        checkWinLossConditions();
        resolve();
    });
}

function getSpellEffectValue(spellName, baseValue) {
    const upgradeLevel = playerSpellUpgrades[spellName] || 0; const config = SPELL_UPGRADE_CONFIG[spellName];
    if (!config || upgradeLevel < 0) return baseValue;
    const cheatBonus = (config.stat === 'damage' && playerCheatSpellAttackBonus > 0) ? playerCheatSpellAttackBonus : 0;
    const effectIncrease = config.effectIncrease ?? 0; return baseValue + (upgradeLevel * effectIncrease) + cheatBonus;
}

function getFrostNovaRadiusLevel() {
     const upgradeLevel = playerSpellUpgrades['frostNova'] || 0; const maxUpgradeLevel = SPELL_UPGRADE_CONFIG['frostNova']?.maxLevel ?? 4;
     return FROST_NOVA_BASE_RADIUS_LEVEL + Math.min(upgradeLevel, maxUpgradeLevel);
}

async function castSpell(spellName, target, originElement = null) {
     if (!spellUses[spellName] && !unlimitedSpellsCheat) { playSfx('error'); return false; }
     if (currentTurn !== 'player' || isProcessing) { playSfx('error'); if(typeof showFeedback === 'function') showFeedback("Cannot cast spell now.", "feedback-error"); return false; }
     if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (!unlimitedSpellsCheat) spellUses[spellName] = false; if (typeof updateSpellUI === 'function') updateSpellUI();
     let success = false; let deathPromises = [];
     try {
        switch(spellName) {
            case 'fireball':
                let fbTargetObject = null; // This will hold the unit or obstacle object

                const isTargetEnemyUnit = target?.team === 'enemy' && isUnitAliveAndValid(target);
                const isTargetDestructibleObstacle = target && !target.team && target.type && target.destructible === true && isObstacleIntact(target);

                if (isTargetEnemyUnit) {
                    fbTargetObject = target;
                } else if (isTargetDestructibleObstacle) {
                    fbTargetObject = target;
                }

                if (fbTargetObject && originElement) {
                    playSfx('fireballShoot');
                    const targetPos = { x: fbTargetObject.x, y: fbTargetObject.y }; // Grid coordinates

                    // --- Trigger the NEW animation (UI responsibility) ---
                    // Pass the UI element (origin) and the GRID coordinates of the target
                    if (typeof animateFireball === 'function') {
                         // No await needed here, animation runs concurrently in UI
                         animateFireball(originElement, targetPos.x, targetPos.y);
                    }

                    // --- Wait for animation travel time BEFORE applying damage ---
                    await new Promise(resolve => setTimeout(resolve, FIREBALL_PROJECTILE_DURATION_MS));

                    // --- Apply Damage Logic ---
                    playSfx('fireballHit');

                    // Re-verify target exists after travel time
                    const stillTarget = fbTargetObject.team ?
                        units.find(u => u.id === fbTargetObject.id && isUnitAliveAndValid(u)) :
                        obstacles.find(o => o.id === fbTargetObject.id && isObstacleIntact(o));

                    // Check if target still exists and is valid (alive/intact)
                    if (stillTarget) {
                        const actualDamage = getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE);
                        stillTarget.hp -= actualDamage;
                        if (stillTarget.hp < 0) stillTarget.hp = 0;

                        // UI Feedback for damage
                        if (typeof showDamagePopup === 'function') showDamagePopup(targetPos.x, targetPos.y, actualDamage);
                        if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element);
                        if (stillTarget.team && typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget);

                        // Check for death/destruction
                        if (stillTarget.hp <= 0) {
                            if (stillTarget.team) { // It's a unit
                                playSfx('defeat'); // Or playerDie if needed
                                deathPromises.push(removeUnit(stillTarget));
                            } else { // It's an obstacle
                                playSfx(stillTarget.type === 'door' ? 'doorDestroy' : 'towerDestroy'); // Specific sounds
                                deathPromises.push(removeObstacle(stillTarget));
                            }
                        } else if (stillTarget.team && typeof updateUnitInfoDisplay === 'function') {
                             // Update UI if target survived
                             updateUnitInfoDisplay(stillTarget);
                        }
                        success = true; // Spell successfully hit a valid target

                        // Trigger explosion visual effect at target location (UI responsibility)
                        if (typeof createExplosionEffect === 'function') {
                            createExplosionEffect(targetPos.x, targetPos.y, 'fireball');
                        }

                    } else {
                        // Target was destroyed or removed during projectile travel
                        console.log("Fireball target disappeared during travel time.");
                        // No damage applied, but spell was used. You might set success = true anyway.
                        success = true; // Consider the spell "successful" as it was cast, even if target vanished
                         // Still trigger explosion where it was going
                         if (typeof createExplosionEffect === 'function') {
                            createExplosionEffect(targetPos.x, targetPos.y, 'fireball');
                        }
                    }
                } else {
                    // Initial target validation failed (or originElement wasn't passed)
                    playSfx('error');
                    showFeedback("Invalid Fireball target.", "feedback-error");
                    success = false;
                    // IMPORTANT: Restore spell use if validation failed immediately
                    if (!unlimitedSpellsCheat && !spellUses[spellName]) { // Check if it was set to false
                         spellUses[spellName] = true; // Give it back
                         if (typeof updateSpellUI === 'function') updateSpellUI(); // Update UI
                    }
                }
                break;
case 'flameWave':
    const targetRowFW = target.y; // Use a distinct variable name
    if (!isCellInBounds(0, targetRowFW)) {
        playSfx('error');
        success = false; // Ensure success is false if invalid row
        break;
    }

    const actualDamageFW = getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE);
    playSfx('flameWaveCast');
    if (typeof animateFlameWave === 'function') animateFlameWave(targetRowFW);

    // --- Corrected Loop for Flame Wave ---
    for (let x = 0; x < currentGridCols; x++) {
        // Process each cell in the row independently
        await new Promise(r => setTimeout(r, FLAME_WAVE_STAGGER_DELAY_MS)); // Stagger animation/sound

        const currentX = x;
        const currentY = targetRowFW;

        // Check bounds (safety)
        if (!isCellInBounds(currentX, currentY)) continue;

        let hitSomethingThisCell = false;

        // 1. Check for Enemy Unit
        const unitOnCell = getUnitAt(currentX, currentY);
        if (unitOnCell && isUnitAliveAndValid(unitOnCell) && unitOnCell.team === 'enemy') {
            playSfx('fireballHit'); // Or a specific flame hit sound
            unitOnCell.hp -= actualDamageFW; if (unitOnCell.hp < 0) unitOnCell.hp = 0;

            if (typeof showDamagePopup === 'function') showDamagePopup(unitOnCell.x, unitOnCell.y, actualDamageFW);
            if (typeof flashElementOnHit === 'function') flashElementOnHit(unitOnCell.element);
            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitOnCell);

            if (unitOnCell.hp <= 0) {
                deathPromises.push(removeUnit(unitOnCell)); // Add death promise
            } else if (typeof updateUnitInfoDisplay === 'function') {
                updateUnitInfoDisplay(unitOnCell); // Update info if alive
            }
            hitSomethingThisCell = true;
        }

        // 2. Check for Door
        const obstacleOnCell = getObstacleAt(currentX, currentY);
        const isDoor = obstacleOnCell?.type === 'door';

        if (isDoor && obstacleOnCell.destructible && isObstacleIntact(obstacleOnCell)) {
            playSfx('doorDestroy');
            obstacleOnCell.hp -= actualDamageFW; if (obstacleOnCell.hp < 0) obstacleOnCell.hp = 0;

            if (typeof showDamagePopup === 'function') showDamagePopup(obstacleOnCell.x, obstacleOnCell.y, actualDamageFW);
            if (typeof flashElementOnHit === 'function') flashElementOnHit(obstacleOnCell.element);

            if (obstacleOnCell.hp <= 0) {
                deathPromises.push(removeObstacle(obstacleOnCell)); // Add removal promise
            }
            hitSomethingThisCell = true;
        }

        // If we hit *anything* valid in this cell, mark the spell as successful overall
        if (hitSomethingThisCell) {
            success = true;
        }

        // --- Loop continues to the next cell regardless of obstacles ---
    }
    break;
             case 'frostNova':
                 const centerX = target.x; const centerY = target.y; playSfx('frostNovaCast'); const radiusLevel = getFrostNovaRadiusLevel(); const size = radiusLevel + 2; const radius = Math.floor((size - 1) / 2); const freezeDuration = FROST_NOVA_BASE_DURATION; let unitsFrozenCount = 0;
                 if (typeof animateFrostNova === 'function') animateFrostNova(centerX, centerY, radiusLevel); await new Promise(r => setTimeout(r, 50));
                 for (let dx = -radius; dx <= radius; dx++) { for (let dy = -radius; dy <= radius; dy++) { const targetX = centerX + dx; const targetY = centerY + dy; if (!isCellInBounds(targetX, targetY)){ continue; } const unit = getUnitAt(targetX, targetY); if (unit?.team === 'enemy' && isUnitAliveAndValid(unit) && !unit.isFrozen) { unit.isFrozen = true; unit.frozenTurnsLeft = freezeDuration; unitsFrozenCount++; if (typeof showFreezePopup === 'function') showFreezePopup(unit.x, unit.y); if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit); } } }
                 if (unitsFrozenCount > 0) playSfx('frostNovaHit'); success = true; break;
            case 'heal':
                 if(target?.team === 'player' && isUnitAliveAndValid(target)) {
                     playSfx('heal'); const actualHealAmount = getSpellEffectValue(spellName, HEAL_BASE_AMOUNT); const healApplied = Math.min(actualHealAmount, target.maxHp - target.hp);
                     if (healApplied > 0) { target.hp += healApplied; if (typeof showHealPopup === 'function') showHealPopup(target.x, target.y, healApplied); if (typeof flashElementOnHit === 'function') flashElementOnHit(target.element); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(target); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(target); success = true; }
                     else { if (typeof showFeedback === 'function') showFeedback("Unit already full health.", "feedback-error"); playSfx('error'); }
                 } else { playSfx('error'); showFeedback("Invalid Heal target.", "feedback-error"); } break;
        }
    } catch (e) { console.error(`Error casting spell ${spellName}:`, e); }
    finally { if (success) spellsUsedThisLevel = true; await Promise.all(deathPromises); isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); checkWinLossConditions();
        if (typeof clearSpellHighlights === 'function') {
            clearSpellHighlights();
        }

        isProcessing = false;
        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
        checkWinLossConditions();
    }
    return success;
}

async function throwNet(netterUnit, targetUnit) {
     if (!netterUnit || !targetUnit || !isUnitAliveAndValid(netterUnit) || !isUnitAliveAndValid(targetUnit) || netterUnit.netCooldownTurnsLeft > 0 || netterUnit.isFrozen) return false;
     playSfx('net_throw'); netterUnit.netCooldownTurnsLeft = NET_COOLDOWN;
     let hitVisual = false; if (typeof animateNetThrow === 'function') hitVisual = await animateNetThrow(netterUnit, targetUnit); else hitVisual = true;
     let success = false;
     if (hitVisual) { const stillTarget = units.find(u => u.id === targetUnit.id); if (stillTarget && isUnitAliveAndValid(stillTarget)) { playSfx('net_hit'); stillTarget.isNetted = true; stillTarget.nettedTurnsLeft = NET_DURATION; if (typeof updateUnitVisualState === 'function') updateUnitVisualState(stillTarget); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(stillTarget); success = true; } }
     finishAction(netterUnit); return success;
}

function getValidMoves(unit) {
    if (!unit || !isUnitAliveAndValid(unit)) return [];
    if (!levelClearedAwaitingInput && ((unit.acted && !unit.canMoveAndAttack) || unit.isFrozen || unit.isNetted)) return [];
    const distanceLimit = unit.mov - (unit.isSlowed ? 1 : 0); if (distanceLimit <= 0) return [];
    const moves = []; const queue = [{ x: unit.x, y: unit.y, distance: 0 }]; const visited = new Set([`${unit.x},${unit.y}`]); const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    while (queue.length > 0) {
        const current = queue.shift();
        for (const [dx, dy] of directions) {
            const nextX = current.x + dx; const nextY = current.y + dy; const key = `${nextX},${nextY}`; if (!isCellInBounds(nextX, nextY) || visited.has(key)) continue;
            const newDistance = current.distance + 1; if (newDistance > distanceLimit) continue;
            const obstacle = getObstacleAt(nextX, nextY); const unitOnCell = getUnitAt(nextX, nextY); const isEnterableTower = obstacle?.enterable; const isUnitCurrentlyInTower = !!unit.inTower;
            let isBlocked = false;
            if (unitOnCell && unitOnCell.id !== unit.id) isBlocked = true;
            if (obstacle && obstacle.blocksMove && !isEnterableTower) isBlocked = true;
            if (isEnterableTower) { if (obstacle.occupantUnitId && obstacle.occupantUnitId !== unit.id) isBlocked = true; if (current.y !== nextY + 1) isBlocked = true; }
            if (isUnitCurrentlyInTower) { const startingTower = obstacles.find(o => o.id === unit.inTower); if (startingTower && (nextX !== startingTower.x || nextY !== startingTower.y + 1)) isBlocked = true; }
            if (!isBlocked) { moves.push({ x: nextX, y: nextY }); visited.add(key); queue.push({ x: nextX, y: nextY, distance: newDistance }); }
        }
    } return moves;
}

function getValidAttackTargets(unit) {
    const targets = { units: [], obstacles: [] };
    if (!unit || !isUnitAliveAndValid(unit)) return targets; if (unit.isFrozen) return targets; if (levelClearedAwaitingInput) return targets; if (unit.atk <= 0 && unit.type !== 'goblin_netter') return targets;
    const unitRange = unit.currentRange;
    for (const target of units) {
        if (target.team !== unit.team && isUnitAliveAndValid(target)) {
            let targetPosForCheck = target; let targetIdForList = target.id; let isUnitInTower = false;
            if (target.inTower) { const tower = obstacles.find(o => o.id === target.inTower); if (tower && isObstacleIntact(tower)) { targetPosForCheck = tower; targetIdForList = tower.id; isUnitInTower = true; } else continue; }
            const distance = getDistance(unit, targetPosForCheck);
            if (distance <= unitRange) { if (unitRange === 1 || hasLineOfSight(unit, targetPosForCheck)) { if (isUnitInTower) { if (!targets.obstacles.includes(targetIdForList)) targets.obstacles.push(targetIdForList); } else { if (!targets.units.includes(targetIdForList)) targets.units.push(targetIdForList); } } }
        }
    }
    for (const target of obstacles) {
        if (target.destructible && isObstacleIntact(target)) { if (targets.obstacles.includes(target.id)) continue; const distance = getDistance(unit, target); if (distance <= unitRange) { if (unitRange === 1 || hasLineOfSight(unit, target)) targets.obstacles.push(target.id); } }
    } return targets;
}

function findPathToTarget(unit, targetX, targetY) {
    if (!unit || unit.isFrozen || unit.isNetted || !isUnitAliveAndValid(unit)) return null; if (unit.x === targetX && unit.y === targetY) return [];
    const startNode = { x: unit.x, y: unit.y, g: 0, h: getDistance(unit, {x:targetX, y:targetY}), parent: null };
    const openSet = new Map(); openSet.set(`${startNode.x},${startNode.y}`, startNode); const closedSet = new Set(); const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; const maxSearchNodes = currentGridCols * currentGridRows * 2; let nodesSearched = 0;
    while (openSet.size > 0 && nodesSearched < maxSearchNodes) {
        nodesSearched++; let currentNode = null; let minF = Infinity; for(const node of openSet.values()) { const f = node.g + node.h; if(f < minF) { minF = f; currentNode = node; } } if(!currentNode) break;
        const currentKey = `${currentNode.x},${currentNode.y}`; openSet.delete(currentKey); closedSet.add(currentKey);
        if (currentNode.x === targetX && currentNode.y === targetY) { const path = []; let temp = currentNode; while (temp.parent) { path.push({ x: temp.x, y: temp.y }); temp = temp.parent; } return path.reverse(); }
        for (const [dx, dy] of directions) {
            const nextX = currentNode.x + dx; const nextY = currentNode.y + dy; const key = `${nextX},${nextY}`; if (!isCellInBounds(nextX, nextY) || closedSet.has(key)) continue;
            const obstacle = getObstacleAt(nextX, nextY); const unitOnCell = getUnitAt(nextX, nextY); const isTargetCell = (nextX === targetX && nextY === targetY); const isEnterableTower = obstacle?.enterable;
            const isUnitCurrentlyInTower = currentNode.parent === null ? !!unit.inTower : obstacles.some(o => o.x === currentNode.x && o.y === currentNode.y && o.enterable && o.id === unit.inTower);
            let isWalkable = true; if (unitOnCell && !isTargetCell) isWalkable = false; if (obstacle && obstacle.blocksMove && !isEnterableTower) isWalkable = false; if (isEnterableTower) { if (obstacle.occupantUnitId) isWalkable = false; if (currentNode.y !== nextY + 1) isWalkable = false; }
            if (isUnitCurrentlyInTower) { const startingTower = obstacles.find(o => o.id === unit.inTower); if (startingTower && (nextX !== startingTower.x || nextY !== startingTower.y + 1)) isWalkable = false; }
            if (isWalkable) {
                const gScore = currentNode.g + 1; const hScore = getDistance({x: nextX, y: nextY}, {x: targetX, y: targetY}); const existingNode = openSet.get(key);
                if (!existingNode || gScore < existingNode.g) { const neighbor = { x: nextX, y: nextY, g: gScore, h: hScore, parent: currentNode }; openSet.set(key, neighbor); }
            }
        }
    } if (nodesSearched >= maxSearchNodes) console.warn("A* pathfinding search limit reached."); return null;
}

function processStatusTicks(team) {
    units.forEach(unit => {
        if (unit.team === team && isUnitAliveAndValid(unit)) {
            let changed = false;
            if (unit.isFrozen) { unit.frozenTurnsLeft--; if (unit.frozenTurnsLeft <= 0) { unit.isFrozen = false; changed = true; }}
            if (unit.isNetted) { unit.nettedTurnsLeft--; if (unit.nettedTurnsLeft <= 0) { unit.isNetted = false; changed = true; }}
            if (unit.isSlowed) { unit.slowedTurnsLeft--; if (unit.slowedTurnsLeft <= 0) { unit.isSlowed = false; changed = true; }}
            if (unit.type === 'goblin_netter' && unit.netCooldownTurnsLeft > 0) unit.netCooldownTurnsLeft--;
            if (changed) { if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit); }
        }
    });
}

function endTurn() {
    if (levelClearedAwaitingInput) { if(typeof showLevelCompleteScreen === 'function') { const stats = calculateLevelStats(); playerGold += stats.totalGoldEarned - stats.goldGained; saveGameData(); updateGoldDisplay(); showLevelCompleteScreen(stats); } else { startNextLevel(); } return; }
    if (currentTurn !== 'player' || isProcessing || isGameOver()) return;
    isProcessing = true; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof deselectUnit === 'function') deselectUnit(false);
    currentTurn = 'enemy';
    units.forEach(u => { if (u.team === 'player' && isUnitAliveAndValid(u)) { u.acted = false; if (u.element) u.element.classList.remove('acted'); } });
    processStatusTicks('enemy'); units.forEach(u => { if (u.team === 'enemy' && isUnitAliveAndValid(u)) u.acted = false; });
    triggerGreedPassive();
    if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); setTimeout(runAITurn, 400);
}

function runAITurn() {
     const unitsToAct = units.filter(u => u.team === 'enemy' && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen);
     if (unitsToAct.length === 0) { endAITurnSequence(); return; }
     let currentAIUnitIndex = 0; const baseActionInterval = 150; const minActionDuration = Math.max(MOVE_ANIMATION_DURATION_MS, NET_FLY_DURATION_MS, ARROW_FLY_DURATION_MS) + 50;
     async function processNextAIUnit() {
         if (!isGameActiveFlag || isGameOver()) { endAITurnSequence(); return; } if (currentAIUnitIndex >= unitsToAct.length) { endAITurnSequence(); return; }
         const unitToProcess = unitsToAct[currentAIUnitIndex]; currentAIUnitIndex++;
         const stillValidUnit = units.find(u => u.id === unitToProcess?.id && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen);
         if (stillValidUnit) {
             const actionStartTime = Date.now();
             try { await performAIAction(stillValidUnit); }
             catch (e) { console.error(`Error AI action unit ${stillValidUnit?.id}:`, e); if (isUnitAliveAndValid(stillValidUnit) && !stillValidUnit.acted) { try { finishAction(stillValidUnit); } catch {} } }
             finally { const duration = Date.now() - actionStartTime; const delayNeeded = Math.max(baseActionInterval, minActionDuration - duration); setTimeout(processNextAIUnit, delayNeeded); }
         } else { setTimeout(processNextAIUnit, 30); }
     } setTimeout(processNextAIUnit, 50);
}

function endAITurnSequence() {
     try {
        if (!isGameActiveFlag || isGameOver()) return; currentTurn = 'player'; processStatusTicks('player');
        units.forEach(u => { if (isUnitAliveAndValid(u)) u.acted = false; });
        units.forEach(u => { if (isUnitAliveAndValid(u)) { if (typeof updateUnitVisualState === 'function') updateUnitVisualState(u); } });
        if (typeof showFeedback === 'function') showFeedback("Player Turn!", "feedback-turn"); if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit);
        if (typeof updateWorldHpBars === 'function') updateWorldHpBars();
     } catch (e) { console.error("Error endAITurnSequence:", e); }
     finally { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
}

async function performAIAction(unit) {
    if (!unit || !isUnitAliveAndValid(unit) || unit.acted || unit.isFrozen) { if (unit && !unit.acted) finishAction(unit); return; }
    const livingPlayers = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)); if (livingPlayers.length === 0) { finishAction(unit); return; }
    let bestTarget = null; let minPathDist = Infinity; let bestTargetPath = null; let canAttackDirectly = false;
    for (const player of livingPlayers) {
        let targetPos = player; if (player.inTower) { const tower = obstacles.find(o => o.id === player.inTower); if (tower && isObstacleIntact(tower)) targetPos = tower; else continue; }
        const path = findPathToTarget(unit, targetPos.x, targetPos.y); const directDist = getDistance(unit, targetPos); const pathDist = path ? path.length : Infinity; const effectiveDist = Math.min(directDist, pathDist);
        if (effectiveDist < minPathDist) { minPathDist = effectiveDist; bestTarget = player; bestTargetPath = path; canAttackDirectly = (directDist <= unit.currentRange && hasLineOfSight(unit, targetPos)); }
        else if (effectiveDist === minPathDist && player.hp < (bestTarget?.hp ?? Infinity)) { bestTarget = player; bestTargetPath = path; canAttackDirectly = (directDist <= unit.currentRange && hasLineOfSight(unit, targetPos)); }
    }
    if (!bestTarget) { finishAction(unit); return; }
    let finalTargetObject = bestTarget; if (bestTarget.inTower) { const tower = obstacles.find(o => o.id === bestTarget.inTower); if (tower && isObstacleIntact(tower)) finalTargetObject = tower; else { finishAction(unit); return; } }
    let actionTaken = false;
    if (!actionTaken && unit.type === 'goblin_netter' && unit.netCooldownTurnsLeft <= 0) { if (!bestTarget.isNetted && getDistance(unit, bestTarget) <= unit.currentRange && hasLineOfSight(unit, bestTarget)) actionTaken = await throwNet(unit, bestTarget); }
    if (!actionTaken && unit.atk > 0 && canAttackDirectly) { await attack(unit, finalTargetObject.x, finalTargetObject.y, !unit.canMoveAndAttack); actionTaken = true; if (unit.canMoveAndAttack) unit.acted = true; }
    if (!unit.isNetted && (!actionTaken || (unit.canMoveAndAttack && !unit.acted))) {
        const movementBudget = unit.mov - (unit.isSlowed ? 1 : 0); let chosenMove = null; let canAttackAfterMove = false;
        if (unit.canMoveAndAttack && actionTaken) {
             const availableRetreatMoves = getValidMoves(unit); let maxEscapeDist = -1; let safestMove = null; let maxSafeDist = -1;
             for (const move of availableRetreatMoves) { let isSafe = true; let minDistToPlayer = Infinity; for(const p of livingPlayers) { const distToP = getDistance(move, p); minDistToPlayer = Math.min(minDistToPlayer, distToP); if(distToP <= p.currentRange && hasLineOfSight(move, p)) { isSafe = false; break; } } if (isSafe) { if (minDistToPlayer > maxSafeDist) { maxSafeDist = minDistToPlayer; safestMove = move; } } if (minDistToPlayer > maxEscapeDist && !getUnitAt(move.x, move.y)) { maxEscapeDist = minDistToPlayer; chosenMove = move; } } chosenMove = safestMove || chosenMove;
        } else if (!actionTaken && bestTargetPath && movementBudget > 0) {
             let bestStepIndex = -1;
             for (let i = 0; i < bestTargetPath.length && i < movementBudget; i++) { const step = bestTargetPath[i]; const stepObstacle = getObstacleAt(step.x, step.y); const stepUnit = getUnitAt(step.x, step.y); const isTower = stepObstacle?.enterable; const canStopHere = !stepUnit && (!stepObstacle || (isTower && unit.y === step.y + 1)); if (canStopHere) { bestStepIndex = i; const distToTarget = getDistance(step, finalTargetObject); if (distToTarget <= unit.currentRange && hasLineOfSight(step, finalTargetObject)) { canAttackAfterMove = true; break; } } else { break; } } if (bestStepIndex !== -1) { chosenMove = bestTargetPath[bestStepIndex]; }
        }
        if (chosenMove && (chosenMove.x !== unit.x || chosenMove.y !== unit.y)) {
             const moved = await moveUnit(unit, chosenMove.x, chosenMove.y);
             if(moved) { actionTaken = true; if (!unit.canMoveAndAttack && canAttackAfterMove) { const finalTargetCheck = bestTarget.inTower ? obstacles.find(o => o.id === bestTarget.inTower) : units.find(u => u.id === bestTarget.id); if (finalTargetCheck && (finalTargetCheck.team ? isUnitAliveAndValid(finalTargetCheck) : isObstacleIntact(finalTargetCheck))) { const currentAttackTargetsAfterMove = getValidAttackTargets(unit); const canAttackTargetFinally = (finalTargetCheck.team ? currentAttackTargetsAfterMove.units.includes(finalTargetCheck.id) : currentAttackTargetsAfterMove.obstacles.includes(finalTargetCheck.id)); if(canAttackTargetFinally) await attack(unit, finalTargetCheck.x, finalTargetCheck.y, true); } } }
        }
    }
    if (!unit.acted) finishAction(unit);
}

function triggerGreedPassive(movedUnit = null) {
    if (!playerPassiveUpgrades.gold_magnet) return;

    let collectedItems = new Set();
    let goldCollected = 0;
    let gemsCollected = 0;
    let unitsToCheck = movedUnit ? [movedUnit] : units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));

    unitsToCheck.forEach(unit => {
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1,-1], [-1,1], [1,-1], [1,1]];
        for (const [dx, dy] of directions) {
            const checkX = unit.x + dx; const checkY = unit.y + dy;
            if (!isCellInBounds(checkX, checkY)) continue;

            const itemsOnCell = items.filter(item =>
                item.x === checkX &&
                item.y === checkY &&
                !item.collected &&
                !collectedItems.has(item.id) &&
                (item.type === 'gold' || item.type === 'shiny_gem')
            );

            itemsOnCell.forEach(item => {
                item.collected = true;
                collectedItems.add(item.id);
                goldCollected += item.value;
                if (item.type === 'shiny_gem') gemsCollected++;

                if (typeof animateItemMagnetPull === 'function') {
                    animateItemMagnetPull(item, unit);
                } else if (item.element) {
                    item.element.remove();
                }
            });
        }
    });

    if (goldCollected > 0) {
        playerGold += goldCollected;
        goldCollectedThisLevel += goldCollected;
        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
        let feedbackMsg = `Greed: +${goldCollected}<img src="./sprites/gold.png" class="feedback-gold-icon" alt="G">`;
        if (gemsCollected > 0) feedbackMsg += ` (${gemsCollected} Gem${gemsCollected > 1 ? 's' : ''})`;
        if (typeof showFeedback === 'function') showFeedback(feedbackMsg, 'feedback-gold', 1500);
        playSfx('pickup');
        setTimeout(() => {
            collectedItems.forEach(itemId => {
                 const item = items.find(i => i.id === itemId);
                 if(item) updateCellItemStatus(item.x, item.y);
            });
        }, ITEM_MAGNET_FLY_DURATION_MS + 50);
    }
}

function calculateLevelStats() {
    const initialPlayerUnits = Object.values(activeRosterAtLevelStart).reduce((a, b) => a + b, 0);
    const finalPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)).length;
    const unitsLost = Math.max(0, initialPlayerUnits - finalPlayerUnits);
    let bonusGoldNoSpells = 0; const spellUnlockLevels = { fireball: FIREBALL_UNLOCK_LEVEL, flameWave: FLAME_WAVE_UNLOCK_LEVEL, frostNova: FROST_NOVA_UNLOCK_LEVEL, heal: HEAL_UNLOCK_LEVEL };
    let canUseAny = Object.keys(spellUses).some(spell => { const unlockLevel = spellUnlockLevels[spell]; return unlockLevel !== undefined && currentLevel >= unlockLevel; });
    if (!spellsUsedThisLevel && canUseAny) bonusGoldNoSpells = LEVEL_COMPLETE_BONUS_GOLD.noSpells;
    let bonusGoldFlawless = 0; let bonusGoldNoLosses = 0;
    if (unitsLost === 0 && finalPlayerUnits > 0) {
        const survivingPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));
        const allSurvivingFullHp = survivingPlayerUnits.every(u => u.hp === u.maxHp);
        if (allSurvivingFullHp) bonusGoldFlawless = LEVEL_COMPLETE_BONUS_GOLD.fullHp;
        else bonusGoldNoLosses = LEVEL_COMPLETE_BONUS_GOLD.noLosses;
    }
    const totalBonusGold = bonusGoldNoSpells + bonusGoldFlawless + bonusGoldNoLosses;
    const totalGoldEarnedThisLevel = goldCollectedThisLevel + totalBonusGold;
    return { enemiesKilled: enemiesKilledThisLevel, unitsLost: unitsLost, goldGained: goldCollectedThisLevel, bonusGoldNoSpells: bonusGoldNoSpells, bonusGoldFullHp: bonusGoldFlawless, bonusGoldNoLosses: bonusGoldNoLosses, totalGoldEarned: totalGoldEarnedThisLevel };
}

function checkWinLossConditions() {
    if (!isGameActiveFlag || isGameOver()) {
        return;
    }

    const playersLeft = units.some(u => u.team === 'player' && isUnitAliveAndValid(u));
    if (!playersLeft) {
        if (!isGameOver()) {
            gameOver(false);
        }
        return;
    }

    if (levelClearedAwaitingInput || isProcessing) {
        return;
    }

    const enemiesLeft = units.some(u => u.team === 'enemy' && isUnitAliveAndValid(u));
    if (!enemiesLeft) {
        levelClearedAwaitingInput = true;

        playSfx('levelComplete');

        if (typeof deselectUnit === 'function') deselectUnit(false);
        if (typeof setActiveSpell === 'function') setActiveSpell(null);

        const remainingCollectibles = items.some(item => !item.collected && (item.type !== 'chest' || !item.opened));
        const feedbackMsg = remainingCollectibles ? "Enemies Cleared!<br>Collect items or proceed." : "Level Cleared!";

        if (typeof showFeedback === 'function') showFeedback(feedbackMsg, "feedback-levelup");
        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();

        if (currentLevel >= highestLevelUnlocked) {
            highestLevelUnlocked = Math.min(currentLevel + 1, TOTAL_LEVELS + 1);
        }
        if (typeof saveScoreToLeaderboard === 'function') {
             const finalStatsForLeaderboard = calculateLevelStats();
             const currentGoldBeforeLevel = playerGold;
             const leaderboardGold = currentGoldBeforeLevel + (finalStatsForLeaderboard.totalGoldEarned || 0);
             saveScoreToLeaderboard(currentLevel, leaderboardGold);
        }

        saveGameData();
    }
}

function startNextLevel() {
    if (isGameOver()) return; currentLevel++;
    if (currentLevel > TOTAL_LEVELS) { gameOver(true); return; }
    levelToRestartOnLoss = currentLevel; levelClearedAwaitingInput = false;
    initGame(currentLevel);
}

function forfeitLevel() {
    if (!isGameActiveFlag || isProcessing || isGameOver()) return;
    isGameActiveFlag = false;
    levelClearedAwaitingInput = false;
    isProcessing = true;
    stopMusic();
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = null;
    playSfx('forfeit');

   const startingGoldForLevel = Math.max(0, playerGold - goldCollectedThisLevel);
   const goldLostFromStart = Math.floor(startingGoldForLevel * 0.05);
   const goldLostFromLevel = goldCollectedThisLevel;
   const totalPenalty = goldLostFromStart + goldLostFromLevel;

   const goldBeforePenalty = playerGold;
   playerGold = Math.max(0, startingGoldForLevel - goldLostFromStart);

   let messageText = `Level ${currentLevel} Forfeited!<br>`;
   messageText += `Penalty: Lost ${goldLostFromLevel} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"> (level gain) + ${goldLostFromStart} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"> (5% penalty).<br>`;
   messageText += `Gold: ${goldBeforePenalty} -> ${playerGold}`;

   if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel - 1, playerGold);
   saveGameData();
   if (typeof updateGoldDisplay === 'function') updateGoldDisplay();

   if (typeof deselectUnit === 'function') deselectUnit(false);
   if (typeof setActiveSpell === 'function') setActiveSpell(null);

   if (typeof showGameOverScreen === 'function') showGameOverScreen(false, messageText, true);
}

function gameOver(playerWonGame, customMessage = "", isForfeit = false) {
    if (isGameOver()) return;
    isGameActiveFlag = false;
    levelClearedAwaitingInput = false;
    isProcessing = true;
    stopMusic();
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = null;

    let messageText = customMessage || "";
    let isTrueVictory = playerWonGame;
    let goldLostFromStart = 0;
    let goldLostFromLevel = 0;
    let startingGoldForLevel = 0;

    if (!messageText) {
        if (!isTrueVictory && !isForfeit) {
            playSfx('gameOver');
            startingGoldForLevel = Math.max(0, playerGold - goldCollectedThisLevel);
            goldLostFromStart = Math.floor(startingGoldForLevel * 0.05);
            goldLostFromLevel = goldCollectedThisLevel;

            const goldBeforePenalty = playerGold;
            playerGold = Math.max(0, startingGoldForLevel - goldLostFromStart);

            messageText = `You have fallen on Level ${currentLevel}!<br>`;
            messageText += `Lost ${goldLostFromStart} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline">`;

            if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel - 1, playerGold);

        } else if (isTrueVictory) {
            playSfx('success');
            messageText = `Congratulations! You conquered all ${TOTAL_LEVELS} levels!<br>Final Gold: ${playerGold}`;
            if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(TOTAL_LEVELS, playerGold);
        }
    } else {
        if (!playerWonGame) playSfx('gameOver');
    }

    saveGameData();
    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
    if (typeof deselectUnit === 'function') deselectUnit(false);
    if (typeof setActiveSpell === 'function') setActiveSpell(null);
    if (typeof showGameOverScreen === 'function') showGameOverScreen(isTrueVictory, messageText, isForfeit);
}

function isGameOver() { return typeof isGameOverScreenVisible === 'function' && isGameOverScreenVisible(); }
function isGameActive() { return isGameActiveFlag; }

function purchaseUnit(unitType) {
    const cost = RECRUIT_COSTS[unitType];
    const currentOwnedForType = playerOwnedUnits[unitType] || 0;
    const totalOwnedBefore = Object.values(playerOwnedUnits).reduce((sum, count) => sum + count, 0);

    if (playerGold >= cost && currentOwnedForType < MAX_OWNED_PER_TYPE) {
        playerGold -= cost;
        playerOwnedUnits[unitType] = currentOwnedForType + 1;
        const totalOwnedAfter = totalOwnedBefore + 1;
        const shouldPopup = (totalOwnedBefore <= MAX_ACTIVE_ROSTER_SIZE && totalOwnedAfter > MAX_ACTIVE_ROSTER_SIZE);
        if (getTotalActiveUnits() < MAX_ACTIVE_ROSTER_SIZE && !shouldPopup) {
             addUnitToActiveRoster(unitType);
        }
        saveGameData();
        return { success: true, showTroopsPopup: shouldPopup };
    }
    return { success: false };
}

function purchaseUnitUpgrade(upgradeType) {
    const cost = UNIT_UPGRADE_COSTS[upgradeType]; if (cost === undefined) return false; if (playerGold >= cost) { playerGold -= cost; playerUnitUpgrades[upgradeType] = (playerUnitUpgrades[upgradeType] || 0) + 1; saveGameData(); return true; } return false;
}
function calculateSpellCost(spellName) {
    const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return 99999; const currentLevel = playerSpellUpgrades[spellName] || 0; if(currentLevel >= config.maxLevel) return Infinity; return config.baseCost + (currentLevel * config.costIncrease);
}
function purchaseSpellUpgrade(spellName) {
    const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return false; const currentLevel = playerSpellUpgrades[spellName] || 0; const cost = calculateSpellCost(spellName); const meetsLevelReq = highestLevelUnlocked > config.requiredLevel; if (playerGold >= cost && currentLevel < config.maxLevel && meetsLevelReq) { playerGold -= cost; playerSpellUpgrades[spellName]++; saveGameData(); return true; } return false;
 }
function purchasePassive(passiveId) {
    const cost = PASSIVE_UPGRADE_COSTS[passiveId]; if (cost === undefined || playerPassiveUpgrades[passiveId]) return false; if (playerGold >= cost) { playerGold -= cost; playerPassiveUpgrades[passiveId] = true; saveGameData(); return true; } return false;
}
function getTotalActiveUnits() { if (!playerActiveRoster) return 0; return Object.values(playerActiveRoster).reduce((sum, count) => sum + (parseInt(count, 10) || 0), 0); }
function addUnitToActiveRoster(unitType) {
    const currentOwned = playerOwnedUnits[unitType] || 0; const currentActive = playerActiveRoster[unitType] || 0; const totalActive = getTotalActiveUnits(); if (currentActive < currentOwned && totalActive < MAX_ACTIVE_ROSTER_SIZE) { playerActiveRoster[unitType] = currentActive + 1; saveGameData(); return true; } return false;
}
function removeUnitFromActiveRoster(unitType) {
    const currentActive = playerActiveRoster[unitType] || 0; if (currentActive > 0) { playerActiveRoster[unitType] = currentActive - 1; if (playerActiveRoster[unitType] === 0) delete playerActiveRoster[unitType]; saveGameData(); return true; } return false;
}

function saveGameData() {
    try {
        localStorage.setItem(STORAGE_KEY_LEVEL, highestLevelUnlocked.toString());
        localStorage.setItem(STORAGE_KEY_GOLD, playerGold.toString());
        localStorage.setItem(STORAGE_KEY_OWNED_UNITS, JSON.stringify(playerOwnedUnits));
        localStorage.setItem(STORAGE_KEY_ACTIVE_ROSTER, JSON.stringify(playerActiveRoster));
        localStorage.setItem(STORAGE_KEY_UNIT_UPGRADES, JSON.stringify(playerUnitUpgrades));
        localStorage.setItem(STORAGE_KEY_SPELL_UPGRADES, JSON.stringify(playerSpellUpgrades));
        localStorage.setItem(STORAGE_KEY_PASSIVE_UPGRADES, JSON.stringify(playerPassiveUpgrades));
        localStorage.setItem(STORAGE_KEY_CHEAT_SPELL_ATK, playerCheatSpellAttackBonus.toString());
        saveSettings();
    } catch (e) { console.warn("Could not save game data.", e); }
}

function loadGameData() {
    try {
        highestLevelUnlocked = parseInt(localStorage.getItem(STORAGE_KEY_LEVEL) || '1', 10) || 1;
        playerGold = parseInt(localStorage.getItem(STORAGE_KEY_GOLD) || '0', 10) || 0;
        playerCheatSpellAttackBonus = parseInt(localStorage.getItem(STORAGE_KEY_CHEAT_SPELL_ATK) || '0', 10) || 0;

        const defaultOwnedUnits = { knight: 3, archer: 0, champion: 0 };
        const storedOwnedUnits = localStorage.getItem(STORAGE_KEY_OWNED_UNITS);
        playerOwnedUnits = storedOwnedUnits ? JSON.parse(storedOwnedUnits) : { ...defaultOwnedUnits };
        Object.keys(UNIT_DATA).forEach(key => {
            if (UNIT_DATA[key].team === 'player') {
                 if (!(key in playerOwnedUnits)) playerOwnedUnits[key] = 0;
                 playerOwnedUnits[key] = Math.max(0, Math.min(parseInt(playerOwnedUnits[key] || '0', 10), MAX_OWNED_PER_TYPE));
            }
        });
         if (Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) === 0 && highestLevelUnlocked <= 1) playerOwnedUnits = { ...defaultOwnedUnits };

        const storedActiveRoster = localStorage.getItem(STORAGE_KEY_ACTIVE_ROSTER);
        let loadedRoster = storedActiveRoster ? JSON.parse(storedActiveRoster) : {};
        let totalActive = 0; const validatedRoster = {};
        Object.keys(playerOwnedUnits).forEach(type => {
            const activeCount = Math.min(playerOwnedUnits[type], parseInt(loadedRoster[type] || '0', 10));
            if (activeCount > 0) { validatedRoster[type] = activeCount; totalActive += activeCount; }
        });
        playerActiveRoster = validatedRoster;

        if (totalActive === 0 || totalActive > MAX_ACTIVE_ROSTER_SIZE) {
            playerActiveRoster = {}; let currentTotal = 0;
            const ownedOrder = Object.keys(playerOwnedUnits).sort((a, b) => playerOwnedUnits[b] - playerOwnedUnits[a]);
            for (const type of ownedOrder) {
                const canAdd = Math.min(playerOwnedUnits[type], MAX_ACTIVE_ROSTER_SIZE - currentTotal);
                if (canAdd > 0) { playerActiveRoster[type] = canAdd; currentTotal += canAdd; }
                if (currentTotal >= MAX_ACTIVE_ROSTER_SIZE) break;
            }
             if(currentTotal === 0 && Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) > 0) { const firstOwned = Object.keys(playerOwnedUnits).find(type => playerOwnedUnits[type] > 0); if(firstOwned) playerActiveRoster[firstOwned] = 1; }
        }
         totalActive = getTotalActiveUnits();
         if (totalActive > MAX_ACTIVE_ROSTER_SIZE) {
            let excess = totalActive - MAX_ACTIVE_ROSTER_SIZE; const rosterTypes = Object.keys(playerActiveRoster).sort();
            for (let i = rosterTypes.length - 1; i >= 0 && excess > 0; i--) { const type = rosterTypes[i]; const canRemove = Math.min(excess, playerActiveRoster[type]); playerActiveRoster[type] -= canRemove; excess -= canRemove; if (playerActiveRoster[type] === 0) delete playerActiveRoster[type]; }
        }

        const defaultUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0 };
        const storedUnitUpgrades = localStorage.getItem(STORAGE_KEY_UNIT_UPGRADES);
        playerUnitUpgrades = storedUnitUpgrades ? JSON.parse(storedUnitUpgrades) : { ...defaultUnitUpgrades };
        Object.keys(defaultUnitUpgrades).forEach(key => { if (!(key in playerUnitUpgrades)) playerUnitUpgrades[key] = defaultUnitUpgrades[key]; playerUnitUpgrades[key] = Math.max(0, parseInt(playerUnitUpgrades[key] || '0', 10)); });

        const defaultSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
        const storedSpellUpgrades = localStorage.getItem(STORAGE_KEY_SPELL_UPGRADES);
        playerSpellUpgrades = storedSpellUpgrades ? JSON.parse(storedSpellUpgrades) : { ...defaultSpellUpgrades };
        Object.keys(defaultSpellUpgrades).forEach(key => { if (!(key in playerSpellUpgrades)) playerSpellUpgrades[key] = defaultSpellUpgrades[key]; const maxLvl = SPELL_UPGRADE_CONFIG[key]?.maxLevel ?? 99; playerSpellUpgrades[key] = Math.max(0, Math.min(parseInt(playerSpellUpgrades[key] || '0', 10), maxLvl)); });

        const defaultPassiveUpgrades = { gold_magnet: false };
        const storedPassiveUpgrades = localStorage.getItem(STORAGE_KEY_PASSIVE_UPGRADES);
        playerPassiveUpgrades = storedPassiveUpgrades ? JSON.parse(storedPassiveUpgrades) : { ...defaultPassiveUpgrades };
        Object.keys(defaultPassiveUpgrades).forEach(key => { if (!(key in playerPassiveUpgrades)) playerPassiveUpgrades[key] = defaultPassiveUpgrades[key]; playerPassiveUpgrades[key] = Boolean(playerPassiveUpgrades[key]); });

        highestLevelUnlocked = Math.max(1, Math.min(highestLevelUnlocked, TOTAL_LEVELS + 1));
        playerGold = Math.max(0, playerGold);
        playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus);

        loadSettings();

    } catch (e) {
        console.warn("Could not load game data. Starting fresh.", e);
        highestLevelUnlocked = 1; playerGold = 0;
        playerOwnedUnits = { knight: 3, archer: 0, champion: 0 }; playerActiveRoster = { knight: 3 };
        playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0 };
        playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
        playerPassiveUpgrades = { gold_magnet: false }; playerCheatSpellAttackBonus = 0;
        gameSettings = { showHpBars: false };
        saveSettings();
    }
}

function loadSettings() {
    const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (storedSettings) {
        try {
            const parsedSettings = JSON.parse(storedSettings);
            gameSettings = { ...gameSettings, ...parsedSettings };
        } catch (e) {
            console.warn("Could not parse stored settings.", e);
        }
    }
    if (typeof updateHpBarSettingUI === 'function') {
        updateHpBarSettingUI(gameSettings.showHpBars);
    }
    if (typeof updateWorldHpBarsVisibility === 'function') {
        updateWorldHpBarsVisibility();
    }
}

function saveSettings() {
    try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(gameSettings));
    } catch (e) {
        console.warn("Could not save settings.", e);
    }
}

function updateSetting(key, value) {
    if (gameSettings.hasOwnProperty(key)) {
        gameSettings[key] = value;
        saveSettings();
        if (key === 'showHpBars' && typeof updateWorldHpBarsVisibility === 'function') {
            updateWorldHpBarsVisibility();
        }
    }
}

function applyCheatGold(amount) {
    playerGold += amount; playerGold = Math.max(0, playerGold); saveGameData();
    if(typeof updateGoldDisplay === 'function') updateGoldDisplay();
    if(typeof updateShopDisplay === 'function') updateShopDisplay();
    if(typeof updateChooseTroopsScreen === 'function') updateChooseTroopsScreen();
    playSfx('cheat'); if(typeof showFeedback === 'function') showFeedback(`CHEAT: +${amount} Gold!`, "feedback-cheat");
}
function applyCheatSpellAttack(amount) {
    playerCheatSpellAttackBonus += amount; playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); saveGameData();
    playSfx('cheat'); if(typeof showFeedback === 'function') showFeedback(`CHEAT: Spell ATK +${amount}!`, "feedback-cheat");
    if(typeof updateSpellUI === 'function') updateSpellUI();
}

function toggleWorldHpBarsVisibility() {
    gameSettings.showHpBars = !gameSettings.showHpBars;
    updateSetting('showHpBars', gameSettings.showHpBars);
    if (typeof updateHpBarSettingUI === 'function') {
        updateHpBarSettingUI(gameSettings.showHpBars);
    }
}

window.onerror = function (message, source, lineno, colno, error) {
  console.error("!! Global Error Caught !!");
  console.error("Message:", message); console.error("Source:", source);
  console.error("Line:", lineno, "Col:", colno); console.error("Error Object:", error);
  isProcessing = false;
  if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
  return false;
};