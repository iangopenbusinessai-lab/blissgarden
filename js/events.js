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

// ── LOG & BANNER ──
var logEntries = [];
function log(msg) {
  logEntries.push(msg);
  if (logEntries.length > 60) logEntries.shift();
  RenderHUD.renderLog(msg);
}
function showBanner(text) {
  const existing = document.querySelector('.world-banner');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'world-banner';
  el.textContent = text;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 4200);
}

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

// ── INVENTORY / SELL ──
function addInventory(seed) { state.inventory[seed] = (state.inventory[seed] || 0) + 1; }

function addToSellQueue(seed, bonus = 1.0, drowned = false, fungal = false) {
  const wasEmpty = state.sellQueue.length === 0;
  state.sellQueue.push({ seed, bonus, drowned, fungal });
  if (wasEmpty) STATE.session.sellElapsed = 0;
  const sb = document.getElementById('sell-box');
  if (sb) { sb.classList.remove('sell-bounce'); void sb.offsetWidth; sb.classList.add('sell-bounce'); }
  RenderSellbox.renderQueue(); save();
}
function tickSellBox() {
  if (!state.sellQueue.length) return;
  const maxSell = STATE.modifiers.sellBoxCapacity;
  let totalCoins = 0, sold = 0;
  for (let s = 0; s < maxSell && state.sellQueue.length > 0; s++) {
    const item = state.sellQueue.shift();
    let coins;
    if (item.fungal)       coins = 0;
    else if (item.drowned) coins = Math.round(SEEDS[item.seed].sell * (item.bonus || 1));
    else                   coins = Math.round(SEEDS[item.seed].sell * STATE.modifiers.sellValue * (item.bonus || 1));
    log(`${SEEDS[item.seed].icon} ${SEEDS[item.seed].name} sold for ${coinHTML()}${coins}${item.fungal ? ' (fungal)' : ''}`);
    totalCoins += coins; sold++;
  }
  if (sold > 0) {
    if (sold === 1) sfx.sell(); else sfx.sellAuto();
    const sb = document.getElementById('sell-box');
    const r  = sb.getBoundingClientRect();
    Particles.coinBurst(r.left + r.width / 2, r.top + r.height / 2);
    showPop(`+${coinHTML()}${totalCoins}`, r.left + r.width / 2, r.top - 6);
    addCoins(totalCoins);
    EventBus.emit('crop:sold', { coins: totalCoins });
  }
  RenderSellbox.renderQueue(); save();
}
function canTick() {
  if (!state.items || !state.items.wateringCan || !state.canRefillAt) return;
  if (Date.now() >= state.canRefillAt) {
    state.canCharges  = Math.min(canCapacity(), (state.canCharges || 0) + 1);
    state.canRefillAt = 0;
    RenderPanel.renderInventory(); RenderPanel.renderItems(); save();
  } else {
    const el = document.getElementById('can-fill-timer');
    if (el) el.textContent = fmt(Math.max(0, (state.canRefillAt - Date.now()) / 1000));
  }
}

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
    received.push(SEEDS[chosen].seedIcon + ' ' + SEEDS[chosen].name);
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
function showRotCureMenu(idx, cost, x, y) {
  const menu = document.getElementById('tile-menu');
  menu.innerHTML = '';
  const header = mk('div');
  header.style.cssText = 'color:rgba(255,180,60,.8);font-size:10px;font-weight:700;padding:4px 8px 2px';
  header.textContent = '🍂 Root Rot — cure or harvest fast';
  menu.appendChild(header);
  const btn = mk('button'); btn.className = 'tmenu-btn';
  btn.innerHTML = `💊 Cure — ${coinHTML()}${cost}`;
  if (state.coins < cost) { btn.disabled = true; btn.style.opacity = '0.4'; }
  btn.addEventListener('mousedown', e => {
    e.stopPropagation();
    const td = state.tiles[idx];
    if (!td || state.coins < cost) return;
    state.coins -= cost;
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
    log('💊 Root rot cured.');
    updateCoins(); RenderFarm.renderTile(idx); save(); hideTileMenu();
  });
  menu.appendChild(btn);
  menu.style.left = Math.min(x, window.innerWidth  - 200) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 80)  + 'px';
  menu.style.display = 'block';
}
function showFungalCureMenu(idx, cost, x, y) {
  const menu = document.getElementById('tile-menu');
  menu.innerHTML = '';
  const header = mk('div');
  header.style.cssText = 'color:rgba(190,100,255,.9);font-size:10px;font-weight:700;padding:4px 8px 2px';
  header.textContent = '🍄 Fungal Bloom';
  menu.appendChild(header);
  const btn = mk('button'); btn.className = 'tmenu-btn';
  btn.innerHTML = `🧹 Clear — ${coinHTML()}${cost}`;
  if (state.coins < cost) { btn.disabled = true; btn.style.opacity = '0.4'; }
  btn.addEventListener('mousedown', e => {
    e.stopPropagation();
    if (state.coins < cost) return;
    state.coins -= cost;
    if (state.fungalTiles) delete state.fungalTiles[idx];
    if (state.tiles[idx]) {
      state.tiles[idx] = null;
      if (state.tilesWatered) delete state.tilesWatered[idx];
      if (state.rotTiles)     delete state.rotTiles[idx];
    }
    log('✅ Fungal tile cleared.');
    updateCoins(); RenderFarm.renderTile(idx); save(); hideTileMenu();
  });
  menu.appendChild(btn);
  menu.style.left = Math.min(x, window.innerWidth  - 200) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 80)  + 'px';
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
    RenderFarm.renderTile(idx); save();
    log(`${SEEDS[seed].icon} ${SEEDS[seed].name} harvested${_isFungal ? ' (fungal — 0 coins)' : ''}`);
    if (rotInf) log('🍂 Infected — sells for 50% base value');
    EventBus.emit('crop:harvested', { seed, idx });
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

