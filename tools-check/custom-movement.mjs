#!/usr/bin/env node
//
// Verifier for a custom exercise's movement (v56).
//
//   node tools-check/custom-movement.mjs
//
// SHIP-V56-PROMPT §3. Micah logs a real share of his training on custom
// exercises, and coach-tags.js gives them no tags, so the balance split could
// not see them. Now he can tell Coach the movement: an optional Movement in
// the custom exercise's editor, stored on the exercise itself as
// exercises/custom[i].pattern and .angle. What has to hold:
//
//   THE VOCABULARY IS CLOSED (A).  A pattern from coach-tags.js's PATTERNS
//        that its agreement table allows on the exercise's own group, and an
//        angle only where the table tags that pattern with one. Anything else
//        is no movement at all. A built-in's tags are pinned: no row of his
//        can change one.
//   THE EDITOR WRITES ONLY WHAT IS VALID (B).  "Not set" by default; the
//        chips are the group's patterns and nothing else; a group that does
//        not take the chosen movement sets it back; "Not set" removes both
//        keys; a new exercise with none is today's shape exactly.
//   THE WHOLE-ARRAY WRITE (C).  exercises/custom is written whole, as it
//        always was: every other custom exercise goes out byte for byte, the
//        destructive-write guard passes an edit and refuses a partial list,
//        and a refusal — the guard's or the database's — leaves the server
//        untouched and this device holding what the database holds.
//   COACH READS IT (D).  A custom exercise with a movement moves from "N sets
//        on your custom exercises aren't in this split" into the ratio, and
//        out of the customs' share of its group; the line that says where to
//        set it is said once in 28 days. The builder and the picker suggest
//        exactly what they did.
//
// v57 (SHIP-V57-PROMPT §A): on shoulders the fly chip reads "Rear-delt fly"
// and is stored as the fly it always was (B), and Coach counts it as pulling
// (D). Every v56 check here is held.
//
// NO COPY OF ANY RULE LIVES HERE. picker.js is driven for real through a DOM
// shim, against the REAL store.js over a Firebase stub (destructive-write.mjs
// and refused-write.mjs's rig); coach-tags.js is imported as it is; coach.js
// and coach-volume.js are staged and driven; coach-data.js's libIndex() is
// lifted out of its source and run.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const J = v => JSON.stringify(v);

/* ================= THE FAKE BROWSER ================= */
const ls = new Map();
globalThis.localStorage = {
  getItem: k => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: k => ls.delete(k),
  key: i => Array.from(ls.keys())[i] ?? null,
  get length() { return ls.size; }
};
globalThis.window = { addEventListener() {} };
try { Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true }); } catch {}

const byId = new Map();
function walk(n, out = []) { n.children.forEach(c => { out.push(c); walk(c, out); }); return out; }
function mkEl(tag) {
  const n = {
    tag: String(tag || 'div').toLowerCase(), id: '', className: '', textContent: '', value: '', placeholder: '', type: '', title: '',
    children: [], parent: null, attrs: {}, style: { cssText: '' }, dataset: {}, disabled: false,
    onclick: null, oninput: null, onchange: null,
    classList: {
      add(...cs) { cs.forEach(c => { if (!n.classList.contains(c)) n.className = (n.className + ' ' + c).trim(); }); },
      remove(...cs) { n.className = n.className.split(' ').filter(x => x && !cs.includes(x)).join(' '); },
      contains: c => n.className.split(' ').includes(c)
    },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; },
    appendChild(c) { if (c.parent) c.remove(); c.parent = n; n.children.push(c); if (c.id) byId.set(c.id, c); return c; },
    append(...cs) { cs.forEach(c => n.appendChild(c)); },
    remove() { if (n.parent) n.parent.children = n.parent.children.filter(x => x !== n); n.parent = null; if (n.id) byId.delete(n.id); },
    querySelectorAll(sel) { return walk(n).filter(x => x.classList.contains(sel.replace(/^\./, ''))); },
    focus() {}, select() {}
  };
  // innerHTML = '' empties an element, which every paint() here leans on.
  Object.defineProperty(n, 'innerHTML', { get: () => '', set: () => { n.children.forEach(c => { c.parent = null; }); n.children = []; } });
  return n;
}
const body = mkEl('body');
globalThis.document = {
  body,
  createElement: t => mkEl(t), createElementNS: (_ns, t) => mkEl(t),
  getElementById: id => byId.get(id) || null,
  querySelector: sel => walk(body).find(x => x.classList.contains(sel.replace(/^\./, ''))) || null
};

/* ================= THE FAKE DATABASE =================
   refused-write.mjs's: a map of full paths, and `fail` for a refusal. */
