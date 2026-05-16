// ══════════════════════════════
// EVENT BUS
// ══════════════════════════════
window.EventBus = {
  listeners: {},
  on(e, fn)  { (this.listeners[e] ??= []).push(fn); },
  off(e, fn) { if (this.listeners[e]) this.listeners[e] = this.listeners[e].filter(f => f !== fn); },
  emit(e, data) { (this.listeners[e] ?? []).slice().forEach(fn => fn(data)); },
};

// ══════════════════════════════
// TIMER MANAGER
// ══════════════════════════════
// interval may be a number or a () => number function (for dynamic timers).
// restart(id) resets elapsed so the timer picks up the current interval fresh.
window.TimerManager = {
  timers: {},

  register(id, { interval, fn, condition }) {
    this.timers[id] = { interval, fn, condition, elapsed: 0 };
  },

  unregister(id) {
    delete this.timers[id];
  },

  restart(id) {
    if (this.timers[id]) this.timers[id].elapsed = 0;
  },

  getRemaining(id) {
    const t = this.timers[id];
    if (!t) return 0;
    const interval = typeof t.interval === 'function' ? t.interval() : t.interval;
    return Math.max(0, interval - t.elapsed);
  },

  tick() {
    for (const t of Object.values(this.timers)) {
      t.elapsed += 50;
      const interval = typeof t.interval === 'function' ? t.interval() : t.interval;
      if (t.elapsed >= interval && t.condition()) {
        t.fn();
        t.elapsed = 0;
      }
    }
  },
};

setInterval(() => TimerManager.tick(), 50);

// ══════════════════════════════
// TIMER REGISTRATIONS
// ══════════════════════════════
const _stage = n => () => STATE.meta.stage >= n;

TimerManager.register('crow',    { interval: 10000,  condition: _stage(1), fn: () => {} });
TimerManager.register('weed',    { interval: 8000,   condition: _stage(1), fn: () => {} });
TimerManager.register('hawk',    { interval: 15000,  condition: _stage(2), fn: () => {} });
TimerManager.register('mole',    { interval: 45000,  condition: _stage(2), fn: () => {} });
TimerManager.register('rootRot', { interval: 180000, condition: _stage(3), fn: () => {} });
TimerManager.register('locust',  { interval: 30000,  condition: _stage(3), fn: () => {} });
TimerManager.register('blight',  { interval: 300000, condition: _stage(3), fn: () => {} });
TimerManager.register('fungal',  { interval: 240000, condition: _stage(3), fn: () => {} });
TimerManager.register('sell',    { interval: () => STATE.modifiers.sellInterval, condition: () => true, fn: () => {} });
TimerManager.register('save',    { interval: 10000,  condition: () => true, fn: () => {} });

