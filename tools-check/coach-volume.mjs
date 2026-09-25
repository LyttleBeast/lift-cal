#!/usr/bin/env node
//
// The battery for stage five's whole week — coach-volume.js (v54).
//
//   node tools-check/coach-volume.mjs
//
// "How's my weekly volume?" and "Is my training balanced?", built to
// COACH-TRAINER-SPEC.md §6.1–§6.5 and SHIP-V54-PROMPT §7. Every row is scored
// the house way:
//
//   ok     the read the row expects: the count, the band, the flag, the words
//   miss   silence where the row expects a reading. Reported, never fatal
//   wrong  anything else — a flag the row does not earn, a count off by a set,
//          a split called lopsided that is not. FATAL. Wrong stays 0
//
// NO COPY OF ANY RULE LIVES HERE. coach.js and coach-volume.js are staged
// against a stubbed store and driven for real: the input is coach.js's own
// volumeInput(), and the answers are the engine's own ask(). The expected
// numbers are worked by hand from the spec. And then the must-never-say scan:
// every sentence the module can build, from every fixture and from its source,
// in pounds and in kilos, held to the ban — above all, never a reason about the
// body (Micah's decision 12: counts only).
//
// v56 (SHIP-V56-PROMPT §2): the 40 rows are held, and three of the sentences
// checked beside them moved on purpose — two counts are joined by a comma now,
// never an "and" (L1, L2, L3). The new rows: G5–G10, each group's range on Get
// stronger and Powerlifting, and the stall ladder reading the same floor;
// L11–L15, push against pull with a customs-heavy group left out rather than
// the split; and M1–M4, Micah's two answers of 25 Sep, reconstructed and read
// by rack-v55 (staged out of git) beside today's.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-coach-volume-'));
const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
const FILES = ['analytics.js', 'coach-goal.js', 'coach-prog.js', 'coach-overlap.js', 'coach-build.js', 'coach-live.js',
               'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach.js'];
FILES.forEach(f => writeFileSync(join(dir, f.replace(/\.js$/, '.mjs')), src(f)
  .replace("from './store.js'", "from './store-stub.mjs'")
  .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (FILES.includes(n + '.js') ? at(n + '.mjs') : real(n + '.js')))));
const C = await import(JSON.parse(at('coach.mjs')));
const V = await import(JSON.parse(at('coach-volume.mjs')));
const O = await import(JSON.parse(at('coach-overlap.mjs')));
const { EXERCISES } = await import(JSON.parse(real('exercises.js')));
/* v56: rack-v55's stack too, out of git, staged the same way — the "before"
   of Micah's two answers in M. */
const BEFORE = 'f2ba45e';
const odir = mkdtempSync(join(tmpdir(), 'rack-coach-volume-v55-'));
const oat = f => JSON.stringify(pathToFileURL(join(odir, f)).href);
writeFileSync(join(odir, 'store-stub.mjs'), readFileSync(join(dir, 'store-stub.mjs'), 'utf8'));
FILES.forEach(f => writeFileSync(join(odir, f.replace(/\.js$/, '.mjs')),
  execFileSync('git', ['show', BEFORE + ':' + f], { cwd: ROOT, encoding: 'utf8' })
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (FILES.includes(n + '.js') ? oat(n + '.mjs') : real(n + '.js')))));
const OC = await import(JSON.parse(oat('coach.mjs')));
const OV = await import(JSON.parse(oat('coach-volume.mjs')));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const list = xs => xs.slice(0, 6).join('\n         ') + (xs.length > 6 ? '\n         … (' + xs.length + ')' : '');

/* ================= FIXTURES =================
   A fixed epoch, every session an offset from it in days. One session a week
   unless a row says otherwise, on the second day of its week, so week k is
   the session `7k + 2` days ago. The library is the real one, plus two
   customs; every set is a working set of 10 at 100 lb unless a row says. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
LIB['custom-my-press-a1b2c'] = { name: 'My Press', group: 'chest', equipment: 'machine' };
LIB['custom-my-row-d3e4f'] = { name: 'My Row', group: 'back', equipment: 'cable' };
LIB['custom-my-curl-g5h6i'] = { name: 'My Curl', group: 'arms', equipment: 'machine' };
let sid = 0;
const S = (w, r, type) => ({ w: String(w), r: String(r), type: type || 'N', done: true });
const ex = (id, sets) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment, sets });
const nx = (id, k, w = 100, r = 10, type) => ex(id, Array.from({ length: k }, () => S(w, r, type)));
const sess = (ago, exercises) => ({ id: 'v' + (++sid), startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises });
// `weeks` sessions, week k's exercises from f(k).
const weekly = (weeks, f) => Array.from({ length: weeks }, (_, k) => sess(7 * k + 2, f(k)).exercises.length ? sess(7 * k + 2, f(k)) : null).filter(Boolean);
const inputOf = (sessions, o = {}) => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: o.u || 'lb', log: 'readable', sessions, lib: LIB,
  hidden: o.hidden || [], libReady: true, routines: [], live: { active: false }, tier: { pro: o.basic ? false : true },
  targets: null, targetsSet: null, summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: o.mute || {}, answers: { ...(o.aim ? { q_goal_aim: o.aim } : null), ...(o.focus ? { q_focus_group: o.focus } : null) },
              asked: { ...(o.aimAt ? { q_goal_aim: o.aimAt } : null), ...(o.asked || null) } }
});
const vol = (sessions, o) => V.volumeRead(C.volumeInput(inputOf(sessions, o)));
const bal = (sessions, o) => V.balanceRead(C.volumeInput(inputOf(sessions, o)));
const row = (r, g) => (r && r.groups ? r.groups.find(x => x.group === g) : null);
const said = [];   // every sentence, for the scan
const hear = (a, u) => { if (!a) return; [a.text, a.reason].concat((a.more || []).flatMap(m => [m.text, m.reason])).filter(Boolean).forEach(t => said.push({ u: u || 'lb', t })); };

/* ================= A. THE BATTERY ================= */
section('A. bands, flags, counting, neglect, the focus group and balance — row by row, ok / miss / wrong');
const tally = { ok: 0, miss: 0, wrong: 0 };
function score(id, label, got, want, silent) {
  const bad = Object.keys(want).filter(k => J(got ? got[k] : undefined) !== J(want[k]));
  const kind = !bad.length ? 'ok' : silent ? 'miss' : 'wrong';
  tally[kind]++;
  check(id + ': ' + label, kind !== 'wrong', kind + ' — ' + bad.map(k => k + ' ' + J(got ? got[k] : undefined) + ', want ' + J(want[k])).join('; '));
}
// A chest group at `now` sets this week and `was` in each of the eight weeks before.
const chestWeeks = (now, was, o = {}) => weekly(9, k => [nx(o.id || 'pec-deck', k === 0 ? now : k === 1 && o.last != null ? o.last : was)]);

