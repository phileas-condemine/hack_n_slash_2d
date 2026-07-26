// Arcane Rift - objets au sol : pièces, cœurs, potions, coffres, portail, marchand
window.AR = window.AR || {};

AR.Pickups = {
  list: [],
  clear() { this.list.length = 0; },

  spawn(o) { o.t = 0; this.list.push(o); return o; },

  coinBurst(x, y, count, value) {
    for (let i = 0; i < count; i++) {
      this.spawn({
        type: 'coin', x, y: y - 10, value: value || 1,
        vx: (Math.random() - 0.5) * 260, vy: -180 - Math.random() * 200, settled: false,
      });
    }
  },

  drop(type, x, y) {
    this.spawn({ type, x, y: y - 10, vx: (Math.random() - 0.5) * 120, vy: -220, settled: false });
  },

  update(dt, game) {
    const pl = game.player;
    const pcx = pl.x + pl.w / 2, pcy = pl.y + pl.h / 2;
    const T = AR.C.TILE;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      // bug de rebond : une pièce peut finir encastrée dans un mur -> la faire
      // ressortir latéralement vers le joueur jusqu'à ce qu'elle soit dégagée
      if (p.type === 'coin' && game.level.solidAt(Math.floor(p.x / T), Math.floor(p.y / T))) {
        p.x += (pcx >= p.x ? 1 : -1) * 220 * dt;
        p.settled = false;
        p.vy = 0;
      }
      // physique simple pour les drops
      if (!p.settled && (p.type === 'coin' || p.type === 'heart' || p.type === 'potionDrop')) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1200 * dt;
        p.vx *= 0.985;
        const gy = game.level.groundYAtEntity(p.x, p.y);
        if (p.y >= gy - 4 && p.vy > 0) { p.y = gy - 4; p.vy = -p.vy * 0.35; if (Math.abs(p.vy) < 60) p.settled = true; }
        if (p.y > AR.C.WORLD_H * AR.C.TILE + 200) { this.list.splice(i, 1); continue; }
      }
      // aimant à pièces
      if (p.type === 'coin' && p.t > 0.35) {
        const d = AR.U.dist(p.x, p.y, pcx, pcy);
        if (d < 130 || game.demo) {
          const pull = d < 130 ? (1 - d / 130) * 900 + 200 : 0;
          if (pull > 0) {
            p.settled = false;
            p.x += (pcx - p.x) / d * pull * dt;
            p.y += (pcy - p.y) / d * pull * dt;
            p.vy = 0;
          }
        }
        if (d < 26) {
          game.addCoins(p.value);
          AR.Audio.sfx('coin');
          this.list.splice(i, 1); continue;
        }
      }
      if (p.type === 'heart' || p.type === 'potionDrop') {
        if (AR.U.dist(p.x, p.y, pcx, pcy) < 34) {
          if (p.type === 'heart') { pl.heal(16); AR.Particles.text(p.x, p.y - 20, '+16', AR.C.COLORS.hp); }
          else if (pl.potions < pl.potionMax) { pl.potions++; AR.Particles.text(p.x, p.y - 20, '+1 potion', '#7ec8ff'); }
          else { game.addCoins(15); AR.Particles.text(p.x, p.y - 20, '+15 or', AR.C.COLORS.gold); }
          AR.Audio.sfx('potion');
          this.list.splice(i, 1); continue;
        }
      }
    }
  },

  // objet interactif le plus proche du joueur (coffre / portail / marchand)
  nearestInteractive(pl) {
    let best = null, bd = 70;
    for (const p of this.list) {
      if (p.type !== 'chest' && p.type !== 'portal' && p.type !== 'merchant') continue;
      if (p.type === 'chest' && p.opened) continue;
      if (p.type === 'merchant' && p.used) continue;
      const d = AR.U.dist(p.x, p.y - 20, pl.x + pl.w / 2, pl.y + pl.h / 2);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  },

  draw(ctx, cam, time, era) {
    const cx = cam.cx(), cy = cam.cy();
    for (const p of this.list) {
      const x = p.x - cx, y = p.y - cy;
      if (x < -120 || x > AR.C.VIEW_W + 120) continue;
      ctx.save();
      ctx.translate(x, y);
      switch (p.type) {
        case 'coin': {
          const sq = Math.abs(Math.sin(time * 6 + p.x * 0.1));
          ctx.fillStyle = AR.C.COLORS.gold;
          ctx.beginPath(); ctx.ellipse(0, -5, 6 * (0.3 + sq * 0.7), 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff3c4'; ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.ellipse(-1, -6.5, 2.4 * (0.3 + sq * 0.7), 2.4, 0, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'heart': {
          const b = 1 + Math.sin(time * 5) * 0.1;
          ctx.scale(b, b);
          ctx.fillStyle = AR.C.COLORS.hp;
          ctx.beginPath();
          ctx.moveTo(0, -2);
          ctx.bezierCurveTo(-9, -12, -16, -2, 0, 8);
          ctx.bezierCurveTo(16, -2, 9, -12, 0, -2);
          ctx.fill();
          break;
        }
        case 'potionDrop':
          ctx.fillStyle = '#4a90c2';
          ctx.beginPath(); ctx.arc(0, -5, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#8a6a42'; ctx.fillRect(-2.5, -16, 5, 6);
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath(); ctx.arc(-2, -7, 2.4, 0, Math.PI * 2); ctx.fill();
          break;
        case 'chest': {
          const c1 = p.opened ? '#5a4a32' : '#8a6a42';
          ctx.fillStyle = c1;
          ctx.fillRect(-16, -22, 32, 22);
          ctx.fillStyle = p.opened ? '#3a2f20' : '#6a5238';
          ctx.fillRect(-16, -26, 32, 8);
          ctx.fillStyle = AR.C.COLORS.gold;
          ctx.fillRect(-2.5, -20, 5, 8);
          if (!p.opened) {
            ctx.globalAlpha = 0.45 + Math.sin(time * 4) * 0.25;
            ctx.shadowColor = AR.C.COLORS.gold; ctx.shadowBlur = 14;
            ctx.strokeStyle = AR.C.COLORS.gold; ctx.lineWidth = 1.5;
            ctx.strokeRect(-16, -26, 32, 26);
          }
          break;
        }
        case 'portal': {
          const pulse = 1 + Math.sin(time * 3) * 0.12;
          ctx.shadowColor = AR.C.COLORS.spirit; ctx.shadowBlur = 26;
          for (let k = 0; k < 3; k++) {
            ctx.globalAlpha = 0.85 - k * 0.25;
            ctx.strokeStyle = k === 1 ? '#c8fff2' : AR.C.COLORS.spirit;
            ctx.lineWidth = 4 - k;
            ctx.beginPath();
            ctx.ellipse(0, -52, (26 + k * 9) * pulse, (48 + k * 9) * pulse, Math.sin(time * 0.8 + k) * 0.15, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = 0.30;
          ctx.fillStyle = AR.C.COLORS.spirit;
          ctx.beginPath(); ctx.ellipse(0, -52, 24 * pulse, 44 * pulse, 0, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'merchant': {
          // marchand encapuchonné avec lanterne
          const bob = Math.sin(time * 1.8) * 2;
          ctx.translate(0, bob * 0.4);
          ctx.fillStyle = '#3d3550';
          ctx.beginPath();
          ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-16, -52, 0, -56);
          ctx.quadraticCurveTo(16, -52, 16, 0); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#2a2438';
          ctx.beginPath(); ctx.arc(0, -46, 10, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
          ctx.fillStyle = '#ffce7a';
          ctx.globalAlpha = 0.9;
          ctx.beginPath(); ctx.arc(-3, -46, 2, 0, Math.PI * 2); ctx.arc(4, -46, 2, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          // lanterne
          ctx.strokeStyle = '#6a5238'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(14, -34); ctx.lineTo(22, -30 + bob); ctx.stroke();
          ctx.fillStyle = '#ffce7a';
          ctx.globalAlpha = 0.55 + Math.sin(time * 4) * 0.2;
          ctx.shadowColor = '#ffce7a'; ctx.shadowBlur = 16;
          ctx.fillRect(19, -30 + bob, 7, 10);
          break;
        }
      }
      ctx.restore();
    }
  },
};
