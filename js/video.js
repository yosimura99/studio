/* Xuất video ngay trên máy: WebCodecs + mp4-muxer, dự phòng MediaRecorder */
(function () {
  'use strict';
  const S = (window.S = window.S || {});
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const even = v => Math.max(2, Math.round(v / 2) * 2);

  function seek(video, t) {
    return new Promise(res => {
      if (Math.abs(video.currentTime - t) < 0.0005 && video.readyState >= 2) return res();
      let done = false;
      const fin = () => { if (done) return; done = true; video.removeEventListener('seeked', fin); res(); };
      video.addEventListener('seeked', fin);
      setTimeout(fin, 4000);
      video.currentTime = t;
    });
  }
  S.seekVideo = seek;

  // Trộn âm thanh gốc (đã cắt + đổi tốc độ) với nhạc nền
  async function mixAudio(o) {
    const dur = (o.end - o.start) / o.speed;
    const sr = 48000;
    const len = Math.max(1, Math.ceil(dur * sr));
    const hasSrc = !o.mute && o.srcAudio;
    const hasMusic = o.music && o.music.buffer;
    if (!hasSrc && !hasMusic) return null;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new OAC(2, len, sr);
    if (hasSrc) {
      const s = ctx.createBufferSource(); s.buffer = o.srcAudio; s.playbackRate.value = o.speed;
      const g = ctx.createGain(); g.gain.value = o.srcVolume ?? 1;
      s.connect(g).connect(ctx.destination);
      s.start(0, Math.min(o.start, o.srcAudio.duration), Math.max(0.01, o.end - o.start));
    }
    if (hasMusic) {
      const m = ctx.createBufferSource(); m.buffer = o.music.buffer; m.loop = true;
      const g = ctx.createGain(); g.gain.value = o.music.volume ?? 0.8;
      // nhỏ dần ở cuối 1.5 giây
      const fade = Math.min(1.5, dur / 3);
      g.gain.setValueAtTime(o.music.volume ?? 0.8, Math.max(0, dur - fade));
      g.gain.linearRampToValueAtTime(0.0001, dur);
      m.connect(g).connect(ctx.destination);
      m.start(0);
    }
    return await ctx.startRendering();
  }
  S.mixAudio = mixAudio;

  async function pickVideoConfig(W, H, fps, bitrate) {
    const list = [
      ['avc', 'avc1.640033'], ['avc', 'avc1.640028'], ['avc', 'avc1.4d0028'], ['avc', 'avc1.42e028'], ['avc', 'avc1.42001f'],
      ['vp9', 'vp09.00.40.08'], ['av1', 'av01.0.08M.08']
    ];
    for (const [mux, codec] of list) {
      const cfg = { codec, width: W, height: H, bitrate, framerate: fps };
      if (mux === 'avc') cfg.avc = { format: 'avc' };
      try { const r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return { mux, cfg }; } catch (e) { /* thử tiếp */ }
    }
    return null;
  }
  async function pickAudioConfig() {
    if (typeof AudioEncoder === 'undefined') return null;
    const list = [['aac', 'mp4a.40.2'], ['opus', 'opus']];
    for (const [mux, codec] of list) {
      const cfg = { codec, sampleRate: 48000, numberOfChannels: 2, bitrate: 160000 };
      try { const r = await AudioEncoder.isConfigSupported(cfg); if (r.supported) return { mux, cfg }; } catch (e) { /* thử tiếp */ }
    }
    return null;
  }

  S.videoCaps = async function () {
    const wc = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined' && !!window.Mp4Muxer;
    return { webcodecs: wc, audioEncoder: typeof AudioEncoder !== 'undefined', mediaRecorder: typeof MediaRecorder !== 'undefined' };
  };

  /* o: {video, renderer, params, start, end, speed, mute, srcAudio, music, maxLong, quality(0.5..1.5), onProgress, cancelled(), forceMethod, captureMode} */
  S.exportVideo = async function (o) {
    const r = o.renderer;
    let [W, H] = r.outSize(o.params, o.maxLong || 1920);
    W = even(W); H = even(H);
    const fps = 30;
    const bitrate = Math.round(Math.min(20e6, Math.max(1.5e6, W * H * fps * 0.11 * (o.quality || 1))));
    o.onProgress && o.onProgress(0, 'Đang chuẩn bị âm thanh…');
    let mixed = null, warn = '';
    try { mixed = await mixAudio(o); } catch (e) { warn = 'Không xử lý được âm thanh: ' + e.message; }
    const wc = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined' && window.Mp4Muxer;
    let method = o.forceMethod || (wc ? 'webcodecs' : 'mediarecorder');
    let vconf = null, aconf = null;
    if (method === 'webcodecs') {
      vconf = await pickVideoConfig(W, H, fps, bitrate);
      if (!vconf) method = 'mediarecorder';
      else if (mixed) {
        aconf = await pickAudioConfig();
        if (!aconf && typeof MediaRecorder !== 'undefined' && !o.forceMethod) method = 'mediarecorder';
        else if (!aconf) warn = 'Trình duyệt không hỗ trợ mã hóa âm thanh – video sẽ không có tiếng.';
      }
    }
    if (method === 'mediarecorder') {
      if (typeof MediaRecorder === 'undefined') throw new Error('Trình duyệt không hỗ trợ xuất video (cần Safari 17+ hoặc Chrome mới).');
      return await viaRecorder(o, W, H, fps, bitrate, mixed, warn);
    }
    return await viaWebCodecs(o, W, H, fps, vconf, aconf, mixed, warn);
  };

  async function viaWebCodecs(o, W, H, fps, vconf, aconf, mixed, warn) {
    const r = o.renderer, video = o.video;
    const target = new Mp4Muxer.ArrayBufferTarget();
    const muxOpts = { target, video: { codec: vconf.mux, width: W, height: H, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' };
    if (aconf && mixed) muxOpts.audio = { codec: aconf.mux, numberOfChannels: 2, sampleRate: 48000 };
    const muxer = new Mp4Muxer.Muxer(muxOpts);
    let encErr = null;
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { encErr = e; } });
    venc.configure(vconf.cfg);
    const dur = (o.end - o.start) / o.speed;
    const total = Math.max(1, Math.round(dur * fps));
    let frames = 0, lastTs = -1;
    const encodeCanvas = async (tsSec) => {
      const ts = Math.round(tsSec * 1e6);
      if (ts <= lastTs) return;
      const frame = new VideoFrame(r.canvas, { timestamp: ts, duration: Math.round(1e6 / fps) });
      venc.encode(frame, { keyFrame: frames % (fps * 2) === 0 });
      frame.close();
      lastTs = ts; frames++;
      while (venc.encodeQueueSize > 6) await sleep(4);
    };
    const renderFrame = () => { r.setSource(video, video.videoWidth, video.videoHeight); r.render(o.params, W, H, { seed: frames % 97 }); };
    video.muted = true;
    const useplay = (o.captureMode || 'play') === 'play' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
    if (useplay) {
      await seek(video, o.start);
      renderFrame(); await encodeCanvas(0);
      video.playbackRate = o.speed;
      await new Promise((resolve, reject) => {
        let finished = false, busy = false, winT = o.start, winN = 0;
        const finish = () => { if (finished) return; finished = true; video.pause(); resolve(); };
        const onFrame = async (now, meta) => {
          if (finished) return;
          if (o.cancelled && o.cancelled()) { finish(); return; }
          const t = meta.mediaTime;
          if (t >= o.end - 0.001) { finish(); return; }
          if (!busy && t > o.start) {
            busy = true;
            try { renderFrame(); await encodeCanvas((t - o.start) / o.speed); } catch (e) { reject(e); }
            busy = false;
            // tự giảm tốc độ phát nếu máy dựng không kịp (tránh rớt khung hình)
            winN++;
            if (t - winT >= 0.4 * video.playbackRate + 0.05) {
              const want = (t - winT) / o.speed * fps, ratio = winN / Math.max(1, want);
              if (ratio < 0.85 && video.playbackRate > 0.07) video.playbackRate = Math.max(0.0625, video.playbackRate * Math.max(0.35, ratio * 0.95));
              else if (ratio > 0.98 && video.playbackRate < o.speed) video.playbackRate = Math.min(o.speed, video.playbackRate * 1.25);
              winT = t; winN = 0;
            }
            o.onProgress && o.onProgress(Math.min(0.97, (t - o.start) / (o.end - o.start)), 'Đang dựng video…');
          }
          video.requestVideoFrameCallback(onFrame);
        };
        video.requestVideoFrameCallback(onFrame);
        video.addEventListener('ended', finish, { once: true });
        const guard = setInterval(() => { if (video.currentTime >= o.end - 0.001) { clearInterval(guard); setTimeout(finish, 120); } }, 100);
        video.play().catch(reject);
      });
    } else {
      for (let i = 0; i < total; i++) {
        if (o.cancelled && o.cancelled()) break;
        await seek(video, Math.min(o.end - 0.001, o.start + (i / fps) * o.speed));
        renderFrame();
        await encodeCanvas(i / fps);
        if (encErr) throw encErr;
        o.onProgress && o.onProgress(i / total * 0.97, 'Đang dựng video…');
      }
    }
    if (o.cancelled && o.cancelled()) { try { venc.close(); } catch (e) { } throw new Error('CANCELLED'); }
    // audio
    if (aconf && mixed) {
      o.onProgress && o.onProgress(0.97, 'Đang mã hóa âm thanh…');
      const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { encErr = e; } });
      aenc.configure(aconf.cfg);
      const n = mixed.length, block = 4800, L = mixed.getChannelData(0), R = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : L;
      for (let off = 0; off < n; off += block) {
        const k = Math.min(block, n - off);
        const buf = new Float32Array(k * 2);
        buf.set(L.subarray(off, off + k), 0); buf.set(R.subarray(off, off + k), k);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data: buf });
        aenc.encode(ad); ad.close();
        if (aenc.encodeQueueSize > 20) await sleep(2);
      }
      await aenc.flush(); aenc.close();
    }
    await venc.flush(); venc.close();
    if (encErr) throw encErr;
    muxer.finalize();
    const blob = new Blob([target.buffer], { type: 'video/mp4' });
    return { blob, mime: 'video/mp4', ext: 'mp4', method: 'WebCodecs (' + vconf.cfg.codec + (aconf && mixed ? ' + ' + aconf.cfg.codec : '') + ')', frames, warn, W, H };
  }

  async function viaRecorder(o, W, H, fps, bitrate, mixed, warn) {
    const r = o.renderer, video = o.video;
    r.canvas.width = W; r.canvas.height = H;
    const stream = r.canvas.captureStream(fps);
    let ac = null, src = null;
    if (mixed) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ac.createMediaStreamDestination();
      src = ac.createBufferSource(); src.buffer = mixed; src.connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    }
    const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mime = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: bitrate } : { videoBitsPerSecond: bitrate });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise(res => { rec.onstop = res; });
    video.muted = true;
    await seek(video, o.start);
    r.setSource(video, video.videoWidth, video.videoHeight); r.render(o.params, W, H);
    video.playbackRate = o.speed;
    if (ac && ac.state === 'suspended') await ac.resume();
    rec.start(250);
    if (src) src.start();
    await video.play();
    let frames = 0;
    await new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; video.pause(); res(); };
      const tick = () => {
        if (done) return;
        if ((o.cancelled && o.cancelled()) || video.currentTime >= o.end - 0.01 || video.ended) { fin(); return; }
        r.setSource(video, video.videoWidth, video.videoHeight); r.render(o.params, W, H, { seed: frames % 97 }); frames++;
        o.onProgress && o.onProgress((video.currentTime - o.start) / (o.end - o.start), 'Đang ghi video (thời gian thực)…');
        if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(tick); else requestAnimationFrame(tick);
      };
      tick();
      video.addEventListener('ended', fin, { once: true });
    });
    rec.stop();
    if (src) try { src.stop(); } catch (e) { }
    await stopped;
    if (ac) ac.close();
    if (o.cancelled && o.cancelled()) throw new Error('CANCELLED');
    const type = (mime || chunks[0]?.type || 'video/webm').split(';')[0];
    const blob = new Blob(chunks, { type });
    return { blob, mime: type, ext: type.includes('mp4') ? 'mp4' : 'webm', method: 'MediaRecorder (' + (mime || 'mặc định') + ')', frames, warn, W, H };
  }
})();
