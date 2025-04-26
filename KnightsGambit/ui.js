// ui.js

// --- Variable Declarations (Keep as is) ---
let gameContainer, gameBoardWrapper, gameBoard, gridContent, uiPanel, levelDisplayElement,
    spellAreaElement, fireballElement, flameWaveElement, frostNovaElement, healElement,
    unitInfo, unitPortraitElement, actionsLeftDisplayElement, unitNameDisplay,
    unitAtkDisplay, unitMovDisplay, unitRngDisplay, unitStatusDisplay,
    unitHpBarContainer, unitHpBarElement, boardFeedbackArea, endTurnButton,
    mainMenu, startGameButton, leaderboardMenuButton,
    gameOverScreen, restartButton, gameOverTitle, gameOverMessage, gameOverToTitleButton,
    tooltipElement, menuButton, menuOverlay, closeMenuButton, quitButton,
    quitToMainMenuButton, menuActionButtons, fullscreenButton, muteButton,
    restartLevelIconButton, leaderboardOverlay, leaderboardList,
    closeLeaderboardButton, levelSelectScreen, levelSelectMapContainer, levelSelectMap,
    levelSelectDotsLayer, backToMainMenuButton, menuGoldAmountElement, menuGoldDisplay,
    shopScreen, shopItemsContainer, shopGoldAmountElement, shopGoldDisplay,
    shopExitButton, shopFeedbackElement, levelCompleteScreen, levelCompleteTitle,
    levelCompleteStats, statsEnemiesKilled, statsUnitsLost, statsGoldGained,
    levelCompleteBonuses, statsBonusList, statsTotalGold, nextLevelButton,
    levelCompleteShopButton, defaultViewButton, chooseTroopsScreen, chooseTroopsTitle,
    currentTroopsList, availableTroopsList, currentRosterCountElement, chooseTroopsFeedback,
    confirmTroopsButton, troopsBackButton, levelSelectTroopsButton, shopTroopsButton,
    unitHpBarsOverlay, toggleHpBarsSetting, levelSelectShopButton;

let currentCellSize = 30;
let gridContentOffsetX = 0; let gridContentOffsetY = 0;
let currentZoom = 1;
const MAX_ZOOM = 3.0;
let isPanning = false; let panStartX = 0; let panStartY = 0;
let gridStartPanX = 0; let gridStartPanY = 0;
let resizeTimeout = null;
let cellElementsMap = new Map();
let highlightedAttackCells = [];
let currentMouseX = 0; let currentMouseY = 0;
let tooltipUpdateInterval = null;
let shopIsBetweenLevels = false;
let lastHoveredElement = null;

let mapZoom = 1; let mapOffsetX = 0; let mapOffsetY = 0;
const MIN_MAP_ZOOM = 1; const MAX_MAP_ZOOM = 5;
let isMapPanning = false; let mapPanStartX = 0; let mapPanStartY = 0;
let mapStartPanX = 0; let mapStartPanY = 0;
let mapIntrinsicWidth = 1024; let mapIntrinsicHeight = 1024;

let currentShopOrigin = '';
let troopScreenOrigin = '';
let levelToStartAfterManage = 0;
let worldHpBars = new Map();
let shouldShowTroopsAfterPurchase = false;

// --- Function Definitions ---

function calculateCellSize() {
    if (!gameBoard) return;
    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;
    if (boardWidth <= 1 || boardHeight <= 1) {
        currentCellSize = Math.max(currentCellSize || 20, 20);
        document.documentElement.style.setProperty('--cell-size', `${currentCellSize}px`);
        return;
    }
    const cellWidth = Math.floor(boardWidth / currentGridCols);
    const cellHeight = Math.floor(boardHeight / currentGridRows);
    currentCellSize = Math.max(10, Math.min(cellWidth, cellHeight));
    document.documentElement.style.setProperty('--cell-size', `${currentCellSize}px`);
}

function applyLayout() {
    if (currentCellSize < 10) calculateCellSize();
    if (currentCellSize < 10 || !gridContent || !gameBoard) return;

    const gridWidthPx = `${currentGridCols * currentCellSize}px`;
    const gridHeightPx = `${currentGridRows * currentCellSize}px`;
    if (gridContent.style.width !== gridWidthPx) gridContent.style.width = gridWidthPx;
    if (gridContent.style.height !== gridHeightPx) gridContent.style.height = gridHeightPx;
    const gridTemplateColsStr = `repeat(${currentGridCols}, 1fr)`;
    const gridTemplateRowsStr = `repeat(${currentGridRows}, 1fr)`;
    if (gridContent.style.gridTemplateColumns !== gridTemplateColsStr) gridContent.style.gridTemplateColumns = gridTemplateColsStr;
    if (gridContent.style.gridTemplateRows !== gridTemplateRowsStr) gridContent.style.gridTemplateRows = gridTemplateRowsStr;

    cellElementsMap.forEach(cell => { cell.style.width = `var(--cell-size)`; cell.style.height = `var(--cell-size)`; });
    units.forEach(unit => { if (unit.element && isUnitAliveAndValid(unit)) updateUnitPosition(unit, true); });
    obstacles.forEach(obs => { if (obs.element && isObstacleIntact(obs)) updateObstaclePosition(obs); });
    items.forEach(item => { if (item.element && !item.collected) updateItemPosition(item); });
    applyZoomAndPan();
    if (gameSettings.showHpBars) updateWorldHpBars();
}

const handleResize = () => {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const overlayVisible = isAnyOverlayVisible();
        if (!isGameActive() && !isLevelSelectOpen() && !isChooseTroopsScreenOpen()) return;
        requestAnimationFrame(() => {
            try {
                if(isGameActive() && !overlayVisible) { calculateCellSize(); applyLayout(); centerView(true); }
                else if (isLevelSelectOpen()) applyMapZoomAndPan();
            } catch (e) { console.error("Resize error:", e); }
        });
    }, 150);
};

function setupBoard(tilesetUrl) {
    if (!gridContent) return;
    gridContent.innerHTML = '';
    cellElementsMap.clear(); worldHpBars.clear();
    calculateCellSize();
    gridContent.style.width = `${currentGridCols * currentCellSize}px`;
    gridContent.style.height = `${currentGridRows * currentCellSize}px`;
    gridContent.style.gridTemplateColumns = `repeat(${currentGridCols}, 1fr)`;
    gridContent.style.gridTemplateRows = `repeat(${currentGridRows}, 1fr)`;
    gridContent.style.setProperty('--grid-cols', currentGridCols);
    gridContent.style.setProperty('--grid-rows', currentGridRows);
    gridContentOffsetX = 0; gridContentOffsetY = 0; currentZoom = 1; applyZoomAndPan();
    if (!unitHpBarsOverlay) {
        unitHpBarsOverlay = document.createElement('div');
        unitHpBarsOverlay.id = 'unit-hp-bars-overlay';
        unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars);
        gridContent.appendChild(unitHpBarsOverlay);
    } else {
        unitHpBarsOverlay.innerHTML = '';
        unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars);
        gridContent.appendChild(unitHpBarsOverlay);
    }

    const fragment = document.createDocumentFragment();
    for (let r = 0; r < currentGridRows; r++) {
        for (let c = 0; c < currentGridCols; c++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell'; cell.dataset.x = c; cell.dataset.y = r;
            cell.addEventListener('click', handleCellClick); cell.addEventListener('mouseenter', handleCellMouseEnter); cell.addEventListener('mouseleave', handleCellMouseLeave);
            fragment.appendChild(cell); cellElementsMap.set(`${c},${r}`, cell);
        }
    }
    gridContent.appendChild(fragment);
    const cssUrl = tilesetUrl ? `url('${tilesetUrl}')` : '';
    document.documentElement.style.setProperty('--current-tileset-url', cssUrl);
}

function renderAll() {
    if (!gridContent) return;
    gridContent.querySelectorAll('.unit, .item, .obstacle, .projectile, .effect').forEach(el => {
        if (!el.classList.contains('unit-hp-bar-world')) el.remove();
    });
    const fragment = document.createDocumentFragment();
    obstacles.forEach(obs => { if (isObstacleIntact(obs)) renderObstacle(obs, fragment); });
    items.forEach(item => { if (!item.collected) renderItem(item, fragment); updateCellItemStatus(item.x, item.y); });
    units.forEach(unit => { if (isUnitAliveAndValid(unit)) renderUnit(unit, fragment); });
    gridContent.appendChild(fragment);
}

function renderUnit(unit, parentElement = gridContent) {
    if (!parentElement || !unit) return null;
    unit.element?.remove();
    const el = document.createElement('div');
    el.className = `unit ${unit.team}`; el.dataset.id = unit.id;
    el.style.backgroundImage = unit.spriteUrl ? `url('${unit.spriteUrl}')` : '';
    el.alt = unit.name;
    el.addEventListener('click', (ev) => handleUnitClick(ev, unit));
    unit.element = el; parentElement.appendChild(el);
    setUnitVariantClass(unit); updateUnitPosition(unit, true); updateUnitVisualState(unit);
    return el;
}

function renderObstacle(obstacle, parentElement = gridContent) {
    if (!parentElement || !obstacle) return null; obstacle.element?.remove();
    const data = OBSTACLE_DATA[obstacle.type]; if (!data) return null;
    const el = document.createElement('div'); el.className = `obstacle ${data.spriteClass}`; el.dataset.id = obstacle.id;
    el.alt = obstacle.type;
    if (obstacle.type === 'door' && obstacle.isVertical) el.classList.add('vertical');
    el.addEventListener('click', (ev) => handleObstacleClick(ev, obstacle));
    obstacle.element = el; parentElement.appendChild(el);
    updateObstaclePosition(obstacle); updateCellObstacleStatus(obstacle.x, obstacle.y); return el;
}

function renderItem(item, parentElement = gridContent) {
     if (!parentElement || !item) return null; item.element?.remove();
     const data = ITEM_DATA[item.type]; if (!data) return null;
     const el = document.createElement('div'); el.className = `item ${data.spriteClass}`; el.dataset.id = item.id;
     el.dataset.x = item.x; el.dataset.y = item.y; el.style.zIndex = data.zIndex || 7;
     el.alt = item.type;
     if (item.type === 'chest' && item.opened) el.classList.add('opened');
     el.addEventListener('click', (ev) => handleItemClick(ev, item));
     item.element = el; parentElement.appendChild(el); updateItemPosition(item); return el;
}

function updateUnitPosition(unit, forceUpdate = false) {
    if (!unit?.element || unit.element.classList.contains('dead')) return;
    const targetCol = unit.x + 1; const targetRow = unit.y + 1;
    unit.element.style.setProperty('--unit-x', targetCol); unit.element.style.setProperty('--unit-y', targetRow);
    if (!unit.element.classList.contains('is-moving') || forceUpdate) updateUnitVisualPositionOnly(unit.element, unit.x, unit.y);
    if (gameSettings.showHpBars && typeof updateWorldHpBarPosition === 'function') updateWorldHpBarPosition(unit);
}

function updateUnitVisualState(unit) {
     if (!unit?.element || unit.element.classList.contains('dead')) return;
     const el = unit.element; const isSelected = selectedUnit?.id === unit.id; const isActed = unit.acted && !levelClearedAwaitingInput;
     el.classList.toggle('acted', isActed); el.classList.toggle('selected', isSelected); el.classList.toggle('frozen', unit.isFrozen); el.classList.toggle('netted', unit.isNetted); el.classList.toggle('slowed', unit.isSlowed); el.classList.toggle('in-tower', !!unit.inTower);
     setUnitVariantClass(unit);
}

function updateUnitVisualPositionOnly(element, x, y) {
     if (!element || !isCellInBounds(x,y)) return;
     element.style.setProperty('--unit-x', x + 1); element.style.setProperty('--unit-y', y + 1);
}

function updateObstaclePosition(obstacle) {
     if (!obstacle?.element) return;
     obstacle.element.style.setProperty('--obs-x', obstacle.x + 1); obstacle.element.style.setProperty('--obs-y', obstacle.y + 1);
     if (obstacle.type === 'door') obstacle.element.classList.toggle('vertical', obstacle.isVertical);
}

function updateItemPosition(item) {
    if (!item?.element) return;
    // Update the CSS variables used by the CSS for left/top positioning
    item.element.style.setProperty('--item-grid-x', item.x);
    item.element.style.setProperty('--item-grid-y', item.y);
    // Update the stacking index variable
    item.element.style.setProperty('--stackIndex', item.stackIndex || 0);
    // CSS transform handles the rest (centering, stacking)
}

function updateCellObstacleStatus(x, y) {
    if (!isCellInBounds(x, y)) return;
    const cell = getCellElement(x, y); if (!cell) return;
    const hasIntactObstacle = obstacles.some(obs => obs.x === x && obs.y === y && isObstacleIntact(obs));
    cell.classList.toggle('has-obstacle', hasIntactObstacle);
}

function updateCellItemStatus(x, y) {
    if (!isCellInBounds(x, y)) return;
    const cell = getCellElement(x, y); if (!cell) return;
    const hasVisibleItem = items.some(item => item.x === x && item.y === y && !item.collected && (item.type !== 'chest' || !item.opened));
    cell.classList.toggle('has-item', hasVisibleItem);
}

function setUnitVariantClass(unit) {
    if (!unit?.element || unit.team !== 'enemy') return;
    const element = unit.element;
    element.classList.remove('goblin-red', 'goblin-blue', 'goblin-yellow', 'goblin-green');
    if (unit.variantType && unit.variantType !== 'green') element.classList.add(`goblin-${unit.variantType}`);
    else if (unit.type.startsWith('goblin')) element.classList.add('goblin-green');
}

function showPopup(x, y, text, className) {
    if (!gridContent || !isCellInBounds(x,y)) return;
    const p = document.createElement('div'); p.className = `popup ${className}`; p.textContent = text;
    const popupX = (x + 0.5) * currentCellSize; const popupY = (y + 0.5) * currentCellSize - (currentCellSize * 0.5);
    p.style.left = `${popupX}px`; p.style.top = `${popupY}px`; gridContent.appendChild(p);
    setTimeout(() => p.remove(), POPUP_DURATION_MS);
}
function showDamagePopup(x, y, damage) { showPopup(x, y, `-${damage}`, 'damage-popup'); }
function showFreezePopup(x, y) { showPopup(x, y, `Frozen!`, 'freeze-popup'); }
function showHealPopup(x, y, amount) { showPopup(x, y, `+${amount}`, 'heal-popup'); }
function showGoldPopup(x, y, amount) { showPopup(x, y, `+${amount} G`, 'gold-popup'); }
function showGemPopup(x, y, amount) { showPopup(x, y, `+${amount} G`, 'gem-popup'); }

function flashElementOnHit(element) {
    if (element && !element.classList.contains('unit-hit-flash')) {
        element.classList.add('unit-hit-flash'); setTimeout(() => element?.classList.remove('unit-hit-flash'), 200);
    }
}

function showFeedback(message, type = '', duration = 2500) {
    if (!boardFeedbackArea) return;
    boardFeedbackArea.innerHTML = message; boardFeedbackArea.className = `board-feedback-area ${type}`;
    const typeDurations = { 'feedback-gold': 1500, 'feedback-cheat': 1500, 'feedback-levelup': 2000, 'feedback-turn': 1200, 'feedback-error': 2000 };
    duration = typeDurations[type] || duration;
    boardFeedbackArea.style.opacity = '1'; boardFeedbackArea.style.display = 'flex';
    if (boardFeedbackArea.timeoutId) clearTimeout(boardFeedbackArea.timeoutId);
    boardFeedbackArea.timeoutId = setTimeout(() => {
        boardFeedbackArea.style.opacity = '0';
        setTimeout(() => { if (boardFeedbackArea.style.opacity === '0') { boardFeedbackArea.innerHTML = ''; boardFeedbackArea.style.display = 'none'; boardFeedbackArea.className = 'board-feedback-area'; } }, 500);
    }, duration - 500);
}

function updateLevelDisplay() { if (levelDisplayElement) levelDisplayElement.textContent = `Level: ${currentLevel}`; }
function updateGoldDisplay() { if (menuGoldAmountElement) menuGoldAmountElement.textContent = playerGold; if (shopGoldAmountElement) shopGoldAmountElement.textContent = playerGold; }

function updateSpellUI() {
    if (!spellAreaElement) return;
    const spellData = [ { el: fireballElement, name: 'fireball', unlock: FIREBALL_UNLOCK_LEVEL }, { el: flameWaveElement, name: 'flameWave', unlock: FLAME_WAVE_UNLOCK_LEVEL }, { el: frostNovaElement, name: 'frostNova', unlock: FROST_NOVA_UNLOCK_LEVEL }, { el: healElement, name: 'heal', unlock: HEAL_UNLOCK_LEVEL } ];
    const hotkeys = ['1', '2', '3', '4'];
    spellData.forEach((s, index) => {
        if (!s.el) return;
        const spellName = s.name; const normallyUnlocked = currentLevel >= s.unlock; const cheatActive = unlimitedSpellsCheat; const isUnlocked = normallyUnlocked || cheatActive;
        const canUseSpell = (spellUses[spellName] === true || cheatActive);
        const isSelected = currentSpell === spellName; const hotkey = hotkeys[index];
        s.el.className = 'spell-icon';
        const labelSibling = s.el.nextElementSibling; const baseTitle = labelSibling?.classList.contains('spell-label') ? labelSibling.textContent : spellName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        let title = baseTitle;
        if (!isUnlocked) { s.el.classList.add('locked'); title += ` (Unlock Lvl ${s.unlock})`; }
        else if (!canUseSpell) { s.el.classList.add('used'); title += ` (Used)`; }
        else { s.el.classList.add('available'); if (isSelected) { s.el.classList.add('selected'); title = `CASTING: ${title} (Esc to Cancel)`; } else { const effect = getSpellEffectDescription(spellName); title += ` - ${effect} [${hotkey}]`; } if (cheatActive && canUseSpell) { s.el.classList.add('cheat-available'); title += ` (Cheat Active)`; } }
        s.el.title = title;
        const label = s.el.nextElementSibling;
        if (label?.classList.contains('spell-label')) {
            if (!isUnlocked) label.style.color = '#888'; else if (!canUseSpell) label.style.color = '#999'; else if (cheatActive && canUseSpell) label.style.color = '#69f0ae'; else label.style.color = '';
        }
    });
    if (gameBoard) { gameBoard.className = 'game-board'; if(isPanning) gameBoard.classList.add('panning'); if(currentSpell) gameBoard.classList.add(`${currentSpell}-targeting`); }
}

function getSpellEffectDescription(spellName) {
    try {
        switch (spellName) {
            case 'fireball': return `Deal ${getSpellEffectValue(spellName, FIREBALL_BASE_DAMAGE)} DMG`;
            case 'flameWave': return `Deal ${getSpellEffectValue(spellName, FLAME_WAVE_BASE_DAMAGE)} DMG to Row`;
            case 'frostNova': const radiusLevel = getFrostNovaRadiusLevel(); const areaDim = radiusLevel + 2; return `Freeze ${areaDim}x${areaDim} area (${FROST_NOVA_BASE_DURATION} turns)`;
            case 'heal': return `Heal ${getSpellEffectValue(spellName, HEAL_BASE_AMOUNT)} HP`;
            default: return '';
        }
    } catch (e) { console.error("Spell description error:", e); return "Effect Error"; }
}

