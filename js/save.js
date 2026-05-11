const SAVE_VERSION = 1;
const SAVE_KEY = 'blissFarm_v1';
const OLD_KEY  = 'littleFarm';

let lastSavedHash = null;

function save() {
  const serialized = JSON.stringify({
    version:   SAVE_VERSION,
    meta:      STATE.meta,
    plots:     STATE.plots,
    sellQueue: STATE.sellQueue,
    inventory: STATE.inventory,
    upgrades:  STATE.upgrades,
    settings:  STATE.settings,
    milestones:STATE.milestones,
  });
  if (serialized === lastSavedHash) return;
  try {
    localStorage.setItem(SAVE_KEY, serialized);
    lastSavedHash = serialized;
  } catch (e) {
    console.error('save: localStorage write failed', e);
  }
}

function load() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    console.error('load: localStorage read failed', e);
    return;
  }

  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('load: save data corrupted, starting fresh', e);
    return;
  }

  try {
    const d = migrate(data);
    if (!d) return;

    const m = d.meta ?? {};
    STATE.meta.gold          = m.gold          ?? 10;
    STATE.meta.allTimeGold   = m.allTimeGold   ?? 0;
    STATE.meta.gameStartTime = m.gameStartTime ?? Date.now();
    STATE.meta.stage         = m.stage         ?? 0;
    STATE.meta.matureState   = m.matureState   ?? false;

    STATE.plots     = d.plots     ?? Array(9).fill(null);
    STATE.sellQueue = (d.sellQueue ?? []).map(normalizeQueueItem);
    STATE.inventory = {
      seeds: d.inventory?.seeds ?? {},
      crops: d.inventory?.crops ?? {},
      items: d.inventory?.items ?? {},
    };
    STATE.upgrades  = d.upgrades  ?? {};
    STATE.milestones= d.milestones?? {};

    const s = d.settings ?? {};
    STATE.settings.muted        = s.muted        ?? false;
    STATE.settings.hidePurchased= s.hidePurchased ?? false;
  } catch (e) {
    console.error('load: failed to apply save data, starting fresh', e);
  }
}

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
