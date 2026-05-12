// ══════════════════════════════
// ALIASES & CONSTANTS
// ══════════════════════════════
window.SEED_BAGS = window.BAGS; // data.js exports BAGS; existing code uses SEED_BAGS

const ROW_MAP = {
  potato:0, carrot:1, wheat:2, sunflower:3, pumpkin:4, chard:5, moonbloom:6,
  starfruit:7, thornvine:8, glowshroom:9, voidbloom:10, aetherfern:11, solarspike:12,
}
const COL_MAP = { seed:0, sprout:1, grown:2 }

function getSpriteStyle(cropId, stage, size=64) {
  const row = ROW_MAP[cropId]
  const col = COL_MAP[stage]
  if (row === undefined || col === undefined) {
    console.error('getSpriteStyle: unknown cropId or stage', cropId, stage)
    return {}
  }
  return {
    backgroundImage:    "url('./sprites.png')",
    backgroundPosition: `${-(col*size)}px ${-(row*size)}px`,
    backgroundSize:     `${size*3}px ${size*13}px`,
    backgroundRepeat:   'no-repeat',
    width: size+'px', height: size+'px',
    imageRendering: 'pixelated',
    display: 'inline-block',
    flexShrink: '0',
  }
}

function makeSpriteDiv(cropId, stage, size=64) {
  const el = document.createElement('div')
  Object.assign(el.style, getSpriteStyle(cropId, stage, size))
  el.style.pointerEvents = 'none'
  return el
}

function spriteHTML(cropId, stage, size=64) {
  const row = ROW_MAP[cropId], col = COL_MAP[stage]
  if (row === undefined || col === undefined) {
    console.error('spriteHTML: unknown cropId or stage', cropId, stage)
    return ''
  }
  return `<span style="display:inline-block;width:${size}px;height:${size}px;background:url('./sprites.png') no-repeat ${-(col*size)}px ${-(row*size)}px/${size*3}px ${size*13}px;image-rendering:pixelated;vertical-align:middle;flex-shrink:0;pointer-events:none"></span>`
}

const ITEM_ICONS = { water:'💧', cage:'🔒', fertilizer:'🌿', uncommonFert:'⚗️' };
const MILESTONE_VALS = [100, 1000, 10000, 100000, 1000000];
const STAGES = [
  { stage:0, name:'Birth',         threshold:0,          log:null },
  { stage:1, name:'Awakening',     threshold:50000,       log:'🌱 The farm stirs with new life.' },
  { stage:2, name:'Flourishing',   threshold:500000,      log:'🌿 The land is truly alive.' },
  { stage:3, name:'Abundance',     threshold:5000000,     log:'🌾 Harvests overflow the barn.' },
  { stage:4, name:'Legacy',        threshold:50000000,    log:'🏡 This farm will be remembered.' },
  { stage:5, name:'Transcendence', threshold:500000000,   log:'✨ The farm has become something beyond nature.' },
];
const WEED_CLICKS = 20;
const THORNED_WEED_CLICKS = 50;

// ══════════════════════════════
// FLAT GAME STATE
// ══════════════════════════════
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

var nextId = 0, selectedTile = null, panelExpanded = true, panelWidth = 220;
var crankMult = 1.0, crankAngle = 0;
var prevReadyState = {};
var resizing = false, resizeStartX = 0, resizeStartW = 0, resizeMoved = false;

// ══════════════════════════════
// DOM HELPER
// ══════════════════════════════
function mk(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }
function tileEls() { return RenderFarm.tileNodes; }
function hit(x, y, el) { const r = el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; }
function coinHTML() { return '<span class="coin"></span>'; }

// ══════════════════════════════
// SAVE / LOAD (flat state, key blissfarm10)
// ══════════════════════════════
const KEY     = 'blissfarm10';
const KEY_OLD = 'blissfarm9';

window.save = function save() {
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
  } catch (_) {}
};

// ══════════════════════════════
// MULTIPLIERS / HELPERS
// ══════════════════════════════
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
function fmt(s) {
  if (s <= 0) return '0s';
  if (s < 1)  return s.toFixed(1) + 's';
  if (s < 60) return Math.ceil(s) + 's';
  if (s < 3600) { const m = Math.floor(s/60), sec = Math.ceil(s%60); return `${m}m${sec>0?' '+sec+'s':''}`; }
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60); return `${h}h${m>0?' '+m+'m':''}`;
}
function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
function getGridDims() {
  let cols = 3, rows = 3;
  if (state.expanded)       cols = 4;
  if (state.expandedBottom) rows = 4;
  if (state.expand2ndCol)   cols = 5;
  if (state.expand2ndRow)   rows = 5;
  if (state.expand3rdCol)   cols = 6;
  if (state.expand3rdRow)   rows = 6;
  return { cols, rows };
}
function tileCount() { const { cols, rows } = getGridDims(); return cols * rows; }

