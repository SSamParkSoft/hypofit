const CACHE_NAME = "hypofit-shell-v3";
const SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest?v=3",
  "/icons/favicon.ico?v=3",
  "/icons/favicon.svg?v=3",
  "/icons/apple-touch-icon.png?v=3",
  "/icons/icon.svg?v=3",
  "/icons/icon-192.png?v=3",
  "/icons/icon-512.png?v=3",
  "/icons/icon-maskable-192.png?v=3",
  "/icons/icon-maskable-512.png?v=3",
  "/brand/hypofit-mark.svg",
  "/brand/hypofit-mark-inverse.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => cached || caches.match("/"));
    }),
  );
});
