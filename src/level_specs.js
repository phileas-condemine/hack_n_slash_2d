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
    { x: 168, y: 8, w: 14, id: 'SPIRIT_POCKET_D' },           // poche 4 : mini-boss + coffre garanti

    // SEC_MEDIEVAL_GROTTO : passage inondé (zone 10), plateformes étroites sous tir.
    { x: 146, y: 28, w: 6, id: 'GROTTO_FLOODED_1' },
    { x: 156, y: 27, w: 6, id: 'GROTTO_FLOODED_2' },

    // SEC_MEDIEVAL_CANOPY : plateforme continue au sommet des 3 lianes (cf. `climbables`).
    { x: 145, y: 10, w: 42, id: 'CANOPY_WALK' },
  ],

  // ---- lianes grimpables (SEC_MEDIEVAL_CANOPY, humain uniquement) ----
  climbables: [
    // Le haut de la liane doit laisser les PIEDS du héros nettement au-dessus (donc à une valeur
    // de pixel plus petite QUE) la plateforme visée (y:10) une fois l'escalade coupée, pas
    // seulement dépassés de justesse. `climbableAt` n'est interrogé qu'au CENTRE du héros
    // (`player.js`) : avec `y:10` pile au niveau de la plateforme, les pieds restaient ~31px
    // en dessous au moment où l'escalade coupait — jamais assez haut (1er correctif, insuffisant
    // seul). Un 2e correctif (`y:9`, ~17px de marge) s'est aussi révélé insuffisant : en
    // grimpant jusqu'au sommet puis en relâchant « haut » (le héros reste suspendu, cf.
    // ci-dessous), ses pieds étaient déjà TOMBÉS SOUS le niveau de la plateforme pendant qu'il
    // était accroché (l'escalade ignore les collisions normales) — au moment où l'escalade
    // coupait enfin (en sortant sur le côté), `prevBottom` valait déjà plus que la plateforme,
    // et l'accrochage normal en chute (qui exige d'être passé PAR-DESSUS) ne se déclenchait
    // jamais : chute directe au sol, en traversant la plateforme sans s'y poser. Remonté à
    // `y:8` (~65px/1,35 tuile de marge) pour que les pieds restent clairement au-dessus de la
    // plateforme à la coupure, quelle que soit la façon dont l'escalade se termine (bas
    // inchangé à y:21). Relâcher « haut » sans bouger latéralement laisse le héros suspendu
    // (`climbing` ne se coupe qu'en sortant de la zone, jamais juste en relâchant les touches,
    // cf. `player.js`) — un appui sur le saut permet aussi de décrocher à tout moment désormais
    // (cf. correctif dédié dans `player.js`).
    { id: 'CLIMB_MEDIEVAL_01', x: 148, y: 8, w: 2, h: 13, exitY: 12 },
    { id: 'CLIMB_MEDIEVAL_02', x: 165, y: 8, w: 2, h: 13, exitY: 12 },
    { id: 'CLIMB_MEDIEVAL_03', x: 182, y: 8, w: 2, h: 13, exitY: 12 },
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
      trigger: { x: 168, y: 6, w: 14, h: 4 }, gates: [],
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
    { x: 172, y: 8, high: true, guaranteed: 'skillPoint' }, // SEC_MEDIEVAL_SPIRIT : mini-boss final
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
    { x: 158, y: 4, returnTo: { x: 174, y: 8 } },     // poche 3 -> poche 4 (mini-boss)
    { x: 180, y: 8, returnTo: { x: 112, y: 21 } },    // poche 4 -> retour au carrefour
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
    { type: 'lantern', tx: 172, ty: 8 },      // SEC_MEDIEVAL_SPIRIT poche 4
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
      { id: 'CLIMB_MEDIEVAL_01', x: 149, bottomY: 21, topY: 8, exitX: 152 },
      { id: 'CLIMB_MEDIEVAL_02', x: 166, bottomY: 21, topY: 8, exitX: 169 },
      { id: 'CLIMB_MEDIEVAL_03', x: 183, bottomY: 21, topY: 8, exitX: 186 },
    ],
  },
};

