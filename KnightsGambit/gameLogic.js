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
let isProcessing = false;
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
let enemiesKilledThisLevel = 0;
let highestLevelReached = 1;
let playerGold = 0;
let playerOwnedUnits = { knight: 3, archer: 0, champion: 0 };
let playerActiveRoster = {};
let activeRosterAtLevelStart = {};
let playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0 };
let playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 };
let playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 }; // gold_magnet level, tactical_command slots
let playerCheatSpellAttackBonus = 0;
let maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE;
let lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN; // Ensure first spawn is possible
let gameSettings = { showHpBars: false, playerName: "Hero" };
let currentGridCols = BASE_GRID_COLS;
let currentGridRows = BASE_GRID_ROWS;
let currentTerrainInfo = { url: '', variant: 'green', name: 'grass', quadrant: 0 };
let deathSpriteTimeouts = new Map();
let generatedSpriteUrls = {}; // Stores recolored sprite data URLs
let flameWavePending = {}; // { y: targetRow, casterId: unit.id }


// --- Utility Functions ---

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
    itemsOnCell.sort((a, b) => (ITEM_DATA[b.type]?.zIndex || 0) - (ITEM_DATA[a.type]?.zIndex || 0)); // Prioritize higher z-index
    return itemsOnCell[0];
}

function getUnitAt(x, y) {
    return units.find(unit => unit.x === x && unit.y === y && isUnitAliveAndValid(unit));
}

function getUnitsInArea(centerX, centerY, radius) {
    const affectedUnits = [];
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            const nx = centerX + dx; const ny = centerY + dy;
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
        const nx = x + dx; const ny = y + dy;
        if (isCellInBounds(nx, ny)) cells.push({ x: nx, y: ny });
    }
    return cells;
}

function getDistance(posA, posB) {
    if (!posA || !posB) return Infinity;
    return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

function hasLineOfSight(startPos, endPos) {
    if (!startPos || !endPos) return false;
    const startX = startPos.x; const startY = startPos.y; const endX = endPos.x; const endY = endPos.y;
    if (startX === endX && startY === endY) return true;
    let x = startX; let y = startY; const dx = Math.abs(endX - startX); const dy = -Math.abs(endY - startY);
    const sx = startX < endX ? 1 : -1; const sy = startY < endY ? 1 : -1; let err = dx + dy; let e2;
    let safety = 0; const maxSafety = (currentGridCols + currentGridRows) * 2;
    while (safety < maxSafety) {
        if (!(x === startX && y === startY) && !(x === endX && y === endY)) { const obs = getObstacleAt(x, y); if (obs && OBSTACLE_DATA[obs.type]?.blocksLOS && isObstacleIntact(obs)) return false; }
        if (x === endX && y === endY) break; e2 = 2 * err; let moved = false;
        if (e2 >= dy) { if (x === endX) break; err += dy; x += sx; moved = true; }
        if (e2 <= dx) { if (y === endY) break; err += dx; y += sy; moved = true; }
        if (!moved) break; safety++;
    }
    if (safety >= maxSafety) { console.error("LOS safety limit reached!"); return false; } return true;
}

function getRecoloredUrl(unitType, variant, urlType = 'sprite') {
    const unitData = UNIT_DATA[unitType];
    if (!unitData) return './sprites/error.png';

    let lookupKey = unitType; // Default to the unit's type for sprite
    let defaultUrl = unitData.spriteUrl || './sprites/error.png';

    if (urlType === 'portrait') {
        lookupKey = `${unitType}_portrait`;
        defaultUrl = unitData.portraitUrl || defaultUrl;
    } else if (urlType === 'deadSprite') {
        // Derive the key from the *actual* dead sprite file defined in UNIT_DATA
        const deadSpriteFilenameWithExt = unitData.deadSpriteUrl?.substring(unitData.deadSpriteUrl.lastIndexOf('/') + 1); // e.g., "Goblin_dead.png"
        const deadSpriteFilename = deadSpriteFilenameWithExt?.substring(0, deadSpriteFilenameWithExt.lastIndexOf('.')); // e.g., "Goblin_dead"

        if (deadSpriteFilename) {
            lookupKey = deadSpriteFilename.toLowerCase(); // e.g., "goblin_dead"
            defaultUrl = unitData.deadSpriteUrl || defaultUrl;
        } else {
            // Fallback if no dead sprite defined (less ideal)
            lookupKey = `${unitType}_dead`; // This key likely won't exist in generatedSpriteUrls
            defaultUrl = './sprites/error.png'; // Fallback to error sprite might be better
            console.warn(`No deadSpriteUrl defined or derived for ${unitType}. Cannot find recolored version.`);
        }
    }

    const variantUrls = generatedSpriteUrls[lookupKey];

    if (!variantUrls) {
         // console.warn(`Recolored URLs not found for key: ${lookupKey}. Using default: ${defaultUrl}`);
         return defaultUrl;
    }

    // Prioritize specific variant, then green (original), then default UNIT_DATA url
    return variantUrls[variant] || variantUrls['green'] || defaultUrl;
}

// --- Game Initialization and State Management ---

async function preloadAssetsAndStart() {
    await initializeSpriteRecoloring();
    loadGameData();
    showMainMenu();
}

function calculateGridDimensions(level) {
    const baseLevel = ((level - 1) % TOTAL_LEVELS_BASE) + 1;
    const levelFactor = Math.floor((baseLevel - 1) / 5);
    currentGridCols = BASE_GRID_COLS + Math.floor(levelFactor / 2) + (levelFactor % 2);
    currentGridRows = BASE_GRID_ROWS + Math.floor(levelFactor / 2);
    currentGridCols = Math.max(BASE_GRID_COLS, Math.min(currentGridCols, 15));
    currentGridRows = Math.max(BASE_GRID_ROWS, Math.min(currentGridRows, 15));
}

function checkSpellUnlock(spellName, unlockLevel) {
    const wasUnlocked = !!spellsUnlocked[spellName];
    spellsUnlocked[spellName] = highestLevelReached > unlockLevel;
    if (spellsUnlocked[spellName] && !wasUnlocked && typeof showFeedback === 'function') {
         const spellDisplayName = spellName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
         showFeedback(`Spell Unlocked: ${spellDisplayName}!`, 'feedback-levelup', 3000);
         playSfx('spellUnlock');
    }
}

function resetSpellStateForNewLevel() {
    currentSpell = null; spellsUsedThisLevel = false;
    checkSpellUnlock('fireball', FIREBALL_UNLOCK_LEVEL); checkSpellUnlock('flameWave', FLAME_WAVE_UNLOCK_LEVEL); checkSpellUnlock('frostNova', FROST_NOVA_UNLOCK_LEVEL); checkSpellUnlock('heal', HEAL_UNLOCK_LEVEL);
    spellUses = { fireball: !!spellsUnlocked.fireball, flameWave: !!spellsUnlocked.flameWave, frostNova: !!spellsUnlocked.frostNova, heal: !!spellsUnlocked.heal };
    if (unlimitedSpellsCheat) Object.keys(spellUses).forEach(key => { if (spellUses[key] !== undefined) spellUses[key] = true; });
    if (typeof updateSpellUI === 'function') updateSpellUI();
}

function clearLevelItemsAndObstacles() {
    items.forEach(item => item.element?.remove()); items = [];
    obstacles.forEach(obs => obs.element?.remove()); obstacles = [];
    clearTimeoutMap(deathSpriteTimeouts);
}

function clearTimeoutMap(timeoutMap) { timeoutMap.forEach(timeoutId => clearTimeout(timeoutId)); timeoutMap.clear(); }

function resetLevelState() {
    units.forEach(unit => { unit.element?.remove(); if (typeof removeWorldHpBar === 'function') removeWorldHpBar(unit.id); });
    units = []; selectedUnit = null; validMoves = []; validAttacks = { units: [], obstacles: [] }; currentTurn = 'player'; gridState = []; clearLevelItemsAndObstacles(); levelClearedAwaitingInput = false; isProcessing = false; unitCounter = 0; itemCounter = 0; obstacleCounter = 0; playerActionsTakenThisLevel = 0; goldCollectedThisLevel = 0; enemiesKilledThisLevel = 0; flameWavePending = {};
    if (gameSettings.showHpBars && typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility();
    if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null;
}

function fullGameReset() { resetLevelState(); stopMusic(); isGameActiveFlag = false; currentLevel = 1; levelToRestartOnLoss = 1; saveSettings(); }

function initGame(startLevel = 1) {
    isGameActiveFlag = true; isProcessing = true; loadGameData(); currentLevel = startLevel; levelToRestartOnLoss = currentLevel; activeRosterAtLevelStart = { ...playerActiveRoster }; calculateGridDimensions(currentLevel); resetLevelState(); resetSpellStateForNewLevel(); stopMusic(); if (sfx.gameOver && !sfx.gameOver.paused) { sfx.gameOver.pause(); sfx.gameOver.currentTime = 0; }
    try {
        if (typeof calculateCellSize === 'function') calculateCellSize();
        currentTerrainInfo = getTilesetForLevel(currentLevel);
        if (typeof setupBoard === 'function') setupBoard(currentTerrainInfo.url);
        if (typeof updateUiForNewLevel === 'function') updateUiForNewLevel(); initializeGridState(); spawnObstacles(); spawnInitialUnits(); spawnEnemies(); spawnItems();
        units.forEach(u => { u.acted = false; u.isFrozen = false; u.frozenTurnsLeft = 0; u.isNetted = false; u.nettedTurnsLeft = 0; u.isSlowed = false; u.slowedTurnsLeft = 0; u.netCooldownTurnsLeft = 0; u.inTower = null; u.currentRange = u.baseRange; });
        if (typeof renderAll === 'function') renderAll(); if (typeof createAllWorldHpBars === 'function') createAllWorldHpBars(); if (typeof applyLayout === 'function') applyLayout(); if (typeof centerView === 'function') centerView(true);
        playSfx('startBeep'); selectAndLoadMusic(); startMusicIfNotPlaying();
    } catch (initError) { console.error("Error during game initialization:", initError); isGameActiveFlag = false; }
    finally { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); if (typeof updateQuitButton === 'function') updateQuitButton(); if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility(); }
}

function initializeGridState() { gridState = Array.from({ length: currentGridRows }, () => Array(currentGridCols).fill(null)); }

function spawnObstacles() {
    const totalCells = currentGridCols * currentGridRows; const numObstacles = Math.max(MIN_OBSTACLES, Math.floor(totalCells * MAX_OBSTACLES_PER_LEVEL_FACTOR)); const enemySpawnHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT); const playerSpawnHeight = Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT); const validSpawnMinY = enemySpawnHeight; const validSpawnMaxY = currentGridRows - playerSpawnHeight - 1; let spawnedCount = 0; let towersSpawned = 0; const occupied = new Set();
    if (!gridState || gridState.length !== currentGridRows || gridState[0].length !== currentGridCols) initializeGridState();
    const tryPlaceObstacle = (type, x, y, isVertical = false) => { if (!isCellInBounds(x, y) || occupied.has(`${x},${y}`) || gridState[y]?.[x]) return null; const obs = createObstacle(type, x, y); if (obs) { obs.isVertical = isVertical; occupied.add(`${x},${y}`); gridState[y][x] = type; return obs; } return null; };
    let spawnPool = []; for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) for (let x = 0; x < currentGridCols; x++) if (isCellInBounds(x, y)) spawnPool.push({ x, y });
    spawnPool.sort(() => 0.5 - Math.random());
    if (currentLevel >= SNOWMAN_INTRO_LEVEL && currentTerrainInfo.name === 'snow') { let snowmenToSpawn = Math.floor(Math.random() * 3) + 1; let snowmenSpawned = 0; let snowmanAttempts = 0; const maxSnowmanAttempts = spawnPool.length > 0 ? Math.min(spawnPool.length, 10) : 0; while (snowmenSpawned < snowmenToSpawn && snowmanAttempts < maxSnowmanAttempts && spawnPool.length > 0) { snowmanAttempts++; const posIndex = Math.floor(Math.random() * spawnPool.length); const pos = spawnPool[posIndex]; if (tryPlaceObstacle('snowman', pos.x, pos.y)) { snowmenSpawned++; spawnedCount++; spawnPool.splice(posIndex, 1); } } }
    const towerChance = TOWER_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE * 2); if (Math.random() < towerChance) { let towerAttempts = 0; const maxTowerAttempts = spawnPool.length > 0 ? Math.min(spawnPool.length, 15) : 0; while (towersSpawned < MAX_TOWERS_PER_LEVEL && towerAttempts < maxTowerAttempts && spawnPool.length > 0) { towerAttempts++; const posIndex = Math.floor(Math.random() * spawnPool.length); const pos = spawnPool[posIndex]; if (tryPlaceObstacle('tower', pos.x, pos.y)) { towersSpawned++; spawnedCount++; spawnPool.splice(posIndex, 1); } } }
    let attempts = 0; const maxAttempts = numObstacles * 10; spawnPool.sort(() => 0.5 - Math.random());
    while (spawnedCount < numObstacles && attempts < maxAttempts && spawnPool.length > 0) { attempts++; const posIndex = Math.floor(Math.random() * spawnPool.length); const pos = spawnPool.splice(posIndex, 1)[0]; if (!occupied.has(`${pos.x},${pos.y}`) && !gridState[pos.y]?.[pos.x]) { const type = Math.random() < WALL_ROCK_CHANCE ? 'wall_rock' : 'rock'; if (tryPlaceObstacle(type, pos.x, pos.y)) spawnedCount++; } }
}

function spawnInitialUnits() {
    const playerSpawnMinY = currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT); let playerPositions = [];
    for (let y = currentGridRows - 1; y >= playerSpawnMinY; y--) for (let x = 0; x < currentGridCols; x++) if (isCellInBounds(x, y) && gridState[y]?.[x] === null && !getUnitAt(x, y) && !getObstacleAt(x, y)) playerPositions.push({ x, y });
    const shuffledPlayerPositions = [...playerPositions].sort(() => 0.5 - Math.random()); let posIndex = 0;
    for (const unitType in playerActiveRoster) { const count = playerActiveRoster[unitType]; for (let i = 0; i < count && posIndex < shuffledPlayerPositions.length; i++) { const pos = shuffledPlayerPositions[posIndex++]; if (pos) createUnit(unitType, pos.x, pos.y); else { console.warn(`Ran out of spawn positions placing active roster: ${unitType}`); break; } } if (posIndex >= shuffledPlayerPositions.length) break; }
    if (units.filter(u => u.team === 'player').length === 0) { const totalOwned = Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0); if (totalOwned > 0) gameOver(false, "Error: No units placed from roster. Check 'Choose Troops'."); else gameOver(false, "No units available to start the level!"); }
}

