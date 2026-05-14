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

// Recomputes STATE.modifiers from STATE.upgrades + STATE.prestige.
// Speed/value chains: highest purchased tier wins — tiers do NOT stack.
// Sell-speed chain: same (lowest multiplier = fastest = wins).
// Tile-level modifiers (fertilizer, water) remain per-crop at grow/sell time.
function recalculateModifiers() {
  const mods     = STATE.modifiers;
  const bought   = STATE.upgrades;
  const prestige = STATE.prestige || {};

  // ── growSpeed: highest tier value wins, no stacking ───────────────────────
  const SPEED_TIERS = [
    ['quickRoots',     1.25 ],
    ['fertilizerI',    1.40 ],
    ['fertilizerII',   1.55 ],
    ['fertilizerIII',  1.70 ],
    ['fertilizerIV',   1.80 ],
    ['fertilizerV',    1.90 ],
    ['fertilizerVI',   1.95 ],
    ['fertilizerVII',  1.97 ],
    ['fertilizerVIII', 1.985],
    ['fertilizerIX',   1.99 ],
    ['fertilizerX',    1.995],
  ];
  let growSpeed = 1;
  for (const [id, val] of SPEED_TIERS) { if (bought[id]) growSpeed = val; }
  mods.growSpeed = growSpeed * (1 + 0.15 * (prestige.fertileLegacy || 0));

  // ── sellValue: highest tier value wins, no stacking ───────────────────────
  const VALUE_TIERS = [
    ['goldenHarvest',    1.50],
    ['marketEye',        1.75],
    ['merchantTouch',    2.20],
    ['marketMastery',    2.80],
    ['marketPinnacle',   3.50],
    ['goldenEmpire',     5.00],
    ['diamondTrade',     7.00],
    ['platinumExchange', 10.00],
    ['celestialMarket',  15.00],
    ['infiniteHarvest',  21.00],
    ['godlyYield',       36.00],
  ];
  let sellValue = 1;
  for (const [id, val] of VALUE_TIERS) { if (bought[id]) sellValue = val; }
  mods.sellValue = sellValue * (1 + 0.20 * (prestige.goldenMemory || 0));

  // ── sellInterval: highest tier (lowest multiplier) wins, then prestige ─────
  const SELL_SPEED_TIERS = [
    ['swiftMarketI',    0.75],
    ['swiftMarketII',   0.65],
    ['swiftMarketIII',  0.55],
    ['swiftMarketIV',   0.45],
    ['swiftMarketV',    0.35],
    ['swiftMarketVI',   0.28],
    ['swiftMarketVII',  0.22],
    ['swiftMarketVIII', 0.17],
    ['swiftMarketIX',   0.13],
    ['swiftMarketX',    0.10],
  ];
  let sellSpeedMult = 1;
  for (const [id, val] of SELL_SPEED_TIERS) { if (bought[id]) sellSpeedMult = val; }
  // Swift Return: each stack shaves 10% off the interval (additive, no floor).
  const swiftReturnFactor = 1 - 0.10 * (prestige.swiftReturn || 0);
  mods.sellInterval = 10000 * sellSpeedMult * swiftReturnFactor;

  // ── sellBoxCapacity ────────────────────────────────────────────────────────
  if      (bought.diamondSellBox)   mods.sellBoxCapacity = 8;
  else if (bought.titaniumSellBox)  mods.sellBoxCapacity = 5;
  else if (bought.steelSellBox)     mods.sellBoxCapacity = 3;
  else if (bought.ironSellBox)      mods.sellBoxCapacity = 2;
  else                              mods.sellBoxCapacity = 1;

  // ── crankClickMultiplier: per-click boost factor ───────────────────────────
  // (crankMultiplier = runtime accumulated value; managed separately by crank logic)
  if      (bought.diamondCrank)   mods.crankClickMultiplier = 1.085;
  else if (bought.titaniumCrank)  mods.crankClickMultiplier = 1.060;
  else if (bought.steelCrank)     mods.crankClickMultiplier = 1.040;
  else if (bought.ironCrank)      mods.crankClickMultiplier = 1.025;
  else                            mods.crankClickMultiplier = 1.015;

  // ── eventResistance: additive resistance per event type ───────────────────
  // hawkNet and herbicideII are flag-only (reduce quantity/spread, not spawn chance).
  const gh  = bought.ironGreenhouse  ? 0.20 : 0;  // global all-event reduction
  const tsk = 0.05 * (prestige.thickSkin || 0);   // per prestige stack
  mods.eventResistance = {
    crow:        (bought.scarecrowCoat  ? 0.30 : 0) + gh + tsk,
    hawk:                                              gh + tsk,
    mole:        (bought.groundMesh     ? 0.40 : 0) + gh + tsk,
    thornedWeed: (bought.herbicideI     ? 0.25 : 0) + gh + tsk,
    rot:         (bought.soilTreatment  ? 0.40 : 0) + gh + tsk,
    locust:      (bought.locustWard     ? 0.50 : 0) + gh + tsk,
    blight:      (bought.weathervane    ? 0.40 : 0) + gh + tsk,
    fungal:      (bought.antifungalSpray? 0.50 : 0) + gh + tsk,
  };

  TimerManager.restart('sell');
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
