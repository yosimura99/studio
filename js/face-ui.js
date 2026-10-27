/* Studio Của Khang – giao diện "Chỉnh Mặt" (làm đẹp, trang điểm, nét nam) – chạy hoàn toàn trên máy */
(function () {
  'use strict';
  const S = window.S, App = window.App, U = App.ui;
  const { h, slider, toast, sheet, info, modal, deliver, downscale, decodePhoto, nextFrame } = U;
  const $ = id => document.getElementById(id);
  const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  Object.assign(S.ICONS, {
    sparkle: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
    skin: svg('<path d="M12 3c3.5 4.2 6 7.4 6 10.5A6 6 0 016 13.5C6 10.4 8.5 7.2 12 3z"/><path d="M9.5 14a2.6 2.6 0 002.5 2.4"/>'),
    shape: svg('<path d="M12 3c4 0 7 3 7 7.5 0 5-3.8 10.5-7 10.5S5 15.5 5 10.5C5 6 8 3 12 3z"/><path d="M9 10h.01M15 10h.01"/><path d="M10 15c1.2.8 2.8.8 4 0"/>'),
    lipstick: svg('<path d="M9 21h6V11H9z"/><path d="M9.5 11V7l5-3v7"/>'),
    beard: svg('<path d="M5 8c0 7 3 12 7 12s7-5 7-12"/><path d="M8.5 14c2-1.3 5-1.3 7 0"/><path d="M8 4h8"/>'),
    heal: svg('<circle cx="12" cy="12" r="7"/><path d="M12 9v6M9 12h6"/>'),
    redo: S.ICONS.redo, retouch: svg('<path d="M12 3c4 0 7 3 7 7.5 0 5-3.8 10.5-7 10.5S5 15.5 5 10.5C5 6 8 3 12 3z"/><path d="M17.5 2.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/><path d="M9.5 15c1.4 1 3.6 1 5 0"/>')
  });
  document.querySelectorAll('[data-icon]').forEach(el => { if (!el.innerHTML.trim()) el.innerHTML = S.icon(el.dataset.icon); });

  /* ---------------- trạng thái ---------------- */
  const st = { full: null, prev: null, name: 'anh', faces: [], sel: 0, hist: [], hi: -1, tab: 'style', split: false, splitPos: 0.5, hold: false, healMode: false, healR: 0.03, loaded: false, thumbs: new Map(), token: 0 };
  let fx = null, thumbFx = null, rq = 0;
  const F = () => st.faces[st.sel];
  const P = () => F().params;
  const snapshot = () => JSON.stringify({ sel: st.sel, f: st.faces.map(f => ({ params: f.params, gender: f.gender, userG: f.userG, preset: f.preset, amt: f.amt, heals: f.heals })) });
  function pushHist() { st.hist = st.hist.slice(0, st.hi + 1); st.hist.push(snapshot()); if (st.hist.length > 60) st.hist.shift(); st.hi = st.hist.length - 1; updBtns(); }
  function restore(s) {
    const o = JSON.parse(s);
    o.f.forEach((v, i) => { const f = st.faces[i]; if (!f) return; const hc = JSON.stringify(f.heals) !== JSON.stringify(v.heals); Object.assign(f, v); if (hc && fx) fx.updateHeals(i, f.heals); });
    st.sel = Math.min(o.sel, st.faces.length - 1); buildTabs(); buildPanel(true); drawMarkers(); updGender(); sched();
  }
  function updBtns() { $('rtUndo').disabled = st.hi <= 0; $('rtRedo').disabled = st.hi >= st.hist.length - 1; }
  $('rtUndo').onclick = () => { if (st.hi > 0) { st.hi--; restore(st.hist[st.hi]); updBtns(); } };
  $('rtRedo').onclick = () => { if (st.hi < st.hist.length - 1) { st.hi++; restore(st.hist[st.hi]); updBtns(); } };

  /* ---------------- hiển thị ---------------- */
  function busy(t) { $('rtBusy').hidden = false; $('rtBusyText').textContent = t || 'Đang xử lý…'; }
  function unbusy() { $('rtBusy').hidden = true; }
  function fit() {
    if (!st.prev) return;
    const stage = $('rtStage'), r = stage.getBoundingClientRect();
    const s = Math.min((r.width - 16) / st.prev.width, (r.height - 16) / st.prev.height);
    const w = Math.max(1, Math.floor(st.prev.width * s)), hh = Math.max(1, Math.floor(st.prev.height * s));
    const c = $('rtGl'); c.style.width = w + 'px'; c.style.height = hh + 'px';
    $('rtBox').style.width = w + 'px'; $('rtBox').style.height = hh + 'px';
    drawMarkers(); drawSplit();
  }
  window.addEventListener('resize', () => { if (isActive()) fit(); });
  const isActive = () => $('retouch').classList.contains('active');
  function sched() { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; draw(); }); }
  function draw() {
    if (!fx || !st.loaded) return;
    const split = st.hold ? 2 : st.split ? st.splitPos : 0;
    fx.render(st.faces.map(f => f.params), { split });
  }
  function drawMarkers() {
    const box = $('rtFaces'); box.innerHTML = '';
    if (!st.prev || st.faces.length < 2) return;
    const W = st.prev.width, H = st.prev.height;
    st.faces.forEach((f, i) => {
      const b = f.box; const el = h('div', { class: 'rt-face' + (i === st.sel ? ' on' : '') });
      Object.assign(el.style, { left: (b.x / W * 100) + '%', top: (b.y / H * 100) + '%', width: (b.w / W * 100) + '%', height: (b.h / H * 100) + '%' });
      box.append(el);
    });
    box.classList.add('show'); clearTimeout(drawMarkers.t); drawMarkers.t = setTimeout(() => box.classList.remove('show'), 2200);
  }
  function drawSplit() { const sp = $('rtSplit'); sp.hidden = !st.split; if (st.split) { sp.querySelector('.split-line').style.left = st.splitPos * 100 + '%'; sp.querySelector('.split-knob').style.left = st.splitPos * 100 + '%'; } }
  $('rtCompare').onclick = () => { st.split = !st.split; $('rtCompare').classList.toggle('on', st.split); drawSplit(); sched(); };
  {
    const knob = $('rtSplit').querySelector('.split-knob'); let pid = null;
    knob.addEventListener('pointerdown', e => { e.stopPropagation(); pid = e.pointerId; knob.setPointerCapture(pid); });
    knob.addEventListener('pointermove', e => { if (pid !== e.pointerId) return; const r = $('rtBox').getBoundingClientRect(); st.splitPos = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); drawSplit(); sched(); });
    const up = () => { pid = null; }; knob.addEventListener('pointerup', up); knob.addEventListener('pointercancel', up);
  }
  // nhấn giữ = xem ảnh gốc; chạm = chọn mặt / chấm xóa mụn
  {
    const box = $('rtBox'); let t0 = 0, timer = 0, sx = 0, sy = 0, down = false;
    box.addEventListener('pointerdown', e => {
      if (!st.loaded) return; down = true; t0 = performance.now(); sx = e.clientX; sy = e.clientY;
      if (!st.healMode) timer = setTimeout(() => { st.hold = true; $('rtHold').hidden = false; sched(); }, 160);
    });
    const end = e => {
      if (!down) return; down = false; clearTimeout(timer);
      if (st.hold) { st.hold = false; $('rtHold').hidden = true; sched(); return; }
      if (performance.now() - t0 > 600 || Math.hypot(e.clientX - sx, e.clientY - sy) > 10) return;
      const r = box.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const px = x * st.prev.width, py = y * st.prev.height;
      if (st.healMode) {
        let best = -1, bd = 1e9; st.faces.forEach((f, i) => { const b = f.box; const cx = b.x + b.w / 2, cy = b.y + b.h / 2; const d = Math.hypot((px - cx) / b.w, (py - cy) / b.h); if (d < 0.9 && d < bd) { bd = d; best = i; } });
        if (best < 0) { toast('Chạm vào vùng da trên khuôn mặt'); return; }
        const f = st.faces[best]; f.heals = f.heals.concat([{ x, y, r: st.healR }]); fx.updateHeals(best, f.heals); pushHist(); sched(); buildPanel(true);
        return;
      }
      const hit = st.faces.findIndex(f => px > f.box.x && px < f.box.x + f.box.w && py > f.box.y && py < f.box.y + f.box.h);
      if (hit >= 0 && hit !== st.sel) { st.sel = hit; drawMarkers(); updGender(); buildTabs(); buildPanel(); toast('Đang chỉnh khuôn mặt ' + (hit + 1)); }
    };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end); box.addEventListener('pointerleave', e => { if (st.hold) end(e); });
  }

  /* ---------------- giới tính (chỉ để gợi ý kiểu) ---------------- */
  function updGender() {
    const g = st.faces.length ? F().gender : 'f';
    document.querySelectorAll('#rtGender button').forEach(b => b.classList.toggle('on', b.dataset.g === g));
    $('rtGender').hidden = !st.faces.length;
  }
  document.querySelectorAll('#rtGender button').forEach(b => b.onclick = () => {
    if (!st.faces.length) return; const f = F(); if (f.gender === b.dataset.g) return;
    f.gender = b.dataset.g; f.userG = true; updGender(); pushHist(); buildTabs(); buildPanel();
  });

  /* ---------------- mở ảnh ---------------- */
  $('rtOpen').onclick = $('rtPick').onclick = () => $('fileRetouch').click();
  $('fileRetouch').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) openFile(f); };
  async function openFile(file) {
    busy('Đang mở ảnh…'); await nextFrame();
    let r; try { r = await decodePhoto(file); } catch (e) { unbusy(); info('Không mở được ảnh', 'Không đọc được tệp ảnh này. Hãy chọn ảnh JPEG/PNG từ Thư viện ảnh.'); return false; }
    return openCanvas(r.canvas, (file.name || 'anh').replace(/\.[^.]+$/, ''));
  }
  async function openCanvas(canvas, name) {
    const token = ++st.token;
    if (!isActive()) U.go('retouch');
    busy('Đang tìm khuôn mặt…'); await nextFrame();
    const cap = Math.min(4096, Math.floor(Math.sqrt(12.6e6 / (canvas.width * canvas.height)) * Math.max(canvas.width, canvas.height)));
    st.full = Math.max(canvas.width, canvas.height) > cap ? downscale(canvas, cap) : canvas;
    st.prev = downscale(st.full, 1600);
    st.name = name || 'anh'; st.thumbs.clear(); st.healMode = false;
    let found = [];
    try { found = await S.FaceLM.detect(st.prev, t => busy(t)); }
    catch (e) { unbusy(); info('Không tải được bộ nhận diện khuôn mặt', 'Lần đầu dùng cần kết nối mạng để tải mô hình (khoảng 4 MB). Hãy thử lại.<br><small>' + (e.message || e) + '</small>'); }
    if (token !== st.token) return false;
    st.faces = found.slice(0, 4).map(f => ({ pts: f.pts, box: (b => { const w = b.x1 - b.x0, hh = b.y1 - b.y0; return { x: b.x0 - w * 0.06, y: b.y0 - hh * 0.1, w: w * 1.12, h: hh * 1.14 }; })(f.box), params: S.faceDefaults(), gender: 'f', userG: false, preset: null, amt: 100, heals: [] }));
    st.sel = 0;
    try {
      if (!fx) fx = new S.FaceFX($('rtGl'));
      fx.setImage(st.prev); fx.setFaces(st.faces.map(f => ({ pts: f.pts, heals: [] })));
    } catch (e) { unbusy(); info('Thiết bị không hỗ trợ', 'Chỉnh Mặt cần WebGL. Hãy cập nhật iOS / trình duyệt.<br><small>' + (e.message || e) + '</small>'); return false; }
    st.loaded = true; $('rtEmpty').hidden = true; $('rtBox').hidden = false;
    st.hist = []; st.hi = -1; pushHist();
    unbusy(); fit(); updGender(); buildTabs(); buildPanel(); sched();
    if (!st.faces.length) toast('Không thấy khuôn mặt rõ ràng. Hãy chọn ảnh chụp chính diện, đủ sáng.', 4200);
    else if (st.faces.length > 1) toast('Thấy ' + st.faces.length + ' khuôn mặt – chạm vào mặt để chọn', 3200);
    // đoán nét nam / nữ ở nền, không chặn người dùng
    (async () => {
      for (let i = 0; i < st.faces.length; i++) {
        let g = null; try { g = await S.FaceLM.guessGender(st.prev, st.faces[i].pts); } catch (e) { g = null; }
        if (token !== st.token) return;
        const f = st.faces[i]; if (!g || f.userG) continue;
        if (f.gender !== g) { f.gender = g; if (i === st.sel) { updGender(); buildTabs(); buildPanel(true); } }
        st.hist[0] = st.hist[0] && st.hi === 0 ? snapshot() : st.hist[0];
      }
      window.App.retouchGenders = st.faces.map(f => f.gender);
    })();
    window.App.retouchFaces = st.faces.length;
    return true;
  }

  /* ---------------- bảng điều khiển ---------------- */
  const TABS = () => {
    const t = [['style', 'sparkle', 'Kiểu'], ['skin', 'skin', 'Da'], ['shape', 'shape', 'Gương mặt'], ['makeup', 'lipstick', 'Trang điểm'], ['male', 'beard', 'Nam tính']];
    if (st.faces.length && F().gender === 'm') [t[3], t[4]] = [t[4], t[3]];
    return t;
  };
  function buildTabs() {
    const nav = $('rtTabs'); nav.innerHTML = '';
    for (const [id, ic, label] of TABS()) nav.append(h('button', { class: 'tab' + (id === st.tab ? ' on' : ''), 'data-tab': id, onclick: () => { st.tab = id; if (id !== 'skin') setHeal(false); buildTabs(); buildPanel(); } }, h('span', { html: S.icon(ic) }), label));
  }
  const ph = (title, ...right) => h('div', { class: 'ph' }, h('h3', null, title), h('div', { class: 'row' }, ...right));
  const sl = (label, key, min = 0, max = 100) => slider({ label, min, max, def: 0, get: () => P()[key], set: v => { P()[key] = v; }, onInput: sched, commit: pushHist });
  const sw = (key, colors) => {
    const row = h('div', { class: 'dots rt-dots' });
    const draw = () => { row.innerHTML = ''; for (const c of colors) row.append(h('button', { class: 'dot' + (P()[key] === c ? ' on' : ''), style: 'background:' + c, 'aria-label': c, onclick: () => { P()[key] = c; pushHist(); draw(); sched(); } })); };
    draw(); return row;
  };
  const seg = (key, opts) => {
    const el = h('div', { class: 'seg' });
    const draw = () => { el.innerHTML = ''; for (const [v, l] of opts) el.append(h('button', { class: P()[key] === v ? 'on' : '', onclick: () => { P()[key] = v; pushHist(); draw(); sched(); } }, l)); };
    draw(); return el;
  };
  function setHeal(on) { st.healMode = on; $('rtStage').classList.toggle('healing', on); const b = $('rtHealBtn'); if (b) b.classList.toggle('on', on); }
  function resetKeys(keys) { const d = S.faceDefaults(); for (const k of keys) P()[k] = d[k]; pushHist(); buildPanel(true); sched(); }
  const resetBtn = keys => h('button', { class: 'btn', onclick: () => resetKeys(keys), html: S.icon('reset') + '<span>Đặt lại</span>' });
  const LIPS = ['#c2414f', '#a3172a', '#d8314a', '#e0525e', '#e8697d', '#f08aa0', '#c4646a', '#9b5a5a', '#b5655a', '#7a2a3a'];
  const BLUSH = ['#ec8a8f', '#f7a1a8', '#f58c99', '#ffb3c1', '#e9967a', '#d77a6d', '#c9746a'];
  const BROW = ['#3e2c24', '#2e2420', '#5a4036', '#6a4e40', '#1f1a18', '#7c5c48'];
  const SHADOW = ['#a8735a', '#c99a7e', '#d9919a', '#e3a3c6', '#8a5a48', '#7a4a3a', '#3d3337', '#b88a5e', '#9a8bb5'];
  const BEARD = ['#241b16', '#3a2a20', '#55402f', '#151313', '#6b5544'];

  function buildPanel(keep) {
    const body = $('rtBody'); const sc = body.scrollTop; body.innerHTML = '';
    if (!st.loaded || !st.faces.length) {
      body.append(h('div', { class: 'note' }, st.loaded ? 'Không tìm thấy khuôn mặt trong ảnh này. Hãy thử ảnh chân dung chụp chính diện, rõ mặt, đủ sáng.' : 'Mở một ảnh chân dung để làm đẹp da, trang điểm, chỉnh dáng mặt hoặc thêm nét nam tính. Mọi xử lý chạy ngay trên máy.'));
      return;
    }
    const b = body;
    if (st.faces.length > 1) b.append(h('div', { class: 'chips' }, st.faces.map((f, i) => h('button', { class: 'chip' + (i === st.sel ? ' on' : ''), onclick: () => { st.sel = i; drawMarkers(); updGender(); buildTabs(); buildPanel(); } }, 'Mặt ' + (i + 1)))));
    if (st.tab === 'style') {
      const f = F(), g = f.gender, list = S.FACE_PRESETS[g];
      b.append(ph(g === 'm' ? 'Kiểu nam' : 'Kiểu nữ', h('button', { class: 'btn', onclick: () => { f.preset = null; f.params = Object.assign(S.faceDefaults(), {}); pushHist(); buildPanel(true); sched(); }, html: S.icon('reset') + '<span>Bỏ kiểu</span>' })));
      const grid = h('div', { class: 'thumbs rt-thumbs' });
      for (const pr of [{ id: null, name: 'Gốc' }].concat(list)) {
        const cv = h('canvas', { width: 160, height: 160, 'data-id': pr.id || 'none' });
        grid.append(h('button', { class: 'th' + (f.preset === pr.id ? ' on' : ''), onclick: () => applyPreset(pr.id ? pr : null) }, cv, h('span', null, pr.name)));
      }
      if (f.preset) {
        b.append(slider({ label: 'Mức độ', min: 0, max: 100, def: 100, get: () => F().amt, set: v => { F().amt = v; const pr = findPreset(F().preset); if (pr) F().params = S.faceMix(pr, v); }, onInput: sched, commit: pushHist }));
      }
      b.append(grid);
      b.append(h('div', { class: 'note' }, 'Kiểu gợi ý theo nét ' + (g === 'm' ? 'nam' : 'nữ') + '. Bấm nút Nữ / Nam ở trên để đổi bộ kiểu. Sau khi chọn kiểu vẫn có thể tinh chỉnh từng mục.'));
      fillThumbs(grid);
    } else if (st.tab === 'skin') {
      b.append(ph('Làn da', resetBtn(['smooth', 'bright', 'white', 'dark', 'acne', 'oil', 'teeth', 'eyeBright'])));
      b.append(sl('Làm mịn da', 'smooth'), sl('Làm sáng da', 'bright'), sl('Làm trắng da', 'white'), sl('Xóa quầng thâm', 'dark'), sl('Xóa mụn tự động', 'acne'));
      const n = F().heals.length;
      b.append(h('div', { class: 'row rt-heal' },
        h('button', { class: 'btn' + (st.healMode ? ' on' : ''), id: 'rtHealBtn', onclick: () => { setHeal(!st.healMode); if (st.healMode) toast('Chạm vào nốt mụn trên ảnh để xóa'); }, html: S.icon('heal') + '<span>Chạm xóa mụn</span>' }),
        n ? h('button', { class: 'btn', onclick: () => { const f = F(); f.heals = f.heals.slice(0, -1); fx.updateHeals(st.sel, f.heals); pushHist(); buildPanel(true); sched(); } }, 'Bỏ chấm cuối') : null,
        n ? h('span', { class: 'rt-count' }, n + ' chấm') : null));
      if (st.healMode) b.append(slider({ label: 'Cỡ chấm', min: 1, max: 8, step: 0.5, def: 3, get: () => st.healR * 100, set: v => { st.healR = v / 100; }, onInput: () => { }, commit: () => { } }));
      b.append(sl('Giảm bóng dầu', 'oil'), sl('Làm trắng răng', 'teeth'), sl('Mắt sáng', 'eyeBright'));
    } else if (st.tab === 'shape') {
      b.append(ph('Dáng mặt', resetBtn(['slim', 'vline', 'eyes', 'noseSlim', 'noseLift', 'mouth', 'smile', 'forehead'])));
      b.append(sl('Thon mặt / gọt cằm', 'slim'), sl('Cằm V-line', 'vline'), sl('Mắt to', 'eyes'), sl('Thu nhỏ mũi', 'noseSlim'), sl('Nâng mũi', 'noseLift'),
        sl('Miệng nhỏ / to', 'mouth', -100, 100), sl('Cười nhẹ', 'smile'), sl('Trán thấp / cao', 'forehead', -100, 100));
      b.append(h('div', { class: 'note' }, 'Biến dạng chỉ tác động lên khuôn mặt, nền phía sau được giữ nguyên.'));
    } else if (st.tab === 'makeup') {
      b.append(ph('Son môi', resetBtn(['lip'])), sl('Độ đậm son', 'lip'), sw('lipColor', LIPS), seg('lipFinish', [['matte', 'Lì (matte)'], ['gloss', 'Bóng (gloss)']]));
      b.append(ph('Má hồng'), sl('Má hồng', 'blush'), sw('blushColor', BLUSH));
      b.append(ph('Lông mày'), sl('Kẻ mày', 'brow'), sw('browColor', BROW));
      b.append(ph('Mắt'), sl('Phấn mắt', 'shadow'), sw('shadowColor', SHADOW), sl('Kẻ mắt (eyeliner)', 'liner'), sl('Mi', 'lashes'));
      b.append(ph('Tạo khối', resetBtn(['contour', 'highlight'])), sl('Tạo khối (contour)', 'contour'), sl('Bắt sáng (highlight)', 'highlight'));
    } else if (st.tab === 'male') {
      b.append(ph('Nét nam tính', resetBtn(['jaw', 'browThick', 'beard', 'tan', 'oil', 'sharp'])));
      b.append(sl('Jawline góc cạnh', 'jaw'), sl('Làm dày lông mày', 'browThick'));
      b.append(ph('Râu'), sl('Mật độ râu', 'beard'), seg('beardStyle', [['stubble', 'Râu lấm tấm'], ['full', 'Râu quai nón']]), sw('beardColor', BEARD));
      b.append(ph('Da & khối'), sl('Da nâu khỏe', 'tan'), sl('Giảm bóng dầu', 'oil'), sl('Contour sắc nét', 'sharp'), sl('Tạo khối', 'contour'));
    }
    if (keep) body.scrollTop = sc;
  }
  const findPreset = id => [...S.FACE_PRESETS.f, ...S.FACE_PRESETS.m].find(p => p.id === id);
  function applyPreset(pr) {
    const f = F();
    if (!pr) { f.preset = null; f.params = S.faceDefaults(); }
    else { f.preset = pr.id; f.amt = f.preset === pr.id && f.amt ? f.amt : 100; f.params = S.faceMix(pr, f.amt); }
    pushHist(); buildPanel(true); sched();
  }
  window.App.retouchApplyPreset = (id, amt) => { const pr = findPreset(id); if (!pr || !st.faces.length) return false; F().preset = id; F().amt = amt ?? 100; F().params = S.faceMix(pr, F().amt); pushHist(); buildPanel(true); draw(); return true; };
  window.App.retouchSetParams = o => { Object.assign(P(), o); pushHist(); buildPanel(true); draw(); };
  window.App.retouchSelect = i => { st.sel = i; drawMarkers(); updGender(); buildTabs(); buildPanel(); draw(); };
  window.App.retouchState = () => ({ faces: st.faces.length, sel: st.sel, genders: st.faces.map(f => f.gender), tab: st.tab, preset: st.faces.length ? F().preset : null });
  window.App.retouchOpen = openCanvas;
  window.App.retouchDebug = () => ({ fx, st });
  window.App.retouchTab = t => { st.tab = t; buildTabs(); buildPanel(); };

  // ảnh nhỏ cho từng kiểu (vẽ từ chính khuôn mặt đang chọn)
  async function fillThumbs(grid) {
    const f = F(), key = st.sel + ':' + f.gender + ':' + st.token;
    let cache = st.thumbs.get(key);
    const canv = [...grid.querySelectorAll('canvas')];
    if (cache) { canv.forEach(c => { const im = cache[c.dataset.id]; if (im) c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); }); if (canv.every(c => cache[c.dataset.id])) return; }
    else { cache = {}; st.thumbs.set(key, cache); }
    try {
      const g = S.faceGeom(f.pts); const sd = Math.max(g.fw, g.fh) * 1.45; const T = 192, k = T / sd;
      const x0 = g.c.x - sd / 2, y0 = g.c.y - sd / 2 + 0.02 * sd;
      const crop = document.createElement('canvas'); crop.width = crop.height = T;
      const cx = crop.getContext('2d'); cx.fillStyle = '#222'; cx.fillRect(0, 0, T, T); cx.imageSmoothingQuality = 'high';
      cx.drawImage(st.prev, x0, y0, sd, sd, 0, 0, T, T);
      if (!thumbFx) thumbFx = new S.FaceFX(document.createElement('canvas'));
      thumbFx.setImage(crop);
      thumbFx.setFaces([{ pts: f.pts.map(p => ({ x: (p.x - x0) * k, y: (p.y - y0) * k, z: p.z })), heals: f.heals }], { maxRoi: 256, maxMask: 256 });
      for (const c of canv) {
        if (cache[c.dataset.id]) { c.getContext('2d').drawImage(cache[c.dataset.id], 0, 0, c.width, c.height); continue; }
        const pr = findPreset(c.dataset.id);
        const out = thumbFx.readTo([pr ? S.faceMix(pr, 100) : S.faceDefaults()]);
        cache[c.dataset.id] = out; c.getContext('2d').drawImage(out, 0, 0, c.width, c.height);
        await nextFrame();
        if (!grid.isConnected) return;
      }
    } catch (e) { console.warn('thumbs', e); }
  }

  /* ---------------- đặt lại / xuất ---------------- */
  $('rtReset').onclick = async () => {
    if (!st.faces.length) return;
    const ok = await modal((m, close) => { m.append(h('h2', null, 'Đặt lại tất cả?'), h('p', null, 'Bỏ mọi chỉnh sửa trên các khuôn mặt trong ảnh này.'), h('div', { class: 'acts' }, h('button', { class: 'pill ghost', onclick: () => close(false) }, 'Hủy'), h('button', { class: 'pill', onclick: () => close(true) }, 'Đặt lại'))); });
    if (!ok) return;
    st.faces.forEach((f, i) => { f.params = S.faceDefaults(); f.preset = null; f.amt = 100; if (f.heals.length) { f.heals = []; fx.updateHeals(i, []); } });
    pushHist(); buildPanel(); sched();
  };
  async function renderFull() {
    const W = st.full.width, H = st.full.height, k = W / st.prev.width;
    const c = document.createElement('canvas'); const efx = new S.FaceFX(c);
    try {
      if (Math.max(W, H) > efx.maxTex) throw new Error('Ảnh vượt giới hạn GPU');
      efx.setImage(st.full);
      efx.setFaces(st.faces.map(f => ({ pts: f.pts.map(p => ({ x: p.x * k, y: p.y * k, z: p.z })), heals: f.heals })), { maxRoi: 2048, maxMask: 1024 });
      return efx.readTo(st.faces.map(f => f.params));
    } finally { efx.dispose(); }
  }
  async function fullBlob(type = 'image/jpeg') {
    let out;
    try { out = await renderFull(); }
    catch (e) { // dự phòng: dùng ảnh xem trước nếu GPU không đủ bộ nhớ
      out = fx.readTo(st.faces.map(f => f.params)); toast('Máy thiếu bộ nhớ đồ họa, đã lưu ở ' + out.width + '×' + out.height);
      draw();
    }
    const blob = await new Promise((res, rej) => out.toBlob(b => b ? res(b) : rej(new Error('Không tạo được tệp')), type, 0.93));
    window.App.lastRetouch = { W: out.width, H: out.height, size: blob.size };
    out.width = out.height = 0;
    return blob;
  }
  $('rtSave').onclick = () => {
    if (!st.loaded) { toast('Hãy mở ảnh trước'); return; }
    sheet((s, close) => {
      s.append(h('h2', null, 'Lưu ảnh đã chỉnh mặt'), h('div', { class: 'kv' }, h('span', null, 'Kích thước'), h('span', null, st.full.width + ' × ' + st.full.height + ' px')));
      s.append(h('div', { class: 'acts' },
        h('button', { class: 'pill ghost', onclick: async () => { close(); await toPhoto(); } }, 'Chuyển sang Chỉnh Ảnh'),
        h('button', { class: 'pill', id: 'rtDoSave', onclick: async () => { close(); await saveImage(); } }, 'Lưu ảnh')));
    });
  };
  async function saveImage() {
    busy('Đang xuất ảnh độ phân giải gốc…'); await nextFrame(); await nextFrame();
    try { const blob = await fullBlob('image/jpeg'); unbusy(); return await deliver(blob, st.name + '-chinh-mat.jpg', 'image/jpeg'); }
    catch (e) { unbusy(); info('Lỗi khi lưu ảnh', String(e.message || e)); }
  }
  async function toPhoto() {
    busy('Đang chuyển sang Chỉnh Ảnh…'); await nextFrame();
    try { const blob = await fullBlob('image/png'); unbusy(); U.go('photo'); await App.loadPhotoFile(new File([blob], st.name + '-chinh-mat.png', { type: 'image/png' })); toast('Đã chuyển sang Chỉnh Ảnh'); }
    catch (e) { unbusy(); info('Không chuyển được', String(e.message || e)); }
  }
  window.App.retouchSave = saveImage; window.App.retouchToPhoto = toPhoto;
  $('rtBack').onclick = () => U.go('home');

  S.FaceUI = { show() { buildTabs(); buildPanel(true); requestAnimationFrame(() => { fit(); sched(); }); }, openCanvas, openFile };
  buildTabs(); buildPanel();
})();
