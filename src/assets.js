// Arcane Rift - chargement des images + rendu de sprites (trim précalculé)
//
// Chargement différé par ère (2026-07-29, cf. discussion perf) : charger les 93,7 Mo / 289
// fichiers du roster complet d'un bloc avant de pouvoir jouer était le principal goulot
// d'étranglement au démarrage. `load()` ne bloque plus que sur les sprites « communs »
// (héros, icônes de sorts, armes) + l'ère de départ choisie (16-45 Mo selon l'ère au lieu de
// 93,7 Mo systématiquement) ; les 5 autres ères se chargent ensuite en tâche de fond, dans
// l'ordre de progression naturelle. `ensureEra()` fait remonter une ère en priorité (choix
// au menu titre, transition de faille) sans attendre son tour dans la file de fond.
//
// Les sprites d'une ère non encore chargée ne provoquent aucune erreur : `draw()`/`drawIcon()`
// no-opent déjà silencieusement tant que `img.complete` est faux (comportement préexistant,
// pas une addition de cette passe) — au pire quelques images manquantes le temps qu'elles
// arrivent, jamais de crash.
//
// Format WebP sans perte (2026-07-29, cf. discussion perf) : ~54% plus léger que le PNG
// équivalent (mesuré sur les 289 sprites chargés en jeu), aucune différence de pixel visible
// (cf. tools/build_sprite_meta.py, qui produit désormais du .webp au lieu du .png).
window.AR = window.AR || {};

