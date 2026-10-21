#!/usr/bin/env node
//
// Verifier for sw.js's navigation handling (v68).
//
//   node tools-check/sw-navigate.mjs
//
// THE WINDOW. GitHub Pages serves index.html with max-age=600, and sw.js
// answers a navigation with a plain fetch() (v44 kept navigations off the
// revalidating leg on purpose), so for up to ten minutes after a ship a launch
// can be handed the previous index.html out of the browser's HTTP cache.
// report/index-stale.md (v47) worked out the candidates and recommended B:
// leave the navigation's own fetch exactly as it is, and beside it send a
// background conditional request for the same URL, so the browser's cache is
// fresh for the NEXT launch.
//
// What this holds, against the REAL sw.js run in a vm:
//   A  sw.js is rack-v67's sw.js plus the one B line and its comment — no
//      other byte of the handler moved (the CACHE name aside)
//   B  a navigation is answered exactly as before, online and offline, on an
//      engine that follows the spec, one that rejects a rebuilt navigation,
//      and one that throws (the report's three) — B never changes what a
//      launch receives
//   C  the background request goes out, for the navigation's URL string
//      (never the Request, so it is never rebuilt), as a conditional
//      `no-cache` request; its failure is swallowed; it is only for
//      navigations of this origin; and it is held with waitUntil
//   D  a non-navigation request is untouched: no extra fetch

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const ROOT = new URL('..', import.meta.url);
const SW = readFileSync(new URL('sw.js', ROOT), 'utf8');
const OLD = execFileSync('git', ['show', '82fd37d:sw.js'], { cwd: ROOT.pathname, encoding: 'utf8' });
const ORIGIN = 'https://lyttlebeast.github.io';
const NAV = ORIGIN + '/lift-cal/index.html';
const B_LINE = "if(e.request.mode==='navigate'&&u.origin===self.location.origin)e.waitUntil(fetch(e.request.url,{cache:'no-cache'}).catch(()=>{}));";

let pass = 0, fail = 0; const out = [];
const check = (l, c, d) => { if (c) { pass++; out.push('  ✓ ' + l); } else { fail++; out.push('  ✗ ' + l + (d ? '  — ' + d : '')); } };
const section = t => out.push('\n' + t);

