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
    fullscreenToggleSetting, playerNameSettingInput;

// UI State Variables
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
let tooltipTimeout = null; // For mobile temporary tooltips
let shopIsBetweenLevels = false;
let lastHoveredElement = null;
let selectedShopItemId = null; // Track the selected shop item ID

let mapZoom = 1; let mapOffsetX = 0; let mapOffsetY = 0;
const MIN_MAP_ZOOM = 1; const MAX_MAP_ZOOM = 5;
let isMapPanning = false; let mapPanStartX = 0; let mapPanStartY = 0;
let mapStartPanX = 0; let mapStartPanY = 0;
let mapIntrinsicWidth = 1024; let mapIntrinsicHeight = 1024;
let currentLevelSelectPage = 1;
const TOTAL_LEVELS_TO_SHOW = 1000; // Maximum level number to generate dots for

let currentShopOrigin = '';
let troopScreenOrigin = '';
let levelToStartAfterManage = 0;
let worldHpBars = new Map();
let shouldShowTroopsAfterPurchase = false;

// --- Initialization & Setup ---

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
    const overlayExists = !!document.getElementById('unit-hp-bars-overlay'); let childrenToRemove = [];
    for (let i = 0; i < gridContent.children.length; i++) { if (gridContent.children[i].id !== 'unit-hp-bars-overlay') childrenToRemove.push(gridContent.children[i]); } childrenToRemove.forEach(child => gridContent.removeChild(child)); cellElementsMap.clear(); worldHpBars.clear();
    calculateCellSize();
    gridContent.style.width = `${currentGridCols * currentCellSize}px`; gridContent.style.height = `${currentGridRows * currentCellSize}px`; gridContent.style.gridTemplateColumns = `repeat(${currentGridCols}, 1fr)`; gridContent.style.gridTemplateRows = `repeat(${currentGridRows}, 1fr)`; gridContent.style.setProperty('--grid-cols', currentGridCols); gridContent.style.setProperty('--grid-rows', currentGridRows); gridContentOffsetX = 0; gridContentOffsetY = 0; currentZoom = 1; applyZoomAndPan();
    const cellFragment = document.createDocumentFragment(); const cssUrl = tilesetUrl ? `url('${tilesetUrl}')` : 'none'; const fallbackColor = 'rgba(50, 50, 50, 0.7)';
    for (let r = 0; r < currentGridRows; r++) { for (let c = 0; c < currentGridCols; c++) { const cell = document.createElement('div'); cell.className = 'grid-cell'; cell.dataset.x = c; cell.dataset.y = r; cell.addEventListener('click', handleCellClick); cell.addEventListener('mouseenter', handleCellMouseEnter); cell.addEventListener('mouseleave', handleCellMouseLeave); cell.style.width = `var(--cell-size)`; cell.style.height = `var(--cell-size)`; cell.style.backgroundImage = cssUrl; cell.style.backgroundColor = fallbackColor; cell.style.backgroundSize = 'cover'; cell.style.backgroundPosition = 'center'; cellFragment.appendChild(cell); cellElementsMap.set(`${c},${r}`, cell); } } gridContent.appendChild(cellFragment);
    unitHpBarsOverlay = document.getElementById('unit-hp-bars-overlay'); if (!unitHpBarsOverlay) { unitHpBarsOverlay = document.createElement('div'); unitHpBarsOverlay.id = 'unit-hp-bars-overlay'; gridContent.appendChild(unitHpBarsOverlay); } else if (gridContent.lastChild !== unitHpBarsOverlay) { gridContent.appendChild(unitHpBarsOverlay); } unitHpBarsOverlay.innerHTML = ''; unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars); document.documentElement.style.setProperty('--current-tileset-url', cssUrl);
}

// --- Rendering ---

function renderAll() {
    if (!gridContent) return; gridContent.querySelectorAll(':scope > *:not(.grid-cell):not(#unit-hp-bars-overlay)').forEach(el => el.remove()); worldHpBars.clear(); if (unitHpBarsOverlay) unitHpBarsOverlay.innerHTML = '';
    const fragment = document.createDocumentFragment();
    obstacles.forEach(obs => { if (isObstacleIntact(obs)) renderObstacle(obs, fragment); }); items.forEach(item => { if (!item.collected) renderItem(item, fragment); updateCellItemStatus(item.x, item.y); }); units.forEach(unit => { if (isUnitAliveAndValid(unit)) renderUnit(unit, fragment); }); gridContent.appendChild(fragment);
    if (unitHpBarsOverlay && gridContent.lastChild !== unitHpBarsOverlay) gridContent.appendChild(unitHpBarsOverlay); if (unitHpBarsOverlay) unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars);
}

function renderUnit(unit, parentElement = gridContent) {
    if (!parentElement || !unit) return null; unit.element?.remove(); const el = document.createElement('div'); el.className = `unit ${unit.team}`; if (unit.isElite) el.classList.add('elite'); el.dataset.id = unit.id;
    el.style.backgroundImage = `url('${unit.spriteUrl}')`; el.alt = unit.name; el.addEventListener('click', (ev) => handleUnitClick(ev, unit)); el.addEventListener('mouseenter', handleUnitMouseEnter); el.addEventListener('mouseleave', handleUnitMouseLeave); unit.element = el; parentElement.appendChild(el);
    setUnitVariantClass(unit); updateUnitPosition(unit, true); updateUnitVisualState(unit); return el;
}

function renderObstacle(obstacle, parentElement = gridContent) {
    if (!parentElement || !obstacle) return null; obstacle.element?.remove(); const data = OBSTACLE_DATA[obstacle.type]; if (!data) return null; const el = document.createElement('div'); el.className = `obstacle ${data.spriteClass}`; el.dataset.id = obstacle.id; el.alt = obstacle.type; if (obstacle.type === 'door' && obstacle.isVertical) el.classList.add('vertical');
    // Add click listener only if clickable or attackable
    if (obstacle.clickable || obstacle.canBeAttacked) {
        el.addEventListener('click', (ev) => handleObstacleClick(ev, obstacle));
    }
    el.addEventListener('mouseenter', handleObstacleMouseEnter); el.addEventListener('mouseleave', handleObstacleMouseLeave); obstacle.element = el; parentElement.appendChild(el); updateObstaclePosition(obstacle); updateCellObstacleStatus(obstacle.x, obstacle.y); return el;
}

function renderItem(item, parentElement = gridContent) {
    if (!parentElement || !item) return null; item.element?.remove(); const data = ITEM_DATA[item.type]; if (!data) return null; const el = document.createElement('div'); el.className = `item ${data.spriteClass}`; el.dataset.id = item.id; el.dataset.x = item.x; el.dataset.y = item.y; el.style.zIndex = data.zIndex || 7; el.alt = item.type;
    // Handle armor item visual separately if needed, though unlikely as it's granted directly
    if (item.type === 'chest' && item.opened) el.classList.add('opened');
    el.addEventListener('click', (ev) => handleItemClick(ev, item)); el.addEventListener('mouseenter', handleItemMouseEnter); el.addEventListener('mouseleave', handleItemMouseLeave); item.element = el; parentElement.appendChild(el); updateItemPosition(item); return el;
}

// --- Updates & Visual State ---

function updateUnitPosition(unit, forceUpdate = false) { if (!unit?.element || unit.element.classList.contains('dead')) return; const targetCol = unit.x + 1; const targetRow = unit.y + 1; unit.element.style.setProperty('--unit-x', targetCol); unit.element.style.setProperty('--unit-y', targetRow); if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit); }

function updateUnitVisualState(unit) {
    if (!unit?.element || unit.element.classList.contains('dead')) return;
    const el = unit.element;
    const isSelected = selectedUnit?.id === unit.id;
    const isActed = unit.acted && !levelClearedAwaitingInput;

    // Reset filters before applying
    el.style.filter = '';

    let currentFilters = [];
    if (isSelected) currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--selected-filter-outline').trim());

    if (unit.isStealthed) {
        currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--stealth-filter').trim());
    } else if (unit.isFrozen) {
        // Frost filter applied based on turns remaining
        if (unit.frozenTurnsLeft > 0) {
            currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--frozen-filter').trim());
        }
    } else if (unit.isNetted) {
        // Netted visual is an overlay, no filter needed here usually
    } else if (unit.isSlowed) {
        currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--slowed-filter').trim());
    } else if (isActed) {
        currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--acted-filter').trim());
    }

    if (unit.isElite && !unit.isFrozen && !unit.isStealthed) { // Don't double-filter frozen/stealthed elites
        currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--elite-filter').trim());
    }

    // Always apply base shadow unless dead/fading
    if (!el.classList.contains('fading-out')) {
         currentFilters.push(getComputedStyle(document.documentElement).getPropertyValue('--unit-base-shadow').trim());
    }

    // Apply combined filters
    el.style.filter = currentFilters.join(' ');

    el.classList.toggle('acted', isActed && !unit.isStealthed); // Don't grey out stealthed units
    el.classList.toggle('selected', isSelected);
    el.classList.toggle('frozen', unit.isFrozen && unit.frozenTurnsLeft > 0); // Only add class if actually frozen
    el.classList.toggle('netted', unit.isNetted); // For the ::after pseudo-element
    el.classList.toggle('slowed', unit.isSlowed); // Toggle class, filter handles visual
    el.classList.toggle('stealthed', unit.isStealthed); // NEW
    el.classList.toggle('in-tower', !!unit.inTower);
    el.classList.toggle('elite', unit.isElite);
    setUnitVariantClass(unit);

    // Reset transition duration unless frozen
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
function showGoldPopup(x, y, amount) { showPopup(x, y, `+${amount} <img src="./sprites/gold.png" alt="G">`, 'gold-popup'); }
function showGemPopup(x, y, amount) { showPopup(x, y, `+${amount} <img src="./sprites/shiny_gem.png" alt="Gem">`, 'gem-popup'); }
function flashElementOnHit(element) { if (element && !element.classList.contains('unit-hit-flash')) { element.classList.add('unit-hit-flash'); setTimeout(() => element?.classList.remove('unit-hit-flash'), 200); } }

function showFeedback(message, type = '', duration = 2500) { if (!boardFeedbackArea) return; boardFeedbackArea.innerHTML = message; boardFeedbackArea.className = `board-feedback-area ${type}`; const typeDurations = { 'feedback-gold': 1500, 'feedback-cheat': 1500, 'feedback-levelup': 2000, 'feedback-spell-unlock': 3000, 'feedback-achievement-unlock': 3500, 'feedback-turn': 1200, 'feedback-error': 2000 }; duration = typeDurations[type] || duration; boardFeedbackArea.style.opacity = '1'; boardFeedbackArea.style.display = 'flex'; if (boardFeedbackArea.timeoutId) clearTimeout(boardFeedbackArea.timeoutId); boardFeedbackArea.timeoutId = setTimeout(() => { boardFeedbackArea.style.opacity = '0'; setTimeout(() => { if (boardFeedbackArea.style.opacity === '0') { boardFeedbackArea.innerHTML = ''; boardFeedbackArea.style.display = 'none'; boardFeedbackArea.className = 'board-feedback-area'; } }, 500); }, duration - 500); }
function updateLevelDisplay() { if (levelDisplayElement) levelDisplayElement.textContent = `Level: ${currentLevel}`; }
function updateGoldDisplay() { if (menuGoldAmountElement) menuGoldAmountElement.textContent = playerGold; if (shopGoldAmountElement) shopGoldAmountElement.textContent = playerGold; if (levelCompleteTotalGoldElement) levelCompleteTotalGoldElement.textContent = playerGold; }

function updateSpellUI() {
    if (!spellAreaElement) return; const spellData = [ { el: fireballElement, name: 'fireball', unlock: FIREBALL_UNLOCK_LEVEL }, { el: flameWaveElement, name: 'flameWave', unlock: FLAME_WAVE_UNLOCK_LEVEL }, { el: frostNovaElement, name: 'frostNova', unlock: FROST_NOVA_UNLOCK_LEVEL }, { el: healElement, name: 'heal', unlock: HEAL_UNLOCK_LEVEL } ]; const hotkeys = ['1', '2', '3', '4'];
    spellData.forEach((s, index) => { if (!s.el) return; const spellName = s.name; const isPermanentlyUnlocked = spellsUnlocked[spellName] === true; const canUseThisTurn = (spellUses[spellName] === true || unlimitedSpellsCheat); const isSelected = currentSpell === spellName; const hotkey = hotkeys[index]; s.el.className = 'spell-icon'; const labelSibling = s.el.nextElementSibling; const baseTitle = labelSibling?.classList.contains('spell-label') ? labelSibling.textContent : spellName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); let title = baseTitle;
        if (!isPermanentlyUnlocked) { s.el.classList.add('locked'); title += ` (Unlock at Lvl ${s.unlock})`; } else if (!canUseThisTurn) { s.el.classList.add('used'); title += ` (Used)`; } else { s.el.classList.add('available'); if (isSelected) { s.el.classList.add('selected'); title = `CASTING: ${title} (Esc to Cancel)`; } else { const effect = getSpellEffectDescription(spellName); title += ` - ${effect} [${hotkey}]`; } if (unlimitedSpellsCheat) { s.el.classList.add('cheat-available'); title += ` (Cheat Active)`; } } s.el.title = title; const label = s.el.nextElementSibling; if (label?.classList.contains('spell-label')) { if (!isPermanentlyUnlocked) label.style.color = '#888'; else if (!canUseThisTurn) label.style.color = '#999'; else if (unlimitedSpellsCheat && canUseThisTurn) label.style.color = '#69f0ae'; else label.style.color = ''; } });
    if (gameBoard) { gameBoard.className = 'game-board'; if (isPanning) gameBoard.classList.add('panning'); if (currentSpell) gameBoard.classList.add(`${currentSpell}-targeting`); }
}

function getSpellEffectDescription(spellName, getNextLevelValue = false) { // Add flag
     try {
          const currentUpgradeLevel = playerSpellUpgrades[spellName] || 0;
          const displayLevel = getNextLevelValue ? currentUpgradeLevel + 2 : currentUpgradeLevel + 1;
          const levelText = currentUpgradeLevel > 0 ? ` (Lvl ${displayLevel})` : '';
        //   const value = getSpellEffectValue(spellName, 0, getNextLevelValue); // Get base value from spell data // Not used directly

          switch (spellName) {
              case 'fireball': return `Deal ${getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE, getNextLevelValue)} DMG${levelText}`;
              case 'flameWave': return `Deal ${getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE, getNextLevelValue)} DMG to Row${levelText}`;
              case 'frostNova':
                  const radiusLevel = getFrostNovaRadiusLevel(getNextLevelValue); // Get radius level
                  const areaDim = radiusLevel * 2 + 1;
                  return `Freeze ${areaDim}x${areaDim} area (${FROST_NOVA_BASE_DURATION} turns)${levelText}`; // Duration doesn't change?
              case 'heal': return `Heal ${getSpellEffectValue(spellName, HEAL_BASE_AMOUNT, getNextLevelValue)} HP${levelText}`;
              default: return '';
          }
      } catch (e) { console.error("Spell description error:", e); return "Effect Error"; }
 }

function updateTurnDisplay() { if (!actionsLeftDisplayElement || !endTurnButton) return; const isPlayer = currentTurn === 'player'; let actionsText = '', buttonText = `<span class="hotkey-e">E</span>nd Turn`, buttonTitle = "End Player Turn [E]"; let isButtonDisabled = false, hasDisabledClass = false, isNextLevelMode = false; if (levelClearedAwaitingInput) { actionsText = 'Level Cleared!'; buttonText = `Proc<span class="hotkey-e">e</span>ed`; buttonTitle = "Proceed [E]"; isNextLevelMode = true; isButtonDisabled = false; hasDisabledClass = false; } else if (isPlayer) { const remainingActions = units.reduce((count, unit) => count + (unit.team === 'player' && !unit.acted && !unit.isFrozen && !unit.isNetted && isUnitAliveAndValid(unit) ? (unit.canQuickStrike && unit.actionsTakenThisTurn < 1 ? 2 : 1) - unit.actionsTakenThisTurn : 0), 0); actionsText = `Actions Left: ${remainingActions}`; isButtonDisabled = false; /* No global isProcessing */ hasDisabledClass = false; } else { actionsText = `Enemy Turn...`; buttonTitle = "Enemy Turn"; isButtonDisabled = true; hasDisabledClass = true; } actionsLeftDisplayElement.textContent = actionsText; endTurnButton.innerHTML = buttonText; endTurnButton.title = buttonTitle; endTurnButton.disabled = isButtonDisabled; endTurnButton.classList.toggle('disabled', hasDisabledClass); endTurnButton.classList.toggle('next-level-mode', isNextLevelMode); }

function updateUnitInfo(unit) {
    const infoHpTextElement = unitInfo?.querySelector('.unit-hp-text'); const infoHpBarElement = unitInfo?.querySelector('.unit-hp-bar'); if (!unitInfo || !infoHpTextElement || !infoHpBarElement || !unitNameDisplay || !unitAtkDisplay || !unitMovDisplay || !unitRngDisplay || !unitStatusDisplay || !unitPortraitElement) return; const show = unit && isUnitAliveAndValid(unit);
    if (show) {
        unitNameDisplay.textContent = unit.name; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0; infoHpTextElement.textContent = `${unit.hp}/${unit.maxHp}`; infoHpBarElement.style.setProperty('--hp-percent', `${hpPercent}%`); const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); infoHpBarElement.dataset.hpLevel = hpLevel; unitAtkDisplay.textContent = `ATK: ${unit.atk}`;
        // Show base movement, then modify based on status for clarity
        let movDisplay = `MOV: ${unit.baseMov}`; // Display base movement considering armor
        let currentMov = unit.mov; // Start with current (potentially armor-modified) base
        let penalties = [];
        if (unit.isStealthed) penalties.push(`-${ROGUE_STEALTH_MOVE_PENALTY} Stealth`);
        if (unit.quickStrikeActive) penalties.push(`-${ROGUE_QUICK_STRIKE_MOVE_PENALTY} Q.Strike`);
        if (unit.isSlowed) penalties.push(`-1 Slow`);
        if(penalties.length > 0) movDisplay += ` (${penalties.join(', ')})`;
        unitMovDisplay.textContent = movDisplay;

        unitRngDisplay.textContent = unit.currentRange > 1 ? `RNG: ${unit.currentRange}` : ''; unitRngDisplay.style.display = unit.currentRange > 1 ? 'block' : 'none'; let statusText = '';
        if(unit.isStealthed) statusText += '👻 Stealth';
        if (unit.isFrozen) statusText += (statusText ? ' | ' : '') + `❄️ Frozen (${unit.frozenTurnsLeft}t)`;
        if (unit.isNetted) statusText += (statusText ? ' | ' : '') + `🕸️ Netted (${unit.nettedTurnsLeft}t)`;
        if (unit.isSlowed) statusText += (statusText ? ' | ' : '') + `🐌 Slowed (${unit.slowedTurnsLeft}t)`;
        if (unit.inTower) statusText += (statusText ? ' | ' : '') + `🏰 In Tower`;
        if (unit.quickStrikeActive) statusText += (statusText ? ' | ' : '') + '⚡ Quick Strike';
        unitStatusDisplay.innerHTML = statusText; unitStatusDisplay.style.display = statusText ? 'block' : 'none';
        const portraitUrl = unit.portraitUrl; // Already recolored URL from createUnit
        if (portraitUrl) { const currentBg = unitPortraitElement.style.backgroundImage; const newBg = `url("${portraitUrl}")`; if (currentBg !== newBg) unitPortraitElement.style.backgroundImage = newBg; unitPortraitElement.style.opacity = '1'; } else { unitPortraitElement.style.backgroundImage = ''; unitPortraitElement.style.opacity = '0'; }
        unitPortraitElement.className = ''; // Clear previous variant classes
        if (unit.team === 'enemy' && unit.variantType && unit.variantType !== 'green') { unitPortraitElement.classList.add(`goblin-${unit.variantType}`); } // Apply variant class if needed
        unitInfo.parentElement.style.display = ''; unitInfo.style.display = 'grid';
    } else { unitInfo.style.display = 'none'; unitPortraitElement.style.opacity = '0'; unitPortraitElement.className = ''; unitNameDisplay.textContent = ''; infoHpTextElement.textContent = ''; infoHpBarElement.style.setProperty('--hp-percent', '0%'); infoHpBarElement.dataset.hpLevel = 'empty'; unitAtkDisplay.textContent = ''; unitMovDisplay.textContent = ''; unitRngDisplay.textContent = ''; unitStatusDisplay.textContent = ''; unitRngDisplay.style.display = ''; unitStatusDisplay.style.display = ''; }
}


function updateUnitInfoDisplay(unit) { const unitIdToShow = unit?.id ?? null; const isUnitSelected = selectedUnit?.id === unitIdToShow; const isHoveringThisUnit = lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === unitIdToShow; if (isUnitSelected || (!selectedUnit && isHoveringThisUnit)) updateUnitInfo(unit); else if (!selectedUnit && !isHoveringThisUnit) updateUnitInfo(null); if (tooltipElement?.classList.contains('visible') && isHoveringThisUnit) showTooltip(unit, 'unit'); }
function updateUnitInfoOnDeath(deadUnitId) { let panelWasHidden = false; if (selectedUnit?.id === deadUnitId) { if (typeof deselectUnit === 'function') deselectUnit(false); else if (typeof updateUnitInfo === 'function') updateUnitInfo(null); panelWasHidden = true; } if (!panelWasHidden && !selectedUnit && lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === deadUnitId) { if (typeof updateUnitInfo === 'function') updateUnitInfo(null); panelWasHidden = true; } if (tooltipElement?.classList.contains('visible') && lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === deadUnitId) { hideTooltip(); lastHoveredElement = null; } }

function updateUiForNewLevel() { updateLevelDisplay(); updateGoldDisplay(); updateUnitInfo(null); if (boardFeedbackArea) { if (boardFeedbackArea.timeoutId) clearTimeout(boardFeedbackArea.timeoutId); boardFeedbackArea.innerHTML = ''; boardFeedbackArea.className = 'board-feedback-area'; boardFeedbackArea.style.opacity = '1'; boardFeedbackArea.style.display = 'none'; } if (endTurnButton) { endTurnButton.innerHTML = `<span class="hotkey-e">E</span>nd Turn`; endTurnButton.title = "End Player Turn (E)"; endTurnButton.classList.remove('next-level-mode', 'disabled'); endTurnButton.disabled = false; } if (gameBoard) gameBoard.className = 'game-board'; updateSpellUI(); clearSpellHighlights(); clearHighlights(); hideAllOverlays(); updateShopDisplay(); updateChooseTroopsScreen(); updateFullscreenButton(); updateMuteButtonVisual(); startTooltipUpdater(); gameBoardWrapper?.classList.add('active'); if (defaultViewButton) defaultViewButton.classList.add('hidden'); }
function updateQuitButton() { if (!quitButton) return; const canForfeit = playerActionsTakenThisLevel >= FORFEIT_MOVE_THRESHOLD; if (canForfeit) { quitButton.textContent = "Forfeit Level"; quitButton.title = "Forfeit Level (Incurs Penalty)"; quitButton.dataset.action = "forfeit"; } else { quitButton.textContent = "Quit to Level Select"; quitButton.title = "Quit to Level Select (No Penalty)"; quitButton.dataset.action = "quit"; } }
function getCellElement(x, y) { return cellElementsMap.get(`${x},${y}`); }
function clearHighlights() { gridContent?.querySelectorAll('.valid-move, .valid-attack-target, .valid-cleave-target, .can-be-primary-target').forEach(c => c.classList.remove('valid-move', 'valid-attack-target', 'valid-cleave-target', 'can-be-primary-target')); highlightedAttackCells = []; }

