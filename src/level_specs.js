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
    { x: 212, y: 22, w: 36, h: 10 },
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
    { x: 230, y: 17, w: 4, id: 'S08_PERCH' },      // poste de frondeur
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
    { id: 'S05_DEEP_CAVES', rect: { x: 96, y: 21, w: 58, h: 11 }, tags: ['branch', 'low_route', 'dark'],
      camera: { minX: 96, maxX: 156, minY: 18, maxY: 32 }, safeRespawn: [{ x: 120, y: 29, priority: 6 }] },
    { id: 'S06_HUNTERS_EXIT', rect: { x: 146, y: 13, w: 38, h: 19 }, tags: ['convergence', 'loop'],
      camera: { minX: 146, maxX: 184, minY: 10, maxY: 32 }, safeRespawn: [{ x: 180, y: 22, priority: 8 }] },
    { id: 'S07_FIRST_FIRE_CAMP', rect: { x: 184, y: 17, w: 28, h: 15 }, tags: ['safe', 'no_enemy', 'merchant'],
      camera: { minX: 184, maxX: 212, minY: 13, maxY: 32 }, safeRespawn: [{ x: 198, y: 22, priority: 10 }] },
    { id: 'S08_TOTEM_PASS', rect: { x: 212, y: 12, w: 108, h: 20 }, tags: ['tension'],
      camera: { minX: 212, maxX: 320, minY: 8, maxY: 32 }, safeRespawn: [{ x: 226, y: 22, priority: 7 }, { x: 300, y: 20, priority: 8 }] },
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
  ],

  // ---- déclencheurs de scène ----
  triggers: [
    { id: 'BATS_WAKE', rect: { x: 61, y: 23, w: 6, h: 4 }, action: 'wakeSpawns', group: 'well_bats' },
    { id: 'RIDGE_WAKE', rect: { x: 96, y: 14, w: 40, h: 3 }, action: 'wakeSpawns', group: 'ridge' },
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
    { tx: 236, ty: 22, id: 'beast_hunter' },
    { tx: 230, ty: 17, id: 'stone_slinger', onPlatform: true },
    { tx: 300, ty: 20, id: 'stone_spear' },
  ],

  // ---- coffres ----
  chests: [
    { x: 30, y: 22 },
    { x: 110, y: 12, high: true },        // SEC_STONE_02 : coffre haut (maîtrise du mouvement)
    { x: 56, y: 29, high: true },         // SEC_STONE_01 : relique derrière le mur friable
    { x: 206, y: 22 },                    // coffre du camp
    { x: 178, y: 23 },                    // SEC_STONE_03 : cache d'or (alcôve du levier, plain-pied)
    { x: 312, y: 20 },                    // coffre de préparation (antichambre)
  ],

  merchant: { x: 198, y: 22 },

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

AR.LEVEL_SPECS = {
  stone: STONE,
  antiquity: null,
  medieval: null,
  renaissance: null,
  diesel: null,
  cyber: null,
};
