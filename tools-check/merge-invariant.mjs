#!/usr/bin/env node
//
// Verifier for the merge invariant in analytics.js, and for the two writers in
// workout.js that now fold through it.
//
//   node tools-check/merge-invariant.mjs
//
// The invariant, from TRAIN-OVERHAUL-DECISIONS.md:
//
//   An exercise appearing more than once in ONE session is ONE logical entry
//   for that session, with its sets concatenated in session order.
//
// It matters because the duplicate-block button puts the same exId in one
// session several times, and because the same shape is already reachable by
// adding an exercise twice by hand. A beta account with ONE logged session
// reads "4 sessions" against every lift on the Most-trained card
// (stats.js:194 prints e.sessions as "N x" and "N sessions") because they
// re-added each exercise instead of adding a set to it. That is a wrong number
// in production, not a hypothetical.
//
// The other half of the invariant is just as load-bearing and is the easy one
// to break while fixing the first: the work was really done, so volume, sets
// and reps must come out of the merge unchanged. Only the occurrence count
// moves.
//
// This loads the REAL analytics.js — no copy of the merge lives in this file,
// which is the only way a verifier stays true when the file changes. store.js
// pulls the Firebase SDK off gstatic and cannot be imported under Node, so its
// two names are stubbed; exercises.js and ui.js import nothing and touch the
// DOM only inside functions, so the real modules are used, and compact()/r1()
// are the ones the app runs.
//
// Section 9 does the same for workout.js: it extracts the two history helpers
// from the real file by source text and drives them exactly as the two call
// sites do, so a fix that lives only in the verifier cannot pass.
//
// Then the same fixtures go through LEGACY_exerciseIndex and the two LEGACY
// history writers, the pre-fix bodies kept inline below, and the run fails if
// those DON'T produce the wrong counts and the disagreement. A verifier that
// cannot go red on the bug it covers is decoration.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC  = join(HERE, '..', 'analytics.js');
const real = p => JSON.stringify(pathToFileURL(join(HERE, '..', p)).href);

/* ---------- loading the real module ----------
   read() is never reached: every function under test takes plain session
   objects. todayKey is only used by weeklyVolume, and is stubbed to the same
   local-date shape store.js produces so a future test of that function is not
   quietly comparing against a different calendar. */

const STUB = `
export async function read(_path, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`;

const dir = mkdtempSync(join(tmpdir(), 'rack-merge-'));
writeFileSync(join(dir, 'store-stub.mjs'), STUB);
writeFileSync(
  join(dir, 'analytics.mjs'),
  readFileSync(SRC, 'utf8')
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './ui.js'", 'from ' + real('ui.js'))
    .replace("from './units.js'", 'from ' + real('units.js'))
);
const A = await import(pathToFileURL(join(dir, 'analytics.mjs')).href);

/* ---------- the pre-fix index ----------
   exerciseIndex's body as it stood before the merge, reduced to the three
   fields these checks read. It deliberately calls the REAL isWorking,
   exerciseVolume, bestSet, e1rm and topWeight: none of those changed, and a
   second copy of the arithmetic would only be a second thing to get wrong.
   The one difference is the line that iterates — occurrences, not entries. */

function LEGACY_exerciseIndex(sessions) {
  const idx = {};
  sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
      if (!ex.exId) return;
      const e = idx[ex.exId] || (idx[ex.exId] = {
        exId: ex.exId, entries: [], sessions: 0,
        totalVolume: 0, totalSets: 0, totalReps: 0, bestVolume: 0
      });
      const working = (ex.sets || []).filter(A.isWorking);
      if (!working.length) return;
      const vol = A.exerciseVolume(ex);
      e.entries.push({ date: s._date, volume: Math.round(vol) });
      e.sessions++;
      e.totalVolume += vol;
      e.totalSets += working.length;
      e.totalReps += working.reduce((a, x) => a + (parseInt(x.r) || 0), 0);
      if (vol > e.bestVolume) e.bestVolume = Math.round(vol);
    });
  });
  Object.values(idx).forEach(e => e.totalVolume = Math.round(e.totalVolume));
  return idx;
}

/* ---------- harness ---------- */

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail++; results.push('  FAIL ' + name + (detail ? '  - ' + detail : '')); }
}

