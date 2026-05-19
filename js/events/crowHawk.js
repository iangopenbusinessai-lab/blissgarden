// ── CROW ──────────────────────────────────────────────────────────────────
function crowTick() {
  if (!state.mature) return;
  const stage = getCurrentStage().stage;
  if (stage >= 3) return;
  const chance = (stage >= 2 ? 0.08 : 0.05)
    * (state.upgrades.scarecrowCoat  ? 0.70 : 1)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) crowAttack();
}

function crowAttack() {
  const cageBlock = state.upgrades.scarecrowCoat ? Math.min(1, 0.75 + 0.30) : 0.75;
  let target = null;
  if (state.loose.length > 0) {
    const sorted = [...state.loose].sort((a,b) => SEEDS[b.seed].sell - SEEDS[a.seed].sell);
    target = { type:'loose', item: sorted[0] };
  }
  if (!target) {
    const cands = [];
    for (let i = 0; i < tileCount(); i++) {
      if (!state.tiles[i] || !isReady(state.tiles[i], i)) continue;
      if (state.cages.includes(i) && Math.random() < cageBlock) continue;
      cands.push(i);
    }
    if (cands.length) target = { type:'tile', idx: cands[Math.floor(Math.random()*cands.length)] };
  }
  if (!target) {
    const cands = [];
    for (let i = 0; i < tileCount(); i++) {
      if (!state.tiles[i] || isReady(state.tiles[i], i)) continue;
      if (state.cages.includes(i) && Math.random() < cageBlock) continue;
      cands.push(i);
    }
    if (cands.length) target = { type:'tile', idx: cands[Math.floor(Math.random()*cands.length)] };
  }
  if (!target) return;
  STATE.session.debugCounts.crow++;

  if (!state.firstCrowEver) {
    state.firstCrowEver = true;
    showBanner('🐦‍⬛ A crow has found your farm.');
  }

  let cropName;
  if (target.type === 'loose') {
    cropName = SEEDS[target.item.seed].name;
    const i = state.loose.findIndex(l => l.id === target.item.id);
    if (i !== -1) state.loose.splice(i, 1);
    renderLoose();
  } else {
    cropName = SEEDS[state.tiles[target.idx].seed].name;
    state.tiles[target.idx] = null;
    if (state.tilesWatered) delete state.tilesWatered[target.idx];
    if (state.rotTiles)     delete state.rotTiles[target.idx];
    RenderFarm.renderTile(target.idx);
  }
  sfx.attack();
  state.stats.crowsSurvived = (state.stats.crowsSurvived || 0) + 1;
  if (typeof checkAchievements === 'function') checkAchievements();
  log(`🐦 A crow snatched a ${cropName}!`);
  animateCrow();
  save();
}

function animateCrow() {
  const el = mk('div','crow-anim');
  el.textContent = '🐦‍⬛';
  el.style.top = (15 + Math.random() * 55) + 'vh';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 3200);
}

// ── HAWK ──────────────────────────────────────────────────────────────────
function hawkTick() {
  if (!state.mature || getCurrentStage().stage < 2) return;
  const chance = (getCurrentStage().stage >= 3 ? 0.06 : 0.05)
    * (state.upgrades.ironGreenhouse ? 0.80 : 1);
  if (Math.random() < chance) hawkAttack();
}

function hawkAttack() {
  const targets = [];
  state.loose.forEach(item => targets.push({ type:'loose', item, val: SEEDS[item.seed].sell }));
  for (let i = 0; i < tileCount(); i++) {
    if (!state.tiles[i] || !isReady(state.tiles[i], i)) continue;
    if (state.cages.includes(i) && Math.random() < 0.40) continue;
    targets.push({ type:'tile', idx:i, val: SEEDS[state.tiles[i].seed].sell });
  }
  for (let i = 0; i < tileCount(); i++) {
    if (!state.tiles[i] || isReady(state.tiles[i], i)) continue;
    if (state.cages.includes(i) && Math.random() < 0.40) continue;
    targets.push({ type:'tile', idx:i, val: SEEDS[state.tiles[i].seed].sell });
  }
  targets.sort((a, b) => b.val - a.val);
  const toSteal = targets.slice(0, state.upgrades.hawkNet ? 1 : 2);
  if (!toSteal.length) return;

  if (!state.firstHawkEver) {
    state.firstHawkEver = true;
    showBanner('🦅 A hawk circles your farm!');
  }

  let stolen = 0;
  toSteal.forEach(t => {
    if (t.type === 'loose') {
      const i = state.loose.findIndex(l => l.id === t.item.id);
      if (i !== -1) { log(`🦅 A hawk snatched a ${SEEDS[t.item.seed].name}!`); state.loose.splice(i, 1); stolen++; }
    } else {
      if (state.tiles[t.idx]) {
        log(`🦅 A hawk snatched a ${SEEDS[state.tiles[t.idx].seed].name}!`);
        state.tiles[t.idx] = null;
        if (state.tilesWatered) delete state.tilesWatered[t.idx];
        if (state.rotTiles)     delete state.rotTiles[t.idx];
        RenderFarm.renderTile(t.idx); stolen++;
      }
    }
  });
  if (stolen > 0) {
    STATE.session.debugCounts.hawk++;
    sfx.attack();
    state.stats.crowsSurvived = (state.stats.crowsSurvived || 0) + 1;
    if (typeof checkAchievements === 'function') checkAchievements();
    renderLoose(); animateHawk(); save();
  }
}

function animateHawk() {
  const el = mk('div','hawk-anim');
  el.textContent = '🦅';
  el.style.top = (10 + Math.random() * 50) + 'vh';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 2200);
}
