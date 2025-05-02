// gameLogic.js --- Game State Variables ---
let units = [];
let items = [];
let obstacles = [];
let gridState = []; // Stores obstacle types primarily { type: 'rock' / 'door' etc } or null
let selectedUnit = null;
let currentTurn = 'player'; // 'player' or 'enemy'
let validMoves = [];
let validAttacks = { units: [], obstacles: [] }; // Store IDs of attackable targets
let unitCounter = 0; // Simple ID generation
let itemCounter = 0;
let obstacleCounter = 0;
let currentLevel = 1;
let levelToRestartOnLoss = 1;
let currentSpell = null; // e.g., 'fireball'
let spellUses = {}; // { fireball: true, flameWave: false, ... } Tracks if usable this turn
let spellsUnlocked = {}; // { fireball: true, flameWave: true, ... } Tracks permanent unlocks
let spellsUsedThisLevel = false; // Flag for spellbook drop condition
let unlimitedSpellsCheat = false;
let winCheckTimeout = null;
let levelClearedAwaitingInput = false; // Flag set when enemies are cleared, waiting for player action
let isGameActiveFlag = false;
let playerActionsTakenThisLevel = 0; // For forfeit check
let goldCollectedThisLevel = 0; // Tracking for level end stats (visual total including bonuses)
let baseGoldEarnedThisLevel = 0; // Actual gold added from drops/chests only
let enemiesKilledThisLevel = 0;
let unitsLostThisLevel = 0; // Track player unit losses for stats
let highestLevelReached = 1;
let playerGold = 0;
let playerOwnedUnits = { knight: 3, archer: 0, champion: 0, rogue: 0 }; // Include rogue
let playerActiveRoster = {}; // { knight: 2, archer: 1 }
let activeRosterAtLevelStart = {}; // Snapshot for calculating losses
let playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 };
let playerAbilityUpgrades = { rogue_quickstrike: 0 }; // 0 = not bought, 1 = bought
let playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
let playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 };
let playerOwnedArmor = { grey: 1 }; // { armorId: level, ... }, Grey is owned by default level 1
let equippedArmorId = 'grey'; // Start with grey armor
let playerCheatSpellAttackBonus = 0;
let maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE;
let lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN; // Ensure first spawn is possible
let gameSettings = { ...DEFAULT_GAME_SETTINGS }; // Load from storage later
let achievementProgress = {}; // { achievementId: { current: count, unlocked: bool }, ... }
let currentGridCols = BASE_GRID_COLS;
let currentGridRows = BASE_GRID_ROWS;
let currentTerrainInfo = { url: '', variant: 'green', name: 'grass', quadrant: 0 };
let deathSpriteTimeouts = new Map(); // Store timeouts for removing dead sprites
let generatedSpriteUrls = {}; // Stores recolored sprite data URLs { spriteKey: { variant: dataUrl } }
let flameWavePending = {}; // { y: targetRow, casterId: unit.id, damage: X } - Store damage value
let forestArmorActiveTurns = 0; // Turns left for Forest Armor effect
let isProcessing = false;

// --- Utility Functions ---

function isUnitAliveAndValid(unit) {
    // Also check if unit is technically "removed" during an operation
    return unit?.hp > 0 && units.some(u => u.id === unit.id);
}

function isObstacleIntact(obstacle) {
    // Also check if obstacle is technically "removed"
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
    // Prioritize unopened chests, then other items based on Z-index
    const unopenedChest = itemsOnCell.find(item => item.type === 'chest' && !item.opened);
    if (unopenedChest) return unopenedChest;
    itemsOnCell.sort((a, b) => (ITEM_DATA[b.type]?.zIndex || 0) - (ITEM_DATA[a.type]?.zIndex || 0));
    return itemsOnCell[0];
}

function getUnitAt(x, y) {
    return units.find(unit => unit.x === x && unit.y === y && isUnitAliveAndValid(unit));
}

function getUnitsInArea(centerX, centerY, radius) {
    const affectedUnits = [];
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            // Use Manhattan distance for radius check (matches movement/range)
             if (Math.abs(dx) + Math.abs(dy) > radius) continue;

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
    // Manhattan distance
    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

function hasLineOfSight(startUnit, endPos, ignoreStealthOnTarget = false) {
    if (!startUnit || !endPos) return false;
    const startX = startUnit.x; const startY = startUnit.y;
    const endX = endPos.x; const endY = endPos.y;
    if (startX === endX && startY === endY) return true; // Can always see self

    let x = startX; let y = startY;
    const dx = Math.abs(endX - startX); const dy = -Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1; const sy = startY < endY ? 1 : -1;
    let err = dx + dy; let e2;
    let safety = 0; const maxSafety = (currentGridCols + currentGridRows) * 2;

    while (safety < maxSafety) {
        // Check cell *between* start and end
        if (!(x === startX && y === startY) && !(x === endX && y === endY)) {
             const obs = getObstacleAt(x, y);
             if (obs && OBSTACLE_DATA[obs.type]?.blocksLOS && isObstacleIntact(obs)) {
                 return false; // Blocked by obstacle
             }
             // Check for units blocking LOS
             const unit = getUnitAt(x, y);
              if (unit && unit.id !== startUnit.id) { // Ignore self
                   // Stealthed units block LOS for others unless the viewer is adjacent
                   if(unit.isStealthed && getDistance(startUnit, unit) > 1) {
                       return false;
                   }
                    // Regular units block LOS if they are not the target
                    // Note: This is a simplification. May need refinement if shooting over allies is desired.
                   return false;
              }
        }

        if (x === endX && y === endY) break; // Reached target
        e2 = 2 * err;
        let moved = false;
        if (e2 >= dy) { // Move X
            if (x === endX) break;
            err += dy;
            x += sx;
            moved = true;
        }
        if (e2 <= dx) { // Move Y
            if (y === endY) break;
            err += dx;
            y += sy;
            moved = true;
        }
        if (!moved) break; // Should not happen with Bresenham if start != end
        safety++;
    }
    if (safety >= maxSafety) { console.error("LOS safety limit reached!"); return false; }

     // Final check: Can the startUnit see the endPos unit if it's stealthed?
     const endUnit = getUnitAt(endX, endY);
     if(endUnit && endUnit.id !== startUnit.id && endUnit.isStealthed && !ignoreStealthOnTarget && getDistance(startUnit, endUnit) > 1) {
          return false; // Cannot see stealthed unit from distance
     }

    return true; // Reached target without LOS blockers (or target is visible despite stealth)
}


function getRecoloredUrl(baseKey, variant, urlType = 'sprite') {
    const unitData = UNIT_DATA[baseKey];
    let lookupKey = baseKey;
    let defaultUrl = '';

    if (urlType === 'portrait' && unitData) {
        lookupKey = `${baseKey}_portrait`;
        defaultUrl = unitData.portraitUrl || './sprites/error.png';
    } else if (urlType === 'deadSprite' && unitData) {
        const deadSpriteFilenameWithExt = unitData.deadSpriteUrl?.substring(unitData.deadSpriteUrl.lastIndexOf('/') + 1);
        const deadSpriteFilename = deadSpriteFilenameWithExt?.substring(0, deadSpriteFilenameWithExt.lastIndexOf('.'));
        if (deadSpriteFilename) {
            lookupKey = deadSpriteFilename.toLowerCase();
            defaultUrl = unitData.deadSpriteUrl || './sprites/error.png';
        } else {
            defaultUrl = './sprites/error.png';
        }
    } else if (urlType === 'sprite' && unitData) {
        defaultUrl = unitData.spriteUrl || './sprites/error.png';
    } else if (urlType === 'armor') {
        lookupKey = 'armor'; // Use the base armor key
        const armorUrls = generatedSpriteUrls[lookupKey];
        const armorId = baseKey; // For armor, the baseKey IS the armorId ('forest', 'ember', etc.)
        const fallbackIcon = ARMOR_DATA[armorId]?.icon || './sprites/armor.png'; // Default to base armor icon

        if (!armorUrls) {
            // console.warn(`Recolored URLs not found for key: ${lookupKey}. Using fallback: ${fallbackIcon}`);
            return fallbackIcon;
        }

        // Special handling for 'none' and 'grey' which might have dedicated sprites or use the base
        if (armorId === 'none') {
            return ARMOR_DATA['none']?.icon || armorUrls['none'] || armorUrls['grey'] || fallbackIcon; // Prefer dedicated, then recolored, then grey, then fallback
        }
        if (armorId === 'grey') {
             return armorUrls['grey'] || fallbackIcon; // Use stored original/grey
        }

        // For other armors, return the specific recolor, fallback to grey/original if recolor failed
        return armorUrls[armorId] || armorUrls['grey'] || fallbackIcon;
    }
     else {
        // Fallback for unknown types
        defaultUrl = `./sprites/${baseKey}.png`;
    }

    // --- Existing Goblin/Unit Variant Logic ---
    const variantUrls = generatedSpriteUrls[lookupKey];
    if (!variantUrls) {
        // console.warn(`Recolored URLs not found for key: ${lookupKey}. Using default: ${defaultUrl}`);
        return defaultUrl;
    }
    // For goblins, variant is red/blue/yellow. Use 'green' as default.
    return variantUrls[variant] || variantUrls['green'] || defaultUrl;
}


// --- Game Initialization and State Management ---

async function preloadAssetsAndStart() {
    await initializeSpriteRecoloring(); // Wait for recoloring first
    loadGameData(); // Load save data (including settings)
    // Initialize audio based on loaded settings BEFORE showing main menu
    initializeAudio(); // Trigger audio context unlock possibility
    setVolume('music', musicVolume); // Apply loaded/default volume
    setVolume('sfx', sfxVolume); // Apply loaded/default volume
    if(isMuted) toggleMute(false); // Apply mute state without re-saving

    showMainMenu(); // Now show the menu
}

function calculateGridDimensions(level) {
    // Use base level for scaling grid size, avoids massive grids in infinite
    const baseLevel = ((level - 1) % TOTAL_LEVELS_BASE) + 1;
    const levelFactor = Math.floor((baseLevel - 1) / 5); // Increase grid size every 5 base levels
    // Example scaling: +1 col/row every 10 levels, alternating
    currentGridCols = BASE_GRID_COLS + Math.floor(levelFactor / 2) + (levelFactor % 2);
    currentGridRows = BASE_GRID_ROWS + Math.floor(levelFactor / 2);
    // Clamp dimensions to reasonable limits
    currentGridCols = Math.max(BASE_GRID_COLS, Math.min(currentGridCols, 15));
    currentGridRows = Math.max(BASE_GRID_ROWS, Math.min(currentGridRows, 15));
}

function checkSpellUnlock(spellName, unlockLevel) {
    const wasUnlocked = !!spellsUnlocked[spellName];
    // Unlock based on HIGHEST level reached, not current level
    spellsUnlocked[spellName] = highestLevelReached > unlockLevel;
    if (spellsUnlocked[spellName] && !wasUnlocked) {
        // Check if UI is ready before showing feedback
        if (typeof showFeedback === 'function' && typeof playSfx === 'function') {
             const spellDisplayName = SPELL_UPGRADE_CONFIG[spellName]?.name || spellName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
             // Delay feedback slightly to ensure UI is stable after level init
             setTimeout(() => {
                  showFeedback(`Spell Unlocked: ${spellDisplayName}!`, 'feedback-spell-unlock', 3000);
                  playSfx('spellUnlock');
             }, 100); // 100ms delay
        }
         // Update the spell's usability for the current turn if it just got unlocked
         if (spellUses[spellName] !== undefined) {
             spellUses[spellName] = true;
             if (typeof updateSpellUI === 'function') updateSpellUI();
         }
    }
     return spellsUnlocked[spellName]; // Return current unlocked state
}


function resetSpellStateForNewLevel() {
    currentSpell = null;
    spellsUsedThisLevel = false; // Reset flag for spellbook drop

    // Check unlocks based on highest level reached
    checkSpellUnlock('fireball', FIREBALL_UNLOCK_LEVEL);
    checkSpellUnlock('flameWave', FLAME_WAVE_UNLOCK_LEVEL);
    checkSpellUnlock('frostNova', FROST_NOVA_UNLOCK_LEVEL);
    checkSpellUnlock('heal', HEAL_UNLOCK_LEVEL);

    // Reset uses based on unlocked status
    spellUses = {
        fireball: !!spellsUnlocked.fireball,
        flameWave: !!spellsUnlocked.flameWave,
        frostNova: !!spellsUnlocked.frostNova,
        heal: !!spellsUnlocked.heal
    };

    // Apply cheat if active
    if (unlimitedSpellsCheat) {
        Object.keys(spellUses).forEach(key => {
            if (spellsUnlocked[key]) { // Only make unlocked spells unlimited
                spellUses[key] = true;
            }
        });
    }

    if (typeof updateSpellUI === 'function') updateSpellUI();
}


function clearLevelItemsAndObstacles() {
    items.forEach(item => item.element?.remove());
    items = [];
    obstacles.forEach(obs => obs.element?.remove());
    obstacles = [];
    clearTimeoutMap(deathSpriteTimeouts); // Clear any pending death fade timeouts
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
    // isProcessing = false; // Let initGame handle setting/unsetting processing flag
    unitCounter = 0;
    itemCounter = 0;
    obstacleCounter = 0;
    playerActionsTakenThisLevel = 0;
    goldCollectedThisLevel = 0;
    baseGoldEarnedThisLevel = 0;
    enemiesKilledThisLevel = 0;
    unitsLostThisLevel = 0; // Reset unit loss counter
    flameWavePending = {};
    forestArmorActiveTurns = 0; // Reset armor effect

    // Clear world HP bars if setting is off or reset needed
    if (gameSettings.showHpBars && typeof updateWorldHpBarsVisibility === 'function') {
        updateWorldHpBarsVisibility(); // Re-create bars based on setting
    } else if (typeof clearAllWorldHpBars === 'function') {
         clearAllWorldHpBars();
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
    // Don't reset gold, highest level, upgrades, settings etc. here.
    // This function is mainly for going back to the main menu.
    // loadGameData() handles loading the persistent state.
    saveSettings(); // Save just in case settings changed before reset
}

function initGame(startLevel = 1) {
    isGameActiveFlag = true;
    // isProcessing = true; // Set processing at the start
    loadGameData(); // Load latest data, including settings and progress
    currentLevel = startLevel;
    levelToRestartOnLoss = currentLevel;
    activeRosterAtLevelStart = { ...playerActiveRoster }; // Snapshot roster
    calculateGridDimensions(currentLevel);
    resetLevelState(); // Clears units, items, obstacles, etc.
    resetSpellStateForNewLevel(); // Resets spell uses based on unlocks

    try {
        if (typeof calculateCellSize === 'function') calculateCellSize();
        currentTerrainInfo = getTilesetForLevel(currentLevel);
        if (typeof setupBoard === 'function') setupBoard(currentTerrainInfo.url);
        if (typeof updateUiForNewLevel === 'function') updateUiForNewLevel(); // Update level display etc.

        initializeGridState();
        spawnObstacles(); // Place rocks, walls, maybe doors/towers/snowmen
        spawnInitialUnits(); // Place player units based on active roster
        applyArmorBonuses(); // Apply bonuses from equipped armor AFTER units are created
        spawnEnemies(); // Spawn enemies based on level and world pool
        spawnItems(); // Place chests

        // Reset unit states for the new level
        units.forEach(u => {
            u.acted = false;
            u.actionsTakenThisTurn = 0; // Reset action counter
            u.isFrozen = false; u.frozenTurnsLeft = 0;
            u.isNetted = false; u.nettedTurnsLeft = 0;
            u.isSlowed = false; u.slowedTurnsLeft = 0;
            u.isStealthed = false; // Reset stealth
            u.quickStrikeActive = false; // Reset quick strike visual/flag
            u.stealthAttackBonusUsed = false; // Reset stealth bonus use flag
            u.netCooldownTurnsLeft = u.netCooldownTurnsLeft > 0 ? u.netCooldownTurnsLeft -1 : 0; // Tick down existing cooldowns? Or reset completely? Resetting for now.
            u.totemCooldown = u.totemCooldown > 0 ? u.totemCooldown -1 : 0;
            u.flameWaveCooldown = u.flameWaveCooldown > 0 ? u.flameWaveCooldown -1 : 0;
            u.inTower = null;
            u.currentRange = u.baseRange; // Reset range (tower bonus applied on entry)
        });

        if (typeof renderAll === 'function') renderAll(); // Create DOM elements
        if (typeof createAllWorldHpBars === 'function') createAllWorldHpBars(); // Create HP bars if needed
        if (typeof applyLayout === 'function') applyLayout(); // Position everything
        if (typeof centerView === 'function') centerView(true); // Center the view

        playSfx('startBeep');
        selectAndLoadMusic();
        startMusicIfNotPlaying();

    } catch (initError) {
        console.error("Error during game initialization:", initError);
        isGameActiveFlag = false;
        // Consider showing an error message to the player
    } finally {
        // isProcessing = false; // Allow interactions now - moved this out, seems better handled per action
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
    // Ensure obstacle area doesn't overlap player/enemy spawn rows directly
    const validSpawnMinY = enemySpawnHeight;
    const validSpawnMaxY = currentGridRows - playerSpawnHeight - 1;

    let spawnedCount = 0;
    let towersSpawned = 0;
    let snowmenSpawned = 0;
    const occupied = new Set(); // Keep track of cells used by obstacles

    if (!gridState || gridState.length !== currentGridRows || gridState[0].length !== currentGridCols) {
        initializeGridState();
    }

    const tryPlaceObstacle = (type, x, y, isVertical = false) => {
        if (!isCellInBounds(x, y) || occupied.has(`${x},${y}`) || gridState[y]?.[x]) {
             return null; // Cell invalid or already occupied
        }
        const obs = createObstacle(type, x, y);
        if (obs) {
             obs.isVertical = isVertical;
             occupied.add(`${x},${y}`);
             gridState[y][x] = { type: type }; // Mark grid state
             return obs;
        }
        return null;
    };

    // Collect all valid spawn locations first
    let spawnPool = [];
    if (validSpawnMinY <= validSpawnMaxY) { // Check if valid spawn area exists
         for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) {
             for (let x = 0; x < currentGridCols; x++) {
                 if (isCellInBounds(x, y)) {
                     spawnPool.push({ x, y });
                 }
             }
         }
         spawnPool.sort(() => 0.5 - Math.random()); // Shuffle pool
    } else {
         console.warn("No valid Y range for obstacle spawning.");
         return; // Cannot spawn obstacles if no valid area
    }


    // 1. Spawn Snowmen (if in Snow World)
    if (currentLevel >= SNOWMAN_INTRO_LEVEL && currentTerrainInfo.name === 'snow') {
        let snowmenToTry = spawnPool.filter(pos => Math.random() < SNOWMAN_SPAWN_CHANCE_IN_SNOW).length;
        snowmenToTry = Math.min(snowmenToTry, SNOWMAN_MAX_PER_LEVEL);
        let placedCount = 0;
        for (let i = 0; i < spawnPool.length && placedCount < snowmenToTry; i++) {
             const pos = spawnPool[i];
             if(tryPlaceObstacle('snowman', pos.x, pos.y)) {
                  placedCount++;
                  spawnedCount++;
                  // Remove from pool so other obstacles don't overwrite
                  spawnPool.splice(i, 1);
                  i--; // Adjust index after removal
             }
        }
        snowmenSpawned = placedCount;
    }


    // 2. Spawn Tower (optional)
    const towerChance = TOWER_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE * 2);
    if (Math.random() < towerChance) {
         let placedTower = false;
          for (let i = 0; i < spawnPool.length && !placedTower && towersSpawned < MAX_TOWERS_PER_LEVEL; i++) {
               const pos = spawnPool[i];
               if (tryPlaceObstacle('tower', pos.x, pos.y)) {
                    towersSpawned++;
                    spawnedCount++;
                    spawnPool.splice(i, 1);
                    i--;
                    placedTower = true;
               }
          }
    }


    // 3. Spawn Doors (optional) - Only in Castle/Wasteland?
    const allowDoors = currentTerrainInfo.name === 'castle' || currentTerrainInfo.name === 'wasteland';
    if(allowDoors) {
         let doorsToPlace = spawnPool.filter(pos => Math.random() < DOOR_CHANCE).length;
         doorsToPlace = Math.min(doorsToPlace, Math.floor(numObstacles * 0.2)); // Limit door count further
         let placedDoors = 0;
          for (let i = 0; i < spawnPool.length && placedDoors < doorsToPlace; i++) {
              const pos = spawnPool[i];
              // Try placing horizontally or vertically
              const isVertical = Math.random() < 0.5;
              if (tryPlaceObstacle('door', pos.x, pos.y, isVertical)) {
                  placedDoors++;
                  spawnedCount++;
                  spawnPool.splice(i, 1);
                  i--;
              }
          }
    }


    // 4. Spawn remaining obstacles (Rocks/Walls)
    let attempts = 0;
    const maxAttempts = (numObstacles - spawnedCount) * 10; // More attempts for remaining
    while (spawnedCount < numObstacles && attempts < maxAttempts && spawnPool.length > 0) {
        attempts++;
        const posIndex = Math.floor(Math.random() * spawnPool.length);
        const pos = spawnPool.splice(posIndex, 1)[0]; // Take from shuffled pool
        if (!occupied.has(`${pos.x},${pos.y}`) && !gridState[pos.y]?.[pos.x]) {
            const type = Math.random() < WALL_ROCK_CHANCE ? 'wall_rock' : 'rock';
            if (tryPlaceObstacle(type, pos.x, pos.y)) {
                spawnedCount++;
            }
        }
    }
}


function spawnInitialUnits() {
    const playerSpawnMinY = currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);
    let playerPositions = [];

    // Collect valid spawn positions
    for (let y = currentGridRows - 1; y >= playerSpawnMinY; y--) {
        for (let x = 0; x < currentGridCols; x++) {
            if (isCellInBounds(x, y) && gridState[y]?.[x] === null && !getUnitAt(x, y) && !getObstacleAt(x,y)) {
                playerPositions.push({ x, y });
            }
        }
    }

    // Shuffle positions
    const shuffledPlayerPositions = [...playerPositions].sort(() => 0.5 - Math.random());
    let posIndex = 0;

    // Place units from the active roster
    const rosterOrder = Object.keys(playerActiveRoster).sort(); // Consistent placement order
    for (const unitType of rosterOrder) {
        const count = playerActiveRoster[unitType] || 0;
        for (let i = 0; i < count && posIndex < shuffledPlayerPositions.length; i++) {
            const pos = shuffledPlayerPositions[posIndex++];
            if (pos) {
                createUnit(unitType, pos.x, pos.y); // Creates unit and adds to units array
            } else {
                console.warn(`Ran out of spawn positions placing active roster: ${unitType}`);
                break; // Stop placing this type if no more spots
            }
        }
        if (posIndex >= shuffledPlayerPositions.length) break; // Stop if all spots filled
    }

    // Check if any units were placed
    if (units.filter(u => u.team === 'player').length === 0) {
        const totalOwned = Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0);
        if (totalOwned > 0) {
             // Has units but none in roster or couldn't place?
             gameOver(false, "Error: No units placed from roster. Check 'Choose Troops'.");
        } else {
            gameOver(false, "No units available to start the level!");
        }
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

    // Determine spawn area (top rows, avoiding player start area)
    const enemySpawnMaxY = Math.min(
        Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT) - 1,
        currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT) - 1 - MIN_ENEMY_PLAYER_START_DISTANCE
    );

    // Calculate number of enemies based on level progression
    const numEnemiesBase = 3 + Math.floor(currentLevel / 2.5);
    const numEnemies = Math.min(numEnemiesBase, Math.floor(currentGridCols * (enemySpawnMaxY + 1) * 0.4)); // Limit density

    // Determine World and Enemy Pool
    const worldInfo = getTilesetForLevel(currentLevel);
    const worldName = worldInfo.name;
    const poolNameForLevel = currentLevel >= INFINITE_LEVEL_START ? 'infinite' : worldName;
    const effectivePool = WORLD_ENEMY_POOL[poolNameForLevel] || WORLD_ENEMY_POOL.infinite; // Fallback to infinite pool

    const unitsToSpawnTypes = [];
    const isJuggernautLevel = (currentLevel >= JUGGERNAUT_INTRO_LEVEL && currentLevel % JUGGERNAUT_SPAWN_LEVEL_MULTIPLE === 0);
    let spawnTreasureHunter = false;
     if (currentLevel >= GOBLIN_TREASURE_HUNTER_INTRO_LEVEL &&
        (currentLevel - lastTreasureHunterLevel) >= TREASURE_HUNTER_SPAWN_COOLDOWN &&
        Math.random() < TREASURE_HUNTER_SPAWN_CHANCE)
     {
        spawnTreasureHunter = true;
        lastTreasureHunterLevel = currentLevel;
        saveGameData(); // Save the updated last spawn level immediately
     }


    // Boss logic
    if (isJuggernautLevel && effectivePool.boss?.length > 0) {
        unitsToSpawnTypes.push(effectivePool.boss[Math.floor(Math.random() * effectivePool.boss.length)]);
    }

    // Treasure Hunter logic
    if (spawnTreasureHunter) {
        unitsToSpawnTypes.push('goblin_treasure_hunter');
    }

    // Fill remaining slots based on pool weights
    const remainingCount = numEnemies - unitsToSpawnTypes.length;
    if (remainingCount > 0) {
        const weightedPool = [];
        // Add common units multiple times for higher chance
        (effectivePool.common || []).forEach(type => weightedPool.push(type, type, type));
        (effectivePool.uncommon || []).forEach(type => weightedPool.push(type, type));
        (effectivePool.rare || []).forEach(type => weightedPool.push(type));

        // Ensure pool isn't empty if config is missing types
        if (weightedPool.length === 0) weightedPool.push('goblin');

        for (let i = 0; i < remainingCount; i++) {
            unitsToSpawnTypes.push(weightedPool[Math.floor(Math.random() * weightedPool.length)]);
        }
    }

    // Find valid spawn positions
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
    spawnPoolPositions.sort(() => 0.5 - Math.random()); // Shuffle spawn positions

    // Spawn the units
    for (const typeToSpawn of unitsToSpawnTypes) {
        if (spawnPoolPositions.length === 0) break; // No more valid spots
        const pos = spawnPoolPositions.pop();
        const variant = typeToSpawn === 'goblin_treasure_hunter'
            ? GOBLIN_TREASURE_HUNTER_VARIANT
            : (TILESET_GOBLIN_VARIANT_MAP[worldInfo.name] || 'green');
        const isElite = !UNIT_DATA[typeToSpawn]?.isBoss && // Bosses can't be elite
                        typeToSpawn !== 'goblin_treasure_hunter' && // Treasure hunter can't be elite
                        currentLevel >= ELITE_ENEMY_START_LEVEL &&
                        Math.random() < ELITE_ENEMY_CHANCE;

        const newUnit = createUnit(typeToSpawn, pos.x, pos.y, variant, isElite, infiniteHpBonus, infiniteAtkBonus);
        if (newUnit) {
            occupied.add(`${pos.x},${pos.y}`); // Mark cell as occupied for next spawn checks
        }
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

    // Define valid spawn area for items (usually mid-board, not player/enemy zones)
    const enemySpawnAreaHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT);
    const playerSpawnAreaHeight = Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);
    const validSpawnMinY = enemySpawnAreaHeight;
    const validSpawnMaxY = currentGridRows - playerSpawnAreaHeight - 1;
    if (validSpawnMinY > validSpawnMaxY) return; // No valid space

    // Find available cells in the valid area
    const spawnPool = [];
    for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) {
        for (let x = 0; x < currentGridCols; x++) {
            if (isCellInBounds(x, y) && !occupiedSet.has(`${x},${y}`) && !getObstacleAt(x, y)) {
                spawnPool.push({ x, y });
            }
        }
    }

    // Spawn chests in random valid locations
    spawnPool.sort(() => 0.5 - Math.random());
    for (let i = 0; i < chestsToTry && spawnPool.length > 0; i++) {
        const pos = spawnPool.pop();
        createItem('chest', pos.x, pos.y);
        occupiedSet.add(`${pos.x},${pos.y}`); // Mark cell as occupied
    }
}

