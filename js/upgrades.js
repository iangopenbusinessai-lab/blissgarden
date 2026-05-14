// ══════════════════════════════
// MULTIPLIERS & TILE MODIFIERS
// ══════════════════════════════
function waterFactor(idx) {
  return (idx !== undefined && state.tilesWatered && state.tilesWatered[idx]) ? 0.75 : 1.0;
}
function fertFactor(idx) {
  let f = 1.0;
  if (idx !== undefined && state.fertilizedTiles        && state.fertilizedTiles[idx])        f *= 0.75;
  if (idx !== undefined && state.uncommonFertilizedTiles && state.uncommonFertilizedTiles[idx]) f *= 0.60;
  return f;
}
function rotFactor(idx) {
  const rot = state.rotTiles && state.rotTiles[idx];
  if (rot && rot.infectedAt !== undefined && rot.deadAt === undefined) return 1 / 0.30;
  return 1.0;
}
function remSec(td, idx) {
  const gt = SEEDS[td.seed].grow * getGrowMult() * waterFactor(idx) * fertFactor(idx) * rotFactor(idx);
  return Math.max(0, gt - (Date.now() - td.plantedAt) / 1000);
}
function isReady(td, idx) { return remSec(td, idx) <= 0; }

function getGrowMult() {
  let m = 1;
  UPGRADES.forEach(u => { if (u.type === 'speed' && state.upgrades[u.id]) m *= u.mult; });
  return m;
}
function getSellMult() {
  let m = 1;
  UPGRADES.forEach(u => { if (u.type === 'value' && state.upgrades[u.id]) m *= u.mult; });
  return m;
}
function getSellSpeedMult() {
  let m = 1;
  UPGRADES.forEach(u => { if (u.type === 'sellSpeed' && state.upgrades[u.id]) m *= u.mult; });
  return m;
}
function getSellInterval() { return 10000 * getSellSpeedMult() / crankMult; }
function canCapacity()     { return state.upgrades.copperSpout ? 2 : 1; }
function canFillTime()     { return state.upgrades.copperSpout ? 8000 : 20000; }
function getCrankClickMult() {
  if (state.upgrades.diamondCrank)  return 1.085;
  if (state.upgrades.titaniumCrank) return 1.060;
  if (state.upgrades.steelCrank)    return 1.040;
  if (state.upgrades.ironCrank)     return 1.025;
  return 1.015;
}
function getSellAtOnce() {
  if (state.upgrades.diamondSellBox)  return 8;
  if (state.upgrades.titaniumSellBox) return 5;
  if (state.upgrades.steelSellBox)    return 3;
  if (state.upgrades.ironSellBox)     return 2;
  return 1;
}
function adjustGrowTimes(oldMult, newMult) {
  const now = Date.now();
  for (let i = 0; i < tileCount(); i++) {
    const td = state.tiles[i];
    if (!td) continue;
    const wf = waterFactor(i), ff = fertFactor(i), rf = rotFactor(i);
    const base = SEEDS[td.seed].grow;
    const oldGT = base * oldMult * wf * ff * rf, newGT = base * newMult * wf * ff * rf;
    if (oldGT <= 0) continue;
    const elapsed = (now - td.plantedAt) / 1000;
    const oldRem  = Math.max(0, oldGT - elapsed);
    const newRem  = oldRem * (newGT / oldGT);
    td.plantedAt  = now - (newGT - newRem) * 1000;
  }
}

