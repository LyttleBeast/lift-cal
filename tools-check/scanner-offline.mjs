#!/usr/bin/env node
//
// Verifier for the barcode scanner working offline.
//
//   node tools-check/scanner-offline.mjs
//
// THE BUG IT CLOSES (BACKLOG, v44). food.js loads ZXing — the only barcode
// scanner an iPhone has, because Safari has no BarcodeDetector — with a
// <script> tag. A <script> with no `crossorigin` attribute is a no-cors
// request, its response is OPAQUE with status 0, and sw.js stores a response
// only when `r.status === 200`. So ZXing was never in Cache Storage, and the
// scanner has never opened offline on an iPhone.
//
// THE FIX: `s.crossOrigin = 'anonymous'`. The request is CORS-mode, jsDelivr
// answers with `access-control-allow-origin: *`, the response is an ordinary
// status-200 `cors` response, and the guard sw.js already has stores it.
// sw.js itself is not changed.
//
// What this file proves:
//   A. the real loadZXing, lifted out of food.js, builds a script element
//      with crossOrigin set — and so, by the HTML rule, a CORS-mode request.
//   B. the real sw.js fetch handler, run in a vm against a Cache Storage fake
//      that refuses what the real Cache.put refuses, stores that response and
//      serves it back offline. And, for contrast, does NOT store the opaque
//      answer the old tag got.
//   C. a version bump empties it with everything else, so the first online
//      Fuel visit after a ship is what puts it back.
//
// There is no browser here, so two things are restated rather than driven:
// the HTML rule mapping the attribute to a request mode (A), and jsDelivr's
// response headers (B), which were read off the real CDN on 23 Sep 2026:
//
//   HTTP/2 200 · access-control-allow-origin: * · vary: Accept-Encoding ·
//   cache-control: public, max-age=31536000, s-maxage=31536000, immutable ·
//   cross-origin-resource-policy: cross-origin
//
// What neither can prove is WebKit doing the same with a real phone in
// airplane mode. That is the walkthrough's job, and why this change wants it.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC  = p => join(HERE, '..', p);
const FOOD = readFileSync(SRC('food.js'), 'utf8');
const SW   = readFileSync(SRC('sw.js'), 'utf8');
const ORIGIN = 'https://lyttlebeast.github.io';
const ZX_URL = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js';

let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const tick = () => new Promise(r => setTimeout(r, 0));

/* ================= A. THE TAG ================= */
section('A. loadZXing builds a CORS-mode script request');
let tag = null;
{
  const m = /^let zxingPromise = null;\nfunction loadZXing\(\) \{[\s\S]*?\n\}\n/m.exec(FOOD);
  check('loadZXing is where this file expects it in food.js', !!m);
  const made = [];
  const fakeDoc = {
    createElement: t => { const n = { tagName: t.toUpperCase(), crossOrigin: null, src: '' }; made.push(n); return n; },
    head: { appendChild: n => { setTimeout(() => n.onload && n.onload(), 0); return n; } }
  };
  const fakeWin = { ZXingBrowser: { marker: 'zxing' } };
  const loadZXing = m ? new Function('document', 'window', m[0] + '\nreturn loadZXing;')(fakeDoc, fakeWin) : null;
  const got = loadZXing ? await loadZXing() : null;
  tag = made[0] || null;
  check('it makes one script element and resolves with window.ZXingBrowser when it loads',
        made.length === 1 && tag.tagName === 'SCRIPT' && got === fakeWin.ZXingBrowser);
  check('pointed at jsDelivr, at a pinned version', tag && tag.src === ZX_URL, tag && tag.src);
  check('with crossOrigin = "anonymous"', tag && tag.crossOrigin === 'anonymous', tag && String(tag.crossOrigin));
  const setAt = m ? m[0].indexOf("s.crossOrigin = 'anonymous'") : -1, srcAt = m ? m[0].indexOf('s.src =') : -1;
  check('set before src and before the element is inserted — the request is made on insertion',
        setAt > -1 && srcAt > setAt && m[0].indexOf('appendChild') > srcAt);
  // A second call reuses the first load; a failed load clears it so the next
  // scan tries again. Unchanged, asserted so the lift is known to be the real one.
  check('a second call reuses the same load', loadZXing && (await loadZXing()) === got && made.length === 1);
}
// The HTML rule (script element, "fetch a classic script"): the crossorigin
// attribute's state is the request's CORS setting. No attribute → "No CORS" →
// mode no-cors. "anonymous" (or the empty string) → mode cors, credentials
// same-origin. Restated because there is no HTML engine here.
const modeOf = el => (el && el.crossOrigin != null && el.crossOrigin !== false) ? 'cors' : 'no-cors';
const NEW_MODE = modeOf(tag);
const OLD_MODE = modeOf({ crossOrigin: null });
check('so the request is CORS-mode now, where the old tag\'s was no-cors', NEW_MODE === 'cors' && OLD_MODE === 'no-cors');

