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
    this.demo = false;
    this.speed = 1;             // ×1 ×2 ×4 ×8 (mode démo)
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
    this.coins = 0;
    this.mods = {};
    this.stats = { kills: 0, time: 0, coinsEarned: 0, bosses: 0 };
    this.interactPrompt = null;
    this.deathT = 0;
    this.merchantPickup = null;
    this.runSeed = (Math.random() * 1e9) | 0;
    // difficulté (persistée entre les sessions)
    this.diffIdx = AR.U.clamp(AR.Save.data.settings.difficulty | 0, 0, AR.DIFFICULTIES.length - 1);
    this.diff = AR.DIFFICULTIES[this.diffIdx];
  }

  setDifficulty(i) {
    this.diffIdx = AR.U.clamp(i, 0, AR.DIFFICULTIES.length - 1);
    this.diff = AR.DIFFICULTIES[this.diffIdx];
    AR.Save.data.settings.difficulty = this.diffIdx;
    AR.Save.save();
  }

  // ================================================== CYCLE DE VIE D'UNE RUN
  newRun(demo) {
    this.demo = demo;
    AR.Input.virtual = demo;
    AR.DemoAI.reset(true);
    if (!demo) this.speed = 1;
    this.ngPlus = 0;
    this.eraIdx = 0;
    this.runSeed = (Math.random() * 1e9) | 0;
    this.player = new AR.Player(0, 0);
    this.coins = 60;
    this.diff = AR.DIFFICULTIES[this.diffIdx];
    this.mods = {
      dmgMult: 1, hpMult: 1, chargeMult: 1,
      goldMult: this.diff.goldMult, enemyDmg: this.diff.dmgMult,
      shopDiscount: 1, spiritBonus: 0,
    };
    this.player.recalcStats(this);
    this.player.hp = this.player.maxHp;
    this.stats = { kills: 0, time: 0, coinsEarned: 0, bosses: 0 };
    AR.Save.data.records.runs++;
    AR.Save.save();
    this.loadLevel();
    this.state = 'play';
    this.paused = false; this.skillOpen = false; this.shopOpen = false;
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
    this.deathT = 0;
    this.veilT = 0;
    this.bossTriggered = false;

    // multiplicateur de difficulté (ère + NG+ + niveau de difficulté choisi)
    const scale = AR.ERA_SCALE[this.eraIdx] * (1 + this.ngPlus * 0.55) * this.diff.hpMult;
    for (const s of lvl.spawns) {
      const e = new AR.Enemy(s.id, s.x, s.y, s.elite, scale);
      e.onPlatform = !!s.onPlatform;
      this.enemies.push(e);
    }
    for (const c of lvl.chestSpots) {
      AR.Pickups.spawn({ type: 'chest', x: c.x, y: c.y, opened: false, high: !!c.high });
    }
    this.merchantPickup = AR.Pickups.spawn({ type: 'merchant', x: lvl.merchantX, y: lvl.groundYpx(lvl.merchantX), used: false });

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
    // bascule du mode démo en pleine partie
    if (In.pressed('demo') && this.state === 'play') {
      this.demo = !this.demo;
      AR.Input.virtual = this.demo;
      AR.DemoAI.reset(false);
      if (!this.demo) { this.speed = 1; AR.Input.setVirtual({}); }
      AR.HUD.notify(this.demo ? 'Mode démo : l\'IA prend les commandes' : 'Reprise en main', AR.C.COLORS.spirit);
    }
    if (this.demo) {
      if (In.pressed('speedUp')) { this.speed = Math.min(8, this.speed * 2); AR.HUD.notify('Vitesse ×' + this.speed); }
      if (In.pressed('speedDown')) { this.speed = Math.max(1, this.speed / 2); AR.HUD.notify('Vitesse ×' + this.speed); }
    }
    if (this.state === 'play') {
      if (In.pressed('pause')) {
        if (this.skillOpen) this.skillOpen = false;
        else if (this.shopOpen) this.shopOpen = false;
        else this.paused = !this.paused;
      }
      if (In.pressed('skills') && !this.paused && !this.shopOpen && !this.demo) {
        this.skillOpen = !this.skillOpen;
      }
      if (In.pressed('interact') && this.shopOpen) this.shopOpen = false;
    }
  }

  // ================================================== PAS DE SIMULATION
  step(dt) {
    if (this.hitStopT > 0) { this.hitStopT -= dt; return; }
    this.stats.time += dt;
    this.veilT = Math.max(0, this.veilT - dt);
    const pl = this.player;
    const lvl = this.level;

    AR.Audio.music(this.eraIdx, dt);
    pl.update(dt, this);

    // activation des ennemis proches de la caméra
    const camX = this.camera.x;
    for (const e of this.enemies) {
      if (!e.active && Math.abs(e.centerX() - camX - AR.C.VIEW_W / 2) < AR.C.VIEW_W + 320) e.active = true;
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
    this.camera.follow(pl, lvl, dt);

    // ---- déclenchement de l'arène du boss
    if (!this.bossTriggered && pl.x > (lvl.arenaStartTx + 3) * AR.C.TILE) {
      this.bossTriggered = true;
      lvl.gateClosed = true;
      this.arena = { x0: (lvl.gateTx + 1) * AR.C.TILE, x1: (lvl.tilesW - 1) * AR.C.TILE };
      const bossId = lvl.era.boss;
      this.boss = new AR.Boss(bossId, lvl.bossX, lvl.arenaGy * AR.C.TILE, this);
      this.boss.active = true;
      this.enemies.push(this.boss);
      AR.HUD.banner(this.boss.name, 'Le gardien de l\'ère vous attend...');
      AR.Audio.sfx('gate');
      AR.Audio.sfx('bossRoar');
      this.camera.shake(6, 0.5);
    }

    // ---- interactions
    this.interactPrompt = AR.Pickups.nearestInteractive(pl);
    if (this.interactPrompt && AR.Input.pressed('interact') && !this.shopOpen) {
      const p = this.interactPrompt;
      if (p.type === 'chest') this.openChest(p);
      else if (p.type === 'merchant') { this.shopOpen = true; AR.Audio.sfx('ui'); }
      else if (p.type === 'portal') this._enterPortal();
    }

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

  // ================================================== COMBAT
  meleeHit(rect, dmg, opts) {
    let hits = 0;
    for (const e of this.enemies) {
      if (e.dead || !e.active) continue;
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
    }
    return dealt;
  }

  hitPlayer(dmg, fromX, ignoreIframes) {
    const final = Math.round(dmg * (this.mods.enemyDmg || 1));
    const dealt = this.player.takeDamage(final, fromX, ignoreIframes);
    if (dealt > 0) {
      this.camera.shake(4, 0.25);
      AR.Particles.text(this.player.x + this.player.w / 2, this.player.y - 10, '-' + dealt, AR.C.COLORS.hp);
    }
    return dealt;
  }

  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }

  nearestEnemy(x, y, maxD) {
    let best = null, bd = maxD || 1e9;
    for (const e of this.enemies) {
      if (e.dead || !e.active) continue;
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
    const r = Math.random();
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
    if (pl.skillPoints <= 0 || pl.skills.has(nodeId)) return;
    pl.skillPoints--;
    pl.skills.add(nodeId);
    pl.recalcStats(this);
    AR.Audio.sfx('skill');
    const node = AR.SKILLS.flatMap((b) => b.nodes).find((n) => n.id === nodeId);
    AR.HUD.notify('★ Compétence : ' + node.name, AR.C.COLORS.xp);
    if (nodeId === 'spirit1') AR.HUD.notify('Sorts 1 et 2 débloqués !', AR.C.COLORS.magic);
    if (nodeId === 'spirit3') AR.HUD.notify('Sorts 3 et 4 débloqués !', AR.C.COLORS.magic);
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
      this.buySkill(id);
    }
  }

  // ================================================== BOSS & FAILLES
  onBossDeath() {
    this.level.gateClosed = false;
    this.stats.bosses++;
    AR.Pickups.spawn({ type: 'portal', x: this.level.portalX, y: this.level.arenaGy * AR.C.TILE });
    AR.HUD.banner('GARDIEN VAINCU', 'La faille vers l\'ère suivante s\'ouvre...');
    AR.Audio.sfx('portal');
    const rec = AR.Save.data.records;
    rec.bestEra = Math.max(rec.bestEra, this.eraIdx);
    AR.Save.save();
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

    // monde
    const cam = this.camera, lvl = this.level;
    lvl.drawBackground(ctx, cam);
    lvl.drawTerrain(ctx, cam);
    lvl.drawProps(ctx, cam, this.time);
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

    AR.HUD.draw(ctx, this);

    // overlays
    AR.UI.beginFrame();
    if (this.state === 'gameover') { AR.UI.drawEnd(ctx, this, false); return; }
    if (this.state === 'victory') { AR.UI.drawEnd(ctx, this, true); return; }
    if (this.skillOpen) AR.UI.drawSkills(ctx, this);
    else if (this.shopOpen) AR.UI.drawShop(ctx, this);
    else if (this.paused) AR.UI.drawPause(ctx, this);
  }
};
