const CACHE_NAME = 'ttd-v11';

const PRECACHE = [
  './',
  './index.html',
  './highscores.html',
  './privacy.html',
  './styles.css',
  './manifest.json',
  './assets/fonts/fonts.css',
  './assets/fonts/exo2-400.ttf',
  './assets/fonts/exo2-500.ttf',
  './assets/fonts/exo2-600.ttf',
  './assets/fonts/exo2-700.ttf',
  './assets/fonts/orbitron-500.ttf',
  './assets/fonts/orbitron-700.ttf',
  './assets/fonts/orbitron-800.ttf',
  './audio/Pattern_in_Pine.mp3',
  './audio/Last_Row_Drop.mp3',
  './assets/blocks/wall.png',
  './assets/blocks/shooter.png',
  './assets/blocks/sniper.png',
  './assets/blocks/splash.png',
  './assets/blocks/slow.png',
  './assets/blocks/gunner.png',
  './assets/blocks/piercer.png',
  './assets/blocks/multishot.png',
  './assets/enemies/walker.png',
  './assets/enemies/brute.png',
  './assets/enemies/flyer.png',
  './assets/enemies/rusher.png',
  './assets/enemies/shielded.png',
  './assets/enemies/walker_boss.png',
  './assets/enemies/brute_boss.png',
  './assets/enemies/flyer_boss.png',
  './assets/enemies/rusher_boss.png',
  './assets/enemies/shielded_boss.png',
  './js/platform.js',
  './js/config.js',
  './js/settings.js',
  './js/seed.js',
  './js/audio.js',
  './js/stats.js',
  './js/achievements.js',
  './js/game-modes.js',
  './js/matchups.js',
  './js/highscores.js',
  './js/cards.js',
  './js/deck.js',
  './js/synergy.js',
  './js/grid.js',
  './js/pieces.js',
  './js/pathfinding.js',
  './js/projectiles.js',
  './js/enemies.js',
  './js/towers.js',
  './js/waves.js',
  './js/tutorial.js',
  './js/ui.js',
  './js/input.js',
  './js/starfield.js',
  './js/sprites.js',
  './js/render.js',
  './js/game.js',
  './js/main.js',
  './js/ads.js',
  './js/highscores-page.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[sw] precache failed:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isRevalidateAsset(url, request) {
  const p = url.pathname;
  if (request.destination === 'script' || request.destination === 'style') return true;
  if (/\.(js|css)$/i.test(p)) return true;
  if (p.includes('/js/')) return true;
  return false;
}

function isDocument(url, request) {
  if (request.mode === 'navigate') return true;
  if (request.destination === 'document') return true;
  return /\.html?$/i.test(url.pathname);
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  const fresh = await network;
  return fresh || cached || new Response('', { status: 503, statusText: 'Offline' });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match('./index.html');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200 && response.type === 'basic') {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (isDocument(url, event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  if (isRevalidateAsset(url, event.request)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  event.respondWith(cacheFirst(event.request));
});
