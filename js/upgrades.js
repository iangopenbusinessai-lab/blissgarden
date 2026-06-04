// ══════════════════════════════
// MULTIPLIERS & TILE MODIFIERS
// ══════════════════════════════
function waterFactor(idx) {
  return (idx !== undefined && STATE.plots[idx] && STATE.plots[idx].watered) ? 0.75 : 1.0;
}
function fertFactor(idx) {
  let f = 1.0;
  if (idx !== undefined && STATE.plots[idx]) {
    if (STATE.plots[idx].fertilized)         f *= 0.75;
    if (STATE.plots[idx].uncommonFertilized)  f *= 0.60;
  }
  return f;
}
function rotFactor(idx) {
  const rot = idx !== undefined && STATE.plots[idx] && STATE.plots[idx].rotInfected;
  if (rot && rot.infectedAt !== undefined && rot.deadAt === undefined) return 1 / 0.30;
  return 1.0;
}
// Returns the total effective speed multiplier for a growing crop.
// growSpeed is treated as a speed factor (higher = faster accumulation of burnedSeconds).
// Tile factors (water, fert, rot) convert time-mults to speed contributions.
function getEffectiveSpeedMult(seedId, idx) {
  const gs       = STATE.modifiers.growSpeed    || 1;
  const season   = STATE.modifiers.seasonGrowMult || 1;
  const dayNight = window.RenderEnv?.getDayNightMult?.(seedId) ?? 1.0;
  let tile = 1.0;
  if (idx !== undefined) {
    if (state.tilesWatered?.[idx])            tile /= 0.75;
    if (state.fertilizedTiles?.[idx])         tile /= 0.75;
    if (state.uncommonFertilizedTiles?.[idx]) tile /= 0.60;
    const rot = state.rotTiles?.[idx];
    if (rot?.infectedAt !== undefined && rot?.deadAt === undefined) tile *= 0.30;
  }
  let weather = 1.0;
  const now = Date.now();
  if (STATE.session.droughtEndsAt && now < STATE.session.droughtEndsAt) weather *= 0.75;
  if (STATE.session.rainEndsAt    && now < STATE.session.rainEndsAt)    weather *= 1.20;
  return gs * season * dayNight * tile * weather;
}

// Alias used by farm.js (which references getGrowMult but it was never defined).
function getGrowMult() { return STATE.modifiers.growSpeed || 1; }

// Remaining real seconds until crop is ready, based on burnedSeconds progress.
function remSec(td, idx) {
  const base   = SEEDS[td.seed].grow;
  const burned = td.burnedSeconds ?? 0;
  if (burned >= base) return 0;
  return (base - burned) / getEffectiveSpeedMult(td.seed, idx);
}

// isReady uses burnedSeconds so day/night shifts don't undo accumulated progress.
function isReady(td, idx) {
  return (td.burnedSeconds ?? 0) >= SEEDS[td.seed].grow;
}

function getSellInterval()   { return STATE.modifiers.sellInterval / crankMult; }
function canCapacity()       { return STATE.upgrades.copperSpout ? 2 : 1; }
function canFillTime()       { return STATE.upgrades.copperSpout ? 8000 : 20000; }
function getCrankClickMult() { return STATE.modifiers.crankClickMultiplier; }
function getSellAtOnce()     { return STATE.modifiers.sellBoxCapacity; }

