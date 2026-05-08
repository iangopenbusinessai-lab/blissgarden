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
    crankMultiplier: 1,
    sellBoxCapacity: 1,
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
  },
  milestones: {},
  session: {
    dragItem: null,
  },
};

window.DIRTY = {
  hud: true,
  grid: true,
  panel: true,
  sellbox: true,
};
