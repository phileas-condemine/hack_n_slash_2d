// Arcane Rift - audio 100% synthétisé (WebAudio) : SFX + nappe musicale par ère
window.AR = window.AR || {};

AR.Audio = {
  ctx: null, master: null, musicGain: null,
  muted: false,
  _noiseBuf: null,
  _musicTimer: 0, _musicEra: -1, _droneOsc: null, _droneGain: null,
  _scaleIdx: 0,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate * 1;
      this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this._noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { /* audio indisponible */ }
  },

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },

  _osc(type, freq, dur, vol, freqEnd, delay) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (delay || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  },

  _noise(dur, vol, filterFreq, filterEnd, type) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.setValueAtTime(filterFreq, t0);
    if (filterEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, filterEnd), t0 + dur);
    f.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  },

  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'slash': this._noise(0.12, 0.30, 2400, 700); break;
      case 'slash2': this._noise(0.14, 0.32, 2000, 500); break;
      case 'slashHeavy': this._noise(0.24, 0.42, 1400, 250); this._osc('sawtooth', 140, 0.2, 0.18, 60); break;
      case 'chargedSlash': this._noise(0.3, 0.5, 900, 180); this._osc('sine', 320, 0.28, 0.3, 90); break;
      case 'bow': this._osc('triangle', 900, 0.09, 0.25, 300); this._noise(0.06, 0.12, 3200, 1500); break;
      case 'chargedBow': this._osc('sawtooth', 1400, 0.22, 0.3, 220); this._noise(0.16, 0.3, 4000, 800); break;
      case 'chargeReady': this._osc('sine', 660, 0.09, 0.22); this._osc('sine', 990, 0.12, 0.22, undefined, 0.07); break;
      case 'hit': this._noise(0.09, 0.3, 700, 200, 'lowpass'); this._osc('square', 180, 0.07, 0.12, 90); break;
      case 'crit': this._noise(0.12, 0.35, 900, 250, 'lowpass'); this._osc('square', 320, 0.12, 0.2, 110); break;
      case 'hurt': this._osc('sawtooth', 220, 0.22, 0.32, 70); this._noise(0.15, 0.25, 500, 150, 'lowpass'); break;
      case 'die': this._osc('sawtooth', 160, 0.7, 0.35, 35); this._noise(0.5, 0.3, 400, 80, 'lowpass'); break;
      case 'jump': this._osc('sine', 300, 0.14, 0.16, 520); break;
      case 'djump': this._osc('sine', 380, 0.16, 0.18, 700); break;
      case 'dash': this._noise(0.16, 0.28, 1600, 3800, 'highpass'); break;
      case 'land': this._noise(0.07, 0.14, 300, 120, 'lowpass'); break;
      case 'coin': this._osc('square', 1400, 0.06, 0.10); this._osc('square', 1900, 0.10, 0.10, undefined, 0.05); break;
      case 'potion': this._osc('sine', 400, 0.3, 0.2, 800); break;
      case 'chest': this._osc('triangle', 500, 0.12, 0.2); this._osc('triangle', 750, 0.14, 0.2, undefined, 0.09); this._osc('triangle', 1000, 0.2, 0.2, undefined, 0.18); break;
      case 'buy': this._osc('square', 900, 0.08, 0.14); this._osc('square', 1200, 0.12, 0.14, undefined, 0.06); break;
      case 'levelup': [440, 550, 660, 880].forEach((f, i) => this._osc('triangle', f, 0.25, 0.2, undefined, i * 0.08)); break;
      case 'skill': this._osc('triangle', 700, 0.2, 0.2, 1050); break;
      case 'spell': this._osc('sine', 500, 0.35, 0.28, 150); this._noise(0.3, 0.2, 1800, 400); break;
      case 'spellVeil': this._osc('sine', 800, 0.8, 0.2, 100); break;
      case 'enemyShoot': this._noise(0.08, 0.16, 1800, 700); break;
      case 'boom': this._noise(0.5, 0.5, 350, 60, 'lowpass'); this._osc('sine', 90, 0.4, 0.4, 30); break;
      case 'telegraph': this._osc('square', 200, 0.12, 0.08, 160); break;
      case 'bossRoar': this._osc('sawtooth', 90, 0.9, 0.4, 45); this._noise(0.8, 0.3, 250, 60, 'lowpass'); break;
      case 'bossDie': this._osc('sawtooth', 120, 1.4, 0.4, 25); this._noise(1.2, 0.4, 500, 40, 'lowpass'); [220, 330, 440, 660].forEach((f, i) => this._osc('triangle', f, 0.4, 0.18, undefined, 0.5 + i * 0.12)); break;
      case 'portal': this._osc('sine', 200, 1.0, 0.2, 900); break;
      case 'gate': this._noise(0.5, 0.35, 200, 60, 'lowpass'); break;
      case 'laser': this._osc('sawtooth', 1800, 0.3, 0.2, 300); break;
      case 'flame': this._noise(0.25, 0.2, 900, 500); break;
      case 'ui': this._osc('sine', 700, 0.05, 0.1); break;
      case 'error': this._osc('square', 160, 0.15, 0.14, 110); break;
      case 'block': this._noise(0.08, 0.3, 2600, 900); this._osc('square', 520, 0.1, 0.16, 260); break;
      case 'parry': this._osc('triangle', 1600, 0.07, 0.22, 900); this._noise(0.06, 0.2, 4200, 1800, 'highpass'); break;
      case 'tpWindup': this._osc('sine', 240, 0.5, 0.14, 720); break;
    }
  },

  // Gammes pentatoniques par ère (racine différente = ambiance différente)
  MUSIC: [
    { root: 220.0, wave: 'triangle', tempo: 2.2 },  // âge de pierre - grave, lent
    { root: 261.6, wave: 'triangle', tempo: 1.8 },  // antiquité
    { root: 293.7, wave: 'sine', tempo: 1.6 },      // japon médiéval
    { root: 246.9, wave: 'triangle', tempo: 1.5 },  // renaissance
    { root: 196.0, wave: 'sawtooth', tempo: 1.4 },  // guerre diesel - sombre
    { root: 329.6, wave: 'square', tempo: 1.1 },    // ère cyber - synthétique
  ],
  PENTA: [1, 1.2, 1.333, 1.5, 1.8, 2, 2.4],

  music(era, dt) {
    if (!this.ctx || this.muted) return;
    if (era !== this._musicEra) {
      this._musicEra = era;
      if (this._droneOsc) { try { this._droneOsc.stop(); } catch (e) {} this._droneOsc = null; }
      if (era >= 0) {
        const m = this.MUSIC[era % 6];
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = m.root / 4;
        g.gain.value = 0.10;
        o.connect(g); g.connect(this.musicGain);
        o.start();
        this._droneOsc = o; this._droneGain = g;
      }
    }
    if (era < 0) return;
    this._musicTimer -= dt;
    if (this._musicTimer <= 0) {
      const m = this.MUSIC[era % 6];
      this._musicTimer = m.tempo * (0.5 + Math.random());
      this._scaleIdx = AR.U.clamp(this._scaleIdx + Math.floor(Math.random() * 3) - 1, 0, this.PENTA.length - 1);
      const f = m.root * this.PENTA[this._scaleIdx] * (Math.random() < 0.2 ? 0.5 : 1);
      const t0 = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = m.wave; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + m.tempo * 0.9);
      o.connect(g); g.connect(this.musicGain);
      o.start(t0); o.stop(t0 + m.tempo);
    }
  },

  stopMusic() { this.music(-1, 0); },
};