function spawnEnemies() {
    const occupied = new Set(units.map(u => `${u.x},${u.y}`)); obstacles.forEach(obs => occupied.add(`${obs.x},${obs.y}`)); let cycle = 0; if (currentLevel >= INFINITE_LEVEL_START) cycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE); const infiniteHpBonus = cycle * INFINITE_HP_BONUS_PER_CYCLE; const infiniteAtkBonus = cycle * INFINITE_ATK_BONUS_PER_CYCLE;
    const enemySpawnMaxY = Math.min(Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT) - 1, currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT) - 1 - MIN_ENEMY_PLAYER_START_DISTANCE); const numEnemies = 3 + Math.floor(currentLevel / 1.5);
    const potentialTypesMasterList = ['goblin']; if (currentLevel >= GOBLIN_ARCHER_INTRO_LEVEL) potentialTypesMasterList.push('goblin_archer'); if (currentLevel >= CLUBBER_INTRO_LEVEL) potentialTypesMasterList.push('goblin_club'); if (currentLevel >= JUGGERNAUT_INTRO_LEVEL) potentialTypesMasterList.push('orc_juggernaut'); if (currentLevel >= GOBLIN_NETTER_INTRO_LEVEL) potentialTypesMasterList.push('goblin_netter'); if (currentLevel >= GOBLIN_SHAMAN_INTRO_LEVEL) potentialTypesMasterList.push('goblin_shaman'); if (currentLevel >= GOBLIN_SAPPER_INTRO_LEVEL) potentialTypesMasterList.push('goblin_sapper'); if (currentLevel >= GOBLIN_PYROMANCER_INTRO_LEVEL) potentialTypesMasterList.push('goblin_pyromancer');
    const unitsToSpawnTypes = []; const isJuggernautLevel = (currentLevel >= JUGGERNAUT_INTRO_LEVEL && currentLevel % JUGGERNAUT_SPAWN_MULTIPLE === 0);
    let spawnTreasureHunter = false; if (currentLevel >= GOBLIN_TREASURE_HUNTER_INTRO_LEVEL && (currentLevel - lastTreasureHunterLevel) >= TREASURE_HUNTER_SPAWN_COOLDOWN && Math.random() < 0.1) { spawnTreasureHunter = true; lastTreasureHunterLevel = currentLevel; saveGameData(); }
    if (spawnTreasureHunter) { unitsToSpawnTypes.push('goblin_treasure_hunter'); const remainingCount = numEnemies - 1; const availablePool = potentialTypesMasterList.filter(t => t !== 'orc_juggernaut'); const fallback = 'goblin'; for (let i = 0; i < remainingCount; i++) { const pool = availablePool.length > 0 ? availablePool : [fallback]; unitsToSpawnTypes.push(pool[Math.floor(Math.random() * pool.length)]); } }
    else if (isJuggernautLevel && potentialTypesMasterList.includes('orc_juggernaut')) { unitsToSpawnTypes.push('orc_juggernaut'); const remainingCount = numEnemies - 1; const availablePool = potentialTypesMasterList.filter(t => t !== 'orc_juggernaut'); const fallback = 'goblin'; for (let i = 0; i < remainingCount; i++) { const pool = availablePool.length > 0 ? availablePool : [fallback]; unitsToSpawnTypes.push(pool[Math.floor(Math.random() * pool.length)]); } }
    else { const availablePool = potentialTypesMasterList.filter(t => t !== 'orc_juggernaut'); const fallback = 'goblin'; for (let i = 0; i < numEnemies; i++) { const pool = availablePool.length > 0 ? availablePool : [fallback]; unitsToSpawnTypes.push(pool[Math.floor(Math.random() * pool.length)]); } }
    const ensureUnit = (level, type) => { if (currentLevel === level && !unitsToSpawnTypes.includes(type) && unitsToSpawnTypes.length > 0 && potentialTypesMasterList.includes(type)) unitsToSpawnTypes[Math.floor(Math.random() * unitsToSpawnTypes.length)] = type; };
    ensureUnit(GOBLIN_ARCHER_INTRO_LEVEL, 'goblin_archer'); ensureUnit(GOBLIN_NETTER_INTRO_LEVEL, 'goblin_netter'); ensureUnit(CLUBBER_INTRO_LEVEL, 'goblin_club'); ensureUnit(GOBLIN_SHAMAN_INTRO_LEVEL, 'goblin_shaman'); ensureUnit(GOBLIN_SAPPER_INTRO_LEVEL, 'goblin_sapper'); ensureUnit(GOBLIN_PYROMANCER_INTRO_LEVEL, 'goblin_pyromancer');
    let spawnPool = []; const playerStartX = 0; const playerStartY = currentGridRows - Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT);
    for (let y = 0; y <= enemySpawnMaxY; y++) for (let x = 0; x < currentGridCols; x++) if (isCellInBounds(x, y) && !occupied.has(`${x},${y}`) && !getObstacleAt(x, y) && getDistance({ x, y }, { x: playerStartX + currentGridCols / 2, y: playerStartY }) >= MIN_ENEMY_PLAYER_START_DISTANCE) spawnPool.push({ x, y });
    spawnPool.sort(() => 0.5 - Math.random());
    for (const typeToSpawn of unitsToSpawnTypes) { if (spawnPool.length === 0) break; const pos = spawnPool.pop(); const variant = typeToSpawn === 'goblin_treasure_hunter' ? GOBLIN_TREASURE_HUNTER_VARIANT : (TILESET_GOBLIN_VARIANT_MAP[currentTerrainInfo.name] || 'green'); const isElite = !spawnTreasureHunter && currentLevel >= ELITE_ENEMY_START_LEVEL && Math.random() < 0.15; const newUnit = createUnit(typeToSpawn, pos.x, pos.y, variant, isElite, infiniteHpBonus, infiniteAtkBonus); if (newUnit) occupied.add(`${pos.x},${pos.y}`); }
}


function spawnItems() {
    const occupiedSet = new Set(units.map(u => `${u.x},${u.y}`)); obstacles.forEach(obs => occupiedSet.add(`${obs.x},${obs.y}`)); let chestsToTry = 0; const chestChance = CHEST_SPAWN_CHANCE_PER_LEVEL * (1 + (currentLevel - 1) / TOTAL_LEVELS_BASE); if (Math.random() < chestChance) chestsToTry = Math.floor(Math.random() * MAX_CHESTS_PER_LEVEL) + 1; if (chestsToTry === 0) return;
    const enemySpawnAreaHeight = Math.floor(currentGridRows * ENEMY_SPAWN_ROWS_PERCENT); const playerSpawnAreaHeight = Math.floor(currentGridRows * PLAYER_SPAWN_ROWS_PERCENT); const validSpawnMinY = enemySpawnAreaHeight; const validSpawnMaxY = currentGridRows - playerSpawnAreaHeight - 1; if (validSpawnMinY > validSpawnMaxY) return;
    const spawnPool = []; for (let y = validSpawnMinY; y <= validSpawnMaxY; y++) for (let x = 0; x < currentGridCols; x++) if (isCellInBounds(x, y) && !occupiedSet.has(`${x},${y}`) && !getObstacleAt(x, y)) spawnPool.push({ x, y });
    spawnPool.sort(() => 0.5 - Math.random()); for (let i = 0; i < chestsToTry && spawnPool.length > 0; i++) { const pos = spawnPool.pop(); createItem('chest', pos.x, pos.y); occupiedSet.add(`${pos.x},${pos.y}`); }
}

// --- Entity Creation ---
function createUnit(type, x, y, variantType = 'green', isElite = false, infiniteHpBonus = 0, infiniteAtkBonus = 0) {
    const data = UNIT_DATA[type]; if (!data) { console.error(`Invalid unit type: ${type}`); return null; }
    const unit = {
        id: `${data.id_prefix}${unitCounter++}`, type, x, y,
        baseHp: data.baseHp, baseAtk: data.baseAtk, baseMov: data.mov, baseRange: data.range,
        name: data.name, knockback: data.knockback || false, cleaveDamage: data.cleaveDamage || 0,
        team: data.team, acted: false, element: null,
        isFrozen: false, frozenTurnsLeft: 0, isNetted: false, nettedTurnsLeft: 0,
        isSlowed: false, slowedTurnsLeft: 0, variantType: null,
        canMoveAndAttack: false, inflictsSlow: false, isElite: false,
        inTower: null, currentRange: data.range, isTotem: data.isTotem || false,
        canSummonTotem: data.canSummonTotem || false, totemCooldown: 0, totemType: data.totemType || null,
        canNet: data.canNet || false, netCooldownTurnsLeft: 0,
        suicideExplode: data.suicideExplode || false, explodeOnDeath: data.explodeOnDeath || false,
        explosionDamage: data.explosionDamage || 0, explosionRadius: data.explosionRadius || 0,
        shootsFireball: data.shootsFireball || false, canCastFlameWave: data.canCastFlameWave || false,
        fireballDamage: data.fireballDamage || 0, flameWaveDamage: data.flameWaveDamage || 0, flameWaveCooldown: data.flameWaveCooldown || 0,
        immuneToFire: false, immuneToFrost: false, isTreasureHunter: data.isTreasureHunter || false,
    };
    unit.spriteUrl = getRecoloredUrl(type, variantType, 'sprite');
    unit.deadSpriteUrl = getRecoloredUrl(type, variantType, 'deadSprite'); // Use base dead sprite for recolor
    unit.portraitUrl = getRecoloredUrl(type, variantType, 'portrait');

    unit.maxHp = unit.baseHp; unit.atk = unit.baseAtk; unit.mov = unit.baseMov;
    if (unit.team === 'player') { const hpUpgradeKey = `${type}_hp`; const atkUpgradeKey = `${type}_atk`; unit.maxHp += playerUnitUpgrades[hpUpgradeKey] || 0; unit.atk += playerUnitUpgrades[atkUpgradeKey] || 0; }
    else if (unit.team === 'enemy' && !unit.isTotem) {
        let prefix = ''; unit.variantType = variantType || 'green';
        if (variantType === 'red') { prefix = 'Ember '; unit.atk += GOBLIN_RED_ATK_BONUS; if (unit.type === 'orc_juggernaut') unit.atk++; if (currentLevel >= IMMUNITY_LEVEL_START) unit.immuneToFire = true; }
        else if (variantType === 'blue') { prefix = 'Azure '; unit.maxHp += GOBLIN_BLUE_HP_BONUS; unit.inflictsSlow = true; if (unit.type === 'orc_juggernaut') unit.maxHp += 2; if (currentLevel >= IMMUNITY_LEVEL_START) unit.immuneToFrost = true; }
        else if (variantType === 'yellow') { prefix = 'Sand '; unit.mov += GOBLIN_YELLOW_MOV_BONUS; if (GOBLIN_YELLOW_DOUBLE_TURN && unit.type !== 'orc_juggernaut') unit.canMoveAndAttack = true; }
        if (isElite) { unit.isElite = true; unit.maxHp += ELITE_STAT_BONUS.hp; unit.atk += ELITE_STAT_BONUS.atk; prefix = `Elite ${prefix}`; }
        unit.maxHp += infiniteHpBonus; unit.atk += infiniteAtkBonus;
        if (prefix) { if (unit.name.includes('Goblin')) unit.name = unit.name.replace(/Goblin/i, `${prefix}Goblin`); else if (unit.name.includes('Orc')) unit.name = unit.name.replace(/Orc/i, `${prefix}Orc`); else unit.name = `${prefix}${unit.name}`; }
    }
    unit.hp = unit.maxHp; units.push(unit); return unit;
}


function createObstacle(type, x, y) {
    const data = OBSTACLE_DATA[type]; if (!data) return null;
    const obstacle = { id: `obs${obstacleCounter++}`, type, x, y, hp: data.hp, maxHp: data.hp, blocksMove: data.blocksMove, blocksLOS: data.blocksLOS, destructible: data.destructible, enterable: data.enterable || false, rangeBonus: data.rangeBonus || 0, element: null, occupantUnitId: null, isVertical: false, hidesUnit: data.hidesUnit || false, hiddenUnitType: data.hiddenUnitType || null, hiddenUnitVariant: data.hiddenUnitVariant || null, revealed: false, };
    obstacles.push(obstacle); gridState[y][x] = type; return obstacle;
}

function createItem(type, x, y, stackIndex = 0) {
    const data = ITEM_DATA[type]; if (!data) return null;
    const item = { id: `item${itemCounter++}`, type, x, y, element: null, stackIndex, opened: false, collected: false, value: data.value || 0 };
    if (type === 'chest') { item.baseGoldAmount = data.baseGoldAmount; item.potionChance = Math.min(POTION_DROP_CHANCE_CHEST_MAX, POTION_DROP_CHANCE_CHEST_BASE + POTION_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1)); item.gemChance = Math.min(GEM_DROP_CHANCE_CHEST_MAX, GEM_DROP_CHANCE_CHEST_BASE + GEM_DROP_CHANCE_CHEST_PER_LEVEL * (currentLevel - 1)); const maxBonusGold = Math.min(CHEST_MAX_TOTAL_GOLD - item.baseGoldAmount, Math.floor(CHEST_MAX_BONUS_GOLD_PER_LEVEL * currentLevel)); item.value = item.baseGoldAmount + Math.floor(Math.random() * (maxBonusGold + 1)); item.value = Math.max(1, Math.min(CHEST_MAX_TOTAL_GOLD, item.value)); }
    else if (type === 'shiny_gem') { item.value = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin; }
    items.push(item); return item;
}

// --- Core Gameplay Actions ---

function finishAction(unit, actionType = 'other') {
    if (!unit || !isUnitAliveAndValid(unit)) return;
    if (!levelClearedAwaitingInput) { unit.acted = true; if (unit.team === 'player' && (actionType === 'move' || actionType === 'attack')) { playerActionsTakenThisLevel++; if (typeof updateQuitButton === 'function') updateQuitButton(); } }
    if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); if (selectedUnit?.id === unit.id && typeof deselectUnit === 'function') deselectUnit(false); if (gameSettings.showHpBars && typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);
    if (!levelClearedAwaitingInput) checkWinLossConditions();
}

