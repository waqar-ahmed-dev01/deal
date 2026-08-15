// service-worker.js - DealHub PWA Service Worker

// Cache name with version
const CACHE_NAME = 'dealhub-v5.0.0';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS and JS are inlined in the HTML, but we cache the main page
  // Add external resources if needed
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
];

// Dynamic cache for product images and API data
const DYNAMIC_CACHE = 'dealhub-dynamic-v3';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  const cacheWhitelist = [CACHE_NAME, DYNAMIC_CACHE];
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip cross-origin requests except CDN
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('cdnjs.cloudflare.com') &&
      !url.hostname.includes('api.qrserver.com') &&
      !url.hostname.includes('images.unsplash.com') &&
      !url.hostname.includes('cellmart.pk') &&
      !url.hostname.includes('encrypted-tbn0.gstatic.com') &&
      !url.hostname.includes('saeedghani.pk') &&
      !url.hostname.includes('springs.com.pk') &&
      !url.hostname.includes('zenixstore.pk') &&
      !url.hostname.includes('bbabysuleman.com') &&
      !url.hostname.includes('placehold.co')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // For HTML navigation - serve from cache or network
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/')
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version but update in background
            event.waitUntil(
              fetch(request)
                .then((networkResponse) => {
                  if (networkResponse && networkResponse.status === 200) {
                    const clonedResponse = networkResponse.clone();
                    caches.open(CACHE_NAME)
                      .then((cache) => cache.put('/', clonedResponse));
                  }
                })
                .catch(() => {})
            );
            return cachedResponse;
          }
          
          // No cache, try network
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const clonedResponse = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put('/', clonedResponse));
              }
              return networkResponse;
            })
            .catch(() => {
              // Fallback offline page
              return new Response(
                '<html><head><title>Offline</title><style>body{font-family:sans-serif;text-align:center;padding:50px;}</style></head><body><h1>🛒 DealHub</h1><p>You are offline. Please check your internet connection.</p><p>But don\'t worry, your cart is saved locally!</p></body></html>',
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({ 'Content-Type': 'text/html' })
                }
              );
            });
        })
    );
    return;
  }
  
  // For static assets and images
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached response
          return cachedResponse;
        }
        
        // Try network
        return fetch(request)
          .then((networkResponse) => {
            // Check if response is valid
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Cache the response for future
            const clonedResponse = networkResponse.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, clonedResponse);
              })
              .catch((error) => {
                console.warn('[Service Worker] Failed to cache:', error);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // For images, return a placeholder
            if (request.headers.get('accept').includes('image')) {
              return new Response(
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23f0f0f0"/><text x="100" y="100" font-size="20" text-anchor="middle" dy=".3em" fill="%23999">Image not available</text></svg>',
                {
                  headers: new Headers({ 'Content-Type': 'image/svg+xml' })
                }
              );
            }
            
            // Return a generic offline response
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for cart operations (optional)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag);
  
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

// Function to sync cart data (placeholder)
function syncCart() {
  return new Promise((resolve) => {
    // Implement background sync logic here
    // For example, send pending cart items to server
    console.log('[Service Worker] Syncing cart data...');
    resolve();
  });
}

// Push notification support (optional)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'New deal available!',
    icon: '/image/favicon-192x192.png',
    badge: '/image/favicon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('DealHub', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then((clientList) => {
        const url = event.notification.data.url || '/';
        
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open a new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});