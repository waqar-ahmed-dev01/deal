const CACHE_NAME = 'dealhub-v3';

// Cache all assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll([
                    '/',
                    '/manifest.json',
                    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
                ]);
            })
            .then(() => self.skipWaiting())
    );
});

// Serve cached content when offline
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .catch(() => caches.match(e.request))
    );
});