function showAttackHoverHighlights(attacker, primaryTargetPos) { if (!attacker || !primaryTargetPos || !isUnitAliveAndValid(attacker)) return; clearAttackHoverHighlights(); const primaryCell = getCellElement(primaryTargetPos.x, primaryTargetPos.y); if (primaryCell) primaryCell.classList.add('valid-attack-target'); if (attacker.type !== 'champion' || attacker.cleaveDamage <= 0) return; const attackDirX = Math.sign(primaryTargetPos.x - attacker.x); const attackDirY = Math.sign(primaryTargetPos.y - attacker.y); if (attackDirX === 0 && attackDirY === 0) return; const coords = []; const px = primaryTargetPos.x, py = primaryTargetPos.y; if (attackDirX !== 0) coords.push({ x: px, y: py - 1 }, { x: px, y: py + 1 }, { x: px + attackDirX, y: py }); else if (attackDirY !== 0) coords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py + attackDirY }); else coords.push({ x: px - 1, y: py }, { x: px + 1, y: py }, { x: px, y: py - 1 }, { x: px, y: py + 1 }); coords.forEach(({ x, y }) => { if (!isCellInBounds(x, y)) return; const secondaryUnit = getUnitAt(x, y); const primaryTargetObject = getUnitAt(px, py) || getObstacleAt(px, py); if (secondaryUnit && isUnitAliveAndValid(secondaryUnit) && secondaryUnit.team !== attacker.team) { if (!primaryTargetObject || secondaryUnit.id !== primaryTargetObject.id) getCellElement(x, y)?.classList.add('valid-cleave-target'); } const secondaryObstacle = getObstacleAt(x, y); if (secondaryObstacle && secondaryObstacle.canBeAttacked) { if (!primaryTargetObject || secondaryObstacle.id !== primaryTargetObject.id) getCellElement(x, y)?.classList.add('valid-cleave-target'); } }); }
function clearAttackHoverHighlights() { gridContent?.querySelectorAll('.valid-attack-target, .valid-cleave-target').forEach(c => c.classList.remove('valid-attack-target', 'valid-cleave-target')); }
function highlightMovesAndAttacks(unit) { clearHighlights(); if (!unit || !isUnitAliveAndValid(unit)) return; // Check only if unit is valid

     // Determine if the unit can perform *any* action (move or attack)
     let canAct = !levelClearedAwaitingInput && !unit.acted;
     if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;
     if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAct = true;

     if (!canAct || unit.isFrozen) return; // Frozen prevents both move and attack

     // Highlight Moves (only if not netted)
     if (!unit.isNetted) {
         const moves = getValidMoves(unit);
         moves.forEach(p => { getCellElement(p.x, p.y)?.classList.add('valid-move'); });
     }

     // Highlight Attacks (Netted units CAN attack)
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
             // Highlight tower if unit is inside
             if(target.inTower) {
                 const tower = obstacles.find(o => o.id === target.inTower);
                 if(tower?.element) {
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
                  // Also add class to the obstacle element itself for hover effects?
                  if(target.element) target.element.classList.add(isChampion ? 'can-be-primary-target' : 'valid-attack-target');
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
    if (!unit || unit.team !== 'player' || currentTurn !== 'player' /* Removed isProcessing check */ || !isUnitAliveAndValid(unit)) return;

    // Determine if unit can perform *any* action this turn
    let canAct = !levelClearedAwaitingInput && !unit.acted;
    if (unit.canMoveAndAttack && unit.actionsTakenThisTurn < 2) canAct = true;
    if (unit.quickStrikeActive && unit.actionsTakenThisTurn < 2) canAct = true;

    // Allow selection even if netted, but prevent movement later
    if (!canAct || unit.isFrozen) {
        let feedback = "Cannot select unit.";
        if (unit.isFrozen) feedback = "Unit is Frozen!";
        // else if (unit.isNetted) feedback = "Unit is Netted! (Cannot Move)"; // Netted doesn't prevent selection
        else if (unit.acted && !unit.canMoveAndAttack && !unit.quickStrikeActive) feedback = "Unit already acted.";
        showFeedback(feedback, "feedback-error");
        playSfx('error');
        return;
    }
    if (currentSpell) setActiveSpell(null);
    if (selectedUnit === unit) return; // Already selected
    if (selectedUnit && selectedUnit.element) updateUnitVisualState(selectedUnit); // Deselect previous
    selectedUnit = unit;
    if (unit.element) updateUnitVisualState(unit); // Apply selected visual
    highlightMovesAndAttacks(unit);
    updateUnitInfo(unit);
    playSfx('select');

    // Mobile Temporary Tooltip
    if (isMobileDevice()) {
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        showTooltip(unit, 'unit');
        tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS);
    }
}

function deselectUnit(playSound = true) { if (selectedUnit) { if (selectedUnit.element) updateUnitVisualState(selectedUnit); selectedUnit = null; clearHighlights(); if (playSound) playSfx('select'); clearAttackHoverHighlights(); updateUnitInfo(null); } }
function trackMousePosition(event) { currentMouseX = event.clientX; currentMouseY = event.clientY; }

function updateTooltip() {
    if (isMobileDevice() || !tooltipElement || isPanning || isMapPanning || (!gameBoardWrapper && !isLevelSelectOpen() && !isChooseTroopsScreenOpen() && !isShopOpen()) || isAnyOverlayVisible(true)) {
        if (tooltipElement?.classList.contains('visible')) hideTooltip();
        lastHoveredElement = null;
        return;
    }
    const el = document.elementFromPoint(currentMouseX, currentMouseY);
    let targetElement = null; let targetData = null; let type = null;
    const shopItemEl = el?.closest('.shop-item');
    const spellIconEl = el?.closest('.spell-icon');
    const goldDisplayEl = el?.closest('.menu-like-gold-display, #shop-gold-display'); // Include shop gold
    const unitEl = el?.closest('.unit');
    const itemEl = el?.closest('.item:not(.collected)');
    const obstacleEl = el?.closest('.obstacle:not(.destroyed)');
    const levelDotEl = el?.closest('.level-dot');
    const troopCardEl = el?.closest('.troop-card');
    const passiveItemEl = el?.closest('.shop-item[data-type="passive"], .shop-item[data-type="passive_purchase"]');
    const armorItemEl = el?.closest('.shop-item[data-type="armor"]');

    // Prioritize shop items if inside shop
    if (isShopOpen()) {
        if (armorItemEl) { type = 'armor'; targetElement = armorItemEl; targetData = armorItemEl; }
        else if (passiveItemEl) { type = 'passive'; targetElement = passiveItemEl; targetData = passiveItemEl; }
        else if (shopItemEl && shopItemEl.classList.contains('selectable')) { type = 'shop'; targetElement = shopItemEl; targetData = shopItemEl; } // Only tooltip selectable shop items
        else if (spellIconEl) { type = 'spell'; targetElement = spellIconEl; targetData = spellIconEl; }
        else if (goldDisplayEl) { type = 'gold'; targetElement = goldDisplayEl; targetData = playerGold; }
    } else if (isLevelSelectOpen()) {
        if (levelDotEl) { type = 'levelDot'; targetElement = levelDotEl; targetData = levelDotEl; }
    } else if (isChooseTroopsScreenOpen()) {
        if (troopCardEl) { type = 'troopCard'; targetElement = troopCardEl; targetData = troopCardEl; }
        else if (goldDisplayEl) { type = 'gold'; targetElement = goldDisplayEl; targetData = playerGold; }
    } else if (isGameActive()) {
        if (unitEl && !unitEl.classList.contains('dead') && !unitEl.classList.contains('fading-out')) { type = 'unit'; targetElement = unitEl; const unitId = unitEl.dataset.id; targetData = units.find(u => u.id === unitId && isUnitAliveAndValid(u)); }
        else if (itemEl) { type = 'item'; targetElement = itemEl; targetData = items.find(i => i.id === itemEl.dataset.id && !i.collected); }
        else if (obstacleEl) { type = 'obstacle'; targetElement = obstacleEl; targetData = obstacles.find(o => o.id === obstacleEl.dataset.id && isObstacleIntact(o)); }
        else if (spellIconEl) { type = 'spell'; targetElement = spellIconEl; targetData = spellIconEl; }
    } else if (isMenuOpen() || isSettingsOpen()) {
         if (goldDisplayEl) { type = 'gold'; targetElement = goldDisplayEl; targetData = playerGold; }
    }

    if (targetElement && targetData) { if (lastHoveredElement !== targetElement) { showTooltip(targetData, type); lastHoveredElement = targetElement; if (type === 'unit' && !selectedUnit && currentTurn === 'player' /* Removed !isProcessing */ && isGameActive()) updateUnitInfo(targetData); else if (lastHoveredElement?.matches('.unit') && type !== 'unit' && !selectedUnit && !el?.closest('#unit-info') && isGameActive()) updateUnitInfo(null); } else positionTooltip(); } else { if (lastHoveredElement !== null) { hideTooltip(); if (lastHoveredElement.matches('.unit') && !selectedUnit && currentTurn === 'player' /* Removed !isProcessing */ && !el?.closest('#unit-info') && isGameActive()) updateUnitInfo(null); lastHoveredElement = null; } }
}


function startTooltipUpdater() { if(isMobileDevice()) return; stopTooltipUpdater(); tooltipUpdateInterval = setInterval(updateTooltip, 100); }
function stopTooltipUpdater() { if (tooltipUpdateInterval) { clearInterval(tooltipUpdateInterval); tooltipUpdateInterval = null; } hideTooltip(); }

function showTooltip(data, type) {
    if (!tooltipElement || !data) { hideTooltip(); return; } let content = '';
    try { switch (type) {
            case 'unit': const unit = data; if (!unit || !unit.name || typeof unit.hp === 'undefined') { hideTooltip(); return; } content = `<b>${unit.name}</b>`; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0; content += `<div class="unit-hp-bar-container tooltip-hp-bar" style="--hp-percent: ${hpPercent}%;">`; const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); content += `<div class="unit-hp-bar" data-hp-level="${hpLevel}"></div><span class="unit-hp-text">${unit.hp}/${unit.maxHp}</span></div>`; let statuses = []; if(unit.isStealthed) statuses.push(`<span style="color:#cccccc;">👻 Stealth</span>`); if (unit.isFrozen) statuses.push(`<span style="color:#aadeff;">❄️ Frozen (${unit.frozenTurnsLeft}t)</span>`); if (unit.isNetted) statuses.push(`<span style="color:#cccccc;">🕸️ Netted (${unit.nettedTurnsLeft}t)</span>`); if (unit.isSlowed) statuses.push(`<span style="color:#add8e6;">🐌 Slowed (${unit.slowedTurnsLeft}t)</span>`); if (unit.inTower) statuses.push(`<span style="color:#ffddaa;">🏰 In Tower</span>`); if (unit.quickStrikeActive) statuses.push(`<span style="color:#fff352;">⚡ Quick Strike</span>`); if (statuses.length > 0) content += `<br>` + statuses.join('<br>'); break;
            case 'item': const item = data; const itemConfig = ITEM_DATA[item.type]; if (!itemConfig) break; if (item.type === 'gold') content = `<b>Gold Coin</b>Value: ${itemConfig.value || 1}`; else if (item.type === 'chest') { content = `<b>Chest</b>`; if (item.opened) content += `<br>Empty`; } else if (item.type === 'health_potion') content = `<b>Health Potion</b>Heals ${itemConfig.value || 1} HP`; else if (item.type === 'shiny_gem') content = `<b>Shiny Gem</b>Value: ${item.value || '?'}`; else if (item.type === 'gold_magnet') content = `<b>Gold Magnet</b><br><span style="color:#ffddaa;">Pulls nearby gold!</span>`; else if (item.type === 'spellbook') content = `<b>Spellbook</b><br><span style="color:#aadeff;">Restores 1 spell charge.</span>`; else if (item.type === 'armor') content = `<b>Armor Drop</b><br><span style="color:#ffddaa;">Boss armor piece (${item.armorId || 'Unknown'}).</span>`; break;
            case 'obstacle': const obstacle = data; const obsConfig = OBSTACLE_DATA[obstacle.type]; content = `<b>${obstacle.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</b>`; if (obstacle.destructible) content += `<br>HP: ${obstacle.hp}/${obstacle.maxHp}`; if (obstacle.enterable) { const occupant = obstacle.occupantUnitId ? units.find(u => u.id === obstacle.occupantUnitId && isUnitAliveAndValid(u)) : null; content += `<br>${occupant ? `Occupied by ${occupant.name}` : 'Empty'}`; if (occupant?.baseRange > 1) content += ` (+${obstacle.rangeBonus} RNG)`; if (!occupant && obstacle.hp > 0) content += `<br><span style="color:#cccccc;">(Enter/Exit from below)</span>`; } if (obsConfig.blocksLOS) content += `<br><span style="color:#ffccaa;">Blocks Line of Sight</span>`; if (obstacle.hidesUnit && !obstacle.revealed) content += `<br><span style="color:#aadeff;">Seems suspicious...</span>`; if (obstacle.canBeAttacked) content += `<br><span style="color:#ffaaaa;">Attackable</span>`; break;
            case 'shop': const shopItemId = data.dataset.itemId; const shopItemType = data.dataset.type; if (shopItemType === 'recruit') { const unitType = data.dataset.unitType; const unitData = UNIT_DATA[unitType]; const shopCost = getRecruitCost(unitType); const owned = playerOwnedUnits[unitType] || 0; const max = parseInt(data.dataset.max) || MAX_OWNED_PER_TYPE; content = `<b>Recruit ${unitData.name}</b> (${owned}/${max})`; content += `<br>${unitData.baseHp} HP | ${unitData.baseAtk} ATK | ${unitData.mov} MOV | ${unitData.range} RNG`; content += `<div class="tooltip-cost">Cost: <span>${shopCost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'unit_upgrade') { const cost = UNIT_UPGRADE_COSTS[shopItemId] || 99999; const desc = data.querySelector('h4')?.textContent || "Unit Upgrade"; content = `<b>${desc}</b><br>Permanently increases stat for all units of this type.`; content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'ability_upgrade') { const cost = ABILITY_UPGRADE_COSTS[shopItemId] || 99999; const abilityName = data.querySelector('h4')?.textContent || "Ability Upgrade"; content = `<b>${abilityName}</b>`; if(shopItemId === 'upgrade_rogue_quickstrike') content += `<br>Rogue Ability: Allows an extra attack per turn at the cost of ${ROGUE_QUICK_STRIKE_MOVE_PENALTY} movement.`; content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'spell_upgrade') { const spellName = data.dataset.spellName; const cost = calculateSpellCost(spellName); const currentLevel = playerSpellUpgrades[spellName] || 0; const config = SPELL_UPGRADE_CONFIG[spellName]; content = `<b>Upgrade ${config.name} (Lvl ${currentLevel + 2})</b>`; content += `<br>Next: ${getSpellEffectDescription(spellName, true /* showNextLevel */)}`; if (cost !== Infinity) content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; else content += `<br>Max Level Reached.`; const reqLvl = parseInt(data.dataset.requiredLevel) || 0; if (highestLevelReached <= reqLvl && currentLevel === 0) content += `<br><span style="color:#ffaaaa;">Requires completing Level ${reqLvl}.</span>`; } break;
            case 'passive': const passiveId = data.dataset.itemId?.startsWith('passive_') ? data.dataset.itemId.substring(8) : null; if(passiveId && PASSIVE_DATA[passiveId]) { const passiveConfig = PASSIVE_DATA[passiveId]; const passiveLevel = playerPassiveUpgrades[passiveId] || 0; content = `<b>${passiveConfig.name}${passiveId === 'gold_magnet' ? ` (Lvl ${passiveLevel})` : ''}</b>`; content += `<br>${passiveConfig.description}`; if(passiveId === 'tactical_command') { const tcCost = PASSIVE_UPGRADE_COSTS.tactical_command; const currentSlots = MAX_ACTIVE_ROSTER_SIZE_BASE + (playerPassiveUpgrades.tactical_command || 0); const canBuyMore = currentSlots < MAX_ACTIVE_ROSTER_SIZE_MAX; if (canBuyMore) { content += `<br>(Currently: ${currentSlots}/${MAX_ACTIVE_ROSTER_SIZE_MAX} slots)`; content += `<div class="tooltip-cost">Cost: <span>${tcCost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; const reqUnits = parseInt(data.dataset.requiredUnits); const ownedUnits = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0); if (ownedUnits < reqUnits) content += `<br><span style="color:#ffaaaa;">Requires owning ${reqUnits}+ total units.</span>`; } else content += `<br>(Max Slots Reached)`; } else if (passiveId === 'gold_magnet') { content += `<br><span style="color:#ffddaa;">(Found as drop only)</span>`; } } break;
            case 'armor': const armorId = data.dataset.armorId; const armorData = ARMOR_DATA[armorId]; const armorLevel = playerOwnedArmor[armorId] || 0; if(armorData) { content = `<b>${armorData.name}${armorLevel > 1 ? ` (Lvl ${armorLevel})` : ''}</b>`; content += `<br>${armorData.description}`; if (armorId !== 'none' && armorId !== 'grey') { if (armorLevel === 0) content += `<br><span style="color:#ffaaaa;">(Dropped by World Boss)</span>`; else if (equippedArmorId === armorId) content += `<br><span style="color:#aaffaa;">Equipped</span>`; else content += `<br><span style="color:#ffddaa;">Click to Equip</span>`; } if (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL) { if(armorData.resistances?.fire >= ARMOR_RESISTANCE_VALUE) content+= `<br><span style="color:#ff8c69;">+${ARMOR_RESISTANCE_VALUE} Fire Resist</span>`; if(armorData.resistances?.frost >= ARMOR_RESISTANCE_VALUE) content+= `<br><span style="color:#add8e6;">+${ARMOR_RESISTANCE_VALUE} Frost Resist</span>`; } } break;
            case 'gold': content = `Current Gold: ${data}`; break; case 'spell': content = data.title || "Spell"; break;
            case 'levelDot': const levelDot = data; const levelNum = levelDot.dataset.level; content = `<b>Level ${levelNum}</b>`; if (levelDot.classList.contains('locked')) content += `<br><span style="color:#aaaaaa;">Locked</span>`; else if (levelDot.classList.contains('beaten')) content += `<br><span style="color:#aaffaa;">Completed</span>`; else content += `<br><span style="color:#ffaaaa;">Click to Play</span>`; break;
            case 'troopCard': const card = data; const unitType = card.dataset.unitType; const unitData = UNIT_DATA[unitType]; const countSpan = card.querySelector('.troop-count'); const count = countSpan ? countSpan.textContent : '?'; content = `<b>${unitData?.name || 'Unknown Troop'}</b>`; const parentListId = card.parentElement?.id; if (parentListId === 'current-troops-list') content += `<br>Count: ${count} (In Roster)<br><span style="color:#ffccaa;">Click to move to Available</span>`; else if (parentListId === 'available-troops-list') { content += `<br>Count: ${count} (Available)`; const totalActive = getTotalActiveUnits(); if (totalActive < maxActiveRosterSize) content += `<br><span style="color:#aaffaa;">Click to move to Roster</span>`; else content += `<br><span style="color:#ff8888;">Roster Full!</span>`; } break;
            default: hideTooltip(); return;
        } } catch (e) { console.error(`Tooltip error for type ${type}:`, e); content = "Error"; }
    if (content) { tooltipElement.innerHTML = content; tooltipElement.classList.add('visible'); positionTooltip(); } else hideTooltip();
}

function hideTooltip() { if (tooltipElement) tooltipElement.classList.remove('visible'); if (tooltipTimeout) clearTimeout(tooltipTimeout); }
function positionTooltip() { if (!tooltipElement || !tooltipElement.classList.contains('visible')) return; const rect = tooltipElement.getBoundingClientRect(); const contRect = document.body.getBoundingClientRect(); const offsetX = 15; const offsetY = 20; let top = currentMouseY + offsetY; let left = currentMouseX + offsetX; if (top + rect.height > contRect.height - 10) top = currentMouseY - rect.height - 15; if (left + rect.width > contRect.width - 10) left = currentMouseX - rect.width - 15; left = Math.max(5, left); top = Math.max(5, top); tooltipElement.style.left = `${left}px`; tooltipElement.style.top = `${top}px`; }
async function animateUnitMove(unit, startX, startY, targetX, targetY) { return new Promise((resolve) => { if (!unit?.element || unit.element.classList.contains('dead')) { resolve(); return; } unit.element.classList.add('is-moving'); void unit.element.offsetWidth; unit.element.style.setProperty('--unit-x', targetX + 1); unit.element.style.setProperty('--unit-y', targetY + 1); let finalized = false; const transitionDuration = MOVE_ANIMATION_DURATION_MS; const endHandler = (e) => { if (e.target === unit.element && (e.propertyName === 'left' || e.propertyName === 'top')) finalize(); }; const finalize = () => { if (finalized || !unit?.element) return; finalized = true; unit.element.removeEventListener('transitionend', endHandler); unit.element.classList.remove('is-moving'); updateUnitPosition(unit, true); resolve(); }; unit.element.addEventListener('transitionend', endHandler); setTimeout(() => { if (!finalized) finalize(); }, transitionDuration + 50); }); }
async function animateAttack(attacker, targetPos, isRanged, projectileType = 'melee') {
    return new Promise(async (resolve) => {
        if (!attacker?.element || !targetPos || !gridContent) { resolve(0); return; }
        let delay = 0;
        const attackerElement = attacker.element;
        const originalZIndex = window.getComputedStyle(attackerElement).zIndex || '10';
        const attackZIndex = '25';

        if (isRanged && projectileType !== 'melee' && projectileType !== 'none') { // Only shoot if ranged AND has a visual projectile type
            const projectile = document.createElement('div');
            let projectileClass = '';
            let shootSound = '';
            let duration = 0;
            let imgUrl = '';

            switch (projectileType) {
                case 'arrow':
                    projectileClass = 'arrow';
                    imgUrl = './sprites/arrow.png';
                    shootSound = 'arrowShoot';
                    duration = ARROW_FLY_DURATION_MS;
                    projectile.style.width = '26px';
                    projectile.style.height = '7px';
                    break;
                case 'fireball':
                    projectileClass = 'fireball-projectile';
                    imgUrl = './sprites/fireball.png';
                    shootSound = 'pyroFireball'; // Use pyro sound for visual
                    duration = FIREBALL_PROJECTILE_DURATION_MS;
                    projectile.style.width = '72px'; // Match CSS
                    projectile.style.height = '72px';
                    break;
                case 'net':
                    projectileClass = 'net';
                    imgUrl = './sprites/net.png';
                    shootSound = 'net_throw';
                    duration = NET_FLY_DURATION_MS;
                    projectile.style.width = '35px'; // Match CSS
                    projectile.style.height = '35px';
                    break;
                default:
                    console.warn("Attempted to animate unknown projectile:", projectileType)
                    resolve(0); // Unknown projectile type
                    return;
            }

            projectile.className = `projectile ${projectileClass}`;
            projectile.style.backgroundImage = `url('${imgUrl}')`;
            const startGridX = (attacker.x + 0.5) * currentCellSize;
            const startGridY = (attacker.y + 0.5) * currentCellSize;
            const endGridX = (targetPos.x + 0.5) * currentCellSize;
            const endGridY = (targetPos.y + 0.5) * currentCellSize;
            const angle = Math.atan2(endGridY - startGridY, endGridX - startGridX) * (180 / Math.PI);
            projectile.style.left = `${startGridX}px`;
            projectile.style.top = `${startGridY}px`;
            projectile.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            projectile.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
            if(projectileType === 'net') {
                 projectile.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out, transform ${duration}ms ease-in`;
                 projectile.style.transform = `translate(-50%, -50%) scale(0.5) rotate(0deg)`;
            }
            gridContent.appendChild(projectile);
            playSfx(shootSound);
            requestAnimationFrame(() => {
                projectile.style.left = `${endGridX}px`;
                projectile.style.top = `${endGridY}px`;
                 if(projectileType === 'net') {
                     projectile.style.transform = `translate(-50%, -50%) scale(1) rotate(360deg)`;
                 }
            });
            delay = duration;
            setTimeout(() => projectile.remove(), delay);
        } else if (!isRanged) { // Melee Animation
            const originalTransform = attackerElement.style.transform || 'translate(-50%, -50%)';
            const dx = targetPos.x - attacker.x;
            const dy = targetPos.y - attacker.y;
            const tapDistance = 0.2 * currentCellSize;
            const targetX = dx * tapDistance;
            const targetY = dy * tapDistance;
            const targetTransform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px))`;
            const animTime = MOVE_ANIMATION_DURATION_MS / 2.5;
            attackerElement.style.zIndex = attackZIndex;
            attackerElement.style.transition = `transform ${animTime}ms ease-out`;
            attackerElement.style.transform = targetTransform;
            playSfx('move'); // Sound for lunge
            delay = animTime;
            setTimeout(() => {
                if (attackerElement?.parentNode) {
                    attackerElement.style.transform = originalTransform;
                    setTimeout(() => {
                        if (attackerElement) attackerElement.style.zIndex = originalZIndex;
                    }, 60);
                }
            }, delay + 30);
        } else {
             // Non-projectile ranged attack (e.g., shaman heal, netter melee-only check)
             delay = 50; // Small delay for sound sync
        }
        resolve(delay);
    });
}

async function handleUnitDeathAnimation(unit, deathX, deathY, timeoutMap) { return new Promise((resolve) => { if (!unit?.element || !gridContent) { resolve(); return; } const el = unit.element; el.classList.add('dead'); el.style.pointerEvents = 'none'; el.style.backgroundImage = `url('${unit.deadSpriteUrl}')`; if (!unit.deadSpriteUrl) el.style.filter = 'grayscale(100%) brightness(50%)'; el.style.zIndex = '5'; el.style.opacity = '1'; el.style.transition = 'none'; el.style.setProperty('--unit-x', deathX + 1); el.style.setProperty('--unit-y', deathY + 1); const fadeTimeoutId = setTimeout(() => { el.classList.add('fading-out'); const removeTimeoutId = setTimeout(() => { el.remove(); timeoutMap.delete(unit.id + '-remove'); resolve(); }, DEATH_FADE_DURATION_MS); timeoutMap.set(unit.id + '-remove', removeTimeoutId); timeoutMap.delete(unit.id + '-fade'); }, DEATH_VISIBLE_DURATION_MS); timeoutMap.set(unit.id + '-fade', fadeTimeoutId); }); }
async function handleObstacleDestroyAnimation(obstacle) { return new Promise((resolve) => { if (!obstacle?.element || !gridContent) { resolve(); return; } const el = obstacle.element; el.classList.add('destroyed'); playSfx(obstacle.type === 'snowman' ? 'snowmanDestroy' : (obstacle.type === 'door' ? 'doorDestroy' : 'towerDestroy')); setTimeout(() => { el.remove(); resolve(); }, OBSTACLE_DESTROY_DURATION_MS); }); }
async function animateItemDrop(itemsToAnimate, targetX, targetY) { return Promise.all(itemsToAnimate.map((item, index) => { return new Promise(resolve => { if (!item) { resolve(); return; } if (!item.element) renderItem(item, gridContent); if (!item.element || !gridContent) { resolve(); return; } const el = item.element; const finalXCoord = (item.x + 0.5) * currentCellSize; const finalYCoord = (item.y + 0.5) * currentCellSize; el.style.left = `${finalXCoord}px`; el.style.top = `${finalYCoord}px`; el.style.setProperty('--stackIndex', item.stackIndex || 0); const startTransform = `translate(calc(-50% + var(--stackIndex, 0) * var(--stack-offset-x)), calc(-50% + var(--stackIndex, 0) * var(--stack-offset-y) - 20px)) scale(0.5)`; const endTransform = `translate(calc(-50% + var(--stackIndex, 0) * var(--stack-offset-x)), calc(-50% + var(--stackIndex, 0) * var(--stack-offset-y))) scale(1)`; el.style.opacity = '0'; el.style.transform = startTransform; const delay = index * 50; const duration = ITEM_DROP_ANIMATION_DURATION_MS; el.style.transition = `opacity 0.2s ease-out ${delay}ms, transform ${duration}ms cubic-bezier(0.68, -0.55, 0.27, 1.55) ${delay}ms`; requestAnimationFrame(() => { requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = endTransform; updateCellItemStatus(item.x, item.y); setTimeout(() => { resolve(); }, duration + delay); }); }); }); })); }
async function animateItemPickup(itemsToAnimate) { return Promise.all(itemsToAnimate.map(item => { return new Promise(resolve => { if (!item?.element || !gridContent) { resolve(); return; } item.element.classList.add('collected'); const duration = ITEM_PICKUP_ANIMATION_DURATION_MS; setTimeout(() => { item.element?.remove(); item.element = null; resolve(); }, duration); }); })); }
async function animateItemMagnetPull(item, targetUnit) { if (!item?.element || !targetUnit?.element || !gridContent) return; const itemElement = item.element; const targetX = (targetUnit.x + 0.5) * currentCellSize; const targetY = (targetUnit.y + 0.5) * currentCellSize; itemElement.style.setProperty('--target-x', `${targetX}px`); itemElement.style.setProperty('--target-y', `${targetY}px`); itemElement.classList.add('magnet-collecting'); setTimeout(() => { itemElement.remove(); item.element = null; updateCellItemStatus(item.x, item.y); }, ITEM_MAGNET_FLY_DURATION_MS); }
function removeVisualItems(itemsToRemove) { let lastX = -1, lastY = -1; itemsToRemove.forEach(item => { item.element?.remove(); item.element = null; if (lastX === -1) { lastX = item.x; lastY = item.y; } }); if (lastX !== -1) updateCellItemStatus(lastX, lastY); }
function updateVisualItemState(item) { if (!item?.element) return; if (item.type === 'chest' && item.opened) { item.element.classList.add('opened'); item.element.style.pointerEvents = 'none'; item.element.style.cursor = 'default'; } updateCellItemStatus(item.x, item.y); }

