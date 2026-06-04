// ══════════════════════════════
// MINIGAMES
// ══════════════════════════════

// ── Reward formula ────────────────────────────────────────────────────────
window.calcMinigameReward = function calcMinigameReward(gameId, difficulty, won) {
  if (!won) return 0;

  const topSeedValue = Object.keys(state.seedInventory || {})
    .concat(Object.keys(state.inventory || {}))
    .reduce((max, id) => {
      const seed = window.SEEDS && window.SEEDS[id];
      return seed ? Math.max(max, seed.sell || 0) : max;
    }, 10);

  const stageMult    = [1, 1.5, 2.5, 4, 7, 12][STATE.meta.stage || 0] || 1;
  const diffMult     = { easy: 1, medium: 2.5, hard: 6 }[difficulty] || 1;
  const prestigeMult = 1 + ((STATE.prestige.count || 0) * 0.15);
  const coinFactor   = Math.max(1, Math.log10((state.coins || 0) + 1));
  const upgradeCount = Object.keys(state.upgrades || {}).filter(k => state.upgrades[k]).length;
  const upgradeFactor = 1 + (upgradeCount * 0.02);

  return Math.floor(topSeedValue * 0.15 * stageMult * diffMult * prestigeMult * coinFactor * upgradeFactor);
};

