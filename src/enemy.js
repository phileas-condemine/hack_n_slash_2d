// Arcane Rift - ennemis : 9 comportements + boss à phases et patterns
window.AR = window.AR || {};

AR.Enemy = class {
  constructor(id, x, footY, elite, eraScale) {
    const def = AR.ENEMIES[id];
    this.id = id; this.def = def;
    this.elite = !!elite;
    const sc = (elite ? 1.5 : 1) * (eraScale || 1);
    this.maxHp = Math.round(def.hp * sc);
    this.hp = this.maxHp;
    this.dmg = Math.round(def.dmg * (elite ? 1.3 : 1) * Math.sqrt(eraScale || 1));
    this.drawH = def.h * (elite ? 1.18 : 1);
    this.h = this.drawH * 0.82;
    const dw = AR.Assets.drawnW('enemies/' + id, this.drawH);
    this.w = AR.U.clamp(dw * 0.5, 26, this.drawH * 0.95);
    this.x = x - this.w / 2;
    this.y = footY - this.h;
    this.vx = 0; this.vy = 0; this.kvx = 0;
    this.facing = -1;
    this.state = 'idle';
    this.t = 0;               // timer d'état
    this.atkTimer = 1 + Math.random();
    this.blinkTimer = def.blinkCd || 0;
    this.burstN = 0; this.burstT = 0;
    this.flash = 0;
    this.hurtT = 0;           // affichage barre de vie
    this.dead = false; this.deadT = 0;
    this.active = false;
    this.onGround = false;
    this.homeX = x;
    this.bobPhase = Math.random() * 7;
    this.shieldHp = def.shielded ? def.shielded * (eraScale || 1) : 0;
    this.patrolDir = Math.random() < 0.5 ? -1 : 1;
    this.isBoss = false;
    this.onPlatform = false;
  }

  centerX() { return this.x + this.w / 2; }
  centerY() { return this.y + this.h / 2; }

  update(dt, game) {
    if (this.dead) { this.deadT += dt; return; }
    if (game.veilT > 0) dt *= 0.45;  // Voile temporel
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.atkTimer -= dt;
    this.blinkTimer -= dt;
    this.kvx *= Math.pow(0.02, dt);

    const pl = game.player;
    const d = AR.U.dist(this.centerX(), this.centerY(), pl.x + pl.w / 2, pl.y + pl.h / 2);
    const def = this.def;
    const flying = def.behavior === 'flyer' || def.float;

    // rafales en cours (tireurs à burst)
    if (this.burstN > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) { this._fire(game); this.burstN--; this.burstT = 0.13; }
    }

    switch (this.state) {
      case 'idle': {
        if (d < def.aggro && Math.abs(pl.y - this.y) < 380 && !pl.dead) { this.state = 'chase'; this.t = 0; break; }
        // petite patrouille autour du point d'origine
        if (!flying && !this.onPlatform) {
          if (Math.abs(this.x - this.homeX) > 70) this.patrolDir = AR.U.sign(this.homeX - this.x);
          this.vx = this.patrolDir * def.speed * 0.3;
          this.facing = AR.U.sign(this.vx || 1);
          if (!this._groundAhead(game.level)) { this.patrolDir *= -1; this.vx = 0; }
        } else this.vx = 0;
        break;
      }
      case 'chase': {
        if (pl.dead) { this.state = 'idle'; break; }
        this.facing = AR.U.sign(pl.x - this.x || 1);
        const b = def.behavior;
        if (b === 'assassin' && this.blinkTimer <= 0 && d > 130) {
          // disparition -> réapparition dans le dos du joueur
          AR.Particles.burst(this.centerX(), this.centerY(), 14, { color: '#8a8aff', speed: 160, size: 3, life: 0.4 });
          const side = -pl.facing || 1;
          this.x = pl.x + side * 55 - this.w / 2;
          this.y = pl.y - 10;
          this.vy = 0;
          this.blinkTimer = def.blinkCd;
          AR.Particles.burst(this.centerX(), this.centerY(), 14, { color: '#8a8aff', speed: 160, size: 3, life: 0.4 });
          AR.Audio.sfx('dash');
          this.state = 'tele'; this.t = 0;
          break;
        }
        if (b === 'charger') {
          if (d < def.range && this.atkTimer <= 0) { this.state = 'tele'; this.t = 0; AR.Audio.sfx('telegraph'); }
          else { this.vx = this.facing * def.speed; if (!this._groundAhead(game.level)) this.vx = 0; }
          break;
        }
        if (b === 'ranged' || b === 'caster' || b === 'artillery') {
          const keep = def.keep || 300;
          if (d < keep - 70) { this.vx = -this.facing * def.speed; if (!this._groundAhead(game.level, -this.facing)) this.vx = 0; }
          else if (d > keep + 90 && d < def.aggro) { this.vx = this.facing * def.speed; if (!this._groundAhead(game.level)) this.vx = 0; }
          else this.vx = 0;
          if (d < def.range && this.atkTimer <= 0) { this.state = 'tele'; this.t = 0; }
          if (d > def.aggro * 1.3) this.state = 'idle';
          break;
        }
        if (b === 'flyer') {
          const keep = def.keep || 80;
          const targetX = pl.x + (d < keep - 50 ? -this.facing * 120 : 0);
          this.vx = AR.U.clamp((targetX - this.x) * 2.2, -def.speed, def.speed);
          const ty = pl.y - (def.flyH || 120) + Math.sin(this.t * 2 + this.bobPhase) * 18;
          this.vy = AR.U.clamp((ty - this.y) * 2.4, -160, 160);
          if (this.atkTimer <= 0 && (def.dive ? d < 320 : d < def.range)) { this.state = 'tele'; this.t = 0; }
          break;
        }
        // mêlée / brute / bouclier
        this.vx = this.facing * def.speed;
        if (!this._groundAhead(game.level)) this.vx = 0;
        if (d < def.range + this.w / 2 && this.atkTimer <= 0) {
          this.state = 'tele'; this.t = 0;
          if (d < 260) AR.Audio.sfx('telegraph');
        }
        if (d > def.aggro * 1.4) this.state = 'idle';
        break;
      }
      case 'tele': {
        // télégraphe : l'ennemi se fige et "s'arme" (contour renforcé au rendu)
        this.vx = 0;
        if (def.behavior === 'flyer') this.vy = Math.sin(this.t * 12) * 22;
        if (this.t >= def.tele) {
          this.t = 0;
          if (def.behavior === 'charger') {
            this.state = 'charge';
            this.chargeDir = AR.U.sign(pl.x - this.x || 1);
            this.facing = this.chargeDir;
            AR.Audio.sfx('bossRoar');
          } else if (def.behavior === 'ranged' || def.behavior === 'caster' || def.behavior === 'artillery') {
            this.state = 'recover';
            if (def.burst) { this.burstN = def.burst; this.burstT = 0; }
            else this._fire(game);
            this.atkTimer = def.atkCd;
          } else if (def.dive) {
            this.state = 'dive';
            const ang = AR.U.angle(this.centerX(), this.centerY(), pl.x + pl.w / 2, pl.y + pl.h / 2);
            this.vx = Math.cos(ang) * 480; this.vy = Math.sin(ang) * 480;
            AR.Audio.sfx('dash');
          } else {
            this.state = 'attack';
            this._strike(game);
          }
        }
        break;
      }
      case 'attack': {
        // petite avancée pendant le coup
        this.vx = this.facing * def.speed * 1.6;
        if (this.t > 0.22) {
          if (def.combo2 && !this.didCombo) {
            this.didCombo = true; this.t = 0; this._strike(game);
          } else {
            this.didCombo = false;
            this.state = 'recover'; this.t = 0;
            this.atkTimer = def.atkCd;
          }
        }
        break;
      }
      case 'recover': {
        this.vx = 0;
        if (this.t > 0.5) { this.state = 'chase'; this.t = 0; }
        break;
      }
      case 'charge': {
        this.vx = this.chargeDir * def.chargeSpeed;
        // dégâts de contact pendant la charge
        if (!pl.dead && AR.U.rectsOverlap(this.getRect(), pl.getRect())) {
          game.hitPlayer(this.dmg, this.centerX());
          pl.knock(this.chargeDir * (def.knock || 350));
        }
        AR.Particles.burst(this.x + (this.chargeDir < 0 ? this.w : 0), this.y + this.h, 1,
          { color: '#bbb094', speed: 60, size: 3, life: 0.4, up: 40 });
        if (this.t > 1.6) { this.state = 'stunned'; this.t = 0; }
        break;
      }
      case 'dive': {
        if (!pl.dead && AR.U.rectsOverlap(this.getRect(), pl.getRect())) {
          game.hitPlayer(this.dmg, this.centerX());
          this.state = 'recover'; this.t = 0; this.atkTimer = def.atkCd;
          this.vx = 0; this.vy = -140;
        }
        if (this.t > 0.8) { this.state = 'recover'; this.t = 0; this.atkTimer = def.atkCd; this.vx = 0; }
        break;
      }
      case 'stunned': {
        this.vx = 0;
        if (this.t > 0.9) { this.state = 'chase'; this.t = 0; this.atkTimer = def.atkCd; }
        break;
      }
    }

    // physique
    if (flying) {
      this.x += (this.vx + this.kvx) * dt;
      this.y += this.vy * dt;
      if (this.state !== 'dive' && def.behavior === 'flyer') {
        const gy = game.level.groundYpx(this.centerX());
        this.y = Math.min(this.y, gy - this.h - 20);
      }
    } else {
      this.vy += AR.C.GRAV * dt;
      this.vy = Math.min(this.vy, 900);
      const res = game.level.moveRect(this, (this.vx + this.kvx) * dt, this.vy * dt, !this.onPlatform);
      this.onGround = res.onGround;
      if (res.onGround) this.vy = 0;
      if (res.hitWall && this.state === 'charge') {
        this.state = 'stunned'; this.t = 0;
        game.camera.shake(6, 0.3); AR.Audio.sfx('boom');
        AR.Particles.burst(this.x + (this.chargeDir > 0 ? this.w : 0), this.centerY(), 12,
          { color: '#bbb094', speed: 220, size: 4, life: 0.5 });
      }
      if (res.hitWall && this.state === 'chase') {
        // petit saut pour franchir une marche
        if (this.onGround) this.vy = -430;
      }
      if (this.y > AR.C.WORLD_H * AR.C.TILE + 100) { this.hp = 0; this.die(game, true); }
    }
    // contact direct (hors charge, qui gère ses dégâts)
    if (!pl.dead && this.state !== 'charge' && this.state !== 'dive' &&
        AR.U.rectsOverlap(this.getRect(), pl.getRect())) {
      game.hitPlayer(Math.round(this.dmg * 0.4), this.centerX());
    }
  }

  _groundAhead(level, dir) {
    const d = dir || this.facing;
    const px = this.x + (d > 0 ? this.w + 10 : -10);
    const gy = level.groundYpx(px);
    return gy - (this.y + this.h) < AR.C.TILE * 3.5;
  }

  // coup de mêlée : zone devant l'ennemi
  _strike(game) {
    const def = this.def;
    const pl = game.player;
    const r = {
      x: this.facing > 0 ? this.x + this.w * 0.4 : this.x - def.range,
      y: this.y - 8, w: def.range + this.w * 0.6, h: this.h + 16,
    };
    AR.Particles.slashArc(this.centerX() + this.facing * def.range * 0.5, this.centerY(),
      this.facing, def.behavior === 'brute', def.behavior === 'brute' ? '#ff7a5c' : '#ffce6a');
    if (def.behavior === 'brute') {
      game.camera.shake(4, 0.2);
      AR.Audio.sfx('slashHeavy');
    } else AR.Audio.sfx('slash2');
    if (!pl.dead && AR.U.rectsOverlap(r, pl.getRect())) {
      game.hitPlayer(this.dmg, this.centerX());
      if (def.knock) pl.knock(this.facing * def.knock);
    }
  }

  _fire(game) {
    const def = this.def;
    const pl = game.player;
    const sx = this.centerX() + this.facing * this.w * 0.4;
    const sy = this.y + this.h * 0.35;
    const txx = pl.x + pl.w / 2, tyy = pl.y + pl.h / 2;
    const ang = AR.U.angle(sx, sy, txx, tyy);
    AR.Audio.sfx(def.proj === 'laser' ? 'laser' : def.proj === 'flame' ? 'flame' : 'enemyShoot');
    switch (def.proj) {
      case 'rock': {
        const t = 0.9;
        AR.Projectiles.spawn({
          x: sx, y: sy, kind: 'rock', friendly: false, dmg: this.dmg, g: 900, r: 7,
          vx: (txx - sx) / t, vy: (tyy - sy) / t - 0.5 * 900 * t, life: 3,
        });
        break;
      }
      case 'arrow':
        AR.Projectiles.spawn({
          x: sx, y: sy, kind: 'earrow', friendly: false, dmg: this.dmg, r: 6,
          vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, g: 60, life: 2.2,
        });
        break;
      case 'bullet':
        AR.Projectiles.spawn({
          x: sx, y: sy, kind: 'bullet', friendly: false, dmg: this.dmg, r: 5,
          vx: Math.cos(ang) * 780, vy: Math.sin(ang) * 780, life: 1.6,
        });
        break;
      case 'plasma':
        AR.Projectiles.spawn({
          x: sx, y: sy, kind: 'plasma', friendly: false, dmg: this.dmg, r: 7,
          vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, life: 1.8, color: '#e35cff',
        });
        break;
      case 'laser':
        AR.Projectiles.spawn({
          x: sx, y: sy, kind: 'laser', friendly: false, dmg: this.dmg, r: 6,
          vx: Math.cos(ang) * 1500, vy: Math.sin(ang) * 1500, life: 0.9,
        });
        break;
      case 'flame':
        for (let i = 0; i < 8; i++) {
          const a = ang + (Math.random() - 0.5) * 0.35;
          AR.Projectiles.spawn({
            x: sx, y: sy, kind: 'flame', friendly: false, dmg: this.dmg, r: 12,
            vx: Math.cos(a) * (260 + i * 30), vy: Math.sin(a) * (260 + i * 30),
            life: 0.5 + i * 0.03, g: -40,
          });
        }
        break;
      case 'bomb': {
        const t = 1.0;
        AR.Projectiles.spawn({
          x: sx, y: sy, kind: 'bomb', friendly: false, dmg: this.dmg, g: 800, r: 7, explodeR: 62,
          vx: (txx - sx) / t, vy: (tyy - sy) / t - 0.5 * 800 * t, life: 3,
        });
        break;
      }
      case 'mortar': {
        const t = 1.35;
        const lx = txx + (Math.random() - 0.5) * 90;
        const gy = game.level.groundYpx(lx);
        AR.Particles.telegraphCircle(lx, gy, 66, t, AR.C.COLORS.danger);
        AR.Projectiles.spawn({
          x: sx, y: sy, kind: 'mortar', friendly: false, dmg: this.dmg, g: 1000, r: 8, explodeR: 66,
          vx: (lx - sx) / t, vy: (gy - sy) / t - 0.5 * 1000 * t, life: t + 0.1,
        });
        break;
      }
      case 'wisp':
        for (let i = 0; i < 2; i++) {
          AR.Projectiles.spawn({
            x: sx + (i - 0.5) * 30, y: sy - 20, kind: 'wisp', friendly: false, dmg: this.dmg, r: 8,
            vx: Math.cos(ang + (i - 0.5)) * 220, vy: Math.sin(ang + (i - 0.5)) * 220 - 80,
            homing: 2.6, life: 4, color: this.id === 'war_shaman' ? '#7ee8c8' : '#c05cff',
          });
        }
        break;
    }
  }

  // dégâts entrants (renvoie les dégâts réellement infligés)
  takeDamage(dmg, opts, game) {
    const def = this.def;
    opts = opts || {};
    // drone bouclier : la bulle absorbe d'abord
    if (this.shieldHp > 0) {
      this.shieldHp -= dmg;
      AR.Particles.burst(this.centerX(), this.centerY(), 8, { color: '#42e8f5', speed: 180, size: 3, life: 0.3 });
      if (this.shieldHp <= 0) {
        AR.Particles.shockwave(this.centerX(), this.centerY(), 50, '#42e8f5');
      }
      this.flash = 1; this.hurtT = 3;
      return 0;
    }
    // garde frontale (hoplite, gardien, cuirassés...)
    if (def.block && this.state !== 'attack' && this.state !== 'recover' && this.state !== 'stunned') {
      const fromFront = opts.fromX === undefined || AR.U.sign(opts.fromX - this.centerX()) === this.facing;
      if (fromFront && !opts.pierceBlock) {
        dmg = Math.round(dmg * (1 - def.block));
        AR.Particles.burst(this.centerX() + this.facing * this.w * 0.5, this.centerY(), 6,
          { color: '#ffe9a3', speed: 200, size: 3, life: 0.25, type: 'spark' });
      }
    }
    this.hp -= dmg;
    this.flash = 1; this.hurtT = 3;
    if (opts.knockX && !this.isBoss && def.behavior !== 'charger') this.kvx = opts.knockX;
    if (this.hp <= 0) this.die(game);
    return dmg;
  }

  die(game, silent) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0;
    if (silent) return;
    const cx = this.centerX(), cy = this.centerY();
    AR.Audio.sfx('die');
    AR.Particles.burst(cx, cy, this.elite ? 26 : 14, {
      color: [AR.C.COLORS.spirit, '#fff', game.level.era.accent], speed: 240, size: 4, life: 0.6, up: 120,
    });
    const goldMult = game.mods.goldMult || 1;
    AR.Pickups.coinBurst(cx, cy, Math.max(1, Math.round(this.def.coins * goldMult / 2)), 2);
    if (Math.random() < 0.09) AR.Pickups.drop('heart', cx, cy);
    if (Math.random() < (this.elite ? 0.5 : 0.035)) AR.Pickups.drop('potionDrop', cx, cy);
    game.awardXP(Math.round(this.def.xp * (this.elite ? 1.6 : 1)), cx, cy - this.h);
    game.stats.kills++;
  }

  getRect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  draw(ctx, cam, time) {
    const cx = cam.cx(), cy = cam.cy();
    const fx = this.centerX() - cx;
    const fy = this.y + this.h - cy;
    if (fx < -180 || fx > AR.C.VIEW_W + 180) return;
    const key = 'enemies/' + this.id;
    const alpha = this.dead ? Math.max(0, 1 - this.deadT * 2) : 1;
    if (alpha <= 0) return;

    // ombre portée
    if (!this.def.float) {
      const gy = this._shadowY(cam);
      ctx.save();
      ctx.globalAlpha = 0.3 * alpha;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(fx, gy, this.w * 0.55, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // halo d'élite
    if (this.elite && !this.dead) {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(time * 5) * 0.2;
      ctx.strokeStyle = AR.C.COLORS.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(fx, fy, this.w * 0.7, 8, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    // bulle du drone bouclier
    if (this.shieldHp > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(time * 6) * 0.1;
      ctx.strokeStyle = '#42e8f5'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(fx, fy - this.h / 2, this.h * 0.72, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    const spriteFacesLeft = this.def.facing === 'l';
    const flip = spriteFacesLeft ? this.facing > 0 : this.facing < 0;
    const bob = (this.def.float || this.def.behavior === 'flyer') ? Math.sin(time * 3 + this.bobPhase) * 5 : 0;
    let tint;
    if (this.flash > 0.4) tint = 'brightness(2.6)';
    else if (this.state === 'tele') tint = (Math.sin(time * 26) > 0) ? 'brightness(1.6) saturate(1.6)' : undefined;
    AR.Assets.draw(ctx, key, fx, fy + bob, this.drawH, flip, alpha, tint);

    // barre de vie (si récemment touché)
    if (this.hurtT > 0 && !this.dead && !this.isBoss) {
      const bw = Math.max(40, this.w);
      const bx = fx - bw / 2, by = this.y - cy - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = this.elite ? AR.C.COLORS.gold : AR.C.COLORS.hp;
      ctx.fillRect(bx, by, bw * AR.U.clamp(this.hp / this.maxHp, 0, 1), 4);
    }
  }

  _shadowY(cam) {
    return this.y + this.h - cam.cy() + 2;
  }
};

// ============================================================== BOSS
AR.Boss = class extends AR.Enemy {
  constructor(id, x, footY, game) {
    // les boss utilisent leur propre table
    const bdef = AR.BOSSES[id];
    // squelette Enemy avec des stats surchargées
    super(game.level.era.enemies[0], x, footY, false, 1);
    this.id = id;
    this.bdef = bdef;
    this.isBoss = true;
    this.name = bdef.name;
    const ng = 1 + game.ngPlus * 0.5;
    this.maxHp = Math.round(bdef.hp * ng);
    this.hp = this.maxHp;
    this.dmg = Math.round(bdef.dmg * Math.sqrt(ng));
    this.drawH = bdef.h;
    this.h = this.drawH * 0.8;
    const dw = AR.Assets.drawnW('enemies/' + id, this.drawH);
    this.w = AR.U.clamp(dw * 0.55, 60, this.drawH * 1.1);
    this.x = x - this.w / 2;
    this.y = footY - this.h;
    this.def = Object.assign({}, this.def, {
      facing: 'r', float: bdef.floats, behavior: 'boss', tele: 0.7, block: 0,
    });
    this.phase = 1;
    this.patterns = bdef.patterns;
    this.patIdx = 0;
    this.state = 'intro';
    this.t = 0;
    this.beam = null;      // laser de l'IA suprême
    this.baseY = footY;
    this.speed = bdef.speed;
  }

  update(dt, game) {
    if (this.dead) { this.deadT += dt; return; }
    if (game.veilT > 0) dt *= 0.55;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    const pl = game.player;
    const bdef = this.bdef;
    this.kvx = 0;

    // passage en phase 2
    if (this.phase === 1 && this.hp < this.maxHp * bdef.phase2) {
      this.phase = 2;
      this.patterns = bdef.p2patterns;
      this.patIdx = 0;
      this.speed = bdef.speed * 1.2;
      AR.Audio.sfx('bossRoar');
      game.camera.shake(8, 0.5);
      AR.Particles.shockwave(this.centerX(), this.centerY(), 160, AR.C.COLORS.danger);
    }

    const floats = bdef.floats;
    if (floats) {
      const targetY = this.baseY - (bdef.flyH || 110) - this.h + Math.sin(this.t * 1.8) * 16;
      this.y = AR.U.damp(this.y, targetY, 2.5, dt);
    }

    switch (this.state) {
      case 'intro':
        if (this.t > 1.2) { this.state = 'move'; this.t = 0; }
        break;
      case 'move': {
        this.facing = AR.U.sign(pl.x - this.x || 1);
        const d = Math.abs(pl.x + pl.w / 2 - this.centerX());
        this.vx = d > 140 ? this.facing * this.speed : 0;
        if (this.t > 1.4) {
          this.t = 0;
          this.pattern = this.patterns[this.patIdx % this.patterns.length];
          this.patIdx++;
          this.state = 'tele';
          AR.Audio.sfx('telegraph');
        }
        break;
      }
      case 'tele':
        this.vx = 0;
        if (this.t >= 0.7) { this.t = 0; this._execPattern(game); }
        break;
      case 'charge': {
        this.vx = this.chargeDir * this.speed * 4.2;
        if (!pl.dead && AR.U.rectsOverlap(this.getRect(), pl.getRect())) {
          game.hitPlayer(this.dmg, this.centerX());
          pl.knock(this.chargeDir * 420);
        }
        AR.Particles.burst(this.x + (this.chargeDir < 0 ? this.w : 0), this.y + this.h, 2,
          { color: '#bbb094', speed: 80, size: 4, life: 0.4, up: 60 });
        if (this.t > 1.1) { this.state = 'move'; this.t = 0; this.vx = 0; }
        break;
      }
      case 'stomp': {
        // bond vers le joueur puis onde de choc à l'atterrissage
        if (!this.stompLanded) {
          this.x += this.stompVx * dt;
          this.y += this.stompVy * dt;
          this.stompVy += 2400 * dt;
          if (this.y + this.h >= this.baseY) {
            this.y = this.baseY - this.h;
            this.stompLanded = true;
            game.camera.shake(9, 0.4);
            AR.Audio.sfx('boom');
            AR.Particles.shockwave(this.centerX(), this.y + this.h, 190, AR.C.COLORS.impact);
            // onde au sol : blesse si le joueur est au sol et proche
            if (!pl.dead && pl.onGround && Math.abs(pl.x + pl.w / 2 - this.centerX()) < 240) {
              game.hitPlayer(this.dmg, this.centerX());
              pl.knock(AR.U.sign(pl.x - this.x) * 380);
            }
          }
        } else if (this.t > 0.8) { this.state = 'move'; this.t = 0; this.stompLanded = false; }
        break;
      }
      case 'beam': {
        // IA suprême : balayage laser télégraphié puis actif
        const b = this.beam;
        b.t += dt;
        if (b.t < 0.8) {
          // phase télégraphe (rendu seulement)
        } else if (b.t < 1.6) {
          b.active = true;
          if (!pl.dead && Math.abs((pl.y + pl.h / 2) - b.y) < 34 && !pl.dashing) {
            game.hitPlayer(Math.round(this.dmg * 0.7 * dt * 4), this.centerX());
          }
          if (Math.random() < 0.5) AR.Particles.spawn({
            x: game.camera.cx() + Math.random() * AR.C.VIEW_W, y: b.y,
            vx: 0, vy: 0, life: 0.2, size: 8, color: AR.C.COLORS.danger, type: 'glow',
          });
        } else { this.beam = null; this.state = 'move'; this.t = 0; }
        break;
      }
      case 'blink': {
        if (this.t > 0.3) {
          const side = Math.random() < 0.5 ? -1 : 1;
          this.x = AR.U.clamp(pl.x + side * 200, game.arena.x0 + 60, game.arena.x1 - 60 - this.w);
          AR.Particles.burst(this.centerX(), this.centerY(), 22, { color: '#c05cff', speed: 220, size: 4, life: 0.5 });
          AR.Audio.sfx('spell');
          this.state = 'move'; this.t = 0;
        }
        break;
      }
    }

    // physique au sol pour les boss terrestres
    if (!floats && this.state !== 'stomp') {
      this.vy = (this.vy || 0) + AR.C.GRAV * dt;
      const res = game.level.moveRect(this, (this.vx || 0) * dt, this.vy * dt, true);
      if (res.onGround) this.vy = 0;
      if (res.hitWall && this.state === 'charge') {
        this.state = 'move'; this.t = 0;
        game.camera.shake(7, 0.3); AR.Audio.sfx('boom');
      }
      // bornes de l'arène
      this.x = AR.U.clamp(this.x, game.arena.x0 + 10, game.arena.x1 - this.w - 10);
    } else if (floats) {
      this.x = AR.U.clamp(this.x + (this.vx || 0) * dt, game.arena.x0 + 10, game.arena.x1 - this.w - 10);
    }

    // contact
    if (!pl.dead && this.state !== 'charge' && AR.U.rectsOverlap(this.getRect(), pl.getRect())) {
      game.hitPlayer(Math.round(this.dmg * 0.35), this.centerX());
    }
  }

  _execPattern(game) {
    const pl = game.player;
    const pat = this.pattern;
    if (pat.startsWith('summon:')) {
      const what = pat.split(':')[1];
      if (what === 'wisp3') {
        for (let i = 0; i < 3; i++) {
          AR.Projectiles.spawn({
            x: this.centerX() + (i - 1) * 40, y: this.y + 20, kind: 'wisp', friendly: false,
            dmg: Math.round(this.dmg * 0.5), r: 8, vx: (i - 1) * 160, vy: -160, homing: 2.8, life: 5, color: '#c05cff',
          });
        }
      } else if (game.enemies.filter((e) => !e.dead && !e.isBoss).length < 4) {
        for (let i = 0; i < 2; i++) {
          const mx = this.centerX() + (i === 0 ? -140 : 140);
          const m = new AR.Enemy(what, mx, game.level.groundYpx(mx), false, AR.ERA_SCALE[game.eraIdx] * 0.8);
          m.active = true;
          game.enemies.push(m);
          AR.Particles.burst(mx, m.y + m.h / 2, 12, { color: AR.C.COLORS.magic, speed: 180, size: 4, life: 0.5 });
        }
      }
      this.state = 'move'; this.t = 0;
      return;
    }
    switch (pat) {
      case 'charge': case 'sweep':
        this.state = 'charge';
        this.chargeDir = AR.U.sign(pl.x - this.x || 1);
        this.facing = this.chargeDir;
        AR.Audio.sfx('bossRoar');
        break;
      case 'stomp':
        this.state = 'stomp';
        this.stompLanded = false;
        this.stompVx = (pl.x - this.x) / 0.7;
        this.stompVy = -820;
        break;
      case 'rocks': case 'javelins': case 'fireballs': case 'volley': case 'flames': {
        const kind = { rocks: 'rock', javelins: 'javelin', fireballs: 'fireball', volley: 'bullet', flames: 'flame' }[pat];
        const n = pat === 'flames' ? 10 : (this.phase === 2 ? 6 : 4);
        const sx = this.centerX(), sy = this.y + this.h * 0.3;
        for (let i = 0; i < n; i++) {
          const ang = AR.U.angle(sx, sy, pl.x + pl.w / 2, pl.y + pl.h / 2) + (i - (n - 1) / 2) * 0.16;
          const sp = kind === 'bullet' ? 700 : kind === 'flame' ? 300 + i * 20 : 460;
          AR.Projectiles.spawn({
            x: sx, y: sy, kind, friendly: false, dmg: Math.round(this.dmg * 0.6),
            r: kind === 'flame' ? 12 : 7,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            g: (kind === 'rock' || kind === 'javelin') ? 500 : kind === 'flame' ? -40 : 0,
            life: kind === 'flame' ? 0.7 : 2.5,
          });
        }
        AR.Audio.sfx(pat === 'flames' ? 'flame' : 'enemyShoot');
        this.state = 'move'; this.t = 0;
        break;
      }
      case 'ring': {
        const n = this.phase === 2 ? 14 : 10;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + this.t;
          AR.Projectiles.spawn({
            x: this.centerX(), y: this.centerY(), kind: 'plasma', friendly: false,
            dmg: Math.round(this.dmg * 0.5), r: 7,
            vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 2.2,
            color: this.id === 'ai_overlord' ? '#e35cff' : '#c05cff',
          });
        }
        AR.Audio.sfx('spell');
        this.state = 'move'; this.t = 0;
        break;
      }
      case 'mortars': {
        const n = this.phase === 2 ? 5 : 3;
        for (let i = 0; i < n; i++) {
          const lx = pl.x + (Math.random() - 0.5) * 340;
          const gy = game.level.groundYpx(lx);
          const t = 1.1 + i * 0.22;
          AR.Particles.telegraphCircle(lx, gy, 70, t, AR.C.COLORS.danger);
          AR.Projectiles.spawn({
            x: this.centerX(), y: this.y, kind: 'mortar', friendly: false,
            dmg: Math.round(this.dmg * 0.7), g: 1000, r: 8, explodeR: 70,
            vx: (lx - this.centerX()) / t, vy: (gy - this.y) / t - 0.5 * 1000 * t, life: t + 0.1,
          });
        }
        AR.Audio.sfx('enemyShoot');
        this.state = 'move'; this.t = 0;
        break;
      }
      case 'beam':
        this.state = 'beam';
        this.beam = { y: pl.y + pl.h / 2, t: 0, active: false };
        AR.Audio.sfx('laser');
        break;
      case 'blink':
        this.state = 'blink';
        AR.Particles.burst(this.centerX(), this.centerY(), 18, { color: '#c05cff', speed: 200, size: 4, life: 0.4 });
        break;
      default:
        this.state = 'move'; this.t = 0;
    }
  }

  takeDamage(dmg, opts, game) {
    opts = opts || {};
    // Béhémoth diesel : blindage frontal hors récupération
    if (this.bdef.armored && this.state !== 'stunned' && this.state !== 'move') {
      const fromFront = opts.fromX === undefined || AR.U.sign(opts.fromX - this.centerX()) === this.facing;
      if (fromFront && !opts.pierceBlock) {
        dmg = Math.round(dmg * 0.35);
        AR.Particles.burst(this.centerX() + this.facing * this.w * 0.5, this.centerY(), 5,
          { color: '#ffe9a3', speed: 180, size: 3, life: 0.25, type: 'spark' });
      }
    }
    this.hp -= dmg;
    this.flash = 1;
    if (this.hp <= 0 && !this.dead) this.die(game);
    return dmg;
  }

  die(game) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0;
    AR.Audio.sfx('bossDie');
    game.camera.shake(12, 0.8);
    const cx = this.centerX(), cy = this.centerY();
    for (let k = 0; k < 4; k++) {
      setTimeout(() => AR.Particles.shockwave(cx + (Math.random() - 0.5) * 100, cy + (Math.random() - 0.5) * 80,
        120 + k * 40, k % 2 ? AR.C.COLORS.impact : AR.C.COLORS.spirit), k * 130);
    }
    AR.Particles.burst(cx, cy, 40, { color: [AR.C.COLORS.gold, '#fff', AR.C.COLORS.spirit], speed: 380, size: 5, life: 1.0, up: 200 });
    const goldMult = game.mods.goldMult || 1;
    AR.Pickups.coinBurst(cx, cy, Math.round(this.bdef.coins * goldMult / 3), 3);
    game.awardXP(this.bdef.xp, cx, cy - 60);
    game.stats.kills++;
    game.onBossDeath();
  }

  drawBeam(ctx, cam) {
    if (!this.beam) return;
    const b = this.beam;
    const y = b.y - cam.cy();
    ctx.save();
    if (!b.active) {
      ctx.globalAlpha = 0.4 + Math.sin(b.t * 30) * 0.2;
      ctx.strokeStyle = AR.C.COLORS.danger;
      ctx.setLineDash([14, 10]);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(AR.C.VIEW_W, y); ctx.stroke();
    } else {
      ctx.shadowColor = AR.C.COLORS.danger; ctx.shadowBlur = 30;
      ctx.fillStyle = AR.C.COLORS.danger;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, y - 9, AR.C.VIEW_W, 18);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, y - 3, AR.C.VIEW_W, 6);
    }
    ctx.restore();
  }
};
