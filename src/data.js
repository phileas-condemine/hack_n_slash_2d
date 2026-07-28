// Arcane Rift - données de jeu : ères, ennemis, boss, compétences, sorts, boutique
window.AR = window.AR || {};

// ---------------------------------------------------------------- LES 6 ÈRES
AR.ERAS = [
  {
    id: 'stone', name: 'ÂGE DE PIERRE', sub: 'Survivre est un instinct.',
    sky: ['#2d2417', '#8a6b3a', '#c99a52'], sun: '#ffd9a0', sunY: 0.32,
    far: '#4a4630', mid: '#5d5638', fog: 'rgba(201,154,82,0.14)',
    ground: '#3d3524', groundTop: '#6b7043', accent: '#a8b06a', rock: '#57503a',
    weather: 'embers', props: ['bones', 'rock', 'totem', 'fire'],
    enemies: ['stone_spear', 'stone_slinger', 'beast_hunter', 'stone_brute', 'war_shaman'],
    elite: 'mammoth_rider', boss: 'mammoth_chief',
  },
  {
    id: 'antiquity', name: 'ANTIQUITÉ', sub: 'Les empires naissent, les légendes s\'effacent.',
    sky: ['#3f6d9e', '#7fa8c9', '#e8d5b0'], sun: '#fff3d0', sunY: 0.22,
    far: '#8d9db0', mid: '#b3a284', fog: 'rgba(232,213,176,0.16)',
    ground: '#7a6547', groundTop: '#c2a878', accent: '#d9c9a5', rock: '#9a8663',
    weather: 'dust', props: ['column', 'banner', 'amphora', 'laurel'],
    enemies: ['hoplite', 'archer_auxilia', 'desert_raider', 'elephant_guard', 'temple_guardian'],
    elite: 'temple_guardian', boss: 'chariot_commander',
  },
  {
    id: 'medieval', name: 'JAPON MÉDIÉVAL', sub: 'Honneur, esprits et acier.',
    sky: ['#231a33', '#4a3260', '#8d5a7e'], sun: '#f3e6ff', sunY: 0.20, moon: true,
    far: '#3b2d52', mid: '#54406e', fog: 'rgba(141,90,126,0.18)',
    ground: '#2e2438', groundTop: '#5d4a6e', accent: '#e08bb0', rock: '#453a55',
    weather: 'petals', props: ['torii', 'lantern', 'sakura', 'shrine'],
    enemies: ['ronin', 'ninja_assassin', 'tengu_archer', 'spirit_caster', 'oni_brute'],
    elite: 'oni_brute', boss: 'yokai_lord',
  },
  {
    id: 'renaissance', name: 'RENAISSANCE', sub: 'L\'innovation change le champ de bataille.',
    sky: ['#5a7d8f', '#9db8b8', '#e8dcc0'], sun: '#fff8e0', sunY: 0.25,
    far: '#7d8f96', mid: '#a89a80', fog: 'rgba(232,220,192,0.15)',
    ground: '#5d4d3d', groundTop: '#8f7a5c', accent: '#c9a86a', rock: '#7a6a52',
    weather: 'dust', props: ['crate', 'cannon', 'tent', 'flag'],
    enemies: ['pikeman', 'musketeer', 'bombardier', 'mortar_crew', 'armored_captain'],
    elite: 'armored_captain', boss: 'war_engineer',
  },
  {
    id: 'diesel', name: 'GUERRE DIESEL', sub: 'Boue, métal et machine.',
    sky: ['#2a2d26', '#565a48', '#8a8468'], sun: '#c9c0a0', sunY: 0.18,
    far: '#3d4034', mid: '#4d5040', fog: 'rgba(138,132,104,0.25)',
    ground: '#33301f', groundTop: '#565236', accent: '#8a7f52', rock: '#454231',
    weather: 'rain', props: ['sandbag', 'wire', 'wreck', 'crater'],
    enemies: ['trench_soldier', 'flamethrower', 'armored_trooper', 'roller_scout', 'bombardier'],
    elite: 'roller_scout', boss: 'diesel_behemoth',
  },
  {
    id: 'cyber', name: 'ÈRE CYBER', sub: 'Le futur, c\'est maintenant.',
    sky: ['#0d0618', '#2a1245', '#521e6e'], sun: '#e35cff', sunY: 0.15, moon: true,
    far: '#1c0f33', mid: '#321a52', fog: 'rgba(227,92,255,0.10)',
    ground: '#140b24', groundTop: '#3d2a5e', accent: '#42e8f5', rock: '#251740',
    weather: 'neon', props: ['holo', 'pylon', 'screen', 'vent'],
    enemies: ['corp_trooper', 'laser_trooper', 'hover_gunner', 'drone_swarm', 'shield_drone'],
    elite: 'mech_assassin', boss: 'ai_overlord',
  },
];

