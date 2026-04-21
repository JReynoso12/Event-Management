/* Placeholder at the common /sw.js path so the dev server returns 200 instead of 404
   when something (stale localhost registration, extension, or tooling) requests it.
   Immediately unregisters — this app does not ship a caching/offline worker. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
