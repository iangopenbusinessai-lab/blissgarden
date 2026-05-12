// Recomputes STATE.modifiers from STATE.upgrades.
// All purchased tiers in a chain multiply together (matches main.js getGrowMult/getSellMult).
// Tile-level modifiers (fertilizer, water) are applied per-crop at grow/sell time.
function recalculateModifiers() {
  const mods = STATE.modifiers;
  const bought = STATE.upgrades;

  let speedMult     = 1;
  let valueMult     = 1;
  let sellSpeedMult = 1;

  for (const u of UPGRADES) {
    if (!bought[u.id]) continue;
    if (u.type === 'speed')          speedMult     *= u.mult;
    else if (u.type === 'value')     valueMult     *= u.mult;
    else if (u.type === 'sellSpeed') sellSpeedMult *= u.mult;
  }

  mods.growSpeed    = speedMult;
  mods.sellValue    = valueMult;
  mods.sellInterval = 10000 * sellSpeedMult;

  if      (bought.diamondSellBox)   mods.sellBoxCapacity = 8;
  else if (bought.titaniumSellBox)  mods.sellBoxCapacity = 5;
  else if (bought.steelSellBox)     mods.sellBoxCapacity = 3;
  else if (bought.ironSellBox)      mods.sellBoxCapacity = 2;
  else                              mods.sellBoxCapacity = 1;
  // crankMultiplier is managed at runtime by the crank mechanism — not touched here.
}

function applyUpgrade(id) {
  STATE.upgrades[id] = true;
  recalculateModifiers();
  EventBus.emit('upgrade:purchased', { id });
  save();
}