// ══════════════════════════════
// AUDIO SFX SHIM
// ══════════════════════════════
var sfx = {
  plant()        { Audio.playPlant(); },
  harvest()      { Audio.playHarvest(); },
  drop()         { Audio.playDrop(); },
  sell(v)        { Audio.playSell(v); },
  sellAuto()     { Audio.playAutoSell(); },
  attack()       { Audio.playCrow(); },
  weedClick()    { Audio.playWeedClick(); },
  upgrade()      { Audio.playUpgrade(); },
  stageAdvance() { Audio.playStage(); },
  locust()       { Audio.playLocust(); },
};

// ══════════════════════════════
// LOG & BANNER
// ══════════════════════════════
var logEntries = [];
function log(msg) {
  logEntries.push(msg);
  if (logEntries.length > 60) logEntries.shift();
  RenderHUD.renderLog(msg);
}

function showBanner(text) {
  const existing = document.querySelector('.world-banner');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'world-banner';
  el.textContent = text;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 4200);
}

// ══════════════════════════════
// COINS & STAGES
// ══════════════════════════════
function getCurrentStage() {
  let current = STAGES[0];
  for (const s of STAGES) { if ((state.coinsEarned || 0) >= s.threshold) current = s; }
  return current;
}

function checkMilestones() {
  MILESTONE_VALS.forEach(m => {
    if (state.coinsEarned >= m && !state.milestones[m]) {
      state.milestones[m] = true;
      log(`⏱️ Reached ${coinHTML()}${m.toLocaleString()} — ${fmtElapsed(Date.now() - state.gameStartTime)}`);
    }
  });
}

function checkStages() {
  for (const s of STAGES) {
    if (s.stage === 0) continue;
    if ((state.coinsEarned || 0) >= s.threshold && !state.stagesSeen[s.stage]) {
      state.stagesSeen[s.stage] = true;
      sfx.stageAdvance();
      showBanner(`Stage ${s.stage}: ${s.name}`);
      if (s.log) log(s.log);
      RenderHUD.renderStage();
      save();
    }
  }
}

function checkMaturity() {
  if (!state.mature && state.coinsEarned >= 1000) {
    state.mature = true;
    log('🌿 The farm has matured. Nature has taken notice...');
    showBanner('🌿 The farm has matured. Nature is watching.');
  }
}

function addCoins(amount) {
  state.coins += amount;
  state.coinsEarned = (state.coinsEarned || 0) + amount;
  checkMilestones();
  checkMaturity();
  checkStages();
  updateCoins();
}

