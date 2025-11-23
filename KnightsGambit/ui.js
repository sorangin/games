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
    levelCompleteShopButton, levelCompleteTotalGoldElement, defaultViewButton, chooseTroopsScreen, chooseTroopsTitle,
    currentTroopsList, availableTroopsList, currentRosterCountElement, maxRosterSizeElement, chooseTroopsFeedback,
    confirmTroopsButton, troopsBackButton, levelSelectTroopsButton, shopTroopsButton,
    unitHpBarsOverlay, toggleHpBarsSetting, levelSelectShopButton, settingsOverlay, closeSettingsButton,
    achievementsOverlay, closeAchievementsButton, achievementsListElement, achievementCompletionStatusElement,
    levelSelectPagination, levelSelectPrevPage, levelSelectNextPage, levelSelectPageInfo,
    musicVolumeSlider, musicVolumeValueSpan, sfxVolumeSlider, sfxVolumeValueSpan, muteToggleSetting,
    fullscreenToggleSetting, playerNameSettingInput, abilityStealthButton, abilityQuickStrikeButton;

let currentCellSize = 30;
let gridContentOffsetX = 0; let gridContentOffsetY = 0;
let currentZoom = 1;
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
let selectedShopItemId = null;

let mapZoom = 1; let mapOffsetX = 0; let mapOffsetY = 0;
const MIN_MAP_ZOOM = 1; const MAX_MAP_ZOOM = 5;
let isMapPanning = false; let mapPanStartX = 0; let mapPanStartY = 0;
let mapStartPanX = 0; let mapStartPanY = 0;
let mapIntrinsicWidth = 1024; let mapIntrinsicHeight = 1024;
let currentLevelSelectPage = 1;
const TOTAL_LEVELS_TO_SHOW = 1000;

let currentShopOrigin = '';
let troopScreenOrigin = '';
let levelToStartAfterManage = 0;
let worldHpBars = new Map();
let shouldShowTroopsAfterPurchase = false;

function isMobileDevice() {
    // return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    return false; // DEBUG: Force false to ensure tooltips work on desktop
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
    applyZoomAndPan(); if (gameSettings.showHpBars) updateWorldHpBars();
}

const handleResize = () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const overlayVisible = isAnyOverlayVisible(); if (!isGameActive() && !isLevelSelectOpen() && !isChooseTroopsScreenOpen()) return;
        requestAnimationFrame(() => { try { if (isGameActive() && !overlayVisible) { calculateCellSize(); applyLayout(); centerView(true); } else if (isLevelSelectOpen()) applyMapZoomAndPan(); } catch (e) { console.error("Resize error:", e); } });
    }, 150);
};

function setupBoard(tilesetUrl) {
    if (!gridContent) { console.error("setupBoard: gridContent element not found!"); return; }
    let childrenToRemove = [];
    for (let i = 0; i < gridContent.children.length; i++) { if (gridContent.children[i].id !== 'unit-hp-bars-overlay') childrenToRemove.push(gridContent.children[i]); } childrenToRemove.forEach(child => gridContent.removeChild(child)); cellElementsMap.clear(); worldHpBars.clear();
    calculateCellSize();
    gridContent.style.width = `${currentGridCols * currentCellSize}px`; gridContent.style.height = `${currentGridRows * currentCellSize}px`; gridContent.style.gridTemplateColumns = `repeat(${currentGridCols}, 1fr)`; gridContent.style.gridTemplateRows = `repeat(${currentGridRows}, 1fr)`; gridContent.style.setProperty('--grid-cols', currentGridCols); gridContent.style.setProperty('--grid-rows', currentGridRows); gridContentOffsetX = 0; gridContentOffsetY = 0; currentZoom = 1; applyZoomAndPan();
    const cellFragment = document.createDocumentFragment(); const cssUrl = tilesetUrl ? `url('${tilesetUrl}')` : 'none'; const fallbackColor = 'rgba(50, 50, 50, 0.7)';
    for (let r = 0; r < currentGridRows; r++) { for (let c = 0; c < currentGridCols; c++) { const cell = document.createElement('div'); cell.className = 'grid-cell'; cell.dataset.x = c; cell.dataset.y = r; cell.addEventListener('click', handleCellClick); cell.addEventListener('mouseenter', handleCellMouseEnter); cell.addEventListener('mouseleave', handleCellMouseLeave); cell.style.width = `var(--cell-size)`; cell.style.height = `var(--cell-size)`; cell.style.backgroundImage = cssUrl; cell.style.backgroundColor = fallbackColor; cell.style.backgroundSize = 'cover'; cell.style.backgroundPosition = 'center'; cellFragment.appendChild(cell); cellElementsMap.set(`${c},${r}`, cell); } } gridContent.appendChild(cellFragment);
    unitHpBarsOverlay = document.getElementById('unit-hp-bars-overlay'); if (!unitHpBarsOverlay) { unitHpBarsOverlay = document.createElement('div'); unitHpBarsOverlay.id = 'unit-hp-bars-overlay'; gridContent.appendChild(unitHpBarsOverlay); } else if (gridContent.lastChild !== unitHpBarsOverlay) { gridContent.appendChild(unitHpBarsOverlay); } unitHpBarsOverlay.innerHTML = ''; unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars); document.documentElement.style.setProperty('--current-tileset-url', cssUrl);
}

function renderAll() {
    if (!gridContent) return; gridContent.querySelectorAll(':scope > *:not(.grid-cell):not(#unit-hp-bars-overlay)').forEach(el => el.remove()); worldHpBars.clear(); if (unitHpBarsOverlay) unitHpBarsOverlay.innerHTML = '';
    const fragment = document.createDocumentFragment();
    obstacles.forEach(obs => { if (isObstacleIntact(obs)) renderObstacle(obs, fragment); }); items.forEach(item => { if (!item.collected) renderItem(item, fragment); updateCellItemStatus(item.x, item.y); }); units.forEach(unit => { if (isUnitAliveAndValid(unit)) renderUnit(unit, fragment); }); gridContent.appendChild(fragment);
    if (unitHpBarsOverlay && gridContent.lastChild !== unitHpBarsOverlay) gridContent.appendChild(unitHpBarsOverlay); if (unitHpBarsOverlay) unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars);
}

function renderUnit(unit, parentElement = gridContent) {
    if (!parentElement || !unit) return null;
    unit.element?.remove();
    const el = document.createElement('div');
    el.className = `unit ${unit.team}`;
    if (unit.isElite) el.classList.add('elite');
    el.dataset.id = unit.id;
    const idleStyles = getSpritePositionStyles(unit.type, 'idle', unit.variantType);
    el.style.backgroundImage = idleStyles.backgroundImage;
    el.style.backgroundPosition = idleStyles.backgroundPosition;
    el.style.backgroundSize = idleStyles.backgroundSize;
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
    // highlightMovesAndAttacks(unit); // This is called in updateUnitInfo usually? No, updateUnitInfo updates the panel.
    // We need to ensure highlights are shown.
    if (typeof highlightMovesAndAttacks === 'function') highlightMovesAndAttacks(unit);
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

function renderObstacle(obstacle, parentElement = gridContent) {
    if (!parentElement || !obstacle) return null; obstacle.element?.remove(); const data = OBSTACLE_DATA[obstacle.type]; if (!data) return null; const el = document.createElement('div'); el.className = `obstacle ${data.spriteClass}`; el.dataset.id = obstacle.id; el.alt = obstacle.type; if (obstacle.type === 'door' && obstacle.isVertical) el.classList.add('vertical');
    if (obstacle.clickable || obstacle.canBeAttacked) { el.addEventListener('click', (ev) => handleObstacleClick(ev, obstacle)); }
    el.addEventListener('mouseenter', handleObstacleMouseEnter); el.addEventListener('mouseleave', handleObstacleMouseLeave); obstacle.element = el; parentElement.appendChild(el); updateObstaclePosition(obstacle); updateCellObstacleStatus(obstacle.x, obstacle.y); return el;
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

    if (item.type === 'chest' && item.opened) {
        el.classList.add('opened');
        const openPos = SPRITESHEET_CONFIG.items.icons.chest_opened;
        const xPercent = cols > 1 ? (openPos.col / (cols - 1)) * 100 : 0;
        const yPercent = rows > 1 ? (openPos.row / (rows - 1)) * 100 : 0;
        el.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
    }

    el.addEventListener('click', (ev) => handleItemClick(ev, item)); el.addEventListener('mouseenter', handleItemMouseEnter); el.addEventListener('mouseleave', handleItemMouseLeave); item.element = el; parentElement.appendChild(el); updateItemPosition(item); return el;
}

function updateVisualItemState(item) {
    renderItem(item);
}

function removeVisualItems(itemsToRemove) {
    if (!Array.isArray(itemsToRemove)) itemsToRemove = [itemsToRemove];
    itemsToRemove.forEach(item => {
        if (item.element) {
            item.element.classList.add('collected');
            setTimeout(() => item.element.remove(), 500);
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

function updateUnitPosition(unit, forceUpdate = false) { if (!unit?.element || unit.element.classList.contains('dead')) return; const targetCol = unit.x + 1; const targetRow = unit.y + 1; unit.element.style.setProperty('--unit-x', targetCol); unit.element.style.setProperty('--unit-y', targetRow); if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); }

function updateUnitVisualState(unit) {
    if (!unit?.element || unit.element.classList.contains('dead')) return;
    const el = unit.element;
    const idleStyles = getSpritePositionStyles(unit.type, 'idle', unit.variantType);
    el.style.backgroundImage = idleStyles.backgroundImage;
    el.style.backgroundPosition = idleStyles.backgroundPosition;
    el.style.backgroundSize = idleStyles.backgroundSize;
    const isSelected = selectedUnit?.id === unit.id;
    const isActed = unit.acted && !levelClearedAwaitingInput;

    el.style.filter = '';
    let currentFilters = [];
    if (isSelected) currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--selected-filter-outline').trim());

    if (unit.isStealthed) currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--stealth-filter').trim());
    else if (unit.isFrozen && unit.frozenTurnsLeft > 0) currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--frozen-filter').trim());
    else if (unit.isNetted) { }
    else if (unit.isSlowed) currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--slowed-filter').trim());
    else if (isActed) currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--acted-filter').trim());

    if (unit.isElite && !unit.isFrozen && !unit.isStealthed) currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--elite-filter').trim());
    if (!el.classList.contains('fading-out')) currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--unit-base-shadow').trim());

    el.style.filter = currentFilters.join(' ');
    el.classList.toggle('acted', isActed && !unit.isStealthed);
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('frozen', unit.isFrozen && unit.frozenTurnsLeft > 0);
    el.classList.toggle('netted', unit.isNetted);
    el.classList.toggle('slowed', unit.isSlowed);
    el.classList.toggle('stealthed', unit.isStealthed);
    el.classList.toggle('in-tower', !!unit.inTower);
    el.classList.toggle('elite', unit.isElite);
    setUnitVariantClass(unit);
    el.style.transitionDuration = (unit.isFrozen && unit.frozenTurnsLeft > 0) ? `calc(var(--frost-nova-expand-time) - var(--frost-visual-fade-offset))` : '';
}

function updateObstaclePosition(obstacle) { if (!obstacle?.element) return; obstacle.element.style.setProperty('--obs-x', obstacle.x + 1); obstacle.element.style.setProperty('--obs-y', obstacle.y + 1); if (obstacle.type === 'door') obstacle.element.classList.toggle('vertical', obstacle.isVertical); }
function updateItemPosition(item) { if (!item?.element) return; item.element.style.setProperty('--item-grid-x', item.x); item.element.style.setProperty('--item-grid-y', item.y); item.element.style.setProperty('--stackIndex', item.stackIndex || 0); }
function updateCellObstacleStatus(x, y) { if (!isCellInBounds(x, y)) return; const cell = getCellElement(x, y); if (!cell) return; const hasIntactObstacle = obstacles.some(obs => obs.x === x && obs.y === y && isObstacleIntact(obs)); cell.classList.toggle('has-obstacle', hasIntactObstacle); }
function updateCellItemStatus(x, y) { if (!isCellInBounds(x, y)) return; const cell = getCellElement(x, y); if (!cell) return; const hasVisibleItem = items.some(item => item.x === x && item.y === y && !item.collected && (item.type !== 'chest' || !item.opened)); cell.classList.toggle('has-item', hasVisibleItem); }
function setUnitVariantClass(unit) { if (!unit?.element || unit.team !== 'enemy') return; const element = unit.element; element.classList.remove('goblin-red', 'goblin-blue', 'goblin-yellow', 'goblin-green'); if (unit.variantType && unit.variantType !== 'green') element.classList.add(`goblin-${unit.variantType}`); else if (unit.type.startsWith('goblin') || unit.type.startsWith('orc')) element.classList.add('goblin-green'); }

function showPopup(x, y, text, className) { if (!gridContent || !isCellInBounds(x, y)) return; const p = document.createElement('div'); p.className = `popup ${className}`; p.innerHTML = text; const popupX = (x + 0.5) * currentCellSize; const popupY = (y + 0.5) * currentCellSize - (currentCellSize * 0.5); p.style.left = `${popupX}px`; p.style.top = `${popupY}px`; gridContent.appendChild(p); setTimeout(() => p.remove(), POPUP_DURATION_MS); }
function showDamagePopup(x, y, damage) { showPopup(x, y, `-${damage}`, 'damage-popup'); }
function showFreezePopup(x, y) { showPopup(x, y, `Frozen!`, 'freeze-popup'); }
function showHealPopup(x, y, amount) { showPopup(x, y, `+${amount}`, 'heal-popup'); }
function showGoldPopup(x, y, amount) { showPopup(x, y, `+${amount} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline">`, 'gold-popup'); }
function showGemPopup(x, y, amount) { showPopup(x, y, `+${amount} <img src="./sprites/shiny_gem.png" alt="Gem" class="gem-icon-inline">`, 'gem-popup'); }
function flashElementOnHit(element) { if (element && !element.classList.contains('unit-hit-flash')) { element.classList.add('unit-hit-flash'); setTimeout(() => element?.classList.remove('unit-hit-flash'), 200); } }

function showFeedback(message, type = '', duration = 2500) { if (!boardFeedbackArea) return; boardFeedbackArea.innerHTML = message; boardFeedbackArea.className = `board-feedback-area ${type}`; const typeDurations = { 'feedback-gold': 1500, 'feedback-cheat': 1500, 'feedback-levelup': 2000, 'feedback-spell-unlock': 3000, 'feedback-achievement-unlock': 3500, 'feedback-turn': 1200, 'feedback-error': 2000 }; duration = typeDurations[type] || duration; boardFeedbackArea.style.opacity = '1'; boardFeedbackArea.style.display = 'flex'; if (boardFeedbackArea.timeoutId) clearTimeout(boardFeedbackArea.timeoutId); boardFeedbackArea.timeoutId = setTimeout(() => { boardFeedbackArea.style.opacity = '0'; setTimeout(() => { if (boardFeedbackArea.style.opacity === '0') { boardFeedbackArea.innerHTML = ''; boardFeedbackArea.style.display = 'none'; boardFeedbackArea.className = 'board-feedback-area'; } }, 500); }, duration - 500); }
function updateLevelDisplay() { if (levelDisplayElement) levelDisplayElement.textContent = `Level: ${currentLevel}`; }
function updateGoldDisplay() { if (menuGoldAmountElement) menuGoldAmountElement.textContent = playerGold; if (shopGoldAmountElement) shopGoldAmountElement.textContent = playerGold; if (levelCompleteTotalGoldElement) levelCompleteTotalGoldElement.textContent = playerGold; }

function updateSpellUI() {
    if (!spellAreaElement) return; const spellData = [{ el: fireballElement, name: 'fireball', unlock: FIREBALL_UNLOCK_LEVEL }, { el: flameWaveElement, name: 'flameWave', unlock: FLAME_WAVE_UNLOCK_LEVEL }, { el: frostNovaElement, name: 'frostNova', unlock: FROST_NOVA_UNLOCK_LEVEL }, { el: healElement, name: 'heal', unlock: HEAL_UNLOCK_LEVEL }]; const hotkeys = ['1', '2', '3', '4'];
    spellData.forEach((s, index) => {
        if (!s.el) return; const spellName = s.name; const isPermanentlyUnlocked = spellsUnlocked[spellName] === true; const canUseThisTurn = (spellUses[spellName] === true || unlimitedSpellsCheat); const isSelected = currentSpell === spellName; const hotkey = hotkeys[index]; s.el.className = `spell-icon icon-spell-${spellName}`; const labelSibling = s.el.nextElementSibling; const baseTitle = labelSibling?.classList.contains('spell-label') ? labelSibling.textContent : spellName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); let title = baseTitle;
        if (!isPermanentlyUnlocked) { s.el.classList.add('locked'); title += ` (Unlock at Lvl ${s.unlock})`; } else if (!canUseThisTurn) { s.el.classList.add('used'); title += ` (Used)`; } else { s.el.classList.add('available'); if (isSelected) { s.el.classList.add('selected'); title = `CASTING: ${title} (Esc to Cancel)`; } else { const effect = getSpellEffectDescription(spellName); title += ` - ${effect} [${hotkey}]`; } if (unlimitedSpellsCheat) { s.el.classList.add('cheat-available'); title += ` (Cheat Active)`; } } s.el.title = title; const label = s.el.nextElementSibling; if (label?.classList.contains('spell-label')) { if (!isPermanentlyUnlocked) label.style.color = '#888'; else if (!canUseThisTurn) label.style.color = '#999'; else if (unlimitedSpellsCheat && canUseThisTurn) label.style.color = '#69f0ae'; else label.style.color = ''; }
    });
    if (gameBoard) { gameBoard.className = 'game-board'; if (isPanning) gameBoard.classList.add('panning'); if (currentSpell) gameBoard.classList.add(`${currentSpell}-targeting`); }
}

function getSpellEffectDescription(spellName, getNextLevelValue = false) {
    try {
        const currentUpgradeLevel = playerSpellUpgrades[spellName] || 0;
        const displayLevel = getNextLevelValue ? currentUpgradeLevel + 2 : currentUpgradeLevel + 1;
        const levelText = currentUpgradeLevel > 0 ? ` (Lvl ${displayLevel})` : '';
        switch (spellName) {
            case 'fireball': return `Deal ${getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE, getNextLevelValue)} DMG${levelText}`;
            case 'flameWave': return `Deal ${getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE, getNextLevelValue)} DMG to Row${levelText}`;
            case 'frostNova':
                const radiusLevel = getFrostNovaRadiusLevel(getNextLevelValue);
                const areaDim = radiusLevel * 2 + 1;
                return `Freeze ${areaDim}x${areaDim} area (${FROST_NOVA_BASE_DURATION} turns)${levelText}`;
            case 'heal': return `Heal ${getSpellEffectValue(spellName, HEAL_BASE_AMOUNT, getNextLevelValue)} HP${levelText}`;
            default: return '';
        }
    } catch (e) { console.error("Spell description error:", e); return "Effect Error"; }
}

function updateTurnDisplay() { if (!actionsLeftDisplayElement || !endTurnButton) return; const isPlayer = currentTurn === 'player'; let actionsText = '', buttonText = `<span class="hotkey-e">E</span>nd Turn`, buttonTitle = "End Player Turn [E]"; let isButtonDisabled = false, hasDisabledClass = false, isNextLevelMode = false; if (levelClearedAwaitingInput) { actionsText = 'Level Cleared!'; buttonText = `Proc<span class="hotkey-e">e</span>ed`; buttonTitle = "Proceed [E]"; isNextLevelMode = true; isButtonDisabled = false; hasDisabledClass = false; } else if (isPlayer) { const remainingActions = units.reduce((count, unit) => count + (unit.team === 'player' && !unit.acted && !unit.isFrozen && !unit.isNetted && isUnitAliveAndValid(unit) ? (unit.canQuickStrike && unit.actionsTakenThisTurn < 1 ? 2 : 1) - unit.actionsTakenThisTurn : 0), 0); actionsText = `Actions Left: ${remainingActions}`; isButtonDisabled = isProcessing; hasDisabledClass = isProcessing; } else { actionsText = `Enemy Turn...`; buttonTitle = "Enemy Turn"; isButtonDisabled = true; hasDisabledClass = true; } actionsLeftDisplayElement.textContent = actionsText; endTurnButton.innerHTML = buttonText; endTurnButton.title = buttonTitle; endTurnButton.disabled = isButtonDisabled; endTurnButton.classList.toggle('disabled', hasDisabledClass); endTurnButton.classList.toggle('next-level-mode', isNextLevelMode); }

function updateUnitInfo(unit) {
    const infoHpTextElement = unitInfo?.querySelector('.unit-hp-text'); const infoHpBarElement = unitInfo?.querySelector('.unit-hp-bar');
    if (!unitInfo || !infoHpTextElement || !infoHpBarElement || !unitNameDisplay || !unitAtkDisplay || !unitMovDisplay || !unitRngDisplay || !unitStatusDisplay || !unitPortraitElement || !abilityStealthButton || !abilityQuickStrikeButton) return;
    const show = unit && isUnitAliveAndValid(unit);

    if (show) {
        unitNameDisplay.textContent = unit.name; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0; infoHpTextElement.textContent = `${unit.hp}/${unit.maxHp}`; infoHpBarElement.style.setProperty('--hp-percent', `${hpPercent}%`); const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); infoHpBarElement.dataset.hpLevel = hpLevel;

        if (unit.atk !== undefined) { unitAtkDisplay.textContent = `ATK: ${unit.atk}`; unitAtkDisplay.style.display = 'block'; } else { unitAtkDisplay.style.display = 'none'; }

        let movDisplay = '';
        if (unit.baseMov !== undefined) {
            movDisplay = `MOV: ${unit.baseMov}`;
            if (unit.quickStrikeActive) movDisplay = `MOV: ${Math.max(0, unit.baseMov - ROGUE_QUICK_STRIKE_MOVE_PENALTY)}`;
            else if (unit.isStealthed) movDisplay = `MOV: ${Math.max(0, unit.baseMov - ROGUE_STEALTH_MOVE_PENALTY)}`;
            unitMovDisplay.textContent = movDisplay; unitMovDisplay.style.display = 'block';
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
        unitStatusDisplay.innerHTML = statusText; unitStatusDisplay.style.display = statusText ? 'block' : 'none';

        const portraitStyles = getSpritePositionStyles(unit.type, 'portrait', unit.variantType);
        unitPortraitElement.style.backgroundImage = portraitStyles.backgroundImage;
        unitPortraitElement.style.backgroundPosition = portraitStyles.backgroundPosition;
        unitPortraitElement.style.backgroundSize = portraitStyles.backgroundSize;
        unitPortraitElement.style.opacity = '1';
        unitPortraitElement.className = '';
        if (unit.team === 'enemy' && unit.variantType && unit.variantType !== 'green') { unitPortraitElement.classList.add(`goblin-${unit.variantType}`); }

        const canUseStealth = unit.team === 'player' && unit.canStealth && !unit.isStealthed && !unit.acted && !unit.isFrozen && !unit.isNetted;
        abilityStealthButton.classList.toggle('hidden', !unit.canStealth);
        abilityStealthButton.disabled = !canUseStealth;

        const canUseQS = unit.team === 'player' && unit.canQuickStrike && !unit.quickStrikeActive && !unit.acted && !unit.isFrozen && !unit.isNetted && !unit.isStealthed;
        abilityQuickStrikeButton.classList.toggle('hidden', !unit.canQuickStrike);
        abilityQuickStrikeButton.disabled = !canUseQS;

        unitInfo.parentElement.style.display = ''; unitInfo.style.display = 'grid';
    } else {
        unitInfo.style.display = 'none'; unitPortraitElement.style.opacity = '0'; unitPortraitElement.className = ''; unitNameDisplay.textContent = ''; infoHpTextElement.textContent = ''; infoHpBarElement.style.setProperty('--hp-percent', '0%'); infoHpBarElement.dataset.hpLevel = 'empty'; unitAtkDisplay.textContent = ''; unitMovDisplay.textContent = ''; unitRngDisplay.textContent = ''; unitStatusDisplay.textContent = ''; unitRngDisplay.style.display = ''; unitStatusDisplay.style.display = '';
        abilityStealthButton.classList.add('hidden'); abilityQuickStrikeButton.classList.add('hidden');
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
        el.classList.add('dead');
        el.style.pointerEvents = 'none';
        const deadStyles = getSpritePositionStyles(unit.type, 'dead', unit.variantType);
        el.style.backgroundImage = deadStyles.backgroundImage;
        el.style.backgroundPosition = deadStyles.backgroundPosition;
        el.style.backgroundSize = deadStyles.backgroundSize;
        el.style.filter = '';
        el.style.zIndex = '5';
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
            el.classList.add('fading-out');
            const removeTimeoutId = setTimeout(() => {
                el.remove();
                if (typeof removeWorldHpBar === 'function') removeWorldHpBar(unit.id); // Remove HP bar after animation
                timeoutMap.delete(unit.id + '-remove');
                resolve();
            }, DEATH_FADE_DURATION_MS);
            timeoutMap.set(unit.id + '-remove', removeTimeoutId);
            timeoutMap.delete(unit.id + '-fade');
        }, DEATH_VISIBLE_DURATION_MS);
        timeoutMap.set(unit.id + '-fade', fadeTimeoutId);
    });
}