// -------------------------------------------------------------- LES ENNEMIS
// behavior: melee | brute | ranged | charger | caster | assassin | shield | flyer | artillery
// facing: orientation du sprite source ('r' par défaut)
AR.ENEMIES = {
  // --- Âge de pierre
  stone_spear:    { name: 'Lancier tribal', hp: 65, dmg: 10, speed: 95, xp: 12, coins: 4, h: 78, behavior: 'melee', range: 62, aggro: 420, atkCd: 1.3, tele: 0.45 },
  stone_slinger:  { name: 'Frondeur', hp: 50, dmg: 8, speed: 80, xp: 14, coins: 5, h: 80, behavior: 'ranged', range: 460, keep: 300, aggro: 520, atkCd: 1.9, tele: 0.55, proj: 'rock' },
  beast_hunter:   { name: 'Chasseur de bêtes', hp: 75, dmg: 12, speed: 150, xp: 16, coins: 6, h: 82, behavior: 'melee', range: 58, aggro: 480, atkCd: 0.95, tele: 0.3, facing: 'l', parry: true },
  stone_brute:    { name: 'Brute au gourdin', hp: 155, dmg: 18, speed: 65, xp: 24, coins: 9, h: 92, behavior: 'brute', range: 92, aggro: 400, atkCd: 1.9, tele: 0.6, facing: 'l', knock: 320 },
  war_shaman:     { name: 'Chaman de guerre', hp: 85, dmg: 9, speed: 55, xp: 26, coins: 10, h: 96, behavior: 'caster', range: 560, keep: 340, aggro: 600, atkCd: 2.6, tele: 0.7, proj: 'wisp' },
  mammoth_rider:  { name: 'Monteur de mammouth', hp: 375, dmg: 22, speed: 70, xp: 60, coins: 25, h: 128, behavior: 'charger', range: 480, aggro: 560, atkCd: 2.6, tele: 0.75, chargeSpeed: 420, knock: 380, elite: true },
  // Nouveaux monstres de l'extension (âge de pierre) — cf. 01_niveau_age_de_pierre.md §6
  stone_cave_stalker: { name: 'Traqueur des cavernes', hp: 100, dmg: 12, speed: 72, xp: 34, coins: 14, h: 96, behavior: 'assassin', range: 66, aggro: 500, atkCd: 1.9, tele: 0.45, blinkCd: 2.8, facing: 'l', parry: true },
  stone_cave_bats:    { name: 'Nuée de chauves-souris', hp: 55, dmg: 8, speed: 150, xp: 16, coins: 6, h: 72, behavior: 'flyer', range: 60, aggro: 520, atkCd: 1.6, tele: 0.35, dive: true, flyH: 150 },
  // Sbires dédiés du Chef Mammouth (summon uniquement, cf. _specs/07_boss_minions_art_brief.md).
  // Remplacent `totem_bearer` (retour joueur : mourait en une flèche, pas assez intéressant) par
  // une vraie formation : 2 porteurs de bouclier qui encaissent/bloquent au front + 1 joueur de
  // tambour protégé derrière eux qui buffe ses alliés (résistance + dégâts) — cf. `_execPattern`
  // (`summon:warband`) et `takeDamage`/`update` pour le mécanisme de buff.
  bone_shield_bearer: { name: 'Porteur de bouclier', hp: 70, dmg: 11, speed: 55, xp: 20, coins: 8, h: 90, behavior: 'shield', range: 62, aggro: 420, atkCd: 1.6, tele: 0.5, block: 0.7, knock: 260 },
  // hp=130 * eraScale(0.8, cf. sbires de boss) ≈ 104 PV réels — >= 4 flèches chargées (~25 dgts
  // au tout début de l'ère 1) pour l'abattre, comme demandé (c'est la cible prioritaire).
  war_drummer:    { name: 'Joueur de tambour', hp: 130, dmg: 6, speed: 50, xp: 26, coins: 10, h: 92, behavior: 'caster', range: 700, keep: 380, aggro: 620, atkCd: 3.2, tele: 0.6, proj: 'warBuff' },

  // --- Antiquité
  hoplite:        { name: 'Hoplite', hp: 40, dmg: 12, speed: 90, xp: 16, coins: 6, h: 82, behavior: 'shield', range: 64, aggro: 430, atkCd: 1.4, tele: 0.45, block: 0.6 },
  archer_auxilia: { name: 'Archer auxiliaire', hp: 60, dmg: 10, speed: 85, xp: 16, coins: 6, h: 84, behavior: 'ranged', range: 560, keep: 360, aggro: 620, atkCd: 1.7, tele: 0.5, proj: 'arrow' },
  desert_raider:  { name: 'Pillard du désert', hp: 85, dmg: 13, speed: 160, xp: 18, coins: 8, h: 84, behavior: 'melee', range: 60, aggro: 500, atkCd: 0.9, tele: 0.28, facing: 'l', parry: true },
  elephant_guard: { name: 'Garde à éléphant', hp: 425, dmg: 24, speed: 60, xp: 55, coins: 20, h: 132, behavior: 'charger', range: 460, aggro: 540, atkCd: 2.8, tele: 0.8, chargeSpeed: 380, knock: 400 },
  temple_guardian:{ name: 'Gardien du temple', hp: 130, dmg: 20, speed: 45, xp: 50, coins: 22, h: 118, behavior: 'shield', range: 88, aggro: 380, atkCd: 2.1, tele: 0.65, block: 0.85, knock: 340, elite: true },
  // Sbire dédié du Commandant de Char (summon uniquement)
  standard_bearer:{ name: 'Porte-étendard', hp: 36, dmg: 13, speed: 95, xp: 18, coins: 7, h: 84, behavior: 'melee', range: 85, aggro: 460, atkCd: 1.5, tele: 0.45 },
  // Monstres dédiés de la petite cache secrète SEC_ANTIQUITY_02 (cf. level_specs.js) — jamais
  // utilisés ailleurs, comme stone_cave_stalker/stone_cave_bats pour l'ère 1.
  crypt_wraith:   { name: 'Spectre des catacombes', hp: 95, dmg: 13, speed: 135, xp: 24, coins: 10, h: 88, behavior: 'assassin', range: 64, aggro: 520, atkCd: 1.7, tele: 0.4, blinkCd: 3.0, facing: 'l', parry: true },
  tomb_scarabs:   { name: 'Nuée de scarabées', hp: 48, dmg: 9, speed: 145, xp: 14, coins: 5, h: 60, behavior: 'flyer', range: 58, aggro: 520, atkCd: 1.6, tele: 0.35, dive: true, flyH: 140 },
  // Monstres dédiés du Quartier des Esclaves (SEC_ANTIQUITY souterrain, cf. level_specs.js) —
  // jamais utilisés en surface (forum/rue/arène), pour donner à cette zone sa propre identité.
  chain_overseer: { name: 'Contremaître enchaîné', hp: 110, dmg: 16, speed: 70, xp: 28, coins: 11, h: 90, behavior: 'shield', range: 70, aggro: 440, atkCd: 1.6, tele: 0.5, block: 0.65, knock: 300 },
  pit_vermin:     { name: 'Vermine des fosses', hp: 30, dmg: 7, speed: 170, xp: 8, coins: 3, h: 64, behavior: 'melee', range: 50, aggro: 460, atkCd: 1.0, tele: 0.25, facing: 'l' },
  manacled_brute: { name: 'Forçat brisant ses chaînes', hp: 180, dmg: 20, speed: 60, xp: 35, coins: 14, h: 100, behavior: 'brute', range: 95, aggro: 400, atkCd: 1.8, tele: 0.6, facing: 'l', knock: 340 },

  // Champions de l'Arène des Gladiateurs (Fosse des Esclaves, cf. level_specs.js) : 5
  // mini-boss élite, un par manche, jamais réutilisés ailleurs. Chacun a 3 attaques
  // distinctes (`attacks`), chacune sa propre paire d'animations windup/attack
  // ('enemies/states/{id}_{key}_windup'/'_attack', {key} = atk1/atk2/atk3) — cf.
  // AR.Enemy#_pickAttack/_enterTele (src/enemy.js) pour le mécanisme générique. `behavior`
  // pilote toujours le déplacement/l'approche comme pour tout ennemi ; `attacks[].kind`
  // (melee/ranged/aoe/charge) pilote la résolution du coup une fois le télégraphe choisi —
  // un `charger` peut donc avoir une attaque de zone ou de mêlée en plus de sa charge.
  retiaire_spectral: { name: 'Rétiaire Spectral', hp: 220, dmg: 14, speed: 150, xp: 60, coins: 25, h: 104,
    behavior: 'assassin', range: 100, aggro: 600, atkCd: 1.8, tele: 0.4, blinkCd: 3.2, elite: true,
    attacks: [
      { key: 'atk1', kind: 'melee', tele: 0.5, dmg: 12, range: 150, knock: 200 },  // jet de filet (longue portée)
      { key: 'atk2', kind: 'melee', tele: 0.32, dmg: 18, range: 95, knock: 260 }, // coup de trident
      { key: 'atk3', kind: 'melee', tele: 0.4, dmg: 15, range: 110, knock: 320 }, // évanescence spectrale
    ] },
  manticore: { name: 'Manticore', hp: 320, dmg: 16, speed: 130, xp: 75, coins: 30, h: 130,
    behavior: 'artillery', range: 420, keep: 340, aggro: 640, atkCd: 2.0, tele: 0.5, elite: true,
    attacks: [
      { key: 'atk1', kind: 'ranged', tele: 0.55, dmg: 14, proj: 'rock', burst: 3 }, // volée de piques
      { key: 'atk2', kind: 'melee', tele: 0.4, dmg: 20, range: 120, knock: 280 },   // bond
      { key: 'atk3', kind: 'aoe', tele: 0.45, dmg: 16, radius: 150, knock: 260, shake: 5 }, // coup de queue
    ] },
  gorgone: { name: 'Gorgone Enchaînée', hp: 300, dmg: 15, speed: 70, xp: 80, coins: 32, h: 140,
    behavior: 'caster', range: 460, keep: 340, aggro: 660, atkCd: 2.2, tele: 0.6, elite: true,
    attacks: [
      { key: 'atk1', kind: 'ranged', tele: 0.6, dmg: 15, proj: 'laser' },          // regard pétrifiant
      { key: 'atk2', kind: 'ranged', tele: 0.55, dmg: 12, proj: 'rock', burst: 3 }, // volée de pierres
      { key: 'atk3', kind: 'melee', tele: 0.35, dmg: 18, range: 85, knock: 240 },  // fouet de serpents
    ] },
  molosse: { name: 'Molosse d\'Airain', hp: 420, dmg: 20, speed: 90, xp: 90, coins: 35, h: 120,
    behavior: 'shield', range: 90, aggro: 460, atkCd: 1.8, tele: 0.5, block: 0.7, chargeSpeed: 420, elite: true,
    attacks: [
      { key: 'atk1', kind: 'aoe', tele: 0.55, dmg: 18, radius: 150, knock: 300, shake: 7 }, // martèlement au sol
      { key: 'atk2', kind: 'melee', tele: 0.35, dmg: 20, range: 100, knock: 260 },          // morsure d'airain
      { key: 'atk3', kind: 'charge', tele: 0.6, dmg: 24, knock: 380 },                      // charge enragée
    ] },
  minotaure: { name: 'Minotaure de la Fosse', hp: 520, dmg: 24, speed: 100, xp: 120, coins: 50, h: 150,
    behavior: 'charger', range: 110, aggro: 560, atkCd: 2.2, tele: 0.55, chargeSpeed: 460, knock: 380, elite: true,
    attacks: [
      { key: 'atk1', kind: 'charge', tele: 0.55, dmg: 24, knock: 400 },                      // charge des cornes
      { key: 'atk2', kind: 'aoe', tele: 0.6, dmg: 22, radius: 160, knock: 340, shake: 8 },    // fracas au sol
      { key: 'atk3', kind: 'aoe', tele: 0.65, dmg: 14, radius: 190, knock: 420, shake: 6 },   // rugissement
    ] },

  // --- Japon médiéval
  ronin:          { name: 'Rônin', hp: 110, dmg: 15, speed: 130, xp: 22, coins: 9, h: 80, behavior: 'melee', range: 78, aggro: 480, atkCd: 1.0, tele: 0.32, combo2: true, parry: true },
  ninja_assassin: { name: 'Assassin ninja', hp: 75, dmg: 14, speed: 190, xp: 26, coins: 11, h: 78, behavior: 'assassin', range: 58, aggro: 560, atkCd: 1.6, tele: 0.3, facing: 'l', blinkCd: 3.2, parry: true },
  // Nouveau monstre de terrain (carte authored R3, cf. level_specs.js MEDIEVAL) : embuscade
  // depuis un couvert de bambou, jamais utilisé ailleurs. Art dédié généré via ChatGPT/Playwright.
  medieval_bamboo_stalker: { name: 'Traqueur des bambous', hp: 95, dmg: 13, speed: 145, xp: 24, coins: 10, h: 82, behavior: 'assassin', range: 62, aggro: 500, atkCd: 1.7, tele: 0.35, blinkCd: 2.6, parry: true },
  tengu_archer:   { name: 'Archer tengu', hp: 85, dmg: 12, speed: 100, xp: 24, coins: 10, h: 92, behavior: 'ranged', range: 600, keep: 380, aggro: 660, atkCd: 1.5, tele: 0.45, proj: 'arrow', hop: true },
  spirit_caster:  { name: 'Invocateur d\'esprits', hp: 100, dmg: 11, speed: 60, xp: 30, coins: 13, h: 100, behavior: 'caster', range: 620, keep: 380, aggro: 680, atkCd: 2.4, tele: 0.65, proj: 'wisp', float: true },
  oni_brute:      { name: 'Brute oni', hp: 325, dmg: 24, speed: 75, xp: 55, coins: 22, h: 108, behavior: 'brute', range: 100, aggro: 420, atkCd: 1.7, tele: 0.55, knock: 380, elite: true, facing: 'l' },
  // Feu-follet : à l'origine sbire dédié du Seigneur Yōkai (summon), réutilisé tel quel comme
  // ennemi de terrain dans la carte authored R3 (déjà l'art voulu pour ce rôle, cf. TODO.md).
  lantern_wisp:   { name: 'Feu-follet', hp: 28, dmg: 10, speed: 55, xp: 22, coins: 9, h: 70, behavior: 'caster', range: 520, keep: 340, aggro: 600, atkCd: 2.1, tele: 0.55, proj: 'wisp', float: true },

  // --- Renaissance
  pikeman:        { name: 'Piquier', hp: 120, dmg: 14, speed: 85, xp: 24, coins: 10, h: 84, behavior: 'melee', range: 105, aggro: 440, atkCd: 1.5, tele: 0.5 },
  musketeer:      { name: 'Mousquetaire', hp: 75, dmg: 16, speed: 80, xp: 26, coins: 11, h: 76, behavior: 'ranged', range: 640, keep: 420, aggro: 700, atkCd: 2.3, tele: 0.7, proj: 'bullet' },
  bombardier:     { name: 'Bombardier', hp: 90, dmg: 18, speed: 75, xp: 28, coins: 12, h: 84, behavior: 'artillery', range: 520, keep: 320, aggro: 600, atkCd: 2.6, tele: 0.6, proj: 'bomb' },
  mortar_crew:    { name: 'Servants de mortier', hp: 150, dmg: 20, speed: 40, xp: 34, coins: 14, h: 92, behavior: 'artillery', range: 720, keep: 420, aggro: 780, atkCd: 3.2, tele: 0.8, proj: 'mortar' },
  armored_captain:{ name: 'Capitaine cuirassé', hp: 160, dmg: 22, speed: 70, xp: 60, coins: 26, h: 106, behavior: 'shield', range: 84, aggro: 420, atkCd: 1.8, tele: 0.55, block: 0.8, knock: 360, elite: true },
  // Sbire dédié de l'Ingénieur de Guerre (summon uniquement)
  gear_servitor:  { name: 'Serviteur à engrenages', hp: 50, dmg: 15, speed: 65, xp: 24, coins: 10, h: 78, behavior: 'brute', range: 80, aggro: 420, atkCd: 1.7, tele: 0.55, knock: 280 },

  // --- Guerre diesel
  trench_soldier: { name: 'Soldat des tranchées', hp: 115, dmg: 14, speed: 95, xp: 28, coins: 11, h: 82, behavior: 'ranged', range: 520, keep: 300, aggro: 620, atkCd: 1.8, tele: 0.5, proj: 'bullet', bayonet: true },
  flamethrower:   { name: 'Lance-flammes', hp: 175, dmg: 6, speed: 70, xp: 34, coins: 14, h: 88, behavior: 'ranged', range: 240, keep: 170, aggro: 460, atkCd: 2.4, tele: 0.55, proj: 'flame' },
  armored_trooper:{ name: 'Trooper blindé', hp: 110, dmg: 18, speed: 60, xp: 40, coins: 16, h: 92, behavior: 'shield', range: 76, aggro: 400, atkCd: 1.7, tele: 0.5, block: 0.85, knock: 320 },
  roller_scout:   { name: 'Éclaireur à rouleau', hp: 300, dmg: 20, speed: 80, xp: 48, coins: 20, h: 96, behavior: 'charger', range: 520, aggro: 600, atkCd: 2.2, tele: 0.6, chargeSpeed: 500, knock: 360, elite: true },
  // Sbire dédié du Béhémoth Diesel (summon uniquement) — seul boss sans summon jusqu'ici
  armored_hound:  { name: 'Chien de guerre blindé', hp: 34, dmg: 14, speed: 150, xp: 22, coins: 9, h: 60, behavior: 'melee', range: 65, aggro: 520, atkCd: 1.3, tele: 0.35, facing: 'l' },

  // --- Ère cyber
  corp_trooper:   { name: 'Trooper corporate', hp: 138, dmg: 16, speed: 110, xp: 32, coins: 13, h: 78, behavior: 'ranged', range: 560, keep: 340, aggro: 660, atkCd: 1.4, tele: 0.4, proj: 'plasma', burst: 3 },
  laser_trooper:  { name: 'Trooper laser', hp: 150, dmg: 20, speed: 90, xp: 36, coins: 15, h: 84, behavior: 'ranged', range: 720, keep: 440, aggro: 780, atkCd: 2.6, tele: 0.9, proj: 'laser' },
  hover_gunner:   { name: 'Mitrailleur hover', hp: 162, dmg: 14, speed: 140, xp: 38, coins: 16, h: 74, behavior: 'flyer', range: 480, keep: 300, aggro: 640, atkCd: 1.7, tele: 0.45, proj: 'plasma', flyH: 130 },
  drone_swarm:    { name: 'Nuée de drones', hp: 112, dmg: 12, speed: 170, xp: 30, coins: 12, h: 84, behavior: 'flyer', range: 60, aggro: 640, atkCd: 1.9, tele: 0.4, dive: true, flyH: 150 },
  shield_drone:   { name: 'Drone bouclier', hp: 90, dmg: 10, speed: 100, xp: 42, coins: 18, h: 86, behavior: 'flyer', range: 420, keep: 260, aggro: 600, atkCd: 2.2, tele: 0.5, proj: 'plasma', flyH: 110, shielded: 40 },
  mech_assassin:  { name: 'Assassin mécanisé', hp: 300, dmg: 22, speed: 220, xp: 65, coins: 28, h: 94, behavior: 'assassin', range: 70, aggro: 700, atkCd: 1.3, tele: 0.26, blinkCd: 2.4, elite: true, parry: true },
  // Sbire dédié de l'IA Suprême (summon uniquement)
  core_shard:     { name: 'Éclat du noyau', hp: 26, dmg: 11, speed: 110, xp: 26, coins: 11, h: 56, behavior: 'ranged', range: 480, keep: 300, aggro: 640, atkCd: 1.8, tele: 0.45, proj: 'plasma', float: true, shielded: 25 },
};

