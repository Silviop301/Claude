// Service worker: guarda o jogo no aparelho para abrir rápido e funcionar offline.
// Troque VERSION a cada publicação para os jogadores receberem a atualização.
const VERSION = 'pombo-v8';
const SHELL = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'src/data.js', 'src/format.js', 'src/audio.js', 'src/save.js', 'src/items.js', 'src/game.js',
  'src/fx.js', 'src/market.js', 'src/events.js', 'src/loot.js', 'src/meta.js', 'src/wheel.js', 'src/mba.js', 'src/prestige.js', 'src/daytrade.js',
  'src/pombo.js', 'src/ui.js', 'src/main.js', 'src/pwa.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (pega atualizações), cache como reserva quando estiver offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && (e.request.url.startsWith(self.location.origin) || e.request.url.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
