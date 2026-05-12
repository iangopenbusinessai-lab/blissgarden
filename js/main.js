function init() {
  load();
  recalculateModifiers();

  RenderFarm.buildGrid();
  RenderEnv.init();

  const cond = (minStage, checkMature = true) => () =>
    (!checkMature || state.mature) && getCurrentStage().stage >= minStage;
  TimerManager.timers['crow'].fn           = crowTick;
  TimerManager.timers['crow'].condition    = cond(0);
  TimerManager.timers['weed'].fn           = weedTick;
  TimerManager.timers['weed'].condition    = cond(0);
  TimerManager.timers['hawk'].fn           = hawkTick;
  TimerManager.timers['hawk'].condition    = cond(2);
  TimerManager.timers['hawk'].interval     = () => getCurrentStage().stage >= 3 ? 10000 : 15000;
  TimerManager.timers['mole'].fn           = moleTick;
  TimerManager.timers['mole'].condition    = cond(2);
  TimerManager.timers['rootRot'].fn        = rootRotSpawnTick;
  TimerManager.timers['rootRot'].condition = cond(3);
  TimerManager.timers['locust'].fn         = locustTick;
  TimerManager.timers['locust'].condition  = cond(3);
  TimerManager.timers['blight'].fn         = blightTick;
  TimerManager.timers['blight'].condition  = cond(3);
  TimerManager.timers['fungal'].fn         = fungalSpawnTick;
  TimerManager.timers['fungal'].condition  = cond(3);
  TimerManager.timers['sell'].fn           = tickSellBox;
  TimerManager.timers['sell'].condition    = () => true;
  TimerManager.timers['sell'].interval     = () => getSellInterval();
  TimerManager.timers['save'].fn           = save;
  TimerManager.timers['save'].condition    = () => true;

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

  EventBus.on('crop:harvested', () => {});
  EventBus.on('crop:sold', () => {});
  EventBus.on('upgrade:purchased', () => { RenderPanel.renderUpgrades(); sfx.upgrade(); });
  EventBus.on('stage:advanced', ({ stage, name }) => { showBanner(`Stage ${stage}: ${name}`); sfx.stageAdvance(); RenderHUD.renderStage(); });

  RenderPanel.initPanelEvents();

  document.getElementById('crank-svg').addEventListener('click', () => {
    if (!state.upgrades.windUpCrank) return;
    crankMult  = crankMult * getCrankClickMult();
    crankAngle = (crankAngle + 30) % 3600;
    document.getElementById('crank-svg').style.transform = `rotate(${crankAngle}deg)`;
    RenderSellbox.updateCrankLabel();
  });

  document.getElementById('well').addEventListener('mousedown', e => e.stopPropagation());

  STATE.settings.muted = localStorage.getItem('bliss_muted') === '1';
  const muteBtn = document.getElementById('mute-btn');
  muteBtn.textContent = STATE.settings.muted ? '🔇' : '🔊';
  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    STATE.settings.muted = !STATE.settings.muted;
    localStorage.setItem('bliss_muted', STATE.settings.muted ? '1' : '0');
    muteBtn.textContent = STATE.settings.muted ? '🔇' : '🔊';
  });

  (function () {
    const btn              = document.getElementById('settings-btn');
    const backdrop         = document.getElementById('settings-backdrop');
    const panel            = document.getElementById('settings-panel');
    const resetBtn         = document.getElementById('reset-btn');
    const hideBoughtToggle = document.getElementById('hide-bought-toggle');
    let confirmed = false;
    function openSettings()  { confirmed = false; resetBtn.textContent = 'Reset Data'; hideBoughtToggle.checked = !!state.hideBoughtUpgrades; backdrop.style.display = 'block'; panel.style.display = 'block'; }
    function closeSettings() { confirmed = false; resetBtn.textContent = 'Reset Data'; backdrop.style.display = 'none'; panel.style.display = 'none'; }
    hideBoughtToggle.addEventListener('change', () => { state.hideBoughtUpgrades = hideBoughtToggle.checked; RenderPanel.renderUpgrades(); save(); });
    btn.addEventListener('click',      e => { e.stopPropagation(); openSettings(); });
    backdrop.addEventListener('click', closeSettings);
    panel.addEventListener('click',    e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirmed) { confirmed = true; resetBtn.textContent = 'Are you sure?'; }
      else { localStorage.clear(); location.reload(); }
    });
  }());

  TimerManager.register('display', { interval: 50, condition: () => true, fn: () => {
    updateTimers();
    RenderSellbox.updateSellTimer();
    RenderSellbox.updateCrankLabel();
    canTick();
    RenderEnv.updateSky();
  }});

  RenderFarm.renderGrid();
  RenderPanel.renderInventory();
  RenderPanel.renderSeeds();
  RenderPanel.renderBags();
  RenderPanel.renderItems();
  RenderPanel.renderUpgrades();
  RenderSellbox.renderQueue();
  RenderSellbox.renderCrank();
  RenderSellbox.renderWell();
  renderLoose();
  updateCoins();
  RenderHUD.renderStage();
  RenderPanel.applyPanelState();

  for (let i = 0; i < tileCount(); i++) {
    const td = state.tiles[i];
    prevReadyState[i] = td ? isReady(td, i) : false;
  }

  const img = new Image();
  img.onerror = () => console.error('sprites.png not found at ./sprites.png');
  img.src = './sprites.png';
}

init();
