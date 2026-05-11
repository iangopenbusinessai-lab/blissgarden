window.RenderPanel = (() => {

  // ══════════════════════════════════════════════════════════════════════════
  // SEEDS — build once, update button disabled + grow-time text on each call
  // ══════════════════════════════════════════════════════════════════════════
  const _seedRows = new Map(); // key → { btn, metaSpan }
  let _seedsEl = null;

  function buildSeeds() {
    _seedsEl = document.getElementById('seeds-list');
    if (!_seedsEl) return;
    BASIC_SEEDS.forEach(key => {
      const seed = SEEDS[key];
      const row      = mk('div','seed-row');
      const iconSpan = mk('span','sr-icon');
      iconSpan.innerHTML = spriteHTML(key, 'seed', 48);
      const infoDiv  = mk('div','sr-info');
      const nameSpan = mk('span','sr-name');
      nameSpan.textContent = seed.name;
      const metaSpan = mk('span','sr-meta');
      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(metaSpan);
      const btn = mk('button','seed-buy-btn');
      btn.textContent = 'Buy';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (state.coins < seed.cost) return;
        state.coins -= seed.cost;
        if (!state.seedInventory) state.seedInventory = {};
        state.seedInventory[key] = (state.seedInventory[key] || 0) + 1;
        updateCoins(); renderInventory(); save();
        log(`🌱 Bought ${seed.name} seed`);
      });
      row.appendChild(iconSpan);
      row.appendChild(infoDiv);
      row.appendChild(btn);
      _seedsEl.appendChild(row);
      _seedRows.set(key, { btn, metaSpan });
    });
  }

  function renderSeeds() {
    if (!_seedsEl) buildSeeds();
    const mult = getGrowMult();
    _seedRows.forEach(({ btn, metaSpan }, key) => {
      const seed = SEEDS[key];
      btn.disabled = state.coins < seed.cost;
      metaSpan.innerHTML = `${coinHTML()}${seed.cost} - ${fmt(seed.grow * mult)}`;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BAGS — build once, update button disabled on each call
  // ══════════════════════════════════════════════════════════════════════════
  const _bagRows = new Map(); // bag.id → { btn, bag }
  let _bagsEl = null;

  function buildBags() {
    _bagsEl = document.getElementById('bags-list');
    if (!_bagsEl) return;
    SEED_BAGS.forEach(bag => {
      const card = mk('div','upgrade-card');
      const desc = bag.seeds.map((s,i) =>
        `${spriteHTML(s, 'seed', 20)} ${SEEDS[s].name} ${Math.round(bag.odds[i]*100)}%`).join(' · ');
      card.innerHTML = `<div class="ug-name">${bag.icon} ${bag.name}</div><div class="ug-desc">Opens for 3 seeds: ${desc}</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}${bag.cost}</span><button class="ug-btn">Buy</button></div>`;
      const btn = card.querySelector('.ug-btn');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (state.coins < bag.cost) return;
        state.coins -= bag.cost;
        if (!state.bagInventory) state.bagInventory = {};
        state.bagInventory[bag.id] = (state.bagInventory[bag.id] || 0) + 1;
        updateCoins(); renderInventory(); save();
        log(`🎒 Bought ${bag.name}`);
      });
      _bagsEl.appendChild(card);
      _bagRows.set(bag.id, { btn, bag });
    });
  }

  function renderBags() {
    if (!_bagsEl) buildBags();
    _bagRows.forEach(({ btn, bag }) => { btn.disabled = state.coins < bag.cost; });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ITEMS — build once, targeted updates (disabled states + WC status text)
  // ══════════════════════════════════════════════════════════════════════════
  let _itemsEl      = null;
  let _wcCard       = null, _wcBtn = null, _wcDescSpan = null, _wcStatusSpan = null;
  let _spoutCard    = null, _spoutBtn = null;
  let _cageCard     = null, _cageBtn = null;
  let _fertCard     = null, _fertBtn = null;
  let _ufertCard    = null, _ufertBtn = null;

  function buildItems() {
    _itemsEl = document.getElementById('items-list');
    if (!_itemsEl) return;

    // Watering Can
    _wcCard = mk('div','upgrade-card');
    const wcNameDiv = mk('div','ug-name'); wcNameDiv.textContent = '💧 Watering Can';
    const wcDescDiv = mk('div','ug-desc');
    _wcDescSpan   = mk('span',''); wcDescDiv.appendChild(_wcDescSpan);
    _wcStatusSpan = mk('span',''); wcDescDiv.appendChild(_wcStatusSpan);
    const wcBotDiv  = mk('div','ug-bottom');
    wcBotDiv.innerHTML = `<span class="ug-cost">${coinHTML()}100</span>`;
    _wcBtn = mk('button','ug-btn');
    _wcBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (state.coins < 100 || (state.items && state.items.wateringCan)) return;
      state.coins -= 100;
      if (!state.items) state.items = {};
      state.items.wateringCan = true; state.canCharges = 0;
      updateCoins(); renderInventory(); save();
    });
    wcBotDiv.appendChild(_wcBtn);
    _wcCard.appendChild(wcNameDiv);
    _wcCard.appendChild(wcDescDiv);
    _wcCard.appendChild(wcBotDiv);
    _itemsEl.appendChild(_wcCard);

    // Copper Spout (always in DOM, hidden unless WC owned)
    _spoutCard = mk('div','upgrade-card');
    _spoutCard.innerHTML = `<div class="ug-name">${coinHTML()} Copper Spout</div><div class="ug-desc">Upgrade the can: fill time reduced to 8s, capacity increases to 2 charges.</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}800</span><button class="ug-btn">Buy</button></div>`;
    _spoutBtn = _spoutCard.querySelector('.ug-btn');
    _spoutBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (state.coins < 800 || (state.upgrades && state.upgrades.copperSpout)) return;
      state.coins -= 800;
      if (!state.upgrades) state.upgrades = {};
      state.upgrades.copperSpout = true;
      log(`${coinHTML()} Copper Spout installed — fill time 8s, capacity 2`);
      updateCoins(); renderInventory(); save();
    });
    _itemsEl.appendChild(_spoutCard);

    // Cage
    _cageCard = mk('div','upgrade-card');
    _cageCard.innerHTML = `<div class="ug-name">🔒 Cage</div><div class="ug-desc">Drag from inventory onto a tile for 75% crow resistance. Stays until removed.</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}250</span><button class="ug-btn">Buy</button></div>`;
    _cageBtn = _cageCard.querySelector('.ug-btn');
    _cageBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (state.coins < 250) return;
      state.coins -= 250; state.cageCount = (state.cageCount||0) + 1;
      updateCoins(); renderInventory(); save();
    });
    _itemsEl.appendChild(_cageCard);

    // Common Fertilizer
    _fertCard = mk('div','upgrade-card');
    _fertCard.innerHTML = `<div class="ug-name">🌿 Common Fertilizer</div><div class="ug-desc">Drag from inventory onto any tile. Crops grown there are 25% faster permanently.</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}500</span><button class="ug-btn">Buy</button></div>`;
    _fertBtn = _fertCard.querySelector('.ug-btn');
    _fertBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (state.coins < 500) return;
      state.coins -= 500; state.fertCharges = (state.fertCharges||0) + 1;
      updateCoins(); renderInventory(); save();
    });
    _itemsEl.appendChild(_fertCard);

    // Uncommon Fertilizer
    _ufertCard = mk('div','upgrade-card');
    _ufertCard.innerHTML = `<div class="ug-name">⚗️ Uncommon Fertilizer</div><div class="ug-desc">Drag from inventory onto any tile. Crops grown there are 40% faster permanently.</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}2000</span><button class="ug-btn">Buy</button></div>`;
    _ufertBtn = _ufertCard.querySelector('.ug-btn');
    _ufertBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (state.coins < 2000) return;
      state.coins -= 2000; state.uncommonFertCharges = (state.uncommonFertCharges||0) + 1;
      updateCoins(); renderInventory(); save();
    });
    _itemsEl.appendChild(_ufertCard);
  }

  function renderItems() {
    if (!_itemsEl) buildItems();

    const wcOwned    = !!(state.items && state.items.wateringCan);
    const spoutOwned = !!(state.upgrades && state.upgrades.copperSpout);

    // WC card
    _wcCard.classList.toggle('bought', wcOwned);
    _wcBtn.disabled = wcOwned || state.coins < 100;
    _wcBtn.textContent = wcOwned ? 'Owned' : 'Buy';
    const fillSecs = wcOwned ? canFillTime() / 1000 : 20;
    _wcDescSpan.textContent = `Click can in inventory to fill (${fillSecs}s). Drag charged can onto growing crop. +25% speed & value.`;
    if (wcOwned) {
      const ch = state.canCharges || 0, cap = canCapacity();
      let statusHtml = '';
      if (ch > 0) statusHtml += `<span style="color:#6cf;font-size:10px"> ● ${ch}/${cap} charge${ch>1?'s':''} ready</span>`;
      if (state.canRefillAt) {
        const rem = Math.max(0, (state.canRefillAt - Date.now()) / 1000);
        statusHtml += `<span style="opacity:.5;font-size:10px"> Filling in ${fmt(rem)}</span>`;
      }
      _wcStatusSpan.innerHTML = statusHtml;
    } else {
      _wcStatusSpan.innerHTML = '';
    }

    // Copper Spout (visible only when WC owned)
    _spoutCard.style.display = wcOwned ? '' : 'none';
    if (wcOwned) {
      _spoutCard.classList.toggle('bought', spoutOwned);
      _spoutBtn.disabled = spoutOwned || state.coins < 800;
      _spoutBtn.textContent = spoutOwned ? 'Owned' : 'Buy';
    }

    // Item buy buttons
    _cageBtn.disabled  = state.coins < 250;
    _fertBtn.disabled  = state.coins < 500;
    _ufertBtn.disabled = state.coins < 2000;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UPGRADES — build once, toggle display / .bought / button on each call
  // ══════════════════════════════════════════════════════════════════════════
  const _upgradeCards = new Map(); // id → { card, btn, u }
  let _upgradesEl = null;

  function buildUpgrades() {
    _upgradesEl = document.getElementById('upgrades-list');
    if (!_upgradesEl) return;
    const sorted = [...UPGRADES].sort((a,b) => a.cost - b.cost);
    sorted.forEach(u => {
      const card = mk('div','upgrade-card');
      card.innerHTML = `<div class="ug-name">${u.name}</div><div class="ug-desc">${u.desc}</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}${u.cost.toLocaleString()}</span><button class="ug-btn">Buy</button></div>`;
      const btn = card.querySelector('.ug-btn');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (state.upgrades[u.id] || state.coins < u.cost) return;
        if (u.type === 'speed') {
          const oldMult = getGrowMult();
          state.coins -= u.cost;
          state.upgrades[u.id] = true;
          adjustGrowTimes(oldMult, getGrowMult());
        } else {
          state.coins -= u.cost;
          state.upgrades[u.id] = true;
        }
        if (u.type === 'expand')       { state.expanded = true;      RenderFarm.buildGrid(); RenderFarm.renderGrid(); showBanner('🌱 The farm has expanded.'); }
        if (u.type === 'expandBottom') { state.expandedBottom = true; RenderFarm.buildGrid(); RenderFarm.renderGrid(); showBanner('🌱 The farm has expanded.'); }
        if (u.type === 'expand2ndCol') { state.expand2ndCol = true;   RenderFarm.buildGrid(); RenderFarm.renderGrid(); showBanner('🌱 The farm has expanded.'); }
        if (u.type === 'expand2ndRow') { state.expand2ndRow = true;   RenderFarm.buildGrid(); RenderFarm.renderGrid(); showBanner('🌱 The farm has expanded.'); }
        if (u.type === 'expand3rdCol') { state.expand3rdCol = true;   RenderFarm.buildGrid(); RenderFarm.renderGrid(); showBanner('🌱 The farm has expanded.'); }
        if (u.type === 'expand3rdRow') { state.expand3rdRow = true;   RenderFarm.buildGrid(); RenderFarm.renderGrid(); showBanner('🌱 The farm has expanded.'); }
        if (u.type === 'ironSellBox' || u.type === 'steelSellBox' || u.type === 'titaniumSellBox' || u.type === 'diamondSellBox') {
          RenderSellbox.updateBoxStyle();
          showBanner(`⚙️ ${u.name} activated.`);
        }
        if (u.type === 'crank' || u.type === 'crankUp') RenderSellbox.renderCrank();
        if (u.type === 'sellSpeed') TimerManager.restart('sell');
        sfx.upgrade();
        log(`⬆️ ${u.name} purchased`);
        updateCoins();
        RenderFarm.renderGrid();
        save();
      });
      _upgradesEl.appendChild(card);
      _upgradeCards.set(u.id, { card, btn, u });
    });
  }

  function renderUpgrades() {
    if (!_upgradesEl) buildUpgrades();
    const currentStage = getCurrentStage().stage;
    _upgradeCards.forEach(({ card, btn, u }) => {
      const bought = !!state.upgrades[u.id];
      const visible =
        (!u.stage2 || currentStage >= 2) &&
        (!u.stage3 || currentStage >= 3) &&
        (u.chain === null || u.chain === undefined || !!state.upgrades[u.chain]) &&
        !(bought && state.hideBoughtUpgrades);
      card.style.display = visible ? '' : 'none';
      if (!visible) return;
      card.classList.toggle('bought', bought);
      btn.disabled = bought || state.coins < u.cost;
      btn.textContent = bought ? 'Owned' : 'Buy';
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INVENTORY — build all slots once; renderInventory() only toggles
  //             display and updates badge text
  // ══════════════════════════════════════════════════════════════════════════
  let _invEl = null;

  // Watering Can inventory slot refs
  let _wcSlot = null, _wcInvIcon = null, _wcInvIconSpan = null, _wcInvBadge = null;
  let _wcFillTimer = null, _wcFillBtn = null;

  // Item slot refs
  let _cageEl = null, _cageBadge = null;
  let _fertEl = null, _fertBadge = null;
  let _ufertEl = null, _ufertBadge = null;

  // Collection slot Maps
  const _bagSlots  = new Map(); // bagId  → { slot, badge }
  const _seedSlots = new Map(); // cropId → { slot, badge }
  const _cropSlots = new Map(); // cropId → { el,   badge }
  let _emptyEl = null;

  function buildInventory() {
    _invEl = document.getElementById('inv-grid');
    if (!_invEl) return;

    // ── Watering Can ──
    _wcSlot = mk('div','inv-seed-slot');
    _wcInvIcon = mk('div','inv-seed-icon');
    _wcInvIconSpan = document.createElement('span');
    _wcInvIconSpan.style.cssText = 'font-size:22px;line-height:1;pointer-events:none';
    _wcInvIconSpan.textContent = '💧';
    _wcInvIcon.appendChild(_wcInvIconSpan);
    _wcInvBadge = mk('span','inv-badge');
    _wcInvIcon.appendChild(_wcInvBadge);
    _wcInvIcon.addEventListener('mousedown', e => {
      e.stopPropagation();
      if ((state.canCharges || 0) < 1) return;
      state.canCharges--;
      renderInventory();
      startItemDrag('water');
      moveGhost(e.clientX, e.clientY);
    });
    _wcSlot.appendChild(_wcInvIcon);
    _wcFillTimer = mk('div','inv-seed-sell');
    _wcFillTimer.id = 'can-fill-timer';
    _wcFillTimer.style.cssText = 'background:rgba(0,0,0,.18);cursor:default;color:rgba(255,255,255,.6)';
    _wcSlot.appendChild(_wcFillTimer);
    _wcFillBtn = mk('button','inv-seed-sell');
    _wcFillBtn.textContent = 'Fill';
    _wcFillBtn.style.background = '#3a6aac';
    _wcFillBtn.addEventListener('click', e => {
      e.stopPropagation();
      if ((state.canCharges || 0) >= canCapacity() || state.canRefillAt) return;
      state.canRefillAt = Date.now() + canFillTime();
      renderInventory(); renderItems(); save();
      log('💧 Watering can filling…');
    });
    _wcSlot.appendChild(_wcFillBtn);
    _invEl.appendChild(_wcSlot);

    // ── Cage ──
    _cageEl = mk('div','inv-icon');
    _cageEl.dataset.name = 'Cage — drag onto a tile to place';
    _cageEl.style.cursor = 'grab';
    const cageSpan = document.createElement('span');
    cageSpan.style.cssText = 'pointer-events:none;font-size:22px;line-height:1';
    cageSpan.textContent = '🔒';
    _cageEl.appendChild(cageSpan);
    _cageBadge = mk('span','inv-badge');
    _cageEl.appendChild(_cageBadge);
    _cageEl.addEventListener('mousedown', e => {
      e.stopPropagation();
      state.cageCount--; renderInventory(); renderItems();
      startItemDrag('cage'); moveGhost(e.clientX, e.clientY);
    });
    _invEl.appendChild(_cageEl);

    // ── Common Fertilizer ──
    _fertEl = mk('div','inv-icon');
    _fertEl.dataset.name = 'Common Fertilizer — drag onto a tile';
    _fertEl.style.cursor = 'grab';
    const fertSpan = document.createElement('span');
    fertSpan.style.cssText = 'pointer-events:none;font-size:22px;line-height:1';
    fertSpan.textContent = '🌿';
    _fertEl.appendChild(fertSpan);
    _fertBadge = mk('span','inv-badge');
    _fertEl.appendChild(_fertBadge);
    _fertEl.addEventListener('mousedown', e => {
      e.stopPropagation();
      state.fertCharges--; renderInventory(); renderItems();
      startItemDrag('fertilizer'); moveGhost(e.clientX, e.clientY);
    });
    _invEl.appendChild(_fertEl);

    // ── Uncommon Fertilizer ──
    _ufertEl = mk('div','inv-icon');
    _ufertEl.dataset.name = 'Uncommon Fertilizer — drag onto a tile';
    _ufertEl.style.cursor = 'grab';
    const ufertSpan = document.createElement('span');
    ufertSpan.style.cssText = 'pointer-events:none;font-size:22px;line-height:1';
    ufertSpan.textContent = '⚗️';
    _ufertEl.appendChild(ufertSpan);
    _ufertBadge = mk('span','inv-badge');
    _ufertEl.appendChild(_ufertBadge);
    _ufertEl.addEventListener('mousedown', e => {
      e.stopPropagation();
      state.uncommonFertCharges--; renderInventory(); renderItems();
      startItemDrag('uncommonFert'); moveGhost(e.clientX, e.clientY);
    });
    _invEl.appendChild(_ufertEl);

    // ── Bag slots (one per SEED_BAGS entry) ──
    SEED_BAGS.forEach(bag => {
      const slot = mk('div','inv-bag-slot');
      const icon = mk('div','inv-bag-icon');
      icon.dataset.name = `${bag.name} — click to open`;
      const iconSpan = document.createElement('span');
      iconSpan.style.pointerEvents = 'none';
      iconSpan.textContent = bag.icon;
      icon.appendChild(iconSpan);
      const badge = mk('span','inv-badge');
      icon.appendChild(badge);
      const openBtn = mk('button','inv-bag-open');
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', e => { e.stopPropagation(); openBag(bag); });
      slot.appendChild(icon);
      slot.appendChild(openBtn);
      _invEl.appendChild(slot);
      _bagSlots.set(bag.id, { slot, badge });
    });

    // ── Seed slots (one per SEEDS entry, shown/hidden by qty) ──
    Object.keys(SEEDS).forEach(key => {
      const seed = SEEDS[key];
      const slot = mk('div','inv-seed-slot');
      const icon = mk('div','inv-seed-icon');
      icon.dataset.name = `${seed.name} seed — drag to plant`;
      icon.appendChild(makeSpriteDiv(key, 'seed', 40));
      const badge = mk('span','inv-badge');
      icon.appendChild(badge);
      icon.addEventListener('mousedown', e => {
        e.stopPropagation();
        if ((state.seedInventory[key] || 0) < 1) return;
        state.seedInventory[key]--;
        if (state.seedInventory[key] <= 0) delete state.seedInventory[key];
        renderInventory(); save();
        startDrag(key, 'seedInventory'); moveGhost(e.clientX, e.clientY);
      });
      const price = SEED_SELL_PRICES[key] || 0;
      const sellBtn = mk('button','inv-seed-sell');
      sellBtn.innerHTML = `Sell ${coinHTML()}${price}`;
      sellBtn.title = `Sell ${seed.name} seed for ${price} coins`;
      sellBtn.addEventListener('click', e => {
        e.stopPropagation();
        if ((state.seedInventory[key] || 0) < 1) return;
        state.seedInventory[key]--;
        if (state.seedInventory[key] <= 0) delete state.seedInventory[key];
        addCoins(price);
        log(`🌱 Sold ${seed.name} seed for ${coinHTML()}${price}`);
        renderInventory(); save();
      });
      slot.appendChild(icon);
      slot.appendChild(sellBtn);
      _invEl.appendChild(slot);
      _seedSlots.set(key, { slot, badge });
    });

    // ── Crop slots (one per SEEDS entry, shown/hidden by qty) ──
    Object.keys(SEEDS).forEach(key => {
      const el = mk('div','inv-icon');
      el.dataset.name = SEEDS[key].name;
      el.appendChild(makeSpriteDiv(key, 'grown', 40));
      const badge = mk('span','inv-badge');
      el.appendChild(badge);
      el.addEventListener('mousedown', e => {
        e.stopPropagation();
        if ((state.inventory[key] || 0) < 1) return;
        state.inventory[key]--;
        if (state.inventory[key] <= 0) delete state.inventory[key];
        renderInventory(); save();
        startDrag(key, 'inventory'); moveGhost(e.clientX, e.clientY);
      });
      _invEl.appendChild(el);
      _cropSlots.set(key, { el, badge });
    });

    // ── Empty placeholder ──
    _emptyEl = mk('div');
    _emptyEl.id = 'inv-empty';
    _emptyEl.textContent = 'Empty';
    _invEl.appendChild(_emptyEl);
  }

  function renderInventory() {
    if (!_invEl) buildInventory();
    let count = 0;

    // Watering Can
    const wcOwned = !!(state.items && state.items.wateringCan);
    _wcSlot.style.display = wcOwned ? '' : 'none';
    if (wcOwned) {
      count++;
      const charges  = state.canCharges || 0;
      const capacity = canCapacity();
      const filling  = !!(state.canRefillAt);
      const canFill  = charges < capacity && !filling;

      _wcInvIcon.style.cursor = charges > 0 ? 'grab' : 'default';
      _wcInvIcon.dataset.name = charges > 0
        ? `Watering Can (${charges}/${capacity}) — drag onto a growing crop`
        : filling ? 'Watering Can — filling…' : 'Watering Can — empty, click Fill';
      _wcInvIconSpan.style.opacity = charges > 0 ? '1' : '0.3';

      _wcInvBadge.style.display = charges > 0 ? '' : 'none';
      if (charges > 0) _wcInvBadge.textContent = charges;

      _wcFillTimer.style.display = filling ? '' : 'none';
      if (filling) _wcFillTimer.textContent = fmt(Math.max(0, (state.canRefillAt - Date.now()) / 1000));

      _wcFillBtn.style.display = canFill ? '' : 'none';
    }

    // Cage
    const cageHeld = state.cageCount || 0;
    _cageEl.style.display = cageHeld > 0 ? '' : 'none';
    if (cageHeld > 0) { count++; _cageBadge.textContent = cageHeld; }

    // Common Fertilizer
    const fertHeld = state.fertCharges || 0;
    _fertEl.style.display = fertHeld > 0 ? '' : 'none';
    if (fertHeld > 0) { count++; _fertBadge.textContent = fertHeld; }

    // Uncommon Fertilizer
    const ufertHeld = state.uncommonFertCharges || 0;
    _ufertEl.style.display = ufertHeld > 0 ? '' : 'none';
    if (ufertHeld > 0) { count++; _ufertBadge.textContent = ufertHeld; }

    // Bags
    const bagInv = state.bagInventory || {};
    _bagSlots.forEach(({ slot, badge }, id) => {
      const qty = bagInv[id] || 0;
      slot.style.display = qty > 0 ? '' : 'none';
      if (qty > 0) { count++; badge.textContent = qty; }
    });

    // Seeds
    const seedInv = state.seedInventory || {};
    _seedSlots.forEach(({ slot, badge }, key) => {
      const qty = seedInv[key] || 0;
      slot.style.display = qty > 0 ? '' : 'none';
      if (qty > 0) { count++; badge.textContent = qty; }
    });

    // Crops
    _cropSlots.forEach(({ el, badge }, key) => {
      const qty = state.inventory[key] || 0;
      el.style.display = qty > 0 ? '' : 'none';
      if (qty > 0) { count++; badge.textContent = qty; }
    });

    _emptyEl.style.display = count === 0 ? '' : 'none';
  }

  return { renderSeeds, renderBags, renderItems, renderUpgrades, renderInventory };
})();
