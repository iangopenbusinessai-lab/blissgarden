function setupEvents() {
  EventBus.on('crop:harvested', () => {});
  EventBus.on('crop:sold',      () => {});
  EventBus.on('upgrade:purchased', () => { RenderPanel.renderUpgrades(); sfx.upgrade(); });
  EventBus.on('artifact:crafted', ({ artifactId }) => {
    const art = (window.ARTIFACTS || []).find(a => a.id === artifactId);
    const name = art ? art.name : artifactId;
    DIRTY.panel = true;
    log(`🏺 ${name} artifact activated!`);
    showBanner(`🏺 ${name} is now active.`);
    if (typeof checkAchievements === 'function') checkAchievements();
  });
  EventBus.on('stage:advanced', ({ stage, name }) => {
    showBanner(`Stage ${stage}: ${name}`); sfx.stageAdvance(); RenderHUD.renderStage();
    RenderPanel.renderPrestige();
    RenderPanel.renderAscension();
    RenderHUD.renderReputation();
    RenderPanel.renderItems();
  });
  EventBus.on('prestige:reset', () => {
    DIRTY.grid    = true;
    DIRTY.hud     = true;
    DIRTY.panel   = true;
    DIRTY.sellbox = true;
    RenderFarm.buildGrid();
    RenderFarm.renderGrid();
    RenderSellbox.renderQueue();
    RenderSellbox.renderCrank();
    renderLoose();
    updateCoins();
    RenderHUD.renderStage();
    RenderPanel.renderInventory();
    RenderPanel.renderUpgrades();
    RenderPanel.renderItems();
    RenderPanel.renderSeeds();
    RenderPanel.renderBags();
    RenderPanel.renderPrestige();
    RenderPanel.renderAscension();
    RenderHUD.renderReputation();
    applyPanelState();
  });
}