function updateUnitInfoDisplay(unit) { const unitIdToShow = unit?.id ?? null; const isUnitSelected = selectedUnit?.id === unitIdToShow; const isHoveringThisUnit = lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === unitIdToShow; if (isUnitSelected || (!selectedUnit && isHoveringThisUnit)) updateUnitInfo(unit); else if (!selectedUnit && !isHoveringThisUnit) updateUnitInfo(null); if (tooltipElement?.classList.contains('visible') && isHoveringThisUnit) showTooltip(unit, 'unit'); }
function updateUnitInfoOnDeath(deadUnitId) { let panelWasHidden = false; if (selectedUnit?.id === deadUnitId) { if (typeof deselectUnit === 'function') deselectUnit(false); else if (typeof updateUnitInfo === 'function') updateUnitInfo(null); panelWasHidden = true; } if (!panelWasHidden && !selectedUnit && lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === deadUnitId) { if (typeof updateUnitInfo === 'function') updateUnitInfo(null); panelWasHidden = true; } if (tooltipElement?.classList.contains('visible') && lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === deadUnitId) { hideTooltip(); lastHoveredElement = null; } }

function updateUiForNewLevel() { updateLevelDisplay(); updateGoldDisplay(); updateUnitInfo(null); if (boardFeedbackArea) { if (boardFeedbackArea.timeoutId) clearTimeout(boardFeedbackArea.timeoutId); boardFeedbackArea.innerHTML = ''; boardFeedbackArea.className = 'board-feedback-area'; boardFeedbackArea.style.opacity = '1'; boardFeedbackArea.style.display = 'none'; } if (endTurnButton) { endTurnButton.innerHTML = `<span class="hotkey-e">E</span>nd Turn`; endTurnButton.title = "End Player Turn (E)"; endTurnButton.classList.remove('next-level-mode', 'disabled'); endTurnButton.disabled = false; } if (gameBoard) gameBoard.className = 'game-board'; updateSpellUI(); clearSpellHighlights(); clearHighlights(); hideAllOverlays(); updateShopDisplay(); updateChooseTroopsScreen(); updateFullscreenButton(); updateMuteButtonVisual(); startTooltipUpdater(); gameBoardWrapper?.classList.add('active'); if (defaultViewButton) defaultViewButton.classList.add('hidden'); }
function updateQuitButton() { if (!quitButton) return; const canForfeit = playerActionsTakenThisLevel >= FORFEIT_MOVE_THRESHOLD; if (canForfeit) { quitButton.textContent = "Forfeit Level"; quitButton.title = "Forfeit Level (Incurs Penalty)"; quitButton.dataset.action = "forfeit"; } else { quitButton.textContent = "Quit to Level Select"; quitButton.title = "Quit to Level Select (No Penalty)"; quitButton.dataset.action = "quit"; } }
function getCellElement(x, y) { return cellElementsMap.get(`${x},${y}`); }
function clearHighlights() { gridContent?.querySelectorAll('.valid-move, .valid-attack-target, .valid-cleave-target, .can-be-primary-target').forEach(c => c.classList.remove('valid-move', 'valid-attack-target', 'valid-cleave-target', 'can-be-primary-target')); highlightedAttackCells = []; }

function showAttackHoverHighlights(attacker, primaryTargetPos) { if (!attacker || !primaryTargetPos || !isUnitAliveAndValid(attacker)) return; clearAttackHoverHighlights(); const primaryCell = getCellElement(primaryTargetPos.x, primaryTargetPos.y); if (primaryCell) primaryCell.classList.add('valid-attack-target'); if (attacker.type !== 'champion' || attacker.cleaveDamage <= 0) return; const attackDirX = Math.sign(primaryTargetPos.x - attacker.x); const attackDirY = Math.sign(primaryTargetPos.y - attacker.y); if (attackDirX === 0 && attackDirY === 0) return; const coords = []; const px = primaryTargetPos.x, py = primaryTargetPos.y; if (attackDirX !== 0) coords.push({ x: px, y: py - 1 }, { x: px, y: py + 1 }, { x: px + attackDirX, y: py }); else if (attackDirY !== 0) coords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py + attackDirY }); else coords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py - 1 }, { x: px, y: py + 1 }); coords.forEach(({ x, y }) => { if (!isCellInBounds(x, y)) return; const secondaryUnit = getUnitAt(x, y); const primaryTargetObject = getUnitAt(px, py) || getObstacleAt(px, py); if (secondaryUnit && isUnitAliveAndValid(secondaryUnit) && secondaryUnit.team !== attacker.team) { if (!primaryTargetObject || secondaryUnit.id !== primaryTargetObject.id) getCellElement(x, y)?.classList.add('valid-cleave-target'); } const secondaryObstacle = getObstacleAt(x, y); if (secondaryObstacle && secondaryObstacle.canBeAttacked) { if (!primaryTargetObject || secondaryObstacle.id !== primaryTargetObject.id) getCellElement(x, y)?.classList.add('valid-cleave-target'); } }); }
function clearAttackHoverHighlights() { gridContent?.querySelectorAll('.valid-attack-target, .valid-cleave-target').forEach(c => c.classList.remove('valid-attack-target', 'valid-cleave-target')); }
function highlightMovesAndAttacks(unit) {
    clearHighlights(); if (!unit || !isUnitAliveAndValid(unit)) return;

    let canAct = !levelClearedAwaitingInput && !unit.acted;
    if (levelClearedAwaitingInput) canAct = true; // Allow highlighting if level is cleared
    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;
    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAct = true;
    if (!canAct || unit.isFrozen) return;

    if (unit.team === 'player' && (!unit.isNetted)) {
        const moves = getValidMoves(unit);
        moves.forEach(p => { getCellElement(p.x, p.y)?.classList.add('valid-move'); });
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
                if (target.element) target.element.classList.add(isChampion ? 'can-be-primary-target' : 'valid-attack-target');
                cell.classList.add(isChampion ? 'can-be-primary-target' : 'valid-attack-target');
                highlightedAttackCells.push(cell);
            }
        }
    });
}
function highlightFrostNovaArea(centerX, centerY) { clearFrostNovaPreview(); const radiusLevel = getFrostNovaRadiusLevel(); const radius = radiusLevel; for (let dx = -radius; dx <= radius; dx++) for (let dy = -radius; dy <= radius; dy++) { const targetX = centerX + dx; const targetY = centerY + dy; if (isCellInBounds(targetX, targetY) && !getObstacleAt(targetX, targetY)?.blocksMove) getCellElement(targetX, targetY)?.classList.add('frost-aoe-preview'); } }
function clearFrostNovaPreview() { gridContent?.querySelectorAll('.frost-aoe-preview').forEach(c => c.classList.remove('frost-aoe-preview')); }
function highlightFlameWaveArea(targetRow) { clearFlameWaveHighlight(); if (!isCellInBounds(0, targetRow)) return; for (let x = 0; x < currentGridCols; x++) { const cell = getCellElement(x, targetRow); const obs = getObstacleAt(x, targetRow); if (cell && (!obs || !obs.blocksLOS)) cell.classList.add('flame-wave-preview-row'); } }
function clearFlameWaveHighlight() { gridContent?.querySelectorAll('.flame-wave-preview-row').forEach(c => c.classList.remove('flame-wave-preview-row')); }

function selectUnit(unit) {
    if (!unit || unit.team !== 'player' || currentTurn !== 'player' || !isUnitAliveAndValid(unit)) return;

    let canAct = !levelClearedAwaitingInput && !unit.acted;
    if (levelClearedAwaitingInput) canAct = true; // Allow selection if level is cleared
    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;
    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAct = true;

    if (!canAct || unit.isFrozen) {
        let feedback = "Cannot select unit.";
        if (unit.isFrozen) feedback = "Unit is Frozen!";
        else if (unit.acted && !unit.canMoveAndAttack && !unit.quickStrikeActive) feedback = "Unit already acted.";
        showFeedback(feedback, "feedback-error"); playSfx('error'); return;
    }
    if (currentSpell) setActiveSpell(null);
    if (selectedUnit === unit) return;
    if (selectedUnit && selectedUnit.element) updateUnitVisualState(selectedUnit);
    selectedUnit = unit;
    if (unit.element) updateUnitVisualState(unit);
    highlightMovesAndAttacks(unit);
    updateUnitInfo(unit);
    playSfx('select');

    if (isMobileDevice()) {
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        showTooltip(unit, 'unit');
        tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS);
    }
}

function deselectUnit(playSound = true) { if (selectedUnit) { if (selectedUnit.element) updateUnitVisualState(selectedUnit); selectedUnit = null; clearHighlights(); if (playSound) playSfx('select'); clearAttackHoverHighlights(); updateUnitInfo(null); } }
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
    const zoomSpeed = 0.1;
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