/* ================= B. THE SERVICE WORKER ================= */
section('B. the real sw.js stores a 200 CORS response for that URL and serves it offline');

/* Cache Storage, with the refusals the real Cache.put makes (Service Workers
   spec, Cache.put): a non-GET request, a 206, and a Vary header containing
   '*' all throw. Matching is by URL minus fragment, then the stored request's
   Vary headers compared — jsDelivr varies on Accept-Encoding, which a service
   worker's Request never carries (the network layer adds it), so both sides
   are null and it matches, as it does in a browser. */
function cacheStorage() {
  const stores = new Map();
  const key = u => String(u).split('#')[0];
  const mk = name => {
    const rows = new Map();
    return {
      rows,
      async put(req, res) {
        if (req.method !== 'GET') throw new TypeError('put: not GET');
        if (res.status === 206) throw new TypeError('put: 206');
        const vary = (res.headers && res.headers.get && res.headers.get('vary')) || '';
        if (vary.split(',').some(v => v.trim() === '*')) throw new TypeError('put: Vary *');
        rows.set(key(req.url), { req, res });
      },
      async match(req) {
        const row = rows.get(key(req.url || req));
        if (!row) return undefined;
        const vary = (row.res.headers && row.res.headers.get && row.res.headers.get('vary')) || '';
        for (const h of vary.split(',').map(s => s.trim()).filter(Boolean)) {
          const a = row.req.headers ? row.req.headers.get(h) : null, b = req.headers ? req.headers.get(h) : null;
          if (a !== b) return undefined;
        }
        return row.res;
      }
    };
  };
  return {
    stores,
    async open(n) { if (!stores.has(n)) stores.set(n, mk(n)); return stores.get(n); },
    async keys() { return [...stores.keys()]; },
    async delete(n) { return stores.delete(n); },
    async match(req) { for (const s of stores.values()) { const r = await s.match(req); if (r) return r; } return undefined; }
  };
}

// jsDelivr's answer to a CORS request: a real Response, status 200, with the
// headers the CDN sent. A fetch() in cors mode that succeeds has type 'cors';
// Node's Response constructor cannot set that, so it is stamped on.
const corsAnswer = () => {
  const r = new Response('/* zxing */', { status: 200, headers: {
    'access-control-allow-origin': '*', 'vary': 'Accept-Encoding', 'content-type': 'application/javascript; charset=utf-8',
    'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable' } });
  Object.defineProperty(r, 'type', { value: 'cors' });
  const clone = r.clone.bind(r);
  r.clone = () => { const c = clone(); Object.defineProperty(c, 'type', { value: 'cors' }); return c; };
  return r;
};
// And to the old no-cors request: opaque, status 0, no readable headers.
const opaqueAnswer = () => ({ type: 'opaque', status: 0, ok: false, headers: new Headers(), clone() { return opaqueAnswer(); } });

function bootSW(source, caches, net) {
  const listeners = {};
  const calls = [];
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (t, fn) => { listeners[t] = fn; },
    skipWaiting: () => {}, clients: { claim: async () => {} }
  };
  const ctx = vm.createContext({
    self, caches, URL, Response, Headers, Promise, console,
    fetch: (req, init) => { calls.push({ req, init }); return net.up ? Promise.resolve(net.answer(req)) : Promise.reject(new TypeError('Load failed')); }
  });
  vm.runInContext(source, ctx);
  const fetchEvent = async req => {
    let p = null;
    listeners.fetch({ request: req, respondWith: x => { p = x; } });
    const out = p ? await p : undefined;
    await tick(); await tick();       // the put is fire-and-forget after open()
    return { handled: !!p, res: out };
  };
  const activate = async () => { let p; listeners.activate({ waitUntil: x => { p = x; } }); await p; };
  return { fetchEvent, activate, calls, listeners };
}
const CACHE = (/const CACHE='([^']+)'/.exec(SW) || [])[1];
check('sw.js names its cache', !!CACHE, CACHE);

