// ══════════════════════════════════════════════════════════════════════════
// STAGE 4 EVENTS
// ══════════════════════════════════════════════════════════════════════════

// ── RECLAIM MENU ──────────────────────────────────────────────────────────
function showReclaimMenu(idx, cost, x, y) {
  const menu = document.getElementById('tile-menu');
  menu.innerHTML = '';
  const header = mk('div');
  header.style.cssText = 'color:rgba(255,200,80,.9);font-size:10px;font-weight:700;padding:4px 8px 2px';
  header.textContent = '🏗️ Claimed — pay to reclaim';
  menu.appendChild(header);
  const btn = mk('button'); btn.className = 'tmenu-btn';
  btn.innerHTML = `💰 Reclaim — ${coinHTML()}${cost}`;
  if (state.coins < cost) { btn.disabled = true; btn.style.opacity = '0.4'; }
  btn.addEventListener('mousedown', e => {
    e.stopPropagation();
    if (!state.claimedTiles || !state.claimedTiles[idx]) return;
    if (state.coins < cost) return;
    state.coins -= cost;
    delete state.claimedTiles[idx];
    updateCoins(); RenderFarm.renderTile(idx); save(); hideTileMenu();
    log('💰 Tile reclaimed from developers.');
  });
  menu.appendChild(btn);
  menu.style.left = Math.min(x, window.innerWidth  - 200) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 80)  + 'px';
  menu.style.display = 'block';
}

// ── LAND DEVELOPERS ───────────────────────────────────────────────────────
function landDeveloperTick() {
  if (!state.mature || getCurrentStage().stage < 4) return;
  const chance = 0.15;
  if (Math.random() < chance) landDeveloperAttack();
}

function landDeveloperAttack() {
  const cands = [];
  for (let i = 0; i < tileCount(); i++) {
    if (state.claimedTiles && state.claimedTiles[i]) continue;
    if (state.weeds        && state.weeds[i]        !== undefined) continue;
    if (state.thornedWeeds && state.thornedWeeds[i] !== undefined) continue;
    if (state.mounds       && state.mounds[i]       !== undefined) continue;
    if (state.diseasedTiles && state.diseasedTiles[i]) continue;
    if (state.rotTiles     && state.rotTiles[i]     && state.rotTiles[i].deadAt !== undefined) continue;
    if (!state.tiles[i]) cands.push(i);
  }
  if (!cands.length) return;

  if (!state.firstDeveloperEver) {
    state.firstDeveloperEver = true;
    showBanner('🏗️ Land Developers have targeted your farm!');
  }

  const idx  = cands[Math.floor(Math.random() * cands.length)];
  const cost = 500 + (getCurrentStage().stage || 4) * 100;
  if (!state.claimedTiles) state.claimedTiles = {};
  state.claimedTiles[idx] = { claimedAt: Date.now(), deadlineAt: Date.now() + 60000, reclaimCost: cost };
  log(`🏗️ Developers claimed plot ${idx + 1}! Pay ${coinHTML()}${cost} within 60s or lose it.`);
  RenderFarm.renderTile(idx); save();
}

function claimedTileTick() {
  if (!state.claimedTiles) return;
  const now = Date.now();
  let changed = false;
  Object.keys(state.claimedTiles).forEach(k => {
    const idx = parseInt(k);
    const cl  = state.claimedTiles[idx];
    if (!cl) return;
    if (cl.releasesAt !== undefined) {
      if (now >= cl.releasesAt) { delete state.claimedTiles[idx]; RenderFarm.renderTile(idx); changed = true; }
    } else if (cl.deadlineAt !== undefined) {
      if (now >= cl.deadlineAt) {
        if (state.tiles[idx]) {
          const td = state.tiles[idx];
          const cx = window.innerWidth  / 2 + (Math.random() - 0.5) * 200;
          const cy = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
          dropLoose(td.seed, cx, cy, td.sellBonus || 1.0, td.drowned || false);
          state.tiles[idx] = null;
          if (state.tilesWatered) delete state.tilesWatered[idx];
          if (state.rotTiles)     delete state.rotTiles[idx];
        }
        state.claimedTiles[idx] = { lockedAt: now, releasesAt: now + 120000 };
        log(`🏗️ Developers seized plot ${idx + 1}! Locked for 120s.`);
        RenderFarm.renderTile(idx); changed = true;
      }
    }
  });
  if (changed) save();
}

