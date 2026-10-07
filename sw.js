// Offline support: keep a copy of the game on the phone.
// Serves the saved copy instantly and refreshes it in the background,
// so a new version shows up on the next launch.

const CACHE = `defense-${self.registration.scope}`;
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './js/main.js',
  './js/art.js',
  './js/gfx.js',
  './js/config.js',
  './js/battle.js',
  './js/paint.js',
  './js/art-walls.js',
  './js/art-houses.js',
  './js/art-buildings.js',
  './js/art-decor.js',
  './js/art-cards.js',
  './js/art-hero.js',
  './js/art-village.js',
  './js/economy.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Only handle this copy of the game (the live site's worker must not serve /preview/ files).
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  // A preview build lives inside the live site's folder; leave it to its own worker.
  if (req.url.slice(self.registration.scope.length).startsWith('preview/')) return;

  // version.json, and everything while developing locally, comes from the network first.
  if (req.url.endsWith('version.json') || self.location.hostname === 'localhost') {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || fresh;
    }),
  );
});
