// ── AUDIO SFX SHIM ──
var sfx = {
  plant()        { Audio.playPlant(); },
  harvest()      { Audio.playHarvest(); },
  drop()         { Audio.playDrop(); },
  sell(v)        { Audio.playSell(v); },
  sellAuto()     { Audio.playAutoSell(); },
  attack()       { Audio.playCrow(); },
  weedClick()    { Audio.playWeedClick(); },
  upgrade()      { Audio.playUpgrade(); },
  stageAdvance() { Audio.playStage(); },
  locust()       { Audio.playLocust(); },
};

// ── COINS & STAGES ──
function getCurrentStage() {
  let current = STAGES[0];
  for (const s of STAGES) { if ((state.coinsEarned || 0) >= s.threshold) current = s; }
  return current;
}
function checkMilestones() {
  MILESTONE_VALS.forEach(m => {
    if (state.coinsEarned >= m && !state.milestones[m]) {
      state.milestones[m] = true;
      log(`⏱️ Reached ${coinHTML()}${m.toLocaleString()} — ${fmtElapsed(Date.now() - state.gameStartTime)}`);
    }
  });
}
function checkStages() {
  for (const s of STAGES) {
    if (s.stage === 0) continue;
    if ((state.coinsEarned || 0) >= s.threshold && !state.stagesSeen[s.stage]) {
      state.stagesSeen[s.stage] = true;
      STATE.meta.stage = s.stage;
      if (s.log) log(s.log);
      EventBus.emit('stage:advanced', { stage: s.stage, name: s.name });
      save();
    }
  }
}
function checkMaturity() {
  if (!state.mature && state.coinsEarned >= 1000) {
    state.mature = true;
    log('🌿 The farm has matured. Nature has taken notice...');
    showBanner('🌿 The farm has matured. Nature is watching.');
  }
}
function addCoins(amount) {
  state.coins += amount;
  state.coinsEarned = (state.coinsEarned || 0) + amount;
  STATE.meta.allTimeGold = (STATE.meta.allTimeGold || 0) + amount;
  checkMilestones();
  checkMaturity();
  checkStages();
  updateCoins();
  if (typeof checkAchievements === 'function') checkAchievements();
}
function updateCoins() {
  RenderHUD.renderCoin();
  RenderPanel.renderUpgrades();
  RenderPanel.renderItems();
  RenderPanel.renderSeeds();
  RenderPanel.renderBags();
}

// ── WATER / DROWN ──
function applyWater(idx) {
  const td = state.tiles[idx];
  if (!td || isReady(td, idx)) return;
  if (state.tilesWatered && state.tilesWatered[idx]) { drownTile(idx); return; }
  const baseGT = SEEDS[td.seed].grow * STATE.modifiers.growSpeed * fertFactor(idx);
  const newGT  = baseGT * 0.75;
  const elapsed = (Date.now() - td.plantedAt) / 1000;
  const oldRem = Math.max(0, baseGT - elapsed);
  td.plantedAt = Date.now() - (newGT - oldRem * 0.75) * 1000;
  td.sellBonus = 1.25;
  if (!state.tilesWatered) state.tilesWatered = {};
  state.tilesWatered[idx] = true;
  RenderFarm.renderTile(idx); RenderPanel.renderInventory(); RenderPanel.renderItems();
  log(`💧 ${SEEDS[td.seed].name} watered (+25% value, +25% speed)`);
  save();
}
function drownTile(idx) {
  const td = state.tiles[idx];
  if (!td) return;
  const ff = fertFactor(idx);
  const currentGT  = SEEDS[td.seed].grow * STATE.modifiers.growSpeed * ff * 0.75;
  const drownedGT  = SEEDS[td.seed].grow * STATE.modifiers.growSpeed * ff;
  const elapsed    = (Date.now() - td.plantedAt) / 1000;
  const currentRem = Math.max(0, currentGT - elapsed);
  const newRem     = currentRem * (drownedGT / currentGT);
  td.plantedAt = Date.now() - (drownedGT - newRem) * 1000;
  td.drowned = true; td.sellBonus = 0.25;
  delete state.tilesWatered[idx];
  RenderFarm.renderTile(idx); RenderPanel.renderInventory(); RenderPanel.renderItems();
  log(`💀 ${SEEDS[td.seed].name} was drowned! Value severely reduced.`);
  save();
}

// ── INVENTORY ──
function addInventory(seed) { state.inventory[seed] = (state.inventory[seed] || 0) + 1; }