// ══════════════════════════════
// COINS, STAGES & SELL BOX
// ══════════════════════════════
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
}

function updateCoins() {
  RenderHUD.renderCoin();
  RenderPanel.renderUpgrades();
  RenderPanel.renderItems();
  RenderPanel.renderSeeds();
  RenderPanel.renderBags();
}

function addToSellQueue(seed, bonus = 1.0, drowned = false, fungal = false) {
  const wasEmpty = state.sellQueue.length === 0;
  state.sellQueue.push({ seed, bonus, drowned, fungal });
  if (wasEmpty) STATE.session.sellElapsed = 0;
  const sb = document.getElementById('sell-box');
  if (sb) { sb.classList.remove('sell-bounce'); void sb.offsetWidth; sb.classList.add('sell-bounce'); }
  RenderSellbox.renderQueue(); save();
}

function tickSellBox() {
  if (!state.sellQueue.length) return;
  const maxSell = STATE.modifiers.sellBoxCapacity;
  let totalCoins = 0, sold = 0;
  for (let s = 0; s < maxSell && state.sellQueue.length > 0; s++) {
    const item = state.sellQueue.shift();
    let coins;
    if (item.fungal)        coins = 0;
    else if (item.drowned)  coins = Math.round(SEEDS[item.seed].sell * (item.bonus || 1));
    else                    coins = Math.round(SEEDS[item.seed].sell * STATE.modifiers.sellValue * (item.bonus || 1));
    log(`${SEEDS[item.seed].icon} ${SEEDS[item.seed].name} sold for ${coinHTML()}${coins}${item.fungal ? ' (fungal)' : ''}`);
    totalCoins += coins; sold++;
  }
  if (sold > 0) {
    if (sold === 1) sfx.sell(); else sfx.sellAuto();
    const sb = document.getElementById('sell-box');
    const r  = sb.getBoundingClientRect();
    Particles.coinBurst(r.left + r.width / 2, r.top + r.height / 2);
    showPop(`+${coinHTML()}${totalCoins}`, r.left + r.width / 2, r.top - 6);
    addCoins(totalCoins);
    EventBus.emit('crop:sold', { coins: totalCoins });
  }
  RenderSellbox.renderQueue(); save();
}