// Sprite de repli si l'image d'un ennemi est absente (le comportement/les stats
// restent ceux de l'ennemi réel ; seul le rendu emprunte le sprite indiqué).
AR.ENEMY_FALLBACK = {
  stone_cave_stalker: 'beast_hunter',
  stone_cave_bats: 'war_shaman',
  crypt_wraith: 'desert_raider',
  tomb_scarabs: 'war_shaman',
  chain_overseer: 'temple_guardian',
  pit_vermin: 'desert_raider',
  manacled_brute: 'hoplite',
};

// ------------------------------------------------------------------ LES BOSS
AR.BOSSES = {
  mammoth_chief: {
    name: 'CHEF MAMMOUTH', hp: 5500, dmg: 24, h: 210, speed: 90, xp: 220, coins: 120,
    // `summon:warband` : formation dédiée (2 `bone_shield_bearer` en flanc-garde + 1
    // `war_drummer` protégé derrière, qui buffe ses alliés) — cf. `_execPattern` dans enemy.js.
    patterns: ['charge', 'stomp', 'arrowRing', 'summon:warband'],
    phase2: 0.5, p2patterns: ['arrowRing', 'stomp', 'charge', 'summon:warband', 'arrowRing'],
    // Les deux promontoires de l'arène (cf. arenas.js) doivent rester une échappatoire
    // réelle pendant une charge au sol (§8/§13 du spec niveau 1) : platformChase ferait
    // sauter le boss sur la même plateforme et neutraliserait tout refuge.
  },
  chariot_commander: {
    // h réduit (190 -> 150) : à 190 (hitbox = h*0.8 = 152px), sa hitbox de
    // charge/sweep dépassait même la plateforme centrale remontée à 130px de
    // dégagement (mesuré : recouvrement de 22px, un joueur immobile dessus se
    // faisait quand même toucher). À 150, hitbox = 120px < 130px : le centre
    // est désormais réellement hors d'atteinte, avec 10px de marge.
    name: 'COMMANDANT DE CHAR', hp: 7000, dmg: 26, h: 150, speed: 130, xp: 280, coins: 150,
    // summon passé de `hoplite`/`archer_auxilia` (ennemis de terrain génériques) au sbire
    // dédié `standard_bearer` (porte-étendard visuellement rattaché au char, cf. brief art).
    patterns: ['sweep', 'javelins', 'sweep', 'summon:standard_bearer'],
    phase2: 0.5, p2patterns: ['sweep', 'javelins', 'javelins', 'sweep', 'summon:standard_bearer'],
  },
  yokai_lord: {
    // PV relevés (8500->13000) et deux ajouts d'identité (retour joueur : l'IA
    // ne perdait jamais contre ce boss, contrairement à R2/R5) : `summon:wisp3`
    // ne posait que des projectiles homing, pas de vrais sbires — remplacé par
    // `summon:spirit_caster` (vrais adversaires) ; `shadowStrike` donne au
    // téléport un vrai coup de sanction au lieu d'un simple repositionnement.
    name: 'SEIGNEUR YŌKAI', hp: 13000, dmg: 24, h: 200, speed: 80, xp: 340, coins: 180, floats: true,
    // summon passé de `spirit_caster` (ennemi de terrain générique) au sbire dédié
    // `lantern_wisp`, qui reprend l'idée d'origine du spec ("wisps") jamais construite en art.
    patterns: ['blink', 'fireballs', 'summon:lantern_wisp', 'shadowStrike'],
    phase2: 0.5, p2patterns: ['shadowStrike', 'ring', 'fireballs', 'blink', 'summon:lantern_wisp', 'shadowStrike'],
  },
  war_engineer: {
    // PV relevés (10000->14000) : la phase 2 n'invoquait plus aucun sbire
    // (seule la phase 1 avait `summon:musketeer`) — sbire ajouté en phase 2
    // aussi, et `turretSweep` (balayage au sol sur toute l'arène) donne à ce
    // boss une attaque distinctive qui récompense l'usage des plateformes
    // (cf. `left_lower`/`right_lower` ajoutées à cette arène).
    name: 'INGÉNIEUR DE GUERRE', hp: 14000, dmg: 26, h: 205, speed: 60, xp: 400, coins: 220,
    // summon passé de `musketeer`/`pikeman` (ennemis de terrain génériques) au sbire dédié
    // `gear_servitor`, qui reprend `renaissance_gear_servitor` (nommé dans le spec, jamais dessiné).
    // `mineField` ajouté le 2026-07-27 (audit winrate : IA gagnait 10/10) — mines statiques
    // réparties sur tout le sol de l'arène, cf. `_execPattern` dans enemy.js.
    patterns: ['volley', 'mortars', 'turretSweep', 'mineField', 'summon:gear_servitor'],
    phase2: 0.5, p2patterns: ['turretSweep', 'mineField', 'mortars', 'volley', 'summon:gear_servitor', 'turretSweep', 'mineField'],
  },
  diesel_behemoth: {
    name: 'BÉHÉMOTH DIESEL', hp: 12000, dmg: 30, h: 195, speed: 70, xp: 480, coins: 260, armored: true,
    // `summon:armored_hound` ajouté (seul boss avec R1 sans aucun sbire jusqu'ici, cf. TODO.md).
    patterns: ['charge', 'flames', 'mortars', 'stomp', 'summon:armored_hound'],
    phase2: 0.45, p2patterns: ['charge', 'flames', 'charge', 'summon:armored_hound', 'mortars', 'stomp'],
  },
  ai_overlord: {
    name: 'IA SUPRÊME', hp: 15000, dmg: 28, h: 230, speed: 110, xp: 600, coins: 400, floats: true, flyH: 150,
    // summon passé de `drone_swarm`/`shield_drone` (ennemis de terrain génériques) au sbire
    // dédié `core_shard`, un fragment du noyau/bouclier hexagonal du boss lui-même.
    // `overloadPulse` ajouté le 2026-07-27 (audit winrate : IA gagnait 10/10) — verrouille la
    // position du héros puis fait détoner une sphère à forte puissance, cf. `_execPattern`.
    patterns: ['beam', 'ring', 'overloadPulse', 'summon:core_shard', 'beam'],
    phase2: 0.5, p2patterns: ['beam', 'overloadPulse', 'ring', 'ring', 'blink', 'beam', 'overloadPulse', 'summon:core_shard'],
  },
};

