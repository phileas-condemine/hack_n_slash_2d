// Arcane Rift - IA du mode démo : joue, combat, achète, choisit les failles
window.AR = window.AR || {};

AR.DemoAI = {
  decideT: 0,          // petit délai entre certaines décisions
  bowPlan: 0,          // >0 : on maintient l'arc (charge en cours)
  swordPlan: 0,        // >0 : on maintient l'épée
  jumpHoldT: 0,        // durée de maintien du saut (évite le saut coupé dès la 2e frame)
  jumpReleaseT: 0,     // brève relâche entre saut et double saut pour créer un nouvel appui
  navStuckT: 0,
  chestTarget: null,
  chestAttemptT: 0,
  chestTotalT: 0,
  chestBestD: Infinity,
  chestRetries: new WeakMap(),
  blockerMemory: new WeakMap(),
  avoidedEnemies: new WeakSet(),
  buildFocus: 'balanced',
  traversal: null,
  uiT: 0,

  reset(newRun) {
    this.decideT = 0; this.bowPlan = 0; this.swordPlan = 0;
    this.jumpHoldT = 0; this.jumpReleaseT = 0; this.navStuckT = 0;
    this.chestTarget = null; this.chestAttemptT = 0; this.chestTotalT = 0; this.chestBestD = Infinity;
    this.chestRetries = new WeakMap();
    this.blockerMemory = new WeakMap();
    this.avoidedEnemies = new WeakSet();
    this.traversal = null;
    if (newRun || !this.buildFocus) {
      const focuses = ['melee', 'ranged', 'spirit'];
      this.buildFocus = focuses[Math.floor(Math.random() * focuses.length)];
    }
    this.uiT = 0;
  },

  focusLabel() {
    return { melee: 'mêlée', ranged: 'distance', spirit: 'pouvoirs' }[this.buildFocus] || 'équilibre';
  },

  _queueJump(holdT) {
    if (this.jumpHoldT > 0 || this.jumpReleaseT > 0) return false;
    this.jumpHoldT = holdT;
    return true;
  },

  _applyJump(a, dt) {
    if (this.jumpReleaseT > 0) {
      this.jumpReleaseT = Math.max(0, this.jumpReleaseT - dt);
      return;
    }
    if (this.jumpHoldT <= 0) return;
    a.jump = true;
    this.jumpHoldT = Math.max(0, this.jumpHoldT - dt);
    if (this.jumpHoldT === 0) this.jumpReleaseT = AR.C.DT * 2;
  },

  // Le sol est prioritaire ; une plateforme ne sert de chemin que lorsqu'elle
  // couvre réellement une fosse. Cela évite de viser les plateformes décoratives.
  _supportYAt(level, x) {
    const pitLimit = AR.C.WORLD_H * AR.C.TILE;
    const groundY = level.groundYpx(x);
    if (groundY <= pitLimit) return groundY;
    let supportY = groundY;
    for (const p of level.platforms) {
      if (x >= p.tx * AR.C.TILE && x <= (p.tx + p.w) * AR.C.TILE) {
        supportY = Math.min(supportY, p.ty * AR.C.TILE);
      }
    }
    return supportY;
  },

  _scanPath(level, pl, dir) {
    const T = AR.C.TILE;
    const pitLimit = AR.C.WORLD_H * T;
    const footY = pl.y + pl.h;
    const leadX = pl.x + pl.w / 2 + dir * (pl.w / 2 + 6);
    const horizon = AR.U.clamp(90 + Math.abs(pl.vx) * 0.28, 90, 220);
    let gapDist = Infinity, riseDist = Infinity, maxRise = 0;
    for (let dist = 12; dist <= horizon; dist += 12) {
      const supportY = this._supportYAt(level, leadX + dir * dist);
      if (supportY > pitLimit) {
        if (gapDist === Infinity) gapDist = dist;
        continue;
      }
      const rise = footY - supportY;
      if (rise > T * 0.35 && rise > maxRise) {
        maxRise = rise;
        riseDist = dist;
      }
    }
    return { gapDist, riseDist, maxRise, horizon };
  },

  _gapPlan(level, pl, dir) {
    if (!dir) return null;
    const T = AR.C.TILE;
    const pitLimit = AR.C.WORLD_H * T;
    const leadX = pl.x + pl.w / 2 + dir * (pl.w / 2 + 6);
    let startDist = Infinity;
    for (let dist = 0; dist <= T * 9; dist += T / 4) {
      const overPit = this._supportYAt(level, leadX + dir * dist) > pitLimit;
      if (overPit && startDist === Infinity) startDist = dist;
      else if (!overPit && startDist !== Infinity) {
        return {
          startDist,
          endDist: dist,
          width: dist - startDist,
          landingX: leadX + dir * (dist + T * 0.55),
        };
      }
    }
    return null;
  },

  _updateTraversal(game, pl, pcx, dt) {
    if (!this.traversal) return;
    const T = AR.C.TILE;
    this.traversal.t += dt;
    const crossed = this.traversal.dir > 0 ?
      pcx >= this.traversal.landingX - T * 0.7 :
      pcx <= this.traversal.landingX + T * 0.7;
    const safeGround = this._supportYAt(game.level, pcx) <= AR.C.WORLD_H * T;
    if ((pl.onGround && crossed && safeGround && this.traversal.t > 0.15) || this.traversal.t > 3.2) {
      this.traversal = null;
    }
  },

  _hasClearShot(level, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const d = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(2, Math.ceil(d / (AR.C.TILE * 0.2)));
    // Les projectiles ignorent les plateformes traversables mais meurent dans
    // les tuiles solides : utiliser exactement la même notion de terrain.
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      const tx = Math.floor((x0 + dx * k) / AR.C.TILE);
      const ty = Math.floor((y0 + dy * k) / AR.C.TILE);
      if (level.solidAt(tx, ty)) return false;
    }
    return true;
  },

  _isProjectileBlocker(enemy) {
    return !!enemy && !enemy.isBoss && enemy.def && enemy.def.behavior === 'shield';
  },

  _guardingBlockerInLine(game, pcx, pcy, target) {
    if (!target) return null;
    const tx = target.centerX(), ty = target.centerY();
    const dx = tx - pcx, dir = AR.U.sign(dx);
    if (!dir) return null;
    let best = null, bestAlong = Infinity;
    for (const e of game.enemies) {
      if (e.dead || !e.active || !this._isProjectileBlocker(e)) continue;
      if (['attack', 'stunned', 'dash'].includes(e.state)) continue;
      const ex = e.centerX(), along = (ex - pcx) * dir;
      if (along < -e.w * 0.5 || along > Math.abs(dx) + e.w * 0.5) continue;
      // Même test d'orientation que Enemy.blocksArrow : le bouclier doit faire
      // face à la provenance du projectile.
      if (e.facing !== -dir) continue;
      const k = AR.U.clamp(along / Math.max(1, Math.abs(dx)), 0, 1);
      const lineY = pcy + (ty - pcy) * k;
      if (Math.abs(e.centerY() - lineY) > Math.max(90, e.h * 0.8)) continue;
      if (along < bestAlong) { best = e; bestAlong = along; }
    }
    return best;
  },

  _canCast(pl, i, spiritReserve) {
    if (!pl.spellUnlocked(i) || pl.spellCds[i] > 0) return false;
    const cost = AR.SPELLS[i].cost * pl.stats.spellCostMult;
    return pl.spirit >= cost + (spiritReserve || 0);
  },

  _shouldAvoidBlocker(enemy, pl, distance, dt) {
    let memory = this.blockerMemory.get(enemy);
    if (!memory) {
      memory = { engageT: 0, noProgressT: 0, startHp: enemy.hp, lastHp: enemy.hp };
      this.blockerMemory.set(enemy, memory);
    }
    if (distance > 540) return false;

    memory.engageT += dt;
    if (enemy.hp < memory.lastHp - 0.5) memory.noProgressT = 0;
    else memory.noProgressT += dt;
    memory.lastHp = enemy.hp;

    const progress = (memory.startHp - enemy.hp) / Math.max(1, enemy.maxHp);
    const remainingSwordHits = enemy.hp / Math.max(1, pl.stats.swordDmg);
    const dangerous = enemy.dmg >= pl.maxHp * 0.16;
    const losingAttrition = pl.hp < pl.maxHp * 0.48 && enemy.hp > enemy.maxHp * 0.5;
    const overmatchedElite = enemy.elite && dangerous && remainingSwordHits > 9 &&
      pl.hp < pl.maxHp * 0.7 && memory.engageT > 2.4;
    const stalled = memory.engageT > 5.5 && memory.noProgressT > 2.8 && progress < 0.2;
    return losingAttrition || overmatchedElite || stalled;
  },

  _currentSurfaceY(level, pl) {
    if (pl.onGround) return pl.y + pl.h;
    return this._supportYAt(level, pl.x + pl.w / 2);
  },

  _abandonChestCluster(game, pl, chest) {
    const T = AR.C.TILE;
    const surfaceY = this._currentSurfaceY(game.level, pl);
    for (const p of AR.Pickups.list) {
      if (p.type !== 'chest' || p.opened || Math.abs(p.x - chest.x) > T * 10) continue;
      // Ne pas sacrifier les coffres au sol à cause d'un groupe de plateformes.
      if (surfaceY - p.y <= T * 1.25) continue;
      const memory = this.chestRetries.get(p) || { attempts: 0 };
      memory.x = p.x;
      memory.y = p.y;
      memory.surfaceY = surfaceY;
      memory.abandoned = true;
      this.chestRetries.set(p, memory);
    }
  },

  _pickReachableChest(game, pl, pcx) {
    const T = AR.C.TILE;
    const surfaceY = this._currentSurfaceY(game.level, pl);
    let best = null, bestScore = Infinity;
    for (const p of AR.Pickups.list) {
      if (p.type !== 'chest' || p.opened) continue;
      const dx = p.x - pcx;
      if (Math.abs(dx) > 600 || dx < -520) continue;

      // Avec les maintiens utilisés plus bas, le double saut atteint environ
      // quatre tuiles. Un coffre plus haut sera réévalué depuis un terrain élevé.
      const rise = surfaceY - p.y;
      let memory = this.chestRetries.get(p);
      if (rise > T * 4.15) {
        // Les coffres sont optionnels : s'il n'est pas atteignable maintenant,
        // ne jamais interrompre à nouveau la progression pour celui-ci.
        if (!memory) {
          memory = { x: p.x, y: p.y, surfaceY, attempts: 0, abandoned: true };
          this.chestRetries.set(p, memory);
        }
        this._abandonChestCluster(game, pl, p);
        continue;
      }

      if (memory && memory.abandoned) continue;

      const score = Math.abs(dx) + Math.max(0, rise) * 0.35;
      if (score < bestScore) { best = p; bestScore = score; }
    }
    return best;
  },

  _trackChestAttempt(game, pl, chest, pcx, pcy, dt) {
    if (this.chestTarget !== chest) {
      this.chestTarget = chest;
      this.chestAttemptT = 0;
      this.chestTotalT = 0;
      this.chestBestD = Infinity;
    }
    this.chestTotalT += dt;
    const d = AR.U.dist(pcx, pcy, chest.x, chest.y - 20);
    if (d < this.chestBestD - 8) {
      this.chestBestD = d;
      this.chestAttemptT = 0;
    } else {
      this.chestAttemptT += dt;
    }
    if (this.chestAttemptT < 2.2 && this.chestTotalT < 5) return false;

    // Après plusieurs sauts sans progrès, continuer le niveau définitivement.
    const memory = this.chestRetries.get(chest) || { attempts: 0 };
    memory.x = chest.x;
    memory.y = chest.y;
    memory.surfaceY = this._currentSurfaceY(game.level, pl);
    memory.abandoned = true;
    this.chestRetries.set(chest, memory);
    this._abandonChestCluster(game, pl, chest);
    this.chestTarget = null;
    this.chestAttemptT = 0;
    this.chestTotalT = 0;
    this.chestBestD = Infinity;
    return true;
  },

  _recordChestJump(game, pl, chest) {
    const surfaceY = this._currentSurfaceY(game.level, pl);
    const memory = this.chestRetries.get(chest) || {
      x: chest.x, y: chest.y, surfaceY, attempts: 0, abandoned: false,
    };
    memory.attempts++;
    if (memory.attempts >= 2) {
      memory.abandoned = true;
      this._abandonChestCluster(game, pl, chest);
    }
    this.chestRetries.set(chest, memory);
  },

  _clearChestAttempt() {
    this.chestTarget = null;
    this.chestAttemptT = 0;
    this.chestTotalT = 0;
    this.chestBestD = Infinity;
  },

  // Appelé à chaque pas de simulation quand le mode démo est actif.
  update(game, dt) {
    const a = {};   // actions virtuelles
    const pl = game.player;
    let aimX = pl.x + pl.facing * 300, aimY = pl.y + 20;

    // ---------- écrans / overlays : l'IA valide toute seule
    if (game.state === 'rift') {
      this.jumpHoldT = this.jumpReleaseT = this.navStuckT = 0;
      this.traversal = null;
      this._clearChestAttempt();
      this.uiT += dt;
      if (this.uiT > 1.1) { game.riftPick(Math.floor(Math.random() * game.riftChoices.length)); this.uiT = 0; }
      AR.Input.setVirtual(a, aimX, aimY);
      return;
    }
    if (game.state === 'gameover' || game.state === 'victory') {
      this.jumpHoldT = this.jumpReleaseT = this.navStuckT = 0;
      this.traversal = null;
      this._clearChestAttempt();
      this.uiT += dt;
      if (this.uiT > 2.5) { this.uiT = 0; game.newRun(true); }
      AR.Input.setVirtual(a, aimX, aimY);
      return;
    }
    if (game.state !== 'play') {
      this.jumpHoldT = this.jumpReleaseT = this.navStuckT = 0;
      this.traversal = null;
      this._clearChestAttempt();
      AR.Input.setVirtual(a, aimX, aimY); return;
    }
    if (game.shopOpen) {
      this.jumpHoldT = this.jumpReleaseT = this.navStuckT = 0;
      this.traversal = null;
      this._clearChestAttempt();
      this.uiT += dt;
      const thinkT = Math.max(0.12, 0.45 / Math.sqrt(game.speed || 1));
      if (this.uiT > thinkT) { game.shopAutoBuy(); game.shopOpen = false; this.uiT = 0; }
      AR.Input.setVirtual(a, aimX, aimY);
      return;
    }
    if (pl.dead) {
      this.jumpHoldT = this.jumpReleaseT = this.navStuckT = 0;
      this.traversal = null;
      this._clearChestAttempt();
      AR.Input.setVirtual(a, aimX, aimY); return;
    }

    // ---------- dépense automatique des points de compétence
    if (pl.skillPoints > 0) game.buySkillAuto();

    this.decideT -= dt;
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
    this._updateTraversal(game, pl, pcx, dt);

    // ---------- perception
    let target = null, td = 1e9;
    let avoidedThreat = null, avoidedTd = 1e9;
    for (const e of game.enemies) {
      if (e.dead || !e.active) continue;
      const d = AR.U.dist(pcx, pcy, e.centerX(), e.centerY());
      if (this.avoidedEnemies.has(e)) {
        if (d < avoidedTd) { avoidedTd = d; avoidedThreat = e; }
        continue;
      }
      // Si plusieurs adversaires sont disponibles, éliminer d'abord ceux qui
      // ne neutralisent pas l'arme à distance.
      const blockerPenalty = this._isProjectileBlocker(e) ? 130 : 0;
      const behindPenalty = !e.isBoss && e.centerX() < pcx - 140 ? 260 : 0;
      const score = d + blockerPenalty + behindPenalty - (e.isBoss ? 250 : 0);
      if (score < td && d < 720) { td = score; target = e; }
    }
    const lineBlocker = this._guardingBlockerInLine(game, pcx, pcy, target);
    if (lineBlocker && lineBlocker !== target) {
      if (this.avoidedEnemies.has(lineBlocker)) {
        avoidedThreat = lineBlocker;
        avoidedTd = AR.U.dist(pcx, pcy, lineBlocker.centerX(), lineBlocker.centerY());
        target = null;
      } else {
        target = lineBlocker;
      }
    }
    let realTd = target ? AR.U.dist(pcx, pcy, target.centerX(), target.centerY()) : 1e9;
    let projectileBlocker = this._isProjectileBlocker(target);
    if (projectileBlocker && this._shouldAvoidBlocker(target, pl, realTd, dt)) {
      this.avoidedEnemies.add(target);
      this.bowPlan = 0; this.swordPlan = 0;
      AR.HUD.notify('IA : adversaire trop résistant, contournement', AR.C.COLORS.textDim);
      avoidedThreat = target; avoidedTd = realTd;
      target = null; realTd = 1e9; projectileBlocker = false;
    }
    const shotClear = !target || this._hasClearShot(game.level,
      pcx, pl.y + pl.h * 0.38, target.centerX(), target.centerY());
    const blockedShot = !!target && !shotClear && realTd > 110;

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
    let chest = this._pickReachableChest(game, pl, pcx);
    const wantShop = game.merchantPickup && !game.merchantPickup.used &&
      Math.abs(game.merchantPickup.x - pcx) < 520 &&
      (pl.hp < pl.maxHp * 0.75 || game.coins > 130);

    if (portal) goalX = portal.x;
    else if (projectileBlocker) goalX = target.centerX() + AR.C.TILE * 2.2;
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
    const targetTelegraph = target && ['tele', 'charge', 'attack'].includes(target.state) && realTd < 230;
    const bypassTelegraph = avoidedThreat && ['tele', 'charge', 'attack', 'dash'].includes(avoidedThreat.state) && avoidedTd < 210;
    const telegraphed = targetTelegraph || bypassTelegraph;
    if ((threat || telegraphed) && this.decideT <= 0) {
      if (Math.random() < 0.55) a.dash = true;
      else this._queueJump(pl.onGround ? 0.24 : 0.20);
      this.decideT = 0.4;
    }

    // ---------- combat
    if (target && !this.traversal) {
      const ex = target.centerX(), ey = target.centerY();
      aimX = ex + (target.vx || 0) * 0.15; aimY = ey;
      const dx = ex - pcx;

      // Un bouclier change complètement le plan : aucun arc ; Vague ou Frappe
      // éclair percent la garde, puis le sabre prend le relais dans son dos.
      if (projectileBlocker) this.bowPlan = 0;

      // sorts si disponibles
      const nearCount = game.enemies.filter((e) => !e.dead && e.active &&
        AR.U.dist(pcx, pcy, e.centerX(), e.centerY()) < 210).length;
      if (projectileBlocker && realTd > 105 && realTd < 285 && this._canCast(pl, 2, 8)) a.spell3 = true;
      else if (projectileBlocker && realTd < 185 && this._canCast(pl, 0, 6)) a.spell1 = true;
      else if (projectileBlocker && target.elite && realTd < 260 && this._canCast(pl, 3, 12)) a.spell4 = true;
      else if (pl.spellUnlocked(0) && nearCount >= 2 && pl.spirit > 40) a.spell1 = true;
      else if (pl.spellUnlocked(2) && target.isBoss && pl.spirit > 70 && Math.random() < 0.02) a.spell3 = true;
      else if (!projectileBlocker && shotClear && pl.spellUnlocked(1) && realTd > 260 && realTd < 560 && pl.spirit > 60 && Math.random() < 0.03) a.spell2 = true;

      if (blockedShot) {
        // Ne plus gaspiller de flèches contre une paroi. Viser au-delà de la
        // cible force le franchissement du rebord au lieu d'un duel immobile.
        this.bowPlan = 0;
        this.swordPlan = 0;
        const approachDir = AR.U.sign(dx) || pl.facing || 1;
        goalX = ex + approachDir * AR.C.TILE * 1.5;
      } else if (realTd < (projectileBlocker ? 175 : 135)) {
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
      } else if (projectileBlocker) {
        this.bowPlan = 0;
        this.swordPlan = 0;
        // Dépasser le porteur de bouclier le force à se retourner et ouvre son dos.
        goalX = ex + AR.C.TILE * 2.2;
        if (pl.onGround && realTd < 260 && this.decideT <= 0) {
          a.dash = true;
          this.decideT = 0.35;
        }
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

    // Un ennemi proche de l'autre côté d'une fosse ou d'une marche ne doit pas
    // figer l'IA en position de tir. Elle franchit d'abord le relief qui les sépare.
    if (target && !target.isBoss) {
      const targetDx = target.centerX() - pcx;
      if (blockedShot) {
        const approachDir = AR.U.sign(targetDx) || pl.facing || 1;
        goalX = target.centerX() + approachDir * AR.C.TILE * 1.5;
      } else if (Math.abs(targetDx) > 80) {
        const targetDir = AR.U.sign(targetDx);
        const route = this._scanPath(game.level, pl, targetDir);
        const routeLimit = Math.min(route.horizon, Math.abs(targetDx) - 35);
        if (route.gapDist < routeLimit || route.riseDist < routeLimit) goalX = target.centerX();
      }
    }

    // Une fosse devient un objectif prioritaire, même si un ennemi proche avait
    // annulé le déplacement pour engager un duel à distance.
    if (!this.traversal) {
      const travelDir = goalX !== null && Math.abs(goalX - pcx) > 20 ? AR.U.sign(goalX - pcx) :
        target ? AR.U.sign(target.centerX() - pcx) : 0;
      const gap = this._gapPlan(game.level, pl, travelDir);
      const takeoffDist = AR.U.clamp(52 + Math.abs(pl.vx) * 0.24, 58, 125);
      if (gap && gap.startDist <= takeoffDist) {
        this.traversal = { ...gap, dir: travelDir, t: 0, airDashUsed: !!pl.airDashed };
        this.bowPlan = 0;
        this.swordPlan = 0;
      }
    }
    if (this.traversal) {
      goalX = this.traversal.landingX;
      chest = null;
      this._clearChestAttempt();
    }

    const pursuingChest = chest && goalX === chest.x;
    if (pursuingChest) {
      if (this._trackChestAttempt(game, pl, chest, pcx, pcy, dt)) {
        chest = null;
        goalX = wantShop ? game.merchantPickup.x : pl.x + 400;
      }
    } else {
      this._clearChestAttempt();
    }

    // ---------- navigation
    const goalDx = goalX === null ? 0 : goalX - pcx;
    const chestAboveGoal = chest && goalX === chest.x && chest.y < pl.y + pl.h - AR.C.TILE &&
      Math.abs(chest.x - pcx) < 155;
    let traversalDash = false;
    if (goalX !== null && (Math.abs(goalDx) > 30 || chestAboveGoal)) {
      const dir = AR.U.sign(goalDx);
      if (Math.abs(goalDx) > 30) {
        if (dir > 0) a.right = true; else a.left = true;
      }
      const lvl = game.level;
      const path = dir === 0 ? { gapDist: Infinity, riseDist: Infinity, maxRise: 0, horizon: 0 } :
        this._scanPath(lvl, pl, dir);
      const takeoffDist = AR.U.clamp(46 + Math.abs(pl.vx) * 0.22, 52, 112);
      const gapSoon = path.gapDist <= takeoffDist;
      const riseSoon = path.riseDist <= takeoffDist;
      const obstacleInDashRange = path.gapDist < 170 || path.riseDist < 150;

      // Le dash lance ensuite un sprint s'il reste maintenu. On le réserve aux
      // portions de sol lisibles et on le relâche assez tôt avant un obstacle.
      if (pl.onGround && Math.abs(goalX - pcx) > 300 && !target && !obstacleInDashRange) {
        a.dash = true;
      } else if ((blockedShot || projectileBlocker) && pl.onGround && Math.abs(goalDx) > 160 && !obstacleInDashRange) {
        a.dash = true;
      }

      if (dir !== 0 && pl.onGround && !pl.dashing && Math.abs(pl.vx) < 12) this.navStuckT += dt;
      else this.navStuckT = Math.max(0, this.navStuckT - dt * 3);

      const chestAbove = chestAboveGoal;
      if (pl.onGround && !pl.dashing && (gapSoon || riseSoon || chestAbove || this.navStuckT > 0.22)) {
        const highOrWide = path.maxRise > AR.C.TILE * 1.2 || path.gapDist < 70 || chestAbove;
        const holdT = this.traversal ? 0.34 : chestAbove ? 0.34 : highOrWide ? 0.30 : 0.24;
        if (this._queueJump(holdT)) {
          this.navStuckT = 0;
          if (chestAbove) this._recordChestJump(game, pl, chest);
        }
      }

      // Second appui près de l'apex : rattrape les fosses larges et permet
      // d'atteindre les marches ou coffres placés deux tuiles plus haut.
      const overGap = this._supportYAt(lvl, pcx) > AR.C.WORLD_H * AR.C.TILE;
      const airObstacle = path.gapDist < 58 ||
        (path.riseDist < 70 && path.maxRise > AR.C.TILE * 0.55) || chestAbove;
      if (!pl.onGround && !pl.dashing && pl.jumpsUsed === 1 && pl.vy > -80 &&
          (overGap || airObstacle)) {
        this._queueJump(this.traversal ? 0.30 : chestAbove ? 0.30 : 0.24);
      }

      // Le dash aérien vient après le double saut : il prolonge la suspension
      // et fournit l'impulsion horizontale nécessaire aux fosses de 3-4 tuiles.
      if (this.traversal && !pl.onGround && !pl.dashing && !this.traversal.airDashUsed &&
          pl.dashCharges > 0 && !pl.airDashed) {
        const remaining = this.traversal.dir * (this.traversal.landingX - pcx);
        const readyAfterDouble = pl.jumpsUsed >= 2 && pl.vy > -70;
        const fallingWithoutJump = pl.jumpsUsed === 0 && pl.vy > 80;
        if (remaining > AR.C.TILE * 0.8 && (readyAfterDouble || fallingWithoutJump)) {
          traversalDash = true;
          this.traversal.airDashUsed = true;
        }
      }
    } else {
      this.navStuckT = 0;
    }

    if (this.traversal) {
      // Traverser vivant vaut plus qu'une attaque : aucune charge d'arme ni sort
      // ne peut ralentir ou détourner le personnage pendant cette courte phase.
      a.left = this.traversal.dir < 0;
      a.right = this.traversal.dir > 0;
      a.sword = false;
      a.bow = false;
      a.spell1 = a.spell2 = a.spell3 = a.spell4 = false;
      a.dash = traversalDash;
      this.bowPlan = 0;
      this.swordPlan = 0;
    }

    this._applyJump(a, dt);
    AR.Input.setVirtual(a, aimX, aimY);
  },
};
