/* ============================================================
   poopuri — service worker
   Caches the app shell so poopuri opens instantly and installs to
   the home screen. Songs live in your Vercel Blob library and are
   streamed on demand (playback needs internet), and the song list
   is always fetched fresh so both devices stay in sync.
   Bump CACHE when you change the shell to force a refresh.
   ============================================================ */
const CACHE = "poopuri-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache the API (the song list must stay live) or cross-origin
  // blob audio — let those hit the network directly.
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // App shell: network-first so redeploys win, cache as offline fallback.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
