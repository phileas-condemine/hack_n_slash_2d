// Arcane Rift - spécifications authored des cartes (interprétées par level.js).
// Chargé après data.js, avant level.js. Cf. 00_pre_requis_systeme_niveaux.md.
//
// Toutes les coordonnées sont en TUILES (TILE = 48 px, monde = 32 tuiles de haut).
// Le terrain est construit en additif (solids) puis soustractif (empties = grottes/tunnels).
// Une carte à null retombe sur le générateur procédural historique.
window.AR = window.AR || {};

// ============================================================ NIVEAU 1 : PIERRE
// « Le Canyon des Premiers Feux » — cf. 01_niveau_age_de_pierre.md
// Structure : S01 plateau -> S02 hub (puits + route haute) -> {S03 haute | S04/S05 basse}
//   -> S06 convergence (levier/boucle) -> S07 camp (safe) -> S08 passe -> S09 arène.
const STONE = {
  id: 'stone',
  tilesW: 354,
  worldH: 32,
  spawnX: 3,
  startRoom: 'S01_PLATEAU',
  bossArenaRoom: 'S09_MAMMOTH_ARENA',
  arenaStartTx: 320,
  gateTx: 321,
  arenaGy: 23,
  fallDamageRatio: 0.10,

  // ---- terrain solide (rectangles {x,y,w,h}) ----
  solids: [
    // S01 plateau d'arrivée + deux marches
    { x: 0, y: 22, w: 14, h: 10 },
    { x: 14, y: 21, w: 2, h: 11 },
    { x: 16, y: 20, w: 8, h: 12 },
    // S02 hub : cuvette qui descend puis remonte
    { x: 24, y: 21, w: 8, h: 11 },
    { x: 32, y: 22, w: 10, h: 10 },
    { x: 42, y: 23, w: 10, h: 9 },
    { x: 52, y: 24, w: 6, h: 8 },
    { x: 58, y: 22, w: 3, h: 10 },       // rebord avant le puits (tx61-66 ouvert)
    // S03 route haute : rebord + plateau (le dessus est marchable, le dessous = plafond de grotte)
    { x: 66, y: 16, w: 30, h: 3 },        // rebord haut au-dessus de la descente
    { x: 96, y: 16, w: 36, h: 9 },        // plateau gauche (grotte S05 en dessous)
    { x: 138, y: 16, w: 12, h: 9 },       // plateau droit (gap 132-138 = pont d'os ; finit avant l'escalier)
    // SEC_STONE_05 : plancher de la grotte secrète sous le pont d'os (tx132-138, retour joueur
    // 2026-07-27 : "au lieu de nous faire tomber dans la zone par défaut en dessous [la route
    // basse], celà doit nous faire atterrir dans une grotte secrète entre les 2 niveaux"). Le
    // puits vertical est déjà naturellement muré des deux côtés par les plateaux voisins
    // (x96-132 et x138-150, tous deux solides jusqu'à y25) ; ce plancher ferme la chute à
    // mi-hauteur (y23) au lieu de laisser tomber jusqu'à la route basse (y29) plus bas.
    { x: 132, y: 23, w: 6, h: 2 },
    // route basse : sol de grotte continu (rattrape toutes les chutes du canyon)
    { x: 61, y: 29, w: 89, h: 3 },
    // S06 convergence : escalier solide qui remonte de la grotte (ty29) au camp (ty22)
    { x: 150, y: 28, w: 3, h: 4 },
    { x: 153, y: 27, w: 3, h: 5 },
    { x: 156, y: 26, w: 3, h: 6 },
    { x: 159, y: 25, w: 3, h: 7 },
    { x: 162, y: 24, w: 3, h: 8 },
    { x: 165, y: 23, w: 3, h: 9 },
    { x: 168, y: 22, w: 16, h: 10 },
    // S07 camp des premiers feux (safe)
    { x: 184, y: 22, w: 28, h: 10 },
    // S08 passe des totems : chasse / enclos élite / antichambre
    // Bloc plein 212-248 (crypte de la grotte secrète SEC_STONE_04 creusée dedans via `empties`,
    // ci-dessous : puits vertical tx227-233 + réseau souterrain horizontal tx225-318, plancher
    // conservé aux 2 dernières tuiles y30-32).
    { x: 212, y: 22, w: 36, h: 10 },       // 212-248
    { x: 248, y: 22, w: 38, h: 10 },      // enclos (38 tuiles : charge du mammouth OK)
    { x: 286, y: 22, w: 10, h: 10 },
    { x: 296, y: 21, w: 10, h: 11 },
    { x: 306, y: 20, w: 14, h: 12 },      // montée vers l'antichambre
    // S09 approche + sol d'arène (l'image d'arène prend le relais à l'activation)
    { x: 320, y: 23, w: 34, h: 9 },
  ],

  // ---- creusements (grottes/pochettes) ----
  empties: [
    { x: 54, y: 27, w: 6, h: 2 },         // pochette du secret SEC_STONE_01 (sous le hub)
    { x: 176, y: 19, w: 6, h: 4 },        // alcôve SEC_STONE_03 (levier S06) — plain-pied, visible depuis le sol
    // SEC_STONE_04 : puits vertical (tx227-233, y22-30 — profond, invisible depuis le haut grâce
    // à darkZones) débouchant sur un réseau souterrain horizontal (tx225-318, y25-30) creusé sous
    // le chemin de surface de S08 ; la croûte de surface (y22) et le plancher (y30-32) restent solides.
    // Plafond du réseau à y25 (et non y23) pour rester sous le déclencheur/barrières de E_STONE_ELITE
    // (y14-24) qui partagent la même bande x248-285 sur le chemin de surface juste au-dessus.
    { x: 227, y: 22, w: 6, h: 8 },
    { x: 225, y: 25, w: 93, h: 5 },
  ],

  // ---- plateformes traversables (one-way) ----
  oneWay: [
    { x: 61, y: 16, w: 5, id: 'VINE_TOP' },    // réception au sommet de la liane -> rebord haut
    // rebords de descente du puits S04 — décalés hors des colonnes de la liane
    // (tx61-63) pour ne jamais interférer avec la collision d'escalade.
    { x: 56, y: 25, w: 3, id: 'REBORD_1' },
    { x: 64, y: 27, w: 3, id: 'REBORD_2' },
    { x: 109, y: 12, w: 4, id: 'S03_LEDGE_HIGH' }, // corniche du coffre haut (double saut)
    { x: 150, y: 21, w: 8, id: 'S06_LANDING' },    // réception de la route haute vers S06
    // décalé de tx230 (juste au-dessus du puits SEC_STONE_04, tx227-233) à tx218 : engager ce
    // frondeur ramenait l'IA piloter tout contre le bord du puits, contribuant à la boucle de
    // rechute décrite pour le spawn `beast_hunter` plus bas — la position couvre toujours l'accès
    // au puits, juste depuis le côté, sans surplomber l'ouverture elle-même.
    { x: 218, y: 17, w: 4, id: 'S08_PERCH' },      // poste de frondeur
  ],

  // ---- lianes grimpables ----
  climbables: [
    { id: 'CLIMB_STONE_01', x: 61, y: 14, w: 3, h: 15, exitY: 16 }, // puits -> route haute (dépasse le rebord)
  ],

  // ---- destructibles ----
  breakables: [
    { id: 'SEC_STONE_01', type: 'wall', rect: { x: 60, y: 27, w: 1, h: 2 }, hp: 45 }, // mur friable du secret
    { id: 'BONE_BRIDGE', type: 'bridge', rect: { x: 132, y: 16, w: 6, h: 1 } },        // pont d'os fragile
  ],

  // ---- interactables (levier -> alcôve SEC_STONE_03, de plain-pied) ----
  interactables: [
    // levier au sol, sur le chemin principal ; la porte est juste à côté et visible
    // sans saut ni détour vertical — évite le problème d'un passage caché en hauteur.
    { id: 'LEVER_S06', type: 'lever', x: 172, y: 22, links: ['DOOR_LOOP'], prompt: 'Actionner le levier' },
    { id: 'DOOR_LOOP', type: 'door', rect: { x: 175, y: 19, w: 1, h: 4 }, state: 'closed' },
  ],

  // ---- rooms (unités de pacing/caméra/respawn) ----
  rooms: [
    { id: 'S01_PLATEAU', rect: { x: 0, y: 16, w: 24, h: 16 }, tags: ['start'],
      camera: { minX: 0, maxX: 26, minY: 12, maxY: 32 }, safeRespawn: [{ x: 3, y: 22, priority: 10 }, { x: 18, y: 20, priority: 6 }] },
    { id: 'S02_CANYON_HUB', rect: { x: 24, y: 14, w: 48, h: 18 }, tags: ['hub'],
      camera: { minX: 24, maxX: 72, minY: 10, maxY: 32 }, safeRespawn: [{ x: 34, y: 22, priority: 8 }] },
    { id: 'S03_UPPER_RIDGE', rect: { x: 66, y: 8, w: 66, h: 15 }, tags: ['branch', 'high_route'],
      camera: { minX: 66, maxX: 156, minY: 4, maxY: 26 }, safeRespawn: [{ x: 100, y: 16, priority: 6 }] },
    { id: 'S04_CAVE_SHAFT', rect: { x: 61, y: 19, w: 35, h: 13 }, tags: ['branch', 'descent'],
      camera: { minX: 61, maxX: 96, minY: 14, maxY: 32 }, safeRespawn: [{ x: 80, y: 29, priority: 7 }] },
    // Doit précéder S05_DEEP_CAVES dans ce tableau : les deux rects se chevauchent sur
    // x132-138/y21-23 (le fond de la chute du pont), et currentRoomAt() retient le premier
    // match — la petite poche doit gagner sur la grande salle qui l'englobe partiellement.
    { id: 'SEC_STONE_05_BRIDGE_FALL', rect: { x: 131, y: 16, w: 8, h: 9 }, tags: ['secret', 'cave', 'dark'],
      camera: { minX: 126, maxX: 144, minY: 12, maxY: 28 }, safeRespawn: [{ x: 134, y: 23, priority: 9 }] },
    { id: 'S05_DEEP_CAVES', rect: { x: 96, y: 21, w: 58, h: 11 }, tags: ['branch', 'low_route', 'dark'],
      camera: { minX: 96, maxX: 156, minY: 18, maxY: 32 }, safeRespawn: [{ x: 120, y: 29, priority: 6 }] },
    { id: 'S06_HUNTERS_EXIT', rect: { x: 146, y: 13, w: 38, h: 19 }, tags: ['convergence', 'loop'],
      camera: { minX: 146, maxX: 184, minY: 10, maxY: 32 }, safeRespawn: [{ x: 180, y: 22, priority: 8 }] },
    { id: 'S07_FIRST_FIRE_CAMP', rect: { x: 184, y: 17, w: 28, h: 15 }, tags: ['safe', 'no_enemy', 'merchant'],
      camera: { minX: 184, maxX: 212, minY: 13, maxY: 32 }, safeRespawn: [{ x: 198, y: 22, priority: 10 }] },
    { id: 'S08_TOTEM_PASS', rect: { x: 212, y: 12, w: 108, h: 10 }, tags: ['tension'],
      camera: { minX: 212, maxX: 320, minY: 8, maxY: 32 }, safeRespawn: [{ x: 226, y: 22, priority: 7 }, { x: 300, y: 20, priority: 8 }] },
    { id: 'SEC_STONE_04_DEPTHS', rect: { x: 225, y: 22, w: 93, h: 12 }, tags: ['secret', 'cave', 'dark'],
      camera: { minX: 220, maxX: 320, minY: 18, maxY: 32 },
      safeRespawn: [{ x: 230, y: 30, priority: 9 }, { x: 250, y: 30, priority: 7 }, { x: 300, y: 30, priority: 7 }] },
    { id: 'S09_MAMMOTH_ARENA', rect: { x: 320, y: 8, w: 34, h: 24 }, tags: ['boss'],
      camera: { minX: 320, maxX: 354, minY: 6, maxY: 32 }, safeRespawn: [{ x: 324, y: 23, priority: 10 }] },
  ],

  // ---- encounters verrouillés ----
  encounters: [
    { id: 'E_STONE_HUB', roomId: 'S02_CANYON_HUB',
      trigger: { x: 40, y: 16, w: 16, h: 10 },
      gates: [{ x: 38, y: 15, w: 1, h: 9 }, { x: 60, y: 14, w: 1, h: 10 }],
      waves: [{ ids: ['stone_spear', 'stone_spear'] }, { ids: ['stone_slinger', 'beast_hunter'] }],
      reward: { coins: 15 } },
    { id: 'E_STONE_CAVES', roomId: 'S05_DEEP_CAVES',
      trigger: { x: 104, y: 24, w: 22, h: 6 },
      gates: [],
      waves: [{ ids: ['stone_cave_stalker', 'stone_spear', 'war_shaman'] }],
      reward: { coins: 14 } },
    { id: 'E_STONE_ELITE', roomId: 'S08_TOTEM_PASS',
      trigger: { x: 252, y: 16, w: 18, h: 8 },
      gates: [{ x: 248, y: 14, w: 1, h: 10 }, { x: 285, y: 14, w: 1, h: 10 }],
      waves: [{ ids: ['mammoth_rider', 'stone_spear', 'stone_spear'], elite: ['mammoth_rider'] }],
      reward: { coins: 25 } },
    // SEC_STONE_04 — zone 2 du réseau souterrain : chauves-souris + frondeurs en retrait, verrouillé.
    { id: 'E_SEC04_GAUNTLET', roomId: 'SEC_STONE_04_DEPTHS',
      trigger: { x: 240, y: 25, w: 20, h: 5 },
      gates: [{ x: 239, y: 25, w: 1, h: 5 }, { x: 261, y: 25, w: 1, h: 5 }],
      waves: [{ ids: ['stone_cave_bats', 'stone_cave_bats', 'stone_slinger', 'stone_slinger'] }],
      reward: { coins: 18 } },
    // SEC_STONE_04 — zone 4 (antre finale) : mini-boss à taille humaine, salle sans issue tant qu'il vit.
    { id: 'E_SEC04_MAMMOTH', roomId: 'SEC_STONE_04_DEPTHS',
      trigger: { x: 293, y: 25, w: 21, h: 5 },
      gates: [{ x: 292, y: 25, w: 1, h: 5 }],
      waves: [{ ids: ['mammoth_rider'], elite: ['mammoth_rider'] }],
      reward: { coins: 30 } },
  ],

  // ---- déclencheurs de scène ----
  triggers: [
    { id: 'BATS_WAKE', rect: { x: 61, y: 23, w: 6, h: 4 }, action: 'wakeSpawns', group: 'well_bats' },
    { id: 'RIDGE_WAKE', rect: { x: 96, y: 14, w: 40, h: 3 }, action: 'wakeSpawns', group: 'ridge' },
    // SEC_STONE_04 — zone 3 : les traqueurs tombent du plafond une fois le joueur au centre de la salle.
    { id: 'SEC04_STALKERS_WAKE', rect: { x: 268, y: 25, w: 16, h: 5 }, action: 'wakeSpawns', group: 'sec04_stalkers' },
  ],

  // ---- ennemis libres (hors encounters) + chauves-souris suspendues ----
  spawns: [
    { tx: 10, ty: 22, id: 'stone_spear' },
    { tx: 20, ty: 20, id: 'stone_slinger' },
    // essaim suspendu dans le puits, réveillé à mi-descente
    { tx: 63, ty: 24, id: 'stone_cave_bats', suspended: true, activate: 'well_bats' },
    { tx: 66, ty: 25, id: 'stone_cave_bats', suspended: true, activate: 'well_bats' },
    { tx: 70, ty: 26, id: 'stone_cave_bats', suspended: true, activate: 'well_bats' },
    // route haute : frondeurs avec couverture (dormants tant qu'on n'est pas sur la corniche)
    { tx: 104, ty: 16, id: 'stone_slinger', dormant: true, activate: 'ridge' },
    { tx: 126, ty: 16, id: 'beast_hunter', dormant: true, activate: 'ridge' },
    // S08 chasse
    { tx: 224, ty: 22, id: 'beast_hunter' },
    // décalé de tx236 (retour exact des portails locaux SEC_STONE_04, cf. `localPortals` plus bas) :
    // l'IA ressortait du puits en pleine bagarre contre ce garde, à 3 tuiles seulement du bord du
    // puits — un recul de combat/esquive suffisait à la refaire tomber dedans, d'où une boucle
    // puits -> portail -> combat -> chute -> puits...
    { tx: 245, ty: 22, id: 'beast_hunter' },
    { tx: 218, ty: 17, id: 'stone_slinger', onPlatform: true }, // repositionné avec S08_PERCH ci-dessus
    { tx: 300, ty: 20, id: 'stone_spear' },
    // SEC_STONE_04 — zone 1 : garde d'entrée, brute élite au pied du puits.
    { tx: 237, ty: 30, id: 'stone_brute', elite: true },
    // SEC_STONE_04 — zone 3 : traqueurs suspendus au plafond, tombent au réveil du trigger
    // SEC04_STALKERS_WAKE une fois le joueur au centre de la salle (encerclement).
    // ty:27 (pas 25, le niveau même du plafond) : `footY` place le sprite VERS LE HAUT à
    // partir de ce point — à ty:25 il débordait dans la roche solide du plafond (visible
    // "dans les murs" depuis que la grotte est bien éclairée). ty:27 le garde entièrement
    // dans le vide du tunnel, juste sous le plafond.
    { tx: 266, ty: 27, id: 'stone_cave_stalker', suspended: true, activate: 'sec04_stalkers' },
    { tx: 271, ty: 27, id: 'stone_cave_stalker', suspended: true, activate: 'sec04_stalkers' },
    { tx: 277, ty: 27, id: 'stone_cave_stalker', suspended: true, activate: 'sec04_stalkers' },
    { tx: 282, ty: 27, id: 'stone_cave_stalker', suspended: true, activate: 'sec04_stalkers' },
    // SEC_STONE_05 — poche du pont d'os effondré : mêmes monstres dédiés que SEC_STONE_04
    // (déjà les ennemis "de grotte" de l'ère, pas besoin d'en recréer d'autres pour une si
    // petite poche) ; statiques (pas suspendus), la salle est trop petite pour une embuscade.
    { tx: 133, ty: 23, id: 'stone_cave_stalker' },
    { tx: 134, ty: 19, id: 'stone_cave_bats' },
    { tx: 136, ty: 20, id: 'stone_cave_bats' },
  ],

  // ---- coffres ----
  chests: [
    { x: 30, y: 22 },
    { x: 110, y: 12, high: true },        // SEC_STONE_02 : coffre haut (maîtrise du mouvement)
    { x: 56, y: 29, high: true },         // SEC_STONE_01 : relique derrière le mur friable
    { x: 206, y: 22 },                    // coffre du camp
    { x: 178, y: 23 },                    // SEC_STONE_03 : cache d'or (alcôve du levier, plain-pied)
    { x: 312, y: 20 },                    // coffre de préparation (antichambre)
    { x: 306, y: 30, guaranteed: 'swordUp' }, // SEC_STONE_04 : récompense garantie, derrière le mini-boss
    { x: 135, y: 23, guaranteed: 'skillPoint' }, // SEC_STONE_05 : trésor garanti de la poche du pont effondré
  ],

  merchant: { x: 198, y: 22 },

  // ---- mini-portails locaux (remontée depuis une poche secrète, pas une transition d'ère) ----
  // returnTo décalé de tx236 à tx241 (cf. commentaire sur le spawn `beast_hunter` du puits plus
  // haut) : le point de sortie tombait à seulement 3 tuiles du bord du puits (tx233), et pile sur
  // le point d'apparition d'un garde libre — un recul de combat/esquive juste après avoir
  // ressurgi suffisait à retomber dans le puits, provoquant une boucle puits/portail infinie
  // (retour joueur 2026-07-27 : "l'IA (...) reaches the end of the cave, teleport up, goes back
  // in to the end, and loops"). tx241 laisse 8 tuiles de marge avant le bord du puits.
  localPortals: [
    { x: 229, y: 30, returnTo: { x: 241, y: 22 } }, // SEC_STONE_04 : sortie rapide au pied du puits
    { x: 312, y: 30, returnTo: { x: 241, y: 22 } }, // SEC_STONE_04 : sortie finale, après le mini-boss
    // SEC_STONE_05 : remonte sur S06_LANDING (x150,y21, plateforme one-way déjà existante de la
    // route haute) — seule sortie de la poche, condition explicite du TODO ("pas de cul-de-sac
    // sans retour") : sans ce portail, retomber au fond via le pont cassé serait un aller simple.
    { x: 134, y: 23, returnTo: { x: 150, y: 21 } },
  ],

  // ---- poches sombres : ambiance de caverne (cf. drawDarkZones) ----
  darkZones: [
    // capuchon du puits : reste volontairement plus opaque que le tunnel lui-même — la
    // profondeur du puits doit rester un mystère vu depuis la surface, même si une fois
    // dans le réseau souterrain (zone du dessous) la visibilité est maintenant bonne.
    { x: 227, y: 20, w: 6, h: 4, tint: 0.8 },
    { x: 225, y: 24, w: 93, h: 8 },   // réseau souterrain (zones 1-4), sous le puits — bien éclairé
    { x: 131, y: 17, w: 8, h: 6 },    // SEC_STONE_05 : poche du pont effondré
  ],

  // ---- décor ----
  props: [
    { type: 'bones', tx: 8, ty: 22 },
    { type: 'rock', tx: 22, ty: 20 },
    { type: 'bones', tx: 46, ty: 23 },
    { type: 'fire', tx: 63, ty: 22, s: 0.9 },       // langage « sûr » du puits
    { type: 'rock', tx: 100, ty: 16 },              // couverture des frondeurs
    { type: 'rock', tx: 124, ty: 16 },
    // indices du mur friable SEC_STONE_01 (§9 spec : ossements + poussière orientés vers le mur)
    { type: 'bones', tx: 58, ty: 29 },
    { type: 'bones', tx: 59.5, ty: 29 },
    { type: 'stall', tx: 198, ty: 22 },
    { type: 'fire', tx: 196, ty: 22, s: 1.1 },      // feu central du camp
    { type: 'totem', tx: 294, ty: 20 },
    { type: 'totem', tx: 302, ty: 20 },
    { type: 'bones', tx: 240, ty: 22 },
    { type: 'fire', tx: 324, ty: 23, s: 1.2 },
    { type: 'fire', tx: 350, ty: 23, s: 1.2 },
    // SEC_STONE_04 : torches du réseau souterrain — la roche de caverne + la teinte d'ambiance
    // (cf. drawDarkZones/_drawTerrainGrid) assurent maintenant une bonne visibilité partout ;
    // ces torches ne sont plus la seule source de lumière, juste des halos chauds d'ambiance.
    { type: 'fire', tx: 229, ty: 26, s: 0.75 },   // puits vertical, à mi-descente
    { type: 'fire', tx: 231, ty: 30, s: 0.9 },
    { type: 'fire', tx: 243, ty: 30, s: 0.9 },
    { type: 'fire', tx: 254, ty: 30, s: 0.9 },
    { type: 'fire', tx: 264, ty: 30, s: 0.85 },
    { type: 'fire', tx: 275, ty: 30, s: 0.75 },   // volontairement faible : embuscade des traqueurs
    { type: 'fire', tx: 286, ty: 30, s: 0.85 },
    { type: 'fire', tx: 297, ty: 30, s: 0.9 },
    { type: 'fire', tx: 309, ty: 30, s: 1.1 },    // éclaire le coffre final
    { type: 'fire', tx: 134, ty: 23, s: 0.8 },    // SEC_STONE_05 : poche du pont effondré
  ],

  // ---- indices pour l'IA de démonstration ----
  navHints: {
    defaultRoute: 'low',                            // route basse (puits) : sans escalade
    dropZones: [{ x0: 61, x1: 66, landTy: 29 }],     // le puits est une chute volontaire
    climbs: [
      { id: 'CLIMB_STONE_01', x: 63, bottomY: 28, topY: 16, exitX: 72 },
    ],
    bridge: { id: 'BONE_BRIDGE', x0: 132, x1: 138 },
  },
};

