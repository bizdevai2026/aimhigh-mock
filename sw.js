// GradeBlaze — service worker (decommissioned).
//
// History: this used to precache the app shell + cache /data/*.json. It
// caused too many "stuck on stale cache" failures during development —
// browsers held on to old module graphs even after explicit reset, and
// the bump-cache-name ritual was a constant footgun.
//
// New strategy: no service worker. The app works fine over HTTPS without
// one — page loads are already fast over GitHub Pages and there's no
// offline requirement that justifies the operational cost.
//
// This file persists as a *self-destruct* SW so that any device that
// previously installed an SW automatically cleans up on next visit:
//   1. Skip the install/wait phase immediately.
//   2. On activate: delete every cache, unregister this SW, claim
//      clients so the cleanup applies to the open tab.
//   3. Fetch handler is a no-op pass-through (network only).
//
// Once every device has loaded once after this change, the SW is gone.

self.addEventListener("install", function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    } catch (e) { /* tolerate cache API failures */ }
    try { await self.registration.unregister(); } catch (e) { /* ignore */ }
    try { await self.clients.claim(); } catch (e) { /* ignore */ }
  })());
});

// Pass-through. Don't intercept anything — let the browser handle every
// request normally. (Omitting the listener is fine too, but defining it
// makes the no-op behaviour explicit for the next reader.)
self.addEventListener("fetch", function (/* event */) { /* no-op */ });