// ------------------------------------------------------------------- ARMES
AR.WEAPONS = {
  sword: [
    { name: 'Katana usé', mult: 1.0 },
    { name: 'Lame d\'obsidienne', mult: 1.3 },
    { name: 'Katana ancestral', mult: 1.65 },
    { name: 'Lame damasquinée', mult: 2.05 },
    { name: 'Acier trempé au diesel', mult: 2.55 },
    { name: 'Lame à plasma', mult: 3.2 },
  ],
  bow: [
    { name: 'Arc court', mult: 1.0 },
    { name: 'Arc composite', mult: 1.3 },
    { name: 'Arc du tengu', mult: 1.65 },
    { name: 'Arc long renforcé', mult: 2.05 },
    { name: 'Arc mécanique', mult: 2.55 },
    { name: 'Arc à impulsion', mult: 3.2 },
  ],
};

// ------------------------------------------------------------- COMPÉTENCES
// 4 branches, 4 rangs chacune (achat séquentiel), coût progressif : 1 / 2 / 3 / 4 points
AR.SKILLS = [
  {
    id: 'blade', name: 'Voie de la Lame', color: '#e8a545',
    nodes: [
      { id: 'blade1', name: 'Tranchant affûté', cost: 1, desc: 'Dégâts d\'épée +25%' },
      { id: 'blade2', name: 'Souffle du combo', cost: 2, desc: 'Le 3e coup du combo émet une onde tranchante' },
      { id: 'blade3', name: 'Iaijutsu', cost: 3, desc: 'Temps de charge de l\'épée -35%' },
      { id: 'blade4', name: 'Lame fantôme', cost: 4, desc: 'Attaque chargée : +60% portée et dégâts' },
    ],
  },
  {
    id: 'bow', name: 'Voie de l\'Arc', color: '#5cc9a8',
    nodes: [
      { id: 'bow1', name: 'Œil de faucon', cost: 1, desc: 'Dégâts d\'arc +25%' },
      { id: 'bow2', name: 'Bras du tengu', cost: 2, desc: 'Temps de charge de l\'arc -35%' },
      { id: 'bow3', name: 'Pointe explosive', cost: 3, desc: 'La flèche chargée explose à l\'impact' },
      { id: 'bow4', name: 'Tir triple', cost: 4, desc: 'Le tir rapide envoie 3 flèches en éventail' },
    ],
  },
  {
    id: 'body', name: 'Voie du Corps', color: '#e05c7e',
    nodes: [
      { id: 'body1', name: 'Endurance', cost: 1, desc: 'PV max +30' },
      { id: 'body2', name: 'Pas de l\'ombre', cost: 2, desc: 'Recharge du dash -40%' },
      { id: 'body3', name: 'Foulée du vent', cost: 3, desc: 'Vitesse +15%, potions +1 emplacement' },
      { id: 'body4', name: 'Peau de fer', cost: 4, desc: 'Dégâts subis -20%' },
    ],
  },
  {
    id: 'spirit', name: 'Voie de l\'Esprit', color: '#c05cff',
    nodes: [
      { id: 'spirit1', name: 'Éveil', cost: 1, desc: 'Débloque Vague spirituelle (1) et Nuée de kunaïs (2)' },
      { id: 'spirit2', name: 'Méditation', cost: 2, desc: 'Esprit max +50, régénération doublée' },
      { id: 'spirit3', name: 'Illumination', cost: 3, desc: 'Débloque Frappe éclair (3) et Voile temporel (4)' },
      { id: 'spirit4', name: 'Transcendance', cost: 4, desc: 'Sorts : coût -30%, dégâts +50%' },
    ],
  },
];