function handlePanMove(event) { if (!isPanning || !gameBoard) return; event.preventDefault(); gridContentOffsetX = gridStartPanX + (event.clientX - panStartX); gridContentOffsetY = gridStartPanY + (event.clientY - panStartY); applyZoomAndPan(); }
function handlePanEnd(event) { if (!isPanning) return; event.preventDefault(); isPanning = false; gameBoard.classList.remove('panning'); document.removeEventListener('mousemove', handlePanMove, { capture: true }); document.removeEventListener('mouseup', handlePanEnd, { capture: true }); }
function handlePanStartTouch(event) { if (event.touches.length !== 1 || event.target.closest('.unit,.item,.obstacle,.ui-button,button,a,.spell-icon,#default-view-button') || isAnyOverlayVisible()) { isPanning = false; return; } const touch = event.touches[0]; isPanning = true; panStartX = touch.clientX; panStartY = touch.clientY; gridStartPanX = gridContentOffsetX; gridStartPanY = gridContentOffsetY; document.addEventListener('touchmove', handlePanMoveTouch, { passive: false, capture: true }); document.addEventListener('touchend', handlePanEndTouch, { once: true, capture: true }); document.addEventListener('touchcancel', handlePanEndTouch, { once: true, capture: true }); }
function handlePanMoveTouch(event) { if (!isPanning || event.touches.length !== 1) { handlePanEndTouch(event); return; } event.preventDefault(); gameBoard.classList.add('panning'); const touch = event.touches[0]; gridContentOffsetX = gridStartPanX + (touch.clientX - panStartX); gridContentOffsetY = gridStartPanY + (touch.clientY - panStartY); applyZoomAndPan(); }
function handlePanEndTouch(event) { if (!isPanning) return; isPanning = false; gameBoard.classList.remove('panning'); document.removeEventListener('touchmove', handlePanMoveTouch, { capture: true }); document.removeEventListener('touchend', handlePanEndTouch, { capture: true }); document.removeEventListener('touchcancel', handlePanEndTouch, { capture: true }); }

function clampPan() {
    if (!gameBoard || !gridContent || currentZoom <= 0) return;
    const boardRect = gameBoard.getBoundingClientRect();
    const gridRenderedWidth = gridContent.offsetWidth * currentZoom; const gridRenderedHeight = gridContent.offsetHeight * currentZoom;
    let minOffsetX, maxOffsetX, minOffsetY, maxOffsetY; const padding = 5;
    if (gridRenderedWidth < boardRect.width) { minOffsetX = maxOffsetX = (boardRect.width - gridRenderedWidth) / 2; } else { minOffsetX = boardRect.width - gridRenderedWidth - padding; maxOffsetX = padding; }
    if (gridRenderedHeight < boardRect.height) { minOffsetY = maxOffsetY = (boardRect.height - gridRenderedHeight) / 2; } else { minOffsetY = boardRect.height - gridRenderedHeight - padding; maxOffsetY = padding; }
    gridContentOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, gridContentOffsetX)); gridContentOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, gridContentOffsetY));
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

function updateDefaultViewButtonVisibility() { if (defaultViewButton) { defaultViewButton.classList.toggle('hidden', isDefaultView()); } }
function centerView(immediate = false) {
    if (!gameBoard || !gridContent) return; calculateCellSize();
    const boardWidth = gameBoard.clientWidth; const boardHeight = gameBoard.clientHeight; if (boardWidth <= 0 || boardHeight <= 0 || currentCellSize <= 0) return;
    const gridWidth = currentGridCols * currentCellSize; const gridHeight = currentGridRows * currentCellSize; if (gridWidth <= 0 || gridHeight <= 0) return;
    const targetZoom = calculateMinZoomToFit(); const targetOffsetX = (boardWidth - (gridWidth * targetZoom)) / 2; const targetOffsetY = (boardHeight - (gridHeight * targetZoom)) / 2;
    currentZoom = targetZoom;
    if (immediate) { const originalTransition = gridContent.style.transition; gridContent.style.transition = 'none'; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = 'none'; gridContentOffsetX = targetOffsetX; gridContentOffsetY = targetOffsetY; applyZoomAndPan(); requestAnimationFrame(() => { if (gridContent) gridContent.style.transition = originalTransition; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = originalTransition; }); }
    else { const transitionStyle = 'transform 0.3s ease-out'; gridContent.style.transition = transitionStyle; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = transitionStyle; gridContentOffsetX = targetOffsetX; gridContentOffsetY = targetOffsetY; applyZoomAndPan(); setTimeout(() => { if (gridContent) gridContent.style.transition = ''; if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = ''; }, 300); }
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
function clampMapOffsets(rawOffsetX, rawOffsetY) { if (!levelSelectMapContainer || !levelSelectMap) return { x: 0, y: 0 }; const containerRect = levelSelectMapContainer.getBoundingClientRect(); if (containerRect.width <= 0 || containerRect.height <= 0) return { x: mapOffsetX || 0, y: mapOffsetY || 0 }; const safeMapWidth = Math.max(1, mapIntrinsicWidth || 1024); const safeMapHeight = Math.max(1, mapIntrinsicHeight || 1024); const baseScale = calculateMapScale(containerRect.width, containerRect.height, safeMapWidth, safeMapHeight); const currentMapZoom = (typeof mapZoom === 'number' && !isNaN(mapZoom) && mapZoom >= MIN_MAP_ZOOM) ? Math.min(MAX_MAP_ZOOM, mapZoom) : MIN_MAP_ZOOM; const finalScale = baseScale * currentMapZoom; if (finalScale <= 0 || isNaN(finalScale)) return { x: mapOffsetX || 0, y: mapOffsetY || 0 }; const mapRenderWidth = safeMapWidth * finalScale; const mapRenderHeight = safeMapHeight * finalScale; let minOffsetX = 0, maxOffsetX = 0, minOffsetY = 0, maxOffsetY = 0; const padding = 0; if (mapRenderWidth < containerRect.width) { minOffsetX = maxOffsetX = (containerRect.width - mapRenderWidth) / 2; } else { maxOffsetX = padding; minOffsetX = containerRect.width - mapRenderWidth - padding; } if (mapRenderHeight < containerRect.height) { minOffsetY = maxOffsetY = (containerRect.height - mapRenderHeight) / 2; } else { maxOffsetY = padding; minOffsetY = containerRect.height - mapRenderHeight - padding; } const clampedX = Math.max(minOffsetX, Math.min(maxOffsetX, rawOffsetX)); const clampedY = Math.max(minOffsetY, Math.min(maxOffsetY, rawOffsetY)); return { x: clampedX, y: clampedY }; }

function handleMapPanStart(event) { const clickedDot = event.target.closest('.level-dot'); const clickedButton = event.target.closest('button, .primary-button, .secondary-button, .pagination-button'); const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen(); if (event.button !== 0 || clickedDot || clickedButton || anotherOverlayActive) { isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab'; return; } event.preventDefault(); isMapPanning = true; mapPanStartX = event.clientX; mapPanStartY = event.clientY; mapStartPanX = mapOffsetX; mapStartPanY = mapOffsetY; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grabbing'; document.addEventListener('mousemove', handleMapPanMove, { passive: false, capture: true }); document.addEventListener('mouseup', handleMapPanEnd, { once: true, capture: true }); }
function handleMapPanMove(event) { if (!isMapPanning || !levelSelectMap || !levelSelectMapContainer) return; event.preventDefault(); const deltaX = event.clientX - mapPanStartX; const deltaY = event.clientY - mapPanStartY; const rawOffsetX = mapStartPanX + deltaX; const rawOffsetY = mapStartPanY + deltaY; const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY); mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y; applyMapZoomAndPan(true); }
function handleMapPanEnd(event) { if (!isMapPanning) return; event.preventDefault(); isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab'; document.removeEventListener('mousemove', handleMapPanMove, { capture: true }); document.removeEventListener('mouseup', handleMapPanEnd, { capture: true }); document.removeEventListener('touchmove', handleMapPanMoveTouch, { capture: true }); document.removeEventListener('touchend', handleMapPanEndTouch, { capture: true }); document.removeEventListener('touchcancel', handleMapPanEndTouch, { capture: true }); }
function handleMapPanStartTouch(event) { const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen(); if (isMapPanning || anotherOverlayActive) return; const touchTarget = event.target; const clickedDot = touchTarget.closest('.level-dot'); const clickedButton = touchTarget.closest('button, .primary-button, .secondary-button, .pagination-button'); if (clickedDot || clickedButton) return; if (event.touches.length === 1) { const touch = event.touches[0]; isMapPanning = true; mapPanStartX = touch.clientX; mapPanStartY = touch.clientY; mapStartPanX = mapOffsetX; mapStartPanY = mapOffsetY; document.addEventListener('touchmove', handleMapPanMoveTouch, { passive: false, capture: true }); document.addEventListener('touchend', handleMapPanEndTouch, { once: true, capture: true }); document.addEventListener('touchcancel', handleMapPanEndTouch, { once: true, capture: true }); } }
function handleMapPanMoveTouch(event) { if (!isMapPanning || event.touches.length !== 1) { handleMapPanEndTouch(event); return; } event.preventDefault(); if (levelSelectMapContainer) levelSelectMapContainer.classList.add('panning'); const touch = event.touches[0]; const deltaX = touch.clientX - mapPanStartX; const deltaY = touch.clientY - mapPanStartY; const rawOffsetX = mapStartPanX + deltaX; const rawOffsetY = mapStartPanY + deltaY; const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY); mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y; applyMapZoomAndPan(true); }
function handleMapPanEndTouch(event) { if (!isMapPanning) return; isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.classList.remove('panning'); document.removeEventListener('touchmove', handleMapPanMoveTouch, { capture: true }); document.removeEventListener('touchend', handleMapPanEndTouch, { capture: true }); document.removeEventListener('touchcancel', handleMapPanEndTouch, { capture: true }); }

function focusMapOnQuadrant(immediate = true) {
    if (!levelSelectMapContainer || !levelSelectMap) return;
    const currentHighestLevel = parseInt(highestLevelReached || '1', 10);
    const levelIndex = Math.max(0, currentHighestLevel - 1);
    const baseLevelIndex = levelIndex % TOTAL_LEVELS_BASE;
    const quadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS;
    const isMobileView = window.matchMedia("(max-width: 700px)").matches;
    const activeQuadrantCenters = isMobileView ? MOBILE_VISUAL_QUADRANT_CENTERS : VISUAL_QUADRANT_CENTERS;
    const targetCenter = activeQuadrantCenters[quadrantIndex] || { x: 50, y: 50 };
    const targetXPercent = targetCenter.x; const targetYPercent = targetCenter.y;
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
    if (isPanning || event.target.closest('.unit,.item,.obstacle') || isProcessing || !isGameActive() || isAnyOverlayVisible()) return;
    const cell = event.currentTarget;
    const x = parseInt(cell.dataset.x); const y = parseInt(cell.dataset.y);
    if (!isCellInBounds(x, y)) return;

    const obstacle = getObstacleAt(x, y); const unitOnCell = getUnitAt(x, y);

    if (obstacle && !obstacle.enterable && !obstacle.destructible) { playSfx('error'); showFeedback("Cannot target cell.", "feedback-error"); if (currentSpell) setActiveSpell(null); if (selectedUnit) deselectUnit(); return; }
    if (unitOnCell && currentTurn === 'player' && !selectedUnit) { handleUnitClick(event, unitOnCell); return; }
    if (obstacle?.enterable && obstacle.occupantUnitId) {
        const unitInside = units.find(u => u.id === obstacle.occupantUnitId);
        playSfx('error'); showFeedback("Tower is occupied.", "feedback-error");
        if (currentSpell) setActiveSpell(null); if (selectedUnit) deselectUnit(); return;
    }

    if (currentSpell) {
        let targetForSpell = null; let originElement = null;
        if (currentSpell === 'frostNova' || currentSpell === 'flameWave') { targetForSpell = { x, y }; }
        else if (currentSpell === 'fireball') { if (obstacle?.canBeAttacked) { targetForSpell = obstacle; originElement = fireballElement; } else if (unitOnCell?.team === 'enemy' && isUnitAliveAndValid(unitOnCell)) { targetForSpell = unitOnCell; originElement = fireballElement; } else { playSfx('error'); showFeedback("Select a valid target for Fireball.", "feedback-error"); setActiveSpell(null); return; } }
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
    } else if (selectedUnit) { deselectUnit(); }
}

async function handleUnitClick(event, clickedUnit) {
    event.stopPropagation();
    if (isPanning || !isGameActive() || isProcessing || !clickedUnit || !isUnitAliveAndValid(clickedUnit) || isAnyOverlayVisible()) { if (!isUnitAliveAndValid(clickedUnit)) { if (selectedUnit) deselectUnit(); updateUnitInfo(null); } return; }
    if (isMobileDevice()) { if (tooltipTimeout) clearTimeout(tooltipTimeout); showTooltip(clickedUnit, 'unit'); tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS); } else { updateUnitInfo(clickedUnit); }

    if (currentSpell) {
        let castSuccess = false; let originElementForSpell = null;
        if (currentSpell === 'fireball') originElementForSpell = fireballElement; else if (currentSpell === 'heal') originElementForSpell = healElement;
        else if (currentSpell === 'frostNova') originElementForSpell = frostNovaElement; else if (currentSpell === 'flameWave') originElementForSpell = flameWaveElement;

        let isValidSpellTarget = false;
        if (currentSpell === 'fireball' && clickedUnit.team === 'enemy') isValidSpellTarget = true;
        if (currentSpell === 'heal' && clickedUnit.team === 'player') isValidSpellTarget = true;
        if (currentSpell === 'frostNova' || currentSpell === 'flameWave') isValidSpellTarget = true; // These target a location, so unit click is valid as a location

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
        if (selectedUnit) {
            if (clickedUnit.team === 'enemy') {
                let targetObjectForAttack = clickedUnit;
                if (clickedUnit.inTower) { const tower = obstacles.find(o => o.id === clickedUnit.inTower); if (tower && isObstacleIntact(tower)) { targetObjectForAttack = tower; } else { playSfx('error'); showFeedback("Cannot target unit in destroyed tower.", "feedback-error"); deselectUnit(); return; } }
                const attackTargets = getValidAttackTargets(selectedUnit); const targetIsUnit = !!targetObjectForAttack.team;
                const canAttack = targetIsUnit ? attackTargets.units.includes(targetObjectForAttack.id) : attackTargets.obstacles.includes(targetObjectForAttack.id);
                if (canAttack) { const attacker = selectedUnit; await attack(attacker, targetObjectForAttack.x, targetObjectForAttack.y); }
                else { playSfx('error'); showFeedback("Cannot attack target.", "feedback-error"); deselectUnit(); }
            }
            else if (clickedUnit.team === 'player') {
                if (clickedUnit.id === selectedUnit.id) {
                    if (clickedUnit.type === 'rogue') {
                        const stealthButton = document.getElementById('ability-stealth');
                        const qsButton = document.getElementById('ability-quick-strike');
                        if (stealthButton && !stealthButton.classList.contains('hidden') && !stealthButton.disabled) activateRogueStealth(clickedUnit);
                        else if (qsButton && !qsButton.classList.contains('hidden') && !qsButton.disabled) activateRogueQuickStrike(clickedUnit);
                        else deselectUnit();
                    } else { deselectUnit(); }
                } else { selectUnit(clickedUnit); }
            } else { deselectUnit(); }
        } else if (clickedUnit.team === 'player') { selectUnit(clickedUnit); }
    } else if (currentTurn !== 'player') { updateUnitInfo(clickedUnit); }
}

async function handleItemClick(event, clickedItem) {
    event.stopPropagation();
    if (isPanning || isProcessing || !isGameActive() || !clickedItem || clickedItem.collected || isAnyOverlayVisible()) return;
    if (isMobileDevice()) { if (tooltipTimeout) clearTimeout(tooltipTimeout); showTooltip(clickedItem, 'item'); tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS); }

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
        else { deselectUnit(); }
    } else if (selectedUnit) { deselectUnit(); }
}

async function handleObstacleClick(event, clickedObstacle) {
    event.stopPropagation();
    if (isPanning || isProcessing || !isGameActive() || !clickedObstacle || !isObstacleIntact(clickedObstacle) || isAnyOverlayVisible()) return;
    const targetX = clickedObstacle.x; const targetY = clickedObstacle.y;
    if (isMobileDevice()) { if (tooltipTimeout) clearTimeout(tooltipTimeout); showTooltip(clickedObstacle, 'obstacle'); tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS); }

    if (!levelClearedAwaitingInput && currentSpell) {
        let castSuccess = false; let originEl = null; if (currentSpell === 'fireball') originEl = fireballElement;
        if (currentSpell === 'fireball' && clickedObstacle.canBeAttacked) { castSuccess = await castSpell(currentSpell, clickedObstacle, originEl); }
        if (!castSuccess && currentSpell) { playSfx('error'); showFeedback("Cannot target obstacle with this spell.", "feedback-error"); setActiveSpell(null); }
        return;
    }

    if (currentTurn === 'player' && selectedUnit) {
        const attackTargets = getValidAttackTargets(selectedUnit);
        const isAttackable = attackTargets.obstacles.includes(clickedObstacle.id) && clickedObstacle.canBeAttacked;
        if (isAttackable) { const attacker = selectedUnit; await attack(attacker, targetX, targetY); return; }
        else if (clickedObstacle.type === 'snowman' && !clickedObstacle.revealed && clickedObstacle.clickable && getDistance(selectedUnit, clickedObstacle) <= selectedUnit.currentRange) { const attacker = selectedUnit; await attack(attacker, targetX, targetY); return; }
        else if (clickedObstacle.enterable && !clickedObstacle.occupantUnitId && !selectedUnit.inTower && !selectedUnit.acted && !selectedUnit.isFrozen && !selectedUnit.isNetted) {
            const entryX = targetX; const entryY = targetY + 1;
            if (isCellInBounds(entryX, entryY)) {
                const obstacleAtEntry = getObstacleAt(entryX, entryY); if (obstacleAtEntry?.blocksMove) { playSfx('error'); showFeedback("Path blocked.", "feedback-error"); deselectUnit(); return; }
                const path = findPathToTarget(selectedUnit, entryX, entryY); const availableMov = selectedUnit.mov - (selectedUnit.isSlowed ? 1 : 0);
                if (path !== null && path.length <= availableMov) { const unitToEnter = selectedUnit; deselectUnit(false); isProcessing = true; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); try { await initiateTowerEntrySequence(unitToEnter, clickedObstacle, path); } catch (e) { console.error("Tower entry sequence error:", e); playSfx('error'); isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay(); } return; }
                else { playSfx('error'); showFeedback("Cannot reach.", "feedback-error"); deselectUnit(); return; }
            } else { playSfx('error'); showFeedback("Invalid entry.", "feedback-error"); deselectUnit(); return; }
        } else if (clickedObstacle.clickable && (!selectedUnit || selectedUnit.team !== 'player')) {
            // Select the obstacle if it's clickable and we aren't in a state to attack it (or no unit selected)
            // CHANGE: Do NOT select the obstacle. Just play a sound or show info temporarily?
            // User wants it to be "like an enemy" - so no selection. Hover handles info.
            playSfx('select');
            // if (selectedUnit) deselectUnit();
            // selectedUnit = clickedObstacle;
            // updateUnitInfo(clickedObstacle);
        } else { playSfx('error'); if (clickedObstacle.destructible && !isAttackable) showFeedback("Out of range/sight or not attackable.", "feedback-error"); else if (clickedObstacle.type === 'snowman' && !clickedObstacle.revealed) showFeedback("Get closer or shoot it!", "feedback-error"); else showFeedback("Cannot interact.", "feedback-error"); deselectUnit(); return; }
        playSfx('select');
    }
}

function handleUnitMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; }
function handleUnitMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleItemMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; }
function handleItemMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleObstacleMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; }
function handleObstacleMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleCellMouseEnter(event) { if (isMobileDevice() || !isGameActive() || isProcessing || isPanning || !gameBoard || isAnyOverlayVisible()) return; const cell = event.currentTarget; const x = parseInt(cell.dataset.x); const y = parseInt(cell.dataset.y); const unitOnCell = getUnitAt(x, y); const obstacleOnCell = getObstacleAt(x, y); clearSpellHighlights(); if (currentSpell === 'frostNova') highlightFrostNovaArea(x, y); else if (currentSpell === 'flameWave') highlightFlameWaveArea(y); else if (currentSpell === 'fireball') { if ((unitOnCell?.team === 'enemy' && isUnitAliveAndValid(unitOnCell)) || (obstacleOnCell?.canBeAttacked && isObstacleIntact(obstacleOnCell))) { cell.classList.add('valid-fireball-target'); if (unitOnCell?.element) unitOnCell.element.classList.add('valid-fireball-target'); if (obstacleOnCell?.element) obstacleOnCell.element.classList.add('valid-fireball-target'); } } else if (currentSpell === 'heal') { if (unitOnCell?.team === 'player' && isUnitAliveAndValid(unitOnCell)) { cell.classList.add('valid-heal-target'); if (unitOnCell.element) unitOnCell.element.classList.add('valid-heal-target'); } } const canBePrimaryTarget = cell.classList.contains('can-be-primary-target'); if (selectedUnit?.type === 'champion' && canBePrimaryTarget && !currentSpell) { let targetPos = unitOnCell || obstacleOnCell; if (targetPos) showAttackHoverHighlights(selectedUnit, targetPos); else clearAttackHoverHighlights(); } else if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }
function handleCellMouseLeave(event) { if (isMobileDevice() || !isGameActive() || isProcessing || isPanning || isAnyOverlayVisible()) return; if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }
function handleGridMouseLeave() { clearSpellHighlights(); if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }

function handleKeyDown(event) { if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return; const overlayVisible = isAnyOverlayVisible(); const gameRunning = isGameActive(); const gameActiveAndNoOverlay = gameRunning && !overlayVisible; if (event.key.toLowerCase() === 'm' && isSettingsOpen()) { muteToggleSetting.checked = !muteToggleSetting.checked; toggleMute(); event.preventDefault(); return; } if (event.key === 'F4') { toggleFullscreen(); event.preventDefault(); return; } if (event.key.toLowerCase() === 'z' && isSettingsOpen()) { toggleHpBarsSetting.checked = !toggleHpBarsSetting.checked; toggleWorldHpBarsVisibility(); event.preventDefault(); return; } if (event.key === 'Home' && gameActiveAndNoOverlay) { centerView(false); event.preventDefault(); return; } if (event.key === 'Escape') { if (isShopOpen()) { hideShop(); proceedAfterShopMaybe(); event.preventDefault(); return; } if (isLevelCompleteOpen()) { hideLevelComplete(); proceedToNextLevelOrLocation(); event.preventDefault(); return; } if (isMenuOpen()) { hideMenu(); event.preventDefault(); return; } if (isLeaderboardOpen()) { hideLeaderboard(); showMainMenu(); event.preventDefault(); return; } if (isChooseTroopsScreenOpen()) { handleTroopsBack(); event.preventDefault(); return; } if (isLevelSelectOpen()) { showMainMenu(); event.preventDefault(); return; } if (isGameOverScreenVisible()) { showMainMenu(); event.preventDefault(); return; } if (isSettingsOpen()) { hideSettings(); if (menuOverlay?.classList.contains('visible')) { } else { showMainMenu(); } event.preventDefault(); return; } if (isAchievementsOpen()) { hideAchievements(); showMainMenu(); event.preventDefault(); return; } if (gameActiveAndNoOverlay) { if (currentSpell) setActiveSpell(null); else if (selectedUnit) deselectUnit(); else showMenu(); event.preventDefault(); } return; } if (isLevelSelectOpen() && event.key.toLowerCase() === 'e') { if (typeof highestLevelReached !== 'undefined' && highestLevelReached > 0) { playSfx('levelSelect'); hideLevelSelect(); initGame(highestLevelReached); event.preventDefault(); } else playSfx('error'); return; } if (isLevelCompleteOpen() && event.key.toLowerCase() === 'e') { nextLevelButton?.click(); event.preventDefault(); return; } if (isLevelCompleteOpen() && event.key.toLowerCase() === 's') { levelCompleteShopButton?.click(); event.preventDefault(); return; } if (isShopOpen() && event.key.toLowerCase() === 'e') { shopExitButton?.click(); event.preventDefault(); return; } if (isLevelSelectOpen() && event.key.toLowerCase() === 's') { levelSelectShopButton?.click(); event.preventDefault(); return; } if (overlayVisible || isProcessing || (event.metaKey || event.ctrlKey)) return; if (event.shiftKey && gameRunning) { const key = event.key.toLowerCase(); if (key === 'h') { event.preventDefault(); applyCheatSpellAttack(50); return; } if (key === 'g') { event.preventDefault(); applyCheatGold(500); return; } if (key === 'b') { event.preventDefault(); unlimitedSpellsCheat = !unlimitedSpellsCheat; showFeedback(unlimitedSpellsCheat ? "CHEAT: Unlimited Spells!" : "CHEAT OFF: Limited Spells.", "feedback-cheat"); playSfx('cheat'); resetSpellStateForNewLevel(); updateSpellUI(); return; } if (key === 't' && currentTurn === 'player' && !levelClearedAwaitingInput && gameActiveAndNoOverlay) { event.preventDefault(); if (isProcessing) return; isProcessing = true; if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showFeedback === 'function') showFeedback("CHEAT: Skipping Level...", "feedback-levelup", 150); playSfx('cheat'); setTimeout(() => { if (!isGameActive() || isGameOver()) { isProcessing = false; return; } units = units.filter(u => u.team === 'player'); clearTimeoutMap(deathSpriteTimeouts); const stats = typeof calculateLevelStats === 'function' ? calculateLevelStats() : { totalGoldEarned: 0, goldGained: 0 }; playerGold += (stats.totalGoldEarned || 0) - (stats.goldGained || 0); playerGold = Math.max(0, playerGold); if (currentLevel >= highestLevelReached) highestLevelReached = currentLevel + 1; if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel, playerGold, gameSettings.playerName); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); stopMusic(); hideAllOverlays(); if (typeof startNextLevel === 'function') startNextLevel(); else { isGameActiveFlag = false; isProcessing = false; showLevelSelect(); } }, 150); return; } } else if (gameActiveAndNoOverlay && currentTurn === 'player') { if (event.key === '1') { setActiveSpell('fireball'); event.preventDefault(); return; } if (event.key === '2') { setActiveSpell('flameWave'); event.preventDefault(); return; } if (event.key === '3') { setActiveSpell('frostNova'); event.preventDefault(); return; } if (event.key === '4') { setActiveSpell('heal'); event.preventDefault(); return; } if (event.key.toLowerCase() === 'e') { endTurnButton?.click(); event.preventDefault(); } } }
function isAnyOverlayVisible(excludeMainMenu = false) { return isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isLevelSelectOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isSettingsOpen() || isAchievementsOpen() || (!excludeMainMenu && isMainMenuOpen()); }
function hideAllOverlays() { const overlays = [mainMenu, gameOverScreen, menuOverlay, leaderboardOverlay, levelSelectScreen, shopScreen, levelCompleteScreen, chooseTroopsScreen, settingsOverlay, achievementsOverlay]; overlays.forEach(o => { o?.classList.add('hidden'); o?.classList.remove('visible'); }); gameBoardWrapper?.classList.toggle('active', isGameActive() && !isAnyOverlayVisible()); startTooltipUpdater(); }
function showMainMenu() { fullGameReset(); hideAllOverlays(); mainMenu?.classList.remove('hidden'); mainMenu?.classList.add('visible'); startTooltipUpdater(); stopMusic(); } function hideMainMenu() { mainMenu?.classList.remove('visible'); mainMenu?.classList.add('hidden'); } function isMainMenuOpen() { return mainMenu?.classList.contains('visible'); }
function showLevelCompleteScreen(stats, finalGold) { hideAllOverlays(); stopMusic(); playVictoryMusic(); startTooltipUpdater(); if (!levelCompleteScreen || !statsBonusList || !levelCompleteTotalGoldElement) return; statsEnemiesKilled.textContent = stats.enemiesKilled; statsUnitsLost.textContent = stats.unitsLost; statsGoldGained.textContent = stats.goldGained; statsTotalGold.textContent = stats.totalGoldEarned; levelCompleteTotalGoldElement.textContent = finalGold; statsBonusList.querySelector('[data-bonus="noSpells"]').classList.toggle('hidden', stats.bonusGoldNoSpells <= 0); statsBonusList.querySelector('[data-bonus="noSpells"] .bonus-amount').textContent = stats.bonusGoldNoSpells; statsBonusList.querySelector('[data-bonus="fullHp"]').classList.toggle('hidden', stats.bonusGoldFullHp <= 0); statsBonusList.querySelector('[data-bonus="fullHp"] .bonus-amount').textContent = stats.bonusGoldFullHp; statsBonusList.querySelector('[data-bonus="noLosses"]').classList.toggle('hidden', stats.bonusGoldNoLosses <= 0); statsBonusList.querySelector('[data-bonus="noLosses"] .bonus-amount').textContent = stats.bonusGoldNoLosses; statsBonusList.querySelector('[data-bonus="noArmor"]').classList.toggle('hidden', stats.bonusGoldNoArmor <= 0); statsBonusList.querySelector('[data-bonus="noArmor"] .bonus-amount').textContent = stats.bonusGoldNoArmor; levelCompleteScreen.classList.remove('hidden'); levelCompleteScreen.classList.add('visible'); } function hideLevelComplete() { levelCompleteScreen?.classList.remove('visible'); levelCompleteScreen?.classList.add('hidden'); } function isLevelCompleteOpen() { return levelCompleteScreen?.classList.contains('visible'); }
function showGameOverScreen(playerWon, message, isForfeit = false) { hideAllOverlays(); stopMusic(); startTooltipUpdater(); if (!gameOverScreen || !gameOverTitle || !gameOverMessage || !restartButton || !gameOverToTitleButton) return; gameOverTitle.textContent = playerWon ? "Victory!" : (isForfeit ? "Level Forfeited" : "Defeat!"); gameOverMessage.innerHTML = message; restartButton.textContent = playerWon ? "Play Again?" : "Restart Level"; restartButton.style.display = (isForfeit || playerWon) ? 'none' : 'inline-block'; gameOverToTitleButton.textContent = "Back to Title"; gameOverScreen.classList.remove('hidden'); gameOverScreen.classList.add('visible'); } function hideGameOverScreen() { gameOverScreen?.classList.remove('visible'); gameOverScreen?.classList.add('hidden'); } function isGameOverScreenVisible() { return gameOverScreen?.classList.contains('visible'); }
function showMenu() { if (!isAnyOverlayVisible() && isGameActive()) { menuOverlay?.classList.remove('hidden'); menuOverlay?.classList.add('visible'); updateGoldDisplay(); updateQuitButton(); stopTooltipUpdater(); startTooltipUpdater(); } } function hideMenu() { menuOverlay?.classList.remove('visible'); menuOverlay?.classList.add('hidden'); stopTooltipUpdater(); if (isGameActive() && !isAnyOverlayVisible()) startTooltipUpdater(); } function isMenuOpen() { return menuOverlay?.classList.contains('visible'); }
function showSettings(originMenu = false) { hideAllOverlays(); settingsOverlay?.classList.remove('hidden'); settingsOverlay?.classList.add('visible'); loadSettings(); if (musicVolumeSlider) musicVolumeSlider.value = musicVolume; if (musicVolumeValueSpan) musicVolumeValueSpan.textContent = `${Math.round(musicVolume * 100)}%`; if (sfxVolumeSlider) sfxVolumeSlider.value = sfxVolume; if (sfxVolumeValueSpan) sfxVolumeValueSpan.textContent = `${Math.round(sfxVolume * 100)}%`; if (muteToggleSetting) muteToggleSetting.checked = isMuted; if (fullscreenToggleSetting) fullscreenToggleSetting.checked = isFullscreen(); if (toggleHpBarsSetting) toggleHpBarsSetting.checked = gameSettings.showHpBars; if (playerNameSettingInput) playerNameSettingInput.value = gameSettings.playerName; settingsOverlay.dataset.originMenu = originMenu; startTooltipUpdater(); } function hideSettings() { const originMenu = settingsOverlay?.dataset.originMenu === 'true'; settingsOverlay?.classList.remove('visible'); settingsOverlay?.classList.add('hidden'); settingsOverlay.dataset.originMenu = 'false'; if (originMenu) { showMenu(); } else { showMainMenu(); } } function isSettingsOpen() { return settingsOverlay?.classList.contains('visible'); }
function showAchievements() { hideAllOverlays(); achievementsOverlay?.classList.remove('hidden'); achievementsOverlay?.classList.add('visible'); updateAchievementsScreen(); startTooltipUpdater(); } function hideAchievements() { achievementsOverlay?.classList.remove('visible'); achievementsOverlay?.classList.add('hidden'); showMainMenu(); } function isAchievementsOpen() { return achievementsOverlay?.classList.contains('visible'); }
function saveScoreToLeaderboard(level, gold, name) { try { const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]'); const safeName = typeof name === 'string' ? name.substring(0, 12).trim() : "Hero"; const newScore = { name: safeName, level, gold, date: new Date().toISOString().split('T')[0] }; leaderboard.push(newScore); leaderboard.sort((a, b) => { if (b.level !== a.level) return b.level - a.level; return b.gold - a.gold; }); const uniqueLeaderboard = leaderboard.reduce((acc, current) => { const existing = acc.find(item => item.name === current.name && item.level === current.level); if (!existing || current.gold > existing.gold) { if (existing) acc.splice(acc.indexOf(existing), 1); acc.push(current); } acc.sort((a, b) => { if (b.level !== a.level) return b.level - a.level; return b.gold - a.gold; }); return acc; }, []).slice(0, MAX_LEADERBOARD_ENTRIES); localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(uniqueLeaderboard)); } catch (e) { console.error("Error saving leaderboard:", e); } }
function showLeaderboard(showInput = false, level = 0, gold = 0) { hideAllOverlays(); startTooltipUpdater(); leaderboardList.innerHTML = ''; leaderboardEntry.classList.toggle('hidden', !showInput); playerNameInput.value = gameSettings.playerName || "Hero"; submitScoreButton.onclick = () => { const name = playerNameInput.value || "Hero"; updateSetting('playerName', name); saveScoreToLeaderboard(level, gold, name); leaderboardEntry.classList.add('hidden'); showLeaderboard(false); }; try { const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]'); if (leaderboard.length === 0) leaderboardList.innerHTML = '<li>No scores yet!</li>'; else leaderboard.forEach(score => { const li = document.createElement('li'); li.innerHTML = `<span>${score.name || 'Hero'} (Lvl ${score.level})</span> <span>${score.gold} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"></span>`; leaderboardList.appendChild(li); }); } catch (e) { console.error("Error reading leaderboard:", e); leaderboardList.innerHTML = '<li>Error loading scores.</li>'; } leaderboardOverlay?.classList.remove('hidden'); leaderboardOverlay?.classList.add('visible'); } function hideLeaderboard() { leaderboardOverlay?.classList.remove('visible'); leaderboardOverlay?.classList.add('hidden'); leaderboardEntry?.classList.add('hidden'); } function isLeaderboardOpen() { return leaderboardOverlay?.classList.contains('visible'); }
function showLevelSelect() { fullGameReset(); hideAllOverlays(); levelSelectScreen?.classList.remove('hidden'); levelSelectScreen?.classList.add('visible'); gameBoardWrapper?.classList.remove('active'); loadGameData(); currentLevelSelectPage = Math.floor(Math.max(0, highestLevelReached - 1) / LEVELS_PER_PAGE) + 1; updateLevelSelectScreen(); stopTooltipUpdater(); stopMusic(); const img = new Image(); img.onload = () => { mapIntrinsicWidth = img.naturalWidth || 1024; mapIntrinsicHeight = img.naturalHeight || 1024; if (levelSelectMap) { levelSelectMap.style.width = `${mapIntrinsicWidth}px`; levelSelectMap.style.height = `${mapIntrinsicHeight}px`; levelSelectMap.style.backgroundSize = '100% 100%'; } if (levelSelectDotsLayer) { levelSelectDotsLayer.style.width = `${mapIntrinsicWidth}px`; levelSelectDotsLayer.style.height = `${mapIntrinsicHeight}px`; } focusMapOnQuadrant(); startTooltipUpdater(); }; img.onerror = () => { mapIntrinsicWidth = 1024; mapIntrinsicHeight = 1024; mapZoom = 1; mapOffsetX = 0; mapOffsetY = 0; applyMapZoomAndPan(true); startTooltipUpdater(); }; img.src = WORLD_MAP_IMAGE_URL; } function hideLevelSelect() { levelSelectScreen?.classList.remove('visible'); levelSelectScreen?.classList.add('hidden'); startTooltipUpdater(); } function isLevelSelectOpen() { return levelSelectScreen?.classList.contains('visible'); }
function updateLevelSelectPagination() { if (!levelSelectPageInfo || !levelSelectPrevPage || !levelSelectNextPage) return; const maxPossibleLevel = ENABLE_INFINITE_LEVELS ? TOTAL_LEVELS_TO_SHOW : TOTAL_LEVELS_BASE; const totalPages = Math.ceil(maxPossibleLevel / LEVELS_PER_PAGE); levelSelectPageInfo.textContent = `Page ${currentLevelSelectPage} / ${totalPages}`; levelSelectPrevPage.disabled = currentLevelSelectPage <= 1; levelSelectNextPage.disabled = currentLevelSelectPage >= totalPages; levelSelectPrevPage.classList.toggle('hidden', totalPages <= 1); levelSelectNextPage.classList.toggle('hidden', totalPages <= 1); levelSelectPagination.classList.toggle('hidden', totalPages <= 1); }
function handleLevelSelectPageChange(direction) { const maxPossibleLevel = ENABLE_INFINITE_LEVELS ? TOTAL_LEVELS_TO_SHOW : TOTAL_LEVELS_BASE; const totalPages = Math.ceil(maxPossibleLevel / LEVELS_PER_PAGE); const newPage = currentLevelSelectPage + direction; if (newPage >= 1 && newPage <= totalPages) { playSfx('select'); currentLevelSelectPage = newPage; updateLevelSelectScreen(); } else { playSfx('error'); } }
function handleLevelDotClick(e) { const dot = e.currentTarget; if (dot && !dot.classList.contains('locked')) { const lvl = parseInt(dot.dataset.level); if (!isNaN(lvl)) { playSfx('levelSelect'); hideLevelSelect(); initGame(lvl); } else playSfx('error'); } }
function positionLevelDots() { if (!levelSelectMap || !levelSelectDotsLayer) return; levelSelectDotsLayer.querySelectorAll('.level-dot').forEach(dot => { const targetXPercent = parseFloat(dot.dataset.targetX || '50'); const targetYPercent = parseFloat(dot.dataset.targetY || '50'); dot.style.left = `${targetXPercent}%`; dot.style.top = `${targetYPercent}%`; const isHovered = dot === lastHoveredElement; dot.style.transform = `translate(-50%, -50%)${isHovered ? ' scale(1.45)' : ''}`; }); }
function showShop(origin = 'unknown', isBetweenLevelsFlag = false) { hideAllOverlays(); currentShopOrigin = origin; shopIsBetweenLevels = isBetweenLevelsFlag; selectedShopItemId = null; updateShopDisplay(); shopScreen?.classList.remove('hidden'); shopScreen?.classList.add('visible'); stopTooltipUpdater(); startTooltipUpdater(); } function hideShop() { shopScreen?.classList.remove('visible'); shopScreen?.classList.add('hidden'); selectedShopItemId = null; startTooltipUpdater(); } function isShopOpen() { return shopScreen?.classList.contains('visible'); }

function updateShopDisplay() {
    if (!shopItemsContainer || !shopActionButton || !shopSelectedItemInfoElement) return;
    updateGoldDisplay();
    shopFeedbackElement.textContent = ''; shopFeedbackElement.className = 'shop-message';
    const totalOwnedUnits = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0);
    const currentEquippedArmor = equippedArmorId || 'none';

    shopItemsContainer.querySelectorAll('.shop-item').forEach(item => {
        const itemId = item.dataset.itemId;
        const itemType = item.dataset.type;
        const unitType = item.dataset.unitType;
        const spellName = item.dataset.spellName;
        const armorId = item.dataset.armorId;
        const costSpan = item.querySelector('.shop-item-cost');
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
            if (countSpan) countSpan.textContent = currentOwnedCount; isMaxed = currentOwnedCount >= maxCount; canBuy = playerGold >= cost && !isMaxed;
            if (titleElement && UNIT_DATA[unitType]) { const unitName = UNIT_DATA[unitType].name; titleElement.innerHTML = `<span class="shop-icon-container"><span class="shop-item-icon icon icon-unit-${unitType}" title="${unitName} Icon"></span></span> ${unitName} <span style="white-space: nowrap;">${currentOwnedCount}/${maxCount}</span>`; }
        } else if (itemType === 'unit_upgrade') {
            const lookupId = itemId.startsWith('upgrade_') ? itemId.replace('upgrade_', '') : itemId;
            cost = getUnitUpgradeCost(lookupId); if (costSpan) costSpan.textContent = cost; item.dataset.currentCost = cost; canBuy = playerGold >= cost;
            if (titleElement && iconSpan) { const unitForUpgrade = lookupId.split('_')[0]; if (UNIT_DATA[unitForUpgrade]) iconSpan.className = `shop-item-icon icon icon-unit-${unitForUpgrade}`; }
        } else if (itemType === 'ability_upgrade') {
            const lookupId = itemId.startsWith('upgrade_') ? itemId.replace('upgrade_', '') : itemId;
            cost = ABILITY_UPGRADE_COSTS[lookupId] || 99999; if (costSpan) costSpan.textContent = cost; item.dataset.currentCost = cost; isMaxed = (playerAbilityUpgrades[lookupId] || 0) >= 1; canBuy = playerGold >= cost && !isMaxed;
            if (titleElement && iconSpan) { const unitForAbility = lookupId.split('_')[0]; if (UNIT_DATA[unitForAbility]) iconSpan.className = `shop-item-icon icon icon-unit-${unitForAbility}`; }
        } else if (itemType === 'spell_upgrade') {
            const config = SPELL_UPGRADE_CONFIG[spellName];
            if (config) { currentLevel = playerSpellUpgrades[spellName] || 0; cost = calculateSpellCost(spellName); isMaxed = currentLevel >= config.maxLevel; requiredLevel = config.requiredLevel; isLocked = !spellsUnlocked[spellName]; canBuy = playerGold >= cost && !isLocked && !isMaxed && highestLevelReached > requiredLevel; item.dataset.currentCost = (cost === Infinity ? '99999' : cost); if (costSpan) costSpan.textContent = isMaxed ? 'MAX' : (cost === Infinity ? 'MAX' : cost); if (spellLevelSpan) spellLevelSpan.textContent = currentLevel + 2; }
            else { isLocked = true; canBuy = false; }
        } else if (itemType === 'passive_purchase' && itemId === 'tactical_command') {
            cost = PASSIVE_UPGRADE_COSTS.tactical_command; const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0; isLocked = totalOwnedUnits < TACTICAL_COMMAND_UNLOCK_UNITS; isMaxed = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) >= MAX_ACTIVE_ROSTER_SIZE_MAX; canBuy = playerGold >= cost && !isLocked && !isMaxed; item.dataset.currentCost = cost; if (costSpan) costSpan.textContent = cost;
        } else if (itemType === 'passive' && itemId === 'passive_gold_magnet') {
            const magnetLevel = playerPassiveUpgrades.gold_magnet || 0; isLocked = magnetLevel === 0; isMaxed = true; canBuy = false; if (passiveLevelSpan) passiveLevelSpan.textContent = `Lvl ${magnetLevel}`; if (costSpan) costSpan.textContent = 'Drop Only'; item.classList.remove('selectable'); item.style.cursor = 'default';
        } else if (itemType === 'armor') {
            const ownedLevel = playerOwnedArmor[armorId] || 0; isLocked = ownedLevel === 0 && armorId !== 'none' && armorId !== 'grey'; canEquip = (ownedLevel > 0 || armorId === 'none' || armorId === 'grey') && equippedArmorId !== armorId; canBuy = false;
            if (iconImg && armorId && ARMOR_DATA[armorId]) { iconImg.src = ARMOR_DATA[armorId].iconPath || './sprites/armor.png'; iconImg.className = `shop-item-icon icon-armor icon-armor-${armorId}`; }
            item.classList.toggle('hidden', isLocked); item.classList.toggle('active-armor', equippedArmorId === armorId);
            if (armorLevelSpan && ownedLevel > 0 && armorId !== 'grey' && armorId !== 'none') { armorLevelSpan.textContent = `Lvl ${ownedLevel}`; armorLevelSpan.classList.remove('hidden'); } else if (armorLevelSpan) { armorLevelSpan.classList.add('hidden'); }
            const armorData = ARMOR_DATA[armorId]; if (descriptionP && armorData) descriptionP.innerHTML = formatDescription(armorData.description); if (resistanceP) { let resistanceText = ''; if (ownedLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL) { if (armorId === 'blue' && armorData.resistances?.frost >= ARMOR_RESISTANCE_VALUE) resistanceText = `+${ARMOR_RESISTANCE_VALUE} Frost Resist`; if (armorId === 'red' && armorData.resistances?.fire >= ARMOR_RESISTANCE_VALUE) resistanceText = `+${ARMOR_RESISTANCE_VALUE} Fire Resist`; } resistanceP.innerHTML = formatDescription(resistanceText); resistanceP.classList.toggle('hidden', resistanceText === ''); }
        }

        if (item.classList.contains('selectable')) { item.classList.toggle('locked', isLocked && itemType !== 'armor'); item.classList.toggle('maxed', isMaxed); item.classList.toggle('selected', selectedShopItemId === itemId); }
    });
    updateShopActionInfo();
}

