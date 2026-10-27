/* Studio Của Khang – nhận diện khuôn mặt (MediaPipe Face Landmarker) + đoán nét nam/nữ, chạy hoàn toàn trên máy. */
(function () {
  'use strict';
  const S = (window.S = window.S || {});
  const MP_VER = '0.10.21';
  const MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + MP_VER;
  const MODEL_LOCAL = new URL('models/face_landmarker.task', document.baseURI).href;
  const MODEL_REMOTE = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
  const FA_URL = new URL('vendor/faceapi/face-api.esm.js', document.baseURI).href;
  const FA_MODEL = new URL('vendor/faceapi/', document.baseURI).href;

  // MediaPipe ghi log thông tin qua console.error – lọc cho console sạch
  { const ce = console.error.bind(console); console.error = (...a) => { if (typeof a[0] === 'string' && /^(INFO|W\d{4}|I\d{4}):?\s|XNNPACK|TensorFlow Lite/.test(a[0])) return; ce(...a); }; }

  let lmP = null;
  async function fetchModel() {
    let err;
    for (const u of [MODEL_LOCAL, MODEL_REMOTE]) {
      try { const r = await fetch(u); if (!r.ok) throw new Error('HTTP ' + r.status); const b = new Uint8Array(await r.arrayBuffer()); if (b.length > 1e6) return b; } catch (e) { err = e; }
    }
    throw err || new Error('Không tải được mô hình');
  }
  function getLandmarker(onStatus) {
    return lmP || (lmP = (async () => {
      onStatus && onStatus('Đang tải bộ nhận diện khuôn mặt…');
      const vision = await import(MP_BASE + '/vision_bundle.mjs');
      const fileset = await vision.FilesetResolver.forVisionTasks(MP_BASE + '/wasm');
      const buf = await fetchModel();
      const mk = delegate => vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer: buf, delegate }, runningMode: 'IMAGE', numFaces: 6,
        minFaceDetectionConfidence: 0.4, minFacePresenceConfidence: 0.4, outputFaceBlendshapes: false
      });
      let lm;
      try { lm = await mk('GPU'); } catch (e) { lm = await mk('CPU'); }
      try { navigator.serviceWorker?.controller?.postMessage({ type: 'warm', urls: [MP_BASE + '/vision_bundle.mjs', fileset.wasmLoaderPath, fileset.wasmBinaryPath] }); } catch (e) { }
      return lm;
    })().catch(e => { lmP = null; throw e; }));
  }

  const box = pts => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; } return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, s: Math.max(x1 - x0, y1 - y0) }; };

  /** Trả về danh sách mặt, mỗi mặt: { pts: [{x,y,z}] theo pixel của canvas, box } – sắp xếp mặt lớn trước. */
  async function detect(canvas, onStatus) {
    const lm = await getLandmarker(onStatus);
    const W = canvas.width, H = canvas.height;
    let faces = (lm.detect(canvas).faceLandmarks || []).map(f => f.map(p => ({ x: p.x * W, y: p.y * H, z: p.z * W })));
    // Chạy lại trên vùng cắt quanh từng mặt để điểm mốc chính xác hơn
    const R = 640, cc = document.createElement('canvas'); cc.width = cc.height = R;
    const cx = cc.getContext('2d');
    faces.sort((a, b) => box(b).s - box(a).s);
    for (let i = 0; i < Math.min(4, faces.length); i++) {
      const b = box(faces[i]); const side = b.s * 1.9, ox = b.cx - side / 2, oy = b.cy - side / 2;
      if (side < 40) continue;
      cx.fillStyle = '#000'; cx.fillRect(0, 0, R, R); cx.imageSmoothingQuality = 'high';
      cx.drawImage(canvas, ox, oy, side, side, 0, 0, R, R);
      let res; try { res = lm.detect(cc); } catch (e) { continue; }
      let best = null, bd = 1e9;
      for (const f of res.faceLandmarks || []) {
        const q = f.map(p => ({ x: ox + p.x * side, y: oy + p.y * side, z: p.z * side })); const qb = box(q);
        const d = Math.hypot(qb.cx - b.cx, qb.cy - b.cy) / b.s + Math.abs(Math.log(qb.s / b.s));
        if (d < bd) { bd = d; best = q; }
      }
      if (best && bd < 0.3) faces[i] = best;
    }
    return faces.map(pts => ({ pts, box: box(pts) })).filter(f => f.box.s > 24);
  }

  /* ---------- Đoán nét nam / nữ (mô hình nhỏ ~430 KB, giấy phép MIT – vladmandic/face-api) ---------- */
  let faP = null;
  function getGenderNet() {
    return faP || (faP = (async () => {
      const fa = await import(FA_URL);
      try { await fa.tf.setBackend('webgl'); await fa.tf.ready(); } catch (e) { await fa.tf.setBackend('cpu'); await fa.tf.ready(); }
      await fa.nets.ageGenderNet.loadFromUri(FA_MODEL);
      return fa;
    })().catch(e => { faP = null; throw e; }));
  }
  // Cắt mặt thẳng (xoay theo hai mắt) 112×112
  function faceCrop(canvas, pts, size = 112, margin = 1.0) {
    const le = pts[33], re = pts[263], chin = pts[152], brow = pts[9];
    const ang = Math.atan2(re.y - le.y, re.x - le.x);
    const cxp = (le.x + re.x + chin.x + brow.x) / 4, cyp = (le.y + re.y) / 2 * 0.5 + (chin.y + brow.y) / 2 * 0.5;
    const fw = Math.hypot(pts[454].x - pts[234].x, pts[454].y - pts[234].y), fh = Math.hypot(chin.x - pts[10].x, chin.y - pts[10].y);
    const side = Math.max(fw, fh) * margin;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.translate(size / 2, size / 2); x.rotate(-ang); x.scale(size / side, size / side); x.translate(-cxp, -cyp);
    x.drawImage(canvas, 0, 0);
    return c;
  }
  /** Trả về 'm' | 'f' | null (không chặn người dùng nếu lỗi). */
  async function guessGender(canvas, pts) {
    try {
      const fa = await getGenderNet();
      let sum = 0;
      for (const m of [0.95, 1.15]) {
        const r = await fa.nets.ageGenderNet.predictAgeAndGender(faceCrop(canvas, pts, 112, m));
        const p = r.gender === 'male' ? r.genderProbability : 1 - r.genderProbability;
        sum += p;
      }
      const pm = sum / 2;
      S.FaceLM.lastGenderP = pm;
      return pm >= 0.5 ? 'm' : 'f';
    } catch (e) {
      console.warn('Không đoán được nét mặt', e);
      return null;
    }
  }

  S.FaceLM = { detect, guessGender, getLandmarker, getGenderNet, faceCrop, box };
})();
