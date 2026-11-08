/**
 * DevTools Hub - Service Worker
 * Enables offline execution and asset caching for client-side tools.
 */

const CACHE_NAME = 'devtools-hub-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/contact.html',
  '/privacy-policy.html',
  '/terms-of-service.html',
  '/disclaimer.html',
  '/cookie-policy.html',
  '/404.html',
  '/tools/json-formatter.html',
  '/tools/html-minifier.html',
  '/tools/css-beautifier.html',
  '/tools/base64-encoder.html',
  '/tools/url-encoder.html',
  '/tools/uuid-generator.html',
  '/blog/index.html',
  '/assets/css/style.css',
  '/assets/css/tools.css',
  '/assets/css/blog.css',
  '/assets/js/core-tools.js',
  '/assets/js/app.js',
  '/assets/js/json-tool.js',
  '/assets/js/html-tool.js',
  '/assets/js/css-tool.js',
  '/assets/js/base64-tool.js',
  '/assets/js/url-tool.js',
  '/assets/js/uuid-tool.js',
  '/assets/img/icon.svg',
  '/assets/img/og-banner.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // Fallback for HTML documents when offline
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