function updateTurnDisplay() {
    if (!actionsLeftDisplayElement || !endTurnButton) return; const isPlayer = currentTurn === 'player';
    let actionsText = '', buttonText = `<span class="hotkey-e">E</span>nd Turn`, buttonTitle = "End Player Turn [E]";
    let isButtonDisabled = false, hasDisabledClass = false, isNextLevelMode = false;
    if (levelClearedAwaitingInput) { actionsText = 'Level Cleared!'; buttonText = `Proc<span class="hotkey-e">e</span>ed`; buttonTitle = "Proceed [E]"; isNextLevelMode = true; isButtonDisabled = isProcessing; hasDisabledClass = isProcessing; }
    else if (isPlayer) { const remainingActions = units.reduce((count, unit) => count + (unit.team==='player' && !unit.acted && !unit.isFrozen && !unit.isNetted && isUnitAliveAndValid(unit) ? 1 : 0), 0); actionsText = `Actions Left: ${remainingActions}`; isButtonDisabled = isProcessing; hasDisabledClass = isProcessing; }
    else { actionsText = `Enemy Turn...`; buttonTitle = "Enemy Turn"; isButtonDisabled = true; hasDisabledClass = true; }
    actionsLeftDisplayElement.textContent = actionsText; endTurnButton.innerHTML = buttonText; endTurnButton.title = buttonTitle; endTurnButton.disabled = isButtonDisabled; endTurnButton.classList.toggle('disabled', hasDisabledClass); endTurnButton.classList.toggle('next-level-mode', isNextLevelMode);
}

function updateUnitInfo(unit) {
    const infoHpTextElement = unitInfo?.querySelector('.unit-hp-text'); const infoHpBarElement = unitInfo?.querySelector('.unit-hp-bar');
    if (!unitInfo || !infoHpTextElement || !infoHpBarElement || !unitNameDisplay || !unitAtkDisplay || !unitMovDisplay || !unitRngDisplay || !unitStatusDisplay || !unitPortraitElement) return;
    const show = unit && isUnitAliveAndValid(unit);
    if (show) {
        unitNameDisplay.textContent = unit.name; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0;
        infoHpTextElement.textContent = `${unit.hp}/${unit.maxHp}`; infoHpBarElement.style.setProperty('--hp-percent', `${hpPercent}%`);
        const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); infoHpBarElement.dataset.hpLevel = hpLevel;
        unitAtkDisplay.textContent = `ATK: ${unit.atk}`; unitMovDisplay.textContent = `MOV: ${unit.mov}`; unitRngDisplay.textContent = unit.currentRange > 1 ? `RNG: ${unit.currentRange}` : ''; unitRngDisplay.style.display = unit.currentRange > 1 ? 'block' : 'none';
        let statusText = ''; if (unit.isFrozen) statusText = `❄️ Frozen (${unit.frozenTurnsLeft}t)`; else if (unit.isNetted) statusText = `🕸️ Netted (${unit.nettedTurnsLeft}t)`; else if (unit.isSlowed) statusText = `🐌 Slowed (${unit.slowedTurnsLeft}t)`; if (unit.inTower) statusText += (statusText ? ' | ' : '') + `🏰 In Tower`;
        unitStatusDisplay.textContent = statusText; unitStatusDisplay.style.display = statusText ? 'block' : 'none';
        const portraitUrl = unit.portraitUrl; if (portraitUrl) { const currentBg = unitPortraitElement.style.backgroundImage; const newBg = `url("${portraitUrl}")`; if (currentBg !== newBg) unitPortraitElement.style.backgroundImage = newBg; unitPortraitElement.style.opacity = '1'; } else { unitPortraitElement.style.backgroundImage = ''; unitPortraitElement.style.opacity = '0'; }
        unitInfo.parentElement.style.display = ''; unitInfo.style.display = 'grid';
    } else {
        unitInfo.style.display = 'none'; unitPortraitElement.style.opacity = '0'; unitNameDisplay.textContent = ''; infoHpTextElement.textContent = ''; infoHpBarElement.style.setProperty('--hp-percent', '0%'); infoHpBarElement.dataset.hpLevel = 'empty'; unitAtkDisplay.textContent = ''; unitMovDisplay.textContent = ''; unitRngDisplay.textContent = ''; unitStatusDisplay.textContent = ''; unitRngDisplay.style.display = ''; unitStatusDisplay.style.display = '';
    }
}

function updateUnitInfoDisplay(unit) {
    const unitIdToShow = unit?.id ?? null; const isUnitSelected = selectedUnit?.id === unitIdToShow; const isHoveringThisUnit = lastHoveredElement?.matches('.unit') && lastHoveredElement.dataset.id === unitIdToShow;
    if (isUnitSelected || (!selectedUnit && isHoveringThisUnit)) updateUnitInfo(unit); else if (!selectedUnit && !isHoveringThisUnit) updateUnitInfo(null);
    if (tooltipElement?.classList.contains('visible') && isHoveringThisUnit) showTooltip(unit, 'unit');
}

// ui.js

function updateUnitInfoOnDeath(deadUnitId) {
    let panelWasHidden = false;

    if (selectedUnit?.id === deadUnitId) {
        if (typeof deselectUnit === 'function') {
            deselectUnit(false);
            panelWasHidden = true;
        } else {
             console.warn("deselectUnit function not found, manually calling updateUnitInfo(null).");
             if(typeof updateUnitInfo === 'function') {
                updateUnitInfo(null);
             }
             panelWasHidden = true;
        }
    }

    if (!panelWasHidden &&
        !selectedUnit &&
        lastHoveredElement?.matches('.unit') &&
        lastHoveredElement.dataset.id === deadUnitId)
    {
        if(typeof updateUnitInfo === 'function') {
            updateUnitInfo(null);
        }
        panelWasHidden = true;
    }

    if (tooltipElement?.classList.contains('visible') &&
        lastHoveredElement?.matches('.unit') &&
        lastHoveredElement.dataset.id === deadUnitId)
    {
        hideTooltip();
        lastHoveredElement = null;
    }
}

function updateUiForNewLevel() {
    updateLevelDisplay(); updateGoldDisplay(); updateUnitInfo(null);
    if (boardFeedbackArea) { if (boardFeedbackArea.timeoutId) clearTimeout(boardFeedbackArea.timeoutId); boardFeedbackArea.innerHTML = ''; boardFeedbackArea.className = 'board-feedback-area'; boardFeedbackArea.style.opacity = '1'; boardFeedbackArea.style.display = 'none'; }
    if (endTurnButton) { endTurnButton.innerHTML = `<span class="hotkey-e">E</span>nd Turn`; endTurnButton.title = "End Player Turn (E)"; endTurnButton.classList.remove('next-level-mode', 'disabled'); endTurnButton.disabled = false; }
    if (gameBoard) gameBoard.className = 'game-board';
    updateSpellUI(); clearSpellHighlights(); clearHighlights(); hideAllOverlays(); updateShopDisplay(); updateChooseTroopsScreen(); updateFullscreenButton(); updateMuteButtonVisual(); startTooltipUpdater(); gameBoardWrapper?.classList.add('active'); if(defaultViewButton) defaultViewButton.classList.add('hidden');
}

function updateQuitButton() {
    if (!quitButton) return;
    const canForfeit = playerActionsTakenThisLevel >= FORFEIT_MOVE_THRESHOLD;

    if (canForfeit) {
        quitButton.textContent = "Forfeit Level";
        quitButton.title = "Forfeit Level (Incurs Penalty)";
        quitButton.dataset.action = "forfeit";
    } else {
        quitButton.textContent = "Quit to Level Select";
        quitButton.title = "Quit to Level Select (No Penalty)";
        quitButton.dataset.action = "quit";
    }
}

function getCellElement(x, y) { return cellElementsMap.get(`${x},${y}`); }

function clearHighlights() { gridContent?.querySelectorAll('.valid-move, .valid-attack-target, .valid-cleave-target, .can-be-primary-target').forEach(c => c.classList.remove('valid-move', 'valid-attack-target', 'valid-cleave-target', 'can-be-primary-target')); highlightedAttackCells = []; }

function showAttackHoverHighlights(attacker, primaryTargetPos) {
    if (!attacker || !primaryTargetPos || !isUnitAliveAndValid(attacker)) return; clearAttackHoverHighlights();
    const primaryCell = getCellElement(primaryTargetPos.x, primaryTargetPos.y); if (primaryCell) primaryCell.classList.add('valid-attack-target');
    if (attacker.type !== 'champion' || attacker.cleaveDamage <= 0) return;
    const attackDirX = Math.sign(primaryTargetPos.x - attacker.x); const attackDirY = Math.sign(primaryTargetPos.y - attacker.y); if (attackDirX === 0 && attackDirY === 0) return;
    const coords = []; const px = primaryTargetPos.x, py = primaryTargetPos.y;
    if (attackDirX !== 0) coords.push({x:px, y:py-1}, {x:px, y:py+1}, {x:px+attackDirX, y:py}); else if (attackDirY !== 0) coords.push({x:px-1, y:py}, {x:px+1, y:py}, {x:px, y:py+attackDirY}); else coords.push({x:px-1, y:py}, {x:px+1, y:py}, {x:px, y:py-1}, {x:px, y:py+1});
    coords.forEach(({ x, y }) => {
        if (!isCellInBounds(x, y)) return; const secondaryUnit = getUnitAt(x, y); const primaryTargetObject = getUnitAt(px, py) || getObstacleAt(px, py);
        if (secondaryUnit && isUnitAliveAndValid(secondaryUnit) && secondaryUnit.team !== attacker.team) { if (!primaryTargetObject || secondaryUnit.id !== primaryTargetObject.id) getCellElement(x, y)?.classList.add('valid-cleave-target'); }
        const secondaryObstacle = getObstacleAt(x,y); if (secondaryObstacle && secondaryObstacle.destructible) { if (!primaryTargetObject || secondaryObstacle.id !== primaryTargetObject.id) getCellElement(x, y)?.classList.add('valid-cleave-target'); }
    });
}

function clearAttackHoverHighlights() { gridContent?.querySelectorAll('.valid-attack-target, .valid-cleave-target').forEach(c => c.classList.remove('valid-attack-target', 'valid-cleave-target')); }

function highlightMovesAndAttacks(unit) {
    clearHighlights(); if (!unit || (!levelClearedAwaitingInput && unit.acted && !unit.canMoveAndAttack) || unit.isFrozen || !isUnitAliveAndValid(unit)) return;
    const moves = getValidMoves(unit); const attacks = getValidAttackTargets(unit); moves.forEach(p => { getCellElement(p.x, p.y)?.classList.add('valid-move'); });
    highlightedAttackCells = []; const isChampion = (unit.type === 'champion');
    attacks.units.forEach(targetId => { const target = units.find(u => u.id === targetId); if (target && isUnitAliveAndValid(target)) { const cell = getCellElement(target.x, target.y); if (cell) { cell.classList.add(isChampion ? 'can-be-primary-target' : 'valid-attack-target'); highlightedAttackCells.push(cell); } } });
    attacks.obstacles.forEach(targetId => { const target = obstacles.find(o => o.id === targetId); if (target && isObstacleIntact(target)) { const cell = getCellElement(target.x, target.y); if (cell) { cell.classList.add(isChampion ? 'can-be-primary-target' : 'valid-attack-target'); highlightedAttackCells.push(cell); } } });
}

function highlightFrostNovaArea(centerX, centerY) {
    clearFrostNovaPreview(); // Clear previous preview first

    const radiusLevel = getFrostNovaRadiusLevel(); // Get current radius level
    const radius = radiusLevel; // Radius defines half-width/height for the square

    // Iterate through the square area
    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            const targetX = centerX + dx;
            const targetY = centerY + dy;

            if (isCellInBounds(targetX, targetY) && !getObstacleAt(targetX, targetY)?.blocksMove) {
                getCellElement(targetX, targetY)?.classList.add('frost-aoe-preview');
            }
        } // end dy loop
    } // end dx loop
}
function clearFrostNovaPreview() { gridContent?.querySelectorAll('.frost-aoe-preview').forEach(c => c.classList.remove('frost-aoe-preview')); }

function highlightFlameWaveArea(targetRow) {
    clearFlameWaveHighlight(); if (!isCellInBounds(0, targetRow)) return;
    for (let x = 0; x < currentGridCols; x++) { const cell = getCellElement(x, targetRow); const obs = getObstacleAt(x, targetRow); if (cell && (!obs || !obs.blocksLOS)) cell.classList.add('flame-wave-preview-row'); }
}
function clearFlameWaveHighlight() { gridContent?.querySelectorAll('.flame-wave-preview-row').forEach(c => c.classList.remove('flame-wave-preview-row')); }

function selectUnit(unit) {
    if (!unit || unit.team !== 'player' || currentTurn !== 'player' || isProcessing || !isUnitAliveAndValid(unit)) return;
    if ((!levelClearedAwaitingInput && unit.acted && !unit.canMoveAndAttack) || unit.isFrozen) { let feedback = "Cannot select unit."; if (unit.isFrozen) feedback = "Unit is Frozen!"; else if (unit.isNetted) feedback = "Unit is Netted!"; else if (unit.acted) feedback = "Unit already acted."; showFeedback(feedback, "feedback-error"); playSfx('error'); return; }
    if (currentSpell) setActiveSpell(null); if (selectedUnit === unit) return;
    if (selectedUnit && selectedUnit.element) updateUnitVisualState(selectedUnit);
    selectedUnit = unit; if (unit.element) updateUnitVisualState(unit);
    highlightMovesAndAttacks(unit); updateUnitInfo(unit); playSfx('select');
}

function deselectUnit(playSound = true) {
    if (selectedUnit) { if (selectedUnit.element) updateUnitVisualState(selectedUnit); selectedUnit = null; clearHighlights(); if (playSound) playSfx('select'); clearAttackHoverHighlights(); updateUnitInfo(null); }
}

function trackMousePosition(event) { currentMouseX = event.clientX; currentMouseY = event.clientY; }

function updateTooltip() {
    if (!tooltipElement || isPanning || isMapPanning || (!gameBoardWrapper && !isLevelSelectOpen() && !isChooseTroopsScreenOpen()) || isAnyOverlayVisible(true)) { if (tooltipElement.classList.contains('visible')) hideTooltip(); lastHoveredElement = null; return; }
    const el = document.elementFromPoint(currentMouseX, currentMouseY);
    let targetElement = null; let targetData = null; let type = null;
    const shopItemEl = el?.closest('.shop-item'); const spellIconEl = el?.closest('.spell-icon'); const goldDisplayEl = el?.closest('.menu-like-gold-display'); const unitEl = el?.closest('.unit:not(.dead):not(.fading-out)'); const itemEl = el?.closest('.item:not(.collected)'); const obstacleEl = el?.closest('.obstacle:not(.destroyed)'); const levelDotEl = el?.closest('.level-dot'); const passiveItemEl = el?.closest('.shop-item[data-item-id^="passive_"]'); const troopCardEl = el?.closest('.troop-card');

    if (troopCardEl && isChooseTroopsScreenOpen()) { targetData = troopCardEl; type = 'troopCard'; targetElement = troopCardEl;}
    else if (passiveItemEl && (isShopOpen() || isChooseTroopsScreenOpen()) ) { targetData = passiveItemEl; type = 'passive'; targetElement = passiveItemEl; }
    else if (shopItemEl && (isShopOpen() || isChooseTroopsScreenOpen())) { targetData = shopItemEl; type = 'shop'; targetElement = shopItemEl; }
    else if (spellIconEl && (isGameActive() || isShopOpen())) { targetData = spellIconEl; type = 'spell'; targetElement = spellIconEl; }
    else if (goldDisplayEl && (isShopOpen() || isMenuOpen() || isChooseTroopsScreenOpen())) { targetData = playerGold; type = 'gold'; targetElement = goldDisplayEl; }
    else if (levelDotEl && isLevelSelectOpen()) { targetData = levelDotEl; type = 'levelDot'; targetElement = levelDotEl; }
    else if (unitEl && isGameActive()) { targetData = units.find(u => u.id === unitEl.dataset.id && isUnitAliveAndValid(u)); if (targetData) { type = 'unit'; targetElement = unitEl; } }
    else if (itemEl && isGameActive()) { targetData = items.find(i => i.id === itemEl.dataset.id && !i.collected); if (targetData) { type = 'item'; targetElement = itemEl; } }
    else if (obstacleEl && isGameActive()) { targetData = obstacles.find(o => o.id === obstacleEl.dataset.id && isObstacleIntact(o)); if (targetData) { type = 'obstacle'; targetElement = obstacleEl; } }

    if (targetElement && targetData) {
        if (lastHoveredElement !== targetElement) { showTooltip(targetData, type); lastHoveredElement = targetElement; if (type === 'unit' && !selectedUnit && currentTurn === 'player' && !isProcessing && isGameActive()) { updateUnitInfo(targetData); } else if (lastHoveredElement?.matches('.unit') && type !== 'unit' && !selectedUnit && !el?.closest('#unit-info') && isGameActive()) { updateUnitInfo(null); } }
        else { positionTooltip(); }
    } else { if (lastHoveredElement !== null) { hideTooltip(); if (lastHoveredElement.matches('.unit') && !selectedUnit && currentTurn === 'player' && !isProcessing && !el?.closest('#unit-info') && isGameActive()) { updateUnitInfo(null); } lastHoveredElement = null; } }
}

function startTooltipUpdater() { stopTooltipUpdater(); tooltipUpdateInterval = setInterval(updateTooltip, 100); }
function stopTooltipUpdater() { if (tooltipUpdateInterval) { clearInterval(tooltipUpdateInterval); tooltipUpdateInterval = null; } hideTooltip(); }

