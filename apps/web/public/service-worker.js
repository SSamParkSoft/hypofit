const CACHE_NAME = "hypofit-shell-v2";
const SHELL_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/favicon.ico",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
  "/icons/icon-512.png",
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
