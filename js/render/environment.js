window.RenderEnv = (() => {
  const SKY = [
    { t:0.00, r:10,  g:10,  b:30  },   // midnight
    { t:0.20, r:30,  g:15,  b:60  },   // pre-dawn
    { t:0.28, r:180, g:90,  b:40  },   // sunrise
    { t:0.32, r:135, g:206, b:235 },   // morning
    { t:0.50, r:135, g:206, b:235 },   // midday
    { t:0.70, r:135, g:206, b:235 },   // afternoon
    { t:0.78, r:255, g:140, b:60  },   // sunset
    { t:0.82, r:60,  g:30,  b:80  },   // dusk
    { t:1.00, r:10,  g:10,  b:30  },   // midnight
  ];

  const DAY_SEEDS   = new Set(['potato','carrot','wheat','sunflower','pumpkin']);
  const NIGHT_SEEDS = new Set(['moonbloom','voidbloom','eclipseLotus','netherfruit','genesisSeed']);

  const TOD_ICONS = { dawn:'🌅', day:'🌞', dusk:'🌆', night:'🌙' };
  const TOD_MSGS  = {
    dawn:  '🌅 Dawn breaks.',
    day:   '🌞 Day — crops thrive.',
    dusk:  '🌆 Dusk settles.',
    night: '🌙 Night falls — crops slow.',
  };

  let skyEl, sunEl, moonEl, starsEl;
  let prevTod = null;
  const DAY_MS = 20 * 60 * 1000; // 20-minute day cycle

  function lerpSky(frac) {
    let a = SKY[0], b = SKY[SKY.length - 1];
    for (let i = 0; i < SKY.length - 1; i++) {
      if (frac >= SKY[i].t && frac <= SKY[i + 1].t) { a = SKY[i]; b = SKY[i + 1]; break; }
    }
    const span = b.t - a.t || 1;
    const p    = (frac - a.t) / span;
    return {
      r: Math.round(a.r + (b.r - a.r) * p),
      g: Math.round(a.g + (b.g - a.g) * p),
      b: Math.round(a.b + (b.b - a.b) * p),
    };
  }

  function _fracToTod(frac) {
    if (frac >= 0.20 && frac < 0.28) return 'dawn';
    if (frac >= 0.28 && frac < 0.72) return 'day';
    if (frac >= 0.72 && frac < 0.80) return 'dusk';
    return 'night';
  }

  // Returns the effective speed multiplier for a seed at the current time of day.
  // day/night: global ±15%. Day/night-themed seeds get an additional ±20% on top.
  function getDayNightMult(seedId) {
    const tod = STATE.session.timeOfDay || 'day';
    let global = 1.0;
    if (tod === 'day')   global = 1.15;
    if (tod === 'night') global = 0.85;
    let crop = 1.0;
    if (DAY_SEEDS.has(seedId)) {
      if (tod === 'day')   crop = 1.20;
      if (tod === 'night') crop = 0.80;
    } else if (NIGHT_SEEDS.has(seedId)) {
      if (tod === 'night') crop = 1.20;
      if (tod === 'day')   crop = 0.80;
    }
    return global * crop;
  }

  function init() {
    if (!STATE.meta.dayOffset) {
      STATE.meta.dayOffset = Date.now() - (DAY_MS * 0.25);
    }
    skyEl = document.getElementById('game-area');

    // Sun
    sunEl = document.createElement('div');
    sunEl.id = 'env-sun';
    sunEl.style.cssText = 'position:fixed;pointer-events:none;z-index:0;font-size:28px;transition:opacity .5s';
    sunEl.textContent = '☀️';
    document.body.appendChild(sunEl);

    // Moon
    moonEl = document.createElement('div');
    moonEl.id = 'env-moon';
    moonEl.style.cssText = 'position:fixed;pointer-events:none;z-index:0;font-size:24px;transition:opacity .5s';
    moonEl.textContent = '🌙';
    document.body.appendChild(moonEl);

    // Stars container
    starsEl = document.createElement('div');
    starsEl.id = 'env-stars';
    starsEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden';
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('div');
      s.style.cssText = `position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;
        left:${Math.random()*100}%;top:${Math.random()*40}%;
        opacity:${0.4 + Math.random() * 0.6}`;
      starsEl.appendChild(s);
    }
    document.body.appendChild(starsEl);

    updateSky();
  }

  function updateSky() {
    const frac = ((Date.now() - STATE.meta.dayOffset) % DAY_MS) / DAY_MS;
    const { r, g, b } = lerpSky(frac);
    document.body.style.background = `rgb(${r},${g},${b})`;

    const tod = _fracToTod(frac);
    if (tod !== prevTod) {
      STATE.session.timeOfDay = tod;
      if (prevTod !== null && typeof log === 'function') log(TOD_MSGS[tod]);
      prevTod = tod;
      const iconEl = document.getElementById('tod-icon');
      if (iconEl) iconEl.textContent = TOD_ICONS[tod];
    }

    const isDay   = frac > 0.28 && frac < 0.78;
    const isNight = frac < 0.22 || frac > 0.85;
    const sunFrac = isDay ? (frac - 0.28) / 0.50 : 0;

    if (sunEl) {
      sunEl.style.opacity  = isDay ? '1' : '0';
      sunEl.style.left     = `${10 + sunFrac * 70}vw`;
      sunEl.style.top      = `${8  + Math.sin(sunFrac * Math.PI) * -6 + 5}vh`;
    }
    if (moonEl) {
      const moonFrac = isNight ? ((frac > 0.85 ? frac - 0.85 : frac + 0.15) / 0.37) : 0;
      moonEl.style.opacity = isNight ? '1' : '0';
      moonEl.style.left    = `${10 + moonFrac * 70}vw`;
      moonEl.style.top     = '6vh';
    }
    if (starsEl) {
      starsEl.style.opacity = isNight ? '1' : isDay ? '0' : String(Math.max(0, (frac < 0.28 ? (0.28 - frac) : (frac - 0.78)) * 10));
    }
  }

  return { init, updateSky, getDayNightMult };
})();
