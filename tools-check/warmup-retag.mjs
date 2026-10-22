#!/usr/bin/env node
//
// Verifier for the recap's write-back (rack-v72): "Yes, tag them" retypes a
// finished session's probable warm-ups W through workout.js's own write path.
//
//   node tools-check/warmup-retag.mjs
//
// What it holds, on the warmup-leaks.mjs rig (the real analytics.js and the
// workout.js functions lifted by text, over lib/stage.mjs's fake store):
//   A  after retagWarmups() the record's volume and groups drop the ramp, the
//      five sets are W (retypeSet, so a drop set stays linked), the session
//      node was written whole and once, and exerciseIndex for the lift re-reads
//      — best e1RM and set counts off the working sets alone
//   B  the "last time" index's row for the day is retyped to match, and
//      retagHistory() with a mismatched set count returns `h` itself
//   C  a refused write leaves record, cache and index byte-identical, and
//      nothing is learned or stamped
//   D  setRirOnRecord() writes the rating on one set through the same path
//   E  warmup-leaks' own property still holds: analytics says what the log says

import { readFileSync } from 'node:fs';
import { stage, harness, J, setNow, fake, resetDb, clearToasts, toasts } from './lib/stage.mjs';

const { check, section, done } = harness('The recap’s write-back — tagging the ramp (v72)');
const st = stage(['analytics.js', 'exercises.js', 'ui.js', 'units.js']);
const A = await st.load('analytics.js');
const STORE = await st.load('store.js');

/* The workout.js functions, lifted by text. */
const WSRC = readFileSync(new URL('../workout.js', import.meta.url), 'utf8');
function lift(name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(WSRC);
  if (!m) throw new Error('warmup-retag: ' + name + '() is gone from workout.js');
  return WSRC.slice(m.index, WSRC.indexOf('\n}\n', m.index) + 2).replace(/^export /, '');
}
const S = { renders: 0, refreshes: 0, learned: [], asked: [], finishes: 0 };
const stubs = {
  isWorking: A.isWorking, mergeSessionExercises: A.mergeSessionExercises, keepSets: A.keepSets, retypeSet: A.retypeSet,
  detectPRs: A.detectPRs, sessionMilestones: A.sessionMilestones,
  write: STORE.write, toast: () => {}, invalidate: () => {}, wu: () => 'lb',
  refreshCoachSessions: () => { S.refreshes++; return Promise.resolve(true); },
  coachFinishRead: () => { S.finishes++; return { headline: 'Good work.', line: '', why: '', earned: false, evidence: [], short: '', id: '' }; },
  render: () => { S.renders++; }
};
const NAMES = Object.keys(stubs);
const W = new Function(...NAMES, `
let summary = null, monthCache = {}, history = {}, hydrated = new Set();
async function hydrateForWrite(mk) { hydrated.add(mk); return true; }
${['computeVolume', 'recordGroups', 'historyRows', 'foldSessionIntoHistory', 'trimHistory',
   'rewriteRecord', 'retagWarmups', 'retagHistory', 'setRirOnRecord'].map(lift).join('\n')}
return { computeVolume, recordGroups, foldSessionIntoHistory, trimHistory, retagWarmups, retagHistory, setRirOnRecord,
         set: (s, h, c) => { summary = s; history = h; monthCache = c || {}; },
         summary: () => summary, history: () => history, cache: () => monthCache };`)(...NAMES.map(k => stubs[k]));

/* ================= THE LOG ================= */
const DAY = 864e5;
const NOW = 1789307130123;
setNow(NOW);
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const SQ = 'back-squat-low-bar';
const LIB = { [SQ]: { name: 'Back Squat (Low Bar)', group: 'legs', equipment: 'barbell' }, 'leg-press': { name: 'Leg Press', group: 'legs', equipment: 'machine' } };
const Sset = (w, r, type = 'N', extra) => ({ w: String(w), r: String(r), type, done: true, ...(extra || null) });
const RAMP = [Sset(45, 10), Sset(45, 8), Sset(135, 5), Sset(135, 5), Sset(225, 3)];
const day = (id, ago, top, ramp) => {
  const at = NOW - ago * DAY - 2 * 3600e3;
  const exercises = [
    { exId: SQ, ...LIB[SQ], sets: (ramp === false ? [] : RAMP.map(s => ({ ...s }))).concat([Sset(top, 5), Sset(top, 5), Sset(top, 5)]) },
    { exId: 'leg-press', ...LIB['leg-press'], sets: [Sset(400, 10), Sset(400, 10), Sset(400, 10)] }
  ];
  const rec = { id, name: 'Legs', startedAt: at, endedAt: at + 3600e3, durationSec: 3600, _date: key(at), exercises };
  rec.volume = W.computeVolume(exercises); rec.groups = W.recordGroups(exercises);
  return rec;
};
const prior = [1, 2, 3, 4, 5].map(k => day('p' + k, k * 7, 305 + k, false));
const today = day('t1', 0, 335, true);
const dateK = today._date, mk = dateK.slice(0, 7), dd = dateK.slice(8, 10);
let h = {};
prior.concat([today]).forEach(s => { h = W.foldSessionIntoHistory(h, s._date, s.exercises); });
h = W.trimHistory(h);
const setup = () => {
  resetDb(); clearToasts();
  S.renders = 0; S.refreshes = 0; S.finishes = 0;
  const rec = JSON.parse(J(today));
  const cache = { [mk]: { [dd]: { t1: rec } } };
  W.set({ record: rec, prs: [], firsts: [], milestones: [], prior: prior.map(p => JSON.parse(J(p))), dateK }, JSON.parse(J(h)), cache);
  return rec;
};