function updateCoins() {
  RenderHUD.renderCoin();
  RenderPanel.renderUpgrades();
  RenderPanel.renderItems();
  RenderPanel.renderSeeds();
  RenderPanel.renderBags();
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

// ══════════════════════════════
// DRAG HELPERS
// ══════════════════════════════
Object.defineProperty(window, 'drag', {
  get() { return STATE.session.dragItem; },
  set(v) { STATE.session.dragItem = v; },
});

function startDrag(seed, source, bonus = 1.0, drowned = false, fungal = false) {
  deselect();
  DragSystem.start({ seed, source, bonus, drowned, fungal },
    makeSpriteDiv(seed, source === 'seedInventory' ? 'seed' : 'grown', 64));
}
function startItemDrag(itemType) {
  deselect();
  const sp = document.createElement('span');
  sp.style.cssText = 'font-size:38px;line-height:1;display:block;pointer-events:none';
  sp.textContent = ITEM_ICONS[itemType] || '❓';
  DragSystem.start({ itemType, source: 'item', seed: null, bonus: 1, drowned: false }, sp);
}
function endDrag() { DragSystem.end(); }
function moveGhost(x, y) {
  const g = document.getElementById('ghost');
  if (g) { g.style.left = x + 'px'; g.style.top = y + 'px'; }
}

// ══════════════════════════════
// WATER / DROWN
// ══════════════════════════════
function applyWater(idx) {
  const td = state.tiles[idx];
  if (!td || isReady(td, idx)) return;
  if (state.tilesWatered && state.tilesWatered[idx]) { drownTile(idx); return; }
  const baseGT = SEEDS[td.seed].grow * getGrowMult() * fertFactor(idx);
  const newGT  = baseGT * 0.75;
  const elapsed = (Date.now() - td.plantedAt) / 1000;
  const oldRem = Math.max(0, baseGT - elapsed);
  td.plantedAt = Date.now() - (newGT - oldRem * 0.75) * 1000;
  td.sellBonus = 1.25;
  if (!state.tilesWatered) state.tilesWatered = {};
  state.tilesWatered[idx] = true;
  RenderFarm.renderTile(idx); RenderPanel.renderInventory(); RenderPanel.renderItems();
  log(`💧 ${SEEDS[td.seed].name} watered (+25% value, +25% speed)`);
  save();
}

function drownTile(idx) {
  const td = state.tiles[idx];
  if (!td) return;
  const ff = fertFactor(idx);
  const currentGT = SEEDS[td.seed].grow * getGrowMult() * ff * 0.75;
  const drownedGT = SEEDS[td.seed].grow * getGrowMult() * ff;
  const elapsed   = (Date.now() - td.plantedAt) / 1000;
  const currentRem = Math.max(0, currentGT - elapsed);
  const newRem    = currentRem * (drownedGT / currentGT);
  td.plantedAt    = Date.now() - (drownedGT - newRem) * 1000;
  td.drowned      = true; td.sellBonus = 0.25;
  delete state.tilesWatered[idx];
  RenderFarm.renderTile(idx); RenderPanel.renderInventory(); RenderPanel.renderItems();
  log(`💀 ${SEEDS[td.seed].name} was drowned! Value severely reduced.`);
  save();
}

// ══════════════════════════════
// LOOSE CROPS
// ══════════════════════════════
function addInventory(seed) { state.inventory[seed] = (state.inventory[seed] || 0) + 1; }

function dropLoose(seed, x, y, bonus = 1.0, drowned = false, fungal = false) {
  const id = nextId++;
  state.loose.push({ seed, id, x, y, bonus, drowned, fungal });
  sfx.drop();
  renderLoose();
  const el = document.querySelector(`.loose-crop[data-id="${id}"]`);
  if (el) el.classList.add('loose-land');
  save();
}

function renderLoose() {
  document.querySelectorAll('.loose-crop').forEach(el => el.remove());
  state.loose.forEach(item => {
    const el = mk('div','loose-crop');
    el.appendChild(makeSpriteDiv(item.seed, 'grown', 48));
    el.style.left = item.x + 'px'; el.style.top = item.y + 'px';
    el.dataset.id = item.id;
    el.addEventListener('mousedown', e => {
      e.stopPropagation();
      const i = state.loose.findIndex(g => g.id === item.id);
      if (i === -1) return;
      const { seed: s, bonus: b = 1.0, drowned: dr = false, fungal: fg = false } = state.loose[i];
      state.loose.splice(i, 1); renderLoose(); save();
      startDrag(s, 'loose', b, dr, fg); moveGhost(e.clientX, e.clientY);
    });
    document.body.appendChild(el);
  });
}

// ══════════════════════════════
// BAG OPENING
// ══════════════════════════════
function openBag(bag) {
  if (!state.bagInventory) state.bagInventory = {};
  if ((state.bagInventory[bag.id] || 0) < 1) return;
  state.bagInventory[bag.id]--;
  if (!state.seedInventory) state.seedInventory = {};
  const received = [];
  for (let i = 0; i < 3; i++) {
    const roll = Math.random();
    let cum = 0, chosen = bag.seeds[bag.seeds.length - 1];
    for (let j = 0; j < bag.seeds.length; j++) {
      cum += bag.odds[j];
      if (roll < cum) { chosen = bag.seeds[j]; break; }
    }
    state.seedInventory[chosen] = (state.seedInventory[chosen] || 0) + 1;
    received.push(SEEDS[chosen].seedIcon + ' ' + SEEDS[chosen].name);
  }
  log(`🎒 ${bag.name} opened: ${received.join(', ')}`);
  RenderPanel.renderInventory(); save();
}

// ══════════════════════════════
// SELL BOX
// ══════════════════════════════
function addToSellQueue(seed, bonus = 1.0, drowned = false, fungal = false) {
  state.sellQueue.push({ seed, bonus, drowned, fungal });
  if (state.sellQueue.length === 1) state.sellNextAt = Date.now() + getSellInterval();
  const sb = document.getElementById('sell-box');
  if (sb) { sb.classList.remove('sell-bounce'); void sb.offsetWidth; sb.classList.add('sell-bounce'); }
  RenderSellbox.renderQueue(); save();
}

function tickSellBox() {
  if (!state.sellQueue.length || Date.now() < state.sellNextAt) return;
  const maxSell = getSellAtOnce();
  let totalCoins = 0, sold = 0;
  for (let s = 0; s < maxSell && state.sellQueue.length > 0; s++) {
    const item = state.sellQueue.shift();
    let coins;
    if (item.fungal)   coins = 0;
    else if (item.drowned) coins = Math.round(SEEDS[item.seed].sell * (item.bonus || 1));
    else               coins = Math.round(SEEDS[item.seed].sell * getSellMult() * (item.bonus || 1));
    log(`${SEEDS[item.seed].icon} ${SEEDS[item.seed].name} sold for ${coinHTML()}${coins}${item.fungal ? ' (fungal)' : ''}`);
    totalCoins += coins; sold++;
  }
  if (sold > 0) {
    if (sold === 1) sfx.sell(); else sfx.sellAuto();
    const sb = document.getElementById('sell-box');
    const r  = sb.getBoundingClientRect();
    Particles.coinBurst(r.left + r.width / 2, r.top + r.height / 2);
    showPop(`+${coinHTML()}${totalCoins}`, r.left + r.width / 2, r.top - 6);
    addCoins(totalCoins);
    EventBus.emit('crop:sold', { coins: totalCoins });
  }
  state.sellNextAt = state.sellQueue.length ? Date.now() + getSellInterval() : 0;
  RenderSellbox.renderQueue(); save();
}

function canTick() {
  if (!state.items || !state.items.wateringCan || !state.canRefillAt) return;
  if (Date.now() >= state.canRefillAt) {
    state.canCharges  = Math.min(canCapacity(), (state.canCharges || 0) + 1);
    state.canRefillAt = 0;
    RenderPanel.renderInventory(); RenderPanel.renderItems(); save();
  } else {
    const el = document.getElementById('can-fill-timer');
    if (el) el.textContent = fmt(Math.max(0, (state.canRefillAt - Date.now()) / 1000));
  }
}

// ══════════════════════════════
// SELECTION & TILE MENUS
// ══════════════════════════════
function deselect() {
  if (selectedTile !== null) { const p = selectedTile; selectedTile = null; RenderFarm.renderTile(p); }
}

function hideTileMenu() { document.getElementById('tile-menu').style.display = 'none'; }

function showTileMenu(idx, x, y) {
  const isCaged = state.cages && state.cages.includes(idx);
  const isFert  = !!(state.fertilizedTiles && state.fertilizedTiles[idx]);
  if (!isCaged && !isFert) return;
  const menu = document.getElementById('tile-menu');
  menu.innerHTML = '';
  if (isCaged) {
    const btn = mk('button'); btn.className = 'tmenu-btn'; btn.textContent = '🔓 Remove Cage';
    btn.addEventListener('mousedown', e => {
      e.stopPropagation();
      const ci = state.cages.indexOf(idx);
      if (ci !== -1) { state.cages.splice(ci, 1); state.cageCount = (state.cageCount||0) + 1; }
      RenderFarm.renderTile(idx); RenderPanel.renderItems(); log('🔒 Cage removed, returned to inventory'); save(); hideTileMenu();
    });
    menu.appendChild(btn);
  }
  if (isFert) {
    const btn = mk('button'); btn.className = 'tmenu-btn'; btn.textContent = '🌿 Remove Fertilizer';
    btn.addEventListener('mousedown', e => {
      e.stopPropagation();
      delete state.fertilizedTiles[idx];
      RenderFarm.renderTile(idx); save(); hideTileMenu();
    });
    menu.appendChild(btn);
  }
  menu.style.left = Math.min(x, window.innerWidth  - 170) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 90)  + 'px';
  menu.style.display = 'block';
}

