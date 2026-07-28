// Arcane Rift - orchestrateur : machine d'états, boucle fixe, combat, économie
window.AR = window.AR || {};

AR.Game = class {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.state = 'title';       // title | help | play | rift | gameover | victory
    this.stateBefore = 'title';
    this.paused = false;
    this.skillOpen = false;
    this.shopOpen = false;
    this.spellReveal = null;    // [idx, idx] : fenêtre explicative forcée à l'ouverture de 2 sorts
    this.demo = false;
    this.speed = 1;             // ×1 ×2 ×4 ×8 ×10 ×15 ×20 ×30 ×40 (mode démo)
    this.time = 0;
    this.acc = 0;
    this.hitStopT = 0;
    this.veilT = 0;
    this.ngPlus = 0;
    this.camera = new AR.Camera(AR.C.VIEW_W, AR.C.VIEW_H);
    this.player = null;
    this.level = null;
    this.enemies = [];
    this.boss = null;
    this.arena = null;
    this.arenaTransitionT = 0;
    this.coins = 0;
    this.mods = {};
    this.stats = { kills: 0, time: 0, coinsEarned: 0, bosses: 0 };
    this.interactPrompt = null;
    this.deathT = 0;
    this.merchantPickup = null;
    this.runSeed = (Math.random() * 1e9) | 0;
    this.saveMenuMode = 'load';   // 'save' | 'load' — écran de sauvegardes (voir state === 'saves')
    this.savePage = 0;
    // difficulté (persistée entre les sessions)
    this.diffIdx = AR.U.clamp(AR.Save.data.settings.difficulty | 0, 0, AR.DIFFICULTIES.length - 1);
    this.diff = AR.DIFFICULTIES[this.diffIdx];
    // ère de départ choisie au menu titre (persistée entre les sessions)
    this.eraStartIdx = AR.U.clamp(AR.Save.data.settings.eraStart | 0, 0, AR.ERAS.length - 1);
    // démarrer directement dans l'arène du boss de l'ère choisie (persisté)
    this.startAtBoss = !!AR.Save.data.settings.startAtBoss;
  }

  setDifficulty(i) {
    this.diffIdx = AR.U.clamp(i, 0, AR.DIFFICULTIES.length - 1);
    this.diff = AR.DIFFICULTIES[this.diffIdx];
    AR.Save.data.settings.difficulty = this.diffIdx;
    AR.Save.save();
  }

  setEraStart(i) {
    this.eraStartIdx = AR.U.clamp(i, 0, AR.ERAS.length - 1);
    AR.Save.data.settings.eraStart = this.eraStartIdx;
    AR.Save.save();
  }

  setStartAtBoss(v) {
    this.startAtBoss = !!v;
    AR.Save.data.settings.startAtBoss = this.startAtBoss;
    AR.Save.save();
  }

  // Applique le profil de progression "moyenne" de l'ère choisie au menu
  // titre (niveau, or, crans d'armes, compétences, potions). Ère 1 = profil
  // par défaut, identique à un départ classique. Quand on saute directement
  // à l'arène du boss (atBoss), on compense l'XP/or/coffres manqués en route
  // avec un profil un peu plus généreux que le simple début d'ère.
  _applyEraStartProfile(eraIdx, atBoss) {
    const base = AR.ERA_START_PROFILE[eraIdx] || AR.ERA_START_PROFILE[0];
    const pl = this.player;
    if (atBoss) {
      pl.level = base.level + 3;
      pl.skillPoints = base.skillPoints + 1;
      pl.swordTier = Math.min(5, base.swordTier + 1);
      pl.bowTier = Math.min(5, base.bowTier + 1);
      pl.potions = 3;
      this.coins = Math.round(base.coins * 1.6);
    } else {
      pl.level = base.level;
      pl.skillPoints = base.skillPoints;
      pl.swordTier = base.swordTier;
      pl.bowTier = base.bowTier;
      pl.potions = base.potions;
      this.coins = base.coins;
    }
    pl.xp = 0;
    pl.skills = new Set(base.skills);
  }

  // ================================================== CYCLE DE VIE D'UNE RUN
  newRun(demo) {
    AR.EventLog.startRun();
    this.demo = demo;
    AR.Input.virtual = demo;
    AR.DemoAI.reset(true);
    if (!demo) this.speed = 1;
    this.ngPlus = 0;
    this.eraIdx = this.eraStartIdx || 0;
    this.runSeed = (Math.random() * 1e9) | 0;
    this.player = new AR.Player(0, 0);
    this.diff = AR.DIFFICULTIES[this.diffIdx];
    this.mods = {
      dmgMult: 1, hpMult: 1, chargeMult: 1,
      goldMult: this.diff.goldMult, enemyDmg: this.diff.dmgMult,
      shopDiscount: 1, spiritBonus: 0,
    };
    this._applyEraStartProfile(this.eraIdx, this.startAtBoss);
    this.player.recalcStats(this);
    this.player.hp = this.player.maxHp;
    this.stats = { kills: 0, time: 0, coinsEarned: 0, bosses: 0 };
    AR.Save.data.records.runs++;
    AR.Save.save();
    this.loadLevel();
    if (this.startAtBoss) this._startBossFight();
    this.state = 'play';
    this.paused = false; this.skillOpen = false; this.shopOpen = false; this.spellReveal = null;
    if (demo) AR.HUD.notify('Plan IA équilibré — affinité ' + AR.DemoAI.focusLabel(), AR.C.COLORS.spirit);
  }

  startNGPlus() {
    this.ngPlus++;
    this.eraIdx = 0;
    this.runSeed = (Math.random() * 1e9) | 0;
    this.player.heal(this.player.maxHp);
    this.loadLevel();
    this.state = 'play';
    AR.HUD.notify('Nouvelle Partie +' + this.ngPlus + ' : les ennemis sont bien plus redoutables !', AR.C.COLORS.magic);
  }

  loadLevel() {
    this.level = new AR.Level(this.eraIdx, this.runSeed + this.eraIdx * 1013);
    const lvl = this.level;
    AR.Projectiles.clear();
    AR.Pickups.clear();
    AR.Particles.clear();
    this.enemies = [];
    this.boss = null;
    this.arena = null;
    this.arenaTransitionT = 0;
    this.deathT = 0;
    this.veilT = 0;
    this.bossTriggered = false;

    // multiplicateur de difficulté (ère + NG+ + niveau de difficulté choisi)
    const scale = AR.ERA_SCALE[this.eraIdx] * (1 + this.ngPlus * 0.55) * this.diff.hpMult;
    for (const s of lvl.spawns) {
      const e = new AR.Enemy(s.id, s.x, s.y, s.elite, scale);
      e.onPlatform = !!s.onPlatform;
      // ennemis dormants (chauves-souris/traqueurs suspendus) : réveillés par un trigger de scène
      e.dormant = !!s.dormant;
      // accrochés au plafond : creusent/se détachent vers le BAS à l'émergence (cf. _drawEmergence)
      e.suspended = !!s.suspended;
      e.activateGroup = s.activate || null;
      this.enemies.push(e);
    }
    // worldPickup : distingue ces pickups "du monde normal" (position en coordonnées du
    // niveau) de ceux dynamiquement apparus DANS une arène verrouillée (fin de boss, Fosse
    // aux Bêtes) — cf. le filtre dans render()/le contrôle d'interaction : une arène
    // verrouillée réutilise le même espace de coordonnées pixel que le niveau normal (ce
    // n'est qu'un cadrage caméra + une image de fond), donc un coffre du monde proche de
    // l'ancrage de l'arène s'y superposerait sinon (trouvé en testant la Fosse aux Bêtes,
    // ancrée en plein milieu de la Fosse des Esclaves plutôt qu'en bout de niveau isolé
    // comme les vraies arènes de boss).
    for (const c of lvl.chestSpots) {
      AR.Pickups.spawn({ type: 'chest', x: c.x, y: c.y, opened: false, high: !!c.high, guaranteed: c.guaranteed || null, worldPickup: true });
    }
    this.merchantPickup = AR.Pickups.spawn({ type: 'merchant', x: lvl.merchantX, y: lvl.groundYpx(lvl.merchantX), used: false, worldPickup: true });
    // mini-portails locaux (poches secrètes) : même visuel que le portail de fin de boss (repris
    // sans changement dans AR.Pickups/HUD), mais `returnTo` le distingue au moment d'interagir —
    // téléportation immédiate au lieu d'un changement d'ère.
    for (const p of lvl.localPortals) {
      AR.Pickups.spawn({ type: 'portal', x: p.x, y: p.y, returnTo: p.returnTo, worldPickup: true });
    }

    // position du héros
    const pl = this.player;
    pl.x = lvl.spawnX;
    pl.y = lvl.groundYpx(lvl.spawnX) - pl.h - 2;
    pl.vx = 0; pl.vy = 0; pl.dead = false;
    pl.lastSafe = { x: pl.x, y: pl.y + pl.h };
    this.camera.x = 0;
    this.camera.y = pl.y - AR.C.VIEW_H / 2;

    // boutique de l'étage
    this._genShopStock();

    AR.HUD.banner('ÈRE ' + (this.eraIdx + 1) + ' — ' + lvl.era.name, lvl.era.sub);
    AR.Audio.sfx('portal');
  }

  endRun(victory) {
    const rec = AR.Save.data.records;
    rec.bestEra = Math.max(rec.bestEra, this.eraIdx);
    rec.bestLevel = Math.max(rec.bestLevel, this.player.level);
    rec.totalKills += this.stats.kills;
    if (victory) {
      rec.wins++;
      if (!rec.bestTime || this.stats.time < rec.bestTime) rec.bestTime = this.stats.time;
    }
    AR.Save.save();
    AR.EventLog.download(victory ? 'victory' : (this.player.dead ? 'death' : 'quit'));
  }

  // ================================================== SAUVEGARDES DE PARTIE
  // Point de contrôle en début d'ère : au chargement, la carte et ses monstres
  // sont régénérés à neuf (cf. loadLevel) — farmable par design, comme quitter
  // et rejoindre un niveau dans la plupart des hack-and-slash.
  saveGame(slotId) {
    const pl = this.player;
    const existing = slotId ? AR.Save.data.saves.find((s) => s.id === slotId) : null;
    const ts = Date.now();
    const entry = {
      id: existing ? existing.id : ('s' + ts + Math.floor(Math.random() * 1e6)),
      name: existing ? existing.name : AR.Save.defaultSaveName(this.eraIdx, ts),
      ts,
      eraIdx: this.eraIdx, ngPlus: this.ngPlus, diffIdx: this.diffIdx, runSeed: this.runSeed,
      coins: this.coins, mods: Object.assign({}, this.mods), stats: Object.assign({}, this.stats),
      player: {
        level: pl.level, xp: pl.xp, skillPoints: pl.skillPoints,
        skills: Array.from(pl.skills), buffs: Object.assign({}, pl.buffs),
        swordTier: pl.swordTier, bowTier: pl.bowTier, potions: pl.potions,
        hp: pl.hp, spirit: pl.spirit,
      },
    };
    AR.Save.upsertSave(entry);
    return entry.id;
  }

  loadGame(id) {
    const s = AR.Save.data.saves.find((sv) => sv.id === id);
    if (!s) return false;
    AR.EventLog.startRun();
    this.demo = false;
    AR.Input.virtual = false;
    this.speed = 1;
    this.diffIdx = AR.U.clamp(s.diffIdx | 0, 0, AR.DIFFICULTIES.length - 1);
    this.diff = AR.DIFFICULTIES[this.diffIdx];
    this.ngPlus = s.ngPlus || 0;
    this.eraIdx = s.eraIdx || 0;
    this.runSeed = s.runSeed;
    this.coins = s.coins || 0;
    this.mods = Object.assign({ dmgMult: 1, hpMult: 1, chargeMult: 1, goldMult: 1, enemyDmg: 1, shopDiscount: 1, spiritBonus: 0 }, s.mods);
    this.stats = Object.assign({ kills: 0, time: 0, coinsEarned: 0, bosses: 0 }, s.stats);

    this.player = new AR.Player(0, 0);
    const pl = this.player, sp = s.player || {};
    pl.level = sp.level || 1;
    pl.xp = sp.xp || 0;
    pl.skillPoints = sp.skillPoints || 0;
    pl.skills = new Set(sp.skills || []);
    pl.buffs = Object.assign({ crit: 0, speed: 0, hpUp: 0, spiritUp: 0 }, sp.buffs);
    pl.swordTier = sp.swordTier || 0;
    pl.bowTier = sp.bowTier || 0;
    pl.potions = sp.potions !== undefined ? sp.potions : 1;
    pl.recalcStats(this);
    pl.hp = AR.U.clamp(sp.hp !== undefined ? sp.hp : pl.stats.maxHp, 1, pl.stats.maxHp);
    pl.spirit = AR.U.clamp(sp.spirit !== undefined ? sp.spirit : pl.stats.maxSpirit, 0, pl.stats.maxSpirit);

    this.loadLevel();
    this.state = 'play';
    this.paused = false; this.skillOpen = false; this.shopOpen = false; this.spellReveal = null;
    AR.HUD.notify('Partie chargée : ' + s.name, AR.C.COLORS.spirit);
    return true;
  }

  // ================================================== BOUCLE PRINCIPALE
  frame(dtReal) {
    this.time += dtReal;
    AR.HUD.update(dtReal);
    const inMenus = this.state !== 'play' || this.paused || this.skillOpen || this.shopOpen;

    if (!inMenus) {
      this.acc += Math.min(dtReal, 0.12) * (this.demo ? this.speed : 1);
      let guard = 0;
      while (this.acc >= AR.C.DT && guard < AR.C.MAX_STEPS) {
        this.acc -= AR.C.DT;
        guard++;
        if (this.demo) AR.DemoAI.update(this, AR.C.DT);
        AR.Input.update();
        this._metaKeys();
        if (this.state === 'play' && !this.paused && !this.skillOpen && !this.shopOpen) {
          this.step(AR.C.DT);
        } else break; // un menu vient de s'ouvrir
      }
      if (guard >= AR.C.MAX_STEPS) this.acc = 0;
    } else {
      this.acc = 0;
      if (this.demo && (this.state === 'rift' || this.state === 'gameover' || this.state === 'victory' || this.shopOpen)) {
        AR.DemoAI.update(this, dtReal);
      }
      AR.Input.update();
      this._metaKeys();
    }
    this.render();
    AR.Input.clearClicks();
  }

  _metaKeys() {
    const In = AR.Input;
    if (In.pressed('mute')) {
      AR.Audio.setMuted(!AR.Audio.muted);
      AR.Save.data.settings.muted = AR.Audio.muted; AR.Save.save();
      AR.HUD.notify(AR.Audio.muted ? 'Son coupé' : 'Son activé');
    }
    if (In.pressed('record')) {
      AR.Recorder.toggle(this.canvas);
      AR.HUD.notify(AR.Recorder.recording ? 'Enregistrement WebM démarré' : 'Enregistrement sauvegardé', AR.C.COLORS.danger);
    }
    if (In.pressed('shot')) {
      AR.Recorder.screenshot(this.canvas);
      AR.HUD.notify('Capture d\'écran enregistrée');
    }
    if (In.pressed('log')) {
      AR.EventLog.download('manual');
      AR.HUD.notify('Journal de combat exporté');
    }
    // bascule du mode démo en pleine partie
    if (In.pressed('demo') && this.state === 'play') {
      this.demo = !this.demo;
      AR.Input.virtual = this.demo;
      AR.DemoAI.reset(false);
      if (!this.demo) { this.speed = 1; AR.Input.setVirtual({}); }
      AR.HUD.notify(this.demo ? 'Mode démo : l\'IA prend les commandes' : 'Reprise en main', AR.C.COLORS.spirit);
    }
    if (this.demo) {
      const speedSteps = AR.C.SPEED_STEPS;
      if (In.pressed('speedUp')) {
        const i = speedSteps.indexOf(this.speed);
        this.speed = speedSteps[Math.min(speedSteps.length - 1, i + 1)];
        AR.HUD.notify('Vitesse ×' + this.speed);
      }
      if (In.pressed('speedDown')) {
        const i = speedSteps.indexOf(this.speed);
        this.speed = speedSteps[Math.max(0, i - 1)];
        AR.HUD.notify('Vitesse ×' + this.speed);
      }
    }
    if (this.state === 'play') {
      if (In.pressed('pause')) {
        if (this.spellReveal) this.spellReveal = null;
        else if (this.skillOpen) this.skillOpen = false;
        else if (this.shopOpen) this.shopOpen = false;
        else this.paused = !this.paused;
      }
      if (In.pressed('skills') && !this.paused && !this.shopOpen && !this.demo) {
        this.skillOpen = !this.skillOpen;
      }
      if (In.pressed('interact') && this.shopOpen) this.shopOpen = false;
      if (In.pressed('toggleStats')) AR.HUD.statsCollapsed = !AR.HUD.statsCollapsed;
      if (In.pressed('toggleMap')) AR.Minimap.collapsed = !AR.Minimap.collapsed;
    }
  }

  // ================================================== PAS DE SIMULATION
  step(dt) {
    this.arenaTransitionT = Math.max(0, this.arenaTransitionT - dt);
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; }
    this.stats.time += dt;
    this.veilT = Math.max(0, this.veilT - dt);
    const pl = this.player;
    const lvl = this.level;

    // pouls périodique : position/état du héros, pour visualiser les
    // déplacements (ou leur absence) entre deux événements de dégâts.
    this._logHbT = (this._logHbT || 0) - dt;
    if (this._logHbT <= 0) {
      this._logHbT = 1;
      AR.EventLog.push('player', {
        event: 'heartbeat', x: Math.round(pl.x), y: Math.round(pl.y),
        vx: Math.round(pl.vx), vy: Math.round(pl.vy), hp: pl.hp,
        onGround: pl.onGround, state: this.boss ? this.boss.state : null,
      });
    }

    AR.Audio.music(this.eraIdx, dt);
    pl.update(dt, this);

    // activation des ennemis proches de la caméra
    const camX = this.camera.x;
    for (const e of this.enemies) {
      if (!e.active && !e.dormant && Math.abs(e.centerX() - camX - AR.C.VIEW_W / 2) < AR.C.VIEW_W + 320) e.active = true;
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.dead && e.deadT > 0.6) { this.enemies.splice(i, 1); continue; }
      if (!e.active) continue;
      if (Math.abs(e.centerX() - pl.x) > 2100 && !e.isBoss) continue; // trop loin : figé
      e.update(dt, this);
    }

    AR.Projectiles.update(dt, this);
    AR.Pickups.update(dt, this);
    AR.Particles.update(dt);
    lvl.updateAmbient(dt, this.time);

    // ---- systèmes des cartes authored (rooms, ponts, triggers, encounters)
    if (lvl.authored) {
      this.currentRoom = lvl.currentRoomAt(pl.x + pl.w / 2, pl.y + pl.h / 2);
      lvl.updateDynamics(dt, this);
      lvl.updateLifts(dt, this);
      this._updateTriggers();
      this._updateEncounters(dt);
      this._suppressSafeRoomProjectiles();
    }
    AR.Minimap.update(this);

    this.camera.follow(pl, lvl, dt);

    // ---- déclenchement de l'arène du boss (par distance horizontale, comme R1-R4 ; ou par
    // profondeur `arenaStartTy` pour une carte verticale comme R5, où « avancer vers la droite »
    // n'a pas de sens — cf. TODO.md/plan R5)
    if (!this.bossTriggered && (pl.x > lvl.arenaStartTx * AR.C.TILE ||
        (lvl.arenaStartTy != null && pl.y > lvl.arenaStartTy * AR.C.TILE))) this._startBossFight();

    // ---- interactions (coffre / marchand / portail / levier)
    // Une arène verrouillée (fin de boss ou Fosse aux Bêtes) réutilise le même espace de
    // coordonnées pixel que le niveau normal (cadrage caméra + image de fond, pas un espace
    // séparé) : sans ce filtre, les coffres/marchand/portails locaux du monde normal proches
    // de l'ancrage de l'arène resteraient visibles/interactifs par-dessus l'image verrouillée.
    AR.Pickups.suppressWorld = !!(lvl.bossArena && lvl.bossArena.active);
    const lever = lvl.authored ? this._nearestLever(pl) : null;
    this.interactPrompt = AR.Pickups.nearestInteractive(pl) || lever;
    if (this.interactPrompt && AR.Input.pressed('interact') && !this.shopOpen) {
      const p = this.interactPrompt;
      if (p.type === 'chest') this.openChest(p);
      else if (p.type === 'merchant') { this.shopOpen = true; AR.Audio.sfx('ui'); }
      else if (p.type === 'portal' && p.returnTo) this._useLocalPortal(p);
      else if (p.type === 'portal') this._enterPortal();
      else if (p.type === 'lever') lvl.activateInteractable(p._int, this);
      else if (p.type === 'crank') lvl.activateLift(p._int.lift, this, p._int.targetY);
      else if (p.type === 'cannon') this._fireCannon(p._int);
    }
    // ---- refroidissement des canons (cf. `_fireCannon`)
    if (lvl.authored) for (const o of lvl.interactables) if (o.type === 'cannon' && o.cd > 0) o.cd -= dt;

    // ---- mort du joueur
    if (pl.dead) {
      this.deathT += dt;
      if (this.deathT === dt) { // première frame de mort
        AR.Audio.sfx('die');
        this.camera.shake(8, 0.6);
        AR.Particles.burst(pl.x + pl.w / 2, pl.y + pl.h / 2, 30,
          { color: [AR.C.COLORS.hp, '#fff'], speed: 300, size: 4, life: 0.8 });
      }
      if (this.deathT > 1.6) {
        this.endRun(false);
        this.state = 'gameover';
      }
    }
  }

  // ============================================ SYSTÈMES DE CARTE AUTHORED
  // Réveille les ennemis dormants (chauves-souris) quand le joueur franchit un trigger.
  _updateTriggers() {
    const lvl = this.level, pl = this.player, T = AR.C.TILE;
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
    for (const tr of lvl.triggers) {
      if (tr.fired) continue;
      const r = tr.rect;
      if (pcx > r.x * T && pcx < (r.x + r.w) * T && pcy > r.y * T && pcy < (r.y + r.h) * T) {
        tr.fired = true;
        if (tr.action === 'wakeSpawns') {
          let woke = 0;
          for (const e of this.enemies) {
            if (e.activateGroup === tr.group && !e.dead) {
              e.dormant = false; e.active = true;
              e.armEmergence(e.def.behavior === 'flyer' ? 1.1 : 1.6);
              woke++;
            }
          }
          if (woke) { AR.HUD.notify('Une présence s\'éveille...', AR.C.COLORS.textDim); AR.Audio.sfx('telegraph'); }
        } else if (tr.action === 'startRail') {
          // Chariot sur rail (R5) : défilement horizontal forcé jusqu'à `endX`, cf. `Player#update`.
          pl.riding = { speed: tr.speed || 320, endX: tr.endX * T };
          AR.HUD.notify('Le wagonnet s\'élance !', AR.C.COLORS.textDim);
          AR.Audio.sfx('gate');
        }
      }
    }
  }

  // Encounters : entrée dans le trigger -> vagues -> récompense. `gates` (barrière solide
  // temporaire) reste supporté par `setGateSolid` mais n'est plus utilisé par aucun niveau
  // (retour joueur 2026-07-27 : enfermer le héros pendant le combat piège l'IA de démo, qui
  // veut avancer et reste juste bloquée contre le mur au lieu de se battre efficacement) —
  // le joueur/l'IA peut désormais ignorer ou fuir un combat déclenché.
  _updateEncounters(dt) {
    const lvl = this.level, pl = this.player, T = AR.C.TILE;
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
    for (const enc of lvl.encounters) {
      if (enc.state === 'cleared') continue;
      if (enc.state === 'idle') {
        const tr = enc.trigger;
        if (tr && pcx > tr.x * T && pcx < (tr.x + tr.w) * T && pcy > tr.y * T && pcy < (tr.y + tr.h) * T) {
          this._startEncounter(enc);
        }
        continue;
      }
      // active : purge des morts, vague suivante ou clôture
      enc._live = enc._live.filter((e) => !e.dead);
      if (enc._live.length === 0) {
        if (enc.waves && enc.waveIdx + 1 < enc.waves.length) {
          enc.waveIdx++;
          this._spawnWave(enc, enc.waves[enc.waveIdx]);
        } else {
          this._clearEncounter(enc);
        }
      }
    }
  }

  _startEncounter(enc) {
    enc.state = 'active';
    enc.waveIdx = 0;
    enc._live = [];
    for (const g of enc.gates) this.level.setGateSolid(g, true);
    if (enc.arena) this._startGladiatorArena(enc);
    AR.HUD.notify('Embuscade !', AR.C.COLORS.danger);
    AR.Audio.sfx('gate');
    if (enc.waves && enc.waves[0]) this._spawnWave(enc, enc.waves[0]);
  }

  // Arène des Gladiateurs (encounter à waves normal, cf. `arena:'gladiator_pit'` dans
  // level_specs.js) : en plus du cycle vagues/récompense habituel, verrouille l'écran sur
  // l'arène illustrée (même traitement que `_startBossFight`, cf. Level#activateGladiatorArena
  // pour le mécanisme d'emprunt de `bossArena`) et repositionne le héros dedans. `enc._arenaGround`
  // sert ensuite à placer chaque duelliste (`_spawnWave`) puis le coffre/portail de sortie
  // (`_clearEncounter`) dans les coordonnées pixels de l'arène plutôt que celles du niveau.
  _startGladiatorArena(enc) {
    const lvl = this.level, pl = this.player;
    const scene = lvl.activateGladiatorArena();
    if (!scene) return;
    AR.Projectiles.clear();
    AR.Particles.clear();
    enc._arenaGround = scene.ground;
    const ground = scene.ground;
    pl.x = ground.x + ground.w * 0.16 - pl.w / 2;
    pl.y = ground.y - pl.h - 0.01;
    pl.vx = 0; pl.vy = 0; pl.kvx = 0;
    pl.onGround = true; pl.dashing = false; pl.jumpsUsed = 0;
    pl.lastSafe = { x: pl.x, y: pl.y };
    this.camera.x = scene.x; this.camera.y = scene.y; this.camera.lookAhead = 0;
    this.arenaTransitionT = 0.7;
    AR.HUD.banner('LA FOSSE AUX BÊTES', '5 champions vous attendent...');
    AR.Audio.sfx('bossRoar');
    this.camera.shake(6, 0.5);
  }

  _spawnWave(enc, wave) {
    const lvl = this.level, T = AR.C.TILE;
    const scale = AR.ERA_SCALE[this.eraIdx] * (1 + this.ngPlus * 0.55) * this.diff.hpMult;
    const ids = wave.ids || [];
    // Arène des Gladiateurs : un seul champion par vague, au centre du sol de l'arène
    // (coordonnées pixels de l'arène active) plutôt qu'au centre du trigger (coordonnées
    // tuiles du niveau normal, sans rapport une fois l'écran verrouillé sur l'image de fond).
    const baseX = (enc.arena && enc._arenaGround)
      ? enc._arenaGround.x + enc._arenaGround.w * 0.62
      : (enc.trigger.x + enc.trigger.w / 2) * T;
    ids.forEach((id, i) => {
      const isElite = (wave.elite && wave.elite.indexOf(id) >= 0) || !!AR.ENEMIES[id].elite;
      const x = baseX + (i - (ids.length - 1) / 2) * 3 * T;
      // sol depuis la hauteur du joueur (qui a déclenché la vague) : évite de faire
      // apparaître un ennemi dans le plafond de grotte au-dessus du sol réel (ou, dans
      // l'arène, résout automatiquement sur son sol via Level#groundYpx).
      const y = lvl.groundYAtEntity(x, this.player.y);
      const e = new AR.Enemy(id, x, y, isElite, scale);
      e.active = true;
      e.armEmergence(1.8); // sort de terre au lieu d'apparaître d'un coup
      this.enemies.push(e);
      enc._live.push(e);
    });
    AR.Audio.sfx('bossRoar');
  }

  _clearEncounter(enc) {
    enc.state = 'cleared';
    for (const g of enc.gates) this.level.setGateSolid(g, false);
    if (enc.arena && enc._arenaGround) {
      // Pas de sortie automatique : le coffre + le portail apparaissent DANS l'arène encore
      // verrouillée, le joueur choisit son moment pour repartir (portail = `exitArena`,
      // cf. `_useLocalPortal`, qui restaure la caméra/le niveau normal à l'usage).
      const ground = enc._arenaGround;
      const cy = ground.y;
      const T = AR.C.TILE, rt = enc.reward.returnTo; // returnTo en tuiles, comme localPortals
      AR.Pickups.spawn({ type: 'chest', x: ground.x + ground.w * 0.42, y: cy, opened: false,
        guaranteed: (enc.reward && enc.reward.guaranteed) || null });
      AR.Pickups.spawn({ type: 'portal', x: ground.x + ground.w * 0.58, y: cy,
        returnTo: { x: rt.x * T, y: rt.y * T }, exitArena: true });
      AR.HUD.banner('ARÈNE CONQUISE', 'Un passage s\'ouvre vers la sortie...');
      AR.Audio.sfx('portal');
    }
    if (enc.reward && enc.reward.coins) {
      AR.Pickups.coinBurst(this.player.x + this.player.w / 2, this.player.y - 20,
        Math.round(enc.reward.coins * (this.mods.goldMult || 1)), 2);
    }
    AR.HUD.notify('Zone sécurisée', AR.C.COLORS.spirit);
    AR.Audio.sfx('gate');
  }

  // Le camp (room 'safe') supprime les projectiles ennemis qui y pénètrent.
  _suppressSafeRoomProjectiles() {
    const room = this.currentRoom;
    if (!room || room.tags.indexOf('safe') < 0) return;
    const T = AR.C.TILE, R = room.rect;
    for (const p of AR.Projectiles.list.slice()) {
      if (p.friendly) continue;
      if (p.x > R.x * T && p.x < (R.x + R.w) * T && p.y > R.y * T && p.y < (R.y + R.h) * T) {
        AR.Projectiles.destroy(p, 'safe');
      }
    }
  }

  _nearestLever(pl) {
    const T = AR.C.TILE, lvl = this.level;
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
    for (const o of lvl.interactables) {
      if (o.type === 'lever') {
        if (o.oneShot && o.state === 'on') continue;
        const lx = o.x * T, ly = o.y * T;
        if (AR.U.dist(lx, ly - 10, pcx, pcy) < 70) return { type: 'lever', x: lx, y: ly, _int: o };
      } else if (o.type === 'crank') {
        const lift = lvl.lifts.find((l) => l.id === o.lift);
        if (lift && lift.state === 'moving') continue; // déjà en mouvement : rien à actionner
        const lx = o.x * T, ly = o.y * T;
        if (AR.U.dist(lx, ly - 10, pcx, pcy) < 70) return { type: 'crank', x: lx, y: ly, _int: o };
      } else if (o.type === 'cannon') {
        if (o.cd > 0) continue; // en recharge : pas d'invite tant qu'il n'est pas prêt
        const lx = o.x * T, ly = o.y * T;
        if (AR.U.dist(lx, ly - 10, pcx, pcy) < 70) return { type: 'cannon', x: lx, y: ly, _int: o };
      }
    }
    return null;
  }

  // Canon actionnable (carte authored ère 4) : tire un boulet explosif dans la direction `dir`
  // de l'interactable. Le projectile réutilise entièrement le pipeline existant (AOE via
  // `explodeR`, dégâts terrain via `hitBreakable` sur `solidAt` — cf. `Projectiles.update`) ;
  // seul le `source:'cannon'` change, pour pouvoir gater un mur `requires:'cannon'`.
  _fireCannon(o) {
    if (o.cd > 0) return;
    const T = AR.C.TILE;
    AR.Projectiles.spawn({
      x: o.x * T, y: o.y * T - 20, vx: o.dir * 520, vy: -60, g: 520,
      dmg: 70, friendly: true, explodeR: 120, kind: 'bomb', r: 10,
      source: 'cannon', owner: this.player,
    });
    o.cd = 1.4;
    AR.Audio.sfx('boom');
    this.camera.shake(5, 0.3);
  }

  // ================================================== COMBAT
  _startBossFight() {
    const lvl = this.level, pl = this.player;
    const scene = lvl.activateBossArena();
    this.bossTriggered = true;
    lvl.gateClosed = true;

    if (scene) {
      // Isole la scène de boss du contenu encore vivant sur la carte d'approche.
      this.enemies.length = 0;
      AR.Projectiles.clear();
      AR.Particles.clear();
      this.arena = { x0: scene.bounds.x0, x1: scene.bounds.x1 };
      const ground = scene.ground;
      pl.x = ground.x + ground.w * 0.22 - pl.w / 2;
      pl.y = ground.y - pl.h - 0.01;
      pl.vx = 0; pl.vy = 0; pl.kvx = 0;
      pl.onGround = true; pl.dashing = false; pl.jumpsUsed = 0;
      pl.lastSafe = { x: pl.x, y: pl.y };
      this.camera.x = scene.x;
      this.camera.y = scene.y;
      this.camera.lookAhead = 0;
      this.arenaTransitionT = 0.7;
    } else {
      this.arena = { x0: (lvl.gateTx + 1) * AR.C.TILE, x1: (lvl.tilesW - 1) * AR.C.TILE };
    }

    const bossId = lvl.era.boss;
    const footY = scene ? scene.ground.y : lvl.arenaGy * AR.C.TILE;
    this.boss = new AR.Boss(bossId, lvl.bossX, footY, this);
    this.boss.active = true;
    this.enemies.push(this.boss);
    AR.HUD.banner(this.boss.name, 'Le gardien de l\'ère vous attend...');
    AR.Audio.sfx('gate');
    AR.Audio.sfx('bossRoar');
    this.camera.shake(6, 0.5);
  }

  meleeHit(rect, dmg, opts) {
    let hits = 0;
    // murs friables authored touchés par le sabre
    if (this.level.breakableAt) {
      const T = AR.C.TILE, seen = new Set();
      for (let ty = Math.floor(rect.y / T); ty <= Math.floor((rect.y + rect.h) / T); ty++) {
        for (let tx = Math.floor(rect.x / T); tx <= Math.floor((rect.x + rect.w) / T); tx++) {
          const b = this.level.breakableAt(tx, ty);
          if (b && !seen.has(b)) { seen.add(b); this.level.hitBreakable(b, dmg, this, 'melee'); }
        }
      }
    }
    for (const e of this.enemies) {
      if (e.dead || !e.active || e.emergeT > 0) continue;
      if (AR.U.rectsOverlap(rect, e.getRect())) {
        this.hitEnemy(e, dmg, opts);
        hits++;
      }
    }
    // bien synchronisé, un coup de sabre détruit les projectiles ennemis
    for (const p of AR.Projectiles.list.slice()) {
      if (p.friendly) continue;
      if (p.x > rect.x - p.r && p.x < rect.x + rect.w + p.r &&
          p.y > rect.y - p.r && p.y < rect.y + rect.h + p.r) {
        if (AR.Projectiles.destroy(p, 'parry')) {
          this.player.spirit = Math.min(this.player.stats.maxSpirit, this.player.spirit + 5);
          this.hitStop(0.04);
        }
      }
    }
    return hits;
  }

  hitEnemy(e, dmg, opts) {
    opts = opts || {};
    const pl = this.player;
    let crit = Math.random() < pl.stats.crit;
    let final = dmg * (crit ? AR.C.PLAYER.CRIT_MULT : 1);
    final = Math.max(1, Math.round(final * (0.92 + Math.random() * 0.16)));
    const dealt = e.takeDamage(final, {
      fromX: opts.fromX !== undefined ? opts.fromX : (opts.proj ? opts.proj.x - AR.U.sign(opts.proj.vx) * 20 : pl.x),
      knockX: opts.knockX, pierceBlock: opts.pierceBlock,
    }, this);
    if (dealt > 0) {
      AR.Particles.text(e.centerX(), e.y - 6, String(dealt), crit ? AR.C.COLORS.impact : '#fff', crit);
      AR.Particles.burst(e.centerX(), e.centerY(), crit ? 10 : 5,
        { color: crit ? AR.C.COLORS.impact : AR.C.COLORS.hp, speed: 170, size: 3, life: 0.35, type: 'spark' });
      AR.Audio.sfx(crit ? 'crit' : 'hit');
      AR.EventLog.push('player', {
        event: 'attack_hit', target: e.spriteId || e.id, dealt, crit,
        targetHp: e.hp, targetDead: e.dead,
        px: Math.round(pl.x), py: Math.round(pl.y),
      });
    }
    return dealt;
  }

  hitPlayer(dmg, fromX, ignoreIframes) {
    const final = Math.round(dmg * (this.mods.enemyDmg || 1));
    const dealt = this.player.takeDamage(final, fromX, ignoreIframes);
    if (dealt > 0) {
      this.camera.shake(4, 0.25);
      AR.Particles.text(this.player.x + this.player.w / 2, this.player.y - 10, '-' + dealt, AR.C.COLORS.hp);
      // meilleur effort d'identification de la source : l'ennemi le plus
      // proche du point d'origine du coup (fromX), aucun appelant ne passe
      // sa propre référence à hitPlayer.
      let source = null, bestD = 60;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.abs(e.centerX() - fromX);
        if (d < bestD) { bestD = d; source = e; }
      }
      AR.EventLog.push('enemy', {
        event: 'damage_taken', source: source ? (source.spriteId || source.id) : null,
        dealt, hpLeft: this.player.hp, playerDead: this.player.dead,
        px: Math.round(this.player.x), py: Math.round(this.player.y),
      });
    }
    return dealt;
  }

  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }

  nearestEnemy(x, y, maxD) {
    let best = null, bd = maxD || 1e9;
    for (const e of this.enemies) {
      if (e.dead || !e.active || e.emergeT > 0) continue;
      const d = AR.U.dist(x, y, e.centerX(), e.centerY());
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  awardXP(amount, x, y) {
    amount = Math.max(1, Math.round(amount * (this.diff.xpMult || 1)));
    this.player.addXP(amount, this);
    AR.Particles.text(x, y, '+' + amount + ' XP', AR.C.COLORS.xp);
    if (this.demo && this.player.skillPoints > 0) this.buySkillAuto();
  }

  addCoins(n) {
    this.coins += n;
    this.stats.coinsEarned += n;
  }

  // ================================================== BUTIN & COFFRES
  openChest(chest) {
    chest.opened = true;
    AR.Audio.sfx('chest');
    const gm = this.mods.goldMult || 1;
    AR.Pickups.coinBurst(chest.x, chest.y - 14, Math.round((10 + Math.random() * 10) * gm * (chest.high ? 1.8 : 1)), 2);
    AR.Particles.burst(chest.x, chest.y - 16, 16, { color: [AR.C.COLORS.gold, '#fff'], speed: 200, size: 3, life: 0.6, up: 160 });
    const pl = this.player;
    // récompense garantie (ex. coffre de la grotte secrète SEC_STONE_04) : pas de tirage aléatoire
    if (chest.guaranteed === 'skillPoint') {
      pl.skillPoints++;
      AR.HUD.notify('📜 Trésor de la grotte : +1 point de compétence !', AR.C.COLORS.xp);
      return;
    }
    if (chest.guaranteed === 'swordUp' || chest.guaranteed === 'bowUp') {
      const tierKey = chest.guaranteed === 'swordUp' ? 'swordTier' : 'bowTier';
      const weapons = chest.guaranteed === 'swordUp' ? AR.WEAPONS.sword : AR.WEAPONS.bow;
      const icon = chest.guaranteed === 'swordUp' ? '⚔' : '🏹';
      if (pl[tierKey] < 5) {
        pl[tierKey]++;
        AR.HUD.notify(icon + ' Nouvelle arme : ' + weapons[pl[tierKey]].name + ' !', AR.C.COLORS.impact);
        pl.recalcStats(this);
      } else {
        AR.Pickups.coinBurst(chest.x, chest.y - 14, 40, 3); // déjà au max : compensation en or
      }
      return;
    }
    // coffres perchés : le butin récompense toujours l'escalade
    if (chest.high) {
      const r2 = Math.random();
      if (r2 < 0.45 && (pl.swordTier < 5 || pl.bowTier < 5)) {
        if ((Math.random() < 0.5 && pl.swordTier < 5) || pl.bowTier >= 5) {
          pl.swordTier++;
          AR.HUD.notify('⚔ Nouvelle lame : ' + AR.WEAPONS.sword[pl.swordTier].name + ' !', AR.C.COLORS.impact);
        } else {
          pl.bowTier++;
          AR.HUD.notify('🏹 Nouvel arc : ' + AR.WEAPONS.bow[pl.bowTier].name + ' !', AR.C.COLORS.spirit);
        }
      } else if (r2 < 0.75) {
        pl.skillPoints++;
        AR.HUD.notify('📜 Parchemin ancien : +1 point de compétence !', AR.C.COLORS.xp);
      } else {
        const trinkets = [
          ['crit', 'Amulette du prédateur : critique +10%'],
          ['speed', 'Bottes de célérité : vitesse +10%'],
          ['hpUp', 'Cœur robuste : PV max +25'],
          ['spiritUp', 'Talisman spirituel : esprit max +30'],
        ];
        const [k, label] = trinkets[Math.floor(Math.random() * trinkets.length)];
        pl.buffs[k]++;
        AR.HUD.notify('✨ ' + label, AR.C.COLORS.magic);
      }
      pl.recalcStats(this);
      return;
    }
    // ère 1 : beaucoup moins de trésors "puissance" (crans d'arme/parchemin/babiole) dans les
    // coffres normaux — retour joueur : trop de variété trop tôt, cf. section Économie du TODO.
    // Les coffres garantis (grotte secrète, mini-boss) ne sont pas concernés (branche ci-dessus).
    const r = Math.random();
    if (this.eraIdx === 0) {
      if (r < 0.40) { AR.Pickups.drop('potionDrop', chest.x, chest.y - 10); return; }
      if (r < 0.78) { AR.Pickups.drop('heart', chest.x, chest.y - 10); return; }
      if (r < 0.86) {
        if (Math.random() < 0.5 && pl.swordTier < 5) {
          pl.swordTier++;
          AR.HUD.notify('⚔ Nouvelle lame : ' + AR.WEAPONS.sword[pl.swordTier].name + ' !', AR.C.COLORS.impact);
        } else if (pl.bowTier < 5) {
          pl.bowTier++;
          AR.HUD.notify('🏹 Nouvel arc : ' + AR.WEAPONS.bow[pl.bowTier].name + ' !', AR.C.COLORS.spirit);
        } else {
          AR.Pickups.coinBurst(chest.x, chest.y - 14, 14, 3);
        }
        pl.recalcStats(this);
        return;
      }
      if (r < 0.93) {
        pl.skillPoints++;
        AR.HUD.notify('📜 Parchemin ancien : +1 point de compétence !', AR.C.COLORS.xp);
        return;
      }
      const trinkets = [
        ['crit', 'Amulette du prédateur : critique +10%'],
        ['speed', 'Bottes de célérité : vitesse +10%'],
        ['hpUp', 'Cœur robuste : PV max +25'],
        ['spiritUp', 'Talisman spirituel : esprit max +30'],
      ];
      const [k, label] = trinkets[Math.floor(Math.random() * trinkets.length)];
      pl.buffs[k]++;
      pl.recalcStats(this);
      AR.HUD.notify('✨ ' + label, AR.C.COLORS.magic);
      return;
    }
    if (r < 0.22) {
      AR.Pickups.drop('potionDrop', chest.x, chest.y - 10);
    } else if (r < 0.42) {
      AR.Pickups.drop('heart', chest.x, chest.y - 10);
    } else if (r < 0.62) {
      // amélioration d'arme
      if (Math.random() < 0.5 && pl.swordTier < 5) {
        pl.swordTier++;
        AR.HUD.notify('⚔ Nouvelle lame : ' + AR.WEAPONS.sword[pl.swordTier].name + ' !', AR.C.COLORS.impact);
      } else if (pl.bowTier < 5) {
        pl.bowTier++;
        AR.HUD.notify('🏹 Nouvel arc : ' + AR.WEAPONS.bow[pl.bowTier].name + ' !', AR.C.COLORS.spirit);
      } else {
        AR.Pickups.coinBurst(chest.x, chest.y - 14, 14, 3);
      }
      pl.recalcStats(this);
    } else if (r < 0.78) {
      pl.skillPoints++;
      AR.HUD.notify('📜 Parchemin ancien : +1 point de compétence !', AR.C.COLORS.xp);
    } else {
      const trinkets = [
        ['crit', 'Amulette du prédateur : critique +10%'],
        ['speed', 'Bottes de célérité : vitesse +10%'],
        ['hpUp', 'Cœur robuste : PV max +25'],
        ['spiritUp', 'Talisman spirituel : esprit max +30'],
      ];
      const [k, label] = trinkets[Math.floor(Math.random() * trinkets.length)];
      pl.buffs[k]++;
      pl.recalcStats(this);
      AR.HUD.notify('✨ ' + label, AR.C.COLORS.magic);
    }
  }

  // ================================================== BOUTIQUE
  _genShopStock() {
    const rng = AR.rng(this.runSeed + this.eraIdx * 31 + 7);
    const pool = AR.U.shuffle(rng, AR.SHOP_POOL.filter((it) => it.id !== 'potion'));
    const stock = [AR.SHOP_POOL[0], ...pool.slice(0, 3)];
    const inflate = 1 + this.eraIdx * 0.18;
    this.shopStock = stock.map((it) => ({
      ...it,
      price: Math.round(it.price * inflate * (this.mods.shopDiscount || 1)),
      sold: false,
    }));
    this.mods.shopDiscount = 1; // la remise "marché noir" ne vaut qu'une fois
  }

  buyShopItem(i) {
    const item = this.shopStock[i];
    if (!item || item.sold || this.coins < item.price) { AR.Audio.sfx('error'); return false; }
    const pl = this.player;
    // achats à effets uniques impossibles ?
    if (item.id === 'potion' && pl.potions >= pl.potionMax) { AR.HUD.notify('Potions déjà au maximum'); return false; }
    if (item.id === 'swordUp' && pl.swordTier >= 5) { AR.HUD.notify('Épée déjà au maximum'); return false; }
    if (item.id === 'bowUp' && pl.bowTier >= 5) { AR.HUD.notify('Arc déjà au maximum'); return false; }
    this.coins -= item.price;
    item.sold = item.id !== 'potion' || pl.potions + 1 >= pl.potionMax;
    AR.Audio.sfx('buy');
    switch (item.id) {
      case 'potion': pl.potions++; break;
      case 'fullheal': pl.heal(pl.maxHp); break;
      case 'swordUp': pl.swordTier++; AR.HUD.notify('⚔ ' + AR.WEAPONS.sword[pl.swordTier].name + ' !', AR.C.COLORS.impact); break;
      case 'bowUp': pl.bowTier++; AR.HUD.notify('🏹 ' + AR.WEAPONS.bow[pl.bowTier].name + ' !', AR.C.COLORS.spirit); break;
      case 'crit': pl.buffs.crit++; break;
      case 'hpUp': pl.buffs.hpUp++; break;
      case 'spiritUp': pl.buffs.spiritUp++; break;
      case 'speed': pl.buffs.speed++; break;
      case 'scroll': pl.skillPoints++; break;
    }
    pl.recalcStats(this);
    return true;
  }

  shopAutoBuy() {
    // Profil équilibré : l'affinité ne change que l'ordre des achats lorsque
    // l'or est rare. Avec un gros surplus, toute amélioration permanente est prise.
    const pl = this.player;
    const focus = AR.DemoAI.buildFocus || 'balanced';
    const reserve = 80 + this.eraIdx * 30;
    const surplus = this.coins >= 500 + this.eraIdx * 120;
    const permanent = new Set(['swordUp', 'bowUp', 'crit', 'hpUp', 'spiritUp', 'speed', 'scroll']);
    const focusItems = {
      melee: new Set(['swordUp', 'hpUp', 'crit']),
      ranged: new Set(['bowUp', 'speed', 'crit']),
      spirit: new Set(['spiritUp', 'scroll', 'hpUp']),
    }[focus] || new Set();
    const baseScore = {
      scroll: 115, swordUp: 105, bowUp: 105, hpUp: 95,
      spiritUp: 90, crit: 85, speed: 80,
    };

    // Soin urgent avant les investissements.
    const healIdx = this.shopStock.findIndex((item) => item.id === 'fullheal' && !item.sold);
    if (healIdx >= 0 && pl.hp < pl.maxHp * 0.65 &&
        this.coins >= this.shopStock[healIdx].price + (surplus ? 0 : reserve / 2)) {
      this.buyShopItem(healIdx);
    }

    // Remplir les emplacements de potion si la réserve d'or le permet.
    const potionIdx = this.shopStock.findIndex((item) => item.id === 'potion' && !item.sold);
    if (potionIdx >= 0 && (surplus || pl.hp < pl.maxHp * 0.8)) {
      let guard = 0;
      while (pl.potions < pl.potionMax && guard++ < pl.potionMax &&
             this.coins >= this.shopStock[potionIdx].price + (surplus ? 0 : reserve)) {
        if (!this.buyShopItem(potionIdx)) break;
      }
    }

    const upgrades = this.shopStock.map((item, i) => ({ item, i }))
      .filter(({ item }) => !item.sold && permanent.has(item.id) &&
        !(item.id === 'swordUp' && pl.swordTier >= 5) &&
        !(item.id === 'bowUp' && pl.bowTier >= 5))
      .sort((a, b) => {
        const score = ({ item }) => (baseScore[item.id] || 0) +
          (focusItems.has(item.id) ? 25 : 0) +
          (item.id === 'swordUp' && pl.swordTier < pl.bowTier ? 15 : 0) +
          (item.id === 'bowUp' && pl.bowTier < pl.swordTier ? 15 : 0) +
          (item.id === 'hpUp' && pl.hp < pl.maxHp * 0.7 ? 20 : 0);
        return score(b) - score(a);
      });

    for (const { item, i } of upgrades) {
      if (this.coins < item.price) continue;
      if (surplus || this.coins - item.price >= reserve) this.buyShopItem(i);
    }
    if (this.merchantPickup) this.merchantPickup.used = true;
  }

  // ================================================== COMPÉTENCES
  buySkill(nodeId) {
    const pl = this.player;
    const branch = AR.SKILLS.find((b) => b.nodes.some((n) => n.id === nodeId));
    if (!branch || pl.skills.has(nodeId)) return false;
    const idx = branch.nodes.findIndex((n) => n.id === nodeId);
    const node = branch.nodes[idx];
    if (idx > 0 && !pl.skills.has(branch.nodes[idx - 1].id)) return false;
    if (pl.skillPoints < node.cost) return false;
    pl.skillPoints -= node.cost;
    pl.skills.add(nodeId);
    pl.recalcStats(this);
    AR.Audio.sfx('skill');
    AR.HUD.notify('★ Compétence : ' + node.name + ' (-' + node.cost + ' pt' + (node.cost > 1 ? 's' : '') + ')', AR.C.COLORS.xp);
    if (nodeId === 'spirit1') {
      AR.HUD.notify('Sorts 1 et 2 débloqués !', AR.C.COLORS.magic);
      if (!this.demo) this.spellReveal = [0, 1];
    }
    if (nodeId === 'spirit3') {
      AR.HUD.notify('Sorts 3 et 4 débloqués !', AR.C.COLORS.magic);
      if (!this.demo) this.spellReveal = [2, 3];
    }
    return true;
  }

  buySkillAuto() {
    const order = ['blade1', 'bow1', 'body1', 'spirit1', 'blade3', 'bow2', 'body2', 'spirit2',
      'blade2', 'bow3', 'body3', 'spirit3', 'blade4', 'bow4', 'body4', 'spirit4'];
    for (const id of order) {
      if (this.player.skillPoints <= 0) break;
      if (this.player.skills.has(id)) continue;
      // vérifier le prérequis de branche
      const branch = AR.SKILLS.find((b) => b.nodes.some((n) => n.id === id));
      const idx = branch.nodes.findIndex((n) => n.id === id);
      if (idx > 0 && !this.player.skills.has(branch.nodes[idx - 1].id)) continue;
      if (this.player.skillPoints < branch.nodes[idx].cost) continue;
      this.buySkill(id);
    }
  }

  // ================================================== BOSS & FAILLES
  onBossDeath() {
    this.level.gateClosed = false;
    this.stats.bosses++;
    // Sbires invoqués (ex. summon:lantern_wisp) encore en vie à la mort du boss : sans ça,
    // un survivant peut coincer l'IA de démo en boucle de repli contre le bord de l'arène,
    // sans jamais l'engager ni rejoindre le portail (trouvé en testant R3/Seigneur Yōkai).
    for (const e of this.enemies) if (!e.isBoss && !e.dead) e.die(this, true);
    const footY = this.level.bossArena && this.level.bossArena.active
      ? this.level.bossArena.ground.y : this.level.arenaGy * AR.C.TILE;
    AR.Pickups.spawn({ type: 'portal', x: this.level.portalX, y: footY });
    AR.HUD.banner('GARDIEN VAINCU', 'La faille vers l\'ère suivante s\'ouvre...');
    AR.Audio.sfx('portal');
    const rec = AR.Save.data.records;
    rec.bestEra = Math.max(rec.bestEra, this.eraIdx);
    AR.Save.save();
  }

  // Remontée depuis une poche secrète (ex. la grotte de S08) : téléportation immédiate à la
  // surface, sans changement d'état/d'ère — contrairement à `_enterPortal`, qui ne s'utilise
  // qu'une fois (le joueur change de niveau), celui-ci reste utilisable à volonté.
  _useLocalPortal(p) {
    const pl = this.player;
    // Sortie de l'Arène des Gladiateurs (`exitArena`, cf. `_clearEncounter`) : referme
    // l'emprunt de `bossArena` avant de téléporter, sinon le héros réapparaîtrait hors
    // caméra normale tout en restant "dans" l'arène verrouillée (Camera#follow, moveRect...
    // continueraient de lire ses bornes).
    if (p.exitArena) this.level.deactivateGladiatorArena();
    pl.x = p.returnTo.x - pl.w / 2;
    pl.y = p.returnTo.y - pl.h;
    pl.vx = 0; pl.vy = 0;
    AR.Audio.sfx('portal');
    AR.Particles.burst(pl.x + pl.w / 2, pl.y + pl.h / 2, 20,
      { color: [AR.C.COLORS.spirit, '#fff'], speed: 220, size: 4, life: 0.5 });
  }

  _enterPortal() {
    AR.Audio.sfx('portal');
    if (this.eraIdx >= 5) {
      this.endRun(true);
      this.state = 'victory';
      return;
    }
    // trois choix de faille
    const rng = AR.rng(this.runSeed + this.eraIdx * 197 + 13);
    this.riftChoices = AR.U.shuffle(rng, AR.RIFTS).slice(0, 3);
    this.state = 'rift';
    AR.DemoAI.uiT = 0;
  }

  riftPick(i) {
    const rift = this.riftChoices[i];
    const pl = this.player;
    switch (rift.id) {
      case 'forge':
        if (Math.random() < 0.5 && pl.swordTier < 5) pl.swordTier++;
        else if (pl.bowTier < 5) pl.bowTier++;
        else if (pl.swordTier < 5) pl.swordTier++;
        AR.HUD.notify('⚔ ' + AR.WEAPONS.sword[pl.swordTier].name + ' / ' + AR.WEAPONS.bow[pl.bowTier].name);
        break;
      case 'sanctuary': pl.heal(Math.round(pl.maxHp * 0.6)); break;
      case 'blood': this.mods.hpMult *= 0.8; this.mods.dmgMult *= 1.4; break;
      case 'market': this.addCoins(120); this.mods.shopDiscount = 0.7; break;
      case 'meditation': pl.skillPoints += 2; break;
      case 'chrono': this.mods.chargeMult *= 0.8; break;
      case 'goldcurse': this.mods.goldMult *= 1.8; this.mods.enemyDmg *= 1.25; break;
      case 'echo': this.mods.spiritBonus += 40; if (pl.potions < pl.potionMax) pl.potions++; break;
    }
    pl.recalcStats(this);
    AR.HUD.notify('Faille : ' + rift.name, AR.C.COLORS.spirit);
    this.eraIdx++;
    this.loadLevel();
    this.state = 'play';
  }

  // ================================================== RENDU
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);

    if (this.state === 'title') { AR.UI.beginFrame(); AR.UI.drawTitle(ctx, this); return; }
    if (this.state === 'help') { AR.UI.beginFrame(); AR.UI.drawHelp(ctx, this); return; }
    if (this.state === 'rift') { AR.UI.beginFrame(); AR.UI.drawRift(ctx, this); return; }
    if (this.state === 'saves') { AR.UI.beginFrame(); AR.UI.drawSaves(ctx, this); return; }

    // monde
    const cam = this.camera, lvl = this.level;
    const inBossArena = lvl.bossArena && lvl.bossArena.active;
    if (inBossArena) lvl.drawBossArena(ctx, cam);
    else {
      lvl.drawBackground(ctx, cam);
      lvl.drawTerrain(ctx, cam);
      lvl.drawProps(ctx, cam, this.time);
      // Le voile des poches sombres doit assombrir le DÉCOR, pas les personnages : appliqué ici,
      // avant les pickups/ennemis/héros, jamais après (retour joueur 2026-07-27 : "les personnages
      // sont noircis, c'est moche" — c'était un filtre plaqué par-dessus tout le monde, alors que
      // le rendu de la roche/des stalactites suffit déjà à donner l'ambiance grotte).
      lvl.drawDarkZones(ctx, cam);
    }
    AR.Pickups.draw(ctx, cam, this.time, lvl.era);
    for (const e of this.enemies) e.draw(ctx, cam, this.time);
    if (this.boss && this.boss.drawBeam) this.boss.drawBeam(ctx, cam);
    this.player.draw(ctx, cam, this);
    AR.Projectiles.draw(ctx, cam);
    AR.Particles.draw(ctx, cam);
    lvl.drawAmbient(ctx);

    // teinte du Voile temporel
    if (this.veilT > 0) {
      ctx.fillStyle = 'rgba(120,60,220,' + (0.10 + Math.min(0.06, this.veilT * 0.02)) + ')';
      ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
    }
    // vignette
    const vg = ctx.createRadialGradient(AR.C.VIEW_W / 2, AR.C.VIEW_H / 2, AR.C.VIEW_H * 0.45,
      AR.C.VIEW_W / 2, AR.C.VIEW_H / 2, AR.C.VIEW_H * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
    // flash de dégâts au bord de l'écran
    if (this.player.flash > 0.3) {
      ctx.fillStyle = 'rgba(232,69,69,' + this.player.flash * 0.18 + ')';
      ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
    }
    if (this.arenaTransitionT > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, this.arenaTransitionT / 0.45) + ')';
      ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
    }

    AR.HUD.draw(ctx, this);
    AR.Minimap.draw(ctx, this);

    // overlays
    AR.UI.beginFrame();
    if (this.state === 'gameover') { AR.UI.drawEnd(ctx, this, false); return; }
    if (this.state === 'victory') { AR.UI.drawEnd(ctx, this, true); return; }
    if (this.spellReveal) AR.UI.drawSpellReveal(ctx, this);
    else if (this.skillOpen) AR.UI.drawSkills(ctx, this);
    else if (this.shopOpen) AR.UI.drawShop(ctx, this);
    else if (this.paused) AR.UI.drawPause(ctx, this);
  }
};