async function revealSnowman(snowmanObstacle, revealedByUnit = null) {
    if (!snowmanObstacle || snowmanObstacle.revealed || !snowmanObstacle.hidesUnit || !isObstacleIntact(snowmanObstacle)) return; // Added check for intact obstacle
    snowmanObstacle.revealed = true; snowmanObstacle.hp = 0; // Mark as revealed and destroyed
    playSfx('snowmanReveal'); const goblinType = snowmanObstacle.hiddenUnitType || 'goblin'; const goblinVariant = snowmanObstacle.hiddenUnitVariant || 'blue'; const goblin = createUnit(goblinType, snowmanObstacle.x, snowmanObstacle.y, goblinVariant);
    await removeObstacle(snowmanObstacle); // Ensure removal happens
    if (goblin) { if (typeof renderUnit === 'function') renderUnit(goblin); if (typeof createWorldHpBar === 'function' && gameSettings.showHpBars) createWorldHpBar(goblin); } // Render the new goblin
    if (goblin && revealedByUnit && revealedByUnit.team === 'player') { const isAdjacent = getDistance(goblin, revealedByUnit) === 1; if (isAdjacent) { const attackTargets = getValidAttackTargets(goblin); if (attackTargets.units.includes(revealedByUnit.id)) await attack(goblin, revealedByUnit.x, revealedByUnit.y, true); else finishAction(goblin); } }
    checkWinLossConditions();
}


async function enterTower(unit, tower) {
    if (!unit || !tower || tower.occupantUnitId || !tower.enterable || !isUnitAliveAndValid(unit) || unit.y !== tower.y + 1 || unit.x !== tower.x) return false;
    if (unit.inTower) leaveTower(unit); const startX = unit.x; const startY = unit.y; unit.x = tower.x; unit.y = tower.y; tower.occupantUnitId = unit.id; unit.inTower = tower.id; playSfx('towerEnter'); unit.currentRange = unit.baseRange + (unit.baseRange > 1 ? tower.rangeBonus : 0);
    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit); if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); if (typeof animateUnitMove === 'function') await animateUnitMove(unit, startX, startY, unit.x, unit.y); else if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
    finishAction(unit, 'move'); if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); return true;
}

function leaveTower(unit) {
    if (!unit || !unit.inTower) return; const tower = obstacles.find(o => o.id === unit.inTower); if (tower) { if (unit.x !== tower.x || unit.y !== tower.y) unit.x = tower.x; unit.y = tower.y; unit.x = tower.x; unit.y = tower.y + 1; tower.occupantUnitId = null; } else { if (isCellInBounds(unit.x, unit.y + 1) && !getObstacleAt(unit.x, unit.y + 1)?.blocksMove && !getUnitAt(unit.x, unit.y + 1)) unit.y++; } unit.inTower = null; unit.currentRange = unit.baseRange; playSfx('towerExit');
    if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit); if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
}

async function moveUnit(unit, targetX, targetY) {
    if (!unit || !isUnitAliveAndValid(unit)) return false; if (!levelClearedAwaitingInput && ((unit.acted && !unit.canMoveAndAttack) || unit.isFrozen || unit.isNetted)) return false; if (!isCellInBounds(targetX, targetY)) return false;
    const startX = unit.x; const startY = unit.y; const occupyingUnit = getUnitAt(targetX, targetY); const obstacleAtTarget = getObstacleAt(targetX, targetY); const towerUnitIsIn = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;
    if (occupyingUnit && occupyingUnit.id !== unit.id) return false; if (obstacleAtTarget && obstacleAtTarget.blocksMove) return false; if (towerUnitIsIn && (targetX !== towerUnitIsIn.x || targetY !== towerUnitIsIn.y + 1)) { playSfx('error'); showFeedback("Must exit tower to the cell below.", "feedback-error"); return false; } if (obstacleAtTarget?.enterable) { if (startY !== targetY + 1 || startX !== targetX) { playSfx('error'); showFeedback("Can only enter tower from below.", "feedback-error"); return false; } if (obstacleAtTarget.occupantUnitId && obstacleAtTarget.occupantUnitId !== unit.id) return false; }
    if (startX === targetX && startY === targetY) return false;
    let processingWasSet = false; if (currentTurn === 'player' && !isProcessing) { isProcessing = true; processingWasSet = true; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
    let moveSuccessful = false;
    try { playSfx('move'); let animationStartX = startX; let animationStartY = startY; if (towerUnitIsIn && targetX === towerUnitIsIn.x && targetY === towerUnitIsIn.y + 1) leaveTower(unit); else { unit.x = targetX; unit.y = targetY; } if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); if (typeof animateUnitMove === 'function') await animateUnitMove(unit, animationStartX, animationStartY, unit.x, unit.y); else if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true);
        if (unit.team === 'player') { checkForItemPickup(unit, unit.x, unit.y); if (playerPassiveUpgrades.gold_magnet > 0) triggerGoldMagnetPassive(unit); const adjacentCells = [[0, -1], [0, 1], [-1, 0], [1, 0]]; for (const [dx, dy] of adjacentCells) { const nx = unit.x + dx; const ny = unit.y + dy; const adjObstacle = getObstacleAt(nx, ny); if (adjObstacle?.type === 'snowman' && !adjObstacle.revealed) { await revealSnowman(adjObstacle, unit); break; } } const sapper = getUnitAt(targetX, targetY); if (sapper?.type === 'goblin_sapper') await explodeUnit(sapper); } moveSuccessful = true; return true;
    } catch (e) { console.error(`Error during moveUnit for unit ${unit?.id} to (${targetX},${targetY}):`, e); unit.x = startX; unit.y = startY; if (towerUnitIsIn && !unit.inTower) { unit.inTower = towerUnitIsIn.id; towerUnitIsIn.occupantUnitId = unit.id; unit.currentRange = unit.baseRange + (unit.baseRange > 1 ? towerUnitIsIn.rangeBonus : 0); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit); } if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); moveSuccessful = false; return false; }
    finally { if (moveSuccessful) { if (!levelClearedAwaitingInput) { if (unit.canMoveAndAttack && !unit.acted) { if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); } else finishAction(unit, 'move'); } else { if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); checkWinLossConditions(); } } if (processingWasSet) { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); } }
}


function checkForItemPickup(unit, x, y) {
    if (!unit || unit.team !== 'player' || !isUnitAliveAndValid(unit) || !isCellInBounds(x, y)) return;
    const itemsOnCell = items.filter(item => !item.collected && item.x === x && item.y === y); if (itemsOnCell.length === 0) return;
    let goldFromThisPickup = 0; let chestOpenedThisCheck = false; let itemsToAnimateRemoval = []; let healAppliedTotal = 0; let collectedCounts = { gold: 0, shiny_gem: 0, health_potion: 0, gold_magnet: 0 };
    itemsOnCell.forEach(item => {
        const itemData = ITEM_DATA[item.type]; if (!itemData || item.collected) return;
        let canPickup = true; if (item.type === 'health_potion' && unit.hp >= unit.maxHp && !levelClearedAwaitingInput) canPickup = false;
        if (canPickup) {
            item.collected = true; itemsToAnimateRemoval.push(item);
            switch (itemData.pickupAction) {
                case 'addGold': const goldValue = item.value || 0; goldFromThisPickup += goldValue; if (item.type === 'shiny_gem') { collectedCounts.shiny_gem++; if (typeof showGemPopup === 'function') showGemPopup(x, y, goldValue); } else if (item.type === 'gold') { collectedCounts.gold += goldValue; if (typeof showGoldPopup === 'function') showGoldPopup(x, y, goldValue); } break;
                case 'healUnit': if (unit.hp < unit.maxHp) { const healAmount = itemData.value || 0; const healApplied = Math.min(healAmount, unit.maxHp - unit.hp); unit.hp += healApplied; healAppliedTotal += healApplied; collectedCounts.health_potion++; } else if (levelClearedAwaitingInput) { goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP; collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP; if (typeof showGoldPopup === 'function') showGoldPopup(x, y, POTION_GOLD_VALUE_IF_FULL_HP); } break;
                case 'openChest': if (!item.opened) { item.opened = true; chestOpenedThisCheck = true; if (typeof updateVisualItemState === 'function') updateVisualItemState(item); const chestGold = item.value || 0; goldFromThisPickup += chestGold; collectedCounts.gold += chestGold; if (typeof showGoldPopup === 'function') showGoldPopup(x, y, chestGold); if (Math.random() < item.potionChance) { if (unit.hp < unit.maxHp) { const healAmount = HEALTH_POTION_HEAL_AMOUNT; const healApplied = Math.min(healAmount, unit.maxHp - unit.hp); unit.hp += healApplied; healAppliedTotal += healApplied; collectedCounts.health_potion++; } else if (levelClearedAwaitingInput) { goldFromThisPickup += POTION_GOLD_VALUE_IF_FULL_HP; collectedCounts.gold += POTION_GOLD_VALUE_IF_FULL_HP; if (typeof showGoldPopup === 'function') showGoldPopup(x, y, POTION_GOLD_VALUE_IF_FULL_HP); } } if (Math.random() < item.gemChance) { const gemVal = Math.floor(Math.random() * (ITEM_DATA.shiny_gem.valueMax - ITEM_DATA.shiny_gem.valueMin + 1)) + ITEM_DATA.shiny_gem.valueMin; goldFromThisPickup += gemVal; collectedCounts.shiny_gem++; playSfx('gemPickup'); if (typeof showGemPopup === 'function') showGemPopup(x, y, gemVal); } } itemsToAnimateRemoval = itemsToAnimateRemoval.filter(animItem => animItem.id !== item.id); break;
                case 'upgradeGoldMagnet': playerPassiveUpgrades.gold_magnet = (playerPassiveUpgrades.gold_magnet || 0) + 1; collectedCounts.gold_magnet++; saveGameData(); if (typeof updateShopDisplay === 'function') updateShopDisplay(); if (typeof showFeedback === 'function') showFeedback(`Gold Magnet Lvl ${playerPassiveUpgrades.gold_magnet}!`, 'feedback-levelup'); break;
                default: break;
            }
        }
    });
    playerGold += goldFromThisPickup; goldCollectedThisLevel += goldFromThisPickup;
    if (chestOpenedThisCheck) playSfx('chestOpen'); else if (collectedCounts.health_potion > 0 && healAppliedTotal > 0) playSfx('potionPickup'); else if (collectedCounts.gold > 0) playSfx('pickup'); else if (collectedCounts.shiny_gem > 0) playSfx('gemPickup'); else if (collectedCounts.gold_magnet > 0) playSfx('pickup');
    if (healAppliedTotal > 0) { if (typeof showHealPopup === 'function') showHealPopup(x, y, healAppliedTotal); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit); }
    if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
    if (itemsToAnimateRemoval.length > 0) { if (typeof animateItemPickup === 'function') animateItemPickup(itemsToAnimateRemoval); else removeVisualItems(itemsToAnimateRemoval); setTimeout(() => updateCellItemStatus(x, y), ITEM_PICKUP_ANIMATION_DURATION_MS + 50); } else if (chestOpenedThisCheck) updateCellItemStatus(x, y);
    const remainingCollectibles = items.some(item => !item.collected && (item.type !== 'chest' || !item.opened)); if (levelClearedAwaitingInput && !remainingCollectibles && typeof showFeedback === 'function') { showFeedback("All items collected!", "feedback-levelup"); if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
}


