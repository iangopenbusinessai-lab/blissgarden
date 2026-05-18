// ══════════════════════════════
// SEEDS
// ══════════════════════════════
window.SEEDS = {
  // Basic shop seeds
  potato:     { name:'Potato',        icon:'🥔', seedIcon:'🌰', cost:5,    grow:15,     sell:12      },
  carrot:     { name:'Carrot',        icon:'🥕', seedIcon:'🌱', cost:15,   grow:45,     sell:40      },
  wheat:      { name:'Wheat',         icon:'🌾', seedIcon:'🌾', cost:40,   grow:90,     sell:110     },
  sunflower:  { name:'Sunflower',     icon:'🌻', seedIcon:'🌻', cost:120,  grow:180,    sell:380     },
  // Bag-only seeds
  pumpkin:    { name:'Pumpkin',       icon:'🎃', seedIcon:'🎃', grow:480,    sell:1400    },
  chard:      { name:'Rainbow Chard', icon:'🌈', seedIcon:'🌿', grow:1200,   sell:5000    },
  moonbloom:  { name:'Moonbloom',     icon:'🌕', seedIcon:'🌑', grow:2700,   sell:18000   },
  starfruit:  { name:'Starfruit',     icon:'⭐', seedIcon:'💫', grow:7200,   sell:65000   },
  thornvine:  { name:'Thornvine',     icon:'🌿', seedIcon:'🌱', grow:14400,  sell:200000  },
  glowshroom: { name:'Glowshroom',    icon:'🍄', seedIcon:'🍄', grow:28800,  sell:580000  },
  voidbloom:  { name:'Voidbloom',     icon:'🌑', seedIcon:'🔮', grow:57600,  sell:1800000 },
  aetherfern: { name:'Aetherfern',    icon:'🌀', seedIcon:'🌀', grow:115200, sell:5500000 },
  solarspike:   { name:'Solarspike',    icon:'☀️', seedIcon:'✨', grow:230400, sell:16000000 },
  // Abyssal bag seeds
  netherfruit:   { name:'Netherfruit',    icon:'🖤', seedIcon:'🖤', grow:28800,   sell:180000,   bag:'abyssal' },
  duskpetal:     { name:'Duskpetal',      icon:'🌸', seedIcon:'🌸', grow:64800,   sell:480000,   bag:'abyssal' },
  ashbloom:      { name:'Ashbloom',       icon:'🌋', seedIcon:'🌋', grow:129600,  sell:1200000,  bag:'abyssal' },
  voidcoral:     { name:'Voidcoral',      icon:'🪸', seedIcon:'🪸', grow:259200,  sell:3500000,  bag:'abyssal' },
  eclipseLotus:  { name:'Eclipse Lotus',  icon:'🌑', seedIcon:'🌑', grow:432000,  sell:12000000, bag:'abyssal' },
  // Divine bag seeds
  stardustFern:  { name:'Stardust Fern',  icon:'🌿', seedIcon:'🌿', grow:172800,  sell:1800000,  bag:'divine'  },
  celestialPod:  { name:'Celestial Pod',  icon:'🫧', seedIcon:'🫧', grow:345600,  sell:6000000,  bag:'divine'  },
  auricBloom:    { name:'Auric Bloom',    icon:'🌟', seedIcon:'🌟', grow:691200,  sell:22000000, bag:'divine'  },
  prismaticRoot: { name:'Prismatic Root', icon:'🌈', seedIcon:'🌈', grow:1382400, sell:90000000, bag:'divine'  },
  genesisSeed:   { name:'Genesis Seed',   icon:'✨', seedIcon:'✨', grow:2592000, sell:400000000,bag:'divine'  },
};

window.BASIC_SEEDS = ['potato','carrot','wheat','sunflower'];

window.SEED_SELL_PRICES = {
  potato:2, carrot:7, wheat:20, sunflower:60,
  pumpkin:150, chard:150, moonbloom:150,
  starfruit:2500, thornvine:2500, glowshroom:2500,
  voidbloom:35000, aetherfern:35000, solarspike:35000,
  netherfruit:83333, duskpetal:83333, ashbloom:83333, voidcoral:83333, eclipseLotus:83333,
  stardustFern:833333, celestialPod:833333, auricBloom:833333, prismaticRoot:833333, genesisSeed:833333,
};

