#!/usr/bin/env node
//
// Verifier for lifting blocks — TRAIN-OVERHAUL-DECISIONS.md Q2/Q3.
//
//   node tools-check/blocks.mjs
//
// The decision this exists to protect is the storage one:
//
//   A block is an ANNOTATION on the existing session.exercises array — a block
//   number on the exercise object — NOT a new nesting level in the record.
//
// detectPRs, computeVolume, sessionMilestones, history, analytics, stats, the
// published validation rules and the native port all read
// workouts/{YYYY-MM}/{DD}/{sessionId} as it already is, and 219 existing
// sessions carry no annotation at all, which has to keep meaning "ungrouped".
// So the checks below are not really about the buttons: they are about the
// record coming out of collectDone with the same keys it always had, one number
// added, and about an un-annotated session going through every one of these
// functions unchanged.
//
// Nothing here holds a copy of the code under test. The pure block model is
// IMPORTED from the real blocks.js — the same module workout.js and the routine
// editor both import — and the session-only half (the check box, collectDone,
// editWorkout, dupSet) is read out of the REAL workout.js by source text and
// driven exactly as the screen drives them. Same rule merge-invariant.mjs
// follows, because a verifier carrying its own copy of the thing it verifies
// proves only that the copy agrees with itself. analytics.js is imported whole
// (with store.js stubbed, since it pulls the Firebase SDK off gstatic and
// cannot load under Node) so the counting section runs a duplicated block
// through the app's own exerciseIndex rather than an idea of it.
//
// That split is also the proof of the extraction: the model moved to blocks.js
// without the screen changing, and every check below that passed before it
// passes after it, driving the moved code at its new address.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const WSRC = readFileSync(join(HERE, '..', 'workout.js'), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(HERE, '..', p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-blocks-'));

/* ---------- analytics.js, the real one ---------- */

writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_path, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
writeFileSync(
  join(dir, 'analytics.mjs'),
  readFileSync(join(HERE, '..', 'analytics.js'), 'utf8')
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './ui.js'", 'from ' + real('ui.js'))
    .replace("from './units.js'", 'from ' + real('units.js'))
);
const A = await import(pathToFileURL(join(dir, 'analytics.mjs')).href);

/* ---------- the session-only half, lifted out of workout.js ----------
   The naive brace scan is sound only because none of these bodies contains a
   brace inside a string, a regex or a comment. If one ever does, the slice it
   writes stops parsing and the import throws — the loud failure rather than the
   quiet one. */

function fnSource(name) {
  const at = WSRC.indexOf('\nfunction ' + name + '(');
  if (at === -1) throw new Error(
    'workout.js no longer declares function ' + name + ' — this verifier drives ' +
    'the real source and has nothing to test');
  let depth = 0;
  for (let j = WSRC.indexOf('{', at); j < WSRC.length; j++) {
    if (WSRC[j] === '{') depth++;
    else if (WSRC[j] === '}' && --depth === 0) return WSRC.slice(at + 1, j + 1);
  }
  throw new Error('unbalanced braces reading ' + name + ' out of workout.js');
}

const LIFTED = ['blockHasLogged', 'newExercise', 'dupSet', 'collectDone', 'editWorkout'];

// The pure model, by name, as blocks.js exports it. Listed rather than splatted
// so a function quietly disappearing from the module is an import error here.
const SHARED = [
  'blockOrder', 'sessionBlocks', 'normalizeBlocks', 'blockEnd',
  'addBlock', 'addToBlock', 'duplicateBlock', 'deleteBlock', 'sessionLayout'
];

/* collectDone and editWorkout read and write the module's `session`, and
   editWorkout ends by repainting the screen. Both get exactly what workout.js
   gives them — a module-scoped `session`, a render(), and the real blocks.js in
   scope under the same names workout.js imports it under — so the bodies run as
   written rather than as adapted. */
writeFileSync(
  join(dir, 'blocks.mjs'),
  'import { ' + SHARED.join(', ') + ' } from ' + real('blocks.js') + ';\n' +
  'let session = null;\n' +
  'function render() {}\n' +
  LIFTED.map(fnSource).join('\n') + '\n' +
  'export function setSession(s) { session = s; }\n' +
  'export function getSession() { return session; }\n' +
  'export { ' + SHARED.concat(LIFTED).join(', ') + ' };\n'
);
const B = await import(pathToFileURL(join(dir, 'blocks.mjs')).href);