function showTooltip(data, type) {
    if (!tooltipElement || !data) { hideTooltip(); return; } let content = '';
    try {
        switch (type) {
            case 'unit': const unit = data; content = `<b>${unit.name}</b>`; const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))) : 0; content += `<div class="unit-hp-bar-container tooltip-hp-bar" style="--hp-percent: ${hpPercent}%;">`; const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); content += `<div class="unit-hp-bar" data-hp-level="${hpLevel}"></div><span class="unit-hp-text">${unit.hp}/${unit.maxHp}</span></div>`; let statuses = []; if (unit.isFrozen) statuses.push(`<span style="color:#aadeff;">❄️ Frozen (${unit.frozenTurnsLeft}t)</span>`); if (unit.isNetted) statuses.push(`<span style="color:#cccccc;">🕸️ Netted (${unit.nettedTurnsLeft}t)</span>`); if (unit.isSlowed) statuses.push(`<span style="color:#add8e6;">🐌 Slowed (${unit.slowedTurnsLeft}t)</span>`); if (unit.inTower) statuses.push(`<span style="color:#ffddaa;">🏰 In Tower</span>`); if (statuses.length > 0) content += `<br>` + statuses.join('<br>'); break;
            case 'item': const item = data; const itemConfig = ITEM_DATA[item.type]; if (item.type === 'gold') content = `<b>Gold Coin</b>Value: ${itemConfig.value || 1}`; else if (item.type === 'chest') content = `<b>Chest</b>`; if (item.opened) {content += `<br>Empty`; } else if (item.type === 'health_potion') content = `<b>Health Potion</b>Heals ${itemConfig.value || 1} HP`; else if (item.type === 'shiny_gem') content = `<b>Shiny Gem</b>Value: ${item.value || '?'}`; break;
            case 'obstacle': const obstacle = data; const obsConfig = OBSTACLE_DATA[obstacle.type]; content = `<b>${obstacle.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</b>`; if (obstacle.destructible) content += `<br>HP: ${obstacle.hp}/${obstacle.maxHp}`; if (obstacle.enterable) { const occupant = obstacle.occupantUnitId ? units.find(u => u.id === obstacle.occupantUnitId && isUnitAliveAndValid(u)) : null; content += `<br>${occupant ? `Occupied by ${occupant.name}` : 'Empty'}`; if(occupant?.baseRange > 1) content += ` (+${obstacle.rangeBonus} RNG)`; if(!occupant && obstacle.hp > 0) content += `<br><span style="color:#cccccc;">(Enter/Exit from below)</span>`; } if (obsConfig.blocksLOS) content += `<br><span style="color:#ffccaa;">Blocks Line of Sight</span>`; break;
            case 'shop': content = data.title || data.querySelector('h4')?.textContent || "Shop Item"; break; case 'passive': content = data.title || data.querySelector('h4')?.textContent || "Passive Upgrade"; break; case 'gold': content = `Current Gold: ${data}`; break; case 'spell': content = data.title || "Spell"; break;
            case 'levelDot': const levelDot = data; const levelNum = levelDot.dataset.level; content = `<b>Level ${levelNum}</b>`; if (levelDot.classList.contains('locked')) content += `<br><span style="color:#aaaaaa;">Locked</span>`; else if (levelDot.classList.contains('beaten')) content += `<br><span style="color:#aaffaa;">Completed</span>`; else content += `<br><span style="color:#ffaaaa;">Click to Play</span>`; break;
            case 'troopCard': const card = data; const unitType = card.dataset.unitType; const unitData = UNIT_DATA[unitType]; const countSpan = card.querySelector('.troop-count'); const count = countSpan ? countSpan.textContent : '?'; content = `<b>${unitData?.name || 'Unknown Troop'}</b>`; const parentListId = card.parentElement?.id; if (parentListId === 'current-troops-list') { content += `<br>Count: ${count} (In Roster)<br><span style="color:#ffccaa;">Click to move to Available</span>`; } else if (parentListId === 'available-troops-list') { content += `<br>Count: ${count} (Available)`; const totalActive = getTotalActiveUnits(); if(totalActive < MAX_ACTIVE_ROSTER_SIZE) content += `<br><span style="color:#aaffaa;">Click to move to Roster</span>`; else content += `<br><span style="color:#ff8888;">Roster Full!</span>`; } break;
            default: hideTooltip(); return;
        }
    } catch (e) { console.error("Tooltip error:", e); content = "Error"; }
    tooltipElement.innerHTML = content; tooltipElement.classList.add('visible'); positionTooltip();
}

function hideTooltip() { if (tooltipElement) tooltipElement.classList.remove('visible'); }

function positionTooltip() {
    if (!tooltipElement || !tooltipElement.classList.contains('visible')) return;
    const rect = tooltipElement.getBoundingClientRect(); const contRect = document.body.getBoundingClientRect();
    const offsetX = 15; const offsetY = 20; let top = currentMouseY + offsetY; let left = currentMouseX + offsetX;
    if (top + rect.height > contRect.height - 10) top = currentMouseY - rect.height - 15;
    if (left + rect.width > contRect.width - 10) left = currentMouseX - rect.width - 15;
    left = Math.max(5, left); top = Math.max(5, top);
    tooltipElement.style.left = `${left}px`; tooltipElement.style.top = `${top}px`;
}

async function animateUnitMove(unit, startX, startY, targetX, targetY) {
    return new Promise((resolve) => {
        if (!unit?.element || unit.element.classList.contains('dead')) { resolve(); return; }
        unit.element.classList.add('is-moving'); void unit.element.offsetWidth;
        unit.element.style.setProperty('--unit-x', targetX + 1); unit.element.style.setProperty('--unit-y', targetY + 1);
        let finalized = false; const transitionDuration = MOVE_ANIMATION_DURATION_MS;
        const endHandler = (e) => { if (e.target === unit.element && (e.propertyName === 'left' || e.propertyName === 'top')) finalize(); };
        const finalize = () => { if (finalized || !unit?.element) return; finalized = true; unit.element.removeEventListener('transitionend', endHandler); unit.element.classList.remove('is-moving'); updateUnitPosition(unit, true); resolve(); };
        unit.element.addEventListener('transitionend', endHandler); setTimeout(() => { if (!finalized) finalize(); }, transitionDuration + 50);
    });
}

