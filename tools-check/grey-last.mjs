#!/usr/bin/env node
//
// Verifier for last time's numbers, in grey, on an exercise added by hand (v54).
//
//   node tools-check/grey-last.mjs
//
// Micah, 23 Sep 2026: an exercise added from the picker mid-session opened
// with blank boxes. Decided 25 Sep (SHIP-V54-PROMPT §3.8), and the rule at
// lastTargets() in workout.js:
//
//   IT IS LAST TIME'S, AND ONLY LAST TIME'S.  Set n takes last time's n-th
//        working set; past the end of those, last time's final one again;
//        warm-ups are not last time's sets; a bodyweight set's weight target
//        is '' — never a printed "0". From the session the "Last ·" line
//        quotes, so the line and the grey numbers cannot disagree.
//   ONLY WHERE IT BELONGS.  A LIVE session, never an edit of a past one; never
//        an exercise with no last time; never an exercise carrying a routine's
//        or the builder's targets; and "+ Set" after a typed set copies the
//        typed set exactly as it always did.
//   A TICK ADOPTS IT, AND NOTHING ELSE CHANGES.  tickSet's shipped rule fills
//        an empty box from the grey number and never overwrites a typed one;
//        collectFrom strips the targets (and `tl`, which says whose they were).
//   STORED POUNDS, PRINTED IN HIS UNIT.  The target is copied as the stored
//        string with no units call; the box's placeholder converts it.
//
// WHAT THIS RUNS. lastTargets(), newExercise(), greyFor(), lastEntry(),
// addSetTo(), addPicked(), tickSet(), collectFrom() and renderSet() are lifted
// verbatim out of ../workout.js — as feel.mjs lifts runFinish — with the real
// analytics.js, blocks.js, ui.js and units.js behind them and a DOM shim.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/* ================= THE FAKE DOCUMENT ================= */
function mkEl(tag) {
  const n = {
    tag, className: '', textContent: '', innerHTML: '', value: '', placeholder: '',
    children: [], parent: null, attrs: {}, style: {}, dataset: {}, disabled: false, onclick: null,
    classList: {
      add(...cs) { cs.forEach(c => { if (!n.classList.contains(c)) n.className = (n.className + ' ' + c).trim(); }); },
      remove(...cs) { n.className = n.className.split(' ').filter(x => x && !cs.includes(x)).join(' '); },
      toggle(c, on) { (on === undefined ? !n.classList.contains(c) : on) ? n.classList.add(c) : n.classList.remove(c); },
      contains: c => n.className.split(' ').includes(c)
    },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; },
    appendChild(c) { c.parent = n; n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => n.appendChild(c)); },
    remove() { if (n.parent) n.parent.children = n.parent.children.filter(x => x !== n); n.parent = null; },
    querySelectorAll() { return []; }
  };
  return n;
}
globalThis.document = { body: mkEl('body'), createElement: t => mkEl(t), createElementNS: (_ns, t) => mkEl(t),
                        querySelector: () => null, querySelectorAll: () => [], getElementById: () => null };
globalThis.window = { addEventListener() {} };

/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-grey-'));
writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
  .replace("from './store.js'", "from './store-stub.mjs'")
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './units.js'", 'from ' + real('units.js')));
const A  = await import(pathToFileURL(join(dir, 'analytics.mjs')).href);
const B  = await import(JSON.parse(real('blocks.js')));
const UI = await import(JSON.parse(real('ui.js')));
const U  = await import(JSON.parse(real('units.js')));

const WSRC = src('workout.js');
function lift(name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(WSRC);
  if (!m) throw new Error('grey-last: ' + name + '() is gone from workout.js — the grey numbers or this check are stale');
  const end = WSRC.indexOf('\n}\n', m.index);
  return WSRC.slice(m.index, end + 2).replace(/^export /, '');
}
const LIFTED = ['historyRows', 'lastEntry', 'greyFor', 'lastTargets', 'newExercise', 'addSetTo', 'addPicked',
                'tickSet', 'collectFrom', 'renderSet', 'setW', 'e1rm', 'coachExIdx', 'showCoach'];
