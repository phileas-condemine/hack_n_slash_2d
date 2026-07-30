// Arcane Rift - point d'entrée : canvas, chargement, boucle d'animation
window.AR = window.AR || {};
AR.VERSION = '1.0.0';

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = AR.C.VIEW_W;
  canvas.height = AR.C.VIEW_H;

  // mise à l'échelle avec letterbox
  function resize() {
    const scale = Math.min(window.innerWidth / AR.C.VIEW_W, window.innerHeight / AR.C.VIEW_H);
    canvas.style.width = Math.floor(AR.C.VIEW_W * scale) + 'px';
    canvas.style.height = Math.floor(AR.C.VIEW_H * scale) + 'px';
  }
  window.addEventListener('resize', resize);
  resize();

  AR.Save.load();
  if (AR.CloudSave) AR.CloudSave.init();
  AR.EventLog.recoverPending();
  AR.Audio.muted = !!AR.Save.data.settings.muted;
  AR.Input.init(canvas);
  AR.Touch.init(canvas);
  AR.TextEdit.init(canvas);

  // Plein écran (bouton coin haut-droit, cf. index.html/style.css) : plein écran de la PAGE
  // entière (document.documentElement), pas seulement du canvas - sinon les contrôles tactiles
  // (#touchUI, sibling du canvas, pas descendant) disparaîtraient en plein écran. `resize()`
  // ci-dessus gère déjà le redimensionnement en letterbox, y compris sur l'événement `resize`
  // déclenché par l'entrée/sortie du plein écran, donc rien d'autre à faire côté canvas.
  // Absent sur Safari iOS (pas d'implémentation de la Fullscreen API pour un élément
  // quelconque) - le bouton se masque tout seul dans ce cas plutôt que de rester inerte.
  const fsBtn = document.getElementById('fullscreenBtn');
  if (fsBtn) {
    if (!document.documentElement.requestFullscreen) {
      fsBtn.style.display = 'none';
    } else {
      fsBtn.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      });
      document.addEventListener('fullscreenchange', () => {
        fsBtn.title = document.fullscreenElement ? 'Quitter le plein écran' : 'Plein écran';
      });
    }
  }

  let progress = 0;
  let game = null;
  let last = performance.now();

  function drawLoading() {
    ctx.fillStyle = '#0d1420';
    ctx.fillRect(0, 0, AR.C.VIEW_W, AR.C.VIEW_H);
    ctx.fillStyle = '#e8e2d4';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ARCANE RIFT', AR.C.VIEW_W / 2, AR.C.VIEW_H / 2 - 40);
    ctx.fillStyle = 'rgba(53,224,192,0.25)';
    ctx.fillRect(AR.C.VIEW_W / 2 - 160, AR.C.VIEW_H / 2, 320, 10);
    ctx.fillStyle = '#35e0c0';
    ctx.fillRect(AR.C.VIEW_W / 2 - 160, AR.C.VIEW_H / 2, 320 * progress, 10);
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9aa5a8';
    ctx.fillText('Chargement des sprites... ' + Math.round(progress * 100) + '%', AR.C.VIEW_W / 2, AR.C.VIEW_H / 2 + 40);
  }
  drawLoading();

  // Ère de départ mémorisée (menu titre) : lue directement ici, avant même la création de
  // AR.Game, pour ne charger d'emblée que les sprites de cette ère + le tronc commun
  // (héros/armes/icônes) plutôt que les 6 ères d'un bloc — cf. AR.Assets.load().
  const bootEraIdx = AR.U.clamp(AR.Save.data.settings.eraStart | 0, 0, AR.ERAS.length - 1);
  AR.Assets.load(
    bootEraIdx,
    () => { game = new AR.Game(canvas, ctx); AR.game = game; },
    (p) => { progress = p; drawLoading(); }
  );

  function loop(now) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (game) game.frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
