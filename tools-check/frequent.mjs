#!/usr/bin/env node
//
// Verifier for the Frequent chip in picker.js.
//
//   node tools-check/frequent.mjs
//
// What it pins, from TRAIN-OVERHAUL-DECISIONS.md Q4:
//
//   Ordering is by how many SESSIONS an exercise has been logged in — not
//   sets, not occurrences — descending, all time. Bench and deadlift at the
//   top for Micah. The source is the whole log, never history/{exId}.
//
// The source is the part worth a verifier. history/{exId} keeps 20 rows per
// exercise, so on Micah's account bench (43 sessions), deadlift (40) and every
// other staple all saturate at 20 and tie with each other at exactly the place
// this chip exists to order. Check 3 builds that account both ways and fails
// if the capped index can separate them — which is the check that stays true
// if somebody later "simplifies" the source back to history because it is
// already loaded.
//
// Counting DISTINCT sessions is the other half. A duplicated lifting block
// puts the same exId in one session several times; counting occurrences would
// let the block feature inflate its own ordering, and the beta account that
// re-added every exercise four times would rank as though it had trained four
// times. LEGACY_sessionCounts below is the occurrence-counting version, and
// the run fails if it DOESN'T produce the wrong numbers — a verifier that
// cannot go red on the bug it covers is decoration.
//
// This loads the REAL picker.js and the REAL analytics.js, so no copy of the
// ordering lives in this file. store.js pulls the Firebase SDK off gstatic and
// usage.js adds document/window listeners at module scope, so those two are
// stubbed; exercises.js and ui.js import nothing and touch the DOM only inside
// functions, so the real modules are used and the 231 built-in ids the picker
// filters against are the real ones.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const src  = p => readFileSync(join(HERE, '..', p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(HERE, '..', p)).href);

/* ---------- loading the real modules ----------
   read() is never reached: initPicker is not called and every function under
   test takes plain objects. It returns the caller's fallback so the module's
   three library nodes land empty and allExercises() is exactly the built-ins.
   todayKey is analytics' only other use of store.js. */

const STORE_STUB = `
export async function read(_path, fallback = null) { return fallback; }
export async function write(_path, _v) {}
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`;

const dir = mkdtempSync(join(tmpdir(), 'rack-freq-'));
writeFileSync(join(dir, 'store-stub.mjs'), STORE_STUB);
writeFileSync(join(dir, 'usage-stub.mjs'), 'export function bump() {}\n');
writeFileSync(
  join(dir, 'analytics.mjs'),
  src('analytics.js')
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './ui.js'", 'from ' + real('ui.js'))
    .replace("from './units.js'", 'from ' + real('units.js'))
);
const PICKER_SRC = src('picker.js');
writeFileSync(
  join(dir, 'picker.mjs'),
  PICKER_SRC
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace("from './usage.js'", "from './usage-stub.mjs'")
    .replace("from './analytics.js'", "from './analytics.mjs'")
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './ui.js'", 'from ' + real('ui.js'))
    .replace("from './units.js'", 'from ' + real('units.js'))
);
const P = await import(pathToFileURL(join(dir, 'picker.mjs')).href);
const X = await import(pathToFileURL(join(HERE, '..', 'exercises.js')).href);

/* ---------- the occurrence-counting version ----------
   What counting without the merge looks like. It is here to be wrong: the
   checks below assert it produces the inflated numbers, so the real function
   is being compared against something, not against itself. */

function LEGACY_sessionCounts(sessions) {
  const n = {};
  (sessions || []).forEach(s => {
    (s.exercises || []).forEach(ex => {
      if (!ex.exId) return;
      n[ex.exId] = (n[ex.exId] || 0) + 1;
    });
  });
  return n;
}

/* ---------- harness ---------- */

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail++; results.push('  FAIL ' + name + (detail ? '  - ' + detail : '')); }
}

