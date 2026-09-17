#!/usr/bin/env node
//
// Verifier for the rule that a ticked set with reps is never dropped.
//
//   node tools-check/bodyweight-sets.mjs
//
// THE RULE, word for word the same one the native tree builds to:
//
//   A set is recorded when it is ticked and has reps. A blank weight on a
//   recorded set is stored as the string '0'. A blank reps box is still an
//   unfilled set and is dropped. The live session is not changed — the blank
//   stays blank on screen; the '0' exists only in the record collectDone
//   builds.
//
// This drives the REAL collectFrom() out of workout.js, and the REAL consumers
// out of analytics.js. Nothing here restates any of that logic; a verifier with
// its own copy stops being true the moment the file it checks changes.
//
// The second half is the one that matters for trust. A pull-up now reaches the
// record as w:'0', and every consumer that reads a weight has to take that
// without throwing and WITHOUT CLAIMING ANYTHING FALSE — no "PR: 0 lb", no
// heaviest-session-ever off a zero-volume session. Typing 0 has always been
// possible, so these are expected to hold already; what this file does is stop
// them from quietly ceasing to.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC  = p => join(HERE, '..', p);

/* ---------- the fake browser ---------- */

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
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true }, configurable: true, writable: true
  });
} catch { /* Node may own it; nothing here reads it */ }

/* ---------- staging ----------
   Same rig as tools-check/maintenance.mjs: the modules under test are copied
   with their relative imports repointed at each other, and everything else any
   of them imports becomes one generated stub. The stub's export list is read
   out of the import statements rather than listed here, so a new import in
   workout.js cannot break this file with "does not provide an export named". */

const REAL = ['store.js', 'ui.js', 'units.js', 'exercises.js',
              'blocks.js', 'analytics.js', 'workout.js'];
