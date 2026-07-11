// Arcane Rift - particules & effets transitoires (traits, ondes, télégraphes, textes)
window.AR = window.AR || {};

AR.Particles = {
  list: [],
  texts: [],   // nombres de dégâts / messages flottants

  clear() { this.list.length = 0; this.texts.length = 0; },

  spawn(p) {
    // {x,y,vx,vy,g,life,size,color,type:'dot'|'spark'|'ring'|'slash'|'shock'|'glow'|'smoke'|'petal', ...}
    p.t = 0;
    p.life = p.life || 0.5;
    if (this.list.length < 900) this.list.push(p);
  },

  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = (opts.angle !== undefined ? opts.angle : Math.random() * Math.PI * 2) + (Math.random() - 0.5) * (opts.spread !== undefined ? opts.spread : Math.PI * 2);
      const sp = (opts.speed || 120) * (0.4 + Math.random() * 0.8);
      this.spawn({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0),
        g: opts.g !== undefined ? opts.g : 300,
        life: (opts.life || 0.5) * (0.6 + Math.random() * 0.7),
        size: (opts.size || 4) * (0.6 + Math.random() * 0.8),
        color: Array.isArray(opts.color) ? opts.color[Math.floor(Math.random() * opts.color.length)] : opts.color,
        type: opts.type || 'dot',
      });
    }
  },

  text(x, y, str, color, big) {
    this.texts.push({ x: x + (Math.random() - 0.5) * 14, y, str, color: color || '#fff', t: 0, life: big ? 1.2 : 0.8, big });
    if (this.texts.length > 60) this.texts.shift();
  },

  // Effets "riches" prédéfinis
  slashArc(x, y, facing, big, color) {
    this.spawn({ x, y, facing, type: 'slash', life: big ? 0.28 : 0.18, size: big ? 95 : 62, color: color || AR.C.COLORS.spirit });
  },
  shockwave(x, y, r, color) {
    this.spawn({ x, y, type: 'shock', life: 0.42, size: r, color: color || AR.C.COLORS.spirit });
  },
  telegraphCircle(x, y, r, dur, color) {
    this.spawn({ x, y, type: 'tele', life: dur, size: r, color: color || AR.C.COLORS.danger });
  },
  // Grosse flèche qui pointe vers une frappe au sol prévue à l'avance (ex. saut de
  // boss) : la cible est FIXE, dessinée dès le début du télégraphe, pour que
  // s'écarter de cet endroit précis suffise à esquiver.
  arrowDown(x, y, dur, color) {
    this.spawn({ x, y, type: 'arrowDown', life: dur, size: 40, color: color || AR.C.COLORS.danger });
  },
  // Points qui convergent progressivement vers le boss avant qu'il ne les relâche
  // en anneau de projectiles (attaque « en étoile »).
  convergingRing(cx, cy, radius, n, dur, color) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      const x0 = cx + Math.cos(a) * radius, y0 = cy + Math.sin(a) * radius;
      const life = dur * (0.85 + Math.random() * 0.15);
      this.spawn({
        x: x0, y: y0, vx: (cx - x0) / life, vy: (cy - y0) / life, g: 0,
        life, size: 4 + Math.random() * 2.5, color: color || AR.C.COLORS.danger, type: 'converge',
      });
    }
  },

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) { this.list.splice(i, 1); continue; }
      if (p.vx !== undefined) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.g || 0) * dt;
        if (p.type === 'petal') { p.x += Math.sin(p.t * 3 + p.y * 0.01) * 30 * dt; }
      }
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.t += dt; t.y -= 45 * dt;
      if (t.t >= t.life) this.texts.splice(i, 1);
    }
  },

  draw(ctx, cam) {
    const cx = cam.cx(), cy = cam.cy();
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      const x = p.x - cx, y = p.y - cy;
      if (x < -150 || x > AR.C.VIEW_W + 150 || y < -150 || y > AR.C.VIEW_H + 150) continue;
      ctx.save();
      switch (p.type) {
        case 'spark':
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, p.size * 0.35);
          ctx.beginPath(); ctx.moveTo(x, y);
          ctx.lineTo(x - (p.vx || 0) * 0.03, y - (p.vy || 0) * 0.03); ctx.stroke();
          break;
        case 'ring':
          ctx.globalAlpha = k * 0.9;
          ctx.strokeStyle = p.color; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(x, y, p.size * (1 - k * 0.5), 0, Math.PI * 2); ctx.stroke();
          break;
        case 'shock': {
          const r = p.size * AR.U.easeOutCubic(p.t / p.life);
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.color; ctx.lineWidth = 5 * k + 1;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = k * 0.25;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'slash': {
          // arc de coupe : croissant orienté
          const prog = p.t / p.life;
          ctx.translate(x, y);
          ctx.scale(p.facing || 1, 1);
          ctx.rotate(-0.9 + prog * 1.8);
          ctx.globalAlpha = (1 - prog) * 0.85;
          ctx.strokeStyle = p.color; ctx.lineCap = 'round';
          ctx.lineWidth = p.size * 0.16 * (1 - prog * 0.5);
          ctx.beginPath(); ctx.arc(0, 0, p.size, -0.85, 0.85); ctx.stroke();
          ctx.lineWidth *= 0.4; ctx.globalAlpha *= 0.8; ctx.strokeStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(0, 0, p.size * 0.96, -0.7, 0.7); ctx.stroke();
          break;
        }
        case 'tele': {
          // télégraphe au sol : cercle qui se remplit (danger)
          const prog = p.t / p.life;
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = p.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(x, y, p.size * prog, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'arrowDown': {
          // pulse + descend légèrement pour attirer l'œil vers le point d'impact fixe
          const prog = p.t / p.life;
          const bob = Math.sin(p.t * 10) * 6;
          const s = p.size * (0.85 + Math.sin(p.t * 10) * 0.15);
          ctx.globalAlpha = 0.55 + prog * 0.4;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(x, y - s * 1.6 + bob);
          ctx.lineTo(x - s * 0.55, y - s * 0.5 + bob);
          ctx.lineTo(x - s * 0.22, y - s * 0.5 + bob);
          ctx.lineTo(x - s * 0.22, y + bob);
          ctx.lineTo(x + s * 0.22, y + bob);
          ctx.lineTo(x + s * 0.22, y - s * 0.5 + bob);
          ctx.lineTo(x + s * 0.55, y - s * 0.5 + bob);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 0.35 + prog * 0.35;
          ctx.strokeStyle = p.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, y + 3, s * (0.5 + prog * 0.3), s * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
          break;
        }
        case 'converge': {
          ctx.globalAlpha = 0.55 + (p.t / p.life) * 0.4;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha *= 0.5;
          ctx.beginPath(); ctx.arc(x, y, p.size * 1.8, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'glow': {
          ctx.globalAlpha = k * 0.6;
          const gr = ctx.createRadialGradient(x, y, 0, x, y, p.size);
          gr.addColorStop(0, p.color); gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gr;
          ctx.fillRect(x - p.size, y - p.size, p.size * 2, p.size * 2);
          break;
        }
        case 'smoke':
          ctx.globalAlpha = k * 0.35;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(x, y, p.size * (1 + p.t * 2), 0, Math.PI * 2); ctx.fill();
          break;
        case 'petal':
          ctx.globalAlpha = k * 0.9;
          ctx.fillStyle = p.color;
          ctx.translate(x, y); ctx.rotate(p.t * 4);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          break;
        default: // dot
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(x, y, p.size * k + 0.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    // textes flottants
    for (const t of this.texts) {
      const k = 1 - t.t / t.life;
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = (t.big ? 'bold 26px' : 'bold 17px') + ' "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText(t.str, t.x - cx, t.y - cy);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x - cx, t.y - cy);
      ctx.restore();
    }
  },
};