function showRotCureMenu(idx, cost, x, y) {
  const menu = document.getElementById('tile-menu');
  menu.innerHTML = '';
  const header = mk('div');
  header.style.cssText = 'color:rgba(255,180,60,.8);font-size:10px;font-weight:700;padding:4px 8px 2px';
  header.textContent = '🍂 Root Rot — cure or harvest fast';
  menu.appendChild(header);
  const btn = mk('button'); btn.className = 'tmenu-btn';
  btn.innerHTML = `💊 Cure — ${coinHTML()}${cost}`;
  if (state.coins < cost) { btn.disabled = true; btn.style.opacity = '0.4'; }
  btn.addEventListener('mousedown', e => {
    e.stopPropagation();
    const td = state.tiles[idx];
    if (!td || state.coins < cost) return;
    state.coins -= cost;
    const oldRF = rotFactor(idx);
    delete state.rotTiles[idx];
    const newRF = rotFactor(idx);
    if (oldRF !== newRF) {
      const base = SEEDS[td.seed].grow, gm = getGrowMult(), wf = waterFactor(idx), ff = fertFactor(idx);
      const oldGT = base * gm * wf * ff * oldRF, newGT = base * gm * wf * ff * newRF;
      if (oldGT > 0) {
        const elapsed = (Date.now() - td.plantedAt) / 1000;
        const oldRem = Math.max(0, oldGT - elapsed);
        td.plantedAt = Date.now() - (newGT - oldRem * (newGT / oldGT)) * 1000;
      }
    }
    log('💊 Root rot cured.');
    updateCoins(); RenderFarm.renderTile(idx); save(); hideTileMenu();
  });
  menu.appendChild(btn);
  menu.style.left = Math.min(x, window.innerWidth  - 200) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 80)  + 'px';
  menu.style.display = 'block';
}

