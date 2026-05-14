// ══════════════════════════════
// AUDIO SFX SHIM
// ══════════════════════════════
var sfx = {
  plant()        { Audio.playPlant(); },
  harvest()      { Audio.playHarvest(); },
  drop()         { Audio.playDrop(); },
  sell(v)        { Audio.playSell(v); },
  sellAuto()     { Audio.playAutoSell(); },
  attack()       { Audio.playCrow(); },
  weedClick()    { Audio.playWeedClick(); },
  upgrade()      { Audio.playUpgrade(); },
  stageAdvance() { Audio.playStage(); },
  locust()       { Audio.playLocust(); },
};

window.Audio = (() => {
  let _ctx = null;

  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  document.addEventListener('click', () => { if (!_ctx) ctx(); }, { once: true });

  function _play(setup) {
    if (STATE.settings.muted) return;
    try { setup(ctx()); } catch (_) {}
  }

  return {
    playPlant() {
      _play(c => {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sine'; o.frequency.setValueAtTime(180, c.currentTime);
        g.gain.setValueAtTime(0.35, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
        o.start(); o.stop(c.currentTime + 0.08);
      });
    },

    playHarvest() {
      _play(c => {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(520, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(260, c.currentTime + 0.12);
        g.gain.setValueAtTime(0.4, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
        o.start(); o.stop(c.currentTime + 0.12);
      });
    },

    playDrop() {
      _play(c => {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sine'; o.frequency.setValueAtTime(140, c.currentTime);
        g.gain.setValueAtTime(0.3, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
        o.start(); o.stop(c.currentTime + 0.06);
      });
    },

    playSell(vol = 1.0) {
      _play(c => {
        [880, 1100].forEach(freq => {
          const o = c.createOscillator(), g = c.createGain();
          o.connect(g); g.connect(c.destination);
          o.type = 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
          g.gain.setValueAtTime(0.20 * vol, c.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
          o.start(); o.stop(c.currentTime + 0.3);
        });
      });
    },

    playAutoSell() { this.playSell(0.5); },

    playCrow() {
      _play(c => {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(400, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.15);
        g.gain.setValueAtTime(0.25, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
        o.start(); o.stop(c.currentTime + 0.15);
      });
    },

    playWeedClick() {
      _play(c => {
        const o = c.createOscillator(), g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sine'; o.frequency.setValueAtTime(300, c.currentTime);
        g.gain.setValueAtTime(0.18, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
        o.start(); o.stop(c.currentTime + 0.04);
      });
    },

    playUpgrade() {
      _play(c => {
        [440, 660, 880].forEach((freq, i) => {
          const t = c.currentTime + i * 0.08;
          const o = c.createOscillator(), g = c.createGain();
          o.connect(g); g.connect(c.destination);
          o.type = 'sine'; o.frequency.setValueAtTime(freq, t);
          g.gain.setValueAtTime(0.25, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          o.start(t); o.stop(t + 0.08);
        });
      });
    },

    playStage() {
      _play(c => {
        [523, 659, 784].forEach(freq => {
          const o = c.createOscillator(), g = c.createGain();
          o.connect(g); g.connect(c.destination);
          o.type = 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
          g.gain.setValueAtTime(0.20, c.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.8);
          o.start(); o.stop(c.currentTime + 0.8);
        });
      });
    },

    playLocust() {
      _play(c => {
        const o = c.createOscillator(), lfo = c.createOscillator();
        const lfoG = c.createGain(), g = c.createGain();
        lfo.frequency.setValueAtTime(18, c.currentTime);
        lfoG.gain.setValueAtTime(30, c.currentTime);
        lfo.connect(lfoG); lfoG.connect(o.frequency);
        o.connect(g); g.connect(c.destination);
        o.type = 'sawtooth'; o.frequency.setValueAtTime(120, c.currentTime);
        g.gain.setValueAtTime(0.28, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
        lfo.start(); lfo.stop(c.currentTime + 0.6);
        o.start(); o.stop(c.currentTime + 0.6);
      });
    },

    setupMute() {
      STATE.settings.muted = localStorage.getItem('bliss_muted') === '1';
      const muteBtn = document.getElementById('mute-btn');
      muteBtn.textContent = STATE.settings.muted ? '🔇' : '🔊';
      muteBtn.addEventListener('click', e => {
        e.stopPropagation();
        STATE.settings.muted = !STATE.settings.muted;
        localStorage.setItem('bliss_muted', STATE.settings.muted ? '1' : '0');
        muteBtn.textContent = STATE.settings.muted ? '🔇' : '🔊';
      });
    },
  };
})();