// ── BAG OPENING ──
function openBag(bag) {
  if (!state.bagInventory) state.bagInventory = {};
  if ((state.bagInventory[bag.id] || 0) < 1) return;
  state.bagInventory[bag.id]--;
  if (!state.seedInventory) state.seedInventory = {};
  const received = [];
  for (let i = 0; i < 3; i++) {
    const roll = Math.random();
    let cum = 0, chosen = bag.seeds[bag.seeds.length - 1];
    for (let j = 0; j < bag.seeds.length; j++) {
      cum += bag.odds[j];
      if (roll < cum) { chosen = bag.seeds[j]; break; }
    }
    state.seedInventory[chosen] = (state.seedInventory[chosen] || 0) + 1;
    received.push((SEEDS[chosen].seedIcon || SEEDS[chosen].icon || '🌱') + ' ' + SEEDS[chosen].name);
  }
  log(`🎒 ${bag.name} opened: ${received.join(', ')}`);
  RenderPanel.renderInventory(); save();
}

// ── SELECTION & TILE MENUS ──
function deselect() {
  if (selectedTile !== null) { const p = selectedTile; selectedTile = null; RenderFarm.renderTile(p); }
}
function hideTileMenu() { document.getElementById('tile-menu').style.display = 'none'; }

function showTileMenu(idx, x, y) {
  const isCaged = state.cages && state.cages.includes(idx);
  const isFert  = !!(state.fertilizedTiles && state.fertilizedTiles[idx]);
  if (!isCaged && !isFert) return;
  const menu = document.getElementById('tile-menu');
  menu.innerHTML = '';
  if (isCaged) {
    const btn = mk('button'); btn.className = 'tmenu-btn'; btn.textContent = '🔓 Remove Cage';
    btn.addEventListener('mousedown', e => {
      e.stopPropagation();
      const ci = state.cages.indexOf(idx);
      if (ci !== -1) { state.cages.splice(ci, 1); state.cageCount = (state.cageCount||0) + 1; }
      RenderFarm.renderTile(idx); RenderPanel.renderItems(); log('🔒 Cage removed, returned to inventory'); save(); hideTileMenu();
    });
    menu.appendChild(btn);
  }
  if (isFert) {
    const btn = mk('button'); btn.className = 'tmenu-btn'; btn.textContent = '🌿 Remove Fertilizer';
    btn.addEventListener('mousedown', e => {
      e.stopPropagation();
      delete state.fertilizedTiles[idx];
      RenderFarm.renderTile(idx); save(); hideTileMenu();
    });
    menu.appendChild(btn);
  }
  menu.style.left = Math.min(x, window.innerWidth  - 170) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 90)  + 'px';
  menu.style.display = 'block';
}