// --- Zoom & Pan Functions (Keep existing definitions) ---
function calculateMinZoomToFit() {
    if (!gameBoard || !gridContent) return 0.1;
    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;
    const currentGridCellSize = currentCellSize || 30; // Use default if not set
    if (boardWidth <= 0 || boardHeight <= 0 || currentGridCellSize <= 0 || currentGridCols <= 0 || currentGridRows <= 0) return 0.1;
    const gridWidth = currentGridCols * currentGridCellSize;
    const gridHeight = currentGridRows * currentGridCellSize;
    if (gridWidth <= 0 || gridHeight <= 0) return 0.1;

    const zoomToFitWidth = boardWidth / gridWidth;
    const zoomToFitHeight = boardHeight / gridHeight;
    const targetZoomFit = Math.min(zoomToFitWidth, zoomToFitHeight);

    // Ensure the minimum zoom still allows seeing the whole board if possible,
    // but don't go below the absolute MIN_ZOOM.
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoomFit));
}

function applyZoomAndPan() {
    if (!gridContent) return;
    clampPan(); // Ensure offsets are valid before applying
    const transformValue = `translate(${gridContentOffsetX}px, ${gridContentOffsetY}px) scale(${currentZoom})`;
    gridContent.style.transform = transformValue;
    // Apply the same transform to the HP bar overlay
    if (unitHpBarsOverlay) {
        unitHpBarsOverlay.style.transform = transformValue;
        unitHpBarsOverlay.style.transformOrigin = 'top left'; // Match grid content origin
    }
     updateDefaultViewButtonVisibility(); // Show/hide reset button based on view
}

function handleZoom(event) {
    event.preventDefault();
    if (!gameBoard || isAnyOverlayVisible()) return;

    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? -1 : 1; // -1 for zoom out, 1 for zoom in
    const oldZoom = currentZoom;
    const dynamicMinZoom = calculateMinZoomToFit(); // Recalculate min zoom based on current board size

    currentZoom = Math.max(dynamicMinZoom, Math.min(MAX_ZOOM, currentZoom + delta * zoomSpeed));

    if (currentZoom === oldZoom) return; // No change

    const rect = gameBoard.getBoundingClientRect();
    // Calculate mouse position relative to the game board
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    if (oldZoom <= 0) { // Avoid division by zero or negative zoom issues
        centerView(true); // Reset view if zoom was invalid
        return;
    }
    gridContentOffsetX = mouseX - (mouseX - gridContentOffsetX) * (currentZoom / oldZoom);
    gridContentOffsetY = mouseY - (mouseY - gridContentOffsetY) * (currentZoom / oldZoom);

    applyZoomAndPan();
}

function handlePinchStart(event) {
     if (event.touches.length === 2 && !isAnyOverlayVisible()) {
         event.preventDefault();
         isPanning = true; // Use panning flag for pinch as well
         const t1 = event.touches[0];
         const t2 = event.touches[1];
         pinchStartDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
         const rect = gameBoard.getBoundingClientRect();
         // Calculate center point relative to the board
         touchCenter.x = ((t1.clientX + t2.clientX) / 2) - rect.left;
         touchCenter.y = ((t1.clientY + t2.clientY) / 2) - rect.top;
         // Store starting pan offsets relative to the grid's current state
         gridStartPanX = gridContentOffsetX;
         gridStartPanY = gridContentOffsetY;
     }
 }

 function handlePinchMove(event) {
     if (event.touches.length === 2 && isPanning) {
         event.preventDefault();
         const t1 = event.touches[0];
         const t2 = event.touches[1];
         const currentDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

         if (pinchStartDistance <= 0) return; // Avoid division by zero

         const zoomFactor = currentDistance / pinchStartDistance;
         const oldZoom = currentZoom;
         const dynamicMinZoom = calculateMinZoomToFit(); // Ensure we don't zoom out too much

         currentZoom = Math.max(dynamicMinZoom, Math.min(MAX_ZOOM, oldZoom * zoomFactor));

         if (currentZoom !== oldZoom) {
             // Adjust offsets to keep the pinch center stationary
             gridContentOffsetX = touchCenter.x - (touchCenter.x - gridStartPanX) * (currentZoom / oldZoom);
             gridContentOffsetY = touchCenter.y - (touchCenter.y - gridStartPanY) * (currentZoom / oldZoom);
             applyZoomAndPan();
         }

         // Update for next move calculation
         pinchStartDistance = currentDistance;
         gridStartPanX = gridContentOffsetX; // Update start pan for next delta
         gridStartPanY = gridContentOffsetY;
         const rect = gameBoard.getBoundingClientRect();
         touchCenter.x = ((t1.clientX + t2.clientX) / 2) - rect.left; // Update center
         touchCenter.y = ((t1.clientY + t2.clientY) / 2) - rect.top;
     }
 }

 function handlePinchEnd(event) {
     // Reset panning/pinching state if fewer than 2 touches remain
     if (event.touches.length < 2) {
         isPanning = false;
         pinchStartDistance = 0;
     }
 }

function handlePanStart(event) {
    // Check for left mouse button, ignore if target is interactive, ignore if overlay visible
    if (event.button !== 0 || event.target.closest('.unit,.item,.obstacle,.ui-button,button,a,.spell-icon,#default-view-button') || isAnyOverlayVisible()) {
        isPanning = false; // Ensure panning state is correct
        return;
    }
    event.preventDefault();
    isPanning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    gridStartPanX = gridContentOffsetX;
    gridStartPanY = gridContentOffsetY;
    gameBoard.classList.add('panning'); // For grab cursor style
    // Use capture phase for move/up listeners on document to catch events outside the board
    document.addEventListener('mousemove', handlePanMove, { passive: false, capture: true });
    document.addEventListener('mouseup', handlePanEnd, { once: true, capture: true });
}

function handlePanMove(event) {
    if (!isPanning || !gameBoard) return;
    event.preventDefault(); // Prevent text selection etc. during drag
    gridContentOffsetX = gridStartPanX + (event.clientX - panStartX);
    gridContentOffsetY = gridStartPanY + (event.clientY - panStartY);
    applyZoomAndPan(); // Apply clamped offsets and scale
}

function handlePanEnd(event) {
    if (!isPanning) return;
    event.preventDefault();
    isPanning = false;
    gameBoard.classList.remove('panning');
    document.removeEventListener('mousemove', handlePanMove, { capture: true });
    document.removeEventListener('mouseup', handlePanEnd, { capture: true }); // Ensure listener is removed
}

function handlePanStartTouch(event) {
     // Only start pan if exactly one touch and not on an interactive element
     if (event.touches.length !== 1 || event.target.closest('.unit,.item,.obstacle,.ui-button,button,a,.spell-icon,#default-view-button') || isAnyOverlayVisible()) {
         isPanning = false; // Ensure panning state is correct if touches change
         return;
     }
     const touch = event.touches[0];
     // Don't preventDefault here initially to allow potential scrolling if needed?
     // We'll preventDefault in move if panning actually starts.
     isPanning = true; // Assume panning might start
     panStartX = touch.clientX;
     panStartY = touch.clientY;
     gridStartPanX = gridContentOffsetX;
     gridStartPanY = gridContentOffsetY;
     // Add move/end listeners to the document
     document.addEventListener('touchmove', handlePanMoveTouch, { passive: false, capture: true });
     document.addEventListener('touchend', handlePanEndTouch, { once: true, capture: true });
     document.addEventListener('touchcancel', handlePanEndTouch, { once: true, capture: true });
 }

 function handlePanMoveTouch(event) {
     if (!isPanning || event.touches.length !== 1) {
          // If touches changed or not panning, stop the pan attempt
          handlePanEndTouch(event); // Clean up listeners
          return;
     }
     event.preventDefault(); // Prevent scrolling ONLY if actually panning
     gameBoard.classList.add('panning'); // Add grabbing cursor visual now
     const touch = event.touches[0];
     gridContentOffsetX = gridStartPanX + (touch.clientX - panStartX);
     gridContentOffsetY = gridStartPanY + (touch.clientY - panStartY);
     applyZoomAndPan();
 }

 function handlePanEndTouch(event) {
     // Check the flag, not just event type, as touchend can happen after touchcancel etc.
     if (!isPanning) return;
     isPanning = false;
     gameBoard.classList.remove('panning');
     document.removeEventListener('touchmove', handlePanMoveTouch, { capture: true });
     document.removeEventListener('touchend', handlePanEndTouch, { capture: true });
     document.removeEventListener('touchcancel', handlePanEndTouch, { capture: true });
 }


function clampPan() {
    if (!gameBoard || !gridContent || currentZoom <= 0) return;

    const boardRect = gameBoard.getBoundingClientRect();
    const gridRenderedWidth = gridContent.offsetWidth * currentZoom;
    const gridRenderedHeight = gridContent.offsetHeight * currentZoom;

    let minOffsetX, maxOffsetX, minOffsetY, maxOffsetY;
    const padding = 5; // Small padding around the edges

    // Calculate min/max offsets based on whether grid is smaller or larger than board
    if (gridRenderedWidth < boardRect.width) {
        // Center horizontally if grid is narrower than board
        minOffsetX = maxOffsetX = (boardRect.width - gridRenderedWidth) / 2;
    } else {
        // Allow panning within bounds if grid is wider
        minOffsetX = boardRect.width - gridRenderedWidth - padding;
        maxOffsetX = padding;
    }

    if (gridRenderedHeight < boardRect.height) {
        // Center vertically if grid is shorter than board
        minOffsetY = maxOffsetY = (boardRect.height - gridRenderedHeight) / 2;
    } else {
        // Allow panning within bounds if grid is taller
        minOffsetY = boardRect.height - gridRenderedHeight - padding;
        maxOffsetY = padding;
    }

    // Apply clamping
    gridContentOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, gridContentOffsetX));
    gridContentOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, gridContentOffsetY));
}

function isDefaultView() {
    if (!gameBoard || !gridContent) return false;

    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;
    if (boardWidth <= 0 || boardHeight <= 0 || currentCellSize <= 0 || currentGridCols <= 0 || currentGridRows <= 0) return false; // Invalid dimensions

    const defaultZoom = calculateMinZoomToFit(); // The zoom level that fits the board
    const gridWidth = currentGridCols * currentCellSize;
    const gridHeight = currentGridRows * currentCellSize;
    if (gridWidth <= 0 || gridHeight <= 0) return false;

    // Calculate the offset needed to center the grid at the default zoom
    const defaultOffsetX = (boardWidth - gridWidth * defaultZoom) / 2;
    const defaultOffsetY = (boardHeight - gridHeight * defaultZoom) / 2;

    // Check if current zoom and offsets are very close to default values
    const zoomThreshold = 0.01;
    const offsetThreshold = 2; // Pixels

    const isZoomDefault = Math.abs(currentZoom - defaultZoom) < zoomThreshold;
    const isOffsetXDefault = Math.abs(gridContentOffsetX - defaultOffsetX) < offsetThreshold;
    const isOffsetYDefault = Math.abs(gridContentOffsetY - defaultOffsetY) < offsetThreshold;

    return isZoomDefault && isOffsetXDefault && isOffsetYDefault;
}

function updateDefaultViewButtonVisibility() {
    if (defaultViewButton) {
        defaultViewButton.classList.toggle('hidden', isDefaultView());
    }
}

function centerView(immediate = false) {
    if (!gameBoard || !gridContent) return;
    calculateCellSize(); // Ensure cell size is up-to-date

    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;
    if (boardWidth <= 0 || boardHeight <= 0 || currentCellSize <= 0) return;

    const gridWidth = currentGridCols * currentCellSize;
    const gridHeight = currentGridRows * currentCellSize;
    if (gridWidth <= 0 || gridHeight <= 0) return;

    const targetZoom = calculateMinZoomToFit(); // Calculate the zoom to fit everything
    const targetOffsetX = (boardWidth - (gridWidth * targetZoom)) / 2; // Center horizontally
    const targetOffsetY = (boardHeight - (gridHeight * targetZoom)) / 2; // Center vertically

    currentZoom = targetZoom; // Set the new zoom level

    if (immediate) {
        // Apply immediately without transition
        const originalTransition = gridContent.style.transition;
        gridContent.style.transition = 'none';
        if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = 'none';

        gridContentOffsetX = targetOffsetX;
        gridContentOffsetY = targetOffsetY;
        applyZoomAndPan(); // Apply the transform

        // Restore transition after applying
        requestAnimationFrame(() => {
            if (gridContent) gridContent.style.transition = originalTransition;
            if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = originalTransition;
        });
    } else {
        // Apply with transition
        const transitionStyle = 'transform 0.3s ease-out';
        gridContent.style.transition = transitionStyle;
        if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = transitionStyle;

        gridContentOffsetX = targetOffsetX;
        gridContentOffsetY = targetOffsetY;
        applyZoomAndPan();

        // Remove transition after animation finishes
        setTimeout(() => {
            if (gridContent) gridContent.style.transition = '';
            if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = '';
        }, 300);
    }
}

// --- Map Zoom & Pan Functions ---
function applyMapZoomAndPan(immediate = false) {
    if (!levelSelectMap || !levelSelectMapContainer || !levelSelectDotsLayer) return;
    const containerRect = levelSelectMapContainer.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const baseScale = calculateMapScale(containerRect.width, containerRect.height, mapIntrinsicWidth, mapIntrinsicHeight);
    const currentMapZoom = (typeof mapZoom === 'number' && !isNaN(mapZoom) && mapZoom >= MIN_MAP_ZOOM) ? Math.min(MAX_MAP_ZOOM, mapZoom) : MIN_MAP_ZOOM;
    const finalScale = baseScale * currentMapZoom;

    let currentMapOffsetX = typeof mapOffsetX === 'number' && !isNaN(mapOffsetX) ? mapOffsetX : 0;
    let currentMapOffsetY = typeof mapOffsetY === 'number' && !isNaN(mapOffsetY) ? mapOffsetY : 0;

    const clampedOffsets = clampMapOffsets(currentMapOffsetX, currentMapOffsetY);
    currentMapOffsetX = clampedOffsets.x;
    currentMapOffsetY = clampedOffsets.y;
    mapOffsetX = currentMapOffsetX; // Update global state
    mapOffsetY = currentMapOffsetY; // Update global state

    const transformValue = `translate(${currentMapOffsetX}px, ${currentMapOffsetY}px) scale(${finalScale})`;
    const transitionStyle = immediate ? 'none' : 'transform 0.3s ease-out';

    levelSelectMap.style.transformOrigin = 'top left';
    levelSelectDotsLayer.style.transformOrigin = 'top left';
    levelSelectMap.style.transition = transitionStyle;
    levelSelectDotsLayer.style.transition = transitionStyle;
    levelSelectMap.style.transform = transformValue;
    levelSelectDotsLayer.style.transform = transformValue;

    positionLevelDots(); // Reposition dots after transform changes

    // Clear transition after animation
    if (!immediate) {
        const clearTransition = (event) => {
            if ((event.target === levelSelectMap || event.target === levelSelectDotsLayer) && event.propertyName === 'transform') {
                if (levelSelectMap) levelSelectMap.style.transition = '';
                if (levelSelectDotsLayer) levelSelectDotsLayer.style.transition = '';
                event.target.removeEventListener('transitionend', clearTransition);
            }
        };
        levelSelectMap.addEventListener('transitionend', clearTransition);
        levelSelectDotsLayer.addEventListener('transitionend', clearTransition);
        // Fallback timeout to ensure transition is cleared
        setTimeout(() => {
            if (levelSelectMap && levelSelectMap.style.transition !== 'none') levelSelectMap.style.transition = '';
            if (levelSelectDotsLayer && levelSelectDotsLayer.style.transition !== 'none') levelSelectDotsLayer.style.transition = '';
            levelSelectMap?.removeEventListener('transitionend', clearTransition);
            levelSelectDotsLayer?.removeEventListener('transitionend', clearTransition);
        }, 350);
    }
}

function handleMapPanStart(event) {
    const clickedDot = event.target.closest('.level-dot');
    const clickedButton = event.target.closest('button, .primary-button, .secondary-button, .pagination-button');
    const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen();

    // Ignore pan start on left click if target is interactive or another overlay is up
    if (event.button !== 0 || clickedDot || clickedButton || anotherOverlayActive) {
        isMapPanning = false;
        if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab'; // Ensure correct cursor
        return;
    }
    event.preventDefault();
    isMapPanning = true;
    mapPanStartX = event.clientX;
    mapPanStartY = event.clientY;
    mapStartPanX = mapOffsetX;
    mapStartPanY = mapOffsetY;
    if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleMapPanMove, { passive: false, capture: true });
    document.addEventListener('mouseup', handleMapPanEnd, { once: true, capture: true });
}

function handleMapPanMove(event) {
    if (!isMapPanning || !levelSelectMap || !levelSelectMapContainer) return;
    event.preventDefault(); // Prevent text selection during drag
    const deltaX = event.clientX - mapPanStartX;
    const deltaY = event.clientY - mapPanStartY;
    const rawOffsetX = mapStartPanX + deltaX;
    const rawOffsetY = mapStartPanY + deltaY;

    const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY);
    mapOffsetX = clampedOffsets.x;
    mapOffsetY = clampedOffsets.y;

    applyMapZoomAndPan(true); // Apply immediately during drag
}

function calculateMapScale(containerWidth, containerHeight, intrinsicWidth, intrinsicHeight) {
    const safeMapWidth = Math.max(1, intrinsicWidth || 1024);
    const safeMapHeight = Math.max(1, intrinsicHeight || 1024);
    const scaleX = containerWidth / safeMapWidth;
    const scaleY = containerHeight / safeMapHeight;
    // Use 'contain' scaling logic
    return Math.min(scaleX, scaleY);
}

function clampMapOffsets(rawOffsetX, rawOffsetY) {
    if (!levelSelectMapContainer || !levelSelectMap) return { x: 0, y: 0 };
    const containerRect = levelSelectMapContainer.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return { x: mapOffsetX || 0, y: mapOffsetY || 0 };

    const safeMapWidth = Math.max(1, mapIntrinsicWidth || 1024);
    const safeMapHeight = Math.max(1, mapIntrinsicHeight || 1024);
    const baseScale = calculateMapScale(containerRect.width, containerRect.height, safeMapWidth, safeMapHeight);
    const currentMapZoom = (typeof mapZoom === 'number' && !isNaN(mapZoom) && mapZoom >= MIN_MAP_ZOOM) ? Math.min(MAX_MAP_ZOOM, mapZoom) : MIN_MAP_ZOOM;
    const finalScale = baseScale * currentMapZoom;

    if (finalScale <= 0 || isNaN(finalScale)) return { x: mapOffsetX || 0, y: mapOffsetY || 0 };

    const mapRenderWidth = safeMapWidth * finalScale;
    const mapRenderHeight = safeMapHeight * finalScale;
    let minOffsetX = 0, maxOffsetX = 0, minOffsetY = 0, maxOffsetY = 0;
    const padding = 5; // Small edge padding

    // Calculate clamping bounds
    if (mapRenderWidth < containerRect.width) {
        minOffsetX = maxOffsetX = (containerRect.width - mapRenderWidth) / 2; // Center horizontally
    } else {
        maxOffsetX = padding;
        minOffsetX = containerRect.width - mapRenderWidth - padding;
    }
    if (mapRenderHeight < containerRect.height) {
        minOffsetY = maxOffsetY = (containerRect.height - mapRenderHeight) / 2; // Center vertically
    } else {
        maxOffsetY = padding;
        minOffsetY = containerRect.height - mapRenderHeight - padding;
    }

    const clampedX = Math.max(minOffsetX, Math.min(maxOffsetX, rawOffsetX));
    const clampedY = Math.max(minOffsetY, Math.min(maxOffsetY, rawOffsetY));

    return { x: clampedX, y: clampedY };
}

function handleMapPanEnd(event) {
    if (!isMapPanning) return;
    event.preventDefault();
    isMapPanning = false;
    if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab';
    document.removeEventListener('mousemove', handleMapPanMove, { capture: true });
    document.removeEventListener('mouseup', handleMapPanEnd, { capture: true });
    // Also remove touch listeners just in case state got mixed up
    document.removeEventListener('touchmove', handleMapPanMoveTouch, { capture: true });
    document.removeEventListener('touchend', handleMapPanEndTouch, { capture: true });
    document.removeEventListener('touchcancel', handleMapPanEndTouch, { capture: true });
}