/* ---------- harness ---------- */

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail++; results.push('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

const ex = (exId, sets, extra = {}) => ({
  exId, name: exId, group: 'chest', equipment: 'barbell', sets, ...extra
});
const set = (w, r, done = true, type = 'N') => ({ w, r, type, done });
const live = exercises => ({ id: 'w1', name: 'Push day', startedAt: 1, exercises });
const kinds = rows => rows.map(r => r.kind === 'ex' ? 'ex' : 'block' + r.block).join(',');

/* The record's exercise objects have carried these four keys plus `sets` since
   the schema was written down (AGENTS.md, workouts/{YYYY-MM}/{DD}/{sessionId}).
   `block` is the one addition, and the point of the next section is that it is
   the ONLY addition. */
const EX_KEYS  = ['exId', 'name', 'group', 'equipment', 'sets', 'block'];
const SET_KEYS = ['w', 'r', 'type', 'done'];

/* ---------- 1. annotate ---------- */

{
  // Empty block first, exactly as the button makes it: nothing is added to
  // session.exercises, because an empty block has no exercise to annotate.
  let s = live([ex('bench', [set(225, 5)])]);
  let next = B.addBlock(s);
  check('annotate: an empty block adds nothing to session.exercises',
        next.exercises.length === 1 && next.exercises[0].block === undefined,
        JSON.stringify(next.exercises));
  check('annotate: the block is remembered on the session instead',
        JSON.stringify(next.blocks) === '[1]', JSON.stringify(next.blocks));

  s = { ...s, ...next };
  next = B.addToBlock(s, 1, [B.newExercise({ id: 'squat', name: 'Squat', group: 'legs', equipment: 'barbell' }, false)]);
  check('annotate: an exercise added inside the block carries block: 1',
        next.exercises[1].block === 1, JSON.stringify(next.exercises[1]));
  check('annotate: the ungrouped exercise beside it is untouched',
        next.exercises[0].block === undefined && next.exercises[0].exId === 'bench');
  check('annotate: the annotation is a plain number, not a nested object',
        typeof next.exercises[1].block === 'number');

  // Blocks and ungrouped exercises coexist; the block keeps its position.
  const rows = B.sessionLayout(next.exercises, next.blocks);
  check('annotate: layout is the ungrouped exercise then the block',
        kinds(rows) === 'ex,block1', kinds(rows));
  check('annotate: an empty block still gets a row so it can be filled',
        kinds(B.sessionLayout([], [1, 2])) === 'block1,block2');
}

/* ---------- 2. an un-annotated session is the one that must not move ----------
   219 of them exist. Every function here has to be invisible to them. */

{
  const plain = [
    ex('bench', [set(135, 10, true, 'W'), set(225, 5), set(225, 5)]),
    ex('row',   [set(135, 8)])
  ];
  const before = JSON.stringify(plain);

  check('old session: no annotation means no blocks',
        JSON.stringify(B.blockOrder(plain)) === '[]' &&
        JSON.stringify(B.sessionBlocks({ exercises: plain })) === '[]');
  check('old session: every row renders ungrouped, in order',
        kinds(B.sessionLayout(plain, B.sessionBlocks({ exercises: plain }))) === 'ex,ex');

  const norm = B.normalizeBlocks(plain, []);
  check('old session: normalize returns the very same objects',
        norm.exercises.every((e, i) => e === plain[i]) && JSON.stringify(plain) === before);

  B.setSession({ exercises: plain });
  const done = B.collectDone();
  check('old session: collectDone output is unchanged by any of this',
        JSON.stringify(done) === JSON.stringify([
          { exId: 'bench', name: 'bench', group: 'chest', equipment: 'barbell',
            sets: [set(135, 10, true, 'W'), set(225, 5), set(225, 5)] },
          { exId: 'row', name: 'row', group: 'chest', equipment: 'barbell',
            sets: [set(135, 8)] }
        ]), JSON.stringify(done));
  check('old session: not one exercise gains a block key',
        done.every(e => !('block' in e)));

  // And reopening one of the 219 from the calendar.
  B.editWorkout({ id: 'w9', name: 'Push', startedAt: 10, exercises: plain }, '2026-03', '02');
  const reopened = B.getSession();
  check('old session: reopening it produces no blocks at all',
        JSON.stringify(reopened.blocks) === '[]' &&
        reopened.exercises.every(e => !('block' in e)),
        JSON.stringify(reopened.blocks));
  check('old session: reopening still marks every set done, as the record implies',
        reopened.exercises.every(e => e.sets.every(x => x.done === true)));
}

/* ---------- 3. duplicate — the point of the feature ---------- */

{
  let s = live([
    ex('curl', [set(30, 12)], { block: 1 }),
    ex('dip',  [set(0, 15)],  { block: 1 }),
    ex('bench', [set(225, 5)])
  ]);
  s.blocks = [1];

  const rows = B.sessionLayout(s.exercises, s.blocks);
  check('duplicate: the button is live once the block holds an exercise',
        rows[0].items.length === 2);
  check('duplicate: and dead while it is empty — that is the same test',
        B.sessionLayout([], [1])[0].items.length === 0);

  // The done seeding is the caller's now — blocks.js copies a set opaquely, and
  // workout.js hands it dupSet(editing). Driven through the real dupSet so the
  // two halves are tested joined, exactly as the screen joins them.
  const next = B.duplicateBlock(s, 1, { copySet: B.dupSet(false) });
  check('duplicate: the copy lands immediately after the block it came from',
        next.exercises.map(e => e.exId + ':' + (e.block || '-')).join(' ') ===
        'curl:1 dip:1 curl:2 dip:2 bench:-',
        next.exercises.map(e => e.exId + ':' + (e.block || '-')).join(' '));
  check('duplicate: blocks are auto-numbered 1, 2',
        JSON.stringify(next.blocks) === '[1,2]');
  check('duplicate: weights and reps come across filled in',
        next.exercises[2].sets[0].w === 30 && next.exercises[2].sets[0].r === 12 &&
        next.exercises[3].sets[0].w === 0 && next.exercises[3].sets[0].r === 15);
  check('duplicate: NOTHING is checked in the copy',
        next.exercises[2].sets.concat(next.exercises[3].sets).every(x => x.done === false));
  check('duplicate: the original keeps its ticks',
        next.exercises[0].sets[0].done === true);
  check('duplicate: the ungrouped exercise is not dragged into a block',
        next.exercises[4].exId === 'bench' && next.exercises[4].block === undefined);
  check('duplicate: the copy is a copy, not a shared reference',
        next.exercises[2].sets[0] !== s.exercises[0].sets[0]);
  // The shared function must not know what a session's set looks like, or the
  // routine editor — whose sets are tw/tr/type — gets w/r/done grafted on.
  const opaque = B.duplicateBlock(s, 1);
  check('duplicate: with no copySet the sets come across exactly as they were',
        JSON.stringify(opaque.exercises[2].sets) === JSON.stringify(s.exercises[0].sets) &&
        opaque.exercises[2].sets[0] !== s.exercises[0].sets[0],
        JSON.stringify(opaque.exercises[2].sets));

  // Editing a past session is the one case where the copy is born done:
  // collectDone keeps only sets marked done, so an unticked copy made on the
  // edit screen would silently vanish on save — the same rule as + Set.
  const edited = B.duplicateBlock(s, 1, { copySet: B.dupSet(true) });
  check('duplicate: while editing a past session the copy is born done',
        edited.exercises[2].sets.every(x => x.done === true));

  // Duplicating the middle block renumbers everything after it.
  let three = live([
    ex('a', [set(10, 10)], { block: 1 }),
    ex('b', [set(20, 10)], { block: 2 }),
    ex('c', [set(30, 10)], { block: 3 })
  ]);
  three.blocks = [1, 2, 3];
  const mid = B.duplicateBlock(three, 2, { copySet: B.dupSet(false) });
  check('duplicate: the middle block renumbers the ones after it',
        mid.exercises.map(e => e.exId + ':' + e.block).join(' ') === 'a:1 b:2 b:3 c:4',
        mid.exercises.map(e => e.exId + ':' + e.block).join(' '));
  check('duplicate: the stored number and the label stay the same number',
        JSON.stringify(mid.blocks) === '[1,2,3,4]');
}

/* ---------- 4. delete ---------- */

{
  let s = live([
    ex('curl', [set(30, 12)], { block: 1 }),
    ex('bench', [set(225, 5)]),
    ex('dip', [set(0, 15, false)], { block: 2 })
  ]);
  s.blocks = [1, 2];

  check('delete: a block holding a logged set asks first',
        B.blockHasLogged(s.exercises, 1) === true);
  check('delete: one holding nothing logged does not',
        B.blockHasLogged(s.exercises, 2) === false);
  check('delete: nor does an empty block',
        B.blockHasLogged(s.exercises, 3) === false);

  const next = B.deleteBlock(s, 1);
  check('delete: the block and its exercises go together',
        next.exercises.map(e => e.exId).join(' ') === 'bench dip');
  check('delete: what is left is renumbered so Block 2 becomes Block 1',
        next.exercises[1].block === 1 && JSON.stringify(next.blocks) === '[1]');
  check('delete: the ungrouped exercise survives it',
        next.exercises[0].exId === 'bench' && next.exercises[0].block === undefined);

  // A dangling annotation — a stale localStorage session, say — falls back to
  // ungrouped rather than taking the sets with it.
  const orphan = B.normalizeBlocks([ex('curl', [set(30, 12)], { block: 7 })], []);
  check('delete: an exercise whose block is gone becomes ungrouped, not lost',
        orphan.exercises.length === 1 && !('block' in orphan.exercises[0]));

  // Emptying a block by the exercise's own ⋯ menu, which knows nothing about
  // blocks: what is left must not read "Block 2" above "Block 1".
  const emptied = B.normalizeBlocks([ex('dip', [set(0, 15)], { block: 2 })], [1, 2]);
  check('delete: emptying a block renumbers what is left top to bottom',
        emptied.exercises[0].block === 1 && JSON.stringify(emptied.blocks) === '[1,2]');
  check('delete: and the emptied one goes to the end, where it now renders',
        kinds(B.sessionLayout(emptied.exercises, emptied.blocks)) === 'block1,block2');
  check('delete: normalize is a fixed point, so re-running it changes nothing',
        JSON.stringify(B.normalizeBlocks(emptied.exercises, emptied.blocks)) ===
        JSON.stringify(emptied));
}

/* ---------- 5. the record shape does not change ---------- */

{
  B.setSession(live([
    ex('curl', [set(30, 12), { w: '', r: '', type: 'N', done: false }], { block: 1 }),
    ex('curl', [set(30, 11)], { block: 2 }),
    ex('bench', [set(225, 5, true, 'W'), set(315, 3)])
  ]));
  const done = B.collectDone();

  check('record: collectDone preserves the annotation',
        done.map(e => e.block).join(',') === '1,2,',
        JSON.stringify(done.map(e => e.block)));
  check('record: exercises are still a FLAT array — no block container appears',
        Array.isArray(done) && done.every(e => Array.isArray(e.sets) &&
          e.sets.every(x => typeof x === 'object' && !Array.isArray(x))));
  check('record: no exercise carries any key the schema does not know',
        done.every(e => Object.keys(e).every(k => EX_KEYS.includes(k))),
        JSON.stringify(done.map(e => Object.keys(e))));
  check('record: no set carries any key the schema does not know',
        done.every(e => e.sets.every(x => Object.keys(x).every(k => SET_KEYS.includes(k)))));
  check('record: the unfilled set is still dropped, annotation or not',
        done[0].sets.length === 1);
  check('record: session.blocks never reaches the record',
        done.every(e => !('blocks' in e)) && !('blocks' in { ...done }));

  // An empty block simply vanishes, and so does one whose exercises went
  // unlogged — collectDone already drops an exercise with no done sets, so
  // there is nothing left to annotate and nothing to write.
  B.setSession({ ...live([
    ex('curl', [set(30, 12)], { block: 1 }),
    ex('dip',  [{ w: '', r: '', type: 'N', done: false }], { block: 2 })
  ]), blocks: [1, 2, 3] });
  const partial = B.collectDone();
  check('record: an empty block leaves no trace in the record',
        partial.length === 1 && partial[0].exId === 'curl' && partial[0].block === 1,
        JSON.stringify(partial));
  check('record: a block whose sets all went unlogged leaves no trace either',
        JSON.stringify(B.blockOrder(partial)) === '[1]');

  // And when it is the FIRST block that goes, the survivors renumber on the way
  // IN. Otherwise the record stores "block 2" as the only block in a session
  // that showed one block on screen, and a reader that labels blocks straight
  // off the annotation — which is what native will do — disagrees with the app
  // that wrote it. Reopening and saving that record with no other change would
  // also rewrite it from 2 to 1: a no-op edit mutating stored data.
  B.setSession({ ...live([
    ex('curl', [{ w: '', r: '', type: 'N', done: false }], { block: 1 }),
    ex('dip',  [set(0, 15)], { block: 2 }),
    ex('row',  [set(95, 10)], { block: 2 })
  ]), blocks: [1, 2] });
  const survivors = B.collectDone();
  check('record: the surviving blocks are renumbered 1..N on the way in',
        JSON.stringify(B.blockOrder(survivors)) === '[1]',
        JSON.stringify(survivors.map(e => e.exId + ':' + e.block)));
  B.editWorkout({ id: 'w3', name: 'x', startedAt: 1, exercises: survivors }, '2026-09', '14');
  B.setSession(B.getSession());
  check('record: so a re-edit with no change rewrites nothing',
        JSON.stringify(B.collectDone().map(e => e.block)) ===
        JSON.stringify(survivors.map(e => e.block)));
}

/* ---------- 6. a duplicated block survives finish and re-edit ---------- */

{
  // The live session: block 1 done twice, an ungrouped exercise beside it.
  B.setSession({ ...live([
    ex('curl', [set(30, 12)], { block: 1 }),
    ex('dip',  [set(0, 15)],  { block: 1 }),
    ex('curl', [set(30, 10)], { block: 2 }),
    ex('dip',  [set(0, 12)],  { block: 2 }),
    ex('bench', [set(225, 5)])
  ]), blocks: [1, 2] });

  // finishWorkout builds the record as `exercises: done` — the call site is
  // pinned as text further down, so this is the record the app writes.
  const record = {
    id: 'w1', name: 'Push day', startedAt: 1, endedAt: 2, durationSec: 1,
    volume: 0, groups: ['chest'], exercises: B.collectDone()
  };

  check('round trip: the record holds five exercises, annotated 1 1 2 2 and none',
        record.exercises.map(e => e.block || '-').join(' ') === '1 1 2 2 -',
        record.exercises.map(e => e.block || '-').join(' '));
  check('round trip: the record is plain JSON, unchanged in shape',
        JSON.parse(JSON.stringify(record)).exercises.length === 5);

  B.editWorkout(record, '2026-09', '14');
  const re = B.getSession();
  check('round trip: reopening rebuilds both blocks from the annotation alone',
        JSON.stringify(re.blocks) === '[1,2]', JSON.stringify(re.blocks));
  check('round trip: every exercise lands back in the block it was in',
        re.exercises.map(e => e.exId + ':' + (e.block || '-')).join(' ') ===
        'curl:1 dip:1 curl:2 dip:2 bench:-',
        re.exercises.map(e => e.exId + ':' + (e.block || '-')).join(' '));
  check('round trip: the screen redraws as two blocks and an ungrouped exercise',
        kinds(B.sessionLayout(re.exercises, re.blocks)) === 'block1,block2,ex');
  check('round trip: the weights and reps come back with it',
        re.exercises[2].sets[0].w === 30 && re.exercises[2].sets[0].r === 10);

  // Saving it again has to produce the same record. If a re-edit renumbered or
  // dropped an annotation, the second save would disagree with the first.
  // Compared by content, not by key order: RTDB stores an object unordered, and
  // the reopened session builds its exercises in a different order of keys than
  // the live one did.
  const canon = v => JSON.stringify(v, (k, x) =>
    (x && typeof x === 'object' && !Array.isArray(x))
      ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {})
      : x);
  B.setSession(re);
  check('round trip: saving the reopened session writes the same exercises back',
        canon(B.collectDone()) === canon(record.exercises),
        canon(B.collectDone()));

  // A gap in the numbering — block 2 lost all its sets at finish — closes on
  // reopen rather than printing "Block 1" beside "Block 3".
  B.editWorkout({ id: 'w2', name: 'x', startedAt: 1, exercises: [
    ex('curl', [{ w: 30, r: 12, type: 'N' }], { block: 1 }),
    ex('dip',  [{ w: 0,  r: 15, type: 'N' }], { block: 3 })
  ] }, '2026-09', '14');
  check('round trip: a gap left by a dropped block closes on reopen',
        JSON.stringify(B.getSession().blocks) === '[1,2]' &&
        B.getSession().exercises[1].block === 2);
}

