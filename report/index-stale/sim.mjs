// What the real sw.js does with a navigation, today and under the two
// candidate changes in report/index-stale.md, against three kinds of engine.
//
//   node report/index-stale/sim.mjs
//
// Not a tools-check and not a test of Safari: a model of the fetch handler's
// own control flow. It proves one thing — which of the handler's paths a
// navigation takes when the revalidating fetch succeeds, rejects, or throws —
// and nothing about what WebKit does, which the report cites from source.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SW = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
const ORIGIN = 'https://lyttlebeast.github.io';
const NAV = ORIGIN + '/lift-cal/index.html';

// A: navigations take the revalidating leg too (one condition removed).
const A = SW.replace("&&e.request.mode!=='navigate'", '');
// B: the navigation path untouched; a background revalidation of the same URL
// refreshes the HTTP cache for the next launch, and its failure is swallowed.
const B = SW.replace("e.respondWith(net.then(", "if(e.request.mode==='navigate'&&u.origin===self.location.origin)e.waitUntil(fetch(e.request.url,{cache:'no-cache'}).catch(()=>{}));e.respondWith(net.then(");
if (A === SW || B === SW) throw new Error('sim: sw.js no longer has the text the candidates patch');

// Engines. `spec`: a navigate Request with a non-empty init is downgraded to
// same-origin (Fetch, and WebKit since r225796). `rejects`: it is refused
// with a TypeError, as Chrome < 68 and pre-Dec-2017 WebKit did — fetch()
// reports that as a rejected promise. `throws`: a hypothetical engine that
// throws synchronously out of fetch(), which WebIDL does not allow.
function engine(kind, net) {
  return (req, init) => {
    const r = typeof req === 'string' ? { url: req, mode: 'cors' } : req;
    const nonEmpty = init && Object.keys(init).length > 0;
    if (r.mode === 'navigate' && nonEmpty && kind !== 'spec') {
      if (kind === 'throws') throw new TypeError('Cannot construct a Request with a navigate Request and a non-empty init');
      return Promise.reject(new TypeError('Cannot construct a Request with a navigate Request and a non-empty init'));
    }
    net.calls.push((init && init.cache) || 'default');
    if (!net.up) return Promise.reject(new TypeError('Load failed'));
    const fresh = init && init.cache === 'no-cache';
    return Promise.resolve({ status: 200, type: 'basic', body: fresh ? 'NEW' : net.httpCache, clone() { return { ...this }; } });
  };
}

async function launch(src, kind, { up = true, cached = null, httpCache = 'OLD' } = {}) {
  const net = { up, calls: [], httpCache };
  const store = new Map(cached ? [[NAV, cached]] : []);
  const caches = {
    open: async () => ({ put: async (req, res) => store.set(req.url || req, res) }),
    keys: async () => [], delete: async () => true,
    match: async req => { const k = typeof req === 'string' ? ORIGIN + '/lift-cal/' + req.replace('./', '') : req.url; return store.get(k); }
  };
  let handler;
  const self = { location: { origin: ORIGIN }, addEventListener: (t, f) => { if (t === 'fetch') handler = f; }, skipWaiting() {}, clients: { claim: async () => {} } };
  vm.runInContext(src, vm.createContext({ self, caches, fetch: engine(kind, net), URL, Response: { error: () => ({ type: 'error' }) }, Promise }));
  let responded = null, waited = [];
  const ev = { request: { url: NAV, method: 'GET', mode: 'navigate' }, respondWith: p => { responded = p; }, waitUntil: p => waited.push(p) };
  let threw = null;
  try { handler(ev); } catch (e) { threw = e.message; }
  if (threw) return { outcome: 'handler threw before respondWith → the browser loads the page itself, as if there were no worker', calls: net.calls };
  const res = await responded; await Promise.all(waited);
  return { outcome: res === undefined ? 'NOTHING — the navigation fails (blank)' : res.type === 'error' ? 'network error (blank)' : 'page served: ' + res.body, calls: net.calls };
}

const rows = [];
for (const [name, src] of [['v46 (today)', SW], ['A: navigations revalidate', A], ['B: background revalidation', B]]) {
  for (const kind of ['spec', 'rejects', 'throws']) {
    const online = await launch(src, kind);
    const off = await launch(src, kind, { up: false });                 // first launch after a bump, offline
    const offCached = await launch(src, kind, { up: false, cached: { status: 200, type: 'basic', body: 'CACHED' } });
    rows.push([name, kind, online.outcome + '  [' + online.calls.join(', ') + ']', off.outcome, offCached.outcome]);
  }
}
for (const [name, kind, on, off, offC] of rows) {
  console.log(`\n${name} · engine ${kind}\n  online:                      ${on}\n  offline, cache just emptied: ${off}\n  offline, index.html cached:  ${offC}`);
}