// Sessions are shaped the way allSessions() hands them out: _date and _mk/_dd
// already attached, startedAt present, so nothing here is a special case the
// app would never produce.
let seq = 0;
function session(date, exercises) {
  const [mk, dd] = [date.slice(0, 7), date.slice(8)];
  seq++;
  return {
    id: 'w' + seq, startedAt: Date.parse(date + 'T12:00:00Z') + seq,
    _mk: mk, _dd: dd, _date: date, exercises
  };
}

const ex = (exId, sets, extra = {}) => ({
  exId, name: exId, group: 'chest', equipment: 'barbell', sets, ...extra
});

const set = (w, r, type = 'N') => ({ w, r, type, done: true });

const volumeOf = sessions =>
  sessions.reduce((a, s) => a + (s.exercises || []).reduce(
    (b, e) => b + A.exerciseVolume(e), 0), 0);

/* ---------- 1. an ordinary session is untouched ----------
   The merge has to be invisible to the 216 of Micah's 219 sessions that
   contain no repeat. If this one moves, every number in the app moved. */

{
  const s = session('2026-03-02', [
    ex('bench', [set(135, 10, 'W'), set(225, 5), set(225, 5)]),
    ex('row',   [set(135, 8), set(135, 8)])
  ]);
  const merged = A.mergeSessionExercises(s.exercises);

  check('ordinary session: entry count unchanged', merged.length === 2);
  check('ordinary session: sets unchanged',
        JSON.stringify(merged.map(e => e.sets)) ===
        JSON.stringify(s.exercises.map(e => e.sets)));

  const idx = A.exerciseIndex([s]);
  const old = LEGACY_exerciseIndex([s]);
  check('ordinary session: index identical to the pre-fix index',
        JSON.stringify(Object.keys(idx).map(k => [
          idx[k].sessions, idx[k].entries.length, idx[k].totalVolume,
          idx[k].totalSets, idx[k].totalReps, idx[k].bestVolume
        ])) ===
        JSON.stringify(Object.keys(old).map(k => [
          old[k].sessions, old[k].entries.length, old[k].totalVolume,
          old[k].totalSets, old[k].totalReps, old[k].bestVolume
        ])));

  check('ordinary session: warm-ups still excluded, as everywhere else',
        idx.bench.totalSets === 2 && idx.bench.totalVolume === 2250);
}

/* ---------- 2. the same exId twice ----------
   Micah's own account, three sessions of it. The counts move by exactly one
   and nothing else does. */

{
  const s = session('2026-03-09', [
    ex('lateral-raise', [set(20, 12), set(20, 12)]),
    ex('bench',         [set(225, 5)]),
    ex('lateral-raise', [set(25, 10)])
  ]);

  const idx = A.exerciseIndex([s]);
  const old = LEGACY_exerciseIndex([s]);

  check('twice: one entry for the session', idx['lateral-raise'].entries.length === 1);
  check('twice: sessions counts 1', idx['lateral-raise'].sessions === 1);
  check('twice: the pre-fix index really did say 2',
        old['lateral-raise'].sessions === 2 && old['lateral-raise'].entries.length === 2,
        'legacy said ' + old['lateral-raise'].sessions +
        ' - this verifier can no longer go red');

  check('twice: the exercise beside it is unaffected',
        idx.bench.sessions === 1 && idx.bench.entries.length === 1);

  check('twice: sets and reps are the sum of both occurrences',
        idx['lateral-raise'].totalSets === 3 && idx['lateral-raise'].totalReps === 34);
  check('twice: sets and reps match the pre-fix totals exactly',
        idx['lateral-raise'].totalSets === old['lateral-raise'].totalSets &&
        idx['lateral-raise'].totalReps === old['lateral-raise'].totalReps);
}

/* ---------- 3. the same exId four times ----------
   The beta account's real shape: one logged session, every exercise added four
   times over. Today that account is told it has trained four times. */

