const CACHE_PREFIX = "cr3atix-pong-";
const CACHE = `${CACHE_PREFIX}v3.0.1-performance-safe`;
const ROOT_URL = new URL("./", self.registration.scope);
const CORE = [
  ROOT_URL.href,
  new URL("manifest.webmanifest", ROOT_URL).href,
  new URL("favicon.svg", ROOT_URL).href,
  new URL("icons/icon-192.png", ROOT_URL).href,
  new URL("icons/icon-512.png", ROOT_URL).href,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(ROOT_URL.pathname)) return;

  const networkFirst = () => fetch(request)
    .then((response) => {
      if (response.ok && response.type !== "opaque") caches.open(CACHE).then((cache) => cache.put(request.mode === "navigate" ? ROOT_URL.href : request, response.clone()));
      return response;
    })
    .catch(() => caches.match(request.mode === "navigate" ? ROOT_URL.href : request).then((cached) => cached || Response.error()));

  if (request.mode === "navigate" || url.pathname.includes("/_next/static/")) {
    event.respondWith(networkFirst());
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok && response.type !== "opaque") caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      }).catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});