function handleMapPanStartTouch(event) {
    const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen();
    if (isMapPanning || anotherOverlayActive) return;

    const touchTarget = event.target;
    const clickedDot = touchTarget.closest('.level-dot');
    const clickedButton = touchTarget.closest('button, .primary-button, .secondary-button, .pagination-button');

    // Ignore if touch starts on interactive element
    if (clickedDot || clickedButton) return;

    // Allow default touch behavior (like scrolling map container if it overflows) unless we are sure we want to pan
    // Only preventDefault in touchmove if we detect significant movement
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        isMapPanning = true; // Tentatively start panning
        mapPanStartX = touch.clientX;
        mapPanStartY = touch.clientY;
        mapStartPanX = mapOffsetX;
        mapStartPanY = mapOffsetY;
        // Don't set cursor for touch
        document.addEventListener('touchmove', handleMapPanMoveTouch, { passive: false, capture: true });
        document.addEventListener('touchend', handleMapPanEndTouch, { once: true, capture: true });
        document.addEventListener('touchcancel', handleMapPanEndTouch, { once: true, capture: true });
    }
}

function handleMapPanMoveTouch(event) {
    if (!isMapPanning || event.touches.length !== 1) {
         handleMapPanEndTouch(event); // Stop panning if touch count changes
        return;
    }
    event.preventDefault(); // Prevent scrolling page ONLY when panning the map
    if (levelSelectMapContainer) levelSelectMapContainer.classList.add('panning'); // Add visual cue

    const touch = event.touches[0];
    const deltaX = touch.clientX - mapPanStartX;
    const deltaY = touch.clientY - mapPanStartY;
    const rawOffsetX = mapStartPanX + deltaX;
    const rawOffsetY = mapStartPanY + deltaY;

    const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY);
    mapOffsetX = clampedOffsets.x;
    mapOffsetY = clampedOffsets.y;
    applyMapZoomAndPan(true); // Apply immediately
}

function handleMapPanEndTouch(event) {
    if (!isMapPanning) return;
    isMapPanning = false;
    if (levelSelectMapContainer) levelSelectMapContainer.classList.remove('panning');
    document.removeEventListener('touchmove', handleMapPanMoveTouch, { capture: true });
    document.removeEventListener('touchend', handleMapPanEndTouch, { capture: true });
    document.removeEventListener('touchcancel', handleMapPanEndTouch, { capture: true });
}

function focusMapOnQuadrant(immediate = true) {
    if (!levelSelectMapContainer || !levelSelectMap) return;

    const currentHighestLevel = parseInt(highestLevelReached || '1', 10);
    const levelIndex = Math.max(0, currentHighestLevel - 1);
    const baseLevelIndex = levelIndex % TOTAL_LEVELS_BASE;
    const quadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS;
    const isMobileView = window.matchMedia("(max-width: 700px)").matches;
    const activeQuadrantCenters = isMobileView ? MOBILE_VISUAL_QUADRANT_CENTERS : VISUAL_QUADRANT_CENTERS;
    const targetCenter = activeQuadrantCenters[quadrantIndex] || { x: 50, y: 50 }; // Default center
    const targetXPercent = targetCenter.x;
    const targetYPercent = targetCenter.y;

    let targetZoom = isMobileView ? MOBILE_INITIAL_MAP_ZOOM_LEVEL : INITIAL_MAP_ZOOM_LEVEL;
    targetZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, targetZoom));

    const containerRect = levelSelectMapContainer.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    const safeMapWidth = Math.max(1, mapIntrinsicWidth || 1024);
    const safeMapHeight = Math.max(1, mapIntrinsicHeight || 1024);

    const baseScale = calculateMapScale(containerRect.width, containerRect.height, safeMapWidth, safeMapHeight);
    const finalScale = baseScale * targetZoom;

    if (finalScale <= 0 || isNaN(finalScale)) return; // Invalid scale

    // Calculate the world coordinates of the target center point
    const targetWorldX = (targetXPercent / 100) * safeMapWidth;
    const targetWorldY = (targetYPercent / 100) * safeMapHeight;

    // Calculate the offset needed to place the target center at the container center
    let initialOffsetX = containerRect.width / 2 - targetWorldX * finalScale;
    let initialOffsetY = containerRect.height / 2 - targetWorldY * finalScale;

    // Clamp the calculated offsets
    const clampedOffsets = clampMapOffsets(initialOffsetX, initialOffsetY);

    // Apply the clamped offsets and the target zoom
    mapZoom = targetZoom;
    mapOffsetX = clampedOffsets.x;
    mapOffsetY = clampedOffsets.y;
    applyMapZoomAndPan(immediate);
}

// --- Event Handling ---
async function handleCellClick(event) {
    if (isPanning || event.target.closest('.unit,.item,.obstacle') || isProcessing || !isGameActive() || isAnyOverlayVisible()) return;
    const cell = event.currentTarget;
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    if (!isCellInBounds(x, y)) return;

    const obstacle = getObstacleAt(x, y);
    const unitOnCell = getUnitAt(x,y); // Check if a unit is on the cell

    // Prevent targeting indestructible obstacles or occupied enterable obstacles
    if (obstacle && !obstacle.enterable && !obstacle.destructible) {
        playSfx('error');
        showFeedback("Cannot target cell.", "feedback-error");
        if (currentSpell) setActiveSpell(null);
        if (selectedUnit) deselectUnit();
        return;
    }
     if (unitOnCell && currentTurn === 'player' && !selectedUnit) {
         handleUnitClick(event, unitOnCell); // Treat click on unit's cell as clicking the unit if none selected
         return;
     }
     if (obstacle?.enterable && obstacle.occupantUnitId) {
         const unitInside = units.find(u => u.id === obstacle.occupantUnitId);
         if (unitInside?.team === 'player') {
             // Allow selecting own unit inside tower? Maybe not needed if handled by unit click.
              playSfx('error'); // Prevent interaction if occupied by enemy
         } else {
             playSfx('error');
         }
         showFeedback("Tower is occupied.", "feedback-error");
         if (currentSpell) setActiveSpell(null);
         if (selectedUnit) deselectUnit();
         return;
     }


    if (currentSpell) {
        let targetForSpell = null;
        let originElement = null; // Only needed for Fireball currently

        if (currentSpell === 'frostNova' || currentSpell === 'flameWave') {
            targetForSpell = { x, y };
        } else if (currentSpell === 'fireball') {
             // Allow targeting attackable obstacles (like doors) or enemy units
             if (obstacle?.canBeAttacked) {
                 targetForSpell = obstacle;
                 originElement = fireballElement;
             } else if (unitOnCell?.team === 'enemy' && isUnitAliveAndValid(unitOnCell)) {
                 targetForSpell = unitOnCell;
                 originElement = fireballElement;
             } else {
                 playSfx('error'); showFeedback("Select a valid target for Fireball.", "feedback-error"); setActiveSpell(null); return;
             }
        } else if (currentSpell === 'heal') {
             // Heal requires clicking directly on a player unit, handled in handleUnitClick
             playSfx('error'); showFeedback("Select a friendly unit to Heal.", "feedback-error"); setActiveSpell(null); return;
         } else {
             playSfx('error'); showFeedback("Select a valid target.", "feedback-error"); setActiveSpell(null); return;
         }

        if (targetForSpell) {
             await castSpell(currentSpell, targetForSpell, originElement);
         }
        return; // Exit after spell attempt
    }

    if (currentTurn === 'player' && selectedUnit) {
        const isMoveValid = getValidMoves(selectedUnit).some(p => p.x === x && p.y === y);
        if (isMoveValid) {
            const unitToMove = selectedUnit;
            deselectUnit(false);
            await moveUnit(unitToMove, x, y);
        } else {
            // If click is not a valid move, deselect the unit
            deselectUnit();
        }
    } else if (selectedUnit) {
        // If a unit is selected but it's not the player's turn (shouldn't happen often)
        deselectUnit();
    }
}


async function handleUnitClick(event, clickedUnit) {
    event.stopPropagation();
    if (isPanning || !isGameActive() || isProcessing || !clickedUnit || !isUnitAliveAndValid(clickedUnit) || isAnyOverlayVisible()) {
        if (!isUnitAliveAndValid(clickedUnit)) { // Handle clicking dead unit
            if (selectedUnit) deselectUnit();
            updateUnitInfo(null);
        }
        return;
    }

    // Mobile: Show tooltip first
    if (isMobileDevice()) {
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        showTooltip(clickedUnit, 'unit');
        tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS);
    } else {
         updateUnitInfo(clickedUnit); // Update immediately on desktop
    }


    if (currentSpell) {
        let castSuccess = false;
        let originElementForSpell = null; // For spells like fireball originating from UI
        if (currentSpell === 'fireball') originElementForSpell = fireballElement;
        else if (currentSpell === 'heal') originElementForSpell = healElement;

        // Validate target based on spell
        let isValidSpellTarget = false;
        if (currentSpell === 'fireball' && clickedUnit.team === 'enemy') isValidSpellTarget = true;
        if (currentSpell === 'heal' && clickedUnit.team === 'player') isValidSpellTarget = true;
        // Frost Nova and Flame Wave target cells, not units directly via click

        if (isValidSpellTarget) {
            castSuccess = await castSpell(currentSpell, clickedUnit, originElementForSpell);
        } else {
            playSfx('error');
            showFeedback("Invalid target for spell.", "feedback-error");
            setActiveSpell(null); // Cancel spell if target is invalid
        }
        return; // Exit after spell attempt
    }

    if (currentTurn === 'player') {
        if (selectedUnit) {
            // Clicking an enemy unit while a player unit is selected = Attack
            if (clickedUnit.team === 'enemy' && !levelClearedAwaitingInput) {
                let targetObjectForAttack = clickedUnit;
                // Check if target is in a tower
                if (clickedUnit.inTower) {
                    const tower = obstacles.find(o => o.id === clickedUnit.inTower);
                    if (tower && isObstacleIntact(tower)) {
                        targetObjectForAttack = tower; // Target the tower instead
                    } else {
                        playSfx('error'); showFeedback("Cannot target unit in destroyed tower.", "feedback-error"); deselectUnit(); return;
                    }
                }

                const attackTargets = getValidAttackTargets(selectedUnit);
                const targetIsUnit = !!targetObjectForAttack.team; // Is the final target a unit or the tower?
                const canAttack = targetIsUnit
                    ? attackTargets.units.includes(targetObjectForAttack.id)
                    : attackTargets.obstacles.includes(targetObjectForAttack.id);

                if (canAttack) {
                    const attacker = selectedUnit;
                    // Attack action implicitly deselects
                    await attack(attacker, targetObjectForAttack.x, targetObjectForAttack.y);
                } else {
                    playSfx('error');
                    showFeedback("Cannot attack target.", "feedback-error");
                    deselectUnit(); // Deselect if attack is invalid
                }
            }
            // Clicking a friendly unit while another is selected
            else if (clickedUnit.team === 'player') {
                if (clickedUnit.id === selectedUnit.id) {
                    // Clicked the already selected unit - maybe trigger special ability? (e.g., Rogue stealth)
                    if (clickedUnit.type === 'rogue' && clickedUnit.canStealth) {
                         activateRogueStealth(clickedUnit); // Function to be added in gameLogic
                         deselectUnit(false); // Deselect after ability use
                    } else {
                         deselectUnit(); // Default: deselect
                    }
                } else {
                    selectUnit(clickedUnit); // Select the new unit
                }
            } else {
                // Clicked something else (like dead unit?)
                deselectUnit();
            }
        }
        // No unit selected, clicking a player unit
        else if (clickedUnit.team === 'player') {
            selectUnit(clickedUnit);
        }
    }
     // Clicking enemy unit when it's not player turn does nothing except update info panel
     else if(currentTurn !== 'player'){
         updateUnitInfo(clickedUnit);
     }
}


async function handleItemClick(event, clickedItem) {
    event.stopPropagation();
    if (isPanning || isProcessing || !isGameActive() || !clickedItem || clickedItem.collected || isAnyOverlayVisible()) return;

    if (isMobileDevice()) {
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        showTooltip(clickedItem, 'item');
        tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS);
    }


    if (currentTurn === 'player' && selectedUnit) {
        const x = clickedItem.x;
        const y = clickedItem.y;
        const isMoveValid = getValidMoves(selectedUnit).some(p => p.x === x && p.y === y);
        const isChest = clickedItem.type === 'chest';

        if (isMoveValid && (!isChest || !clickedItem.opened)) {
            const unitToMove = selectedUnit;
            deselectUnit(false);
            await moveUnit(unitToMove, x, y); // moveUnit handles pickup
        } else {
            // If move is invalid, just deselect
            deselectUnit();
        }
    } else if (selectedUnit) {
        // If a unit is selected but it's not player turn
        deselectUnit();
    }
     // If no unit selected, clicking item does nothing yet (could change later)
}

async function handleObstacleClick(event, clickedObstacle) {
    event.stopPropagation();
    if (isPanning || isProcessing || !isGameActive() || !clickedObstacle || !isObstacleIntact(clickedObstacle) || isAnyOverlayVisible()) return;

    const targetX = clickedObstacle.x;
    const targetY = clickedObstacle.y;

     if (isMobileDevice()) {
        if (tooltipTimeout) clearTimeout(tooltipTimeout);
        showTooltip(clickedObstacle, 'obstacle');
        tooltipTimeout = setTimeout(hideTooltip, MOBILE_TOOLTIP_DURATION_MS);
    }

    if (!levelClearedAwaitingInput && currentSpell) {
        let castSuccess = false;
        let originEl = null;
        if (currentSpell === 'fireball') originEl = fireballElement;

        // Only allow fireball to target attackable obstacles
        if (currentSpell === 'fireball' && clickedObstacle.canBeAttacked) {
             castSuccess = await castSpell(currentSpell, clickedObstacle, originEl);
        }

        if (!castSuccess && currentSpell) {
            playSfx('error');
            showFeedback("Cannot target obstacle with this spell.", "feedback-error");
             setActiveSpell(null); // Cancel spell
        }
        return; // Exit after spell attempt
    }


    if (currentTurn === 'player' && selectedUnit) {
        const attackTargets = getValidAttackTargets(selectedUnit);
        const isAttackable = attackTargets.obstacles.includes(clickedObstacle.id) && clickedObstacle.canBeAttacked; // Check if attackable specifically

        if (isAttackable) {
            const attacker = selectedUnit;
             // Attack action deselects implicitly
            await attack(attacker, targetX, targetY);
            return; // Exit after attack attempt
        } else if (clickedObstacle.type === 'snowman' && !clickedObstacle.revealed && clickedObstacle.clickable && getDistance(selectedUnit, clickedObstacle) <= selectedUnit.currentRange) {
             // Allow ranged units to "attack" snowman to reveal
              const attacker = selectedUnit;
               // Attack action deselects implicitly
              await attack(attacker, targetX, targetY); // Treat it like a normal attack
              return;
        } else if (clickedObstacle.enterable && !clickedObstacle.occupantUnitId && !selectedUnit.inTower && !selectedUnit.acted && !selectedUnit.isFrozen && !selectedUnit.isNetted) {
            // Handle Tower Entry Logic
            const entryX = targetX;
            const entryY = targetY + 1;
            if (isCellInBounds(entryX, entryY)) {
                const obstacleAtEntry = getObstacleAt(entryX, entryY);
                if (obstacleAtEntry?.blocksMove) {
                    playSfx('error'); showFeedback("Path blocked.", "feedback-error"); deselectUnit(); return;
                }
                const path = findPathToTarget(selectedUnit, entryX, entryY);
                const availableMov = selectedUnit.mov - (selectedUnit.isSlowed ? 1 : 0);
                if (path !== null && path.length <= availableMov) {
                    const unitToEnter = selectedUnit;
                    deselectUnit(false);
                    isProcessing = true; // Use standard processing flag
                    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
                    try {
                        await initiateTowerEntrySequence(unitToEnter, clickedObstacle, path);
                    } catch (e) {
                        console.error("Tower entry sequence error:", e); playSfx('error'); isProcessing = false; if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
                    }
                    return; // Exit after tower entry attempt
                } else {
                    playSfx('error'); showFeedback("Cannot reach.", "feedback-error"); deselectUnit(); return;
                }
            } else {
                playSfx('error'); showFeedback("Invalid entry.", "feedback-error"); deselectUnit(); return;
            }
        } else {
            playSfx('error');
            if (clickedObstacle.destructible && !isAttackable) showFeedback("Out of range/sight or not attackable.", "feedback-error");
            else if(clickedObstacle.type === 'snowman' && !clickedObstacle.revealed) showFeedback("Get closer or shoot it!", "feedback-error");
            else showFeedback("Cannot interact.", "feedback-error");
            deselectUnit(); return;
        }
    } else if (selectedUnit) {
        // If unit is selected but not player turn
        deselectUnit();
    }
     // If no unit selected, clicking obstacle might show tooltip (handled by hover)
}


function handleUnitMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; } function handleUnitMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleItemMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; } function handleItemMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleObstacleMouseEnter(event) { if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget; } function handleObstacleMouseLeave(event) { if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null; }
function handleCellMouseEnter(event) { if (isMobileDevice() || !isGameActive() || isProcessing || isPanning || !gameBoard || isAnyOverlayVisible()) return; const cell = event.currentTarget; const x = parseInt(cell.dataset.x); const y = parseInt(cell.dataset.y); const unitOnCell = getUnitAt(x, y); const obstacleOnCell = getObstacleAt(x, y); clearSpellHighlights(); if (currentSpell === 'frostNova') highlightFrostNovaArea(x, y); else if (currentSpell === 'flameWave') highlightFlameWaveArea(y); else if (currentSpell === 'fireball') { if ((unitOnCell?.team === 'enemy' && isUnitAliveAndValid(unitOnCell)) || (obstacleOnCell?.canBeAttacked && isObstacleIntact(obstacleOnCell))) { /* Allow targeting doors */ cell.classList.add('valid-fireball-target'); if (unitOnCell?.element) unitOnCell.element.classList.add('valid-fireball-target'); if (obstacleOnCell?.element) obstacleOnCell.element.classList.add('valid-fireball-target'); } } else if (currentSpell === 'heal') { if (unitOnCell?.team === 'player' && isUnitAliveAndValid(unitOnCell)) { cell.classList.add('valid-heal-target'); if (unitOnCell.element) unitOnCell.element.classList.add('valid-heal-target'); } } const canBePrimaryTarget = cell.classList.contains('can-be-primary-target'); if (selectedUnit?.type === 'champion' && canBePrimaryTarget && !currentSpell) { let targetPos = unitOnCell || obstacleOnCell; if (targetPos) showAttackHoverHighlights(selectedUnit, targetPos); else clearAttackHoverHighlights(); } else if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }
function handleCellMouseLeave(event) { if (isMobileDevice() || !isGameActive() || isProcessing || isPanning || isAnyOverlayVisible()) return; if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }
function handleGridMouseLeave() { clearSpellHighlights(); if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }

function handleKeyDown(event) { if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return; const overlayVisible = isAnyOverlayVisible(); const gameRunning = isGameActive(); const gameActiveAndNoOverlay = gameRunning && !overlayVisible; if (event.key.toLowerCase() === 'm' && isSettingsOpen()) { // Only allow M in settings now
    muteToggleSetting.checked = !muteToggleSetting.checked; toggleMute(); event.preventDefault(); return; } if (event.key === 'F4') { toggleFullscreen(); event.preventDefault(); return; } if (event.key.toLowerCase() === 'z' && isSettingsOpen()) { // Only allow Z in settings now
    toggleHpBarsSetting.checked = !toggleHpBarsSetting.checked; toggleWorldHpBarsVisibility(); event.preventDefault(); return; } if (event.key === 'Home' && gameActiveAndNoOverlay) { centerView(false); event.preventDefault(); return; } if (event.key === 'Escape') { if (isShopOpen()) { hideShop(); proceedAfterShopMaybe(); event.preventDefault(); return; } if (isLevelCompleteOpen()) { hideLevelComplete(); proceedToNextLevelOrLocation(); event.preventDefault(); return; } if (isMenuOpen()) { hideMenu(); event.preventDefault(); return; } if (isLeaderboardOpen()) { hideLeaderboard(); showMainMenu(); event.preventDefault(); return; } if (isChooseTroopsScreenOpen()) { handleTroopsBack(); event.preventDefault(); return; } if (isLevelSelectOpen()) { showMainMenu(); event.preventDefault(); return; } if (isGameOverScreenVisible()) { showMainMenu(); event.preventDefault(); return; } if (isSettingsOpen()) { hideSettings(); /* Go back to where settings was opened from */ if(menuOverlay?.classList.contains('visible')) {/* Stay in menu */} else { showMainMenu();} event.preventDefault(); return; } if (isAchievementsOpen()) { hideAchievements(); showMainMenu(); event.preventDefault(); return; } if (gameActiveAndNoOverlay) { if (currentSpell) setActiveSpell(null); else if (selectedUnit) deselectUnit(); else showMenu(); event.preventDefault(); } return; } if (isLevelSelectOpen() && event.key.toLowerCase() === 'e') { if (typeof highestLevelReached !== 'undefined' && highestLevelReached > 0) { playSfx('levelSelect'); hideLevelSelect(); initGame(highestLevelReached); event.preventDefault(); } else playSfx('error'); return; } if (isLevelCompleteOpen() && event.key.toLowerCase() === 'e') { nextLevelButton?.click(); event.preventDefault(); return; } if (isLevelCompleteOpen() && event.key.toLowerCase() === 's') { levelCompleteShopButton?.click(); event.preventDefault(); return; } if (isShopOpen() && event.key.toLowerCase() === 'e') { shopExitButton?.click(); event.preventDefault(); return; } if (isLevelSelectOpen() && event.key.toLowerCase() === 's') { levelSelectShopButton?.click(); event.preventDefault(); return; } if (overlayVisible || isProcessing || (event.metaKey || event.ctrlKey)) return; if (event.shiftKey && gameRunning) { const key = event.key.toLowerCase(); if (key === 'h') { event.preventDefault(); applyCheatSpellAttack(50); return; } if (key === 'g') { event.preventDefault(); applyCheatGold(500); return; } if (key === 'b') { event.preventDefault(); unlimitedSpellsCheat = !unlimitedSpellsCheat; showFeedback(unlimitedSpellsCheat ? "CHEAT: Unlimited Spells!" : "CHEAT OFF: Limited Spells.", "feedback-cheat"); playSfx('cheat'); resetSpellStateForNewLevel(); updateSpellUI(); return; } if (key === 't' && currentTurn === 'player' && !levelClearedAwaitingInput && gameActiveAndNoOverlay) { event.preventDefault(); if (isProcessing) return; isProcessing = true; if (typeof deselectUnit === 'function') deselectUnit(false); if (typeof setActiveSpell === 'function') setActiveSpell(null); if (typeof showFeedback === 'function') showFeedback("CHEAT: Skipping Level...", "feedback-levelup", 500); playSfx('cheat'); setTimeout(() => { if (!isGameActive() || isGameOver()) { isProcessing = false; return; } units = units.filter(u => u.team === 'player'); clearTimeoutMap(deathSpriteTimeouts); const stats = typeof calculateLevelStats === 'function' ? calculateLevelStats() : { totalGoldEarned: 0, goldGained: 0 }; playerGold += (stats.totalGoldEarned || 0) - (stats.goldGained || 0); playerGold = Math.max(0, playerGold); if (currentLevel >= highestLevelReached) highestLevelReached = currentLevel + 1; if (typeof saveScoreToLeaderboard === 'function') saveScoreToLeaderboard(currentLevel, playerGold, gameSettings.playerName); saveGameData(); if (typeof updateGoldDisplay === 'function') updateGoldDisplay(); stopMusic(); hideAllOverlays(); if (typeof startNextLevel === 'function') startNextLevel(); else { isGameActiveFlag = false; isProcessing = false; showLevelSelect(); } }, 150); return; } } else if (gameActiveAndNoOverlay && currentTurn === 'player') { if (event.key === '1') { setActiveSpell('fireball'); event.preventDefault(); return; } if (event.key === '2') { setActiveSpell('flameWave'); event.preventDefault(); return; } if (event.key === '3') { setActiveSpell('frostNova'); event.preventDefault(); return; } if (event.key === '4') { setActiveSpell('heal'); event.preventDefault(); return; } if (event.key.toLowerCase() === 'e') { endTurnButton?.click(); event.preventDefault(); } } }
function isAnyOverlayVisible(excludeMainMenu = false) { return isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isLevelSelectOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isSettingsOpen() || isAchievementsOpen() || (!excludeMainMenu && isMainMenuOpen()); }
function hideAllOverlays() { const overlays = [mainMenu, gameOverScreen, menuOverlay, leaderboardOverlay, levelSelectScreen, shopScreen, levelCompleteScreen, chooseTroopsScreen, settingsOverlay, achievementsOverlay]; overlays.forEach(o => { o?.classList.add('hidden'); o?.classList.remove('visible'); }); gameBoardWrapper?.classList.toggle('active', isGameActive() && !isAnyOverlayVisible()); if (!isGameActive() && !isLevelSelectOpen() && !isChooseTroopsScreenOpen()) stopTooltipUpdater(); else if (isGameActive() && !isAnyOverlayVisible()) startTooltipUpdater(); else if (isLevelSelectOpen() || isChooseTroopsScreenOpen() || isShopOpen() || isMenuOpen()) startTooltipUpdater(); else stopTooltipUpdater(); }
function isMobileDevice() { const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0); if (!hasTouch) return false; const userAgent = navigator.userAgent || navigator.vendor || window.opera; return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()); }
async function attemptEnterFullscreen(element) { const fsEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled; if (!fsEnabled) return false; if (isFullscreen()) return true; const requestMethod = element.requestFullscreen || element.webkitRequestFullscreen || element.mozRequestFullScreen || element.msRequestFullscreen; if (requestMethod) { try { await requestMethod.call(element); return true; } catch (err) { console.warn(`FS request failed: ${err.name} - ${err.message}`); return false; } } else return false; }