// Sessions shaped the way allSessions() hands them out, so nothing here is a
// shape the app would never produce.
let seq = 0;
function session(date, exercises) {
  seq++;
  return {
    id: 'w' + seq, startedAt: Date.parse(date + 'T12:00:00Z') + seq,
    _mk: date.slice(0, 7), _dd: date.slice(8), _date: date, exercises
  };
}
const ex = (exId, sets) => ({
  exId, name: exId, group: 'chest', equipment: 'barbell', sets
});
const set = (w, r, type = 'N') => ({ w, r, type, done: true });

// n sessions on consecutive days, each containing every id given.
function run(n, ids, from = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(2024, 0, 1 + from + i));
    out.push(session(d.toISOString().slice(0, 10), ids.map(id => ex(id, [set(135, 5)]))));
  }
  return out;
}

const BENCH = 'barbell-bench-press';
const DEAD  = 'conventional-deadlift';
const ROW   = 'barbell-row';
const RAISE = 'dumbbell-lateral-raise';
const SQUAT = 'back-squat-high-bar';
const OHP   = 'overhead-press';

const lib = P.allExercises();
const byId = id => lib.find(x => x.id === id);

/* ---------- 0. the fixtures use real library ids ----------
   frequentOrder filters the library by id, so a typo in an id would make every
   check below pass on an empty list. */

{
  const ids = [BENCH, DEAD, ROW, RAISE, SQUAT, OHP];
  check('fixtures: every id is a real built-in',
        ids.every(id => !!byId(id)),
        ids.filter(id => !byId(id)).join(', ') || '');
  check('fixtures: the library loaded', lib.length > 200, lib.length + ' exercises');
}

/* ---------- 1. the chip row ----------
   Frequent first because it is the default, the muscle groups in the order
   they have always had between them, All at the end. */

{
  const f = P.PICKER_FILTERS;
  check('chips: Frequent leads the row',
        f[0].id === 'freq' && f[0].label === 'Frequent',
        JSON.stringify(f[0]));
  check('chips: All is last',
        f[f.length - 1].id === 'all' && f[f.length - 1].label === 'All',
        JSON.stringify(f[f.length - 1]));
  check('chips: the muscle groups keep their order between them',
        JSON.stringify(f.slice(1, -1).map(c => c.id)) === JSON.stringify(X.GROUP_ORDER),
        f.slice(1, -1).map(c => c.id).join(','));
  check('chips: every group is still there with its own label',
        f.slice(1, -1).every(c => c.label === (X.GROUPS[c.id] || {}).label));
  check('chips: nothing else joined the row', f.length === X.GROUP_ORDER.length + 2);

  // The chip has the muscle groups beside it, so the label stays short; the
  // full phrase belongs in the copy with room for it (Q4).
  check('chips: the chip label is the short one, not the full phrase',
        f[0].label === 'Frequent' && !/Frequently/.test(f[0].label));
}

/* ---------- 2. distinct sessions, not occurrences ----------
   The beta account's real shape, one logged session with every exercise added
   four times over. */

