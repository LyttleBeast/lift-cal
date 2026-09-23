#!/usr/bin/env node
//
// Verifier for the weekly-rate band: past it, nothing calls a pace anything.
//
//   node tools-check/rate-band.mjs
//
// THE BUG IT CLOSES (BACKLOG, v42). insights.js `rateVerdict()` returned 'good'
// for ANY rate in the goal's direction, unbounded, while LIMITS.rateWk allows
// five pounds a week — so an account losing very fast got a green number on
// Weight and an approving line on You. Coach had already solved it for itself:
// it bands the magnitude at RATE_BAND_LB and, past the band, reports the figure
// and declines to call it anything, whichever way it points.
//
// THE FIX: the same band inside rateVerdict — past 1.5 lb a week it returns
// null, the "say nothing" answer, in the goal's direction and against it — and
// every place on either tab that calls a weekly rate good asks rateVerdict:
//
//   Weight  the rate under the headline stats           (colour)
//   You     the Weight tile's week-on-week pill          (colour)
//   You     the Weight card's /week and 30-day arrows    (colour)
//   You     the Goal card's dot and progress bar         (colour)
//   You     "Doing well: Losing N a week" (pace-good)    (words — the approval)
//   You     the Goal card's "…, the right way."          (words — the approval)
//
// What stays: inside the band every answer is v46's exactly (sections A, D, E
// prove it against the old code, kept verbatim below); the "wrong way" line on
// Could improve and the "faster than planned" note are not approvals and are
// untouched, as is the copy the brief put out of scope (the note's "more of it
// is muscle", the weekly-review takeaways).
//
// Every section drives the real functions; D, D2 and E lift the closures out
// of you.js by text. LEGACY_* is the v46 code, verbatim, for contrast only.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const SRC  = p => join(HERE, '..', p);
const read = p => readFileSync(SRC(p), 'utf8');