async function initiateTowerEntrySequence(unit, tower, path) {
    if (!unit || !tower || !path) { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); return; } const entryCell = path[path.length - 1];
    try { let currentPathX = unit.x; let currentPathY = unit.y; for (const step of path) { if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') { const tempUnit = { ...unit, x: step.x, y: step.y }; updateWorldHpBarPosition(tempUnit); } if (typeof animateUnitMove === 'function') await animateUnitMove(unit, currentPathX, currentPathY, step.x, step.y); else { unit.x = step.x; unit.y = step.y; if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); } currentPathX = step.x; currentPathY = step.y; } if (unit.x === entryCell.x && unit.y === entryCell.y) await enterTower(unit, tower); else { unit.x = entryCell.x; unit.y = entryCell.y; if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); await enterTower(unit, tower); } }
    catch (error) { console.error("Error during tower entry sequence:", error); if (typeof updateUnitPosition === 'function') updateUnitPosition(unit, true); if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); }
    finally { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
}

async function attack(attacker, targetX, targetY, finishAttackerAction = true) {
    if (!attacker || !isUnitAliveAndValid(attacker)) return; if (levelClearedAwaitingInput) { playSfx('error'); if (typeof showFeedback === 'function') showFeedback("Level cleared, cannot attack.", "feedback-error"); if (currentTurn === 'player') isProcessing = false; return; } if ((attacker.acted && !attacker.canMoveAndAttack) || attacker.isFrozen) { if (currentTurn === 'enemy' && !attacker.acted && finishAttackerAction) finishAction(attacker); else if (currentTurn === 'player') isProcessing = false; return; }
    let targetUnit = getUnitAt(targetX, targetY); let targetObstacle = getObstacleAt(targetX, targetY); let targetObject = targetUnit || targetObstacle; let unitInTargetTower = null;
    if (targetObstacle?.enterable && targetObstacle.occupantUnitId) { unitInTargetTower = units.find(u => u.id === targetObstacle.occupantUnitId); if (unitInTargetTower && unitInTargetTower.team !== attacker.team) targetObject = targetObstacle; else unitInTargetTower = null; } else if (targetUnit?.inTower) { const towerUnitIsIn = obstacles.find(o => o.id === targetUnit.inTower); if (towerUnitIsIn && isObstacleIntact(towerUnitIsIn)) { targetObject = towerUnitIsIn; unitInTargetTower = targetUnit; } }
    if (!targetObject) { playSfx('error'); return; } if (targetObject.type && OBSTACLE_DATA[targetObject.type] && !targetObject.destructible && targetObject.type !== 'snowman') { playSfx('error'); showFeedback("Cannot destroy that obstacle.", "feedback-error"); return; }
    const distance = getDistance(attacker, targetObject); const range = attacker.currentRange; const isRanged = distance > 1;
    if (distance > range || (isRanged && !hasLineOfSight(attacker, targetObject))) { playSfx('error'); showFeedback("Cannot attack target (out of range or LOS).", "feedback-error"); return; } if (isRanged && targetObject.type === 'door' && isObstacleIntact(targetObject)) { playSfx('error'); showFeedback("Cannot attack target (out of range or LOS).", "feedback-error"); return; }
    const targetIsUnit = !!units.find(u => u.id === targetObject.id); const targetIsObstacle = !targetIsUnit; const targetOriginalData = { id: targetObject.id, x: targetX, y: targetY, type: targetObject.type }; const damage = attacker.atk; const isChampion = attacker.type === 'champion'; const cleaveDamage = isChampion ? (attacker.cleaveDamage || 0) : 0;
    let processingWasSet = false; if (currentTurn === 'player' && !isProcessing) { isProcessing = true; processingWasSet = true; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
    let impactDelay = 0; if (typeof animateAttack === 'function') impactDelay = await animateAttack(attacker, { x: targetX, y: targetY }, isRanged);
    return new Promise(resolve => {
        setTimeout(async () => {
            let targetStillExists = targetIsUnit ? units.find(u => u.id === targetOriginalData.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === targetOriginalData.id && isObstacleIntact(o));
            if (!targetStillExists) { if (processingWasSet) isProcessing = false; resolve(); return; } targetObject = targetStillExists;
            if (targetIsObstacle && targetObject.enterable && targetObject.occupantUnitId) { unitInTargetTower = units.find(u => u.id === targetObject.occupantUnitId); if (!unitInTargetTower || unitInTargetTower.team === attacker.team) unitInTargetTower = null; } else unitInTargetTower = null;
            try {
                if (targetIsUnit && targetObject.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit');
                targetObject.hp -= damage; if (targetObject.hp < 0) targetObject.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(targetX, targetY, damage); if (typeof flashElementOnHit === 'function') flashElementOnHit(targetObject.element);
                if (targetIsUnit) { if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetObject); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetObject); }
                let deathPromises = []; let primaryTargetRemoved = false;
                if (targetObject.hp <= 0) {
                    primaryTargetRemoved = true;
                    if (targetIsUnit) deathPromises.push(removeUnit(targetObject));
                    else if (targetObject.type === 'snowman') await revealSnowman(targetObject); // Reveal first, then it's handled
                    else { playSfx(targetObject.type === 'door' ? 'doorDestroy' : 'towerDestroy'); const unitToDamageAfterTower = unitInTargetTower && isUnitAliveAndValid(unitInTargetTower) ? unitInTargetTower : null; deathPromises.push(removeObstacle(targetObject)); targetObstacle = null; if (unitToDamageAfterTower) { playSfx('hit'); unitToDamageAfterTower.hp -= damage; if (unitToDamageAfterTower.hp < 0) unitToDamageAfterTower.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(unitToDamageAfterTower.x, unitToDamageAfterTower.y, damage); if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterTower.element); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterTower); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterTower); if (unitToDamageAfterTower.hp <= 0) deathPromises.push(removeUnit(unitToDamageAfterTower)); } } targetObject = null;
                } else if (targetIsUnit) { if (attacker.inflictsSlow) { targetObject.isSlowed = true; targetObject.slowedTurnsLeft = GOBLIN_BLUE_SLOW_DURATION; playSfx('slow_inflicted'); if (typeof updateUnitVisualState === 'function') updateUnitVisualState(targetObject); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetObject); } if (attacker.knockback) { const kbDirX = Math.sign(targetX - attacker.x); const kbDirY = Math.sign(targetY - attacker.y); if (kbDirX !== 0 || kbDirY !== 0) { const kbX = targetX + kbDirX; const kbY = targetY + kbDirY; if (isCellInBounds(kbX, kbY) && !getUnitAt(kbX, kbY) && !getObstacleAt(kbX, kbY)?.blocksMove) { const unitToMove = units.find(u => u.id === targetOriginalData.id); if (unitToMove) await moveUnit(unitToMove, kbX, kbY); } } } }
                await Promise.all(deathPromises); deathPromises = [];
                if (isChampion && cleaveDamage > 0) {
                    const currentAttacker = units.find(u => u.id === attacker.id); if (currentAttacker && isUnitAliveAndValid(currentAttacker)) {
                        const attackDirX = Math.sign(targetOriginalData.x - currentAttacker.x); const attackDirY = Math.sign(targetOriginalData.y - currentAttacker.y); const potentialCleaveCellsCoords = []; if (attackDirX !== 0) potentialCleaveCellsCoords.push({ x: targetOriginalData.x, y: targetOriginalData.y - 1 }, { x: targetOriginalData.x, y: targetOriginalData.y + 1 }, { x: targetOriginalData.x + attackDirX, y: targetOriginalData.y }); else if (attackDirY !== 0) potentialCleaveCellsCoords.push({ x: targetOriginalData.x - 1, y: targetOriginalData.y }, { x: targetOriginalData.x + 1, y: targetOriginalData.y }, { x: targetOriginalData.x, y: targetOriginalData.y + attackDirY }); else potentialCleaveCellsCoords.push({ x: targetOriginalData.x - 1, y: targetOriginalData.y }, { x: targetOriginalData.x + 1, y: targetOriginalData.y }, { x: targetOriginalData.x, y: targetOriginalData.y - 1 }, { x: targetOriginalData.x, y: targetOriginalData.y + 1 });
                        await new Promise(r => setTimeout(r, 50));
                        for (const { x: cleaveX, y: cleaveY } of potentialCleaveCellsCoords) {
                            if (!isCellInBounds(cleaveX, cleaveY)) continue; let cleaveTarget = getUnitAt(cleaveX, cleaveY); let cleaveObstacle = getObstacleAt(cleaveX, cleaveY); let cleaveTargetObject = null; let unitInCleaveTower = null;
                            if (cleaveTarget && cleaveTarget.team !== currentAttacker.team && isUnitAliveAndValid(cleaveTarget)) { if (cleaveTarget.inTower) { const towerCleaveTargetIsIn = obstacles.find(o => o.id === cleaveTarget.inTower); if (towerCleaveTargetIsIn && isObstacleIntact(towerCleaveTargetIsIn)) { cleaveTargetObject = towerCleaveTargetIsIn; unitInCleaveTower = cleaveTarget; } else continue; } else cleaveTargetObject = cleaveTarget; }
                            else if (cleaveObstacle && cleaveObstacle.destructible && isObstacleIntact(cleaveObstacle)) { if (cleaveObstacle.enterable && cleaveObstacle.occupantUnitId) { const unitInside = units.find(u => u.id === cleaveObstacle.occupantUnitId); if (unitInside && unitInside.team !== currentAttacker.team) { cleaveTargetObject = cleaveObstacle; unitInCleaveTower = unitInside; } else cleaveTargetObject = cleaveObstacle; } else cleaveTargetObject = cleaveObstacle; }
                            if (!cleaveTargetObject || cleaveTargetObject.id === targetOriginalData.id) continue;
                            if (cleaveTargetObject.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit');
                            cleaveTargetObject.hp -= cleaveDamage; if (cleaveTargetObject.hp < 0) cleaveTargetObject.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, cleaveDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(cleaveTargetObject.element);
                            const isCleaveTargetUnit = !!units.find(u => u.id === cleaveTargetObject.id); if (isCleaveTargetUnit) { if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(cleaveTargetObject); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(cleaveTargetObject); }
                            if (cleaveTargetObject.hp <= 0) { if (isCleaveTargetUnit) deathPromises.push(removeUnit(cleaveTargetObject)); else { playSfx(cleaveTargetObject.type === 'door' ? 'doorDestroy' : 'towerDestroy'); const unitToDamageAfterCleavedTower = unitInCleaveTower && isUnitAliveAndValid(unitInCleaveTower) ? unitInCleaveTower : null; deathPromises.push(removeObstacle(cleaveTargetObject)); if (unitToDamageAfterCleavedTower) { playSfx('hit'); unitToDamageAfterCleavedTower.hp -= cleaveDamage; if (unitToDamageAfterCleavedTower.hp < 0) unitToDamageAfterCleavedTower.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(cleaveX, cleaveY, cleaveDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(unitToDamageAfterCleavedTower.element); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitToDamageAfterCleavedTower); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitToDamageAfterCleavedTower); if (unitToDamageAfterCleavedTower.hp <= 0) deathPromises.push(removeUnit(unitToDamageAfterCleavedTower)); } } }
                        } await Promise.all(deathPromises);
                    }
                }
                const finalAttackerCheck = units.find(u => u.id === attacker.id); if (finalAttackerCheck && isUnitAliveAndValid(finalAttackerCheck) && finishAttackerAction) { if (finalAttackerCheck.canMoveAndAttack && !finalAttackerCheck.acted) { finalAttackerCheck.acted = true; if (typeof updateUnitVisualState === 'function') updateUnitVisualState(finalAttackerCheck); if (gameSettings.showHpBars && typeof updateWorldHpBar === 'function') updateWorldHpBar(finalAttackerCheck); } else finishAction(finalAttackerCheck, 'attack'); } else checkWinLossConditions();
            } catch (e) { console.error("Error during attack resolution:", e); } finally { if (processingWasSet) { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); } checkWinLossConditions(); resolve(); }
        }, impactDelay);
    });
}

async function explodeUnit(unit, isDeathExplosion = false) {
    if (!unit || !unit.explosionDamage || unit.explosionRadius < 0) return; const centerX = unit.x; const centerY = unit.y; const radius = unit.explosionRadius; const damage = unit.explosionDamage; playSfx('sapperExplode'); if (typeof createExplosionEffect === 'function') createExplosionEffect(centerX, centerY, 'fireball'); await new Promise(r => setTimeout(r, 100)); const affectedUnits = getUnitsInArea(centerX, centerY, radius); let deathPromises = [];
    affectedUnits.forEach(targetUnit => { if (targetUnit.id === unit.id || !isUnitAliveAndValid(targetUnit)) return; if (targetUnit.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); else playSfx('hit'); targetUnit.hp -= damage; if (targetUnit.hp < 0) targetUnit.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(targetUnit.x, targetUnit.y, damage); if (typeof flashElementOnHit === 'function') flashElementOnHit(targetUnit.element); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetUnit); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetUnit); if (targetUnit.hp <= 0) deathPromises.push(removeUnit(targetUnit)); });
    if (!isDeathExplosion) deathPromises.push(removeUnit(unit)); await Promise.all(deathPromises); checkWinLossConditions();
}


function removeObstacle(obstacle) {
    return new Promise(resolve => {
        if (!obstacle) { resolve(); return; } const obsId = obstacle.id; const obsX = obstacle.x; const obsY = obstacle.y; const obsType = obstacle.type; obstacle.hp = 0; if (gridState[obsY]?.[obsX] === obsType) gridState[obsY][obsX] = null; if (obstacle.occupantUnitId) { const unitInside = units.find(u => u.id === obstacle.occupantUnitId); if (unitInside) leaveTower(unitInside); obstacle.occupantUnitId = null; }
        if (typeof handleObstacleDestroyAnimation === 'function') { handleObstacleDestroyAnimation(obstacle).then(() => { const index = obstacles.findIndex(o => o.id === obsId); if (index !== -1) obstacles.splice(index, 1); if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY); resolve(); }); } else { obstacle.element?.remove(); const index = obstacles.findIndex(o => o.id === obsId); if (index !== -1) obstacles.splice(index, 1); if (typeof updateCellObstacleStatus === 'function') updateCellObstacleStatus(obsX, obsY); resolve(); }
    });
}

async function removeUnit(unit) {
    if (!unit) return; const unitId = unit.id; const unitTeam = unit.team; const unitType = unit.type; const finalX = unit.x; const finalY = unit.y; const wasSelected = selectedUnit?.id === unitId; const shouldExplodeOnDeath = unit.explodeOnDeath || false; const isTreasureGoblin = unit.isTreasureHunter || false;
    unit.hp = 0; if (unit.inTower) leaveTower(unit); if (unitTeam === 'enemy') enemiesKilledThisLevel++; let itemsToDrop = []; let goldFromDrops = 0;
    if (unitTeam === 'enemy' && !unit.isTotem) {
        if (isTreasureGoblin) { itemsToDrop.push(createItem('gold_magnet', finalX, finalY, 0)); let gemDropped = false; const adjacentCells = getAdjacentCells(finalX, finalY, true); for (const cell of adjacentCells) { const goldAmount = Math.floor(Math.random() * (GOBLIN_TREASURE_HUNTER_GOLD_DROP_MAX - GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN + 1)) + GOBLIN_TREASURE_HUNTER_GOLD_DROP_MIN; for (let i = 0; i < goldAmount; i++) itemsToDrop.push(createItem('gold', cell.x, cell.y, i)); if (!gemDropped && Math.random() < 0.5 && !getItemAt(cell.x, cell.y) && !getObstacleAt(cell.x, cell.y)) { itemsToDrop.push(createItem('shiny_gem', cell.x, cell.y, goldAmount)); gemDropped = true; } } if (!gemDropped && adjacentCells.length > 0) { const randomAdjCell = adjacentCells[Math.floor(Math.random() * adjacentCells.length)]; if (!getItemAt(randomAdjCell.x, randomAdjCell.y) && !getObstacleAt(randomAdjCell.x, randomAdjCell.y)) itemsToDrop.push(createItem('shiny_gem', randomAdjCell.x, randomAdjCell.y, 100)); } } // Drop gem if not dropped yet
        else { if (Math.random() < GOLD_DROP_CHANCE) { let goldAmountToDrop = BASE_GOLD_DROP_AMOUNT; if (ADVANCED_GOBLIN_TYPES.includes(unitType) && Math.random() < ADVANCED_GOBLIN_EXTRA_GOLD_CHANCE) goldAmountToDrop += ADVANCED_GOBLIN_EXTRA_GOLD_AMOUNT; goldFromDrops += goldAmountToDrop; for (let i = 0; i < goldAmountToDrop; i++) itemsToDrop.push(createItem('gold', finalX, finalY, i)); } const potionDropChance = POTION_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE)); if (Math.random() < potionDropChance) itemsToDrop.push(createItem('health_potion', finalX, finalY, itemsToDrop.length)); const gemDropChance = GEM_DROP_CHANCE_ENEMY * (1 + (currentLevel / TOTAL_LEVELS_BASE)); if (Math.random() < gemDropChance) itemsToDrop.push(createItem('shiny_gem', finalX, finalY, itemsToDrop.length)); }
        if (itemsToDrop.length > 0) { playSfx('goldDrop'); itemsToDrop = itemsToDrop.filter(item => item !== null); if (typeof animateItemDrop === 'function' && itemsToDrop.length > 0) await animateItemDrop(itemsToDrop, finalX, finalY); else if (typeof renderAll === 'function') renderAll(); }
    } else if (unitTeam === 'player') { playSfx('playerDie'); }
    let explosionPromise = Promise.resolve(); if (shouldExplodeOnDeath) explosionPromise = explodeUnit(unit, true);
    if (wasSelected && typeof deselectUnit === 'function') deselectUnit(false); if (typeof updateUnitInfoOnDeath === 'function') updateUnitInfoOnDeath(unitId); if (typeof removeWorldHpBar === 'function') removeWorldHpBar(unit.id);
    if (typeof handleUnitDeathAnimation === 'function') handleUnitDeathAnimation(unit, finalX, finalY, deathSpriteTimeouts); else unit.element?.remove();
    const unitIndex = units.findIndex(u => u.id === unitId); if (unitIndex !== -1) units.splice(unitIndex, 1); await explosionPromise; checkWinLossConditions();
}