function canTick() {
  if (!state.items || !state.items.wateringCan || !state.canRefillAt) return;
  if (Date.now() >= state.canRefillAt) {
    state.canCharges  = Math.min(canCapacity(), (state.canCharges || 0) + 1);
    state.canRefillAt = 0;
    RenderPanel.renderInventory(); RenderPanel.renderItems(); save();
  } else {
    const el = document.getElementById('can-fill-timer');
    if (el) el.textContent = fmt(Math.max(0, (state.canRefillAt - Date.now()) / 1000));
  }
}

// ══════════════════════════════
// GAME EVENT HANDLERS
// All environmental/hazard logic. Called by TimerManager (wired in main.js).
// ══════════════════════════════

// ── CROW ──────────────────────────────────────────────────────────────────
function crowTick() {
  if (!state.mature) return;
  const stage = getCurrentStage().stage;
  if (stage >= 3) return;
  const chance = (stage >= 2 ? 0.08 : 0.05)
    * (state.upgrades.scarecrowCoat  ? 0.70 : 1)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) crowAttack();
}

function crowAttack() {
  const cageBlock = state.upgrades.scarecrowCoat ? Math.min(1, 0.75 + 0.30) : 0.75;
  let target = null;
  if (state.loose.length > 0) {
    const sorted = [...state.loose].sort((a,b) => SEEDS[b.seed].sell - SEEDS[a.seed].sell);
    target = { type:'loose', item: sorted[0] };
  }
  if (!target) {
    const cands = [];
    for (let i = 0; i < tileCount(); i++) {
      if (!state.tiles[i] || !isReady(state.tiles[i], i)) continue;
      if (state.cages.includes(i) && Math.random() < cageBlock) continue;
      cands.push(i);
    }
    if (cands.length) target = { type:'tile', idx: cands[Math.floor(Math.random()*cands.length)] };
  }
  if (!target) {
    const cands = [];
    for (let i = 0; i < tileCount(); i++) {
      if (!state.tiles[i] || isReady(state.tiles[i], i)) continue;
      if (state.cages.includes(i) && Math.random() < cageBlock) continue;
      cands.push(i);
    }
    if (cands.length) target = { type:'tile', idx: cands[Math.floor(Math.random()*cands.length)] };
  }
  if (!target) return;
  STATE.session.debugCounts.crow++;

  if (!state.firstCrowEver) {
    state.firstCrowEver = true;
    showBanner('🐦‍⬛ A crow has found your farm.');
  }

  let cropName;
  if (target.type === 'loose') {
    cropName = SEEDS[target.item.seed].name;
    const i = state.loose.findIndex(l => l.id === target.item.id);
    if (i !== -1) state.loose.splice(i, 1);
    renderLoose();
  } else {
    cropName = SEEDS[state.tiles[target.idx].seed].name;
    state.tiles[target.idx] = null;
    if (state.tilesWatered) delete state.tilesWatered[target.idx];
    if (state.rotTiles)     delete state.rotTiles[target.idx];
    RenderFarm.renderTile(target.idx);
  }
  sfx.attack();
  log(`🐦 A crow snatched a ${cropName}!`);
  animateCrow();
  save();
}

function animateCrow() {
  const el = mk('div','crow-anim');
  el.textContent = '🐦‍⬛';
  el.style.top = (15 + Math.random() * 55) + 'vh';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 3200);
}

// ── HAWK ──────────────────────────────────────────────────────────────────
function hawkTick() {
  if (!state.mature || getCurrentStage().stage < 2) return;
  const chance = (getCurrentStage().stage >= 3 ? 0.06 : 0.05)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) hawkAttack();
}

