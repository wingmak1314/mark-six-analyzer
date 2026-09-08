// Service Worker — 離線 cache (PWA) v3
// v3: bump cache name 強制舊 SW 失效, 確保用戶攞到新版 bundle (金多寶 tab)
const CACHE = 'marksix-v3';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa-192.png',
  './pwa-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first: 優先攞新版, 失敗先 fallback cache (offline)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('./')))
  );
});