{
  const caches = cacheStorage();
  const net = { up: true, answer: req => (req.mode === 'cors' ? corsAnswer() : opaqueAnswer()) };
  const sw = bootSW(SW, caches, net);
  await sw.activate();

  // The new tag's request.
  const req = new Request(ZX_URL, { mode: NEW_MODE, credentials: 'same-origin' });
  const on = await sw.fetchEvent(req);
  check('online: the handler answers the request, and the page gets the 200 CORS response',
        on.handled && on.res && on.res.status === 200 && on.res.type === 'cors');
  const call = sw.calls[sw.calls.length - 1];
  check('cross-origin, so it takes the plain leg: fetch(request) with no init — the request keeps its cors mode',
        call && call.req === req && call.init === undefined && call.req.mode === 'cors');
  const store = caches.stores.get(CACHE);
  const row = store && store.rows.get(ZX_URL);
  check('and ZXing is now in Cache Storage, under ' + CACHE, !!row && row.res.status === 200, store ? [...store.rows.keys()].join(', ') : 'no cache');

  // Airplane mode.
  net.up = false;
  const off = await sw.fetchEvent(new Request(ZX_URL, { mode: NEW_MODE, credentials: 'same-origin' }));
  check('offline: the same request is answered from the cache — status 200, type cors, the script body',
        off.res && off.res.status === 200 && off.res.type === 'cors' && (await off.res.text()) === '/* zxing */');
}
{
  // The old tag, for contrast — what every iPhone scan got until now.
  const caches = cacheStorage();
  const net = { up: true, answer: () => opaqueAnswer() };
  const sw = bootSW(SW, caches, net);
  await sw.activate();
  const on = await sw.fetchEvent(new Request(ZX_URL, { mode: OLD_MODE }));
  check('the old no-cors request: online it got an opaque answer (status 0), which runs as a script but…',
        on.res && on.res.type === 'opaque' && on.res.status === 0);
  const store = caches.stores.get(CACHE);
  check('…the status-200 guard never stored it', !store || store.rows.size === 0);
  net.up = false;
  const off = await sw.fetchEvent(new Request(ZX_URL, { mode: OLD_MODE }));
  check('so offline there was nothing to serve: Response.error(), and the scanner\'s "failed to load"',
        off.res && off.res.type === 'error');
  check('which is the message the scanner shows for it — still wired',
        /err\.message === 'scanner load failed'/.test(FOOD) && /Scanner failed to load/.test(FOOD));
}
{
  // Not stored when it should not be: a CDN error is not cached as the script.
  const caches = cacheStorage();
  const net = { up: true, answer: () => { const r = new Response('nope', { status: 503 }); Object.defineProperty(r, 'type', { value: 'cors' }); return r; } };
  const sw = bootSW(SW, caches, net);
  await sw.activate();
  await sw.fetchEvent(new Request(ZX_URL, { mode: 'cors' }));
  const store = caches.stores.get(CACHE);
  check('a 503 from the CDN is passed through and not stored — the guard is unchanged', !store || store.rows.size === 0);
}

/* ================= C. A SHIP EMPTIES IT ================= */
section('C. a version bump deletes it with everything else, and the next online visit puts it back');
{
  const caches = cacheStorage();
  const net = { up: true, answer: () => corsAnswer() };
  const old = bootSW(SW, caches, net);
  await old.activate();
  await old.fetchEvent(new Request(ZX_URL, { mode: 'cors' }));
  check('cached under the current build', !!(caches.stores.get(CACHE) && caches.stores.get(CACHE).rows.has(ZX_URL)));
  const NEXT = CACHE + '-next';
  const bumped = bootSW(SW.replace("const CACHE='" + CACHE + "'", "const CACHE='" + NEXT + "'"), caches, net);
  await bumped.activate();
  check('activate on the next build deletes the old cache, ZXing with it', !caches.stores.has(CACHE));
  net.up = false;
  const off = await bumped.fetchEvent(new Request(ZX_URL, { mode: 'cors' }));
  check('so offline right after a ship, before any online Fuel visit, the scanner still cannot load',
        off.res && off.res.type === 'error');
  net.up = true;
  await bumped.fetchEvent(new Request(ZX_URL, { mode: 'cors' }));
  check('one online load — warmScanner does it four seconds into Fuel — and it is cached again',
        !!(caches.stores.get(NEXT) && caches.stores.get(NEXT).rows.has(ZX_URL)));
  check('warmScanner is still what fetches it while Fuel is idle, on phones with no native detector',
        /function warmScanner\(\)[\s\S]{0,300}if \(!det\) loadZXing\(\)/.test(FOOD));
}

/* ---------- report ---------- */
console.log('\nthe scanner, offline\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
