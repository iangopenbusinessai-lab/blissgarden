// ══════════════════════════════
// EVENT BUS
// ══════════════════════════════
window.EventBus = {
  listeners: {},
  on(e, fn)  { (this.listeners[e] ??= []).push(fn); },
  off(e, fn) { if (this.listeners[e]) this.listeners[e] = this.listeners[e].filter(f => f !== fn); },
  emit(e, data) { (this.listeners[e] ?? []).slice().forEach(fn => fn(data)); },
};

// ══════════════════════════════
// TIMER MANAGER
// ══════════════════════════════
// interval may be a number or a () => number function (for dynamic timers).
// restart(id) resets elapsed so the timer picks up the current interval fresh.
window.TimerManager = {
  timers: {},

  register(id, { interval, fn, condition }) {
    this.timers[id] = { interval, fn, condition, elapsed: 0 };
  },

  unregister(id) {
    delete this.timers[id];
  },

  restart(id) {
    if (this.timers[id]) this.timers[id].elapsed = 0;
  },

  tick() {
    for (const t of Object.values(this.timers)) {
      t.elapsed += 50;
      const interval = typeof t.interval === 'function' ? t.interval() : t.interval;
      if (t.elapsed >= interval && t.condition()) {
        t.fn();
        t.elapsed = 0;
      }
    }
  },
};

setInterval(() => TimerManager.tick(), 50);

// ══════════════════════════════
// TIMER REGISTRATIONS
// ══════════════════════════════
const _stage = n => () => STATE.meta.stage >= n;

TimerManager.register('crow',    { interval: 10000,  condition: _stage(1), fn: () => {} });
TimerManager.register('weed',    { interval: 8000,   condition: _stage(1), fn: () => {} });
TimerManager.register('hawk',    { interval: 15000,  condition: _stage(2), fn: () => {} });
TimerManager.register('mole',    { interval: 45000,  condition: _stage(2), fn: () => {} });
TimerManager.register('rootRot', { interval: 180000, condition: _stage(3), fn: () => {} });
TimerManager.register('locust',  { interval: 30000,  condition: _stage(3), fn: () => {} });
TimerManager.register('blight',  { interval: 300000, condition: _stage(3), fn: () => {} });
TimerManager.register('fungal',  { interval: 240000, condition: _stage(3), fn: () => {} });
TimerManager.register('sell',    { interval: () => STATE.modifiers.sellInterval, condition: () => true, fn: () => {} });
TimerManager.register('save',    { interval: 10000,  condition: () => true, fn: () => {} });
