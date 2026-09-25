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
//                   and four (five until v53), the memory one short of the
//                   pool — and (v53) a fact value once in 24 hours.
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
// v52: coach-fuel.js, staged the same way (the staging edit the brief allows everywhere).
writeFileSync(join(dir, 'coach-fuel.mjs'), src('coach-fuel.js')
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
  .replace("from './coach-fuel.js'", 'from ' + at('coach-fuel.mjs'))
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
  /* v53 moved this log a day: a session TODAY now puts the finish line
     first on the card all day (SHIP-V53-PROMPT §4.4), and walking the card
     would never reach the week's best. The same counts, a day earlier. */
  hype_week_best: [
    input({ sessions: sortS(steady().concat([1, 3, 5, 6].map(a => sess(a, [[CURL, xN(3, 65, 10)]])))) }),
    input({ sessions: sortS(steady().concat([1, 3, 5].map(a => sess(a, [[CURL, xN(3, 65, 10)]])), [9, 11, 13].map(a => sess(a, [[CURL, xN(3, 65, 10)]])))) })
  ],
  // v53: the finish line — a session that ended an hour ago, and the same log
  // without it.
  hype_finish: [
    input({ sessions: sortS(steady().concat([{ ...sess(0, [[ROW, xN(3, 155, 8)]]), startedAt: NOW - 2 * 3600e3, endedAt: NOW - 3600e3, _date: key(NOW - 2 * 3600e3) }])) }),
    input({ sessions: sortS(steady()) })
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
  // v53: bar the finish line, whose small line is finishRead()'s own `why` —
  // a sentence, the same words the sheet's first bubble carries under it.
  const clause = r => r.id === 'hype_finish' || !/[.]$/.test(r.why);
  check('and every line is a sentence, every clause is not', rendered.every(r => /[.]$/.test(r.text) && clause(r)),
        list(rendered.filter(r => !/[.]$/.test(r.text) || !clause(r)).map(r => r.text + ' / ' + r.why)));
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
section('E. the rotation — the open counter, and a memory one short of the pool: pools of 1, 2, 3 and 4');
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
  /* v53: + week best, a day earlier. The v52 pool of five had three days
     running TO TODAY (the recovery line), and a session today now puts the
     recovery and finish lines first on the card all day — the walk there is
     no rotation (coach-hype G, finish.mjs N12). So the widest pool here is
     four, and the memory still bites at its full depth of three. */
  pools.push({ ...pools[2], sessions: sortS(steady().concat([1, 2, 3].map(a => sess(a, [[CURL, xN(1, 65, 10)]], 6)))) });
  const fixtures = [[1, pools[0]], [2, pools[1]], [3, pools[2]], [4, pools[3]]];
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
    if (n === 4) {
      const mem = pool.slice(0, 3);
      const picks = Array.from({ length: 10 }, (_, k) => C.coach({ ...fx, opens: k, recentHype: mem }).card.you.id);
      check('on a pool of four the memory reads all three it keeps: none of them is chosen', !picks.some(id => mem.includes(id)), list(picks));
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
  // v53: the curls a day earlier, so no session is today's and the card
  // walks its rotation rather than leading with the finish line.
  const restLog = input({ sessions: sortS(Array.from({ length: 10 }, (_, k) => sess(1 + 7 * k, [[ROW, xN(3, 155, 8)]]))
    .concat([1, 3, 5, 6].map(a => sess(a, [[CURL, xN(3, 65, 10)]])))) });
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
  // And coach-fuel.js (Phase B), behind a proxy of its own: a paint may call
  // nothing in it at all.
  const FU = await import(JSON.parse(at('coach-fuel.mjs')));
  const fuNames = Object.keys(FU).filter(k => typeof FU[k] === 'function');
  writeFileSync(join(dir, 'coach-fuel-spy.mjs'),
    'import * as F from ' + at('coach-fuel.mjs') + ';\nexport const calls = {};\n' +
    fuNames.map(n => 'export function ' + n + '(...a) { calls.' + n + ' = (calls.' + n + ' || 0) + 1; return F.' + n + '(...a); }').join('\n') + '\n' +
    Object.keys(FU).filter(k => typeof FU[k] !== 'function').map(k => 'export const ' + k + ' = F.' + k + ';').join('\n') + '\n');
  writeFileSync(join(dir, 'coach-spied.mjs'), readFileSync(join(dir, 'coach.mjs'), 'utf8')
    .replace("from " + at('coach-ready.mjs'), "from " + at('coach-ready-spy.mjs'))
    .replace("from " + at('coach-fuel.mjs'), "from " + at('coach-fuel-spy.mjs')));
  const SPY = await import(JSON.parse(at('coach-ready-spy.mjs')));
  const FSPY = await import(JSON.parse(at('coach-fuel-spy.mjs')));
  const CS = await import(JSON.parse(at('coach-spied.mjs')));
  const PAINT_OK = ['restRead', 'usualRun'];
  const logs = Object.values(CASES).flat().concat([restLog, input({ sessions: sortS(lwLog()) }), runLog(4)]);
  const bad = [];
  let restReads = 0;
  const fuelBad = [];
  // With food in memory too — summaries every day, and a day's log read.
  const fed = x => ({ ...x, summaries: Object.fromEntries(Array.from({ length: 30 }, (_, k) => [key(NOW - k * DAY), { cal: 2300, p: 150, c: 250, f: 70 }])),
                      foodLog: { [key(NOW)]: [{ t: NOW - 3600e3, cal: 600, p: 30, c: 70 }] } });
  logs.concat(logs.map(fed)).forEach((lg, k) => ['lb', 'kg'].forEach(u => [true, false].forEach(pro => {
    Object.keys(SPY.calls).forEach(x => { delete SPY.calls[x]; });
    Object.keys(FSPY.calls).forEach(x => { delete FSPY.calls[x]; });
    const c = CS.coach({ ...lg, u, tier: { pro } });
    // what a card paint draws: both cards, the greeting, the lead question, the teaser
    void [c.card.you.text, c.card.train.text, c.greet && c.greet.text, c.lead && c.lead.id, c.teaser && c.teaser.text];
    restReads += SPY.calls.restRead || 0;
    const extra = Object.keys(SPY.calls).filter(x => !PAINT_OK.includes(x));
    if (extra.length) bad.push('log ' + k + ' ' + u + (pro ? ' pro' : ' basic') + ': ' + extra.join(', '));
    if (Object.keys(FSPY.calls).length) fuelBad.push('log ' + k + ' ' + u + ': ' + Object.keys(FSPY.calls).join(', '));
  })));
  check('a card paint calls nothing in coach-ready.js but restRead and usualRun (' + logs.length * 8 + ' paints)', !bad.length, list(bad));
  check('and nothing in coach-fuel.js at all — with food in memory or without', !fuelBad.length, list(fuelBad));
  check('and the spy is really watching: the paints did call restRead (' + restReads + ')', restReads > 0);
  Object.keys(SPY.calls).forEach(x => { delete SPY.calls[x]; });
  const cc = CS.coach(restLog);
  cc.ask('ask_lighter');
  check('while an answer does reach past them — the replay, on a rest answer', (SPY.calls.replay || 0) > 0, JSON.stringify(SPY.calls));
  Object.keys(FSPY.calls).forEach(x => { delete FSPY.calls[x]; });
  CS.coach(fed(restLog)).ask('ask_fueled');
  check('and "Am I fueled?" does reach coach-fuel.js — the spy is watching the right module', (FSPY.calls.fueledRead || 0) > 0, JSON.stringify(FSPY.calls));
}

/* ================= G. v53 — THE 24-HOUR RULE, AND THE WARM LINES ================= */
section('G. v53 — a fact value shown once in 24 hours under any id, then warm lines that claim nothing');
{
  const HOUR = 3600e3;
  const one = input({ sessions: sortS(steady()), summaries: food(15, 100) });                     // a pool of one: logging
  const two = { ...one, targets: { cal: 2300, p: 90, f: 70 }, targetsSet: true };                  // + protein
  check('the pool of one really is one line, and the pool of two two', poolOf(one).length === 1 && poolOf(two).length === 2,
        list(poolOf(one)) + ' / ' + list(poolOf(two)));
  const logLine = C.coach(one).card.you;
  check('every earned line carries the fact value it quotes', logLine.key === 'logging:15', logLine.key);

  // A pool of one: shown, then warm for 24 hours of opens, then shown again.
  const at = ago => [{ id: logLine.id, key: logLine.key, at: NOW - ago }];
  const within = [1, 6, 12, 23.9].map(h => C.coach({ ...one, opens: 7, recentHype: at(h * HOUR) }).card.you);
  check('a pool of one: inside 24 hours of showing it, every open draws a warm line',
        within.every(v => v.state === 'warm'), within.map(v => v.state + ':' + v.text).join(' | '));
  const after = C.coach({ ...one, opens: 7, recentHype: at(24 * HOUR) }).card.you;
  check('and 24 hours on, it is shown again', after.state === 'earned' && after.id === logLine.id, after.state);

  // Opens through a day, memory carried as coach-data.js keeps it: each line once.
  const day = (fx, n) => {
    let mem = [];
    const seen = [];
    for (let k = 0; k < n; k++) {
      const now = NOW;                       // the clock held: every open inside the same day
      const v = C.coach({ ...fx, opens: k, recentHype: mem, now }).card.you;
      seen.push(v);
      if (v.state === 'earned') mem = [{ id: v.id, key: v.key, at: now - (n - k) * 60e3 }].concat(mem.filter(x => x.key !== v.key)).slice(0, 8);
    }
    return seen;
  };
  const d1 = day(one, 6);
  check('a pool of one over six opens in a day: shown once, then warm',
        d1[0].state === 'earned' && d1.slice(1).every(v => v.state === 'warm'), d1.map(v => v.state).join(','));
  const d2 = day(two, 6);
  const earned2 = d2.filter(v => v.state === 'earned').map(v => v.id);
  check('a pool of two: each shows once in the day, then warm',
        earned2.length === 2 && new Set(earned2).size === 2 && d2.slice(2).every(v => v.state === 'warm'), d2.map(v => v.state + ':' + v.id).join(','));

  // The same fact value under another id counts as shown.
  const other = C.coach({ ...one, opens: 3, recentHype: [{ id: 'hype_somewhere_else', key: logLine.key, at: NOW - HOUR }] }).card.you;
  check('the same fact value under a different id is not shown twice', other.state === 'warm', other.state + ' ' + other.id);

  // Old memory: v49 kept bare ids.
  const old = C.coach({ ...one, opens: 3, recentHype: ['hype_logging', 'hype_pr', 42, null, { junk: true }] }).card.you;
  check('old string memory reads cleanly: a bare id matches no fact value, so the line shows as it did',
        old.state === 'earned' && old.id === 'hype_logging', old.state);

  // The warm lines themselves.
  const greetTexts = C.GREETINGS.filter(g => g.kind === 'generic').map(g => g.text());
  const warmTexts = [];
  for (let k = 0; k < 7; k++) C.WARM.forEach(w => warmTexts.push(w.text({ now: NOW + k * DAY })));
  const warmBad = warmTexts.filter(t => CARD_BAN.some(re => re.test(t)) || t.includes('!') || t.split(/\s+/).length > 9 ||
                                        (t.match(/\d+/g) || []).length > 1 || greetTexts.includes(t));
  check('about eight warm lines, every one through the card ban on every weekday, none a shipped greeting (' + warmTexts.length + ' strings)',
        C.WARM.length >= 7 && C.WARM.length <= 10 && !warmBad.length, list(warmBad));
  const both = [];
  ['lb', 'kg'].forEach(u => { for (let k = 0; k < 16; k++) {
    const c = C.coach({ ...one, u, opens: k, recentHype: at(HOUR) });
    both.push({ u, you: c.card.you, train: c.card.train, greet: c.greet ? c.greet.text : null });
  } });
  check('in both units every warm card passes the card ban and is never the greeting drawn above it',
        both.every(x => x.you.state === 'warm' && !CARD_BAN.some(re => re.test(x.you.text)) && x.you.text !== x.greet),
        both.filter(x => x.you.text === x.greet).map(x => x.you.text).join(' | '));
  const walk = both.filter(x => x.u === 'lb').map(x => x.you.id);
  check('the warm lines rotate on the open counter: never the same one twice running',
        walk.every((id, i) => i === 0 || id !== walk[i - 1]) && new Set(walk).size >= 7, list(walk));
  check('and the Train card never draws the You card’s warm line', both.every(x => x.train.state !== 'warm' || x.train.id !== x.you.id));
  check('"Nothing stands out today." is no longer a card line', both.every(x => x.you.text !== 'Nothing stands out today.' && x.train.text !== 'Nothing stands out today.'));
}

/* ================= H. v53 — THE TRAIN CARD AFTER A WORKOUT ================= */
section('H. v53 — the finish line on the Train card too, a named exception; every other line stays training-only');
{
  /* Micah, before the push: the Train card sits directly above Start
     workout and is the first thing he sees after Done on the recap, so after
     a workout it shows the finish line as well — though its category (core)
     is not a training one and the You card is showing it. One line crosses,
     by name, and nothing else. */
  check('the exception is exactly one line, by name, and TRAIN_HYPE is still training categories only',
        JSON.stringify(C.TRAIN_ALSO) === '["hype_finish"]' && !C.TRAIN_HYPE.includes('core') &&
        C.HYPE.find(h => h.id === 'hype_finish').category === 'core', JSON.stringify([C.TRAIN_ALSO, C.TRAIN_HYPE]));
  const post = CASES.hype_finish[0];
  const same = [];
  ['lb', 'kg'].forEach(u => [true, false].forEach(pro => { for (let opens = 0; opens < 8; opens++) {
    const c = C.coach({ ...post, u, opens, tier: { pro } });
    same.push(c.card.train.id === 'hype_finish' && c.card.you.id === 'hype_finish' && c.card.train.text === c.card.you.text &&
              c.card.train.reason === c.card.you.reason);
  } }));
  check('an hour after a session both cards show the same finish line, every open, both units, both tiers (' + same.length + ' paints)',
        same.every(Boolean), same.filter(x => !x).length + ' paints differ');
  // Every log in this file, every open, both units: the Train card draws a
  // training line, or the finish line after a workout, and never another
  // line the You card is showing.
  const cat = id => (C.HYPE.find(h => h.id === id) || {}).category;
  const off = [];
  Object.entries(CASES).forEach(([name, logs]) => logs.forEach((lg, k) => ['lb', 'kg'].forEach(u => { for (let opens = 0; opens < 12; opens++) {
    const c = C.coach({ ...lg, u, opens, recentHype: [] });
    const t = c.card.train;
    if (t.state !== 'earned') continue;
    const after = c.state === 'post' || c.state === 'done_today';
    if (t.id === 'hype_finish' ? !after : !C.TRAIN_HYPE.includes(cat(t.id))) off.push(name + '/' + k + '/' + u + ': ' + t.id + ' in ' + c.state);
    if (t.id !== 'hype_finish' && c.card.you.state === 'earned' && t.id === c.card.you.id) off.push(name + '/' + k + ': both show ' + t.id);
  } })));
  check('across every log here: Train draws a training line, or the finish line after a workout, and never shares any other line with You',
        !off.length, list(off));
  const pre = CASES.hype_finish[1];
  check('and with no session today, no finish line on either card',
        Array.from({ length: 8 }, (_, opens) => C.coach({ ...pre, opens })).every(c => c.card.train.id !== 'hype_finish' && c.card.you.id !== 'hype_finish'));
}

console.log('\nthe card only says what he has earned\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
