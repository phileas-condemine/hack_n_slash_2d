// Arcane Rift - IA du mode démo : joue, combat, achète, choisit les failles
window.AR = window.AR || {};

AR.DemoAI = {
  decideT: 0,          // petit délai entre certaines décisions
  bowPlan: 0,          // >0 : on maintient l'arc (charge en cours)
  swordPlan: 0,        // >0 : on maintient l'épée
  uiT: 0,

  reset() {
    this.decideT = 0; this.bowPlan = 0; this.swordPlan = 0; this.uiT = 0;
  },

  // Appelé à chaque pas de simulation quand le mode démo est actif.
  update(game, dt) {
    const a = {};   // actions virtuelles
    const pl = game.player;
    let aimX = pl.x + pl.facing * 300, aimY = pl.y + 20;

    // ---------- écrans / overlays : l'IA valide toute seule
    if (game.state === 'rift') {
      this.uiT += dt;
      if (this.uiT > 1.1) { game.riftPick(Math.floor(Math.random() * game.riftChoices.length)); this.uiT = 0; }
      AR.Input.setVirtual(a, aimX, aimY);
      return;
    }
    if (game.state === 'gameover' || game.state === 'victory') {
      this.uiT += dt;
      if (this.uiT > 2.5) { this.uiT = 0; game.newRun(true); }
      AR.Input.setVirtual(a, aimX, aimY);
      return;
    }
    if (game.state !== 'play') { AR.Input.setVirtual(a, aimX, aimY); return; }
    if (game.shopOpen) {
      this.uiT += dt;
      if (this.uiT > 0.8) { game.shopAutoBuy(); game.shopOpen = false; this.uiT = 0; }
      AR.Input.setVirtual(a, aimX, aimY);
      return;
    }
    if (pl.dead) { AR.Input.setVirtual(a, aimX, aimY); return; }

    // ---------- dépense automatique des points de compétence
    if (pl.skillPoints > 0) game.buySkillAuto();

    this.decideT -= dt;
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;

    // ---------- perception
    let target = null, td = 1e9;
    for (const e of game.enemies) {
      if (e.dead || !e.active) continue;
      const d = AR.U.dist(pcx, pcy, e.centerX(), e.centerY());
      const score = d - (e.isBoss ? 250 : 0);
      if (score < td && d < 720) { td = score; target = e; }
    }
    const realTd = target ? AR.U.dist(pcx, pcy, target.centerX(), target.centerY()) : 1e9;

    // projectile ennemi dangereux ?
    let threat = null;
    for (const p of AR.Projectiles.list) {
      if (p.friendly) continue;
      const d = AR.U.dist(pcx, pcy, p.x, p.y);
      if (d < 150 && (p.vx * (pcx - p.x) + p.vy * (pcy - p.y)) > 0) { threat = p; break; }
    }

    // ---------- objectif de déplacement
    let goalX = null;
    const interactive = AR.Pickups.nearestInteractive(pl);
    const portal = AR.Pickups.list.find((p) => p.type === 'portal');
    const chest = AR.Pickups.list.find((p) => p.type === 'chest' && !p.opened &&
      Math.abs(p.x - pcx) < 460 && p.x > pcx - 200);
    const wantShop = game.merchantPickup && !game.merchantPickup.used &&
      Math.abs(game.merchantPickup.x - pcx) < 520 &&
      (pl.hp < pl.maxHp * 0.75 || game.coins > 130);

    if (portal) goalX = portal.x;
    else if (target && (target.isBoss || realTd < 520)) goalX = null; // on combat sur place
    else if (chest) goalX = chest.x;
    else if (wantShop) goalX = game.merchantPickup.x;
    else goalX = pl.x + 400; // avancer vers la droite

    // ---------- interaction
    if (interactive && (!target || realTd > 240 || interactive.type === 'portal')) {
      a.interact = Math.random() < 0.5; // press "naturel" sur ~2 pas
    }

    // ---------- survie
    if (pl.hp < pl.maxHp * 0.35 && pl.potions > 0) a.potion = true;

    // esquive : menace proche ou télégraphe adverse
    const telegraphed = target && (target.state === 'tele' || target.state === 'charge') && realTd < 230;
    if ((threat || telegraphed) && this.decideT <= 0) {
      if (Math.random() < 0.55) a.dash = true;
      else a.jump = true;
      this.decideT = 0.4;
    }

    // ---------- combat
    if (target) {
      const ex = target.centerX(), ey = target.centerY();
      aimX = ex + (target.vx || 0) * 0.15; aimY = ey;
      const dx = ex - pcx;

      // sorts si disponibles
      const nearCount = game.enemies.filter((e) => !e.dead && e.active &&
        AR.U.dist(pcx, pcy, e.centerX(), e.centerY()) < 210).length;
      if (pl.spellUnlocked(0) && nearCount >= 2 && pl.spirit > 40) a.spell1 = true;
      else if (pl.spellUnlocked(2) && target.isBoss && pl.spirit > 70 && Math.random() < 0.02) a.spell3 = true;
      else if (pl.spellUnlocked(1) && realTd > 260 && realTd < 560 && pl.spirit > 60 && Math.random() < 0.03) a.spell2 = true;

      if (realTd < 135) {
        // corps à corps : enchaîner les coups, parfois une chargée
        if (this.swordPlan > 0) {
          this.swordPlan -= dt;
          a.sword = this.swordPlan > 0.02;
        } else if (this.decideT <= 0) {
          if (Math.random() < 0.22) this.swordPlan = pl.stats.swordChargeTime + 0.12;
          else { a.sword = true; this.decideT = 0.24; }
        }
        // s'écarter des gros bras pendant leur attaque
        if (target.state === 'attack' && Math.random() < 0.3) a.dash = true;
      } else if (realTd < 700) {
        // à distance : arc, chargé si on a le temps
        if (this.bowPlan > 0) {
          this.bowPlan -= dt;
          a.bow = this.bowPlan > 0.02;
        } else if (this.decideT <= 0) {
          const safe = realTd > 300 && !telegraphed;
          if (safe) this.bowPlan = pl.stats.bowChargeTime + 0.15;
          else { a.bow = true; this.decideT = 0.35; }
        }
        // se rapprocher si trop loin, reculer si trop près d'un tireur
        if (realTd > 420 && !target.isBoss) goalX = ex - AR.U.sign(dx) * 260;
        if (realTd < 190 && target.def && ['ranged', 'artillery', 'caster'].includes(target.def.behavior)) {
          // foncer au contact des tireurs
          goalX = ex;
        }
      }
      // boss : garder une distance moyenne et frapper dans les fenêtres
      if (target.isBoss) {
        if (target.state === 'tele') goalX = pcx - AR.U.sign(dx) * 200;
        else if (realTd > 160) goalX = ex - AR.U.sign(dx) * 110;
      }
    } else {
      this.bowPlan = 0; this.swordPlan = 0;
    }

    // ---------- navigation
    if (goalX !== null && Math.abs(goalX - pcx) > 30) {
      const dir = AR.U.sign(goalX - pcx);
      if (dir > 0) a.right = true; else a.left = true;
      // sprint si longue distance sans danger
      if (Math.abs(goalX - pcx) > 300 && !target) a.dash = pl.dashHeld > 0 || Math.random() < 0.1 ? true : a.dash;

      // sauter les trous et les marches
      const lvl = game.level;
      const aheadX = pcx + dir * 62;
      const aheadG = lvl.groundYpx(aheadX);
      const hereG = lvl.groundYpx(pcx);
      const pit = aheadG > AR.C.WORLD_H * AR.C.TILE;      // vide devant
      const wall = hereG - aheadG > AR.C.TILE * 0.8;      // marche montante
      if (pl.onGround && (pit || wall)) a.jump = true;
      // double saut de rattrapage au-dessus du vide
      if (!pl.onGround && pl.vy > 120 && pl.jumpsUsed === 1 &&
          lvl.groundYpx(pcx + dir * 30) > AR.C.WORLD_H * AR.C.TILE) {
        a.jump = true;
      }
      // monter sur les plateformes vers un coffre
      if (chest && goalX === chest.x && chest.y < pl.y - 40 && pl.onGround && Math.abs(chest.x - pcx) < 120) {
        a.jump = true;
      }
    }

    AR.Input.setVirtual(a, aimX, aimY);
  },
};