function setupUI() {
  RenderEnv.init();

  const panelEl = document.getElementById('panel');

  document.getElementById('panel-resize-handle').addEventListener('mousedown', e => {
    resizing = true; resizeStartX = e.clientX; resizeStartW = panelWidth; resizeMoved = false;
    panelEl.classList.add('resizing'); e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const dx = resizeStartX - e.clientX;
    if (Math.abs(dx) > 4) resizeMoved = true;
    if (resizeMoved) {
      panelWidth = Math.max(200, Math.min(500, resizeStartW + dx));
      applyPanelState();
    }
  });
  document.addEventListener('mouseup', () => {
    if (!resizing) return;
    resizing = false; panelEl.classList.remove('resizing');
    save();
  });
  document.addEventListener('mousedown', () => { if (!drag && !resizing) deselect(); hideTileMenu(); });
  window.addEventListener('resize', () => { if (state.upgrades.windUpCrank) RenderSellbox.positionCrank(); });

  DebugPanel.setupUI();
  RenderSellbox.setupUI();
  Audio.setupMute();

  (function () {
    const btn              = document.getElementById('settings-btn');
    const backdrop         = document.getElementById('settings-backdrop');
    const panel            = document.getElementById('settings-panel');
    const resetBtn         = document.getElementById('reset-btn');
    const hideBoughtToggle = document.getElementById('hide-bought-toggle');
    const debugModeToggle  = document.getElementById('debug-mode-toggle');
    let confirmed = false;

    function openSettings() {
      confirmed = false;
      resetBtn.textContent = 'Reset Data';
      hideBoughtToggle.checked = !!state.hideBoughtUpgrades;
      debugModeToggle.checked  = !!STATE.settings.debugMode;
      backdrop.style.display = 'block';
      panel.style.display = 'block';
    }
    function closeSettings() {
      confirmed = false;
      resetBtn.textContent = 'Reset Data';
      backdrop.style.display = 'none';
      panel.style.display = 'none';
    }

    hideBoughtToggle.addEventListener('change', () => {
      state.hideBoughtUpgrades = hideBoughtToggle.checked;
      RenderPanel.renderUpgrades();
      save();
    });
    debugModeToggle.addEventListener('change', () => {
      STATE.settings.debugMode = debugModeToggle.checked;
      DebugPanel.applyDebugMode();
      save();
    });
    btn.addEventListener('click',      e => { e.stopPropagation(); openSettings(); });
    backdrop.addEventListener('click', closeSettings);
    panel.addEventListener('click',    e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirmed) { confirmed = true; resetBtn.textContent = 'Are you sure?'; }
      else { localStorage.clear(); location.reload(); }
    });
  }());

  (function () {
    const artifactsBtn = document.getElementById('artifacts-btn');
    artifactsBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (RenderArtifacts.isOpen()) RenderArtifacts.close();
      else RenderArtifacts.open();
    });
  }());

  (function () {
    const craftingBtn = document.getElementById('crafting-btn');
    const backdrop    = document.getElementById('crafting-backdrop');
    const modal       = document.getElementById('crafting-modal');
    const closeBtn    = document.getElementById('crafting-close-btn');

    function openCrafting() {
      backdrop.style.display = 'block';
      modal.style.display = 'flex';
      if (typeof RenderCrafting !== 'undefined') RenderCrafting.renderCraftingPanel();
    }
    function closeCrafting() {
      backdrop.style.display = 'none';
      modal.style.display = 'none';
    }

    craftingBtn.addEventListener('click', e => { e.stopPropagation(); openCrafting(); });
    backdrop.addEventListener('click', closeCrafting);
    modal.addEventListener('click', e => e.stopPropagation());
    closeBtn.addEventListener('click', closeCrafting);
  }());

  (function () {
    const prestigeBtn = document.getElementById('prestige-btn');
    const backdrop    = document.getElementById('prestige-backdrop');
    const modal       = document.getElementById('prestige-modal');
    const closeBtn    = document.getElementById('prestige-close-btn');

    function openPrestige() {
      backdrop.style.display = 'block';
      modal.style.display = 'flex';
      if (typeof RenderPanel !== 'undefined' && RenderPanel.renderPrestige) {
        RenderPanel.renderPrestige();
      }
    }
    function closePrestige() {
      backdrop.style.display = 'none';
      modal.style.display = 'none';
    }

    prestigeBtn.addEventListener('click', e => { e.stopPropagation(); openPrestige(); });
    backdrop.addEventListener('click', closePrestige);
    modal.addEventListener('click', e => e.stopPropagation());
    closeBtn.addEventListener('click', closePrestige);
  }());

  (function () {
    const achBtn   = document.getElementById('ach-btn');
    const backdrop = document.getElementById('ach-backdrop');
    const modal    = document.getElementById('ach-modal');
    const closeBtn = document.getElementById('ach-close-btn');

    function openAch() {
      backdrop.style.display = 'block';
      modal.style.display = 'flex';
      if (typeof RenderPanel !== 'undefined' && RenderPanel.renderAchievements) {
        RenderPanel.renderAchievements();
      }
    }
    function closeAch() {
      backdrop.style.display = 'none';
      modal.style.display = 'none';
    }

    achBtn.addEventListener('click',   e => { e.stopPropagation(); openAch(); });
    backdrop.addEventListener('click', closeAch);
    modal.addEventListener('click',    e => e.stopPropagation());
    closeBtn.addEventListener('click', closeAch);
  }());

  DebugPanel.applyDebugMode();
}

function renderInitial() {
  RenderFarm.renderGrid();
  RenderPanel.renderInventory();
  try { RenderPanel.renderSeeds(); } catch (e) { console.error('renderSeeds failed:', e); }
  RenderPanel.renderBags();
  RenderPanel.renderItems();
  RenderPanel.renderUpgrades();
  RenderSellbox.renderQueue();
  RenderSellbox.renderCrank();
  RenderSellbox.renderWell();
  renderLoose();
  updateCoins();
  RenderHUD.renderStage();
  RenderPanel.renderAchievements();
  RenderPanel.renderPrestige();
  RenderPanel.renderAscension();
  RenderHUD.renderReputation();
  if (typeof checkAchievements === 'function') checkAchievements();
  applyPanelState();

  for (let i = 0; i < tileCount(); i++) {
    const td = state.tiles[i];
    prevReadyState[i] = td ? isReady(td, i) : false;
  }
}

function init() {
  load();
  recalculateModifiers();
  RenderFarm.buildGrid();
  setupTimers();
  setupEvents();
  setupUI();
  renderInitial();
  RenderFarm.probeSprites();
}

init();