{
  const s = session('2026-09-01', [SQUAT, BENCH, DEAD, OHP, ROW].flatMap(id => [
    ex(id, [set(135, 5)]), ex(id, [set(135, 5)]),
    ex(id, [set(135, 5)]), ex(id, [set(135, 5)])
  ]));
  const n = P.sessionCounts([s]);
  const old = LEGACY_sessionCounts([s]);

  check('distinct: one session counts once per exercise, however many blocks',
        [SQUAT, BENCH, DEAD, OHP, ROW].every(id => n[id] === 1),
        JSON.stringify(n));
  check('distinct: counting occurrences really did read 4',
        [SQUAT, BENCH, DEAD, OHP, ROW].every(id => old[id] === 4),
        'legacy read ' + JSON.stringify(old) + ' - this verifier can no longer go red');

  // Micah's own account: three sessions of 219 contain a repeat.
  const mixed = [
    session('2026-03-09', [ex(RAISE, [set(20, 12)]), ex(BENCH, [set(225, 5)]), ex(RAISE, [set(25, 10)])]),
    session('2026-03-11', [ex(RAISE, [set(20, 12)])])
  ];
  const m = P.sessionCounts(mixed);
  check('distinct: a repeat inside one session moves the count by nothing',
        m[RAISE] === 2 && m[BENCH] === 1,
        JSON.stringify(m));
  check('distinct: counting occurrences really did read 3 there',
        LEGACY_sessionCounts(mixed)[RAISE] === 3);

  check('distinct: an entry with no exId is not counted as one',
        P.sessionCounts([session('2026-03-12', [{ name: 'orphan', sets: [set(1, 1)] }])])
          .undefined === undefined);
  check('distinct: no sessions at all is an empty count, not a throw',
        JSON.stringify(P.sessionCounts([])) === '{}' &&
        JSON.stringify(P.sessionCounts(null)) === '{}');
}

/* ---------- 3. WHY IT IS NOT history/{exId} ----------
   The whole reason this reads the log. history keeps 20 rows per exercise, so
   Micah's staples all hit the cap and tie at the top of the one list whose
   entire job is to order them. */

{
  // 43 bench, 40 deadlift, 28 lateral raise, 21 row — every one of them over
  // the 20-row cap.
  const sessions = [
    ...run(40, [BENCH, DEAD]),
    ...run(3,  [BENCH], 40),
    ...run(21, [RAISE, ROW], 50),
    ...run(7,  [RAISE], 80)
  ];
  const n = P.sessionCounts(sessions);
  check('source: the log counts 43 bench and 40 deadlift',
        n[BENCH] === 43 && n[DEAD] === 40,
        JSON.stringify({ bench: n[BENCH], dead: n[DEAD], raise: n[RAISE], row: n[ROW] }));

  const order = P.frequentOrder(lib, n).map(x => x.id);
  check('source: bench and deadlift are the top of the list',
        order[0] === BENCH && order[1] === DEAD,
        order.slice(0, 4).join(' > '));
  check('source: and the rest follow by session count',
        order[2] === RAISE && order[3] === ROW, order.slice(0, 4).join(' > '));

  // The same account as history/{exId} sees it: newest 20 per exercise.
  const history = {};
  sessions.forEach(s => s.exercises.forEach(e => {
    history[e.exId] = [{ date: s._date, sets: e.sets }, ...(history[e.exId] || [])].slice(0, 20);
  }));
  const capped = P.historyCounts(history);

  check('source: history caps every one of them at 20',
        [BENCH, DEAD, RAISE, ROW].every(id => capped[id] === 20),
        JSON.stringify(capped));
  check('source: so history cannot tell bench from deadlift at all',
        capped[BENCH] === capped[DEAD]);
  check('source: ordering by history leaves them tied, name order deciding',
        P.frequentOrder(lib, capped).slice(0, 2).map(x => x.id).join(',') !==
        [BENCH, DEAD].join(','),
        'the capped index separated them - check the fixture, not the code');
}

/* ---------- 4. the cold-start stand-in ----------
   It is allowed to be wrong at the top; it is not allowed to be missing, to
   throw, or to order by anything but what it has. */

{
  const h = { [BENCH]: [{ date: '2026-01-01' }, { date: '2026-01-03' }], [ROW]: [{ date: '2026-01-02' }] };
  const n = P.historyCounts(h);
  check('cold start: rows per exercise', n[BENCH] === 2 && n[ROW] === 1, JSON.stringify(n));
  check('cold start: it orders the list the same way the real counts do',
        P.frequentOrder(lib, n).map(x => x.id).slice(0, 2).join(',') === BENCH + ',' + ROW);

  // RTDB hands an array back as an object once its keys stop being contiguous.
  check('cold start: an object-shaped history is counted, not skipped',
        P.historyCounts({ [BENCH]: { 0: { date: 'a' }, 2: { date: 'b' } } })[BENCH] === 2);
  check('cold start: nothing loaded yet is an empty count, not a throw',
        JSON.stringify(P.historyCounts(null)) === '{}' &&
        JSON.stringify(P.historyCounts({})) === '{}');
}