// --- Entity Creation ---
function createUnit(type, x, y, variantType = 'green', isElite = false, infiniteHpBonus = 0, infiniteAtkBonus = 0) {
    const data = UNIT_DATA[type];
    if (!data) { console.error(`Invalid unit type: ${type}`); return null; }

    const unit = {
        id: `${data.id_prefix}${unitCounter++}`, type, x, y,
        baseHp: data.baseHp, baseAtk: data.baseAtk, baseMov: data.mov, baseRange: data.range,
        name: data.name, knockback: data.knockback || false, cleaveDamage: data.cleaveDamage || 0,
        team: data.team, acted: false, actionsTakenThisTurn: 0, armor_type: 'grey',
        element: null, // DOM element ref
        // Status Effects
        isFrozen: false, frozenTurnsLeft: 0,
        isNetted: false, nettedTurnsLeft: 0,
        isSlowed: false, slowedTurnsLeft: 0,
        isStealthed: false, // NEW
        quickStrikeActive: false, // NEW - Visual/logic flag, enabled by ability purchase
        // Unit Specific Flags/Data
        variantType: null,
        canMoveAndAttack: false, // Specific enemy flag (e.g., yellow goblins)
        inflictsSlow: false, // Specific enemy flag (e.g., blue goblins)
        isElite: false,
        inTower: null, // ID of tower obstacle if inside
        currentRange: data.range, // Effective range (modified by tower/status?)
        isTotem: data.isTotem || false,
        canSummonTotem: data.canSummonTotem || false, totemCooldown: 0, totemType: data.totemType || null,
        canNet: data.canNet || false, netCooldownTurnsLeft: 0,
        suicideExplode: data.suicideExplode || false, explodeOnDeath: data.explodeOnDeath || false,
        explosionDamage: data.explosionDamage || 0, explosionRadius: data.explosionRadius || 0,
        shootsProjectileType: data.shootsProjectileType || 'none', // NEW: arrow, fireball, none
        meleeOnlyAttack: data.meleeOnlyAttack || false, // NEW: Cannot attack non-adjacent even if range > 1
        canCastFlameWave: data.canCastFlameWave || false,
        fireballDamage: data.fireballDamage || 0, // For pyro
        flameWaveDamage: data.flameWaveDamage || 0, flameWaveCooldown: 0, // Cooldown tracker
        immuneToFire: false, // For variants/armor
        immuneToFrost: false, // For variants/armor
        isTreasureHunter: data.isTreasureHunter || false,
        flees: data.flees || false, // For AI
        canStealth: data.canStealth || false, // NEW Rogue flag
        canQuickStrike: false, // NEW Rogue base flag (upgraded via purchase)
        stealthAttackBonusUsed: false, // Track if bonus was used this stealth
        isBoss: data.isBoss || false,
        dropsArmor: data.dropsArmor || false,
        armor_type: data.armor_type || 'grey', // Default armor visual key for player units
    };

    // Get correct sprite URL based on variant (or default)
    unit.spriteUrl = getRecoloredUrl(type, variantType, 'sprite');
    unit.deadSpriteUrl = getRecoloredUrl(type, variantType, 'deadSprite'); // Use base dead sprite for recolor
    unit.portraitUrl = getRecoloredUrl(type, variantType, 'portrait');

    // Apply base stats and upgrades/bonuses
    unit.maxHp = unit.baseHp;
    unit.atk = unit.baseAtk;
    unit.mov = unit.baseMov; // Base movement stored separately

    if (unit.team === 'player') {
        // Apply player upgrades
        const hpUpgradeKey = `${type}_hp`;
        const atkUpgradeKey = `${type}_atk`;
        unit.maxHp += playerUnitUpgrades[hpUpgradeKey] || 0;
        unit.atk += playerUnitUpgrades[atkUpgradeKey] || 0;
        // Check for purchasable abilities
        if (type === 'rogue' && playerAbilityUpgrades.rogue_quickstrike > 0) {
            unit.canQuickStrike = true;
        }
        // Armor bonuses applied later in applyArmorBonuses

    } else if (unit.team === 'enemy' && !unit.isTotem) {
        // Apply enemy variant bonuses
        let prefix = '';
        unit.variantType = variantType || 'green';
        if (variantType === 'red') {
            prefix = 'Ember ';
            unit.atk += GOBLIN_RED_ATK_BONUS;
            if (unit.type === 'orc_juggernaut') unit.atk++; // Extra boss bonus
            if (currentLevel >= IMMUNITY_LEVEL_START) unit.immuneToFire = true;
        } else if (variantType === 'blue') {
            prefix = 'Azure ';
            unit.maxHp += GOBLIN_BLUE_HP_BONUS;
            unit.inflictsSlow = true;
            if (unit.type === 'orc_juggernaut') unit.maxHp += 2;
            if (currentLevel >= IMMUNITY_LEVEL_START) unit.immuneToFrost = true;
        } else if (variantType === 'yellow') {
            prefix = 'Sand ';
            unit.mov += GOBLIN_YELLOW_MOV_BONUS;
            if (GOBLIN_YELLOW_DOUBLE_TURN && unit.type !== 'orc_juggernaut') {
                unit.canMoveAndAttack = true; // Allows move AND attack in one turn
            }
        }
        // Apply elite bonus
        if (isElite) {
            unit.isElite = true;
            unit.maxHp += ELITE_STAT_BONUS.hp;
            unit.atk += ELITE_STAT_BONUS.atk;
            prefix = `Elite ${prefix}`;
        }
        // Apply infinite scaling
        unit.maxHp += infiniteHpBonus;
        unit.atk += infiniteAtkBonus;

        // Update name with prefix
        if (prefix) {
            if (unit.name.includes('Goblin')) unit.name = unit.name.replace(/Goblin/i, `${prefix}Goblin`);
            else if (unit.name.includes('Orc')) unit.name = unit.name.replace(/Orc/i, `${prefix}Orc`);
            else unit.name = `${prefix}${unit.name}`;
        }
    }

    unit.hp = unit.maxHp; // Set current HP to max
    units.push(unit);
    return unit;
}

function updateUnitSpriteForArmor(unit) {
    if (!unit || unit.team !== 'player' || !unit.element) return;

    // Player units use their base type + armor type for sprite
    // Goblins still use variantType for their recolor
    const spriteVariant = unit.armor_type || 'grey'; // Fallback to grey if undefined
    const spriteBaseKey = unit.type; // e.g., 'knight', 'archer'

    // Fetch the correct base sprite URL for the unit type first
    let baseSpritePath = UNIT_DATA[spriteBaseKey]?.spriteUrl;
    if (!baseSpritePath) {
         console.warn(`Base sprite URL missing for unit type: ${spriteBaseKey}`);
         baseSpritePath = './sprites/error.png'; // Fallback
    }
    unit.spriteUrl = baseSpritePath;
    if (unit.element.style.backgroundImage !== `url('${unit.spriteUrl}')`) {
        unit.element.style.backgroundImage = `url('${unit.spriteUrl}')`;
    }
}

function applyArmorBonuses() {
    const armorData = ARMOR_DATA[equippedArmorId];
    if (!armorData) {
        console.error(`Equipped armor ID "${equippedArmorId}" not found in ARMOR_DATA.`);
        return;
    }

    units.forEach(unit => {
        if (unit.team === 'player' && isUnitAliveAndValid(unit)) {
            const baseUnitData = UNIT_DATA[unit.type];
            if (!baseUnitData) return; // Skip if unit type data is missing

            // Reset to base + upgrades first
            unit.maxHp = (baseUnitData.baseHp || 1) + (playerUnitUpgrades[`${unit.type}_hp`] || 0);
            unit.atk = (baseUnitData.baseAtk || 0) + (playerUnitUpgrades[`${unit.type}_atk`] || 0);
            unit.mov = (baseUnitData.mov || 1); // Reset base movement

            // Apply armor bonuses
            if (armorData.hpBonus === -99) { // Special case for 'No Armor'
                unit.maxHp = 1;
            } else {
                 unit.maxHp += armorData.hpBonus || 0;
            }
             unit.maxHp = Math.max(1, unit.maxHp); // Ensure HP is at least 1
             unit.hp = Math.min(unit.hp, unit.maxHp); // Clamp current HP to new max

            unit.atk += armorData.atkBonus || 0;
             unit.atk = Math.max(0, unit.atk); // Ensure ATK isn't negative

            unit.mov += armorData.movBonus || 0;
             unit.mov = Math.max(1, unit.mov); // Ensure MOV is at least 1
             unit.baseMov = unit.mov; // Update baseMov to reflect armor change for display/calcs

             // Apply resistances (only if armor level is sufficient)
             const armorLevel = playerOwnedArmor[equippedArmorId] || 0;
             unit.immuneToFire = (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (armorData.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE);
             unit.immuneToFrost = (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (armorData.resistances?.frost ?? 0) >= ARMOR_RESISTANCE_VALUE);

             // Update armor visual key for the unit
             unit.armor_type = equippedArmorId;
             updateUnitSpriteForArmor(unit); // <--- NEW: Update the visual sprite

            // Update UI immediately if the unit info panel is showing this unit
            if(selectedUnit && selectedUnit.id === unit.id && typeof updateUnitInfo === 'function') {
                 updateUnitInfo(unit);
            }
            if (typeof updateWorldHpBar === 'function') {
                 updateWorldHpBar(unit);
            }
        }
    });
}

function equipArmor(armorId) {
    if (!ARMOR_DATA[armorId]) return false; // Invalid armor
    const ownedLevel = playerOwnedArmor[armorId] || 0;
    // Allow equipping grey or none always, others only if owned
    if (ownedLevel > 0 || armorId === 'grey' || armorId === 'none') {
         equippedArmorId = armorId;
         applyArmorBonuses(); // Re-apply stats AND update visuals for all player units
         saveGameData();
         // Update shop immediately to reflect equipped status
          if (typeof updateShopDisplay === 'function') updateShopDisplay();
          if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit); // Refresh info panel if unit selected
         return true;
    }
    return false; // Not owned
}

// Add getRecoloredUrl if it wasn't already present from previous steps
function getRecoloredUrl(baseKey, variant, urlType = 'sprite') {
   const unitData = UNIT_DATA[baseKey];
   let lookupKey = baseKey;
   let defaultUrl = '';

   if (urlType === 'portrait' && unitData) {
       lookupKey = `${baseKey}_portrait`;
       defaultUrl = unitData.portraitUrl || './sprites/error.png';
   } else if (urlType === 'deadSprite' && unitData) {
       const deadSpriteFilenameWithExt = unitData.deadSpriteUrl?.substring(unitData.deadSpriteUrl.lastIndexOf('/') + 1);
       const deadSpriteFilename = deadSpriteFilenameWithExt?.substring(0, deadSpriteFilenameWithExt.lastIndexOf('.'));
       if (deadSpriteFilename) {
           lookupKey = deadSpriteFilename.toLowerCase();
           defaultUrl = unitData.deadSpriteUrl || './sprites/error.png';
       } else {
           defaultUrl = './sprites/error.png';
       }
   } else if (urlType === 'sprite' && unitData) {
        // For regular unit sprites, use their base sprite URL directly now
        // Armor effect will be handled differently (e.g., CSS or conceptual)
        return unitData.spriteUrl || './sprites/error.png';
   } else if (urlType === 'armor') {
       lookupKey = 'armor'; // Use the base armor key for icons
       const armorUrls = generatedSpriteUrls[lookupKey];
       const armorId = baseKey; // For armor icons, baseKey IS the armorId
       const fallbackIcon = ARMOR_DATA[armorId]?.icon || './sprites/armor.png';

       if (!armorUrls) {
           return fallbackIcon;
       }
       // Special handling for 'none' and 'grey' icons
       if (armorId === 'none') {
            // Use specific icon if defined, else try generated, grey, or fallback
           return ARMOR_DATA['none']?.icon || armorUrls['none'] || armorUrls['grey'] || fallbackIcon;
       }
       if (armorId === 'grey') {
            return armorUrls['grey'] || fallbackIcon; // Use stored original/grey for the icon
       }
       // For other armor icons, return the specific recolor
       return armorUrls[armorId] || armorUrls['grey'] || fallbackIcon;
   }
    else {
       // Fallback for unknown types
       defaultUrl = `./sprites/${baseKey}.png`;
   }

   // --- Goblin/Unit Variant Logic (for portraits/dead sprites) ---
   const variantUrls = generatedSpriteUrls[lookupKey];
   if (!variantUrls) {
       return defaultUrl;
   }
   // For goblins, variant is red/blue/yellow. Use 'green' as default.
   return variantUrls[variant] || variantUrls['green'] || defaultUrl;
}

function createObstacle(type, x, y) {
    const data = OBSTACLE_DATA[type];
    if (!data) return null;

    const obstacle = {
        id: `obs${obstacleCounter++}`,
        type, x, y,
        hp: data.hp, maxHp: data.hp,
        blocksMove: data.blocksMove,
        blocksLOS: data.blocksLOS,
        destructible: data.destructible,
        canBeAttacked: data.canBeAttacked || data.destructible, // Destructible obstacles are attackable
        enterable: data.enterable || false,
        rangeBonus: data.rangeBonus || 0,
        element: null,
        occupantUnitId: null, // ID of unit inside (for towers)
        isVertical: false, // For doors
        hidesUnit: data.hidesUnit || false, // For snowmen
        hiddenUnitType: data.hiddenUnitType || null,
        hiddenUnitVariant: data.hiddenUnitVariant || null,
        revealed: false, // For snowmen
        clickable: data.clickable || false // For snowmen interaction
    };
    obstacles.push(obstacle);
    gridState[y][x] = { type: type }; // Mark grid
    return obstacle;
}

function createItem(type, x, y, stackIndex = 0) {
    const data = ITEM_DATA[type];
    if (!data) return null;

    const item = {
        id: `item${itemCounter++}`, type, x, y,
        element: null, stackIndex,
        opened: false, // For chests
        collected: false,
        value: data.value || 0, // Base value for gold, potions, spellbooks
        armorId: null, // Specific for armor drops
    };

    // Specific item type initializations
    if (type === 'chest') {
        item.baseGoldAmount = data.baseGoldAmount;
        // Calculate potential bonus item chances based on level
        item.potionChance = Math.min(POTION_DROP_CHANCE_CHEST_MAX, POTION_DROP_CHANCE_CHEST_BASE + POTION_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1));
        item.gemChance = Math.min(GEM_DROP_CHANCE_CHEST_MAX, GEM_DROP_CHANCE_CHEST_BASE + GEM_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1));
        item.spellbookChance = SPELLBOOK_REQUIRED_SPELL_USE && spellsUsedThisLevel ? SPELLBOOK_DROP_CHANCE_CHEST : 0; // Conditional spellbook chance

        // Calculate chest gold value
        const maxBonusGold = Math.min(CHEST_MAX_TOTAL_GOLD - item.baseGoldAmount, Math.floor(CHEST_MAX_BONUS_GOLD_PER_LEVEL * currentLevel));
        item.value = item.baseGoldAmount + Math.floor(Math.random() * (maxBonusGold + 1));
        item.value = Math.max(1, Math.min(CHEST_MAX_TOTAL_GOLD, item.value)); // Clamp gold value
    } else if (type === 'shiny_gem') {
        item.value = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin;
    } else if (type === 'armor') {
        // Determine which armor drops based on the world boss
        const worldInfo = getTilesetForLevel(currentLevel);
        item.armorId = WORLD_ARMOR_MAP[worldInfo.name] || 'grey'; // Get armor type for the world
    }


    items.push(item);
    return item;
}

// --- Core Gameplay Actions ---

function finishAction(unit, actionType = 'other') {
    if (!unit || !isUnitAliveAndValid(unit)) return;

    if (!levelClearedAwaitingInput) {
         unit.actionsTakenThisTurn++;
         // Check if unit has more actions (Quick Strike allows 2)
         const maxActions = (unit.canQuickStrike && unit.quickStrikeActive) ? 2 : 1; // Check quickStrikeActive flag

         // Determine if the unit's turn is over
         if (unit.actionsTakenThisTurn >= maxActions) {
              unit.acted = true; // Mark as fully acted for the turn
               unit.quickStrikeActive = false; // Quick strike ends after the second action or turn end
               if (unit.isStealthed && actionType !== 'stealth') { // Attacking or using non-stealth ability breaks stealth
                    unit.isStealthed = false;
                    unit.stealthAttackBonusUsed = false; // Reset bonus flag too
               }
         } else {
              unit.acted = false; // Still has an action left (due to Quick Strike)
              // Stealth remains active if QSing and not attacking
               if (actionType === 'attack' && unit.isStealthed) {
                    // Using the first attack breaks stealth, even with QS
                    unit.isStealthed = false;
                    unit.stealthAttackBonusUsed = true; // Mark bonus used
               }
         }


        // Using stealth costs the turn unless Quick Strike is active allowing another action
        if(actionType === 'stealth' && !unit.canQuickStrike) { // No Quick Strike? Stealth ends turn.
             unit.acted = true;
             unit.actionsTakenThisTurn = 1; // Ensure action count is at least 1
        } else if (actionType === 'stealth' && unit.canQuickStrike) {
             // Stealth used as first action with QS active, doesn't set acted = true yet
        }

        // Track player actions for forfeit option
        if (unit.team === 'player' && (actionType === 'move' || actionType === 'attack' || actionType === 'ability' || actionType === 'stealth')) {
            playerActionsTakenThisLevel++;
            if (typeof updateQuitButton === 'function') updateQuitButton();
        }
    }

    // Update UI
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);

    // Deselect only if unit is fully acted OR level is cleared
    if (selectedUnit?.id === unit.id && (unit.acted || levelClearedAwaitingInput)) {
         if (typeof deselectUnit === 'function') deselectUnit(false);
    } else if(selectedUnit?.id === unit.id && !unit.acted) {
         // Unit can act again (Quick Strike), update UI but keep selected
         updateUnitInfo(unit);
         highlightMovesAndAttacks(unit); // Re-highlight for potential second action
    }

    if (gameSettings.showHpBars && typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);
    if (!levelClearedAwaitingInput) checkWinLossConditions();
}

// --- Rogue Abilities ---
function activateRogueStealth(unit) {
    if (!unit || !unit.canStealth || unit.isStealthed || unit.acted || unit.isFrozen || unit.isNetted) {
         playSfx('error');
         showFeedback("Cannot use Stealth now.", "feedback-error");
         return false;
    }
    playSfx('rogueStealth');
    unit.isStealthed = true;
    unit.stealthAttackBonusUsed = false; // Reset bonus flag
    finishAction(unit, 'stealth'); // Using stealth costs an action
    showFeedback(`${unit.name} uses Stealth!`, "feedback-turn");
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
     if (typeof updateUnitInfo === 'function') updateUnitInfo(unit); // Update status display
    return true;
}

