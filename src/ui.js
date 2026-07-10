// Arcane Rift - menus & overlays canvas : titre, aide, pause, compétences, boutique, faille, fin
window.AR = window.AR || {};

AR.UI = {
  _clicked: null,

  beginFrame() {
    this._clicked = AR.Input.consumeClick();
  },

  _hover(r) {
    const m = AR.Input.mouse;
    return AR.U.pointInRect(m.x, m.y, r);
  },
  _click(r) {
    return this._clicked && AR.U.pointInRect(this._clicked.x, this._clicked.y, r);
  },

  button(ctx, x, y, w, h, label, opts) {
    opts = opts || {};
    const r = { x, y, w, h };
    const hov = this._hover(r) && !opts.disabled;
    ctx.save();
    ctx.fillStyle = opts.disabled ? 'rgba(40,45,50,0.8)' : hov ? 'rgba(53,224,192,0.18)' : 'rgba(10,14,18,0.85)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = opts.disabled ? '#333' : hov ? AR.C.COLORS.spirit : AR.C.COLORS.uiEdge;
    ctx.lineWidth = hov ? 2 : 1;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = opts.disabled ? AR.C.COLORS.textDim : hov ? AR.C.COLORS.spirit : AR.C.COLORS.text;
    ctx.font = (opts.font || 'bold 17px') + ' "Segoe UI", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.restore();
    if (hov && this._clicked) AR.Audio.sfx('ui');
    return !opts.disabled && this._click(r);
  },

  panel(ctx, x, y, w, h, title) {
    ctx.save();
    ctx.fillStyle = 'rgba(6,9,12,0.62)';
    ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
    ctx.fillStyle = AR.C.COLORS.uiBg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = AR.C.COLORS.uiEdge; ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.strokeStyle = AR.C.COLORS.spirit; ctx.lineWidth = 1;
    ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    if (title) {
      ctx.fillStyle = AR.C.COLORS.text;
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(title, x + w / 2, y + 42);
    }
    ctx.restore();
  },

  // ============================================================= TITRE
  drawTitle(ctx, game) {
    const W = AR.C.VIEW_W, H = AR.C.VIEW_H;
    // fond animé : dégradé + héros
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1420'); g.addColorStop(0.6, '#1a2a35'); g.addColorStop(1, '#0d1a18');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // lueur spirituelle
    ctx.save();
    const t = game.time;
    const gl = ctx.createRadialGradient(W / 2, H * 0.55, 30, W / 2, H * 0.55, 380);
    gl.addColorStop(0, 'rgba(53,224,192,0.16)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
    ctx.restore();
    AR.Assets.draw(ctx, 'hero/idle', W / 2, H * 0.86 + Math.sin(t * 1.4) * 4, 300, false, 1);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = AR.C.COLORS.spirit;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('⛩  ROGUELITE HACK-AND-SLASH  ⛩', W / 2, 96);
    ctx.fillStyle = '#e8e2d4';
    ctx.font = 'bold 84px Georgia, serif';
    ctx.shadowColor = AR.C.COLORS.spirit; ctx.shadowBlur = 24;
    ctx.fillText('ARCANE RIFT', W / 2, 180);
    ctx.shadowBlur = 0;
    ctx.font = 'italic 17px Georgia, serif';
    ctx.fillStyle = AR.C.COLORS.textDim;
    ctx.fillText('Un guerrier entre les mondes. Six ères à traverser, de la pierre au néon.', W / 2, 214);
    ctx.restore();

    const bw = 300, bx = W / 2 - bw / 2;
    if (this.button(ctx, bx, 268, bw, 52, '⚔  JOUER  [Entrée]') || AR.Input.pressed('confirm')) {
      game.newRun(false);
    }
    if (this.button(ctx, bx, 332, bw, 46, '🤖  MODE DÉMO (IA)  [G]') || AR.Input.pressed('demo')) {
      game.newRun(true);
    }
    if (this.button(ctx, bx, 390, bw, 46, '❓  AIDE & CONTRÔLES  [H]') || AR.Input.keys['KeyH']) {
      game.state = 'help';
    }

    // ---- sélecteur de difficulté
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = AR.C.COLORS.textDim;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillText('— DIFFICULTÉ —', W / 2, 466);
    ctx.restore();
    const dbw = 150, dgap = 14;
    const dtotal = AR.DIFFICULTIES.length * dbw + (AR.DIFFICULTIES.length - 1) * dgap;
    AR.DIFFICULTIES.forEach((d, i) => {
      const dx = W / 2 - dtotal / 2 + i * (dbw + dgap);
      const selected = game.diffIdx === i;
      const r = { x: dx, y: 478, w: dbw, h: 38 };
      ctx.save();
      ctx.fillStyle = selected ? 'rgba(53,224,192,0.14)' : 'rgba(10,14,18,0.85)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = selected ? d.color : (this._hover(r) ? '#fff' : AR.C.COLORS.uiEdge);
      ctx.lineWidth = selected ? 2.5 : 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = selected ? d.color : AR.C.COLORS.textDim;
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((selected ? '● ' : '') + d.name, r.x + r.w / 2, r.y + r.h / 2 + 1);
      ctx.restore();
      if (this._click(r)) { game.setDifficulty(i); AR.Audio.sfx('ui'); }
    });
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = AR.DIFFICULTIES[game.diffIdx].color;
    ctx.font = 'italic 13px "Segoe UI", sans-serif';
    ctx.fillText(AR.DIFFICULTIES[game.diffIdx].desc, W / 2, 536);
    ctx.restore();

    // records
    const rec = AR.Save.data.records;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = AR.C.COLORS.textDim;
    ctx.font = '13px "Segoe UI", sans-serif';
    if (rec.runs > 0) {
      ctx.fillText('Meilleure ère : ' + (rec.bestEra + 1) + '/6' +
        (rec.wins > 0 ? '  •  Victoires : ' + rec.wins : '') +
        '  •  Ennemis vaincus : ' + rec.totalKills + '  •  Runs : ' + rec.runs, W / 2, 566);
    }
    ctx.fillText('Sabre : clic gauche (maintenir = frappe traversante) • Arc : clic droit (maintenir = tir perçant)', W / 2, H - 46);
    ctx.fillText('ZQSD/WASD + Espace • Maj : dash / sprint • v' + AR.VERSION, W / 2, H - 26);
    ctx.restore();
  },

  // ============================================================= AIDE
  drawHelp(ctx, game) {
    this.panel(ctx, 160, 50, AR.C.VIEW_W - 320, AR.C.VIEW_H - 100, '— AIDE —');
    const lines = [
      ['Déplacements', 'ZQSD / WASD / Flèches — Espace : saut, ressauter en l\'air : double saut'],
      ['Dash / Sprint', 'Maj (appui bref) : dash avec invulnérabilité — Maj (maintenu) : sprint'],
      ['Sabre', 'Clic gauche : coup rapide (3 coups = combo). MAINTENIR puis relâcher : frappe chargée'],
      ['', 'qui traverse les ennemis alignés. La barre au-dessus du héros montre la charge.'],
      ['Arc', 'Clic droit : tir rapide. MAINTENIR : bander l\'arc — relâcher une fois chargé'],
      ['', 'pour une flèche perçante qui transperce tout sur sa trajectoire.'],
      ['Sorts', 'Touches 1-4 (à débloquer dans l\'arbre de compétences, coûtent de l\'esprit)'],
      ['Interactions', 'E : coffres, marchand, portail — F : boire une potion — S+Espace : descendre'],
      ['Progression', 'T : arbre de compétences. L\'XP donne des niveaux, chaque niveau donne 1 point.'],
      ['', 'À la fin de chaque ère : un boss, puis un choix de faille qui modifie la suite.'],
      ['Mode démo', 'G : l\'IA joue toute seule — +/- : vitesse ×1 ×2 ×4 ×8'],
      ['Capture', 'R : enregistrer une vidéo WebM — C : capture d\'écran PNG — M : muet'],
    ];
    ctx.save();
    ctx.font = '15px "Segoe UI", sans-serif';
    let y = 128;
    for (const [k, v] of lines) {
      ctx.textAlign = 'right';
      ctx.fillStyle = AR.C.COLORS.spirit;
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.fillText(k, 370, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = AR.C.COLORS.text;
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.fillText(v, 388, y);
      y += 34;
    }
    ctx.restore();
    if (this.button(ctx, AR.C.VIEW_W / 2 - 110, AR.C.VIEW_H - 96, 220, 42, 'Retour  [Échap]') ||
        AR.Input.pressed('pause')) {
      game.state = game.stateBefore || 'title';
    }
  },

  // ============================================================= PAUSE
  drawPause(ctx, game) {
    this.panel(ctx, AR.C.VIEW_W / 2 - 190, 180, 380, 330, '— PAUSE —');
    const bx = AR.C.VIEW_W / 2 - 140;
    if (this.button(ctx, bx, 260, 280, 46, 'Reprendre  [Échap]')) game.paused = false;
    if (this.button(ctx, bx, 318, 280, 46, 'Aide & contrôles')) { game.stateBefore = 'play'; game.state = 'help'; game.paused = false; }
    if (this.button(ctx, bx, 376, 280, 46, (AR.Audio.muted ? 'Réactiver' : 'Couper') + ' le son  [M]')) {
      AR.Audio.setMuted(!AR.Audio.muted);
      AR.Save.data.settings.muted = AR.Audio.muted; AR.Save.save();
    }
    if (this.button(ctx, bx, 434, 280, 46, 'Abandonner la run')) { game.endRun(false); game.state = 'title'; game.paused = false; }
  },

  // ==================================================== ARBRE DE COMPÉTENCES
  drawSkills(ctx, game) {
    const pl = game.player;
    const W = AR.C.VIEW_W;
    this.panel(ctx, 90, 40, W - 180, AR.C.VIEW_H - 80, '— ARBRE DE COMPÉTENCES —');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = AR.C.COLORS.xp;
    ctx.font = 'bold 17px "Segoe UI", sans-serif';
    ctx.fillText('★ Points disponibles : ' + pl.skillPoints, W / 2, 78);
    ctx.restore();

    const colW = (W - 260) / 4;
    for (let b = 0; b < 4; b++) {
      const branch = AR.SKILLS[b];
      const x = 130 + b * colW;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = branch.color;
      ctx.font = 'bold 17px Georgia, serif';
      ctx.fillText(branch.name, x + colW / 2 - 10, 118);
      ctx.restore();
      for (let n = 0; n < 4; n++) {
        const node = branch.nodes[n];
        const owned = pl.skills.has(node.id);
        const prerequisiteMet = n === 0 || pl.skills.has(branch.nodes[n - 1].id);
        const canBuy = !owned && prerequisiteMet && pl.skillPoints >= node.cost;
        const y = 140 + n * 116;
        const r = { x: x + 6, y, w: colW - 32, h: 100 };
        const hov = this._hover(r);
        ctx.save();
        ctx.fillStyle = owned ? 'rgba(53,224,192,0.13)' : canBuy && hov ? 'rgba(255,255,255,0.08)' : 'rgba(10,14,18,0.7)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = owned ? branch.color : canBuy ? (hov ? '#fff' : AR.C.COLORS.uiEdge) : '#2a2f33';
        ctx.lineWidth = owned ? 2.5 : 1.5;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.fillStyle = owned ? branch.color : canBuy ? AR.C.COLORS.text : AR.C.COLORS.textDim;
        ctx.font = 'bold 14px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((owned ? '✔ ' : canBuy ? '○ ' : '🔒 ') + node.name, r.x + 10, y + 24);
        ctx.textAlign = 'right';
        ctx.fillStyle = owned ? branch.color : canBuy ? AR.C.COLORS.xp : AR.C.COLORS.textDim;
        ctx.fillText(node.cost + ' pt' + (node.cost > 1 ? 's' : ''), r.x + r.w - 10, y + 24);
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = AR.C.COLORS.textDim;
        this._wrapText(ctx, node.desc, r.x + 10, y + 46, r.w - 20, 16);
        ctx.restore();
        if (canBuy && this._click(r)) game.buySkill(node.id);
      }
    }
    if (this.button(ctx, W / 2 - 110, AR.C.VIEW_H - 74, 220, 40, 'Fermer  [T / Échap]')) game.skillOpen = false;
  },

  // ============================================================ BOUTIQUE
  drawShop(ctx, game) {
    const W = AR.C.VIEW_W;
    this.panel(ctx, W / 2 - 320, 70, 640, 520, '— LE MARCHAND ERRANT —');
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = AR.C.COLORS.textDim;
    ctx.font = 'italic 14px Georgia, serif';
    ctx.fillText('« Des reliques de toutes les époques, voyageur... »', W / 2, 130);
    ctx.fillStyle = AR.C.COLORS.gold;
    ctx.font = 'bold 17px "Segoe UI", sans-serif';
    ctx.fillText('Votre or : ' + game.coins, W / 2, 158);
    ctx.restore();

    let y = 180;
    game.shopStock.forEach((item, i) => {
      if (item.sold) {
        ctx.save();
        ctx.fillStyle = 'rgba(10,14,18,0.5)';
        ctx.fillRect(W / 2 - 290, y, 580, 56);
        ctx.fillStyle = AR.C.COLORS.textDim;
        ctx.font = 'italic 14px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('— vendu —', W / 2, y + 33);
        ctx.restore();
      } else {
        const afford = game.coins >= item.price;
        ctx.save();
        ctx.fillStyle = 'rgba(10,14,18,0.75)';
        ctx.fillRect(W / 2 - 290, y, 580, 56);
        ctx.strokeStyle = AR.C.COLORS.uiEdge;
        ctx.strokeRect(W / 2 - 290, y, 580, 56);
        ctx.fillStyle = afford ? AR.C.COLORS.text : AR.C.COLORS.textDim;
        ctx.font = 'bold 15px "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(item.name, W / 2 - 272, y + 24);
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.fillStyle = AR.C.COLORS.textDim;
        ctx.fillText(item.desc, W / 2 - 272, y + 43);
        ctx.restore();
        if (this.button(ctx, W / 2 + 158, y + 8, 120, 40, item.price + ' or', { disabled: !afford, font: 'bold 14px' })) {
          game.buyShopItem(i);
        }
      }
      y += 66;
    });
    if (this.button(ctx, W / 2 - 110, y + 8, 220, 40, 'Partir  [Échap / E]')) game.shopOpen = false;
  },

  // ====================================================== CHOIX DE FAILLE
  drawRift(ctx, game) {
    const W = AR.C.VIEW_W, H = AR.C.VIEW_H;
    // fond onirique
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0d1a'); g.addColorStop(1, '#10241f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const t = game.time * 0.4 + i * 17.3;
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(t) * 0.15;
      ctx.fillStyle = AR.C.COLORS.spirit;
      ctx.beginPath();
      ctx.arc((i * 173 + Math.sin(t) * 60) % W, (i * 97 + t * 20) % H, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = AR.C.COLORS.text;
    ctx.font = 'bold 38px Georgia, serif';
    ctx.fillText('LA FAILLE S\'OUVRE', W / 2, 110);
    ctx.fillStyle = AR.C.COLORS.textDim;
    ctx.font = 'italic 16px Georgia, serif';
    const nextEra = AR.ERAS[Math.min(game.eraIdx + 1, 5)];
    ctx.fillText('Prochaine destination : ' + nextEra.name + ' — ' + nextEra.sub, W / 2, 142);
    ctx.fillText('Choisissez une bénédiction pour la suite du voyage  [1-3]', W / 2, 168);
    ctx.restore();

    const cw = 300, gap = 40;
    const total = game.riftChoices.length * cw + (game.riftChoices.length - 1) * gap;
    game.riftChoices.forEach((rift, i) => {
      const x = W / 2 - total / 2 + i * (cw + gap);
      const y = 210, h = 330;
      const r = { x, y, w: cw, h };
      const hov = this._hover(r);
      ctx.save();
      if (hov) { ctx.shadowColor = AR.C.COLORS.spirit; ctx.shadowBlur = 26; }
      ctx.fillStyle = hov ? 'rgba(22,40,38,0.96)' : 'rgba(12,18,22,0.94)';
      ctx.fillRect(x, y, cw, h);
      ctx.strokeStyle = hov ? AR.C.COLORS.spirit : AR.C.COLORS.uiEdge;
      ctx.lineWidth = hov ? 3 : 1.5;
      ctx.strokeRect(x, y, cw, h);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.font = '54px serif';
      const icons = { sword: '⚔️', heart: '❤️', blood: '🩸', coin: '🪙', scroll: '📜', clock: '⏳', skull: '💀', gem: '🔮' };
      ctx.fillText(icons[rift.icon] || '✨', x + cw / 2, y + 96);
      ctx.fillStyle = AR.C.COLORS.text;
      ctx.font = 'bold 21px Georgia, serif';
      ctx.fillText(rift.name, x + cw / 2, y + 150);
      ctx.fillStyle = AR.C.COLORS.textDim;
      ctx.font = '14px "Segoe UI", sans-serif';
      this._wrapTextCentered(ctx, rift.desc, x + cw / 2, y + 190, cw - 40, 20);
      ctx.fillStyle = AR.C.COLORS.spirit;
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.fillText('[' + (i + 1) + ']', x + cw / 2, y + h - 24);
      ctx.restore();
      if (this._click(r) || AR.Input.pressed('spell' + (i + 1))) game.riftPick(i);
    });
  },

  // ========================================================== FIN DE RUN
  drawEnd(ctx, game, victory) {
    const W = AR.C.VIEW_W, H = AR.C.VIEW_H;
    ctx.fillStyle = victory ? 'rgba(8,18,14,0.94)' : 'rgba(16,6,10,0.94)';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = victory ? AR.C.COLORS.spirit : AR.C.COLORS.danger;
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText(victory ? 'LES SIX MONDES SONT LIBRES' : 'VOUS ÊTES TOMBÉ', W / 2, 170);
    ctx.fillStyle = AR.C.COLORS.textDim;
    ctx.font = 'italic 18px Georgia, serif';
    ctx.fillText(victory
      ? 'Le shinobi a traversé les âges, de la pierre jusqu\'au néon.'
      : 'La faille se referme sur ' + game.level.era.name + '...', W / 2, 208);

    const s = game.stats;
    ctx.fillStyle = AR.C.COLORS.text;
    ctx.font = '17px "Segoe UI", sans-serif';
    const lines = [
      'Ère atteinte : ' + (game.eraIdx + 1) + '/6 — ' + game.level.era.name + (game.ngPlus > 0 ? '  (NG+' + game.ngPlus + ')' : ''),
      'Difficulté : ' + game.diff.name + '    Temps : ' + AR.U.fmtTime(s.time) + '    Ennemis vaincus : ' + s.kills + '    Boss : ' + s.bosses,
      'Niveau ' + game.player.level + '    Or amassé : ' + s.coinsEarned,
    ];
    lines.forEach((l, i) => ctx.fillText(l, W / 2, 268 + i * 32));
    ctx.restore();

    const bw = 300, bx = W / 2 - bw / 2;
    if (victory) {
      if (this.button(ctx, bx, 400, bw, 50, '🌗  NOUVELLE PARTIE + [Entrée]') || AR.Input.pressed('confirm')) {
        game.startNGPlus();
      }
      if (this.button(ctx, bx, 462, bw, 46, 'Menu principal')) game.state = 'title';
    } else {
      if (this.button(ctx, bx, 400, bw, 50, '⚔  REJOUER  [Entrée]') || AR.Input.pressed('confirm')) {
        game.newRun(game.demo);
      }
      if (this.button(ctx, bx, 462, bw, 46, 'Menu principal')) game.state = 'title';
    }
    if (game.demo) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = AR.C.COLORS.textDim; ctx.font = '13px "Segoe UI", sans-serif';
      ctx.fillText('Mode démo : relance automatique...', W / 2, 540);
      ctx.restore();
    }
  },

  _wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      if (ctx.measureText(line + w).width > maxW && line) {
        ctx.fillText(line, x, y); line = w + ' '; y += lineH;
      } else line += w + ' ';
    }
    ctx.fillText(line.trim(), x, y);
  },

  _wrapTextCentered(ctx, text, cx, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      if (ctx.measureText(line + w).width > maxW && line) {
        ctx.fillText(line.trim(), cx, y); line = w + ' '; y += lineH;
      } else line += w + ' ';
    }
    ctx.fillText(line.trim(), cx, y);
  },
};
