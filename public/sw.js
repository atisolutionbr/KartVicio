/* Cache somente a tela pública offline; nunca dados de corrida, login ou API. */
const CACHE = 'kart-offline-v1';
const ROOT = new URL('./', self.location.href).pathname;
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.add(ROOT + 'offline.html')).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kart-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate' || !new URL(event.request.url).pathname.startsWith(ROOT)) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(ROOT + 'offline.html').then(response => response || Response.error())));
});