function hawkAttack() {
  const targets = [];
  state.loose.forEach(item => targets.push({ type:'loose', item, val: SEEDS[item.seed].sell }));
  for (let i = 0; i < tileCount(); i++) {
    if (!state.tiles[i] || !isReady(state.tiles[i], i)) continue;
    if (state.cages.includes(i) && Math.random() < 0.40) continue;
    targets.push({ type:'tile', idx:i, val: SEEDS[state.tiles[i].seed].sell });
  }
  for (let i = 0; i < tileCount(); i++) {
    if (!state.tiles[i] || isReady(state.tiles[i], i)) continue;
    if (state.cages.includes(i) && Math.random() < 0.40) continue;
    targets.push({ type:'tile', idx:i, val: SEEDS[state.tiles[i].seed].sell });
  }
  targets.sort((a, b) => b.val - a.val);
  const toSteal = targets.slice(0, state.upgrades.hawkNet ? 1 : 2);
  if (!toSteal.length) return;

  if (!state.firstHawkEver) {
    state.firstHawkEver = true;
    showBanner('🦅 A hawk circles your farm!');
  }

  let stolen = 0;
  toSteal.forEach(t => {
    if (t.type === 'loose') {
      const i = state.loose.findIndex(l => l.id === t.item.id);
      if (i !== -1) { log(`🦅 A hawk snatched a ${SEEDS[t.item.seed].name}!`); state.loose.splice(i, 1); stolen++; }
    } else {
      if (state.tiles[t.idx]) {
        log(`🦅 A hawk snatched a ${SEEDS[state.tiles[t.idx].seed].name}!`);
        state.tiles[t.idx] = null;
        if (state.tilesWatered) delete state.tilesWatered[t.idx];
        if (state.rotTiles)     delete state.rotTiles[t.idx];
        RenderFarm.renderTile(t.idx); stolen++;
      }
    }
  });
  if (stolen > 0) { STATE.session.debugCounts.hawk++; sfx.attack(); renderLoose(); animateHawk(); save(); }
}

function animateHawk() {
  const el = mk('div','hawk-anim');
  el.textContent = '🦅';
  el.style.top = (10 + Math.random() * 50) + 'vh';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 2200);
}

// ── MOLE ──────────────────────────────────────────────────────────────────
function moleTick() {
  if (!state.mature || getCurrentStage().stage < 2) return;
  const chance = (state.upgrades.groundMesh ? 0.08 * 0.60 : 0.08)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) moleAttack();
}

function moleAttack() {
  const cands = [];
  for (let i = 0; i < tileCount(); i++) {
    if (!state.tiles[i] || isReady(state.tiles[i], i)) continue;
    if (state.cages.includes(i) && Math.random() < 0.60) continue;
    cands.push(i);
  }
  if (!cands.length) return;

  if (!state.firstMoleEver) {
    state.firstMoleEver = true;
    showBanner('🐭 Moles have been spotted tunneling!');
  }

  const idx = cands[Math.floor(Math.random() * cands.length)];
  const td  = state.tiles[idx];
  STATE.session.debugCounts.mole++;
  const cx  = window.innerWidth  / 2 + (Math.random() - 0.5) * 200;
  const cy  = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
  dropLoose(td.seed, cx, cy, td.sellBonus || 1.0, td.drowned || false);
  state.tiles[idx] = null;
  if (state.tilesWatered) delete state.tilesWatered[idx];
  if (state.rotTiles)     delete state.rotTiles[idx];
  if (!state.mounds) state.mounds = {};
  state.mounds[idx] = Date.now() + (state.upgrades.quickSoil ? 5000 : 20000);
  log(`🐭 A mole uprooted a ${SEEDS[td.seed].name}! It fell loose nearby.`);
  RenderFarm.renderTile(idx); save();
}

function moundTick() {
  if (!state.mounds) return;
  let changed = false;
  const now = Date.now();
  Object.keys(state.mounds).forEach(k => {
    const idx = parseInt(k);
    if (now >= state.mounds[idx]) { delete state.mounds[idx]; RenderFarm.renderTile(idx); changed = true; }
  });
  if (changed) save();
}

// ── ROOT ROT ──────────────────────────────────────────────────────────────
function rotTick() {
  if (!state.rotTiles) return;
  const now = Date.now();
  let changed = false;
  Object.keys(state.rotTiles).forEach(k => {
    const idx = parseInt(k);
    const rot = state.rotTiles[idx];
    if (rot.deadAt !== undefined) {
      if (now >= rot.deadAt) { delete state.rotTiles[idx]; RenderFarm.renderTile(idx); changed = true; }
    } else if (rot.infectedAt !== undefined) {
      const td = state.tiles[idx];
      if (!td) { delete state.rotTiles[idx]; changed = true; return; }
      if (isReady(td, idx)) return;
      if (now - rot.infectedAt >= 90000) {
        const cropName = SEEDS[td.seed].name;
        state.tiles[idx] = null;
        if (state.tilesWatered) delete state.tilesWatered[idx];
        state.rotTiles[idx] = { deadAt: now + 30000 };
        log(`💀 ${cropName} died from root rot.`);
        RenderFarm.renderTile(idx); changed = true;
      }
    }
  });
  if (changed) save();
}