// ========================================================= NIVEAU 2 : ANTIQUITÉ
// « Les Catacombes de l'Acropole » — première carte authored de l'ère 2, sur le même
// modèle que STONE (cf. section "Zones secrètes et grottes" du TODO, 2026-07-27) :
// terrain simple à un seul chemin (pas de double route haute/basse comme STONE, pour
// rester dans un périmètre raisonnable), une seule grotte secrète bien formée plutôt
// que plusieurs poches disparates. R3-R6 restent procédurales (`_buildProcedural`) et
// suivront le même patron, une ère à la fois (cf. TODO).
// Structure : A01 forecourt -> A02 hub (combat + puits vers la crypte secrète) ->
//   A03 marché -> A04 passe élite -> arène.
const ANTIQUITY = {
  id: 'antiquity',
  tilesW: 244,
  worldH: 32,
  spawnX: 3,
  startRoom: 'A01_FORECOURT',
  bossArenaRoom: 'A06_ACROPOLIS_ARENA',
  arenaStartTx: 210,
  gateTx: 211,
  arenaGy: 23,
  fallDamageRatio: 0.10,

  // ---- terrain solide ----
  solids: [
    { x: 0, y: 22, w: 16, h: 10 },        // A01 forecourt d'arrivée
    { x: 16, y: 21, w: 2, h: 11 },        // marche
    { x: 18, y: 20, w: 2, h: 12 },        // marche
    // A02 hub + crypte : bloc plein x20-100, creusé en dessous (cf. `empties`) — même
    // technique que S08_TOTEM_PASS/SEC_STONE_04 dans STONE (croûte de surface préservée,
    // réseau souterrain creusé dedans, plancher préservé).
    { x: 20, y: 20, w: 80, h: 12 },
    { x: 100, y: 20, w: 40, h: 12 },      // A03 marché (sol continu, pas de crypte dessous)
    { x: 140, y: 20, w: 50, h: 12 },      // A04 passe élite
    { x: 190, y: 21, w: 3, h: 11 },       // descente vers l'arène
    { x: 193, y: 22, w: 3, h: 10 },
    { x: 196, y: 23, w: 14, h: 9 },       // antichambre d'arène
    { x: 210, y: 23, w: 34, h: 9 },       // A06 sol d'arène (l'image d'arène prend le relais)
  ],

  // ---- creusements (crypte SEC_ANTIQUITY_01) ----
  empties: [
    // puits d'entrée (x45-49) : perce la croûte de surface (y20-24) du bloc A02.
    { x: 45, y: 20, w: 5, h: 5 },
    // réseau souterrain horizontal (x22-98, y25-29) : plafond à y25 (croûte y20-24
    // préservée), plancher à y30-31 préservé (fait partie du même bloc plein).
    { x: 22, y: 25, w: 76, h: 5 },
  ],

  // ---- plateformes traversables (one-way) ----
  oneWay: [
    { x: 106, y: 16, w: 4, id: 'A_HIGH_LEDGE' }, // corniche du coffre haut (double saut, avant le marché)
  ],

  climbables: [],
  breakables: [],
  interactables: [],

  // ---- rooms ----
  rooms: [
    { id: 'A01_FORECOURT', rect: { x: 0, y: 16, w: 20, h: 16 }, tags: ['start'],
      camera: { minX: 0, maxX: 22, minY: 12, maxY: 32 }, safeRespawn: [{ x: 3, y: 22, priority: 10 }] },
    { id: 'A02_HUB', rect: { x: 20, y: 14, w: 80, h: 8 }, tags: ['hub'],
      camera: { minX: 20, maxX: 100, minY: 10, maxY: 26 }, safeRespawn: [{ x: 26, y: 20, priority: 8 }] },
    { id: 'SEC_ANTIQUITY_CRYPT', rect: { x: 20, y: 22, w: 80, h: 10 }, tags: ['secret', 'cave', 'dark'],
      camera: { minX: 20, maxX: 100, minY: 18, maxY: 32 },
      safeRespawn: [{ x: 47, y: 29, priority: 9 }, { x: 90, y: 29, priority: 7 }] },
    { id: 'A03_MARKET', rect: { x: 100, y: 14, w: 40, h: 18 }, tags: ['safe', 'no_enemy', 'merchant'],
      camera: { minX: 100, maxX: 140, minY: 10, maxY: 32 }, safeRespawn: [{ x: 120, y: 20, priority: 10 }] },
    { id: 'A04_ELITE_PASS', rect: { x: 140, y: 10, w: 70, h: 22 }, tags: ['tension'],
      camera: { minX: 140, maxX: 210, minY: 8, maxY: 32 }, safeRespawn: [{ x: 146, y: 20, priority: 7 }, { x: 200, y: 23, priority: 8 }] },
    { id: 'A06_ACROPOLIS_ARENA', rect: { x: 210, y: 8, w: 34, h: 24 }, tags: ['boss'],
      camera: { minX: 210, maxX: 244, minY: 6, maxY: 32 }, safeRespawn: [{ x: 214, y: 23, priority: 10 }] },
  ],

  // ---- encounters verrouillés ----
  encounters: [
    { id: 'E_ANTIQUITY_HUB', roomId: 'A02_HUB',
      trigger: { x: 26, y: 12, w: 14, h: 10 },
      gates: [{ x: 25, y: 10, w: 1, h: 12 }, { x: 41, y: 10, w: 1, h: 12 }],
      waves: [{ ids: ['hoplite', 'hoplite'] }, { ids: ['archer_auxilia', 'desert_raider'] }],
      reward: { coins: 15 } },
    // SEC_ANTIQUITY_01 — crypte : gantelet verrouillé avec les monstres dédiés (jamais sur la surface).
    { id: 'E_ANTIQUITY_CRYPT', roomId: 'SEC_ANTIQUITY_CRYPT',
      trigger: { x: 58, y: 25, w: 20, h: 5 },
      gates: [{ x: 57, y: 25, w: 1, h: 5 }, { x: 79, y: 25, w: 1, h: 5 }],
      waves: [{ ids: ['crypt_wraith', 'crypt_wraith', 'tomb_scarabs', 'tomb_scarabs'] }],
      reward: { coins: 18 } },
    { id: 'E_ANTIQUITY_ELITE', roomId: 'A04_ELITE_PASS',
      trigger: { x: 150, y: 12, w: 16, h: 10 },
      gates: [{ x: 148, y: 10, w: 1, h: 12 }, { x: 168, y: 10, w: 1, h: 12 }],
      waves: [{ ids: ['temple_guardian', 'hoplite', 'hoplite'], elite: ['temple_guardian'] }],
      reward: { coins: 25 } },
  ],

  triggers: [],

  // ---- ennemis libres ----
  spawns: [
    { tx: 10, ty: 22, id: 'hoplite' },
    { tx: 70, ty: 20, id: 'archer_auxilia' },
    { tx: 125, ty: 20, id: 'desert_raider' },
    { tx: 175, ty: 20, id: 'hoplite' },
    { tx: 200, ty: 23, id: 'archer_auxilia' },
    // SEC_ANTIQUITY_01 — zone 1 : garde d'entrée au pied du puits (monstre dédié de crypte).
    { tx: 47, ty: 29, id: 'crypt_wraith' },
  ],

  // ---- coffres ----
  chests: [
    { x: 12, y: 22 },
    { x: 107, y: 16, high: true },        // corniche A_HIGH_LEDGE
    { x: 130, y: 20 },                    // coffre du marché
    { x: 180, y: 20 },                    // coffre de la passe élite
    { x: 205, y: 23 },                    // coffre de préparation (antichambre)
    { x: 90, y: 29, guaranteed: 'bowUp' }, // SEC_ANTIQUITY_01 : récompense garantie de la crypte
  ],

  merchant: { x: 120, y: 20 },

  // ---- mini-portails locaux (remontée depuis la crypte secrète) ----
  localPortals: [
    { x: 47, y: 29, returnTo: { x: 61, y: 20 } },  // sortie rapide au pied du puits
    { x: 90, y: 29, returnTo: { x: 61, y: 20 } },  // sortie après la salle du trésor
  ],

  // ---- poches sombres ----
  darkZones: [
    { x: 45, y: 20, w: 5, h: 4, tint: 0.8 },  // capuchon du puits
    { x: 22, y: 24, w: 76, h: 6 },            // réseau souterrain, bien éclairé
  ],

  // ---- décor ----
  props: [
    { type: 'column', tx: 8, ty: 22 },
    { type: 'amphora', tx: 30, ty: 20 },
    { type: 'banner', tx: 65, ty: 20 },
    { type: 'column', tx: 104, ty: 20 },
    { type: 'banner', tx: 118, ty: 20 },
    { type: 'laurel', tx: 122, ty: 20 },
    { type: 'column', tx: 155, ty: 20 },
    { type: 'column', tx: 185, ty: 20 },
    { type: 'fire', tx: 214, ty: 23, s: 1.2 },
    { type: 'fire', tx: 240, ty: 23, s: 1.2 },
    // torches de la crypte
    { type: 'fire', tx: 47, ty: 29, s: 0.75 },
    { type: 'fire', tx: 60, ty: 29, s: 0.85 },
    { type: 'fire', tx: 70, ty: 29, s: 0.85 },
    { type: 'fire', tx: 80, ty: 29, s: 0.85 },
    { type: 'fire', tx: 90, ty: 29, s: 0.9 },     // met en valeur le coffre du trésor
  ],
};

AR.LEVEL_SPECS = {
  stone: STONE,
  antiquity: ANTIQUITY,
  medieval: null,
  renaissance: null,
  diesel: null,
  cyber: null,
};
