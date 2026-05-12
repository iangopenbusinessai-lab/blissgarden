window.RenderSellbox = (() => {
  function updateBoxStyle() {
    const sb = document.getElementById('sell-box');
    if (!sb) return;
    sb.classList.remove('iron','steel','titanium','diamond');
    if (state.upgrades.diamondSellBox)       sb.classList.add('diamond');
    else if (state.upgrades.titaniumSellBox) sb.classList.add('titanium');
    else if (state.upgrades.steelSellBox)    sb.classList.add('steel');
    else if (state.upgrades.ironSellBox)     sb.classList.add('iron');
  }

  function renderQueue() {
    const qRow = document.getElementById('sell-queue-row');
    if (!qRow) return;
    qRow.innerHTML = '';
    state.sellQueue.forEach((item, idx) => {
      const s = mk('span','sq-icon');
      s.appendChild(makeSpriteDiv(item.seed, 'grown', 24));
      s.addEventListener('mousedown', e => {
        if (drag) return;
        e.stopPropagation();
        state.sellQueue.splice(idx, 1);
        if (idx === 0 && state.sellQueue.length > 0) state.sellNextAt = Date.now() + getSellInterval();
        else if (state.sellQueue.length === 0)        state.sellNextAt = 0;
        renderQueue(); save();
        startDrag(item.seed, 'sell-queue', item.bonus || 1.0, item.drowned || false);
        moveGhost(e.clientX, e.clientY);
      });
      qRow.appendChild(s);
    });
    updateSellTimer();
    updateBoxStyle();
  }

  function updateSellTimer() {
    const cd = document.getElementById('sell-cd');
    if (!cd) return;
    if (!state.sellQueue.length || !state.sellNextAt) { cd.textContent = ''; return; }
    cd.textContent = fmt(Math.max(0, (state.sellNextAt - Date.now()) / 1000));
  }

  function positionCrank() {
    const box = document.getElementById('crank-box');
    const sb  = document.getElementById('sell-box');
    if (!box || !sb) return;
    const r = sb.getBoundingClientRect();
    box.style.left = (r.right + 10) + 'px';
  }

  function renderCrank() {
    const box = document.getElementById('crank-box');
    if (!box) return;
    if (!state.upgrades.windUpCrank) { box.style.display = 'none'; return; }
    box.style.display = 'flex';
    document.getElementById('crank-label').textContent = '⚙️ ' + crankMult.toFixed(2) + 'x';
    box.classList.remove('iron','steel','titanium','diamond');
    if (state.upgrades.diamondCrank)       box.classList.add('diamond');
    else if (state.upgrades.titaniumCrank) box.classList.add('titanium');
    else if (state.upgrades.steelCrank)    box.classList.add('steel');
    else if (state.upgrades.ironCrank)     box.classList.add('iron');
    positionCrank();
  }

  function updateCrankLabel() {
    if (!state.upgrades.windUpCrank) return;
    const lbl = document.getElementById('crank-label');
    if (lbl) lbl.textContent = '⚙️ ' + crankMult.toFixed(2) + 'x';
  }

  function renderWell() {
    const w = document.getElementById('well');
    if (w) w.style.display = 'none';
  }

  return { renderQueue, renderCrank, renderWell, updateBoxStyle, positionCrank, updateSellTimer, updateCrankLabel };
})();
