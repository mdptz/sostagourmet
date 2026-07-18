const CACHE_NAME = 'sostagourmet-v7'; // INCREMENTATO A V2: Forza il browser a scaricare il nuovo HTML senza leggiCache!
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Fase di installazione: tenta il caching dei singoli file in modo tollerante
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Installazione e salvataggio dei nuovi asset v2...');
      
      return Promise.all(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Caching fallito per risorsa opzionale: ${asset}`, err);
          });
        })
      );
    }).then(() => {
      return self.skipWaiting(); // Forza il nuovo service worker a diventare attivo subito ed eliminare la v1
    })
  );
});

// Fase di attivazione: elimina le vecchie cache per evitare conflitti con vecchie versioni (es. v1)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Rimozione vecchia cache v1 in corso:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => {
      return self.clients.claim(); // Prende il controllo immediato di tutte le pagine aperte
    })
  );
});

// Gestione delle richieste (Fetch) con bypass totale delle chiamate esterne
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') {
    return;
  }

  const url = new URL(e.request.url);

  // Gestisce solo le richieste interne alla PWA
  const cercaAsset = ASSETS.some(asset => {
    const nomePulito = asset.replace('./', '');
    return url.pathname.endsWith(nomePulito) || 
           (nomePulito === 'index.html' && (url.pathname.endsWith('/') || url.pathname.endsWith('sostagourmet') || url.pathname.endsWith('sostagourmet/')));
  });

  if (!cercaAsset) {
    return; 
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    }).catch(() => {
      return fetch(e.request);
    })
  );
});
