#!/usr/bin/env node
//
// Verifier for Coach's goal — the dials the aim and the lifter turn.
//
//   node tools-check/coach-goal.mjs
//
// coach-goal.js is small and it is load-bearing out of all proportion to its
// size: every target coach-prog.js names passes through dialsFor(), and every
// "Coach wants to see it twice" is energyContext() read off the weight trend.
// A bar moved by a hair is a lifter told to add weight in a hard cut, or told
// to wait a week for no reason. So this file walks every boundary and every
// combination, and it holds NO copy of the table: DIALS and the thresholds
// are imported from the module itself, and the rules below are the §5 rules
// stated as properties of whatever the table says — so a retuned number moves
// both sides of every comparison at once, and a broken RULE is what fails.
//
//   A  energyContext at every boundary, and silent on what it cannot read
//   B  DIALS: a row for every aim and one for no aim, frozen, well-formed
//   C  dialsFor over every aim × experience × energy × slope combination
//   D  every constant is exported, and the file stays pure
//   E  end to end through coach.js: the goal is two answers that validate and
//      stamp like every other, its questions never open the sheet, and an
//      answer really turns a target — through the builder and coach-prog.js

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const G = await import(pathToFileURL(join(ROOT, 'coach-goal.js')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(' | ') + (xs.length > 8 ? ' … (' + xs.length + ')' : '');

/* ================= A. THE ENERGY CONTEXT ================= */
section('A. energyContext — every bar, on the bar and either side of it');
{
  const E = (rateWk, latestLb, rateDays) => G.energyContext({ rateWk, latestLb, rateDays });
  // A rate that is exactly the bar, expressed as lb/wk on a round bodyweight.
  const at = (pct, lb) => pct * lb / 100;
  const LBS = [100, 180, 200, 240];

  check('exactly ' + G.ENERGY_DEEP + '%/wk is a hard cut, on every bodyweight tried',
        LBS.every(lb => E(at(G.ENERGY_DEEP, lb), lb, 21) === 'deep'),
        LBS.map(lb => lb + ':' + E(at(G.ENERGY_DEEP, lb), lb, 21)).join(' '));
  check('and a hundredth of a percent lighter is a deficit, not a hard cut',
        LBS.every(lb => E(at(G.ENERGY_DEEP + 0.01, lb), lb, 21) === 'deficit'));
  check('exactly ' + G.ENERGY_DEFICIT + '%/wk is a deficit',
        LBS.every(lb => E(at(G.ENERGY_DEFICIT, lb), lb, 21) === 'deficit'),
        LBS.map(lb => lb + ':' + E(at(G.ENERGY_DEFICIT, lb), lb, 21)).join(' '));
  check('and a hundredth of a percent less is holding — inside the noise',
        LBS.every(lb => E(at(G.ENERGY_DEFICIT + 0.01, lb), lb, 21) === 'hold'));
  check('exactly +' + G.ENERGY_SURPLUS + '%/wk is a surplus',
        LBS.every(lb => E(at(G.ENERGY_SURPLUS, lb), lb, 21) === 'surplus'),
        LBS.map(lb => lb + ':' + E(at(G.ENERGY_SURPLUS, lb), lb, 21)).join(' '));
  check('and a hundredth of a percent less is holding',
        LBS.every(lb => E(at(G.ENERGY_SURPLUS - 0.01, lb), lb, 21) === 'hold'));
  check('a flat trend is holding', E(0, 180, 21) === 'hold');
  check('the brief’s own example: 180 lb losing 2.2 lb a week over 21 days is a hard cut',
        E(-2.2, 180, 21) === 'deep');

  check(G.ENERGY_MIN_DAYS + ' days of weigh-ins behind the rate reads; ' + (G.ENERGY_MIN_DAYS - 1) + ' does not',
        E(-2.2, 180, G.ENERGY_MIN_DAYS) === 'deep' && E(-2.2, 180, G.ENERGY_MIN_DAYS - 1) === null);
  check('rateDays absent is the two-weekly-averages fallback, which reads',
        E(-2.2, 180, null) === 'deep' && E(-2.2, 180, undefined) === 'deep');
  check('rateDays that is not a number does not read', E(-2.2, 180, NaN) === null && E(-2.2, 180, '21') === null);

  const nulls = [
    ['no rate', E(null, 180, 21)], ['NaN rate', E(NaN, 180, 21)], ['a rate as a string', E('-1', 180, 21)],
    ['no bodyweight', E(-1, null, 21)], ['zero bodyweight', E(-1, 0, 21)], ['negative bodyweight', E(-1, -180, 21)],
    ['Infinity', E(-Infinity, 180, 21)],
    ['nothing at all', G.energyContext()], ['null', G.energyContext(null)], ['a number', G.energyContext(3)]
  ];
  const noisy = nulls.filter(([, v]) => v !== null);
  check('silent — null — on every input it cannot read (' + nulls.length + ' tried)',
        !noisy.length, list(noisy.map(([k, v]) => k + '=' + v)));
  check('and never anything but the four words or null',
        [-3, -1.4, -1, -0.5, -0.3, 0, 0.3, 0.6, 2].every(r =>
          ['deep', 'deficit', 'hold', 'surplus'].includes(E(r, 180, 21))));
}

/* ================= B. THE TABLE ================= */
section('B. DIALS — one row for every aim, and one for no aim');
{
  const rows = Object.keys(G.DIALS);
  check('AIMS is the six aims, EXPERIENCE the three answers',
        G.AIMS.length === 6 && G.EXPERIENCE.length === 3 && new Set(G.AIMS).size === 6,
        list(G.AIMS.slice()));
  check('DIALS has a row for every AIMS entry plus none, and nothing else',
        rows.length === G.AIMS.length + 1 && G.AIMS.every(a => rows.includes(a)) && rows.includes('none'),
        list(rows));
  const bad = rows.filter(k => {
    const r = G.DIALS[k];
    const ok = pair => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isInteger) &&
                       pair[0] >= 1 && pair[0] < pair[1];
    return !(r && [1, 2].includes(r.confirm) && [1, 2].includes(r.maxSteps) && r.band &&
             ok(r.band.compound) && ok(r.band.isolation));
  });
  check('every row: confirm 1 or 2, maxSteps 1 or 2, two rising whole-number bands', !bad.length, list(bad));
  const frozen = (v, path = 'DIALS') => typeof v !== 'object' || v === null ||
    (Object.isFrozen(v) && Object.keys(v).every(k => frozen(v[k], path + '.' + k)));
  check('the table is frozen all the way down, so no caller can retune it at runtime',
        frozen(G.DIALS) && Object.isFrozen(G.AIMS) && Object.isFrozen(G.EXPERIENCE));
  /* Tonight Build muscle, Recomp and no aim share a row: what tells them
     apart (volume targets, the contradiction checks) is stage three's. What
     Micah decided on 23 Sep is that Powerlifting is its own goal and not a
     label on Get stronger, so that is the pair held apart here. */
  check('Powerlifting is its own row, not a copy of Get stronger — its bands differ',
        JSON.stringify(G.DIALS.powerlifting.band) !== JSON.stringify(G.DIALS.strength.band));
  check('and a cut or Stay consistent confirms twice where no aim confirms once',
        G.DIALS.cut.confirm === 2 && G.DIALS.maintain.confirm === 2 && G.DIALS.none.confirm === 1);
  check('the bars are ordered: a hard cut below a deficit below the noise below a surplus',
        G.ENERGY_DEEP < G.ENERGY_DEFICIT && G.ENERGY_DEFICIT < 0 && 0 < G.ENERGY_SURPLUS);
}

/* ================= C. EVERY COMBINATION ================= */
section('C. dialsFor — every aim × experience × energy × slope, against the §5 rules');
{
  const AIMS = G.AIMS.concat([null, undefined, 'none', 'banana', '__proto__', 'toString']);
  const EXPS = G.EXPERIENCE.concat([null]);
  const ENERGIES = ['deep', 'deficit', 'hold', 'surplus', null];
  const BOOLS = [false, true];
  let n = 0;
  const wrong = [];
  const say = (x, why, got) => wrong.push(JSON.stringify(x) + ' — ' + why + ' — got ' + JSON.stringify(got));
  AIMS.forEach(aim => EXPS.forEach(exp => ENERGIES.forEach(energy => BOOLS.forEach(slowSlope => BOOLS.forEach(fastSlope => {
    n++;
    const x = { aim, exp, energy, slowSlope, fastSlope };
    const d = G.dialsFor(x);
    const row = G.AIMS.includes(aim) ? G.DIALS[aim] : G.DIALS.none;
    // The band is the aim's, untouched by anything else.
    if (JSON.stringify(d.band) !== JSON.stringify(row.band)) say(x, 'band is not the aim’s own', d.band);
    // confirm: the row's, raised to 2 by a hard cut or a slow slope, never lowered.
    const wantConfirm = energy === 'deep' || slowSlope ? 2 : row.confirm;
    if (d.confirm !== wantConfirm) say(x, 'confirm should be ' + wantConfirm, d.confirm);
    // maxSteps, in the order §5 lists: energy, then the fast slope, then a new lifter.
    let ms = row.maxSteps;
    if (energy === 'deep' || energy === 'deficit') ms = 1;
    if (fastSlope && exp !== 'new' && energy !== 'deep' && energy !== 'deficit') ms = Math.max(ms, 2);
    if (exp === 'new') ms = 1;
    if (d.maxSteps !== ms) say(x, 'maxSteps should be ' + ms, d.maxSteps);
    // And the three it must never break, whatever else the table says.
    if (exp === 'new' && d.maxSteps !== 1) say(x, 'a new lifter gets two jumps', d.maxSteps);
    if ((energy === 'deep' || energy === 'deficit') && d.maxSteps !== 1) say(x, 'two jumps in a deficit', d.maxSteps);
    if (energy === 'deep' && d.confirm !== 2) say(x, 'a hard cut confirms once', d.confirm);
    if (![1, 2].includes(d.confirm) || ![1, 2].includes(d.maxSteps)) say(x, 'a dial outside 1–2', d);
  })))));
  check('every combination follows the rules (' + n + ' driven)', n >= 960 && !wrong.length, list(wrong));

  const a = G.dialsFor({ aim: 'strength' });
  a.band.compound[0] = 99; a.confirm = 99;
  check('what it hands back is a copy — editing it moves nothing in the table',
        G.DIALS.strength.band.compound[0] !== 99 && G.dialsFor({ aim: 'strength' }).confirm === G.DIALS.strength.confirm);
  check('no argument, null, or junk is the no-aim row',
        [undefined, null, 3, 'x', []].every(v => JSON.stringify(G.dialsFor(v)) ===
          JSON.stringify({ confirm: G.DIALS.none.confirm, maxSteps: G.DIALS.none.maxSteps, band: G.DIALS.none.band })));
  check('an unanswered experience is the middle, not a new lifter: a fast slope still earns two jumps',
        G.dialsFor({ aim: 'muscle', exp: null, fastSlope: true, energy: 'hold' }).maxSteps === 2 &&
        G.dialsFor({ aim: 'muscle', exp: 'new', fastSlope: true, energy: 'hold' }).maxSteps === 1);
}

/* ================= D. EXPORTS AND PURITY ================= */
section('D. every constant exported, and nothing a native copy could not run');
{
  const RAW = src('coach-goal.js');
  const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const consts = [...CODE.matchAll(/^(export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=/gm)];
  const hidden = consts.filter(m => !m[1]).map(m => m[2]);
  check('every UPPER_CASE constant in the file is exported (' + consts.length + ')',
        consts.length >= 8 && !hidden.length, list(hidden));
  const need = ['AIMS', 'EXPERIENCE', 'DIALS', 'ENERGY_DEEP', 'ENERGY_DEFICIT', 'ENERGY_SURPLUS', 'ENERGY_MIN_DAYS',
                'energyContext', 'dialsFor'];
  check('and the module exports every name the brief lists', need.every(k => k in G), list(need.filter(k => !(k in G))));
  check('it imports nothing', !/^import\s/m.test(RAW));
  check('no clock, no dice, no DOM, no storage',
        !/Date\.now|new\s+Date|Math\.random|\bdocument\b|\bwindow\b|localStorage|\bfetch\b|\bconsole\./.test(CODE));
  check('no top-level let or var', !CODE.split('\n').some(l => /^(export\s+)?(let|var)\s/.test(l)));
}

/* ================= E. END TO END ================= */
section('E. through coach.js — the goal is answers, asked in their place, and it turns the targets');
{
  // coach.js staged the way every Coach verifier stages it.
  const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);
  const dir = mkdtempSync(join(tmpdir(), 'rack-coach-goal-'));
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
    .replace("from './coach-ready.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-ready.mjs')).href))
    .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
  const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
  const { EXERCISES } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);

  /* normSettings: its SHAPE does not change, and the two new answers are
     validated against their own options like every other — confirmed by
     driving it, as the brief asks, not by reading it. */
  const n = C.normSettings({ v: 1, mute: { targets: true }, answers: { q_goal_aim: 'powerlifting', q_experience: 'years',
                                                                         q_goal_direction: 'down', q_other: 'x' },
                             asked: { q_goal_aim: 5, q_experience: 'soon' } });
  check('normSettings keeps its shape: v, mute, on, answers, asked — and nothing new',
        JSON.stringify(Object.keys(n)) === JSON.stringify(['v', 'mute', 'on', 'answers', 'asked']), Object.keys(n).join(','));
  check('and keeps a valid aim and experience, the same way it keeps the direction',
        n.answers.q_goal_aim === 'powerlifting' && n.answers.q_experience === 'years' && n.answers.q_goal_direction === 'down' &&
        !('q_other' in n.answers), JSON.stringify(n.answers));
  check('and refuses an answer that is not one of the question’s options',
        JSON.stringify(C.normSettings({ answers: { q_goal_aim: 'bulk', q_experience: 3 } }).answers) === '{}');
  check('asked.q_goal_aim, the moment the goal was set, survives as a number; junk does not',
        n.asked.q_goal_aim === 5 && !('q_experience' in n.asked));
  check('the targets switch is a real, mutable category: off survives, and absent means on',
        n.mute.targets === true && C.isMuted(n, 'targets') && !C.isMuted(C.normSettings({}), 'targets'));
  check('every aim and every experience answer is an option of its question, and the other way round',
        JSON.stringify(C.QUESTIONS.find(q => q.id === 'q_goal_aim').options.map(o => o.value)) === JSON.stringify(G.AIMS) &&
        JSON.stringify(C.QUESTIONS.find(q => q.id === 'q_experience').options.map(o => o.value)) === JSON.stringify(G.EXPERIENCE));

  // A log whose bench target is a jump when nothing else is said.
  const DAY = 864e5, NOW = 1789307130123;
  const key = ms => { const d = new Date(ms), p = x => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const LIB = {};
  EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
  const ex = (id, rows) => ({ exId: id, ...LIB[id], sets: rows.map(([w, r]) => ({ w: String(w), r: String(r), type: 'N', done: true })) });
  const sess = (id, ago, exs) => ({ id, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises: exs });
  const LOG = [];
  for (let k = 0; k < 10; k++) {
    const w = 185 - 5 * Math.floor(k / 2), r = k % 2 ? 8 : 12;
    LOG.push(sess('p' + k, 9 + 7 * k, [ex('barbell-bench-press', [[w, r], [w, r], [w, r]]), ex('triceps-pushdown-rope', [[50, 12], [50, 12]])]));
    LOG.push(sess('b' + k, 4 + 7 * k, [ex('barbell-row', [[155, 8], [155, 8]]), ex('barbell-curl', [[65, 10], [65, 10]])]));
    LOG.push(sess('l' + k, 6 + 7 * k, [ex('back-squat-high-bar', [[245, 5], [245, 5], [245, 5]])]));
  }
  LOG.sort((a, b) => a.startedAt - b.startedAt);
  const input = extra => ({ now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable', sessions: LOG, lib: LIB, hidden: [],
    libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null, summaries: {},
    steps: { days: {} }, weight: { latestLb: 190, latestAt: NOW - DAY, rateWk: -0.4, rateDays: 21, goalDir: -1, goalRateWk: null },
    settings: { v: 1, mute: {}, answers: {}, asked: {} }, ...extra });
  const settings = (answers, asked, mute) => ({ settings: { v: 1, mute: mute || {}, answers: answers || {}, asked: asked || {} } });
  const bench = c => (c.build({}) || { exercises: [] }).exercises.find(e => e.exId === 'barbell-bench-press');

  const none = C.coach(input({}));
  const b0 = bench(none);
  check('with no aim, the targets are there — the goal is a refinement, never a gate',
        !!b0 && !!b0.target && b0.target.mode === 'add', b0 && b0.target && b0.target.line);
  const cut = bench(C.coach(input(settings({ q_goal_aim: 'cut' }))));
  check('answer "Lose fat, keep strength", and the same log wants the top seen twice — the aim turned the dial, end to end',
        !!cut && cut.target.mode === 'hold' && cut.target.code === 'confirm' && /You’re cutting/.test(cut.target.why[0]),
        cut && cut.target.line + ' / ' + cut.target.why[0]);
  const hard = bench(C.coach(input({ weight: { latestLb: 180, latestAt: NOW - DAY, rateWk: -2.2, rateDays: 21, goalDir: -1, goalRateWk: null } })));
  check('a hard cut on the weight trend does the same, and says the rate it read — from the trend alone',
        !!hard && hard.target.code === 'confirm' && /coming down about 2\.2 lb a week/.test(hard.target.why[0]),
        hard && hard.target.why[0]);
  check('weight.energy reads the trend: 180 lb losing 2.2 a week over 21 days is a hard cut', (() => {
    const c = C.coach(input({ weight: { latestLb: 180, latestAt: NOW - DAY, rateWk: -2.2, rateDays: 21, goalDir: -1, goalRateWk: null } }));
    return c.build({}) && C.FACTS.find(f => f.id === 'weight.energy').compute({ input: { weight: { latestLb: 180, rateWk: -2.2, rateDays: 21 } } }) === 'deep';
  })());

  /* THE QUESTIONS, in their place. Never the sheet's opener; under the
     targets answer, one at a time, behind the same gates as the opener. */
  const logs = [input({}), input(settings({ q_goal_aim: 'muscle' })),
                input({ weight: { latestLb: 190, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null },
                        targets: { cal: 2300, p: 180, f: 70 } })];
  check('a goal question is never the sheet’s opening question, on any of them',
        logs.every(i => { const q = C.coach(i).question; return !q || !['q_goal_aim', 'q_experience'].includes(q.id); }),
        logs.map(i => (C.coach(i).question || {}).id).join(','));
  const q0 = none.ask('ask_targets').question;
  check('the targets answer carries the aim question first, with its six answers and its own acknowledgement',
        !!q0 && q0.id === 'q_goal_aim' && q0.options.length === 6 && q0.ack === 'Noted. Coach sets your targets with that in mind.');
  const q1 = C.coach(input(settings({ q_goal_aim: 'muscle' }, { q_goal_aim: NOW - DAY }))).ask('ask_targets').question;
  check('once the aim is answered, the experience question is next', !!q1 && q1.id === 'q_experience', q1 && q1.id);
  check('and with both answered, nothing is asked',
        C.coach(input(settings({ q_goal_aim: 'muscle', q_experience: 'some' }))).ask('ask_targets').question === null);
  check('asked yesterday and not answered: quiet for the week — one at a time, the shipped cooldown',
        C.coach(input(settings({}, { q_goal_aim: NOW - DAY }))).ask('ask_targets').question === null &&
        C.coach(input(settings({}, { q_goal_aim: NOW - 8 * DAY }))).ask('ask_targets').question.id === 'q_goal_aim');
  check('questions switched off: none under the answer either, and the targets are still there',
        C.coach(input(settings({}, {}, { questions: true }))).ask('ask_targets').question === null &&
        C.coach(input(settings({}, {}, { questions: true }))).ask('ask_targets').id === 'lift_targets');
  /* Updated deliberately in v49 (SHIP-V49-PROMPT §7.2): "How am I tracking
     toward my goal?" carries the focus-group question under its answer, the
     way the targets answer carries the aim. Those two, and no other route. */
  check('no route but ask_targets and ask_goal carries a question',
        C.ROUTE_IDS.filter(r => r !== 'ask_targets' && r !== 'ask_goal').every(r => !('question' in none.ask(r))));
  const focusQ = C.coach(input(settings({ q_goal_aim: 'muscle', q_experience: 'some' }))).ask('ask_goal').question;
  check('and the goal answer carries the focus question, once the aim is set and the focus is not',
        !!focusQ && focusQ.id === 'q_focus_group' && focusQ.options.length === 7 &&
        C.coach(input(settings({ q_goal_aim: 'muscle', q_focus_group: 'chest' }))).ask('ask_goal').question === null &&
        !C.coach(input({})).ask('ask_goal').question, focusQ && focusQ.id);
  check('targets switched off: no answer, no bubble',
        C.coach(input(settings({}, {}, { targets: true }))).ask('ask_targets').id !== 'lift_targets' &&
        !C.coach(input(settings({}, {}, { targets: true }))).topicsFor('train').some(t => t.id === 'ask_targets'));
}

/* ---------- report ---------- */
console.log('\nCoach’s goal turns the dials it says it turns\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
