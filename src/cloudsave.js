// Arcane Rift - sauvegarde cloud par pseudo + code à 4 chiffres (Firestore).
// Aucune authentification réelle : le pseudo+code EST la clé du document Firestore (cf.
// src/firebase-config.js pour le détail des règles de sécurité et le pourquoi de ce choix).
// Module entièrement facultatif et silencieux : sans config Firebase valide (ou si le SDK n'a
// pas pu se charger, ex. hors-ligne), tout devient un no-op et le jeu tourne en localStorage
// pur comme avant (AR.Save, src/utils.js) — aucune dépendance dure à ce module ailleurs dans
// le code, seul un hook optionnel dans AR.Save.save() l'appelle s'il existe.
window.AR = window.AR || {};

AR.CloudSave = {
  ready: false,     // SDK Firebase initialisé avec une config valide
  linked: false,    // session pseudo+code active
  pseudo: '',
  pin: '',
  status: '',        // texte d'état affiché par AR.UI.drawCloud ('', 'connexion…', 'connecté'…)
  db: null,
  _pushTimer: null,

  init() {
    const cfg = AR.FIREBASE_CONFIG;
    if (!cfg || !cfg.enabled || !cfg.apiKey || typeof firebase === 'undefined') return;
    try {
      firebase.initializeApp(cfg);
      this.db = firebase.firestore();
      this.ready = true;
    } catch (e) { this.ready = false; }

    // Reconnexion silencieuse si un pseudo+code a déjà été utilisé sur cet appareil
    // (mémorisé côté localStorage, cf. AR.Save.data.settings.cloud) - pas de blocage au
    // démarrage, la partie reste jouable pendant que la synchro se fait en tâche de fond.
    const remembered = AR.Save.data.settings.cloud;
    if (this.ready && remembered && remembered.pseudo && remembered.pin) {
      this.link(remembered.pseudo, remembered.pin, true);
    }
  },

  // pseudo+code -> identifiant de document Firestore. Normalisation des accents (NFD) avant
  // filtrage pour qu'un pseudo comme "Philéas" reste lisible ("phileas") plutôt que tronqué.
  _docId(pseudo, pin) {
    const DIACRITICS = new RegExp('[̀-ͯ]', 'g');
    const slug = String(pseudo).normalize('NFD').replace(DIACRITICS, '')
      .trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'joueur';
    const code = String(pin).replace(/\D/g, '').slice(0, 4).padStart(4, '0');
    return slug + '_' + code;
  },

  // silent = true lors de la reconnexion auto au démarrage (pas de message d'erreur bruyant
  // si le réseau est indisponible à ce moment-là)
  async link(pseudo, pin, silent) {
    if (!this.ready) { this.status = silent ? '' : 'cloud indisponible'; return false; }
    if (!pseudo || !pseudo.trim()) { this.status = 'pseudo requis'; return false; }
    if (!/^\d{4}$/.test(String(pin).replace(/\D/g, '').padStart(4, '0')) || String(pin).replace(/\D/g, '').length !== 4) {
      this.status = 'code à 4 chiffres requis';
      return false;
    }
    this.status = 'connexion…';
    const id = this._docId(pseudo, pin);
    try {
      const doc = await this.db.collection('saves').doc(id).get();
      this.pseudo = pseudo.trim();
      this.pin = String(pin).replace(/\D/g, '').slice(0, 4);
      this.linked = true;
      AR.Save.data.settings.cloud = { pseudo: this.pseudo, pin: this.pin };
      if (doc.exists) {
        const remote = doc.data();
        if (remote && remote.records) AR.Save.data.records = remote.records;
        if (remote && remote.saves) AR.Save.data.saves = remote.saves;
        this.status = 'connecté — sauvegardes chargées';
        AR.Save.save();
      } else {
        this.status = 'connecté — nouveau compte';
        AR.Save.save();
      }
      return true;
    } catch (e) {
      this.status = silent ? '' : 'erreur de connexion';
      return false;
    }
  },

  unlink() {
    this.linked = false;
    this.pseudo = '';
    this.pin = '';
    this.status = '';
    delete AR.Save.data.settings.cloud;
    AR.Save.save();
  },

  // Appelé depuis AR.Save.save() à chaque écriture locale. Débattu (1.5s) pour rester loin du
  // quota gratuit Firestore même en cas d'écritures locales rapprochées (plusieurs upsertSave
  // d'affilée, par ex.), sans jamais bloquer la boucle de jeu (fire-and-forget).
  push() {
    if (!this.ready || !this.linked) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => {
      const id = this._docId(this.pseudo, this.pin);
      const payload = { records: AR.Save.data.records, saves: AR.Save.data.saves, ts: Date.now() };
      this.db.collection('saves').doc(id).set(payload).catch(() => { this.status = 'erreur de synchro'; });
    }, 1500);
  },
};
