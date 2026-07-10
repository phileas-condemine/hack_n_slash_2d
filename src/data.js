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
  stone_spear:    { name: 'Lancier tribal', hp: 26, dmg: 10, speed: 95, xp: 12, coins: 4, h: 78, behavior: 'melee', range: 62, aggro: 420, atkCd: 1.3, tele: 0.45 },
  stone_slinger:  { name: 'Frondeur', hp: 20, dmg: 8, speed: 80, xp: 14, coins: 5, h: 80, behavior: 'ranged', range: 460, keep: 300, aggro: 520, atkCd: 1.9, tele: 0.55, proj: 'rock' },
  beast_hunter:   { name: 'Chasseur de bêtes', hp: 30, dmg: 12, speed: 150, xp: 16, coins: 6, h: 82, behavior: 'melee', range: 58, aggro: 480, atkCd: 0.95, tele: 0.3, facing: 'l', parry: true },
  stone_brute:    { name: 'Brute au gourdin', hp: 62, dmg: 18, speed: 65, xp: 24, coins: 9, h: 92, behavior: 'brute', range: 92, aggro: 400, atkCd: 1.9, tele: 0.6, facing: 'l', knock: 320 },
  war_shaman:     { name: 'Chaman de guerre', hp: 34, dmg: 9, speed: 55, xp: 26, coins: 10, h: 96, behavior: 'caster', range: 560, keep: 340, aggro: 600, atkCd: 2.6, tele: 0.7, proj: 'wisp' },
  mammoth_rider:  { name: 'Monteur de mammouth', hp: 150, dmg: 22, speed: 70, xp: 60, coins: 25, h: 128, behavior: 'charger', range: 480, aggro: 560, atkCd: 2.6, tele: 0.75, chargeSpeed: 420, knock: 380, elite: true },

  // --- Antiquité
  hoplite:        { name: 'Hoplite', hp: 40, dmg: 12, speed: 90, xp: 16, coins: 6, h: 82, behavior: 'shield', range: 64, aggro: 430, atkCd: 1.4, tele: 0.45, block: 0.6 },
  archer_auxilia: { name: 'Archer auxiliaire', hp: 24, dmg: 10, speed: 85, xp: 16, coins: 6, h: 84, behavior: 'ranged', range: 560, keep: 360, aggro: 620, atkCd: 1.7, tele: 0.5, proj: 'arrow' },
  desert_raider:  { name: 'Pillard du désert', hp: 34, dmg: 13, speed: 160, xp: 18, coins: 8, h: 84, behavior: 'melee', range: 60, aggro: 500, atkCd: 0.9, tele: 0.28, facing: 'l', parry: true },
  elephant_guard: { name: 'Garde à éléphant', hp: 170, dmg: 24, speed: 60, xp: 55, coins: 20, h: 132, behavior: 'charger', range: 460, aggro: 540, atkCd: 2.8, tele: 0.8, chargeSpeed: 380, knock: 400 },
  temple_guardian:{ name: 'Gardien du temple', hp: 130, dmg: 20, speed: 45, xp: 50, coins: 22, h: 118, behavior: 'shield', range: 88, aggro: 380, atkCd: 2.1, tele: 0.65, block: 0.85, knock: 340, elite: true },

  // --- Japon médiéval
  ronin:          { name: 'Rônin', hp: 44, dmg: 15, speed: 130, xp: 22, coins: 9, h: 80, behavior: 'melee', range: 78, aggro: 480, atkCd: 1.0, tele: 0.32, combo2: true, parry: true },
  ninja_assassin: { name: 'Assassin ninja', hp: 30, dmg: 14, speed: 190, xp: 26, coins: 11, h: 78, behavior: 'assassin', range: 58, aggro: 560, atkCd: 1.6, tele: 0.3, facing: 'l', blinkCd: 3.2, parry: true },
  tengu_archer:   { name: 'Archer tengu', hp: 34, dmg: 12, speed: 100, xp: 24, coins: 10, h: 92, behavior: 'ranged', range: 600, keep: 380, aggro: 660, atkCd: 1.5, tele: 0.45, proj: 'arrow', hop: true },
  spirit_caster:  { name: 'Invocateur d\'esprits', hp: 40, dmg: 11, speed: 60, xp: 30, coins: 13, h: 100, behavior: 'caster', range: 620, keep: 380, aggro: 680, atkCd: 2.4, tele: 0.65, proj: 'wisp', float: true },
  oni_brute:      { name: 'Brute oni', hp: 130, dmg: 24, speed: 75, xp: 55, coins: 22, h: 108, behavior: 'brute', range: 100, aggro: 420, atkCd: 1.7, tele: 0.55, knock: 380, elite: true, facing: 'l' },

  // --- Renaissance
  pikeman:        { name: 'Piquier', hp: 48, dmg: 14, speed: 85, xp: 24, coins: 10, h: 84, behavior: 'melee', range: 105, aggro: 440, atkCd: 1.5, tele: 0.5 },
  musketeer:      { name: 'Mousquetaire', hp: 30, dmg: 16, speed: 80, xp: 26, coins: 11, h: 76, behavior: 'ranged', range: 640, keep: 420, aggro: 700, atkCd: 2.3, tele: 0.7, proj: 'bullet' },
  bombardier:     { name: 'Bombardier', hp: 36, dmg: 18, speed: 75, xp: 28, coins: 12, h: 84, behavior: 'artillery', range: 520, keep: 320, aggro: 600, atkCd: 2.6, tele: 0.6, proj: 'bomb' },
  mortar_crew:    { name: 'Servants de mortier', hp: 60, dmg: 20, speed: 40, xp: 34, coins: 14, h: 92, behavior: 'artillery', range: 720, keep: 420, aggro: 780, atkCd: 3.2, tele: 0.8, proj: 'mortar' },
  armored_captain:{ name: 'Capitaine cuirassé', hp: 160, dmg: 22, speed: 70, xp: 60, coins: 26, h: 106, behavior: 'shield', range: 84, aggro: 420, atkCd: 1.8, tele: 0.55, block: 0.8, knock: 360, elite: true },

  // --- Guerre diesel
  trench_soldier: { name: 'Soldat des tranchées', hp: 46, dmg: 14, speed: 95, xp: 28, coins: 11, h: 82, behavior: 'ranged', range: 520, keep: 300, aggro: 620, atkCd: 1.8, tele: 0.5, proj: 'bullet', bayonet: true },
  flamethrower:   { name: 'Lance-flammes', hp: 70, dmg: 6, speed: 70, xp: 34, coins: 14, h: 88, behavior: 'ranged', range: 240, keep: 170, aggro: 460, atkCd: 2.4, tele: 0.55, proj: 'flame' },
  armored_trooper:{ name: 'Trooper blindé', hp: 110, dmg: 18, speed: 60, xp: 40, coins: 16, h: 92, behavior: 'shield', range: 76, aggro: 400, atkCd: 1.7, tele: 0.5, block: 0.85, knock: 320 },
  roller_scout:   { name: 'Éclaireur à rouleau', hp: 120, dmg: 20, speed: 80, xp: 48, coins: 20, h: 96, behavior: 'charger', range: 520, aggro: 600, atkCd: 2.2, tele: 0.6, chargeSpeed: 500, knock: 360, elite: true },

  // --- Ère cyber
  corp_trooper:   { name: 'Trooper corporate', hp: 55, dmg: 16, speed: 110, xp: 32, coins: 13, h: 78, behavior: 'ranged', range: 560, keep: 340, aggro: 660, atkCd: 1.4, tele: 0.4, proj: 'plasma', burst: 3 },
  laser_trooper:  { name: 'Trooper laser', hp: 60, dmg: 20, speed: 90, xp: 36, coins: 15, h: 84, behavior: 'ranged', range: 720, keep: 440, aggro: 780, atkCd: 2.6, tele: 0.9, proj: 'laser' },
  hover_gunner:   { name: 'Mitrailleur hover', hp: 65, dmg: 14, speed: 140, xp: 38, coins: 16, h: 74, behavior: 'flyer', range: 480, keep: 300, aggro: 640, atkCd: 1.7, tele: 0.45, proj: 'plasma', flyH: 130 },
  drone_swarm:    { name: 'Nuée de drones', hp: 45, dmg: 12, speed: 170, xp: 30, coins: 12, h: 84, behavior: 'flyer', range: 60, aggro: 640, atkCd: 1.9, tele: 0.4, dive: true, flyH: 150 },
  shield_drone:   { name: 'Drone bouclier', hp: 90, dmg: 10, speed: 100, xp: 42, coins: 18, h: 86, behavior: 'flyer', range: 420, keep: 260, aggro: 600, atkCd: 2.2, tele: 0.5, proj: 'plasma', flyH: 110, shielded: 40 },
  mech_assassin:  { name: 'Assassin mécanisé', hp: 120, dmg: 22, speed: 220, xp: 65, coins: 28, h: 94, behavior: 'assassin', range: 70, aggro: 700, atkCd: 1.3, tele: 0.26, blinkCd: 2.4, elite: true, parry: true },
};