function showFungalCureMenu(idx, cost, x, y) {
  const menu = document.getElementById('tile-menu');
  menu.innerHTML = '';
  const header = mk('div');
  header.style.cssText = 'color:rgba(190,100,255,.9);font-size:10px;font-weight:700;padding:4px 8px 2px';
  header.textContent = '🍄 Fungal Bloom';
  menu.appendChild(header);
  const btn = mk('button'); btn.className = 'tmenu-btn';
  btn.innerHTML = `🧹 Clear — ${coinHTML()}${cost}`;
  if (state.coins < cost) { btn.disabled = true; btn.style.opacity = '0.4'; }
  btn.addEventListener('mousedown', e => {
    e.stopPropagation();
    if (state.coins < cost) return;
    state.coins -= cost;
    if (state.fungalTiles) delete state.fungalTiles[idx];
    if (state.tiles[idx]) {
      state.tiles[idx] = null;
      if (state.tilesWatered) delete state.tilesWatered[idx];
      if (state.rotTiles)     delete state.rotTiles[idx];
    }
    log('✅ Fungal tile cleared.');
    updateCoins(); RenderFarm.renderTile(idx); save(); hideTileMenu();
  });
  menu.appendChild(btn);
  menu.style.left = Math.min(x, window.innerWidth  - 200) + 'px';
  menu.style.top  = Math.min(y, window.innerHeight - 80)  + 'px';
  menu.style.display = 'block';
}

