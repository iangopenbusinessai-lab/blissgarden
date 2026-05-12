window.RenderHUD = (() => {
  function renderCoin() {
    document.getElementById('coin-count').textContent = state.coins;
  }

  function renderStage() {
    const s = getCurrentStage();
    document.getElementById('stage-display').textContent = `Stage ${s.stage}: ${s.name}`;
  }

  function renderLog(msg) {
    const inner = document.getElementById('log-inner');
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = msg;
    inner.appendChild(line);
    while (inner.children.length > 60) inner.removeChild(inner.firstChild);
    inner.scrollTop = inner.scrollHeight;
  }

  return { renderCoin, renderStage, renderLog };
})();
