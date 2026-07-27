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
  lootTarget: null,
  lootAttemptT: 0,
  lootBestD: Infinity,
  lootIgnore: new WeakSet(),
  lootRetries: new WeakMap(),
  climbPhase: null,
  buildFocus: 'balanced',
  traversal: null,
  bossEvade: null,     // { side: 'left'|'right', stage: 0-3 } : refuge sur les promontoires de l'arène
  uiT: 0,
  portalDropDir: 0,        // -1/1 une fois choisi : direction figée pour descendre vers le portail

  reset(newRun) {
    this.decideT = 0; this.bowPlan = 0; this.swordPlan = 0;
    this.jumpHoldT = 0; this.jumpReleaseT = 0; this.navStuckT = 0;
    this.chestTarget = null; this.chestAttemptT = 0; this.chestTotalT = 0; this.chestBestD = Infinity;
    this.chestRetries = new WeakMap();
    this.blockerMemory = new WeakMap();
    this.avoidedEnemies = new WeakSet();
    this.lootTarget = null; this.lootAttemptT = 0; this.lootBestD = Infinity;
    this.lootIgnore = new WeakSet();
    this.lootRetries = new WeakMap();
    this.climbPhase = null;
    this.traversal = null;
    this.bossEvade = null;
    this.portalDropDir = 0;
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
  // fromY : hauteur de référence (pied du joueur) pour les cartes multi-étage —
  // sans elle, une carte authored renverrait toujours la surface la plus haute
  // de la colonne (ex. un plateau au-dessus d'une grotte), même en marchant
  // sur le sol du dessous, ce qui fait croire à l'IA qu'il faut escalader.
  // On démarre le sondage un peu AU-DESSUS du pied (fenêtre ~6 tuiles, au-delà
  // des enveloppes de saut du §4.3) : assez haut pour repérer une marche proche
  // (les blocs d'escalier restent solides jusqu'au socle, donc sonder pile au
  // niveau du pied masquerait la marche suivante), mais assez bas pour ignorer
  // un étage totalement distinct de la carte (plateau/grotte à 10+ tuiles).
  _supportYAt(level, x, fromY) {
    const pitLimit = AR.C.WORLD_H * AR.C.TILE;
    const scanFrom = fromY !== undefined ? fromY - AR.C.TILE * 6 : 0;
    const groundY = (level.grid && level.groundYAtEntity) ?
      level.groundYAtEntity(x, scanFrom) : level.groundYpx(x);
    if (groundY <= pitLimit) return groundY;
    let supportY = groundY;
    for (const p of level.platforms) {
      if (p.broken) continue;
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
      const supportY = this._supportYAt(level, leadX + dir * dist, footY);
      if (supportY > pitLimit) {
        if (gapDist === Infinity) gapDist = dist;
        continue;
      }
      const rise = footY - supportY;
      if (rise > T * 0.35) {
        // riseDist doit rester la marche la PLUS PROCHE (celle qui déclenche le
        // saut) : deux marches rapprochées (ex. l'escalier d'entrée) ne doivent
        // pas laisser la plus haute écraser la distance de la plus proche, sinon
        // l'IA reste plaquée contre la première marche sans jamais sauter.
        if (riseDist === Infinity) riseDist = dist;
        if (rise > maxRise) maxRise = rise;
      }
    }
    return { gapDist, riseDist, maxRise, horizon };
  },

  _gapPlan(level, pl, dir) {
    if (!dir) return null;
    const T = AR.C.TILE;
    const pitLimit = AR.C.WORLD_H * T;
    const footY = pl.y + pl.h;
    const leadX = pl.x + pl.w / 2 + dir * (pl.w / 2 + 6);
    let startDist = Infinity;
    for (let dist = 0; dist <= T * 9; dist += T / 4) {
      const overPit = this._supportYAt(level, leadX + dir * dist, footY) > pitLimit;
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
    const safeGround = this._supportYAt(game.level, pcx, pl.y + pl.h) <= AR.C.WORLD_H * T;
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
    return this._supportYAt(level, pl.x + pl.w / 2, pl.y + pl.h);
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

  // butin non ramassé (pièce, potion, cœur) le plus proche actuellement visible à l'écran
  _pickVisibleLoot(game, pcx, pcy) {
    const cam = game.camera, margin = 40;
    let best = null, bestD = Infinity;
    for (const p of AR.Pickups.list) {
      if (!['coin', 'heart', 'potionDrop'].includes(p.type) || this.lootIgnore.has(p)) continue;
      if (p.x < cam.x - margin || p.x > cam.x + cam.vw + margin) continue;
      if (p.y < cam.y - margin || p.y > cam.y + cam.vh + margin) continue;
      const d = AR.U.dist(pcx, pcy, p.x, p.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  },

  // abandonne le butin visé si aucun progrès n'est fait depuis un moment
  // (ex : pièce coincée hors d'atteinte malgré le correctif de sortie de mur)
  _trackLootAttempt(game, pl, loot, pcx, pcy, dt) {
    if (this.lootTarget !== loot) {
      this.lootTarget = loot; this.lootAttemptT = 0; this.lootBestD = Infinity;
    }
    const d = AR.U.dist(pcx, pcy, loot.x, loot.y);
    if (d < this.lootBestD - 6) { this.lootBestD = d; this.lootAttemptT = 0; }
    else this.lootAttemptT += dt;
    if (this.lootAttemptT < 2.5) return false;
    this.lootIgnore.add(loot);
    this._clearLootAttempt();
    return true;
  },

  _clearLootAttempt() {
    this.lootTarget = null;
    this.lootAttemptT = 0;
    this.lootBestD = Infinity;
  },

  // Compte les sauts/traversées tentés pour atteindre un butin précis. Persiste
  // au-delà de _clearLootAttempt (qui est appelé dès qu'une traversée démarre) :
  // sans ça, une pièce nécessitant un saut+dash imprécis (à côté d'une fosse,
  // sous une plateforme) fait recommencer le compteur de blocage à chaque essai
  // et l'IA boucle indéfiniment sans jamais l'abandonner.
  _recordLootJump(loot) {
    const attempts = (this.lootRetries.get(loot) || 0) + 1;
    this.lootRetries.set(loot, attempts);
    if (attempts >= 2) this.lootIgnore.add(loot);
  },

  // Chemin de plateformes vers le côté gauche/droit de l'arène, de la plus basse
  // à la plus haute. Générique à toutes les arènes de boss (peu importe le nombre
  // de paliers ou leurs id) : une zone morte autour du centre du sol exclut les
  // plateformes centrales (souvent décoratives ou destinées à un autre usage).
  _evadeRoute(arena, side) {
    const ground = arena.ground;
    const midX = ground.x + ground.w / 2;
    const dead = ground.w * 0.15;
    return arena.platforms
      .filter((p) => !p.ground)
      .filter((p) => {
        const cx = p.x + p.w / 2;
        return side === 'left' ? cx < midX - dead : cx > midX + dead;
      })
      .sort((a, b) => b.y - a.y);
  },

  // ============================================================= STRATÉGIES DE BOSS
  // Chaque boss impose une lecture différente de son arène ; un module dédié par
  // id de boss vaut mieux qu'une seule heuristique générique. Renvoie true si la
  // frame a été entièrement prise en charge (l'appelant s'arrête alors là), sinon
  // false pour retomber sur l'esquive générique (_bossEvadeUpdate) puis le combat
  // habituel — ce qui permet à un module de ne reprendre la main que ponctuellement
  // (ex: rester passif tant qu'aucun sbire n'est au sol) sans dupliquer le reste de l'IA.
  _bossStrategyUpdate(game, pl, dt) {
    const boss = game.boss;
    const arena = game.level.bossArena;
    if (!boss || boss.dead || !arena || !arena.active) return false;
    if (game.level.era.boss === 'chariot_commander') return this._chariotCommanderStrategy(game, pl, dt);
    return false;
  },

  // ---- Commandant de char (ère 2) -----------------------------------------
  // Le char reste au sol et frappe large (charge/sweep) : sa hitbox dépasse
  // les piédestaux latéraux, seule la plateforme centrale est une vraie zone
  // sûre (retour joueur, confirmé par mesure). Stratégie la plus simple pour
  // l'instant : camper dessus, ne JAMAIS en repartir de soi-même. Parer les
  // flèches/javelots qui approchent, punir d'un coup d'épée chargé un sbire
  // venu se frotter à nous, sinon canarder le char en continu à l'arc.
  //
  // _hasClearShot n'est PAS utilisable ici : elle teste `level.solidAt`, la
  // grille de tuiles du niveau *normal* — sans rapport avec la géométrie de
  // l'arène (image de fond + arena.platforms). Elle finissait presque toujours
  // par renvoyer "bloqué" sur du terrain sans lien avec l'arène visible, et
  // l'IA ne tirait alors jamais tant qu'elle campait au centre. L'arène est
  // une pièce ouverte sans obstacle entre le centre et le sol : on tire donc
  // sans condition de visée dégagée.
  _chariotCommanderStrategy(game, pl, dt) {
    // Ce module renvoie `true` tant que le combat continue, donc le
    // décompte partagé de decideT (fait normalement plus loin dans update(),
    // jamais atteint ici) doit être fait nous-mêmes — sinon, une fois fixé à
    // une valeur > 0 par le tir/coup d'épée, il n'est plus jamais redescendu
    // à 0 et bloque toute action suivante pour le reste du combat.
    this.decideT -= dt;
    const arena = game.level.bossArena;
    const boss = game.boss;
    const centerDais = arena.platforms.find((p) => p.id === 'center_dais');
    const leftPed = arena.platforms.find((p) => p.id === 'left_pedestal');
    const rightPed = arena.platforms.find((p) => p.id === 'right_pedestal');
    if (!centerDais || !leftPed || !rightPed) return false;

    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2, feetY = pl.y + pl.h;
    const onCenter = Math.abs(feetY - centerDais.y) < 6 &&
      pcx > centerDais.x - 4 && pcx < centerDais.x + centerDais.w + 4;

    if (!onCenter) {
      this._climbToCenter(game, boss, pl, dt, centerDais, leftPed, rightPed);
      return true;
    }

    const a = {};
    const goalCx = centerDais.x + centerDais.w / 2;
    if (Math.abs(pcx - goalCx) > 40) { a.right = pcx < goalCx; a.left = pcx > goalCx; }

    // priorité à la parade d'un projectile proche (même fenêtre que le combat
    // générique : portée 70px, bande verticale h/2+7)
    if (pl.swordCd <= 0 && !pl.dashing) {
      for (const proj of AR.Projectiles.list) {
        if (proj.friendly) continue;
        const dx = proj.x - pcx, dy = proj.y - pcy;
        const incoming = (dx > 0 && proj.vx < 0) || (dx < 0 && proj.vx > 0);
        if (incoming && Math.abs(dx) < 70 && Math.abs(dy) < pl.h / 2 + 7) {
          a.left = proj.x < pcx; a.right = !a.left; a.sword = true;
          this._applyJump(a, dt);
          AR.Input.setVirtual(a, boss.centerX(), boss.centerY());
          return true;
        }
      }
    }

    // un sbire vient nous chercher jusque sur le plateau : coup d'épée chargé,
    // sans quitter la plateforme. Hauteur ET distance horizontale séparées
    // (pas une simple distance à vol d'oiseau) : un sbire resté au sol, ~130px
    // plus bas, ne doit pas compter comme "à portée" juste parce qu'il se
    // tient sous la plateforme — le sabre chargé part à hauteur du joueur et
    // ne peut de toute façon pas l'atteindre là en dessous.
    const meleeMinion = game.enemies.find((e) => !e.dead && e.active && !e.isBoss &&
      Math.abs(e.centerY() - pcy) < 60 && Math.abs(e.centerX() - pcx) < 110);
    if (meleeMinion) {
      this.bowPlan = 0;
      if (this.swordPlan > 0) {
        this.swordPlan -= dt;
        a.sword = this.swordPlan > 0.02;
      } else if (this.decideT <= 0) {
        this.swordPlan = pl.stats.swordChargeTime + 0.1;
        this.decideT = 0.2;
      }
      this._applyJump(a, dt);
      AR.Input.setVirtual(a, meleeMinion.centerX(), meleeMinion.centerY());
      return true;
    }

    // rien d'urgent : canarder le char sans relâche
    if (this.bowPlan > 0) {
      this.bowPlan -= dt;
      a.bow = this.bowPlan > 0.02;
    } else if (this.decideT <= 0) {
      this.bowPlan = pl.stats.bowChargeTime + 0.15;
      this.decideT = 0.3;
    }
    this._applyJump(a, dt);
    AR.Input.setVirtual(a, boss.centerX(), boss.centerY());
    return true;
  },

  // Grimpe du sol jusqu'à la plateforme centrale en deux temps : un saut simple
  // jusqu'au piédestal latéral le plus proche, puis (depuis le piédestal) un
  // double saut — 2e appui juste après l'apex du 1er (vy repasse au-dessus de
  // -80), pas avant — plus un dash dès qu'il est disponible pour franchir
  // l'écart horizontal jusqu'au bord proche du plateau central (viser son bord,
  // pas son centre, pour ne pas avoir à parcourir plus de distance que nécessaire
  // et risquer de le survoler). climbPhase distingue les deux sauts : sans lui,
  // le petit saut vers le piédestal serait pris pour le grand saut vers le
  // centre dès que vy repasse au-dessus de -80, et déclencherait un double saut
  // + dash prématuré qui survole tout et retombe au sol plus loin.
  _climbToCenter(game, boss, pl, dt, centerDais, leftPed, rightPed) {
    const pcx = pl.x + pl.w / 2, feetY = pl.y + pl.h;
    const fromLeft = pcx < centerDais.x + centerDais.w / 2;
    const nearPed = fromLeft ? leftPed : rightPed;
    const pedCx = nearPed.x + nearPed.w / 2;
    // bord proche du plateau central, pas son centre : trajet minimal
    const goalCx = fromLeft ? centerDais.x + 35 : centerDais.x + centerDais.w - 35;
    const a = {};

    if (pl.onGround) {
      const onPed = Math.abs(feetY - nearPed.y) < 6;
      if (onPed) {
        this.climbPhase = 'toCenter';
        a.right = goalCx > pcx; a.left = goalCx < pcx;
        // Tenu court exprès (comme le double saut générique ailleurs dans le
        // fichier) : le 2e appui se déclenche vers 0.3s (vy repasse au-dessus
        // de -80), donc tenir plus longtemps que ça bloquerait sa mise en file
        // (_queueJump refuse tant que le saut précédent est encore "tenu") et
        // on n'obtiendrait jamais qu'un saut simple. La légère coupure du 1er
        // saut n'a pas d'importance : le double saut relance sa propre vitesse.
        this._queueJump(0.22);
      } else {
        this.climbPhase = 'toPedestal';
        if (Math.abs(pcx - pedCx) > 12) { a.right = pcx < pedCx; a.left = pcx > pedCx; }
        // idem : un saut coupé trop tôt (ex. 0.16s) plafonne bien en-deçà des
        // ~100px du piédestal et boucle indéfiniment sans jamais l'atteindre.
        if (Math.abs(pcx - pedCx) < nearPed.w * 0.5) this._queueJump(0.4);
      }
    } else if (this.climbPhase === 'toCenter') {
      if (Math.abs(pcx - goalCx) > 20) { a.right = goalCx > pcx; a.left = goalCx < pcx; }
      if (pl.jumpsUsed === 1 && pl.vy > -80) this._queueJump(0.3);
      if (!pl.dashing && pl.dashCharges > 0 && pl.jumpsUsed >= 1 && !pl.airDashed) a.dash = true;
    } else {
      // en l'air vers le piédestal (petit saut) : viser l'atterrissage, pas de 2e saut
      if (Math.abs(pcx - pedCx) > 10) { a.right = pedCx > pcx; a.left = pedCx < pcx; }
    }
    this._applyJump(a, dt);
    AR.Input.setVirtual(a, boss.centerX(), boss.centerY());
  },

  // Deux ripostes distinctes selon ce que la charge/saut/anneau punit réellement
  // (mesuré empiriquement) :
  //  - 'charge' est bloquée au plan du sol : monter sur un promontoire l'esquive
  //    entièrement (le rectangle du boss ne dépasse jamais son altitude propre).
  //  - le choc au sol du 'stomp' ne teste QUE la distance horizontale à la cible
  //    verrouillée (<240px), pas l'altitude : grimper ne protège pas si on reste
  //    trop proche horizontalement — mieux vaut courir loin, plus vite qu'une
  //    escalade à 3 relais.
  //  - 'arrowRing' part à 360° autour du boss : l'altitude ne retire de rien,
  //    seule la distance au centre compte — même traitement que le stomp.
  // Renvoie true si le mouvement/les actions de cette frame ont été entièrement
  // pris en charge (l'appelant doit alors s'arrêter là).
  _bossEvadeUpdate(game, pl, dt) {
    const boss = game.boss;
    const arena = game.level.bossArena;
    if (!boss || boss.dead || !arena || !arena.active) { this.bossEvade = null; return false; }
    const dangerPattern = boss.state === 'tele' ? boss.pattern
      : ['charge', 'sweep', 'stomp', 'arrowRing'].includes(boss.state) ? boss.state : null;
    if (!dangerPattern) { this.bossEvade = null; return false; }
    const climbPattern = dangerPattern === 'charge' || dangerPattern === 'sweep';
    const pcx = pl.x + pl.w / 2;

    if (!this.bossEvade || this.bossEvade.mode !== (climbPattern ? 'climb' : 'retreat')) {
      if (climbPattern) {
        const leftRoute = this._evadeRoute(arena, 'left');
        const rightRoute = this._evadeRoute(arena, 'right');
        if (!leftRoute.length || !rightRoute.length) { this.bossEvade = null; return false; }
        const distL = Math.abs(pcx - (leftRoute[0].x + leftRoute[0].w / 2));
        const distR = Math.abs(pcx - (rightRoute[0].x + rightRoute[0].w / 2));
        const side = distL <= distR ? 'left' : 'right';
        this.bossEvade = { mode: 'climb', side, stage: 0, route: side === 'left' ? leftRoute : rightRoute };
      } else {
        // Fuir à l'opposé de la cible verrouillée (stomp) ou du centre du boss
        // (arrowRing), vers le bord d'arène offrant le plus de recul.
        const anchorX = boss.stompTarget ? boss.stompTarget.x + boss.w / 2 : boss.centerX();
        const roomLeft = anchorX - arena.bounds.x0, roomRight = arena.bounds.x1 - anchorX;
        this.bossEvade = { mode: 'retreat', dir: roomLeft > roomRight ? -1 : 1 };
      }
      this.traversal = null; this.bowPlan = 0; this.swordPlan = 0;
    }

    const a = {};
    let aimX = boss.centerX(), aimY = boss.centerY();
    if (this.bossEvade.mode === 'climb') {
      const route = this.bossEvade.route;
      const stage = Math.min(this.bossEvade.stage, route.length - 1);
      const plat = route[stage];
      if (plat) {
        const feetY = pl.y + pl.h;
        if (pl.onGround && this.bossEvade.stage < route.length && Math.abs(feetY - plat.y) < 5) this.bossEvade.stage++;
        const goalCx = plat.x + plat.w / 2;
        if (Math.abs(pcx - goalCx) > 14) { a.right = pcx < goalCx; a.left = pcx > goalCx; }
        if (pl.onGround && Math.abs(pcx - goalCx) < plat.w * 0.5) this._queueJump(0.16);
      }
      // depuis le promontoire final, continuer à tirer sur le boss si le tir est dégagé
      if (this.bossEvade.stage >= route.length && this.decideT <= 0) {
        const clear = this._hasClearShot(game.level, pcx, pl.y + pl.h * 0.38, boss.centerX(), boss.centerY());
        if (clear && this._canCast(pl, 0, 0) && Math.random() < 0.4) a.spell1 = true;
        else { a.bow = true; this.decideT = 0.45; }
      }
    } else {
      // course franche loin de la cible, dash dès que possible pour maximiser la distance
      a.right = this.bossEvade.dir > 0; a.left = this.bossEvade.dir < 0;
      if (pl.onGround && !pl.dashing) a.dash = true;
      aimX = pl.x + this.bossEvade.dir * 300;
    }
    this._applyJump(a, dt);
    AR.Input.setVirtual(a, aimX, aimY);
    return true;
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
      this._clearLootAttempt();
      this.uiT += dt;
      if (this.uiT > 1.1) { game.riftPick(Math.floor(Math.random() * game.riftChoices.length)); this.uiT = 0; }
      AR.Input.setVirtual(a, aimX, aimY);
      return;
    }
    if (game.state === 'gameover' || game.state === 'victory') {
      this.jumpHoldT = this.jumpReleaseT = this.navStuckT = 0;
      this.traversal = null;
      this._clearChestAttempt();
      this._clearLootAttempt();
      this.uiT += dt;
      if (this.uiT > 2.5) { this.uiT = 0; game.newRun(true); }
      AR.Input.setVirtual(a, aimX, aimY);
      return;
    }
    if (game.state !== 'play') {
      this.jumpHoldT = this.jumpReleaseT = this.navStuckT = 0;
      this.traversal = null;
      this._clearChestAttempt();
      this._clearLootAttempt();
      AR.Input.setVirtual(a, aimX, aimY); return;
    }
    if (game.shopOpen) {
      this.jumpHoldT = this.jumpReleaseT = this.navStuckT = 0;
      this.traversal = null;
      this._clearChestAttempt();
      this._clearLootAttempt();
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
      this._clearLootAttempt();
      AR.Input.setVirtual(a, aimX, aimY); return;
    }

    // ---------- module de stratégie propre au boss courant, s'il existe
    if (this._bossStrategyUpdate(game, pl, dt)) return;

    // ---------- refuge sur les promontoires pendant une attaque de boss au sol
    // (charge / saut / anneau) : prend la main sur tout le reste tant que le
    // danger dure. Cf. retour joueur : sans ça, l'IA subit ces attaques au sol.
    if (this._bossEvadeUpdate(game, pl, dt)) return;

    // ---------- dépense automatique des points de compétence
    if (pl.skillPoints > 0) game.buySkillAuto();

    this.decideT -= dt;
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
    this._updateTraversal(game, pl, pcx, dt);

    // ---------- perception
    let target = null, td = 1e9;
    let avoidedThreat = null, avoidedTd = 1e9;
    for (const e of game.enemies) {
      if (e.dead || !e.active || e.emergeT > 0) continue;
      const d = AR.U.dist(pcx, pcy, e.centerX(), e.centerY());
      if (this.avoidedEnemies.has(e)) {
        if (d < avoidedTd) { avoidedTd = d; avoidedThreat = e; }
        continue;
      }
      // Un adversaire loin verticalement (ex. une salle souterraine sous une allée de
      // surface, désormais visible) et sans ligne de tir dégagée n'est séparable que par
      // du sol/plafond solide — aucun déplacement horizontal ne peut le rapprocher. Sans ce
      // filtre l'IA le gardait comme cible : `blockedShot` la faisait alors juste faire les
      // cent pas au-dessus de lui indéfiniment (retour joueur : "elle suit par au-dessus un
      // monstre inatteignable"). On l'ignore purement et simplement comme objectif de combat.
      if (Math.abs(e.centerY() - pcy) > AR.C.TILE * 3 &&
        !this._hasClearShot(game.level, pcx, pcy, e.centerX(), e.centerY())) continue;
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
    // À portée de sabre (même fenêtre que game.meleeHit), un projectile qui
    // fonce droit dessus vaut mieux être détruit d'un coup d'épée que fui :
    // ça évite le dégât ET ne coûte pas de terrain/temps de charge.
    let threat = null;
    let parryProjectile = null, parryD = Infinity;
    const canParry = pl.swordCd <= 0 && !pl.dashing;
    const parryReach = 70, parryVBand = pl.h / 2 + 7;
    for (const p of AR.Projectiles.list) {
      if (p.friendly) continue;
      const d = AR.U.dist(pcx, pcy, p.x, p.y);
      if (!threat && d < 150 && (p.vx * (pcx - p.x) + p.vy * (pcy - p.y)) > 0) threat = p;
      if (canParry) {
        const dx = p.x - pcx, dy = p.y - pcy;
        const incoming = (dx > 0 && p.vx < 0) || (dx < 0 && p.vx > 0);
        if (incoming && Math.abs(dx) < parryReach && Math.abs(dy) < parryVBand && d < parryD) {
          parryD = d; parryProjectile = p;
        }
      }
    }

    // ---------- objectif de déplacement
    let goalX = null;
    const interactive = AR.Pickups.nearestInteractive(pl);
    // Seul le vrai portail de fin d'arène (sans `returnTo`) doit être beeliné inconditionnellement :
    // les mini-portails locaux des poches secrètes (`returnTo` défini, cf. game.js#_useLocalPortal)
    // restent utilisables à volonté et existent dès le chargement du niveau — les inclure ici
    // faisait plonger l'IA dans la grotte secrète, la faisait remonter par le portail local, puis
    // la renvoyait aussitôt dedans (le portail reste dans la liste), en boucle infinie. Un portail
    // local est maintenant seulement utilisé au passage via `interactive` (proximité), jamais visé.
    const portal = AR.Pickups.list.find((p) => p.type === 'portal' && !p.returnTo);
    let chest = this._pickReachableChest(game, pl, pcx);
    let loot = null;
    const wantShop = game.merchantPickup && !game.merchantPickup.used &&
      Math.abs(game.merchantPickup.x - pcx) < 520 &&
      (pl.hp < pl.maxHp * 0.75 || game.coins > 130);

    if (portal) {
      goalX = portal.x;
      // Le portail apparaît toujours au niveau du sol de l'arène ; si le héros
      // est resté sur une plateforme surélevée juste au-dessus, l'écart
      // horizontal est quasi nul (aucune direction n'est alors donnée plus
      // bas) alors qu'il reste un vrai écart vertical à descendre : il restait
      // bloqué là indéfiniment.
      const arena = game.level.bossArena;
      const portalBelow = arena && arena.active && (portal.y - (pl.y + pl.h)) > AR.C.TILE * 1.2;
      if (portalBelow) {
        // Direction figée dès qu'elle est choisie (recalculée seulement une
        // fois au sol/portail atteint) puis reprojetée à chaque frame à
        // distance fixe devant le héros dans cette direction : viser un point
        // fixe (ex. bord de plateforme) pouvait largement dépasser la
        // position réelle du portail, et une fois retombé sous le seuil
        // "encore en l'air" le rabattait sur `portal.x` — situé alors de
        // l'autre côté — provoquant un aller-retour sans fin. En reprojetant
        // sur la position courante, l'écart au but ne redescend jamais sous
        // le seuil "arrivé" tant qu'il reste à descendre, donc plus de
        // rebond ; l'approche fine reprend sur `portal.x` dès l'atterrissage.
        if (!this.portalDropDir) this.portalDropDir = portal.x >= pcx ? 1 : -1;
        goalX = pcx + this.portalDropDir * AR.C.TILE * 4;
      } else {
        this.portalDropDir = 0;
      }
    }
    else if (projectileBlocker) goalX = target.centerX() + AR.C.TILE * 2.2;
    else if (target && (target.isBoss || realTd < 520)) goalX = null; // on combat sur place
    else if (chest) goalX = chest.x;
    else if (wantShop) goalX = game.merchantPickup.x;
    else {
      // ramasser l'or/les potions visibles à l'écran avant de reprendre la progression
      loot = this._pickVisibleLoot(game, pcx, pcy);
      if (loot && !this._trackLootAttempt(game, pl, loot, pcx, pcy, dt)) goalX = loot.x;
      else { loot = null; this._clearLootAttempt(); goalX = pl.x + 400; } // avancer vers la droite
    }

    // ---------- interaction
    if (interactive && (!target || realTd > 240 || interactive.type === 'portal')) {
      a.interact = Math.random() < 0.5; // press "naturel" sur ~2 pas
    }

    // ---------- survie
    if (pl.hp < pl.maxHp * 0.35 && pl.potions > 0) a.potion = true;
    // Panique : PV critiques et plus de potion — décrocher plutôt que continuer à s'acharner
    // (retour joueur : l'IA achevait un sbire à 1 PV au lieu de fuir, et mourait dans la
    // foulée d'un tout petit coup). On coupe la cible pour désactiver le combat ce tour-ci ;
    // l'esquive/dash normale juste en dessous reste active pour s'écarter des télégraphes.
    if (pl.hp < pl.maxHp * 0.15 && pl.potions <= 0) {
      let nearest = null, nearestD = Infinity;
      for (const e of game.enemies) {
        if (e.dead || !e.active) continue;
        const d = AR.U.dist(pcx, pcy, e.centerX(), e.centerY());
        if (d < nearestD) { nearestD = d; nearest = e; }
      }
      if (nearest && nearestD < 500) {
        goalX = pcx - (AR.U.sign(nearest.centerX() - pcx) || 1) * 300;
        target = null;
      }
    }

    // esquive : menace proche ou télégraphe adverse
    const targetTelegraph = target && ['tele', 'charge', 'attack'].includes(target.state) && realTd < 230;
    const bypassTelegraph = avoidedThreat && ['tele', 'charge', 'attack', 'dash'].includes(avoidedThreat.state) && avoidedTd < 210;
    const telegraphed = targetTelegraph || bypassTelegraph;
    if ((threat || telegraphed) && this.decideT <= 0) {
      // le dash esquive aussi vite qu'un saut sans laisser l'IA suspendue en
      // l'air ni interrompre son élan : on ne saute que s'il n'est pas dispo.
      if (pl.dashCharges > 0 && !pl.dashing) a.dash = true;
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
        // `pl.facing` n'est mis à jour par le jeu qu'en se déplaçant (ou en
        // visant à l'arc) : immobile à portée de corps à corps (ex. juste
        // après avoir grimpé sur une corniche), il restait figé sur l'ancienne
        // direction de marche et les coups d'épée manquaient indéfiniment
        // (retour joueur : IA bloquée, tape dans le vide). On le réoriente
        // explicitement vers la cible avant chaque coup.
        pl.facing = AR.U.sign(dx) || pl.facing;
        if (this.swordPlan > 0) {
          this.swordPlan -= dt;
          a.sword = this.swordPlan > 0.02;
        } else if (this.decideT <= 0) {
          // Un coup chargé traverse la garde (pierceBlock) et repousse le porteur de
          // bouclier au lieu de subir la réduction de dégâts d'un coup simple contre lui
          // (retour joueur : les coups simples tapent dans le bouclier pour rien) — on le
          // privilégie donc nettement plus contre un ennemi bloquant qu'en mêlée normale.
          const chargeChance = projectileBlocker ? 0.8 : 0.22;
          if (Math.random() < chargeChance) this.swordPlan = pl.stats.swordChargeTime + 0.12;
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
        // du butin visible resté derrière nous (à l'opposé de la cible) : autant
        // le récupérer en mitraillant à l'arc plutôt que foncer et le perdre hors champ.
        if (!target.isBoss && !telegraphed) {
          const nearbyLoot = this._pickVisibleLoot(game, pcx, pcy);
          if (nearbyLoot && AR.U.sign(nearbyLoot.x - pcx) !== AR.U.sign(dx) &&
              !this._trackLootAttempt(game, pl, nearbyLoot, pcx, pcy, dt)) {
            goalX = nearbyLoot.x;
            loot = nearbyLoot;
          }
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
        // saut+dash imprécis vers un butin (ex: pièce au bord d'une fosse sous
        // une plateforme) : compter la tentative pour ne pas boucler dessus indéfiniment
        if (loot && goalX === loot.x) this._recordLootJump(loot);
      }
    }
    if (this.traversal) {
      goalX = this.traversal.landingX;
      chest = null;
      this._clearChestAttempt();
      this._clearLootAttempt();
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
      // Un ennemi simplement perçu mais trop loin pour qu'on l'engage (même
      // seuil que la décision de combat plus haut) ne doit pas empêcher de
      // filer en sprint sur du terrain dégagé.
      const noRelevantTarget = !target || (!target.isBoss && realTd >= 520);
      if (pl.onGround && Math.abs(goalX - pcx) > 300 && noRelevantTarget && !obstacleInDashRange) {
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
      const overGap = this._supportYAt(lvl, pcx, pl.y + pl.h) > AR.C.WORLD_H * AR.C.TILE;
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
    } else if (parryProjectile) {
      // A le dernier mot sur la garde/direction : parer prime sur un plan de
      // combat en cours (charge d'arc/sabre), sans annuler une traversée.
      a.left = parryProjectile.x < pcx;
      a.right = !a.left;
      a.sword = true;
    }

    this._applyJump(a, dt);
    AR.Input.setVirtual(a, aimX, aimY);
  },
};