{
  const four = ['squat', 'bench', 'deadlift', 'ohp', 'row'];
  const s = session('2026-09-01', four.flatMap(id => [
    ex(id, [set(135, 5)]), ex(id, [set(135, 5)]),
    ex(id, [set(135, 5)]), ex(id, [set(135, 5)])
  ]));

  const idx = A.exerciseIndex([s]);
  const old = LEGACY_exerciseIndex([s]);

  check('four times: every lift reads 1 session',
        four.every(id => idx[id].sessions === 1 && idx[id].entries.length === 1),
        four.map(id => id + '=' + idx[id].sessions).join(' '));
  check('four times: the pre-fix index really did read 4 for every lift',
        four.every(id => old[id].sessions === 4),
        'legacy read ' + four.map(id => old[id].sessions).join(',') +
        ' - this verifier can no longer go red');

  check('four times: all four blocks of sets survive the merge',
        four.every(id => idx[id].totalSets === 4 && idx[id].totalReps === 20));

  // The one number the merge is SUPPOSED to move besides the count: a session's
  // best volume for a lift is the whole session's, not one block's.
  check("four times: bestVolume is the session's, not one block's",
        idx.bench.bestVolume === 2700 && old.bench.bestVolume === 675);
}

/* ---------- 4. concatenated in order, not interleaved ----------
   Session order is the whole content of "concatenated in session order". The
   history line the other two call sites write prints these sets in the order
   this array holds them, so an interleave would be a lie about what was
   lifted when. */

{
  const merged = A.mergeSessionExercises([
    ex('bench', [set(135, 10), set(155, 8)]),
    ex('row',   [set(95, 10)]),
    ex('bench', [set(185, 5), set(205, 3)]),
    ex('bench', [set(225, 1)])
  ]);

  check('order: one entry per distinct exId, in first-appearance order',
        merged.length === 2 && merged[0].exId === 'bench' && merged[1].exId === 'row');
  check('order: sets are concatenated block after block',
        JSON.stringify(merged[0].sets.map(x => [x.w, x.r])) ===
        JSON.stringify([[135, 10], [155, 8], [185, 5], [205, 3], [225, 1]]));
  check('order: the entry between them keeps its own sets',
        JSON.stringify(merged[1].sets.map(x => [x.w, x.r])) === JSON.stringify([[95, 10]]));
}

/* ---------- 5. the input is not touched ----------
   Pure means pure. exerciseIndex runs over flatCache, which store.js hands to
   every other reader of the log; a merge that wrote back into those arrays
   would corrupt the cache for the whole app on the first Statistics open. */

{
  const src = [
    ex('bench', [set(135, 10)]),
    ex('bench', [set(225, 5)])
  ];
  const before = JSON.stringify(src);
  const merged = A.mergeSessionExercises(src);
  merged[0].sets.push(set(315, 1));

  check('purity: the source array is unchanged', JSON.stringify(src) === before);
  check('purity: the source array still has both occurrences', src.length === 2);
  check('purity: the merged sets array is not one of the inputs',
        merged[0].sets !== src[0].sets && merged[0].sets !== src[1].sets);
}

/* ---------- 6. volume is unchanged by the merge ----------
   The work was really done. If a fix for the count also drops a block's
   volume it has traded a visible wrong number for an invisible one. */

{
  const sessions = [
    session('2026-01-05', [ex('bench', [set(135, 10), set(225, 5)])]),
    session('2026-01-08', [
      ex('bench', [set(185, 8)]), ex('squat', [set(315, 3)]), ex('bench', [set(205, 5)])
    ]),
    session('2026-01-12', [
      ex('bench', [set(135, 5, 'W')]), ex('bench', [set(225, 5)]),
      ex('bench', [set(235, 3)]),      ex('bench', [set(245, 1)])
    ])
  ];

  const idx = A.exerciseIndex(sessions);
  const old = LEGACY_exerciseIndex(sessions);

  check('volume: total per exercise identical before and after',
        idx.bench.totalVolume === old.bench.totalVolume &&
        idx.squat.totalVolume === old.squat.totalVolume,
        idx.bench.totalVolume + ' vs ' + old.bench.totalVolume);
  check('volume: sets and reps identical before and after',
        idx.bench.totalSets === old.bench.totalSets &&
        idx.bench.totalReps === old.bench.totalReps);
  check('volume: and identical to summing every working set directly',
        idx.bench.totalVolume + idx.squat.totalVolume === Math.round(volumeOf(sessions)));

  check('volume: session counts are the ones that moved',
        idx.bench.sessions === 3 && old.bench.sessions === 6);

  // groupSplit already de-duplicates its session count with a Set and sums
  // every set for volume, so it is correct as it stands. Pinned so a later
  // pass does not "fix" it into double-counting or into dropping the work.
  const gs = A.groupSplit(sessions).find(g => g.group === 'chest');
  check('volume: groupSplit still sums every working set',
        gs.sets === idx.bench.totalSets + idx.squat.totalSets,
        'chest sets ' + gs.sets);
  check('volume: groupSplit counts each session once', gs.sessions === 3);
}

