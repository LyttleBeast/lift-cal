// The staging rig the P5 verifiers share (rack-v64).
//
// It is maintenance.mjs's pattern, written once instead of thirty times: the
// modules whose real code is under test are copied into a temp dir with their
// relative imports repointed at each other; everything else they import
// becomes one generated stub whose export list is read out of the import
// statements, so a new import does not break a verifier with "does not
// provide an export named". No rule of the app is copied in here.
//
// Two things maintenance.mjs does not need and these verifiers do:
//
//   - a clock. `setNow()` moves Date.now() and `new Date()` for every staged
//     module (and the verifier), so "five days later at 00:01" is a line of
//     code, not a wait. The real Date is `RealDate`.
//   - a database. store.js is not under test in any of them, so unless a
//     verifier lists it as real it is replaced by a small fake with the same
//     export names: read / readExact / write / watch over an in-memory map
//     (`db`), every write logged (`writes`), and a switch that makes writes
//     throw (`refuse`). Its todayKey() is store.js's own, lifted by text, so
//     date keys are the app's and not a copy.
//
// The temp dir is created by stage() and removed by cleanup(), which every
// verifier calls before it exits.

import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
export const SRC = p => join(HERE, '..', '..', p);
export const readSrc = p => readFileSync(SRC(p), 'utf8');

/* ---------- the fake browser ---------- */
const cells = new Map();
globalThis.localStorage = {
  getItem: k => (cells.has(k) ? cells.get(k) : null),
  setItem: (k, v) => cells.set(k, String(v)),
  removeItem: k => cells.delete(k),
  key: i => Array.from(cells.keys())[i] ?? null,
  get length() { return cells.size; }
};
globalThis.window = globalThis.window || { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
globalThis.document = globalThis.document || {
  body: null, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } }),
  addEventListener() {}, documentElement: { style: {}, setAttribute() {}, dataset: {} }
};
try {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true, userAgent: 'node' }, configurable: true, writable: true });
} catch { /* Node may own it */ }

/* ---------- the clock ---------- */
export const RealDate = Date;
let NOW = RealDate.now();
class FakeDate extends RealDate {
  constructor(...a) { if (a.length === 0) super(NOW); else super(...a); }
  static now() { return NOW; }
}
globalThis.Date = FakeDate;
export function setNow(ms) { NOW = typeof ms === 'number' ? ms : new RealDate(ms).getTime(); }
export function getNow() { return NOW; }
// Local wall-clock time in whatever TZ the verifier runs under.
export function at(y, m, d, h = 7, min = 0) { return new RealDate(y, m - 1, d, h, min).getTime(); }
export const DAY = 864e5, HOUR = 36e5;

/* ---------- the database ---------- */
export const fake = globalThis.__rack = globalThis.__rack || {
  db: new Map(), writes: [], refuse: false, watches: new Map(), reads: [], delay: null
};
export function resetDb(entries = {}) {
  fake.db.clear(); fake.writes.length = 0; fake.reads.length = 0; fake.refuse = false; fake.watches.clear();
  for (const [k, v] of Object.entries(entries)) fake.db.set(k, v);
}

const STORE_TEXT = readSrc('store.js');
const TODAYKEY = (STORE_TEXT.match(/export function todayKey\(d = new Date\(\)\) \{\n[^\n]*\n\}/) || [])[0];
if (!TODAYKEY) throw new Error('stage.mjs: could not lift todayKey out of store.js');

const FAKE_STORE_BODY = `
const F = globalThis.__rack;
const copy = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
export async function read(path, fallback = null) {
  F.reads.push(path);
  if (F.delay) await new Promise(r => setTimeout(r, F.delay(path)));
  return F.db.has(path) ? copy(F.db.get(path)) : fallback;
}
export async function readExact(path) {
  F.reads.push(path);
  if (F.readExactThrows) throw new Error('offline');
  return F.db.has(path) ? copy(F.db.get(path)) : null;
}
export async function write(path, value) {
  if (F.refuse) throw new Error('PERMISSION_DENIED');
  F.writes.push({ path, value: copy(value) });
  F.db.set(path, copy(value));
  const cb = F.watches.get(path); if (cb) cb(copy(value));
}
export async function mergeUpdate(path, obj) {
  if (F.refuse) throw new Error('PERMISSION_DENIED');
  F.writes.push({ path, value: copy(obj), merge: true });
  F.db.set(path, { ...(F.db.get(path) || {}), ...copy(obj) });
}
export function watch(path, cb) { F.watches.set(path, cb); return () => F.watches.delete(path); }
export const LS = {
  get(k, fallback) { const v = globalThis.localStorage.getItem('ls:' + k); return v ? JSON.parse(v) : fallback; },
  set(k, v) { globalThis.localStorage.setItem('ls:' + k, JSON.stringify(v)); },
  del(k) { globalThis.localStorage.removeItem('ls:' + k); }
};
export function uid() { return 'u1'; }
export function isOwner() { return false; }
export function wu() { return F.wu || 'lb'; }
export function hu() { return 'in'; }
export function units() { return { weight: F.wu || 'lb', height: 'in' }; }
export function onChange() { return () => {}; }
export const online = { value: true };
`;