// --- Spells ---

function getSpellEffectValue(spellName, baseValue) { const upgradeLevel = playerSpellUpgrades[spellName] || 0; const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config || upgradeLevel < 0) return baseValue; const cheatBonus = (config.stat === 'damage' && playerCheatSpellAttackBonus > 0) ? playerCheatSpellAttackBonus : 0; const effectIncrease = config.effectIncrease ?? 0; return baseValue + (upgradeLevel * effectIncrease) + cheatBonus; }
function getFrostNovaRadiusLevel() { const upgradeLevel = playerSpellUpgrades['frostNova'] || 0; const maxUpgradeLevel = SPELL_UPGRADE_CONFIG['frostNova']?.maxLevel ?? 4; return FROST_NOVA_BASE_RADIUS_LEVEL + Math.min(upgradeLevel, maxUpgradeLevel - FROST_NOVA_BASE_RADIUS_LEVEL); }

async function castSpell(spellName, target, originElement = null) {
    if (!spellUses[spellName] && !unlimitedSpellsCheat) { playSfx('error'); if (typeof showFeedback === 'function') showFeedback("Spell not ready.", "feedback-error"); return false; } if (currentTurn !== 'player' || isProcessing) { playSfx('error'); if (typeof showFeedback === 'function') showFeedback("Cannot cast spell now.", "feedback-error"); return false; }
    isProcessing = true; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (!unlimitedSpellsCheat) spellUses[spellName] = false; if (typeof updateSpellUI === 'function') updateSpellUI(); let success = false; let deathPromises = [];
    try {
        switch (spellName) {
            case 'fireball': let fbTargetObject = null; const isTargetEnemyUnit = target?.team === 'enemy' && isUnitAliveAndValid(target); const isTargetDestructibleObstacle = target && !target.team && target.type && target.destructible === true && isObstacleIntact(target); if (isTargetEnemyUnit) fbTargetObject = target; else if (isTargetDestructibleObstacle) fbTargetObject = target; if (fbTargetObject && originElement) { playSfx('fireballShoot'); const targetPos = { x: fbTargetObject.x, y: fbTargetObject.y }; if (typeof animateFireball === 'function') animateFireball(originElement, targetPos.x, targetPos.y); await new Promise(resolve => setTimeout(resolve, FIREBALL_PROJECTILE_DURATION_MS)); playSfx('fireballHit'); if (typeof createExplosionEffect === 'function') createExplosionEffect(targetPos.x, targetPos.y, 'fireball'); const stillTarget = fbTargetObject.team ? units.find(u => u.id === fbTargetObject.id && isUnitAliveAndValid(u)) : obstacles.find(o => o.id === fbTargetObject.id && isObstacleIntact(o)); if (stillTarget && (!stillTarget.immuneToFire || currentLevel < IMMUNITY_LEVEL_START)) { const actualDamage = getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE); stillTarget.hp -= actualDamage; if (stillTarget.hp < 0) stillTarget.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(targetPos.x, targetPos.y, actualDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element); if (stillTarget.team && typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget); if (stillTarget.hp <= 0) deathPromises.push(stillTarget.team ? removeUnit(stillTarget) : removeObstacle(stillTarget)); else if (stillTarget.team && typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(stillTarget); success = true; } else if (stillTarget?.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) { if (typeof showFeedback === 'function') showFeedback("Immune to Fire!", "feedback-error"); success = true; } else success = true; } else { playSfx('error'); showFeedback("Invalid Fireball target.", "feedback-error"); success = false; } break;
            case 'flameWave': const targetRowFW = target.y; if (!isCellInBounds(0, targetRowFW)) { playSfx('error'); success = false; break; } const actualDamageFW = getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE); playSfx('flameWaveCast'); if (typeof animateFlameWave === 'function') animateFlameWave(targetRowFW); for (let x = 0; x < currentGridCols; x++) { await new Promise(r => setTimeout(r, FLAME_WAVE_STAGGER_DELAY_MS)); const currentX = x; const currentY = targetRowFW; if (!isCellInBounds(currentX, currentY)) continue; let hitSomethingThisCell = false; const unitOnCell = getUnitAt(currentX, currentY); const obstacleOnCell = getObstacleAt(currentX, currentY); if (unitOnCell && isUnitAliveAndValid(unitOnCell) && unitOnCell.team === 'enemy' && (!unitOnCell.immuneToFire || currentLevel < IMMUNITY_LEVEL_START)) { playSfx('fireballHit'); unitOnCell.hp -= actualDamageFW; if (unitOnCell.hp < 0) unitOnCell.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(unitOnCell.x, unitOnCell.y, actualDamageFW); if (typeof flashElementOnHit === 'function') flashElementOnHit(unitOnCell.element); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unitOnCell); if (unitOnCell.hp <= 0) deathPromises.push(removeUnit(unitOnCell)); else if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unitOnCell); hitSomethingThisCell = true; } else if (unitOnCell?.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) { if (typeof showFeedback === 'function') showFeedback("Immune!", "feedback-error", 500); hitSomethingThisCell = true; } if (obstacleOnCell?.type === 'door' && obstacleOnCell.destructible && isObstacleIntact(obstacleOnCell)) { playSfx('doorDestroy'); obstacleOnCell.hp -= actualDamageFW; if (obstacleOnCell.hp < 0) obstacleOnCell.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(obstacleOnCell.x, obstacleOnCell.y, actualDamageFW); if (typeof flashElementOnHit === 'function') flashElementOnHit(obstacleOnCell.element); if (obstacleOnCell.hp <= 0) deathPromises.push(removeObstacle(obstacleOnCell)); hitSomethingThisCell = true; } if (hitSomethingThisCell) success = true; } break;
            case 'frostNova': const centerX = target.x; const centerY = target.y; playSfx('frostNovaCast'); const radiusLevel = getFrostNovaRadiusLevel(); const radius = radiusLevel; const freezeDuration = FROST_NOVA_BASE_DURATION; let unitsFrozenCount = 0; if (typeof animateFrostNova === 'function') animateFrostNova(centerX, centerY, radiusLevel); await new Promise(r => setTimeout(r, 50)); const affectedUnits = getUnitsInArea(centerX, centerY, radius); affectedUnits.forEach(unit => { if (unit?.team === 'enemy' && isUnitAliveAndValid(unit) && !unit.isFrozen && (!unit.immuneToFrost || currentLevel < IMMUNITY_LEVEL_START)) { unit.isFrozen = true; unit.frozenTurnsLeft = freezeDuration; unitsFrozenCount++; if (typeof showFreezePopup === 'function') showFreezePopup(unit.x, unit.y); if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit); } else if (unit?.immuneToFrost && currentLevel >= IMMUNITY_LEVEL_START) { if (typeof showFeedback === 'function') showFeedback("Immune!", "feedback-error", 500); } }); if (unitsFrozenCount > 0) playSfx('frostNovaHit'); success = true; break;
            case 'heal': if (target?.team === 'player' && isUnitAliveAndValid(target)) { const actualHealAmount = getSpellEffectValue(spellName, HEAL_BASE_AMOUNT); const healApplied = Math.min(actualHealAmount, target.maxHp - target.hp); if (healApplied > 0) { playSfx('heal'); target.hp += healApplied; if (typeof showHealPopup === 'function') showHealPopup(target.x, target.y, healApplied); if (typeof flashElementOnHit === 'function') flashElementOnHit(target.element); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(target); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(target); success = true; } else { if (typeof showFeedback === 'function') showFeedback("Unit already full health.", "feedback-error"); playSfx('error'); } } else { playSfx('error'); showFeedback("Invalid Heal target.", "feedback-error"); } break;
        }
    } catch (e) { console.error(`Error casting spell ${spellName}:`, e); success = false; } finally { if (!success && !unlimitedSpellsCheat && spellName && !spellUses[spellName]) { spellUses[spellName] = true; if (typeof updateSpellUI === 'function') updateSpellUI(); } if (success) spellsUsedThisLevel = true; await Promise.all(deathPromises); isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); checkWinLossConditions(); if (typeof clearSpellHighlights === 'function') clearSpellHighlights(); }
    return success;
}

async function throwNet(netterUnit, targetUnit) {
    if (!netterUnit || !targetUnit || !isUnitAliveAndValid(netterUnit) || !isUnitAliveAndValid(targetUnit) || netterUnit.netCooldownTurnsLeft > 0 || netterUnit.isFrozen) return false; playSfx('net_throw'); netterUnit.netCooldownTurnsLeft = NET_COOLDOWN; let hitVisual = false; if (typeof animateNetThrow === 'function') hitVisual = await animateNetThrow(netterUnit, targetUnit); else hitVisual = true; let success = false; if (hitVisual) { const stillTarget = units.find(u => u.id === targetUnit.id); if (stillTarget && isUnitAliveAndValid(stillTarget)) { playSfx('net_hit'); stillTarget.isNetted = true; stillTarget.nettedTurnsLeft = NET_DURATION; if (typeof updateUnitVisualState === 'function') updateUnitVisualState(stillTarget); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(stillTarget); success = true; } } finishAction(netterUnit); return success;
}

// --- Pathfinding & Targeting ---

function getValidMoves(unit) {
    if (!unit || !isUnitAliveAndValid(unit)) return []; if (!levelClearedAwaitingInput && ((unit.acted && !unit.canMoveAndAttack) || unit.isFrozen || unit.isNetted)) return []; const distanceLimit = unit.mov - (unit.isSlowed ? 1 : 0); if (distanceLimit <= 0) return []; const moves = []; const queue = [{ x: unit.x, y: unit.y, distance: 0 }]; const visited = new Set([`${unit.x},${unit.y}`]); const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; const unitInTower = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;
    while (queue.length > 0) { const current = queue.shift(); for (const [dx, dy] of directions) { const nextX = current.x + dx; const nextY = current.y + dy; const key = `${nextX},${nextY}`; if (!isCellInBounds(nextX, nextY) || visited.has(key)) continue; const newDistance = current.distance + 1; if (newDistance > distanceLimit) continue; const obstacle = getObstacleAt(nextX, nextY); const unitOnCell = getUnitAt(nextX, nextY); let isBlocked = false; if (unitOnCell && unitOnCell.id !== unit.id) isBlocked = true; if (obstacle && obstacle.blocksMove) isBlocked = true; if (unitInTower) { if (nextX !== unitInTower.x || nextY !== unitInTower.y + 1) isBlocked = true; } else if (obstacle?.enterable) { if (current.y !== nextY + 1 || current.x !== nextX) isBlocked = true; if (obstacle.occupantUnitId && obstacle.occupantUnitId !== unit.id) isBlocked = true; } if (!isBlocked) { moves.push({ x: nextX, y: nextY }); visited.add(key); queue.push({ x: nextX, y: nextY, distance: newDistance }); } } } return moves;
}

function getValidAttackTargets(unit) {
    const targets = { units: [], obstacles: [] }; if (!unit || !isUnitAliveAndValid(unit) || unit.isFrozen || levelClearedAwaitingInput || (unit.atk <= 0 && !unit.canNet)) return targets; const unitRange = unit.currentRange;
    for (const target of units) { if (target.team !== unit.team && isUnitAliveAndValid(target)) { let targetPosForCheck = target; let targetIdForList = target.id; let isUnitInTower = false; if (target.inTower) { const tower = obstacles.find(o => o.id === target.inTower); if (tower && isObstacleIntact(tower)) { targetPosForCheck = tower; targetIdForList = tower.id; isUnitInTower = true; } else continue; } const distance = getDistance(unit, targetPosForCheck); if (distance <= unitRange && (unitRange === 1 || hasLineOfSight(unit, targetPosForCheck))) { if (isUnitInTower) { if (!targets.obstacles.includes(targetIdForList)) targets.obstacles.push(targetIdForList); } else { if (!targets.units.includes(targetIdForList)) targets.units.push(targetIdForList); } } } }
    for (const target of obstacles) { if ((target.destructible || target.hidesUnit) && isObstacleIntact(target) && !targets.obstacles.includes(target.id)) { const distance = getDistance(unit, target); if (distance <= unitRange && (unitRange === 1 || hasLineOfSight(unit, target))) targets.obstacles.push(target.id); } } return targets;
}