// ========================================================= NIVEAU 4 : RENAISSANCE
// « Le Siège de la Cité-Forteresse » — première carte authored de l'ère 4, construite d'emblée
// au format v2 (densité + zones secrètes + mécaniques inédites), cf. TODO.md. L'Ingénieur de
// Guerre (`war_engineer`, boss déjà défini, art d'arène déjà livré) transforme la faille en
// instrument de siège mécanisé ; le joueur traverse un camp de siège de plus en plus mécanisé
// à mesure qu'il approche de son repaire.
// Chemin obligatoire (saut/double-saut/dash uniquement, jamais de grimpe/manivelle/canon sur la
// route du boss, même contrainte que STONE/ANTIQUITY/MEDIEVAL) : R01 camp -> R02 tranchées
// (entrée cachée du Souterrain des Sapeurs) -> R03 gantelet de la barricade -> R04 dépôt (safe/
// marchand) -> R05 porte de la Cité (+ SEC Tour de Siège au-dessus, monte-charge) -> R06 cour
// intérieure -> R07 chantier des machines de siège (élite) -> R08 escaliers du rempart (+ SEC
// Passerelles Hautes en surplomb, échafaudages) -> arène de l'Ingénieur de Guerre.
// Deux mécaniques inédites de cette ère (cf. Level#_kegBlast/hitBreakable, Game#_fireCannon) :
// canon actionnable (`interactables` type 'cannon', casse un mur `requires:'cannon'`) et barils
// de poudre en chaîne (`breakables` type 'keg', non solides, dégâts de zone + chaîne).
// 15 encounters verrouillés + 1 embuscade libre au plafond (même patron que STONE/MEDIEVAL,
// cf. TUNNEL_CEILING_WAKE) + spawns ambiants ≈ 87-89 monstres au total, 5 mini-boss élites.
const RENAISSANCE = {
  id: 'renaissance',
  // arenaStartTx + 34 : même marge que STONE/ANTIQUITY/MEDIEVAL (cf. leurs en-têtes) pour que la
  // largeur pleine vue de l'arène du boss (déjà livrée, AR.BOSS_ARENAS.war_engineer) tienne sans
  // reproduire le bug de bord de grille déjà corrigé sur R3.
  tilesW: 420,
  worldH: 32,
  spawnX: 3,
  startRoom: 'R01_SIEGE_CAMP',
  bossArenaRoom: 'R09_ENGINEER_ARENA',
  arenaStartTx: 386,
  gateTx: 387,
  // Approche élevée (escaliers du rempart, comme les marches sacrées de MEDIEVAL) : arenaGy
  // suit la hauteur de l'antichambre (y9), pas un sol à hauteur normale (cf. commentaire détaillé
  // sur le filet de sécurité dans `solids` plus bas, même convention que MEDIEVAL).
  arenaGy: 9,
  fallDamageRatio: 0.10,

  // ---- terrain solide ----
  solids: [
    { x: 0, y: 22, w: 24, h: 10 },           // R01 camp de siège : plateau d'arrivée

    // R02 lignes de tranchées : sol continu coupé d'une brèche (x62-66, un saut simple la
    // franchit sans y tomber) qui mène, si on choisit de s'y laisser tomber, à l'entrée du
    // Souterrain des Sapeurs (cf. `empties` plus bas) — même technique que le trou de rivière
    // de MEDIEVAL vers SEC_MEDIEVAL_GROTTO.
    { x: 24, y: 22, w: 38, h: 10 },          // x24-62
    { x: 66, y: 22, w: 34, h: 10 },          // x66-100
    // Plancher fin de la brèche + du Souterrain des Sapeurs (x62-150, y31) : referme la chute
    // sur un vrai sol de tunnel au lieu d'un puits sans fond (même patron que MEDIEVAL, y31).
    { x: 62, y: 31, w: 88, h: 1 },

    { x: 100, y: 22, w: 28, h: 10 },         // R03 gantelet de la barricade
    { x: 128, y: 22, w: 30, h: 10 },         // R04 dépôt de vivres (safe/marchand)
    { x: 158, y: 22, w: 70, h: 10 },         // R05 porte de la Cité (+ SEC Tour de Siège au-dessus)
    { x: 228, y: 22, w: 30, h: 10 },         // R06 cour intérieure
    { x: 258, y: 22, w: 66, h: 10 },         // R07 chantier des machines de siège

    // R08 escaliers du rempart : 6 marches (y21->16), un palier plat (embuscade), puis 7 marches
    // de plus (y15->9) — même patron que les marches sacrées de MEDIEVAL (1 tuile/marche, toujours
    // franchissable en un saut simple), juste plus long (le camp part d'un sol y22, pas y18).
    { x: 324, y: 21, w: 3, h: 11 }, { x: 327, y: 20, w: 3, h: 12 },
    { x: 330, y: 19, w: 3, h: 13 }, { x: 333, y: 18, w: 3, h: 14 },
    { x: 336, y: 17, w: 3, h: 15 }, { x: 339, y: 16, w: 3, h: 16 },
    { x: 342, y: 16, w: 12, h: 16 },         // palier plat : E_R_RAMPART_AMBUSH
    { x: 354, y: 15, w: 3, h: 17 }, { x: 357, y: 14, w: 3, h: 18 },
    { x: 360, y: 13, w: 3, h: 19 }, { x: 363, y: 12, w: 3, h: 20 },
    { x: 366, y: 11, w: 3, h: 21 }, { x: 369, y: 10, w: 3, h: 22 },
    { x: 372, y: 9, w: 3, h: 23 },
    { x: 375, y: 9, w: 11, h: 23 },          // antichambre (aucun ennemi, respawn sûr avant la porte)

    // R09 sol d'arène : filet de sécurité seulement (le sol réel vient de l'image d'arène,
    // AR.BOSS_ARENAS.war_engineer, ground_main ~0.75 de la hauteur source) — doit rester SOUS ce
    // sol visuel (sinon `solidAt`, testé avant les plateformes d'arène dans `moveRect`, intercepte
    // la chute trop tôt). Même convention que STONE (y:23)/ANTIQUITY (y:22)/MEDIEVAL (y:23), pas
    // la hauteur de l'antichambre (y:9).
    { x: 386, y: 23, w: 34, h: 9 },
  ],

  // ---- creusements : Souterrain des Sapeurs (cavité sous R02/R03, même technique que le
  // Quartier des Esclaves d'ANTIQUITY / SEC_MEDIEVAL_GROTTO) ----
  empties: [
    { x: 62, y: 24, w: 88, h: 7 },
  ],

  // ---- plateformes traversables (one-way) ----
  oneWay: [
    // Souterrain des Sapeurs : deux corniches étroites dans la salle des barils (zone 11),
    // sous tir, où se trouvent les kegs (cf. `breakables`).
    { x: 116, y: 28, w: 6, id: 'KEGROOM_LEDGE_1' },
    { x: 126, y: 28, w: 6, id: 'KEGROOM_LEDGE_2' },

    // SEC_RENAISSANCE_TOWER : poches flottantes reliées par une chaîne de portails à sens unique
    // (cf. `localPortals`), même patron que SEC_MEDIEVAL_SPIRIT.
    { x: 186, y: 16, w: 14, id: 'TOWER_POCKET_RELAY' },
    { x: 186, y: 9, w: 20, id: 'TOWER_POCKET_SWARM' },
    { x: 186, y: 3, w: 20, id: 'TOWER_POCKET_CAPTAIN' },

    // SEC_RENAISSANCE_CATWALKS : plateforme continue au sommet des 3 échelles (cf. `climbables`).
    { x: 326, y: 9, w: 46, id: 'CATWALK_WALK' },
  ],

  // ---- échelles/cordages grimpables (SEC_RENAISSANCE_CATWALKS, humain uniquement) ----
  climbables: [
    // Même calibration que les lianes de MEDIEVAL (y du sommet = y de la plateforme visée - 2,
    // cf. leur commentaire détaillé) : plateforme à y9, sommet d'échelle à y7.
    { id: 'CLIMB_RENAISSANCE_01', x: 330, y: 7, w: 2, h: 17, exitY: 11 },
    { id: 'CLIMB_RENAISSANCE_02', x: 348, y: 7, w: 2, h: 17, exitY: 11 },
    { id: 'CLIMB_RENAISSANCE_03', x: 366, y: 7, w: 2, h: 17, exitY: 11 },
  ],

  // ---- destructibles : barricade au canon (Souterrain des Sapeurs, zone 12) + barils de
  // poudre en chaîne (zone 11 + décor) ----
  breakables: [
    // Barricade renforcée : `requires:'cannon'` — un coup d'épée/une flèche ne fait rien (cf.
    // `Level#hitBreakable`), seul le canon juste à côté (cf. `interactables`) l'ouvre.
    { id: 'BARRICADE_VAULT', type: 'wall', rect: { x: 136, y: 29, w: 2, h: 3 }, hp: 65, requires: 'cannon' },
    // Salle des barils (zone 11) : 3 kegs sur/entre les corniches étroites, parmi les ennemis.
    // chainR:220 (pas la valeur par défaut 140) : espacés de 4 tuiles/192px pour rester lisibles
    // visuellement sur les 2 corniches, donc plus que le rayon de chaîne par défaut — sinon la
    // chaîne ne se propage jamais d'un baril au suivant (vérifié : sans ce relevé, aucun autre
    // baril ne détonait après le premier).
    { id: 'KEG_ROOM_1', type: 'keg', rect: { x: 118, y: 30, w: 1, h: 1 }, hp: 18, radius: 110, chainR: 220 },
    { id: 'KEG_ROOM_2', type: 'keg', rect: { x: 122, y: 30, w: 1, h: 1 }, hp: 18, radius: 110, chainR: 220 },
    { id: 'KEG_ROOM_3', type: 'keg', rect: { x: 126, y: 30, w: 1, h: 1 }, hp: 18, radius: 110, chainR: 220 },
    // Kegs isolés en décor/utilitaires (pas obligatoires à utiliser).
    { id: 'KEG_GAUNTLET', type: 'keg', rect: { x: 84, y: 30, w: 1, h: 1 }, hp: 18, radius: 110, chainR: 140 },
    { id: 'KEG_WORKSHOP', type: 'keg', rect: { x: 300, y: 21, w: 1, h: 1 }, hp: 18, radius: 110, chainR: 140 },
  ],

  // ---- interactables : canon (ouvre la barricade) + manivelles du monte-charge de la Tour ----
  interactables: [
    { id: 'CANNON_VAULT', type: 'cannon', x: 132, y: 31, dir: 1, prompt: 'Actionner le canon' },
    { id: 'CRANK_TOWER_BOTTOM', type: 'crank', x: 182, y: 22, lift: 'TOWER_LIFT', prompt: 'Actionner la manivelle' },
    { id: 'CRANK_TOWER_TOP', type: 'crank', x: 182, y: 8, lift: 'TOWER_LIFT', prompt: 'Actionner la manivelle' },
  ],

  // ---- monte-charge de la Tour de Siège ----
  lifts: [
    { id: 'TOWER_LIFT', x: 182, w: 4, bottomY: 22, topY: 8, startY: 22, speed: 2.8 },
  ],

  // ---- rooms (les rooms secrètes précèdent la room de surface dont elles partagent
  // l'empreinte X — currentRoomAt() retient le premier rect qui contient le point) ----
  rooms: [
    { id: 'SEC_RENAISSANCE_TUNNELS', rect: { x: 62, y: 24, w: 88, h: 8 }, tags: ['secret', 'tunnel', 'dark'],
      camera: { minX: 60, maxX: 152, minY: 18, maxY: 32 }, safeRespawn: [{ x: 66, y: 31, priority: 9 }, { x: 120, y: 31, priority: 7 }] },
    { id: 'R01_SIEGE_CAMP', rect: { x: 0, y: 16, w: 24, h: 16 }, tags: ['start'],
      camera: { minX: 0, maxX: 26, minY: 12, maxY: 32 }, safeRespawn: [{ x: 3, y: 22, priority: 10 }] },
    { id: 'R02_TRENCH_HUB', rect: { x: 24, y: 14, w: 76, h: 18 }, tags: ['hub'],
      camera: { minX: 24, maxX: 100, minY: 10, maxY: 32 }, safeRespawn: [{ x: 30, y: 22, priority: 8 }, { x: 80, y: 22, priority: 6 }] },
    { id: 'R03_BARRICADE_GAUNTLET', rect: { x: 100, y: 14, w: 28, h: 18 }, tags: ['tension'],
      camera: { minX: 98, maxX: 128, minY: 10, maxY: 32 }, safeRespawn: [{ x: 112, y: 22, priority: 7 }] },
    { id: 'R04_SUPPLY_DEPOT', rect: { x: 128, y: 14, w: 30, h: 18 }, tags: ['safe', 'no_enemy', 'merchant'],
      camera: { minX: 126, maxX: 158, minY: 10, maxY: 32 }, safeRespawn: [{ x: 140, y: 22, priority: 10 }] },
    // h:21 (pas 24) : reste strictement AU-DESSUS du sol principal (y22, partagé avec R05) — sinon
    // currentRoomAt() (borne haute inclusive) classerait à tort le chemin obligatoire du sol comme
    // étant "dans" la tour secrète (vérifié via un passage démo IA : sans ce recadrage, le joueur
    // qui marche normalement sous la tour était étiqueté SEC_RENAISSANCE_TOWER).
    { id: 'SEC_RENAISSANCE_TOWER', rect: { x: 178, y: 0, w: 40, h: 21 }, tags: ['secret', 'tower'],
      camera: { minX: 176, maxX: 220, minY: 0, maxY: 26 }, safeRespawn: [{ x: 182, y: 16, priority: 9 }] },
    { id: 'R05_CITY_GATE', rect: { x: 158, y: 14, w: 70, h: 18 }, tags: ['tension'],
      camera: { minX: 156, maxX: 228, minY: 10, maxY: 32 }, safeRespawn: [{ x: 165, y: 22, priority: 7 }, { x: 215, y: 22, priority: 8 }] },
    { id: 'R06_INNER_COURTYARD', rect: { x: 228, y: 14, w: 30, h: 18 }, tags: ['convergence'],
      camera: { minX: 226, maxX: 258, minY: 10, maxY: 32 }, safeRespawn: [{ x: 240, y: 22, priority: 8 }] },
    { id: 'R07_SIEGE_WORKSHOP', rect: { x: 258, y: 14, w: 66, h: 18 }, tags: ['tension'],
      camera: { minX: 256, maxX: 324, minY: 10, maxY: 32 }, safeRespawn: [{ x: 270, y: 22, priority: 7 }, { x: 310, y: 22, priority: 7 }] },
    // Borné à x324-372/y2-15 (pas toute la largeur/hauteur des échelles) : reste au-dessus du
    // palier d'embuscade obligatoire (y16) et à l'écart de l'antichambre (x375-386) — même
    // correctif que SEC_RENAISSANCE_TOWER, vérifié via la même passe démo IA.
    { id: 'SEC_RENAISSANCE_CATWALKS', rect: { x: 324, y: 2, w: 48, h: 13 }, tags: ['secret', 'catwalk'],
      camera: { minX: 322, maxX: 386, minY: 0, maxY: 28 }, safeRespawn: [{ x: 340, y: 9, priority: 9 }] },
    { id: 'R08_RAMPART_STAIRS', rect: { x: 324, y: 2, w: 62, h: 30 }, tags: ['ascent'],
      camera: { minX: 322, maxX: 386, minY: 0, maxY: 32 }, safeRespawn: [{ x: 375, y: 9, priority: 8 }] },
    { id: 'R09_ENGINEER_ARENA', rect: { x: 386, y: 2, w: 34, h: 30 }, tags: ['boss'],
      camera: { minX: 386, maxX: 420, minY: 0, maxY: 32 }, safeRespawn: [{ x: 390, y: 9, priority: 10 }] },
  ],

  // ---- encounters verrouillés (gates:[] partout — pas de barrière physique, cf. MEDIEVAL) ----
  encounters: [
    // --- chemin obligatoire ---
    { id: 'E_R_CAMP_INTRO', roomId: 'R01_SIEGE_CAMP',
      trigger: { x: 8, y: 18, w: 16, h: 6 }, gates: [],
      waves: [{ ids: ['pikeman', 'pikeman', 'musketeer'] }],
      reward: { coins: 10 } },
    { id: 'E_R_TRENCH_LOW', roomId: 'R02_TRENCH_HUB',
      trigger: { x: 40, y: 18, w: 20, h: 6 }, gates: [],
      waves: [{ ids: ['pikeman', 'pikeman', 'musketeer'] }, { ids: ['bombardier', 'musketeer', 'pikeman'] }],
      reward: { coins: 16 } },
    { id: 'E_R_TRENCH_HIGH', roomId: 'R02_TRENCH_HUB',
      trigger: { x: 78, y: 18, w: 16, h: 6 }, gates: [],
      waves: [{ ids: ['musketeer', 'musketeer', 'bombardier'] }],
      reward: { coins: 12 } },
    { id: 'E_R_BARRICADE_GAUNTLET', roomId: 'R03_BARRICADE_GAUNTLET',
      trigger: { x: 106, y: 18, w: 16, h: 6 }, gates: [],
      waves: [{ ids: ['pikeman', 'pikeman', 'musketeer'] }, { ids: ['bombardier', 'mortar_crew', 'pikeman'] }],
      reward: { coins: 18 } },
    { id: 'E_R_GATE_SIEGE', roomId: 'R05_CITY_GATE',
      trigger: { x: 170, y: 18, w: 50, h: 6 }, gates: [],
      waves: [{ ids: ['pikeman', 'pikeman', 'musketeer'] },
              { ids: ['musketeer', 'musketeer', 'bombardier'] },
              { ids: ['armored_captain', 'gear_servitor', 'gear_servitor'], elite: ['armored_captain'] }],
      reward: { coins: 35 } },
    { id: 'E_R_WORKSHOP_ELITE', roomId: 'R07_SIEGE_WORKSHOP',
      trigger: { x: 270, y: 18, w: 40, h: 6 }, gates: [],
      waves: [{ ids: ['gear_servitor', 'gear_servitor', 'pikeman'] },
              { ids: ['musketeer', 'musketeer', 'mortar_crew'] },
              { ids: ['armored_captain', 'bombardier', 'bombardier'], elite: ['armored_captain'] }],
      reward: { coins: 35 } },
    { id: 'E_R_RAMPART_AMBUSH', roomId: 'R08_RAMPART_STAIRS',
      trigger: { x: 342, y: 10, w: 12, h: 8 }, gates: [],
      waves: [{ ids: ['musketeer', 'musketeer', 'gear_servitor', 'gear_servitor'] }],
      reward: { coins: 16 } },

    // --- Souterrain des Sapeurs : garde d'entrée (mini-boss) -> gantelet -> (embuscade au
    // plafond, cf. `spawns`/`triggers`, pas un encounter formel — même patron que MEDIEVAL) ->
    // salle des barils -> chambre-forte (barricade au canon) ---
    { id: 'E_SEC_R_TUNNEL_GUARD', roomId: 'SEC_RENAISSANCE_TUNNELS',
      trigger: { x: 66, y: 28, w: 10, h: 4 }, gates: [],
      waves: [{ ids: ['armored_captain'], elite: ['armored_captain'] }],
      reward: { coins: 22 } },
    { id: 'E_SEC_R_TUNNEL_GAUNTLET', roomId: 'SEC_RENAISSANCE_TUNNELS',
      trigger: { x: 80, y: 28, w: 14, h: 4 }, gates: [],
      waves: [{ ids: ['pikeman', 'pikeman', 'musketeer', 'powder_saboteur', 'bombardier'] }],
      reward: { coins: 18 } },
    { id: 'E_SEC_R_TUNNEL_KEGROOM', roomId: 'SEC_RENAISSANCE_TUNNELS',
      trigger: { x: 114, y: 28, w: 16, h: 4 }, gates: [],
      waves: [{ ids: ['musketeer', 'musketeer', 'mortar_crew', 'powder_saboteur'] }],
      reward: { coins: 18 } },
    { id: 'E_SEC_R_TUNNEL_VAULT', roomId: 'SEC_RENAISSANCE_TUNNELS',
      trigger: { x: 138, y: 28, w: 12, h: 4 }, gates: [],
      waves: [{ ids: ['gear_servitor', 'gear_servitor', 'armored_captain'], elite: ['armored_captain'] }],
      reward: { coins: 26 } },

    // --- Tour de Siège : relais -> horde qui déferle (10 ennemis simultanés) -> capitaine ---
    { id: 'E_SEC_R_TOWER_RELAY', roomId: 'SEC_RENAISSANCE_TOWER',
      trigger: { x: 186, y: 14, w: 14, h: 4 }, gates: [],
      waves: [{ ids: ['musketeer', 'musketeer', 'bombardier'] }],
      reward: { coins: 14 } },
    { id: 'E_SEC_R_TOWER_SWARM', roomId: 'SEC_RENAISSANCE_TOWER',
      trigger: { x: 186, y: 7, w: 20, h: 4 }, gates: [],
      waves: [{ ids: ['pikeman', 'pikeman', 'pikeman', 'musketeer', 'musketeer', 'musketeer',
                       'bombardier', 'bombardier', 'powder_saboteur', 'powder_saboteur'] }],
      reward: { coins: 32 } },
    { id: 'E_SEC_R_TOWER_CAPTAIN', roomId: 'SEC_RENAISSANCE_TOWER',
      trigger: { x: 186, y: 1, w: 20, h: 4 }, gates: [],
      waves: [{ ids: ['armored_captain'], elite: ['armored_captain'] }],
      reward: { coins: 24 } },

    // --- Passerelles Hautes : embuscade avant le coffre perché ---
    { id: 'E_SEC_R_CATWALK_LOOKOUT', roomId: 'SEC_RENAISSANCE_CATWALKS',
      trigger: { x: 330, y: 5, w: 40, h: 6 }, gates: [],
      waves: [{ ids: ['musketeer', 'musketeer', 'musketeer', 'powder_saboteur', 'powder_saboteur', 'powder_saboteur'] }],
      reward: { coins: 24 } },
  ],

  // ---- déclencheurs de scène ----
  triggers: [
    // Souterrain des Sapeurs : saboteurs suspendus au plafond, tombent une fois le joueur au
    // centre de la salle (même mécanisme que BATS_WAKE/GROTTO_CEILING_WAKE).
    { id: 'TUNNEL_CEILING_WAKE', rect: { x: 96, y: 24, w: 20, h: 5 }, action: 'wakeSpawns', group: 'tunnel_ceiling' },
  ],

  // ---- ennemis libres (hors encounters) ----
  spawns: [
    // Souterrain des Sapeurs : 4 saboteurs suspendus au plafond (juste sous la croûte, y24, même
    // patron que GROTTO_CEILING_WAKE/MEDIEVAL), réveillés par TUNNEL_CEILING_WAKE.
    { tx: 98, ty: 24, id: 'powder_saboteur', suspended: true, activate: 'tunnel_ceiling' },
    { tx: 102, ty: 24, id: 'powder_saboteur', suspended: true, activate: 'tunnel_ceiling' },
    { tx: 106, ty: 24, id: 'powder_saboteur', suspended: true, activate: 'tunnel_ceiling' },
    { tx: 110, ty: 24, id: 'powder_saboteur', suspended: true, activate: 'tunnel_ceiling' },

    // ambiants (hors zones de rencontre verrouillées)
    { tx: 18, ty: 22, id: 'musketeer' },      // camp
    { tx: 36, ty: 22, id: 'pikeman' },        // tranchées
    { tx: 88, ty: 22, id: 'musketeer' },      // tranchées
    { tx: 118, ty: 22, id: 'pikeman' },       // barricade
    { tx: 200, ty: 22, id: 'pikeman' },       // porte de la Cité
    { tx: 220, ty: 22, id: 'musketeer' },     // porte de la Cité
    { tx: 240, ty: 22, id: 'gear_servitor' }, // cour intérieure
    { tx: 265, ty: 22, id: 'pikeman' },       // chantier
    { tx: 305, ty: 22, id: 'musketeer' },     // chantier
    { tx: 315, ty: 22, id: 'gear_servitor' }, // chantier, lisière des marches
  ],

  // ---- coffres ----
  chests: [
    { x: 14, y: 22 },                                     // camp
    { x: 148, y: 22 },                                    // dépôt
    { x: 240, y: 22 },                                    // cour intérieure
    { x: 74, y: 31, guaranteed: 'skillPoint' },           // Souterrain : garde d'entrée
    { x: 146, y: 31, guaranteed: 'swordUp' },             // Souterrain : chambre-forte finale
    { x: 198, y: 3, guaranteed: 'skillPoint' },           // Tour de Siège : capitaine
    { x: 368, y: 9, high: true },                         // Passerelles Hautes
    { x: 380, y: 9 },                                     // antichambre
  ],

  merchant: { x: 140, y: 22 },

  // ---- portails courts (jamais sur le chemin obligatoire du boss) ----
  localPortals: [
    // Souterrain des Sapeurs : sortie immédiate depuis l'aire d'atterrissage (quiconque tombe
    // dans la brèche, volontairement ou non, doit pouvoir en ressortir sans dépendre d'une
    // action optionnelle — même leçon que MEDIEVAL). Sortie finale depuis la chambre-forte, plus
    // loin (récompense : on ressort près de R06 plutôt que de revenir en arrière).
    { x: 64, y: 31, returnTo: { x: 90, y: 22 } },
    { x: 146, y: 31, returnTo: { x: 230, y: 22 } },

    // Tour de Siège : chaîne de portails à sens unique le long des 3 poches. Le premier part de
    // l'emprise du monte-charge lui-même (x182-186) au sommet (topY:8) : il devient un palier
    // normal (`this.platforms`) une fois arrêté là, pas besoin d'une plateforme séparée.
    { x: 184, y: 8, returnTo: { x: 190, y: 16 } },   // sommet du monte-charge -> poche relais
    { x: 198, y: 16, returnTo: { x: 195, y: 9 } },   // relais -> poche horde
    { x: 204, y: 9, returnTo: { x: 195, y: 3 } },    // horde -> poche capitaine
    { x: 200, y: 3, returnTo: { x: 230, y: 22 } },   // capitaine -> retour à la cour intérieure
  ],

  // ---- poches sombres ----
  darkZones: [
    { x: 62, y: 24, w: 88, h: 8, tint: 0.65 },  // Souterrain des Sapeurs
    { x: 178, y: 0, w: 40, h: 24, tint: 0.3 },  // Tour de Siège (brume légère, à ciel ouvert)
  ],

  // ---- décor ----
  props: [
    { type: 'tent', tx: 8, ty: 22 },
    { type: 'crate', tx: 18, ty: 22 },
    { type: 'flag', tx: 30, ty: 22 },
    { type: 'crate', tx: 70, ty: 22 },
    { type: 'flag', tx: 110, ty: 22 },
    { type: 'crate', tx: 140, ty: 22 },
    { type: 'tent', tx: 150, ty: 22 },
    { type: 'cannon', tx: 170, ty: 22 },       // décoratif (pas interactable)
    { type: 'flag', tx: 210, ty: 22 },
    { type: 'crate', tx: 240, ty: 22 },
    { type: 'cannon', tx: 270, ty: 22 },       // décoratif (pas interactable)
    { type: 'crate', tx: 300, ty: 22 },
    { type: 'flag', tx: 375, ty: 9 },
    // Souterrain des Sapeurs : torches
    { type: 'fire', tx: 66, ty: 31, s: 0.8 },
    { type: 'fire', tx: 84, ty: 31, s: 0.8 },
    { type: 'fire', tx: 100, ty: 31, s: 0.7 },
    { type: 'fire', tx: 118, ty: 31, s: 0.85 },
    { type: 'fire', tx: 140, ty: 31, s: 0.9 },
    // Tour de Siège
    { type: 'flag', tx: 182, ty: 16 },
    { type: 'flag', tx: 195, ty: 9 },
  ],

  // ---- indices pour l'IA de démonstration (documentation seule, cf. MEDIEVAL : demoai.js ne
  // lit aucun de ces champs) ----
  navHints: {
    defaultRoute: 'main',
    climbs: [
      { id: 'CLIMB_RENAISSANCE_01', x: 331, bottomY: 24, topY: 7, exitX: 334 },
      { id: 'CLIMB_RENAISSANCE_02', x: 349, bottomY: 24, topY: 7, exitX: 352 },
      { id: 'CLIMB_RENAISSANCE_03', x: 367, bottomY: 24, topY: 7, exitX: 370 },
    ],
  },
};