{
  // --- the four bands (building muscle: 10–20) ---
  const r1 = vol(chestWeeks(2, 3));
  score('B1', 'very low: 2 in the last 7 days, under 4 — "very low", no flag (a week under 70% is one week)',
        row(r1, 'chest'), { sets: 2, zone: 'very low', flag: null });
  const r2 = vol(chestWeeks(7, 7));
  score('B2', 'low end: 7, under the 10 floor — and about his usual 7, so "about your usual"',
        row(r2, 'chest'), { sets: 7, zone: 'low end', flag: 'right' });
  const r3 = vol(chestWeeks(12, 12));
  score('B3', 'common range: 12, inside 10–20 — about right', row(r3, 'chest'), { sets: 12, zone: 'common', flag: 'right' });
  const r4 = vol(chestWeeks(24, 22));
  score('B4', 'high: 24, over 20 — within 30% of his usual 22, so about his usual, and never "too much" for it',
        row(r4, 'chest'), { sets: 24, zone: 'high', flag: 'right' });
  hear(V.volumeAnswer(r1)); hear(V.volumeAnswer(r2)); hear(V.volumeAnswer(r3)); hear(V.volumeAnswer(r4));
  const a3 = V.volumeAnswer(r3);
  check('and said in plain numbers, with no goal set: "Chest: 12 hard sets in the last 7 days, inside 10–20, a common range. About right."',
        a3 && a3.text === 'Chest: 12 hard sets in the last 7 days, inside 10–20, a common range. About right.', a3 && a3.text);

  // --- the flags ---
  const f1 = vol(chestWeeks(6, 12, { last: 6 }));
  score('F1', 'too little: 6 and 6, under 10 and under 70% of his usual 12, two weeks running', row(f1, 'chest'),
        { flag: 'little', why: 'two', normal: 12 });
  const f1a = V.volumeAnswer(f1);
  check('said: "…the low end, under 10–20… Two weeks running under that range and under 70% of your usual 12 (6 the 7 days before)."',
        /^Chest: 6 hard sets in the last 7 days, the low end, under 10–20, a common range\. Two weeks running under that range and under 70% of your usual 12 \(6 the 7 days before\)\.$/.test(f1a.text), f1a.text);
  hear(f1a);
  const f9 = vol(chestWeeks(6, 12));
  score('F9', 'one week under is not two: 6 this week after 12 — no "too little"', row(f9, 'chest'), { flag: null });
  const f2 = vol(chestWeeks(11, 11), { aim: 'muscle', focus: 'chest' });
  score('F2', 'too little on his focus group: under its raised 13 four weeks running (11 each), though his usual is 11',
        row(f2, 'chest'), { flag: 'little', why: 'focus', band: { lo: 13, hi: 26, raised: true, cut: false } });
  hear(V.volumeAnswer(f2));
  const f4 = vol(chestWeeks(22, 20));
  score('F4', 'about right by his usual: 22 against a usual 20, within 30%, though over the range', row(f4, 'chest'), { zone: 'high', flag: 'right' });
  // More than usual, and a fatigue sign.
  const fF = weekly(9, k => [k === 0 ? ex('pec-deck', [S(100, 10), S(100, 10), S(100, 10), S(100, 10), S(100, 10), S(100, 10), S(100, 10), S(100, 10),
                                                      S(100, 10), S(100, 10), S(100, 8, 'F'), S(100, 8, 'F'), S(100, 8, 'F'), S(100, 8, 'F')])
                                    : nx('pec-deck', 10)]);
  const f5 = vol(fF);
  score('F5', 'more than usual: 14 against a usual 10 (1.3× or more), with 4 sets taken to failure against a usual none',
        row(f5, 'chest'), { flag: 'more', why: { f: 4, usual: 0 } });
  hear(V.volumeAnswer(f5));
  const fD = weekly(9, k => (k === 0
    ? [ex('barbell-bench-press', [S(185, 10), S(185, 7), S(185, 10), S(185, 10)]), ex('pec-deck', [S(100, 10), S(100, 7), S(100, 10), S(100, 10)]),
       ex('cable-crossover', [S(40, 12), S(40, 12), S(40, 12), S(40, 12), S(40, 12), S(40, 12)])]
    : [nx('pec-deck', 10)]));
  const f6 = vol(fD);
  score('F6', 'more than usual: 14 chest sets against 10, with reps down a quarter on 2 of its lifts', row(f6, 'chest'),
        { flag: 'more', why: { drops: 2 } });
  hear(V.volumeAnswer(f6));
  const f7 = vol(weekly(9, k => [nx('pec-deck', k === 0 ? 14 : 10)]));
  score('F7', 'volume alone is never "too much": 14 against 10 with no sign of fatigue — about right, inside the range',
        row(f7, 'chest'), { flag: 'right', zone: 'common' });
  const f8 = vol(weekly(9, k => [nx('pec-deck', 12), nx('plank', k === 0 ? 1 : 6)]));
  score('F8', 'core: 1 set against a usual 6 — a readout and nothing else, never "too little"', row(f8, 'core'),
        { sets: 1, band: null, zone: null, flag: null });
  const f8a = V.volumeAnswer(f8);
  check('and core’s line is its number alone: "Core: 1 hard set in the last 7 days."',
        f8a.more.some(m => m.text === 'Core: 1 hard set in the last 7 days.'), J(f8a.more.map(m => m.text)));

  // --- counting ---
  const hs = sets => V.hardSets(sets).length;
  score('D1', 'a warm-up in disguise — N, 90 of a 185 top (≤ 50%), before the first top set, 5 reps (≤ top + 2) — is out',
        { n: hs([S(90, 5), S(185, 5), S(185, 5), S(185, 5)]) }, { n: 3 });
  score('D2', 'the load alone: 95 of 185 is over half — it counts', { n: hs([S(95, 5), S(185, 5), S(185, 5), S(185, 5)]) }, { n: 4 });
  score('D3', 'the order alone: after the first top set — it counts', { n: hs([S(185, 5), S(90, 5), S(185, 5), S(185, 5)]) }, { n: 4 });
  score('D4', 'the reps alone: 8 against a top set of 5 (over 5 + 2) — a light working set, and it counts',
        { n: hs([S(90, 8), S(185, 5), S(185, 5), S(185, 5)]) }, { n: 4 });
  score('D5', 'and it is the N set only: a light F set before the top is a working set', { n: hs([S(90, 5, 'F'), S(185, 5), S(185, 5)]) }, { n: 3 });
  score('D6', 'a typed warm-up was never a working set; bodyweight has no top load to be half of',
        { w: hs([S(90, 5, 'W'), S(185, 5)]), bw: hs([S(0, 10), S(0, 10)]) }, { w: 1, bw: 2 });
  const x1 = vol(weekly(9, () => [nx('barbell-bench-press', 4), nx('pec-deck', 3)]));
  score('X1', 'fractional: 4 bench (arms and shoulders its secondaries) and 3 pec deck — chest 7, arms 2, shoulders 2',
        { chest: row(x1, 'chest').sets, arms: row(x1, 'arms').sets, shoulders: row(x1, 'shoulders').sets }, { chest: 7, arms: 2, shoulders: 2 });
  const x2 = vol(weekly(9, () => [nx('custom-my-press-a1b2c', 4)]));
  score('X2', 'a custom exercise counts for its primary group only: 4 chest, nothing else',
        { chest: row(x2, 'chest').sets, arms: row(x2, 'arms').sets }, { chest: 4, arms: 0 });
  const x3 = vol(weekly(9, k => [nx('pec-deck', 10), nx('treadmill-run', 3)]));
  score('X3', 'cardio is never a hard set — a treadmill filed under legs adds nothing to legs', { legs: row(x3, 'legs').sets }, { legs: 0 });
  // The shipped finding keeps its primary-only count.
  const shipLog = weekly(6, k => [nx('barbell-bench-press', k === 0 ? 2 : 10), nx('barbell-curl', k === 0 ? 2 : 6)]);
  const shipA = C.coach(inputOf(shipLog)).ask('ask_volume');
  const shipV = vol(shipLog);
  check('the shipped group_under_weekly_normal keeps its primary-only count — "2 working arms sets", never the fractional ' + (shipV && row(shipV, 'arms').sets),
        shipA.id === 'group_under_weekly_normal' && /^2 working (arms|chest) sets in the last 7 days/.test(shipA.text) && row(shipV, 'arms').sets === 3,
        shipA.id + ': ' + shipA.text);

  // --- the goal's range ---
  const g1 = vol(chestWeeks(12, 12), { aim: 'muscle', focus: 'chest' });
  score('G1', 'the focus group: its range up 30% (13–26), and its line first', { first: g1.groups[0].group, band: row(g1, 'chest').band },
        { first: 'chest', band: { lo: 13, hi: 26, raised: true, cut: false } });
  const g1a = V.volumeAnswer(g1);
  check('said: "…13–26, a common range for building muscle raised 30% for your focus."',
        /13–26, a common range for building muscle raised 30% for your focus\./.test(g1a.text), g1a.text);
  hear(g1a);
  const g2 = vol(weekly(9, k => [nx('pec-deck', k <= 2 ? 11 : 15)]), { aim: 'cut', aimAt: NOW - 20 * DAY });
  score('G2', 'a cut: two thirds of his usual BEFORE the cut — 15 a week then, so 10 or more, with no top',
        row(g2, 'chest').band, { lo: 10, hi: null, raised: false, cut: true });
  const g2a = V.volumeAnswer(g2);
  check('said: "…inside 10 or more, two thirds of your usual before your cut."', /inside 10 or more, two thirds of your usual before your cut\./.test(g2a.text), g2a.text);
  hear(g2a);
  score('G3', 'Get stronger: 6–15 (volumeFloor()’s 6, on every group)', row(vol(chestWeeks(12, 12), { aim: 'strength' }), 'back').band,
        { lo: 6, hi: 15, raised: false, cut: false });
  score('G4', 'Stay consistent: 6–12', row(vol(chestWeeks(12, 12), { aim: 'maintain' }), 'chest').band, { lo: 6, hi: 12, raised: false, cut: false });
  // v56 (SHIP-V56-PROMPT §2.3): the range per group. The main lifts are
  // coach-goal.js's MAIN_LIFTS — squat, bench and deadlift, the list bigThree()
  // reads — and their groups come from exercises.js: legs, chest and back.
  const bands = r => Object.fromEntries(['chest', 'back', 'legs', 'shoulders', 'arms'].map(g => [g, [row(r, g).band.lo, row(r, g).band.hi]]));
  score('G5', 'Get stronger: 6–15 on the groups carrying squat, bench and deadlift — chest, back and legs — and 10–20 on shoulders and arms',
        bands(vol(chestWeeks(12, 12), { aim: 'strength' })), { chest: [6, 15], back: [6, 15], legs: [6, 15], shoulders: [10, 20], arms: [10, 20] });
  score('G6', 'Powerlifting: the same — 6–15 on chest, back and legs, 10–20 on shoulders and arms',
        bands(vol(chestWeeks(12, 12), { aim: 'powerlifting' })), { chest: [6, 15], back: [6, 15], legs: [6, 15], shoulders: [10, 20], arms: [10, 20] });
  const g7r = vol(weekly(9, () => [nx('pec-deck', 8), nx('barbell-curl', 16)]), { aim: 'strength' });
  const g7 = V.volumeAnswer(g7r);
  score('G7', 'and it names the range it used: chest "6–15, a common range for strength", arms "10–20, a common range for a group with no main lift"',
        { chest: g7.text, arms: (g7.more.find(m => /^Arms:/.test(m.text)) || {}).text, which: g7.reason.slice(g7.reason.indexOf(' For strength')) },
        { chest: 'Chest: 8 hard sets in the last 7 days, inside 6–15, a common range for strength. About right.',
          arms: 'Arms: 16 hard sets in the last 7 days, inside 10–20, a common range for a group with no main lift. About right.',
          which: ' For strength, 6–15 is for the groups with a main lift in them (squat, bench and deadlift): chest, back and legs. The rest get 10–20.' });
  hear(g7);
  score('G8', 'his focus on arms, on Get stronger: 10–20 raised 30% — 13–26', row(vol(chestWeeks(12, 12), { aim: 'strength', focus: 'arms' }), 'arms').band,
        { lo: 13, hi: 26, raised: true, cut: false });
  score('G8b', 'and every other aim reads one range for every group, as it did: Build muscle 10–20 on shoulders and on chest',
        bands(vol(chestWeeks(12, 12), { aim: 'muscle' })), { chest: [10, 20], shoulders: [10, 20], arms: [10, 20] });
  /* The stall ladder (coach-overlap.js's volume rung) reads the same floor for
     the same group: coach-overlap.mjs's C3 — bench twice a week for twelve
     weeks, climbing to 225×5 and level for the last five, flyes beside it
     until four weeks ago, 6 chest sets a week now against 12 — on Get
     stronger, with the two lifts filed under chest as shipped, or refiled
     under shoulders (an override he can make). */
  const ladder = group => {
    const lib = { ...LIB, 'barbell-bench-press': { ...LIB['barbell-bench-press'], group }, 'dumbbell-flye': { ...LIB['dumbbell-flye'], group } };
    const t = (ago, h) => { const d = new Date(NOW - ago * DAY); d.setHours(h, 0, 0, 0); return d.getTime(); };
    const mk = (ago, h, rows) => ({ id: 'z' + (++sid), name: 'S', startedAt: t(ago, h), _date: key(t(ago, h)),
      exercises: rows.map(([id, sets]) => ({ exId: id, name: lib[id].name, group: lib[id].group, equipment: lib[id].equipment, sets })) });
    const n = (k, w, r) => Array.from({ length: k }, () => S(w, r));
    const days = []; for (let ago = 2, g = 0; ago <= 2 + 12 * 7 - 1; ago += [3, 4][g++ % 2]) days.push(ago);
    days.reverse();
    const LEVEL = [[225, 5], [230, 4], [220, 6]];
    let w = 225 - 2.5 * days.filter(a => a > 38).length;
    const out = [];
    days.forEach((ago, k) => {
      const rows = [['barbell-bench-press', ago > 38 ? n(3, (w += 2.5), 5) : n(3, LEVEL[k % 3][0], LEVEL[k % 3][1])]];
      if (ago >= 28) rows.push(['dumbbell-flye', n(3, 35, 12)]);
      out.push(mk(ago, 18, rows));
    });
    days.filter((a, k) => k % 2 === 0).forEach((ago, k) => {
      out.push(mk(ago + 1, 9, [['back-squat-high-bar', n(4, 245, 5)], ['romanian-deadlift', n(3, 185, 8)]]));
      if (k % 2 === 0) out.push(mk(ago, 20, [['barbell-row', n(3, 155, 8)]]));
    });
    const weighIns = []; for (let ago = 90; ago >= 0; ago -= 2) weighIns.push({ lb: Math.round((190 + 1.6 * (90 - ago) / 90) * 10) / 10, t: t(ago, 7) });
    const oi = C.overlapInput({ ...inputOf(out.sort((a, b) => a.startedAt - b.startedAt), { aim: 'strength' }), lib, weighIns,
      weight: { latestLb: 191.6, latestAt: t(0, 7), rateWk: 0.13, rateDays: 90, goalDir: null, goalRateWk: null } });
    const r = O.readLift(oi.lifts.find(l => l.exId === 'barbell-bench-press'), { now: oi.now, u: oi.u, aim: oi.aim, exp: oi.exp, energy: oi.energy, rateWk: oi.rateWk }, oi);
    return { call: r.call, rung: r.rung, floor: r.volume ? r.volume.floor : null, text: r.text };
  };
  const onShoulders = ladder('shoulders'), onChest = ladder('chest');
  score('G9', 'the stall ladder on shoulders, on Get stronger: 6 sets a week against 12 is under its 10 — the volume rung: "' + onShoulders.text + '"',
        onShoulders, { call: 'plateau', rung: 'volume', floor: 10 });
  score('G10', 'and the same lift filed under chest: 6 is not under chest’s 6, so no volume rung — the floor the weekly answer reads for chest',
        onChest, { call: 'plateau', rung: 'none', floor: null });
  hear(V.volumeAnswer(vol(chestWeeks(12, 12), { aim: 'strength' })));
  hear(V.volumeAnswer(vol(chestWeeks(12, 12), { aim: 'powerlifting' })));
  hear(V.volumeAnswer(vol(chestWeeks(12, 12), { aim: 'recomp' })));

  // --- neglect ---
  // Back by a Romanian deadlift: a row works arms second, and would count half
  // its sets there.
  const nLog = weekly(9, () => [nx('pec-deck', 10), nx('romanian-deadlift', 10), nx('back-squat-high-bar', 10), nx('dumbbell-lateral-raise', 10), nx('barbell-curl', 1)]);
  const n1 = vol(nLog);
  score('N1', 'neglect: arms 4 in 4 weeks against a middle of 40 across the rest (legs 60 with the deadlift’s half) — under 30%', n1.neglect,
        { group: 'arms', sets4: 4, median4: 40, zero8: false, ratio: 0.1 });
  const n1a = V.volumeAnswer(n1);
  check('said once, last, and counts only: "Arms: 4 hard sets in the last 4 weeks, against a middle of 40 across your other groups."',
        n1a.more[n1a.more.length - 1].text === 'Arms: 4 hard sets in the last 4 weeks, against a middle of 40 across your other groups.' && n1a.once === 'vol_neglect',
        J(n1a.more.slice(-1)));
  hear(n1a);
  const n2 = vol(weekly(9, () => [nx('pec-deck', 10), nx('romanian-deadlift', 10), nx('back-squat-high-bar', 10), nx('dumbbell-lateral-raise', 10)]));
  score('N2', 'neglect: arms at zero for eight weeks', { group: n2.neglect && n2.neglect.group, zero8: n2.neglect && n2.neglect.zero8 }, { group: 'arms', zero8: true });
  check('said: "Arms: no hard sets in the last 8 weeks."', V.volumeAnswer(n2).more.slice(-1)[0].text === 'Arms: no hard sets in the last 8 weeks.');
  const held = vol(nLog, { asked: { vol_neglect: NOW - 10 * DAY } });
  score('N3', 'said once in 28 days: stamped 10 days ago, it stays quiet', { neglect: held.neglect, held: held.neglectHeld }, { neglect: null, held: true });
  const again = vol(nLog, { asked: { vol_neglect: NOW - 29 * DAY } });
  score('N4', 'and 29 days on, it is said again', { group: again.neglect && again.neglect.group }, { group: 'arms' });
  const n5 = vol(weekly(9, () => [nx('pec-deck', 10), nx('barbell-row', 10), nx('back-squat-high-bar', 10), nx('dumbbell-lateral-raise', 10), nx('barbell-curl', 10)]));
  score('N5', 'core is never neglected — nobody has to train it directly', { neglect: n5.neglect }, { neglect: null });
  const eng = C.coach(inputOf(nLog));
  const ans = eng.ask('ask_week_volume');
  check('the engine’s answer carries `once` when it says it, and not when it is held',
        ans.id === 'week_volume' && ans.once === 'vol_neglect' &&
        C.coach(inputOf(nLog, { asked: { vol_neglect: NOW - 10 * DAY } })).ask('ask_week_volume').once === undefined);
  check('normSettings keeps the stamp — a child of settings/coach.asked, and nothing else new',
        C.normSettings({ asked: { vol_neglect: 5, v_junk: 6 } }).asked.vol_neglect === 5 && !('v_junk' in C.normSettings({ asked: { v_junk: 6 } }).asked));
  const card = C.coach(inputOf(nLog)).card;
  check('and never on the card: neither card says a group’s hard sets or its neglect',
        ![card.you, card.train].some(x => /hard sets?|neglect|no hard/.test(x.text + ' ' + (x.reason || ''))), J([card.you.text, card.train.text]));

  // --- balance ---
  const push = k => nx('overhead-press', k), pull = k => nx('barbell-row', k);
  const L1 = bal(weekly(9, () => [nx('barbell-bench-press', 3), nx('triceps-pushdown-rope', 1), pull(1)]));
  score('L1', 'push : pull past 2 : 1 — 32 pushing sets against 8 pulling over 8 weeks', L1.ratios.find(r => r.id === 'pushPull'),
        { a: 32, b: 8, flagged: true, skipped: false });
  // v56: two counts joined by a comma (SHIP-V56-PROMPT §2.2); v55 said "32 pushing sets and 8 pulling".
  check('said as counts: "Over 8 weeks: 32 pushing sets, 8 pulling sets, more than two to one."',
        V.balanceAnswer(L1).text === 'Over 8 weeks: 32 pushing sets, 8 pulling sets, more than two to one.', V.balanceAnswer(L1).text);
  hear(V.balanceAnswer(L1));
  const L2log = weekly(9, () => [nx('barbell-bench-press', 2), push(1), pull(2), nx('lat-pulldown', 1), nx('back-squat-high-bar', 2), nx('romanian-deadlift', 1)]);
  const L2 = bal(L2log);
  score('L2', 'nothing lopsided: 24 pushing and 24 pulling, 16 squat and 8 hinge, both directions of each', { flagged: L2.ratios.filter(r => r.flagged).map(r => r.id) },
        { flagged: [] });
  const L2a = V.balanceAnswer(L2);
  // v56: a line for each split, its counts joined by a comma (SHIP-V56-PROMPT
  // §2.2). v55 said both on one line: "24 pushing and 24 pulling sets; 16
  // squat and lunge and 8 hinge and bridge sets", two "and"s between counts.
  check('said: "Nothing lopsided in the last 8 weeks." — with the counts under it, a line each, joined by a comma',
        L2a.text === 'Nothing lopsided in the last 8 weeks.' && L2a.more[0].text === 'Over 8 weeks: 24 pushing sets, 24 pulling sets.' &&
        L2a.more[1].text === 'Over 8 weeks: 16 squat and lunge sets, 8 hinge and bridge sets.',
        J([L2a.text].concat(L2a.more.map(m => m.text))));
  hear(L2a);
  const L3 = bal(weekly(9, () => [nx('barbell-bench-press', 3), pull(3), nx('lat-pulldown', 1)]));
  score('L3', 'horizontal against vertical press: 24 flat and none overhead — one side at zero', L3.ratios.find(r => r.id === 'press'),
        { a: 24, b: 0, flagged: true });
  // v56: the same comma (SHIP-V56-PROMPT §2.2 — every readout joining two families); v55 said "…sets and none overhead".
  check('said: "Over 8 weeks: 24 flat, incline or decline pressing sets, none overhead."',
        V.balanceAnswer(L3).more.concat([{ text: V.balanceAnswer(L3).text }]).some(m => m.text === 'Over 8 weeks: 24 flat, incline or decline pressing sets, none overhead.'));
  hear(V.balanceAnswer(L3));
  const L4 = bal(weekly(9, () => [push(2), pull(3)]));
  score('L4', 'horizontal against vertical pull: 24 rows and no pulldown', L4.ratios.find(r => r.id === 'pull'), { a: 24, b: 0, flagged: true });
  hear(V.balanceAnswer(L4));
  const L5 = bal(weekly(9, () => [nx('back-squat-high-bar', 4), nx('romanian-deadlift', 1)]));
  score('L5', 'knee : hip past 3 : 1 — 32 squat sets against 8 hinge', L5.ratios.find(r => r.id === 'kneeHip'), { a: 32, b: 8, flagged: true });
  hear(V.balanceAnswer(L5));
  const L6 = bal(weekly(9, () => [push(2), pull(2), nx('lat-pulldown', 1), nx('custom-my-press-a1b2c', 1)]));
  const L6a = V.balanceAnswer(L6);
  check('L6: customs are left out of every split, and the answer says so: "8 sets on your custom exercises aren’t in this split…"',
        L6.custom === 8 && L6a.more.some(m => m.text === '8 sets on your custom exercises aren’t in this split: Coach doesn’t know their movement.'),
        J(L6a.more.map(m => m.text)));
  hear(L6a);
  const L7 = bal(weekly(9, () => [push(3), pull(2), nx('lat-pulldown', 1), nx('custom-my-row-d3e4f', 2)]));
  score('L7', 'customs over a quarter of a group (back: 16 of 40): its splits — push/pull and the pull split — are skipped',
        { skipped: L7.ratios.filter(r => r.skipped).map(r => r.id).sort(), groups: L7.skipped }, { skipped: ['pull', 'pushPull'], groups: ['back'] });
  const L7a = V.balanceAnswer(L7);
  check('and said: "Your back work is more than a quarter custom exercises, so Coach leaves its split out."',
        L7a.more.some(m => m.text === 'Your back work is more than a quarter custom exercises, so Coach leaves its split out.'), J(L7a.more.map(m => m.text)));
  hear(L7a);
  const L8 = bal(weekly(9, () => [push(3), pull(1)]), { hidden: ['barbell-row', 'overhead-press'] });
  score('L8', 'hidden exercises still count — hiding takes one out of the picker, not out of the log', L8.ratios.find(r => r.id === 'pushPull'),
        { a: 24, b: 8, flagged: true });
  const L9 = bal(weekly(9, k => (k < 2 ? [push(2)] : [nx('back-squat-high-bar', 2), nx('romanian-deadlift', 2)])));
  score('L9', 'a split with fewer than eight sets in it says nothing: 4 pushing and none pulling is a coincidence, not a split',
        L9.ratios.find(r => r.id === 'pushPull'), { a: 4, b: 0, flagged: false });
  const L10 = bal(weekly(9, () => [nx('barbell-bench-press', 3), nx('triceps-pushdown-rope', 1), pull(1), nx('back-squat-high-bar', 4), nx('romanian-deadlift', 1)]), { focus: 'legs' });
  score('L10', 'his focus ranks first: with legs his focus, knee : hip is said before push : pull and the two direction splits',
        { order: L10.ratios.filter(r => r.flagged).map(r => r.id) }, { order: ['kneeHip', 'pushPull', 'press', 'pull'] });
  hear(V.balanceAnswer(L10));

  // --- v56: a customs-heavy group leaves push : pull by its sets, not the whole split (SHIP-V56-PROMPT §2.1) ---
  const pp = r => { const x = r.ratios.find(y => y.id === 'pushPull'); return { a: x.a, b: x.b, flagged: x.flagged, skipped: x.skipped, left: x.left }; };
  const L11 = bal(weekly(9, () => [nx('barbell-bench-press', 2), push(1), nx('triceps-pushdown-rope', 1), nx('custom-my-curl-g5h6i', 1), pull(2), nx('lat-pulldown', 1)]));
  score('L11', 'arms half customs: push : pull still read, from chest and shoulders against back — 24 and 24 — with the arms’ 8 pushdowns left out, and no split skipped',
        { pp: pp(L11), skipped: L11.skipped, heavy: L11.heavy }, { pp: { a: 24, b: 24, flagged: false, skipped: false, left: ['arms'] }, skipped: [], heavy: ['arms'] });
  const L11a = V.balanceAnswer(L11);
  score('L12', 'and said with what it left out: "Over 8 weeks: 24 pushing sets, 24 pulling sets. Your arms work isn’t in this: more than a quarter of it is custom exercises."',
        { text: L11a.text, lines: L11a.more.map(m => m.text) },
        { text: 'Nothing lopsided in the last 8 weeks.',
          lines: ['Over 8 weeks: 24 pushing sets, 24 pulling sets. Your arms work isn’t in this: more than a quarter of it is custom exercises.',
                  '8 sets on your custom exercises aren’t in this split: Coach doesn’t know their movement.',
                  // Phase B's line, once in four weeks: tools-check/custom-movement.mjs holds its rules.
                  'You can set the movement of a custom exercise in its settings, and Coach will count it.'] });
  hear(L11a);
  const L13 = bal(weekly(9, () => [nx('barbell-bench-press', 3), nx('triceps-pushdown-rope', 2), nx('custom-my-curl-g5h6i', 1), pull(2)]));
  score('L13', 'the two to one is on what is counted: 24 pushing against 16 pulling is not lopsided — with the arms’ 16 pushdowns it would have been 40',
        pp(L13), { a: 24, b: 16, flagged: false, skipped: false, left: ['arms'] });
  hear(V.balanceAnswer(L13));
  const L14 = bal(weekly(9, () => [nx('barbell-bench-press', 2), nx('custom-my-press-a1b2c', 1), push(2), nx('triceps-pushdown-rope', 1), pull(2), nx('lat-pulldown', 1)]));
  score('L14', 'chest a third customs: push : pull read without chest (24 against 24), and the press split — chest’s own — skipped whole, as before',
        { pp: pp(L14), press: L14.ratios.find(r => r.id === 'press').skipped, skipped: L14.skipped },
        { pp: { a: 24, b: 24, flagged: false, skipped: false, left: ['chest'] }, press: true, skipped: ['chest'] });
  const L14a = V.balanceAnswer(L14);
  check('and both are said: chest out of push : pull, and its own split left out',
        L14a.more.some(m => m.text === 'Over 8 weeks: 24 pushing sets, 24 pulling sets. Your chest work isn’t in this: more than a quarter of it is custom exercises.') &&
        L14a.more.some(m => m.text === 'Your chest work is more than a quarter custom exercises, so Coach leaves its split out.'), J(L14a.more.map(m => m.text)));
  hear(L14a);
  LIB['custom-my-raise-j7k8l'] = { name: 'My Raise', group: 'shoulders', equipment: 'cable' };
  const L15 = bal(weekly(9, () => [nx('barbell-bench-press', 1), nx('custom-my-press-a1b2c', 1), push(1), nx('custom-my-raise-j7k8l', 1),
                                    nx('triceps-pushdown-rope', 1), nx('custom-my-curl-g5h6i', 1), pull(2)]));
  score('L15', 'every pushing group half customs: nothing left to push with, so push : pull is skipped whole — never "0 pushing sets"',
        { pp: pp(L15), skipped: L15.skipped }, { pp: { a: 24, b: 16, flagged: false, skipped: true, left: [] }, skipped: ['chest', 'shoulders', 'arms'] });
  hear(V.balanceAnswer(L15));

  /* --- M: Micah's two answers of 25 Sep (rack-v1054), reconstructed ---
     His log is not in this repo. This one is built to the shapes he read:
     back 21.5 and arms 16 hard sets in the last 7 days, 37 squat and lunge
     and 36 hinge and bridge sets over 8 weeks, 33 sets on customs, his arms a
     third customs, Get stronger, nothing lopsided. His push and pull counts
     were never shown — v55 skipped the split — so the ones here are made up.
     rack-v55 (f2ba45e) reads it beside today's build. */
  const micah = weekly(9, k => [nx('barbell-bench-press', 8), nx('z-press', 4), nx('straight-arm-pulldown', 10), nx('rope-face-pull', 10), nx('bird-dog', 3),
    nx('barbell-curl', 4), nx('triceps-pushdown-rope', 4), nx('custom-my-curl-g5h6i', k === 2 ? 5 : 4),
    nx('back-squat-high-bar', k <= 4 || k === 8 ? 5 : 4), nx('hip-thrust', k <= 3 || k === 8 ? 5 : 4)]);
  const mo = { aim: 'strength' };
  const mIn = inputOf(micah, mo);
  const oldBal = OV.balanceAnswer(OV.balanceRead(OC.volumeInput(mIn))), newBal = V.balanceAnswer(V.balanceRead(C.volumeInput(mIn)));
  const lines = a => [a.text].concat(a.more.map(m => m.text));
  check('M0: rack-v55 reads the reconstruction as he saw it: ' + J(lines(oldBal)),
        J(lines(oldBal)) === J(['Nothing lopsided in the last 8 weeks.', 'Over 8 weeks: 37 squat and lunge and 36 hinge and bridge sets.',
                                '33 sets on your custom exercises aren’t in this split: Coach doesn’t know their movement.',
                                'Your arms work is more than a quarter custom exercises, so Coach leaves its split out.']));
  const mBal = bal(micah, mo);
  score('M1', 'Is my training balanced? — push : pull read from chest, shoulders and back, his arms left out, the two to one on what is counted',
        { pp: pp(mBal), kneeHip: (({ a, b, flagged }) => ({ a, b, flagged }))(mBal.ratios.find(r => r.id === 'kneeHip')), skipped: mBal.skipped },
        { pp: { a: 96, b: 160, flagged: false, skipped: false, left: ['arms'] }, kneeHip: { a: 37, b: 36, flagged: false }, skipped: [] });
  score('M2', 'and said: ' + J(lines(newBal)), { lines: lines(newBal).slice(0, 4) },
        { lines: ['Nothing lopsided in the last 8 weeks.',
                  'Over 8 weeks: 96 pushing sets, 160 pulling sets. Your arms work isn’t in this: more than a quarter of it is custom exercises.',
                  'Over 8 weeks: 37 squat and lunge sets, 36 hinge and bridge sets.',
                  '33 sets on your custom exercises aren’t in this split: Coach doesn’t know their movement.'] });
  hear(newBal);
  const oldVol = OV.volumeAnswer(OV.volumeRead(OC.volumeInput(mIn))), newVol = V.volumeAnswer(V.volumeRead(C.volumeInput(mIn)));
  const lineOf = (a, g) => lines(a).find(t => t.startsWith(g + ':'));
  check('M3: rack-v55 read his back and arms as he saw them: "' + lineOf(oldVol, 'Back') + '" / "' + lineOf(oldVol, 'Arms') + '"',
        /^Back: 21\.5 hard sets in the last 7 days, above 6–15, a common range for strength\./.test(lineOf(oldVol, 'Back')) &&
        /^Arms: 16 hard sets in the last 7 days, above 6–15, a common range for strength\./.test(lineOf(oldVol, 'Arms')));
  const mVol = vol(micah, mo);
  score('M4', 'How’s my weekly volume? — back keeps 6–15 (the deadlift’s group), arms reads 10–20, and 16 is inside it: "' + lineOf(newVol, 'Arms') + '"',
        { back: [row(mVol, 'back').sets, row(mVol, 'back').band.lo, row(mVol, 'back').band.hi, row(mVol, 'back').zone],
          arms: [row(mVol, 'arms').sets, row(mVol, 'arms').band.lo, row(mVol, 'arms').band.hi, row(mVol, 'arms').zone, row(mVol, 'arms').flag],
          said: [lineOf(newVol, 'Back'), lineOf(newVol, 'Arms')] },
        { back: [21.5, 6, 15, 'high'], arms: [16, 10, 20, 'common', 'right'],
          said: ['Back: 21.5 hard sets in the last 7 days, above 6–15, a common range for strength. About your usual 21.5.',
                 'Arms: 16 hard sets in the last 7 days, inside 10–20, a common range for a group with no main lift. About right.'] });
  hear(newVol);

  // --- too little log ---
  const t1 = vol(weekly(3, () => [nx('pec-deck', 10)]));
  score('T1', 'under three weeks of log: 16 days — it says so, and guesses nothing', t1, { state: 'thin', days: 16 });
  check('said: "Coach reads weekly volume from three weeks of your log or more, and yours has 16 days so far."',
        V.volumeAnswer(t1).text === 'Coach reads weekly volume from three weeks of your log or more, and yours has 16 days so far.');
  const t2 = bal(weekly(3, () => [nx('pec-deck', 10)]));
  check('T2: and balance the same: "…and yours has 16 days so far."', t2.state === 'thin' && /yours has 16 days so far\.$/.test(V.balanceAnswer(t2).text));
  hear(V.volumeAnswer(t1)); hear(V.balanceAnswer(t2));
  results.push('\n  ok: ' + tally.ok + '   miss: ' + tally.miss + '   wrong: ' + tally.wrong);
  check('wrong: 0 — no row says a count, a band, a flag or a split the row does not', tally.wrong === 0);
}