/* ---------- 5. what the Frequent list contains ----------
   Everything ever logged, ordered, no cap (Q4's "FREQUENT LIST LENGTH"). */

{
  const many = lib.slice(0, 40).map(x => x.id);
  const n = {};
  many.forEach((id, i) => { n[id] = 40 - i; });

  const out = P.frequentOrder(lib, n);
  check('list: everything ever logged is in it — no cap', out.length === 40, out.length + ' rows');
  check('list: and nothing that was never logged',
        out.every(x => n[x.id] > 0) && out.length < lib.length);
  check('list: ordered by count, descending',
        out.every((x, i) => i === 0 || n[out[i - 1].id] >= n[x.id]));

  // Ties decide on name so two clients reading one log show one order.
  const tied = P.frequentOrder(lib, { [ROW]: 5, [BENCH]: 5, [DEAD]: 5 });
  check('list: ties break on name, not on enumeration order',
        JSON.stringify(tied.map(x => x.name)) ===
        JSON.stringify(tied.map(x => x.name).slice().sort((a, b) => a.localeCompare(b))),
        tied.map(x => x.name).join(' | '));

  // A hidden or deleted exercise is out of allExercises(), and a count left
  // behind for it must not conjure a row.
  check('list: a count for an id no longer in the library adds nothing',
        P.frequentOrder(lib, { 'gone-for-good': 99 }).length === 0);

  const before = lib.map(x => x.id).join(',');
  P.frequentOrder(lib, n);
  check('list: the library array it was handed is not reordered',
        lib.map(x => x.id).join(',') === before);
}

/* ---------- 6. the default chip, and the empty account ----------
   Frequent is the default. An account with nothing logged falls through to All
   automatically, so the default chip is never a dead screen. */

{
  check('default: an account with logged sessions opens on Frequent',
        P.frequentDefault(lib, P.sessionCounts(run(3, [BENCH]))) === 'freq');
  check('default: a brand new account opens on All instead',
        P.frequentDefault(lib, P.sessionCounts([])) === 'all');
  check('default: and so does one whose history has not loaded yet',
        P.frequentDefault(lib, P.historyCounts({})) === 'all');
  check('default: the cold-start counts are enough to open on Frequent',
        P.frequentDefault(lib, P.historyCounts({ [BENCH]: [{ date: '2026-01-01' }] })) === 'freq');
  check('default: an account whose only logged exercises are now hidden opens on All',
        P.frequentDefault([], { [BENCH]: 12 }) === 'all');
}

/* ---------- 7. the empty-state copy ----------
   "Frequent" is the chip; the full phrase goes where there is room for it.
   There is only one note: a search on this chip falls through to the whole
   library (section 7b) rather than explaining why it found nothing. */

{
  const bare = P.frequentEmptyNote();
  check('copy: the empty note uses the full phrase',
        bare.includes('Frequently performed'), bare);
  check('copy: it points at All, which is where the whole library is now',
        /\bAll\b/.test(bare));
  check('copy: it is only shown un-searched',
        /filter === 'freq' && !q && !pool\.length/.test(PICKER_SRC));
}

/* ---------- 7b. what the default chip must never hide ----------
   Two flows exist BECAUSE the exercise has never been logged, and the chip
   nobody chose was hiding the result of both of them. */

