// Arcane Rift - contrôles tactiles (mobile). Purement additif : n'existe que sur écran tactile,
// n'écrit que dans AR.Input.touch / AR.Input.mouse, ne modifie jamais le gameplay lui-même.
window.AR = window.AR || {};

AR.Touch = {
  enabled: false,
  canvas: null,
  root: null,
  aimTouched: false,   // true dès que le joueur a manipulé le stick de visée au moins une fois
  demoTimer: null,

  moveStick: { active: false, id: null, baseX: 0, baseY: 0 },
  aimStick: { active: false, id: null, baseX: 0, baseY: 0 },

  init(canvas) {
    this.canvas = canvas;
    this.enabled = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (!this.enabled) return;

    document.body.classList.add('touch-mode');
    AR.Input.mouse.x = AR.C.VIEW_W / 2 + 200;
    AR.Input.mouse.y = AR.C.VIEW_H / 2;

    this._buildDom();
    this._bindStick(this.zones.move, this.moveStick, (dx, dy) => this._onMove(dx, dy), () => this._onMoveEnd());
    // relâcher le stick de visée ne réinitialise rien : la dernière direction visée est conservée
    this._bindStick(this.zones.aim, this.aimStick, (dx, dy) => this._onAim(dx, dy), () => {});
    this._bindButtons();

    window.addEventListener('resize', () => this._layout());
    window.addEventListener('orientationchange', () => this._layout());
    this._layout();
    this._tick();
  },

  _buildDom() {
    const root = document.createElement('div');
    root.id = 'touchUI';
    root.innerHTML = `
      <div class="tzone tzone-move"><div class="tstick"><div class="tknob"></div></div></div>
      <div class="tzone tzone-aim"><div class="tstick"><div class="tknob"></div></div></div>
      <button class="tbtn tbtn-jump" data-action="jump">Saut</button>
      <button class="tbtn tbtn-dash" data-action="dash">Dash</button>
      <button class="tbtn tbtn-sword" data-action="sword">Épée</button>
      <button class="tbtn tbtn-bow" data-action="bow">Arc</button>
      <button class="tbtn tbtn-potion" data-action="potion">Potion</button>
      <button class="tbtn tbtn-interact" data-action="interact">E</button>
      <button class="tbtn tbtn-pause" data-action="pause">⏸</button>
      <button class="tbtn tbtn-demo" data-action="demo"><span class="tring"></span><span class="tlabel">IA</span></button>
      <div class="tspeed">
        <button class="tbtn tbtn-speeddown" data-action="speedDown">−</button>
        <span class="tspeed-val">×1</span>
        <button class="tbtn tbtn-speedup" data-action="speedUp">+</button>
      </div>`;
    document.body.appendChild(root);
    this.root = root;
    this.zones = {
      move: root.querySelector('.tzone-move'),
      aim: root.querySelector('.tzone-aim'),
    };
    this.speedVal = root.querySelector('.tspeed-val');
    this.speedBox = root.querySelector('.tspeed');
    this.demoBtn = root.querySelector('.tbtn-demo');
  },

  _layout() {
    const r = this.canvas.getBoundingClientRect();
    this.root.style.left = r.left + 'px';
    this.root.style.top = r.top + 'px';
    this.root.style.width = r.width + 'px';
    this.root.style.height = r.height + 'px';
  },

  // --- sticks flottants (apparaissent où le doigt touche l'écran) ---
  _bindStick(zone, state, onMove, onEnd) {
    const knob = zone.querySelector('.tknob');
    const stick = zone.querySelector('.tstick');
    const RADIUS = 52;
    zone.addEventListener('pointerdown', (e) => {
      if (state.active) return;
      state.active = true;
      state.id = e.pointerId;
      const r = zone.getBoundingClientRect();
      state.baseX = e.clientX; state.baseY = e.clientY;
      stick.style.left = (e.clientX - r.left) + 'px';
      stick.style.top = (e.clientY - r.top) + 'px';
      stick.classList.add('show');
      zone.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (!state.active || e.pointerId !== state.id) return;
      let dx = (e.clientX - state.baseX) / RADIUS;
      let dy = (e.clientY - state.baseY) / RADIUS;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      knob.style.transform = `translate(${dx * RADIUS}px, ${dy * RADIUS}px)`;
      onMove(dx, dy, len);
      e.preventDefault();
    });
    const release = (e) => {
      if (!state.active || (e.pointerId !== undefined && e.pointerId !== state.id)) return;
      state.active = false; state.id = null;
      knob.style.transform = 'translate(0,0)';
      stick.classList.remove('show');
      onEnd();
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
  },

  _onMove(dx, dy) {
    const DEAD = 0.35;
    AR.Input.touch.left = dx < -DEAD;
    AR.Input.touch.right = dx > DEAD;
    AR.Input.touch.up = dy < -DEAD;
    AR.Input.touch.down = dy > DEAD;
  },
  _onMoveEnd() {
    AR.Input.touch.left = AR.Input.touch.right = AR.Input.touch.up = AR.Input.touch.down = false;
  },

  _onAim(dx, dy) {
    this.aimTouched = true;
    const K = 260;
    AR.Input.mouse.x = AR.C.VIEW_W / 2 + dx * K;
    AR.Input.mouse.y = AR.C.VIEW_H / 2 + dy * K;
  },

  // --- boutons ---
  _bindButtons() {
    this.root.querySelectorAll('.tbtn[data-action]').forEach((btn) => {
      const action = btn.dataset.action;
      if (action === 'demo') { this._bindDemoBtn(btn); return; }
      const down = (e) => { AR.Input.touch[action] = true; btn.classList.add('active'); e.preventDefault(); };
      const up = (e) => { AR.Input.touch[action] = false; btn.classList.remove('active'); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    });
  },

  // appui long (~600ms) pour éviter un basculement IA accidentel en plein combat
  _bindDemoBtn(btn) {
    const HOLD_MS = 600;
    const start = (e) => {
      btn.classList.add('charging');
      this.demoTimer = setTimeout(() => {
        AR.Input.touch.demo = true;
        btn.classList.add('fired');
      }, HOLD_MS);
      e.preventDefault();
    };
    const cancel = () => {
      clearTimeout(this.demoTimer);
      btn.classList.remove('charging', 'fired');
      AR.Input.touch.demo = false;
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('pointerup', cancel);
    btn.addEventListener('pointercancel', cancel);
    btn.addEventListener('pointerleave', cancel);
  },

  // --- boucle d'affichage (visibilité selon l'état de partie, valeur de vitesse, visée par défaut) ---
  _tick() {
    this._update();
    requestAnimationFrame(() => this._tick());
  },
  _update() {
    const g = AR.game;
    const playing = !!g && g.state === 'play' && !g.paused && !g.skillOpen && !g.shopOpen;
    this.root.classList.toggle('hidden', !playing);
    if (!playing) {
      if (this.moveStick.active || this.aimStick.active) { this.moveStick.active = false; this.aimStick.active = false; }
      AR.Input.touch = {};
      return;
    }
    this.speedBox.classList.toggle('show', !!g.demo);
    if (g.demo) this.speedVal.textContent = '×' + g.speed;
    // tant que le joueur n'a jamais touché le stick de visée, viser dans le sens du regard
    if (!this.aimTouched && !this.aimStick.active && g.player) {
      AR.Input.mouse.x = AR.C.VIEW_W / 2 + g.player.facing * 200;
      AR.Input.mouse.y = AR.C.VIEW_H / 2;
    }
  },
};