// ------------------------------------------------------------------- SORTS
AR.SPELLS = [
  { id: 'wave', name: 'Vague spirituelle', key: '1', cost: 25, dmg: 30, desc: 'Onde de choc à 360° qui repousse les ennemis',
    icon: 'spells/icons/wave', cast: 'spells/wave_cast' },
  { id: 'kunai', name: 'Nuée de kunaïs', key: '2', cost: 30, dmg: 14, desc: '5 kunaïs perforants en éventail',
    icon: 'spells/icons/kunai', cast: 'spells/kunai_cast' },
  { id: 'blink', name: 'Frappe éclair', key: '3', cost: 35, dmg: 40, desc: 'Traverse les ennemis en éclair, blessant tout sur le passage',
    icon: 'spells/icons/blink', cast: 'spells/blink_cast' },
  { id: 'veil', name: 'Voile temporel', key: '4', cost: 45, dmg: 0, desc: 'Ralentit tous les ennemis de 50% pendant 5 s',
    icon: 'spells/icons/veil', cast: 'spells/veil_cast' },
];

// ---------------------------------------------------------------- BOUTIQUE
AR.SHOP_POOL = [
  { id: 'potion', name: 'Potion de soin', desc: 'Rend 40% des PV (consommable)', price: 55, icon: 'potion' },
  { id: 'fullheal', name: 'Banquet du voyageur', desc: 'Soigne intégralement', price: 85, icon: 'heart' },
  { id: 'swordUp', name: 'Forge : épée', desc: 'Améliore l\'épée d\'un cran', price: 130, icon: 'sword' },
  { id: 'bowUp', name: 'Forge : arc', desc: 'Améliore l\'arc d\'un cran', price: 130, icon: 'bow' },
  { id: 'crit', name: 'Amulette du prédateur', desc: 'Chance de critique +10%', price: 110, icon: 'gem' },
  { id: 'hpUp', name: 'Cœur de mammouth', desc: 'PV max +25', price: 120, icon: 'heart' },
  { id: 'spiritUp', name: 'Talisman spirituel', desc: 'Esprit max +30', price: 95, icon: 'gem' },
  { id: 'speed', name: 'Bottes de célérité', desc: 'Vitesse de déplacement +10%', price: 90, icon: 'boot' },
  { id: 'scroll', name: 'Parchemin ancien', desc: '+1 point de compétence', price: 150, icon: 'scroll' },
];