async function animateAttack(attacker, targetPos, isRanged) {
    return new Promise(async (resolve) => {
        if (!attacker?.element || !targetPos || !gridContent) { resolve(0); return; }
        let delay = 0; const attackerElement = attacker.element; const originalZIndex = window.getComputedStyle(attackerElement).zIndex || '10'; const attackZIndex = '25';
        if (isRanged) {
            const projectile = document.createElement('div'); let projectileClass = 'arrow'; let shootSound = 'arrowShoot'; let duration = ARROW_FLY_DURATION_MS;
            projectile.className = `projectile ${projectileClass}`; const startGridX = (attacker.x + 0.5) * currentCellSize; const startGridY = (attacker.y + 0.5) * currentCellSize; const endGridX = (targetPos.x + 0.5) * currentCellSize; const endGridY = (targetPos.y + 0.5) * currentCellSize; const angle = Math.atan2(endGridY - startGridY, endGridX - startGridX) * (180 / Math.PI);
            projectile.style.left = `${startGridX}px`; projectile.style.top = `${startGridY}px`; projectile.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`; projectile.style.transition = `left ${duration}ms linear, top ${duration}ms linear`;
            gridContent.appendChild(projectile); playSfx(shootSound); requestAnimationFrame(() => { projectile.style.left = `${endGridX}px`; projectile.style.top = `${endGridY}px`; });
            delay = duration; setTimeout(() => projectile.remove(), delay);
        } else {
            const originalTransform = attackerElement.style.transform || 'translate(-50%, -50%)'; const dx = targetPos.x - attacker.x; const dy = targetPos.y - attacker.y; const tapDistance = 0.2 * currentCellSize; const targetX = dx * tapDistance; const targetY = dy * tapDistance; const targetTransform = `translate(calc(-50% + ${targetX}px), calc(-50% + ${targetY}px))`; const animTime = MOVE_ANIMATION_DURATION_MS / 2.5;
            attackerElement.style.zIndex = attackZIndex; attackerElement.style.transition = `transform ${animTime}ms ease-out`; attackerElement.style.transform = targetTransform; playSfx('move'); delay = animTime;
            setTimeout(() => { if(attackerElement?.parentNode) { attackerElement.style.transform = originalTransform; setTimeout(() => { if(attackerElement) attackerElement.style.zIndex = originalZIndex; }, 60); } }, delay + 30);
        } resolve(delay);
    });
}

async function animateNetThrow(netterUnit, targetUnit) {
     return new Promise(async (resolve) => {
        if (!netterUnit?.element || !targetUnit?.element || !gridContent) { resolve(false); return; }
        const projectile = document.createElement('div'); projectile.className = 'projectile net';
        const startX = (netterUnit.x + 0.5) * currentCellSize; const startY = (netterUnit.y + 0.5) * currentCellSize; const endX = (targetUnit.x + 0.5) * currentCellSize; const endY = (targetUnit.y + 0.5) * currentCellSize;
        projectile.style.left = `${startX}px`; projectile.style.top = `${startY}px`; projectile.style.transition = `left ${NET_FLY_DURATION_MS}ms ease-out, top ${NET_FLY_DURATION_MS}ms ease-out, transform ${NET_FLY_DURATION_MS}ms ease-in`; projectile.style.transform = 'translate(-50%, -50%) scale(0.5) rotate(0deg)';
        gridContent.appendChild(projectile); requestAnimationFrame(() => { projectile.style.left = `${endX}px`; projectile.style.top = `${endY}px`; projectile.style.transform = 'translate(-50%, -50%) scale(1) rotate(360deg)'; });
        setTimeout(() => { projectile.remove(); resolve(true); }, NET_FLY_DURATION_MS);
    });
}

// ui.js

function animateFireball(originElement, targetGridX, targetGridY) {
    // --- Input Validation ---
    if (!gridContent || !originElement || !isCellInBounds(targetGridX, targetGridY)) {
        console.error("animateFireball: Missing required elements or invalid target coords.");
        return;
    }
    const projectile = document.createElement('div');
    projectile.className = 'projectile fireball-projectile'; // Use existing class

    // --- Calculate Start Point (Center of Spell Icon - Viewport Coords) ---
    const originRect = originElement.getBoundingClientRect();
    const startX = originRect.left + originRect.width / 2;
    const startY = originRect.top + originRect.height / 2;

    // --- Calculate End Point (Center of Target Grid Cell - Viewport Coords) ---
    // 1. Find the target cell element if it exists (optional but good for verification)
    const targetCellElement = getCellElement(targetGridX, targetGridY);
    if (!targetCellElement) {
         console.error(`animateFireball: Target cell element not found for ${targetGridX},${targetGridY}`);
         // Fallback: calculate based on grid position only
         const gridRect = gridContent.getBoundingClientRect();
         // Calculate center position *within the grid's local coordinate system*
         const targetCellLocalCenterX = (targetGridX + 0.5) * currentCellSize;
         const targetCellLocalCenterY = (targetGridY + 0.5) * currentCellSize;
         // Convert local grid coords to viewport coords using current grid offset and zoom
         var endX = gridRect.left + gridContentOffsetX + (targetCellLocalCenterX * currentZoom);
         var endY = gridRect.top + gridContentOffsetY + (targetCellLocalCenterY * currentZoom);
         console.warn("Using calculated end coords due to missing cell element.");
    } else {
        // Preferred method: Get viewport coords of the actual cell element
        const targetCellRect = targetCellElement.getBoundingClientRect();
        var endX = targetCellRect.left + targetCellRect.width / 2;
        var endY = targetCellRect.top + targetCellRect.height / 2;
    }


    // --- Calculate Angle ---
    const deltaY = endY - startY;
    const deltaX = endX - startX;
    // Math.atan2(y, x) gives angle in radians from positive X-axis
    const angleRad = Math.atan2(deltaY, deltaX);
    const angleDeg = angleRad * (180 / Math.PI); // Convert to degrees for CSS

    // --- Set Initial Projectile State ---
    projectile.style.position = 'fixed'; // Use fixed positioning relative to viewport
    projectile.style.left = `${startX}px`; // Start at the spell icon center
    projectile.style.top = `${startY}px`;
    projectile.style.width = '72px'; // Set size explicitly if needed
    projectile.style.height = '72px';
    // Apply rotation centered on the sprite. Translate ensures rotation happens around center.
    projectile.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
    projectile.style.transformOrigin = 'center center'; // Explicitly set origin
    projectile.style.zIndex = '30'; // High z-index
    projectile.style.opacity = '1'; // Start visible

    // --- Define Transition ---
    // Transition 'left' and 'top' properties over the duration
    projectile.style.transition = `left ${FIREBALL_PROJECTILE_DURATION_MS}ms linear, top ${FIREBALL_PROJECTILE_DURATION_MS}ms linear`;

    // --- Append and Animate ---
    document.body.appendChild(projectile); // Append to body for reliable fixed positioning

    // Force browser repaint/reflow before applying the end state for transition
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Set the *final* screen coordinates to trigger the transition
            projectile.style.left = `${endX}px`;
            projectile.style.top = `${endY}px`;
        });
    });

    // --- Cleanup ---
    setTimeout(() => {
        projectile.remove();
        // Explosion effect is triggered in castSpell after damage now
    }, FIREBALL_PROJECTILE_DURATION_MS);
}

// Optional Helper for Explosion (ensure this exists or is integrated)
function createExplosionEffect(gridX, gridY, type) {
     if (!gridContent) return;
     let explosionClass = '';
     let duration = 500;

     if (type === 'fireball') {
         explosionClass = 'fireball-explosion';
         duration = FIREBALL_EXPLOSION_DURATION_MS;
     } // Add other types if needed

     if (explosionClass) {
         const explosion = document.createElement('div');
         explosion.className = `effect ${explosionClass}`;
         // Position the explosion relative to the grid content itself
         const centerX = (gridX + 0.5) * currentCellSize;
         const centerY = (gridY + 0.5) * currentCellSize;
         explosion.style.left = `${centerX}px`;
         explosion.style.top = `${centerY}px`;
         gridContent.appendChild(explosion); // Append to gridContent
         setTimeout(() => explosion.remove(), duration);
     }
}

function animateFlameWave(targetRow) {
    if (!gridContent) return;
    for (let x = 0; x < currentGridCols; x++) {
         const explosion = document.createElement('div');
         explosion.className = 'effect flame-wave-explosion';
         const cellCenterX = (x + 0.5) * currentCellSize;
         const cellCenterY = (targetRow + 0.5) * currentCellSize;
         explosion.style.left = `${cellCenterX}px`;
         explosion.style.top = `${cellCenterY}px`;
         explosion.style.animationDelay = `${x * FLAME_WAVE_STAGGER_DELAY_MS}ms`;
         gridContent.appendChild(explosion);
         
         const removalDelay = FIREBALL_EXPLOSION_DURATION_MS + (x * FLAME_WAVE_STAGGER_DELAY_MS);
         setTimeout(() => explosion.remove(), removalDelay); }
}

function animateFrostNova(centerX, centerY, radiusLevel) {
    if (!gridContent) return;
    const effect = document.createElement('div'); effect.className = 'effect frost-nova-effect'; const effectX = (centerX + 0.5) * currentCellSize; const effectY = (centerY + 0.5) * currentCellSize;
    effect.style.left = `${effectX}px`; effect.style.top = `${effectY}px`; effect.style.setProperty('--frost-nova-level', radiusLevel); gridContent.appendChild(effect);
    setTimeout(() => effect.remove(), 500);
}

async function handleUnitDeathAnimation(unit, deathX, deathY, timeoutMap) {
    return new Promise((resolve) => {
        if (!unit?.element || !gridContent) { resolve(); return; }
        const el = unit.element;
        el.classList.add('dead');
        el.style.pointerEvents = 'none';
        el.style.backgroundImage = unit.deadSpriteUrl ? `url('${unit.deadSpriteUrl}')` : '';
        if (!unit.deadSpriteUrl) { el.style.filter = 'grayscale(100%) brightness(50%)'; }
        el.style.zIndex = '5';
        el.style.opacity = '1';

        const fadeTimeoutId = setTimeout(() => {
            el.classList.add('fading-out');
            const removeTimeoutId = setTimeout(() => {
                el.remove();
                timeoutMap.delete(unit.id + '-remove');
                resolve();
            }, DEATH_FADE_DURATION_MS);
            timeoutMap.set(unit.id + '-remove', removeTimeoutId);
            timeoutMap.delete(unit.id + '-fade');
        }, DEATH_VISIBLE_DURATION_MS);

        timeoutMap.set(unit.id + '-fade', fadeTimeoutId);
    });
}


async function handleObstacleDestroyAnimation(obstacle) {
     return new Promise((resolve) => { if (!obstacle?.element || !gridContent) { resolve(); return; } const el = obstacle.element; el.classList.add('destroyed'); setTimeout(() => { el.remove(); resolve(); }, OBSTACLE_DESTROY_DURATION_MS); });
}

async function animateItemDrop(itemsToAnimate, targetX, targetY) {
    // Use Promise.all to wait for all individual item animations to finish
    return Promise.all(itemsToAnimate.map((item, index) => {
        // Create a new promise for each item's animation
        return new Promise(resolve => {
            // --- Basic Validation ---
            if (!item) {
                console.warn("animateItemDrop: Received null/undefined item in array.");
                resolve(); // Resolve immediately for invalid items
                return;
            }

            // Ensure the item has an element. If not, render it first.
            // This handles cases where items are created but not yet in the DOM.
            if (!item.element) {
                renderItem(item, gridContent); // Assumes gridContent is the correct parent
            }

            // Double-check element existence after potential rendering
            if (!item.element || !gridContent) {
                console.warn("animateItemDrop: Failed to get/create element for item:", item);
                resolve(); // Resolve if element still cannot be obtained
                return;
            }

            const el = item.element;

            // --- Calculate Final Position ---
            // Use the item's *actual* grid coordinates (item.x, item.y)
            // which might be different from targetX/Y if items scatter slightly.
            // Position the element's anchor point (left/top) at the center of its target grid cell.
            const finalXCoord = (item.x + 0.5) * currentCellSize;
            const finalYCoord = (item.y + 0.5) * currentCellSize;

            // --- Set Final Position Styles & Stack Index ---
            // These are set immediately; the animation works by transitioning the transform.
            el.style.left = `${finalXCoord}px`;
            el.style.top = `${finalYCoord}px`;
            // Ensure stack index is applied as a CSS variable for the transform
            el.style.setProperty('--stackIndex', item.stackIndex || 0);

            // --- Define Animation States ---
            // Initial state: Higher up, smaller scale, centered + stacked offset
            const startTransform = `translate(
                calc(-50% + var(--stackIndex, 0) * var(--stack-offset-x)),
                calc(-50% + var(--stackIndex, 0) * var(--stack-offset-y) - 20px) /* Start 20px higher */
            ) scale(0.5)`; // Start at half size

            // Final state: Normal position (centered + stacked offset), full scale
            const endTransform = `translate(
                calc(-50% + var(--stackIndex, 0) * var(--stack-offset-x)),
                calc(-50% + var(--stackIndex, 0) * var(--stack-offset-y))
            ) scale(1)`; // End at full size

            // --- Apply Initial State & Transition ---
            el.style.opacity = '0'; // Start invisible
            el.style.transform = startTransform; // Apply starting transform

            const delay = index * 50; // Stagger animation start for multiple items
            const duration = ITEM_DROP_ANIMATION_DURATION_MS; // Get duration from config/constant
            // Define the CSS transition properties
            el.style.transition = `opacity 0.2s ease-out ${delay}ms, transform ${duration}ms cubic-bezier(0.68, -0.55, 0.27, 1.55) ${delay}ms`;
            // cubic-bezier for a bounce effect

            // --- Trigger Animation ---
            // Use requestAnimationFrame to ensure the initial styles are applied
            // before setting the final styles, triggering the transition.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Apply final animation state (triggers the transition)
                    el.style.opacity = '1';
                    el.style.transform = endTransform;

                    // Update the cell's visual state to indicate an item is present
                    updateCellItemStatus(item.x, item.y);

                    // --- Animation Cleanup ---
                    // Set a timeout to resolve the promise after the animation finishes
                    setTimeout(() => {
                        // Optional: Remove the explicit transition style property
                        // so it doesn't interfere with other transitions (like hover)
                        // if (el) { // Check if element still exists
                        //     el.style.transition = '';
                        // }
                        resolve(); // Signal that this item's animation is done
                    }, duration + delay); // Wait for full duration + stagger delay
                });
            });
        }); // End of Promise for single item
    })); // End of Promise.all for all items
}

async function animateItemPickup(itemsToAnimate) {
    return Promise.all(itemsToAnimate.map(item => { return new Promise(resolve => { if (!item?.element || !gridContent) { resolve(); return; } item.element.classList.add('collected'); const duration = ITEM_PICKUP_ANIMATION_DURATION_MS; setTimeout(() => { item.element?.remove(); item.element = null; resolve(); }, duration); }); }));
}

async function animateItemMagnetPull(item, targetUnit) {
    if (!item?.element || !targetUnit?.element || !gridContent) return;
    const itemElement = item.element;
    const targetX = (targetUnit.x + 0.5) * currentCellSize;
    const targetY = (targetUnit.y + 0.5) * currentCellSize;
    itemElement.style.setProperty('--target-x', `${targetX}px`);
    itemElement.style.setProperty('--target-y', `${targetY}px`);
    itemElement.classList.add('magnet-collecting');
    setTimeout(() => {
        itemElement.remove();
        item.element = null;
        updateCellItemStatus(item.x, item.y);
    }, ITEM_MAGNET_FLY_DURATION_MS);
}

function removeVisualItems(itemsToRemove) {
    let lastX = -1, lastY = -1; itemsToRemove.forEach(item => { item.element?.remove(); item.element = null; if (lastX === -1) { lastX = item.x; lastY = item.y; } }); if (lastX !== -1) updateCellItemStatus(lastX, lastY);
}

function updateVisualItemState(item) {
    if (!item?.element) return; if (item.type === 'chest' && item.opened) { item.element.classList.add('opened'); item.element.style.pointerEvents = 'none'; item.element.style.cursor = 'default'; } updateCellItemStatus(item.x, item.y);
}

function calculateMinZoomToFit() {
    // Basic validation
    if (!gameBoard || !gridContent) {
        console.warn("calculateMinZoomToFit: Missing gameBoard or gridContent.");
        return 0.1; // Return a small default safe value
    }

    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;
    // Ensure cell size is current, although it should be set by layout updates
    const currentGridCellSize = currentCellSize || 30;

    // Validate dimensions
    if (boardWidth <= 0 || boardHeight <= 0 || currentGridCellSize <= 0 || currentGridCols <= 0 || currentGridRows <= 0) {
        console.warn("calculateMinZoomToFit: Invalid dimensions.");
        return 0.1; // Return a small default safe value
    }

    const gridWidth = currentGridCols * currentGridCellSize;
    const gridHeight = currentGridRows * currentGridCellSize;
    if (gridWidth <= 0 || gridHeight <= 0) {
        console.warn("calculateMinZoomToFit: Invalid grid dimensions.");
        return 0.1; // Return a small default safe value
    }

    // Calculate the zoom level needed to fit both width and height
    const zoomToFitWidth = boardWidth / gridWidth;
    const zoomToFitHeight = boardHeight / gridHeight;
    const targetZoomFit = Math.min(zoomToFitWidth, zoomToFitHeight);

    // We still need *some* absolute minimum floor to prevent zooming infinitely small if something goes wrong.
    // Also respect the overall MAX_ZOOM.
    const absoluteMinFloor = 0.1; // Prevent zooming smaller than this ever
    return Math.max(absoluteMinFloor, Math.min(MAX_ZOOM, targetZoomFit));
}

function applyZoomAndPan() {
    if (!gridContent) return; clampPan();
    const transformValue = `translate(${gridContentOffsetX}px, ${gridContentOffsetY}px) scale(${currentZoom})`;
    gridContent.style.transform = transformValue;
    if (unitHpBarsOverlay) {
        unitHpBarsOverlay.style.transform = transformValue;
        unitHpBarsOverlay.style.transformOrigin = 'top left';
    }
    updateDefaultViewButtonVisibility();
}

function handleZoom(event) {
    event.preventDefault();
    if (!gameBoard || isAnyOverlayVisible()) return;

    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? -1 : 1; // -1 zoom out, 1 zoom in
    const oldZoom = currentZoom;

    // --- Calculate Dynamic Minimum Zoom ---
    const dynamicMinZoom = calculateMinZoomToFit();
    // --- End Calculate Dynamic Minimum Zoom ---

    // Calculate new zoom, clamping between dynamic min and fixed max
    currentZoom = Math.max(dynamicMinZoom, Math.min(MAX_ZOOM, currentZoom + delta * zoomSpeed));

    // If zoom didn't actually change, exit
    if (currentZoom === oldZoom) {
        return;
    }

    // Recalculate offsets based on mouse position to keep it stationary
    const rect = gameBoard.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Prevent division by zero if oldZoom was somehow invalid
    if (oldZoom <= 0) {
         console.error("handleZoom: Invalid oldZoom value.");
         // Optionally reset view here
         centerView(true);
         return;
    }

    gridContentOffsetX = mouseX - (mouseX - gridContentOffsetX) * (currentZoom / oldZoom);
    gridContentOffsetY = mouseY - (mouseY - gridContentOffsetY) * (currentZoom / oldZoom);

    // Apply the new zoom and recalculated offsets (applyZoomAndPan handles clamping offsets)
    applyZoomAndPan();
}

function handlePanStart(event) {
    if (event.button !== 0 || event.target.closest('.unit,.item,.obstacle,.ui-button,button,a,.spell-icon,#default-view-button') || isAnyOverlayVisible()) { isPanning = false; return; }
    event.preventDefault(); isPanning = true; panStartX = event.clientX; panStartY = event.clientY; gridStartPanX = gridContentOffsetX; gridStartPanY = gridContentOffsetY; gameBoard.classList.add('panning');
    document.addEventListener('mousemove', handlePanMove, { passive: false }); document.addEventListener('mouseup', handlePanEnd, { once: true });
}

function handlePanMove(event) {
    if (!isPanning || !gameBoard) return; event.preventDefault(); gridContentOffsetX = gridStartPanX + (event.clientX - panStartX); gridContentOffsetY = gridStartPanY + (event.clientY - panStartY); applyZoomAndPan();
}

function handlePanEnd(event) {
    if (!isPanning) return; event.preventDefault(); isPanning = false; gameBoard.classList.remove('panning'); document.removeEventListener('mousemove', handlePanMove);
}

function clampPan() {
     if (!gameBoard || !gridContent || currentZoom <= 0) return; const boardRect = gameBoard.getBoundingClientRect(); const gridRenderedWidth = gridContent.offsetWidth * currentZoom; const gridRenderedHeight = gridContent.offsetHeight * currentZoom;
     const minOffsetX = boardRect.width - gridRenderedWidth - 5; const maxOffsetX = 5; const minOffsetY = boardRect.height - gridRenderedHeight - 5; const maxOffsetY = 5;
     gridContentOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, gridContentOffsetX)); gridContentOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, gridContentOffsetY));
     if (gridRenderedWidth < boardRect.width) gridContentOffsetX = (boardRect.width - gridRenderedWidth) / 2; if (gridRenderedHeight < boardRect.height) gridContentOffsetY = (boardRect.height - gridRenderedHeight) / 2;
}

function isDefaultView() {
    // Basic validation
    if (!gameBoard || !gridContent) {
        // If elements are missing, arguably it's not the default view,
        // but returning true might hide the button unnecessarily. Let's assume false.
        return false;
    }
    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;
    // Add check for cell size validity
    if (boardWidth <= 0 || boardHeight <= 0 || currentCellSize <= 0 || currentGridCols <= 0 || currentGridRows <= 0) {
        // If dimensions are invalid, cannot determine default view accurately.
        // Returning false ensures the reset button is visible.
        console.warn("isDefaultView: Invalid dimensions for calculation.");
        return false;
    }

    // --- Calculate the Dynamic "Default" (Fit-to-Screen) Zoom ---
    const defaultZoom = calculateMinZoomToFit(); // Use the helper function
    // --- End Calculate Zoom ---

    // --- Calculate the Offsets for the Default Zoom ---
    const gridWidth = currentGridCols * currentCellSize;
    const gridHeight = currentGridRows * currentCellSize;
    // Ensure grid dimensions are valid before calculating offsets
    if (gridWidth <= 0 || gridHeight <= 0) {
         console.warn("isDefaultView: Invalid grid dimensions for offset calculation.");
         return false;
    }
    const defaultOffsetX = (boardWidth - gridWidth * defaultZoom) / 2;
    const defaultOffsetY = (boardHeight - gridHeight * defaultZoom) / 2;
    // --- End Calculate Offsets ---


    // --- Compare Current State to Default State ---
    const zoomThreshold = 0.01; // Tolerance for floating point comparisons
    const offsetThreshold = 2;  // Tolerance for pixel offset comparisons

    const isZoomDefault = Math.abs(currentZoom - defaultZoom) < zoomThreshold;
    const isOffsetXDefault = Math.abs(gridContentOffsetX - defaultOffsetX) < offsetThreshold;
    const isOffsetYDefault = Math.abs(gridContentOffsetY - defaultOffsetY) < offsetThreshold;

    // Return true only if all three components are within the threshold of the default state
    return isZoomDefault && isOffsetXDefault && isOffsetYDefault;
}

function updateDefaultViewButtonVisibility() { if(defaultViewButton) defaultViewButton.classList.toggle('hidden', isDefaultView()); }

function centerView(immediate = false) { // Removed forceMinZoom parameter
    // Basic validation
    if (!gameBoard || !gridContent) {
        console.warn("Cannot centerView: Missing gameBoard or gridContent.");
        return;
    }

    // Ensure cell size is calculated
    calculateCellSize();

    const boardWidth = gameBoard.clientWidth;
    const boardHeight = gameBoard.clientHeight;
    // Validate dimensions
    if (boardWidth <= 0 || boardHeight <= 0 || currentCellSize <= 0) {
        console.warn("Cannot centerView: Invalid dimensions.");
        return;
    }

    const gridWidth = currentGridCols * currentCellSize;
    const gridHeight = currentGridRows * currentCellSize;
    if (gridWidth <= 0 || gridHeight <= 0) {
        console.warn("Cannot centerView: Invalid grid dimensions.");
        return;
    }

    // --- Determine Target Zoom (Always the minimum zoom to fit) ---
    const targetZoom = calculateMinZoomToFit(); // Use the helper function
    console.log(`centerView: Setting zoom to fit: ${targetZoom}`);
    // --- End Determine Target Zoom ---

    // --- Calculate Target Offsets (to center the grid AT THE TARGET ZOOM) ---
    const targetOffsetX = (boardWidth - (gridWidth * targetZoom)) / 2;
    const targetOffsetY = (boardHeight - (gridHeight * targetZoom)) / 2;
    console.log(`centerView: Target offsets: X=${targetOffsetX.toFixed(1)}, Y=${targetOffsetY.toFixed(1)}`);
    // --- End Calculate Target Offsets ---

    // --- Apply Transform ---
    // Store the current zoom globally
    currentZoom = targetZoom;

    // Apply transform (keep immediate/smooth logic)
    if (immediate) {
        const originalTransition = gridContent.style.transition;
        gridContent.style.transition = 'none';
        if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = 'none';

        gridContentOffsetX = targetOffsetX;
        gridContentOffsetY = targetOffsetY;
        applyZoomAndPan();

        requestAnimationFrame(() => {
            if (gridContent) gridContent.style.transition = originalTransition;
            if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = originalTransition;
        });
    } else {
        const transitionStyle = 'transform 0.3s ease-out';
        gridContent.style.transition = transitionStyle;
        if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = transitionStyle;

        gridContentOffsetX = targetOffsetX;
        gridContentOffsetY = targetOffsetY;
        applyZoomAndPan();

        setTimeout(() => {
            if (gridContent) gridContent.style.transition = '';
            if (unitHpBarsOverlay) unitHpBarsOverlay.style.transition = '';
        }, 300);
    }
    // --- End Apply Transform ---
}

function applyMapZoomAndPan(immediate = false) {
    if (!levelSelectMap || !levelSelectMapContainer || !levelSelectDotsLayer) return;
    const containerRect = levelSelectMapContainer.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;

    // Calculate scale using 'contain' method
    const baseScale = calculateMapScale(containerRect.width, containerRect.height, mapIntrinsicWidth, mapIntrinsicHeight);

    // Ensure mapZoom is a valid number within bounds before using it
    const currentMapZoom = (typeof mapZoom === 'number' && !isNaN(mapZoom) && mapZoom >= MIN_MAP_ZOOM)
                         ? Math.min(MAX_MAP_ZOOM, mapZoom)
                         : MIN_MAP_ZOOM; // Default to MIN_MAP_ZOOM if invalid

    const finalScale = baseScale * currentMapZoom;

    // Ensure offsets are valid numbers
    let currentMapOffsetX = typeof mapOffsetX === 'number' && !isNaN(mapOffsetX) ? mapOffsetX : 0;
    let currentMapOffsetY = typeof mapOffsetY === 'number' && !isNaN(mapOffsetY) ? mapOffsetY : 0;

    // --- Clamp Offsets BEFORE applying ---
    // NOTE: clampMapOffsets now internally uses the global mapZoom
    const clampedOffsets = clampMapOffsets(currentMapOffsetX, currentMapOffsetY);
    currentMapOffsetX = clampedOffsets.x;
    currentMapOffsetY = clampedOffsets.y;
    // Update global state if clamping changed the values (optional but good practice)
    mapOffsetX = currentMapOffsetX;
    mapOffsetY = currentMapOffsetY;
    // --- End Clamping ---

    // Apply transform with top-left origin
    const transformValue = `translate(${currentMapOffsetX}px, ${currentMapOffsetY}px) scale(${finalScale})`;
    // console.log(`Applying Transform (TL): ${transformValue} (immediate=${immediate})`); // Debug Log

    const transitionStyle = immediate ? 'none' : 'transform 0.3s ease-out';

    // Ensure origin is set correctly
    levelSelectMap.style.transformOrigin = 'top left';
    levelSelectDotsLayer.style.transformOrigin = 'top left';

    // Apply transition and transform
    levelSelectMap.style.transition = transitionStyle;
    levelSelectDotsLayer.style.transition = transitionStyle;
    levelSelectMap.style.transform = transformValue;
    levelSelectDotsLayer.style.transform = transformValue; // Apply identical transform

    // Position dots (relative positioning within the transformed layer)
    positionLevelDots();

    // Cleanup transition style
    if (!immediate) {
        const clearTransition = (event) => {
            // Check the target element to avoid issues if multiple transitions end simultaneously
            if ((event.target === levelSelectMap || event.target === levelSelectDotsLayer) && event.propertyName === 'transform') {
                if (levelSelectMap) levelSelectMap.style.transition = '';
                if (levelSelectDotsLayer) levelSelectDotsLayer.style.transition = '';
                event.target.removeEventListener('transitionend', clearTransition); // Remove listener from the element that triggered
            }
        };
        // Add listener to both, although only one needs to clear both styles
        levelSelectMap.addEventListener('transitionend', clearTransition);
        levelSelectDotsLayer.addEventListener('transitionend', clearTransition);

        // Fallback timeout in case transitionend doesn't fire reliably
        setTimeout(() => {
            if (levelSelectMap && levelSelectMap.style.transition !== 'none') levelSelectMap.style.transition = '';
            if (levelSelectDotsLayer && levelSelectDotsLayer.style.transition !== 'none') levelSelectDotsLayer.style.transition = '';
            levelSelectMap?.removeEventListener('transitionend', clearTransition);
            levelSelectDotsLayer?.removeEventListener('transitionend', clearTransition);
        }, 350); // Slightly longer than transition duration
    }
}

function handleMapPanStart(event) {
    // console.log("handleMapPanStart: Mousedown detected."); // Log entry

    const clickedDot = event.target.closest('.level-dot');
    const clickedButton = event.target.closest('button, .primary-button, .secondary-button'); // Check for any button

    // --- MODIFIED OVERLAY CHECK ---
    // Check if any OTHER overlay is active (excluding level select itself)
    const anotherOverlayActive = isGameOverScreenVisible() ||
                                 isMenuOpen() ||
                                 isLeaderboardOpen() ||
                                 isShopOpen() ||
                                 isLevelCompleteOpen() ||
                                 isChooseTroopsScreenOpen() ||
                                 isMainMenuOpen(); // Main menu counts as another overlay
    // --- END MODIFIED OVERLAY CHECK ---

    // console.log(`handleMapPanStart: button=${event.button}, clickedDot=${!!clickedDot}, clickedButton=${!!clickedButton}, anotherOverlayActive=${anotherOverlayActive}`); // Debug Log

    // Prevent panning if: not left button, clicked a dot, clicked a button, OR another overlay is active
    if (event.button !== 0 || clickedDot || clickedButton || anotherOverlayActive) {
        // console.log("handleMapPanStart: Panning prevented by initial checks."); // Debug Log
        isMapPanning = false; // Ensure flag is reset
        if (levelSelectMapContainer) levelSelectMapContainer.style.cursor = 'grab'; // Reset cursor if needed
        return; // Don't start panning
    }

    // If checks pass, proceed with panning setup
    event.preventDefault();
    isMapPanning = true;
    mapPanStartX = event.clientX;
    mapPanStartY = event.clientY;
    mapStartPanX = mapOffsetX; // Use global offset
    mapStartPanY = mapOffsetY; // Use global offset
    // console.log(`handleMapPanStart: Panning STARTED. isMapPanning=${isMapPanning}, startOffset=(${mapStartPanX}, ${mapStartPanY})`); // Debug Log

    if (levelSelectMapContainer) {
         levelSelectMapContainer.style.cursor = 'grabbing'; // Use grab/grabbing cursor
    }
    document.addEventListener('mousemove', handleMapPanMove, { passive: false });
    document.addEventListener('mouseup', handleMapPanEnd, { once: true });
}


function handleMapPanMove(event) {
    if (!isMapPanning || !levelSelectMap || !levelSelectMapContainer) { /* ... error handling ... */ return; }
    event.preventDefault();
    const deltaX = event.clientX - mapPanStartX; const deltaY = event.clientY - mapPanStartY;
    const rawOffsetX = mapStartPanX + deltaX; const rawOffsetY = mapStartPanY + deltaY;
    // Use the revised clampMapOffsets
    const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY);
    mapOffsetX = clampedOffsets.x; mapOffsetY = clampedOffsets.y;
    applyMapZoomAndPan(true);
}

function calculateMapScale(containerWidth, containerHeight, intrinsicWidth, intrinsicHeight) {
    const safeMapWidth = Math.max(1, intrinsicWidth || 1024);
    const safeMapHeight = Math.max(1, intrinsicHeight || 1024);
    const scaleX = containerWidth / safeMapWidth;
    const scaleY = containerHeight / safeMapHeight;
    // 'contain' uses the smaller scale factor
    return Math.min(scaleX, scaleY);
}

function clampMapOffsets(rawOffsetX, rawOffsetY) {
    // --- Essential Setup (Checks and Calculations) ---
    if (!levelSelectMapContainer || !levelSelectMap) return { x: 0, y: 0 };
    const containerRect = levelSelectMapContainer.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return { x: mapOffsetX || 0, y: mapOffsetY || 0 };
    const safeMapWidth = Math.max(1, mapIntrinsicWidth || 1024);
    const safeMapHeight = Math.max(1, mapIntrinsicHeight || 1024);
    const baseScale = calculateMapScale(containerRect.width, containerRect.height, safeMapWidth, safeMapHeight);
    const currentMapZoom = (typeof mapZoom === 'number' && !isNaN(mapZoom) && mapZoom >= MIN_MAP_ZOOM)
                         ? Math.min(MAX_MAP_ZOOM, mapZoom)
                         : MIN_MAP_ZOOM;
    const finalScale = baseScale * currentMapZoom;
    if (finalScale <= 0 || isNaN(finalScale)) return { x: mapOffsetX || 0, y: mapOffsetY || 0 };
    const mapRenderWidth = safeMapWidth * finalScale;
    const mapRenderHeight = safeMapHeight * finalScale;
    // --- End Setup ---

    let minOffsetX, maxOffsetX, minOffsetY, maxOffsetY;

    // Check screen width (adjust 700px if your CSS breakpoint differs)
    const isMobileView = window.matchMedia("(max-width: 700px)").matches;

    if (isMobileView) {
        const mobileMaxOffsetX = 0;  // Example: How far left map's left edge can be (positive = space left)
        const mobileMinOffsetX = containerRect.width - mapRenderWidth + 1180; // Example: Right boundary (negative = space right)

        const mobileMaxOffsetY = -420;  // Example: Top boundary
        const mobileMinOffsetY = containerRect.height - mapRenderHeight + 807; // Example: Bottom boundary
        // *** END MOBILE BOUNDARY DEFINITIONS ***

        // Apply centering logic if map is smaller than container
        if (mapRenderWidth < containerRect.width) {
            minOffsetX = maxOffsetX = (containerRect.width - mapRenderWidth) / 2;
        } else {
            minOffsetX = mobileMinOffsetX;
            maxOffsetX = mobileMaxOffsetX;
        }

        if (mapRenderHeight < containerRect.height) {
            minOffsetY = maxOffsetY = (containerRect.height - mapRenderHeight) / 2;
        } else {
            minOffsetY = mobileMinOffsetY;
            maxOffsetY = mobileMaxOffsetY;
        }

    } else {
        // --- DESKTOP Clamping Limits (Your Perfected Values) ---

        const desktopMaxOffsetX = -785; // Your value: Left boundary
        const desktopMinOffsetX = containerRect.width - mapRenderWidth - 325; // Your value: Right boundary

        const desktopMaxOffsetY = 0;     // Your value: Top boundary
        const desktopMinOffsetY = containerRect.height - mapRenderHeight - (-500); // Your value: Bottom boundary

        // Apply centering logic if map is smaller than container
        if (mapRenderWidth < containerRect.width) {
            minOffsetX = maxOffsetX = (containerRect.width - mapRenderWidth) / 2;
        } else {
            minOffsetX = desktopMinOffsetX;
            maxOffsetX = desktopMaxOffsetX;
        }

        if (mapRenderHeight < containerRect.height) {
            minOffsetY = maxOffsetY = (containerRect.height - mapRenderHeight) / 2;
        } else {
            minOffsetY = desktopMinOffsetY;
            maxOffsetY = desktopMaxOffsetY;
        }
    }

    // --- Final Clamp ---
    const clampedX = Math.max(minOffsetX, Math.min(maxOffsetX, rawOffsetX));
    const clampedY = Math.max(minOffsetY, Math.min(maxOffsetY, rawOffsetY));

    return { x: clampedX, y: clampedY };
}

function handleMapPanEnd(event) {
    if (!isMapPanning) return;
    event.preventDefault();
    isMapPanning = false;

    if (levelSelectMapContainer) {
        levelSelectMapContainer.style.cursor = 'grab'; // Reset cursor
    }
    // Remove listeners from the document
    document.removeEventListener('mousemove', handleMapPanMove);
    document.removeEventListener('touchmove', handleMapPanMoveTouch);
    document.removeEventListener('touchend', handleMapPanEndTouch);
    document.removeEventListener('touchcancel', handleMapPanEndTouch);
}

async function handleCellClick(event) {
     if (isPanning || event.target.closest('.unit,.item,.obstacle') || isProcessing || !isGameActive() || isAnyOverlayVisible()) return;
     const cell = event.currentTarget; const x = parseInt(cell.dataset.x); const y = parseInt(cell.dataset.y); if (!isCellInBounds(x, y)) return;
     const obstacle = getObstacleAt(x, y);
     if (obstacle && !obstacle.enterable && !obstacle.destructible) { playSfx('error'); showFeedback("Cannot target cell.", "feedback-error"); if (currentSpell) setActiveSpell(null); if (selectedUnit) deselectUnit(); return; }
     if (obstacle && obstacle.enterable && obstacle.occupantUnitId) { const unitInside = units.find(u => u.id === obstacle.occupantUnitId); if (unitInside?.team === 'player') { playSfx('error'); showFeedback("Tower occupied by ally.", "feedback-error"); } else { playSfx('error'); showFeedback("Tower is occupied.", "feedback-error"); } if (currentSpell) setActiveSpell(null); if (selectedUnit) deselectUnit(); return; }
     if (currentSpell) { if (currentSpell === 'frostNova' || currentSpell === 'flameWave') { await castSpell(currentSpell, {x, y}); return; } else if (currentSpell === 'fireball' && obstacle?.destructible) { await castSpell(currentSpell, obstacle); return; } playSfx('error'); showFeedback("Select a valid target.", "feedback-error"); setActiveSpell(null); if (selectedUnit) deselectUnit(); return; }
     if (currentTurn === 'player' && selectedUnit) { const isMoveValid = getValidMoves(selectedUnit).some(p => p.x === x && p.y === y); if (isMoveValid) { const unitToMove = selectedUnit; deselectUnit(false); await moveUnit(unitToMove, x, y); } else { deselectUnit(); } } else if (selectedUnit) { deselectUnit(); }
}

async function handleUnitClick(event, clickedUnit) {
    event.stopPropagation(); // Prevent event bubbling to the cell click handler

    // --- Initial Checks ---
    if (isPanning || !isGameActive() || isProcessing || !clickedUnit || !isUnitAliveAndValid(clickedUnit) || isAnyOverlayVisible()) {
        // If any of these conditions are true, do nothing or provide minimal feedback
        if (!isUnitAliveAndValid(clickedUnit)) {
            // Optional: If clicking a dead unit, maybe clear selection/info
            if (selectedUnit) deselectUnit();
            updateUnitInfo(null);
        }
        return; // Exit if interaction isn't allowed
    }

    // Always update the info panel to show the clicked unit's details
    updateUnitInfo(clickedUnit);

    // --- Spell Casting Logic ---
    if (currentSpell) {
        let castSuccess = false;
        let originElementForSpell = null; // Element where the spell originates visually

        // Determine if the spell needs an origin and which element to use
        if (currentSpell === 'fireball') {
            originElementForSpell = fireballElement; // Use the fireball icon element
        }
        // Add other spells that might need a visual origin here
        // else if (currentSpell === 'someOtherSpell') {
        //    originElementForSpell = someOtherElement;
        // }

        // Call the game logic function to cast the spell
        // Pass the spell name, the target unit object, and the origin UI element (if any)
        castSuccess = await castSpell(currentSpell, clickedUnit, originElementForSpell);

        // Provide feedback only if the cast attempt *failed* game logic validation
        // castSpell itself handles resetting spell state and internal errors.
        if (!castSuccess && currentSpell) { // Check currentSpell again, castSpell might nullify it
            playSfx('error');
            // Determine a more specific reason if possible (handled within castSpell ideally)
            showFeedback("Invalid target for spell.", "feedback-error");
             // We might not need to manually call setActiveSpell(null) here if castSpell handles it on failure
             // setActiveSpell(null);
        }
        // Whether successful or not, the spell attempt concludes the action for this click
        return;
    }

    // --- Regular Unit Interaction Logic (No Spell Active) ---
    if (currentTurn === 'player') {
        if (selectedUnit) {
            // Player already has a unit selected
            if (clickedUnit.team === 'enemy' && !levelClearedAwaitingInput) {
                // --- Player selected, clicked enemy: Initiate Attack ---
                let targetObjectForAttack = clickedUnit;
                // Check if the enemy is in a tower, target the tower instead if so
                if (clickedUnit.inTower) {
                    const tower = obstacles.find(o => o.id === clickedUnit.inTower);
                    // Only target the tower if it exists and is intact
                    if (tower && isObstacleIntact(tower)) {
                        targetObjectForAttack = tower;
                    } else {
                        // Can't target unit in destroyed tower, maybe deselect?
                        console.warn("Target unit is in a non-existent or destroyed tower.");
                        playSfx('error');
                        showFeedback("Cannot target unit in destroyed tower.", "feedback-error");
                        deselectUnit();
                        return;
                    }
                }

                // Check if the determined target (unit or tower) is valid
                const attackTargets = getValidAttackTargets(selectedUnit);
                const targetIsUnit = !!targetObjectForAttack.team; // Check if it's a unit or obstacle
                const canAttack = targetIsUnit ?
                    attackTargets.units.includes(targetObjectForAttack.id) :
                    attackTargets.obstacles.includes(targetObjectForAttack.id);

                if (canAttack) {
                    const attacker = selectedUnit;
                    deselectUnit(false); // Deselect before awaiting attack
                    await attack(attacker, targetObjectForAttack.x, targetObjectForAttack.y);
                    // attack function handles finishing the attacker's action
                } else {
                    playSfx('error');
                    showFeedback("Cannot attack target (out of range or LOS).", "feedback-error");
                    // Keep unit selected if attack is invalid? Or deselect? Let's deselect.
                    deselectUnit();
                }
            } else if (clickedUnit.team === 'player') {
                // --- Player selected, clicked another player unit ---
                if (clickedUnit.id === selectedUnit.id) {
                    // Clicked the same unit again: Deselect
                    deselectUnit();
                } else {
                    // Clicked a different friendly unit: Switch selection
                    selectUnit(clickedUnit); // selectUnit handles deselecting the old one
                }
            } else {
                // Clicked something unexpected while having a unit selected? Deselect.
                deselectUnit();
            }
        } else {
            // --- No unit selected, clicked a unit ---
            if (clickedUnit.team === 'player') {
                // Select the friendly unit if it's selectable
                selectUnit(clickedUnit);
            } else {
                // Clicked an enemy unit with nothing selected - do nothing except show info (already done)
                // Play a neutral sound maybe? Optional.
            }
        }
    } // End player turn check
    // If not player turn, clicking units just shows info (handled at the top)
}

async function handleItemClick(event, clickedItem) {
    event.stopPropagation(); if (isPanning || isProcessing || !isGameActive() || !clickedItem || clickedItem.collected || isAnyOverlayVisible()) return;
    if (currentTurn === 'player' && selectedUnit) { const x = clickedItem.x; const y = clickedItem.y; const isMoveValid = getValidMoves(selectedUnit).some(p => p.x === x && p.y === y); const isChest = clickedItem.type === 'chest'; if (isMoveValid && (!isChest || !clickedItem.opened)) { const unitToMove = selectedUnit; deselectUnit(false); await moveUnit(unitToMove, x, y); } else { deselectUnit(); } }
    else if (selectedUnit) deselectUnit();
}

async function handleObstacleClick(event, clickedObstacle) {
    event.stopPropagation();

    if (isPanning || isProcessing || !isGameActive() || !clickedObstacle || isAnyOverlayVisible()) {
    if (isObstacleIntact(clickedObstacle)) return;
    if (!isObstacleIntact(clickedObstacle) || isPanning || !isGameActive() || isAnyOverlayVisible()) {
        return;
   }

    }

    const targetX = clickedObstacle.x;
    const targetY = clickedObstacle.y;

    if (!levelClearedAwaitingInput && currentSpell) {
        let castSuccess = false;
        let originEl = null;

         if (currentSpell === 'fireball') {
             originEl = fireballElement;
         }

         if (currentSpell === 'fireball' && clickedObstacle.destructible) {
            // Ensure originEl is defined above this block if needed for fireball
            let originEl = fireballElement; // Define it here if not defined earlier in the function scope
            if (!originEl) {
                console.error("Cannot cast fireball on obstacle: Origin element is missing.");
                playSfx('error'); showFeedback(`Spell origin error.`, "feedback-error"); setActiveSpell(null); return;
            }
            castSuccess = await castSpell(currentSpell, clickedObstacle, originEl); // Corrected variable
        }

        if (!castSuccess && currentSpell) {
            playSfx('error');
            showFeedback("Cannot target obstacle with this spell.", "feedback-error");
        }
        return; // Exit after spell attempt (success or fail)
    }

    // --- Handle Player Unit Actions ---
    if (currentTurn === 'player' && selectedUnit) {
        const attackTargets = getValidAttackTargets(selectedUnit);
        const isAttackable = attackTargets.obstacles.includes(clickedObstacle.id);

        // *** PRIORITIZE ATTACKING IF POSSIBLE ***
        if (isAttackable) {
            const attacker = selectedUnit;
            // Deselect immediately before the await to prevent issues if player clicks fast
            deselectUnit(false);
            await attack(attacker, targetX, targetY);
            // Note: The 'attack' function should handle finishAction if appropriate
            return; // Attack initiated, action complete for this click
        }

        // --- If not attacking, check for Tower Entry ---
        else if (clickedObstacle.enterable && !clickedObstacle.occupantUnitId && !selectedUnit.inTower && !selectedUnit.acted && !selectedUnit.isFrozen && !selectedUnit.isNetted) {
            const entryX = targetX;
            const entryY = targetY + 1; // Entry point is below the tower

            if (isCellInBounds(entryX, entryY)) {
                const obstacleAtEntry = getObstacleAt(entryX, entryY);
                if (obstacleAtEntry && obstacleAtEntry.blocksMove) {
                    playSfx('error'); showFeedback("Path to tower entry blocked.", "feedback-error"); deselectUnit(); return;
                }

                const path = findPathToTarget(selectedUnit, entryX, entryY);
                const availableMov = selectedUnit.mov - (selectedUnit.isSlowed ? 1 : 0);

                if (path !== null && path.length <= availableMov) {
                    const unitToEnter = selectedUnit;
                    deselectUnit(false);
                    isProcessing = true; // Set processing flag for the sequence
                    if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
                    try {
                        await initiateTowerEntrySequence(unitToEnter, clickedObstacle, path);
                    } catch(e) {
                        console.error("Tower entry sequence error:", e);
                        playSfx('error'); // Play error sound on failure
                        // Reset processing state if error occurs during sequence
                        isProcessing = false;
                        if (typeof updateTurnDisplay === 'function') updateTurnDisplay();
                    }
                    // Processing state is reset inside initiateTowerEntrySequence on success/failure
                    return; // Tower entry initiated
                } else {
                    playSfx('error'); showFeedback("Cannot reach tower entry point.", "feedback-error"); deselectUnit(); return;
                }
            } else {
                playSfx('error'); showFeedback("Invalid tower entry position.", "feedback-error"); deselectUnit(); return;
            }
        }

        // --- If neither attack nor tower entry is valid for this click ---
        else {
            playSfx('error');
            // Provide more specific feedback if possible
            if(clickedObstacle.destructible && !isAttackable) {
                 showFeedback("Obstacle out of range or sight.", "feedback-error");
            } else {
                 showFeedback("Cannot interact with obstacle.", "feedback-error");
            }
            deselectUnit();
            return;
        }

    } else if (selectedUnit) {
        // Player has a unit selected but clicked an obstacle inappropriately
        deselectUnit();
    }
    // If no unit selected or not player turn, clicking obstacle does nothing further
}

// ui.js

function handleCellMouseEnter(event) {
    if (!isGameActive() || isProcessing || isPanning || !gameBoard || isAnyOverlayVisible()) return;

    const cell = event.currentTarget;
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);

    const unitOnCell = getUnitAt(x, y);
    const obstacleOnCell = getObstacleAt(x, y);

    clearFireballHighlight();
    clearHealHighlight();
    clearFrostNovaPreview(); // Clear frost nova explicitly on entering ANY cell
    clearFlameWaveHighlight(); // Clear flame wave explicitly on entering ANY cell


    if (currentSpell === 'frostNova') {
        highlightFrostNovaArea(x, y);
    } else if (currentSpell === 'flameWave') {
        highlightFlameWaveArea(y);
    } else if (currentSpell === 'fireball') {
        if (unitOnCell?.team === 'enemy' && isUnitAliveAndValid(unitOnCell)) {
            cell.classList.add('valid-fireball-target');
            if (unitOnCell.element) unitOnCell.element.classList.add('valid-fireball-target');
        } else if (obstacleOnCell?.destructible && isObstacleIntact(obstacleOnCell)) {
            cell.classList.add('valid-fireball-target');
            if (obstacleOnCell.element) obstacleOnCell.element.classList.add('valid-fireball-target');
        }
    } else if (currentSpell === 'heal') {
        if (unitOnCell?.team === 'player' && isUnitAliveAndValid(unitOnCell)) {
            cell.classList.add('valid-heal-target');
            if (unitOnCell.element) unitOnCell.element.classList.add('valid-heal-target');
        }
    }


    const potentialTargetUnit = unitOnCell; // Use already defined variable
    const potentialTargetObstacle = obstacleOnCell; // Use already defined variable
    const canBePrimaryTarget = cell.classList.contains('can-be-primary-target');

    if (selectedUnit?.type === 'champion' && canBePrimaryTarget && !currentSpell) {
        let targetPos = potentialTargetUnit || potentialTargetObstacle;
        if (targetPos) showAttackHoverHighlights(selectedUnit, targetPos);
        else clearAttackHoverHighlights();
    } else if (selectedUnit?.type === 'champion') {
        clearAttackHoverHighlights();
    }
}

function handleCellMouseLeave(event) {
     if (!isGameActive() || isProcessing || isPanning || isAnyOverlayVisible()) return; if (currentSpell === 'frostNova') if (currentSpell === 'flameWave') if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }
function handleGridMouseLeave() { clearSpellHighlights(); if (selectedUnit?.type === 'champion') clearAttackHoverHighlights(); }

function handleKeyDown(event) {
     if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
     const overlayVisible = isAnyOverlayVisible(); const gameRunning = isGameActive(); const gameActiveAndNoOverlay = gameRunning && !overlayVisible;

     if (event.key.toLowerCase() === 'm') { toggleMute(); event.preventDefault(); return; }
     if (event.key === 'F4') { toggleFullscreen(); event.preventDefault(); return; }
     if (event.key.toLowerCase() === 'z' && gameActiveAndNoOverlay) { toggleWorldHpBarsVisibility(); event.preventDefault(); return; }
     if (event.key === 'Home' && gameActiveAndNoOverlay) { centerView(false); event.preventDefault(); return; }
     if (event.key === 'Escape') {
         if (isShopOpen()) { hideShop(); proceedAfterShopMaybe(); event.preventDefault(); return; }
         if (isLevelCompleteOpen()) { hideLevelComplete(); proceedToNextLevelOrLocation(); event.preventDefault(); return; }
         if (isMenuOpen()) { hideMenu(); event.preventDefault(); return; }
         if (isLeaderboardOpen()) { hideLeaderboard(); showMainMenu(); event.preventDefault(); return; }
         if (isChooseTroopsScreenOpen()) { handleTroopsBack(); event.preventDefault(); return; }
         if (isLevelSelectOpen()) { showMainMenu(); event.preventDefault(); return; }
         if (isGameOverScreenVisible()) { showMainMenu(); event.preventDefault(); return; }
         if (gameActiveAndNoOverlay) {
            if (currentSpell) setActiveSpell(null);
            else if (selectedUnit) deselectUnit();
            else showMenu();
            event.preventDefault();
         }
         return;
     }

     if (isLevelSelectOpen() && event.key.toLowerCase() === 'e') {
        if (typeof highestLevelUnlocked !== 'undefined' && highestLevelUnlocked > 0 && highestLevelUnlocked <= TOTAL_LEVELS) {
            playSfx('levelSelect');
            hideLevelSelect();
            initGame(currentLevel);
            event.preventDefault();
        } else {
            console.warn(`'E' pressed on Level Select, but highestLevelUnlocked (${highestLevelUnlocked}) is invalid or game finished.`);
            playSfx('error');
        }
        return;
    }

     if (isLevelCompleteOpen() && event.key.toLowerCase() === 'e') { nextLevelButton?.click(); event.preventDefault(); return; }
     if (isLevelCompleteOpen() && event.key.toLowerCase() === 's') { levelCompleteShopButton?.click(); event.preventDefault(); return; }
     if (isShopOpen() && event.key.toLowerCase() === 'e') { shopExitButton?.click(); event.preventDefault(); return; }
     if (isLevelSelectOpen() && event.key.toLowerCase() === 's') { levelSelectShopButton?.click(); event.preventDefault(); return; }

     if (overlayVisible || isProcessing || (event.metaKey || event.ctrlKey)) return;
     if (event.shiftKey && gameRunning) {
        const key = event.key.toLowerCase();
        if (key === 'h') { event.preventDefault(); applyCheatSpellAttack(50); return; }
        if (key === 'g') { event.preventDefault(); applyCheatGold(500); return; }
        if (key === 'b') { event.preventDefault(); unlimitedSpellsCheat = !unlimitedSpellsCheat; showFeedback(unlimitedSpellsCheat ? "CHEAT: Unlimited Spells!" : "CHEAT OFF: Limited Spells.", "feedback-cheat"); playSfx('cheat'); resetSpellStateForNewLevel(); updateSpellUI(); return; }
        if (key === 't' && currentTurn === 'player' && !levelClearedAwaitingInput && gameActiveAndNoOverlay) {
            event.preventDefault();
            if (isProcessing) return; // Don't allow if already processing

            isProcessing = true; // Set processing flag

            // Minimal UI changes before skipping
            if (typeof deselectUnit === 'function') deselectUnit(false);
            if (typeof setActiveSpell === 'function') setActiveSpell(null);
            if (typeof showFeedback === 'function') showFeedback("CHEAT: Skipping Level...", "feedback-levelup", 500); // Short feedback duration
            playSfx('cheat');

            // Use a short timeout mainly to allow the feedback to be briefly visible
            setTimeout(() => {
                if (!isGameActive() || isGameOver()) {
                     isProcessing = false; // Reset flag if game ended unexpectedly
                     return;
                }

                // 1. Remove Enemies (Game State) - Keep only player units
                units = units.filter(u => u.team === 'player');
                clearTimeoutMap(deathSpriteTimeouts);

                // 2. Calculate Stats (as if level was completed normally)
                // Ensure calculateLevelStats exists and works correctly
                const stats = typeof calculateLevelStats === 'function' ? calculateLevelStats() : { totalGoldEarned: 0, goldGained: 0 };

                // 3. Update Player Gold based on calculated stats
                playerGold += (stats.totalGoldEarned || 0) - (stats.goldGained || 0); // Add only bonus gold
                playerGold = Math.max(0, playerGold); // Ensure non-negative gold

                // 4. Update highest level reached
                 if (currentLevel >= highestLevelUnlocked) {
                    highestLevelUnlocked = Math.min(currentLevel + 1, TOTAL_LEVELS + 1);
                 }
                 // 5. Save progress (Scoreboard and Game Data)
                if (typeof saveScoreToLeaderboard === 'function') {
                    saveScoreToLeaderboard(currentLevel, playerGold);
                }
                saveGameData(); // Save all game data

                // 6. Update Gold Display in UI if function exists
                if (typeof updateGoldDisplay === 'function') {
                    updateGoldDisplay();
                }

                     stopMusic(); // Stop game music before showing overlay
                     hideAllOverlays();

                     if (typeof startNextLevel === 'function') {
                        startNextLevel(); // This function should handle incrementing level and calling initGame
                    } else {
                        console.error("startNextLevel function not found! Cannot proceed.");
                        // Fallback: Maybe go to level select or main menu?
                        isGameActiveFlag = false; // Stop game if cannot proceed
                        isProcessing = false; // Reset processing if stuck
                        showLevelSelect();
                    }
            }, 150); // Delay slightly longer than feedback duration maybe? Adjust as needed.

            return; // Stop processing other shift keys
        }
     }
     else if (gameActiveAndNoOverlay && currentTurn === 'player') {
         if (event.key === '1') { setActiveSpell('fireball'); event.preventDefault(); return; }
         if (event.key === '2') { setActiveSpell('flameWave'); event.preventDefault(); return; }
         if (event.key === '3') { setActiveSpell('frostNova'); event.preventDefault(); return; }
         if (event.key === '4') { setActiveSpell('heal'); event.preventDefault(); return; }
         if (event.key.toLowerCase() === 'e') { endTurnButton?.click(); event.preventDefault(); }
     }
}

function isAnyOverlayVisible(excludeMainMenu = false) { return isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isLevelSelectOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || (!excludeMainMenu && isMainMenuOpen()); }

function hideAllOverlays() {
    const overlays = [mainMenu, gameOverScreen, menuOverlay, leaderboardOverlay, levelSelectScreen, shopScreen, levelCompleteScreen, chooseTroopsScreen];
    overlays.forEach(o => { o?.classList.add('hidden'); o?.classList.remove('visible'); });
    gameBoardWrapper?.classList.toggle('active', isGameActive() && !isAnyOverlayVisible());
    if (!isGameActive() && !isLevelSelectOpen() && !isChooseTroopsScreenOpen()) stopTooltipUpdater();
    else if (isGameActive() && !isAnyOverlayVisible()) startTooltipUpdater();
    else if (isLevelSelectOpen() || isChooseTroopsScreenOpen() || isShopOpen() || isMenuOpen()) startTooltipUpdater();
    else stopTooltipUpdater();
}

function showMainMenu() { hideAllOverlays(); mainMenu?.classList.remove('hidden'); mainMenu?.classList.add('visible'); stopTooltipUpdater(); stopMusic(); fullGameReset(); }
function hideMainMenu() { mainMenu?.classList.remove('visible'); mainMenu?.classList.add('hidden'); }
function isMainMenuOpen() { return mainMenu?.classList.contains('visible'); }

function showLevelCompleteScreen(stats) {
    hideAllOverlays(); stopMusic(); stopTooltipUpdater(); if (!levelCompleteScreen || !statsBonusList) return;
    statsEnemiesKilled.textContent = stats.enemiesKilled; statsUnitsLost.textContent = stats.unitsLost; statsGoldGained.textContent = stats.goldGained; statsTotalGold.textContent = stats.totalGoldEarned;
    statsBonusList.querySelector('[data-bonus="noSpells"]').classList.toggle('hidden', stats.bonusGoldNoSpells <= 0); statsBonusList.querySelector('[data-bonus="noSpells"] .bonus-amount').textContent = stats.bonusGoldNoSpells;
    statsBonusList.querySelector('[data-bonus="fullHp"]').classList.toggle('hidden', stats.bonusGoldFullHp <= 0); statsBonusList.querySelector('[data-bonus="fullHp"] .bonus-amount').textContent = stats.bonusGoldFullHp;
    statsBonusList.querySelector('[data-bonus="noLosses"]').classList.toggle('hidden', stats.bonusGoldNoLosses <= 0); statsBonusList.querySelector('[data-bonus="noLosses"] .bonus-amount').textContent = stats.bonusGoldNoLosses;
    levelCompleteScreen.classList.remove('hidden'); levelCompleteScreen.classList.add('visible');
}
function hideLevelComplete() { levelCompleteScreen?.classList.remove('visible'); levelCompleteScreen?.classList.add('hidden'); }
function isLevelCompleteOpen() { return levelCompleteScreen?.classList.contains('visible'); }

function showGameOverScreen(playerWon, message, isForfeit = false) {
    hideAllOverlays(); stopMusic(); stopTooltipUpdater(); if (!gameOverScreen || !gameOverTitle || !gameOverMessage || !restartButton || !gameOverToTitleButton) return;
    gameOverTitle.textContent = playerWon ? "Victory!" : (isForfeit ? "Level Forfeited" : "Defeat!"); gameOverMessage.innerHTML = message; restartButton.textContent = playerWon ? "Play Again?" : "Restart Level";
    restartButton.style.display = (isForfeit || playerWon) ? 'none' : 'inline-block'; gameOverToTitleButton.textContent = "Back to Title"; gameOverScreen.classList.remove('hidden'); gameOverScreen.classList.add('visible');
}
function hideGameOverScreen() { gameOverScreen?.classList.remove('visible'); gameOverScreen?.classList.add('hidden'); }
function isGameOverScreenVisible() { return gameOverScreen?.classList.contains('visible'); }

function showMenu() { if (!isAnyOverlayVisible() && isGameActive()) { menuOverlay?.classList.remove('hidden'); menuOverlay?.classList.add('visible'); updateGoldDisplay(); updateQuitButton(); updateHpBarSettingUI(gameSettings.showHpBars); stopTooltipUpdater(); startTooltipUpdater(); } }
function hideMenu() { menuOverlay?.classList.remove('visible'); menuOverlay?.classList.add('hidden'); stopTooltipUpdater(); if(isGameActive() && !isAnyOverlayVisible()) startTooltipUpdater(); }
function isMenuOpen() { return menuOverlay?.classList.contains('visible'); }

function saveScoreToLeaderboard(level, gold) {
    try {
        const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]'); const existingScoreIndex = leaderboard.findIndex(score => score.level === level); if (existingScoreIndex !== -1 && leaderboard[existingScoreIndex].gold >= gold) return; if (existingScoreIndex !== -1) leaderboard.splice(existingScoreIndex, 1);
        leaderboard.push({ level, gold, date: new Date().toISOString().split('T')[0] }); leaderboard.sort((a, b) => { if (b.level !== a.level) return b.level - a.level; return b.gold - a.gold; });
        const uniqueLeaderboard = leaderboard.filter((entry, index, self) => index === self.findIndex((t) => (t.level === entry.level && t.gold === entry.gold && t.date === entry.date)));
        localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(uniqueLeaderboard.slice(0, MAX_LEADERBOARD_ENTRIES)));
    } catch (e) { console.error("Error saving leaderboard:", e); }
}
function showLeaderboard() {
    hideAllOverlays(); stopTooltipUpdater(); leaderboardList.innerHTML = '';
    try {
        const leaderboard = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || '[]'); if (leaderboard.length === 0) leaderboardList.innerHTML = '<li>No scores yet!</li>';
        else leaderboard.forEach(score => { const li = document.createElement('li'); li.innerHTML = `<span>Lvl ${score.level} (${score.date})</span> <span>${score.gold} <img src="./sprites/gold.png" alt="G" class="gold-icon-inline"></span>`; leaderboardList.appendChild(li); });
    } catch(e) { console.error("Error reading leaderboard:", e); leaderboardList.innerHTML = '<li>Error loading scores.</li>'; }
    leaderboardOverlay?.classList.remove('hidden'); leaderboardOverlay?.classList.add('visible');
}
function hideLeaderboard() { leaderboardOverlay?.classList.remove('visible'); leaderboardOverlay?.classList.add('hidden'); }
function isLeaderboardOpen() { return leaderboardOverlay?.classList.contains('visible'); }

function showLevelSelect() {
    fullGameReset();
    hideAllOverlays();
    levelSelectScreen?.classList.remove('hidden');
    levelSelectScreen?.classList.add('visible');
    gameBoardWrapper?.classList.remove('active');

    console.log("showLevelSelect: Loading game data...");
    loadGameData();
    console.log(`showLevelSelect: Data loaded. highestLevelUnlocked = ${highestLevelUnlocked}`);

    updateLevelSelectScreen();
    stopTooltipUpdater();
    stopMusic();

    const img = new Image();
    img.onload = () => {
        console.log("showLevelSelect: Map image loaded successfully.");
        mapIntrinsicWidth = img.naturalWidth || 1024;
        mapIntrinsicHeight = img.naturalHeight || 1024;
        console.log(`showLevelSelect: Map dimensions set: ${mapIntrinsicWidth}x${mapIntrinsicHeight}`);
        focusMapOnQuadrant();
        startTooltipUpdater();
    };
    img.onerror = () => {
        console.error("!!!!!!!! showLevelSelect: FAILED TO LOAD MAP IMAGE !!!!!!!!!");
        mapIntrinsicWidth = 1024;
        mapIntrinsicHeight = 1024;
        mapZoom = 1; mapOffsetX = 0; mapOffsetY = 0;
        console.log("showLevelSelect: Applying fallback map zoom/pan.");
        applyMapZoomAndPan(true);
        startTooltipUpdater();
    };
    console.log("showLevelSelect: Starting map image load from:", WORLD_MAP_IMAGE_URL);
    img.src = WORLD_MAP_IMAGE_URL;
}

function focusMapOnQuadrant(immediate = true) {
    if (!levelSelectMapContainer || !levelSelectMap) return;

    // Determine target quadrant (same as before)
    const currentHighestLevel = parseInt(highestLevelUnlocked || '1', 10);
    const levelIndex = Math.max(0, currentHighestLevel - 1);
    const quadrantIndex = Math.floor(levelIndex / LEVELS_PER_QUADRANT) % 4;
    const targetCenter = VISUAL_QUADRANT_CENTERS[quadrantIndex] || { x: 50, y: 50 };
    const targetXPercent = targetCenter.x;
    const targetYPercent = targetCenter.y;

    // --- Determine Target Zoom Based on Screen Size ---
    const isMobileView = window.matchMedia("(max-width: 700px)").matches;

    let targetZoom;
    if (isMobileView) {
        targetZoom = MOBILE_INITIAL_MAP_ZOOM_LEVEL; // Use specific mobile zoom
        console.log(`focusMapOnQuadrant: Using MOBILE initial zoom: ${targetZoom}`);
    } else {
        targetZoom = INITIAL_MAP_ZOOM_LEVEL; // Use original desktop zoom from config.js
        console.log(`focusMapOnQuadrant: Using DESKTOP initial zoom: ${targetZoom}`);
    }

    // Clamp the chosen initial zoom within min/max limits
    targetZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, targetZoom));
    // --- End Determine Target Zoom ---

    // Get dimensions and calculate scale (same as before)
    const containerRect = levelSelectMapContainer.getBoundingClientRect();
    if (containerRect.width <= 0 || containerRect.height <= 0) return;
    const safeMapWidth = Math.max(1, mapIntrinsicWidth || 1024);
    const safeMapHeight = Math.max(1, mapIntrinsicHeight || 1024);
    const baseScale = calculateMapScale(containerRect.width, containerRect.height, safeMapWidth, safeMapHeight);
    const finalScale = baseScale * targetZoom;
    if (finalScale <= 0 || isNaN(finalScale)) return;

    // --- Adaptive Initial Offset Calculation (same as before) ---
    let initialOffsetX, initialOffsetY;
    const targetWorldX = (targetXPercent / 100) * safeMapWidth;
    const targetWorldY = (targetYPercent / 100) * safeMapHeight;

    // Calculate the initial desired center point offset
    initialOffsetX = containerRect.width / 2 - targetWorldX * finalScale;
    initialOffsetY = containerRect.height / 2 - targetWorldY * finalScale;
    // console.log(`focusMapOnQuadrant (${isMobileView ? 'Mobile' : 'Desktop'}): Calculated initial centered offsets: X=${initialOffsetX.toFixed(1)}, Y=${initialOffsetY.toFixed(1)}`);

    // --- Clamp the INITIAL Offsets using the ADAPTIVE clamp function ---
    // Temporarily set mapZoom for the clamp function to use the *target* zoom
    const originalMapZoom = mapZoom;
    mapZoom = targetZoom;
    const clampedOffsets = clampMapOffsets(initialOffsetX, initialOffsetY); // Calls the adaptive clamp function
    mapZoom = originalMapZoom; // Restore global mapZoom (applyMapZoomAndPan will use targetZoom anyway)

    // --- Set Global State and Apply ---
    mapZoom = targetZoom; // Set the global zoom to the determined initial value
    mapOffsetX = clampedOffsets.x;
    mapOffsetY = clampedOffsets.y;

    console.log(`focusMapOnQuadrant (Final State Set): Zoom=${mapZoom.toFixed(2)}, OffsetX=${mapOffsetX.toFixed(1)}, OffsetY=${mapOffsetY.toFixed(1)}`);

    applyMapZoomAndPan(immediate); // Apply the initial view
}

function handleMapPanStartTouch(event) {
    // console.log("handleMapPanStartTouch: Touch detected."); // Debug log

    // Basic checks (already panning, overlays)
    const anotherOverlayActive = isGameOverScreenVisible() || isMenuOpen() || isLeaderboardOpen() || isShopOpen() || isLevelCompleteOpen() || isChooseTroopsScreenOpen() || isMainMenuOpen();
    if (isMapPanning || anotherOverlayActive) {
         console.log("handleMapPanStartTouch: Panning prevented by existing pan or overlay.");
         return;
    }

    // Check if the touch started on a button or level dot
    const touchTarget = event.target;
    const clickedDot = touchTarget.closest('.level-dot');
    const clickedButton = touchTarget.closest('button, .primary-button, .secondary-button');
    if (clickedDot || clickedButton) {
        console.log("handleMapPanStartTouch: Panning prevented by touching dot or button.");
        return;
    }

    // Prevent default scrolling/zooming behavior associated with touch drag
    event.preventDefault();

    // Proceed only if there's at least one touch point
    if (event.touches.length >= 1) {
        const touch = event.touches[0]; // Use the first touch point

        isMapPanning = true;
        mapPanStartX = touch.clientX; // Use clientX/clientY from the touch object
        mapPanStartY = touch.clientY;
        mapStartPanX = mapOffsetX;
        mapStartPanY = mapOffsetY;
        // console.log(`handleMapPanStartTouch: Panning STARTED. isMapPanning=${isMapPanning}, startOffset=(${mapStartPanX}, ${mapStartPanY})`); // Debug Log

        if (levelSelectMapContainer) {
             levelSelectMapContainer.style.cursor = 'grabbing'; // Still useful for desktop debugging
        }

        // Add MOVE and END listeners for touch
        document.addEventListener('touchmove', handleMapPanMoveTouch, { passive: false }); // Use passive:false
        document.addEventListener('touchend', handleMapPanEndTouch, { once: true });
        document.addEventListener('touchcancel', handleMapPanEndTouch, { once: true }); // Handle cancellation
    }
}

function handleMapPanMoveTouch(event) {
    if (!isMapPanning || !levelSelectMap || !levelSelectMapContainer || event.touches.length === 0) {
        return; // Exit if not panning or no touch points
    }

    // Prevent default scrolling
    event.preventDefault();

    const touch = event.touches[0]; // Use the first touch point

    const deltaX = touch.clientX - mapPanStartX;
    const deltaY = touch.clientY - mapPanStartY;
    const rawOffsetX = mapStartPanX + deltaX;
    const rawOffsetY = mapStartPanY + deltaY;

    // Use the adaptive clamp function
    const clampedOffsets = clampMapOffsets(rawOffsetX, rawOffsetY);
    mapOffsetX = clampedOffsets.x;
    mapOffsetY = clampedOffsets.y;

    applyMapZoomAndPan(true); // Apply immediately during drag
}

// Touch equivalent of handleMapPanEnd
function handleMapPanEndTouch(event) {
    // console.log(`handleMapPanEndTouch: Touch end/cancel detected. isMapPanning was ${isMapPanning}`); // Debug log
    if (!isMapPanning) return;

    // No need for event.preventDefault() here typically

    isMapPanning = false; // Set flag to false FIRST
    // console.log(`handleMapPanEndTouch: Panning STOPPED. isMapPanning=${isMapPanning}`); // Debug Log

    if (levelSelectMapContainer) {
        levelSelectMapContainer.style.cursor = 'grab'; // Reset cursor
    }

    // Remove listeners specific to touch
    document.removeEventListener('touchmove', handleMapPanMoveTouch);
    document.removeEventListener('touchend', handleMapPanEndTouch);
    document.removeEventListener('touchcancel', handleMapPanEndTouch);
}

function hideLevelSelect() { levelSelectScreen?.classList.remove('visible'); levelSelectScreen?.classList.add('hidden'); stopTooltipUpdater(); }
function isLevelSelectOpen() { return levelSelectScreen?.classList.contains('visible'); }

function updateLevelSelectScreen() {
    if (!levelSelectDotsLayer || !levelSelectMap) return;
    levelSelectDotsLayer.innerHTML = '';
    levelSelectMap.style.backgroundImage = `url('${WORLD_MAP_IMAGE_URL}')`;

    const isMobileView = window.matchMedia("(max-width: 700px)").matches;
    const activeQuadrantCenters = isMobileView ? MOBILE_VISUAL_QUADRANT_CENTERS : VISUAL_QUADRANT_CENTERS;

    const distanceStep = isMobileView
    ? (typeof MOBILE_LEVEL_DOT_SPIRAL_DISTANCE_STEP !== 'undefined' ? MOBILE_LEVEL_DOT_SPIRAL_DISTANCE_STEP : 0.6) // Use mobile or default mobile
    : (typeof LEVEL_DOT_SPIRAL_DISTANCE_STEP !== 'undefined' ? LEVEL_DOT_SPIRAL_DISTANCE_STEP : 0.8); // Use desktop or default desktop

const angleStepDeg = isMobileView
    ? (typeof MOBILE_LEVEL_DOT_SPIRAL_ANGLE_STEP !== 'undefined' ? MOBILE_LEVEL_DOT_SPIRAL_ANGLE_STEP : 137.5) // Use mobile or default mobile
    : (typeof LEVEL_DOT_SPIRAL_ANGLE_STEP !== 'undefined' ? LEVEL_DOT_SPIRAL_ANGLE_STEP : 137.5);

    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
        const dot = document.createElement('div');
        dot.className = 'level-dot';
        dot.dataset.level = i;
        dot.textContent = `${i}`;

        const levelIndex = i - 1;
        const quadrantIndex = Math.floor(levelIndex / LEVELS_PER_QUADRANT) % 4;
        const center = activeQuadrantCenters[quadrantIndex]; // Get the correct island center %
        const levelInQuadrant = levelIndex % LEVELS_PER_QUADRANT;

        // Use the distanceStep and angleStepDeg determined above
        const distance = levelInQuadrant * distanceStep;
        const angleDeg = (levelInQuadrant * angleStepDeg) + 90; // Add offset as before
        const angleRad = angleDeg * (Math.PI / 180);

        let offsetX = Math.cos(angleRad) * distance;
        let offsetY = Math.sin(angleRad) * distance;

        if (isMobileView) {
            // Get stretch factor from config or use default 1 (no stretch)
            const stretchFactor = (typeof MOBILE_HORIZONTAL_STRETCH_FACTOR !== 'undefined') ? MOBILE_HORIZONTAL_STRETCH_FACTOR : 1;
            offsetX *= stretchFactor; // Multiply horizontal offset
        }

        const targetXPercent = center.x + offsetX;
        const targetYPercent = center.y + offsetY;

        // Store these base percentages in the dataset (used by positionLevelDots)
        dot.dataset.targetX = targetXPercent;
        dot.dataset.targetY = targetYPercent;

        // Keep the rest of the logic for locked/beaten/unlocked and event listener
        if (i > highestLevelUnlocked) {
            dot.classList.add('locked');
            dot.disabled = true;
            dot.title = "Locked";
        } else {
            if (highestLevelUnlocked > i) {
                dot.classList.add('beaten');
                dot.title = `Level ${i} (Completed)`;
            } else {
                dot.classList.add('unlocked');
                dot.title = `Start Level ${i}`;
            }
            dot.addEventListener('click', handleLevelDotClick);
        }
        fragment.appendChild(dot);
    }
    levelSelectDotsLayer.appendChild(fragment);
    positionLevelDots(); // Position dots after adding them
}

function handleLevelDotClick(e) {
    const dot = e.currentTarget;
    if (dot && !dot.classList.contains('locked')) {
        const lvl = parseInt(dot.dataset.level);
        if (!isNaN(lvl)) {
            playSfx('levelSelect');
            hideLevelSelect();
            initGame(lvl);
        } else {
            // Log an error if the level number couldn't be parsed (shouldn't normally happen)
            console.error("Invalid level number found on dot:", dot.dataset.level);
            playSfx('error'); // Play an error sound
        }
    }
}

function positionLevelDots() {
    if (!levelSelectMap || !levelSelectDotsLayer) return;

    levelSelectDotsLayer.querySelectorAll('.level-dot').forEach(dot => {
        const targetXPercent = parseFloat(dot.dataset.targetX || '50');
        const targetYPercent = parseFloat(dot.dataset.targetY || '50');

        // Set position using percentages
        dot.style.left = `${targetXPercent}%`;
        dot.style.top = `${targetYPercent}%`;

        const isHovered = dot === lastHoveredElement; // Check if this specific dot is being hovered

        dot.style.transform = `translate(-50%, -50%)${isHovered ? ' scale(1.45)' : ''}`;
        // --- END MODIFIED LINE ---
    });
}

function showShop(origin = 'unknown', isBetweenLevelsFlag = false) {
    hideAllOverlays();
    currentShopOrigin = origin;
    shopIsBetweenLevels = isBetweenLevelsFlag;
    updateShopDisplay();
    shopScreen?.classList.remove('hidden');
    shopScreen?.classList.add('visible');
    stopTooltipUpdater();
    startTooltipUpdater();
}

function hideShop() { shopScreen?.classList.remove('visible'); shopScreen?.classList.add('hidden'); stopTooltipUpdater(); if (isGameActive() || isLevelSelectOpen() || isChooseTroopsScreenOpen()) startTooltipUpdater(); }
function isShopOpen() { return shopScreen?.classList.contains('visible'); }


function updateShopDisplay() {
    if (!shopItemsContainer) return;
    updateGoldDisplay();
    shopFeedbackElement.textContent = '';
    shopFeedbackElement.className = 'shop-message';

    shopItemsContainer.querySelectorAll('.shop-item').forEach(item => {
        const itemId = item.dataset.itemId;
        const unitType = item.dataset.unitType;
        const spellName = item.dataset.spellName;
        const passiveId = itemId?.startsWith('passive_') ? itemId.substring(8) : null;
        const costButton = item.querySelector('.shop-buy-button');
        const costSpan = item.querySelector('.shop-item-cost');
        const titleElement = item.querySelector('h4');
        const countSpan = item.querySelector('.unit-count');
        const spellLevelSpan = item.querySelector('.spell-level');
        const maxCount = parseInt(item.dataset.max);
        let cost = 0;
        let requiredLevel = parseInt(costButton?.dataset.requiredLevel) || 0;
        let canBuy = false;
        let isLocked = false;
        let isMaxed = false;

        if (itemId?.startsWith('recruit_')) {
            const configCost = RECRUIT_COSTS[unitType];
            if (configCost !== undefined) { cost = configCost; }
            else { console.warn(`Recruit cost for ${unitType} not found.`); cost = 99999; }
            if (costSpan) costSpan.textContent = cost === 99999 ? "N/A" : cost;
            if (costButton) costButton.dataset.cost = cost;
            const currentOwnedCount = playerOwnedUnits[unitType] || 0;
            if (countSpan) countSpan.textContent = currentOwnedCount;
            isMaxed = currentOwnedCount >= maxCount;
            canBuy = playerGold >= cost && !isMaxed;
            if (titleElement && UNIT_DATA[unitType]) {
                 const unitName = UNIT_DATA[unitType].name;
                 titleElement.innerHTML = `<span class="shop-icon-container"><img src="${UNIT_DATA[unitType].spriteUrl}" class="shop-item-icon" alt="${unitName} Icon"></span> ${unitName} (<span class="unit-count">${currentOwnedCount}</span>/${maxCount})`;
                 item.title = `Recruit a ${unitName} (Max ${maxCount}). Owned: ${currentOwnedCount}`;
            }
        } else if (itemId?.startsWith('upgrade_unit_')) {
            cost = UNIT_UPGRADE_COSTS[itemId] || parseInt(costButton?.dataset.cost) || 99999;
             if (costSpan) costSpan.textContent = cost;
             if (costButton) costButton.dataset.cost = cost;
            canBuy = playerGold >= cost;
            const unitNameMatch = item.querySelector('h4')?.textContent.match(/^.*?(\w+)\s+HP/i) || item.querySelector('h4')?.textContent.match(/^.*?(\w+)\s+ATK/i);
            const unitName = unitNameMatch ? unitNameMatch[1] : 'Unit';
            item.title = `Increase ${unitName}'s ${itemId.endsWith('hp') ? 'Max HP' : 'Attack'} by 1.`;
        } else if (itemId?.startsWith('upgrade_spell_')) {
            const config = SPELL_UPGRADE_CONFIG[spellName];
            if (config) {
                const currentUpgradeLevel = playerSpellUpgrades[spellName] || 0;
                cost = calculateSpellCost(spellName);
                isMaxed = currentUpgradeLevel >= config.maxLevel;
                requiredLevel = config.requiredLevel;
                isLocked = highestLevelUnlocked <= requiredLevel;
                canBuy = playerGold >= cost && !isLocked && !isMaxed;
                if(costSpan) costSpan.textContent = isMaxed ? 'MAX' : (cost === Infinity ? 'MAX' : cost);
                if(spellLevelSpan) spellLevelSpan.textContent = currentUpgradeLevel + 1;
                if (costButton) {
                    costButton.dataset.cost = (cost === Infinity ? '99999' : cost);
                    costButton.textContent = isLocked ? `Buy (Lvl ${requiredLevel+1})` : (isMaxed ? 'Maxed' : 'Buy');
                }
                item.title = item.dataset.baseTitle || item.querySelector('h4 span:last-of-type')?.textContent.split('[')[0].trim() || "Spell Upgrade";
                 if (isMaxed) item.title += ` (Max Level)`;
                 else if (isLocked) item.title += ` (Requires Lvl ${requiredLevel + 1} Clear)`;
                 else item.title += ` (Upgrade to Lvl ${currentUpgradeLevel + 2})`;
            } else { isLocked = true; canBuy = false; }
        } else if (passiveId && PASSIVE_UPGRADE_COSTS[passiveId]) {
            isMaxed = playerPassiveUpgrades[passiveId];
            cost = PASSIVE_UPGRADE_COSTS[passiveId];
             if (costSpan) costSpan.textContent = cost;
             if (costButton) costButton.dataset.cost = cost;
            canBuy = playerGold >= cost && !isMaxed;
            if (costButton) costButton.textContent = isMaxed ? 'Owned' : 'Buy';
            item.title = PASSIVE_DATA[passiveId]?.description || "Passive";
            if (isMaxed) item.title += " (Owned)";
        }

        if (costButton) { costButton.disabled = !canBuy; costButton.classList.toggle('maxed', isMaxed); }
        item.classList.toggle('locked', isLocked); item.classList.toggle('maxed', isMaxed);
    });
}

