#!/usr/bin/env node
//
// Verifier for Patterns in your data — the eleven pre-registered comparisons
// (eight until v53; the last three are Micah's decision of 24 Sep 2026).
//
//   node tools-check/coach-patterns.mjs
//
// Patterns is the one part of Coach that compares two groups of his own days,
// and every way it could go wrong is a way of finding something that is not
// there. So this file fences, in order:
//
//   A  ELEVEN, AND ONLY ELEVEN. The checks are pre-registered: a fixed list of
//      facts, in the briefs' order, answered by one sheet-only intent. A
//      twelfth would be an open search growing one line at a time.
//   B  OFF UNTIL SWITCHED ON. Absent means off — the reverse of every other
//      category — and off means no bubble, no answer, no card, no read.
//   C  THE NUMBERS ARE RIGHT. A twenty-six-week log built so all eight clear,
//      and every number each sentence prints — both medians or both shares,
//      both sample sizes — recomputed here by a second, independent reading of
//      the brief's definitions. Never by asking the engine what it thinks.
//   D  EIGHT ON EACH SIDE, OR NOTHING. Each gate at its boundary, and each
//      check silent when its own data is missing.
//   E  DESCRIPTIVE, NEVER CAUSAL, in both units — and every weight converted.
//   F  WHERE IT MAY APPEAR: the sheet's general set, when on and clearing;
//      never a card, never the lead question, never Train's own set.
//   G  coach-data.js reads the extra food days only for an account with
//      Patterns on, and only the days the pure layer asks for.
//   I  v53's three — his energy rating beside his food — each true, false and
//      thin, every number against a second reading, the real-time rule, and
//      the rated days the read adds, forty at most.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-patterns-'));
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
/* coach-goal.js and coach-prog.js — v48's targets — are staged the same way:
   coach-build.js imports coach-prog.js, which takes the same session math
   through the stub, and coach-goal.js imports nothing at all. */
