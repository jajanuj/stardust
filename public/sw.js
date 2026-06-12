const CACHE_NAME = "starduty-v1";
const STATIC_ASSETS = ["/", "/login/cadet", "/login/commander"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (e.request.url.includes("/api/")) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

self.addEventListener("push", (e) => {
  if (!e.data) return;
  const payload = e.data.json();
  e.waitUntil(
    self.registration.showNotification(payload.title ?? "StarDuty", {
      body: payload.body ?? "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});
