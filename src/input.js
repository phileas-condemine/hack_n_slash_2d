// Arcane Rift - entrées clavier/souris + entrées virtuelles pour l'IA démo
window.AR = window.AR || {};

AR.Input = {
  keys: {},          // e.code -> bool
  actions: {},       // action -> bool (état courant)
  prev: {},          // action -> bool (frame précédente)
  mouse: { x: 0, y: 0, left: false, right: false, prevLeft: false, prevRight: false },
  virtual: false,    // true = piloté par l'IA démo
  v: {},             // état virtuel des actions
  vAim: { x: 0, y: 0 },  // visée virtuelle (coordonnées monde)
  touch: {},         // état des actions pilotées par les contrôles tactiles (s'ajoute au clavier, ne l'écrase pas)
  canvas: null,
  scale: 1, offX: 0, offY: 0,
  clicks: [],        // clics UI (consommés par les menus)

  init(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      AR.Audio.unlock();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouse.left = this.mouse.right = false; this.touch = {}; });

    canvas.addEventListener('mousemove', (e) => this._updateMouse(e));
    canvas.addEventListener('mousedown', (e) => {
      this._updateMouse(e);
      if (e.button === 0) { this.mouse.left = true; this.clicks.push({ x: this.mouse.x, y: this.mouse.y }); }
      if (e.button === 2) this.mouse.right = true;
      AR.Audio.unlock();
      e.preventDefault();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // tap tactile hors des contrôles de jeu (menus/pause/titre) -> équivalent d'un clic gauche UI
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
      this._updateMouse(e);
      this.clicks.push({ x: this.mouse.x, y: this.mouse.y });
      AR.Audio.unlock();
    });
  },

  _updateMouse(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = (e.clientX - r.left) * (AR.C.VIEW_W / r.width);
    this.mouse.y = (e.clientY - r.top) * (AR.C.VIEW_H / r.height);
  },

  // À appeler une fois par frame de rendu (pas par pas de simulation)
  update() {
    this.prev = Object.assign({}, this.actions);
    const a = {};
    for (const action in AR.C.KEYS) {
      a[action] = AR.C.KEYS[action].some((code) => this.keys[code]);
    }
    // la souris s'ajoute au clavier pour les attaques
    a.sword = a.sword || this.mouse.left;
    a.bow = a.bow || this.mouse.right;
    // les contrôles tactiles s'ajoutent au clavier/souris (ne les remplacent pas)
    for (const action in this.touch) { if (this.touch[action]) a[action] = true; }
    if (this.virtual) {
      // l'IA écrase les actions de gameplay, mais pas les touches "méta"
      const meta = ['pause', 'demo', 'speedUp', 'speedDown', 'record', 'shot', 'mute', 'log', 'confirm', 'skills', 'toggleStats'];
      for (const action in a) { if (!meta.includes(action)) a[action] = !!this.v[action]; }
    }
    this.actions = a;
    this.mouse.prevLeft = this.mouse.left;
    this.mouse.prevRight = this.mouse.right;
  },

  down(action) { return !!this.actions[action]; },
  pressed(action) { return !!this.actions[action] && !this.prev[action]; },
  released(action) { return !this.actions[action] && !!this.prev[action]; },

  // position de visée en coordonnées monde
  aim(cam) {
    if (this.virtual) return { x: this.vAim.x, y: this.vAim.y };
    return { x: this.mouse.x + cam.cx(), y: this.mouse.y + cam.cy() };
  },

  setVirtual(state, aimX, aimY) {
    this.v = state || {};
    if (aimX !== undefined) { this.vAim.x = aimX; this.vAim.y = aimY; }
  },

  consumeClick() { return this.clicks.shift(); },
  clearClicks() { this.clicks.length = 0; },
};
