const CACHE = "Fluento-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./login.html",
  "./dashboard.html",
  "./speaking.html",
  "./listening.html",
  "./extra.html",
  "./about.html",
  "./css/style.css",
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
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
