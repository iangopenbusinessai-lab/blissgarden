// ══════════════════════════════
// WATER / DROWN
// ══════════════════════════════
function applyWater(idx) {
  const td = state.tiles[idx];
  if (!td || isReady(td, idx)) return;
  if (state.tilesWatered && state.tilesWatered[idx]) { drownTile(idx); return; }
  const baseGT = SEEDS[td.seed].grow * getGrowMult() * fertFactor(idx);
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
  const currentGT = SEEDS[td.seed].grow * getGrowMult() * ff * 0.75;
  const drownedGT = SEEDS[td.seed].grow * getGrowMult() * ff;
  const elapsed   = (Date.now() - td.plantedAt) / 1000;
  const currentRem = Math.max(0, currentGT - elapsed);
  const newRem    = currentRem * (drownedGT / currentGT);
  td.plantedAt    = Date.now() - (drownedGT - newRem) * 1000;
  td.drowned      = true; td.sellBonus = 0.25;
  delete state.tilesWatered[idx];
  RenderFarm.renderTile(idx); RenderPanel.renderInventory(); RenderPanel.renderItems();
  log(`💀 ${SEEDS[td.seed].name} was drowned! Value severely reduced.`);
  save();
}

// ══════════════════════════════
// LOOSE CROPS
// ══════════════════════════════
function addInventory(seed) { state.inventory[seed] = (state.inventory[seed] || 0) + 1; }

function dropLoose(seed, x, y, bonus = 1.0, drowned = false, fungal = false) {
  const id = nextId++;
  state.loose.push({ seed, id, x, y, bonus, drowned, fungal });
  sfx.drop();
  renderLoose();
  const el = document.querySelector(`.loose-crop[data-id="${id}"]`);
  if (el) el.classList.add('loose-land');
  save();
}

function renderLoose() {
  document.querySelectorAll('.loose-crop').forEach(el => el.remove());
  state.loose.forEach(item => {
    const el = mk('div','loose-crop');
    el.appendChild(makeSpriteDiv(item.seed, 'grown', 48));
    el.style.left = item.x + 'px'; el.style.top = item.y + 'px';
    el.dataset.id = item.id;
    el.addEventListener('mousedown', e => {
      e.stopPropagation();
      const i = state.loose.findIndex(g => g.id === item.id);
      if (i === -1) return;
      const { seed: s, bonus: b = 1.0, drowned: dr = false, fungal: fg = false } = state.loose[i];
      state.loose.splice(i, 1); renderLoose(); save();
      startDrag(s, 'loose', b, dr, fg); moveGhost(e.clientX, e.clientY);
    });
    document.body.appendChild(el);
  });
}

// ══════════════════════════════
// SELECTION & TILE MENUS
// ══════════════════════════════
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
      const base = SEEDS[td.seed].grow, gm = getGrowMult(), wf = waterFactor(idx), ff = fertFactor(idx);
      const oldGT = base * gm * wf * ff * oldRF, newGT = base * gm * wf * ff * newRF;
      if (oldGT > 0) {
        const elapsed = (Date.now() - td.plantedAt) / 1000;
        const oldRem = Math.max(0, oldGT - elapsed);
        td.plantedAt = Date.now() - (newGT - oldRem * (newGT / oldGT)) * 1000;
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
          const base = SEEDS[td.seed].grow, gm = getGrowMult(), wf = waterFactor(idx), ff = fertFactor(idx);
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
// VISUAL HELPERS
// ══════════════════════════════
function spawnHarvestPop(x, y, seed) {
  const el = mk('div','harvest-pop');
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.appendChild(makeSpriteDiv(seed, 'grown', 56));
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 200);
}

function showPop(text, x, y) {
  const el = mk('div','fpop'); el.innerHTML = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 1250);
}