function onTileDown(e) {
  const idx = parseInt(e.currentTarget.dataset.idx);

  if (state.rotTiles && state.rotTiles[idx] && state.rotTiles[idx].deadAt !== undefined) {
    e.stopPropagation(); return;
  }
  if (state.mounds && state.mounds[idx] !== undefined) {
    e.stopPropagation();
    state.mounds[idx] = Math.min(state.mounds[idx], Date.now() + 5000);
    RenderFarm.renderTile(idx); save(); return;
  }
  if (state.thornedWeeds && state.thornedWeeds[idx] !== undefined) {
    e.stopPropagation();
    sfx.weedClick();
    state.thornedWeeds[idx].clicks++;
    if (state.thornedWeeds[idx].clicks >= THORNED_WEED_CLICKS) {
      delete state.thornedWeeds[idx];
      log('✅ Thorned weed cleared!');
      RenderFarm.renderTile(idx);
    } else {
      e.currentTarget.classList.add('tile-weed-hit');
      setTimeout(() => RenderFarm.renderTile(idx), 80);
    }
    save(); return;
  }
  if (state.weeds && state.weeds[idx] !== undefined) {
    e.stopPropagation();
    sfx.weedClick();
    state.weeds[idx].clicks++;
    if (state.weeds[idx].clicks >= WEED_CLICKS) {
      delete state.weeds[idx];
      log('✅ Weed cleared!');
      RenderFarm.renderTile(idx);
    } else {
      e.currentTarget.classList.add('tile-weed-hit');
      setTimeout(() => RenderFarm.renderTile(idx), 80);
    }
    save(); return;
  }

  const td = state.tiles[idx];
  const _isFungal = !!(state.fungalTiles && state.fungalTiles[idx] !== undefined);

  if (!td) {
    deselect();
    const _caged = state.cages && state.cages.includes(idx);
    const _fert  = !!(state.fertilizedTiles && state.fertilizedTiles[idx]);
    if (_caged || _fert) showTileMenu(idx, e.clientX + 4, e.clientY + 4);
    else if (_isFungal)  showFungalCureMenu(idx, 50, e.clientX + 4, e.clientY + 4);
    return;
  }

  if (isReady(td, idx)) {
    e.stopPropagation();
    const seed     = td.seed;
    const tileRect = e.currentTarget.getBoundingClientRect();
    sfx.harvest();
    Particles.leafBurst(tileRect.left + tileRect.width / 2, tileRect.top + tileRect.height / 2);
    spawnHarvestPop(tileRect.left + tileRect.width / 2, tileRect.top + tileRect.height / 2, seed);
    const rotInf  = !!(state.rotTiles && state.rotTiles[idx] && state.rotTiles[idx].infectedAt !== undefined && state.rotTiles[idx].deadAt === undefined);
    const bonus   = rotInf ? 0.5 : (td.sellBonus || 1.0);
    const drowned = rotInf || (td.drowned || false);
    if (state.rotTiles) delete state.rotTiles[idx];
    state.tiles[idx] = null;
    if (state.tilesWatered) delete state.tilesWatered[idx];
    RenderFarm.renderTile(idx); save();
    log(`${SEEDS[seed].icon} ${SEEDS[seed].name} harvested${_isFungal ? ' (fungal — 0 coins)' : ''}`);
    if (rotInf) log('🍂 Infected — sells for 50% base value');
    EventBus.emit('crop:harvested', { seed, idx });
    startDrag(seed, 'tile', bonus, drowned, _isFungal); moveGhost(e.clientX, e.clientY);
    return;
  }

  e.stopPropagation();
  if (selectedTile === idx) deselect();
  else { deselect(); selectedTile = idx; RenderFarm.renderTile(idx); }

  if (state.rotTiles && state.rotTiles[idx] && state.rotTiles[idx].infectedAt !== undefined && state.rotTiles[idx].deadAt === undefined) {
    const baseCost = Math.ceil(SEEDS[td.seed].sell * 0.10);
    const cureCost = state.upgrades.fastCure ? Math.ceil(baseCost * 0.40) : baseCost;
    if (state.upgrades.fastCure) {
      if (state.coins >= cureCost) {
        state.coins -= cureCost;
        const oldRF = rotFactor(idx);
        delete state.rotTiles[idx];
        const newRF = rotFactor(idx);
        if (oldRF !== newRF) {
          const base = SEEDS[td.seed].grow, gm = getGrowMult(), wf = waterFactor(idx), ff = fertFactor(idx);
          const oldGT = base * gm * wf * ff * oldRF, newGT = base * gm * wf * ff * newRF;
          if (oldGT > 0) {
            const elapsed = (Date.now() - td.plantedAt) / 1000;
            const oldRem  = Math.max(0, oldGT - elapsed);
            td.plantedAt  = Date.now() - (newGT - oldRem * (newGT / oldGT)) * 1000;
          }
        }
        log('💊 Root rot cured.');
        updateCoins(); RenderFarm.renderTile(idx); save();
      } else {
        log(`💊 Need ${coinHTML()}${cureCost} to cure root rot.`);
      }
    } else {
      showRotCureMenu(idx, cureCost, e.clientX + 4, e.clientY + 4);
    }
  } else if (_isFungal) {
    const clearCost = Math.ceil(SEEDS[td.seed].sell * 0.10);
    showFungalCureMenu(idx, clearCost, e.clientX + 4, e.clientY + 4);
  }
}

// ══════════════════════════════
// VISUAL HELPERS
// ══════════════════════════════
function spawnHarvestPop(x, y, seed) {
  const el = mk('div','harvest-pop');
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.appendChild(makeSpriteDiv(seed, 'grown', 56));
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 200);
}

function showPop(text, x, y) {
  const el = mk('div','fpop'); el.innerHTML = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 1250);
}

// ══════════════════════════════
// PANEL STATE
// ══════════════════════════════
function applyPanelState() {
  const w = panelExpanded ? panelWidth + 'px' : '24px';
  document.body.style.setProperty('--pw', w);
  document.getElementById('panel-arrow').textContent = panelExpanded ? '›' : '‹';
  if (state.upgrades.windUpCrank) RenderSellbox.positionCrank();
}

