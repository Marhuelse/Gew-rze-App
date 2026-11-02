// Gewürz-Kompass – Service Worker: macht die App installierbar und offline startbar.
const CACHE = "gewuerz-kompass-v6";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // KI-Anfragen und fremde Seiten nie cachen
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // Seite: erst Netz (für Updates), dann Cache (offline)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return r; })
        .catch(() => caches.match("index.html"))
    );
    return;
  }
  // Icons & Co.: erst Cache, dann Netz
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
