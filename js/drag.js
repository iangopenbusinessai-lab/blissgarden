// ══════════════════════════════
// DRAG ENTRY-POINTS
// ══════════════════════════════
Object.defineProperty(window, 'drag', {
  get() { return STATE.session.dragItem; },
  set(v) { STATE.session.dragItem = v; },
});

function startDrag(seed, source, bonus = 1.0, drowned = false, fungal = false) {
  deselect();
  DragSystem.start({ seed, source, bonus, drowned, fungal },
    makeSpriteDiv(seed, source === 'seedInventory' ? 'seed' : 'grown', 64));
}
function startItemDrag(itemType) {
  deselect();
  const sp = document.createElement('span');
  sp.style.cssText = 'font-size:38px;line-height:1;display:block;pointer-events:none';
  sp.textContent = ITEM_ICONS[itemType] || '❓';
  DragSystem.start({ itemType, source: 'inventory-item', seed: null, bonus: 1, drowned: false }, sp);
}
function endDrag() { DragSystem.end(); }
function moveGhost(x, y) {
  const g = document.getElementById('ghost');
  if (g) { g.style.left = x + 'px'; g.style.top = y + 'px'; }
}

// DragSystem owns the ghost element, active drag state (STATE.session.dragItem),
// and all document-level drag events. Game code calls DragSystem.start() to
// begin a drag and DragSystem.register() to declare drop handlers.
window.DragSystem = (() => {
  // handlers[sourceType][targetType] = fn(dragItem, targetEl, event)
  const handlers = {};

  function ghost() { return document.getElementById('ghost'); }
  function tileEls() { return RenderFarm.tileNodes; }
  function hit(x, y, el) {
    const r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
  function clearHighlights() {
    tileEls().forEach(t => t.classList.remove('drop-hi'));
    const panel   = document.getElementById('panel');
    const sellBox = document.getElementById('sell-box');
    if (panel)   panel.classList.remove('drop-hi');
    if (sellBox) sellBox.classList.remove('drop-hi');
  }

  // ── Document events ──────────────────────────────────────────────────────
  function onMove(e) {
    const item = STATE.session.dragItem;
    if (!item) return;
    const g = ghost();
    g.style.left = e.clientX + 'px';
    g.style.top  = e.clientY + 'px';
    clearHighlights();

    const panel   = document.getElementById('panel');
    const sellBox = document.getElementById('sell-box');

    if (item.source === 'shop' || item.source === 'seedInventory') {
      tileEls().forEach(t => {
        const i = parseInt(t.dataset.idx);
        if (!state.tiles[i]
          && !(state.weeds        && state.weeds[i]        !== undefined)
          && !(state.thornedWeeds && state.thornedWeeds[i] !== undefined)
          && !(state.mounds       && state.mounds[i]       !== undefined)
          && !(state.rotTiles     && state.rotTiles[i]     && state.rotTiles[i].deadAt !== undefined)
          && hit(e.clientX, e.clientY, t))
          t.classList.add('drop-hi');
      });

    } else if (item.source === 'inventory-item') {
      tileEls().forEach(t => {
        if (!hit(e.clientX, e.clientY, t)) return;
        const i = parseInt(t.dataset.idx);
        const blocked = (state.weeds && state.weeds[i] !== undefined)
          || (state.thornedWeeds && state.thornedWeeds[i] !== undefined)
          || (state.mounds       && state.mounds[i]       !== undefined)
          || (state.rotTiles     && state.rotTiles[i]     && state.rotTiles[i].deadAt !== undefined);
        if (blocked) return;
        const td = state.tiles[i];
        const it = item.itemType;
        let valid = false;
        if (it === 'water')        valid = !!(td && !isReady(td, i));
        if (it === 'cage')         valid = !state.cages.includes(i);
        if (it === 'fertilizer')   valid = !(state.fertilizedTiles?.[i]) && !(state.uncommonFertilizedTiles?.[i]);
        if (it === 'uncommonFert') valid = !(state.uncommonFertilizedTiles?.[i]);
        if (valid) t.classList.add('drop-hi');
      });

    } else {
      if (hit(e.clientX, e.clientY, sellBox))                          sellBox.classList.add('drop-hi');
      else if (panelExpanded && hit(e.clientX, e.clientY, panel))      panel.classList.add('drop-hi');
    }
  }

  document.addEventListener('mouseup', e => {
    const item = STATE.session.dragItem;
    if (!item) return;

    const panel   = document.getElementById('panel');
    const sellBox = document.getElementById('sell-box');
    const { seed, source, bonus, drowned } = item;

    // ── Fire registered handler if any ──
    let handled = false;
    if (handlers[source]) {
      tileEls().forEach(t => {
        if (handled) return;
        if (hit(e.clientX, e.clientY, t) && handlers[source].tile) {
          handlers[source].tile(item, t, e);
          handled = true;
        }
      });
      if (!handled && hit(e.clientX, e.clientY, sellBox) && handlers[source]['sell-box']) {
        handlers[source]['sell-box'](item, sellBox, e);
        handled = true;
      }
      if (!handled && panelExpanded && hit(e.clientX, e.clientY, panel) && handlers[source].panel) {
        handlers[source].panel(item, panel, e);
        handled = true;
      }
      if (!handled && handlers[source].body) {
        handlers[source].body(item, null, e);
        handled = true;
      }
    }

    // ── Built-in fallback logic (matches original index.html behaviour) ──
    if (!handled) {
      if (source === 'inventory-item') {
        // Tile drops are handled by the registered DragSystem handler.
        // This fallback only runs when the drop missed all targets — restore
        // charges that were deducted on mousedown (water and cage only;
        // fertilizer/uncommonFert are never deducted until the drop confirms).
        const it = item.itemType;
        if (it === 'water')     state.canCharges++;
        else if (it === 'cage') state.cageCount++;
        RenderPanel.renderInventory(); RenderPanel.renderItems();

      } else if (source === 'seedInventory') {
        let planted = false;
        tileEls().forEach(t => {
          if (planted) return;
          const i = parseInt(t.dataset.idx);
          if (!state.tiles[i]
            && !(state.weeds        && state.weeds[i]        !== undefined)
            && !(state.thornedWeeds && state.thornedWeeds[i] !== undefined)
            && !(state.mounds       && state.mounds[i]       !== undefined)
            && !(state.rotTiles     && state.rotTiles[i]     && state.rotTiles[i].deadAt !== undefined)
            && hit(e.clientX, e.clientY, t)) {
            state.tiles[i] = { seed, plantedAt: Date.now() };
            Audio.playPlant();
            const tr = t.getBoundingClientRect();
            Particles.dirtPuff(tr.left + tr.width / 2, tr.top + tr.height / 2);
            RenderFarm.renderTile(i); save();
            log(`🌱 Planted ${SEEDS[seed].name}`);
            planted = true;
          }
        });
        if (!planted) {
          if (!state.seedInventory) state.seedInventory = {};
          state.seedInventory[seed] = (state.seedInventory[seed] || 0) + 1;
          RenderPanel.renderInventory(); save();
        }

      } else {
        if (hit(e.clientX, e.clientY, sellBox)) {
          addToSellQueue(seed, bonus || 1.0, drowned || false, item.fungal || false);
        } else if (panelExpanded && hit(e.clientX, e.clientY, panel)) {
          addInventory(seed); RenderPanel.renderInventory(); save();
        } else {
          dropLoose(seed, e.clientX, e.clientY, bonus || 1.0, drowned || false, item.fungal || false);
        }
      }
    }

    DragSystem.end();
  });

  // ── Public API ──────────────────────────────────────────────────────────
  return {
    start(dragItem, ghostContent) {
      STATE.session.dragItem = dragItem;
      const g = ghost();
      g.innerHTML = '';
      if (ghostContent) g.appendChild(ghostContent);
      g.style.display = 'block';
      document.addEventListener('mousemove', onMove);
    },

    end() {
      STATE.session.dragItem = null;
      ghost().style.display = 'none';
      clearHighlights();
      document.removeEventListener('mousemove', onMove);
    },

    // register(sourceType, targetType, handler)
    // handler(dragItem, targetEl, event) — return value ignored
    register(sourceType, targetType, handler) {
      if (!handlers[sourceType]) handlers[sourceType] = {};
      handlers[sourceType][targetType] = handler;
    },
  };
})();

// ── Inventory-item → farm tile handler ──────────────────────────────────────
// Handles ALL inventory-item drops on tiles.
// Fertilizer charges are deducted HERE (not on mousedown) so a mere click
// on the inventory icon never applies the item.
DragSystem.register('inventory-item', 'tile', (item, tileEl) => {
  const it = item.itemType;
  const i  = parseInt(tileEl.dataset.idx);
  const td = state.tiles[i];

  const blocked = (state.weeds && state.weeds[i] !== undefined)
    || (state.thornedWeeds && state.thornedWeeds[i] !== undefined)
    || (state.mounds       && state.mounds[i]       !== undefined)
    || (state.rotTiles     && state.rotTiles[i]     && state.rotTiles[i].deadAt !== undefined);

  if (it === 'water' && td && !isReady(td, i) && !blocked) {
    applyWater(i);

  } else if (it === 'cage' && !state.cages.includes(i) && !blocked) {
    state.cages.push(i);
    log('🔒 Cage placed on tile');
    RenderFarm.renderTile(i); RenderPanel.renderInventory(); RenderPanel.renderItems(); save();

  } else if (it === 'fertilizer'
    && !(state.fertilizedTiles?.[i])
    && !(state.uncommonFertilizedTiles?.[i])
    && !blocked
    && (state.fertCharges || 0) >= 1) {
    if (!state.fertilizedTiles) state.fertilizedTiles = {};
    const oldFF = fertFactor(i);
    state.fertilizedTiles[i] = true;
    state.fertCharges--;
    const newFF = fertFactor(i);
    if (td && !isReady(td, i)) {
      const base = SEEDS[td.seed].grow, gm = STATE.modifiers.growSpeed, wf = waterFactor(i);
      const oldGT = base * gm * wf * oldFF, newGT = base * gm * wf * newFF;
      if (oldGT > 0) {
        const elapsed = (Date.now() - td.plantedAt) / 1000;
        const newRem  = Math.max(0, oldGT - elapsed) * (newGT / oldGT);
        td.plantedAt  = Date.now() - (newGT - newRem) * 1000;
      }
    }
    log('🌿 Plot fertilized — crops grow 25% faster here');
    RenderFarm.renderTile(i); RenderPanel.renderInventory(); RenderPanel.renderItems(); save();

  } else if (it === 'uncommonFert'
    && !(state.uncommonFertilizedTiles?.[i])
    && !blocked
    && (state.uncommonFertCharges || 0) >= 1) {
    if (!state.uncommonFertilizedTiles) state.uncommonFertilizedTiles = {};
    const oldFF = fertFactor(i);
    state.uncommonFertilizedTiles[i] = true;
    state.uncommonFertCharges--;
    const newFF = fertFactor(i);
    if (td && !isReady(td, i)) {
      const base = SEEDS[td.seed].grow, gm = STATE.modifiers.growSpeed, wf = waterFactor(i);
      const oldGT = base * gm * wf * oldFF, newGT = base * gm * wf * newFF;
      if (oldGT > 0) {
        const elapsed = (Date.now() - td.plantedAt) / 1000;
        const newRem  = Math.max(0, oldGT - elapsed) * (newGT / oldGT);
        td.plantedAt  = Date.now() - (newGT - newRem) * 1000;
      }
    }
    log('⚗️ Plot uncommon fertilized — crops grow 40% faster here');
    RenderFarm.renderTile(i); RenderPanel.renderInventory(); RenderPanel.renderItems(); save();

  } else {
    // Invalid drop — restore charges deducted on mousedown (water, cage only)
    if (it === 'water')     state.canCharges++;
    else if (it === 'cage') state.cageCount++;
    RenderPanel.renderInventory(); RenderPanel.renderItems();
  }
});