function handleShopItemClick(event) { const itemElement = event.currentTarget; const itemId = itemElement.dataset.itemId; const itemType = itemElement.dataset.type; const isCurrentlySelected = itemElement.classList.contains('selected'); if (!itemElement.classList.contains('selectable')) { playSfx('error'); return; } if (itemType !== 'armor' && (itemElement.classList.contains('locked') || itemElement.classList.contains('maxed'))) { playSfx('error'); if (selectedShopItemId === itemId) { selectedShopItemId = null; itemElement.classList.remove('selected'); updateShopActionInfo(); } return; } playSfx('select'); if (isCurrentlySelected) { selectedShopItemId = null; itemElement.classList.remove('selected'); } else { if (selectedShopItemId) { const previousItem = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); previousItem?.classList.remove('selected'); } selectedShopItemId = itemId; itemElement.classList.add('selected'); } updateShopActionInfo(); }
function updateShopActionInfo() { if (!shopActionButton || !shopSelectedItemInfoElement) return; const selectedItem = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); if (!selectedItem || selectedShopItemId === null) { shopSelectedItemInfoElement.textContent = ""; shopActionButton.classList.add('hidden'); selectedShopItemId = null; return; } const itemId = selectedItem.dataset.itemId; const itemType = selectedItem.dataset.type; const itemNameElement = selectedItem.querySelector('h4'); const itemName = itemNameElement ? itemNameElement.textContent.split('(')[0].split('[')[0].trim() : "Item"; let cost = parseInt(selectedItem.dataset.currentCost) || 0; let actionText = "Buy"; let action = "buy"; let canAfford = playerGold >= cost; let isMaxed = selectedItem.classList.contains('maxed'); let isLocked = selectedItem.classList.contains('locked') && itemType !== 'armor'; let isEquipped = false; let canPerformAction = false; if (itemType === 'recruit') { actionText = "Recruit"; action = "recruit"; canPerformAction = canAfford && !isMaxed; } else if (itemType === 'unit_upgrade') { cost = getUnitUpgradeCost(itemId); actionText = "Upgrade"; action = "upgrade"; canPerformAction = canAfford; } else if (itemType === 'ability_upgrade') { cost = ABILITY_UPGRADE_COSTS[itemId] || 99999; isMaxed = (playerAbilityUpgrades[itemId] || 0) >= 1; actionText = "Purchase"; action = "buy_ability"; canPerformAction = canAfford && !isMaxed; } else if (itemType === 'spell_upgrade') { const spellName = selectedItem.dataset.spellName; cost = calculateSpellCost(spellName); currentLevel = playerSpellUpgrades[spellName] || 0; const config = SPELL_UPGRADE_CONFIG[spellName]; isMaxed = currentLevel >= config.maxLevel; requiredLevel = parseInt(selectedItem.dataset.requiredLevel) || 0; isLocked = !spellsUnlocked[spellName]; const meetsLevelReq = highestLevelReached > requiredLevel; actionText = "Upgrade"; action = "upgrade_spell"; canPerformAction = canAfford && !isLocked && !isMaxed && meetsLevelReq; } else if (itemType === 'passive_purchase' && itemId === 'tactical_command') { cost = PASSIVE_UPGRADE_COSTS.tactical_command; const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0; requiredUnits = parseInt(selectedItem.dataset.requiredUnits) || 0; const meetsUnitReq = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0) >= requiredUnits; isLocked = !meetsUnitReq; isMaxed = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) >= MAX_ACTIVE_ROSTER_SIZE_MAX; actionText = "Buy"; action = "buy_passive"; canPerformAction = canAfford && !isLocked && !isMaxed; } else if (itemType === 'armor') { const armorId = selectedItem.dataset.armorId; const ownedLevel = playerOwnedArmor[armorId] || 0; isEquipped = equippedArmorId === armorId; if (isEquipped) { actionText = "Equipped"; action = "equipped"; canPerformAction = false; } else if (ownedLevel > 0 || armorId === 'none' || armorId === 'grey') { actionText = "Equip"; action = "equip"; canPerformAction = true; } else { actionText = "Locked"; action = "locked"; canPerformAction = false; } } else { shopSelectedItemInfoElement.textContent = ""; shopActionButton.classList.add('hidden'); return; } shopActionButton.textContent = actionText; shopActionButton.dataset.action = action; shopActionButton.disabled = !canPerformAction; shopActionButton.classList.remove('hidden'); shopActionButton.classList.remove('green-accent', 'gold-accent', 'disabled-style'); if (action === 'equip') { shopActionButton.classList.add('gold-accent'); } else if (action === 'recruit' || action === 'upgrade' || action === 'buy_ability' || action === 'upgrade_spell' || action === 'buy_passive') { shopActionButton.classList.add('green-accent'); } if (!canPerformAction) { shopActionButton.classList.add('disabled-style'); } shopSelectedItemInfoElement.textContent = ""; }
function handleShopActionClick() { if (!selectedShopItemId || shopActionButton.disabled) { playSfx('error'); return; } const itemElement = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); if (!itemElement) { playSfx('error'); selectedShopItemId = null; updateShopActionInfo(); return; } const itemId = selectedShopItemId; const itemType = itemElement.dataset.type; const cost = parseInt(itemElement.dataset.currentCost) || 0; let purchaseResult = { success: false, showTroopsPopup: false }; let feedback = ''; let itemNameElement = itemElement.querySelector('h4'); let itemName = itemNameElement ? itemNameElement.textContent.split('(')[0].split('[')[0].trim() : "Item"; if (itemType === 'recruit') { const unitType = itemElement.dataset.unitType; purchaseResult = purchaseUnit(unitType); feedback = purchaseResult.success ? `Recruited ${itemName}!` : `Cannot recruit. Not enough gold or max owned.`; } else if (itemType === 'unit_upgrade') { const lookupId = itemId.startsWith('upgrade_') ? itemId.replace('upgrade_', '') : itemId; purchaseResult.success = purchaseUnitUpgrade(lookupId); feedback = purchaseResult.success ? `Upgraded ${itemName}!` : `Cannot upgrade. Not enough gold.`; } else if (itemType === 'ability_upgrade') { const lookupId = itemId.startsWith('upgrade_') ? itemId.replace('upgrade_', '') : itemId; purchaseResult.success = purchaseAbilityUpgrade(lookupId); feedback = purchaseResult.success ? `Purchased ${itemName}!` : `Cannot purchase. Not enough gold or already owned.`; } else if (itemType === 'spell_upgrade') { const spellName = itemElement.dataset.spellName; purchaseResult.success = purchaseSpellUpgrade(spellName); feedback = purchaseResult.success ? `Upgraded ${itemName}!` : `Cannot upgrade. Not enough gold, level too low, or max level.`; } else if (itemType === 'passive_purchase' && itemId === 'tactical_command') { purchaseResult.success = purchasePassive('tactical_command'); feedback = purchaseResult.success ? `Purchased ${itemName}!` : `Cannot purchase. Not enough gold, units, or maxed.`; } else if (itemType === 'armor') { const armorId = itemElement.dataset.armorId; if (shopActionButton.dataset.action === 'equip') { const equipSuccess = equipArmor(armorId); purchaseResult.success = equipSuccess; feedback = equipSuccess ? `Equipped ${itemName}.` : `Failed to equip ${itemName}.`; if (equipSuccess) playSfx('armorEquip'); } else { purchaseResult.success = false; feedback = "Cannot perform action."; } } else { purchaseResult.success = false; feedback = "Unknown item type."; } if (purchaseResult.success) { if (itemType !== 'armor') playSfx('shopBuy'); shopFeedbackElement.textContent = feedback; shopFeedbackElement.className = 'shop-message success'; shouldShowTroopsAfterPurchase = purchaseResult.showTroopsPopup || false; updateShopDisplay(); updateChooseTroopsScreen(); if (itemType === 'armor') { selectedShopItemId = null; updateShopActionInfo(); } else { const updatedItemElement = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${itemId}"]`); if (updatedItemElement) updatedItemElement.classList.add('selected'); selectedShopItemId = itemId; updateShopActionInfo(); } } else { playSfx('error'); shopFeedbackElement.textContent = feedback || 'Action failed.'; shopFeedbackElement.className = 'shop-message error'; updateShopActionInfo(); } }

function showChooseTroopsScreen(levelToStart = 0, origin = 'unknown') { hideAllOverlays(); stopTooltipUpdater(); levelToStartAfterManage = levelToStart; troopScreenOrigin = origin; loadGameData(); if (chooseTroopsTitle) chooseTroopsTitle.textContent = "Choose Troops"; if (confirmTroopsButton) { confirmTroopsButton.textContent = "Confirm"; confirmTroopsButton.title = "Confirm"; } updateChooseTroopsScreen(); chooseTroopsScreen?.classList.remove('hidden'); chooseTroopsScreen?.classList.add('visible'); startTooltipUpdater(); } function hideChooseTroopsScreen() { chooseTroopsScreen?.classList.remove('visible'); chooseTroopsScreen?.classList.add('hidden'); stopTooltipUpdater(); } function isChooseTroopsScreenOpen() { return chooseTroopsScreen?.classList.contains('visible'); }
function updateChooseTroopsScreen() { if (!currentTroopsList || !availableTroopsList || !currentRosterCountElement || !maxRosterSizeElement || !playerOwnedUnits || !playerActiveRoster || !confirmTroopsButton) return; currentTroopsList.innerHTML = ''; availableTroopsList.innerHTML = ''; chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; const totalActive = getTotalActiveUnits(); currentRosterCountElement.textContent = totalActive; maxRosterSizeElement.textContent = maxActiveRosterSize; const allPlayerUnitTypes = Object.keys(UNIT_DATA).filter(type => UNIT_DATA[type].team === 'player'); allPlayerUnitTypes.forEach(unitType => { const owned = playerOwnedUnits[unitType] || 0; if (owned === 0) return; const active = playerActiveRoster[unitType] || 0; const available = owned - active; const unitData = UNIT_DATA[unitType]; if (!unitData) return; const styles = getSpritePositionStyles(unitType, 'idle', 'grey'); const iconStyle = `background-image: ${styles.backgroundImage}; background-position: ${styles.backgroundPosition}; background-size: ${styles.backgroundSize}; background-repeat: no-repeat; width: 60px; height: 60px; display: inline-block; vertical-align: middle;`; if (active > 0) { const card = document.createElement('div'); card.className = 'troop-card'; card.dataset.unitType = unitType; card.innerHTML = `<div style="${iconStyle}" title="${unitData.name}"></div><span class="troop-count">${active}</span>`; card.addEventListener('click', handleTroopCardClick); card.addEventListener('mouseenter', handleTroopCardMouseEnter); card.addEventListener('mouseleave', handleTroopCardMouseLeave); currentTroopsList.appendChild(card); } if (available > 0) { const card = document.createElement('div'); card.className = 'troop-card'; card.dataset.unitType = unitType; card.innerHTML = `<div style="${iconStyle}" title="${unitData.name}"></div><span class="troop-count">${available}</span>`; if (totalActive >= maxActiveRosterSize) card.classList.add('disabled'); else card.addEventListener('click', handleTroopCardClick); card.addEventListener('mouseenter', handleTroopCardMouseEnter); card.addEventListener('mouseleave', handleTroopCardMouseLeave); availableTroopsList.appendChild(card); } }); if (currentTroopsList.children.length === 0) currentTroopsList.innerHTML = `<p style="width:100%; text-align:center; color: var(--color-text-muted);">Click available troops below!</p>`; if (availableTroopsList.children.length === 0) availableTroopsList.innerHTML = `<p style="width:100%; text-align:center; color: var(--color-text-muted);">No troops in reserve.</p>`; confirmTroopsButton.disabled = (totalActive === 0); confirmTroopsButton.textContent = "Confirm"; confirmTroopsButton.title = "Confirm"; }
function handleTroopCardClick(event) { const card = event.currentTarget; if (card.classList.contains('disabled')) { playSfx('error'); chooseTroopsFeedback.textContent = `Roster full (Max ${maxActiveRosterSize})`; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { if (chooseTroopsFeedback) { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; } }, 1500); return; } const unitType = card.dataset.unitType; const parentListId = card.parentElement.id; let success = false; if (parentListId === 'current-troops-list') success = removeUnitFromActiveRoster(unitType); else if (parentListId === 'available-troops-list') success = addUnitToActiveRoster(unitType); if (success) { playSfx('select'); updateChooseTroopsScreen(); } else playSfx('error'); }
function handleConfirmTroops() { const totalActive = getTotalActiveUnits(); if (totalActive === 0) { playSfx('error'); chooseTroopsFeedback.textContent = "Roster cannot be empty."; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { if (chooseTroopsFeedback) { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; } }, 2000); return; } if (totalActive > maxActiveRosterSize) { playSfx('error'); chooseTroopsFeedback.textContent = `Roster max ${maxActiveRosterSize}.`; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { if (chooseTroopsFeedback) { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; } }, 2000); return; } hideChooseTroopsScreen(); playSfx('success'); saveGameData(); const origin = troopScreenOrigin; const levelToStart = levelToStartAfterManage; troopScreenOrigin = ''; levelToStartAfterManage = 0; if (origin === 'shop') showShop(currentShopOrigin, shopIsBetweenLevels); else showLevelSelect(); startTooltipUpdater(); }
function handleTroopsBack() { hideChooseTroopsScreen(); playSfx('menuClose'); const origin = troopScreenOrigin; troopScreenOrigin = ''; levelToStartAfterManage = 0; if (origin === 'shop') showShop(currentShopOrigin, shopIsBetweenLevels); else showLevelSelect(); startTooltipUpdater(); }

