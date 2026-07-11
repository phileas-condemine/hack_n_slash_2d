// Arcane Rift - édition de texte : <input> DOM superposé au canvas (renommer une sauvegarde)
window.AR = window.AR || {};

AR.TextEdit = {
  el: null,
  active: false,
  canvas: null,
  _rect: null,
  _onCommit: null,

  init(canvas) {
    this.canvas = canvas;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 40;
    input.autocomplete = 'off';
    input.style.position = 'fixed';
    input.style.display = 'none';
    input.style.zIndex = '10';
    input.style.boxSizing = 'border-box';
    input.style.font = 'bold 16px "Segoe UI", sans-serif';
    input.style.background = 'rgba(10,14,18,0.95)';
    input.style.color = '#e8e2d4';
    input.style.border = '2px solid #35e0c0';
    input.style.borderRadius = '2px';
    input.style.padding = '2px 6px';
    input.style.outline = 'none';
    document.body.appendChild(input);
    this.el = input;

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this._commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); this._close(); }
    });
    input.addEventListener('blur', () => { if (this.active) this._commit(); });
    window.addEventListener('resize', () => { if (this.active && this._rect) this._position(this._rect); });
  },

  // rect : {x,y,w,h} en coordonnées canvas (0..VIEW_W / 0..VIEW_H)
  open(rect, value, onCommit) {
    if (this.active) this._commit();
    this._rect = rect;
    this._onCommit = onCommit;
    this.active = true;
    this._position(rect);
    this.el.value = value || '';
    this.el.style.display = 'block';
    this.el.focus();
    this.el.select();
  },

  _position(rect) {
    const r = this.canvas.getBoundingClientRect();
    const scale = r.width / AR.C.VIEW_W;
    this.el.style.left = Math.round(r.left + rect.x * scale) + 'px';
    this.el.style.top = Math.round(r.top + rect.y * scale) + 'px';
    this.el.style.width = Math.round(rect.w * scale) + 'px';
    this.el.style.height = Math.round(rect.h * scale) + 'px';
    this.el.style.fontSize = Math.round(16 * scale) + 'px';
  },

  _commit() {
    const v = this.el.value;
    const cb = this._onCommit;
    this._close();
    if (cb) cb(v);
  },
  _close() {
    this.active = false;
    this.el.style.display = 'none';
    this.el.blur();
  },
};
