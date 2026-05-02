const CACHE_VERSION = "v3.0.0";
const STATIC_CACHE = `ke-kingdom-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `ke-kingdom-runtime-${CACHE_VERSION}`;
const API_CACHE = `ke-kingdom-api-${CACHE_VERSION}`;
const MEDIA_CACHE = `ke-kingdom-media-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
];

// API endpoints to cache with network-first strategy
const CACHEABLE_API_ENDPOINTS = [
  "/api/news",
  "/api/events",
  "/api/gallery",
  "/api/posts/trending",
  "/api/marketplace/trending",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log(`[SW] Installing version ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Static assets cached successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Failed to cache static assets:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log(`[SW] Activating version ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        const currentCaches = [STATIC_CACHE, RUNTIME_CACHE, API_CACHE, MEDIA_CACHE];
        const oldCaches = cacheNames.filter(name => !currentCaches.includes(name));
        
        console.log("[SW] Cleaning up old caches:", oldCaches);
        
        return Promise.all(
          oldCaches.map(name => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
        );
      })
      .then(() => {
        console.log("[SW] All old caches cleaned up");
        return self.clients.claim();
      })
      .catch((error) => {
        console.error("[SW] Error during activation:", error);
      })
  );
});

// Network-first strategy for API calls
async function networkFirst(request) {
  try {
    console.log(`[SW] Network-first: ${request.url}`);
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the successful response
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      console.log(`[SW] Cached API response: ${request.url}`);
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW] Network failed, trying cache for: ${request.url}`);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log(`[SW] Serving from cache: ${request.url}`);
      return cachedResponse;
    }
    
    // Return offline fallback for specific API endpoints
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: "Offline", 
          message: "No internet connection" 
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    
    throw error;
  }
}

// Cache-first strategy for static assets
async function cacheFirst(request) {
  console.log(`[SW] Cache-first: ${request.url}`);
  
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log(`[SW] Serving from cache: ${request.url}`);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
      console.log(`[SW] Cached new resource: ${request.url}`);
    }
    return networkResponse;
  } catch (error) {
    console.error(`[SW] Failed to fetch: ${request.url}`, error);
    throw error;
  }
}

// Stale-while-revalidate strategy for media
async function staleWhileRevalidate(request) {
  console.log(`[SW] Stale-while-revalidate: ${request.url}`);
  
  const cache = await caches.open(MEDIA_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log(`[SW] Updated media cache: ${request.url}`);
    }
    return networkResponse;
  });
  
  if (cachedResponse) {
    console.log(`[SW] Serving stale media: ${request.url}`);
    // Update cache in background
    fetchPromise.catch(error => {
      console.error(`[SW] Background update failed: ${request.url}`, error);
    });
    return cachedResponse;
  }
  
  return fetchPromise;
}

// Main fetch event handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Only handle GET requests
  if (event.request.method !== "GET") {
    return;
  }
  
  // Handle different request types
  if (url.pathname.startsWith("/api/")) {
    // API requests - network first with cache fallback
    if (CACHEABLE_API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
      event.respondWith(networkFirst(event.request));
    }
    return;
  }
  
  if (url.pathname.startsWith("/uploads/") || url.pathname.includes("/media/")) {
    // Media files - stale-while-revalidate
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }
  
  if (url.origin !== location.origin) {
    // External requests - don't cache
    return;
  }
  
  if (event.request.mode === "navigate") {
    // Navigation requests - serve index.html for SPA
    event.respondWith(
      caches.match("/index.html")
        .then(response => response || fetch("/index.html"))
    );
    return;
  }
  
  // Static assets - cache first
  event.respondWith(cacheFirst(event.request));
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);
  
  if (event.tag === "background-sync-posts") {
    event.waitUntil(syncOfflinePosts());
  } else if (event.tag === "background-sync-messages") {
    event.waitUntil(syncOfflineMessages());
  }
});

// Push notification handler
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");
  
  const options = {
    body: event.data ? event.data.text() : "New notification from KE Kingdom",
    icon: "/icon-192.png",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: "explore",
        title: "Explore",
        icon: "/icon-192.png"
      },
      {
        action: "close",
        title: "Close",
        icon: "/favicon.ico"
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification("KE Kingdom", options)
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.notification.data);
  
  event.notification.close();
  
  if (event.action === "explore") {
    event.waitUntil(
      clients.openWindow("/")
    );
  } else if (event.action === "close") {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow("/")
    );
  }
});

// Background sync helper functions
async function syncOfflinePosts() {
  console.log("[SW] Syncing offline posts");
  
  try {
    const offlinePosts = await getOfflineData("offline-posts");
    
    for (const post of offlinePosts) {
      try {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${post.token}`
          },
          body: JSON.stringify(post.data)
        });
        
        if (response.ok) {
          await removeOfflineData("offline-posts", post.id);
          console.log("[SW] Synced post:", post.id);
        }
      } catch (error) {
        console.error("[SW] Failed to sync post:", post.id, error);
      }
    }
  } catch (error) {
    console.error("[SW] Error syncing posts:", error);
  }
}

async function syncOfflineMessages() {
  console.log("[SW] Syncing offline messages");
  
  try {
    const offlineMessages = await getOfflineData("offline-messages");
    
    for (const message of offlineMessages) {
      try {
        const response = await fetch(`/api/conversations/${message.conversationId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${message.token}`
          },
          body: JSON.stringify(message.data)
        });
        
        if (response.ok) {
          await removeOfflineData("offline-messages", message.id);
          console.log("[SW] Synced message:", message.id);
        }
      } catch (error) {
        console.error("[SW] Failed to sync message:", message.id, error);
      }
    }
  } catch (error) {
    console.error("[SW] Error syncing messages:", error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ke-kingdom-offline", 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    };
  });
}

async function removeOfflineData(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ke-kingdom-offline", 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Message handler for client communication
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);
  
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});