const CACHE_NAME = 'sekai-force-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);
    if (
        event.request.method !== 'GET'
        || requestUrl.origin !== self.location.origin
    ) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // Update the cache with the fresh response
                const responseToCache = response.clone();
                const cacheUpdate = caches.open(CACHE_NAME)
                    .then((cache) => {
                        return cache.put(event.request, responseToCache);
                    })
                    .catch(() => undefined);
                event.waitUntil(cacheUpdate);

                return response;
            })
            .catch(async () => {
                // Network failed, try to serve from cache
                const cachedResponse = await caches.match(event.request);
                return cachedResponse || Response.error();
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        })
    );
});