const server = new Map();
let setLog = [], fail = null;
const STUB = `
export const firebaseConfig = {};
export const OWNER_UID = 'owner-uid';
export function initializeApp() { return {}; }
export function getAuth() { return { currentUser: null }; }
export function getDatabase() { return {}; }
export function ref(_db, path) { return { path }; }
export async function get(r)  { return globalThis.__fb.get(r); }
export async function set(r, v) { return globalThis.__fb.set(r, v); }
export async function update(r, o) { return globalThis.__fb.update(r, o); }
export async function remove() {}
export function onValue() { return () => {}; }
export function onAuthStateChanged(_a, cb) { cb({ uid: 'u1' }); return () => {}; }
export function signInWithEmailAndPassword() {}
export function createUserWithEmailAndPassword() {}
export function sendPasswordResetEmail() {}
export function updateProfile() {}
export function signOut() {}
export function setPersistence() {}
export const browserLocalPersistence = {};
`;
globalThis.__fb = {
  get(r) { const has = server.has(r.path), v = server.get(r.path); return { exists: () => has && v != null, val: () => clone(v) }; },
  set(r, v) {
    if (fail === 'refuse') { const e = new Error('PERMISSION_DENIED: Permission denied'); e.code = 'PERMISSION_DENIED'; throw e; }
    setLog.push(r.path); server.set(r.path, clone(v));
  },
  update(r, o) { const cur = { ...(server.get(r.path) || {}) }; Object.keys(o).forEach(k => { if (o[k] === null) delete cur[k]; else cur[k] = o[k]; }); server.set(r.path, cur); }
};

