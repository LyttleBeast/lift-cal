#!/usr/bin/env node
//
// Verifier for what a tick means on a set that carries a target.
//
//   node tools-check/tick-targets.mjs
//
// THE RULE, word for word the one at tickSet in workout.js and the one the
// native set-check handler builds to:
//
//   Ticking a set says "I did what it says". A box left empty on a set that
//   carries a target (tw / tr) is filled from that target as the set is ticked.
//   A box he typed into is never overwritten. Unticking clears nothing. A
//   weight target of '' leaves the weight empty, which collectFrom records as
//   '0' — a bodyweight set.
//
// THE BUG IT CLOSES. The handler used to flip `done` and nothing else, and a
// set started from a routine or from the builder's "Start it" shows its target
// as grey placeholder text over an EMPTY box. Tick it without typing and both
// boxes are still '' underneath — so collectFrom, which keeps a ticked set only
// when it has reps, dropped it at Finish. Silently: the set was green on screen
// and absent from the log. Section C runs the old handler against the same
// session to show that is what it did.
//
// And the half that is left over: a ticked set with no reps and no rep target
// is still dropped (there is nothing to record), but it is no longer dropped
// without a word. Finish counts them and says so first. Section E drives the
// REAL runFinish, lifted out of workout.js by text the way month-erasure.mjs
// lifts it, and proves the count on the sheet is exactly the number of sets
// the record leaves out.
//
// Everything here drives the real functions. Nothing restates the rule.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC  = p => join(HERE, '..', p);
const WSRC = readFileSync(SRC('workout.js'), 'utf8');

/* ---------- the fake browser, and the staging ----------
   bodyweight-sets.mjs's rig: the modules under test are copied with their
   relative imports repointed at each other, and everything else becomes one
   generated stub whose export list is read out of the import statements. */
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
const dir = mkdtempSync(join(tmpdir(), 'rack-tick-'));
writeFileSync(join(dir, 'stub.mjs'), Array.from(stubbed).map(n => `export function ${n}() {}`).join('\n') + '\n');
for (const [file, text] of sources) {
  writeFileSync(join(dir, file.replace(/\.js$/, '.mjs')),
    text.replace(IMPORT_RE, (whole, q, spec) => {
      const base = spec.startsWith('./') ? spec.slice(2) : null;
      return base && REAL.includes(base) ? `from './${base.replace(/\.js$/, '.mjs')}'` : `from './stub.mjs'`;
    }));
}
const { tickSet, unsavedTicks, collectFrom, recordGroups } = await import(pathToFileURL(join(dir, 'workout.mjs')).href);

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

// A live set as the session holds it. Routine and builder sets carry tw/tr;
// a set added by hand or reopened for an edit carries neither.
const set = (w, r, extra) => ({ w, r, type: 'N', done: false, ...(extra || null) });
const ex = (exId, sets, extra) => ({ exId, name: exId, group: 'chest', equipment: 'barbell', sets, ...(extra || null) });

/* ================= A. FILLED FROM ITS TARGET ================= */
section('A. ticking an empty box that carries a target fills it from the target');
{
  const both = tickSet(set('', '', { tw: '185', tr: '8' }));
  check('both empty: the weight and the reps come from the target, and the set is done',
        both.w === '185' && both.r === '8' && both.done === true, J(both));
  const wOnly = tickSet(set('', '6', { tw: '185', tr: '8' }));
  check('weight empty, reps typed: the weight is filled and the typed reps stand',
        wOnly.w === '185' && wOnly.r === '6' && wOnly.done === true, J(wOnly));
  const rOnly = tickSet(set('190', '', { tw: '185', tr: '8' }));
  check('reps empty, weight typed: the reps are filled and the typed weight stands',
        rOnly.w === '190' && rOnly.r === '8' && rOnly.done === true, J(rOnly));
  // Stored pounds as strings on both sides, so the copy is the string itself:
  // no conversion, no rounding, the target exactly as the routine holds it.
  const odd = tickSet(set('', '', { tw: '220.46', tr: '5' }));
  check('the copy is the stored string itself — no conversion, no rounding', odd.w === '220.46', odd.w);
  check('the targets stay on the set, so the placeholder is still there if a box is cleared',
        both.tw === '185' && both.tr === '8');
  check('and a tick returns a NEW object — the handler assigns it, nothing else is mutated',
        (() => { const s = set('', '', { tw: '185', tr: '8' }); const t = tickSet(s); return t !== s && s.w === '' && s.done === false; })());
}

