/**
 * scanner.js — LineUp Check
 * QR Code scanning via device camera using jsQR library.
 */

const Scanner = (() => {
  let _stream   = null;
  let _animFrame = null;
  let _scanning = false;
  let _video    = null;
  let _canvas   = null;
  let _ctx      = null;
  let _onResult = null;

  /* ============================================================
     Start Camera + QR Detection Loop
     ============================================================ */

  async function start(videoEl, canvasEl, onResultCallback) {
    _video  = videoEl;
    _canvas = canvasEl;
    _ctx    = canvasEl.getContext('2d', { willReadFrequently: true });
    _onResult = onResultCallback;

    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // rear camera
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      _video.srcObject = _stream;
      await _video.play();
      _scanning = true;
      _loop();
      return { ok: true };
    } catch (err) {
      const msg = _friendlyCameraError(err);
      return { ok: false, message: msg };
    }
  }

  function _loop() {
    if (!_scanning) return;
    _animFrame = requestAnimationFrame(_loop);

    if (_video.readyState !== _video.HAVE_ENOUGH_DATA) return;

    _canvas.width  = _video.videoWidth;
    _canvas.height = _video.videoHeight;
    _ctx.drawImage(_video, 0, 0, _canvas.width, _canvas.height);

    try {
      const imageData = _ctx.getImageData(0, 0, _canvas.width, _canvas.height);
      // jsQR is loaded via CDN in scan.html
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        _onResult(code.data);
      }
    } catch {}
  }

  /* ============================================================
     Pause / Resume (for showing result card)
     ============================================================ */

  function pause() {
    _scanning = false;
    if (_animFrame) cancelAnimationFrame(_animFrame);
  }

  function resume() {
    if (_video && _stream) {
      _scanning = true;
      _loop();
    }
  }

  /* ============================================================
     Stop Camera
     ============================================================ */

  function stop() {
    pause();
    if (_stream) {
      _stream.getTracks().forEach(t => t.stop());
      _stream = null;
    }
    if (_video) {
      _video.srcObject = null;
    }
  }

  /* ============================================================
     Camera Error Messages (Thai)
     ============================================================ */

  function _friendlyCameraError(err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาเปิดสิทธิ์กล้องในการตั้งค่าเบราว์เซอร์';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'ไม่พบกล้องในอุปกรณ์นี้';
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return 'กล้องถูกใช้งานโดยแอปอื่นอยู่ กรุณาปิดแอปอื่นแล้วลองใหม่';
    }
    if (err.name === 'OverconstrainedError') {
      return 'ไม่สามารถเปิดกล้องด้วยการตั้งค่านี้ได้';
    }
    return `เปิดกล้องไม่สำเร็จ: ${err.message || err.name}`;
  }

  return { start, stop, pause, resume };
})();
