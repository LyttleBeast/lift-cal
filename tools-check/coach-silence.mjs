#!/usr/bin/env node
//
// Verifier for the thing Coach does most: say nothing.
//
//   node tools-check/coach-silence.mjs
//
// A WRONG NUMBER IS WORSE THAN NO NUMBER. That is the house law and it is the
// only rule in this ship that outranks every other one. Everything below is a
// way of proving that a rule whose data is thin really does stay quiet, rather
// than reaching for a denominator of one and calling it a trend.
//
// The failure this exists to catch is not a crash — it is a sentence. An
// account three days old being told its chest is overdue against a median gap
// computed from two sessions; a macro split quoted off a single logged day; a
// weekly average whose four-week denominator is one week long. Every one of
// those renders perfectly, reads convincingly, and is false.
//
// So each finding is driven three times: on an EMPTY account, on a THIN one,
// and on one with enough behind it. The first two must produce nothing, and the
// third must produce something — because a rule that is silent on all three is
// not careful, it is broken, and silence alone cannot tell the two apart.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-silence-'));
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
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(', ') + (xs.length > 8 ? ' … (' + xs.length + ')' : '');

/* ---------- fixtures ---------- */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const LIB = {
  bench: { group: 'chest', equipment: 'barbell' }, row: { group: 'back', equipment: 'barbell' },
  squat: { group: 'legs', equipment: 'barbell' }, press: { group: 'shoulders', equipment: 'barbell' },
  curl:  { group: 'arms', equipment: 'dumbbell' }
};
const sets = (n, w, r) => Array.from({ length: n }, () => ({ w: String(w), r: String(r), type: 'N', done: true }));
const sess = (ago, rows, tag) => ({
  id: 's' + ago + (tag || ''), startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY),
  exercises: rows.map(([ex, n, w, r]) => ({
    exId: ex, name: ex, group: LIB[ex].group, equipment: LIB[ex].equipment, sets: sets(n, w, r || 5)
  }))
});
const sorted = ss => ss.slice().sort((a, b) => a.startedAt - b.startedAt);

const NO_WEIGHT = { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null };
const shell = extra => ({
  now: NOW, openMs: NOW, u: 'lb', log: 'readable',
  sessions: [], lib: LIB, routines: [], live: { active: false }, tier: { pro: true },
  targets: null, targetsSet: false, summaries: {}, steps: { days: {} }, weight: { ...NO_WEIGHT },
  settings: { v: 1, mute: {}, answers: {}, asked: {}, lastGreet: '' },
  ...extra
});

// Nothing at all.
const EMPTY = shell({ log: 'empty' });
// Two sessions, one weigh-in, one day of food. Everything a real account has on
// its third day, and not one thing more.
const THIN = shell({
  sessions: sorted([sess(1, [['bench', 3, 135]], 'a'), sess(3, [['squat', 3, 185]], 'b')]),
  targets: { cal: 2300, p: 210, f: 74 }, targetsSet: true,
  summaries: { [key(NOW - DAY)]: { cal: 2100, p: 150, c: 250, f: 70 } },
  steps: { days: { [key(NOW - DAY)]: { steps: 8000 } } },
  weight: { ...NO_WEIGHT, latestLb: 186.4, latestAt: NOW - DAY }
});

// Twelve weeks of a regular three-day week, chest deliberately stale.
const regular = [];
for (let w = 0; w < 12; w++) {
  if (w > 1) regular.push(sess(w * 7 + 2, [['bench', 3, 185 + w], ['press', 3, 95, 8]], 'p'));
  regular.push(sess(w * 7 + 4, [['row', 3, 155, 8], ['curl', 3, 40, 10]], 'r'));
  regular.push(sess(w * 7 + 6, [['squat', 3, 245]], 'l'));
}
const macroDays = {};
for (let i = 1; i <= 8; i++) macroDays[key(NOW - i * DAY)] = { cal: 2450, p: 110, c: 310, f: 95 };
macroDays[key(NOW)] = { cal: 900, p: 70, c: 90, f: 30 };

