// ══════════════════════════════
// LOG & BANNER
// ══════════════════════════════
var logEntries = [];
function log(msg) {
  logEntries.push(msg);
  if (logEntries.length > 60) logEntries.shift();
  RenderHUD.renderLog(msg);
}

function showBanner(text) {
  const existing = document.querySelector('.world-banner');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'world-banner';
  el.textContent = text;
  document.body.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 4200);
}

function applyPanelState() {
  const w = panelExpanded ? panelWidth + 'px' : '24px';
  document.body.style.setProperty('--pw', w);
  document.getElementById('panel-arrow').textContent = panelExpanded ? '›' : '‹';
  if (state.upgrades.windUpCrank) RenderSellbox.positionCrank();
}

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

  function setupUI() {
    const panelTabEl = document.getElementById('panel-tab');
    const panelEl    = document.getElementById('panel');
    panelTabEl.addEventListener('mousedown', e => {
      resizing = true; resizeStartX = e.clientX; resizeStartW = panelWidth; resizeMoved = false;
      panelEl.classList.add('resizing'); e.preventDefault(); e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (!resizing) return;
      const dx = resizeStartX - e.clientX;
      if (Math.abs(dx) > 4) resizeMoved = true;
      if (resizeMoved && panelExpanded) {
        panelWidth = Math.max(160, Math.min(400, resizeStartW + dx));
        document.body.style.setProperty('--pw', panelWidth + 'px');
        if (state.upgrades.windUpCrank) RenderSellbox.positionCrank();
      }
    });
    document.addEventListener('mouseup', e => {
      if (!resizing) return;
      resizing = false; panelEl.classList.remove('resizing');
      if (!resizeMoved) { panelExpanded = !panelExpanded; applyPanelState(); }
      save();
    });
    document.addEventListener('mousedown', () => { if (!drag && !resizing) deselect(); hideTileMenu(); });
    window.addEventListener('resize', () => { if (state.upgrades.windUpCrank) RenderSellbox.positionCrank(); });

    (function () {
      const btn              = document.getElementById('settings-btn');
      const backdrop         = document.getElementById('settings-backdrop');
      const panel            = document.getElementById('settings-panel');
      const resetBtn         = document.getElementById('reset-btn');
      const hideBoughtToggle = document.getElementById('hide-bought-toggle');
      let confirmed = false;

      function openSettings()  { confirmed = false; resetBtn.textContent = 'Reset Data'; hideBoughtToggle.checked = !!state.hideBoughtUpgrades; backdrop.style.display = 'block'; panel.style.display = 'block'; }
      function closeSettings() { confirmed = false; resetBtn.textContent = 'Reset Data'; backdrop.style.display = 'none';  panel.style.display = 'none'; }

      hideBoughtToggle.addEventListener('change', () => { state.hideBoughtUpgrades = hideBoughtToggle.checked; RenderPanel.renderUpgrades(); save(); });
      btn.addEventListener('click',      e => { e.stopPropagation(); openSettings(); });
      backdrop.addEventListener('click', closeSettings);
      panel.addEventListener('click',    e => e.stopPropagation());
      resetBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirmed) { confirmed = true; resetBtn.textContent = 'Are you sure?'; }
        else { localStorage.clear(); location.reload(); }
      });
    }());
  }

  return { renderCoin, renderStage, renderLog, setupUI };
})();