function setActiveSpell(spellName) { if (!isGameActive() || currentTurn !== 'player') { if (currentSpell) { currentSpell = null; clearSpellHighlights(); updateSpellUI(); gameBoard?.classList.remove('fireball-targeting', 'flame-wave-targeting', 'frost-nova-targeting', 'heal-targeting'); } return; } let newSpell = null; let feedbackMessage = null; if (spellName) { if (currentSpell === spellName) { newSpell = null; playSfx('error'); } else { const isPermanentlyUnlocked = spellsUnlocked[spellName]; const isSpellReady = (spellUses[spellName] === true || unlimitedSpellsCheat); if (isPermanentlyUnlocked && isSpellReady) { newSpell = spellName; playSfx('select'); if (selectedUnit) deselectUnit(false); } else { newSpell = null; playSfx('error'); if (!isPermanentlyUnlocked) feedbackMessage = `Spell locked.`; else if (!isSpellReady) feedbackMessage = "Spell already used."; else feedbackMessage = "Cannot select spell."; } } } else { if (currentSpell) playSfx('error'); newSpell = null; } if (typeof clearSpellHighlights === 'function') clearSpellHighlights(); if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); currentSpell = newSpell; if (typeof updateSpellUI === 'function') updateSpellUI(); gameBoard?.classList.remove('fireball-targeting', 'flame-wave-targeting', 'frost-nova-targeting', 'heal-targeting'); if (currentSpell) gameBoard?.classList.add(`${currentSpell}-targeting`); if (feedbackMessage && typeof showFeedback === 'function') showFeedback(feedbackMessage, "feedback-error"); }
function clearFireballHighlight() { gridContent?.querySelectorAll('.valid-fireball-target').forEach(el => el.classList.remove('valid-fireball-target')); units.forEach(u => u.element?.classList.remove('valid-fireball-target')); obstacles.forEach(o => o.element?.classList.remove('valid-fireball-target')); } function clearHealHighlight() { gridContent?.querySelectorAll('.valid-heal-target').forEach(el => el.classList.remove('valid-heal-target')); units.forEach(u => u.element?.classList.remove('valid-heal-target')); } function clearSpellHighlights() { clearFrostNovaPreview(); clearFlameWaveHighlight(); clearFireballHighlight(); clearHealHighlight(); }

function toggleMute(updateSettingFlag = true) { isMuted = !isMuted; bgMusic.muted = isMuted; victoryMusicPlayer.muted = isMuted; Object.values(sfx).forEach(sound => { if (sound) sound.muted = isMuted; }); updateMuteButtonVisual(); if (updateSettingFlag) updateSetting('mute', isMuted); if (!isMuted) { initializeAudio(); startMusicIfNotPlaying(); } else { stopMusic(); } }
function updateMuteButtonVisual() { if (muteToggleSetting) muteToggleSetting.checked = isMuted; }
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement); }
function toggleFullscreen(updateSettingFlag = true) { if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled && !document.mozFullScreenEnabled && !document.msFullscreenEnabled) { if (fullscreenToggleSetting) fullscreenToggleSetting.disabled = true; console.warn("Fullscreen not supported or enabled."); return; } const container = document.documentElement; if (!isFullscreen()) { if (container.requestFullscreen) container.requestFullscreen().catch(err => console.error(`FS Error: ${err.message}`)); else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen(); else if (container.mozRequestFullScreen) container.mozRequestFullScreen(); else if (container.msRequestFullscreen) container.msRequestFullscreen(); } else { if (document.exitFullscreen) document.exitFullscreen().catch(err => console.error(`Exit FS Error: ${err.message}`)); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); else if (document.mozCancelFullScreen) document.mozCancelFullScreen(); else if (document.msExitFullscreen) document.msExitFullscreen(); } }
function updateFullscreenButton() { const fsSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled; if (fullscreenToggleSetting) { fullscreenToggleSetting.disabled = !fsSupported; fullscreenToggleSetting.checked = isFullscreen(); } }

function proceedToNextLevelOrLocation() { startNextLevel(); }
function proceedAfterShopMaybe() { if (shouldShowTroopsAfterPurchase) { shouldShowTroopsAfterPurchase = false; const levelForTroops = shopIsBetweenLevels ? 0 : (currentShopOrigin === 'levelSelect' ? 0 : currentLevel); showChooseTroopsScreen(levelForTroops, currentShopOrigin); } else if (shopIsBetweenLevels) { shopIsBetweenLevels = false; currentShopOrigin = ''; proceedToNextLevelOrLocation(); } else { const origin = currentShopOrigin; currentShopOrigin = ''; switch (origin) { case 'levelSelect': showLevelSelect(); break; case 'menu': showMenu(); break; case 'levelComplete': showLevelSelect(); break; default: showLevelSelect(); break; } startTooltipUpdater(); } }

function getTooltipTarget(el) {
    if (!el) return { type: null, targetElement: null, targetData: null };

    const shopItemEl = el.closest('.shop-item');
    const spellIconEl = el.closest('.spell-icon');
    // console.log('getTooltipTarget', el, 'spellIconEl:', spellIconEl); // DEBUG LOG
    const goldDisplayEl = el.closest('.menu-like-gold-display, #shop-gold-display');
    const unitEl = el.closest('.unit');
    const itemEl = el.closest('.item:not(.collected)');
    const obstacleEl = el.closest('.obstacle:not(.destroyed)');
    const levelDotEl = el.closest('.level-dot');
    const troopCardEl = el.closest('.troop-card');
    const passiveItemEl = el.closest('.shop-item[data-type="passive"], .shop-item[data-type="passive_purchase"]');
    const armorItemEl = el.closest('.shop-item[data-type="armor"]');

    if (isShopOpen()) {
        if (armorItemEl) return { type: 'armor', targetElement: armorItemEl, targetData: armorItemEl };
        if (passiveItemEl) return { type: 'passive', targetElement: passiveItemEl, targetData: passiveItemEl };
        if (shopItemEl && shopItemEl.classList.contains('selectable')) return { type: 'shop', targetElement: shopItemEl, targetData: shopItemEl };
        if (spellIconEl) return { type: 'spell', targetElement: spellIconEl, targetData: spellIconEl };
        if (goldDisplayEl) return { type: 'gold', targetElement: goldDisplayEl, targetData: playerGold };
    } else if (isLevelSelectOpen()) {
        if (levelDotEl) return { type: 'levelDot', targetElement: levelDotEl, targetData: levelDotEl };
    } else if (isChooseTroopsScreenOpen()) {
        if (troopCardEl) return { type: 'troopCard', targetElement: troopCardEl, targetData: troopCardEl };
        if (goldDisplayEl) return { type: 'gold', targetElement: goldDisplayEl, targetData: playerGold };
    }

    // Check for spell icons regardless of game state (as long as no blocking overlay prevented us from getting here)
    if (spellIconEl) {
        // console.log('Found spell icon target!', spellIconEl); // DEBUG LOG
        return { type: 'spell', targetElement: spellIconEl, targetData: spellIconEl };
    }

    if (isGameActive()) {
        if (unitEl && !unitEl.classList.contains('dead') && !unitEl.classList.contains('fading-out')) {
            const unitId = unitEl.dataset.id;
            const unit = units.find(u => u.id === unitId && isUnitAliveAndValid(u));
            if (unit) return { type: 'unit', targetElement: unitEl, targetData: unit };
        } else if (itemEl) {
            const item = items.find(i => i.id === itemEl.dataset.id && !i.collected);
            if (item) return { type: 'item', targetElement: itemEl, targetData: item };
        } else if (obstacleEl) {
            const obstacle = obstacles.find(o => o.id === obstacleEl.dataset.id && isObstacleIntact(o));
            if (obstacle) return { type: 'obstacle', targetElement: obstacleEl, targetData: obstacle };
        }
    } else if (isMenuOpen() || isSettingsOpen()) {
        if (goldDisplayEl) return { type: 'gold', targetElement: goldDisplayEl, targetData: playerGold };
    }
    return { type: null, targetElement: null, targetData: null };
}

function trackMousePosition(event) {
    currentMouseX = event.clientX;
    currentMouseY = event.clientY;
}