function rootRotSpawnTick() {
  if (!state.mature || getCurrentStage().stage < 3) return;
  const chance = 0.10
    * (state.upgrades.soilTreatment  ? 0.60 : 1)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) rootRotInfect();
}

function rootRotInfect() {
  const cands = [];
  for (let i = 0; i < tileCount(); i++) {
    const td = state.tiles[i];
    if (!td || isReady(td, i)) continue;
    const rot = state.rotTiles && state.rotTiles[i];
    if (rot && rot.infectedAt !== undefined) continue;
    cands.push(i);
  }
  if (!cands.length) return;

  if (!state.firstRotEver) {
    state.firstRotEver = true;
    showBanner('🍂 Root rot has reached your farm.');
  }

  const idx = cands[Math.floor(Math.random() * cands.length)];
  const td  = state.tiles[idx];
  const oldGT = SEEDS[td.seed].grow * STATE.modifiers.growSpeed * waterFactor(idx) * fertFactor(idx);
  const newGT = oldGT / 0.30;
  if (oldGT > 0) {
    const elapsed = (Date.now() - td.plantedAt) / 1000;
    const oldRem  = Math.max(0, oldGT - elapsed);
    const newRem  = oldRem * (newGT / oldGT);
    td.plantedAt  = Date.now() - (newGT - newRem) * 1000;
  }
  STATE.session.debugCounts.rootRot++;
  if (!state.rotTiles) state.rotTiles = {};
  state.rotTiles[idx] = { infectedAt: Date.now() };
  log(`🍂 Root rot infected your ${SEEDS[td.seed].name}!`);
  RenderFarm.renderTile(idx); save();
}

// ── LOCUST ────────────────────────────────────────────────────────────────
function locustTick() {
  if (!state.mature || getCurrentStage().stage < 3) return;
  const chance = 0.03
    * (state.upgrades.locustWard      ? 0.50 : 1)
    * (state.upgrades.ironGreenhouse  ? 0.80 : 1);
  if (Math.random() < chance) locustAttack();
}

function locustAttack() {
  STATE.session.debugCounts.locust++;
  if (!state.firstLocustEver) {
    state.firstLocustEver = true;
    showBanner('🪲 Locusts have descended on your farm.');
  }
  if (state.loose.length > 0) { state.loose = []; renderLoose(); }
  const now = Date.now();
  for (let i = 0; i < tileCount(); i++) {
    const td = state.tiles[i];
    if (!td || isReady(td, i)) continue;
    const gt = SEEDS[td.seed].grow * STATE.modifiers.growSpeed * waterFactor(i) * fertFactor(i) * rotFactor(i);
    const elapsed   = (now - td.plantedAt) / 1000;
    const progress  = Math.min(1, elapsed / gt);
    const setback   = state.upgrades.cropShield ? 0.15 : 0.30;
    const newProgress = Math.max(0, progress - setback);
    td.plantedAt    = now - newProgress * gt * 1000;
  }
  sfx.locust();
  log('🪲 A locust swarm devastated the farm!');
  RenderFarm.renderGrid();
  animateLocust();
}

function animateLocust() {
  const { top: farmTop, height: farmH } = document.getElementById('game-area').getBoundingClientRect();
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const el = mk('div','locust-anim');
    el.textContent = '🪲';
    el.style.top = (farmTop + (r / (rows - 1)) * farmH * 0.85) + 'px';
    el.style.animationDelay = (r * 0.12) + 's';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
    setTimeout(() => el.remove(), 5500);
  }
}

// ── BLIGHT ────────────────────────────────────────────────────────────────
function blightTick() {
  if (!state.mature || getCurrentStage().stage < 3) return;
  const chance = 0.15
    * (state.upgrades.weathervane    ? 0.60 : 1)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) blightAttack();
}

