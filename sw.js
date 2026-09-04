// Rack's service worker. Bump CACHE with every change to a file the phone
// loads (CLAUDE.md), and keep usage.js's VERSION on the same string.
const CACHE = 'rack-v27';

// How long to give the network before a cached copy is served instead. Long
// enough that a normal fetch on a normal connection always wins, short enough
// that one bar of signal in a gym basement does not hold the shell hostage.
const NET_TIMEOUT = 3000;

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
  e.respondWith(respond(e));
});

// Network first, but not network only. The old handler waited on fetch() for
// as long as the OS would let it, so on a weak signal the shell stalled with a
// perfectly good copy sitting in the cache. Now: no cached copy, wait for the
// network as before; a cached copy, race it against NET_TIMEOUT and serve the
// cache if the network is slower, letting the fetch finish in the background so
// the cache is fresh next time. A network failure with nothing cached falls
// back to index.html for navigations, since the shell can boot from there.
async function respond(e) {
  const req = e.request;
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);

  const net = fetch(req).then(r => {
    if (r && r.status === 200) cache.put(req, r.clone());
    return r;
  });

  if (!cached) {
    return net.catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  }

  let timer;
  const slow = new Promise(res => { timer = setTimeout(() => res(null), NET_TIMEOUT); });
  const first = await Promise.race([net.catch(() => null), slow]);
  clearTimeout(timer);
  if (first) return first;

  // Too slow or failed: the fetch keeps running so its answer still lands in
  // the cache, and any rejection is swallowed there rather than left dangling.
  e.waitUntil(net.catch(() => {}));
  return cached;
}
