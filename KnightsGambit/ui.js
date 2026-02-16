// ui.js



let gameContainer, gameBoardWrapper, gameBoard, gridContent, uiPanel, levelDisplayElement,

    spellAreaElement, fireballElement, flameWaveElement, frostNovaElement, healElement,

    unitInfo, unitPortraitElement, actionsLeftDisplayElement, unitNameDisplay,

    unitAtkDisplay, unitMovDisplay, unitRngDisplay, unitStatusDisplay,

    unitHpBarContainer, unitHpBarElement, boardFeedbackArea, endTurnButton,

    mainMenu, startGameButton, leaderboardMenuButton, achievementsMenuButton, settingsMenuButton,

    gameOverScreen, restartButton, gameOverTitle, gameOverMessage, gameOverToTitleButton,

    tooltipElement, menuButton, menuOverlay, closeMenuButton, quitButton, menuOptionsButton,

    quitToMainMenuButton, leaderboardOverlay, leaderboardList, leaderboardEntry, playerNameInput, submitScoreButton,

    closeLeaderboardButton, levelSelectScreen, levelSelectMapContainer, levelSelectMap,

    levelSelectDotsLayer, backToMainMenuButton, menuGoldAmountElement, menuGoldDisplay,

    shopScreen, shopItemsContainer, shopGoldAmountElement, shopGoldDisplay, shopActionButton,

    shopExitButton, shopFeedbackElement, shopSelectedItemInfoElement, levelCompleteScreen, levelCompleteTitle,

    levelCompleteStats, statsEnemiesKilled, statsUnitsLost, statsGoldGained,

    levelCompleteBonuses, statsBonusList, statsTotalGold, nextLevelButton,

    levelCompleteShopButton, levelCompleteTotalGoldElement, defaultViewButton, fillWidthButton, chooseTroopsScreen, chooseTroopsTitle,

    currentTroopsList, availableTroopsList, currentRosterCountElement, maxRosterSizeElement, chooseTroopsFeedback,

    confirmTroopsButton, troopsBackButton, levelSelectTroopsButton, shopTroopsButton,

    unitHpBarsOverlay, levelSelectShopButton, settingsOverlay, closeSettingsButton,

    achievementsOverlay, closeAchievementsButton, achievementsListElement, achievementCompletionStatusElement,

    levelSelectPagination, levelSelectPrevPage, levelSelectNextPage, levelSelectPageInfo,

    musicVolumeSlider, musicVolumeValueSpan, sfxVolumeSlider, sfxVolumeValueSpan, muteToggleSetting,

    fullscreenToggleSetting, playerNameSettingInput, abilityStealthButton, abilityQuickStrikeButton,

    forestArmorAbilityButton, forestArmorContainer, shopTroopsTabContent,
    customAlertOverlay, customAlertTitle, customAlertMessage, customAlertConfirmButton,
    accountsOverlay, newProfileOverlay, deleteConfirmOverlay;

// Cheat UI Globals




// Debug Spawner Globals

let debugSpawnerOverlay, debugEnemyGrid, closeDebugSpawnerButton;

let selectedEnemyType = null;

let debugSpawnMode = false;



let currentCellSize = 30;

let gridContentOffsetX = 0; let gridContentOffsetY = 0;

let currentZoom = 1;



let gridMouseDownPos = { x: 0, y: 0 }; // Track mouse down for drag detection



const MIN_ZOOM = 0.5;

const MAX_ZOOM = 3.0;

let isPanning = false; let panStartX = 0; let panStartY = 0;

let gridStartPanX = 0; let gridStartPanY = 0;

let pinchStartDistance = 0; let touchCenter = { x: 0, y: 0 };



let resizeTimeout = null;

let cellElementsMap = new Map();

let highlightedAttackCells = [];

let currentMouseX = 0; let currentMouseY = 0;

let tooltipUpdateInterval = null;

let tooltipTimeout = null;

let shopIsBetweenLevels = false;

let lastHoveredElement = null;

let lastTooltipType = null;

let lastTooltipDataId = null;

const RECRUIT_UNLOCK_LEVELS_MAP = {
    knight: 1,
    archer: ARCHER_RESCUE_LEVEL || 10,
    champion: CHAMPION_RESCUE_LEVEL || 24,
    rogue: ROGUE_RESCUE_LEVEL || 40,
    wizard: WIZARD_UNLOCK_LEVEL || 60
};

let selectedShopItemId = null;



let mapZoom = 1; let mapOffsetX = 0; let mapOffsetY = 0;

const MIN_MAP_ZOOM = 1; const MAX_MAP_ZOOM = 5;

let isMapPanning = false; let mapPanStartX = 0; let mapPanStartY = 0;

let mapStartPanX = 0; let mapStartPanY = 0;



let persistentEnemyRangeUnitIds = new Set();

let mapIntrinsicWidth = 1024; let mapIntrinsicHeight = 1024;

let currentLevelSelectPage = 1;

const TOTAL_LEVELS_TO_SHOW = 100000;



let currentShopOrigin = '';

let troopScreenOrigin = '';

let levelToStartAfterManage = 0;

let worldHpBars = new Map();

let shouldShowTroopsAfterPurchase = false;

let currentShopTab = 'main';

let currentLeaderboardFilter = 'all';

let mobileTooltipTimeout = null;

let touchStartX = 0;

let touchStartY = 0;

let isTouchScrolling = false;



function isMobileDevice() {

    return window.matchMedia("(hover: none) and (pointer: coarse)").matches || window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

}



function calculateCellSize() {

    if (!gameBoard) return;

    const boardWidth = gameBoard.clientWidth; const boardHeight = gameBoard.clientHeight;

    if (boardWidth <= 1 || boardHeight <= 1) { currentCellSize = Math.max(currentCellSize || 20, 20); document.documentElement.style.setProperty('--cell-size', `${currentCellSize}px`); return; }

    const cellWidth = Math.floor(boardWidth / currentGridCols); const cellHeight = Math.floor(boardHeight / currentGridRows); currentCellSize = Math.max(10, Math.min(cellWidth, cellHeight)); document.documentElement.style.setProperty('--cell-size', `${currentCellSize}px`);

}



function applyLayout() {

    if (currentCellSize < 10) calculateCellSize(); if (currentCellSize < 10 || !gridContent || !gameBoard) return;

    const gridWidthPx = `${currentGridCols * currentCellSize}px`; const gridHeightPx = `${currentGridRows * currentCellSize}px`;

    if (gridContent.style.width !== gridWidthPx) gridContent.style.width = gridWidthPx; if (gridContent.style.height !== gridHeightPx) gridContent.style.height = gridHeightPx; const gridTemplateColsStr = `repeat(${currentGridCols}, 1fr)`; const gridTemplateRowsStr = `repeat(${currentGridRows}, 1fr)`;

    if (gridContent.style.gridTemplateColumns !== gridTemplateColsStr) gridContent.style.gridTemplateColumns = gridTemplateColsStr; if (gridContent.style.gridTemplateRows !== gridTemplateRowsStr) gridContent.style.gridTemplateRows = gridTemplateRowsStr;

    cellElementsMap.forEach(cell => { cell.style.width = `var(--cell-size)`; cell.style.height = `var(--cell-size)`; });

    units.forEach(unit => { if (unit.element && isUnitAliveAndValid(unit)) updateUnitPosition(unit, true); });

    obstacles.forEach(obs => { if (obs.element && isObstacleIntact(obs)) updateObstaclePosition(obs); });

    items.forEach(item => { if (item.element && !item.collected) updateItemPosition(item); });

    applyZoomAndPan(); updateWorldHpBars();

}



const handleResize = () => {

    if (resizeTimeout) clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {

        const overlayVisible = isAnyOverlayVisible();
        if (!isGameActive() && !isLevelSelectOpen() && !isChooseTroopsScreenOpen()) return;

        requestAnimationFrame(() => {
            try {
                if (isGameActive()) {
                    calculateCellSize();
                    applyLayout();
                    // Always centerView if not panning/interacting, even if overlay is visible
                    centerView(true);
                } else if (isLevelSelectOpen()) {
                    applyMapZoomAndPan();
                }
            } catch (e) {
                console.error("Resize error:", e);
            }
        });

    }, 150);

};



function setupBoard(tilesetUrl) {

    if (!gridContent) { console.error("setupBoard: gridContent element not found!"); return; }

    let childrenToRemove = [];

    for (let i = 0; i < gridContent.children.length; i++) { if (gridContent.children[i].id !== 'unit-hp-bars-overlay') childrenToRemove.push(gridContent.children[i]); } childrenToRemove.forEach(child => gridContent.removeChild(child)); cellElementsMap.clear(); worldHpBars.clear();

    calculateCellSize();

    gridContent.style.width = `${currentGridCols * currentCellSize}px`; gridContent.style.height = `${currentGridRows * currentCellSize}px`; gridContent.style.gridTemplateColumns = `repeat(${currentGridCols}, 1fr)`; gridContent.style.gridTemplateRows = `repeat(${currentGridRows}, 1fr)`; gridContent.style.setProperty('--grid-cols', currentGridCols); gridContent.style.setProperty('--grid-rows', currentGridRows); gridContentOffsetX = 0; gridContentOffsetY = 0; currentZoom = 1; applyZoomAndPan();



    // Use new sprite sheet logic

    const cellFragment = document.createDocumentFragment();

    const biome = currentTerrainInfo.biome || 'forest';

    const fallbackColor = 'rgba(50, 50, 50, 0.7)';



    for (let r = 0; r < currentGridRows; r++) {

        for (let c = 0; c < currentGridCols; c++) {

            const cell = document.createElement('div');

            cell.className = `grid-cell tile-sprite tile-${biome}`;



            // Randomly assign variant

            const rand = Math.random();

            let variant = 'tile-main';

            if (rand > 0.95) variant = 'tile-dec3';

            else if (rand > 0.90) variant = 'tile-dec2';

            else if (rand > 0.85) variant = 'tile-dec1';



            cell.classList.add(variant);



            cell.dataset.x = c; cell.dataset.y = r;

            cell.addEventListener('mousedown', (e) => {

                gridMouseDownPos = { x: e.clientX, y: e.clientY };

            });

            cell.addEventListener('click', handleCellClick);

            cell.addEventListener('mouseenter', handleCellMouseEnter);



            cell.addEventListener('mouseleave', handleCellMouseLeave);

            cell.style.width = `var(--cell-size)`;

            cell.style.height = `var(--cell-size)`;

            cell.style.backgroundColor = fallbackColor;

            cellFragment.appendChild(cell);

            cellElementsMap.set(`${c},${r}`, cell);

        }

    }

    gridContent.appendChild(cellFragment);

    unitHpBarsOverlay = document.getElementById('unit-hp-bars-overlay');
    if (!unitHpBarsOverlay) {
        unitHpBarsOverlay = document.createElement('div');
        unitHpBarsOverlay.id = 'unit-hp-bars-overlay';
        gridContent.appendChild(unitHpBarsOverlay);
    } else if (gridContent.lastChild !== unitHpBarsOverlay) {
        gridContent.appendChild(unitHpBarsOverlay);
    }
    unitHpBarsOverlay.innerHTML = '';
    unitHpBarsOverlay.classList.add('visible');

    // Final check for grid visibility/rendering
    requestAnimationFrame(() => {
        if (gridContent.children.length <= 1) { // Only HP overlay or empty
            console.warn("setupBoard: Grid failed to render child cells, retrying logic...");
            // Fallback: direct style sync
            gridContent.style.display = 'grid';
            applyLayout();
        }
    });

}



function renderAll() {

    if (!gridContent) return; gridContent.querySelectorAll(':scope > *:not(.grid-cell):not(#unit-hp-bars-overlay)').forEach(el => el.remove()); worldHpBars.clear(); if (unitHpBarsOverlay) unitHpBarsOverlay.innerHTML = '';

    const fragment = document.createDocumentFragment();

    obstacles.forEach(obs => { if (isObstacleIntact(obs)) renderObstacle(obs, fragment); }); items.forEach(item => { if (!item.collected) renderItem(item, fragment); updateCellItemStatus(item.x, item.y); }); units.forEach(unit => { if (isUnitAliveAndValid(unit)) renderUnit(unit, fragment); }); gridContent.appendChild(fragment);

    if (unitHpBarsOverlay && gridContent.lastChild !== unitHpBarsOverlay) gridContent.appendChild(unitHpBarsOverlay); if (unitHpBarsOverlay) unitHpBarsOverlay.classList.add('visible');

}



function renderUnit(unit, parentElement = gridContent) {

    if (!parentElement || !unit) return null;

    unit.element?.remove();

    const el = document.createElement('div');

    el.className = `unit ${unit.team} ${unit.type}`;

    if (unit.isElite) el.classList.add('elite');

    el.dataset.id = unit.id;



    // Use polymorph sprite for polymorphed units

    if (unit.isPolymorphed) {

        el.style.backgroundImage = "url('./sprites/skills.png')";

        el.style.backgroundPosition = "100% 0"; // Polymorph is at position 100% 0

        el.style.backgroundSize = "500% 300%"; el.style.backgroundRepeat = "no-repeat"; // 5 columns, 2 rows

    } else {

        // Apply player armor variant logic: if player team, use equippedArmorId if available

        let variant = unit.spriteVariant || unit.variantType;

        if (unit.team === 'player' && typeof equippedArmorId !== 'undefined' && equippedArmorId) {

            // Respect unit.armor_type if explicitly set (e.g. rescued prisoners forced to 'grey'), but ignore defaults

            if (unit.armor_type && unit.armor_type !== 'grey' && unit.armor_type !== 'none') {

                variant = unit.armor_type;

            } else {

                variant = equippedArmorId;

            }

        }



        const idleStyles = getSpritePositionStyles(unit.type, 'idle', variant);

        el.style.backgroundImage = idleStyles.backgroundImage;

        el.style.backgroundPosition = idleStyles.backgroundPosition;

        el.style.backgroundSize = idleStyles.backgroundSize;

    }



    el.alt = unit.name;

    el.addEventListener('click', (ev) => handleUnitClick(ev, unit));

    el.addEventListener('mouseenter', handleUnitMouseEnter);

    el.addEventListener('mouseleave', handleUnitMouseLeave);

    unit.element = el;

    parentElement.appendChild(el);

    setUnitVariantClass(unit);

    updateUnitPosition(unit, true);

    updateUnitVisualState(unit);

    if (isMobileDevice()) {

        showTooltip(unit, 'unit');

        setTimeout(() => { if (tooltipElement) tooltipElement.classList.remove('visible'); }, 1000);

    }

    // Only show attack highlights if this is the currently selected unit

    if (selectedUnit && selectedUnit.id === unit.id) {

        if (unit.team === 'enemy') {

            const currentRange = unit.currentRange || unit.range;

            if (currentRange > 1 && typeof highlightEnemyRange === 'function') {

                highlightEnemyRange(unit);

            }

        } else if (typeof highlightMovesAndAttacks === 'function') {

            highlightMovesAndAttacks(unit);

        }

    }



    // Apply scale if defined in UNIT_DATA (but not on mobile for large units)

    const unitData = UNIT_DATA[unit.type];

    const isMobileUI = isMobileDevice();

    if (unitData && unitData.scale && (!isMobileUI || unitData.scale <= 1.0)) {

        el.style.transform = `translate(-50%, -50%) scale(${unitData.scale})`;

        // Adjust z-index if needed to ensure larger units don't clip weirdly, though standard z-index might be fine

        el.style.zIndex = '6';

    }



    return el;

}



function updateUnitSprite(unit) {

    if (unit.element && unit.spriteUrl) {

        unit.element.style.backgroundImage = `url('${unit.spriteUrl}')`;

        const idleStyles = getSpritePositionStyles(unit.type, 'idle', unit.variantType);

        unit.element.style.backgroundPosition = idleStyles.backgroundPosition;

        unit.element.style.backgroundSize = idleStyles.backgroundSize;

    }

}



// Global mouse tracking for hotkeys

document.addEventListener('mousemove', (e) => {

    currentMouseX = e.clientX;

    currentMouseY = e.clientY;

});



// Handle clicks on obstacles (snowman, barrels, crates, doors, towers)

/* active handleObstacleClick is at line ~1588 */



// Show obstacle info in the side panel

function showObstacleInfo(obstacle) {

    if (!unitInfo || !unitNameDisplay || !unitPortraitElement) return;

    const data = OBSTACLE_DATA[obstacle.type];

    if (!data) return;



    // Show the info panel

    unitInfo.parentElement.style.display = ''; // Ensure parent is visible

    unitInfo.style.display = 'grid'; // Ensure panel is grid

    unitInfo.classList.add('visible');

    unitInfo.setAttribute('aria-hidden', 'false');



    // Set name

    unitNameDisplay.textContent = data.name || obstacle.type;



    // Set portrait using sprite sheet

    if (data.useSpritesheet) {

        const styles = getSpritePositionStyles(obstacle.type, 'portrait');

        unitPortraitElement.style.backgroundImage = styles.backgroundImage;

        unitPortraitElement.style.backgroundPosition = styles.backgroundPosition;

        unitPortraitElement.style.backgroundSize = styles.backgroundSize;

    } else {

        unitPortraitElement.style.backgroundImage = '';

    }

    unitPortraitElement.style.opacity = '1';

    unitPortraitElement.className = '';



    // Set HP if destructible

    const infoHpTextElement = unitInfo?.querySelector('.unit-hp-text');

    const infoHpBarElement = unitInfo?.querySelector('.unit-hp-bar');

    if (obstacle.destructible && obstacle.maxHp > 0) {

        const hpPercent = Math.max(0, Math.min(100, Math.round((obstacle.hp / obstacle.maxHp) * 100)));

        if (infoHpTextElement) infoHpTextElement.textContent = `${obstacle.hp}/${obstacle.maxHp}`;

        if (infoHpBarElement) {

            infoHpBarElement.style.setProperty('--hp-percent', `${hpPercent}%`);

            infoHpBarElement.dataset.hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high'));

        }

    } else {

        if (infoHpTextElement) infoHpTextElement.textContent = '-/-';

        if (infoHpBarElement) infoHpBarElement.style.setProperty('--hp-percent', '0%');

    }



    // Hide unit-specific stats

    if (unitAtkDisplay) { unitAtkDisplay.style.display = 'none'; }

    if (unitMovDisplay) { unitMovDisplay.style.display = 'none'; }

    if (unitRngDisplay) { unitRngDisplay.style.display = 'none'; }



    // Show description in status

    if (unitStatusDisplay) {

        unitStatusDisplay.textContent = data.description || '';

        unitStatusDisplay.style.display = data.description ? 'block' : 'none';



        // Add tower range bonus to description if applicable

        if (obstacle.type === 'tower' && data.rangeBonus) {

            unitStatusDisplay.textContent += ` Provides cover and ranged units receive +1 RNG`;

            unitStatusDisplay.style.display = 'block';

        }

    }



    // Hide ability buttons

    if (abilityStealthButton) abilityStealthButton.classList.add('hidden');

    if (abilityQuickStrikeButton) abilityQuickStrikeButton.classList.add('hidden');



    // Hide Wizard abilities

    if (document.getElementById('ability-chain-lightning')) document.getElementById('ability-chain-lightning').classList.add('hidden');

    if (document.getElementById('ability-polymorph')) document.getElementById('ability-polymorph').classList.add('hidden');

}



function renderObstacle(obstacle, parentElement = gridContent) {

    if (!parentElement || !obstacle) return null;

    obstacle.element?.remove();

    const data = OBSTACLE_DATA[obstacle.type];

    if (!data) return null;



    // Special handling for Mud: it's now a floor tile variant "rough"

    if (obstacle.type === 'mud') {

        const cell = cellElementsMap.get(`${obstacle.x},${obstacle.y}`);

        if (cell) {

            // Remove existing variant classes

            cell.classList.remove('tile-main', 'tile-dec1', 'tile-dec2', 'tile-dec3');

            // Add rough variant

            cell.classList.add('tile-rough');

        }

        return null; // Don't render an obstacle element

    }



    const el = document.createElement('div');

    el.className = `obstacle ${obstacle.type} ${data.spriteClass}`; // Add type as class for CSS targeting

    el.dataset.id = obstacle.id;

    el.alt = obstacle.type;

    // Fix shadow layering: higher Y = higher Z-index

    // Base z-index 100 ensures they are above grid floor (0-10) but below UI overlays



    // Check if obstacle is "destroyed" or "broken" or a "corpse" to lower z-index

    // Revealed snowmen are also "dead" effectively

    if (obstacle.type.includes('broken') || obstacle.type.includes('destroyed') || obstacle.type === 'corpse' || (obstacle.type === 'snowman' && obstacle.revealed)) {

        el.style.zIndex = '1';

    } else if (obstacle.type === 'door' && !obstacle.isVertical) {

        el.style.zIndex = '1'; // Horizontal doors below units

    } else {

        el.style.zIndex = 110 + obstacle.y;

    }



    // Apply sprite sheet styles for obstacles with sprite sheets

    if (data.useSpritesheet) {

        const idleStyles = getSpritePositionStyles(obstacle.type, 'idle');

        el.style.backgroundImage = idleStyles.backgroundImage;

        el.style.backgroundPosition = idleStyles.backgroundPosition;

        el.style.backgroundSize = idleStyles.backgroundSize;

    }



    if (obstacle.type === 'door' && obstacle.isVertical) el.classList.add('vertical');

    if (data.zIndex !== undefined) el.style.zIndex = data.zIndex;



    // Always use handleObstacleClick to ensure spells (like Flame Wave) work on ALL obstacles

    el.addEventListener('click', (ev) => handleObstacleClick(ev, obstacle));



    el.addEventListener('mouseenter', handleObstacleMouseEnter);

    el.addEventListener('mouseleave', handleObstacleMouseLeave);



    obstacle.element = el;

    parentElement.appendChild(el);

    updateObstaclePosition(obstacle);

    updateCellObstacleStatus(obstacle.x, obstacle.y);

    return el;

}



function renderItem(item, parentElement = gridContent) {

    if (!parentElement || !item) return null; item.element?.remove(); const data = ITEM_DATA[item.type]; if (!data) return null; const el = document.createElement('div'); el.className = `item ${data.spriteClass}`; el.dataset.id = item.id; el.dataset.x = item.x; el.dataset.y = item.y; el.style.zIndex = data.zIndex || 7; el.alt = item.type;



    const iconPos = SPRITESHEET_CONFIG.items.icons[item.type] || (item.type === 'chest' ? SPRITESHEET_CONFIG.items.icons.chest_closed : null) || (item.type === 'gold_magnet' ? SPRITESHEET_CONFIG.items.icons.gold_magnet : null);

    const cols = SPRITESHEET_CONFIG.items.columns;

    const rows = SPRITESHEET_CONFIG.items.rows;



    // Set background size to ensure correct scaling

    el.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;



    if (iconPos) {

        const xPercent = cols > 1 ? (iconPos.col / (cols - 1)) * 100 : 0;

        const yPercent = rows > 1 ? (iconPos.row / (rows - 1)) * 100 : 0;

        el.style.backgroundPosition = `${xPercent}% ${yPercent}%`;

    }



    if (item.type === 'armor' || item.type === 'helmet') {

        const armorId = item.armorId || 'grey';

        const armorDataOverride = ARMOR_DATA[armorId];



        if (armorDataOverride && armorDataOverride.iconPath && armorDataOverride.iconPosition && armorDataOverride.iconPath.includes('items.png')) {

            // Use items.png config for this armor

            const itemsConfig = SPRITESHEET_CONFIG.items;

            el.style.backgroundImage = `url('${armorDataOverride.iconPath}')`;

            el.style.backgroundSize = `${itemsConfig.columns * 100}% ${itemsConfig.rows * 100}%`;



            const xPercent = itemsConfig.columns > 1 ? (armorDataOverride.iconPosition.col / (itemsConfig.columns - 1)) * 100 : 0;

            const yPercent = itemsConfig.rows > 1 ? (armorDataOverride.iconPosition.row / (itemsConfig.rows - 1)) * 100 : 0;

            el.style.backgroundPosition = `${xPercent}% ${yPercent}%`;

        } else {

            // Default Armor Config

            const armorConfig = SPRITESHEET_CONFIG.armor_icons;

            const armorIconPos = armorConfig.icons[armorId] || armorConfig.icons.grey;



            // Override background size for armor sheet

            el.style.backgroundImage = `url('${armorConfig.imageUrl}')`;

            el.style.backgroundSize = `${armorConfig.columns * 100}% ${armorConfig.rows * 100}%`;



            const axPercent = armorConfig.columns > 1 ? (armorIconPos.col / (armorConfig.columns - 1)) * 100 : 0;

            const ayPercent = armorConfig.rows > 1 ? (armorIconPos.row / (armorConfig.rows - 1)) * 100 : 0;

            el.style.backgroundPosition = `${axPercent}% ${ayPercent}%`;

        }

    }



    if (item.type === 'chest' && item.opened) {

        el.classList.add('opened');

        const openPos = SPRITESHEET_CONFIG.items.icons.chest_opened;

        const xPercent = cols > 1 ? (openPos.col / (cols - 1)) * 100 : 0;

        const yPercent = rows > 1 ? (openPos.row / (rows - 1)) * 100 : 0;

        el.style.backgroundPosition = `${xPercent}% ${yPercent}%`;

    }



    if (item.type === 'armor' || item.type === 'helmet' || item.type === 'flame_cloak' || item.type === 'flame_ring' || item.type === 'war_bow' || item.type === 'glacier_bow' || item.type === 'tome_of_chain_lightning') {

        el.classList.add('special-item-glow');

        // Spawn particles after a short delay to ensure positioning is correct

        setTimeout(() => {

            if (item.type === 'tome_of_chain_lightning' || item.type === 'glacier_bow') {

                createCyanGlowParticles(item.x, item.y, item.id);

            } else {

                createGoldenGlowParticles(item.x, item.y, item.id);

            }

        }, 50);

    }



    el.addEventListener('click', (ev) => handleItemClick(ev, item));

    item.element = el; parentElement.appendChild(el); updateItemPosition(item); return el;

}



function updateVisualItemState(item) {

    renderItem(item);

}



function removeVisualItems(itemsToRemove) {

    if (!Array.isArray(itemsToRemove)) itemsToRemove = [itemsToRemove];

    itemsToRemove.forEach(item => {

        if (item.element) {

            item.element.classList.add('collected');

            // Remove any particles associated with this item

            const particles = gridContent?.querySelectorAll(`.particles-for-${item.id}`);

            particles?.forEach(p => p.remove());

            setTimeout(() => item.element?.remove(), 500);

        }

    });

}



function updateCellItemStatus(x, y) {

    const cell = getCellElement(x, y);

    if (!cell) return;

    const item = getItemAt(x, y);

    if (item) {

        cell.classList.add('has-item');

        cell.dataset.itemId = item.id;

    } else {

        cell.classList.remove('has-item');

        delete cell.dataset.itemId;

    }

}



function animateItemPickup(items) {

    removeVisualItems(items);

}



async function animateItemDrop(itemsToDrop, x, y) {

    if (!itemsToDrop || itemsToDrop.length === 0) return;



    // Render each dropped item

    itemsToDrop.forEach(item => {

        const itemEl = renderItem(item);

        if (itemEl) {

            // Add a small bounce/drop animation class if desired

            itemEl.style.animation = 'none';

            itemEl.offsetHeight; /* trigger reflow */



            // Stagger animation based on stackIndex

            const delay = (item.stackIndex || 0) * 0.3; // 300ms stagger

            itemEl.style.animation = `dropBounce 0.5s ease-out ${delay}s backwards`;

        }

        updateCellItemStatus(item.x, item.y);

    });



    // We do NOT call renderAll() here to avoid wiping death sprites

}



async function handleObstacleDestroyAnimation(obstacle) {

    return new Promise((resolve) => {

        if (!obstacle?.element || !gridContent) {

            resolve();

            return;

        }



        const el = obstacle.element;

        const data = OBSTACLE_DATA[obstacle.type];



        // Apply dead sprite if obstacle uses sprite sheet

        if (data?.useSpritesheet) {

            const deadStyles = getSpritePositionStyles(obstacle.type, 'dead');

            el.style.backgroundImage = deadStyles.backgroundImage;

            el.style.backgroundPosition = deadStyles.backgroundPosition;

            el.style.backgroundSize = deadStyles.backgroundSize;

        }



        el.classList.add('dead');

        el.style.zIndex = '1';

        el.style.pointerEvents = 'none';



        setTimeout(() => {

            if (!el) {

                resolve();

                return;

            }

            el.classList.add('fading-out');

            setTimeout(() => {

                el.remove();

                resolve();

            }, 500);

        }, 800);

    });

}





function updateUnitPosition(unit, forceUpdate = false) { if (!unit?.element || unit.element.classList.contains('dead')) return; const targetCol = unit.x + 1; const targetRow = unit.y + 1; unit.element.style.setProperty('--unit-x', targetCol); unit.element.style.setProperty('--unit-y', targetRow); if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); }



function getUnitFilterString(unit, includeSelectionEffects = true) {

    if (!unit) return '';

    let currentFilters = [];

    const getFilterValue = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();



    // 1. Color Transforms

    if (unit.variantType === 'purple') {

        currentFilters.push('sepia(1) saturate(3) hue-rotate(260deg) brightness(0.9)');

    }

    const unitData = UNIT_DATA[unit.type];

    if (unit.variantType === 'gold' || unitData?.forceCssVariant === 'gold') {

        currentFilters.push('sepia(1) saturate(3) hue-rotate(-15deg) brightness(1.6) contrast(1.4)');

    } else if (unitData?.forceCssVariant === 'bloodOrange') {
        currentFilters.push('sepia(1) saturate(7) hue-rotate(360deg) brightness(1.1) contrast(1.4)');
    } else if (unitData?.forceCssVariant === 'blood-caller') {
        currentFilters.push('sepia(1) saturate(6) hue-rotate(-50deg) brightness(0.8) contrast(1.2)');
    } else if (unitData?.forceCssVariant === 'witchdoctor') {
        currentFilters.push('hue-rotate(240deg) saturate(2) brightness(0.7) contrast(1.3)');
    } else if (unit.variantType === 'ice-blue' || unitData?.forceCssVariant === 'ice-blue') {
        currentFilters.push('hue-rotate(120deg) saturate(3) brightness(1.4) contrast(1.1)');
        currentFilters.push('drop-shadow(0 0 5px rgba(0, 238, 255, 1))');
    }



    // 2. Outlines (Selection & Hover)

    if (includeSelectionEffects) {

        if (unit.isHovered) {

            const hoverVar = unit.team === 'player' ? '--hover-player-filter-outline' : '--hover-enemy-filter-outline';

            currentFilters.push(getFilterValue(hoverVar));

        }

        const isSelected = selectedUnit?.id === unit.id;

        const isEnemySelected = unit.element?.classList.contains('selected-enemy');

        if (isSelected || isEnemySelected) {

            const outlineVar = unit.team === 'player' ? '--selected-player-filter-outline' : '--selected-enemy-filter-outline';

            currentFilters.push(getFilterValue(outlineVar));

        }

    }



    // 3. Status Filters

    const isActed = unit.acted && !levelClearedAwaitingInput;

    if (unit.isStealthed) currentFilters.push(getFilterValue('--stealth-filter'));

    else if (unit.isFrozen && unit.frozenTurnsLeft > 0) currentFilters.push(getFilterValue('--frozen-filter'));

    else if (unit.isSlowed) currentFilters.push(getFilterValue('--slowed-filter'));

    else if (isActed && includeSelectionEffects) currentFilters.push(getFilterValue('--acted-filter'));



    // 4. Glow Effects

    if (unit.isElite && !unit.isFrozen && !unit.isStealthed) {

        currentFilters.push(getFilterValue('--elite-filter'));

    }

    if (unit.variantType === 'purple') {

        currentFilters.push('drop-shadow(0 0 5px rgba(190, 60, 255, 0.9))');

    }

    if (unit.variantType === 'gold' || unitData?.forceCssVariant === 'gold') {

        currentFilters.push('drop-shadow(0 0 5px rgba(255, 215, 0, 0.8))');

    } else if (unitData?.forceCssVariant === 'bloodOrange') {

        currentFilters.push('drop-shadow(0 0 8px rgba(255, 69, 0, 0.9))');

    }



    // 5. Brightness & Shadow

    if (includeSelectionEffects && unit.isHovered) currentFilters.push('brightness(1.15)');

    if (!unit.element?.classList.contains('fading-out')) {

        const shadowVar = unit.isHovered && includeSelectionEffects ? '--unit-hover-shadow' : '--unit-base-shadow';

        currentFilters.push(getFilterValue(shadowVar));

    }



    return currentFilters.join(' ');

}



function updateUnitVisualState(unit) {

    if (!unit?.element) return;

    // CRITICAL: If unit is dying, do NOT touch its visuals at all. Let removeUnit handle it.

    if (unit.isRemoving) return;

    const el = unit.element;



    // Ensure dead units clear their filters and selection classes (like red outlines or highlight filters)

    // We do this aggressively to prevent visual bugs where dead units look active or selected.

    if (unit.hp <= 0 || el.classList.contains('dead')) {

        el.style.filter = '';

        el.classList.remove('selected', 'selected-enemy', 'hovered-player', 'hovered-enemy', 'acted', 'slowed', 'elite', 'frozen', 'stealth');

        // If this unit was being viewed in the side panel, clear it

        if (typeof updateUnitInfo === 'function' && unitNameDisplay && unitNameDisplay.textContent === unit.name) {

            updateUnitInfo(null);

        }

        return;

    }



    // Use polymorph sprite for polymorphed units

    if (unit.isPolymorphed) {

        el.style.backgroundImage = "url('./sprites/skills.png')";

        el.style.backgroundPosition = "100% 0"; // Polymorph is at position 100% 0

        el.style.backgroundSize = "500% 300%"; el.style.backgroundRepeat = "no-repeat"; // 5 columns, 2 rows

    } else {

        // Apply player armor variant logic

        let variant = unit.spriteVariant || unit.variantType;

        if (unit.team === 'player' && typeof equippedArmorId !== 'undefined' && equippedArmorId) {

            // Respect unit.armor_type if explicitly set (e.g. rescued prisoners forced to 'grey'), but ignore if it's just the default 'grey' or 'none'

            if (unit.armor_type && unit.armor_type !== 'grey' && unit.armor_type !== 'none') {

                variant = unit.armor_type;

            } else {

                variant = equippedArmorId;

            }

        }

        // DEBUG: Trace unit variant

        // console.log(`Rendering ${unit.type} (${unit.team}): Armor=${typeof equippedArmorId !== 'undefined' ? equippedArmorId : 'undef'}, Variant=${variant}`);



        const idleStyles = getSpritePositionStyles(unit.type, 'idle', variant);

        el.style.backgroundImage = idleStyles.backgroundImage;

        el.style.backgroundPosition = idleStyles.backgroundPosition;

        el.style.backgroundSize = idleStyles.backgroundSize;

    }



    const isSelected = selectedUnit?.id === unit.id;

    const isActed = unit.acted && !levelClearedAwaitingInput;



    el.style.filter = getUnitFilterString(unit, true);

    el.classList.toggle('acted', isActed && !unit.isStealthed);

    el.classList.toggle('selected', isSelected);

    // PRESERVE selected-enemy if already present (enemy inspection doesn't set selectedUnit)

    // We do NOT toggle it off here - only clearHighlights and deselectUnit should remove it

    el.classList.toggle('frozen', unit.isFrozen && unit.frozenTurnsLeft > 0);

    el.classList.toggle('netted', unit.isNetted);

    el.classList.toggle('slowed', unit.isSlowed);

    el.classList.toggle('bleeding', unit.bleedTurnsLeft > 0);



    // Stealth Logic:

    let isInvisible = false;

    if (unit.team === 'enemy' && unit.isStealthed) {

        // Check for detection (4-way adjacency only, diagonals don't count)

        const isDetected = units.some(u => u.team === 'player' && isUnitAliveAndValid(u) && (Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y) === 1));

        if (!isDetected) {

            isInvisible = true;

        }

    }

    unit.isInvisible = isInvisible; // Store for HP bar logic (updateWorldHpBar)



    el.classList.toggle('stealthed', unit.isStealthed && !isInvisible); // Only show 'stealthed' style if visible

    el.classList.toggle('stealth-invisible', isInvisible);

    el.classList.toggle('stealth-fading-in', !isInvisible && unit.isStealthed); // Smooth show if they were just invisible



    el.classList.toggle('in-tower', !!unit.inTower);

    el.classList.toggle('elite', unit.isElite);



    // Toggle Hover Classes

    el.classList.toggle('hovered-player', !!unit.isHovered && unit.team === 'player');

    el.classList.toggle('hovered-enemy', !!unit.isHovered && unit.team === 'enemy');



    setUnitVariantClass(unit);

    el.style.transitionDuration = (unit.isFrozen && unit.frozenTurnsLeft > 0) ? `calc(var(--frost-nova-expand-time) - var(--frost-visual-fade-offset))` : '';



    // Forest Armor visual - show swirling wind on player units when active

    if (unit.team === 'player' && typeof forestArmorActiveTurns !== 'undefined' && forestArmorActiveTurns > 0) {

        if (typeof createForestParticles === 'function') {

            createForestParticles(unit);

        }

    }

}



function updateAllUnitVisuals() {

    units.forEach(unit => {

        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);

    });

}



function updateObstaclePosition(obstacle) { if (!obstacle?.element) return; obstacle.element.style.setProperty('--obs-x', obstacle.x + 1); obstacle.element.style.setProperty('--obs-y', obstacle.y + 1); if (obstacle.type === 'door') obstacle.element.classList.toggle('vertical', obstacle.isVertical); }

function updateItemPosition(item) {

    if (!item?.element) return;

    item.element.style.setProperty('--item-grid-x', item.x);

    item.element.style.setProperty('--item-grid-y', item.y);

    item.element.style.setProperty('--stackIndex', item.stackIndex || 0);



    // Apply random offsets for gold items to create scattered appearance

    if (item.type === 'gold' && item.offsetX !== undefined && item.offsetY !== undefined) {

        // Calculate grid position in pixels, centered in tile

        const baseLeft = item.x * currentCellSize + (currentCellSize / 2);

        const baseTop = item.y * currentCellSize + (currentCellSize / 2);



        // Apply offset as percentage of cell size

        const offsetLeft = item.offsetX * currentCellSize;

        const offsetTop = item.offsetY * currentCellSize;



        // Set absolute position with offset

        item.element.style.left = `${baseLeft + offsetLeft}px`;

        item.element.style.top = `${baseTop + offsetTop}px`;

    }

}

function updateCellObstacleStatus(x, y) {

    if (!isCellInBounds(x, y)) return;

    const cell = getCellElement(x, y);

    if (!cell) return;

    const hasIntactObstacle = obstacles.some(obs => obs.x === x && obs.y === y && isObstacleIntact(obs));

    cell.classList.toggle('has-obstacle', hasIntactObstacle);

    // Clear target highlights if the obstacle is gone

    if (!hasIntactObstacle) {

        cell.classList.remove('valid-attack-target', 'spell-target-highlight', 'can-be-primary-target');

    }

}

/* active updateCellItemStatus is at line ~417 */

function setUnitVariantClass(unit) {

    if (!unit?.element) return;

    const element = unit.element;

    element.classList.remove('goblin-red', 'goblin-blue', 'goblin-yellow', 'goblin-green', 'goblin-purple', 'goblin-orange', 'goblin-gold', 'goblin-bloodOrange');

    // Check for forced CSS variant (e.g., Zul'kash, V'tharak, Zul'far)

    const unitData = UNIT_DATA[unit.type];

    if (unitData?.forceCssVariant) {

        element.classList.add(`goblin-${unitData.forceCssVariant}`);

    } else if (unit.type.startsWith('goblin') || unit.type.startsWith('orc') || unit.type.startsWith('zul')) {

        element.classList.add('goblin-green');

    } else if (unit.team === 'player') {

        // Apply player armor variant based on global equippedArmorId

        if (typeof equippedArmorId !== 'undefined' && equippedArmorId && equippedArmorId !== 'none' && equippedArmorId !== 'grey') {

            element.classList.add(`goblin-${equippedArmorId}`);

        } else if (unit.variantType) {

            // Fallback to unit's own variant if set (e.g. from recruits setup?)

            element.classList.add(`goblin-${unit.variantType}`);

        }

    }



    // Update Gear Overlays

    if (typeof updateUnitGearOverlays === 'function') updateUnitGearOverlays(unit);

}



function updateUnitGearOverlays(unit) {

    if (!unit || !unit.element || unit.team !== 'player') return;



    // Hide gear if dead

    if (unit.hp <= 0 || unit.element.classList.contains('dead')) {

        const existingOverlay = unit.element.querySelector('.unit-gear-overlay');

        if (existingOverlay) existingOverlay.remove();

        return;

    }



    let overlayContainer = unit.element.querySelector('.unit-gear-overlay');

    if (!overlayContainer) {

        overlayContainer = document.createElement('div');

        overlayContainer.className = 'unit-gear-overlay';

        unit.element.appendChild(overlayContainer);

    }



    // Clear existing layers

    overlayContainer.innerHTML = '';



    // Check Config

    const gearConfig = SPRITESHEET_CONFIG.gear;

    if (!gearConfig) { console.warn('Gear config missing'); return; }



    const unitRow = gearConfig.unitRows[unit.type];

    if (typeof unitRow === 'undefined') return;



    // console.log(`Checking gear for ${unit.type} (Row: ${unitRow}). FC: ${equippedFlameCloak}, Helm: ${equippedHelmetId}, Bow: ${playerAbilityUpgrades?.war_bow}`);



    // 1. Flame Cloak

    if (typeof equippedFlameCloak !== 'undefined' && equippedFlameCloak) {

        addGearLayer(overlayContainer, gearConfig, unitRow, 'flame_cloak');

    }



    // 2. Goblin Mother's Skull (Helmet)

    if (typeof equippedHelmetId !== 'undefined' && equippedHelmetId === 'goblin_mother_skull') {

        addGearLayer(overlayContainer, gearConfig, unitRow, 'goblin_mother_skull');

    }



    // 3. War Bow - Restricted to Archer (Row 1)
    if (typeof equippedWarBow !== 'undefined' && equippedWarBow && unit.type === 'archer') {
        addGearLayer(overlayContainer, gearConfig, unitRow, 'war_bow');
    }

    // 4. Glacier Bow - Restricted to Archer (User specified Row 2, Col 2) AND Wizard (Row 4, Col 2)
    if (typeof equippedGlacierBow !== 'undefined' && equippedGlacierBow) {
        if (unit.type === 'archer') {
            addGearLayer(overlayContainer, gearConfig, 2, 'glacier_bow');
        } else if (unit.type === 'wizard') {
            addGearLayer(overlayContainer, gearConfig, 4, 'glacier_bow');
        }
    }

}



function addGearLayer(container, config, unitRow, itemKey) {

    const colDiff = config.itemColumns[itemKey];

    if (typeof colDiff === 'undefined') return;



    const layer = document.createElement('div');

    layer.className = 'gear-layer';

    layer.style.backgroundImage = `url('${config.imageUrl}')`;

    layer.style.backgroundSize = `${config.columns * 100}% ${config.rows * 100}%`;

    const xPercent = config.columns > 1 ? (colDiff / (config.columns - 1)) * 100 : 0;

    const yPercent = config.rows > 1 ? (unitRow / (config.rows - 1)) * 100 : 0;

    layer.style.backgroundPosition = `${xPercent}% ${yPercent}%`;

    container.appendChild(layer);

}



function showPopup(x, y, text, className) { if (!gridContent || !isCellInBounds(x, y)) return; const p = document.createElement('div'); p.className = `popup ${className}`; p.innerHTML = text; const popupX = (x + 0.5) * currentCellSize; const popupY = (y + 0.5) * currentCellSize - (currentCellSize * 0.5); p.style.left = `${popupX}px`; p.style.top = `${popupY}px`; gridContent.appendChild(p); setTimeout(() => p.remove(), POPUP_DURATION_MS); }

function showDamagePopup(x, y, damage, className = 'damage-popup') { showPopup(x, y, `-${damage}`, className); }

function showFreezePopup(x, y) { /* Removed as per user request */ }

function showHealPopup(x, y, amount) {

    showPopup(x, y, `+${amount}`, 'heal-popup');

    if (typeof createHealingParticles === 'function') createHealingParticles(x, y);

}



function createHealingParticles(x, y) {

    if (!gridContent || !isCellInBounds(x, y)) return;

    const count = 8;

    for (let i = 0; i < count; i++) {

        const p = document.createElement('div');

        const isCross = Math.random() > 0.5;

        p.className = `particle-heal ${isCross ? 'cross' : ''}`;



        const offsetX = (Math.random() - 0.5) * currentCellSize * 0.6;

        const offsetY = (Math.random() - 0.5) * currentCellSize * 0.6;

        const left = (x + 0.5) * currentCellSize + offsetX;

        const top = (y + 0.5) * currentCellSize + offsetY;



        p.style.left = `${left}px`;

        p.style.top = `${top}px`;



        const driftX = (Math.random() - 0.5) * 30;

        const rotation = (Math.random() - 0.5) * 360;

        p.style.setProperty('--drift-x', `${driftX}px`);

        p.style.setProperty('--rotation', `${rotation}deg`);



        const delay = Math.random() * 0.4;

        const duration = 0.6 + Math.random() * 0.6;

        p.style.animation = `heal-particle-rise ${duration}s ease-out ${delay}s forwards`;



        gridContent.appendChild(p);

        setTimeout(() => p.remove(), (delay + duration) * 1000 + 100);

    }

}



function createGoldenGlowParticles(x, y, itemId) {

    if (!gridContent || !isCellInBounds(x, y)) return;



    // Clean up existing particles for this item if any

    if (itemId) {

        gridContent.querySelectorAll(`.particles-for-${itemId}`).forEach(p => p.remove());

    }



    const count = 6;

    for (let i = 0; i < count; i++) {

        const p = document.createElement('div');

        p.className = 'golden-particle';

        if (itemId) p.classList.add(`particles-for-${itemId}`);



        const left = (x + 0.5) * currentCellSize;

        const top = (y + 0.5) * currentCellSize;

        const offsetX = (Math.random() - 0.5) * currentCellSize * 0.8;

        const offsetY = (Math.random() - 0.5) * currentCellSize * 0.8;



        p.style.left = `${left + offsetX}px`;

        p.style.top = `${top + offsetY}px`;



        const delay = Math.random() * 2;

        const duration = 1.5 + Math.random() * 2;

        p.style.animation = `golden-particle-rise ${duration}s ease-out ${delay}s infinite`;



        gridContent.appendChild(p);

    }

}



function createCyanGlowParticles(x, y, itemId) {

    if (!gridContent || !isCellInBounds(x, y)) return;



    if (itemId) {

        gridContent.querySelectorAll(`.particles-for-${itemId}`).forEach(p => p.remove());

    }



    const count = 8; // A bit more mystical

    for (let i = 0; i < count; i++) {

        const p = document.createElement('div');

        p.className = 'cyan-particle';

        if (itemId) p.classList.add(`particles-for-${itemId}`);



        const left = (x + 0.5) * currentCellSize;

        const top = (y + 0.5) * currentCellSize;

        const offsetX = (Math.random() - 0.5) * currentCellSize * 0.9;

        const offsetY = (Math.random() - 0.5) * currentCellSize * 0.9;



        p.style.left = `${left + offsetX}px`;

        p.style.top = `${top + offsetY}px`;



        const delay = Math.random() * 2.5; // Slower spawn

        const duration = 2.0 + Math.random() * 2;

        p.style.animation = `cyan-particle-rise ${duration}s ease-out ${delay}s infinite`;



        gridContent.appendChild(p);

    }

}



function createTotemHealPulse(x, y, range) {

    if (!gridContent || !isCellInBounds(x, y)) return;

    const pulse = document.createElement('div');

    pulse.className = 'totem-heal-pulse';



    const pulseRadius = (range + 0.5) * 2;

    pulse.style.setProperty('--pulse-radius', pulseRadius);



    gridContent.appendChild(pulse);

    setTimeout(() => pulse.remove(), 1000);

}






function createForestParticles(unit) {

    if (!gridContent || !unit?.element || unit.hp <= 0) return;



    // Wind particles (Grey Swirl) - Swirling wind effect

    for (let i = 0; i < 3; i++) {

        const p = document.createElement('div');

        p.className = 'particle-wind';

        const left = (unit.x + 0.5) * currentCellSize;

        const top = (unit.y + 0.5) * currentCellSize;

        p.style.left = `${left}px`;

        p.style.top = `${top}px`;

        const radius = 12 + Math.random() * 14;

        p.style.setProperty('--radius', `${radius}px`);

        const delay = Math.random() * 0.8;

        const duration = 1.0 + Math.random() * 0.6;

        p.style.animation = `forest-wind-swirl ${duration}s ease-in-out ${delay}s forwards`;

        gridContent.appendChild(p);

        setTimeout(() => p.remove(), (delay + duration) * 1000 + 100);

    }



    // Leaf particles (Green Flutter) - Reduced count by half

    for (let i = 0; i < 1; i++) {

        const p = document.createElement('div');

        p.className = 'particle-leaf';

        const offsetX = (Math.random() - 0.5) * currentCellSize * 0.8;

        const offsetY = (Math.random() - 0.5) * currentCellSize * 0.2;

        const left = (unit.x + 0.5) * currentCellSize + offsetX;

        const top = (unit.y + 0.5) * currentCellSize + offsetY;

        p.style.left = `${left}px`;

        p.style.top = `${top}px`;



        const driftX = (Math.random() - 0.5) * 40;

        p.style.setProperty('--drift-x', `${driftX}px`);



        const delay = Math.random() * 1.5;

        const duration = 1.5 + Math.random() * 1.0;

        p.style.animation = `forest-particle-flutter ${duration}s ease-in-out ${delay}s forwards`;

        gridContent.appendChild(p);

        setTimeout(() => p.remove(), (delay + duration) * 1000 + 100);

    }

}



function createFrostParticles(x, y, count = 12) {

    if (!gridContent || !isCellInBounds(x, y)) return;



    for (let i = 0; i < count; i++) {

        const p = document.createElement('div');

        p.className = 'particle-frost';



        const left = (x + 0.5) * currentCellSize;

        const top = (y + 0.5) * currentCellSize;



        p.style.left = `${left}px`;

        p.style.top = `${top}px`;



        const driftX = (Math.random() - 0.5) * 100;

        const driftY = (Math.random() - 0.5) * 100;

        const rotation = (Math.random() - 0.5) * 1080;

        p.style.setProperty('--drift-x', `${driftX}px`);

        p.style.setProperty('--drift-y', `${driftY}px`);

        p.style.setProperty('--rotation', `${rotation}deg`);



        const duration = 0.5 + Math.random() * 0.5;

        p.style.animation = `frost-particle-rush ${duration}s ease-out forwards`;



        gridContent.appendChild(p);

        setTimeout(() => p.remove(), duration * 1000 + 100);

    }

}



function showGoldPopup(x, y, amount) { showPopup(x, y, `+${amount}G`, 'gold-popup'); }

function showGemPopup(x, y, amount) { showPopup(x, y, `+${amount} Gem`, 'gem-popup'); }

function flashElementOnHit(element) { if (element && !element.classList.contains('unit-hit-flash')) { element.classList.add('unit-hit-flash'); setTimeout(() => element?.classList.remove('unit-hit-flash'), 200); } }



function showFeedback(message, type = '', duration = 2500) { if (!boardFeedbackArea) return; boardFeedbackArea.innerHTML = message; boardFeedbackArea.className = `board-feedback-area ${type}`; const typeDurations = { 'feedback-gold': 1500, 'feedback-cheat': 1500, 'feedback-levelup': 2000, 'feedback-spell-unlock': 3000, 'feedback-achievement-unlock': 3500, 'feedback-turn': 1200, 'feedback-error': 2000 }; duration = typeDurations[type] || duration; boardFeedbackArea.style.opacity = '1'; boardFeedbackArea.style.display = 'flex'; if (boardFeedbackArea.timeoutId) clearTimeout(boardFeedbackArea.timeoutId); boardFeedbackArea.timeoutId = setTimeout(() => { boardFeedbackArea.style.opacity = '0'; setTimeout(() => { if (boardFeedbackArea.style.opacity === '0') { boardFeedbackArea.innerHTML = ''; boardFeedbackArea.style.display = 'none'; boardFeedbackArea.className = 'board-feedback-area'; } }, 500); }, duration - 500); }

function updateLevelDisplay() { if (levelDisplayElement) levelDisplayElement.textContent = `Level: ${currentLevel}`; }

function updateGoldDisplay() {

    if (menuGoldAmountElement) menuGoldAmountElement.textContent = playerGold;

    if (sideGoldAmountElement) sideGoldAmountElement.textContent = playerGold;

    if (shopGoldAmountElement) shopGoldAmountElement.textContent = playerGold;

    if (levelCompleteTotalGoldElement) levelCompleteTotalGoldElement.textContent = playerGold;

}



function updateSpellUI() {

    if (!spellAreaElement) return; const spellData = [{ el: fireballElement, name: 'fireball', unlock: FIREBALL_UNLOCK_LEVEL }, { el: flameWaveElement, name: 'flameWave', unlock: FLAME_WAVE_UNLOCK_LEVEL }, { el: frostNovaElement, name: 'frostNova', unlock: FROST_NOVA_UNLOCK_LEVEL }, { el: healElement, name: 'heal', unlock: HEAL_UNLOCK_LEVEL }]; const hotkeys = ['1', '2', '3', '4'];

    spellData.forEach((s, index) => {

        if (!s.el) return; const spellName = s.name; const isPermanentlyUnlocked = spellsUnlocked[spellName] === true; const canUseThisTurn = (spellUses[spellName] === true || unlimitedSpellsCheat); const isSelected = currentSpell === spellName; const hotkey = hotkeys[index]; s.el.className = `spell-icon icon-spell-${spellName}`; const labelSibling = s.el.nextElementSibling; const baseTitle = labelSibling?.classList.contains('spell-label') ? labelSibling.textContent : spellName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); let title = baseTitle;

        if (!isPermanentlyUnlocked) { s.el.classList.add('locked'); title = `${baseTitle} (Unlock at Lvl ${s.unlock})`; } else if (!canUseThisTurn) { s.el.classList.add('used'); title = `${baseTitle} (Used)`; } else { s.el.classList.add('available'); if (isSelected) { s.el.classList.add('selected'); title = `CASTING: ${baseTitle} (Esc to Cancel)`; } else { title = baseTitle; } if (unlimitedSpellsCheat) { s.el.classList.add('cheat-available'); title += ` (Cheat Active)`; } } s.el.title = title; const label = s.el.nextElementSibling; if (label?.classList.contains('spell-label')) { if (!isPermanentlyUnlocked) label.style.color = 'var(--color-disabled-text)'; else if (!canUseThisTurn) label.style.color = 'var(--color-text-muted)'; else if (unlimitedSpellsCheat && canUseThisTurn) label.style.color = 'var(--color-green-bright)'; else label.style.color = ''; }

    });

    if (gameBoard) { gameBoard.className = 'game-board'; if (isPanning) gameBoard.classList.add('panning'); if (currentSpell) gameBoard.classList.add(`${currentSpell}-targeting`); }



    if (typeof updateForestArmorButton === 'function') updateForestArmorButton();



    // Hide spell panel if no spells are unlocked and Forest Armor is hidden

    const anySpellUnlocked = Object.values(spellsUnlocked).some(val => val === true);

    const forestArmorVisible = forestArmorContainer && !forestArmorContainer.classList.contains('hidden') && forestArmorContainer.style.display !== 'none';



    if (spellAreaElement) {

        if (!anySpellUnlocked && !forestArmorVisible) {

            spellAreaElement.classList.add('hidden');

            spellAreaElement.style.display = 'none';

        } else {

            spellAreaElement.classList.remove('hidden');

            spellAreaElement.style.display = '';

        }

    }

}



function getSpellEffectDescription(spellName, getNextLevelValue = false) {

    try {

        switch (spellName) {

            case 'fireball':

                let fbDmg = getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE, getNextLevelValue);

                if (typeof equippedFlameRing !== 'undefined' && equippedFlameRing) {

                    const splashDmg = Math.max(1, Math.floor(fbDmg / 2));

                    return `Deal ${fbDmg} damage to target. ${splashDmg} to adjacent enemies.`;

                }

                return `Deal ${fbDmg} damage to target.`;

            case 'flameWave':

                let fwRows = 1;

                if (typeof equippedFlameCloak !== 'undefined' && equippedFlameCloak) {

                    fwRows += 1;

                }

                return `Deal ${getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE, getNextLevelValue)} damage to ${fwRows} row${fwRows > 1 ? 's' : ''}.`;

            case 'frostNova':

                const radiusLevel = getFrostNovaRadiusLevel(getNextLevelValue);

                const areaDim = radiusLevel * 2 + 1;

                // At max level (5 upgrades = radiusLevel 6), freeze duration increases to 4 turns

                const upgradeLevel = getNextLevelValue ? (playerSpellUpgrades['frostNova'] || 0) + 1 : (playerSpellUpgrades['frostNova'] || 0);

                const freezeDuration = upgradeLevel >= 5 ? 4 : FROST_NOVA_BASE_DURATION;

                return `Freeze ${areaDim}x${areaDim} area. (${freezeDuration} turns)`;

            case 'heal': return `Heal ${getSpellEffectValue(spellName, HEAL_BASE_AMOUNT, getNextLevelValue)} HP.`;

            default: return '';

        }

    } catch (e) { console.error("Spell description error:", e); return "Effect Error"; }

}



function updateTurnDisplay() {
    if (!endTurnButton) return;
    const isPlayer = currentTurn === 'player';
    let actionsText = '', buttonText = `<span class="hotkey-text">E</span>nd Turn`, buttonTitle = "End Player Turn [E]";
    let isButtonDisabled = false, hasDisabledClass = false, isNextLevelMode = false;

    if ((typeof isLevelCleared === 'function' ? isLevelCleared() : levelClearedAwaitingInput)) {
        actionsText = 'Level Cleared!';
        buttonText = `Proc<span class="hotkey-text">e</span>ed`;
        buttonTitle = "Proceed [E]";
        isNextLevelMode = true;
        isButtonDisabled = false;
        hasDisabledClass = false;
    } else if (isPlayer) {
        const remainingActions = units.reduce((count, unit) => count + (unit.team === 'player' && !unit.acted && !unit.isFrozen && !unit.isNetted && isUnitAliveAndValid(unit) ? (unit.canQuickStrike && unit.actionsTakenThisTurn < 1 ? 2 : 1) - unit.actionsTakenThisTurn : 0), 0);
        actionsText = `Actions Left: ${remainingActions}`;
        isButtonDisabled = isProcessing;
        hasDisabledClass = isProcessing;
    } else {
        actionsText = `Enemy Turn...`;
        buttonTitle = "Enemy Turn";
        isButtonDisabled = true;
        hasDisabledClass = true;
    }

    if (actionsLeftDisplayElement) actionsLeftDisplayElement.textContent = actionsText;
    endTurnButton.innerHTML = buttonText;
    endTurnButton.title = buttonTitle;
    endTurnButton.disabled = isButtonDisabled;
    endTurnButton.classList.toggle('disabled', hasDisabledClass);
    endTurnButton.classList.toggle('next-level-mode', isNextLevelMode);

    // Sync Par UI
    updateParUI();
}

/**
 * Updates the Par Hourglass HUD element
 */
function updateParUI() {
    const parContainer = document.getElementById('par-timer-container');
    const parTurnsLeftEl = document.getElementById('par-turns-left');
    const parBonusGoldEl = document.getElementById('par-bonus-gold');
    if (!parContainer || !parTurnsLeftEl || !parBonusGoldEl) return;

    // Calculate core values
    const turnsLeft = Math.max(0, window.parTurns - window.turnsCountThisLevel + 1);
    const bonusGold = turnsLeft * 5;


    if (!isGameActive() || isAnyOverlayVisible() || isMainMenuOpen()) {
        parContainer.classList.add('hidden');
        return;
    }


    parContainer.classList.remove('hidden');
    parTurnsLeftEl.textContent = turnsLeft;
    parBonusGoldEl.textContent = `${bonusGold}g`;

    // Visual indicators for urgency
    parContainer.classList.toggle('urgency-low', turnsLeft <= 2 && turnsLeft > 0);
    parContainer.classList.toggle('urgency-none', turnsLeft === 0);
}



function updateUnitInfo(unit) {

    const infoHpTextElement = unitInfo?.querySelector('.unit-hp-text'); const infoHpBarElement = unitInfo?.querySelector('.unit-hp-bar');

    if (!unitInfo || !infoHpTextElement || !infoHpBarElement || !unitNameDisplay || !unitAtkDisplay || !unitMovDisplay || !unitRngDisplay || !unitStatusDisplay || !unitPortraitElement || !abilityStealthButton || !abilityQuickStrikeButton) return;

    // Always clear cooldown overlays first - they'll be recreated if needed

    document.getElementById('unit-abilities')?.querySelectorAll('.cooldown-overlay').forEach(o => o.remove());

    const show = unit && isUnitAliveAndValid(unit);



    if (show) {

        unitNameDisplay.textContent = unit.name; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0; infoHpTextElement.textContent = `${unit.hp}/${unit.maxHp}`; infoHpBarElement.style.setProperty('--hp-percent', `${hpPercent}%`); const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); infoHpBarElement.dataset.hpLevel = hpLevel;



        if (unit.atk !== undefined) {
            const finalAtk = (unit.atk || 0) + (unit.temporaryAttackBonus || 0) - (unit.temporaryAttackDebuff || 0);
            unitAtkDisplay.textContent = `ATK: ${finalAtk}`;
            unitAtkDisplay.style.display = 'block';

            // Apply stat coloring
            unitAtkDisplay.classList.remove('stat-boosted', 'stat-debuffed');
            const baseAtk = unit.baseCalculatedAtk !== undefined ? unit.baseCalculatedAtk : (UNIT_DATA[unit.type]?.baseAtk || 0);
            if (finalAtk > baseAtk) {
                unitAtkDisplay.classList.add('stat-boosted');
            } else if (finalAtk < baseAtk) {
                unitAtkDisplay.classList.add('stat-debuffed');
            }
        } else {
            unitAtkDisplay.style.display = 'none';
        }



        let movDisplay = '';

        if (unit.baseMov !== undefined) {

            movDisplay = `MOV: ${unit.baseMov}`;

            if (unit.quickStrikeActive) movDisplay = `MOV: ${Math.max(0, unit.baseMov - ROGUE_QUICK_STRIKE_MOVE_PENALTY)}`;

            else if (unit.isStealthed) movDisplay = `MOV: ${Math.max(0, unit.baseMov - ROGUE_STEALTH_MOVE_PENALTY)}`;

            else if (unit.isSlowed || (unit.slowedTurnsLeft && unit.slowedTurnsLeft > 0)) movDisplay = `MOV: ${unit.mov}`;

            unitMovDisplay.textContent = movDisplay; unitMovDisplay.style.display = 'block';

            // Apply stat coloring for MOV
            unitMovDisplay.classList.remove('stat-boosted', 'stat-debuffed');
            if (unit.isSlowed || (unit.slowedTurnsLeft && unit.slowedTurnsLeft > 0)) {
                unitMovDisplay.classList.add('stat-debuffed');
            }

        } else { unitMovDisplay.style.display = 'none'; }



        if (unit.currentRange !== undefined && unit.currentRange > 1) { unitRngDisplay.textContent = `RNG: ${unit.currentRange}`; unitRngDisplay.style.display = 'block'; } else { unitRngDisplay.style.display = 'none'; }



        let statusText = '';

        if (unit.description) statusText += unit.description;

        if (unit.isStealthed) statusText += (statusText ? ' | ' : '') + '👻 Stealth';

        if (unit.isFrozen) statusText += (statusText ? ' | ' : '') + `❄️ Frozen (${unit.frozenTurnsLeft}t)`;

        if (unit.isNetted) statusText += (statusText ? ' | ' : '') + `🕸️ Netted (${unit.nettedTurnsLeft}t)`;

        if (unit.isSlowed) statusText += (statusText ? ' | ' : '') + `🐌 Slowed (${unit.slowedTurnsLeft}t)`;

        if (unit.inTower) statusText += (statusText ? ' | ' : '') + `🏰 In Tower`;

        if (unit.quickStrikeActive) statusText += (statusText ? ' | ' : '') + '⚡ Quick Strike';

        if (unit.bleedTurnsLeft > 0) statusText += (statusText ? ' | ' : '') + `🩸 Bleeding (${unit.bleedTurnsLeft}t)`;

        unitStatusDisplay.innerHTML = statusText; unitStatusDisplay.style.display = statusText ? 'block' : 'none';



        // Use polymorph icon for polymorphed units

        if (unit.isPolymorphed) {

            unitPortraitElement.style.backgroundImage = "url('./sprites/skills.png')";

            unitPortraitElement.style.backgroundPosition = "100% 0"; // Polymorph is at position 100% 0

            unitPortraitElement.style.backgroundSize = "500% 300%"; el.style.backgroundRepeat = "no-repeat"; // 5 columns, 2 rows

        } else {

            const portraitStyles = getSpritePositionStyles(unit.type, 'portrait', unit.spriteVariant || unit.variantType);

            unitPortraitElement.style.backgroundImage = portraitStyles.backgroundImage;

            unitPortraitElement.style.backgroundPosition = portraitStyles.backgroundPosition;

            unitPortraitElement.style.backgroundSize = portraitStyles.backgroundSize;

        }

        unitPortraitElement.style.opacity = '1';

        unitPortraitElement.className = '';

        unitPortraitElement.style.filter = getUnitFilterString(unit, false); // Selection effects = false for portrait



        // Rogue Abilities - only show for Rogues

        if (unit.type === 'rogue') {

            const canUseStealth = unit.team === 'player' && unit.canStealth && !unit.acted && !unit.isFrozen && !unit.isNetted;

            abilityStealthButton.classList.remove('hidden');

            // Explicitly set class without 'icon-ability-stealth' or 'icon' to remove legacy sprites

            abilityStealthButton.className = 'spell-icon skill-icon';

            abilityStealthButton.style.backgroundImage = 'none';

            abilityStealthButton.style.backgroundColor = 'var(--color-iron-medium)';

            abilityStealthButton.style.borderRadius = '3px';

            abilityStealthButton.style.minWidth = '0';

            abilityStealthButton.innerHTML = '<span class="hotkey-display">S</span><div class="skill-icon-sprite"></div>';



            // Set unit idle sprite for the stealth button

            const spriteDiv = abilityStealthButton.querySelector('.skill-icon-sprite');

            if (spriteDiv) {

                const spriteStyles = getSpritePositionStyles(unit.type, 'idle', unit.spriteVariant || unit.variantType);

                spriteDiv.style.backgroundImage = spriteStyles.backgroundImage;

                spriteDiv.style.backgroundPosition = spriteStyles.backgroundPosition;

                spriteDiv.style.backgroundSize = spriteStyles.backgroundSize;

                spriteDiv.style.opacity = unit.isStealthed ? '1' : '0.4';



                // If enemy rogue (debug etc), apply goblin coloring

                if (unit.team === 'enemy' && unit.variantType && unit.variantType !== 'green') {

                    spriteDiv.classList.add(`goblin-${unit.variantType}`);

                }

            }



            abilityStealthButton.dataset.baseTitle = 'Become invisible to enemies. -2 MOV while stealthed.';

            abilityStealthButton.classList.toggle('locked', !canUseStealth);

            abilityStealthButton.disabled = false;



            // Update Stealth button state

            if (unit.isStealthed) {

                abilityStealthButton.classList.add('active-state');

                abilityStealthButton.title = "Unstealth (S)";

            } else {

                abilityStealthButton.classList.remove('active-state');

                abilityStealthButton.title = "Stealth (S)";

            }



            // Allow Quick Strike activation OR cancellation (when already active)

            const canUseQS = unit.team === 'player' && unit.canQuickStrike && !unit.acted && !unit.isFrozen && !unit.isNetted &&

                (unit.quickStrikeActive || !unit.quickStrikeUsedThisLevel);

            abilityQuickStrikeButton.classList.remove('hidden');

            abilityQuickStrikeButton.className = 'spell-icon skill-icon icon-skill-quickStrike';

            abilityQuickStrikeButton.innerHTML = '<span class="hotkey-display">Q</span>';

            abilityQuickStrikeButton.dataset.baseTitle = 'Gain an extra attack this turn at the cost of -2 MOV.';

            abilityQuickStrikeButton.classList.toggle('locked', !canUseQS);

            abilityQuickStrikeButton.disabled = false;



            abilityQuickStrikeButton.title = unit.quickStrikeActive ? "Cancel Quick Strike (Q)" : "Quick Strike (Q)";

            if (unit.quickStrikeActive) abilityQuickStrikeButton.classList.add('selected');

        } else {

            // Hide Rogue abilities if not a Rogue

            abilityStealthButton.classList.add('hidden');

            abilityQuickStrikeButton.classList.add('hidden');

        }



        if (unit.type === 'wizard') {

            abilityStealthButton.classList.add('hidden');

            abilityQuickStrikeButton.classList.add('hidden');



            let chainLightningBtn = document.getElementById('ability-chain-lightning');

            let polymorphBtn = document.getElementById('ability-polymorph');



            if (!chainLightningBtn) {

                chainLightningBtn = document.createElement('button');

                chainLightningBtn.id = 'ability-chain-lightning';

                chainLightningBtn.className = 'spell-icon skill-icon icon-skill-arcaneJolt ability-icon';

                chainLightningBtn.innerHTML = '<span class="hotkey-display">C</span>';

                chainLightningBtn.title = 'Chain Lightning';

                chainLightningBtn.dataset.abilityName = 'chainLightning';

                chainLightningBtn.dataset.baseTitle = 'Deal ATK damage to target and half (rounded up) to all connecting enemies.';

                chainLightningBtn.onclick = () => {

                    const btn = document.getElementById('ability-chain-lightning');

                    if (btn && btn.classList.contains('locked')) { playSfx('error'); return; }

                    if (currentSpell === 'chainLightning') setActiveSpell(null);

                    else setActiveSpell('chainLightning');

                };

                document.getElementById('unit-abilities')?.appendChild(chainLightningBtn);

            }

            if (chainLightningBtn) chainLightningBtn.dataset.abilityName = 'chainLightning';



            if (!polymorphBtn) {

                polymorphBtn = document.createElement('button');

                polymorphBtn.id = 'ability-polymorph';

                polymorphBtn.className = 'spell-icon skill-icon icon-spell-polymorph ability-icon';

                polymorphBtn.innerHTML = '<span class="hotkey-display">R</span>';

                polymorphBtn.title = 'Polymorph';

                polymorphBtn.dataset.abilityName = 'polymorph';

                polymorphBtn.dataset.baseTitle = 'Transform enemy into a harmless sheep for 3 turns. Breaks on damage.';

                polymorphBtn.onclick = () => {

                    const btn = document.getElementById('ability-polymorph');

                    if (btn && btn.classList.contains('locked')) { playSfx('error'); return; }

                    if (currentSpell === 'polymorph') setActiveSpell(null);

                    else setActiveSpell('polymorph');

                };

                document.getElementById('unit-abilities')?.appendChild(polymorphBtn);

            }

            if (polymorphBtn) polymorphBtn.dataset.abilityName = 'polymorph';



            const canCastChainLightning = !unit.acted && !unit.isFrozen && !unit.isNetted && (unit.chainLightningCooldown === 0 || unit.chainLightningCooldown === undefined);

            const canCastPolymorph = unit.canCastPolymorph && !unit.acted && !unit.isFrozen && !unit.isNetted && (unit.polymorphCooldown === 0 || unit.polymorphCooldown === undefined);



            chainLightningBtn.className = 'spell-icon skill-icon icon-skill-arcaneJolt';

            chainLightningBtn.disabled = false;

            const unitAbilities = document.getElementById('unit-abilities');

            unitAbilities?.querySelectorAll('.cooldown-overlay').forEach(o => o.remove());



            if (!canCastChainLightning || unit.chainLightningCooldown > 0) {

                chainLightningBtn.classList.add('locked');

            }

            if (unit.chainLightningCooldown > 0) {

                const cdOverlay = document.createElement('span');

                const cdClass = unit.chainLightningCooldown >= 3 ? 'cd-3' : `cd-${unit.chainLightningCooldown}`;

                cdOverlay.className = `cooldown-overlay ${cdClass}`;

                cdOverlay.textContent = unit.chainLightningCooldown;

                unitAbilities?.appendChild(cdOverlay);

                requestAnimationFrame(() => {

                    cdOverlay.style.left = chainLightningBtn.offsetLeft + 'px';

                    cdOverlay.style.top = chainLightningBtn.offsetTop + 'px';

                    cdOverlay.style.width = chainLightningBtn.offsetWidth + 'px';

                    cdOverlay.style.height = chainLightningBtn.offsetHeight + 'px';

                });

            }

            if (!chainLightningBtn.querySelector('.hotkey-display')) {

                const hotkeySpan = document.createElement('span');

                hotkeySpan.className = 'hotkey-display';

                hotkeySpan.textContent = 'C';

                chainLightningBtn.appendChild(hotkeySpan);

            }

            if (currentSpell === 'chainLightning') chainLightningBtn.classList.add('selected');



            if (unit.canCastPolymorph) {

                polymorphBtn.classList.remove('hidden');

                polymorphBtn.className = 'spell-icon skill-icon icon-spell-polymorph';

                polymorphBtn.disabled = false;



                if (!canCastPolymorph || unit.polymorphCooldown > 0) {

                    polymorphBtn.classList.add('locked');

                }

                if (unit.polymorphCooldown > 0) {

                    const cdOverlay = document.createElement('span');

                    const cdClass = unit.polymorphCooldown >= 3 ? 'cd-3' : `cd-${unit.polymorphCooldown}`;

                    cdOverlay.className = `cooldown-overlay ${cdClass}`;

                    cdOverlay.textContent = unit.polymorphCooldown;

                    unitAbilities?.appendChild(cdOverlay);

                    requestAnimationFrame(() => {

                        cdOverlay.style.left = polymorphBtn.offsetLeft + 'px';

                        cdOverlay.style.top = polymorphBtn.offsetTop + 'px';

                        cdOverlay.style.width = polymorphBtn.offsetWidth + 'px';

                        cdOverlay.style.height = polymorphBtn.offsetHeight + 'px';

                    });

                }

                if (!polymorphBtn.querySelector('.hotkey-display')) {

                    const hotkeySpan = document.createElement('span');

                    hotkeySpan.className = 'hotkey-display';

                    hotkeySpan.textContent = 'R';

                    polymorphBtn.appendChild(hotkeySpan);

                }

                if (currentSpell === 'polymorph') polymorphBtn.classList.add('selected');

            } else {

                polymorphBtn.classList.add('hidden');

            }

        } else {

            if (document.getElementById('ability-chain-lightning')) document.getElementById('ability-chain-lightning').classList.add('hidden');

            if (document.getElementById('ability-polymorph')) document.getElementById('ability-polymorph').classList.add('hidden');

        }



        unitInfo.parentElement.style.display = ''; unitInfo.style.display = 'grid';

    } else {

        unitInfo.style.display = 'none'; unitPortraitElement.style.opacity = '0'; unitPortraitElement.className = ''; unitNameDisplay.textContent = ''; infoHpTextElement.textContent = ''; infoHpBarElement.style.setProperty('--hp-percent', '0%'); infoHpBarElement.dataset.hpLevel = 'empty'; unitAtkDisplay.textContent = ''; unitMovDisplay.textContent = ''; unitRngDisplay.textContent = ''; unitStatusDisplay.textContent = ''; unitRngDisplay.style.display = ''; unitStatusDisplay.style.display = '';

        abilityStealthButton.classList.add('hidden'); abilityQuickStrikeButton.classList.add('hidden');

        // Hide Wizard abilities when no unit selected

        if (document.getElementById('ability-chain-lightning')) document.getElementById('ability-chain-lightning').classList.add('hidden');

        if (document.getElementById('ability-polymorph')) document.getElementById('ability-polymorph').classList.add('hidden');

        unitPortraitElement.style.backgroundImage = '';

        unitPortraitElement.style.backgroundPosition = '';

        unitPortraitElement.style.backgroundSize = '';

    }

}



async function handleUnitDeathAnimation(unit, deathX, deathY, timeoutMap) {

    return new Promise((resolve) => {

        if (!unit?.element || !gridContent) {

            resolve();

            return;

        }

        const el = unit.element;



        // Immediately clear ALL selection-related classes and styling - CRUCIALLY includes stealth-invisible which has opacity: 0 !important

        el.classList.remove('selected', 'selected-enemy', 'acted', 'frozen', 'netted', 'slowed', 'stealthed', 'stealth', 'stealth-invisible', 'stealth-fading-in', 'bleeding', 'elite', 'in-tower');

        el.classList.add('dead');

        el.style.pointerEvents = 'none';



        // Aggressively clear portrait if this unit was being viewed

        if (typeof updateUnitInfo === 'function' && unitNameDisplay && unitNameDisplay.textContent === unit.name) {

            updateUnitInfo(null);

        }



        // Remove HP bar immediately

        if (typeof removeWorldHpBar === 'function') removeWorldHpBar(unit.id);



        // Fix: Use original unit type for death sprite if polymorphed

        const typeForDeathSprite = unit.isPolymorphed && unit.originalType ? unit.originalType : unit.type;

        const variantForDeathSprite = unit.isPolymorphed && unit.originalSpriteVariant ? unit.originalSpriteVariant : (unit.spriteVariant || unit.variantType);



        const deadStyles = getSpritePositionStyles(typeForDeathSprite, 'dead', variantForDeathSprite);

        el.style.backgroundImage = deadStyles.backgroundImage;

        el.style.backgroundPosition = deadStyles.backgroundPosition;

        el.style.backgroundSize = deadStyles.backgroundSize;



        // Clear ALL filters first, then apply purple if needed

        el.style.filter = '';

        // Apply purple filter for V'tharak

        if (unit.variantType === 'purple') {

            el.style.filter = 'sepia(1) saturate(3) hue-rotate(260deg) brightness(0.9) drop-shadow(0 0 5px rgba(190, 60, 255, 0.9)) drop-shadow(rgba(0, 0, 0, 0.5) 1px 2px 2px)';

        }

        el.style.setProperty('z-index', '1', 'important');

        el.style.opacity = '1';

        el.style.transition = 'none';

        el.style.setProperty('--unit-x', deathX + 1);

        el.style.setProperty('--unit-y', deathY + 1);

        el.style.transform = 'translate(-50%, -50%)';



        const existingFadeTimeout = timeoutMap.get(unit.id + '-fade');

        const existingRemoveTimeout = timeoutMap.get(unit.id + '-remove');

        if (existingFadeTimeout) clearTimeout(existingFadeTimeout);

        if (existingRemoveTimeout) clearTimeout(existingRemoveTimeout);

        timeoutMap.delete(unit.id + '-fade');

        timeoutMap.delete(unit.id + '-remove');



        const fadeTimeoutId = setTimeout(() => {

            if (!el) return;

            // Use inline style for consistent fade regardless of CSS

            el.style.transition = 'opacity 1.5s ease-out';

            el.style.opacity = '0';



            const removeTimeoutId = setTimeout(() => {

                el.remove();

                timeoutMap.delete(unit.id + '-remove');

                resolve();

            }, 1500);

            timeoutMap.set(unit.id + '-remove', removeTimeoutId);

            timeoutMap.delete(unit.id + '-fade');

        }, 1000); // Wait 1s before starting fade

        timeoutMap.set(unit.id + '-fade', fadeTimeoutId);

    });

}



function showCustomAlert(message, title = "Alert", callback = null) {

    if (!customAlertOverlay) return;

    if (customAlertTitle) customAlertTitle.textContent = title;

    if (customAlertMessage) customAlertMessage.textContent = message;



    customAlertOverlay.classList.remove('hidden');

    customAlertOverlay.classList.add('visible');
    updateParUI();



    customAlertConfirmButton.onclick = () => {

        playSfx('menuClose');

        customAlertOverlay.classList.remove('visible');

        customAlertOverlay.classList.add('hidden');
        updateParUI();

        if (callback) callback();

    };

}



function updateUnitInfoDisplay(unit) {

    // Only update the side panel if this unit is the currently selected unit

    // Hover info should use tooltips, not the side panel

    if (selectedUnit?.id === unit?.id) {

        updateUnitInfo(unit);

    }

    // Keep tooltip updated for hover

    if (tooltipElement?.classList.contains('visible') && lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === unit?.id) {

        showTooltip(unit, 'unit');

    }

}

function updateUnitInfoOnDeath(deadUnitId) { let panelWasHidden = false; if (selectedUnit?.id === deadUnitId) { if (typeof deselectUnit === 'function') deselectUnit(false); else if (typeof updateUnitInfo === 'function') updateUnitInfo(null); panelWasHidden = true; } if (!panelWasHidden && !selectedUnit && lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === deadUnitId) { if (typeof updateUnitInfo === 'function') updateUnitInfo(null); panelWasHidden = true; } if (tooltipElement?.classList.contains('visible') && lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === deadUnitId) { hideTooltip(); lastHoveredElement = null; } }



function updateUiForNewLevel() {
    updateLevelDisplay();
    updateGoldDisplay();
    updateUnitInfo(null);
    persistentEnemyRangeUnitIds.clear();

    // Aggressive Play: Standardized Reset (Handled by resetLevelState in gameLogic.js)
    if (typeof updateParUI === 'function') updateParUI();

    if (boardFeedbackArea) {
        if (boardFeedbackArea.timeoutId) clearTimeout(boardFeedbackArea.timeoutId);
        boardFeedbackArea.innerHTML = '';
        boardFeedbackArea.className = 'board-feedback-area';
        boardFeedbackArea.style.opacity = '1';
        boardFeedbackArea.style.display = 'none';
    }

    if (endTurnButton) {
        endTurnButton.innerHTML = `<span class="hotkey-text">E</span>End Turn`;
        endTurnButton.title = "End Player Turn (E)";
        endTurnButton.classList.remove('next-level-mode', 'disabled');
        endTurnButton.disabled = false;
    }

    if (gameBoard) gameBoard.className = 'game-board';

    updateSpellUI();
    clearSpellHighlights();
    clearHighlights();
    hideAllOverlays();
    updateShopDisplay();
    updateChooseTroopsScreen();
    updateFullscreenButton();
    updateMuteButtonVisual();
    startTooltipUpdater();

    gameBoardWrapper?.classList.add('active');
    if (defaultViewButton) defaultViewButton.classList.add('hidden');

    setTimeout(() => {
        calculateCellSize();
        applyLayout();
        centerView(true);
    }, 50);

    updateParUI();
}

function updateQuitButton() {

    if (!quitButton) return;

    const quitToMainMenuButton = document.getElementById('quit-to-main-menu-button');

    const canForfeit = playerActionsTakenThisLevel >= FORFEIT_MOVE_THRESHOLD;

    if (canForfeit) {
        quitButton.innerHTML = `Forfeit L<span class="hotkey-highlight">e</span>vel`;
        quitButton.title = "Forfeit Level (Incurs Penalty) (E)";
        quitButton.dataset.action = "forfeit";
        if (quitToMainMenuButton) quitToMainMenuButton.classList.add('hidden');

        // Hide Restart buttons when Forfeit is available
        const restartSettingBtn = document.getElementById('restart-level-setting-button');
        if (restartSettingBtn) restartSettingBtn.style.display = 'none';
        if (restartButton) restartButton.style.display = 'none';

    } else {
        quitButton.innerHTML = `Quit To L<span class="hotkey-highlight">e</span>vel Select`;
        quitButton.title = "Quit to Level Select (No Penalty) (E)";
        quitButton.dataset.action = "quit";
        if (quitToMainMenuButton) quitToMainMenuButton.classList.remove('hidden');

        // Restore Restart buttons visibility
        const restartSettingBtn = document.getElementById('restart-level-setting-button');
        if (restartSettingBtn) restartSettingBtn.style.display = '';
        if (restartButton) restartButton.style.display = '';
    }

}

function getCellElement(x, y) { return cellElementsMap.get(`${x},${y}`); }

function clearHighlights(keepPersistence = false) {

    document.querySelectorAll('.valid-move, .valid-move-slow, .valid-attack-target, .valid-cleave-target, .can-be-primary-target, .totem-heal-range, .enemy-attack-range, .totem-range-grid, .totem-border-top, .totem-border-bottom, .totem-border-left, .totem-border-right, .enemy-border-top, .enemy-border-bottom, .enemy-border-left, .enemy-border-right, .spell-target-highlight').forEach(c => {

        c.classList.remove('valid-move', 'valid-move-slow', 'valid-attack-target', 'valid-cleave-target', 'can-be-primary-target', 'totem-heal-range', 'enemy-attack-range', 'totem-range-grid', 'totem-border-top', 'totem-border-bottom', 'totem-border-left', 'totem-border-right', 'enemy-border-top', 'enemy-border-bottom', 'enemy-border-left', 'enemy-border-right', 'spell-target-highlight');

    });

    highlightedAttackCells = [];



    if (keepPersistence && persistentEnemyRangeUnitIds.size > 0) {

        persistentEnemyRangeUnitIds.forEach(id => {

            const unit = units.find(u => u.id === id);

            if (unit && isUnitAliveAndValid(unit)) {

                drawEnemyRange(unit);

            } else {

                persistentEnemyRangeUnitIds.delete(id);

            }

        });

    } else if (!keepPersistence) {

        persistentEnemyRangeUnitIds.clear();

    }

}



function showAttackHoverHighlights(attacker, primaryTargetPos) { if (!attacker || !primaryTargetPos || !isUnitAliveAndValid(attacker)) return; clearAttackHoverHighlights(); const primaryCell = getCellElement(primaryTargetPos.x, primaryTargetPos.y); if (primaryCell) primaryCell.classList.add('valid-attack-target'); if (attacker.type !== 'champion' || attacker.cleaveDamage <= 0) return; const attackDirX = Math.sign(primaryTargetPos.x - attacker.x); const attackDirY = Math.sign(primaryTargetPos.y - attacker.y); if (attackDirX === 0 && attackDirY === 0) return; const coords = []; const px = primaryTargetPos.x, py = primaryTargetPos.y; if (attackDirX !== 0) coords.push({ x: px, y: py - 1 }, { x: px, y: py + 1 }, { x: px + attackDirX, y: py }); else if (attackDirY !== 0) coords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py + attackDirY }); else coords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py - 1 }, { x: px, y: py + 1 }); coords.forEach(({ x, y }) => { if (!isCellInBounds(x, y)) return; const secondaryUnit = getUnitAt(x, y); const primaryTargetObject = getUnitAt(px, py) || getObstacleAt(px, py); if (secondaryUnit && isUnitAliveAndValid(secondaryUnit) && secondaryUnit.team !== attacker.team) { if (!primaryTargetObject || secondaryUnit.id !== primaryTargetObject.id) getCellElement(x, y)?.classList.add('valid-cleave-target'); } const secondaryObstacle = getObstacleAt(x, y); if (secondaryObstacle && secondaryObstacle.canBeAttacked) { if (!primaryTargetObject || secondaryObstacle.id !== primaryTargetObject.id) getCellElement(x, y)?.classList.add('valid-cleave-target'); } }); }

function clearAttackHoverHighlights() { gridContent?.querySelectorAll('.valid-attack-target, .valid-cleave-target').forEach(c => c.classList.remove('valid-attack-target', 'valid-cleave-target')); }

function highlightMovesAndAttacks(unit) {

    clearHighlights(false); if (!unit || !isUnitAliveAndValid(unit)) return;



    let canAct = !levelClearedAwaitingInput && !unit.acted;

    if (levelClearedAwaitingInput) canAct = true; // Allow highlighting if level is cleared

    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;

    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAct = true;



    // NUCLEAR OPTION: Never allow "moves and attacks" highlight (blue/red cross) for enemies.

    // They use highlightEnemyRange (red border) or nothing.

    if (unit.team === 'enemy' && unit.type !== 'shaman_totem') return;



    if (unit.type !== 'shaman_totem' && (!canAct || unit.isFrozen)) return;



    if (unit.isTotem && unit.type === 'shaman_totem') {

        const range = SHAMAN_TOTEM_RANGE;

        for (let r = 0; r < currentGridRows; r++) {

            for (let c = 0; c < currentGridCols; c++) {

                const dist = Math.abs(unit.x - c) + Math.abs(unit.y - r);

                if (dist <= range) {

                    // Check neighbors to determine borders

                    const cell = getCellElement(c, r);

                    if (!cell) continue;



                    cell.classList.add('totem-range-grid');



                    // Top

                    if (r === 0 || (Math.abs(unit.x - c) + Math.abs(unit.y - (r - 1))) > range) {

                        cell.classList.add('totem-border-top');

                    }

                    // Bottom

                    if (r === currentGridRows - 1 || (Math.abs(unit.x - c) + Math.abs(unit.y - (r + 1))) > range) {

                        cell.classList.add('totem-border-bottom');

                    }

                    // Left

                    if (c === 0 || (Math.abs(unit.x - (c - 1)) + Math.abs(unit.y - r)) > range) {

                        cell.classList.add('totem-border-left');

                    }

                    // Right

                    if (c === currentGridCols - 1 || (Math.abs(unit.x - (c + 1)) + Math.abs(unit.y - r)) > range) {

                        cell.classList.add('totem-border-right');

                    }

                }

            }

        }

    }



    if (unit.team === 'player' && (!unit.isNetted)) {

        const moves = getValidMoves(unit);

        moves.forEach(p => {

            const cell = getCellElement(p.x, p.y);

            if (cell) {

                if (typeof getMoveCost === 'function' && getMoveCost(p.x, p.y) > 1) {

                    cell.classList.add('valid-move-slow');

                } else {

                    cell.classList.add('valid-move');

                }

            }

        });



        // Highlight enterable towers only if unit can actually enter this turn

        // Tower entry is ONLY from the cell directly below the tower (tower.x, tower.y + 1)

        obstacles.forEach(obs => {

            if (obs.enterable && !obs.occupantUnitId && isObstacleIntact(obs)) {

                const entryX = obs.x;

                const entryY = obs.y + 1;



                // Entry cell must be in bounds

                if (!isCellInBounds(entryX, entryY)) return;



                // Check if unit is already at the entry point (can enter immediately)

                const isAtEntry = unit.x === entryX && unit.y === entryY;

                // Check if any valid move position IS the entry point

                const canReachEntry = moves.some(m => m.x === entryX && m.y === entryY);



                if (isAtEntry || canReachEntry) {

                    const towerCell = getCellElement(obs.x, obs.y);

                    if (towerCell) towerCell.classList.add('valid-move');

                    // Add valid-move to the obstacle element itself so it shows the highlight/cursor

                    if (obs.element) obs.element.classList.add('valid-move');

                }

            }

        });

    }



    const attacks = getValidAttackTargets(unit);

    highlightedAttackCells = [];

    const isChampion = (unit.type === 'champion');

    attacks.units.forEach(targetId => {

        const target = units.find(u => u.id === targetId);

        if (target && isUnitAliveAndValid(target)) {

            const cell = getCellElement(target.x, target.y);

            if (cell) {

                cell.classList.add(isChampion ? 'can-be-primary-target' : 'valid-attack-target');

                highlightedAttackCells.push(cell);

            }

            if (target.inTower) {

                const tower = obstacles.find(o => o.id === target.inTower);

                if (tower?.element) {

                    tower.element.classList.add(isChampion ? 'can-be-primary-target' : 'valid-attack-target');

                    highlightedAttackCells.push(tower.element);

                }

            }

        }

    });

    attacks.obstacles.forEach(targetId => {

        const target = obstacles.find(o => o.id === targetId);

        if (target && isObstacleIntact(target) && target.canBeAttacked) {

            const cell = getCellElement(target.x, target.y);

            if (cell) {

                // ONLY add attack highlight to the cell, not the obstacle element itself

                // This fixes the double border issue on snowmen and other obstacles

                cell.classList.add(isChampion ? 'can-be-primary-target' : 'valid-attack-target');

                highlightedAttackCells.push(cell);

            }

        }

    });

}



function highlightEnemyRange(unit) {

    if (!unit) return;

    const wasSelected = persistentEnemyRangeUnitIds.has(unit.id);

    persistentEnemyRangeUnitIds.clear(); // Always clear others to prevent stacking

    if (!wasSelected) {

        persistentEnemyRangeUnitIds.add(unit.id);

    }

    clearHighlights(true);

}



function drawEnemyRange(unit) {

    if (!unit || !isUnitAliveAndValid(unit)) return;



    const range = unit.currentRange || unit.range;

    if (!range) return;



    for (let r = 0; r < currentGridRows; r++) {

        for (let c = 0; c < currentGridCols; c++) {

            const dist = Math.abs(unit.x - c) + Math.abs(unit.y - r);

            if (dist <= range && dist >= 1) {

                const cell = getCellElement(c, r);

                if (!cell) continue;



                cell.classList.add('enemy-attack-range');



                // Top

                if (r === 0 || (Math.abs(unit.x - c) + Math.abs(unit.y - (r - 1))) > range) {

                    cell.classList.add('enemy-border-top');

                }

                // Bottom

                if (r === currentGridRows - 1 || (Math.abs(unit.x - c) + Math.abs(unit.y - (r + 1))) > range) {

                    cell.classList.add('enemy-border-bottom');

                }

                // Left

                if (c === 0 || (Math.abs(unit.x - (c - 1)) + Math.abs(unit.y - r)) > range) {

                    cell.classList.add('enemy-border-left');

                }

                // Right

                if (c === currentGridCols - 1 || (Math.abs(unit.x - (c + 1)) + Math.abs(unit.y - r)) > range) {

                    cell.classList.add('enemy-border-right');

                }

            }

        }

    }

}



// Highlight spell range for Wizard spells (Chain Lightning, Polymorph)

// Shows both: range outline border AND prominent squares on targetable enemies

function highlightWizardSpellRange(unit) {

    if (!unit || !isUnitAliveAndValid(unit) || unit.type !== 'wizard') return;



    const spellRange = (unit.currentRange || unit.range) + 3;



    // 1. Draw the overall range outline (subtle)

    for (let r = 0; r < currentGridRows; r++) {

        for (let c = 0; c < currentGridCols; c++) {

            const dist = Math.abs(unit.x - c) + Math.abs(unit.y - r);

            if (dist <= spellRange && dist >= 1) {

                const cell = getCellElement(c, r);

                if (!cell) continue;



                // Top border

                if (r === 0 || (Math.abs(unit.x - c) + Math.abs(unit.y - (r - 1))) > spellRange) {

                    cell.classList.add('enemy-border-top');

                }

                // Bottom border

                if (r === currentGridRows - 1 || (Math.abs(unit.x - c) + Math.abs(unit.y - (r + 1))) > spellRange) {

                    cell.classList.add('enemy-border-bottom');

                }

                // Left border

                if (c === 0 || (Math.abs(unit.x - (c - 1)) + Math.abs(unit.y - r)) > spellRange) {

                    cell.classList.add('enemy-border-left');

                }

                // Right border

                if (c === currentGridCols - 1 || (Math.abs(unit.x - (c + 1)) + Math.abs(unit.y - r)) > spellRange) {

                    cell.classList.add('enemy-border-right');

                }

            }

        }

    }



    // 2. Highlight targetable enemies with more prominent squares (excluding invisible)

    units.filter(u => u.team === 'enemy' && isUnitAliveAndValid(u) && !u.isInvisible).forEach(enemy => {

        const dist = Math.abs(unit.x - enemy.x) + Math.abs(unit.y - enemy.y);

        if (dist <= spellRange && dist >= 1) {

            const cell = getCellElement(enemy.x, enemy.y);

            if (cell) {

                cell.classList.add('spell-target-highlight');

            }

        }

    });

}

/* active highlightFrostNovaArea is at line ~2046 */

/* active clearFrostNovaPreview is at line ~2062 */

function highlightFlameWaveArea(targetRow) {

    clearFlameWaveHighlight();

    if (!isCellInBounds(0, targetRow)) return;



    // Highlight main target row

    for (let x = 0; x < currentGridCols; x++) {

        const cell = getCellElement(x, targetRow);

        if (cell) cell.classList.add('flame-wave-preview-row');

        // Highlight obstacle if present

        const obs = getObstacleAt(x, targetRow);

        if (obs && obs.element) obs.element.classList.add('flame-wave-preview-row');

    }



    // Flame Cloak bonus: Also highlight the bonus row (toward enemy side, which is row - 1)

    if (equippedFlameCloak) {

        const bonusRow = targetRow - 1;

        if (isCellInBounds(0, bonusRow)) {

            for (let x = 0; x < currentGridCols; x++) {

                const cell = getCellElement(x, bonusRow);

                if (cell) cell.classList.add('flame-wave-preview-row');

                const obs = getObstacleAt(x, bonusRow);

                if (obs && obs.element) obs.element.classList.add('flame-wave-preview-row');

            }

        }

    }

}

function clearFlameWaveHighlight() { gridContent?.querySelectorAll('.flame-wave-preview-row').forEach(c => c.classList.remove('flame-wave-preview-row')); }



// Show visual warnings for all pending Flame Wave attacks from Pyromancers

function showPendingFlameWaveWarnings() {

    clearPendingFlameWaveWarnings();



    if (!pendingFlameWaves || pendingFlameWaves.length === 0) return;



    pendingFlameWaves.forEach(wave => {

        const targetRow = wave.row;

        if (!isCellInBounds(0, targetRow)) return;



        for (let x = 0; x < currentGridCols; x++) {

            const cell = getCellElement(x, targetRow);

            if (cell) {

                cell.classList.add('flame-wave-warning');

            }

        }

    });

}



// Clear all Flame Wave warning highlights

function clearPendingFlameWaveWarnings() {

    gridContent?.querySelectorAll('.flame-wave-warning').forEach(cell => {

        cell.classList.remove('flame-wave-warning');

    });

}



function selectUnit(unit) {

    if (!unit || !isUnitAliveAndValid(unit)) return;



    // Allow selection during enemy turn for inspection, but actions are blocked elsewhere

    // if (unit.team !== 'player' || currentTurn !== 'player') return; // REMOVED RESTRICTION



    let canAct = !levelClearedAwaitingInput && !unit.acted;

    if (levelClearedAwaitingInput) canAct = true; // Allow selection if level is cleared

    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;

    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAct = true;



    // We still want to show info even if unit can't act or is frozen, so we don't return early here anymore

    // But we might want to give feedback if they try to DO something with it later.

    // For selection purely, we should allow it.



    if (currentSpell) setActiveSpell(null);

    if (selectedUnit === unit) return;



    // Clear any enemy inspection selection before selecting a new unit

    document.querySelectorAll('.selected-enemy').forEach(el => {

        el.classList.remove('selected-enemy');

        const u = units.find(uu => uu.element === el);

        if (u) updateUnitVisualState(u);

    });



    const previousUnit = selectedUnit;

    selectedUnit = unit;



    if (previousUnit && previousUnit.element) updateUnitVisualState(previousUnit);

    if (unit.element) updateUnitVisualState(unit);



    if (unit.team === 'enemy') {

        // Only show range for ranged enemies to avoid confusing melee cross pattern

        const currentRange = unit.currentRange || unit.range;

        if (currentRange > 1) {

            highlightEnemyRange(unit);

        } else {

            // Clear any previous highlights just in case

            clearHighlights(true);

        }

    } else {

        highlightMovesAndAttacks(unit);

    }

    updateUnitInfo(unit);

    playSfx('select');



    if (isMobileDevice()) {

        if (tooltipTimeout) clearTimeout(tooltipTimeout);

        showTooltip(unit, 'unit');

        tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS);

    }

    // Logic for preventing selection is removed to allow inspection.





}



function deselectUnit(playSound = true, keepPersistence = false) {

    if (selectedUnit) {

        const unitToDeselect = selectedUnit;

        selectedUnit = null;

        if (unitToDeselect.element) updateUnitVisualState(unitToDeselect);

        // Clear selection visual on the unit's cell

        const cell = getCellElement(unitToDeselect.x, unitToDeselect.y);

        if (cell) cell.classList.remove('selected');

    }

    // ALWAYS clear selected-enemy class when deselecting (this is the ONLY place it should be removed)

    document.querySelectorAll('.selected-enemy').forEach(el => {

        el.classList.remove('selected-enemy');

        const unit = units.find(u => u.element === el);

        if (unit) updateUnitVisualState(unit);

    });

    // Always clear highlights and info, even if no unit was selected (e.g. clearing enemy selection)

    clearHighlights(keepPersistence);

    if (playSound) playSfx('select');

    clearAttackHoverHighlights();

    updateUnitInfo(null);

}

function trackMousePosition(event) {

    currentMouseX = event.clientX;

    currentMouseY = event.clientY;

    // Safety check: if no mouse buttons are pressed, we are not panning

    if (event.buttons === 0 && isPanning) {

        isPanning = false;

        if (gameBoard) gameBoard.classList.remove('panning');

    }

}



function calculateMinZoomToFit() {

    if (!gameBoard || !gridContent) return 0.1;

    const boardWidth = gameBoard.clientWidth; const boardHeight = gameBoard.clientHeight;

    const currentGridCellSize = currentCellSize || 30;

    if (boardWidth <= 0 || boardHeight <= 0 || currentGridCellSize <= 0 || currentGridCols <= 0 || currentGridRows <= 0) return 0.1;

    const gridWidth = currentGridCols * currentGridCellSize; const gridHeight = currentGridRows * currentGridCellSize;

    if (gridWidth <= 0 || gridHeight <= 0) return 0.1;

    const zoomToFitWidth = boardWidth / gridWidth; const zoomToFitHeight = boardHeight / gridHeight;

    const targetZoomFit = Math.min(zoomToFitWidth, zoomToFitHeight);

    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoomFit));

}



function applyZoomAndPan() {

    if (!gridContent) return;

    clampPan();

    const transformValue = `translate(${gridContentOffsetX}px, ${gridContentOffsetY}px) scale(${currentZoom})`;

    gridContent.style.transform = transformValue;

    updateDefaultViewButtonVisibility();

}



function handleZoom(event) {

    event.preventDefault();

    if (!gameBoard || isAnyOverlayVisible()) return;



    // Trackpad pinch gesture (ctrl+wheel) = zoom; two-finger swipe (wheel without ctrl) = pan

    if (event.ctrlKey) {

        // Pinch-to-zoom

        const zoomSpeed = 0.05; // Slower for trackpad precision

        const delta = event.deltaY > 0 ? -1 : 1;

        const oldZoom = currentZoom;

        const dynamicMinZoom = calculateMinZoomToFit();

        currentZoom = Math.max(dynamicMinZoom, Math.min(MAX_ZOOM, currentZoom + delta * zoomSpeed));

        if (currentZoom === oldZoom) return;

        const rect = gameBoard.getBoundingClientRect();

        const mouseX = event.clientX - rect.left; const mouseY = event.clientY - rect.top;

        if (oldZoom <= 0) { centerView(true); return; }

        gridContentOffsetX = mouseX - (mouseX - gridContentOffsetX) * (currentZoom / oldZoom);

        gridContentOffsetY = mouseY - (mouseY - gridContentOffsetY) * (currentZoom / oldZoom);

        applyZoomAndPan();

    } else {

        // Two-finger swipe to pan

        const panSpeed = 1.5;

        gridContentOffsetX -= event.deltaX * panSpeed;

        gridContentOffsetY -= event.deltaY * panSpeed;

        applyZoomAndPan();

    }

}

function handlePinchStart(event) {

    if (event.touches.length === 2 && !isAnyOverlayVisible()) {

        event.preventDefault(); isPanning = true;

        const t1 = event.touches[0]; const t2 = event.touches[1];

        pinchStartDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

        const rect = gameBoard.getBoundingClientRect();

        touchCenter.x = ((t1.clientX + t2.clientX) / 2) - rect.left;

        touchCenter.y = ((t1.clientY + t2.clientY) / 2) - rect.top;

        gridStartPanX = gridContentOffsetX; gridStartPanY = gridContentOffsetY;

    }

}



function handlePinchMove(event) {

    if (event.touches.length === 2 && isPanning) {

        event.preventDefault();

        const t1 = event.touches[0]; const t2 = event.touches[1];

        const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

        if (pinchStartDistance <= 0) return;

        const zoomFactor = currentDistance / pinchStartDistance;

        const oldZoom = currentZoom; const dynamicMinZoom = calculateMinZoomToFit();

        currentZoom = Math.max(dynamicMinZoom, Math.min(MAX_ZOOM, oldZoom * zoomFactor));

        if (currentZoom !== oldZoom) {

            gridContentOffsetX = touchCenter.x - (touchCenter.x - gridStartPanX) * (currentZoom / oldZoom);

            gridContentOffsetY = touchCenter.y - (touchCenter.y - gridStartPanY) * (currentZoom / oldZoom);

            applyZoomAndPan();

        }

        pinchStartDistance = currentDistance; gridStartPanX = gridContentOffsetX; gridStartPanY = gridContentOffsetY;

        const rect = gameBoard.getBoundingClientRect();

        touchCenter.x = ((t1.clientX + t2.clientX) / 2) - rect.left; touchCenter.y = ((t1.clientY + t2.clientY) / 2) - rect.top;

    }

}



function handlePinchEnd(event) { if (event.touches.length < 2) { isPanning = false; pinchStartDistance = 0; } }



function handlePanStart(event) {

    if (event.button !== 0 || event.target.closest('.unit,.item,.obstacle,.ui-button,button,a,.spell-icon,#default-view-button') || isAnyOverlayVisible()) { isPanning = false; return; }

    event.preventDefault(); isPanning = true;

    panStartX = event.clientX; panStartY = event.clientY;

    gridStartPanX = gridContentOffsetX; gridStartPanY = gridContentOffsetY;

    gameBoard.classList.add('panning');

    document.addEventListener('mousemove', handlePanMove, { passive: false, capture: true });

    document.addEventListener('mouseup', handlePanEnd, { once: true, capture: true });

}



function handlePanMove(event) { if (!isPanning || !gameBoard) return; event.preventDefault(); gridContentOffsetX = gridStartPanX + (event.clientX - panStartX); gridContentOffsetY = gridStartPanY + (event.clientY - panStartY); hideTooltip(); applyZoomAndPan(); }

function handlePanEnd(event) {

    if (!isPanning) return;

    event.preventDefault();

    isPanning = false;

    gameBoard.classList.remove('panning');

    document.removeEventListener('mousemove', handlePanMove, { capture: true });

    document.removeEventListener('mouseup', handlePanEnd, { capture: true });

    // Don't deselect unit when panning - user should keep their selection

}

function handlePanStartTouch(event) { if (event.touches.length !== 1 || event.target.closest('.unit,.item,.obstacle,.ui-button,button,a,.spell-icon,#default-view-button') || isAnyOverlayVisible()) { isPanning = false; return; } const touch = event.touches[0]; isPanning = true; panStartX = touch.clientX; panStartY = touch.clientY; gridStartPanX = gridContentOffsetX; gridStartPanY = gridContentOffsetY; document.addEventListener('touchmove', handlePanMoveTouch, { passive: false, capture: true }); document.addEventListener('touchend', handlePanEndTouch, { once: true, capture: true }); document.addEventListener('touchcancel', handlePanEndTouch, { once: true, capture: true }); }

function handlePanMoveTouch(event) { if (!isPanning || event.touches.length !== 1) { handlePanEndTouch(event); return; } event.preventDefault(); gameBoard.classList.add('panning'); const touch = event.touches[0]; gridContentOffsetX = gridStartPanX + (touch.clientX - panStartX); gridContentOffsetY = gridStartPanY + (touch.clientY - panStartY); hideTooltip(); applyZoomAndPan(); }

function handlePanEndTouch(event) { if (!isPanning) return; isPanning = false; gameBoard.classList.remove('panning'); document.removeEventListener('touchmove', handlePanMoveTouch, { capture: true }); document.removeEventListener('touchend', handlePanEndTouch, { capture: true }); document.removeEventListener('touchcancel', handlePanEndTouch, { capture: true }); }



function clampPan() {

    if (!gameBoard || !gridContent || currentZoom <= 0) return;

    const boardRect = gameBoard.getBoundingClientRect();

    const gridWidth = gridContent.offsetWidth; const gridHeight = gridContent.offsetHeight;

    const gridRenderedWidth = gridWidth * currentZoom; const gridRenderedHeight = gridHeight * currentZoom;

    let minOffsetX, maxOffsetX, minOffsetY, maxOffsetY; const padding = 5;



    // Tolerance to prevent wiggling when "fit to screen"

    const tolerance = 2;



    if (gridRenderedWidth <= boardRect.width + tolerance) {

        minOffsetX = maxOffsetX = (boardRect.width - gridRenderedWidth) / 2;

    } else {

        minOffsetX = boardRect.width - gridRenderedWidth - padding;

        maxOffsetX = padding;

    }



    if (gridRenderedHeight <= boardRect.height + tolerance) {

        minOffsetY = maxOffsetY = (boardRect.height - gridRenderedHeight) / 2;

    } else {

        minOffsetY = boardRect.height - gridRenderedHeight - padding;

        maxOffsetY = padding;

    }



    gridContentOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, gridContentOffsetX));

    gridContentOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, gridContentOffsetY));

}



function isDefaultView() {

    if (!gameBoard || !gridContent) return false;

    const boardWidth = gameBoard.clientWidth; const boardHeight = gameBoard.clientHeight;

    if (boardWidth <= 0 || boardHeight <= 0 || currentCellSize <= 0 || currentGridCols <= 0 || currentGridRows <= 0) return false;

    const defaultZoom = calculateMinZoomToFit(); const gridWidth = currentGridCols * currentCellSize; const gridHeight = currentGridRows * currentCellSize; if (gridWidth <= 0 || gridHeight <= 0) return false;

    const defaultOffsetX = (boardWidth - gridWidth * defaultZoom) / 2; const defaultOffsetY = (boardHeight - gridHeight * defaultZoom) / 2;

    const zoomThreshold = 0.01; const offsetThreshold = 2;

    const isZoomDefault = Math.abs(currentZoom - defaultZoom) < zoomThreshold; const isOffsetXDefault = Math.abs(gridContentOffsetX - defaultOffsetX) < offsetThreshold; const isOffsetYDefault = Math.abs(gridContentOffsetY - defaultOffsetY) < offsetThreshold;

    return isZoomDefault && isOffsetXDefault && isOffsetYDefault;

}



function updateDefaultViewButtonVisibility() {

    const hideHomeButton = isDefaultView();

    if (defaultViewButton) defaultViewButton.classList.toggle('hidden', hideHomeButton);

    // Fill-width button: show when not at fill-width zoom (check if current zoom matches fill-width zoom)

    if (fillWidthButton && gameBoard && gridContent) {

        const boardWidth = gameBoard.clientWidth;

        const gridWidth = currentGridCols * currentCellSize;

        const fillWidthZoom = gridWidth > 0 ? Math.min(MAX_ZOOM, boardWidth / gridWidth) : 1;

        const isAtFillWidth = Math.abs(currentZoom - fillWidthZoom) < 0.01;

        fillWidthButton.classList.toggle('hidden', isAtFillWidth);

    }

}

function centerView(immediate = false) {

    if (!gameBoard || !gridContent) return; calculateCellSize();

    const boardWidth = gameBoard.clientWidth; const boardHeight = gameBoard.clientHeight; if (boardWidth <= 0 || boardHeight <= 0 || currentCellSize <= 0) return;

    const gridWidth = currentGridCols * currentCellSize; const gridHeight = currentGridRows * currentCellSize; if (gridWidth <= 0 || gridHeight <= 0) return;

    const targetZoom = calculateMinZoomToFit(); const targetOffsetX = (boardWidth - (gridWidth * targetZoom)) / 2; const targetOffsetY = (boardHeight - (gridHeight * targetZoom)) / 2;

    currentZoom = targetZoom;

    if (immediate) { const originalTransition = gridContent.style.transition; gridContent.style.transition = 'none'; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = 'none'; gridContentOffsetX = targetOffsetX; gridContentOffsetY = targetOffsetY; applyZoomAndPan(); requestAnimationFrame(() => { if (gridContent) gridContent.style.transition = originalTransition; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = originalTransition; }); }

    else { const transitionStyle = 'transform 0.3s ease-out'; gridContent.style.transition = transitionStyle; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = transitionStyle; gridContentOffsetX = targetOffsetX; gridContentOffsetY = targetOffsetY; applyZoomAndPan(); setTimeout(() => { if (gridContent) gridContent.style.transition = ''; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = ''; }, 300); }

}



function fillWidthView(immediate = false) {

    if (!gameBoard || !gridContent) return; calculateCellSize();

    const boardWidth = gameBoard.clientWidth; const boardHeight = gameBoard.clientHeight; if (boardWidth <= 0 || boardHeight <= 0 || currentCellSize <= 0) return;

    const gridWidth = currentGridCols * currentCellSize; const gridHeight = currentGridRows * currentCellSize; if (gridWidth <= 0 || gridHeight <= 0) return;

    // Calculate zoom to fit width

    const targetZoom = Math.min(MAX_ZOOM, boardWidth / gridWidth);

    const scaledGridHeight = gridHeight * targetZoom;

    // Center horizontally, position at top if taller than viewport

    const targetOffsetX = (boardWidth - (gridWidth * targetZoom)) / 2;

    const targetOffsetY = scaledGridHeight > boardHeight ? 0 : (boardHeight - scaledGridHeight) / 2;

    currentZoom = targetZoom;

    if (immediate) { const originalTransition = gridContent.style.transition; gridContent.style.transition = 'none'; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = 'none'; gridContentOffsetX = targetOffsetX; gridContentOffsetY = targetOffsetY; applyZoomAndPan(); requestAnimationFrame(() => { if (gridContent) gridContent.style.transition = originalTransition; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = originalTransition; }); }

    else { const transitionStyle = 'transform 0.3s ease-out'; gridContent.style.transition = transitionStyle; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = transitionStyle; gridContentOffsetX = targetOffsetX; gridContentOffsetY = targetOffsetY; applyZoomAndPan(); setTimeout(() => { if (gridContent) gridContent.style.transition = ''; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = ''; }, 300); }

    updateDefaultViewButtonVisibility();

}



function applyMapZoomAndPan(immediate = false) {

    if (!levelSelectMap || !levelSelectMapContainer || !levelSelectDotsLayer) return;

    const containerRect = levelSelectMapContainer.getBoundingClientRect(); if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const baseScale = calculateMapScale(containerRect.width, containerRect.height, mapIntrinsicWidth, mapIntrinsicHeight);

    const currentMapZoom = (typeof mapZoom === 'number' && !isNaN(mapZoom) && mapZoom >= MIN_MAP_ZOOM) ? Math.min(MAX_MAP_ZOOM, mapZoom) : MIN_MAP_ZOOM;

    const finalScale = baseScale * currentMapZoom;

    let currentMapOffsetX = typeof mapOffsetX === 'number' && !isNaN(mapOffsetX) ? mapOffsetX : 0; let currentMapOffsetY = typeof mapOffsetY === 'number' && !isNaN(mapOffsetY) ? mapOffsetY : 0;

    const clampedOffsets = clampMapOffsets(currentMapOffsetX, currentMapOffsetY); currentMapOffsetX = clampedOffsets.x; currentMapOffsetY = clampedOffsets.y; mapOffsetX = currentMapOffsetX; mapOffsetY = currentMapOffsetY;

    const transformValue = `translate(${currentMapOffsetX}px, ${currentMapOffsetY}px) scale(${finalScale})`; const transitionStyle = immediate ? 'none' : 'transform 0.3s ease-out';

    levelSelectMap.style.transformOrigin = 'top left'; levelSelectDotsLayer.style.transformOrigin = 'top left'; levelSelectMap.style.transition = transitionStyle; levelSelectDotsLayer.style.transition = transitionStyle; levelSelectMap.style.transform = transformValue; levelSelectDotsLayer.style.transform = transformValue;

    positionLevelDots();

    if (!immediate) { const clearTransition = (event) => { if ((event.target === levelSelectMap || event.target === levelSelectDotsLayer) && event.propertyName === 'transform') { if (levelSelectMap) levelSelectMap.style.transition = ''; if (levelSelectDotsLayer) levelSelectDotsLayer.style.transition = ''; event.target.removeEventListener('transitionend', clearTransition); } }; levelSelectMap.addEventListener('transitionend', clearTransition); levelSelectDotsLayer.addEventListener('transitionend', clearTransition); setTimeout(() => { if (levelSelectMap && levelSelectMap.style.transition !== 'none') levelSelectMap.style.transition = ''; if (levelSelectDotsLayer && levelSelectDotsLayer.style.transition !== 'none') levelSelectDotsLayer.style.transition = ''; levelSelectMap?.removeEventListener('transitionend', clearTransition); levelSelectDotsLayer?.removeEventListener('transitionend', clearTransition); }, 350); }

}



function calculateMapScale(containerWidth, containerHeight, intrinsicWidth, intrinsicHeight) { const safeMapWidth = Math.max(1, intrinsicWidth || 1024); const safeMapHeight = Math.max(1, intrinsicHeight || 1024); const scaleX = containerWidth / safeMapWidth; const scaleY = containerHeight / safeMapHeight; return Math.max(scaleX, scaleY); }

function clampMapOffsets(rawOffsetX, rawOffsetY) { if (!levelSelectMapContainer || !levelSelectMap) return { x: 0, y: 0 }; const containerRect = levelSelectMapContainer.getBoundingClientRect(); if (containerRect.width <= 0 || containerRect.height <= 0) return { x: mapOffsetX || 0, y: mapOffsetY || 0 }; const safeMapWidth = Math.max(1, mapIntrinsicWidth || 1024); const safeMapHeight = Math.max(1, mapIntrinsicHeight || 1024); const baseScale = calculateMapScale(containerRect.width, containerRect.height, safeMapWidth, safeMapHeight); const currentMapZoom = (typeof mapZoom === 'number' && !isNaN(mapZoom) && mapZoom >= MIN_MAP_ZOOM) ? Math.min(MAX_MAP_ZOOM, mapZoom) : MIN_MAP_ZOOM; const finalScale = baseScale * currentMapZoom; if (finalScale <= 0 || isNaN(finalScale)) return { x: mapOffsetX || 0, y: mapOffsetY || 0 }; const mapRenderWidth = safeMapWidth * finalScale; const mapRenderHeight = safeMapHeight * finalScale; let minOffsetX = 0, maxOffsetX = 0, minOffsetY = 0, maxOffsetY = 0; const padding = 0; if (mapRenderWidth <= containerRect.width + 1) { minOffsetX = maxOffsetX = (containerRect.width - mapRenderWidth) / 2; } else { maxOffsetX = padding; minOffsetX = containerRect.width - mapRenderWidth - padding; } if (mapRenderHeight <= containerRect.height + 1) { minOffsetY = maxOffsetY = (containerRect.height - mapRenderHeight) / 2; } else { maxOffsetY = padding; minOffsetY = containerRect.height - mapRenderHeight - padding; } const clampedX = Math.max(minOffsetX, Math.min(maxOffsetX, rawOffsetX)); const clampedY = Math.max(minOffsetY, Math.min(maxOffsetY, rawOffsetY)); return { x: clampedX, y: clampedY }; }



function handleMapPanStart(event) { const clickedDot = event.target.closest('.level-dot'); const clickedButton = event.target.closest('button, .primary-button, .secondary-button, .pagination-button'); const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen(); if (event.button !== 0 || clickedDot || clickedButton || anotherOverlayActive) { isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab'; return; } event.preventDefault(); isMapPanning = true; mapPanStartX = event.clientX; mapPanStartY = event.clientY; mapStartPanX = mapOffsetX; mapStartPanY = mapOffsetY; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grabbing'; document.addEventListener('mousemove', handleMapPanMove, { passive: false, capture: true }); document.addEventListener('mouseup', handleMapPanEnd, { once: true, capture: true }); }

function handleMapPanMove(event) { if (!isMapPanning || !levelSelectMap || !levelSelectMapContainer) return; event.preventDefault(); const deltaX = event.clientX - mapPanStartX; const deltaY = event.clientY - mapPanStartY; const rawOffsetX = mapStartPanX + deltaX; const rawOffsetY = mapStartPanY + deltaY; const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY); mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y; hideTooltip(); applyMapZoomAndPan(true); }

function handleMapPanEnd(event) { if (!isMapPanning) return; event.preventDefault(); isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab'; document.removeEventListener('mousemove', handleMapPanMove, { capture: true }); document.removeEventListener('mouseup', handleMapPanEnd, { capture: true }); document.removeEventListener('touchmove', handleMapPanMoveTouch, { capture: true }); document.removeEventListener('touchend', handleMapPanEndTouch, { capture: true }); document.removeEventListener('touchcancel', handleMapPanEndTouch, { capture: true }); }

function handleMapPanStartTouch(event) { const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen(); if (isMapPanning || anotherOverlayActive) return; const touchTarget = event.target; const clickedDot = touchTarget.closest('.level-dot'); const clickedButton = touchTarget.closest('button, .primary-button, .secondary-button, .pagination-button'); if (clickedDot || clickedButton) return; if (event.touches.length === 1) { const touch = event.touches[0]; isMapPanning = true; mapPanStartX = touch.clientX; mapPanStartY = touch.clientY; mapStartPanX = mapOffsetX; mapStartPanY = mapOffsetY; document.addEventListener('touchmove', handleMapPanMoveTouch, { passive: false, capture: true }); document.addEventListener('touchend', handleMapPanEndTouch, { once: true, capture: true }); document.addEventListener('touchcancel', handleMapPanEndTouch, { once: true, capture: true }); } }

function handleMapPanMoveTouch(event) { if (!isMapPanning || event.touches.length !== 1) { handleMapPanEndTouch(event); return; } event.preventDefault(); if (levelSelectMapContainer) levelSelectMapContainer.classList.add('panning'); const touch = event.touches[0]; const deltaX = touch.clientX - mapPanStartX; const deltaY = touch.clientY - mapPanStartY; const rawOffsetX = mapStartPanX + deltaX; const rawOffsetY = mapStartPanY + deltaY; const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY); mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y; hideTooltip(); applyMapZoomAndPan(true); }

function handleMapPanEndTouch(event) { if (!isMapPanning) return; isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.classList.remove('panning'); document.removeEventListener('touchmove', handleMapPanMoveTouch, { capture: true }); document.removeEventListener('touchend', handleMapPanEndTouch, { capture: true }); document.removeEventListener('touchcancel', handleMapPanEndTouch, { capture: true }); }



function handleMapWheel(event) {

    event.preventDefault();

    if (!levelSelectMapContainer || !levelSelectMap) return;



    const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen();

    if (anotherOverlayActive) return;



    // Pan the map vertically based on wheel direction

    const scrollSpeed = 50; // pixels per wheel tick

    const deltaY = event.deltaY;



    // Calculate new offset (opposite direction for natural scrolling)

    const rawOffsetY = mapOffsetY - deltaY;



    // Clamp the offsets to keep map within bounds

    const clampedOffsets = clampMapOffsets(mapOffsetX, rawOffsetY);

    mapOffsetX = clampedOffsets.x;

    mapOffsetY = clampedOffsets.y;



    applyMapZoomAndPan(true);

}



function focusMapOnQuadrant(immediate = true) {

    if (!levelSelectMapContainer || !levelSelectMap) return;

    const currentHighestLevel = parseInt(highestLevelReached || '1', 10);

    const levelIndex = Math.max(0, currentHighestLevel - 1);

    const baseLevelIndex = levelIndex % TOTAL_LEVELS_BASE;

    const quadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS;

    const isMobileView = window.matchMedia("(hover: none) and (pointer: coarse)").matches || window.matchMedia("(max-width: 700px)").matches;



    // Get the exact level dot position from WORLD_PATHS if available

    let targetXPercent, targetYPercent;

    const levelWithinWorld = baseLevelIndex % LEVELS_PER_WORLD;

    if (WORLD_PATHS && WORLD_PATHS[quadrantIndex] && WORLD_PATHS[quadrantIndex][levelWithinWorld]) {

        // Use the exact level dot position

        targetXPercent = WORLD_PATHS[quadrantIndex][levelWithinWorld].x;

        targetYPercent = WORLD_PATHS[quadrantIndex][levelWithinWorld].y;

    } else {

        // Fallback to quadrant center

        const activeQuadrantCenters = isMobileView ? MOBILE_VISUAL_QUADRANT_CENTERS : VISUAL_QUADRANT_CENTERS;

        const targetCenter = activeQuadrantCenters[quadrantIndex] || { x: 50, y: 50 };

        targetXPercent = targetCenter.x;

        targetYPercent = targetCenter.y;

    }



    let targetZoom = isMobileView ? MOBILE_INITIAL_MAP_ZOOM_LEVEL : INITIAL_MAP_ZOOM_LEVEL;

    targetZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, targetZoom));

    const containerRect = levelSelectMapContainer.getBoundingClientRect(); if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const safeMapWidth = Math.max(1, mapIntrinsicWidth || 1024); const safeMapHeight = Math.max(1, mapIntrinsicHeight || 1024);

    const baseScale = calculateMapScale(containerRect.width, containerRect.height, safeMapWidth, safeMapHeight);

    const finalScale = baseScale * targetZoom; if (finalScale <= 0 || isNaN(finalScale)) return;

    const targetWorldX = (targetXPercent / 100) * safeMapWidth; const targetWorldY = (targetYPercent / 100) * safeMapHeight;

    let initialOffsetX = containerRect.width / 2 - targetWorldX * finalScale; let initialOffsetY = containerRect.height / 2 - targetWorldY * finalScale;

    const originalMapZoom = mapZoom; mapZoom = targetZoom; const clampedOffsets = clampMapOffsets(initialOffsetX, initialOffsetY); mapZoom = originalMapZoom;

    mapZoom = targetZoom; mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y; applyMapZoomAndPan(immediate);

}



async function handleCellClick(event) {

    // Debug Spawner Logic

    if (typeof debugSpawnMode !== 'undefined' && debugSpawnMode && selectedEnemyType) {

        const cell = event.currentTarget;

        const x = parseInt(cell.dataset.x);

        const y = parseInt(cell.dataset.y);



        if (!isCellInBounds(x, y)) return;



        const variant = WORLD_THEME_MAP[currentTerrainInfo?.name] || 'green';

        // Assuming debugSpawnEnemy is defined globally or in another file

        const success = typeof debugSpawnEnemy === 'function' ? debugSpawnEnemy(selectedEnemyType, x, y, variant) : false;



        if (success) {

            playSfx('summon');

            console.log(`Spawned ${selectedEnemyType} at (${x}, ${y})`);



            // Clear selection after spawning

            selectedEnemyType = null;

            debugSpawnMode = false;

            if (gameBoard) {

                gameBoard.classList.remove('debug-spawn-mode');

            }

        } else {

            playSfx('error');

            console.warn(`Failed to spawn ${selectedEnemyType} at (${x}, ${y})`);

        }

        return;

    }



    if (isPanning || (!currentSpell && event.target.closest('.unit,.item,.obstacle')) || isProcessing || !isGameActive() || isAnyOverlayVisible()) return;



    // Panning check: if mouse moved significantly, treat as drag and do not click

    const dx = event.clientX - gridMouseDownPos.x;

    const dy = event.clientY - gridMouseDownPos.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) return;



    const cell = event.currentTarget;



    const x = parseInt(cell.dataset.x); const y = parseInt(cell.dataset.y);

    if (!isCellInBounds(x, y)) return;



    const obstacle = getObstacleAt(x, y); const unitOnCell = getUnitAt(x, y);



    // For Flame Wave AND other spells, allow clicking anywhere - skip obstacle checks
    // The spell logic itself will validate if the target is valid (e.g., Fireball needs a target, Frost Nova needs a tile)
    if (currentSpell) {

        // Jump directly to spell handling

    } else if (obstacle && !obstacle.enterable && !obstacle.destructible && obstacle.blocksMove !== false) { playSfx('error'); showFeedback("Cannot target cell.", "feedback-error"); if (currentSpell) setActiveSpell(null); if (selectedUnit) deselectUnit(); return; }

    // If there's a unit, normally we let handleUnitClick handle it.

    // BUT, if we are casting a spell and the unit is invisible, we want to bypass handleUnitClick

    // so that handleCellClick's spell logic runs (which treats it as an empty/invalid tile).

    if (unitOnCell && (currentTurn !== 'player' || !selectedUnit)) {

        if (!currentSpell || !unitOnCell.isInvisible) {

            handleUnitClick(event, unitOnCell); return;

        }

    }

    if (obstacle?.enterable && obstacle.occupantUnitId) {

        const unitInside = units.find(u => u.id === obstacle.occupantUnitId);

        playSfx('error'); showFeedback("Tower is occupied.", "feedback-error");

        if (currentSpell) setActiveSpell(null); if (selectedUnit) deselectUnit(); return;

    }





    if (currentSpell) {

        let targetForSpell = null; let originElement = null;

        if (currentSpell === 'frostNova' || currentSpell === 'flameWave') {

            targetForSpell = { x, y };

            // Flame Wave can target anywhere - NO LOS restriction

        }

        else if (currentSpell === 'fireball') { if (obstacle?.canBeAttacked) { targetForSpell = obstacle; originElement = fireballElement; } else if (unitOnCell?.team === 'enemy' && isUnitAliveAndValid(unitOnCell) && !unitOnCell.isInvisible) { targetForSpell = unitOnCell; originElement = fireballElement; } else { playSfx('error'); showFeedback("Select a valid target for Fireball.", "feedback-error"); setActiveSpell(null); return; } }

        else if (currentSpell === 'heal') { playSfx('error'); showFeedback("Select a friendly unit to Heal.", "feedback-error"); setActiveSpell(null); return; }

        else { playSfx('error'); showFeedback("Select a valid target.", "feedback-error"); setActiveSpell(null); return; }

        if (targetForSpell) await castSpell(currentSpell, targetForSpell, originElement);

        return;

    }



    if (currentTurn === 'player' && selectedUnit && selectedUnit.team === 'player') {

        const isMoveValid = getValidMoves(selectedUnit, levelClearedAwaitingInput).some(p => p.x === x && p.y === y);

        if (isMoveValid) {

            const unitToMove = selectedUnit;

            await moveUnit(unitToMove, x, y);

            if (selectedUnit === unitToMove && levelClearedAwaitingInput) {

                highlightMovesAndAttacks(unitToMove);

            }

        }

        else { deselectUnit(); }

    } else {

        // Always deselect to clear any highlights (enemy selection, etc)

        // Pass false to keepPersistence to ensure range grids are cleared when clicking empty space

        deselectUnit(true, false);

    }

}



async function handleUnitClick(event, clickedUnit) {

    event.stopPropagation();

    if (!clickedUnit) return;



    // Stealth Check: Invisible units cannot be clicked unless they are a valid attack target

    if (clickedUnit.isInvisible) {

        // Fix: Allow clicking if casting an AOE spell (targets ground)

        if (currentSpell !== 'flameWave' && currentSpell !== 'frostNova') {

            let isAttackTarget = false;

            if (selectedUnit && selectedUnit.team === 'player' && currentTurn === 'player') {

                const attackTargets = getValidAttackTargets(selectedUnit);

                if (attackTargets.units.includes(clickedUnit.id)) {

                    isAttackTarget = true;

                }

            }

            if (!isAttackTarget) return;

        }

    }



    if (isPanning || !isGameActive() || !isUnitAliveAndValid(clickedUnit) || isAnyOverlayVisible()) { if (!isUnitAliveAndValid(clickedUnit)) { if (selectedUnit) deselectUnit(); updateUnitInfo(null); } return; }

    // Prevent actions if processing and it's player turn (e.g. while moving), but allow selection during enemy turn processing

    if (isProcessing && currentTurn === 'player') return;

    // Don't update side panel here - let the selection/inspection logic below handle it



    if (currentSpell) {

        let castSuccess = false; let originElementForSpell = null;

        if (currentSpell === 'fireball') originElementForSpell = fireballElement; else if (currentSpell === 'heal') originElementForSpell = healElement;

        else if (currentSpell === 'frostNova') originElementForSpell = frostNovaElement; else if (currentSpell === 'flameWave') originElementForSpell = flameWaveElement;



        let isValidSpellTarget = false;

        if (currentSpell === 'fireball' && clickedUnit.team === 'enemy') isValidSpellTarget = true;

        if (currentSpell === 'heal' && clickedUnit.team === 'player') isValidSpellTarget = true;

        if (currentSpell === 'frostNova' || currentSpell === 'flameWave') isValidSpellTarget = true; // These target a location, so unit click is valid as a location



        // wizard Spells

        if (currentSpell === 'chainLightning' && clickedUnit.team === 'enemy') isValidSpellTarget = true;

        if (currentSpell === 'polymorph' && clickedUnit.team === 'enemy') isValidSpellTarget = true;



        if (isValidSpellTarget) {

            // For location-based spells, pass the unit as a location object if needed, or castSpell handles it

            if (currentSpell === 'frostNova' || currentSpell === 'flameWave') {

                castSuccess = await castSpell(currentSpell, { x: clickedUnit.x, y: clickedUnit.y }, originElementForSpell);

            } else {

                castSuccess = await castSpell(currentSpell, clickedUnit, originElementForSpell);

            }

        }

        else { playSfx('error'); showFeedback("Invalid target for spell.", "feedback-error"); setActiveSpell(null); }

        return;

    }



    if (currentTurn === 'player') {

        if (selectedUnit && selectedUnit.team === 'player') {

            if (clickedUnit.team === 'enemy') {

                let targetObjectForAttack = clickedUnit;

                if (clickedUnit.inTower) { const tower = obstacles.find(o => o.id === clickedUnit.inTower); if (tower && isObstacleIntact(tower)) { targetObjectForAttack = tower; } else { playSfx('error'); showFeedback("Cannot target unit in destroyed tower.", "feedback-error"); deselectUnit(); return; } }

                const attackTargets = getValidAttackTargets(selectedUnit); const targetIsUnit = !!targetObjectForAttack.team;

                const canAttack = targetIsUnit ? attackTargets.units.includes(targetObjectForAttack.id) : attackTargets.obstacles.includes(targetObjectForAttack.id);

                if (canAttack) {

                    const attacker = selectedUnit;

                    await attack(attacker, targetObjectForAttack.x, targetObjectForAttack.y);

                    // Re-highlight after attack if level is cleared (for continuous attacking)

                    if (selectedUnit === attacker && levelClearedAwaitingInput && isUnitAliveAndValid(attacker)) {

                        highlightMovesAndAttacks(attacker);

                    }

                }

                else {

                    // Can't attack - switch to inspecting the enemy instead

                    // Pass false to keepPersistence to clear any previous range grid

                    deselectUnit(false, false);

                    clearHighlights(false);

                    if ((clickedUnit.currentRange || clickedUnit.range) > 1 && !clickedUnit.meleeOnlyAttack) {

                        highlightEnemyRange(clickedUnit);

                    }

                    if (clickedUnit.element) {

                        clickedUnit.element.classList.add('selected-enemy');

                        updateUnitVisualState(clickedUnit);

                    }

                    updateUnitInfo(clickedUnit);

                }



            }

            else if (clickedUnit.team === 'player') {

                if (clickedUnit.id === selectedUnit.id) {

                    deselectUnit(true, false);

                } else { selectUnit(clickedUnit); }

            } else { deselectUnit(true, false); }

        } else if (clickedUnit.team === 'player') { selectUnit(clickedUnit); }

        else if (clickedUnit.type === 'shaman_totem') {

            highlightMovesAndAttacks(clickedUnit);

            if (clickedUnit.element) {

                clickedUnit.element.classList.add('selected-enemy');

                updateUnitVisualState(clickedUnit);

            }

            updateUnitInfo(clickedUnit);

        }

        else if (clickedUnit.team === 'enemy') {
            // ALWAYS clear any currently selected unit OR existing enemy highlights first
            deselectUnit(false, false); // Don't play sound for silent switch, clear highlights



            // Check if already selected (toggle off)

            if (clickedUnit.element && clickedUnit.element.classList.contains('selected-enemy')) {

                // Explicitly remove the selection class

                clickedUnit.element.classList.remove('selected-enemy');

                updateUnitVisualState(clickedUnit);



                if ((clickedUnit.currentRange || clickedUnit.range) > 1 && !clickedUnit.meleeOnlyAttack) {

                    highlightEnemyRange(clickedUnit); // Toggles off the range grid

                } else {

                    clearHighlights(false);

                }

                updateUnitInfo(null);

                return;

            }



            // If ranged, toggle range grid persistence

            if ((clickedUnit.currentRange || clickedUnit.range) > 1 && !clickedUnit.meleeOnlyAttack) {

                highlightEnemyRange(clickedUnit);

            } else {

                // If not ranged, we explicitly clear highlights AND persistence

                clearHighlights(false);

            }



            // Highlight enemy unit (apply AFTER clearing)

            if (clickedUnit.element) {

                clickedUnit.element.classList.add('selected-enemy');

                updateUnitVisualState(clickedUnit);

            }



            // Update info panel but don't set as selectedUnit to avoid attack logic issues

            updateUnitInfo(clickedUnit);

        }

    } else {

        // Allow selection during enemy turn

        selectUnit(clickedUnit);

    }

}



async function handleItemClick(event, clickedItem) {

    event.stopPropagation();



    // Flame Wave can target anywhere on a row - NOTHING blocks it

    if (currentSpell === 'flameWave' && clickedItem) {

        await castSpell('flameWave', { x: clickedItem.x, y: clickedItem.y });

        return;

    }



    if (isPanning || isProcessing || !isGameActive() || !clickedItem || clickedItem.collected || isAnyOverlayVisible()) return;



    if (currentTurn === 'player' && selectedUnit) {

        const x = clickedItem.x; const y = clickedItem.y;

        const isMoveValid = getValidMoves(selectedUnit, levelClearedAwaitingInput).some(p => p.x === x && p.y === y);

        const isChest = clickedItem.type === 'chest';

        if (isMoveValid && (!isChest || !clickedItem.opened)) {

            const unitToMove = selectedUnit;

            await moveUnit(unitToMove, x, y);

            if (selectedUnit === unitToMove && levelClearedAwaitingInput) {

                highlightMovesAndAttacks(unitToMove);

            }

        }

        else { deselectUnit(true, false); }

    } else if (selectedUnit) { deselectUnit(true, false); }

}



async function handleObstacleClick(event, clickedObstacle) {

    event.stopPropagation();



    // NOTE: Don't show obstacle info here - only show it when NOT attacking

    // The info is shown later in the function only when appropriate



    // Flame Wave and Frost Nova target a location, so they ignore obstacles
    if ((currentSpell === 'flameWave' || currentSpell === 'frostNova') && clickedObstacle) {

        await castSpell(currentSpell, { x: clickedObstacle.x, y: clickedObstacle.y });

        return;

    }



    if (isPanning || isProcessing || !isGameActive() || !clickedObstacle || !isObstacleIntact(clickedObstacle) || isAnyOverlayVisible()) return;

    const targetX = clickedObstacle.x; const targetY = clickedObstacle.y;



    // Allow spell casting if level is NOT cleared, OR if unlimited spells cheat is active

    if ((!levelClearedAwaitingInput || unlimitedSpellsCheat) && currentSpell) {

        let castSuccess = false; let originEl = null; if (currentSpell === 'fireball') originEl = fireballElement;

        if (currentSpell === 'fireball' && clickedObstacle.canBeAttacked) { castSuccess = await castSpell(currentSpell, clickedObstacle, originEl); }

        if (!castSuccess && currentSpell) { playSfx('error'); showFeedback("Cannot target obstacle with this spell.", "feedback-error"); setActiveSpell(null); }

        return;

    }



    if (currentTurn === 'player' && selectedUnit) {

        const attackTargets = getValidAttackTargets(selectedUnit);

        const isAttackable = attackTargets.obstacles.includes(clickedObstacle.id) && clickedObstacle.canBeAttacked;

        if (isAttackable) {

            const attacker = selectedUnit;

            await attack(attacker, targetX, targetY);

            // Re-highlight after attack if level is cleared (for continuous attacking)

            if (selectedUnit === attacker && levelClearedAwaitingInput && isUnitAliveAndValid(attacker)) {

                highlightMovesAndAttacks(attacker);

            }

            return;

        }

        else if (clickedObstacle.type === 'snowman' && !clickedObstacle.revealed && clickedObstacle.clickable && getDistance(selectedUnit, clickedObstacle) <= selectedUnit.currentRange) { const attacker = selectedUnit; await attack(attacker, targetX, targetY); return; }

        else if (clickedObstacle.enterable && !clickedObstacle.occupantUnitId && !selectedUnit.inTower && (!selectedUnit.acted || levelClearedAwaitingInput) && !selectedUnit.isFrozen && !selectedUnit.isNetted) {

            const entryX = targetX; const entryY = targetY + 1;

            if (isCellInBounds(entryX, entryY)) {

                const obstacleAtEntry = getObstacleAt(entryX, entryY); if (obstacleAtEntry?.blocksMove) { playSfx('error'); showFeedback("Path blocked.", "feedback-error"); deselectUnit(); return; }

                const path = findPathToTarget(selectedUnit, entryX, entryY); const availableMov = selectedUnit.mov - (selectedUnit.isSlowed ? 1 : 0);

                if (path !== null && path.length <= availableMov) {

                    const unitToEnter = selectedUnit;

                    deselectUnit(false);

                    isProcessing = true;

                    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();

                    try {

                        await initiateTowerEntrySequence(unitToEnter, clickedObstacle, path);

                    } catch (e) {

                        console.error("Tower entry sequence error:", e);

                        playSfx('error');

                    } finally {

                        isProcessing = false;

                        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();

                    }

                    return;

                }

                else { playSfx('error'); showFeedback("Cannot reach.", "feedback-error"); deselectUnit(); return; }

            } else { playSfx('error'); showFeedback("Invalid entry.", "feedback-error"); deselectUnit(); return; }

        } else if (clickedObstacle.clickable && (!selectedUnit || selectedUnit.team !== 'player')) {

            // Select the obstacle if it's clickable and we aren't in a state to attack it (or no unit selected)

            playSfx('select');

            showObstacleInfo(clickedObstacle); // Show obstacle info in unit info panel

        } else if (!clickedObstacle.blocksMove && currentTurn === 'player' && selectedUnit && !clickedObstacle.canBeAttacked) {

            // Handle movement to non-blocking obstacles (like Bones or open Gates)

            const moves = getValidMoves(selectedUnit);

            if (moves.some(m => m.x === targetX && m.y === targetY)) {

                await moveUnit(selectedUnit, targetX, targetY);

                if (selectedUnit.team === 'player' && levelClearedAwaitingInput) {

                    highlightMovesAndAttacks(selectedUnit);

                }

                return;

            } else {

                deselectUnit(true, false);

                // After deselecting, if it was a clickable/attackable obstacle like a tower, show its info

                if (clickedObstacle && (clickedObstacle.clickable || clickedObstacle.canBeAttacked)) {

                    showObstacleInfo(clickedObstacle);

                }

            }

        } else {

            playSfx('error'); // Keep error sound for invalid action

            // Feedback for why the action failed

            if (clickedObstacle.destructible && !isAttackable) showFeedback("Out of range/sight or not attackable.", "feedback-error");

            else if (clickedObstacle.type === 'snowman' && !clickedObstacle.revealed) showFeedback("Get closer or shoot it!", "feedback-error");

            else showFeedback("Cannot interact.", "feedback-error");



            deselectUnit();

            // After deselecting, show info if applicable (e.g. clicking a tower while a unit is selected but too far away)

            if (clickedObstacle && (clickedObstacle.clickable || clickedObstacle.canBeAttacked)) {

                showObstacleInfo(clickedObstacle);

            }

            return;

        }

        playSfx('select');

    }

}



function handleUnitMouseEnter(event) {

    const unitId = event.currentTarget.dataset.id;

    const unit = units.find(u => u.id === unitId);

    if (unit) {

        if (unit.isInvisible) return;

        unit.isHovered = true;

        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);

        showEnemyRangeHover(unit);

    }

}

function handleUnitMouseLeave(event) {

    const unitId = event.currentTarget.dataset.id;

    const unit = units.find(u => u.id === unitId);

    if (unit) {

        unit.isHovered = false;

        if (typeof updateUnitVisualState === 'function') updateUnitVisualState(unit);

    }

    clearEnemyRangeHover();

}



function handleItemMouseLeave(event) { }

/* active handleObstacleMouseEnter is at line ~2523 */

function handleObstacleMouseLeave(event) { }

function handleCellMouseEnter(event) { if (isMobileDevice() || !isGameActive() || isProcessing || isPanning || !gameBoard || isAnyOverlayVisible()) return; const cell = event.currentTarget; const x = parseInt(cell.dataset.x); const y = parseInt(cell.dataset.y); const unitOnCell = getUnitAt(x, y); const obstacleOnCell = getObstacleAt(x, y); clearSpellHighlights(); if (currentSpell === 'frostNova') highlightFrostNovaArea(x, y); else if (currentSpell === 'flameWave') highlightFlameWaveArea(y); else if (currentSpell === 'fireball') { if ((unitOnCell?.team === 'enemy' && isUnitAliveAndValid(unitOnCell) && !unitOnCell.isInvisible) || (obstacleOnCell?.canBeAttacked && isObstacleIntact(obstacleOnCell))) { cell.classList.add('valid-fireball-target'); if (unitOnCell?.element) unitOnCell.element.classList.add('valid-fireball-target'); if (obstacleOnCell?.element) obstacleOnCell.element.classList.add('valid-fireball-target'); } } else if (currentSpell === 'heal') { if (unitOnCell?.team === 'player' && isUnitAliveAndValid(unitOnCell)) { cell.classList.add('valid-heal-target'); if (unitOnCell.element) unitOnCell.element.classList.add('valid-heal-target'); } } const canBePrimaryTarget = cell.classList.contains('can-be-primary-target'); if (selectedUnit?.type === 'champion' && canBePrimaryTarget && !currentSpell) { let targetPos = unitOnCell || obstacleOnCell; if (targetPos) showAttackHoverHighlights(selectedUnit, targetPos); else clearAttackHoverHighlights(); } else if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }

function handleCellMouseLeave(event) { if (isMobileDevice() || !isGameActive() || isProcessing || isPanning || isAnyOverlayVisible()) return; if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }

function handleGridMouseLeave() { clearSpellHighlights(); if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }



// Cheat Code Variables

let cheatInputBuffer = '';

let cheatsUnlocked = localStorage.getItem('knightGambit_cheatsUnlocked') === 'true';



function handleKeyDown(event) {

    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;



    // Secret Cheat Code Logic

    if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {

        cheatInputBuffer += event.key.toLowerCase();

        if (cheatInputBuffer.length > 20) cheatInputBuffer = cheatInputBuffer.slice(-20);



        if (cheatInputBuffer.endsWith('soraforever') && !cheatsUnlocked) {

            cheatsUnlocked = true;

            localStorage.setItem('knightGambit_cheatsUnlocked', 'true');

            cheatInputBuffer = ''; // Clear buffer

            playSfx('achievementUnlock');

            if (typeof showFeedback === 'function') showFeedback("Cheats Unlocked!", "feedback-achievement-unlock");

        }

    }



    // Main Menu Hotkeys (E, A, L, O) - Protected against "soraforever" conflict

    // Check if Main Menu is open and NO OTHER overlay is covering it (isAnyOverlayVisible(true) excludes main menu itself)

    if (isMainMenuOpen() && !isAnyOverlayVisible(true) && event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {

        const key = event.key.toLowerCase();



        // Conflict Resolution: Check if typing this key makes the buffer a valid prefix of the secret code.

        // If it does, we assume the user is typing the code and suppress the hotkey.

        // Special case: 's' starts the code, so it will match the prefix, but 's' isn't a hotkey here so it's fine.

        // But subsequent keys like 'o' (Options) or 'e' (Enter) need to be checked.

        let isTypingSecret = false;

        const secretCode = "soraforever";

        // Check if the CURRENT buffer (which includes the new key) matches the start of the secret code

        if (cheatInputBuffer.length > 0 && secretCode.startsWith(cheatInputBuffer) && cheatInputBuffer !== secretCode) {

            isTypingSecret = true;

        }



        if (!isTypingSecret) {

            if (key === 'e') {

                playSfx('select');

                document.getElementById('start-game-button')?.click();

                event.preventDefault();

                return;

            }

            if (key === 'a') {

                playSfx('select');

                document.getElementById('achievements-menu-button')?.click();

                event.preventDefault();

                return;

            }

            if (key === 'l') {

                playSfx('select');

                document.getElementById('leaderboard-menu-button')?.click();

                event.preventDefault();

                return;

            }

            if (key === 'o') {

                playSfx('select');

                document.getElementById('settings-menu-button')?.click();

                event.preventDefault();

                return;

            }

        }

    }



    const overlayVisible = isAnyOverlayVisible();

    const gameRunning = isGameActive();

    const gameActiveAndNoOverlay = gameRunning && !overlayVisible;



    if (event.key.toLowerCase() === 'm' && (isSettingsOpen() || isMenuOpen())) { handleMuteToggle(); event.preventDefault(); return; }

    if (event.key === 'F4') { toggleFullscreen(); event.preventDefault(); return; }

    if (event.key.toLowerCase() === 'f' && (isMenuOpen() || isSettingsOpen())) { toggleFullscreen(); event.preventDefault(); return; }



    if (event.key === 'Home' && gameActiveAndNoOverlay) { centerView(false); event.preventDefault(); return; }

    if (event.key.toLowerCase() === 'b' && !event.shiftKey && gameActiveAndNoOverlay) { showMenu(); event.preventDefault(); return; }

    if (event.key === 'Escape') { if (isAccountsOpen()) { hideAccountsOverlay(); event.preventDefault(); return; } if (isShopOpen()) { hideShop(); proceedAfterShopMaybe(); event.preventDefault(); return; } if (isLevelCompleteOpen()) { hideLevelComplete(); proceedToNextLevelOrLocation(); event.preventDefault(); return; } if (isMenuOpen()) { hideMenu(); event.preventDefault(); return; } if (isLeaderboardOpen()) { hideLeaderboard(); showMainMenu(); event.preventDefault(); return; } if (isChooseTroopsScreenOpen()) { handleTroopsBack(); event.preventDefault(); return; } if (isLevelSelectOpen()) { showMainMenu(); event.preventDefault(); return; } if (isGameOverScreenVisible()) { showMainMenu(); event.preventDefault(); return; } if (isSettingsOpen()) { hideSettings(); if (menuOverlay?.classList.contains('visible')) { } else { showMainMenu(); } event.preventDefault(); return; } if (isAchievementsOpen()) { hideAchievements(); showMainMenu(); event.preventDefault(); return; } if (gameActiveAndNoOverlay) { if (currentSpell) setActiveSpell(null); else if (selectedUnit) deselectUnit(); else showMenu(); event.preventDefault(); } return; }

    if (isLevelSelectOpen() && event.key.toLowerCase() === 'e') { if (typeof highestLevelReached !== 'undefined' && highestLevelReached > 0) { playSfx('levelSelect'); hideLevelSelect(); initGame(highestLevelReached); event.preventDefault(); } else playSfx('error'); return; }

    if (isLevelCompleteOpen() && event.key.toLowerCase() === 'e') { nextLevelButton?.click(); event.preventDefault(); return; }

    if (isLevelCompleteOpen() && event.key.toLowerCase() === 's') { levelCompleteShopButton?.click(); event.preventDefault(); return; }

    if (isShopOpen() && !event.ctrlKey && !event.altKey && !event.metaKey) {

        const key = event.key.toLowerCase();



        // Tab Navigation with Arrows

        if (event.key === 'ArrowRight') {
            if (currentShopTab === 'main') switchShopTab('armory');
            else if (currentShopTab === 'armory') switchShopTab('troops');
            event.preventDefault(); return;
        }
        if (event.key === 'ArrowLeft') {
            if (currentShopTab === 'troops') switchShopTab('armory');
            else if (currentShopTab === 'armory') switchShopTab('main');
            event.preventDefault(); return;
        }



        if (key === 'e' || key === 'b') { shopExitButton?.click(); event.preventDefault(); return; }

        if (key === 's') {

            switchShopTab('main');

            event.preventDefault(); return;

        }

        if (key === 'a') {

            switchShopTab('armory');

            event.preventDefault(); return;

        }

        if (key === 't') {
            switchShopTab('troops');
            event.preventDefault(); return;
        }
    }

    // Level Select Paging Navigation
    if (isLevelSelectOpen()) {
        const otherBlockingOverlays = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isSettingsOpen() || isAchievementsOpen() || isNamePromptOpen() || isAccountsOpen() || isMainMenuOpen();
        if (!otherBlockingOverlays) {
            if (event.key === ',' || event.key === '<') {
                handleLevelSelectPageChange(-1);
                event.preventDefault();
                return;
            }
            if (event.key === '.' || event.key === '>') {
                handleLevelSelectPageChange(1);
                event.preventDefault();
                return;
            }
        }
    }

    if (isLevelSelectOpen() && event.key.toLowerCase() === 's') { levelSelectShopButton?.click(); event.preventDefault(); return; }

    if (isAccountsOpen() && event.key.toLowerCase() === 'b') { hideAccountsOverlay(); event.preventDefault(); return; }

    if (isLevelSelectOpen() && event.key.toLowerCase() === 'b') { backToMainMenuButton?.click(); event.preventDefault(); return; }

    if (isLevelSelectOpen() && event.key.toLowerCase() === 'a') { showAccountsOverlay(); playSfx('select'); event.preventDefault(); return; }

    if (isChooseTroopsScreenOpen() && event.key.toLowerCase() === 'e') { confirmTroopsButton?.click(); event.preventDefault(); return; }

    if (isChooseTroopsScreenOpen() && event.key.toLowerCase() === 'e') { confirmTroopsButton?.click(); event.preventDefault(); return; }

    if (isChooseTroopsScreenOpen() && event.key.toLowerCase() === 'b') { troopsBackButton?.click(); event.preventDefault(); return; }

    if (isAchievementsOpen() && event.key.toLowerCase() === 'b') { closeAchievementsButton?.click(); event.preventDefault(); return; }

    if (isLeaderboardOpen() && event.key.toLowerCase() === 'b') { closeLeaderboardButton?.click(); event.preventDefault(); return; }

    if (isSettingsOpen() && event.key.toLowerCase() === 'b') { closeSettingsButton?.click(); event.preventDefault(); return; }

    if (isMenuOpen() && event.key.toLowerCase() === 'b') { closeMenuButton?.click(); event.preventDefault(); return; }

    if (isMenuOpen() && event.key.toLowerCase() === 'q') { quitToMainMenuButton?.click(); event.preventDefault(); return; }

    if ((isMenuOpen() || isSettingsOpen()) && event.key.toLowerCase() === 'f') { toggleFullscreen(); event.preventDefault(); return; }



    if (isMenuOpen() && event.key.toLowerCase() === 'r') {
        const canForfeit = typeof playerActionsTakenThisLevel !== 'undefined' && playerActionsTakenThisLevel >= FORFEIT_MOVE_THRESHOLD;
        if (!canForfeit) {
            document.getElementById('restart-level-setting-button')?.click();
            event.preventDefault();
            return;
        }
    }

    if (isMenuOpen() && event.key.toLowerCase() === 'e') { quitButton?.click(); event.preventDefault(); return; }

    if (isGameOverScreenVisible() && event.key.toLowerCase() === 'r') { restartButton?.click(); event.preventDefault(); return; }

    if (isGameOverScreenVisible() && event.key.toLowerCase() === 'e') {

        const titleText = gameOverTitle?.textContent.toLowerCase() || "";

        if (titleText.includes("victory")) {

            showMainMenu();

        } else {

            showLevelSelect();

        }

        event.preventDefault();

        return;

    }



    // Choose Troops Hotkey (T)

    if (event.key.toLowerCase() === 't') {

        if (isLevelSelectOpen()) {

            levelSelectTroopsButton?.click();

            event.preventDefault();

            return;

        }

        if (isShopOpen()) {

            shopTroopsButton?.click();

            event.preventDefault();

            return;

        }

    }



    // World Map arrow key panning (before overlay return check)

    if (isLevelSelectOpen() && event.key.startsWith('Arrow')) {

        const panAmount = event.shiftKey ? 150 : 75;

        if (event.key === 'ArrowUp') mapOffsetY += panAmount;

        else if (event.key === 'ArrowDown') mapOffsetY -= panAmount;

        else if (event.key === 'ArrowLeft') mapOffsetX += panAmount;

        else if (event.key === 'ArrowRight') mapOffsetX -= panAmount;

        const clampedOffsets = clampMapOffsets(mapOffsetX, mapOffsetY);

        mapOffsetX = clampedOffsets.x;

        mapOffsetY = clampedOffsets.y;



        // Apply smooth transition for arrow key panning

        if (levelSelectMap) levelSelectMap.style.transition = 'transform 0.15s ease-out';

        if (levelSelectDotsLayer) levelSelectDotsLayer.style.transition = 'transform 0.15s ease-out';

        applyMapZoomAndPan(true); // immediate=true to skip default transition

        // Manually apply transform since we set immediate=true

        const containerRect = levelSelectMapContainer.getBoundingClientRect();

        const baseScale = calculateMapScale(containerRect.width, containerRect.height, mapIntrinsicWidth, mapIntrinsicHeight);

        const finalScale = baseScale * mapZoom;

        const transformValue = `translate(${mapOffsetX}px, ${mapOffsetY}px) scale(${finalScale})`;

        levelSelectMap.style.transform = transformValue;

        levelSelectDotsLayer.style.transform = transformValue;



        // Clear transition after animation

        setTimeout(() => {

            if (levelSelectMap) levelSelectMap.style.transition = '';

            if (levelSelectDotsLayer) levelSelectDotsLayer.style.transition = '';

        }, 150);



        event.preventDefault();

        return;

    }



    // Cheats Block (Restricted)

    if (overlayVisible || (event.metaKey || event.ctrlKey)) return;



    if (event.shiftKey && gameRunning) {

        if (!cheatsUnlocked) return; // Cheats are locked!



        const key = event.key.toLowerCase();

        if (key === 'h') { event.preventDefault(); applyCheatSpellAttack(50); return; }

        if (key === 'g') { event.preventDefault(); applyCheatGold(500); return; }

        if (key === 'b') {
            event.preventDefault();
            unlimitedSpellsCheat = !unlimitedSpellsCheat;
            if (unlimitedSpellsCheat) {
                markAsCheater();


                // Reset cooldowns for all player units immediately

                units.forEach(u => {

                    if (u.team === 'player' && isUnitAliveAndValid(u)) {

                        if (u.chainLightningCooldown) u.chainLightningCooldown = 0;

                        if (u.polymorphCooldown) u.polymorphCooldown = 0;

                        if (u.type === 'rogue') u.quickStrikeUsedThisLevel = false;

                    }

                });

                if (selectedUnit) updateUnitInfo(selectedUnit);

            }

            showFeedback(unlimitedSpellsCheat ? "CHEAT: Unlimited Spells!" : "CHEAT OFF: Limited Spells.", "feedback-cheat");

            playSfx('cheat');

            resetSpellStateForNewLevel(); updateSpellUI(); return;

        } if (key === 't' && gameActiveAndNoOverlay) {
            event.preventDefault();
            markAsCheater(); // Permanent taint
            isProcessing = true; if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showFeedback === 'function') showFeedback("CHEAT: Skipping Level...", "feedback-levelup", 150); playSfx('cheat'); setTimeout(() => {


                if (!isGameActive() || isGameOver()) { isProcessing = false; return; } units = units.filter(u => u.team === 'player'); clearTimeoutMap(deathSpriteTimeouts); const stats = typeof calculateLevelStats === 'function' ? calculateLevelStats() : { totalGoldEarned: 0, goldGained: 0 }; playerGold += (stats.totalGoldEarned || 0) - (stats.goldGained || 0); playerGold = Math.max(0, playerGold); if (currentLevel >= highestLevelReached) highestLevelReached = currentLevel + 1;

                if (typeof saveScoreToLeaderboard === 'function') {

                    const achCount = Object.values(achievementProgress || {}).filter(a => a.unlocked).length;

                    saveScoreToLeaderboard(currentLevel, playerGold, gameSettings.playerName, achCount);

                }

                saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); stopMusic(); hideAllOverlays(); if (typeof startNextLevel === 'function') startNextLevel(); else { isGameActiveFlag = false; isProcessing = false; showLevelSelect(); }

            }, 150); return;

        }

    } else if (gameActiveAndNoOverlay && !isProcessing) {



        if (event.key.toLowerCase() === 'q') {

            if (selectedUnit && selectedUnit.type === 'rogue') {

                const qsButton = document.getElementById('ability-quick-strike');

                if (qsButton && !qsButton.classList.contains('hidden') && !qsButton.classList.contains('locked')) {

                    activateRogueQuickStrike(selectedUnit);

                }

            }

        }

        if (event.key.toLowerCase() === 's') {

            if (selectedUnit && selectedUnit.type === 'rogue') {

                const stealthButton = document.getElementById('ability-stealth');

                if (stealthButton && !stealthButton.classList.contains('hidden') && !stealthButton.classList.contains('locked')) {

                    activateRogueStealth(selectedUnit);

                }

            }

        }

        if (event.key.toLowerCase() === 'c') {

            if (selectedUnit && selectedUnit.type === 'wizard') {

                const clButton = document.getElementById('ability-chain-lightning');

                if (clButton && !clButton.classList.contains('hidden') && !clButton.classList.contains('locked')) {

                    if (currentSpell === 'chainLightning') setActiveSpell(null);

                    else setActiveSpell('chainLightning');

                }

            }

        }

        if (event.key.toLowerCase() === 'r') {

            if (selectedUnit && selectedUnit.type === 'wizard') {

                const polyButton = document.getElementById('ability-polymorph');

                if (polyButton && !polyButton.classList.contains('hidden') && !polyButton.classList.contains('locked')) {

                    if (currentSpell === 'polymorph') setActiveSpell(null);

                    else setActiveSpell('polymorph');

                }

            }

        }

    }



    // Arrow key panning - works during processing and enemy turn too

    if (event.key.startsWith('Arrow')) {

        const panAmount = event.shiftKey ? 150 : 75; // Faster panning with Shift



        // Game board panning

        if (gameRunning && !overlayVisible) {

            // Add smooth transition

            if (gridContent) {

                gridContent.style.transition = 'transform 0.15s ease-out';

                if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = 'transform 0.15s ease-out';

            }



            if (event.key === 'ArrowUp') gridContentOffsetY += panAmount;

            else if (event.key === 'ArrowDown') gridContentOffsetY -= panAmount;

            else if (event.key === 'ArrowLeft') gridContentOffsetX += panAmount;

            else if (event.key === 'ArrowRight') gridContentOffsetX -= panAmount;



            applyZoomAndPan();



            // Clear transition after animation

            setTimeout(() => {

                if (gridContent) gridContent.style.transition = '';

                if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = '';

            }, 150);



            event.preventDefault();

            return;

        }

    }







    if (event.key === '1') { setActiveSpell('fireball'); event.preventDefault(); return; } if (event.key === '2') { setActiveSpell('flameWave'); event.preventDefault(); return; } if (event.key === '3') { setActiveSpell('frostNova'); event.preventDefault(); return; } if (event.key === '4') { setActiveSpell('heal'); event.preventDefault(); return; } if (event.key.toLowerCase() === 'e') { endTurnButton?.click(); event.preventDefault(); }

}



function isAnyOverlayVisible(excludeMainMenu = false) { return isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isLevelSelectOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isSettingsOpen() || isAchievementsOpen() || isNamePromptOpen() || isAccountsOpen() || (!excludeMainMenu && isMainMenuOpen()); }

function hideAllOverlays() { const overlays = [mainMenu, gameOverScreen, menuOverlay, leaderboardOverlay, levelSelectScreen, shopScreen, levelCompleteScreen, chooseTroopsScreen, settingsOverlay, achievementsOverlay, namePromptOverlay, accountsOverlay, newProfileOverlay, deleteConfirmOverlay]; overlays.forEach(o => { o?.classList.add('hidden'); o?.classList.remove('visible'); }); gameBoardWrapper?.classList.toggle('active', isGameActive() && !isAnyOverlayVisible()); startTooltipUpdater(); updateParUI(); }

function hideUnitInfo() { if (unitInfo) { unitInfo.classList.remove('visible'); unitInfo.style.display = 'none'; } }

function showMainMenu() { fullGameReset(); hideAllOverlays(); hideUnitInfo(); mainMenu?.classList.remove('hidden'); mainMenu?.classList.add('visible'); startTooltipUpdater(); selectAndLoadMusic(); } function hideMainMenu() { mainMenu?.classList.remove('visible'); mainMenu?.classList.add('hidden'); } function isMainMenuOpen() { return mainMenu?.classList.contains('visible'); }

function showLevelCompleteScreen(stats, finalGold) {
    hideAllOverlays();
    hideUnitInfo();
    stopMusic();
    playVictoryMusic();
    startTooltipUpdater();
    if (!levelCompleteScreen || !statsBonusList || !levelCompleteTotalGoldElement) return;

    if (levelCompleteTitle) levelCompleteTitle.textContent = 'Level ' + currentLevel + ' Complete!';

    statsEnemiesKilled.textContent = stats.enemiesKilled;
    statsUnitsLost.textContent = stats.unitsLost;
    statsGoldGained.textContent = stats.goldGained;
    statsTotalGold.textContent = stats.totalGoldEarned;
    levelCompleteTotalGoldElement.textContent = finalGold;

    statsBonusList.querySelector('[data-bonus="noSpells"]').classList.toggle('hidden', stats.bonusGoldNoSpells <= 0);
    statsBonusList.querySelector('[data-bonus="noSpells"] .bonus-amount').textContent = stats.bonusGoldNoSpells;

    // Speed Bonus
    const speedBonusRow = statsBonusList.querySelector('[data-bonus="speed"]');
    if (speedBonusRow) {
        speedBonusRow.classList.toggle('hidden', stats.bonusGoldSpeed <= 0);
        speedBonusRow.querySelector('.bonus-amount').textContent = stats.bonusGoldSpeed;
    }

    // No Losses
    const noLossesRow = statsBonusList.querySelector('[data-bonus="noLosses"]');
    if (noLossesRow) {
        noLossesRow.classList.toggle('hidden', (stats.bonusGoldNoLosses || 0) <= 0);
        noLossesRow.querySelector('.bonus-amount').textContent = stats.bonusGoldNoLosses || 0;
    }

    // No Armor
    const noArmorRow = statsBonusList.querySelector('[data-bonus="noArmor"]');
    if (noArmorRow) {
        noArmorRow.classList.toggle('hidden', (stats.bonusGoldNoArmor || 0) <= 0);
        noArmorRow.querySelector('.bonus-amount').textContent = stats.bonusGoldNoArmor || 0;
    }

    // Executioner Bonus
    const executionerRow = statsBonusList.querySelector('[data-bonus="executioner"]');
    if (executionerRow) {
        executionerRow.classList.toggle('hidden', (stats.bonusGoldExecutioner || 0) <= 0);
        executionerRow.querySelector('.bonus-amount').textContent = stats.bonusGoldExecutioner || 0;
    }


    const hasAnyBonus = stats.bonusGoldNoSpells > 0 || stats.bonusGoldSpeed > 0 || stats.bonusGoldNoLosses > 0 || stats.bonusGoldNoArmor > 0 || stats.bonusGoldExecutioner > 0;
    const bonusesHeader = document.getElementById('bonuses-header');
    if (bonusesHeader) bonusesHeader.textContent = hasAnyBonus ? 'Bonuses:' : 'No Bonuses';
    levelCompleteScreen.classList.remove('hidden');
    levelCompleteScreen.classList.add('visible');
    updateParUI();
}
function hideLevelComplete() { levelCompleteScreen?.classList.remove('visible'); levelCompleteScreen?.classList.add('hidden'); stopMusic(); selectAndLoadMusic(); startTooltipUpdater(); }

function isLevelCompleteOpen() { return levelCompleteScreen?.classList.contains('visible'); }

function showGameOverScreen(playerWon, message, isForfeit = false) {

    hideAllOverlays(); hideUnitInfo();

    if (playerWon) playVictoryMusic();

    else playDefeatMusic();

    startTooltipUpdater();

    if (!gameOverScreen || !gameOverTitle || !gameOverMessage || !restartButton || !gameOverToTitleButton) return;

    gameOverTitle.textContent = playerWon ? "Victory!" : (isForfeit ? "Level Forfeited" : "Defeat!");

    gameOverMessage.innerHTML = message;



    // Maintain icons, only adjust visibility and layout

    restartButton.style.display = (isForfeit || playerWon) ? 'none' : 'inline-flex';

    gameOverToTitleButton.style.display = 'inline-flex';



    gameOverScreen.classList.remove('hidden');

    gameOverScreen.classList.add('visible');
    updateParUI();

} function hideGameOverScreen() { gameOverScreen?.classList.remove('visible'); gameOverScreen?.classList.add('hidden'); selectAndLoadMusic(); startTooltipUpdater(); } function isGameOverScreenVisible() { return gameOverScreen?.classList.contains('visible'); }

function showMenu() {

    if (!isAnyOverlayVisible() && isGameActive()) {

        hideUnitInfo();

        menuOverlay?.classList.remove('hidden');

        menuOverlay?.classList.add('visible');

        updateGoldDisplay();

        updateQuitButton();

        stopTooltipUpdater();

        startTooltipUpdater();



        // Sync settings UI from in-memory gameSettings (no re-load needed)
        syncAllSettingsUI();
        updateParUI();

    }

}



function syncAllSettingsUI() {
    document.querySelectorAll('.music-volume-slider').forEach(s => {
        s.value = musicVolume;
        updateSliderFill(s);
    });
    document.querySelectorAll('.music-volume-value').forEach(v => v.textContent = `${Math.round(musicVolume * 100)}%`);

    document.querySelectorAll('.sfx-volume-slider').forEach(s => {
        s.value = sfxVolume;
        updateSliderFill(s);
    });
    document.querySelectorAll('.sfx-volume-value').forEach(v => v.textContent = `${Math.round(sfxVolume * 100)}%`);

    document.querySelectorAll('.mute-toggle-checkbox').forEach(c => c.checked = isMuted);
    document.querySelectorAll('.fullscreen-toggle-checkbox').forEach(c => c.checked = isFullscreen());


    if (playerNameSettingInput) playerNameSettingInput.value = gameSettings.playerName;
}

function updateSliderFill(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 1;
    const val = parseFloat(slider.value);
    const percent = (val - min) / (max - min) * 100;
    slider.style.setProperty('--fill-percent', percent + '%');
}



function hideMenu() {

    menuOverlay?.classList.remove('visible');

    menuOverlay?.classList.add('hidden');

    stopTooltipUpdater();

    if (isGameActive() && !isAnyOverlayVisible()) {
        startTooltipUpdater();
        requestAnimationFrame(() => {
            calculateCellSize();
            centerView(true);
        });
    }
    updateParUI();
}

function isMenuOpen() { return menuOverlay?.classList.contains('visible'); }

function showSettings(originMenu = false) {

    if (originMenu) {
        hideAllOverlays();
    } else {
        // From Main Menu - keeps it in background
        const overlaysToHide = [gameOverScreen, menuOverlay, leaderboardOverlay, levelSelectScreen, shopScreen, levelCompleteScreen, chooseTroopsScreen, achievementsOverlay, namePromptOverlay, accountsOverlay, newProfileOverlay, deleteConfirmOverlay];
        overlaysToHide.forEach(o => { o?.classList.add('hidden'); o?.classList.remove('visible'); });
    }

    settingsOverlay?.classList.remove('hidden');

    settingsOverlay?.classList.add('visible');

    loadSettings();

    syncAllSettingsUI();

    settingsOverlay.dataset.originMenu = originMenu;

    startTooltipUpdater();
    updateParUI();
    updateCheatResetButtonVisibility();
}

function updateCheatResetButtonVisibility() {
}

window.updateCheatResetButtonVisibility = updateCheatResetButtonVisibility;

function hideSettings() {
    const originMenu = settingsOverlay?.dataset.originMenu === 'true';
    settingsOverlay?.classList.remove('visible');
    settingsOverlay?.classList.add('hidden');
    settingsOverlay.dataset.originMenu = 'false';
    if (originMenu) {
        showMenu();
    } else {
        mainMenu?.classList.remove('hidden');
        mainMenu?.classList.add('visible');
        if (isGameActive()) {
            requestAnimationFrame(() => {
                calculateCellSize();
                centerView(true);
            });
        }
    }
}
function isSettingsOpen() { return settingsOverlay?.classList.contains('visible'); }

function showAchievements() { hideAllOverlays(); achievementsOverlay?.classList.remove('hidden'); achievementsOverlay?.classList.add('visible'); updateAchievementsScreen(); startTooltipUpdater(); updateParUI(); } function hideAchievements() { achievementsOverlay?.classList.remove('visible'); achievementsOverlay?.classList.add('hidden'); showMainMenu(); } function isAchievementsOpen() { return achievementsOverlay?.classList.contains('visible'); }

function showNamePrompt() { hideAllOverlays(); namePromptOverlay?.classList.remove('hidden'); namePromptOverlay?.classList.add('visible'); initialPlayerNameInput?.focus(); updateParUI(); }

function hideNamePrompt() { namePromptOverlay?.classList.add('hidden'); namePromptOverlay?.classList.remove('visible'); }

function isNamePromptOpen() { return namePromptOverlay?.classList.contains('visible'); }

// Redundant saveScoreToLeaderboard removed - using consolidated version in gameLogic.js






function hideLeaderboard() { leaderboardOverlay?.classList.remove('visible'); leaderboardOverlay?.classList.add('hidden'); leaderboardEntry?.classList.add('hidden'); } function isLeaderboardOpen() { return leaderboardOverlay?.classList.contains('visible'); }

function showLevelSelect() { fullGameReset(); hideAllOverlays(); levelSelectScreen?.classList.remove('hidden'); levelSelectScreen?.classList.add('visible'); gameBoardWrapper?.classList.remove('active'); loadGameData(); currentLevelSelectPage = Math.floor(Math.max(0, highestLevelReached - 1) / LEVELS_PER_PAGE) + 1; updateLevelSelectScreen(); updateLevelSelectPagination(); stopTooltipUpdater(); selectAndLoadMusic(); const img = new Image(); img.onload = () => { mapIntrinsicWidth = img.naturalWidth || 1024; mapIntrinsicHeight = img.naturalHeight || 1024; if (levelSelectMap) { levelSelectMap.style.width = `${mapIntrinsicWidth}px`; levelSelectMap.style.height = `${mapIntrinsicHeight}px`; levelSelectMap.style.backgroundSize = '100% 100%'; } if (levelSelectDotsLayer) { levelSelectDotsLayer.style.width = `${mapIntrinsicWidth}px`; levelSelectDotsLayer.style.height = `${mapIntrinsicHeight}px`; } focusMapOnQuadrant(); startTooltipUpdater(); updateParUI(); }; img.onerror = () => { mapIntrinsicWidth = 1024; mapIntrinsicHeight = 1024; mapZoom = 1; mapOffsetX = 0; mapOffsetY = 0; applyMapZoomAndPan(true); startTooltipUpdater(); updateParUI(); }; img.src = WORLD_MAP_IMAGE_URL; } function hideLevelSelect() { levelSelectScreen?.classList.remove('visible'); levelSelectScreen?.classList.add('hidden'); startTooltipUpdater(); } function isLevelSelectOpen() { return levelSelectScreen?.classList.contains('visible'); }

function updateLevelSelectPagination() {
    if (!levelSelectPageInfo || !levelSelectPrevPage || !levelSelectNextPage) return;

    const totalPages = Math.max(1, Math.ceil(highestLevelReached / LEVELS_PER_PAGE));

    // Clamp current page to bounds (Fixes "stays displaying 3 pages" bug after profile switch)
    if (currentLevelSelectPage > totalPages) currentLevelSelectPage = totalPages;
    if (currentLevelSelectPage < 1) currentLevelSelectPage = 1;

    if (totalPages <= 1) {
        // Hide pagination entirely when there's only 1 page
        if (levelSelectPagination) {
            levelSelectPagination.classList.add('hidden');
        }
    } else {
        if (levelSelectPagination) {
            levelSelectPagination.classList.remove('hidden');
        }
        levelSelectPageInfo.textContent = `Page ${currentLevelSelectPage} / ${totalPages}`;
        levelSelectPrevPage.disabled = currentLevelSelectPage <= 1;
        levelSelectNextPage.disabled = currentLevelSelectPage >= totalPages;
    }
}


function handleLevelSelectPageChange(direction) { const totalPages = Math.max(1, Math.ceil(highestLevelReached / LEVELS_PER_PAGE)); const newPage = currentLevelSelectPage + direction; if (newPage >= 1 && newPage <= totalPages) { playSfx('select'); currentLevelSelectPage = newPage; updateLevelSelectScreen(); } else { playSfx('error'); } }

function handleLevelDotClick(e) { const dot = e.currentTarget; if (dot && !dot.classList.contains('locked')) { const lvl = parseInt(dot.dataset.level); if (!isNaN(lvl)) { playSfx('levelSelect'); hideLevelSelect(); initGame(lvl); } else playSfx('error'); } }

function positionLevelDots() { if (!levelSelectMap || !levelSelectDotsLayer) return; levelSelectDotsLayer.querySelectorAll('.level-dot').forEach(dot => { const targetXPercent = parseFloat(dot.dataset.targetX || '50'); const targetYPercent = parseFloat(dot.dataset.targetY || '50'); dot.style.left = `${targetXPercent}%`; dot.style.top = `${targetYPercent}%`; const isHovered = dot === lastHoveredElement; dot.style.transform = `translate(-50%, -50%)${isHovered ? ' scale(1.45)' : ''}`; }); }



function showShop(origin = 'unknown', isBetweenLevelsFlag = false) { hideAllOverlays(); currentShopOrigin = origin; shopIsBetweenLevels = isBetweenLevelsFlag; selectedShopItemId = null; generateArmoryCards(); updateShopDisplay(); shopScreen?.classList.remove('hidden'); shopScreen?.classList.add('visible'); stopTooltipUpdater(); startTooltipUpdater(); selectAndLoadMusic(); updateParUI(); } function hideShop() { shopScreen?.classList.remove('visible'); shopScreen?.classList.add('hidden'); selectedShopItemId = null; startTooltipUpdater(); } function isShopOpen() { return shopScreen?.classList.contains('visible'); }



function showNakedChallengePrompt() {

    const overlay = document.getElementById('naked-challenge-overlay');

    if (overlay) {

        overlay.classList.remove('hidden');

        overlay.classList.add('visible');

    }

}



function generateArmoryCards() {

    // Only generate if not already present

    if (document.querySelector('.armory-unit-card')) return;



    const upgradeHeader = document.getElementById('shop-upgrade-header');

    if (!upgradeHeader || !shopItemsContainer) return;



    const unitsToGenerate = ['knight', 'archer', 'champion', 'rogue', 'wizard'];

    const referenceNode = upgradeHeader.nextSibling;



    unitsToGenerate.forEach(unitType => {

        const unitName = UNIT_DATA[unitType]?.name || unitType;

        const card = document.createElement('div');

        card.className = 'armory-unit-card hidden-tab'; // Start hidden, updateShopDisplay will handle visibility



        // Header

        const header = document.createElement('div');

        header.className = 'armory-card-header';

        header.innerHTML = `<div class="shop-icon-container" style="width: 4em; height: 4em; margin-bottom: 0;"><span class="shop-item-icon icon icon-unit-${unitType}"></span></div> <h4>${unitName}</h4>`;

        card.appendChild(header);



        // Body with Upgrades

        const body = document.createElement('div');

        body.className = 'armory-card-body';



        // HP Upgrade

        const hpItem = document.createElement('div');

        hpItem.className = 'shop-item condensed-upgrade selectable';

        hpItem.dataset.itemId = `upgrade_${unitType}_hp`;

        hpItem.dataset.cost = getUnitUpgradeCostHelper(unitType, 'hp'); // Helper to get initial cost if needed, strictly generic

        hpItem.dataset.type = 'unit_upgrade';

        hpItem.setAttribute('role', 'button');

        hpItem.setAttribute('tabindex', '0');

        hpItem.innerHTML = `<span class="condensed-stat-label">HP</span> <p class="condensed-cost-line">Cost: <span class="condensed-cost shop-item-cost">50</span><span class="icon icon-inline icon-gold"></span></p>`;

        body.appendChild(hpItem);



        // ATK Upgrade

        const atkItem = document.createElement('div');

        atkItem.className = 'shop-item condensed-upgrade selectable';

        atkItem.dataset.itemId = `upgrade_${unitType}_atk`;

        atkItem.dataset.cost = getUnitUpgradeCostHelper(unitType, 'atk');

        atkItem.dataset.type = 'unit_upgrade';

        atkItem.setAttribute('role', 'button');

        atkItem.setAttribute('tabindex', '0');

        atkItem.innerHTML = `<span class="condensed-stat-label">ATK</span> <p class="condensed-cost-line">Cost: <span class="condensed-cost shop-item-cost">50</span><span class="icon icon-inline icon-gold"></span></p>`;

        body.appendChild(atkItem);



        card.appendChild(body);



        // Insert before fixed reference node

        if (referenceNode) {

            shopItemsContainer.insertBefore(card, referenceNode);

        } else {

            shopItemsContainer.appendChild(card);

        }

    });

}



function getUnitUpgradeCostHelper(unit, type) {

    // Simple helper or just rely on updateShopDisplay to fix the cost text. 

    // Defaulting to 50/75/100 based on known values to prevent visual flicker before update

    if (unit === 'knight' || unit === 'archer') return (type === 'atk' && unit === 'archer') ? 80 : 50;

    if (unit === 'rogue') return 75;

    if (unit === 'champion') return 100;

    if (unit === 'wizard') return 400;

    return 50;

}



function switchShopTab(tab) {

    if (!tab) return;



    // Validation: Cannot leave Troops tab if roster is empty

    if (currentShopTab === 'troops' && tab !== 'troops') {

        const rosterCount = Object.values(playerActiveRoster || {}).reduce((s, c) => s + c, 0);

        if (rosterCount === 0) {

            playSfx('error');

            showCustomAlert("You must have at least 1 unit in your roster!", "Empty Roster");

            return;

        }

    }



    if (tab === 'armory') {

        // Check unlock condition: Must BEAT level 60 (so highestLevelReached > 60)

        if (highestLevelReached <= 60) {

            playSfx('error');

            if (typeof showFeedback === 'function') showFeedback("Requires Level 60", "feedback-error");

            return;

        }

        if (!armoryVisited) {

            armoryVisited = true;

            saveGameData();

        }

    }



    if (currentShopTab !== tab) {

        currentShopTab = tab;

        playSfx('select');

        selectedShopItemId = null; // Deselect item when switching tabs

        updateShopDisplay();

    }

}



function handleShopTabClick(event) {

    const tab = event.currentTarget.dataset.tab;

    switchShopTab(tab);

}



// Helper to get consistent title color for Shop Items & Tooltips

// Rarity: White (Lvl 1), Green (Lvl 2), Blue (Lvl 3-4), Purple (Lvl 5+), Orange (legendary)

function getShopItemTitleColor(itemType, itemId, ownedLevel = 0) {

    // Legendary items (Orange) - always orange regardless of level

    if (itemId === 'flame_cloak' || itemId === 'flame_ring') {

        return 'var(--color-orange-highlight)';

    }

    // Magic items (Green) - always green

    if (itemId === 'war_bow') {

        return 'var(--color-green-bright)';

    }

    // Armor & Helmet rarity based on level

    if (itemType === 'armor' || itemType === 'helmet') {

        // Purple for epic (level 5+)

        if (ownedLevel >= 5) return 'var(--color-purple-bright)';

        // Blue for rare (level 3-4)

        if (ownedLevel >= 3) return 'var(--color-blue-bright)';

        // Green for uncommon (level 1-2)

        if (ownedLevel >= 1) return 'var(--color-green-bright)';

        // Default white for common (level 1)

        return '#ffffff';

    }

    // Default fallback (White)

    return '#ffffff';

}



// Helper to generate consistent armor stat descriptions (Shop & Tooltips)

function getArmorStatsDescription(armorId, ownedLevel) {

    const armorData = ARMOR_DATA[armorId];

    if (!armorData) return '';



    let descText = '';



    if (armorId === 'blue') {

        const stat = Math.ceil(ownedLevel / 2);

        const resist = Math.floor(ownedLevel / 2);

        if (stat > 0) descText += `<span style="color:var(--color-gold-light);">+${stat} HP</span>`;

        if (ownedLevel >= 5) descText += (descText ? '<br>' : '') + `<span style="color:var(--color-blue-bright)">Immune to Frost</span>`;

        else if (resist > 0) descText += (descText ? '<br>' : '') + `<span style="color:var(--color-gold-light);">+${resist} Frost Resist</span>`;

    } else if (armorId === 'red') {

        const stat = Math.ceil(ownedLevel / 2);

        const resist = Math.floor(ownedLevel / 2);

        if (stat > 0) descText += `<span style="color:var(--color-gold-light);">+${stat} ATK</span>`;

        if (resist > 0) descText += (descText ? '<br>' : '') + `<span style="color:var(--color-gold-light);">+${resist} Fire Resist</span>`;

    } else if (armorId === 'yellow') {

        const effectiveLevel = Math.max(1, ownedLevel);

        const scaledMov = Math.min(2, effectiveLevel);

        const scaledHp = (effectiveLevel > 2) ? (effectiveLevel - 2) : 0;

        if (scaledHp > 0) descText += `<span style="color:var(--color-gold-light);">+${scaledHp} HP</span>`;

        if (scaledMov > 0) descText += (descText ? '<br>' : '') + `<span style="color:var(--color-gold-light);">+${scaledMov} MOV</span>`;

    } else if (armorId === 'green') {

        // Forest Armor - activation only, no base stats

        const baseValue = armorData.activation?.value || 1;

        const scaledValue = baseValue + Math.max(0, ownedLevel - 1);

        descText = `<span style="color:var(--color-gold-light);">-${scaledValue} ATK from enemies</span> (${armorData.activation?.duration || 1} Turn)`;

    } else if (armorId === 'goblin_mother_skull') {

        // Goblin Mother Skull - use config description with scaled HP

        const regenVal = 1 + Math.max(0, ownedLevel - 1);

        descText = (armorData.description || '').replace('+1 HP', `<span style="color:var(--color-gold-light);">+${regenVal} HP</span>`);

    } else if (armorId === 'none') {

        descText = '<span style="color:var(--color-red-bright);">Max HP: 1</span><br><span style="color:var(--color-gold-light);">+1 MOV</span>';

    } else if (armorId === 'grey') {

        descText = 'Standard issue, no bonuses.';

    } else if (armorId === 'flame_cloak') {

        // Flame Cloak - use description from ARMOR_DATA as single source

        descText = armorData.description || '';

    } else {

        const hpBonus = armorData.hpBonus || 0;

        const atkBonus = armorData.atkBonus || 0;

        const movBonus = armorData.movBonus || 0;

        const scaledHp = hpBonus + (hpBonus > 0 ? Math.max(0, ownedLevel - 1) : 0);

        const scaledAtk = atkBonus + (atkBonus > 0 ? Math.max(0, ownedLevel - 1) : 0);

        const scaledMov = movBonus + (movBonus > 0 ? Math.max(0, ownedLevel - 1) : 0);



        if (scaledHp > 0) descText += `<span style="color:var(--color-gold-light);">+${scaledHp} HP</span>`;

        if (scaledAtk > 0) descText += (descText ? '<br>' : '') + `<span style="color:var(--color-gold-light);">+${scaledAtk} ATK</span>`;

        if (scaledMov > 0) descText += (descText ? '<br>' : '') + `<span style="color:var(--color-gold-light);">+${scaledMov} MOV</span>`;



        // Standard Resistances

        if (ownedLevel >= 2) {

            if (armorData.resistances?.fire >= 1) descText += (descText ? '<br>' : '') + `<span style="color:var(--color-gold-light);">+1 Fire Resist</span>`;

            if (armorData.resistances?.frost >= 1) descText += (descText ? '<br>' : '') + `Frost Immunity`;

        }



        // Fallback to config description if no stats

        if (descText === '' && armorData.description) descText = armorData.description;

    }



    return descText;

}



function updateShopDisplay() {

    if (!shopItemsContainer || !shopActionButton || !shopSelectedItemInfoElement) return;

    updateGoldDisplay();

    shopFeedbackElement.textContent = ''; shopFeedbackElement.className = 'shop-message';

    const totalOwnedUnits = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0);

    const currentEquippedArmor = equippedArmorId || 'none';



    // Hide shop title and add specific mode for Troops tab

    const shopTitle = document.getElementById('shop-title');

    const scrollContainer = document.querySelector('#shop-screen .overlay-scroll-container');

    if (shopTitle) shopTitle.classList.toggle('hidden', currentShopTab === 'troops');

    if (scrollContainer) scrollContainer.classList.toggle('troops-mode-v2', currentShopTab === 'troops');



    const tabMain = document.getElementById('shop-tab-main');

    const tabArmory = document.getElementById('shop-tab-armory');

    const tabTroops = document.getElementById('shop-tab-troops');



    if (tabMain) {

        tabMain.classList.toggle('active', currentShopTab === 'main');

        const icon = tabMain.querySelector('.icon-short');

        if (icon) icon.classList.toggle('active-tab-icon', currentShopTab === 'main');

        tabMain.onclick = handleShopTabClick;

    }



    if (tabArmory) {

        const isArmoryUnlocked = highestLevelReached > 60;

        tabArmory.classList.toggle('active', currentShopTab === 'armory');

        tabArmory.classList.toggle('locked', !isArmoryUnlocked);

        const icon = tabArmory.querySelector('.icon-short');

        if (icon) icon.classList.toggle('active-tab-icon', currentShopTab === 'armory');

        if (isArmoryUnlocked && !armoryVisited) {

            tabArmory.classList.add('gold-glow');

        } else {

            tabArmory.classList.remove('gold-glow');

        }

        tabArmory.onclick = handleShopTabClick;



        if (!isArmoryUnlocked) {

            tabArmory.title = "Requires beating Level 60";

            if (currentShopTab === 'armory') currentShopTab = 'main';

        } else {

            tabArmory.title = "Unit Upgrades";

        }

    }



    if (tabTroops) {

        tabTroops.classList.toggle('active', currentShopTab === 'troops');

        const icon = tabTroops.querySelector('.icon-short');

        if (icon) icon.classList.toggle('active-tab-icon', currentShopTab === 'troops');

        tabTroops.onclick = handleShopTabClick;

    }



    // Mobile Optimization: Hide tooltips on scroll/touch to prevent obstruction

    if (shopItemsContainer) {

        shopItemsContainer.removeEventListener('scroll', hideTooltip);

        shopItemsContainer.removeEventListener('touchmove', hideTooltip);

        shopItemsContainer.addEventListener('scroll', hideTooltip, { passive: true });

        shopItemsContainer.addEventListener('touchmove', hideTooltip, { passive: true });

    }

    if (scrollContainer) {

        scrollContainer.removeEventListener('scroll', hideTooltip);

        scrollContainer.removeEventListener('touchmove', hideTooltip);

        scrollContainer.addEventListener('scroll', hideTooltip, { passive: true });

        scrollContainer.addEventListener('touchmove', hideTooltip, { passive: true });

    }



    // Fix Troops tab background gap

    if (scrollContainer) {

        if (currentShopTab === 'troops') {

            scrollContainer.style.background = 'none';

            scrollContainer.style.padding = '0';

            scrollContainer.style.gap = '0';

        } else {

            scrollContainer.style.background = '';

            scrollContainer.style.padding = '';

            scrollContainer.style.gap = '';

        }

    }



    // Tab Contents

    if (shopItemsContainer) {

        shopItemsContainer.classList.toggle('hidden-tab', currentShopTab === 'troops');

        // If not in troops tab, make sure the items container is visible

        if (currentShopTab !== 'troops') shopItemsContainer.style.display = 'block';

        else shopItemsContainer.style.display = 'none';

    }

    if (shopTroopsTabContent) {

        shopTroopsTabContent.classList.toggle('hidden-tab', currentShopTab !== 'troops');

        if (currentShopTab === 'troops') {

            shopTroopsTabContent.style.display = 'block';

            updateChooseTroopsScreen(); // Populates roster lists

        } else {

            shopTroopsTabContent.style.display = 'none';

        }

    }



    // Hide shop messages and selected info when in troops tab

    const selectedItemInfo = document.getElementById('shop-selected-item-info');

    const shopFeedbackEl = document.getElementById('shop-feedback');

    if (selectedItemInfo) selectedItemInfo.classList.toggle('hidden', currentShopTab === 'troops');

    if (shopFeedbackEl) shopFeedbackEl.classList.toggle('hidden', currentShopTab === 'troops');





    // Headers

    const headerRecruit = document.getElementById('shop-recruit-header');

    const headerUpgrade = document.getElementById('shop-upgrade-header');

    const headerSpecializations = document.getElementById('shop-specializations-header');

    const headerSpell = document.getElementById('shop-spell-header');

    const headerPassive = document.getElementById('shop-passive-header');

    const headerEquipment = document.getElementById('shop-equipment-header');



    // Visibility based on tab

    if (headerRecruit) headerRecruit.classList.toggle('hidden-tab', currentShopTab !== 'main');

    if (headerUpgrade) headerUpgrade.classList.toggle('hidden-tab', currentShopTab !== 'armory');

    if (headerSpecializations) headerSpecializations.classList.toggle('hidden-tab', currentShopTab !== 'armory');

    if (headerSpell) headerSpell.classList.toggle('hidden-tab', currentShopTab !== 'main'); // Spell Upgrades back in Main

    if (headerPassive) headerPassive.classList.toggle('hidden-tab', currentShopTab !== 'main');

    if (headerEquipment) headerEquipment.classList.toggle('hidden-tab', currentShopTab !== 'main');



    // Toggle entire armory cards

    document.querySelectorAll('.armory-unit-card').forEach(card => card.classList.toggle('hidden-tab', currentShopTab !== 'armory'));



    // Toggle container mode for styling

    shopItemsContainer.classList.toggle('armory-mode', currentShopTab === 'armory');



    shopItemsContainer.querySelectorAll('.shop-item').forEach(item => {

        const itemId = item.dataset.itemId;

        const itemType = item.dataset.type;

        const unitType = item.dataset.unitType;

        const spellName = item.dataset.spellName;

        const armorId = item.dataset.armorId;

        let costSpan = item.querySelector('.shop-item-cost'); // Changed to let for re-querying

        const costLine = item.querySelector('.shop-cost-line'); // Select the cost line container

        const titleElement = item.querySelector('h4');

        const countSpan = item.querySelector('.unit-count');

        const spellLevelSpan = item.querySelector('.spell-level');

        const armorLevelSpan = item.querySelector('.armor-level');

        const passiveLevelSpan = item.querySelector('.passive-level');

        const descriptionP = item.querySelector('.shop-item-description');

        const resistanceP = item.querySelector('.shop-item-resistance');

        const iconContainer = item.querySelector('.shop-icon-container');

        const iconImg = iconContainer?.querySelector('.shop-item-icon');

        const iconSpan = iconContainer?.querySelector('.icon.icon-shop');



        // Tab Filtering

        let isVisible = false;

        if (currentShopTab === 'main') {

            if (itemType === 'recruit' || itemType === 'passive' || itemType === 'passive_purchase' || itemType === 'armor' || itemType === 'equipment' || itemType === 'spell_upgrade' || itemType === 'cloak' || itemType === 'ring' || itemType === 'helmet') {

                isVisible = true;



                // Hidden Item Checks (Loot Only) - Check for falsy values (0, undefined, false)

                if (itemType === 'equipment' && itemId === 'war_bow' && !playerAbilityUpgrades.war_bow) isVisible = false;

                if (itemType === 'cloak' && itemId === 'flame_cloak' && !playerOwnedArmor.flame_cloak) isVisible = false; // Check ownedArmor for cloak

                if (itemType === 'ring' && itemId === 'flame_ring' && !playerAbilityUpgrades.flame_ring) isVisible = false;
                if (itemType === 'equipment' && itemId === 'glacier_bow' && !playerAbilityUpgrades.glacier_bow) isVisible = false;

            }

        } else if (currentShopTab === 'armory') {

            if (itemType === 'unit_upgrade' || itemType === 'ability_upgrade') isVisible = true;

        }



        item.classList.toggle('hidden-tab', !isVisible);

        if (!isVisible) return; // Skip processing hidden items



        let cost = parseInt(item.dataset.cost) || 0;

        let requiredLevel = parseInt(item.dataset.requiredLevel) || 0;

        let canBuy = false; let canEquip = false; let isLocked = false; let isMaxed = false;

        let requiredUnits = parseInt(item.dataset.requiredUnits) || 0; let currentLevel = 0;



        item.removeEventListener('click', handleShopItemClick);

        item.removeEventListener('mouseenter', handleShopItemMouseEnter);

        item.removeEventListener('mouseleave', handleShopItemMouseLeave);

        if (item.classList.contains('selectable')) {

            item.addEventListener('click', handleShopItemClick);

            item.addEventListener('mouseenter', handleShopItemMouseEnter);

            item.addEventListener('mouseleave', handleShopItemMouseLeave);

        }



        if (itemType === 'recruit') {

            cost = getRecruitCost(unitType); if (costSpan) costSpan.textContent = cost; item.dataset.currentCost = cost;

            const currentOwnedCount = playerOwnedUnits[unitType] || 0; const maxCount = parseInt(item.dataset.max) || MAX_OWNED_PER_TYPE;

            if (countSpan) countSpan.textContent = currentOwnedCount; isMaxed = currentOwnedCount >= maxCount;



            // Level Requirements for Recruit
            let isRescued = true;
            let isLevelRestricted = false;

            if (unitType === 'champion' && !unlockedUnits.champion) isRescued = false;
            if (unitType === 'rogue' && !unlockedUnits.rogue) isRescued = false;
            if (unitType === 'archer' && !unlockedUnits.archer) isRescued = false;
            if (unitType === 'wizard' && !unlockedUnits.wizard) isRescued = false;

            // Extra Logic for 2nd Unit restrictions
            if (isRescued) {
                const currentOwnedCount = playerOwnedUnits[unitType] || 0;
                if (currentOwnedCount >= 1) {
                    if (unitType === 'archer' && highestLevelReached <= (ARCHER_RESCUE_LEVEL + 10)) isLevelRestricted = true;
                    if (unitType === 'champion' && highestLevelReached <= (CHAMPION_RESCUE_LEVEL + 10)) isLevelRestricted = true;
                    if (unitType === 'rogue' && highestLevelReached <= (ROGUE_RESCUE_LEVEL + 10)) isLevelRestricted = true;
                }
            }

            isLocked = !isRescued;
            item.classList.toggle('locked', isLocked);

            // Still show visual indication for restricted but NOT silhouetted
            item.classList.toggle('restricted', isLevelRestricted);

            canBuy = playerGold >= cost && !isMaxed && isRescued && !isLevelRestricted;

            // Hide cost ONLY for unrescued units
            if (costLine) costLine.style.display = isLocked ? 'none' : '';

            if (titleElement && UNIT_DATA[unitType]) {
                const unitName = UNIT_DATA[unitType].name;
                titleElement.innerHTML = `<span class="shop-icon-container"><span class="shop-item-icon icon icon-unit-${unitType}"></span></span> ${unitName} <span style="white-space: nowrap;">${currentOwnedCount}/${maxCount}</span>`;
            }

        } else if (itemType === 'unit_upgrade') {

            const lookupId = itemId.startsWith('upgrade_') ? itemId.replace('upgrade_', '') : itemId;

            cost = getUnitUpgradeCost(lookupId); if (costSpan) costSpan.textContent = cost; item.dataset.currentCost = cost;



            // Get current upgrade level

            const currentUpgradeLevel = playerUnitUpgrades[lookupId] || 0;



            // Requirement: Unit must be unlocked first

            const unitForUpgrade = lookupId.split('_')[0];

            const unitOwned = (playerOwnedUnits[unitForUpgrade] || 0) > 0;



            // Level Requirements

            let requiredLevel = 16; // Base requirement for upgrades

            if (unitForUpgrade === 'champion') requiredLevel = 24;

            if (unitForUpgrade === 'rogue') requiredLevel = 40;

            if (unitForUpgrade === 'wizard') requiredLevel = WIZARD_UNLOCK_LEVEL;

            // Archer upgrades stay at 16 (base) even if unit is 10.



            isLocked = !unitOwned || highestLevelReached < requiredLevel;

            canBuy = playerGold >= cost && !isLocked;



            // Update title to show current level

            if (titleElement) {

                const statType = lookupId.split('_')[1]; // 'hp' or 'atk'

                const statName = statType === 'hp' ? 'HP' : 'ATK';

                const unitName = UNIT_DATA[unitForUpgrade]?.name || unitForUpgrade;

                titleElement.innerHTML = `<span class="shop-icon-container"><span class="shop-item-icon icon icon-unit-${unitForUpgrade}"></span></span> ${unitName} ${statName} +1 <span style="opacity: 0.7;">Lvl ${currentUpgradeLevel + 1}</span>`;

            } else if (item.classList.contains('condensed-upgrade')) {

                // Condensed card update

                const statType = lookupId.split('_')[1]; // hp or atk

                const label = item.querySelector('.condensed-stat-label');



                if (label && UNIT_DATA[unitForUpgrade]) {

                    const baseStat = statType === 'hp' ? UNIT_DATA[unitForUpgrade].baseHp : UNIT_DATA[unitForUpgrade].baseAtk;

                    // Current total = Base + Upgrades bought

                    const currentTotal = baseStat + currentUpgradeLevel;

                    // Request says: "HP: 6 on the left... and when each is upgraded, that number will update." 

                    // This implies showing the CURRENT total value.



                    const statLabel = statType === 'hp' ? 'HP' : 'ATK';

                    label.textContent = `${statLabel}: ${currentTotal}`;



                    const costSpan = item.querySelector('.condensed-cost');

                    if (costSpan) {

                        // Affordability Check

                        if (!canBuy) {

                            costSpan.style.color = 'var(--color-error)';

                        } else {

                            costSpan.style.color = 'var(--color-gold)';

                        }

                    }



                    // Ensure Gold Icon exists (Robust check)

                    const costLine = item.querySelector('.condensed-cost-line');

                    if (costLine) {

                        let iconSpan = costLine.querySelector('.icon-gold');

                        if (!iconSpan) {

                            iconSpan = document.createElement('span');

                            iconSpan.className = 'icon icon-inline icon-gold';

                            costLine.appendChild(iconSpan);

                        } else {

                            // Ensure class is correct if it exists

                            iconSpan.className = 'icon icon-inline icon-gold';

                            iconSpan.style.cssText = 'display: inline-block !important;'; // Force visibility

                        }

                    }

                }

            }

            // Icon handling moved to header for condensed views, so we only update if iconSpan exists (legacy)

            if (iconSpan) { if (UNIT_DATA[unitForUpgrade]) iconSpan.className = `shop-item-icon icon icon-unit-${unitForUpgrade}`; }

        } else if (itemType === 'ability_upgrade') {

            const lookupId = itemId.startsWith('upgrade_') ? itemId.replace('upgrade_', '') : itemId;

            cost = ABILITY_UPGRADE_COSTS[lookupId] || 99999; if (costSpan) costSpan.textContent = cost; item.dataset.currentCost = cost; isMaxed = (playerAbilityUpgrades[lookupId] || 0) >= 1;



            // Requirement: Unit must be unlocked first (only for unit-specific abilities)

            const unitForAbility = lookupId.split('_')[0];

            const isUnitSpecific = UNIT_DATA.hasOwnProperty(unitForAbility); // Check if first part is a unit type

            const unitOwned = isUnitSpecific ? ((playerOwnedUnits[unitForAbility] || 0) > 0) : true;



            // Level Requirements (Same as unit, if unit-specific)

            let requiredLevel = 0;

            if (unitForAbility === 'champion') requiredLevel = 24;

            if (unitForAbility === 'rogue') requiredLevel = 40;

            if (unitForAbility === 'wizard') requiredLevel = WIZARD_UNLOCK_LEVEL;



            isLocked = !unitOwned || highestLevelReached <= requiredLevel;

            canBuy = playerGold >= cost && !isMaxed && !isLocked;





            // Use iconSpan (icon-shop) or iconImg (shop-item-icon) - whichever was found

            const targetIcon = iconSpan || iconImg;

            if (titleElement && targetIcon) {

                if (lookupId === 'rogue_quickstrike') {

                    targetIcon.className = `shop-item-icon icon icon-ability-quickStrike`;

                } else if (lookupId === 'wizard_polymorph') {

                    targetIcon.className = `shop-item-icon icon icon-spell-polymorph`;

                } else if (UNIT_DATA[unitForAbility]) {

                    targetIcon.className = `shop-item-icon icon icon-unit-${unitForAbility}`;

                }

            }

        } else if (itemType === 'spell_upgrade') {

            const config = SPELL_UPGRADE_CONFIG[spellName];

            if (config) {

                currentLevel = playerSpellUpgrades[spellName] || 0;

                cost = calculateSpellCost(spellName);

                isMaxed = currentLevel >= config.maxLevel;

                requiredLevel = config.requiredLevel;



                // Check if upgrade is locked due to level requirement

                const levelRequirementMet = highestLevelReached > requiredLevel;

                isLocked = !spellsUnlocked[spellName] || (!isMaxed && !levelRequirementMet);



                canBuy = playerGold >= cost && !isLocked && !isMaxed;



                item.dataset.currentCost = (cost === Infinity ? '99999' : cost);

                if (costSpan) costSpan.textContent = isMaxed ? 'MAX' : (cost === Infinity ? 'MAX' : cost);

                if (spellLevelSpan) spellLevelSpan.textContent = currentLevel + 2;



                // Update Header Format (3 lines: Name / Lvl (Gold) / Cost)

                if (titleElement) {

                    // Reconstruct standard icon

                    let iconHTML = '';

                    const iconContainer = item.querySelector('.shop-icon-container');

                    if (iconContainer) iconHTML = iconContainer.outerHTML;



                    // Format: [Icon] Name \n Lvl X (Gold)

                    const spellConfig = SPELL_UPGRADE_CONFIG[spellName];

                    const displayName = spellConfig ? spellConfig.name : spellName;



                    titleElement.innerHTML = `${iconHTML} ${displayName}<br><span style="color: var(--color-gold-light) !important; font-size: 0.9em; font-weight: bold;">Lvl ${currentLevel + 1}</span>`;

                }

                if (!levelRequirementMet && !isMaxed && spellsUnlocked[spellName]) {

                    // Requirement info moved to tooltip to keep card clean

                } else {

                    // Requirement met or maxed, ensure description doesn't have stale requirement text

                    // (Unless the original description was meant to stay, but usually it's swapped back by updateShopDisplay)

                }



                if (costLine) {

                    const reqSpan = costLine.querySelector('.requirement-text');

                    if (reqSpan) reqSpan.remove();

                }

            }

            else { isLocked = true; canBuy = false; }

        } else if (itemType === 'passive_purchase') {

            const pId = itemId.startsWith('passive_') ? itemId.substring(8) : itemId;

            cost = PASSIVE_UPGRADE_COSTS[pId] || 0;

            const currentLevel = playerPassiveUpgrades[pId] || 0;



            if (pId === 'tactical_command') {

                const currentBonusSlots = currentLevel;

                const currentRosterSize = MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots;

                const requiredLevel = 15 * (currentBonusSlots + 1);

                isLocked = highestLevelReached <= requiredLevel;

                isMaxed = currentRosterSize >= MAX_ACTIVE_ROSTER_SIZE_MAX;

                if (titleElement) {
                    const iconCont = titleElement.querySelector('.shop-icon-container');
                    if (iconCont) {
                        const iconSpan = iconCont.querySelector('.icon');
                        if (iconSpan) iconSpan.className = 'icon icon-shop icon-skill-tacticalcommand';
                        // Update text nodes
                        titleElement.childNodes.forEach(node => {
                            if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Tactical Command')) {
                                node.textContent = ' Tactical Command ';
                            }
                        });
                        // Update or add roster span
                        let rosterSpan = titleElement.querySelector('.roster-span');
                        if (!rosterSpan) {
                            rosterSpan = document.createElement('span');
                            rosterSpan.className = 'roster-span';
                            rosterSpan.style.color = 'var(--color-gold-light)';
                            rosterSpan.style.fontWeight = 'bold';
                            titleElement.appendChild(rosterSpan);
                        }
                        rosterSpan.textContent = `${currentRosterSize}/${MAX_ACTIVE_ROSTER_SIZE_MAX}`;
                    } else {
                        titleElement.innerHTML = `<span class="shop-icon-container"><span class="icon icon-shop icon-skill-tacticalcommand" aria-hidden="true"></span></span> Tactical Command <span class="roster-span" style="color: var(--color-gold-light); font-weight: bold;">${currentRosterSize}/${MAX_ACTIVE_ROSTER_SIZE_MAX}</span>`;
                    }
                }
            } else {
                const passiveLevel = playerPassiveUpgrades[pId] || 0;

                if (titleElement) {
                    const passiveData = PASSIVE_DATA[pId];
                    if (passiveData) {
                        const iconClass = passiveData.iconClass || 'icon-skill-vampiricaura';
                        const showLevel = passiveLevel > 0 && pId !== 'loot_hoarder';

                        const iconCont = titleElement.querySelector('.shop-icon-container');
                        if (iconCont) {
                            const iconSpan = iconCont.querySelector('.icon');
                            if (iconSpan) {
                                iconSpan.className = `icon icon-shop ${iconClass}`;
                                // FORCE skills.png via inline styles — CSS cascade is unreliable
                                const posMap = {
                                    'icon-skill-tacticalcommand': '25% 50%',
                                    'icon-skill-loothoarder': '50% 50%',
                                    'icon-skill-evasion': '75% 50%',
                                    'icon-skill-thorns': '100% 50%',
                                    'icon-skill-vampiricaura': '0% 100%'
                                };
                                const pos = posMap[iconClass];
                                if (pos) {
                                    iconSpan.style.setProperty('background-image', "url('./sprites/skills.png')", 'important');
                                    iconSpan.style.setProperty('background-size', '500% 300%', 'important');
                                    iconSpan.style.setProperty('background-position', pos, 'important');
                                    iconSpan.style.setProperty('background-repeat', 'no-repeat', 'important');
                                }
                            }
                            // Update text and level
                            let foundName = false;
                            titleElement.childNodes.forEach(node => {
                                if (node.nodeType === Node.TEXT_NODE && !foundName && node.textContent.trim().length > 1) {
                                    node.textContent = ' ' + passiveData.name;
                                    foundName = true;
                                }
                            });
                            // Handle level span
                            let lvlSpan = titleElement.querySelector('.passive-rank-span');
                            if (showLevel) {
                                if (!lvlSpan) {
                                    lvlSpan = document.createElement('span');
                                    lvlSpan.className = 'passive-rank-span';
                                    lvlSpan.style.color = 'var(--color-gold-light)';
                                    lvlSpan.style.fontWeight = 'bold';
                                    titleElement.appendChild(lvlSpan);
                                }
                                lvlSpan.textContent = ` Lvl ${passiveLevel}`;
                            } else if (lvlSpan) {
                                lvlSpan.remove();
                            }
                        } else {
                            const levelText = showLevel ? ` <span class="passive-rank-span" style="color: var(--color-gold-light); font-weight: bold;">Lvl ${passiveLevel}</span>` : '';
                            const posMap = {
                                'icon-skill-tacticalcommand': '25% 50%',
                                'icon-skill-loothoarder': '50% 50%',
                                'icon-skill-evasion': '75% 50%',
                                'icon-skill-thorns': '100% 50%',
                                'icon-skill-vampiricaura': '0% 100%'
                            };
                            const pos = posMap[iconClass] || '0% 0%';
                            const inlineStyle = `background-image: url('./sprites/skills.png') !important; background-size: 500% 300% !important; background-position: ${pos} !important; background-repeat: no-repeat !important;`;
                            titleElement.innerHTML = `<span class="shop-icon-container"><span class="icon icon-shop ${iconClass}" aria-hidden="true" style="${inlineStyle}"></span></span> ${passiveData.name}${levelText}`;
                        }
                    }
                }

                const rankConfig = (typeof PASSIVE_UPGRADE_CONFIG !== 'undefined') ? PASSIVE_UPGRADE_CONFIG[pId] : null;

                if (rankConfig) {
                    const config = rankConfig;
                    const nextLevel = passiveLevel + 1;
                    isMaxed = nextLevel > config.maxLevel;

                    const reqLvl = config.baseLevel + (passiveLevel * config.levelStep);
                    isLocked = highestLevelReached < reqLvl;
                } else if (pId === 'thorns' || pId === 'vampiric_aura' || pId === 'evasion' || pId === 'loot_hoarder') {
                    const reqLvl = parseInt(item.dataset.requiredLevel) || (pId === 'thorns' ? 35 : (pId === 'vampiric_aura' ? 50 : (pId === 'evasion' ? 25 : 1)));
                    isLocked = highestLevelReached < reqLvl;
                    isMaxed = passiveLevel >= 1;
                }
            }

            if (isLocked) {
                const reqLvl = parseInt(item.dataset.requiredLevel) || (pId === 'thorns' ? 35 : (pId === 'vampiric_aura' ? 50 : (pId === 'evasion' ? 25 : (pId === 'tactical_command' ? (15 * (currentLevel + 1)) : 1))));
                item.dataset.restrictionNote = `Requires Level ${reqLvl}`;
            } else {
                item.dataset.restrictionNote = "";
            }

            canBuy = playerGold >= cost && !isLocked && !isMaxed;
            item.dataset.currentCost = cost;
            if (costSpan && pId !== 'gold_magnet') costSpan.textContent = cost;

        } else if (itemType === 'passive' && itemId === 'passive_gold_magnet') {

            const magnetLevel = playerPassiveUpgrades.gold_magnet || 0;

            const passiveLevelSpan = item.querySelector('.passive-level'); // Fixed: Select the span



            const lootedFirst = magnetLevel > 0;

            if (!lootedFirst) {

                item.style.setProperty('display', 'none', 'important');

            } else {

                item.style.display = '';

            }

            isLocked = magnetLevel === 0;

            isMaxed = true;

            if (isLocked) {

                // Not looted yet

                if (costSpan) costSpan.textContent = 'Drop Only';

            } else {

                // Looted/Active

                if (costSpan) costSpan.innerHTML = `<span style="color: var(--color-green-bright); font-weight: bold;">Active</span>`;

            }

            if (passiveLevelSpan) passiveLevelSpan.textContent = `Lvl ${magnetLevel}`; // Update level text matches looted level

            item.classList.remove('selectable');

            item.style.cursor = 'default';

            if (isLocked) item.classList.add('locked');

            else item.classList.remove('locked');

        } else if (itemType === 'armor') {

            const ownedLevel = playerOwnedArmor[armorId] || 0; isLocked = ownedLevel === 0 && armorId !== 'none' && armorId !== 'grey'; canEquip = (ownedLevel > 0 || armorId === 'none' || armorId === 'grey') && equippedArmorId !== armorId; canBuy = false;

            if (iconImg && armorId && ARMOR_DATA[armorId]) {

                const data = ARMOR_DATA[armorId];

                iconImg.src = data.iconPath || './sprites/armor.png';

                iconImg.className = `shop-item-icon icon-armor icon-armor-${armorId}`;

                if (data.iconPosition) {

                    iconImg.style.backgroundImage = `url('${data.iconPath}')`;

                    iconImg.style.backgroundPosition = `-${data.iconPosition.col * 100}% -${data.iconPosition.row * 100}%`;

                    iconImg.style.backgroundSize = '400% 400%'; // Assuming 4x4 grid as per other sprites, need to verify

                    // Actually, items.png is 10x10 usually? Let's check calculation.

                    // Standard icon size calculation in this codebase seems to rely on classes.

                    // Let's defer to getSpritePositionStyles or similar if available, or assume standard 32x32 logic.

                    // Re-checking getSpritePositionStyles in ui.js line 680 to see how it handles things or if I should implement similar here.

                    // For now, I will use a safe calculation assuming 10 cols/rows if not specified, 

                    // BUT verifying Config first would be better. 

                    // However, for this specific fix, I'll stick to a generic approach or check how unit portraits are done.

                    // Unit portraits use: backgroundSize = "500% 300%"; el.style.backgroundRepeat = "no-repeat" (5 cols, 2 rows).

                    // items.png dimensions?

                    // Let's assume standard grid (e.g. 10x10) or calculate based on percentage.

                    // If col=2, pos = -200%.

                    // Let's look at getSpritePositionStyles function first before applying this blindly.

                }

            }

            item.classList.toggle('hidden', isLocked); item.classList.toggle('active-armor', equippedArmorId === armorId);

            if (armorLevelSpan && ownedLevel > 0 && armorId !== 'grey' && armorId !== 'none') { armorLevelSpan.textContent = `Lvl ${ownedLevel}`; armorLevelSpan.classList.remove('hidden'); } else if (armorLevelSpan) { armorLevelSpan.classList.add('hidden'); }

            const armorData = ARMOR_DATA[armorId];



            // Color Code Armor Name

            if (titleElement) {

                titleElement.classList.remove('armor-green', 'armor-blue', 'armor-purple', 'item-uncommon', 'item-rare', 'item-epic');

                if (armorId !== 'grey' && armorId !== 'none') {

                    if (ownedLevel >= 5) {

                        titleElement.classList.add('armor-purple');

                        titleElement.style.setProperty('color', 'var(--color-purple-bright)', 'important');

                    } else if (ownedLevel >= 3) {

                        titleElement.classList.add('armor-blue');

                        titleElement.style.setProperty('color', 'var(--color-blue-bright)', 'important');

                    } else {

                        titleElement.classList.add('armor-green');

                        titleElement.style.setProperty('color', 'var(--color-green-bright)', 'important');

                    }

                } else {

                    titleElement.style.color = ''; // Reset for grey/none

                }

            }

            if (descriptionP && armorData) {

                // Calculate scaled stats based on armor level

                // Show scaled stat bonuses using helper

                const descText = getArmorStatsDescription(armorId, ownedLevel);

                if (descriptionP) descriptionP.innerHTML = descText;

            }

            if (resistanceP) {

                // Resistance is now handled in the main description (descText).

                // Hide the separate resistance paragraph to avoid duplication.

                resistanceP.innerHTML = '';

                resistanceP.classList.add('hidden');

            }

        } else if (itemType === 'equipment' && itemId === 'war_bow') {

            // War Bow - show if unlocked, allow equip/unequip

            if (playerAbilityUpgrades.war_bow !== undefined) {

                item.classList.remove('hidden');

                // Add active-equipment class when equipped (war_bow > 0)

                item.classList.toggle('active-equipment', equippedWarBow);

                canBuy = false;

                // Apply gold color to War Bow description

                if (descriptionP && ITEM_DATA.war_bow) descriptionP.innerHTML = formatDescription(ITEM_DATA.war_bow.description);

            } else {

                item.classList.add('hidden');

            }

        } else if (itemType === 'equipment' && itemId === 'glacier_bow') {

            // Glacier Bow - show if unlocked, allow equip/unequip
            if (playerAbilityUpgrades.glacier_bow) {
                item.classList.remove('hidden');

                // Add active-equipment class when equipped
                item.classList.toggle('active-equipment', equippedGlacierBow);
                canBuy = false;

                // Apply legendary color to Glacier Bow title if not already set
                if (titleElement) {
                    titleElement.classList.remove('item-uncommon', 'item-rare', 'item-epic');
                    titleElement.classList.add('item-legendary');
                }

                if (descriptionP && ITEM_DATA.glacier_bow) descriptionP.innerHTML = formatDescription(ITEM_DATA.glacier_bow.description);
            } else {
                item.classList.add('hidden');
            }

        } else if (itemType === 'cloak' && itemId === 'flame_cloak') {

            // Flame Cloak - show if owned, allow equip/unequip

            if (playerOwnedArmor.flame_cloak) {

                item.classList.remove('hidden');

                item.classList.toggle('active-armor', equippedFlameCloak);

                canBuy = false;

                if (titleElement) {
                    titleElement.classList.remove('item-uncommon', 'item-rare', 'item-epic');
                    titleElement.classList.add('item-legendary');
                    titleElement.style.color = 'var(--color-legendary)';
                }

                if (descriptionP && ARMOR_DATA.flame_cloak) descriptionP.innerHTML = formatDescription(ARMOR_DATA.flame_cloak.description);

            } else {

                item.classList.add('hidden');

            }

        } else if (itemType === 'ring' && itemId === 'flame_ring') {

            // Flame Ring - show if owned (check current undefined status to distinguish from 0)

            if (playerAbilityUpgrades.flame_ring !== undefined) {

                item.classList.remove('hidden');



                // Add active-equipment class for Flame Ring

                item.classList.toggle('active-equipment', equippedFlameRing);

                canBuy = false;

                if (titleElement) {
                    titleElement.classList.remove('item-uncommon', 'item-rare', 'item-epic');
                    titleElement.classList.add('item-legendary');
                    titleElement.style.color = 'var(--color-legendary)';
                }

                if (descriptionP && ITEM_DATA.flame_ring) descriptionP.innerHTML = formatDescription(ITEM_DATA.flame_ring.description);

            } else {

                item.classList.add('hidden');

            }

        } else if (itemType === 'helmet') {  // Generic Helmet Logic

            const armorId = item.dataset.armorId;

            const owned = playerOwnedArmor[armorId] || 0;



            if (owned > 0) {

                item.classList.remove('hidden');

                item.classList.toggle('active-armor', equippedHelmetId === armorId);

                // Helmet Title Coloring (Always Green for this item as requested, or based on level if upgradable later)

                // User said: "name should be Green"

                if (titleElement) {

                    titleElement.classList.remove('armor-green', 'armor-blue', 'armor-purple', 'item-uncommon', 'item-rare', 'item-epic');

                    if (owned >= 5) {

                        titleElement.classList.add('armor-purple');

                        titleElement.style.setProperty('color', 'var(--color-purple-bright)', 'important');

                    } else if (owned >= 3) {

                        titleElement.classList.add('armor-blue');

                        titleElement.style.setProperty('color', 'var(--color-blue-bright)', 'important');

                    } else {

                        titleElement.classList.add('armor-green');

                        titleElement.style.setProperty('color', 'var(--color-green-bright)', 'important');

                    }

                }

                // Ensure Level Text is hidden for this unique item

                // Ensure Level Text is visible and updated

                const lvlSpan = item.querySelector('.armor-level');

                if (lvlSpan) {

                    lvlSpan.textContent = `Lvl ${owned}`;

                    lvlSpan.classList.remove('hidden');

                }



                // Icon Sprite Fix for Custom Spritesheets (Helmet)

                // This logic mirrors renderItem to ensure proper display in shop

                if (iconImg && ARMOR_DATA[armorId]) {

                    const data = ARMOR_DATA[armorId];

                    if (data && data.iconPath && data.iconPath.includes('items.png')) {

                        iconImg.style.backgroundImage = `url('${data.iconPath}')`;

                        const itemsConfig = SPRITESHEET_CONFIG.items;

                        iconImg.style.backgroundSize = `${itemsConfig.columns * 100}% ${itemsConfig.rows * 100}%`;

                        const xPercent = itemsConfig.columns > 1 ? (data.iconPosition.col / (itemsConfig.columns - 1)) * 100 : 0;

                        const yPercent = itemsConfig.rows > 1 ? (data.iconPosition.row / (itemsConfig.rows - 1)) * 100 : 0;

                        iconImg.style.backgroundPosition = `${xPercent}% ${yPercent}%`;

                        iconImg.className = 'shop-item-icon'; // Clear armor class

                    }

                }

                // Update Description with scaled HP regen

                if (descriptionP) {

                    descriptionP.innerHTML = getArmorStatsDescription(armorId, owned);

                }

            } else {

                item.classList.add('hidden');

            }

        }



        if (item.classList.contains('selectable')) {

            const shouldLock = isLocked && itemType !== 'armor' && itemType !== 'helmet';

            item.classList.toggle('locked', shouldLock);

            // Silhouette ONLY for unit items (Recruit Units section)

            const shouldShowSilhouette = isLocked && itemType === 'recruit';

            item.classList.toggle('shop-item-locked', shouldShowSilhouette);

            item.classList.toggle('maxed', isMaxed);

            item.classList.toggle('selected', selectedShopItemId === itemId);

        }



        // Update Cost Display for Maxed Items

        if (costLine && itemType !== 'passive') { // Exclude passive (Gold Magnet) which uses "Drop Only"

            if (isMaxed) {

                if (itemType === 'ability_upgrade' || itemType === 'passive_purchase') {

                    costLine.innerHTML = `<span style="color: var(--color-green-bright); font-weight: bold;">Active</span>`;

                } else {

                    costLine.innerHTML = `<span style="color: var(--color-text-muted); font-weight: bold;">Maxed</span>`;

                }

            } else {

                // Restore original cost display if not maxed (e.g. if logic changes or for robustness)

                // We check if it's currently showing "Maxed" or "Purchased" to avoid unnecessary DOM updates

                if (!costLine.querySelector('.shop-item-cost')) {

                    costLine.innerHTML = `Cost: <span class="shop-item-cost">${cost}</span><span class="icon icon-inline icon-gold" aria-label="Gold"></span>`;

                    // Re-assign costSpan so subsequent logic (if any) can find it, though we are at end of loop

                    costSpan = costLine.querySelector('.shop-item-cost');

                }

            }



            // Update Cost Color based on Gold

            if (costSpan && !isMaxed) {

                if (playerGold < cost) {

                    costSpan.style.color = 'var(--color-error)';

                } else {

                    costSpan.style.color = '';

                }

            }

        }

    });

    updateShopActionInfo();

}



function handleShopItemClick(event) { const itemElement = event.currentTarget; const itemId = itemElement.dataset.itemId; const itemType = itemElement.dataset.type; const isCurrentlySelected = itemElement.classList.contains('selected'); if (!itemElement.classList.contains('selectable')) { playSfx('error'); return; } if (itemType !== 'armor' && (itemElement.classList.contains('locked') || itemElement.classList.contains('maxed'))) { playSfx('error'); if (selectedShopItemId === itemId) { selectedShopItemId = null; itemElement.classList.remove('selected'); updateShopActionInfo(); } return; } playSfx('select'); if (isCurrentlySelected) { selectedShopItemId = null; itemElement.classList.remove('selected'); } else { if (selectedShopItemId) { const previousItem = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); previousItem?.classList.remove('selected'); } selectedShopItemId = itemId; itemElement.classList.add('selected'); } updateShopActionInfo(); }

function updateShopActionInfo() {

    if (!shopActionButton || !shopSelectedItemInfoElement) return; const selectedItem = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); if (!selectedItem || selectedShopItemId === null) { shopSelectedItemInfoElement.textContent = ""; shopActionButton.classList.add('hidden'); selectedShopItemId = null; return; } const itemId = selectedItem.dataset.itemId; const itemType = selectedItem.dataset.type; const itemNameElement = selectedItem.querySelector('h4'); const itemName = itemNameElement ? itemNameElement.textContent.split('(')[0].split('[')[0].trim() : "Item"; let cost = parseInt(selectedItem.dataset.currentCost) || 0; let actionText = "Buy"; let action = "buy"; let canAfford = playerGold >= cost; let isMaxed = selectedItem.classList.contains('maxed'); let isLocked = selectedItem.classList.contains('locked') && itemType !== 'armor'; let isEquipped = false; let canPerformAction = false; if (itemType === 'recruit') { actionText = "Recruit"; action = "recruit"; canPerformAction = canAfford && !isMaxed; } else if (itemType === 'unit_upgrade') { cost = getUnitUpgradeCost(itemId); actionText = "Upgrade"; action = "upgrade"; canPerformAction = canAfford; } else if (itemType === 'ability_upgrade') { cost = ABILITY_UPGRADE_COSTS[itemId] || 99999; isMaxed = (playerAbilityUpgrades[itemId] || 0) >= 1; actionText = "Purchase"; action = "buy_ability"; canPerformAction = canAfford && !isMaxed; } else if (itemType === 'spell_upgrade') { const spellName = selectedItem.dataset.spellName; cost = calculateSpellCost(spellName); currentLevel = playerSpellUpgrades[spellName] || 0; const config = SPELL_UPGRADE_CONFIG[spellName]; isMaxed = currentLevel >= config.maxLevel; requiredLevel = parseInt(selectedItem.dataset.requiredLevel) || 0; isLocked = !spellsUnlocked[spellName]; const meetsLevelReq = highestLevelReached > requiredLevel; actionText = "Upgrade"; action = "upgrade_spell"; canPerformAction = canAfford && !isLocked && !isMaxed && meetsLevelReq; } else if (itemType === 'passive_purchase') {

        cost = PASSIVE_UPGRADE_COSTS[itemId] || 0;
        const currentLevel = playerPassiveUpgrades[itemId] || 0;

        actionText = currentLevel > 0 ? "Upgrade" : "Buy";

        if (itemId === 'tactical_command') {

            const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0;

            const requiredUnits = parseInt(selectedItem.dataset.requiredUnits) || 0;

            const meetsUnitReq = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0) >= requiredUnits;

            isLocked = !meetsUnitReq;

            isMaxed = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) >= MAX_ACTIVE_ROSTER_SIZE_MAX;

        } else if (typeof PASSIVE_UPGRADE_CONFIG !== 'undefined' && PASSIVE_UPGRADE_CONFIG[itemId]) {
            const config = PASSIVE_UPGRADE_CONFIG[itemId];
            const nextLevel = currentLevel + 1;
            isMaxed = nextLevel > config.maxLevel;

            const reqLvl = config.baseLevel + (currentLevel * config.levelStep);
            isLocked = highestLevelReached < reqLvl;
        } else if (itemId === 'thorns') {
            const reqLvl = parseInt(selectedItem.dataset.requiredLevel) || 35;
            isLocked = highestLevelReached < reqLvl;
            isMaxed = currentLevel >= 1;
        } else {
            // General passive
            isLocked = false;
            isMaxed = currentLevel >= 1;
        }



        actionText = "Buy";

        action = "buy_passive";

        canPerformAction = canAfford && !isLocked && !isMaxed;

    } else if (itemType === 'armor') {

        const armorId = selectedItem.dataset.armorId; const ownedLevel = playerOwnedArmor[armorId] || 0; isEquipped = equippedArmorId === armorId; if (isEquipped) { actionText = "Equipped"; action = "equipped"; canPerformAction = false; } else if (ownedLevel > 0 || armorId === 'none' || armorId === 'grey') { actionText = "Equip"; action = "equip"; canPerformAction = true; } else { actionText = "Locked"; action = "locked"; canPerformAction = false; }

    } else if (itemType === 'helmet') {

        const armorId = selectedItem.dataset.armorId; isEquipped = equippedHelmetId === armorId;

        if (isEquipped) {

            actionText = "Unequip";

            action = "unequip_helmet";

            canPerformAction = true;

        } else {

            actionText = "Equip";

            action = "equip_helmet";

            canPerformAction = true;

        }

    } else if (itemType === 'cloak') { isEquipped = equippedFlameCloak; if (isEquipped) { actionText = "Unequip"; action = "unequip_cloak"; canPerformAction = true; } else { actionText = "Equip"; action = "equip_cloak"; canPerformAction = true; } } else if (itemType === 'equipment' && itemId === 'war_bow') {
        isEquipped = typeof equippedWarBow !== 'undefined' ? equippedWarBow : false;
        if (isEquipped) {
            actionText = "Unequip";
            action = "unequip_warbow";
            canPerformAction = true;
        } else {
            actionText = "Equip";
            action = "equip_warbow";
            canPerformAction = (playerAbilityUpgrades.war_bow || 0) > 0;
        }
    } else if (itemType === 'equipment' && itemId === 'glacier_bow') {
        isEquipped = typeof equippedGlacierBow !== 'undefined' ? equippedGlacierBow : false;
        if (isEquipped) {
            actionText = "Unequip";
            action = "unequip_glacierbow";
            canPerformAction = true;
        } else {
            actionText = "Equip";
            action = "equip_glacierbow";
            canPerformAction = (playerAbilityUpgrades.glacier_bow || 0) > 0;
        }
    } else if (itemType === 'ring' && itemId === 'flame_ring') { isEquipped = typeof equippedFlameRing !== 'undefined' ? equippedFlameRing : false; if (isEquipped) { actionText = "Unequip"; action = "unequip_flamering"; canPerformAction = true; } else { actionText = "Equip"; action = "equip_flamering"; canPerformAction = (playerAbilityUpgrades.flame_ring || 0) > 0; } } else { shopSelectedItemInfoElement.textContent = ""; shopActionButton.classList.add('hidden'); return; } shopActionButton.textContent = actionText; shopActionButton.dataset.action = action; shopActionButton.disabled = !canPerformAction; shopActionButton.classList.remove('hidden'); shopActionButton.classList.remove('green-accent', 'gold-accent', 'disabled-style'); if (action === 'equip' || action === 'equip_warbow' || action === 'equip_glacierbow' || action === 'equip_cloak' || action === 'equip_flamering' || action === 'equip_helmet') {
        shopActionButton.classList.add('gold-accent');
    } else if (action === 'unequip_warbow' || action === 'unequip_glacierbow' || action === 'unequip_cloak' || action === 'unequip_flamering' || action === 'unequip_helmet') {
        shopActionButton.classList.add('gold-accent');
    } else if (action === 'recruit' || action === 'upgrade' || action === 'buy_ability' || action === 'upgrade_spell' || action === 'buy_passive') { shopActionButton.classList.add('green-accent'); } if (!canPerformAction) { shopActionButton.classList.add('disabled-style'); } shopSelectedItemInfoElement.textContent = "";

}

function handleShopActionClick() {

    if (!selectedShopItemId || shopActionButton.disabled) { playSfx('error'); return; } const itemElement = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); if (!itemElement) { playSfx('error'); selectedShopItemId = null; updateShopActionInfo(); return; } const itemId = selectedShopItemId; const itemType = itemElement.dataset.type; const cost = parseInt(itemElement.dataset.currentCost) || 0; let purchaseResult = { success: false, showTroopsPopup: false }; let feedback = ''; let itemNameElement = itemElement.querySelector('h4'); let itemName = itemNameElement ? itemNameElement.textContent.split('(')[0].split('[')[0].trim() : "Item"; if (itemType === 'recruit') { const unitType = itemElement.dataset.unitType; purchaseResult = purchaseUnit(unitType); feedback = purchaseResult.success ? `Recruited ${itemName}!` : `Cannot recruit. Not enough gold or max owned.`; } else if (itemType === 'unit_upgrade') { const lookupId = itemId.startsWith('upgrade_') ? itemId.replace('upgrade_', '') : itemId; purchaseResult.success = purchaseUnitUpgrade(lookupId); feedback = purchaseResult.success ? `Upgraded ${itemName}!` : `Cannot upgrade. Not enough gold.`; } else if (itemType === 'ability_upgrade') { const lookupId = itemId.startsWith('upgrade_') ? itemId.replace('upgrade_', '') : itemId; purchaseResult.success = purchaseAbilityUpgrade(lookupId); feedback = purchaseResult.success ? `Purchased ${itemName}!` : `Cannot purchase. Not enough gold or already owned.`; } else if (itemType === 'spell_upgrade') { const spellName = itemElement.dataset.spellName; purchaseResult.success = purchaseSpellUpgrade(spellName); feedback = purchaseResult.success ? `Upgraded ${itemName}!` : `Cannot upgrade. Not enough gold, level too low, or max level.`; } else if (itemType === 'passive_purchase') {

        purchaseResult.success = purchasePassive(itemId);

        feedback = purchaseResult.success ? `Purchased ${itemName}!` : `Cannot purchase. Not enough gold or requirements not met.`;

    } else if (itemType === 'armor') {

        const armorId = itemElement.dataset.armorId;

        if (shopActionButton.dataset.action === 'equip') {

            // Naked Challenge: prompt if equipping 'none' before Level 1 is beaten

            if (armorId === 'none' && highestLevelReached === 1 && !isNakedChallengeActive) {

                showNakedChallengePrompt();

                return; // Exit early, callback will handle the rest

            }

            const equipSuccess = equipArmor(armorId);

            purchaseResult.success = equipSuccess;

            feedback = equipSuccess ? `Equipped ${itemName}.` : `Failed to equip ${itemName}.`;

            if (equipSuccess) playSfx('armorEquip');

        } else {

            purchaseResult.success = false;

            feedback = "Cannot perform action.";

        }

    } else if (itemType === 'helmet') {

        const armorId = itemElement.dataset.armorId;

        if (shopActionButton.dataset.action === 'equip_helmet') {

            equippedHelmetId = armorId;

            purchaseResult.success = true;

            feedback = `Equipped ${itemName}.`;

            playSfx('armorEquip');

            saveGameData();

        } else if (shopActionButton.dataset.action === 'unequip_helmet') {

            equippedHelmetId = 'none';

            purchaseResult.success = true;

            feedback = `Unequipped ${itemName}.`;

            playSfx('armorEquip');

            saveGameData();

        }

    } else if (itemType === 'cloak') {

        if (shopActionButton.dataset.action === 'equip_cloak') {

            equippedFlameCloak = true;

            purchaseResult.success = true;

            feedback = "Equipped Flame Cloak!";

            playSfx('armorEquip');

            applyArmorBonuses();

            saveGameData();

        } else if (shopActionButton.dataset.action === 'unequip_cloak') {

            equippedFlameCloak = false;

            purchaseResult.success = true;

            feedback = "Unequipped Flame Cloak.";

            playSfx('armorEquip');

            applyArmorBonuses();

            saveGameData();

        }

    } else if (itemType === 'equipment' && itemId === 'war_bow') {
        if (shopActionButton.dataset.action === 'equip_warbow') {
            equippedWarBow = true;
            equippedGlacierBow = false;
            purchaseResult.success = true;
            feedback = "Equipped War Bow! (+1 Range for Archers/Wizards)";
            playSfx('armorEquip');
            saveGameData();
            recalculateAllUnitsStats();
        } else if (shopActionButton.dataset.action === 'unequip_warbow') {
            equippedWarBow = false;
            purchaseResult.success = true;
            feedback = "Unequipped War Bow.";
            playSfx('armorEquip');
            saveGameData();
            recalculateAllUnitsStats();
        }
    } else if (itemType === 'equipment' && itemId === 'glacier_bow') {
        if (shopActionButton.dataset.action === 'equip_glacierbow') {
            equippedGlacierBow = true;
            equippedWarBow = false;
            purchaseResult.success = true;
            feedback = "Equipped Glacier Bow! (+2 ATK, +1 Range for all player ranged units)";
            playSfx('armorEquip');
            saveGameData();
            recalculateAllUnitsStats();
        } else if (shopActionButton.dataset.action === 'unequip_glacierbow') {
            equippedGlacierBow = false;
            purchaseResult.success = true;
            feedback = "Unequipped Glacier Bow.";
            playSfx('armorEquip');
            saveGameData();
            recalculateAllUnitsStats();
        }
    } else if (itemType === 'ring' && itemId === 'flame_ring') {
        if (shopActionButton.dataset.action === 'equip_flamering') {
            equippedFlameRing = true;
            purchaseResult.success = true;
            feedback = "Equipped Flame Ring!";
            playSfx('armorEquip');
            saveGameData();
        } else if (shopActionButton.dataset.action === 'unequip_flamering') {
            equippedFlameRing = false;
            purchaseResult.success = true;
            feedback = "Unequipped Flame Ring.";
            playSfx('armorEquip');
            saveGameData();
        }
    } else {
        purchaseResult.success = false;
        feedback = "Unknown item type.";
    }

    if (purchaseResult.success) {
        if (itemType !== 'armor') playSfx('shopBuy');
        shopFeedbackElement.textContent = feedback;
        shopFeedbackElement.className = 'shop-message success';
        shouldShowTroopsAfterPurchase = purchaseResult.showTroopsPopup || false;
        updateShopDisplay();
        updateChooseTroopsScreen();

        if (itemType === 'armor' || itemType === 'helmet') {
            selectedShopItemId = null;
            updateShopActionInfo();
        } else {
            const updatedItemElement = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${itemId}"]`);
            if (updatedItemElement) updatedItemElement.classList.add('selected');
            selectedShopItemId = itemId;
            updateShopActionInfo();
        }
    } else {
        playSfx('error');
        shopFeedbackElement.textContent = feedback || 'Action failed.';
        shopFeedbackElement.className = 'shop-message error';
        updateShopActionInfo();
    }

}



function showChooseTroopsScreen(levelToStart = 0, origin = 'unknown') {

    // Redirect to seamless shop tab

    showShop(origin, origin === 'restart' || origin === 'levelComplete');

    handleShopTabClick({ currentTarget: { dataset: { tab: 'troops' } } });

}



function hideChooseTroopsScreen() {

    // No longer needed

}



function isChooseTroopsScreenOpen() {

    return isShopOpen() && currentShopTab === 'troops';

}



function updateChooseTroopsScreen() {

    if (!currentTroopsList || !availableTroopsList || !currentRosterCountElement || !maxRosterSizeElement || !playerOwnedUnits || !playerActiveRoster) return;



    currentTroopsList.innerHTML = '';

    availableTroopsList.innerHTML = '';

    const totalActive = getTotalActiveUnits();

    currentRosterCountElement.textContent = totalActive;

    // Mobile UI Refinement: Red text if full but not maxed (12)
    if (totalActive >= maxActiveRosterSize && maxActiveRosterSize < 12) {
        currentRosterCountElement.style.color = '#ff4444'; // Bright red warning
    } else {
        currentRosterCountElement.style.color = ''; // Reset
    }

    maxRosterSizeElement.textContent = maxActiveRosterSize;



    const allPlayerUnitTypes = Object.keys(UNIT_DATA).filter(type => UNIT_DATA[type].team === 'player');



    allPlayerUnitTypes.forEach(unitType => {

        const owned = playerOwnedUnits[unitType] || 0;

        if (owned === 0) return;



        const active = playerActiveRoster[unitType] || 0;

        const available = owned - active;

        const unitData = UNIT_DATA[unitType];

        if (!unitData) return;



        const styles = getSpritePositionStyles(unitType, 'idle', equippedArmorId);

        const iconStyle = `background-image: ${styles.backgroundImage}; background-position: ${styles.backgroundPosition}; background-size: ${styles.backgroundSize}; background-repeat: no-repeat; display: inline-block; vertical-align: middle; width: 64px; height: 64px; pointer-events: none;`;



        if (active > 0) {

            const card = document.createElement('div');

            card.className = 'troop-card';

            card.dataset.unitType = unitType;

            card.innerHTML = `<div class="troop-card-visual" style="pointer-events: none;"><div style="${iconStyle}"></div></div><span class="troop-count" style="pointer-events: none;">${active}</span>`;

            card.addEventListener('click', handleTroopCardClick);

            currentTroopsList.appendChild(card);

        }



        if (available > 0) {

            const card = document.createElement('div');

            card.className = 'troop-card';

            card.dataset.unitType = unitType;

            card.innerHTML = `<div class="troop-card-visual"><div style="${iconStyle}"></div></div><span class="troop-count">${available}</span>`;

            if (totalActive >= maxActiveRosterSize) {

                card.classList.add('disabled');

            } else {

                card.addEventListener('click', handleTroopCardClick);

            }

            availableTroopsList.appendChild(card);

        }

    });



    if (currentTroopsList.children.length === 0) {

        currentTroopsList.innerHTML = `<p style="width:100%; text-align:center; color: var(--color-text-muted); grid-column: 1/-1;">Roster empty!</p>`;

    }

}



function handleTroopCardClick(event) {

    const card = event.currentTarget;

    if (card.classList.contains('disabled')) {

        playSfx('error');

        return;

    }

    const unitType = card.dataset.unitType;

    const parentList = card.parentElement;

    const isCurrent = parentList.id === 'current-troops-list';



    let success = false;

    if (isCurrent) {

        success = removeUnitFromActiveRoster(unitType);

    } else {

        const totalActive = getTotalActiveUnits();

        if (totalActive < maxActiveRosterSize) {

            success = addUnitToActiveRoster(unitType);

        } else {

            playSfx('error');

            return;

        }

    }



    if (success) {

        playSfx('select');

        saveGameData(); // Instant save

        updateChooseTroopsScreen();

    } else {

        playSfx('error');

    }

}



function setActiveSpell(spellName) { if (!isGameActive() || currentTurn !== 'player') { if (currentSpell) { currentSpell = null; clearSpellHighlights(); updateSpellUI(); gameBoard?.classList.remove('fireball-targeting', 'flame-wave-targeting', 'frost-nova-targeting', 'heal-targeting', 'chainLightning-targeting', 'polymorph-targeting'); } return; } let newSpell = null; let feedbackMessage = null; if (spellName) { if (currentSpell === spellName) { newSpell = null; playSfx('select'); } else { const isWizardSpell = (spellName === 'chainLightning' || spellName === 'polymorph'); if (isWizardSpell) { if (selectedUnit && selectedUnit.type === 'wizard') { newSpell = spellName; playSfx('select'); clearHighlights(); highlightWizardSpellRange(selectedUnit); } else { newSpell = null; playSfx('error'); feedbackMessage = "Wizard spell requires Wizard unit."; } } else { const isPermanentlyUnlocked = spellsUnlocked[spellName]; const isSpellReady = (spellUses[spellName] === true || unlimitedSpellsCheat); if (isPermanentlyUnlocked && isSpellReady) { newSpell = spellName; playSfx('select'); if (selectedUnit) deselectUnit(false); } else { newSpell = null; playSfx('error'); if (!isPermanentlyUnlocked) feedbackMessage = `Spell locked.`; else if (!isSpellReady) feedbackMessage = "Spell already used."; else feedbackMessage = "Cannot select spell."; } } } } else { newSpell = null; if (selectedUnit && selectedUnit.type === 'wizard') highlightMovesAndAttacks(selectedUnit); } if (typeof clearSpellHighlights === 'function') clearSpellHighlights(); if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); currentSpell = newSpell; if (typeof updateSpellUI === 'function') updateSpellUI(); gameBoard?.classList.remove('fireball-targeting', 'flame-wave-targeting', 'frost-nova-targeting', 'heal-targeting', 'chainLightning-targeting', 'polymorph-targeting'); if (currentSpell) gameBoard?.classList.add(`${currentSpell}-targeting`); if (feedbackMessage && typeof showFeedback === 'function') showFeedback(feedbackMessage, "feedback-error"); if (selectedUnit && selectedUnit.type === 'wizard' && typeof updateUnitInfo === 'function') updateUnitInfo(selectedUnit); }

function clearFireballHighlight() { gridContent?.querySelectorAll('.valid-fireball-target').forEach(el => el.classList.remove('valid-fireball-target')); units.forEach(u => u.element?.classList.remove('valid-fireball-target')); obstacles.forEach(o => o.element?.classList.remove('valid-fireball-target')); } function clearHealHighlight() { gridContent?.querySelectorAll('.valid-heal-target').forEach(el => el.classList.remove('valid-heal-target')); units.forEach(u => u.element?.classList.remove('valid-heal-target')); } function clearSpellHighlights() { clearFrostNovaPreview(); clearFlameWaveHighlight(); clearFireballHighlight(); clearHealHighlight(); }



function highlightFrostNovaArea(centerX, centerY) {

    if (typeof getFrostNovaRadiusLevel !== 'function') return;

    const radius = getFrostNovaRadiusLevel();

    // Radius 1 = 3x3 (range 1), Radius 2 = 5x5 (range 2)

    for (let dx = -radius; dx <= radius; dx++) {

        for (let dy = -radius; dy <= radius; dy++) {

            const tx = centerX + dx;

            const ty = centerY + dy;

            if (isCellInBounds(tx, ty)) {

                const cell = cellElementsMap.get(`${tx},${ty}`);

                if (cell) cell.classList.add('frost-nova-preview');

            }

        }

    }

}



function clearFrostNovaPreview() {

    gridContent?.querySelectorAll('.frost-nova-preview').forEach(el => el.classList.remove('frost-nova-preview'));

}



// Chain Lightning visual effect - creates an arc from caster to target

function animateChainLightning(caster, target) {

    if (!caster?.element || !target?.element || !gridContent) return;



    const casterRect = caster.element.getBoundingClientRect();

    const targetRect = target.element.getBoundingClientRect();

    const gridRect = gridContent.getBoundingClientRect();



    // Calculate center points relative to grid

    const startX = casterRect.left + casterRect.width / 2 - gridRect.left;

    const startY = casterRect.top + casterRect.height / 2 - gridRect.top;

    const endX = targetRect.left + targetRect.width / 2 - gridRect.left;

    const endY = targetRect.top + targetRect.height / 2 - gridRect.top;



    // Create SVG for the lightning arc

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1000;';



    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const lightningPath = generateLightningPath(startX, startY, endX, endY);

    path.setAttribute('d', lightningPath);

    path.style.stroke = 'var(--color-cyan-bright)';

    path.style.strokeWidth = '3px';

    path.style.fill = 'none';

    path.style.filter = 'drop-shadow(0 0 5px var(--color-cyan-bright)) drop-shadow(0 0 10px var(--color-cyan-glow))';

    path.style.animation = 'lightningFlash 0.3s ease-out';



    svg.appendChild(path);

    gridContent.appendChild(svg);



    // Remove after animation

    setTimeout(() => svg.remove(), 400);

}



// Chain Lightning arc between two targets (for the chain effect)

function animateChainLightningArc(fromUnit, toUnit) {

    if (!fromUnit?.element || !toUnit?.element || !gridContent) return;



    const fromRect = fromUnit.element.getBoundingClientRect();

    const toRect = toUnit.element.getBoundingClientRect();

    const gridRect = gridContent.getBoundingClientRect();



    const startX = fromRect.left + fromRect.width / 2 - gridRect.left;

    const startY = fromRect.top + fromRect.height / 2 - gridRect.top;

    const endX = toRect.left + toRect.width / 2 - gridRect.left;

    const endY = toRect.top + toRect.height / 2 - gridRect.top;



    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    svg.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1000;';



    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const lightningPath = generateLightningPath(startX, startY, endX, endY);

    path.setAttribute('d', lightningPath);

    path.style.stroke = 'var(--color-cyan-soft)';

    path.style.strokeWidth = '2px';

    path.style.fill = 'none';

    path.style.filter = 'drop-shadow(0 0 3px var(--color-cyan-bright)) drop-shadow(0 0 6px var(--color-cyan-glow))';

    path.style.animation = 'lightningFlash 0.3s ease-out';



    svg.appendChild(path);

    gridContent.appendChild(svg);



    setTimeout(() => svg.remove(), 400);

}



// Generate a jagged lightning path between two points

function generateLightningPath(x1, y1, x2, y2) {

    const segments = 5;

    const dx = (x2 - x1) / segments;

    const dy = (y2 - y1) / segments;

    const perpX = -dy * 0.3;

    const perpY = dx * 0.3;



    let path = `M ${x1} ${y1}`;



    for (let i = 1; i < segments; i++) {

        const x = x1 + dx * i + (Math.random() - 0.5) * perpX * 2;

        const y = y1 + dy * i + (Math.random() - 0.5) * perpY * 2;

        path += ` L ${x} ${y}`;

    }



    path += ` L ${x2} ${y2}`;

    return path;

}



function applyMuteState(muted) {
    if (typeof bgMusic !== 'undefined') bgMusic.muted = muted;
    if (typeof victoryMusicPlayer !== 'undefined' && victoryMusicPlayer) victoryMusicPlayer.muted = muted;
    if (typeof sfx !== 'undefined') {
        Object.values(sfx).forEach(sound => { if (sound) sound.muted = muted; });
    }
}

function handleMuteToggle(updateSettingFlag = true, forceValue = undefined) {
    isMuted = forceValue !== undefined ? forceValue : !isMuted;

    applyMuteState(isMuted);

    updateMuteButtonVisual();

    if (updateSettingFlag) updateSetting('mute', isMuted);

    if (!isMuted) {

        initializeAudio();

        // Force immediate play

        if (bgMusic.paused) {

            bgMusic.play().catch(e => console.warn("Mute resume error:", e));

        }

        startMusicIfNotPlaying();

    } else {

        stopMusic();

    }

}

function updateMuteButtonVisual() {

    if (muteToggleSetting) muteToggleSetting.checked = isMuted;



    const muteIcons = document.querySelectorAll('#mute-icon, #mute-setting-icon, #menu-mute-icon, .mute-setting-icon');

    muteIcons.forEach(icon => {
        icon.classList.remove('icon-mute', 'icon-unmute');
        icon.classList.add(isMuted ? 'icon-mute' : 'icon-unmute');
    });

}

function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement); }

function toggleFullscreen(updateSettingFlag = true) {

    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled && !document.mozFullScreenEnabled && !document.msFullscreenEnabled) {

        if (fullscreenToggleSetting) fullscreenToggleSetting.disabled = true;

        console.warn("Fullscreen not supported or enabled.");

        return;

    }

    const container = document.documentElement;

    if (!isFullscreen()) {

        if (container.requestFullscreen) container.requestFullscreen().catch(err => console.error(`FS Error: ${err.message}`));

        else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();

        else if (container.mozRequestFullScreen) container.mozRequestFullScreen();

        else if (container.msRequestFullscreen) container.msRequestFullscreen();

    } else {

        if (document.exitFullscreen) document.exitFullscreen().catch(err => console.error(`Exit FS Error: ${err.message}`));

        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();

        else if (document.mozCancelFullScreen) document.mozCancelFullScreen();

        else if (document.msExitFullscreen) document.msExitFullscreen();

    }

    // Use multiple timeouts to ensure layout settling after browser transitions
    setTimeout(() => {
        updateFullscreenButton();
        calculateCellSize();
        centerView(true);
    }, 150);

    setTimeout(() => {
        calculateCellSize();
        centerView(true);
    }, 500);

}

function updateFullscreenButton() {

    const fsSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled;

    if (fullscreenToggleSetting) {

        fullscreenToggleSetting.disabled = !fsSupported;

        fullscreenToggleSetting.checked = isFullscreen();

    }

    const fsIcons = document.querySelectorAll('#fullscreen-icon, #fullscreen-setting-icon, #menu-fullscreen-icon, .fullscreen-setting-icon');

    fsIcons.forEach(icon => {
        icon.classList.remove('icon-fullscreen', 'icon-unfullscreen');
        icon.classList.add(isFullscreen() ? 'icon-unfullscreen' : 'icon-fullscreen');
    });

}



function proceedToNextLevelOrLocation() { startNextLevel(); }

function proceedAfterShopMaybe() { if (shouldShowTroopsAfterPurchase) { shouldShowTroopsAfterPurchase = false; const levelForTroops = shopIsBetweenLevels ? 0 : (currentShopOrigin === 'levelSelect' ? 0 : currentLevel); showChooseTroopsScreen(levelForTroops, currentShopOrigin); } else if (shopIsBetweenLevels) { shopIsBetweenLevels = false; currentShopOrigin = ''; proceedToNextLevelOrLocation(); } else { const origin = currentShopOrigin; currentShopOrigin = ''; switch (origin) { case 'levelSelect': showLevelSelect(); break; case 'menu': showMenu(); break; case 'levelComplete': proceedToNextLevelOrLocation(); break; default: showLevelSelect(); break; } startTooltipUpdater(); } }



function getTooltipTarget(el) {

    if (!el) return { type: null, targetElement: null, targetData: null };



    const worldHpBarEl = el.closest('.unit-hp-bar-world');



    if (worldHpBarEl) {

        const unitId = worldHpBarEl.dataset.unitId;

        const unit = units.find(u => u.id === unitId && isUnitAliveAndValid(u));

        if (unit && unit.element) return { type: 'unit', targetElement: unit.element, targetData: unit };

    }



    if (isShopOpen()) {

        const shopTabEl = el?.closest('#shop-tab-main');

        if (shopTabEl) return { type: 'shop_tab', targetElement: shopTabEl, targetData: shopTabEl };



        const armoryTabEl = el?.closest('#shop-tab-armory');

        if (armoryTabEl) return { type: 'armory_tab', targetElement: armoryTabEl, targetData: armoryTabEl };



        const troopsTabEl = el?.closest('#shop-tab-troops');

        if (troopsTabEl) return { type: 'troops_tab', targetElement: troopsTabEl, targetData: troopsTabEl };



        const shopItemEl = el?.closest('.armor-item-slot, .passive-item-slot, .shop-item, .spell-icon, #shop-gold-display, #menu-gold-display');

        if (shopItemEl) {

            if (shopItemEl.classList.contains('armor-item-slot')) return { type: 'armor', targetElement: shopItemEl, targetData: shopItemEl };

            if (shopItemEl.classList.contains('passive-item-slot')) return { type: 'passive', targetElement: shopItemEl, targetData: shopItemEl };



            const dataType = shopItemEl.dataset.type;

            if (dataType === 'armor') return { type: 'armor', targetElement: shopItemEl, targetData: shopItemEl };

            if (dataType === 'passive' || dataType === 'passive_purchase') return { type: 'passive', targetElement: shopItemEl, targetData: shopItemEl };



            if (shopItemEl.classList.contains('shop-item')) return { type: 'shop', targetElement: shopItemEl, targetData: shopItemEl };

            if (shopItemEl.classList.contains('spell-icon')) return { type: 'spell', targetElement: shopItemEl, targetData: shopItemEl };

            if (shopItemEl.id?.includes('gold-display')) return { type: 'gold', targetElement: shopItemEl, targetData: playerGold };

        }

        // Fall through for generic buttons in shop

    } else if (isLevelSelectOpen()) {

        const levelDotEl = el?.closest('.level-dot');

        if (levelDotEl) return { type: 'levelDot', targetElement: levelDotEl, targetData: levelDotEl };

        // Check for tooltipText buttons (Barracks, Select Hero, Back, Prev/Next Page)
        const lsBtnEl = el?.closest('[data-tooltip-text]');
        if (lsBtnEl && lsBtnEl.dataset.tooltipText) return { type: 'simple', targetElement: lsBtnEl, targetData: lsBtnEl.dataset.tooltipText };

        return { type: null, targetElement: null, targetData: null };

    } else if (isChooseTroopsScreenOpen()) {

        const troopCardEl = el?.closest('.troop-card');

        const goldDisplayEl = el?.closest('#menu-gold-display');

        if (troopCardEl) return { type: 'troopCard', targetElement: troopCardEl, targetData: troopCardEl };

        if (goldDisplayEl) return { type: 'gold', targetElement: goldDisplayEl, targetData: playerGold };

        // Check for tooltipText buttons (Back)
        const ctBtnEl = el?.closest('[data-tooltip-text]');
        if (ctBtnEl && ctBtnEl.dataset.tooltipText) return { type: 'simple', targetElement: ctBtnEl, targetData: ctBtnEl.dataset.tooltipText };

        return { type: null, targetElement: null, targetData: null };

    } else if (isAchievementsOpen()) {

        const achievementEl = el?.closest('.achievement-item');

        if (achievementEl) return { type: 'achievement', targetElement: achievementEl, targetData: achievementEl.dataset.id };

        // Check for tooltipText buttons (Back)
        const achBtnEl = el?.closest('[data-tooltip-text]');
        if (achBtnEl && achBtnEl.dataset.tooltipText) return { type: 'simple', targetElement: achBtnEl, targetData: achBtnEl.dataset.tooltipText };

        return { type: null, targetElement: null, targetData: null };

    } else if (isLevelCompleteOpen()) {

        const bonusItemEl = el?.closest('.bonus-item');

        if (bonusItemEl && !bonusItemEl.classList.contains('hidden')) {

            return { type: 'bonus', targetElement: bonusItemEl, targetData: bonusItemEl.dataset.bonus };

        }

        // Check for tooltipText buttons (Back, Next Level, Barracks)
        const lcBtnEl = el?.closest('[data-tooltip-text]');
        if (lcBtnEl && lcBtnEl.dataset.tooltipText) return { type: 'simple', targetElement: lcBtnEl, targetData: lcBtnEl.dataset.tooltipText };

        return { type: null, targetElement: null, targetData: null };

    }



    // Always check spell icons (unit abilities panel)

    const parTimerEl = el?.closest('#par-timer-container');
    if (parTimerEl) {
        return { type: 'par', targetElement: parTimerEl, targetData: null };
    }

    const spellIconEl = el?.closest('.spell-icon, .ability-button');

    if (spellIconEl) {

        return { type: 'spell', targetElement: spellIconEl, targetData: spellIconEl };

    }



    // Default board targets

    if (isGameActive() && !isAnyOverlayVisible(true)) {

        const unitEl = el?.closest('.unit');

        if (unitEl && !unitEl.classList.contains('dead') && !unitEl.classList.contains('fading-out')) {

            const unit = units.find(u => u.id === unitEl.dataset.id && isUnitAliveAndValid(u));

            if (unit && !unit.isInvisible) return { type: 'unit', targetElement: unitEl, targetData: unit };

        }

        const itemEl = el?.closest('.item');

        if (itemEl) {

            const item = items.find(i => i.id === itemEl.dataset.id && !i.collected);

            if (item) return { type: 'item', targetElement: itemEl, targetData: item };

        }

        const obstacleEl = el?.closest('.obstacle');

        if (obstacleEl) {

            const obstacle = obstacles.find(o => o.id === obstacleEl.dataset.id && isObstacleIntact(o));

            if (obstacle) return { type: 'obstacle', targetElement: obstacleEl, targetData: obstacle };

        }

    }



    // Debug Spawner Tooltip

    if (isDebugSpawnerOpen()) {

        const debugBtn = el?.closest('.debug-enemy-button');

        if (debugBtn) {

            const unitType = debugBtn.dataset.enemyType;

            if (unitType && UNIT_DATA[unitType]) {

                return { type: 'debug_unit', targetElement: debugBtn, targetData: UNIT_DATA[unitType] };

            }

        }

    } else if (isMenuOpen() || isSettingsOpen()) {

        const goldDisplayEl = el?.closest('#menu-gold-display, #shop-gold-display');

        if (goldDisplayEl) return { type: 'gold', targetElement: goldDisplayEl, targetData: playerGold };

        // Check for tooltipText buttons (Back, Mute, Fullscreen, Restart, Quit)
        const menuBtnEl = el?.closest('[data-tooltip-text]');
        if (menuBtnEl && menuBtnEl.dataset.tooltipText) return { type: 'simple', targetElement: menuBtnEl, targetData: menuBtnEl.dataset.tooltipText };

    }



    // Generic button title support (Menu, Restart, etc.)

    const btn = el?.closest('.icon-button, .primary-button, .secondary-button, .shop-tab-button, .pagination-button, .menu-btn, .close-btn, button');

    if (btn && !btn.disabled) {
        // Check for our custom tooltip text first (to fix flashing)
        if (btn.dataset.tooltipText) {
            return { type: 'simple', targetElement: btn, targetData: btn.dataset.tooltipText };
        }
        // Fallback to title
        if (btn.title) {
            return { type: 'simple', targetElement: btn, targetData: btn.title };
        }
    }



    return { type: null, targetElement: null, targetData: null };

}



/* active trackMousePosition is at line ~1167 */



function updateTooltip() {
    if (isMobileDevice() || !tooltipElement || isPanning || isMapPanning) {
        // On mobile, don't auto-hide if a manual tooltip timeout is active
        if (isMobileDevice() && mobileTooltipTimeout) return;

        if (tooltipElement?.classList.contains('visible')) hideTooltip();
        lastHoveredElement = null;
        return;
    }

    const el = document.elementFromPoint(currentMouseX, currentMouseY);

    let { type, targetElement, targetData } = getTooltipTarget(el);



    // Allow tooltips on specific overlays (Shop, Level Select, Choose Troops)

    // Also allow spell tooltips even if overlays are present (e.g. in main menu or settings)

    if (isAnyOverlayVisible(true) && !isShopOpen() && !isLevelSelectOpen() && !isChooseTroopsScreenOpen() && !isAchievementsOpen() && !isLevelCompleteOpen()) {
        if (type !== 'spell' && type !== 'par' && type !== 'simple') {
            if (tooltipElement?.classList.contains('visible')) hideTooltip();
            lastHoveredElement = null;
            return;
        }
    }

    // Hide par tooltip specifically in Main Menu or if game not active
    if (type === 'par' && (!isGameActive() || isMainMenuOpen())) {
        if (tooltipElement?.classList.contains('visible')) hideTooltip();
        lastHoveredElement = null;
        return;
    }




    // Fallback #1: If elementFromPoint hit a grid cell, check for units/obstacles at that grid position

    // This handles cases where CSS transforms cause elementFromPoint to miss units

    if (!targetElement && el?.classList.contains('grid-cell') && gameBoard && gridContent && isGameActive()) {

        const boardRect = gameBoard.getBoundingClientRect();

        const mouseXInBoard = currentMouseX - boardRect.left;

        const mouseYInBoard = currentMouseY - boardRect.top;



        // Account for grid transform (zoom and pan)

        if (currentZoom > 0 && currentCellSize > 0) {

            const gridX = Math.floor((mouseXInBoard - gridContentOffsetX) / (currentCellSize * currentZoom));

            const gridY = Math.floor((mouseYInBoard - gridContentOffsetY) / (currentCellSize * currentZoom));



            if (isCellInBounds(gridX, gridY)) {

                // Check for unit at this position

                const unitAtPos = getUnitAt(gridX, gridY);

                if (unitAtPos && isUnitAliveAndValid(unitAtPos) && unitAtPos.element) {

                    // Stealth Check: Don't show tooltip if invisible

                    if (unitAtPos.isInvisible) {

                        type = null; targetElement = null; targetData = null;

                    } else {

                        type = 'unit';

                        targetElement = unitAtPos.element;

                        targetData = unitAtPos;

                    }

                } else {

                    // Check for obstacle at this position

                    const obstacleAtPos = getObstacleAt(gridX, gridY);

                    if (obstacleAtPos && isObstacleIntact(obstacleAtPos) && obstacleAtPos.element) {

                        type = 'obstacle';

                        targetElement = obstacleAtPos.element;

                        targetData = obstacleAtPos;

                    } else {

                        // Check for item at this position

                        const itemAtPos = items.find(i => i.x === gridX && i.y === gridY && !i.collected);

                        if (itemAtPos && itemAtPos.element) {

                            type = 'item';

                            targetElement = itemAtPos.element;

                            targetData = itemAtPos;

                        }

                    }

                }

            }

        }

    }



    // Fallback #2 removed to prevent "sticky" tooltips when hovering near elements.

    // elementFromPoint + grid-cell fallback is sufficient and more responsive.



    if (targetElement && (targetData !== null || type === 'par')) {

        const getTooltipDataId = (data, t) => {

            if (!data) return null;

            if (t === 'unit' || t === 'obstacle' || t === 'item') return data.id;

            if (data instanceof HTMLElement) {

                return `${t}-${data.id || data.dataset?.itemId || data.dataset?.spellName || data.dataset?.unitType || data.dataset?.ability || data.dataset?.id || 'no-id'}`;

            }

            return `${t}-${data}`;

        };



        const currentDataId = getTooltipDataId(targetData, type);

        const isVisible = tooltipElement?.classList.contains('visible');



        // REFRESH IF: Element changed OR Type changed OR Data ID changed OR not currently visible

        if (targetElement !== lastHoveredElement || type !== lastTooltipType || currentDataId !== lastTooltipDataId || !isVisible) {

            showTooltip(targetData, type);

            lastHoveredElement = targetElement;

            lastTooltipType = type;

            lastTooltipDataId = currentDataId;

        } else {

            positionTooltip();

        }

    } else {

        if (lastHoveredElement !== null || (tooltipElement && tooltipElement.classList.contains('visible'))) {

            hideTooltip();

            lastHoveredElement = null;

            lastTooltipType = null;

            lastTooltipDataId = null;

        }

    }

}

function startTooltipUpdater() { if (isMobileDevice()) return; stopTooltipUpdater(); tooltipUpdateInterval = setInterval(updateTooltip, 50); }

function stopTooltipUpdater() { if (tooltipUpdateInterval) { clearInterval(tooltipUpdateInterval); tooltipUpdateInterval = null; } hideTooltip(); }

function showTooltip(data, type) {

    if (!tooltipElement || (data === null && type !== 'par') || typeof data === 'undefined') { hideTooltip(); return; }

    // FORCE pointer-events none to prevent flickering
    tooltipElement.style.pointerEvents = 'none';



    // Auto-hide for mobile (disabled in Shop)

    if (isMobileDevice() && !isShopOpen()) {

        if (mobileTooltipTimeout) clearTimeout(mobileTooltipTimeout);

        mobileTooltipTimeout = setTimeout(() => hideTooltip(), MOBILE_TOOLTIP_DURATION_MS);

    }



    let content = '';
    let restrictionNote = '';

    try {

        switch (type) {

            case 'simple':
                if (typeof data === 'string') {
                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">${data}</span>`;
                } else if (data && data.text) {
                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">${data.text}</span>`;
                    if (data.subtext) {
                        content += `<br><span style="color:#cccccc; font-size:0.9em;">${data.subtext}</span>`;
                    }
                }
                break;

            case 'par':
                const turnsLeft = Math.max(0, window.parTurns - window.turnsCountThisLevel + 1);
                const parBonus = turnsLeft * 5;
                content = `<div class="tooltip-title" style="color:var(--color-gold-light); margin-bottom:4px;">Blitz Bonus</div>`;
                content += `<div class="tooltip-desc">Complete the level in <span style="color:var(--color-gold); font-weight:bold;">${turnsLeft}</span> turns for bonus gold!</div>`;
                content += `<div class="tooltip-desc">Current bonus: <span style="color:var(--color-gold); font-weight:bold;">${parBonus}g</span></div>`;
                break;

            case 'unit':

                const unit = data;

                if (!unit || !unit.name || typeof unit.hp === 'undefined') {

                    hideTooltip();

                    return;

                }

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">${unit.name}</span>`;

                if (!unit.isShopItem) {
                    const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0;

                    content += `<div class="unit-hp-bar-container tooltip-hp-bar" style="--hp-percent: ${hpPercent}%;">`;

                    const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high'));

                    content += `<div class="unit-hp-bar" data-hp-level="${hpLevel}"></div><span class="unit-hp-text">${unit.hp}/${unit.maxHp}</span></div>`;
                }

                // Show stats for shop items
                if (unit.isShopItem && unit.unitType) {
                    const baseData = UNIT_DATA[unit.unitType];
                    if (baseData) {
                        const atk = baseData.baseAtk + (playerUnitUpgrades[`${unit.unitType}_atk`] || 0);
                        const hp = baseData.baseHp + (playerUnitUpgrades[`${unit.unitType}_hp`] || 0);
                        const mov = baseData.mov;
                        const rng = baseData.range;
                        content += `<div style="font-size: 0.9em; margin-top: 4px; color: #ccc;">`;
                        content += `HP: ${hp} &nbsp; ATK: ${atk} &nbsp; MOV: ${mov} &nbsp; RNG: ${rng}`;
                        content += `</div>`;
                    }
                }

                let statuses = [];

                if (unit.isStealthed) statuses.push(`<span style="color:#cccccc;">👻 Stealth</span>`);

                if (unit.isFrozen) statuses.push(`<span style="color:#aadeff;">❄️ Frozen (${unit.frozenTurnsLeft}t)</span>`);

                if (unit.isNetted) statuses.push(`<span style="color:#cccccc;">🕸️ Netted (${unit.nettedTurnsLeft}t)</span>`);

                if (unit.isSlowed) statuses.push(`<span style="color:#add8e6;">🐌 Slowed (${unit.slowedTurnsLeft}t)</span>`);

                if (unit.inTower) statuses.push(`<span style="color:#ffddaa;">🏰 In Tower</span>`);

                if (unit.quickStrikeActive) statuses.push(`<span style="color:var(--color-gold-light);">⚡ Quick Strike</span>`);

                if (statuses.length > 0) content += `<br>` + statuses.join('<br>');

                if (unit && unit.restrictionNote) {
                    content += `<div class="restriction-note" style="color:#ff4444; font-weight:bold; font-size: 0.9em; margin-top: 6px; border-top: 1px solid rgba(255,68,68,0.3); padding-top: 4px;">${unit.restrictionNote}</div>`;
                }
                break;

            case 'item':
                const item = data;
                const itemConfig = ITEM_DATA[item.type];
                if (!itemConfig) break;

                if (item.type === 'gold') {
                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">Gold Coin</span><br><span style="color:#ffffff;">Value: ${itemConfig.value || 1}</span>`;
                } else if (item.type === 'chest') {
                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">Chest</span>`;
                    if (item.opened) content += `<br><span style="color:#ffffff;">Empty</span>`;
                } else if (item.type === 'health_potion') {
                    const potionCycle = Math.floor((currentLevel - 1) / TOTAL_LEVELS_BASE);
                    const healAmount = (HEALTH_POTION_HEAL_AMOUNT || 1) + potionCycle;
                    content = `<span style="color:#ff4444; font-weight:bold;">Health Potion</span><br><span style="color:#ffffff;">Restores +${healAmount} HP</span>`;
                } else if (item.type === 'shiny_gem') {
                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">Shiny Gem</span><br><span style="color:#ffffff;">Value: ${item.value || '?'}</span>`;
                } else if (item.type === 'gold_magnet') {
                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">Gold Magnet</span><br><span style="color:#ffffff;">Pulls nearby gold!</span>`;
                } else if (item.type === 'spellbook') {
                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">Spellbook</span><br><span style="color:#ffffff;">Restores 1 spell charge.</span>`;
                } else if (item.type === 'armor' || item.type === 'helmet' || item.type === 'flame_cloak') {
                    const armorId = item.armorId || (item.type === 'flame_cloak' ? 'flame_cloak' : 'grey');
                    const armorData = ARMOR_DATA[armorId];

                    if (armorData) {
                        let color = 'var(--color-gold-light)';
                        let ownedLevel = item.armorLevel || item.level || 1;

                        if (!item.armorLevel && typeof playerOwnedArmor !== 'undefined' && playerOwnedArmor[armorId] > 0) ownedLevel = playerOwnedArmor[armorId];

                        if (['green', 'blue', 'red', 'yellow'].includes(armorId)) {
                            if (ownedLevel >= 5) color = 'var(--color-purple-bright)';
                            else if (ownedLevel >= 3) color = 'var(--color-blue-bright)';
                            else color = 'var(--color-green-bright)';
                        } else if (armorId === 'none') color = '#ffdab9';
                        else if (armorId === 'grey') color = 'var(--color-disabled-text)';

                        // Special item overrides
                        if (armorId === 'flame_cloak' || item.type === 'flame_cloak') color = 'var(--color-orange-highlight)';
                        else if (armorId === 'goblin_mother_skull') {
                            if (ownedLevel >= 5) color = 'var(--color-purple-bright)';
                            else if (ownedLevel >= 3) color = 'var(--color-blue-bright)';
                            else color = 'var(--color-green-bright)';
                        }

                        const levelText = (ownedLevel > 0 && armorId !== 'flame_cloak') ? ` (Lvl ${ownedLevel})` : '';
                        content = `<span style="color:${color}; font-weight:bold;">${armorData.name}${levelText}</span>`;

                        // Generate dynamic stats based on level using helper
                        const statsText = getArmorStatsDescription(armorId, ownedLevel);
                        if (statsText) {
                            content += `<br><span style="color:#ffffff; font-size: 0.9em; opacity: 0.9;">${statsText}</span>`;
                        }
                    }
                } else {
                    // Fallback for other items
                    const name = itemConfig.name || item.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    const nameColor = itemConfig.color || 'var(--color-gold-light)';
                    content = `<span style="color:${nameColor}; font-weight:bold;">${name}</span>`;
                    if (itemConfig.description) {
                        content += `<br><span style="color:#ffffff;">${itemConfig.description}</span>`;
                    }
                }

                if (item.restrictionNote) {
                    content += `<div class="restriction-note" style="color:#ff4444; font-weight:bold; font-size: 0.9em; margin-top: 6px; border-top: 1px solid rgba(255,68,68,0.3); padding-top: 4px;">${item.restrictionNote}</div>`;
                }
                break;

            case 'obstacle': const obstacle = data; const obsConfig = OBSTACLE_DATA[obstacle.type];

                const isTowerOrDoor = ['tower', 'door', 'pallisade_door', 'tower_destroyed'].includes(obstacle.type);

                if ((obsConfig.useSpritesheet === 'doodads' || obstacle.type === 'rock') && !isTowerOrDoor) { hideTooltip(); return; }

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">${obstacle.name || obsConfig.name || obstacle.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>`; if (obstacle.description) content += `<br><span style="color:#ffffff;">${obstacle.description}</span>`;

                const hideHpFor = ['crate', 'barrel', 'exploding_barrel', 'snowman'];

                if (obstacle.destructible && !hideHpFor.includes(obstacle.type)) content += `<br>HP: ${obstacle.hp}/${obstacle.maxHp}`; if (obstacle.enterable) { const occupant = obstacle.occupantUnitId ? units.find(u => u.id === obstacle.occupantUnitId && isUnitAliveAndValid(u)) : null; content += `<br>${occupant ? `Occupied by ${occupant.name}` : 'Empty'}`; if (occupant?.baseRange > 1) content += ` (+${obstacle.rangeBonus} RNG)`; if (!occupant && obstacle.hp > 0) content += `<br><span style="color:#cccccc;">(Enter/Exit from below)</span>`; } if (obsConfig.blocksLOS) content += `<br><span style="color:#ffccaa;">Blocks Line of Sight</span>`; if (obstacle.hidesUnit && !obstacle.revealed) content += `<br><span style="color:#aadeff;">Seems suspicious...</span>`; if (obstacle.canBeAttacked) content += `<br><span style="color:#ff4444;">Attackable</span>`; break; case 'shop': const shopItemId = data.dataset.itemId; const shopItemType = data.dataset.type; if (shopItemType === 'recruit') {

                    const unitType = data.dataset.unitType; const unitData = UNIT_DATA[unitType]; const shopCost = getRecruitCost(unitType); const owned = playerOwnedUnits[unitType] || 0; const max = parseInt(data.dataset.max) || MAX_OWNED_PER_TYPE;

                    // Recruits generally use Gold title, but could be customized later

                    if (unitData) {
                        const reqLvl = RECRUIT_UNLOCK_LEVELS_MAP[unitType] || 1;
                        if (highestLevelReached < reqLvl) {
                            content = `<span style="color:#ff4444; font-weight:bold;">Locked</span>`;
                            restrictionNote = ""; // Reset to avoid double display
                        } else {
                            content = `<span style="color:var(--color-gold-light); font-weight:bold;">Recruit ${unitData.name}</span> <span style="color:#ffffff;">(${owned}/${max})</span>`;
                            content += `<br>${unitData.baseHp} HP | ${unitData.baseAtk} ATK | ${unitData.mov} MOV | ${unitData.range} RNG`;

                            // 2nd Unit Requirements
                            if (owned >= 2 && unitType === 'knight') {
                                if (highestLevelReached <= 5) {
                                    restrictionNote = "Requires Level 5";
                                }
                            } else if (owned >= 1) {
                                if (unitType === 'wizard') {
                                    restrictionNote = "Limit 1 Wizard";
                                } else {
                                    const secondUnitReq = reqLvl + 10;
                                    if (highestLevelReached < secondUnitReq) {
                                        restrictionNote = `Requires Level ${secondUnitReq}`;
                                    }
                                }
                            }
                        }
                    } else {
                        content = `<span style="color:var(--color-gold-light); font-weight:bold;">Recruit Unit</span>`;
                    }
                } else if (shopItemType === 'unit_upgrade') {

                    const cost = getUnitUpgradeCost(shopItemId);

                    const desc = data.querySelector('h4')?.textContent || "Unit Upgrade";

                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">${desc}</span><br><span style="color:#ffffff;">Permanently increases stat for all units of this type.</span>`;



                    const unitForUpgrade = shopItemId.split('_')[0];

                    let unlockLevel = 1;

                    if (unitForUpgrade === 'archer') unlockLevel = 10;

                    else if (unitForUpgrade === 'champion') unlockLevel = 24;

                    else if (unitForUpgrade === 'rogue') unlockLevel = 40;

                    else if (unitForUpgrade === 'wizard') unlockLevel = 60;



                    if (highestLevelReached < unlockLevel) {
                        restrictionNote = `Requires ${UNIT_DATA[unitForUpgrade]?.name || 'Unit'} Unlocked.`;
                    }







                    let requiredLevel = 16;

                    if (unitForUpgrade === 'champion') requiredLevel = 24;

                    if (unitForUpgrade === 'rogue') requiredLevel = 40;

                    // Archer upgrades stay at 16.



                    if (highestLevelReached < requiredLevel) restrictionNote = (restrictionNote ? restrictionNote + " & " : "") + `Requires Level ${requiredLevel}.`;





                } else if (shopItemType === 'ability_upgrade') {

                    const lookupId = shopItemId.replace('upgrade_', '');

                    const cost = ABILITY_UPGRADE_COSTS[lookupId] || 99999;

                    let abilityName = data.querySelector('h4')?.textContent || "Ability Upgrade";

                    abilityName = abilityName.replace(/Rogue:\s*/i, '').replace(/Wizard:\s*/i, '');

                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">${abilityName}</span>`;

                    if (lookupId === 'rogue_quickstrike') content += `<br>Allows an extra attack per turn at the cost of ${ROGUE_QUICK_STRIKE_MOVE_PENALTY} movement.`;

                    if (lookupId === 'wizard_polymorph') content += `<br>Transform an enemy into a harmless sheep for 3 turns.`;



                    let unitType = lookupId.split('_')[0];

                    if (lookupId === 'war_bow') unitType = 'archer';

                    if (lookupId === 'flame_ring') unitType = 'wizard';



                    let unlockLevel = 1;

                    if (unitType === 'archer') unlockLevel = 10;

                    else if (unitType === 'champion') unlockLevel = 24;

                    else if (unitType === 'rogue') unlockLevel = 40;

                    else if (unitType === 'wizard') unlockLevel = 60;



                    if (highestLevelReached < unlockLevel && unitType !== 'knight') {
                        restrictionNote = `Requires ${UNIT_DATA[unitType]?.name || 'Unit'} Unlocked.`;
                    }



                    let requiredLevel = 0;

                    if (unitType === 'champion') requiredLevel = 24;

                    if (unitType === 'rogue') requiredLevel = 40;

                    if (unitType === 'wizard') requiredLevel = WIZARD_UNLOCK_LEVEL;

                    if (highestLevelReached < requiredLevel) restrictionNote = (restrictionNote ? restrictionNote + " & " : "") + `Requires Level ${requiredLevel}.`;

                } else if (shopItemType === 'spell_upgrade') {

                    const spellName = data.dataset.spellName;

                    const cost = calculateSpellCost(spellName);

                    const currentLevel = playerSpellUpgrades[spellName] || 0;

                    const config = SPELL_UPGRADE_CONFIG[spellName];

                    const isMaxed = currentLevel >= config.maxLevel;

                    const displayLevel = isMaxed ? currentLevel + 1 : currentLevel + 2;

                    const titlePrefix = isMaxed ? '' : 'Upgrade ';

                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">${titlePrefix}${config.name} (Lvl ${displayLevel})</span>`;

                    if (isMaxed) {

                        content += `<br><span style="color:#ffaa00;">Max Level Reached.</span>`;

                    } else {

                        content += `<br><span style="color:#ffffff;">Next: ${getSpellEffectDescription(spellName, true)}</span>`;

                    }

                    const reqLvl = parseInt(data.dataset.requiredLevel) || 0;

                    if (highestLevelReached <= reqLvl && currentLevel === 0) {
                        restrictionNote = `Requires Level ${reqLvl}`;
                    }

                } else if (shopItemType === 'equipment' || shopItemType === 'cloak' || shopItemType === 'ring' || shopItemType === 'helmet') {

                    const cardTitleElement = data.querySelector('h4');

                    const title = cardTitleElement?.textContent || "Item";

                    const desc = data.querySelector('.shop-item-description')?.innerHTML || "";

                    // Read color directly from the card's title element - single source of truth
                    const titleColor = cardTitleElement?.style?.color || window.getComputedStyle(cardTitleElement || {})?.color || '#ffffff';
                    const isLegendary = data.classList.contains('legendary') || titleColor.includes('legendary') || titleColor === 'var(--color-legendary)';

                    content = `<span style="color:${titleColor}; font-weight:bold;">${title}</span>`;

                    if (desc) content += `<br><span style="color:#ffffff;">${desc}</span>`;

                    if (shopItemType === 'equipment' && shopItemId === 'war_bow') {

                        const isEquipped = typeof equippedWarBow !== 'undefined' ? equippedWarBow : false;

                        content += `<br><span style="color:#ffddaa;">Click to ${isEquipped ? 'Unequip' : 'Equip'}</span>`;

                    }

                    if (shopItemType === 'cloak' && shopItemId === 'flame_cloak') {

                        content += `<br><span style="color:#ffddaa;">Click to ${equippedFlameCloak ? 'Unequip' : 'Equip'}</span>`;

                    }

                    if (shopItemType === 'ring' && shopItemId === 'flame_ring') {

                        const isEquipped = typeof equippedFlameRing !== 'undefined' ? equippedFlameRing : false;

                        content += `<br><span style="color:#ffddaa;">Click to ${isEquipped ? 'Unequip' : 'Equip'}</span>`;

                    }

                    if (shopItemType === 'helmet') {

                        const armorId = data.dataset.armorId;

                        const isEquipped = equippedHelmetId === armorId;

                        content += `<br><span style="color:#ffddaa;">Click to ${isEquipped ? 'Unequip' : 'Equip'}</span>`;

                    }
                } else if (shopItemType === 'passive_purchase') {
                    const passiveId = shopItemId;
                    if (passiveId && PASSIVE_DATA[passiveId]) {
                        const passiveConfig = PASSIVE_DATA[passiveId];
                        const passiveLevel = playerPassiveUpgrades[passiveId] || 0;
                        const rankConfig = typeof PASSIVE_UPGRADE_CONFIG !== 'undefined' ? PASSIVE_UPGRADE_CONFIG[passiveId] : null;
                        const isMultiRank = !!rankConfig;

                        const showLevelInTooltip = passiveLevel > 0 && passiveId !== 'loot_hoarder';
                        content = `<span style="color:var(--color-gold-light); font-weight:bold;">${passiveConfig.name}${showLevelInTooltip ? ` (Lvl ${passiveLevel})` : ''}</span>`;

                        let description = passiveConfig.description || "";
                        if (isMultiRank) {
                            const currentEffect = (passiveLevel || 1) * rankConfig.effectStep;
                            let displayValue = currentEffect;
                            if (passiveId === 'evasion') displayValue = Math.round(currentEffect * 100);
                            description = description.replace('{n}', displayValue);
                        }
                        content += `<br><span style="color:#ffffff;">${description}</span>`;

                        if (isMultiRank && passiveLevel > 0) {
                            const nextLevel = passiveLevel + 1;
                            if (nextLevel > rankConfig.maxLevel) {
                                content += `<br><span style="color:#88bbff;">Maximum Level Reached</span>`;
                            } else {
                                const nextEffect = nextLevel * rankConfig.effectStep;
                                let nextVal = nextEffect;
                                let effectSuffix = " damage";
                                if (passiveId === 'evasion') {
                                    nextVal = Math.round(nextEffect * 100);
                                    effectSuffix = "% chance";
                                } else if (passiveId === 'vampiric_aura') {
                                    effectSuffix = " HP";
                                }
                                content += `<br><span style="color:var(--color-gold-light);">Next Level: ${nextVal}${effectSuffix}</span>`;
                            }
                        }
                    }
                }

                if (restrictionNote) {
                    content += `<br><span style="color:#ff4444;">${restrictionNote}</span>`;
                }

                break;

            case 'passive':

                // Passives in shop use itemId (e.g. 'evasion'), passives in roster might use 'passive_evasion'

                let passiveId = data.dataset.itemId;

                if (passiveId?.startsWith('passive_')) passiveId = passiveId.substring(8);



                if (passiveId && PASSIVE_DATA[passiveId]) {
                    const passiveConfig = PASSIVE_DATA[passiveId];
                    const passiveLevel = playerPassiveUpgrades[passiveId] || 0;

                    const rankConfig = typeof PASSIVE_UPGRADE_CONFIG !== 'undefined' ? PASSIVE_UPGRADE_CONFIG[passiveId] : null;
                    const isMultiRank = !!rankConfig;

                    const showLevelInTooltip = passiveLevel > 0 && passiveId !== 'loot_hoarder';
                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">${passiveConfig.name}${showLevelInTooltip ? ` (Lvl ${passiveLevel})` : ''}</span>`;

                    // Handle {n} in description
                    let description = passiveConfig.description || "";
                    if (isMultiRank) {
                        const currentEffect = (passiveLevel || 1) * rankConfig.effectStep;
                        let displayValue = currentEffect;
                        if (passiveId === 'evasion') displayValue = Math.round(currentEffect * 100);
                        description = description.replace('{n}', displayValue);
                    }
                    content += `<br><span style="color:#ffffff;">${description}</span>`;

                    if (isMultiRank && passiveLevel > 0) {
                        const nextLevel = passiveLevel + 1;
                        if (nextLevel > rankConfig.maxLevel) {
                            content += `<br><span style="color:#88bbff;">Maximum Level Reached</span>`;
                        } else {
                            const nextEffect = nextLevel * rankConfig.effectStep;
                            let nextVal = nextEffect;
                            let effectSuffix = " damage";
                            if (passiveId === 'evasion') {
                                nextVal = Math.round(nextEffect * 100);
                                effectSuffix = "% chance";
                            } else if (passiveId === 'vampiric_aura') {
                                effectSuffix = " HP";
                            }
                            content += `<br><span style="color:var(--color-gold-light);">Next Level: ${nextVal}${effectSuffix}</span>`;
                        }
                    }

                    if (passiveId === 'tactical_command') {
                        const tcCost = PASSIVE_UPGRADE_COSTS.tactical_command;
                        const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0;
                        const requiredUnits = parseInt(data.dataset.requiredUnits) || 0;
                        const meetsUnitReq = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0) >= requiredUnits;
                        const isMaxed = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) >= MAX_ACTIVE_ROSTER_SIZE_MAX;

                        if (isMaxed) content += `<br><span style="color:#88bbff;">Maximum Roster Size Reached</span>`;
                        else {
                            if (!meetsUnitReq) content += `<br><span style="color:#ff4444;">Requires ${requiredUnits} total units unlocked.</span>`;
                        }
                    } else {
                        // Avoid duplicates; roster passives show level requirement from PASSIVE_DATA or rankConfig
                        const reqLvl = isMultiRank ? (rankConfig.baseLevel + (passiveLevel * rankConfig.levelStep)) : (passiveConfig.requiredLevel || 0);
                        if (reqLvl > 0 && highestLevelReached < reqLvl) {
                            content += `<br><span style="color:#ff4444;">Requires Level ${reqLvl}</span>`;
                        }
                    }
                }
                break;

            case 'armor':

                const armorId = data.dataset.armorId;

                const armorData = ARMOR_DATA[armorId];

                const armorLevel = playerOwnedArmor[armorId] || 0;

                if (armorData) {

                    // Read color directly from the card's title element - single source of truth

                    const armorTitleElement = data.querySelector('h4');

                    const titleColor = armorTitleElement?.style?.color || window.getComputedStyle(armorTitleElement)?.color || '#ffffff';

                    content = `<span style="color:${titleColor}; font-weight:bold;">${armorData.name}${armorLevel > 1 ? ` (Lvl ${armorLevel})` : ''}</span>`;



                    // Show scaled stat bonuses

                    // Show scaled stat bonuses using helper

                    const statsText = getArmorStatsDescription(armorId, armorLevel);

                    if (statsText) content += `<br><span style="color:#ffffff; font-size: 0.9em; opacity: 0.9;">${statsText}</span>`;

                    else if (armorId === 'none') {

                        content += `<br><span style="color:#ff4444;">Max HP: 1 | +${armorData.movBonus || 0} MOV</span>`;

                    }



                    if (armorId !== 'none' && armorId !== 'grey') {

                        if (armorLevel === 0) content += `<br><span style="color:#ff4444;">(Dropped by World Boss)</span>`;

                        else if (equippedArmorId === armorId) content += `<br><span style="color:#aaffaa;">Equipped</span>`;

                    }

                } break; case 'gold': content = `<span style="color:#ffffff;">Current Gold: ${data}</span>`; break; case 'achievement':

                const achId = data;

                const achData = ACHIEVEMENT_DATA[achId];

                if (achData) {

                    const achProgress = achievementProgress[achId] || { current: 0, unlocked: false };

                    content = `<span style="color:var(--color-gold-light); font-weight:bold;">${achData.title}</span><br><span style="color:#ffffff;">${achData.description}</span>`;

                    if (achData.condition.count) {

                        if (!achProgress.unlocked) content += `<br>Progress: ${achProgress.current || 0} / ${achData.condition.count}`;

                        else content += `<br><span style="color:#aaffaa;">Completed!</span>`;

                    }

                    if (achData.reward?.gold > 0) content += `<br><span style="color:#ffddaa;">Reward: ${achData.reward.gold} Gold</span>`;

                }

                break;

            case 'spell':

                const spellName = data.dataset.abilityName || data.dataset.ability || data.dataset.spellName;

                const label = data.nextElementSibling?.classList.contains('spell-label') ? data.nextElementSibling.textContent : null;

                const isForestArmorBtn = data.id === 'forest-armor-ability';



                let titleText = label || spellName?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) || "Spell";

                let descText = "";



                if (isForestArmorBtn) {

                    const armorLevel = playerOwnedArmor['green'] || 1;

                    titleText = `Forest Armor (Lvl ${armorLevel})`;

                    const damageRed = armorLevel;

                    descText = `Activate to -${damageRed} damage from all enemy attacks. (1 turn)`;

                } else if (spellName === 'stealth') {

                    titleText = `Stealth`;

                    descText = data.dataset.baseTitle || "Become invisible to enemies. -2 MOV while stealthed.";

                } else if (spellName === 'quickStrike') {

                    titleText = `Quick Strike`;

                    descText = data.dataset.baseTitle || "Gain an extra attack this turn at the cost of -2 MOV.";

                } else if (spellName === 'chainLightning') {

                    titleText = `Chain Lightning`;

                    let wizAtk = UNIT_DATA.wizard.baseAtk + (playerUnitUpgrades.wizard_atk || 0);

                    if (selectedUnit && selectedUnit.type === 'wizard') wizAtk = selectedUnit.atk;

                    const chainDmg = Math.ceil(wizAtk / 2);

                    descText = `Deal ${wizAtk} damage to target and ${chainDmg} to connecting enemies.`;

                } else if (spellName === 'polymorph') {

                    titleText = `Polymorph`;

                    descText = data.dataset.baseTitle || "Transform an enemy into a sheep for 3 turns.";

                } else {

                    // Normal Spells

                    const currentLvl = (playerSpellUpgrades[spellName] || 0) + 1;

                    titleText = `${titleText} (Lvl ${currentLvl})`;

                    descText = getSpellEffectDescription(spellName);

                }



                content = `<span style="color:var(--color-gold-light); font-weight:bold;">${titleText}</span>`;

                if (descText) content += `<br><span style="color:#ffffff;">${descText}</span>`;

                break;

            case 'levelDot':

                const levelDot = data;

                const levelNum = levelDot.dataset.level;

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">Level ${levelNum}</span>`;

                if (levelDot.classList.contains('locked')) content += `<br><span style="color:#aaaaaa;">Locked</span>`;

                else if (levelDot.classList.contains('beaten')) content += `<br><span style="color:#aaffaa;">Completed</span>`;

                else content += `<br><span style="color:#ff4444;">Click to Play</span>`;

                break;

            case 'troopCard':

                const card = data;

                const unitType = card.dataset.unitType;

                const unitData = UNIT_DATA[unitType];

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">${unitData?.name || 'Unknown Troop'}</span>`;

                const parentListId = card.parentElement?.id;

                if (parentListId === 'current-troops-list') content += `<br><span style="color:#ffccaa;">Click to move to Inactive</span>`;

                else if (parentListId === 'available-troops-list') {

                    content += ``;

                    const totalActive = getTotalActiveUnits();

                    if (totalActive < maxActiveRosterSize) content += `<br><span style="color:#aaffaa;">Click to move to Active</span>`;

                    else content += `<br><span style="color:#ff8888;">Roster Full!</span>`;

                }

                break;

                break;

            case 'bonus':

                const bonusType = data;

                let bTitle = "Bonus";

                let bDesc = "";

                if (bonusType === 'noSpells') { bTitle = "Might Over Magic"; bDesc = "Complete level without using spells."; }
                else if (bonusType === 'speed') { bTitle = "Blitz Bonus"; bDesc = "Finish the level under the Par turn count."; }
                else if (bonusType === 'executioner') { bTitle = "Executioner"; bDesc = "Never go more than 2 turns without dealing damage."; }
                else if (bonusType === 'noLosses') { bTitle = "No Man Left Behind"; bDesc = "Complete level without losing any units."; }
                else if (bonusType === 'noArmor') { bTitle = "Ultimate Triumph"; bDesc = "Complete level with No Armor equipped (no losses)."; }


                content = `<span style="color:var(--color-gold-light); font-weight:bold;">${bTitle}</span><br><span style="color:#ffffff;">${bDesc}</span>`;

                break;

            case 'par':

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">Par Timer</span><br><span style="color:#ffffff;">Complete the level under this turn count for a <b>Blitz Bonus</b>!</span>`;

                break;

            case 'shop_tab':

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">Shop</span> <span class="hotkey-highlight">(S)</span><br><span style="color:#ffffff;">Recruit new units and buy spell upgrades.</span>`;

                break;

            case 'armory_tab':

                const isArmoryUnlocked = highestLevelReached > 60;

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">Armory</span> <span class="hotkey-highlight">(A)</span><br><span style="color:#ffffff;">Upgrade unit stats and unlock powerful passives.</span>`;

                if (!isArmoryUnlocked) content += `<br><span style="color:#ff4444;">Beat Level 60 to Unlock.</span>`;

                break;

            case 'troops_tab':

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">Troops</span> <span class="hotkey-highlight">(T)</span><br><span style="color:#ffffff;">Manage your active roster and swap units.</span>`;

                break;

            case 'debug_unit':

                const uData = data;

                content = `<span style="color:var(--color-gold-light); font-weight:bold;">${uData.name}</span>`;

                content += `<br><span style="color:#ffffff;">HP: ${uData.baseHp} | ATK: ${uData.baseAtk}</span>`;

                if (typeof uData.mov !== 'undefined') content += `<br><span style="color:#ffffff;">MOV: ${uData.mov} | RNG: ${uData.range}</span>`;

                break;

            case 'simple_text':

                content = `<span style="color:#ffffff;">${data}</span>`;

                break;

            default: hideTooltip(); return;

        }

    } catch (e) { console.error(`Tooltip error for type ${type}:`, e); content = "Error"; } if (content) { tooltipElement.innerHTML = content; tooltipElement.classList.add('visible'); positionTooltip(); } else hideTooltip();

}

function hideTooltip() {

    if (tooltipElement) tooltipElement.classList.remove('visible');

    if (tooltipTimeout) { clearTimeout(tooltipTimeout); tooltipTimeout = null; }

    if (mobileTooltipTimeout) { clearTimeout(mobileTooltipTimeout); mobileTooltipTimeout = null; }

}

function positionTooltip() { if (!tooltipElement || !tooltipElement.classList.contains('visible')) return; const rect = tooltipElement.getBoundingClientRect(); const viewWidth = window.innerWidth; const viewHeight = window.innerHeight; const offsetX = 15; const offsetY = 20; let top = currentMouseY + offsetY; let left = currentMouseX + offsetX; if (top + rect.height > viewHeight - 10) top = currentMouseY - rect.height - 15; if (left + rect.width > viewWidth - 10) left = currentMouseX - rect.width - 15; left = Math.max(5, left); top = Math.max(5, top); tooltipElement.style.left = `${left}px`; tooltipElement.style.top = `${top}px`; }



function createWorldHpBar(unit) { if (!unitHpBarsOverlay || !unit || !unit.element || worldHpBars.has(unit.id)) return; const barContainer = document.createElement('div'); barContainer.className = 'unit-hp-bar-world'; barContainer.dataset.unitId = unit.id; const barFill = document.createElement('div'); barFill.className = 'unit-hp-bar-world-fill'; barContainer.appendChild(barFill); unitHpBarsOverlay.appendChild(barContainer); worldHpBars.set(unit.id, barContainer); updateWorldHpBar(unit); updateWorldHpBarPosition(unit); }

function updateWorldHpBar(unit) {

    if (!unit || !worldHpBars.has(unit.id)) return;

    const barContainer = worldHpBars.get(unit.id);

    const barFill = barContainer.querySelector('.unit-hp-bar-world-fill');

    if (!barFill) return;



    // Check invisibility (undetected stealth)

    let isInvisible = false;

    if (unit.team === 'enemy' && unit.isStealthed) {

        // Simple 1-tile detection check

        const isDetected = units.some(u => u.team === 'player' && isUnitAliveAndValid(u) && Math.abs(u.x - unit.x) + Math.abs(u.y - unit.y) <= 1);

        if (!isDetected) isInvisible = true;

    }



    const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100)) : 0;

    barFill.style.width = `${hpPercent}%`;

    const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high'));

    barFill.className = `unit-hp-bar-world-fill hp-${hpLevel}`;



    // Hide if full HP, invisible (undetected stealth), or dead

    if (hpPercent >= 100 || isInvisible || unit.hp <= 0) {

        barContainer.style.display = 'none';

    } else {

        barContainer.style.display = 'block';

    }

}

function removeWorldHpBar(unitId) { if (worldHpBars.has(unitId)) { worldHpBars.get(unitId).remove(); worldHpBars.delete(unitId); } }

function updateWorldHpBarPosition(unit) { if (!unit || !worldHpBars.has(unit.id) || !unit.element) return; const barContainer = worldHpBars.get(unit.id); barContainer.style.setProperty('--unit-grid-x', unit.x); barContainer.style.setProperty('--unit-grid-y', unit.y); }

function updateWorldHpBarsVisibility() { if (!unitHpBarsOverlay) return; unitHpBarsOverlay.classList.add('visible'); createAllWorldHpBars(); updateWorldHpBars(); }

function createAllWorldHpBars() { units.forEach(unit => { if (isUnitAliveAndValid(unit)) createWorldHpBar(unit); }); }

function clearAllWorldHpBars() { if (unitHpBarsOverlay) unitHpBarsOverlay.innerHTML = ''; worldHpBars.clear(); }

function updateWorldHpBars() {

    units.forEach(unit => {

        if (typeof updateWorldHpBar === 'function') updateWorldHpBar(unit);

        if (typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);

    });

}





function updateAudioVolumeDisplays() { if (musicVolumeSlider) musicVolumeSlider.value = musicVolume; if (musicVolumeValueSpan) musicVolumeValueSpan.textContent = `${Math.round(musicVolume * 100)}%`; if (sfxVolumeSlider) sfxVolumeSlider.value = sfxVolume; if (sfxVolumeValueSpan) sfxVolumeValueSpan.textContent = `${Math.round(sfxVolume * 100)}%`; }

function updatePlayerNameInput() { if (playerNameSettingInput) playerNameSettingInput.value = gameSettings.playerName; }



function updateAchievementsScreen() {

    if (!achievementsListElement || !achievementCompletionStatusElement) return;

    achievementsListElement.innerHTML = '';

    let unlockedCount = 0;

    const totalAchievements = Object.keys(ACHIEVEMENT_DATA).length;



    // Define category order and display names

    const categoryOrder = ['combat', 'progression', 'challenges', 'recruitment', 'collection'];

    const categoryNames = {

        combat: '⚔️ Combat',

        progression: '🗺️ Progression',

        challenges: '🏆 Challenges',

        recruitment: '👥 Rescues',

        collection: '💎 Collection'

    };



    // Group achievements by category

    const grouped = {};

    Object.keys(ACHIEVEMENT_DATA).forEach(id => {

        const data = ACHIEVEMENT_DATA[id];

        const cat = data.category || 'other';

        if (!grouped[cat]) grouped[cat] = [];

        grouped[cat].push({ id, data });

    });



    // Render each category

    categoryOrder.forEach(cat => {

        if (!grouped[cat] || grouped[cat].length === 0) return;



        // Sort: unlocked first, then by sortOrder within each group

        grouped[cat].sort((a, b) => {

            const aUnlocked = achievementProgress[a.id]?.unlocked;

            const bUnlocked = achievementProgress[b.id]?.unlocked;



            // Unlocked achievements always come first

            if (aUnlocked && !bUnlocked) return -1;

            if (!aUnlocked && bUnlocked) return 1;



            // Within the same unlock status, sort by explicit sortOrder

            if (a.data.sortOrder !== undefined && b.data.sortOrder !== undefined) {

                return a.data.sortOrder - b.data.sortOrder;

            } else if (a.data.sortOrder !== undefined) {

                return -1;

            } else if (b.data.sortOrder !== undefined) {

                return 1;

            }



            // Sort by count/requirement if available (least to greatest)

            if (a.data.condition?.count && b.data.condition?.count) {

                return a.data.condition.count - b.data.condition.count;

            }



            return a.data.title.localeCompare(b.data.title);

        });



        // Count unlocked in this category

        const catUnlocked = grouped[cat].filter(a => achievementProgress[a.id]?.unlocked).length;



        // Create section header

        const sectionHeader = document.createElement('div');

        sectionHeader.className = 'achievement-section-header';

        sectionHeader.innerHTML = `<span>${categoryNames[cat] || cat}</span><span class="section-progress">${catUnlocked}/${grouped[cat].length}</span>`;

        achievementsListElement.appendChild(sectionHeader);



        // Create section grid container

        const sectionGrid = document.createElement('div');

        sectionGrid.className = 'achievement-section-grid';



        // Render achievements in this category

        grouped[cat].forEach(({ id, data }) => {

            const progress = achievementProgress[id] || { current: 0, unlocked: false };

            const isUnlocked = progress.unlocked;

            if (isUnlocked) unlockedCount++;



            const item = document.createElement('div');

            item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;

            item.dataset.id = id;



            const iconClass = isUnlocked ? 'achievement-icon-unlocked' : 'achievement-icon-locked';

            const iconAlt = isUnlocked ? `${data.title} Unlocked` : `Locked Achievement`;



            let progressText = '';

            if (data.condition.count > 1 && !isUnlocked) {

                progressText = `<div class="achievement-progress">${progress.current || 0}/${data.condition.count}</div>`;

            } else if (data.condition.type === 'all_armor_level' && !isUnlocked) {

                progressText = `<div class="achievement-progress">${progress.current || 0}/4</div>`;

            }



            item.innerHTML = `

                <div class="achievement-icon ${iconClass}" role="img" aria-label="${iconAlt}"></div>

                <div class="achievement-details">

                    <h4 class="achievement-title">${data.title}</h4>

                    ${progressText}

                </div>

            `;

            sectionGrid.appendChild(item);

        });



        achievementsListElement.appendChild(sectionGrid);

    });



    achievementCompletionStatusElement.textContent = `Completion: ${unlockedCount} / ${totalAchievements}`;

}



function updateLevelSelectScreen() {

    if (!levelSelectDotsLayer || !levelSelectMap || !levelSelectPageInfo || !levelSelectPrevPage || !levelSelectNextPage) return;

    levelSelectDotsLayer.innerHTML = '';

    levelSelectMap.style.backgroundImage = `url('${WORLD_MAP_IMAGE_URL}')`;



    const startLevel = (currentLevelSelectPage - 1) * LEVELS_PER_PAGE + 1;

    const endLevel = startLevel + LEVELS_PER_PAGE - 1;

    const maxPossibleLevel = ENABLE_INFINITE_LEVELS ? TOTAL_LEVELS_TO_SHOW : TOTAL_LEVELS_BASE;

    const actualEndLevel = Math.min(endLevel, maxPossibleLevel);

    const isMobileView = window.matchMedia("(max-width: 700px)").matches;

    const activeQuadrantCenters = isMobileView ? MOBILE_VISUAL_QUADRANT_CENTERS : VISUAL_QUADRANT_CENTERS;

    const fragment = document.createDocumentFragment();



    for (let i = startLevel; i <= actualEndLevel; i++) {

        const dot = document.createElement('div'); dot.className = 'level-dot'; dot.dataset.level = i; dot.textContent = `${i}`; dot.addEventListener('mouseenter', handleLevelDotMouseEnter); dot.addEventListener('mouseleave', handleLevelDotMouseLeave);



        const baseLevelIndex = (i - 1) % TOTAL_LEVELS_BASE;

        const quadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS;

        const levelInQuadrant = baseLevelIndex % LEVELS_PER_WORLD;



        // Path-based positioning

        const path = WORLD_PATHS[quadrantIndex] || WORLD_PATHS[0];

        // Calculate progress t (0 to 1) along the path

        // We use LEVELS_PER_WORLD - 1 to ensure the last level is at the end of the path

        // If LEVELS_PER_WORLD is 1, t is 0.

        const t = LEVELS_PER_WORLD > 1 ? levelInQuadrant / (LEVELS_PER_WORLD - 1) : 0;



        // Interpolate position

        const totalSegments = path.length - 1;

        const segmentLength = 1 / totalSegments;

        const currentSegmentIndex = Math.min(Math.floor(t / segmentLength), totalSegments - 1);

        const segmentT = (t - (currentSegmentIndex * segmentLength)) / segmentLength;



        const p1 = path[currentSegmentIndex];

        const p2 = path[currentSegmentIndex + 1];



        const targetXPercent = p1.x + (p2.x - p1.x) * segmentT;

        const targetYPercent = p1.y + (p2.y - p1.y) * segmentT;



        dot.dataset.targetX = targetXPercent; dot.dataset.targetY = targetYPercent;

        if (i > highestLevelReached) { dot.classList.add('locked'); dot.disabled = true; dot.title = "Locked"; } else { if (highestLevelReached > i) { dot.classList.add('beaten'); } else { dot.classList.add('unlocked'); } dot.title = `Level ${i}`; dot.addEventListener('click', handleLevelDotClick); } fragment.appendChild(dot);

    }

    levelSelectDotsLayer.appendChild(fragment);

    positionLevelDots();

    updateLevelSelectPagination();

}



function handleSpellIconMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) { /* updateTooltip handles this via polling */ } }

function handleSpellIconMouseLeave(event) { }

function handleGoldDisplayMouseEnter(event) { }

function handleGoldDisplayMouseLeave(event) { }

function handleShopItemMouseEnter(event) {
    const item = event.currentTarget;
    if (!item) return;

    // Main tooltip system (showTooltip handles all logic)
    showTooltip(item, 'shop');
}

/**
 * Helper to show raw HTML content in tooltip
 */
function showTooltipRaw(html) {
    if (!tooltipElement) return;
    tooltipElement.innerHTML = html;
    tooltipElement.classList.add('visible');
    tooltipElement.classList.remove('hidden');
    positionTooltip();
}

function handleShopItemMouseLeave(event) {
    hideTooltip();
}

function handleLevelDotMouseEnter(event) { positionLevelDots(); }

function handleLevelDotMouseLeave(event) { positionLevelDots(); }

function handleTroopCardMouseEnter(event) { }

function handleTroopCardMouseLeave(event) { }

function handleObstacleMouseEnter(event) {

    const obstacleId = event.currentTarget.dataset.id;

    const obstacle = obstacles.find(o => o.id === obstacleId);



    if (obstacle) {

        if (obstacle.clickable && (!selectedUnit || selectedUnit.team !== 'player')) {

            event.currentTarget.style.cursor = 'pointer'; // Show pointer for clickable interaction

        } else if (currentSpell === 'fireball' && obstacle.canBeAttacked) {

            event.currentTarget.style.cursor = 'crosshair';

        } else if (currentTurn === 'player' && selectedUnit && selectedUnit.team === 'player') {

            // Existing attack logic...

            const dist = Math.abs(selectedUnit.x - obstacle.x) + Math.abs(selectedUnit.y - obstacle.y);

            const isRanged = selectedUnit.currentRange > 1;

            if (obstacle.canBeAttacked && (dist <= selectedUnit.currentRange || (isRanged && dist <= selectedUnit.currentRange))) {

                event.currentTarget.style.cursor = 'crosshair';

            } else {

                event.currentTarget.style.cursor = 'not-allowed';

            }

        } else {

            // Default cursor behavior

            if (obstacle.clickable) event.currentTarget.style.cursor = 'pointer';

            else event.currentTarget.style.cursor = 'default';

        }

    }

}





// --- Animation Functions ---



async function animateAttack(attacker, target, isRanged, projectileType, isFrost = false) {

    if (!attacker || !attacker.element || !target) return 0;



    // Melee Animation

    if (!isRanged) {

        return new Promise(resolve => {

            const startX = attacker.x;

            const startY = attacker.y;

            const targetX = target.x;

            const targetY = target.y;



            // Calculate lunge direction (in pixels)

            const dx = (targetX - startX) * currentCellSize * 0.7; // Lunge 70% of the way

            const dy = (targetY - startY) * currentCellSize * 0.7;



            attacker.element.style.setProperty('--lunge-x', `${dx}px`);

            attacker.element.style.setProperty('--lunge-y', `${dy}px`);

            attacker.element.classList.add('melee-lunge');



            playSfx('attack'); // Generic melee sound, can be customized



            setTimeout(() => {

                if (attacker.element) attacker.element.classList.remove('melee-lunge');

                resolve(200); // Wait for animation to finish

            }, 200);

        });

    }



    // Ranged Animation

    else {

        return new Promise(resolve => {

            const originRect = attacker.element.getBoundingClientRect();

            let targetRect;



            if (target.element) {

                targetRect = target.element.getBoundingClientRect();

            } else {

                // Fallback if target element is missing (e.g. fog)

                const cell = getCellElement(target.x, target.y);

                if (cell) targetRect = cell.getBoundingClientRect();

                else { resolve(0); return; }

            }



            const projectile = document.createElement('div');
            projectile.className = `projectile ${projectileType || 'arrow'}`;
            if (projectileType === 'arrow' && (attacker.type === 'krizak' || (attacker.team === 'player' && equippedGlacierBow))) {
                projectile.classList.add('glacier-arrow');
            } else if (projectileType === 'fireball' && isFrost) {
                projectile.classList.add('frost-fireball');
            }



            // Set dynamic styles for all projectiles to match cell size and isolate sprites

            projectile.style.backgroundImage = "url('./sprites/projectiles.png')";

            projectile.style.width = `${currentCellSize}px`;

            projectile.style.height = `${currentCellSize}px`;

            projectile.style.backgroundSize = '300% 100%';

            projectile.style.backgroundRepeat = 'no-repeat';

            projectile.style.zIndex = '2000';

            projectile.style.imageRendering = 'pixelated';



            // Position sprite within sheet: 0=Arrow, 1=Net, 2=Fireball

            let xPercent = 0;

            if (projectileType === 'net') xPercent = 50;

            else if (projectileType === 'fireball') xPercent = 100;



            projectile.style.backgroundPosition = `${xPercent}% 0%`;



            // Start at attacker center

            const startLeft = originRect.left + originRect.width / 2;

            const startTop = originRect.top + originRect.height / 2;



            projectile.style.left = `${startLeft}px`;

            projectile.style.top = `${startTop}px`;

            projectile.style.transform = 'translate(-50%, -50%)';



            // Calculate angle

            const dx = (targetRect.left + targetRect.width / 2) - startLeft;

            const dy = (targetRect.top + targetRect.height / 2) - startTop;

            const angle = Math.atan2(dy, dx) * 180 / Math.PI;



            // Adjust rotation based on projectile type if needed (arrows usually point right by default)

            if (projectileType !== 'net') {

                const scale = projectileType === 'arrow' ? 0.6 : 1.0;

                projectile.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`;

            } else {

                projectile.style.transform = `translate(-50%, -50%)`;

            }



            document.body.appendChild(projectile);



            // Force reflow

            projectile.getBoundingClientRect();



            // Animate

            const duration = 300; // ms

            projectile.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;

            projectile.style.left = `${targetRect.left + targetRect.width / 2}px`;

            projectile.style.top = `${targetRect.top + targetRect.height / 2}px`;



            if (projectileType === 'arrow') playSfx('arrowShoot');

            else if (projectileType === 'fireball') playSfx('fireballShoot');

            else if (projectileType === 'net') { /* No sound on throw to avoid duplication with hit */ }



            setTimeout(() => {

                // Play explosion sound for fireball projectiles

                if (projectileType === 'fireball') playSfx('fireballHit');

                projectile.remove();

                resolve(0); // Damage happens on impact

            }, duration);

        });

    }

}



function animateFireball(originElement, targetX, targetY, isFrost = false) {
    if (!originElement || !gameBoard) return;
    const originRect = originElement.getBoundingClientRect();
    const targetCell = getCellElement(targetX, targetY);
    if (!targetCell) return;
    const targetRect = targetCell.getBoundingClientRect();

    const fireball = document.createElement('div');
    fireball.className = `projectile fireball${isFrost ? ' frost-fireball' : ''}`;

    fireball.style.backgroundImage = "url('./sprites/projectiles.png')";

    fireball.style.width = `${currentCellSize}px`;

    fireball.style.height = `${currentCellSize}px`;



    // Debug visibility:

    // fireball.style.border = '1px solid red'; 



    // 3 columns (Arrow, ?, Fireball). Fireball is col 2 (last one).

    // Use pixel offset to avoid percentage rounding issues.

    fireball.style.backgroundSize = '300% 100%';

    fireball.style.backgroundPosition = `-${currentCellSize * 2}px 0`;



    fireball.style.backgroundRepeat = 'no-repeat';

    fireball.style.position = 'fixed'; // Use fixed to be independent of grid scroll for start

    fireball.style.zIndex = '2000';

    fireball.style.left = `${originRect.left + originRect.width / 2}px`;

    fireball.style.top = `${originRect.top + originRect.height / 2}px`;

    fireball.style.transform = 'translate(-50%, -50%)';

    fireball.style.pointerEvents = 'none';



    // Calculate angle

    const dx = (targetRect.left + targetRect.width / 2) - (originRect.left + originRect.width / 2);

    const dy = (targetRect.top + targetRect.height / 2) - (originRect.top + originRect.height / 2);

    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    fireball.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;



    document.body.appendChild(fireball);



    // Force reflow

    fireball.getBoundingClientRect();



    fireball.style.transition = `left 0.4s linear, top 0.4s linear`;

    fireball.style.left = `${targetRect.left + targetRect.width / 2}px`;

    fireball.style.top = `${targetRect.top + targetRect.height / 2}px`;

    setTimeout(() => {
        fireball.remove();
        // Explosion is handled by the caller in gameLogic.js (castSpell)
        // to avoid duplicate explosions and maintain synchronization.
    }, 400);
}



function createExplosionEffect(x, y, type, splashRadius = 0) {

    const cell = getCellElement(x, y);

    if (!cell || !gridContent) return;



    const explosion = document.createElement('div');

    explosion.className = 'effect explosion';



    // Calculate scale based on splash radius (radius 1 = 3x3 area = 3 cells wide)

    const scaleFactor = splashRadius > 0 ? (1 + splashRadius * 2) : 1;

    const size = `calc(var(--cell-size) * ${scaleFactor})`;

    explosion.style.width = size;

    explosion.style.height = size;

    explosion.style.position = 'absolute';



    // Position in gridContent using pixel coordinates, centered on target cell

    const cellCenterX = (x + 0.5) * currentCellSize;

    const cellCenterY = (y + 0.5) * currentCellSize;

    const halfSize = (currentCellSize * scaleFactor) / 2;

    explosion.style.left = `${cellCenterX - halfSize}px`;

    explosion.style.top = `${cellCenterY - halfSize}px`;



    explosion.style.zIndex = '20';

    explosion.style.pointerEvents = 'none';



    if (type === 'fireball' || type === 'frostNova' || type === 'frostFireball') {
        explosion.style.backgroundImage = "url('./sprites/fireball_explode.png')";
        explosion.style.backgroundSize = '800% 100%'; // 8 frames
        explosion.style.backgroundPosition = '0% 0%';
        explosion.style.backgroundRepeat = 'no-repeat';

        if (type === 'frostNova' || type === 'frostFireball') {
            explosion.style.filter = 'hue-rotate(180deg) brightness(1.2) saturate(1.5)';
        }

        // Sprite sheet animation
        explosion.animate([
            { backgroundPosition: '0 0' },
            { backgroundPosition: `calc(var(--cell-size) * ${scaleFactor} * -8) 0` }
        ], {
            duration: 800,
            easing: 'steps(8)',
            fill: 'forwards'
        });
    }



    gridContent.appendChild(explosion);

    setTimeout(() => explosion.remove(), 800);

}



function animateFlameWave(targetRow) {

    if (!gridContent) return;



    for (let x = 0; x < currentGridCols; x++) {

        const cell = getCellElement(x, targetRow);

        if (!cell) return;



        setTimeout(() => {

            const flame = document.createElement('div');

            flame.className = 'effect flame-wave';

            flame.style.width = '100%';

            flame.style.height = '100%';

            flame.style.position = 'absolute';

            flame.style.left = '0';

            flame.style.top = '0';

            flame.style.zIndex = '15';

            flame.style.backgroundImage = "url('./sprites/fireball_explode.png')";

            flame.style.backgroundSize = '800% 100%';

            flame.style.backgroundPosition = '0% 0%';

            flame.style.backgroundRepeat = 'no-repeat';



            flame.animate([

                { backgroundPosition: '0% 0%' },

                { backgroundPosition: '100% 0%' }

            ], {

                duration: 800,

                easing: 'steps(8)',

                fill: 'forwards'

            });



            cell.appendChild(flame);

            setTimeout(() => flame.remove(), 800);

        }, x * 50); // Stagger delay

    }





}



function showFlameWaveWarning(targetRow) {

    if (!gridContent) return;

    for (let x = 0; x < currentGridCols; x++) {

        const cell = getCellElement(x, targetRow);

        if (cell) {

            cell.classList.add('flame-wave-warning-row');

        }

    }

}



function clearFlameWaveWarning(targetRow) {

    if (!gridContent) return;

    for (let x = 0; x < currentGridCols; x++) {

        const cell = getCellElement(x, targetRow);

        if (cell) {

            cell.classList.remove('flame-wave-warning-row');

        }

    }

}



function clearAllFlameWaveWarnings() {

    if (!gridContent) return;

    gridContent.querySelectorAll('.flame-wave-warning-row').forEach(el => el.classList.remove('flame-wave-warning-row'));

}



function animateFrostNova(centerX, centerY, radiusLevel) {

    // Use local frost sound

    playSfx('frostboltCast');



    const cell = getCellElement(centerX, centerY);

    if (!cell) return;



    const radius = radiusLevel || 1;

    // Calculate size relative to cell size

    // Radius 1 means 3x3 grid, so width/height should be 3 * cell-size

    const diameterCells = radius * 2 + 1;

    const sizePx = diameterCells * currentCellSize;



    const nova = document.createElement('div');

    nova.className = 'effect frost-nova';

    nova.style.width = `${sizePx}px`;

    nova.style.height = `${sizePx}px`;

    nova.style.position = 'absolute';

    // Center it on the cell

    nova.style.left = '50%';

    nova.style.top = '50%';

    nova.style.transform = 'translate(-50%, -50%)';

    nova.style.zIndex = '15';

    nova.style.background = 'radial-gradient(circle, rgba(150,220,255,0.8) 0%, rgba(100,180,255,0.4) 50%, rgba(50,150,255,0) 100%)';

    nova.style.boxShadow = '0 0 20px rgba(100,180,255,0.6)';

    nova.style.borderRadius = '50%';

    nova.style.opacity = '0.7';

    nova.style.pointerEvents = 'none';



    nova.animate([

        { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.8 },

        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 }

    ], {

        duration: 500,

        easing: 'ease-out'

    });



    cell.appendChild(nova);

    setTimeout(() => nova.remove(), 500);



    // Trigger particles on each hit tile

    // Scale particles per tile based on radius to prevent lag for 9x9 (radius 4)

    // 3x3 (r1): 12 per tile -> 108 total

    // 9x9 (r4): 3 per tile -> 243 total (much better than 972)

    const particlesPerTile = radiusLevel >= 4 ? 3 : (radiusLevel >= 3 ? 5 : (radiusLevel >= 2 ? 8 : 12));

    const isLargeRadius = radiusLevel >= 3;



    for (let dx = -radius; dx <= radius; dx++) {

        for (let dy = -radius; dy <= radius; dy++) {

            const tx = centerX + dx;

            const ty = centerY + dy;

            if (isCellInBounds(tx, ty)) {

                // HIGH EFFICIENCY MODE for large radius:

                // Only spawn particles on tiles that actually have something (unit or obstacle)

                // Or if it's the center tile.

                let shouldSpawn = true;

                if (isLargeRadius) {

                    const hasUnit = units.some(u => u.x === tx && u.y === ty && isUnitAliveAndValid(u));

                    const hasObstacle = obstacles.some(o => o.x === tx && o.y === ty && isObstacleIntact(o));

                    // Check logic: if it's empty ground, skip it to save massive performance

                    if (!hasUnit && !hasObstacle && (dx !== 0 || dy !== 0)) {

                        shouldSpawn = false;

                    }

                }



                if (shouldSpawn && typeof createFrostParticles === 'function') {

                    // Slight staggering for better effect

                    setTimeout(() => createFrostParticles(tx, ty, particlesPerTile), Math.sqrt(dx * dx + dy * dy) * 50);

                }

            }

        }

    }

}



function animateHeal(targetUnit) {

    if (!targetUnit || !targetUnit.element) return;



    const healEffect = document.createElement('div');

    healEffect.className = 'effect heal-effect';

    healEffect.style.width = '100%';

    healEffect.style.height = '100%';

    healEffect.style.position = 'absolute';

    healEffect.style.left = '0';

    healEffect.style.top = '0';

    healEffect.style.zIndex = '20';

    healEffect.style.backgroundImage = "url('./sprites/heal.png')";

    healEffect.style.backgroundSize = 'contain';

    healEffect.style.backgroundPosition = 'center';

    healEffect.style.backgroundRepeat = 'no-repeat';

    healEffect.style.pointerEvents = 'none';



    healEffect.animate([

        { transform: 'translateY(0) scale(0.8)', opacity: 0 },

        { transform: 'translateY(-10px) scale(1.2)', opacity: 1, offset: 0.3 },

        { transform: 'translateY(-30px) scale(1)', opacity: 0 }

    ], {

        duration: 1000,

        easing: 'ease-out'

    });



    targetUnit.element.appendChild(healEffect);

    setTimeout(() => healEffect.remove(), 1000);

}



// --- Debug Spawner Functions ---

function initDebugSpawner() {

    debugSpawnerOverlay = document.getElementById('debug-spawner-overlay');

    debugEnemyGrid = document.getElementById('debug-enemy-grid');

    closeDebugSpawnerButton = document.getElementById('close-debug-spawner-button');



    if (!debugSpawnerOverlay || !debugEnemyGrid) {

        console.warn('Debug spawner elements not found');

        return;

    }



    // console.log('Debug Spawner initialized. Press Shift+1 to open.');

    populateDebugEnemyGrid();



    if (closeDebugSpawnerButton) {

        // Update button to "Back" with Gold B

        closeDebugSpawnerButton.innerHTML = '<span class="hotkey-highlight">B</span>ack';

        closeDebugSpawnerButton.addEventListener('click', hideDebugSpawner);

    }

}



function populateDebugEnemyGrid() {

    if (!debugEnemyGrid) return;

    debugEnemyGrid.innerHTML = '';

    if (typeof UNIT_DATA === 'undefined') return;



    // Enemy section

    const enemyTypes = Object.keys(UNIT_DATA).filter(type => UNIT_DATA[type].team === 'enemy');



    // Sorting Logic

    enemyTypes.sort((a, b) => {

        // defined specific pairs

        if (a === 'shaman' && b === 'shaman_totem') return -1;

        if (a === 'shaman_totem' && b === 'shaman') return 1;

        if (a === 'treasure_hunter' && b === 'stalker') return -1;

        if (a === 'stalker' && b === 'treasure_hunter') return 1;



        // Bosses/Rares to the end

        const rareA = UNIT_DATA[a].isBoss || UNIT_DATA[a].isRare || ['goblin_king', 'goblin_mother', 'enraged_goblin', 'doppleganger'].includes(a);

        const rareB = UNIT_DATA[b].isBoss || UNIT_DATA[b].isRare || ['goblin_king', 'goblin_mother', 'enraged_goblin', 'doppleganger'].includes(b);



        if (rareA && !rareB) return 1;

        if (!rareA && rareB) return -1;



        // Default sort (optional, but keeps things stable)

        return a.localeCompare(b);

    });



    const enemyHeader = document.createElement('div');

    enemyHeader.className = 'debug-section-header';

    enemyHeader.textContent = 'Enemies';

    enemyHeader.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--color-error); font-weight: bold; padding: 5px; border-bottom: 1px solid var(--color-wood-dark);';

    debugEnemyGrid.appendChild(enemyHeader);



    enemyTypes.forEach(enemyType => {

        const button = document.createElement('div');

        button.className = 'debug-enemy-button';

        button.dataset.enemyType = enemyType;

        button.title = UNIT_DATA[enemyType]?.name || enemyType;



        const sprite = document.createElement('div');

        sprite.className = 'debug-enemy-sprite';

        const unitData = UNIT_DATA[enemyType];



        // Determine filter class based on unit type/data

        let filterClass = '';

        if (unitData) {

            if (unitData.forceCssVariant) filterClass = `goblin-${unitData.forceCssVariant}`;

            else if (unitData.cssVariant) filterClass = `goblin-${unitData.cssVariant}`;

        }



        const variant = 'green';



        try {

            const spriteStyles = getSpritePositionStyles(enemyType, 'idle', variant);

            if (spriteStyles && spriteStyles.backgroundImage) {

                sprite.style.backgroundImage = spriteStyles.backgroundImage;

                sprite.style.backgroundPosition = spriteStyles.backgroundPosition;

                sprite.style.backgroundSize = spriteStyles.backgroundSize;

            }

            // Apply filter class

            if (filterClass) {

                sprite.classList.add(filterClass);

                // Also apply to button if needed, but sprite usually carries the filter in this CSS

                // If the filter is on the sprite, good. 

            }

        } catch (e) { console.error(`Error getting sprite for ${enemyType}:`, e); }



        button.appendChild(sprite);

        button.addEventListener('click', () => selectEnemyForSpawn(enemyType, button));

        debugEnemyGrid.appendChild(button);



        // Apply exact visual logic from setUnitVariantClass/getUnitFilterString

        if (unitData) {

            // 1. Classes

            if (unitData.forceCssVariant) sprite.classList.add(`goblin-${unitData.forceCssVariant}`);

            else if (enemyType.startsWith('goblin') || enemyType.startsWith('orc') || enemyType.startsWith('zul')) sprite.classList.add('goblin-green');



            // 2. Filters (Mock unit object to use shared logic)

            const mockUnit = {

                type: enemyType,

                variantType: unitData.variantType || 'green',

                team: 'enemy',

                isElite: false,

                element: sprite // Hack to check classList if needed

            };



            // Manually replicate getUnitFilterString logic for the variants that matter

            let directFilters = [];

            // From getUnitFilterString lines 523-527

            if (unitData.forceCssVariant === 'gold') {

                directFilters.push('sepia(1) saturate(3) hue-rotate(-15deg) brightness(1.6) contrast(1.4)');

                directFilters.push('drop-shadow(0 0 5px rgba(255, 215, 0, 0.8))');

            } else if (unitData.forceCssVariant === 'bloodOrange') {

                directFilters.push('sepia(1) saturate(7) hue-rotate(360deg) brightness(1.1) contrast(1.4)');

                directFilters.push('drop-shadow(0 0 8px rgba(255, 69, 0, 0.9))');

                directFilters.push('sepia(1) saturate(3) hue-rotate(260deg) brightness(0.9)');

                directFilters.push('drop-shadow(0 0 5px rgba(190, 60, 255, 0.9))');

            } else if (unitData.forceCssVariant === 'ice-blue') {

                directFilters.push('hue-rotate(180deg) saturate(2) brightness(1.1) contrast(1.1)');

                directFilters.push('drop-shadow(0 0 8px rgba(0, 191, 255, 0.9))');

            }



            // Apply shadow

            directFilters.push('var(--unit-base-shadow)');



            if (directFilters.length > 0) {

                sprite.style.filter = directFilters.join(' ');

            }

        }

    });



    // Player section (Humans)

    const playerTypes = Object.keys(UNIT_DATA).filter(type => UNIT_DATA[type].team === 'player');



    const playerHeader = document.createElement('div');

    playerHeader.className = 'debug-section-header';

    playerHeader.textContent = 'Player Units';

    playerHeader.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--color-heal); font-weight: bold; padding: 5px; border-bottom: 1px solid var(--color-wood-dark); margin-top: 10px;';

    debugEnemyGrid.appendChild(playerHeader);



    playerTypes.forEach(playerType => {

        const button = document.createElement('div');

        button.className = 'debug-enemy-button debug-player-button';

        button.dataset.enemyType = playerType;

        button.title = UNIT_DATA[playerType]?.name || playerType;



        const sprite = document.createElement('div');

        sprite.className = 'debug-enemy-sprite';

        const variant = 'grey'; // Player units use grey armor by default



        try {

            const spriteStyles = getSpritePositionStyles(playerType, 'idle', variant);

            if (spriteStyles && spriteStyles.backgroundImage) {

                sprite.style.backgroundImage = spriteStyles.backgroundImage;

                sprite.style.backgroundPosition = spriteStyles.backgroundPosition;

                sprite.style.backgroundSize = spriteStyles.backgroundSize;

            }

        } catch (e) { console.error(`Error getting sprite for ${playerType}:`, e); }



        button.appendChild(sprite);

        button.addEventListener('click', () => selectEnemyForSpawn(playerType, button));

        debugEnemyGrid.appendChild(button);

    });

}



function selectEnemyForSpawn(enemyType, buttonElement) {

    debugEnemyGrid.querySelectorAll('.debug-enemy-button').forEach(btn => btn.classList.remove('selected'));

    selectedEnemyType = enemyType;

    buttonElement.classList.add('selected');

    debugSpawnMode = true;

    if (gameBoard) gameBoard.classList.add('debug-spawn-mode');

    hideDebugSpawner();

}



function toggleDebugSpawner() {

    if (isDebugSpawnerOpen()) hideDebugSpawner();

    else showDebugSpawner();

}



function showDebugSpawner() {

    if (!debugSpawnerOverlay) return;

    populateDebugEnemyGrid();

    debugSpawnerOverlay.classList.remove('hidden');

    debugSpawnerOverlay.classList.add('visible');

}



function hideDebugSpawner() {

    if (!debugSpawnerOverlay) return;

    debugSpawnerOverlay.classList.remove('visible');

    debugSpawnerOverlay.classList.add('hidden');

    startTooltipUpdater();

}



function isDebugSpawnerOpen() {

    return debugSpawnerOverlay && debugSpawnerOverlay.classList.contains('visible');

}



// Global key listener for debug spawner

document.addEventListener('keydown', (e) => {

    if (e.shiftKey && (e.key === '1' || e.key === '!') && cheatsUnlocked) {

        e.preventDefault();

        e.stopPropagation();

        toggleDebugSpawner();

        return false;

    }

    if (e.key === 'Escape' && isDebugSpawnerOpen()) {

        e.preventDefault();

        e.stopPropagation();

        hideDebugSpawner();

        return false;

    }

    // 'B' (Back) hotkey for Debug Spawner

    if (e.key.toLowerCase() === 'b' && isDebugSpawnerOpen()) {

        e.preventDefault();

        e.stopPropagation();

        hideDebugSpawner();

        return false;

    }

}, true);



// --- Forest Armor UI Functions ---

function initForestArmorUI() {

    forestArmorAbilityButton = document.getElementById('forest-armor-ability');

    forestArmorContainer = document.getElementById('forest-armor-container');



    if (forestArmorAbilityButton) {

        forestArmorAbilityButton.addEventListener('click', () => {

            if (equippedArmorId === 'green' && forestArmorUses && forestArmorActiveTurns <= 0) {

                if (typeof activateForestArmor === 'function') activateForestArmor();

            }

        });

    }

    updateForestArmorButton();

}



function updateForestArmorButton() {

    if (!forestArmorContainer) return;

    if (!forestArmorContainer) return;

    const effectiveArmorId = (typeof equippedArmorId !== 'undefined') ? equippedArmorId : window.equippedArmorId;
    const isForestArmorEquipped = effectiveArmorId === 'green';



    if (isForestArmorEquipped) {

        forestArmorContainer.classList.remove('hidden');

        forestArmorContainer.style.display = 'flex';

    } else {

        forestArmorContainer.classList.add('hidden');

        forestArmorContainer.style.display = 'none';

    }



    if (isForestArmorEquipped && forestArmorAbilityButton) {

        const canUse = forestArmorUses && forestArmorActiveTurns <= 0;

        forestArmorAbilityButton.classList.toggle('locked', !canUse);

        forestArmorAbilityButton.classList.toggle('used', !canUse && forestArmorActiveTurns > 0);

        forestArmorAbilityButton.classList.toggle('available', canUse);

    }

}











function showLeaderboard(showInput = false, level = 0, gold = 0) {

    hideAllOverlays();

    if (!leaderboardOverlay) return;



    if (!isGameActive()) {
        mainMenu?.classList.remove('hidden');
        mainMenu?.classList.add('visible');
    }

    leaderboardOverlay.classList.remove('hidden');
    leaderboardOverlay.classList.add('visible');



    const inputPanel = document.getElementById('leaderboard-entry');

    if (inputPanel) {

        inputPanel.classList.toggle('hidden', !showInput);

        if (showInput) {

            if (playerNameInput) playerNameInput.value = (gameSettings && gameSettings.playerName) || "Hero";

            if (submitScoreButton) {

                submitScoreButton.onclick = () => {

                    const name = (playerNameInput && playerNameInput.value) || "Hero";

                    if (typeof updateSetting === 'function') updateSetting('playerName', name);

                    const achievementCount = Object.values(achievementProgress || {}).filter(a => a.unlocked).length;

                    if (typeof saveScoreToLeaderboard === 'function') {

                        saveScoreToLeaderboard(level, gold, name, achievementCount);

                    }

                    inputPanel.classList.add('hidden');

                    showLeaderboard(false);

                };

            }

        }

    }



    showLeaderboardLists();

    startTooltipUpdater();

}



async function showLeaderboardLists() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '<li class="loading-entry">Loading Scores...</li>';

    let globalEntries = [];
    if (window.OnlineLeaderboard && window.OnlineLeaderboard.isInitialized()) {
        try {
            globalEntries = await window.OnlineLeaderboard.fetchLeaderboard(50);
        } catch (e) {
            console.error("Failed to fetch global scores:", e);
        }
    }

    // Use global entries exclusively (Local removed per request)
    const finalEntries = globalEntries;

    if (!finalEntries || finalEntries.length === 0) {
        leaderboardList.innerHTML = '<li class="empty-leaderboard">No scores yet. Prove your worth!</li>';
        return;
    }



    let combinedEntries = [...finalEntries];



    // Filter by Naked Challenge

    if (currentLeaderboardFilter === 'regular') {

        combinedEntries = combinedEntries.filter(entry => !entry.nakedChallenge);

    } else if (currentLeaderboardFilter === 'naked') {

        combinedEntries = combinedEntries.filter(entry => entry.nakedChallenge);

    }



    // Sort by Level DESC, then Achievements DESC, then Timestamp/Date DESC

    combinedEntries.sort((a, b) => {

        if (b.level !== a.level) return b.level - a.level;

        const bAch = b.achievements || 0;

        const aAch = a.achievements || 0;

        if (bAch !== aAch) return bAch - aAch;

        const bTime = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);

        const aTime = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);

        return bTime - aTime;

    });



    leaderboardList.innerHTML = '';

    renderEntries(combinedEntries.slice(0, 50));

}



function renderEntries(entries) {

    if (!entries || entries.length === 0) {

        leaderboardList.innerHTML = '<li class="empty-entry">No records found.</li>';

        return;

    }



    const localProfiles = typeof getProfileList === 'function' ? getProfileList() : [];



    entries.forEach((entry, index) => {
        const item = document.createElement('li');
        const isCurrentPlayer = (entry.name === gameSettings.playerName);
        const isLocalProfile = localProfiles.includes(entry.name);

        item.className = 'leaderboard-row';
        if (isCurrentPlayer) item.classList.add('highlight-player');
        if (isLocalProfile) item.classList.add('local-profile-row');

        let dateStr = '-';
        if (entry.date) {
            const d = new Date(entry.date);
            if (!isNaN(d)) dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        } else if (entry.timestamp) {
            const d = new Date(entry.timestamp);
            if (!isNaN(d)) dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }

        const achCount = entry.achievements !== undefined ? entry.achievements : 0;
        const totalAch = Object.keys(ACHIEVEMENT_DATA || {}).length || 26;
        const nakedIcon = entry.nakedChallenge ? '<span class="naked-challenge-icon" title="Naked Challenge">🛡️</span>' : '';

        // Sprite Rendering Logic
        const armorId = entry.armorId || 'grey';
        const helmetId = entry.helmetId || 'none';
        const flameCloak = entry.flameCloak === true;

        const spriteStyles = getSpritePositionStyles('knight', 'idle', armorId);
        const gearConfig = SPRITESHEET_CONFIG.gear;
        const unitRow = gearConfig?.unitRows['knight'];

        let gearLayersHtml = '';
        if (gearConfig && typeof unitRow !== 'undefined') {
            const addLayer = (itemKey) => {
                const colDiff = gearConfig.itemColumns[itemKey];
                if (typeof colDiff === 'undefined') return '';
                const xPercent = gearConfig.columns > 1 ? (colDiff / (gearConfig.columns - 1)) * 100 : 0;
                let effectiveRow = unitRow;
                if (itemKey === 'glacier_bow') effectiveRow = 2;
                const yPercent = gearConfig.rows > 1 ? (effectiveRow / (gearConfig.rows - 1)) * 100 : 0;
                return `<div class="p-gear-layer" style="background-image: url('${gearConfig.imageUrl}'); background-size: ${gearConfig.columns * 100}% ${gearConfig.rows * 100}%; background-position: ${xPercent}% ${yPercent}%;"></div>`;
            };

            if (flameCloak) gearLayersHtml += addLayer('flame_cloak');
            if (helmetId === 'goblin_mother_skull') gearLayersHtml += addLayer('goblin_mother_skull');
        }

        const spriteHtml = `
            <div class="p-sprite-container" style="width: 38px; height: 38px; background: none; border: none; box-shadow: none;">
                <div class="p-knight-sprite" style="transform: scale(1.2); background-image: ${spriteStyles.backgroundImage}; background-position: ${spriteStyles.backgroundPosition}; background-size: ${spriteStyles.backgroundSize};">
                    ${gearLayersHtml}
                </div>
            </div>
        `;

        item.innerHTML = `
            <span class="lb-rank">#${index + 1}</span>
            <span class="lb-sprite">${spriteHtml}</span>
            <span class="lb-name">${nakedIcon}${entry.name || 'Unknown'}</span>
            <span class="lb-level">${entry.level}</span>
            <span class="lb-achievements">${achCount} / ${totalAch}</span>
            <span class="lb-date">${dateStr}</span>
        `;
        leaderboardList.appendChild(item);
    });

}

document.addEventListener('DOMContentLoaded', () => {

    if (typeof loadSettings === 'function') loadSettings();

    gameContainer = document.getElementById('game-container'); gameBoardWrapper = document.getElementById('game-board-wrapper'); gameBoard = document.getElementById('game-board'); defaultViewButton = document.getElementById('default-view-button'); fillWidthButton = document.getElementById('fill-width-button'); gridContent = document.getElementById('grid-content'); uiPanel = document.getElementById('ui-panel'); levelDisplayElement = document.getElementById('level-display'); sideGoldDisplay = document.getElementById('side-gold-display'); sideGoldAmountElement = document.getElementById('side-gold-amount'); actionsLeftDisplayElement = document.getElementById('actions-display'); spellAreaElement = document.getElementById('spell-area'); fireballElement = document.getElementById('fireball-spell'); flameWaveElement = document.getElementById('flame-wave-spell'); frostNovaElement = document.getElementById('frost-nova-spell'); healElement = document.getElementById('heal-spell'); unitInfo = document.getElementById('unit-info'); unitPortraitElement = document.getElementById('unit-portrait'); unitNameDisplay = document.getElementById('unit-name'); unitAtkDisplay = document.getElementById('unit-atk'); unitMovDisplay = document.getElementById('unit-mov'); unitRngDisplay = document.getElementById('unit-rng'); unitStatusDisplay = document.getElementById('unit-status'); unitHpBarContainer = unitInfo?.querySelector('.unit-hp-bar-container'); unitHpBarElement = unitHpBarContainer?.querySelector('.unit-hp-bar'); boardFeedbackArea = document.getElementById('board-feedback-area'); endTurnButton = document.getElementById('end-turn-button'); mainMenu = document.getElementById('main-menu'); startGameButton = document.getElementById('start-game-button'); leaderboardMenuButton = document.getElementById('leaderboard-menu-button'); achievementsMenuButton = document.getElementById('achievements-menu-button'); settingsMenuButton = document.getElementById('settings-menu-button'); gameOverScreen = document.getElementById('game-over-screen'); restartButton = document.getElementById('restart-button'); gameOverTitle = document.getElementById('game-over-title'); gameOverMessage = document.getElementById('game-over-message'); gameOverToTitleButton = document.getElementById('game-over-to-title-button'); tooltipElement = document.getElementById('tooltip'); menuButton = document.getElementById('menu-button'); menuOverlay = document.getElementById('menu-overlay'); closeMenuButton = document.getElementById('close-menu-button'); quitButton = document.getElementById('quit-button'); menuOptionsButton = document.getElementById('menu-options-button'); quitToMainMenuButton = document.getElementById('quit-to-main-menu-button'); leaderboardOverlay = document.getElementById('leaderboard-overlay'); leaderboardList = document.getElementById('leaderboard-list'); closeLeaderboardButton = document.getElementById('close-leaderboard-button'); leaderboardEntry = document.getElementById('leaderboard-entry'); playerNameInput = document.getElementById('player-name-input'); submitScoreButton = document.getElementById('submit-score-button'); levelSelectScreen = document.getElementById('level-select-screen'); levelSelectMapContainer = document.getElementById('level-select-map-container'); levelSelectMap = document.getElementById('level-select-map'); levelSelectDotsLayer = document.getElementById('level-select-dots-layer'); backToMainMenuButton = document.getElementById('back-to-main-menu-button'); levelSelectTroopsButton = document.getElementById('level-select-troops-button'); levelSelectShopButton = document.getElementById('level-select-shop-button'); menuGoldAmountElement = document.getElementById('menu-gold-amount'); menuGoldDisplay = document.getElementById('menu-gold-display'); shopScreen = document.getElementById('shop-screen'); shopItemsContainer = document.getElementById('shop-items-container'); shopGoldAmountElement = document.getElementById('shop-gold-amount'); shopGoldDisplay = document.getElementById('shop-gold-display'); shopActionButton = document.getElementById('shop-action-button'); shopExitButton = document.getElementById('shop-exit-button'); shopFeedbackElement = document.getElementById('shop-feedback'); shopSelectedItemInfoElement = document.getElementById('shop-selected-item-info'); shopTroopsButton = document.getElementById('shop-tab-troops'); shopTroopsTabContent = document.getElementById('shop-troops-tab-content'); levelCompleteScreen = document.getElementById('level-complete-screen'); levelCompleteTitle = document.getElementById('level-complete-title'); levelCompleteStats = document.getElementById('level-complete-stats'); statsEnemiesKilled = document.getElementById('stats-enemies-killed'); statsUnitsLost = document.getElementById('stats-units-lost'); statsGoldGained = document.getElementById('stats-gold-gained'); levelCompleteBonuses = document.getElementById('level-complete-bonuses'); statsBonusList = document.getElementById('stats-bonus-list'); statsTotalGold = document.getElementById('stats-total-gold'); nextLevelButton = document.getElementById('next-level-button'); levelCompleteShopButton = document.getElementById('level-complete-shop-button'); levelCompleteTotalGoldElement = document.getElementById('level-complete-total-gold'); chooseTroopsScreen = document.getElementById('choose-troops-screen'); chooseTroopsTitle = document.getElementById('choose-troops-title'); currentTroopsList = document.getElementById('current-troops-list'); availableTroopsList = document.getElementById('available-troops-list'); currentRosterCountElement = document.getElementById('current-roster-count'); maxRosterSizeElement = document.getElementById('max-roster-size'); chooseTroopsFeedback = document.getElementById('choose-troops-feedback'); confirmTroopsButton = document.getElementById('confirm-troops-button'); troopsBackButton = document.getElementById('troops-back-button'); unitHpBarsOverlay = document.getElementById('unit-hp-bars-overlay'); settingsOverlay = document.getElementById('settings-overlay'); closeSettingsButton = document.getElementById('close-settings-button'); achievementsOverlay = document.getElementById('achievements-overlay'); closeAchievementsButton = document.getElementById('close-achievements-button'); achievementsListElement = document.getElementById('achievements-list'); achievementCompletionStatusElement = document.getElementById('achievement-completion-status'); levelSelectPagination = document.getElementById('level-select-pagination'); levelSelectPrevPage = document.getElementById('level-select-prev-page'); levelSelectNextPage = document.getElementById('level-select-next-page'); levelSelectPageInfo = document.getElementById('level-select-page-info'); musicVolumeSlider = document.getElementById('music-volume'); musicVolumeValueSpan = document.querySelector('#music-volume + .volume-value'); sfxVolumeSlider = document.getElementById('sfx-volume'); sfxVolumeValueSpan = document.querySelector('#sfx-volume + .volume-value'); muteToggleSetting = document.getElementById('toggle-mute-setting'); fullscreenToggleSetting = document.getElementById('toggle-fullscreen-setting'); playerNameSettingInput = document.getElementById('player-name-setting'); abilityStealthButton = document.getElementById('ability-stealth'); abilityQuickStrikeButton = document.getElementById('ability-quick-strike'); namePromptOverlay = document.getElementById('name-prompt-overlay'); initialPlayerNameInput = document.getElementById('initial-player-name-input'); confirmNameButton = document.getElementById('confirm-name-button');

    customAlertOverlay = document.getElementById('custom-alert-overlay');

    customAlertTitle = document.getElementById('custom-alert-title');

    customAlertMessage = document.getElementById('custom-alert-message');

    customAlertConfirmButton = document.getElementById('custom-alert-confirm-button');







    // window.addEventListener('resize', handleResize, { passive: true });
    if (window.ResizeObserver && gameBoardWrapper) {
        const ro = new ResizeObserver(() => handleResize());
        ro.observe(gameBoardWrapper);
        // Also observe gameContainer for good measure if it exists
        if (gameContainer) ro.observe(gameContainer);
    } else {
        window.addEventListener('resize', handleResize, { passive: true });
    }
    window.addEventListener('keydown', handleKeyDown); document.addEventListener('mousemove', trackMousePosition); document.addEventListener('fullscreenchange', updateFullscreenButton); document.addEventListener('webkitfullscreenchange', updateFullscreenButton); document.addEventListener('mozfullscreenchange', updateFullscreenButton); document.addEventListener('MSFullscreenChange', updateFullscreenButton);

    gameBoard?.addEventListener('mousedown', handlePanStart); gameBoard?.addEventListener('wheel', handleZoom, { passive: false }); gameBoard?.addEventListener('touchstart', handlePanStartTouch, { passive: true }); gameBoard?.addEventListener('touchstart', handlePinchStart, { passive: false }); gameBoard?.addEventListener('touchmove', handlePinchMove, { passive: false }); gameBoard?.addEventListener('touchend', handlePinchEnd, { passive: false });

    [fireballElement, flameWaveElement, frostNovaElement, healElement].forEach(el => { if (el) { el.addEventListener('mouseenter', handleSpellIconMouseEnter); el.addEventListener('mouseleave', handleSpellIconMouseLeave); } });

    // Consolidate par timer tooltip into the polling system only
    // Manual listeners removed to prevent flickering/brief appearance issues




    menuGoldDisplay?.addEventListener('mouseenter', handleGoldDisplayMouseEnter); menuGoldDisplay?.addEventListener('mouseleave', handleGoldDisplayMouseLeave); shopGoldDisplay?.addEventListener('mouseenter', handleGoldDisplayMouseEnter); shopGoldDisplay?.addEventListener('mouseleave', handleGoldDisplayMouseLeave);

    const parContainer = document.getElementById('par-timer-container');
    if (parContainer) {
        parContainer.addEventListener('click', () => {
            if (isGameActive() && typeof showTooltip === 'function') {
                showTooltip(null, 'par');
            }
        });
    }

    gridContent?.addEventListener('mouseleave', handleGridMouseLeave); defaultViewButton?.addEventListener('click', () => centerView(false)); fillWidthButton?.addEventListener('click', () => fillWidthView(false));

    startGameButton?.addEventListener('click', () => {

        playSfx('select');

        let currentName = (typeof gameSettings !== 'undefined' && gameSettings.playerName) ? gameSettings.playerName : null;



        // Fallback: Check localStorage if name is missing or default "Hero"

        if (!currentName || currentName === "Hero") {

            try {

                // 1. Check for last active game data

                const savedData = localStorage.getItem('knightsGambitGameData');

                if (savedData) {

                    const parsed = JSON.parse(savedData);

                    if (parsed.settings && parsed.settings.playerName && parsed.settings.playerName !== "Hero") {

                        currentName = parsed.settings.playerName;

                    }

                }



                // 2. If still no name, check for ANY existing profile

                if (!currentName || currentName === "Hero") {

                    const profiles = typeof getProfileList === 'function' ? getProfileList() : [];

                    if (profiles && profiles.length > 0) {

                        // Auto-load the most recent (last in list)

                        const lastName = profiles[profiles.length - 1];

                        if (lastName) {

                            currentName = lastName;

                            // We should probably switch to it? 

                            // For now, just setting currentName allows the check to pass. 

                            // The actual game load logic will need to handle loading that profile.

                            // But 'startGameButton' just hides menu and shows LevelSelect.

                            // LevelSelect usually reads from current global state.

                            // If global state is "Hero", we might need to load the profile.

                            if (typeof loadGameData === 'function') {

                                // DIRECTLY LOAD without "switching" (which saves old state first)

                                if (typeof gameSettings !== 'undefined') gameSettings.playerName = currentName;

                                saveSettings(); // Save the FACT that we are using this profile

                                loadGameData(); // Load the actual data

                                if (typeof updateUiForNewLevel === 'function') updateUiForNewLevel();

                            }

                        }

                    }

                }



                // Sync back to global settings

                if (currentName && currentName !== "Hero") {
                    if (typeof gameSettings !== 'undefined') {
                        gameSettings.playerName = currentName;
                    }
                }



            } catch (e) {

                console.error("Error reading saved profile name:", e);

            }

        }



        if (!currentName || currentName === "Hero") {

            showNamePrompt();

        } else {

            hideMainMenu();

            showLevelSelect();

        }

    });



    confirmNameButton?.addEventListener('click', async () => {
        const name = initialPlayerNameInput?.value.trim();
        if (name) {
            // Check online availability and reserve
            if (window.OnlineLeaderboard && window.OnlineLeaderboard.isInitialized()) {
                const isTaken = await window.OnlineLeaderboard.isNameTaken(name);
                if (isTaken) {
                    playSfx('error');
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert(`The name "${name}" is already taken by another player online. Please choose a different name.`, "Name Taken");
                    } else alert(`The name "${name}" is already taken online.`);
                    return;
                }
                // Reserve it
                await window.OnlineLeaderboard.reserveName(name);
            }

            playSfx('select');
            if (typeof updateSetting === 'function') updateSetting('playerName', name);
            if (typeof addProfileToList === 'function') addProfileToList(name);
            hideNamePrompt();
            hideMainMenu();
            showLevelSelect();
            updateProfileDisplay();
        } else {
            playSfx('error');
        }
    });





    initialPlayerNameInput?.addEventListener('keypress', (e) => {

        if (e.key === 'Enter') confirmNameButton?.click();

    });

    leaderboardMenuButton?.addEventListener('click', () => { playSfx('select'); showLeaderboard(); });



    // Leaderboard Tabs

    document.querySelectorAll('.leaderboard-tab-button').forEach(btn => {

        btn.addEventListener('click', (e) => {

            const filter = e.target.dataset.filter;

            if (filter === currentLeaderboardFilter) return;



            playSfx('select');

            currentLeaderboardFilter = filter;



            // Update active tab visual

            document.querySelectorAll('.leaderboard-tab-button').forEach(b => b.classList.remove('active'));

            e.target.classList.add('active');



            showLeaderboard();

        });

    });



    settingsMenuButton?.addEventListener('click', () => { playSfx('select'); showSettings(false); });

    achievementsMenuButton?.addEventListener('click', () => { playSfx('select'); showAchievements(); });

    gameOverToTitleButton?.addEventListener('click', () => {

        playSfx('select');

        const titleText = gameOverTitle?.textContent.toLowerCase() || "";

        if (titleText.includes("victory")) {

            showMainMenu();

        } else {

            showLevelSelect();

        }

    });

    restartButton?.addEventListener('click', () => { if (!isGameOverScreenVisible()) return; playSfx('select'); const titleText = gameOverTitle?.textContent.toLowerCase() || ""; if (titleText.includes("victory") || titleText.includes("forfeited")) showMainMenu(); else { hideGameOverScreen(); showChooseTroopsScreen(levelToRestartOnLoss, 'restart'); } });

    endTurnButton?.addEventListener('click', () => {

        if (levelClearedAwaitingInput) {

            // Check if there are still cages to rescue

            const cagesRemaining = obstacles.some(o => o.type.startsWith('cage_') && o.type !== 'cage_broken' && isObstacleIntact(o));

            if (cagesRemaining) {

                playSfx('error');

                if (typeof showFeedback === 'function') showFeedback("Rescue the prisoner first!", "feedback-error", 2000);

                return;

            }

            playSfx('select');

            if (typeof completeLevelAndShowSummary === 'function') completeLevelAndShowSummary();

            else { hideLevelComplete(); proceedToNextLevelOrLocation(); }

        } else if (isGameActive() && currentTurn === 'player' && !isProcessing) {

            playSfx('select');

            endTurn();

        }

    });

    menuButton?.addEventListener('click', () => { playSfx('select'); showMenu(); });

    menuOptionsButton?.addEventListener('click', () => { playSfx('select'); hideMenu(); showSettings(true); });

    quitButton?.addEventListener('click', () => { if (!isMenuOpen()) return; const action = quitButton.dataset.action; playSfx('select'); hideMenu(); if (action === "forfeit") { if (typeof forfeitLevel === 'function') forfeitLevel(); } else { showLevelSelect(); } });

    quitToMainMenuButton?.addEventListener('click', () => { playSfx('menuClose'); hideMenu(); showMainMenu(); });

    closeMenuButton?.addEventListener('click', () => { playSfx('menuClose'); hideMenu(); });

    closeLeaderboardButton?.addEventListener('click', () => { playSfx('menuClose'); hideLeaderboard(); showMainMenu(); });

    backToMainMenuButton?.addEventListener('click', () => { playSfx('menuClose'); showMainMenu(); });

    levelSelectTroopsButton?.addEventListener('click', () => { if (!isLevelSelectOpen()) return; playSfx('select'); hideLevelSelect(); showChooseTroopsScreen(0, 'levelSelect'); });

    levelSelectShopButton?.addEventListener('click', () => { if (!isLevelSelectOpen()) return; playSfx('select'); hideLevelSelect(); showShop('levelSelect', false); });

    levelSelectPrevPage?.addEventListener('click', () => { playSfx('select'); handleLevelSelectPageChange(-1); });

    levelSelectNextPage?.addEventListener('click', () => { playSfx('select'); handleLevelSelectPageChange(1); });

    levelSelectMapContainer?.addEventListener('mousedown', handleMapPanStart); levelSelectMapContainer?.addEventListener('wheel', handleMapWheel, { passive: false }); levelSelectMapContainer?.addEventListener('touchstart', handleMapPanStartTouch, { passive: true });

    levelCompleteShopButton?.addEventListener('click', () => { playSfx('select'); hideLevelComplete(); showShop('levelComplete', true); });

    nextLevelButton?.addEventListener('click', () => { playSfx('select'); hideLevelComplete(); proceedToNextLevelOrLocation(); });

    // Roster Validation for Troops Screen

    const validateAndCloseTroops = () => {

        // Only validate if we are actually ON the troops tab

        if (currentShopTab === 'troops') {

            const rosterCount = Object.values(playerActiveRoster || {}).reduce((s, c) => s + c, 0);

            if (rosterCount === 0) {

                playSfx('error');

                showCustomAlert("You must have at least 1 unit in your roster!", "Empty Roster");

                return false;

            }

        }

        return true;

    };



    shopExitButton?.addEventListener('click', () => {

        if (!validateAndCloseTroops()) return;

        playSfx('menuClose');

        hideShop();

        proceedAfterShopMaybe();

    });



    // If clicking troops button again or handling other tabs? 

    // Usually tabs switch themselves. If leaving troops tab?

    // For now, let's just enforce on EXIT. 

    shopTroopsButton?.addEventListener('click', () => {

        if (!isShopOpen()) return;

        playSfx('select');

        // No validation needed to ENTER troops screen

        hideShop();

        showChooseTroopsScreen(shopIsBetweenLevels ? 0 : currentLevel, 'shop');

    });



    shopActionButton?.addEventListener('click', handleShopActionClick);

    // Deselect shop item when clicking away
    shopScreen?.addEventListener('click', (e) => {
        if (selectedShopItemId && !e.target.closest('.shop-item') && !e.target.closest('#shop-action-button') && !e.target.closest('.shop-tabs')) {
            const previousItem = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`);
            previousItem?.classList.remove('selected');
            selectedShopItemId = null;
            updateShopActionInfo();
        }
    });


    closeSettingsButton?.addEventListener('click', () => { playSfx('menuClose'); hideSettings(); });

    closeAchievementsButton?.addEventListener('click', () => { playSfx('menuClose'); hideAchievements(); });



    fireballElement?.addEventListener('click', () => setActiveSpell('fireball')); flameWaveElement?.addEventListener('click', () => setActiveSpell('flameWave')); frostNovaElement?.addEventListener('click', () => setActiveSpell('frostNova')); healElement?.addEventListener('click', () => setActiveSpell('heal'));

    abilityStealthButton?.addEventListener('click', () => { if (selectedUnit && !abilityStealthButton.disabled) activateRogueStealth(selectedUnit); });

    abilityQuickStrikeButton?.addEventListener('click', () => { if (selectedUnit && !abilityQuickStrikeButton.disabled) activateRogueQuickStrike(selectedUnit); });

    bgMusic.addEventListener('ended', selectAndLoadMusic);



    // Unified Settings Listeners (Merged Menu + Standalone Settings)


    document.querySelectorAll('.music-volume-slider').forEach(slider => {
        updateSliderFill(slider);
        slider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            setVolume('music', volume);
            document.querySelectorAll('.music-volume-slider').forEach(s => {
                s.value = volume;
                updateSliderFill(s);
            });
            document.querySelectorAll('.music-volume-value').forEach(v => v.textContent = `${Math.round(volume * 100)}%`);
        });
        slider.addEventListener('change', () => updateSetting('musicVolume', musicVolume));
    });

    document.querySelectorAll('.sfx-volume-slider').forEach(slider => {
        updateSliderFill(slider);
        slider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            setVolume('sfx', volume);
            document.querySelectorAll('.sfx-volume-slider').forEach(s => {
                s.value = volume;
                updateSliderFill(s);
            });
            document.querySelectorAll('.sfx-volume-value').forEach(v => v.textContent = `${Math.round(volume * 100)}%`);
        });
        slider.addEventListener('change', () => {
            playSfx('select');
            updateSetting('sfxVolume', sfxVolume);
        });
    });




    document.querySelectorAll('.mute-toggle-checkbox').forEach(checkbox => {

        checkbox.addEventListener('change', (e) => {

            handleMuteToggle(true);

            document.querySelectorAll('.mute-toggle-checkbox').forEach(c => c.checked = isMuted);

        });

    });



    document.querySelectorAll('.fullscreen-toggle-checkbox').forEach(checkbox => {

        checkbox.addEventListener('change', (e) => {

            toggleFullscreen(false);

            setTimeout(() => {

                document.querySelectorAll('.fullscreen-toggle-checkbox').forEach(c => c.checked = isFullscreen());

            }, 100);

        });

    });







    // New consolidated buttons in settings overlay

    document.getElementById('mute-setting-button')?.addEventListener('click', () => {
        playSfx('select');
        handleMuteToggle(true);
        updateMuteButtonVisual();
        document.querySelectorAll('.mute-toggle-checkbox').forEach(c => c.checked = isMuted);
    });



    document.getElementById('fullscreen-setting-button')?.addEventListener('click', () => {
        playSfx('select');
        toggleFullscreen(false);
        updateFullscreenButton();
        setTimeout(() => {
            document.querySelectorAll('.fullscreen-toggle-checkbox').forEach(c => c.checked = isFullscreen());
            updateFullscreenButton();
        }, 150);
    });




    playerNameSettingInput?.addEventListener('change', async (e) => {

        const newName = e.target.value;

        updateSetting('playerName', newName);

        if (newName && typeof addProfileToList === 'function') addProfileToList(newName);

        updateProfileDisplay();

        if (newName && window.OnlineLeaderboard && window.OnlineLeaderboard.isInitialized()) {

            const isTaken = await window.OnlineLeaderboard.isNameTaken(newName);

            if (isTaken) {

                // Warn (could use showFeedback but this is in settings modal)

                // For now, let's just alert since standard 'alert' or custom feedback on modal needed

                // Or revert?

                // Let's assume user just needs to know.

                alert(`Username '${newName}' is already taken online. Please choose another.`);

                e.target.style.borderColor = 'red';

            } else {

                e.target.style.borderColor = '';

            }

        }

    });

    document.getElementById('restart-level-setting-button')?.addEventListener('click', () => {

        if (isGameActive()) {

            hideMenu();

            initGame(currentLevel);

            playSfx('select');

            // Restart music

            stopMusic();

            selectAndLoadMusic();

        } else playSfx('error');

    });



    let firstEverTouch = true;

    document.body.addEventListener('touchstart', (e) => {

        if (!audioInitialized) initializeAudio();

        if (isMobileDevice() && !isFullscreen()) {

            if (typeof toggleFullscreen === 'function') toggleFullscreen();

        }

        if (isMobileDevice() && e.touches.length > 0) {

            currentMouseX = e.touches[0].clientX;

            currentMouseY = e.touches[0].clientY;

            touchStartX = e.touches[0].clientX;

            touchStartY = e.touches[0].clientY;

            isTouchScrolling = false;

        }

    }, { capture: true, once: false });



    // Hide tooltips on ANY touch move (scrolling/panning)

    document.addEventListener('touchmove', (e) => {

        if (isMobileDevice() && e.touches.length > 0) {

            const touch = e.touches[0];

            currentMouseX = touch.clientX;

            currentMouseY = touch.clientY;

            const dist = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);

            if (dist > 15) {

                isTouchScrolling = true;

                hideTooltip();

            }

        }

    }, { passive: true });



    document.addEventListener('touchend', (e) => {

        if (isMobileDevice() && !isTouchScrolling) {

            // It was a tap! Update coordinates for the tap target

            if (e.changedTouches && e.changedTouches.length > 0) {

                currentMouseX = e.changedTouches[0].clientX;

                currentMouseY = e.changedTouches[0].clientY;

            }

            const { type, targetElement, targetData } = getTooltipTarget(e.target);

            if (targetElement && targetData) {

                showTooltip(targetData, type);

            } else {

                hideTooltip();

            }

        }

    }, { capture: true });



    // Also dismiss on scroll

    window.addEventListener('scroll', () => { if (isMobileDevice()) hideTooltip(); }, { passive: true });



    initDebugSpawner();

    initForestArmorUI();

    preloadAssetsAndStart();

    updateMuteButtonVisual();

    updateFullscreenButton();

    const muteBtn = document.getElementById('mute-button');

    if (muteBtn) muteBtn.addEventListener('click', () => { if (typeof playSfx === 'function') playSfx('select'); handleMuteToggle(); });

    const menuMuteBtn = document.getElementById('menu-mute-button');

    if (menuMuteBtn) menuMuteBtn.addEventListener('click', () => { if (typeof playSfx === 'function') playSfx('select'); handleMuteToggle(); });



    const fsBtn = document.getElementById('fullscreen-button');

    if (fsBtn) fsBtn.addEventListener('click', () => { if (typeof playSfx === 'function') playSfx('select'); toggleFullscreen(); });

    const menuFsBtn = document.getElementById('menu-fullscreen-button');

    if (menuFsBtn) menuFsBtn.addEventListener('click', () => { if (typeof playSfx === 'function') playSfx('select'); toggleFullscreen(); });

    requestAnimationFrame(() => { try { calculateCellSize(); } catch (e) { console.error("Initial RAF Error:", e); } });

    const mapPreload = new Image(); mapPreload.onload = () => { mapIntrinsicWidth = mapPreload.naturalWidth || 1024; mapIntrinsicHeight = mapPreload.naturalHeight || 1024; }; mapPreload.onerror = () => { mapIntrinsicWidth = 1024; mapIntrinsicHeight = 1024; }; mapPreload.src = WORLD_MAP_IMAGE_URL;



    // Profile UI Element Assignments

    accountsOverlay = document.getElementById('accounts-overlay');

    profilesListContainer = document.getElementById('profiles-list-container');

    closeAccountsButton = document.getElementById('close-accounts-button');

    newProfileOverlay = document.getElementById('new-profile-overlay');

    newProfileNameInput = document.getElementById('new-profile-name-input');

    confirmNewProfileButton = document.getElementById('confirm-new-profile-button');

    cancelNewProfileButton = document.getElementById('cancel-new-profile-button');

    currentProfileNameElement = document.getElementById('current-profile-name');

    newGameProfileButton = document.getElementById('new-game-profile-button');



    // Deletion UI

    deleteConfirmOverlay = document.getElementById('delete-confirm-overlay');

    confirmDeleteButton = document.getElementById('confirm-delete-button');

    cancelDeleteButton = document.getElementById('cancel-delete-button');

    deleteHeroNameDisplay = document.getElementById('delete-hero-name');



    // Profile UI Event Listeners

    if (currentProfileNameElement) currentProfileNameElement.addEventListener('click', showAccountsOverlay);

    if (closeAccountsButton) closeAccountsButton.addEventListener('click', hideAccountsOverlay);

    if (newGameProfileButton) newGameProfileButton.addEventListener('click', showNewProfileOverlay);

    if (cancelNewProfileButton) cancelNewProfileButton.addEventListener('click', hideNewProfileOverlay);

    if (confirmNewProfileButton) confirmNewProfileButton.addEventListener('click', handleCreateProfile);

    if (cancelDeleteButton) cancelDeleteButton.addEventListener('click', () => {

        if (deleteConfirmOverlay) {

            deleteConfirmOverlay.classList.remove('visible');

            deleteConfirmOverlay.classList.add('hidden');

        }

    });

    if (confirmDeleteButton) confirmDeleteButton.addEventListener('click', handleConfirmDelete);



    // Naked Challenge UI

    const nakedChallengeOverlay = document.getElementById('naked-challenge-overlay');

    const acceptNakedChallengeButton = document.getElementById('accept-naked-challenge-button');

    const declineNakedChallengeButton = document.getElementById('decline-naked-challenge-button');



    if (acceptNakedChallengeButton) {

        acceptNakedChallengeButton.addEventListener('click', () => {

            isNakedChallengeActive = true;

            equipArmor('none');

            saveGameData();

            playSfx('armorEquip');

            if (nakedChallengeOverlay) {

                nakedChallengeOverlay.classList.remove('visible');

                nakedChallengeOverlay.classList.add('hidden');

            }

            updateShopDisplay();

            if (shopFeedbackElement) {

                shopFeedbackElement.textContent = "Naked Challenge accepted! No Armor locked.";

                shopFeedbackElement.className = 'shop-message success';

            }

        });

    }



    if (declineNakedChallengeButton) {

        declineNakedChallengeButton.addEventListener('click', () => {

            equipArmor('none');

            playSfx('armorEquip');

            if (nakedChallengeOverlay) {

                nakedChallengeOverlay.classList.remove('visible');

                nakedChallengeOverlay.classList.add('hidden');

            }

            updateShopDisplay();

            if (shopFeedbackElement) {

                shopFeedbackElement.textContent = "Equipped No Armor.";

                shopFeedbackElement.className = 'shop-message success';

            }

        });

    }



    // Support Enter key in profile name input

    if (newProfileNameInput) {

        newProfileNameInput.addEventListener('keypress', (e) => {

            if (e.key === 'Enter') handleCreateProfile();

        });

    }



    // Make sure we show the correct profile name on start

    updateProfileDisplay();

});



function formatDescription(text) {

    if (!text) return '';

    let formatted = text;



    // Colorize "Max HP: 1" in Red FIRST (before gold regex can match it) - using inline style for specificity

    formatted = formatted.replace(/(Max HP:\s*1)/g, '<span style="color:#ff4444;">$1</span>');



    // Colorize "Fire Resist" as gold (matches +1 Fire Resist pattern)

    formatted = formatted.replace(/(\+\d+\s+Fire Resist)/g, '<span style="color:var(--color-gold-light);">$1</span>');

    formatted = formatted.replace(/(\+\d+\s+Frost Resist)/g, '<span style="color:var(--color-gold-light);">$1</span>');

    formatted = formatted.replace(/(-\d+\s+ATK from enemies)/g, '<span style="color:var(--color-gold-light);">$1</span>');



    // Catch-all for other +Stat patterns (e.g. +1 MOV, +1 ATK) if not handled above

    formatted = formatted.replace(/(\+\d+\s+[A-Za-z]+)/g, '<span style="color:var(--color-gold-light);">$1</span>');



    // Colorize negative/bad stats (e.g. -1 ATK on player) - but not beneficial effects which are already gold

    formatted = formatted.replace(/(-\d+\s+(?!Fire DMG|ATK from)[A-Za-z]+)/g, '<span style="color:#ff4444;">$1</span>');



    return formatted;

}







function showEnemyRangeHover(unit) {

    if (!unit || !isUnitAliveAndValid(unit)) return;

    if (unit.team !== 'enemy') return; // Only enemy units

    const range = unit.currentRange || unit.range;

    if (range <= 1) return; // Only ranged (check calculated range, not base)



    const isTotem = unit.type === 'shaman_totem';

    // Selection Grid classes (as defined in style.css or used by highlightEnemyRange)

    for (let r = 0; r < currentGridRows; r++) {

        for (let c = 0; c < currentGridCols; c++) {

            const dist = Math.abs(unit.x - c) + Math.abs(unit.y - r);

            if (dist <= range && dist >= 1) {

                const cell = getCellElement(c, r);

                if (!cell) continue;



                cell.classList.add('enemy-attack-range');



                // Use 'enemy-border-*' classes to match highlightEnemyRange exactly

                if (r === 0 || (Math.abs(unit.x - c) + Math.abs(unit.y - (r - 1))) > range) cell.classList.add('enemy-border-top');

                if (r === currentGridRows - 1 || (Math.abs(unit.x - c) + Math.abs(unit.y - (r + 1))) > range) cell.classList.add('enemy-border-bottom');

                if (c === 0 || (Math.abs(unit.x - (c - 1)) + Math.abs(unit.y - r)) > range) cell.classList.add('enemy-border-left');

                if (c === currentGridCols - 1 || (Math.abs(unit.x - (c + 1)) + Math.abs(unit.y - r)) > range) cell.classList.add('enemy-border-right');

            }

        }

    }

}



function clearEnemyRangeHover() {

    gridContent?.querySelectorAll('.enemy-attack-range, .enemy-border-top, .enemy-border-bottom, .enemy-border-left, .enemy-border-right, .targ-border-red-top, .targ-border-red-bottom, .targ-border-red-left, .targ-border-red-right').forEach(c => {

        c.classList.remove('enemy-attack-range', 'enemy-border-top', 'enemy-border-bottom', 'enemy-border-left', 'enemy-border-right', 'targ-border-red-top', 'targ-border-red-bottom', 'targ-border-red-left', 'targ-border-red-right');

    });



    // Re-draw persistent ranges to ensure they aren't lost when clearing hover

    if (persistentEnemyRangeUnitIds && persistentEnemyRangeUnitIds.size > 0) {

        persistentEnemyRangeUnitIds.forEach(id => {

            const unit = units.find(u => u.id === id);

            if (unit && isUnitAliveAndValid(unit)) {

                drawEnemyRange(unit);

            } else {

                persistentEnemyRangeUnitIds.delete(id);

            }

        });

    }

}

// Continuous loop for persistent effects (like Forest Armor)

setInterval(() => {

    if (typeof forestArmorActiveTurns !== 'undefined' && forestArmorActiveTurns > 0) {

        if (typeof units !== 'undefined') {

            units.forEach(unit => {

                if (unit.team === 'player' && unit.hp > 0 && unit.element && !unit.element.classList.contains('dead')) {

                    createForestParticles(unit);

                }

            });

        }

    }

}, 800);



// Auto-cleanup for dead unit outlines (extra safety)

setInterval(() => {

    // Cleanup dead unit elements

    document.querySelectorAll('.dead').forEach(el => {

        if (el.classList.contains('selected-enemy') || el.classList.contains('selected') || el.style.filter || el.classList.contains('hovered-enemy')) {

            el.classList.remove('selected', 'selected-enemy', 'hovered-player', 'hovered-enemy', 'acted', 'slowed', 'elite', 'frozen', 'stealth');

            el.style.filter = '';

        }

    });



    // Cleanup lingering cell highlights for empty cells

    gridContent?.querySelectorAll('.valid-attack-target, .spell-target-highlight, .can-be-primary-target').forEach(cell => {

        const x = parseInt(cell.dataset.x);

        const y = parseInt(cell.dataset.y);

        if (!isNaN(x) && !isNaN(y)) {

            const hasUnit = units.some(u => u.x === x && u.y === y && u.hp > 0);

            const hasObstacle = obstacles.some(o => o.x === x && o.y === y && o.hp > 0);

            if (!hasUnit && !hasObstacle) {

                cell.classList.remove('valid-attack-target', 'spell-target-highlight', 'can-be-primary-target');

            }

        }

    });

}, 300); // More frequent cleanup



// --- Profile UI Functions ---

function showAccountsOverlay() {

    if (accountsOverlay) {

        accountsOverlay.classList.remove('hidden');

        accountsOverlay.classList.add('visible');

        renderProfilesList();

    }

}



function hideAccountsOverlay() {

    if (accountsOverlay) {

        accountsOverlay.classList.remove('visible');

        accountsOverlay.classList.add('hidden');

    }

}

function isAccountsOpen() { return accountsOverlay?.classList.contains('visible'); }



function showNewProfileOverlay() {

    if (newProfileOverlay) {

        newProfileOverlay.classList.remove('hidden');

        newProfileOverlay.classList.add('visible');

        if (newProfileNameInput) {

            newProfileNameInput.value = '';

            newProfileNameInput.focus();

        }

    }

}



function hideNewProfileOverlay() {

    if (newProfileOverlay) {

        newProfileOverlay.classList.remove('visible');

        newProfileOverlay.classList.add('hidden');

    }

}



function renderProfilesList() {

    if (!profilesListContainer) return;

    const profiles = getProfileList();

    const currentName = gameSettings.playerName;



    profilesListContainer.innerHTML = '';


    const totalAchievements = Object.keys(ACHIEVEMENT_DATA).length;

    profiles.forEach(name => {

        const item = document.createElement('div');

        item.className = `profile-item ${name === currentName ? 'active' : ''}`;



        const level = localStorage.getItem(getProfileKey(STORAGE_KEY_HIGHEST_LEVEL, name)) || '1';

        const achData = localStorage.getItem(getProfileKey(STORAGE_KEY_ACHIEVEMENT_PROGRESS, name));

        let achCount = 0;

        try {

            if (achData) {

                const parsed = JSON.parse(achData);

                // Count only items that have unlocked: true

                achCount = Object.values(parsed).filter(a => a && a.unlocked === true).length;

            }

        } catch (e) { console.warn("Error parsing achievements for", name, e); }



        const armorId = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_ARMOR, name)) || 'grey';
        const helmetId = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_HELMET, name)) || 'none';
        const flameCloak = localStorage.getItem(getProfileKey(STORAGE_KEY_EQUIPPED_FLAME_CLOAK, name)) === 'true';
        const storedAbilities = localStorage.getItem(getProfileKey(STORAGE_KEY_ABILITY_UPGRADES, name));
        let warBow = false;
        let glacierBow = false;
        try { if (storedAbilities) { const parsed = JSON.parse(storedAbilities); if (parsed.war_bow > 0) warBow = true; if (parsed.glacier_bow > 0) glacierBow = true; } } catch (e) { }

        const spriteStyles = getSpritePositionStyles('knight', 'idle', armorId);
        const gearConfig = SPRITESHEET_CONFIG.gear;
        const unitRow = gearConfig?.unitRows['knight'];

        let gearLayersHtml = '';
        if (gearConfig && typeof unitRow !== 'undefined') {
            const addLayer = (itemKey) => {
                const colDiff = gearConfig.itemColumns[itemKey];
                if (typeof colDiff === 'undefined') return '';
                const xPercent = gearConfig.columns > 1 ? (colDiff / (gearConfig.columns - 1)) * 100 : 0;
                let effectiveRow = unitRow;
                if (itemKey === 'glacier_bow') effectiveRow = 2; // Special row for Glacier Bow
                const yPercent = gearConfig.rows > 1 ? (effectiveRow / (gearConfig.rows - 1)) * 100 : 0;
                return `<div class="p-gear-layer" style="background-image: url('${gearConfig.imageUrl}'); background-size: ${gearConfig.columns * 100}% ${gearConfig.rows * 100}%; background-position: ${xPercent}% ${yPercent}%;"></div>`;
            };

            if (flameCloak) gearLayersHtml += addLayer('flame_cloak');
            if (helmetId === 'goblin_mother_skull') gearLayersHtml += addLayer('goblin_mother_skull');
        }

        item.innerHTML = `
            <div class="p-info">
                <div class="p-sprite-container">
                    <div class="p-knight-sprite" style="background-image: ${spriteStyles.backgroundImage}; background-position: ${spriteStyles.backgroundPosition}; background-size: ${spriteStyles.backgroundSize};">
                        ${gearLayersHtml}
                    </div>
                </div>
                <div class="p-details">
                    <div class="p-name">${name}</div>
                    <div class="p-status">Level: ${level} | ${achCount}/${totalAchievements} Achievements</div>
                </div>
            </div>
            ${profiles.length > 1 ? `<button class="delete-profile-btn" data-name="${name}" title="Delete Hero">X</button>` : ''}
        `;



        item.addEventListener('click', (e) => {

            if (e.target.classList.contains('delete-profile-btn')) return;

            if (name !== currentName) {

                playSfx('select');

                switchProfile(name);

                updateProfileDisplay();

                hideAccountsOverlay();

            }

        });



        const deleteBtn = item.querySelector('.delete-profile-btn');

        if (deleteBtn) {

            deleteBtn.addEventListener('click', (e) => {

                e.stopPropagation();

                playSfx('select');

                handleDeleteRequest(name);

            });

        }



        profilesListContainer.appendChild(item);

    });

}



let profileToDelete = null;

function handleDeleteRequest(name) {

    profileToDelete = name;

    if (deleteHeroNameDisplay) deleteHeroNameDisplay.textContent = name;

    if (deleteConfirmOverlay) {

        deleteConfirmOverlay.classList.remove('hidden');

        deleteConfirmOverlay.classList.add('visible');

    }

}



function handleConfirmDelete() {

    if (profileToDelete) {

        playSfx('explosion');

        deleteProfile(profileToDelete);

        profileToDelete = null;

        if (deleteConfirmOverlay) {

            deleteConfirmOverlay.classList.remove('visible');

            deleteConfirmOverlay.classList.add('hidden');

        }

        renderProfilesList();

        updateProfileDisplay();

    }

}



async function handleCreateProfile() {
    if (!newProfileNameInput) return;
    const name = typeof cleanProfileName === 'function' ? cleanProfileName(newProfileNameInput.value) : newProfileNameInput.value.trim();
    if (!name) {
        playSfx('error');
        return;
    }

    const profiles = getProfileList();
    if (profiles.includes(name)) {
        playSfx('error');
        if (typeof showFeedback === 'function') showFeedback("Profile name already exists!");
        else alert("Profile name already exists!");
        return;
    }

    // New: Check online availability and reserve
    if (window.OnlineLeaderboard && window.OnlineLeaderboard.isInitialized()) {
        const isTaken = await window.OnlineLeaderboard.isNameTaken(name);
        if (isTaken) {
            playSfx('error');
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(`The name "${name}" is already taken by another player online. Please choose a different name.`, "Name Taken");
            } else alert(`The name "${name}" is already taken online.`);
            return;
        }
        // Reserve it
        await window.OnlineLeaderboard.reserveName(name);
    }

    playSfx('select');
    switchProfile(name);
    updateProfileDisplay();
    hideNewProfileOverlay();
    hideAccountsOverlay();

    if (typeof showLevelSelect === 'function') showLevelSelect();
}





function updateProfileDisplay() {

    if (currentProfileNameElement) {

        currentProfileNameElement.textContent = (gameSettings && gameSettings.playerName) ? gameSettings.playerName : "Hero";

    }

}



// Tooltip Initialization

document.addEventListener('DOMContentLoaded', () => {

    // Armory Tab Tooltip is now handled by getTooltipTarget() and updateTooltip()



    // Level Complete Bonus Tooltips - Use event delegation

    const bonusList = document.getElementById('stats-bonus-list');

    if (bonusList) {

        bonusList.addEventListener('mouseenter', (e) => {

            const bonusItem = e.target.closest('.bonus-item');

            if (bonusItem && !bonusItem.classList.contains('hidden')) {

                const bonusType = bonusItem.dataset.bonus;

                if (bonusType) {

                    currentMouseX = e.clientX;

                    currentMouseY = e.clientY;

                    showTooltip(bonusType, 'bonus');

                }

            }

        }, true); // Use capture phase for delegation



        bonusList.addEventListener('mouseleave', (e) => {

            const bonusItem = e.target.closest('.bonus-item');

            if (bonusItem) {

                hideTooltip();

            }

        }, true);

    }



    // Hotkey: Press 'T' (without Shift) to select closest player unit to mouse

    document.addEventListener('keydown', (e) => {

        // Shift+T is reserved for the level skip cheat

        if (e.key.toLowerCase() === 't' && !e.shiftKey && isGameActiveFlag && !isAnyOverlayVisible()) {

            if (!units || units.length === 0) return;



            let minDistance = Infinity;

            let closestUnit = null;



            units.forEach(u => {

                if (u.team === 'player' && isUnitAliveAndValid(u) && !u.acted && u.element) {

                    const rect = u.element.getBoundingClientRect();

                    const centerX = rect.left + rect.width / 2;

                    const centerY = rect.top + rect.height / 2;

                    const dist = Math.hypot(currentMouseX - centerX, currentMouseY - centerY);



                    if (dist < minDistance) {

                        minDistance = dist;

                        closestUnit = u;

                    }

                }

            });



            if (closestUnit) {

                if (typeof selectUnit === 'function') selectUnit(closestUnit);

                if (typeof playSfx === 'function') playSfx('select');

            }

        }

    });

    // Initialize Button Tooltips
    setupButtonTooltips();

});

function showPendingFrostNovaWarnings() {
    // Clear existing warnings first
    clearPendingFrostNovaWarnings();

    if (typeof pendingFrostNovas === 'undefined' || !pendingFrostNovas || pendingFrostNovas.length === 0) return;

    pendingFrostNovas.forEach(p => {
        const targetX = p.x;
        const targetY = p.y;

        // Radius of 2 (5x5 area)
        for (let y = targetY - 2; y <= targetY + 2; y++) {
            for (let x = targetX - 2; x <= targetX + 2; x++) {
                const cell = cellElementsMap.get(`${x},${y}`);
                if (cell) {
                    cell.classList.add('frost-nova-warning');
                }
            }
        }
    });
}

function clearPendingFrostNovaWarnings() {
    document.querySelectorAll('.frost-nova-warning').forEach(cell => {
        cell.classList.remove('frost-nova-warning');
    });
}



// --- Barracks Gesture Navigation ---



let shopTouchStartX = 0;

let shopTouchStartY = 0;

const SWIPE_THRESHOLD = 50;

const SWIPE_Y_THRESHOLD = 50; // Prevent vertical scrolling from triggering swipe



document.addEventListener('touchstart', (e) => {

    if (!isShopOpen()) return;

    shopTouchStartX = e.changedTouches[0].screenX;

    shopTouchStartY = e.changedTouches[0].screenY;

}, { passive: true });



document.addEventListener('touchend', (e) => {

    if (!isShopOpen()) return;

    const endX = e.changedTouches[0].screenX;

    const endY = e.changedTouches[0].screenY;

    handleShopSwipe(shopTouchStartX, shopTouchStartY, endX, endY);

}, { passive: true });



// Trackpad (Wheel) Navigation
let isTabSwitchCooldown = false;
const WHEEL_THRESHOLD = 30; // Lower threshold slightly for snappier feel
let accumulatedWheelDelta = 0;

document.addEventListener('wheel', (e) => {
    if (!isShopOpen()) return;

    // Only capture horizontal scrolling
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        accumulatedWheelDelta += e.deltaX;

        if (!isTabSwitchCooldown && Math.abs(accumulatedWheelDelta) > WHEEL_THRESHOLD) {
            const direction = accumulatedWheelDelta > 0 ? 'next' : 'prev';
            navigateShopTab(direction);

            // Trigger cooldown
            isTabSwitchCooldown = true;
            accumulatedWheelDelta = 0;
            setTimeout(() => {
                isTabSwitchCooldown = false;
                accumulatedWheelDelta = 0; // Clear residual delta
            }, 500); // 500ms cooldown to prevent double-skips
        }

        // Reset accumulator if scrolling stops/pauses without triggering
        if (Math.abs(accumulatedWheelDelta) > 150) accumulatedWheelDelta = 0; // Safety reset
    }
}, { passive: true });



function handleShopSwipe(startX, startY, endX, endY) {

    const diffX = endX - startX;

    const diffY = endY - startY;



    if (Math.abs(diffX) > SWIPE_THRESHOLD && Math.abs(diffY) < SWIPE_Y_THRESHOLD) {

        if (diffX > 0) {

            // Swipe Right -> Prev Tab

            navigateShopTab('prev');

        } else {

            // Swipe Left -> Next Tab

            navigateShopTab('next');

        }

    }

}



function navigateShopTab(direction) {
    if (direction === 'next') {
        if (currentShopTab === 'main') switchShopTab('armory');
        else if (currentShopTab === 'armory') switchShopTab('troops');
    } else {
        if (currentShopTab === 'troops') switchShopTab('armory');
        else if (currentShopTab === 'armory') switchShopTab('main');
    }
}

function setupButtonTooltips() {
    const buttons = [
        { id: 'back-to-main-menu-button', text: 'Back to Main Menu' },
        { id: 'level-select-shop-button', text: 'Barracks' },
        { id: 'start-game-button', text: 'Start Game' },
        { id: 'game-over-to-title-button', text: 'Continue' },
        { id: 'next-level-button', text: 'Next Level' },
        { id: 'settings-menu-button', text: 'Options' },
        { id: 'achievements-menu-button', text: 'Achievements' },
        { id: 'leaderboard-menu-button', text: 'Leaderboard' },
        { id: 'level-complete-shop-button', text: 'Barracks' },
        { id: 'level-select-prev-page', text: 'Previous Page' },
        { id: 'level-select-next-page', text: 'Next Page' },
        { id: 'menu-button', text: 'Menu' },
        { id: 'current-profile-name', text: 'Select Hero' },
        { id: 'level-select-troops-button', text: 'Troops' },
        { id: 'menu-mute-button', text: 'Toggle Mute (M)' },
        { id: 'menu-fullscreen-button', text: 'Toggle Fullscreen (F)' },
        { id: 'restart-level-setting-button', text: 'Restart Level (R)' },
        { id: 'quit-button', text: 'To Level Select' },
        { id: 'quit-to-main-menu-button', text: 'Quit to Main Menu (Q)' },
        { id: 'close-menu-button', text: 'Back' },
        { id: 'close-settings-button', text: 'Back' },
        { id: 'close-achievements-button', text: 'Back' },
        { id: 'close-leaderboard-button', text: 'Back' },
        { id: 'close-accounts-button', text: 'Back' },
        { id: 'cancel-new-profile-button', text: 'Back' },
        { id: 'cancel-delete-button', text: 'Back' },
        { id: 'decline-naked-challenge-button', text: 'Back' },
        { id: 'close-debug-spawner-button', text: 'Back' },
        { id: 'troops-back-button', text: 'Back' },
        { id: 'shop-exit-button', text: 'Confirm' },
        { id: 'fireball-spell', text: 'Fireball: Cast a bolt of fire dealing 10 (+level*2) damage to enemies in a small area.' },
        { id: 'flame-wave-spell', text: 'Flame Wave: Release a wave of fire across the entire row.' },
        { id: 'frost-nova-spell', text: 'Frost Nova: Freeze enemies in a large radius.' },
        { id: 'heal-spell', text: 'Heal: Restore 15 (+level*3) HP to a unit.' },
        { id: 'forest-armor-ability', text: 'Forest Armor: Gain temporary damage reduction and sprout defensive thorns.' }
    ];

    buttons.forEach(btnConfig => {
        const btn = document.getElementById(btnConfig.id);
        if (btn) {
            // Store text in dataset so getTooltipTarget can find it
            btn.dataset.tooltipText = btnConfig.text;

            // Remove title if present to avoid browser tooltip
            if (btn.hasAttribute('title')) {
                btn.removeAttribute('title');
            }

            // NO event listeners needed because getTooltipTarget + updateTooltip loop handles it now!
            // This prevents the "flash" caused by fighting between mouseenter and the interval loop.
        }
    });
}