function blightAttack() {
  STATE.session.debugCounts.blight++;
  if (!state.firstBlightEver) {
    state.firstBlightEver = true;
    showBanner('🌪️ Blight storms are rolling in.');
  }
  if (state.tilesWatered) Object.keys(state.tilesWatered).forEach(k => { delete state.tilesWatered[k]; });
  if (state.fertilizedTiles && !state.upgrades.soilAnchor) {
    Object.keys(state.fertilizedTiles).forEach(k => {
      if (Math.random() < 0.25) delete state.fertilizedTiles[k];
    });
  }
  log('🌪️ A blight storm stripped your soil!');
  RenderFarm.renderGrid();
  animateBlight();
}

function animateBlight() {
  const el = mk('div','blight-cloud');
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 3200);
}

// ── FUNGAL ────────────────────────────────────────────────────────────────
function fungalSpawnTick() {
  if (!state.mature || getCurrentStage().stage < 3) return;
  const chance = 0.08
    * (state.upgrades.antifungalSpray ? 0.50 : 1)
    * (state.upgrades.ironGreenhouse  ? 0.80 : 1);
  if (Math.random() < chance) fungalBloom();
}

function fungalBloom() {
  const cands = [];
  for (let i = 0; i < tileCount(); i++) {
    if (state.fungalTiles    && state.fungalTiles[i]    !== undefined) continue;
    if (state.weeds          && state.weeds[i]          !== undefined) continue;
    if (state.thornedWeeds   && state.thornedWeeds[i]   !== undefined) continue;
    if (state.mounds         && state.mounds[i]         !== undefined) continue;
    if (state.rotTiles       && state.rotTiles[i]       && state.rotTiles[i].deadAt !== undefined) continue;
    cands.push(i);
  }
  if (!cands.length) return;
  if (!state.firstFungalEver) {
    state.firstFungalEver = true;
    showBanner('🍄 A fungal bloom has taken root.');
  }
  STATE.session.debugCounts.fungal++;
  if (!state.fungalTiles) state.fungalTiles = {};
  const idx = cands[Math.floor(Math.random() * cands.length)];
  state.fungalTiles[idx] = { spawnedAt: Date.now() };
  log('🍄 Fungal bloom appeared!');
  RenderFarm.renderTile(idx); save();
}

function fungalSpreadTick() {
  if (!state.fungalTiles || state.upgrades.containment) return;
  const total = Object.keys(state.fungalTiles).length;
  if (total === 0 || total >= 4) return;
  fungalSpread();
}

function fungalSpread() {
  if (!state.fungalTiles) return;
  const fungalIdxs = Object.keys(state.fungalTiles).map(Number);
  if (fungalIdxs.length >= 4) return;
  const { cols } = getGridDims();
  const tc       = tileCount();
  const adjSet   = new Set();
  fungalIdxs.forEach(idx => {
    const r = Math.floor(idx / cols), c = idx % cols;
    [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc]) => {
      if (nr < 0 || nc < 0 || nc >= cols) return;
      const ni = nr * cols + nc;
      if (ni >= tc) return;
      if (state.fungalTiles[ni]  !== undefined) return;
      if (state.weeds        && state.weeds[ni]        !== undefined) return;
      if (state.thornedWeeds && state.thornedWeeds[ni] !== undefined) return;
      if (state.mounds       && state.mounds[ni]       !== undefined) return;
      if (state.rotTiles     && state.rotTiles[ni]     && state.rotTiles[ni].deadAt !== undefined) return;
      adjSet.add(ni);
    });
  });
  if (!adjSet.size) return;
  const adjArr = [...adjSet];
  const target = adjArr[Math.floor(Math.random() * adjArr.length)];
  state.fungalTiles[target] = { spawnedAt: Date.now() };
  log('🍄 Fungal bloom spread.');
  RenderFarm.renderTile(target); save();
}

// ── WEEDS ─────────────────────────────────────────────────────────────────
function weedTick() {
  if (!state.mature) return;
  const chance = (getCurrentStage().stage >= 3 ? 0.18 : 0.12)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) weedSpawn();
}

