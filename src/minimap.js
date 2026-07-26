// Arcane Rift - minimap avec brouillard de guerre : vue d'ensemble de la carte explorée.
// Conception : le terrain est pré-rendu tuile par tuile dans un petit canvas hors-écran
// (une vraie miniature pixel-exacte de la grille de collision, pas une approximation par
// blocs grossiers), affiché à l'échelle d'un seul drawImage. Le brouillard de guerre est un
// masque appliqué par-dessus, à une résolution plus fine que le terrain lui-même. Purement
// additif : lit game.level/game.player, n'écrit que son propre état interne (indexé par
// instance de niveau, donc repart à zéro à chaque nouvelle ère/run).
window.AR = window.AR || {};

AR.Minimap = {
  collapsed: true,   // repliée par défaut (simple badge) — [N] au clavier ou bouton tactile pour l'ouvrir
  fogCellTiles: 2,     // résolution du brouillard de guerre, en tuiles (le terrain, lui, est au pixel/tuile près)
  revealRadiusTiles: 16, // rayon de révélation autour du héros, en tuiles

  _level: null, _cols: 0, _rows: 0, _visited: null, _terrainCanvas: null,

  _ensureLevel(lvl) {
    if (this._level === lvl) return;
    this._level = lvl;
    const cell = this.fogCellTiles;
    this._cols = Math.max(1, Math.ceil(lvl.tilesW / cell));
    this._rows = Math.max(1, Math.ceil(lvl.worldH / cell));
    this._visited = new Uint8Array(this._cols * this._rows);
    this._terrainCanvas = this._buildTerrainCanvas(lvl);
  },

  // Miniature pixel-exacte du terrain : 1 pixel par tuile, directement depuis la grille de
  // collision (murs, plateaux flottants, grottes multi-étage — tout y est, pas seulement le
  // sol vu d'en haut). Cartes procédurales (pas de grille) : repli sur la hauteur de colonne.
  _buildTerrainCanvas(lvl) {
    const w = Math.max(1, lvl.tilesW), h = Math.max(1, lvl.worldH);
    const cnv = document.createElement('canvas');
    cnv.width = w; cnv.height = h;
    const tctx = cnv.getContext('2d');
    const img = tctx.createImageData(w, h);
    const d = img.data;
    const ground = this._hex(lvl.era.mid || '#5d5638');
    const hazard = this._hex(AR.C.COLORS.danger);
    const F = AR.TILE_FLAGS;
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const idx = (ty * w + tx) * 4;
        let solid = false, isHazard = false;
        if (lvl.grid) {
          const flag = lvl.grid[ty * lvl.tilesW + tx];
          solid = !!(flag & F.SOLID);
          isHazard = !!(flag & F.HAZARD);
        } else {
          const hgt = lvl.heights[tx];
          solid = hgt !== lvl.PIT && ty >= hgt;
        }
        if (solid || isHazard) {
          const c = isHazard ? hazard : ground;
          d[idx] = c.r; d[idx + 1] = c.g; d[idx + 2] = c.b; d[idx + 3] = 255;
        } else {
          d[idx + 3] = 0; // air : transparent, laisse voir le fond du panneau
        }
      }
    }
    tctx.putImageData(img, 0, 0);
    return cnv;
  },

  _hex(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  },

  _reveal(cxCenter, cyCenter, radiusTiles) {
    const cell = this.fogCellTiles;
    const radius = Math.ceil(radiusTiles / cell);
    const r2 = radius * radius;
    const x0 = Math.max(0, cxCenter - radius), x1 = Math.min(this._cols - 1, cxCenter + radius);
    const y0 = Math.max(0, cyCenter - radius), y1 = Math.min(this._rows - 1, cyCenter + radius);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const dx = cx - cxCenter, dy = cy - cyCenter;
        if (dx * dx + dy * dy <= r2) this._visited[cy * this._cols + cx] = 1;
      }
    }
  },

  _revealRect(rect) {
    const cell = this.fogCellTiles;
    const x0 = Math.max(0, Math.floor(rect.x / cell)), x1 = Math.min(this._cols - 1, Math.ceil((rect.x + rect.w) / cell));
    const y0 = Math.max(0, Math.floor(rect.y / cell)), y1 = Math.min(this._rows - 1, Math.ceil((rect.y + rect.h) / cell));
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) this._visited[cy * this._cols + cx] = 1;
  },

  update(game) {
    const lvl = game.level, pl = game.player;
    if (!lvl || !pl) return;
    this._ensureLevel(lvl);
    const T = AR.C.TILE, cell = this.fogCellTiles;
    const cx = Math.floor((pl.x + pl.w / 2) / T / cell);
    const cy = Math.floor((pl.y + pl.h / 2) / T / cell);
    this._reveal(cx, cy, this.revealRadiusTiles);
    // cartes authored : révèle la salle entière d'un coup (lisibilité, cohérent avec le level design en salles)
    if (lvl.authored && game.currentRoom) this._revealRect(game.currentRoom.rect);
    // combat de boss : l'arène a sa propre emprise (plein écran), indépendante et parfois plus
    // large que la salle authored qui la contient — la révéler en entier dès le début du combat
    // évite une carte à moitié dans le brouillard pendant tout le combat.
    if (lvl.bossArena && lvl.bossArena.active) {
      const a = lvl.bossArena;
      this._revealRect({ x: a.x / T, y: a.y / T, w: a.width / T, h: a.height / T });
    }
  },

  _tagColor(tags, C) {
    if (tags.indexOf('boss') >= 0) return C.danger;
    if (tags.indexOf('merchant') >= 0) return C.gold;
    if (tags.indexOf('start') >= 0) return C.spirit;
    if (tags.indexOf('safe') >= 0 || tags.indexOf('hub') >= 0) return C.xp;
    return C.textDim;
  },

  draw(ctx, game) {
    const lvl = game.level, pl = game.player;
    if (!lvl || !pl) return;
    this._ensureLevel(lvl);
    const C = AR.C.COLORS;
    ctx.save();
    ctx.textBaseline = 'alphabetic';

    // ---- badge de bascule (toujours visible, coin bas-droit — jamais recouvert par le reste du HUD)
    const bw = 108, bh = 20, bx = AR.C.VIEW_W - 22 - bw, by = AR.C.VIEW_H - 22 - bh;
    ctx.fillStyle = C.uiBg;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = C.uiEdge; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = C.text; ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText((this.collapsed ? '🗺 Carte' : '🗺 Fermer') + '  [N]', bx + 8, by + 14);

    if (this.collapsed) { ctx.restore(); return; }

    // ---- panneau développé, centré
    const W = 900, H = 460, x = (AR.C.VIEW_W - W) / 2, y = (AR.C.VIEW_H - H) / 2;
    ctx.fillStyle = 'rgba(10,14,18,0.94)';
    ctx.fillRect(x, y, W, H);
    ctx.strokeStyle = C.uiEdge; ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, W, H);
    ctx.fillStyle = C.xp; ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText('CARTE — ' + lvl.era.name, x + 14, y + 22);
    ctx.textAlign = 'right'; ctx.fillStyle = C.textDim; ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillText('[N] fermer', x + W - 14, y + 22);
    ctx.textAlign = 'left';

    const T = AR.C.TILE;
    const padX = 16, padTop = 36, padBot = 16;
    const mapX = x + padX, mapY = y + padTop;
    const mapW = W - padX * 2, mapH = H - padTop - padBot;

    // Cadrage : toute la carte par défaut (vue d'ensemble), mais recentré/zoomé sur l'arène
    // pendant un combat de boss. L'arène est une enclave à part (plein écran, ~30 tuiles) noyée
    // dans un niveau qui en fait ~350 : l'afficher à l'échelle du niveau entier la réduisait à un
    // filet de quelques pixels, illisible et peu fidèle au sol/plateformes réels sous les pieds.
    const arena = lvl.bossArena && lvl.bossArena.active ? lvl.bossArena : null;
    const view = arena
      ? { x: arena.x / T, y: arena.y / T, w: arena.width / T, h: arena.height / T }
      : { x: 0, y: 0, w: lvl.tilesW, h: lvl.worldH };
    const scaleX = mapW / view.w, scaleY = mapH / view.h;
    const worldToX = (tx) => mapX + (tx - view.x) * scaleX;
    const worldToY = (ty) => mapY + (ty - view.y) * scaleY;

    ctx.save();
    ctx.beginPath(); ctx.rect(mapX, mapY, mapW, mapH); ctx.clip();

    // fond (zone hors-arène/hors-carte, comblé par défaut derrière le terrain transparent)
    ctx.fillStyle = 'rgba(4,6,8,0.9)';
    ctx.fillRect(mapX, mapY, mapW, mapH);

    if (arena) {
      // combat de boss : les plateformes réelles (src/arenas.js) remplacent le terrain
      // normal — sans ce cas particulier la carte affichait l'ancien terrain d'avant-arène,
      // sans rapport avec le sol/plateformes réellement sous les pieds pendant le combat.
      const groundColor = lvl.era.mid || '#5d5638';
      for (const p of arena.platforms) {
        ctx.fillStyle = p.ground ? groundColor : C.textDim;
        ctx.fillRect(worldToX(p.x / T), worldToY(p.y / T), (p.w / T) * scaleX, Math.max(2, (p.h / T) * scaleY));
      }
    } else {
      // vraie miniature du terrain (pré-rendue pixel par pixel), mise à l'échelle en un seul
      // drawImage : ce qu'on voit sur la carte est littéralement le plan de collision réel.
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this._terrainCanvas, view.x, view.y, view.w, view.h, mapX, mapY, mapW, mapH);
      ctx.imageSmoothingEnabled = true;

      // brouillard de guerre : masque opaque sur les cellules jamais visitées, par-dessus le terrain
      const cell = this.fogCellTiles;
      const cellW = cell * scaleX, cellH = cell * scaleY;
      const cx0 = Math.max(0, Math.floor(view.x / cell)), cx1 = Math.min(this._cols - 1, Math.ceil((view.x + view.w) / cell));
      const cy0 = Math.max(0, Math.floor(view.y / cell)), cy1 = Math.min(this._rows - 1, Math.ceil((view.y + view.h) / cell));
      ctx.fillStyle = 'rgba(4,6,8,0.94)';
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          if (this._visited[cy * this._cols + cx]) continue;
          ctx.fillRect(worldToX(cx * cell), worldToY(cy * cell), cellW + 0.5, cellH + 0.5);
        }
      }
    }

    // salles (cartes authored) : liseré coloré par tag, uniquement une fois explorée.
    // Non pertinent une fois zoomé sur l'arène (échelle/emprise différentes de la salle authored).
    if (lvl.authored && !arena) {
      const cell = this.fogCellTiles;
      for (const room of lvl.rooms) {
        const x0 = Math.max(0, Math.floor(room.rect.x / cell)), x1 = Math.min(this._cols - 1, Math.ceil((room.rect.x + room.rect.w) / cell));
        const y0 = Math.max(0, Math.floor(room.rect.y / cell)), y1 = Math.min(this._rows - 1, Math.ceil((room.rect.y + room.rect.h) / cell));
        let seen = false;
        for (let cy = y0; cy <= y1 && !seen; cy++) {
          for (let cx = x0; cx <= x1; cx++) { if (this._visited[cy * this._cols + cx]) { seen = true; break; } }
        }
        if (!seen) continue;
        const rx = worldToX(room.rect.x), ry = worldToY(room.rect.y);
        const rw = room.rect.w * scaleX, rh = room.rect.h * scaleY;
        ctx.strokeStyle = this._tagColor(room.tags, C);
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.globalAlpha = 1;
      }
    }

    // joueur
    const ptx = (pl.x + pl.w / 2) / T, pty = (pl.y + pl.h / 2) / T;
    const px = worldToX(ptx), py = worldToY(pty);
    ctx.globalAlpha = 0.75 + Math.sin(game.time * 6) * 0.25;
    ctx.fillStyle = C.spirit;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.stroke();

    // boss (si actif et déjà repéré)
    if (game.boss && !game.boss.dead) {
      const btx = game.boss.centerX() / T, bty = game.boss.centerY() / T;
      const cell = this.fogCellTiles;
      const bcx = Math.floor(btx / cell), bcy = Math.floor(bty / cell);
      const seen = !!arena || (bcx >= 0 && bcy >= 0 && bcx < this._cols && bcy < this._rows && this._visited[bcy * this._cols + bcx]);
      if (seen) {
        ctx.fillStyle = C.danger;
        ctx.beginPath(); ctx.arc(worldToX(btx), worldToY(bty), 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.restore(); // clip
    ctx.restore(); // save global
  },
};
