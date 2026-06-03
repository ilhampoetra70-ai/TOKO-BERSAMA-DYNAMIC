const cacheVersion = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `tokobersama-admin-${cacheVersion}`;
const SHELL_URLS = [
  '/admin/',
  '/admin/manifest.webmanifest?v=2',
  '/admin/tokobersama-icon.svg',
  '/admin/icon-192.png',
  '/admin/icon-512.png',
];

const API_PREFIXES = [
  '/admin-api',
  '/auth/',
  '/catalog',
  '/database',
  '/public/price-checker',
  '/receivables',
  '/reports',
  '/sales',
  '/settings',
  '/users',
  '/workspace',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (url.pathname === '/admin/sw.js' || url.pathname === '/admin/manifest.webmanifest') {
    event.respondWith(fetch(event.request));
    return;
  }

  if (API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/admin/'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
        }).catch(() => undefined);
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