/* ================= B. WHERE THE TWO ANSWERS ARE, AND ARE NOT ================= */
section('B. the sheet only — offered on Train, Pro, in the volume category; never a card, never the live sheet');
{
  const log = weekly(9, () => [nx('barbell-bench-press', 3), nx('barbell-row', 3), nx('back-squat-high-bar', 3)]);
  const c = C.coach(inputOf(log));
  const ids = c.topicsFor('train').map(t => t.id);
  check('Train’s sheet offers both, after its own bubbles', ids.includes('ask_week_volume') && ids.includes('ask_balance') &&
        ids.indexOf('ask_week_volume') > ids.indexOf('ask_volume'), J(ids));
  check('You’s lists never carry them — they are read on every card paint', !Object.values(C.STATE_TOPICS.you).some(l => l.includes('ask_week_volume') || l.includes('ask_balance')));
  check('and the live state’s never — nothing about the week mid-session', !C.STATE_TOPICS.train.live.includes('ask_week_volume') && !C.STATE_TOPICS.you.live.includes('ask_balance'));
  const w = C.INTENTS.find(i => i.id === 'week_volume'), b = C.INTENTS.find(i => i.id === 'balance_read');
  check('two selectors in the existing volume category, Pro like their siblings, sheet-only',
        [w, b].every(i => i && i.kind === 'selector' && i.category === 'volume' && i.tier === 'pro' && J(i.surfaces) === '["sheet"]'));
  check('the answers are the module’s, word for word', c.ask('ask_week_volume').text === V.volumeAnswer(vol(log)).text &&
        c.ask('ask_balance').text === V.balanceAnswer(bal(log)).text);
  check('each leads to the other', c.ask('ask_week_volume').followups.some(f => f.id === 'ask_balance') && c.ask('ask_balance').followups.some(f => f.id === 'ask_week_volume'));
  const off = C.coach(inputOf(log, { mute: { volume: true } }));
  check('"Balance and volume" switched off: neither is offered', !off.topicsFor('train').some(t => t.id === 'ask_week_volume' || t.id === 'ask_balance'));
  check('an unreadable log: nothing', C.coach({ ...inputOf(log), log: 'unknown' }).ask('ask_week_volume').id === 'guard_log_unreadable');
  const live = C.coach({ ...inputOf(log), live: { active: true } }).live({ id: 'x', startedAt: NOW - 1e6, exercises: [nx('barbell-bench-press', 3)] }, { current: 0 });
  check('and the live read never says a word of it', !live || !/hard sets|lopsided|pushing|pulling/.test([live.text].concat(live.why).join(' ')));
}

