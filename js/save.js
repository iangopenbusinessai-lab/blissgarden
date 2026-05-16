// ── ACTIVE SAVE KEY (flat state) ─────────────────────────────────────────
const KEY     = 'blissfarm10';
const KEY_OLD = 'blissfarm9';

window.save = function save() {
  localStorage.setItem(KEY, JSON.stringify({ ...state, nextId, panelExpanded, panelWidth, debugMode: STATE.settings.debugMode }));
};

window.load = function load() {
  try {
    let raw = localStorage.getItem(KEY);
    if (!raw) raw = localStorage.getItem(KEY_OLD);
    const d = JSON.parse(raw || 'null');
    if (!d) return;
    state.coins           = d.coins           ?? 10;
    state.coinsEarned     = d.coinsEarned     ?? 0;
    state.gameStartTime   = d.gameStartTime   ?? Date.now();
    state.milestones      = d.milestones      ?? {};
    state.stagesSeen      = d.stagesSeen      ?? {};
    state.mature          = d.mature          ?? false;
    state.tiles           = d.tiles           ?? Array(9).fill(null);
    state.inventory       = d.inventory       ?? {};
    state.seedInventory   = d.seedInventory   ?? {};
    state.bagInventory    = d.bagInventory    ?? {};
    state.sellQueue       = (d.sellQueue || []).map(item =>
      typeof item === 'string'
        ? { seed: item, bonus: 1, drowned: false, fungal: false }
        : { seed: item.seed, bonus: item.bonus ?? 1, drowned: item.drowned ?? false, fungal: item.fungal ?? false });
    state.sellNextAt              = d.sellNextAt              ?? 0;
    state.upgrades                = d.upgrades                ?? {};
    if (state.upgrades.crankUpI && !state.upgrades.ironCrank) state.upgrades.ironCrank = true;
    STATE.upgrades                = state.upgrades;
    state.loose           = (d.loose || []).map(item => ({
      seed: item.seed, id: item.id, x: item.x, y: item.y,
      bonus: item.bonus ?? 1.0, drowned: item.drowned ?? false, fungal: item.fungal ?? false }));
    state.expanded        = d.expanded        ?? false;
    state.expandedBottom  = d.expandedBottom  ?? false;
    state.expand2ndCol    = d.expand2ndCol    ?? false;
    state.expand2ndRow    = d.expand2ndRow    ?? false;
    state.expand3rdCol    = d.expand3rdCol    ?? false;
    state.expand3rdRow    = d.expand3rdRow    ?? false;
    state.items           = d.items           ?? {};
    state.cageCount       = d.cageCount       ?? 0;
    state.cages           = d.cages           ?? [];
    state.canCharges      = d.canCharges  ?? (d.wellFull ? 1 : 0);
    state.canRefillAt     = d.canRefillAt ?? ((!d.wellFull && d.wellRefillAt) ? d.wellRefillAt : 0);
    state.tilesWatered            = d.tilesWatered            ?? {};
    state.fertCharges             = d.fertCharges             ?? 0;
    state.uncommonFertCharges     = d.uncommonFertCharges     ?? 0;
    state.weeds                   = d.weeds                   ?? {};
    state.fertilizedTiles         = d.fertilizedTiles         ?? {};
    state.uncommonFertilizedTiles = d.uncommonFertilizedTiles ?? {};
    state.firstWeedEver           = d.firstWeedEver           ?? false;
    state.firstCrowEver           = d.firstCrowEver           ?? false;
    state.firstHawkEver           = d.firstHawkEver           ?? false;
    state.firstMoleEver           = d.firstMoleEver           ?? false;
    state.firstThornedEver        = d.firstThornedEver        ?? false;
    state.thornedWeeds            = d.thornedWeeds            ?? {};
    state.mounds                  = d.mounds                  ?? {};
    state.rotTiles                = d.rotTiles                ?? {};
    state.firstRotEver            = d.firstRotEver            ?? false;
    state.firstLocustEver         = d.firstLocustEver         ?? false;
    state.firstBlightEver         = d.firstBlightEver         ?? false;
    state.fungalTiles             = d.fungalTiles             ?? {};
    state.firstFungalEver         = d.firstFungalEver         ?? false;
    state.hideBoughtUpgrades      = d.hideBoughtUpgrades      ?? false;
    STATE.settings.debugMode      = d.debugMode               ?? false;
    nextId        = d.nextId        ?? 0;
    panelExpanded = d.panelExpanded ?? true;
    panelWidth    = d.panelWidth    ?? 220;
  } catch (_) {}
};

// ── LEGACY SAVE CONSTANTS (kept for migrate() below) ─────────────────────
const SAVE_VERSION = 1;
const SAVE_KEY = 'blissFarm_v1';
const OLD_KEY  = 'littleFarm';

function migrate(data) {
  if (data && (data.version ?? 0) >= SAVE_VERSION) return data;

  // No new-format save — try to port an old flat save
  let old = null;
  try {
    const raw = localStorage.getItem(OLD_KEY);
    old = raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('migrate: failed to read old save', e);
  }

  if (!old) return data; // nothing to migrate; return whatever we had (null = fresh start)

  // Derive stage from allTimeGold
  const allTimeGold = old.coinsEarned ?? 0;
  let stage = 0;
  for (const s of (window.STAGES ?? [])) {
    if (allTimeGold >= s.threshold) stage = s.stage;
  }

  // Normalise sell queue entries (old format used plain strings)
  const sellQueue = (old.sellQueue ?? []).map(normalizeQueueItem);

  // Map old flat inventory shape to new nested shape
  const seeds = {};
  const crops = {};
  const items = {};

  // old.seedInventory: { potato:2, ... }
  Object.assign(seeds, old.seedInventory ?? {});

  // old.inventory: { potato:1, ... } (harvested crops)
  Object.assign(crops, old.inventory ?? {});

  // old.items: { wateringCan:true } — convert booleans to 1
  for (const [k, v] of Object.entries(old.items ?? {})) {
    if (v) items[k] = 1;
  }
  // old stackable counts
  if (old.cageCount)              items.cage          = old.cageCount;
  if (old.fertCharges)            items.fertilizer    = old.fertCharges;
  if (old.uncommonFertCharges)    items.uncommonFert  = old.uncommonFertCharges;

  const upgrades = { ...(old.upgrades ?? {}) };
  // Backfill a known rename
  if (upgrades.crankUpI && !upgrades.ironCrank) upgrades.ironCrank = true;

  return {
    version:   SAVE_VERSION,
    meta: {
      gold:          old.coins          ?? 10,
      allTimeGold,
      gameStartTime: old.gameStartTime  ?? Date.now(),
      stage,
      matureState:   old.mature         ?? false,
      lastSeen:      null,
    },
    plots:      old.tiles     ?? Array(9).fill(null),
    sellQueue,
    inventory:  { seeds, crops, items },
    upgrades,
    settings: {
      muted:         false,
      hidePurchased: old.hideBoughtUpgrades ?? false,
    },
    milestones: old.milestones ?? {},
  };
}

function normalizeQueueItem(item) {
  if (typeof item === 'string') return { seed:item, bonus:1, drowned:false, fungal:false };
  return {
    seed:    item.seed,
    bonus:   item.bonus   ?? 1,
    drowned: item.drowned ?? false,
    fungal:  item.fungal  ?? false,
  };
}