// ══════════════════════════════
// SEED BAGS
// ══════════════════════════════
window.BAGS = [
  { id:'fieldBag',     name:'Field Bag',     icon:'🎒', cost:1000,    seedsPerOpen:3,
    seeds:['pumpkin','chard','moonbloom','starfruit','thornvine'],
    odds:[0.65,0.15,0.10,0.05,0.05] },
  { id:'forestBag',    name:'Forest Bag',    icon:'🌲', cost:50000,   seedsPerOpen:3,
    seeds:['starfruit','thornvine','glowshroom','voidbloom','aetherfern'],
    odds:[0.60,0.18,0.12,0.06,0.04] },
  { id:'celestialBag', name:'Celestial Bag', icon:'✨', cost:800000,  seedsPerOpen:3,
    seeds:['voidbloom','aetherfern','solarspike','netherfruit','duskpetal'],
    odds:[0.60,0.18,0.12,0.06,0.04] },
  { id:'abyssalBag',   name:'Abyssal Bag',   icon:'🌑', cost:500000,  seedsPerOpen:3,
    seeds:['netherfruit','duskpetal','ashbloom','voidcoral','eclipseLotus'],
    odds:[0.70,0.15,0.09,0.04,0.02] },
  { id:'divineBag',    name:'Divine Bag',    icon:'✨', cost:5000000, seedsPerOpen:3,
    seeds:['stardustFern','celestialPod','auricBloom','prismaticRoot','genesisSeed'],
    odds:[0.68,0.15,0.10,0.04,0.03] },
];

// ══════════════════════════════
// ITEMS
// ══════════════════════════════
window.ITEMS = {
  wateringCan: {
    id:'wateringCan', name:'Watering Can', icon:'💧', cost:100,
    desc:'Click can in inventory to fill. Drag charged can onto growing crop. +25% speed & value.',
  },
  copperSpout: {
    id:'copperSpout', name:'Copper Spout', icon:'🪙', cost:800,
    desc:'Upgrade the can: fill time reduced to 8s, capacity increases to 2 charges.',
    requires:'wateringCan',
  },
  cage: {
    id:'cage', name:'Cage', icon:'🔒', cost:250,
    desc:'Drag from inventory onto a tile for 75% crow resistance. Stays until removed.',
    stackable:true,
  },
  fertilizer: {
    id:'fertilizer', name:'Common Fertilizer', icon:'🌿', cost:500,
    desc:'Drag from inventory onto any tile. Crops grown there are 25% faster permanently.',
    stackable:true,
  },
  uncommonFert: {
    id:'uncommonFert', name:'Uncommon Fertilizer', icon:'⚗️', cost:2000,
    desc:'Drag from inventory onto any tile. Crops grown there are 40% faster permanently.',
    stackable:true, requires:'fertilizer',
  },
};

