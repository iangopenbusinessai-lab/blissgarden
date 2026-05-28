// ══════════════════════════════════════════════════════════════════════════
// PRESTIGE
// ══════════════════════════════════════════════════════════════════════════

function getPrestigePointsEarned() {
  const gold = state.coinsEarned || 0;
  if (gold < 1000) return 0;
  return Math.max(1, Math.floor(Math.log10(gold)) - 3);
}

function canPrestige() {
  if ((getCurrentStage().stage || 0) < 2)
    return { can: false, reason: 'Reach Stage 2 + 500k coins' };
  if ((state.coinsEarned || 0) < 500000)
    return { can: false, reason: 'Reach Stage 2 + 500k coins' };
  return { can: true, reason: '' };
}

function prestige() {
  const check = canPrestige();
  if (!check.can) return;

  const points = getPrestigePointsEarned();
  const pr = STATE.prestige;

  // ── Accumulate prestige state ─────────────────────────────────────────────
  pr.totalGoldEarned = (pr.totalGoldEarned || 0) + (state.coinsEarned || 0);
  pr.points          = (pr.points || 0) + points;
  pr.spent           = pr.spent || 0;
  pr.count           = (pr.count || 0) + 1;
  pr.highestStage    = Math.max(pr.highestStage || 0, getCurrentStage().stage || 0);
  STATE.stats        = STATE.stats || {};
  state.stats.prestigeCount = pr.count;

  // ── Apply extraPlot flags BEFORE tileCount() ──────────────────────────────
  const extraPlots     = pr.perks.extraPlot || 0;
  state.expanded       = extraPlots >= 1;
  state.expandedBottom = extraPlots >= 2;
  state.expand2ndCol   = extraPlots >= 3;
  state.expand2ndRow   = extraPlots >= 4;
  state.expand3rdCol   = extraPlots >= 5;
  state.expand3rdRow   = extraPlots >= 6;

  // ── Reset STATE.meta ──────────────────────────────────────────────────────
  STATE.meta.gold        = 10;
  STATE.meta.allTimeGold = 0;
  STATE.meta.stage       = 0;
  STATE.meta.matureState = false;

  // ── Reset flat state ──────────────────────────────────────────────────────
  state.coins                   = 10;
  state.coinsEarned             = 0;
  state.mature                  = false;
  state.tiles                   = Array(tileCount()).fill(null);
  state.inventory               = {};
  state.seedInventory           = {};
  state.bagInventory            = {};
  state.craftedInventory        = {};
  state.sellQueue               = [];
  state.sellNextAt              = 0;
  state.loose                   = [];
  state.upgrades                = {};
  state.milestones              = {};
  state.stagesSeen              = {};
  state.weeds                   = {};
  state.thornedWeeds            = {};
  state.mounds                  = {};
  state.rotTiles                = {};
  state.fungalTiles             = {};
  state.fertilizedTiles         = {};
  state.uncommonFertilizedTiles = {};
  state.tilesWatered            = {};
  state.cages                   = [];
  state.cageCount               = 0;
  state.canCharges              = 0;
  state.canRefillAt             = 0;
  state.fertCharges             = 0;
  state.uncommonFertCharges     = 0;
  state.items                   = {};
  state.firstWeedEver           = false;
  state.firstCrowEver           = false;
  state.firstHawkEver           = false;
  state.firstMoleEver           = false;
  state.firstThornedEver        = false;
  state.firstRotEver            = false;
  state.firstLocustEver         = false;
  state.firstBlightEver         = false;
  state.firstFungalEver         = false;
  state.claimedTiles            = {};
  state.diseasedTiles           = {};
  state.firstDeveloperEver      = false;
  state.firstRatEver            = false;
  state.firstAcidRainEver       = false;
  state.voidRifts               = {};
  state.firstVoidRiftEver       = false;
  state.firstCosmicCrowEver     = false;
  state.firstRealityStormEver   = false;

  // ── Reset STATE.events ────────────────────────────────────────────────────
  STATE.events = {
    firstCrow: false, firstWeed: false, firstHawk: false, firstMole: false,
    firstRot: false, firstLocust: false, firstBlight: false, firstFungal: false,
  };

  // ── Re-share upgrades reference ───────────────────────────────────────────
  STATE.upgrades = state.upgrades;

  // ── Reset sell/crank session ──────────────────────────────────────────────
  STATE.session.sellElapsed    = 0;
  STATE.session.crankMultiplier = 1.0;
  crankMult = 1.0;

  // ── Apply headStart ───────────────────────────────────────────────────────
  const bonus = (pr.perks.headStart || 0) * 500;
  state.coins     = 10 + bonus;
  STATE.meta.gold = state.coins;

  recalculateModifiers();

  // ── Reset per-tile ready cache ────────────────────────────────────────────
  const tc = tileCount();
  for (let i = 0; i < tc; i++) prevReadyState[i] = false;

  save();

  const pLabel = points === 1 ? 'point' : 'points';
  EventBus.emit('prestige:reset', { count: pr.count, pointsEarned: points });
  showBanner(`✨ Prestige ${pr.count} — The farm is reborn. +${points} ${pLabel} earned.`);
  log(`✨ Prestige ${pr.count} complete. Earned ${points} prestige ${pLabel}.`);
}

function buyPerk(perkId) {
  const perk = (window.PRESTIGE_PERKS || []).find(p => p.id === perkId);
  if (!perk) return;
  const pr      = STATE.prestige;
  const current = pr.perks[perkId] || 0;
  if (current >= perk.maxStack) return;
  if ((pr.points || 0) < perk.cost) return;
  pr.points -= perk.cost;
  pr.spent   = (pr.spent || 0) + perk.cost;
  pr.perks[perkId] = current + 1;
  recalculateModifiers();
  save();
  DIRTY.panel = true;
  if (typeof RenderPanel !== 'undefined') RenderPanel.renderPrestige();
}
