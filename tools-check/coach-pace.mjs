#!/usr/bin/env node
//
// Verifier for the goal made useful (v49): "How am I tracking toward my
// goal?", the lift target, and the two "did your goal change?" questions.
//
//   node tools-check/coach-pace.mjs
//
// Three promises, each with its own way to go wrong:
//
//   A RANGE IN WEEKS, NEVER A DATE. A lift target is paced by his own estimated
//   max over twelve weeks, from its fitted pace to its slow end; a bodyweight
//   target by the trend's rate and how sure it is of it. Past six months it
//   says so. Reached, it says it is at the target — never "test it". Not
//   moving, it says so and gives stage two's reading. And a rate past the
//   band gets the figure alone, never an approving word.
//
//   A TARGET THAT CANNOT BE JUNK. goalLift is stored in settings/coach, and
//   normGoalLift() fails safe on every junk value; normSettings() adds the key
//   only when it is valid, so a node without one keeps the shipped shape.
//
//   A QUESTION, NEVER A VERDICT, AND ONLY WHEN EARNED. Rows G1–G8: asked on
//   three weeks of the scale going against the aim, or his food targets
//   pointing the other way — Pro only, fourteen days after the aim was set,
//   quiet for 28 days on "temporary", and never on Micah's own case (building
//   muscle while gaining). Changing the aim clears both answers.
//
// coach.js, coach-prog.js, coach-overlap.js and coach-goal.js are staged and
// driven for real; coach-data.js's two writers are driven against a stub
// store that records what they would write.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= STAGING ================= */
/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-coach-pace-'));
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
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const { EXERCISES } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);

const G = await import(pathToFileURL(join(ROOT, 'coach-goal.js')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 6).join(' | ') + (xs.length > 6 ? ' … (' + xs.length + ')' : '');

/* ================= FIXTURES ================= */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const localAt = (ago, hour) => { const d = new Date(NOW - ago * DAY); d.setHours(hour, 0, 0, 0); return d.getTime(); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const BENCH = 'barbell-bench-press';
const set = (w, r) => ({ w: String(w), r: String(r), type: 'N', done: true });
const xN = (n, w, r) => Array.from({ length: n }, () => set(w, r));
let sid = 0;
const sess = (ago, rows) => { const t = localAt(ago, 7);
  return { id: 'g' + (++sid), startedAt: t, endedAt: t + 3600e3, _date: key(t),
           exercises: rows.map(([id, sets]) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment, sets })) }; };