{
  const brandNew = { id: 'u-new', name: 'Zercher carry', group: 'legs', equipment: 'barbell' };
  const withNew = lib.concat(brandNew);
  const n = P.sessionCounts(run(3, [BENCH]));

  check('new: an exercise just created is hidden by count alone',
        P.frequentOrder(withNew, n).every(x => x.id !== 'u-new'));
  check('new: keeping it because it is selected puts it back on the list',
        P.frequentOrder(withNew, n, ['u-new']).some(x => x.id === 'u-new'));
  check('new: and it does not push the counted lifts down',
        P.frequentOrder(withNew, n, ['u-new'])[0].id === BENCH);
  check('new: the picker keeps what has been picked',
        /frequentOrder\(matches, counts, kept\)/.test(PICKER_SRC) &&
        /kept\.add\(x\.id\);\n    paint\(\);/.test(PICKER_SRC));
  check('new: and keeps it after it is unticked, so no row vanishes under a finger',
        /selected\.push\(x\); kept\.add\(x\.id\);/.test(PICKER_SRC));
  check('search: a search that finds nothing frequent falls through to the library',
        /\(q && !freq\.length\) \? matches\.slice\(\)\.sort\(byName\) : freq/.test(PICKER_SRC));
}

/* ---------- 8. the exercise manager is untouched ----------
   Two chip rows live in picker.js and only one of them is this job. The
   manager is DOM-only, so this reads the source rather than calling it — the
   point is that nobody wired the new row into the wrong sheet. */

{
  const manager = PICKER_SRC.slice(PICKER_SRC.indexOf('export function openExerciseManager'));
  check('manager: its own row still starts All / Mine / Hidden',
        manager.includes("mkChip('all', 'All')") &&
        manager.includes("mkChip('mine', 'Mine')") &&
        manager.includes("mkChip('hidden', 'Hidden')"));
  check('manager: it has not been given the picker row',
        !manager.includes('PICKER_FILTERS') && !manager.includes('freq'));
  check('manager: it still defaults to All', /let filter = 'all'/.test(manager));

  const picker = PICKER_SRC.slice(PICKER_SRC.indexOf('export function openPicker'),
                                  PICKER_SRC.indexOf('export function openExerciseManager'));
  check('picker: its row is the exported one, not a second hand-built list',
        picker.includes('PICKER_FILTERS.forEach') && !picker.includes("mkChip('all', 'All')"));
  check('picker: the log is warmed without being awaited in front of the sheet',
        /allSessions\(\)\s*\.then/.test(picker) && !/await allSessions/.test(picker));

  // The capped index seeds the first frame and nothing else. Whatever the list
  // settles on has to be counted off the log, which is the whole of check 3.
  const warm = picker.slice(picker.indexOf('allSessions()'));
  check('picker: the order it settles on is counted off the log, not the capped index',
        warm.includes('sessionCounts(') && !warm.includes('historyCounts('));

  // allSessions() resolves [] rather than rejecting when read('workouts') falls
  // back, so an unreadable log is indistinguishable from an empty one. Adopting
  // it would replace a populated stand-in with nothing and tell an account with
  // 219 sessions that Frequent fills in as it logs workouts.
  check('picker: an empty or unreadable log leaves the stand-in alone',
        /if \(!sessions\.length\) return;/.test(warm));
  check('picker: the stand-in really would have been blanked',
        P.frequentDefault(lib, P.historyCounts({ [BENCH]: [{ date: '2026-01-01' }] })) === 'freq' &&
        P.frequentDefault(lib, P.sessionCounts([])) === 'all');

  // The one invariant stopping the chip moving under somebody mid-tap, and the
  // one a port is most likely to drop, because it is a guard rather than a
  // result.
  check('picker: a chip the user tapped is never overridden by the late counts',
        /if \(!touched\) filter = frequentDefault/.test(warm) &&
        /c\.onclick = \(\) => \{ filter = id; touched = true;/.test(picker));
  check('picker: and the late counts only repaint when the list actually changes',
        /!== shown\) paint\(\)/.test(warm));
}

/* ---------- report ---------- */

console.log('\nFrequent chip - sessions logged in, off the whole log\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
