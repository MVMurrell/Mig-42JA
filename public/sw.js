// Jemzy PWA Service Worker
const CACHE_NAME = 'jemzy-v1.0.0';
const STATIC_CACHE = 'jemzy-static-v1.0.0';
const DYNAMIC_CACHE = 'jemzy-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/JemzyLogoIcon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Network-first URLs (always try network first)
const NETWORK_FIRST_URLS = [
  '/api/',
  '/auth/',
  '/uploads/'
];

// Cache-first URLs (serve from cache if available)
const CACHE_FIRST_URLS = [
  '/icons/',
  '/screenshots/',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.css',
  '.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('PWA: Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('PWA: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch((error) => {
      console.error('PWA: Failed to cache static assets:', error);
    })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('PWA: Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== STATIC_CACHE && 
                   cacheName !== DYNAMIC_CACHE &&
                   cacheName.startsWith('jemzy-');
          })
          .map((cacheName) => {
            console.log('PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different URL patterns with appropriate strategies
  if (shouldUseNetworkFirst(request.url)) {
    event.respondWith(networkFirstStrategy(request));
  } else if (shouldUseCacheFirst(request.url)) {
    event.respondWith(cacheFirstStrategy(request));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// Network-first strategy for API calls and dynamic content
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('PWA: Network failed, trying cache for:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for HTML pages
    if (request.headers.get('accept').includes('text/html')) {
      return new Response(
        '<html><body><h1>Offline</h1><p>Please check your internet connection and try again.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('PWA: Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Stale-while-revalidate strategy for general content
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);
  
  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || networkResponsePromise;
}

// Helper functions
function shouldUseNetworkFirst(url) {
  return NETWORK_FIRST_URLS.some(pattern => url.includes(pattern));
}

function shouldUseCacheFirst(url) {
  return CACHE_FIRST_URLS.some(pattern => url.includes(pattern));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('PWA: Background sync triggered:', event.tag);
  
  if (event.tag === 'video-upload') {
    event.waitUntil(syncVideoUploads());
  }
  
  if (event.tag === 'treasure-collection') {
    event.waitUntil(syncTreasureCollection());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('PWA: Push notification received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New activity on Jemzy!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: data.image,
    data: data.data,
    actions: [
      {
        action: 'open',
        title: 'Open Jemzy',
        icon: '/icons/action-open.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ],
    tag: data.tag || 'jemzy-notification',
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
    timestamp: Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Jemzy', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('PWA: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open new window
      if (clients.openWindow) {
        const targetUrl = event.notification.data?.url || '/';
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Sync functions for offline functionality
async function syncVideoUploads() {
  // Implementation for syncing offline video uploads
  console.log('PWA: Syncing offline video uploads...');
}

async function syncTreasureCollection() {
  // Implementation for syncing offline treasure collections
  console.log('PWA: Syncing offline treasure collections...');
}

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  console.log('PWA: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('PWA: Service Worker loaded successfully');