const RICH = extra => shell({
  sessions: sorted(regular),
  targets: { cal: 2300, p: 210, f: 74, auto: { rateWk: -1 } }, targetsSet: true,
  summaries: macroDays,
  steps: { days: Object.fromEntries([0, 1, 2, 3, 4].map(i => [key(NOW - i * DAY), { steps: i ? 9100 : 4200 }])) },
  weight: { latestLb: 186.4, latestAt: NOW - 9 * DAY, rateWk: -0.8, rateDays: 21, goalDir: -1, goalRateWk: -1 },
  ...extra
});

/* Each finding, with the route that asks for it and a log that should produce
   it. The pairing is the point: a rule with no third column is a rule nobody
   has proved can speak. */
const CASES = [
  ['group_overdue',              'ask_overdue',  RICH()],
  ['session_shape_most_overdue', 'ask_shape',    RICH()],
  ['train_today_recommendation', 'topic_train',  RICH()],
  ['stalled_lift',               'ask_stall',    RICH({
    sessions: sorted(regular.concat([
      sess(35, [['curl', 3, 60, 8]], 'c1'), sess(25, [['curl', 3, 55, 8]], 'c2'),
      sess(15, [['curl', 3, 50, 8]], 'c3'), sess(5,  [['curl', 3, 45, 8]], 'c4')]))
  })],
  ['recent_pr',                  'ask_records',  RICH({
    sessions: sorted([sess(20, [['squat', 3, 275, 3]], 'a'), sess(13, [['squat', 3, 285, 3]], 'b'),
                      sess(2,  [['squat', 3, 315, 3]], 'c')])
  })],
  // Three entries exactly — the stall rule's four-entry gate cannot claim it —
  // and a last set matching the standing best, so one more rep would beat it
  // and none of the three record kinds moved.
  ['pr_proximity',               'ask_records',  RICH({
    sessions: sorted([sess(24, [['row', 2, 200, 8]], 'a'), sess(16, [['row', 2, 200, 6]], 'b'),
                      sess(3,  [['row', 2, 200, 8]], 'c')])
  })],
  ['group_under_weekly_normal',  'ask_volume',   RICH({
    sessions: sorted(regular.filter(s => s.startedAt < NOW - 7 * DAY))
  })],
  ['weekly_sessions_vs_trailing', 'ask_volume',  RICH({
    sessions: sorted(regular.concat([0, 1, 3].map(d => sess(d, [['squat', 3, 245]], 'x'))))
  })],
  ['same_group_overused',        'ask_rest',     RICH({
    sessions: sorted(regular.concat([0, 1, 3, 5, 7, 9, 11].map(d => sess(d, [['bench', 3, 185]], 'x'))))
  })],
  ['returning_from_layoff',      'topic_train',  RICH({
    sessions: sorted(regular.filter(s => s.startedAt < NOW - 31 * DAY)
      .concat([sess(31, [['bench', 3, 185]], 'z')]))
  })],
  ['fuel_calories_left_today',   'ask_calories', RICH()],
  ['fuel_macro_share_vs_targets', 'ask_macros',  RICH()],
  ['fuel_protein_vs_trailing',   'ask_protein',  RICH()],
  ['weight_rate_vs_goal',        'ask_rate',     RICH()],
  ['weight_no_recent_weighin',   'ask_weighin',  RICH()],
  ['steps_today_vs_trailing',    'ask_steps',    RICH()]
];

/* ================= A. EVERY FINDING HAS A BAR, AND CLEARS IT ================= */
section('A. each rule: silent on nothing, silent on thin, and audible on enough');
{
  const covered = new Set();
  CASES.forEach(([id, route, rich]) => {
    const e = C.coach(EMPTY).ask(route);
    const t = C.coach(THIN).ask(route);
    const r = C.coach(rich).ask(route);
    check(id + ' — silent on an empty account', e.id !== id, e.id + ': ' + e.text);
    check(id + ' — silent on two sessions and one logged day', t.id !== id, t.id + ': ' + t.text);
    check(id + ' — and it DOES fire once there is enough', r.id === id, r.id + ': ' + r.text);
    if (r.id === id) covered.add(id);
  });

  const findings = C.INTENTS.filter(i => i.kind === 'finding').map(i => i.id);
  const untested = findings.filter(id => !CASES.some(c => c[0] === id));
  check('every registered finding has a case above — a rule nobody proved can speak is a rule that cannot',
        !untested.length, list(untested));
  check('and every one of them really spoke', covered.size === findings.length,
        list(findings.filter(id => !covered.has(id))));
}

