// Arcane Rift - niveaux procéduraux : terrain, collisions, parallaxe, décor, météo
window.AR = window.AR || {};

AR.Level = class {
  constructor(eraIdx, seed) {
    const C = AR.C, T = C.TILE;
    this.eraIdx = eraIdx;
    this.era = AR.ERAS[eraIdx];
    this.seed = seed;
    const rng = AR.rng(seed);
    this.rng = rng;
    this.PIT = 9999;

    // ----- squelette du terrain (hauteurs par colonne, en tuiles)
    const len = 400 + eraIdx * 22;
    const arenaLen = 34;
    this.tilesW = len + arenaLen;
    this.arenaStartTx = len;
    this.heights = new Array(this.tilesW).fill(22);
    this.platforms = [];   // plateformes traversables {tx,ty,w}
    this.props = [];
    this.spawns = [];      // {x,y,id,elite} consommés par le jeu
    this.chestSpots = [];
    this.gateClosed = false;
    this.gateTx = this.arenaStartTx + 1;

    let gy = 22, tx = 8;
    // zone de départ plate
    for (let i = 0; i < 8; i++) this.heights[i] = gy;
    this.spawnX = 3 * T;

    const merchantTxTarget = Math.floor(len * 0.46);
    this.merchantX = 0;
    let lastGapEnd = 0;

    while (tx < len) {
      const segLen = 4 + Math.floor(rng() * 7);
      const roll = rng();
      // marchand : zone plate protégée
      if (this.merchantX === 0 && tx >= merchantTxTarget) {
        for (let i = 0; i < 10 && tx < len; i++, tx++) this.heights[tx] = gy;
        this.merchantX = (tx - 5) * T;
        this.props.push({ type: 'stall', x: this.merchantX, y: gy * T });
        continue;
      }
      if (roll < 0.14 && tx > 24 && tx - lastGapEnd > 14) {
        // fosse (2-4 tuiles), parfois plateforme au-dessus
        const gap = 2 + Math.floor(rng() * 3);
        for (let i = 0; i < gap && tx < len; i++, tx++) this.heights[tx] = this.PIT;
        lastGapEnd = tx;
        if (gap >= 3 || rng() < 0.5) {
          this.platforms.push({ tx: tx - gap, ty: gy - 1 - Math.floor(rng() * 2), w: gap });
        }
      } else if (roll < 0.34) {
        // plateau surélevé avec marches
        const rise = 1 + Math.floor(rng() * 2);
        for (let s = 0; s < rise && tx < len; s++, tx++) { gy -= 1; this.heights[tx] = gy; }
        for (let i = 0; i < segLen && tx < len; i++, tx++) this.heights[tx] = gy;
        if (rng() < 0.6) { // redescente
          for (let s = 0; s < rise && tx < len; s++, tx++) { gy += 1; this.heights[tx] = gy; }
        }
      } else if (roll < 0.48) {
        // descente douce
        const drop = 1 + Math.floor(rng() * 2);
        gy = Math.min(25, gy + drop);
        for (let i = 0; i < segLen && tx < len; i++, tx++) this.heights[tx] = gy;
      } else {
        // segment plat
        for (let i = 0; i < segLen && tx < len; i++, tx++) this.heights[tx] = gy;
      }
      gy = AR.U.clamp(gy, 14, 25);

      // plateformes flottantes décoratives / à coffres
      if (rng() < 0.30 && tx > 16 && tx < len - 10) {
        const pw = 3 + Math.floor(rng() * 3);
        const py = this.heights[Math.min(tx, len - 1)] - 3 - Math.floor(rng() * 3);
        if (py > 8) {
          this.platforms.push({ tx: tx - pw - 1, ty: py, w: pw });
          if (rng() < 0.35) this.chestSpots.push({ x: (tx - pw - 1 + pw / 2) * T, y: py * T });
        }
      }
    }
    // arène du boss : plate
    const agy = AR.U.clamp(this.heights[len - 1] === this.PIT ? 22 : this.heights[len - 1], 18, 23);
    for (let i = len; i < this.tilesW; i++) this.heights[i] = agy;
    this.arenaGy = agy;
    this.bossX = (this.arenaStartTx + arenaLen * 0.62) * T;
    this.portalX = (this.arenaStartTx + arenaLen * 0.5) * T;
    this._buildBossArena();

    // ----- tours à coffres : parcours de plateformes exigeants mais réalisables
    // (enchaînements double saut / dash / frappe éclair ; le zigzag oblige souvent
    // à dépasser la tour puis à grimper en revenant vers la gauche)
    for (let ti = 0; ti < 2; ti++) {
      let base = Math.floor(len * (0.22 + ti * 0.38 + rng() * 0.12));
      let guard = 0;
      while (guard++ < 40 && base < len - 16 &&
             (this.heights[base] === this.PIT || Math.abs(base * T - this.merchantX) < 12 * T)) base++;
      if (base >= len - 16 || this.heights[base] === this.PIT) continue;
      const floors = 2 + Math.floor(rng() * 2);   // 2-3 relais avant le sommet
      let dir = rng() < 0.5 ? -1 : 1;             // -1 : la grimpe se fait de droite à gauche
      let px = base, py = this.heights[base] - 3;
      for (let f = 0; f <= floors; f++) {
        if (py < 6) break;
        const pw = 2 + Math.floor(rng() * 2);
        const ptx = AR.U.clamp(px - Math.floor(pw / 2), 3, len - 4);
        this.platforms.push({ tx: ptx, ty: py, w: pw });
        if (f === floors) {
          this.chestSpots.push({ x: (ptx + pw / 2) * T, y: py * T, high: true });
        } else {
          // bond suivant : 3-5 tuiles de côté, 2-3 tuiles de montée
          px += dir * (3 + Math.floor(rng() * 3));
          if (rng() < 0.65) dir *= -1;            // zigzag, parfois deux bonds du même côté
          py -= 2 + Math.floor(rng() * 2);
        }
      }
    }

    // ----- ennemis : paquets réguliers, densité croissante selon l'ère
    const pool = this.era.enemies;
    let ex = 20;
    const eliteSpots = [Math.floor(len * 0.30), Math.floor(len * 0.68)];
    while (ex < len - 14) {
      ex += 9 + Math.floor(rng() * (13 - Math.min(6, eraIdx * 1.5)));
      if (this.heights[ex] === this.PIT) continue;
      if (Math.abs(ex * T - this.merchantX) < 9 * T) continue;
      const packSize = 1 + Math.floor(rng() * (2 + Math.min(2, eraIdx * 0.6)));
      for (let i = 0; i < packSize; i++) {
        const sx = ex + i * 2;
        if (sx >= len || this.heights[sx] === this.PIT) continue;
        const id = pool[Math.floor(rng() * pool.length)];
        this.spawns.push({ x: sx * T + T / 2, y: this.heights[sx] * T, id, elite: false });
      }
    }
    for (const es of eliteSpots) {
      let sx = es;
      while (sx < len - 4 && this.heights[sx] === this.PIT) sx++;
      this.spawns.push({ x: sx * T + T / 2, y: this.heights[sx] * T, id: this.era.elite, elite: true });
    }
    // archers embusqués sur certaines plateformes
    for (const p of this.platforms) {
      if (rng() < 0.22 && p.tx > 18 && p.tx < len - 12) {
        const ranged = pool.filter((id) => ['ranged', 'caster', 'artillery'].includes(AR.ENEMIES[id].behavior));
        if (ranged.length) {
          this.spawns.push({ x: (p.tx + p.w / 2) * T, y: p.ty * T, id: ranged[Math.floor(rng() * ranged.length)], elite: false, onPlatform: true });
        }
      }
    }
    // coffres au sol additionnels
    for (let i = 0; i < 3; i++) {
      let cx = Math.floor(len * (0.18 + rng() * 0.7));
      while (cx < len - 4 && this.heights[cx] === this.PIT) cx++;
      this.chestSpots.push({ x: cx * T, y: this.heights[cx] * T });
    }

    // ----- props décoratifs
    const propTypes = this.era.props;
    for (let px = 10; px < len; px += 5 + Math.floor(rng() * 9)) {
      if (this.heights[px] === this.PIT) continue;
      this.props.push({
        type: propTypes[Math.floor(rng() * propTypes.length)],
        x: px * T + rng() * T, y: this.heights[px] * T, s: 0.7 + rng() * 0.6, r: rng(),
      });
    }
    // torches d'arène
    this.props.push({ type: 'fire', x: (this.arenaStartTx + 4) * T, y: agy * T, s: 1.2, r: 0.5 });
    this.props.push({ type: 'fire', x: (this.tilesW - 4) * T, y: agy * T, s: 1.2, r: 0.5 });

    // ----- couches de parallaxe pré-rendues + texture de sol
    this._buildLayers();
    this._buildGroundPattern();

    // ----- météo ambiante
    this.ambient = [];
    for (let i = 0; i < 70; i++) this.ambient.push(this._newAmbient(true));
  }

  _buildBossArena() {
    const def = AR.BOSS_ARENAS[this.era.boss];
    if (!def) { this.bossArena = null; return; }
    const width = AR.C.VIEW_W, height = AR.C.VIEW_H;
    const viewX = (this.arenaStartTx + 2) * AR.C.TILE;
    const viewY = 0;
    const platforms = def.platforms.map((p) => ({
      id: p.id,
      x: viewX + p.x * width,
      y: viewY + p.y * height,
      w: p.w * width,
      h: Math.max(2, p.h * height),
      ground: !!p.ground,
    }));
    const ground = platforms.find((p) => p.ground);
    this.bossArena = {
      id: def.id, image: def.image, active: false,
      x: viewX, y: viewY, width, height, platforms, ground,
      bounds: { x0: ground.x, x1: ground.x + ground.w },
    };
    this.bossX = ground.x + ground.w * 0.72;
    this.portalX = ground.x + ground.w * 0.5;
  }

  activateBossArena() {
    if (!this.bossArena) return null;
    this.bossArena.active = true;
    return this.bossArena;
  }

  // ==================================================== COLLISIONS
  solidAt(tx, ty) {
    if (tx < 0 || tx >= this.tilesW) return true;
    if (this.gateClosed && tx === this.gateTx && ty >= this.arenaGy - 7) return true;
    const h = this.heights[tx];
    return h !== this.PIT && ty >= h;
  }

  groundYpx(x) {
    const arena = this.bossArena;
    if (arena && arena.active && x >= arena.x && x <= arena.x + arena.width) return arena.ground.y;
    const tx = Math.floor(x / AR.C.TILE);
    if (tx < 0 || tx >= this.tilesW) return AR.C.WORLD_H * AR.C.TILE;
    const h = this.heights[tx];
    return h === this.PIT ? AR.C.WORLD_H * AR.C.TILE * 2 : h * AR.C.TILE;
  }

  // Déplace une AABB {x,y,w,h} et résout les collisions avec le terrain.
  // ignorePlatforms : traverser les plateformes (chute volontaire)
  moveRect(e, dx, dy, ignorePlatforms) {
    const T = AR.C.TILE;
    const res = { onGround: false, hitWall: false, hitCeil: false };
    // --- axe X
    let step = AR.U.clamp(dx, -T / 2, T / 2);
    let remaining = dx;
    while (Math.abs(remaining) > 0.0001) {
      step = AR.U.clamp(remaining, -T / 2, T / 2);
      e.x += step; remaining -= step;
      const dir = step > 0 ? 1 : -1;
      const edge = dir > 0 ? e.x + e.w : e.x;
      const etx = Math.floor(edge / T);
      for (let ty = Math.floor(e.y / T); ty <= Math.floor((e.y + e.h - 1) / T); ty++) {
        if (this.solidAt(etx, ty)) {
          e.x = dir > 0 ? etx * T - e.w - 0.01 : (etx + 1) * T + 0.01;
          res.hitWall = true; remaining = 0;
          break;
        }
      }
    }
    const arena = this.bossArena;
    if (arena && arena.active) {
      const minX = arena.bounds.x0, maxX = arena.bounds.x1 - e.w;
      if (e.x < minX) { e.x = minX; res.hitWall = true; }
      if (e.x > maxX) { e.x = maxX; res.hitWall = true; }
    }
    // --- axe Y
    remaining = dy;
    while (Math.abs(remaining) > 0.0001) {
      step = AR.U.clamp(remaining, -T / 2, T / 2);
      const prevBottom = e.y + e.h;
      e.y += step; remaining -= step;
      if (step > 0) {
        const bottom = e.y + e.h;
        const bty = Math.floor(bottom / T);
        let landed = false;
        for (let txx = Math.floor(e.x / T); txx <= Math.floor((e.x + e.w - 1) / T); txx++) {
          if (this.solidAt(txx, bty)) { e.y = bty * T - e.h - 0.01; landed = true; break; }
        }
        // plateformes traversables (uniquement en tombant, par le dessus)
        if (!landed && !ignorePlatforms) {
          for (const p of this.platforms) {
            const py = p.ty * T;
            if (prevBottom <= py + 1 && bottom >= py &&
                e.x + e.w > p.tx * T && e.x < (p.tx + p.w) * T) {
              e.y = py - e.h - 0.01; landed = true; break;
            }
          }
        }
        // Les surfaces de l'arène suivent au pixel près les métadonnées du fond.
        // Le sol principal reste solide pendant une chute volontaire ; les autres
        // plateformes conservent le comportement traversable du niveau.
        if (!landed && arena && arena.active) {
          for (const p of arena.platforms) {
            if (ignorePlatforms && !p.ground) continue;
            if (prevBottom <= p.y + 1 && bottom >= p.y &&
                e.x + e.w > p.x && e.x < p.x + p.w) {
              e.y = p.y - e.h - 0.01; landed = true; break;
            }
          }
        }
        if (landed) { res.onGround = true; remaining = 0; }
      } else if (step < 0) {
        const tty = Math.floor(e.y / T);
        for (let txx = Math.floor(e.x / T); txx <= Math.floor((e.x + e.w - 1) / T); txx++) {
          if (this.solidAt(txx, tty)) {
            e.y = (tty + 1) * T + 0.01; res.hitCeil = true; remaining = 0; break;
          }
        }
      }
    }
    return res;
  }

  // ==================================================== RENDU
  _buildLayers() {
    this.farLayer = this._renderSilhouette(0.55, this.era.far, 2048, 460);
    this.midLayer = this._renderSilhouette(0.8, this.era.mid, 2048, 380);
  }

  _renderSilhouette(density, color, w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    const rng = AR.rng(this.seed + (density * 1000 | 0));
    g.fillStyle = color;
    const era = this.era.id;
    let x = 0;
    while (x < w) {
      const bw = 60 + rng() * 180;
      const bh = h * (0.25 + rng() * 0.65) * density;
      const base = h;
      if (era === 'stone') {              // montagnes déchiquetées
        g.beginPath(); g.moveTo(x - 20, base);
        g.lineTo(x + bw * 0.5, base - bh);
        g.lineTo(x + bw + 20, base); g.closePath(); g.fill();
      } else if (era === 'antiquity') {   // temples et colonnes
        g.fillRect(x, base - bh * 0.55, bw, bh * 0.55);
        g.beginPath(); g.moveTo(x - 8, base - bh * 0.55);
        g.lineTo(x + bw / 2, base - bh * 0.8); g.lineTo(x + bw + 8, base - bh * 0.55);
        g.closePath(); g.fill();
        for (let c = x + 6; c < x + bw - 6; c += 16) g.clearRect(c, base - bh * 0.5, 6, bh * 0.42);
      } else if (era === 'medieval') {    // pagodes
        const floors = 2 + Math.floor(rng() * 3);
        for (let f = 0; f < floors; f++) {
          const fw = bw * (1 - f * 0.22), fy = base - bh * ((f + 1) / floors);
          g.fillRect(x + (bw - fw) / 2, fy, fw, bh / floors + 2);
          g.beginPath();
          g.moveTo(x + (bw - fw) / 2 - 14, fy);
          g.lineTo(x + bw / 2, fy - 16); g.lineTo(x + (bw + fw) / 2 + 14, fy);
          g.closePath(); g.fill();
        }
      } else if (era === 'renaissance') { // dômes et tours
        g.fillRect(x, base - bh * 0.6, bw, bh * 0.6);
        g.beginPath(); g.arc(x + bw / 2, base - bh * 0.6, bw * 0.42, Math.PI, 0); g.fill();
        g.fillRect(x + bw * 0.42, base - bh * 0.95, bw * 0.16, bh * 0.4);
      } else if (era === 'diesel') {      // usines, cheminées, chars
        g.fillRect(x, base - bh * 0.45, bw, bh * 0.45);
        g.fillRect(x + bw * 0.15, base - bh * 0.9, bw * 0.12, bh * 0.5);
        g.fillRect(x + bw * 0.55, base - bh * 0.75, bw * 0.10, bh * 0.35);
        if (rng() < 0.4) { g.beginPath(); g.arc(x + bw * 0.8, base - bh * 0.45, bw * 0.18, Math.PI, 0); g.fill(); }
      } else {                            // cyber : gratte-ciels néon
        g.fillRect(x, base - bh, bw * (0.4 + rng() * 0.5), bh);
        g.save();
        g.fillStyle = rng() < 0.5 ? '#e35cff' : '#42e8f5';
        g.globalAlpha = 0.5;
        for (let wy = base - bh + 8; wy < base - 10; wy += 14) {
          for (let wx = x + 4; wx < x + bw * 0.4 - 4; wx += 12) {
            if (rng() < 0.3) g.fillRect(wx, wy, 5, 7);
          }
        }
        g.restore();
        g.fillStyle = color;
      }
      x += bw * (0.6 + rng() * 0.8);
    }
    return cv;
  }

  _buildGroundPattern() {
    const cv = document.createElement('canvas');
    cv.width = 96; cv.height = 96;
    const g = cv.getContext('2d');
    const rng = AR.rng(this.seed + 77);
    g.fillStyle = this.era.ground; g.fillRect(0, 0, 96, 96);
    g.fillStyle = this.era.rock;
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.25 + rng() * 0.5;
      const s = 3 + rng() * 12;
      g.fillRect(rng() * 96, rng() * 96, s, s * (0.4 + rng() * 0.6));
    }
    this.groundPattern = cv;
  }

  drawBackground(ctx, cam) {
    const C = AR.C, era = this.era;
    // ciel
    const sky = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
    sky.addColorStop(0, era.sky[0]); sky.addColorStop(0.55, era.sky[1]); sky.addColorStop(1, era.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
    // astre
    const sx = C.VIEW_W * 0.72 - cam.cx() * 0.03, sy = C.VIEW_H * era.sunY;
    const grad = ctx.createRadialGradient(sx, sy, 8, sx, sy, era.moon ? 90 : 130);
    grad.addColorStop(0, era.sun); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(sx - 140, sy - 140, 280, 280);
    ctx.globalAlpha = era.moon ? 0.9 : 0.8;
    ctx.fillStyle = era.sun;
    ctx.beginPath(); ctx.arc(sx, sy, era.moon ? 34 : 42, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // couches de silhouettes
    this._tileLayer(ctx, this.farLayer, cam, 0.12, C.VIEW_H - 430);
    this._tileLayer(ctx, this.midLayer, cam, 0.30, C.VIEW_H - 300);
    // brume
    ctx.fillStyle = era.fog;
    ctx.fillRect(0, C.VIEW_H * 0.45, C.VIEW_W, C.VIEW_H * 0.55);
  }

  drawBossArena(ctx, cam) {
    const arena = this.bossArena;
    const img = arena && AR.Assets.images[arena.image];
    if (img && img.complete && img.naturalWidth) {
      ctx.fillStyle = this.era.sky[0];
      ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
      // Le fond appartient au monde : il suit exactement le tremblement de
      // caméra, comme les surfaces de collision et les combattants.
      ctx.drawImage(img, arena.x - cam.cx(), arena.y - cam.cy(), arena.width, arena.height);
      return;
    }
    ctx.fillStyle = this.era.sky[0];
    ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
  }

  _tileLayer(ctx, layer, cam, factor, yTop) {
    const off = (cam.cx() * factor) % layer.width;
    const y = yTop - cam.cy() * factor * 0.4;
    ctx.drawImage(layer, -off, y);
    ctx.drawImage(layer, -off + layer.width, y);
    if (off < 0) ctx.drawImage(layer, -off - layer.width, y);
  }

  drawTerrain(ctx, cam) {
    const T = AR.C.TILE, era = this.era;
    const cx = cam.cx(), cy = cam.cy();
    const tx0 = Math.max(0, Math.floor(cx / T) - 1);
    const tx1 = Math.min(this.tilesW - 1, Math.ceil((cx + AR.C.VIEW_W) / T) + 1);
    const pat = ctx.createPattern(this.groundPattern, 'repeat');
    for (let tx = tx0; tx <= tx1; tx++) {
      const h = this.heights[tx];
      if (h === this.PIT) continue;
      const x = tx * T - cx, y = h * T - cy;
      const depth = AR.C.WORLD_H * T - h * T + 200;
      ctx.fillStyle = pat;
      ctx.save(); ctx.translate(-cx % 96, -cy % 96);
      ctx.fillRect(x + cx % 96, y + cy % 96, T + 1, depth);
      ctx.restore();
      // bande de surface + liseré
      ctx.fillStyle = era.groundTop;
      ctx.fillRect(x, y, T + 1, 9);
      ctx.fillStyle = era.accent;
      ctx.globalAlpha = era.id === 'cyber' ? 0.95 : 0.55;
      ctx.fillRect(x, y, T + 1, 3);
      ctx.globalAlpha = 1;
      // ombrage des parois quand la hauteur change
      const hl = tx > 0 ? this.heights[tx - 1] : h;
      if (hl !== this.PIT && hl > h) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y, 6, (hl - h) * T);
      }
    }
    // plateformes
    for (const p of this.platforms) {
      const x = p.tx * T - cx, y = p.ty * T - cy;
      if (x > AR.C.VIEW_W + 60 || x + p.w * T < -60) continue;
      ctx.fillStyle = era.groundTop;
      ctx.fillRect(x, y, p.w * T, 12);
      ctx.fillStyle = era.accent;
      ctx.globalAlpha = 0.6; ctx.fillRect(x, y, p.w * T, 3); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 4, y + 12, p.w * T - 8, 5);
    }
    // porte de l'arène
    if (this.gateClosed) {
      const gx = this.gateTx * T - cx, gy = (this.arenaGy - 7) * T - cy;
      ctx.fillStyle = era.rock;
      ctx.fillRect(gx, gy, T, 7 * T);
      ctx.fillStyle = era.accent;
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 7; i++) ctx.fillRect(gx + 6, gy + i * T + 8, T - 12, 4);
      ctx.globalAlpha = 1;
    }
  }

  drawProps(ctx, cam, time) {
    const cx = cam.cx(), cy = cam.cy();
    for (const p of this.props) {
      const x = p.x - cx, y = p.y - cy;
      if (x < -140 || x > AR.C.VIEW_W + 140) continue;
      this._drawProp(ctx, p, x, y, time);
    }
  }

  _drawProp(ctx, p, x, y, time) {
    const a = this.era.accent, rock = this.era.rock, s = p.s || 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    switch (p.type) {
      case 'bones':
        ctx.strokeStyle = '#cfc5a8'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14, -4); ctx.quadraticCurveTo(0, -26, 16, -8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-8, -14); ctx.stroke();
        break;
      case 'rock':
        ctx.fillStyle = rock;
        ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-8, -16); ctx.lineTo(8, -12); ctx.lineTo(16, 0);
        ctx.closePath(); ctx.fill();
        break;
      case 'totem':
        ctx.fillStyle = rock; ctx.fillRect(-6, -52, 12, 52);
        ctx.fillStyle = a; ctx.fillRect(-10, -48, 20, 8); ctx.fillRect(-10, -30, 20, 6);
        break;
      case 'fire': {
        ctx.fillStyle = rock; ctx.fillRect(-10, -6, 20, 6);
        const f = Math.sin(time * 9 + p.r * 20) * 3;
        ctx.fillStyle = '#ff9a3d';
        ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(0, -30 - f, 7, -6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe28a';
        ctx.beginPath(); ctx.moveTo(-3, -6); ctx.quadraticCurveTo(0, -18 - f, 3, -6); ctx.closePath(); ctx.fill();
        break;
      }
      case 'column':
        ctx.fillStyle = '#d8ccae';
        ctx.fillRect(-8, -70, 16, 70);
        ctx.fillRect(-12, -74, 24, 6); ctx.fillRect(-12, -4, 24, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-2, -70, 4, 70);
        break;
      case 'banner':
        ctx.fillStyle = rock; ctx.fillRect(-2, -78, 4, 78);
        ctx.fillStyle = '#a83232';
        ctx.beginPath(); ctx.moveTo(2, -76); ctx.lineTo(30, -70); ctx.lineTo(2, -56); ctx.closePath(); ctx.fill();
        break;
      case 'amphora':
        ctx.fillStyle = '#b0703c';
        ctx.beginPath(); ctx.ellipse(0, -14, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(-5, -34, 10, 8);
        break;
      case 'laurel':
        ctx.fillStyle = '#7fa060';
        ctx.beginPath(); ctx.ellipse(0, -30, 14, 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rock; ctx.fillRect(-3, -12, 6, 12);
        break;
      case 'torii':
        ctx.fillStyle = '#c23b3b';
        ctx.fillRect(-30, -80, 8, 80); ctx.fillRect(22, -80, 8, 80);
        ctx.fillRect(-40, -84, 80, 8); ctx.fillRect(-34, -68, 68, 6);
        break;
      case 'lantern': {
        ctx.fillStyle = rock; ctx.fillRect(-3, -46, 6, 46);
        const glow = 0.6 + Math.sin(time * 3 + p.r * 9) * 0.2;
        ctx.globalAlpha = glow;
        ctx.fillStyle = '#ffce7a';
        ctx.fillRect(-9, -60, 18, 16);
        ctx.globalAlpha = 1;
        ctx.fillStyle = rock; ctx.fillRect(-11, -63, 22, 4);
        break;
      }
      case 'sakura':
        ctx.fillStyle = '#4a3550'; ctx.fillRect(-4, -54, 8, 54);
        ctx.fillStyle = '#e08bb0';
        ctx.beginPath(); ctx.arc(-12, -58, 16, 0, Math.PI * 2); ctx.arc(10, -64, 18, 0, Math.PI * 2);
        ctx.arc(0, -48, 14, 0, Math.PI * 2); ctx.fill();
        break;
      case 'shrine':
        ctx.fillStyle = rock; ctx.fillRect(-14, -30, 28, 30);
        ctx.fillStyle = '#c23b3b';
        ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(0, -44); ctx.lineTo(20, -30); ctx.closePath(); ctx.fill();
        break;
      case 'crate':
        ctx.fillStyle = '#8a6a42'; ctx.fillRect(-14, -28, 28, 28);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
        ctx.strokeRect(-14, -28, 28, 28);
        ctx.beginPath(); ctx.moveTo(-14, -28); ctx.lineTo(14, 0); ctx.stroke();
        break;
      case 'cannon':
        ctx.fillStyle = '#3a3a3a';
        ctx.save(); ctx.rotate(-0.3); ctx.fillRect(-6, -30, 12, 30); ctx.restore();
        ctx.fillStyle = '#6a5238';
        ctx.beginPath(); ctx.arc(0, -8, 10, 0, Math.PI * 2); ctx.fill();
        break;
      case 'tent':
        ctx.fillStyle = '#9a8560';
        ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(0, -38); ctx.lineTo(26, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -14); ctx.lineTo(8, 0); ctx.closePath(); ctx.fill();
        break;
      case 'flag':
        ctx.fillStyle = rock; ctx.fillRect(-2, -66, 4, 66);
        ctx.fillStyle = '#3f6d9e';
        ctx.fillRect(2, -64, 26, 16);
        break;
      case 'sandbag':
        ctx.fillStyle = '#7a7050';
        for (let i = 0; i < 3; i++)
          for (let j = 0; j <= i; j++)
            ctx.fillRect(-20 + j * 14 + (2 - i) * 7, -8 - (2 - i) * 9, 13, 8);
        break;
      case 'wire':
        ctx.strokeStyle = '#4a4a3a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-14, -22); ctx.moveTo(14, -22); ctx.lineTo(22, 0);
        ctx.moveTo(-16, -18); ctx.quadraticCurveTo(0, -26, 16, -18); ctx.stroke();
        for (let i = -12; i <= 12; i += 6) { ctx.beginPath(); ctx.moveTo(i, -24); ctx.lineTo(i + 3, -19); ctx.stroke(); }
        break;
      case 'wreck':
        ctx.fillStyle = '#3d4034';
        ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-20, -20); ctx.lineTo(12, -24); ctx.lineTo(26, -6); ctx.lineTo(26, 0);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-8, -18, 14, 8);
        break;
      case 'crater':
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0, 0, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
        break;
      case 'holo': {
        const fl = Math.sin(time * 7 + p.r * 30) > -0.7 ? 1 : 0.3;
        ctx.globalAlpha = 0.75 * fl;
        ctx.fillStyle = p.r < 0.5 ? '#e35cff' : '#42e8f5';
        ctx.fillRect(-16, -74, 32, 44);
        ctx.globalAlpha = 0.9 * fl;
        ctx.fillStyle = '#0d0618';
        ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
        ctx.fillText(p.r < 0.33 ? '光' : p.r < 0.66 ? '侍' : '刃', 0, -44);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#251740'; ctx.fillRect(-3, -30, 6, 30);
        break;
      }
      case 'pylon':
        ctx.fillStyle = '#251740'; ctx.fillRect(-5, -64, 10, 64);
        ctx.fillStyle = '#42e8f5';
        ctx.globalAlpha = 0.6 + Math.sin(time * 5 + p.r * 9) * 0.3;
        ctx.fillRect(-7, -70, 14, 6);
        ctx.globalAlpha = 1;
        break;
      case 'screen':
        ctx.fillStyle = '#1c0f33'; ctx.fillRect(-20, -46, 40, 28);
        ctx.fillStyle = '#e35cff'; ctx.globalAlpha = 0.5;
        for (let i = 0; i < 4; i++) ctx.fillRect(-16, -42 + i * 6, 14 + Math.sin(time * 2 + i + p.r * 8) * 10, 3);
        ctx.globalAlpha = 1;
        break;
      case 'vent':
        ctx.fillStyle = '#251740'; ctx.fillRect(-12, -14, 24, 14);
        ctx.fillStyle = '#42e8f5'; ctx.globalAlpha = 0.4;
        ctx.fillRect(-8, -10, 16, 2); ctx.fillRect(-8, -6, 16, 2);
        ctx.globalAlpha = 1;
        break;
      case 'stall': {
        // échoppe du marchand
        ctx.fillStyle = '#6a5238';
        ctx.fillRect(-46, -66, 8, 66); ctx.fillRect(38, -66, 8, 66);
        ctx.fillStyle = '#8a2f3d';
        ctx.beginPath(); ctx.moveTo(-56, -62); ctx.quadraticCurveTo(0, -86, 56, -62);
        ctx.lineTo(48, -50); ctx.quadraticCurveTo(0, -72, -48, -50); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c9a86a'; ctx.fillRect(-42, -30, 84, 8);
        ctx.fillStyle = '#6a5238'; ctx.fillRect(-42, -22, 84, 22);
        break;
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------ météo ambiante
  _newAmbient(anywhere) {
    const C = AR.C;
    return {
      x: Math.random() * (C.VIEW_W + 200) - 100,
      y: anywhere ? Math.random() * C.VIEW_H : -20,
      v: 0.4 + Math.random() * 0.8, r: Math.random(),
    };
  }

  updateAmbient(dt, time) {
    const w = this.era.weather;
    for (const a of this.ambient) {
      if (w === 'embers' || w === 'neon') { a.y -= (26 + a.v * 40) * dt; a.x += Math.sin(time * 2 + a.r * 9) * 22 * dt; }
      else if (w === 'petals') { a.y += (30 + a.v * 40) * dt; a.x += Math.sin(time * 1.6 + a.r * 9) * 50 * dt - 16 * dt; }
      else if (w === 'rain') { a.y += (520 + a.v * 200) * dt; a.x -= 130 * dt; }
      else { a.y += (12 + a.v * 18) * dt; a.x += (14 + Math.sin(time + a.r * 7) * 18) * dt; }
      if (a.y > AR.C.VIEW_H + 20) { a.y = -12; a.x = Math.random() * (AR.C.VIEW_W + 200) - 100; }
      if (a.y < -24) { a.y = AR.C.VIEW_H + 10; a.x = Math.random() * (AR.C.VIEW_W + 200) - 100; }
      if (a.x > AR.C.VIEW_W + 110) a.x = -100;
      if (a.x < -110) a.x = AR.C.VIEW_W + 100;
    }
  }

  drawAmbient(ctx) {
    const w = this.era.weather;
    ctx.save();
    for (const a of this.ambient) {
      if (w === 'embers') {
        ctx.globalAlpha = 0.5 + a.r * 0.4;
        ctx.fillStyle = a.r < 0.6 ? '#ffb35c' : '#ffe28a';
        ctx.fillRect(a.x, a.y, 2.5, 2.5);
      } else if (w === 'petals') {
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = '#e8a0c0';
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.r * 6 + a.y * 0.01);
        ctx.fillRect(-3, -1.5, 6, 3); ctx.restore();
      } else if (w === 'rain') {
        ctx.globalAlpha = 0.32;
        ctx.strokeStyle = '#b8c8c0'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + 3, a.y + 14); ctx.stroke();
      } else if (w === 'neon') {
        ctx.globalAlpha = 0.5 + a.r * 0.4;
        ctx.fillStyle = a.r < 0.5 ? '#e35cff' : '#42e8f5';
        ctx.fillRect(a.x, a.y, 2, 5);
      } else { // dust
        ctx.globalAlpha = 0.20 + a.r * 0.2;
        ctx.fillStyle = '#e8dcc0';
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
};