function activateRogueQuickStrike(unit) {
     if (!unit || !unit.canQuickStrike || unit.quickStrikeActive || unit.acted || unit.isFrozen || unit.isNetted || unit.isStealthed) {
         playSfx('error');
          showFeedback("Cannot use Quick Strike now.", "feedback-error");
         return false;
     }
     playSfx('rogueQuickStrike');
     unit.quickStrikeActive = true; // Flag that the next action can be followed by another
     // Quick Strike activation itself uses the first action
     finishAction(unit, 'ability');
     showFeedback(`${unit.name} readies Quick Strike!`, "feedback-turn");
     if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
     if (typeof updateUnitInfo === 'function') updateUnitInfo(unit); // Update status display
     // Unit remains selected, allowing the player to take the first Quick Strike action
     highlightMovesAndAttacks(unit);
     return true;
 }

async function revealSnowman(snowmanObstacle, revealedByUnit = null) {
    if (!snowmanObstacle || snowmanObstacle.revealed || !snowmanObstacle.hidesUnit || !isObstacleIntact(snowmanObstacle)) return;
    snowmanObstacle.revealed = true;
    snowmanObstacle.hp = 0; // Mark as revealed and destroyed

    const goblinType = snowmanObstacle.hiddenUnitType || 'goblin';
    const goblinVariant = snowmanObstacle.hiddenUnitVariant || 'blue';
    const goblinX = snowmanObstacle.x;
    const goblinY = snowmanObstacle.y;

    // Remove obstacle FIRST visually and logically
    await removeObstacle(snowmanObstacle); // Plays destroy sound

    // Check if cell is now clear for spawn
    if (!getUnitAt(goblinX, goblinY) && !getObstacleAt(goblinX, goblinY)) {
        const goblin = createUnit(goblinType, goblinX, goblinY, goblinVariant);
        if (goblin) {
             playSfx('snowmanReveal'); // Play reveal sound after breaking
            if (typeof renderUnit === 'function') renderUnit(goblin);
            if (typeof createWorldHpBar === 'function' && gameSettings.showHpBars) createWorldHpBar(goblin);
            // Allow immediate action if revealed by adjacent player
            if (revealedByUnit?.team === 'player' && getDistance(goblin, revealedByUnit) <= 1) {
                // Make the goblin act immediately (simple AI: attack if possible)
                const attackTargets = getValidAttackTargets(goblin);
                if(attackTargets.units.includes(revealedByUnit.id)) {
                     await attack(goblin, revealedByUnit.x, revealedByUnit.y); // Attack handles finishAction
                } else {
                     finishAction(goblin); // Mark as acted if can't attack
                }
            } else {
                 // Mark as acted if revealed by non-adjacent or non-player
                 finishAction(goblin);
            }
        }
    } else {
         console.warn("Snowman cell blocked after destruction, goblin couldn't spawn.");
          playSfx('error'); // Sound indicating something went wrong
    }


    checkWinLossConditions();
}


async function enterTower(unit, tower) {
    if (!unit || !tower || tower.occupantUnitId || !tower.enterable || !isUnitAliveAndValid(unit) || unit.y !== tower.y + 1 || unit.x !== tower.x) return false;

    if (unit.inTower) leaveTower(unit); // Should not happen, but safety check

    const startX = unit.x;
    const startY = unit.y;
    unit.x = tower.x;
    unit.y = tower.y;
    tower.occupantUnitId = unit.id;
    unit.inTower = tower.id;
    playSfx('towerEnter');

    // Apply range bonus only if unit is naturally ranged
    unit.currentRange = unit.baseRange + (unit.baseRange > 1 ? tower.rangeBonus : 0);

    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
    if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
    if (typeof animateUnitMove === 'function') await animateUnitMove(unit, startX, startY, unit.x, unit.y);
    else if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);

    finishAction(unit, 'move'); // Entering tower counts as move action
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    return true;
}

function leaveTower(unit) {
    if (!unit || !unit.inTower) return;
    const tower = obstacles.find(o => o.id === unit.inTower);
    let targetX = unit.x;
    let targetY = unit.y + 1; // Default exit cell

    if (tower) {
        targetX = tower.x; // Ensure exit position is relative to tower
        targetY = tower.y + 1;
        tower.occupantUnitId = null;
    }

    // Check if exit cell is valid
    if (!isCellInBounds(targetX, targetY) || getUnitAt(targetX, targetY) || getObstacleAt(targetX, targetY)?.blocksMove) {
         // If default exit is blocked, try adjacent cells (simple fallback)
          const adjacentExits = getAdjacentCells(unit.x, unit.y).filter(cell =>
              isCellInBounds(cell.x, cell.y) &&
              !getUnitAt(cell.x, cell.y) &&
              !getObstacleAt(cell.x, cell.y)?.blocksMove &&
              getDistance(cell, tower || unit) === 1 // Only adjacent to tower/current pos
          );
          if (adjacentExits.length > 0) {
               const chosenExit = adjacentExits[0]; // Just pick the first valid one
               targetX = chosenExit.x;
               targetY = chosenExit.y;
          } else {
               console.warn(`Unit ${unit.id} trapped in tower ${unit.inTower}`);
               // Unit remains in the tower visually/logically if no exit found
               if(tower) tower.occupantUnitId = unit.id; // Re-assign occupant
               return; // Don't change unit state if trapped
          }
    }


    unit.x = targetX;
    unit.y = targetY;
    unit.inTower = null;
    unit.currentRange = unit.baseRange; // Reset range
    playSfx('towerExit');

    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
    if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
    if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
}


async function moveUnit(unit, targetX, targetY) {
    if (!unit || !isUnitAliveAndValid(unit)) return false;

    // Check if unit can act OR if level is cleared (allowing item collection)
     let canAct = (!levelClearedAwaitingInput && !unit.acted);
     if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;
     if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAct = true;
     const canMoveForItems = levelClearedAwaitingInput; // Allow movement if level cleared

    if (!canAct && !canMoveForItems) return false; // Cannot move if acted and level not cleared
    if (unit.isFrozen || unit.isNetted) return false; // Frozen/Netted prevents movement
    if (!isCellInBounds(targetX, targetY)) return false;

    // Validate the specific move using getValidMoves (handles distance, obstacles, tower rules, status effects)
    const possibleMoves = getValidMoves(unit, canMoveForItems); // Pass flag to allow movement if level clear
    if (!possibleMoves.some(move => move.x === targetX && move.y === targetY)) {
         // Allow clicking on self to do nothing gracefully
         if (unit.x === targetX && unit.y === targetY) return false;
         // Otherwise, invalid move
         playSfx('error');
         showFeedback("Cannot move there.", "feedback-error");
         return false;
    }


    const startX = unit.x;
    const startY = unit.y;
    const obstacleAtTarget = getObstacleAt(targetX, targetY);
    const towerUnitIsIn = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;
    let enteringTower = false; // Define variable outside try block
    let moveSuccessful = false;

    try {
        playSfx('move');
        let animationStartX = startX;
        let animationStartY = startY;

        if (towerUnitIsIn && targetX === towerUnitIsIn.x && targetY === towerUnitIsIn.y + 1) {
            leaveTower(unit); // Handle leaving the tower state
            animationStartX = towerUnitIsIn.x;
            animationStartY = towerUnitIsIn.y;
        } else if (obstacleAtTarget?.enterable) {
            enteringTower = true; // Flag that we are entering
        } else {
            // Standard move
            unit.x = targetX;
            unit.y = targetY;
        }

        // Update HP bar position early if visible
        if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);

        // Animate the move (or just update visually if no animation)
        if (typeof animateUnitMove === 'function' && !enteringTower) {
            await animateUnitMove(unit, animationStartX, animationStartY, unit.x, unit.y);
        } else if (typeof updateUnitPosition === 'function' && !enteringTower) {
             updateUnitPosition(unit, true);
        } else if (enteringTower) {
             // Find path and initiate sequence (this handles animation + entering state)
             const path = findPathToTarget(unit, targetX, targetY); // Find path to tower entry cell (which is targetX, targetY here)
             if(path !== null){
                 const towerObstacle = getObstacleAt(targetX, targetY); // Get the tower again
                 if(towerObstacle){
                     // initiateTowerEntrySequence will call enterTower, which calls finishAction
                     await initiateTowerEntrySequence(unit, towerObstacle, path);
                 } else { throw new Error("Tower disappeared during entry attempt"); }
             } else { throw new Error("Path to tower became invalid"); }
        }


        // Post-move checks (only if standard move, not tower entry which handles its own finish)
        if (!enteringTower) {
            if (unit.team === 'player') {
                checkForItemPickup(unit, unit.x, unit.y);
                if (playerPassiveUpgrades.gold_magnet > 0) triggerGoldMagnetPassive(unit);
                // Check for adjacent snowmen after moving
                const adjacentCells = getAdjacentCells(unit.x, unit.y);
                for (const { x: nx, y: ny } of adjacentCells) {
                     const adjObstacle = getObstacleAt(nx, ny);
                     if (adjObstacle?.type === 'snowman' && !adjObstacle.revealed) {
                         await revealSnowman(adjObstacle, unit);
                         break; // Reveal only one per move maybe?
                     }
                 }
            }
             // Trigger sapper explosion if moved onto its square
             const sapper = getUnitAt(unit.x, unit.y);
             if(sapper?.type === 'goblin_sapper' && sapper.id !== unit.id) { // Check it's not the unit itself
                 await explodeUnit(sapper);
             }
        }

        moveSuccessful = true;
        return true; // Indicate successful move/entry start

    } catch (e) {
        console.error(`Error during moveUnit for unit ${unit?.id} to (${targetX},${targetY}):`, e);
        // Revert position if error occurred during standard move
        if (!enteringTower) {
            unit.x = startX;
            unit.y = startY;
            if (towerUnitIsIn && !unit.inTower) { // Re-enter tower if error happened after leaving
                 unit.inTower = towerUnitIsIn.id;
                 towerUnitIsIn.occupantUnitId = unit.id;
                 unit.currentRange = unit.baseRange + (unit.baseRange > 1 ? towerUnitIsIn.rangeBonus : 0);
                 if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
            }
            if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
            if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
        }
        moveSuccessful = false;
        return false;
    } finally {
         // Finish action only if it was a standard move and NOT cleared level
         // Tower entry calls finishAction itself
         if (moveSuccessful && !enteringTower && !levelClearedAwaitingInput) {
             finishAction(unit, 'move');
         } else if (!moveSuccessful && unit && !unit.acted) {
             // If move failed but unit hasn't acted, ensure visual state is correct
             if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
         } else if (moveSuccessful && levelClearedAwaitingInput) {
              // Don't finish action if level cleared, just update visuals
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

    itemsOnCell.forEach(item => {
        const itemData = ITEM_DATA[item.type];
        if (!itemData || item.collected) return;

        let canPickup = true;
        if (item.type === 'health_potion' && unit.hp >= unit.maxHp && !levelClearedAwaitingInput) {
            canPickup = false; // Don't pickup potion if full HP unless level is cleared
        }
        if (item.type === 'spellbook' && !Object.values(spellUses).some(used => spellsUnlocked[itemToRestore] && !used) && !unlimitedSpellsCheat) {
             canPickup = false; // Don't pickup if no spells are on cooldown (and cheat isn't on)
        }

        if (canPickup) {
            item.collected = true;
            itemsToAnimateRemoval.push(item);

            switch (itemData.pickupAction) {
                case 'addGold':
                    const goldValue = item.value || 0;
                    goldFromThisPickup += goldValue;
                    baseGoldEarnedThisLevel += goldValue; // Track base gold
                    if (item.type === 'shiny_gem') {
                        collectedCounts.shiny_gem++;
                        if (typeof showGemPopup === 'function') showGemPopup(x, y, goldValue);
                    } else if (item.type === 'gold') {
                        collectedCounts.gold += goldValue;
                        if (typeof showGoldPopup === 'function') showGoldPopup(x, y, goldValue);
                    }
                    break;
                case 'healUnit':
                    if (unit.hp < unit.maxHp) {
                        const healAmount = itemData.value || 0;
                        const healApplied = Math.min(healAmount, unit.maxHp - unit.hp);
                        unit.hp += healApplied;
                        healAppliedTotal += healApplied;
                        collectedCounts.health_potion++;
                    } else if (levelClearedAwaitingInput) {
                        // Convert potion to gold if picked up after level clear at full HP
                        goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP;
                         baseGoldEarnedThisLevel += POTION_GOLD_VALUE_IF_FULL_HP;
                        collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP;
                        if (typeof showGoldPopup === 'function') showGoldPopup(x, y, POTION_GOLD_VALUE_IF_FULL_HP);
                    }
                    break;
                case 'openChest':
                    if (!item.opened) {
                        item.opened = true;
                        chestOpenedThisCheck = true;
                        if (typeof updateVisualItemState === 'function') updateVisualItemState(item);
                        const chestGold = item.value || 0;
                        goldFromThisPickup += chestGold;
                         baseGoldEarnedThisLevel += chestGold;
                        collectedCounts.gold += chestGold;
                        if (typeof showGoldPopup === 'function') showGoldPopup(x, y, chestGold);

                        // Bonus items from chest
                        if (Math.random() < item.potionChance) {
                            if (unit.hp < unit.maxHp) {
                                const healAmount = HEALTH_POTION_HEAL_AMOUNT;
                                const healApplied = Math.min(healAmount, unit.maxHp - unit.hp);
                                unit.hp += healApplied;
                                healAppliedTotal += healApplied;
                                collectedCounts.health_potion++;
                            } else if (levelClearedAwaitingInput) {
                                goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP;
                                 baseGoldEarnedThisLevel += POTION_GOLD_VALUE_IF_FULL_HP;
                                collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP;
                                if (typeof showGoldPopup === 'function') showGoldPopup(x, y, POTION_GOLD_VALUE_IF_FULL_HP);
                            }
                        }
                        if (Math.random() < item.gemChance) {
                            const gemVal = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin;
                            goldFromThisPickup += gemVal;
                             baseGoldEarnedThisLevel += gemVal;
                            collectedCounts.shiny_gem++;
                            playSfx('gemPickup');
                            if (typeof showGemPopup === 'function') showGemPopup(x, y, gemVal);
                        }
                         // Check spellbook drop from chest
                         if (item.spellbookChance > 0 && Math.random() < item.spellbookChance) {
                             const spellsToRestore = Object.keys(spellUses).filter(sName => spellsUnlocked[sName] && !spellUses[sName]);
                             if(spellsToRestore.length > 0) {
                                  const spellToRestore = spellsToRestore[Math.floor(Math.random() * spellsToRestore.length)];
                                  spellUses[spellToRestore] = true;
                                  spellRestored = true;
                                  collectedCounts.spellbook++;
                                   if (typeof updateSpellUI === 'function') updateSpellUI();
                                   // Feedback handled later by spellbook pickup sound/message
                             }
                         }
                    }
                    // Remove chest from animation list as it stays visually (opened)
                    itemsToAnimateRemoval = itemsToAnimateRemoval.filter(animItem => animItem.id !== item.id);
                    break;
                case 'upgradeGoldMagnet':
                    playerPassiveUpgrades.gold_magnet = (playerPassiveUpgrades.gold_magnet || 0) + 1;
                    collectedCounts.gold_magnet++;
                    saveGameData();
                    if (typeof updateShopDisplay === 'function') updateShopDisplay();
                    if (typeof showFeedback === 'function') showFeedback(`Gold Magnet Lvl ${playerPassiveUpgrades.gold_magnet}!`, 'feedback-levelup');
                    break;
                 case 'restoreSpell':
                      const spellsToRestore = Object.keys(spellUses).filter(sName => spellsUnlocked[sName] && !spellUses[sName]);
                      if(spellsToRestore.length > 0) {
                           const spellToRestore = spellsToRestore[Math.floor(Math.random() * spellsToRestore.length)];
                           spellUses[spellToRestore] = true;
                           spellRestored = true;
                           collectedCounts.spellbook++;
                           if (typeof updateSpellUI === 'function') updateSpellUI();
                            if (typeof showFeedback === 'function') showFeedback(`Spellbook restored ${SPELL_UPGRADE_CONFIG[spellToRestore]?.name || 'a spell'}!`, 'feedback-levelup');
                      } else {
                           // Can't restore, maybe give gold?
                           goldFromThisPickup += 5; // Small gold bonus if no spell could be restored
                            baseGoldEarnedThisLevel += 5;
                           collectedCounts.gold += 5;
                            if (typeof showFeedback === 'function') showFeedback(`Spellbook converted to 5 Gold!`, 'feedback-gold');
                      }
                      break;
                case 'collectArmor':
                    const armorId = item.armorId || 'grey'; // Get the type dropped
                     const currentArmorLevel = playerOwnedArmor[armorId] || 0;
                     playerOwnedArmor[armorId] = currentArmorLevel + 1;
                     collectedCounts.armor++;
                     saveGameData(); // Save armor progress
                      if (typeof showFeedback === 'function') showFeedback(`${ARMOR_DATA[armorId]?.name || 'Armor'} obtained (Lvl ${currentArmorLevel + 1})!`, 'feedback-levelup');
                      checkAchievements('collect_armor', { armorId: armorId }); // Check achievement
                      if (typeof updateShopDisplay === 'function') updateShopDisplay(); // Update shop to show new level/unlock
                    break;
                default:
                    console.warn(`Unknown item pickup action: ${itemData.pickupAction}`);
                    break;
            }
        }
    });

    // Update player gold *after* processing all items on the cell
    playerGold += goldFromThisPickup;
    goldCollectedThisLevel += goldFromThisPickup; // Track total including bonuses for end screen

    // Play sounds based on what was collected
    if (chestOpenedThisCheck) playSfx('chestOpen');
    else if (collectedCounts.armor > 0) playSfx('armorEquip'); // Placeholder sound
    else if (spellRestored) playSfx('spellbookPickup');
    else if (collectedCounts.health_potion > 0 && healAppliedTotal > 0) playSfx('potionPickup');
    else if (collectedCounts.gold_magnet > 0) playSfx('pickup'); // Use generic for magnet?
    else if (collectedCounts.shiny_gem > 0 && collectedCounts.gold === 0) playSfx('gemPickup'); // Play gem sound only if no regular gold was also picked up
    else if (collectedCounts.gold > 0) playSfx('pickup'); // Generic pickup for gold if no other specific sound played

    // Show heal popup if healing occurred
    if (healAppliedTotal > 0) {
        if (typeof showHealPopup === 'function') showHealPopup(x, y, healAppliedTotal);
        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);
    }

    // Update gold display if gold changed
    if (goldFromThisPickup > 0) {
        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
    }

    // Animate removal of collected items (excluding opened chest)
    if (itemsToAnimateRemoval.length > 0) {
        if (typeof animateItemPickup === 'function') animateItemPickup(itemsToAnimateRemoval);
        else removeVisualItems(itemsToAnimateRemoval);
        setTimeout(() => updateCellItemStatus(x, y), ITEM_PICKUP_ANIMATION_DURATION_MS + 50);
    } else if (chestOpenedThisCheck) {
        // Update cell status immediately if only a chest was opened
        updateCellItemStatus(x, y);
    }

    // Check if all collectibles gathered after pickup
    const remainingCollectibles = items.some(item => !item.collected && (item.type !== 'chest' || !item.opened));
    if (levelClearedAwaitingInput && !remainingCollectibles && typeof showFeedback === 'function') {
        showFeedback("All items collected!", "feedback-levelup");
        if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); // Update button text maybe?
    }
     // Remove collected items logically after potential animation
     setTimeout(() => {
          items = items.filter(item => !item.collected || (item.type === 'chest' && item.opened)); // Keep opened chests
     }, ITEM_PICKUP_ANIMATION_DURATION_MS + 100);
}



async function initiateTowerEntrySequence(unit, tower, path) {
    if (!unit || !tower || !path) return; // Processing flag handled by caller or enterTower

    const entryCell = path[path.length - 1]; // The cell below the tower

    try {
        let currentPathX = unit.x;
        let currentPathY = unit.y;

        // Animate movement along the path
        for (const step of path) {
            if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') {
                const tempUnit = { ...unit, x: step.x, y: step.y }; // Simulate position for HP bar
                updateWorldHpBarPosition(tempUnit);
            }
            if (typeof animateUnitMove === 'function') {
                await animateUnitMove(unit, currentPathX, currentPathY, step.x, step.y);
            } else {
                unit.x = step.x;
                unit.y = step.y;
                if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
            }
            currentPathX = step.x;
            currentPathY = step.y;
        }

        // Ensure unit is at the entry cell before attempting to enter
        if (unit.x === entryCell.x && unit.y === entryCell.y) {
             await enterTower(unit, tower); // This handles the final move into the tower & finishing action
        } else {
            // If animation didn't land correctly, force position and enter
            console.warn("Tower entry animation sync issue, forcing position.");
            unit.x = entryCell.x;
            unit.y = entryCell.y;
            if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
            await enterTower(unit, tower);
        }
    } catch (error) {
        console.error("Error during tower entry sequence:", error);
        // Attempt to restore original position if error occurs
        // (Note: This might be complex if unit state changed mid-sequence)
        if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); // Refresh visual
        if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
         // Ensure processing is false if error occurs mid-sequence
         // isProcessing = false; // Caller should handle this? Reconsider. FinishAction handles it in enterTower.
         // if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    }
}

