// Service worker: deja la app disponible sin conexión.
// Con internet siempre carga la versión más nueva; sin internet (o si la red tarda) usa la guardada.
// Al cambiar cualquier archivo de la app, sube VERSION.
const VERSION = 'v6';
const CACHE = `amorshitos-${VERSION}`;
const SDK_CACHE = 'amorshitos-sdk';
const NETWORK_TIMEOUT_MS = 4000;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/ui.js', 'js/dates.js', 'js/cloud.js', 'js/firebase-config.js',
  'js/categorias.js', 'js/apariencia.js', 'js/ajustes.js', 'js/burbujas.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SDK_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// El SDK de Firebase (versionado, no cambia) se guarda la primera vez para poder abrir la app sin conexión.
const isSdk = (url) => url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (request.method === 'GET' && isSdk(url)) {
    e.respondWith(caches.open(SDK_CACHE).then(async (cache) => {
      const hit = await cache.match(request);
      if (hit) return hit;
      const res = await fetch(request);
      if (res.ok) cache.put(request, res.clone());
      return res;
    }));
    return;
  }
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const fromNetwork = fetch(request, { cache: 'no-cache' }).then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    });
    e.waitUntil(fromNetwork.catch(() => {}));

    const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS, null));
    try {
      const res = await Promise.race([fromNetwork, timeout]);
      if (res) return res;
    } catch { /* sin conexión: se usa la copia guardada */ }
    return (await cache.match(request, { ignoreSearch: true }))
      ?? (await cache.match('index.html'))
      ?? fromNetwork;
  })());
});
