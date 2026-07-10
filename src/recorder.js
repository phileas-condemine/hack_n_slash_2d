// Arcane Rift - enregistrement vidéo (WebM) et captures d'écran du canvas
window.AR = window.AR || {};

AR.Recorder = {
  recorder: null,
  chunks: [],
  recording: false,
  startTime: 0,
  error: '',

  supported() {
    return typeof MediaRecorder !== 'undefined' && HTMLCanvasElement.prototype.captureStream;
  },

  toggle(canvas) {
    if (this.recording) this.stop();
    else this.start(canvas);
  },

  start(canvas) {
    if (!this.supported()) { this.error = 'Enregistrement non supporté par ce navigateur'; return; }
    try {
      const stream = canvas.captureStream(60);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm');
      this.chunks = [];
      this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
      this.recorder.onstop = () => this._download();
      this.recorder.start(1000);
      this.recording = true;
      this.startTime = performance.now();
      this.error = '';
    } catch (e) {
      // canvas "tainted" (ouverture en file://) ou autre restriction
      this.error = 'Enregistrement impossible (lancez le jeu via un serveur http)';
      this.recording = false;
    }
  },

  stop() {
    if (this.recorder && this.recording) {
      this.recording = false;
      this.recorder.stop();
    }
  },

  _download() {
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = 'arcane-rift-' + stamp + '.webm';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },

  screenshot(canvas) {
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.href = url;
        a.download = 'arcane-rift-' + stamp + '.png';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }, 'image/png');
      this.error = '';
    } catch (e) {
      this.error = 'Capture impossible (lancez le jeu via un serveur http)';
    }
  },

  elapsed() {
    return this.recording ? (performance.now() - this.startTime) / 1000 : 0;
  },
};
