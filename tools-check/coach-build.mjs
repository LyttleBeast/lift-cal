#!/usr/bin/env node
//
// Verifier for the workout builder — Coach ship two.
//
//   node tools-check/coach-build.mjs
//
// The builder turns "what should I train today" into a workout he can start,
// and every part of it comes out of his own log. That makes its failure modes
// unusually concrete, and every one of them is a number or a name on a screen
// he is about to lift from:
//
//   a proposal built from the wrong session, or in the wrong order, or with
//     its lifting blocks flattened
//   an exercise he hid coming back, or a deleted one silently vanishing, or —
//     worst — one of his own custom exercises dropped as if it were gone
//   a "Start it" that is not what starting the same workout saved as a routine
//     would have been
//   a pre-filled set that arrives already ticked, which is a set he did not do
//     sitting in the log as one he did
//   a number, anywhere, that he never lifted — and above all after a layoff,
//     where a percentage off is exactly what a builder reaches for
//
// So this file drives the REAL engine — coach.js and coach-build.js, staged
// against a stubbed store the way every Coach verifier stages them — and it
// holds no copy of any rule. The expectations are read out of the fixture
// (which session is most recent is a question for its dates, not for this
// file) and out of the real modules: coach-tags.js says which lift is an
// isolation lift, exercises.js says which ids exist, and routines.js's own
// toSession() and saveSessionAsRoutine() are LIFTED VERBATIM out of the source
// and run, so "round-trips through toSession's shape" is tested against the
// function the app calls rather than against a description of it.
//
// Every fixture is an offset from a fixed epoch, never from today, so this file
// answers the same in any time zone at any hour.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-build-'));
const at  = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
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
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
/* coach-live.js, the in-session read (ship three), is staged the same way:
   coach.js imports it too, and it takes the same session math through the stub. */
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + at('coach-build.mjs'))
  .replace("from './coach-live.js'", 'from ' + at('coach-live.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));

const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const B = await import(pathToFileURL(join(dir, 'coach-build.mjs')).href);
const { EXERCISES, GROUPS } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);
const { tagsFor } = await import(pathToFileURL(join(ROOT, 'coach-tags.js')).href);
const U = await import(pathToFileURL(join(ROOT, 'units.js')).href);
const { fmtDateFull } = await import(pathToFileURL(join(ROOT, 'ui.js')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(' | ') + (xs.length > 8 ? ' … (' + xs.length + ')' : '');

// Deep equality that does not care about key order — the shape is the
// contract, not the order a spread happened to write keys in.
const canon = v => Array.isArray(v) ? v.map(canon)
  : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/* ---------- routines.js, lifted ----------
   Top-level functions close with a `}` in column one — the same grammar
   month-erasure.mjs lifts workout.js by. A function that moves or is renamed
   throws here rather than letting this file test nothing. */
const RSRC = src('routines.js');
function lift(name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(RSRC);
  if (!m) throw new Error('coach-build: ' + name + '() is gone from routines.js — this check is stale');
  const end = RSRC.indexOf('\n}\n', m.index);
  if (end < 0) throw new Error('coach-build: could not find the end of ' + name + '()');
  return RSRC.slice(m.index, end + 3).replace(/^export /, '');
}

/* Just enough of the DOM for saveSessionAsRoutine's sheet: it builds a name box
   and a Save button, and the Save button's handler is what writes the
   routine. Everything that would reach the database is a stub that records. */
function mkEl(tag, cls, text) {
  const n = { tag, className: cls || '', textContent: text || '', value: '', placeholder: '',
              children: [], style: {}, onclick: null, type: '', autocapitalize: '' };
  n.appendChild = c => { n.children.push(c); return c; };
  n.focus = () => {};
  return n;
}
const walk = (n, out = []) => { (n.children || []).forEach(c => { out.push(c); walk(c, out); }); return out; };

function routinesHarness() {
  const state = { routines: {}, toasts: [], closed: 0, sheets: [] };
  const factory = new Function('sheet', 'el', 'noteEl', 'toast', 'routines', 'persist',
    lift('blankRoutine') + '\n' + lift('toSession') + '\n' + lift('saveSessionAsRoutine') +
    '\nreturn { blankRoutine, toSession, saveSessionAsRoutine };');
  const api = factory(
    () => { const sh = mkEl('div', 'sheet'); state.sheets.push(sh); return { sh, close: () => { state.closed++; } }; },
    mkEl, t => mkEl('div', 'note', t), t => state.toasts.push(t),
    state.routines, async () => {});
  return { state, ...api };
}
const RT = routinesHarness();

/* ================= THE FIXTURE =================
   Twelve weeks of a real rotation: a chest-and-arms day, a back-and-arms day
   and a leg day, each once a week. Chest is the stale one — nine days back
   against a usual seven — so the push shape is what the builder should build.

   The most recent push session carries everything the builder has to get
   right at once: a warm-up, a bodyweight set stored as '0', a lifting block
   duplicated, an exercise he has since HIDDEN, one of his own custom
   exercises that still exists, and one he has since DELETED. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};

const CUSTOM = { id: 'custom-cable-chest-press-ab12c', name: 'Cable Chest Press', group: 'chest', equipment: 'cable' };
const CUSTOM2 = { id: 'custom-band-squeeze-q9w8e', name: 'Band Squeeze', group: 'chest', equipment: 'band' };
const DELETED = { id: 'custom-old-floor-thing-zz999', name: 'Old Floor Thing', group: 'chest', equipment: 'barbell' };
const HIDDEN = ['cable-crossover', 'machine-chest-press'];

// The library exactly as picker.js allExercises() builds it: built-ins and
// customs, minus anything hidden, with the fields coach-data.js keeps.
const LIB = {};
EXERCISES.concat([CUSTOM, CUSTOM2]).filter(x => !HIDDEN.includes(x.id))
  .forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const EVERY = Object.fromEntries(EXERCISES.concat([CUSTOM, CUSTOM2, DELETED]).map(x => [x.id, x]));

const ex = (id, sets, block) => ({
  exId: id, name: EVERY[id].name, group: EVERY[id].group, equipment: EVERY[id].equipment,
  ...(block ? { block } : null),
  sets: sets.map(([w, r, type]) => ({ w: String(w), r: String(r), type: type || 'N', done: true }))
});
const sess = (id, ago, exercises) => ({
  id, name: 'Evening session', startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises
});

const push = (ago, w) => sess('push' + ago, ago, [
  ex('barbell-bench-press', [[135, 10, 'W'], [w, 8], [w, 8], [w, 6, 'F']]),
  ex('push-up', [[0, 15], [0, 12]]),
  ex('incline-dumbbell-bench-press', [[60, 10], [60, 10]], 1),
  ex('triceps-pushdown-rope', [[50, 12], [50, 12]], 1),
  ex('incline-dumbbell-bench-press', [[60, 9], [60, 9]], 2),
  ex('triceps-pushdown-rope', [[50, 11], [50, 11]], 2),
  ex('cable-crossover', [[40, 12], [40, 12]]),
  ex(CUSTOM.id, [[70, 12], [70, 12]]),
  ex(DELETED.id, [[95, 10], [95, 10]])
]);
const pull = (ago, w) => sess('pull' + ago, ago, [
  ex('barbell-row', [[w, 8], [w, 8], [w, 8]]),
  ex('barbell-curl', [[65, 10], [65, 10]])
]);
const legs = (ago, w) => sess('legs' + ago, ago, [
  ex('back-squat-high-bar', [[w, 5], [w, 5], [w, 5]]),
  ex('leg-extension', [[90, 12], [90, 12]])
]);

const LOG = [];
for (let k = 0; k < 11; k++) {
  LOG.push(push(9 + 7 * k, 185 - k * 2.5));
  LOG.push(pull(4 + 7 * k, 155 - k * 2.5));
  LOG.push(legs(6 + 7 * k, 245 - k * 5));
}
// An older press and an older fly he HAS logged, outside the push days: what
// "his exercises first" has to find when something is swapped — and the fly is
// the one that must NOT be offered for bench, logged or not, because both are
// tagged and their patterns differ.
LOG.push(sess('extra40', 40, [ex('dumbbell-bench-press', [[70, 10], [70, 10], [70, 8]])]));
LOG.push(sess('extra50', 50, [ex('dumbbell-flye', [[30, 12], [30, 12]])]));
LOG.sort((a, b) => a.startedAt - b.startedAt);

const base = extra => ({
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable',
  sessions: LOG, lib: LIB, hidden: HIDDEN.slice(), libReady: true,
  routines: [], live: { active: false }, tier: { pro: true },
  targets: null, targetsSet: null, summaries: {}, steps: { days: {} },
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} },
  ...extra
});

const FULL = base({});
const c = C.coach(FULL);
const p = c.build({});

// What the fixture says the answer is — by its own dates.
const pushes = LOG.filter(s => s.id.startsWith('push')).sort((a, b) => b.startedAt - a.startedAt);
const want = pushes[0];
const wantLive = want.exercises.filter(e => LIB[e.exId] && !HIDDEN.includes(e.exId));

/* Every value a set in the proposal carries, wherever it sits, as strings. */
function numbersIn(v, out = []) {
  if (Array.isArray(v)) { v.forEach(x => numbersIn(x, out)); return out; }
  if (v && typeof v === 'object') {
    Object.keys(v).forEach(k => {
      if (['w', 'r', 'tw', 'tr'].includes(k) && v[k] !== '' && v[k] != null) out.push(k + '=' + String(v[k]));
      else numbersIn(v[k], out);
    });
  }
  return out;
}
const logged = sessions => {
  const w = new Set(), r = new Set();
  sessions.forEach(s => s.exercises.forEach(e => e.sets.forEach(x => { w.add(String(x.w)); r.add(String(x.r)); })));
  return { w, r };
};
function strangers(proposal, sessions) {
  const L = logged(sessions);
  return numbersIn(proposal).filter(t => {
    const [k, v] = t.split('=');
    return (k === 'w' || k === 'tw') ? !L.w.has(v) : !L.r.has(v);
  });
}

/* ================= A. WHAT IT IS BUILT FROM ================= */
section('A. the most recent session of the shape that has waited longest');
{
  check('on a real log, the builder proposes something', !!p, p ? p.key : 'null');
  check('the focus is the shape session.shapeOverdue names — the headline finding’s own',
        !!p && c.build({}).focus.id === 'shape:chest+arms', p && p.focus.id);
  check('built from the MOST RECENT push session, by the fixture’s own dates (' + want.id + ')',
        !!p && p.base.id === want.id, p && p.base.id);
  check('not merely from the most recent session — a pull day came five days later',
        LOG[LOG.length - 1].id !== want.id && p.base.id !== LOG[LOG.length - 1].id,
        LOG[LOG.length - 1].id);
  check('its exercises, in the order he did them',
        same(p.exercises.map(e => e.exId), wantLive.map(e => e.exId)),
        list(p.exercises.map(e => e.exId)));
  check('with his lifting blocks exactly as recorded — the duplicate block included',
        same(p.placeholders.exercises.map(e => e.block || null), wantLive.map(e => e.block || null)),
        JSON.stringify(p.placeholders.exercises.map(e => e.block || null)));
  check('and the SAME exercise twice where the block was duplicated, not merged into one',
        p.exercises.filter(e => e.exId === 'incline-dumbbell-bench-press').length === 2);
  check('the sets per exercise are the base session’s, count and type, a warm-up still a warm-up',
        p.placeholders.exercises.every((e, n) =>
          same(e.sets.map(s => s.type), wantLive[n].sets.map(s => s.type))),
        JSON.stringify(p.placeholders.exercises[0].sets.map(s => s.type)));
  check('and it names the session it was built from, dated the way the app dates a session',
        p.headline.includes(fmtDateFull(want._date)) && /your most recent/.test(p.headline),
        p.headline + ' // ' + fmtDateFull(want._date));
  check('with a reason built from facts, carrying its numbers',
        Array.isArray(p.reason) && p.reason.length >= 1 && /\d/.test(p.reason.join(' ')), p.reason.join(' '));
  check('the session is named for its shape, so Save as routine opens with that name',
        p.name === 'Chest and arms day' && p.record.name === p.name && p.placeholders.name === p.name, p.name);
}

/* ================= B. WHAT IS LEFT OUT ================= */
section('B. hidden and deleted exercises are dropped AND named; his own are kept');
{
  const ids = p.exercises.map(e => e.exId);
  check('the exercise he hid is not proposed', !ids.includes('cable-crossover'));
  check('the custom exercise he deleted is not proposed', !ids.includes(DELETED.id));
  check('the custom exercise that still exists IS — it is his', ids.includes(CUSTOM.id), list(ids));
  check('under the name his library gives it', p.exercises.find(e => e.exId === CUSTOM.id).name === CUSTOM.name);
  const line = p.leftOutLine || '';
  check('the left-out line names the hidden one, and says why',
        /Cable Crossover — hidden in your library/.test(line), line);
  check('and names the deleted one, and says why in words true whether it was deleted or unreadable',
        line.includes(DELETED.name + ' — not in your library'), line);
  check('each said exactly once', (line.match(/Cable Crossover/g) || []).length === 1 &&
        (line.match(new RegExp(DELETED.name, 'g')) || []).length === 1, line);
  check('and the list agrees with the line', same(p.leftOut.map(x => x.exId).sort(), ['cable-crossover', DELETED.id].sort()));

  // A library that has not been read yet cannot tell his custom exercise from a
  // deleted one. Silence, not a proposal that drops his lift and calls it gone.
  check('before the library has been read, there is no proposal at all',
        C.coach(base({ libReady: false })).build({}) === null &&
        C.coach(base({ libReady: undefined })).build({}) === null);
  // Hidden wins over custom.
  const hideMine = C.coach(base({ hidden: HIDDEN.concat(CUSTOM.id) })).build({});
  check('a custom exercise he has hidden is left out like any other — hidden wins',
        !!hideMine && !hideMine.exercises.some(e => e.exId === CUSTOM.id) &&
        /Cable Chest Press — hidden in your library/.test(hideMine.leftOutLine || ''), hideMine && hideMine.leftOutLine);
}

/* ================= C. THE NUMBERS ================= */
section('C. two views of one proposal, and every number in both is one he lifted');
{
  // placeholders is exactly toSession()'s output for the routine this session
  // would save as — tested against the REAL toSession, lifted from routines.js.
  const asRoutine = {
    name: p.placeholders.name,
    exercises: p.placeholders.exercises.map(e => ({
      exId: e.exId, name: e.name, group: e.group, equipment: e.equipment,
      ...(e.block ? { block: e.block } : null),
      sets: e.sets.map(s => ({ tw: s.tw, tr: s.tr, type: s.type }))
    }))
  };
  check('`placeholders` round-trips through routines.js toSession() exactly',
        same(RT.toSession(asRoutine), p.placeholders));
  check('every placeholder box is empty — the logged number is ghost text, never a value',
        p.placeholders.exercises.every(e => e.sets.every(s => s.w === '' && s.r === '' && s.done === false)));
  check('and the ghost text is what he logged',
        p.placeholders.exercises.every((e, n) => e.sets.every((s, j) =>
          s.tw === (wantLive[n].sets[j].w || '') && s.tr === (wantLive[n].sets[j].r || ''))));

  check('`lastNumbers` exists on an ordinary log', !!p.lastNumbers);
  check('every set in it is done: false — a pre-filled set is not a set he did',
        p.lastNumbers.exercises.every(e => e.sets.every(s => s.done === false)),
        JSON.stringify(p.lastNumbers.exercises[0].sets));
  check('and its boxes are filled with exactly what he logged, as stored',
        p.lastNumbers.exercises.every((e, n) => e.sets.every((s, j) =>
          s.w === wantLive[n].sets[j].w && s.r === wantLive[n].sets[j].r)));
  const bw = p.lastNumbers.exercises.find(e => e.exId === 'push-up');
  check('a bodyweight set carries \'0\' exactly as stored — not "fixed" to blank',
        !!bw && bw.sets.every(s => s.w === '0') &&
        p.placeholders.exercises.find(e => e.exId === 'push-up').sets.every(s => s.tw === '0'));
  check('and the sheet says bodyweight in words rather than printing a zero',
        /bodyweight/.test(p.exercises.find(e => e.exId === 'push-up').line) &&
        !/\b0 lb\b/.test(p.exercises.find(e => e.exId === 'push-up').line),
        p.exercises.find(e => e.exId === 'push-up').line);

  const odd = strangers(p, [want]);
  check('no number anywhere in the proposal differs from one logged in the base session',
        numbersIn(p).length > 20 && !odd.length, odd.length ? list(odd) : numbersIn(p).length + ' numbers');
  // And the lines on the sheet: every load and every rep count is a logged one.
  const L = logged([want]);
  const bad = [];
  p.exercises.forEach(e => {
    [...e.line.matchAll(/at ([\d.]+) lb/g)].forEach(m => { if (!L.w.has(m[1])) bad.push(e.name + ': ' + m[1]); });
    [...e.line.matchAll(/× (\d+)/g)].forEach(m => { if (!L.r.has(m[1])) bad.push(e.name + ': ' + m[1]); });
  });
  check('every weight and rep count the SHEET prints is one he logged', !bad.length, list(bad));

  /* SAVE AS ROUTINE, through the real function. The record the builder hands
     it is saved exactly as a finished session would be, the name box opens on
     the shape's name, and starting that routine afterwards is the same
     workout as "Start it" now. */
  RT.saveSessionAsRoutine(p.record);
  const sh = RT.state.sheets[RT.state.sheets.length - 1];
  const nameBox = walk(sh).find(n => n.tag === 'input');
  check('Save as routine opens with the shape’s name in the box',
        !!nameBox && nameBox.value === p.name, nameBox && nameBox.value);
  const save = walk(sh).find(n => n.tag === 'button' && n.textContent === 'Save routine');
  await save.onclick();
  const saved = Object.values(RT.state.routines)[0];
  check('and saving it shows the existing "Saved <name>" toast', RT.state.toasts.includes('Saved ' + p.name),
        list(RT.state.toasts));
  check('and the routine it saved, started, IS "Start it" — the same exercises, blocks and ghost text',
        !!saved && same(RT.toSession(saved), p.placeholders));
}

/* ================= D. THE LAYOFF ================= */
section('D. after a layoff the pre-filled view is refused, not discounted');
{
  // The same log, a month later: the last session is well past three of his
  // own usual gaps, which is when returning_from_layoff fires.
  const later = base({ now: NOW + 30 * DAY });
  const cl = C.coach(later);
  const lp = cl.build({});
  check('the engine itself calls this a layoff', cl.ask('topic_train').id === 'returning_from_layoff',
        cl.ask('topic_train').id);
  check('and there is still a proposal — the builder is not silenced by a layoff', !!lp);
  check('`lastNumbers` is null', lp && lp.lastNumbers === null);
  check('and the proposal says how long it has been',
        !!lp && /Your last session was \d+ days ago/.test(lp.layoffLine || ''), lp && lp.layoffLine);
  const lastAgo = Math.min(...LOG.map(s => Math.round((NOW + 30 * DAY - s.startedAt) / DAY)));
  check('with the real figure — the days since his last session, from the fixture’s own dates',
        !!lp && (lp.layoffLine || '').includes(lastAgo + ' days'), lp && lp.layoffLine + ' / ' + lastAgo);
  const odd = lp ? strangers(lp, [lp && LOG.find(s => s.id === lp.base.id)]) : ['no proposal'];
  check('and no number anywhere in it differs from a logged one — nothing was stepped down',
        !!lp && numbersIn(lp).length >= 10 && !odd.length, list(odd));
  check('the targets are still there as ghost text, which is what the line promises',
        !!lp && lp.placeholders.exercises.some(e => e.sets.some(s => s.tw !== '')));
}

/* ================= E. SILENCE ================= */
section('E. no proposal during a live session, on a thin log, or on an unreadable one');
{
  const live = C.coach(base({ live: { active: true } }));
  check('a live session: no proposal — starting one would clobber it', live.build({}) === null);
  check('and the one line the sheet says instead is offered only because a proposal would exist',
        live.buildLive() === B.LIVE_LINE && c.buildLive() === null, String(live.buildLive()));
  // The five most recent sessions: below the headline finding's six.
  const thinLog = LOG.slice(-5);
  const thin = C.coach(base({ sessions: thinLog }));
  check('a thin log (' + thinLog.length + ' sessions in the window): no default proposal',
        thinLog.length < 6 && thin.build({}) === null);
  check('and the live line is not offered on it either — nothing is promised that could not be built',
        C.coach(base({ sessions: thinLog, live: { active: true } })).buildLive() === null);
  check('an unreadable log: nothing', C.coach(base({ log: 'unknown' })).build({}) === null);
  check('an empty log: nothing', C.coach(base({ log: 'empty', sessions: [] })).build({}) === null);
  /* A group focus needs one qualifying session and no more — on the same thin
     log, legs builds, because a leg day is in it. */
  const g = thin.build({ focus: 'group:legs' });
  check('a group focus needs one qualifying session: legs builds on the thin log',
        !!g && g.base.id === thinLog.filter(s => s.id.startsWith('legs')).sort((a, b) => b.startedAt - a.startedAt)[0].id,
        g && g.base.id);
  check('and a group with nothing behind it does not', thin.build({ focus: 'group:core' }) === null &&
        c.build({ focus: 'group:core' }) === null);
  check('a focus that is not a shape or a group is refused rather than guessed at',
        c.build({ focus: 'shape:nothing+here' }) === null && c.build({ focus: 'banana' }) === null);
}

/* ================= F. HIS ROUTINE, BY HIS NAME ================= */
section('F. a saved routine matching the shape is offered first, by its own name');
{
  const mine = { id: 'rPushA', name: 'Push A', exercises: [
    { exId: 'barbell-bench-press', group: 'chest', equipment: 'barbell' },
    { exId: 'triceps-pushdown-rope', group: 'arms', equipment: 'cable' }] };
  const other = { id: 'rBack', name: 'Back Only', exercises: [{ exId: 'barbell-row', group: 'back', equipment: 'barbell' }] };
  const rp = C.coach(base({ routines: [other, mine] })).build({});
  check('the routine that matches the shape is on the proposal, under his name',
        !!rp && !!rp.routine && rp.routine.name === 'Push A' && rp.routine.id === 'rPushA',
        rp && JSON.stringify(rp.routine));
  check('and the line offering it says so in his words',
        !!rp && rp.routineLine === 'You have a routine for this: Push A.', rp && rp.routineLine);
  check('and the workout is named for it too, rather than for the groups',
        !!rp && rp.name === 'Push A' && /your most recent Push A/.test(rp.headline), rp && rp.headline);
  check('a routine that does not match the shape is not offered',
        !!rp && rp.routine.name !== 'Back Only' && p.routine === null && p.routineLine === null);
}

/* ================= G. SWAP ONE ================= */
section('G. swap one: same group, same pattern when both are tagged, his first, never hidden');
{
  const bench = p.exercises.find(e => e.exId === 'barbell-bench-press');
  const alts = bench.swaps;
  check('bench has alternatives, and never more than five', alts.length > 0 && alts.length <= B.SWAP_MAX, String(alts.length));
  check('every one is chest, like bench', alts.every(a => LIB[a.exId] && LIB[a.exId].group === 'chest'), list(alts.map(a => a.exId)));
  check('and every TAGGED one is a press, like bench',
        alts.every(a => !tagsFor(a.exId) || tagsFor(a.exId).pattern === tagsFor('barbell-bench-press').pattern),
        list(alts.map(a => a.exId + ':' + ((tagsFor(a.exId) || {}).pattern || 'untagged'))));
  check('his own logged press comes first — dumbbell bench, from the older session',
        alts[0] && alts[0].exId === 'dumbbell-bench-press', alts[0] && alts[0].exId);
  check('and his logged FLY is not offered for bench at all — both tagged, different patterns',
        !alts.some(a => a.exId === 'dumbbell-flye'), list(alts.map(a => a.exId)));
  check('a hidden exercise is never offered',
        !p.exercises.some(e => e.swaps.some(a => HIDDEN.includes(a.exId))));
  check('nor one already on the list',
        !p.exercises.some(e => e.swaps.some(a => p.exercises.some(x => x.exId === a.exId))));
  check('his custom exercise that he has never logged is offered ahead of the built-ins it competes with',
        (() => { const i = alts.findIndex(a => a.exId === CUSTOM2.id); return i === -1 || alts.slice(0, i).every(a => a.exId === 'dumbbell-bench-press'); })(),
        list(alts.map(a => a.exId)));

  // A custom (untagged) exercise swaps within its group only — any pattern.
  const mineRow = p.exercises.find(e => e.exId === CUSTOM.id);
  check('his custom exercise can be swapped, within chest',
        mineRow.swaps.length > 0 && mineRow.swaps.every(a => LIB[a.exId].group === 'chest'), list(mineRow.swaps.map(a => a.exId)));
  check('and across patterns, because it has none — his logged fly is a fair swap for it',
        mineRow.swaps.some(a => a.exId === 'dumbbell-flye'), list(mineRow.swaps.map(a => a.exId)));
  check('never into cardio', !p.exercises.some(e => e.swaps.some(a => LIB[a.exId].equipment === 'cardio')));

  // Taking the swap.
  const sp = c.build(alts[0].opts);
  const at = sp && sp.exercises.findIndex(e => e.from === 'barbell-bench-press');
  check('taking it re-runs the builder with new opts and puts the new lift in the same place',
        !!sp && at === p.exercises.findIndex(e => e.exId === 'barbell-bench-press') &&
        sp.exercises[at].exId === 'dumbbell-bench-press' && sp.exercises[at].swapped === true, sp && sp.key);
  check('with ITS OWN last numbers, from the session it was last in, and the note says which',
        !!sp && sp.exercises[at].line === '2 × 10 at 70 lb, 1 × 8 at 70 lb' &&
        sp.exercises[at].note.includes(fmtDateFull(key(NOW - 40 * DAY))), sp && sp.exercises[at].line + ' // ' + sp.exercises[at].note);
  check('and nothing in the swapped proposal is a number he never lifted',
        !!sp && !strangers(sp, LOG).length, sp && list(strangers(sp, LOG)));
  // A swap to a lift he has never logged brings the shape of the sets and no numbers.
  const fresh = alts.find(a => !LOG.some(s => s.exercises.some(e => e.exId === a.exId)));
  const fp = fresh && c.build(fresh.opts);
  const fe = fp && fp.exercises.find(e => e.exId === fresh.exId);
  check('a swap to a lift he has never logged carries no numbers at all, and says so',
        !!fe && fp.lastNumbers.exercises.find(e => e.exId === fresh.exId).sets.every(s => s.w === '' && s.r === '' && s.tw === '' && s.tr === '') &&
        /Not in your log yet/.test(fe.note) && /^\d+ sets?$/.test(fe.line), fe && fe.line + ' // ' + fe.note);
  check('in the same number of sets, of the same types, as the lift it replaced',
        !!fe && same(fp.placeholders.exercises.find(e => e.exId === fresh.exId).sets.map(s => s.type),
                     wantLive.find(e => e.exId === 'barbell-bench-press').sets.map(s => s.type)));
  // A duplicated block swaps as one thing.
  const incl = p.exercises.find(e => e.exId === 'incline-dumbbell-bench-press');
  const ip = incl.swaps.length ? c.build(incl.swaps[0].opts) : null;
  check('an exercise repeated in a duplicated block swaps everywhere it appears, blocks intact',
        !!ip && ip.exercises.filter(e => e.exId === incl.swaps[0].exId).length === 2 &&
        !ip.exercises.some(e => e.exId === 'incline-dumbbell-bench-press') &&
        same(ip.placeholders.exercises.map(e => e.block || null), p.placeholders.exercises.map(e => e.block || null)));
  // And back again.
  const back = sp && sp.exercises[at].swaps.find(a => a.exId === 'barbell-bench-press');
  check('swapping back to the original is on offer, and lands exactly where it started',
        !!back && c.build(back.opts).key === p.key, back ? c.build(back.opts).key : 'not offered');
}

/* ================= H. FEWER EXERCISES ================= */
section('H. fewer: the last isolation lift goes first, then the last exercise');
{
  const isIso = id => (tagsFor(id) || {}).load === 'isolation';
  const lastIso = p.exercises.map((e, n) => [e, n]).filter(([e]) => isIso(e.exId)).pop();
  const fp = c.build(p.fewer);
  check('"Fewer" is on offer, as a set of opts for the next call', !!p.fewer && Array.isArray(p.fewer.drop));
  check('it drops the LAST isolation lift by coach-tags’ own `load` (' + (lastIso && lastIso[0].name) + ')',
        !!fp && fp.exercises.length === p.exercises.length - 1 &&
        !fp.exercises.some(e => e.slot === lastIso[0].slot), fp && list(fp.exercises.map(e => e.slot)));
  // Keep asking until no isolation lift is left, then it takes the last one.
  let q = p, guard = 0;
  while (q.exercises.some(e => isIso(e.exId)) && q.fewer && guard++ < 20) q = c.build(q.fewer);
  const before = q.exercises.map(e => e.slot);
  const r = q.fewer ? c.build(q.fewer) : null;
  check('with no isolation lift left, the last exercise is the one that goes',
        !!r && same(r.exercises.map(e => e.slot), before.slice(0, -1)), r && list(r.exercises.map(e => e.slot)));
  check('his custom exercise is never taken for an isolation lift — it has no load',
        q.exercises.some(e => e.exId === CUSTOM.id));
  // Blocks that a drop empties are renumbered, through blocks.js.
  const blocks = r ? r.placeholders.exercises.map(e => e.block).filter(Boolean) : [];
  check('and what is left of the blocks is renumbered 1..N, never left with a gap',
        blocks.every((b, n) => n === 0 || b === blocks[n - 1] || b === blocks[n - 1] + 1) && (!blocks.length || blocks[0] === 1),
        JSON.stringify(blocks));
  // Down to one, and no further.
  let s = p; guard = 0;
  while (s.fewer && guard++ < 30) s = c.build(s.fewer);
  check('it stops at one exercise rather than offering an empty workout', s.exercises.length === 1 && s.fewer === null);
  // A swap after a drop does not bring the dropped lift back or take a different one.
  const afterDrop = c.build(p.fewer);
  const swapLater = afterDrop.exercises.find(e => e.swaps.length);
  const both = c.build(swapLater.swaps[0].opts);
  check('a swap taken after "Fewer" keeps exactly the drop that was made',
        both.exercises.length === afterDrop.exercises.length &&
        same(both.exercises.map(e => e.slot), afterDrop.exercises.map(e => e.slot)));
}

/* ================= I. TRAIN SOMETHING ELSE ================= */
section('I. something else: his other shapes and the six groups, only those with an answer');
{
  const opts = p.focuses;
  check('there are other things to train on this log', opts.length >= 2, list(opts.map(o => o.label)));
  const built = opts.map(o => c.build(o.opts));
  check('every option builds — nothing is offered that answers with nothing', built.every(Boolean),
        list(opts.filter((o, n) => !built[n]).map(o => o.label)));
  check('and every option builds from a different session, none of them the one on screen',
        new Set(built.map(b => b.base.id)).size === built.length && !built.some(b => b.base.id === p.base.id),
        list(built.map(b => b.base.id)));
  check('his other recurring shapes are there, by name',
        opts.some(o => o.label === 'Back and arms day') && opts.some(o => o.label === 'Legs day'), list(opts.map(o => o.label)));
  check('and no group with nothing behind it (core, shoulders)',
        !opts.some(o => /^(Core|Shoulders)$/.test(o.label)), list(opts.map(o => o.label)));
  const legs = c.build(opts.find(o => o.label === 'Legs day').opts);
  check('choosing one names it in the reason instead of calling it the one that waited longest',
        !!legs && /come round \d+ times/.test(legs.reason.join(' ')) && !/waited longest/.test(legs.reason.join(' ')),
        legs && legs.reason.join(' '));
  check('and from there, the default is on offer again as something else',
        legs.focuses.some(o => o.label === 'Chest and arms day'), list(legs.focuses.map(o => o.label)));
}

/* ================= J. DETERMINISM ================= */
section('J. same input, same output — byte for byte');
{
  const a = JSON.stringify(C.coach(FULL).build({}));
  check('built twice from the same input, identical', a === JSON.stringify(C.coach(FULL).build({})));
  check('built from a deep copy of the input, identical',
        a === JSON.stringify(C.coach(JSON.parse(JSON.stringify(FULL))).build({})));
  check('asked through a different engine instance with the same opts, identical',
        JSON.stringify(c.build(p.fewer)) === JSON.stringify(C.coach(FULL).build(JSON.parse(JSON.stringify(p.fewer)))));
  check('opts written in a different key order are the same proposal',
        JSON.stringify(c.build({ swap: { a: 'b' }, drop: [2, 1] })) === JSON.stringify(c.build({ drop: [1, 2], swap: { a: 'b' } })));
  check('two proposals are told apart by their key', new Set([p.key, c.build(p.fewer).key,
        c.build(p.focuses[0].opts).key]).size === 3);
  check('the input is not mutated by building from it', JSON.stringify(FULL) === JSON.stringify(base({})));
  // Kilos: the same proposal, the same numbers stored, and every printed load
  // converted by units.js exactly once.
  const k = C.coach({ ...FULL, u: 'kg' }).build({});
  check('on a metric account the stored numbers are identical — only the sheet converts',
        same(k.placeholders, p.placeholders) && same(k.lastNumbers, p.lastNumbers));
  const benchLb = p.exercises[0].line, benchKg = k.exercises[0].line;
  check('and the sheet reads in kilos, through units.js',
        benchKg.includes(U.fmtSetLoad('185', 'kg') + ' kg') && !/\blb\b/.test(benchKg) && /\blb\b/.test(benchLb),
        benchLb + ' // ' + benchKg);
}

/* ================= K. WHAT DO YOU WANT TO TRAIN? ================= */
section('K. the question "Make me a workout" asks, decided here — Coach’s pick, his shapes, the six groups');
{
  /* v46, from walking the builder: "Make me a workout" asks before it builds,
     and "Build it" does not. The choices are coach-build.js's buildMenu(),
     handed to the sheet by coach.js; the sheet draws them and decides nothing.
     So everything a choice can be is fenced here, in the pure layer. */
  const menu = c.buildMenu();
  const ids = menu.map(m => m.id);
  check('buildMenu is exported from coach-build.js with its two words, and coach.js hands it on',
        typeof B.buildMenu === 'function' && B.BUILD_ASK === 'What do you want to train?' &&
        B.BUILD_PICK === 'Tell me what to train' && typeof c.buildMenu === 'function');
  check('Coach’s own pick is first, and it is the default proposal — the one "Build it" makes',
        menu[0] && menu[0].id === 'pick' && menu[0].label === B.BUILD_PICK && same(menu[0].opts, {}) &&
        same(c.build(menu[0].opts), p), menu[0] && menu[0].label);
  const shapeAnswer = c.ask('ask_shape');
  check('and it is the focus the answer to "What should I train today?" is about',
        !!p && shapeAnswer.text.toLowerCase().includes(p.focus.label.toLowerCase()), shapeAnswer.text + ' / ' + (p && p.focus.label));

  const shapes = menu.filter(m => m.id.startsWith('shape:'));
  const groups = menu.filter(m => m.id.startsWith('group:'));
  check('then his shapes, then the groups — nothing else, and in that order',
        JSON.stringify(ids) === JSON.stringify(['pick'].concat(shapes.map(m => m.id), groups.map(m => m.id))), list(ids));
  check('every shape is named by the rule every sentence uses — the proposal for it calls itself the same',
        shapes.length > 0 && shapes.every(m => { const q = c.build(m.opts); return q && q.focus.label === m.label; }),
        list(shapes.map(m => m.label)));
  check('the shape the default is built from is on the list, and so is every other shape "Train something else" offers',
        shapes.some(m => m.opts.focus === p.focus.id) &&
        p.focuses.filter(f => f.opts.focus.startsWith('shape:')).every(f => shapes.some(m => m.opts.focus === f.opts.focus)),
        list(p.focuses.map(f => f.label)));
  const GROUPS6 = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
  const buildable = GROUPS6.filter(g => c.build({ focus: 'group:' + g }));
  check('the groups are exactly the six that propose() can answer, in the usual order, by their labels',
        JSON.stringify(groups.map(m => m.opts.focus)) === JSON.stringify(buildable.map(g => 'group:' + g)) &&
        groups.every(m => m.label === GROUPS[m.opts.focus.slice(6)].label),
        list(groups.map(m => m.label)) + ' vs ' + list(buildable));
  check('and at least one group is left out here because nothing builds it — the filter is real',
        buildable.length < GROUPS6.length, list(buildable));
  check('every chip on the menu builds — none opens on "Coach can’t build that one"',
        menu.every(m => !!c.build(m.opts)), list(menu.filter(m => !c.build(m.opts)).map(m => m.label)));

  // Silent where the builder is.
  check('no choices during a live session, before the library is read, or on an unreadable log',
        C.coach(base({ live: { active: true } })).buildMenu().length === 0 &&
        C.coach(base({ libReady: false })).buildMenu().length === 0 &&
        C.coach(base({ log: 'unknown' })).buildMenu().length === 0);
  check('and none when the builder is switched off',
        C.coach(base({ settings: { v: 1, mute: { build: true }, answers: {}, asked: {} } })).buildMenu().length === 0);
  // On a thin log the default does not build, so "Make me a workout" is not
  // offered at all — the question is never asked with nothing to answer it.
  const thin = C.coach(base({ sessions: LOG.slice(-5) }));
  check('a thin log: "Make me a workout" is not offered, so its question is never asked',
        thin.build({}) === null && !thin.topicsFor('train').some(t => t.id === 'ask_build'));

  // The two doors: one asks, one does not.
  check('"Make me a workout" answers with the question', c.ask('ask_build').id === 'build_menu' &&
        c.ask('ask_build').text === B.BUILD_ASK, c.ask('ask_build').text);
  check('"Build it" answers with the proposal’s first line — no question', c.ask('ask_build_now').id === 'build_workout' &&
        c.ask('ask_build_now').text === p.headline, c.ask('ask_build_now').text);
  check('same log, same menu — byte for byte', JSON.stringify(C.coach(FULL).buildMenu()) === JSON.stringify(menu));
  check('coach-ui.js draws the menu it is handed and writes none of its words',
        !/Tell me what to train/.test(src('coach-ui.js')) && /c\.buildMenu\(\)/.test(src('coach-ui.js')));
}

/* ---------- report ---------- */
console.log('\nCoach builds from the last time you did it\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