/* ---------- 7. per-occurrence counting is not re-introduced ----------
   A duplicated block puts the same exId in one session twice. That is expected,
   and analytics.js already answers it: one logical entry per exercise per
   session, sets concatenated in session order. These checks run the real
   exerciseIndex over a real duplicated block, so anything that starts counting
   occurrences again — here or there — shows up as "2 sessions" for a lifter who
   trained once. */

{
  B.setSession({ ...live([
    ex('curl', [set(30, 12), set(30, 12)], { block: 1 }),
    ex('curl', [set(30, 10), set(30, 10)], { block: 2 })
  ]), blocks: [1, 2] });
  const s = { id: 'w1', startedAt: 1, _date: '2026-09-14', exercises: B.collectDone() };

  const idx = A.exerciseIndex([s]);
  check('counting: a block done twice is ONE session for that exercise',
        idx.curl.sessions === 1 && idx.curl.entries.length === 1,
        idx.curl.sessions + ' sessions');
  check('counting: all four sets are still counted — only the row count merged',
        idx.curl.totalSets === 4 && idx.curl.totalReps === 44);
  check('counting: volume is the real volume of both blocks',
        idx.curl.totalVolume === 30 * 44);
  check('counting: the merge concatenates in session order',
        JSON.stringify(A.mergeSessionExercises(s.exercises)[0].sets.map(x => x.r)) ===
        JSON.stringify([12, 12, 10, 10]));
}