function adjustGrowTimes(oldMult, newMult) {
  const now = Date.now();
  for (let i = 0; i < tileCount(); i++) {
    const td = STATE.plots[i];
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
    ['quickRoots',     1.15],
    ['fertilizerI',    1.30],
    ['fertilizerII',   1.50],
    ['fertilizerIII',  1.75],
    ['fertilizerIV',   2.10],
    ['fertilizerV',    2.60],
    ['fertilizerVI',   3.20],
    ['fertilizerVII',  4.00],
    ['fertilizerVIII', 5.00],
    ['fertilizerIX',   6.50],
    ['fertilizerX',    8.50],
  ];
  let growSpeed = 1;
  for (const [id, val] of SPEED_TIERS) { if (bought[id]) growSpeed = val; }
  mods.growSpeed = growSpeed * (1 + 0.25 * (prestige.fertileLegacy || 0));

  // ── sellValue: highest tier value wins, no stacking ───────────────────────
  const VALUE_TIERS = [
    ['goldenHarvest',    1.30],
    ['marketEye',        1.70],
    ['merchantTouch',    2.20],
    ['marketMastery',    3.00],
    ['marketPinnacle',   4.00],
    ['goldenEmpire',     5.50],
    ['diamondTrade',     7.50],
    ['platinumExchange', 10.00],
    ['celestialMarket',  14.00],
    ['infiniteHarvest',  20.00],
    ['godlyYield',       30.00],
  ];
  let sellValue = 1;
  for (const [id, val] of VALUE_TIERS) { if (bought[id]) sellValue = val; }
  mods.sellValue = sellValue * (1 + 0.30 * (prestige.goldenMemory || 0));

  // ── sellInterval: highest tier (lowest multiplier) wins, then prestige ─────
  const SELL_SPEED_TIERS = [
    ['swiftMarketI',    0.80],
    ['swiftMarketII',   0.65],
    ['swiftMarketIII',  0.52],
    ['swiftMarketIV',   0.42],
    ['swiftMarketV',    0.33],
    ['swiftMarketVI',   0.26],
    ['swiftMarketVII',  0.20],
    ['swiftMarketVIII', 0.15],
    ['swiftMarketIX',   0.11],
    ['swiftMarketX',    0.08],
  ];
  let sellSpeedMult = 1;
  for (const [id, val] of SELL_SPEED_TIERS) { if (bought[id]) sellSpeedMult = val; }
  // Swift Return: each stack shaves 15% off the interval (additive, no floor).
  const swiftReturnFactor = 1 - 0.15 * (prestige.swiftReturn || 0);
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
  const tsk = 0.08 * (prestige.thickSkin || 0);   // per prestige stack
  mods.eventResistance = {
    crow:        (bought.scarecrowCoat   ? 0.30 : 0) + gh + tsk,
    hawk:                                               gh + tsk,
    mole:        (bought.groundMesh      ? 0.40 : 0) + gh + tsk,
    thornedWeed: (bought.herbicideI      ? 0.25 : 0) + gh + tsk,
    rot:         (bought.soilTreatment   ? 0.40 : 0) + gh + tsk,
    locust:      (bought.locustWard      ? 0.50 : 0) + gh + tsk,
    blight:      (bought.weathervane     ? 0.40 : 0) + gh + tsk,
    fungal:      (bought.antifungalSpray ? 0.50 : 0) + gh + tsk,
    developer:   (bought.developerBribe  ? 0.50 : 0) + gh + tsk,
    plagueRat:   (bought.ratPoison       ? 0.50 : 0) + gh + tsk,
    cosmicCrow:  (bought.cosmicRepellent ? 0.35 : 0),
  };

  // ── craftSpeedMult: highest tier wins ────────────────────────────────────
  if      (bought.masterWorkshop)  mods.craftSpeedMult = 1.60;
  else if (bought.journeymanForge) mods.craftSpeedMult = 1.40;
  else if (bought.apprenticeBench) mods.craftSpeedMult = 1.25;
  else                             mods.craftSpeedMult = 1.0;

  // ── craftSlots ────────────────────────────────────────────────────────────
  if      (bought.tripleCraftSlot) mods.craftSlots = 3;
  else if (bought.dualCraftSlot)   mods.craftSlots = 2;
  else                             mods.craftSlots = 1;

  TimerManager.restart('sell');
  if (typeof applyArtifacts === 'function') applyArtifacts();
  if (typeof Seasons !== 'undefined') Seasons.applySeasonEffects();
}

function applyUpgrade(id) {
  STATE.upgrades[id] = true;
  recalculateModifiers();
  EventBus.emit('upgrade:purchased', { id });
  save();
}