// ══════════════════════════════
// TIMER DISPLAY
// ══════════════════════════════
function updateTimers() {
  const nodes = RenderFarm.tileNodes;
  for (let i = 0; i < nodes.length; i++) {
    const td = state.tiles[i];
    if (!td) continue;
    const wasReady = prevReadyState[i] || false;
    const nowReady = isReady(td, i);
    if (!wasReady && nowReady) {
      prevReadyState[i] = true;
      RenderFarm.renderTile(i);
    } else if (!nowReady) {
      const el = nodes[i]; if (!el) continue;
      const timerEl = el.querySelector('.t-timer');
      if (timerEl) timerEl.textContent = fmt(remSec(td, i));
      prevReadyState[i] = false;
    }
  }
  document.querySelectorAll('.t-mound-timer').forEach(timerEl => {
    const mIdx = parseInt(timerEl.dataset.moundIdx);
    if (state.mounds && state.mounds[mIdx] !== undefined)
      timerEl.textContent = fmt(Math.max(0, (state.mounds[mIdx] - Date.now()) / 1000));
  });
  document.querySelectorAll('.t-rot-timer').forEach(timerEl => {
    const rIdx = parseInt(timerEl.dataset.rotTimerIdx);
    const rot  = state.rotTiles && state.rotTiles[rIdx];
    if (rot && rot.infectedAt !== undefined)
      timerEl.textContent = fmt(Math.max(0, 90 - (Date.now() - rot.infectedAt) / 1000));
  });
  document.querySelectorAll('.t-rotdead-timer').forEach(timerEl => {
    const rIdx = parseInt(timerEl.dataset.rotDeadIdx);
    const rot  = state.rotTiles && state.rotTiles[rIdx];
    if (rot && rot.deadAt !== undefined)
      timerEl.textContent = fmt(Math.max(0, (rot.deadAt - Date.now()) / 1000));
  });
}

