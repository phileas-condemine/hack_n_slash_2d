// Arcane Rift - constantes globales & équilibrage joueur
window.AR = window.AR || {};

AR.C = {
  VIEW_W: 1280, VIEW_H: 720,
  TILE: 48,
  WORLD_H: 32,           // hauteur du monde en tuiles
  GRAV: 1650,
  DT: 1 / 60,            // pas de simulation fixe
  MAX_STEPS: 45,         // garde-fou (mode accéléré compris, jusqu'à ×40)
  SPEED_STEPS: [1, 2, 4, 8, 10, 15, 20, 30, 40],

  PLAYER: {
    W: 34, H: 62, DRAW_H: 92,
    WALK: 160, SPRINT: 265, ACCEL: 2400, AIR_CTRL: 0.75,
    JUMP_VY: -600, DOUBLE_JUMP_VY: -540, JUMP_CUT: 0.45,
    COYOTE: 0.09, BUFFER: 0.12,
    DASH_SPEED: 660, DASH_TIME: 0.16, DASH_CD: 0.5,
    HP: 100, SPIRIT: 100, SPIRIT_REGEN: 4,
    SWORD_DMG: 12, SWORD_CD: 0.28, COMBO_WINDOW: 0.55,
    SWORD_CHARGE_TIME: 0.45, CHARGED_SWORD_MULT: 2.6, CHARGED_SWORD_RANGE: 250,
    BOW_DMG: 9, BOW_CD: 0.30, BOW_CHARGE_TIME: 0.38, CHARGED_BOW_MULT: 2.8,
    ARROW_SPEED: 760, CHARGED_ARROW_SPEED: 1250, ARROW_RANGE: 430,
    CRIT: 0.05, CRIT_MULT: 1.6,
    POTION_HEAL: 0.40, POTION_MAX: 3,
    INVULN: 0.9,
    LEVEL_STAT_GROWTH: 0.01,
  },

  XP_BASE: 60, XP_GROWTH: 1.32,

  // Bind par e.code = position physique -> WASD (QWERTY) == ZQSD (AZERTY)
  KEYS: {
    left:   ['ArrowLeft', 'KeyA'],
    right:  ['ArrowRight', 'KeyD'],
    up:     ['ArrowUp', 'KeyW'],
    down:   ['ArrowDown', 'KeyS'],
    jump:   ['Space', 'ArrowUp', 'KeyW'],
    dash:   ['ShiftLeft', 'ShiftRight'],
    sword:  ['KeyJ'],
    bow:    ['KeyK'],
    interact: ['KeyE'],
    potion: ['KeyF'],
    spell1: ['Digit1'], spell2: ['Digit2'], spell3: ['Digit3'], spell4: ['Digit4'],
    skills: ['KeyT'],
    toggleStats: ['Tab'],
    pause:  ['Escape', 'KeyP'],
    demo:   ['KeyG'],
    speedUp: ['Equal', 'NumpadAdd'],
    speedDown: ['Minus', 'NumpadSubtract'],
    record: ['KeyR'],
    shot:   ['KeyC'],
    mute:   ['KeyM'],
    confirm: ['Enter', 'NumpadEnter'],
  },

  COLORS: {
    spirit: '#35e0c0', spiritDark: '#1a8f7c',
    impact: '#ffe9a3', danger: '#ff3d6e', magic: '#c05cff',
    hp: '#e84545', hpDark: '#7c1f2d',
    xp: '#7ec8ff', gold: '#ffc94d',
    uiBg: 'rgba(10,14,18,0.82)', uiEdge: '#3a4a52',
    text: '#e8e2d4', textDim: '#9aa5a8',
  },
};