const IMPORT_RE = /\bfrom\s+(['"])([^'"]+)\1/g;
const NAMED_RE  = /\bimport\s*\{([^}]*)\}\s*from\s+(['"])([^'"]+)\2/g;

const sources = new Map(REAL.map(f => [f, readFileSync(SRC(f), 'utf8')]));
const stubbed = new Set();

for (const text of sources.values()) {
  let m;
  NAMED_RE.lastIndex = 0;
  while ((m = NAMED_RE.exec(text))) {
    const spec = m[3];
    const base = spec.startsWith('./') ? spec.slice(2) : null;
    if (base && REAL.includes(base)) continue;
    // `forget as recallForget` — the stub exports the name on the LEFT.
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) stubbed.add(name);
    }
  }
}

const dir = mkdtempSync(join(tmpdir(), 'rack-bw-'));
writeFileSync(join(dir, 'stub.mjs'),
  Array.from(stubbed).map(n => `export function ${n}() {}`).join('\n') + '\n');
for (const [file, text] of sources) {
  writeFileSync(join(dir, file.replace(/\.js$/, '.mjs')),
    text.replace(IMPORT_RE, (whole, q, spec) => {
      const base = spec.startsWith('./') ? spec.slice(2) : null;
      return base && REAL.includes(base)
        ? `from './${base.replace(/\.js$/, '.mjs')}'`
        : `from './stub.mjs'`;
    }));
}

const load = f => import(pathToFileURL(join(dir, f)).href);
const { collectFrom, computeVolume, foldSessionIntoHistory } = await load('workout.mjs');
const { e1rm, detectPRs, sessionMilestones, prTimeline, exerciseIndex,
        isWorking } = await load('analytics.mjs');

/* ---------- harness ---------- */

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail++; results.push('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}
const shape = v => JSON.stringify(v);

// A live session's set: both boxes are the strings the inputs hold, and '' is
// "nothing typed" (ui.js:147).
const set = (w, r, done, extra) => ({ w, r, type: 'N', done, ...(extra || null) });
const ex  = (exId, name, sets, extra) =>
  ({ exId, name, group: 'back', equipment: 'bodyweight', sets, ...(extra || null) });

/* ---------- 1. what reaches the record ---------- */

{
  const live = [ex('pull-up', 'Pull-Up', [
    set('', '12', true),        // the whole point: ticked, reps, no weight
    set('', '10', true),
    set('', '', true),          // ticked but nothing in it
    set('', '8', false),        // filled but not ticked
    set('135', '5', true),      // an ordinary set, untouched
    set('185', '', true)        // a weight and no reps is still unfilled
  ])];
  const before = shape(live);
  const rec = collectFrom(live);

  check('a bodyweight session reaches the record at all', rec.length === 1, shape(rec));
  const sets = rec[0].sets;
  check('only the three finished sets are kept', sets.length === 3, shape(sets));
  check('a blank weight is recorded as 0', sets[0].w === '0' && sets[1].w === '0', shape(sets));
  check('and as the STRING 0, which is what both clients and the rules expect',
    typeof sets[0].w === 'string', typeof sets[0].w);
  check('the reps are untouched', sets[0].r === '12' && sets[1].r === '10');
  check('a weight that was typed is untouched', sets[2].w === '135' && sets[2].r === '5');
  check('a ticked set with no reps is dropped',
    !sets.some(s => s.r === ''), shape(sets));
  check('an unticked set is dropped', !sets.some(s => s.r === '8'), shape(sets));
  check('a weight with no reps is dropped', !sets.some(s => s.w === '185'), shape(sets));

  check('THE LIVE SESSION IS NOT CHANGED — the blank is still blank on screen',
    shape(live) === before, shape(live));
}

{
  // The regression this ship exists to stop: before, this session produced
  // nothing and runFinish() offered to discard the whole workout.
  const rec = collectFrom([ex('pull-up', 'Pull-Up', [set('', '12', true)])]);
  check('a bodyweight-only session is not "No completed sets"',
    rec.length === 1 && rec[0].sets.length === 1, shape(rec));
}

{
  // Typing 0 has always worked. It has to give the same bytes as leaving it
  // blank, or there are two kinds of bodyweight set in the log.
  const typed = collectFrom([ex('dip', 'Dip', [set('0', '12', true), set('0', '10', true)])]);
  const blank = collectFrom([ex('dip', 'Dip', [set('',  '12', true), set('',  '10', true)])]);
  check('typed 0 and a blank weight give byte-identical records',
    shape(typed) === shape(blank), shape(typed) + ' vs ' + shape(blank));
}

{
  // Routine scaffolding never reaches the record, blank weight or not.
  const rec = collectFrom([ex('pull-up', 'Pull-Up',
    [set('', '12', true, { tw: '25', tr: '8' })])]);
  check('tw/tr are still stripped from a bodyweight set',
    !('tw' in rec[0].sets[0]) && !('tr' in rec[0].sets[0]), shape(rec[0].sets[0]));
}

{
  // An exercise whose every set is unfilled still disappears, which is what
  // keeps blocks renumbering to 1..N.
  const rec = collectFrom([
    ex('pull-up', 'Pull-Up', [set('', '', false)], { block: 1 }),
    ex('dip',     'Dip',     [set('', '12', true)], { block: 2 })
  ]);
  check('an exercise with nothing logged still drops out', rec.length === 1, shape(rec));
  check('and the surviving block is renumbered to 1', rec[0].block === 1, shape(rec[0]));
}

/* ---------- 2. open -> save -> open changes nothing ----------
   The edit screen re-opens a stored session with every set ticked and the
   stored w/r carried across (editWorkout), and Save goes through the same
   collectFrom. So collecting a record that is already a record has to be the
   identity, or an edit that changed nothing would rewrite the month. */

{
  const rec = collectFrom([ex('pull-up', 'Pull-Up', [
    set('', '12', true), set('', '10', true), set('135', '5', true)
  ])]);
  const reopened = rec.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, done: true })) }));
  const resaved = collectFrom(reopened);
  check('open -> save on a blank-weight session is the identity',
    shape(resaved) === shape(rec), shape(resaved) + ' vs ' + shape(rec));

  const twice = collectFrom(resaved.map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, done: true })) })));
  check('and stays the identity however many times it is saved',
    shape(twice) === shape(rec), shape(twice));
}

/* ---------- 3. the consumers ----------
   None of these is being changed. Each is being held to "does not throw, does
   not claim anything false". */

const DATE = '2026-09-16';
const bwRecord = {
  id: 'w1', name: 'Pull day', startedAt: 1_757_000_000_000,
  endedAt: 1_757_003_600_000, durationSec: 3600,
  groups: ['back'], _date: DATE,
  exercises: collectFrom([ex('pull-up', 'Pull-Up',
    [set('', '12', true), set('', '10', true), set('', '8', true)])])
};
bwRecord.volume = computeVolume(bwRecord.exercises);

{
  check('computeVolume takes a w:0 set without throwing', Number.isFinite(bwRecord.volume));
  check('and a bodyweight session weighs nothing, rather than something invented',
    bwRecord.volume === 0, String(bwRecord.volume));

  check('e1RM of a bodyweight set is 0, not NaN and not a number',
    e1rm('0', 12) === 0 && e1rm('', 12) === 0, e1rm('0', 12) + ' / ' + e1rm('', 12));
  check('e1RM still works for a real set', e1rm('135', 5) === 158, String(e1rm('135', 5)));

  check('the sets still count as working sets',
    bwRecord.exercises[0].sets.every(isWorking));
}

