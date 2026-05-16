function setupEvents() {
  EventBus.on('crop:harvested', () => {});
  EventBus.on('crop:sold',      () => {});
  EventBus.on('upgrade:purchased', () => { RenderPanel.renderUpgrades(); sfx.upgrade(); });
  EventBus.on('stage:advanced', ({ stage, name }) => {
    showBanner(`Stage ${stage}: ${name}`); sfx.stageAdvance(); RenderHUD.renderStage();
  });
}

function setupUI() {
  RenderEnv.init();
  RenderHUD.setupUI();
  RenderSellbox.setupUI();
  Audio.setupMute();
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
