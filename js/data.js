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
  solarspike: { name:'Solarspike',    icon:'☀️', seedIcon:'✨', grow:230400, sell:16000000},
};

window.BASIC_SEEDS = ['potato','carrot','wheat','sunflower'];

window.SEED_SELL_PRICES = {
  potato:2, carrot:7, wheat:20, sunflower:60,
  pumpkin:150, chard:150, moonbloom:150,
  starfruit:2500, thornvine:2500, glowshroom:2500,
  voidbloom:35000, aetherfern:35000, solarspike:35000,
};

// ══════════════════════════════
// SEED BAGS
// ══════════════════════════════
window.BAGS = [
  { id:'fieldBag',     name:'Field Bag',     icon:'🎒', cost:1000,
    seeds:['pumpkin','chard','moonbloom'],         odds:[0.70,0.20,0.10] },
  { id:'forestBag',    name:'Forest Bag',    icon:'🌲', cost:50000,
    seeds:['starfruit','thornvine','glowshroom'],  odds:[0.65,0.22,0.13] },
  { id:'celestialBag', name:'Celestial Bag', icon:'✨', cost:800000,
    seeds:['voidbloom','aetherfern','solarspike'], odds:[0.68,0.20,0.12] },
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
window.UPGRADES = [
  // ── SPEED CHAIN ──
  { id:'quickRoots',     name:'Quick Roots',            desc:'Crops grow 25% faster',                              cost:15,      type:'speed',          mult:0.75,  chain:null              },
  { id:'fertilizerI',    name:'Fertilizer I',            desc:'Crops grow 40% faster (stacks)',                     cost:90,      type:'speed',          mult:0.60,  chain:'quickRoots'      },
  { id:'fertilizerII',   name:'Fertilizer II',           desc:'Crops grow 55% faster (stacks)',                     cost:280,     type:'speed',          mult:0.45,  chain:'fertilizerI'     },
  { id:'fertilizerIII',  name:'Fertilizer III',          desc:'Crops grow 70% faster (stacks)',                     cost:600,     type:'speed',          mult:0.30,  chain:'fertilizerII'    },
  { id:'fertilizerIV',   name:'Fertilizer IV',           desc:'Crops grow 80% faster (stacks)',                     cost:1200,    type:'speed',          mult:0.20,  chain:'fertilizerIII'   },
  { id:'fertilizerV',    name:'Fertilizer V',            desc:'Crops grow 90% faster (stacks)',                     cost:3000,    type:'speed',          mult:0.10,  chain:'fertilizerIV'    },
  { id:'fertilizerVI',   name:'Fertilizer VI',           desc:'Crops grow 95% faster (stacks)',                     cost:8000,    type:'speed',          mult:0.05,  chain:'fertilizerV'     },
  { id:'fertilizerVII',  name:'Fertilizer VII',          desc:'Crops grow 97% faster (stacks)',                     cost:25000,   type:'speed',          mult:0.03,  chain:'fertilizerVI'    },
  { id:'fertilizerVIII', name:'Fertilizer VIII',         desc:'Crops grow 98.5% faster (stacks)',                   cost:80000,   type:'speed',          mult:0.015, chain:'fertilizerVII'   },
  { id:'fertilizerIX',   name:'Fertilizer IX',           desc:'Crops grow 99% faster (stacks)',                     cost:300000,  type:'speed',          mult:0.01,  chain:'fertilizerVIII'  },
  { id:'fertilizerX',    name:'Fertilizer X',            desc:'Crops grow 99.5% faster (stacks)',                   cost:1000000, type:'speed',          mult:0.005, chain:'fertilizerIX'    },
  // ── VALUE CHAIN ──
  { id:'goldenHarvest',  name:'Golden Harvest',          desc:'Crops sell for 50% more',                            cost:40,      type:'value',          mult:1.50,  chain:null              },
  { id:'marketEye',      name:'Market Eye',              desc:'Crops sell 75% more (stacks)',                       cost:150,     type:'value',          mult:1.75,  chain:'goldenHarvest'   },
  { id:'merchantTouch',  name:"Merchant's Touch",        desc:'Crops sell 120% more (stacks)',                      cost:400,     type:'value',          mult:2.20,  chain:'marketEye'       },
  { id:'marketMastery',  name:'Market Mastery',          desc:'Crops sell 180% more (stacks)',                      cost:800,     type:'value',          mult:2.80,  chain:'merchantTouch'   },
  { id:'marketPinnacle', name:'Market Pinnacle',         desc:'Crops sell 250% more (stacks)',                      cost:1800,    type:'value',          mult:3.50,  chain:'marketMastery'   },
  { id:'goldenEmpire',   name:'Golden Empire',           desc:'Crops sell 400% more (stacks)',                      cost:5000,    type:'value',          mult:5.00,  chain:'marketPinnacle'  },
  { id:'diamondTrade',   name:'Diamond Trade',           desc:'Crops sell 600% more (stacks)',                      cost:15000,   type:'value',          mult:7.00,  chain:'goldenEmpire'    },
  { id:'platinumExchange',name:'Platinum Exchange',      desc:'Crops sell 900% more (stacks)',                      cost:50000,   type:'value',          mult:10.00, chain:'diamondTrade'    },
  { id:'celestialMarket',name:'Celestial Market',        desc:'Crops sell 1400% more (stacks)',                     cost:150000,  type:'value',          mult:15.00, chain:'platinumExchange'},
  { id:'infiniteHarvest',name:'Infinite Harvest',        desc:'Crops sell 2000% more (stacks)',                     cost:500000,  type:'value',          mult:21.00, chain:'celestialMarket' },
  { id:'godlyYield',     name:'Godly Yield',             desc:'Crops sell 3500% more (stacks)',                     cost:2000000, type:'value',          mult:36.00, chain:'infiniteHarvest' },
  // ── SELL SPEED CHAIN ──
  { id:'swiftMarketI',   name:'Swift Market I',          desc:'Sell interval 25% faster',                           cost:60,      type:'sellSpeed',      mult:0.75,  chain:null              },
  { id:'swiftMarketII',  name:'Swift Market II',         desc:'Sell interval 35% faster (stacks)',                  cost:200,     type:'sellSpeed',      mult:0.65,  chain:'swiftMarketI'    },
  { id:'swiftMarketIII', name:'Swift Market III',        desc:'Sell interval 45% faster (stacks)',                  cost:500,     type:'sellSpeed',      mult:0.55,  chain:'swiftMarketII'   },
  { id:'swiftMarketIV',  name:'Swift Market IV',         desc:'Sell interval 55% faster (stacks)',                  cost:900,     type:'sellSpeed',      mult:0.45,  chain:'swiftMarketIII'  },
  { id:'swiftMarketV',   name:'Swift Market V',          desc:'Sell interval 65% faster (stacks)',                  cost:2000,    type:'sellSpeed',      mult:0.35,  chain:'swiftMarketIV'   },
  { id:'swiftMarketVI',  name:'Swift Market VI',         desc:'Sell interval 72% faster (stacks)',                  cost:6000,    type:'sellSpeed',      mult:0.28,  chain:'swiftMarketV'    },
  { id:'swiftMarketVII', name:'Swift Market VII',        desc:'Sell interval 78% faster (stacks)',                  cost:18000,   type:'sellSpeed',      mult:0.22,  chain:'swiftMarketVI'   },
  { id:'swiftMarketVIII',name:'Swift Market VIII',       desc:'Sell interval 83% faster (stacks)',                  cost:60000,   type:'sellSpeed',      mult:0.17,  chain:'swiftMarketVII'  },
  { id:'swiftMarketIX',  name:'Swift Market IX',         desc:'Sell interval 87% faster (stacks)',                  cost:200000,  type:'sellSpeed',      mult:0.13,  chain:'swiftMarketVIII' },
  { id:'swiftMarketX',   name:'Swift Market X',          desc:'Sell interval 90% faster (stacks)',                  cost:700000,  type:'sellSpeed',      mult:0.10,  chain:'swiftMarketIX'   },
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
