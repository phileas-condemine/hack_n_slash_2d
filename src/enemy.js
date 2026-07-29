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
    this._dmgScale = (elite ? 1.3 : 1) * Math.sqrt(eraScale || 1);
    this.dmg = Math.round(def.dmg * this._dmgScale);
    // multi-attaques (def.attacks, cf. AR.Enemy#_pickAttack) : sous-ensemble d'ennemis
    // élite (arène des gladiateurs) avec 3 attaques distinctes, chacune sa propre
    // animation windup/attack ('enemies/states/{id}_{key}_windup'/'_attack').
    this.activeAtk = null;
    this._lastAtkKey = null;
    this.drawH = def.h * (elite ? 1.18 : 1);
    this.h = this.drawH * 0.82;
    // sprite effectif : repli sur AR.ENEMY_FALLBACK si l'image de cet ennemi manque
    this.spriteId = id;
    if (!AR.SPRITE_META['enemies/states/' + id + '_neutral'] && !AR.SPRITE_META['enemies/' + id] &&
        AR.ENEMY_FALLBACK && AR.ENEMY_FALLBACK[id]) {
      this.spriteId = AR.ENEMY_FALLBACK[id];
    }
    const neutralKey = 'enemies/states/' + this.spriteId + '_neutral';
    const dw = AR.Assets.drawnW(AR.SPRITE_META[neutralKey] ? neutralKey : 'enemies/' + this.spriteId, this.drawH);
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
    this.attackPoseT = 0;    // maintient brièvement la pose d'attaque pour les tirs instantanés
    this.hurtT = 0;           // affichage barre de vie
    this.dead = false; this.deadT = 0;
    this.active = false;
    // émergence (creusement) : cf. AR.Enemy#armEmergence — 0 = apparition normale
    this.emergeT = 0;
    this.onGround = false;
    this.homeX = x;
    this.bobPhase = Math.random() * 7;
    this.shieldHp = def.shielded ? def.shielded * (eraScale || 1) : 0;
    this.patrolDir = Math.random() < 0.5 ? -1 : 1;
    this.isBoss = false;
    this.onPlatform = false;
    // réactivité (rage, parade, esquive, mobilité avancée selon la difficulté)
    this.rageT = 0;
    this.parryCd = 0;
    this.dodgeCd = 0;
    this.dashCd = 1.5 + Math.random() * 2;
    this.tpCd = 5 + Math.random() * 4;
    this.tpTarget = null;
    this.airJumped = false;
    // buff de soutien (ex. tambour de guerre) : dégâts/résistance temporaires accordés par un
    // allié ; baseDmg permet de revenir à la valeur d'origine quand le buff expire.
    this.baseDmg = this.dmg;
    this.buffT = 0;
    this.buffResist = 0;
    // piratage (R6, cf. `hijack()`/état 'hijacked') : mode tourelle temporaire, tire sur les
    // autres ennemis au lieu du joueur — hijackedT = 0 tant qu'aucun terminal ne l'a activé.
    this.hijackedT = 0;
    this.hijackFireT = 0;
  }

  // Terminal de piratage (R6, `Level#activateInteractable`) : bascule ce drone en mode tourelle
  // alliée pour `duration` secondes. Limité en pratique aux ennemis avec `def.proj` (cf.
  // `_fireHijacked`) — un ennemi sans tir à distance passerait juste `duration` secondes immobile
  // et inoffensif, ce qui reste sans danger mais n'a aucun intérêt (la spec R6 ne cible que des
  // tireurs via `activateGroup`).
  hijack(duration) {
    if (this.dead) return;
    this.state = 'hijacked';
    this.hijackedT = duration;
    this.hijackFireT = 0.4;
  }

  // Effet bonus des sorts Nuée de kunaïs / Frappe éclair (cf. Player#castSpell, AR.SPELLS) :
  // réutilise l'état 'stunned' déjà déclenché quand un chargeur percute un mur (cf. update(),
  // case 'charge'), avec une durée personnalisée au lieu du défaut 0.9s codé en dur dans ce
  // cas-là. Les boss ignorent l'étourdissement (même armure que le knockback, cf. `opts.knockX
  // && !this.isBoss` plus bas) — sinon spammer le sort verrouillerait un boss en continu.
  stun(duration) {
    if (this.dead || this.isBoss) return;
    this.state = 'stunned';
    this.t = 0;
    this.stunDur = duration;
  }

  centerX() { return this.x + this.w / 2; }
  centerY() { return this.y + this.h / 2; }

  // Choisit une des 3 attaques de def.attacks (jamais deux fois de suite la même) et
  // recalcule les dégâts en cours à partir d'elle ; ennemis sans `attacks` : no-op,
  // this.dmg reste celui calculé au constructeur (comportement inchangé).
  _pickAttack() {
    const list = this.def.attacks;
    if (!list || !list.length) return;
    let pick = list[0];
    if (list.length > 1) {
      do { pick = list[Math.floor(Math.random() * list.length)]; } while (pick.key === this._lastAtkKey);
    }
    this.activeAtk = pick;
    this._lastAtkKey = pick.key;
    this.dmg = Math.round((pick.dmg != null ? pick.dmg : this.def.dmg) * this._dmgScale);
  }

  _enterTele() {
    this._pickAttack();
    this.state = 'tele';
    this.t = 0;
  }

  // Déclenche l'animation de creusement (terre qui tremble puis éboulis) avant
  // que l'ennemi ne devienne visible/actif/attaquable. Utilisé pour les ennemis
  // d'embuscade (vagues d'encounter, dormants réveillés) qui, sinon,
  // apparaissaient ou s'activaient instantanément sans aucun signal.
  armEmergence(duration) {
    this.emergeT = duration || 1.7;
    this._emergeTotal = this.emergeT;
    this.state = 'idle';
    this._nextDirtPuff = 0;
  }

  update(dt, game) {
    if (this.dead) { this.deadT += dt; return; }
    if (this.emergeT > 0) {
      this.emergeT -= dt;
      const grounded = !(this.def.behavior === 'flyer' || this.def.float);
      // ennemis "suspendus" (ex. traqueurs accrochés au plafond d'une grotte) : ils ne
      // sortent pas du sol mais se détachent de la roche AU-DESSUS et tombent — la
      // gravats doit donc tomber tout droit depuis le plafond, pas jaillir du sol.
      const ceiling = grounded && this.suspended;
      if (grounded) {
        // jets de terre continus pendant le creusement, de plus en plus fréquents/violents
        // à mesure que la sortie approche, pour bien lire "il creuse" avant "il apparaît".
        const total = this._emergeTotal || 1.7;
        const prog = 1 - AR.U.clamp(this.emergeT / total, 0, 1);
        this._nextDirtPuff -= dt;
        if (this._nextDirtPuff <= 0) {
          this._nextDirtPuff = 0.16 - prog * 0.08 + Math.random() * 0.05;
          if (ceiling) {
            AR.Particles.burst(this.centerX() + (Math.random() - 0.5) * this.w * 0.4, this.y + 2,
              1 + Math.round(prog * 2),
              { color: ['#7a6a52', '#a89a80', '#57503a'], angle: Math.PI / 2, spread: 1.0,
                speed: 70 + prog * 120, size: 3 + prog * 1.5, life: 0.45, up: 0, g: 480 + prog * 200 });
          } else {
            AR.Particles.burst(this.centerX() + (Math.random() - 0.5) * this.w * 0.4, this.y + this.h - 2,
              1 + Math.round(prog * 2),
              { color: ['#7a6a52', '#a89a80', '#57503a'], speed: 90 + prog * 140, size: 3 + prog * 1.5,
                life: 0.45, up: 60 + prog * 100, spread: 1.6, g: 380 });
          }
        }
      }
      if (this.emergeT <= 0) {
        this.emergeT = 0;
        if (ceiling) {
          AR.Particles.burst(this.centerX(), this.y, 24,
            { color: ['#7a6a52', '#a89a80', '#57503a'], angle: Math.PI / 2, spread: 1.3, speed: 200, size: 5, life: 0.7, up: -30, g: 520 });
          AR.Particles.burst(this.centerX(), this.y, 6,
            { color: 'rgba(90,75,55,0.6)', speed: 50, size: 16, life: 0.55, up: 0, type: 'smoke', g: 60 });
        } else {
          AR.Particles.burst(this.centerX(), this.y + this.h, grounded ? 24 : 16,
            { color: ['#7a6a52', '#a89a80', '#57503a'], speed: 260, size: 5, life: 0.7, up: 150 });
          if (grounded) AR.Particles.burst(this.centerX(), this.y + this.h, 6,
            { color: 'rgba(90,75,55,0.6)', speed: 60, size: 16, life: 0.55, up: 40, type: 'smoke', g: 0 });
        }
        AR.Audio.sfx('boom');
      }
      return; // invisible au combat et immobile tant que la sortie de terre n'est pas finie
    }
    if (game.veilT > 0) dt *= 0.45;  // Voile temporel
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.attackPoseT = Math.max(0, this.attackPoseT - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.atkTimer -= dt;
    this.blinkTimer -= dt;
    this.kvx *= Math.pow(0.02, dt);
    this.rageT = Math.max(0, this.rageT - dt);
    this.parryCd -= dt;
    this.dodgeCd -= dt;
    this.dashCd -= dt;
    this.tpCd -= dt;
    if (this.buffT > 0) {
      this.buffT -= dt;
      if (this.buffT <= 0) { this.buffT = 0; this.dmg = this.baseDmg; this.buffResist = 0; }
    }
    if (this.hijackedT > 0) {
      this.hijackedT -= dt;
      if (this.hijackedT <= 0 && this.state === 'hijacked') { this.state = 'idle'; this.t = 0; }
    }

    const pl = game.player;
    const d = AR.U.dist(this.centerX(), this.centerY(), pl.x + pl.w / 2, pl.y + pl.h / 2);
    const def = this.def;
    const flying = def.behavior === 'flyer' || def.float;
    // profil de difficulté : vitesse, agressivité, cadence
    const diff = game.diff || AR.DIFFICULTIES[0];
    const spd = def.speed * diff.speedMult * (this.rageT > 0 ? 1.45 : 1);
    const aggroR = def.aggro * diff.aggroMult;
    const isShooter = ['ranged', 'caster', 'artillery'].includes(def.behavior);

    // rafales en cours (tireurs à burst)
    if (this.burstN > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) { this._fire(game); this.burstN--; this.burstT = 0.13; }
    }

    // ---- réaction aux projectiles du joueur : parade (mêlée rapide) ou esquive (tireurs)
    if (!pl.dead && !['charge', 'dive', 'stunned', 'tpWindup', 'dash'].includes(this.state)) {
      const threat = this._incomingProjectile();
      if (threat) {
        if (def.parry && this.parryCd <= 0) {
          if (Math.random() < diff.parryChance + (this.elite ? 0.15 : 0)) {
            // coup sec parfaitement synchronisé : le projectile est détruit
            this.parryCd = 1.0;
            this.facing = -AR.U.sign(threat.vx || 1) || this.facing;
            this.attackPoseT = 0.24;
            AR.Particles.slashArc(this.centerX() + this.facing * 30, this.centerY(), this.facing, false, '#ffce6a');
            AR.Projectiles.destroy(threat, 'parry');
            if (this.state === 'idle') { this.state = 'chase'; this.t = 0; }
            this.rageT = Math.max(this.rageT, 4);
          } else this.parryCd = 0.45; // tentative manquée : petite latence
        } else if (isShooter && this.dodgeCd <= 0 && this.onGround &&
                   Math.random() < diff.dodgeChance) {
          this._dodgeHop(AR.U.sign(this.centerX() - threat.x) || 1);
        }
      }
    }

    switch (this.state) {
      case 'idle': {
        if (d < aggroR && Math.abs(pl.y - this.y) < 380 && !pl.dead) { this.state = 'chase'; this.t = 0; break; }
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

        // ---- mobilité avancée (difficulté) : rejoindre un joueur perché
        const playerAbove = (this.y - pl.y) > AR.C.TILE * 1.8 && Math.abs(pl.x - this.x) < 300;
        if (!flying && playerAbove && this.onGround && Math.random() < 0.05) this.vy = -650;
        if (!flying && diff.canDoubleJump && !this.onGround && !this.airJumped &&
            this.vy > 40 && (this.y - pl.y) > AR.C.TILE * 2) {
          this.airJumped = true;
          this.vy = -540;
          AR.Particles.burst(this.centerX(), this.y + this.h, 8,
            { color: '#cfd8d4', speed: 120, size: 3, life: 0.3, spread: 1.2, angle: Math.PI / 2 });
        }
        // ---- téléportation (Cauchemar) : trait de visée puis transfert
        if (diff.canTeleport && this.tpCd <= 0 && !flying &&
            (d > 380 || (playerAbove && this.onGround))) {
          this.state = 'tpWindup'; this.t = 0;
          const side = Math.random() < 0.5 ? -1 : 1;
          this.tpTarget = { x: pl.x + pl.w / 2 + side * 90, y: pl.y + pl.h };
          AR.Audio.sfx('tpWindup');
          break;
        }
        // ---- dash de fermeture (Difficile+) pour les combattants au contact
        if (diff.canDash && this.dashCd <= 0 && this.onGround &&
            ['melee', 'brute', 'shield', 'assassin'].includes(b) && d > 170 && d < 430) {
          this.state = 'dash'; this.t = 0;
          this.dashDir = this.facing;
          this.dashCd = 2.8;
          AR.Audio.sfx('dash');
          break;
        }
        if (b === 'assassin' && this.blinkTimer <= 0 && d > 130) {
          // disparition -> réapparition dans le dos du joueur
          AR.Particles.burst(this.centerX(), this.centerY(), 14, { color: '#8a8aff', speed: 160, size: 3, life: 0.4 });
          const side = -pl.facing || 1;
          this.x = pl.x + side * 55 - this.w / 2;
          // se cale sur le vrai sol (et non `pl.y - 10`) : un ennemi bien plus grand/petit
          // que le joueur se retrouverait sinon partiellement enterré, et moveRect ne
          // rattrape pas un atterrissage sur plateforme déjà entamé sous la surface
          // (cf. arène de gladiateurs, sol = plateforme et non tuiles pleines) -> chute infinie.
          this.y = game.level.groundYAtEntity(this.x + this.w / 2, pl.y) - this.h;
          this.vy = 0;
          this.blinkTimer = def.blinkCd;
          AR.Particles.burst(this.centerX(), this.centerY(), 14, { color: '#8a8aff', speed: 160, size: 3, life: 0.4 });
          AR.Audio.sfx('dash');
          this._enterTele();
          break;
        }
        if (b === 'charger') {
          if (d < def.range && this.atkTimer <= 0) { this._enterTele(); AR.Audio.sfx('telegraph'); }
          else { this.vx = this.facing * spd; if (!this._groundAhead(game.level)) this.vx = 0; }
          break;
        }
        if (isShooter) {
          const keep = def.keep || 300;
          if (d < keep - 70) { this.vx = -this.facing * spd; if (!this._groundAhead(game.level, -this.facing)) this.vx = 0; }
          else if (d > keep + 90 && d < aggroR) { this.vx = this.facing * spd; if (!this._groundAhead(game.level)) this.vx = 0; }
          else this.vx = 0;
          if (d < def.range && this.atkTimer <= 0) { this._enterTele(); }
          if (d > aggroR * 1.3 && this.rageT <= 0) this.state = 'idle';
          break;
        }
        if (b === 'flyer') {
          const keep = def.keep || 80;
          const targetX = pl.x + (d < keep - 50 ? -this.facing * 120 : 0);
          this.vx = AR.U.clamp((targetX - this.x) * 2.2, -spd, spd);
          const ty = pl.y - (def.flyH || 120) + Math.sin(this.t * 2 + this.bobPhase) * 18;
          this.vy = AR.U.clamp((ty - this.y) * 2.4, -160, 160);
          if (this.atkTimer <= 0 && (def.dive ? d < 320 : d < def.range)) { this._enterTele(); }
          break;
        }
        // mêlée / brute / bouclier : au contact, vite
        this.vx = this.facing * spd;
        if (!this._groundAhead(game.level)) {
          // enragé, on saute par-dessus les fosses plutôt que de renoncer
          if (this.rageT > 0 && this.onGround) this.vy = -560;
          else this.vx = 0;
        }
        if (d < def.range + this.w / 2 && this.atkTimer <= 0) {
          this._enterTele();
          if (d < 260) AR.Audio.sfx('telegraph');
        }
        if (d > aggroR * 1.4 && this.rageT <= 0) this.state = 'idle';
        break;
      }
      case 'dash': {
        // fermeture rapide de la distance, avec traînée
        this.vx = this.dashDir * def.speed * 4.4;
        if (Math.random() < 0.7) AR.Particles.spawn({
          x: this.centerX(), y: this.centerY(), vx: 0, vy: 0,
          life: 0.22, size: this.w * 0.4, color: 'rgba(200,210,215,0.5)', type: 'glow',
        });
        if (this.t > 0.2 || Math.abs(pl.x - this.x) < def.range) { this.state = 'chase'; this.t = 0; }
        break;
      }
      case 'tpWindup': {
        // trait d'énergie vers la zone cible, puis transfert
        this.vx = 0;
        if (this.t >= 0.55) {
          const lvl = game.level;
          const gx = AR.U.clamp(this.tpTarget.x, AR.C.TILE * 2, (lvl.tilesW - 2) * AR.C.TILE);
          const gy = lvl.groundYAtEntity(gx, this.y);
          AR.Particles.burst(this.centerX(), this.centerY(), 16, { color: '#c05cff', speed: 200, size: 3.5, life: 0.4 });
          if (gy < (lvl.worldH || AR.C.WORLD_H) * AR.C.TILE) {
            this.x = gx - this.w / 2;
            this.y = gy - this.h - 2;
            this.vy = 0;
          }
          AR.Particles.burst(this.centerX(), this.centerY(), 16, { color: '#c05cff', speed: 200, size: 3.5, life: 0.4 });
          AR.Audio.sfx('spell');
          this.tpCd = 6 + Math.random() * 3;
          this.tpTarget = null;
          this._enterTele(); // enchaîne directement un télégraphe d'attaque
        }
        break;
      }
      case 'tele': {
        // télégraphe : l'ennemi se fige et "s'arme" (contour renforcé au rendu)
        this.vx = 0;
        if (def.behavior === 'flyer') this.vy = Math.sin(this.t * 12) * 22;
        // ennemis multi-attaques (def.attacks, cf. _pickAttack) : durée de télégraphe et
        // "nature" du coup (kind) viennent de l'attaque tirée au sort, pas du comportement
        // de base — un ennemi 'charger' peut ainsi avoir une attaque de zone ou de mêlée en
        // plus de sa charge, avec sa propre animation. Ennemis sans `attacks` : kind retombe
        // sur def.behavior, comportement strictement inchangé.
        const atk = this.activeAtk;
        const teleDur = atk ? atk.tele : def.tele;
        const kind = atk ? atk.kind : def.behavior;
        if (this.t >= teleDur) {
          this.t = 0;
          if (kind === 'charger' || kind === 'charge') {
            this.state = 'charge';
            this.chargeDir = AR.U.sign(pl.x - this.x || 1);
            this.facing = this.chargeDir;
            AR.Audio.sfx('bossRoar');
          } else if (kind === 'aoe') {
            this._aoeStrike(game);
            this.state = 'recover';
            this.atkTimer = def.atkCd * diff.atkCdMult;
          } else if (kind === 'ranged' || kind === 'caster' || kind === 'artillery') {
            this.state = 'recover';
            const burst = (atk && atk.burst) || def.burst;
            if (burst) { this.burstN = burst; this.burstT = 0; }
            else this._fire(game);
            this.atkTimer = def.atkCd * diff.atkCdMult;
          } else if (kind === 'dive' || (!atk && def.dive)) {
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
            this.atkTimer = def.atkCd * diff.atkCdMult;
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
          this.state = 'recover'; this.t = 0; this.atkTimer = def.atkCd * diff.atkCdMult;
          this.vx = 0; this.vy = -140;
        }
        if (this.t > 0.8) { this.state = 'recover'; this.t = 0; this.atkTimer = def.atkCd * diff.atkCdMult; this.vx = 0; }
        break;
      }
      case 'stunned': {
        this.vx = 0;
        if (this.t > (this.stunDur || 0.9)) {
          this.state = 'chase'; this.t = 0; this.atkTimer = def.atkCd * diff.atkCdMult; this.stunDur = 0;
        }
        break;
      }
      // Piratage (R6, cf. `hijack()`) : mode tourelle alliée — immobile (même flottement que
      // l'état 'tele' pour les flyers), tire périodiquement sur l'ennemi hostile le plus proche
      // au lieu du joueur. `hijackedT` est décrémenté plus haut, qui remet `state:'idle'` à
      // expiration (redevient hostile normalement).
      case 'hijacked': {
        this.vx = 0;
        if (flying) this.vy = Math.sin(this.t * 12) * 22;
        this.hijackFireT -= dt;
        if (this.hijackFireT <= 0 && def.proj) {
          this.hijackFireT = (def.atkCd || 1.5) * diff.atkCdMult;
          this._fireHijacked(game);
        }
        break;
      }
    }

    // physique
    if (flying) {
      this.x += (this.vx + this.kvx) * dt;
      this.y += this.vy * dt;
      if (this.state !== 'dive' && def.behavior === 'flyer') {
        const gy = game.level.groundYAtEntity(this.centerX(), this.y);
        this.y = Math.min(this.y, gy - this.h - 20);
      }
    } else {
      this.vy += AR.C.GRAV * dt;
      this.vy = Math.min(this.vy, 900);
      const res = game.level.moveRect(this, (this.vx + this.kvx) * dt, this.vy * dt, !this.onPlatform);
      this.onGround = res.onGround;
      if (res.onGround) { this.vy = 0; this.airJumped = false; }
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
      if (this.y > (game.level.worldH || AR.C.WORLD_H) * AR.C.TILE + 100) { this.hp = 0; this.die(game, true); }
    }
    // contact direct (hors charge, qui gère ses dégâts, et hors étourdi — chargeur sonné contre
    // un mur (case 'charge' ci-dessus) ou cible de kunai/Frappe éclair (cf. Enemy#stun) : pas
    // dangereux au toucher pendant ce temps, c'est tout l'intérêt de l'étourdissement)
    if (!pl.dead && this.state !== 'charge' && this.state !== 'dive' && this.state !== 'stunned' &&
        AR.U.rectsOverlap(this.getRect(), pl.getRect())) {
      game.hitPlayer(Math.round(this.dmg * 0.4), this.centerX());
    }
  }

  _groundAhead(level, dir) {
    const d = dir || this.facing;
    const px = this.x + (d > 0 ? this.w + 10 : -10);
    const gy = level.groundYAtEntity(px, this.y);
    return gy - (this.y + this.h) < AR.C.TILE * 3.5;
  }

  // projectile du joueur qui fonce sur nous (fenêtre de parade / d'esquive)
  _incomingProjectile() {
    for (const p of AR.Projectiles.list) {
      if (!p.friendly || p.kind === 'wave') continue;
      const dx = this.centerX() - p.x, dy = this.centerY() - p.y;
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (dd > 150) continue;
      if (p.vx * dx + p.vy * dy > 0) return p;
    }
    return null;
  }

  // un allié se trouve-t-il sur la trajectoire de tir ?
  _allyInLine(game, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const steps = Math.min(30, Math.ceil(dist / 30));
    for (const e of game.enemies) {
      if (e === this || e.dead || !e.active) continue;
      const r = e.getRect();
      for (let k = 1; k < steps; k++) {
        const px = x0 + dx * k / steps, py = y0 + dy * k / steps;
        if (px > r.x - 6 && px < r.x + r.w + 6 && py > r.y - 6 && py < r.y + r.h + 6) return true;
      }
    }
    return false;
  }

  // petit bond de côté (tireurs) suivi d'une riposte rapide
  _dodgeHop(dir) {
    this.dodgeCd = 1.5;
    this.vy = -500;
    this.kvx = dir * (180 + Math.random() * 120);
    this.atkTimer = Math.min(this.atkTimer, 0.3 + Math.random() * 0.3);
    if (this.state === 'idle') { this.state = 'chase'; this.t = 0; }
    AR.Audio.sfx('jump');
    AR.Particles.burst(this.centerX(), this.y + this.h, 6,
      { color: '#cfd8d4', speed: 100, size: 2.5, life: 0.3, up: 40 });
  }

  // le bouclier casse-t-il ce projectile ? (frontal, hors attaque/étourdissement)
  blocksArrow(p) {
    if (this.dead) return false;
    if (this.def.behavior !== 'shield') return false;
    if (['attack', 'stunned', 'dash'].includes(this.state)) return false;
    return AR.U.sign(p.x - this.centerX() || 1) === this.facing;
  }

  // après un blocage : le porteur de bouclier avance sur le tireur
  onBlockArrow(game) {
    this.rageT = Math.max(this.rageT, 4);
    if (this.state === 'idle') { this.state = 'chase'; this.t = 0; }
    this.flash = 0.3;
  }

  // coup de mêlée : zone devant l'ennemi (range/knock : l'attaque active si multi-attaques)
  _strike(game) {
    this.attackPoseT = Math.max(this.attackPoseT, 0.24);
    const def = this.def;
    const pl = game.player;
    const atk = this.activeAtk;
    const range = (atk && atk.range != null) ? atk.range : def.range;
    const knock = (atk && atk.knock != null) ? atk.knock : def.knock;
    const r = {
      x: this.facing > 0 ? this.x + this.w * 0.4 : this.x - range,
      y: this.y - 8, w: range + this.w * 0.6, h: this.h + 16,
    };
    AR.Particles.slashArc(this.centerX() + this.facing * range * 0.5, this.centerY(),
      this.facing, def.behavior === 'brute', def.behavior === 'brute' ? '#ff7a5c' : '#ffce6a');
    if (def.behavior === 'brute') {
      game.camera.shake(4, 0.2);
      AR.Audio.sfx('slashHeavy');
    } else AR.Audio.sfx('slash2');
    if (!pl.dead && AR.U.rectsOverlap(r, pl.getRect())) {
      game.hitPlayer(this.dmg, this.centerX());
      if (knock) pl.knock(this.facing * knock);
    }
  }

  // coup de zone (kind:'aoe', ennemis multi-attaques) : dégâts autour de l'ennemi,
  // sans dépendre de son orientation (marteau au sol, rugissement...).
  _aoeStrike(game) {
    this.attackPoseT = Math.max(this.attackPoseT, 0.28);
    const pl = game.player;
    const atk = this.activeAtk || {};
    const radius = atk.radius || 140;
    game.camera.shake(atk.shake || 6, 0.25);
    AR.Particles.burst(this.centerX(), this.y + this.h, 16,
      { color: '#bbb094', speed: 220, size: 4, life: 0.5, spread: 1.6, up: 60 });
    AR.Audio.sfx('slashHeavy');
    const dd = AR.U.dist(this.centerX(), this.centerY(), pl.x + pl.w / 2, pl.y + pl.h / 2);
    if (!pl.dead && dd < radius + pl.w / 2) {
      game.hitPlayer(this.dmg, this.centerX());
      if (atk.knock) pl.knock(AR.U.sign(pl.x - this.centerX() || 1) * atk.knock);
    }
  }

  _fire(game) {
    this.attackPoseT = Math.max(this.attackPoseT, 0.24);
    const def = this.def;
    const pl = game.player;
    // projectile de l'attaque active si multi-attaques (ex. jet de pierres vs. rayon), sinon
    // def.proj comme avant.
    const proj = (this.activeAtk && this.activeAtk.proj) || def.proj;
    const sx = this.centerX() + this.facing * this.w * 0.4;
    const sy = this.y + this.h * 0.35;
    const txx = pl.x + pl.w / 2, tyy = pl.y + pl.h / 2;
    const ang = AR.U.angle(sx, sy, txx, tyy);
    // conscience du tir ami : ne pas arroser ses propres rangs (non pertinent pour un buff
    // de soutien sans dégâts — le tambour est justement voulu derrière ses alliés)
    const diff = game.diff || AR.DIFFICULTIES[0];
    if (proj !== 'warBuff' && Math.random() < diff.ffAware) {
      const splash = (proj === 'bomb' || proj === 'mortar');
      const friendlyRisk = splash
        ? game.enemies.some((e) => e !== this && !e.dead && e.active &&
            AR.U.dist(txx, tyy, e.centerX(), e.centerY()) < 110)
        : this._allyInLine(game, sx, sy, txx, tyy);
      if (friendlyRisk) {
        // on se replace au lieu de tirer dans le dos d'un allié
        this.atkTimer = 0.5;
        this.kvx = (Math.random() < 0.5 ? -1 : 1) * 200;
        if (this.onGround && Math.random() < 0.5) this.vy = -430;
        return;
      }
    }
    const shoot = (o) => { o.owner = this; return AR.Projectiles.spawn(o); };
    AR.Audio.sfx(proj === 'laser' ? 'laser' : proj === 'flame' ? 'flame' : 'enemyShoot');
    switch (proj) {
      case 'rock': {
        const t = 0.9;
        shoot({
          x: sx, y: sy, kind: 'rock', friendly: false, dmg: this.dmg, g: 900, r: 7,
          vx: (txx - sx) / t, vy: (tyy - sy) / t - 0.5 * 900 * t, life: 3,
        });
        break;
      }
      case 'arrow':
        shoot({
          x: sx, y: sy, kind: 'earrow', friendly: false, dmg: this.dmg, r: 6,
          vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, g: 60, life: 2.2,
        });
        break;
      case 'bullet':
        shoot({
          x: sx, y: sy, kind: 'bullet', friendly: false, dmg: this.dmg, r: 5,
          vx: Math.cos(ang) * 780, vy: Math.sin(ang) * 780, life: 1.6,
        });
        break;
      case 'plasma':
        shoot({
          x: sx, y: sy, kind: 'plasma', friendly: false, dmg: this.dmg, r: 7,
          vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, life: 1.8, color: '#e35cff',
        });
        break;
      case 'laser':
        shoot({
          x: sx, y: sy, kind: 'laser', friendly: false, dmg: this.dmg, r: 6,
          vx: Math.cos(ang) * 1500, vy: Math.sin(ang) * 1500, life: 0.9,
        });
        break;
      case 'flame':
        for (let i = 0; i < 8; i++) {
          const a = ang + (Math.random() - 0.5) * 0.35;
          shoot({
            x: sx, y: sy, kind: 'flame', friendly: false, dmg: this.dmg, r: 12,
            vx: Math.cos(a) * (260 + i * 30), vy: Math.sin(a) * (260 + i * 30),
            life: 0.5 + i * 0.03, g: -40,
          });
        }
        break;
      case 'bomb': {
        const t = 1.0;
        shoot({
          x: sx, y: sy, kind: 'bomb', friendly: false, dmg: this.dmg, g: 800, r: 7, explodeR: 62,
          vx: (txx - sx) / t, vy: (tyy - sy) / t - 0.5 * 800 * t, life: 3,
        });
        break;
      }
      case 'mortar': {
        const t = 1.35;
        const lx = txx + (Math.random() - 0.5) * 90;
        const gy = game.level.groundYAtEntity(lx, tyy);
        AR.Particles.telegraphCircle(lx, gy, 66, t, AR.C.COLORS.danger);
        shoot({
          x: sx, y: sy, kind: 'mortar', friendly: false, dmg: this.dmg, g: 1000, r: 8, explodeR: 66,
          vx: (lx - sx) / t, vy: (gy - sy) / t - 0.5 * 1000 * t, life: t + 0.1,
        });
        break;
      }
      case 'wisp':
        for (let i = 0; i < 2; i++) {
          shoot({
            x: sx + (i - 0.5) * 30, y: sy - 20, kind: 'wisp', friendly: false, dmg: this.dmg, r: 8,
            vx: Math.cos(ang + (i - 0.5)) * 220, vy: Math.sin(ang + (i - 0.5)) * 220 - 80,
            homing: 2.6, life: 4, color: this.id === 'war_shaman' ? '#7ee8c8' : '#c05cff',
          });
        }
        break;
      // Tambour de guerre : pas de projectile, buffe les alliés vivants à portée (dégâts +30%,
      // dégâts subis -30%, se rafraîchit tant qu'il reste en vie et à portée) — cf. takeDamage
      // (buffResist) et update (retour à baseDmg quand le buff expire).
      case 'warBuff': {
        const R = 260;
        let buffed = 0;
        for (const e of game.enemies) {
          if (e === this || e.dead || e.isBoss || !e.active) continue;
          if (AR.U.dist(this.centerX(), this.centerY(), e.centerX(), e.centerY()) > R) continue;
          if (e.buffT <= 0) e.dmg = Math.round(e.baseDmg * 1.3);
          e.buffResist = 0.3;
          e.buffT = 5;
          buffed++;
        }
        if (buffed) {
          AR.Particles.shockwave(this.centerX(), this.centerY(), R, '#ffce6a');
          AR.Particles.burst(this.centerX(), this.centerY(), 14, { color: '#ffce6a', speed: 160, size: 3, life: 0.5 });
        }
        AR.Audio.sfx('spell');
        break;
      }
    }
  }

  // Piratage (R6, cf. `hijack()`/état 'hijacked') : tire un projectile `friendly:true` sur
  // l'ennemi hostile le plus proche — un `friendly:true` est déjà, sans rien changer, ignoré
  // comme dangereux pour le joueur et capable de blesser les ennemis (mêmes règles que les
  // flèches du héros, cf. `projectiles.js`). Duplique volontairement 2 cas de `_fire()`
  // (`'plasma'`/`'laser'`, les seuls projectiles du roster piratable de R6) plutôt que de
  // généraliser `_fire()`, qui cible `game.player` en dur dans chaque branche.
  _fireHijacked(game) {
    const def = this.def;
    let target = null, best = Infinity;
    for (const e of game.enemies) {
      if (e === this || e.dead || !e.active || e.state === 'hijacked') continue;
      const dd = AR.U.dist(this.centerX(), this.centerY(), e.centerX(), e.centerY());
      if (dd < best) { best = dd; target = e; }
    }
    if (!target || best > (def.range || 600) * 1.2) return;
    this.attackPoseT = Math.max(this.attackPoseT, 0.24);
    this.facing = AR.U.sign(target.centerX() - this.centerX()) || this.facing;
    const sx = this.centerX() + this.facing * this.w * 0.4, sy = this.y + this.h * 0.35;
    const ang = AR.U.angle(sx, sy, target.centerX(), target.centerY());
    const shoot = (o) => { o.owner = this; return AR.Projectiles.spawn(o); };
    AR.Audio.sfx(def.proj === 'laser' ? 'laser' : 'enemyShoot');
    if (def.proj === 'laser') {
      shoot({ x: sx, y: sy, kind: 'laser', friendly: true, dmg: this.dmg, r: 6,
        vx: Math.cos(ang) * 1500, vy: Math.sin(ang) * 1500, life: 0.9 });
    } else {
      shoot({ x: sx, y: sy, kind: 'plasma', friendly: true, dmg: this.dmg, r: 7,
        vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, life: 1.8, color: '#42e8f5' });
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
    // résistance accordée par un allié (ex. tambour de guerre) : cf. constructeur/update
    if (this.buffResist > 0) dmg = Math.round(dmg * (1 - this.buffResist));
    this.hp -= dmg;
    this.flash = 1; this.hurtT = 3;
    if (opts.knockX && !this.isBoss && def.behavior !== 'charger') this.kvx = opts.knockX;
    if (this.hp <= 0) { this.die(game); return dmg; }

    // ---- riposte : un monstre attaqué traque son agresseur...
    this.rageT = 5;
    if (this.state === 'idle') { this.state = 'chase'; this.t = 0; }
    // ...et un tireur esquive d'un bond puis riposte à distance
    if (['ranged', 'caster', 'artillery'].includes(def.behavior) &&
        this.onGround && this.dodgeCd <= 0) {
      this._dodgeHop(opts.fromX !== undefined ? (AR.U.sign(this.centerX() - opts.fromX) || 1)
        : (Math.random() < 0.5 ? -1 : 1));
    }
    return dmg;
  }

  die(game, silent) {
    if (this.dead) return;
    this.dead = true; this.deadT = 0;
    AR.EventLog.push('enemy', { event: 'death', id: this.spriteId || this.id, x: Math.round(this.x), y: Math.round(this.y) });
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

  _visualState() {
    if (this.dead) return 'neutral';
    if (this.state === 'tele' || this.state === 'tpWindup') return 'windup';
    if (this.state === 'beam') return this.beam && this.beam.active ? 'attack' : 'windup';
    if (this.attackPoseT > 0 || ['attack', 'charge', 'dive', 'stomp'].includes(this.state)) return 'attack';
    return 'neutral';
  }

  // Terre qui tremble et se craquelle avant qu'un ennemi d'embuscade ne sorte du
  // sol (armEmergence). Le total dure ~1.7s ; l'intensité (tremblement, poussière)
  // augmente à mesure qu'on approche de la sortie, pour bien signaler l'imminence.
  // Les ennemis volants/flottants (suspendus dans les airs) n'ont pas de sol
  // sous eux : un frémissement lumineux remplace la craquelure au sol.
  _drawEmergence(ctx, fx, fy, time) {
    const total = this._emergeTotal || 1.7, prog = 1 - AR.U.clamp(this.emergeT / total, 0, 1);
    if (this.def.behavior === 'flyer' || this.def.float) {
      const scy = fy - this.h / 2;
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(time * 14) * 0.15 + prog * 0.3;
      ctx.fillStyle = '#cfd8d4';
      ctx.beginPath(); ctx.ellipse(fx, scy, this.w * 0.4 * (0.7 + prog * 0.4), this.h * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    // taupinière : un monticule de terre remuée grossit progressivement autour
    // d'un trou sombre, avec des fissures et des jets de terre (cf. update()) qui
    // suggèrent qu'un monstre creuse activement pour sortir — pas juste une ombre.
    const shake = (Math.random() - 0.5) * 4 * prog;
    const mw = this.w * (0.58 + prog * 0.32);
    const mh = 5 + prog * 12;
    if (this.suspended) {
      // plafond : symétrique vertical de la taupinière, ancré en haut du sprite (le
      // point d'accroche) — la roche se fissure et un amas de terre grossit VERS LE
      // BAS, prêt à se détacher, au lieu de jaillir du sol.
      const topY = fy - this.h;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#4a3a24';
      ctx.beginPath(); ctx.ellipse(fx + shake, topY - mh * 0.28, mw, mh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6b5433';
      ctx.beginPath(); ctx.ellipse(fx + shake, topY - mh * 0.55, mw * 0.72, mh * 0.65, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(15,10,5,0.85)';
      ctx.beginPath(); ctx.ellipse(fx + shake, topY - mh * 0.6, mw * 0.32, mh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5 + prog * 0.35;
      ctx.strokeStyle = 'rgba(90,70,45,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx - mw * 0.95, topY); ctx.lineTo(fx - mw * 0.32, topY - mh * 0.4);
      ctx.moveTo(fx + mw * 0.95, topY); ctx.lineTo(fx + mw * 0.38, topY - mh * 0.3);
      ctx.moveTo(fx - mw * 0.5, topY - 2); ctx.lineTo(fx - mw * 0.15, topY - mh * 0.2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#4a3a24';
    ctx.beginPath(); ctx.ellipse(fx + shake, fy - mh * 0.28, mw, mh, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6b5433';
    ctx.beginPath(); ctx.ellipse(fx + shake, fy - mh * 0.55, mw * 0.72, mh * 0.65, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(15,10,5,0.85)';
    ctx.beginPath(); ctx.ellipse(fx + shake, fy - mh * 0.6, mw * 0.32, mh * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5 + prog * 0.35;
    ctx.strokeStyle = 'rgba(90,70,45,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx - mw * 0.95, fy); ctx.lineTo(fx - mw * 0.32, fy - mh * 0.4);
    ctx.moveTo(fx + mw * 0.95, fy); ctx.lineTo(fx + mw * 0.38, fy - mh * 0.3);
    ctx.moveTo(fx - mw * 0.5, fy + 2); ctx.lineTo(fx - mw * 0.15, fy - mh * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  _spriteKey(visualState) {
    // ennemis multi-attaques : pendant windup/attack, sprite dédié à l'attaque active
    // ('..._atk2_windup' etc.) ; neutre et repli sinon inchangés.
    if (visualState !== 'neutral' && this.activeAtk && this.activeAtk.key) {
      const atkKey = 'enemies/states/' + this.spriteId + '_' + this.activeAtk.key + '_' + visualState;
      if (AR.SPRITE_META[atkKey]) return atkKey;
    }
    const stateKey = 'enemies/states/' + this.spriteId + '_' + visualState;
    return AR.SPRITE_META[stateKey] ? stateKey : 'enemies/' + this.spriteId;
  }

  draw(ctx, cam, time) {
    // dormant (embuscade pas encore déclenchée) : encore terré/caché, rien à afficher
    // tant que le trigger ne l'a pas réveillé et lancé dans son animation d'émergence.
    if (this.dormant) return;
    const cx = cam.cx(), cy = cam.cy();
    const fx = this.centerX() - cx;
    const fy = this.y + this.h - cy;
    if (fx < -180 || fx > AR.C.VIEW_W + 180) return;
    if (this.emergeT > 0) { this._drawEmergence(ctx, fx, fy, time); return; }
    const visualState = this._visualState();
    const key = this._spriteKey(visualState);
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
    // halo cyan de piratage (R6) : signale qu'un drone a changé de camp (cf. `hijack()`)
    if (this.hijackedT > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(time * 8) * 0.25;
      ctx.strokeStyle = '#42e8f5'; ctx.lineWidth = 2;
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

    // Les triplets d'états sont tous orientés vers la droite. Les anciens sprites
    // de repli conservent leur orientation déclarée dans les données.
    const spriteFacesLeft = key.startsWith('enemies/states/') ? false : this.def.facing === 'l';
    const flip = spriteFacesLeft ? this.facing > 0 : this.facing < 0;
    const bob = (this.def.float || this.def.behavior === 'flyer') ? Math.sin(time * 3 + this.bobPhase) * 5 : 0;
    let tint;
    if (this.flash > 0.4) tint = 'brightness(2.6)';
    else if (visualState === 'windup') tint = (Math.sin(time * 26) > 0) ? 'brightness(1.6) saturate(1.6)' : undefined;
    AR.Assets.draw(ctx, key, fx, fy + bob, this.drawH, flip, alpha, tint);

    // étourdi (chargeur contre un mur, ou touché par kunai/Frappe éclair, cf. Enemy#stun) :
    // petites étoiles qui tournent au-dessus de la tête, en plus de la pose neutre déjà choisie
    // par `_visualState()` pour cet état — signale clairement que le contact est sans danger.
    if (this.state === 'stunned') {
      ctx.save();
      const scx = fx, scy = fy - this.h - 8;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = AR.C.COLORS.gold;
      for (let s = 0; s < 3; s++) {
        const a = time * 5 + s * (Math.PI * 2 / 3);
        ctx.fillText('★', scx + Math.cos(a) * 15, scy + Math.sin(a) * 5);
      }
      ctx.restore();
    }

    // télégraphe de téléportation : trait d'énergie vers la zone cible
    if (this.state === 'tpWindup' && this.tpTarget) {
      const prog = AR.U.clamp(this.t / 0.55, 0, 1);
      const txp = this.tpTarget.x - cx, typ = this.tpTarget.y - cy - 20;
      ctx.save();
      ctx.globalAlpha = 0.35 + prog * 0.55;
      ctx.strokeStyle = '#c05cff';
      ctx.shadowColor = '#c05cff'; ctx.shadowBlur = 10;
      ctx.setLineDash([10, 8]);
      ctx.lineDashOffset = -time * 60;
      ctx.lineWidth = 2 + prog * 2.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy - this.h / 2);
      ctx.lineTo(txp, typ);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(txp, typ, 6 + prog * 16, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

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
// Durée du télégraphe par pattern (remplace le 0,7 s uniforme historique) : un
// combat de boss doit laisser le temps de reconnaître l'attaque en cours et d'y
// réagir, pas seulement de la subir (retour joueur : charge/saut/anneau trop
// rapides, aucune fenêtre réelle pour esquiver).
const BOSS_TELE_DURATIONS = {
  charge: 1.3, sweep: 1.3, stomp: 1.2, arrowRing: 1.6,
  shadowStrike: 0.9, turretSweep: 0.85, overloadPulse: 0.9,
};
AR.Boss = class extends AR.Enemy {
  constructor(id, x, footY, game) {
    // les boss utilisent leur propre table
    const bdef = AR.BOSSES[id];
    // squelette Enemy avec des stats surchargées
    super(game.level.era.enemies[0], x, footY, false, 1);
    this.id = id;
    this.spriteId = id;
    this.bdef = bdef;
    this.isBoss = true;
    this.name = bdef.name;
    const diff = game.diff || AR.DIFFICULTIES[0];
    const ng = (1 + game.ngPlus * 0.5) * diff.hpMult;
    this.maxHp = Math.round(bdef.hp * ng);
    this.hp = this.maxHp;
    // les dégâts de la difficulté passent par game.mods.enemyDmg (pas ici, sinon double compte)
    this.dmg = Math.round(bdef.dmg * Math.sqrt(1 + game.ngPlus * 0.5));
    this.drawH = bdef.h;
    this.h = this.drawH * 0.8;
    const neutralKey = 'enemies/states/' + id + '_neutral';
    const dw = AR.Assets.drawnW(AR.SPRITE_META[neutralKey] ? neutralKey : 'enemies/' + id, this.drawH);
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
    this.platformLeapCd = 0;
  }

  update(dt, game) {
    if (this.dead) { this.deadT += dt; return; }
    if (game.veilT > 0) dt *= 0.55;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt * 6);
    this.attackPoseT = Math.max(0, this.attackPoseT - dt);
    this.platformLeapCd = Math.max(0, this.platformLeapCd - dt);
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
    // pendant la frappe de `shadowStrike`, le Yōkai plonge à hauteur du héros
    // au lieu de rester à son altitude de vol habituelle (sinon la "frappe au
    // corps à corps" resterait hors de portée verticale, cf. hauteur de vol)
    const diving = this.state === 'shadowStrike' && this.shadowStage === 'strike';
    if (floats && !diving) {
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
        if (bdef.platformChase && this.onGround && this.platformLeapCd <= 0) {
          const support = this._playerSupport(game);
          if (support && !support.ground && support.y < this.y + this.h - 45) {
            this._startPlatformLeap(game, support);
            break;
          }
        }
        if (this.t > 1.4) {
          this.t = 0;
          this.pattern = this.patterns[this.patIdx % this.patterns.length];
          this.patIdx++;
          this.state = 'tele';
          this.teleDuration = BOSS_TELE_DURATIONS[this.pattern] || 0.7;
          this._armTelegraph(game);
          AR.Audio.sfx('telegraph');
          AR.EventLog.push('boss', { event: 'pattern', id: this.id, pattern: this.pattern, phase: this.phase });
        }
        break;
      }
      case 'tele':
        this.vx = 0;
        if (this.t >= this.teleDuration) { this.t = 0; this._execPattern(game); }
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
          if (this.stompVy >= 0 && this.y + this.h >= this.stompLandingY) {
            this.y = this.stompLandingY - this.h;
            this.x = AR.U.clamp(this.x, game.arena.x0 + 10, game.arena.x1 - this.w - 10);
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
      case 'platformLeap':
        this.facing = AR.U.sign(this.vx || this.facing);
        if (!pl.dead && !this.leapHitDone && AR.U.rectsOverlap(this.getRect(), pl.getRect())) {
          this.leapHitDone = true;
          game.hitPlayer(Math.round(this.dmg * 0.65), this.centerX());
          pl.knock(this.facing * 300);
        }
        if (this.t > 1.6) { this.state = 'move'; this.t = 0; this.platformLeapCd = 1.8; }
        break;
      case 'arrowRing':
        this.vx = 0;
        this.ringShotT -= dt;
        if (this.ringBurstsLeft > 0 && this.ringShotT <= 0) {
          this._spawnArrowRing(game);
          this.ringBurstsLeft--;
          this.ringShotT = 0.3;
        }
        if (this.ringBurstsLeft <= 0 && this.t > (this.phase === 2 ? 1.15 : 0.85)) {
          this.state = 'move'; this.t = 0;
        }
        break;
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
      case 'shadowStrike': {
        if (this.shadowStage === 'teleport') {
          if (this.t > 0.15) {
            const side = Math.random() < 0.5 ? -1 : 1;
            this.x = AR.U.clamp(pl.x + side * 70, game.arena.x0 + 40, game.arena.x1 - 40 - this.w);
            this.y = pl.y + pl.h / 2 - this.h / 2; // plonge à hauteur du héros pour la frappe
            this.facing = AR.U.sign(pl.x - this.x || 1);
            AR.Particles.burst(this.centerX(), this.centerY(), 18, { color: '#c05cff', speed: 200, size: 4, life: 0.4 });
            AR.Audio.sfx('spell');
            this.shadowStage = 'strike';
            this.t = 0;
          }
        } else if (this.shadowStage === 'strike') {
          if (this.t > 0.28 && !this.shadowHit) {
            this.shadowHit = true;
            AR.Audio.sfx('slashHeavy');
            game.camera.shake(6, 0.25);
            AR.Particles.slashArc(this.centerX(), this.centerY(), this.facing, true, '#c05cff');
            if (!pl.dead && AR.U.dist(this.centerX(), this.centerY(), pl.x + pl.w / 2, pl.y + pl.h / 2) < 110) {
              game.hitPlayer(Math.round(this.dmg * 0.9), this.centerX());
              pl.knock(AR.U.sign(pl.x + pl.w / 2 - this.centerX()) * 320);
            }
          }
          if (this.t > 0.55) { this.state = 'move'; this.t = 0; this.shadowStage = null; }
        }
        break;
      }
      case 'turretSweep': {
        this.vx = 0;
        const DURATION = 1.4;
        this.sweepT += dt;
        this.sweepShotT -= dt;
        if (this.sweepShotT <= 0 && this.sweepT < DURATION) {
          this.sweepShotT = 0.09;
          const T = this.sweepT / DURATION;
          const targetX = AR.U.lerp(game.arena.x0 + 40, game.arena.x1 - 40, this.sweepDir > 0 ? T : 1 - T);
          const groundY = game.level.groundYAtEntity(targetX, this.y);
          const sx = this.centerX(), sy = this.y + this.h * 0.3;
          const ang = AR.U.angle(sx, sy, targetX, groundY - 10);
          AR.Projectiles.spawn({ owner: this,
            x: sx, y: sy, kind: 'bullet', friendly: false,
            dmg: Math.round(this.dmg * 0.4), r: 6,
            vx: Math.cos(ang) * 760, vy: Math.sin(ang) * 760, life: 1.0,
          });
          AR.Audio.sfx('enemyShoot');
        }
        if (this.sweepT >= DURATION + 0.15) { this.state = 'move'; this.t = 0; }
        break;
      }
      case 'overloadPulse': {
        this.vx = 0;
        this.pulseT += dt;
        if (this.pulseT > 0.7) {
          const tgt = this.pulseTarget || { x: pl.x + pl.w / 2, y: pl.y + pl.h / 2 };
          AR.Particles.shockwave(tgt.x, tgt.y, 100, '#e35cff');
          AR.Particles.burst(tgt.x, tgt.y, 22, { color: ['#e35cff', '#fff'], speed: 300, size: 5, life: 0.5 });
          AR.Audio.sfx('boom');
          game.camera.shake(6, 0.3);
          if (!pl.dead) {
            const d = AR.U.dist(tgt.x, tgt.y, pl.x + pl.w / 2, pl.y + pl.h / 2);
            if (d < 130) {
              game.hitPlayer(Math.round(this.dmg * 1.1), tgt.x);
              pl.knock(AR.U.sign(pl.x + pl.w / 2 - tgt.x || 1) * 300);
            }
          }
          this.state = 'move'; this.t = 0;
        }
        break;
      }
    }

    // physique au sol pour les boss terrestres
    if (!floats && this.state !== 'stomp') {
      this.vy = (this.vy || 0) + AR.C.GRAV * dt;
      const res = game.level.moveRect(this, (this.vx || 0) * dt, this.vy * dt, !bdef.platformChase);
      this.onGround = res.onGround;
      if (res.onGround) {
        this.vy = 0;
        if (this.state === 'platformLeap' && this.t > 0.12) {
          this.state = 'move'; this.t = 0; this.platformLeapCd = 1.8;
          game.camera.shake(5, 0.2);
        }
      }
      if (res.hitWall && this.state === 'charge') {
        this.state = 'move'; this.t = 0;
        game.camera.shake(7, 0.3); AR.Audio.sfx('boom');
      }
      // bornes de l'arène
      this.x = AR.U.clamp(this.x, game.arena.x0 + 10, game.arena.x1 - this.w - 10);
    } else if (floats) {
      this.x = AR.U.clamp(this.x + (this.vx || 0) * dt, game.arena.x0 + 10, game.arena.x1 - this.w - 10);
    }

    // Pas de dégâts de simple contact : un boss ne doit blesser que via une
    // attaque identifiée (charge/sweep, atterrissage du stomp, platformLeap,
    // projectiles, beam). Se tenir près de lui pendant 'move'/'tele' (le temps
    // de lecture du télégraphe) ou pendant 'arrowRing'/'blink' est sans danger ;
    // chaque état ci-dessus gère déjà ses propres dégâts de contact le cas échéant.
  }

  // Appelé une fois au tout début du télégraphe (état 'tele') : verrouille la
  // cible du saut (stomp) sur la position actuelle du joueur et déclenche les
  // indices visuels propres à chaque pattern, pour laisser un vrai temps de
  // lecture avant l'exécution (cf. retour joueur : lisibilité des attaques).
  _armTelegraph(game) {
    const pl = game.player;
    this.stompTarget = null;
    if (this.pattern === 'stomp') {
      const support = this._playerSupport(game);
      const landingY = support ? support.y : this.baseY;
      const targetX = support
        ? AR.U.clamp(pl.x + pl.w / 2 - this.w / 2, support.x, support.x + support.w - this.w)
        : pl.x;
      this.stompTarget = { x: targetX, y: landingY };
      AR.Particles.arrowDown(targetX + this.w / 2, landingY, this.teleDuration, AR.C.COLORS.danger);
      AR.Particles.telegraphCircle(targetX + this.w / 2, landingY, 70, this.teleDuration, AR.C.COLORS.danger);
    } else if (this.pattern === 'arrowRing') {
      AR.Particles.convergingRing(this.centerX(), this.centerY(), 210, this.phase === 2 ? 20 : 14,
        this.teleDuration, AR.C.COLORS.impact);
    } else if (this.pattern === 'overloadPulse') {
      // Pas de verrouillage ici (contrairement à stomp) : la retraite générique
      // à 200px pendant tout état 'tele' (cf. demoai.js) viderait sinon
      // systématiquement la zone avant même que la cible soit fixée, rendant
      // l'attaque inoffensive à tous les coups. La position n'est verrouillée
      // qu'à la fin du télégraphe, dans `_execPattern` — la lecture visuelle
      // (bruit d'alerte + pose) reste pendant tout `tele`, seul le point exact
      // se décide au dernier moment.
    }
  }

  _execPattern(game) {
    const pl = game.player;
    const pat = this.pattern;
    if (pat.startsWith('summon:')) {
      this.attackPoseT = Math.max(this.attackPoseT, 0.32);
      const what = pat.split(':')[1];
      if (what === 'wisp3') {
        for (let i = 0; i < 3; i++) {
          AR.Projectiles.spawn({ owner: this,
            x: this.centerX() + (i - 1) * 40, y: this.y + 20, kind: 'wisp', friendly: false,
            dmg: Math.round(this.dmg * 0.5), r: 8, vx: (i - 1) * 160, vy: -160, homing: 2.8, life: 5, color: '#c05cff',
          });
        }
      } else if (what === 'warband') {
        // Chef Mammouth : formation dédiée plutôt que 2 copies du même sbire — 2 porteurs de
        // bouclier en flanc-garde (encaissent/bloquent au front) + 1 joueur de tambour planqué
        // du côté opposé au joueur (buffe les alliés tant qu'il est en vie, cible prioritaire).
        // Ne ré-invoque qu'une fois l'ancienne formation totalement éliminée — sinon le
        // recyclage du pattern (1.4s + récupération) empile les groupes les uns sur les autres
        // dès qu'un seul survivant fait passer le compte total sous le seuil générique.
        const warbandAlive = game.enemies.some((e) => !e.dead &&
          (e.id === 'bone_shield_bearer' || e.id === 'war_drummer'));
        if (!warbandAlive) {
          const scale = AR.ERA_SCALE[game.eraIdx] * 0.8 * (game.diff ? game.diff.hpMult : 1);
          const backDir = -(AR.U.sign(pl.x - this.centerX()) || this.facing || 1);
          const spots = [
            { id: 'bone_shield_bearer', dx: -140 },
            { id: 'bone_shield_bearer', dx: 140 },
            { id: 'war_drummer', dx: backDir * 70 },
          ];
          for (const s of spots) {
            const mx = this.centerX() + s.dx;
            const m = new AR.Enemy(s.id, mx, game.level.groundYAtEntity(mx, this.y), false, scale);
            m.active = true;
            game.enemies.push(m);
            AR.Particles.burst(mx, m.y + m.h / 2, 12, { color: AR.C.COLORS.magic, speed: 180, size: 4, life: 0.5 });
          }
        }
      } else if (what === 'core_shard' && game.enemies.filter((e) => !e.dead && !e.isBoss).length < 4) {
        // IA suprême : 3 éclats au lieu de 2 (audit winrate du 2026-07-27 : l'IA
        // gagnait 10/10 en kitant en permanence à distance, ce qui esquive
        // n'importe quelle attaque visant une position unique — un troisième
        // tireur à distance ajoute une pression constante qui ne dépend pas
        // d'un seul projectile évitable).
        for (const dx of [-160, 0, 160]) {
          const mx = this.centerX() + dx;
          const m = new AR.Enemy(what, mx, game.level.groundYAtEntity(mx, this.y), false, AR.ERA_SCALE[game.eraIdx] * 0.8 * (game.diff ? game.diff.hpMult : 1));
          m.active = true;
          game.enemies.push(m);
          AR.Particles.burst(mx, m.y + m.h / 2, 12, { color: AR.C.COLORS.magic, speed: 180, size: 4, life: 0.5 });
        }
      } else if (game.enemies.filter((e) => !e.dead && !e.isBoss).length < 4) {
        for (let i = 0; i < 2; i++) {
          const mx = this.centerX() + (i === 0 ? -140 : 140);
          const m = new AR.Enemy(what, mx, game.level.groundYAtEntity(mx, this.y), false, AR.ERA_SCALE[game.eraIdx] * 0.8 * (game.diff ? game.diff.hpMult : 1));
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
      case 'stomp': {
        this.state = 'stomp';
        this.stompLanded = false;
        // Cible verrouillée dès le télégraphe (_armTelegraph) : bouger pendant la
        // grosse flèche doit suffire à esquiver, la frappe ne doit pas re-viser
        // la position actuelle du joueur au moment du saut.
        const target = this.stompTarget || { x: pl.x, y: this.baseY };
        const flightT = 0.72;
        this.stompLandingY = target.y;
        this.stompVx = (target.x - this.x) / flightT;
        this.stompVy = (target.y - (this.y + this.h) - 0.5 * 2400 * flightT * flightT) / flightT;
        break;
      }
      case 'arrowRing':
        this.state = 'arrowRing';
        this.ringBurstsLeft = this.phase === 2 ? 3 : 2;
        this.ringShotT = 0;
        this.ringBurstIndex = 0;
        this.ringRotation = Math.random() * Math.PI * 2;
        this.attackPoseT = 1;
        break;
      case 'rocks': case 'javelins': case 'fireballs': case 'volley': case 'flames': {
        this.attackPoseT = Math.max(this.attackPoseT, 0.32);
        const kind = { rocks: 'rock', javelins: 'javelin', fireballs: 'fireball', volley: 'bullet', flames: 'flame' }[pat];
        const n = pat === 'flames' ? 10 : (this.phase === 2 ? 6 : 4);
        const sx = this.centerX(), sy = this.y + this.h * 0.3;
        const g = (kind === 'rock' || kind === 'javelin') ? 500 : kind === 'flame' ? -40 : 0;
        // rock/javelin subissent une vraie gravité (parabole) : viser un simple
        // angle+vitesse fixe comme les autres tirs les fait retomber court, avant
        // le héros (bug remonté : "les flèches tombent"). On résout la balistique
        // pour un temps de vol donné afin que chaque projectile retombe bien sur
        // sa cible (l'éventail décale le point de chute, pas l'angle de tir).
        const ballistic = g > 0;
        const flightT = 0.85;
        for (let i = 0; i < n; i++) {
          let vx, vy;
          if (ballistic) {
            const tx = pl.x + pl.w / 2 + (i - (n - 1) / 2) * 70, ty = pl.y + pl.h * 0.5;
            vx = (tx - sx) / flightT;
            vy = (ty - sy - 0.5 * g * flightT * flightT) / flightT;
          } else {
            const ang = AR.U.angle(sx, sy, pl.x + pl.w / 2, pl.y + pl.h / 2) + (i - (n - 1) / 2) * 0.16;
            const sp = kind === 'bullet' ? 700 : kind === 'flame' ? 300 + i * 20 : 460;
            vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp;
          }
          AR.Projectiles.spawn({ owner: this,
            x: sx, y: sy, kind, friendly: false, dmg: Math.round(this.dmg * 0.6),
            r: kind === 'flame' ? 12 : 7,
            vx, vy, g,
            life: kind === 'flame' ? 0.7 : 2.5,
          });
        }
        AR.Audio.sfx(pat === 'flames' ? 'flame' : 'enemyShoot');
        this.state = 'move'; this.t = 0;
        break;
      }
      case 'ring': {
        this.attackPoseT = Math.max(this.attackPoseT, 0.32);
        const n = this.phase === 2 ? 14 : 10;
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + this.t;
          AR.Projectiles.spawn({ owner: this,
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
        this.attackPoseT = Math.max(this.attackPoseT, 0.32);
        const n = this.phase === 2 ? 5 : 3;
        for (let i = 0; i < n; i++) {
          const lx = pl.x + (Math.random() - 0.5) * 340;
          const gy = game.level.groundYAtEntity(lx, pl.y);
          const t = 1.1 + i * 0.22;
          AR.Particles.telegraphCircle(lx, gy, 70, t, AR.C.COLORS.danger);
          AR.Projectiles.spawn({ owner: this,
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
      case 'shadowStrike':
        // Signature du Yōkai : contrairement à `blink` (repositionnement seul,
        // sans dégât), ici le téléport est immédiatement suivi d'une frappe au
        // corps à corps — punit qui ignore le télégraphe au lieu de laisser le
        // temps de riposter à distance (retour joueur : ce boss doit avoir sa
        // propre identité, pas juste téléport + boules d'énergie).
        this.state = 'shadowStrike';
        this.shadowStage = 'teleport';
        this.shadowHit = false;
        this.t = 0;
        break;
      case 'turretSweep':
        // Signature de l'ingénieur de guerre : balayage de tirs au sol sur
        // toute la largeur de l'arène — se réfugier sur un piédestal surélevé
        // (cf. `left_upper`/`right_upper`/paliers bas) l'esquive complètement,
        // récompensant l'usage de la verticalité de l'arène plutôt que de
        // camper au sol.
        this.state = 'turretSweep';
        this.sweepT = 0;
        this.sweepShotT = 0;
        this.sweepDir = this.centerX() < (game.arena.x0 + game.arena.x1) / 2 ? 1 : -1;
        AR.Audio.sfx('bossRoar');
        break;
      case 'mineField': {
        // Ingénieur de guerre : mines statiques dispersées sur toute la largeur
        // du sol de l'arène (contrairement aux mortiers, qui ciblent la zone du
        // héros) — oblige à rester conscient de tout le terrain, pas seulement
        // à esquiver latéralement pendant turretSweep.
        this.attackPoseT = Math.max(this.attackPoseT, 0.32);
        const n = this.phase === 2 ? 6 : 4;
        for (let i = 0; i < n; i++) {
          const lx = game.arena.x0 + 70 + Math.random() * (game.arena.x1 - game.arena.x0 - 140);
          const gy = game.level.groundYAtEntity(lx, this.baseY);
          const t = 1.3 + Math.random() * 0.5;
          AR.Particles.telegraphCircle(lx, gy - 4, 60, t, AR.C.COLORS.danger);
          AR.Projectiles.spawn({ owner: this,
            x: lx, y: gy - 4, kind: 'mortar', friendly: false,
            dmg: Math.round(this.dmg * 0.65), r: 8, explodeR: 60,
            vx: 0, vy: 0, g: 0, life: t,
          });
        }
        AR.Audio.sfx('enemyShoot');
        this.state = 'move'; this.t = 0;
        break;
      }
      case 'overloadPulse': {
        // IA suprême : verrouille la position du héros à la FIN du télégraphe
        // (pas au début, contrairement à stomp) puis fait détoner une sphère à
        // forte puissance après un court temps de résolution — contrairement à
        // beam/ring (zone étendue mais dégâts dilués), punit directement qui
        // reste immobile ou colle le boss. Verrouiller dès `_armTelegraph`
        // serait sans effet : la retraite générique à 200px pendant tout état
        // 'tele' (cf. demoai.js) viderait systématiquement la zone avant même
        // l'exécution. État dédié (comme `stomp`/`shadowStrike`) plutôt qu'un
        // projectile : un projectile stationnaire créé pile sur la position du
        // joueur serait touché dès la frame suivante, sans fenêtre d'esquive.
        this.attackPoseT = Math.max(this.attackPoseT, 0.32);
        const tx = pl.x + pl.w / 2, ty = pl.y + pl.h / 2;
        this.pulseTarget = { x: tx, y: ty };
        AR.Particles.telegraphCircle(tx, ty, 100, 0.7, '#e35cff');
        this.state = 'overloadPulse';
        this.pulseT = 0;
        AR.Audio.sfx('spell');
        break;
      }
      default:
        this.state = 'move'; this.t = 0;
    }
  }

  _playerSupport(game) {
    const pl = game.player;
    const footX = pl.x + pl.w / 2, footY = pl.y + pl.h;
    const arena = game.level.bossArena;
    if (arena && arena.active) {
      let best = null, bestD = Infinity;
      for (const p of arena.platforms) {
        if (p.w < this.w + 14 || footX < p.x || footX > p.x + p.w) continue;
        const d = Math.abs(footY - p.y);
        if (d < 24 && d < bestD) { best = p; bestD = d; }
      }
      if (best) return best;
      return arena.ground;
    }
    const y = game.level.groundYpx(footX);
    return { x: game.arena.x0, y, w: game.arena.x1 - game.arena.x0, ground: true };
  }

  _startPlatformLeap(game, support) {
    const pl = game.player;
    const flightT = 0.78;
    const targetX = AR.U.clamp(pl.x + pl.w / 2 - this.w / 2,
      support.x, support.x + support.w - this.w);
    this.state = 'platformLeap';
    this.t = 0;
    this.onGround = false;
    this.leapHitDone = false;
    this.vx = (targetX - this.x) / flightT;
    this.vy = (support.y - (this.y + this.h) - 0.5 * AR.C.GRAV * flightT * flightT) / flightT;
    this.attackPoseT = 0.5;
    AR.Audio.sfx('bossRoar');
  }

  _spawnArrowRing(game) {
    const n = this.phase === 2 ? 16 : 12;
    const burst = this.ringBurstIndex++;
    const speed = (this.phase === 2 ? 350 : 300) + burst * 28;
    const rotation = this.ringRotation + burst * Math.PI / n;
    const sx = this.centerX(), sy = this.centerY();
    for (let i = 0; i < n; i++) {
      const ang = rotation + (i / n) * Math.PI * 2;
      AR.Projectiles.spawn({ owner: this,
        x: sx + Math.cos(ang) * 42, y: sy + Math.sin(ang) * 42,
        kind: 'earrow', friendly: false, dmg: Math.round(this.dmg * 0.55), r: 6,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 3.2,
        color: 'hsl(' + Math.round(i / n * 360 + burst * 18) + ' 80% 68%)',
      });
    }
    AR.Particles.shockwave(sx, sy, 90 + burst * 18, AR.C.COLORS.impact);
    AR.Audio.sfx('enemyShoot');
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
    AR.EventLog.push('boss', { event: 'death', id: this.id });
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