// -------------------------------------------------- CHOIX DE FAILLE (rifts)
AR.RIFTS = [
  { id: 'forge', name: 'La Forge', desc: 'Une arme aléatoire gagne un cran de qualité', icon: 'sword' },
  { id: 'sanctuary', name: 'Le Sanctuaire', desc: 'Restaure 60% des PV', icon: 'heart' },
  { id: 'blood', name: 'Pacte sanglant', desc: 'PV max -20%, mais dégâts +40%', icon: 'blood' },
  { id: 'market', name: 'Marché noir', desc: '+120 pièces, prix du prochain marchand -30%', icon: 'coin' },
  { id: 'meditation', name: 'Méditation', desc: '+2 points de compétence', icon: 'scroll' },
  { id: 'chrono', name: 'Le Chronolithe', desc: 'Temps de charge (épée et arc) -20%', icon: 'clock' },
  { id: 'goldcurse', name: 'Malédiction dorée', desc: 'Or +80%, mais les ennemis frappent +25% plus fort', icon: 'skull' },
  { id: 'echo', name: 'Écho spirituel', desc: 'Esprit max +40 et une potion offerte', icon: 'gem' },
];

// Multiplicateurs de difficulté par ère (HP / dégâts des ennemis)
AR.ERA_SCALE = [1.0, 1.25, 1.55, 1.9, 2.3, 2.8];

