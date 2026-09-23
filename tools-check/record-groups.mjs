#!/usr/bin/env node
//
// Verifier for which muscle groups a saved session claims.
//
//   node tools-check/record-groups.mjs
//
// THE RULE, the one at recordGroups in workout.js: a record claims the group of
// every exercise with at least one WORKING set (isWorking — anything but a
// warm-up). A session of nothing but warm-ups claims no group at all.
//
// THE BUG IT CLOSES (BACKLOG, v42). Both record builders — runFinish and
// saveEdit — wrote `groups: [...new Set(done.map(e => e.group))]`, and `done`
// is collectFrom's output, which keeps any ticked set with reps whatever its
// type. So a session of warm-up bench claimed chest, and the calendar, which
// paints its plates straight off `record.groups`, put a red plate on a day with
// no chest work in it. Coach never read the field; the calendar did.
//
// What this file proves, all of it against the real code:
//   A. recordGroups itself, next to the old expression for contrast.
//   B. the real runFinish, lifted out of workout.js by text the way
//      tick-targets.mjs lifts it — the record it WRITES.
//   C. the real saveEdit, lifted the same way — the record an edit writes.
//   D. the real renderCalendar, run over those records through a small DOM
//      shim — the plates a day actually gets, and its label.
//   E. the wiring: both builders call it, and the old expression is gone.
//
// Nothing here restates the rule except LEGACY below, which is the old line
// kept verbatim so section A can show it going wrong.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC  = p => join(HERE, '..', p);
const WSRC = readFileSync(SRC('workout.js'), 'utf8');

/* ---------- the fake browser, and the staging ----------
   tick-targets.mjs's rig, unchanged: the modules under test are copied with
   their relative imports repointed at each other, and everything else becomes
   one generated stub whose export list is read out of the import statements. */
const cells = new Map();
globalThis.localStorage = {
  getItem: k => (cells.has(k) ? cells.get(k) : null),
  setItem: (k, v) => cells.set(k, String(v)),
  removeItem: k => cells.delete(k),
  key: i => Array.from(cells.keys())[i] ?? null,
  get length() { return cells.size; }
};
globalThis.window = { addEventListener() {} };
globalThis.document = {
  body: null, getElementById: () => null,
  createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
  addEventListener() {}
};
try {
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true });
} catch { /* Node may own it; nothing here reads it */ }