async function attack(attacker, targetX, targetY) {
    if (!attacker || !isUnitAliveAndValid(attacker)) return;

    // Check if attacker can act
     let canAttack = !levelClearedAwaitingInput && !attacker.acted;
     if (attacker.canMoveAndAttack && attacker.actionsTakenThisTurn < 2) canAttack = true;
     if (attacker.quickStrikeActive && attacker.actionsTakenThisTurn < 2) canAttack = true;

    if (!canAttack || attacker.isFrozen) { // Netted units CAN attack
        // If AI is frozen or acted, finish its turn. Player clicks shouldn't reach here if cannot act.
        if (currentTurn === 'enemy' && !attacker.acted) finishAction(attacker);
        return;
    }


    let targetUnit = getUnitAt(targetX, targetY);
    let targetObstacle = getObstacleAt(targetX, targetY);
    let targetObject = targetUnit || targetObstacle;
    let unitInTargetTower = null;

    // Handle targeting units inside towers
    if (targetObstacle?.enterable && targetObstacle.occupantUnitId) {
        unitInTargetTower = units.find(u => u.id === targetObstacle.occupantUnitId);
        if (unitInTargetTower && unitInTargetTower.team !== attacker.team) {
            targetObject = targetObstacle; // Target the tower if occupied by enemy
        } else {
            unitInTargetTower = null; // Ignore if friendly or empty tower clicked
            targetObject = null; // Cannot target empty/friendly tower directly this way
        }
    } else if (targetUnit?.inTower) {
        const towerUnitIsIn = obstacles.find(o => o.id === targetUnit.inTower);
        if (towerUnitIsIn && isObstacleIntact(towerUnitIsIn)) {
            targetObject = towerUnitIsIn; // Target the tower the unit is in
            unitInTargetTower = targetUnit; // Keep track of the unit inside
        } else {
             targetObject = null; // Target in destroyed tower is invalid
        }
    }

    if (!targetObject) { playSfx('error'); return; } // No valid target found

    // Check if the target is attackable (destructible or specifically marked)
    const isTargetAttackable = (targetObject.team || targetObject.canBeAttacked);
    if (!isTargetAttackable) {
         playSfx('error');
         showFeedback("Cannot attack that.", "feedback-error");
         return;
    }

    const distance = getDistance(attacker, targetObject);
    const range = attacker.currentRange;
    const isRanged = distance > 1;
    const ignoreStealthLOS = attacker.isStealthed; // Rogue ignores stealth for own attack LOS

     // Check visibility (stealth) - Can attacker see the target?
     const endUnit = targetUnit || unitInTargetTower; // The unit being targeted (directly or in tower)
     const targetIsVisible = !endUnit?.isStealthed || // Target isn't stealthed OR
                             (attacker.isStealthed && distance <= 1) || // Attacker is stealthed & adjacent OR
                             distance <= 1; // Target is adjacent (always visible)

     // Check range and Line of Sight
     if (!targetIsVisible || distance > range || (isRanged && !hasLineOfSight(attacker, targetObject, ignoreStealthLOS))) {
         playSfx('error');
         showFeedback("Cannot attack target (out of range, LOS, or stealthed).", "feedback-error");
         return;
     }

     // Check melee-only restriction
     if (attacker.meleeOnlyAttack && distance > 1) {
         playSfx('error');
         showFeedback("Unit can only attack adjacent targets.", "feedback-error");
         return;
     }
     // Check ranged units attacking doors
      if (isRanged && targetObject.type === 'door') {
          playSfx('error');
          showFeedback("Ranged units cannot attack doors.", "feedback-error");
          return;
      }


    const targetIsUnit = !!targetObject.team; // Check if the final target object is a unit
    const targetOriginalData = { id: targetObject.id, x: targetX, y: targetY, type: targetObject.type }; // Snapshot target info
    let damage = attacker.atk;
    let isStealthAttack = false;

    // Apply Rogue stealth bonus
    if(attacker.isStealthed && !attacker.stealthAttackBonusUsed) {
         damage += ROGUE_STEALTH_DAMAGE_BONUS;
         isStealthAttack = true; // Flag for potential visual/sound difference
    }


    const isChampion = attacker.type === 'champion';
    const cleaveDamage = isChampion ? (attacker.cleaveDamage || 0) : 0;

    let impactDelay = 0;
    const projectileType = attacker.shootsProjectileType || 'melee';
    if (typeof animateAttack === 'function') {
        impactDelay = await animateAttack(attacker, { x: targetX, y: targetY }, isRanged, projectileType);
    }

    // --- Damage Application Timeout ---
    await new Promise(resolve => setTimeout(resolve, impactDelay)); // Wait for animation

    // Re-verify target still exists and is valid after animation delay
    let currentTargetObject = targetIsUnit ? units.find(u => u.id === targetOriginalData.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === targetOriginalData.id && isObstacleIntact(o));
     // Re-check unit in tower if the target was a tower
     let currentUnitInTower = null;
     if (!targetIsUnit && currentTargetObject?.enterable && currentTargetObject.occupantUnitId) {
         currentUnitInTower = units.find(u => u.id === currentTargetObject.occupantUnitId);
         if (!currentUnitInTower || !isUnitAliveAndValid(currentUnitInTower)) {
             currentUnitInTower = null; // Unit died or left while animation played
         }
     } else if (targetIsUnit && currentTargetObject?.inTower) {
          const currentTower = obstacles.find(o => o.id === currentTargetObject.inTower);
          if (currentTower && isObstacleIntact(currentTower)) {
              currentTargetObject = currentTower; // Switch target back to tower
              currentUnitInTower = units.find(u => u.id === targetOriginalData.id && isUnitAliveAndValid(u)); // The unit is still the one inside
          } else {
               currentTargetObject = null; // Tower destroyed? Target invalid
          }
     }


    if (!currentTargetObject) { // Target disappeared during animation
        // Finish attacker action if appropriate
         const finalAttackerCheck = units.find(u => u.id === attacker.id);
         if (finalAttackerCheck && isUnitAliveAndValid(finalAttackerCheck) && !finalAttackerCheck.acted) {
              finishAction(finalAttackerCheck, 'attack'); // Finish action even if target gone
         }
        checkWinLossConditions(); // Check win/loss as target removal might trigger it
        return;
    }

    // Apply damage and effects
    try {
        // Play hit sounds
         if (currentTargetObject.team === 'player' || currentUnitInTower?.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
         else playSfx(isStealthAttack ? 'rogueAttack' : 'hit'); // Specific sound for rogue stealth attack?

        // Apply damage to the primary target object (tower or unit)
         let effectiveDamage = damage;
         // Apply resistances
          const targetArmor = currentTargetObject.team === 'player' ? ARMOR_DATA[equippedArmorId] : null; // Only players have armor benefits
          const targetArmorLevel = targetArmor ? (playerOwnedArmor[equippedArmorId] || 0) : 0;
          const targetImmuneFire = currentTargetObject.immuneToFire || (targetArmor && targetArmorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (targetArmor.resistances?.fire ?? 0) >= ARMOR_RESISTANCE_VALUE);
          const targetImmuneFrost = currentTargetObject.immuneToFrost || (targetArmor && targetArmorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL && (targetArmor.resistances?.frost ?? 0) >= ARMOR_RESISTANCE_VALUE);

          if(targetImmuneFire && projectileType === 'fireball') effectiveDamage = 1; // Minimum damage for fire immune
          else if(targetImmuneFrost && projectileType === 'frost') effectiveDamage = 1; // Placeholder for frost projectile

          // Apply Forest armor activation reduction (if attacker is enemy)
          if(forestArmorActiveTurns > 0 && attacker.team === 'enemy') {
               effectiveDamage = Math.max(1, effectiveDamage - 1); // Reduce by 1, min 1
          }

         currentTargetObject.hp -= effectiveDamage;
         if (currentTargetObject.hp < 0) currentTargetObject.hp = 0;
         if (typeof showDamagePopup === 'function') showDamagePopup(targetOriginalData.x, targetOriginalData.y, effectiveDamage);
         if (typeof flashElementOnHit === 'function') flashElementOnHit(currentTargetObject.element);

        // Update HP bars / Info display for the hit object
        if (currentTargetObject.team) { // If it's a unit
            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(currentTargetObject);
            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(currentTargetObject);
        }

        let deathPromises = [];
        let primaryTargetRemoved = false;

        // --- Check Primary Target Death ---
        if (currentTargetObject.hp <= 0) {
            primaryTargetRemoved = true;
            if (currentTargetObject.team) { // Unit died
                deathPromises.push(removeUnit(currentTargetObject));
            } else if (currentTargetObject.type === 'snowman') {
                 // Reveal snowman - reveal handles removal
                 await revealSnowman(currentTargetObject, attacker);
                 currentTargetObject = null; // Target no longer exists
            } else { // Obstacle destroyed (Tower or Door)
                 const unitToDamageAfterTower = currentUnitInTower && isUnitAliveAndValid(currentUnitInTower) ? currentUnitInTower : null;
                 deathPromises.push(removeObstacle(currentTargetObject)); // Remove the tower/door
                 currentTargetObject = null; // Target obstacle is gone

                 // If a unit was inside the destroyed tower, apply damage to them too
                 if (unitToDamageAfterTower) {
                      // Apply damage again (maybe reduced?)
                      let towerDestroyDamage = Math.max(1, Math.floor(effectiveDamage / 2)); // Example: half damage
                       if(unitToDamageAfterTower.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
                       else playSfx('hit'); // Sound for unit hit after tower break

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
        // --- Apply Status Effects (if target survived) ---
        else if (currentTargetObject.team) { // Only apply to units
             if (attacker.inflictsSlow) {
                 currentTargetObject.isSlowed = true;
                 currentTargetObject.slowedTurnsLeft = GOBLIN_BLUE_SLOW_DURATION;
                 playSfx('slow_inflicted');
                 if (typeof updateUnitVisualState === 'function') updateUnitVisualState(currentTargetObject);
                 if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(currentTargetObject);
             }
             if (attacker.knockback) {
                  const kbDirX = Math.sign(targetOriginalData.x - attacker.x);
                  const kbDirY = Math.sign(targetOriginalData.y - attacker.y);
                  if (kbDirX !== 0 || kbDirY !== 0) {
                       const kbX = currentTargetObject.x + kbDirX;
                       const kbY = currentTargetObject.y + kbDirY;
                       // Check if knockback cell is valid
                       if (isCellInBounds(kbX, kbY) && !getUnitAt(kbX, kbY) && !getObstacleAt(kbX, kbY)?.blocksMove) {
                            // Animate knockback (treat as a forced move)
                             await moveUnit(currentTargetObject, kbX, kbY);
                             // Knockback doesn't 'finishAction' for the target
                       }
                  }
             }
        }

        // Wait for primary death animations/removals
        await Promise.all(deathPromises);
        deathPromises = []; // Reset for cleave

        // --- Champion Cleave Logic ---
        if (isChampion && cleaveDamage > 0 && currentTargetObject) { // Check currentTargetObject still exists (wasn't snowman)
             const currentAttacker = units.find(u => u.id === attacker.id); // Re-check attacker still exists
             if (currentAttacker && isUnitAliveAndValid(currentAttacker)) {
                 const attackDirX = Math.sign(targetOriginalData.x - currentAttacker.x);
                 const attackDirY = Math.sign(targetOriginalData.y - currentAttacker.y);
                 const potentialCleaveCellsCoords = [];
                 // Determine potential cleave cells based on attack direction
                 if (attackDirX !== 0) { // Horizontal attack
                     potentialCleaveCellsCoords.push(
                         { x: targetOriginalData.x, y: targetOriginalData.y - 1 }, // Above
                         { x: targetOriginalData.x, y: targetOriginalData.y + 1 }, // Below
                         { x: targetOriginalData.x + attackDirX, y: targetOriginalData.y } // Behind
                     );
                 } else if (attackDirY !== 0) { // Vertical attack
                     potentialCleaveCellsCoords.push(
                         { x: targetOriginalData.x - 1, y: targetOriginalData.y }, // Left
                         { x: targetOriginalData.x + 1, y: targetOriginalData.y }, // Right
                         { x: targetOriginalData.x, y: targetOriginalData.y + attackDirY } // Behind
                     );
                 } else { // Attacked self? Or range 0? Use cardinal directions
                     potentialCleaveCellsCoords.push(
                         { x: targetOriginalData.x - 1, y: targetOriginalData.y }, { x: targetOriginalData.x + 1, y: targetOriginalData.y },
                         { x: targetOriginalData.x, y: targetOriginalData.y - 1 }, { x: targetOriginalData.x, y: targetOriginalData.y + 1 }
                     );
                 }

                 await new Promise(r => setTimeout(r, 50)); // Small delay before cleave hits

                 for (const { x: cleaveX, y: cleaveY } of potentialCleaveCellsCoords) {
                      if (!isCellInBounds(cleaveX, cleaveY)) continue;

                      let cleaveTarget = getUnitAt(cleaveX, cleaveY);
                      let cleaveObstacle = getObstacleAt(cleaveX, cleaveY);
                      let cleaveTargetObject = null;
                      let unitInCleaveTower = null;

                      // Determine the actual object to cleave
                      if (cleaveTarget && isUnitAliveAndValid(cleaveTarget) && cleaveTarget.team !== currentAttacker.team) {
                          if (cleaveTarget.inTower) {
                              const towerCleaveTargetIsIn = obstacles.find(o => o.id === cleaveTarget.inTower);
                              if (towerCleaveTargetIsIn && isObstacleIntact(towerCleaveTargetIsIn)) {
                                  cleaveTargetObject = towerCleaveTargetIsIn; // Cleave the tower
                                  unitInCleaveTower = cleaveTarget; // Track unit inside
                              } else continue; // Skip if tower is destroyed
                          } else {
                              cleaveTargetObject = cleaveTarget; // Cleave the unit directly
                          }
                      } else if (cleaveObstacle && cleaveObstacle.canBeAttacked && isObstacleIntact(cleaveObstacle)) {
                           if (cleaveObstacle.enterable && cleaveObstacle.occupantUnitId) {
                                const unitInside = units.find(u => u.id === cleaveObstacle.occupantUnitId);
                                // Only target tower if occupied by enemy
                                if (unitInside && unitInside.team !== currentAttacker.team) {
                                     cleaveTargetObject = cleaveObstacle;
                                     unitInCleaveTower = unitInside;
                                } else {
                                      cleaveTargetObject = cleaveObstacle; // Cleave the obstacle itself
                                }
                           } else {
                                cleaveTargetObject = cleaveObstacle; // Cleave the obstacle
                           }
                      }

                      // Skip if no valid target or if it's the primary target again
                      if (!cleaveTargetObject || cleaveTargetObject.id === targetOriginalData.id) continue;

                      // Play sounds
                      if (cleaveTargetObject.team === 'player' || unitInCleaveTower?.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
                      else playSfx('hit');

                       // Apply cleave damage (apply resistances?)
                       let effectiveCleaveDamage = cleaveDamage;
                         const cleaveTargetArmor = cleaveTargetObject.team === 'player' ? ARMOR_DATA[equippedArmorId] : null;
                         const cleaveTargetArmorLevel = cleaveTargetArmor ? (playerOwnedArmor[equippedArmorId] || 0) : 0;
                         // Assume cleave isn't fire/frost for now
                          if(forestArmorActiveTurns > 0 && cleaveTargetObject.team === 'player') {
                               effectiveCleaveDamage = Math.max(1, effectiveCleaveDamage - 1);
                          }


                       cleaveTargetObject.hp -= effectiveCleaveDamage;
                       if (cleaveTargetObject.hp < 0) cleaveTargetObject.hp = 0;
                       if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, effectiveCleaveDamage);
                       if (typeof flashElementOnHit === 'function') flashElementOnHit(cleaveTargetObject.element);

                      const isCleaveTargetUnit = !!cleaveTargetObject.team;
                      if (isCleaveTargetUnit) {
                           if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(cleaveTargetObject);
                           if (typeof updateWorldHpBar === 'function') updateWorldHpBar(cleaveTargetObject);
                      }

                      // Check for cleave target death
                      if (cleaveTargetObject.hp <= 0) {
                           if (isCleaveTargetUnit) {
                                deathPromises.push(removeUnit(cleaveTargetObject));
                           } else { // Cleaved obstacle destroyed
                                const unitToDamageAfterCleavedTower = unitInCleaveTower && isUnitAliveAndValid(unitInCleaveTower) ? unitInCleaveTower : null;
                                deathPromises.push(removeObstacle(cleaveTargetObject));
                                // Apply damage to unit inside if tower was cleaved
                                if (unitToDamageAfterCleavedTower) {
                                     let towerCleaveDamage = Math.max(1, Math.floor(effectiveCleaveDamage / 2)); // Reduced damage?
                                      if(unitToDamageAfterCleavedTower.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
                                      else playSfx('hit');

                                     unitToDamageAfterCleavedTower.hp -= towerCleaveDamage;
                                     if (unitToDamageAfterCleavedTower.hp < 0) unitToDamageAfterCleavedTower.hp = 0;
                                     if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, towerCleaveDamage);
                                     if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterCleavedTower.element);
                                     if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterCleavedTower);
                                     if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterCleavedTower);
                                     if (unitToDamageAfterCleavedTower.hp <= 0) deathPromises.push(removeUnit(unitToDamageAfterCleavedTower));
                                }
                           }
                      }
                 }
                 // Wait for cleave deaths
                 await Promise.all(deathPromises);
             }
        }


        // --- Finish Attacker Action ---
        const finalAttackerCheck = units.find(u => u.id === attacker.id);
        if (finalAttackerCheck && isUnitAliveAndValid(finalAttackerCheck)) {
             finishAction(finalAttackerCheck, 'attack'); // Let finishAction handle setting acted based on Q.Strike etc.
        } else {
             // Attacker might have died from reflect/explosion etc.
             checkWinLossConditions(); // Still check win/loss
        }

    } catch (e) {
        console.error("Error during attack resolution:", e);
        // Ensure attacker state is finalized even if error occurred
         const errorAttackerCheck = units.find(u => u.id === attacker.id);
         if (errorAttackerCheck && isUnitAliveAndValid(errorAttackerCheck) && !errorAttackerCheck.acted) {
              finishAction(errorAttackerCheck, 'attack');
         }
    } finally {
         // Check win/loss after all potential deaths/removals
         checkWinLossConditions();
    }
}


async function explodeUnit(unit, isDeathExplosion = false) {
    if (!unit || !unit.explosionDamage || unit.explosionRadius < 0) return;

    const centerX = unit.x;
    const centerY = unit.y;
    const radius = unit.explosionRadius;
    const damage = unit.explosionDamage;

    playSfx('sapperExplode');
    if (typeof createExplosionEffect === 'function') createExplosionEffect(centerX, centerY, 'fireball'); // Use fireball explosion visual
    await new Promise(r => setTimeout(r, 100)); // Short delay for visual

    const affectedUnits = getUnitsInArea(centerX, centerY, radius);
    let deathPromises = [];

    affectedUnits.forEach(targetUnit => {
        if (targetUnit.id === unit.id || !isUnitAliveAndValid(targetUnit)) return; // Don't hit self or dead units

        // Apply damage (no resistance to explosion?)
        if (targetUnit.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
        else playSfx('hit'); // Enemy hit sound

        targetUnit.hp -= damage;
        if (targetUnit.hp < 0) targetUnit.hp = 0;
        if (typeof showDamagePopup === 'function') showDamagePopup(targetUnit.x, targetUnit.y, damage);
        if (typeof flashElementOnHit === 'function') flashElementOnHit(targetUnit.element);
        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetUnit);
        if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetUnit);
        if (targetUnit.hp <= 0) {
             deathPromises.push(removeUnit(targetUnit));
        }
    });

    // Remove the sapper itself if it wasn't a death explosion
    if (!isDeathExplosion) {
        deathPromises.push(removeUnit(unit));
    }

    await Promise.all(deathPromises);
    checkWinLossConditions();
}


function removeObstacle(obstacle) {
    return new Promise(resolve => {
        if (!obstacle) { resolve(); return; }
        const obsId = obstacle.id;
        const obsX = obstacle.x;
        const obsY = obstacle.y;
        const obsType = obstacle.type;

        obstacle.hp = 0; // Mark as destroyed logically
        if (gridState[obsY]?.[obsX]?.type === obsType) {
            gridState[obsY][obsX] = null; // Clear from grid state
        }

        // If it was a tower, handle occupant leaving
        if (obstacle.occupantUnitId) {
            const unitInside = units.find(u => u.id === obstacle.occupantUnitId);
            if (unitInside) {
                // Force unit out (if possible) - they might take damage later in attack logic
                leaveTower(unitInside);
            }
            obstacle.occupantUnitId = null;
        }

        // Animate destruction
        if (typeof handleObstacleDestroyAnimation === 'function') {
            handleObstacleDestroyAnimation(obstacle).then(() => {
                const index = obstacles.findIndex(o => o.id === obsId);
                if (index !== -1) obstacles.splice(index, 1); // Remove from array
                if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY); // Update cell class
                resolve();
            });
        } else {
            // Fallback: immediate removal
            obstacle.element?.remove();
            const index = obstacles.findIndex(o => o.id === obsId);
            if (index !== -1) obstacles.splice(index, 1);
            if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY);
            resolve();
        }
    });
}

async function removeUnit(unit) {
    if (!unit) return;
    const unitId = unit.id;
    const unitTeam = unit.team;
    const unitType = unit.type;
    const finalX = unit.x;
    const finalY = unit.y;
    const wasSelected = selectedUnit?.id === unitId;
    const shouldExplodeOnDeath = unit.explodeOnDeath || false;
    const isTreasureGoblin = unit.isTreasureHunter || false;
    const isBoss = unit.isBoss || false;
    const dropsArmorFlag = unit.dropsArmor || false;

    unit.hp = 0; // Mark as dead
    if (unit.inTower) leaveTower(unit); // Force unit out of tower if it dies inside

    // --- Handle Achievements & Stats ---
    if (unitTeam === 'enemy') {
        enemiesKilledThisLevel++;
        // Check kill achievements
        checkAchievements('kill', { type: unitType, isBoss: isBoss, world: currentTerrainInfo.name });
        checkAchievements('kill_multiple', { targets: ["goblin", "goblin_archer", "goblin_netter", "goblin_club", "goblin_shaman", "goblin_sapper", "goblin_pyromancer"], count: 1 }); // Increment general goblin kill count
    } else if (unitTeam === 'player') {
         unitsLostThisLevel++; // Track player loss
    }

    let itemsToDrop = [];
    let goldFromDrops = 0; // Track gold specifically from this unit's direct drops

    // --- Handle Drops ---
    if (unitTeam === 'enemy' && !unit.isTotem) {
         // Boss Drops (Armor)
         if (isBoss && dropsArmorFlag) {
             const worldInfo = getTilesetForLevel(currentLevel);
             const armorId = WORLD_ARMOR_MAP[worldInfo.name];
             if (armorId && ARMOR_DATA[armorId]) {
                  // Directly grant armor level
                  const currentArmorLevel = playerOwnedArmor[armorId] || 0;
                  playerOwnedArmor[armorId] = currentArmorLevel + 1;
                  saveGameData(); // Save armor progress
                   if (typeof showFeedback === 'function') showFeedback(`${ARMOR_DATA[armorId].name} obtained (Lvl ${currentArmorLevel + 1})!`, 'feedback-levelup', 3000);
                   checkAchievements('collect_armor', { armorId: armorId }); // Check achievement
                   if (typeof updateShopDisplay === 'function') updateShopDisplay(); // Update shop
             }
         }
         // Treasure Hunter Drops
         else if (isTreasureGoblin) {
             // Guaranteed Gold Magnet drop if player doesn't have it yet
             if((playerPassiveUpgrades.gold_magnet || 0) === 0) {
                 itemsToDrop.push(createItem('gold_magnet', finalX, finalY, itemsToDrop.length));
             }
             // Scatter gold and gem nearby
             let gemDropped = false;
             const adjacentCells = getAdjacentCells(finalX, finalY, true); // Include diagonals
             adjacentCells.sort(() => 0.5 - Math.random()); // Shuffle drop locations

             // Drop gold on adjacent cells
             const goldDrops = Math.floor(Math.random() * (GOBLIN_TREASURE_HUNTER_GOLD_DROP_MAX - GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN + 1)) + GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN;
             for(let i = 0; i < goldDrops && i < adjacentCells.length; i++) {
                  const cell = adjacentCells[i];
                   // Avoid dropping on obstacles/units if possible
                   if(!getUnitAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y)) {
                       itemsToDrop.push(createItem('gold', cell.x, cell.y, i + 1)); // i+1 for stack index
                       goldFromDrops += 1;
                   }
             }
             // Drop gem if not dropped yet
             const gemDropCell = adjacentCells.find(cell => !getItemAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y) && !(cell.x === finalX && cell.y === finalY)); // Find empty adjacent cell if possible
             if (gemDropCell) {
                 itemsToDrop.push(createItem('shiny_gem', gemDropCell.x, gemDropCell.y, 100)); // High stack index
             }
         }
        // Regular Enemy Drops
        else {
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
             const gemDropChance = GEM_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE));
             if (Math.random() < gemDropChance) {
                 itemsToDrop.push(createItem('shiny_gem', finalX, finalY, itemsToDrop.length));
             }
             // Spellbook Drop - Check if player used a spell this level
             if (SPELLBOOK_REQUIRED_SPELL_USE && spellsUsedThisLevel && Math.random() < SPELLBOOK_DROP_CHANCE_ENEMY) {
                  itemsToDrop.push(createItem('spellbook', finalX, finalY, itemsToDrop.length));
             }
        }

        if (itemsToDrop.length > 0) {
             if(goldFromDrops > 0) playSfx('goldDrop');
             itemsToDrop = itemsToDrop.filter(item => item !== null); // Ensure no null items
             if (typeof animateItemDrop === 'function' && itemsToDrop.length > 0) {
                 await animateItemDrop(itemsToDrop, finalX, finalY);
             } else if (typeof renderAll === 'function') {
                 renderAll(); // Fallback redraw
             }
        }
    } else if (unitTeam === 'player') {
        playSfx('playerDie');
    }

    // --- Explosion Logic ---
    let explosionPromise = Promise.resolve();
    if (shouldExplodeOnDeath) {
        explosionPromise = explodeUnit(unit, true); // Pass true for death explosion
    }

    // --- Cleanup and UI ---
    if (wasSelected && typeof deselectUnit === 'function') deselectUnit(false);
    if (typeof updateUnitInfoOnDeath === 'function') updateUnitInfoOnDeath(unitId);
    if (typeof removeWorldHpBar === 'function') removeWorldHpBar(unit.id);

    // Animate death
    if (typeof handleUnitDeathAnimation === 'function') {
        handleUnitDeathAnimation(unit, finalX, finalY, deathSpriteTimeouts); // Don't await this, let it run async
    } else {
        unit.element?.remove(); // Immediate removal if no animation handler
    }

    // Remove unit from logical array *before* awaiting explosion to prevent self-damage issues
    const unitIndex = units.findIndex(u => u.id === unitId);
    if (unitIndex !== -1) {
        units.splice(unitIndex, 1);
    }

    await explosionPromise; // Wait for explosion damage to resolve *after* unit is removed logically

    checkWinLossConditions(); // Check win/loss after all effects
}


