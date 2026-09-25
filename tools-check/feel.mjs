#!/usr/bin/env node
//
// Verifier for "How did that feel?" — the recap's check-in (v53).
//
//   node tools-check/feel.mjs
//
// Micah, 24 Sep 2026: "1–10 how did you feel this workout energy wise, how did
// you feel strength wise compared to normal (% answer with 100%+ as an
// option)". Energy 1 to 10 and strength in five steps, saved with the session
// as `workouts/{mk}/{dd}/{id}/feel = { e, s, at }`. What has to hold:
//
//   IT IS HIS, AND IT IS SAFE.  normFeel() takes nothing but a real rating;
//        the rating is one child write AFTER the record is saved; the month
//        cache learns it only once that write resolves — and at once, so a
//        later whole-month write the same day carries it; an edit carries it
//        over unchanged (the trap: saveEdit() rebuilds the record from
//        scratch); Skip writes nothing.
//   IT IS HEARD.  A low rating brings up v52's "Anything Coach can’t see?" —
//        at strength 90% or less or energy 3 or less, never with Questions off
//        — the headline recomputes (8 of 10 earns "Great workout."), and "How
//        did today compare?" quotes it, beside the numbers, with no verdict.
//   IT CAN BE SWITCHED OFF.  "After a workout: how it felt", after "In the
//        gym", free for every tier; off, the card is never drawn.
//
// WHAT THIS RUNS. runFinish(), saveEdit(), deleteSession(), the month
// functions, the check-in and the recap are lifted verbatim out of
// ../workout.js — as month-erasure.mjs lifts them — against a model of RTDB's
// set() and a DOM shim, with the real analytics.js, units.js, ui.js and
// coach.js behind them. coach-data.js's two calls are the only stand-ins.

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
    tag, className: '', textContent: '', innerHTML: '', value: '',
    children: [], parent: null, attrs: {}, style: {}, dataset: {},
    disabled: false, onclick: null,
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
    querySelectorAll(sel) { return walk(n).filter(x => x.classList.contains(sel.replace(/^\./, ''))); }
  };
  return n;
}
function walk(n, out = []) { n.children.forEach(c => { out.push(c); walk(c, out); }); return out; }
const body = mkEl('body');
globalThis.document = {
  body, createElement: t => mkEl(t), createElementNS: (_ns, t) => mkEl(t),
  querySelector: sel => walk(body).find(x => x.classList.contains(sel.replace(/^\./, ''))) || null,
  getElementById: () => null
};
globalThis.window = { addEventListener() {} };

/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-feel-'));
const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
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
// v54: and coach-volume.js, which coach.js imports (the staging edit).
const COACH_DEPS = ['coach-prog', 'coach-overlap', 'coach-fuel', 'coach-ready', 'coach-build', 'coach-live', 'coach-volume'];
COACH_DEPS.concat(['coach']).forEach(name => writeFileSync(join(dir, name + '.mjs'), src(name + '.js')
  .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (n === 'analytics' || COACH_DEPS.includes(n) || n === 'coach'
    ? at(n + '.mjs') : real(n + '.js')))));
const C = await import(JSON.parse(at('coach.mjs')));
const A = await import(JSON.parse(at('analytics.mjs')));
const UI = await import(JSON.parse(real('ui.js')));
const U = await import(JSON.parse(real('units.js')));
const { EXERCISES } = await import(JSON.parse(real('exercises.js')));
const B = await import(JSON.parse(real('blocks.js')));

/* ---------- lifting the real functions out of workout.js ---------- */
const WSRC = src('workout.js');
function lift(name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(WSRC);
  if (!m) throw new Error('feel: ' + name + '() is gone from workout.js — the check-in or this check is stale');
  const end = WSRC.indexOf('\n}\n', m.index);
  return WSRC.slice(m.index, end + 2).replace(/^export /, '');
}
const LIFTED = ['collectFrom', 'computeVolume', 'recordGroups', 'unsavedTicks', 'historyRows', 'foldSessionIntoHistory', 'trimHistory',
  'loadMonth', 'watchMonth', 'saveMonth', 'refuseUnread', 'hydrateForWrite', 'deleteSession',
  'finishWorkout', 'runFinish', 'saveEdit', 'feelCard', 'saveFeel', 'renderSummary'];