const REAL = ['store.js', 'ui.js', 'units.js', 'exercises.js', 'blocks.js', 'analytics.js', 'workout.js'];
const IMPORT_RE = /\bfrom\s+(['"])([^'"]+)\1/g;
const NAMED_RE  = /\bimport\s*\{([^}]*)\}\s*from\s+(['"])([^'"]+)\2/g;
const sources = new Map(REAL.map(f => [f, readFileSync(SRC(f), 'utf8')]));
const stubbed = new Set();
for (const text of sources.values()) {
  let m;
  NAMED_RE.lastIndex = 0;
  while ((m = NAMED_RE.exec(text))) {
    const base = m[3].startsWith('./') ? m[3].slice(2) : null;
    if (base && REAL.includes(base)) continue;
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) stubbed.add(name);
    }
  }
}
const dir = mkdtempSync(join(tmpdir(), 'rack-groups-'));
writeFileSync(join(dir, 'stub.mjs'), Array.from(stubbed).map(n => `export function ${n}() {}`).join('\n') + '\n');
for (const [file, text] of sources) {
  writeFileSync(join(dir, file.replace(/\.js$/, '.mjs')),
    text.replace(IMPORT_RE, (whole, q, spec) => {
      const base = spec.startsWith('./') ? spec.slice(2) : null;
      return base && REAL.includes(base) ? `from './${base.replace(/\.js$/, '.mjs')}'` : `from './stub.mjs'`;
    }));
}
const load = f => import(pathToFileURL(join(dir, f)).href);
const { recordGroups, collectFrom, computeVolume } = await load('workout.mjs');
const { GROUPS, GROUP_ORDER } = await load('exercises.mjs');

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const clone = v => JSON.parse(J(v));

function lift(name) {
  const re = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm');
  const m = re.exec(WSRC);
  if (!m) throw new Error('record-groups: ' + name + '() is gone from workout.js');
  const end = WSRC.indexOf('\n}\n', m.index);
  return WSRC.slice(m.index, end + 3).replace(/^export /, '');
}

// The line both builders used to carry, verbatim.
const LEGACY = done => [...new Set(done.map(e => e.group))];

// Live-session sets and exercises, as the session holds them before Finish.
const W = (w, r) => ({ w, r, type: 'W', done: true });
const N = (w, r) => ({ w, r, type: 'N', done: true });
const ex = (exId, group, sets) => ({ exId, name: exId, group, equipment: 'barbell', sets });

// The sessions every section below runs.
const WARMUP_ONLY = [ex('barbell-bench-press', 'chest', [W('45', '10'), W('95', '8'), W('135', '5')])];
const MIXED = [
  ex('barbell-bench-press', 'chest', [W('45', '10'), W('95', '8')]),           // warm-ups only
  ex('barbell-row', 'back', [W('95', '8'), N('155', '8'), N('155', '8')])      // warm-up + working
];
const PUSH = [
  ex('barbell-bench-press', 'chest', [W('95', '8'), N('185', '5'), N('185', '5')]),
  ex('overhead-press', 'shoulders', [N('95', '8')]),
  ex('dip', 'arms', [N('0', '12')])
];

/* ================= A. THE RULE ================= */
section('A. recordGroups — the group of every exercise with a working set, and nothing else');
{
  const wu = collectFrom(clone(WARMUP_ONLY));
  check('a warm-up-only session still reaches the record — collectFrom keeps ticked warm-ups with reps',
        wu.length === 1 && wu[0].sets.length === 3, J(wu.map(e => e.sets.length)));
  check('and it claims NO group', J(recordGroups(wu)) === '[]', J(recordGroups(wu)));
  check('where the old line claimed chest for it — the wrong plate this closes', J(LEGACY(wu)) === '["chest"]', J(LEGACY(wu)));

  const mx = collectFrom(clone(MIXED));
  check('a mixed session claims only the group of its working sets: back, not chest',
        J(recordGroups(mx)) === '["back"]', J(recordGroups(mx)));
  check('where the old line claimed both', J(LEGACY(mx)) === '["chest","back"]', J(LEGACY(mx)));

  const pu = collectFrom(clone(PUSH));
  check('a real session with a warm-up in front of its working sets keeps every group it trained',
        J(recordGroups(pu)) === '["chest","shoulders","arms"]', J(recordGroups(pu)));
  check('and on any session whose every exercise has a working set, old and new agree exactly — order included',
        J(recordGroups(pu)) === J(LEGACY(pu)));

  const twice = collectFrom([ex('barbell-bench-press', 'chest', [N('185', '5')]), ex('incline-db-press', 'chest', [N('60', '10')])]);
  check('two exercises in one group claim it once', J(recordGroups(twice)) === '["chest"]', J(recordGroups(twice)));

  // Failure and drop sets are working sets. Only a warm-up is not.
  const fd = collectFrom([ex('curl', 'arms', [{ ...N('30', '8'), type: 'F' }]), ex('pushdown', 'arms', [{ ...N('40', '12'), type: 'D' }]),
                          ex('squat', 'legs', [W('135', '5')])]);
  check('a failure set and a drop set are working sets; a warm-up is not', J(recordGroups(fd)) === '["arms"]', J(recordGroups(fd)));

  const bw = collectFrom([ex('pull-up', 'back', [{ w: '', r: '10', type: 'N', done: true }])]);
  check('a bodyweight working set (stored w:\'0\') claims its group — no weight is not no set',
        bw.length === 1 && bw[0].sets[0].w === '0' && J(recordGroups(bw)) === '["back"]', J(bw));

  check('an empty list is no groups, not a throw', J(recordGroups([])) === '[]');
  check('pure: the input is not touched', (() => { const d = collectFrom(clone(MIXED)); const b = J(d); recordGroups(d); return J(d) === b; })());
}

/* ================= B. FINISH, DRIVEN ================= */
section('B. Finish — the real runFinish writes the record with these groups');
const FINISHED = {};
{
  const COLLECT_DONE = 'function collectDone() { return collectFrom(session.exercises); }';
  check('collectDone is still the one-line caller of collectFrom this harness assumes', WSRC.includes(COLLECT_DONE));
  const STUBS = ['collectFrom', 'recordGroups', 'computeVolume', 'confirmSheet', 'write', 'toast', 'bump', 'LS', 'todayKey',
                 'allSessions', 'detectPRs', 'sessionMilestones', 'wu', 'trimHistory', 'foldSessionIntoHistory',
                 'loadMonth', 'invalidate', 'refreshCoachSessions', 'releaseWakeLock', 'clearRest', 'render'];
  async function finish(name, exercises, day) {
    const writes = [];
    const stubs = {
      collectFrom, recordGroups, computeVolume,
      confirmSheet: () => {}, write: async (p, v) => { writes.push([p, clone(v)]); },
      toast: () => {}, bump: () => {}, LS: { get: (k, f) => f, set: () => {}, del: () => {} },
      todayKey: (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      allSessions: async () => [], detectPRs: () => ({ prs: [], firsts: [] }), sessionMilestones: () => [], wu: () => 'lb',
      trimHistory: h => h, foldSessionIntoHistory: h => h, loadMonth: async () => ({}), invalidate: () => {},
      refreshCoachSessions: async () => true, releaseWakeLock: () => {}, clearRest: () => {}, render: () => {}
    };
    const body = 'let session = null, summary = null, peek = false, history = {}, monthCache = {};\n' +
      'let finishing = false;\n' + COLLECT_DONE + '\n' +
      [lift('unsavedTicks'), lift('finishWorkout'), lift('runFinish')].join('\n') +
      '\nreturn { finishWorkout, set: s => { session = s; } };';
    const api = new Function(...STUBS, body)(...STUBS.map(k => stubs[k]));
    api.set({ id: 'w' + name, name, startedAt: new Date(2026, 8, day, 18, 0).getTime(), exercises: clone(exercises) });
    await api.finishWorkout();
    const rec = writes.filter(([p]) => p.startsWith('workouts/')).map(([p, v]) => ({ p, v }));
    // runFinish writes the session into its day node: workouts/{mk}/{dd}/{id}.
    const hit = rec.find(r => r.p === `workouts/2026-09/${String(day).padStart(2, '0')}/w${name}`);
    return hit ? hit.v : null;
  }
  FINISHED.warmup = await finish('warmup', WARMUP_ONLY, 5);
  FINISHED.mixed  = await finish('mixed', MIXED, 6);
  FINISHED.push   = await finish('push', PUSH, 7);
  check('runFinish wrote all three sessions (no sheet stopped any of them)',
        !!FINISHED.warmup && !!FINISHED.mixed && !!FINISHED.push, J(Object.keys(FINISHED).filter(k => !FINISHED[k])));
  check('the warm-up-only session is saved — its sets are all there — with groups: []',
        FINISHED.warmup && FINISHED.warmup.exercises[0].sets.length === 3 && J(FINISHED.warmup.groups) === '[]',
        FINISHED.warmup && J(FINISHED.warmup.groups));
  check('and its volume is 0, as it always was — warm-ups never counted there', FINISHED.warmup && FINISHED.warmup.volume === 0);
  check('the mixed session is saved with both exercises and groups: ["back"]',
        FINISHED.mixed && FINISHED.mixed.exercises.length === 2 && J(FINISHED.mixed.groups) === '["back"]',
        FINISHED.mixed && J(FINISHED.mixed.groups));
  check('the real session keeps every group it trained',
        FINISHED.push && J(FINISHED.push.groups) === '["chest","shoulders","arms"]', FINISHED.push && J(FINISHED.push.groups));
  check('and nothing else about the record moved: exercises are collectFrom\'s, volume is computeVolume\'s',
        FINISHED.push && J(FINISHED.push.exercises) === J(collectFrom(clone(PUSH))) && FINISHED.push.volume === computeVolume(collectFrom(clone(PUSH))));
}

/* ================= C. AN EDIT, DRIVEN ================= */
section('C. Save an edit — the real saveEdit rebuilds the groups the same way');
{
  const STUBS = ['collectFrom', 'recordGroups', 'computeVolume', 'toast', 'hydrateForWrite', 'saveMonth',
                 'rebuildHistoryFromLog', 'render'];
  async function edit(before, exercises) {
    const saved = [];
    const stubs = {
      collectFrom, recordGroups, computeVolume, toast: () => {},
      hydrateForWrite: async () => true, saveMonth: async mk => { saved.push(mk); },
      rebuildHistoryFromLog: async () => {}, render: () => {}
    };
    const body = 'let session = null, monthCache = {};\n' +
      'function collectDone() { return collectFrom(session.exercises); }\n' + lift('saveEdit') +
      '\nreturn { saveEdit, set: (s, c) => { session = s; monthCache = c; }, cache: () => monthCache };';
    const api = new Function(...STUBS, body)(...STUBS.map(k => stubs[k]));
    const cache = { '2026-09': { '06': { [before.id]: clone(before) } } };
    api.set({ id: before.id, name: before.name, startedAt: before.startedAt, exercises: clone(exercises),
              _edit: { mk: '2026-09', dd: '06', dateKey: '2026-09-06', durationSec: 3600 } }, cache);
    await api.saveEdit();
    return { rec: ((api.cache()['2026-09'] || {})['06'] || {})[before.id], saved };
  }
  // A session stored before v47, with the warm-up group it should never have
  // had. Re-opened and saved unchanged, it is rewritten by the rule.
  const stale = { ...FINISHED.mixed, groups: ['chest', 'back'] };
  const a = await edit(stale, MIXED.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s })) })));
  check('an old record re-saved unchanged loses the warm-up group it stored: ["chest","back"] → ["back"]',
        a.rec && J(a.rec.groups) === '["back"]' && a.saved.includes('2026-09'), a.rec && J(a.rec.groups));
  // Edited so the only working set of the row is turned into a warm-up.
  const allWarm = MIXED.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, type: 'W' })) }));
  const b = await edit(stale, allWarm);
  check('edited down to warm-ups only, it claims no group', b.rec && J(b.rec.groups) === '[]', b.rec && J(b.rec.groups));
  const c = await edit(stale, PUSH);
  check('edited into a real session, it claims what that session trained',
        c.rec && J(c.rec.groups) === '["chest","shoulders","arms"]', c.rec && J(c.rec.groups));
}

