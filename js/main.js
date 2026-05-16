function init() {
  load();
  recalculateModifiers();

  RenderFarm.buildGrid();
  RenderEnv.init();

  // ── TimerManager: wire fn / condition / interval into pre-registered slots ──
  const cond = (minStage, checkMature = true) => () =>
    (!checkMature || state.mature) && getCurrentStage().stage >= minStage;
  TimerManager.timers['crow'].fn        = crowTick;
  TimerManager.timers['crow'].condition = cond(0);
  TimerManager.timers['weed'].fn        = weedTick;
  TimerManager.timers['weed'].condition = cond(0);
  TimerManager.timers['hawk'].fn        = hawkTick;
  TimerManager.timers['hawk'].condition = cond(2);
  TimerManager.timers['hawk'].interval  = () => getCurrentStage().stage >= 3 ? 10000 : 15000;
  TimerManager.timers['mole'].fn        = moleTick;
  TimerManager.timers['mole'].condition = cond(2);
  TimerManager.timers['rootRot'].fn     = rootRotSpawnTick;
  TimerManager.timers['rootRot'].condition = cond(3);
  TimerManager.timers['locust'].fn      = locustTick;
  TimerManager.timers['locust'].condition = cond(3);
  TimerManager.timers['blight'].fn      = blightTick;
  TimerManager.timers['blight'].condition = cond(3);
  TimerManager.timers['fungal'].fn      = fungalSpawnTick;
  TimerManager.timers['fungal'].condition = cond(3);
  TimerManager.timers['sell'].fn        = tickSellBox;
  TimerManager.timers['sell'].condition = () => true;
  TimerManager.timers['sell'].interval  = () => getSellInterval();
  TimerManager.timers['save'].fn        = save;
  TimerManager.timers['save'].condition = () => true;

  TimerManager.register('mound',        { interval: 1000,  condition: () => true, fn: moundTick });
  TimerManager.register('rot',          { interval: 1000,  condition: () => true, fn: rotTick });
  TimerManager.register('thornedWeed',  { interval: 1000,  condition: () => true, fn: thornedWeedTick });
  TimerManager.register('fungalSpread', { interval: 30000, condition: () => true, fn: fungalSpreadTick });
  TimerManager.register('masterFarmer', { interval: 1000,  condition: () => true, fn: masterFarmerTick });
  TimerManager.register('crankDecay',   { interval: 1000,  condition: () => state.upgrades.windUpCrank, fn: () => {
    if (crankMult > 1.0) {
      const excess = crankMult - 1;
      crankMult = Math.max(1.0, 1 + excess / (1 + excess * 0.08));
      RenderSellbox.updateCrankLabel();
    }
  }});

  // ── EventBus wiring ───────────────────────────────────────────────────────
  EventBus.on('crop:harvested', () => {});
  EventBus.on('crop:sold',      () => {});
  EventBus.on('upgrade:purchased', () => { RenderPanel.renderUpgrades(); sfx.upgrade(); });
  EventBus.on('stage:advanced', ({ stage, name }) => {
    showBanner(`Stage ${stage}: ${name}`); sfx.stageAdvance(); RenderHUD.renderStage();
  });

  // ── UI setup ──────────────────────────────────────────────────────────────
  RenderHUD.setupUI();
  RenderSellbox.setupUI();
  Audio.setupMute();

  // ── 50ms dirty-flag tick ─────────────────────────────────────────────────
  TimerManager.register('display', { interval: 50, condition: () => true, fn: () => {
    updateTimers();
    RenderSellbox.updateSellTimer();
    RenderSellbox.updateCrankLabel();
    canTick();
    RenderEnv.updateSky();
  }});

  // ── Initial renders ───────────────────────────────────────────────────────
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

  const img = new Image();
  img.onerror = () => console.error('sprites.png not found at ./sprites.png');
  img.src = './sprites.png';
}

init();
