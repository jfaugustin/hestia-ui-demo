// Hestia public demo: offline shell only. No guest records, tickets or payments cached.
const CACHE = "hestia-static-v20";
const SHELL = ["./", "./index.html"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("hestia-static-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put("./index.html", clone));
    }
    return response;
  }).catch(() => caches.match("./index.html")));
});
