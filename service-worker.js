// The name for our cache
const CACHE_NAME = 'gemini-recipe-generator-v2';

// The list of files that make up the application's shell.
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/services/geminiService.ts',
  '/types.ts',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Roboto:wght@400;500&display=swap',
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
];

// Install event: opens a cache and adds the application shell files to it.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching app shell');
        // addAll() is atomic. If any file fails, the whole operation fails.
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Force the waiting service worker to become the active service worker.
  );
});

// Fetch event: serves assets from the cache first (cache-first strategy).
// If the request isn't in the cache, it gets fetched from the network.
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the resource is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch the resource from the network.
        return fetch(event.request).then(networkResponse => {
          // A response can only be consumed once. We need to clone it to store it in the cache.
          const responseToCache = networkResponse.clone();
          
          // Don't cache unsuccessful responses or API calls.
          if (networkResponse.ok && !networkResponse.url.includes('googleapis.com/v1beta/models')) {
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }

          return networkResponse;
        });
      })
      .catch(error => {
        // Handle fetch errors, e.g., for offline scenarios.
        // You could return a fallback page here if you have one.
        console.error('Fetch failed:', error);
        // Rethrow the error to allow the browser to handle the network failure.
        throw error;
      })
  );
});

// Activate event: cleans up old caches.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});