window.RenderFarm = (() => {
  const tileNodes = []; // indexed by tile idx; rebuilt only on buildGrid()

  function renderTile(idx) {
    const el = tileNodes[idx];
    if (!el) return;

    while (el.firstChild) el.removeChild(el.firstChild);
    el.className = 'tile';

    // ── Dead rot tile ──
    if (state.rotTiles && state.rotTiles[idx] && state.rotTiles[idx].deadAt !== undefined) {
      el.classList.add('tile-rotdead');
      const rdIcon = mk('div','t-rotdead-icon'); rdIcon.textContent = '💀'; el.appendChild(rdIcon);
      const rem = Math.max(0, (state.rotTiles[idx].deadAt - Date.now()) / 1000);
      const rdTimer = mk('div','t-rotdead-timer');
      rdTimer.dataset.rotDeadIdx = idx; rdTimer.textContent = fmt(rem); el.appendChild(rdTimer);
      return;
    }

    // ── Mound tile ──
    if (state.mounds && state.mounds[idx] !== undefined) {
      el.classList.add('tile-mound');
      const mIcon = mk('div','t-mound-icon'); mIcon.textContent = '🐭'; el.appendChild(mIcon);
      const rem = Math.max(0, (state.mounds[idx] - Date.now()) / 1000);
      const mTimer = mk('div','t-mound-timer');
      mTimer.dataset.moundIdx = idx; mTimer.textContent = fmt(rem); el.appendChild(mTimer);
      return;
    }

    // ── Thorned weed tile ──
    if (state.thornedWeeds && state.thornedWeeds[idx] !== undefined) {
      el.classList.add('tile-thorned');
      const twIcon  = mk('div','t-thorned-icon'); twIcon.textContent = '🌵'; el.appendChild(twIcon);
      const twCount = mk('div','t-thorned-count');
      twCount.textContent = `${state.thornedWeeds[idx].clicks}/${THORNED_WEED_CLICKS}`; el.appendChild(twCount);
      return;
    }

    // ── Weed tile ──
    if (state.weeds && state.weeds[idx] !== undefined) {
      el.classList.add('tile-weed');
      const wIcon  = mk('div','t-weed-icon'); wIcon.textContent = '🌿'; el.appendChild(wIcon);
      const wCount = mk('div','t-weed-count');
      wCount.textContent = `${state.weeds[idx].clicks}/${WEED_CLICKS}`; el.appendChild(wCount);
      return;
    }

    // ── Normal tile ──
    const td            = state.tiles[idx];
    const isCaged       = state.cages && state.cages.includes(idx);
    const isWatered     = !!(state.tilesWatered && state.tilesWatered[idx]);
    const isFertilized  = !!(state.fertilizedTiles && state.fertilizedTiles[idx]);
    const isUFertilized = !!(state.uncommonFertilizedTiles && state.uncommonFertilizedTiles[idx]);
    const isRotInfected = !!(state.rotTiles && state.rotTiles[idx] &&
                             state.rotTiles[idx].infectedAt !== undefined &&
                             state.rotTiles[idx].deadAt === undefined);
    const isFungal      = !!(state.fungalTiles && state.fungalTiles[idx] !== undefined);

    if (isRotInfected) el.classList.add('tile-rot');
    if (isCaged)       el.classList.add('tile-caged');
    if (isUFertilized) el.classList.add('tile-ufertilized');
    else if (isFertilized) el.classList.add('tile-fertilized');
    if (isFungal)      el.classList.add('tile-fungal');

    if (!td) {
      if (isCaged)           { const c = mk('div','t-cage-icon');  c.textContent='🔒'; el.appendChild(c); }
      if (isUFertilized)     { const f = mk('div','t-ufert-icon'); f.textContent='⚗️'; el.appendChild(f); }
      else if (isFertilized) { const f = mk('div','t-fert-icon');  f.textContent='🌿'; el.appendChild(f); }
      if (isFungal)          { const fi = mk('div','t-fungal-icon'); fi.textContent='🍄'; el.appendChild(fi); }
      return;
    }

    const rdy = isReady(td, idx);
    if (rdy) {
      el.classList.add('ready');
    } else {
      if (isWatered)  el.classList.add('tile-watered');
      if (td.drowned) el.classList.add('tile-drowned');
    }

    const icon = mk('div','t-icon');
    icon.appendChild(makeSpriteDiv(td.seed, rdy ? 'grown' : 'sprout', 56));
    el.appendChild(icon);

    if (!rdy) {
      const timer = mk('div','t-timer'); timer.textContent = fmt(remSec(td, idx)); el.appendChild(timer);
      if (isWatered && !td.drowned) { const w = mk('div','t-water-icon'); w.textContent='💧'; el.appendChild(w); }
      if (td.drowned) { const d = mk('div','t-drown-icon'); d.textContent='💀'; el.appendChild(d); }

      if (selectedTile === idx) {
        const xb = mk('div','t-xbtn'); xb.textContent = '✕';
        xb.addEventListener('mousedown', e => {
          e.stopPropagation();
          state.tiles[idx] = null;
          if (state.tilesWatered) delete state.tilesWatered[idx];
          if (state.rotTiles)     delete state.rotTiles[idx];
          deselect(); renderTile(idx); save();
        });
        el.appendChild(xb);

        if (isCaged) {
          const cb = mk('div','t-cage-rm'); cb.textContent = '🔒'; cb.title = 'Remove cage';
          cb.addEventListener('mousedown', e => {
            e.stopPropagation();
            const ci = state.cages.indexOf(idx);
            if (ci !== -1) { state.cages.splice(ci, 1); state.cageCount = (state.cageCount||0) + 1; }
            renderTile(idx); RenderPanel.renderItems(); log('🔒 Cage removed, returned to inventory'); save();
          });
          el.appendChild(cb);
        }
      }
    }

    if (isUFertilized)     { const f = mk('div','t-ufert-icon'); f.textContent='⚗️'; el.appendChild(f); }
    else if (isFertilized) { const f = mk('div','t-fert-icon');  f.textContent='🌿'; el.appendChild(f); }
    if (isCaged) { const c = mk('div','t-cage-icon'); c.textContent='🔒'; el.appendChild(c); }
    if (isRotInfected) {
      const ri = mk('div','t-rot-icon'); ri.textContent = '🍂'; el.appendChild(ri);
      if (!rdy) {
        const rem = Math.max(0, 90 - (Date.now() - state.rotTiles[idx].infectedAt) / 1000);
        const rt  = mk('div','t-rot-timer');
        rt.dataset.rotTimerIdx = idx; rt.textContent = fmt(rem); el.appendChild(rt);
      }
    }
    if (isFungal) { const fi = mk('div','t-fungal-icon'); fi.textContent='🍄'; el.appendChild(fi); }
  }

  function renderGrid() {
    for (let i = 0; i < tileNodes.length; i++) renderTile(i);
  }

  // Only called on init and expansion upgrades — innerHTML on grid container is allowed here.
  function buildGrid() {
    const grid = document.getElementById('farm-grid');
    const { cols, rows } = getGridDims();
    grid.style.gridTemplateColumns = `repeat(${cols}, 100px)`;
    grid.style.gridTemplateRows    = `repeat(${rows}, 100px)`;
    while (state.tiles.length < tileCount()) state.tiles.push(null);
    grid.innerHTML = '';
    tileNodes.length = 0;
    for (let i = 0; i < tileCount(); i++) {
      const el = document.createElement('div');
      el.className = 'tile'; el.dataset.idx = i;
      el.addEventListener('mousedown', onTileDown);
      grid.appendChild(el);
      tileNodes.push(el);
    }
  }

  function probeSprites() {
    const img = new Image();
    img.onerror = () => console.error('sprites.png not found at ./sprites.png');
    img.src = './sprites.png';
  }

  return { renderTile, renderGrid, buildGrid, probeSprites, tileNodes };
})();