/* ================= C. THE BUILDER: HIS FOCUS FIRST ================= */
section('C. the builder — the focus group’s exercises come first, and that is all that moves');
{
  // A recurring chest-back-arms day, done in this order: row, bench, curl, pec deck.
  const day = k => sess(3 + 4 * k, [nx('barbell-row', 3), nx('barbell-bench-press', 3), nx('barbell-curl', 3), nx('pec-deck', 3)]);
  const log = Array.from({ length: 10 }, (_, k) => day(k));
  const plain = C.coach(inputOf(log)).build({});
  const focused = C.coach(inputOf(log, { aim: 'muscle', focus: 'chest' })).build({});
  const order = p => (p ? p.exercises.map(e => e.exId) : null);
  check('Bu1: no focus — the session’s own order: row, bench, curl, pec deck',
        J(order(plain)) === J(['barbell-row', 'barbell-bench-press', 'barbell-curl', 'pec-deck']), J(order(plain)));
  check('Bu2: focus chest — bench and pec deck first, then row and curl, each side in the order he did them, and nothing added or dropped',
        J(order(focused)) === J(['barbell-bench-press', 'pec-deck', 'barbell-row', 'barbell-curl']), J(order(focused)));
  check('and the proposal says so: "Your focus, chest, comes first."', focused && focused.reason.includes('Your focus, chest, comes first.'),
        focused && J(focused.reason));
  check('and every set is as it was — only the order moved',
        J(focused.exercises.map(e => [e.exId, e.sets]).sort()) === J(plain.exercises.map(e => [e.exId, e.sets]).sort()));
  const blocked = log.map(s => ({ ...s, exercises: s.exercises.map((e, i) => ({ ...e, block: i < 2 ? 1 : 2 })) }));
  const inBlocks = C.coach(inputOf(blocked, { aim: 'muscle', focus: 'chest' })).build({});
  check('Bu3: a session with lifting blocks keeps his order whole — a block is never split to move one exercise',
        J(order(inBlocks)) === J(['barbell-row', 'barbell-bench-press', 'barbell-curl', 'pec-deck']) && !inBlocks.reason.includes('Your focus, chest, comes first.'),
        J(order(inBlocks)));
  const legs = C.coach(inputOf(log, { aim: 'muscle', focus: 'legs' })).build({});
  check('Bu4: a focus with nothing in the proposal moves nothing and says nothing', J(order(legs)) === J(order(plain)) && J(legs.reason) === J(plain.reason));
}