function handleShopPurchase(event) {
    if (!event.target.matches('.shop-buy-button') || event.target.disabled) return;
    const button = event.target;
    const itemElement = button.closest('.shop-item');
    const itemId = itemElement.dataset.itemId;
    let purchaseResult = { success: false, showTroopsPopup: false };
    let feedback = '';
    let itemName = itemElement.querySelector('h4')?.textContent || 'Item';
    if (itemName.includes('[')) itemName = itemName.split('[')[0].trim();
    if (itemName.includes('(')) itemName = itemName.split('(')[0].trim();

    if (itemId.startsWith('recruit_')) {
        const unitType = itemElement.dataset.unitType;
        purchaseResult = purchaseUnit(unitType);
        feedback = purchaseResult.success ? `Recruited ${itemName}!` : `Cannot recruit.`;
    } else if (itemId.startsWith('upgrade_unit_')) {
        purchaseResult.success = purchaseUnitUpgrade(itemId);
        feedback = purchaseResult.success ? `Upgraded ${itemName}!` : `Cannot upgrade.`;
    } else if (itemId.startsWith('upgrade_spell_')) {
        const spellName = itemElement.dataset.spellName;
        purchaseResult.success = purchaseSpellUpgrade(spellName);
        feedback = purchaseResult.success ? `Upgraded ${itemName}!` : `Cannot upgrade.`;
    } else if (itemId.startsWith('passive_')) {
        const passiveId = itemId.substring(8);
        purchaseResult.success = purchasePassive(passiveId);
        feedback = purchaseResult.success ? `Purchased ${itemName}!` : `Cannot purchase.`;
    }

    if (purchaseResult.success) {
        playSfx('shopBuy');
        shopFeedbackElement.textContent = feedback;
        shopFeedbackElement.className = 'shop-message success';
        updateShopDisplay();
        updateChooseTroopsScreen();
        shouldShowTroopsAfterPurchase = purchaseResult.showTroopsPopup || false;
    } else {
        playSfx('error');
        shopFeedbackElement.textContent = feedback || 'Purchase failed.';
        shopFeedbackElement.className = 'shop-message error';
    }
}