// --- Spells ---

function getSpellEffectValue(spellName, baseValue, getNextLevelValue = false) {
    let upgradeLevel = playerSpellUpgrades[spellName] || 0;
    if (getNextLevelValue) {
        upgradeLevel++; // Calculate for the potential next level
    }
    const config = SPELL_UPGRADE_CONFIG[spellName];
    if (!config) return baseValue; // Spell config missing

    // Use current cheat bonus regardless of checking next level
    const cheatBonus = (config.stat === 'damage' && playerCheatSpellAttackBonus > 0) ? playerCheatSpellAttackBonus : 0;
    const effectIncrease = config.effectIncrease ?? 0;

    // Clamp spell level for calculation if checking next level beyond max
    let calculationLevel = upgradeLevel;
    if (getNextLevelValue && calculationLevel > config.maxLevel) {
         calculationLevel = config.maxLevel; // Use max level for "next level" display if already maxed
    } else if (!getNextLevelValue){
         calculationLevel = Math.min(calculationLevel, config.maxLevel); // Use current level capped at max
    } // If getNextLevelValue is true and we're not maxed, use upgradeLevel+1

    // Handle frost nova radius differently
    if (spellName === 'frostNova' && config.stat === 'radiusLevel') {
        // Radius level starts at 1 (3x3), increases by 1 per upgrade level
        const radiusLevel = FROST_NOVA_BASE_RADIUS_LEVEL + calculationLevel;
        return Math.min(radiusLevel, config.maxLevel); // Return the radius level, clamped by max spell level
    }

    // Base value + increase per level + cheat bonus
    return baseValue + (calculationLevel * effectIncrease) + cheatBonus;
}


// Helper specifically for Frost Nova radius display/calculation
function getFrostNovaRadiusLevel(getNextLevelValue = false) {
     let upgradeLevel = playerSpellUpgrades['frostNova'] || 0;
     if (getNextLevelValue) {
         upgradeLevel++;
     }
     const config = SPELL_UPGRADE_CONFIG['frostNova'];
     const maxUpgradeLevel = config?.maxLevel ?? 4;
     // Clamp level to max for calculation
      upgradeLevel = Math.min(upgradeLevel, maxUpgradeLevel);
     // Calculate radius level (0=1x1, 1=3x3, etc.) - assuming base is level 1 (3x3)
     const radiusLevel = FROST_NOVA_BASE_RADIUS_LEVEL + upgradeLevel;
     // Return the radius level (e.g., 1, 2, 3, 4), this represents half the dimension - 0.5
     // So level 1 = 1+1 = 2 (radius), 3x3 area. level 4 = 1+4 = 5 (radius), 11x11 area? No, radiusLevel IS the radius value.
     // Radius Level 1 = 3x3. Upgrade 1 -> radiusLevel 2 (5x5). Upgrade 3 -> radiusLevel 4 (9x9)
     return Math.min(FROST_NOVA_BASE_RADIUS_LEVEL + upgradeLevel, maxUpgradeLevel);
 }

async function castSpell(spellName, target, originElement = null) {
    // Basic validation
    if (!spellUses[spellName] && !unlimitedSpellsCheat) {
        playSfx('error'); if (typeof showFeedback === 'function') showFeedback("Spell not ready.", "feedback-error"); return false;
    }
    if (currentTurn !== 'player') { // Removed isProcessing check here - spells don't use it
        playSfx('error'); if (typeof showFeedback === 'function') showFeedback("Cannot cast spell now.", "feedback-error"); return false;
    }

    // Mark spell as used (if not cheating)
    if (!unlimitedSpellsCheat) {
        spellUses[spellName] = false;
    }
    spellsUsedThisLevel = true; // Mark that a spell was used for spellbook drops

    // Update UI immediately to show cooldown/selection change
    if (typeof setActiveSpell === 'function') setActiveSpell(null);
    if (typeof updateSpellUI === 'function') updateSpellUI();

    let success = false;
    let deathPromises = [];

    try {
        switch (spellName) {
            case 'fireball':
                let fbTargetObject = null;
                const isTargetEnemyUnit = target?.team === 'enemy' && isUnitAliveAndValid(target);
                const isTargetAttackableObstacle = target && !target.team && target.canBeAttacked === true && isObstacleIntact(target);

                if (isTargetEnemyUnit) fbTargetObject = target;
                else if (isTargetAttackableObstacle) fbTargetObject = target;

                if (fbTargetObject && originElement) {
                    playSfx('fireballShoot');
                    const targetPos = { x: fbTargetObject.x, y: fbTargetObject.y };
                    if (typeof animateFireball === 'function') animateFireball(originElement, targetPos.x, targetPos.y);
                    await new Promise(resolve => setTimeout(resolve, FIREBALL_PROJECTILE_DURATION_MS));

                    playSfx('fireballHit');
                    if (typeof createExplosionEffect === 'function') createExplosionEffect(targetPos.x, targetPos.y, 'fireball');

                    // Re-fetch target after delay
                    const stillTarget = fbTargetObject.team ? units.find(u => u.id === fbTargetObject.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === fbTargetObject.id && isObstacleIntact(o));

                    if (stillTarget) {
                        let actualDamage = getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE);
                        let tookDamage = false;
                         // Check immunity
                         if (stillTarget.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) {
                             actualDamage = 1; // Minimum damage
                             if (typeof showFeedback === 'function') showFeedback("Immune to Fire!", "feedback-error");
                         }
                         // Apply damage
                         stillTarget.hp -= actualDamage;
                         tookDamage = true;

                        if (tookDamage) {
                             if (stillTarget.hp < 0) stillTarget.hp = 0;
                             if (typeof showDamagePopup === 'function') showDamagePopup(targetPos.x, targetPos.y, actualDamage);
                             if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element);

                             if (stillTarget.team && typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget);

                             if (stillTarget.hp <= 0) {
                                 deathPromises.push(stillTarget.team ? removeUnit(stillTarget) : removeObstacle(stillTarget));
                             } else if (stillTarget.team && typeof updateUnitInfoDisplay === 'function') {
                                 updateUnitInfoDisplay(stillTarget);
                             }
                        }
                        success = true; // Spell was cast successfully even if target was immune
                    } else {
                        success = true; // Target died/destroyed before impact
                    }
                } else {
                    playSfx('error'); showFeedback("Invalid Fireball target.", "feedback-error"); success = false;
                }
                break; // End Fireball case

            case 'flameWave':
                const targetRowFW = target.y;
                if (!isCellInBounds(0, targetRowFW)) { playSfx('error'); success = false; break; }

                const actualDamageFW = getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE);
                playSfx('flameWaveCast');
                if (typeof animateFlameWave === 'function') animateFlameWave(targetRowFW); // Visual effect starts

                // Schedule damage application after delay
                flameWavePending = { y: targetRowFW, casterId: 'player', damage: actualDamageFW }; // Store damage value
                // Damage applied at start of enemy turn via processStatusTicks

                success = true; // Mark as successful cast, damage is pending
                break; // End Flame Wave case

            case 'frostNova':
                const centerX = target.x;
                const centerY = target.y;
                playSfx('frostNovaCast');
                const radiusLevelFN = getFrostNovaRadiusLevel(); // Use the specific helper
                const radiusFN = radiusLevelFN; // Radius level IS the radius value for getUnitsInArea
                const freezeDurationFN = FROST_NOVA_BASE_DURATION;
                let unitsFrozenCount = 0;

                if (typeof animateFrostNova === 'function') animateFrostNova(centerX, centerY, radiusLevelFN);
                await new Promise(r => setTimeout(r, 50)); // Short delay for visual sync

                const affectedUnitsFN = getUnitsInArea(centerX, centerY, radiusFN);
                affectedUnitsFN.forEach(unit => {
                    if (unit?.team === 'enemy' && isUnitAliveAndValid(unit) && !unit.isFrozen) {
                         // Check immunity
                         if (unit.immuneToFrost && currentLevel >= IMMUNITY_LEVEL_START) {
                             if (typeof showFeedback === 'function') showFeedback("Immune!", "feedback-error", 500);
                         } else {
                              unit.isFrozen = true;
                              unit.frozenTurnsLeft = freezeDurationFN;
                              unitsFrozenCount++;
                              if (typeof showFreezePopup === 'function') showFreezePopup(unit.x, unit.y);
                              if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);
                              if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit);
                         }
                    }
                });

                if (unitsFrozenCount > 0) playSfx('frostNovaHit');
                success = true; // Spell cast successfully
                break; // End Frost Nova case

            case 'heal':
                if (target?.team === 'player' && isUnitAliveAndValid(target)) {
                    const actualHealAmount = getSpellEffectValue(spellName, HEAL_BASE_AMOUNT);
                    const healApplied = Math.min(actualHealAmount, target.maxHp - target.hp);
                    if (healApplied > 0) {
                        playSfx('heal');
                        target.hp += healApplied;
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
                break; // End Heal case
        }
    } catch (e) {
        console.error(`Error casting spell ${spellName}:`, e);
        success = false;
    } finally {
        // If the spell failed and wasn't a cheat, give the use back
        if (!success && !unlimitedSpellsCheat && spellName && !spellUses[spellName]) {
            spellUses[spellName] = true; // Refund use
             spellsUsedThisLevel = false; // Didn't actually use a spell if it failed
            if (typeof updateSpellUI === 'function') updateSpellUI();
        }
        await Promise.all(deathPromises); // Wait for any deaths caused by the spell
        checkWinLossConditions(); // Check win/loss after spell effects and deaths
        if (typeof clearSpellHighlights === 'function') clearSpellHighlights();
    }
    return success;
}



async function throwNet(netterUnit, targetUnit) {
    if (!netterUnit || !targetUnit || !isUnitAliveAndValid(netterUnit) || !isUnitAliveAndValid(targetUnit) || netterUnit.netCooldownTurnsLeft > 0 || netterUnit.isFrozen) return false;

    netterUnit.netCooldownTurnsLeft = NET_COOLDOWN; // Start cooldown immediately
    let hitVisual = false;
     // Use animateAttack for net visual
     hitVisual = await animateAttack(netterUnit, targetUnit, true, 'net');


    let success = false;
    if (hitVisual) {
        // Re-fetch target in case it moved/died during animation
        const stillTarget = units.find(u => u.id === targetUnit.id);
        if (stillTarget && isUnitAliveAndValid(stillTarget) && !stillTarget.isNetted) { // Don't re-net
            playSfx('net_hit');
            stillTarget.isNetted = true;
            stillTarget.nettedTurnsLeft = NET_DURATION;
            if (typeof updateUnitVisualState === 'function') updateUnitVisualState(stillTarget);
            if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(stillTarget);
            success = true;
        }
    }

    finishAction(netterUnit); // Net throw uses the action
    return success;
}

// --- Pathfinding & Targeting ---

function getValidMoves(unit, ignoreActionState = false) { // Add flag to ignore acted state for item collection
    if (!unit || !isUnitAliveAndValid(unit)) return [];

    // Check if unit can move at all this turn, unless ignoring state for item collection
    let canMove = (!levelClearedAwaitingInput && !unit.acted);
    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canMove = true;
    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canMove = true;
    if (ignoreActionState) canMove = true; // Override if collecting items

    if (!canMove || unit.isFrozen || unit.isNetted) return []; // Frozen/Netted prevents movement

    // Determine movement budget
    let distanceLimit = unit.mov; // Start with base movement (includes armor bonus)
    if (!ignoreActionState) { // Penalties only apply during regular turn
         if (unit.isStealthed) distanceLimit -= ROGUE_STEALTH_MOVE_PENALTY;
         if (unit.quickStrikeActive) distanceLimit -= ROGUE_QUICK_STRIKE_MOVE_PENALTY;
    }
    if (unit.isSlowed) distanceLimit -= 1; // Slow applies always
    distanceLimit = Math.max(0, distanceLimit); // Cannot have negative movement

    if (distanceLimit <= 0) return []; // No movement points left

    const moves = [];
    const queue = [{ x: unit.x, y: unit.y, distance: 0 }];
    const visited = new Set([`${unit.x},${unit.y}`]);
    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const unitInTower = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;

    while (queue.length > 0) {
        const current = queue.shift();

        for (const [dx, dy] of directions) {
            const nextX = current.x + dx;
            const nextY = current.y + dy;
            const key = `${nextX},${nextY}`;

            if (!isCellInBounds(nextX, nextY) || visited.has(key)) continue;

            const newDistance = current.distance + 1;
            if (newDistance > distanceLimit) continue;

            const obstacle = getObstacleAt(nextX, nextY);
            const unitOnCell = getUnitAt(nextX, nextY);
            let isBlocked = false;

            // Check standard blocking conditions
            if (unitOnCell && unitOnCell.id !== unit.id) isBlocked = true;
            if (obstacle && obstacle.blocksMove && !obstacle.enterable) isBlocked = true; // Allow moving onto enterable tower cell

             // Check tower-specific movement restrictions
             if (unitInTower) {
                 // Can ONLY move to the cell directly below the tower
                 if (nextX !== unitInTower.x || nextY !== unitInTower.y + 1) {
                      isBlocked = true;
                 }
             } else if (obstacle?.enterable) { // If moving TO a tower cell
                  // Can only move onto tower cell if coming from directly below
                  if (current.y !== nextY + 1 || current.x !== nextX) {
                       isBlocked = true;
                  }
                   // Cannot enter if occupied
                  if (obstacle.occupantUnitId && obstacle.occupantUnitId !== unit.id) {
                       isBlocked = true;
                  }
             }


            if (!isBlocked) {
                moves.push({ x: nextX, y: nextY });
                visited.add(key);
                queue.push({ x: nextX, y: nextY, distance: newDistance });
            }
        }
    }
    return moves;
}


function getValidAttackTargets(unit) {
    const targets = { units: [], obstacles: [] };
    if (!unit || !isUnitAliveAndValid(unit) || unit.isFrozen) return targets;
    // Netted units CAN attack

     // Check if unit has actions left
     let canAttack = !levelClearedAwaitingInput && !unit.acted;
     if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAttack = true;
     if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAttack = true;
     if (!canAttack) return targets; // Cannot attack if no actions left

     // Check if unit CAN attack (Netters have 0 ATK but can net)
     if (unit.atk <= 0 && !unit.canNet) return targets;

    const unitRange = unit.currentRange;
    const ignoreStealthOnTarget = unit.isStealthed; // Attacker ignores stealth if adjacent

    // Find attackable enemy units
    for (const target of units) {
        if (target.team !== unit.team && isUnitAliveAndValid(target)) {
            let targetPosForCheck = target;
            let targetIdForList = target.id;
            let isUnitInTower = false;
            let finalTargetIsTower = false;

            // Check if target is in a tower
            if (target.inTower) {
                const tower = obstacles.find(o => o.id === target.inTower);
                if (tower && isObstacleIntact(tower)) {
                    targetPosForCheck = tower; // Check range/LOS to tower
                    isUnitInTower = true;
                    finalTargetIsTower = true;
                } else continue; // Skip if tower destroyed
            }

            const distance = getDistance(unit, targetPosForCheck);

            // Check range and melee restriction
            if (distance > unitRange || (unit.meleeOnlyAttack && distance > 1)) continue;

             // Check visibility (stealth) & Line of Sight
             const targetIsVisible = !target.isStealthed || // Target isn't stealthed OR
                                      (getDistance(unit, target) <= 1); // Target is adjacent (always visible regardless of stealth)

            if (!targetIsVisible) continue; // Skip stealthed targets > 1 distance away
            if (distance > 1 && !hasLineOfSight(unit, targetPosForCheck, ignoreStealthOnTarget)) continue; // Check LOS for non-adjacent


            // Add target ID to appropriate list
            if (finalTargetIsTower) {
                 if (!targets.obstacles.includes(targetPosForCheck.id)) { // Add tower ID
                      targets.obstacles.push(targetPosForCheck.id);
                 }
            } else {
                 if (!targets.units.includes(targetIdForList)) { // Add unit ID
                      targets.units.push(targetIdForList);
                 }
            }
        }
    }

    // Find attackable obstacles
    for (const target of obstacles) {
         // Check if attackable and intact
        if (target.canBeAttacked && isObstacleIntact(target) && !targets.obstacles.includes(target.id)) {
            const distance = getDistance(unit, target);
             // Check range and melee restriction
             if (distance > unitRange || (unit.meleeOnlyAttack && distance > 1)) continue;
             // Check LOS for ranged attacks against obstacles (except maybe doors?)
             // Doors block LOS, so ranged check should fail unless adjacent
             if (distance > 1 && target.type !== 'door' && !hasLineOfSight(unit, target, ignoreStealthOnTarget)) continue;
             // Special case: Ranged units cannot shoot doors
             if (distance > 1 && target.type === 'door') continue;

            // Check if tower is occupied by friendly unit
            if (target.enterable && target.occupantUnitId) {
                 const unitInside = units.find(u => u.id === target.occupantUnitId);
                 if(unitInside && unitInside.team === unit.team) continue; // Don't target tower with friendly inside
            }

            targets.obstacles.push(target.id);
        }
    }
    return targets;
}


function findPathToTarget(unit, targetX, targetY) {
    if (!unit || unit.isFrozen || unit.isNetted || !isUnitAliveAndValid(unit)) return null;
    if (unit.x === targetX && unit.y === targetY) return [];

    const startNode = { x: unit.x, y: unit.y, g: 0, h: getDistance(unit, { x: targetX, y: targetY }), parent: null };
    const openSet = new Map(); // Use Map for faster lookups { "x,y": node }
    openSet.set(`${startNode.x},${startNode.y}`, startNode);
    const closedSet = new Set(); // { "x,y" }
    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; // 4-directional movement
    const maxSearchNodes = currentGridCols * currentGridRows * 2; // Safety limit
    let nodesSearched = 0;
    const unitInTower = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;

    while (openSet.size > 0 && nodesSearched < maxSearchNodes) {
        nodesSearched++;
        // Find node with lowest F score in openSet
        let currentNode = null;
        let minF = Infinity;
        for (const node of openSet.values()) {
            const f = node.g + node.h;
            if (f < minF) {
                minF = f;
                currentNode = node;
            } else if (f === minF && node.h < currentNode.h) {
                 // Tie-breaking: prefer node closer to target
                 currentNode = node;
            }
        }

        if (!currentNode) break; // Should not happen if openSet is not empty

        const currentKey = `${currentNode.x},${currentNode.y}`;
        openSet.delete(currentKey);
        closedSet.add(currentKey);

        // Found the target
        if (currentNode.x === targetX && currentNode.y === targetY) {
            const path = [];
            let temp = currentNode;
            while (temp.parent) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            return path.reverse();
        }

        // Explore neighbors
        for (const [dx, dy] of directions) {
            const nextX = currentNode.x + dx;
            const nextY = currentNode.y + dy;
            const key = `${nextX},${nextY}`;

            if (!isCellInBounds(nextX, nextY) || closedSet.has(key)) continue;

            const obstacle = getObstacleAt(nextX, nextY);
            const unitOnCell = getUnitAt(nextX, nextY);
            const isTargetCell = (nextX === targetX && nextY === targetY);
            let isWalkable = true;

            // --- Check Walkability ---
            // 1. Occupied by another unit (unless it's the target cell itself)
             if (unitOnCell && !isTargetCell) {
                 // Allow pathing *through* stealthed units if unit is adjacent? No, treat as blocked.
                 isWalkable = false;
             }
            // 2. Blocked by non-enterable obstacle
            if (obstacle && obstacle.blocksMove && !obstacle.enterable) isWalkable = false;
             // 3. Tower movement restrictions
             if (unitInTower && currentNode.parent === null) { // If starting IN a tower
                 // Can ONLY move to the cell directly below
                 if (nextX !== unitInTower.x || nextY !== unitInTower.y + 1) {
                      isWalkable = false;
                 }
             } else if (obstacle?.enterable) { // If moving TO a tower cell
                  // Can only enter from directly below
                  if (currentNode.y !== nextY + 1 || currentNode.x !== nextX) {
                       isWalkable = false;
                  }
                   // Cannot enter if occupied by another unit (unless it's the final target)
                  if (obstacle.occupantUnitId && !isTargetCell) {
                       isWalkable = false;
                  }
             }

            if (isWalkable) {
                const gScore = currentNode.g + 1;
                const hScore = getDistance({ x: nextX, y: nextY }, { x: targetX, y: targetY });
                const existingNode = openSet.get(key);

                if (!existingNode || gScore < existingNode.g) {
                    const neighbor = { x: nextX, y: nextY, g: gScore, h: hScore, parent: currentNode };
                    openSet.set(key, neighbor);
                } else if (existingNode && gScore === existingNode.g && hScore < existingNode.h) {
                    // If g score is same, prefer path with lower h score (closer to target)
                    existingNode.parent = currentNode;
                    existingNode.h = hScore;
                }
            }
        }
    }

    if (nodesSearched >= maxSearchNodes) console.warn("A* pathfinding search limit reached.");
    return null; // No path found
}


// --- Turn Processing & AI ---