// ══════════════════════════════
// 50ms TICK (timers, sell, dirty renders)
// ══════════════════════════════
function updateTimers() {
  const nodes = RenderFarm.tileNodes;
  for (let i = 0; i < nodes.length; i++) {
    const td = state.tiles[i];
    if (!td) continue;
    const wasReady = prevReadyState[i] || false;
    const nowReady = isReady(td, i);
    if (!wasReady && nowReady) {
      prevReadyState[i] = true;
      RenderFarm.renderTile(i);
    } else if (!nowReady) {
      const el = nodes[i]; if (!el) continue;
      const timerEl = el.querySelector('.t-timer');
      if (timerEl) timerEl.textContent = fmt(remSec(td, i));
      prevReadyState[i] = false;
    }
  }
  document.querySelectorAll('.t-mound-timer').forEach(timerEl => {
    const mIdx = parseInt(timerEl.dataset.moundIdx);
    if (state.mounds && state.mounds[mIdx] !== undefined)
      timerEl.textContent = fmt(Math.max(0, (state.mounds[mIdx] - Date.now()) / 1000));
  });
  document.querySelectorAll('.t-rot-timer').forEach(timerEl => {
    const rIdx = parseInt(timerEl.dataset.rotTimerIdx);
    const rot  = state.rotTiles && state.rotTiles[rIdx];
    if (rot && rot.infectedAt !== undefined)
      timerEl.textContent = fmt(Math.max(0, 90 - (Date.now() - rot.infectedAt) / 1000));
  });
  document.querySelectorAll('.t-rotdead-timer').forEach(timerEl => {
    const rIdx = parseInt(timerEl.dataset.rotDeadIdx);
    const rot  = state.rotTiles && state.rotTiles[rIdx];
    if (rot && rot.deadAt !== undefined)
      timerEl.textContent = fmt(Math.max(0, (rot.deadAt - Date.now()) / 1000));
  });
}

