function applyPanelState() {
  const panelEl  = document.getElementById('panel');
  const backdrop = document.getElementById('panel-backdrop');
  if (!panelEl) return;
  panelEl.style.width = panelWidth + 'px';
  if (panelExpanded) {
    panelEl.classList.add('panel-open');
    if (backdrop) backdrop.classList.add('panel-open');
  } else {
    panelEl.classList.remove('panel-open');
    if (backdrop) backdrop.classList.remove('panel-open');
  }
  if (state.upgrades.windUpCrank) RenderSellbox.positionCrank();
}

window.RenderHUD = (() => {
  function renderCoin() {
    const el = document.getElementById('coin-count');
    if (el) el.textContent = state.coins;
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

  return { renderCoin, renderStage, renderTimeOfDay };
})();
