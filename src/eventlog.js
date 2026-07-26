// Arcane Rift - journal d'événements de combat (déplacement, attaques, dégâts,
// morts, patterns de boss). Nommé d'après l'horodatage du début de la run
// (AR.EventLog.startRun(), appelé par Game#newRun/#loadGame).
//
// Deux modes, choisis automatiquement, sans jamais de boîte de dialogue :
//  - En local, si le jeu est servi par tools/dev_server.py (route
//    POST /api/log) : les entrées sont envoyées par petits lots au serveur,
//    qui les écrit dans logs/combat-log-<horodatage>.jsonl à la racine du
//    dépôt. Un envoi de secours via navigator.sendBeacon() est tenté sur
//    'pagehide' pour ne pas perdre le dernier lot si l'onglet/le navigateur
//    se ferme brutalement.
//  - Partout ailleurs (site déployé sur GitHub Pages, `python -m
//    http.server` nu, `npx serve`, ouverture en file://, serveur de dev
//    injoignable) : accumulation en mémoire, filet de sécurité localStorage
//    toutes les ~25 entrées, téléchargement classique (.jsonl via
//    <a download>) à la mort/victoire/abandon/touche L.
window.AR = window.AR || {};

AR.EventLog = {
  entries: [],
  runStartTs: null,
  runLabel: null,
  _lastPersistedAt: 0,
  _serverAvailable: null, // null = pas encore testé ; true/false ensuite, mémorisé pour la session
  _pending: [],           // entrées envoyées au serveur local mais pas encore confirmées
  _flushing: false,

  isLocalEnv() {
    return location.protocol === 'file:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1' ||
      location.hostname === '' || location.hostname === '[::1]';
  },

  async startRun() {
    this.entries = [];
    this.runStartTs = Date.now();
    this.runLabel = this._tsLabel(this.runStartTs);
    this._lastPersistedAt = 0;
    this._pending = [];
    if (this.isLocalEnv() && this._serverAvailable !== false) {
      await this._probeServer();
    }
    this.push('run', { event: 'start', fileMode: !!this._serverAvailable });
  },

  async _probeServer() {
    try {
      const res = await fetch('/api/log/ping');
      this._serverAvailable = res.ok;
    } catch (e) {
      this._serverAvailable = false;
    }
    if (AR.HUD) {
      AR.HUD.notify(
        this._serverAvailable
          ? 'Journal de combat : écriture dans logs/ activée'
          : 'Journal de combat : serveur local indisponible, export par téléchargement à la fin',
        this._serverAvailable ? AR.C.COLORS.spirit : AR.C.COLORS.textDim
      );
    }
  },

  _tsLabel(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  },

  push(actor, data) {
    if (!this.runStartTs) return; // pas de run en cours (menu titre, etc.)
    const t = Math.round((Date.now() - this.runStartTs)) / 1000;
    const entry = Object.assign({ t, actor }, data);
    this.entries.push(entry);
    if (this._serverAvailable) {
      this._pending.push(entry);
      if (this._pending.length >= 8) this._flush();
    } else if (this._serverAvailable === false && this.entries.length - this._lastPersistedAt >= 25) {
      this._lastPersistedAt = this.entries.length;
      this._persist();
    }
  },

  async _flush() {
    if (this._flushing || !this._pending.length || !this._serverAvailable) return;
    this._flushing = true;
    const batch = this._pending.splice(0, this._pending.length);
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: this.runLabel, lines: batch }),
      });
      if (!res.ok) throw new Error('bad status');
    } catch (e) {
      // serveur perdu en cours de route (fermé, dev_server.py pas utilisé
      // finalement, etc.) : le lot repart en attente et le reste de la run
      // bascule en mode mémoire + téléchargement (this.entries garde tout
      // depuis le début, donc rien n'est perdu côté téléchargement final).
      this._pending = batch.concat(this._pending);
      this._serverAvailable = false;
    }
    this._flushing = false;
  },

  _persist() {
    try {
      localStorage.setItem('arcaneRift.pendingLog', JSON.stringify({ label: this.runLabel, entries: this.entries }));
    } catch (e) { /* quota localStorage dépassé : tant pis pour le filet de sécurité */ }
  },

  // À appeler une fois au lancement (main.js) : si une session précédente n'a
  // pas été proprement clôturée (fermeture du navigateur) SANS mode serveur
  // actif, propose le téléchargement du log en attente.
  recoverPending() {
    let raw;
    try { raw = localStorage.getItem('arcaneRift.pendingLog'); } catch (e) { return; }
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data && data.entries && data.entries.length) this._download(data.entries, data.label + '-recovered');
    } catch (e) { /* log corrompu, ignoré */ }
    try { localStorage.removeItem('arcaneRift.pendingLog'); } catch (e) {}
  },

  // reason: 'death' | 'victory' | 'quit' | 'manual'
  async download(reason) {
    if (!this.entries.length) return;
    this.push('run', { event: 'end', reason });
    if (this._serverAvailable) {
      await this._flush(); // dernier envoi avec les tout derniers événements
      if (this._serverAvailable) {
        if (AR.HUD) AR.HUD.notify('Journal enregistré : logs/combat-log-' + this.runLabel + '.jsonl', AR.C.COLORS.spirit);
      } else if (AR.HUD) {
        this._download(this.entries, this.runLabel);
        AR.HUD.notify('Journal de combat : serveur local perdu, téléchargé à la place', AR.C.COLORS.textDim);
      }
    } else {
      this._download(this.entries, this.runLabel);
      if (AR.HUD) AR.HUD.notify('Journal de combat téléchargé : combat-log-' + this.runLabel + '.jsonl', AR.C.COLORS.spirit);
    }
    try { localStorage.removeItem('arcaneRift.pendingLog'); } catch (e) {}
  },

  _download(entries, label) {
    const lines = entries.map((e) => JSON.stringify(e)).join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combat-log-${label}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
};

// Filet de sécurité pour une fermeture brutale (croix, Alt+F4) : sendBeacon
// est conçu pour survivre à la fin de vie de la page, contrairement à un
// fetch() normal qui serait annulé. Ne couvre que le dernier lot non encore
// envoyé (au plus 7 entrées vu le seuil de _flush ci-dessus).
window.addEventListener('pagehide', () => {
  const el = AR.EventLog;
  if (el._serverAvailable && el._pending.length && navigator.sendBeacon) {
    try {
      const body = JSON.stringify({ label: el.runLabel, lines: el._pending });
      navigator.sendBeacon('/api/log', new Blob([body], { type: 'application/json' }));
    } catch (e) {}
  }
});