// ui.js

/**
 * Sets or cancels the active spell based on user input (clicking icon or pressing Esc).
 * Updates the UI (spell icons, board cursor/class) accordingly.
 * Clears any existing spell-related highlights.
 * Provides feedback only if the spell selection fails.
 * @param {string | null} spellName - The name of the spell to activate, or null to cancel.
 */
function setActiveSpell(spellName) {
    // --- Initial Checks ---
    // Don't allow spell changes if not player turn, game not active, or processing an action
    if (!isGameActive() || isProcessing || currentTurn !== 'player') {
        // If a spell was somehow active during an invalid state, clear it
        if (currentSpell) {
            currentSpell = null;
            clearSpellHighlights();
            updateSpellUI();
            gameBoard?.classList.remove('fireball-targeting', 'flame-wave-targeting', 'frost-nova-targeting', 'heal-targeting');
        }
        return; // Exit early
    }

    let newSpell = null;        // The spell state to apply at the end
    let feedbackMessage = null; // Store potential error message

    // --- Determine New Spell State ---
    if (spellName) { // Attempting to select or toggle a specific spell
        if (currentSpell === spellName) {
            // Clicking the already active spell: Toggle OFF
            newSpell = null;
            playSfx('error'); // Sound for cancellation/toggle off
        } else {
            // Clicking a new spell icon: Validate it
            const unlockLevels = {
                fireball: FIREBALL_UNLOCK_LEVEL,
                flameWave: FLAME_WAVE_UNLOCK_LEVEL,
                frostNova: FROST_NOVA_UNLOCK_LEVEL,
                heal: HEAL_UNLOCK_LEVEL
            };
            const requiredLevel = unlockLevels[spellName];
            const isUnlocked = (requiredLevel !== undefined && currentLevel >= requiredLevel) || unlimitedSpellsCheat;
            const isSpellReady = (spellUses[spellName] === true || unlimitedSpellsCheat);

            if (isUnlocked && isSpellReady) {
                // Valid selection: Set as the new spell
                newSpell = spellName;
                playSfx('select');
                // Deselect any active unit when selecting a spell
                if (selectedUnit) deselectUnit(false);
            } else {
                // Invalid selection: Keep spell null, prepare feedback
                newSpell = null;
                playSfx('error');
                if (!isUnlocked && requiredLevel !== undefined) {
                    feedbackMessage = `Spell locked (Lvl ${requiredLevel})`;
                } else if (!isSpellReady) {
                    feedbackMessage = "Spell already used.";
                } else {
                    feedbackMessage = "Cannot select spell."; // Should be rare
                }
            }
        }
    } else {
        // Called with null (e.g., pressing Esc): Cancel current spell
        if (currentSpell) playSfx('error'); // Play sound only if cancelling an active spell
        newSpell = null;
    }

    // --- Apply Changes ---

    // 1. Clear any visual highlights from the previous state *before* updating
    if (typeof clearSpellHighlights === 'function') {
        clearSpellHighlights();
    }
    // Also clear attack highlights if switching from unit selection
    if (selectedUnit?.type === 'champion') clearAttackHoverHighlights();


    // 2. Update the global currentSpell variable
    currentSpell = newSpell;

    // 3. Update Spell Icon UI (highlights the selected/dims others)
    if(typeof updateSpellUI === 'function') {
        updateSpellUI();
    }

    // 4. Update Game Board Cursor/Class
    gameBoard?.classList.remove('fireball-targeting', 'flame-wave-targeting', 'frost-nova-targeting', 'heal-targeting');
    if (currentSpell) {
        gameBoard?.classList.add(`${currentSpell}-targeting`);
    }

    // 5. Show feedback message ONLY if an error occurred during selection
    if (feedbackMessage && typeof showFeedback === 'function') {
        showFeedback(feedbackMessage, "feedback-error");
    }
}