/* RTDB's set(), modelled: a node replaced outright, {} and null a delete. */
function makeDb(seed) {
  const tree = clone(seed || {});
  const getAt = p => p.split('/').reduce((o, k) => (o == null ? undefined : o[k]), tree);
  const setAt = (p, value) => {
    const keys = p.split('/');
    const dead = value == null || (typeof value === 'object' && !Object.keys(value).length);
    let node = tree;
    keys.slice(0, -1).forEach(k => { if (node[k] == null || typeof node[k] !== 'object') node[k] = {}; node = node[k]; });
    if (dead) delete node[keys[keys.length - 1]]; else node[keys[keys.length - 1]] = clone(value);
  };
  return { tree: () => clone(tree), getAt, setAt };
}

function harness(o = {}) {
  const db = makeDb(o.seed);
  const S = { writes: [], toasts: [], marks: [], renders: 0, refreshes: 0, settings: o.settings || { v: 1, mute: {}, answers: {}, asked: {} },
              input: o.input || null, hold: null, refuse: null };
  const stubs = {
    read: async (p, f = null) => { const v = db.getAt(p); return v === undefined ? f : clone(v); },
    readExact: async p => { const v = db.getAt(p); return v === undefined ? null : clone(v); },
    write: async (p, v) => {
      S.writes.push({ p, v: clone(v) });
      if (S.hold && S.hold.test(p)) await new Promise(res => { S.release = res; });
      if (S.refuse && S.refuse.test(p)) throw new Error('PERMISSION_DENIED');
      db.setAt(p, v);
    },
    watch: () => () => {},
    toast: m => S.toasts.push(String(m)),
    todayKey: (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'),
    LS: { get: (k, f) => f, set: () => {}, del: () => {} },
    bump: () => {}, confirmSheet: () => {}, releaseWakeLock: () => {}, clearRest: () => {},
    render: () => { S.renders++; }, invalidate: () => {}, rebuildHistoryFromLog: async () => {},
    refreshCoachSessions: async () => { S.refreshes++; return true; },
    allSessions: async () => clone(o.prior || []),
    detectPRs: A.detectPRs, sessionMilestones: A.sessionMilestones, isWorking: A.isWorking, mergeSessionExercises: A.mergeSessionExercises,
    normalizeBlocks: B.normalizeBlocks, blockOrder: B.blockOrder,
    wu: () => 'lb',
    el: UI.el, noteEl: UI.noteEl, fmtDateFull: UI.fmtDateFull, fmtDuration: UI.fmtDuration,
    groupColor: A.groupColor, prDetail: A.prDetail, sessionReps: A.sessionReps, sameKindComparison: A.sameKindComparison,
    normFeel: A.normFeel, FEEL_STRENGTH: A.FEEL_STRENGTH,
    wOut: U.wOut, fmtSetLoad: U.fmtSetLoad, fmtVol: U.fmtVol, unitW: U.unitW,
    feelHarder: C.feelHarder, canMark: C.canMark, isMuted: C.isMuted, MARK_ASK: C.MARK_ASK, FEEL_S_WORDS: C.FEEL_S_WORDS,
    coachSettings: () => S.settings,
    markSession: (sess, r) => { S.marks.push([sess, r]); return Promise.resolve(true); },
    // coach-data.js's coachFinishRead(): finishRead() on the snapshot.
    coachFinishRead: (rec, extras) => C.finishRead(S.input || inputOf([]), rec, extras),
    saveSessionAsRoutine: () => {}, refreshStats: async () => {}, openStats: async () => {}
  };
  const NAMES = Object.keys(stubs);
  const api = new Function(...NAMES, `
let monthCache = {}, hydrated = new Set(), session = null, summary = null, peek = false, history = {};
let unwatchMonth = null, watchedMk = null, finishing = false;
function collectDone() { return collectFrom(session.exercises); }
${LIFTED.map(lift).join('\n')}
return {
  finish: s => { session = s; return finishWorkout(); },
  edit: s => { session = s; return saveEdit(); },
  del: (mk, dd, id) => deleteSession(mk, dd, id),
  load: mk => loadMonth(mk),
  draw: () => renderSummary(),
  summary: () => summary, setSummary: v => { summary = v; },
  cache: () => monthCache
};`)(...NAMES.map(k => stubs[k]));
  return { api, db, S };
}

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const find = (n, cls) => walk(n).filter(x => x.classList.contains(cls));
const buttons = n => walk(n).filter(x => x.tag === 'button');
const tap = (n, label) => { const b = buttons(n).find(x => x.textContent === label); if (b && !b.disabled) b.onclick(); return !!b; };
const flush = () => new Promise(r => setTimeout(r, 0));

/* ================= FIXTURES ================= */
const DAY = 864e5;
const NOW = Date.now();
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const live = (id, startedAt, rows) => ({ id, name: 'Push day', startedAt,
  exercises: rows.map(([exId, n, w, r]) => ({ exId, name: LIB[exId].name, group: LIB[exId].group, equipment: LIB[exId].equipment,
    sets: Array.from({ length: n }, () => ({ w: String(w), r: String(r), type: 'N', done: true })) })) });
const inputOf = sessions => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions, lib: LIB, hidden: [], libReady: true,
  routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} }
});
const PUSH = [['barbell-bench-press', 4, 185, 5], ['incline-dumbbell-bench-press', 4, 60, 10], ['triceps-pushdown-rope', 3, 50, 12]];
// Eight weeks of the same push day: an ordinary session is "Good work.".
const PRIOR = Array.from({ length: 8 }, (_, k) => {
  const s = live('p' + k, NOW - (3 + 7 * k) * DAY, PUSH);
  const exercises = s.exercises;
  return { ...s, _date: key(s.startedAt), endedAt: s.startedAt + 3600e3, durationSec: 3600,
           volume: A.computeVolume ? 0 : exercises.reduce((a, e) => a + e.sets.reduce((b, z) => b + z.w * z.r, 0), 0), exercises };
});
PRIOR.forEach(s => { s.volume = s.exercises.reduce((a, e) => a + e.sets.reduce((b, z) => b + parseFloat(z.w) * parseInt(z.r, 10), 0), 0); });

