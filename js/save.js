// ── FLAT GAME STATE ──
var state = {
  coins: 10, coinsEarned: 0, gameStartTime: Date.now(),
  milestones: {}, stagesSeen: {}, mature: false,
  tiles: Array(9).fill(null),
  inventory: {}, seedInventory: {}, bagInventory: {},
  sellQueue: [], sellNextAt: 0,
  upgrades: {}, loose: [],
  expanded: false, expandedBottom: false,
  expand2ndCol: false, expand2ndRow: false,
  expand3rdCol: false, expand3rdRow: false,
  items: {}, cageCount: 0, cages: [],
  canCharges: 0, canRefillAt: 0, tilesWatered: {},
  fertCharges: 0, uncommonFertCharges: 0,
  weeds: {}, fertilizedTiles: {}, uncommonFertilizedTiles: {},
  firstWeedEver: false, firstCrowEver: false, firstHawkEver: false,
  firstMoleEver: false, firstThornedEver: false,
  thornedWeeds: {}, mounds: {}, rotTiles: {},
  firstRotEver: false, firstLocustEver: false, firstBlightEver: false,
  fungalTiles: {}, firstFungalEver: false,
  hideBoughtUpgrades: false,
};

var nextId = 0, selectedTile = null;
var crankMult = 1.0, crankAngle = 0;

const KEY     = 'blissfarm10';
const KEY_OLD = 'blissfarm9';

window.save = function save() {
  state.lastSeen = Date.now();
  localStorage.setItem(KEY, JSON.stringify({ ...state, nextId, panelExpanded, panelWidth }));
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
    nextId        = d.nextId        ?? 0;
    panelExpanded = d.panelExpanded ?? true;
    panelWidth    = d.panelWidth    ?? 220;
    const _savedLastSeen = d.lastSeen ?? null;
    state.lastSeen = _savedLastSeen ?? Date.now();
    if (_savedLastSeen) {
      const _elapsed = Date.now() - _savedLastSeen;
      if (_elapsed > 60000) _applyOfflineProgress(_elapsed, _savedLastSeen);
    }
  } catch (_) {}
};

function _applyOfflineProgress(elapsedMs, lastSeenTs) {
  const MAX_OFFLINE_MS = 8 * 3600 * 1000;
  const capped    = Math.min(elapsedMs, MAX_OFFLINE_MS);
  const now       = Date.now();
  const growMult  = getGrowMult();
  const sellMult  = getSellMult();
  const sellIntvl = 10000 * getSellSpeedMult();
  const atOnce    = getSellAtOnce();

  let cropsFinished = 0;
  state.tiles.forEach((td, idx) => {
    if (!td || !td.seed) return;
    const sd = SEEDS[td.seed]; if (!sd) return;
    const growMs = sd.grow * growMult * waterFactor(idx) * fertFactor(idx) * rotFactor(idx) * 1000;
    const wasRdy = (lastSeenTs - td.plantedAt) >= growMs;
    const isRdy  = (now        - td.plantedAt) >= growMs;
    if (!wasRdy && isRdy) cropsFinished++;
  });

  let coinsEarned = 0;
  const queue = state.sellQueue.length > 0 ? [...state.sellQueue] : [];
  if (queue.length > 0 && sellIntvl > 0) {
    let ticks = Math.floor(capped / sellIntvl);
    while (ticks > 0 && queue.length > 0) {
      for (let s = 0; s < atOnce && queue.length > 0; s++) {
        const item = queue.shift();
        const sd = SEEDS[item.seed]; if (!sd || item.fungal) continue;
        coinsEarned += item.drowned
          ? Math.round(sd.sell * (item.bonus || 1))
          : Math.round(sd.sell * sellMult * (item.bonus || 1));
      }
      ticks--;
    }
    state.sellQueue = queue;
    state.sellNextAt = queue.length ? now + sellIntvl : 0;
  }

  const prevEarned = state.coinsEarned || 0;
  if (coinsEarned > 0) {
    state.coins       = (state.coins       || 0) + coinsEarned;
    state.coinsEarned = prevEarned + coinsEarned;
  }

  const stagesHit = [];
  STAGES.forEach(s => {
    if (s.stage === 0) return;
    if (state.coinsEarned >= s.threshold && prevEarned < s.threshold && !state.stagesSeen[s.stage]) {
      state.stagesSeen[s.stage] = true;
      stagesHit.push(s);
    }
  });

  const milestonesHit = [];
  MILESTONE_VALS.forEach(m => {
    if (state.coinsEarned >= m && prevEarned < m && !state.milestones[m]) {
      state.milestones[m] = true;
      milestonesHit.push(m);
    }
  });

  if (!state.mature && state.coinsEarned >= 1000) state.mature = true;

  crankMult = 1.0;

  setTimeout(() => {
    if (typeof log === 'function') {
      const h  = Math.floor(elapsedMs / 3600000);
      const mn = Math.floor((elapsedMs % 3600000) / 60000);
      const t  = h > 0 ? `${h}h ${mn}m` : `${mn}m`;
      const goldPart = coinsEarned > 0 ? ` Earned ${coinHTML()}${coinsEarned.toLocaleString()} while away.` : '';
      log(`💤 Returned after ${t}.${goldPart}`);
      milestonesHit.forEach(m => log(`⏱️ Reached ${coinHTML()}${m.toLocaleString()} while you were away.`));
      stagesHit.forEach(s => { if (s.log) log(s.log); });
    }
    _showOfflineModal(elapsedMs, coinsEarned, cropsFinished, milestonesHit, stagesHit);
  }, 0);
}