// ============================================================ NIVEAU 5 : GUERRE DIESEL
// « Le Puits de la Cité-Mine » — première carte authored de l'ère 5, de forme radicalement
// différente des précédentes : au lieu d'une bande large et courte (tilesW 350-560 × worldH 32),
// un rectangle vertical (tilesW 100 × worldH 168, même « budget » total de tuiles que les cartes
// précédentes, juste redistribué en hauteur). On descend surtout, via une chute volontaire à la
// fin de chaque palier (même patron que le puits de STONE — jamais de manivelle/corde sur le
// chemin obligatoire, cf. plus bas). Chemin obligatoire (saut/dash/chariot/chute uniquement) :
// D0 surface (camp + chariot sur rail #1) -> D1 galeries supérieures -> D2 galeries inférieures
// (+ chariot sur rail #2) -> D3 profondeurs (gauntlet élite) -> chute jusqu'à l'antichambre ->
// arène du Béhémoth Diesel (art déjà existant, inchangée).
// IMPORTANT (retour d'un test IA de démo pendant la conception, cf. TODO.md) : la 1ère version
// faisait descendre via une cage de mine à manivelle — mais la démo IA n'actionne JAMAIS de
// levier/manivelle délibérément (contrainte déjà documentée sur R2-R4), et la cage restait
// parquée en haut par défaut, formant un pont bien réel (pas un obstacle à sauter) que l'IA
// traversait sans le vouloir tout droit dans la galerie secrète, où elle restait bloquée sans
// pouvoir progresser (le coffre nécessite la corde, qu'elle ne grimpe pas non plus). Refondu :
// chaque palier est un simple à-pic (aucun sol au-delà d'un point, comme le puits de STONE) qui
// ramène systématiquement le chemin obligatoire au palier suivant ; la cage de mine à paliers
// multiples devient une attraction 100% optionnelle, entièrement contenue DANS la galerie
// secrète de D1 (jamais nécessaire pour progresser), atteinte par une corde (jamais empruntée
// par l'IA, même contrainte que les lianes de R3/les cordes des autres galeries).
// Chaque palier a sa galerie secrète en cul-de-sac, atteinte par une corde (`climbables`) :
// garde d'entrée, traqueurs des galeries (nouveau `parry`), cage de mine à 3 arrêts (relais ->
// horde qui déferle, 10 ennemis d'un coup -> capitaine), salle de grisou signature (barils de
// poudre R4 reskinnés, cf. `propType:'gaspocket'`).
// Déclenchement du boss par profondeur (`arenaStartTy`), pas par distance horizontale — cf.
// `Game#frame`. `arenaStartTx`/`gateTx` mis à une sentinelle hors de portée (aucun mur de porte
// horizontal n'a de sens sur une carte verticale).
// 12 encounters verrouillés + 2 chariots sur rail (spawns libres le long du couloir) + spawns
// ambiants ≈ 80 monstres au total, 5 mini-boss élites.
const DIESEL = {
  id: 'diesel',
  tilesW: 100,
  worldH: 168,
  spawnX: 3,
  startRoom: 'D0_SURFACE',
  bossArenaRoom: 'D3_ARENA',
  // `arenaStartTx` ne pilote PAS que le déclenchement du combat (`Game#frame`) : `Level#_buildBossArena`
  // l'utilise aussi pour placer l'image d'arène elle-même dans l'espace du monde (`viewX =
  // (arenaStartTx+2)*TILE`) — une sentinelle du genre 9999 y était encore lue, plaçant l'arène
  // (et donc `bossX`) à des dizaines de milliers de pixels hors de la carte (bug trouvé en
  // testant : la démo IA « atteignait » le boss mais `player.x` explosait à ~10000 tuiles).
  // Fixé à une vraie position (58 -> viewX=x60, aligné sur l'antichambre/filet de sécurité
  // ci-dessous) ; le gauntlet D3 (x0-58, colonnes 0-57, cf. `solids`) reste toujours strictement
  // AVANT cette colonne, donc `pl.x > arenaStartTx*T` ne peut se déclencher qu'une fois le gauntlet terminé
  // et la chute vers l'antichambre déjà entamée — jamais prématurément.
  arenaStartTx: 58,
  gateTx: 10000,
  // Déclenche aussi le combat de boss une fois la profondeur de l'antichambre atteinte (y145,
  // pieds au sol ≈ y143.7 pour un héros de ~62px de haut) — marge confortable sous le gauntlet
  // D3 (y132), redondant avec `arenaStartTx` ci-dessus mais nécessaire si le joueur tombe côté
  // x<58 de l'antichambre.
  arenaStartTy: 138,
  arenaGy: 132,
  fallDamageRatio: 0.10,

  // ---- terrain solide : dalles fines qui flottent dans le puits (pas de "bedrock" infini comme
  // les cartes horizontales) ; le chemin obligatoire (x0-38 environ) se termine toujours en
  // à-pic (rien au-delà), la chute est la seule façon de continuer, exactement comme le puits de
  // STONE — l'IA de démo, qui ne trouve alors aucun atterrissage proche pour sauter par-dessus
  // (`DemoAI#_gapPlan`), avance et tombe naturellement au palier suivant. Les galeries secrètes
  // (x0-38 aussi, mais bien plus bas que le chemin obligatoire, cf. `climbables`) restent hors
  // de portée de cette chute : jamais dans sa trajectoire. ----
  solids: [
    { x: 0, y: 20, w: 38, h: 6 },   // D0 surface
    { x: 0, y: 30, w: 30, h: 6 },   // D0_SEC_GALLERY (corde CLIMB_D0_ROPE)

    { x: 0, y: 56, w: 38, h: 6 },   // D1 galeries supérieures
    // D1_SEC_CAGE : 3 paliers de la cage de mine optionnelle (relais/horde/capitaine),
    // superposés dans une colonne dédiée (x0-11) — jamais dans la colonne de chute (x33-38).
    { x: 12, y: 64, w: 18, h: 6 },
    { x: 12, y: 72, w: 18, h: 6 },
    { x: 12, y: 80, w: 18, h: 6 },

    { x: 0, y: 92, w: 38, h: 6 },   // D2 galeries inférieures
    { x: 0, y: 102, w: 30, h: 6 },  // D2_SEC_GALLERY (corde CLIMB_D2_ROPE)

    // D3 PROFONDEURS (y132) : palier obligatoire (x0-58, colonnes 0-57, strictement avant
    // arenaStartTx=58, cf. plus haut) séparé de la galerie secrète (x75-98) par une brèche de 17
    // tuiles — largement au-delà de la portée de saut de la démo IA (`DemoAI#_gapPlan` ne cherche
    // que 9 tuiles), donc jamais franchie par erreur ; l'atteindre exige un vrai saut délibéré.
    // Continuer tout droit (ou juste tomber du bord) mène à la chute volontaire vers l'antichambre,
    // juste en dessous — un panneau (`props`, type 'signpost') indique la direction au bord du
    // gouffre, et la colonne 58 est flush avec le bord de l'antichambre (aucune brèche
    // horizontale à couvrir en tombant, seulement la chute verticale) : retour joueur 2026-07-28,
    // « pas très clair qu'en sautant dans le vide en bas à droite on arrive dans l'arène du boss ».
    { x: 0, y: 132, w: 58, h: 8 },
    { x: 75, y: 132, w: 23, h: 8 },
    // Antichambre (y145, chute volontaire depuis D3 — même patron que le puits de STONE) + filet
    // de sécurité de l'arène (y155, même convention que STONE/ANTIQUITY/MEDIEVAL/RENAISSANCE :
    // reste sous le sol illustré de l'arène, AR.BOSS_ARENAS.diesel_behemoth). Bord gauche calé sur
    // x58, pile la colonne où s'arrête le sol D3 ci-dessus, pour que la chute soit verticale.
    { x: 58, y: 145, w: 42, h: 10 },
    { x: 58, y: 155, w: 42, h: 13 },
  ],

  empties: [],

  oneWay: [],

  // ---- cordes grimpables (accès aux 2 galeries simples + à la cage de mine optionnelle de D1 ;
  // jamais sur le chemin obligatoire — la démo IA ne grimpe jamais délibérément, même contrainte
  // que les lianes de R3) ----
  climbables: [
    { id: 'CLIMB_D0_ROPE', x: 12, y: 18, w: 2, h: 16, exitY: 22 },
    { id: 'CLIMB_D1_ROPE', x: 12, y: 54, w: 2, h: 18, exitY: 58 },
    { id: 'CLIMB_D2_ROPE', x: 12, y: 90, w: 2, h: 16, exitY: 94 },
  ],

  // ---- destructibles : poche de grisou signature (D2_SEC_GALLERY) + obstacle du chariot #2 —
  // barils de poudre R4 reskinnés (`propType:'gaspocket'`), même mécanique intacte ----
  breakables: [
    // chainR relevé à 180 (comme R4) : espacement de 3 tuiles/144px > le rayon par défaut 140.
    { id: 'GAS_ROOM_1', type: 'keg', propType: 'gaspocket', rect: { x: 10, y: 101, w: 1, h: 1 }, hp: 14, radius: 130, chainR: 180 },
    { id: 'GAS_ROOM_2', type: 'keg', propType: 'gaspocket', rect: { x: 13, y: 101, w: 1, h: 1 }, hp: 14, radius: 130, chainR: 180 },
    { id: 'GAS_ROOM_3', type: 'keg', propType: 'gaspocket', rect: { x: 16, y: 101, w: 1, h: 1 }, hp: 14, radius: 130, chainR: 180 },
    { id: 'GAS_RAIL2', type: 'keg', propType: 'gaspocket', rect: { x: 24, y: 91, w: 1, h: 1 }, hp: 14, radius: 120, chainR: 140 },
  ],

  // ---- manivelles de la cage de mine (100% optionnelle, cf. en-tête — jamais atteinte sans
  // grimper CLIMB_D1_ROPE d'abord) : relais -> horde -> capitaine, une manivelle par palier,
  // chacune envoie au palier suivant (`targetY`, cf. Level#activateLift). ----
  interactables: [
    { id: 'CRANK_D1_TO_SWARM', type: 'crank', x: 15, y: 64, lift: 'D1_CAGE', targetY: 72, prompt: 'Actionner la manivelle' },
    { id: 'CRANK_D1_TO_CAPTAIN', type: 'crank', x: 15, y: 72, lift: 'D1_CAGE', targetY: 80, prompt: 'Actionner la manivelle' },
    { id: 'CRANK_D1_RETURN', type: 'crank', x: 15, y: 80, lift: 'D1_CAGE', targetY: 64, prompt: 'Actionner la manivelle' },
  ],

  // ---- cage de mine à paliers multiples (cf. Level#activateLift, targetY) ----
  lifts: [
    { id: 'D1_CAGE', x: 12, w: 6, bottomY: 80, topY: 64, startY: 64, speed: 2.5 },
  ],

  // ---- rooms : partition propre par bande de profondeur (y), aucun chevauchement ----
  rooms: [
    { id: 'D0_SURFACE', rect: { x: 0, y: 0, w: 38, h: 26 }, tags: ['start'],
      camera: { minX: 0, maxX: 40, minY: 0, maxY: 28 }, safeRespawn: [{ x: 3, y: 20, priority: 10 }, { x: 10, y: 20, priority: 8 }] },
    { id: 'D0_SEC_GALLERY', rect: { x: 0, y: 26, w: 38, h: 12 }, tags: ['secret', 'gallery', 'dark'],
      camera: { minX: 0, maxX: 40, minY: 24, maxY: 40 }, safeRespawn: [{ x: 15, y: 30, priority: 9 }] },
    { id: 'D1_GALLERIES', rect: { x: 0, y: 38, w: 38, h: 22 }, tags: ['branch'],
      camera: { minX: 0, maxX: 40, minY: 36, maxY: 62 }, safeRespawn: [{ x: 10, y: 56, priority: 8 }] },
    { id: 'D1_SEC_CAGE', rect: { x: 0, y: 60, w: 38, h: 26 }, tags: ['secret', 'gallery', 'dark'],
      camera: { minX: 0, maxX: 40, minY: 58, maxY: 90 }, safeRespawn: [{ x: 18, y: 64, priority: 9 }] },
    { id: 'D2_GALLERIES', rect: { x: 0, y: 86, w: 38, h: 12 }, tags: ['branch'],
      camera: { minX: 0, maxX: 40, minY: 84, maxY: 100 }, safeRespawn: [{ x: 10, y: 92, priority: 8 }] },
    { id: 'D2_SEC_GALLERY', rect: { x: 0, y: 98, w: 38, h: 18 }, tags: ['secret', 'gallery', 'dark'],
      camera: { minX: 0, maxX: 40, minY: 96, maxY: 118 }, safeRespawn: [{ x: 15, y: 102, priority: 9 }] },
    { id: 'D3_DEPTHS', rect: { x: 0, y: 116, w: 75, h: 20 }, tags: ['tension'],
      camera: { minX: 0, maxX: 78, minY: 112, maxY: 138 }, safeRespawn: [{ x: 10, y: 132, priority: 8 }] },
    { id: 'D3_SEC_HORDE_CAPTAIN', rect: { x: 75, y: 116, w: 25, h: 20 }, tags: ['secret', 'gallery', 'dark'],
      camera: { minX: 73, maxX: 100, minY: 112, maxY: 138 }, safeRespawn: [{ x: 85, y: 132, priority: 9 }] },
    { id: 'D3_ANTECHAMBER', rect: { x: 55, y: 136, w: 45, h: 15 }, tags: ['ascent'],
      camera: { minX: 53, maxX: 100, minY: 134, maxY: 168 }, safeRespawn: [{ x: 75, y: 145, priority: 10 }] },
    { id: 'D3_ARENA', rect: { x: 55, y: 151, w: 45, h: 17 }, tags: ['boss'],
      camera: { minX: 53, maxX: 100, minY: 148, maxY: 168 }, safeRespawn: [{ x: 75, y: 155, priority: 10 }] },
  ],

  // ---- encounters verrouillés (gates:[] partout, même contrainte que R3/R4) ----
  encounters: [
    { id: 'E_D0_INTRO', roomId: 'D0_SURFACE',
      trigger: { x: 4, y: 16, w: 8, h: 8 }, gates: [],
      waves: [{ ids: ['trench_soldier', 'trench_soldier', 'flamethrower'] }],
      reward: { coins: 10 } },
    { id: 'E_D0_GAUNTLET', roomId: 'D0_SURFACE',
      trigger: { x: 13, y: 16, w: 14, h: 8 }, gates: [],
      waves: [{ ids: ['trench_soldier', 'trench_soldier', 'flamethrower'] },
              { ids: ['flamethrower', 'bombardier', 'trench_soldier'] }],
      reward: { coins: 18 } },
    { id: 'E_D0_SEC_GUARD', roomId: 'D0_SEC_GALLERY',
      trigger: { x: 8, y: 26, w: 16, h: 8 }, gates: [],
      waves: [{ ids: ['armored_trooper'], elite: ['armored_trooper'] }],
      reward: { coins: 24 } },

    { id: 'E_D1_GAUNTLET', roomId: 'D1_GALLERIES',
      trigger: { x: 4, y: 52, w: 28, h: 8 }, gates: [],
      waves: [{ ids: ['trench_soldier', 'trench_soldier', 'armored_trooper'] },
              { ids: ['flamethrower', 'flamethrower', 'bombardier'] },
              { ids: ['trench_soldier', 'flamethrower', 'armored_trooper'] }],
      reward: { coins: 26 } },
    { id: 'E_D1_SEC_RELAY', roomId: 'D1_SEC_CAGE',
      trigger: { x: 12, y: 60, w: 18, h: 8 }, gates: [],
      waves: [{ ids: ['diesel_tunnel_stalker', 'diesel_tunnel_stalker', 'bombardier'] }],
      reward: { coins: 16 } },
    // Palier 2 de la cage : horde qui déferle (même esprit que R3/R4, 1 seule vague, 10 ennemis
    // simultanés) — mélange corps-à-corps/distance/traqueurs pareurs.
    { id: 'E_D1_SEC_SWARM', roomId: 'D1_SEC_CAGE',
      trigger: { x: 12, y: 68, w: 18, h: 8 }, gates: [],
      waves: [{ ids: ['trench_soldier', 'trench_soldier', 'flamethrower', 'flamethrower',
                       'armored_trooper', 'armored_trooper', 'diesel_tunnel_stalker', 'diesel_tunnel_stalker',
                       'bombardier', 'bombardier'] }],
      reward: { coins: 36 } },
    { id: 'E_D1_SEC_CAPTAIN', roomId: 'D1_SEC_CAGE',
      trigger: { x: 12, y: 76, w: 18, h: 8 }, gates: [],
      waves: [{ ids: ['roller_scout'], elite: ['roller_scout'] }],
      reward: { coins: 30 } },

    { id: 'E_D2_GAUNTLET', roomId: 'D2_GALLERIES',
      trigger: { x: 4, y: 88, w: 14, h: 8 }, gates: [],
      waves: [{ ids: ['armored_trooper', 'trench_soldier', 'bombardier'] },
              { ids: ['flamethrower', 'armored_trooper', 'trench_soldier'] }],
      reward: { coins: 22 } },
    { id: 'E_D2_SEC_GALLERY', roomId: 'D2_SEC_GALLERY',
      trigger: { x: 6, y: 98, w: 20, h: 8 }, gates: [],
      waves: [{ ids: ['armored_trooper', 'armored_trooper', 'bombardier', 'diesel_tunnel_stalker'] },
              { ids: ['roller_scout'], elite: ['roller_scout'] }],
      reward: { coins: 28 } },

    { id: 'E_D3_GAUNTLET', roomId: 'D3_DEPTHS',
      trigger: { x: 10, y: 128, w: 30, h: 8 }, gates: [],
      waves: [{ ids: ['trench_soldier', 'trench_soldier', 'armored_trooper'] },
              { ids: ['flamethrower', 'flamethrower', 'bombardier'] },
              { ids: ['armored_trooper', 'diesel_tunnel_stalker', 'diesel_tunnel_stalker'], elite: ['armored_trooper'] }],
      reward: { coins: 32 } },
    { id: 'E_D3_SEC_HORDE', roomId: 'D3_SEC_HORDE_CAPTAIN',
      trigger: { x: 76, y: 128, w: 10, h: 8 }, gates: [],
      waves: [{ ids: ['trench_soldier', 'trench_soldier', 'flamethrower', 'armored_trooper', 'bombardier'] }],
      reward: { coins: 24 } },
    { id: 'E_D3_SEC_CAPTAIN', roomId: 'D3_SEC_HORDE_CAPTAIN',
      trigger: { x: 88, y: 128, w: 10, h: 8 }, gates: [],
      waves: [{ ids: ['roller_scout'], elite: ['roller_scout'] }],
      reward: { coins: 30 } },
  ],

  // ---- déclencheurs : chariots sur rail (cf. Player#riding, Game#_updateTriggers) ----
  triggers: [
    { id: 'RAIL_D0', rect: { x: 28, y: 16, w: 4, h: 8 }, action: 'startRail', speed: 260, endX: 36 },
    { id: 'RAIL_D2', rect: { x: 19, y: 88, w: 4, h: 8 }, action: 'startRail', speed: 300, endX: 36 },
  ],

  // ---- ennemis libres (obstacles des chariots sur rail + ambiants) ----
  spawns: [
    // Chariot #1 (D0)
    { tx: 30, ty: 20, id: 'trench_soldier' },
    { tx: 34, ty: 20, id: 'trench_soldier' },
    // Chariot #2 (D2, plus dur) : lance-flammes + traqueur, en plus de la poche de grisou.
    { tx: 26, ty: 92, id: 'flamethrower' },
    { tx: 32, ty: 92, id: 'diesel_tunnel_stalker' },

    // ambiants
    { tx: 8, ty: 20, id: 'flamethrower' },
    { tx: 20, ty: 20, id: 'trench_soldier' },
    { tx: 20, ty: 30, id: 'trench_soldier' },
    { tx: 8, ty: 56, id: 'armored_trooper' },
    { tx: 20, ty: 56, id: 'bombardier' },
    { tx: 30, ty: 56, id: 'trench_soldier' },
    { tx: 22, ty: 64, id: 'diesel_tunnel_stalker' },
    { tx: 8, ty: 92, id: 'armored_trooper' },
    { tx: 14, ty: 92, id: 'bombardier' },
    { tx: 20, ty: 102, id: 'bombardier' },
    { tx: 20, ty: 132, id: 'trench_soldier' },
    { tx: 30, ty: 132, id: 'flamethrower' },
    { tx: 50, ty: 132, id: 'armored_trooper' },
    { tx: 46, ty: 132, id: 'bombardier' },
  ],

  // ---- coffres ----
  chests: [
    { x: 8, y: 20 },
    { x: 18, y: 30, guaranteed: 'skillPoint' },
    { x: 20, y: 56 },
    { x: 20, y: 80, guaranteed: 'skillPoint' },
    { x: 10, y: 92 },
    { x: 20, y: 102, guaranteed: 'swordUp' },
    { x: 46, y: 132 },
    { x: 90, y: 132, guaranteed: 'swordUp' },
    { x: 75, y: 145 },
  ],

  merchant: { x: 2, y: 20 },

  localPortals: [],

  // ---- poches sombres (plus on descend, plus c'est sombre) ----
  darkZones: [
    { x: 0, y: 26, w: 38, h: 12, tint: 0.35 },  // D0_SEC_GALLERY
    { x: 0, y: 38, w: 38, h: 22, tint: 0.3 },   // D1
    { x: 0, y: 60, w: 38, h: 26, tint: 0.45 },  // D1_SEC_CAGE
    { x: 0, y: 86, w: 38, h: 12, tint: 0.45 },  // D2
    { x: 0, y: 98, w: 38, h: 18, tint: 0.6 },   // D2_SEC_GALLERY
    { x: 0, y: 116, w: 100, h: 20, tint: 0.55 }, // D3
    { x: 75, y: 116, w: 25, h: 20, tint: 0.65 }, // galerie secrète D3
  ],

  // ---- décor ----
  props: [
    { type: 'crate', tx: 6, ty: 20 },
    { type: 'sandbag', tx: 12, ty: 20 },
    { type: 'wire', tx: 24, ty: 20 },
    { type: 'crater', tx: 15, ty: 30 },
    { type: 'wire', tx: 6, ty: 56 },
    { type: 'crate', tx: 26, ty: 56 },
    { type: 'fire', tx: 18, ty: 64, s: 0.85 },   // cage, palier relais
    { type: 'fire', tx: 18, ty: 72, s: 0.85 },   // cage, palier horde
    { type: 'fire', tx: 18, ty: 80, s: 0.85 },   // cage, palier capitaine
    { type: 'sandbag', tx: 6, ty: 92 },
    { type: 'wire', tx: 30, ty: 92 },
    { type: 'crater', tx: 26, ty: 102 },
    { type: 'wreck', tx: 20, ty: 132 },
    { type: 'crater', tx: 50, ty: 132 },
    { type: 'wire', tx: 90, ty: 132 },
    { type: 'signpost', tx: 55, ty: 132 },       // bord du gouffre D3 -> antichambre/boss (retour joueur 2026-07-28)
    { type: 'fire', tx: 75, ty: 145, s: 1.1 },   // antichambre
  ],

  // ---- indices pour l'IA de démonstration (documentation seule, cf. R3/R4 : demoai.js ne lit
  // aucun de ces champs) ----
  navHints: {
    defaultRoute: 'main',
    climbs: [
      { id: 'CLIMB_D0_ROPE', x: 13, bottomY: 34, topY: 18, exitX: 16 },
      { id: 'CLIMB_D1_ROPE', x: 13, bottomY: 72, topY: 54, exitX: 16 },
      { id: 'CLIMB_D2_ROPE', x: 13, bottomY: 106, topY: 90, exitX: 16 },
    ],
  },
};

AR.LEVEL_SPECS = {
  stone: STONE,
  antiquity: ANTIQUITY,
  medieval: MEDIEVAL,
  renaissance: RENAISSANCE,
  diesel: DIESEL,
  cyber: null,
};
