const CACHE_NAME = 'sostagourmet-v12'; // Incrementato a v12
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon.svg'
];

// 1. Installazione: salva gli asset di base
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Salvataggio asset v12...');
      return Promise.all(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Caching fallito per: ${asset}`, err);
          });
        })
      );
    }).then(() => self.skipWaiting()) // Attiva subito la nuova versione
  );
});

// 2. Attivazione: elimina subito le vecchie cache (v11, v10, ecc.)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Cancellazione vecchia cache:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim()) // Prende il controllo immediato delle schede aperte
  );
});

// 3. Gestione Richieste (Fetch)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Controlliamo se la richiesta è per la pagina principale (index.html o la root)
  const isIndexPage = url.pathname.endsWith('index.html') || 
                      url.pathname.endsWith('/') || 
                      url.pathname.endsWith('sostagourmet') || 
                      url.pathname.endsWith('sostagourmet/');

  // 🚀 STRATEGIA NETWORK-FIRST PER INDEX.HTML:
  // Cerca PRIMA su GitHub/Internet. Se trova il file aggiornato, lo scarica e lo salva in cache.
  if (isIndexPage) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Se sei in galleria o offline senza rete, carica la versione in cache!
          return caches.match(e.request);
        })
    );
    return;
  }

  // 📦 STRATEGIA CACHE-FIRST PER GLI ALTRI ASSET STATICI (icone, manifest)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
