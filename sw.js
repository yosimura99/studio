/* Pỏn của Khang – service worker: ưu tiên mạng, dự phòng bộ nhớ đệm khi ngoại tuyến */
const CACHE = 'studio-v7';
const CDN = 'studio-v3-cdn'; // giữ tên cũ để không phải tải lại thư viện MediaPipe
const CORE = ['./', 'index.html', 'css/app.css', 'js/lock.js', 'js/icons.js', 'js/presets.js', 'js/engine.js', 'js/importers.js', 'js/store.js', 'js/video.js', 'js/app.js', 'js/face-lm.js', 'js/face-fx.js', 'js/face-presets.js', 'js/face-ui.js', 'vendor/mp4-muxer.js', 'manifest.webmanifest', 'robots.txt', 'icons/icon-192.png', 'icons/icon.svg', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== CDN).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // thư viện MediaPipe (cố định phiên bản) – ưu tiên bộ nhớ đệm để Chỉnh Mặt chạy được khi ngoại tuyến
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith('/npm/@mediapipe/')) {
    e.respondWith(caches.open(CDN).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
