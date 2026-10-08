// Offline support: keep a copy of the game on the phone, one cache per published version.
// tools/publish.ps1 stamps VERSION with the commit, so every publish installs a fresh cache (fetched past the
// browser's own HTTP cache), throws the old cache away, and takes over the open page; main.js then reloads on
// the home screen, or shows UPDATE READY mid-game. Every module main.js imports must be listed in FILES: one
// missing file and the whole cache refuses to install.

const VERSION = 'ff26ad1';
const CACHE = `defense-${VERSION}-${self.registration.scope}`;
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
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // Older versions of this copy of the game go (a preview build has its own scope and keeps its cache).
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k.endsWith(self.registration.scope)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Only handle this copy of the game (the live site's worker must not serve /preview/ files).
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  // A preview build lives inside the live site's folder; leave it to its own worker.
  if (req.url.slice(self.registration.scope.length).startsWith('preview/')) return;

  // version.json, and everything while developing locally, comes from the network first.
  if (req.url.includes('version.json') || self.location.hostname === 'localhost') {
    e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // Everything else comes from this version's cache (the network only for anything not listed above).
  e.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(req, { ignoreSearch: true })) || fetch(req)));
});