writeFileSync(join(dir, 'coach-prog.mjs'), src('coach-prog.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
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
/* coach-overlap.js — v49's stage two, the plateau-or-cut call — is staged the
   same way: coach.js imports it, and it reads coach-prog.js's baselines and
   the same session math through the stub. */
writeFileSync(join(dir, 'coach-overlap.mjs'), src('coach-overlap.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
// v52: coach-fuel.js, staged the same way (the staging edit the brief allows everywhere).
writeFileSync(join(dir, 'coach-fuel.mjs'), src('coach-fuel.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
// v52: coach-ready.js, staged the same way (the staging edit the brief allows everywhere).
writeFileSync(join(dir, 'coach-ready.mjs'), src('coach-ready.js')
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href))
  .replace("from './coach-overlap.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-overlap.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href)));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + at('coach-build.mjs'))
  .replace("from './coach-live.js'", 'from ' + at('coach-live.mjs'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './coach-overlap.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-overlap.mjs')).href))
  .replace("from './coach-fuel.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-fuel.mjs')).href))
  .replace("from './coach-ready.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-ready.mjs')).href))
  .replace("from './coach-prog.js'", 'from ' + at('coach-prog.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const U = await import(pathToFileURL(join(ROOT, 'units.js')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const list = xs => xs.slice(0, 5).join('\n         ') + (xs.length > 5 ? '\n         … (' + xs.length + ')' : '');

/* ================= THE FIXTURE =================
   181 complete days back from a fixed epoch, every date and hour built in the
   LOCAL zone the engine reads them in, so this file answers the same under any
   TZ. Designed so every one of the eight clears, and so each one's two groups
   come out different where they can:

     sessions   days i % 7 of 1, 3 and 5 — but in every third week (counted in
                the same seven-day blocks back from yesterday that the weekly
                check uses) only the first, so there are busy weeks and quiet
                ones, and chest has gone five days or more before the quiet
                week's one session. Every session is bench, four sets of five,
                and a row. Sessions on i % 7 = 1 start at 7:00, the rest 17:00.
     bench      180 + (i % 4) × 10 lb, and 5 more in an evening session
     row sets   4 when i is even, 3 when odd — so the day after a protein
                target was reached (the day before was odd) holds more sets
     food       every day: 2,000 / 2,300 / 2,600 kcal by i % 3; protein 190 g on
                odd days and 150 on even, against a 170 g target. On a session
                day the first entry is at 6:00, or at 20:00 when i % 5 = 0
     steps      9,000-odd on a session day and 6,000-odd otherwise
     weight     a weigh-in at 6:30 every day, 180 + i × 0.05 lb */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const hourOn = (i, h, m = 0) => { const d = new Date(NOW - i * DAY); d.setHours(h, m, 0, 0); return d.getTime(); };
const PLIB = {
  bench: { name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell' },
  row:   { name: 'Barbell Row',         group: 'back',  equipment: 'barbell' }
};
const setsOf = (n, w, r) => Array.from({ length: n }, () => ({ w: String(w), r: String(r), type: 'N', done: true }));

function build(opts = {}) {
  const sessions = [], summaries = {}, stepDays = {}, foodFirst = {}, weighIns = [];
  for (let i = 1; i <= 181; i++) {
    const k = key(NOW - i * DAY);
    const quiet = Math.floor((i - 1) / 7) % 3 === 2;
    const trains = i % 7 === 1 || (!quiet && (i % 7 === 3 || i % 7 === 5)) || !!(opts.add && opts.add(i));
    summaries[k] = { cal: 2000 + (i % 3) * 300, p: i % 2 ? 190 : 150, c: 250, f: 70 };
    stepDays[k] = { steps: (trains ? 9000 : 6000) + (i % 3) * 100 };
    weighIns.push({ lb: 180 + i * 0.05, t: hourOn(i, 6, 30) });
    if (!trains || (opts.skip && opts.skip(i))) continue;
    const morning = i % 7 === 1;
    const t = hourOn(i, morning ? 7 : 17);
    sessions.push({ id: 'p' + i, startedAt: t, _date: k, exercises: [
      { exId: 'bench', ...PLIB.bench, sets: setsOf(4, 180 + (i % 4) * 10 + (morning ? 0 : 5), 5) },
      { exId: 'row', ...PLIB.row, sets: setsOf(i % 2 ? 3 : 4, 155, 8) }
    ] });
    foodFirst[k] = hourOn(i, i % 5 === 0 ? 20 : 6);
  }
  // Today, unfinished: half a day of food and steps, which every day-based
  // pattern has to leave out of both groups.
  summaries[key(NOW)] = { cal: 900, p: 60, c: 90, f: 30 };
  stepDays[key(NOW)] = { steps: 2100 };
  sessions.sort((a, b) => a.startedAt - b.startedAt);
  return { sessions, summaries, stepDays, foodFirst, weighIns };
}
/* One busy week rearranged — its session on day 10 moved to day 14 — so a
   four-day gap sits in the log (day 12 to day 8) and belongs to neither side
   of the rest-gap check, while the week keeps its three sessions and no other
   week changes. Without it, a check that let four days count on either side
   would pass. */
const SHIFT = { skip: i => i === 10, add: i => i === 14 };
const F = build(SHIFT);
const ON = { v: 1, mute: {}, on: { patterns: true }, answers: {}, asked: {} };
const input = (fx, extra) => ({
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable',
  sessions: fx.sessions, lib: PLIB, hidden: [], libReady: true, routines: [],
  live: { active: false }, tier: { pro: true },
  targets: { cal: 2300, p: 170, f: 70 }, targetsSet: true, summaries: fx.summaries,
  steps: { days: fx.stepDays }, weighIns: fx.weighIns, foodFirst: fx.foodFirst,
  weight: { latestLb: 180.05, latestAt: hourOn(1, 6, 30), rateWk: -0.35, rateDays: 28, goalDir: null, goalRateWk: null },
  settings: ON,
  ...extra
});
// Every pattern line the engine says, keyed by the fact it is about.
function linesOf(inp) {
  const a = C.coach(inp).ask('ask_patterns');
  if (a.id !== 'patterns_in_data') return { a, lines: [] };
  return { a, lines: [{ text: a.text, reason: a.reason }].concat(a.more || []) };
}
const nums = t => (String(t).match(/\d[\d,]*(\.\d+)?/g) || []).map(x => x.replace(/,/g, ''));

/* ================= THE SECOND READING =================
   The eight definitions, written again from the brief and nothing else, over
   the raw fixture. Where this and coach.js agree on every number, two readings
   of one sentence agree — which is the whole of what a verifier can prove. */
const e1 = (w, r) => (r === 1 ? Math.round(w) : Math.round(w * (1 + r / 30)));
const med = xs => { const v = xs.slice().sort((a, b) => a - b); const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const noonOf = k => new Date(k + 'T12:00:00').getTime();
const dayGap = (a, b) => Math.round((noonOf(key(b)) - noonOf(key(a))) / DAY);
function expected(fx) {
  const top = s => Math.max(...s.exercises[0].sets.map(x => e1(parseFloat(x.w), parseInt(x.r, 10))));
  const lift = fx.sessions.map(s => ({ s, t: top(s), date: s._date }));
  const days = Array.from({ length: 182 }, (_, j) => key(NOW - (j + 1) * DAY));
  const trained = new Set(fx.sessions.map(s => s._date));
  const prev = k => key(noonOf(k) - DAY);
  const out = {};
  // 1
  const known = lift.filter(x => Number.isFinite(fx.foodFirst[x.date]));
  const ranked = known.slice().sort((a, b) => b.t - a.t || b.s.startedAt - a.s.startedAt);
  const q = Math.floor(ranked.length / 4);
  const fed = xs => xs.filter(x => fx.foodFirst[x.date] < x.s.startedAt).length;
  const tq = ranked.slice(0, q), rest = ranked.slice(q);
  out['lift.fedBeforeTop'] = [fed(tq), tq.length, Math.round(fed(tq) / tq.length * 100),
                              fed(rest), rest.length, Math.round(fed(rest) / rest.length * 100)].map(String);
  // 2
  const hit = [], under = [];
  fx.sessions.forEach(s => { const y = fx.summaries[prev(s._date)]; if (!y) return;
    (y.p >= 170 ? hit : under).push(s.exercises.reduce((a, e) => a + e.sets.length, 0)); });
  out['session.setsAfterProtein'] = ['170', String(med(hit)), String(hit.length), String(med(under)), String(under.length)];
  // 3
  const cOn = [], cOff = [];
  days.forEach(k => { const x = fx.summaries[k]; if (x) (trained.has(k) ? cOn : cOff).push(x.cal); });
  out['fuel.trainingDayCalories'] = [med(cOn), cOn.length, med(cOff), cOff.length].map(String);
  // 4
  const byDay = {};
  fx.weighIns.forEach(w => (byDay[key(w.t)] = byDay[key(w.t)] || []).push(w.lb));
  const weeks = Array.from({ length: 26 }, (_, k) => {
    const ks = Array.from({ length: 7 }, (_, j) => key(NOW - (7 * k + 1 + j) * DAY));
    const lbs = ks.flatMap(x => byDay[x] || []);
    return { mean: lbs.length ? lbs.reduce((a, b) => a + b, 0) / lbs.length : null,
             n: fx.sessions.filter(s => ks.includes(s._date)).length };
  });
  const busy = [], calm = [];
  for (let k = 0; k + 1 < weeks.length; k++) {
    if (weeks[k].mean == null || weeks[k + 1].mean == null) continue;
    (weeks[k].n >= 3 ? busy : calm).push(weeks[k].mean - weeks[k + 1].mean);
  }
  out['weight.rateBySessions'] = ['3', U.fmtRate(Math.abs(med(busy)), 'lb'), String(busy.length),
                                  U.fmtRate(Math.abs(med(calm)), 'lb'), String(calm.length)];
  out.rateSigns = [Math.sign(med(busy)), Math.sign(med(calm))];
  // 5
  const am = lift.filter(x => new Date(x.s.startedAt).getHours() < 12).map(x => x.t);
  const pm = lift.filter(x => new Date(x.s.startedAt).getHours() >= 12).map(x => x.t);
  out['lift.morningTop'] = [U.fmtW(med(am), 'lb'), String(am.length), U.fmtW(med(pm), 'lb'), String(pm.length)];
  // 6
  const close = [], rested = [];
  lift.forEach((x, n) => { if (!n) return; const g = dayGap(lift[n - 1].s.startedAt, x.s.startedAt);
    if (g <= 3) close.push(x.t); else if (g >= 5) rested.push(x.t); });
  out['lift.restGapTop'] = ['3', U.fmtW(med(close), 'lb'), String(close.length), '5', U.fmtW(med(rested), 'lb'), String(rested.length)];
  // 7
  const sOn = [], sOff = [];
  days.forEach(k => { const x = fx.stepDays[k]; if (x) (trained.has(k) ? sOn : sOff).push(x.steps); });
  out['steps.trainingDays'] = [med(sOn), sOn.length, med(sOff), sOff.length].map(String);
  // 8
  const cals = days.map(k => fx.summaries[k]).filter(Boolean).map(x => x.cal);
  const mid = med(cals);
  const above = [], below = [];
  lift.forEach(x => { const y = fx.summaries[prev(x.date)]; if (!y) return;
    if (y.cal > mid) above.push(x.t); else if (y.cal < mid) below.push(x.t); });
  out['lift.caloriesBeforeTop'] = [String(mid), U.fmtW(med(above), 'lb'), String(above.length),
                                   U.fmtW(med(below), 'lb'), String(below.length)];
  return out;
}

/* ================= A. EIGHT, AND ONLY EIGHT ================= */
section('A. eleven pre-registered checks, and one intent that says them');
{
  /* v53, on purpose: eleven. v52 held Patterns at eight because a ninth is a
     decision, and Micah made it on 24 Sep 2026 — his energy after a workout
     beside how much he ate before it and how long before (SHIP-V53-PROMPT
     §6.4). The three are registered last, so the eight keep their order. */
  const IDS = ['lift.fedBeforeTop', 'session.setsAfterProtein', 'fuel.trainingDayCalories', 'weight.rateBySessions',
               'lift.morningTop', 'lift.restGapTop', 'steps.trainingDays', 'lift.caloriesBeforeTop',
               'feel.energyFedBefore', 'feel.energyKcalBefore', 'feel.energySinceFood'];
  check('exactly eleven, in the briefs’ order', J(C.PATTERN_FACTS) === J(IDS), J(C.PATTERN_FACTS));
  check('each one a registered fact', IDS.every(id => C.FACTS.some(f => f.id === id)));
  const it = C.INTENTS.filter(i => i.category === 'patterns');
  check('one intent answers for all of them, and it is the only one in the category',
        it.length === 1 && it[0].id === 'patterns_in_data' && J(it[0].factsNeeded) === J(IDS), J(it.map(i => i.id)));
  check('sheet-only — it can reach no card', J(it[0].surfaces) === J(['sheet']));
  check('a Pro finding, so a basic account is told it exists rather than shown it',
        it[0].tier === 'pro' && it[0].kind === 'finding' && C.PRO_ADDS.some(a => a.id === 'patterns'));
  const cat = C.CATEGORIES.find(c => c.id === 'patterns');
  check('its category is switchable, opt-in, and last — it moves no other category’s place in the ranking',
        !!cat && cat.mutable === true && cat.optIn === true && C.CATEGORY_IDS[C.CATEGORY_IDS.length - 1] === 'patterns');
  check('and no other category is opt-in', C.CATEGORIES.filter(c => c.optIn).length === 1);
  check('the constants are the brief’s: eight a side, twenty-six weeks',
        C.PATTERN_MIN === 8 && C.PATTERN_DAYS === 182);
}

/* ================= B. OFF UNTIL SWITCHED ON ================= */
section('B. absent means OFF — the reverse of every other category');
{
  check('a fresh account has Patterns off without a byte written', C.isMuted(C.normSettings(null), 'patterns') === true);
  check('and every other switch on', C.CATEGORIES.filter(c => c.mutable && !c.optIn)
        .every(c => C.isMuted(C.normSettings(null), c.id) === false));
  check('`on: { patterns: true }` switches it on', C.isMuted(C.normSettings(ON), 'patterns') === false &&
        C.normSettings(ON).on.patterns === true);
  check('only a real true survives the normaliser — "yes", 1 and a half-written node are off',
        [{ on: { patterns: 'yes' } }, { on: { patterns: 1 } }, { on: 'patterns' }, { on: null }]
          .every(v => C.isMuted(C.normSettings(v), 'patterns') === true));
  check('`on` carries nothing for a category that is not opt-in', !('fuel' in C.normSettings({ on: { fuel: true } }).on));
  check('and a mute written on Patterns means nothing — it is off by absence, not by mute',
        !('patterns' in C.normSettings({ mute: { patterns: true } }).mute));

  const off = C.coach(input(F, { settings: { v: 1, mute: {}, answers: {}, asked: {} } }));
  check('off, on a log where all eight would clear: no Patterns bubble', !off.topicsFor('you').some(t => t.id === 'ask_patterns'),
        J(off.topicsFor('you').map(t => t.id)));
  check('and asked directly, it does not answer', off.ask('ask_patterns').id !== 'patterns_in_data', off.ask('ask_patterns').text);
  check('and the pure layer asks coach-data for no food days', C.patternFoodDays(input(F, { settings: { v: 1 } })).length === 0);
  const on = C.coach(input(F));
  check('on, the bubble is there', on.topicsFor('you').some(t => t.id === 'ask_patterns'));
}

/* ================= C. THE NUMBERS ================= */
section('C. every number each sentence prints, against a second reading of the definitions');
const EXP = expected(F);
{
  const { lines } = linesOf(input(F));
  // v53: nothing on this fixture is rated, so the three energy patterns are
  // silent here and section I drives them on logs of their own.
  check('all eight shipped clear on the fixture, one line each, in order — and the three energy ones, with nothing rated, do not',
        lines.length === 8 && C.PATTERN_FACTS.slice(8).every(id => C.coach(input(F)).ask('ask_patterns').more.every(m => !/rated session/.test(m.text))),
        lines.length + ' lines');
  C.PATTERN_FACTS.slice(0, 8).forEach((id, n) => {
    const line = lines[n] || { text: '' };
    const got = nums(line.text);
    check(id + ': ' + EXP[id].join(' / '), J(got) === J(EXP[id]), line.text);
  });
  const rate = (lines[3] || {}).text || '';
  const words = (rate.match(/(?:weight|fewer:) (down|up|level)/g) || []).map(w => w.split(' ')[1]);
  const want = EXP.rateSigns.map(s => (s < 0 ? 'down' : s > 0 ? 'up' : 'level'));
  check('and the weekly rate names its direction in words, the way it went', J(words) === J(want), rate);
  // The fixture was built so the groups differ where they can: a check that
  // printed the same figure twice everywhere would pass the arithmetic above
  // on a split it never made.
  // The shifted week really did put a four-day gap in the log.
  const gaps = F.sessions.map((x, n) => (n ? dayGap(F.sessions[n - 1].startedAt, x.startedAt) : null));
  check('the fixture carries a four-day gap, which the rest-gap check must leave out of both sides',
        gaps.includes(4), J([...new Set(gaps)]));
  check('the fixture makes the two sides differ — the splits are really being made',
        EXP['session.setsAfterProtein'][1] !== EXP['session.setsAfterProtein'][3] &&
        EXP['lift.morningTop'][0] !== EXP['lift.morningTop'][2] &&
        EXP['steps.trainingDays'][0] !== EXP['steps.trainingDays'][2] &&
        EXP['lift.fedBeforeTop'][2] !== EXP['lift.fedBeforeTop'][5], J(EXP));
  check('every sentence carries both sample sizes, and every one has its own reason line',
        lines.every(l => nums(l.text).length >= 4 && typeof l.reason === 'string' && l.reason.length > 20));
}

/* ================= D. THE GATES ================= */
section('D. eight on each side or nothing, and each check silent without its own data');
{
  const without = (extra, fx = F) => linesOf(input(fx, extra)).lines.map(l => l.text);
  const has = (texts, re) => texts.some(t => re.test(t));
  check('no food-log times read yet: the first pattern is silent, the other seven speak',
        (() => { const t = without({ foodFirst: {} }); return t.length === 7 && !has(t, /food was logged before/); })());
  check('no weigh-ins: the weekly rate is silent', !has(without({ weighIns: [] }), /Weeks with/));
  check('no protein target: the protein pattern is silent', !has(without({ targets: null, targetsSet: false }), /protein target/));
  check('no steps: the steps pattern is silent', !has(without({ steps: { days: {} } }), /^Steps/));

  /* The boundary itself, twice. The fixture holds two checks at exactly eight
     on one side — the rest gap's rested sessions and the weekly rate's
     quieter weeks — and each is taken to seven by a change that touches
     nothing else.

     Rest gap: one more session four days before the oldest quiet week's one.
     It lands three days after the busy week before it (close), and leaves the
     quiet week's session four days after it — which belongs to neither side.
     The week holds two sessions, so it is still a quiet week. */
  const restedNow = Number(EXP['lift.restGapTop'][5]);
  check('the fixture holds the rested side at exactly eight', restedNow === 8, String(restedNow));
  const gapped = build({ ...SHIFT, add: i => SHIFT.add(i) || i === 7 * 23 + 5 });
  const eg = expected(gapped);
  check('one rested session made a four-day gap: seven — and the rest-gap pattern says nothing',
        Number(eg['lift.restGapTop'][5]) === 7 && !has(without({}, gapped), /last trained/),
        'rested ' + eg['lift.restGapTop'][5]);
  check('while the seven it does not touch still speak', without({}, gapped).length === 7, without({}, gapped).length + ' lines');

  // Weekly rate: the weigh-ins of one quiet week gone take its own rate and
  // the busy week after it with them — seven quiet weeks, sixteen busy.
  check('the fixture holds the quieter weeks at exactly eight', EXP['weight.rateBySessions'][4] === '8', EXP['weight.rateBySessions'][4]);
  const lost = { ...F, weighIns: F.weighIns.filter(w => { const d = Math.round((NOW - w.t) / DAY); return d < 15 || d > 21; }) };
  const el = expected(lost);
  check('one quiet week’s weigh-ins gone: seven — and the weekly rate says nothing',
        el['weight.rateBySessions'][4] === '7' && !has(without({}, lost), /^Weeks with/), 'quiet ' + el['weight.rateBySessions'][4]);
  check('and the other seven speak', without({}, lost).length === 7);

  // A new account with Patterns on: nothing clears, so there is no bubble and
  // the direct answer says so, with no number in it.
  const thin = build({ skip: i => i > 21 });
  const thinIn = input({ ...thin, summaries: Object.fromEntries(Object.entries(thin.summaries).slice(0, 20)) });
  const tc = C.coach(thinIn);
  check('three weeks of log with Patterns on: nothing clears, so no bubble',
        !tc.topicsFor('you').some(t => t.id === 'ask_patterns'), J(tc.topicsFor('you').map(t => t.id)));
  const ta = tc.ask('ask_patterns');
  check('and asked directly: "nothing to say", with no number in it',
        ta.id !== 'patterns_in_data' && /nothing/i.test(ta.text) && !/\d/.test(ta.text), ta.text);
}

/* ================= E. WORDS AND UNITS ================= */
section('E. two groups side by side, never a cause, never advice — in both units');
{
  const CAUSAL = [/\bbecause\b/i, /\bhelps?\b/i, /\bmakes?\b/i, /\bleads? to\b/i, /\bboosts?\b/i, /\bso you\b/i,
                  /\bcauses?\b/i, /\bdue to\b/i, /\bresults? in\b/i, /\bdrives?\b/i, /\bthanks to\b/i];
  const ADVICE = [/\bshould\b/i, /\btry\b/i, /\baim\b/i, /\beat (more|less)\b/i, /\bbetter\b/i, /\bworse\b/i,
                  /\bimprove/i, /\brecommend/i];
  const all = [];
  ['lb', 'kg'].forEach(u => linesOf(input(F, { u })).lines.forEach(l => all.push(u + ': ' + l.text, u + ': ' + l.reason)));
  const causal = all.filter(t => CAUSAL.some(re => re.test(t)));
  check('no causal word in any pattern line or reason (' + all.length + ' read)', all.length === 32 && !causal.length, list(causal));
  const advice = all.filter(t => ADVICE.some(re => re.test(t)));
  check('and no advice — no should, try, better or worse', !advice.length, list(advice));
  const becauses = C.PATTERN_FACTS.map(id => C.FACTS.find(f => f.id === id).because);
  check('nor in the `because` each fact carries', becauses.every(b => !CAUSAL.some(re => re.test(String(b)))));

  const lb = linesOf(input(F, { u: 'lb' })).lines, kg = linesOf(input(F, { u: 'kg' })).lines;
  const weighted = lb.map((l, n) => [l.text, (kg[n] || {}).text || '']).filter(([a]) => /\blb\b/.test(a));
  check('the four that print a weight are the four that should: rate, morning, rest gap, calories before',
        weighted.length === 4, weighted.map(([a]) => a.slice(0, 40)).join(' | '));
  check('each says kg on a metric account, never lb, and the figure moves with the word',
        weighted.every(([a, b]) => /\bkg\b/.test(b) && !/\blb\b/.test(b) && a.replace(/lb/g, '') !== b.replace(/kg/g, '')),
        list(weighted.map(([, b]) => b)));
  check('and the metric figure is one conversion of the pounds one',
        nums(kg[4].text)[0] === U.fmtW(Number(EXP['lift.morningTop'][0]), 'kg'), kg[4].text);
}

/* ================= F. WHERE IT MAY APPEAR ================= */
section('F. the sheet’s general set, when asked — never a card, never volunteered');
{
  const c = C.coach(input(F));
  check('never the You card', c.you.id !== 'patterns_in_data');
  check('never the Train card', c.train.id !== 'patterns_in_data');
  check('never the lead question on the card', !c.lead || c.lead.id !== 'ask_patterns');
  check('never among Train’s own questions', !c.topicsFor('train').some(t => t.id === 'ask_patterns') ||
        !C.TRAIN_TOPICS.length);
  check('the bubble is the last of the general set, after the three tab topics',
        c.topicsFor('you').slice(-1)[0].id === 'ask_patterns');
  const a = c.ask('ask_patterns');
  check('asked, it answers with every pattern and offers nothing to do next', a.followups.length === 0 && (a.more || []).length === 7);
}

/* ================= G. THE ONE READ IT ADDS ================= */
section('G. the food days are read only for an account that asked, and only the ones it needs');
{
  const days = C.patternFoodDays(input(F));
  const want = [...new Set(F.sessions.map(s => s._date))].sort();
  check('on: exactly the days of the lift’s sessions that have food in their summary', J(days) === J(want),
        days.length + ' of ' + want.length);
  const D = src('coach-data.js').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const LOAD = (D.split('async function load()')[1] || '').split('\nfunction ')[0];
  check('coach-data.js starts it after the boot wave, never in it, and only when Patterns is on',
        /ready = true;\s*\n\s*if \(!isMuted\(settings, 'patterns'\)\) loadPatternFood\(\);/.test(LOAD) &&
        !/await[^\n]*loadPatternFood/.test(D));
  check('it reads food/log one day at a time, for the days patternFoodDays names',
        /patternFoodDays\(coachInput\(\{\}\)\)/.test(D) && /read\('food\/log\/' \+ k, null\)/.test(D));
  check('and switching Patterns on reads them then, not at the next app open',
        /if \(ok && muted !== true && ready\) loadPatternFood\(\);/.test(D));
}

/* ================= H. v52 — STILL EIGHT ================= */
section('H. v52 — stage four quotes Patterns and adds none to them; v53 adds three, by decision');
{
  /* SHIP-V52-PROMPT decision 6: a ninth comparison is a decision, not a line
     of code. "Am I fueled?" and "How did today compare?" quote four of the
     eight, worded as Patterns words them — they register none. v53: Micah
     made the decision on 24 Sep 2026, and there are eleven — the eight
     first, in their order, and his three after them. */
  check('PATTERN_FACTS is eleven: the same eight in the same order, then v53’s three', C.PATTERN_FACTS.length === 11 &&
        C.PATTERN_FACTS.join(',') === 'lift.fedBeforeTop,session.setsAfterProtein,fuel.trainingDayCalories,weight.rateBySessions,' +
        'lift.morningTop,lift.restGapTop,steps.trainingDays,lift.caloriesBeforeTop,' +
        'feel.energyFedBefore,feel.energyKcalBefore,feel.energySinceFood', C.PATTERN_FACTS.join(','));
  check('the patterns intent answers from those eight and no others', JSON.stringify(C.INTENTS.find(i => i.id === 'patterns_in_data').factsNeeded) ===
        JSON.stringify(C.PATTERN_FACTS));
  check('coach-fuel.js and coach-ready.js compute no comparison of two groups of days — no PATTERN_MIN, no sides()',
        !/PATTERN_MIN|function sides\(/.test(src('coach-fuel.js') + src('coach-ready.js')));
  check('and "Am I fueled?" quotes a pattern only with Patterns switched on — coach.js hands it none otherwise',
        /isMuted\(s, 'patterns'\) \? null : patternLines\(d\)/.test(src('coach.js')));
}

/* ================= I. v53 — HIS ENERGY BESIDE HIS FOOD ================= */
section('I. v53 — three energy patterns: true, false and thin, every number, real-time only, and the days they add');
{
  /* The fixture's sessions, each rated with an energy by what he ate that
     day — every entry on the session's own date, at an hour relative to its
     start. Even sessions (by position) had food before: 900 kcal an hour
     before (energy 8) or 400 kcal five hours before (energy 6), and a meal at
     20:00. Odd ones had nothing before it — food an hour and six hours after
     (energy 5). Every day's entries spread four hours or more: he logs as he
     goes. */
  const at = (s, h) => s.startedAt + h * 3600e3;
  const rate = (fx, o) => {
    const opt = { fed: j => j % 2 === 0, near: j => j % 4 === 0, batch: false, ...(o || {}) };
    const sessions = fx.sessions.map((s, j) => ({ ...s, feel: { e: opt.fed(j) ? (opt.near(j) ? 8 : 6) : 5, at: at(s, 2) } }));
    const foodDays = {};
    sessions.forEach((s, j) => {
      const late = new Date(s.startedAt); late.setHours(20, 0, 0, 0);
      foodDays[s._date] = opt.batch
        ? [{ t: late.getTime(), cal: 900 }, { t: late.getTime() + 60e3, cal: 700 }]
        : opt.fed(j) ? [{ t: at(s, opt.near(j) ? -1 : -5), cal: opt.near(j) ? 900 : 400 }, { t: late.getTime(), cal: 800 }]
                     : [{ t: at(s, 1), cal: 700 }, { t: at(s, 6), cal: 600 }];
    });
    return { ...fx, sessions, foodDays };
  };
  const R = rate(F);
  const inR = (fx, extra) => ({ ...input(fx), foodDays: fx.foodDays, ...(extra || {}) });
  const said = inp => { const a = C.coach(inp).ask('ask_patterns'); return a.id === 'patterns_in_data' ? [{ text: a.text, reason: a.reason }].concat(a.more || []) : []; };
  const line = (inp, re) => said(inp).find(l => re.test(l.text));
  const FED = /^On your \d+ rated sessions with food logged beforehand/, KCAL = /^On rated sessions with [\d,]+ kcal or more/, SINCE = /^When your last logged food was/;

  // The second reading: the brief's three definitions, over the raw fixture.
  const expect = fx => {
    const rows = fx.sessions.map(s => ({ s, e: s.feel.e, es: (fx.foodDays[s._date] || []).filter(x => key(x.t) === s._date) }));
    const fed = rows.filter(r => r.es.length && r.es.some(x => x.t < r.s.startedAt)).map(r => r.e);
    const not = rows.filter(r => r.es.length && !r.es.some(x => x.t < r.s.startedAt)).map(r => r.e);
    const kr = rows.map(r => ({ k: r.es.filter(x => x.t < r.s.startedAt).reduce((a, x) => a + x.cal, 0), e: r.e })).filter(r => r.k > 0);
    const km = med(kr.map(r => r.k));
    const hr = rows.map(r => { const b = r.es.filter(x => x.t < r.s.startedAt); return b.length ? { h: (r.s.startedAt - Math.max(...b.map(x => x.t))) / 3600e3, e: r.e } : null; }).filter(Boolean);
    const hm = med(hr.map(r => r.h));
    const one = x => String(Math.round(x * 10) / 10);
    return {
      fed: [fed.length, one(med(fed)), 10, not.length, one(med(not))].map(String),
      kcal: [Math.round(km).toLocaleString('en-US').replace(/,/g, ''), one(med(kr.filter(r => r.k >= km).map(r => r.e))), '10',
             kr.filter(r => r.k >= km).length, one(med(kr.filter(r => r.k < km).map(r => r.e))), kr.filter(r => r.k < km).length].map(String),
      since: [one(hm), one(med(hr.filter(r => r.h <= hm).map(r => r.e))), '10', hr.filter(r => r.h <= hm).length,
              one(med(hr.filter(r => r.h > hm).map(r => r.e))), hr.filter(r => r.h > hm).length].map(String)
    };
  };
  const E = expect(R);
  const l1 = line(inR(R), FED), l2 = line(inR(R), KCAL), l3 = line(inR(R), SINCE);
  check('all three clear on a rated log, after the eight: ' + said(inR(R)).length + ' lines',
        said(inR(R)).length === 11 && said(inR(R)).slice(-3).every((l, n) => [FED, KCAL, SINCE][n].test(l.text)), said(inR(R)).slice(-3).map(l => l.text).join(' | '));
  check('feel.energyFedBefore: ' + E.fed.join(' / '), !!l1 && J(nums(l1.text)) === J(E.fed), l1 && l1.text);
  check('feel.energyKcalBefore: ' + E.kcal.join(' / '), !!l2 && J(nums(l2.text)) === J(E.kcal), l2 && l2.text);
  check('feel.energySinceFood: ' + E.since.join(' / '), !!l3 && J(nums(l3.text)) === J(E.since), l3 && l3.text);
  check('the two sides really differ on each, and each clears eight a side',
        E.fed[1] !== E.fed[4] && E.kcal[1] !== E.kcal[4] && E.since[1] !== E.since[4] &&
        [E.fed[0], E.fed[3], E.kcal[3], E.kcal[5], E.since[3], E.since[5]].every(n => Number(n) >= 8), J(E));
  check('the brief’s own example reads as it does: "On your 9 rated sessions with food logged beforehand, energy had a median of 7 out of 10; on the other 8, 5."',
        /^On your \d+ rated sessions with food logged beforehand, energy had a median of [\d.]+ out of 10; on the other \d+, [\d.]+\.$/.test(l1 && l1.text), l1 && l1.text);

  // False: each fact's own condition missed, on logs where the others hold.
  const allFed = rate(F, { fed: () => true, near: j => j % 2 === 0 });
  check('false — every rated session fed: nothing on the other side, so energyFedBefore is silent (and the calorie split still speaks)',
        !line(inR(allFed), FED) && !!line(inR(allFed), KCAL), said(inR(allFed)).slice(8).map(l => l.text.slice(0, 40)).join(' | '));
  const batch = rate(F, { batch: true });
  check('false — a batch logger (every entry within the hour, at 20:00): the hours say nothing, so energySinceFood is silent',
        !line(inR(batch), SINCE), (line(inR(batch), SINCE) || {}).text);
  check('and his own "later" answer silences it on a log that looks real-time',
        !line(inR(R, { settings: { ...ON, answers: { q_log_timing: 'later' } } }), SINCE) && !!line(inR(R), SINCE));
  const sameKcal = rate(F, { near: () => true });
  check('false — the same calories before every fed session: nothing below the median, so the calorie split is silent',
        !line(inR(sameKcal), KCAL), (line(inR(sameKcal), KCAL) || {}).text);
  // Thin: seven rated sessions.
  const thin = { ...R, sessions: R.sessions.map((s, j) => (j < R.sessions.length - 7 ? { ...s, feel: undefined } : s)) };
  check('thin — seven rated sessions: all three silent, the eight untouched',
        !line(inR(thin), FED) && !line(inR(thin), KCAL) && !line(inR(thin), SINCE) && said(inR(thin)).length === 8);
  // Unread food days: no foodDays at all is silence, never "no food".
  check('no rated day’s food read yet: all three silent', !line(inR({ ...R, foodDays: {} }), /rated session/));
  // A rating with no energy, or junk, is no rating.
  const junk = { ...R, sessions: R.sessions.map(s => ({ ...s, feel: { e: '8', s: 110 } })) };
  check('a rating without a valid energy counts for none of them', !line(inR(junk), /rated session/));
  // Off with Patterns, like the eight.
  check('Patterns off: none of them', said(inR(R, { settings: { v: 1, mute: {}, answers: {}, asked: {} } })).length === 0);

  // Words, both units.
  const CAUSAL = [/\bbecause\b/i, /\bhelps?\b/i, /\bmakes?\b/i, /\bleads? to\b/i, /\bboosts?\b/i, /\bso you\b/i,
                  /\bcauses?\b/i, /\bdue to\b/i, /\bresults? in\b/i, /\bdrives?\b/i, /\bthanks to\b/i,
                  /\bshould\b/i, /\btry\b/i, /\beat\b/i, /\bbetter\b/i, /\bworse\b/i];
  const three = ['lb', 'kg'].flatMap(u => said(inR(R, { u })).slice(8)).flatMap(l => [l.text, l.reason]);
  check('never a cause, never advice, never "eat" — both counts in every line, in both units (' + three.length + ' strings)',
        three.length === 12 && !three.some(t => CAUSAL.some(re => re.test(t))) &&
        said(inR(R)).slice(8).every(l => nums(l.text).length >= 5), three.filter(t => CAUSAL.some(re => re.test(t))).join(' | '));
  check('and the same words on kilos — no weight in any of them to convert',
        J(said(inR(R, { u: 'kg' })).slice(8).map(l => l.text)) === J(said(inR(R)).slice(8).map(l => l.text)));

  // The read: the rated sessions' dates the shipped list does not hold,
  // newest first, forty at most, and the shipped dates never trimmed.
  // Curls on days bench never is: a lift of their own, so bench stays the
  // lift the first pattern reads and these dates are the rated ones it adds.
  const CURL = { name: 'Barbell Curl', group: 'arms', equipment: 'barbell' };
  const extra = [];
  for (let i = 1; i <= 181; i++) if (i % 7 === 2 || i % 7 === 6) extra.push(i);   // never a training day here
  const withCurls = { ...R, sessions: R.sessions.concat(extra.map(i => ({ id: 'c' + i, startedAt: hourOn(i, 12), _date: key(NOW - i * DAY),
    feel: { e: 6, at: hourOn(i, 14) }, exercises: [{ exId: 'curl', ...CURL, sets: setsOf(3, 65, 10) }] }))).sort((a, b) => a.startedAt - b.startedAt) };
  const shipped = C.patternFoodDays(input(F));
  const days = C.patternFoodDays(input(withCurls, { lib: { ...PLIB, curl: CURL } }));
  const added = days.slice(shipped.length);
  const want = extra.map(i => key(NOW - i * DAY)).sort().reverse().slice(0, 40);
  check('the read adds the rated sessions’ own dates the first pattern does not read — ' + added.length + ' of ' + extra.length + ', newest first, forty at most',
        J(days.slice(0, shipped.length)) === J(shipped) && J(added) === J(want) && extra.length > 40, added.length + ' added');
  check('rated days already on the list add nothing', C.patternFoodDays(inR(R)).length === shipped.length);
  check('and with Patterns off, no day at all', C.patternFoodDays(input(withCurls, { lib: { ...PLIB, curl: CURL }, settings: { v: 1, mute: {}, answers: {}, asked: {} } })).length === 0);
  const D = src('coach-data.js');
  check('coach-data.js keeps each day it reads whole — { t, cal } an entry — beside foodFirst, and hands it over as foodDays',
        /foodDays = \{ \.\.\.foodDays, \[k\]: es\.map\(e => \(\{ t: e\.t, cal: Number\(e\.cal\) \|\| 0 \}\)\) \};/.test(D) &&
        /foodFirst = \{ \.\.\.foodFirst, \[k\]: ts\.length \? Math\.min\(\.\.\.ts\) : null \};/.test(D) && /\n    foodDays,\n/.test(D));
}

/* ---------- report ---------- */
console.log('\nPatterns: eleven comparisons, off until asked for, and never a cause\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
