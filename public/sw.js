/*
 * Service worker MÍNIMO: si se cae la señal en el club y alguien navega,
 * muestra /offline.html en vez de la pantalla de error del navegador.
 * A propósito NO guarda páginas ni datos (el panel admin nunca queda en caché).
 */
const CACHE = "offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return; // solo navegaciones; lo demás va directo a la red
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