// ══════════════════════════════
// INIT
// ══════════════════════════════
function init() {
  load();
  recalculateModifiers(); // from upgrades.js (uses STATE — harmless)

  RenderFarm.buildGrid();
  RenderEnv.init();

  // Wire TimerManager with real implementations
  const cond = (minStage, checkMature = true) => () =>
    (!checkMature || state.mature) && getCurrentStage().stage >= minStage;
  TimerManager.timers['crow'].fn        = crowTick;
  TimerManager.timers['crow'].condition = cond(0);
  TimerManager.timers['weed'].fn        = weedTick;
  TimerManager.timers['weed'].condition = cond(0);
  TimerManager.timers['hawk'].fn        = hawkTick;
  TimerManager.timers['hawk'].condition = cond(2);
  TimerManager.timers['hawk'].interval  = () => getCurrentStage().stage >= 3 ? 10000 : 15000;
  TimerManager.timers['mole'].fn        = moleTick;
  TimerManager.timers['mole'].condition = cond(2);
  TimerManager.timers['rootRot'].fn     = rootRotSpawnTick;
  TimerManager.timers['rootRot'].condition = cond(3);
  TimerManager.timers['locust'].fn      = locustTick;
  TimerManager.timers['locust'].condition = cond(3);
  TimerManager.timers['blight'].fn      = blightTick;
  TimerManager.timers['blight'].condition = cond(3);
  TimerManager.timers['fungal'].fn      = fungalSpawnTick;
  TimerManager.timers['fungal'].condition = cond(3);
  TimerManager.timers['sell'].fn        = tickSellBox;
  TimerManager.timers['sell'].condition = () => true;
  TimerManager.timers['sell'].interval  = () => getSellInterval();
  TimerManager.timers['save'].fn        = save;
  TimerManager.timers['save'].condition = () => true;

  // Additional 1s timers (not in engine.js, add here)
  TimerManager.register('mound',       { interval: 1000,  condition: () => true, fn: moundTick });
  TimerManager.register('rot',         { interval: 1000,  condition: () => true, fn: rotTick });
  TimerManager.register('thornedWeed', { interval: 1000,  condition: () => true, fn: thornedWeedTick });
  TimerManager.register('fungalSpread',{ interval: 30000, condition: () => true, fn: fungalSpreadTick });
  TimerManager.register('masterFarmer',{ interval: 1000,  condition: () => true, fn: masterFarmerTick });
  TimerManager.register('crankDecay',  { interval: 1000,  condition: () => state.upgrades.windUpCrank, fn: () => {
    if (crankMult > 1.0) {
      const excess = crankMult - 1;
      crankMult = Math.max(1.0, 1 + excess / (1 + excess * 0.08));
      RenderSellbox.updateCrankLabel();
    }
  }});

  // Wire EventBus
  EventBus.on('crop:harvested', ({ seed }) => {
    // leaf burst and audio already handled in onTileDown for immediate feedback
  });
  EventBus.on('crop:sold', () => {});
  EventBus.on('upgrade:purchased', ({ id }) => {
    RenderPanel.renderUpgrades();
    sfx.upgrade();
  });
  EventBus.on('stage:advanced', ({ stage, name }) => {
    showBanner(`Stage ${stage}: ${name}`);
    sfx.stageAdvance();
    RenderHUD.renderStage();
  });

  // Panel resize events
  const panelTabEl = document.getElementById('panel-tab');
  const panelEl    = document.getElementById('panel');
  panelTabEl.addEventListener('mousedown', e => {
    resizing = true; resizeStartX = e.clientX; resizeStartW = panelWidth; resizeMoved = false;
    panelEl.classList.add('resizing'); e.preventDefault(); e.stopPropagation();
  });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const dx = resizeStartX - e.clientX;
    if (Math.abs(dx) > 4) resizeMoved = true;
    if (resizeMoved && panelExpanded) {
      panelWidth = Math.max(160, Math.min(400, resizeStartW + dx));
      document.body.style.setProperty('--pw', panelWidth + 'px');
      if (state.upgrades.windUpCrank) RenderSellbox.positionCrank();
    }
  });
  document.addEventListener('mouseup', e => {
    if (!resizing) return;
    resizing = false; panelEl.classList.remove('resizing');
    if (!resizeMoved) { panelExpanded = !panelExpanded; applyPanelState(); }
    save();
  });
  document.addEventListener('mousedown', () => { if (!drag && !resizing) deselect(); hideTileMenu(); });
  window.addEventListener('resize', () => { if (state.upgrades.windUpCrank) RenderSellbox.positionCrank(); });

  // Crank click
  document.getElementById('crank-svg').addEventListener('click', () => {
    if (!state.upgrades.windUpCrank) return;
    crankMult  = crankMult * getCrankClickMult();
    crankAngle = (crankAngle + 30) % 3600;
    document.getElementById('crank-svg').style.transform = `rotate(${crankAngle}deg)`;
    RenderSellbox.updateCrankLabel();
  });

  // Well (display-only)
  document.getElementById('well').addEventListener('mousedown', e => e.stopPropagation());

  // Settings
  STATE.settings.muted = localStorage.getItem('bliss_muted') === '1';
  const muteBtn = document.getElementById('mute-btn');
  muteBtn.textContent = STATE.settings.muted ? '🔇' : '🔊';
  muteBtn.addEventListener('click', e => {
    e.stopPropagation();
    STATE.settings.muted = !STATE.settings.muted;
    localStorage.setItem('bliss_muted', STATE.settings.muted ? '1' : '0');
    muteBtn.textContent = STATE.settings.muted ? '🔇' : '🔊';
  });

  (function () {
    const btn              = document.getElementById('settings-btn');
    const backdrop         = document.getElementById('settings-backdrop');
    const panel            = document.getElementById('settings-panel');
    const resetBtn         = document.getElementById('reset-btn');
    const hideBoughtToggle = document.getElementById('hide-bought-toggle');
    let confirmed = false;

    function openSettings()  { confirmed = false; resetBtn.textContent = 'Reset Data'; hideBoughtToggle.checked = !!state.hideBoughtUpgrades; backdrop.style.display = 'block'; panel.style.display = 'block'; }
    function closeSettings() { confirmed = false; resetBtn.textContent = 'Reset Data'; backdrop.style.display = 'none';  panel.style.display = 'none'; }

    hideBoughtToggle.addEventListener('change', () => { state.hideBoughtUpgrades = hideBoughtToggle.checked; RenderPanel.renderUpgrades(); save(); });
    btn.addEventListener('click',      e => { e.stopPropagation(); openSettings(); });
    backdrop.addEventListener('click', closeSettings);
    panel.addEventListener('click',    e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirmed) { confirmed = true; resetBtn.textContent = 'Are you sure?'; }
      else { localStorage.clear(); location.reload(); }
    });
  }());

  TimerManager.register('display', { interval: 50, condition: () => true, fn: () => {
    updateTimers();
    RenderSellbox.updateSellTimer();
    RenderSellbox.updateCrankLabel();
    canTick();
    RenderEnv.updateSky();
  }});

  // Initial render
  RenderFarm.renderGrid();
  RenderPanel.renderInventory();
  RenderPanel.renderSeeds();
  RenderPanel.renderBags();
  RenderPanel.renderItems();
  RenderPanel.renderUpgrades();
  RenderSellbox.renderQueue();
  RenderSellbox.renderCrank();
  RenderSellbox.renderWell();
  renderLoose();
  updateCoins();
  RenderHUD.renderStage();
  applyPanelState();

  // Init prevReadyState
  for (let i = 0; i < tileCount(); i++) {
    const td = state.tiles[i];
    prevReadyState[i] = td ? isReady(td, i) : false;
  }

  const img = new Image();
  img.onerror = () => console.error('sprites.png not found at ./sprites.png');
  img.src = './sprites.png';
}

init();