// ── PLAGUE RATS ───────────────────────────────────────────────────────────
function plagueRatTick() {
  if (!state.mature || getCurrentStage().stage < 4) return;
  const chance = (state.upgrades.groundMesh ? 0.10 * 0.60 : 0.10)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) plagueRatAttack();
}

function plagueRatAttack() {
  const cands = [];
  for (let i = 0; i < tileCount(); i++) {
    if (!state.tiles[i] || isReady(state.tiles[i], i)) continue;
    if (state.cages.includes(i) && Math.random() < 0.60) continue;
    if (state.claimedTiles && state.claimedTiles[i]) continue;
    cands.push(i);
  }
  if (!cands.length) return;

  if (!state.firstRatEver) {
    state.firstRatEver = true;
    showBanner('🐀 Plague rats are infesting the farm!');
  }

  const idx = cands[Math.floor(Math.random() * cands.length)];
  const td  = state.tiles[idx];
  const cx  = window.innerWidth  / 2 + (Math.random() - 0.5) * 200;
  const cy  = window.innerHeight / 2 + (Math.random() - 0.5) * 200;
  dropLoose(td.seed, cx, cy, td.sellBonus || 1.0, td.drowned || false);
  state.tiles[idx] = null;
  if (state.tilesWatered) delete state.tilesWatered[idx];
  if (state.rotTiles)     delete state.rotTiles[idx];
  if (!state.mounds) state.mounds = {};
  state.mounds[idx] = Date.now() + (state.upgrades.quickSoil ? 5000 : 20000);
  if (!state.diseasedTiles) state.diseasedTiles = {};
  state.diseasedTiles[idx] = Date.now() + 60000;
  log(`🐀 Plague rats uprooted a ${SEEDS[td.seed].name} and diseased the soil!`);
  RenderFarm.renderTile(idx); save();
}

function diseasedTileTick() {
  if (!state.diseasedTiles) return;
  const now = Date.now();
  let changed = false;
  Object.keys(state.diseasedTiles).forEach(k => {
    const idx = parseInt(k);
    if (now >= state.diseasedTiles[idx]) {
      delete state.diseasedTiles[idx];
      RenderFarm.renderTile(idx);
      changed = true;
    }
  });
  if (changed) save();
}

// ── ACID RAIN ─────────────────────────────────────────────────────────────
function acidRainTick() {
  if (!state.mature || getCurrentStage().stage < 4) return;
  if (getCurrentStage().stage >= 5) return;
  const chance = 0.15
    * (state.upgrades.weathervane    ? 0.60 : 1)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) acidRainAttack();
}

function acidRainAttack() {
  if (!state.firstAcidRainEver) {
    state.firstAcidRainEver = true;
    showBanner('☠️ Acid rain is falling on your farm!');
  }
  if (!state.upgrades.soilAnchor) {
    state.fertilizedTiles        = {};
    state.uncommonFertilizedTiles = {};
  }
  if (state.tilesWatered) Object.keys(state.tilesWatered).forEach(k => { delete state.tilesWatered[k]; });
  for (let i = 0; i < tileCount(); i++) {
    const td = state.tiles[i];
    if (!td || !td.seed || isReady(td, i)) continue;
    if (td.burnedSeconds !== undefined) td.burnedSeconds = Math.max(0, td.burnedSeconds * 0.80);
  }
  log('☠️ Acid rain stripped your soil and set back your crops!');
  RenderFarm.renderGrid();
  animateAcidRain();
  save();
}

function animateAcidRain() {
  const el = mk('div','acid-rain-cloud');
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 4200);
}
