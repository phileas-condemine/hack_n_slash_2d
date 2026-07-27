// Arcane Rift - HUD en jeu : barres, or, potions, sorts, boss, bannières, curseur
window.AR = window.AR || {};

AR.HUD = {
  bannerT: 0, bannerText: '', bannerSub: '',
  notices: [],   // messages temporaires
  statsCollapsed: false,  // repli du panneau "CARACTÉRISTIQUES" [Tab]

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

    // ---------------- sorts : 4 emplacements illustrés (verrouillés ou prêts)
    let sx = bx;
    const slot = 48, sy = AR.C.VIEW_H - 66;
    let hoverSpell = -1, hoverX = 0;
    for (let i = 0; i < 4; i++) {
      const sp = AR.SPELLS[i];
      const unlocked = pl.spellUnlocked(i);
      const cost = sp.cost * pl.stats.spellCostMult;
      const ready = unlocked && pl.spirit >= cost && pl.spellCds[i] <= 0;
      if (AR.U.pointInRect(AR.Input.mouse.x, AR.Input.mouse.y, { x: sx, y: sy, w: slot, h: slot })) {
        hoverSpell = i; hoverX = sx;
      }
      // fond + icône
      ctx.fillStyle = 'rgba(10,14,18,0.78)';
      ctx.fillRect(sx, sy, slot, slot);
      AR.Assets.drawIcon(ctx, sp.icon, sx + 3, sy + 3, slot - 6, unlocked ? (ready ? 1 : 0.45) : 0.18);
      // liseré
      ctx.strokeStyle = ready ? C.magic : unlocked ? '#4a3a5e' : '#2a2f33';
      ctx.lineWidth = ready ? 2 : 1.5;
      ctx.strokeRect(sx, sy, slot, slot);
      // halo quand le sort est prêt
      if (ready) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(game.time * 4 + i) * 0.15;
        ctx.shadowColor = C.magic; ctx.shadowBlur = 10;
        ctx.strokeStyle = C.magic; ctx.lineWidth = 1;
        ctx.strokeRect(sx - 1.5, sy - 1.5, slot + 3, slot + 3);
        ctx.restore();
      }
      // touche (coin haut-gauche)
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(sx, sy, 15, 15);
      ctx.fillStyle = unlocked ? C.text : C.textDim;
      ctx.font = 'bold 11px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(sp.key, sx + 7.5, sy + 11.5);
      if (unlocked) {
        // coût en esprit (coin bas-droit)
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(sx + slot - 19, sy + slot - 14, 19, 14);
        ctx.fillStyle = pl.spirit >= cost ? C.spirit : C.danger;
        ctx.font = 'bold 10px "Segoe UI", sans-serif';
        ctx.fillText(Math.round(cost), sx + slot - 9.5, sy + slot - 3.5);
      } else {
        // cadenas
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(sx, sy, slot, slot);
        ctx.font = '17px "Segoe UI", sans-serif';
        ctx.fillStyle = '#8a8f94';
        ctx.fillText('🔒', sx + slot / 2, sy + slot / 2 + 6);
      }
      sx += slot + 8;
      ctx.textAlign = 'left';
    }
    // nom du sort survolé... au cast : petit rappel sous les slots
    ctx.fillStyle = C.textDim;
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(pl.spellUnlocked(0) || pl.spellUnlocked(2) ? 'Sorts [1-4]' : 'Sorts : arbre [T], voie de l\'Esprit', bx, AR.C.VIEW_H - 8);

    // info-bulle au survol (souris uniquement — sur tactile, la fenêtre de révélation
    // affichée au déblocage du sort fait déjà ce travail, cf. AR.UI.drawSpellReveal)
    if (hoverSpell >= 0) this._spellTooltip(ctx, game, AR.SPELLS[hoverSpell], hoverX, sy, pl);

    // ---------------- infos de droite : ère, temps, kills
    ctx.textAlign = 'right';
    ctx.fillStyle = C.text; ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText((game.eraIdx + 1) + '/6 — ' + game.level.era.name + (game.ngPlus > 0 ? '  (NG+' + game.ngPlus + ')' : ''), AR.C.VIEW_W - 22, 34);
    ctx.fillStyle = C.textDim; ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText(AR.U.fmtTime(game.stats.time) + '   ⚔ ' + game.stats.kills, AR.C.VIEW_W - 22, 54);
    ctx.fillStyle = game.diff.color; ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.fillText(game.diff.name.toUpperCase(), AR.C.VIEW_W - 22, 72);

    // mode démo
    if (game.demo) {
      ctx.fillStyle = C.spirit; ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText('● MODE DÉMO (IA)  ×' + game.speed + '   [G] quitter  [+/-] vitesse', AR.C.VIEW_W - 22, 92);
    }
    // Caractéristiques calculées : niveaux, compétences, armes, objets et failles.
    const statsY = game.demo ? 108 : 88;
    const statsH = this._drawStats(ctx, game, statsY);

    // enregistrement
    const recorderY = statsY + statsH + 20;
    if (AR.Recorder.recording) {
      ctx.fillStyle = C.danger;
      ctx.globalAlpha = 0.6 + Math.sin(game.time * 6) * 0.4;
      ctx.beginPath(); ctx.arc(AR.C.VIEW_W - 150, recorderY, 6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillText('REC ' + AR.U.fmtTime(AR.Recorder.elapsed()), AR.C.VIEW_W - 22, recorderY + 4);
    }
    if (AR.Recorder.error) {
      ctx.fillStyle = C.danger; ctx.font = '12px "Segoe UI", sans-serif';
      ctx.fillText(AR.Recorder.error, AR.C.VIEW_W - 22, recorderY + 22);
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

    // ---------------- invite d'escalade (liane/échelle) : discoverability
    if (!game.player.climbing && game.level.climbableAt) {
      const pl = game.player;
      const onClimb = game.level.climbableAt(pl.x + pl.w / 2, pl.y + pl.h / 2);
      if (onClimb) {
        const x = pl.x + pl.w / 2 - game.camera.cx(), y = pl.y - game.camera.cy() - 14;
        ctx.font = 'bold 14px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
        const label = '↑ / ↓ : Grimper';
        ctx.fillStyle = 'rgba(10,14,18,0.85)';
        const tw = ctx.measureText(label).width;
        ctx.fillRect(x - tw / 2 - 8, y - 16, tw + 16, 22);
        ctx.fillStyle = C.spirit;
        ctx.fillText(label, x, y);
        ctx.textAlign = 'left';
      }
    }

    // ---------------- invite d'interaction
    if (game.interactPrompt) {
      const p = game.interactPrompt;
      const x = p.x - game.camera.cx(), y = p.y - game.camera.cy() - (p.type === 'portal' ? 116 : 58);
      ctx.font = 'bold 14px "Segoe UI", sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(10,14,18,0.85)';
      const label = p.type === 'chest' ? 'Ouvrir' : p.type === 'portal' ? 'Traverser la faille' :
        p.type === 'lever' ? 'Actionner' : 'Marchander';
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
    if (!game.demo && !AR.Touch.enabled && game.state === 'play' && !game.paused && !game.shopOpen && !game.skillOpen) {
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

  _drawStats(ctx, game, y) {
    const C = AR.C.COLORS, pl = game.player, st = pl.stats, P = AR.C.PLAYER;
    const w = 300, x = AR.C.VIEW_W - 22 - w;
    const h = this.statsCollapsed ? 22 : 184;

    ctx.save();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(10,14,18,0.72)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(126,200,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = C.xp;
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillText('CARACTÉRISTIQUES', x + 10, y + 17);
    ctx.textAlign = 'right';
    const toggleHint = '[Tab] ' + (this.statsCollapsed ? '▸ déplier' : '▾ replier');
    if (this.statsCollapsed) {
      ctx.fillStyle = C.textDim;
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.fillText(toggleHint, x + w - 10, y + 17);
      ctx.restore();
      return h;
    }
    const bowCount = pl.skills.has('bow4') ? 3 : 1;
    const bowNormal = st.bowDmg * (bowCount > 1 ? 0.7 : 1);
    const levelBonus = (st.levelMult - 1) * 100;
    const fmt = (value) => value.toFixed(1);

    ctx.fillStyle = C.xp;
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.fillText('niveau +' + fmt(levelBonus) + '%', x + w - 10, y + 17);
    ctx.fillStyle = C.textDim;
    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillText(toggleHint, x + w - 10, y + 30);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = C.text;
    ctx.textAlign = 'left';
    ctx.fillText('PV ' + st.maxHp + '   Esprit ' + st.maxSpirit + '  (+' + fmt(st.spiritRegen) + '/s)', x + 10, y + 38);
    ctx.fillText('Sabre  ' + fmt(st.swordDmg) + ' normal   ' + fmt(st.swordDmg * st.chargedSwordMult) + ' chargé', x + 10, y + 57);
    ctx.fillStyle = C.textDim;
    ctx.fillText('          recharge ' + st.swordCooldown.toFixed(2) + 's   charge ' + st.swordChargeTime.toFixed(2) + 's', x + 10, y + 74);
    ctx.fillStyle = C.text;
    ctx.fillText('Arc     ' + fmt(bowNormal) + (bowCount > 1 ? ' ×' + bowCount : '') + ' normal   ' + fmt(st.bowDmg * P.CHARGED_BOW_MULT) + ' chargé' + (pl.skills.has('bow3') ? ' explosif' : ''), x + 10, y + 94);
    ctx.fillStyle = C.textDim;
    ctx.fillText('          recharge ' + st.bowCooldown.toFixed(2) + 's   charge ' + st.bowChargeTime.toFixed(2) + 's', x + 10, y + 111);
    ctx.fillStyle = C.text;
    ctx.fillText('Vitesse  ' + Math.round(P.WALK * st.speed) + ' marche   ' + Math.round(P.SPRINT * st.speed) + ' sprint', x + 10, y + 131);
    ctx.fillStyle = C.textDim;
    ctx.fillText('Dash     recharge ' + st.dashCd.toFixed(2) + 's   charges ' + st.dashMax, x + 10, y + 150);
    ctx.fillText('Critique ' + Math.round(st.crit * 100) + '%   réduction dégâts ' + Math.round((1 - st.armor) * 100) + '%', x + 10, y + 169);
    ctx.restore();
    return h;
  },

  _spellTooltip(ctx, game, sp, sx, sy, pl) {
    const C = AR.C.COLORS;
    const unlocked = pl.spellUnlocked(AR.SPELLS.indexOf(sp));
    const w = 220, lineH = 15;
    const lines = this._wrap(ctx, sp.desc, w - 24, '12px "Segoe UI", sans-serif');
    const h = 58 + lines.length * lineH + (unlocked ? 16 : 0);
    let x = sx, y = sy - h - 10;
    if (x + w > AR.C.VIEW_W - 10) x = AR.C.VIEW_W - 10 - w;
    ctx.save();
    ctx.fillStyle = 'rgba(6,9,12,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.magic; ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'left';
    ctx.fillStyle = C.text;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillText('[' + sp.key + '] ' + sp.name, x + 12, y + 22);
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = C.textDim;
    let ty = y + 42;
    for (const l of lines) { ctx.fillText(l, x + 12, ty); ty += lineH; }
    if (unlocked) {
      ctx.fillStyle = C.spirit;
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillText('Coût : ' + Math.round(sp.cost * pl.stats.spellCostMult) + ' esprit' + (sp.dmg ? '   Dégâts : ' + sp.dmg : ''), x + 12, ty + 8);
    } else {
      ctx.fillStyle = C.textDim;
      ctx.font = 'italic 12px "Segoe UI", sans-serif';
      ctx.fillText('Verrouillé — arbre de compétences [T]', x + 12, ty + 8);
    }
    ctx.restore();
  },

  _wrap(ctx, text, maxW, font) {
    ctx.save(); ctx.font = font;
    const words = text.split(' ');
    const lines = []; let line = '';
    for (const w of words) {
      if (ctx.measureText(line + w).width > maxW && line) { lines.push(line.trim()); line = w + ' '; }
      else line += w + ' ';
    }
    if (line) lines.push(line.trim());
    ctx.restore();
    return lines;
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