/* ================= A. THE RECORD ================= */
section('A. retagWarmups: the record’s volume and groups drop the ramp, the node is written whole, the index re-reads');
{
  const rec = setup();
  const volBefore = rec.volume;
  const idxBefore = A.exerciseIndex(prior.concat([rec]))[SQ];
  check('before: the untagged ramp counts — 8 squat sets, volume ' + volBefore, idxBefore.entries[5].sets === 8 && volBefore === 450 + 360 + 675 + 675 + 675 + 3 * 335 * 5 + 3 * 400 * 10);
  const ok = await W.retagWarmups(0, [0, 1, 2, 3, 4]);
  const out = W.summary().record;
  check('it returns true, and the summary holds a NEW record (the old object untouched)', ok === true && out !== rec && rec.exercises[0].sets[0].type === 'N');
  check('the five ramp sets are W, the three 335s N, the leg press as it was',
        out.exercises[0].sets.map(s => s.type).join('') === 'WWWWWNNN' && out.exercises[1].sets.every(s => s.type === 'N'));
  check('volume drops the ramp: ' + out.volume, out.volume === 3 * 335 * 5 + 3 * 400 * 10 && out.volume < volBefore);
  check('groups unchanged here (legs either way), and worked out by recordGroups over the retyped sets', J(out.groups) === J(['legs']));
  const writes = fake.writes.filter(w => /^workouts\//.test(w.path));
  check('one write, to workouts/' + mk + '/' + dd + '/t1 — the whole session node, never a container',
        writes.length === 1 && writes[0].path === 'workouts/' + mk + '/' + dd + '/t1' && J(writes[0].value) === J(out), J(writes.map(w => w.path)));
  check('the month cache holds the new record', W.cache()[mk][dd].t1 === out);
  const idx = A.exerciseIndex(prior.concat([out]))[SQ];
  check('exerciseIndex re-reads: 3 sets on the day, best e1RM off a 335 × 5, never the bar', idx.entries[5].sets === 3 && idx.bestE1rm === A.e1rm(335, 5) && idx.totalSets === idxBefore.totalSets - 5);
  check('the finish line was read again and the page re-rendered', S.finishes === 1 && S.renders === 1 && S.refreshes === 1);
  check('a `done`, `rir` or `dp` on a set rides through retypeSet untouched', out.exercises[0].sets.every(s => s.done === true));
}

/* ================= B. THE INDEX ================= */
section('B. the "last time" index’s row for the day is retyped; a mismatched row is left alone');
{
  const rec = setup();
  const before = W.history()[SQ][0];
  check('before: the newest squat row is today’s, eight sets, the ramp typed N', before.date === dateK && before.sets.length === 8 && before.sets.slice(0, 5).every(s => s.type === 'N'));
  await W.retagWarmups(0, [0, 1, 2, 3, 4]);
  const row = W.history()[SQ][0];
  check('after: the same row, its first five typed W, the rest N', row.date === dateK && row.sets.map(s => s.type).join('') === 'WWWWWNNN' && row.sets[0].w === '45');
  check('and `history` was written once, whole', fake.writes.filter(w => w.path === 'history').length === 1 && J(fake.writes.find(w => w.path === 'history').value) === J(W.history()));
  check('the other rows untouched', J(W.history()[SQ].slice(1)) === J(h[SQ].slice(1)) && J(W.history()['leg-press']) === J(h['leg-press']));
  // The pure function on its own.
  const same = W.retagHistory(h, SQ, dateK, [0, 1], 7);
  check('retagHistory with a set count that does not match the row returns `h` itself', same === h);
  check('…and with an unknown lift, or a day not on the index', W.retagHistory(h, 'bench', dateK, [0], 8) === h && W.retagHistory(h, SQ, '2001-01-01', [0], 8) === h);
  check('…and with an index out of the row', W.retagHistory(h, SQ, dateK, [0, 9], 8) === h);
  const t = W.retagHistory(h, SQ, dateK, [0, 1, 2, 3, 4], 8);
  check('with the count matching: a new object, the row retyped, h untouched', t !== h && t[SQ][0].sets.map(s => s.type).join('') === 'WWWWWNNN' && h[SQ][0].sets[0].type === 'N' && t['leg-press'] === h['leg-press']);
  // A refused history write is tolerated: the fake store's watcher on the
  // session node flips the switch the moment the record lands, so the record
  // write succeeds and the history write — the next one — is refused.
  setup();
  fake.watches.set('workouts/' + mk + '/' + dd + '/t1', () => { fake.refuse = true; });
  const ok = await W.retagWarmups(0, [0, 1, 2, 3, 4]);
  fake.refuse = false; fake.watches.clear();
  check('the record written and the history write refused: the retag still succeeds, the record is tagged, the index left as it was',
        ok === true && W.summary().record.exercises[0].sets[0].type === 'W' && W.history()[SQ][0].sets[0].type === 'N');
}

/* ================= C. A REFUSED WRITE ================= */
section('C. a refused record write leaves record, cache and index byte-identical');
{
  const rec = setup();
  const before = { rec: J(rec), cache: J(W.cache()), h: J(W.history()), sum: J(W.summary()) };
  fake.refuse = true;
  const ok = await W.retagWarmups(0, [0, 1, 2, 3, 4]);
  fake.refuse = false;
  check('it returns false', ok === false);
  check('the record, the cache, the index and the summary are byte-identical',
        J(W.summary().record) === before.rec && J(W.cache()) === before.cache && J(W.history()) === before.h && J(W.summary()) === before.sum);
  check('no write landed', fake.writes.length === 0);
  check('nothing re-read, nothing re-rendered', S.finishes === 0 && S.renders === 0 && S.refreshes === 0);
  const r2 = setup();
  const ok2 = await W.retagWarmups(5, [0]);
  check('a bad exIdx or an empty idx: false, nothing written', ok2 === false && await W.retagWarmups(0, []) === false && fake.writes.length === 0 && !!r2);
}

/* ================= D. THE RATING ================= */
section('D. setRirOnRecord: one set’s rir, the same whole-record write');
{
  const rec = setup();
  const ok = await W.setRirOnRecord(0, 5, 2);
  const out = W.summary().record;
  check('true, and the first 335 carries rir 2 — no other set does', ok === true && out.exercises[0].sets[5].rir === 2 && out.exercises[0].sets.filter(s => s.rir != null).length === 1);
  check('the ramp sets keep their type (this path retypes nothing)', out.exercises[0].sets.slice(0, 5).every(s => s.type === 'N'));
  check('written whole, once, to the session node', fake.writes.length === 1 && fake.writes[0].path === 'workouts/' + mk + '/' + dd + '/t1' && fake.writes[0].value.exercises[0].sets[5].rir === 2);
  check('volume unchanged by a rating', out.volume === rec.volume);
  const r = setup();
  const before = J(r);
  fake.refuse = true;
  check('refused: false and the record untouched', await W.setRirOnRecord(0, 5, 0) === false && J(W.summary().record) === before);
  fake.refuse = false;
  check('a non-integer rating is refused before any write', await W.setRirOnRecord(0, 5, 'x') === false && await W.setRirOnRecord(0, 5, null) === false && fake.writes.length === 0);
}

/* ================= E. WARMUP-LEAKS STILL HOLDS ================= */
section('E. after the retag analytics says what the log says — the tagged day reads like a plain one');
{
  setup();
  await W.retagWarmups(0, [0, 1, 2, 3, 4]);
  const tagged = W.summary().record;
  const plain = day('t1', 0, 335, false);
  const pick = e => [e.sessions, e.totalVolume, e.totalSets, e.totalReps, e.bestE1rm, e.bestWeight, e.bestVolume];
  check('exerciseIndex over the log with the tagged day equals the log with a plain day',
        J(pick(A.exerciseIndex(prior.concat([tagged]))[SQ])) === J(pick(A.exerciseIndex(prior.concat([plain]))[SQ])));
  check('detectPRs the same', J(A.detectPRs(tagged, prior)) === J(A.detectPRs(plain, prior)));
  check('volume and groups the same', tagged.volume === plain.volume && J(tagged.groups) === J(plain.groups));
}

done(st.cleanup);
