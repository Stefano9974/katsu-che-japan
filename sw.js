/* ══════════════════════════════════════════════════════
   SERVICE WORKER — Giappone 2026
   GitHub Pages compatible — cache-first per assets statici
   ══════════════════════════════════════════════════════ */

const CACHE_NAME = 'japan-2026-v2';

// Asset da precachare all'installazione
const PRECACHE_URLS = [
  './',
  './japan-itinerary-2026-mobile.html',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Noto+Serif+JP:wght@200;300;400&family=Space+Mono:wght@400;700&display=swap',
];

// Domini da NON cachare mai (dati live)
const NO_CACHE_HOSTS = ['open.er-api.com', 'exchangerate-api.com'];

// ─── INSTALL ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(() => null))
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: elimina cache vecchie ───
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ───
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // API tasso di cambio → sempre network, mai cache
  if (NO_CACHE_HOSTS.includes(url.hostname)) return;

  // Immagini Unsplash → Cache-first
  if (url.hostname === 'images.unsplash.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Google Fonts → Cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // HTML, icone, manifest → Network-first con fallback cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
