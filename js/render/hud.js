function applyPanelState() {
  const panelEl = document.getElementById('panel');
  if (!panelEl) return;
  panelEl.style.width = panelWidth + 'px';
  const gameArea = document.getElementById('game-area');
  if (gameArea) gameArea.style.right = panelWidth + 'px';
  const topbarRight = document.getElementById('topbar-right');
  if (topbarRight) topbarRight.style.right = (panelWidth + 8) + 'px';
  if (state.upgrades.windUpCrank) RenderSellbox.positionCrank();
}

window.RenderHUD = (() => {
  function renderCoin() {
    const el = document.getElementById('coin-count');
    if (el) el.textContent = formatNumber(state.coins);
  }

  function renderStage() {
    const s = getCurrentStage();
    document.getElementById('stage-display').textContent = `Stage ${s.stage}: ${s.name}`;
  }

  function renderTimeOfDay() {
    const todIcons = { dawn: '🌅', day: '🌞', dusk: '🌆', night: '🌙' };
    const iconEl = document.getElementById('tod-icon');
    if (iconEl) iconEl.textContent = todIcons[STATE.session.timeOfDay] || '🌞';
  }

  function renderReputation() {
    const el = document.getElementById('rep-display');
    if (!el) return;
    const stage = getCurrentStage().stage;
    el.style.display = stage >= 4 ? '' : 'none';
    el.textContent = `⭐ ${STATE.meta.reputation || 0}`;
  }

  return { renderCoin, renderStage, renderTimeOfDay, renderReputation };
})();