{
  // First time ever: a baseline card, and no PR — a record needs something to
  // beat, and there is nothing behind it.
  const { prs, firsts } = detectPRs(bwRecord, []);
  check('the first bodyweight session claims no PR', prs.length === 0, shape(prs));
  check('it is logged as a first instead', firsts.length === 1, shape(firsts));
  check('and the baseline it prints is 0, not a fabricated weight',
    firsts[0].e1rm === 0, shape(firsts[0]));
}

{
  // A second identical session must not beat the first on any of the three
  // kinds — every one of them is 0 against 0.
  const prior = [{ ...bwRecord, id: 'w0', _date: '2026-09-09', startedAt: bwRecord.startedAt - 7 * 864e5,
                   volume: 0 }];
  const { prs, firsts } = detectPRs(bwRecord, prior);
  check('a repeat bodyweight session claims NO "PR: 0"', prs.length === 0, shape(prs));
  check('and is not a first time either', firsts.length === 0, shape(firsts));

  const idx = exerciseIndex(prior);
  check('the index carries the bodyweight session with a zero best',
    idx['pull-up'] && idx['pull-up'].bestE1rm === 0 && idx['pull-up'].bestWeight === 0,
    shape(idx['pull-up'] && { e: idx['pull-up'].bestE1rm, w: idx['pull-up'].bestWeight }));
}

{
  // And a bodyweight session behind a loaded one cannot take its record away.
  const loaded = {
    id: 'w0', _date: '2026-09-09', startedAt: bwRecord.startedAt - 7 * 864e5, volume: 4050,
    exercises: [ex('pull-up', 'Pull-Up', [{ w: '45', r: '8', type: 'N' }])]
  };
  const { prs } = detectPRs(bwRecord, [loaded]);
  check('a bodyweight session does not out-record a weighted one', prs.length === 0, shape(prs));
}

{
  const prior = [
    { id: 'a', _date: '2026-09-01', startedAt: 1, volume: 12000, durationSec: 4000,
      exercises: [ex('row', 'Row', [{ w: '100', r: '10', type: 'N' }])] }
  ];
  const ms = sessionMilestones(bwRecord, prior, 'lb');
  check('a zero-volume session is never the heaviest ever',
    !ms.some(m => /Heaviest/.test(m.label)), shape(ms));

  // …but a long bodyweight session really can be the most sets, and saying so
  // is not a false claim.
  const many = { ...bwRecord, durationSec: 100,
    exercises: collectFrom([ex('pull-up', 'Pull-Up',
      Array.from({ length: 9 }, () => set('', '10', true)))]) };
  const ms2 = sessionMilestones(many, prior, 'lb');
  check('but it can honestly be the most working sets ever',
    ms2.some(m => /Most working sets/.test(m.label)), shape(ms2));
}

{
  const tl = prTimeline([
    { ...bwRecord, id: 'w0', _date: '2026-09-09' },
    { ...bwRecord, id: 'w1', _date: DATE }
  ]);
  check('the PR timeline invents nothing from bodyweight work', tl.length === 0, shape(tl));
}

{
  // "Last time" has to show the set, or the pull-up is logged and invisible.
  const h = foldSessionIntoHistory({}, DATE, bwRecord.exercises);
  check('the history fold takes a w:0 set', !!h['pull-up'], shape(h));
  check('and the row keeps all three sets',
    h['pull-up'][0].sets.length === 3, shape(h['pull-up']));
  check('with the weight still the string 0',
    h['pull-up'][0].sets.every(s => s.w === '0'), shape(h['pull-up'][0].sets));
  check('and the date it was done', h['pull-up'][0].date === DATE, shape(h['pull-up'][0]));

  // A second session the same day extends the row rather than replacing it —
  // the existing invariant, re-checked with bodyweight sets in it.
  const h2 = foldSessionIntoHistory(h, DATE, bwRecord.exercises);
  check('a second same-day session extends the row', h2['pull-up'][0].sets.length === 6,
    shape(h2['pull-up'][0].sets.length));
}

{
  // Warm-ups are excluded from volume and records, blank weight or not.
  const rec = collectFrom([ex('pull-up', 'Pull-Up', [
    { w: '', r: '5', type: 'W', done: true },
    { w: '', r: '12', type: 'N', done: true }
  ])]);
  check('a blank-weight warm-up is still recorded', rec[0].sets.length === 2, shape(rec));
  check('and is still excluded from the history row',
    foldSessionIntoHistory({}, DATE, rec)['pull-up'][0].sets.length === 1);
}

/* ---------- report ---------- */

console.log('\nbodyweight sets — a ticked set with reps is never dropped\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