const S = { u: 'lb' };
const stubs = {
  isWorking: A.isWorking, normalizeBlocks: B.normalizeBlocks, blockOrder: B.blockOrder,
  el: UI.el, LIMITS: UI.LIMITS, setNum: UI.setNum,
  wu: () => S.u, limW: U.limW, fmtSetW: U.fmtSetW, wOut: U.wOut, wIn: U.wIn,
  bump: () => {}, noteLiveTick: () => null, persistSession: () => {}, render: () => {}, startRest: () => {},
  swipeToDelete: row => row,
  // v55, on purpose: collectFrom keeps each drop set whole, and a set row's
  // badge and swipe go through the drop-set edits — the real ones.
  keepSets: A.keepSets, retypeSet: A.retypeSet, removeSet: A.removeSet,
  // v56, on purpose: "+ Set" asks analytics.js repeatOf which set it copies — the real one.
  repeatOf: A.repeatOf
};
const NAMES = Object.keys(stubs);
const W = new Function(...NAMES, `
let session = null, history = {}, coachNone = null, coachTapped = false;
${LIFTED.map(lift).join('\n')}
return {
  lastTargets, newExercise, addSetTo, addPicked, tickSet, collectFrom, renderSet, lastEntry,
  setSession: s => { session = s; }, getSession: () => session, setHistory: h => { history = h; }
};`)(...NAMES.map(k => stubs[k]));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);