/* ================= B. WHAT IT NEVER TOUCHES ================= */
section('B. a box he typed into is never overwritten, and unticking clears nothing');
{
  const typed = tickSet(set('200', '10', { tw: '185', tr: '8' }));
  check('both typed: neither is replaced by the target', typed.w === '200' && typed.r === '10' && typed.done, J(typed));
  const zero = tickSet(set('0', '12', { tw: '25', tr: '8' }));
  check('a typed 0 is a value, not a blank — a bodyweight set is not given the target weight',
        zero.w === '0' && zero.r === '12', J(zero));

  const on = tickSet(set('', '', { tw: '185', tr: '8' }));
  const off = tickSet(on);
  check('unticking leaves the filled numbers where they are', off.done === false && off.w === '185' && off.r === '8', J(off));
  const typedOff = tickSet({ ...set('200', '10'), done: true });
  check('and unticking a typed set leaves it as typed', typedOff.done === false && typedOff.w === '200' && typedOff.r === '10');
  const again = tickSet(off);
  check('ticking it again changes nothing but the tick', again.done === true && again.w === '185' && again.r === '8');
}

/* ================= C. BODYWEIGHT, AND NO TARGETS AT ALL ================= */
section('C. a bodyweight target, an edit with no targets, and the old handler for contrast');
{
  const bw = tickSet(set('', '', { tw: '', tr: '12' }));
  check('a weight target of \'\' leaves the weight empty — it is a bodyweight set', bw.w === '' && bw.r === '12' && bw.done, J(bw));
  const rec = collectFrom([ex('pull-up', [bw])]);
  check('and collectFrom records it the way the v40 rule records every blank weight: \'0\'',
        rec.length === 1 && rec[0].sets[0].w === '0' && rec[0].sets[0].r === '12', J(rec));
  check('with the targets stripped — they are scaffolding, not part of the record',
        rec.length === 1 && !('tw' in rec[0].sets[0]) && !('tr' in rec[0].sets[0]));
  const bw0 = tickSet(set('', '', { tw: '0', tr: '10' }));
  check('a stored \'0\' target is a weight like any other and is copied as one', bw0.w === '0' && bw0.r === '10');

  // An edit of a past session: rebuilt from the record, so every set arrives
  // ticked and no set has a target. The rule has nothing to act on.
  const past = { w: '185', r: '5', type: 'N', done: true };
  const un = tickSet(past);
  check('editing a past session: unticking is just an untick', un.done === false && un.w === '185' && un.r === '5' && !('tw' in un));
  const re = tickSet(un);
  check('and ticking again is just a tick', re.done === true && re.w === '185' && re.r === '5');
  const blankEdit = tickSet({ w: '', r: '', type: 'N', done: false });
  check('a set with no target and nothing typed is ticked and filled with nothing', blankEdit.done && blankEdit.w === '' && blankEdit.r === '');

  // The session a routine or "Start it" hands startWorkout: every box empty,
  // every target set. Ticked straight through with the real rule, and then
  // with the handler as it was — a bare flip of `done`.
  const preset = [
    ex('bench', [set('', '', { tw: '185', tr: '8' }), set('', '', { tw: '185', tr: '8' }), set('', '', { tw: '185', tr: '6' })]),
    ex('pull-up', [set('', '', { tw: '', tr: '10' }), set('', '', { tw: '', tr: '8' })], { group: 'back', equipment: 'bodyweight' })
  ];
  const withRule = clone(preset).map(e => ({ ...e, sets: e.sets.map(tickSet) }));
  const bareFlip = clone(preset).map(e => ({ ...e, sets: e.sets.map(s => ({ ...s, done: !s.done })) }));
  const kept = collectFrom(withRule);
  const lostOld = collectFrom(bareFlip);
  check('a routine ticked straight through records every set, at the target numbers',
        kept.reduce((a, e) => a + e.sets.length, 0) === 5 &&
        J(kept[0].sets.map(s => [s.w, s.r])) === J([['185', '8'], ['185', '8'], ['185', '6']]) &&
        J(kept[1].sets.map(s => [s.w, s.r])) === J([['0', '10'], ['0', '8']]), J(kept));
  check('where the old bare flip recorded NONE of them — the silent drop this closes',
        lostOld.length === 0, J(lostOld));
  check('and the old flip left every one of them ticked-and-unsaved, which is what Finish now counts',
        unsavedTicks(bareFlip) === 5 && unsavedTicks(withRule) === 0,
        unsavedTicks(bareFlip) + ' / ' + unsavedTicks(withRule));
}