/* ================= D. THE CALENDAR, DRIVEN ================= */
section('D. the calendar — the real renderCalendar, and the plates each day gets');
{
  // Just enough DOM for renderCalendar: a node that remembers its class, its
  // text, its children, its style and its attributes.
  const node = (tag, cls, txt) => {
    const n = { tag, className: cls || '', textContent: txt == null ? '' : String(txt), children: [], style: {}, attrs: {},
      appendChild(c) { this.children.push(c); return c; }, append(...cs) { cs.forEach(c => this.children.push(c)); },
      setAttribute(k, v) { this.attrs[k] = String(v); } };
    return n;
  };
  const STUBS = ['el', 'monthKey', 'todayKey', 'loadMonth', 'render', 'GROUPS', 'GROUP_ORDER', 'openDay', 'document',
                 'renderMonthStats', 'renderWeekVolume', 'coachCard', 'hasActiveSession', 'toast', 'startWorkout',
                 'saveSessionAsRoutine', 'openPicker', 'openRoutines', 'openExerciseManager', 'openStats'];
  const stubs = {
    el: (t, c, txt) => node(t, c, txt),
    monthKey: d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
    todayKey: () => '2026-09-30', loadMonth: async () => ({}), render: () => {},
    GROUPS, GROUP_ORDER, openDay: () => {}, document: { createTextNode: t => node('#text', '', t) },
    renderMonthStats: () => node('div'), renderWeekVolume: () => node('div'), coachCard: () => node('div'),
    hasActiveSession: () => false, toast: () => {}, startWorkout: () => {}, saveSessionAsRoutine: () => {},
    openPicker: () => {}, openRoutines: () => {}, openExerciseManager: () => {}, openStats: async () => {}
  };
  // A pre-v47 record: a warm-up-only session whose stored groups still say
  // chest. The calendar paints what is stored, so this day keeps its plate
  // until the session is edited and saved — said here so nobody mistakes it
  // for the fix not working.
  const OLD = { ...FINISHED.warmup, id: 'wold', groups: ['chest'] };
  const month = {
    '05': { [FINISHED.warmup.id]: FINISHED.warmup },
    '06': { [FINISHED.mixed.id]: FINISHED.mixed },
    '07': { [FINISHED.push.id]: FINISHED.push },
    '08': { wold: OLD },
    // Two sessions on one day: the warm-up-only one adds nothing to the other's plates.
    '09': { [FINISHED.warmup.id]: FINISHED.warmup, [FINISHED.mixed.id]: FINISHED.mixed },
    // Firebase stores no empty array, so groups: [] reads back as no key at all.
    '11': { wfb: (({ groups, ...rest }) => ({ ...rest, id: 'wfb' }))(FINISHED.warmup) }
  };
  const body = 'let viewMonth = new Date(2026, 8, 1), peek = false, monthCache = ' + J({ '2026-09': month }) + ';\n' +
    lift('renderCalendar') + '\nreturn renderCalendar;';
  const renderCalendar = new Function(...STUBS, body)(...STUBS.map(k => stubs[k]));
  const wrap = renderCalendar();
  const grid = wrap.children.find(c => c.className === 'cal-grid');
  const day = d => grid && grid.children.find(c => /^cal-day\b/.test(c.className) && !/\bpad\b/.test(c.className) &&
                                                  c.children[0] && c.children[0].textContent === String(d));
  const plates = d => { const c = day(d); const p = c && c.children.find(x => x.className === 'cal-plates'); return p ? p.children.map(i => i.style.background) : null; };
  const C = g => GROUPS[g].color;

  check('the calendar rendered a grid of the month', !!grid && !!day(1) && !!day(30));
  check('a real session: a plate per group it trained, in the calendar\'s own group order',
        J(plates(7)) === J([C('chest'), C('shoulders'), C('arms')]), J(plates(7)));
  check('with its label naming them', (day(7) || { attrs: {} }).attrs['aria-label'] === '7 — Chest, Shoulders, Arms', (day(7) || { attrs: {} }).attrs['aria-label']);
  check('a mixed session: only back\'s plate — no red chest plate for the warm-up bench',
        J(plates(6)) === J([C('back')]), J(plates(6)));
  check('a warm-up-only session: the day still reads as trained, with no plates on it',
        /\bhas-work\b/.test((day(5) || {}).className || '') && J(plates(5)) === '[]', (day(5) || {}).className + ' ' + J(plates(5)));
  check('and its label says a workout was logged rather than trailing off after the dash',
        (day(5) || { attrs: {} }).attrs['aria-label'] === '5 — workout logged', (day(5) || { attrs: {} }).attrs['aria-label']);
  check('two sessions on one day, one of them warm-ups only: the plates are the other one\'s',
        J(plates(9)) === J([C('back')]), J(plates(9)));
  check('the same session read back from Firebase — groups absent, not [] — paints the same: trained, no plates',
        !('groups' in month['11'].wfb) && /\bhas-work\b/.test((day(11) || {}).className || '') && J(plates(11)) === '[]' &&
        (day(11) || { attrs: {} }).attrs['aria-label'] === '11 — workout logged', J(plates(11)));
  check('a day with nothing on it is still an empty day', /\bempty\b/.test((day(10) || {}).className || '') &&
        (day(10) || { attrs: {} }).attrs['aria-label'] === '10 — no training');
  check('a record saved BEFORE v47 is painted as it was stored — chest — until it is edited and saved',
        J(plates(8)) === J([C('chest')]), J(plates(8)));
}

/* ================= E. THE WIRING ================= */
section('E. both record builders take their groups from recordGroups');
{
  const fin = lift('runFinish'), ed = lift('saveEdit');
  check('runFinish: groups: recordGroups(done)', /\n\s*groups: recordGroups\(done\),\n/.test(fin));
  check('saveEdit: groups: recordGroups(done)', /\n\s*groups: recordGroups\(done\),\n/.test(ed));
  const code = WSRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"\\`])\/\/.*$/, '$1')).join('\n');
  check('the old expression is gone from the code (comments aside)', !/done\.map\(e => e\.group\)/.test(code));
  check('recordGroups is exported for this file and the port, beside computeVolume',
        /export function recordGroups\(done\)/.test(WSRC) && /export function computeVolume\(done\)/.test(WSRC));
  check('and the calendar still paints from the stored record.groups — the field is the fix',
        /list\.flatMap\(w => w\.groups \|\| \[\]\)/.test(lift('renderCalendar')));
}

/* ---------- report ---------- */
console.log('\nwhat a session claims it trained\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
