window.RenderPanel = (() => {
  function renderSeeds() {
    const container = document.getElementById('seeds-list');
    if (!container) return;
    container.innerHTML = '';
    BASIC_SEEDS.forEach(key => {
      const seed = SEEDS[key];
      const gt = seed.grow * getGrowMult();
      const canAfford = state.coins >= seed.cost;
      const row = mk('div','seed-row');
      row.innerHTML = `<span class="sr-icon">${spriteHTML(key, 'seed', 48)}</span><div class="sr-info"><span class="sr-name">${seed.name}</span><span class="sr-meta">${coinHTML()}${seed.cost} - ${fmt(gt)}`;
      const btn = mk('button','seed-buy-btn');
      btn.textContent = 'Buy';
      btn.disabled = !canAfford;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (state.coins < seed.cost) return;
        state.coins -= seed.cost;
        if (!state.seedInventory) state.seedInventory = {};
        state.seedInventory[key] = (state.seedInventory[key] || 0) + 1;
        updateCoins(); renderInventory(); save();
        log(`🌱 Bought ${seed.name} seed`);
      });
      row.appendChild(btn);
      container.appendChild(row);
    });
  }

  function renderBags() {
    const container = document.getElementById('bags-list');
    if (!container) return;
    container.innerHTML = '';
    SEED_BAGS.forEach(bag => {
      const canAfford = state.coins >= bag.cost;
      const card = mk('div','upgrade-card');
      const desc = bag.seeds.map((s,i) =>
        `${spriteHTML(s, 'seed', 20)} ${SEEDS[s].name} ${Math.round(bag.odds[i]*100)}%`).join(' · ');
      card.innerHTML = `<div class="ug-name">${bag.icon} ${bag.name}</div><div class="ug-desc">Opens for 3 seeds: ${desc}</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}${bag.cost}</span><button class="ug-btn"${canAfford?'':' disabled'}>Buy</button></div>`;
      card.querySelector('.ug-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (state.coins < bag.cost) return;
        state.coins -= bag.cost;
        if (!state.bagInventory) state.bagInventory = {};
        state.bagInventory[bag.id] = (state.bagInventory[bag.id] || 0) + 1;
        updateCoins(); renderInventory(); save();
        log(`🎒 Bought ${bag.name}`);
      });
      container.appendChild(card);
    });
  }

  function renderItems() {
    const container = document.getElementById('items-list');
    if (!container) return;
    container.innerHTML = '';

    const wcOwned = !!(state.items && state.items.wateringCan);
    const wcCard  = mk('div','upgrade-card' + (wcOwned ? ' bought' : ''));
    let wcStatus = '';
    if (wcOwned) {
      const ch = state.canCharges || 0, cap = canCapacity();
      if (ch > 0) wcStatus = ` <span style="color:#6cf;font-size:10px">● ${ch}/${cap} charge${ch>1?'s':''} ready</span>`;
      if (state.canRefillAt) {
        const rem = Math.max(0, (state.canRefillAt - Date.now()) / 1000);
        wcStatus += ` <span style="opacity:.5;font-size:10px">Filling in ${fmt(rem)}</span>`;
      }
    }
    const fillSecs = wcOwned ? canFillTime() / 1000 : 20;
    wcCard.innerHTML = `<div class="ug-name">💧 Watering Can</div><div class="ug-desc">Click can in inventory to fill (${fillSecs}s). Drag charged can onto growing crop. +25% speed &amp; value.${wcStatus}</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}100</span><button class="ug-btn"${wcOwned||state.coins<100?' disabled':''}>${wcOwned?'Owned':'Buy'}</button></div>`;
    if (!wcOwned) {
      wcCard.querySelector('.ug-btn').addEventListener('click', e => {
        e.stopPropagation();
        if (state.coins < 100 || (state.items && state.items.wateringCan)) return;
        state.coins -= 100;
        if (!state.items) state.items = {};
        state.items.wateringCan = true; state.canCharges = 0;
        updateCoins(); renderInventory(); save();
      });
    }
    container.appendChild(wcCard);

    if (wcOwned) {
      const spoutOwned = !!(state.upgrades && state.upgrades.copperSpout);
      const spoutCard  = mk('div','upgrade-card' + (spoutOwned ? ' bought' : ''));
      spoutCard.innerHTML = `<div class="ug-name">${coinHTML()} Copper Spout</div><div class="ug-desc">Upgrade the can: fill time reduced to 8s, capacity increases to 2 charges.</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}800</span><button class="ug-btn"${spoutOwned||state.coins<800?' disabled':''}>${spoutOwned?'Owned':'Buy'}</button></div>`;
      if (!spoutOwned) {
        spoutCard.querySelector('.ug-btn').addEventListener('click', e => {
          e.stopPropagation();
          if (state.coins < 800 || (state.upgrades && state.upgrades.copperSpout)) return;
          state.coins -= 800;
          if (!state.upgrades) state.upgrades = {};
          state.upgrades.copperSpout = true;
          log(`${coinHTML()} Copper Spout installed — fill time 8s, capacity 2`);
          updateCoins(); renderInventory(); renderItems(); save();
        });
      }
      container.appendChild(spoutCard);
    }

    const cageCard = mk('div','upgrade-card');
    cageCard.innerHTML = `<div class="ug-name">🔒 Cage</div><div class="ug-desc">Drag from inventory onto a tile for 75% crow resistance. Stays until removed.</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}250</span><button class="ug-btn cage-buy-btn"${state.coins<250?' disabled':''}>Buy</button></div>`;
    cageCard.querySelector('.cage-buy-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (state.coins < 250) return;
      state.coins -= 250; state.cageCount = (state.cageCount||0) + 1;
      updateCoins(); renderInventory(); save();
    });
    container.appendChild(cageCard);

    const fertCard = mk('div','upgrade-card');
    fertCard.innerHTML = `<div class="ug-name">🌿 Common Fertilizer</div><div class="ug-desc">Drag from inventory onto any tile. Crops grown there are 25% faster permanently.</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}500</span><button class="ug-btn fert-buy-btn"${state.coins<500?' disabled':''}>Buy</button></div>`;
    fertCard.querySelector('.fert-buy-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (state.coins < 500) return;
      state.coins -= 500; state.fertCharges = (state.fertCharges||0) + 1;
      updateCoins(); renderInventory(); save();
    });
    container.appendChild(fertCard);

    const ufertCard = mk('div','upgrade-card');
    ufertCard.innerHTML = `<div class="ug-name">⚗️ Uncommon Fertilizer</div><div class="ug-desc">Drag from inventory onto any tile. Crops grown there are 40% faster permanently.</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}2000</span><button class="ug-btn ufert-buy-btn"${state.coins<2000?' disabled':''}>Buy</button></div>`;
    ufertCard.querySelector('.ufert-buy-btn').addEventListener('click', e => {
      e.stopPropagation();
      if (state.coins < 2000) return;
      state.coins -= 2000; state.uncommonFertCharges = (state.uncommonFertCharges||0) + 1;
      updateCoins(); renderInventory(); save();
    });
    container.appendChild(ufertCard);
  }

  function renderUpgrades() {
    const container = document.getElementById('upgrades-list');
    if (!container) return;
    container.innerHTML = '';
    const sorted = [...UPGRADES].sort((a,b) => a.cost - b.cost);
    const currentStage = getCurrentStage().stage;
    sorted.forEach(u => {
      if (u.stage2 && currentStage < 2) return;
      if (u.stage3 && currentStage < 3) return;
      if (u.chain !== null && u.chain !== undefined && !state.upgrades[u.chain]) return;
      const bought    = !!state.upgrades[u.id];
      if (bought && state.hideBoughtUpgrades) return;
      const canAfford = state.coins >= u.cost && !bought;
      const card = mk('div','upgrade-card' + (bought ? ' bought' : ''));
      card.innerHTML = `<div class="ug-name">${u.name}</div><div class="ug-desc">${u.desc}</div><div class="ug-bottom"><span class="ug-cost">${coinHTML()}${u.cost.toLocaleString()}</span><button class="ug-btn"${bought||!canAfford?' disabled':''}>${bought?'Owned':'Buy'}</button></div>`;
      if (!bought) {
        card.querySelector('.ug-btn').addEventListener('click', e => {
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
          sfx.upgrade();
          log(`⬆️ ${u.name} purchased`);
          updateCoins();
          RenderFarm.renderGrid();
          save();
        });
      }
      container.appendChild(card);
    });
  }

  function renderInventory() {
    const grid = document.getElementById('inv-grid');
    if (!grid) return;
    grid.innerHTML = '';
    let count = 0;

    function makeItemSlot(icon, tooltip, itemType, onDown) {
      const el = mk('div','inv-icon');
      el.dataset.name = tooltip;
      el.style.cursor = 'grab';
      el.innerHTML = `<span style="pointer-events:none;font-size:22px;line-height:1">${icon}</span>`;
      el.addEventListener('mousedown', e => { e.stopPropagation(); onDown(e); });
      return el;
    }

    // Watering Can
    if (state.items && state.items.wateringCan) {
      count++;
      const charges  = state.canCharges  || 0;
      const capacity = canCapacity();
      const filling  = !!(state.canRefillAt);
      const canFill  = charges < capacity && !filling;

      const slot = mk('div','inv-seed-slot');
      const icon = mk('div','inv-seed-icon');
      icon.style.cursor = charges > 0 ? 'grab' : 'default';
      icon.dataset.name = charges > 0
        ? `Watering Can (${charges}/${capacity}) — drag onto a growing crop`
        : filling ? 'Watering Can — filling…' : 'Watering Can — empty, click Fill';

      const iconSpan = document.createElement('span');
      iconSpan.style.cssText = `font-size:22px;line-height:1;pointer-events:none;opacity:${charges > 0 ? '1' : '0.3'}`;
      iconSpan.textContent = '💧';
      icon.appendChild(iconSpan);

      if (charges > 0) {
        const badge = mk('span','inv-badge');
        badge.textContent = charges;
        icon.appendChild(badge);
        icon.addEventListener('mousedown', e => {
          e.stopPropagation();
          if ((state.canCharges || 0) < 1) return;
          state.canCharges--;
          renderInventory();
          startItemDrag('water');
          moveGhost(e.clientX, e.clientY);
        });
      }
      slot.appendChild(icon);

      if (filling) {
        const timer = mk('div','inv-seed-sell');
        timer.id = 'can-fill-timer';
        timer.style.cssText = 'background:rgba(0,0,0,.18);cursor:default;color:rgba(255,255,255,.6)';
        timer.textContent = fmt(Math.max(0, (state.canRefillAt - Date.now()) / 1000));
        slot.appendChild(timer);
      } else if (canFill) {
        const fillBtn = mk('button','inv-seed-sell');
        fillBtn.textContent = 'Fill';
        fillBtn.style.background = '#3a6aac';
        fillBtn.addEventListener('click', e => {
          e.stopPropagation();
          if ((state.canCharges || 0) >= canCapacity() || state.canRefillAt) return;
          state.canRefillAt = Date.now() + canFillTime();
          renderInventory(); renderItems(); save();
          log('💧 Watering can filling…');
        });
        slot.appendChild(fillBtn);
      }
      grid.appendChild(slot);
    }

    // Cages
    const cageHeld = state.cageCount || 0;
    if (cageHeld > 0) {
      count++;
      const el = makeItemSlot('🔒', 'Cage — drag onto a tile to place', 'cage', e => {
        state.cageCount--; renderInventory(); renderItems();
        startItemDrag('cage'); moveGhost(e.clientX, e.clientY);
      });
      el.innerHTML = `<span style="pointer-events:none;font-size:22px;line-height:1">🔒</span><span class="inv-badge">${cageHeld}</span>`;
      grid.appendChild(el);
    }

    // Common Fertilizer
    const fertHeld = state.fertCharges || 0;
    if (fertHeld > 0) {
      count++;
      const el = makeItemSlot('🌿', 'Common Fertilizer — drag onto a tile', 'fertilizer', e => {
        state.fertCharges--; renderInventory(); renderItems();
        startItemDrag('fertilizer'); moveGhost(e.clientX, e.clientY);
      });
      el.innerHTML = `<span style="pointer-events:none;font-size:22px;line-height:1">🌿</span><span class="inv-badge">${fertHeld}</span>`;
      grid.appendChild(el);
    }

    // Uncommon Fertilizer
    const ufertHeld = state.uncommonFertCharges || 0;
    if (ufertHeld > 0) {
      count++;
      const el = makeItemSlot('⚗️', 'Uncommon Fertilizer — drag onto a tile', 'uncommonFert', e => {
        state.uncommonFertCharges--; renderInventory(); renderItems();
        startItemDrag('uncommonFert'); moveGhost(e.clientX, e.clientY);
      });
      el.innerHTML = `<span style="pointer-events:none;font-size:22px;line-height:1">⚗️</span><span class="inv-badge">${ufertHeld}</span>`;
      grid.appendChild(el);
    }

    // Bags
    SEED_BAGS.forEach(bag => {
      const qty = (state.bagInventory || {})[bag.id] || 0;
      if (qty <= 0) return;
      count++;
      const slot = mk('div','inv-bag-slot');
      const icon = mk('div','inv-bag-icon');
      icon.dataset.name = `${bag.name} — click to open`;
      icon.innerHTML = `<span style="pointer-events:none">${bag.icon}</span><span class="inv-badge">${qty}</span>`;
      const openBtn = mk('button','inv-bag-open');
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', e => { e.stopPropagation(); openBag(bag); });
      slot.appendChild(icon);
      slot.appendChild(openBtn);
      grid.appendChild(slot);
    });

    // Seeds
    const seedInv = state.seedInventory || {};
    Object.entries(seedInv).forEach(([key, qty]) => {
      if (qty <= 0 || !SEEDS[key]) return;
      count++;
      const seed = SEEDS[key];
      const slot = mk('div','inv-seed-slot');
      const icon = mk('div','inv-seed-icon');
      icon.dataset.name = `${seed.name} seed — drag to plant`;
      icon.innerHTML = `${spriteHTML(key, 'seed', 40)}<span class="inv-badge">${qty}</span>`;
      icon.addEventListener('mousedown', e => {
        e.stopPropagation();
        if ((state.seedInventory[key] || 0) < 1) return;
        state.seedInventory[key]--;
        if (state.seedInventory[key] <= 0) delete state.seedInventory[key];
        renderInventory(); save();
        startDrag(key, 'seedInventory'); moveGhost(e.clientX, e.clientY);
      });
      const sellBtn = mk('button','inv-seed-sell');
      const price = SEED_SELL_PRICES[key] || 0;
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
      grid.appendChild(slot);
    });

    // Harvested crops
    Object.entries(state.inventory).forEach(([key, qty]) => {
      if (qty <= 0 || !SEEDS[key]) return;
      count++;
      const el = mk('div','inv-icon');
      el.dataset.name = SEEDS[key].name;
      el.innerHTML = `${spriteHTML(key, 'grown', 40)}<span class="inv-badge">${qty}</span>`;
      el.addEventListener('mousedown', e => {
        e.stopPropagation();
        if ((state.inventory[key] || 0) < 1) return;
        state.inventory[key]--;
        if (state.inventory[key] <= 0) delete state.inventory[key];
        renderInventory(); save();
        startDrag(key, 'inventory'); moveGhost(e.clientX, e.clientY);
      });
      grid.appendChild(el);
    });

    if (count === 0) {
      const e = mk('div'); e.id = 'inv-empty'; e.textContent = 'Empty'; grid.appendChild(e);
    }
  }

  return { renderSeeds, renderBags, renderItems, renderUpgrades, renderInventory };
})();
