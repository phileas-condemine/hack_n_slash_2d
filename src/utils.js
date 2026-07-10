// Arcane Rift - utilitaires (math, RNG, collisions, easing)
window.AR = window.AR || {};

AR.U = {
  clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t) { return a + (b - a) * t; },
  // interpolation exponentielle indépendante du framerate
  damp(a, b, k, dt) { return AR.U.lerp(a, b, 1 - Math.exp(-k * dt)); },
  dist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); },
  angle(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
  sign(v) { return v < 0 ? -1 : 1; },
  rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },
  pointInRect(px, py, r) { return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h; },
  easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
  easeInCubic(t) { return t * t * t; },
  fmtTime(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  },
  choice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; },
  shuffle(rng, arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
};

// RNG déterministe (mulberry32) pour la génération procédurale seedée
AR.rng = function (seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Caméra avec suivi amorti, avance dans la direction du regard et tremblement
AR.Camera = class {
  constructor(vw, vh) {
    this.x = 0; this.y = 0; this.vw = vw; this.vh = vh;
    this.shakeT = 0; this.shakeMag = 0; this.sx = 0; this.sy = 0;
    this.lookAhead = 0;
  }
  follow(t, level, dt) {
    const arena = level.bossArena;
    if (arena && arena.active) {
      this.lookAhead = 0;
      this.x = arena.x;
      this.y = arena.y;
    } else {
      this.lookAhead = AR.U.damp(this.lookAhead, t.facing * 130, 3, dt);
      const tx = t.x + t.w / 2 + this.lookAhead - this.vw / 2;
      const ty = t.y + t.h / 2 - this.vh * 0.58;
      this.x = AR.U.damp(this.x, tx, 8, dt);
      this.y = AR.U.damp(this.y, ty, 5, dt);
      const maxX = level.tilesW * AR.C.TILE - this.vw;
      this.x = AR.U.clamp(this.x, 0, Math.max(0, maxX));
      this.y = AR.U.clamp(this.y, -AR.C.TILE * 6, AR.C.WORLD_H * AR.C.TILE - this.vh);
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      this.sx = (Math.random() * 2 - 1) * this.shakeMag * (this.shakeT * 4);
      this.sy = (Math.random() * 2 - 1) * this.shakeMag * (this.shakeT * 4);
    } else { this.sx = 0; this.sy = 0; }
  }
  shake(mag, dur) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, dur); }
  cx() { return Math.round(this.x + this.sx); }
  cy() { return Math.round(this.y + this.sy); }
};

// Sauvegarde locale (records + réglages, style roguelite)
AR.Save = {
  KEY: 'arcaneRift.v1',
  data: null,
  load() {
    try { this.data = JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch (e) { this.data = {}; }
    this.data.records = this.data.records || { bestEra: 0, bestLevel: 0, totalKills: 0, runs: 0, wins: 0, bestTime: 0 };
    this.data.settings = this.data.settings || { muted: false };
    return this.data;
  },
  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) { /* stockage indisponible */ }
  },
};