/* ================= D. THE COUNT ================= */
section('D. unsavedTicks counts exactly the ticked sets collectFrom leaves out');
{
  const fixtures = {
    'nothing lost': [ex('bench', [{ ...set('185', '5'), done: true }, { ...set('185', '5'), done: true }])],
    'two lost, one unticked': [
      ex('bench', [{ ...set('185', '5'), done: true }, { ...set('', ''), done: true }, set('185', '')]),
      ex('row', [{ ...set('155', ''), done: true }, { ...set('', '8'), done: true }])
    ],
    'everything lost': [ex('bench', [{ ...set('', ''), done: true }, { ...set('200', ''), done: true }])],
    'untouched session': [ex('bench', [set('', '', { tw: '185', tr: '5' })])],
    'no exercises': []
  };
  Object.entries(fixtures).forEach(([name, exs]) => {
    const ticked = exs.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
    const recorded = collectFrom(clone(exs)).reduce((a, e) => a + e.sets.length, 0);
    check(name + ': ticked ' + ticked + ', recorded ' + recorded + ', so ' + (ticked - recorded) + ' counted',
          unsavedTicks(exs) === ticked - recorded, 'counted ' + unsavedTicks(exs));
  });
  check('a set with a weight and no reps is counted — collectFrom drops it too',
        unsavedTicks([ex('b', [{ ...set('185', ''), done: true }])]) === 1);
  check('an unticked empty set is not — nothing was claimed', unsavedTicks([ex('b', [set('', '')])]) === 0);
  check('and junk in the session is survived rather than thrown on',
        unsavedTicks(undefined) === 0 && unsavedTicks([null, { sets: null }, ex('b', [null])]) === 0);
}