// --- Overlay Management ---
function isAnyOverlayVisible(excludeMainMenu = false) { return isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isLevelSelectOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isSettingsOpen() || isAchievementsOpen() || (!excludeMainMenu && isMainMenuOpen()); }
function hideAllOverlays() { const overlays = [mainMenu, gameOverScreen, menuOverlay, leaderboardOverlay, levelSelectScreen, shopScreen, levelCompleteScreen, chooseTroopsScreen, settingsOverlay, achievementsOverlay]; overlays.forEach(o => { o?.classList.add('hidden'); o?.classList.remove('visible'); }); gameBoardWrapper?.classList.toggle('active', isGameActive() && !isAnyOverlayVisible()); if (!isGameActive() && !isLevelSelectOpen() && !isChooseTroopsScreenOpen()) stopTooltipUpdater(); else if (isGameActive() && !isAnyOverlayVisible()) startTooltipUpdater(); else if (isLevelSelectOpen() || isChooseTroopsScreenOpen() || isShopOpen() || isMenuOpen()) startTooltipUpdater(); else stopTooltipUpdater(); }
function showMainMenu() { fullGameReset(); hideAllOverlays(); mainMenu?.classList.remove('hidden'); mainMenu?.classList.add('visible'); stopTooltipUpdater(); stopMusic(); } function hideMainMenu() { mainMenu?.classList.remove('visible'); mainMenu?.classList.add('hidden'); } function isMainMenuOpen() { return mainMenu?.classList.contains('visible'); }
function showLevelCompleteScreen(stats, finalGold) { hideAllOverlays(); stopMusic(); playVictoryMusic(); stopTooltipUpdater(); if (!levelCompleteScreen || !statsBonusList || !levelCompleteTotalGoldElement) return; statsEnemiesKilled.textContent = stats.enemiesKilled; statsUnitsLost.textContent = stats.unitsLost; statsGoldGained.textContent = stats.goldGained; statsTotalGold.textContent = stats.totalGoldEarned; levelCompleteTotalGoldElement.textContent = finalGold; statsBonusList.querySelector('[data-bonus="noSpells"]').classList.toggle('hidden', stats.bonusGoldNoSpells <= 0); statsBonusList.querySelector('[data-bonus="noSpells"] .bonus-amount').textContent = stats.bonusGoldNoSpells; statsBonusList.querySelector('[data-bonus="fullHp"]').classList.toggle('hidden', stats.bonusGoldFullHp <= 0); statsBonusList.querySelector('[data-bonus="fullHp"] .bonus-amount').textContent = stats.bonusGoldFullHp; statsBonusList.querySelector('[data-bonus="noLosses"]').classList.toggle('hidden', stats.bonusGoldNoLosses <= 0); statsBonusList.querySelector('[data-bonus="noLosses"] .bonus-amount').textContent = stats.bonusGoldNoLosses; statsBonusList.querySelector('[data-bonus="noArmor"]').classList.toggle('hidden', stats.bonusGoldNoArmor <= 0); statsBonusList.querySelector('[data-bonus="noArmor"] .bonus-amount').textContent = stats.bonusGoldNoArmor; levelCompleteScreen.classList.remove('hidden'); levelCompleteScreen.classList.add('visible'); } function hideLevelComplete() { levelCompleteScreen?.classList.remove('visible'); levelCompleteScreen?.classList.add('hidden'); } function isLevelCompleteOpen() { return levelCompleteScreen?.classList.contains('visible'); }
function showGameOverScreen(playerWon, message, isForfeit = false) { hideAllOverlays(); stopMusic(); stopTooltipUpdater(); if (!gameOverScreen || !gameOverTitle || !gameOverMessage || !restartButton || !gameOverToTitleButton) return; gameOverTitle.textContent = playerWon ? "Victory!" : (isForfeit ? "Level Forfeited" : "Defeat!"); gameOverMessage.innerHTML = message; restartButton.textContent = playerWon ? "Play Again?" : "Restart Level"; restartButton.style.display = (isForfeit || playerWon) ? 'none' : 'inline-block'; gameOverToTitleButton.textContent = "Back to Title"; gameOverScreen.classList.remove('hidden'); gameOverScreen.classList.add('visible'); } function hideGameOverScreen() { gameOverScreen?.classList.remove('visible'); gameOverScreen?.classList.add('hidden'); } function isGameOverScreenVisible() { return gameOverScreen?.classList.contains('visible'); }
function showMenu() { if (!isAnyOverlayVisible() && isGameActive()) { menuOverlay?.classList.remove('hidden'); menuOverlay?.classList.add('visible'); updateGoldDisplay(); updateQuitButton(); stopTooltipUpdater(); startTooltipUpdater(); } } function hideMenu() { menuOverlay?.classList.remove('visible'); menuOverlay?.classList.add('hidden'); stopTooltipUpdater(); if (isGameActive() && !isAnyOverlayVisible()) startTooltipUpdater(); } function isMenuOpen() { return menuOverlay?.classList.contains('visible'); }
function showSettings(originMenu = false) { hideAllOverlays(); settingsOverlay?.classList.remove('hidden'); settingsOverlay?.classList.add('visible'); loadSettings(); if(musicVolumeSlider) musicVolumeSlider.value = musicVolume; if(musicVolumeValueSpan) musicVolumeValueSpan.textContent = `${Math.round(musicVolume * 100)}%`; if(sfxVolumeSlider) sfxVolumeSlider.value = sfxVolume; if(sfxVolumeValueSpan) sfxVolumeValueSpan.textContent = `${Math.round(sfxVolume * 100)}%`; if(muteToggleSetting) muteToggleSetting.checked = isMuted; if(fullscreenToggleSetting) fullscreenToggleSetting.checked = isFullscreen(); if(toggleHpBarsSetting) toggleHpBarsSetting.checked = gameSettings.showHpBars; if(playerNameSettingInput) playerNameSettingInput.value = gameSettings.playerName; settingsOverlay.dataset.originMenu = originMenu; stopTooltipUpdater(); } function hideSettings() { const originMenu = settingsOverlay?.dataset.originMenu === 'true'; settingsOverlay?.classList.remove('visible'); settingsOverlay?.classList.add('hidden'); settingsOverlay.dataset.originMenu = 'false'; if (originMenu) { showMenu(); } else { showMainMenu(); } } function isSettingsOpen() { return settingsOverlay?.classList.contains('visible'); }
function showAchievements() { hideAllOverlays(); achievementsOverlay?.classList.remove('hidden'); achievementsOverlay?.classList.add('visible'); updateAchievementsScreen(); stopTooltipUpdater(); } function hideAchievements() { achievementsOverlay?.classList.remove('visible'); achievementsOverlay?.classList.add('hidden'); showMainMenu(); } function isAchievementsOpen() { return achievementsOverlay?.classList.contains('visible'); }
function saveScoreToLeaderboard(level, gold, name) { try { const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]'); const safeName = typeof name === 'string' ? name.substring(0, 12).trim() : "Hero"; const newScore = { name: safeName, level, gold, date: new Date().toISOString().split('T')[0] }; leaderboard.push(newScore); leaderboard.sort((a, b) => { if (b.level !== a.level) return b.level - a.level; return b.gold - a.gold; }); const uniqueLeaderboard = leaderboard.reduce((acc, current) => { const existing = acc.find(item => item.name === current.name && item.level === current.level); if (!existing || current.gold > existing.gold) { if (existing) acc.splice(acc.indexOf(existing), 1); acc.push(current); } acc.sort((a, b) => { if (b.level !== a.level) return b.level - a.level; return b.gold - a.gold; }); return acc; }, []).slice(0, MAX_LEADERBOARD_ENTRIES); localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(uniqueLeaderboard)); } catch (e) { console.error("Error saving leaderboard:", e); } }
function showLeaderboard(showInput = false, level = 0, gold = 0) { hideAllOverlays(); stopTooltipUpdater(); leaderboardList.innerHTML = ''; leaderboardEntry.classList.toggle('hidden', !showInput); playerNameInput.value = gameSettings.playerName || "Hero"; submitScoreButton.onclick = () => { const name = playerNameInput.value || "Hero"; updateSetting('playerName', name); saveScoreToLeaderboard(level, gold, name); leaderboardEntry.classList.add('hidden'); showLeaderboard(false); }; try { const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]'); if (leaderboard.length === 0) leaderboardList.innerHTML = '<li>No scores yet!</li>'; else leaderboard.forEach(score => { const li = document.createElement('li'); li.innerHTML = `<span>${score.name || 'Hero'} (Lvl ${score.level})</span> <span>${score.gold} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"></span>`; leaderboardList.appendChild(li); }); } catch (e) { console.error("Error reading leaderboard:", e); leaderboardList.innerHTML = '<li>Error loading scores.</li>'; } leaderboardOverlay?.classList.remove('hidden'); leaderboardOverlay?.classList.add('visible'); } function hideLeaderboard() { leaderboardOverlay?.classList.remove('visible'); leaderboardOverlay?.classList.add('hidden'); leaderboardEntry?.classList.add('hidden'); } function isLeaderboardOpen() { return leaderboardOverlay?.classList.contains('visible'); }
function showLevelSelect() { fullGameReset(); hideAllOverlays(); levelSelectScreen?.classList.remove('hidden'); levelSelectScreen?.classList.add('visible'); gameBoardWrapper?.classList.remove('active'); loadGameData(); currentLevelSelectPage = Math.floor(Math.max(0, highestLevelReached - 1) / LEVELS_PER_PAGE) + 1; updateLevelSelectScreen(); stopTooltipUpdater(); stopMusic(); const img = new Image(); img.onload = () => { mapIntrinsicWidth = img.naturalWidth || 1024; mapIntrinsicHeight = img.naturalHeight || 1024; focusMapOnQuadrant(); startTooltipUpdater(); }; img.onerror = () => { mapIntrinsicWidth = 1024; mapIntrinsicHeight = 1024; mapZoom = 1; mapOffsetX = 0; mapOffsetY = 0; applyMapZoomAndPan(true); startTooltipUpdater(); }; img.src = WORLD_MAP_IMAGE_URL; } function hideLevelSelect() { levelSelectScreen?.classList.remove('visible'); levelSelectScreen?.classList.add('hidden'); stopTooltipUpdater(); } function isLevelSelectOpen() { return levelSelectScreen?.classList.contains('visible'); }
function focusMapOnQuadrant(immediate = true) { if (!levelSelectMapContainer || !levelSelectMap) return; const currentHighestLevel = parseInt(highestLevelReached || '1', 10); const levelIndex = Math.max(0, currentHighestLevel - 1); const baseLevelIndex = levelIndex % TOTAL_LEVELS_BASE; const quadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS; const isMobileView = window.matchMedia("(max-width: 700px)").matches; const activeQuadrantCenters = isMobileView ? MOBILE_VISUAL_QUADRANT_CENTERS : VISUAL_QUADRANT_CENTERS; const targetCenter = activeQuadrantCenters[quadrantIndex] || { x: 50, y: 50 }; const targetXPercent = targetCenter.x; const targetYPercent = targetCenter.y; let targetZoom = isMobileView ? MOBILE_INITIAL_MAP_ZOOM_LEVEL : INITIAL_MAP_ZOOM_LEVEL; targetZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, targetZoom)); const containerRect = levelSelectMapContainer.getBoundingClientRect(); if (containerRect.width <= 0 || containerRect.height <= 0) return; const safeMapWidth = Math.max(1, mapIntrinsicWidth || 1024); const safeMapHeight = Math.max(1, mapIntrinsicHeight || 1024); const baseScale = calculateMapScale(containerRect.width, containerRect.height, safeMapWidth, safeMapHeight); const finalScale = baseScale * targetZoom; if (finalScale <= 0 || isNaN(finalScale)) return; let initialOffsetX, initialOffsetY; const targetWorldX = (targetXPercent / 100) * safeMapWidth; const targetWorldY = (targetYPercent / 100) * safeMapHeight; initialOffsetX = containerRect.width / 2 - targetWorldX * finalScale; initialOffsetY = containerRect.height / 2 - targetWorldY * finalScale; const originalMapZoom = mapZoom; mapZoom = targetZoom; const clampedOffsets = clampMapOffsets(initialOffsetX, initialOffsetY); mapZoom = originalMapZoom; mapZoom = targetZoom; mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y; applyMapZoomAndPan(immediate); }
function handleMapPanStart(event) { const clickedDot = event.target.closest('.level-dot'); const clickedButton = event.target.closest('button, .primary-button, .secondary-button, .pagination-button'); const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen(); if (event.button !== 0 || clickedDot || clickedButton || anotherOverlayActive) { isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab'; return; } event.preventDefault(); isMapPanning = true; mapPanStartX = event.clientX; mapPanStartY = event.clientY; mapStartPanX = mapOffsetX; mapStartPanY = mapOffsetY; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grabbing'; document.addEventListener('mousemove', handleMapPanMove, { passive: false, capture: true }); document.addEventListener('mouseup', handleMapPanEnd, { once: true, capture: true }); }
function handleMapPanMove(event) { if (!isMapPanning || !levelSelectMap || !levelSelectMapContainer) return; event.preventDefault(); const deltaX = event.clientX - mapPanStartX; const deltaY = event.clientY - mapPanStartY; const rawOffsetX = mapStartPanX + deltaX; const rawOffsetY = mapStartPanY + deltaY; const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY); mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y; applyMapZoomAndPan(true); }
function handleMapPanEnd(event) { if (!isMapPanning) return; event.preventDefault(); isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab'; document.removeEventListener('mousemove', handleMapPanMove, { capture: true }); document.removeEventListener('mouseup', handleMapPanEnd, { capture: true }); document.removeEventListener('touchmove', handleMapPanMoveTouch, { capture: true }); document.removeEventListener('touchend', handleMapPanEndTouch, { capture: true }); document.removeEventListener('touchcancel', handleMapPanEndTouch, { capture: true }); }
function handleMapPanStartTouch(event) { const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen() || isSettingsOpen() || isAchievementsOpen(); if (isMapPanning || anotherOverlayActive) return; const touchTarget = event.target; const clickedDot = touchTarget.closest('.level-dot'); const clickedButton = touchTarget.closest('button, .primary-button, .secondary-button, .pagination-button'); if (clickedDot || clickedButton) return; if (event.touches.length === 1) { const touch = event.touches[0]; isMapPanning = true; mapPanStartX = touch.clientX; mapPanStartY = touch.clientY; mapStartPanX = mapOffsetX; mapStartPanY = mapOffsetY; document.addEventListener('touchmove', handleMapPanMoveTouch, { passive: false, capture: true }); document.addEventListener('touchend', handleMapPanEndTouch, { once: true, capture: true }); document.addEventListener('touchcancel', handleMapPanEndTouch, { once: true, capture: true }); } }
function handleMapPanMoveTouch(event) { if (!isMapPanning || event.touches.length !== 1) { handleMapPanEndTouch(event); return; } event.preventDefault(); if (levelSelectMapContainer) levelSelectMapContainer.classList.add('panning'); const touch = event.touches[0]; const deltaX = touch.clientX - mapPanStartX; const deltaY = touch.clientY - mapPanStartY; const rawOffsetX = mapStartPanX + deltaX; const rawOffsetY = mapStartPanY + deltaY; const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY); mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y; applyMapZoomAndPan(true); }
function handleMapPanEndTouch(event) { if (!isMapPanning) return; isMapPanning = false; if (levelSelectMapContainer) levelSelectMapContainer.classList.remove('panning'); document.removeEventListener('touchmove', handleMapPanMoveTouch, { capture: true }); document.removeEventListener('touchend', handleMapPanEndTouch, { capture: true }); document.removeEventListener('touchcancel', handleMapPanEndTouch, { capture: true }); }
function updateLevelSelectPagination() { if (!levelSelectPageInfo || !levelSelectPrevPage || !levelSelectNextPage) return; const maxPossibleLevel = ENABLE_INFINITE_LEVELS ? TOTAL_LEVELS_TO_SHOW : TOTAL_LEVELS_BASE; const totalPages = Math.ceil(maxPossibleLevel / LEVELS_PER_PAGE); levelSelectPageInfo.textContent = `Page ${currentLevelSelectPage} / ${totalPages}`; levelSelectPrevPage.disabled = currentLevelSelectPage <= 1; levelSelectNextPage.disabled = currentLevelSelectPage >= totalPages; levelSelectPrevPage.classList.toggle('hidden', totalPages <= 1); levelSelectNextPage.classList.toggle('hidden', totalPages <= 1); levelSelectPagination.classList.toggle('hidden', totalPages <= 1); }
function handleLevelSelectPageChange(direction) { const maxPossibleLevel = ENABLE_INFINITE_LEVELS ? TOTAL_LEVELS_TO_SHOW : TOTAL_LEVELS_BASE; const totalPages = Math.ceil(maxPossibleLevel / LEVELS_PER_PAGE); const newPage = currentLevelSelectPage + direction; if (newPage >= 1 && newPage <= totalPages) { playSfx('select'); currentLevelSelectPage = newPage; updateLevelSelectScreen(); } else { playSfx('error'); } }
function handleLevelDotClick(e) { const dot = e.currentTarget; if (dot && !dot.classList.contains('locked')) { const lvl = parseInt(dot.dataset.level); if (!isNaN(lvl)) { playSfx('levelSelect'); hideLevelSelect(); initGame(lvl); } else playSfx('error'); } }
function positionLevelDots() { if (!levelSelectMap || !levelSelectDotsLayer) return; levelSelectDotsLayer.querySelectorAll('.level-dot').forEach(dot => { const targetXPercent = parseFloat(dot.dataset.targetX || '50'); const targetYPercent = parseFloat(dot.dataset.targetY || '50'); dot.style.left = `${targetXPercent}%`; dot.style.top = `${targetYPercent}%`; const isHovered = dot === lastHoveredElement; dot.style.transform = `translate(-50%, -50%)${isHovered ? ' scale(1.45)' : ''}`; }); }
function showShop(origin = 'unknown', isBetweenLevelsFlag = false) { hideAllOverlays(); currentShopOrigin = origin; shopIsBetweenLevels = isBetweenLevelsFlag; selectedShopItemId = null; updateShopDisplay(); shopScreen?.classList.remove('hidden'); shopScreen?.classList.add('visible'); stopTooltipUpdater(); startTooltipUpdater(); } function hideShop() { shopScreen?.classList.remove('visible'); shopScreen?.classList.add('hidden'); selectedShopItemId = null; stopTooltipUpdater(); if (isGameActive() || isLevelSelectOpen() || isChooseTroopsScreenOpen()) startTooltipUpdater(); } function isShopOpen() { return shopScreen?.classList.contains('visible'); }
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
        // const passiveId = item.dataset.passiveId; // Use itemId for passives
        const armorId = item.dataset.armorId;
        const costSpan = item.querySelector('.shop-item-cost');
        const titleElement = item.querySelector('h4');
        const countSpan = item.querySelector('.unit-count');
        const spellLevelSpan = item.querySelector('.spell-level');
        const armorLevelSpan = item.querySelector('.armor-level'); // For armor level display
        const passiveLevelSpan = item.querySelector('.passive-level'); // For passive level display
        const descriptionP = item.querySelector('.shop-item-description');
        const resistanceP = item.querySelector('.shop-item-resistance'); // For armor resistance
        const iconImg = item.querySelector('.shop-item-icon'); // Get the img element

        let cost = 0;
        let requiredLevel = parseInt(item.dataset.requiredLevel) || 0;
        let canBuy = false;
        let canEquip = false;
        let isLocked = false; // Locked by level requirement or ownership
        let isMaxed = false;
        let requiredUnits = parseInt(item.dataset.requiredUnits) || 0;
        let currentLevel = 0; // For upgrades

        // Clear existing listeners to prevent duplicates
        item.removeEventListener('click', handleShopItemClick);
        item.removeEventListener('mouseenter', handleShopItemMouseEnter);
        item.removeEventListener('mouseleave', handleShopItemMouseLeave);

        // Make items selectable and add listeners if appropriate
        if (item.classList.contains('selectable')) {
             item.addEventListener('click', handleShopItemClick);
             item.addEventListener('mouseenter', handleShopItemMouseEnter);
             item.addEventListener('mouseleave', handleShopItemMouseLeave);
        }


        // --- Update logic per item type ---
        if (itemType === 'recruit') {
            cost = getRecruitCost(unitType);
            if (costSpan) costSpan.textContent = cost;
            item.dataset.currentCost = cost; // Store current cost for purchase logic
            const currentOwnedCount = playerOwnedUnits[unitType] || 0;
            const maxCount = parseInt(item.dataset.max) || MAX_OWNED_PER_TYPE;
            if (countSpan) countSpan.textContent = currentOwnedCount;
            isMaxed = currentOwnedCount >= maxCount;
            canBuy = playerGold >= cost && !isMaxed;
            if (titleElement && UNIT_DATA[unitType]) {
                const unitName = UNIT_DATA[unitType].name;
                titleElement.innerHTML = `<span class="shop-icon-container"><img src="${UNIT_DATA[unitType].spriteUrl}" class="shop-item-icon" alt="${unitName} Icon"></span> ${unitName} (<span class="unit-count">${currentOwnedCount}</span>/${maxCount})`;
            }
        } else if (itemType === 'unit_upgrade') {
            cost = UNIT_UPGRADE_COSTS[itemId] || 99999; // Get cost from config
            if (costSpan) costSpan.textContent = cost;
            item.dataset.currentCost = cost;
            canBuy = playerGold >= cost;
        } else if (itemType === 'ability_upgrade') {
             cost = ABILITY_UPGRADE_COSTS[itemId] || 99999;
             if (costSpan) costSpan.textContent = cost;
             item.dataset.currentCost = cost;
             isMaxed = (playerAbilityUpgrades[itemId] || 0) >= 1; // Assuming abilities are one-time buys
             canBuy = playerGold >= cost && !isMaxed;
        } else if (itemType === 'spell_upgrade') {
            const config = SPELL_UPGRADE_CONFIG[spellName];
            if (config) {
                currentLevel = playerSpellUpgrades[spellName] || 0;
                cost = calculateSpellCost(spellName);
                isMaxed = currentLevel >= config.maxLevel;
                requiredLevel = config.requiredLevel;
                isLocked = !spellsUnlocked[spellName]; // Locked if base spell not unlocked
                canBuy = playerGold >= cost && !isLocked && !isMaxed && highestLevelReached > requiredLevel;
                item.dataset.currentCost = (cost === Infinity ? '99999' : cost);
                if (costSpan) costSpan.textContent = isMaxed ? 'MAX' : (cost === Infinity ? 'MAX' : cost);
                if (spellLevelSpan) spellLevelSpan.textContent = currentLevel + 2; // Display next level
            } else {
                isLocked = true; canBuy = false; // Spell config missing
            }
        } else if (itemType === 'passive_purchase' && itemId === 'tactical_command') {
            cost = PASSIVE_UPGRADE_COSTS.tactical_command;
            const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0;
            isLocked = totalOwnedUnits < TACTICAL_COMMAND_UNLOCK_UNITS;
            isMaxed = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) >= MAX_ACTIVE_ROSTER_SIZE_MAX;
            canBuy = playerGold >= cost && !isLocked && !isMaxed;
            item.dataset.currentCost = cost;
            if (costSpan) costSpan.textContent = cost;
        } else if (itemType === 'passive' && itemId === 'passive_gold_magnet') {
            const magnetLevel = playerPassiveUpgrades.gold_magnet || 0;
            isLocked = magnetLevel === 0; // Visually locked if not found
            isMaxed = true; // Cannot be bought
            canBuy = false;
            if (passiveLevelSpan) passiveLevelSpan.textContent = `Lvl ${magnetLevel}`;
            if (costSpan) costSpan.textContent = 'Drop Only';
            item.classList.remove('selectable'); // Not selectable
            item.style.cursor = 'default';
        } else if (itemType === 'armor') {
             const ownedLevel = playerOwnedArmor[armorId] || 0;
             // Determine if locked (unowned AND not default grey/none)
             isLocked = ownedLevel === 0 && armorId !== 'none' && armorId !== 'grey';
             canEquip = (ownedLevel > 0 || armorId === 'none' || armorId === 'grey') && equippedArmorId !== armorId;
             canBuy = false; // Armor cannot be bought

             // Update Icon using recolored URL
             if (iconImg && armorId && typeof getRecoloredUrl === 'function') { // Check if function exists
                  iconImg.src = getRecoloredUrl(armorId, null, 'armor'); // Pass armorId as baseKey
             } else if (iconImg && ARMOR_DATA[armorId]) {
                 // Fallback to default icon path if recolor function not ready/available
                 iconImg.src = ARMOR_DATA[armorId].icon || './sprites/armor.png';
             }

             // Hide item if not owned (and not grey/none)
              item.classList.toggle('hidden', isLocked);

             item.classList.toggle('active-armor', equippedArmorId === armorId); // Highlight equipped armor

             if (armorLevelSpan && ownedLevel > 0 && armorId !== 'grey' && armorId !== 'none') {
                 armorLevelSpan.textContent = `Lvl ${ownedLevel}`;
                 armorLevelSpan.classList.remove('hidden');
             } else if (armorLevelSpan) {
                 armorLevelSpan.classList.add('hidden');
             }

              // Update description/resistance based on level
             const armorData = ARMOR_DATA[armorId];
             if (descriptionP && armorData) descriptionP.textContent = armorData.description;
             if (resistanceP) {
                 let resistanceText = '';
                 if (ownedLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL) {
                      if (armorId === 'azure' && armorData.resistances?.frost >= ARMOR_RESISTANCE_VALUE) resistanceText = `+${ARMOR_RESISTANCE_VALUE} Frost Resist`;
                      if (armorId === 'ember' && armorData.resistances?.fire >= ARMOR_RESISTANCE_VALUE) resistanceText = `+${ARMOR_RESISTANCE_VALUE} Fire Resist`;
                 }
                 resistanceP.textContent = resistanceText;
                 resistanceP.classList.toggle('hidden', resistanceText === '');
             }
        }

        // Apply shared visual states for selectable items
        if (item.classList.contains('selectable')) {
             // Don't apply 'locked' style visually to unowned armor, just hide it
             item.classList.toggle('locked', isLocked && itemType !== 'armor');
             item.classList.toggle('maxed', isMaxed);
             item.classList.toggle('selected', selectedShopItemId === itemId);
        }
    });

    // Update bottom bar based on selection (or lack thereof)
    updateShopActionInfo();
}