function processStatusTicks(team) {
    units.slice().forEach(unit => { // Use slice to iterate over a copy in case units are removed
        if (unit.team === team && isUnitAliveAndValid(unit)) {
            let changed = false; // Flag if visual update is needed

            // --- Decrement Durations ---
            if (unit.isFrozen) {
                unit.frozenTurnsLeft--;
                if (unit.frozenTurnsLeft <= 0) {
                    unit.isFrozen = false;
                    changed = true;
                }
                 // Trigger visual update slightly earlier for player's turn start
                 if(team === 'player' && unit.frozenTurnsLeft === 0 && typeof updateUnitVisualState === 'function') {
                      updateUnitVisualState(unit);
                 }
            }
            if (unit.isNetted) {
                unit.nettedTurnsLeft--;
                if (unit.nettedTurnsLeft <= 0) { unit.isNetted = false; changed = true; }
            }
            if (unit.isSlowed) {
                unit.slowedTurnsLeft--;
                if (unit.slowedTurnsLeft <= 0) { unit.isSlowed = false; changed = true; }
            }
             // Reset temporary flags at the start of the unit's turn
             if (unit.quickStrikeActive) {
                unit.quickStrikeActive = false; // Quick Strike only lasts for the turn it's activated
                changed = true;
             }
              if (unit.isStealthed && team === 'player') {
                   // Stealth persists until attack or manual disable
                   // Need a way to disable stealth manually?
              }
             unit.actionsTakenThisTurn = 0; // Reset action counter

            // --- Decrement Cooldowns ---
            if (unit.type === 'goblin_netter' && unit.netCooldownTurnsLeft > 0) unit.netCooldownTurnsLeft--;
            if (unit.type === 'goblin_shaman' && unit.totemCooldown > 0) unit.totemCooldown--;
            if (unit.type === 'goblin_pyromancer' && unit.flameWaveCooldown > 0) unit.flameWaveCooldown--;


             // --- Passive Effects (Totem Heal) ---
             if (unit.isTotem && team === 'enemy') {
                 const alliesInRange = getUnitsInArea(unit.x, unit.y, unit.range)
                     .filter(u => u.team === 'enemy' && !u.isTotem && u.hp < u.maxHp && isUnitAliveAndValid(u))
                     .sort((a, b) => a.hp - b.hp); // Target lowest HP ally first

                 if (alliesInRange.length > 0) {
                     const targetAlly = alliesInRange[0];
                     const healAmount = unit.healAmount || SHAMAN_TOTEM_HEAL; // Use totem's heal amount
                     const actualHeal = Math.min(healAmount, targetAlly.maxHp - targetAlly.hp);
                     if (actualHeal > 0) {
                         targetAlly.hp += actualHeal;
                         playSfx('shamanHeal');
                         if (typeof showHealPopup === 'function') showHealPopup(targetAlly.x, targetAlly.y, actualHeal);
                         if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetAlly);
                         if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetAlly);
                     }
                 }
             }

              // --- Forest Armor Activation Timer ---
              if(team === 'enemy' && forestArmorActiveTurns > 0) { // Decrement during enemy turn
                   forestArmorActiveTurns--;
                   if(forestArmorActiveTurns === 0) {
                        // Effect wears off, maybe show feedback?
                        if (typeof showFeedback === 'function') showFeedback("Forest Armor protection fades.", "feedback-turn");
                   }
              }


            // Update visuals if any status changed (but delay frozen update for player turn start)
            if (changed && !(team === 'player' && unit.isFrozen)) {
                if (typeof updateUnitVisualState === 'function') {
                    updateUnitVisualState(unit);
                }
                if (typeof updateUnitInfoDisplay === 'function') {
                    updateUnitInfoDisplay(unit); // Update info panel too
                }
            }
        }
    });

     // --- Apply Pending Flame Wave Damage (after enemy statuses ticked) ---
     if (team === 'enemy' && flameWavePending.y !== undefined) {
         const { y: targetRow, damage } = flameWavePending;
         applyFlameWaveDamage(targetRow, damage); // Apply the stored damage
         flameWavePending = {}; // Clear pending wave
     }
}


function applyFlameWaveDamage(targetRow, damage) {
    playSfx('fireballHit'); // Or a specific flame wave hit sound
    let deathPromises = [];

    for (let x = 0; x < currentGridCols; x++) {
        const fw_unit = getUnitAt(x, targetRow);
        const fw_obstacle = getObstacleAt(x, targetRow);

        // Damage Enemy Units
        if (fw_unit && fw_unit.team === 'enemy' && isUnitAliveAndValid(fw_unit)) { // Corrected target team
            let actualDamage = damage;
             if (fw_unit.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) {
                  actualDamage = 1; // Minimum damage
                  if (typeof showFeedback === 'function') showFeedback("Immune!", "feedback-error", 500);
             }

            playSfx('hit'); // Enemy hit sound
            fw_unit.hp -= actualDamage;
            if (fw_unit.hp < 0) fw_unit.hp = 0;
            if (typeof showDamagePopup === 'function') showDamagePopup(fw_unit.x, fw_unit.y, actualDamage);
            if (typeof flashElementOnHit === 'function') flashElementOnHit(fw_unit.element);
            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(fw_unit);
            if (fw_unit.hp <= 0) deathPromises.push(removeUnit(fw_unit));
        }

        // Damage Attackable Obstacles (Doors)
         if (fw_obstacle && fw_obstacle.canBeAttacked && isObstacleIntact(fw_obstacle)) {
              // Add immunity check if obstacles can be immune? Probably not.
              fw_obstacle.hp -= damage; // Use full damage for obstacles?
              if (fw_obstacle.hp < 0) fw_obstacle.hp = 0;
              if (typeof showDamagePopup === 'function') showDamagePopup(fw_obstacle.x, fw_obstacle.y, damage);
              if (typeof flashElementOnHit === 'function') flashElementOnHit(fw_obstacle.element);
              if (fw_obstacle.hp <= 0) deathPromises.push(removeObstacle(fw_obstacle));
         }
    }

    // Check win/loss after damage applied and deaths potentially queued
    Promise.all(deathPromises).then(checkWinLossConditions);
}


function endTurn() {
    if (levelClearedAwaitingInput) {
        // Only action allowed is clicking the proceed button (handled in UI)
        // Or moving units to collect items (handled in moveUnit)
        playSfx('error'); // Play error sound if trying to end turn normally
        return;
    }
    if (currentTurn !== 'player' || isProcessing || isGameOver()) return;

    isProcessing = true; // Prevent player actions during AI turn
    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    if (typeof setActiveSpell === 'function') setActiveSpell(null); // Cancel any active spell targeting
    if (typeof deselectUnit === 'function') deselectUnit(false); // Deselect player unit

    currentTurn = 'enemy';

    // Reset player unit states for their next turn
    units.forEach(u => {
        if (u.team === 'player' && isUnitAliveAndValid(u)) {
             u.acted = false;
             u.actionsTakenThisTurn = 0;
              // Stealth persists until attack or manually disabled (add manual disable later?)
             if(u.quickStrikeActive) u.quickStrikeActive = false; // Quick strike ends at turn end
             // Reset stealth bonus used flag
             u.stealthAttackBonusUsed = false;
        }
    });

    processStatusTicks('enemy'); // Decrement enemy statuses, handle totem heal etc.

    // Reset enemy unit states for their turn
    units.forEach(u => {
        if (u.team === 'enemy' && isUnitAliveAndValid(u)) {
             u.acted = false;
             u.actionsTakenThisTurn = 0;
        }
    });

    triggerGoldMagnetPassive(); // Trigger magnet at end of player turn / start of enemy turn

    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    setTimeout(runAITurn, 400); // Start AI after a short delay
}


function runAITurn() {
    const unitsToAct = units.filter(u => u.team === 'enemy' && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen);
    // Simple sort order: Sappers first, then maybe Treasure Hunters (to flee early), then others?
    unitsToAct.sort((a, b) => {
        if (a.type === 'goblin_sapper' && b.type !== 'goblin_sapper') return -1;
        if (b.type === 'goblin_sapper' && a.type !== 'goblin_sapper') return 1;
        if (a.flees && !b.flees) return -1; // Fleeing units act earlier
        if (!a.flees && b.flees) return 1;
        // Prioritize units that can act (Shaman heal, Netter net etc.)? Maybe not needed yet.
        return b.mov - a.mov; // Faster units act earlier among non-special types
    });

    if (unitsToAct.length === 0) {
        endAITurnSequence();
        return;
    }

    let currentAIUnitIndex = 0;
    const baseActionInterval = 150; // Minimum delay between AI actions
    // Calculate minimum duration based on longest possible animation
    const minActionDuration = Math.max(
         MOVE_ANIMATION_DURATION_MS,
         NET_FLY_DURATION_MS,
         ARROW_FLY_DURATION_MS,
         FIREBALL_PROJECTILE_DURATION_MS
    ) + 100; // Add buffer

    async function processNextAIUnit() {
        if (!isGameActiveFlag || isGameOver() || currentAIUnitIndex >= unitsToAct.length) {
            endAITurnSequence();
            return;
        }
        const unitToProcess = unitsToAct[currentAIUnitIndex];
        currentAIUnitIndex++;

        // Re-check unit validity before acting (it might have died from explosions, flame wave etc.)
        const stillValidUnit = units.find(u => u.id === unitToProcess?.id && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen);

        if (stillValidUnit) {
            const actionStartTime = Date.now();
            try {
                await performAIAction(stillValidUnit);
            } catch (e) {
                console.error(`Error during AI action for unit ${stillValidUnit?.id} (${stillValidUnit?.type}):`, e);
                // Attempt to finish the unit's turn even if an error occurred
                if (isUnitAliveAndValid(stillValidUnit) && !stillValidUnit.acted) {
                    try { finishAction(stillValidUnit); } catch { /* Ignore nested error */ }
                }
            } finally {
                 // Wait before processing next unit to allow animations/effects to be perceived
                 const duration = Date.now() - actionStartTime;
                 const delayNeeded = Math.max(baseActionInterval, minActionDuration - duration);
                 setTimeout(processNextAIUnit, delayNeeded);
            }
        } else {
             // Unit died or became invalid before its turn, process next immediately
             setTimeout(processNextAIUnit, 30);
        }
    }
    // Start the first AI unit action
    setTimeout(processNextAIUnit, 50);
}


function endAITurnSequence() {
    try {
        if (!isGameActiveFlag || isGameOver()) return; // Don't proceed if game ended

        currentTurn = 'player';
        processStatusTicks('player'); // Decrement player statuses, check frost expiration etc.

        // Reset player unit states (most are reset in processStatusTicks, but ensure acted/action count is clear)
        units.forEach(u => {
            if (u.team === 'player' && isUnitAliveAndValid(u)) {
                u.acted = false;
                u.actionsTakenThisTurn = 0;
                 // Quick strike ends at start of player turn if not used
                 if(u.quickStrikeActive) u.quickStrikeActive = false;
                 // Reset stealth bonus flag
                 u.stealthAttackBonusUsed = false;
            }
        });

        // Update UI for all units at start of player turn
        units.forEach(u => {
            if (isUnitAliveAndValid(u) && typeof updateUnitVisualState === 'function') {
                updateUnitVisualState(u); // This now handles frost fade correctly
            }
        });

        if (typeof showFeedback === 'function') showFeedback("Player Turn!", "feedback-turn");
        if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit); // Refresh selected unit info
        if (typeof updateWorldHpBars === 'function') updateWorldHpBars(); // Refresh all world HP bars

    } catch (e) {
        console.error("Error during endAITurnSequence:", e);
    } finally {
        isProcessing = false; // Allow player input
        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
        checkWinLossConditions(); // Final check in case status ticks caused win/loss
    }
}


async function performAIAction(unit) {
    if (!unit || !isUnitAliveAndValid(unit) || unit.acted || unit.isFrozen) {
        if (unit && !unit.acted && isUnitAliveAndValid(unit)) finishAction(unit); // Mark as acted if skipped
        return;
    }

    const livingPlayers = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));
    if (livingPlayers.length === 0) {
        finishAction(unit); // No targets left
        return;
    }

    let actionTaken = false;
    let hasMoved = false;

    // --- Fleeing AI (Treasure Hunter) ---
    if (unit.flees) {
        const nearestPlayer = livingPlayers.reduce((closest, player) => {
            const dist = getDistance(unit, player);
            return dist < closest.dist ? { player, dist } : closest;
        }, { player: null, dist: Infinity }).player;

        if (nearestPlayer) {
            const validMoves = getValidMoves(unit);
            let bestMove = null;
            let maxDist = getDistance(unit, nearestPlayer); // Current distance

            // Find the move that maximizes distance from the NEAREST player, prioritizing safety
            let bestSafeMove = null;
            let maxSafeDist = -Infinity; // Initialize to negative infinity
            let bestUnsafeMove = null;
            let maxUnsafeDist = getDistance(unit, nearestPlayer); // Initialize to current distance


            for (const move of validMoves) {
                 const distAfterMove = getDistance(move, nearestPlayer);
                let isSafe = true;
                 // Check safety against ALL players
                for(const p of livingPlayers) {
                     // Check if the move lands within attack range AND has LOS from any player
                     if(getDistance(move, p) <= p.currentRange && hasLineOfSight(p, move)) {
                          isSafe = false;
                          break;
                     }
                }

                if (isSafe) {
                     if (distAfterMove > maxSafeDist) {
                          maxSafeDist = distAfterMove;
                          bestSafeMove = move;
                     }
                } else { // Unsafe move
                     if (distAfterMove > maxUnsafeDist) {
                          maxUnsafeDist = distAfterMove;
                          bestUnsafeMove = move;
                     }
                }
            }

            // Prioritize the best safe move, otherwise take the best unsafe move if it increases distance
            bestMove = bestSafeMove || (maxUnsafeDist > getDistance(unit, nearestPlayer) ? bestUnsafeMove : null);


            if (bestMove) {
                await moveUnit(unit, bestMove.x, bestMove.y);
                actionTaken = true; // Fleeing uses the action
                hasMoved = true;
            } else {
                // Cornered: Attack if possible
                const attackTargets = getValidAttackTargets(unit);
                // Find the closest attackable player
                 const closestAttackablePlayer = livingPlayers
                     .filter(p => attackTargets.units.includes(p.id))
                     .reduce((closest, player) => {
                         const dist = getDistance(unit, player);
                         return dist < closest.dist ? { player, dist } : closest;
                     }, { player: null, dist: Infinity }).player;

                if (closestAttackablePlayer) {
                    await attack(unit, closestAttackablePlayer.x, closestAttackablePlayer.y);
                    actionTaken = true;
                }
                 // If cannot attack, just finish action (stuck)
            }
        }
         // If no nearest player found (shouldn't happen), finish action
         if(!actionTaken) finishAction(unit);
         return; // Treasure hunter logic complete
    }


    // --- Standard AI ---
    // Find nearest player target
    let targetPlayer = null;
    let minDist = Infinity;
    livingPlayers.forEach(p => {
        const dist = getDistance(unit, p);
        if (dist < minDist) {
            minDist = dist;
            targetPlayer = p;
        }
    });
    if (!targetPlayer) { finishAction(unit); return; } // Should not happen

    let finalTargetObject = targetPlayer; // The actual entity to target (could be tower)
    if (targetPlayer.inTower) {
        const tower = obstacles.find(o => o.id === targetPlayer.inTower);
        if (tower && isObstacleIntact(tower)) finalTargetObject = tower;
        else { finishAction(unit); return; } // Target in destroyed tower, do nothing
    }


    // 1. Special Actions (Sapper, Shaman Heal/Totem, Pyro Fireball/Wave, Netter)
    if (!actionTaken && unit.suicideExplode) {
        if (minDist <= unit.explosionRadius) { // Explode if player is within radius
            await explodeUnit(unit);
            return; // Explosion removes unit
        } else {
             // Move closer if possible
             const path = findPathToTarget(unit, targetPlayer.x, targetPlayer.y);
             if (path && path.length > 0) {
                  const nextStep = path[0];
                  if (getValidMoves(unit).some(m => m.x === nextStep.x && m.y === nextStep.y)) {
                       await moveUnit(unit, nextStep.x, nextStep.y);
                       hasMoved = true;
                        // Check distance again after moving
                        if (getDistance(unit, targetPlayer) <= unit.explosionRadius) {
                             await explodeUnit(unit); // Explode after moving in range
                             return;
                        }
                  }
             }
        }
         // If couldn't move closer or still not in range, proceed to normal actions (or just finish)
         if(hasMoved && !unit.acted) {
            // Sappers usually only move or explode, finish turn after move if didn't explode
             finishAction(unit); return;
         }
    }
    else if (!actionTaken && unit.type === 'goblin_shaman') {
         // Prioritize healing allies > summoning totem > moving/basic attack
        const alliesToHeal = units.filter(u => u.team === 'enemy' && !u.isTotem && u.hp < u.maxHp && getDistance(unit, u) <= unit.range && hasLineOfSight(unit, u) && isUnitAliveAndValid(u)).sort((a, b) => a.hp - b.hp);
        const totemsExist = units.some(u => u.isTotem && isUnitAliveAndValid(u));
        const canSummon = unit.canSummonTotem && unit.totemCooldown <= 0 && !totemsExist;

        if (alliesToHeal.length > 0) {
            const targetAlly = alliesToHeal[0];
             const healAmount = unit.healAmount || SHAMAN_HEAL_AMOUNT;
             const actualHeal = Math.min(healAmount, targetAlly.maxHp - targetAlly.hp);
             if(actualHeal > 0){
                targetAlly.hp += actualHeal;
                playSfx('shamanHeal');
                if (typeof showHealPopup === 'function') showHealPopup(targetAlly.x, targetAlly.y, actualHeal);
                if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetAlly);
                if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetAlly);
                actionTaken = true;
                finishAction(unit); // Healing counts as action
                return; // Done for this turn
             }
        } else if (canSummon) {
            const possibleSpots = getAdjacentCells(unit.x, unit.y);
            let validSpot = possibleSpots.find(spot => isCellInBounds(spot.x, spot.y) && !getUnitAt(spot.x, spot.y) && !getObstacleAt(spot.x, spot.y));
            if (validSpot) {
                const newTotem = createUnit(unit.totemType, validSpot.x, validSpot.y);
                if (newTotem) {
                    if (typeof renderUnit === 'function') renderUnit(newTotem);
                    if (typeof createWorldHpBar === 'function' && gameSettings.showHpBars) createWorldHpBar(newTotem);
                    playSfx('shamanTotem');
                    unit.totemCooldown = SHAMAN_TOTEM_COOLDOWN;
                    actionTaken = true;
                     finishAction(unit); // Summoning counts as action
                     return; // Done for this turn
                }
            }
        }
         // If no special action, proceed to move/attack
    }
    else if (!actionTaken && unit.type === 'goblin_pyromancer') {
        // Prioritize Flame Wave if ready and good target row, else Fireball if in range
         if (unit.canCastFlameWave && unit.flameWaveCooldown <= 0) {
             const targetRow = targetPlayer.y;
             const playersInRow = livingPlayers.filter(p => p.y === targetRow).length;
             // Use wave if multiple targets in row or if single target is close enough
             if (playersInRow >= 2 || (playersInRow === 1 && minDist <= unit.range)) {
                 playSfx('pyroFlameWave');
                 if (typeof animateFlameWave === 'function') animateFlameWave(targetRow, true); // Show preview immediately
                 flameWavePending = { y: targetRow, damage: unit.flameWaveDamage }; // Schedule damage
                 unit.flameWaveCooldown = PYRO_FLAME_WAVE_COOLDOWN;
                 actionTaken = true;
                  finishAction(unit); // Casting wave counts as action
                  return; // Done for this turn
             }
         }
         if (!actionTaken && unit.shootsProjectileType === 'fireball' && minDist <= unit.range && hasLineOfSight(unit, targetPlayer)) {
              await animateAttack(unit, targetPlayer, true, 'fireball');
             // Re-fetch target after animation
             const stillTarget = units.find(u => u.id === targetPlayer.id && isUnitAliveAndValid(u));
             if (stillTarget) {
                 let actualDamage = unit.fireballDamage;
                  if (stillTarget.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) actualDamage = 1;

                  if(stillTarget.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
                  else playSfx('hit');
                  playSfx('fireballHit'); // Explosion sound

                 stillTarget.hp -= actualDamage;
                 if (stillTarget.hp < 0) stillTarget.hp = 0;
                 if (typeof showDamagePopup === 'function') showDamagePopup(stillTarget.x, stillTarget.y, actualDamage);
                 if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element);
                  if (typeof createExplosionEffect === 'function') createExplosionEffect(stillTarget.x, stillTarget.y, 'fireball');
                 if (typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget);
                 if (stillTarget.hp <= 0) await removeUnit(stillTarget);
             }
             actionTaken = true;
             finishAction(unit); // Shooting fireball counts as action
             return; // Done for this turn
         }
          // If no special action, proceed to move/attack
    }
    else if (!actionTaken && unit.canNet && unit.netCooldownTurnsLeft <= 0 && !targetPlayer.isNetted && minDist <= unit.currentRange && hasLineOfSight(unit, targetPlayer)) {
        actionTaken = await throwNet(unit, targetPlayer); // throwNet handles finishAction
        if(actionTaken) return; // Exit if net was thrown successfully
    }


    // 2. Standard Attack/Move Logic (if no special action taken)
    if (!actionTaken) {
        const attackTargets = getValidAttackTargets(unit);
        const targetIsUnit = !!finalTargetObject.team;
        const canAttackDirectly = targetIsUnit
             ? attackTargets.units.includes(finalTargetObject.id)
             : attackTargets.obstacles.includes(finalTargetObject.id);

        // Attack if possible
        if ((unit.atk > 0 || unit.canNet /* Netter can initiate attack even with 0 ATK */) && canAttackDirectly) {
             // Netter specific: if target is in range but not adjacent, try to Net instead of melee
             if(unit.canNet && unit.netCooldownTurnsLeft <= 0 && !targetPlayer.isNetted && distance > 1 && distance <= unit.currentRange && hasLineOfSight(unit, targetPlayer)) {
                   actionTaken = await throwNet(unit, targetPlayer);
                   if(actionTaken) return; // Netted, turn over
             } else if (unit.atk > 0) { // Standard melee/ranged attack
                 await attack(unit, finalTargetObject.x, finalTargetObject.y);
                 actionTaken = true; // Attack handles finishAction unless canMoveAndAttack
                 // If unit *can* move and attack, the attack action might not end the turn yet
                  if (!unit.canMoveAndAttack) return; // If normal unit, turn ends after attack
             }
        }
    }

     // 3. Move (if haven't acted/moved yet, OR if canMoveAndAttack and haven't moved)
     let canStillMove = !hasMoved && !actionTaken; // Can move if nothing else happened
     if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 1 && !hasMoved) { // Allow move before attack for move&attack units
          canStillMove = true;
     }

     if (canStillMove && !unit.isNetted) {
         const movementBudget = unit.mov - (unit.isSlowed ? 1 : 0);
         if (movementBudget > 0) {
             const path = findPathToTarget(unit, targetPlayer.x, targetPlayer.y);
             let chosenMove = null;
             let canAttackAfterMoving = false;

             if (path) {
                  let bestStepIndex = -1;
                  // Find the furthest step within range that allows attacking the primary target
                  for (let i = Math.min(path.length - 1, movementBudget - 1); i >= 0; i--) {
                       const step = path[i];
                       const stepObstacle = getObstacleAt(step.x, step.y);
                       const stepUnit = getUnitAt(step.x, step.y);
                       const canStopHere = !stepUnit && (!stepObstacle || obstacle?.enterable); // Can stop if empty or enterable tower

                       if (canStopHere) {
                            const distToTarget = getDistance(step, finalTargetObject);
                             // Recalculate LOS from the potential move spot
                             const losToTarget = hasLineOfSight({x: step.x, y: step.y, team: unit.team}, finalTargetObject); // Pass temp unit-like object
                            const isAdjacent = distToTarget === 1;

                             // Check if can attack from this step
                            if (distToTarget <= unit.currentRange && losToTarget && (!unit.meleeOnlyAttack || isAdjacent)) {
                                 bestStepIndex = i;
                                 canAttackAfterMoving = true;
                                 break; // Found best spot to attack from
                            }
                       } else {
                            // If cannot stop at this step, cannot consider it for attack position
                            continue;
                       }
                  }

                  // If no attack position found, find the furthest possible move along the path
                  if (bestStepIndex === -1) {
                       for (let i = Math.min(path.length - 1, movementBudget - 1); i >= 0; i--) {
                           const step = path[i];
                           const stepObstacle = getObstacleAt(step.x, step.y);
                           const stepUnit = getUnitAt(step.x, step.y);
                            const canStopHere = !stepUnit && (!stepObstacle || obstacle?.enterable);
                            if (canStopHere) {
                                 bestStepIndex = i;
                                 break; // Found furthest reachable spot
                            }
                       }
                  }

                  if (bestStepIndex !== -1) {
                       chosenMove = path[bestStepIndex];
                  }
             }

             if (chosenMove && (chosenMove.x !== unit.x || chosenMove.y !== unit.y)) {
                 const moved = await moveUnit(unit, chosenMove.x, chosenMove.y);
                 if (moved) {
                     actionTaken = true; // Mark that an action (move) was taken
                     hasMoved = true;
                      // If moved and can attack target, attack now (unless canMoveAndAttack)
                      if (canAttackAfterMoving && !unit.canMoveAndAttack) {
                           // Re-verify target after move
                           let currentTargetCheck = targetPlayer.inTower
                                ? obstacles.find(o => o.id === targetPlayer.inTower)
                                : units.find(u => u.id === targetPlayer.id);
                           if (currentTargetCheck && (currentTargetCheck.team ? isUnitAliveAndValid(currentTargetCheck) : isObstacleIntact(currentTargetCheck))) {
                                const currentAttackTargetsAfterMove = getValidAttackTargets(unit);
                                const canAttackTargetFinally = (currentTargetCheck.team
                                     ? currentAttackTargetsAfterMove.units.includes(currentTargetCheck.id)
                                     : currentAttackTargetsAfterMove.obstacles.includes(currentTargetCheck.id));

                               if (canAttackTargetFinally) {
                                    await attack(unit, currentTargetCheck.x, currentTargetCheck.y);
                                    // Attack handles the final finishAction
                                    return; // Action sequence complete
                               }
                           }
                      }
                       // If it's a move & attack unit, finishAction was called by moveUnit, now check if it can attack
                       else if (canAttackAfterMoving && unit.canMoveAndAttack && !unit.acted) {
                            // Re-verify target after move
                           let currentTargetCheck = targetPlayer.inTower
                                ? obstacles.find(o => o.id === targetPlayer.inTower)
                                : units.find(u => u.id === targetPlayer.id);
                            if (currentTargetCheck && (currentTargetCheck.team ? isUnitAliveAndValid(currentTargetCheck) : isObstacleIntact(currentTargetCheck))) {
                                 const currentAttackTargetsAfterMove = getValidAttackTargets(unit); // Recheck valid targets from new pos
                                 const canAttackTargetFinally = (currentTargetCheck.team
                                      ? currentAttackTargetsAfterMove.units.includes(currentTargetCheck.id)
                                      : currentAttackTargetsAfterMove.obstacles.includes(currentTargetCheck.id));

                                 if (canAttackTargetFinally) {
                                      await attack(unit, currentTargetCheck.x, currentTargetCheck.y);
                                      // Attack will call finishAction again, potentially ending the turn
                                      return;
                                 }
                            }
                       }
                 }
             }
         }
     }


    // Finish action if no specific action was taken or if unit only moved and couldn't attack after
    if (!unit.acted) {
        finishAction(unit);
    }
}


