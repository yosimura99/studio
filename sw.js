/* Studio Của Khang – service worker: ưu tiên mạng, dự phòng bộ nhớ đệm khi ngoại tuyến */
const CACHE = 'studio-v1';
const CORE = ['./', 'index.html', 'css/app.css', 'js/icons.js', 'js/presets.js', 'js/engine.js', 'js/importers.js', 'js/store.js', 'js/video.js', 'js/app.js', 'vendor/mp4-muxer.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