function onTileDown(e) {
  const idx = parseInt(e.currentTarget.dataset.idx);

  if (state.rotTiles && state.rotTiles[idx] && state.rotTiles[idx].deadAt !== undefined) {
    e.stopPropagation(); return;
  }
  if (state.mounds && state.mounds[idx] !== undefined) {
    e.stopPropagation();
    state.mounds[idx] = Math.min(state.mounds[idx], Date.now() + 5000);
    RenderFarm.renderTile(idx); save(); return;
  }
  if (state.thornedWeeds && state.thornedWeeds[idx] !== undefined) {
    e.stopPropagation();
    sfx.weedClick();
    state.thornedWeeds[idx].clicks++;
    if (state.thornedWeeds[idx].clicks >= THORNED_WEED_CLICKS) {
      delete state.thornedWeeds[idx];
      state.stats.weedsCleared = (state.stats.weedsCleared || 0) + 1;
      if (typeof checkAchievements === 'function') checkAchievements();
      log('✅ Thorned weed cleared!');
      RenderFarm.renderTile(idx);
    } else {
      e.currentTarget.classList.add('tile-weed-hit');
      setTimeout(() => RenderFarm.renderTile(idx), 80);
    }
    save(); return;
  }
  if (state.weeds && state.weeds[idx] !== undefined) {
    e.stopPropagation();
    sfx.weedClick();
    state.weeds[idx].clicks++;
    if (state.weeds[idx].clicks >= WEED_CLICKS) {
      delete state.weeds[idx];
      state.stats.weedsCleared = (state.stats.weedsCleared || 0) + 1;
      if (typeof checkAchievements === 'function') checkAchievements();
      log('✅ Weed cleared!');
      RenderFarm.renderTile(idx);
    } else {
      e.currentTarget.classList.add('tile-weed-hit');
      setTimeout(() => RenderFarm.renderTile(idx), 80);
    }
    save(); return;
  }

  const td = state.tiles[idx];
  const _isFungal = !!(state.fungalTiles && state.fungalTiles[idx] !== undefined);

  if (!td) {
    deselect();
    const _caged = state.cages && state.cages.includes(idx);
    const _fert  = !!(state.fertilizedTiles && state.fertilizedTiles[idx]);
    if (_caged || _fert) showTileMenu(idx, e.clientX + 4, e.clientY + 4);
    else if (_isFungal)  showFungalCureMenu(idx, 50, e.clientX + 4, e.clientY + 4);
    return;
  }

  if (isReady(td, idx)) {
    e.stopPropagation();
    const seed     = td.seed;
    const tileRect = e.currentTarget.getBoundingClientRect();
    sfx.harvest();
    Particles.leafBurst(tileRect.left + tileRect.width / 2, tileRect.top + tileRect.height / 2);
    spawnHarvestPop(tileRect.left + tileRect.width / 2, tileRect.top + tileRect.height / 2, seed);
    const rotInf  = !!(state.rotTiles && state.rotTiles[idx] && state.rotTiles[idx].infectedAt !== undefined && state.rotTiles[idx].deadAt === undefined);
    const bonus   = rotInf ? 0.5 : (td.sellBonus || 1.0);
    const drowned = rotInf || (td.drowned || false);
    if (state.rotTiles) delete state.rotTiles[idx];
    state.tiles[idx] = null;
    if (state.tilesWatered) delete state.tilesWatered[idx];
    state.stats.totalHarvested = (state.stats.totalHarvested || 0) + 1;
    if (!state.stats.seedTypesPlanted) state.stats.seedTypesPlanted = {};
    state.stats.seedTypesPlanted[seed] = true;
    RenderFarm.renderTile(idx); save();
    log(`${SEEDS[seed].icon} ${SEEDS[seed].name} harvested${_isFungal ? ' (fungal — 0 coins)' : ''}`);
    if (rotInf) log('🍂 Infected — sells for 50% base value');
    EventBus.emit('crop:harvested', { seed, idx });
    if (typeof checkAchievements === 'function') checkAchievements();
    startDrag(seed, 'tile', bonus, drowned, _isFungal); moveGhost(e.clientX, e.clientY);
    return;
  }

  e.stopPropagation();
  if (selectedTile === idx) deselect();
  else { deselect(); selectedTile = idx; RenderFarm.renderTile(idx); }

  if (state.rotTiles && state.rotTiles[idx] && state.rotTiles[idx].infectedAt !== undefined && state.rotTiles[idx].deadAt === undefined) {
    const baseCost = Math.ceil(SEEDS[td.seed].sell * 0.10);
    const cureCost = state.upgrades.fastCure ? Math.ceil(baseCost * 0.40) : baseCost;
    if (state.upgrades.fastCure) {
      if (state.coins >= cureCost) {
        state.coins -= cureCost;
        const oldRF = rotFactor(idx);
        delete state.rotTiles[idx];
        const newRF = rotFactor(idx);
        if (oldRF !== newRF) {
          const base = SEEDS[td.seed].grow, gm = STATE.modifiers.growSpeed, wf = waterFactor(idx), ff = fertFactor(idx);
          const oldGT = base * gm * wf * ff * oldRF, newGT = base * gm * wf * ff * newRF;
          if (oldGT > 0) {
            const elapsed = (Date.now() - td.plantedAt) / 1000;
            const oldRem  = Math.max(0, oldGT - elapsed);
            td.plantedAt  = Date.now() - (newGT - oldRem * (newGT / oldGT)) * 1000;
          }
        }
        state.stats.rotCured = (state.stats.rotCured || 0) + 1;
        if (typeof checkAchievements === 'function') checkAchievements();
        log('💊 Root rot cured.');
        updateCoins(); RenderFarm.renderTile(idx); save();
      } else {
        log(`💊 Need ${coinHTML()}${cureCost} to cure root rot.`);
      }
    } else {
      showRotCureMenu(idx, cureCost, e.clientX + 4, e.clientY + 4);
    }
  } else if (_isFungal) {
    const clearCost = Math.ceil(SEEDS[td.seed].sell * 0.10);
    showFungalCureMenu(idx, clearCost, e.clientX + 4, e.clientY + 4);
  }
}

// ── Events namespace ───────────────────────────────────────────────────────
window.Events = {
  crowTick, hawkTick,
  weedTick, thornedWeedTick,
  moleTick, moundTick,
  rootRotSpawnTick, rotTick,
  locustTick, blightTick,
  fungalSpawnTick, fungalSpreadTick,
  masterFarmerTick,
  addToSellQueue, tickSellBox, canTick,
};
