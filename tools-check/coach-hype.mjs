#!/usr/bin/env node
//
// Verifier for the card's earned line — coach.js's HYPE registry (v49).
//
//   node tools-check/coach-hype.mjs
//
// The card only encourages now (Micah's decision #3), and the bar is his:
// "I have to be able to trust it." An encouragement that is not true is worse
// than none, so every line is held to four things here:
//
//   IT IS EARNED.   Each line is driven true on a log built to its gate, and
//                   false on the nearest log that should not earn it — in both
//                   units, on real library names.
//   IT FITS.        Nine words at most, one number at most, no exclamation
//                   mark, on the rendered string — the names are long and
//                   there are no short ones.
//   IT NEVER        a lighter week being suggested takes the volume lines off
//   CONTRADICTS.    the card; a weight line never cheers a rate past the band,
//                   a change with no aim in its direction, or a cut that is
//                   gaining; "holding through your cut" needs his word for it.
//   IT ROTATES.     On pickGreeting's cap exactly: pools of one, two, three
//                   and five, the memory one short of the pool.
//
// And the one line that replays Coach's own targets (hype_targets_met) is held
// to prescribe() called by hand, a comeback lift whose group kept training
// included — miss the group's clock and a comeback replays as a re-entry
// while the builder showed a hold.
//
// NO COPY OF ANY RULE LIVES HERE. coach.js, coach-prog.js and coach-overlap.js
// are staged and driven for real; the card ban is READ out of
// coach-voice.mjs, where it lives.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-coach-hype-'));
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
writeFileSync(join(dir, 'coach-prog.mjs'), src('coach-prog.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach-overlap.mjs'), src('coach-overlap.js')
  .replace("from './coach-prog.js'", 'from ' + at('coach-prog.mjs'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
// v52: coach-ready.js, staged the same way (the staging edit the brief allows everywhere).
writeFileSync(join(dir, 'coach-ready.mjs'), src('coach-ready.js')
  .replace("from './coach-prog.js'", 'from ' + at('coach-prog.mjs'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs'))
  .replace("from './coach-overlap.js'", 'from ' + at('coach-overlap.mjs'))
  .replace("from './coach-live.js'", 'from ' + at('coach-live.mjs')));
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-prog.js'", 'from ' + at('coach-prog.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + at('coach-build.mjs'))
  .replace("from './coach-live.js'", 'from ' + at('coach-live.mjs'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './coach-overlap.js'", 'from ' + at('coach-overlap.mjs'))
  .replace("from './coach-ready.js'", 'from ' + at('coach-ready.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const P = await import(pathToFileURL(join(dir, 'coach-prog.mjs')).href);
const { EXERCISES } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 6).join(' | ') + (xs.length > 6 ? ' … (' + xs.length + ')' : '');

/* ---------- the card ban, read out of coach-voice.mjs ---------- */
const V = src('tools-check/coach-voice.mjs');
const grab = name => {
  const m = new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\];').exec(V);
  if (!m) throw new Error('coach-hype: ' + name + ' moved out of coach-voice.mjs — this check is stale');
  return new Function('return [' + m[1] + '];')();
};
const CARD_BAN = grab('BANNED').concat(grab('CARD_BANNED'));

/* ================= FIXTURES =================
   Real library names, a fixed epoch, sessions at a fixed local hour. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const localAt = (ago, hour) => { const d = new Date(NOW - ago * DAY); d.setHours(hour, 0, 0, 0); return d.getTime(); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const BENCH = 'barbell-bench-press', SQUAT = 'back-squat-high-bar', ROW = 'barbell-row', LEGP = 'leg-press', CURL = 'barbell-curl';
const set = (w, r, type) => ({ w: String(w), r: String(r), type: type || 'N', done: true });
const xN = (n, w, r, type) => Array.from({ length: n }, () => set(w, r, type));
let sid = 0;
const sess = (ago, rows, hour) => {
  const t = localAt(ago, hour == null ? 7 : hour);
  return { id: 'h' + (++sid), startedAt: t, endedAt: t + 3600e3, durationSec: 3600, _date: key(t),
           exercises: rows.map(([id, sets]) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment, sets })) };
};
const sortS = ss => ss.slice().sort((a, b) => a.startedAt - b.startedAt);
const input = extra => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: [], lib: LIB, hidden: [],
  libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
  summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} },
  ...extra
});
const aim = (a, extra) => ({ settings: { v: 1, mute: {}, answers: a ? { q_goal_aim: a } : {}, asked: {}, ...(extra || {}) } });

// A steady background: one session a week for ten weeks, 8 to 71 days back,
// nothing that earns anything on its own.
const steady = () => Array.from({ length: 10 }, (_, k) => sess(8 + 7 * k, [[ROW, xN(3, 155, 8)]]));

// The card's pool on a log: every line the counter can land on, walked with
// no memory. The engine keeps the pool private; this is the honest way to read it.
const poolOf = inp => [...new Set(Array.from({ length: 30 }, (_, k) =>
  C.coach({ ...inp, opens: k, recentHype: [] }).card.you).filter(v => v.state === 'earned').map(v => v.id))];
const cardsOf = inp => { const out = {}; Array.from({ length: 30 }, (_, k) => C.coach({ ...inp, opens: k, recentHype: [] }).card.you)
  .filter(v => v.state === 'earned').forEach(v => { out[v.id] = v; }); return out; };

/* One log per line: the gate true, and the nearest log it should be false on. */
const CASES = {
  hype_week_best: [
    input({ sessions: sortS(steady().concat([0, 2, 4, 6].map(a => sess(a, [[CURL, xN(3, 65, 10)]])))) }),
    input({ sessions: sortS(steady().concat([0, 2, 4].map(a => sess(a, [[CURL, xN(3, 65, 10)]])), [9, 11, 13].map(a => sess(a, [[CURL, xN(3, 65, 10)]])))) })
  ],
  hype_pr: [
    input({ sessions: sortS([30, 20, 10, 2].map((a, k) => sess(a, [[BENCH, xN(3, 185 + 10 * k, 5)]]))) }),
    input({ sessions: sortS([30, 20, 10, 5].map((a, k) => sess(a, [[BENCH, xN(3, 185 + 10 * k, 5)]]))) })
  ],
  hype_e1rm_trend: [
    input({ sessions: sortS(Array.from({ length: 9 }, (_, k) => sess(58 - 7 * k, [[BENCH, xN(3, 185 + 2.5 * k, 5)]]))) }),
    input({ sessions: sortS(Array.from({ length: 5 }, (_, k) => sess(30 - 7 * k, [[BENCH, xN(3, 185 + 2.5 * k, 5)]]))) })
  ],
  hype_holding_cut: [
    input({ ...holdingCut(), ...aim('cut') }),
    input({ ...holdingCut(), ...aim('muscle') })
  ],
  hype_goal_pace: [
    input({ sessions: sortS(steady()), weight: { latestLb: 180, latestAt: NOW, rateWk: 0.5, rateDays: 30, goalDir: 1, goalRateWk: 0.5 }, ...aim('muscle') }),
    input({ sessions: sortS(steady()), weight: { latestLb: 180, latestAt: NOW, rateWk: 0.5, rateDays: 30, goalDir: 1, goalRateWk: 0.5 }, ...aim('cut') })
  ],
  hype_protein_streak: [
    input({ sessions: sortS(steady()), targets: { cal: 2300, p: 180, f: 70 }, targetsSet: true, summaries: food(6, 190) }),
    input({ sessions: sortS(steady()), targets: { cal: 2300, p: 180, f: 70 }, targetsSet: true, summaries: food(4, 190) })
  ],
  hype_back: [
    input({ sessions: sortS(steady().filter(s => s.startedAt < NOW - 13 * DAY).concat([sess(1, [[ROW, xN(3, 155, 8)]])])) }),
    input({ sessions: sortS(steady().concat([sess(1, [[ROW, xN(3, 155, 8)]])])) })
  ],
  /* v52 moved this log a day: it trains back every three days, and two days
     after the 25th session the rest read says rest — back is inside its own
     window — which takes every volume line off the card, the milestone
     among them (the stopping bias, SHIP-V52-PROMPT §6.2). Three days after,
     back is recovered and the line is earned, as the row intends. */
  hype_milestone: [
    input({ sessions: sortS(Array.from({ length: 25 }, (_, k) => sess(3 + 3 * (24 - k), [[ROW, xN(3, 155, 8)]]))) }),
    input({ sessions: sortS(Array.from({ length: 26 }, (_, k) => sess(3 + 3 * (25 - k), [[ROW, xN(3, 155, 8)]]))) })
  ],
  hype_logging: [
    input({ sessions: sortS(steady()), summaries: food(15, 100) }),
    input({ sessions: sortS(steady()), summaries: food(13, 100) })
  ],
  hype_recovery: [
    input({ sessions: sortS(steady().concat([0, 1, 2].map(a => sess(a, [[CURL, xN(3, 65, 10)]], 6)))) }),
    input({ sessions: sortS(steady().concat([0, 2].map(a => sess(a, [[CURL, xN(3, 65, 10)]], 6)))) })
  ]
};
function food(n, p) {
  const out = {};
  for (let k = 1; k <= n; k++) out[key(NOW - k * DAY)] = { cal: 2300, p, c: 250, f: 70 };
  return out;
}
// A bench level through a cut that is holding: C1 of coach-overlap.mjs's battery.
function holdingCut() {
  const LEVEL = [[225, 5], [230, 4], [220, 6]];
  const days = [45, 38, 31, 27, 24, 20, 17, 13, 10, 3];
  const wi = [];
  for (let ago = 49; ago >= 0; ago--) wi.push({ lb: Math.round((212.5 - 8 * (49 - ago) / 49) * 10) / 10, t: localAt(ago, 6) });
  return { sessions: sortS(days.map((a, k) => sess(a, [[BENCH, xN(3, LEVEL[k % 3][0], LEVEL[k % 3][1])]]))), weighIns: wi,
           weight: { latestLb: 204.5, latestAt: localAt(0, 6), rateWk: -1.15, rateDays: 42, goalDir: null, goalRateWk: null } };
}
/* The lift target, over half the gap closed: set forty days ago at 270 × 1
   with the estimated max at 239, 257 now (58%); and the same log stopping at
   248 (29%). */
const targetLog = (last) => {
  const loads = [205, 205, 207.5, 207.5, 210, 212.5, last, last];
  return input({ sessions: sortS(loads.map((w, k) => sess(52 - 7 * k, [[BENCH, xN(3, w, 5)]]))),
    ...aim('strength', { goalLift: { exId: BENCH, lb: 270, reps: 1, at: NOW - 40 * DAY } }) });
};
CASES.hype_target_progress = [targetLog(220), targetLog(212.5)];

// Rule 3's log (section D), and one of the paint spy's (F): two lifts falling,
// failures well over his usual share, three days running.
function lwLog() {
  const fallDays = Array.from({ length: 12 }, (_, k) => 9 + 7 * k);
  const lw = [];
  fallDays.forEach((ago, k) => {
    const fall = k < 3 ? 0.9 : 1;
    lw.push(sess(ago, [[BENCH, xN(3, Math.round(225 * fall), 5)], [SQUAT, xN(3, Math.round(275 * fall), 5)]]));
  });
  [0, 1, 2, 4].forEach(a => lw.push(sess(a, [[ROW, [set(155, 8, 'F'), set(155, 8, 'F'), set(155, 8)]], [CURL, xN(3, 65, 10, 'F')]], 6)));
  return lw;
}

/* ================= A. EVERY LINE, EARNED AND NOT ================= */
section('A. every line is driven true on a log built to its gate, and false on the nearest one that is not — both units');
const rendered = [];
{
  const ids = C.HYPE.map(h => h.id);
  const untested = ids.filter(id => !(id in CASES) && id !== 'hype_targets_met');
  check('every registered line has a case (hype_targets_met has section C)', !untested.length, list(untested));
  Object.entries(CASES).forEach(([id, [yes, no]]) => ['lb', 'kg'].forEach(u => {
    const yesPool = poolOf({ ...yes, u }), noPool = poolOf({ ...no, u });
    const card = cardsOf({ ...yes, u })[id];
    if (card) rendered.push({ id, u, text: card.text, why: card.reason });
    check(id + ' [' + u + '] — earned on its own log' + (card ? ': ' + card.text + ' (' + card.reason + ')' : ''),
          yesPool.includes(id), list(yesPool));
    check(id + ' [' + u + '] — and not on the nearest log that should not earn it', !noPool.includes(id), list(noPool));
  }));
}

/* ================= B. IT FITS, AND IT IS NEVER CORRECTIVE ================= */
section('B. nine words, one number, no exclamation mark — and the card ban, on every string the card can draw');
{
  const long = rendered.filter(r => r.text.trim().split(/\s+/).length > 9);
  check('every rendered line is nine words or fewer, with real library names, both units (' + rendered.length + ')',
        rendered.length >= 20 && !long.length, list(long.map(r => r.u + ' ' + r.text)));
  const nums = rendered.filter(r => (r.text.match(/\d+(?:[.,]\d+)*/g) || []).length > 1);
  check('and carries one number at most', !nums.length, list(nums.map(r => r.text)));
  check('and never an exclamation mark', !rendered.some(r => r.text.includes('!') || r.why.includes('!')));
  const kgWrong = rendered.filter(r => (r.u === 'kg' && /\d ?lb\b/.test(r.text + ' ' + r.why)) || (r.u === 'lb' && /\d ?kg\b/.test(r.text + ' ' + r.why)));
  check('every weight in the reader’s unit', !kgWrong.length, list(kgWrong.map(r => r.u + ' ' + r.text + ' / ' + r.why)));
  const both = rendered.flatMap(r => [r.text, r.why]);
  const bad = both.filter(t => CARD_BAN.some(re => re.test(t)));
  check('no line and no evidence clause carries the card ban (' + CARD_BAN.length + ' words)', !bad.length, list(bad));
  check('and every line is a sentence, every clause is not', rendered.every(r => /[.]$/.test(r.text) && !/[.]$/.test(r.why)),
        list(rendered.filter(r => !/[.]$/.test(r.text) || /[.]$/.test(r.why)).map(r => r.text + ' / ' + r.why)));
  // A long name renders past the limit and simply does not qualify that day.
  const longName = input({ lib: { ...LIB, [BENCH]: { ...LIB[BENCH], name: 'Paused Close Grip Competition Barbell Bench Press On The Floor' } },
    sessions: CASES.hype_pr[0].sessions.map(s => ({ ...s, exercises: s.exercises.map(e => ({ ...e, name: 'Paused Close Grip Competition Barbell Bench Press On The Floor' })) })) });
  check('a line whose name runs it past nine words is not said at all', !poolOf(longName).includes('hype_pr'), list(poolOf(longName)));
}

/* ================= C. THE TARGETS, REPLAYED ================= */
section('C. "Every Coach target met" replays prescribe() exactly — a comeback lift whose group kept training included');
{
  /* Bench climbing to 3 × 12 at 185 (its target next time: 3 × 8 at 190),
     squat done twenty days before the session but legs trained three days
     before it on the leg press — so the squat's target is a hold at its last
     weight, not a re-entry lighter. The session met both. */
  const bench = [[40, xN(3, 175, 12)], [33, xN(3, 180, 8)], [26, xN(3, 180, 12)], [19, xN(3, 185, 8)], [12, xN(3, 185, 12)]];
  const squat = [[60, xN(3, 225, 8)], [45, xN(3, 225, 10)], [21, xN(3, 225, 10)]];
  const legs = [[4, xN(3, 360, 10)], [9, xN(3, 360, 10)], [16, xN(3, 360, 10)]];
  const base = bench.map(([a, s]) => sess(a, [[BENCH, s]])).concat(squat.map(([a, s]) => sess(a, [[SQUAT, s]])), legs.map(([a, s]) => sess(a, [[LEGP, s]])));
  const met = sess(1, [[BENCH, xN(3, 190, 8)], [SQUAT, xN(3, 225, 10)]]);
  const shortOne = sess(1, [[BENCH, xN(3, 190, 8)], [SQUAT, [set(225, 10), set(225, 10), set(225, 8)]]]);
  const inp = s => input({ sessions: sortS(base.concat([s])) });
  // By hand: prescribe() with each lift's exposures before the session, now
  // at its start, and its group's days since as of that morning.
  const byHand = (exId, group) => {
    const before = sortS(base).filter(s => s.startedAt < met.startedAt);
    const exposures = P.exposuresFor(before, exId);
    const lastGroup = before.filter(s => s.exercises.some(e => e.group === group)).pop();
    const groupDaysSince = Math.round((new Date(met.startedAt).setHours(12, 0, 0, 0) - new Date(lastGroup.startedAt).setHours(12, 0, 0, 0)) / DAY);
    return P.prescribe({ exId, name: LIB[exId].name, group, equipment: LIB[exId].equipment, exposures, groupDaysSince }, { now: met.startedAt, u: 'lb' });
  };
  const tb = byHand(BENCH, 'chest'), ts = byHand(SQUAT, 'legs');
  check('by hand, bench’s target was a jump and squat’s a hold at its last weight — the group clock read, not the lift’s alone',
        tb.mode === 'add' && tb.loadLb === 190 && ts.mode === 'hold' && ts.code === 'back' && ts.loadLb === 225, tb.line + ' / ' + ts.line);
  const cMet = C.coach(inp(met));
  const pool = poolOf(inp(met));
  check('the session that met both earns "Every Coach target met yesterday."',
        pool.includes('hype_targets_met') && cardsOf(inp(met)).hype_targets_met.text === 'Every Coach target met yesterday.', list(pool));
  check('and "How did today compare?" counts the same replay — 2 of 2', (() => {
    const a = C.coach({ ...inp(met), now: met.startedAt + 2 * 3600e3 }).ask('ask_compare');
    return (a.more || []).some(m => m.text === '2 of 2 Coach targets met.');
  })(), JSON.stringify((C.coach({ ...inp(met), now: met.startedAt + 2 * 3600e3 }).ask('ask_compare').more || []).map(m => m.text)));
  check('one set short on the squat, and the line is not earned', !poolOf(inp(shortOne)).includes('hype_targets_met'), list(poolOf(inp(shortOne))));
  check('and a Basic account — which never saw the targets — is never told it met them',
        !poolOf({ ...inp(met), tier: { pro: false } }).includes('hype_targets_met'));
  check('targets switched off, and it is not said either',
        !poolOf({ ...inp(met), settings: { v: 1, mute: { targets: true }, answers: {}, asked: {} } }).includes('hype_targets_met'));
  check('the card it earned is the engine’s, not a copy', cMet.card.you.state === 'earned' || cMet.card.you.state.startsWith('card_'));
}

/* ================= D. NEVER CONTRADICTS, NEVER CELEBRATES THE WRONG THING ================= */
section('D. rules 3 and 4 — a lighter week takes the volume lines, and no weight line cheers the wrong thing');
{
  // Rule 3. A lighter week suggested (two lifts falling, failures over his
  // usual share) on a week with more sessions than any before it, trained
  // three days running.
  const lw = lwLog();
  const L = input({ sessions: sortS(lw) });
  const c = C.coach(L);
  const pool = poolOf(L);
  // v52 (decision 10): "Should I rest or go lighter?" tries the rest read
  // first, and on this log its fatigue flag is up too — the lighter answer
  // comes before the lighter week's own. Either is the fixture doing its job.
  check('the fixture really does suggest a lighter week', ['lighter_week', 'rest_day'].includes(c.ask('ask_lighter').id) &&
        /lighter/.test(c.ask('ask_lighter').text), c.ask('ask_lighter').text);
  check('and on it no volume line shows, however many sessions the week had',
        !pool.includes('hype_week_best') && !pool.includes('hype_milestone'), list(pool));
  check('while "A rest day is well earned" shows on its own gate — it is the same advice', pool.includes('hype_recovery'), list(pool));
  const noStreak = input({ sessions: sortS(lw.filter(s => s.startedAt < NOW - 1.5 * DAY)) });
  check('and without three days running it does not', !poolOf(noStreak).includes('hype_recovery'), list(poolOf(noStreak)));

  // Rule 4.
  const w = (rateWk, goalRateWk, a) => input({ sessions: sortS(steady()),
    weight: { latestLb: 180, latestAt: NOW, rateWk, rateDays: 30, goalDir: null, goalRateWk }, ...aim(a) });
  const WEIGHT_LINES = C.HYPE.filter(h => h.category === 'weight').map(h => h.id);
  const anyWeight = inp => poolOf(inp).some(id => WEIGHT_LINES.includes(id));
  check('a fast loss with no aim set earns no weight line', !anyWeight(w(-1.4, -1.4, null)));
  check('a loss past the band earns none, even exactly on the rate he set', !anyWeight(w(-2, -2, 'cut')));
  check('a cut aim while gaining earns none', !anyWeight(w(0.5, 0.5, 'cut')));
  check('a gain on Build muscle a third off the rate he set earns none — "right on pace" is within a quarter',
        !anyWeight(w(0.5, 0.75, 'muscle')));
  check('and a steady loss on a cut, on pace and inside the band, does', anyWeight(w(-1, -1, 'cut')));
  check('there is no weight-loss line at all without an aim of cut', !anyWeight(w(-1, -1, 'muscle')) && !anyWeight(w(-1, -1, 'strength')));
  check('"holding through your cut" is silent for Build muscle with no food direction',
        !poolOf(CASES.hype_holding_cut[1]).includes('hype_holding_cut'));
  check('and speaks when his food targets are set to lose, whatever the aim',
        poolOf({ ...CASES.hype_holding_cut[1], weight: { ...CASES.hype_holding_cut[1].weight, goalDir: -1 } }).includes('hype_holding_cut'));
  // A muted category is never said.
  const muted = { ...CASES.hype_recovery[0], settings: { v: 1, mute: { rest: true }, answers: {}, asked: {} } };
  check('a line whose category is switched off is not said', !poolOf(muted).includes('hype_recovery'));
}

/* ================= E. IT ROTATES ON THE GREETING'S CAP ================= */
section('E. the rotation — the open counter, and a memory one short of the pool: pools of 1, 2, 3 and 5');
{
  // Lines that do not lean on each other, stacked: the log grows by one line
  // at a time, and the last step brings two (three days running also makes
  // the most sessions in five weeks, which is true).
  const base0 = input({ sessions: sortS(steady()), summaries: food(15, 100) });                                   // logging
  const pools = [
    base0,
    { ...base0, targets: { cal: 2300, p: 90, f: 70 }, targetsSet: true },                                          // + protein
    { ...base0, targets: { cal: 2300, p: 90, f: 70 }, targetsSet: true,
      weight: { latestLb: 180, latestAt: NOW, rateWk: 0.5, rateDays: 30, goalDir: 1, goalRateWk: 0.5 }, ...aim('muscle') } // + goal pace
  ];
  /* + recovery, week best. v52: one set of curls a day, not three — three
     days of three sets against a usual three a week trips two fatigue signs
     (the run and the week's sets), and on a lighter day the stopping bias
     takes the week-best line off the card. One set a day keeps the run and
     the most sessions in five weeks, which are what this pool is built of. */
  pools.push({ ...pools[2], sessions: sortS(steady().concat([0, 1, 2].map(a => sess(a, [[CURL, xN(1, 65, 10)]], 6)))) });
  const fixtures = [[1, pools[0]], [2, pools[1]], [3, pools[2]], [5, pools[3]]];
  fixtures.forEach(([n, fx]) => {
    const pool = poolOf(fx);
    check('the log built for a pool of ' + n + ' has ' + n + ' lines', pool.length === n, list(pool));
    // Opens with the device memory carried between them, as coach-data.js keeps it.
    let history = [];
    const walk = [];
    for (let k = 0; k < n * 4; k++) {
      const v = C.coach({ ...fx, opens: k, recentHype: history }).card.you;
      walk.push(v.id);
      history = [v.id].concat(history.filter(x => x !== v.id)).slice(0, 3);
    }
    if (n === 1) check('a pool of one shows its one line every open — nothing to rotate against', new Set(walk).size === 1, list(walk));
    else {
      check('a pool of ' + n + ': never the same line twice running', walk.every((id, i) => i === 0 || id !== walk[i - 1]), list(walk));
      check('and every line comes round within ' + n + ' opens', new Set(walk.slice(0, n)).size === n, list(walk.slice(0, n)));
    }
    // The memory blocks at most min(3, pool − 1): whatever it names, a line shows.
    const everything = C.coach({ ...fx, opens: 0, recentHype: pool.slice(0, 3) }).card.you;
    check('a memory naming ' + Math.min(3, n) + ' of the ' + n + ' still leaves a line on the card', everything.state === 'earned', everything.state);
    if (n === 5) {
      const mem = pool.slice(0, 3);
      const picks = Array.from({ length: 10 }, (_, k) => C.coach({ ...fx, opens: k, recentHype: mem }).card.you.id);
      check('on a pool of five the memory reads all three it keeps: none of them is chosen', !picks.some(id => mem.includes(id)), list(picks));
    }
  });
  // Goal-aware order: the lines suited to his aim come first in the walk.
  const fx = pools[3];
  const first = C.coach({ ...fx, opens: 0, recentHype: [] }).card.you.id;
  const suited = C.HYPE.find(h => h.id === first);
  check('with an aim set, the walk starts on a line that suits it', !!suited && (suited.aims == null || suited.aims.includes('muscle')), first);
}

/* ================= F. v52 — THE REST READ ON THE CARD, AND WHAT A PAINT MAY CALL ================= */
section('F. v52 — the recovery line at his usual run, the rest bias, and a card paint that calls nothing it should not');
{
  /* The recovery line: three days or more, and at or past his usual longest
     run when the log knows one (spec §9.4). Five earlier runs of four days,
     rest days between, over ten weeks — his usual run is four — then three
     days running to today, and then four. */
  const runLog = cur => {
    const days = [];
    for (let r = 0; r < 5; r++) for (let d = 0; d < 4; d++) days.push(12 + 12 * r + d);
    for (let d = 0; d < cur; d++) days.push(d);
    return input({ sessions: sortS(days.map(a => sess(a, [[CURL, xN(3, 65, 10)]], 6))) });
  };
  check('three days running against a usual run of four: no recovery line', !poolOf(runLog(3)).includes('hype_recovery'), list(poolOf(runLog(3))));
  check('four days running: the line', poolOf(runLog(4)).includes('hype_recovery'), list(poolOf(runLog(4))));
  check('and with no usual run known (a young log), three days is enough, as it was',
        poolOf(CASES.hype_recovery[0]).includes('hype_recovery'));

  /* The stopping bias for rest: the week-best log, with the row a day ago
     rather than eight — every group he trains is inside its window, the
     rest read says rest, and "most in five weeks" leaves the card. */
  const restLog = input({ sessions: sortS(Array.from({ length: 10 }, (_, k) => sess(1 + 7 * k, [[ROW, xN(3, 155, 8)]]))
    .concat([0, 2, 4, 6].map(a => sess(a, [[CURL, xN(3, 65, 10)]])))) });
  check('the rest log really is a rest day', C.coach(restLog).ask('ask_shape').id === 'rest_day', C.coach(restLog).ask('ask_shape').text);
  check('on a rest day no volume line shows', !poolOf(restLog).some(id => ['hype_week_best', 'hype_milestone'].includes(id)), list(poolOf(restLog)));
  const restOff = { ...restLog, settings: { v: 1, mute: { rest: true }, answers: {}, asked: {} } };
  check('and with the Rest switch off, the week-best line is back — it was the rest read that took it',
        poolOf(restOff).includes('hype_week_best'), list(poolOf(restOff)));

  /* THE PAINT SPY (SHIP-V52-PROMPT §1). Every card paint runs coach(); the
     replay, readiness, the session rows and the targets replay must never
     run on one. coach-ready.js is staged behind a proxy that counts every
     call into it, and coach.js is staged a second time to import the proxy. */
  const R = await import(JSON.parse(at('coach-ready.mjs')));
  const fnNames = Object.keys(R).filter(k => typeof R[k] === 'function');
  writeFileSync(join(dir, 'coach-ready-spy.mjs'),
    'import * as R from ' + at('coach-ready.mjs') + ';\nexport const calls = {};\n' +
    fnNames.map(n => 'export function ' + n + '(...a) { calls.' + n + ' = (calls.' + n + ' || 0) + 1; return R.' + n + '(...a); }').join('\n') + '\n' +
    Object.keys(R).filter(k => typeof R[k] !== 'function').map(k => 'export const ' + k + ' = R.' + k + ';').join('\n') + '\n');
  writeFileSync(join(dir, 'coach-spied.mjs'), readFileSync(join(dir, 'coach.mjs'), 'utf8')
    .replace("from " + at('coach-ready.mjs'), "from " + at('coach-ready-spy.mjs')));
  const SPY = await import(JSON.parse(at('coach-ready-spy.mjs')));
  const CS = await import(JSON.parse(at('coach-spied.mjs')));
  const PAINT_OK = ['restRead', 'usualRun'];
  const logs = Object.values(CASES).flat().concat([restLog, input({ sessions: sortS(lwLog()) }), runLog(4)]);
  const bad = [];
  let restReads = 0;
  logs.forEach((lg, k) => ['lb', 'kg'].forEach(u => [true, false].forEach(pro => {
    Object.keys(SPY.calls).forEach(x => { delete SPY.calls[x]; });
    const c = CS.coach({ ...lg, u, tier: { pro } });
    // what a card paint draws: both cards, the greeting, the lead question, the teaser
    void [c.card.you.text, c.card.train.text, c.greet && c.greet.text, c.lead && c.lead.id, c.teaser && c.teaser.text];
    restReads += SPY.calls.restRead || 0;
    const extra = Object.keys(SPY.calls).filter(x => !PAINT_OK.includes(x));
    if (extra.length) bad.push('log ' + k + ' ' + u + (pro ? ' pro' : ' basic') + ': ' + extra.join(', '));
  })));
  check('a card paint calls nothing in coach-ready.js but restRead and usualRun (' + logs.length * 4 + ' paints)', !bad.length, list(bad));
  check('and the spy is really watching: the paints did call restRead (' + restReads + ')', restReads > 0);
  Object.keys(SPY.calls).forEach(x => { delete SPY.calls[x]; });
  const cc = CS.coach(restLog);
  cc.ask('ask_lighter');
  check('while an answer does reach past them — the replay, on a rest answer', (SPY.calls.replay || 0) > 0, JSON.stringify(SPY.calls));
}

console.log('\nthe card only says what he has earned\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