// Recomputes STATE.modifiers from STATE.upgrades.
// All purchased tiers in a chain multiply together (matches main.js getGrowMult/getSellMult).
// Tile-level modifiers (fertilizer, water) are applied per-crop at grow/sell time.
function recalculateModifiers() {
  const mods = STATE.modifiers;
  const bought = STATE.upgrades;

  let speedMult     = 1;
  let valueMult     = 1;
  let sellSpeedMult = 1;

  for (const u of UPGRADES) {
    if (!bought[u.id]) continue;
    if (u.type === 'speed')          speedMult     *= u.mult;
    else if (u.type === 'value')     valueMult     *= u.mult;
    else if (u.type === 'sellSpeed') sellSpeedMult *= u.mult;
  }

  mods.growSpeed    = speedMult;
  mods.sellValue    = valueMult;
  mods.sellInterval = 10000 * sellSpeedMult;

  if      (bought.diamondSellBox)   mods.sellBoxCapacity = 8;
  else if (bought.titaniumSellBox)  mods.sellBoxCapacity = 5;
  else if (bought.steelSellBox)     mods.sellBoxCapacity = 3;
  else if (bought.ironSellBox)      mods.sellBoxCapacity = 2;
  else                              mods.sellBoxCapacity = 1;
  // crankMultiplier is managed at runtime by the crank mechanism — not touched here.
}

function applyUpgrade(id) {
  STATE.upgrades[id] = true;
  recalculateModifiers();
  EventBus.emit('upgrade:purchased', { id });
  save();
}

// ── MULTIPLIERS ──
function getGrowMult() {
  let m = 1;
  UPGRADES.forEach(u => { if (u.type === 'speed' && state.upgrades[u.id]) m *= u.mult; });
  return m;
}
function getSellMult() {
  let m = 1;
  UPGRADES.forEach(u => { if (u.type === 'value' && state.upgrades[u.id]) m *= u.mult; });
  return m;
}
function getSellSpeedMult() {
  let m = 1;
  UPGRADES.forEach(u => { if (u.type === 'sellSpeed' && state.upgrades[u.id]) m *= u.mult; });
  return m;
}
function getSellInterval() { return 10000 * getSellSpeedMult() / crankMult; }
function canCapacity()     { return state.upgrades.copperSpout ? 2 : 1; }
function canFillTime()     { return state.upgrades.copperSpout ? 8000 : 20000; }
function getCrankClickMult() {
  if (state.upgrades.diamondCrank)  return 1.085;
  if (state.upgrades.titaniumCrank) return 1.060;
  if (state.upgrades.steelCrank)    return 1.040;
  if (state.upgrades.ironCrank)     return 1.025;
  return 1.015;
}
function getSellAtOnce() {
  if (state.upgrades.diamondSellBox)  return 8;
  if (state.upgrades.titaniumSellBox) return 5;
  if (state.upgrades.steelSellBox)    return 3;
  if (state.upgrades.ironSellBox)     return 2;
  return 1;
}
function waterFactor(idx) {
  return (idx !== undefined && state.tilesWatered && state.tilesWatered[idx]) ? 0.75 : 1.0;
}
function fertFactor(idx) {
  let f = 1.0;
  if (idx !== undefined && state.fertilizedTiles        && state.fertilizedTiles[idx])        f *= 0.75;
  if (idx !== undefined && state.uncommonFertilizedTiles && state.uncommonFertilizedTiles[idx]) f *= 0.60;
  return f;
}
function rotFactor(idx) {
  const rot = state.rotTiles && state.rotTiles[idx];
  if (rot && rot.infectedAt !== undefined && rot.deadAt === undefined) return 1 / 0.30;
  return 1.0;
}
function remSec(td, idx) {
  const gt = SEEDS[td.seed].grow * getGrowMult() * waterFactor(idx) * fertFactor(idx) * rotFactor(idx);
  return Math.max(0, gt - (Date.now() - td.plantedAt) / 1000);
}
function isReady(td, idx) { return remSec(td, idx) <= 0; }

function adjustGrowTimes(oldMult, newMult) {
  const now = Date.now();
  for (let i = 0; i < tileCount(); i++) {
    const td = state.tiles[i];
    if (!td) continue;
    const wf = waterFactor(i), ff = fertFactor(i), rf = rotFactor(i);
    const base = SEEDS[td.seed].grow;
    const oldGT = base * oldMult * wf * ff * rf, newGT = base * newMult * wf * ff * rf;
    if (oldGT <= 0) continue;
    const elapsed = (now - td.plantedAt) / 1000;
    const oldRem  = Math.max(0, oldGT - elapsed);
    const newRem  = oldRem * (newGT / oldGT);
    td.plantedAt  = now - (newGT - newRem) * 1000;
  }
}