function weedSpawn() {
  const tc    = tileCount();
  const empty = [];
  for (let i = 0; i < tc; i++) {
    if (!state.tiles[i] &&
        !(state.weeds        && state.weeds[i]        !== undefined) &&
        !(state.thornedWeeds && state.thornedWeeds[i] !== undefined) &&
        !(state.mounds       && state.mounds[i]       !== undefined) &&
        !(state.fungalTiles  && state.fungalTiles[i]  !== undefined)) empty.push(i);
  }
  if (!empty.length) return;

  const stage = getCurrentStage().stage;
  let thornedChance = 0.30 * (state.upgrades.herbicideI ? 0.75 : 1);
  const spawnThorned = stage >= 3 || (stage >= 2 && Math.random() < thornedChance);

  if (spawnThorned) {
    const cands = empty.filter(i => !state.cages.includes(i) || Math.random() > 0.60);
    if (!cands.length) return;
    const idx = cands[Math.floor(Math.random() * cands.length)];
    if (!state.thornedWeeds) state.thornedWeeds = {};
    state.thornedWeeds[idx] = { clicks: 0, spawnedAt: Date.now() };
    STATE.session.debugCounts.weed++;
    if (!state.firstThornedEver) {
      state.firstThornedEver = true;
      showBanner('🌵 Thorned weeds are appearing!');
    }
    log('🌵 A thorned weed sprouted! (50 clicks to clear)');
    RenderFarm.renderTile(idx); save();
  } else {
    const idx = empty[Math.floor(Math.random() * empty.length)];
    if (!state.weeds) state.weeds = {};
    state.weeds[idx] = { clicks: 0, spawnedAt: Date.now() };
    STATE.session.debugCounts.weed++;
    if (!state.firstWeedEver) {
      state.firstWeedEver = true;
      showBanner('🌿 Weeds are beginning to appear.');
    }
    log('🌿 A weed sprouted!');
    RenderFarm.renderTile(idx); save();
  }
}

// ── THORNED WEED SPREAD ───────────────────────────────────────────────────
function thornedWeedTick() {
  if (!state.thornedWeeds || state.upgrades.herbicideII) return;
  const stage    = getCurrentStage().stage;
  if (stage < 2) return;
  const spreadMs = stage >= 3 ? 30000 : 60000;
  const now      = Date.now();
  const toSpread = [];
  Object.keys(state.thornedWeeds).forEach(k => {
    const idx = parseInt(k);
    if (now - state.thornedWeeds[idx].spawnedAt >= spreadMs) toSpread.push(idx);
  });
  if (!toSpread.length) return;
  toSpread.forEach(idx => {
    delete state.thornedWeeds[idx];
    RenderFarm.renderTile(idx);
    const { cols } = getGridDims();
    const tc = tileCount();
    const r  = Math.floor(idx / cols), c = idx % cols;
    const adj = [];
    [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc]) => {
      if (nr < 0 || nc < 0 || nc >= cols) return;
      const ni = nr * cols + nc;
      if (ni >= tc) return;
      if (!state.tiles[ni] &&
          !(state.weeds        && state.weeds[ni]        !== undefined) &&
          !(state.thornedWeeds && state.thornedWeeds[ni] !== undefined) &&
          !(state.mounds       && state.mounds[ni]       !== undefined)) adj.push(ni);
    });
    if (adj.length) {
      const target = adj[Math.floor(Math.random() * adj.length)];
      if (!state.weeds) state.weeds = {};
      state.weeds[target] = { clicks: 0 };
      log('🌿 A thorned weed spread to an adjacent tile!');
      RenderFarm.renderTile(target);
    }
  });
  save();
}

// ── MASTER FARMER ─────────────────────────────────────────────────────────
function masterFarmerTick() {
  if (!state.upgrades.masterFarmer) return;
  const now = Date.now(), MS = 10000;
  let changed = false;
  if (state.weeds) {
    Object.keys(state.weeds).forEach(k => {
      const idx = parseInt(k);
      if (now - (state.weeds[idx].spawnedAt || now - MS) >= MS) {
        delete state.weeds[idx]; RenderFarm.renderTile(idx); changed = true;
      }
    });
  }
  if (state.thornedWeeds) {
    Object.keys(state.thornedWeeds).forEach(k => {
      const idx = parseInt(k);
      if (now - (state.thornedWeeds[idx].spawnedAt || now - MS) >= MS) {
        delete state.thornedWeeds[idx]; RenderFarm.renderTile(idx); changed = true;
      }
    });
  }
  if (changed) save();
}