// ══════════════════════════════
// UPGRADES
// ══════════════════════════════
// ── SPRITE SHEET MAPPING ──────────────────────────────────────────────────
const ROW_MAP = {
  potato:0, carrot:1, wheat:2, sunflower:3, pumpkin:4, chard:5, moonbloom:6,
  starfruit:7, thornvine:8, glowshroom:9, voidbloom:10, aetherfern:11, solarspike:12,
  // rows 13–22: no sprite rows in sheet; emoji fallback used at runtime
  netherfruit:13, duskpetal:14, ashbloom:15, voidcoral:16, eclipseLotus:17,
  stardustFern:18, celestialPod:19, auricBloom:20, prismaticRoot:21, genesisSeed:22,
};
const COL_MAP = { seed:0, sprout:1, grown:2 };

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
// UPGRADES
// ══════════════════════════════
window.UPGRADES = [
  // ── SPEED CHAIN ──
  { id:'quickRoots',     name:'Quick Roots',            desc:'Crops grow 10% faster',                              cost:15,      type:'speed',          mult:0.90,  chain:null              },
  { id:'fertilizerI',    name:'Fertilizer I',            desc:'Crops grow 18% faster',                              cost:90,      type:'speed',          mult:0.82,  chain:'quickRoots'      },
  { id:'fertilizerII',   name:'Fertilizer II',           desc:'Crops grow 26% faster',                              cost:280,     type:'speed',          mult:0.74,  chain:'fertilizerI'     },
  { id:'fertilizerIII',  name:'Fertilizer III',          desc:'Crops grow 34% faster',                              cost:600,     type:'speed',          mult:0.66,  chain:'fertilizerII'    },
  { id:'fertilizerIV',   name:'Fertilizer IV',           desc:'Crops grow 42% faster',                              cost:1200,    type:'speed',          mult:0.58,  chain:'fertilizerIII'   },
  { id:'fertilizerV',    name:'Fertilizer V',            desc:'Crops grow 50% faster',                              cost:3000,    type:'speed',          mult:0.50,  chain:'fertilizerIV'    },
  { id:'fertilizerVI',   name:'Fertilizer VI',           desc:'Crops grow 56% faster',                              cost:8000,    type:'speed',          mult:0.44,  chain:'fertilizerV'     },
  { id:'fertilizerVII',  name:'Fertilizer VII',          desc:'Crops grow 62% faster',                              cost:25000,   type:'speed',          mult:0.38,  chain:'fertilizerVI'    },
  { id:'fertilizerVIII', name:'Fertilizer VIII',         desc:'Crops grow 67% faster',                              cost:80000,   type:'speed',          mult:0.33,  chain:'fertilizerVII'   },
  { id:'fertilizerIX',   name:'Fertilizer IX',           desc:'Crops grow 72% faster',                              cost:300000,  type:'speed',          mult:0.28,  chain:'fertilizerVIII'  },
  { id:'fertilizerX',    name:'Fertilizer X',            desc:'Crops grow 76% faster',                              cost:1000000, type:'speed',          mult:0.24,  chain:'fertilizerIX'    },
  // ── VALUE CHAIN ──
  { id:'goldenHarvest',  name:'Golden Harvest',          desc:'Crops sell for 20% more',                            cost:40,      type:'value',          mult:1.20,  chain:null              },
  { id:'marketEye',      name:'Market Eye',              desc:'Crops sell for 40% more',                            cost:150,     type:'value',          mult:1.40,  chain:'goldenHarvest'   },
  { id:'merchantTouch',  name:"Merchant's Touch",        desc:'Crops sell for 65% more',                            cost:400,     type:'value',          mult:1.65,  chain:'marketEye'       },
  { id:'marketMastery',  name:'Market Mastery',          desc:'Crops sell for 95% more',                            cost:800,     type:'value',          mult:1.95,  chain:'merchantTouch'   },
  { id:'marketPinnacle', name:'Market Pinnacle',         desc:'Crops sell for 130% more',                           cost:1800,    type:'value',          mult:2.30,  chain:'marketMastery'   },
  { id:'goldenEmpire',   name:'Golden Empire',           desc:'Crops sell for 175% more',                           cost:5000,    type:'value',          mult:2.75,  chain:'marketPinnacle'  },
  { id:'diamondTrade',   name:'Diamond Trade',           desc:'Crops sell for 230% more',                           cost:15000,   type:'value',          mult:3.30,  chain:'goldenEmpire'    },
  { id:'platinumExchange',name:'Platinum Exchange',      desc:'Crops sell for 300% more',                           cost:50000,   type:'value',          mult:4.00,  chain:'diamondTrade'    },
  { id:'celestialMarket',name:'Celestial Market',        desc:'Crops sell for 380% more',                           cost:150000,  type:'value',          mult:4.80,  chain:'platinumExchange'},
  { id:'infiniteHarvest',name:'Infinite Harvest',        desc:'Crops sell for 480% more',                           cost:500000,  type:'value',          mult:5.80,  chain:'celestialMarket' },
  { id:'godlyYield',     name:'Godly Yield',             desc:'Crops sell for 600% more',                           cost:2000000, type:'value',          mult:7.00,  chain:'infiniteHarvest' },
  // ── SELL SPEED CHAIN ──
  { id:'swiftMarketI',   name:'Swift Market I',          desc:'Sell interval 12% faster',                           cost:60,      type:'sellSpeed',      mult:0.88,  chain:null              },
  { id:'swiftMarketII',  name:'Swift Market II',         desc:'Sell interval 22% faster',                           cost:200,     type:'sellSpeed',      mult:0.78,  chain:'swiftMarketI'    },
  { id:'swiftMarketIII', name:'Swift Market III',        desc:'Sell interval 32% faster',                           cost:500,     type:'sellSpeed',      mult:0.68,  chain:'swiftMarketII'   },
  { id:'swiftMarketIV',  name:'Swift Market IV',         desc:'Sell interval 40% faster',                           cost:900,     type:'sellSpeed',      mult:0.60,  chain:'swiftMarketIII'  },
  { id:'swiftMarketV',   name:'Swift Market V',          desc:'Sell interval 48% faster',                           cost:2000,    type:'sellSpeed',      mult:0.52,  chain:'swiftMarketIV'   },
  { id:'swiftMarketVI',  name:'Swift Market VI',         desc:'Sell interval 54% faster',                           cost:6000,    type:'sellSpeed',      mult:0.46,  chain:'swiftMarketV'    },
  { id:'swiftMarketVII', name:'Swift Market VII',        desc:'Sell interval 60% faster',                           cost:18000,   type:'sellSpeed',      mult:0.40,  chain:'swiftMarketVI'   },
  { id:'swiftMarketVIII',name:'Swift Market VIII',       desc:'Sell interval 65% faster',                           cost:60000,   type:'sellSpeed',      mult:0.35,  chain:'swiftMarketVII'  },
  { id:'swiftMarketIX',  name:'Swift Market IX',         desc:'Sell interval 69% faster',                           cost:200000,  type:'sellSpeed',      mult:0.31,  chain:'swiftMarketVIII' },
  { id:'swiftMarketX',   name:'Swift Market X',          desc:'Sell interval 73% faster',                           cost:700000,  type:'sellSpeed',      mult:0.27,  chain:'swiftMarketIX'   },
  // ── PLOT EXPANSIONS ──
  { id:'expandPlot',     name:'Expand Plot',             desc:'Adds a column of 3 tiles (→ 4×3)',                   cost:400,     type:'expand',                     chain:null              },
  { id:'expandBottom',   name:'Bottom Row Expansion',    desc:'Adds a bottom row (→ 4×4)',                          cost:1500,    type:'expandBottom',               chain:'expandPlot'      },
  { id:'expand2ndCol',   name:'Second Column Expansion', desc:'Adds a column (→ 5×4)',                              cost:8000,    type:'expand2ndCol',               chain:'expandBottom'    },
  { id:'expand2ndRow',   name:'Second Row Expansion',    desc:'Adds a row (→ 5×5)',                                 cost:25000,   type:'expand2ndRow',               chain:'expand2ndCol'    },
  { id:'expand3rdCol',   name:'Third Column Expansion',  desc:'Adds a column (→ 6×5)',                              cost:100000,  type:'expand3rdCol',               chain:'expand2ndRow'    },
  { id:'expand3rdRow',   name:'Third Row Expansion',     desc:'Adds a row (→ 6×6)',                                 cost:400000,  type:'expand3rdRow',               chain:'expand3rdCol'    },
  // ── CRANK CHAIN ──
  { id:'windUpCrank',    name:'Wind-Up Crank',           desc:'Click crank to boost sell speed. 1.015× per click.', cost:300,    type:'crank',                      chain:null              },
  { id:'ironCrank',      name:'Iron Crank',              desc:'Iron reinforcement. 1.025× per click.',              cost:750,     type:'crankUp',                    chain:'windUpCrank'     },
  { id:'steelCrank',     name:'Steel Crank',             desc:'Darker steel body. 1.040× per click.',              cost:5000,    type:'crankUp',                    chain:'ironCrank'       },
  { id:'titaniumCrank',  name:'Titanium Crank',          desc:'Blue-grey shimmer. 1.060× per click.',              cost:30000,   type:'crankUp',                    chain:'steelCrank'      },
  { id:'diamondCrank',   name:'Diamond Crank',           desc:'Blue sparkle. 1.085× per click.',                   cost:150000,  type:'crankUp',                    chain:'titaniumCrank'   },
  // ── SELL BOX CHAIN ──
  { id:'ironSellBox',    name:'Iron Sell Box',           desc:'Sells 2 items per interval. Iron crate.',            cost:5000,    type:'ironSellBox',                chain:null              },
  { id:'steelSellBox',   name:'Steel Sell Box',          desc:'Sells 3 items per interval. Reinforced steel.',      cost:20000,   type:'steelSellBox',               chain:'ironSellBox'     },
  { id:'titaniumSellBox',name:'Titanium Sell Box',       desc:'Sells 5 items per interval. Titanium alloy.',        cost:100000,  type:'titaniumSellBox',            chain:'steelSellBox'    },
  { id:'diamondSellBox', name:'Diamond Sell Box',        desc:'Sells 8 items per interval. Diamond-lined.',         cost:500000,  type:'diamondSellBox',             chain:'titaniumSellBox' },
  // ── STAGE 2 MITIGATION ──
  { id:'scarecrowCoat',  name:'Scarecrow Coat 🧥',       desc:'Crows deterred 30% more often (additive with cage bonus).',  cost:8000,   type:'mitigation', stage2:true, chain:null             },
  { id:'hawkNet',        name:'Hawk Net 🕸️',              desc:'Hawks steal 1 crop instead of 2.',                           cost:25000,  type:'mitigation', stage2:true, chain:null             },
  { id:'groundMesh',     name:'Ground Mesh 🪤',           desc:'Mole spawn chance reduced 40%.',                             cost:12000,  type:'mitigation', stage2:true, chain:null             },
  { id:'quickSoil',      name:'Quick Soil 🪨',            desc:'Mound recovery time permanently 5s instead of 20s.',         cost:30000,  type:'mitigation', stage2:true, chain:null             },
  { id:'herbicideI',     name:'Herbicide I 🧴',           desc:'Thorned weed spawn chance reduced 25%.',                     cost:15000,  type:'mitigation', stage2:true, chain:null             },
  { id:'herbicideII',    name:'Herbicide II 🧴🧴',        desc:'Thorned weeds never spread.',                                cost:60000,  type:'mitigation', stage2:true, chain:'herbicideI'     },
  // ── STAGE 3 MITIGATION ──
  { id:'soilTreatment',  name:'Soil Treatment 💉',        desc:'Root rot chance reduced 40%.',                               cost:150000,  type:'mitigation', stage3:true, chain:null               },
  { id:'fastCure',       name:'Fast Cure ⚕️',             desc:'Root rot cure cost -60%, cures instantly on click.',         cost:400000,  type:'mitigation', stage3:true, chain:'soilTreatment'    },
  { id:'locustWard',     name:'Locust Ward 🔔',           desc:'Locust swarm chance -50% (stacks with scarecrow).',          cost:200000,  type:'mitigation', stage3:true, chain:null               },
  { id:'cropShield',     name:'Crop Shield 🛡️',           desc:'Locust swarm sets crops back 15% instead of 30%.',           cost:600000,  type:'mitigation', stage3:true, chain:'locustWard'       },
  { id:'weathervane',    name:'Weathervane 🌬️',           desc:'Blight storm chance reduced 40%.',                           cost:250000,  type:'mitigation', stage3:true, chain:null               },
  { id:'soilAnchor',     name:'Soil Anchor ⚓',           desc:'Fertilizer tiles immune to blight storms.',                  cost:700000,  type:'mitigation', stage3:true, chain:'weathervane'      },
  { id:'antifungalSpray',name:'Antifungal Spray 🧪',      desc:'Fungal bloom chance reduced 50%.',                           cost:350000,  type:'mitigation', stage3:true, chain:null               },
  { id:'containment',    name:'Containment 🚧',           desc:'Fungal bloom cannot spread past its origin tile.',           cost:900000,  type:'mitigation', stage3:true, chain:'antifungalSpray'  },
  { id:'ironGreenhouse', name:'Iron Greenhouse 🏠',        desc:'All Stage 2 & 3 event chances reduced 20% globally.',        cost:2000000, type:'mitigation', stage3:true, chain:null               },
  { id:'masterFarmer',   name:'Master Farmer 👨‍🌾',         desc:'Weeds and thorned weeds auto-clear after 10s.',              cost:5000000, type:'mitigation', stage3:true, chain:null               },
];

