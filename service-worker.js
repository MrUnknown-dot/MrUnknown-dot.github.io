const CACHE = "Fluento-v24";
const ASSETS = [
  "./",
  "./dashboard.html",
  "./speaking.html",
  "./listening.html",
  "./extra.html",
  "./about.html",
  "./css/style.min.css",
  "./js/index.js",
  "./js/auth.js",
  "./js/firebase.js",
  "./js/common.js",
  "./js/data.js",
  "./js/dashboard.js",
  "./js/speaking.js",
  "./js/listening.js",
  "./js/extra.js",
  "./js/about.js",
  "./assets/ec logo.png.jpeg", 
  "./assets/avatar.svg",
  "./assets/book-atomic.svg",
  "./assets/book-power.svg",
  "./assets/book-grammar.svg"
  // IMPORTANT: login.html and index.html are NOT cached
  // This ensures fresh auth check every time
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      console.log("Caching assets version:", CACHE);
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => {
          console.log("Deleting old cache:", k);
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== "GET") return;
  
  const url = new URL(request.url);

  // Keep third-party traffic out of cache logic
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }
  
  // NEVER cache auth-related pages or Firebase endpoints
  if (url.pathname.includes('login.html') || 
      url.pathname.includes('index.html') ||
      url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('gstatic')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Return cached version but update in background
        event.waitUntil(
          fetch(request)
            .then((response) => {
              return caches.open(CACHE).then((cache) => {
                cache.put(request, response.clone());
                return response;
              });
            })
            .catch(() => cached)
        );
        return cached;
      }
      
      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('./dashboard.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});