/* ---------- 7. PR detection sees one entry per session ----------
   detectPRs pushes a "first time" card per exercise and judges a volume PR
   against the best SESSION volume. Per occurrence, a lifter who duplicated a
   block got the same first-time card four times over, and a volume record
   compared against a number of a different kind. */

{
  const first = session('2026-02-02', [
    ex('bench', [set(135, 5)]), ex('bench', [set(135, 5)]),
    ex('bench', [set(135, 5)]), ex('bench', [set(135, 5)])
  ]);
  const { prs, firsts } = A.detectPRs(first, []);
  check('PRs: a repeated exercise is one "first time", not four',
        firsts.length === 1 && firsts[0].exId === 'bench',
        firsts.length + ' firsts');
  check('PRs: nothing is a record on the first session', prs.length === 0);

  // 1200 lb of bench in one block. It beats any SINGLE block of the session
  // above (675) and loses to that session as a whole (2700), so it is a volume
  // record only if the best it is measured against is one block's worth. The
  // weight and the e1RM are deliberately below the earlier session's: one PR
  // per exercise survives detectPRs, and a heavier set would mask this one.
  const lighter = session('2026-02-05', [ex('bench', [set(100, 12)])]);
  const volPR = A.detectPRs(lighter, [first]).prs.filter(p => p.kind === 'volume');
  check('PRs: a volume record is judged against the whole session before it',
        volPR.length === 0, volPR.map(p => p.value + ' over ' + p.prev).join(', '));
}

/* ---------- 8. prTimeline does not set records against itself ----------
   Walking occurrences, the second block of a session is judged against the
   first block of the same session — so going 135 then 225 in two blocks
   printed a PR dated that day, on a day that may have beaten nothing at all. */

{
  const line = A.prTimeline([
    session('2026-04-08', [ex('bench', [set(135, 5)]), ex('bench', [set(225, 5)])])
  ]);
  check('prTimeline: no PR from one block beating another in the same session',
        line.length === 0, line.map(p => p.date + ' ' + p.kind + ' ' + p.value).join(', '));

  const beating = [
    session('2026-05-01', [ex('bench', [set(135, 5)])]),
    session('2026-05-08', [ex('bench', [set(185, 5)]), ex('bench', [set(315, 3)])])
  ];
  const real2 = A.prTimeline(beating);
  check('prTimeline: a session that genuinely beats the last one still counts',
        real2.length === 1 && real2[0].date === '2026-05-08');
}

/* ---------- 9. the two history writers agree ----------
   workout.js writes history/{exId} in two places and they disagreed about the
   same session. finishWorkout prepended one entry per occurrence and filtered
   out the same-date entry the previous occurrence had just written, so the LAST
   block of a repeated exercise won and the earlier ones vanished from the "last
   time" line. rebuildHistoryFromLog, which runs after every edit and delete,
   pushed each occurrence instead, so one date appeared on the index N times.
   Editing a session therefore changed what "last time" said without changing a
   single set.

   Both now fold through foldSessionIntoHistory + trimHistory, and those two
   functions are read out of workout.js by source rather than copied here — the
   same rule as the merge itself, because a verifier holding its own copy of the
   thing under test proves nothing. The naive brace scan below is sound only
   because neither body contains a brace inside a string, a regex or a comment;
   if one ever does the slice it writes stops parsing and the import throws,
   which is the loud failure rather than the quiet one. */

const WSRC = readFileSync(join(HERE, '..', 'workout.js'), 'utf8');