window.SEED_BAGS = window.BAGS;

// ══════════════════════════════
// RECIPES
// ══════════════════════════════
// ══════════════════════════════
// ACHIEVEMENTS
// ══════════════════════════════
window.ACHIEVEMENTS = [
  // FARMING
  { id:'firstPlant',      name:'First Seed',          desc:'Plant your first crop',                          category:'farming',     stars:1 },
  { id:'firstHarvest',    name:'First Harvest',        desc:'Harvest your first crop',                        category:'farming',     stars:1 },
  { id:'harvest100',      name:'Busy Hands',           desc:'Harvest 100 crops',                              category:'farming',     stars:2 },
  { id:'harvest1000',     name:'Seasoned Farmer',      desc:'Harvest 1,000 crops',                            category:'farming',     stars:3 },
  { id:'harvest10000',    name:'Master of the Land',   desc:'Harvest 10,000 crops',                           category:'farming',     stars:4 },
  { id:'allBasicSeeds',   name:'Basic Botanist',       desc:'Plant every basic seed type',                    category:'farming',     stars:2 },
  { id:'allSeeds',        name:'Full Bloom',           desc:'Plant every seed type in the game',              category:'farming',     stars:4 },
  { id:'fertilizeAll',    name:'Rich Soil',            desc:'Fertilize every plot simultaneously',            category:'farming',     stars:3 },
  // TRADING
  { id:'first100',        name:'Pocket Change',        desc:'Earn 100 coins',                                 category:'trading',     stars:1 },
  { id:'first1k',         name:'Small Fortune',        desc:'Earn 1,000 coins total',                         category:'trading',     stars:1 },
  { id:'first10k',        name:'Growing Wealth',       desc:'Earn 10,000 coins total',                        category:'trading',     stars:2 },
  { id:'first100k',       name:'Prosperous',           desc:'Earn 100,000 coins total',                       category:'trading',     stars:2 },
  { id:'first1m',         name:'Gold Baron',           desc:'Earn 1,000,000 coins total',                     category:'trading',     stars:3 },
  { id:'first10m',        name:'Tycoon',               desc:'Earn 10,000,000 coins total',                    category:'trading',     stars:4 },
  { id:'first1b',         name:'Legendary Merchant',   desc:'Earn 1,000,000,000 coins total',                 category:'trading',     stars:5 },
  { id:'sellCrafted10',   name:'Value Added',          desc:'Sell 10 crafted items',                          category:'trading',     stars:2 },
  // SURVIVAL
  { id:'firstCrow',       name:'Bird Watch',           desc:'Survive your first crow attack',                 category:'survival',    stars:1 },
  { id:'survive10Crows',  name:'Scarecrow',            desc:'Survive 10 crow or hawk attacks',                category:'survival',    stars:2 },
  { id:'clearWeed',       name:'Weed Puller',          desc:'Clear your first weed',                          category:'survival',    stars:1 },
  { id:'clear50Weeds',    name:'Garden Keeper',        desc:'Clear 50 weeds total',                           category:'survival',    stars:3 },
  { id:'surviveLocust',   name:'Against the Swarm',    desc:'Survive a locust swarm',                         category:'survival',    stars:3 },
  { id:'cureRot',         name:'Plant Doctor',         desc:'Cure root rot on a crop',                        category:'survival',    stars:2 },
  { id:'surviveStage3',   name:"Nature's Wrath",       desc:'Reach Stage 3 and survive a blight storm',       category:'survival',    stars:4 },
  // CRAFTING
  { id:'firstCraft',      name:'Home Cook',            desc:'Craft your first item',                          category:'crafting',    stars:1 },
  { id:'craft10',         name:'Regular Chef',         desc:'Craft 10 items',                                 category:'crafting',    stars:2 },
  { id:'craft100',        name:'Master Crafter',       desc:'Craft 100 items',                                category:'crafting',    stars:3 },
  { id:'craftAll',        name:'Full Menu',            desc:'Craft every available recipe at least once',     category:'crafting',    stars:3 },
  // PRESTIGE
  { id:'firstPrestige',   name:'Reborn',               desc:'Prestige for the first time',                    category:'prestige',    stars:3 },
  { id:'prestige5',       name:'Cycle of Life',        desc:'Prestige 5 times',                               category:'prestige',    stars:4 },
  { id:'prestige10',      name:'Eternal Farmer',       desc:'Prestige 10 times',                              category:'prestige',    stars:5 },
  // EXPLORATION
  { id:'stage1',          name:'Awakening',            desc:'Reach Stage 1',                                  category:'exploration', stars:1 },
  { id:'stage2',          name:'Flourishing',          desc:'Reach Stage 2',                                  category:'exploration', stars:2 },
  { id:'stage3',          name:'Abundance',            desc:'Reach Stage 3',                                  category:'exploration', stars:3 },
  { id:'stage4',          name:'Legacy',               desc:'Reach Stage 4',                                  category:'exploration', stars:4 },
  { id:'stage5',          name:'Transcendence',        desc:'Reach Stage 5',                                  category:'exploration', stars:5 },
  { id:'expandPlot',      name:'More Room',            desc:'Expand your farm for the first time',            category:'exploration', stars:2 },
  { id:'buyBag',          name:'Mystery Box',          desc:'Purchase your first seed bag',                   category:'exploration', stars:1 },
];

window.RECIPES = [
  { id: 'bread',        name: 'Bread',         emoji: '🍞', ingredients: { wheat: 3 },                    sellValue: 80,  unlocked: true },
  { id: 'carrotStew',   name: 'Carrot Stew',   emoji: '🍲', ingredients: { carrot: 4, potato: 1 },        sellValue: 120, unlocked: true },
  { id: 'sunflowerOil', name: 'Sunflower Oil',  emoji: '🫙', ingredients: { sunflower: 3 },                sellValue: 200, unlocked: true },
];