function clearFireballHighlight() {
    gridContent?.querySelectorAll('.valid-fireball-target').forEach(el => el.classList.remove('valid-fireball-target'));
    units.forEach(u => u.element?.classList.remove('valid-fireball-target'));
}
function clearHealHighlight() {
    gridContent?.querySelectorAll('.valid-heal-target').forEach(el => el.classList.remove('valid-heal-target'));
    units.forEach(u => u.element?.classList.remove('valid-heal-target'));
}


function clearSpellHighlights() { clearFrostNovaPreview();
    clearFlameWaveHighlight(); clearFireballHighlight();
    clearHealHighlight();}

function toggleMute() { isMuted = !isMuted; bgMusic.muted = isMuted; Object.values(sfx).forEach(sound => { if (sound) sound.muted = isMuted; }); updateMuteButtonVisual(); if (!isMuted) { initializeAudio(); startMusicIfNotPlaying(); } else { stopMusic(); } }
function updateMuteButtonVisual() { if(muteButton) muteButton.querySelector('span').textContent = isMuted ? '🔇' : '🔊'; }
function isFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement); }
function toggleFullscreen() { if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled && !document.mozFullScreenEnabled && !document.msFullscreenEnabled) { console.warn("Fullscreen not supported."); if (fullscreenButton) fullscreenButton.disabled = true; return; } const container = gameContainer || document.documentElement; if (!isFullscreen()) { if (container.requestFullscreen) container.requestFullscreen().catch(err => console.error(`FS Error: ${err.message}`)); else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen(); else if (container.mozRequestFullScreen) container.mozRequestFullScreen(); else if (container.msRequestFullscreen) container.msRequestFullscreen(); } else { if (document.exitFullscreen) document.exitFullscreen().catch(err => console.error(`Exit FS Error: ${err.message}`)); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); else if (document.mozCancelFullScreen) document.mozCancelFullScreen(); else if (document.msExitFullscreen) document.msExitFullscreen(); } }
function updateFullscreenButton() { if (fullscreenButton) { fullscreenButton.disabled = !(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.mozFullScreenEnabled || document.msFullscreenEnabled); fullscreenButton.querySelector('span').textContent = isFullscreen() ? '✖️' : '⛶'; fullscreenButton.title = isFullscreen() ? "Exit Fullscreen (F4)" : "Toggle Fullscreen (F4)"; } }