function handleShopItemClick(event) { const itemElement = event.currentTarget; const itemId = itemElement.dataset.itemId; const itemType = itemElement.dataset.type; const isCurrentlySelected = itemElement.classList.contains('selected'); if (!itemElement.classList.contains('selectable')) { playSfx('error'); return; } if (itemType !== 'armor' && (itemElement.classList.contains('locked') || itemElement.classList.contains('maxed'))) { playSfx('error'); if (selectedShopItemId === itemId) { selectedShopItemId = null; itemElement.classList.remove('selected'); updateShopActionInfo(); } return; } playSfx('select'); if (isCurrentlySelected) { selectedShopItemId = null; itemElement.classList.remove('selected'); } else { if (selectedShopItemId) { const previousItem = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); previousItem?.classList.remove('selected'); } selectedShopItemId = itemId; itemElement.classList.add('selected'); } updateShopActionInfo(); }
function updateShopActionInfo() { if (!shopActionButton || !shopSelectedItemInfoElement) return; const selectedItem = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); if (!selectedItem || selectedShopItemId === null) { shopSelectedItemInfoElement.textContent = "Select an item above..."; shopActionButton.classList.add('hidden'); selectedShopItemId = null; return; } const itemId = selectedItem.dataset.itemId; const itemType = selectedItem.dataset.type; const itemNameElement = selectedItem.querySelector('h4'); const itemName = itemNameElement ? itemNameElement.textContent.split('(')[0].split('[')[0].trim() : "Item"; let cost = parseInt(selectedItem.dataset.currentCost) || 0; let actionText = "Buy"; let action = "buy"; let canAfford = playerGold >= cost; let isMaxed = selectedItem.classList.contains('maxed'); let isLocked = selectedItem.classList.contains('locked') && itemType !== 'armor'; let isEquipped = false; let canPerformAction = false; let infoText = `Selected: ${itemName}`; if (itemType === 'recruit') { actionText = "Recruit"; action = "recruit"; canPerformAction = canAfford && !isMaxed; infoText += ` - Cost: ${cost}`; if(isMaxed) infoText += ` (Max Owned)`; else if (!canAfford) infoText += ` (Need ${cost - playerGold} more G)`; } else if (itemType === 'unit_upgrade') { cost = UNIT_UPGRADE_COSTS[itemId] || 99999; item.dataset.currentCost = cost; actionText = "Upgrade"; action = "upgrade"; canPerformAction = canAfford; infoText += ` - Upgrade Cost: ${cost}`; if (!canAfford) infoText += ` (Need ${cost - playerGold} more G)`; } else if (itemType === 'ability_upgrade') { cost = ABILITY_UPGRADE_COSTS[itemId] || 99999; item.dataset.currentCost = cost; isMaxed = (playerAbilityUpgrades[itemId] || 0) >= 1; actionText = "Purchase"; action = "buy_ability"; canPerformAction = canAfford && !isMaxed; infoText += ` - Cost: ${cost}`; if (isMaxed) infoText += ` (Owned)`; else if (!canAfford) infoText += ` (Need ${cost - playerGold} more G)`; } else if (itemType === 'spell_upgrade') { const spellName = selectedItem.dataset.spellName; cost = calculateSpellCost(spellName); item.dataset.currentCost = cost === Infinity ? 99999 : cost; currentLevel = playerSpellUpgrades[spellName] || 0; const config = SPELL_UPGRADE_CONFIG[spellName]; isMaxed = currentLevel >= config.maxLevel; requiredLevel = parseInt(selectedItem.dataset.requiredLevel) || 0; isLocked = !spellsUnlocked[spellName]; const meetsLevelReq = highestLevelReached > requiredLevel; actionText = "Upgrade"; action = "upgrade_spell"; canPerformAction = canAfford && !isLocked && !isMaxed && meetsLevelReq; infoText += ` - Upgrade Cost: ${isMaxed ? 'MAX' : (cost === Infinity ? 'MAX' : cost)}`; if (isLocked) infoText += ` (Spell Locked)`; else if (!meetsLevelReq) infoText += ` (Req. Lvl ${requiredLevel+1} Clear)`; else if (isMaxed) infoText += ` (Max Level)`; else if (!canAfford) infoText += ` (Need ${cost - playerGold} more G)`; } else if (itemType === 'passive_purchase' && itemId === 'tactical_command') { cost = PASSIVE_UPGRADE_COSTS.tactical_command; item.dataset.currentCost = cost; const currentBonusSlots = playerPassiveUpgrades.tactical_command || 0; requiredUnits = parseInt(selectedItem.dataset.requiredUnits) || 0; const meetsUnitReq = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0) >= requiredUnits; isLocked = !meetsUnitReq; isMaxed = (MAX_ACTIVE_ROSTER_SIZE_BASE + currentBonusSlots) >= MAX_ACTIVE_ROSTER_SIZE_MAX; actionText = "Buy"; action = "buy_passive"; canPerformAction = canAfford && !isLocked && !isMaxed; infoText += ` - Cost: ${cost}`; if (isLocked) infoText += ` (Req. ${requiredUnits} Units)`; else if (isMaxed) infoText += ` (Max Slots)`; else if (!canAfford) infoText += ` (Need ${cost - playerGold} more G)`; } else if (itemType === 'armor') { const armorId = selectedItem.dataset.armorId; const ownedLevel = playerOwnedArmor[armorId] || 0; isEquipped = equippedArmorId === armorId; if (isEquipped) { actionText = "Equipped"; action = "equipped"; canPerformAction = false; infoText += ` (Currently Equipped)`; } else if (ownedLevel > 0 || armorId === 'none' || armorId === 'grey') { actionText = "Equip"; action = "equip"; canPerformAction = true; infoText += ` (Click to Equip)`; } else { actionText = "Locked"; action = "locked"; canPerformAction = false; infoText += ` (Not Owned)`; } } else { shopSelectedItemInfoElement.textContent = `Selected: ${itemName}`; shopActionButton.classList.add('hidden'); return; } shopActionButton.textContent = actionText; shopActionButton.dataset.action = action; shopActionButton.disabled = !canPerformAction; shopActionButton.classList.remove('hidden'); shopActionButton.classList.remove('green-accent', 'gold-accent', 'disabled-style'); if (action === 'equip') { shopActionButton.classList.add('gold-accent'); } else if (action === 'recruit' || action === 'upgrade' || action === 'buy_ability' || action === 'upgrade_spell' || action === 'buy_passive') { shopActionButton.classList.add('green-accent'); } if (!canPerformAction) { shopActionButton.classList.add('disabled-style'); } shopSelectedItemInfoElement.textContent = infoText; }
function handleShopActionClick() { if (!selectedShopItemId || shopActionButton.disabled) { playSfx('error'); return; } const itemElement = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${selectedShopItemId}"]`); if (!itemElement) { playSfx('error'); selectedShopItemId = null; updateShopActionInfo(); return; } const itemId = selectedShopItemId; const itemType = itemElement.dataset.type; const cost = parseInt(itemElement.dataset.currentCost) || 0; let purchaseResult = { success: false, showTroopsPopup: false }; let feedback = ''; let itemNameElement = itemElement.querySelector('h4'); let itemName = itemNameElement ? itemNameElement.textContent.split('(')[0].split('[')[0].trim() : "Item"; if (itemType === 'recruit') { const unitType = itemElement.dataset.unitType; purchaseResult = purchaseUnit(unitType); feedback = purchaseResult.success ? `Recruited ${itemName}!` : `Cannot recruit. Not enough gold or max owned.`; } else if (itemType === 'unit_upgrade') { purchaseResult.success = purchaseUnitUpgrade(itemId); feedback = purchaseResult.success ? `Upgraded ${itemName}!` : `Cannot upgrade. Not enough gold.`; } else if (itemType === 'ability_upgrade') { purchaseResult.success = purchaseAbilityUpgrade(itemId); feedback = purchaseResult.success ? `Purchased ${itemName}!` : `Cannot purchase. Not enough gold or already owned.`; } else if (itemType === 'spell_upgrade') { const spellName = itemElement.dataset.spellName; purchaseResult.success = purchaseSpellUpgrade(spellName); feedback = purchaseResult.success ? `Upgraded ${itemName}!` : `Cannot upgrade. Not enough gold, level too low, or max level.`; } else if (itemType === 'passive_purchase' && itemId === 'tactical_command') { purchaseResult.success = purchasePassive('tactical_command'); feedback = purchaseResult.success ? `Purchased ${itemName}!` : `Cannot purchase. Not enough gold, units, or maxed.`; } else if (itemType === 'armor') { const armorId = itemElement.dataset.armorId; if (shopActionButton.dataset.action === 'equip') { const equipSuccess = equipArmor(armorId); purchaseResult.success = equipSuccess; feedback = equipSuccess ? `Equipped ${itemName}.` : `Failed to equip ${itemName}.`; if(equipSuccess) playSfx('armorEquip'); } else { purchaseResult.success = false; feedback = "Cannot perform action."; } } else { purchaseResult.success = false; feedback = "Unknown item type."; } if (purchaseResult.success) { if (itemType !== 'armor') playSfx('shopBuy'); shopFeedbackElement.textContent = feedback; shopFeedbackElement.className = 'shop-message success'; shouldShowTroopsAfterPurchase = purchaseResult.showTroopsPopup || false; updateShopDisplay(); updateChooseTroopsScreen(); if (itemType === 'armor') { selectedShopItemId = null; updateShopActionInfo(); } else { const updatedItemElement = shopItemsContainer?.querySelector(`.shop-item[data-item-id="${itemId}"]`); if(updatedItemElement) updatedItemElement.classList.add('selected'); selectedShopItemId = itemId; updateShopActionInfo(); } } else { playSfx('error'); shopFeedbackElement.textContent = feedback || 'Action failed.'; shopFeedbackElement.className = 'shop-message error'; updateShopActionInfo(); } }

// --- Choose Troops Screen ---
function showChooseTroopsScreen(levelToStart = 0, origin = 'unknown') { hideAllOverlays(); stopTooltipUpdater(); levelToStartAfterManage = levelToStart; troopScreenOrigin = origin; loadGameData(); if (chooseTroopsTitle) chooseTroopsTitle.textContent = "Choose Troops"; if (confirmTroopsButton) { confirmTroopsButton.textContent = "Confirm"; confirmTroopsButton.title = "Confirm"; } updateChooseTroopsScreen(); chooseTroopsScreen?.classList.remove('hidden'); chooseTroopsScreen?.classList.add('visible'); startTooltipUpdater(); } function hideChooseTroopsScreen() { chooseTroopsScreen?.classList.remove('visible'); chooseTroopsScreen?.classList.add('hidden'); stopTooltipUpdater(); } function isChooseTroopsScreenOpen() { return chooseTroopsScreen?.classList.contains('visible'); }
function updateChooseTroopsScreen() { if (!currentTroopsList || !availableTroopsList || !currentRosterCountElement || !maxRosterSizeElement || !playerOwnedUnits || !playerActiveRoster || !confirmTroopsButton) return; currentTroopsList.innerHTML = ''; availableTroopsList.innerHTML = ''; chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; const totalActive = getTotalActiveUnits(); currentRosterCountElement.textContent = totalActive; maxRosterSizeElement.textContent = maxActiveRosterSize; const allPlayerUnitTypes = Object.keys(UNIT_DATA).filter(type => UNIT_DATA[type].team === 'player'); allPlayerUnitTypes.forEach(unitType => { const owned = playerOwnedUnits[unitType] || 0; if (owned === 0) return; const active = playerActiveRoster[unitType] || 0; const available = owned - active; const unitData = UNIT_DATA[unitType]; if (!unitData) return; if (active > 0) { const card = document.createElement('div'); card.className = 'troop-card'; card.dataset.unitType = unitType; card.innerHTML = `<img src="${unitData.spriteUrl}" alt="${unitData.name}"><span class="troop-count">${active}</span>`; card.addEventListener('click', handleTroopCardClick); card.addEventListener('mouseenter', handleTroopCardMouseEnter); card.addEventListener('mouseleave', handleTroopCardMouseLeave); currentTroopsList.appendChild(card); } if (available > 0) { const card = document.createElement('div'); card.className = 'troop-card'; card.dataset.unitType = unitType; card.innerHTML = `<img src="${unitData.spriteUrl}" alt="${unitData.name}"><span class="troop-count">${available}</span>`; if (totalActive >= maxActiveRosterSize) card.classList.add('disabled'); else card.addEventListener('click', handleTroopCardClick); card.addEventListener('mouseenter', handleTroopCardMouseEnter); card.addEventListener('mouseleave', handleTroopCardMouseLeave); availableTroopsList.appendChild(card); } }); if (currentTroopsList.children.length === 0) currentTroopsList.innerHTML = `<p style="width:100%; text-align:center; color: var(--color-text-muted);">Click available troops below!</p>`; if (availableTroopsList.children.length === 0) availableTroopsList.innerHTML = `<p style="width:100%; text-align:center; color: var(--color-text-muted);">No troops in reserve.</p>`; confirmTroopsButton.disabled = (totalActive === 0); confirmTroopsButton.textContent = "Confirm"; confirmTroopsButton.title = "Confirm"; }
function handleTroopCardClick(event) { const card = event.currentTarget; if (card.classList.contains('disabled')) { playSfx('error'); chooseTroopsFeedback.textContent = `Roster full (Max ${maxActiveRosterSize})`; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { if (chooseTroopsFeedback) { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; } }, 1500); return; } const unitType = card.dataset.unitType; const parentListId = card.parentElement.id; let success = false; if (parentListId === 'current-troops-list') success = removeUnitFromActiveRoster(unitType); else if (parentListId === 'available-troops-list') success = addUnitToActiveRoster(unitType); if (success) { playSfx('select'); updateChooseTroopsScreen(); } else playSfx('error'); }
function handleConfirmTroops() { const totalActive = getTotalActiveUnits(); if (totalActive === 0) { playSfx('error'); chooseTroopsFeedback.textContent = "Roster cannot be empty."; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { if (chooseTroopsFeedback) { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; } }, 2000); return; } if (totalActive > maxActiveRosterSize) { playSfx('error'); chooseTroopsFeedback.textContent = `Roster max ${maxActiveRosterSize}.`; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { if (chooseTroopsFeedback) { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; } }, 2000); return; } hideChooseTroopsScreen(); playSfx('success'); saveGameData(); const origin = troopScreenOrigin; const levelToStart = levelToStartAfterManage; troopScreenOrigin = ''; levelToStartAfterManage = 0; if (origin === 'shop') showShop(currentShopOrigin, shopIsBetweenLevels); else showLevelSelect(); startTooltipUpdater(); }
function handleTroopsBack() { hideChooseTroopsScreen(); playSfx('menuClose'); const origin = troopScreenOrigin; troopScreenOrigin = ''; levelToStartAfterManage = 0; if (origin === 'shop') showShop(currentShopOrigin, shopIsBetweenLevels); else showLevelSelect(); startTooltipUpdater(); }

// --- Spell Targeting & Highlights ---
function setActiveSpell(spellName) { if (!isGameActive() || currentTurn !== 'player') { if (currentSpell) { currentSpell = null; clearSpellHighlights(); updateSpellUI(); gameBoard?.classList.remove('fireball-targeting', 'flame-wave-targeting', 'frost-nova-targeting', 'heal-targeting'); } return; } let newSpell = null; let feedbackMessage = null; if (spellName) { if (currentSpell === spellName) { newSpell = null; playSfx('error'); } else { const isPermanentlyUnlocked = spellsUnlocked[spellName]; const isSpellReady = (spellUses[spellName] === true || unlimitedSpellsCheat); if (isPermanentlyUnlocked && isSpellReady) { newSpell = spellName; playSfx('select'); if (selectedUnit) deselectUnit(false); } else { newSpell = null; playSfx('error'); if (!isPermanentlyUnlocked) feedbackMessage = `Spell locked.`; else if (!isSpellReady) feedbackMessage = "Spell already used."; else feedbackMessage = "Cannot select spell."; } } } else { if (currentSpell) playSfx('error'); newSpell = null; } if (typeof clearSpellHighlights === 'function') clearSpellHighlights(); if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); currentSpell = newSpell; if (typeof updateSpellUI === 'function') updateSpellUI(); gameBoard?.classList.remove('fireball-targeting', 'flame-wave-targeting', 'frost-nova-targeting', 'heal-targeting'); if (currentSpell) gameBoard?.classList.add(`${currentSpell}-targeting`); if (feedbackMessage && typeof showFeedback === 'function') showFeedback(feedbackMessage, "feedback-error"); }
function clearFireballHighlight() { gridContent?.querySelectorAll('.valid-fireball-target').forEach(el => el.classList.remove('valid-fireball-target')); units.forEach(u => u.element?.classList.remove('valid-fireball-target')); obstacles.forEach(o => o.element?.classList.remove('valid-fireball-target'));} function clearHealHighlight() { gridContent?.querySelectorAll('.valid-heal-target').forEach(el => el.classList.remove('valid-heal-target')); units.forEach(u => u.element?.classList.remove('valid-heal-target')); } function clearSpellHighlights() { clearFrostNovaPreview(); clearFlameWaveHighlight(); clearFireballHighlight(); clearHealHighlight(); }

// --- Audio/Visual Toggles ---
function toggleMute(updateSettingFlag = true) { isMuted = !isMuted; bgMusic.muted = isMuted; victoryMusicPlayer.muted = isMuted; Object.values(sfx).forEach(sound => { if (sound) sound.muted = isMuted; }); updateMuteButtonVisual(); if (updateSettingFlag) updateSetting('mute', isMuted); if (!isMuted) { initializeAudio(); startMusicIfNotPlaying(); } else { stopMusic(); } }
function updateMuteButtonVisual() { if (muteToggleSetting) muteToggleSetting.checked = isMuted; }
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement); }
function toggleFullscreen(updateSettingFlag = true) { if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled && !document.mozFullScreenEnabled && !document.msFullscreenEnabled) { if (fullscreenToggleSetting) fullscreenToggleSetting.disabled = true; console.warn("Fullscreen not supported or enabled."); return; } const container = document.documentElement; if (!isFullscreen()) { if (container.requestFullscreen) container.requestFullscreen().catch(err => console.error(`FS Error: ${err.message}`)); else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen(); else if (container.mozRequestFullScreen) container.mozRequestFullScreen(); else if (container.msRequestFullscreen) container.msRequestFullscreen(); } else { if (document.exitFullscreen) document.exitFullscreen().catch(err => console.error(`Exit FS Error: ${err.message}`)); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); else if (document.mozCancelFullScreen) document.mozCancelFullScreen(); else if (document.msExitFullscreen) document.msExitFullscreen(); } }
function updateFullscreenButton() { const fsSupported = document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled; if (fullscreenToggleSetting) { fullscreenToggleSetting.disabled = !fsSupported; fullscreenToggleSetting.checked = isFullscreen(); } }

// --- Navigation Helpers ---
function proceedToNextLevelOrLocation() { startNextLevel(); }
function proceedAfterShopMaybe() { if (shouldShowTroopsAfterPurchase) { shouldShowTroopsAfterPurchase = false; const levelForTroops = shopIsBetweenLevels ? 0 : (currentShopOrigin === 'levelSelect' ? 0 : currentLevel); showChooseTroopsScreen(levelForTroops, currentShopOrigin); } else if (shopIsBetweenLevels) { shopIsBetweenLevels = false; currentShopOrigin = ''; proceedToNextLevelOrLocation(); } else { const origin = currentShopOrigin; currentShopOrigin = ''; switch (origin) { case 'levelSelect': showLevelSelect(); break; case 'menu': showMenu(); break; case 'levelComplete': showLevelSelect(); break; default: showLevelSelect(); break; } startTooltipUpdater(); } }

