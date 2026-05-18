// ══════════════════════════════
// ACHIEVEMENT CHECKER
// ══════════════════════════════
window.checkAchievements = function checkAchievements() {
  if (!window.ACHIEVEMENTS) return;
  if (!state.achievements) state.achievements = {};
  if (!state.stats) state.stats = {};
  const s = state;

  function stageReached(n) { return !!(s.stagesSeen && s.stagesSeen[n]); }

  const CONDITIONS = {
    // FARMING
    firstPlant:     () => (s.stats.totalPlanted     || 0) >= 1,
    firstHarvest:   () => (s.stats.totalHarvested   || 0) >= 1,
    harvest100:     () => (s.stats.totalHarvested   || 0) >= 100,
    harvest1000:    () => (s.stats.totalHarvested   || 0) >= 1000,
    harvest10000:   () => (s.stats.totalHarvested   || 0) >= 10000,
    allBasicSeeds:  () => (window.BASIC_SEEDS || []).every(k => s.stats.seedTypesPlanted && s.stats.seedTypesPlanted[k]),
    allSeeds:       () => Object.keys(window.SEEDS || {}).every(k => s.stats.seedTypesPlanted && s.stats.seedTypesPlanted[k]),
    fertilizeAll: () => {
      const tc = (typeof tileCount === 'function') ? tileCount() : 0;
      if (tc === 0) return false;
      let hasOccupied = false;
      for (let i = 0; i < tc; i++) {
        if (s.tiles[i]) {
          hasOccupied = true;
          if (!s.fertilizedTiles?.[i] && !s.uncommonFertilizedTiles?.[i]) return false;
        }
      }
      return hasOccupied;
    },
    // TRADING
    first100:       () => (s.coinsEarned || 0) >= 100,
    first1k:        () => (s.coinsEarned || 0) >= 1000,
    first10k:       () => (s.coinsEarned || 0) >= 10000,
    first100k:      () => (s.coinsEarned || 0) >= 100000,
    first1m:        () => (s.coinsEarned || 0) >= 1000000,
    first10m:       () => (s.coinsEarned || 0) >= 10000000,
    first1b:        () => (s.coinsEarned || 0) >= 1000000000,
    sellCrafted10:  () => (s.stats.craftedSold      || 0) >= 10,
    // SURVIVAL
    firstCrow:      () => (s.stats.crowsSurvived    || 0) >= 1,
    survive10Crows: () => (s.stats.crowsSurvived    || 0) >= 10,
    clearWeed:      () => (s.stats.weedsCleared     || 0) >= 1,
    clear50Weeds:   () => (s.stats.weedsCleared     || 0) >= 50,
    surviveLocust:  () => (s.stats.locustsSurvived  || 0) >= 1,
    cureRot:        () => (s.stats.rotCured         || 0) >= 1,
    surviveStage3:  () => (s.stats.blightsSurvived  || 0) >= 1 && stageReached(3),
    // CRAFTING
    firstCraft:     () => (s.stats.totalCrafted     || 0) >= 1,
    craft10:        () => (s.stats.totalCrafted     || 0) >= 10,
    craft100:       () => (s.stats.totalCrafted     || 0) >= 100,
    craftAll:       () => (window.RECIPES || []).every(r => s.stats.recipesEverCrafted && s.stats.recipesEverCrafted[r.id]),
    // PRESTIGE
    firstPrestige:  () => (s.stats.prestigeCount    || 0) >= 1,
    prestige5:      () => (s.stats.prestigeCount    || 0) >= 5,
    prestige10:     () => (s.stats.prestigeCount    || 0) >= 10,
    // EXPLORATION
    stage1:         () => stageReached(1),
    stage2:         () => stageReached(2),
    stage3:         () => stageReached(3),
    stage4:         () => stageReached(4),
    stage5:         () => stageReached(5),
    expandPlot:     () => !!(s.expanded),
    buyBag:         () => (s.stats.bagsBought       || 0) >= 1,
  };

  let anyNew = false;
  for (const ach of window.ACHIEVEMENTS) {
    if (s.achievements[ach.id]) continue;
    const checker = CONDITIONS[ach.id];
    if (!checker) continue;
    if (checker()) {
      s.achievements[ach.id] = { unlockedAt: Date.now() };
      anyNew = true;
      EventBus.emit('achievement:unlocked', { id: ach.id });
    }
  }

  if (anyNew) {
    save();
    if (typeof RenderPanel !== 'undefined' && RenderPanel.renderAchievements) {
      RenderPanel.renderAchievements();
    }
  }
};

// ══════════════════════════════
// ACHIEVEMENT TOAST
// ══════════════════════════════
(function () {
  const queue = [];
  let showing = false;

  function showNext() {
    if (!queue.length) { showing = false; return; }
    showing = true;
    const { id } = queue.shift();
    const ach = (window.ACHIEVEMENTS || []).find(a => a.id === id);
    if (!ach) { showNext(); return; }

    const toast = document.createElement('div');
    toast.className = 'ach-toast';
    const stars = '⭐'.repeat(ach.stars);
    toast.innerHTML =
      `<span class="ach-toast-stars">${stars}</span>` +
      `<div class="ach-toast-body"><div class="ach-toast-label">Achievement Unlocked</div>` +
      `<div class="ach-toast-name">${ach.name}</div></div>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('ach-toast-in'));

    const outTimer = setTimeout(() => {
      toast.classList.add('ach-toast-out');
      toast.addEventListener('animationend', () => { toast.remove(); showNext(); }, { once: true });
    }, 3000);
    toast.dataset.timer = outTimer;
  }

  EventBus.on('achievement:unlocked', ({ id }) => {
    queue.push({ id });
    if (!showing) showNext();
  });
}());