function findPathToTarget(unit, targetX, targetY) {
    if (!unit || unit.isFrozen || unit.isNetted || !isUnitAliveAndValid(unit)) return null; if (unit.x === targetX && unit.y === targetY) return []; const startNode = { x: unit.x, y: unit.y, g: 0, h: getDistance(unit, { x: targetX, y: targetY }), parent: null }; const openSet = new Map(); openSet.set(`${startNode.x},${startNode.y}`, startNode); const closedSet = new Set(); const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]]; const maxSearchNodes = currentGridCols * currentGridRows * 2; let nodesSearched = 0; const unitInTower = unit.inTower ? obstacles.find(o => o.id === unit.inTower) : null;
    while (openSet.size > 0 && nodesSearched < maxSearchNodes) { nodesSearched++; let currentNode = null; let minF = Infinity; for (const node of openSet.values()) { const f = node.g + node.h; if (f < minF) { minF = f; currentNode = node; } } if (!currentNode) break; const currentKey = `${currentNode.x},${currentNode.y}`; openSet.delete(currentKey); closedSet.add(currentKey); if (currentNode.x === targetX && currentNode.y === targetY) { const path = []; let temp = currentNode; while (temp.parent) { path.push({ x: temp.x, y: temp.y }); temp = temp.parent; } return path.reverse(); }
        for (const [dx, dy] of directions) { const nextX = currentNode.x + dx; const nextY = currentNode.y + dy; const key = `${nextX},${nextY}`; if (!isCellInBounds(nextX, nextY) || closedSet.has(key)) continue; const obstacle = getObstacleAt(nextX, nextY); const unitOnCell = getUnitAt(nextX, nextY); const isTargetCell = (nextX === targetX && nextY === targetY); let isWalkable = true; if (unitOnCell && !isTargetCell) isWalkable = false; if (obstacle && obstacle.blocksMove) isWalkable = false; if (unitInTower && currentNode.parent === null) { if (nextX !== unitInTower.x || nextY !== unitInTower.y + 1) isWalkable = false; } else if (obstacle?.enterable) { if (currentNode.y !== nextY + 1 || currentNode.x !== nextX) isWalkable = false; if (obstacle.occupantUnitId && !isTargetCell) isWalkable = false; }
            if (isWalkable) { const gScore = currentNode.g + 1; const hScore = getDistance({ x: nextX, y: nextY }, { x: targetX, y: targetY }); const existingNode = openSet.get(key); if (!existingNode || gScore < existingNode.g) { const neighbor = { x: nextX, y: nextY, g: gScore, h: hScore, parent: currentNode }; openSet.set(key, neighbor); } }
        }
    } if (nodesSearched >= maxSearchNodes) console.warn("A* pathfinding search limit reached."); return null;
}

// --- Turn Processing & AI ---

function processStatusTicks(team) {
    units.slice().forEach(unit => {
        if (unit.team === team && isUnitAliveAndValid(unit)) {
            let changed = false;
            if (unit.isFrozen) { unit.frozenTurnsLeft--; if (unit.frozenTurnsLeft <= 0) { unit.isFrozen = false; changed = true; } else if (unit.frozenTurnsLeft === 1 && typeof updateUnitVisualState === 'function') { setTimeout(() => updateUnitVisualState(unit), Math.max(0, MOVE_ANIMATION_DURATION_MS - FROST_VISUAL_FADE_OFFSET)); } } // Trigger visual update early
            if (unit.isNetted) { unit.nettedTurnsLeft--; if (unit.nettedTurnsLeft <= 0) { unit.isNetted = false; changed = true; } }
            if (unit.isSlowed) { unit.slowedTurnsLeft--; if (unit.slowedTurnsLeft <= 0) { unit.isSlowed = false; changed = true; } }
            if (unit.isTotem && team === 'enemy') { const alliesInRange = getUnitsInArea(unit.x, unit.y, unit.range).filter(u => u.team === 'enemy' && !u.isTotem && u.hp < u.maxHp && isUnitAliveAndValid(u)).sort((a, b) => a.hp - b.hp); if (alliesInRange.length > 0) { const targetAlly = alliesInRange[0]; const healAmount = unit.healAmount || SHAMAN_TOTEM_HEAL; const actualHeal = Math.min(healAmount, targetAlly.maxHp - targetAlly.hp); if (actualHeal > 0) { targetAlly.hp += actualHeal; playSfx('shamanHeal'); if (typeof showHealPopup === 'function') showHealPopup(targetAlly.x, targetAlly.y, actualHeal); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetAlly); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetAlly); } } }
            if (unit.type === 'goblin_netter' && unit.netCooldownTurnsLeft > 0) unit.netCooldownTurnsLeft--;
            if (unit.type === 'goblin_shaman' && unit.totemCooldown > 0) unit.totemCooldown--;
            if (unit.type === 'goblin_pyromancer' && unit.flameWaveCooldown > 0) unit.flameWaveCooldown--;
            if (changed) { if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(unit); }
        }
    });
    // Process pending Flame Wave after status ticks
    if (team === 'enemy' && flameWavePending.y !== undefined) {
        const { y: targetRow, casterId } = flameWavePending;
        const caster = units.find(u => u.id === casterId);
        if (caster && isUnitAliveAndValid(caster)) { applyFlameWaveDamage(targetRow, caster.flameWaveDamage); }
        flameWavePending = {}; // Clear pending wave
    }
}

function applyFlameWaveDamage(targetRow, damage) {
    playSfx('fireballHit'); // Or a specific flame wave hit sound
    let deathPromises = [];
    for (let x = 0; x < currentGridCols; x++) {
        const cell = getCellElement(x, targetRow);
        if (cell) cell.classList.add('flame-wave-target'); // Add visual effect class
        const fw_unit = getUnitAt(x, targetRow);
        if (fw_unit && fw_unit.team !== 'enemy' && isUnitAliveAndValid(fw_unit) && (!fw_unit.immuneToFire || currentLevel < IMMUNITY_LEVEL_START)) {
            if(fw_unit.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2');
            fw_unit.hp -= damage; if (fw_unit.hp < 0) fw_unit.hp = 0;
            if (typeof showDamagePopup === 'function') showDamagePopup(fw_unit.x, fw_unit.y, damage);
            if (typeof flashElementOnHit === 'function') flashElementOnHit(fw_unit.element);
            if (typeof updateWorldHpBar === 'function') updateWorldHpBar(fw_unit);
            if (fw_unit.hp <= 0) deathPromises.push(removeUnit(fw_unit));
        } else if (fw_unit?.immuneToFire && currentLevel >= IMMUNITY_LEVEL_START) {
            if (typeof showFeedback === 'function') showFeedback("Immune!", "feedback-error", 500);
        }
    }
    // Remove visual effect after a delay
    setTimeout(() => {
        for (let x = 0; x < currentGridCols; x++) {
            getCellElement(x, targetRow)?.classList.remove('flame-wave-target');
        }
    }, FLAME_WAVE_EFFECT_DELAY_MS);
    // Check win/loss after damage applied and deaths potentially queued
    Promise.all(deathPromises).then(checkWinLossConditions);
}

function endTurn() {
    if (levelClearedAwaitingInput) { if (typeof showLevelCompleteScreen === 'function') { const stats = calculateLevelStats(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); showLevelCompleteScreen(stats, playerGold); playVictoryMusic(); } else startNextLevel(); return; }
    if (currentTurn !== 'player' || isProcessing || isGameOver()) return;
    isProcessing = true; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof deselectUnit === 'function') deselectUnit(false); currentTurn = 'enemy';
    units.forEach(u => { if (u.team === 'player' && isUnitAliveAndValid(u)) u.acted = false; }); processStatusTicks('enemy'); units.forEach(u => { if (u.team === 'enemy' && isUnitAliveAndValid(u)) u.acted = false; }); triggerGoldMagnetPassive();
    if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); setTimeout(runAITurn, 400);
}

function runAITurn() {
    const unitsToAct = units.filter(u => u.team === 'enemy' && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen); unitsToAct.sort((a, b) => { if (a.type === 'goblin_sapper' && b.type !== 'goblin_sapper') return -1; if (b.type === 'goblin_sapper' && a.type !== 'goblin_sapper') return 1; return b.mov - a.mov; }); if (unitsToAct.length === 0) { endAITurnSequence(); return; } let currentAIUnitIndex = 0; const baseActionInterval = 150; const minActionDuration = Math.max(MOVE_ANIMATION_DURATION_MS, NET_FLY_DURATION_MS, ARROW_FLY_DURATION_MS) + 50;
    async function processNextAIUnit() { if (!isGameActiveFlag || isGameOver() || currentAIUnitIndex >= unitsToAct.length) { endAITurnSequence(); return; } const unitToProcess = unitsToAct[currentAIUnitIndex]; currentAIUnitIndex++; const stillValidUnit = units.find(u => u.id === unitToProcess?.id && isUnitAliveAndValid(u) && !u.acted && !u.isFrozen); if (stillValidUnit) { const actionStartTime = Date.now(); try { await performAIAction(stillValidUnit); } catch (e) { console.error(`Error during AI action for unit ${stillValidUnit?.id} (${stillValidUnit?.type}):`, e); if (isUnitAliveAndValid(stillValidUnit) && !stillValidUnit.acted) { try { finishAction(stillValidUnit); } catch { } } } finally { const duration = Date.now() - actionStartTime; const delayNeeded = Math.max(baseActionInterval, minActionDuration - duration); setTimeout(processNextAIUnit, delayNeeded); } } else setTimeout(processNextAIUnit, 30); } setTimeout(processNextAIUnit, 50);
}

function endAITurnSequence() {
    try { if (!isGameActiveFlag || isGameOver()) return; currentTurn = 'player'; processStatusTicks('player'); units.forEach(u => { if (isUnitAliveAndValid(u)) u.acted = false; }); units.forEach(u => { if (isUnitAliveAndValid(u) && typeof updateUnitVisualState === 'function') updateUnitVisualState(u); }); if (typeof showFeedback === 'function') showFeedback("Player Turn!", "feedback-turn"); if (typeof updateUnitInfo === 'function' && selectedUnit) updateUnitInfo(selectedUnit); if (typeof updateWorldHpBars === 'function') updateWorldHpBars(); } catch (e) { console.error("Error during endAITurnSequence:", e); } finally { isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); }
}

async function performAIAction(unit) {
    if (!unit || !isUnitAliveAndValid(unit) || unit.acted || unit.isFrozen) { if (unit && !unit.acted) finishAction(unit); return; }
    const livingPlayers = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)); if (livingPlayers.length === 0) { finishAction(unit); return; }
    let actionTaken = false; let hasMoved = false; let targetPlayer = null; let minDist = Infinity; livingPlayers.forEach(p => { const dist = getDistance(unit, p); if (dist < minDist) { minDist = dist; targetPlayer = p; } });
    if (!targetPlayer) { finishAction(unit); return; } // Should not happen if livingPlayers > 0

    // 1. Special Actions
    if (!actionTaken && unit.suicideExplode) { if (minDist === 1) { await explodeUnit(unit); return; } else { const path = findPathToTarget(unit, targetPlayer.x, targetPlayer.y); if (path?.[0]) { const nextStep = path[0]; if (getValidMoves(unit).some(m => m.x === nextStep.x && m.y === nextStep.y)) { await moveUnit(unit, nextStep.x, nextStep.y); actionTaken = true; hasMoved = true; } } } }
    else if (!actionTaken && unit.type === 'goblin_shaman') { const alliesToHeal = units.filter(u => u.team === 'enemy' && !u.isTotem && u.hp < u.maxHp && getDistance(unit, u) <= unit.range && hasLineOfSight(unit, u) && isUnitAliveAndValid(u)).sort((a, b) => a.hp - b.hp); const totemsExist = units.some(u => u.isTotem && isUnitAliveAndValid(u)); const canSummon = unit.canSummonTotem && unit.totemCooldown <= 0 && !totemsExist; if (alliesToHeal.length > 0) { const targetAlly = alliesToHeal[0]; targetAlly.hp = Math.min(targetAlly.maxHp, targetAlly.hp + unit.healAmount); playSfx('shamanHeal'); if (typeof showHealPopup === 'function') showHealPopup(targetAlly.x, targetAlly.y, unit.healAmount); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(targetAlly); if (typeof updateUnitInfoDisplay === 'function') updateUnitInfoDisplay(targetAlly); actionTaken = true; } else if (canSummon) { const possibleSpots = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => ({ x: unit.x + dx, y: unit.y + dy })); let validSpot = possibleSpots.find(spot => isCellInBounds(spot.x, spot.y) && !getUnitAt(spot.x, spot.y) && !getObstacleAt(spot.x, spot.y)); if (validSpot) { const newTotem = createUnit(unit.totemType, validSpot.x, validSpot.y); if (newTotem) { if (typeof renderUnit === 'function') renderUnit(newTotem); if (typeof createWorldHpBar === 'function' && gameSettings.showHpBars) createWorldHpBar(newTotem); playSfx('shamanTotem'); unit.totemCooldown = SHAMAN_TOTEM_COOLDOWN; actionTaken = true; } } } }
    else if (!actionTaken && unit.type === 'goblin_pyromancer') { if (unit.canCastFlameWave && unit.flameWaveCooldown <= 0) { const targetRow = targetPlayer.y; const playersInRow = livingPlayers.filter(p => p.y === targetRow).length; if (playersInRow >= 2 || minDist <= unit.range) { playSfx('pyroFlameWave'); if (typeof animateFlameWave === 'function') animateFlameWave(targetRow, true); flameWavePending = { y: targetRow, casterId: unit.id }; unit.flameWaveCooldown = PYRO_FLAME_WAVE_COOLDOWN; actionTaken = true; } } if (!actionTaken && unit.shootsFireball && minDist <= unit.range && hasLineOfSight(unit, targetPlayer)) { playSfx('pyroFireball'); if (typeof animateFireball === 'function') animateFireball(unit.element, targetPlayer.x, targetPlayer.y); await new Promise(resolve => setTimeout(resolve, FIREBALL_PROJECTILE_DURATION_MS)); const stillTarget = units.find(u => u.id === targetPlayer.id && isUnitAliveAndValid(u)); if (stillTarget) { if(stillTarget.team === 'player') playSfx(Math.random() < 0.5 ? 'playerHurt1' : 'playerHurt2'); stillTarget.hp -= unit.fireballDamage; if (stillTarget.hp < 0) stillTarget.hp = 0; if (typeof showDamagePopup === 'function') showDamagePopup(stillTarget.x, stillTarget.y, unit.fireballDamage); if (typeof flashElementOnHit === 'function') flashElementOnHit(stillTarget.element); if (typeof updateWorldHpBar === 'function') updateWorldHpBar(stillTarget); if (stillTarget.hp <= 0) await removeUnit(stillTarget); } actionTaken = true; } }

    // 2. Standard Attack/Move Logic
    if (!actionTaken) {
        let bestTargetToAttack = null; let canAttackDirectly = false; let finalTargetObject = targetPlayer; if (targetPlayer.inTower) { const tower = obstacles.find(o => o.id === targetPlayer.inTower); if (tower && isObstacleIntact(tower)) finalTargetObject = tower; else { finishAction(unit); return; } }
        const attackTargets = getValidAttackTargets(unit); const targetIsUnit = !!finalTargetObject.team; canAttackDirectly = targetIsUnit ? attackTargets.units.includes(finalTargetObject.id) : attackTargets.obstacles.includes(finalTargetObject.id); bestTargetToAttack = canAttackDirectly ? finalTargetObject : null;
        if (!actionTaken && unit.canNet && unit.netCooldownTurnsLeft <= 0 && !targetPlayer.isNetted && getDistance(unit, targetPlayer) <= unit.currentRange && hasLineOfSight(unit, targetPlayer)) actionTaken = await throwNet(unit, targetPlayer);
        if (!actionTaken && unit.atk > 0 && bestTargetToAttack) { await attack(unit, bestTargetToAttack.x, bestTargetToAttack.y, !unit.canMoveAndAttack); actionTaken = true; if (unit.canMoveAndAttack) unit.acted = true; }
        if (!unit.isNetted && (!actionTaken || (unit.canMoveAndAttack && !hasMoved))) {
            const movementBudget = unit.mov - (unit.isSlowed ? 1 : 0); let chosenMove = null; let canAttackAfterMove = false; const pathToNearest = findPathToTarget(unit, targetPlayer.x, targetPlayer.y);
            if (unit.canMoveAndAttack && unit.acted && !hasMoved) { const availableRetreatMoves = getValidMoves(unit); let maxEscapeDist = -1; let safestMove = null; let maxSafeDist = -1; for (const move of availableRetreatMoves) { let isSafe = true; let minDistToP = Infinity; for (const p of livingPlayers) { const distToP = getDistance(move, p); minDistToP = Math.min(minDistToP, distToP); if (distToP <= p.currentRange && hasLineOfSight(move, p)) { isSafe = false; break; } } if (isSafe) { if (minDistToP > maxSafeDist) { maxSafeDist = minDistToP; safestMove = move; } } if (minDistToP > maxEscapeDist && !getUnitAt(move.x, move.y)) { maxEscapeDist = minDistToP; chosenMove = move; } } chosenMove = safestMove || chosenMove; }
            else if (!actionTaken && pathToNearest && movementBudget > 0) { let bestStepIndex = -1; for (let i = 0; i < pathToNearest.length && i < movementBudget; i++) { const step = pathToNearest[i]; const stepObstacle = getObstacleAt(step.x, step.y); const stepUnit = getUnitAt(step.x, step.y); const isTower = stepObstacle?.enterable; const canStopHere = !stepUnit && (!stepObstacle || (isTower && unit.y === step.y + 1)); if (canStopHere) { bestStepIndex = i; const distToTarget = getDistance(step, finalTargetObject); if (distToTarget <= unit.currentRange && hasLineOfSight(step, finalTargetObject)) { canAttackAfterMove = true; break; } } else break; } if (bestStepIndex !== -1) chosenMove = pathToNearest[bestStepIndex]; }
            if (chosenMove && (chosenMove.x !== unit.x || chosenMove.y !== unit.y)) { const moved = await moveUnit(unit, chosenMove.x, chosenMove.y); if (moved) { actionTaken = true; hasMoved = true; if (!unit.canMoveAndAttack && canAttackAfterMove) { const finalTargetCheck = targetPlayer.inTower ? obstacles.find(o => o.id === targetPlayer.inTower) : units.find(u => u.id === targetPlayer.id); if (finalTargetCheck && (finalTargetCheck.team ? isUnitAliveAndValid(finalTargetCheck) : isObstacleIntact(finalTargetCheck))) { const currentAttackTargetsAfterMove = getValidAttackTargets(unit); const canAttackTargetFinally = (finalTargetCheck.team ? currentAttackTargetsAfterMove.units.includes(finalTargetCheck.id) : currentAttackTargetsAfterMove.obstacles.includes(finalTargetCheck.id)); if (canAttackTargetFinally) await attack(unit, finalTargetCheck.x, finalTargetCheck.y, true); } } } }
        }
    }
    if (!unit.acted) finishAction(unit); else if (unit.canMoveAndAttack && hasMoved) finishAction(unit);
}

