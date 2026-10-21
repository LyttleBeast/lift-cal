// The network leg revalidates for our own files. A plain fetch here is answered
// out of the browser's own HTTP cache, and Pages holds these assets about ten
// minutes — so for the first minutes of every ship the worker faithfully
// re-cached the build before this one, while sw.js itself, the one script
// browsers always revalidate, reported the new version. `no-cache` is a
// conditional request and a 304; `reload` would re-download everything every
// time. Same-origin only, and never a navigation: any init at all rebuilds the
// request, and an engine that refuses to rebuild a navigation would reject into
// the catch below — which on the first launch after a bump, with the cache just
// emptied, is a blank screen rather than a stale file.
//
// The plain retry is the offline half and it is not decoration. A revalidating
// request needs the network by definition, so it cannot be answered from the
// HTTP cache the way a plain one can — and the launch right after a bump is
// exactly when Cache Storage is empty, because activate has just deleted the
// only cache there was. Without the retry that launch is a blank app in a
// basement where the old one worked. It costs one rejected promise offline and
// nothing at all online, where the first leg has already answered.
// v68: index.html's ten-minute window (report/index-stale.md, option B — the
// one it recommends shipping first). A navigation is still answered exactly as
// before, by the plain fetch above; beside it, a background conditional
// request for the same URL refreshes the browser's HTTP cache, so the launch
// after a ship's first launch gets the new index.html instead of waiting out
// Pages' max-age=600. It is a separate request built from the URL string, so it
// never rebuilds the navigation Request; its response is never handed to
// respondWith, so a redirect it follows is harmless; and its failure is
// swallowed. A 304 per launch, given Pages' ETag. Option A (navigations take
// the revalidating leg) stays gated on the one phone check the report names.
const CACHE='rack-v68';self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(!u.protocol.startsWith('http'))return;if(u.hostname.includes('firebaseio.com')||u.hostname.includes('googleapis.com')||u.hostname.endsWith('workers.dev'))return;const fresh=u.origin===self.location.origin&&e.request.mode!=='navigate';const net=fresh?fetch(e.request,{cache:'no-cache'}).catch(()=>fetch(e.request)):fetch(e.request);if(e.request.mode==='navigate'&&u.origin===self.location.origin)e.waitUntil(fetch(e.request.url,{cache:'no-cache'}).catch(()=>{}));e.respondWith(net.then(r=>{if(r&&r.status===200){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));}return r;}).catch(()=>caches.match(e.request).then(m=>m||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));});