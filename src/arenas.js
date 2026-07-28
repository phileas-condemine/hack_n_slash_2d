// Arcane Rift - arènes de boss et surfaces de collision normalisées
// Source : _extpack/arcane-rift-extension-pack/assets/arenas/boss/metadata/*.platforms.json
window.AR = window.AR || {};

AR.BOSS_ARENAS = {
  mammoth_chief: {
    id: 'stone_age_mammoth_chief', image: 'arenas/boss/arena_01_canyon_tribal',
    sourceSize: { width: 1672, height: 941 },
    platforms: [
      { id: 'ground_main', x: 0.062201, y: 0.701382, w: 0.875598, h: 0.073326, ground: true },
      // left_front_low/left_step1 (et leurs symétriques right_*) étaient quasi à la
      // même hauteur et se chevauchaient en x : fusionnés en un seul palier bas par
      // côté. Relais invisibles (l'arène n'est qu'une image de fond) : depuis le sol,
      // un simple saut (~71px mesuré) atteint ce palier bas (~65px de montée) ; de là,
      // rejoindre left_mid/right_mid (~117px de montée) demande un double saut.
      { id: 'left_low', x: 0, y: 0.610545, w: 0.26, h: 0.022221 },
      { id: 'left_mid', x: 0.123804, y: 0.447396, w: 0.168062, h: 0.029756 },
      { id: 'right_mid', x: 0.709928, y: 0.446334, w: 0.167464, h: 0.029756 },
      { id: 'right_low', x: 0.74, y: 0.613202, w: 0.26, h: 0.022221 },
    ],
  },
  chariot_commander: {
    id: 'antiquity_war_chariot_commander', image: 'arenas/boss/arena_02_acropole_ruins',
    sourceSize: { width: 1672, height: 941 },
    // Le char reste au sol et tire à distance pour punir les campeurs : le
    // joueur doit sans cesse changer de plateforme plutôt que de s'y figer.
    // Le sol était trop proche des pedestaux/paliers (~49-55px, à peine plus
    // que la hauteur du héros) : monter dessus ne dégageait pas vraiment de la
    // hitbox de charge/sweep du char, qui restait donc quasi impossible à
    // esquiver par l'escalade. Sol abaissé et paliers remontés pour restaurer
    // une vraie garde-hauteur (~95-100px, un saut simple fiable par palier).
    platforms: [
      { id: 'ground_main', x: 0.066986, y: 0.78, w: 0.866029, h: 0.061637, ground: true },
      { id: 'left_pedestal', x: 0.110048, y: 0.645, w: 0.186005, h: 0.028693 },
      // Aligné sur le plateau de l'autel central (pas de palier intermédiaire :
      // s'y réfugier pendant le sweep du char demande donc un double saut précis).
      { id: 'center_dais', x: 0.412679, y: 0.60, w: 0.175239, h: 0.030818 },
      { id: 'right_pedestal', x: 0.703947, y: 0.645, w: 0.186005, h: 0.028693 },
    ],
  },
  yokai_lord: {
    id: 'medieval_japan_yokai_lord', image: 'arenas/boss/arena_03_sanctuaire_montagne',
    sourceSize: { width: 1672, height: 941 },
    platforms: [
      { id: 'ground_main', x: 0.113636, y: 0.702444, w: 0.770933, h: 0.061637, ground: true },
      { id: 'left_upper', x: 0.080144, y: 0.416578, w: 0.150718, h: 0.025505 },
      { id: 'left_lower', x: 0.0939, y: 0.611052, w: 0.184211, h: 0.024442 },
      { id: 'center_mid', x: 0.444378, y: 0.517535, w: 0.116029, h: 0.021254 },
      { id: 'right_lower', x: 0.722488, y: 0.611052, w: 0.184211, h: 0.024442 },
      { id: 'right_upper', x: 0.770335, y: 0.395324, w: 0.149522, h: 0.025505 },
    ],
  },
  war_engineer: {
    id: 'renaissance_war_engineer', image: 'arenas/boss/arena_04_forteresse_mecanique',
    sourceSize: { width: 1672, height: 941 },
    platforms: [
      { id: 'ground_main', x: 0.094498, y: 0.750266, w: 0.811603, h: 0.053135, ground: true },
      // Le fond illustré prévoit deux rampes en bois de part et d'autre, menant du
      // sol jusqu'au sommet de left_upper/right_upper (~136px de montée depuis ce
      // palier, contre ~226px directement depuis le sol — hors de portée d'un
      // double saut). Sans collision dessus, ces rampes étaient purement décoratives
      // et les plateformes hautes restaient inatteignables. Paliers ajoutés en
      // symétrie sur le palier bas mesuré (~90px de montée depuis le sol).
      { id: 'left_lower', x: 0.10, y: 0.625, w: 0.12, h: 0.025 },
      { id: 'right_lower', x: 0.78, y: 0.625, w: 0.12, h: 0.025 },
      { id: 'left_upper', x: 0.15012, y: 0.435707, w: 0.226077, h: 0.028693 },
      { id: 'center_bridge', x: 0.395933, y: 0.380446, w: 0.20634, h: 0.025505 },
      { id: 'right_upper', x: 0.623804, y: 0.435707, w: 0.226675, h: 0.028693 },
      { id: 'center_hanging', x: 0.428828, y: 0.270988, w: 0.141148, h: 0.026567 },
    ],
  },
  diesel_behemoth: {
    id: 'diesel_war_diesel_behemoth', image: 'arenas/boss/arena_05_usine_guerre',
    sourceSize: { width: 1672, height: 941 },
    platforms: [
      { id: 'ground_main', x: 0.126196, y: 0.624867, w: 0.747608, h: 0.05101, ground: true },
      { id: 'left_bunker_top', x: 0.062201, y: 0.505845, w: 0.245215, h: 0.025505 },
      { id: 'right_bunker_top', x: 0.691986, y: 0.505845, w: 0.245215, h: 0.025505 },
    ],
  },
  // Arène des Gladiateurs (Fosse des Esclaves, ère 2) : PAS un boss de fin d'ère — un
  // set-piece à 5 duels en haut du monte-charge (cf. `gladiatorArena` dans
  // AR.LEVEL_SPECS.antiquity, `Level#activateGladiatorArena`). Réutilise entièrement le
  // pipeline "arène illustrée" des vrais boss (image de fond + plateformes normalisées +
  // écran verrouillé) via un emprunt temporaire de `Level#bossArena`, cf. le commentaire
  // détaillé sur `activateGladiatorArena`.
  gladiator_pit: {
    id: 'antiquity_gladiator_pit', image: 'arenas/special/arena_07_slave_pit',
    sourceSize: { width: 1672, height: 941 },
    platforms: [
      { id: 'ground_main', x: 0.06, y: 0.68, w: 0.88, h: 0.06, ground: true },
    ],
  },
  ai_overlord: {
    id: 'futuristic_cyber_ai_overlord', image: 'arenas/boss/arena_06_cite_flottante',
    sourceSize: { width: 1672, height: 941 },
    platforms: [
      { id: 'ground_main', x: 0.048445, y: 0.706695, w: 0.904904, h: 0.05101, ground: true },
      { id: 'left_platform', x: 0.078947, y: 0.582359, w: 0.260766, h: 0.02763 },
      { id: 'center_platform', x: 0.375, y: 0.475027, w: 0.251196, h: 0.025505 },
      { id: 'right_platform', x: 0.660287, y: 0.582359, w: 0.260766, h: 0.02763 },
    ],
  },
};
