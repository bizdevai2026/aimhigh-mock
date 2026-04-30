// AimHigh Mock Prep — service worker.
//
// Goals:
//   1. App works on a flaky school Wi-Fi connection.
//   2. Subsequent loads are near-instant on mobile (no round trip for
//      the static shell).
//   3. Question JSON updates land quickly (network-first).
//
// Strategy:
//   - Precache the static shell on install.
//   - Cache-first with background revalidation for HTML / CSS / JS.
//   - Network-first with cached fallback for /data/*.json (questions).
//   - Bump CACHE_NAME on each release so old caches get garbage collected.
//
// Bump ritual: when the ?v=YYYYMMDD query strings in the HTML files
// change, bump CACHE_NAME below to match. The activate handler will
// delete every cache that doesn't equal the current name.

const CACHE_NAME = "aimhigh-mock-v20260504";

const SHELL = [
  "./",
  "./index.html",
  "./welcome.html",
  "./daily.html",
  "./subject.html",
  "./paper.html",
  "./dashboard.html",
  "./learn.html",
  "./mock.css?v=20260504",
  "./mock.js?v=20260504",
  "./welcome.js?v=20260504",
  "./warmup.js?v=20260504",
  "./sprint.js?v=20260504",
  "./paper.js?v=20260504",
  "./dashboard.js?v=20260504",
  "./learn.js?v=20260504",
  "./profile.js?v=20260504",
  "./engagement.js?v=20260504",
  "./questions.js?v=20260504",
  "./sounds.js?v=20260504",
  "./visuals.js?v=20260504",
  "./timetable.js?v=20260504",
  "./assets/logo.svg",
  "./assets/logo-maskable.svg",
  "./assets/favicon.svg",
  "./manifest.webmanifest",
  "./data/science.json",
  "./data/maths.json",
  "./data/english.json",
  "./data/french.json",
  "./data/history.json",
  "./data/geography.json",
  "./data/computing.json",
  "./data/learning.json"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // addAll fails if any single resource fails. Use Promise.all of
      // individual put attempts so a temporary 404 doesn't kill install.
      return Promise.all(SHELL.map(function (url) {
        return fetch(url, { cache: "no-cache" })
          .then(function (resp) {
            if (resp && resp.ok) return cache.put(url, resp);
          })
          .catch(function () { /* tolerate misses on first install */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys
        .filter(function (k) { return k !== CACHE_NAME; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no cross-origin caching

  // Question pools change as content is edited — prefer network so the
  // kid sees fresh questions, with cache as the offline fallback.
  if (url.pathname.indexOf("/data/") !== -1 && url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(req));
    return;
  }

  event.respondWith(cacheFirstWithRevalidate(req));
});

function cacheFirstWithRevalidate(req) {
  return caches.match(req).then(function (cached) {
    const fetchPromise = fetch(req).then(function (resp) {
      if (resp && resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(req, clone); });
      }
      return resp;
    }).catch(function () { return cached; });
    return cached || fetchPromise;
  });
}

function networkFirst(req) {
  return fetch(req).then(function (resp) {
    if (resp && resp.ok) {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(function (c) { c.put(req, clone); });
    }
    return resp;
  }).catch(function () { return caches.match(req); });
}
