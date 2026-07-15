const CACHE_NAME = 'sostagourmet-v1'; // Incrementa questo numero (v2, v3...) quando fai modifiche sostanziali all'HTML
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon.svg'
];

// Fase di installazione: salva i file principali nella cache
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell...');
      return cache.addAll(ASSETS);
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
          console.log('[Service Worker] Rimozione vecchia cache:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => {
      return self.clients.claim(); // Prende il controllo immediato di tutte le pagine aperte
    })
  );
});

// Gestione delle richieste (Fetch)
self.addEventListener('fetch', (e) => {
  // REGOLA D'ORO: Non intercettare MAI richieste che non siano GET (come le POST a Google Apps Script per GPS e Gemini)
  if (e.request.method !== 'GET') {
    return; // Lascia che vadano direttamente alla rete senza interferenze
  }

  // Lascia che le chiamate di geolocalizzazione, Leaflet e Apps Script vadano sempre direttamente sulla rete
  if (e.request.url.includes('google.com') || e.request.url.includes('unpkg.com') || e.request.url.includes('basemaps.cartocdn.com')) {
    return; // Non intercettare queste chiamate
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      // Se il file è in cache lo restituisce subito (velocità fulminea), altrimenti lo scarica da internet
      return response || fetch(e.request);
    })
  );
});
