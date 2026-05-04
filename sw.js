/* ══════════════════════════════════════════════════════
   SERVICE WORKER — Giappone 2026
   GitHub Pages compatible — cache-first per assets statici
   ══════════════════════════════════════════════════════ */

const CACHE_NAME = 'japan-2026-v1';

// Asset da precachare all'installazione
const PRECACHE_URLS = [
  './',
  './japan-itinerary-2026-mobile.html',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Noto+Serif+JP:wght@200;300;400&family=Space+Mono:wght@400;700&display=swap',
];

// ─── INSTALL: precache pagina principale ───
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Usiamo addAll ma gestiamo singoli fallimenti
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

// ─── FETCH: strategia Network-first con fallback cache ───
// Per le immagini Unsplash usiamo Cache-first (sono statiche e pesanti)
// Per tutto il resto: Network-first (aggiorna sempre se online)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora richieste non GET e cross-origin non utili
  if (event.request.method !== 'GET') return;

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

  // Google Fonts → Cache-first (cambiano raramente)
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

  // Pagina HTML e asset locali → Network-first con fallback cache
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
