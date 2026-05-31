// ══════════════════════════════
// ARTIFACT PANEL
// ══════════════════════════════
window.RenderArtifacts = (() => {
  let _modalEl = null, _bodyEl = null, _backdropEl = null;
  let _isOpen = false;

  function _build() {
    _backdropEl = document.getElementById('artifacts-backdrop');
    _modalEl    = document.getElementById('artifacts-modal');
    _bodyEl     = document.getElementById('artifacts-modal-body');
    if (!_modalEl) return;
    document.getElementById('artifacts-close-btn').addEventListener('click', close);
    _backdropEl.addEventListener('click', close);
    _modalEl.addEventListener('click', e => e.stopPropagation());
  }

  function open() {
    if (!_modalEl) _build();
    if (!_modalEl) return;
    _isOpen = true;
    _backdropEl.style.display = 'block';
    _modalEl.style.display    = 'flex';
    render();
  }

  function close() {
    if (!_modalEl) return;
    _isOpen = false;
    _backdropEl.style.display = 'none';
    _modalEl.style.display    = 'none';
  }

  function render() {
    if (!_bodyEl || !_isOpen) return;
    _bodyEl.innerHTML = '';

    if (!STATE.upgrades.workshop) {
      const msg = mk('div');
      msg.style.cssText = 'padding:28px 20px;text-align:center;color:rgba(255,255,255,.7)';
      msg.innerHTML =
        '<div style="font-size:2.2rem;margin-bottom:10px">🔨</div>' +
        '<div style="font-size:13px;font-weight:600;color:#fff">Purchase the Workshop Area upgrade to unlock artifacts.</div>' +
        `<div style="margin-top:8px;font-size:12px;color:#f0d080">${coinHTML()}5,000 — available in Upgrades</div>`;
      _bodyEl.appendChild(msg);
      return;
    }

    const craftHeader = mk('div');
    craftHeader.style.cssText = 'padding:10px 16px 6px;font-size:13px;font-weight:700;color:#f0d080';
    craftHeader.textContent = 'Craft Artifacts';
    _bodyEl.appendChild(craftHeader);

    const grid = mk('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:10px;padding:4px 16px 14px';
    _bodyEl.appendChild(grid);

    (window.ARTIFACTS || []).forEach(art => {
      const crafted  = !!STATE.artifacts[art.id];
      const inv      = state.craftedInventory || {};
      const canCraft = !crafted && Object.entries(art.ingredients).every(([k, n]) => (inv[k] || 0) >= n);

      const card = mk('div');
      card.style.cssText =
        `background:${crafted ? 'rgba(180,140,30,.2)' : 'rgba(255,255,255,.06)'};` +
        `border:2px solid ${crafted ? '#c8a820' : 'rgba(255,255,255,.12)'};` +
        `border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px`;

      const top = mk('div'); top.style.cssText = 'display:flex;align-items:center;gap:8px';
      const emojiEl = mk('span'); emojiEl.style.cssText = 'font-size:1.7rem;line-height:1'; emojiEl.textContent = art.emoji;
      const nameEl  = mk('div');  nameEl.style.cssText  = 'font-weight:700;font-size:13px;color:#fff;line-height:1.3'; nameEl.textContent = art.name;
      top.appendChild(emojiEl); top.appendChild(nameEl);
      card.appendChild(top);

      const descEl = mk('div'); descEl.style.cssText = 'font-size:11px;color:rgba(255,255,255,.7);line-height:1.4'; descEl.textContent = art.desc;
      card.appendChild(descEl);

      const ingList = mk('div'); ingList.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
      Object.entries(art.ingredients).forEach(([k, needed]) => {
        const have   = inv[k] || 0;
        const met    = have >= needed;
        const recipe = (window.RECIPES || []).find(r => r.id === k);
        const tag = mk('span');
        tag.style.cssText =
          `font-size:10px;padding:2px 5px;border-radius:3px;white-space:nowrap;` +
          `background:${met ? 'rgba(80,150,60,.4)' : 'rgba(200,70,40,.35)'};` +
          `color:${met ? '#9ef09e' : '#ffaa90'}`;
        tag.textContent = `${recipe ? recipe.emoji + ' ' : ''}${recipe ? recipe.name : k}: ${have}/${needed}`;
        ingList.appendChild(tag);
      });
      card.appendChild(ingList);

      if (crafted) {
        const badge = mk('div');
        badge.style.cssText = 'font-size:11px;font-weight:700;color:#c8a820;padding:2px 0;text-align:center';
        badge.textContent = '✅ Active';
        card.appendChild(badge);
      } else {
        const btn = mk('button', 'ug-btn');
        btn.textContent = canCraft ? 'Craft' : 'Need more';
        btn.disabled    = !canCraft;
        btn.style.cssText = `width:100%;margin-top:2px${canCraft ? ';background:#5A8A3C' : ''}`;
        btn.addEventListener('click', () => {
          craftArtifact(art.id);
          render();
          if (typeof RenderPanel !== 'undefined') RenderPanel.renderInventory();
        });
        card.appendChild(btn);
      }

      grid.appendChild(card);
    });

    const activeArts = (window.ARTIFACTS || []).filter(a => STATE.artifacts[a.id]);
    if (activeArts.length > 0) {
      const activeHeader = mk('div');
      activeHeader.style.cssText = 'padding:8px 16px 6px;font-size:13px;font-weight:700;color:#8de88d;border-top:1px solid rgba(255,255,255,.1)';
      activeHeader.textContent = 'Active Artifacts';
      _bodyEl.appendChild(activeHeader);

      const list = mk('div'); list.style.cssText = 'padding:2px 16px 14px;display:flex;flex-direction:column;gap:5px';
      activeArts.forEach(art => {
        const row = mk('div'); row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:12px';
        const em = mk('span'); em.style.cssText = 'font-size:1.2rem;line-height:1'; em.textContent = art.emoji;
        const info = mk('div');
        info.innerHTML = `<span style="font-weight:700;color:#fff">${art.name}</span> <span style="color:rgba(255,255,255,.6)">— ${art.desc}</span>`;
        row.appendChild(em); row.appendChild(info);
        list.appendChild(row);
      });
      _bodyEl.appendChild(list);
    }
  }

  function isOpen() { return _isOpen; }

  return { open, close, render, isOpen };
})();
