// AsaanDesk service worker: makes the site installable as an app and keeps working offline.
// Pages: network first (always fresh when online), cached copy when offline.
// Hashed build files (/_next/static): cache first (they never change).
// Other files (editor, OCR, icons): served from cache and refreshed in the background.
const CACHE = 'asaandesk-v1';
const CORE = ['/', '/404.html', '/manifest.webmanifest', '/assets/app-icon-192.png', '/assets/app-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, {ignoreSearch: true})) || (await cache.match('/')) || Response.error();
  }
}
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}
async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const fresh = fetch(request).then((r) => { if (r.ok) cache.put(request, r.clone()); return r; }).catch(() => hit);
  if (hit) { event.waitUntil(fresh); return hit; }
  return fresh;
}

self.addEventListener('fetch', (event) => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Google, Dropbox, WASecret AI: never cached
  if (request.mode === 'navigate') return event.respondWith(networkFirst(request));
  if (url.pathname.startsWith('/_next/static/')) return event.respondWith(cacheFirst(request));
  if (/\.(js|mjs|css|wasm|png|jpg|svg|woff2?|webmanifest|traineddata|gz|json)$/.test(url.pathname)) return event.respondWith(staleWhileRevalidate(request, event));
});
