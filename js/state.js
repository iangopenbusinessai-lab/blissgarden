window.STATE = {
  meta: {
    gold: 10,
    allTimeGold: 0,
    gameStartTime: Date.now(),
    stage: 0,
    matureState: false,
  },
  plots: Array(9).fill(null),
  fallenCrops: [],
  sellQueue: [],
  inventory: {
    seeds: {},
    crops: {},
    items: {},
  },
  upgrades: {},
  modifiers: {
    growSpeed: 1,
    sellValue: 1,
    sellInterval: 10000,
    crankMultiplier: 1,       // runtime accumulated crank boost (managed by crank logic)
    crankClickMultiplier: 1.015, // per-click factor; set by recalculateModifiers
    sellBoxCapacity: 1,
    eventResistance: {
      crow: 0, hawk: 0, mole: 0, thornedWeed: 0,
      rot: 0, locust: 0, blight: 0, fungal: 0,
    },
  },
  events: {
    firstCrow: false,
    firstWeed: false,
    firstHawk: false,
    firstMole: false,
    firstRot: false,
    firstLocust: false,
    firstBlight: false,
    firstFungal: false,
  },
  settings: {
    muted: false,
    hidePurchased: false,
    debugMode: false,
  },
  milestones: {},
  session: {
    dragItem: null,
    debugCounts: { crow:0, hawk:0, weed:0, mole:0, rootRot:0, locust:0, blight:0, fungal:0 },
    crankMultiplier: 1,
  },
};

window.DIRTY = {
  hud: true,
  grid: true,
  panel: true,
  sellbox: true,
};

// ══════════════════════════════
// FLAT GAME STATE
// ══════════════════════════════
var state = {
  coins: 10, coinsEarned: 0, gameStartTime: Date.now(),
  milestones: {}, stagesSeen: {}, mature: false,
  tiles: Array(9).fill(null),
  inventory: {}, seedInventory: {}, bagInventory: {}, craftedInventory: {},
  achievements: {},
  stats: {
    totalHarvested: 0, totalPlanted: 0, totalCrafted: 0, craftedSold: 0,
    weedsCleared: 0, crowsSurvived: 0, locustsSurvived: 0, rotCured: 0,
    blightsSurvived: 0, bagsBought: 0,
    seedTypesPlanted: {}, recipesEverCrafted: {}, prestigeCount: 0,
  },
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
// GLOBAL DOM & FORMAT HELPERS
// ══════════════════════════════
function mk(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }
function coinHTML() { return '<span class="coin"></span>'; }
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
// SPRITE HELPERS
// ══════════════════════════════
function getSpriteStyle(cropId, stage, size=64) {
  const row = ROW_MAP[cropId], col = COL_MAP[stage];
  if (row === undefined || col === undefined) {
    console.error('getSpriteStyle: unknown cropId or stage', cropId, stage);
    return {};
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
  };
}
function makeSpriteDiv(cropId, stage, size=64) {
  const row = ROW_MAP[cropId];
  if (row !== undefined && row >= 13) {
    const seed = window.SEEDS && window.SEEDS[cropId];
    const emoji = seed ? (seed.icon || '🌱') : '🌱';
    const el = document.createElement('span');
    el.style.cssText = `font-size:${Math.round(size*0.65)}px;line-height:1;display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;flex-shrink:0;pointer-events:none`;
    el.textContent = emoji;
    return el;
  }
  const el = document.createElement('div');
  Object.assign(el.style, getSpriteStyle(cropId, stage, size));
  el.style.pointerEvents = 'none';
  return el;
}
function spriteHTML(cropId, stage, size=64) {
  const row = ROW_MAP[cropId];
  if (row !== undefined && row >= 13) {
    const seed = window.SEEDS && window.SEEDS[cropId];
    const emoji = seed ? (seed.icon || '🌱') : '🌱';
    const fs = Math.round(size * 0.65);
    return `<span style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;font-size:${fs}px;line-height:1;vertical-align:middle;flex-shrink:0;pointer-events:none">${emoji}</span>`;
  }
  const col = COL_MAP[stage];
  if (row === undefined || col === undefined) {
    console.error('spriteHTML: unknown cropId or stage', cropId, stage);
    return '';
  }
  return `<span style="display:inline-block;width:${size}px;height:${size}px;background:url('./sprites.png') no-repeat ${-(col*size)}px ${-(row*size)}px/${size*3}px ${size*13}px;image-rendering:pixelated;vertical-align:middle;flex-shrink:0;pointer-events:none"></span>`;
}