AR.Assets = {
  images: {},
  ready: false,       // true une fois le chargement bloquant (communs + ère de départ) terminé
  _loadedKeys: new Set(),
  _eraState: [],       // eraIdx -> 'pending' | 'loading' | 'done'

  // Sprites nécessaires quel que soit l'ère (héros, icônes de sorts dans la barre du bas,
  // vignettes d'arme de la fenêtre de révélation) : petit volume, toujours chargé en premier.
  _commonKeys() {
    return Object.keys(AR.SPRITE_META).filter((k) =>
      k.startsWith('hero/') || k.startsWith('spells/icons/') || k.startsWith('weapons/'));
  },

  // Reproduit la logique de secours du constructeur `Enemy` (`src/enemy.js`) : si un id n'a
  // pas d'art dédié, `AR.ENEMY_FALLBACK` redirige vers l'id d'un autre monstre (ex. tomb_scarabs
  // -> war_shaman, une ère différente) — sans cette résolution, le sprite réellement affiché à
  // l'écran ne serait jamais inclus dans le groupe de la bonne ère.
  _resolveArtId(id) {
    if (AR.SPRITE_META['enemies/states/' + id + '_neutral'] || AR.SPRITE_META['enemies/' + id]) return id;
    return (AR.ENEMY_FALLBACK && AR.ENEMY_FALLBACK[id]) || id;
  },

  // Quelques patterns de boss invoquent une formation composite plutôt qu'un id direct (ex.
  // 'summon:warband' du Chef Mammouth = 2 Porteurs de bouclier + 1 Joueur de tambour, cf.
  // `Enemy#_execPattern`) — androïde générique, pas de correspondance 1:1 avec un id
  // `AR.ENEMIES`, donc listé à la main ici. 'wisp3' n'y figure pas : il invoque des
  // projectiles, pas un `Enemy`, donc aucun sprite supplémentaire à prévoir.
  _SUMMON_COMPOSITES: { warband: ['bone_shield_bearer', 'war_drummer'] },

  // Construit la liste des clés `AR.SPRITE_META` (+ image de fond d'arène de boss) nécessaires
  // à une ère donnée : roster de base (`AR.ERAS[i]`) complété par un parcours récursif de la
  // carte authored de l'ère (`AR.LEVEL_SPECS`) et des patterns de son boss, pour capter aussi
  // les monstres/arènes de zones secrètes (mini-boss, salle des gladiateurs...) sans avoir à
  // les lister à la main — ce parcours reste donc correct même si la carte évolue.
  eraKeys(eraIdx) {
    const era = AR.ERAS[eraIdx];
    if (!era) return [];
    const known = new Set([...Object.keys(AR.ENEMIES || {}), ...Object.keys(AR.BOSSES || {})]);
    const arenaKeys = new Set(Object.keys(AR.BOSS_ARENAS || {}));
    const ids = new Set([...(era.enemies || []), era.elite, era.boss].filter(Boolean));
    const arenaIds = new Set(era.boss ? [era.boss] : []);
    const seenObj = new Set();
    const walk = (v) => {
      if (v == null) return;
      if (typeof v === 'string') {
        if (v.startsWith('summon:')) {
          const what = v.slice(7);
          if (known.has(what)) ids.add(what);
          else if (this._SUMMON_COMPOSITES[what]) for (const x of this._SUMMON_COMPOSITES[what]) ids.add(x);
          return;
        }
        if (known.has(v)) ids.add(v);
        if (arenaKeys.has(v)) arenaIds.add(v);
        return;
      }
      if (typeof v !== 'object' || seenObj.has(v)) return;
      seenObj.add(v);
      if (Array.isArray(v)) { for (const x of v) walk(x); return; }
      for (const k in v) walk(v[k]);
    };
    walk(AR.LEVEL_SPECS && AR.LEVEL_SPECS[era.id]);
    walk(AR.BOSSES && AR.BOSSES[era.boss]); // patterns/p2patterns (summon:...) du boss

    const keys = [];
    for (const rawId of ids) {
      const id = this._resolveArtId(rawId);
      if (AR.SPRITE_META['enemies/' + id]) keys.push('enemies/' + id);
      for (const k of Object.keys(AR.SPRITE_META)) {
        if (k.startsWith('enemies/states/' + id + '_')) keys.push(k);
      }
    }
    for (const ak of arenaIds) {
      const arena = AR.BOSS_ARENAS && AR.BOSS_ARENAS[ak];
      if (arena) keys.push(arena.image);
    }
    return keys;
  },

  // Charge une liste de clés (chacune -> assets/<clé>.png), en sautant celles déjà chargées
  // par un groupe précédent (héros/armes partagés entre toutes les ères, monstre partagé via
  // AR.ENEMY_FALLBACK...). `onProgress`/`onDone` optionnels (chargement de fond silencieux).
  _loadKeys(keys, onProgress, onDone) {
    const todo = keys.filter((k) => !this._loadedKeys.has(k));
    if (!todo.length) { if (onDone) onDone(); return; }
    let loaded = 0;
    const total = todo.length;
    const finishOne = () => {
      loaded++;
      if (onProgress) onProgress(loaded / total);
      if (loaded === total && onDone) onDone();
    };
    for (const key of todo) {
      const img = new Image();
      img.onload = () => { this._loadedKeys.add(key); finishOne(); };
      img.onerror = () => {
        console.error('Image introuvable :', key);
        this._loadedKeys.add(key); finishOne();
      };
      img.src = 'assets/' + key + '.webp';
      this.images[key] = img;
    }
  },

  // Point d'entrée appelé une fois au démarrage (`main.js`) : bloque sur les sprites communs
  // + ceux de `startEraIdx` (ère mémorisée du menu titre), puis lance le reste en fond.
  load(startEraIdx, onDone, onProgress) {
    for (let i = 0; i < AR.ERAS.length; i++) this._eraState[i] = 'pending';
    this._eraState[startEraIdx] = 'loading';
    const bootKeys = [...new Set([...this._commonKeys(), ...this.eraKeys(startEraIdx)])];
    this._loadKeys(bootKeys, onProgress, () => {
      this._eraState[startEraIdx] = 'done';
      this.ready = true;
      onDone();
      this._loadRemainingEras(startEraIdx);
    });
  },

  // Chargement de fond des 5 autres ères, dans l'ordre de progression naturelle depuis l'ère
  // de départ (la plus probable à venir en premier) — une à la fois pour ne pas saturer la
  // bande passante pendant que l'ère en cours de jeu télécharge encore. `ensureEra` peut
  // faire démarrer une ère plus tôt, en parallèle, si le joueur y saute directement.
  _loadRemainingEras(startEraIdx) {
    const order = [];
    for (let d = 1; d < AR.ERAS.length; d++) order.push((startEraIdx + d) % AR.ERAS.length);
    const next = () => {
      const i = order.shift();
      if (i === undefined) return;
      if (this._eraState[i] !== 'pending') { next(); return; }
      this._eraState[i] = 'loading';
      this._loadKeys(this.eraKeys(i), null, () => { this._eraState[i] = 'done'; next(); });
    };
    next();
  },

  // Priorise une ère précise (choix au menu titre `Game#setEraStart`, transition de faille
  // `Game#loadLevel`) : si elle n'a pas encore commencé, la lance immédiatement EN PARALLÈLE
  // du chargement de fond en cours plutôt que d'attendre son tour dans la file — lui laisse un
  // maximum d'avance avant que le joueur n'atteigne réellement ses premiers ennemis.
  ensureEra(eraIdx) {
    if (!AR.ERAS[eraIdx] || this._eraState[eraIdx] !== 'pending') return;
    this._eraState[eraIdx] = 'loading';
    this._loadKeys(this.eraKeys(eraIdx), null, () => { this._eraState[eraIdx] = 'done'; });
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
