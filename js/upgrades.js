// Recomputes STATE.modifiers from STATE.upgrades.
// Per-chain: only the highest purchased tier applies — no intra-chain stacking.
// Tile-level modifiers (fertilizer, water) are applied per-crop at grow/sell time.
function recalculateModifiers() {
  const mods = STATE.modifiers;
  const bought = STATE.upgrades;

  let bestSpeed     = null; // smallest mult wins (lower = faster)
  let bestValue     = null; // largest mult wins
  let bestSellSpeed = null; // smallest mult wins

  for (const u of UPGRADES) {
    if (!bought[u.id]) continue;
    if (u.type === 'speed') {
      if (bestSpeed === null || u.mult < bestSpeed) bestSpeed = u.mult;
    } else if (u.type === 'value') {
      if (bestValue === null || u.mult > bestValue) bestValue = u.mult;
    } else if (u.type === 'sellSpeed') {
      if (bestSellSpeed === null || u.mult < bestSellSpeed) bestSellSpeed = u.mult;
    }
  }

  mods.growSpeed    = bestSpeed     ?? 1;
  mods.sellValue    = bestValue     ?? 1;
  mods.sellInterval = bestSellSpeed != null ? 10000 * bestSellSpeed : 10000;

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
  window.dispatchEvent(new CustomEvent('upgrade:purchased', { detail: { id } }));
  save();
}