// --- Player Passive Logic ---

function triggerGoldMagnetPassive(movedUnit = null) {
    const magnetLevel = playerPassiveUpgrades.gold_magnet || 0;
    if (magnetLevel === 0) return;

    const radius = GOLD_MAGNET_BASE_RADIUS + magnetLevel - 1;
    let collectedItems = new Set(); // Track item IDs collected this trigger
    let goldCollected = 0;
    let gemsCollected = 0;

    // Determine which units trigger the magnet
    let unitsToCheck = movedUnit ? [movedUnit] : units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));

    unitsToCheck.forEach(unit => {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (Math.abs(dx) + Math.abs(dy) > radius) continue; // Check Manhattan distance

                const checkX = unit.x + dx;
                const checkY = unit.y + dy;
                if (!isCellInBounds(checkX, checkY)) continue;

                // Find gold or gems on the cell that haven't been collected yet
                const itemsOnCell = items.filter(item =>
                    item.x === checkX && item.y === checkY &&
                    !item.collected && !collectedItems.has(item.id) &&
                    (item.type === 'gold' || item.type === 'shiny_gem')
                );

                itemsOnCell.forEach(item => {
                    item.collected = true; // Mark as collected logically
                    collectedItems.add(item.id); // Add to set to prevent double collection

                    const value = item.value || ITEM_DATA[item.type]?.value || 0;
                    goldCollected += value;
                    baseGoldEarnedThisLevel += value; // Add to base gold for stats

                    if (item.type === 'shiny_gem') {
                        gemsCollected++;
                        playSfx('gemPickup'); // Play gem sound immediately
                    }

                    // Animate the item flying towards the triggering unit
                    if (typeof animateItemMagnetPull === 'function') {
                        animateItemMagnetPull(item, unit);
                    } else if (item.element) {
                        item.element.remove(); // Fallback: immediate removal
                    }
                });
            }
        }
    });

    if (goldCollected > 0) {
        playerGold += goldCollected;
        goldCollectedThisLevel += goldCollected; // Add to total for level end screen display

        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();

        // Show feedback message
        let feedbackMsg = `Magnet Lvl ${magnetLevel}: +${goldCollected}<img src="./sprites/gold.png" class="feedback-gold-icon" alt="G">`;
        if (gemsCollected > 0) feedbackMsg += ` (${gemsCollected} Gem${gemsCollected > 1 ? 's' : ''})`;
        if (typeof showFeedback === 'function') showFeedback(feedbackMsg, 'feedback-gold', 1500);

        // Play generic pickup sound only if gems weren't the *only* thing picked up
        if (gemsCollected === 0 || goldCollected > gemsCollected * ITEM_DATA.shiny_gem.valueMin) {
             playSfx('pickup');
        }

        // Update cell item status after animation delay
        setTimeout(() => {
            collectedItems.forEach(itemId => {
                const item = items.find(i => i.id === itemId);
                if (item) updateCellItemStatus(item.x, item.y); // Update the visual state of the cell
            });
             // Remove collected items from the main items array after animation
             items = items.filter(item => !collectedItems.has(item.id));
        }, ITEM_MAGNET_FLY_DURATION_MS + 50);
    }
}


// --- Win/Loss & Level Progression ---

function calculateLevelStats() {
    const initialPlayerUnits = Object.values(activeRosterAtLevelStart || {}).reduce((a, b) => a + b, 0);
    const finalPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)).length;
    // unitsLostThisLevel is already tracked in removeUnit

    let canUseAnySpell = Object.keys(spellsUnlocked).some(spell => spellsUnlocked[spell]);
    const bonusGoldNoSpells = (!spellsUsedThisLevel && canUseAnySpell) ? LEVEL_COMPLETE_BONUS_GOLD.noSpells : 0;

    let bonusGoldFlawless = 0;
    let bonusGoldNoLosses = 0;
    if (unitsLostThisLevel === 0 && finalPlayerUnits > 0) {
        const survivingPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));
        const allSurvivingFullHp = survivingPlayerUnits.every(u => u.hp === u.maxHp);
        if (allSurvivingFullHp) {
            bonusGoldFlawless = LEVEL_COMPLETE_BONUS_GOLD.fullHp;
        }
         // Grant "No Losses" bonus even if not full HP, as long as no units died
         bonusGoldNoLosses = LEVEL_COMPLETE_BONUS_GOLD.noLosses;

    }
     // Check No Armor bonus (only if no losses occurred)
     const bonusGoldNoArmor = (equippedArmorId === 'none' && unitsLostThisLevel === 0) ? LEVEL_COMPLETE_BONUS_GOLD.noArmor : 0;

    const totalBonusGold = bonusGoldNoSpells + bonusGoldFlawless + bonusGoldNoLosses + bonusGoldNoArmor;
    // Total earned = base gold collected + bonuses
    const totalGoldEarnedThisLevel = baseGoldEarnedThisLevel + totalBonusGold;

    return {
        enemiesKilled: enemiesKilledThisLevel,
        unitsLost: unitsLostThisLevel, // Use tracked value
        goldGained: baseGoldEarnedThisLevel, // Show only base gold here
        bonusGoldNoSpells,
        bonusGoldFullHp: bonusGoldFlawless,
        bonusGoldNoLosses,
        bonusGoldNoArmor, // Added
        totalGoldEarned: totalGoldEarnedThisLevel, // Total including bonuses
    };
}

function checkWinLossConditions() {
    // Debounce check if called rapidly
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = setTimeout(() => {
         if (!isGameActiveFlag || isGameOver() || levelClearedAwaitingInput) return;

         const playersLeft = units.some(u => u.team === 'player' && isUnitAliveAndValid(u));
         if (!playersLeft) {
             if (!isGameOver()) gameOver(false); // Player lost
             return;
         }

         // Don't check win condition if AI is still processing or player spells are animating? No, check should be safe.
          // isProcessing check removed from here

         const enemiesLeft = units.some(u => u.team === 'enemy' && isUnitAliveAndValid(u));

         if (!enemiesLeft) {
             levelClearedAwaitingInput = true; // Set flag immediately
             playSfx('levelComplete');
             if (typeof deselectUnit === 'function') deselectUnit(false);
             if (typeof setActiveSpell === 'function') setActiveSpell(null);

             // Calculate stats and add bonus gold *immediately* upon clearing
             const stats = calculateLevelStats();
              const totalEarned = stats.totalGoldEarned; // Get total including bonuses
             playerGold += totalEarned; // Add total earned (base + bonus)
              playerGold = Math.max(0, playerGold); // Ensure gold doesn't go negative

             // Update highest level reached
             if (currentLevel >= highestLevelReached) {
                  highestLevelReached = currentLevel + 1;
             }

             // Check level complete achievements
              checkAchievements('level_complete', { level: currentLevel, stats: stats, equippedArmor: equippedArmorId });

             // Save game immediately after calculating gold and achievements
             if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel, playerGold, gameSettings.playerName);
             saveGameData(); // Save progress including new gold total and highest level

             // Update UI Gold Display
             if (typeof updateGoldDisplay === 'function') updateGoldDisplay();

             // Provide feedback and update turn display
             const remainingCollectibles = items.some(item => !item.collected && (item.type !== 'chest' || !item.opened));
             const feedbackMsg = remainingCollectibles ? "Enemies Cleared!<br>Collect items or proceed." : "Level Cleared!";
             if (typeof showFeedback === 'function') showFeedback(feedbackMsg, "feedback-levelup");
             if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); // Updates End Turn button to Proceed
              // Stop further win checks for this level
         }
    }, 100); // Small delay to prevent rapid checks
}



function startNextLevel() {
    if (isGameOver()) return;
    currentLevel++;
    levelToRestartOnLoss = currentLevel; // Update restart level
    levelClearedAwaitingInput = false;
    initGame(currentLevel); // Initialize the next level
}

function forfeitLevel() {
    if (!isGameActiveFlag || isProcessing || isGameOver()) return;
    isGameActiveFlag = false;
    levelClearedAwaitingInput = false;
    // isProcessing = true; // Don't set processing, let gameOver handle it
    stopMusic();
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = null;
    playSfx('forfeit');

    // Calculate penalty: Lose gold gained THIS level + 5% of gold before starting level
    const goldBeforeLevel = playerGold - baseGoldEarnedThisLevel; // Use base gold earned for calculation
    const penaltyPercentage = 0.05;
    const startGoldPenalty = Math.floor(goldBeforeLevel * penaltyPercentage);
    const levelGainLost = baseGoldEarnedThisLevel; // Lose all base gold gained
    const totalPenalty = levelGainLost + startGoldPenalty;
    const goldBeforePenalty = playerGold;

    playerGold = Math.max(0, goldBeforeLevel - startGoldPenalty); // Apply penalty to starting gold

    let messageText = `Level ${currentLevel} Forfeited!<br>`;
    messageText += `Penalty: Lost ${levelGainLost} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"> (level gain) + ${startGoldPenalty} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"> (5% penalty).<br>`;
    messageText += `Gold: ${goldBeforePenalty} -> ${playerGold}`;

    // Save score as if level wasn't completed
    if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel - 1, playerGold, gameSettings.playerName);
    saveGameData(); // Save the adjusted gold
    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
    if (typeof deselectUnit === 'function') deselectUnit(false);
    if (typeof setActiveSpell === 'function') setActiveSpell(null);
    if (typeof showGameOverScreen === 'function') showGameOverScreen(false, messageText, true); // Show game over as forfeit
}


function gameOver(playerWonGame, customMessage = "", isForfeit = false) {
    if (isGameOver()) return; // Prevent multiple game overs
    isGameActiveFlag = false;
    levelClearedAwaitingInput = false;
    // isProcessing = true; // Stop further actions - Removed, UI overlay handles this
    stopMusic();
    if (winCheckTimeout) clearTimeout(winCheckTimeout);
    winCheckTimeout = null;

    let messageText = customMessage || "";
    let isTrueVictory = playerWonGame; // Currently unused, game only ends on loss/forfeit

    if (!messageText && !isTrueVictory && !isForfeit) { // Standard loss scenario
        playSfx('gameOver');
        // Calculate penalty: Lose 5% of gold held *before* starting the level
        const goldBeforeLevel = playerGold - baseGoldEarnedThisLevel; // Use base gold for penalty calc
        const penaltyPercentage = 0.05;
        const penaltyAmount = Math.floor(goldBeforeLevel * penaltyPercentage);
        const goldBeforePenalty = playerGold; // Store gold before penalty for message

        playerGold = Math.max(0, goldBeforeLevel - penaltyAmount); // Apply penalty

        messageText = `You have fallen on Level ${currentLevel}!<br>`;
        messageText += `Lost ${penaltyAmount} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"> (5% penalty).<br>`;
        messageText += `Gold: ${goldBeforePenalty} -> ${playerGold}`;

        // Save score based on the level *before* the loss
        if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel - 1, playerGold, gameSettings.playerName);

    } else if (!playerWonGame) { // Forfeit or custom defeat message
        // Sound already played in forfeitLevel if applicable
        if (!isForfeit) playSfx('gameOver');
        // Gold penalty handled in forfeitLevel, just use the message passed in
    }

    saveGameData(); // Save the final gold amount
    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
    if (typeof deselectUnit === 'function') deselectUnit(false);
    if (typeof setActiveSpell === 'function') setActiveSpell(null);
    if (typeof showGameOverScreen === 'function') showGameOverScreen(isTrueVictory, messageText, isForfeit);
}


function isGameOver() {
    // Check if the game over screen is actually visible in the UI
    return typeof isGameOverScreenVisible === 'function' && isGameOverScreenVisible();
}
function isGameActive() {
    return isGameActiveFlag;
}

// --- Shop & Roster Logic ---

function getRecruitCost(unitType) {
    const baseCost = RECRUIT_BASE_COSTS[unitType] || 99999;
    const ownedCount = playerOwnedUnits[unitType] || 0;
    return baseCost + (ownedCount * RECRUIT_COST_INCREASE_PER_UNIT);
}

function purchaseUnit(unitType) {
    const cost = getRecruitCost(unitType);
    const currentOwnedForType = playerOwnedUnits[unitType] || 0;
    const totalOwnedBefore = Object.values(playerOwnedUnits).reduce((sum, count) => sum + count, 0);
    const maxOfType = MAX_OWNED_PER_TYPE;

    if (playerGold >= cost && currentOwnedForType < maxOfType) {
        playerGold -= cost;
        playerOwnedUnits[unitType] = currentOwnedForType + 1;
        const totalOwnedAfter = totalOwnedBefore + 1;

        // Check if Tactical Command unlock condition met
        const shouldPopup = (totalOwnedBefore < TACTICAL_COMMAND_UNLOCK_UNITS && totalOwnedAfter >= TACTICAL_COMMAND_UNLOCK_UNITS);
        // Add to roster if space available and not triggering TC popup
        if (getTotalActiveUnits() < maxActiveRosterSize && !shouldPopup) {
            addUnitToActiveRoster(unitType);
        }
        saveGameData();
         checkAchievements('recruit', { target: unitType, count: playerOwnedUnits[unitType] });
        return { success: true, showTroopsPopup: shouldPopup };
    }
    return { success: false };
}

function purchaseUnitUpgrade(upgradeType) {
     // Check if upgradeType exists in the cost config
     if (!UNIT_UPGRADE_COSTS.hasOwnProperty(upgradeType)) {
          console.error(`Invalid unit upgrade type: ${upgradeType}`);
          return false;
     }
    const cost = UNIT_UPGRADE_COSTS[upgradeType];
    if (cost === undefined || playerGold < cost) return false;
    playerGold -= cost;
    playerUnitUpgrades[upgradeType] = (playerUnitUpgrades[upgradeType] || 0) + 1;
    saveGameData();
     // Could add achievements for maxing upgrades?
    return true;
}

function purchaseAbilityUpgrade(abilityId) {
     // Check if ability exists in cost config
     if (!ABILITY_UPGRADE_COSTS.hasOwnProperty(abilityId)) {
          console.error(`Invalid ability upgrade type: ${abilityId}`);
          return false;
     }
     const cost = ABILITY_UPGRADE_COSTS[abilityId];
     if (cost === undefined || playerGold < cost) return false;
     // Check if already purchased (assuming 1 level only)
     if((playerAbilityUpgrades[abilityId] || 0) >= 1) return false;

     playerGold -= cost;
     playerAbilityUpgrades[abilityId] = 1; // Mark as purchased
     saveGameData();
      // Apply effect immediately if possible (e.g., set unit.canQuickStrike=true for all rogues)
     if (abilityId === 'rogue_quickstrike') {
          units.forEach(u => { if(u.type === 'rogue') u.canQuickStrike = true; });
          // Also update any existing rogue units in the roster/owned units data if needed outside level?
          // For now, just affects units currently in game. Will be saved.
     }
     return true;
}

function calculateSpellCost(spellName) {
    const config = SPELL_UPGRADE_CONFIG[spellName];
    if (!config) return 99999; // Invalid spell
    const currentLevel = playerSpellUpgrades[spellName] || 0;
    if (currentLevel >= config.maxLevel) return Infinity; // Max level reached
    return config.baseCost + (currentLevel * config.costIncrease);
}

function purchaseSpellUpgrade(spellName) {
    const config = SPELL_UPGRADE_CONFIG[spellName];
    if (!config) return false;
    const currentUpgradeLevel = playerSpellUpgrades[spellName] || 0;
    const cost = calculateSpellCost(spellName);
    // Use highestLevelReached for requirement check
    const meetsLevelReq = highestLevelReached > config.requiredLevel;

    if (playerGold >= cost && currentUpgradeLevel < config.maxLevel && meetsLevelReq) {
        playerGold -= cost;
        playerSpellUpgrades[spellName]++;
        saveGameData();
        // Could add achievements for maxing spells
        return true;
    }
    return false;
}

function purchasePassive(passiveId) {
    const cost = PASSIVE_UPGRADE_COSTS[passiveId];
    if (cost === undefined) return false; // Only Tactical Command is purchasable

    if (passiveId === 'tactical_command') {
        const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0;
        const canBuyMore = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) < MAX_ACTIVE_ROSTER_SIZE_MAX;
        const meetsUnitReq = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0) >= TACTICAL_COMMAND_UNLOCK_UNITS;

        if (playerGold >= cost && canBuyMore && meetsUnitReq) {
            playerGold -= cost;
            playerPassiveUpgrades.tactical_command = currentBonusSlots + 1;
            maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE + playerPassiveUpgrades.tactical_command;
            saveGameData();
            checkAchievements('roster_full'); // Check if this purchase maxed the roster
            return true;
        }
    }
    return false;
}

function equipArmor(armorId) {
     if (!ARMOR_DATA[armorId]) return false; // Invalid armor
     const ownedLevel = playerOwnedArmor[armorId] || 0;
     // Allow equipping grey or none always, others only if owned
     if (ownedLevel > 0 || armorId === 'grey' || armorId === 'none') {
          equippedArmorId = armorId;
          applyArmorBonuses(); // Re-apply stats for all player units
          saveGameData();
          // Update shop immediately to reflect equipped status
           if (typeof updateShopDisplay === 'function') updateShopDisplay();
           if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit); // Refresh info panel if unit selected
          return true;
     }
     return false; // Not owned
}

function getTotalActiveUnits() {
    if (!playerActiveRoster) return 0;
    return Object.values(playerActiveRoster).reduce((sum, count) => sum + (parseInt(count, 10) || 0), 0);
}

function addUnitToActiveRoster(unitType) {
    const currentOwned = playerOwnedUnits[unitType] || 0;
    const currentActive = playerActiveRoster[unitType] || 0;
    const totalActive = getTotalActiveUnits();

    if (currentActive < currentOwned && totalActive < maxActiveRosterSize) {
        playerActiveRoster[unitType] = currentActive + 1;
        saveGameData();
         checkAchievements('roster_full'); // Check if roster is now full
        return true;
    }
    return false;
}

function removeUnitFromActiveRoster(unitType) {
    const currentActive = playerActiveRoster[unitType] || 0;
    if (currentActive > 0) {
        playerActiveRoster[unitType] = currentActive - 1;
        if (playerActiveRoster[unitType] === 0) {
            delete playerActiveRoster[unitType]; // Clean up if count is zero
        }
        saveGameData();
        return true;
    }
    return false;
}

// --- Save/Load ---
function saveGameData() {
    try {
        localStorage.setItem(STORAGE_KEY_HIGHEST_LEVEL, highestLevelReached.toString());
        localStorage.setItem(STORAGE_KEY_GOLD, playerGold.toString());
        localStorage.setItem(STORAGE_KEY_OWNED_UNITS, JSON.stringify(playerOwnedUnits));
        localStorage.setItem(STORAGE_KEY_ACTIVE_ROSTER, JSON.stringify(playerActiveRoster));
        localStorage.setItem(STORAGE_KEY_UNIT_UPGRADES, JSON.stringify(playerUnitUpgrades));
        localStorage.setItem(STORAGE_KEY_SPELL_UPGRADES, JSON.stringify(playerSpellUpgrades));
        localStorage.setItem(STORAGE_KEY_ABILITY_UPGRADES, JSON.stringify(playerAbilityUpgrades)); // Save ability upgrades
        localStorage.setItem(STORAGE_KEY_PASSIVE_UPGRADES, JSON.stringify(playerPassiveUpgrades));
        localStorage.setItem(STORAGE_KEY_OWNED_ARMOR, JSON.stringify(playerOwnedArmor)); // Save owned armor
        localStorage.setItem(STORAGE_KEY_EQUIPPED_ARMOR, equippedArmorId); // Save equipped armor ID
        localStorage.setItem(STORAGE_KEY_ACHIEVEMENT_PROGRESS, JSON.stringify(achievementProgress)); // Save achievements
        localStorage.setItem(STORAGE_KEY_CHEAT_SPELL_ATK, playerCheatSpellAttackBonus.toString());
        localStorage.setItem(STORAGE_KEY_MAX_ROSTER_SIZE, maxActiveRosterSize.toString());
        localStorage.setItem(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL, lastTreasureHunterLevel.toString());
        saveSettings(); // Save settings along with game data
    } catch (e) {
        console.warn("Could not save game data.", e);
        // Potentially show a warning to the user if storage fails
    }
}

