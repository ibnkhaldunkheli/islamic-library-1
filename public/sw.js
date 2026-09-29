// Deliberately conservative: this caches only the static app shell (the
// icons/manifest and a tiny offline fallback page), NOT book PDFs or
// audio files, and NOT any Supabase API responses. Caching library
// content automatically would mean silently eating a visitor's storage
// and risking stale/incorrect content (e.g. a "download not available"
// item quietly staying downloaded). True offline reading/listening is a
// deliberate, visitor-initiated action — see the "Explicit download
// permission" note in supabase/schema.sql — not something a service
// worker should do behind their back.
//
// Bump this on any change to the cached file list below, so returning
// visitors pick up the new shell instead of a stale one.
const CACHE_NAME = 'maktaba-shell-v1';
const SHELL_FILES = ['/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first for everything: always try the network so library
// content stays current, and only fall back to the tiny cached shell
// (icons/manifest) when there's genuinely no connection. Never
// intercepts Supabase API/storage requests differently from any other
// request — there is no special-casing that could serve stale library
// data.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  );
});
