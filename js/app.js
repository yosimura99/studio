/* Studio Của Khang – giao diện chính */
(function () {
  'use strict';
  const S = window.S;
  const $ = id => document.getElementById(id);
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const fmtTime = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
  const fmtTimeShort = t => { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = Math.floor(t - m * 60); return m + ':' + (s < 10 ? '0' : '') + s; };

  /* ================= TRẠNG THÁI ================= */
  const newMode = () => ({ params: S.defaults(), hist: [], hi: -1, presetSel: null, presetAmt: 100, loaded: false });
  const modes = { photo: newMode(), video: newMode() };
  let mode = 'photo', cur = modes.photo, tab = 'presets';
  let renderer = null, thumbR = null;
  const photo = { full: null, preview: null, thumb: null, name: 'anh' };
  const vid = { el: null, url: null, name: 'video', duration: 0, start: 0, end: 0, speed: 1, mute: false, srcAudio: null, audioMsg: '', music: null, musicVol: 80, musicEl: null, res: 1080, quality: 1, thumb: null, playing: false };
  let compare = false, splitPos = 0.5, holding = false;
  let userPresets = [], importedSession = [];
  let presetCat = 'bright';
  let srcVersion = 0;
  const thumbCache = new Map();
  window.App = { modes, vid, photo, get mode() { return mode; } };

  /* ================= TIỆN ÍCH GIAO DIỆN ================= */
  let toastT = 0;
  function toast(msg, ms = 2600) {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
  }
  function modal(build) {
    return new Promise(res => {
      const wrap = $('modalWrap'), m = $('modal');
      m.innerHTML = '';
      const close = v => { wrap.hidden = true; m.innerHTML = ''; res(v); };
      build(m, close);
      wrap.hidden = false;
      wrap.onclick = e => { if (e.target === wrap) close(null); };
    });
  }
  const askText = (title, value = '', placeholder = '') => modal((m, close) => {
    const inp = h('input', { type: 'text', value, placeholder, maxlength: 60 });
    m.append(h('h2', null, title), inp, h('div', { class: 'acts' },
      h('button', { class: 'pill ghost', onclick: () => close(null) }, 'Hủy'),
      h('button', { class: 'pill', onclick: () => close(inp.value.trim() || null) }, 'Lưu')));
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') close(inp.value.trim() || null); });
    setTimeout(() => { inp.focus(); inp.select(); }, 50);
  });
  const confirmBox = (title, text, okText = 'Đồng ý', danger) => modal((m, close) => {
    m.append(h('h2', null, title), text ? h('p', null, text) : null, h('div', { class: 'acts' },
      h('button', { class: 'pill ghost', onclick: () => close(false) }, 'Hủy'),
      h('button', { class: 'pill' + (danger ? ' danger' : ''), onclick: () => close(true) }, okText)));
  });
  const menu = (title, items) => modal((m, close) => {
    m.append(h('h2', null, title));
    const col = h('div', { style: 'display:flex;flex-direction:column;gap:8px' });
    for (const [k, label, cls] of items) col.append(h('button', { class: 'pill ' + (cls || 'ghost'), onclick: () => close(k) }, label));
    col.append(h('button', { class: 'pill ghost', onclick: () => close(null) }, 'Đóng'));
    m.append(col);
  });
  const info = (title, html) => modal((m, close) => {
    m.append(h('h2', null, title), h('p', { html }), h('div', { class: 'acts' }, h('button', { class: 'pill', onclick: () => close(true) }, 'Đã hiểu')));
  });
  function sheet(build) {
    const wrap = $('sheetWrap'), s = $('sheet');
    s.innerHTML = '';
    const close = () => { wrap.hidden = true; s.innerHTML = ''; };
    build(s, close);
    wrap.hidden = false;
    wrap.onclick = e => { if (e.target === wrap) close(); };
    return close;
  }
  let busyCancel = null;
  function busy(text, pct, cancelable) {
    $('busy').hidden = false; $('busyText').textContent = text || 'Đang xử lý…';
    $('busyBar').style.width = (pct == null ? 0 : pct * 100) + '%';
    $('busyBar').parentElement.style.visibility = pct == null ? 'hidden' : 'visible';
    $('busyCancel').hidden = !cancelable;
  }
  function unbusy() { $('busy').hidden = true; busyCancel = null; }
  $('busyCancel').onclick = () => { if (busyCancel) busyCancel(); };

  /* ================= ĐIỀU HƯỚNG ================= */
  const views = { home: $('home'), editor: $('editor'), face: $('face'), retouch: $('retouch') };
  function showView(name) {
    for (const k in views) views[k].classList.toggle('active', k === name);
    document.querySelectorAll('.home-tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === (name === 'editor' ? mode : name)));
  }
  function go(where, push = true) {
    if (where !== 'video') pauseVideo();
    if (where === 'home') showView('home');
    else if (where === 'face' || where === 'ai') {
      // Studio AI (ghép mặt + tạo ảnh offline) — mở cùng tab để giữ khoá PIN & chế độ cross-origin isolation
      if (!push) { showView('home'); return; } // quay lại bằng nút Back thì ở trang chủ, không tự mở lại
      const u = new URL('../studio-ai/', location.href).href;
      if (window.StudioLock && StudioLock.go) StudioLock.go(u); else location.href = u;
      return;
    } else if (where === 'retouch') {
      showView('retouch'); if (S.FaceUI) S.FaceUI.show();
    } else { setMode(where); showView('editor'); requestAnimationFrame(() => { scheduleRender(); }); }
    if (push) { const hs = where === 'home' ? '' : '#' + where; if (location.hash !== hs) history.pushState(null, '', hs || location.pathname); }
  }
  window.addEventListener('popstate', () => go((location.hash || '#home').slice(1) || 'home', false));
  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
  document.querySelectorAll('[data-ai-link]').forEach(a => a.addEventListener('click', (e) => { if (window.StudioLock && StudioLock.go) { e.preventDefault(); StudioLock.go(a.href); } }));
  $('btnBack').onclick = () => go('home');
  $('faceBack').onclick = () => go('home');

  const TABS = [
    ['presets', 'presets', 'Công thức'], ['clip', 'film', 'Video'], ['light', 'light', 'Ánh sáng'], ['color', 'color', 'Màu'],
    ['mixer', 'mixer', 'Trộn màu'], ['grade', 'grade', 'Phân tách'], ['curve', 'curve', 'Đường cong'],
    ['effects', 'effects', 'Hiệu ứng'], ['detail', 'detail', 'Chi tiết'], ['crop', 'crop', 'Cắt & Xoay']
  ];
  function setMode(m) {
    if (mode !== m) { pauseVideo(); }
    mode = m; cur = modes[m];
    const ed = $('editor');
    ed.classList.toggle('mode-photo', m === 'photo'); ed.classList.toggle('mode-video', m === 'video');
    $('edTitle').textContent = m === 'photo' ? 'Chỉnh Ảnh' : 'Chỉnh Video';
    $('btnExport').textContent = m === 'photo' ? 'Lưu' : 'Xuất';
    $('emptyText').textContent = m === 'photo' ? 'Chọn một ảnh từ điện thoại để bắt đầu chỉnh' : 'Chọn một video để chỉnh màu, cắt đoạn, đổi tốc độ và thêm nhạc';
    $('btnPick').textContent = m === 'photo' ? 'Chọn ảnh' : 'Chọn video';
    $('emptyHint').textContent = (m === 'photo' ? 'Ảnh' : 'Video') + ' được xử lý ngay trên máy, không tải lên Internet.';
    $('empty').querySelector('.empty-ic').innerHTML = S.icon(m === 'photo' ? 'photo' : 'video');
    if (m === 'photo' && tab === 'clip') tab = 'presets';
    attachSource();
    buildTabs(); buildPanel();
    updateEmpty(); updateUndo();
  }
  function updateEmpty() {
    $('empty').hidden = cur.loaded;
    $('canvasBox').style.visibility = cur.loaded ? 'visible' : 'hidden';
    $('histo').style.display = cur.loaded ? '' : 'none';
  }
  function attachSource() {
    if (!renderer) return;
    if (mode === 'photo' && photo.preview) renderer.setSource(photo.preview, photo.preview.width, photo.preview.height);
    if (mode === 'video' && vid.el && vid.el.videoWidth) renderer.setSource(vid.el, vid.el.videoWidth, vid.el.videoHeight);
    srcVersion++;
  }
  function buildTabs() {
    const nav = $('tabs'); nav.innerHTML = '';
    for (const [id, ic, label] of TABS) {
      if (id === 'clip' && mode !== 'video') continue;
      nav.append(h('button', { class: 'tab' + (id === tab ? ' on' : ''), 'data-tab': id, onclick: () => { tab = id; buildTabs(); buildPanel(); scheduleRender(); } }, h('span', { html: S.icon(ic) }), label));
    }
  }

  /* ================= LỊCH SỬ ================= */
  function pushHistory() {
    const s = JSON.stringify(cur.params);
    if (cur.hist[cur.hi] === s) return;
    cur.hist = cur.hist.slice(0, cur.hi + 1); cur.hist.push(s);
    if (cur.hist.length > 120) cur.hist.shift();
    cur.hi = cur.hist.length - 1; updateUndo();
  }
  function resetHistory() { cur.hist = [JSON.stringify(cur.params)]; cur.hi = 0; updateUndo(); }
  function updateUndo() { $('btnUndo').disabled = cur.hi <= 0; $('btnRedo').disabled = cur.hi >= cur.hist.length - 1; }
  function undo() { if (cur.hi > 0) { cur.hi--; cur.params = JSON.parse(cur.hist[cur.hi]); afterBulkChange(); } }
  function redo() { if (cur.hi < cur.hist.length - 1) { cur.hi++; cur.params = JSON.parse(cur.hist[cur.hi]); afterBulkChange(); } }
  function afterBulkChange() { updateUndo(); buildPanel(true); scheduleRender(); thumbCache.clear(); }
  $('btnUndo').onclick = undo; $('btnRedo').onclick = redo;
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (e.key === '\\' && !holding) { holding = true; $('holdTag').hidden = false; scheduleRender(); }
  });
  document.addEventListener('keyup', e => { if (e.key === '\\') { holding = false; $('holdTag').hidden = true; scheduleRender(); } });

  /* ================= THANH TRƯỢT ================= */
  const getP = path => { const [a, b] = path.split('.'); return b === undefined ? cur.params[a] : cur.params[a][+b]; };
  const setP = (path, v) => { const [a, b] = path.split('.'); if (b === undefined) cur.params[a] = v; else cur.params[a][+b] = v; };
  let lastTap = { t: 0, el: null };
  /* o: {label, min, max, step, def, fmt, grad, key | get/set, commit, onInput} */
  function slider(o) {
    const step = o.step || 1, def = o.def ?? 0;
    const get = o.get || (() => getP(o.key));
    const set = o.set || (v => setP(o.key, v));
    const commit = o.commit || pushHistory;
    const fmt = o.fmt || (v => (v > 0 && o.min < 0 ? '+' : '') + (Math.round(v / step) * step).toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0));
    const val = h('span', { class: 'sl-val' }), fill = h('div', { class: 'sl-fill' }), thumb = h('div', { class: 'sl-thumb' });
    const track = h('div', { class: 'sl-track' }, fill, thumb);
    if (o.grad) track.style.background = o.grad;
    const el = h('div', { class: 'sl' + (o.grad ? ' grad' : '') }, h('div', { class: 'sl-top' }, h('span', null, o.label), val), track);
    const update = () => {
      const v = get(); const f = (v - o.min) / (o.max - o.min);
      const z = clamp((clamp(def, o.min, o.max) - o.min) / (o.max - o.min), 0, 1);
      thumb.style.left = (clamp(f, 0, 1) * 100) + '%';
      fill.style.left = Math.min(f, z) * 100 + '%'; fill.style.width = Math.abs(f - z) * 100 + '%';
      val.textContent = fmt(v);
      el.classList.toggle('changed', Math.abs(v - def) > 1e-9);
    };
    const apply = v => { v = clamp(Math.round(v / step) * step, o.min, o.max); if (v !== get()) { set(v); update(); o.onInput ? o.onInput(v) : onParamInput(); } };
    let sx = 0, sy = 0, sv = 0, drag = false, pid = null, moved = false;
    el.addEventListener('pointerdown', e => {
      const now = performance.now();
      if (lastTap.el === el && now - lastTap.t < 320) { lastTap = { t: 0, el: null }; apply(def); commit(); return; }
      lastTap = { t: now, el };
      sx = e.clientX; sy = e.clientY; sv = get(); drag = false; moved = false; pid = e.pointerId;
      if (e.pointerType === 'mouse') { drag = true; el.setPointerCapture(pid); el.classList.add('active'); }
    });
    el.addEventListener('pointermove', e => {
      if (pid !== e.pointerId) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!drag) {
        if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy) * 1.2) { drag = true; try { el.setPointerCapture(pid); } catch (er) { } el.classList.add('active'); sx = e.clientX; sv = get(); }
        else return;
      }
      if (e.buttons === 0 && e.pointerType === 'mouse') return;
      moved = true;
      const w = track.getBoundingClientRect().width || 200;
      const fine = e.shiftKey ? 0.25 : 1;
      apply(sv + (e.clientX - sx) / w * (o.max - o.min) * fine);
    });
    const end = e => {
      if (pid !== e.pointerId) return;
      pid = null; el.classList.remove('active');
      if (drag && moved) { lastTap = { t: 0, el: null }; commit(); }
      else if (drag && e.pointerType === 'mouse' && e.type === 'pointerup' && e.target.closest('.sl-track')) {
        // nhấn chuột vào thanh: nhảy tới vị trí
        const r = track.getBoundingClientRect(); apply(o.min + (e.clientX - r.left) / r.width * (o.max - o.min)); commit();
      }
      drag = false;
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('dblclick', () => { apply(def); commit(); });
    update();
    el._update = update;
    return el;
  }
  let inputThrottle = 0;
  function onParamInput() {
    cur.presetSel = cur.presetSel && cur.presetSel.locked ? cur.presetSel : null;
    scheduleRender();
  }
  const ph = (title, ...right) => h('div', { class: 'ph' }, h('h3', null, title), h('div', { class: 'row' }, ...right));
  function resetKeys(keys) {
    const d = S.defaults();
    for (const k of keys) cur.params[k] = S.clone(d[k]);
    pushHistory(); buildPanel(true); scheduleRender();
  }
  const resetBtn = keys => h('button', { class: 'btn', onclick: () => resetKeys(keys), html: S.icon('reset') + '<span>Đặt lại</span>' });

  /* ================= CÁC BẢNG ================= */
  const G = {
    temp: 'linear-gradient(90deg,#3b78d8,#9fb7d6 45%,#d8c79a 55%,#e4a730)',
    tint: 'linear-gradient(90deg,#3fae4f,#a7b9a3 45%,#c3a4c2 55%,#c84fc4)',
    sat: 'linear-gradient(90deg,#808080,#e04848 35%,#e8cf35 50%,#3cc6c6 65%,#8a4fe0)',
    hue: 'linear-gradient(90deg,#f33,#fb3,#ef3,#3e5,#3ee,#36f,#a3f,#f3c,#f33)'
  };
  function buildPanel(keepScroll) {
    const body = $('panelBody');
    const st = keepScroll ? body.scrollTop : 0;
    body.innerHTML = '';
    const f = PANELS[tab] || PANELS.presets;
    f(body);
    body.scrollTop = st;
    $('crop').hidden = !(tab === 'crop' && cur.loaded);
    if (tab === 'crop' && compare) setCompare(false);
  }
  const PANELS = {};
  PANELS.light = b => {
    b.append(ph('Ánh sáng', h('button', { class: 'btn', onclick: autoAdjust, html: S.icon('auto') + '<span>Tự động</span>' }), resetBtn(['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'])));
    b.append(slider({ key: 'exposure', label: 'Phơi sáng', min: -5, max: 5, step: 0.01, fmt: v => (v > 0 ? '+' : '') + v.toFixed(2) }));
    for (const [k, l] of [['contrast', 'Tương phản'], ['highlights', 'Vùng sáng'], ['shadows', 'Vùng tối'], ['whites', 'Trắng'], ['blacks', 'Đen']])
      b.append(slider({ key: k, label: l, min: -100, max: 100 }));
  };
  PANELS.color = b => {
    b.append(ph('Màu', h('button', { class: 'btn', onclick: () => autoAdjust(true), html: S.icon('auto') + '<span>Cân bằng trắng tự động</span>' }), resetBtn(['temp', 'tint', 'vibrance', 'saturation'])));
    b.append(slider({ key: 'temp', label: 'Nhiệt độ', min: -100, max: 100, grad: G.temp }));
    b.append(slider({ key: 'tint', label: 'Sắc thái', min: -100, max: 100, grad: G.tint }));
    b.append(slider({ key: 'vibrance', label: 'Rung động', min: -100, max: 100 }));
    b.append(slider({ key: 'saturation', label: 'Bão hòa', min: -100, max: 100, grad: G.sat }));
  };
  let mixerProp = 'hslH';
  const BAND_HUES = [0, 30, 58, 120, 180, 225, 275, 315];
  PANELS.mixer = b => {
    b.append(ph('Trộn màu (HSL)', resetBtn(['hslH', 'hslS', 'hslL'])));
    const seg = h('div', { class: 'seg' });
    for (const [k, l] of [['hslH', 'Sắc độ'], ['hslS', 'Bão hòa'], ['hslL', 'Độ sáng']])
      seg.append(h('button', { class: k === mixerProp ? 'on' : '', onclick: () => { mixerProp = k; buildPanel(true); } }, l));
    b.append(seg);
    S.BAND_VI.forEach((name, i) => {
      const c = S.BAND_COLORS[i], hh = BAND_HUES[i];
      let grad;
      if (mixerProp === 'hslH') grad = `linear-gradient(90deg,hsl(${hh - 30},75%,55%),hsl(${hh},75%,55%),hsl(${hh + 30},75%,55%))`;
      else if (mixerProp === 'hslS') grad = `linear-gradient(90deg,#808080,${c})`;
      else grad = `linear-gradient(90deg,#111,${c},#fff)`;
      b.append(slider({ key: mixerProp + '.' + i, label: name, min: -100, max: 100, grad }));
    });
  };
  let gradeSel = 'm';
  PANELS.grade = b => {
    wheels.length = 0;
    b.append(ph('Phân tách màu', resetBtn(['gsH', 'gsS', 'gsL', 'gmH', 'gmS', 'gmL', 'ghH', 'ghS', 'ghL', 'gBlend', 'gBalance'])));
    const wrap = h('div', { class: 'wheels' });
    for (const [k, l] of [['s', 'Vùng tối'], ['m', 'Trung tính'], ['h', 'Vùng sáng']]) wrap.append(colorWheel(k, l));
    b.append(wrap);
    const pre = 'g' + gradeSel;
    const names = { s: 'vùng tối', m: 'trung tính', h: 'vùng sáng' };
    b.append(h('div', { class: 'kv' }, h('span', null, 'Đang chỉnh: ' + names[gradeSel]), h('span', null, 'Kéo trong vòng màu')));
    b.append(slider({ key: pre + 'H', label: 'Sắc độ', min: 0, max: 359, def: { s: 220, m: 40, h: 45 }[gradeSel], grad: G.hue, fmt: v => Math.round(v) + '°', onInput: () => { drawWheels(); scheduleRender(); } }));
    b.append(slider({ key: pre + 'S', label: 'Bão hòa', min: 0, max: 100, onInput: () => { drawWheels(); scheduleRender(); } }));
    b.append(slider({ key: pre + 'L', label: 'Độ sáng', min: -100, max: 100 }));
    b.append(slider({ key: 'gBlend', label: 'Hòa trộn', min: 0, max: 100, def: 50 }));
    b.append(slider({ key: 'gBalance', label: 'Cân bằng', min: -100, max: 100 }));
  };
  let wheelBase = null;
  function wheelImage() {
    if (wheelBase) return wheelBase;
    const n = 192, c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'), im = x.createImageData(n, n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const dx = (i + 0.5) / n * 2 - 1, dy = 1 - (j + 0.5) / n * 2, r = Math.hypot(dx, dy);
      const o = (j * n + i) * 4;
      if (r > 1) { im.data[o + 3] = 0; continue; }
      const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      const [R, G2, B] = hsv(hue, r * 0.85, 0.62 + 0.1 * (1 - r));
      im.data[o] = R; im.data[o + 1] = G2; im.data[o + 2] = B; im.data[o + 3] = 255;
    }
    x.putImageData(im, 0, 0); wheelBase = c; return c;
  }
  function hsv(hh, s, v) {
    const f = n => { const k = (n + hh / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return [f(5) * 255, f(3) * 255, f(1) * 255];
  }
  const wheels = [];
  function drawWheels() {
    for (const w of wheels) if (w.isConnected) w._draw();
  }
  function colorWheel(k, label) {
    const cv = h('canvas', { width: 192, height: 192 });
    const box = h('div', { class: 'wheel' + (gradeSel === k ? ' on' : '') }, cv, h('span', null, label));
    const kh = 'g' + k + 'H', ks = 'g' + k + 'S';
    cv._draw = () => {
      const x = cv.getContext('2d'); x.clearRect(0, 0, 192, 192); x.drawImage(wheelImage(), 0, 0);
      const a = cur.params[kh] * Math.PI / 180, r = cur.params[ks] / 100 * 90;
      const px = 96 + Math.cos(a) * r, py = 96 - Math.sin(a) * r;
      x.beginPath(); x.arc(px, py, 9, 0, 7); x.lineWidth = 3; x.strokeStyle = '#fff'; x.stroke();
      x.beginPath(); x.arc(96, 96, 2, 0, 7); x.fillStyle = 'rgba(255,255,255,.5)'; x.fill();
    };
    cv._draw(); wheels.push(cv);
    let down = false, tapT = 0;
    const set = e => {
      const r = cv.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width * 2 - 1, dy = 1 - (e.clientY - r.top) / r.height * 2;
      cur.params[kh] = Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360);
      cur.params[ks] = Math.round(clamp(Math.hypot(dx, dy), 0, 1) * 100);
      cv._draw(); scheduleRender();
    };
    cv.addEventListener('pointerdown', e => {
      const now = performance.now();
      if (now - tapT < 320) { cur.params[ks] = 0; cv._draw(); pushHistory(); scheduleRender(); buildPanel(true); return; }
      tapT = now;
      if (gradeSel !== k) { gradeSel = k; buildPanel(true); return; }
      down = true; cv.setPointerCapture(e.pointerId); set(e);
    });
    cv.addEventListener('pointermove', e => { if (down) set(e); });
    const up = () => { if (!down) return; down = false; pushHistory(); buildPanel(true); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    return box;
  }
  let curveCh = 'rgb';
  PANELS.curve = b => {
    b.append(ph('Đường cong', resetBtn(['curve'])));
    const seg = h('div', { class: 'seg' });
    for (const [k, l] of [['rgb', 'RGB'], ['r', 'Đỏ'], ['g', 'Lục'], ['b', 'Lam']])
      seg.append(h('button', { class: k === curveCh ? 'on' : '', onclick: () => { curveCh = k; buildPanel(true); } }, l));
    b.append(seg);
    b.append(curveEditor());
    b.append(h('div', { class: 'note' }, 'Chạm để thêm điểm, kéo để chỉnh, chạm đúp vào điểm (hoặc kéo ra ngoài) để xóa.'));
  };
  let lumaHist = null;
  function curveEditor() {
    const N = 600, pad = 18;
    const cv = h('canvas', { width: N, height: N });
    const box = h('div', { class: 'curve-box' }, cv);
    const col = { rgb: '#eee', r: '#ff5a5a', g: '#5ad16a', b: '#5a8cff' }[curveCh];
    const pts = () => cur.params.curve[curveCh];
    const toC = (x, y) => [pad + x / 255 * (N - 2 * pad), N - pad - y / 255 * (N - 2 * pad)];
    const fromC = (cx, cy) => [clamp((cx - pad) / (N - 2 * pad) * 255, 0, 255), clamp((N - pad - cy) / (N - 2 * pad) * 255, 0, 255)];
    const draw = () => {
      const x = cv.getContext('2d'); x.clearRect(0, 0, N, N);
      x.fillStyle = '#121215'; x.fillRect(0, 0, N, N);
      if (lumaHist) {
        const m = Math.max(...lumaHist) || 1; x.beginPath(); x.moveTo(pad, N - pad);
        lumaHist.forEach((v, i) => { const [cx] = toC(i / (lumaHist.length - 1) * 255, 0); x.lineTo(cx, N - pad - Math.sqrt(v / m) * (N - 2 * pad) * 0.9); });
        x.lineTo(N - pad, N - pad); x.fillStyle = 'rgba(255,255,255,.07)'; x.fill();
      }
      x.strokeStyle = 'rgba(255,255,255,.1)'; x.lineWidth = 2;
      for (let i = 1; i < 4; i++) { const p = pad + i * (N - 2 * pad) / 4; x.beginPath(); x.moveTo(p, pad); x.lineTo(p, N - pad); x.moveTo(pad, p); x.lineTo(N - pad, p); x.stroke(); }
      x.strokeStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(...toC(0, 0)); x.lineTo(...toC(255, 255)); x.stroke();
      const t = S.curveTable(pts());
      x.strokeStyle = col; x.lineWidth = 4; x.beginPath();
      for (let i = 0; i < 256; i++) { const [cx, cy] = toC(i, t[i] * 255); i ? x.lineTo(cx, cy) : x.moveTo(cx, cy); }
      x.stroke();
      for (const p of pts()) { const [cx, cy] = toC(p[0], p[1]); x.beginPath(); x.arc(cx, cy, 11, 0, 7); x.fillStyle = '#121215'; x.fill(); x.lineWidth = 4; x.strokeStyle = col; x.stroke(); }
    };
    draw();
    let dragI = -1, tapT = 0, tapI = -1;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * N, (e.clientY - r.top) / r.height * N]; };
    cv.addEventListener('pointerdown', e => {
      const [cx, cy] = pos(e); const P = pts();
      let best = -1, bd = 40;
      P.forEach((p, i) => { const [px, py] = toC(p[0], p[1]); const d = Math.hypot(px - cx, py - cy); if (d < bd) { bd = d; best = i; } });
      const now = performance.now();
      if (best >= 0 && best === tapI && now - tapT < 350 && best > 0 && best < P.length - 1) { P.splice(best, 1); pushHistory(); draw(); scheduleRender(); tapI = -1; return; }
      tapT = now; tapI = best;
      if (best < 0) {
        const [vx] = fromC(cx, cy); const t = S.curveTable(P);
        const nx = Math.round(vx); if (P.some(p => Math.abs(p[0] - nx) < 4)) return;
        P.push([nx, Math.round(t[clamp(nx, 0, 255)] * 255)]); P.sort((a, c) => a[0] - c[0]);
        best = P.findIndex(p => p[0] === nx); tapI = best;
      }
      dragI = best; cv.setPointerCapture(e.pointerId); draw(); scheduleRender();
    });
    cv.addEventListener('pointermove', e => {
      if (dragI < 0) return;
      const P = pts(); const [cx, cy] = pos(e);
      const [vx, vy] = fromC(cx, cy);
      if (dragI > 0 && dragI < P.length - 1 && (cy < -60 || cy > N + 60)) { P.splice(dragI, 1); dragI = -1; draw(); scheduleRender(); return; }
      let nx = Math.round(vx);
      if (dragI === 0 || dragI === P.length - 1) nx = P[dragI][0];
      else nx = clamp(nx, P[dragI - 1][0] + 2, P[dragI + 1][0] - 2);
      P[dragI] = [nx, Math.round(vy)];
      draw(); scheduleRender();
    });
    const up = () => { if (dragI >= -1) { dragI = -1; pushHistory(); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    box._redraw = draw;
    return box;
  }
  PANELS.effects = b => {
    b.append(ph('Hiệu ứng', resetBtn(['texture', 'clarity', 'dehaze', 'vignette', 'vigMid', 'grain', 'grainSize'])));
    b.append(slider({ key: 'texture', label: 'Kết cấu (Texture)', min: -100, max: 100 }));
    b.append(slider({ key: 'clarity', label: 'Độ rõ (Clarity)', min: -100, max: 100 }));
    b.append(slider({ key: 'dehaze', label: 'Khử mù (Dehaze)', min: -100, max: 100 }));
    b.append(slider({ key: 'vignette', label: 'Làm tối góc', min: -100, max: 100 }));
    b.append(slider({ key: 'vigMid', label: 'Điểm giữa tối góc', min: 0, max: 100, def: 50 }));
    b.append(slider({ key: 'grain', label: 'Hạt film', min: 0, max: 100 }));
    b.append(slider({ key: 'grainSize', label: 'Cỡ hạt', min: 0, max: 100, def: 25 }));
  };
  PANELS.detail = b => {
    b.append(ph('Chi tiết', resetBtn(['sharpen', 'nr'])));
    b.append(slider({ key: 'sharpen', label: 'Làm nét', min: 0, max: 150 }));
    b.append(slider({ key: 'nr', label: 'Giảm nhiễu', min: 0, max: 100 }));
    b.append(h('div', { class: 'note' }, 'Mẹo: phóng to bằng hai ngón khi xem ảnh đã lưu để kiểm tra độ nét. Giảm nhiễu mạnh sẽ làm mịn da và chi tiết nhỏ.'));
  };

  /* ---------- Cắt & xoay ---------- */
  const ASPECTS = [['free', 'Tự do'], ['orig', 'Gốc'], ['1:1', '1:1'], ['4:5', '4:5'], ['5:4', '5:4'], ['3:4', '3:4'], ['4:3', '4:3'], ['2:3', '2:3'], ['3:2', '3:2'], ['9:16', '9:16'], ['16:9', '16:9']];
  function rotDims() { return S.Renderer.rotDims(cur.params, renderer.srcW || 1, renderer.srcH || 1); }
  function aspectNorm(a) {
    if (!a || a === 'free') return null;
    const [W, H] = rotDims();
    const A = a === 'orig' ? W / H : (() => { const [x, y] = a.split(':').map(Number); return x / y; })();
    return A * H / W; // tỉ lệ w/h trong toạ độ chuẩn hoá
  }
  function applyAspect(a) {
    const p = cur.params; p.aspect = a;
    const r = aspectNorm(a); if (!r) return;
    let w, hh; if (r >= 1) { w = 1; hh = 1 / r; } else { hh = 1; w = r; }
    const c = p.crop, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    p.crop = { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(cy - hh / 2, 0, 1 - hh), w, h: hh };
  }
  PANELS.crop = b => {
    b.append(ph('Cắt & Xoay', resetBtn(S.GEO_KEYS)));
    const chips = h('div', { class: 'chips' });
    for (const [k, l] of ASPECTS) chips.append(h('button', { class: 'chip' + (cur.params.aspect === k ? ' on' : ''), onclick: () => { applyAspect(k); pushHistory(); buildPanel(true); scheduleRender(); } }, l));
    b.append(chips);
    b.append(h('div', { class: 'row', style: 'margin:4px 0 8px' },
      h('button', { class: 'btn', html: S.icon('rotate') + '<span>Xoay 90°</span>', onclick: () => { const p = cur.params; p.rot90 = (p.rot90 + 1) % 4; p.crop = { x: 0, y: 0, w: 1, h: 1 }; applyAspect(p.aspect); pushHistory(); scheduleRender(); } }),
      h('button', { class: 'btn' + (cur.params.flipH ? ' on' : ''), html: S.icon('flipH') + '<span>Lật ngang</span>', onclick: () => { const p = cur.params; p.flipH = !p.flipH; p.crop.x = 1 - p.crop.x - p.crop.w; pushHistory(); buildPanel(true); scheduleRender(); } }),
      h('button', { class: 'btn' + (cur.params.flipV ? ' on' : ''), html: S.icon('flipV') + '<span>Lật dọc</span>', onclick: () => { const p = cur.params; p.flipV = !p.flipV; p.crop.y = 1 - p.crop.y - p.crop.h; pushHistory(); buildPanel(true); scheduleRender(); } })));
    b.append(slider({ key: 'straighten', label: 'Làm thẳng', min: -45, max: 45, step: 0.1, fmt: v => (v > 0 ? '+' : '') + v.toFixed(1) + '°' }));
    b.append(h('div', { class: 'note' }, 'Kéo khung để di chuyển, kéo các góc để đổi kích thước. Ảnh hiển thị đầy đủ khi đang ở mục này; vùng cắt được áp dụng khi chuyển sang mục khác và khi xuất.'));
  };
  function layoutCrop() {
    const c = cur.params.crop, r = $('cropRect');
    r.style.left = c.x * 100 + '%'; r.style.top = c.y * 100 + '%'; r.style.width = c.w * 100 + '%'; r.style.height = c.h * 100 + '%';
  }
  (function cropDrag() {
    const ov = $('crop');
    let st = null;
    ov.addEventListener('pointerdown', e => {
      const hEl = e.target.closest('[data-h]'), inRect = e.target.closest('#cropRect');
      if (!hEl && !inRect) return;
      const box = $('canvasBox').getBoundingClientRect();
      st = { h: hEl ? hEl.dataset.h : 'move', x: e.clientX, y: e.clientY, c: { ...cur.params.crop }, bw: box.width, bh: box.height };
      ov.setPointerCapture(e.pointerId); e.preventDefault();
    });
    ov.addEventListener('pointermove', e => {
      if (!st) return;
      const dx = (e.clientX - st.x) / st.bw, dy = (e.clientY - st.y) / st.bh, c0 = st.c;
      let c;
      if (st.h === 'move') c = { ...c0, x: clamp(c0.x + dx, 0, 1 - c0.w), y: clamp(c0.y + dy, 0, 1 - c0.h) };
      else {
        const left = st.h[1] === 'l', top = st.h[0] === 't';
        const ax = left ? c0.x + c0.w : c0.x, ay = top ? c0.y + c0.h : c0.y; // góc cố định
        let px = clamp((left ? c0.x : c0.x + c0.w) + dx, 0, 1), py = clamp((top ? c0.y : c0.y + c0.h) + dy, 0, 1);
        let w = Math.max(0.05, Math.abs(px - ax)), hh = Math.max(0.05, Math.abs(py - ay));
        const r = aspectNorm(cur.params.aspect);
        if (r) {
          if (w / hh > r) w = hh * r; else hh = w / r;
          const maxW = left ? ax : 1 - ax, maxH = top ? ay : 1 - ay;
          if (w > maxW) { w = maxW; hh = w / r; }
          if (hh > maxH) { hh = maxH; w = hh * r; }
        } else { w = Math.min(w, left ? ax : 1 - ax); hh = Math.min(hh, top ? ay : 1 - ay); }
        c = { x: left ? ax - w : ax, y: top ? ay - hh : ay, w, h: hh };
      }
      cur.params.crop = c; layoutCrop();
    });
    const up = () => { if (st) { st = null; pushHistory(); } };
    ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', up);
  })();

  /* ---------- Video: cắt đoạn, tốc độ, âm thanh ---------- */
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  PANELS.clip = b => {
    if (!cur.loaded) { b.append(h('div', { class: 'note' }, 'Hãy chọn một video trước.')); return; }
    const lenKv = h('span');
    const updLen = () => { lenKv.textContent = fmtTime((vid.end - vid.start) / vid.speed); };
    b.append(ph('Cắt đoạn'));
    b.append(slider({ label: 'Bắt đầu', min: 0, max: vid.duration, step: 0.1, def: 0, fmt: fmtTime, get: () => vid.start, set: v => { vid.start = Math.min(v, vid.end - 0.3); }, commit: () => { }, onInput: () => { updLen(); seekTo(vid.start); } }));
    b.append(slider({ label: 'Kết thúc', min: 0, max: vid.duration, step: 0.1, def: vid.duration, fmt: fmtTime, get: () => vid.end, set: v => { vid.end = Math.max(v, vid.start + 0.3); }, commit: () => { }, onInput: () => { updLen(); seekTo(Math.max(vid.start, vid.end - 0.05)); } }));
    b.append(h('div', { class: 'kv' }, h('span', null, 'Độ dài khi xuất'), lenKv)); updLen();
    b.append(ph('Tốc độ'));
    const chips = h('div', { class: 'chips' });
    for (const s of SPEEDS) chips.append(h('button', { class: 'chip' + (vid.speed === s ? ' on' : ''), onclick: () => { vid.speed = s; if (vid.el) vid.el.playbackRate = s; buildPanel(true); } }, s + '×'));
    b.append(chips);
    b.append(ph('Âm thanh'));
    const sw = h('span', { class: 'sw' + (vid.mute ? ' on' : '') });
    b.append(h('div', { class: 'toggle', onclick: () => { vid.mute = !vid.mute; if (vid.el) vid.el.muted = vid.mute; buildPanel(true); } }, h('span', null, 'Tắt tiếng gốc'), sw));
    if (vid.audioMsg) b.append(h('div', { class: 'kv' }, h('span', null, vid.audioMsg)));
    if (vid.music) {
      b.append(h('div', { class: 'row', style: 'margin:6px 0' }, h('span', { html: S.icon('music'), style: 'width:20px;height:20px;display:inline-block' }), h('span', { style: 'flex:1;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, vid.music.name),
        h('button', { class: 'btn', onclick: () => $('fileMusic').click() }, 'Đổi'),
        h('button', { class: 'btn', onclick: () => { if (vid.musicEl) { vid.musicEl.pause(); URL.revokeObjectURL(vid.musicEl.src); } vid.music = null; vid.musicEl = null; buildPanel(true); } }, 'Gỡ')));
      b.append(slider({ label: 'Âm lượng nhạc', min: 0, max: 100, def: 80, get: () => vid.musicVol, set: v => { vid.musicVol = v; if (vid.musicEl) vid.musicEl.volume = v / 100; }, commit: () => { }, onInput: () => { } }));
    } else b.append(h('button', { class: 'btn', style: 'margin:6px 0', html: S.icon('music') + '<span>Thêm nhạc nền</span>', onclick: () => $('fileMusic').click() }));
    b.append(h('div', { class: 'note' }, 'Đổi tốc độ cũng làm thay đổi cao độ âm thanh gốc (như tua nhanh/chậm). Nhạc nền giữ nguyên tốc độ, tự lặp lại và nhỏ dần ở cuối.'));
  };

  /* ---------- Công thức (preset) ---------- */
  const CATS = [['mine', 'Của tôi']].concat(S.PRESET_CATS);
  function allPresetsIn(cat) { return cat === 'mine' ? userPresets : S.BUILTIN.filter(p => p.cat === cat); }
  function findPreset(id) { return S.BUILTIN.find(p => p.id === id) || userPresets.find(p => p.id === id); }
  PANELS.presets = b => {
    const chips = h('div', { class: 'chips' });
    for (const [k, l] of CATS) chips.append(h('button', { class: 'chip' + (presetCat === k ? ' on' : ''), 'data-cat': k, onclick: () => { presetCat = k; buildPanel(); } }, l + (k === 'mine' && userPresets.length ? ' (' + userPresets.length + ')' : '')));
    b.append(chips);
    requestAnimationFrame(() => { const on = chips.querySelector('.on'); if (on) chips.scrollLeft += on.getBoundingClientRect().left - chips.getBoundingClientRect().left - 40; });
    b.append(h('div', { class: 'row', style: 'margin-bottom:8px' },
      h('button', { class: 'btn', html: S.icon('save') + '<span>Lưu công thức</span>', onclick: saveCurrentPreset }),
      h('button', { class: 'btn', html: S.icon('import') + '<span>Nhập .xmp / .cube</span>', onclick: () => $('filePreset').click() }),
      presetCat === 'mine' && userPresets.length ? h('button', { class: 'btn', html: S.icon('export') + '<span>Xuất tất cả</span>', onclick: () => exportPresetsJSON(userPresets) }) : null));
    if (cur.presetSel) {
      const p = findPreset(cur.presetSel.id) || cur.presetSel.preset;
      if (p) b.append(slider({ label: 'Mức độ: ' + p.name, min: 0, max: 100, def: 100, fmt: v => Math.round(v) + '%', get: () => cur.presetAmt, set: v => { cur.presetAmt = v; cur.params = S.mixPreset(p, v / 100, cur.params); }, onInput: () => scheduleRender() }));
    }
    if (cur.params.lut && S.luts[cur.params.lut]) {
      b.append(slider({ key: 'lutAmount', label: 'LUT: ' + (S.luts[cur.params.lut].name || 'LUT'), min: 0, max: 100, def: 100, fmt: v => Math.round(v) + '%' }));
    }
    const grid = h('div', { class: 'thumbs' });
    if (!cur.loaded) b.append(h('div', { class: 'empty-mine' }, 'Mở ' + (mode === 'photo' ? 'ảnh' : 'video') + ' để xem trước công thức trên chính ' + (mode === 'photo' ? 'ảnh' : 'video') + ' của bạn.'));
    grid.append(presetThumb({ id: 'none', name: 'Gốc', params: S.defaults() }));
    const list = allPresetsIn(presetCat);
    for (const p of list) grid.append(presetThumb(p));
    b.append(grid);
    if (presetCat === 'mine') {
      if (!userPresets.length) b.append(h('div', { class: 'empty-mine' }, 'Chưa có công thức riêng. Chỉnh xong bấm “Lưu công thức”, hoặc nhập tệp preset.'));
      b.append(h('div', { class: 'note', html: '<b>Preset Lightroom miễn phí:</b> tải các gói preset “free Lightroom presets” (tệp <code>.xmp</code>) hoặc LUT “free cube LUT” (tệp <code>.cube</code>) trên mạng, giải nén trong app Tệp, rồi bấm <b>Nhập</b>. Có thể chọn nhiều tệp cùng lúc. Công thức dùng chung cho cả ảnh và video. Tệp <code>.dng</code>/<code>.lrtemplate</code> chưa được hỗ trợ.<br><b>Thử ngay – XMP mẫu miễn phí</b> (OpenFilmStocks, giấy phép MIT): <a href="samples/xmp/kodak-portra-400.xmp" download>Portra 400</a> · <a href="samples/xmp/fuji-pro-400h.xmp" download>Fuji 400H</a> · <a href="samples/xmp/kodak-gold-200.xmp" download>Gold 200</a> · <a href="samples/xmp/kodak-tri-x-400.xmp" download>Tri-X (đen trắng)</a>. Bộ đầy đủ: <a href="https://github.com/eliseomartelli/OpenFilmStocks" target="_blank" rel="noopener">github.com/eliseomartelli/OpenFilmStocks</a>. Preset viết cho ảnh RAW nên trên JPEG có thể hơi gắt – kéo thanh mức độ xuống.' }));
    } else b.append(h('div', { class: 'note' }, 'Chạm vào công thức để áp dụng, dùng thanh “Mức độ” để giảm/tăng. Chỉnh thêm các mục khác rồi lưu thành công thức của bạn.'));
    drainThumbs();
  };
  let thumbQ = [];
  function presetThumb(p) {
    const cv = h('canvas', { width: 168, height: 168 });
    const on = cur.presetSel ? cur.presetSel.id === p.id : false;
    const el = h('button', { class: 'th' + (on ? ' on' : ''), 'data-preset': p.id, onclick: e => { if (e.target.closest('.more')) return; applyPreset(p); } }, cv, h('span', null, p.name));
    if (p.source === 'xmp') el.append(h('i', { class: 'badge' }, 'XMP'));
    else if (p.source === 'cube') el.append(h('i', { class: 'badge' }, 'LUT'));
    if (!p.builtin && p.id !== 'none') el.append(h('span', { class: 'more', html: S.icon('more'), onclick: e => { e.stopPropagation(); presetMenu(p); } }));
    thumbQ.push([p, cv]);
    return el;
  }
  let draining = false;
  async function drainThumbs() {
    if (draining) return; draining = true;
    try {
      while (thumbQ.length) {
        const [p, cv] = thumbQ.shift();
        if (!cv.isConnected) continue;
        drawThumb(p, cv);
        if (thumbQ.length % 4 === 0) await nextFrame();
      }
    } finally { draining = false; }
  }
  let thumbSrcVer = -1;
  function thumbSource() { return mode === 'photo' ? photo.thumb : vid.thumb; }
  function drawThumb(p, cv) {
    const src = thumbSource(); if (!src || !thumbR) return;
    const key = mode + srcVersion + ':' + p.id + ':' + JSON.stringify([cur.params.rot90, cur.params.flipH, cur.params.flipV, cur.params.crop, cur.params.straighten]);
    const x = cv.getContext('2d');
    const cached = thumbCache.get(key);
    if (cached) { x.drawImage(cached, 0, 0); return; }
    const sv = mode + srcVersion;
    if (thumbSrcVer !== sv) { thumbR.setSource(src, src.width, src.height); thumbSrcVer = sv; }
    const params = p.id === 'none' ? Object.assign(S.defaults(), pickGeo(cur.params)) : S.mixPreset(p, 1, cur.params);
    const [w, hh] = thumbR.outSize(params, 240);
    thumbR.render(params, w, hh);
    const s = Math.max(168 / w, 168 / hh);
    x.drawImage(thumbR.canvas, (168 - w * s) / 2, (168 - hh * s) / 2, w * s, hh * s);
    const c2 = document.createElement('canvas'); c2.width = c2.height = 168; c2.getContext('2d').drawImage(cv, 0, 0);
    thumbCache.set(key, c2);
    if (thumbCache.size > 300) thumbCache.delete(thumbCache.keys().next().value);
  }
  const pickGeo = p => { const o = {}; for (const k of S.GEO_KEYS) o[k] = S.clone(p[k]); return o; };
  function applyPreset(p, amt = 100) {
    cur.presetSel = { id: p.id, preset: p }; cur.presetAmt = amt;
    cur.params = S.mixPreset(p, amt / 100, cur.params);
    if (p.id === 'none') cur.presetSel = null;
    pushHistory(); buildPanel(true); scheduleRender();
  }
  function presetFromCurrent(name) {
    const params = S.clone(cur.params);
    Object.assign(params, pickGeo(S.defaults()));
    const o = { id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, cat: 'mine', params, source: 'user', created: Date.now() };
    if (params.lut && S.luts[params.lut]) { o.lutData = S.luts[params.lut].data; o.lutSize = S.luts[params.lut].size; o.lutName = S.luts[params.lut].name; }
    return o;
  }
  async function saveCurrentPreset() {
    const name = await askText('Lưu công thức', '', 'Ví dụ: Da đẹp của Khang');
    if (!name) return;
    const o = presetFromCurrent(name);
    userPresets.push(o); await S.store.put(o);
    cur.presetSel = { id: o.id, preset: o }; cur.presetAmt = 100;
    presetCat = 'mine'; tab = 'presets'; buildTabs(); buildPanel(); toast('Đã lưu “' + name + '”');
  }
  async function presetMenu(p) {
    const k = await menu(p.name, [['apply', 'Áp dụng'], ['rename', 'Đổi tên'], ['update', 'Cập nhật bằng chỉnh sửa hiện tại'], ['export', 'Xuất tệp (.json)'], ['del', 'Xóa', 'danger']]);
    if (k === 'apply') applyPreset(p);
    else if (k === 'rename') { const n = await askText('Đổi tên', p.name); if (n) { p.name = n; await S.store.put(p); buildPanel(true); } }
    else if (k === 'update') { const o = presetFromCurrent(p.name); p.params = o.params; p.lutData = o.lutData; p.lutSize = o.lutSize; p.lutName = o.lutName; await S.store.put(p); thumbCache.clear(); buildPanel(true); toast('Đã cập nhật'); }
    else if (k === 'export') exportPresetsJSON([p]);
    else if (k === 'del') { if (await confirmBox('Xóa công thức?', '“' + p.name + '” sẽ bị xóa khỏi máy.', 'Xóa', true)) { userPresets = userPresets.filter(x => x !== p); await S.store.del(p.id); if (cur.presetSel && cur.presetSel.id === p.id) cur.presetSel = null; buildPanel(true); } }
  }
  function exportPresetsJSON(list) {
    const data = { app: 'studio-cua-khang', version: 1, presets: list.map(p => ({ ...p, lutData: p.lutData ? Array.from(p.lutData, v => Math.round(v * 10000) / 10000) : undefined })) };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    deliver(blob, (list.length === 1 ? list[0].name.replace(/[^\p{L}\p{N}]+/gu, '-') : 'cong-thuc-studio') + '.json', 'application/json');
  }
  function registerLut(p) {
    if (p.lutData && p.params && p.params.lut && !S.luts[p.params.lut]) S.luts[p.params.lut] = { size: p.lutSize, data: Float32Array.from(p.lutData), name: p.lutName || p.name };
  }
  async function importFiles(files) {
    const added = [], errs = [];
    for (const f of files) {
      const name = f.name.replace(/\.[^.]+$/, '');
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      try {
        const text = await f.text();
        const base = { cat: 'mine', created: Date.now() + added.length };
        const nid = () => 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        if (ext === 'xmp' || /crs:/.test(text.slice(0, 20000))) {
          const r = S.parseXMP(text, name);
          added.push({ ...base, id: nid(), name: r.name || name, params: r.params, source: 'xmp' });
        } else if (ext === 'cube' || /LUT_3D_SIZE/.test(text)) {
          const r = S.parseCUBE(text, name);
          const id = nid();
          const params = S.defaults(); params.lut = 'lut_' + id; params.lutAmount = 100;
          S.luts[params.lut] = { size: r.size, data: r.data, name: r.name || name };
          added.push({ ...base, id, name: r.name || name, params, source: 'cube', lutData: r.data, lutSize: r.size, lutName: r.name || name });
        } else if (ext === 'json' || /^\s*[[{]/.test(text)) {
          const j = JSON.parse(text);
          const arr = Array.isArray(j) ? j : j.presets ? j.presets : [j];
          for (const p of arr) {
            if (!p || !p.params) continue;
            const o = { ...base, ...p, id: nid(), params: Object.assign(S.defaults(), p.params), cat: 'mine', builtin: undefined };
            registerLut(o); added.push(o);
          }
        } else if (ext === 'lrtemplate') errs.push(f.name + ': định dạng .lrtemplate cũ chưa hỗ trợ (hãy dùng .xmp)');
        else if (ext === 'dng') errs.push(f.name + ': preset dạng ảnh DNG chưa hỗ trợ (hãy dùng .xmp)');
        else errs.push(f.name + ': không nhận ra định dạng');
      } catch (e) { errs.push(f.name + ': ' + e.message); }
    }
    for (const p of added) { userPresets.push(p); try { await S.store.put(p); } catch (e) { /* bỏ qua */ } }
    if (added.length) {
      presetCat = 'mine'; tab = 'presets'; buildTabs();
      if (cur.loaded) applyPreset(added[0]); else buildPanel();
      toast('Đã nhập ' + added.length + ' công thức' + (errs.length ? ' (' + errs.length + ' tệp lỗi)' : ''));
    }
    if (errs.length) info('Một số tệp không nhập được', errs.map(x => x.replace(/</g, '&lt;')).join('<br>'));
    return { added: added.length, errs };
  }
  $('filePreset').onchange = e => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) importFiles(fs); };
  window.App.importFiles = importFiles;
  window.App.applyPresetById = (id, amt) => applyPreset(findPreset(id), amt ?? 100);
  window.App.setParams = o => { Object.assign(cur.params, o); pushHistory(); buildPanel(true); scheduleRender(); };
  window.App.setTab = t => { tab = t; buildTabs(); buildPanel(); scheduleRender(); };
  window.App.setCat = c => { presetCat = c; buildPanel(); };

  /* ================= HIỂN THỊ ================= */
  let rq = false, vidDirty = true, frameN = 0;
  function scheduleRender() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; renderNow(); }); }
  function renderNow() {
    if (!renderer || !cur.loaded || !views.editor.classList.contains('active')) return;
    if (mode === 'video') {
      const v = vid.el; if (!v || v.readyState < 2) return;
      if (vidDirty) { renderer.setSource(v, v.videoWidth, v.videoHeight); vidDirty = false; }
    }
    const cropMode = tab === 'crop';
    const stage = $('stage');
    const sw = Math.max(50, stage.clientWidth - 16), sh = Math.max(50, stage.clientHeight - 16);
    const [fw, fh] = renderer.outSize(cur.params, 1e9, cropMode);
    const sc = Math.min(sw / fw, sh / fh);
    const cw = Math.max(1, Math.floor(fw * sc)), chh = Math.max(1, Math.floor(fh * sc));
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    let pw = Math.round(cw * dpr), phh = Math.round(chh * dpr);
    if (pw > fw) { pw = fw; phh = fh; }
    const gl = $('gl'); gl.style.width = cw + 'px'; gl.style.height = chh + 'px';
    renderer.render(cur.params, pw, phh, { ignoreCrop: cropMode, original: holding, split: compare && !cropMode ? splitPos : -1, seed: mode === 'video' ? (frameN++ % 97) : 0 });
    if (cropMode) layoutCrop();
    histoSoon();
  }
  window.addEventListener('resize', scheduleRender);
  if (window.ResizeObserver) new ResizeObserver(scheduleRender).observe($('stage'));

  /* ---------- Histogram ---------- */
  let histT = 0, histPending = false;
  const hc = document.createElement('canvas'); hc.width = 160; hc.height = 160;
  function histoSoon() {
    if (histT) { histPending = true; return; }
    updateHisto();
    histT = setTimeout(() => { histT = 0; if (histPending) { histPending = false; histoSoon(); } }, 160);
  }
  function updateHisto() {
    const gl = $('gl'); if (!gl.width) return;
    const s = Math.min(1, 160 / Math.max(gl.width, gl.height));
    const w = Math.max(1, Math.round(gl.width * s)), hh = Math.max(1, Math.round(gl.height * s));
    const x = hc.getContext('2d', { willReadFrequently: true });
    x.clearRect(0, 0, 160, 160); x.drawImage(gl, 0, 0, w, hh);
    const d = x.getImageData(0, 0, w, hh).data;
    const B = 64, R = new Float32Array(B), Gg = new Float32Array(B), Bb = new Float32Array(B), L = new Float32Array(B);
    for (let i = 0; i < d.length; i += 4) {
      R[d[i] >> 2]++; Gg[d[i + 1] >> 2]++; Bb[d[i + 2] >> 2]++;
      L[(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) >> 2]++;
    }
    lumaHist = L;
    const hcv = $('histo'), c = hcv.getContext('2d');
    c.clearRect(0, 0, 256, 96);
    let m = 1; for (let i = 1; i < B - 1; i++) m = Math.max(m, R[i], Gg[i], Bb[i]);
    c.globalCompositeOperation = 'lighter';
    for (const [arr, col] of [[R, 'rgba(230,60,60,.75)'], [Gg, 'rgba(60,200,80,.75)'], [Bb, 'rgba(70,110,255,.8)']]) {
      c.beginPath(); c.moveTo(0, 96);
      for (let i = 0; i < B; i++) c.lineTo(i / (B - 1) * 256, 96 - Math.min(1, arr[i] / m) * 90);
      c.lineTo(256, 96); c.closePath(); c.fillStyle = col; c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }

  /* ---------- So sánh trước / sau ---------- */
  function setCompare(on) {
    compare = on; $('btnCompare').classList.toggle('on', on); $('split').hidden = !on; posSplit(); scheduleRender();
  }
  function posSplit() { const sp = $('split'); sp.querySelector('.split-line').style.left = splitPos * 100 + '%'; sp.querySelector('.split-knob').style.left = splitPos * 100 + '%'; }
  $('btnCompare').onclick = () => { if (!cur.loaded) return; if (tab === 'crop') { tab = 'presets'; buildTabs(); buildPanel(); } setCompare(!compare); };
  (function () {
    const sp = $('split'); let d = false;
    const mv = e => { const r = sp.getBoundingClientRect(); splitPos = clamp((e.clientX - r.left) / r.width, 0, 1); posSplit(); scheduleRender(); };
    sp.addEventListener('pointerdown', e => { d = true; sp.setPointerCapture(e.pointerId); mv(e); });
    sp.addEventListener('pointermove', e => { if (d) mv(e); });
    sp.addEventListener('pointerup', () => { d = false; }); sp.addEventListener('pointercancel', () => { d = false; });
  })();
  (function holdOriginal() {
    const box = $('canvasBox'); let t = 0, sx = 0, sy = 0;
    const stop = () => { clearTimeout(t); t = 0; if (holding) { holding = false; $('holdTag').hidden = true; scheduleRender(); } };
    box.addEventListener('pointerdown', e => {
      if (tab === 'crop' || compare || !cur.loaded) return;
      sx = e.clientX; sy = e.clientY;
      t = setTimeout(() => { holding = true; $('holdTag').hidden = false; scheduleRender(); }, 220);
    });
    box.addEventListener('pointermove', e => { if (t && !holding && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) { clearTimeout(t); t = 0; } });
    box.addEventListener('pointerup', stop); box.addEventListener('pointercancel', stop); box.addEventListener('pointerleave', stop);
    box.addEventListener('contextmenu', e => e.preventDefault());
  })();

  /* ---------- Tự động ---------- */
  const s2l = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const l2s = c => c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  function autoAdjust(wbOnly) {
    if (!cur.loaded) return;
    const src = thumbSource(); if (!src) return;
    const p0 = Object.assign(S.defaults(), pickGeo(cur.params));
    const sv = mode + srcVersion;
    if (thumbSrcVer !== sv) { thumbR.setSource(src, src.width, src.height); thumbSrcVer = sv; }
    const [w, hh] = thumbR.outSize(p0, 200); thumbR.render(p0, w, hh);
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(thumbR.canvas, 0, 0);
    const d = x.getImageData(0, 0, w, hh).data;
    let sr = 0, sg = 0, sb = 0, n = 0; const Ls = [];
    for (let i = 0; i < d.length; i += 4) {
      const r = s2l(d[i] / 255), g = s2l(d[i + 1] / 255), b = s2l(d[i + 2] / 255);
      const Lg = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      Ls.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (Lg > 0.12 && Lg < 0.92 && mx < 250 && (mx - mn) < 0.45 * 255) { sr += r; sg += g; sb += b; n++; }
    }
    const P = cur.params;
    let temp = 0, tint = 0;
    if (n > 50) {
      const lr = Math.log2(sr / n), lg = Math.log2(sg / n), lb = Math.log2(sb / n);
      temp = clamp((lb - lr) / 0.84 * 100 * 0.6, -45, 45);
      const lr2 = lr + 0.42 * temp / 100, lb2 = lb - 0.42 * temp / 100;
      tint = clamp((lg - (lr2 + lb2) / 2) / 0.32 * 100 * 0.6, -35, 35);
    }
    P.temp = Math.round(temp); P.tint = Math.round(tint);
    if (!wbOnly) {
      Ls.sort((a, b) => a - b);
      const q = f => Ls[Math.min(Ls.length - 1, Math.floor(f * Ls.length))];
      const med = Math.max(1e-4, q(0.5));
      const ev = clamp(Math.log2(s2l(0.45) / med) * 0.7, -1.5, 1.8);
      const g = Math.pow(2, ev), A = v => l2s(Math.min(1, v * g));
      const p2 = A(q(0.02)), p10 = A(q(0.1)), p90 = A(q(0.9)), p98 = A(q(0.98));
      let clip = 0; for (const v of Ls) if (v * g > 0.93) clip++; clip /= Ls.length;
      P.exposure = Math.round(ev * 100) / 100;
      P.contrast = Math.round(clamp((0.62 - (p90 - p10)) * 80, -20, 30));
      P.highlights = Math.round(-clamp(clip * 700 + (p98 > 0.9 ? (p98 - 0.9) * 200 : 0), 0, 70));
      P.shadows = Math.round(clamp((0.12 - p10) * 280, 0, 45));
      P.whites = Math.round(clamp((0.94 - p98) * 160, -10, 40));
      P.blacks = Math.round(clamp(-(p2 - 0.025) * 220, -40, 15));
      P.vibrance = Math.max(P.vibrance, 12);
    }
    pushHistory(); buildPanel(true); scheduleRender();
    toast(wbOnly ? 'Đã cân bằng trắng tự động' : 'Đã tự động chỉnh sáng & màu');
  }
  window.App.auto = autoAdjust;

  /* ================= MỞ ẢNH ================= */
  const autoOrient = window.CSS && CSS.supports && CSS.supports('image-orientation', 'from-image');
  async function exifOrientation(file) {
    try {
      const b = new DataView(await file.slice(0, 128 * 1024).arrayBuffer());
      if (b.getUint16(0) !== 0xFFD8) return 1;
      let o = 2;
      while (o < b.byteLength - 4) {
        const m = b.getUint16(o); const len = b.getUint16(o + 2);
        if (m === 0xFFE1 && b.getUint32(o + 4) === 0x45786966) {
          const t = o + 10, le = b.getUint16(t) === 0x4949;
          const ifd = t + b.getUint32(t + 4, le), cnt = b.getUint16(ifd, le);
          for (let i = 0; i < cnt; i++) { const e = ifd + 2 + i * 12; if (b.getUint16(e, le) === 0x0112) return b.getUint16(e + 8, le); }
          return 1;
        }
        if ((m & 0xFF00) !== 0xFF00) break;
        o += 2 + len;
      }
    } catch (e) { /* bỏ qua */ }
    return 1;
  }
  function downscale(src, maxLong) {
    let cw = src.width, chh = src.height, c = src;
    const s = Math.min(1, maxLong / Math.max(cw, chh));
    const tw = Math.max(1, Math.round(cw * s)), th = Math.max(1, Math.round(chh * s));
    while (cw / 2 >= tw * 1.01 && cw > 2) {
      const n = document.createElement('canvas'); n.width = Math.round(cw / 2); n.height = Math.round(chh / 2);
      const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height);
      c = n; cw = n.width; chh = n.height;
    }
    const out = document.createElement('canvas'); out.width = tw; out.height = th;
    const x = out.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, tw, th);
    return out;
  }
  async function decodePhoto(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.decoding = 'async'; img.src = url;
      await img.decode();
      const w = img.naturalWidth, hh = img.naturalHeight;
      if (!w || !hh) throw new Error('decode');
      const orient = autoOrient ? 1 : await exifOrientation(file);
      const maxSide = Math.min(renderer.maxTex, 8192);
      const s = Math.min(1, maxSide / Math.max(w, hh), Math.sqrt(16.7e6 / (w * hh)));
      const sw = orient >= 5;
      const dw = Math.round(w * s), dh = Math.round(hh * s);
      const c = document.createElement('canvas'); c.width = sw ? dh : dw; c.height = sw ? dw : dh;
      const x = c.getContext('2d');
      const T = { 2: [-1, 0, 0, 1, dw, 0], 3: [-1, 0, 0, -1, dw, dh], 4: [1, 0, 0, -1, 0, dh], 5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, dh, 0], 7: [0, -1, -1, 0, dh, dw], 8: [0, -1, 1, 0, 0, dw] }[orient];
      if (T) x.setTransform(...T);
      x.drawImage(img, 0, 0, dw, dh);
      return { canvas: c, origW: w, origH: hh, scaled: s < 1 };
    } finally { URL.revokeObjectURL(url); }
  }
  async function loadPhotoFile(file) {
    if (mode !== 'photo') go('photo');
    busy('Đang mở ảnh…');
    await nextFrame();
    try {
      const r = await decodePhoto(file);
      photo.full = r.canvas; photo.name = (file.name || 'anh').replace(/\.[^.]+$/, '');
      photo.preview = downscale(r.canvas, 2048);
      photo.thumb = downscale(photo.preview, 240);
      modes.photo.loaded = true;
      modes.photo.params = Object.assign(modes.photo.params, pickGeo(S.defaults()));
      modes.photo.params.crop = { x: 0, y: 0, w: 1, h: 1 };
      thumbCache.clear();
      attachSource(); resetHistory(); updateEmpty(); buildPanel(); scheduleRender();
      unbusy();
      if (r.scaled) toast('Ảnh rất lớn, đã giới hạn ' + r.canvas.width + '×' + r.canvas.height + ' để chạy mượt trên máy');
      return true;
    } catch (e) {
      unbusy();
      const heic = /heic|heif/i.test(file.type + file.name);
      info('Không mở được ảnh', (heic ? 'Trình duyệt này không đọc được ảnh <b>HEIC</b>. ' : 'Không đọc được tệp ảnh này. ') +
        'Cách khắc phục:<br>• Chọn ảnh qua <b>Thư viện ảnh</b> (iPhone tự chuyển sang JPEG).<br>• Hoặc vào <b>Cài đặt → Camera → Định dạng → Tương thích nhất</b>.<br>• Hoặc mở ảnh trong app Ảnh, bấm Chia sẻ → “Lưu vào Tệp” dạng JPEG.');
      return false;
    }
  }
  window.App.loadPhotoFile = loadPhotoFile;
  $('filePhoto').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadPhotoFile(f); };

  /* ================= MỞ VIDEO ================= */
  function videoEl() {
    if (vid.el) return vid.el;
    const v = document.createElement('video');
    v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.preload = 'auto'; v.crossOrigin = 'anonymous';
    v.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1';
    document.body.append(v);
    v.addEventListener('seeked', () => { vidDirty = true; if (!vid.playing) { scheduleRender(); updTime(); } });
    v.addEventListener('loadeddata', () => { vidDirty = true; scheduleRender(); });
    vid.el = v; return v;
  }
  const once = (el, ev, ms = 15000) => new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms);
    el.addEventListener(ev, () => { clearTimeout(t); res(); }, { once: true });
    el.addEventListener('error', () => { clearTimeout(t); rej(new Error('Không phát được video này')); }, { once: true });
  });
  function grabVideoThumb() {
    const v = vid.el; if (!v || !v.videoWidth) return;
    const s = Math.min(1, 240 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    vid.thumb = c; srcVersion++; thumbCache.clear();
  }
  async function loadVideoFile(file) {
    if (mode !== 'video') go('video');
    pauseVideo();
    busy('Đang mở video…');
    const v = videoEl();
    try {
      if (vid.url) URL.revokeObjectURL(vid.url);
      vid.url = URL.createObjectURL(file); vid.name = (file.name || 'video').replace(/\.[^.]+$/, '');
      const p = once(v, 'loadeddata');
      v.src = vid.url; v.muted = true; v.load();
      await p;
      if (!v.videoWidth) throw new Error('Không có hình');
      vid.duration = isFinite(v.duration) ? v.duration : 0;
      vid.start = 0; vid.end = vid.duration; vid.speed = 1;
      await S.seekVideo(v, Math.min(0.05, vid.duration / 2));
      v.muted = vid.mute;
      modes.video.loaded = true;
      modes.video.params = Object.assign(modes.video.params, pickGeo(S.defaults()));
      modes.video.params.crop = { x: 0, y: 0, w: 1, h: 1 };
      vidDirty = true; attachSource(); grabVideoThumb();
      resetHistory(); updateEmpty(); buildPanel(); scheduleRender(); updTime();
      unbusy();
      vid.srcAudio = null; vid.audioMsg = 'Đang đọc âm thanh gốc…';
      decodeSourceAudio(file);
      return true;
    } catch (e) {
      unbusy();
      info('Không mở được video', 'Trình duyệt không đọc được video này (' + (e.message || e) + '). Hãy thử video quay bằng camera iPhone (H.264/HEVC) hoặc tệp MP4.');
      return false;
    }
  }
  async function decodeAudio(ab) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new OAC(2, 1, 48000);
    return await new Promise((res, rej) => { const pr = ctx.decodeAudioData(ab, res, rej); if (pr && pr.then) pr.then(res, rej); });
  }
  async function decodeSourceAudio(file) {
    if (file.size > 700e6) { vid.audioMsg = 'Video quá lớn để xử lý âm thanh – sẽ xuất không tiếng'; buildPanelIf('clip'); return; }
    try { vid.srcAudio = await decodeAudio(await file.arrayBuffer()); vid.audioMsg = ''; }
    catch (e) { vid.srcAudio = null; vid.audioMsg = 'Video không có âm thanh (hoặc không đọc được)'; }
    buildPanelIf('clip');
  }
  function buildPanelIf(t) { if (tab === t && mode === 'video') buildPanel(true); }
  window.App.loadVideoFile = loadVideoFile;
  $('fileVideo').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadVideoFile(f); };
  $('fileMusic').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    busy('Đang đọc nhạc…');
    try {
      const buf = await decodeAudio(await f.arrayBuffer());
      if (vid.musicEl) { vid.musicEl.pause(); URL.revokeObjectURL(vid.musicEl.src); }
      const a = new Audio(URL.createObjectURL(f)); a.loop = true; a.volume = vid.musicVol / 100;
      vid.music = { name: f.name, buffer: buf }; vid.musicEl = a;
      toast('Đã thêm nhạc nền');
    } catch (er) { info('Không đọc được nhạc', 'Hãy chọn tệp MP3, M4A, AAC hoặc WAV.'); }
    unbusy(); buildPanelIf('clip');
  };
  window.App.setMusicBuffer = (buf, name) => { vid.music = { name: name || 'nhac', buffer: buf }; };

  function seekTo(t) { const v = vid.el; if (!v) return; pauseVideo(); v.currentTime = clamp(t, 0, vid.duration); }
  function updTime() {
    const v = vid.el; if (!v) return;
    $('vTime').textContent = fmtTimeShort(v.currentTime) + ' / ' + fmtTimeShort(vid.duration);
    if (!seeking) $('vSeek').value = vid.duration ? Math.round(v.currentTime / vid.duration * 1000) : 0;
  }
  let seeking = false;
  $('vSeek').addEventListener('input', e => { seeking = true; const v = vid.el; if (!v || !vid.duration) return; pauseVideo(); v.currentTime = e.target.value / 1000 * vid.duration; });
  $('vSeek').addEventListener('change', () => { seeking = false; });
  function playVideo() {
    const v = vid.el; if (!v || !modes.video.loaded) return;
    if (v.currentTime < vid.start || v.currentTime >= vid.end - 0.05) v.currentTime = vid.start;
    v.muted = vid.mute; v.playbackRate = vid.speed;
    try { v.preservesPitch = false; v.webkitPreservesPitch = false; } catch (e) { }
    v.play().then(() => {
      vid.playing = true; $('vPlay').innerHTML = S.icon('pause');
      if (vid.musicEl) { vid.musicEl.volume = vid.musicVol / 100; try { vid.musicEl.currentTime = ((v.currentTime - vid.start) / vid.speed) % (vid.musicEl.duration || 1e9); } catch (e) { } vid.musicEl.play().catch(() => { }); }
      loop();
    }).catch(err => toast('Không phát được: ' + err.message));
  }
  function loop() {
    if (!vid.playing) return;
    const v = vid.el;
    if (v.currentTime >= vid.end - 0.02 || v.ended) {
      v.currentTime = vid.start; if (v.paused) v.play().catch(() => { });
      if (vid.musicEl) vid.musicEl.currentTime = 0;
    }
    vidDirty = true; renderNow(); updTime();
    if ('requestVideoFrameCallback' in v && !v.paused) v.requestVideoFrameCallback(loop); else requestAnimationFrame(loop);
  }
  function pauseVideo() {
    const v = vid.el; if (!v) return;
    if (!v.paused) v.pause();
    if (vid.musicEl) vid.musicEl.pause();
    if (vid.playing) { vid.playing = false; $('vPlay').innerHTML = S.icon('play'); grabVideoThumbSoon(); }
  }
  let gvt = 0; function grabVideoThumbSoon() { clearTimeout(gvt); gvt = setTimeout(() => { grabVideoThumb(); if (tab === 'presets') buildPanel(true); }, 300); }
  $('vPlay').onclick = () => { vid.playing ? pauseVideo() : playVideo(); };

  /* ================= XUẤT ================= */
  async function deliver(blob, name, type) {
    const file = new File([blob], name, { type });
    window.App.lastExport = { name, type, size: blob.size, blob };
    if (navigator.canShare && isIOS) {
      try {
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return 'shared'; }
      } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
    }
    showResult(blob, file, name, type);
    return 'sheet';
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function showResult(blob, file, name, type) {
    const url = URL.createObjectURL(blob);
    const isImg = type.startsWith('image/'), isVid = type.startsWith('video/');
    if (!isIOS) downloadBlob(blob, name);
    sheet((s, close) => {
      s.append(h('h2', null, isImg ? 'Ảnh đã sẵn sàng' : isVid ? 'Video đã sẵn sàng' : 'Tệp đã sẵn sàng'));
      if (isImg) s.append(h('img', { class: 'result-img', src: url, alt: name }));
      if (isVid) s.append(h('video', { class: 'result-img', src: url, controls: true, playsinline: true }));
      s.append(h('div', { class: 'kv' }, h('span', null, name), h('span', null, (blob.size / 1048576).toFixed(1) + ' MB')));
      if (isIOS && isImg) s.append(h('div', { class: 'note' }, 'Nhấn giữ ảnh rồi chọn “Lưu vào Ảnh”, hoặc bấm “Chia sẻ / Lưu” bên dưới.'));
      else if (!isIOS) s.append(h('div', { class: 'note' }, 'Tệp đã được tải xuống. Bấm “Tải lại” nếu chưa thấy.'));
      const acts = h('div', { class: 'acts' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) acts.append(h('button', { class: 'pill', onclick: async () => { try { await navigator.share({ files: [file] }); } catch (e) { if (e.name !== 'AbortError') toast('Không chia sẻ được: ' + e.message); } } }, 'Chia sẻ / Lưu'));
      acts.append(h('button', { class: 'pill ghost', onclick: () => downloadBlob(blob, name) }, isIOS ? 'Tải về Tệp' : 'Tải lại'));
      acts.append(h('button', { class: 'pill ghost', onclick: close }, 'Đóng'));
      s.append(acts);
    });
  }
  $('btnExport').onclick = () => { if (!cur.loaded) { toast('Hãy mở ' + (mode === 'photo' ? 'ảnh' : 'video') + ' trước'); return; } mode === 'photo' ? photoExportSheet() : videoExportSheet(); };
  const exportOpt = { fmt: 'jpeg', q: 92 };
  function fullPhotoSize() {
    const [W, H] = S.Renderer.rotDims(cur.params, photo.full.width, photo.full.height);
    let w = cur.params.crop.w * W, hh = cur.params.crop.h * H;
    const s = Math.min(1, renderer.maxTex / Math.max(w, hh), Math.sqrt(16.7e6 / (w * hh)));
    return [Math.round(w * s), Math.round(hh * s)];
  }
  function photoExportSheet() {
    sheet((s, close) => {
      const [W, H] = fullPhotoSize();
      s.append(h('h2', null, 'Lưu ảnh'));
      const seg = h('div', { class: 'seg' });
      const draw = () => { seg.innerHTML = ''; for (const [k, l] of [['jpeg', 'JPEG'], ['png', 'PNG (không nén mất)']]) seg.append(h('button', { class: exportOpt.fmt === k ? 'on' : '', onclick: () => { exportOpt.fmt = k; draw(); qs.style.display = k === 'jpeg' ? '' : 'none'; } }, l)); };
      const qs = slider({ label: 'Chất lượng JPEG', min: 50, max: 100, def: 92, get: () => exportOpt.q, set: v => { exportOpt.q = v; }, commit: () => { }, onInput: () => { } });
      draw(); qs.style.display = exportOpt.fmt === 'jpeg' ? '' : 'none';
      s.append(seg, qs, h('div', { class: 'kv' }, h('span', null, 'Kích thước'), h('span', null, W + ' × ' + H + ' px (độ phân giải gốc)')));
      s.append(h('div', { class: 'acts' }, h('button', { class: 'pill ghost', onclick: close }, 'Hủy'), h('button', { class: 'pill', id: 'doExport', onclick: () => { close(); exportPhoto(); } }, 'Lưu ảnh')));
    });
  }
  async function exportPhoto(opt = exportOpt) {
    busy('Đang xuất ảnh độ phân giải gốc…');
    await nextFrame(); await nextFrame();
    let out = null;
    try {
      renderer.setSource(photo.full, photo.full.width, photo.full.height);
      const [W, H] = fullPhotoSize();
      renderer.render(cur.params, W, H, { seed: 0 });
      out = document.createElement('canvas'); out.width = W; out.height = H;
      out.getContext('2d').drawImage(renderer.canvas, 0, 0);
      renderer.freePool(); attachSource(); scheduleRender();
      const type = opt.fmt === 'png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(new Error('Không tạo được tệp (thiếu bộ nhớ?)')), type, opt.q / 100));
      out.width = out.height = 0;
      unbusy();
      window.App.lastPhoto = { W, H };
      return await deliver(blob, (photo.name || 'anh') + '-studio.' + (opt.fmt === 'png' ? 'png' : 'jpg'), type);
    } catch (e) {
      unbusy(); renderer.freePool(); attachSource(); scheduleRender();
      info('Lỗi khi lưu ảnh', (e.message || e) + '<br>Thử lưu dạng JPEG hoặc đóng bớt ứng dụng khác.');
    }
  }
  window.App.exportPhoto = exportPhoto;
  // Chỉnh Ảnh → Chỉnh Mặt: đưa ảnh đã chỉnh (độ phân giải gốc) sang công cụ Chỉnh Mặt
  async function photoToRetouch() {
    if (!photo || !photo.full) { go('retouch'); return; }
    busy('Đang chuyển sang Chỉnh Mặt…'); await nextFrame();
    try {
      renderer.setSource(photo.full, photo.full.width, photo.full.height);
      const [W, H] = fullPhotoSize();
      renderer.render(cur.params, W, H, { seed: 0 });
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      out.getContext('2d').drawImage(renderer.canvas, 0, 0);
      renderer.freePool(); attachSource(); scheduleRender();
      unbusy();
      await window.App.retouchOpen(out, photo.name || 'anh');
    } catch (e) { unbusy(); renderer.freePool(); attachSource(); scheduleRender(); info('Không chuyển được', String(e.message || e)); }
  }
  $('btnToRetouch').onclick = photoToRetouch;
  const vexp = { res: 1080, q: 1 };
  function videoTargetLong(res) {
    const [fw, fh] = renderer.outSize(cur.params, 1e9);
    const short = Math.min(fw, fh), long = Math.max(fw, fh);
    const sc = res ? Math.min(1, res / short) : 1;
    return Math.min(3840, Math.round(long * sc));
  }
  function videoExportSheet() {
    pauseVideo();
    sheet((s, close) => {
      s.append(h('h2', null, 'Xuất video'));
      const resC = h('div', { class: 'chips' }), qC = h('div', { class: 'chips' });
      const v = vid.el;
      const draw = () => {
        resC.innerHTML = ''; qC.innerHTML = '';
        for (const [k, l] of [[720, '720p'], [1080, '1080p'], [0, 'Gốc (' + v.videoWidth + '×' + v.videoHeight + ')']]) resC.append(h('button', { class: 'chip' + (vexp.res === k ? ' on' : ''), onclick: () => { vexp.res = k; draw(); } }, l));
        for (const [k, l] of [[0.6, 'Nhẹ'], [1, 'Cân bằng'], [1.6, 'Cao']]) qC.append(h('button', { class: 'chip' + (vexp.q === k ? ' on' : ''), onclick: () => { vexp.q = k; draw(); } }, l));
      };
      draw();
      const wc = typeof VideoEncoder !== 'undefined';
      const audio = (!vid.mute && vid.srcAudio ? 'âm thanh gốc' : '') + (vid.music ? (!vid.mute && vid.srcAudio ? ' + ' : '') + 'nhạc nền' : '') || 'không tiếng';
      s.append(h('div', { class: 'kv' }, h('span', null, 'Độ phân giải')), resC, h('div', { class: 'kv' }, h('span', null, 'Chất lượng')), qC,
        h('div', { class: 'kv' }, h('span', null, 'Đoạn'), h('span', null, fmtTime(vid.start) + ' → ' + fmtTime(vid.end) + ' · ' + vid.speed + '×')),
        h('div', { class: 'kv' }, h('span', null, 'Độ dài'), h('span', null, fmtTime((vid.end - vid.start) / vid.speed))),
        h('div', { class: 'kv' }, h('span', null, 'Âm thanh'), h('span', null, audio)),
        h('div', { class: 'note' }, wc ? 'Video được dựng ngay trên máy (MP4 H.264). Giữ màn hình mở cho tới khi xong.' : 'Trình duyệt này sẽ ghi video theo thời gian thực. Giữ màn hình mở cho tới khi xong.'));
      s.append(h('div', { class: 'acts' }, h('button', { class: 'pill ghost', onclick: close }, 'Hủy'), h('button', { class: 'pill', onclick: () => { close(); exportVideo(); } }, 'Xuất video')));
    });
  }
  async function exportVideo(extra = {}) {
    pauseVideo();
    let cancelled = false;
    busy('Đang chuẩn bị…', 0, true); busyCancel = () => { cancelled = true; };
    let wake = null; try { wake = navigator.wakeLock && await navigator.wakeLock.request('screen'); } catch (e) { }
    const t0 = performance.now();
    try {
      const r = await S.exportVideo(Object.assign({
        video: vid.el, renderer, params: S.clone(cur.params), start: vid.start, end: vid.end, speed: vid.speed, mute: vid.mute,
        srcAudio: vid.srcAudio, music: vid.music ? { buffer: vid.music.buffer, volume: vid.musicVol / 100 } : null,
        maxLong: videoTargetLong(vexp.res), quality: vexp.q,
        onProgress: (p, t) => busy(t + ' ' + Math.round(p * 100) + '%', p, true),
        cancelled: () => cancelled
      }, extra));
      unbusy();
      window.App.lastVideo = { method: r.method, frames: r.frames, W: r.W, H: r.H, size: r.blob.size, ms: performance.now() - t0, warn: r.warn };
      if (r.warn) toast(r.warn, 5000);
      vidDirty = true; renderer.freePool(); scheduleRender();
      return await deliver(r.blob, (vid.name || 'video') + '-studio.' + r.ext, r.mime);
    } catch (e) {
      unbusy(); vidDirty = true; scheduleRender();
      if (e.message === 'CANCELLED') toast('Đã hủy xuất video');
      else { window.App.lastVideoError = e.message || String(e); info('Lỗi khi xuất video', String(e.message || e)); }
    } finally { if (wake) try { wake.release(); } catch (e) { } }
  }
  window.App.exportVideo = exportVideo;

  /* ================= MỞ TỆP ================= */
  const pick = () => (mode === 'photo' ? $('filePhoto') : $('fileVideo')).click();
  $('btnPick').onclick = pick; $('btnOpen').onclick = pick;

  /* ================= GHÉP MẶT → CHỈNH ẢNH ================= */
  $('faceToPhoto').onclick = async () => {
    let doc = null;
    try { doc = $('faceFrame').contentDocument; } catch (e) { doc = null; }
    if (!doc) { toast('Hãy lưu ảnh ghép về máy rồi mở trong Chỉnh Ảnh'); go('photo'); return; }
    const cands = [];
    doc.querySelectorAll('img').forEach(im => { if (im.complete && im.naturalWidth > 64 && /^(blob:|data:)/.test(im.src)) cands.push({ el: im, a: im.naturalWidth * im.naturalHeight, vis: !!im.offsetParent }); });
    doc.querySelectorAll('canvas').forEach(c => { if (c.width > 64 && c.height > 64) cands.push({ el: c, a: c.width * c.height, vis: !!c.offsetParent }); });
    cands.sort((a, b) => (b.vis - a.vis) || (b.a - a.a));
    for (const c of cands) {
      try {
        let blob;
        if (c.el.tagName === 'IMG') blob = await (await fetch(c.el.src)).blob();
        else blob = await new Promise((res, rej) => c.el.toBlob(b => b ? res(b) : rej(new Error('x')), 'image/png'));
        go('photo');
        await loadPhotoFile(new File([blob], 'ghep-mat.png', { type: blob.type || 'image/png' }));
        toast('Đã chuyển ảnh ghép sang Chỉnh Ảnh');
        return;
      } catch (e) { /* thử ảnh tiếp theo */ }
    }
    toast('Chưa thấy ảnh kết quả. Hãy ghép mặt xong rồi bấm lại, hoặc lưu ảnh rồi mở trong Chỉnh Ảnh.', 4000);
  };

  /* ================= KHỞI ĐỘNG ================= */
  async function init() {
    try {
      renderer = new S.Renderer($('gl'), { preserve: true });
      thumbR = new S.Renderer(document.createElement('canvas'), { preserve: true });
    } catch (e) {
      info('Thiết bị không hỗ trợ', 'Trình chỉnh sửa cần WebGL. Hãy cập nhật iOS / trình duyệt rồi thử lại.');
    }
    window.App.renderer = renderer;
    $('gl').addEventListener('webglcontextlost', e => { e.preventDefault(); toast('Bộ nhớ đồ họa đầy, đang khôi phục…'); });
    $('gl').addEventListener('webglcontextrestored', () => { try { renderer = new S.Renderer($('gl'), { preserve: true }); window.App.renderer = renderer; attachSource(); vidDirty = true; scheduleRender(); } catch (e) { } });
    try {
      userPresets = await S.store.all();
      userPresets.forEach(registerLut);
    } catch (e) { userPresets = []; }
    if (isIOS && !standalone) $('installHint').hidden = false;
    setMode('photo');
    const start = (location.hash || '').slice(1);
    if (['photo', 'video', 'face', 'retouch'].includes(start)) go(start, false); else showView('home');
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
    window.App.ready = true;
  }
  window.App.ui = { h, slider, toast, modal, info, sheet, deliver, downscale, decodePhoto, go, nextFrame };
  init();
})();