// Finish a session the ordinary way, and draw the recap it leaves.
async function finished(o = {}) {
  // Fifty minutes before Finish: shorter than every earlier session, so the
  // ordinary session earns no milestone of its own.
  const startedAt = NOW - 50 * 60e3;
  const h = harness({ prior: PRIOR, settings: o.settings, input: inputOf(PRIOR) });
  const s = live(o.id || 'w1', startedAt, PUSH);
  await h.api.finish(s);
  const dateK = key(startedAt);
  return { ...h, s, dateK, mk: dateK.slice(0, 7), dd: dateK.slice(8, 10) };
}
const feelCardOf = page => find(page, 'feel-card')[0] || null;
const rate = async (h, e, sLabel) => {
  const card = feelCardOf(h.api.draw());
  if (e != null) tap(card, String(e));
  if (sLabel) tap(card, sLabel);
  tap(card, 'Save');
  await flush(); await flush();
  return card;
};

/* ================= A. normFeel ================= */
section('A. normFeel — a rating, or null: every junk value fails safe');
{
  const ok = [[{ e: 8, s: 110, at: 5 }, { e: 8, s: 110, at: 5 }], [{ e: 1 }, { e: 1 }], [{ s: 120 }, { s: 120 }], [{ e: 10, s: 80 }, { e: 10, s: 80 }],
              [{ e: 7, s: 100, at: -1 }, { e: 7, s: 100 }], [{ e: 7, x: 'junk' }, { e: 7 }]];
  const junk = [null, undefined, 0, 1, 'feel', [], [8], {}, { e: 0 }, { e: 11 }, { e: 7.5 }, { e: '8' }, { e: NaN }, { e: Infinity },
                { s: 95 }, { s: '110' }, { s: 130 }, { s: 70 }, { s: null, e: null }, { at: 5 }, { e: -3, s: 105 }];
  check('a real rating comes back as itself — e 1 to 10, s one of 80/90/100/110/120, `at` when it is a moment',
        ok.every(([v, w]) => J(A.normFeel(v)) === J(w)), J(ok.map(([v]) => A.normFeel(v))));
  check('and every one of ' + junk.length + ' junk values is null — never a guess at what was meant',
        junk.every(v => A.normFeel(v) === null), J(junk.filter(v => A.normFeel(v) !== null)));
  check('the five strength steps, and his words for them', J(A.FEEL_STRENGTH) === '[80,90,100,110,120]' &&
        J(Object.values(C.FEEL_S_WORDS)) === J(['80% or less', '90%', '100%', '110%', '120%+']));
}