// Profil de progression "moyenne" d'un joueur qui atteindrait naturellement
// cette ère (niveau, or, crans d'armes, compétences déjà prises, potions).
// Utilisé quand on choisit de démarrer directement sur une ère depuis le menu
// titre, au lieu de toujours repartir de zéro (voir Game#newRun).
AR.ERA_START_PROFILE = [
  { level: 1, coins: 60, swordTier: 0, bowTier: 0, skills: [], skillPoints: 0, potions: 1 },
  { level: 5, coins: 180, swordTier: 1, bowTier: 0, skills: ['blade1'], skillPoints: 2, potions: 2 },
  { level: 9, coins: 380, swordTier: 2, bowTier: 1, skills: ['blade1', 'blade2', 'bow1'], skillPoints: 3, potions: 2 },
  { level: 13, coins: 650, swordTier: 3, bowTier: 2, skills: ['blade1', 'blade2', 'bow1', 'bow2', 'body1'], skillPoints: 4, potions: 3 },
  { level: 17, coins: 980, swordTier: 4, bowTier: 3, skills: ['blade1', 'blade2', 'blade3', 'bow1', 'bow2', 'body1', 'body2'], skillPoints: 3, potions: 3 },
  { level: 21, coins: 1400, swordTier: 5, bowTier: 4, skills: ['blade1', 'blade2', 'blade3', 'bow1', 'bow2', 'body1', 'body2', 'body3', 'spirit1'], skillPoints: 3, potions: 4 },
];