// ── Main module ────────────────────────────────────────────────────────────
window.Minigames = (() => {

  // ── Game config ────────────────────────────────────────────────────────────

  const SOIL_CFG = {
    easy:   { rounds: 5,  flashMs: 620, respondMs: 4000 },
    medium: { rounds: 8,  flashMs: 490, respondMs: 3000 },
    hard:   { rounds: 12, flashMs: 360, respondMs: 2000 },
  };

  const WATER_CFG = {
    easy:   { needed: 6,  maxAttempts: 10, zoneW: 0.28, speed: 0.0038 },
    medium: { needed: 9,  maxAttempts: 15, zoneW: 0.18, speed: 0.0055 },
    hard:   { needed: 13, maxAttempts: 21, zoneW: 0.11, speed: 0.0082 },
  };

  const SOIL_COLORS = [
    { name: 'Clay',    color: '#7a4820', flash: '#c4783a', emoji: '🪨' },
    { name: 'Humus',   color: '#3a6e22', flash: '#68b840', emoji: '🌿' },
    { name: 'Mineral', color: '#2060a0', flash: '#40a0e8', emoji: '💧' },
    { name: 'Sand',    color: '#a88020', flash: '#e0c040', emoji: '🌾' },
  ];

  // ── Timer management ───────────────────────────────────────────────────────

  let _timers = [];
  let _raf    = null;

  function _clearAll() {
    _timers.forEach(id => { clearTimeout(id); clearInterval(id); });
    _timers = [];
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  }

  function _t(fn, ms) {
    const id = setTimeout(fn, ms);
    _timers.push(id);
    return id;
  }

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function _body() { return document.getElementById('mg-modal-body'); }

  function _diffLabel(d) { return { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[d] || d; }

  function _isUnlocked(gameId, diff) {
    const mg = STATE.minigames;
    if (diff === 'easy')   return true;
    if (diff === 'medium') return (mg[gameId]?.playsEasy   || 0) >= 10;
    if (diff === 'hard')   return (mg[gameId]?.playsMedium || 0) >= 10;
    return false;
  }

  function _bestDiff(gameId) {
    const mg = STATE.minigames[gameId] || {};
    if ((mg.playsHard   || 0) > 0) return 'Hard';
    if ((mg.playsMedium || 0) > 0) return 'Medium';
    if ((mg.playsEasy   || 0) > 0) return 'Easy';
    return '—';
  }

  // ── Landing screen ─────────────────────────────────────────────────────────

  function _renderLanding() {
    _clearAll();
    const body = _body();
    if (!body) return;
    body.innerHTML = '';
    body.style.cssText = 'padding:16px;display:flex;gap:12px;flex:1;min-height:0;overflow-y:auto';

    const games = [
      {
        id: 'soilMixer', emoji: '🪱', name: 'Soil Mixer',
        desc: 'Watch the soil sequence light up, then repeat it back perfectly. How deep can you go?',
      },
      {
        id: 'waterFlow', emoji: '💧', name: 'Water Flow',
        desc: 'Time your click to intercept the water drop exactly as it passes through the target zone!',
      },
    ];

    games.forEach(g => {
      const mg   = STATE.minigames[g.id] || {};
      const card = mk('div');
      card.style.cssText = [
        'flex:1;min-width:0;display:flex;flex-direction:column;gap:10px',
        'background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.12)',
        'border-radius:8px;padding:14px',
      ].join(';');
      card.dataset.diff = 'easy';

      const title = mk('div');
      title.style.cssText = 'font-size:14px;font-weight:700;color:#f0d080';
      title.textContent = `${g.emoji} ${g.name}`;
      card.appendChild(title);

      const desc = mk('div');
      desc.style.cssText = 'font-size:11px;color:rgba(255,255,255,.58);line-height:1.45;flex:1';
      desc.textContent = g.desc;
      card.appendChild(desc);

      // Difficulty selector
      const diffRow = mk('div');
      diffRow.style.cssText = 'display:flex;gap:4px';
      ['easy', 'medium', 'hard'].forEach(d => {
        const unlocked = _isUnlocked(g.id, d);
        const btn = mk('button', 'ug-btn');
        btn.textContent  = unlocked ? _diffLabel(d) : '🔒';
        btn.title        = unlocked ? _diffLabel(d) : (d === 'medium' ? 'Play Easy 10× to unlock' : 'Play Medium 10× to unlock');
        btn.disabled     = !unlocked;
        btn.dataset.diff = d;
        btn.style.cssText = `flex:1;font-size:10px;padding:4px 2px;${d === 'easy' ? 'background:#5a8a3c' : ''}`;
        btn.addEventListener('click', () => {
          diffRow.querySelectorAll('[data-diff]').forEach(b => { b.style.background = ''; });
          btn.style.background = '#5a8a3c';
          card.dataset.diff = d;
        });
        diffRow.appendChild(btn);
      });
      card.appendChild(diffRow);

      // Stats row
      const total = (mg.playsEasy || 0) + (mg.playsMedium || 0) + (mg.playsHard || 0);
      const stats = mk('div');
      stats.style.cssText = 'font-size:10px;color:rgba(255,255,255,.35)';
      stats.textContent = `Played: ${total}  ·  Best: ${_bestDiff(g.id)}`;
      card.appendChild(stats);

      // Play button
      const playBtn = mk('button', 'ug-btn');
      playBtn.textContent = '▶ Play';
      playBtn.style.cssText = 'width:100%;background:#5a8a3c;font-size:13px;padding:9px 0;font-weight:700';
      playBtn.addEventListener('click', () => _startGame(g.id, card.dataset.diff || 'easy'));
      card.appendChild(playBtn);

      body.appendChild(card);
    });
  }

  // ── Game screen wrapper ────────────────────────────────────────────────────

  function _startGame(gameId, difficulty) {
    _clearAll();
    const body = _body();
    if (!body) return;
    body.innerHTML = '';
    body.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden';

    // Header
    const hdr = mk('div');
    hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,0,0,.22);border-bottom:1px solid rgba(0,0,0,.3);flex-shrink:0';

    const backBtn = mk('button', 'ug-btn');
    backBtn.textContent = '← Back';
    backBtn.style.cssText = 'font-size:11px;padding:4px 10px';
    backBtn.addEventListener('click', () => { _clearAll(); _renderLanding(); });

    const titleEl = mk('div');
    titleEl.style.cssText = 'font-size:13px;font-weight:700;color:#f0d080';
    titleEl.textContent = gameId === 'soilMixer' ? '🪱 Soil Mixer' : '💧 Water Flow';

    const badge = mk('div');
    badge.style.cssText = 'font-size:11px;font-weight:700;padding:3px 9px;border-radius:4px;background:rgba(255,255,255,.13);color:#fff';
    badge.textContent = _diffLabel(difficulty);

    hdr.appendChild(backBtn);
    hdr.appendChild(titleEl);
    hdr.appendChild(badge);
    body.appendChild(hdr);

    // Reward hint
    const reward = calcMinigameReward(gameId, difficulty, true);
    const hint = mk('div');
    hint.style.cssText = 'text-align:center;font-size:10px;color:rgba(255,255,255,.38);padding:5px 0;flex-shrink:0';
    hint.innerHTML = `Win reward: ${coinHTML()}${formatNumber(reward)}`;
    body.appendChild(hint);

    // Game area
    const area = mk('div');
    area.id = 'mg-game-area';
    area.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;position:relative;overflow:hidden;min-height:0';
    body.appendChild(area);

    if (gameId === 'soilMixer') _playSoilMixer(area, difficulty);
    else _playWaterFlow(area, difficulty);
  }

  // ── Result overlay ─────────────────────────────────────────────────────────

  function _showResult(gameId, difficulty, won) {
    _clearAll();
    const area = document.getElementById('mg-game-area');
    if (!area) return;

    const reward = calcMinigameReward(gameId, difficulty, won);

    const ov = mk('div');
    ov.style.cssText = [
      'position:absolute;inset:0;background:rgba(0,0,0,.85)',
      'display:flex;flex-direction:column;align-items:center;justify-content:center',
      'gap:12px;z-index:50;padding:24px;text-align:center',
    ].join(';');

    const icon = mk('div');
    icon.style.cssText = 'font-size:3rem;line-height:1';
    icon.textContent = won ? '🎉' : '❌';

    const msg = mk('div');
    msg.style.cssText = `font-size:15px;font-weight:700;color:${won ? '#8de88d' : '#ff8080'}`;
    if (won) msg.innerHTML = `You won! Earned ${coinHTML()}${formatNumber(reward)}`;
    else     msg.textContent = 'Better luck next time!';

    const btns = mk('div');
    btns.style.cssText = 'display:flex;gap:10px;margin-top:6px';

    const again = mk('button', 'ug-btn');
    again.textContent = 'Play Again';
    again.style.cssText = 'background:#5a8a3c;padding:7px 18px;font-size:12px;font-weight:600';
    again.addEventListener('click', () => _startGame(gameId, difficulty));

    const back = mk('button', 'ug-btn');
    back.textContent = 'Back to Games';
    back.style.cssText = 'padding:7px 18px;font-size:12px';
    back.addEventListener('click', () => _renderLanding());

    btns.appendChild(again);
    btns.appendChild(back);
    ov.appendChild(icon);
    ov.appendChild(msg);
    ov.appendChild(btns);
    area.appendChild(ov);

    EventBus.emit('minigame:complete', { gameId, difficulty, won });
  }

  // ══════════════════════════════
  // SOIL MIXER  —  Simon Says
  // ══════════════════════════════

  function _playSoilMixer(area, difficulty) {
    const cfg = SOIL_CFG[difficulty];
    let sequence    = [];
    let playerInput = [];
    let round       = 0;
    let phase       = 'idle'; // idle | showing | waiting

    // Status text
    const statusEl = mk('div');
    statusEl.style.cssText = 'font-size:12px;color:rgba(255,255,255,.72);height:18px;text-align:center;font-weight:600;margin-bottom:8px;flex-shrink:0';

    const progressEl = mk('div');
    progressEl.style.cssText = 'font-size:10px;color:rgba(255,255,255,.38);text-align:center;margin-bottom:16px;flex-shrink:0';

    // Timer bar
    const timerWrap = mk('div');
    timerWrap.style.cssText = 'width:220px;height:4px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;margin-bottom:16px;flex-shrink:0';
    const timerBar = mk('div');
    timerBar.style.cssText = 'height:100%;width:100%;background:#5a8a3c;transition:width linear';
    timerWrap.appendChild(timerBar);

    // Soil buttons 2×2
    const grid = mk('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px';

    const soilBtns = SOIL_COLORS.map((sc, idx) => {
      const btn = mk('button');
      btn.style.cssText = [
        `width:108px;height:76px;border-radius:8px`,
        `border:2px solid rgba(255,255,255,.15)`,
        `background:${sc.color};cursor:pointer`,
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px',
        'font-size:10px;font-weight:700;color:rgba(255,255,255,.85);letter-spacing:.4px',
        'user-select:none;transition:transform .07s',
      ].join(';');
      const em = mk('span'); em.style.fontSize = '1.5rem'; em.style.lineHeight = '1';
      em.textContent = sc.emoji;
      const nm = mk('span'); nm.textContent = sc.name;
      btn.appendChild(em); btn.appendChild(nm);

      btn.addEventListener('click', () => {
        if (phase !== 'waiting') return;
        // Clear pending response timeout (registered via _t, so clear all — restart below)
        _clearAll();
        playerInput.push(idx);
        const expected = sequence[playerInput.length - 1];

        if (idx !== expected) {
          _flashBtn(idx, '#e74c3c');
          phase = 'idle';
          _setDisabled(true);
          _t(() => _showResult('soilMixer', difficulty, false), 600);
          return;
        }

        _flashBtn(idx, sc.flash);

        if (playerInput.length === sequence.length) {
          round++;
          _setDisabled(true);
          if (round >= cfg.rounds) {
            phase = 'idle';
            statusEl.textContent = '🎉 Complete!';
            _t(() => _showResult('soilMixer', difficulty, true), 700);
          } else {
            _t(_nextRound, 700);
          }
        } else {
          // Keep waiting — restart response timer
          const remCount = sequence.length - playerInput.length;
          _setTimerBar(cfg.respondMs);
          _t(() => {
            if (phase === 'waiting') {
              phase = 'idle';
              _setDisabled(true);
              _showResult('soilMixer', difficulty, false);
            }
          }, cfg.respondMs);
        }
      });

      grid.appendChild(btn);
      return btn;
    });

    area.appendChild(progressEl);
    area.appendChild(statusEl);
    area.appendChild(timerWrap);
    area.appendChild(grid);

    function _flashBtn(idx, color) {
      const btn = soilBtns[idx];
      const orig = SOIL_COLORS[idx].color;
      btn.style.background = color;
      btn.style.transform  = 'scale(1.08)';
      _t(() => { btn.style.background = orig; btn.style.transform = 'scale(1)'; }, 180);
    }

    function _setDisabled(off) {
      soilBtns.forEach(b => {
        b.disabled    = off;
        b.style.opacity = off ? '0.55' : '1';
        b.style.cursor  = off ? 'default' : 'pointer';
      });
    }

    function _setTimerBar(ms) {
      timerBar.style.transition = 'none';
      timerBar.style.width = '100%';
      requestAnimationFrame(() => {
        timerBar.style.transition = `width ${ms}ms linear`;
        timerBar.style.width = '0%';
      });
    }

    function _showSequence() {
      phase = 'showing';
      statusEl.textContent = '👀 Watch the sequence…';
      timerBar.style.transition = 'none';
      timerBar.style.width = '100%';
      _setDisabled(true);

      let step = 0;
      function nextFlash() {
        if (step >= sequence.length) {
          _t(() => {
            statusEl.textContent = '🤔 Repeat the sequence!';
            phase = 'waiting';
            playerInput = [];
            _setDisabled(false);
            _setTimerBar(cfg.respondMs);
            _t(() => {
              if (phase === 'waiting') {
                phase = 'idle';
                _setDisabled(true);
                _showResult('soilMixer', difficulty, false);
              }
            }, cfg.respondMs);
          }, cfg.flashMs);
          return;
        }
        _flashBtn(sequence[step], SOIL_COLORS[sequence[step]].flash);
        step++;
        _t(nextFlash, cfg.flashMs);
      }
      _t(nextFlash, 500);
    }

    function _nextRound() {
      sequence.push(Math.floor(Math.random() * 4));
      progressEl.textContent = `Round ${sequence.length} / ${cfg.rounds}`;
      statusEl.textContent = '…';
      _showSequence();
    }

    _t(_nextRound, 400);
  }

  // ══════════════════════════════
  // WATER FLOW  —  Timing intercept
  // ══════════════════════════════

  function _playWaterFlow(area, difficulty) {
    const cfg = WATER_CFG[difficulty];
    const ZONE_START = 0.36;
    const zoneEnd = ZONE_START + cfg.zoneW;

    let pos      = 0.05;
    let dir      = 1;
    let catches  = 0;
    let attempts = 0;
    let phase    = 'playing'; // playing | done
    let lastMs   = null;

    // Score
    const scoreEl = mk('div');
    scoreEl.style.cssText = 'font-size:13px;font-weight:700;color:rgba(255,255,255,.72);text-align:center;margin-bottom:6px';

    const attemptsEl = mk('div');
    attemptsEl.style.cssText = 'font-size:10px;color:rgba(255,255,255,.38);text-align:center;margin-bottom:18px';

    // Pipe
    const pipeWrap = mk('div');
    pipeWrap.style.cssText = 'width:100%;max-width:320px;margin-bottom:20px';

    const pipe = mk('div');
    pipe.style.cssText = 'width:100%;height:36px;background:rgba(0,0,0,.4);border-radius:18px;position:relative;overflow:hidden;border:2px solid rgba(255,255,255,.18)';

    // Zone highlight
    const zone = mk('div');
    zone.style.cssText = `position:absolute;top:0;bottom:0;left:${ZONE_START*100}%;width:${cfg.zoneW*100}%;background:rgba(80,200,80,.35);border-left:2px solid rgba(80,200,80,.7);border-right:2px solid rgba(80,200,80,.7)`;
    pipe.appendChild(zone);

    // Moving drop
    const drop = mk('div');
    drop.style.cssText = 'position:absolute;top:50%;left:5%;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#a0d8f8,#3488cc);transform:translate(-50%,-50%);box-shadow:0 0 10px rgba(80,180,255,.7)';
    pipe.appendChild(drop);

    pipeWrap.appendChild(pipe);

    // Intercept button
    const catchBtn = mk('button', 'ug-btn');
    catchBtn.textContent = '💧 Intercept!';
    catchBtn.style.cssText = 'font-size:14px;font-weight:700;padding:11px 28px;background:#2980b9;color:#fff;min-width:160px;border-color:#5ab8fb';
    catchBtn.addEventListener('click', () => {
      if (phase !== 'playing') return;
      attempts++;
      const hit = pos >= ZONE_START && pos <= zoneEnd;

      feedbackEl.textContent = hit ? '✅ Hit!' : '❌ Miss!';
      feedbackEl.style.color = hit ? '#8de88d' : '#ff8080';
      _t(() => { feedbackEl.textContent = ''; }, 550);

      if (hit) {
        catches++;
        catchBtn.style.background = '#27ae60';
        _t(() => { catchBtn.style.background = '#2980b9'; }, 200);
        if (catches >= cfg.needed) {
          phase = 'done';
          _t(() => _showResult('waterFlow', difficulty, true), 600);
          return;
        }
      } else {
        catchBtn.style.background = '#c0392b';
        _t(() => { catchBtn.style.background = '#2980b9'; }, 200);
        if (attempts >= cfg.maxAttempts) {
          phase = 'done';
          _t(() => _showResult('waterFlow', difficulty, false), 600);
          return;
        }
      }
      _updateHUD();
    });

    const feedbackEl = mk('div');
    feedbackEl.style.cssText = 'font-size:12px;font-weight:700;height:18px;text-align:center;margin-top:8px';

    area.appendChild(scoreEl);
    area.appendChild(attemptsEl);
    area.appendChild(pipeWrap);
    area.appendChild(catchBtn);
    area.appendChild(feedbackEl);

    function _updateHUD() {
      scoreEl.innerHTML = `Caught: ${catches} / ${cfg.needed}`;
      attemptsEl.textContent = `Attempts: ${attempts} / ${cfg.maxAttempts}`;
      const remaining = cfg.maxAttempts - attempts;
      catchBtn.style.background = remaining <= 3 ? '#c0392b' : '#2980b9';
    }
    _updateHUD();

    // rAF animation loop
    function tick(ts) {
      if (phase === 'done') return;
      if (lastMs === null) lastMs = ts;
      const dt = Math.min((ts - lastMs) / 16, 3); // delta in ~16ms units
      lastMs = ts;

      pos += dir * cfg.speed * dt;
      if (pos >= 0.97) { pos = 0.97; dir = -1; }
      if (pos <= 0.03) { pos = 0.03; dir =  1; }
      drop.style.left = (pos * 100) + '%';

      // Pulse drop when in zone
      const inZone = pos >= ZONE_START && pos <= zoneEnd;
      drop.style.boxShadow = inZone
        ? '0 0 14px rgba(80,200,80,.9)'
        : '0 0 10px rgba(80,180,255,.7)';

      _raf = requestAnimationFrame(tick);
    }
    _raf = requestAnimationFrame(tick);
  }

  // ── Modal public API ───────────────────────────────────────────────────────

  function open() {
    const backdrop = document.getElementById('mg-backdrop');
    const modal    = document.getElementById('mg-modal');
    if (!modal) return;
    backdrop.style.display = 'block';
    modal.style.display    = 'flex';
    _renderLanding();
    EventBus.emit('modal:open');
  }

  function close() {
    _clearAll();
    const backdrop = document.getElementById('mg-backdrop');
    const modal    = document.getElementById('mg-modal');
    if (!modal) return;
    backdrop.style.display = 'none';
    modal.style.display    = 'none';
    EventBus.emit('modal:close');
  }

  return { open, close };
})();
