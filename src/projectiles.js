// Arcane Rift - projectiles (joueur & ennemis) : flèches, ondes, bombes, lasers...
window.AR = window.AR || {};

AR.Projectiles = {
  list: [],
  clear() { this.list.length = 0; },

  spawn(o) {
    // o: {x,y,vx,vy,g,dmg,friendly,pierce,kind,life,r,explodeR,homing,knock,slow,owner}
    o.t = 0;
    o.life = o.life || 3;
    o.r = o.r || 6;
    o.hitSet = o.pierce ? new Set() : null;
    this.list.push(o);
    return o;
  },

  // Destruction d'un projectile par une lame ou un bouclier (parade / blocage)
  destroy(p, style) {
    const i = this.list.indexOf(p);
    if (i < 0) return false;
    this.list.splice(i, 1);
    AR.Particles.burst(p.x, p.y, 8, {
      color: ['#fff', '#ffe9a3'], speed: 210, size: 2.5, life: 0.3, type: 'spark',
    });
    AR.Particles.text(p.x, p.y - 10, style === 'block' ? 'BLOQUÉ' : 'PARÉ !', AR.C.COLORS.impact);
    AR.Audio.sfx(style === 'block' ? 'block' : 'parry');
    return true;
  },

  // Les boucliers ne cassent que les projectiles "physiques" du joueur,
  // pas l'onde de la frappe chargée (qui traverse les lignes).
  _blockable(p) {
    return p.friendly && p.kind !== 'wave';
  },

  // Projectiles ennemis qu'un bouclier allié peut aussi intercepter (tir ami)
  _blockableAlly(p) {
    return !p.friendly && ['earrow', 'arrow', 'bullet', 'rock', 'javelin', 'plasma'].includes(p.kind);
  },

  update(dt, game) {
    const lvl = game.level;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      // Un projectile peut en détruire un autre pendant cette même boucle
      // (parade, bouclier, onde), ce qui décale les indices restants.
      if (!p) continue;
      p.t += dt;
      if (p.t >= p.life) { this._expire(p, game); this.list.splice(i, 1); continue; }

      // guidage (feux follets, drones...)
      if (p.homing) {
        const tgt = p.friendly ? game.nearestEnemy(p.x, p.y, 500) : game.player;
        if (tgt) {
          const ang = AR.U.angle(p.x, p.y, tgt.x + tgt.w / 2, tgt.y + tgt.h / 2);
          const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          const cur = Math.atan2(p.vy, p.vx);
          let diff = ang - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const na = cur + AR.U.clamp(diff, -p.homing * dt, p.homing * dt);
          p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.g) p.vy += p.g * dt;

      // traînées
      if (p.kind === 'parrow' || p.kind === 'plasma' || p.kind === 'fireball' || p.kind === 'wisp') {
        if (Math.random() < 0.6) AR.Particles.spawn({
          x: p.x, y: p.y, vx: 0, vy: 0, g: 0, life: 0.25, size: p.kind === 'parrow' ? 7 : 5,
          color: p.color || AR.C.COLORS.spirit, type: 'glow',
        });
      }
      if (p.kind === 'flame') {
        AR.Particles.spawn({
          x: p.x, y: p.y, vx: p.vx * 0.15, vy: -30 - Math.random() * 40, g: -60,
          life: 0.35, size: 6 + Math.random() * 7,
          color: Math.random() < 0.5 ? '#ff9a3d' : '#ffce6a', type: 'smoke',
        });
      }

      // terrain
      const tx = Math.floor(p.x / AR.C.TILE), ty = Math.floor(p.y / AR.C.TILE);
      if (lvl.solidAt(tx, ty)) { this._expire(p, game, true); this.list.splice(i, 1); continue; }

      // cibles
      let dead = false;
      if (p.friendly) {
        // l'onde de la frappe chargée fauche les projectiles ennemis
        if (p.kind === 'wave') {
          for (const q of this.list.slice()) {
            if (!q.friendly && AR.U.dist(p.x, p.y, q.x, q.y) < p.r + q.r + 6) this.destroy(q, 'parry');
          }
        }
        for (const e of game.enemies) {
          if (e.dead || !e.active || (p.hitSet && p.hitSet.has(e))) continue;
          if (this._hits(p, e)) {
            // blocage au bouclier : la flèche est cassée et n'atteint pas les alliés derrière
            if (this._blockable(p) && e.blocksArrow && e.blocksArrow(p)) {
              const idx = this.list.indexOf(p);
              if (idx >= 0) this.list.splice(idx, 1);
              AR.Particles.burst(p.x, p.y, 8, {
                color: ['#fff', '#ffe9a3'], speed: 210, size: 2.5, life: 0.3, type: 'spark',
              });
              AR.Particles.text(e.centerX(), e.y - 14, 'BLOQUÉ', AR.C.COLORS.impact);
              AR.Audio.sfx('block');
              e.onBlockArrow && e.onBlockArrow(game);
              dead = false; // déjà retiré de la liste
              break;
            }
            game.hitEnemy(e, p.dmg, { knockX: AR.U.sign(p.vx) * (p.knock || 160), proj: p });
            if (p.explodeR) { this._explode(p, game); dead = true; break; }
            if (p.hitSet) p.hitSet.add(e);
            else { dead = true; break; }
          }
        }
      } else {
        const pl = game.player;
        if (!pl.dead && this._hits(p, pl)) {
          if (p.slow) pl.applySlow ? pl.applySlow() : 0;
          game.hitPlayer(p.dmg, p.x);
          if (p.explodeR) this._explode(p, game);
          dead = true;
        } else if (p.t > 0.08) {
          // tir ami : les projectiles ennemis blessent aussi les autres monstres
          for (const e of game.enemies) {
            if (e.dead || !e.active || e === p.owner) continue;
            if (this._hits(p, e)) {
              if (this._blockableAlly(p) && e.blocksArrow && e.blocksArrow(p, true)) {
                AR.Particles.text(e.centerX(), e.y - 14, 'BLOQUÉ', AR.C.COLORS.impact);
                AR.Audio.sfx('block');
              } else {
                const dealt = e.takeDamage(Math.max(1, Math.round(p.dmg * 0.8)),
                  { fromX: p.x - AR.U.sign(p.vx || 1) * 20 }, game);
                if (dealt > 0) {
                  AR.Particles.text(e.centerX(), e.y - 6, String(dealt), '#ffb35c');
                  AR.Audio.sfx('hit');
                }
              }
              if (p.explodeR) this._explode(p, game);
              dead = true;
              break;
            }
          }
        }
      }
      if (dead) { this.list.splice(i, 1); continue; }
      if (this.list[i] !== p) continue; // retiré pendant un blocage
    }
  },

  _hits(p, e) {
    const cx = AR.U.clamp(p.x, e.x, e.x + e.w);
    const cy = AR.U.clamp(p.y, e.y, e.y + e.h);
    return AR.U.dist(p.x, p.y, cx, cy) < p.r;
  },

  _expire(p, game, hitGround) {
    if (p.explodeR) { this._explode(p, game); return; }
    if (hitGround && (p.kind === 'arrow' || p.kind === 'earrow' || p.kind === 'rock' || p.kind === 'javelin')) {
      AR.Particles.burst(p.x, p.y, 4, { color: '#c9bfa5', speed: 70, size: 2, life: 0.3 });
    }
  },

  _explode(p, game) {
    const r = p.explodeR;
    AR.Particles.shockwave(p.x, p.y, r, p.friendly ? AR.C.COLORS.spirit : '#ff9a3d');
    AR.Particles.burst(p.x, p.y, 16, { color: ['#ff9a3d', '#ffce6a', '#fff'], speed: 260, size: 4, life: 0.5 });
    AR.Audio.sfx('boom');
    game.camera.shake(5, 0.25);
    if (p.friendly) {
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d = AR.U.dist(p.x, p.y, e.x + e.w / 2, e.y + e.h / 2);
        if (d < r + Math.max(e.w, e.h) / 2) game.hitEnemy(e, p.dmg * 0.7, { knockX: AR.U.sign(e.x - p.x) * 220 });
      }
    } else {
      const pl = game.player;
      const d = AR.U.dist(p.x, p.y, pl.x + pl.w / 2, pl.y + pl.h / 2);
      if (!pl.dead && d < r + 30) game.hitPlayer(p.dmg * 0.8, p.x);
      // les explosions ennemies n'épargnent pas leurs alliés
      for (const e of game.enemies) {
        if (e.dead || !e.active || e === p.owner) continue;
        const ed = AR.U.dist(p.x, p.y, e.centerX(), e.centerY());
        if (ed < r + Math.max(e.w, e.h) / 2) {
          const dealt = e.takeDamage(Math.max(1, Math.round(p.dmg * 0.6)), { fromX: p.x }, game);
          if (dealt > 0) AR.Particles.text(e.centerX(), e.y - 6, String(dealt), '#ffb35c');
        }
      }
    }
  },

  draw(ctx, cam) {
    const cx = cam.cx(), cy = cam.cy();
    for (const p of this.list) {
      const x = p.x - cx, y = p.y - cy;
      if (x < -80 || x > AR.C.VIEW_W + 80 || y < -80 || y > AR.C.VIEW_H + 80) continue;
      const ang = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(x, y);
      switch (p.kind) {
        case 'arrow': case 'earrow':
          ctx.rotate(ang);
          ctx.strokeStyle = p.kind === 'arrow' ? '#d8ccae' : '#b09a7a';
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(9, 0); ctx.stroke();
          ctx.fillStyle = '#e8e2d4';
          ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(6, -3.5); ctx.lineTo(6, 3.5); ctx.closePath(); ctx.fill();
          break;
        case 'parrow': // flèche chargée perçante
          ctx.rotate(ang);
          ctx.shadowColor = AR.C.COLORS.spirit; ctx.shadowBlur = 14;
          ctx.strokeStyle = AR.C.COLORS.spirit; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(12, 0); ctx.stroke();
          ctx.fillStyle = '#d8fff4';
          ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(8, -5); ctx.lineTo(8, 5); ctx.closePath(); ctx.fill();
          break;
        case 'kunai':
          ctx.rotate(ang);
          ctx.fillStyle = '#b8c4c8';
          ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-4, -4); ctx.lineTo(-8, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
          ctx.shadowColor = AR.C.COLORS.spirit; ctx.shadowBlur = 8;
          break;
        case 'wave': { // onde de l'attaque chargée épée
          const k = 1 - p.t / p.life;
          ctx.rotate(p.vx < 0 ? Math.PI : 0);
          ctx.globalAlpha = k * 0.9;
          ctx.strokeStyle = AR.C.COLORS.spirit; ctx.lineWidth = 5; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(-10, 0, 30, -1.1, 1.1); ctx.stroke();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(-10, 0, 26, -0.9, 0.9); ctx.stroke();
          break;
        }
        case 'rock':
          ctx.rotate(p.t * 8);
          ctx.fillStyle = '#8a8066';
          ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(4, -5); ctx.lineTo(6, 3); ctx.lineTo(-3, 5); ctx.closePath(); ctx.fill();
          break;
        case 'javelin':
          ctx.rotate(ang);
          ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(12, 0); ctx.stroke();
          ctx.fillStyle = '#d8d8d8';
          ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(9, -4); ctx.lineTo(9, 4); ctx.closePath(); ctx.fill();
          break;
        case 'bullet':
          ctx.rotate(ang);
          ctx.fillStyle = '#ffd98a';
          ctx.beginPath(); ctx.ellipse(0, 0, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
          break;
        case 'plasma':
          ctx.shadowColor = p.color || '#e35cff'; ctx.shadowBlur = 12;
          ctx.fillStyle = p.color || '#e35cff';
          ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.5, ang, 0, Math.PI * 2); ctx.fill();
          break;
        case 'laser':
          ctx.rotate(ang);
          ctx.shadowColor = '#ff3d6e'; ctx.shadowBlur = 16;
          ctx.fillStyle = '#ff3d6e';
          ctx.fillRect(-26, -2.5, 52, 5);
          ctx.fillStyle = '#ffd8e4'; ctx.fillRect(-26, -1, 52, 2);
          break;
        case 'bomb': case 'mortar':
          ctx.rotate(p.t * 5);
          ctx.fillStyle = '#2a2a2a';
          ctx.beginPath(); ctx.arc(0, 0, p.kind === 'mortar' ? 8 : 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(3, -13); ctx.stroke();
          break;
        case 'flame':
          // le rendu passe surtout par les particules ; petit cœur lumineux
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = '#ffce6a';
          ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
          break;
        case 'wisp': {
          const pul = 1 + Math.sin(p.t * 14) * 0.25;
          ctx.shadowColor = p.color || '#c05cff'; ctx.shadowBlur = 14;
          ctx.fillStyle = p.color || '#c05cff';
          ctx.beginPath(); ctx.arc(0, 0, 7 * pul, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.arc(0, 0, 3 * pul, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'fireball':
          ctx.shadowColor = '#c05cff'; ctx.shadowBlur = 16;
          ctx.fillStyle = '#c05cff';
          ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffd8ff';
          ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
          break;
      }
      ctx.restore();
    }
  },
};
