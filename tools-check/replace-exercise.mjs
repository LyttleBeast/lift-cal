#!/usr/bin/env node
//
// Verifier for "Replace exercise" on the exercise card's ⋯ (v75).
//
//   node tools-check/replace-exercise.mjs
//
// Micah, 22 Oct 2026: "on the three little dots add a button along with the
// remove exercise button to replace with another exercise." THE RULE is the
// one at replaceExercise() in workout.js:
//
//   NOTHING TICKED — a clean swap: same place, same block, as many set rows
//        (a drop set's drops are part of their set), each built the way "+ Set"
//        builds one — the NEW exercise's last time in grey, warm-ups first.
//   SOMETHING TICKED — the old card keeps every ticked set byte for byte; the
//        new exercise goes in directly below with one row per row not started.
//   A PICKER CANCEL CHANGES NOTHING, a custom exercise is a replacement like
//        any other, a refused write at Finish leaves everything in memory as it
//        was, and a routine is never touched by a replace in a session it
//        started.
//
// WHAT THIS RUNS. The real workout.js, analytics.js, blocks.js, ui.js,
// units.js and exercises.js, staged by lib/stage.mjs over the fake store; then
// the screen's own functions — openExerciseMenu, replacePicked, lastEntry,
// historyRows, startWorkout, unsavedTicks, finishWorkout, runFinish and
// trimHistory, lifted verbatim out of workout.js, and routines.js's toSession —
// with the picker and the sheets captured so a test can tap them.

import { stage, readSrc, harness, J } from './lib/stage.mjs';

const S = stage(['ui.js', 'units.js', 'exercises.js', 'blocks.js', 'analytics.js', 'workout.js']);
const W = await S.load('workout.js');
const { check, section, done } = harness('replace exercise — swap clean, or keep and insert below');
const clone = v => JSON.parse(J(v));
const deepFreeze = o => { if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); } return o; };

const WSRC = readSrc('workout.js'), RSRC = readSrc('routines.js');
function liftFrom(text, name, file) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(text);
  if (!m) throw new Error('replace-exercise: ' + name + '() is gone from ' + file);
  const end = text.indexOf('\n}\n', m.index);
  return text.slice(m.index, end + 2).replace(/^export /, '');
}
const lift = n => liftFrom(WSRC, n, 'workout.js');