// ---------------------------------------------------- NIVEAUX DE DIFFICULTÉ
// Le mode Normal correspond à l'équilibrage historique. Les modes supérieurs
// réduisent l'or/XP et débloquent des capacités d'IA supplémentaires.
AR.DIFFICULTIES = [
  {
    id: 'normal', name: 'Normal', color: '#5cc9a8',
    desc: 'Les monstres ripostent et vous traquent une fois attaqués.',
    hpMult: 1, dmgMult: 1, goldMult: 1, xpMult: 1,
    speedMult: 1, aggroMult: 1, atkCdMult: 1,
    parryChance: 0.15, dodgeChance: 0.30, ffAware: 0.55,
    canDoubleJump: false, canDash: false, canTeleport: false,
  },
  {
    id: 'hard', name: 'Difficile', color: '#e8a545',
    desc: 'Or/XP -20%. Ennemis véloces : esquives, dashs, parades fréquentes.',
    hpMult: 1.35, dmgMult: 1.25, goldMult: 0.8, xpMult: 0.8,
    speedMult: 1.15, aggroMult: 1.4, atkCdMult: 0.8,
    parryChance: 0.45, dodgeChance: 0.6, ffAware: 0.85,
    canDoubleJump: true, canDash: true, canTeleport: false,
  },
  {
    id: 'nightmare', name: 'Cauchemar', color: '#ff3d6e',
    desc: 'Or/XP -35%. Réflexes implacables, doubles sauts et téléportation.',
    hpMult: 1.8, dmgMult: 1.55, goldMult: 0.65, xpMult: 0.65,
    speedMult: 1.3, aggroMult: 1.9, atkCdMult: 0.65,
    parryChance: 0.7, dodgeChance: 0.85, ffAware: 1,
    canDoubleJump: true, canDash: true, canTeleport: true,
  },
];