section('A. sw.js is rack-v67\'s plus the one background line');
{
  const code = t => t.split('\n').filter(l => !l.startsWith('//')).join('\n').replace(/const CACHE='rack-v\d+'/, "const CACHE='X'");
  check('the B line is in the handler, once, just before respondWith', SW.split(B_LINE + 'e.respondWith(net.then(').length === 2);
  check('and removing it gives back v67\'s handler byte for byte', code(SW).replace(B_LINE, '') === code(OLD));
  check('v67\'s comment block is kept, and v68 says why above the code', SW.includes(OLD.split('\n').filter(l => l.startsWith('//')).join('\n')) && /index\.html's ten-minute window/.test(SW));
}

function engine(kind, net) {
  return (req, init) => {
    const r = typeof req === 'string' ? { url: req, mode: 'cors', str: true } : req;
    const nonEmpty = init && Object.keys(init).length > 0;
    net.seen.push({ str: !!r.str, url: r.url, mode: r.mode, cache: (init && init.cache) || 'default' });
    if (r.mode === 'navigate' && nonEmpty && kind !== 'spec') {
      if (kind === 'throws') throw new TypeError('navigate + init');
      return Promise.reject(new TypeError('navigate + init'));
    }
    if (!net.up) return Promise.reject(new TypeError('Load failed'));
    const fresh = init && init.cache === 'no-cache';
    if (fresh && r.str) net.httpCache = 'NEW';      // the background request refreshes the HTTP cache
    return Promise.resolve({ status: 200, type: 'basic', body: fresh ? 'NEW' : net.httpCache, clone() { return { ...this }; } });
  };
}
async function launch(src, kind, net, { cached = null, url = NAV, mode = 'navigate' } = {}) {
  const store = new Map(cached ? [[NAV, cached]] : []);
  const caches = { open: async () => ({ put: async (q, s) => store.set(q.url || q, s) }), keys: async () => [], delete: async () => true,
    match: async q => store.get(typeof q === 'string' ? ORIGIN + '/lift-cal/' + q.replace('./', '') : q.url) };
  let handler;
  const self = { location: { origin: ORIGIN }, addEventListener: (t, f) => { if (t === 'fetch') handler = f; }, skipWaiting() {}, clients: { claim: async () => {} } };
  vm.runInContext(src, vm.createContext({ self, caches, fetch: engine(kind, net), URL, Response: { error: () => ({ type: 'error' }) }, Promise }));
  let responded, waited = [], threw = null;
  const ev = { request: { url, method: 'GET', mode }, respondWith: p => { responded = p; }, waitUntil: p => waited.push(p) };
  try { handler(ev); } catch (e) { threw = e.message; }
  if (threw) return { threw: true, waited: waited.length };
  let res, waitErr = null;
  try { res = await responded; } catch { res = undefined; }
  try { await Promise.all(waited); } catch (e) { waitErr = e; }
  return { body: res === undefined ? 'NOTHING' : res.type === 'error' ? 'ERROR' : res.body, waited: waited.length, waitErr };
}

section('B. what a navigation receives is exactly what v67 gave it');
for (const kind of ['spec', 'rejects', 'throws']) {
  for (const [label, up, cached] of [['online', true, null], ['offline, cache emptied by a bump', false, null], ['offline, index.html cached', false, { status: 200, type: 'basic', body: 'CACHED' }]]) {
    const a = await launch(OLD, kind, { up, seen: [], httpCache: 'OLD' }, { cached });
    const b = await launch(SW, kind, { up, seen: [], httpCache: 'OLD' }, { cached });
    check(`${kind} engine, ${label}: v68 serves ${b.body}, as v67 did`, a.body === b.body && !b.threw, a.body + ' vs ' + b.body);
  }
}

section('C. the background request, and what it buys the next launch');
{
  const net = { up: true, seen: [], httpCache: 'OLD' };
  const first = await launch(SW, 'spec', net);
  const bg = net.seen.filter(x => x.str);
  check('the first launch after a ship is still served the old index.html (B cannot change that one)', first.body === 'OLD');
  check('one background request, for the URL string — never the navigation Request, so it is never rebuilt', bg.length === 1 && bg[0].url === NAV && bg[0].mode === 'cors');
  check('conditional (no-cache): a 304 when nothing changed, given Pages\' ETag', bg[0].cache === 'no-cache');
  check('held open with waitUntil, so the worker is not stopped under it', first.waited === 1);
  const second = await launch(SW, 'spec', net);
  check('so the second launch gets the new index.html — the ten minutes become one launch', second.body === 'NEW');
  const off = await launch(SW, 'spec', { up: false, seen: [], httpCache: 'OLD' });
  check('offline, its failure is swallowed — nothing rejects the event', off.waitErr === null && off.waited === 1);
  const elsewhere = await launch(SW, 'spec', { up: true, seen: [], httpCache: 'OLD' }, { url: 'https://example.com/x', mode: 'navigate' });
  check('a navigation to another origin gets no background request', elsewhere.waited === 0);
}

section('D. every other request is untouched');
{
  const net = { up: true, seen: [], httpCache: 'OLD' };
  const r = await launch(SW, 'spec', net, { url: ORIGIN + '/lift-cal/app.js', mode: 'cors' });
  check('a module fetch: one request, the revalidating one, and no waitUntil', net.seen.length === 1 && net.seen[0].cache === 'no-cache' && r.waited === 0 && r.body === 'NEW');
}

console.log('\nsw.js: a navigation, and the background refresh beside it\n');
console.log(out.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