/* ================= B. THE THIN ACCOUNT ================= */
section('B. a thin account gets card_state_thin and nothing else');
{
  const thin = C.coach(THIN);
  check('the You card is card_state_thin', thin.you.state === 'card_state_thin', thin.you.state + ' ' + thin.you.id);
  check('the Train card is too', thin.train.state === 'card_state_thin', thin.train.state);
  check('it says how many sessions it has', /\b2 sessions\b/.test(thin.you.text), thin.you.text);
  check('and what it is waiting for, without promising a number it does not have',
        /three|four|twelve weeks/.test(thin.you.reason), thin.you.reason);

  const findingIds = C.INTENTS.filter(i => i.kind === 'finding').map(i => i.id);
  const spoke = C.ROUTE_IDS.filter(r => findingIds.includes(C.coach(THIN).ask(r).id));
  check('and not one finding answers on it, through any route in the router',
        !spoke.length, list(spoke.map(r => r + ' -> ' + C.coach(THIN).ask(r).id)));

  // The opposite bar: a thin account must not be told it is CLEAR, which reads
  // as "Coach looked and there was nothing", when Coach could not look at all.
  check('it is never card_state_clear — that would claim a check it could not make',
        thin.you.state !== 'card_state_clear');
}

/* ================= C. THE EMPTY ACCOUNT ================= */
section('C. a brand-new account is greeted, not assessed');
{
  const e = C.coach(EMPTY);
  check('the card is card_first_run', e.you.state === 'card_first_run', e.you.state);
  check('with no placeholder number anywhere in it', !/\d/.test(e.you.text + e.you.reason),
        e.you.text + ' // ' + e.you.reason);
  check('and no advice — it states what it needs and stops',
        !/\byou should\b|\btry\b|\bmake sure\b|\bneed to\b/i.test(e.you.text + e.you.reason),
        e.you.text + ' // ' + e.you.reason);
  const findingIds = C.INTENTS.filter(i => i.kind === 'finding').map(i => i.id);
  const spoke = C.ROUTE_IDS.filter(r => findingIds.includes(C.coach(EMPTY).ask(r).id));
  check('nothing at all answers through the router', !spoke.length, list(spoke));
  check('and the greeting still works — an empty log is not an error',
        typeof e.greet.text === 'string' && e.greet.text.length > 0, e.greet.text);
}

/* ================= D. THE UNREADABLE LOG ================= */
section('D. an unreadable log is not an empty one');
{
  const u = C.coach(shell({ log: 'unknown' }));
  check('it says so, rather than saying the log is empty',
        u.you.id === 'guard_log_unreadable' && !/empty|nothing in your/i.test(u.you.text), u.you.text);
  check('and every route in the router answers the same way',
        C.ROUTE_IDS.every(r => u.ask(r).id === 'guard_log_unreadable'));

  /* The reason the three-valued fact exists at all. An account with two
     hundred sessions and one failed read must NOT be shown the first-run card —
     analytics.allSessions() resolves [] on a failed read, so through that path
     these two are the same answer, which is why coach-data.js reads the tree
     with readExact() instead. */
  const rich = RICH({ log: 'unknown', sessions: sorted(regular) });
  const r = C.coach(rich);
  check('a full log that could not be read is never card_first_run',
        r.you.id === 'guard_log_unreadable', r.you.id);
  check('and the same sessions read fine produce a finding',
        C.coach(RICH()).you.state === 'finding');
  check('coach-data.js is the half that tells the two apart, with readExact',
        /readExact\('workouts'\)/.test(src('coach-data.js')) &&
        /logState = sessions\.length \? 'readable' : 'empty'/.test(src('coach-data.js')));
}

