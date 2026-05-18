window.craftItem = function craftItem(recipeId) {
  const recipe = window.RECIPES && window.RECIPES.find(r => r.id === recipeId);
  if (!recipe) return;

  for (const [cropId, needed] of Object.entries(recipe.ingredients)) {
    if ((state.inventory[cropId] || 0) < needed) return;
  }

  for (const [cropId, needed] of Object.entries(recipe.ingredients)) {
    state.inventory[cropId] -= needed;
    if (state.inventory[cropId] <= 0) delete state.inventory[cropId];
  }

  if (!state.craftedInventory) state.craftedInventory = {};
  state.craftedInventory[recipeId] = (state.craftedInventory[recipeId] || 0) + 1;
  state.stats.totalCrafted = (state.stats.totalCrafted || 0) + 1;
  if (!state.stats.recipesEverCrafted) state.stats.recipesEverCrafted = {};
  state.stats.recipesEverCrafted[recipeId] = true;

  EventBus.emit('item:crafted', { recipeId });
  if (typeof checkAchievements === 'function') checkAchievements();
  DIRTY.panel = true;
  RenderPanel.renderCrafting();
  RenderPanel.renderInventory();
  log(`${recipe.emoji} Crafted ${recipe.name}!`);
  save();
};
