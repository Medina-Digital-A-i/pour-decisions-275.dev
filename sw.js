/* Pour Decisions — Service Worker
   v1.1 · stale-while-revalidate for shell, cache-first for assets,
   offline fallback to offline.html, network-only for cross-origin POSTs. */

const VERSION = 'pd-v2.6.2';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './assets/favicon.ico',
  './assets/favicon-16.png',
  './assets/favicon-32.png',
  './assets/favicon-48.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-192.png',
  './assets/icon-maskable-512.png',
  './assets/logo-icon-256.png',
  './assets/logo-icon-512.png',
  './assets/logo-icon.svg',
  './assets/logo-256.png',
  './assets/logo-512.png',
  './assets/logo-white-256.png',
  './assets/logo-white-512.png',
  './assets/og-image.png'
];

/* --------------------- INSTALL: precache app shell --------------------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* --------------------- ACTIVATE: clean old caches --------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* --------------------- FETCH: smart routing --------------------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin requests except CDN scripts/styles we want to cache
  const isCdn = /unpkg\.com|cdn\.tailwindcss\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.host);
  const isSameOrigin = url.origin === self.location.origin;

  // Navigation requests: network-first, fall back to cached index, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./offline.html')))
    );
    return;
  }

  // Same-origin assets and CDN: stale-while-revalidate
  if (isSameOrigin || isCdn) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
              const copy = res.clone();
              caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }
});

/* --------------------- PUSH (stub for v2) --------------------- */
self.addEventListener('push', (event) => {
  let data = { title: 'Pour Decisions', body: 'Your order is ready 🥤' };
  try { if (event.data) data = event.data.json(); } catch {}
  const options = {
    body: data.body,
    icon: 'assets/logo-icon-256.png',
    badge: 'assets/favicon-48.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(target) && 'focus' in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

/* --------------------- MESSAGE: skip-waiting trigger --------------------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