/* ================= E. THE FUEL GUARD ================= */
section('E. Coach will not measure food against a target nobody set');
{
  /* food.js:54 leaves a MODULE DEFAULT of 2,700 kcal in memory when onboarding
     is skipped, so the number being present proves nothing. The node's absence
     is the only honest test, and it is three-valued: a read that FAILED is not
     an absent node either. */
  const none = RICH({ targets: null, targetsSet: false });
  const fuelIds = C.INTENTS.filter(i => i.category === 'fuel' && i.kind === 'finding').map(i => i.id);
  const c = C.coach(none);
  const spoke = ['topic_fuel', 'ask_calories', 'ask_macros', 'ask_protein']
    .filter(r => fuelIds.includes(c.ask(r).id));
  check('with no targets node, no fuel finding answers', !spoke.length, list(spoke));
  check('and the guard says so out loud rather than leaving a blank',
        c.ask('topic_fuel').id === 'fuel_no_targets_set', c.ask('topic_fuel').id + ': ' + c.ask('topic_fuel').text);
  check('the guard names the node rather than the number',
        /targets/i.test(c.ask('topic_fuel').text) && !/2,?700/.test(c.ask('topic_fuel').text),
        c.ask('topic_fuel').text);
  check('and the fuel card never reaches the You card either',
        !fuelIds.includes(c.you.id), c.you.id);

  // A FAILED read is neither set nor unset, and both branches stay quiet.
  const unknown = C.coach(RICH({ targets: null, targetsSet: null }));
  check('a targets read that FAILED produces neither a finding nor the guard',
        !fuelIds.includes(unknown.ask('topic_fuel').id) &&
        unknown.ask('topic_fuel').id !== 'fuel_no_targets_set',
        unknown.ask('topic_fuel').id);

  // And with targets really set, it speaks.
  check('with targets set, the fuel findings answer again',
        fuelIds.includes(C.coach(RICH()).ask('topic_fuel').id));
}

/* ================= F. THE DIRECTION NOBODY STATED ================= */
section('F. a rate with no stated direction has no reading');
{
  const noDir = RICH({
    targets: { cal: 2300, p: 210, f: 74 },
    weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null }
  });
  const c = C.coach(noDir);
  check('weight_rate_vs_goal is silent when the direction is unknown',
        c.ask('ask_rate').id !== 'weight_rate_vs_goal', c.ask('ask_rate').id);
  check('and Coach asks rather than guessing', c.question && c.question.id === 'q_goal_direction');

  const said = C.coach({ ...noDir, settings: { ...noDir.settings, answers: { q_goal_direction: 'hold' } } });
  check('once told, it reads the rate against what it was told',
        said.ask('ask_rate').id === 'weight_rate_vs_goal', said.ask('ask_rate').text);

  // No rate at all: silent whatever the direction says.
  const noRate = C.coach(RICH({ weight: { ...NO_WEIGHT, goalDir: -1 } }));
  check('no rate means no sentence, however well stated the goal is',
        noRate.ask('ask_rate').id !== 'weight_rate_vs_goal', noRate.ask('ask_rate').id);
}