/* ================= D. PROPERTIES ================= */
section('D. properties — deterministic, order-blind, a count never negative, core never flagged, one line per group');
{
  let seed = 11;
  const rnd = k => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % k; };
  const POOL = ['barbell-bench-press', 'pec-deck', 'barbell-row', 'lat-pulldown', 'back-squat-high-bar', 'romanian-deadlift', 'barbell-curl',
                'dumbbell-lateral-raise', 'overhead-press', 'hip-thrust', 'walking-lunge', 'plank', 'triceps-pushdown-rope', 'custom-my-press-a1b2c', 'treadmill-run'];
  const AIMS = [null, 'strength', 'powerlifting', 'muscle', 'cut', 'recomp', 'maintain'];
  const FOCI = [null, 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
  const bad = { det: [], order: [], neg: [], core: [], lines: [] };
  let n = 0, flags = {};
  for (let h = 0; h < 300; h++) {
    const weeks = 2 + rnd(12);
    const log = [];
    for (let k = 0; k < weeks; k++) {
      const per = 1 + rnd(3);
      for (let s = 0; s < per; s++) {
        const exs = [];
        for (let e = 0; e < 1 + rnd(5); e++) {
          const id = POOL[rnd(POOL.length)];
          const sets = Array.from({ length: 1 + rnd(5) }, () => S(rnd(4) === 0 ? 45 : 135, 3 + rnd(10), ['N', 'N', 'N', 'F', 'W', 'D'][rnd(6)]));
          exs.push(ex(id, sets));
        }
        log.push(sess(7 * k + rnd(7), exs));
      }
    }
    const o = { aim: AIMS[rnd(AIMS.length)], focus: FOCI[rnd(FOCI.length)], aimAt: NOW - rnd(60) * DAY };
    const r = vol(log, o), r2 = vol(JSON.parse(J(log)), o);
    const shuffled = log.slice().sort((a, b) => (a.startedAt * 7 % 13) - (b.startedAt * 7 % 13));
    n++;
    if (J(r) !== J(r2)) bad.det.push('history ' + h);
    if (J(r) !== J(vol(shuffled, o)) || J(bal(log, o)) !== J(bal(shuffled, o))) bad.order.push('history ' + h);
    if (r && r.state === 'read') {
      r.groups.forEach(g => { flags[g.flag] = (flags[g.flag] || 0) + 1; if (g.sets < 0 || g.last < 0) bad.neg.push('history ' + h + ' ' + g.group); });
      if (r.groups.find(g => g.group === 'core').flag !== null) bad.core.push('history ' + h);
      const a = V.volumeAnswer(r);
      if (a.more.length + 1 - (r.neglect ? 1 : 0) !== 6) bad.lines.push('history ' + h + ': ' + (a.more.length + 1));
      ['lb', 'kg'].forEach(u => hear(a, u));
    }
    ['lb', 'kg'].forEach(u => hear(V.balanceAnswer(bal(log, o)), u));
  }
  check('the same history twice is the same read (' + n + ' histories)', !bad.det.length, list(bad.det));
  check('shuffling the sessions changes nothing, in either answer', !bad.order.length, list(bad.order));
  check('no count below zero', !bad.neg.length, list(bad.neg));
  check('core carries no flag, ever', !bad.core.length, list(bad.core));
  check('one line per group — six — and the neglect line only when there is one', !bad.lines.length, list(bad.lines));
  check('and the sweep reached every flag (' + J(flags) + ')', ['little', 'right', 'more', 'null'].every(k => flags[k] > 0));
}

