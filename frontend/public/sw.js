/**
 * Service Worker for Hockey Scorekeeper PWA
 * Provides caching, cache poisoning prevention, and offline functionality
 */

const CACHE_NAME = 'hockey-scorekeeper-v1.0.0';
const STATIC_CACHE = 'hockey-scorekeeper-static-v1.0.0';
const DYNAMIC_CACHE = 'hockey-scorekeeper-dynamic-v1.0.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/scorekeeper/',
  '/index.html',
  '/src/main.jsx',
  '/src/index.css',
  '/src/accessibility.css',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/games/,
  /\/api\/players/,
  /\/api\/teams/,
  /\/api\/statistics/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old cache versions
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with cache poisoning prevention
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests (fonts, analytics, etc.)
  if (!url.origin.includes(self.location.origin)) return;

  // Handle API requests with cache poisoning prevention
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => {
          return cache.match(request)
            .then((cachedResponse) => {
              // Return cached response if available and not stale
              if (cachedResponse) {
                const cacheTime = new Date(cachedResponse.headers.get('sw-cache-time'));
                const now = new Date();
                const age = now - cacheTime;

                // Cache for 5 minutes to prevent stale data
                if (age < 5 * 60 * 1000) {
                  console.log('📋 Serving from cache:', request.url);
                  return cachedResponse;
                } else {
                  // Remove stale cache entry
                  cache.delete(request);
                }
              }

              // Fetch fresh data
              return fetch(request)
                .then((response) => {
                  // Only cache successful responses
                  if (response.ok) {
                    // Clone response for caching
                    const responseClone = response.clone();

                    // Add cache timestamp to prevent poisoning
                    const responseWithTimestamp = new Response(responseClone.body, {
                      status: responseClone.status,
                      statusText: responseClone.statusText,
                      headers: {
                        ...Object.fromEntries(responseClone.headers.entries()),
                        'sw-cache-time': new Date().toISOString()
                      }
                    });

                    // Cache the response
                    cache.put(request, responseWithTimestamp);
                    console.log('💾 Cached API response:', request.url);
                  }

                  return response;
                })
                .catch((error) => {
                  console.error('❌ API fetch failed:', error);
                  // Return cached response if available, even if stale
                  if (cachedResponse) {
                    console.log('⚠️ Serving stale cache due to network error');
                    return cachedResponse;
                  }
                  throw error;
                });
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('📦 Serving static asset from cache:', request.url);
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
              return response;
            });
        })
    );
    return;
  }

  // Default network-first strategy for other requests
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful HTML responses
        if (response.ok && request.destination === 'document') {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // Return cached version if available
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📄 Serving cached page:', request.url);
              return cachedResponse;
            }

            // Return offline fallback for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Message event - handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('⏭️ Skipping waiting phase');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_CACHE_INFO') {
    caches.keys().then((cacheNames) => {
      event.ports[0].postMessage({
        cacheNames,
        currentVersion: CACHE_NAME
      });
    });
  }
});

// Background sync for offline actions (if supported)
if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
      console.log('🔄 Background sync triggered');
      event.waitUntil(
        // Handle offline actions here
        Promise.resolve()
      );
    }
  });
}

console.log('🎯 Service Worker loaded successfully');