const sortS = ss => ss.slice().sort((a, b) => a.startedAt - b.startedAt);
const input = extra => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: [], lib: LIB, hidden: [],
  libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
  summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} },
  ...extra
});
const settings = (answers, asked, extra) => ({ settings: { v: 1, mute: {}, answers: answers || {}, asked: asked || {}, ...(extra || {}) } });
// Bench twice a week for twelve weeks, the top set from `from` by `step` a session.
const benchLog = (from, step, reps = 5) => Array.from({ length: 24 }, (_, k) => sess(2 + 3.5 * (23 - k) | 0, [[BENCH, xN(3, from + step * k, reps)]]));
const goalLines = inp => { const a = C.coach(inp).ask('ask_goal'); return [a.text].concat((a.more || []).map(m => m.text)); };
const goalOf = (inp, lb, reps) => ({ ...inp, settings: { ...inp.settings, goalLift: { exId: BENCH, lb, reps: reps || 1, at: NOW - 70 * DAY } } });
const STRONG = settings({ q_goal_aim: 'strength' });
const DATE_WORDS = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b|\b(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day\b|\b\d{1,2}\/\d{1,2}\b|\bby (the )?(end|middle)\b/;
const TEST_IT = /\btest\b|\bmax out\b|\battempt\b|\bgo for\b/i;
const APPROVE = /\bon track\b|\bon pace\b|\bgood\b|\bgreat\b|\bnice\b|\bwell done\b|\bthe way your goal points\b/i;

/* ================= A. THE LIFT TARGET ================= */
section('A. the lift target — a range of weeks, at the target, not moving, past six months, never a date');
const allLines = [];
{
  // 185 → 242.5 over twelve weeks, with a session's worth of noise on every
  // third one: an estimated max from about 216 to 283. (A perfectly straight
  // log has no spread in its pace, and its "range" is one number — which the
  // answer says as "about N weeks", honestly.)
  const noisy = benchLog(185, 2.5).map((x, k) => (k % 3 === 1
    ? { ...x, exercises: x.exercises.map(e => ({ ...e, sets: e.sets.map(z => ({ ...z, w: String(parseFloat(z.w) - 7.5) })) })) } : x));
  const climbing = input({ sessions: sortS(noisy), ...STRONG });
  const range = goalLines(goalOf(climbing, 305));
  allLines.push(...range);
  const t = range.find(x => /^Your target, 305 lb on Barbell Bench Press/.test(x)) || '';
  check('climbing toward it: "about X–Y weeks at your last 12 weeks’ rate", the fast end first',
        /: your estimated max is [\d.]+ lb against its 305 lb\. About (\d+)–(\d+) weeks at your last 12 weeks’ rate\.$/.test(t) &&
        (m => +m[1] <= +m[2])(/About (\d+)–(\d+) weeks/.exec(t)), t);
  const reached = goalLines(goalOf(climbing, 265));
  allLines.push(...reached);
  check('past it: "Your estimated max is at your target" — and nothing about testing it',
        reached.some(x => /^Your estimated max on Barbell Bench Press is at your target: [\d.]+ lb against 265 lb\.$/.test(x)) &&
        !reached.some(x => TEST_IT.test(x)), list(reached));
  const level = input({ sessions: sortS(benchLog(225, 0)), ...STRONG });
  const flat = goalLines(goalOf(level, 305));
  allLines.push(...flat);
  check('level: "Not moving toward it right now." — with no range at all',
        flat.some(x => /Not moving toward it right now\./.test(x)) && !flat.some(x => /weeks at your/.test(x)), list(flat));
  const slow = input({ sessions: sortS(benchLog(215, 0.5)), ...STRONG });
  const far = goalLines(goalOf(slow, 330));
  allLines.push(...far);
  check('a pace that reaches it past six months says so, and names no number of weeks',
        far.some(x => /More than six months at your last 12 weeks’ rate\./.test(x)), list(far));
  // 225 × 15, capped at twelve like every estimated max: at the target once
  // 225 × 15 is logged, not forever short of an uncapped 337.
  const fifteen = input({ sessions: sortS(Array.from({ length: 8 }, (_, k) => sess(3 + 4 * (7 - k), [[BENCH, xN(3, 225, k < 6 ? 12 : 15)]]))), ...STRONG });
  const f15 = goalLines({ ...fifteen, settings: { ...fifteen.settings, goalLift: { exId: BENCH, lb: 225, reps: 15, at: NOW - 40 * DAY } } });
  check('a 225 × 15 target is "at your target" once 225 × 15 is logged — the target capped at twelve reps like the log',
        f15.some(x => /is at your target/.test(x)), list(f15));
  const unlogged = goalLines({ ...climbing, settings: { ...climbing.settings, goalLift: { exId: 'front-squat', lb: 225, reps: 3, at: NOW - 5 * DAY } } });
  check('a target on a lift with no sessions lately says there is nothing to measure yet — no number invented',
        unlogged.some(x => /^Your target, 225 lb for 3 on Front Squat: no sessions of it lately/.test(x)), list(unlogged));
  const kg = goalLines({ ...goalOf(climbing, 305), u: 'kg' });
  check('on kilos, the same target in kilos, and no pound anywhere',
        kg.some(x => /^Your target, 138\.3 kg on Barbell Bench Press/.test(x)) && !kg.some(x => /\d ?lb\b/.test(x)), list(kg));
}

/* ================= B. THE BODYWEIGHT TARGET ================= */
section('B. the bodyweight target — food/targets.goalLb, a range from the trend’s own rate, the figure alone past the band');
{
  const w = (rateWk, rateSeWk, goalLb, latest) => input({ sessions: sortS(benchLog(185, 2.5)), ...STRONG,
    targets: { cal: 2300, p: 180, f: 70, goalLb }, targetsSet: true,
    weight: { latestLb: latest || 185, latestAt: NOW - DAY, rateWk, rateSeWk, rateDays: 30, goalDir: -1, goalRateWk: -1 } });
  const inBand = goalLines(w(-1, 0.2, 175));
  allLines.push(...inBand);
  check('inside the band: "about 9–13 weeks to your 175 lb goal weight, at your current 1 lb a week" — the trend ± its own error',
        inBand.some(x => x === 'Your weight: about 9–13 weeks to your 175 lb goal weight, at your current 1 lb a week.'), list(inBand));
  const noSe = goalLines(w(-1, null, 175));
  check('with no error on the rate, a quarter either side: about 8–14 weeks',
        noSe.some(x => /about 8–14 weeks to your 175 lb goal weight/.test(x)), list(noSe));
  const fast = goalLines(w(-2.2, 0.3, 175));
  allLines.push(...fast);
  check('past the band: the figure alone — "moving 2.2 lb a week toward" — and no approving word, no range',
        fast.some(x => x === 'Your weight is moving 2.2 lb a week toward your 175 lb goal weight.') &&
        !fast.some(x => APPROVE.test(x)) && !fast.some(x => /weeks to your/.test(x)), list(fast));
  const away = goalLines(w(0.5, 0.1, 175));
  check('moving away from it: where he is and where the goal is, nothing more',
        away.some(x => x === 'Your weight is 185 lb, against your 175 lb goal weight.'), list(away));
  const there = goalLines(w(-0.5, 0.1, 185.2));
  check('at it: "Your weight is at your 185.2 lb goal weight."', there.some(x => /is at your 185\.2 lb goal weight/.test(x)), list(there));
  const none = goalLines(input({ sessions: sortS(benchLog(185, 2.5)), ...STRONG, targets: { cal: 2300, p: 180, f: 70 }, targetsSet: true,
    weight: { latestLb: 185, latestAt: NOW, rateWk: -1, rateSeWk: 0.2, rateDays: 30, goalDir: -1, goalRateWk: -1 } }));
  check('no goal weight in his targets, no bodyweight line — Coach never keeps a second copy of one', !none.some(x => /goal weight/.test(x)), list(none));
  check('never a date, in any line this section or the last produced (' + allLines.length + ')', !allLines.some(x => DATE_WORDS.test(x)),
        list(allLines.filter(x => DATE_WORDS.test(x))));
}

/* ================= C. POWERLIFTING AND THE FOCUS GROUP ================= */
section('C. Powerlifting’s big three and their total; the focus group’s sets and lifts');
{
  const three = [['back-squat-low-bar', 315], [BENCH, 225], ['conventional-deadlift', 405]];
  const log = three.flatMap(([id, w]) => Array.from({ length: 6 }, (_, k) => sess(3 + 5 * (5 - k) + three.findIndex(x => x[0] === id), [[id, xN(3, w + 5 * k, 3)]])));
  const pl = input({ sessions: sortS(log), ...settings({ q_goal_aim: 'powerlifting' }) });
  const lines = goalLines(pl);
  const big = lines.find(x => /^Your big three, estimated:/.test(x)) || '';
  const nums = [...big.matchAll(/(squat|bench|deadlift) ([\d.]+) lb/g)].map(m => +m[2]);
  const total = +((/Total ([\d,.]+) lb/.exec(big) || [, 'NaN'])[1].replace(/,/g, ''));
  check('Powerlifting: squat, bench and deadlift, each estimated with its status, and the total of the three',
        nums.length === 3 && total === nums.reduce((a, b) => a + b, 0) && /\((climbing|holding steady|level|level lately|coming down|too soon to call)\)/.test(big), big);
  const two = goalLines(input({ sessions: sortS(log.filter(s => s.exercises[0].exId !== 'conventional-deadlift')), ...settings({ q_goal_aim: 'powerlifting' }) }));
  check('and no total until all three are there', two.some(x => /^Your big three/.test(x)) && !two.some(x => /Total/.test(x)), list(two));
  check('another aim has no big three line', !goalLines({ ...pl, ...settings({ q_goal_aim: 'strength' }) }).some(x => /big three/.test(x)));
  const focus = goalLines({ ...input({ sessions: sortS(benchLog(185, 2.5)) }), ...settings({ q_goal_aim: 'muscle', q_focus_group: 'chest' }) });
  check('the focus group: its sets a week over the last 4 weeks against his usual, and its lifts',
        focus.some(x => /^Your focus, chest: about \d+ sets? a week over the last 4 weeks(, against your usual \d+)?\. Barbell Bench Press is (climbing|holding steady|level|level lately|coming down|too soon to call)\.$/.test(x)),
        list(focus));
  /* v50, deliberately: v49 printed coach-prog.js's raw status here, and on
     Micah's phone a bench trained twice a week read "is holding" — the status
     word for "too soon to call", which reads as "keeping its strength". A
     twice-a-week bench, level for twelve weeks with no weigh-ins, is "level";
     no line under this answer ever prints a bare status word; sets are whole. */
  const flat2 = goalLines({ ...input({ sessions: sortS(benchLog(225, 0)) }), ...settings({ q_goal_aim: 'muscle', q_focus_group: 'chest' }) });
  check('a twice-a-week bench, level for twelve weeks: "is level", never the raw status "is holding"',
        flat2.some(x => /Barbell Bench Press is level\./.test(x)) && !flat2.some(x => /\bis holding\b(?! steady)|\bis flat\b|\(holding\)|\(flat\)/.test(x)), list(flat2));
  check('and the focus line counts whole sets', flat2.filter(x => /^Your focus/.test(x)).every(x => !/\d\.\d+ sets?|usual \d+\.\d/.test(x)), list(flat2));
  check('"No focus" reads no group', !goalLines({ ...input({ sessions: sortS(benchLog(185, 2.5)) }), ...settings({ q_goal_aim: 'muscle', q_focus_group: 'none' }) })
        .some(x => /Your focus/.test(x)));
  const noAim = goalLines(input({ sessions: sortS(benchLog(185, 2.5)) }));
  check('with no aim, where to set one — once, and nothing else',
        noAim.length === 1 && noAim[0] === 'Set a goal in Settings → Coach → Your goal and Coach will track it.', list(noAim));
}

/* ================= D. THE LIFT TARGET CANNOT BE JUNK ================= */
section('D. normGoalLift() fails safe; normSettings() adds goalLift only when it is valid');
{
  const ok = { exId: BENCH, lb: 315, reps: 3, at: NOW };
  check('a valid target survives whole', JSON.stringify(G.normGoalLift(ok)) === JSON.stringify(ok));
  const absent = [null, undefined, 3, 'x', [], {}, { ...ok, exId: '' }, { ...ok, exId: 'Bench Press' }, { ...ok, exId: 'BENCH' },
    { ...ok, exId: 42 }, { ...ok, exId: '-bench' }, { ...ok, lb: 0 }, { ...ok, lb: -5 }, { ...ok, lb: NaN }, { ...ok, lb: Infinity },
    { ...ok, lb: '315' }, { ...ok, lb: 99999 }, { ...ok, at: null }, { ...ok, at: 'now' }, { ...ok, at: -1 }, { ...ok, at: NaN }];
  const leaked = absent.filter(v => G.normGoalLift(v) !== null);
  check('every junk exId, weight or moment is no target at all (' + absent.length + ' tried)', !leaked.length, list(leaked.map(v => JSON.stringify(v))));
  const repsJunk = [0, 21, 2.5, '5', null, undefined, -3, NaN];
  check('reps out of range, or not a whole number, read as one', repsJunk.every(r => G.normGoalLift({ ...ok, reps: r }).reps === 1));
  check('a custom exercise’s id is a valid one', !!G.normGoalLift({ ...ok, exId: 'custom-safety-bar-squat-x1y2z' }));
  const n = C.normSettings({ v: 1, mute: {}, answers: {}, asked: {} });
  check('normSettings on a node with no target keeps the shipped shape — no goalLift key',
        JSON.stringify(Object.keys(n)) === JSON.stringify(['v', 'mute', 'on', 'answers', 'asked']), Object.keys(n).join(','));
  check('and on a node with a junk one, the same', !('goalLift' in C.normSettings({ goalLift: { exId: 'Bench!', lb: 3 } })));
  check('and keeps a valid one', JSON.stringify(C.normSettings({ goalLift: ok }).goalLift) === JSON.stringify(ok));
}

/* ================= E. DID YOUR GOAL CHANGE? ================= */
section('E. the goal-change questions — G1 to G8');
{
  // Weigh-ins every day for 30 days: falling about 0.5%/wk, or climbing.
  const scale = pctWk => Array.from({ length: 31 }, (_, i) => ({ lb: Math.round(180 * (1 + pctWk / 100 * (i - 30) / 7) * 100) / 100, t: localAt(30 - i, 7) }));
  const q = (aimV, askedAgo, pctWk, extra) => {
    const answers = { q_goal_aim: aimV, ...(extra && extra.answers) };
    const asked = { q_goal_aim: NOW - askedAgo * DAY, ...(extra && extra.asked) };
    return input({ sessions: sortS(benchLog(185, 2.5)), weighIns: scale(pctWk),
      weight: { latestLb: 180, latestAt: NOW, rateWk: 180 * pctWk / 100, rateDays: 30, goalDir: aimV === 'cut' ? -1 : 1, goalRateWk: null },
      ...settings(answers, asked), ...(extra && extra.top) });
  };
  const asked = inp => { const c = C.coach(inp); return c.question ? c.question.id : null; };
  const g1 = C.coach(q('muscle', 20, -0.6));
  check('G1: Build muscle, three weeks of the scale falling, aim set 20 days ago — asked, with his numbers through units.js',
        g1.question && g1.question.id === 'q_goal_check_weight' &&
        /^You set Build muscle, and your weight has come down about [\d.]+ lb over the last 3 weeks\. Did the goal change\?$/.test(g1.question.text) &&
        JSON.stringify(g1.question.options.map(o => o.value)) === '["update","temp","keep"]', g1.question && g1.question.text);
  check('and on kilos, in kilos', /come down about [\d.]+ kg over/.test(C.coach({ ...q('muscle', 20, -0.6), u: 'kg' }).question.text));
  check('G2: the aim set five days ago — silent: behaviour needs time to follow a new goal', asked(q('muscle', 5, -0.6)) === null);
  check('G3: "temporary" answered ten days ago — silent', asked(q('muscle', 40, -0.6, {
        answers: { q_goal_check_weight: 'temp' }, asked: { q_goal_check_weight: NOW - 10 * DAY } })) === null);
  check('    and thirty days ago — asked again', asked(q('muscle', 40, -0.6, {
        answers: { q_goal_check_weight: 'temp' }, asked: { q_goal_check_weight: NOW - 30 * DAY } })) === 'q_goal_check_weight');
  check('    "on purpose" never comes back while the aim stands — even ninety days on', asked(q('muscle', 120, -0.6, {
        answers: { q_goal_check_weight: 'keep' }, asked: { q_goal_check_weight: NOW - 90 * DAY } })) === null);
  check('    "Yes, update my goal" reads like temporary afterwards', asked(q('muscle', 40, -0.6, {
        answers: { q_goal_check_weight: 'update' }, asked: { q_goal_check_weight: NOW - 10 * DAY } })) === null &&
        asked(q('muscle', 40, -0.6, { answers: { q_goal_check_weight: 'update' }, asked: { q_goal_check_weight: NOW - 29 * DAY } })) === 'q_goal_check_weight');
  const g4 = C.coach(q('cut', 20, 0.4));
  check('G4: Lose fat, keep strength and three weeks of gaining — asked',
        g4.question && g4.question.id === 'q_goal_check_weight' && /gone up about/.test(g4.question.text), g4.question && g4.question.text);
  check('G5: Build muscle while gaining — Micah’s own case — silent', asked(q('muscle', 20, 0.3)) === null);
  check('    and Recomp moving fast either way is asked; Stay consistent too',
        asked(q('recomp', 20, 0.7)) === 'q_goal_check_weight' && asked(q('maintain', 20, -0.7)) === 'q_goal_check_weight');
  check('    Get stronger losing slowly — under a quarter percent a week — is not', asked(q('strength', 20, -0.2)) === null);
  check('G7: a Basic account is never asked — "Yes" opens Your goal, which is Pro', asked({ ...q('muscle', 20, -0.6), tier: { pro: false } }) === null);
  check('    and Questions switched off, never asked', asked({ ...q('muscle', 20, -0.6), settings: {
        ...q('muscle', 20, -0.6).settings, mute: { questions: true } } }) === null);
  check('    and fewer than three weeks of weigh-ins, never asked', asked({ ...q('muscle', 20, -0.6), weighIns: scale(-0.6).slice(-15) }) === null);
  const tq = C.coach(q('muscle', 20, 0.3, { top: { weight: { latestLb: 180, latestAt: NOW, rateWk: 0.5, rateDays: 30, goalDir: 1, goalRateWk: -1 } } }));
  check('his food targets set to lose on Build muscle — the second question, with the rate he set',
        tq.question && tq.question.id === 'q_goal_check_targets' &&
        tq.question.text === 'You set Build muscle, and your food targets are set to lose about 1 lb a week. Did the goal change?',
        tq.question && tq.question.text);
  const ids = ['q_goal_check_weight', 'q_goal_check_targets'];
  const qs = C.QUESTIONS.filter(x => ids.includes(x.id));
  check('G8: both are marked `settings: false`, and Settings’ answer rows skip what is so marked',
        qs.length === 2 && qs.every(x => x.settings === false) && /q\.settings !== false/.test(src('coach-ui.js')));
  check('and neither is ever a `where` question — they are the sheet’s opener, through the shipped machinery', qs.every(x => !x.where));
  // An answer he gave shows up in the goal answer — never as a verdict.
  const kept = C.coach(q('muscle', 40, -0.6, { answers: { q_goal_check_weight: 'keep' }, asked: { q_goal_check_weight: NOW - 5 * DAY } })).ask('ask_goal');
  check('what he answered is what the goal answer says back: "and you told Coach that’s on purpose."',
        /you told Coach that’s on purpose\./.test(kept.text), kept.text);
}

/* ================= F. CHANGING THE AIM CLEARS BOTH ANSWERS ================= */
section('F. G6 — setAim() writes the aim, its stamp and both goal-change answers cleared, in one write; setGoalLift() writes whole or nothing');
{
  const here = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
  writeFileSync(join(dir, 'store-data-stub.mjs'), `
export const writes = [];
export let node = null;
export function setNode(v) { node = v; }
const mem = new Map();
export const LS = { get(k, f) { return mem.has(k) ? JSON.parse(mem.get(k)) : f; }, set(k, v) { mem.set(k, JSON.stringify(v)); }, del(k) { mem.delete(k); } };
export function wu() { return 'lb'; }
export async function read(_p, f) { return f; }
export async function readExact(p) { return p === 'settings/coach' ? JSON.parse(JSON.stringify(node)) : null; }
export async function write(p, v) { writes.push([p, JSON.parse(JSON.stringify(v))]); node = v; return true; }
`);
  writeFileSync(join(dir, 'picker-stub.mjs'), 'export function allExercises() { return []; }\nexport function hiddenIds() { return []; }\nexport function libraryReady() { return false; }\n');
  writeFileSync(join(dir, 'tdee-stub.mjs'), 'export function maintenance() { return null; }\nexport function effectiveMaint() { return null; }\n' +
    'export function trendRate() { return { rateWk: null, days: null }; }\nexport function sortedEntries() { return []; }\n');
  writeFileSync(join(dir, 'insights-stub.mjs'), 'export function goalDirection() { return null; }\n');
  writeFileSync(join(dir, 'access-stub.mjs'), 'export function capabilities() { return { features: {} }; }\n');
  writeFileSync(join(dir, 'coach-data.mjs'), src('coach-data.js')
    .replace("from './store.js'", 'from ' + here('store-data-stub.mjs'))
    .replace("from './exercises.js'", 'from ' + real('exercises.js'))
    .replace("from './picker.js'", 'from ' + here('picker-stub.mjs'))
    .replace("from './tdee.js'", 'from ' + here('tdee-stub.mjs'))
    .replace("from './insights.js'", 'from ' + here('insights-stub.mjs'))
    .replace("from './access.js'", 'from ' + here('access-stub.mjs'))
    .replace("from './coach.js'", 'from ' + here('coach.mjs')));
  const S = await import(JSON.parse(here('store-data-stub.mjs')));
  const D = await import(JSON.parse(here('coach-data.mjs')));
  S.setNode({ v: 1, mute: {}, answers: { q_goal_aim: 'muscle', q_goal_check_weight: 'keep', q_goal_check_targets: 'temp', q_goal_direction: 'down' },
              asked: { q_goal_aim: 1, q_goal_check_weight: 2 }, goalLift: { exId: BENCH, lb: 315, reps: 1, at: 5 } });
  const before = Date.now();
  await D.setAim('cut');
  const [path, w] = S.writes[S.writes.length - 1] || [];
  check('G6: one write, to settings/coach', S.writes.length === 1 && path === 'settings/coach', JSON.stringify(S.writes.map(x => x[0])));
  check('with the new aim, its stamp now, and both goal-change answers gone',
        w.answers.q_goal_aim === 'cut' && w.asked.q_goal_aim >= before && !('q_goal_check_weight' in w.answers) &&
        !('q_goal_check_targets' in w.answers), JSON.stringify(w.answers));
  check('and nothing else touched — the direction answer and the lift target stay',
        w.answers.q_goal_direction === 'down' && JSON.stringify(w.goalLift) === JSON.stringify({ exId: BENCH, lb: 315, reps: 1, at: 5 }));
  await D.setGoalLift({ exId: BENCH, lb: 'heavy', reps: 1, at: 7 });
  check('a junk lift target is not written — the key simply goes', !('goalLift' in S.writes[S.writes.length - 1][1]));
  await D.setGoalLift({ exId: BENCH, lb: 250, reps: 5, at: 9 });
  check('a valid one is written whole', JSON.stringify(S.writes[S.writes.length - 1][1].goalLift) === JSON.stringify({ exId: BENCH, lb: 250, reps: 5, at: 9 }));
  await D.setGoalLift(null);
  check('and Clear writes it away', !('goalLift' in S.writes[S.writes.length - 1][1]));
  check('setAim() is the one way an aim is written — Settings, the sheet and onboarding all call it',
        /setAim\(/.test(src('coach-ui.js')) && /setAim\(a\.aim\)/.test(src('onboarding.js')) &&
        !/answerQuestion\('q_goal_aim'/.test(src('coach-ui.js') + src('onboarding.js')));
}

console.log('\nthe goal is tracked in weeks, never dates, and questioned only when earned\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