// --- Tooltip Functions ---
function trackMousePosition(event) { currentMouseX = event.clientX; currentMouseY = event.clientY; }
function updateTooltip() { if (isMobileDevice() || !tooltipElement || isPanning || isMapPanning || (!gameBoardWrapper && !isLevelSelectOpen() && !isChooseTroopsScreenOpen() && !isShopOpen()) || isAnyOverlayVisible(true)) { if (tooltipElement?.classList.contains('visible')) hideTooltip(); lastHoveredElement = null; return; } const el = document.elementFromPoint(currentMouseX, currentMouseY); let targetElement = null; let targetData = null; let type = null; const shopItemEl = el?.closest('.shop-item'); const spellIconEl = el?.closest('.spell-icon'); const goldDisplayEl = el?.closest('.menu-like-gold-display, #shop-gold-display'); const unitEl = el?.closest('.unit'); const itemEl = el?.closest('.item:not(.collected)'); const obstacleEl = el?.closest('.obstacle:not(.destroyed)'); const levelDotEl = el?.closest('.level-dot'); const troopCardEl = el?.closest('.troop-card'); const passiveItemEl = el?.closest('.shop-item[data-type="passive"], .shop-item[data-type="passive_purchase"]'); const armorItemEl = el?.closest('.shop-item[data-type="armor"]'); if (isShopOpen()) { if (armorItemEl) { type = 'armor'; targetElement = armorItemEl; targetData = armorItemEl; } else if (passiveItemEl) { type = 'passive'; targetElement = passiveItemEl; targetData = passiveItemEl; } else if (shopItemEl && shopItemEl.classList.contains('selectable')) { type = 'shop'; targetElement = shopItemEl; targetData = shopItemEl; } else if (spellIconEl) { type = 'spell'; targetElement = spellIconEl; targetData = spellIconEl; } else if (goldDisplayEl) { type = 'gold'; targetElement = goldDisplayEl; targetData = playerGold; } } else if (isLevelSelectOpen()) { if (levelDotEl) { type = 'levelDot'; targetElement = levelDotEl; targetData = levelDotEl; } } else if (isChooseTroopsScreenOpen()) { if (troopCardEl) { type = 'troopCard'; targetElement = troopCardEl; targetData = troopCardEl; } else if (goldDisplayEl) { type = 'gold'; targetElement = goldDisplayEl; targetData = playerGold; } } else if (isGameActive()) { if (unitEl && !unitEl.classList.contains('dead') && !unitEl.classList.contains('fading-out')) { type = 'unit'; targetElement = unitEl; const unitId = unitEl.dataset.id; targetData = units.find(u => u.id === unitId && isUnitAliveAndValid(u)); } else if (itemEl) { type = 'item'; targetElement = itemEl; targetData = items.find(i => i.id === itemEl.dataset.id && !i.collected); } else if (obstacleEl) { type = 'obstacle'; targetElement = obstacleEl; targetData = obstacles.find(o => o.id === obstacleEl.dataset.id && isObstacleIntact(o)); } else if (spellIconEl) { type = 'spell'; targetElement = spellIconEl; targetData = spellIconEl; } } else if (isMenuOpen() || isSettingsOpen()) { if (goldDisplayEl) { type = 'gold'; targetElement = goldDisplayEl; targetData = playerGold; } } if (targetElement && targetData) { if (lastHoveredElement !== targetElement) { showTooltip(targetData, type); lastHoveredElement = targetElement; if (type === 'unit' && !selectedUnit && currentTurn === 'player' && isGameActive()) updateUnitInfo(targetData); else if (lastHoveredElement?.matches('.unit') && type !== 'unit' && !selectedUnit && !el?.closest('#unit-info') && isGameActive()) updateUnitInfo(null); } else positionTooltip(); } else { if (lastHoveredElement !== null) { hideTooltip(); if (lastHoveredElement.matches('.unit') && !selectedUnit && currentTurn === 'player' && !el?.closest('#unit-info') && isGameActive()) updateUnitInfo(null); lastHoveredElement = null; } } }
function startTooltipUpdater() { if(isMobileDevice()) return; stopTooltipUpdater(); tooltipUpdateInterval = setInterval(updateTooltip, 100); } function stopTooltipUpdater() { if (tooltipUpdateInterval) { clearInterval(tooltipUpdateInterval); tooltipUpdateInterval = null; } hideTooltip(); }
function showTooltip(data, type) { if (!tooltipElement || !data) { hideTooltip(); return; } let content = ''; try { switch (type) { case 'unit': const unit = data; if (!unit || !unit.name || typeof unit.hp === 'undefined') { hideTooltip(); return; } content = `<b>${unit.name}</b>`; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0; content += `<div class="unit-hp-bar-container tooltip-hp-bar" style="--hp-percent: ${hpPercent}%;">`; const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); content += `<div class="unit-hp-bar" data-hp-level="${hpLevel}"></div><span class="unit-hp-text">${unit.hp}/${unit.maxHp}</span></div>`; let statuses = []; if(unit.isStealthed) statuses.push(`<span style="color:#cccccc;">👻 Stealth</span>`); if (unit.isFrozen) statuses.push(`<span style="color:#aadeff;">❄️ Frozen (${unit.frozenTurnsLeft}t)</span>`); if (unit.isNetted) statuses.push(`<span style="color:#cccccc;">🕸️ Netted (${unit.nettedTurnsLeft}t)</span>`); if (unit.isSlowed) statuses.push(`<span style="color:#add8e6;">🐌 Slowed (${unit.slowedTurnsLeft}t)</span>`); if (unit.inTower) statuses.push(`<span style="color:#ffddaa;">🏰 In Tower</span>`); if (unit.quickStrikeActive) statuses.push(`<span style="color:#fff352;">⚡ Quick Strike</span>`); if (statuses.length > 0) content += `<br>` + statuses.join('<br>'); break; case 'item': const item = data; const itemConfig = ITEM_DATA[item.type]; if (!itemConfig) break; if (item.type === 'gold') content = `<b>Gold Coin</b>Value: ${itemConfig.value || 1}`; else if (item.type === 'chest') { content = `<b>Chest</b>`; if (item.opened) content += `<br>Empty`; } else if (item.type === 'health_potion') content = `<b>Health Potion</b>Heals ${itemConfig.value || 1} HP`; else if (item.type === 'shiny_gem') content = `<b>Shiny Gem</b>Value: ${item.value || '?'}`; else if (item.type === 'gold_magnet') content = `<b>Gold Magnet</b><br><span style="color:#ffddaa;">Pulls nearby gold!</span>`; else if (item.type === 'spellbook') content = `<b>Spellbook</b><br><span style="color:#aadeff;">Restores 1 spell charge.</span>`; else if (item.type === 'armor') content = `<b>Armor Drop</b><br><span style="color:#ffddaa;">Boss armor piece (${item.armorId || 'Unknown'}).</span>`; break; case 'obstacle': const obstacle = data; const obsConfig = OBSTACLE_DATA[obstacle.type]; content = `<b>${obstacle.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</b>`; if (obstacle.destructible) content += `<br>HP: ${obstacle.hp}/${obstacle.maxHp}`; if (obstacle.enterable) { const occupant = obstacle.occupantUnitId ? units.find(u => u.id === obstacle.occupantUnitId && isUnitAliveAndValid(u)) : null; content += `<br>${occupant ? `Occupied by ${occupant.name}` : 'Empty'}`; if (occupant?.baseRange > 1) content += ` (+${obstacle.rangeBonus} RNG)`; if (!occupant && obstacle.hp > 0) content += `<br><span style="color:#cccccc;">(Enter/Exit from below)</span>`; } if (obsConfig.blocksLOS) content += `<br><span style="color:#ffccaa;">Blocks Line of Sight</span>`; if (obstacle.hidesUnit && !obstacle.revealed) content += `<br><span style="color:#aadeff;">Seems suspicious...</span>`; if (obstacle.canBeAttacked) content += `<br><span style="color:#ffaaaa;">Attackable</span>`; break; case 'shop': const shopItemId = data.dataset.itemId; const shopItemType = data.dataset.type; if (shopItemType === 'recruit') { const unitType = data.dataset.unitType; const unitData = UNIT_DATA[unitType]; const shopCost = getRecruitCost(unitType); const owned = playerOwnedUnits[unitType] || 0; const max = parseInt(data.dataset.max) || MAX_OWNED_PER_TYPE; content = `<b>Recruit ${unitData.name}</b> (${owned}/${max})`; content += `<br>${unitData.baseHp} HP | ${unitData.baseAtk} ATK | ${unitData.mov} MOV | ${unitData.range} RNG`; content += `<div class="tooltip-cost">Cost: <span>${shopCost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'unit_upgrade') { const cost = UNIT_UPGRADE_COSTS[shopItemId] || 99999; const desc = data.querySelector('h4')?.textContent || "Unit Upgrade"; content = `<b>${desc}</b><br>Permanently increases stat for all units of this type.`; content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'ability_upgrade') { const cost = ABILITY_UPGRADE_COSTS[shopItemId] || 99999; const abilityName = data.querySelector('h4')?.textContent || "Ability Upgrade"; content = `<b>${abilityName}</b>`; if(shopItemId === 'upgrade_rogue_quickstrike') content += `<br>Rogue Ability: Allows an extra attack per turn at the cost of ${ROGUE_QUICK_STRIKE_MOVE_PENALTY} movement.`; content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } else if (shopItemType === 'spell_upgrade') { const spellName = data.dataset.spellName; const cost = calculateSpellCost(spellName); const currentLevel = playerSpellUpgrades[spellName] || 0; const config = SPELL_UPGRADE_CONFIG[spellName]; content = `<b>Upgrade ${config.name} (Lvl ${currentLevel + 2})</b>`; content += `<br>Next: ${getSpellEffectDescription(spellName, true /* showNextLevel */)}`; if (cost !== Infinity) content += `<div class="tooltip-cost">Cost: <span>${cost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; else content += `<br>Max Level Reached.`; const reqLvl = parseInt(data.dataset.requiredLevel) || 0; if (highestLevelReached <= reqLvl && currentLevel === 0) content += `<br><span style="color:#ffaaaa;">Requires completing Level ${reqLvl}.</span>`; } break; case 'passive': const passiveId = data.dataset.itemId?.startsWith('passive_') ? data.dataset.itemId.substring(8) : null; if(passiveId && PASSIVE_DATA[passiveId]) { const passiveConfig = PASSIVE_DATA[passiveId]; const passiveLevel = playerPassiveUpgrades[passiveId] || 0; content = `<b>${passiveConfig.name}${passiveId === 'gold_magnet' ? ` (Lvl ${passiveLevel})` : ''}</b>`; content += `<br>${passiveConfig.description}`; if(passiveId === 'tactical_command') { const tcCost = PASSIVE_UPGRADE_COSTS.tactical_command; const currentSlots = MAX_ACTIVE_ROSTER_SIZE_BASE + (playerPassiveUpgrades.tactical_command || 0); const canBuyMore = currentSlots < MAX_ACTIVE_ROSTER_SIZE_MAX; if (canBuyMore) { content += `<br>(Currently: ${currentSlots}/${MAX_ACTIVE_ROSTER_SIZE_MAX} slots)`; content += `<div class="tooltip-cost">Cost: <span>${tcCost}</span><img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; const reqUnits = parseInt(data.dataset.requiredUnits); const ownedUnits = Object.values(playerOwnedUnits).reduce((s, c) => s + c, 0); if (ownedUnits < reqUnits) content += `<br><span style="color:#ffaaaa;">Requires owning ${reqUnits}+ total units.</span>`; } else content += `<br>(Max Slots Reached)`; } else if (passiveId === 'gold_magnet') { content += `<br><span style="color:#ffddaa;">(Found as drop only)</span>`; } } break; case 'armor': const armorId = data.dataset.armorId; const armorData = ARMOR_DATA[armorId]; const armorLevel = playerOwnedArmor[armorId] || 0; if(armorData) { content = `<b>${armorData.name}${armorLevel > 1 ? ` (Lvl ${armorLevel})` : ''}</b>`; content += `<br>${armorData.description}`; if (armorId !== 'none' && armorId !== 'grey') { if (armorLevel === 0) content += `<br><span style="color:#ffaaaa;">(Dropped by World Boss)</span>`; else if (equippedArmorId === armorId) content += `<br><span style="color:#aaffaa;">Equipped</span>`; else content += `<br><span style="color:#ffddaa;">Click to Equip</span>`; } if (armorLevel >= ARMOR_RESISTANCE_UPGRADE_LEVEL) { if(armorData.resistances?.fire >= ARMOR_RESISTANCE_VALUE) content+= `<br><span style="color:#ff8c69;">+${ARMOR_RESISTANCE_VALUE} Fire Resist</span>`; if(armorData.resistances?.frost >= ARMOR_RESISTANCE_VALUE) content+= `<br><span style="color:#add8e6;">+${ARMOR_RESISTANCE_VALUE} Frost Resist</span>`; } } break; case 'gold': content = `Current Gold: ${data}`; break; case 'spell': content = data.title || "Spell"; break; case 'levelDot': const levelDot = data; const levelNum = levelDot.dataset.level; content = `<b>Level ${levelNum}</b>`; if (levelDot.classList.contains('locked')) content += `<br><span style="color:#aaaaaa;">Locked</span>`; else if (levelDot.classList.contains('beaten')) content += `<br><span style="color:#aaffaa;">Completed</span>`; else content += `<br><span style="color:#ffaaaa;">Click to Play</span>`; break; case 'troopCard': const card = data; const unitType = card.dataset.unitType; const unitData = UNIT_DATA[unitType]; const countSpan = card.querySelector('.troop-count'); const count = countSpan ? countSpan.textContent : '?'; content = `<b>${unitData?.name || 'Unknown Troop'}</b>`; const parentListId = card.parentElement?.id; if (parentListId === 'current-troops-list') content += `<br>Count: ${count} (In Roster)<br><span style="color:#ffccaa;">Click to move to Available</span>`; else if (parentListId === 'available-troops-list') { content += `<br>Count: ${count} (Available)`; const totalActive = getTotalActiveUnits(); if (totalActive < maxActiveRosterSize) content += `<br><span style="color:#aaffaa;">Click to move to Roster</span>`; else content += `<br><span style="color:#ff8888;">Roster Full!</span>`; } break; default: hideTooltip(); return; } } catch (e) { console.error(`Tooltip error for type ${type}:`, e); content = "Error"; } if (content) { tooltipElement.innerHTML = content; tooltipElement.classList.add('visible'); positionTooltip(); } else hideTooltip(); }
function hideTooltip() { if (tooltipElement) tooltipElement.classList.remove('visible'); if (tooltipTimeout) clearTimeout(tooltipTimeout); }
function positionTooltip() { if (!tooltipElement || !tooltipElement.classList.contains('visible')) return; const rect = tooltipElement.getBoundingClientRect(); const contRect = document.body.getBoundingClientRect(); const offsetX = 15; const offsetY = 20; let top = currentMouseY + offsetY; let left = currentMouseX + offsetX; if (top + rect.height > contRect.height - 10) top = currentMouseY - rect.height - 15; if (left + rect.width > contRect.width - 10) left = currentMouseX - rect.width - 15; left = Math.max(5, left); top = Math.max(5, top); tooltipElement.style.left = `${left}px`; tooltipElement.style.top = `${top}px`; }

// --- Animation Functions ---
async function animateUnitMove(unit, startX, startY, targetX, targetY) { return new Promise((resolve) => { if (!unit?.element || unit.element.classList.contains('dead')) { resolve(); return; } unit.element.classList.add('is-moving'); void unit.element.offsetWidth; unit.element.style.setProperty('--unit-x', targetX + 1); unit.element.style.setProperty('--unit-y', targetY + 1); let finalized = false; const transitionDuration = MOVE_ANIMATION_DURATION_MS; const endHandler = (e) => { if (e.target === unit.element && (e.propertyName === 'left' || e.propertyName === 'top')) finalize(); }; const finalize = () => { if (finalized || !unit?.element) return; finalized = true; unit.element.removeEventListener('transitionend', endHandler); unit.element.classList.remove('is-moving'); updateUnitPosition(unit, true); resolve(); }; unit.element.addEventListener('transitionend', endHandler); setTimeout(() => { if (!finalized) finalize(); }, transitionDuration + 50); }); }
async function animateAttack(attacker, targetPos, isRanged, projectileType = 'melee') {
    return new Promise(async (resolve) => {
        if (!attacker?.element || !targetPos || !gridContent) { resolve(0); return; }
        let delay = 0;
        const attackerElement = attacker.element;
        const originalZIndex = window.getComputedStyle(attackerElement).zIndex || '10';
        const attackZIndex = '25';

        if (isRanged && projectileType !== 'melee' && projectileType !== 'none') { // Only shoot if ranged AND has a visual projectile type
            const projectile = document.createElement('div');
            let projectileClass = '';
            let shootSound = '';
            let duration = 0;
            let imgUrl = '';

            switch (projectileType) {
                case 'arrow':
                    projectileClass = 'arrow';
                    imgUrl = './sprites/arrow.png';
                    shootSound = 'arrowShoot';
                    duration = ARROW_FLY_DURATION_MS;
                    projectile.style.width = '26px';
                    projectile.style.height = '7px';
                    break;
                case 'fireball':
                    projectileClass = 'fireball-projectile';
                    imgUrl = './sprites/fireball.png';
                    shootSound = 'pyroFireball'; // Use pyro sound for visual
                    duration = FIREBALL_PROJECTILE_DURATION_MS;
                    projectile.style.width = '72px'; // Match CSS
                    projectile.style.height = '72px';
                    break;
                case 'net':
                    projectileClass = 'net';
                    imgUrl = './sprites/net.png';
                    shootSound = 'net_throw';
                    duration = NET_FLY_DURATION_MS;
                    projectile.style.width = '35px'; // Match CSS
                    projectile.style.height = '35px';
                    break;
                default:
                    console.warn("Attempted to animate unknown projectile:", projectileType)
                    resolve(0); // Unknown projectile type
                    return;
            }

            projectile.className = `projectile ${projectileClass}`;
            projectile.style.backgroundImage = `url('${imgUrl}')`;
            const startGridX = (attacker.x + 0.5) * currentCellSize;
            const startGridY = (attacker.y + 0.5) * currentCellSize;
            const endGridX = (targetPos.x + 0.5) * currentCellSize;
            const endGridY = (targetPos.y + 0.5) * currentCellSize;
            const angle = Math.atan2(endGridY - startGridY, endGridX - startGridX) * (180 / Math.PI);
            projectile.style.left = `${startGridX}px`;
            projectile.style.top = `${startGridY}px`;
            projectile.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
            projectile.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
            if(projectileType === 'net') {
                 projectile.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out, transform ${duration}ms ease-in`;
                 projectile.style.transform = `translate(-50%, -50%) scale(0.5) rotate(0deg)`;
            }
            gridContent.appendChild(projectile);
            playSfx(shootSound);
            requestAnimationFrame(() => {
                projectile.style.left = `${endGridX}px`;
                projectile.style.top = `${endGridY}px`;
                 if(projectileType === 'net') {
                     projectile.style.transform = `translate(-50%, -50%) scale(1) rotate(360deg)`;
                 }
            });
            delay = duration;
            setTimeout(() => projectile.remove(), delay);
        } else if (!isRanged) { // Melee Animation
            const originalTransform = attackerElement.style.transform || 'translate(-50%, -50%)';
            const dx = targetPos.x - attacker.x;
            const dy = targetPos.y - attacker.y;
            const tapDistance = 0.2 * currentCellSize;
            const targetX = dx * tapDistance;
            const targetY = dy * tapDistance;
            const targetTransform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px))`;
            const animTime = MOVE_ANIMATION_DURATION_MS / 2.5;
            attackerElement.style.zIndex = attackZIndex;
            attackerElement.style.transition = `transform ${animTime}ms ease-out`;
            attackerElement.style.transform = targetTransform;
            playSfx('move'); // Sound for lunge
            delay = animTime;
            setTimeout(() => {
                if (attackerElement?.parentNode) {
                    attackerElement.style.transform = originalTransform;
                    setTimeout(() => {
                        if (attackerElement) attackerElement.style.zIndex = originalZIndex;
                    }, 60);
                }
            }, delay + 30);
        } else {
             // Non-projectile ranged attack (e.g., shaman heal, netter melee-only check)
             delay = 50; // Small delay for sound sync
        }
        resolve(delay);
    });
}
function createExplosionEffect(gridX, gridY, type) { if (!gridContent) return; let explosionClass = ''; let duration = 500; if (type === 'fireball' || type === 'sapper') { explosionClass = 'fireball-explosion'; duration = FIREBALL_EXPLOSION_DURATION_MS; } if (explosionClass) { const explosion = document.createElement('div'); explosion.className = `effect ${explosionClass}`; const centerX = (gridX + 0.5) * currentCellSize; const centerY = (gridY + 0.5) * currentCellSize; explosion.style.left = `${centerX}px`; explosion.style.top = `${centerY}px`; gridContent.appendChild(explosion); setTimeout(() => explosion.remove(), duration); } }
function animateFlameWave(targetRow, isPreview = false) { if (!gridContent) return; for (let x = 0; x < currentGridCols; x++) { const cell = getCellElement(x, targetRow); if (cell) { cell.classList.add('flame-wave-target'); setTimeout(() => cell?.classList.remove('flame-wave-target'), FLAME_WAVE_EFFECT_DELAY_MS); } if (!isPreview) { const explosion = document.createElement('div'); explosion.className = 'effect flame-wave-explosion'; const cellCenterX = (x + 0.5) * currentCellSize; const cellCenterY = (targetRow + 0.5) * currentCellSize; explosion.style.left = `${cellCenterX}px`; explosion.style.top = `${cellCenterY}px`; explosion.style.animationDelay = `${x * FLAME_WAVE_STAGGER_DELAY_MS}ms`; gridContent.appendChild(explosion); const removalDelay = FIREBALL_EXPLOSION_DURATION_MS + (x * FLAME_WAVE_STAGGER_DELAY_MS); setTimeout(() => explosion.remove(), removalDelay); } } }
function animateFrostNova(centerX, centerY, radiusLevel) { if (!gridContent) return; const effect = document.createElement('div'); effect.className = 'effect frost-nova-effect'; const effectX = (centerX + 0.5) * currentCellSize; const effectY = (centerY + 0.5) * currentCellSize; effect.style.left = `${effectX}px`; effect.style.top = `${effectY}px`; effect.style.setProperty('--frost-nova-level', radiusLevel); gridContent.appendChild(effect); setTimeout(() => effect.remove(), FROST_NOVA_EXPAND_DURATION_MS); }
async function handleUnitDeathAnimation(unit, deathX, deathY, timeoutMap) { return new Promise((resolve) => { if (!unit?.element || !gridContent) { resolve(); return; } const el = unit.element; el.classList.add('dead'); el.style.pointerEvents = 'none'; el.style.backgroundImage = `url('${unit.deadSpriteUrl}')`; if (!unit.deadSpriteUrl) el.style.filter = 'grayscale(100%) brightness(50%)'; el.style.zIndex = '5'; el.style.opacity = '1'; el.style.transition = 'none'; el.style.setProperty('--unit-x', deathX + 1); el.style.setProperty('--unit-y', deathY + 1); const fadeTimeoutId = setTimeout(() => { el.classList.add('fading-out'); const removeTimeoutId = setTimeout(() => { el.remove(); timeoutMap.delete(unit.id + '-remove'); resolve(); }, DEATH_FADE_DURATION_MS); timeoutMap.set(unit.id + '-remove', removeTimeoutId); timeoutMap.delete(unit.id + '-fade'); }, DEATH_VISIBLE_DURATION_MS); timeoutMap.set(unit.id + '-fade', fadeTimeoutId); }); }
async function handleObstacleDestroyAnimation(obstacle) { return new Promise((resolve) => { if (!obstacle?.element || !gridContent) { resolve(); return; } const el = obstacle.element; el.classList.add('destroyed'); playSfx(obstacle.type === 'snowman' ? 'snowmanDestroy' : (obstacle.type === 'door' ? 'doorDestroy' : 'towerDestroy')); setTimeout(() => { el.remove(); resolve(); }, OBSTACLE_DESTROY_DURATION_MS); }); }
async function animateItemDrop(itemsToAnimate, targetX, targetY) { return Promise.all(itemsToAnimate.map((item, index) => { return new Promise(resolve => { if (!item) { resolve(); return; } if (!item.element) renderItem(item, gridContent); if (!item.element || !gridContent) { resolve(); return; } const el = item.element; const finalXCoord = (item.x + 0.5) * currentCellSize; const finalYCoord = (item.y + 0.5) * currentCellSize; el.style.left = `${finalXCoord}px`; el.style.top = `${finalYCoord}px`; el.style.setProperty('--stackIndex', item.stackIndex || 0); const startTransform = `translate(calc(-50% + var(--stackIndex, 0) * var(--stack-offset-x)), calc(-50% + var(--stackIndex, 0) * var(--stack-offset-y) - 20px)) scale(0.5)`; const endTransform = `translate(calc(-50% + var(--stackIndex, 0) * var(--stack-offset-x)), calc(-50% + var(--stackIndex, 0) * var(--stack-offset-y))) scale(1)`; el.style.opacity = '0'; el.style.transform = startTransform; const delay = index * 50; const duration = ITEM_DROP_ANIMATION_DURATION_MS; el.style.transition = `opacity 0.2s ease-out ${delay}ms, transform ${duration}ms cubic-bezier(0.68, -0.55, 0.27, 1.55) ${delay}ms`; requestAnimationFrame(() => { requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = endTransform; updateCellItemStatus(item.x, item.y); setTimeout(() => { resolve(); }, duration + delay); }); }); }); })); }
async function animateItemPickup(itemsToAnimate) { return Promise.all(itemsToAnimate.map(item => { return new Promise(resolve => { if (!item?.element || !gridContent) { resolve(); return; } item.element.classList.add('collected'); const duration = ITEM_PICKUP_ANIMATION_DURATION_MS; setTimeout(() => { item.element?.remove(); item.element = null; resolve(); }, duration); }); })); }
async function animateItemMagnetPull(item, targetUnit) { if (!item?.element || !targetUnit?.element || !gridContent) return; const itemElement = item.element; const targetX = (targetUnit.x + 0.5) * currentCellSize; const targetY = (targetUnit.y + 0.5) * currentCellSize; itemElement.style.setProperty('--target-x', `${targetX}px`); itemElement.style.setProperty('--target-y', `${targetY}px`); itemElement.classList.add('magnet-collecting'); setTimeout(() => { itemElement.remove(); item.element = null; updateCellItemStatus(item.x, item.y); }, ITEM_MAGNET_FLY_DURATION_MS); }
function removeVisualItems(itemsToRemove) { let lastX = -1, lastY = -1; itemsToRemove.forEach(item => { item.element?.remove(); item.element = null; if (lastX === -1) { lastX = item.x; lastY = item.y; } }); if (lastX !== -1) updateCellItemStatus(lastX, lastY); }
function updateVisualItemState(item) { if (!item?.element) return; if (item.type === 'chest' && item.opened) { item.element.classList.add('opened'); item.element.style.pointerEvents = 'none'; item.element.style.cursor = 'default'; } updateCellItemStatus(item.x, item.y); }

// --- HP Bar Overlay Functions ---
function createWorldHpBar(unit) { if (!unitHpBarsOverlay || !unit || !unit.element || worldHpBars.has(unit.id)) return; const barContainer = document.createElement('div'); barContainer.className = 'unit-hp-bar-world'; barContainer.dataset.unitId = unit.id; const barFill = document.createElement('div'); barFill.className = 'unit-hp-bar-world-fill'; barContainer.appendChild(barFill); unitHpBarsOverlay.appendChild(barContainer); worldHpBars.set(unit.id, barContainer); updateWorldHpBar(unit); updateWorldHpBarPosition(unit); }
function updateWorldHpBar(unit) { if (!unit || !worldHpBars.has(unit.id)) return; const barContainer = worldHpBars.get(unit.id); const barFill = barContainer.querySelector('.unit-hp-bar-world-fill'); if (!barFill) return; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100)) : 0; barFill.style.width = `${hpPercent}%`; const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); barFill.className = `unit-hp-bar-world-fill hp-${hpLevel}`; }
function removeWorldHpBar(unitId) { if (worldHpBars.has(unitId)) { worldHpBars.get(unitId).remove(); worldHpBars.delete(unitId); } }
function updateWorldHpBarPosition(unit) { if (!unit || !worldHpBars.has(unit.id) || !unit.element) return; const barContainer = worldHpBars.get(unit.id); barContainer.style.setProperty('--unit-grid-x', unit.x); barContainer.style.setProperty('--unit-grid-y', unit.y); }
function updateWorldHpBarsVisibility() { if (!unitHpBarsOverlay) return; unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars); if (gameSettings.showHpBars) { createAllWorldHpBars(); updateWorldHpBars(); } else clearAllWorldHpBars(); }
function createAllWorldHpBars() { units.forEach(unit => { if (isUnitAliveAndValid(unit)) createWorldHpBar(unit); }); } function clearAllWorldHpBars() { worldHpBars.forEach(bar => bar.remove()); worldHpBars.clear(); } function updateWorldHpBars() { if (!gameSettings.showHpBars) return; units.forEach(unit => { if (isUnitAliveAndValid(unit)) { updateWorldHpBar(unit); updateWorldHpBarPosition(unit); } else removeWorldHpBar(unit.id); }); worldHpBars.forEach((bar, unitId) => { if (!units.find(u => u.id === unitId)) removeWorldHpBar(unitId); }); }
function updateHpBarSettingUI(isChecked) { if (toggleHpBarsSetting) toggleHpBarsSetting.checked = isChecked; }

// --- Settings UI Helpers ---
function updateAudioVolumeDisplays() { if(musicVolumeSlider) musicVolumeSlider.value = musicVolume; if(musicVolumeValueSpan) musicVolumeValueSpan.textContent = `${Math.round(musicVolume * 100)}%`; if(sfxVolumeSlider) sfxVolumeSlider.value = sfxVolume; if(sfxVolumeValueSpan) sfxVolumeValueSpan.textContent = `${Math.round(sfxVolume * 100)}%`; }
function updatePlayerNameInput() { if(playerNameSettingInput) playerNameSettingInput.value = gameSettings.playerName; }

// --- Achievements UI ---
function updateAchievementsScreen() { if (!achievementsListElement || !achievementCompletionStatusElement) return; achievementsListElement.innerHTML = ''; let unlockedCount = 0; const totalAchievements = Object.keys(ACHIEVEMENT_DATA).length; const sortedIds = Object.keys(ACHIEVEMENT_DATA).sort((a, b) => { const aUnlocked = achievementProgress[a]?.unlocked; const bUnlocked = achievementProgress[b]?.unlocked; if (aUnlocked && !bUnlocked) return -1; if (!aUnlocked && bUnlocked) return 1; return ACHIEVEMENT_DATA[a].title.localeCompare(ACHIEVEMENT_DATA[b].title); }); sortedIds.forEach(id => { const data = ACHIEVEMENT_DATA[id]; const progress = achievementProgress[id] || { current: 0, unlocked: false }; const isUnlocked = progress.unlocked; if (isUnlocked) unlockedCount++; const item = document.createElement('div'); item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`; item.dataset.id = id; const iconBase = data.icon || 'default'; const iconSrc = isUnlocked ? `./sprites/achievement_${iconBase}_unlocked.png` : `./sprites/achievement_locked.png`; const iconAlt = isUnlocked ? `${data.title} Unlocked` : `Locked Achievement`; let progressText = ''; if (data.condition.count && !isUnlocked) { progressText = `<p class="achievement-progress">Progress: ${progress.current || 0} / ${data.condition.count}</p>`; } else if (isUnlocked) { progressText = `<p class="achievement-progress">Completed!</p>`; } let rewardText = ''; if (data.reward?.gold > 0) { rewardText = `<div class="achievement-reward ${isUnlocked ? '' : 'pending'}">Reward: ${data.reward.gold} <img src="./sprites/gold.png" class="gold-icon-inline" alt="G"></div>`; } item.innerHTML = ` <img src="${iconSrc}" class="achievement-icon" alt="${iconAlt}" onerror="this.src='./sprites/achievement_locked.png'"> <div class="achievement-details"> <h4 class="achievement-title">${data.title}</h4> <p class="achievement-description">${data.description}</p> ${progressText} </div> ${rewardText} `; achievementsListElement.appendChild(item); }); achievementCompletionStatusElement.textContent = `Completion: ${unlockedCount} / ${totalAchievements}`; }