const IMPORT_RE = /\bfrom\s+(['"])([^'"]+)\1/g;
const NAMED_RE  = /\bimport\s*\{([^}]*)\}\s*from\s+(['"])([^'"]+)\2/g;
const DECLARED_RE = /export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;

// `real`: repo paths whose code is under test. `store.js` in the list means the
// real one; otherwise the fake above stands in for it.
export function stage(real) {
  const REAL = [...new Set(real)];
  const sources = new Map(REAL.map(f => [f, readSrc(f)]));
  const fromStore = new Set(), stubbed = new Set();
  for (const text of sources.values()) {
    let m; NAMED_RE.lastIndex = 0;
    while ((m = NAMED_RE.exec(text))) {
      const spec = m[3], base = spec.startsWith('./') ? spec.slice(2) : null;
      if (base && REAL.includes(base)) continue;
      for (const raw of m[1].split(',')) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (!name) continue;
        (base === 'store.js' ? fromStore : stubbed).add(name);
      }
    }
  }
  const dir = mkdtempSync(join(tmpdir(), 'rack-p5-'));
  writeFileSync(join(dir, 'stub.mjs'), [...stubbed].map(n => `export function ${n}() {}`).join('\n') + '\n');
  if (!REAL.includes('store.js')) {
    const have = new Set(['todayKey']); let d; DECLARED_RE.lastIndex = 0;
    while ((d = DECLARED_RE.exec(FAKE_STORE_BODY))) have.add(d[1]);
    const extra = [...fromStore].filter(n => !have.has(n)).map(n => `export function ${n}() {}`).join('\n');
    writeFileSync(join(dir, 'store.mjs'), FAKE_STORE_BODY + '\n' + TODAYKEY + '\n' + extra + '\n');
  }
  const repoint = text => text.replace(IMPORT_RE, (whole, q, spec) => {
    const base = spec.startsWith('./') ? spec.slice(2) : null;
    if (base && (REAL.includes(base) || base === 'store.js')) return `from './${base.replace(/\.js$/, '.mjs')}'`;
    return `from './stub.mjs'`;
  });
  for (const [file, text] of sources) writeFileSync(join(dir, file.replace(/\.js$/, '.mjs')), repoint(text));
  return {
    dir,
    load: f => import(pathToFileURL(join(dir, f.replace(/\.js$/, '.mjs'))).href),
    cleanup: () => rmSync(dir, { recursive: true, force: true })
  };
}

// The same staging, with some files taken from an older commit instead of the
// working tree (the "before" a verifier compares against).
export function stageAt(rev, real, fromRev) {
  const s = stage(real);
  for (const f of fromRev) {
    const text = execFileSync('git', ['show', rev + ':' + f], { cwd: SRC('.'), encoding: 'utf8', maxBuffer: 1 << 26 });
    writeFileSync(join(s.dir, f.replace(/\.js$/, '.mjs')),
      text.replace(IMPORT_RE, (whole, q, spec) => {
        const base = spec.startsWith('./') ? spec.slice(2) : null;
        if (base && (real.includes(base) || base === 'store.js')) return `from './${base.replace(/\.js$/, '.mjs')}'`;
        return `from './stub.mjs'`;
      }));
  }
  return s;
}

/* ---------- the harness ---------- */
export function harness(title) {
  let pass = 0, fail = 0; const lines = [];
  const check = (name, ok, detail) => {
    if (ok) { pass++; lines.push('  ok   ' + name); }
    else { fail++; lines.push('  FAIL ' + name + (detail !== undefined ? '  — ' + detail : '')); }
  };
  const section = s => lines.push('\n' + s);
  const done = (...cleanups) => {
    for (const c of cleanups) { try { c(); } catch { /* best effort */ } }
    console.log('\n' + title + '\n');
    console.log(lines.join('\n'));
    console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
    process.exit(fail ? 1 : 0);
  };
  return { check, section, done };
}
export const J = v => JSON.stringify(v);

/* ---------- weigh-in fixtures ---------- */
// One weigh-in per day at `hour` local time, for `n` days ending on (y,m,d).
export function dailyWeighIns(y, m, d, n, lbAt, hour = 7) {
  const o = {};
  for (let i = n - 1; i >= 0; i--) {
    const t = new RealDate(y, m - 1, d - i, hour, 0).getTime();
    o['w' + (n - 1 - i)] = { lb: typeof lbAt === 'function' ? lbAt(n - 1 - i, t) : lbAt, t };
  }
  return o;
}
// Day summaries {key: {cal}} for the `n` days BEFORE (y,m,d), keyed by the
// app's own todayKey.
export function summariesBefore(todayKey, y, m, d, n, calAt) {
  const o = {};
  for (let i = 1; i <= n; i++) {
    const k = todayKey(new RealDate(y, m - 1, d - i, 12));
    o[k] = { cal: typeof calAt === 'function' ? calAt(i, k) : calAt };
  }
  return o;
}