// `export` is tolerated and then stripped: some of these are exported purely so
// another verifier can import them, and that must not break this one. The slice
// is re-declared here as a plain function either way.
function fnSource(src, name) {
  let at = src.indexOf('\nfunction ' + name + '(');
  let skip = 1;
  if (at === -1) { at = src.indexOf('\nexport function ' + name + '('); skip = '\nexport '.length; }
  if (at === -1) throw new Error(
    'workout.js no longer declares function ' + name + ' - this verifier drives ' +
    'the real source and has nothing to test');
  let depth = 0;
  for (let j = src.indexOf('{', at); j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) return src.slice(at + skip, j + 1);
  }
  throw new Error('unbalanced braces reading ' + name + ' out of workout.js');
}

writeFileSync(
  join(dir, 'workout-history.mjs'),
  // v55, on purpose: the fold keeps each drop set whole through keepSets.
  "import { mergeSessionExercises, isWorking, keepSets } from './analytics.mjs';\n" +
  // Both helpers read one exercise's rows through this, because `history` comes
  // straight off the wire and RTDB hands an array back as an object the moment
  // its keys stop being contiguous.
  fnSource(WSRC, 'historyRows') + '\n' +
  fnSource(WSRC, 'foldSessionIntoHistory') + '\n' +
  fnSource(WSRC, 'trimHistory') + '\n' +
  'export { foldSessionIntoHistory, trimHistory };\n'
);
const W = await import(pathToFileURL(join(dir, 'workout-history.mjs')).href);

/* The call sites, pinned as text. Extracting the helpers proves they agree with
   each other; these two lines are what proves workout.js actually uses them.

   Both sites now compute the new index into a local and assign `history` only
   after the write resolves, so that module state cannot claim a save the
   database refused — which is why the pinned text names a local rather than
   `history`. What is being pinned is unchanged: that the fold and the trim on
   each path are the shared ones. */

const FINISH_SITE  = 'const nextHistory = trimHistory(foldSessionIntoHistory(history, dateK, done));';
const REBUILD_FOLD = 'h = foldSessionIntoHistory(h, s._date, s.exercises);';
const REBUILD_TRIM = 'const next = trimHistory(h);';

check('sites: finishWorkout folds through the shared pass',
      WSRC.includes(FINISH_SITE));
check('sites: rebuildHistoryFromLog folds through the shared pass',
      WSRC.includes(REBUILD_FOLD) && WSRC.includes(REBUILD_TRIM));
check('sites: the prepend-and-filter that discarded earlier blocks is gone',
      !/\.filter\(h => h\.date !== dateK\)/.test(WSRC));
const IMPORTED = (WSRC.match(/import\s*\{([^}]*)\}\s*from\s*'\.\/analytics\.js'/) || [, ''])[1];
check('sites: the merge is imported from analytics.js, not restated here',
      /\bmergeSessionExercises\b/.test(IMPORTED) &&
      !/function\s+mergeSessionExercises/.test(WSRC),
      'workout.js imports: ' + IMPORTED.replace(/\s+/g, ' ').trim());

/* Path A - finishWorkout, one session at a time as it is lived. dateK there is
   todayKey(session.startedAt), which is the same string as the session's _date;
   `done` is collectDone(), which on these fixtures is the exercise list itself
   because every set carries done:true and numeric weight and reps. */
function pathFinish(sessions) {
  let h = {};
  sessions.forEach(s => { h = W.trimHistory(W.foldSessionIntoHistory(h, s._date, s.exercises)); });
  return h;
}

/* Path B - rebuildHistoryFromLog, from the log, after an edit or a delete. */
function pathRebuild(sessions) {
  let h = {};
  sessions.forEach(s => { h = W.foldSessionIntoHistory(h, s._date, s.exercises); });
  return W.trimHistory(h);
}

/* The two pre-fix bodies, so the run can still go red on the bug. */

function LEGACY_finish(sessions) {
  const history = {};
  sessions.forEach(s => {
    const dateK = s._date;
    (s.exercises || []).forEach(ex => {
      const entry = { date: dateK, sets: ex.sets.filter(A.isWorking).map(x => ({ w: x.w, r: x.r, type: x.type })) };
      if (!entry.sets.length) return;
      history[ex.exId] = [entry, ...(history[ex.exId] || []).filter(h => h.date !== dateK)].slice(0, 20);
    });
  });
  return history;
}