/* ================= E. FINISH, DRIVEN ================= */
section('E. Finish — the real runFinish, and the sheet it puts up first');
{
  function lift(name) {
    const re = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm');
    const m = re.exec(WSRC);
    if (!m) throw new Error('tick-targets: ' + name + '() is gone from workout.js');
    const end = WSRC.indexOf('\n}\n', m.index);
    return WSRC.slice(m.index, end + 3).replace(/^export /, '');
  }
  // collectDone is a one-liner, which the lift's grammar cannot slice; the line
  // itself is asserted to be unchanged instead and written out here.
  const COLLECT_DONE = 'function collectDone() { return collectFrom(session.exercises); }';
  check('collectDone is still the one-line caller of collectFrom this harness assumes', WSRC.includes(COLLECT_DONE));

  // recordGroups (v47) is handed in as the real export: runFinish builds the
  // record's groups with it, and what it answers is record-groups.mjs's job.
  const STUBS = ['collectFrom', 'recordGroups', 'confirmSheet', 'write', 'toast', 'bump', 'LS', 'todayKey', 'computeVolume',
                 'allSessions', 'detectPRs', 'sessionMilestones', 'wu', 'trimHistory', 'foldSessionIntoHistory',
                 'loadMonth', 'invalidate', 'refreshCoachSessions', 'releaseWakeLock', 'clearRest', 'render'];
  function rig(exercises) {
    const log = { sheets: [], writes: [], toasts: [] };
    const stubs = {
      collectFrom, recordGroups,
      confirmSheet: o => log.sheets.push(o),
      write: async (p, v) => { log.writes.push([p, clone(v)]); },
      toast: m => log.toasts.push(m), bump: () => {},
      LS: { get: (k, f) => f, set: () => {}, del: () => {} },
      todayKey: (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
      computeVolume: () => 0, allSessions: async () => [], detectPRs: () => ({ prs: [], firsts: [] }),
      sessionMilestones: () => [], wu: () => 'lb', trimHistory: h => h, foldSessionIntoHistory: h => h,
      loadMonth: async () => ({}), invalidate: () => {}, refreshCoachSessions: async () => true,
      releaseWakeLock: () => {}, clearRest: () => {}, render: () => {}
    };
    const body = 'let session = null, summary = null, peek = false, history = {}, monthCache = {};\n' +
      'let finishing = false;\n' + COLLECT_DONE + '\n' +
      [lift('unsavedTicks'), lift('finishWorkout'), lift('runFinish')].join('\n') +
      '\nreturn { finishWorkout, set: s => { session = s; }, get: () => session, summary: () => summary };';
    const api = new Function(...STUBS, body)(...STUBS.map(k => stubs[k]));
    api.set({ id: 'wtest', name: 'Test', startedAt: new Date(2026, 8, 22, 18, 0).getTime(), exercises: clone(exercises) });
    api.log = log;
    return api;
  }
  const saved = log => log.writes.filter(([p]) => p.startsWith('workouts/'));

  // Today's path, exactly: nothing lost, no sheet, one write.
  {
    const m = rig([ex('bench', [{ ...set('185', '5'), done: true }, { ...set('185', '5'), done: true }])]);
    await m.finishWorkout();
    check('nothing lost: no sheet at all, and the workout is written at once — the path it always took',
          m.log.sheets.length === 0 && saved(m.log).length === 1 && !!m.summary(), m.log.sheets.length + ' sheets');
  }

  // Two lost, one unticked, three recorded.
  const MIXED = [
    ex('bench', [{ ...set('185', '5'), done: true }, { ...set('185', '5'), done: true }, { ...set('', ''), done: true }]),
    ex('row', [{ ...set('155', '8'), done: true }, { ...set('155', ''), done: true }, set('', '')])
  ];
  {
    const m = rig(MIXED);
    await m.finishWorkout({ type: 'click' });   // what onclick really hands it
    const sh = m.log.sheets[0] || {};
    check('two ticked sets with no reps: Finish stops and puts the sheet up first',
          m.log.sheets.length === 1 && saved(m.log).length === 0, m.log.sheets.length + ' sheets, ' + saved(m.log).length + ' writes');
    check('and the sheet counts exactly the two the record would leave out',
          sh.body === '2 ticked sets have no reps and won’t be saved.' && unsavedTicks(MIXED) === 2, sh.body);
    check('offering Save anyway and Go back', sh.confirmLabel === 'Save anyway' && sh.cancelLabel === 'Go back',
          sh.confirmLabel + ' / ' + sh.cancelLabel);
    check('and a click event is not mistaken for "save anyway"', saved(m.log).length === 0);

    // Guarded, so a Finish that never put the sheet up fails the checks below
    // with a reason rather than throwing on a button that is not there.
    if (typeof sh.onConfirm === 'function') await sh.onConfirm();
    const w = saved(m.log);
    const rec = w.length ? w[0][1] : null;
    check('Save anyway saves — once — with the three sets that have reps',
          w.length === 1 && rec.exercises.reduce((a, e) => a + e.sets.length, 0) === 3, rec ? J(rec.exercises.map(e => e.sets.length)) : 'no write');
    check('and does not ask a second time on the way through', m.log.sheets.length === 1);
  }
  {
    // Go back is the sheet's own cancel: it closes and nothing else happens.
    const m = rig(MIXED);
    await m.finishWorkout();
    check('Go back leaves the workout exactly where it was: nothing written, the session still live',
          saved(m.log).length === 0 && !!m.get() && m.get().exercises.length === 2 && !m.summary());
    if (m.get()) await m.finishWorkout();
    check('and Finish asks again the next time, rather than remembering an answer', m.log.sheets.length === 2);
  }
  {
    const m = rig([ex('bench', [{ ...set('185', '5'), done: true }, { ...set('', ''), done: true }])]);
    await m.finishWorkout();
    check('one lost set is said in the singular', (m.log.sheets[0] || {}).body === '1 ticked set has no reps and won’t be saved.',
          (m.log.sheets[0] || {}).body);
  }
  {
    const m = rig([ex('bench', [{ ...set('', ''), done: true }, { ...set('185', ''), done: true }])]);
    await m.finishWorkout();
    const sh = m.log.sheets[0] || {};
    check('every ticked set lost: the No completed sets sheet says why there is nothing, before it offers Discard',
          m.log.sheets.length === 1 && sh.title === 'No completed sets' && sh.confirmLabel === 'Discard' &&
          /^2 ticked sets have no reps/.test(sh.body || '') && sh.cancelLabel === 'Go back', J(sh));
  }
  {
    const m = rig([ex('bench', [set('', ''), set('', '')])]);
    await m.finishWorkout();
    const sh = m.log.sheets[0] || {};
    check('nothing ticked at all: the No completed sets sheet is word for word what it was',
          sh.body === 'There is nothing to save. Discard this workout?' && !('cancelLabel' in sh), J(sh));
  }
  {
    // The whole point, end to end: a routine's session ticked through the real
    // rule reaches Finish with nothing to warn about and every set in the record.
    const routine = [ex('bench', [set('', '', { tw: '185', tr: '8' }), set('', '', { tw: '185', tr: '8' })]),
                     ex('dip', [set('', '', { tw: '', tr: '12' })], { group: 'arms', equipment: 'bodyweight' })];
    const m = rig(routine.map(e => ({ ...e, sets: e.sets.map(tickSet) })));
    await m.finishWorkout();
    const w = saved(m.log);
    check('a routine ticked straight through: no warning, and every set lands at its target',
          m.log.sheets.length === 0 && w.length === 1 &&
          J(w[0][1].exercises.map(e => e.sets.map(s => s.w + 'x' + s.r))) === J([['185x8', '185x8'], ['0x12']]),
          w.length ? J(w[0][1].exercises.map(e => e.sets.map(s => s.w + 'x' + s.r))) : 'no write');
  }
}

/* ================= F. THE WIRING ================= */
section('F. the set check box is the thing that calls it');
{
  const at = WSRC.indexOf('function renderSet(');
  const body = at === -1 ? '' : WSRC.slice(at, WSRC.indexOf('\n}\n', at));
  const handler = (body.split("chk.onclick = () => {")[1] || '').split('\n  };')[0];
  check('renderSet’s check-box handler assigns tickSet(s) onto the set', /Object\.assign\(s, tickSet\(s\)\)/.test(handler), handler.slice(0, 120));
  check('and the bare flip is gone from it', !/s\.done = !s\.done/.test(handler));
  check('the rest timer still follows a tick exactly as before', /startRest\(\)/.test(handler));
  check('tickSet and unsavedTicks are exported for this file and the port, and runFinish uses the count',
        /export function tickSet\(s\)/.test(WSRC) && /export function unsavedTicks\(exercises\)/.test(WSRC) &&
        /const lost = unsavedTicks\(session\.exercises\);/.test(lift_('runFinish')));
  function lift_(name) {
    const m = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(WSRC);
    return m ? WSRC.slice(m.index, WSRC.indexOf('\n}\n', m.index)) : '';
  }
}

/* ================= G. THE BLOCK CHECK BOX ================= */
section('G. the block check box ticks through tickSet — a block of grey targets fills in like single ticks');
{
  /* Until v46 the block box ticked only sets that already had reps, so a block
     started from a routine — every box grey — could not be ticked at all, and
     one with some sets typed ticked those and left the rest. It goes through
     tickSet now, row by row. Its three pure pieces are lifted out of the real
     workout.js and run with the real tickSet. */
  const liftB = name => {
    const m = new RegExp('^function ' + name + '\\(', 'm').exec(WSRC);
    if (!m) throw new Error('tick-targets: ' + name + '() is gone from workout.js');
    return WSRC.slice(m.index, WSRC.indexOf('\n}\n', m.index) + 3);
  };
  const K = new Function('tickSet', [liftB('blockFillableSets'), liftB('blockTicked'), liftB('setBlockDone')].join('\n') +
    '\nreturn { blockFillableSets, blockTicked, setBlockDone };')(tickSet);
  const inBlock = (id, sets) => ({ ...ex(id, sets), block: 1 });
  const grey = [inBlock('bench', [set('', '', { tw: '185', tr: '8' }), set('', '', { tw: '185', tr: '6' })]),
                inBlock('dip', [set('', '', { tw: '', tr: '12' })])];
  check('a block of grey target sets is tickable — every set in it has a rep target to fill from',
        K.blockFillableSets(grey, 1).length === 3 && !K.blockTicked(grey, 1));
  const on = K.setBlockDone(clone(grey), 1, true);
  const one = clone(grey).map(e => ({ ...e, sets: e.sets.map(tickSet) }));
  check('ticked, it fills in EXACTLY as ticking each set would', J(on) === J(one), J(on.map(e => e.sets.map(x => x.w + 'x' + x.r))));
  check('and the box then reads ticked', K.blockTicked(on, 1));
  check('and every set in it reaches the record at its target — none dropped',
        J(collectFrom(on).map(e => e.sets.map(x => x.w + 'x' + x.r))) === J([['185x8', '185x6'], ['0x12']]),
        J(collectFrom(on).map(e => e.sets.map(x => x.w + 'x' + x.r))));
  const off = K.setBlockDone(clone(on), 1, false);
  check('unticked, every set is unticked and keeps what it was filled with',
        off.every(e => e.sets.every(x => x.done === false)) && off[0].sets[0].w === '185' && off[0].sets[0].r === '8');

  const typed = [inBlock('bench', [set('200', '10', { tw: '185', tr: '8' }), set('', '', { tw: '185', tr: '8' })])];
  const t = K.setBlockDone(clone(typed), 1, true)[0].sets;
  check('a box he typed in is never overwritten by the block box either', t[0].w === '200' && t[0].r === '10' &&
        t[1].w === '185' && t[1].r === '8', J(t));
  const already = [inBlock('bench', [{ ...set('185', '5'), done: true }, set('', '', { tw: '185', tr: '5' })])];
  const a2 = K.setBlockDone(clone(already), 1, true)[0].sets;
  check('a set already ticked is left alone — tickSet is a toggle, and the box only ticks what is not',
        a2[0].done === true && a2[1].done === true && a2[1].r === '5', J(a2));

  const bare = [inBlock('bench', [set('', ''), set('', '', { tw: '185', tr: '' })])];
  check('a set with neither reps nor a rep target is not tickable by the box — Finish could only drop it',
        K.blockFillableSets(bare, 1).length === 0 && unsavedTicks(K.setBlockDone(clone(bare), 1, true)) === 0);
  const mixed = [inBlock('bench', [set('', '', { tw: '185', tr: '8' }), set('', '')])];
  const m2 = K.setBlockDone(clone(mixed), 1, true);
  check('in a mixed block it ticks the one it can fill and leaves the empty one unticked',
        m2[0].sets[0].done === true && m2[0].sets[1].done === false && unsavedTicks(m2) === 0);
  check('other blocks and ungrouped exercises are untouched',
        J(K.setBlockDone([{ ...ex('row', [set('', '', { tw: '155', tr: '8' })]) }, ...clone(grey)], 1, true)[0]) ===
        J({ ...ex('row', [set('', '', { tw: '155', tr: '8' })]) }));
  check('the block box’s handler goes through setBlockDone, and setBlockDone through tickSet',
        /session\.exercises = setBlockDone\(session\.exercises, n, next\);/.test(WSRC) && /tickSet\(s\)/.test(liftB('setBlockDone')));
}

/* ================= H. THE QTY-ROW BUTTONS ================= */
section('H. Log, Save and Add keep the 54px the stylesheet gives them');
{
  /* Phase 0b took an inline `flex: 0 0 auto` off Weight's Log: over the
     .qty-row rule's zero padding it sized the button to its word. Steps' Save
     and Water's Add carried the same line and lost it in the same ship. Read
     from the files that draw them, and from the rule they now get. */
  const css = readFileSync(SRC('rack.css'), 'utf8');
  check('the stylesheet still reserves 54px for a .qty-row button', /\.qty-row \.btn \{ flex: 0 0 54px; padding: 0; \}/.test(css));
  ['weight.js', 'steps.js', 'water.js'].forEach(f => {
    const code = readFileSync(SRC(f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
    check(f + ': no inline flex on a button — it gets the 54px', !/\.style\.flex\s*=\s*'0 0 auto'/.test(code));
  });
}

/* ---------- report ---------- */
console.log('\na ticked set keeps what it was told\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