function updateTooltip() {
    if (isMobileDevice() || !tooltipElement || isPanning || isMapPanning) {
        if (tooltipElement?.classList.contains('visible')) hideTooltip();
        lastHoveredElement = null;
        return;
    }
    const el = document.elementFromPoint(currentMouseX, currentMouseY);
    let { type, targetElement, targetData } = getTooltipTarget(el);

    // Allow tooltips on specific overlays (Shop, Level Select, Choose Troops)
    // Also allow spell tooltips even if overlays are present (e.g. in main menu or settings)
    if (isAnyOverlayVisible(true) && !isShopOpen() && !isLevelSelectOpen() && !isChooseTroopsScreenOpen()) {
        if (type !== 'spell') {
            if (tooltipElement?.classList.contains('visible')) hideTooltip();
            lastHoveredElement = null;
            return;
        }
    }

    // Fallback: If elementFromPoint missed, check if we are still over the last hovered element
    if (!targetElement && lastHoveredElement && document.body.contains(lastHoveredElement)) {
        const rect = lastHoveredElement.getBoundingClientRect();
        if (currentMouseX >= rect.left && currentMouseX <= rect.right &&
            currentMouseY >= rect.top && currentMouseY <= rect.bottom) {
            // Re-verify it's still a valid target
            const fallbackResult = getTooltipTarget(lastHoveredElement);
            if (fallbackResult.targetElement) {
                type = fallbackResult.type;
                targetElement = fallbackResult.targetElement;
                targetData = fallbackResult.targetData;
            }
        }
    }

    if (targetElement && targetData) {
        if (lastHoveredElement !== targetElement) {
            showTooltip(targetData, type);
            lastHoveredElement = targetElement;
            // Update UI panel for units AND obstacles if no unit is selected (or if we are just hovering around)
            // We want to show info for obstacles like the Snowman
            if (!selectedUnit && currentTurn === 'player' && isGameActive()) {
                if (type === 'unit' || type === 'obstacle') {
                    updateUnitInfo(targetData);
                }
            }
            // Clear info if hovering something else that isn't a unit/obstacle, or if we moved off
            else if (lastHoveredElement?.matches('.unit, .obstacle') && type !== 'unit' && type !== 'obstacle' && !selectedUnit && !el?.closest('#unit-info') && isGameActive()) {
                updateUnitInfo(null);
            }
        } else {
            positionTooltip();
        }
    } else {
        if (lastHoveredElement !== null || (tooltipElement && tooltipElement.classList.contains('visible'))) {
            hideTooltip();
            if (lastHoveredElement && lastHoveredElement.matches('.unit, .obstacle') && !selectedUnit && currentTurn === 'player' && !el?.closest('#unit-info') && isGameActive()) updateUnitInfo(null);
            lastHoveredElement = null;
        }
    }
}
function startTooltipUpdater() { if (isMobileDevice()) return; stopTooltipUpdater(); tooltipUpdateInterval = setInterval(updateTooltip, 100); }
function stopTooltipUpdater() { if (tooltipUpdateInterval) { clearInterval(tooltipUpdateInterval); tooltipUpdateInterval = null; } hideTooltip(); }
function showTooltip(data, type) {
    if (!tooltipElement || !data) { hideTooltip(); return; } let content = ''; try {
        switch (type) {
            case 'unit':
                const unit = data;
                if (!unit || !unit.name || typeof unit.hp === 'undefined') {
                    hideTooltip();
                    return;
                }
                content = `<b>${unit.name}</b>`;
                const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0;
                content += `<div class="unit-hp-bar-container tooltip-hp-bar" style="--hp-percent: ${hpPercent}%;">`;
                const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high'));
                content += `<div class="unit-hp-bar" data-hp-level="${hpLevel}"></div><span class="unit-hp-text">${unit.hp}/${unit.maxHp}</span></div>`;
                let statuses = [];
                if (unit.isStealthed) statuses.push(`<span style="color:#cccccc;">👻 Stealth</span>`);
                if (unit.isFrozen) statuses.push(`<span style="color:#aadeff;">❄️ Frozen (${unit.frozenTurnsLeft}t)</span>`);
                if (unit.isNetted) statuses.push(`<span style="color:#cccccc;">🕸️ Netted (${unit.nettedTurnsLeft}t)</span>`);
                if (unit.isSlowed) statuses.push(`<span style="color:#add8e6;">🐌 Slowed (${unit.slowedTurnsLeft}t)</span>`);
                if (unit.inTower) statuses.push(`<span style="color:#ffddaa;">🏰 In Tower</span>`);
                if (unit.quickStrikeActive) statuses.push(`<span style="color:#fff352;">⚡ Quick Strike</span>`);
                if (statuses.length > 0) content += `<br>` + statuses.join('<br>');
                break; case 'item': const item = data; const itemConfig = ITEM_DATA[item.type]; if (!itemConfig) break; if (item.type === 'gold') content = `<b>Gold Coin</b>Value: ${itemConfig.value || 1}`; else if (item.type === 'chest') { content = `<b>Chest</b>`; if (item.opened) content += `<br>Empty`; } else if (item.type === 'health_potion') content = `<b>Health Potion</b>Heals ${itemConfig.value || 1} HP`; else if (item.type === 'shiny_gem') content = `<b>Shiny Gem</b>Value: ${item.value || '?'}`; else if (item.type === 'gold_magnet') content = `<b>Gold Magnet</b><br><span style="color:#ffddaa;">Pulls nearby gold!</span>`; else if (item.type === 'spellbook') content = `<b>Spellbook</b><br><span style="color:#aadeff;">Restores 1 spell charge.</span>`; else if (item.type === 'armor') content = `<b>Armor Drop</b><br><span style="color:#ffddaa;">Boss armor piece (${item.armorId || 'Unknown'}).</span>`; break; case 'obstacle': const obstacle = data; const obsConfig = OBSTACLE_DATA[obstacle.type]; content = `<b>${obstacle.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</b>`; if (obstacle.destructible) content += `<br>HP: ${obstacle.hp}/${obstacle.maxHp}`; if (obstacle.enterable) { const occupant = obstacle.occupantUnitId ? units.find(u => u.id === obstacle.occupantUnitId && isUnitAliveAndValid(u)) : null; content += `<br>${occupant ? `Occupied by ${occupant.name}` : 'Empty'}`; if (occupant?.baseRange > 1) content += ` (+${obstacle.rangeBonus} RNG)`; if (!occupant && obstacle.hp > 0) content += `<br><span style="color:#cccccc;">(Enter/Exit from below)</span>`; } if (obsConfig.blocksLOS) content += `<br><span style="color:#ffccaa;">Blocks Line of Sight</span>`; if (obstacle.hidesUnit && !obstacle.revealed) content += `<br><span style="color:#aadeff;">Seems suspicious...</span>`; if (obstacle.canBeAttacked) content += `<br><span style="color:#ffaaaa;">Attackable</span>`; break; case 'shop': const shopItemId = data.dataset.itemId; const shopItemType = data.dataset.type; if (shopItemType === 'recruit') { const unitType = data.dataset.unitType; const unitData = UNIT_DATA[unitType]; const shopCost = getRecruitCost(unitType); const owned = playerOwnedUnits[unitType] || 0; const max = parseInt(data.dataset.max) || MAX_OWNED_PER_TYPE; content = `<b>Recruit ${unitData.name}</b> (${owned}/${max})`; content += `<br>${unitData.baseHp} HP | ${unitData.baseAtk} ATK | ${unitData.mov} MOV | ${unitData.range} RNG`; content += `<div class="tooltip-cost">Cost: <span>${shopCost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'unit_upgrade') { const cost = getUnitUpgradeCost(shopItemId); const desc = data.querySelector('h4')?.textContent || "Unit Upgrade"; content = `<b>${desc}</b><br>Permanently increases stat for all units of this type.`; content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'ability_upgrade') { const cost = ABILITY_UPGRADE_COSTS[shopItemId] || 99999; const abilityName = data.querySelector('h4')?.textContent || "Ability Upgrade"; content = `<b>${abilityName}</b>`; if (shopItemId === 'upgrade_rogue_quickstrike') content += `<br>Rogue Ability: Allows an extra attack per turn at the cost of ${ROGUE_QUICK_STRIKE_MOVE_PENALTY} movement.`; content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'spell_upgrade') { const spellName = data.dataset.spellName; const cost = calculateSpellCost(spellName); const currentLevel = playerSpellUpgrades[spellName] || 0; const config = SPELL_UPGRADE_CONFIG[spellName]; content = `<b>Upgrade ${config.name} (Lvl ${currentLevel + 2})</b>`; content += `<br>Next: ${getSpellEffectDescription(spellName, true)}`; if (cost !== Infinity) content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; else content += `<br>Max Level Reached.`; const reqLvl = parseInt(data.dataset.requiredLevel) || 0; if (highestLevelReached <= reqLvl && currentLevel === 0) content += `<br><span style="color:#ffaaaa;">Requires completing Level ${reqLvl}.</span>`; } break; case 'passive': const passiveId = data.dataset.itemId?.startsWith('passive_') ? data.dataset.itemId.substring(8) : (data.dataset.itemId === 'tactical_command' ? 'tactical_command' : null); if (passiveId && PASSIVE_DATA[passiveId]) { const passiveConfig = PASSIVE_DATA[passiveId]; const passiveLevel = playerPassiveUpgrades[passiveId] || 0; content = `<b>${passiveConfig.name}${passiveId === 'gold_magnet' ? ` (Lvl ${passiveLevel})` : ''}</b>`; content += `<br>${passiveConfig.description}`; if (passiveId === 'tactical_command') { const tcCost = PASSIVE_UPGRADE_COSTS.tactical_command; const currentSlots = MAX_ACTIVE_ROSTER_SIZE_BASE + (playerPassiveUpgrades.tactical_command || 0); const canBuyMore = currentSlots < MAX_ACTIVE_ROSTER_SIZE_MAX; if (canBuyMore) { content += `<br>(Currently: ${currentSlots}/${MAX_ACTIVE_ROSTER_SIZE_MAX} slots)`; content += `<div class="tooltip-cost">Cost: <span>${tcCost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; const reqUnits = parseInt(data.dataset.requiredUnits); const ownedUnits = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0); if (ownedUnits < reqUnits) content += `<br><span style="color:#ffaaaa;">Requires owning ${reqUnits}+ total units.</span>`; } else content += `<br>(Max Slots Reached)`; } else if (passiveId === 'gold_magnet') { content += `<br><span style="color:#ffddaa;">(Found as drop only)</span>`; } } break; case 'armor': const armorId = data.dataset.armorId; const armorData = ARMOR_DATA[armorId]; const armorLevel = playerOwnedArmor[armorId] || 0; if (armorData) { content = `<b>${armorData.name}${armorLevel > 1 ? ` (Lvl ${armorLevel})` : ''}</b>`; content += `<br>${armorData.description}`; if (armorId !== 'none' && armorId !== 'grey') { if (armorLevel === 0) content += `<br><span style="color:#ffaaaa;">(Dropped by World Boss)</span>`; else if (equippedArmorId === armorId) content += `<br><span style="color:#aaffaa;">Equipped</span>`; else content += `<br><span style="color:#ffddaa;"></span>`; } if (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL) { if (armorData.resistances?.fire >= ARMOR_RESISTANCE_VALUE) content += `<br><span style="color:#ff8c69;">+${ARMOR_RESISTANCE_VALUE} Fire Resist</span>`; if (armorData.resistances?.frost >= ARMOR_RESISTANCE_VALUE) content += `<br><span style="color:#add8e6;">+${ARMOR_RESISTANCE_VALUE} Frost Resist</span>`; } } break; case 'gold': content = `Current Gold: ${data}`; break; case 'spell': content = data.title || "Spell"; break; case 'levelDot': const levelDot = data; const levelNum = levelDot.dataset.level; content = `<b>Level ${levelNum}</b>`; if (levelDot.classList.contains('locked')) content += `<br><span style="color:#aaaaaa;">Locked</span>`; else if (levelDot.classList.contains('beaten')) content += `<br><span style="color:#aaffaa;">Completed</span>`; else content += `<br><span style="color:#ffaaaa;">Click to Play</span>`; break; case 'troopCard': const card = data; const unitType = card.dataset.unitType; const unitData = UNIT_DATA[unitType]; const countSpan = card.querySelector('.troop-count'); const count = countSpan ? countSpan.textContent : '?'; content = `<b>${unitData?.name || 'Unknown Troop'}</b>`; const parentListId = card.parentElement?.id; if (parentListId === 'current-troops-list') content += `<br>Count: ${count} (In Roster)<br><span style="color:#ffccaa;">Click to move to Available</span>`; else if (parentListId === 'available-troops-list') { content += `<br>Count: ${count} (Available)`; const totalActive = getTotalActiveUnits(); if (totalActive < maxActiveRosterSize) content += `<br><span style="color:#aaffaa;">Click to move to Roster</span>`; else content += `<br><span style="color:#ff8888;">Roster Full!</span>`; } break; default: hideTooltip(); return;
        }
    } catch (e) { console.error(`Tooltip error for type ${type}:`, e); content = "Error"; } if (content) { tooltipElement.innerHTML = content; tooltipElement.classList.add('visible'); positionTooltip(); } else hideTooltip();
}
function hideTooltip() { if (tooltipElement) tooltipElement.classList.remove('visible'); if (tooltipTimeout) clearTimeout(tooltipTimeout); }
function positionTooltip() { if (!tooltipElement || !tooltipElement.classList.contains('visible')) return; const rect = tooltipElement.getBoundingClientRect(); const contRect = document.body.getBoundingClientRect(); const offsetX = 15; const offsetY = 20; let top = currentMouseY + offsetY; let left = currentMouseX + offsetX; if (top + rect.height > contRect.height - 10) top = currentMouseY - rect.height - 15; if (left + rect.width > contRect.width - 10) left = currentMouseX - rect.width - 15; left = Math.max(5, left); top = Math.max(5, top); tooltipElement.style.left = `${left}px`; tooltipElement.style.top = `${top}px`; }

function createWorldHpBar(unit) { if (!unitHpBarsOverlay || !unit || !unit.element || worldHpBars.has(unit.id)) return; const barContainer = document.createElement('div'); barContainer.className = 'unit-hp-bar-world'; barContainer.dataset.unitId = unit.id; const barFill = document.createElement('div'); barFill.className = 'unit-hp-bar-world-fill'; barContainer.appendChild(barFill); unitHpBarsOverlay.appendChild(barContainer); worldHpBars.set(unit.id, barContainer); updateWorldHpBar(unit); updateWorldHpBarPosition(unit); }
function updateWorldHpBar(unit) { if (!unit || !worldHpBars.has(unit.id)) return; const barContainer = worldHpBars.get(unit.id); const barFill = barContainer.querySelector('.unit-hp-bar-world-fill'); if (!barFill) return; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100)) : 0; barFill.style.width = `${hpPercent}%`; const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); barFill.className = `unit-hp-bar-world-fill hp-${hpLevel}`; }
function removeWorldHpBar(unitId) { if (worldHpBars.has(unitId)) { worldHpBars.get(unitId).remove(); worldHpBars.delete(unitId); } }
function updateWorldHpBarPosition(unit) { if (!unit || !worldHpBars.has(unit.id) || !unit.element) return; const barContainer = worldHpBars.get(unit.id); barContainer.style.setProperty('--unit-grid-x', unit.x); barContainer.style.setProperty('--unit-grid-y', unit.y); }
function updateWorldHpBarsVisibility() { if (!unitHpBarsOverlay) return; unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars); if (gameSettings.showHpBars) { createAllWorldHpBars(); updateWorldHpBars(); } else clearAllWorldHpBars(); }
function createAllWorldHpBars() { units.forEach(unit => { if (isUnitAliveAndValid(unit)) createWorldHpBar(unit); }); }
function clearAllWorldHpBars() { worldHpBars.forEach(bar => bar.remove()); worldHpBars.clear(); }
function updateWorldHpBars() {
    if (!gameSettings.showHpBars) return; // Added this check back
    units.forEach(unit => {
        if (isUnitAliveAndValid(unit)) {
            if (!worldHpBars.has(unit.id)) createWorldHpBar(unit);
            updateWorldHpBar(unit);
            updateWorldHpBarPosition(unit); // Added this back
        } else {
            // Only remove if the unit element is also gone (animation finished)
            if (!unit.element || !document.body.contains(unit.element)) {
                removeWorldHpBar(unit.id);
            } else {
                // Keep updating position/value while dying if needed, or just leave it
                updateWorldHpBar(unit);
                updateWorldHpBarPosition(unit); // Added this back
            }
        }
    });
    worldHpBars.forEach((bar, unitId) => { if (!units.find(u => u.id === unitId)) removeWorldHpBar(unitId); });
}
function updateHpBarSettingUI(isChecked) { if (toggleHpBarsSetting) toggleHpBarsSetting.checked = isChecked; }

function updateAudioVolumeDisplays() { if (musicVolumeSlider) musicVolumeSlider.value = musicVolume; if (musicVolumeValueSpan) musicVolumeValueSpan.textContent = `${Math.round(musicVolume * 100)}%`; if (sfxVolumeSlider) sfxVolumeSlider.value = sfxVolume; if (sfxVolumeValueSpan) sfxVolumeValueSpan.textContent = `${Math.round(sfxVolume * 100)}%`; }
function updatePlayerNameInput() { if (playerNameSettingInput) playerNameSettingInput.value = gameSettings.playerName; }

function updateAchievementsScreen() { if (!achievementsListElement || !achievementCompletionStatusElement) return; achievementsListElement.innerHTML = ''; let unlockedCount = 0; const totalAchievements = Object.keys(ACHIEVEMENT_DATA).length; const sortedIds = Object.keys(ACHIEVEMENT_DATA).sort((a, b) => { const aUnlocked = achievementProgress[a]?.unlocked; const bUnlocked = achievementProgress[b]?.unlocked; if (aUnlocked && !bUnlocked) return -1; if (!aUnlocked && bUnlocked) return 1; return ACHIEVEMENT_DATA[a].title.localeCompare(ACHIEVEMENT_DATA[b].title); }); sortedIds.forEach(id => { const data = ACHIEVEMENT_DATA[id]; const progress = achievementProgress[id] || { current: 0, unlocked: false }; const isUnlocked = progress.unlocked; if (isUnlocked) unlockedCount++; const item = document.createElement('div'); item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`; item.dataset.id = id; const iconBase = data.icon || 'default'; const iconSrc = isUnlocked ? `./sprites/achievement_${iconBase}_unlocked.png` : `./sprites/achievement_locked.png`; const iconAlt = isUnlocked ? `${data.title} Unlocked` : `Locked Achievement`; let progressText = ''; if (data.condition.count && !isUnlocked) { progressText = `<p class="achievement-progress">Progress: ${progress.current || 0} / ${data.condition.count}</p>`; } else if (isUnlocked) { progressText = `<p class="achievement-progress">Completed!</p>`; } let rewardText = ''; if (data.reward?.gold > 0) { rewardText = `<div class="achievement-reward ${isUnlocked ? '' : 'pending'}">Reward: ${data.reward.gold} <img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } item.innerHTML = ` <img src="${iconSrc}" class="achievement-icon" alt="${iconAlt}" onerror="this.src='./sprites/achievement_locked.png'"> <div class="achievement-details"> <h4 class="achievement-title">${data.title}</h4> <p class="achievement-description">${data.description}</p> ${progressText} </div> ${rewardText} `; achievementsListElement.appendChild(item); }); achievementCompletionStatusElement.textContent = `Completion: ${unlockedCount} / ${totalAchievements}`; }

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

function handleSpellIconMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; }
function handleSpellIconMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleGoldDisplayMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; }
function handleGoldDisplayMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleShopItemMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; }
function handleShopItemMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleLevelDotMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; positionLevelDots(); }
function handleLevelDotMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; positionLevelDots(); }
function handleTroopCardMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; }
function handleTroopCardMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleObstacleMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
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

async function animateAttack(attacker, target, isRanged, projectileType) {
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
            projectile.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

            document.body.appendChild(projectile);

            // Force reflow
            projectile.getBoundingClientRect();

            // Animate
            const duration = 300; // ms
            projectile.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
            projectile.style.left = `${targetRect.left + targetRect.width / 2}px`;
            projectile.style.top = `${targetRect.top + targetRect.height / 2}px`;

            if (projectileType === 'arrow') playSfx('shoot');
            else if (projectileType === 'fireball') playSfx('fireballCast');
            else if (projectileType === 'net') playSfx('net_throw');

            setTimeout(() => {
                projectile.remove();
                resolve(0); // Damage happens on impact
            }, duration);
        });
    }
}

