// Arcane Rift - le héros shinobi : déplacements, sabre, arc, sorts, statistiques
window.AR = window.AR || {};

AR.Player = class {
  constructor(x, footY) {
    const P = AR.C.PLAYER;
    this.w = P.W; this.h = P.H;
    this.x = x; this.y = footY - this.h;
    this.vx = 0; this.vy = 0; this.kvx = 0;
    this.facing = 1;
    this.onGround = false;
    this.coyote = 0; this.jumpBuffer = 0;
    this.jumpsUsed = 0;
    this.dashing = false; this.dashT = 0; this.dashCd = 0; this.dashCharges = 1;
    this.airDashed = false;
    this.climbing = false; this.climbCooldown = 0; this.climbLockout = 0; this._prevSpace = false;
    this.riding = null; // chariot sur rail (R5) : {speed, endX} — cf. update(), trigger 'startRail'
    this.launchCd = 0; // pad de saut anti-gravité (R6) : anti-rebond, cf. update()/launchPadAt
    this.launchDriftT = 0; this.launchDriftVx = 0; // même mécanique, dérive horizontale forcée
    this.dropThrough = 0;
    this.dashHeld = 0;
    this.trail = [];
    this._clock = 0;
    this._tapLeftT = -10; this._tapRightT = -10; this._tapDownT = -10;

    this.dead = false;
    this.invulnT = 0;
    this.flash = 0;

    // progression
    this.level = 1; this.xp = 0; this.skillPoints = 0;
    this.skills = new Set();
    this.buffs = { crit: 0, speed: 0, hpUp: 0, spiritUp: 0 };
    this.swordTier = 0; this.bowTier = 0;
    this.potions = 1;
    this.spellCds = AR.SPELLS.map(() => 0);
    this.levitating = false;

    // combat
    this.swordHold = -1;    // -1 = relâché
    this.bowHold = -1;
    this.comboIdx = 0; this.comboT = 0;
    this.attackAnimT = 0; this.attackAnim = '';
    this.swordCd = 0; this.bowCd = 0;
    this.chargeReadyPing = false;

    this.walkT = 0;
    this.lastSafe = { x, y: footY };
    this.stats = {};
    this.hpRatio = 1;
    this.recalcStats({ mods: {} });
    this.hp = this.stats.maxHp;
    this.spirit = 60;
  }

  // ---- statistiques dérivées (compétences + objets + failles + armes)
  recalcStats(game) {
    const P = AR.C.PLAYER, S = this.skills, m = game.mods || {};
    const prevMax = this.stats.maxHp;
    const levelMult = Math.pow(1 + P.LEVEL_STAT_GROWTH, Math.max(0, this.level - 1));
    this.stats = {
      levelMult,
      maxHp: Math.round((P.HP + (S.has('body1') ? 30 : 0) + this.buffs.hpUp * 25) * (m.hpMult || 1) * levelMult),
      maxSpirit: Math.round((P.SPIRIT + (S.has('spirit2') ? 50 : 0) + this.buffs.spiritUp * 30 + (m.spiritBonus || 0)) * levelMult),
      spiritRegen: P.SPIRIT_REGEN * (S.has('spirit2') ? 2 : 1) * levelMult,
      swordDmg: P.SWORD_DMG * AR.WEAPONS.sword[this.swordTier].mult * (S.has('blade1') ? 1.25 : 1) * (m.dmgMult || 1) * levelMult,
      bowDmg: P.BOW_DMG * AR.WEAPONS.bow[this.bowTier].mult * (S.has('bow1') ? 1.25 : 1) * (m.dmgMult || 1) * levelMult,
      swordChargeTime: P.SWORD_CHARGE_TIME * (S.has('blade3') ? 0.65 : 1) * (m.chargeMult || 1),
      bowChargeTime: P.BOW_CHARGE_TIME * (S.has('bow2') ? 0.65 : 1) * (m.chargeMult || 1),
      swordCooldown: P.SWORD_CD,
      bowCooldown: P.BOW_CD,
      speed: (S.has('body3') ? 1.15 : 1) * (1 + this.buffs.speed * 0.10) * levelMult,
      crit: P.CRIT + this.buffs.crit * 0.10,
      armor: S.has('body4') ? 0.8 : 1,
      potionMax: P.POTION_MAX + (S.has('body3') ? 1 : 0),
      dashCd: P.DASH_CD * (S.has('body2') ? 0.6 : 1),
      dashMax: S.has('body2') ? 2 : 1,
      spellCostMult: S.has('spirit4') ? 0.7 : 1,
      spellDmgMult: (S.has('spirit4') ? 1.5 : 1) * (m.dmgMult || 1),
      chargedSwordRange: P.CHARGED_SWORD_RANGE * (S.has('blade4') ? 1.6 : 1),
      chargedSwordMult: P.CHARGED_SWORD_MULT * (S.has('blade4') ? 1.6 : 1),
    };
    // conserver le ratio de PV quand le max change
    if (prevMax && prevMax !== this.stats.maxHp) {
      this.hp = Math.round(AR.U.clamp(this.hp / prevMax, 0, 1) * this.stats.maxHp);
    }
    this.potionMax = this.stats.potionMax;
  }

  get maxHp() { return this.stats.maxHp; }
  getRect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  spellUnlocked(i) {
    if (i <= 1) return this.skills.has('spirit1');
    if (i <= 3) return this.skills.has('spirit3');
    // Sorts 5/6 (Lévitation/Téléport, voie du Vent) : chacun débloqué par son propre nœud,
    // contrairement aux paires spirit1/spirit3 ci-dessus — comparaison par id plutôt que par
    // index pour rester correct si l'ordre d'AR.SPELLS change.
    const sp = AR.SPELLS[i];
    if (sp && sp.id === 'levitate') return this.skills.has('wind3');
    if (sp && sp.id === 'teleport') return this.skills.has('wind4');
    return false;
  }

  // =========================================================== UPDATE
  update(dt, game) {
    if (this.dead) return;
    const P = AR.C.PLAYER, In = AR.Input;
    const st = this.stats;

    this.invulnT = Math.max(0, this.invulnT - dt);
    this.flash = Math.max(0, this.flash - dt * 5);
    this.swordCd -= dt; this.bowCd -= dt;
    this.comboT -= dt;
    this.attackAnimT -= dt;
    this.dashCd -= dt;
    this.launchCd = Math.max(0, this.launchCd - dt);
    this.dropThrough -= dt;
    this.walkT += dt;
    this._clock += dt;
    for (let i = 0; i < 4; i++) this.spellCds[i] -= dt;
    if (this.comboT <= 0) this.comboIdx = 0;
    if (this.dashCd <= 0 && this.dashCharges < st.dashMax) {
      this.dashCharges++;
      if (this.dashCharges < st.dashMax) this.dashCd = st.dashCd;
    }

    // régénération d'esprit
    this.spirit = Math.min(st.maxSpirit, this.spirit + st.spiritRegen * dt);

    const aim = In.aim(game.camera);
    const chargingBow = this.bowHold >= 0;

    // ---------------- déplacements
    let dir = 0;
    if (In.down('left')) dir -= 1;
    if (In.down('right')) dir += 1;

    // Double-tap gauche/droite = dash (en plus de la touche dash dédiée). Fenêtre de 0.28s
    // entre deux appuis (front montant) sur la même direction.
    const TAP_WINDOW = 0.28;
    let doubleTapDashDir = 0;
    if (In.pressed('left')) {
      doubleTapDashDir = (this._clock - this._tapLeftT < TAP_WINDOW) ? -1 : 0;
      this._tapLeftT = this._clock;
    }
    if (In.pressed('right')) {
      doubleTapDashDir = (this._clock - this._tapRightT < TAP_WINDOW) ? 1 : 0;
      this._tapRightT = this._clock;
    }
    // Double-tap bas = descendre à travers une plateforme one-way (même effet que
    // sauter en tenant bas), utile sans avoir à combiner deux touches.
    if (In.pressed('down')) {
      if (this._clock - this._tapDownT < TAP_WINDOW && this.onGround) this.dropThrough = 0.25;
      this._tapDownT = this._clock;
    }

    if (In.down('dash')) this.dashHeld += dt; else this.dashHeld = 0;
    const sprinting = this.dashHeld > 0.18 && !chargingBow;
    const targetSpeed = (sprinting ? P.SPRINT : P.WALK) * st.speed * (chargingBow ? 0.55 : 1);

    if (!this.dashing) {
      const accel = P.ACCEL * (this.onGround ? 1 : P.AIR_CTRL);
      if (dir !== 0) {
        this.vx = AR.U.clamp(this.vx + dir * accel * dt, -targetSpeed, targetSpeed);
        if (!chargingBow) this.facing = dir;
      } else {
        const dec = accel * 1.2 * dt;
        this.vx = Math.abs(this.vx) < dec ? 0 : this.vx - AR.U.sign(this.vx) * dec;
      }
    }
    // en visée, on se tourne vers le curseur
    if (chargingBow) this.facing = AR.U.sign(aim.x - (this.x + this.w / 2)) || this.facing;

    // ---------------- pad de saut anti-gravité (R6) : vx forcée brièvement, même logique que
    // `riding` ci-dessous — sans ça, un héros immobile (ou une IA de démo qui ne « vise » pas
    // spécifiquement la bande suivante) perd sa dérive horizontale en un instant (frottement de
    // la ligne 138 ci-dessus) et retombe sur le même pad au lieu d'atteindre la bande suivante.
    if (this.launchDriftT > 0) {
      this.launchDriftT -= dt;
      this.vx = this.launchDriftVx;
      if (this.launchDriftVx) this.facing = AR.U.sign(this.launchDriftVx);
    }

    // ---------------- chariot sur rail (R5) : vx forcée (défilement imposé), le contrôle
    // horizontal manuel est ignoré jusqu'à `endX` — cf. trigger 'startRail'
    // (`Game#_updateTriggers`). Saut/gravité restent actifs (esquive des obstacles/ennemis
    // rencontrés en chemin), seul le déplacement horizontal est repris ci-dessous.
    if (this.riding) {
      this.vx = this.riding.speed;
      this.facing = this.riding.speed >= 0 ? 1 : -1;
      const arrived = this.riding.speed >= 0 ? this.x >= this.riding.endX : this.x <= this.riding.endX;
      if (arrived) this.riding = null;
    }

    // ---------------- dash (appui) / sprint (maintien)
    if (!this.riding && (In.pressed('dash') || doubleTapDashDir !== 0) && this.dashCharges > 0 && !this.dashing && (this.onGround || !this.airDashed)) {
      this.dashing = true;
      this.dashT = P.DASH_TIME;
      this.dashDir = doubleTapDashDir !== 0 ? doubleTapDashDir : (dir !== 0 ? dir : this.facing);
      this.dashCharges--;
      this.dashCd = st.dashCd;
      if (!this.onGround) this.airDashed = true;
      this.invulnT = Math.max(this.invulnT, P.DASH_TIME + 0.06);
      AR.Audio.sfx('dash');
      AR.EventLog.push('player', { event: 'dash', x: Math.round(this.x), y: Math.round(this.y), dir: this.dashDir });
      AR.Particles.burst(this.x + this.w / 2, this.y + this.h, 8,
        { color: '#cfd8d4', speed: 120, size: 3, life: 0.3, up: 30 });
    }
    if (this.dashing) {
      this.dashT -= dt;
      this.vx = this.dashDir * P.DASH_SPEED;
      this.vy = 0;
      this.trail.push({ x: this.x, y: this.y, facing: this.facing, t: 0.22 });
      if (this.dashT <= 0) { this.dashing = false; this.vx = this.dashDir * targetSpeed; }
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].t -= dt;
      if (this.trail[i].t <= 0) this.trail.splice(i, 1);
    }

    // ---------------- lévitation (sort à bascule, cf. AR.SPELLS 'levitate') : une pression sur
    // la touche active ou désactive le vol (plus une touche à tenir) ; calculé ici, AVANT les
    // blocs escalade/saut plus bas, pour pouvoir les désactiver via `this.levitating` tant que
    // le vol est actif (sinon « haut » — aussi mappé sur `jump`, cf. config.js — consommerait un
    // saut ou accrocherait une liane à chaque pression, sans effet visible mais en gâchant l'état
    // pour l'atterrissage). Vitesse verticale (haut/bas) appliquée plus bas, dans le bloc gravité.
    // Le dash reste utilisable en volant (cahier des charges d'origine : « on doit pouvoir
    // continuer d'attaquer et dasher en volant ») — seuls escalade et chariot sur rail, deux
    // états qui imposent leur propre contrôle vertical/horizontal complet, coupent le vol.
    const lvIdx = AR.SPELLS.findIndex((s) => s.id === 'levitate');
    if (lvIdx >= 0 && this.spellUnlocked(lvIdx)) {
      if (In.pressed('spell' + (lvIdx + 1))) {
        if (this.levitating) this.levitating = false;
        else if (this.spirit > 0 && !this.climbing && !this.riding) this.levitating = true;
      }
      if (this.levitating) {
        if (this.climbing || this.riding) this.levitating = false;
        else {
          const lvCost = AR.SPELLS[lvIdx].cost * st.spellCostMult;
          this.spirit = Math.max(0, this.spirit - lvCost * dt);
          if (this.spirit <= 0) this.levitating = false;
          else if (Math.random() < 0.4) {
            AR.Particles.spawn({
              x: this.x + this.w / 2 + (Math.random() - 0.5) * this.w, y: this.y + this.h,
              vx: 0, vy: 40, g: -20, life: 0.5, size: 3, color: AR.C.COLORS.spirit, type: 'dot',
            });
          }
        }
      }
    } else {
      this.levitating = false;
    }

    // ---------------- escalade : détection préalable (la touche « haut » sert aussi au saut)
    const climbCx = this.x + this.w / 2, climbCy = this.y + this.h / 2;
    const onClimb = game.level.climbableAt && game.level.climbableAt(climbCx, climbCy);
    // Intention d'escalade : sur une liane avec haut/bas maintenu, « haut » grimpe
    // (et ne déclenche pas de saut). Le petit cooldown couvre le sommet de la liane.
    if (this.climbing || onClimb) this.climbCooldown = 0.18; else this.climbCooldown -= dt;
    const climbIntent = (onClimb || this.climbing || this.climbCooldown > 0) && (In.down('up') || In.down('down'));

    // ---------------- décrochage d'une liane au saut : peut lâcher prise à N'IMPORTE QUELLE
    // hauteur en appuyant sur le saut, pas seulement en sortant par le haut/bas/côté de la
    // liane. Sans ça, un héros qui grimpe puis relâche « haut » avant le sommet logique reste
    // suspendu indéfiniment (`climbing` ne se coupe que si `onClimb` devient faux — relâcher les
    // touches ne fait *pas* retomber), et le saut normal ci-dessous est bloqué tant que
    // `climbing` est vrai — sans échappatoire fiable pour rattraper une plateforme voisine
    // (retour joueur : aucune des lianes de la canopée R3 ne permettait d'atterrir dessus).
    // Lit directement la touche Espace (`AR.Input.keys`) plutôt que `In.pressed('jump')` : cette
    // action est aussi mappée sur ArrowUp/KeyW (§config), donc tenir « haut » pour grimper la
    // maintient déjà « enfoncée » en continu — un appui frais sur Espace ne produirait alors
    // jamais de front montant détectable via l'action partagée (trouvé en testant : le
    // décrochage ne se déclenchait jamais tant que « haut » restait tenu, exactement le cas
    // d'usage visé). Suivi de front dédié (`_prevSpace`) pour ne pas dépendre de `In.pressed`.
    const spaceHeld = !!In.keys['Space'];
    const spacePressed = spaceHeld && !this._prevSpace;
    this._prevSpace = spaceHeld;
    if (this.climbing && spacePressed) {
      this.climbing = false;
      this.climbLockout = 0.25; // évite que la détection d'escalade juste en dessous ne raccroche aussitôt
      this.vy = P.JUMP_VY;
      this.vx = (dir !== 0 ? dir : this.facing) * P.WALK;
      this.jumpsUsed = 1; this.jumpBuffer = 0;
      AR.Audio.sfx('jump');
      AR.EventLog.push('player', { event: 'jump', x: Math.round(this.x), y: Math.round(this.y) });
    }
    this.climbLockout -= dt;

    // ---------------- saut / double saut (désactivé pendant le vol : « haut »/« bas » pilotent
    // alors directement la vitesse verticale, cf. bloc lévitation plus haut et bloc gravité plus
    // bas — sans ce garde-fou, « haut » consommerait aussi un saut à chaque pression, invisible
    // sur le moment mais épuisant les sauts disponibles pour après la désactivation du vol)
    // Le saut ne dépend plus de la direction tenue (retour joueur 2026-07-30 : sur tactile, un
    // pouce légèrement en bas sur le stick de déplacement empêchait le bouton de sauter de
    // fonctionner). Descendre à travers une plateforme one-way reste possible sans ce couplage,
    // via le double-tap bas ci-dessus (ligne ~153).
    this.jumpBuffer -= dt; this.coyote -= dt;
    if (In.pressed('jump') && !climbIntent && !this.levitating) {
      this.jumpBuffer = P.BUFFER;
    }
    if (this.jumpBuffer > 0 && !this.climbing) {
      if (this.onGround || this.coyote > 0) {
        this.vy = P.JUMP_VY;
        this.jumpBuffer = 0; this.coyote = 0;
        this.jumpsUsed = 1;
        AR.Audio.sfx('jump');
        AR.EventLog.push('player', { event: 'jump', x: Math.round(this.x), y: Math.round(this.y) });
      } else if (this.jumpsUsed === 1) {
        this.vy = P.DOUBLE_JUMP_VY;
        this.jumpBuffer = 0;
        this.jumpsUsed = 2;
        AR.Audio.sfx('djump');
        AR.EventLog.push('player', { event: 'double_jump', x: Math.round(this.x), y: Math.round(this.y) });
        AR.Particles.burst(this.x + this.w / 2, this.y + this.h, 10,
          { color: AR.C.COLORS.spirit, speed: 140, size: 3, life: 0.35, spread: 1.2, angle: Math.PI / 2 });
      } else if (this.jumpsUsed === 2 && this.skills.has('wind1')) {
        this.vy = P.TRIPLE_JUMP_VY;
        this.jumpBuffer = 0;
        this.jumpsUsed = 3;
        AR.Audio.sfx('djump');
        AR.EventLog.push('player', { event: 'triple_jump', x: Math.round(this.x), y: Math.round(this.y) });
        AR.Particles.burst(this.x + this.w / 2, this.y + this.h, 12,
          { color: AR.C.COLORS.magic, speed: 150, size: 3, life: 0.4, spread: 1.3, angle: Math.PI / 2 });
      }
    }
    if (In.released('jump') && this.vy < 0 && !this.climbing) this.vy *= P.JUMP_CUT;

    // ---------------- escalade (lianes / échelles) — cf. 00_pre_requis §7.1
    if (!this.climbing && onClimb && !this.dashing && !this.levitating && this.climbLockout <= 0 &&
        (In.down('up') || In.down('down'))) {
      this.climbing = true; this.jumpsUsed = 0; this.airDashed = false;
    }
    if (this.climbing) {
      if (!onClimb || this.dashing) {
        this.climbing = false;
      } else {
        this.jumpBuffer = 0; this.coyote = 0;
        let cvy = 0;
        if (In.down('up')) cvy -= 150;
        if (In.down('down')) cvy += 150;
        this.vy = cvy;
        if (dir !== 0) {
          // se décaler / sortir sur le côté (vitesse réduite sur la prise, cf. 00 §7.1)
          this.vx = dir * 45;
        } else if (onClimb.x !== undefined) {
          // sans entrée horizontale : recentrer pour ne pas glisser hors du volume
          const target = (onClimb.x + onClimb.w / 2) * AR.C.TILE - this.w / 2;
          this.x = AR.U.damp(this.x, target, 14, dt);
          this.vx = 0;
        }
      }
    }

    // ---------------- gravité + collision (vol actif -> gravité remplacée par un pilotage
    // vertical direct haut/bas, cf. bloc lévitation plus haut ; ni haut ni bas tenu = vol
    // stationnaire, pas de dérive). Vitesse verticale = `targetSpeed` (même vitesse que le
    // déplacement horizontal, marche/sprint confondus, cf. calcul plus haut) — retour joueur
    // 2026-07-30 : le vol doit se déplacer aussi vite dans n'importe quelle direction, pas à
    // une vitesse dédiée plus lente.
    if (this.levitating) {
      if (In.down('up')) this.vy = -targetSpeed;
      else if (In.down('down')) this.vy = targetSpeed;
      else this.vy = 0;
    } else if (!this.dashing && !this.climbing) this.vy += AR.C.GRAV * dt;
    this.vy = Math.min(this.vy, 980);
    this.kvx *= Math.pow(0.01, dt);
    const wasGround = this.onGround;
    const res = game.level.moveRect(this, (this.vx + this.kvx) * dt, this.vy * dt, this.dropThrough > 0);
    this.onGround = res.onGround;
    if (res.onGround) {
      if (!wasGround && this.vy > 500) {
        AR.Audio.sfx('land');
        AR.Particles.burst(this.x + this.w / 2, this.y + this.h, 6,
          { color: '#bbb094', speed: 90, size: 3, life: 0.3, up: 40 });
      }
      this.vy = 0;
      this.jumpsUsed = 0; this.airDashed = false;
      this.coyote = P.COYOTE;
      // point de réapparition sûr
      if (Math.abs(this.vx) < 20 || Math.floor(game.time * 4) % 2 === 0) {
        this.lastSafe.x = this.x; this.lastSafe.y = this.y;
      }
    } else if (wasGround) this.coyote = P.COYOTE;
    if (res.hitCeil) this.vy = Math.max(this.vy, 0);

    // ---------------- pad de saut anti-gravité (R6) : contact automatique (aucune touche), donc
    // sûr sur le chemin obligatoire pour l'IA de démo — cf. `Level#launchPadAt`. `launchCd`
    // évite un rebond en boucle tant que le héros reste sur le pad.
    if (this.launchCd <= 0) {
      const pad = game.level.launchPadAt(this.getRect());
      if (pad) {
        this.vy = pad.vy;
        if (pad.vx) { this.vx = pad.vx; this.launchDriftVx = pad.vx; this.launchDriftT = pad.driftT || 0.45; }
        this.launchCd = 0.5;
        this.onGround = false;
        AR.Audio.sfx('jump');
        AR.Particles.burst(this.x + this.w / 2, this.y + this.h, 10,
          { color: '#42e8f5', speed: 160, size: 3, life: 0.4, up: 80 });
      }
    }

    // chute dans le vide (hauteur RÉELLE du niveau courant, pas la constante globale — R5 a un
    // worldH bien plus grand que 32 ; pour les autres ères, worldH vaut déjà AR.C.WORLD_H)
    if (this.y > (game.level.worldH || AR.C.WORLD_H) * AR.C.TILE + 60) {
      const safe = game.level.findSafeRespawn(this.lastSafe.x, this.w, this.h, this.lastSafe.y);
      this.x = safe.x; this.y = safe.y;
      // Les dégâts environnementaux n'ont pas de provenance : passer undefined
      // évite le recul artificiel vers la droite qui renvoyait dans le trou.
      const fallRatio = (game.level.fallDamageRatio !== undefined ? game.level.fallDamageRatio : 0.12);
      game.hitPlayer(Math.round(this.stats.maxHp * fallRatio), undefined, true);
      this.vx = 0; this.vy = 0; this.kvx = 0;
      this.dashing = false; this.dashT = 0; this.dropThrough = 0;
      this.levitating = false;
      this.jumpsUsed = 0; this.airDashed = false;
      this.trail.length = 0;
      this.lastSafe = { x: safe.x, y: safe.y };
      this.invulnT = 1.2;
    }

    // ---------------- SABRE (appui = coup léger ; maintien+relâche = chargé)
    if (In.down('sword')) {
      if (this.swordHold < 0) {
        this.swordHold = 0;
        if (this.swordCd <= 0) this._swordLight(game);
      } else {
        this.swordHold += dt;
        if (this.swordHold >= st.swordChargeTime && !this.swordReadyPing) {
          this.swordReadyPing = true;
          AR.Audio.sfx('chargeReady');
          AR.Particles.burst(this.x + this.w / 2, this.y + this.h / 2, 8,
            { color: AR.C.COLORS.impact, speed: 100, size: 3, life: 0.3 });
        }
      }
    } else {
      if (this.swordHold >= st.swordChargeTime) this._swordCharged(game);
      this.swordHold = -1;
      this.swordReadyPing = false;
    }

    // ---------------- ARC (appui = tir rapide ; maintien = charge perçante)
    if (In.down('bow')) {
      if (this.bowHold < 0) {
        this.bowHold = 0;
        if (this.bowCd <= 0) this._bowQuick(game, aim);
      } else {
        this.bowHold += dt;
        if (this.bowHold >= st.bowChargeTime && !this.chargeReadyPing) {
          this.chargeReadyPing = true;
          AR.Audio.sfx('chargeReady');
          AR.Particles.spawn({
            x: this.x + this.w / 2 + this.facing * 30, y: this.y + this.h * 0.4,
            vx: 0, vy: 0, life: 0.25, size: 26, color: AR.C.COLORS.spirit, type: 'ring',
          });
        }
        // particules de convergence pendant la charge
        if (this.bowHold > st.bowChargeTime * 0.4 && Math.random() < 0.5) {
          const a = Math.random() * Math.PI * 2;
          const px = this.x + this.w / 2 + this.facing * 30, py = this.y + this.h * 0.4;
          AR.Particles.spawn({
            x: px + Math.cos(a) * 34, y: py + Math.sin(a) * 34,
            vx: -Math.cos(a) * 130, vy: -Math.sin(a) * 130, g: 0,
            life: 0.25, size: 2.5, color: AR.C.COLORS.spirit, type: 'dot',
          });
        }
      }
    } else {
      if (this.bowHold >= st.bowChargeTime) this._bowCharged(game, aim);
      this.bowHold = -1;
      this.chargeReadyPing = false;
    }

    // ---------------- potion
    if (In.pressed('potion') && this.potions > 0 && this.hp < st.maxHp) {
      this.potions--;
      this.heal(Math.round(st.maxHp * AR.C.PLAYER.POTION_HEAL));
      AR.EventLog.push('player', { event: 'potion', hpAfter: this.hp, potionsLeft: this.potions });
      AR.Audio.sfx('potion');
      AR.Particles.burst(this.x + this.w / 2, this.y + this.h / 2, 14,
        { color: [AR.C.COLORS.hp, '#ff9a9a'], speed: 90, size: 3, life: 0.6, g: -150 });
    }

    // ---------------- sorts (les sorts « channel » comme Lévitation se gèrent à part,
    // cf. _updateLevitate — un In.pressed ici ne conviendrait pas à une touche tenue)
    for (let i = 0; i < AR.SPELLS.length; i++) {
      if (AR.SPELLS[i].channel) continue;
      if (In.pressed('spell' + (i + 1))) this.castSpell(i, game, aim);
    }
  }

  // --------------------------------------------------------- attaques
  _swordLight(game) {
    const st = this.stats;
    AR.EventLog.push('player', { event: 'sword_light', x: Math.round(this.x), y: Math.round(this.y) });
    this.swordCd = st.swordCooldown;
    this.comboIdx = this.comboT > 0 ? (this.comboIdx + 1) % 3 : 0;
    this.comboT = AR.C.PLAYER.COMBO_WINDOW;
    const finisher = this.comboIdx === 2;
    const dmg = st.swordDmg * (finisher ? 1.65 : 1);
    const range = finisher ? 92 : 74;
    const rect = {
      x: this.facing > 0 ? this.x + this.w * 0.5 : this.x + this.w * 0.5 - range,
      y: this.y - 6, w: range, h: this.h + 14,
    };
    this.attackAnim = 'sword'; this.attackAnimT = 0.20;
    AR.Particles.slashArc(this.x + this.w / 2 + this.facing * 44, this.y + this.h * 0.45,
      this.facing, finisher, finisher ? AR.C.COLORS.impact : AR.C.COLORS.spirit);
    AR.Audio.sfx(finisher ? 'slashHeavy' : (this.comboIdx === 1 ? 'slash2' : 'slash'));
    const hits = game.meleeHit(rect, dmg, {
      fromX: this.x + this.w / 2,
      knockX: this.facing * (finisher ? 300 : 140),
    });
    if (hits > 0) {
      this.spirit = Math.min(st.maxSpirit, this.spirit + 4 * hits);
      game.hitStop(finisher ? 0.06 : 0.03);
    }
    // onde du finisher (compétence)
    if (finisher && this.skills.has('blade2')) {
      AR.Projectiles.spawn({
        x: this.x + this.w / 2 + this.facing * 30, y: this.y + this.h * 0.45,
        kind: 'wave', friendly: true, dmg: st.swordDmg * 0.8, r: 30, pierce: true,
        vx: this.facing * 520, vy: 0, life: 0.4,
      });
    }
    if (finisher) this.comboT = 0;
  }

  _swordCharged(game) {
    const st = this.stats;
    AR.EventLog.push('player', { event: 'sword_charged', x: Math.round(this.x), y: Math.round(this.y) });
    this.attackAnim = 'charged_sword'; this.attackAnimT = 0.3;
    const dmg = st.swordDmg * st.chargedSwordMult;
    AR.Audio.sfx('chargedSlash');
    game.camera.shake(4, 0.18);
    game.hitStop(0.05);
    // onde tranchante perçante : touche les ennemis en file
    AR.Projectiles.spawn({
      x: this.x + this.w / 2 + this.facing * 20, y: this.y + this.h * 0.45,
      kind: 'wave', friendly: true, dmg, r: 38, pierce: true,
      vx: this.facing * 900, vy: 0, life: st.chargedSwordRange / 900,
      knock: 320,
    });
    AR.Particles.slashArc(this.x + this.w / 2 + this.facing * 50, this.y + this.h * 0.4,
      this.facing, true, AR.C.COLORS.spirit);
  }

  _bowQuick(game, aim) {
    const st = this.stats;
    AR.EventLog.push('player', { event: 'bow_quick', x: Math.round(this.x), y: Math.round(this.y) });
    this.bowCd = st.bowCooldown;
    this.attackAnim = 'bow'; this.attackAnimT = 0.22;
    const sx = this.x + this.w / 2, sy = this.y + this.h * 0.38;
    const ang = AR.U.angle(sx, sy, aim.x, aim.y);
    this.facing = Math.cos(ang) >= 0 ? 1 : -1;
    AR.Audio.sfx('bow');
    const n = this.skills.has('bow4') ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const a = ang + (i - (n - 1) / 2) * 0.11;
      AR.Projectiles.spawn({
        x: sx + Math.cos(a) * 22, y: sy + Math.sin(a) * 22, kind: 'arrow', friendly: true,
        dmg: st.bowDmg * (n > 1 ? 0.7 : 1), r: 6,
        vx: Math.cos(a) * AR.C.PLAYER.ARROW_SPEED, vy: Math.sin(a) * AR.C.PLAYER.ARROW_SPEED,
        g: 420, life: AR.C.PLAYER.ARROW_RANGE / AR.C.PLAYER.ARROW_SPEED,
      });
    }
  }

  _bowCharged(game, aim) {
    const st = this.stats;
    AR.EventLog.push('player', { event: 'bow_charged', x: Math.round(this.x), y: Math.round(this.y) });
    this.attackAnim = 'charged_bow'; this.attackAnimT = 0.3;
    const sx = this.x + this.w / 2, sy = this.y + this.h * 0.38;
    const ang = AR.U.angle(sx, sy, aim.x, aim.y);
    this.facing = Math.cos(ang) >= 0 ? 1 : -1;
    AR.Audio.sfx('chargedBow');
    game.camera.shake(3, 0.15);
    AR.Particles.shockwave(sx + Math.cos(ang) * 30, sy + Math.sin(ang) * 30, 34, AR.C.COLORS.spirit);
    // Le temps de maintien au-delà du seuil "chargé" tend l'arc : un tir tout
    // juste chargé garde une vraie parabole (retombe vite), un tir maintenu au
    // maximum est plus tendu/plat mais retombe quand même avant la fin de sa
    // portée — jamais une ligne droite à l'infini (cf. retour joueur : la
    // flèche chargée partait tout droit, trop forte, sans que l'ennemi la
    // voie venir).
    const overT = Math.max(0, this.bowHold - st.bowChargeTime);
    const chargeLevel = AR.U.clamp(overT / (st.bowChargeTime * 0.6), 0, 1);
    // g calé sur le même ordre de grandeur que les projectiles ennemis à trajectoire
    // parabolique (rock/javelin, g:500, cf. enemy.js) — les anciennes valeurs (260/90)
    // étaient si faibles par rapport à la vitesse de la flèche que la chute restait
    // imperceptible à l'écran (retour joueur : "elles partent très très loin tout droit").
    const g = AR.U.lerp(600, 250, chargeLevel);
    const life = AR.U.lerp(0.7, 0.95, chargeLevel);
    AR.Projectiles.spawn({
      x: sx, y: sy, kind: 'parrow', friendly: true,
      dmg: st.bowDmg * AR.C.PLAYER.CHARGED_BOW_MULT, r: 9, pierce: true,
      vx: Math.cos(ang) * AR.C.PLAYER.CHARGED_ARROW_SPEED, vy: Math.sin(ang) * AR.C.PLAYER.CHARGED_ARROW_SPEED,
      g, life, knock: 260,
      explodeR: this.skills.has('bow3') ? 62 : 0,
    });
  }

  castSpell(i, game, aim) {
    if (!this.spellUnlocked(i) || this.spellCds[i] > 0) return;
    const spell = AR.SPELLS[i];
    const cost = spell.cost * this.stats.spellCostMult;
    if (this.spirit < cost) { AR.Audio.sfx('error'); return; }
    this.spirit -= cost;
    this.spellCds[i] = 1.2;
    AR.EventLog.push('player', { event: 'spell', id: spell.id, x: Math.round(this.x), y: Math.round(this.y) });
    // pose d'incantation dédiée (assets/hero/spells)
    this.attackAnim = spell.cast;
    this.attackAnimT = spell.id === 'veil' ? 0.5 : 0.35;
    const dmg = spell.dmg * this.stats.spellDmgMult;
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    AR.Audio.sfx(spell.id === 'veil' ? 'spellVeil' : 'spell');
    switch (spell.id) {
      case 'wave': {
        AR.Particles.shockwave(cx, cy, 180, AR.C.COLORS.spirit);
        game.camera.shake(5, 0.25);
        for (const e of game.enemies) {
          if (e.dead) continue;
          const d = AR.U.dist(cx, cy, e.centerX(), e.centerY());
          if (d < 190) game.hitEnemy(e, dmg, { knockX: AR.U.sign(e.x - cx) * 420, fromX: cx, pierceBlock: true });
        }
        break;
      }
      case 'kunai': {
        const ang = AR.U.angle(cx, cy, aim.x, aim.y);
        for (let k = 0; k < 5; k++) {
          const a = ang + (k - 2) * 0.14;
          AR.Projectiles.spawn({
            x: cx, y: cy, kind: 'kunai', friendly: true, dmg, r: 7, pierce: true,
            vx: Math.cos(a) * 820, vy: Math.sin(a) * 820, life: 0.7,
            // étourdit brièvement chaque ennemi touché (cf. Enemy#stun, projectiles.js) — pratique
            // pour se replacer derrière lui sans encaisser de dégât de contact pendant ce temps
            stunDur: 1.2,
          });
        }
        break;
      }
      case 'blink': {
        const dist = 270;
        const x0 = cx;
        // dégâts sur le trajet + étourdit chaque ennemi traversé (cf. Enemy#stun) : le héros passe
        // littéralement à travers, l'étourdissement évite qu'il encaisse un coup en pleine face
        for (const e of game.enemies) {
          if (e.dead) continue;
          const ex = e.centerX();
          if (AR.U.sign(ex - x0) === this.facing && Math.abs(ex - x0) < dist &&
              Math.abs(e.centerY() - cy) < 90) {
            game.hitEnemy(e, dmg, { knockX: this.facing * 200, fromX: x0, pierceBlock: true });
            e.stun(1.6);
          }
        }
        for (let k = 0; k < 10; k++) {
          AR.Particles.spawn({
            x: x0 + this.facing * (k / 10) * dist, y: cy + (Math.random() - 0.5) * 30,
            vx: 0, vy: 0, life: 0.3 + k * 0.02, size: 10, color: AR.C.COLORS.spirit, type: 'glow',
          });
        }
        this.x += this.facing * dist;
        this.x = AR.U.clamp(this.x, 0, (game.level.tilesW - 1) * AR.C.TILE - this.w);
        // ne pas se téléporter dans un mur : remonter si besoin
        let guard = 0;
        while (guard++ < 40 && game.level.solidAt(Math.floor((this.x + this.w / 2) / AR.C.TILE), Math.floor((this.y + this.h - 4) / AR.C.TILE))) {
          this.y -= AR.C.TILE;
        }
        this.invulnT = Math.max(this.invulnT, 0.35);
        break;
      }
      case 'veil':
        game.veilT = 5;
        AR.Particles.shockwave(cx, cy, 320, AR.C.COLORS.magic);
        break;
      case 'teleport': {
        // Sur un chariot (R6) : le déplacement est forcé par `this.riding` jusqu'à endX, se
        // téléporter ailleurs le laisserait orphelin — annulé comme si la destination était
        // solide (remboursé, cf. plus bas).
        const tx = AR.U.clamp(aim.x - this.w / 2, 0, (game.level.tilesW - 1) * AR.C.TILE - this.w);
        const ty = Math.max(0, aim.y - this.h);
        const T = AR.C.TILE;
        const fits = !this.riding &&
          !game.level.solidAt(Math.floor(tx / T), Math.floor(ty / T)) &&
          !game.level.solidAt(Math.floor((tx + this.w) / T), Math.floor(ty / T)) &&
          !game.level.solidAt(Math.floor(tx / T), Math.floor((ty + this.h) / T)) &&
          !game.level.solidAt(Math.floor((tx + this.w) / T), Math.floor((ty + this.h) / T));
        if (!fits) {
          // destination invalide : on annule et on rembourse le coût déjà déduit plus haut
          this.spirit += cost;
          AR.Audio.sfx('error');
          break;
        }
        for (let k = 0; k < 8; k++) {
          AR.Particles.spawn({
            x: this.x + this.w / 2 + (Math.random() - 0.5) * this.w, y: this.y + this.h * (0.3 + Math.random() * 0.6),
            vx: 0, vy: -30, life: 0.35, size: 6, color: AR.C.COLORS.magic, type: 'glow',
          });
        }
        this.x = tx; this.y = ty;
        this.vx = 0; this.vy = 0; this.jumpsUsed = 0; this.airDashed = false;
        this.invulnT = Math.max(this.invulnT, 0.3);
        for (let k = 0; k < 10; k++) {
          AR.Particles.spawn({
            x: tx + this.w / 2 + (Math.random() - 0.5) * this.w, y: ty + this.h * (0.3 + Math.random() * 0.6),
            vx: 0, vy: -30, life: 0.35, size: 6, color: AR.C.COLORS.magic, type: 'glow',
          });
        }
        break;
      }
    }
  }

  // --------------------------------------------------------- dégâts / soins
  takeDamage(dmg, fromX, ignoreIframes) {
    if (this.dead) return 0;
    if (!ignoreIframes && (this.invulnT > 0 || this.dashing)) return 0;
    // Compétence « Esquive » (voie du Vent, 'wind2') : 30% de chances d'éviter totalement une
    // attaque, corps à corps ou à distance. `fromX` n'est jamais défini pour les dégâts
    // environnementaux (chute, cf. update()) : ceux-ci restent volontairement inesquivables.
    if (fromX !== undefined && this.skills.has('wind2') && Math.random() < 0.3) {
      this.attackAnim = 'dodge'; this.attackAnimT = 0.3;
      AR.Audio.sfx('dash');
      AR.Particles.burst(this.x + this.w / 2, this.y + this.h / 2, 8,
        { color: AR.C.COLORS.spirit, speed: 130, size: 3, life: 0.3 });
      AR.EventLog.push('player', { event: 'dodge', x: Math.round(this.x), y: Math.round(this.y) });
      return 0;
    }
    dmg = Math.max(1, Math.round(dmg * this.stats.armor));
    this.hp -= dmg;
    this.invulnT = AR.C.PLAYER.INVULN;
    this.flash = 1;
    if (fromX !== undefined) this.knock(AR.U.sign(this.x + this.w / 2 - fromX) * 240);
    AR.Audio.sfx('hurt');
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true;
      AR.EventLog.push('player', { event: 'death', x: Math.round(this.x), y: Math.round(this.y) });
    }
    return dmg;
  }

  heal(amount) {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  knock(vx) { this.kvx = vx; this.vy = Math.min(this.vy, -160); }

  addXP(amount, game) {
    this.xp += amount;
    let next = this.xpNext();
    while (this.xp >= next) {
      this.xp -= next;
      this.level++;
      this.skillPoints++;
      this.recalcStats(game);
      this.heal(Math.round(this.stats.maxHp * 0.15));
      AR.Audio.sfx('levelup');
      AR.Particles.shockwave(this.x + this.w / 2, this.y + this.h / 2, 90, AR.C.COLORS.xp);
      AR.Particles.text(this.x + this.w / 2, this.y - 24, 'NIVEAU ' + this.level + ' !', AR.C.COLORS.xp, true);
      next = this.xpNext();
    }
  }

  xpNext() { return Math.round(AR.C.XP_BASE * Math.pow(AR.C.XP_GROWTH, this.level - 1)); }

  // ============================================================ RENDU
  draw(ctx, cam, game) {
    const cx = cam.cx(), cy = cam.cy();
    const fx = this.x + this.w / 2 - cx;
    const fy = this.y + this.h - cy;
    const st = this.stats;

    // images rémanentes du dash
    for (const tr of this.trail) {
      AR.Assets.draw(ctx, 'hero/dash', tr.x + this.w / 2 - cx, tr.y + this.h - cy,
        AR.C.PLAYER.DRAW_H, tr.facing < 0, tr.t * 2.2);
    }
    if (this.dead) return;

    // ombre
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    // groundYAtEntity (pas groundYpx, qui ne renvoie que la surface primaire/la plus haute) lève
    // l'ambiguïté multi-étage : sous terre (grottes), groundYpx collait l'ombre au sol de surface
    // au-dessus de la tête du héros au lieu du sol de la pièce où il se trouve vraiment (retour
    // joueur : ombre visible en l'air à la surface pendant qu'il saute dans la grotte).
    const gy = game.level.groundYAtEntity(this.x + this.w / 2, this.y) - cy;
    if (gy - fy < 300) {
      ctx.beginPath(); ctx.ellipse(fx, gy + 2, 20 * (1 - AR.U.clamp((gy - fy) / 300, 0, 0.6)), 5, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // choix du sprite
    let key = 'hero/idle';
    const chargingBow = this.bowHold >= 0 && AR.Input.down('bow');
    const bowCharged = chargingBow && this.bowHold >= st.bowChargeTime;
    const chargingSword = this.swordHold >= 0 && AR.Input.down('sword') && this.swordHold > 0.15;
    const swordCharged = chargingSword && this.swordHold >= st.swordChargeTime;
    if (this.dashing) key = 'hero/dash';
    else if (this.attackAnimT > 0) key = 'hero/' + this.attackAnim;
    else if (bowCharged) key = 'hero/charged_bow';
    else if (chargingBow) key = 'hero/bow';
    else if (swordCharged) key = 'hero/charged_sword';
    else if (chargingSword) key = 'hero/sword';
    else if (!this.onGround) key = this.jumpsUsed >= 2 ? 'hero/double_jump' : 'hero/jump';
    else if (Math.abs(this.vx) > 25) key = Math.floor(this.walkT * 8) % 2 === 0 ? 'hero/walk_a' : 'hero/walk_b';

    // clignotement d'invulnérabilité
    let alpha = 1;
    if (this.invulnT > 0 && !this.dashing && Math.floor(this.invulnT * 14) % 2 === 0) alpha = 0.45;
    let tint;
    if (this.flash > 0.5) tint = 'brightness(2.4)';

    AR.Assets.draw(ctx, key, fx, fy, AR.C.PLAYER.DRAW_H, this.facing < 0, alpha, tint);

    // ------ indicateur de charge (barre au-dessus de la tête)
    let chargeK = -1, chargeColor = AR.C.COLORS.spirit;
    if (chargingBow) { chargeK = AR.U.clamp(this.bowHold / st.bowChargeTime, 0, 1); }
    else if (chargingSword) { chargeK = AR.U.clamp(this.swordHold / st.swordChargeTime, 0, 1); chargeColor = AR.C.COLORS.impact; }
    if (chargeK >= 0) {
      const bw = 46, bx = fx - bw / 2, by = fy - AR.C.PLAYER.DRAW_H - 16;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
      ctx.fillStyle = chargeK >= 1 ? '#ffffff' : chargeColor;
      ctx.fillRect(bx, by, bw * chargeK, 5);
      if (chargeK >= 1) {
        ctx.globalAlpha = 0.6 + Math.sin(game.time * 20) * 0.4;
        ctx.shadowColor = chargeColor; ctx.shadowBlur = 12;
        ctx.strokeStyle = chargeColor; ctx.lineWidth = 2;
        ctx.strokeRect(bx - 2, by - 2, bw + 4, 9);
      }
      ctx.restore();
      // halo sur le personnage à pleine charge
      if (chargeK >= 1) {
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(game.time * 16) * 0.12;
        const grad = ctx.createRadialGradient(fx, fy - 46, 6, fx, fy - 46, 60);
        grad.addColorStop(0, chargeColor); grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(fx - 60, fy - 106, 120, 120);
        ctx.restore();
      }
    }
  }
};