/* ---------- fixtures ---------- */
const N = (w, r, done = false, extra) => ({ w, r, type: 'N', done, ...extra });
const ex = (exId, group, sets, extra) => ({ exId, name: exId, group, equipment: 'barbell', sets, ...extra });
const LIB = {
  dbPress:  { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', group: 'chest', equipment: 'dumbbell' },
  incline:  { id: 'incline-bench-press', name: 'Incline Bench Press', group: 'chest', equipment: 'barbell' },
  custom:   { id: 'c_mxyz12', name: 'Hammer Strength Press', group: 'chest', equipment: 'machine', custom: true },
  bike:     { id: 'stationary-bike', name: 'Stationary Bike', group: 'legs', equipment: 'cardio' },
  pullup:   { id: 'pull-up', name: 'Pull-Up', group: 'back', equipment: 'bodyweight' }
};
// The index, as history/{exId} holds it since v68: newest first, warm-ups kept.
const HISTORY = {
  'dumbbell-bench-press': [{ date: '2026-10-18', sets: [
    { w: '25', r: '10', type: 'W' }, { w: '45', r: '6', type: 'W' },
    { w: '70', r: '10', type: 'N' }, { w: '70', r: '9', type: 'N' }, { w: '65', r: '10', type: 'N' }] }],
  'pull-up': [{ date: '2026-10-17', sets: [{ w: '0', r: '10', type: 'N' }, { w: '0', r: '8', type: 'N' }] }]
};

/* ================= A. the pure rule ================= */
section('A. nothing ticked — a clean swap (replaceExercise, real)');
{
  const before = [ex('squat', 'legs', [N('', ''), N('', '')]),
                  ex('barbell-bench-press', 'chest', [N('', '', false, { tw: '185', tr: '5' }), N('', '', false, { tw: '185', tr: '5' }), N('', '', false, { tw: '185', tr: '5' })]),
                  ex('row', 'back', [N('', '')])];
  deepFreeze(before);
  const out = W.replaceExercise(before, 1, LIB.dbPress, HISTORY['dumbbell-bench-press'][0].sets);
  check('same number of exercises', out.length === 3, out.length);
  check('the card at the same position is the new exercise', out[1].exId === 'dumbbell-bench-press' && out[1].name === 'Dumbbell Bench Press' && out[1].group === 'chest' && out[1].equipment === 'dumbbell', J(out[1]));
  check('same number of set rows (3)', out[1].sets.length === 3, out[1].sets.length);
  check('the rows are the NEW exercise\'s last time, warm-ups first (nextGrey): W 25×10, W 45×6, N 70×10',
        J(out[1].sets) === J([{ w: '', r: '', type: 'W', done: false, tw: '25', tr: '10', tl: true },
                               { w: '', r: '', type: 'W', done: false, tw: '45', tr: '6', tl: true },
                               { w: '', r: '', type: 'N', done: false, tw: '70', tr: '10', tl: true }]), J(out[1].sets));
  check('no routine target of the old lift survives (no 185 anywhere on the new card)', !J(out[1]).includes('185'));
  check('the exercises around it are the same objects, untouched', out[0] === before[0] && out[2] === before[2]);
  check('pure: the input is not mutated (it is frozen, and nothing threw)', before[1].exId === 'barbell-bench-press');
  // Built exactly as the "+ Set" rows of a hand-added exercise would be.
  let viaNext = [];
  for (let k = 0; k < 3; k++) { const t = W.nextGrey(HISTORY['dumbbell-bench-press'][0].sets, viaNext); viaNext.push({ w: '', r: '', type: 'N', done: false, ...(t ? { ...t, tl: true } : null) }); }
  check('each row is what nextGrey says for its place — the same rule as "+ Set"', J(viaNext) === J(out[1].sets));

  const none = W.replaceExercise(before, 1, LIB.incline, null);
  check('no last time: three blank N rows, no targets', J(none[1].sets) === J([N('', ''), N('', ''), N('', '')]), J(none[1].sets));
  const zero = W.replaceExercise([ex('a', 'chest', [])], 0, LIB.incline, null);
  check('a card with no rows still gets one, as every added exercise does', zero[0].sets.length === 1);

  // A drop set's drops are part of their set: N, D, D(dp) = two rows.
  const drop = [ex('cable-fly', 'chest', [N('', ''), { w: '', r: '', type: 'D', done: false }, { w: '', r: '', type: 'D', done: false, dp: 1 }])];
  check('a drop set counts as one row: 3 rows with one drop → 2', W.replaceExercise(drop, 0, LIB.incline, null)[0].sets.length === 2);

  // Typed but unticked: not logged, so a swap. Those numbers were the old lift's.
  const typed = W.replaceExercise([ex('a', 'chest', [N('100', '8'), N('', '')])], 0, LIB.incline, null);
  check('typed-but-unticked rows are not logged work: still a clean swap, 2 blank rows', typed.length === 1 && J(typed[0].sets) === J([N('', ''), N('', '')]));

  // Lifting block: the annotation goes with the card.
  const inBlock = [ex('x', 'legs', [N('', '')]), ex('a', 'chest', [N('', '')], { block: 1 }), ex('b', 'back', [N('', '')], { block: 1 })];
  const bo = W.replaceExercise(inBlock, 1, LIB.dbPress, null);
  check('in a lifting block the new card keeps the block', bo[1].block === 1 && bo[1].exId === 'dumbbell-bench-press');
  check('outside one it carries no block key', !('block' in W.replaceExercise(inBlock, 0, LIB.dbPress, null)[0]));

  check('replacing with the same exercise is a no-op', J(W.replaceExercise(before, 1, { ...LIB.incline, id: 'barbell-bench-press' }, null)) === J(before));
  check('a bad index is a no-op', J(W.replaceExercise(before, 7, LIB.incline, null)) === J(before));
  check('no exercise picked is a no-op', J(W.replaceExercise(before, 1, null, null)) === J(before));
}

section('B. something ticked — keep the old card, insert the new one below');
const TICKED = [
  ex('squat', 'legs', [N('225', '5', true)]),
  ex('barbell-bench-press', 'chest', [
    { w: '135', r: '8', type: 'W', done: true },
    N('185', '5', true, { rir: 2 }),
    { w: '185', r: '4', type: 'D', done: true },
    { w: '135', r: '6', type: 'D', done: true, dp: 1 },
    N('', '', false, { tw: '185', tr: '5' }),
    N('180', '', false),                                   // typed into, not ticked: his
    N('', '')
  ]),
  ex('row', 'back', [N('', '')])
];
{
  const before = deepFreeze(clone(TICKED));
  const logged = J(before[1].sets.filter(s => s.done));
  const out = W.replaceExercise(before, 1, LIB.dbPress, HISTORY['dumbbell-bench-press'][0].sets);
  check('one more exercise than before', out.length === 4, out.length);
  check('the old exercise stays where it was', out[1].exId === 'barbell-bench-press');
  check('the new exercise is directly below it', out[2].exId === 'dumbbell-bench-press');
  check('the ones around them are untouched and in order', out[0] === before[0] && out[3] === before[2]);
  check('every logged set is byte-identical afterwards (warm-up, rir, drop set and its dp)',
        J(out[1].sets.filter(s => s.done)) === logged, J(out[1].sets));
  check('the row he typed into but did not tick stays on the old card', out[1].sets.some(s => s.w === '180' && !s.done));
  check('the two unstarted rows moved: the old card has 5 rows left', out[1].sets.length === 5, out[1].sets.length);
  check('the new card has one row for each unstarted row (2) — warm-ups first, from its own last time',
        J(out[2].sets) === J([{ w: '', r: '', type: 'W', done: false, tw: '25', tr: '10', tl: true },
                               { w: '', r: '', type: 'W', done: false, tw: '45', tr: '6', tl: true }]), J(out[2].sets));
  check('nothing logged ever reaches the new card', out[2].sets.every(s => !s.done));
  const rec = W.collectFrom(out);
  const recBefore = W.collectFrom(before);
  check('the record Finish would build keeps the old lift exactly as before the replace',
        J(rec.find(e => e.exId === 'barbell-bench-press')) === J(recBefore.find(e => e.exId === 'barbell-bench-press')));
  // Every row ticked: nothing left to carry, so the new card starts with one.
  const all = W.replaceExercise([ex('a', 'chest', [N('100', '5', true), N('100', '5', true)])], 0, LIB.incline, null);
  check('every row ticked: old keeps both, new card gets the one row any added exercise starts with',
        all.length === 2 && all[0].sets.length === 2 && all[1].sets.length === 1);
  // In a block, the inserted card is in the same block, so the block stays whole.
  const blk = W.replaceExercise([ex('a', 'chest', [N('100', '5', true), N('', '')], { block: 1 }), ex('b', 'back', [N('', '')], { block: 1 })], 0, LIB.incline, null);
  check('in a lifting block the inserted card joins the same block, directly below', blk.map(e => e.exId + ':' + e.block).join(',') === 'a:1,incline-bench-press:1,b:1');
}

/* ================= C. the screen, driven ================= */
const UI = { sheets: [], pickers: [], confirms: [] };
const STUBS = {
  replaceExercise: W.replaceExercise, nextGrey: W.nextGrey, collectFrom: W.collectFrom,
  foldSessionIntoHistory: W.foldSessionIntoHistory, recordGroups: W.recordGroups, computeVolume: W.computeVolume,
  el: (t, c, txt) => ({ tag: t, className: c || '', textContent: txt || '', style: {}, children: [], append(...k) { this.children.push(...k); }, appendChild(k) { this.children.push(k); return k; } }),
  noteEl: t => ({ tag: 'note', textContent: t, children: [] }),
  sheet: () => { const sh = { children: [], appendChild(k) { this.children.push(k); return k; }, append(...k) { this.children.push(...k); } };
                 const rec = { sh, closed: false }; UI.sheets.push(rec); return { sh, close: () => { rec.closed = true; } }; },
  confirmSheet: o => UI.confirms.push(o),
  openPicker: (onPick, opts) => UI.pickers.push({ onPick, opts }),
  LS: null, render: () => {}, bump: () => {}, toast: m => UI.toasts.push(m),
  todayKey: (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
  allSessions: async () => [], detectPRs: () => ({ prs: [], firsts: [] }), sessionMilestones: () => [], wu: () => 'lb',
  loadMonth: async () => ({}), invalidate: () => {}, refreshCoachSessions: async () => true,
  releaseWakeLock: () => {}, clearRest: () => {}, requestWakeLock: () => {}, refreshCoachMark: () => {}, defaultName: () => 'Evening session',
  mergeSessionExercises: null, isWorking: null, keepSets: null,
  write: null
};
const A = await S.load('analytics.js');
Object.assign(STUBS, { mergeSessionExercises: A.mergeSessionExercises, isWorking: A.isWorking, keepSets: A.keepSets });
const LSCELLS = new Map();
STUBS.LS = { get: (k, f) => (LSCELLS.has(k) ? clone(LSCELLS.get(k)) : f), set: (k, v) => LSCELLS.set(k, clone(v)), del: k => LSCELLS.delete(k) };
UI.toasts = []; UI.writes = []; UI.refuse = null;
STUBS.write = async (p, v) => { if (UI.refuse && p.startsWith(UI.refuse)) throw new Error('PERMISSION_DENIED'); UI.writes.push([p, clone(v)]); };

const NAMES = Object.keys(STUBS);
const BODY = `
let session = null, summary = null, peek = false, history = {}, monthCache = {}, finishing = false;
function persistSession() { if (session && session._edit) return; LS.set('activeSession', session); }
function collectDone() { return collectFrom(session.exercises); }
${['historyRows', 'lastEntry', 'trimHistory', 'openExerciseMenu', 'replacePicked', 'startWorkout', 'unsavedTicks', 'finishWorkout', 'runFinish'].map(lift).join('\n')}
${liftFrom(RSRC, 'toSession', 'routines.js')}
return {
  openExerciseMenu, replacePicked, startWorkout, finishWorkout, toSession,
  set: s => { session = s; }, get: () => session, setHistory: h => { history = h; }, getHistory: () => history,
  getMonth: () => monthCache, getSummary: () => summary
};`;
const make = () => new Function(...NAMES, BODY)(...NAMES.map(k => STUBS[k]));
const btn = (sh, label) => sh.children.find(c => c && c.textContent === label);
const reset = () => { UI.sheets.length = 0; UI.pickers.length = 0; UI.confirms.length = 0; UI.toasts.length = 0; UI.writes.length = 0; UI.refuse = null; LSCELLS.clear(); };

section('C. the ⋯ menu: Replace exercise beside Remove exercise');
{
  reset();
  const app = make();
  app.setHistory(clone(HISTORY));
  app.set({ id: 'w1', name: 'Push', startedAt: Date.now(), exercises: clone(TICKED) });
  app.openExerciseMenu(app.get().exercises[1], 1);
  const m = UI.sheets[0];
  check('the ⋯ opens a menu sheet', !!m);
  const rep = m && btn(m.sh, 'Replace exercise'), rem = m && btn(m.sh, 'Remove exercise'), can = m && btn(m.sh, 'Cancel');
  check('it holds "Replace exercise", "Remove exercise" and "Cancel"', !!rep && !!rem && !!can);
  check('Replace first, Remove second, Cancel last', m.sh.children.filter(c => c.tag === 'button').map(c => c.textContent).join('|') === 'Replace exercise|Remove exercise|Cancel');
  check('every one of them is a .btn (the 44px minimum holds it) and only Remove is danger',
        rep.className === 'btn btn-ghost btn-block' && rem.className === 'btn btn-danger btn-block' && can.className === 'btn btn-ghost btn-block');
  check('with a set ticked, it says so before the tap', m.sh.children.some(c => c.tag === 'note' && /ticked sets stay/.test(c.textContent)));
  rem.onclick();
  check('Remove exercise closes the menu and opens the remove confirm it always had',
        m.closed && UI.confirms.length === 1 && UI.confirms[0].title === 'Remove barbell-bench-press?' && UI.confirms[0].danger === true);
  UI.confirms[0].onConfirm();
  check('and confirming it removes the card, as before', app.get().exercises.map(e => e.exId).join() === 'squat,row');

  reset();
  app.set({ id: 'w1', name: 'Push', startedAt: Date.now(), exercises: [ex('a', 'chest', [N('', '')])] });
  app.openExerciseMenu(app.get().exercises[0], 0);
  check('with nothing ticked, the menu says nothing extra', !UI.sheets[0].sh.children.some(c => c.tag === 'note'));

  reset();
  app.set({ id: 'w9', name: 'Past', startedAt: Date.now(), exercises: clone(TICKED), _edit: { mk: '2026-10', dd: '01', dateKey: '2026-10-01' } });
  app.openExerciseMenu(app.get().exercises[1], 1);
  check('in an edit of a past session the ⋯ goes straight to the remove confirm (no Replace: every set there is logged)',
        UI.sheets.length === 0 && UI.confirms.length === 1 && UI.confirms[0].title === 'Remove barbell-bench-press?');
  check('and the button says so to a screen reader', /'Remove ' : 'More for '\) \+ ex\.name/.test(WSRC));
}

section('D. Replace exercise opens the picker; the pick swaps clean (nothing ticked)');
{
  reset();
  const app = make();
  app.setHistory(clone(HISTORY));
  const start = [ex('squat', 'legs', [N('', '')]), ex('barbell-bench-press', 'chest', [N('', ''), N('', ''), N('', ''), N('', '')]), ex('row', 'back', [N('', '')])];
  app.set({ id: 'w1', name: 'Push', startedAt: Date.now(), exercises: clone(start) });
  app.openExerciseMenu(app.get().exercises[1], 1);
  btn(UI.sheets[0].sh, 'Replace exercise').onclick();
  const p = UI.pickers[0];
  check('the menu closes and the existing picker opens', UI.sheets[0].closed && !!p);
  check('one pick, on the exercise\'s own group, the exercise itself left out, titled "Replace …"',
        p.opts.single === true && p.opts.filter === 'chest' && J(p.opts.exclude) === '["barbell-bench-press"]' && p.opts.title === 'Replace barbell-bench-press', J(p.opts));
  p.onPick([LIB.dbPress]);
  const s = app.get();
  check('swapped in place: squat, dumbbell press, row', s.exercises.map(e => e.exId).join() === 'squat,dumbbell-bench-press,row');
  check('four rows, as the old card had — two warm-ups then working sets, from its last time',
        s.exercises[1].sets.map(x => x.type + (x.tw || '') + 'x' + (x.tr || '')).join(' ') === 'W25x10 W45x6 N70x10 N70x9', J(s.exercises[1].sets));
  check('saved the way every live edit is: the device copy holds it', J(LSCELLS.get('activeSession').exercises) === J(s.exercises));
  check('and nothing was written to the database by the replace', UI.writes.length === 0);
}

section('E. a picker cancel changes nothing');
{
  reset();
  const app = make();
  app.setHistory(clone(HISTORY));
  app.set({ id: 'w1', name: 'Push', startedAt: Date.now(), exercises: clone(TICKED) });
  STUBS.LS.set('activeSession', app.get());
  const was = J(app.get()), lsWas = J(LSCELLS.get('activeSession'));
  app.openExerciseMenu(app.get().exercises[1], 1);
  btn(UI.sheets[0].sh, 'Replace exercise').onclick();
  // Cancel in picker.js closes the sheet and never calls onPick.
  check('picker.js\'s Cancel only closes — it never calls onPick', /closeBtn\.onclick = \(\) => close\(\);/.test(readSrc('picker.js')));
  check('the session is unchanged after a cancel', J(app.get()) === was);
  check('the device copy is unchanged after a cancel', J(LSCELLS.get('activeSession')) === lsWas);
  UI.pickers[0].onPick([]);
  check('an empty pick changes nothing either', J(app.get()) === was);
  // The picker is a sheet over a live screen: if the card moved, nothing is replaced.
  const app2 = make();
  app2.set({ id: 'w1', name: 'Push', startedAt: Date.now(), exercises: clone(TICKED) });
  const was2 = J(app2.get());
  app2.get().exercises.splice(0, 1);       // squat removed while the picker was open
  const shifted = J(app2.get());
  app2.replacePicked('barbell-bench-press', 1, [LIB.dbPress]);
  check('a card that moved under the open picker is not replaced (index and exercise must both match)', J(app2.get()) === shifted && shifted !== was2);
  const app3 = make();
  app3.set({ id: 'w9', name: 'Past', startedAt: Date.now(), exercises: clone(TICKED), _edit: { mk: '2026-10', dd: '01', dateKey: '2026-10-01' } });
  const was3 = J(app3.get());
  app3.replacePicked('barbell-bench-press', 1, [LIB.dbPress]);
  check('and never in an edit of a past session', J(app3.get()) === was3);
}

section('F. keep-and-insert, driven: logged sets byte-identical, history folds each under its own id');
{
  reset();
  const app = make();
  app.setHistory(clone(HISTORY));
  const day = new Date(2026, 9, 22, 18, 0).getTime();
  app.set({ id: 'w2', name: 'Push', startedAt: day, exercises: clone(TICKED) });
  const logged = J(app.get().exercises[1].sets.filter(s => s.done));
  app.replacePicked('barbell-bench-press', 1, [LIB.dbPress]);
  const s = app.get();
  check('old kept, new directly below', s.exercises.map(e => e.exId).join() === 'squat,barbell-bench-press,dumbbell-bench-press,row');
  check('logged sets byte-identical', J(s.exercises[1].sets.filter(x => x.done)) === logged);
  // Tick the new card's first row, then Finish.
  s.exercises[2].sets[0] = { ...s.exercises[2].sets[0], w: '25', r: '10', done: true };
  s.exercises[2].sets[1] = { ...s.exercises[2].sets[1], w: '50', r: '8', type: 'N', done: true };
  await app.finishWorkout(true);
  const rec = (UI.writes.find(([p]) => p === 'workouts/2026-10/22/w2') || [])[1];
  check('Finish wrote the record', !!rec);
  check('the record holds the old lift\'s logged sets exactly, minus only the live-session targets',
        rec && J(rec.exercises.find(e => e.exId === 'barbell-bench-press').sets) === J(W.collectFrom(clone(TICKED))[1].sets));
  check('and the new lift under its own id', rec && rec.exercises.some(e => e.exId === 'dumbbell-bench-press' && e.sets.length === 2));
  const h = (UI.writes.find(([p]) => p === 'history') || [])[1];
  check('history/{exId}: the old lift folded under barbell-bench-press', h && h['barbell-bench-press'] && h['barbell-bench-press'][0].date === '2026-10-22');
  check('history/{exId}: the new lift folded under dumbbell-bench-press, newest first, last time kept',
        h && h['dumbbell-bench-press'].map(e => e.date).join() === '2026-10-22,2026-10-18');
  check('groups are the record\'s own reading (chest from both, legs)', rec && J(rec.groups) === '["legs","chest"]', rec && J(rec.groups));
}

section('G. a custom exercise as the replacement');
{
  reset();
  const app = make();
  app.setHistory(clone(HISTORY));
  app.set({ id: 'w3', name: 'Push', startedAt: new Date(2026, 9, 22, 18).getTime(), exercises: [ex('barbell-bench-press', 'chest', [N('', ''), N('', '')])] });
  app.openExerciseMenu(app.get().exercises[0], 0);
  btn(UI.sheets[0].sh, 'Replace exercise').onclick();
  // picker.js, single: a custom made from "New" is the pick (onPick([x])).
  check('picker.js: in a single pick, an exercise made with "New" is the pick', /if \(single\) \{ close\(\); onPick\(\[x\]\); return; \}/.test(readSrc('picker.js')));
  UI.pickers[0].onPick([LIB.custom]);
  const e0 = app.get().exercises[0];
  check('the card is the custom exercise, by its own id, name, group and equipment',
        e0.exId === 'c_mxyz12' && e0.name === 'Hammer Strength Press' && e0.group === 'chest' && e0.equipment === 'machine');
  check('it has never been logged, so its two rows are blank', J(e0.sets) === J([N('', ''), N('', '')]));
  check('the library row\'s own flags are not copied onto the card', !('custom' in e0));
  e0.sets[0] = { ...e0.sets[0], w: '90', r: '10', done: true };
  await app.finishWorkout(true);
  const h = (UI.writes.find(([p]) => p === 'history') || [])[1];
  check('Finish folds it into history under the custom id', h && h['c_mxyz12'] && h['c_mxyz12'][0].sets[0].w === '90');
}

section('H. bodyweight and cardio cards replace like any other');
{
  const bw = W.replaceExercise([ex('dip', 'arms', [N('', ''), N('', '')])], 0, LIB.pullup, HISTORY['pull-up'][0].sets);
  check('to a bodyweight lift: its last time in grey, the weight target blank, never a printed 0',
        J(bw[0].sets) === J([{ w: '', r: '', type: 'N', done: false, tw: '', tr: '10', tl: true }, { w: '', r: '', type: 'N', done: false, tw: '', tr: '8', tl: true }]), J(bw[0].sets));
  const cd = W.replaceExercise([ex('treadmill-run', 'legs', [N('', '')])], 0, LIB.bike, null);
  check('a cardio card is a card like any other (same set rows)', cd[0].exId === 'stationary-bike' && cd[0].sets.length === 1);
}

section('I. a refused write at Finish leaves memory unchanged');
{
  reset();
  const app = make();
  app.setHistory(clone(HISTORY));
  app.set({ id: 'w4', name: 'Push', startedAt: new Date(2026, 9, 22, 18).getTime(), exercises: clone(TICKED) });
  app.replacePicked('barbell-bench-press', 1, [LIB.dbPress]);
  app.get().exercises[2].sets[0] = { ...app.get().exercises[2].sets[0], w: '25', r: '10', done: true };
  const sWas = J(app.get()), hWas = J(app.getHistory()), mWas = J(app.getMonth()), lsWas = J(LSCELLS.get('activeSession'));
  UI.refuse = 'workouts/';
  await app.finishWorkout(true);
  check('the session is exactly as it was, replacement and all', J(app.get()) === sWas);
  check('history in memory is unchanged (nothing folded over a refused write)', J(app.getHistory()) === hWas);
  check('the month cache is unchanged', J(app.getMonth()) === mWas);
  check('the device copy is still there and unchanged', J(LSCELLS.get('activeSession')) === lsWas);
  check('no recap was made', app.getSummary() === null);
  check('and it says so', UI.toasts.some(t => /Not saved/.test(t)));
  check('nothing reached the database', UI.writes.length === 0);
  UI.refuse = null;
  await app.finishWorkout(true);
  check('tapping Finish again saves it once', UI.writes.filter(([p]) => p === 'workouts/2026-10/22/w4').length === 1 && app.get() === null);
}

section('J. a session started from a routine leaves the routine untouched');
{
  reset();
  const app = make();
  app.setHistory(clone(HISTORY));
  const routine = deepFreeze({ id: 'r1', name: 'Push A', exercises: [
    { exId: 'barbell-bench-press', name: 'Bench', group: 'chest', equipment: 'barbell', sets: [{ tw: '185', tr: '5', type: 'N' }, { tw: '185', tr: '5', type: 'N' }, { tw: '185', tr: '5', type: 'N' }] },
    { exId: 'dip', name: 'Dip', group: 'arms', equipment: 'bodyweight', block: 1, sets: [{ tw: '', tr: '10', type: 'N' }] }
  ] });
  const rWas = J(routine);
  app.startWorkout(app.toSession(routine));
  app.replacePicked('barbell-bench-press', 0, [LIB.dbPress]);
  check('the session swapped the lift', app.get().exercises[0].exId === 'dumbbell-bench-press' && app.get().exercises[0].sets.length === 3);
  app.get().exercises[0].sets[0] = { ...app.get().exercises[0].sets[0], w: '25', r: '10', done: true };
  app.replacePicked('dumbbell-bench-press', 0, [LIB.incline]);
  app.replacePicked('dip', 2, [LIB.pullup]);
  check('a second replace after a tick inserts below; the block exercise swaps in its block',
        app.get().exercises.map(e => e.exId + (e.block ? ':' + e.block : '')).join() === 'dumbbell-bench-press,incline-bench-press,pull-up:1', app.get().exercises.map(e => e.exId).join());
  check('the routine is byte-identical (it is frozen, and nothing threw)', J(routine) === rWas);
  check('the replace path names no routine write', !/routines\//.test(lift('replacePicked') + lift('replaceExercise') + lift('openExerciseMenu')));
}

section('K. wiring');
{
  const re = lift('renderExercise');
  check('the card\'s ⋯ opens openExerciseMenu', /menu\.onclick = \(\) => openExerciseMenu\(ex, exIdx\);/.test(re));
  check('replacePicked goes through replaceExercise and persistSession, then repaints',
        /replaceExercise\(session\.exercises, exIdx, x, prev \? prev\.sets : null\)/.test(lift('replacePicked')) && /persistSession\(\); render\(\);/.test(lift('replacePicked')));
  check('the old lift\'s sets are only ever edited through analytics.js keepSets', /keepSets\(sets, /.test(lift('replaceExercise')) && !/\.splice\(j|sets\.splice/.test(lift('replaceExercise')));
  check('the labels are plain UI words', /'Replace exercise'/.test(WSRC) && /'Remove exercise'/.test(WSRC));
  const rules = readSrc('database.rules.json');
  check('no new database node: the replace writes nothing but the device copy', !/replace/i.test(rules));
}

done(S.cleanup);