/* ================= FIXTURES ================= */
// Last time, as history/{exId} holds it: newest first, working sets only (the
// fold drops warm-ups), stored pounds as strings, a bodyweight set as '0'.
const HISTORY = {
  'barbell-bench-press': [
    { date: '2026-09-22', sets: [{ w: '185', r: '8', type: 'N' }, { w: '185', r: '7', type: 'N' }, { w: '175', r: '9', type: 'N' }] },
    { date: '2026-09-18', sets: [{ w: '180', r: '8', type: 'N' }] }
  ],
  'pull-up': [{ date: '2026-09-21', sets: [{ w: '0', r: '10', type: 'N' }, { w: '0', r: '8', type: 'N' }] }],
  'cable-crossover': [{ date: '2026-09-20', sets: [{ w: '40.5', r: '12', type: 'N' }] }]
};
const PICK = {
  bench: { id: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell' },
  pull:  { id: 'pull-up', name: 'Pull-Up', group: 'back', equipment: 'bodyweight' },
  fly:   { id: 'cable-crossover', name: 'Cable Crossover', group: 'chest', equipment: 'cable' },
  never: { id: 'face-pull', name: 'Face Pull', group: 'shoulders', equipment: 'cable' }
};
const liveSession = () => ({ id: 'wlive', name: 'Live', startedAt: 1789300000000, exercises: [] });
const editSession = (dateKey) => ({ id: 'wedit', name: 'Edit', startedAt: 1789300000000, exercises: [],
                                    _edit: { mk: dateKey.slice(0, 7), dd: dateKey.slice(8, 10), dateKey, durationSec: 3600 } });
W.setHistory(clone(HISTORY));

/* ================= A. THE RULE ================= */
section('A. lastTargets — last time’s working sets by position, then its final one again');
{
  const last = HISTORY['barbell-bench-press'][0].sets;
  check('set 1, 2 and 3 take last time’s 1, 2 and 3 — stored strings, exactly',
        J([0, 1, 2].map(n => W.lastTargets(last, n))) === J([{ tw: '185', tr: '8' }, { tw: '185', tr: '7' }, { tw: '175', tr: '9' }]),
        J([0, 1, 2].map(n => W.lastTargets(last, n))));
  check('past the end, last time’s final working set again',
        J(W.lastTargets(last, 3)) === J({ tw: '175', tr: '9' }) && J(W.lastTargets(last, 9)) === J({ tw: '175', tr: '9' }));
  const bw = W.lastTargets(HISTORY['pull-up'][0].sets, 0);
  check('a bodyweight set (stored \'0\') gives a weight target of \'\' — the box stays blank, never a printed "0"',
        J(bw) === J({ tw: '', tr: '10' }), J(bw));
  const warm = [{ w: '95', r: '10', type: 'W' }, { w: '135', r: '5', type: 'W' }, { w: '185', r: '8', type: 'N' }, { w: '185', r: '6', type: 'F' }];
  check('warm-ups are not last time’s sets: set 1 is the first working set, and an F set is a working set',
        J(W.lastTargets(warm, 0)) === J({ tw: '185', tr: '8' }) && J(W.lastTargets(warm, 1)) === J({ tw: '185', tr: '6' }),
        J([W.lastTargets(warm, 0), W.lastTargets(warm, 1)]));
  check('no last time — nothing, an empty list, warm-ups only, sets with no reps, junk — is null',
        [undefined, null, [], [{ w: '95', r: '10', type: 'W' }], [{ w: '185', r: '', type: 'N' }], 'x', [null]]
          .every(v => W.lastTargets(v, 0) === null));
  const body = lift('lastTargets');
  check('and it converts nothing — no units call reaches a stored target (a conversion would be the second one)',
        !/\b(wIn|wOut|fmtSetW|fmtSetLoad|labelW|wu)\b/.test(body), body);
}

/* ================= B. WHERE IT APPLIES ================= */
section('B. newExercise in a live session: the first set carries last time’s set 1, in grey');
{
  W.setSession(liveSession());
  const ex = W.newExercise(PICK.bench, false);
  check('the first set: empty boxes, last time’s 185 × 8 as its targets, marked as last time’s (tl)',
        J(ex.sets) === J([{ w: '', r: '', type: 'N', done: false, tw: '185', tr: '8', tl: true }]), J(ex.sets));
  check('the exercise itself is the same shape as ever: its library row and one set',
        J(Object.keys(ex)) === J(['exId', 'name', 'group', 'equipment', 'sets']) && ex.exId === 'barbell-bench-press');
  const s = W.getSession();
  W.addPicked([PICK.fly]);
  check('"+ Add exercise" and Coach’s "Add it" hand the same addPicked: it arrives with last time’s 40.5 × 12',
        J(s.exercises[0].sets[0]) === J({ w: '', r: '', type: 'N', done: false, tw: '40.5', tr: '12', tl: true }), J(s.exercises[0]));
  check('and a block’s own "+ Add exercise" goes through newExercise(x, editing) too',
        WSRC.includes('commitBlocks(addToBlock(session, n, chosen.map(x => newExercise(x, editing))))'));
  const none = W.newExercise(PICK.never, false);
  check('an exercise with no "Last ·" session: one blank set, exactly as before — no target keys at all',
        J(none.sets) === J([{ w: '', r: '', type: 'N', done: false }]), J(none.sets));
  const bw = W.newExercise(PICK.pull, false);
  check('a bodyweight exercise: the reps in grey, the weight box blank', J(bw.sets[0]) === J({ w: '', r: '', type: 'N', done: false, tw: '', tr: '10', tl: true }));
}

section('C. "+ Set": blank boxes before it give the next of last time’s sets; a typed set is copied as ever');
{
  W.setSession(liveSession());
  const ex = W.newExercise(PICK.bench, false);
  W.addSetTo(ex); W.addSetTo(ex); W.addSetTo(ex);
  check('three more, each with the previous boxes blank: last time’s 2 and 3, then its final set again',
        J(ex.sets.map(s => [s.tw, s.tr, s.tl])) === J([['185', '8', true], ['185', '7', true], ['175', '9', true], ['175', '9', true]]),
        J(ex.sets.map(s => [s.tw, s.tr])));
  const typed = W.newExercise(PICK.bench, false);
  typed.sets[0].w = '190'; typed.sets[0].r = '6';
  W.addSetTo(typed);
  check('the previous set typed in: the new set copies what was typed, with no targets — exactly as today',
        J(typed.sets[1]) === J({ w: '190', r: '6', type: 'N', done: false }), J(typed.sets[1]));
  const half = W.newExercise(PICK.bench, false);
  half.sets[0].r = '8';
  W.addSetTo(half);
  check('one box typed is typed: copied as today, not grey', J(half.sets[1]) === J({ w: '', r: '8', type: 'N', done: false }), J(half.sets[1]));
  const warmFirst = W.newExercise(PICK.bench, false);
  warmFirst.sets[0] = { w: '95', r: '10', type: 'W', done: true };
  warmFirst.sets.push({ w: '', r: '', type: 'N', done: false });
  W.addSetTo(warmFirst);
  check('a warm-up typed first does not push last time along: the third row is his second working set, 185 × 7',
        J([warmFirst.sets[2].tw, warmFirst.sets[2].tr]) === J(['185', '7']), J(warmFirst.sets[2]));
  const routine = { exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell',
                    sets: [{ w: '', r: '', type: 'N', done: false, tw: '190', tr: '8' }] };
  W.addSetTo(routine);
  check('an exercise carrying a routine’s or the builder’s targets: "+ Set" is exactly today’s — no last-time grey',
        J(routine.sets[1]) === J({ w: '', r: '', type: 'N', done: false }), J(routine.sets[1]));
  const blankRoutine = { exId: 'barbell-bench-press', name: 'x', group: 'chest', equipment: 'barbell',
                         sets: [{ w: '', r: '', type: 'N', done: false, tw: '', tr: '' }] };
  W.addSetTo(blankRoutine);
  check('including a routine row with blank targets — it is still the routine’s row', !('tw' in blankRoutine.sets[1]));
  const emptied = { exId: 'barbell-bench-press', name: 'x', group: 'chest', equipment: 'barbell', sets: [] };
  W.addSetTo(emptied);
  check('every set swiped away: "+ Set" starts again at last time’s first', J([emptied.sets[0].tw, emptied.sets[0].tr]) === J(['185', '8']));
  check('the button is wired to it', /addSet\.onclick = \(\) => \{ addSetTo\(ex\); persistSession\(\); render\(\); \};/.test(WSRC));
}

/* ================= D. WHERE IT DOESN'T ================= */
section('D. an edit of a past session gets nothing, and the "Last ·" line and the grey read one session');
{
  W.setSession(editSession('2026-09-22'));
  const ex = W.newExercise(PICK.bench, true);
  check('an exercise added while editing: one set, ticked (the edit rule), and no targets',
        J(ex.sets) === J([{ w: '', r: '', type: 'N', done: true }]), J(ex.sets));
  const edited = { exId: 'barbell-bench-press', name: 'x', group: 'chest', equipment: 'barbell', sets: [{ w: '', r: '', type: 'N', done: true }] };
  W.addSetTo(edited);
  check('"+ Set" while editing: exactly today’s — ticked, blank, no targets', J(edited.sets[1]) === J({ w: '', r: '', type: 'N', done: true }));
  check('and the "Last ·" session while editing the 22nd is the 18th — the date being edited is skipped',
        W.lastEntry('barbell-bench-press').date === '2026-09-18');
  // Even a newExercise called with editing=false while an edit is open gets
  // nothing: greyFor reads the session itself.
  check('greyFor itself refuses an edit, whatever it is handed', !('tw' in W.newExercise(PICK.bench, false).sets[0]));
  W.setSession(liveSession());
  check('live, the "Last ·" session is the newest entry, and it is the one the grey numbers came from',
        W.lastEntry('barbell-bench-press').date === '2026-09-22' && W.newExercise(PICK.bench, false).sets[0].tr === '8');
  const re = /function renderExercise\([\s\S]*?\n\}\n/.exec(WSRC);
  check('the "Last ·" line reads lastEntry() — the one function the grey numbers read',
        !!re && /const prev = lastEntry\(ex\.exId\);/.test(re[0]) && /Last · /.test(re[0]));
  check('and greyFor reads lastEntry(), never history directly', /lastEntry\(ex\.exId\)/.test(lift('greyFor')) && !/history\[/.test(lift('greyFor')));
}

/* ================= E. A TICK ADOPTS IT ================= */
section('E. ticking adopts the grey numbers by the shipped rule — a typed box is never overwritten');
{
  W.setSession(liveSession());
  const ex = W.newExercise(PICK.bench, false);
  ex.sets[0] = W.tickSet(ex.sets[0]);
  check('ticked without typing: 185 × 8 are the numbers logged', ex.sets[0].w === '185' && ex.sets[0].r === '8' && ex.sets[0].done === true);
  const typed = W.newExercise(PICK.bench, false);
  typed.sets[0].w = '190';
  typed.sets[0] = W.tickSet(typed.sets[0]);
  check('a weight he typed survives the tick; the empty reps box takes last time’s', typed.sets[0].w === '190' && typed.sets[0].r === '8');
  const bw = W.newExercise(PICK.pull, false);
  bw.sets[0] = W.tickSet(bw.sets[0]);
  const rec = W.collectFrom([ex, typed, bw]);
  check('a bodyweight grey set ticked: the reps are last time’s, the weight is recorded \'0\' as collectFrom always has',
        rec[2].sets[0].w === '0' && rec[2].sets[0].r === '10', J(rec[2].sets));
  check('and the record carries no tw, tr or tl — scaffolding, stripped', rec.every(e => e.sets.every(s => !('tw' in s) && !('tr' in s) && !('tl' in s))),
        J(rec.map(e => e.sets)));
  const untouched = W.newExercise(PICK.bench, false);
  check('an unticked grey set never reaches the record', W.collectFrom([untouched]).length === 0);
}

/* ================= F. IN KILOS ================= */
section('F. in kilos: the placeholder is printed converted, and the stored target is still pounds');
{
  S.u = 'kg';
  W.setSession(liveSession());
  const ex = W.newExercise(PICK.bench, false);
  W.getSession().exercises.push(ex);
  const row = W.renderSet(ex, 0, ex.sets[0], 0);
  const inputs = row.children.filter(x => x.tag === 'input');
  const want = U.fmtSetW('185', 'kg');
  check('the weight box’s grey text is ' + want + ' — 185 lb printed in kilos, through units.js',
        inputs[0].placeholder === want && want !== '185' && inputs[1].placeholder === '8', inputs.map(x => x.placeholder).join(' / '));
  check('while the set still holds the stored pound string', ex.sets[0].tw === '185');
  ex.sets[0] = W.tickSet(ex.sets[0]);
  const after = W.renderSet(ex, 0, ex.sets[0], 0).children.filter(x => x.tag === 'input');
  check('ticked, the box holds ' + want + ' and the set holds \'185\' — one conversion, at the box',
        ex.sets[0].w === '185' && after[0].value === want, ex.sets[0].w + ' / ' + after[0].value);
  const bw = W.newExercise(PICK.pull, false);
  const bwRow = W.renderSet(bw, 0, bw.sets[0], 0).children.filter(x => x.tag === 'input');
  check('a bodyweight grey set shows no weight target at all — never "0"', bwRow[0].placeholder === '–' && bwRow[1].placeholder === '10',
        bwRow.map(x => x.placeholder).join(' / '));
  S.u = 'lb';
}

console.log('\nlast time’s numbers, in grey, where they belong and nowhere else\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