// --- Player Passive Logic ---

function triggerGoldMagnetPassive(movedUnit = null) {
    const magnetLevel = playerPassiveUpgrades.gold_magnet || 0;
    if (magnetLevel === 0) return;
    const radius = GOLD_MAGNET_BASE_RADIUS + magnetLevel - 1;
    let collectedItems = new Set(); let goldCollected = 0; let gemsCollected = 0;
    let unitsToCheck = movedUnit ? [movedUnit] : units.filter(u => u.team === 'player' && isUnitAliveAndValid(u));
    unitsToCheck.forEach(unit => {
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                if (Math.abs(dx) + Math.abs(dy) > radius) continue; // Manhattan distance for radius
                const checkX = unit.x + dx; const checkY = unit.y + dy; if (!isCellInBounds(checkX, checkY)) continue;
                const itemsOnCell = items.filter(item => item.x === checkX && item.y === checkY && !item.collected && !collectedItems.has(item.id) && (item.type === 'gold' || item.type === 'shiny_gem'));
                itemsOnCell.forEach(item => {
                    item.collected = true; collectedItems.add(item.id);
                    const value = item.value || ITEM_DATA[item.type]?.value || 0; goldCollected += value;
                    if (item.type === 'shiny_gem') { gemsCollected++; playSfx('gemPickup'); }
                    if (typeof animateItemMagnetPull === 'function') animateItemMagnetPull(item, unit); else if (item.element) item.element.remove();
                });
            }
        }
    });
    if (goldCollected > 0) { playerGold += goldCollected; goldCollectedThisLevel += goldCollected; if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); let feedbackMsg = `Magnet Lvl ${magnetLevel}: +${goldCollected}<img src="./sprites/gold.png" class="feedback-gold-icon" alt="G">`; if (gemsCollected > 0) feedbackMsg += ` (${gemsCollected} Gem${gemsCollected > 1 ? 's' : ''})`; if (typeof showFeedback === 'function') showFeedback(feedbackMsg, 'feedback-gold', 1500); if (gemsCollected === 0) playSfx('pickup'); setTimeout(() => { collectedItems.forEach(itemId => { const item = items.find(i => i.id === itemId); if (item) updateCellItemStatus(item.x, item.y); }); }, ITEM_MAGNET_FLY_DURATION_MS + 50); }
}

// --- Win/Loss & Level Progression ---

function calculateLevelStats() {
    const initialPlayerUnits = Object.values(activeRosterAtLevelStart || {}).reduce((a, b) => a + b, 0);
    const finalPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)).length;
    const unitsLost = Math.max(0, initialPlayerUnits - finalPlayerUnits);
    let canUseAnySpell = Object.keys(spellsUnlocked).some(spell => spellsUnlocked[spell]);
    let bonusGoldNoSpells = (!spellsUsedThisLevel && canUseAnySpell) ? LEVEL_COMPLETE_BONUS_GOLD.noSpells : 0;
    let bonusGoldFlawless = 0; let bonusGoldNoLosses = 0;
    if (unitsLost === 0 && finalPlayerUnits > 0) { const survivingPlayerUnits = units.filter(u => u.team === 'player' && isUnitAliveAndValid(u)); const allSurvivingFullHp = survivingPlayerUnits.every(u => u.hp === u.maxHp); if (allSurvivingFullHp) bonusGoldFlawless = LEVEL_COMPLETE_BONUS_GOLD.fullHp; else bonusGoldNoLosses = LEVEL_COMPLETE_BONUS_GOLD.noLosses; }
    const totalBonusGold = bonusGoldNoSpells + bonusGoldFlawless + bonusGoldNoLosses;
    const totalGoldEarnedThisLevel = goldCollectedThisLevel + totalBonusGold;
    return { enemiesKilled: enemiesKilledThisLevel, unitsLost: unitsLost, goldGained: goldCollectedThisLevel, bonusGoldNoSpells, bonusGoldFullHp: bonusGoldFlawless, bonusGoldNoLosses, totalGoldEarned: totalGoldEarnedThisLevel };
}

function checkWinLossConditions() {
    if (!isGameActiveFlag || isGameOver() || levelClearedAwaitingInput) return;
    const playersLeft = units.some(u => u.team === 'player' && isUnitAliveAndValid(u)); if (!playersLeft) { if (!isGameOver()) gameOver(false); return; } if (isProcessing) return;
    const enemiesLeft = units.some(u => u.team === 'enemy' && isUnitAliveAndValid(u));
    if (!enemiesLeft) {
        levelClearedAwaitingInput = true; playSfx('levelComplete'); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null);
        if (currentLevel >= highestLevelReached) highestLevelReached = currentLevel + 1;
        const stats = calculateLevelStats(); const finalPlayerGold = playerGold + stats.totalGoldEarned;
        if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel, finalPlayerGold, gameSettings.playerName); saveGameData();
        const remainingCollectibles = items.some(item => !item.collected && (item.type !== 'chest' || !item.opened)); const feedbackMsg = remainingCollectibles ? "Enemies Cleared!<br>Collect items or proceed." : "Level Cleared!"; if (typeof showFeedback === 'function') showFeedback(feedbackMsg, "feedback-levelup"); if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
    }
}

function startNextLevel() { if (isGameOver()) return; currentLevel++; levelToRestartOnLoss = currentLevel; levelClearedAwaitingInput = false; initGame(currentLevel); }

function forfeitLevel() {
    if (!isGameActiveFlag || isProcessing || isGameOver()) return; isGameActiveFlag = false; levelClearedAwaitingInput = false; isProcessing = true; stopMusic(); if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null; playSfx('forfeit');
    const startingGoldForLevel = Math.max(0, playerGold - goldCollectedThisLevel); const goldLostFromStart = Math.floor(startingGoldForLevel * 0.05); const goldLostFromLevel = goldCollectedThisLevel; const totalPenalty = goldLostFromStart + goldLostFromLevel; const goldBeforePenalty = playerGold; playerGold = Math.max(0, startingGoldForLevel - goldLostFromStart);
    let messageText = `Level ${currentLevel} Forfeited!<br>`; messageText += `Penalty: Lost ${goldLostFromLevel} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"> (level gain) + ${goldLostFromStart} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"> (5% penalty).<br>`; messageText += `Gold: ${goldBeforePenalty} -> ${playerGold}`;
    if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel - 1, playerGold, gameSettings.playerName); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showGameOverScreen === 'function') showGameOverScreen(false, messageText, true);
}

function gameOver(playerWonGame, customMessage = "", isForfeit = false) {
    if (isGameOver()) return; isGameActiveFlag = false; levelClearedAwaitingInput = false; isProcessing = true; stopMusic(); if (winCheckTimeout) clearTimeout(winCheckTimeout); winCheckTimeout = null; let messageText = customMessage || ""; let isTrueVictory = playerWonGame;
    if (!messageText) { if (!isTrueVictory && !isForfeit) { playSfx('gameOver'); const startingGoldForLevel = Math.max(0, playerGold - goldCollectedThisLevel); const goldLostFromStart = Math.floor(startingGoldForLevel * 0.05); const goldBeforePenalty = playerGold; playerGold = Math.max(0, startingGoldForLevel - goldLostFromStart); messageText = `You have fallen on Level ${currentLevel}!<br>`; messageText += `Lost ${goldLostFromStart} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"> (5% penalty).<br>`; messageText += `Gold: ${goldBeforePenalty} -> ${playerGold}`; if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel - 1, playerGold, gameSettings.playerName); } } else if (!playerWonGame) playSfx('gameOver');
    saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showGameOverScreen === 'function') showGameOverScreen(isTrueVictory, messageText, isForfeit);
}

function isGameOver() { return typeof isGameOverScreenVisible === 'function' && isGameOverScreenVisible(); }
function isGameActive() { return isGameActiveFlag; }

// --- Shop & Roster Logic ---

function getRecruitCost(unitType) { const baseCost = RECRUIT_BASE_COSTS[unitType] || 99999; const ownedCount = playerOwnedUnits[unitType] || 0; return baseCost + (ownedCount * RECRUIT_COST_INCREASE_PER_UNIT); }
function purchaseUnit(unitType) { const cost = getRecruitCost(unitType); const currentOwnedForType = playerOwnedUnits[unitType] || 0; const totalOwnedBefore = Object.values(playerOwnedUnits).reduce((sum, count) => sum + count, 0); if (playerGold >= cost && currentOwnedForType < MAX_OWNED_PER_TYPE) { playerGold -= cost; playerOwnedUnits[unitType] = currentOwnedForType + 1; const totalOwnedAfter = totalOwnedBefore + 1; const shouldPopup = (totalOwnedBefore < TACTICAL_COMMAND_UNLOCK_UNITS && totalOwnedAfter >= TACTICAL_COMMAND_UNLOCK_UNITS); if (getTotalActiveUnits() < maxActiveRosterSize && !shouldPopup) addUnitToActiveRoster(unitType); saveGameData(); return { success: true, showTroopsPopup: shouldPopup }; } return { success: false }; }
function purchaseUnitUpgrade(upgradeType) { const cost = UNIT_UPGRADE_COSTS[upgradeType]; if (cost === undefined || playerGold < cost) return false; playerGold -= cost; playerUnitUpgrades[upgradeType] = (playerUnitUpgrades[upgradeType] || 0) + 1; saveGameData(); return true; }
function calculateSpellCost(spellName) { const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return 99999; const currentLevel = playerSpellUpgrades[spellName] || 0; if (currentLevel >= config.maxLevel) return Infinity; return config.baseCost + (currentLevel * config.costIncrease); }
function purchaseSpellUpgrade(spellName) { const config = SPELL_UPGRADE_CONFIG[spellName]; if (!config) return false; const currentUpgradeLevel = playerSpellUpgrades[spellName] || 0; const cost = calculateSpellCost(spellName); const meetsLevelReq = highestLevelReached > config.requiredLevel; if (playerGold >= cost && currentUpgradeLevel < config.maxLevel && meetsLevelReq) { playerGold -= cost; playerSpellUpgrades[spellName]++; saveGameData(); return true; } return false; }
function purchasePassive(passiveId) { const cost = PASSIVE_UPGRADE_COSTS[passiveId]; if (cost === undefined) return false; if (passiveId === 'tactical_command') { const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0; const canBuyMore = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) < MAX_ACTIVE_ROSTER_SIZE_MAX; const meetsUnitReq = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0) >= TACTICAL_COMMAND_UNLOCK_UNITS; if (playerGold >= cost && canBuyMore && meetsUnitReq) { playerGold -= cost; playerPassiveUpgrades.tactical_command = currentBonusSlots + 1; maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE + playerPassiveUpgrades.tactical_command; saveGameData(); return true; } } return false; } // Only Tactical Command is purchasable now
function getTotalActiveUnits() { if (!playerActiveRoster) return 0; return Object.values(playerActiveRoster).reduce((sum, count) => sum + (parseInt(count, 10) || 0), 0); }
function addUnitToActiveRoster(unitType) { const currentOwned = playerOwnedUnits[unitType] || 0; const currentActive = playerActiveRoster[unitType] || 0; const totalActive = getTotalActiveUnits(); if (currentActive < currentOwned && totalActive < maxActiveRosterSize) { playerActiveRoster[unitType] = currentActive + 1; saveGameData(); return true; } return false; }
function removeUnitFromActiveRoster(unitType) { const currentActive = playerActiveRoster[unitType] || 0; if (currentActive > 0) { playerActiveRoster[unitType] = currentActive - 1; if (playerActiveRoster[unitType] === 0) delete playerActiveRoster[unitType]; saveGameData(); return true; } return false; }


