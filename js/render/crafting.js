window.RenderCrafting = (() => {
  const _craftCards = new Map(); // recipeId → { card, btn, ingSpans }
  let _craftingEl = null;

  function buildCrafting() {
    _craftingEl = document.getElementById('crafting-list');
    if (!_craftingEl) return;
    (window.RECIPES || []).forEach(recipe => {
      if (!recipe.unlocked) return;
      const card    = mk('div', 'upgrade-card');
      const nameDiv = mk('div', 'ug-name'); nameDiv.textContent = `${recipe.emoji} ${recipe.name}`;
      const ingDiv  = mk('div', 'ug-desc');
      const ingSpans = {};
      Object.entries(recipe.ingredients).forEach(([cropId, needed], i) => {
        if (i > 0) ingDiv.appendChild(document.createTextNode(' · '));
        const span = mk('span', '');
        ingSpans[cropId] = { span, needed };
        ingDiv.appendChild(span);
      });
      const botDiv   = mk('div', 'ug-bottom');
      const costSpan = mk('span', 'ug-cost');
      costSpan.innerHTML = `${coinHTML()}${formatNumber(recipe.sellValue)}`;
      botDiv.appendChild(costSpan);
      const btn = mk('button', 'ug-btn');
      btn.textContent = 'Craft';
      btn.addEventListener('click', e => { e.stopPropagation(); window.craftItem(recipe.id); });
      botDiv.appendChild(btn);
      card.appendChild(nameDiv); card.appendChild(ingDiv); card.appendChild(botDiv);
      const tipLines = Object.entries(recipe.ingredients)
        .map(([cropId, needed]) => `${SEEDS[cropId] ? SEEDS[cropId].icon + ' ' + SEEDS[cropId].name : cropId}: ${needed}`)
        .join(', ');
      card.title = `${recipe.name}: ${tipLines} → 🪙${formatNumber(recipe.sellValue)}`;
      _craftingEl.appendChild(card);
      _craftCards.set(recipe.id, { card, btn, ingSpans });
    });
  }

  function renderCraftingPanel() {
    if (!_craftingEl) buildCrafting();
    _craftCards.forEach(({ btn, ingSpans }, recipeId) => {
      const recipe = (window.RECIPES || []).find(r => r.id === recipeId);
      if (!recipe) return;
      let canCraft = true;
      Object.entries(ingSpans).forEach(([cropId, { span, needed }]) => {
        const held = state.inventory[cropId] || 0;
        const seed = SEEDS[cropId];
        span.textContent = `${seed ? seed.icon : '?'} ${held}/${needed}`;
        span.style.color = held >= needed ? '#8de88d' : 'rgba(255,255,255,0.45)';
        if (held < needed) canCraft = false;
      });
      btn.disabled = !canCraft;
      btn.style.background = canCraft ? '#3a7a3a' : '';
    });
  }

  return { renderCraftingPanel };
})();