// --- Level Select Screen Update ---

function updateLevelSelectScreen() {
    if (!levelSelectDotsLayer || !levelSelectMap || !levelSelectPageInfo || !levelSelectPrevPage || !levelSelectNextPage) return;
    levelSelectDotsLayer.innerHTML = ''; // Clear existing dots
    levelSelectMap.style.backgroundImage = `url('${WORLD_MAP_IMAGE_URL}')`; // Ensure map image is set

    const startLevel = (currentLevelSelectPage - 1) * LEVELS_PER_PAGE + 1;
    const endLevel = startLevel + LEVELS_PER_PAGE - 1;
    const maxPossibleLevel = ENABLE_INFINITE_LEVELS ? TOTAL_LEVELS_TO_SHOW : TOTAL_LEVELS_BASE;
    const actualEndLevel = Math.min(endLevel, maxPossibleLevel);

    // Determine map centering based on current platform (mobile/desktop)
    const isMobileView = window.matchMedia("(max-width: 700px)").matches;
    const activeQuadrantCenters = isMobileView ? MOBILE_VISUAL_QUADRANT_CENTERS : VISUAL_QUADRANT_CENTERS;
    const distanceStep = isMobileView ? MOBILE_LEVEL_DOT_SPIRAL_DISTANCE_STEP : LEVEL_DOT_SPIRAL_DISTANCE_STEP;
    const angleStepDeg = isMobileView ? MOBILE_LEVEL_DOT_SPIRAL_ANGLE_STEP : LEVEL_DOT_SPIRAL_ANGLE_STEP;
    const stretchFactor = isMobileView ? MOBILE_HORIZONTAL_STRETCH_FACTOR : 1;

    const fragment = document.createDocumentFragment();

    for (let i = startLevel; i <= actualEndLevel; i++) {
        const dot = document.createElement('div');
        dot.className = 'level-dot';
        dot.dataset.level = i;
        dot.textContent = `${i}`;
        dot.addEventListener('mouseenter', handleLevelDotMouseEnter); // Attach hover listener
        dot.addEventListener('mouseleave', handleLevelDotMouseLeave); // Attach hover listener

        // Calculate dot position based on spiral logic
        const baseLevelIndex = (i - 1) % TOTAL_LEVELS_BASE;
        const quadrantIndex = Math.floor(baseLevelIndex / LEVELS_PER_WORLD) % TOTAL_WORLDS;
        const center = activeQuadrantCenters[quadrantIndex] || { x: 50, y: 50 }; // Default center
        const levelInQuadrant = baseLevelIndex % LEVELS_PER_WORLD;
        const cycle = Math.floor((i - 1) / TOTAL_LEVELS_BASE); // For infinite levels scaling
        const cycleDistanceFactor = 1 + cycle * 0.05; // Slightly increase distance per cycle
        const cycleAngleOffset = cycle * 15; // Offset angle per cycle

        const distance = levelInQuadrant * distanceStep * cycleDistanceFactor;
        const angleDeg = (levelInQuadrant * angleStepDeg) + 90 + cycleAngleOffset; // +90 to start spiral upwards-ish
        const angleRad = angleDeg * (Math.PI / 180);

        let offsetX = Math.cos(angleRad) * distance * stretchFactor;
        let offsetY = Math.sin(angleRad) * distance;

        // Clamp percentages to stay roughly within 0-100 bounds if needed, though scaling should handle most cases
        const targetXPercent = Math.max(2, Math.min(98, center.x + offsetX));
        const targetYPercent = Math.max(2, Math.min(98, center.y + offsetY));

        dot.dataset.targetX = targetXPercent;
        dot.dataset.targetY = targetYPercent;

        // Set dot state (locked, beaten, unlocked)
        if (i > highestLevelReached) {
            dot.classList.add('locked');
            dot.disabled = true; // Disable interaction
            dot.title = "Locked";
        } else {
            if (highestLevelReached > i) {
                dot.classList.add('beaten');
            } else {
                dot.classList.add('unlocked');
            }
            dot.title = `Level ${i}`;
            dot.addEventListener('click', handleLevelDotClick); // Add click listener only if playable
        }
        fragment.appendChild(dot);
    }
    levelSelectDotsLayer.appendChild(fragment);
    positionLevelDots(); // Position the newly added dots
    updateLevelSelectPagination(); // Update page number display
}

// --- End Level Select Screen Update ---

// --- Tooltip Hover Handlers ---

function handleUnitMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
}
function handleUnitMouseLeave(event) {
    if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null;
}
function handleItemMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
}
function handleItemMouseLeave(event) {
    if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null;
}
function handleObstacleMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
}
function handleObstacleMouseLeave(event) {
    if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null;
}
function handleSpellIconMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
}
function handleSpellIconMouseLeave(event) {
    if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null;
}
function handleGoldDisplayMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
}
function handleGoldDisplayMouseLeave(event) {
    if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null;
}
function handleShopItemMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
}
function handleShopItemMouseLeave(event) {
    if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null;
}
function handleLevelDotMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
    positionLevelDots(); // Reposition needed for hover scale
}
function handleLevelDotMouseLeave(event) {
    if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null;
    positionLevelDots(); // Also repositions dots on leave
}
function handleTroopCardMouseEnter(event) {
    if (!isMobileDevice() && tooltipUpdateInterval) lastHoveredElement = event.currentTarget;
}
function handleTroopCardMouseLeave(event) {
    if (!isMobileDevice() && tooltipUpdateInterval && lastHoveredElement === event.currentTarget) lastHoveredElement = null;
}

// --- End Tooltip Hover Handlers ---

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Get Element References (Assign all variables declared at the top)
    gameContainer = document.getElementById('game-container'); gameBoardWrapper = document.getElementById('game-board-wrapper'); gameBoard = document.getElementById('game-board'); defaultViewButton = document.getElementById('default-view-button'); gridContent = document.getElementById('grid-content'); uiPanel = document.getElementById('ui-panel'); levelDisplayElement = document.getElementById('level-display'); spellAreaElement = document.getElementById('spell-area'); fireballElement = document.getElementById('fireball-spell'); flameWaveElement = document.getElementById('flame-wave-spell'); frostNovaElement = document.getElementById('frost-nova-spell'); healElement = document.getElementById('heal-spell'); unitInfo = document.getElementById('unit-info'); unitPortraitElement = document.getElementById('unit-portrait'); actionsLeftDisplayElement = document.getElementById('actions-left-display'); unitNameDisplay = document.getElementById('unit-name'); unitAtkDisplay = document.getElementById('unit-atk'); unitMovDisplay = document.getElementById('unit-mov'); unitRngDisplay = document.getElementById('unit-rng'); unitStatusDisplay = document.getElementById('unit-status'); unitHpBarContainer = unitInfo?.querySelector('.unit-hp-bar-container'); unitHpBarElement = unitHpBarContainer?.querySelector('.unit-hp-bar'); boardFeedbackArea = document.getElementById('board-feedback-area'); endTurnButton = document.getElementById('end-turn-button'); mainMenu = document.getElementById('main-menu'); startGameButton = document.getElementById('start-game-button'); leaderboardMenuButton = document.getElementById('leaderboard-menu-button'); achievementsMenuButton = document.getElementById('achievements-menu-button'); settingsMenuButton = document.getElementById('settings-menu-button'); gameOverScreen = document.getElementById('game-over-screen'); restartButton = document.getElementById('restart-button'); gameOverTitle = document.getElementById('game-over-title'); gameOverMessage = document.getElementById('game-over-message'); gameOverToTitleButton = document.getElementById('game-over-to-title-button'); tooltipElement = document.getElementById('tooltip'); menuButton = document.getElementById('menu-button'); menuOverlay = document.getElementById('menu-overlay'); closeMenuButton = document.getElementById('close-menu-button'); quitButton = document.getElementById('quit-button'); menuOptionsButton = document.getElementById('menu-options-button'); quitToMainMenuButton = document.getElementById('quit-to-main-menu-button'); leaderboardOverlay = document.getElementById('leaderboard-overlay'); leaderboardList = document.getElementById('leaderboard-list'); closeLeaderboardButton = document.getElementById('close-leaderboard-button'); leaderboardEntry = document.getElementById('leaderboard-entry'); playerNameInput = document.getElementById('player-name-input'); submitScoreButton = document.getElementById('submit-score-button'); levelSelectScreen = document.getElementById('level-select-screen'); levelSelectMapContainer = document.getElementById('level-select-map-container'); levelSelectMap = document.getElementById('level-select-map'); levelSelectDotsLayer = document.getElementById('level-select-dots-layer'); backToMainMenuButton = document.getElementById('back-to-main-menu-button'); levelSelectTroopsButton = document.getElementById('level-select-troops-button'); levelSelectShopButton = document.getElementById('level-select-shop-button'); menuGoldAmountElement = document.getElementById('menu-gold-amount'); menuGoldDisplay = document.getElementById('menu-gold-display'); shopScreen = document.getElementById('shop-screen'); shopItemsContainer = document.getElementById('shop-items-container'); shopGoldAmountElement = document.getElementById('shop-gold-amount'); shopGoldDisplay = document.getElementById('shop-gold-display'); shopActionButton = document.getElementById('shop-action-button'); shopExitButton = document.getElementById('shop-exit-button'); shopFeedbackElement = document.getElementById('shop-feedback'); shopSelectedItemInfoElement = document.getElementById('shop-selected-item-info'); shopTroopsButton = document.getElementById('shop-troops-button'); levelCompleteScreen = document.getElementById('level-complete-screen'); levelCompleteTitle = document.getElementById('level-complete-title'); levelCompleteStats = document.getElementById('level-complete-stats'); statsEnemiesKilled = document.getElementById('stats-enemies-killed'); statsUnitsLost = document.getElementById('stats-units-lost'); statsGoldGained = document.getElementById('stats-gold-gained'); levelCompleteBonuses = document.getElementById('level-complete-bonuses'); statsBonusList = document.getElementById('stats-bonus-list'); statsTotalGold = document.getElementById('stats-total-gold'); nextLevelButton = document.getElementById('next-level-button'); levelCompleteShopButton = document.getElementById('level-complete-shop-button'); levelCompleteTotalGoldElement = document.getElementById('level-complete-total-gold'); chooseTroopsScreen = document.getElementById('choose-troops-screen'); chooseTroopsTitle = document.getElementById('choose-troops-title'); currentTroopsList = document.getElementById('current-troops-list'); availableTroopsList = document.getElementById('available-troops-list'); currentRosterCountElement = document.getElementById('current-roster-count'); maxRosterSizeElement = document.getElementById('max-roster-size'); chooseTroopsFeedback = document.getElementById('choose-troops-feedback'); confirmTroopsButton = document.getElementById('confirm-troops-button'); troopsBackButton = document.getElementById('troops-back-button'); unitHpBarsOverlay = document.getElementById('unit-hp-bars-overlay'); settingsOverlay = document.getElementById('settings-overlay'); closeSettingsButton = document.getElementById('close-settings-button'); achievementsOverlay = document.getElementById('achievements-overlay'); closeAchievementsButton = document.getElementById('close-achievements-button'); achievementsListElement = document.getElementById('achievements-list'); achievementCompletionStatusElement = document.getElementById('achievement-completion-status'); levelSelectPagination = document.getElementById('level-select-pagination'); levelSelectPrevPage = document.getElementById('level-select-prev-page'); levelSelectNextPage = document.getElementById('level-select-next-page'); levelSelectPageInfo = document.getElementById('level-select-page-info');
    // Settings Elements
    musicVolumeSlider = document.getElementById('music-volume'); musicVolumeValueSpan = document.querySelector('#music-volume + .volume-value'); sfxVolumeSlider = document.getElementById('sfx-volume'); sfxVolumeValueSpan = document.querySelector('#sfx-volume + .volume-value'); muteToggleSetting = document.getElementById('toggle-mute-setting'); fullscreenToggleSetting = document.getElementById('toggle-fullscreen-setting'); toggleHpBarsSetting = document.getElementById('toggle-hp-bars-setting'); playerNameSettingInput = document.getElementById('player-name-setting');


    // Attach Event Listeners
    window.addEventListener('resize', handleResize, { passive: true }); window.addEventListener('keydown', handleKeyDown); document.addEventListener('mousemove', trackMousePosition); document.addEventListener('fullscreenchange', updateFullscreenButton); document.addEventListener('webkitfullscreenchange', updateFullscreenButton); document.addEventListener('mozfullscreenchange', updateFullscreenButton); document.addEventListener('MSFullscreenChange', updateFullscreenButton);
    gameBoard?.addEventListener('mousedown', handlePanStart); gameBoard?.addEventListener('wheel', handleZoom, { passive: false }); gameBoard?.addEventListener('touchstart', handlePanStartTouch, { passive: true }); // Allow default pinch zoom on board itself initially
    gameBoard?.addEventListener('touchstart', handlePinchStart, { passive: false }); gameBoard?.addEventListener('touchmove', handlePinchMove, { passive: false }); gameBoard?.addEventListener('touchend', handlePinchEnd, { passive: false });
    [fireballElement, flameWaveElement, frostNovaElement, healElement].forEach(el => { if (el) { el.addEventListener('mouseenter', handleSpellIconMouseEnter); el.addEventListener('mouseleave', handleSpellIconMouseLeave); } });
    menuGoldDisplay?.addEventListener('mouseenter', handleGoldDisplayMouseEnter); menuGoldDisplay?.addEventListener('mouseleave', handleGoldDisplayMouseLeave); shopGoldDisplay?.addEventListener('mouseenter', handleGoldDisplayMouseEnter); shopGoldDisplay?.addEventListener('mouseleave', handleGoldDisplayMouseLeave);
    gridContent?.addEventListener('mouseleave', handleGridMouseLeave); defaultViewButton?.addEventListener('click', () => centerView(false));
    startGameButton?.addEventListener('click', () => { hideMainMenu(); showLevelSelect(); });
    leaderboardMenuButton?.addEventListener('click', () => showLeaderboard(false)); settingsMenuButton?.addEventListener('click', () => showSettings(false)); // false: not from game menu
    achievementsMenuButton?.addEventListener('click', showAchievements);
    gameOverToTitleButton?.addEventListener('click', showMainMenu); restartButton?.addEventListener('click', () => { if (!isGameOverScreenVisible()) return; const titleText = gameOverTitle?.textContent.toLowerCase() || ""; if (titleText.includes("victory") || titleText.includes("forfeited")) showMainMenu(); else { hideGameOverScreen(); showChooseTroopsScreen(levelToRestartOnLoss); } });
    endTurnButton?.addEventListener('click', () => { if (levelClearedAwaitingInput) { hideLevelComplete(); proceedToNextLevelOrLocation(); } else if (isGameActive() && currentTurn === 'player' /* Removed isProcessing check */) { deselectUnit(false); endTurn(); } });
    menuButton?.addEventListener('click', showMenu);
    menuOptionsButton?.addEventListener('click', () => { hideMenu(); showSettings(true); }); // true: opened from game menu
    quitButton?.addEventListener('click', () => { const action = quitButton.dataset.action; hideMenu(); if (action === "forfeit") forfeitLevel(); else showLevelSelect(); playSfx('menuClose'); }); quitToMainMenuButton?.addEventListener('click', () => { playSfx('menuClose'); hideMenu(); showMainMenu(); }); closeMenuButton?.addEventListener('click', hideMenu);
    closeLeaderboardButton?.addEventListener('click', () => { hideLeaderboard(); showMainMenu(); }); backToMainMenuButton?.addEventListener('click', showMainMenu); levelSelectTroopsButton?.addEventListener('click', () => { if (!isLevelSelectOpen()) return; hideLevelSelect(); showChooseTroopsScreen(0, 'levelSelect'); }); levelSelectShopButton?.addEventListener('click', () => { if (!isLevelSelectOpen()) return; hideLevelSelect(); showShop('levelSelect', false); }); levelSelectPrevPage?.addEventListener('click', () => handleLevelSelectPageChange(-1)); levelSelectNextPage?.addEventListener('click', () => handleLevelSelectPageChange(1));
    levelSelectMapContainer?.addEventListener('mousedown', handleMapPanStart); levelSelectMapContainer?.addEventListener('touchstart', handleMapPanStartTouch, { passive: true }); // Allow scroll/zoom on map container
    levelCompleteShopButton?.addEventListener('click', () => { hideLevelComplete(); showShop('levelComplete', true); }); nextLevelButton?.addEventListener('click', () => { hideLevelComplete(); proceedToNextLevelOrLocation(); });
    shopExitButton?.addEventListener('click', () => { hideShop(); proceedAfterShopMaybe(); }); shopTroopsButton?.addEventListener('click', () => { if (!isShopOpen()) return; hideShop(); showChooseTroopsScreen(shopIsBetweenLevels ? 0 : currentLevel, 'shop'); });
    shopActionButton?.addEventListener('click', handleShopActionClick); // Central shop action button
    closeSettingsButton?.addEventListener('click', hideSettings); closeAchievementsButton?.addEventListener('click', hideAchievements);
    confirmTroopsButton?.addEventListener('click', handleConfirmTroops); troopsBackButton?.addEventListener('click', handleTroopsBack);
    fireballElement?.addEventListener('click', () => setActiveSpell('fireball')); flameWaveElement?.addEventListener('click', () => setActiveSpell('flameWave')); frostNovaElement?.addEventListener('click', () => setActiveSpell('frostNova')); healElement?.addEventListener('click', () => setActiveSpell('heal'));
    bgMusic.addEventListener('ended', selectAndLoadMusic);

     // Settings Listeners
     musicVolumeSlider?.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        setVolume('music', volume);
        if (musicVolumeValueSpan) musicVolumeValueSpan.textContent = `${Math.round(volume * 100)}%`;
    });
    musicVolumeSlider?.addEventListener('change', () => updateSetting('musicVolume', musicVolume)); // Save on release
    sfxVolumeSlider?.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        setVolume('sfx', volume);
        if (sfxVolumeValueSpan) sfxVolumeValueSpan.textContent = `${Math.round(volume * 100)}%`;
    });
    sfxVolumeSlider?.addEventListener('change', () => { playSfx('select'); updateSetting('sfxVolume', sfxVolume); }); // Save on release, play SFX
    muteToggleSetting?.addEventListener('change', (e) => toggleMute(true)); // Pass true to save setting
    fullscreenToggleSetting?.addEventListener('change', (e) => toggleFullscreen(false)); // Don't save setting here, rely on event listener
    toggleHpBarsSetting?.addEventListener('change', (e) => updateSetting('showHpBars', e.target.checked));
    playerNameSettingInput?.addEventListener('change', (e) => updateSetting('playerName', e.target.value));

    // Global touch listener for mobile fullscreen & audio init
    let firstEverTouch = true;
    document.body.addEventListener('touchstart', async (e) => {
        // Only trigger on the very first touch that isn't on an interactive element already
        if (isMobileDevice() && firstEverTouch && !e.target.closest('button, a, input, select, textarea, .icon-button, .shop-item, .level-dot, .troop-card, .spell-icon')) {
            firstEverTouch = false; // Prevent triggering again
            console.log("First body touch detected on mobile, attempting fullscreen and audio init...");
            const fsElement = document.documentElement; // Request fullscreen on the whole page
            // Don't await fullscreen, let it happen in background
            attemptEnterFullscreen(fsElement);
            if(!audioInitialized) initializeAudio(); // Initialize audio on first interaction
        }
    }, { capture: true, once: false }); // Capture needed, but don't use `once` so subsequent non-interactive touches don't re-trigger


    // Initial Setup
    preloadAssetsAndStart();
    updateMuteButtonVisual();
    updateFullscreenButton();
    requestAnimationFrame(() => { try { calculateCellSize(); } catch (e) { console.error("Initial RAF Error:", e); } });
    const mapPreload = new Image(); mapPreload.onload = () => { mapIntrinsicWidth = mapPreload.naturalWidth || 1024; mapIntrinsicHeight = mapPreload.naturalHeight || 1024; }; mapPreload.onerror = () => { mapIntrinsicWidth = 1024; mapIntrinsicHeight = 1024; }; mapPreload.src = WORLD_MAP_IMAGE_URL;
});