/* ================= B. THE WRITE ================= */
section('B. one child write, after the record — and the cache only once it has landed');
{
  const h = await finished();
  const recAt = h.S.writes.findIndex(w => w.p === `workouts/${h.mk}/${h.dd}/w1`);
  const page = h.api.draw();
  const card = feelCardOf(page);
  check('the recap draws "How did that feel?": ten energy chips in two rows of five, five strength steps, Save and Skip',
        !!card && find(card, 'eyebrow')[0].textContent === 'How did that feel?' &&
        J(find(card, 'feel-grid')[0].children.map(b => b.textContent)) === J(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']) &&
        J(find(card, 'feel-steps')[0].children.map(b => b.textContent)) === J(['80% or less', '90%', '100%', '110%', '120%+']) &&
        J(find(card, 'feel-cap').map(x => x.textContent)) === J(['Energy', 'Strength compared to your normal']) &&
        buttons(card).some(b => b.textContent === 'Save') && buttons(card).some(b => b.textContent === 'Skip'));
  const save = buttons(card).find(b => b.textContent === 'Save');
  check('Save waits for a pick', save.disabled === true);
  tap(card, '8');
  check('and is live once either row has one', save.disabled === false && buttons(card).find(b => b.textContent === '8').classList.contains('on'));
  tap(card, '8');
  check('a second tap takes the pick back', save.disabled === true);
  tap(card, '8'); tap(card, '110%');
  // Hold the rating's write in flight: nothing downstream may move yet.
  h.S.hold = /\/feel$/;
  tap(card, 'Save');
  await flush();
  const cachedEarly = h.api.cache()[h.mk][h.dd].w1.feel;
  const refreshesEarly = h.S.refreshes;
  check('while the write is in flight, the month cache and Coach are untouched',
        cachedEarly === undefined && refreshesEarly === 1, J({ cachedEarly, refreshesEarly }));
  h.S.release(); await flush(); await flush();
  const feelAt = h.S.writes.findIndex(w => /\/feel$/.test(w.p));
  const fw = h.S.writes[feelAt];
  check('one child write, to workouts/{mk}/{dd}/{id}/feel — after the record’s own',
        recAt >= 0 && feelAt > recAt && fw.p === `workouts/${h.mk}/${h.dd}/w1/feel` && fw.v.e === 8 && fw.v.s === 110 && Number.isFinite(fw.v.at) &&
        h.S.writes.filter(w => /\/feel$/.test(w.p)).length === 1, J(h.S.writes.map(w => w.p)));
  check('then, straight after it lands, the month cache holds it and Coach is told',
        J(h.api.cache()[h.mk][h.dd].w1.feel) === J(fw.v) && h.S.refreshes === 2 && J(h.db.getAt(`workouts/${h.mk}/${h.dd}/w1/feel`)) === J(fw.v));
  check('and nothing is written but the record and its rating — no container PUT', !h.S.writes.some(w => w.p === `workouts/${h.mk}` || w.p === 'workouts'));
  const again = feelCardOf(h.api.draw());
  check('once saved, the card is one line: "Energy 8/10 · Strength 110%"',
        (find(again, 'feel-line')[0] || {}).textContent === 'Energy 8/10 · Strength 110%' && !buttons(again).length);
  // A refused write: nothing moves, and he can try again.
  const r = await finished({ id: 'w2' });
  r.S.refuse = /\/feel$/;
  const rc = await rate(r, 6, '100%');
  check('a refused write: the cache has no rating, a toast says so, and Save is live again',
        r.api.cache()[r.mk][r.dd].w2.feel === undefined && r.S.toasts.some(t => /Not saved/.test(t)) &&
        buttons(rc).find(b => b.textContent === 'Save').disabled === false, J(r.S.toasts));
  // Either row alone is a rating.
  const e1 = await finished({ id: 'w3' }); await rate(e1, 4, null);
  const s1 = await finished({ id: 'w4' }); await rate(s1, null, '120%+');
  check('energy alone and strength alone are each a rating — "Energy 4/10", "Strength 120%+"',
        J(e1.db.getAt(`workouts/${e1.mk}/${e1.dd}/w3/feel`).e) === '4' && !('s' in e1.db.getAt(`workouts/${e1.mk}/${e1.dd}/w3/feel`)) &&
        find(feelCardOf(e1.api.draw()), 'feel-line')[0].textContent === 'Energy 4/10' &&
        find(feelCardOf(s1.api.draw()), 'feel-line')[0].textContent === 'Strength 120%+');
}

/* ================= C. SKIP ================= */
section('C. Skip writes nothing');
{
  const h = await finished();
  const before = h.S.writes.length;
  const page = h.api.draw();
  tap(feelCardOf(page), '7');
  tap(feelCardOf(page), 'Skip');
  await flush();
  check('Skip collapses the card and writes nothing at all', h.S.writes.length === before && !feelCardOf(page));
  check('and the recap drawn again leaves it collapsed', !feelCardOf(h.api.draw()));
}

/* ================= D. THE MARK QUESTION ================= */
section('D. a harder rating brings up "Anything Coach can’t see?" — exactly at strength 90% or less or energy 3 or less');
{
  const asked = async (e, s, settings) => { const h = await finished({ settings }); await rate(h, e, s); return { h, card: feelCardOf(h.api.draw()) }; };
  const cases = [[5, '90%', true], [5, '80% or less', true], [3, '100%', true], [1, null, true], [null, '90%', true],
                 [4, '100%', false], [5, null, false], [null, '110%', false], [9, '120%+', false], [4, '110%', false]];
  const wrong = [];
  for (const [e, s, want] of cases) {
    const { card } = await asked(e, s);
    const has = find(card, 'feel-ask').length === 1;
    if (has !== want) wrong.push(e + ' / ' + s + ': ' + has);
  }
  check('asked at strength 90 or 80, or energy 3 or less; not at 4 and 100, 5 alone, 110, 120 or 9 (' + cases.length + ' ratings)', !wrong.length, wrong.join(' | '));
  const { h, card } = await asked(5, '90%');
  const chips = find(find(card, 'feel-mark')[0], 'coach-chip').map(b => b.textContent);
  check('the same question and the same five chips as v52’s, under the saved line',
        find(card, 'feel-ask')[0].textContent === C.MARK_ASK.text && J(chips) === J(C.MARK_ASK.options.map(o => o.label)));
  tap(card, 'Slept badly');
  check('an answer is a mark on this one session, by the day it is filed under — through markSession()',
        J(h.S.marks) === J([[{ id: 'w1', date: h.dateK }, 'sleep']]), J(h.S.marks));
  check('and the acknowledgement is v52’s, word for word', find(card, 'feel-ack')[0].textContent === C.MARK_ASK.options[0].ack);
  check('drawn again, the question is not asked twice', !find(feelCardOf(h.api.draw()), 'feel-ask').length &&
        find(feelCardOf(h.api.draw()), 'feel-ack')[0].textContent === C.MARK_ASK.options[0].ack);
  const n = await asked(3, null);
  tap(n.card, 'Nothing');
  check('"Nothing" writes nothing, and says "Noted."', n.h.S.marks.length === 0 && find(n.card, 'feel-ack')[0].textContent === 'Noted.');
  const u = await asked(2, null);
  tap(u.card, 'Didn’t feel well');
  check('"Didn’t feel well" keeps its own acknowledgement, the one that leaves health alone',
        find(u.card, 'feel-ack')[0].textContent === C.MARK_ASK.options[3].ack && /Coach doesn’t do health/.test(C.MARK_ASK.options[3].ack));
  const q = await asked(2, '80% or less', { v: 1, mute: { questions: true }, answers: {}, asked: {} });
  check('Questions switched off: no chips, as v52’s markView() honours it', !find(q.card, 'feel-ask').length && !find(q.card, 'feel-mark').length);
  const m = await asked(2, '80% or less', { v: 1, mute: {}, answers: {}, asked: {}, marks: { w1: { r: 'sore', d: key(NOW - 50 * 60e3) } } });
  check('and a session already marked is not asked again', !find(m.card, 'feel-ask').length);
  // And the compare answer then sees it as marked.
  const inp = { ...inputOf(PRIOR.concat([{ ...m.h.api.cache()[m.h.mk][m.h.dd].w1, _date: m.h.dateK }])), settings: m.h.S.settings };
  const a = C.coach(inp).ask('ask_compare');
  check('"How did today compare?" sees the session as marked and asks nothing — it offers to clear the mark instead',
        !a.mark && !!a.marked, J({ mark: !!a.mark, marked: !!a.marked }));
}

/* ================= E. THE HEADLINE ================= */
section('E. the rating is heard: the headline recomputes, and "How did today compare?" quotes it');
{
  const h = await finished();
  h.api.draw();                               // the recap works its headline out when it first draws
  const before = h.api.summary().finish;
  await rate(h, 8, '100%');
  const after = h.api.summary().finish;
  check('an ordinary session is "Good work." — rated 8 of 10, it is "Great workout. You rated it 8 out of 10."',
        before.headline === 'Good work.' && after.headline === 'Great workout.' && after.line === 'You rated it 8 out of 10.' &&
        h.S.renders > 0, before.headline + ' → ' + after.headline + ' ' + after.line);
  const hero = find(h.api.draw(), 'summary-hero')[0];
  check('and the recap drawn again leads with it', walk(hero).find(x => x.tag === 'h1').textContent === 'Great workout.');
  const g = await finished();
  await rate(g, 5, '90%');
  check('rated 90% with nothing else to show: "Good work. Showing up on a harder day counts." (finish.mjs N5, and its chips above)',
        g.api.summary().finish.headline === 'Good work.' && g.api.summary().finish.line === 'Showing up on a harder day counts.');
  // How did today compare? — the rating after the shipped rows.
  const rec = { ...h.api.cache()[h.mk][h.dd].w1, _date: h.dateK };
  const say = feel => C.coach(inputOf(PRIOR.concat([{ ...rec, feel }]))).ask('ask_compare');
  const lines = a => [a.text].concat((a.more || []).map(m => m.text));
  const usual = say({ e: 8, s: 100, at: 1 });
  check('the numbers are his usual (the fixture): ' + usual.text, /^About your usual/.test(usual.text));
  check('"You rated it: energy 8/10, strength 100%." — after the lift rows', lines(usual).includes('You rated it: energy 8/10, strength 100%.') &&
        lines(usual).indexOf('You rated it: energy 8/10, strength 100%.') > lines(usual).findIndex(t => /Barbell Bench Press:/.test(t)), J(lines(usual)));
  check('the numbers usual, his rating 110%: both said, no verdict — "By the numbers it was your usual; you rated it 110%, energy 8/10."',
        lines(say({ e: 8, s: 110, at: 1 })).includes('By the numbers it was your usual; you rated it 110%, energy 8/10.'), J(lines(say({ e: 8, s: 110, at: 1 }))));
  check('"120%+" and "80% or less" as he gave them, and energy or strength alone',
        lines(say({ s: 120 })).includes('By the numbers it was your usual; you rated it 120%+.') &&
        lines(say({ s: 80, e: 4 })).includes('By the numbers it was your usual; you rated it 80% or less, energy 4/10.') &&
        lines(say({ e: 6 })).includes('You rated it: energy 6/10.'));
  check('no rating, no line', !lines(say(undefined)).some(t => /rated it/.test(t)));
  check('and the rating moves nothing: the targets and the next session read the same with it or without',
        J(C.coach(inputOf(PRIOR.concat([{ ...rec, feel: { e: 2, s: 80 } }]))).ask('ask_next')) === J(C.coach(inputOf(PRIOR.concat([rec]))).ask('ask_next')) &&
        J(C.coach(inputOf(PRIOR.concat([{ ...rec, feel: { e: 2, s: 80 } }]))).build({})) === J(C.coach(inputOf(PRIOR.concat([rec]))).build({})));
}

/* ================= F. SAFE FROM THE WHOLE-MONTH WRITES ================= */
section('F. a rating survives a later whole-month write the same day, and an edit carries it over unchanged');
{
  // Rate, then delete another session from the same day: the PUT of the
  // month is built from the cache, which must already hold the rating.
  const h = await finished();
  await rate(h, 7, '110%');
  const saved = clone(h.db.getAt(`workouts/${h.mk}/${h.dd}/w1/feel`));
  const other = { ...live('w9', NOW - 5 * 3600e3, PUSH), endedAt: NOW - 4 * 3600e3, durationSec: 3600, volume: 1, groups: ['chest'] };
  h.api.cache()[h.mk][h.dd].w9 = other;
  h.db.setAt(`workouts/${h.mk}/${h.dd}/w9`, other);
  const ok = await h.api.del(h.mk, h.dd, 'w9');
  const put = h.S.writes.filter(w => w.p === `workouts/${h.mk}`).pop();
  check('delete another session that day: the whole-month PUT carries the rating, and the database keeps it',
        ok === true && !!put && J(put.v[h.dd].w1.feel) === J(saved) && J(h.db.getAt(`workouts/${h.mk}/${h.dd}/w1/feel`)) === J(saved) &&
        !(put.v[h.dd].w9), J(put && put.v[h.dd] && Object.keys(put.v[h.dd])));

  // THE TRAP: saveEdit() rebuilds the record from scratch.
  const edit = async (moveTo) => {
    const x = await finished({ id: 'we' });
    await rate(x, 9, '120%+');
    const stored = clone(x.db.getAt(`workouts/${x.mk}/${x.dd}/we`));
    const s = { id: 'we', name: 'Push day', startedAt: stored.startedAt,
                exercises: clone(stored.exercises).map(ex => ({ ...ex, sets: ex.sets.map(z => ({ ...z, done: true })) })),
                _edit: { mk: x.mk, dd: x.dd, dateKey: x.dateK, durationSec: stored.durationSec, newDateKey: moveTo || null } };
    s.exercises[0].sets.push({ w: '185', r: '5', type: 'N', done: true });     // the edit: one more set
    await x.api.edit(s);
    return { x, stored };
  };
  const { x, stored } = await edit();
  const now = x.db.getAt(`workouts/${x.mk}/${x.dd}/we`);
  check('editing a rated workout keeps its rating, unchanged — the rebuilt record carries `feel` over',
        J(now.feel) === J(stored.feel) && now.exercises[0].sets.length === stored.exercises[0].sets.length + 1, J({ was: stored.feel, now: now.feel }));
  const dk = key(NOW - 2 * DAY);
  const moved = await edit(dk);
  const there = moved.x.db.getAt(`workouts/${dk.slice(0, 7)}/${dk.slice(8, 10)}/we`);
  check('and moved to another day, it goes with the record', !!there && J(there.feel) === J(moved.stored.feel), J(there && there.feel));
  const plain = await finished({ id: 'wp' });
  const ps = clone(plain.db.getAt(`workouts/${plain.mk}/${plain.dd}/wp`));
  await plain.api.edit({ id: 'wp', name: 'Push day', startedAt: ps.startedAt, exercises: clone(ps.exercises).map(ex => ({ ...ex, sets: ex.sets.map(z => ({ ...z, done: true })) })),
                         _edit: { mk: plain.mk, dd: plain.dd, dateKey: plain.dateK, durationSec: ps.durationSec } });
  check('an unrated workout, edited, gains no `feel` key', !('feel' in plain.db.getAt(`workouts/${plain.mk}/${plain.dd}/wp`)));
}

/* ================= G. THE SWITCH ================= */
section('G. "After a workout: how it felt" — after "In the gym", on by default, free, and it hides the card');
{
  const ids = C.CATEGORIES.map(c => c.id);
  const cat = C.CATEGORIES.find(c => c.id === 'feel');
  check('category feel sits directly after live, mutable, on by default, with his label and its note',
        ids.indexOf('feel') === ids.indexOf('live') + 1 && !!cat && cat.mutable === true && !cat.optIn &&
        cat.label === 'After a workout: how it felt' && cat.note === 'The energy and strength check-in on the recap.' &&
        C.isMuted(C.normSettings(null), 'feel') === false, J(cat));
  check('switched off, the setting survives the normaliser', C.isMuted(C.normSettings({ mute: { feel: true } }), 'feel') === true);
  check('free for every tier: not among the Pro additions', !C.PRO_ADDS.some(a => a.id === 'feel'));
  const h = await finished({ settings: { v: 1, mute: { feel: true }, answers: {}, asked: {} } });
  check('off, the recap never draws the card — and writes nothing for it', !feelCardOf(h.api.draw()) && !h.S.writes.some(w => /\/feel$/.test(w.p)));
  const bh = await finished({ settings: { v: 1, mute: {}, answers: {}, asked: {} } });
  bh.S.input = { ...inputOf(PRIOR), tier: { pro: false } };
  check('on, a Basic account is asked exactly as a Pro one is', !!feelCardOf(bh.api.draw()));
}

console.log('\nhow it felt is his, saved safely, and heard\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
