// Rack's service worker. Bump CACHE with every change to a file the phone
// loads (CLAUDE.md), and keep usage.js's VERSION on the same string.
const CACHE = 'rack-v24';

// Put in the cache at install rather than on first use. The font is the one
// file nothing else guarantees a request for before the app goes offline —
// and index.html by its own name, because the offline fallback below asks for
// exactly that key while a browser tab usually fetched the directory URL.
// Each is added on its own: a miss on one must not fail the install.
const PRECACHE = ['./index.html', './fonts/archivo-latin.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(PRECACHE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Firebase and the Worker are live data and must never be served stale;
// googleapis.com is the Firebase SDK and stays uncached for the same reason.
function passThrough(u) {
  return u.hostname.includes('firebaseio.com') || u.hostname.includes('googleapis.com') || u.hostname.endsWith('workers.dev');
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (!u.protocol.startsWith('http') || passThrough(u)) return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r && r.status === 200) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
      return r;
    }).catch(() => caches.match(e.request).then(m => m || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
