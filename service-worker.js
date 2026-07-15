const CACHE_NAME = 'sostagourmet-v4'; // Incrementa questo numero (v2, v3...) quando fai modifiche sostanziali all'HTML
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Fase di installazione: tenta il caching dei singoli file in modo tollerante
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Installazione e salvataggio degli asset...');
      
      // Salviamo ogni risorsa omettendo errori critici di rete se un file è momentaneamente offline
      return Promise.all(
        ASSETS.map((asset) => {
          return cache.add(asset).catch((err) => {
            console.warn(`[Service Worker] Caching fallito per risorsa opzionale: ${asset}`, err);
          });
        })
      );
    }).then(() => {
      return self.skipWaiting(); // Forza il nuovo service worker a diventare attivo subito
    })
  );
});

// Fase di attivazione: elimina le vecchie cache per evitare conflitti con vecchie versioni
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Rimozione vecchia cache in corso:', key);
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
  // REGOLA D'ORO 1: Ignora qualsiasi richiesta che non sia di tipo GET (es. le POST a Apps Script)
  if (e.request.method !== 'GET') {
    return;
  }

  const url = new URL(e.request.url);

  // REGOLA D'ORO 2: Gestisci SOLO le richieste per la nostra PWA (index, manifest, icona)
  // Supporta anche l'URL di base (con o senza barra finale, o cartella della repository)
  const cercaAsset = ASSETS.some(asset => {
    const nomePulito = asset.replace('./', '');
    return url.pathname.endsWith(nomePulito) || 
           (nomePulito === 'index.html' && (url.pathname.endsWith('/') || url.pathname.endsWith('sostagourmet') || url.pathname.endsWith('sostagourmet/')));
  });

  if (!cercaAsset) {
    return; // Lascia scorrere liberamente sulla rete nativa senza interferenze
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      // Se il file è in cache lo restituisce subito, altrimenti lo scarica da internet
      return response || fetch(e.request);
    }).catch(() => {
      // Fallback d'emergenza sulla rete in caso di errore di lettura della cache
      return fetch(e.request);
    })
  );
});