function LEGACY_rebuild(sessions) {
  const h = {};
  sessions.forEach(s => {
    (s.exercises || []).forEach(ex => {
      if (!ex.exId) return;
      const sets = (ex.sets || []).filter(A.isWorking).map(x => ({ w: x.w, r: x.r, type: x.type }));
      if (!sets.length) return;
      (h[ex.exId] = h[ex.exId] || []).push({ date: s._date, sets, _t: s.startedAt });
    });
  });
  Object.keys(h).forEach(k => {
    h[k].sort((a, b) => b._t - a._t);
    h[k] = h[k].slice(0, 20).map(({ date, sets }) => ({ date, sets }));
  });
  return h;
}

/* The fixtures both paths are run over. Byte-identical means JSON.stringify of
   the whole index, so key insertion order counts too - a "last time" index that
   agrees on contents but not on order is still two different writes going to
   the same node. */

const dupSessions = [
  session('2026-06-01', [ex('bench', [set(135, 10), set(225, 5)]), ex('row', [set(135, 8)])]),
  session('2026-06-03', [
    ex('bench', [set(185, 8)]), ex('squat', [set(315, 3)]), ex('bench', [set(205, 5)])
  ]),
  session('2026-06-05', [
    ex('bench', [set(135, 5, 'W')]), ex('bench', [set(225, 5)]),
    ex('bench', [set(235, 3)]),      ex('bench', [set(245, 1)])
  ])
];

const betaAccount = [session('2026-06-08', ['squat', 'bench', 'deadlift', 'ohp', 'row']
  .flatMap(id => [ex(id, [set(135, 5)]), ex(id, [set(135, 5)]),
                  ex(id, [set(135, 5)]), ex(id, [set(135, 5)])]))];

const twiceInOneDay = [
  session('2026-07-02', [ex('bench', [set(185, 5)]), ex('row', [set(135, 8)])]),
  session('2026-07-02', [ex('bench', [set(205, 3)])])
];

const pastTheCap = Array.from({ length: 25 }, (_, i) =>
  session('2026-08-' + String(i + 1).padStart(2, '0'),
          [ex('bench', [set(135 + i, 5)]), ex('bench', [set(140 + i, 3)])]));

const plainLog = [
  session('2026-05-04', [ex('bench', [set(135, 10, 'W')]), ex('bench', [set(225, 5)]), ex('row', [set(135, 8)])]),
  session('2026-05-06', [ex('squat', [set(315, 3)])])
];

const fixtures = [
  ['a plain log with no repeats', plainLog],
  ['the same exId twice in a session', dupSessions],
  ['the beta account - every lift four times, one session', betaAccount],
  ['two sessions on the same day', twiceInOneDay],
  ['twenty-five days, past the twenty-entry cap', pastTheCap]
];

for (const [name, fx] of fixtures) {
  const a = JSON.stringify(pathFinish(fx));
  const b = JSON.stringify(pathRebuild(fx));
  check('two paths: byte-identical on ' + name, a === b,
        'finish  ' + a + '\n       rebuild ' + b);
}

/* The fix has to have moved something, and only on the repeats. */

check('two paths: a log with no repeats writes exactly what it always did',
      JSON.stringify(pathFinish(plainLog)) === JSON.stringify(LEGACY_finish(plainLog)) &&
      JSON.stringify(pathRebuild(plainLog)) === JSON.stringify(LEGACY_rebuild(plainLog)));

check('two paths: the pre-fix writers really did disagree on a repeat',
      JSON.stringify(LEGACY_finish(dupSessions)) !== JSON.stringify(LEGACY_rebuild(dupSessions)) &&
      JSON.stringify(LEGACY_finish(betaAccount)) !== JSON.stringify(LEGACY_rebuild(betaAccount)),
      'this verifier can no longer go red');

/* And what each one got wrong, named rather than merely "different". */

