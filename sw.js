/* La Sobremesa: guarda la app para abrirla sin internet.
   Al publicar una versión nueva, sube el número de VERSION para que todos la reciban. */
const VERSION = "sobremesa-v3";
const APP = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // La página: primero internet (para recibir novedades), si no hay, la copia guardada.
  if (req.mode === "navigate"){
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put("./index.html", copy)); return res; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Archivos propios, tipografías y la librería de conexión: la copia guardada y se actualiza por detrás.
  const cacheable = url.origin === self.location.origin
    || url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com" || url.hostname === "unpkg.com";
  if (!cacheable) return;
  e.respondWith(
    caches.open(VERSION).then(cache => cache.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }))
  );
});