/* ---------- 8. the call sites, pinned as text ----------
   Extracting the functions proves they behave; these lines are what prove
   workout.js actually uses them, and that nothing here went round ship 1's two
   guards. */

{
  check('sites: the session screen lays itself out through sessionLayout',
        WSRC.includes('sessionLayout(session.exercises, blocks).forEach(row => {'));
  check('sites: and renumbers on the way in, so the label is the stored number',
        WSRC.includes('const laid = normalizeBlocks(session.exercises, sessionBlocks(session));'));
  check('sites: Add Lifting Block sits beside a halved Add exercise',
        /const addRow = el\('div', 'add-row'\);/.test(WSRC) &&
        WSRC.includes("'+  Add exercise'") &&
        WSRC.includes("'+  Add Lifting Block'"));
  check('sites: the block has its own Add exercise, going through addToBlock',
        WSRC.includes('commitBlocks(addToBlock(session, n, chosen.map(x => newExercise(x, editing))))'));
  check('sites: duplicate and delete go through the pure functions',
        WSRC.includes('commitBlocks(duplicateBlock(session, n, { copySet: dupSet(editing) }))') &&
        WSRC.includes('commitBlocks(deleteBlock(session, n))'));
  check('sites: the pure model is imported, not redeclared, in workout.js',
        WSRC.includes("from './blocks.js'") &&
        SHARED.every(n => !new RegExp('\\nfunction ' + n + '\\(').test(WSRC)),
        SHARED.filter(n => new RegExp('\\nfunction ' + n + '\\(').test(WSRC)).join(', '));
  check('sites: deleting a block with logged sets goes through confirmSheet',
        /blockHasLogged\(session\.exercises, n\)[\s\S]{0,400}confirmSheet\(\{/.test(WSRC));
  check('sites: the duplicate button is disabled until the block holds something',
        WSRC.includes('dup.disabled = !row.items.length;'));
  check('sites: editWorkout rebuilds the blocks from the annotation',
        WSRC.includes('blockOrder(record.exercises)') &&
        WSRC.includes('exercises: grouped.exercises') &&
        WSRC.includes('blocks: grouped.blocks'));
  check('sites: finish and save still write `exercises: done` and nothing else',
        (WSRC.match(/^\s*exercises: done$/gm) || []).length === 2);
  check('sites: the record is still a per-session write, not a container PUT',
        WSRC.includes('await write(`workouts/${mk}/${dd}/${session.id}`, record)'));

  // Ship 1's two guards. Blocks add no write() of their own; if that ever
  // stops being true, this is where it surfaces.
  const paths = (WSRC.match(/await write\(([^,]+),/g) || [])
    .map(x => x.replace(/^await write\(/, '').replace(/,$/, '').trim()).sort();
  check('guards: workout.js still writes exactly the four nodes it always did',
        JSON.stringify(paths) === JSON.stringify([
          "'history'", "'history'", '`workouts/${mk}/${dd}/${session.id}`', '`workouts/${mk}`'
        ]), JSON.stringify(paths));
  check('guards: saveMonth still refuses a month this device never read',
        WSRC.includes('if (!hydrated.has(mk)) {') &&
        WSRC.includes('was never read on this device'));
  check('guards: nothing about blocks reaches the record but the annotation',
        !/session\.blocks[^\n]*write\(/.test(WSRC));
}

let R;   // routines.js's own maps, lifted in section 9 and reused in section 10

/* ---------- 9. the round trip through a routine ----------
   A routine is the one place a block leaves the session and comes back. Both
   directions live in routines.js as `exercises` maps that rebuild the object
   key by key, so a key that is not named there is dropped — which is exactly
   how blocks came to not survive being saved as a routine.

   Neither direction is re-implemented here. `toSession` is a plain top-level
   function and lifts the same way workout.js's do; the record -> routine map is
   buried in a sheet full of DOM, so the expression itself is cut out and driven
   on its own. What is being protected is that the two maps carry `block`, and
   that they are still the ONLY thing that carries it — a routine that grew a
   stored `blocks` array would be a second source of truth for the same fact. */

{
  const RSRC = readFileSync(join(HERE, '..', 'routines.js'), 'utf8');

  // Same naive scan workout.js's fnSource uses, and sound for the same reason:
  // none of these bodies has a bracket inside a string, a regex or a comment.
  const scanBody = (src, at) => {
    let depth = 0;
    for (let j = src.indexOf('{', at); j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) return src.slice(at, j + 1);
    }
    throw new Error('unbalanced braces reading routines.js at ' + at);
  };

  // The record -> routine map is one expression inside a statement, so it is
  // read to the semicolon that ends it rather than to a matching brace.
  const scanExpr = (src, at) => {
    let depth = 0;
    for (let j = at; j < src.length; j++) {
      const c = src[j];
      if (c === '{' || c === '(' || c === '[') depth++;
      else if (c === '}' || c === ')' || c === ']') depth--;
      else if (c === ';' && depth === 0) return src.slice(at, j);
    }
    throw new Error('no statement end reading the record -> routine map');
  };

  const toSessionAt = RSRC.indexOf('\nfunction toSession(');
  if (toSessionAt === -1) throw new Error(
    'routines.js no longer declares function toSession — this verifier drives ' +
    'the real source and has nothing to test');

  // The editor's save step. It is the whole of the single-source-of-truth
  // guarantee — normalize the annotations, drop the transient order — so it is
  // driven here rather than described.
  const forStorageAt = RSRC.indexOf('\nfunction forStorage(');
  if (forStorageAt === -1) throw new Error(
    'routines.js no longer declares function forStorage — the editor\'s save ' +
    'step moved and this verifier cannot find it');

  const mapAt = RSRC.indexOf('r.exercises = (record.exercises || []).map(');
  if (mapAt === -1) throw new Error(
    'routines.js no longer builds r.exercises from record.exercises — the ' +
    'record -> routine direction moved and this verifier cannot find it');

  writeFileSync(
    join(dir, 'routines-maps.mjs'),
    'import { ' + SHARED.join(', ') + ' } from ' + real('blocks.js') + ';\n' +
    scanBody(RSRC, toSessionAt + 1) + '\n' +
    scanBody(RSRC, forStorageAt + 1) + '\n' +
    'export function routineFromRecord(record) { return ' +
    scanExpr(RSRC, mapAt + 'r.exercises = '.length) + '; }\n' +
    'export { toSession, forStorage };\n'
  );
  R = await import(pathToFileURL(join(dir, 'routines-maps.mjs')).href);

  // A finished block workout, straight out of collectDone: two exercises in
  // block 1, one ungrouped beside them.
  B.setSession(live([
    ex('bench', [set(225, 5), set(225, 5)], { block: 1 }),
    ex('row',   [set(135, 8)],              { block: 1 }),
    ex('curl',  [set(40, 12)])
  ]));
  const record = { name: 'Push day', exercises: B.collectDone() };
  check('routine: the record going in carries the annotation',
        record.exercises.map(e => e.block || 0).join(',') === '1,1,0',
        JSON.stringify(record.exercises.map(e => e.block)));

  // record -> routine
  const rex = R.routineFromRecord(record);
  check('routine: saving a block workout as a routine keeps block: 1',
        rex[0].block === 1 && rex[1].block === 1, JSON.stringify(rex.map(e => e.block)));
  check('routine: the ungrouped exercise gains no block key',
        !('block' in rex[2]), JSON.stringify(rex[2]));
  check('routine: the stored routine gains no blocks array of its own',
        rex.every(e => !('blocks' in e)));
  check('routine: the targets are still placeholders, never values',
        rex[0].sets.every(s => s.tw !== '' && s.w === undefined && s.r === undefined),
        JSON.stringify(rex[0].sets));

  // routine -> live session
  const s = R.toSession({ name: 'Push day', exercises: rex });
  check('routine: starting it brings the annotation back',
        s.exercises[0].block === 1 && s.exercises[1].block === 1,
        JSON.stringify(s.exercises.map(e => e.block)));
  check('routine: and still no blocks array on the session object',
        s.blocks === undefined);
  check('routine: the weights come back blank, the targets come back set',
        s.exercises[0].sets.every(x => x.w === '' && x.r === '' && x.tw !== ''),
        JSON.stringify(s.exercises[0].sets));

  // startWorkout spreads that object as-is and sets no `blocks`, so this is the
  // session the screen actually gets.
  const started = { id: 'w2', name: s.name, startedAt: 1, exercises: s.exercises };
  check('routine: sessionBlocks reconstructs the block from the annotation alone',
        JSON.stringify(B.sessionBlocks(started)) === '[1]',
        JSON.stringify(B.sessionBlocks(started)));

  const rows = B.sessionLayout(started.exercises, B.sessionBlocks(started));
  check('routine: the block gets its own row on screen',
        kinds(rows) === 'block1,ex', kinds(rows));
  // Found rather than indexed: with the annotation dropped there is no block
  // row at all, and that has to read as a failed check, not a thrown report.
  const blockRow = rows.find(row => row.kind !== 'ex');
  check('routine: the duplicate button is live — the block holds two exercises',
        !!blockRow && blockRow.items.length === 2,
        blockRow ? String(blockRow.items.length) : 'there is no block row at all');

  // The two operations the bug report named.
  const dup = B.duplicateBlock(started, 1, false);
  check('routine: duplicating the restored block makes block 2',
        JSON.stringify(dup.blocks) === '[1,2]' &&
        dup.exercises.filter(e => e.block === 2).length === 2,
        JSON.stringify(dup.exercises.map(e => e.block)));

  check('routine: the block check box has sets to act on',
        B.blockHasLogged(started.exercises, 1) === false &&
        started.exercises.filter(e => e.block === 1)
          .every(e => e.sets.every(x => !x.done)),
        'a freshly started routine has nothing ticked yet');

  // Pinned as text, because the maps are what the bug was.
  const CARRY = '...(ex.block ? { block: ex.block } : null)';
  check('routine: both maps in routines.js use the record path\'s own idiom',
        (RSRC.split(CARRY).length - 1) === 2, (RSRC.split(CARRY).length - 1) + ' occurrences');
}

/* ---------- 10. open -> edit -> save, in the routine editor ----------
   The editor holds a block order in memory, which is the one thing a routine is
   not allowed to store. These checks run the real forStorage — the function the
   Save button writes through — over a draft that has been edited every way the
   editor can edit one, and ask for the same two things each time: the
   annotations survive, and no `blocks` array reaches the stored object. */

{
  const RSRC = readFileSync(join(HERE, '..', 'routines.js'), 'utf8');
  const dir2 = mkdtempSync(join(tmpdir(), 'rack-routines-'));
  const scanBody = (src, at) => {
    let depth = 0;
    for (let j = src.indexOf('{', at); j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) return src.slice(at, j + 1);
    }
    throw new Error('unbalanced braces reading routines.js at ' + at);
  };
  const lift = name => {
    const at = RSRC.indexOf('\nfunction ' + name + '(');
    if (at === -1) throw new Error(
      'routines.js no longer declares function ' + name + ' — this verifier ' +
      'drives the real source and has nothing to test');
    return scanBody(RSRC, at + 1);
  };
  writeFileSync(
    join(dir2, 'editor.mjs'),
    'import { ' + SHARED.join(', ') + ' } from ' + real('blocks.js') + ';\n' +
    lift('forStorage') + '\n' + lift('newExercise') + '\n' +
    'export { forStorage, newExercise };\n'
  );
  const E = await import(pathToFileURL(join(dir2, 'editor.mjs')).href);

  const tset = (tw, tr, type = 'N') => ({ tw, tr, type });
  const rex = (exId, sets, extra = {}) => ({
    exId, name: exId, group: 'chest', equipment: 'barbell', sets, ...extra
  });
  // As it comes off the wire: annotations, and no blocks array. This is the
  // exact shape v35 leaves behind after "save a block workout as a routine".
  const stored = {
    id: 'r1', name: 'Push A', note: '', created: 1, lastUsed: 0, uses: 0,
    exercises: [
      rex('bench', [tset('225', '5'), tset('225', '5')], { block: 1 }),
      rex('row',   [tset('135', '8')],                   { block: 1 }),
      rex('curl',  [tset('40', '12')])
    ]
  };

  // openEditor's first move, on a copy — the sheet edits a clone.
  const draft = JSON.parse(JSON.stringify(stored));
  draft.blocks = B.blockOrder(draft.exercises);
  check('editor: opening a stored routine rebuilds the block from the annotation',
        JSON.stringify(draft.blocks) === '[1]', JSON.stringify(draft.blocks));
  check('editor: and lays it out as one block and one ungrouped exercise',
        kinds(B.sessionLayout(draft.exercises, draft.blocks)) === 'block1,ex',
        kinds(B.sessionLayout(draft.exercises, draft.blocks)));
  check('editor: a routine with no annotations opens flat, exactly as before',
        JSON.stringify(B.blockOrder([rex('bench', [tset('225', '5')])])) === '[]');

  // Save it straight back: a no-op edit must rewrite nothing.
  const saved = E.forStorage(draft);
  check('editor: saving carries every annotation back unchanged',
        JSON.stringify(saved.exercises.map(e => e.block || 0)) === '[1,1,0]',
        JSON.stringify(saved.exercises.map(e => e.block)));
  check('editor: the stored routine has NO blocks array',
        !('blocks' in saved), JSON.stringify(Object.keys(saved)));
  check('editor: nor does any exercise in it',
        saved.exercises.every(e => !('blocks' in e)));
  check('editor: a no-op open-edit-save rewrites nothing at all',
        JSON.stringify(saved) === JSON.stringify(stored),
        JSON.stringify(saved));
  check('editor: the draft it was built from is not mutated into carrying one',
        Array.isArray(draft.blocks) && saved !== draft);
  check('editor: the targets are still targets, not values',
        saved.exercises[0].sets.every(s => s.tw !== undefined && s.w === undefined));

  // + Add Lifting Block, then + Add exercise inside it.
  let next = B.addBlock(draft);
  check('editor: Add Lifting Block makes an empty Block 2',
        JSON.stringify(next.blocks) === '[1,2]' && next.exercises.length === 3,
        JSON.stringify(next.blocks));
  const withEmpty = E.forStorage({ ...draft, ...next });
  check('editor: an empty block leaves no trace in the stored routine',
        !('blocks' in withEmpty) &&
        JSON.stringify(B.blockOrder(withEmpty.exercises)) === '[1]',
        JSON.stringify(withEmpty.exercises.map(e => e.block)));

  next = B.addToBlock({ ...draft, ...next }, 2,
    [E.newExercise({ id: 'ohp', name: 'OHP', group: 'shoulders', equipment: 'barbell' })]);
  check('editor: an exercise added into a block carries block: 2',
        next.exercises[3].exId === 'ohp' && next.exercises[3].block === 2,
        JSON.stringify(next.exercises[3]));
  check('editor: a new exercise is one empty target set, never a value',
        JSON.stringify(next.exercises[3].sets) === '[{"tw":"","tr":"","type":"N"}]',
        JSON.stringify(next.exercises[3].sets));

  // Duplicate, with no copySet — the routine call.
  const dup = B.duplicateBlock({ ...draft, ...next }, 1);
  check('editor: duplicating a block copies its exercises into Block 2',
        dup.exercises.map(e => e.exId + ':' + (e.block || '-')).join(' ') ===
        'bench:1 row:1 bench:2 row:2 curl:- ohp:3',
        dup.exercises.map(e => e.exId + ':' + (e.block || '-')).join(' '));
  check('editor: the copied sets are the SAME targets, untouched',
        JSON.stringify(dup.exercises[2].sets) === JSON.stringify(stored.exercises[0].sets),
        JSON.stringify(dup.exercises[2].sets));
  check('editor: and no session field is grafted onto them',
        dup.exercises[2].sets.every(s =>
          !('w' in s) && !('r' in s) && !('done' in s)),
        JSON.stringify(dup.exercises[2].sets[0]));
  const dupSaved = E.forStorage({ ...draft, ...dup });
  check('editor: saving the duplicate stores 1 1 2 2 - 3 and no blocks array',
        !('blocks' in dupSaved) &&
        dupSaved.exercises.map(e => e.block || 0).join(',') === '1,1,2,2,0,3',
        JSON.stringify(dupSaved.exercises.map(e => e.block)));

  // Delete, and the renumbering that has to follow it into storage.
  const del = B.deleteBlock({ ...draft, ...dup }, 1);
  const delSaved = E.forStorage({ ...draft, ...del });
  check('editor: deleting Block 1 takes its exercises with it',
        delSaved.exercises.map(e => e.exId).join(' ') === 'bench row curl ohp',
        delSaved.exercises.map(e => e.exId).join(' '));
  check('editor: what is left is renumbered 1..k, so the label is the number',
        delSaved.exercises.map(e => e.block || 0).join(',') === '1,1,0,2',
        JSON.stringify(delSaved.exercises.map(e => e.block)));
  check('editor: still no blocks array after a delete',
        !('blocks' in delSaved));

  // And the whole point: what came out of the editor starts as what went in.
  const back = R.toSession(dupSaved);
  check('editor: a routine saved from the editor starts with its blocks intact',
        JSON.stringify(B.sessionBlocks({ exercises: back.exercises })) === '[1,2,3]',
        JSON.stringify(B.sessionBlocks({ exercises: back.exercises })));
  check('editor: and the workout screen lays it out as three blocks and a row',
        kinds(B.sessionLayout(back.exercises,
          B.sessionBlocks({ exercises: back.exercises }))) === 'block1,block2,ex,block3',
        kinds(B.sessionLayout(back.exercises, B.sessionBlocks({ exercises: back.exercises }))));

  // Pinned as text: the Save button has to go through forStorage, or the
  // guarantee above is a guarantee about a function nothing calls.
  check('editor: the Save button writes through forStorage',
        RSRC.includes('routines[draft.id] = forStorage(draft);'),
        'routines.js no longer saves through forStorage');
  check('editor: the transient order is derived on open, not stored',
        RSRC.includes('draft.blocks = blockOrder(draft.exercises);'));
  check('editor: nothing in routines.js writes a blocks key onto a routine',
        !/\bblocks:/.test(RSRC), 'a blocks: key appears in routines.js');
}

/* ---------- report ---------- */

console.log('\nlifting blocks — a container, and an annotation in the record\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