// ══════════════════════════════
// OFFLINE PROGRESS
// ══════════════════════════════
function applyOfflineProgress(elapsedMs) {
  const MAX_OFFLINE_MS = 8 * 3600 * 1000;
  const capped   = Math.min(elapsedMs, MAX_OFFLINE_MS);
  const upgrades = STATE.upgrades || {};
  const now      = Date.now();
  const lastSeen = STATE.meta.lastSeen;

  // ── Upgrade-derived multipliers (crank = 1.0 offline) ────────────────────
  let _gMult = 1, _sMult = 1, _siMult = 1;
  (window.UPGRADES || []).forEach(u => {
    if (!upgrades[u.id]) return;
    if (u.type === 'speed')     _gMult  *= u.mult;
    if (u.type === 'value')     _sMult  *= u.mult;
    if (u.type === 'sellSpeed') _siMult *= u.mult;
  });
  const growMult     = _gMult;
  const sellValMult  = _sMult;
  const sellInterval = 10000 * _siMult;

  function sellAtOnce() {
    if (upgrades.diamondSellBox)  return 8;
    if (upgrades.titaniumSellBox) return 5;
    if (upgrades.steelSellBox)    return 3;
    if (upgrades.ironSellBox)     return 2;
    return 1;
  }

  // ── 1. Crop growth: count completions; crops stay on tile (not auto-harvested) ──
  let cropsFinished = 0;
  (STATE.plots || []).forEach(td => {
    if (!td || !td.seed) return;
    const seedData = window.SEEDS?.[td.seed];
    if (!seedData) return;
    const growMs   = seedData.grow * growMult * 1000;
    const wasReady = (lastSeen - td.plantedAt) >= growMs;
    const isReady  = (now     - td.plantedAt) >= growMs;
    if (!wasReady && isReady) cropsFinished++;
  });

  // ── 2. Sell box: skip entirely if queue was empty at last save ────────────
  let coinsEarned = 0;
  const queue = (STATE.sellQueue && STATE.sellQueue.length > 0) ? [...STATE.sellQueue] : [];

  if (queue.length > 0 && sellInterval > 0) {
    let ticks = Math.floor(capped / sellInterval);
    while (ticks > 0 && queue.length > 0) {
      const batch = Math.min(sellAtOnce(), queue.length);
      for (let i = 0; i < batch; i++) {
        const item     = queue.shift();
        const seedData = window.SEEDS?.[item.seed];
        if (!seedData || item.fungal) continue;
        coinsEarned += item.drowned
          ? Math.round(seedData.sell * (item.bonus || 1))
          : Math.round(seedData.sell * sellValMult * (item.bonus || 1));
      }
      ticks--;
    }
    STATE.sellQueue = queue;
  }

  // ── 3. Apply gold; check stages and milestones ────────────────────────────
  const prevAllTimeGold = STATE.meta.allTimeGold || 0;
  if (coinsEarned > 0) {
    STATE.meta.gold        = (STATE.meta.gold        || 0) + coinsEarned;
    STATE.meta.allTimeGold = prevAllTimeGold + coinsEarned;
  }

  // Stages crossed during offline session
  const stagesHit      = [];
  const _stages        = (typeof STAGES        !== 'undefined' ? STAGES        : []);
  const _milestoneVals = (typeof MILESTONE_VALS !== 'undefined' ? MILESTONE_VALS : [100,1000,10000,100000,1000000]);
  let highestNewStage  = STATE.meta.stage;
  _stages.forEach(s => {
    if (s.stage === 0) return;
    if (STATE.meta.allTimeGold >= s.threshold && prevAllTimeGold < s.threshold) {
      stagesHit.push(s);
      if (s.stage > highestNewStage) highestNewStage = s.stage;
    }
  });
  if (highestNewStage > STATE.meta.stage) STATE.meta.stage = highestNewStage;

  // Milestones crossed during offline session
  const milestonesHit = [];
  if (!STATE.milestones) STATE.milestones = {};
  _milestoneVals.forEach(m => {
    if (STATE.meta.allTimeGold >= m && prevAllTimeGold < m && !STATE.milestones[m]) {
      STATE.milestones[m] = true;
      milestonesHit.push(m);
    }
  });

  // Sync to flat state if already loaded
  if (window.state) {
    if (coinsEarned > 0) {
      window.state.coins       = (window.state.coins       || 0) + coinsEarned;
      window.state.coinsEarned = (window.state.coinsEarned || 0) + coinsEarned;
      window.state.sellQueue   = STATE.sellQueue;
      window.state.sellNextAt  = queue.length ? now + sellInterval : 0;
    }
    stagesHit.forEach(s => {
      if (!window.state.stagesSeen) window.state.stagesSeen = {};
      window.state.stagesSeen[s.stage] = true;
    });
    milestonesHit.forEach(m => {
      if (!window.state.milestones) window.state.milestones = {};
      window.state.milestones[m] = true;
    });
  }

  // ── Crank: fully decays offline ───────────────────────────────────────────
  STATE.modifiers.crankMultiplier = 1.0;
  if (typeof window.crankMult !== 'undefined') window.crankMult = 1.0;

  // ── 4. Events: spawn one weed if away > 1 hour ───────────────────────────
  if (capped > 3600000 && window.state) {
    const tiles    = window.state.tiles        || [];
    const weeds    = window.state.weeds        || {};
    const thorned  = window.state.thornedWeeds || {};
    const mounds   = window.state.mounds       || {};
    const fungal   = window.state.fungalTiles  || {};
    const empty    = [];
    for (let i = 0; i < tiles.length; i++) {
      if (!tiles[i] &&
          weeds[i]   === undefined &&
          thorned[i] === undefined &&
          mounds[i]  === undefined &&
          fungal[i]  === undefined) empty.push(i);
    }
    if (empty.length) {
      const idx = empty[Math.floor(Math.random() * empty.length)];
      if (!window.state.weeds) window.state.weeds = {};
      window.state.weeds[idx] = { clicks: 0, spawnedAt: now };
    }
  }

  // ── 7. Status log + modal (deferred until after init() completes) ─────────
  const h  = Math.floor(elapsedMs / 3600000);
  const mn = Math.floor((elapsedMs % 3600000) / 60000);
  const logTime = h > 0 ? `${h}h ${mn}m` : `${mn}m`;

  setTimeout(() => {
    if (typeof window.log === 'function') {
      const goldPart = coinsEarned > 0 ? ` Earned 🪙${coinsEarned.toLocaleString()} while away.` : '';
      window.log(`💤 Returned after ${logTime}.${goldPart}`);
      milestonesHit.forEach(m => window.log(`⏱️ Reached 🪙${m.toLocaleString()} while you were away.`));
      stagesHit.forEach(s => { if (s.log) window.log(s.log); });
    }
    _showOfflineModal(elapsedMs, coinsEarned, cropsFinished, milestonesHit, stagesHit);
  }, 0);
}

