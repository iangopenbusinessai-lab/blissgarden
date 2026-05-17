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

  // ── Debug panel state ───────────────────────────────────────────────────────
  let _coinEditActive  = false;
  let _debugPanelEl    = null;
  let _debugBodyEl     = null;
  let _debugInterval   = null;

  // ── Core renders ────────────────────────────────────────────────────────────
  function renderCoin() {
    const el = document.getElementById('coin-count');
    if (el) el.textContent = state.coins;
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

  // ── Debug: coin inline-edit ──────────────────────────────────────────────────
  function _startCoinEdit() {
    if (_coinEditActive) return;
    _coinEditActive = true;
    const display = document.getElementById('coin-count');
    const input = document.createElement('input');
    input.type = 'number';
    input.value = state.coins;
    input.style.cssText = 'width:72px;font-size:13px;font-weight:700;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:4px;padding:1px 5px;outline:none';
    display.style.display = 'none';
    display.parentNode.insertBefore(input, display.nextSibling);
    input.focus(); input.select();

    function endEdit() {
      if (!_coinEditActive) return;
      _coinEditActive = false;
      const val = parseInt(input.value);
      if (!isNaN(val) && val >= 0) {
        state.coins = val;
        STATE.meta.gold = val;
      }
      input.remove();
      display.style.display = '';
      renderCoin();
      updateCoins();
      save();
    }
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); endEdit(); } });
    input.addEventListener('blur', endEdit);
  }

  // ── Debug: panel build & update ─────────────────────────────────────────────
  function _buildDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = [
      'position:fixed;top:60px;right:240px',
      'background:rgba(8,8,18,.93)',
      'color:#b8c8d8;font-family:monospace;font-size:11px;line-height:1.65',
      'border:1px solid rgba(255,255,255,.13);border-radius:7px',
      'min-width:270px;z-index:9998;user-select:none',
    ].join(';');

    // Title bar
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:rgba(255,255,255,.06);border-radius:7px 7px 0 0;cursor:move;font-weight:700;color:#fff;font-size:12px';
    bar.innerHTML = '🖥️&nbsp;Debug Console';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:#888;cursor:pointer;font-size:13px;padding:0 0 0 8px;line-height:1';
    closeBtn.addEventListener('click', e => { e.stopPropagation(); _closeDebugPanel(); });
    bar.appendChild(closeBtn);
    panel.appendChild(bar);

    // Body
    const body = document.createElement('div');
    body.style.cssText = 'padding:8px 12px 10px';
    panel.appendChild(body);

    // Drag
    let dragDx = 0, dragDy = 0, dragging = false;
    bar.addEventListener('mousedown', e => {
      if (e.target === closeBtn) return;
      dragging = true;
      dragDx = e.clientX - panel.offsetLeft;
      dragDy = e.clientY - panel.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      panel.style.left  = (e.clientX - dragDx) + 'px';
      panel.style.top   = (e.clientY - dragDy) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    document.body.appendChild(panel);
    _debugPanelEl = panel;
    _debugBodyEl  = body;
  }

  function _updateDebugPanel() {
    if (!_debugBodyEl) return;
    const m  = STATE.modifiers;
    const dc = STATE.session.debugCounts;
    const s  = getCurrentStage();

    const TIMERS = [
      { id:'crow',     label:'Crow',       stage:1 },
      { id:'weed',     label:'Weed',       stage:1 },
      { id:'hawk',     label:'Hawk',       stage:2 },
      { id:'mole',     label:'Mole',       stage:2 },
      { id:'rootRot',  label:'Root Rot',   stage:3 },
      { id:'locust',   label:'Locust',     stage:3 },
      { id:'blight',   label:'Blight',     stage:3 },
      { id:'fungal',   label:'Fungal',     stage:3 },
    ];

    const h = (label, color) =>
      `<div style="color:${color || '#6af'};font-weight:700;margin:6px 0 2px">${label}</div>`;
    const row = (k, v) =>
      `<div><span style="color:#778">${k}:</span> ${v}</div>`;

    let html = '';
    html += h('TIMING');
    html += row('Sell interval',     Math.round(m.sellInterval) + 'ms');
    html += row('Crank multiplier',  STATE.session.crankMultiplier.toFixed(3) + 'x');
    html += row('Grow speed',        m.growSpeed.toFixed(3) + 'x');
    html += row('Sell value',        m.sellValue.toFixed(3) + 'x');
    html += row('Sell box capacity', m.sellBoxCapacity);

    html += h('STAGE &amp; STATE');
    html += row('Stage',         `${s.stage} — ${s.name}`);
    html += row('Mature',        String(!!state.mature));
    html += row('All-time gold', (state.coinsEarned || 0).toLocaleString());

    html += h('EVENT TIMERS');
    TIMERS.forEach(({ id, label, stage: req }) => {
      const rem = TimerManager.getRemaining(id);
      html += row(label, `${rem}ms <span style="color:#445">(stage ${req}+)</span>`);
    });

    html += h('OCCURRENCES');
    html += row('Crow attacks',   dc.crow);
    html += row('Hawk attacks',   dc.hawk);
    html += row('Weeds spawned',  dc.weed);
    html += row('Moles',          dc.mole);
    html += row('Root rot',       dc.rootRot);
    html += row('Locust swarms',  dc.locust);
    html += row('Blight storms',  dc.blight);
    html += row('Fungal blooms',  dc.fungal);

    _debugBodyEl.innerHTML = html;
  }

  function _openDebugPanel() {
    if (!_debugPanelEl) _buildDebugPanel();
    _debugPanelEl.style.display = '';
    _updateDebugPanel();
    _debugInterval = setInterval(_updateDebugPanel, 50);
  }

  function _closeDebugPanel() {
    if (_debugPanelEl) _debugPanelEl.style.display = 'none';
    if (_debugInterval) { clearInterval(_debugInterval); _debugInterval = null; }
  }

  function _toggleDebugPanel() {
    if (_debugPanelEl && _debugPanelEl.style.display !== 'none') {
      _closeDebugPanel();
    } else {
      _openDebugPanel();
    }
  }

  // ── applyDebugMode: called on toggle and after load ──────────────────────────
  function applyDebugMode() {
    const on  = STATE.settings.debugMode;
    const ico = document.getElementById('debug-console-icon');
    if (ico) ico.style.display = on ? '' : 'none';
    if (!on) _closeDebugPanel();
  }

  // ── setupUI ──────────────────────────────────────────────────────────────────
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

    // ── Debug: console icon ──
    const dbgIcon = document.createElement('span');
    dbgIcon.id = 'debug-console-icon';
    dbgIcon.textContent = '🖥️';
    dbgIcon.title = 'Debug Console';
    dbgIcon.style.cssText = 'margin-left:7px;cursor:pointer;font-size:14px;display:none;line-height:1;vertical-align:middle';
    document.getElementById('coins').appendChild(dbgIcon);
    dbgIcon.addEventListener('click', e => { e.stopPropagation(); _toggleDebugPanel(); });

    // ── Debug: coin edit on click ──
    document.getElementById('coin-count').style.cursor = 'default';
    document.getElementById('coin-count').addEventListener('click', () => {
      if (STATE.settings.debugMode) _startCoinEdit();
    });

    // ── Settings panel ──
    (function () {
      const btn              = document.getElementById('settings-btn');
      const backdrop         = document.getElementById('settings-backdrop');
      const panel            = document.getElementById('settings-panel');
      const resetBtn         = document.getElementById('reset-btn');
      const hideBoughtToggle = document.getElementById('hide-bought-toggle');
      const debugModeToggle  = document.getElementById('debug-mode-toggle');
      let confirmed = false;

      function openSettings() {
        confirmed = false;
        resetBtn.textContent = 'Reset Data';
        hideBoughtToggle.checked = !!state.hideBoughtUpgrades;
        debugModeToggle.checked  = !!STATE.settings.debugMode;
        backdrop.style.display = 'block';
        panel.style.display = 'block';
      }
      function closeSettings() {
        confirmed = false;
        resetBtn.textContent = 'Reset Data';
        backdrop.style.display = 'none';
        panel.style.display = 'none';
      }

      hideBoughtToggle.addEventListener('change', () => {
        state.hideBoughtUpgrades = hideBoughtToggle.checked;
        RenderPanel.renderUpgrades();
        save();
      });
      debugModeToggle.addEventListener('change', () => {
        STATE.settings.debugMode = debugModeToggle.checked;
        applyDebugMode();
        save();
      });
      btn.addEventListener('click',      e => { e.stopPropagation(); openSettings(); });
      backdrop.addEventListener('click', closeSettings);
      panel.addEventListener('click',    e => e.stopPropagation());
      resetBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirmed) { confirmed = true; resetBtn.textContent = 'Are you sure?'; }
        else { localStorage.clear(); location.reload(); }
      });
    }());

    // Apply debug mode state loaded from save
    applyDebugMode();
  }

  return { renderCoin, renderStage, renderLog, setupUI, applyDebugMode };
})();
