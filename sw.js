// Gewürz-Kompass – Service Worker: macht die App installierbar und offline startbar.
const CACHE = "gewuerz-kompass-v11";
const SHELL = ["./", "index.html", "sizzlebrothers.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"];

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
  // Teilen aus anderen Apps (z. B. Instagram): Daten zwischenspeichern, dann App öffnen
  if (e.request.method === "POST" && url.origin === location.origin && url.searchParams.has("share-target")) {
    e.respondWith((async () => {
      try {
        const f = await e.request.formData();
        const c = await caches.open("gk-share");
        for (const k of await c.keys()) await c.delete(k);
        const imgs = f.getAll("bilder").filter(x => x && x.size && (/^image\//.test(x.type) || x.type === "application/pdf" || /\.pdf$/i.test(x.name || ""))).slice(0, 8);
        for (let i = 0; i < imgs.length; i++) await c.put("img" + i, new Response(imgs[i], { headers: { "content-type": imgs[i].type } }));
        await c.put("share.json", new Response(JSON.stringify({
          title: f.get("share-title") || "", text: f.get("share-text") || "", url: f.get("share-url") || "", files: imgs.length, names: imgs.map(x => x.name || "")
        }), { headers: { "content-type": "application/json" } }));
      } catch (_) {}
      return Response.redirect(new URL("./?shared=1", self.registration.scope).href, 303);
    })());
    return;
  }
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