/* ================= E. THE MUST-NEVER-SAY SCAN ================= */
section('E. every sentence, source and said, in pounds and kilos — counts only, never a reason about the body');
{
  const BAN = [/\bhealth(y)?\b/i, /\bposture\b/i, /\binjur/i, /\bpain\b/i, /\bhurt/i, /\bjoint/i, /\bimbalance[sd]? (cause|lead)/i, /\bweak (point|spot)s?\b/i,
               /\b(risk|safe|safety|protect|prevent)\b/i, /\bshoulder health\b/i, /\bdoctor|physio|diagnos/i,
               /\bbecause\b/i, /\bcaused?\b/i, /\bdue to\b/i, /\bthat'?s why\b/i, /\bleads? to\b/i, /\bmakes? you\b/i,
               /\beat(ing)?\b/i, /\bfood\b/i, /\bcalorie/i, /\bprotein\b/i, /\bAI\b/, /!/, /\bshould\b/i, /\btry\b/i, /\bmust\b/i,
               /\bhasn[’']t\b/i, /\bhaven[’']t\b/i, /\bdidn[’']t\b/i, /\bstill\b/i, /\bonly\b/i, /\bfailed\b/i, /\bthis week\b/i, /\blast week\b/i];
  const hits = t => BAN.filter(re => re.test(t)).map(re => (t.match(re) || [''])[0]);
  const decomment = s => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const lits = [...decomment(src('coach-volume.js')).matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1]).filter(t => /[a-z]{3}/i.test(t) && /\s/.test(t));
  const srcBad = lits.map(t => ({ t, w: hits(t) })).filter(x => x.w.length);
  check('every literal in coach-volume.js (' + lits.length + ') — none carries a health, posture or injury word, a cause, food, "AI", "!", or a calendar word on a rolling window',
        lits.length >= 25 && !srcBad.length, list(srcBad.map(x => '“' + x.w.join('/') + '” in: ' + x.t)));
  const kg = said.filter(x => x.u === 'kg').length;
  const bad = said.map(x => ({ ...x, w: hits(x.t).concat(x.u === 'kg' && /\d ?lb\b/.test(x.t) ? ['lb on a kilo account'] : []) })).filter(x => x.w.length);
  check('and every sentence said across the battery and the sweep (' + said.length + ', ' + kg + ' of them on a kilo account) — the same',
        said.length > 2000 && kg > 800 && !bad.length, list(bad.map(x => '[' + x.u + '] “' + x.w.join('/') + '” in: ' + x.t)));
  check('no sentence names a weight at all — a volume answer is sets, never pounds or kilos',
        !said.some(x => /\d\s*(lb|kg)\b/.test(x.t)), list(said.filter(x => /\d\s*(lb|kg)\b/.test(x.t)).map(x => x.t)));
}

console.log('\nthe whole week, counted — and never a word about the body\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