function loadGameData() {
    try {
        // Load basic stats
        highestLevelReached = parseInt(localStorage.getItem(STORAGE_KEY_HIGHEST_LEVEL) || '1', 10) || 1;
        playerGold = parseInt(localStorage.getItem(STORAGE_KEY_GOLD) || '0', 10) || 0;
        playerCheatSpellAttackBonus = parseInt(localStorage.getItem(STORAGE_KEY_CHEAT_SPELL_ATK) || '0', 10) || 0;
        maxActiveRosterSize = parseInt(localStorage.getItem(STORAGE_KEY_MAX_ROSTER_SIZE) || MAX_ACTIVE_ROSTER_SIZE_BASE.toString(), 10) || MAX_ACTIVE_ROSTER_SIZE_BASE;
        lastTreasureHunterLevel = parseInt(localStorage.getItem(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL) || '-999', 10) || -999;

        // Load Owned Units (handle new rogue unit)
        const defaultOwnedUnits = { knight: 3, archer: 0, champion: 0, rogue: 0 };
        const storedOwnedUnits = localStorage.getItem(STORAGE_KEY_OWNED_UNITS);
        playerOwnedUnits = storedOwnedUnits ? JSON.parse(storedOwnedUnits) : { ...defaultOwnedUnits };
        Object.keys(UNIT_DATA).forEach(key => {
            if (UNIT_DATA[key].team === 'player') {
                if (!(key in playerOwnedUnits)) playerOwnedUnits[key] = 0; // Add new units if save is old
                playerOwnedUnits[key] = Math.max(0, Math.min(parseInt(playerOwnedUnits[key] || '0', 10), MAX_OWNED_PER_TYPE));
            }
        });
        // If starting fresh and have 0 units, grant defaults
        if (Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) === 0 && highestLevelReached <= 1) {
            playerOwnedUnits = { ...defaultOwnedUnits };
        }

         // Load Active Roster (validate against owned and max size)
         const storedActiveRoster = localStorage.getItem(STORAGE_KEY_ACTIVE_ROSTER);
         let loadedRoster = storedActiveRoster ? JSON.parse(storedActiveRoster) : {};
         let totalActive = 0;
         const validatedRoster = {};
         Object.keys(playerOwnedUnits).forEach(type => {
             // Ensure type exists in current UNIT_DATA
             if (!UNIT_DATA[type] || UNIT_DATA[type].team !== 'player') return;
             const ownedCount = playerOwnedUnits[type] || 0;
             const activeCount = Math.min(ownedCount, parseInt(loadedRoster[type] || '0', 10));
             if (activeCount > 0) {
                 if (totalActive + activeCount <= maxActiveRosterSize) {
                     validatedRoster[type] = activeCount;
                     totalActive += activeCount;
                 } else if (totalActive < maxActiveRosterSize) {
                     // Fill remaining space if possible
                     const canAdd = maxActiveRosterSize - totalActive;
                     validatedRoster[type] = canAdd;
                     totalActive += canAdd;
                 }
             }
         });
         playerActiveRoster = validatedRoster;
         // If roster ended up empty but units are owned, add default unit(s)
          if (totalActive === 0 && Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) > 0) {
               playerActiveRoster = {};
               let currentTotal = 0;
               const ownedOrder = Object.keys(playerOwnedUnits).sort((a, b) => {
                   if(a === 'knight') return -1; if(b === 'knight') return 1; // Prioritize knight
                   return playerOwnedUnits[b] - playerOwnedUnits[a];
               });
               for (const type of ownedOrder) {
                    if(!UNIT_DATA[type] || UNIT_DATA[type].team !== 'player') continue;
                   const canAdd = Math.min(playerOwnedUnits[type], maxActiveRosterSize - currentTotal);
                   if (canAdd > 0) {
                       playerActiveRoster[type] = canAdd;
                       currentTotal += canAdd;
                   }
                   if (currentTotal >= maxActiveRosterSize) break;
               }
          }


        // Load Unit Upgrades (handle new rogue)
        const defaultUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 };
        const storedUnitUpgrades = localStorage.getItem(STORAGE_KEY_UNIT_UPGRADES);
        playerUnitUpgrades = storedUnitUpgrades ? JSON.parse(storedUnitUpgrades) : { ...defaultUnitUpgrades };
        Object.keys(defaultUnitUpgrades).forEach(key => {
            if (!(key in playerUnitUpgrades)) playerUnitUpgrades[key] = defaultUnitUpgrades[key];
            playerUnitUpgrades[key] = Math.max(0, parseInt(playerUnitUpgrades[key] || '0', 10));
        });

        // Load Ability Upgrades
         const defaultAbilityUpgrades = { rogue_quickstrike: 0 };
         const storedAbilityUpgrades = localStorage.getItem(STORAGE_KEY_ABILITY_UPGRADES);
         playerAbilityUpgrades = storedAbilityUpgrades ? JSON.parse(storedAbilityUpgrades) : { ...defaultAbilityUpgrades };
         Object.keys(defaultAbilityUpgrades).forEach(key => {
             if (!(key in playerAbilityUpgrades)) playerAbilityUpgrades[key] = defaultAbilityUpgrades[key];
             playerAbilityUpgrades[key] = Math.max(0, parseInt(playerAbilityUpgrades[key] || '0', 10));
         });


        // Load Spell Upgrades
        const defaultSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
        const storedSpellUpgrades = localStorage.getItem(STORAGE_KEY_SPELL_UPGRADES);
        playerSpellUpgrades = storedSpellUpgrades ? JSON.parse(storedSpellUpgrades) : { ...defaultSpellUpgrades };
        Object.keys(defaultSpellUpgrades).forEach(key => {
            if (!(key in playerSpellUpgrades)) playerSpellUpgrades[key] = defaultSpellUpgrades[key];
            const maxLvl = SPELL_UPGRADE_CONFIG[key]?.maxLevel ?? 99;
            playerSpellUpgrades[key] = Math.max(0, Math.min(parseInt(playerSpellUpgrades[key] || '0', 10), maxLvl));
        });

        // Load Passive Upgrades
        const defaultPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 };
        const storedPassiveUpgrades = localStorage.getItem(STORAGE_KEY_PASSIVE_UPGRADES);
        playerPassiveUpgrades = storedPassiveUpgrades ? JSON.parse(storedPassiveUpgrades) : { ...defaultPassiveUpgrades };
        Object.keys(defaultPassiveUpgrades).forEach(key => {
            if (!(key in playerPassiveUpgrades)) playerPassiveUpgrades[key] = defaultPassiveUpgrades[key];
            if (key === 'gold_magnet' || key === 'tactical_command') {
                 playerPassiveUpgrades[key] = Math.max(0, parseInt(playerPassiveUpgrades[key] || '0', 10));
            }
        });
         // Recalculate max roster size based on loaded passive
        maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE + (playerPassiveUpgrades.tactical_command || 0);
        maxActiveRosterSize = Math.max(MAX_ACTIVE_ROSTER_SIZE_BASE, Math.min(maxActiveRosterSize, MAX_ACTIVE_ROSTER_SIZE_MAX));


        // Load Armor Data
        const defaultOwnedArmor = { grey: 1 }; // Grey always owned at level 1
        const storedOwnedArmor = localStorage.getItem(STORAGE_KEY_OWNED_ARMOR);
        playerOwnedArmor = storedOwnedArmor ? JSON.parse(storedOwnedArmor) : { ...defaultOwnedArmor };
         // Ensure grey armor exists and is at least level 1
         playerOwnedArmor['grey'] = Math.max(1, playerOwnedArmor['grey'] || 1);
         // Ensure other loaded armors have at least level 1 if present
         Object.keys(playerOwnedArmor).forEach(id => { if(id !== 'grey') playerOwnedArmor[id] = Math.max(1, playerOwnedArmor[id] || 0); });

        equippedArmorId = localStorage.getItem(STORAGE_KEY_EQUIPPED_ARMOR) || 'grey';
         // Validate equipped armor - if not owned (or invalid ID), default to grey
         if (!playerOwnedArmor[equippedArmorId] && equippedArmorId !== 'none') {
             equippedArmorId = 'grey';
         }

         // Load Achievement Progress
         const storedAchievements = localStorage.getItem(STORAGE_KEY_ACHIEVEMENT_PROGRESS);
         achievementProgress = storedAchievements ? JSON.parse(storedAchievements) : {};


        // Final clamping/validation
        playerGold = Math.max(0, playerGold);
        playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus);

        // Load Settings last
        loadSettings();

    } catch (e) {
        console.warn("Could not load game data. Starting fresh.", e);
        // Reset to defaults if loading failed
        highestLevelReached = 1; playerGold = 0;
        playerOwnedUnits = { knight: 3, archer: 0, champion: 0, rogue: 0 };
        maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE;
        playerActiveRoster = { knight: Math.min(3, maxActiveRosterSize) };
        playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0, rogue_hp: 0, rogue_atk: 0 };
        playerAbilityUpgrades = { rogue_quickstrike: 0 };
        playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
        playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 };
        playerOwnedArmor = { grey: 1 }; equippedArmorId = 'grey';
        achievementProgress = {};
        playerCheatSpellAttackBonus = 0;
        lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN;
        gameSettings = { ...DEFAULT_GAME_SETTINGS };
        saveSettings(); // Save default settings if load failed
    }
}


function loadSettings() {
    const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (storedSettings) {
        try {
            const parsedSettings = JSON.parse(storedSettings);
            // Merge loaded settings with defaults to handle missing keys
            gameSettings = { ...DEFAULT_GAME_SETTINGS, ...parsedSettings };
            // Validate loaded values
            gameSettings.showHpBars = gameSettings.showHpBars === true;
            gameSettings.playerName = typeof gameSettings.playerName === 'string' ? gameSettings.playerName.substring(0, 12).trim() : DEFAULT_GAME_SETTINGS.playerName;
            gameSettings.musicVolume = typeof gameSettings.musicVolume === 'number' ? Math.max(0, Math.min(1, gameSettings.musicVolume)) : DEFAULT_GAME_SETTINGS.musicVolume;
            gameSettings.sfxVolume = typeof gameSettings.sfxVolume === 'number' ? Math.max(0, Math.min(1, gameSettings.sfxVolume)) : DEFAULT_GAME_SETTINGS.sfxVolume;
            gameSettings.mute = gameSettings.mute === true;

        } catch (e) {
             console.warn("Failed to parse settings, using defaults.", e);
            gameSettings = { ...DEFAULT_GAME_SETTINGS };
        }
    } else {
        gameSettings = { ...DEFAULT_GAME_SETTINGS };
    }
     // Apply loaded settings to runtime variables
     musicVolume = gameSettings.musicVolume;
     sfxVolume = gameSettings.sfxVolume;
     isMuted = gameSettings.mute;

     // Update UI elements if they exist
    if (typeof updateHpBarSettingUI === 'function') updateHpBarSettingUI(gameSettings.showHpBars);
    if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility();
     if (typeof updateMuteButtonVisual === 'function') updateMuteButtonVisual();
     if (typeof updateAudioVolumeDisplays === 'function') updateAudioVolumeDisplays(); // Function needed in UI to set slider pos
     if (typeof updatePlayerNameInput === 'function') updatePlayerNameInput(); // Function needed in UI
}

function saveSettings() {
     // Ensure current runtime state matches gameSettings before saving
     gameSettings.musicVolume = musicVolume;
     gameSettings.sfxVolume = sfxVolume;
     gameSettings.mute = isMuted;
    try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(gameSettings));
    } catch (e) {
        console.warn("Could not save settings.", e);
    }
}

function updateSetting(key, value) {
    if (gameSettings.hasOwnProperty(key)) {
        let changed = false;
        if (key === 'playerName' && typeof value === 'string') {
             const cleanName = value.substring(0, 12).trim();
             if(gameSettings.playerName !== cleanName) {
                  gameSettings.playerName = cleanName || DEFAULT_GAME_SETTINGS.playerName;
                  changed = true;
             }
        } else if (key === 'showHpBars') {
             const boolValue = value === true;
             if(gameSettings.showHpBars !== boolValue) {
                  gameSettings.showHpBars = boolValue;
                  if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility();
                  changed = true;
             }
        } else if (key === 'musicVolume') {
             const numValue = Math.max(0, Math.min(1, parseFloat(value)));
             if(musicVolume !== numValue) {
                  setVolume('music', numValue); // Updates internal var and audio elements
                  gameSettings.musicVolume = musicVolume; // Store the clamped value
                  changed = true;
             }
        } else if (key === 'sfxVolume') {
              const numValue = Math.max(0, Math.min(1, parseFloat(value)));
               if(sfxVolume !== numValue) {
                   setVolume('sfx', numValue);
                   gameSettings.sfxVolume = sfxVolume;
                   changed = true;
               }
        } else if (key === 'mute') {
             const boolValue = value === true;
              if(isMuted !== boolValue) {
                   toggleMute(false); // Toggle internal state without saving again
                   gameSettings.mute = isMuted; // Store the new state
                   changed = true;
              }
        }
        // Note: Fullscreen isn't saved as a setting, it's a browser state

        if (changed) {
             saveSettings(); // Save settings if a value actually changed
        }
    }
}

// --- Cheats ---
function applyCheatGold(amount) { playerGold += amount; playerGold = Math.max(0, playerGold); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof updateShopDisplay === 'function') updateShopDisplay(); if (typeof updateChooseTroopsScreen === 'function') updateChooseTroopsScreen(); playSfx('cheat'); if (typeof showFeedback === 'function') showFeedback(`CHEAT: +${amount} Gold!`, "feedback-cheat"); }
function applyCheatSpellAttack(amount) { playerCheatSpellAttackBonus += amount; playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); saveGameData(); playSfx('cheat'); if (typeof showFeedback === 'function') showFeedback(`CHEAT: Spell ATK +${amount}!`, "feedback-cheat"); if (typeof updateSpellUI === 'function') updateSpellUI(); }

// --- UI Integration Helpers ---
function toggleWorldHpBarsVisibility() { updateSetting('showHpBars', !gameSettings.showHpBars); if (typeof updateHpBarSettingUI === 'function') updateHpBarSettingUI(gameSettings.showHpBars); }

// --- Achievement Logic ---
function checkAchievements(eventType, data = {}) {
     let achievementUnlocked = false;
     for (const id in ACHIEVEMENT_DATA) {
         const achData = ACHIEVEMENT_DATA[id];
         const progress = achievementProgress[id] || { current: 0, unlocked: false };

         if (progress.unlocked) continue; // Already unlocked

         let conditionMet = false;
         const condition = achData.condition;

         try { // Add try-catch around condition checking
             switch (condition.type) {
                 case 'kill':
                     if (eventType === 'kill' && data.type === condition.target) {
                         progress.current = (progress.current || 0) + 1;
                         if (progress.current >= condition.count) conditionMet = true;
                     }
                     break;
                 case 'kill_multiple':
                     if (eventType === 'kill' && condition.targets.includes(data.type)) {
                         progress.current = (progress.current || 0) + 1;
                         if (progress.current >= condition.count) conditionMet = true;
                     }
                     break;
                 case 'kill_boss':
                     if (eventType === 'kill' && data.isBoss && data.world === condition.world) {
                         conditionMet = true;
                     }
                     break;
                 case 'reach_level':
                     // Check against highestLevelReached, typically after completing the *previous* level
                      if ((eventType === 'level_complete' || eventType === 'load_game') && highestLevelReached >= condition.level) {
                          conditionMet = true;
                      }
                     break;
                 case 'level_complete_condition':
                     if (eventType === 'level_complete') {
                          if(condition.condition === 'no_armor' && data.equippedArmor === 'none' && data.stats?.unitsLost === 0) conditionMet = true; // Added no loss condition
                          if(condition.condition === 'full_hp' && data.stats?.bonusGoldFullHp > 0) conditionMet = true;
                          if(condition.condition === 'no_losses' && data.stats?.bonusGoldNoLosses > 0) conditionMet = true;
                          if(condition.condition === 'no_spells' && data.stats?.bonusGoldNoSpells > 0) conditionMet = true;
                     }
                     break;
                 case 'recruit':
                     if (eventType === 'recruit' && data.target === condition.target) {
                         progress.current = data.count; // Set current to total owned count
                         if (progress.current >= condition.count) conditionMet = true;
                     }
                     break;
                 case 'roster_full':
                      if (eventType === 'recruit' || eventType === 'roster_change' || eventType === 'passive_purchase') {
                           if (getTotalActiveUnits() >= maxActiveRosterSize) conditionMet = true;
                      }
                     break;
                 case 'collect_armor':
                      if (eventType === 'collect_armor' || eventType === 'load_game') {
                           // Count how many core armors (excluding grey/none) are owned at level >= 1
                            const coreArmorIds = ['forest', 'azure', 'ember', 'sand'];
                            const ownedCoreCount = coreArmorIds.filter(armorId => (playerOwnedArmor[armorId] || 0) >= 1).length;
                            progress.current = ownedCoreCount;
                            if(progress.current >= condition.count) conditionMet = true;
                      }
                      break;
                  // Add more cases for other achievement types
             }
         } catch (e) {
             console.error(`Error checking achievement condition for ${id}:`, e);
         }

         achievementProgress[id] = progress; // Update progress even if not unlocked

         if (conditionMet && !progress.unlocked) {
             progress.unlocked = true;
             achievementUnlocked = true;
             console.log(`Achievement Unlocked: ${achData.title}`);
             if (achData.reward?.gold > 0) {
                 playerGold += achData.reward.gold;
                 if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
                 // Delay feedback slightly to avoid overlapping other messages
                  setTimeout(() => {
                       if (typeof showFeedback === 'function') showFeedback(`Achievement: ${achData.title} (+${achData.reward.gold}G)!`, 'feedback-achievement-unlock', 4000);
                       playSfx('achievementUnlock');
                  }, 200);
             } else {
                  setTimeout(() => {
                       if (typeof showFeedback === 'function') showFeedback(`Achievement Unlocked: ${achData.title}!`, 'feedback-achievement-unlock', 3500);
                       playSfx('achievementUnlock');
                 }, 200);
             }
             // Optionally update achievement UI if visible
             if (isAchievementsOpen() && typeof updateAchievementsScreen === 'function') {
                  updateAchievementsScreen();
             }
         }
     }

     if(achievementUnlocked) {
          saveGameData(); // Save progress if any achievement was unlocked
     }
}



// --- Recolor ---
async function initializeSpriteRecoloring() {
    console.log("Initializing sprite recoloring...");
    const recolorPromises = SPRITE_KEYS_FOR_RECOLOR.map(async (spriteKey) => {
        const isBaseArmor = (spriteKey === 'armor');
        const basePath = isBaseArmor ? './sprites/armor.png' : `./sprites/${spriteKey}.png`;

        generatedSpriteUrls[spriteKey] = {}; // Initialize sub-object
        const image = new Image();
        image.crossOrigin = "Anonymous"; // Needed for canvas operations

        try {
            image.src = basePath;
            await image.decode(); // Wait for image to load fully

            if (isBaseArmor) {
                // Handle Armor Recoloring
                generatedSpriteUrls[spriteKey]['grey'] = image.src; // Store original path/dataURL as 'grey'
                for (const armorId in ARMOR_REPLACEMENT_COLORS) {
                    // Skip grey itself, we already stored the original
                    if (armorId === 'grey') continue;

                    const replacementRgb = ARMOR_REPLACEMENT_COLORS[armorId];
                    try {
                        // Recolor using the target grey from config
                        const dataUrl = await generateRecoloredSpriteDataURL(image, replacementRgb, TARGET_GREY_RGB);
                        generatedSpriteUrls[spriteKey][armorId] = dataUrl; // Store as 'forest', 'ember', etc.
                    } catch (genError) {
                        console.error(`Generate error (Armor: ${armorId} for ${spriteKey}):`, genError);
                        // Optionally store fallback path here: generatedSpriteUrls[spriteKey][armorId] = './sprites/error.png';
                    }
                }
                 // Special case for 'none' if it uses the base armor sprite recolored
                 if (ARMOR_REPLACEMENT_COLORS['none']) {
                      try {
                           const dataUrl = await generateRecoloredSpriteDataURL(image, ARMOR_REPLACEMENT_COLORS['none'], TARGET_GREY_RGB);
                           generatedSpriteUrls[spriteKey]['none'] = dataUrl;
                      } catch (genError) { console.error(`Generate error (Armor: none for ${spriteKey}):`, genError); }
                 }


            } else {
                // Existing Goblin/Unit Recoloring Logic
                generatedSpriteUrls[spriteKey]['green'] = image.src; // Store original as 'green'
                for (const variantSuffix in GOBLIN_REPLACEMENT_VARIANTS) {
                    const replacementRgb = GOBLIN_REPLACEMENT_VARIANTS[variantSuffix];
                    try {
                        const dataUrl = await generateRecoloredSpriteDataURL(image, replacementRgb, TARGET_GREEN_RGB);
                        generatedSpriteUrls[spriteKey][variantSuffix] = dataUrl;
                    } catch (genError) {
                        console.error(`Generate error (Goblin: ${variantSuffix} for ${spriteKey}):`, genError);
                    }
                }
            }
        } catch (loadError) {
            console.error(`Load error for ${basePath}:`, loadError);
            // Provide default error fallback for all potential variants
            generatedSpriteUrls[spriteKey] = { green: './sprites/error.png', grey: './sprites/error.png', red: './sprites/error.png', blue: './sprites/error.png', yellow: './sprites/error.png', none: './sprites/error.png', forest: './sprites/error.png', azure: './sprites/error.png', ember: './sprites/error.png', sand: './sprites/error.png' };
        }
    });
    await Promise.all(recolorPromises);
    console.log("Sprite recoloring finished.");
    // Re-apply armor bonuses after recoloring might be needed if icons depend on it,
    // but it's better called after units are created in initGame.
}

function generateRecoloredSpriteDataURL(img, replacementRgb, targetRgb) {
    return new Promise((resolve, reject) => {
        const canvas = document.getElementById('recolor-canvas');
        if (!canvas) return reject(new Error("Recolor canvas missing"));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return reject(new Error("Canvas context missing"));

        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        if (canvas.width === 0 || canvas.height === 0) {
             // If image hasn't loaded dimensions yet, wait a bit
              if (img.naturalWidth === 0) {
                   console.warn(`Image dimensions zero, retrying: ${img.src}`);
                   return setTimeout(() => {
                        generateRecoloredSpriteDataURL(img, replacementRgb, targetRgb)
                            .then(resolve)
                            .catch(reject);
                   }, 100);
              } else {
                    return reject(new Error(`Image dimensions zero: ${img.src}`));
              }
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (e) {
             // Likely CORS issue if running locally without server
            return reject(new Error(`Canvas getImageData error: ${e.message}. Use a local web server.`));
        }

        const data = imageData.data;
        const { r: tr, g: tg, b: tb } = targetRgb; // Target color to replace

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];

            // Check alpha and color match within tolerance
            if (a > 200 && // Only replace opaque pixels
                Math.abs(r - tr) <= COLOR_TOLERANCE &&
                Math.abs(g - tg) <= COLOR_TOLERANCE &&
                Math.abs(b - tb) <= COLOR_TOLERANCE)
            {
                data[i] = replacementRgb.r;
                data[i + 1] = replacementRgb.g;
                data[i + 2] = replacementRgb.b;
                 // Keep original alpha: data[i + 3] = a;
            }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL());
    });
}



// --- Global Error Handling ---
window.onerror = function (message, source, lineno, colno, error) {
    console.error("!! Global Error Caught !!", { message, source, lineno, colno, error });
    // Attempt to gracefully stop processing if an error occurs
    // isProcessing = false; // Don't manage global processing flag here, let actions handle it
    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    // Optional: Show a user-friendly error message overlay?
    return false; // Let default browser handling occur too
};