// --- Save/Load ---
function saveGameData() {
    try { localStorage.setItem(STORAGE_KEY_HIGHEST_LEVEL, highestLevelReached.toString()); localStorage.setItem(STORAGE_KEY_GOLD, playerGold.toString()); localStorage.setItem(STORAGE_KEY_OWNED_UNITS, JSON.stringify(playerOwnedUnits)); localStorage.setItem(STORAGE_KEY_ACTIVE_ROSTER, JSON.stringify(playerActiveRoster)); localStorage.setItem(STORAGE_KEY_UNIT_UPGRADES, JSON.stringify(playerUnitUpgrades)); localStorage.setItem(STORAGE_KEY_SPELL_UPGRADES, JSON.stringify(playerSpellUpgrades)); localStorage.setItem(STORAGE_KEY_PASSIVE_UPGRADES, JSON.stringify(playerPassiveUpgrades)); localStorage.setItem(STORAGE_KEY_CHEAT_SPELL_ATK, playerCheatSpellAttackBonus.toString()); localStorage.setItem(STORAGE_KEY_MAX_ROSTER_SIZE, maxActiveRosterSize.toString()); localStorage.setItem(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL, lastTreasureHunterLevel.toString()); saveSettings(); } catch (e) { console.warn("Could not save game data.", e); }
}
function loadGameData() {
    try { highestLevelReached = parseInt(localStorage.getItem(STORAGE_KEY_HIGHEST_LEVEL) || '1', 10) || 1; playerGold = parseInt(localStorage.getItem(STORAGE_KEY_GOLD) || '0', 10) || 0; playerCheatSpellAttackBonus = parseInt(localStorage.getItem(STORAGE_KEY_CHEAT_SPELL_ATK) || '0', 10) || 0; maxActiveRosterSize = parseInt(localStorage.getItem(STORAGE_KEY_MAX_ROSTER_SIZE) || MAX_ACTIVE_ROSTER_SIZE_BASE.toString(), 10) || MAX_ACTIVE_ROSTER_SIZE_BASE; lastTreasureHunterLevel = parseInt(localStorage.getItem(STORAGE_KEY_LAST_TREASURE_HUNTER_LEVEL) || '-999', 10) || -999;
        const defaultOwnedUnits = { knight: 3, archer: 0, champion: 0 }; const storedOwnedUnits = localStorage.getItem(STORAGE_KEY_OWNED_UNITS); playerOwnedUnits = storedOwnedUnits ? JSON.parse(storedOwnedUnits) : { ...defaultOwnedUnits }; Object.keys(UNIT_DATA).forEach(key => { if (UNIT_DATA[key].team === 'player') { if (!(key in playerOwnedUnits)) playerOwnedUnits[key] = 0; playerOwnedUnits[key] = Math.max(0, Math.min(parseInt(playerOwnedUnits[key] || '0', 10), MAX_OWNED_PER_TYPE)); } }); if (Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) === 0 && highestLevelReached <= 1) playerOwnedUnits = { ...defaultOwnedUnits };
        const storedActiveRoster = localStorage.getItem(STORAGE_KEY_ACTIVE_ROSTER); let loadedRoster = storedActiveRoster ? JSON.parse(storedActiveRoster) : {}; let totalActive = 0; const validatedRoster = {}; Object.keys(playerOwnedUnits).forEach(type => { const activeCount = Math.min(playerOwnedUnits[type], parseInt(loadedRoster[type] || '0', 10)); if (activeCount > 0) { if (totalActive + activeCount <= maxActiveRosterSize) { validatedRoster[type] = activeCount; totalActive += activeCount; } else if (totalActive < maxActiveRosterSize) { const canAdd = maxActiveRosterSize - totalActive; validatedRoster[type] = canAdd; totalActive += canAdd; } } }); playerActiveRoster = validatedRoster; if (totalActive === 0 || totalActive > maxActiveRosterSize) { playerActiveRoster = {}; let currentTotal = 0; const ownedOrder = Object.keys(playerOwnedUnits).sort((a, b) => playerOwnedUnits[b] - playerOwnedUnits[a]); for (const type of ownedOrder) { const canAdd = Math.min(playerOwnedUnits[type], maxActiveRosterSize - currentTotal); if (canAdd > 0) { playerActiveRoster[type] = canAdd; currentTotal += canAdd; } if (currentTotal >= maxActiveRosterSize) break; } if (currentTotal === 0 && Object.values(playerOwnedUnits).reduce((a, b) => a + b, 0) > 0) { const firstOwned = Object.keys(playerOwnedUnits).find(type => playerOwnedUnits[type] > 0); if (firstOwned) playerActiveRoster[firstOwned] = 1; } }
        const defaultUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0 }; const storedUnitUpgrades = localStorage.getItem(STORAGE_KEY_UNIT_UPGRADES); playerUnitUpgrades = storedUnitUpgrades ? JSON.parse(storedUnitUpgrades) : { ...defaultUnitUpgrades }; Object.keys(defaultUnitUpgrades).forEach(key => { if (!(key in playerUnitUpgrades)) playerUnitUpgrades[key] = defaultUnitUpgrades[key]; playerUnitUpgrades[key] = Math.max(0, parseInt(playerUnitUpgrades[key] || '0', 10)); });
        const defaultSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 }; const storedSpellUpgrades = localStorage.getItem(STORAGE_KEY_SPELL_UPGRADES); playerSpellUpgrades = storedSpellUpgrades ? JSON.parse(storedSpellUpgrades) : { ...defaultSpellUpgrades }; Object.keys(defaultSpellUpgrades).forEach(key => { if (!(key in playerSpellUpgrades)) playerSpellUpgrades[key] = defaultSpellUpgrades[key]; const maxLvl = SPELL_UPGRADE_CONFIG[key]?.maxLevel ?? 99; playerSpellUpgrades[key] = Math.max(0, Math.min(parseInt(playerSpellUpgrades[key] || '0', 10), maxLvl)); });
        const defaultPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 }; const storedPassiveUpgrades = localStorage.getItem(STORAGE_KEY_PASSIVE_UPGRADES); playerPassiveUpgrades = storedPassiveUpgrades ? JSON.parse(storedPassiveUpgrades) : { ...defaultPassiveUpgrades }; Object.keys(defaultPassiveUpgrades).forEach(key => { if (!(key in playerPassiveUpgrades)) playerPassiveUpgrades[key] = defaultPassiveUpgrades[key]; if (key === 'gold_magnet' || key === 'tactical_command') playerPassiveUpgrades[key] = Math.max(0, parseInt(playerPassiveUpgrades[key] || '0', 10)); }); maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE + (playerPassiveUpgrades.tactical_command || 0);
        playerGold = Math.max(0, playerGold); playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); maxActiveRosterSize = Math.max(MAX_ACTIVE_ROSTER_SIZE_BASE, Math.min(maxActiveRosterSize, MAX_ACTIVE_ROSTER_SIZE_MAX)); loadSettings();
    } catch (e) { console.warn("Could not load game data. Starting fresh.", e); highestLevelReached = 1; playerGold = 0; playerOwnedUnits = { knight: 3, archer: 0, champion: 0 }; maxActiveRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE; playerActiveRoster = { knight: Math.min(3, maxActiveRosterSize) }; playerUnitUpgrades = { knight_hp: 0, knight_atk: 0, archer_hp: 0, archer_atk: 0, champion_hp: 0, champion_atk: 0 }; playerSpellUpgrades = { fireball: 0, flameWave: 0, frostNova: 0, heal: 0 }; playerPassiveUpgrades = { gold_magnet: 0, tactical_command: 0 }; playerCheatSpellAttackBonus = 0; lastTreasureHunterLevel = -TREASURE_HUNTER_SPAWN_COOLDOWN; gameSettings = { showHpBars: false, playerName: "Hero" }; saveSettings(); }
}

function loadSettings() { const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS); if (storedSettings) { try { const parsedSettings = JSON.parse(storedSettings); gameSettings.showHpBars = parsedSettings.showHpBars === true; gameSettings.playerName = typeof parsedSettings.playerName === 'string' ? parsedSettings.playerName.substring(0, 12) : "Hero"; } catch (e) { gameSettings = { showHpBars: false, playerName: "Hero" }; } } else gameSettings = { showHpBars: false, playerName: "Hero" }; if (typeof updateHpBarSettingUI === 'function') updateHpBarSettingUI(gameSettings.showHpBars); if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility(); }
function saveSettings() { try { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(gameSettings)); } catch (e) { console.warn("Could not save settings.", e); } }
function updateSetting(key, value) { if (gameSettings.hasOwnProperty(key)) { if (key === 'playerName' && typeof value === 'string') gameSettings[key] = value.substring(0, 12); else if (key === 'showHpBars') { gameSettings[key] = value === true; if (typeof updateWorldHpBarsVisibility === 'function') updateWorldHpBarsVisibility(); } else gameSettings[key] = value; saveSettings(); } }

// --- Cheats ---
function applyCheatGold(amount) { playerGold += amount; playerGold = Math.max(0, playerGold); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); if (typeof updateShopDisplay === 'function') updateShopDisplay(); if (typeof updateChooseTroopsScreen === 'function') updateChooseTroopsScreen(); playSfx('cheat'); if (typeof showFeedback === 'function') showFeedback(`CHEAT: +${amount} Gold!`, "feedback-cheat"); }
function applyCheatSpellAttack(amount) { playerCheatSpellAttackBonus += amount; playerCheatSpellAttackBonus = Math.max(0, playerCheatSpellAttackBonus); saveGameData(); playSfx('cheat'); if (typeof showFeedback === 'function') showFeedback(`CHEAT: Spell ATK +${amount}!`, "feedback-cheat"); if (typeof updateSpellUI === 'function') updateSpellUI(); }

// --- UI Integration Helpers ---
function toggleWorldHpBarsVisibility() { gameSettings.showHpBars = !gameSettings.showHpBars; updateSetting('showHpBars', gameSettings.showHpBars); if (typeof updateHpBarSettingUI === 'function') updateHpBarSettingUI(gameSettings.showHpBars); }

// --- Recolor ---
async function initializeSpriteRecoloring() {
    console.log("Initializing sprite recoloring...");
    const recolorPromises = SPRITE_KEYS_FOR_RECOLOR.map(async (spriteKey) => {
        const basePath = `./sprites/${spriteKey}.png`;
        generatedSpriteUrls[spriteKey] = { green: basePath }; // Store original as 'green'
        const image = new Image(); image.crossOrigin = "Anonymous";
        try {
            image.src = basePath; await image.decode(); // Wait for load
            generatedSpriteUrls[spriteKey].green = image.src; // Store resolved original path
            for (const variantSuffix in REPLACEMENT_VARIANTS) {
                const replacementRgb = REPLACEMENT_VARIANTS[variantSuffix];
                try { const dataUrl = await generateRecoloredSpriteDataURL(image, replacementRgb); generatedSpriteUrls[spriteKey][variantSuffix] = dataUrl; }
                catch (genError) { console.error(`Generate error: ${variantSuffix} for ${spriteKey}`, genError); }
            }
        } catch (loadError) { console.error(`Load error: ${basePath}`, loadError); generatedSpriteUrls[spriteKey].green = './sprites/error.png'; } // Mark failure
    });
    await Promise.all(recolorPromises); console.log("Sprite recoloring finished.");
}
function generateRecoloredSpriteDataURL(img, replacementRgb) {
    return new Promise((resolve, reject) => {
        const canvas = document.getElementById('recolor-canvas'); if (!canvas) return reject(new Error("Recolor canvas missing"));
        const ctx = canvas.getContext('2d', { willReadFrequently: true }); if (!ctx) return reject(new Error("Canvas context missing"));
        canvas.width = img.naturalWidth || img.width; canvas.height = img.naturalHeight || img.height; if (canvas.width === 0 || canvas.height === 0) return reject(new Error(`Image dimensions zero: ${img.src}`));
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); let imageData;
        try { imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch (e) { return reject(new Error(`Canvas error: ${e.message}. Use web server.`)); }
        const data = imageData.data; const { r: tr, g: tg, b: tb } = TARGET_GREEN_RGB;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (Math.abs(r - tr) <= COLOR_TOLERANCE && Math.abs(g - tg) <= COLOR_TOLERANCE && Math.abs(b - tb) <= COLOR_TOLERANCE && a > 200) { data[i] = replacementRgb.r; data[i + 1] = replacementRgb.g; data[i + 2] = replacementRgb.b; }
        } ctx.putImageData(imageData, 0, 0); resolve(canvas.toDataURL());
    });
}


// --- Global Error Handling ---
window.onerror = function (message, source, lineno, colno, error) { console.error("!! Global Error Caught !!", { message, source, lineno, colno, error }); isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); return false; };