function proceedToNextLevelOrLocation() { startNextLevel(); }
function proceedAfterShopMaybe() {
    if (shouldShowTroopsAfterPurchase) {
        shouldShowTroopsAfterPurchase = false;
        const levelForTroops = shopIsBetweenLevels ? 0 : (currentShopOrigin === 'levelSelect' ? 0 : currentLevel);
        showChooseTroopsScreen(levelForTroops, currentShopOrigin);
    }
    else if (shopIsBetweenLevels) {
        shopIsBetweenLevels = false;
        currentShopOrigin = '';
        proceedToNextLevelOrLocation();
    }
    else {
        const origin = currentShopOrigin;
        currentShopOrigin = '';
        switch (origin) {
            case 'levelSelect': showLevelSelect(); break;
            case 'menu': showMenu(); break;
            default: console.warn("Shop origin unknown."); showLevelSelect(); break;
        }
        startTooltipUpdater();
    }
}

function showChooseTroopsScreen(levelToStart = 0, origin = 'unknown') {
    hideAllOverlays();
    stopTooltipUpdater();
    levelToStartAfterManage = levelToStart;
    troopScreenOrigin = origin;

    loadGameData();

    if (chooseTroopsTitle) chooseTroopsTitle.textContent = "Choose Troops";
    if (confirmTroopsButton) {
             confirmTroopsButton.textContent = "Confirm";
             confirmTroopsButton.title = "Confirm";
    }

    updateChooseTroopsScreen();
    chooseTroopsScreen?.classList.remove('hidden');
    chooseTroopsScreen?.classList.add('visible');
    startTooltipUpdater();
}

function hideChooseTroopsScreen() { chooseTroopsScreen?.classList.remove('visible'); chooseTroopsScreen?.classList.add('hidden'); stopTooltipUpdater(); }
function isChooseTroopsScreenOpen() { return chooseTroopsScreen?.classList.contains('visible'); }

function updateChooseTroopsScreen() {
    if (!currentTroopsList || !availableTroopsList || !currentRosterCountElement || !playerOwnedUnits || !playerActiveRoster || !confirmTroopsButton) return;
    currentTroopsList.innerHTML = ''; availableTroopsList.innerHTML = ''; chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message';
    const totalActive = getTotalActiveUnits(); currentRosterCountElement.textContent = totalActive;
    const allPlayerUnitTypes = Object.keys(UNIT_DATA).filter(type => UNIT_DATA[type].team === 'player');
    allPlayerUnitTypes.forEach(unitType => {
        const owned = playerOwnedUnits[unitType] || 0; if (owned === 0) return;
        const active = playerActiveRoster[unitType] || 0; const available = owned - active; const unitData = UNIT_DATA[unitType];
        if (active > 0) { const card = document.createElement('div'); card.className = 'troop-card'; card.dataset.unitType = unitType; card.innerHTML = `<img src="${unitData.spriteUrl}" alt="${unitData.name}"><span class="troop-count">${active}</span>`; card.addEventListener('click', handleTroopCardClick); currentTroopsList.appendChild(card); }
        if (available > 0) { const card = document.createElement('div'); card.className = 'troop-card'; card.dataset.unitType = unitType; card.innerHTML = `<img src="${unitData.spriteUrl}" alt="${unitData.name}"><span class="troop-count">${available}</span>`; if (totalActive >= MAX_ACTIVE_ROSTER_SIZE) card.classList.add('disabled'); else card.addEventListener('click', handleTroopCardClick); availableTroopsList.appendChild(card); }
    });
    if (currentTroopsList.children.length === 0) currentTroopsList.innerHTML = `<p style="width:100%; text-align:center; color: var(--color-text-muted);">Click available troops below!</p>`;
    if (availableTroopsList.children.length === 0) availableTroopsList.innerHTML = `<p style="width:100%; text-align:center; color: var(--color-text-muted);">No troops in reserve.</p>`;
    confirmTroopsButton.disabled = (totalActive === 0);
          confirmTroopsButton.textContent = "Confirm";
          confirmTroopsButton.title = "Confirm";
}

function handleTroopCardClick(event) {
    const card = event.currentTarget; if (card.classList.contains('disabled')) { playSfx('error'); chooseTroopsFeedback.textContent = "Roster full (Max 12)"; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; }, 1500); return; }
    const unitType = card.dataset.unitType; const parentListId = card.parentElement.id; let success = false;
    if (parentListId === 'current-troops-list') success = removeUnitFromActiveRoster(unitType); else if (parentListId === 'available-troops-list') success = addUnitToActiveRoster(unitType);
    if (success) { playSfx('select'); updateChooseTroopsScreen(); } else { playSfx('error'); console.error("Troop move failed."); }
}

function handleConfirmTroops() {
     const totalActive = getTotalActiveUnits();
     if (totalActive === 0) { playSfx('error'); chooseTroopsFeedback.textContent = "Roster cannot be empty."; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { if (chooseTroopsFeedback) { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; } }, 2000); return; }
     if (totalActive > MAX_ACTIVE_ROSTER_SIZE) { playSfx('error'); chooseTroopsFeedback.textContent = `Roster max ${MAX_ACTIVE_ROSTER_SIZE}.`; chooseTroopsFeedback.className = 'shop-message error'; setTimeout(() => { if (chooseTroopsFeedback) { chooseTroopsFeedback.textContent = ''; chooseTroopsFeedback.className = 'shop-message'; } }, 2000); return; }
     hideChooseTroopsScreen(); playSfx('success'); saveGameData();
     const origin = troopScreenOrigin; const levelToStart = levelToStartAfterManage;
     troopScreenOrigin = ''; levelToStartAfterManage = 0;
     if (origin === 'shop') { showShop(currentShopOrigin, shopIsBetweenLevels); startTooltipUpdater(); }
     else { showLevelSelect(); startTooltipUpdater(); }
 }

 function handleTroopsBack() {
    hideChooseTroopsScreen();
    playSfx('menuClose');
    const origin = troopScreenOrigin;
    troopScreenOrigin = '';
    levelToStartAfterManage = 0;
    if (origin === 'shop') { showShop(currentShopOrigin, shopIsBetweenLevels); }
    else { showLevelSelect(); }
    startTooltipUpdater();
}

 function createWorldHpBar(unit) {
    if (!unitHpBarsOverlay || !unit || !unit.element || worldHpBars.has(unit.id)) return;
    const barContainer = document.createElement('div'); barContainer.className = 'unit-hp-bar-world'; barContainer.dataset.unitId = unit.id;
    const barFill = document.createElement('div'); barFill.className = 'unit-hp-bar-world-fill';
    barContainer.appendChild(barFill); unitHpBarsOverlay.appendChild(barContainer); worldHpBars.set(unit.id, barContainer);
    updateWorldHpBar(unit); updateWorldHpBarPosition(unit);
 }

 function updateWorldHpBar(unit) {
    if (!unit || !worldHpBars.has(unit.id)) return; const barContainer = worldHpBars.get(unit.id); const barFill = barContainer.querySelector('.unit-hp-bar-world-fill'); if (!barFill) return;
    const hpPercent = unit.maxHp > 0 ? Math.max(0, Math.min(100, (unit.hp / unit.maxHp) * 100)) : 0; barFill.style.width = `${hpPercent}%`;
    const hpLevel = hpPercent <= 0 ? 'empty' : (hpPercent < 35 ? 'low' : (hpPercent < 70 ? 'mid' : 'high')); barFill.className = `unit-hp-bar-world-fill hp-${hpLevel}`;
 }

 function removeWorldHpBar(unitId) { if (worldHpBars.has(unitId)) { worldHpBars.get(unitId).remove(); worldHpBars.delete(unitId); } }

 function updateWorldHpBarPosition(unit) {
    if (!unit || !worldHpBars.has(unit.id) || !unit.element) return;
    const barContainer = worldHpBars.get(unit.id);
    barContainer.style.setProperty('--unit-grid-x', unit.x);
    barContainer.style.setProperty('--unit-grid-y', unit.y);
}


 function updateWorldHpBarsVisibility() {
    if (!unitHpBarsOverlay) return;
    unitHpBarsOverlay.classList.toggle('visible', gameSettings.showHpBars);
    if (gameSettings.showHpBars) {
        createAllWorldHpBars();
        updateWorldHpBars();
    } else {
        clearAllWorldHpBars();
    }
}
 function createAllWorldHpBars() { units.forEach(unit => { if (isUnitAliveAndValid(unit)) createWorldHpBar(unit); }); }
 function clearAllWorldHpBars() { worldHpBars.forEach(bar => bar.remove()); worldHpBars.clear(); }
 function updateWorldHpBars() { if (!gameSettings.showHpBars) return; units.forEach(unit => { if (isUnitAliveAndValid(unit)) { updateWorldHpBar(unit); updateWorldHpBarPosition(unit); } else { removeWorldHpBar(unit.id); } }); worldHpBars.forEach((bar, unitId) => { if (!units.find(u => u.id === unitId)) removeWorldHpBar(unitId); }); }
 function updateHpBarSettingUI(isChecked) { if(toggleHpBarsSetting) toggleHpBarsSetting.checked = isChecked; }

// --- Event Listener Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Get Element References (Keep as is)
    gameContainer = document.getElementById('game-container'); gameBoardWrapper = document.getElementById('game-board-wrapper'); gameBoard = document.getElementById('game-board'); defaultViewButton = document.getElementById('default-view-button'); gridContent = document.getElementById('grid-content'); uiPanel = document.getElementById('ui-panel'); levelDisplayElement = document.getElementById('level-display'); spellAreaElement = document.getElementById('spell-area'); fireballElement = document.getElementById('fireball-spell'); flameWaveElement = document.getElementById('flame-wave-spell'); frostNovaElement = document.getElementById('frost-nova-spell'); healElement = document.getElementById('heal-spell'); unitInfo = document.getElementById('unit-info'); unitPortraitElement = document.getElementById('unit-portrait'); actionsLeftDisplayElement = document.getElementById('actions-left-display'); unitNameDisplay = document.getElementById('unit-name'); unitAtkDisplay = document.getElementById('unit-atk'); unitMovDisplay = document.getElementById('unit-mov'); unitRngDisplay = document.getElementById('unit-rng'); unitStatusDisplay = document.getElementById('unit-status'); unitHpBarContainer = unitInfo?.querySelector('.unit-hp-bar-container'); unitHpBarElement = unitHpBarContainer?.querySelector('.unit-hp-bar'); boardFeedbackArea = document.getElementById('board-feedback-area'); endTurnButton = document.getElementById('end-turn-button');
    mainMenu = document.getElementById('main-menu'); startGameButton = document.getElementById('start-game-button'); leaderboardMenuButton = document.getElementById('leaderboard-menu-button');
    gameOverScreen = document.getElementById('game-over-screen'); restartButton = document.getElementById('restart-button'); gameOverTitle = document.getElementById('game-over-title'); gameOverMessage = document.getElementById('game-over-message'); gameOverToTitleButton = document.getElementById('game-over-to-title-button'); tooltipElement = document.getElementById('tooltip');
    menuButton = document.getElementById('menu-button'); menuOverlay = document.getElementById('menu-overlay'); closeMenuButton = document.getElementById('close-menu-button'); quitButton = document.getElementById('quit-button'); quitToMainMenuButton = document.getElementById('quit-to-main-menu-button'); menuActionButtons = document.getElementById('menu-action-buttons'); fullscreenButton = document.getElementById('fullscreen-button'); muteButton = document.getElementById('mute-button'); restartLevelIconButton = document.getElementById('restart-level-icon-button'); toggleHpBarsSetting = document.getElementById('toggle-hp-bars-setting');
    leaderboardOverlay = document.getElementById('leaderboard-overlay'); leaderboardList = document.getElementById('leaderboard-list'); closeLeaderboardButton = document.getElementById('close-leaderboard-button');
    levelSelectScreen = document.getElementById('level-select-screen'); levelSelectMapContainer = document.getElementById('level-select-map-container'); levelSelectMap = document.getElementById('level-select-map'); levelSelectDotsLayer = document.getElementById('level-select-dots-layer'); backToMainMenuButton = document.getElementById('back-to-main-menu-button'); levelSelectTroopsButton = document.getElementById('level-select-troops-button'); levelSelectShopButton = document.getElementById('level-select-shop-button');
    menuGoldAmountElement = document.getElementById('menu-gold-amount'); menuGoldDisplay = document.getElementById('menu-gold-display');
    shopScreen = document.getElementById('shop-screen'); shopItemsContainer = document.getElementById('shop-items-container'); shopGoldAmountElement = document.getElementById('shop-gold-amount'); shopGoldDisplay = document.getElementById('shop-gold-display'); shopExitButton = document.getElementById('shop-exit-button'); shopFeedbackElement = document.getElementById('shop-feedback'); shopTroopsButton = document.getElementById('shop-troops-button');
    levelCompleteScreen = document.getElementById('level-complete-screen'); levelCompleteTitle = document.getElementById('level-complete-title'); levelCompleteStats = document.getElementById('level-complete-stats'); statsEnemiesKilled = document.getElementById('stats-enemies-killed'); statsUnitsLost = document.getElementById('stats-units-lost'); statsGoldGained = document.getElementById('stats-gold-gained'); levelCompleteBonuses = document.getElementById('level-complete-bonuses'); statsBonusList = document.getElementById('stats-bonus-list'); statsTotalGold = document.getElementById('stats-total-gold'); nextLevelButton = document.getElementById('next-level-button'); levelCompleteShopButton = document.getElementById('level-complete-shop-button');
    chooseTroopsScreen = document.getElementById('choose-troops-screen'); chooseTroopsTitle = document.getElementById('choose-troops-title'); currentTroopsList = document.getElementById('current-troops-list'); availableTroopsList = document.getElementById('available-troops-list'); currentRosterCountElement = document.getElementById('current-roster-count'); chooseTroopsFeedback = document.getElementById('choose-troops-feedback'); confirmTroopsButton = document.getElementById('confirm-troops-button'); troopsBackButton = document.getElementById('troops-back-button'); // If you add a dedicated back button
    unitHpBarsOverlay = document.getElementById('unit-hp-bars-overlay');

    // Attach Event Listeners (Keep most as is)
    window.addEventListener('resize', handleResize, { passive: true }); window.addEventListener('keydown', handleKeyDown); document.addEventListener('mousemove', trackMousePosition); document.addEventListener('fullscreenchange', updateFullscreenButton); document.addEventListener('webkitfullscreenchange', updateFullscreenButton); document.addEventListener('mozfullscreenchange', updateFullscreenButton); document.addEventListener('MSFullscreenChange', updateFullscreenButton);
    gameBoard?.addEventListener('mousedown', handlePanStart); gameBoard?.addEventListener('wheel', handleZoom, { passive: false }); gridContent?.addEventListener('mouseleave', handleGridMouseLeave); defaultViewButton?.addEventListener('click', () => centerView(false));
    startGameButton?.addEventListener('click', () => { if (!isProcessing) { if (initializeAudio()) { hideMainMenu(); showLevelSelect(); } else { hideMainMenu(); showLevelSelect(); } } });
    leaderboardMenuButton?.addEventListener('click', showLeaderboard);
    gameOverToTitleButton?.addEventListener('click', showMainMenu); restartButton?.addEventListener('click', () => { if (isProcessing || !isGameOverScreenVisible()) return; const titleText = gameOverTitle?.textContent.toLowerCase() || ""; if (titleText.includes("victory") || titleText.includes("forfeited")) showMainMenu(); else { hideGameOverScreen(); showChooseTroopsScreen(levelToRestartOnLoss); } });
    endTurnButton?.addEventListener('click', () => { if (levelClearedAwaitingInput) endTurn(); else if (isGameActive() && currentTurn === 'player' && !isProcessing) { deselectUnit(false); endTurn(); } });
    menuButton?.addEventListener('click', showMenu); muteButton?.addEventListener('click', toggleMute); fullscreenButton?.addEventListener('click', toggleFullscreen); restartLevelIconButton?.addEventListener('click', () => { if (!isGameActive() || isProcessing) return; playSfx('select'); hideMenu(); initGame(currentLevel); });
    quitButton?.addEventListener('click', () => { const action = quitButton.dataset.action; hideMenu(); if (action === "forfeit") forfeitLevel(); else { showLevelSelect(); startTooltipUpdater(); } playSfx('menuClose'); });
    quitToMainMenuButton?.addEventListener('click', () => { playSfx('menuClose'); hideMenu(); showMainMenu(); }); closeMenuButton?.addEventListener('click', hideMenu);
    toggleHpBarsSetting?.addEventListener('change', (e) => { updateSetting('showHpBars', e.target.checked); });
    closeLeaderboardButton?.addEventListener('click', () => { hideLeaderboard(); showMainMenu(); }); backToMainMenuButton?.addEventListener('click', showMainMenu); levelSelectTroopsButton?.addEventListener('click', () => { if (!isLevelSelectOpen()) return; hideLevelSelect(); showChooseTroopsScreen(0, 'levelSelect'); }); levelSelectShopButton?.addEventListener('click', () => { if (!isLevelSelectOpen()) return; hideLevelSelect(); showShop('levelSelect', false); });
    levelSelectMapContainer?.addEventListener('mousedown', handleMapPanStart); // Make sure this uses the function added above
    levelSelectMapContainer?.addEventListener('touchstart', handleMapPanStartTouch, { passive: false });
    levelCompleteShopButton?.addEventListener('click', () => { hideLevelComplete(); showShop('levelComplete', true); }); nextLevelButton?.addEventListener('click', () => { hideLevelComplete(); proceedToNextLevelOrLocation(); });
    shopExitButton?.addEventListener('click', () => { hideShop(); proceedAfterShopMaybe(); }); shopTroopsButton?.addEventListener('click', () => { if (!isShopOpen()) return; hideShop(); showChooseTroopsScreen(shopIsBetweenLevels ? 0 : currentLevel, 'shop'); }); shopItemsContainer?.addEventListener('click', handleShopPurchase);
    currentTroopsList?.addEventListener('click', handleTroopCardClick); availableTroopsList?.addEventListener('click', handleTroopCardClick); confirmTroopsButton?.addEventListener('click', handleConfirmTroops);
    fireballElement?.addEventListener('click', () => setActiveSpell('fireball')); flameWaveElement?.addEventListener('click', () => setActiveSpell('flameWave')); frostNovaElement?.addEventListener('click', () => setActiveSpell('frostNova')); healElement?.addEventListener('click', () => setActiveSpell('heal'));
    bgMusic.addEventListener('ended', selectAndLoadMusic);

    // Initial Setup (Keep as is)
    loadGameData(); showMainMenu(); updateMuteButtonVisual(); updateFullscreenButton(); requestAnimationFrame(() => { try { calculateCellSize(); } catch (e) {console.error("Initial RAF Error:", e);} });
    const mapPreload = new Image(); mapPreload.onload = () => { mapIntrinsicWidth = mapPreload.naturalWidth || 1024; mapIntrinsicHeight = mapPreload.naturalHeight || 1024; }; mapPreload.onerror = () => { console.warn("Map preload failed."); mapIntrinsicWidth=1024; mapIntrinsicHeight=1024; }; mapPreload.src = WORLD_MAP_IMAGE_URL;
    shopItemsContainer?.querySelectorAll('.shop-item[data-spell-name]').forEach(item => { const h4 = item.querySelector('h4'); if (h4) item.dataset.baseTitle = h4.textContent.split('[')[0].trim(); });
});