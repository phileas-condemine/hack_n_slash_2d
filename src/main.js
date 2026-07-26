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
  AR.EventLog.recoverPending();
  AR.Audio.muted = !!AR.Save.data.settings.muted;
  AR.Input.init(canvas);
  AR.Touch.init(canvas);
  AR.TextEdit.init(canvas);

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

  AR.Assets.load(
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
