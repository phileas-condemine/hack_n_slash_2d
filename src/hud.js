// Arcane Rift - HUD en jeu : barres, or, potions, sorts, boss, bannières, curseur
window.AR = window.AR || {};

AR.HUD = {
  bannerT: 0, bannerText: '', bannerSub: '',
  notices: [],   // messages temporaires

  banner(text, sub) { this.bannerText = text; this.bannerSub = sub || ''; this.bannerT = 3.4; },
  notify(text, color) {
    this.notices.push({ text, color: color || AR.C.COLORS.text, t: 3.2 });
    if (this.notices.length > 5) this.notices.shift();
  },

  update(dt) {
    this.bannerT -= dt;
    for (let i = this.notices.length - 1; i >= 0; i--) {
      this.notices[i].t -= dt;
      if (this.notices[i].t <= 0) this.notices.splice(i, 1);
    }
  },

  draw(ctx, game) {
    const C = AR.C.COLORS, pl = game.player;
    ctx.save();
    ctx.textBaseline = 'alphabetic';

    // ---------------- barres de vie / esprit / XP
    const bx = 22, by = 22, bw = 250;
    // PV
    this._bar(ctx, bx, by, bw, 18, pl.hp / pl.maxHp, C.hp, C.hpDark);
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(pl.hp) + ' / ' + pl.maxHp, bx + bw / 2, by + 14);
    // Esprit
    this._bar(ctx, bx, by + 24, bw * 0.8, 12, pl.spirit / pl.stats.maxSpirit, C.spirit, C.spiritDark);
    // XP
    this._bar(ctx, bx, by + 40, bw * 0.8, 7, pl.xp / pl.xpNext(), C.xp, '#2a3a55');
    ctx.fillStyle = C.text; ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText('Niv ' + pl.level, bx + bw * 0.8 + 10, by + 49);

    // potions
    for (let i = 0; i < pl.potionMax; i++) {
      const px = bx + i * 26, py = by + 66;
      ctx.globalAlpha = i < pl.potions ? 1 : 0.25;
      ctx.fillStyle = '#4a90c2';
      ctx.beginPath(); ctx.arc(px + 8, py + 10, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a6a42'; ctx.fillRect(px + 5, py - 2, 6, 6);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = C.textDim; ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillText('[F]', bx + pl.potionMax * 26 + 6, by + 80);

    // or
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.arc(bx + 8, by + 106, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(bx + 6, by + 104, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.text; ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillText(game.coins, bx + 22, by + 112);

    // armes courantes
    ctx.font = '11px "Segoe UI", sans-serif'; ctx.fillStyle = C.textDim;
    ctx.fillText(AR.WEAPONS.sword[pl.swordTier].name + '  •  ' + AR.WEAPONS.bow[pl.bowTier].name, bx, by + 132);

    // point de compétence dispo
    if (pl.skillPoints > 0 && !game.demo) {
      ctx.globalAlpha = 0.75 + Math.sin(game.time * 5) * 0.25;
      ctx.fillStyle = C.xp; ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText('★ ' + pl.skillPoints + ' point' + (pl.skillPoints > 1 ? 's' : '') + ' de compétence — [T]', bx, by + 154);
      ctx.globalAlpha = 1;
    }

    // ---------------- sorts (si débloqués)
    let sx = bx;
    for (let i = 0; i < 4; i++) {
      if (!pl.spellUnlocked(i)) continue;
      const sp = AR.SPELLS[i];
      const cost = sp.cost * pl.stats.spellCostMult;
      const ok = pl.spirit >= cost;
      ctx.fillStyle = 'rgba(10,14,18,0.7)';
      ctx.fillRect(sx, AR.C.VIEW_H - 58, 40, 40);
      ctx.strokeStyle = ok ? C.magic : '#333';
      ctx.lineWidth = 2; ctx.strokeRect(sx, AR.C.VIEW_H - 58, 40, 40);
      ctx.fillStyle = ok ? C.text : C.textDim;
      ctx.font = 'bold 16px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sp.key, sx + 20, AR.C.VIEW_H - 32);
      ctx.font = '9px "Segoe UI", sans-serif';
      ctx.fillText(Math.round(cost), sx + 20, AR.C.VIEW_H - 22);
      sx += 48;
      ctx.textAlign = 'left';
    }

    // ---------------- infos de droite : ère, temps, kills
    ctx.textAlign = 'right';
    ctx.fillStyle = C.text; ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText((game.eraIdx + 1) + '/6 — ' + game.level.era.name + (game.ngPlus > 0 ? '  (NG+' + game.ngPlus + ')' : ''), AR.C.VIEW_W - 22, 34);
    ctx.fillStyle = C.textDim; ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText(AR.U.fmtTime(game.stats.time) + '   ⚔ ' + game.stats.kills, AR.C.VIEW_W - 22, 54);

    // mode démo
    if (game.demo) {
      ctx.fillStyle = C.spirit; ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText('● MODE DÉMO (IA)  ×' + game.speed + '   [G] quitter  [+/-] vitesse', AR.C.VIEW_W - 22, 78);
    }
    // enregistrement
    if (AR.Recorder.recording) {
      ctx.fillStyle = C.danger;
      ctx.globalAlpha = 0.6 + Math.sin(game.time * 6) * 0.4;
      ctx.beginPath(); ctx.arc(AR.C.VIEW_W - 150, 96, 6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillText('REC ' + AR.U.fmtTime(AR.Recorder.elapsed()), AR.C.VIEW_W - 22, 100);
    }
    if (AR.Recorder.error) {
      ctx.fillStyle = C.danger; ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText(AR.Recorder.error, AR.C.VIEW_W - 22, 118);
    }
    ctx.textAlign = 'left';

    // ---------------- barre de boss
    if (game.boss && !game.boss.dead) {
      const b = game.boss;
      const bbw = 520, bbx = (AR.C.VIEW_W - bbw) / 2, bby = AR.C.VIEW_H - 44;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bbx - 4, bby - 4, bbw + 8, 26);
      this._bar(ctx, bbx, bby, bbw, 14, Math.max(0, b.hp / b.maxHp), b.phase === 2 ? C.danger : '#c0392b', '#3d1520');
      ctx.fillStyle = C.text; ctx.font = 'bold 14px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b.name + (b.phase === 2 ? '  — ENRAGÉ' : ''), AR.C.VIEW_W / 2, bby - 10);
      ctx.textAlign = 'left';
    }

    // ---------------- invite d'interaction
    if (game.interactPrompt) {
      const p = game.interactPrompt;
      const x = p.x - game.camera.cx(), y = p.y - game.camera.cy() - (p.type === 'portal' ? 116 : 58);
      ctx.font = 'bold 14px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,14,18,0.85)';
      const label = p.type === 'chest' ? 'Ouvrir' : p.type === 'portal' ? 'Traverser la faille' : 'Marchander';
      const tw = ctx.measureText('[E] ' + label).width;
      ctx.fillRect(x - tw / 2 - 8, y - 16, tw + 16, 22);
      ctx.fillStyle = C.impact;
      ctx.fillText('[E] ' + label, x, y);
      ctx.textAlign = 'left';
    }

    // ---------------- bannière de niveau / boss
    if (this.bannerT > 0) {
      const k = Math.min(1, this.bannerT > 2.9 ? (3.4 - this.bannerT) * 2 : this.bannerT);
      ctx.globalAlpha = AR.U.clamp(k, 0, 1);
      ctx.fillStyle = 'rgba(10,14,18,0.55)';
      ctx.fillRect(0, AR.C.VIEW_H * 0.30, AR.C.VIEW_W, 96);
      ctx.textAlign = 'center';
      ctx.fillStyle = C.text;
      ctx.font = 'bold 40px Georgia, serif';
      ctx.fillText(this.bannerText, AR.C.VIEW_W / 2, AR.C.VIEW_H * 0.30 + 52);
      if (this.bannerSub) {
        ctx.fillStyle = C.textDim; ctx.font = 'italic 17px Georgia, serif';
        ctx.fillText(this.bannerSub, AR.C.VIEW_W / 2, AR.C.VIEW_H * 0.30 + 80);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }

    // ---------------- notifications
    let ny = 180;
    for (const n of this.notices) {
      ctx.globalAlpha = AR.U.clamp(n.t, 0, 1);
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(10,14,18,0.7)';
      const tw = ctx.measureText(n.text).width;
      ctx.fillRect(18, ny - 15, tw + 16, 22);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, 26, ny);
      ny += 28;
      ctx.globalAlpha = 1;
    }

    // ---------------- curseur / réticule (hors démo)
    if (!game.demo && game.state === 'play' && !game.paused && !game.shopOpen && !game.skillOpen) {
      const m = AR.Input.mouse;
      ctx.strokeStyle = C.spirit; ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(m.x, m.y, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(m.x - 12, m.y); ctx.lineTo(m.x - 5, m.y);
      ctx.moveTo(m.x + 5, m.y); ctx.lineTo(m.x + 12, m.y);
      ctx.moveTo(m.x, m.y - 12); ctx.lineTo(m.x, m.y - 5);
      ctx.moveTo(m.x, m.y + 5); ctx.lineTo(m.x, m.y + 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  },

  _bar(ctx, x, y, w, h, ratio, color, darkColor) {
    ratio = AR.U.clamp(ratio, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = darkColor;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * ratio, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x, y, w * ratio, Math.max(2, h * 0.3));
  },
};