{
  const merged = pathRebuild(dupSessions).bench[0];        // 2026-06-05, newest first
  check('two paths: every block of the repeated day survives, in session order',
        JSON.stringify(merged.sets.map(x => [x.w, x.r])) ===
        JSON.stringify([[225, 5], [235, 3], [245, 1]]),
        JSON.stringify(merged.sets));
  check('two paths: the warm-up is still excluded, as everywhere else',
        merged.sets.every(x => x.type !== 'W'));

  const legacyFin = LEGACY_finish(dupSessions).bench[0];
  check('two paths: the pre-fix finish kept only the LAST block of that day',
        legacyFin.sets.length === 1 && legacyFin.sets[0].w === 245,
        JSON.stringify(legacyFin.sets));
  const legacyReb = LEGACY_rebuild(dupSessions).bench.filter(e => e.date === '2026-06-05');
  check('two paths: the pre-fix rebuild left that one date on the index 3 times',
        legacyReb.length === 3, legacyReb.length + ' entries');
}

{
  const h = pathFinish(twiceInOneDay);
  check('two paths: a second session that day extends the entry, not replaces it',
        h.bench.length === 1 &&
        JSON.stringify(h.bench[0].sets.map(x => [x.w, x.r])) === JSON.stringify([[185, 5], [205, 3]]),
        JSON.stringify(h.bench));
}

{
  const h = pathRebuild(pastTheCap);
  check('two paths: still newest first and capped at 20',
        h.bench.length === 20 && h.bench[0].date === '2026-08-25' &&
        h.bench[19].date === '2026-08-06',
        h.bench.length + ' entries, ' + h.bench[0].date + ' first');
}

/* Idempotency, and why it is a property of the CALL SITE rather than of the
   fold. The fold concatenates onto the day's entry — that is what makes two
   sessions in one day come out as one row holding both — so running one
   session's finish twice doubles that session's sets on the "last time" line.
   The helper cannot tell the two apart and must not try: two identical sessions
   really can be logged on one day. So the guard is in finishWorkout, and all
   three of these move together. */

{
  const s = twiceInOneDay[0];
  let h = W.trimHistory(W.foldSessionIntoHistory({}, s._date, s.exercises));
  h = W.trimHistory(W.foldSessionIntoHistory(h, s._date, s.exercises));
  check('idempotency: the fold itself doubles when a session is folded twice',
        h.bench[0].sets.length === 2, JSON.stringify(h.bench[0].sets));
}

// Any parameter list: v46's `anyway` (the "Save anyway" re-entry from the
// unsaved-sets sheet) comes back through this same guard, which is the point.
check('idempotency: so finishWorkout cannot be re-entered',
      /\nlet finishing = false;/.test(WSRC) &&
      /async function finishWorkout\([^)]*\) \{\n  if \(finishing\) return;\n  finishing = true;/.test(WSRC));

{
  const RECORD_SITE = 'await write(`workouts/${mk}/${dd}/${session.id}`, record);';
  const between = WSRC.slice(WSRC.indexOf(RECORD_SITE), WSRC.indexOf(FINISH_SITE));
  check('idempotency: and the live session is dropped the moment the record exists',
        WSRC.indexOf(RECORD_SITE) !== -1 && between.includes("LS.del('activeSession');"),
        'a relaunch after a kill would otherwise replay the finish');
}

/* history comes straight off the wire, and RTDB returns an array as an object
   as soon as its keys stop being contiguous from zero. Before historyRows() a
   node in that shape threw inside finishWorkout — after the session had been
   written to the log and before the live session was cleared, which leaves a
   saved workout on screen as though it were still in progress. */

{
  const s = plainLog[0];
  const wire = { bench: { 0: { date: '2026-05-01', sets: [{ w: 200, r: 5, type: 'N' }] },
                          2: { date: '2026-05-02', sets: [{ w: 210, r: 5, type: 'N' }] } } };
  let out = null, threw = null;
  try { out = W.trimHistory(W.foldSessionIntoHistory(wire, s._date, s.exercises)); }
  catch (e) { threw = e.message; }
  check('malformed index: an object-shaped node does not throw the finish', !threw, threw);
  check('malformed index: its rows are kept, not dropped on the floor',
        !!out && out.bench.length === 3, out && JSON.stringify(out.bench));
}

{
  let threw = null;
  try { W.trimHistory({ bench: 'nonsense' }); } catch (e) { threw = e.message; }
  check('malformed index: an unreadable node is dropped rather than thrown on', !threw, threw);
}

/* ---------- report ---------- */

console.log('\nmerge invariant - one entry per exId per session\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