/* ================= G. WHAT SILENCE SOUNDS LIKE ================= */
section('G. silence says so, and never invents a number to fill the gap');
{
  const empties = [];
  [EMPTY, THIN, shell({})].forEach((fx, i) => {
    C.ROUTE_IDS.forEach(r => {
      const a = C.coach(fx).ask(r);
      if (a.id === r) {                                   // the router's own "nothing to say"
        if (/\d/.test(a.text)) empties.push(i + '/' + r + ': ' + a.text);
        if (!/nothing/i.test(a.text)) empties.push(i + '/' + r + ': ' + a.text);
      }
    });
  });
  check('a "nothing to say" answer contains no number and says nothing', !empties.length, list(empties));

  const thin = C.coach(THIN);
  check('and a follow-up with no answer behind it is never offered',
        thin.ask('topic_train').followups.every(f =>
          C.coach(THIN).ask(f.id).id !== f.id),
        list(thin.ask('topic_train').followups.map(f => f.id)));

  // Every response, driven against the emptiest possible input, must either
  // build a sentence or yield nothing — never the word undefined or a NaN.
  const junk = [];
  [EMPTY, THIN, shell({}), shell({ log: 'unknown' })].forEach(fx => {
    const c = C.coach(fx);
    const all = [c.you.text, c.you.reason, c.train.text, c.train.reason, c.greet.text]
      .concat(C.ROUTE_IDS.flatMap(r => [c.ask(r).text, c.ask(r).reason]));
    all.forEach(t => { if (/undefined|NaN|null|Infinity|\[object/.test(String(t))) junk.push(String(t)); });
  });
  check('no sentence anywhere contains undefined, NaN, null or Infinity', !junk.length, list(junk));

  // And the card always says SOMETHING. A blank card is not silence, it is a
  // bug that looks like a loading state.
  const blanks = [EMPTY, THIN, shell({}), shell({ log: 'unknown' }), RICH()]
    .map(fx => C.coach(fx))
    .filter(c => !c.you.text || !c.train.text);
  check('and the card is never blank — silence is a sentence, not an empty box', !blanks.length,
        String(blanks.length));
}

/* ================= H. THE HEALTH LINE ================= */
section('H. what Coach may say, and what it never does');
{
  const every = [];
  [EMPTY, THIN, RICH(), RICH({ weight: { latestLb: 171, latestAt: NOW - DAY, rateWk: -2.9, rateDays: 21, goalDir: -1, goalRateWk: -1 } })]
    .forEach(fx => ['lb', 'kg'].forEach(u => {
      const c = C.coach({ ...fx, u });
      every.push(c.you.text, c.you.reason, c.train.text, c.train.reason, c.greet.text);
      C.ROUTE_IDS.forEach(r => { const a = c.ask(r); every.push(a.text, a.reason); });
    }));
  /* The injury refusal is the ONE sentence in Coach allowed to name pain, and
     it is checked on its own terms below. Scanning it with the rest would make
     the ban on medicine fail on the sentence that exists to refuse it. */
  const refusal = C.RESPONSES.resp_not_injuries;
  const exempt = [refusal.text(), refusal.reason()];
  const said = every.filter(Boolean).filter(t => !exempt.includes(t));

  // Never an instruction, never a diet, never a population norm.
  const BANNED = [
    [/\beat (less|more|fewer)\b/, 'telling somebody what to eat'],
    [/\bcut (your )?calories\b/, 'telling somebody to cut calories'],
    [/\bshould (eat|train|lift|rest|stop)\b/, 'an instruction'],
    [/\b(recommended|healthy range|normal range|guideline|average person|most people)\b/, 'a population norm'],
    [/\b(one[- ]rep max attempt|test your max|go for a max)\b/, 'a max attempt'],
    [/\b(doctor|diagnos|injur|physio)/, 'medicine'],
    [/\bmore of it is muscle\b/, 'the physiological generalisation at insights.js:283']
  ];
  BANNED.forEach(([re, why]) => {
    const hit = said.find(t => re.test(String(t).toLowerCase()));
    check('nothing Coach says is ' + why, !hit, hit);
  });
  check('and the refusal really was reached and exempted, not merely absent',
        said.length < every.filter(Boolean).length);

  // The one place pain is mentioned is the refusal, and it is reachable.
  const inj = C.coach(RICH()).ask('injury');
  check('and the injury refusal exists, says it does not do injuries, and offers no advice',
        inj.id === 'coach_not_injuries' && /injur/i.test(inj.text) &&
        !/should|try|rest|ice/i.test(inj.text), inj.text);

  // Every finding carries a number. A finding that cannot be backed by one is
  // not a finding, and the states are the only sentences allowed without one.
  const numberless = [];
  CASES.forEach(([id, route, rich]) => {
    const a = C.coach(rich).ask(route);
    if (a.id === id && !/\d/.test(a.text)) numberless.push(id + ': ' + a.text);
  });
  check('every finding carries its number', !numberless.length, list(numberless));
}

/* ---------- report ---------- */
console.log('\nsilence is always an available answer, and it is never a bug\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
