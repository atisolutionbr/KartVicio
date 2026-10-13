const CACHE_NAME = 'kartvicio-static-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('kartvicio-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Somente arquivos versionados do build podem usar cache. Dados, sessão,
  // navegação e consultas de entidades SEMPRE vêm da rede, sem fallback antigo.
  const immutableAsset = /^\/assets\/[^/]+-[\w-]{8,}\.(js|css|woff2?|png|jpe?g|svg|webp)$/.test(url.pathname);
  if (!immutableAsset) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  })());
});