/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-custom-movement-'));
const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
writeFileSync(join(dir, 'fb-stub.mjs'), STUB);
// The real store.js, every import but units.js stubbed — destructive-write.mjs's rewrite.
writeFileSync(join(dir, 'store.mjs'), src('store.js')
  .replace("from './units.js'", 'from UNITS_REAL')
  .replace(/(\bfrom\s+)(['"])[^'"]+\2/g, "$1'./fb-stub.mjs'")
  .replace('from UNITS_REAL', 'from ' + real('units.js')));
writeFileSync(join(dir, 'usage-stub.mjs'), 'export function bump() {}\n');
writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
  .replace("from './store.js'", "from './store.mjs'")
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './units.js'", 'from ' + real('units.js')));
writeFileSync(join(dir, 'picker.mjs'), src('picker.js')
  .replace("from './store.js'", "from './store.mjs'")
  .replace("from './usage.js'", "from './usage-stub.mjs'")
  .replace("from './analytics.js'", "from './analytics.mjs'")
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js')));
const store = await import(JSON.parse(at('store.mjs')));
const P = await import(JSON.parse(at('picker.mjs')));
const T = await import(JSON.parse(real('coach-tags.js')));
const { EXERCISES, EXERCISE_BY_ID } = await import(JSON.parse(real('exercises.js')));
store.watchAuth(() => {});
store.online.value = true;

// Coach, staged the way coach-volume.mjs stages it: against a store that reads nothing.
const cdir = mkdtempSync(join(tmpdir(), 'rack-custom-movement-coach-'));
const cat = f => JSON.stringify(pathToFileURL(join(cdir, f)).href);
writeFileSync(join(cdir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
`);
const FILES = ['analytics.js', 'coach-goal.js', 'coach-prog.js', 'coach-overlap.js', 'coach-build.js', 'coach-live.js',
               'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach.js'];
FILES.forEach(f => writeFileSync(join(cdir, f.replace(/\.js$/, '.mjs')), src(f)
  .replace("from './store.js'", "from './store-stub.mjs'")
  .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (FILES.includes(n + '.js') ? cat(n + '.mjs') : real(n + '.js')))));
const C = await import(JSON.parse(cat('coach.mjs')));
const V = await import(JSON.parse(cat('coach-volume.mjs')));

/* coach-data.js's libIndex() — what hands Coach the library — lifted out of
   its source with the one helper it calls, and run against a stubbed picker. */
function lift(SRC, name) {
  const m = new RegExp('^function ' + name + '\\(', 'm').exec(SRC);
  if (!m) throw new Error('custom-movement: ' + name + '() is gone from coach-data.js — this check is stale');
  let depth = 0, j = SRC.indexOf('{', m.index);
  for (; j < SRC.length; j++) { if (SRC[j] === '{') depth++; else if (SRC[j] === '}' && --depth === 0) break; }
  return SRC.slice(m.index, j + 1);
}
const DSRC = src('coach-data.js');
const libIndexOf = list => new Function('allExercises', 'EXERCISES', lift(DSRC, 'safe') + '\n' + lift(DSRC, 'libIndex') + '\nreturn libIndex();')(() => list, EXERCISES);

/* ================= HARNESS ================= */
let pass = 0, failed = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { failed++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const U = 'users/u1/';
const PATH = 'exercises/custom';
const tick = () => new Promise(r => setTimeout(r, 0));
const sheets = () => body.children.filter(x => x.classList.contains('sheet'));
const top = () => sheets()[sheets().length - 1];
const buttons = root => walk(root).filter(x => x.tag === 'button');
const button = (root, text) => buttons(root).find(x => x.textContent === text);
// The Movement and Angle rows: each .move-opts, named by the label above it.
const rowsOf = root => {
  const out = {};
  walk(root).forEach(n => {
    if (!n.classList.contains('move-opts')) return;
    const sib = n.parent.children, lbl = sib[sib.indexOf(n) - 1];
    out[lbl ? lbl.textContent : '?'] = n.children.map(c => c.textContent + (c.classList.contains('on') ? '*' : ''));
  });
  return out;
};
const tap = (root, text) => { const b = buttons(root).find(x => x.textContent === text && (x.classList.contains('move-opt') || x.classList.contains('chip'))); if (!b) throw new Error('no chip ' + text); b.onclick(); };
async function attempt(fn) {
  const err = console.error; console.error = () => {};
  try { await fn(); return { threw: false }; } catch (e) { return { threw: true, message: String((e && e.message) || e) }; } finally { console.error = err; }
}
function reset(customs) {
  ls.clear(); byId.clear(); body.children.length = 0; server.clear(); setLog = []; fail = null;
  store.online.value = true;
  server.set(U + PATH, clone(customs));
}
// Three of his own: two with nothing set, and one he set before.
const KICK = { id: 'custom-my-kickback-a1b2c', name: 'My Kickback', group: 'arms', equipment: 'cable', secondary: [], custom: true };
const ROW  = { id: 'custom-my-row-d3e4f', name: 'My Row', group: 'back', equipment: 'cable', secondary: [], custom: true, pattern: 'row' };
const SLED = { id: 'custom-my-sled-g5h6i', name: 'My Sled', group: 'legs', equipment: 'machine', secondary: [], custom: true };
const SEED = [KICK, ROW, SLED];
// Open the manager, then one of his exercises, the way a tap does.
async function openEdit(name) {
  P.openExerciseManager(() => {});
  const item = walk(top()).find(x => x.classList.contains('ex-item') && walk(x).some(y => y.textContent === name));
  if (!item) throw new Error('no row for ' + name);
  item.onclick();
  return top();
}

/* ================= A. THE VOCABULARY ================= */
section('A. the vocabulary is coach-tags.js’s, closed — and a built-in’s tags stay pinned');
{
  check('every pattern has a plain label, and every angle', T.PATTERNS.every(p => typeof T.PATTERN_LABELS[p] === 'string' && T.PATTERN_LABELS[p].length) &&
        T.ANGLES.every(a => typeof T.ANGLE_LABELS[a] === 'string') && Object.keys(T.PATTERN_LABELS).length === T.PATTERNS.length);
  const fromTable = p => T.ANGLES.filter(a => T.TAG_IDS.some(id => T.TAGS[id].pattern === p && T.TAGS[id].angle === a));
  check('the angles offered are the ones the table tags each pattern with — press all four, a fly three, a row none: ' +
        J(Object.fromEntries(Object.entries(T.PATTERN_ANGLES).filter(([, v]) => v.length))),
        T.PATTERNS.every(p => J(T.PATTERN_ANGLES[p]) === J(fromTable(p))) && J(T.PATTERN_ANGLES.press) === J(['incline', 'flat', 'decline', 'overhead']) &&
        T.PATTERN_ANGLES.row.length === 0 && T.PATTERN_ANGLES.squat.length === 0 && Object.isFrozen(T.PATTERN_ANGLES));
  check('the patterns offered on a group are exactly the ones the agreement table allows there',
        ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'].every(g => J(T.patternsOn(g)) === J(T.PATTERNS.filter(p => T.PATTERN_GROUPS[p].includes(g)))) &&
        J(T.patternsOn('arms')) === J(['press', 'curl', 'extension', 'carry']));
  const om = T.ownMovement;
  check('a pattern allowed on its group is kept, with an angle that pattern has', J(om({ group: 'arms', pattern: 'extension', angle: 'overhead' })) === J({ pattern: 'extension', angle: 'overhead' }));
  check('a pattern the table does not allow on the group is refused — squat on arms, press on legs, a row on chest',
        om({ group: 'arms', pattern: 'squat' }) === null && om({ group: 'legs', pattern: 'press' }) === null && om({ group: 'chest', pattern: 'row' }) === null);
  check('an angle the pattern is never tagged with is dropped, the pattern kept: a row overhead is a row',
        J(om({ group: 'back', pattern: 'row', angle: 'overhead' })) === J({ pattern: 'row', angle: null }));
  check('junk is no movement at all: a capital, a number, a word from no list, an array, no group, nothing',
        [{ group: 'legs', pattern: 'Squat' }, { group: 'legs', pattern: 3 }, { group: 'legs', pattern: 'thrust' }, { group: 'legs', pattern: ['squat'] },
         { pattern: 'squat' }, null, undefined, 'squat', { group: 'legs', pattern: 'constructor' }].every(x => om(x) === null));
  check('absent is today’s meaning: a custom id with no row, or a row with nothing set, has no tags',
        T.tagsFor(KICK.id) === null && T.tagsFor(KICK.id, { group: 'arms' }) === null && T.patternOf(KICK.id) === null);
  const own = T.tagsFor(KICK.id, { group: 'arms', pattern: 'extension', angle: 'overhead' });
  check('handed its row, a custom exercise with a movement reads it — a pattern and an angle, no load or side it was never asked',
        J(own) === J({ id: KICK.id, pattern: 'extension', angle: 'overhead', load: null, side: null }) &&
        T.patternOf(KICK.id, { group: 'arms', pattern: 'extension' }) === 'extension');
  check('a built-in is pinned: whatever a row says, bench is a flat press',
        T.tagsFor('barbell-bench-press', { group: 'chest', pattern: 'squat', angle: 'overhead' }) === T.TAGS['barbell-bench-press'] &&
        T.patternOf('barbell-bench-press', { group: 'legs', pattern: 'squat' }) === 'press');
  check('and the table itself is the same object, frozen, every row five columns', Object.isFrozen(T.TAGS) &&
        T.TAG_IDS.every(id => Object.keys(T.TAGS[id]).length === 5) && T.TAG_IDS.length === EXERCISES.length);
}

/* ================= B. THE EDITOR ================= */
section('B. the editor — "Not set" by default, the group’s patterns only, an angle where there is one, and only valid values written');
{
  reset(SEED);
  await P.initPicker({});
  let sh = await openEdit('My Kickback');
  check('his own exercise’s editor has a Movement row: "Not set" chosen, then the patterns arms may take — ' + J(rowsOf(sh)),
        J(rowsOf(sh)) === J({ Movement: ['Not set*', 'Press', 'Curl', 'Extension', 'Carry'] }));
  check('every choice is a .move-opt in a wrapping .move-opts — the group and equipment rows are the old chips',
        walk(sh).filter(x => x.classList.contains('move-opt')).every(x => x.tag === 'button' && x.parent.classList.contains('move-opts')) &&
        walk(sh).filter(x => x.classList.contains('filter-row')).length === 2);
  tap(sh, 'Extension');
  check('Extension picked: an Angle row, "Not set" and the two the table tags an extension with',
        J(rowsOf(sh)) === J({ Movement: ['Not set', 'Press', 'Curl', 'Extension*', 'Carry'], Angle: ['Not set*', 'Flat', 'Overhead'] }), J(rowsOf(sh)));
  tap(sh, 'Overhead');
  tap(sh, 'Curl');
  check('another movement clears the angle — a curl’s one angle is not an extension’s', J(rowsOf(sh).Angle) === J(['Not set*', 'Incline']), J(rowsOf(sh)));
  tap(sh, 'Extension'); tap(sh, 'Overhead');
  await button(sh, 'Save changes').onclick();
  const saved = server.get(U + PATH);
  check('saved: pattern "extension" and angle "overhead" on it, and nothing else about it moved',
        J(saved[0]) === J({ ...KICK, pattern: 'extension', angle: 'overhead' }), J(saved[0]));
  check('every other custom exercise went out byte for byte, in its place', J(saved[1]) === J(ROW) && J(saved[2]) === J(SLED) && saved.length === 3);
  check('in the one whole-array write, and nothing else written', J(setLog) === J([U + PATH]));

  sh = await openEdit('My Kickback');
  check('opened again: what was saved is what is chosen', J(rowsOf(sh)) === J({ Movement: ['Not set', 'Press', 'Curl', 'Extension*', 'Carry'], Angle: ['Not set', 'Flat', 'Overhead*'] }), J(rowsOf(sh)));
  tap(sh, 'Legs');
  check('the group changed to legs, which takes an extension: kept, angle and all, among legs’ patterns',
        J(rowsOf(sh).Movement) === J(['Not set', 'Raise', 'Curl', 'Extension*', 'Hinge', 'Squat', 'Lunge', 'Bridge or thrust', 'Cardio']), J(rowsOf(sh)));
  tap(sh, 'Chest');
  check('then chest, which does not: set back to "Not set", never kept as a pairing the table refuses',
        J(rowsOf(sh)) === J({ Movement: ['Not set*', 'Press', 'Fly'] }), J(rowsOf(sh)));
  tap(sh, 'Arms');
  await button(sh, 'Save changes').onclick();
  check('"Not set" saved: both keys gone — absent, today’s meaning, not a null or an empty string',
        J(server.get(U + PATH)[0]) === J(KICK) && !('pattern' in server.get(U + PATH)[0]) && !('angle' in server.get(U + PATH)[0]));

  // One stored before this ran, or written by hand: a pattern its group does not take, and junk.
  reset([{ ...KICK, pattern: 'squat', angle: 'overhead' }, ROW, { ...SLED, pattern: 'Squat', angle: 'sideways' }]);
  await P.initPicker({});
  sh = await openEdit('My Kickback');
  check('a stored pattern its group does not take opens as "Not set"', J(rowsOf(sh)) === J({ Movement: ['Not set*', 'Press', 'Curl', 'Extension', 'Carry'] }));
  await button(sh, 'Save changes').onclick();
  sh = await openEdit('My Sled');
  await button(sh, 'Save changes').onclick();
  const cleaned = server.get(U + PATH);
  check('and saving writes only what is valid: the refused pattern and the junk are gone, the good row kept',
        J(cleaned) === J([KICK, ROW, SLED]), J(cleaned));

  sh = await openEdit('My Row');
  check('a movement set before reads back chosen: My Row is a row, and a row has no angle', J(rowsOf(sh)) === J({ Movement: ['Not set', 'Row*', 'Pulldown or pull-up', 'Raise', 'Extension', 'Hinge', 'Rotation', 'Cardio'] }), J(rowsOf(sh)));
  sheets().forEach(s => s.remove());

  // A built-in's editor: no Movement at all — its tags are the table's.
  P.openExerciseManager(() => {});
  walk(top()).find(x => x.classList.contains('ex-item') && walk(x).some(y => y.textContent === 'Barbell Bench Press')).onclick();
  check('a built-in’s editor has no Movement row — its tags are pinned', J(rowsOf(top())) === '{}');
  sheets().forEach(s => s.remove());

  // A new one, through the manager's "+  New exercise".
  reset(SEED);
  await P.initPicker({});
  P.openExerciseManager(() => {});
  button(top(), '+  New exercise').onclick();
  sh = top();
  check('a new exercise: Movement "Not set", on chest’s patterns (the group it starts on)', J(rowsOf(sh)) === J({ Movement: ['Not set*', 'Press', 'Fly'] }));
  walk(sh).find(x => x.tag === 'input').value = 'My Pullover';
  tap(sh, 'Back'); tap(sh, 'Pulldown or pull-up');
  check('back, then Pulldown or pull-up — which has no angle, so no Angle row', J(rowsOf(sh)) === J({ Movement: ['Not set', 'Row', 'Pulldown or pull-up*', 'Raise', 'Extension', 'Hinge', 'Rotation', 'Cardio'] }), J(rowsOf(sh)));
  button(sh, 'Create').onclick();
  for (let k = 0; k < 5; k++) await tick();
  const withNew = server.get(U + PATH);
  const made = withNew[3] || {};
  check('created with its movement: pattern "pulldown", no angle key', made.name === 'My Pullover' && made.group === 'back' && made.pattern === 'pulldown' &&
        !('angle' in made) && /^custom-my-pullover-/.test(made.id), J(made));
  check('and the three before it byte for byte', J(withNew.slice(0, 3)) === J(SEED));
  P.openExerciseManager(() => {});
  button(top(), '+  New exercise').onclick();
  sh = top();
  walk(sh).find(x => x.tag === 'input').value = 'My Plain';
  button(sh, 'Create').onclick();
  for (let k = 0; k < 5; k++) await tick();
  const plain = server.get(U + PATH)[4] || {};
  check('a new exercise left "Not set" is today’s shape exactly — id, name, group, equipment, secondary, custom',
        J(Object.keys(plain)) === J(['id', 'name', 'group', 'equipment', 'secondary', 'custom']), J(plain));
  sheets().forEach(s => s.remove());

  /* v57 (SHIP-V57-PROMPT §A): on shoulders the fly is named for what Coach
     counts it as, "Rear-delt fly" — every fly the library files there is one —
     and it is stored as the fly it always was. One chip, no second question,
     nothing new written. */
  P.openExerciseManager(() => {});
  button(top(), '+  New exercise').onclick();
  sh = top();
  walk(sh).find(x => x.tag === 'input').value = 'My Rear Fly';
  tap(sh, 'Shoulders');
  check('v57: on shoulders the fly reads "Rear-delt fly", one chip in the fly’s place — ' + J(rowsOf(sh)),
        J(rowsOf(sh)) === J({ Movement: ['Not set*', 'Press', 'Row', 'Rear-delt fly', 'Raise'] }), J(rowsOf(sh)));
  tap(sh, 'Rear-delt fly');
  button(sh, 'Create').onclick();
  for (let k = 0; k < 5; k++) await tick();
  const rear = server.get(U + PATH)[5] || {};
  check('created as pattern "fly", and nothing new: no angle, no other key — today’s shape and the pattern',
        rear.name === 'My Rear Fly' && rear.group === 'shoulders' && rear.pattern === 'fly' &&
        J(Object.keys(rear)) === J(['id', 'name', 'group', 'equipment', 'secondary', 'custom', 'pattern']), J(rear));
  check('and his first three byte for byte', J(server.get(U + PATH).slice(0, 3)) === J(SEED));
  sheets().forEach(s => s.remove());
  sh = await openEdit('My Rear Fly');
  check('opened again: "Rear-delt fly" chosen', rowsOf(sh).Movement.includes('Rear-delt fly*'), J(rowsOf(sh)));
  tap(sh, 'Chest');
  check('refiled under chest, the same fly reads "Fly" — a chest fly, which pushes', J(rowsOf(sh).Movement) === J(['Not set', 'Press', 'Fly*']), J(rowsOf(sh)));
  sheets().forEach(s => s.remove());
}

/* ================= C. THE WHOLE-ARRAY WRITE, THE GUARD AND A REFUSAL ================= */
section('C. the whole-array write — the guard passes an edit, refuses a partial list, and a refusal leaves nothing behind');
{
  check('exercises/custom is one of the containers the guard measures', store.isContainer(PATH));
  check('an edit drops nothing: the same keys before and after, a movement added or taken off',
        store.droppedChildren(SEED, [{ ...KICK, pattern: 'extension' }, ROW, SLED]) === 0 && store.droppedChildren(SEED, [KICK, { ...ROW, pattern: undefined }, SLED]) === 0);

  // The database refuses.
  reset(SEED);
  await P.initPicker({});
  let sh = await openEdit('My Row');
  fail = 'refuse';
  tap(sh, 'Not set');
  const r = await attempt(() => button(sh, 'Save changes').onclick());
  fail = null;
  check('a refused save rejects — the sheet does not claim it saved', r.threw && /REFUSED BY THE DATABASE/.test(r.message || ''), r.message);
  check('the server is untouched', J(server.get(U + PATH)) === J(SEED));
  const rowNotSet = (({ pattern, ...o }) => o)(ROW);
  check('the refusal is on screen and dead-lettered, whole — My Row without its movement, the others as they were', !!byId.get('writeBlock') &&
        store.refusedSaves().some(x => x.path === U + PATH && J(x.value) === J([KICK, rowNotSet, SLED])), J(store.refusedSaves()));
  check('the editor stays open, so what he chose is still in front of him', sheets().includes(sh));
  sheets().forEach(s => s.remove());
  sh = await openEdit('My Row');
  check('and this device still holds what the database holds: My Row is still a row', rowsOf(sh).Movement.includes('Row*'), J(rowsOf(sh)));
  sheets().forEach(s => s.remove());

  // The guard refuses: this device read the list whole, and another device added three since.
  reset(SEED);
  await P.initPicker({});
  const six = SEED.concat([{ ...SLED, id: 'custom-a-1' }, { ...SLED, id: 'custom-b-2' }, { ...SLED, id: 'custom-c-3' }]);
  store.LS.set('mirror:' + PATH, six);
  server.set(U + PATH, clone(six));
  sh = await openEdit('My Kickback');
  tap(sh, 'Curl');
  const g = await attempt(() => button(sh, 'Save changes').onclick());
  check('a whole-array write that would drop three his other device added is refused by the guard', g.threw && /removed 3 items/.test(g.message || ''), g.message);
  check('nothing reached the server, and nothing was queued', J(server.get(U + PATH)) === J(six) && !setLog.length && !(store.LS.get('queue', []) || []).length);
  sheets().forEach(s => s.remove());
  sh = await openEdit('My Kickback');
  check('and this device’s own list is as it was — the curl was never taken on', J(rowsOf(sh).Movement) === J(['Not set*', 'Press', 'Curl', 'Extension', 'Carry']));
  sheets().forEach(s => s.remove());

  // A new exercise refused: not added here either.
  reset(SEED);
  await P.initPicker({});
  P.openExerciseManager(() => {});
  button(top(), '+  New exercise').onclick();
  sh = top();
  walk(sh).find(x => x.tag === 'input').value = 'My Refused';
  fail = 'refuse';
  const err = console.error; console.error = () => {};
  const unhandled = []; const onUn = e => unhandled.push(e); process.on('unhandledRejection', onUn);
  button(sh, 'Create').onclick();
  for (let k = 0; k < 5; k++) await tick();
  process.off('unhandledRejection', onUn); console.error = err;
  fail = null;
  check('a new exercise the database refuses is not kept on this device: the next save does not carry it',
        !P.allExercises().some(x => x.name === 'My Refused') && J(server.get(U + PATH)) === J(SEED));
  sheets().forEach(s => s.remove());

  check('the published rules grant exercises at the section and validate nothing under it — pattern and angle land as they are',
        /"exercises": \{\s*"\.write": "[^"]+"\s*\}/.test(src('database.rules.json')));
  check('and database.rules.json is not changed by one byte from rack-v55',
        execFileSync('git', ['show', 'f2ba45e:database.rules.json'], { cwd: ROOT, encoding: 'utf8' }) === src('database.rules.json'));
}

/* ================= D. WHAT COACH READS ================= */
section('D. Coach — a custom exercise with a movement counts in the split, the line points at it once in 28 days, and nothing else moves');
{
  const libOf = customs => libIndexOf(EXERCISES.concat(customs));
  const plainLib = libOf([KICK]);
  check('coach-data.js libIndex() carries a movement as stored, and leaves every row without one the shipped three fields',
        J(libOf([{ ...KICK, pattern: 'extension', angle: 'overhead' }])[KICK.id]) === J({ name: 'My Kickback', group: 'arms', equipment: 'cable', pattern: 'extension', angle: 'overhead' }) &&
        J(plainLib[KICK.id]) === J({ name: 'My Kickback', group: 'arms', equipment: 'cable' }) &&
        J(plainLib['barbell-bench-press']) === J({ name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell' }));

  const DAY = 864e5, NOW = 1789307130123;
  const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const S = n => Array.from({ length: n }, () => ({ w: '100', r: '10', type: 'N', done: true }));
  const exOf = (lib, id, n) => ({ exId: id, name: lib[id].name, group: lib[id].group, equipment: lib[id].equipment, sets: S(n) });
  // A week: bench 3, overhead press 1, pushdowns 2, his kickback 2, rows 3, pulldowns 2, squats 3, hip thrusts 3.
  const log = lib => Array.from({ length: 9 }, (_, k) => ({ id: 'm' + k, startedAt: NOW - (7 * k + 2) * DAY, _date: key(NOW - (7 * k + 2) * DAY),
    exercises: [exOf(lib, 'barbell-bench-press', 3), exOf(lib, 'overhead-press', 1), exOf(lib, 'triceps-pushdown-rope', 2), exOf(lib, KICK.id, 2),
                exOf(lib, 'barbell-row', 3), exOf(lib, 'lat-pulldown', 2), exOf(lib, 'back-squat-high-bar', 3), exOf(lib, 'hip-thrust', 3)] }));
  const input = (lib, asked) => ({ now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: log(lib), lib, hidden: [], libReady: true,
    routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
    settings: { v: 1, mute: {}, answers: {}, asked: asked || {} } });
  const bal = (lib, asked) => V.balanceRead(C.volumeInput(input(lib, asked)));
  const pp = r => (({ a, b, left, skipped }) => ({ a, b, left, skipped }))(r.ratios.find(x => x.id === 'pushPull'));
  const lines = a => [a.text].concat(a.more.map(m => m.text));

  const setLib = libOf([{ ...KICK, pattern: 'extension', angle: 'overhead' }]);
  const before = bal(plainLib), after = bal(setLib);
  check('not set: his kickback is 16 sets Coach cannot place, his arms half customs, and left out of push : pull — ' + J(pp(before)),
        before.custom === 16 && J(before.heavy) === J(['arms']) && J(pp(before)) === J({ a: 32, b: 40, left: ['arms'], skipped: false }));
  check('set to an extension: in the split — arms back in it, his 16 kickbacks and the 16 pushdowns beside them, nothing left out — ' + J(pp(after)),
        after.custom === 0 && J(after.heavy) === J([]) && J(pp(after)) === J({ a: 64, b: 40, left: [], skipped: false }));
  const bA = lines(V.balanceAnswer(before)), aA = lines(V.balanceAnswer(after));
  check('said before: "16 sets on your custom exercises aren’t in this split…", arms named as not in push : pull, and where to set it',
        bA.includes('16 sets on your custom exercises aren’t in this split: Coach doesn’t know their movement.') &&
        bA.some(t => /^Over 8 weeks: 32 pushing sets, 40 pulling sets\. Your arms work isn’t in this/.test(t)) &&
        bA.includes('You can set the movement of a custom exercise in Train → Exercises → tap it → Movement, and Coach will count it.'), J(bA));
  /* v57 (SHIP-V57-PROMPT §C): the pointer names the path, and each step is a
     label the app shows — read out of the app's own source, never restated:
     the dock's Train, Train's Exercises button, the manager it opens (whose
     rows open the editor), and the editor's Movement row, which B drives. */
  const pathSaid = ((/in (.+), and Coach will count it\.$/.exec(bA.find(t => /set the movement/.test(t)) || '') || [])[1] || '').split(' → ');
  check('v57: the pointer names the path, each step a label the app shows — ' + J(pathSaid),
        J(pathSaid) === J(['Train', 'Exercises', 'tap it', 'Movement']) &&
        /<button data-view="workout"[^>]*>[\s\S]*?\n\s*Train\s*\n\s*<\/button>/.test(src('index.html')) &&
        /el\('button', 'btn btn-ghost', 'Exercises'\);\s*\n\s*exBtn\.onclick = \(\) => openExerciseManager\(/.test(src('workout.js')) &&
        /el\('h2', null, 'Exercises'\)/.test(src('picker.js')) &&
        /b\.onclick = \(\) => \{ close\(\); openExerciseEdit\(x\.id, reopen\); \};/.test(src('picker.js')) &&
        /el\('div', 'field-lbl', 'Movement'\)/.test(src('picker.js')), J(pathSaid));
  check('said after: no customs line, no arms left out, no pointer — "' + aA[1] + '"',
        !aA.some(t => /custom/.test(t)) && aA[1] === 'Over 8 weeks: 64 pushing sets, 40 pulling sets.', J(aA));
  const wrongGroup = bal(libOf([{ ...KICK, pattern: 'squat' }]));
  check('a movement its group does not take is not read: a squat on an arms exercise is still one Coach cannot place, and never a knee set',
        wrongGroup.custom === 16 && J(pp(wrongGroup)) === J(pp(before)) && wrongGroup.ratios.find(x => x.id === 'kneeHip').a === 24);
  const pinned = bal({ ...plainLib, 'barbell-bench-press': { ...plainLib['barbell-bench-press'], pattern: 'squat' } });
  check('a movement on a built-in’s row changes nothing: bench is still 24 pushing sets and no knee set', J(pp(pinned)) === J(pp(before)) &&
        pinned.ratios.find(x => x.id === 'kneeHip').a === 24);
  const vB = V.volumeRead(C.volumeInput(input(plainLib))), vA = V.volumeRead(C.volumeInput(input(setLib)));
  check('How’s my weekly volume? reads the same either way — a movement moves no count of sets', J(vB) === J(vA));

  // v57: his rear-delt fly, as the editor stores it, two sets a week beside the log above.
  const REAR = { id: 'custom-my-rear-fly-t1u2v', name: 'My Rear Fly', group: 'shoulders', equipment: 'cable', secondary: [], custom: true, pattern: 'fly' };
  const withRear = lib => { const i = input(lib); return { ...i, sessions: i.sessions.map(s => ({ ...s, exercises: s.exercises.concat([exOf(lib, REAR.id, 2)]) })) }; };
  const rearPP = row => pp(V.balanceRead(C.volumeInput(withRear(libOf([KICK, row])))));
  check('v57: his "Rear-delt fly", through libIndex(), is 16 pulling sets — pushing unmoved at 32, pulling 40 to 56 — ' + J(rearPP(REAR)),
        J(rearPP(REAR)) === J({ a: 32, b: 56, left: ['arms'], skipped: false }));
  check('and the same fly refiled under chest is 16 pushing sets, 48 against 40', J(rearPP({ ...REAR, group: 'chest' })) === J({ a: 48, b: 40, left: ['arms'], skipped: false }));

  // The pointer, once in four weeks.
  const eng = asked => C.coach(input(plainLib, asked)).ask('ask_balance');
  const now = eng();
  check('the engine’s answer carries once: "bal_custom" when it says where to set a movement', now.id === 'balance_read' && now.once === 'bal_custom', J(now.once));
  const held = bal(plainLib, { bal_custom: NOW - 10 * DAY });
  check('stamped 10 days ago: quiet, and held', held.hint === false && held.hintHeld === true &&
        !lines(V.balanceAnswer(held)).some(t => /set the movement/.test(t)) && eng({ bal_custom: NOW - 10 * DAY }).once === undefined);
  check('29 days on: said again', bal(plainLib, { bal_custom: NOW - 29 * DAY }).hint === true);
  check('and never when customs hide no split — his kickback set, or a log with a custom under a quarter of its group',
        after.hint === false && V.balanceAnswer(after).once === null);
  check('normSettings keeps the stamp beside vol_neglect, and nothing else new', C.ONCE_LINES.includes('bal_custom') && C.ONCE_LINES.includes('vol_neglect') &&
        C.normSettings({ asked: { bal_custom: 5, b_junk: 6 } }).asked.bal_custom === 5 && !('b_junk' in C.normSettings({ asked: { b_junk: 6 } }).asked));

  // The builder and the picker suggest exactly what they did.
  const built = lib => { const p = C.coach(input(lib)).build({}); return p ? J(p) : null; };
  check('the builder proposes the same workout, byte for byte, with the movement set or not', built(plainLib) !== null && built(plainLib) === built(setLib));
  const calls = ['coach-build.js', 'coach-overlap.js', 'coach-prog.js', 'coach-live.js', 'coach-ready.js', 'coach-fuel.js', 'coach.js', 'picker.js', 'workout.js', 'routines.js']
    .flatMap(f => [...src(f).matchAll(/\b(tagsFor|patternOf)\(([^()]*)\)/g)].map(m => f + ': ' + m[0]));
  check('and every tag read outside coach-volume.js asks by id alone, so none of them reads his movement tonight (' + calls.length + ' calls)',
        calls.length > 0 && calls.every(c => !/,/.test(c.split(': ')[1])), calls.filter(c => /,/.test(c.split(': ')[1])).join(' | '));
  check('coach-volume.js is the one reader, handed the library row', /tagsFor\(ex\.exId, row\)/.test(src('coach-volume.js')));
}

console.log('\na custom exercise’s movement: his to set, closed, written whole, and counted where he set it\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
