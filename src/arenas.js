// Arcane Rift - arènes de boss et surfaces de collision normalisées
// Source : _extpack/arcane-rift-extension-pack/assets/arenas/boss/metadata/*.platforms.json
window.AR = window.AR || {};

AR.BOSS_ARENAS = {
  mammoth_chief: {
    id: 'stone_age_mammoth_chief', image: 'arenas/boss/arena_01_canyon_tribal',
    sourceSize: { width: 1672, height: 941 },
    platforms: [
      { id: 'ground_main', x: 0.062201, y: 0.701382, w: 0.875598, h: 0.073326, ground: true },
      { id: 'left_front_low', x: 0, y: 0.609989, w: 0.183612, h: 0.024442 },
      // Relais invisibles (l'arène n'est qu'une image de fond, aucun rendu propre à
      // ces plateformes) : atteindre left_mid/right_mid depuis le sol demande 183px
      // de montée, hors de portée d'un simple saut (~71px mesuré) et au-delà même
      // d'un double saut bien exécuté (~174px max, non fiable). Deux relais à ~60-65px
      // d'écart ramènent la montée à trois sauts simples successifs, exécutables sans
      // technique de saut précise, pour que le promontoire reste une échappatoire
      // réelle pendant la charge du mammouth (cf. 00_pre_requis §10.4 / 01_niveau §8).
      { id: 'left_step1', x: 0.14, y: 0.6111, w: 0.12, h: 0.02 },
      { id: 'left_step2', x: 0.15, y: 0.5208, w: 0.12, h: 0.02 },
      { id: 'left_mid', x: 0.123804, y: 0.447396, w: 0.168062, h: 0.029756 },
      { id: 'center_back_small', x: 0.416268, y: 0.656748, w: 0.069976, h: 0.017003 },
      { id: 'right_step1', x: 0.74, y: 0.6111, w: 0.12, h: 0.02 },
      { id: 'right_step2', x: 0.73, y: 0.5208, w: 0.12, h: 0.02 },
      { id: 'right_mid', x: 0.709928, y: 0.446334, w: 0.167464, h: 0.029756 },
      { id: 'right_front_low', x: 0.805024, y: 0.615303, w: 0.194976, h: 0.024442 },
    ],
  },
  chariot_commander: {
    id: 'antiquity_war_chariot_commander', image: 'arenas/boss/arena_02_acropole_ruins',
    sourceSize: { width: 1672, height: 941 },
    platforms: [
      { id: 'ground_main', x: 0.066986, y: 0.717322, w: 0.866029, h: 0.061637, ground: true },
      { id: 'left_pedestal', x: 0.110048, y: 0.649309, w: 0.186005, h: 0.028693 },
      { id: 'center_dais', x: 0.412679, y: 0.564293, w: 0.175239, h: 0.030818 },
      { id: 'right_pedestal', x: 0.703947, y: 0.649309, w: 0.186005, h: 0.028693 },
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
