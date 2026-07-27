// Arcane Rift - niveaux : terrain (procédural OU authored), collisions multi-étage,
// grille de collision, rooms, traversal, parallaxe, décor, météo
window.AR = window.AR || {};

// Drapeaux de la grille de collision (cartes authored). Voir 00_pre_requis §5.2.
AR.TILE_FLAGS = {
  EMPTY: 0,
  SOLID: 1 << 0,
  ONE_WAY: 1 << 1,
  HAZARD: 1 << 2,
  CLIMBABLE: 1 << 3,
  DOOR: 1 << 4,
  BREAKABLE: 1 << 5,
  NO_ENEMY: 1 << 6,
  NO_RESPAWN: 1 << 7,
};

AR.Level = class {
  constructor(eraIdx, seed) {
    const C = AR.C, T = C.TILE;
    this.eraIdx = eraIdx;
    this.era = AR.ERAS[eraIdx];
    this.seed = seed;
    this.rng = AR.rng(seed);
    this.PIT = 9999;
    this.worldH = C.WORLD_H;
    // ----- contrats communs, remplis par l'un des deux constructeurs de carte
    this.platforms = []; this.props = []; this.spawns = []; this.chestSpots = [];
    this.localPortals = []; // remontées locales (poches secrètes), distinctes du portail de fin de boss
    this.darkZones = []; // poches sombres (grottes profondes) : overlay + trouées de lumière aux torches
    this.gateClosed = false; this.grid = null;
    this.rooms = []; this.roomById = {};
    this.climbables = []; this.breakables = []; this.interactables = [];
    this.encounters = []; this.triggers = []; this.hazards = [];
    this.safeAnchors = []; this.navHints = {}; this.dynGates = [];
    this.fallDamageRatio = 0.1;

    const spec = (AR.LEVEL_SPECS && AR.LEVEL_SPECS[this.era.id]) || null;
    if (spec) this._buildFromSpec(spec);
    else this._buildProcedural(seed);

    // ----- couches de parallaxe + texture de sol + météo (commun aux deux)
    this._buildLayers();
    this._buildGroundPattern();
    this.ambient = [];
    for (let i = 0; i < 70; i++) this.ambient.push(this._newAmbient(true));
  }

  // ============================================ GÉNÉRATION PROCÉDURALE (legacy)
  _buildProcedural(seed) {
    const C = AR.C, T = C.TILE;
    const rng = this.rng;
    const eraIdx = this.eraIdx;
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
          const platform = this._fitPlatform({ tx: tx - gap, ty: gy - 1 - Math.floor(rng() * 2), w: gap, kind: 'bridge' });
          if (platform) this.platforms.push(platform);
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
          const platform = this._fitPlatform({ tx: tx - pw - 1, ty: py, w: pw, kind: 'floating' }, 3);
          if (platform) {
            this.platforms.push(platform);
            if (rng() < 0.35) this.chestSpots.push({ x: (platform.tx + pw / 2) * T, y: platform.ty * T });
          }
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
      let previousSupportTy = this.heights[base];
      for (let f = 0; f <= floors; f++) {
        if (py < 6) break;
        const pw = 2 + Math.floor(rng() * 2);
        const ptx = AR.U.clamp(px - Math.floor(pw / 2), 3, len - 4);
        const platform = this._fitPlatform({ tx: ptx, ty: py, w: pw, kind: 'tower', tower: ti, floor: f });
        if (!platform) break;
        // Si le terrain local oblige à remonter ce relais de plus de trois
        // tuiles, la chaîne n'est plus atteignable : arrêter la tour ici.
        if (platform.ty < previousSupportTy - 3) break;
        platform.supportTy = previousSupportTy;
        py = platform.ty;
        previousSupportTy = platform.ty;
        this.platforms.push(platform);
        if (f === floors) {
          this.chestSpots.push({ x: (ptx + pw / 2) * T, y: platform.ty * T, high: true });
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
      if (!this._platformIsExposed(p)) continue;
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
  }

  // ============================================== CARTE AUTHORED (level_specs)
  // Conventions : toutes les coordonnées de spec sont en TUILES.
  //   solids/empties/hazards/gates/rect : {x,y,w,h}   (empties = grottes/tunnels creusés)
  //   oneWay      : {x,y,w,id?,kind?}
  //   climbables  : {id,x,y,w,h, exitY?}
  //   breakables  : {id,type:'wall'|'bridge', rect:{x,y,w,h}, hp?, land?}
  //   interactables:{id,type:'lever'|'door', x,y, rect?, links:[], prompt?, state?}
  //   rooms       : {id, rect, tags:[], camera:{minX,maxX,minY,maxY}, safeRespawn:[{x,y,priority?}]}
  //   spawns      : {tx,ty,id, elite?, suspended?, activate?, onPlatform?}   (ty = tuile du pied)
  //   chests      : {x,y, high?}      merchant : {x,y}      props : {type,tx,ty, ox?, s?, r?}
  //   encounters  : {id, roomId, trigger:{x,y,w,h}, gates:[{x,y,w,h}], waves:[{budget,pool}]|fixed:[id..], reward?}
  //   triggers    : {id, rect:{x,y,w,h}, action, ...}      navHints : objet libre (mode démo)
  _buildFromSpec(spec) {
    const C = AR.C, T = C.TILE, F = AR.TILE_FLAGS;
    this.authored = true;
    this.spec = spec;
    this.tilesW = spec.tilesW;
    this.worldH = spec.worldH || C.WORLD_H;
    this.fallDamageRatio = spec.fallDamageRatio || 0.1;
    this.startRoom = spec.startRoom || null;
    this.grid = new Uint8Array(this.tilesW * this.worldH);

    // --- terrain solide : additif (solids) puis soustractif (empties = grottes/tunnels)
    for (const r of spec.solids || []) this._fillRect(r, F.SOLID);
    for (const r of spec.empties || []) this._clearRect(r, F.SOLID | F.BREAKABLE | F.DOOR);
    for (const r of spec.hazards || []) { this._fillRect(r, F.HAZARD); this.hazards.push(this._rectPx(r)); }

    // --- plateformes traversables (one-way) conservées dans this.platforms (compat)
    for (const p of spec.oneWay || []) {
      this.platforms.push({ tx: p.x, ty: p.y, w: p.w, kind: p.kind || 'ledge', id: p.id });
    }

    // --- lianes / échelles
    for (const c of spec.climbables || []) {
      this.climbables.push({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h, exitY: c.exitY });
      this._fillRect({ x: c.x, y: c.y, w: c.w, h: c.h }, F.CLIMBABLE);
    }

    // --- destructibles : murs (SOLID+BREAKABLE) et ponts fragiles (one-way + effondrement)
    for (const b of spec.breakables || []) {
      const obj = { id: b.id, type: b.type, rect: b.rect, hp: b.hp || 45, maxHp: b.hp || 45,
        broken: false, triggered: false, collapseT: 0, land: b.land };
      this.breakables.push(obj);
      if (b.type === 'bridge') {
        this.platforms.push({ tx: b.rect.x, ty: b.rect.y, w: b.rect.w, kind: 'bone_bridge', breakId: b.id });
      } else {
        this._fillRect(b.rect, F.SOLID | F.BREAKABLE);
      }
    }

    // --- interactables (leviers, portes) ; portes fermées = solides
    for (const o of spec.interactables || []) {
      const obj = { id: o.id, type: o.type, x: o.x, y: o.y, rect: o.rect, links: o.links || [],
        prompt: o.prompt, state: o.state || (o.type === 'door' ? 'closed' : 'off'), oneShot: o.oneShot !== false };
      this.interactables.push(obj);
      if (o.type === 'door' && obj.state === 'closed' && o.rect) this._fillRect(o.rect, F.SOLID | F.DOOR);
    }

    // --- rooms + ancres de respawn
    for (const r of spec.rooms || []) {
      const room = { id: r.id, rect: r.rect, tags: r.tags || [], camera: r.camera || null, safeRespawn: r.safeRespawn || [] };
      this.rooms.push(room); this.roomById[r.id] = room;
      for (const s of room.safeRespawn) this.safeAnchors.push({ x: s.x, y: s.y, roomId: r.id, priority: s.priority || 5 });
    }

    // --- encounters + triggers
    for (const e of spec.encounters || []) {
      this.encounters.push({ id: e.id, roomId: e.roomId, trigger: e.trigger, gates: e.gates || [],
        waves: e.waves || null, fixed: e.fixed || null, reward: e.reward || null, state: 'idle', waveIdx: 0 });
    }
    for (const t of spec.triggers || []) this.triggers.push({ ...t, fired: false });
    this.navHints = spec.navHints || {};

    // --- surface primaire dérivée (compat groundYpx / ambiance / respawn legacy)
    this._deriveHeights();

    // --- props authored + props auto des éléments de traversal
    for (const p of spec.props || []) {
      this.props.push({ type: p.type, x: (p.tx + (p.ox || 0)) * T, y: p.ty * T, s: p.s || 1,
        r: p.r !== undefined ? p.r : this.rng() });
    }
    for (const c of this.climbables) this.props.push({ type: 'vine', x: (c.x + c.w / 2) * T, y: c.y * T, vh: c.h, s: 1, r: 0 });
    for (const o of this.interactables) if (o.type === 'lever') this.props.push({ type: 'lever', ref: o, x: o.x * T, y: o.y * T, s: 1, r: 0 });

    // --- spawns (ennemis libres + suspendus/dormants)
    this.spawns = [];
    for (const s of spec.spawns || []) {
      this.spawns.push({ x: s.tx * T + T / 2, y: s.ty * T, id: s.id, elite: !!s.elite,
        suspended: !!s.suspended, dormant: !!s.suspended || !!s.dormant, activate: s.activate || null, onPlatform: !!s.onPlatform });
    }

    // --- coffres, marchand
    for (const c of spec.chests || []) {
      this.chestSpots.push({ x: (c.x + 0.5) * T, y: c.y * T, high: !!c.high, guaranteed: c.guaranteed || null });
    }
    this.merchantX = spec.merchant ? spec.merchant.x * T : 0;

    // --- mini-portails locaux (poches secrètes)
    for (const p of spec.localPortals || []) {
      this.localPortals.push({ x: (p.x + 0.5) * T, y: p.y * T,
        returnTo: { x: p.returnTo.x * T, y: p.returnTo.y * T } });
    }

    // --- poches sombres (grottes profondes) : rects en tuiles -> pixels
    for (const z of spec.darkZones || []) {
      this.darkZones.push({ x: z.x * T, y: z.y * T, w: z.w * T, h: z.h * T });
    }

    // --- arène de boss (réutilise le pipeline image existant)
    this.spawnX = (spec.spawnX !== undefined ? spec.spawnX : 3) * T;
    this.arenaStartTx = spec.arenaStartTx;
    this.gateTx = spec.gateTx !== undefined ? spec.gateTx : this.arenaStartTx + 1;
    this.arenaGy = spec.arenaGy || 23;
    this._buildBossArena();
    if (!this.bossArena) {
      this.bossX = (this.arenaStartTx + 20) * T;
      this.portalX = (this.arenaStartTx + 16) * T;
    }
  }

  // ---- grille : primitives
  _fillRect(r, flag) {
    const W = this.tilesW, H = this.worldH;
    const x0 = Math.max(0, r.x | 0), x1 = Math.min(W, (r.x + r.w) | 0);
    const y0 = Math.max(0, r.y | 0), y1 = Math.min(H, (r.y + r.h) | 0);
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) this.grid[ty * W + tx] |= flag;
  }
  _clearRect(r, flag) {
    const W = this.tilesW, H = this.worldH;
    const x0 = Math.max(0, r.x | 0), x1 = Math.min(W, (r.x + r.w) | 0);
    const y0 = Math.max(0, r.y | 0), y1 = Math.min(H, (r.y + r.h) | 0);
    for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) this.grid[ty * W + tx] &= ~flag;
  }
  _rectPx(r) { const T = AR.C.TILE; return { x: r.x * T, y: r.y * T, w: r.w * T, h: r.h * T }; }
  _flagAt(tx, ty) {
    if (tx < 0 || tx >= this.tilesW || ty < 0 || ty >= this.worldH) return 0;
    return this.grid[ty * this.tilesW + tx];
  }
  _deriveHeights() {
    this.heights = new Array(this.tilesW).fill(this.PIT);
    const F = AR.TILE_FLAGS, W = this.tilesW;
    for (let tx = 0; tx < W; tx++) {
      for (let ty = 0; ty < this.worldH; ty++) {
        if (this.grid[ty * W + tx] & F.SOLID) { this.heights[tx] = ty; break; }
      }
    }
  }

  // Sol le plus proche SOUS (x, fromY) : consulte la grille + les plateformes one-way.
  // Sert au multi-étage (grottes) là où groundYpx (surface primaire) serait ambigu.
  surfaceYAt(x, fromY, opts) {
    opts = opts || {};
    const T = AR.C.TILE;
    const tx = Math.floor(x / T);
    const startTy = Math.max(0, Math.floor((fromY !== undefined ? fromY : 0) / T));
    const maxDist = opts.maxDistance !== undefined ? opts.maxDistance : this.worldH * T;
    let solidY = Infinity;
    for (let ty = startTy; ty <= this.worldH; ty++) {
      if (ty * T - (fromY || 0) > maxDist) break;
      if (this.solidAt(tx, ty)) { solidY = ty * T; break; }
    }
    let owY = Infinity;
    if (opts.includeOneWay !== false) {
      for (const p of this.platforms) {
        if (p.broken) continue;
        if (x >= p.tx * T && x <= (p.tx + p.w) * T) {
          const py = p.ty * T;
          if (py >= (fromY || 0) - 2 && py < owY) owY = py;
        }
      }
    }
    const best = Math.min(solidY, owY);
    return best === Infinity ? this.worldH * T * 2 : best;
  }

  // Sol adapté à l'entité : grille (multi-étage) si carte authored, sinon groundYpx legacy.
  // L'arène de boss active garde son sol image (via groundYpx qui le gère en priorité).
  groundYAtEntity(x, fromY) {
    const arena = this.bossArena;
    if ((arena && arena.active) || !this.grid) return this.groundYpx(x);
    return this.surfaceYAt(x, fromY, { includeOneWay: true });
  }

  // ---- lianes / échelles : renvoie l'objet climbable (pour recentrage) ou null
  climbableAt(x, y) {
    if (!this.grid) return null;
    const T = AR.C.TILE, tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (!(this._flagAt(tx, ty) & AR.TILE_FLAGS.CLIMBABLE)) return null;
    for (const c of this.climbables) {
      if (tx >= c.x && tx < c.x + c.w && ty >= c.y && ty < c.y + c.h) return c;
    }
    return true;
  }

  // ---- rooms
  currentRoomAt(x, y) {
    const T = AR.C.TILE, txp = x / T, typ = y / T;
    for (const r of this.rooms) {
      const R = r.rect;
      if (txp >= R.x && txp <= R.x + R.w && typ >= R.y && typ <= R.y + R.h) return r;
    }
    return null;
  }
  roomHasTag(x, y, tag) {
    const r = this.currentRoomAt(x, y);
    return !!(r && r.tags.indexOf(tag) >= 0);
  }

  // ---- destructibles
  breakableAt(tx, ty) {
    for (const b of this.breakables) {
      if (b.broken || b.type === 'bridge') continue;
      const R = b.rect;
      if (tx >= R.x && tx < R.x + R.w && ty >= R.y && ty < R.y + R.h) return b;
    }
    return null;
  }
  hitBreakable(b, dmg, game) {
    if (!b || b.broken) return false;
    b.hp -= dmg;
    if (game) {
      const T = AR.C.TILE;
      AR.Particles.burst((b.rect.x + b.rect.w / 2) * T, (b.rect.y + b.rect.h / 2) * T, 6,
        { color: ['#7a6a52', '#a89a80'], speed: 120, size: 3, life: 0.4 });
      AR.Audio.sfx('hit');
    }
    if (b.hp <= 0) this.breakOpen(b, game);
    return true;
  }
  breakOpen(b, game) {
    b.broken = true;
    if (b.type !== 'bridge') this._clearRect(b.rect, AR.TILE_FLAGS.SOLID | AR.TILE_FLAGS.BREAKABLE);
    else { const p = this.platforms.find((pp) => pp.breakId === b.id); if (p) p.broken = true; }
    this._deriveHeights();
    if (game) {
      const T = AR.C.TILE;
      AR.Particles.burst((b.rect.x + b.rect.w / 2) * T, (b.rect.y + b.rect.h / 2) * T, 18,
        { color: ['#7a6a52', '#a89a80', '#57503a'], speed: 220, size: 4, life: 0.6 });
      AR.Audio.sfx('boom'); game.camera.shake(4, 0.3);
    }
  }

  // ponts fragiles : déclenchés au passage, s'effondrent après un délai
  updateDynamics(dt, game) {
    const T = AR.C.TILE, pl = game.player;
    for (const b of this.breakables) {
      if (b.type !== 'bridge' || b.broken) continue;
      const p = this.platforms.find((pp) => pp.breakId === b.id);
      if (!p) continue;
      if (!b.triggered && pl.onGround &&
          pl.x + pl.w > p.tx * T && pl.x < (p.tx + p.w) * T &&
          Math.abs((pl.y + pl.h) - p.ty * T) < 6) {
        b.triggered = true;
        AR.Particles.burst(pl.x + pl.w / 2, p.ty * T, 8, { color: '#cfc5a8', speed: 90, size: 3, life: 0.5 });
      }
      if (b.triggered) {
        b.collapseT += dt;
        if (b.collapseT >= (b.collapseTime || 1.6)) this.breakOpen(b, game);
      }
    }
  }

  // ---- interactables (leviers → portes/raccourcis)
  activateInteractable(o, game) {
    if (!o || (o.oneShot && o.state === 'on')) return false;
    o.state = o.state === 'on' ? 'off' : 'on';
    for (const linkId of o.links) {
      const door = this.interactables.find((d) => d.id === linkId);
      if (door && door.type === 'door' && door.rect) {
        door.state = door.state === 'open' ? 'closed' : 'open';
        if (door.state === 'open') this._clearRect(door.rect, AR.TILE_FLAGS.SOLID | AR.TILE_FLAGS.DOOR);
        else this._fillRect(door.rect, AR.TILE_FLAGS.SOLID | AR.TILE_FLAGS.DOOR);
      }
    }
    this._deriveHeights();
    if (game) { AR.Audio.sfx('gate'); AR.HUD.notify('Levier actionné — un passage s\'ouvre', AR.C.COLORS.spirit); }
    return true;
  }

  // ---- barrières d'encounter (solides temporaires posées dans la grille)
  setGateSolid(rect, closed) {
    if (closed) this._fillRect(rect, AR.TILE_FLAGS.SOLID);
    else this._clearRect(rect, AR.TILE_FLAGS.SOLID);
    this._deriveHeights();
  }

  // Remonte une plateforme au-dessus du terrain le plus haut qu'elle recouvre.
  // Les colonnes sont générées progressivement : sans cette normalisation, une
  // hauteur encore vierge peut placer la plateforme à l'intérieur du sol voisin.
  _fitPlatform(platform, maxRiseFromGround) {
    const tx0 = Math.max(0, Math.floor(platform.tx));
    const tx1 = Math.min(this.tilesW - 1, Math.ceil(platform.tx + platform.w) - 1);
    let highestGround = Infinity;
    for (let tx = tx0; tx <= tx1; tx++) {
      const h = this.heights[tx];
      if (h !== this.PIT) highestGround = Math.min(highestGround, h);
    }
    if (highestGround !== Infinity) {
      platform.ty = Math.min(platform.ty, highestGround - 1);
      if (maxRiseFromGround) platform.ty = Math.max(platform.ty, highestGround - maxRiseFromGround);
    }
    return platform.ty >= 4 ? platform : null;
  }

  _platformIsExposed(platform) {
    const tx0 = Math.max(0, Math.floor(platform.tx));
    const tx1 = Math.min(this.tilesW - 1, Math.ceil(platform.tx + platform.w) - 1);
    for (let tx = tx0; tx <= tx1; tx++) {
      const h = this.heights[tx];
      if (h !== this.PIT && platform.ty >= h) return false;
    }
    return true;
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
    if (this.grid) {
      if (ty < 0 || ty >= this.worldH) return false; // sous la carte : vide (chute)
      return (this.grid[ty * this.tilesW + tx] & AR.TILE_FLAGS.SOLID) !== 0;
    }
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

  // Cherche un segment de terrain assez long à gauche du dernier point connu
  // et replace le héros cinq tuiles avant son bord droit. Cela laisse le temps
  // de reprendre le contrôle ou de relancer un saut avant le précipice.
  findSafeRespawn(anchorX, entityW, entityH) {
    const T = AR.C.TILE, runway = 5;
    const arena = this.bossArena;
    if (arena && arena.active) {
      const x = AR.U.clamp(anchorX, arena.ground.x + T, arena.ground.x + arena.ground.w - entityW - T);
      return { x, y: arena.ground.y - entityH - 2 };
    }

    // Cartes authored : ancres de respawn déclarées (préférer celle déjà franchie, la plus proche).
    if (this.grid && this.safeAnchors.length) {
      let best = null, bestScore = Infinity;
      for (const s of this.safeAnchors) {
        const sx = (s.x + 0.5) * T;
        const behind = sx <= anchorX + T * 2;
        const score = Math.abs(sx - anchorX) + (behind ? 0 : 1e6) - s.priority;
        if (score < bestScore) { bestScore = score; best = s; }
      }
      if (best) return { x: (best.x + 0.5) * T - entityW / 2, y: best.y * T - entityH - 2 };
    }

    let cursor = AR.U.clamp(Math.floor((anchorX + entityW / 2) / T), 0, this.tilesW - 1);
    while (cursor >= 0) {
      while (cursor >= 0 && this.heights[cursor] === this.PIT) cursor--;
      if (cursor < 0) break;

      let start = cursor, end = cursor;
      while (start > 0 && this.heights[start - 1] !== this.PIT) start--;
      while (end + 1 < this.tilesW && this.heights[end + 1] !== this.PIT) end++;

      if (end - start + 1 >= runway + 2) {
        const tx = Math.max(start + 1, end - runway);
        return {
          x: (tx + 0.5) * T - entityW / 2,
          y: this.heights[tx] * T - entityH - 2,
        };
      }
      cursor = start - 1;
    }

    const fallbackTx = AR.U.clamp(Math.floor(this.spawnX / T), 0, this.tilesW - 1);
    return {
      x: (fallbackTx + 0.5) * T - entityW / 2,
      y: this.heights[fallbackTx] * T - entityH - 2,
    };
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
            if (p.broken) continue;
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
    ctx.fillStyle = this.era.sky[0];
    ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
    if (img && img.complete && img.naturalWidth) {
      // Le fond appartient au monde : il suit exactement le tremblement de
      // caméra, comme les surfaces de collision et les combattants.
      ctx.drawImage(img, arena.x - cam.cx(), arena.y - cam.cy(), arena.width, arena.height);
    }
    if (arena) this._drawArenaLedges(ctx, cam, arena);
    if (arena && AR.C.DEBUG_ARENA_PLATFORMS) this._drawArenaDebug(ctx, cam, arena);
  }

  // Surligne discrètement le bord praticable de chaque plateforme par-dessus
  // le fond illustré de l'arène (retour joueur : sur une simple image de fond,
  // difficile de deviner à l'œil où on peut effectivement sauter/atterrir).
  // Contrairement à `_drawArenaDebug` (boîtes pleines + libellés, outil de
  // calibrage), ici juste un bord lumineux fin + un léger dégradé, pour rester
  // lisible sans dénaturer l'illustration. Le sol principal n'est pas
  // surligné : il est déjà visuellement évident sur chaque fond d'arène.
  _drawArenaLedges(ctx, cam, arena) {
    const cx = cam.cx(), cy = cam.cy(), accent = this.era.accent;
    ctx.save();
    for (const p of arena.platforms) {
      if (p.ground) continue;
      const x = p.x - cx, y = p.y - cy;
      if (x > AR.C.VIEW_W + 40 || x + p.w < -40) continue;
      const glow = ctx.createLinearGradient(0, y, 0, y + 22);
      glow.addColorStop(0, accent);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = glow;
      ctx.fillRect(x, y, p.w, 22);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = accent;
      ctx.fillRect(x, y, p.w, 3);
    }
    ctx.restore();
  }

  // Surligne les plateformes de collision (invisibles en jeu normal) par-dessus
  // le fond illustré, pour caler leur position sur l'image de l'arène.
  _drawArenaDebug(ctx, cam, arena) {
    const cx = cam.cx(), cy = cam.cy();
    ctx.save();
    for (const p of arena.platforms) {
      const x = p.x - cx, y = p.y - cy;
      ctx.fillStyle = p.ground ? 'rgba(60,255,140,0.4)' : 'rgba(255,60,220,0.5)';
      ctx.fillRect(x, y, p.w, p.h);
      ctx.strokeStyle = p.ground ? '#3cff8c' : '#ff3cdc';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, p.w, p.h);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.strokeText(p.id, x + 4, y - 4);
      ctx.fillText(p.id, x + 4, y - 4);
    }
    ctx.restore();
  }

  _tileLayer(ctx, layer, cam, factor, yTop) {
    const off = (cam.cx() * factor) % layer.width;
    const y = yTop - cam.cy() * factor * 0.4;
    ctx.drawImage(layer, -off, y);
    ctx.drawImage(layer, -off + layer.width, y);
    if (off < 0) ctx.drawImage(layer, -off - layer.width, y);
  }

  drawTerrain(ctx, cam) {
    if (this.grid) { this._drawTerrainGrid(ctx, cam); return; }
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
    this._drawPlatforms(ctx, cam);
    this._drawArenaGate(ctx, cam);
  }

  // Rendu tuile-à-tuile pour les cartes authored (gère grottes, plafonds, parois).
  _drawTerrainGrid(ctx, cam) {
    const T = AR.C.TILE, era = this.era, F = AR.TILE_FLAGS, W = this.tilesW;
    const cx = cam.cx(), cy = cam.cy();
    const tx0 = Math.max(0, Math.floor(cx / T) - 1);
    const tx1 = Math.min(W - 1, Math.ceil((cx + AR.C.VIEW_W) / T) + 1);
    const ty0 = Math.max(0, Math.floor(cy / T) - 1);
    const ty1 = Math.min(this.worldH - 1, Math.ceil((cy + AR.C.VIEW_H) / T) + 1);
    const pat = ctx.createPattern(this.groundPattern, 'repeat');
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const f = this.grid[ty * W + tx];
        if (!(f & F.SOLID)) continue;
        const x = tx * T - cx, y = ty * T - cy;
        ctx.fillStyle = pat;
        ctx.save(); ctx.translate(-cx % 96, -cy % 96);
        ctx.fillRect(x + cx % 96, y + cy % 96, T + 1, T + 1);
        ctx.restore();
        const above = this._flagAt(tx, ty - 1) & F.SOLID;
        const below = this._flagAt(tx, ty + 1) & F.SOLID;
        if (!above) { // surface : bande + liseré
          ctx.fillStyle = era.groundTop; ctx.fillRect(x, y, T + 1, 9);
          ctx.fillStyle = era.accent; ctx.globalAlpha = era.id === 'cyber' ? 0.95 : 0.55;
          ctx.fillRect(x, y, T + 1, 3); ctx.globalAlpha = 1;
        }
        if (!(this._flagAt(tx - 1, ty) & F.SOLID)) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(x, y, 5, T + 1); }
        if (!(this._flagAt(tx + 1, ty) & F.SOLID)) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x + T - 5, y, 5, T + 1); }
        if (!below) { ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(x, y + T - 6, T + 1, 6); } // plafond de grotte
        if (f & F.BREAKABLE) this._drawBreakableTile(ctx, x, y, T, tx, ty);
      }
    }
    this._drawPlatforms(ctx, cam);
    this._drawArenaGate(ctx, cam);
  }

  // Mur friable : doit se lire comme de la roche fissurée qu'on peut détruire au
  // sabre, pas comme une palissade en bois condamnée. Teinte terreuse + fissures
  // irrégulières (pas un simple X) + éboulis au sol ; les fissures s'aggravent et
  // le tout pulse légèrement à mesure que les PV du mur baissent, pour guider l'œil.
  _drawBreakableTile(ctx, x, y, T, tx, ty) {
    const b = this.breakableAt(tx, ty);
    const dmgRatio = b ? 1 - AR.U.clamp(b.hp / b.maxHp, 0, 1) : 0;
    const seed = (tx * 928371 + ty * 12289) >>> 0;
    const jit = (n) => ((seed >> n) % 7) - 3;
    ctx.fillStyle = 'rgba(120,70,40,0.22)';
    ctx.fillRect(x, y, T + 1, T + 1);
    ctx.strokeStyle = 'rgba(255,210,140,' + (0.55 + dmgRatio * 0.4) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const cx0 = x + T / 2, cy0 = y + T / 2;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.moveTo(cx0, cy0);
      ctx.lineTo(cx0 + Math.cos(a) * (T * 0.42) + jit(i), cy0 + Math.sin(a) * (T * 0.42) + jit(i + 2));
    }
    ctx.stroke();
    // éboulis / poussière au pied du mur (accumule visuellement avec les dégâts)
    ctx.fillStyle = 'rgba(90,75,55,0.7)';
    const debris = 2 + Math.round(dmgRatio * 4);
    for (let i = 0; i < debris; i++) {
      ctx.fillRect(x + 4 + ((seed >> (i * 3)) % (T - 8)), y + T - 5 - (i % 2) * 3, 3, 3);
    }
  }

  _drawPlatforms(ctx, cam) {
    const T = AR.C.TILE, era = this.era, cx = cam.cx(), cy = cam.cy();
    for (const p of this.platforms) {
      if (p.broken) continue;
      const x = p.tx * T - cx, y = p.ty * T - cy;
      if (x > AR.C.VIEW_W + 60 || x + p.w * T < -60) continue;
      if (p.kind === 'bone_bridge') { // planches d'os claires
        ctx.fillStyle = '#cfc5a8'; ctx.fillRect(x, y, p.w * T, 10);
        ctx.fillStyle = 'rgba(80,60,40,0.5)';
        for (let i = 0; i <= p.w; i++) ctx.fillRect(x + i * T - 1, y, 2, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + 4, y + 10, p.w * T - 8, 4);
        continue;
      }
      ctx.fillStyle = era.groundTop;
      ctx.fillRect(x, y, p.w * T, 12);
      ctx.fillStyle = era.accent;
      ctx.globalAlpha = 0.6; ctx.fillRect(x, y, p.w * T, 3); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 4, y + 12, p.w * T - 8, 5);
    }
  }

  _drawArenaGate(ctx, cam) {
    if (!this.gateClosed) return;
    const T = AR.C.TILE, era = this.era, cx = cam.cx(), cy = cam.cy();
    const gx = this.gateTx * T - cx, gy = (this.arenaGy - 7) * T - cy;
    ctx.fillStyle = era.rock;
    ctx.fillRect(gx, gy, T, 7 * T);
    ctx.fillStyle = era.accent;
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 7; i++) ctx.fillRect(gx + 6, gy + i * T + 8, T - 12, 4);
    ctx.globalAlpha = 1;
  }

  drawProps(ctx, cam, time) {
    const cx = cam.cx(), cy = cam.cy();
    for (const p of this.props) {
      const x = p.x - cx, y = p.y - cy;
      if (x < -140 || x > AR.C.VIEW_W + 140) continue;
      this._drawProp(ctx, p, x, y, time);
    }
  }

  // Poches sombres (grottes profondes) : voile quasi-opaque sur la zone, troué de flaques
  // de lumière aux torches ('fire' props alentour) — donne l'ambiance "on ne voit que les
  // torches au mur" et cache le fond des puits profonds vus depuis le haut.
  drawDarkZones(ctx, cam) {
    if (!this.darkZones.length) return;
    const cx = cam.cx(), cy = cam.cy(), W = AR.C.VIEW_W, H = AR.C.VIEW_H;
    for (const z of this.darkZones) {
      const x = z.x - cx, y = z.y - cy;
      if (x > W || x + z.w < 0 || y > H || y + z.h < 0) continue;
      const rx = Math.max(0, x), ry = Math.max(0, y);
      const rw = Math.min(W, x + z.w) - rx, rh = Math.min(H, y + z.h) - ry;
      if (rw <= 0 || rh <= 0) continue;
      ctx.save();
      ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
      ctx.fillStyle = 'rgba(4,4,10,0.86)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.globalCompositeOperation = 'destination-out';
      for (const p of this.props) {
        if (p.type !== 'fire') continue;
        if (p.x < z.x - 60 || p.x > z.x + z.w + 60 || p.y < z.y - 60 || p.y > z.y + z.h + 60) continue;
        const px = p.x - cx, py = p.y - cy - 16, r = 150 * (p.s || 1);
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(0,0,0,0.95)');
        g.addColorStop(0.55, 'rgba(0,0,0,0.5)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
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
      case 'vine': {
        // liane grimpable qui pend depuis le haut de la corniche
        const T = AR.C.TILE, hpx = (p.vh || 5) * T;
        ctx.strokeStyle = '#5c7a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath();
        for (let yy = 0; yy <= hpx; yy += 12) {
          const wob = Math.sin(yy * 0.05 + time * 1.2 + p.r * 6) * 5;
          if (yy === 0) ctx.moveTo(wob, yy); else ctx.lineTo(wob, yy);
        }
        ctx.stroke();
        ctx.fillStyle = '#7fa050';
        for (let yy = 18; yy < hpx; yy += 34) {
          const wob = Math.sin(yy * 0.05 + time * 1.2 + p.r * 6) * 5;
          ctx.beginPath();
          ctx.ellipse(wob - 7, yy, 6, 3, -0.5, 0, Math.PI * 2);
          ctx.ellipse(wob + 7, yy + 8, 6, 3, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'lever': {
        const on = p.ref && p.ref.state === 'on';
        ctx.fillStyle = rock; ctx.fillRect(-6, -8, 12, 8);
        ctx.strokeStyle = on ? '#5cc9a8' : '#c9a86a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(on ? 13 : -13, -24); ctx.stroke();
        ctx.fillStyle = on ? '#5cc9a8' : '#e8a545';
        ctx.beginPath(); ctx.arc(on ? 13 : -13, -24, 5, 0, Math.PI * 2); ctx.fill();
        break;
      }
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
