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
      gates: [],
      waves: [{ ids: ['stone_spear', 'stone_spear'] }, { ids: ['stone_slinger', 'beast_hunter'] }],
      reward: { coins: 15 } },
    { id: 'E_STONE_CAVES', roomId: 'S05_DEEP_CAVES',
      trigger: { x: 104, y: 24, w: 22, h: 6 },
      gates: [],
      waves: [{ ids: ['stone_cave_stalker', 'stone_spear', 'war_shaman'] }],
      reward: { coins: 14 } },
    { id: 'E_STONE_ELITE', roomId: 'S08_TOTEM_PASS',
      trigger: { x: 252, y: 16, w: 18, h: 8 },
      gates: [],
      waves: [{ ids: ['mammoth_rider', 'stone_spear', 'stone_spear'], elite: ['mammoth_rider'] }],
      reward: { coins: 25 } },
    // SEC_STONE_04 — zone 2 du réseau souterrain : chauves-souris + frondeurs en retrait, verrouillé.
    { id: 'E_SEC04_GAUNTLET', roomId: 'SEC_STONE_04_DEPTHS',
      trigger: { x: 240, y: 25, w: 20, h: 5 },
      gates: [],
      waves: [{ ids: ['stone_cave_bats', 'stone_cave_bats', 'stone_slinger', 'stone_slinger'] }],
      reward: { coins: 18 } },
    // SEC_STONE_04 — zone 4 (antre finale) : mini-boss à taille humaine, salle sans issue tant qu'il vit.
    { id: 'E_SEC04_MAMMOTH', roomId: 'SEC_STONE_04_DEPTHS',
      trigger: { x: 293, y: 25, w: 21, h: 5 },
      gates: [],
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
// Retour joueur 2026-07-27 (2e passe) : la 1ère version (une seule petite crypte, ~17
// monstres) était jugée trop proche du patron de l'ère 1 et trop en retrait par rapport à la
// densité procédurale historique (~70-80 monstres/ère). Refonte complète : carte beaucoup plus
// grande (564 tuiles avant l'arène, contre 354 pour STONE) et structurellement originale —
// pas juste « encore une grotte » mais une vraie descente (Quartier des Esclaves, souterrain,
// sombre, oppressant) ET une vraie ascension (Forum civique en hauteur -> Arène des Gladiateurs,
// duels enchaînés). Chaque zone a son identité propre (terrain, ambiance, monstres) plutôt que
// de réutiliser le même schéma partout.
// Structure : A01 forecourt -> A02 rue haute (combat) -> DESCENTE -> A03 Quartier des Esclaves
//   (souterrain, + A03B_SLAVE_PIT : la Fosse des Esclaves, une salle d'arène creusée dans la
//   croûte au-dessus du tunnel, reliée par un escalier ET un monte-charge — retour joueur
//   2026-07-27 après une 1ère version jugée trop discrète : « le rectangle du milieu avec la
//   petite cache secrète est sous-utilisé, je veux une arène au-dessus, en plus grand/profond,
//   avec le monte-charge au-dessus des escaliers pour choisir entre monter par l'un ou l'autre »
//   — puis, la zone du monte-charge elle-même jugée décevante une fois vidée : « La Fosse aux
//   Bêtes », set-piece à 5 mini-boss uniques dans une arène illustrée, cf. `gladiatorArena` et
//   `E_GLADIATOR_PIT_ARENA` plus bas)
//   -> REMONTÉE -> A04 marché -> MONTÉE -> A05 Forum (plaza civique, plateformes étagées) ->
//   A06 Arène des Gladiateurs (duels en série, du solo à la bête finale) -> DESCENTE ->
//   A07 passe élite -> arène du boss.
const ANTIQUITY = {
  id: 'antiquity',
  tilesW: 564,
  worldH: 32,
  spawnX: 3,
  startRoom: 'A01_FORECOURT',
  bossArenaRoom: 'A08_ACROPOLIS_ARENA',
  arenaStartTx: 530,
  gateTx: 531,
  arenaGy: 22,
  // Arène des Gladiateurs (E_GLADIATOR_PIT_ARENA, encounter ci-dessous) : PAS le boss de fin
  // d'ère — un set-piece à 5 duels en haut du monte-charge de la Fosse des Esclaves, dans une
  // vraie arène illustrée (cf. AR.BOSS_ARENAS.gladiator_pit, src/arenas.js) au lieu d'une salle
  // en tuiles. `tx` n'a besoin de correspondre à rien de visible : juste un ancrage pour l'écran
  // verrouillé (cf. Level#activateGladiatorArena).
  gladiatorArena: { defKey: 'gladiator_pit', tx: 178 },
  fallDamageRatio: 0.10,

  // ---- terrain solide ----
  solids: [
    { x: 0, y: 22, w: 20, h: 10 },        // A01 forecourt d'arrivée
    { x: 20, y: 21, w: 2, h: 11 },        // marche
    { x: 22, y: 20, w: 2, h: 12 },        // marche
    { x: 24, y: 20, w: 46, h: 12 },       // A02 rue haute (combat)

    // ---- descente vers le Quartier des Esclaves (escalier praticable, x70-100, y21->30) ----
    { x: 70, y: 21, w: 3, h: 11 }, { x: 73, y: 22, w: 3, h: 10 }, { x: 76, y: 23, w: 3, h: 9 },
    { x: 79, y: 24, w: 3, h: 8 }, { x: 82, y: 25, w: 3, h: 7 }, { x: 85, y: 26, w: 3, h: 6 },
    { x: 88, y: 27, w: 3, h: 5 }, { x: 91, y: 28, w: 3, h: 4 }, { x: 94, y: 29, w: 3, h: 3 },
    { x: 97, y: 30, w: 3, h: 2 },

    // A03 Quartier des Esclaves : masse pleine x100-220, creusée en dessous ET au-dessus (cf.
    // `empties`) — même technique que S08_TOTEM_PASS/SEC_STONE_04 dans STONE (croûte/plancher
    // préservés), mais ici c'est le chemin PRINCIPAL (obligatoire), pas une poche secrète. Le
    // bloc part de y4 (au lieu de y16) : la croûte au-dessus du tunnel n'est plus juste de la
    // roche pleine inutilisée, elle loge maintenant la Fosse des Esclaves (cf. plus bas — retour
    // joueur 2026-07-27 : « le rectangle du milieu avec la petite cache secrète est sous-utilisé,
    // je veux une arène au-dessus, tu peux l'agrandir et l'approfondir »).
    { x: 100, y: 4, w: 120, h: 28 },

    // ---- remontée vers la surface (x220-250, y30->21) ----
    { x: 220, y: 30, w: 3, h: 2 }, { x: 223, y: 29, w: 3, h: 3 }, { x: 226, y: 28, w: 3, h: 4 },
    { x: 229, y: 27, w: 3, h: 5 }, { x: 232, y: 26, w: 3, h: 6 }, { x: 235, y: 25, w: 3, h: 7 },
    { x: 238, y: 24, w: 3, h: 8 }, { x: 241, y: 23, w: 3, h: 9 }, { x: 244, y: 22, w: 3, h: 10 },
    { x: 247, y: 21, w: 3, h: 11 },

    { x: 250, y: 20, w: 30, h: 12 },      // A04 marché (safe)

    // ---- montée vers le Forum (x280-310, y19->10) ----
    { x: 280, y: 19, w: 3, h: 13 }, { x: 283, y: 18, w: 3, h: 14 }, { x: 286, y: 17, w: 3, h: 15 },
    { x: 289, y: 16, w: 3, h: 16 }, { x: 292, y: 15, w: 3, h: 17 }, { x: 295, y: 14, w: 3, h: 18 },
    { x: 298, y: 13, w: 3, h: 19 }, { x: 301, y: 12, w: 3, h: 20 }, { x: 304, y: 11, w: 3, h: 21 },
    { x: 307, y: 10, w: 3, h: 22 },

    { x: 310, y: 10, w: 90, h: 22 },      // A05 Forum : grande plaza civique en hauteur

    // ---- transition vers l'Arène des Gladiateurs (x400-409, léger contrebas) ----
    { x: 400, y: 11, w: 3, h: 21 }, { x: 403, y: 12, w: 3, h: 20 }, { x: 406, y: 13, w: 3, h: 19 },

    { x: 409, y: 14, w: 45, h: 18 },      // A06 Arène des Gladiateurs : fosse fermée, duels en série

    // ---- descente vers la rue (x454-478, y15->22) ----
    { x: 454, y: 15, w: 3, h: 17 }, { x: 457, y: 16, w: 3, h: 16 }, { x: 460, y: 17, w: 3, h: 15 },
    { x: 463, y: 18, w: 3, h: 14 }, { x: 466, y: 19, w: 3, h: 13 }, { x: 469, y: 20, w: 3, h: 12 },
    { x: 472, y: 21, w: 3, h: 11 }, { x: 475, y: 22, w: 3, h: 10 },

    { x: 478, y: 22, w: 52, h: 10 },      // A07 passe élite + antichambre d'arène
    { x: 530, y: 22, w: 34, h: 10 },      // A08 sol d'arène (l'image d'arène prend le relais)
  ],

  // ---- creusements (Quartier des Esclaves + Fosse des Esclaves au-dessus du tunnel) ----
  empties: [
    // réseau souterrain principal (x100-220, y25-29) : plafond à y25, plancher y30-31 préservé.
    { x: 100, y: 25, w: 120, h: 5 },
    // A03B_SLAVE_PIT : la Fosse des Esclaves, une vraie salle d'arène creusée dans la croûte
    // au-dessus du tunnel (x110-210, y6-19 ; plancher préservé à y20). Anciennement une petite
    // cache (SEC_ANTIQUITY_02, 1 mur friable + 3 monstres) jugée sous-utilisée par le joueur —
    // remplacée par une vraie salle de combat, beaucoup plus grande et profonde.
    { x: 110, y: 6, w: 100, h: 14 },
    // Escalier praticable reliant le sol du tunnel (y29, cf. réseau souterrain ci-dessus) au
    // plancher de la fosse (y20) : 9 marches creusées individuellement (et non un seul puits
    // rectangulaire) pour que chaque marche garde une base solide sous les pieds — cf. le
    // commentaire détaillé sur ce même besoin pour SEC_STONE_05 (level_specs STONE).
    { x: 145, y: 6, w: 3, h: 23 }, { x: 148, y: 6, w: 3, h: 22 }, { x: 151, y: 6, w: 3, h: 21 },
    { x: 154, y: 6, w: 3, h: 20 }, { x: 157, y: 6, w: 3, h: 19 }, { x: 160, y: 6, w: 3, h: 18 },
    { x: 163, y: 6, w: 3, h: 17 }, { x: 166, y: 6, w: 3, h: 16 }, { x: 169, y: 6, w: 3, h: 15 },
    // Puits du monte-charge (SLAVE_PIT_LIFT ci-dessous), juste après l'escalier : « les monte-
    // charges doivent être au-dessus des escaliers, il faut choisir entre monter par le monte-
    // charge ou descendre par l'escalier » (retour joueur) — les deux options partent donc du
    // même point du tunnel et remontent côte à côte jusqu'à la fosse.
    { x: 178, y: 6, w: 4, h: 23 },
  ],

  // ---- plateformes traversables (one-way) ----
  oneWay: [
    // gradins du Forum : verticalité de combat + coffre perché
    { x: 330, y: 6, w: 6, id: 'FORUM_STEPS_1' },
    { x: 350, y: 4, w: 6, id: 'FORUM_STEPS_2' },
    // Passerelle de la Fosse des Esclaves (x145-178, y20) : sans elle, la moitié gauche de la
    // fosse (x110-145, coffre x125) n'est reliée à rien — l'escalier descend vers le tunnel, pas
    // vers cette moitié, et le mur qui la borde (x145, du plancher y20 jusqu'au fond) est trop
    // haut pour être escaladé (trouvé via retour joueur : « les 2 zones sont séparées par un
    // grand trou »). Plateforme traversable au niveau du plancher, par-dessus l'escalier, pour
    // pouvoir aussi descendre à travers si besoin.
    { x: 145, y: 20, w: 33, id: 'SLAVE_PIT_BRIDGE' },
  ],

  climbables: [],
  breakables: [],

  // ---- monte-charge de la Fosse des Esclaves : une manivelle à chaque extrémité (même
  // mécanisme `activateLift`, qui envoie toujours vers l'extrémité opposée à la position
  // actuelle — pas besoin de logique différente pour la manivelle du haut et celle du bas).
  interactables: [
    // x180 (pas x176) : dans l'emprise du monte-charge (tx178-182), pas juste à côté — sinon un
    // joueur monté sur la plateforme est hors de portée (rayon d'interaction ~70px/1.5 tuile)
    // de sa propre manivelle (trouvé en testant : le monte-charge montait, le joueur restait
    // planté à côté au lieu d'être dessus pour l'actionner).
    { id: 'CRANK_SLAVE_PIT_BOTTOM', type: 'crank', x: 180, y: 29, lift: 'SLAVE_PIT_LIFT', prompt: 'Actionner la manivelle' },
    { id: 'CRANK_SLAVE_PIT_TOP', type: 'crank', x: 180, y: 20, lift: 'SLAVE_PIT_LIFT', prompt: 'Actionner la manivelle' },
  ],

  // ---- monte-charges à corde ----
  lifts: [
    { id: 'SLAVE_PIT_LIFT', x: 178, w: 4, bottomY: 29, topY: 20, startY: 29, speed: 2.2 },
  ],

  // ---- rooms ---- (A03B_SLAVE_PIT doit précéder A03_SLAVE_QUARTER : les rects se
  // chevauchent et currentRoomAt() retient le premier match)
  rooms: [
    { id: 'A01_FORECOURT', rect: { x: 0, y: 16, w: 24, h: 16 }, tags: ['start'],
      camera: { minX: 0, maxX: 26, minY: 12, maxY: 32 }, safeRespawn: [{ x: 3, y: 22, priority: 10 }] },
    { id: 'A02_UPPER_STREET', rect: { x: 24, y: 8, w: 76, h: 24 }, tags: ['hub'],
      camera: { minX: 24, maxX: 100, minY: 6, maxY: 32 }, safeRespawn: [{ x: 30, y: 20, priority: 8 }] },
    { id: 'A03B_SLAVE_PIT', rect: { x: 108, y: 4, w: 104, h: 25 }, tags: ['secret', 'tension', 'dark'],
      camera: { minX: 104, maxX: 216, minY: 0, maxY: 32 },
      safeRespawn: [{ x: 150, y: 20, priority: 9 }, { x: 190, y: 20, priority: 7 }] },
    { id: 'A03_SLAVE_QUARTER', rect: { x: 100, y: 16, w: 150, h: 16 }, tags: ['branch', 'low_route', 'dark'],
      camera: { minX: 100, maxX: 250, minY: 12, maxY: 32 },
      safeRespawn: [{ x: 110, y: 29, priority: 7 }, { x: 200, y: 29, priority: 6 }] },
    { id: 'A04_MARKET', rect: { x: 250, y: 6, w: 60, h: 26 }, tags: ['safe', 'no_enemy', 'merchant'],
      camera: { minX: 250, maxX: 310, minY: 2, maxY: 32 }, safeRespawn: [{ x: 265, y: 20, priority: 10 }] },
    { id: 'A05_FORUM', rect: { x: 310, y: 0, w: 99, h: 32 }, tags: ['tension'],
      camera: { minX: 310, maxX: 409, minY: 0, maxY: 32 },
      safeRespawn: [{ x: 315, y: 10, priority: 7 }, { x: 395, y: 10, priority: 6 }] },
    { id: 'A06_GLADIATOR_ARENA', rect: { x: 409, y: 0, w: 69, h: 32 }, tags: ['tension'],
      camera: { minX: 409, maxX: 478, minY: 0, maxY: 32 }, safeRespawn: [{ x: 414, y: 14, priority: 8 }] },
    { id: 'A07_ELITE_PASS', rect: { x: 478, y: 6, w: 52, h: 26 }, tags: ['tension'],
      camera: { minX: 478, maxX: 530, minY: 4, maxY: 32 },
      safeRespawn: [{ x: 482, y: 22, priority: 7 }, { x: 520, y: 22, priority: 8 }] },
    { id: 'A08_ACROPOLIS_ARENA', rect: { x: 530, y: 0, w: 34, h: 32 }, tags: ['boss'],
      camera: { minX: 530, maxX: 564, minY: 0, maxY: 32 }, safeRespawn: [{ x: 534, y: 22, priority: 10 }] },
  ],

  // ---- encounters verrouillés ----
  encounters: [
    { id: 'E_ANTIQUITY_HUB', roomId: 'A02_UPPER_STREET',
      trigger: { x: 32, y: 10, w: 14, h: 12 },
      gates: [],
      waves: [{ ids: ['hoplite', 'hoplite'] }, { ids: ['archer_auxilia', 'desert_raider'] }],
      reward: { coins: 15 } },
    // Quartier des Esclaves — gantelet : contremaîtres + vermine, puis un forçat qui a brisé
    // ses chaînes en finale (monstres dédiés, jamais utilisés en surface).
    { id: 'E_SLAVE_GAUNTLET', roomId: 'A03_SLAVE_QUARTER',
      trigger: { x: 121, y: 25, w: 18, h: 5 },
      gates: [],
      waves: [{ ids: ['pit_vermin', 'pit_vermin', 'pit_vermin', 'chain_overseer'] },
              { ids: ['chain_overseer', 'chain_overseer', 'pit_vermin', 'pit_vermin'] },
              { ids: ['manacled_brute'] }],
      reward: { coins: 20 } },
    // A03B_SLAVE_PIT — la Fosse des Esclaves : combat clandestin, atteint par l'escalier ou le
    // monte-charge (cf. `lifts`/`interactables` ci-dessus). Distinct de l'Arène des Gladiateurs
    // (spectacle civique près du Forum) : ici c'est le roster souterrain de l'ère
    // (contremaîtres/vermine/forçat + les revenants de l'ancienne petite cache), pas les
    // soldats réguliers.
    { id: 'E_SLAVE_PIT', roomId: 'A03B_SLAVE_PIT',
      trigger: { x: 115, y: 8, w: 90, h: 10 },
      gates: [],
      waves: [{ ids: ['pit_vermin', 'pit_vermin', 'pit_vermin', 'pit_vermin'] },
              { ids: ['chain_overseer', 'chain_overseer', 'tomb_scarabs', 'tomb_scarabs'] },
              { ids: ['crypt_wraith', 'crypt_wraith'] },
              { ids: ['manacled_brute', 'chain_overseer'] }],
      reward: { coins: 35 } },
    // La Fosse aux Bêtes — set-piece dédié en haut du monte-charge (retour joueur : la zone
    // qu'on atteint par le monte-charge, une fois E_SLAVE_PIT déjà nettoyé au sol, n'était
    // qu'« un coffre, aucun monstre » — décevant vu l'effort du trajet). Déclencheur serré
    // autour de la plateforme du monte-charge (x177-186, juste au-dessus de la manivelle du
    // haut) plutôt que toute la fosse, pour ne pas se redéclencher avec E_SLAVE_PIT. `arena`
    // fait basculer l'écran sur une vraie arène illustrée (cf. `gladiatorArena` ci-dessus,
    // AR.BOSS_ARENAS.gladiator_pit) au lieu d'un combat en tuiles : 5 mini-boss uniques, un par
    // vague (jamais utilisés ailleurs), montée en puissance jusqu'au champion invaincu de la
    // fosse. `returnTo` (tuiles) : le pied du monte-charge, côté tunnel.
    { id: 'E_GLADIATOR_PIT_ARENA', roomId: 'A03B_SLAVE_PIT', arena: 'gladiator_pit',
      trigger: { x: 177, y: 16, w: 9, h: 5 },
      gates: [],
      waves: [{ ids: ['retiaire_spectral'] },
              { ids: ['manticore'] },
              { ids: ['gorgone'] },
              { ids: ['molosse'] },
              { ids: ['minotaure'] }],
      reward: { coins: 70, guaranteed: 'swordUp', returnTo: { x: 180, y: 29 } } },
    // Forum — plaza civique : combat à ciel ouvert sur plusieurs vagues, gradins praticables.
    { id: 'E_FORUM_PLAZA', roomId: 'A05_FORUM',
      trigger: { x: 320, y: 6, w: 60, h: 16 },
      gates: [],
      waves: [{ ids: ['hoplite', 'hoplite', 'hoplite'] },
              { ids: ['archer_auxilia', 'archer_auxilia', 'desert_raider'] },
              { ids: ['hoplite', 'archer_auxilia', 'desert_raider'] }],
      reward: { coins: 30 } },
    // Arène des Gladiateurs — LE set-piece original de cette ère : 5 duels enchaînés dans une
    // fosse, du combattant solo à la bête finale (même mécanisme de vagues séquentielles que les
    // autres encounters, mais utilisé ici pour simuler de vrais « rounds » d'arène).
    { id: 'E_GLADIATOR_ARENA', roomId: 'A06_GLADIATOR_ARENA',
      trigger: { x: 414, y: 4, w: 36, h: 26 },
      gates: [],
      waves: [{ ids: ['hoplite'] },
              { ids: ['desert_raider', 'desert_raider'] },
              { ids: ['temple_guardian'], elite: ['temple_guardian'] },
              { ids: ['hoplite', 'archer_auxilia'] },
              { ids: ['elephant_guard'] }],
      reward: { coins: 40 } },
    { id: 'E_ANTIQUITY_ELITE', roomId: 'A07_ELITE_PASS',
      trigger: { x: 488, y: 12, w: 16, h: 10 },
      gates: [],
      waves: [{ ids: ['temple_guardian', 'hoplite', 'hoplite'], elite: ['temple_guardian'] }],
      reward: { coins: 25 } },
  ],

  // ---- déclencheurs de scène ----
  triggers: [
    // Quartier des Esclaves — vermine suspendue au plafond du tunnel, tombe une fois le joueur
    // au centre (même mécanisme que BATS_WAKE/SEC04_STALKERS_WAKE dans STONE).
    { id: 'SLAVE_VERMIN_WAKE', rect: { x: 180, y: 25, w: 16, h: 5 }, action: 'wakeSpawns', group: 'slave_vermin' },
  ],

  // ---- ennemis libres ----
  spawns: [
    { tx: 8, ty: 22, id: 'hoplite' },
    { tx: 14, ty: 22, id: 'archer_auxilia' },
    // A02 rue haute
    { tx: 26, ty: 20, id: 'archer_auxilia' },
    { tx: 55, ty: 20, id: 'desert_raider' },
    { tx: 62, ty: 20, id: 'hoplite' },
    // A03 Quartier des Esclaves — patrouilles libres (contremaîtres + vermine des fosses)
    { tx: 105, ty: 29, id: 'pit_vermin' },
    { tx: 108, ty: 29, id: 'pit_vermin' },
    { tx: 110, ty: 29, id: 'pit_vermin' },
    { tx: 112, ty: 29, id: 'chain_overseer' },
    { tx: 145, ty: 29, id: 'chain_overseer' },
    { tx: 149, ty: 29, id: 'pit_vermin' },
    { tx: 153, ty: 29, id: 'pit_vermin' },
    { tx: 156, ty: 29, id: 'chain_overseer' },
    { tx: 166, ty: 29, id: 'chain_overseer' },
    { tx: 170, ty: 29, id: 'pit_vermin' },
    { tx: 197, ty: 29, id: 'pit_vermin' },
    { tx: 200, ty: 29, id: 'pit_vermin' },
    { tx: 203, ty: 29, id: 'pit_vermin' },
    { tx: 207, ty: 29, id: 'pit_vermin' },
    { tx: 213, ty: 29, id: 'chain_overseer' },
    { tx: 216, ty: 29, id: 'pit_vermin' },
    // (crypt_wraith/tomb_scarabs désormais dans les vagues d'E_SLAVE_PIT, pas en spawn libre)
    // Quartier des Esclaves — vermine suspendue au plafond, réveillée par SLAVE_VERMIN_WAKE
    { tx: 182, ty: 27, id: 'pit_vermin', suspended: true, activate: 'slave_vermin' },
    { tx: 186, ty: 27, id: 'pit_vermin', suspended: true, activate: 'slave_vermin' },
    { tx: 190, ty: 27, id: 'pit_vermin', suspended: true, activate: 'slave_vermin' },
    { tx: 194, ty: 27, id: 'pit_vermin', suspended: true, activate: 'slave_vermin' },
    // A05 Forum
    { tx: 313, ty: 10, id: 'archer_auxilia' },
    { tx: 317, ty: 10, id: 'hoplite' },
    { tx: 390, ty: 10, id: 'hoplite' },
    { tx: 395, ty: 10, id: 'archer_auxilia' },
    { tx: 398, ty: 10, id: 'archer_auxilia' },
    // A07 passe élite + approche
    { tx: 482, ty: 22, id: 'archer_auxilia' },
    { tx: 512, ty: 22, id: 'desert_raider' },
    { tx: 522, ty: 22, id: 'hoplite' },
  ],

  // ---- coffres ----
  chests: [
    { x: 12, y: 22 },                      // forecourt
    { x: 108, y: 29 },                     // Quartier des Esclaves
    { x: 265, y: 20 },                     // marché
    { x: 331, y: 6, high: true },          // Forum, gradins FORUM_STEPS_1
    { x: 351, y: 4, high: true },          // Forum, gradins FORUM_STEPS_2
    { x: 500, y: 22 },                     // passe élite
    { x: 125, y: 20 },                            // Fosse des Esclaves : coffre d'appoint
    { x: 200, y: 20, guaranteed: 'skillPoint' },  // Fosse des Esclaves : trésor garanti du vainqueur
    { x: 448, y: 14, guaranteed: 'swordUp' },     // Arène des Gladiateurs : récompense du champion
  ],

  merchant: { x: 265, y: 20 },

  localPortals: [],

  // ---- poches sombres ----
  darkZones: [
    { x: 100, y: 25, w: 120, h: 5 },  // Quartier des Esclaves : tunnel principal, bien éclairé
    { x: 110, y: 6, w: 100, h: 14, tint: 0.55 }, // Fosse des Esclaves : ambiance dure, sans être aveugle
  ],

  // ---- décor ----
  props: [
    { type: 'column', tx: 8, ty: 22 },
    { type: 'amphora', tx: 16, ty: 22 },
    { type: 'banner', tx: 26, ty: 20 },
    { type: 'column', tx: 40, ty: 20 },
    { type: 'amphora', tx: 60, ty: 20 },
    // Quartier des Esclaves : torches rares (ambiance dure, moins chaleureuse que la crypte de l'ère 1)
    { type: 'fire', tx: 104, ty: 29, s: 0.8 },
    { type: 'bones', tx: 115, ty: 29 },
    { type: 'fire', tx: 135, ty: 29, s: 0.8 },
    { type: 'rock', tx: 150, ty: 29 },
    { type: 'fire', tx: 165, ty: 29, s: 0.7 },
    { type: 'bones', tx: 190, ty: 29 },
    { type: 'fire', tx: 205, ty: 29, s: 0.8 },
    { type: 'fire', tx: 215, ty: 29, s: 0.85 },
    // Fosse des Esclaves : braseros autour de la fosse + repères lumineux le long de l'escalier
    { type: 'fire', tx: 115, ty: 20, s: 1.0 },
    { type: 'fire', tx: 145, ty: 20, s: 0.9 },
    { type: 'fire', tx: 175, ty: 20, s: 0.9 },
    { type: 'fire', tx: 205, ty: 20, s: 1.0 },
    { type: 'fire', tx: 150, ty: 27, s: 0.6 },
    { type: 'fire', tx: 166, ty: 24, s: 0.6 },
    { type: 'stall', tx: 265, ty: 20 },
    { type: 'fire', tx: 263, ty: 20, s: 1.1 },
    // Forum : grandeur civique
    { type: 'column', tx: 315, ty: 10 },
    { type: 'banner', tx: 325, ty: 10 },
    { type: 'laurel', tx: 340, ty: 10 },
    { type: 'column', tx: 360, ty: 10 },
    { type: 'banner', tx: 375, ty: 10 },
    { type: 'column', tx: 392, ty: 10 },
    // Arène des Gladiateurs : braseros
    { type: 'fire', tx: 414, ty: 14, s: 1.2 },
    { type: 'fire', tx: 449, ty: 14, s: 1.2 },
    // passe élite + arène du boss
    { type: 'column', tx: 482, ty: 22 },
    { type: 'column', tx: 520, ty: 22 },
    { type: 'fire', tx: 532, ty: 22, s: 1.2 },
    { type: 'fire', tx: 560, ty: 22, s: 1.2 },
  ],
};

// ======================================================= NIVEAU 3 : JAPON MÉDIÉVAL
// « Le Sanctuaire entre Deux Mondes » — v2 (densité), cf. TODO.md 2026-07-28. La v1 (18
// monstres, 4 encounters) était jugée trop proche d'un couloir et bien en retrait de la
// densité procédurale historique (~70-80 monstres/ère) — même retour joueur que pour
// ANTIQUITY v1->v2. Reconstruite sur le même principe qu'ANTIQUITY v2 mais avec une approche
// « en couches » plutôt que purement linéaire : la grotte souterraine, le sanctuaire spirituel
// (poches reliées par portails) et la canopée de bambou (lianes) partagent l'empreinte X de
// rooms de surface déjà existantes (même technique que A03B_SLAVE_PIT/ANTIQUITY, superposée à
// A03 sur le même x100-220) plutôt que d'allonger le niveau d'autant. Seule une vraie nouvelle
// salle (M05) est insérée dans la longueur du chemin obligatoire.
// Un seul chemin obligatoire (saut/double-saut/dash uniquement, jamais de grimpe/levier/
// téléporteur sur la route du boss — la démo IA ne grimpe jamais aux lianes, n'actionne jamais
// délibérément un levier/manivelle et ne vise jamais un `localPortals`, cf. exploration de
// demoai.js avant le premier plan de cette carte) : M01 forêt sacrée -> M02 rivière (+ SEC
// grotte souterraine à 5 zones) -> M03 carrefour des torii (+ SEC sanctuaire spirituel à 4
// poches, dont une horde à 10 ennemis simultanés) -> M04 pont suspendu (+ SEC canopée de bambou
// à 3 lianes) -> M05 gauntlet du sanctuaire (nouveau) -> M06 cour du sanctuaire (safe) -> M07
// terrasse de l'oni (élite, 3 vagues) -> M08 escaliers sacrés (+ embuscade sur le palier) ->
// arène du Seigneur Yōkai (art déjà existant, `AR.BOSS_ARENAS.yokai_lord`, inchangée).
// 15 zones de rencontre distinctes (~75 monstres) + spawns libres ambiants (~10) = ~85 au total.
const MEDIEVAL = {
  id: 'medieval',
  // arenaStartTx + 34 : même marge que STONE/ANTIQUITY, pour que la largeur pleine vue (VIEW_W
  // = 1280px = ~27 tuiles) de l'arène du boss reste entièrement dans la grille. En dessous de ça,
  // `solidAt` traite tout ce qui dépasse `tilesW` comme un mur plein, ce qui corrompt la
  // collision des plateformes d'arène situées le plus à droite (ex. right_lower/right_upper).
  tilesW: 419,
  worldH: 32,
  spawnX: 3,
  startRoom: 'M01_SACRED_FOREST',
  bossArenaRoom: 'M09_YOKAI_ARENA',
  arenaStartTx: 385,
  gateTx: 386,
  arenaGy: 9,
  fallDamageRatio: 0.10,

  // ---- terrain solide ----
  solids: [
    { x: 0, y: 22, w: 44, h: 10 },          // M01 forêt sacrée : plateau d'arrivée

    // M02 rivière : 4 pierres de gué séparées par des sauts simples (3 tuiles). Les deux trous
    // du milieu (x58-61 et x66-69) mènent tous deux à SEC_MEDIEVAL_GROTTO (cf. `empties` plus
    // bas) ; seul le premier trou (x50-53) reste une vraie chute jusqu'au bas du monde.
    { x: 45, y: 22, w: 5, h: 10 },
    { x: 53, y: 22, w: 5, h: 10 },
    { x: 61, y: 22, w: 5, h: 10 },
    { x: 69, y: 22, w: 5, h: 10 },
    // Plancher de la grotte sous l'entrée : contrairement aux pierres de gué (colonnes pleines
    // isolées), les trous entre elles n'ont NATURELLEMENT aucun sol — cette dalle ajoute un vrai
    // plancher (y31, une chute de 9 tuiles depuis le trou x58-61, façon caverne) et se prolonge
    // jusqu'à x86 pour rejoindre en continu le plancher préservé de la grande cavité creusée
    // plus loin (cf. `empties`), sans avoir besoin d'un raccord séparé.
    { x: 56, y: 31, w: 30, h: 1 },
    { x: 77, y: 21, w: 53, h: 11 },         // rive lointaine -> M03 carrefour des torii (x77-130)

    { x: 130, y: 21, w: 14, h: 2 },         // amorce sous le pont (cf. oneWay BRIDGE_MAIN par-dessus)
    // Bouchon souterrain sous le pont (x130-144) : la surface n'a qu'une fine amorce (y21-23,
    // au-dessus), en dessous c'est naturellement vide jusqu'ici — comblé en roche pleine pour que
    // la grande cavité de SEC_MEDIEVAL_GROTTO (cf. `empties`) puisse la traverser sans un trou.
    { x: 130, y: 23, w: 14, h: 9 },
    { x: 144, y: 21, w: 52, h: 11 },        // M04 bosquet de bambou (embuscade) x144-196

    // remontée vers M05 (x196-202, y21->19)
    { x: 196, y: 20, w: 3, h: 12 }, { x: 199, y: 19, w: 3, h: 13 },

    { x: 202, y: 19, w: 28, h: 13 },        // M05 gauntlet du sanctuaire (nouveau) x202-230
    { x: 230, y: 19, w: 40, h: 13 },        // M06 cour du sanctuaire (safe) x230-270

    { x: 268, y: 18, w: 2, h: 1 },          // petite marche vers la terrasse
    { x: 270, y: 18, w: 50, h: 14 },        // M07 terrasse de l'oni x270-320

    // M08 escaliers sacrés : 4 marches (y17->14), un palier plat (embuscade), puis 5 marches
    // de plus (y13->9).
    { x: 320, y: 17, w: 3, h: 15 }, { x: 323, y: 16, w: 3, h: 16 },
    { x: 326, y: 15, w: 3, h: 17 }, { x: 329, y: 14, w: 3, h: 18 },
    { x: 332, y: 14, w: 10, h: 18 },        // palier plat : E_MEDIEVAL_STAIRS_AMBUSH
    { x: 342, y: 13, w: 3, h: 19 }, { x: 345, y: 12, w: 3, h: 20 },
    { x: 348, y: 11, w: 3, h: 21 }, { x: 351, y: 10, w: 3, h: 22 },
    { x: 354, y: 9, w: 3, h: 23 },

    { x: 357, y: 9, w: 28, h: 23 },         // antichambre (aucun ennemi, respawn sûr avant la porte)
    // M09 sol d'arène : filet de sécurité seulement (le sol réel vient de l'image d'arène,
    // AR.BOSS_ARENAS.yokai_lord, ground_main ~tuile 10.5) — doit rester SOUS ce sol visuel,
    // sinon `solidAt` (grille, testé avant les plateformes d'arène dans `moveRect`) intercepte
    // la chute trop tôt et le héros marche en l'air bien au-dessus du sol dessiné. Même
    // convention que STONE (y:23) et ANTIQUITY (y:22), pas la hauteur de l'antichambre (y:9).
    { x: 385, y: 23, w: 34, h: 9 },
  ],

  // ---- creusements ----
  empties: [
    // SEC_MEDIEVAL_GROTTO : une seule grande cavité creusée sous M03/le bouchon sous le pont/
    // M04, croûte de surface et plancher (y31) préservés — même technique que le Quartier des
    // Esclaves/A03B_SLAVE_PIT (ANTIQUITY). Les 4 zones de combat souterraines (garde d'entrée,
    // gauntlet, embuscade au plafond, passage inondé, coffre-fort) se succèdent le long de
    // cette même cavité plutôt que dans des salles séparées par des murs, comme SEC_STONE_04.
    // Part de x53 (pas x86) : les piliers des pierres de gué 2/3 (x53-58/x61-66, solides sur
    // toute leur hauteur y22-32, cf. `solids`) plongeaient jusqu'au plancher de la grotte sans
    // être creusés, découpant la cavité en poches encastrées — un joueur tombé par le trou
    // x66-69 se retrouvait emmuré des deux côtés au fond, sans issue, et le coffre du garde
    // d'entrée (x64,y31) se logeait dans la roche du pilier 3 plutôt qu'à l'air libre (retour
    // joueur, capture à l'appui). Creusé aussi à cette profondeur (y24-30) pour que toute la
    // zone d'entrée soit une seule caverne continue ; la partie haute des piliers (y22-23,
    // le vrai jeu de saut entre pierres de gué en surface) reste inchangée.
    { x: 53, y: 24, w: 133, h: 7 },
  ],

  // ---- plateformes traversables (one-way) ----
  oneWay: [
    { x: 130, y: 21, w: 14, id: 'BRIDGE_MAIN' },              // pont suspendu principal (14 tuiles)
    { x: 150, y: 16, w: 4, id: 'TENGU_PERCH_1' },             // couverture d'archers tengu
    { x: 180, y: 15, w: 4, id: 'TENGU_PERCH_2' },
    { x: 290, y: 14, w: 8, id: 'ONI_BALCONY' },               // balcon de la terrasse de l'oni
    { x: 206, y: 15, w: 6, id: 'SHRINE_LEDGE_1' },            // M05 : verticalité du gauntlet
    { x: 220, y: 13, w: 6, id: 'SHRINE_LEDGE_2' },

    // SEC_MEDIEVAL_SPIRIT : accès caché (marches vers la corniche, humain uniquement — la démo
    // IA ne grimpe/ne vise jamais un `localPortals`, cf. en-tête) puis 4 poches reliées par une
    // chaîne de portails à sens unique : relais -> combat -> horde (10 ennemis d'un coup) ->
    // mini-boss + coffre garanti.
    { x: 100, y: 18, w: 3, id: 'SPIRIT_STEP_1' },
    { x: 104, y: 15, w: 3, id: 'SPIRIT_STEP_2' },
    { x: 108, y: 12, w: 4, id: 'SPIRIT_ENTRY_LEDGE' },
    { x: 94, y: 8, w: 10, id: 'SPIRIT_POCKET_A' },            // poche 1 : simple relais
    { x: 118, y: 6, w: 16, id: 'SPIRIT_POCKET_B' },           // poche 2 : combat
    { x: 140, y: 4, w: 22, id: 'SPIRIT_POCKET_C' },           // poche 3 : horde qui déferle
    { x: 168, y: 2, w: 14, id: 'SPIRIT_POCKET_D' },           // poche 4 : mini-boss + coffre garanti

    // SEC_MEDIEVAL_GROTTO : passage inondé (zone 10), plateformes étroites sous tir.
    { x: 146, y: 28, w: 6, id: 'GROTTO_FLOODED_1' },
    { x: 156, y: 27, w: 6, id: 'GROTTO_FLOODED_2' },

    // SEC_MEDIEVAL_CANOPY : plateforme continue au sommet des 3 lianes (cf. `climbables`).
    { x: 145, y: 10, w: 42, id: 'CANOPY_WALK' },
  ],

  // ---- lianes grimpables (SEC_MEDIEVAL_CANOPY, humain uniquement) ----
  climbables: [
    // Le haut de la liane doit dépasser nettement la plateforme visée (y:10) : `climbableAt`
    // n'est interrogé qu'au CENTRE du héros (`player.js`), donc l'escalade s'arrête dès que ce
    // centre franchit `y` — avec `y:10` pile au niveau de la plateforme, les pieds du héros
    // restaient encore ~31px (0,65 tuile) en dessous au moment où l'escalade coupait, jamais
    // assez haut pour retomber dessus. Remonté de 4 tuiles au-dessus de la plateforme par
    // précaution (bas inchangé à y:21, au niveau du plancher du pont).
    { id: 'CLIMB_MEDIEVAL_01', x: 148, y: 6, w: 2, h: 15, exitY: 12 },
    { id: 'CLIMB_MEDIEVAL_02', x: 165, y: 6, w: 2, h: 15, exitY: 12 },
    { id: 'CLIMB_MEDIEVAL_03', x: 182, y: 6, w: 2, h: 15, exitY: 12 },
  ],

  breakables: [],
  interactables: [],

  // ---- rooms (unités de pacing/caméra/respawn) ----
  rooms: [
    // Les rooms secrètes qui partagent l'empreinte X d'une room de surface doivent précéder
    // cette dernière dans le tableau : currentRoomAt() retient le premier rect qui contient le
    // point (même règle déjà appliquée à SEC_STONE_05_BRIDGE_FALL/STONE et à la v1 de cette
    // carte). Les rects de grotte/sanctuaire restent bornés à leur bande y propre (grotte
    // y23-32, sanctuaire y0-14) pour ne jamais capter un point sur le chemin de surface normal.
    { id: 'SEC_MEDIEVAL_GROTTO', rect: { x: 50, y: 23, w: 140, h: 9 }, tags: ['secret', 'cave', 'dark'],
      camera: { minX: 50, maxX: 190, minY: 16, maxY: 32 }, safeRespawn: [{ x: 60, y: 31, priority: 9 }] },
    { id: 'M01_SACRED_FOREST', rect: { x: 0, y: 16, w: 44, h: 16 }, tags: ['start'],
      camera: { minX: 0, maxX: 46, minY: 12, maxY: 32 }, safeRespawn: [{ x: 3, y: 22, priority: 10 }] },
    { id: 'M02_RIVER_PATH', rect: { x: 42, y: 14, w: 38, h: 18 }, tags: ['branch'],
      camera: { minX: 40, maxX: 80, minY: 10, maxY: 32 }, safeRespawn: [{ x: 45, y: 22, priority: 6 }] },
    { id: 'SEC_MEDIEVAL_SPIRIT', rect: { x: 86, y: 0, w: 100, h: 14 }, tags: ['secret', 'spirit'],
      camera: { minX: 86, maxX: 186, minY: 0, maxY: 16 }, safeRespawn: [{ x: 98, y: 8, priority: 9 }] },
    { id: 'M03_TORII_CROSSROADS', rect: { x: 77, y: 12, w: 53, h: 20 }, tags: ['hub'],
      camera: { minX: 75, maxX: 132, minY: 8, maxY: 32 }, safeRespawn: [{ x: 85, y: 21, priority: 8 }] },
    { id: 'SEC_MEDIEVAL_CANOPY', rect: { x: 140, y: 8, w: 52, h: 13 }, tags: ['secret', 'canopy'],
      camera: { minX: 140, maxX: 192, minY: 4, maxY: 21 }, safeRespawn: [{ x: 148, y: 12, priority: 9 }] },
    { id: 'M04_PHYSICAL_BRIDGES', rect: { x: 130, y: 8, w: 66, h: 24 }, tags: ['bridge'],
      camera: { minX: 128, maxX: 200, minY: 4, maxY: 32 }, safeRespawn: [{ x: 146, y: 21, priority: 7 }] },
    { id: 'M05_SHRINE_GAUNTLET', rect: { x: 202, y: 8, w: 28, h: 24 }, tags: ['tension'],
      camera: { minX: 200, maxX: 230, minY: 4, maxY: 32 }, safeRespawn: [{ x: 206, y: 19, priority: 7 }] },
    { id: 'M06_SHRINE_COURT', rect: { x: 230, y: 15, w: 40, h: 17 }, tags: ['safe', 'no_enemy', 'merchant'],
      camera: { minX: 228, maxX: 270, minY: 11, maxY: 32 }, safeRespawn: [{ x: 242, y: 19, priority: 10 }] },
    { id: 'M07_ONI_TERRACE', rect: { x: 270, y: 10, w: 50, h: 22 }, tags: ['tension'],
      camera: { minX: 268, maxX: 320, minY: 6, maxY: 32 }, safeRespawn: [{ x: 278, y: 18, priority: 7 }] },
    { id: 'M08_SHRINE_STAIRS', rect: { x: 320, y: 6, w: 65, h: 26 }, tags: ['ascent'],
      camera: { minX: 318, maxX: 385, minY: 2, maxY: 32 }, safeRespawn: [{ x: 360, y: 9, priority: 8 }] },
    { id: 'M09_YOKAI_ARENA', rect: { x: 385, y: 6, w: 34, h: 26 }, tags: ['boss'],
      camera: { minX: 385, maxX: 419, minY: 2, maxY: 32 }, safeRespawn: [{ x: 389, y: 9, priority: 10 }] },
  ],

  // ---- encounters verrouillés (gates:[] partout — retour joueur du 2026-07-27 : pas de
  // barrière physique, ça enferme l'IA de démo sans raison ; cf. TODO.md) ----
  encounters: [
    // --- chemin obligatoire ---
    { id: 'E_MEDIEVAL_FOREST', roomId: 'M01_SACRED_FOREST',
      trigger: { x: 12, y: 18, w: 20, h: 6 }, gates: [],
      waves: [{ ids: ['ronin', 'ronin', 'tengu_archer'] }],
      reward: { coins: 10 } },
    { id: 'E_MEDIEVAL_CROSSROADS', roomId: 'M03_TORII_CROSSROADS',
      trigger: { x: 95, y: 14, w: 20, h: 7 }, gates: [],
      waves: [{ ids: ['ronin', 'spirit_caster', 'ninja_assassin'] }, { ids: ['medieval_bamboo_stalker', 'tengu_archer', 'ronin'] }],
      reward: { coins: 16 } },
    { id: 'E_MEDIEVAL_BRIDGE', roomId: 'M04_PHYSICAL_BRIDGES',
      trigger: { x: 150, y: 14, w: 30, h: 8 }, gates: [],
      waves: [{ ids: ['medieval_bamboo_stalker', 'medieval_bamboo_stalker', 'tengu_archer'] }, { ids: ['tengu_archer', 'ninja_assassin', 'medieval_bamboo_stalker'] }],
      reward: { coins: 18 } },
    { id: 'E_MEDIEVAL_SHRINE_GAUNTLET', roomId: 'M05_SHRINE_GAUNTLET',
      trigger: { x: 206, y: 10, w: 20, h: 10 }, gates: [],
      waves: [{ ids: ['ronin', 'ronin', 'tengu_archer'] }, { ids: ['ninja_assassin', 'medieval_bamboo_stalker', 'ronin'] }],
      reward: { coins: 18 } },
    { id: 'E_MEDIEVAL_ELITE', roomId: 'M07_ONI_TERRACE',
      trigger: { x: 276, y: 10, w: 30, h: 8 }, gates: [],
      waves: [{ ids: ['ronin', 'ronin', 'tengu_archer'] },
              { ids: ['ninja_assassin', 'ninja_assassin', 'medieval_bamboo_stalker'] },
              { ids: ['oni_brute', 'lantern_wisp', 'lantern_wisp'], elite: ['oni_brute'] }],
      reward: { coins: 30 } },
    { id: 'E_MEDIEVAL_STAIRS_AMBUSH', roomId: 'M08_SHRINE_STAIRS',
      trigger: { x: 333, y: 8, w: 8, h: 6 }, gates: [],
      waves: [{ ids: ['ninja_assassin', 'ninja_assassin', 'tengu_archer', 'tengu_archer'] }],
      reward: { coins: 14 } },

    // --- SEC_MEDIEVAL_GROTTO : garde d'entrée (mini-boss) -> gauntlet -> (embuscade au
    // plafond, cf. `spawns`/`triggers`) -> passage inondé -> coffre-fort ---
    { id: 'E_SEC_GROTTO_GUARDIAN', roomId: 'SEC_MEDIEVAL_GROTTO',
      trigger: { x: 58, y: 26, w: 14, h: 6 }, gates: [],
      waves: [{ ids: ['ninja_assassin'], elite: ['ninja_assassin'] }],
      reward: { coins: 20 } },
    { id: 'E_SEC_GROTTO_GAUNTLET', roomId: 'SEC_MEDIEVAL_GROTTO',
      trigger: { x: 92, y: 24, w: 16, h: 7 }, gates: [],
      waves: [{ ids: ['medieval_bamboo_stalker', 'medieval_bamboo_stalker', 'spirit_caster', 'ronin', 'tengu_archer'] }],
      reward: { coins: 18 } },
    { id: 'E_SEC_GROTTO_FLOODED', roomId: 'SEC_MEDIEVAL_GROTTO',
      trigger: { x: 144, y: 24, w: 18, h: 7 }, gates: [],
      waves: [{ ids: ['spirit_caster', 'lantern_wisp', 'medieval_bamboo_stalker', 'medieval_bamboo_stalker'] }],
      reward: { coins: 16 } },
    { id: 'E_SEC_GROTTO_VAULT', roomId: 'SEC_MEDIEVAL_GROTTO',
      trigger: { x: 168, y: 24, w: 16, h: 7 }, gates: [],
      waves: [{ ids: ['ninja_assassin', 'ninja_assassin', 'medieval_bamboo_stalker', 'medieval_bamboo_stalker', 'ronin'] }],
      reward: { coins: 22 } },

    // --- SEC_MEDIEVAL_SPIRIT : combat -> horde (10 ennemis simultanés, mêlée pareuse de
    // flèches + casters volants qui submergent) -> mini-boss + coffre garanti ---
    { id: 'E_SEC_SPIRIT_B', roomId: 'SEC_MEDIEVAL_SPIRIT',
      trigger: { x: 118, y: 3, w: 16, h: 5 }, gates: [],
      waves: [{ ids: ['spirit_caster', 'spirit_caster', 'lantern_wisp', 'lantern_wisp', 'lantern_wisp'] }],
      reward: { coins: 18 } },
    { id: 'E_SEC_SPIRIT_SWARM', roomId: 'SEC_MEDIEVAL_SPIRIT',
      trigger: { x: 140, y: 1, w: 22, h: 5 }, gates: [],
      waves: [{ ids: ['lantern_wisp', 'lantern_wisp', 'lantern_wisp', 'lantern_wisp', 'lantern_wisp',
                       'spirit_caster', 'spirit_caster', 'spirit_caster', 'ninja_assassin', 'ninja_assassin'] }],
      reward: { coins: 30 } },
    { id: 'E_SEC_SPIRIT_ELDER', roomId: 'SEC_MEDIEVAL_SPIRIT',
      trigger: { x: 168, y: 0, w: 14, h: 4 }, gates: [],
      waves: [{ ids: ['spirit_caster'], elite: ['spirit_caster'] }],
      reward: { coins: 20 } },

    // --- SEC_MEDIEVAL_CANOPY : embuscade avant le coffre perché ---
    { id: 'E_SEC_CANOPY', roomId: 'SEC_MEDIEVAL_CANOPY',
      trigger: { x: 150, y: 5, w: 35, h: 6 }, gates: [],
      waves: [{ ids: ['medieval_bamboo_stalker', 'medieval_bamboo_stalker', 'medieval_bamboo_stalker', 'tengu_archer', 'tengu_archer'] }],
      reward: { coins: 20 } },
  ],

  // ---- déclencheurs de scène ----
  triggers: [
    // SEC_MEDIEVAL_GROTTO, zone 9 : embuscade au plafond (feux-follets accrochés à la roche,
    // même mécanisme que BATS_WAKE/SEC04_STALKERS_WAKE dans STONE) entre le gauntlet et le
    // passage inondé.
    { id: 'GROTTO_CEILING_WAKE', rect: { x: 116, y: 24, w: 20, h: 5 }, action: 'wakeSpawns', group: 'grotto_ceiling' },
  ],

  // ---- ennemis libres (hors encounters) ----
  spawns: [
    // SEC_MEDIEVAL_GROTTO, zone 9 : 4 feux-follets suspendus au plafond, réveillés par
    // GROTTO_CEILING_WAKE ci-dessus (cf. `suspended`/`activate`, même patron que STONE).
    { tx: 121, ty: 24, id: 'lantern_wisp', suspended: true, activate: 'grotto_ceiling' },
    { tx: 125, ty: 24, id: 'lantern_wisp', suspended: true, activate: 'grotto_ceiling' },
    { tx: 129, ty: 24, id: 'lantern_wisp', suspended: true, activate: 'grotto_ceiling' },
    { tx: 133, ty: 24, id: 'lantern_wisp', suspended: true, activate: 'grotto_ceiling' },

    // ambiants (hors zones de rencontre verrouillées)
    { tx: 36, ty: 22, id: 'ronin' },                                 // lisière de la forêt
    { tx: 82, ty: 21, id: 'tengu_archer' },                          // rive lointaine de la rivière
    { tx: 100, ty: 31, id: 'medieval_bamboo_stalker' },              // couloir de la grotte
    { tx: 150, ty: 16, id: 'tengu_archer', onPlatform: true },       // TENGU_PERCH_1
    { tx: 180, ty: 15, id: 'tengu_archer', onPlatform: true },       // TENGU_PERCH_2
    { tx: 150, ty: 21, id: 'medieval_bamboo_stalker' },              // pied de la canopée
    { tx: 208, ty: 19, id: 'ronin' },                                // lisière du gauntlet M05
    { tx: 290, ty: 14, id: 'tengu_archer', onPlatform: true },       // ONI_BALCONY
    { tx: 310, ty: 18, id: 'tengu_archer' },                         // lisière de la terrasse
    { tx: 316, ty: 18, id: 'ninja_assassin' },                       // pied des marches sacrées
  ],

  // ---- coffres ----
  chests: [
    { x: 30, y: 22 },                                    // forêt
    { x: 64, y: 31, guaranteed: 'skillPoint' },          // SEC_MEDIEVAL_GROTTO : garde d'entrée
    { x: 178, y: 31, guaranteed: 'swordUp' },            // SEC_MEDIEVAL_GROTTO : coffre-fort final
    { x: 124, y: 6, high: true },                        // SEC_MEDIEVAL_SPIRIT : poche 2
    { x: 172, y: 2, high: true, guaranteed: 'skillPoint' }, // SEC_MEDIEVAL_SPIRIT : mini-boss final
    { x: 180, y: 10, high: true },                       // SEC_MEDIEVAL_CANOPY : coffre perché
    { x: 250, y: 19 },                                   // cour du sanctuaire
    { x: 370, y: 9 },                                    // antichambre
  ],

  merchant: { x: 242, y: 19 },

  // ---- portails courts (jamais sur le chemin obligatoire du boss) ----
  localPortals: [
    // SEC_MEDIEVAL_GROTTO : sortie immédiate depuis l'aire d'atterrissage elle-même — quiconque
    // tombe dans le trou x58-61, volontairement ou non, doit pouvoir en ressortir sans dépendre
    // d'une action optionnelle (leçon de la v1 : sans ça, l'IA de démo qui y tombe par accident
    // reste bloquée indéfiniment). Et sortie finale depuis le coffre-fort, plus loin sur le
    // chemin (récompense : on ressort près de M06 plutôt que de revenir en arrière).
    { x: 60, y: 31, returnTo: { x: 90, y: 21 } },
    { x: 180, y: 31, returnTo: { x: 236, y: 19 } },

    // SEC_MEDIEVAL_SPIRIT : chaîne de 5 portails à sens unique le long des 4 poches.
    { x: 110, y: 12, returnTo: { x: 98, y: 8 } },     // corniche cachée -> poche 1 (relais)
    { x: 100, y: 8, returnTo: { x: 124, y: 6 } },     // poche 1 -> poche 2 (combat)
    { x: 132, y: 6, returnTo: { x: 150, y: 4 } },     // poche 2 -> poche 3 (horde)
    { x: 158, y: 4, returnTo: { x: 174, y: 2 } },     // poche 3 -> poche 4 (mini-boss)
    { x: 180, y: 2, returnTo: { x: 112, y: 21 } },    // poche 4 -> retour au carrefour
  ],

  // ---- poches sombres ----
  darkZones: [
    { x: 50, y: 23, w: 140, h: 9, tint: 0.7 },   // SEC_MEDIEVAL_GROTTO
    { x: 86, y: 0, w: 100, h: 16, tint: 0.5 },   // SEC_MEDIEVAL_SPIRIT (brume)
  ],

  // ---- décor ----
  props: [
    { type: 'torii', tx: 20, ty: 22 },
    { type: 'lantern', tx: 48, ty: 22 },
    { type: 'lantern', tx: 72, ty: 22 },
    { type: 'lantern', tx: 60, ty: 31 },      // SEC_MEDIEVAL_GROTTO : entrée
    { type: 'lantern', tx: 100, ty: 31 },     // SEC_MEDIEVAL_GROTTO : gauntlet
    { type: 'lantern', tx: 150, ty: 28 },     // SEC_MEDIEVAL_GROTTO : passage inondé
    { type: 'lantern', tx: 178, ty: 31 },     // SEC_MEDIEVAL_GROTTO : coffre-fort
    { type: 'torii', tx: 95, ty: 21 },
    { type: 'lantern', tx: 98, ty: 8 },       // SEC_MEDIEVAL_SPIRIT poche 1
    { type: 'lantern', tx: 122, ty: 6 },      // SEC_MEDIEVAL_SPIRIT poche 2
    { type: 'lantern', tx: 148, ty: 4 },      // SEC_MEDIEVAL_SPIRIT poche 3
    { type: 'lantern', tx: 172, ty: 2 },      // SEC_MEDIEVAL_SPIRIT poche 4
    { type: 'lantern', tx: 145, ty: 21 },
    { type: 'lantern', tx: 160, ty: 10 },     // SEC_MEDIEVAL_CANOPY
    { type: 'lantern', tx: 190, ty: 21 },
    { type: 'shrine', tx: 210, ty: 19 },      // M05
    { type: 'sakura', tx: 238, ty: 19 },
    { type: 'shrine', tx: 250, ty: 19 },
    { type: 'sakura', tx: 263, ty: 19 },
    { type: 'lantern', tx: 283, ty: 18 },
    { type: 'lantern', tx: 313, ty: 18 },
    { type: 'lantern', tx: 328, ty: 17 },
    { type: 'lantern', tx: 345, ty: 12 },
    { type: 'shrine', tx: 365, ty: 9 },
    { type: 'torii', tx: 375, ty: 9 },
  ],

  // ---- indices pour l'IA de démonstration (documentation seule, cf. en-tête : demoai.js ne
  // lit aucun de ces champs, la traversée reste purement physique saut/dash/chute) ----
  navHints: {
    defaultRoute: 'main',
    climbs: [
      { id: 'CLIMB_MEDIEVAL_01', x: 149, bottomY: 21, topY: 6, exitX: 152 },
      { id: 'CLIMB_MEDIEVAL_02', x: 166, bottomY: 21, topY: 6, exitX: 169 },
      { id: 'CLIMB_MEDIEVAL_03', x: 183, bottomY: 21, topY: 6, exitX: 186 },
    ],
  },
};

AR.LEVEL_SPECS = {
  stone: STONE,
  antiquity: ANTIQUITY,
  medieval: MEDIEVAL,
  renaissance: null,
  diesel: null,
  cyber: null,
};
