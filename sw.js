// Service Worker for DealHub PWA

const CACHE_NAME = 'dealhub-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Helper: Should we use network first or cache first?
function shouldNetworkFirst(request) {
  // For API calls or dynamic content, always try network first
  const url = new URL(request.url);
  
  // List of dynamic resources that should always be network first
  const networkFirstPatterns = [
    /\/api\//,
    /\/graphql/,
    /\/search/,
    /\.json$/,
    /\.js$/,
    /\.css$/
  ];
  
  return networkFirstPatterns.some(pattern => pattern.test(url.pathname));
}

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip cross-origin requests except CDN
  if (url.origin !== self.location.origin && !url.hostname.includes('cdnjs')) {
    // For CDN, try cache first
    if (url.hostname.includes('cdnjs')) {
      event.respondWith(
        caches.match(request)
          .then((response) => {
            return response || fetch(request);
          })
      );
    }
    return;
  }
  
  // For HTML pages - use network first with cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh HTML
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, clonedResponse);
            });
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }
  
  // For static assets - cache first, then network
  if (request.url.includes('/image/') || 
      request.url.includes('/fonts/') ||
      request.url.match(/\.(jpg|jpeg|png|gif|svg|webp|woff|woff2|ttf|eot|ico)$/)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              // Cache the new response
              const clonedResponse = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, clonedResponse);
                });
              return response;
            });
        })
    );
    return;
  }
  
  // For dynamic content - network first with cache fallback
  if (shouldNetworkFirst(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache dynamic responses for offline use
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, clonedResponse);
              });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
  
  // Default: cache first, fallback to network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request)
          .then((response) => {
            // Cache for future offline use
            if (response.ok) {
              const clonedResponse = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, clonedResponse);
                });
            }
            return response;
          });
      })
  );
});

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  console.log('[Service Worker] Syncing cart data');
  // Implement cart sync logic here
}

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'DealHub';
  const options = {
    body: data.body || 'New deals available!',
    icon: '/image/favicon-192x192.png',
    badge: '/image/favicon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});