// ------------------------------------------------------------------ LES BOSS
AR.BOSSES = {
  mammoth_chief: {
    name: 'CHEF MAMMOUTH', hp: 550, dmg: 24, h: 210, speed: 90, xp: 220, coins: 120,
    patterns: ['charge', 'stomp', 'summon:stone_spear', 'charge'],
    phase2: 0.5, p2patterns: ['charge', 'rocks', 'stomp', 'charge', 'summon:beast_hunter'],
  },
  chariot_commander: {
    name: 'COMMANDANT DE CHAR', hp: 700, dmg: 26, h: 190, speed: 130, xp: 280, coins: 150,
    patterns: ['sweep', 'javelins', 'sweep', 'summon:hoplite'],
    phase2: 0.5, p2patterns: ['sweep', 'javelins', 'javelins', 'sweep', 'summon:archer_auxilia'],
  },
  yokai_lord: {
    name: 'SEIGNEUR YŌKAI', hp: 850, dmg: 24, h: 200, speed: 80, xp: 340, coins: 180, floats: true,
    patterns: ['blink', 'fireballs', 'summon:wisp3', 'fireballs'],
    phase2: 0.5, p2patterns: ['blink', 'ring', 'fireballs', 'blink', 'ring', 'summon:wisp3'],
  },
  war_engineer: {
    name: 'INGÉNIEUR DE GUERRE', hp: 1000, dmg: 26, h: 205, speed: 60, xp: 400, coins: 220,
    patterns: ['volley', 'mortars', 'volley', 'summon:musketeer'],
    phase2: 0.5, p2patterns: ['volley', 'mortars', 'mortars', 'charge', 'volley'],
  },
  diesel_behemoth: {
    name: 'BÉHÉMOTH DIESEL', hp: 1200, dmg: 30, h: 195, speed: 70, xp: 480, coins: 260, armored: true,
    patterns: ['charge', 'flames', 'mortars', 'stomp'],
    phase2: 0.45, p2patterns: ['charge', 'flames', 'charge', 'mortars', 'stomp'],
  },
  ai_overlord: {
    name: 'IA SUPRÊME', hp: 1500, dmg: 28, h: 230, speed: 110, xp: 600, coins: 400, floats: true, flyH: 150,
    patterns: ['beam', 'ring', 'summon:drone_swarm', 'beam'],
    phase2: 0.5, p2patterns: ['beam', 'ring', 'ring', 'blink', 'beam', 'summon:shield_drone'],
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
// 4 branches, 4 rangs chacune (achat séquentiel), 1 point par rang
AR.SKILLS = [
  {
    id: 'blade', name: 'Voie de la Lame', color: '#e8a545',
    nodes: [
      { id: 'blade1', name: 'Tranchant affûté', desc: 'Dégâts d\'épée +25%' },
      { id: 'blade2', name: 'Souffle du combo', desc: 'Le 3e coup du combo émet une onde tranchante' },
      { id: 'blade3', name: 'Iaijutsu', desc: 'Temps de charge de l\'épée -35%' },
      { id: 'blade4', name: 'Lame fantôme', desc: 'Attaque chargée : +60% portée et dégâts' },
    ],
  },
  {
    id: 'bow', name: 'Voie de l\'Arc', color: '#5cc9a8',
    nodes: [
      { id: 'bow1', name: 'Œil de faucon', desc: 'Dégâts d\'arc +25%' },
      { id: 'bow2', name: 'Bras du tengu', desc: 'Temps de charge de l\'arc -35%' },
      { id: 'bow3', name: 'Pointe explosive', desc: 'La flèche chargée explose à l\'impact' },
      { id: 'bow4', name: 'Tir triple', desc: 'Le tir rapide envoie 3 flèches en éventail' },
    ],
  },
  {
    id: 'body', name: 'Voie du Corps', color: '#e05c7e',
    nodes: [
      { id: 'body1', name: 'Endurance', desc: 'PV max +30' },
      { id: 'body2', name: 'Pas de l\'ombre', desc: 'Recharge du dash -40%' },
      { id: 'body3', name: 'Foulée du vent', desc: 'Vitesse +15%, potions +1 emplacement' },
      { id: 'body4', name: 'Peau de fer', desc: 'Dégâts subis -20%' },
    ],
  },
  {
    id: 'spirit', name: 'Voie de l\'Esprit', color: '#c05cff',
    nodes: [
      { id: 'spirit1', name: 'Éveil', desc: 'Débloque Vague spirituelle (1) et Nuée de kunaïs (2)' },
      { id: 'spirit2', name: 'Méditation', desc: 'Esprit max +50, régénération doublée' },
      { id: 'spirit3', name: 'Illumination', desc: 'Débloque Frappe éclair (3) et Voile temporel (4)' },
      { id: 'spirit4', name: 'Transcendance', desc: 'Sorts : coût -30%, dégâts +50%' },
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