function animateFireball(originElement, targetX, targetY) {
    if (!originElement || !gameBoard) return;
    const originRect = originElement.getBoundingClientRect();
    const targetCell = getCellElement(targetX, targetY);
    if (!targetCell) return;
    const targetRect = targetCell.getBoundingClientRect();

    const fireball = document.createElement('div');
    fireball.className = 'projectile fireball';
    fireball.style.backgroundImage = "url('./sprites/fireball.png')";
    fireball.style.width = 'var(--cell-size)';
    fireball.style.height = 'var(--cell-size)';
    fireball.style.backgroundSize = 'contain';
    fireball.style.backgroundRepeat = 'no-repeat';
    fireball.style.position = 'fixed'; // Use fixed to be independent of grid scroll for start
    fireball.style.zIndex = '1000';
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
        createExplosionEffect(targetX, targetY, 'fireball');
    }, 400);
}

function createExplosionEffect(x, y, type) {
    const cell = getCellElement(x, y);
    if (!cell) return;

    const explosion = document.createElement('div');
    explosion.className = 'effect explosion';
    explosion.style.width = 'var(--cell-size)';
    explosion.style.height = 'var(--cell-size)';
    explosion.style.position = 'absolute';
    explosion.style.left = '0';
    explosion.style.top = '0';
    explosion.style.zIndex = '20';
    explosion.style.pointerEvents = 'none';

    if (type === 'fireball') {
        explosion.style.backgroundImage = "url('./sprites/fireball_explode.png')";
        explosion.style.backgroundSize = '800% 100%'; // 8 frames
        explosion.style.backgroundPosition = '0% 0%';
        explosion.style.backgroundRepeat = 'no-repeat';

        // Sprite sheet animation
        explosion.animate([
            { backgroundPosition: '0% 0%' },
            { backgroundPosition: '100% 0%' }
        ], {
            duration: 800,
            easing: 'steps(8)',
            fill: 'forwards'
        });
    }

    cell.appendChild(explosion);
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

function animateFrostNova(centerX, centerY, radiusLevel) {
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
    nova.style.backgroundImage = "url('./sprites/frostbolt.png')"; // Use frostbolt as particle or texture
    nova.style.backgroundSize = 'cover';
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

document.addEventListener('DOMContentLoaded', () => {
    gameContainer = document.getElementById('game-container'); gameBoardWrapper = document.getElementById('game-board-wrapper'); gameBoard = document.getElementById('game-board'); defaultViewButton = document.getElementById('default-view-button'); gridContent = document.getElementById('grid-content'); uiPanel = document.getElementById('ui-panel'); levelDisplayElement = document.getElementById('level-display'); spellAreaElement = document.getElementById('spell-area'); fireballElement = document.getElementById('fireball-spell'); flameWaveElement = document.getElementById('flame-wave-spell'); frostNovaElement = document.getElementById('frost-nova-spell'); healElement = document.getElementById('heal-spell'); unitInfo = document.getElementById('unit-info'); unitPortraitElement = document.getElementById('unit-portrait'); actionsLeftDisplayElement = document.getElementById('actions-left-display'); unitNameDisplay = document.getElementById('unit-name'); unitAtkDisplay = document.getElementById('unit-atk'); unitMovDisplay = document.getElementById('unit-mov'); unitRngDisplay = document.getElementById('unit-rng'); unitStatusDisplay = document.getElementById('unit-status'); unitHpBarContainer = unitInfo?.querySelector('.unit-hp-bar-container'); unitHpBarElement = unitHpBarContainer?.querySelector('.unit-hp-bar'); boardFeedbackArea = document.getElementById('board-feedback-area'); endTurnButton = document.getElementById('end-turn-button'); mainMenu = document.getElementById('main-menu'); startGameButton = document.getElementById('start-game-button'); leaderboardMenuButton = document.getElementById('leaderboard-menu-button'); achievementsMenuButton = document.getElementById('achievements-menu-button'); settingsMenuButton = document.getElementById('settings-menu-button'); gameOverScreen = document.getElementById('game-over-screen'); restartButton = document.getElementById('restart-button'); gameOverTitle = document.getElementById('game-over-title'); gameOverMessage = document.getElementById('game-over-message'); gameOverToTitleButton = document.getElementById('game-over-to-title-button'); tooltipElement = document.getElementById('tooltip'); menuButton = document.getElementById('menu-button'); menuOverlay = document.getElementById('menu-overlay'); closeMenuButton = document.getElementById('close-menu-button'); quitButton = document.getElementById('quit-button'); menuOptionsButton = document.getElementById('menu-options-button'); quitToMainMenuButton = document.getElementById('quit-to-main-menu-button'); leaderboardOverlay = document.getElementById('leaderboard-overlay'); leaderboardList = document.getElementById('leaderboard-list'); closeLeaderboardButton = document.getElementById('close-leaderboard-button'); leaderboardEntry = document.getElementById('leaderboard-entry'); playerNameInput = document.getElementById('player-name-input'); submitScoreButton = document.getElementById('submit-score-button'); levelSelectScreen = document.getElementById('level-select-screen'); levelSelectMapContainer = document.getElementById('level-select-map-container'); levelSelectMap = document.getElementById('level-select-map'); levelSelectDotsLayer = document.getElementById('level-select-dots-layer'); backToMainMenuButton = document.getElementById('back-to-main-menu-button'); levelSelectTroopsButton = document.getElementById('level-select-troops-button'); levelSelectShopButton = document.getElementById('level-select-shop-button'); menuGoldAmountElement = document.getElementById('menu-gold-amount'); menuGoldDisplay = document.getElementById('menu-gold-display'); shopScreen = document.getElementById('shop-screen'); shopItemsContainer = document.getElementById('shop-items-container'); shopGoldAmountElement = document.getElementById('shop-gold-amount'); shopGoldDisplay = document.getElementById('shop-gold-display'); shopActionButton = document.getElementById('shop-action-button'); shopExitButton = document.getElementById('shop-exit-button'); shopFeedbackElement = document.getElementById('shop-feedback'); shopSelectedItemInfoElement = document.getElementById('shop-selected-item-info'); shopTroopsButton = document.getElementById('shop-troops-button'); levelCompleteScreen = document.getElementById('level-complete-screen'); levelCompleteTitle = document.getElementById('level-complete-title'); levelCompleteStats = document.getElementById('level-complete-stats'); statsEnemiesKilled = document.getElementById('stats-enemies-killed'); statsUnitsLost = document.getElementById('stats-units-lost'); statsGoldGained = document.getElementById('stats-gold-gained'); levelCompleteBonuses = document.getElementById('level-complete-bonuses'); statsBonusList = document.getElementById('stats-bonus-list'); statsTotalGold = document.getElementById('stats-total-gold'); nextLevelButton = document.getElementById('next-level-button'); levelCompleteShopButton = document.getElementById('level-complete-shop-button'); levelCompleteTotalGoldElement = document.getElementById('level-complete-total-gold'); chooseTroopsScreen = document.getElementById('choose-troops-screen'); chooseTroopsTitle = document.getElementById('choose-troops-title'); currentTroopsList = document.getElementById('current-troops-list'); availableTroopsList = document.getElementById('available-troops-list'); currentRosterCountElement = document.getElementById('current-roster-count'); maxRosterSizeElement = document.getElementById('max-roster-size'); chooseTroopsFeedback = document.getElementById('choose-troops-feedback'); confirmTroopsButton = document.getElementById('confirm-troops-button'); troopsBackButton = document.getElementById('troops-back-button'); unitHpBarsOverlay = document.getElementById('unit-hp-bars-overlay'); settingsOverlay = document.getElementById('settings-overlay'); closeSettingsButton = document.getElementById('close-settings-button'); achievementsOverlay = document.getElementById('achievements-overlay'); closeAchievementsButton = document.getElementById('close-achievements-button'); achievementsListElement = document.getElementById('achievements-list'); achievementCompletionStatusElement = document.getElementById('achievement-completion-status'); levelSelectPagination = document.getElementById('level-select-pagination'); levelSelectPrevPage = document.getElementById('level-select-prev-page'); levelSelectNextPage = document.getElementById('level-select-next-page'); levelSelectPageInfo = document.getElementById('level-select-page-info'); musicVolumeSlider = document.getElementById('music-volume'); musicVolumeValueSpan = document.querySelector('#music-volume + .volume-value'); sfxVolumeSlider = document.getElementById('sfx-volume'); sfxVolumeValueSpan = document.querySelector('#sfx-volume + .volume-value'); muteToggleSetting = document.getElementById('toggle-mute-setting'); fullscreenToggleSetting = document.getElementById('toggle-fullscreen-setting'); toggleHpBarsSetting = document.getElementById('toggle-hp-bars-setting'); playerNameSettingInput = document.getElementById('player-name-setting'); abilityStealthButton = document.getElementById('ability-stealth'); abilityQuickStrikeButton = document.getElementById('ability-quick-strike');

    window.addEventListener('resize', handleResize, { passive: true }); window.addEventListener('keydown', handleKeyDown); document.addEventListener('mousemove', trackMousePosition); document.addEventListener('fullscreenchange', updateFullscreenButton); document.addEventListener('webkitfullscreenchange', updateFullscreenButton); document.addEventListener('mozfullscreenchange', updateFullscreenButton); document.addEventListener('MSFullscreenChange', updateFullscreenButton);
    gameBoard?.addEventListener('mousedown', handlePanStart); gameBoard?.addEventListener('wheel', handleZoom, { passive: false }); gameBoard?.addEventListener('touchstart', handlePanStartTouch, { passive: true }); gameBoard?.addEventListener('touchstart', handlePinchStart, { passive: false }); gameBoard?.addEventListener('touchmove', handlePinchMove, { passive: false }); gameBoard?.addEventListener('touchend', handlePinchEnd, { passive: false });
    [fireballElement, flameWaveElement, frostNovaElement, healElement].forEach(el => { if (el) { el.addEventListener('mouseenter', handleSpellIconMouseEnter); el.addEventListener('mouseleave', handleSpellIconMouseLeave); } });
    menuGoldDisplay?.addEventListener('mouseenter', handleGoldDisplayMouseEnter); menuGoldDisplay?.addEventListener('mouseleave', handleGoldDisplayMouseLeave); shopGoldDisplay?.addEventListener('mouseenter', handleGoldDisplayMouseEnter); shopGoldDisplay?.addEventListener('mouseleave', handleGoldDisplayMouseLeave);
    gridContent?.addEventListener('mouseleave', handleGridMouseLeave); defaultViewButton?.addEventListener('click', () => centerView(false));
    startGameButton?.addEventListener('click', () => { hideMainMenu(); showLevelSelect(); });
    leaderboardMenuButton?.addEventListener('click', () => showLeaderboard(false)); settingsMenuButton?.addEventListener('click', () => showSettings(false));
    achievementsMenuButton?.addEventListener('click', showAchievements);
    gameOverToTitleButton?.addEventListener('click', showMainMenu); restartButton?.addEventListener('click', () => { if (!isGameOverScreenVisible()) return; const titleText = gameOverTitle?.textContent.toLowerCase() || ""; if (titleText.includes("victory") || titleText.includes("forfeited")) showMainMenu(); else { hideGameOverScreen(); showChooseTroopsScreen(levelToRestartOnLoss); } });
    endTurnButton?.addEventListener('click', () => { if (levelClearedAwaitingInput) { if (typeof completeLevelAndShowSummary === 'function') completeLevelAndShowSummary(); else { hideLevelComplete(); proceedToNextLevelOrLocation(); } } else if (isGameActive() && currentTurn === 'player' && !isProcessing) { deselectUnit(false); endTurn(); } });
    menuButton?.addEventListener('click', showMenu);
    menuOptionsButton?.addEventListener('click', () => { hideMenu(); showSettings(true); });
    quitButton?.addEventListener('click', () => { const action = quitButton.dataset.action; hideMenu(); if (action === "forfeit") forfeitLevel(); else showLevelSelect(); playSfx('menuClose'); }); quitToMainMenuButton?.addEventListener('click', () => { playSfx('menuClose'); hideMenu(); showMainMenu(); }); closeMenuButton?.addEventListener('click', hideMenu);
    closeLeaderboardButton?.addEventListener('click', () => { hideLeaderboard(); showMainMenu(); }); backToMainMenuButton?.addEventListener('click', showMainMenu); levelSelectTroopsButton?.addEventListener('click', () => { if (!isLevelSelectOpen()) return; hideLevelSelect(); showChooseTroopsScreen(0, 'levelSelect'); }); levelSelectShopButton?.addEventListener('click', () => { if (!isLevelSelectOpen()) return; hideLevelSelect(); showShop('levelSelect', false); }); levelSelectPrevPage?.addEventListener('click', () => handleLevelSelectPageChange(-1)); levelSelectNextPage?.addEventListener('click', () => handleLevelSelectPageChange(1));
    levelSelectMapContainer?.addEventListener('mousedown', handleMapPanStart); levelSelectMapContainer?.addEventListener('touchstart', handleMapPanStartTouch, { passive: true });
    levelCompleteShopButton?.addEventListener('click', () => { hideLevelComplete(); showShop('levelComplete', true); }); nextLevelButton?.addEventListener('click', () => { hideLevelComplete(); proceedToNextLevelOrLocation(); });
    shopExitButton?.addEventListener('click', () => { hideShop(); proceedAfterShopMaybe(); }); shopTroopsButton?.addEventListener('click', () => { if (!isShopOpen()) return; hideShop(); showChooseTroopsScreen(shopIsBetweenLevels ? 0 : currentLevel, 'shop'); });
    shopActionButton?.addEventListener('click', handleShopActionClick);
    closeSettingsButton?.addEventListener('click', hideSettings); closeAchievementsButton?.addEventListener('click', hideAchievements);
    confirmTroopsButton?.addEventListener('click', handleConfirmTroops); troopsBackButton?.addEventListener('click', handleTroopsBack);
    fireballElement?.addEventListener('click', () => setActiveSpell('fireball')); flameWaveElement?.addEventListener('click', () => setActiveSpell('flameWave')); frostNovaElement?.addEventListener('click', () => setActiveSpell('frostNova')); healElement?.addEventListener('click', () => setActiveSpell('heal'));
    abilityStealthButton?.addEventListener('click', () => { if (selectedUnit && !abilityStealthButton.disabled) activateRogueStealth(selectedUnit); });
    abilityQuickStrikeButton?.addEventListener('click', () => { if (selectedUnit && !abilityQuickStrikeButton.disabled) activateRogueQuickStrike(selectedUnit); });
    bgMusic.addEventListener('ended', selectAndLoadMusic);

    musicVolumeSlider?.addEventListener('input', (e) => { const volume = parseFloat(e.target.value); setVolume('music', volume); if (musicVolumeValueSpan) musicVolumeValueSpan.textContent = `${Math.round(volume * 100)}%`; });
    musicVolumeSlider?.addEventListener('change', () => updateSetting('musicVolume', musicVolume));
    sfxVolumeSlider?.addEventListener('input', (e) => { const volume = parseFloat(e.target.value); setVolume('sfx', volume); if (sfxVolumeValueSpan) sfxVolumeValueSpan.textContent = `${Math.round(volume * 100)}%`; });
    sfxVolumeSlider?.addEventListener('change', () => { playSfx('select'); updateSetting('sfxVolume', sfxVolume); });
    muteToggleSetting?.addEventListener('change', (e) => toggleMute(true));
    fullscreenToggleSetting?.addEventListener('change', (e) => toggleFullscreen(false));
    toggleHpBarsSetting?.addEventListener('change', (e) => updateSetting('showHpBars', e.target.checked));
    playerNameSettingInput?.addEventListener('change', (e) => updateSetting('playerName', e.target.value));
    document.getElementById('restart-level-setting-button')?.addEventListener('click', () => { if (isGameActive()) { hideSettings(); initGame(currentLevel); playSfx('select'); } else playSfx('error'); });

    let firstEverTouch = true;
    document.body.addEventListener('touchstart', async (e) => {
        if (!audioInitialized) initializeAudio();
        if (isMobileDevice() && !isFullscreen()) {
            const fsElement = document.documentElement;
            await attemptEnterFullscreen(fsElement);
        }
    }, { capture: true, once: false });

    preloadAssetsAndStart();
    updateMuteButtonVisual();
    updateFullscreenButton();
    requestAnimationFrame(() => { try { calculateCellSize(); } catch (e) { console.error("Initial RAF Error:", e); } });
    const mapPreload = new Image(); mapPreload.onload = () => { mapIntrinsicWidth = mapPreload.naturalWidth || 1024; mapIntrinsicHeight = mapPreload.naturalHeight || 1024; }; mapPreload.onerror = () => { mapIntrinsicWidth = 1024; mapIntrinsicHeight = 1024; }; mapPreload.src = WORLD_MAP_IMAGE_URL;
});

function formatDescription(text) {
    if (!text) return '';
    // Colorize positive stats (e.g. +1 MOV, +1 ATK)
    let formatted = text.replace(/(\+\d+\s+[A-Za-z]+)/g, '<span class="text-green">$1</span>');
    // Colorize negative/bad stats (e.g. 1 HP Max, -1 ATK)
    formatted = formatted.replace(/(\b1 HP Max\b)/g, '<span class="text-red">$1</span>');
    formatted = formatted.replace(/(-\d+\s+[A-Za-z]+)/g, '<span class="text-red">$1</span>');
    return formatted;
}