// ══════════════════════════════
// TIMER WIRING
// ══════════════════════════════
function setupTimers() {
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
  TimerManager.timers['rootRot'].fn        = rootRotSpawnTick;
  TimerManager.timers['rootRot'].condition = cond(3);
  TimerManager.timers['locust'].fn      = locustTick;
  TimerManager.timers['locust'].condition = cond(3);
  TimerManager.timers['blight'].fn      = blightTick;
  TimerManager.timers['blight'].condition = cond(3);
  TimerManager.timers['fungal'].fn        = fungalSpawnTick;
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

  TimerManager.register('display', { interval: 50, condition: () => true, fn: () => {
    updateTimers();
    RenderSellbox.updateSellTimer();
    RenderSellbox.updateCrankLabel();
    canTick();
    RenderEnv.updateSky();
  }});
}

function _showOfflineModal(elapsedMs, coinsEarned, cropsFinished, milestonesHit, stagesHit) {
  const h = Math.floor(elapsedMs / 3600000);
  const m = Math.floor((elapsedMs % 3600000) / 60000);
  const timeStr = h > 0
    ? `${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}`
    : `${m} minute${m !== 1 ? 's' : ''}`;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:9999';

  const panel = document.createElement('div');
  panel.style.cssText = 'background:#6b4a2a;border:2px solid #a07040;border-radius:10px;padding:28px 36px;max-width:360px;width:90%;text-align:center;color:#fff;box-shadow:0 8px 32px rgba(0,0,0,.5);font-size:15px';

  function row(text, color) {
    const p = document.createElement('p');
    p.textContent = text;
    p.style.cssText = `margin:7px 0;${color ? 'color:' + color : 'opacity:.85'}`;
    return p;
  }

  const title = document.createElement('div');
  title.textContent = 'Welcome Back!';
  title.style.cssText = 'font-size:1.4rem;font-weight:700;color:#f0d080;margin-bottom:14px';
  panel.appendChild(title);
  panel.appendChild(row(`You were gone ${timeStr}`));
  if (coinsEarned > 0)   panel.appendChild(row(`+🪙${coinsEarned.toLocaleString()} from sell box`, '#ffd700'));
  if (cropsFinished > 0) panel.appendChild(row(`${cropsFinished} crop${cropsFinished !== 1 ? 's' : ''} finished growing`, '#90ee90'));
  (stagesHit || []).forEach(s => panel.appendChild(row(`🌱 Stage ${s.stage}: ${s.name} reached`, '#90ee90')));

  // Milestone list — scrollable when more than 3
  if (milestonesHit && milestonesHit.length > 0) {
    const wrap = document.createElement('div');
    wrap.style.cssText = milestonesHit.length > 3
      ? 'max-height:88px;overflow-y:auto;margin:6px 0;border:1px solid rgba(255,255,255,.15);border-radius:4px;padding:2px 0'
      : 'margin:4px 0';
    milestonesHit.forEach(m => {
      const p = document.createElement('p');
      p.textContent = `⏱️ Reached 🪙${m.toLocaleString()} while you were away`;
      p.style.cssText = 'margin:3px 0;color:#ffd700;font-size:13px';
      wrap.appendChild(p);
    });
    panel.appendChild(wrap);
  }

  const btn = document.createElement('button');
  btn.textContent = 'Continue';
  btn.style.cssText = 'margin-top:18px;padding:8px 28px;background:#5a8a3c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:1rem;font-weight:600';
  panel.appendChild(btn);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const dismiss = () => { if (overlay.parentNode) overlay.remove(); };
  btn.addEventListener('click', dismiss);
  setTimeout(dismiss, 8000);
}
