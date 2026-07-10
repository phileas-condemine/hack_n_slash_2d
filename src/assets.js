// Arcane Rift - chargement des images + rendu de sprites (trim précalculé)
window.AR = window.AR || {};

AR.Assets = {
  images: {},
  ready: false,

  load(onDone, onProgress) {
    const entries = Object.keys(AR.SPRITE_META).map((key) => ({
      key, src: 'assets/' + key + '.png',
    }));
    for (const arena of Object.values(AR.BOSS_ARENAS || {})) {
      entries.push({ key: arena.image, src: 'assets/' + arena.image + '.png' });
    }
    let loaded = 0;
    const total = entries.length;
    const finishOne = () => {
      loaded++;
      if (onProgress) onProgress(loaded / total);
      if (loaded === total) { this.ready = true; onDone(); }
    };
    entries.forEach((entry) => {
      const img = new Image();
      img.onload = finishOne;
      img.onerror = () => {
        console.error('Image introuvable :', entry.key);
        finishOne();
      };
      img.src = entry.src;
      this.images[entry.key] = img;
    });
  },

  // Dessine un sprite ancré bas-centre (aux pieds), hauteur cible en px monde.
  // flip=true => miroir horizontal. Utilise la boîte de découpe précalculée.
  draw(ctx, key, footX, footY, targetH, flip, alpha, tint) {
    const img = this.images[key];
    const meta = AR.SPRITE_META[key];
    if (!img || !img.complete || !meta) return;
    const [tx, ty, tw, th] = meta.t;
    const scale = targetH / th;
    const dw = tw * scale, dh = th * scale;
    ctx.save();
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
    ctx.translate(footX, footY);
    if (flip) ctx.scale(-1, 1);
    if (tint) ctx.filter = tint; // ex: 'brightness(2.4)' pour le flash de dégâts
    ctx.drawImage(img, tx, ty, tw, th, -dw / 2, -dh, dw, dh);
    ctx.restore();
  },

  // Largeur affichée pour une hauteur cible (utile pour les hitbox visuelles)
  drawnW(key, targetH) {
    const meta = AR.SPRITE_META[key];
    if (!meta) return targetH;
    return meta.t[2] * (targetH / meta.t[3]);
  },

  // Icône carrée ajustée dans une boîte (HUD : sorts, boutique...)
  drawIcon(ctx, key, x, y, size, alpha) {
    const img = this.images[key];
    const meta = AR.SPRITE_META[key];
    if (!img || !img.complete || !meta) return;
    const [tx, ty, tw, th] = meta.t;
    const scale = size / Math.max(tw, th);
    const dw = tw * scale, dh = th * scale;
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.drawImage(img, tx, ty, tw, th, x + (size - dw) / 2, y + (size - dh) / 2, dw, dh);
    ctx.restore();
  },
};