/* ---------- staging: record-groups.mjs's rig ---------- */
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 };
globalThis.window = { addEventListener() {} };
globalThis.document = { body: null, getElementById: () => null, createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), addEventListener() {} };
try { Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true, writable: true }); } catch {}
const REAL = ['store.js', 'ui.js', 'units.js', 'exercises.js', 'blocks.js', 'analytics.js', 'insights.js'];
// Only real import/export statements: insights.js has "up from '" in its copy.
const IMPORT_RE = /^(\s*(?:import|export)\b[^;]*?\bfrom\s+)(['"])([^'"]+)\2/gm;
const NAMED_RE  = /\bimport\s*\{([^}]*)\}\s*from\s+(['"])([^'"]+)\2/g;
const sources = new Map(REAL.map(f => [f, read(f)]));
const stubbed = new Set();
for (const text of sources.values()) {
  let m; NAMED_RE.lastIndex = 0;
  while ((m = NAMED_RE.exec(text))) {
    const base = m[3].startsWith('./') ? m[3].slice(2) : null;
    if (base && REAL.includes(base)) continue;
    for (const raw of m[1].split(',')) { const name = raw.trim().split(/\s+as\s+/)[0].trim(); if (name) stubbed.add(name); }
  }
}
const dir0 = mkdtempSync(join(tmpdir(), 'rack-band-'));
writeFileSync(join(dir0, 'stub.mjs'), Array.from(stubbed).map(n => `export function ${n}() {}`).join('\n') + '\n');
for (const [file, text] of sources) {
  writeFileSync(join(dir0, file.replace(/\.js$/, '.mjs')), text.replace(IMPORT_RE, (whole, head, q, spec) => {
    const base = spec.startsWith('./') ? spec.slice(2) : null;
    return head + (base && REAL.includes(base) ? `'./${base.replace(/\.js$/, '.mjs')}'` : `'./stub.mjs'`);
  }));
}
const I = await import(pathToFileURL(join(dir0, 'insights.mjs')).href);
const { rateVerdict, RATE_BAND_LB, HOLD_RATE_LB, assess, trajectory, keysBack } = I;

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);

// v46, verbatim.
const LEGACY_rateVerdict = (rateWk, dir) => {
  if (dir == null || rateWk == null || !Number.isFinite(rateWk)) return null;
  if (dir === 0) return Math.abs(rateWk) <= 0.5 ? 'good' : 'warn';
  return (dir < 0 ? rateWk <= 0 : rateWk >= 0) ? 'good' : 'warn';
};
const LEGACY_higherBetter = (n, p) => n > p ? 'up' : n < p ? 'down' : 'flat';
const LEGACY_towardGoal = dir => (n, p) => {
  if (dir == null) return 'flat';
  if (dir === 0) return Math.abs(n - p) <= 0.5 ? 'up' : 'flat';
  return dir < 0 ? LEGACY_higherBetter(p, n) : LEGACY_higherBetter(n, p);
};
const LEGACY_judge = dir => v => (dir == null) ? 'flat'
  : dir === 0 ? (Math.abs(v) <= 0.5 ? 'up' : 'warn')
  : dir < 0   ? (v <= 0 ? 'up' : 'warn')
  :             (v >= 0 ? 'up' : 'warn');
const LEGACY_dot = t => (t.status === 'on' || t.status === 'ahead' ? 'good' : t.status === 'wrong' || t.status === 'drift' ? 'bad' : t.status ? 'warn' : '');

const DIRS = [[-1, 'cut'], [0, 'hold'], [1, 'bulk']];
// -5..5 in tenths, the whole range LIMITS.rateWk allows.
const SWEEP = Array.from({ length: 101 }, (_, i) => Math.round((i - 50) / 10 * 10) / 10);

/* ================= A. THE VERDICT ================= */
section('A. rateVerdict — in the band, v46\'s answer; past it, the figure alone, either way');
{
  check('the band is 1.5 lb a week, and hold\'s own band is still 0.5', RATE_BAND_LB === 1.5 && HOLD_RATE_LB === 0.5);
  const cases = [
    [-1.0, -1, 'good'], [-1.5, -1, 'good'], [-1.6, -1, null], [-3.0, -1, null], [-5.0, -1, null],
    [0.5, -1, 'warn'], [1.5, -1, 'warn'], [2.0, -1, null], [0, -1, 'good'],
    [1.0, 1, 'good'], [1.5, 1, 'good'], [1.6, 1, null], [4.0, 1, null], [-1.0, 1, 'warn'], [-2.0, 1, null],
    [0.3, 0, 'good'], [-0.5, 0, 'good'], [0.8, 0, 'warn'], [-1.5, 0, 'warn'], [1.6, 0, null], [-3.0, 0, null],
    [-3.0, null, null], [null, -1, null], [NaN, -1, null], [Infinity, 1, null]
  ];
  cases.forEach(([r, d, want]) => {
    const got = rateVerdict(r, d);
    check(`${String(r).padStart(4)} lb/wk on a ${d == null ? 'goal nobody stated' : DIRS.find(x => x[0] === d)[1]}: ${J(want)}` +
          (J(LEGACY_rateVerdict(r, d)) !== J(want) ? `   (v46: ${J(LEGACY_rateVerdict(r, d))})` : ''), got === want, J(got));
  });
  let same = 0, moved = 0, bad = [];
  for (const [d] of DIRS) for (const r of SWEEP) {
    const now = rateVerdict(r, d), was = LEGACY_rateVerdict(r, d);
    if (Math.abs(r) <= RATE_BAND_LB) { if (now === was) same++; else bad.push(r + '@' + d); }
    else { if (now === null) moved++; else bad.push(r + '@' + d); }
  }
  check(`over −5…+5 in tenths, every goal: ${same} in-band answers are v46's exactly, and all ${moved} past the band are null`, bad.length === 0, bad.join(' '));
  check('"not good" past the band in the goal\'s direction AND against it', [-2, -3, 2, 3].every(r => DIRS.every(([d]) => rateVerdict(r, d) !== 'good')));
}

/* ================= B. COACH'S BAND ================= */
section('B. it is Coach\'s band — the same number, and inside it the same agreement');
{
  const coach = read('coach.js');
  const m = /^const RATE_BAND_LB = ([\d.]+);$/m.exec(coach);
  check('coach.js RATE_BAND_LB equals insights.js RATE_BAND_LB', !!m && +m[1] === RATE_BAND_LB, m && m[1]);
  check('and Coach still tests it the same way: past means |r| > the band', /if \(Math\.abs\(r\) > RATE_BAND_LB\) \{/.test(coach));
  const ag = /const agrees = (dir === 0 \? Math\.abs\(r\) <= 0\.5 : dir < 0 \? r <= 0 : r >= 0);/.exec(coach);
  check('Coach\'s in-band agreement is where this file expects it', !!ag);
  if (ag) {
    const agrees = new Function('r', 'dir', 'return (' + ag[1] + ');');
    const off = [];
    for (const [d] of DIRS) for (const r of SWEEP) if (Math.abs(r) <= RATE_BAND_LB && agrees(r, d) !== (rateVerdict(r, d) === 'good')) off.push(r + '@' + d);
    check('and over every in-band rate and goal, rateVerdict says good exactly where Coach says it agrees', off.length === 0, off.join(' '));
  }
}

/* ================= C. THE WEIGHT TAB ================= */
section('C. Weight — the rate under the headline stats is coloured by rateVerdict alone');
{
  const w = read('weight.js');
  check('weight.js asks rateVerdict(rate, dir) for it', /const verdict = rateVerdict\(rate, dir\);/.test(w));
  check('and maps good → green, warn → amber, null → no colour',
        /verdict === 'good' \? 'var\(--good\)' : verdict === 'warn' \? 'var\(--warn\)' : null/.test(w));
  const colour = v => (v === 'good' ? 'green' : v === 'warn' ? 'amber' : 'none');
  const row = (r, d) => colour(rateVerdict(r, d)) + (colour(LEGACY_rateVerdict(r, d)) !== colour(rateVerdict(r, d)) ? ' (was ' + colour(LEGACY_rateVerdict(r, d)) + ')' : '');
  check('cut: −1.0 ' + row(-1, -1) + ' · −2.0 ' + row(-2, -1) + ' · +1.0 ' + row(1, -1) + ' · +2.0 ' + row(2, -1),
        row(-1, -1) === 'green' && row(-2, -1) === 'none (was green)' && row(1, -1) === 'amber' && row(2, -1) === 'none (was amber)');
  check('bulk: +1.0 ' + row(1, 1) + ' · +2.0 ' + row(2, 1) + ' · −2.0 ' + row(-2, 1),
        row(1, 1) === 'green' && row(2, 1) === 'none (was green)' && row(-2, 1) === 'none (was amber)');
  check('hold: 0.4 ' + row(0.4, 0) + ' · 1.0 ' + row(1, 0) + ' · 2.0 ' + row(2, 0),
        row(0.4, 0) === 'green' && row(1, 0) === 'amber' && row(2, 0) === 'none (was amber)');
}

/* ================= D. THE YOU TAB'S WEIGHT TILE ================= */
section('D. You — the Weight tile\'s pill, week on week, goes through rateVerdict too');
{
  const you = read('you.js');
  const m = /  const towardGoal = \(n, p\) => \{\n[\s\S]*?\n  \};\n/.exec(you);
  check('towardGoal is where this file expects it in you.js', !!m);
  // Not found (a v46 you.js, say): the old judge in its place, so every
  // check below fails with a reason instead of the file throwing.
  // higherBetter and HOLD_RATE_LB are handed in too, so a towardGoal that went
  // back to its own copy of the rule runs — and fails on its answers.
  const make = dir => (m ? new Function('rateVerdict', 'dir', 'higherBetter', 'HOLD_RATE_LB', m[0] + '\nreturn towardGoal;')(rateVerdict, dir, LEGACY_higherBetter, HOLD_RATE_LB)
                         : LEGACY_towardGoal(dir));
  check('and it asks rateVerdict, with no second copy of the rule', m && /rateVerdict\(n - p, dir\)/.test(m[0]) && !/HOLD_RATE_LB|higherBetter/.test(m[0]));
  const bad = [];
  for (const [d] of [[-1], [0], [1], [null]]) {
    const now = make(d), was = LEGACY_towardGoal(d);
    for (const p of [180, 200.4]) for (const r of SWEEP) {
      const n = Math.round((p + r) * 10) / 10;
      const inBand = Math.abs(n - p) <= RATE_BAND_LB + 1e-9;
      const want = inBand ? was(n, p) : 'flat';
      if (now(n, p) !== want) bad.push(`${p}→${n}@${d}: ${now(n, p)} want ${want}`);
    }
  }
  check('every week-on-week change and goal: v46\'s pill inside the band, grey past it', bad.length === 0, bad.slice(0, 4).join(' | '));
  const t = make(-1);
  check('cut, down 1.0: green (up) · down 2.4: grey — it was green · up 2.4: grey — it was red',
        t(199, 200) === 'up' && t(197.6, 200) === 'flat' && LEGACY_towardGoal(-1)(197.6, 200) === 'up' &&
        t(202.4, 200) === 'flat' && LEGACY_towardGoal(-1)(202.4, 200) === 'down');
  check('and no change at all is still grey, not green', t(200, 200) === 'flat');
  check('hold is untouched: within 0.5 green, beyond it grey, as it always was', make(0)(200.4, 200) === 'up' && make(0)(201, 200) === 'flat' && make(0)(203, 200) === 'flat');
}

/* ================= D2. THE YOU TAB'S WEIGHT CARD ================= */
section('D2. You — the Weight card\'s /week arrow asks rateVerdict; its 30-day arrow is banded too');
{
  const you = read('you.js');
  const jr = /  const judgeRate = r => \{[^\n]*\};\n/.exec(you);
  const j3 = /  const judge30 = v => [\s\S]*?;\n(?=\n)/.exec(you);
  check('judgeRate and judge30 are where this file expects them in you.js', !!jr && !!j3);
  // Not found: v46's shared judge in their place, so the checks fail on answers.
  const make = dir => (jr && j3 ? new Function('rateVerdict', 'dir', jr[0] + j3[0] + '\nreturn { judgeRate, judge30 };')(rateVerdict, dir)
                                : { judgeRate: LEGACY_judge(dir), judge30: LEGACY_judge(dir) });
  check('the arrows use them, and v46\'s shared judge is gone',
        /arrowEl\(rate, judgeRate\(rate\)/.test(you) && /arrowEl\(s\.change30, judge30\(s\.change30\)/.test(you) && !/\bjudge\((rate|s\.change30)\)/.test(you));
  const bad = [];
  for (const [d] of [[-1], [0], [1], [null]]) {
    const { judgeRate, judge30 } = make(d), was = LEGACY_judge(d);
    for (const r of SWEEP) {
      const wantR = Math.abs(r) <= RATE_BAND_LB ? was(r) : 'flat';
      if (judgeRate(r) !== wantR) bad.push('rate ' + r + '@' + d + ': ' + judgeRate(r) + ' want ' + wantR);
      const c30 = Math.round(r * 30 / 7 * 10) / 10;           // the same pace, as a 30-day change
      const want3 = Math.abs(c30 * 7 / 30) <= RATE_BAND_LB ? was(c30) : 'flat';
      if (judge30(c30) !== want3) bad.push('30d ' + c30 + '@' + d + ': ' + judge30(c30) + ' want ' + want3);
    }
  }
  check('/week arrow: v46\'s answer inside the band, grey past it — every rate and goal', !bad.some(b => b.startsWith('rate')), bad.filter(b => b.startsWith('rate')).slice(0, 3).join(' | '));
  check('30-day arrow: v46\'s answer while the month\'s pace is inside the band, grey past it', !bad.some(b => b.startsWith('30d')), bad.filter(b => b.startsWith('30d')).slice(0, 3).join(' | '));
  const cut = make(-1);
  check('cut: −3.0 a week was a green arrow and is grey; −1.0 is still green; +1.0 still amber',
        cut.judgeRate(-3) === 'flat' && LEGACY_judge(-1)(-3) === 'up' && cut.judgeRate(-1) === 'up' && cut.judgeRate(1) === 'warn');
  check('cut: −12 lb in 30 days (2.8 a week) was green and is grey; −4 lb in 30 days is still green',
        cut.judge30(-12) === 'flat' && LEGACY_judge(-1)(-12) === 'up' && cut.judge30(-4) === 'up');
  check('hold: the 30-day arrow keeps half a pound over the month, as it always had', make(0).judge30(0.4) === 'up' && make(0).judge30(1.0) === 'warn');
}

/* ================= E. THE GOAL CARD ================= */
section('E. You — the Goal card\'s dot and bar take no colour past the band');
{
  const you = read('you.js');
  const cl = /  const called = (!\(t\.enough && t\.rate != null && rateVerdict\(t\.rate, t\.dir\) == null\));\n/.exec(you);
  const dl = /  const dot = el\('i', 'traj-dot ' \+ \((!called \? '' : [^;]*)\)\);\n/.exec(you);
  check('the dot and its `called` gate are where this file expects them', !!cl && !!dl);
  const dot = t => new Function('t', 'rateVerdict', 'const called = ' + (cl ? cl[1] : 'true') + '; return (' + (dl ? dl[1] : "''") + ');')(t, rateVerdict);
  const T = (rate, dir, status) => ({ enough: true, rate, dir, status });
  const rows = [T(-1, -1, 'on'), T(-1, -1, 'ahead'), T(-0.4, -1, 'behind'), T(1, -1, 'wrong'), T(0.4, 0, 'drift'), T(0.05, -1, 'flat'),
                T(-3, -1, 'ahead'), T(-2, -1, 'on'), T(2, -1, 'wrong'), T(3, 1, 'on'), T(-2, 1, 'wrong'), T(2, 0, 'drift'), { enough: false, status: null }];
  const bad = rows.filter(t => {
    const past = t.enough && Math.abs(t.rate) > RATE_BAND_LB;
    return dot(t) !== (past ? '' : LEGACY_dot(t));
  });
  check('in the band every dot is v46\'s; past it every dot is plain grey — ahead, on, wrong and drift alike', bad.length === 0, J(bad));
  check('so a 3 lb/wk cut "ahead of plan" is grey, where it was green', dot(T(-3, -1, 'ahead')) === '' && LEGACY_dot(T(-3, -1, 'ahead')) === 'good');
  check('the bar\'s amber fill asks the same gate', /fill\.style\.background = called && \(t\.status === 'wrong' \|\| t\.status === 'drift'\) \? 'var\(--warn\)' : C_WEIGHT;/.test(you));
}

/* ================= F. THE WORDS ================= */
section('F. "Doing well" and the Goal card\'s reason — no approval past the band, nothing else moved');
{
  // A fortnight of daily weigh-ins, so the weight finding's four-weigh-in gate
  // is met, and a plan on targets.auto when asked for.
  const keys = keysBack(14, 0);
  const wmap = Object.fromEntries(keys.map(k => [k, 200]));
  const ctx = (dirV, rateWk, planned) => ({
    dir: dirV, rate: { rateWk, model: true }, tw: 200, wmap, summaries: {}, sessions: [],
    targets: { cal: 2200, p: 180, f: 70, goalLb: 180, ...(planned != null ? { auto: { on: true, rateWk: planned } } : {}) },
    stepDays: {}, days: keys.map(d => ({ d, lb: 200 })), u: 'lb'
  });
  const ids = c => { const a = assess(c); return { wins: a.wins.map(f => f.id), improve: a.improve.map(f => f.id), insights: a.insights.map(f => f.id), a }; };
  const cut1 = ids(ctx(-1, -1.0, -1.0)), cut3 = ids(ctx(-1, -3.0, -1.0)), bulk1 = ids(ctx(1, 1.0, null)), bulk2 = ids(ctx(1, 2.0, null));
  check('cut, losing 1.0 a week: "Losing 1 lb a week" is under Doing well, as before', cut1.wins.includes('pace-good'), J(cut1.wins));
  check('cut, losing 3.0 a week: it is not — Rack does not call that pace doing well', !cut3.wins.includes('pace-good'), J(cut3.wins));
  check('and the "faster than planned" note still says what it says (copy out of scope, untouched)',
        cut3.insights.includes('pace-fast') && /more of it is muscle/.test((cut3.a.insights.find(f => f.id === 'pace-fast') || {}).detail || ''));
  check('bulk: +1.0 is a win, +2.0 is not', bulk1.wins.includes('pace-good') && !bulk2.wins.includes('pace-good'));
  const wrong = ids(ctx(-1, 2.0, -1.0));
  check('cut, GAINING 2.0 a week: "Could improve" still names it — a warning approves nothing, and is not gated',
        wrong.improve.includes('pace-wrong'), J(wrong.improve));
  const hold = ids(ctx(0, 0.2, null));
  check('hold within 0.3: "Weight holding steady" is still a win', hold.wins.includes('pace-good'));

  const tr = (rate, planned) => trajectory(ctx(-1, rate, planned), rate, planned, 200);
  check('Goal card, cut, no plan, −1.0: "1 lb a week, the right way."', tr(-1.0, null).reason === '1 lb a week, the right way.', tr(-1.0, null).reason);
  check('Goal card, cut, no plan, −3.0: "3 lb a week." — the figure, no approval', tr(-3.0, null).reason === '3 lb a week.', tr(-3.0, null).reason);
  check('its status and finish date are unchanged — a pace is still a pace', tr(-3.0, null).status === 'on' && tr(-3.0, null).weeks > 0);
  check('"Ahead of plan: 3 lb a week against 1 planned." is a comparison, not an approval, and stays',
        tr(-3.0, -1.0).reason === 'Ahead of plan: 3 lb a week against 1 planned.', tr(-3.0, -1.0).reason);
  check('the review takeaways are not touched (insights.js weeklyReview is not in this change)',
        /Get protein to/.test(read('insights.js')) && /Bring the daily average back under/.test(read('insights.js')));
}

/* ---------- report ---------- */
console.log('\na rate too fast is not "good"\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
