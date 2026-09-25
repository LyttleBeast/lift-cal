#!/usr/bin/env node
//
// Verifier for the voice rule — what Coach is allowed to say UNPROMPTED.
//
//   node tools-check/coach-voice.mjs
//
// The clause at the top of the RESPONSES table is the subject of this file:
//
//     AN UNPROMPTED FINDING IS NEUTRAL OR ACTIONABLE, NEVER A JUDGEMENT.
//     COACH DESCRIBES THE NUMBERS, NEVER THE PERSON.
//
// It is a rule rather than a style note because it shipped broken. resp_stalled
// said "X hasn't moved: your best estimated max there is still 270lb" on the You
// card AND the Train card — unprompted, on the screen the app opens to, to
// somebody who had asked for nothing. Two things were wrong with it at once and
// both matter here. It characterised the lifter rather than the log; and a
// verdict is usually also a GUESS, because a flat estimated max on an account
// running a deficit is a lift held, not a lift stalled. The same words that
// judge are the words that get the reading wrong.
//
// So the fence has two halves, and the second is the one with teeth:
//
//   THE BAN CARRIES NO EXEMPTION LIST. hasn't, haven't, didn't, still, only,
//   failed, no progress, stopped moving — none of them in any copy a CARD can
//   reach. Not "none of them except these five", because a rule with five
//   exceptions is a rule nobody keeps true and the sixth exception is the one
//   that ships. Where one of those words was doing honest temporal or scoping
//   work the SENTENCE was rewritten, which is why a mechanical rule can hold.
//
//   SHEET-ONLY COPY IS EXEMPT ON PURPOSE. Somebody who tapped "Anything
//   stalled?" asked a question and is owed its answer, in the words the answer
//   needs. The ban is about what arrives uninvited, not about vocabulary.
//
// Which makes "what can a card reach" the load-bearing definition, and it is
// derived here from the real tables and the real engine — never from a list
// typed beside them, which is a list that goes stale the first time an intent
// changes surfaces and fails open, silently, exactly when it mattered:
//
//   every intent whose surfaces name 'you' or 'train'
//   + the states view() renders regardless of surfaces, read out of view() and
//     rank()'s own source
//   + every GREETINGS line, because the greeting is the card's top slot
//   + the `because` of every fact a card-reachable intent quotes, because
//     renderIntent composes the reason line out of the first one that resolves
//
// and then both the SOURCE of every one of those (which catches the branch no
// fixture exercises) and the RENDERED output across a battery of logs in both
// units (which catches copy assembled out of pieces no literal contains).
//
//   A  the reachable set    derived, non-empty, and every id a real intent
//   B  the source sweep     every card-reachable template and because
//   C  the rendered sweep   the same rule against what actually comes out
//   D  coach-ui.js          the three card states whose copy is not a template
//   E  stalled_lift         answer-only, and still answering
//   F  the stall answer     stage two's reading of that lift (v49): a figure
//                           through units.js, and "cut" only under the rule
//   J  the targets (v48)    every line and why coach-prog.mjs's battery
//                           produces, the targets answer, and the goal
//                           questions and their acknowledgements, under the
//                           shipped ban and the words the brief adds to it

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-voice-'));
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
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-build.js, the workout builder, is staged the same way: coach.js
   imports it, and it takes analytics.js's session math through the same stub. */
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-live.js, the in-session read (ship three), is staged the same way:
   coach.js imports it too, and it takes the same session math through the stub. */
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
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
  .replace("from './coach-build.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-build.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './coach-overlap.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-overlap.mjs')).href))
  .replace("from './coach-fuel.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-fuel.mjs')).href))
  .replace("from './coach-ready.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-ready.mjs')).href))
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
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
const list = xs => xs.slice(0, 6).join('\n         ') + (xs.length > 6 ? '\n         … (' + xs.length + ')' : '');

/* ---------- THE BAN ----------
   Case-insensitive and word-boundaried, so "stillness" and "onlooker" are
   words and not offences, and both apostrophes are matched because coach.js
   writes the curly one and a paste from anywhere else writes the straight one.
   No allowance for an id, a class name or a route: the ban is applied to COPY
   only, which is what the literal extraction below is for. */
const BANNED = [
  /\bhasn[’']t\b/i, /\bhaven[’']t\b/i, /\bdidn[’']t\b/i,
  /\bstill\b/i, /\bonly\b/i, /\bfailed\b/i,
  /\bno progress\b/i, /\bstopped moving\b/i
];
/* THE CARD BAN (v49). The card only encourages now, so what it may draw is
   held to more than what arrives uninvited: the shipped list above, plus the
   corrective vocabulary — the words that turn a readout into a telling-off.
   coach-hype.mjs reads this list from here rather than keeping a copy. */
const CARD_BANNED = [
  /\boverdue\b/i, /\bbehind\b/i, /\bmissed\b/i, /\bunder\b/i, /\bshould\b/i, /\btry\b/i,
  /\bneed\b/i, /\bskip\b/i, /\blow\b/i, /\bless\b/i, /\bonly\b/i, /\bstill\b/i
];
const offence = s => {
  const hit = BANNED.find(re => re.test(s));
  return hit ? (s.match(hit) || [''])[0] : null;
};

/* Comments come off before anything is read out of a source. Several comments
   in coach.js quote the banned sentence in order to explain why it is banned,
   and a verifier that failed on its own subject's documentation would teach
   everybody to delete the documentation. coach-pure.mjs strips them for the
   same reason. */
const decomment = s => s.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');

/* Every quoted run in a source, which is every piece of it that can be copy.
   Applying the ban to the whole source instead would trip on an identifier —
   `stillOk`, `onlyIf` — and teach the next pass to rename variables rather
   than to fix sentences. */
function literals(s) {
  const out = [];
  for (const m of s.matchAll(/'((?:[^'\\]|\\.)*)'/g)) out.push(m[1]);
  for (const m of s.matchAll(/"((?:[^"\\]|\\.)*)"/g)) out.push(m[1]);
  for (const m of s.matchAll(/`((?:[^`\\]|\\.)*)`/g)) out.push(m[1]);
  return out;
}
const copyOf = fn => literals(decomment(String(fn)));

const RAW  = src('coach.js');
const CODE = decomment(RAW);

/* One function's body out of the source, by brace matching from its opening.
   Used to read the states view() and rank() render whatever the table says, so
   that set is the engine's rather than this file's. */
function bodyAt(needle) {
  const at = CODE.indexOf(needle);
  if (at === -1) return '';
  let depth = 0;
  for (let j = CODE.indexOf('{', at); j < CODE.length; j++) {
    if (CODE[j] === '{') depth++;
    else if (CODE[j] === '}' && --depth === 0) return CODE.slice(at, j + 1);
  }
  return '';
}

const byId   = id => C.INTENTS.find(i => i.id === id);
const factOf = id => C.FACTS.find(f => f.id === id);

/* ================= THE FIXTURES =================
   One fixed epoch, every session an offset from it, so this file answers the
   same at 2 AM in Auckland as at noon in New York. Mirrors coach-units.mjs's
   builder deliberately: the two files fence different properties over the same
   logs, and a sentence that renders in one and not the other is a fixture bug
   rather than a finding. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const LIB = {
  bench:  { group: 'chest',     equipment: 'barbell' },
  row:    { group: 'back',      equipment: 'barbell' },
  squat:  { group: 'legs',      equipment: 'barbell' },
  press:  { group: 'shoulders', equipment: 'barbell' },
  curl:   { group: 'arms',      equipment: 'dumbbell' }
};
const NAMES = { bench: 'Barbell Bench Press', row: 'Barbell Row', squat: 'Back Squat (High Bar)',
                press: 'Overhead Press', curl: 'Dumbbell Curl' };
const sets = rows => rows.map(([w, r]) => ({ w: String(w), r: String(r), type: 'N', done: true }));
const sess = (ago, rows, tag) => ({
  id: 's' + ago + (tag || ''), startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY),
  exercises: rows.map(([ex, setRows]) => ({
    exId: ex, name: NAMES[ex], group: LIB[ex].group, equipment: LIB[ex].equipment, sets: sets(setRows)
  }))
});
const base = extra => ({
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable',
  sessions: [], lib: LIB, routines: [], live: { active: false }, tier: { pro: true },
  targets: { cal: 2300, p: 210, f: 74, auto: { rateWk: -1 } }, targetsSet: true,
  summaries: {}, steps: { days: {} },
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {}, lastGreet: '' },
  ...extra
});
const sort = ss => ss.slice().sort((a, b) => a.startedAt - b.startedAt);
const three = (w, r) => [[w, r], [w, r], [w, r]];

// Twelve weeks of a real log, with chest deliberately stale.
const regular = [];
for (let w = 0; w < 12; w++) {
  if (w > 1) regular.push(sess(w * 7 + 2, [['bench', three(185 + w, 5)], ['press', three(95, 8)]]));
  regular.push(sess(w * 7 + 4, [['row', three(155, 8)], ['curl', three(40, 10)]]));
  regular.push(sess(w * 7 + 6, [['squat', three(245, 5)]]));
}
const summaries = {};
for (let i = 1; i <= 8; i++) summaries[key(NOW - i * DAY)] = { cal: 2450, p: 120, c: 300, f: 92 };
summaries[key(NOW)] = { cal: 900, p: 70, c: 90, f: 30 };
const stepDays = { days: Object.fromEntries([0, 1, 2, 3, 4, 5].map(i =>
  [key(NOW - i * DAY), { steps: i === 0 ? 4200 : 9000 + i * 50 }])) };

const ALL_MUTED = {};
C.CATEGORIES.filter(c => c.mutable).forEach(c => { ALL_MUTED[c.id] = true; });

// A lift whose best is behind it: five entries, nothing recent beating it.
const stalledSessions = sort([
  sess(40, [['bench', three(225, 5)]]),
  sess(30, [['bench', three(215, 5)]]),
  sess(20, [['bench', three(210, 5)]]),
  sess(10, [['bench', three(205, 5)]]),
  sess(4,  [['bench', three(200, 5)]])
]);

const FIXTURES = {
  rich: base({
    sessions: sort(regular), summaries, steps: stepDays,
    weight: { latestLb: 186.4, latestAt: NOW - 2 * DAY, rateWk: -0.8, rateDays: 21, goalDir: -1, goalRateWk: -1 }
  }),
  stalled:   base({ sessions: stalledSessions }),
  pr: base({
    sessions: sort([
      sess(20, [['squat', three(275, 3)]]),
      sess(13, [['squat', three(285, 3)]]),
      sess(2,  [['squat', three(315, 3)]])
    ])
  }),
  proximity: base({
    sessions: sort([
      sess(24, [['row', [[200, 8], [200, 8]]]]),
      sess(16, [['row', [[200, 6], [200, 6]]]]),
      sess(3,  [['row', [[200, 8], [200, 8]]]])
    ])
  }),
  fast: base({
    sessions: sort(regular), summaries, steps: stepDays,
    weight: { latestLb: 171.2, latestAt: NOW - DAY, rateWk: -2.4, rateDays: 21, goalDir: -1, goalRateWk: -1 }
  }),
  gaining: base({
    sessions: sort(regular), summaries,
    weight: { latestLb: 201.8, latestAt: NOW, rateWk: 2.9, rateDays: 21, goalDir: 1, goalRateWk: null }
  }),
  stale: base({
    sessions: sort(regular), summaries,
    weight: { latestLb: 193.75, latestAt: NOW - 12 * DAY, rateWk: 0.3, rateDays: 18, goalDir: 0, goalRateWk: null }
  }),
  layoff: base({
    sessions: sort(regular.filter(s => s.startedAt < NOW - 31 * DAY).concat([sess(31, [['bench', three(185, 5)]], 'L')]))
  }),
  overused: base({
    sessions: sort(regular.concat([0, 1, 3, 5, 7, 9, 11].map(d => sess(d, [['bench', three(185, 5)]], 'x'))))
  }),
  // A week well off the account's own trailing average, in both directions.
  busyWeek: base({
    sessions: sort(regular.concat([0, 1, 3].map(d => sess(d, [['curl', three(40, 10)]], 'b'))))
  }),
  quietWeek: base({ sessions: sort(regular.filter(s => s.startedAt < NOW - 8 * DAY)) }),

  /* Three logs that exist for the greeting pool alone. Every line in GREETINGS
     is card copy and the rendered sweep is worth what its coverage is worth, so
     the gates that no other fixture satisfies get one each: a record on a lift
     whose name is short enough to say, a day ahead of the step average, and a
     gap since the last session on a card whose finding is not about recency. */
  /* Progression muted on purpose: a greeting whose topic matches the finding
     underneath is dropped so the card does not stutter, so the line about a
     lift that is moving is only reachable on a card whose finding is about
     something else. */
  prShort: base({
    sessions: sort([
      sess(21, [['press', three(95, 5)]], 'p'),
      sess(12, [['press', three(105, 5)]], 'p'),
      sess(2,  [['press', three(135, 5)]], 'p')
    ]),
    settings: { v: 1, mute: { progression: true }, answers: {}, asked: {}, lastGreet: '' }
  }),
  walked: base({
    sessions: sort(regular), summaries,
    steps: { days: Object.fromEntries([0, 1, 2, 3, 4, 5].map(i =>
      [key(NOW - i * DAY), { steps: i === 0 ? 14200 : 9000 + i * 50 }])) },
    weight: { latestLb: 186.4, latestAt: NOW - 2 * DAY, rateWk: -0.8, rateDays: 21, goalDir: -1, goalRateWk: -1 }
  }),
  quietMuted: base({
    sessions: sort(regular.filter(s => s.startedAt < NOW - 8 * DAY)),
    settings: { v: 1, mute: ALL_MUTED, answers: {}, asked: {}, lastGreet: '' }
  }),

  // The states. Each one is a card the reader sees more often than any finding.
  unreadable: base({ sessions: sort(regular), log: 'unknown' }),
  firstRun:   base({ log: 'empty' }),
  live:       base({ sessions: sort(regular), live: { active: true } }),
  thin:       base({ sessions: sort([sess(3, [['bench', three(185, 5)]], 'a'), sess(9, [['bench', three(185, 5)]], 'b')]) }),
  clear:      base({ sessions: sort(regular), summaries, steps: stepDays,
                     settings: { v: 1, mute: ALL_MUTED, answers: {}, asked: {}, lastGreet: '' } }),
  // Free, on a log whose only firing findings are behind the tier.
  locked: base({
    tier: { pro: false },
    sessions: sort(regular.concat([0, 1, 3, 5, 7, 9, 11].map(d => sess(d, [['bench', three(185, 5)]], 'x'))))
  })
};

/* ================= A. WHAT A CARD CAN REACH ================= */
section('A. the reachable set, derived from the tables and from view()’s own source');

const bySurface = C.INTENTS.filter(i => (i.surfaces || []).some(s => s === 'you' || s === 'train')).map(i => i.id);

/* The states view() and rank() render whether or not their surfaces say so —
   a fall-through is not chosen from candidates, it is what happens when there
   are none. Read out of the two functions rather than typed here, so a fourth
   one added to the engine is fenced the day it is added. */
const ALL_IDS = C.INTENTS.map(i => i.id);
const namedIn = body => ALL_IDS.filter(id =>
  new RegExp("'" + id + "'").test(body) || new RegExp('INTENT_BY_ID\\.' + id + '\\b').test(body));
const rankBody = bodyAt('function rank(d, u) {');
const viewBody = bodyAt('function view(surface, claimed) {');
const alwaysRendered = [...new Set(namedIn(rankBody).concat(namedIn(viewBody)))];

const cardIntentIds = [...new Set(bySurface.concat(alwaysRendered))];
{
  check('rank() and view() were both located in the source, so the derivation read something',
        rankBody.length > 200 && viewBody.length > 200,
        'rank ' + rankBody.length + ' chars, view ' + viewBody.length);
  /* Named here as a floor on the DERIVATION, never as the source of the ban:
     if the regex above ever stops matching, this is what stops the whole file
     passing vacuously. */
  check('the three fall-through states came out of view() itself',
        ['card_state_thin', 'card_state_clear', 'card_state_locked'].every(id => alwaysRendered.includes(id)),
        list(alwaysRendered));
  check('and the three blocking states came out of rank()’s step 0',
        ['guard_log_unreadable', 'card_first_run', 'card_live_session'].every(id => alwaysRendered.includes(id)),
        list(namedIn(rankBody)));
  check('every id in the reachable set is a registered intent',
        cardIntentIds.every(id => !!byId(id)), list(cardIntentIds.filter(id => !byId(id))));
  check('the set is most of the registry and not all of it — the sheet-only rules are out',
        cardIntentIds.length >= 15 && cardIntentIds.length < C.INTENTS.length,
        cardIntentIds.length + ' of ' + C.INTENTS.length);
  check('stalled_lift is not in it, and fuel_no_targets_set is not either',
        !cardIntentIds.includes('stalled_lift') && !cardIntentIds.includes('fuel_no_targets_set'));
}

// The templates and the reason lines a card can reach.
const cardResponses = [...new Set(cardIntentIds.map(id => byId(id).response))];
// Plus the facts those intents quote: renderIntent builds the reason line out
// of the first `because` that resolves, so a because is card copy.
const cardFacts = new Set();
cardIntentIds.forEach(id => (byId(id).factsNeeded || []).forEach(f => cardFacts.add(f)));
// And this one by hand, because resp_weight_rate.reason calls it by hand.
cardFacts.add('weight.rateWk');
{
  check('every card-reachable intent names a response that exists',
        cardResponses.every(r => !!C.RESPONSES[r]), list(cardResponses.filter(r => !C.RESPONSES[r])));
  check('every fact those intents quote exists in the fact table',
        [...cardFacts].every(f => !!factOf(f)), list([...cardFacts].filter(f => !factOf(f))));
  check('resp_stalled is NOT among the card-reachable templates',
        !cardResponses.includes('resp_stalled'), list(cardResponses));
  check('and lift.stalled’s because is not card copy either',
        !cardFacts.has('lift.stalled'));
}

/* ================= B. THE SOURCE SWEEP ================= */
section('B. the ban, against the source of every card-reachable template and because');
{
  const bad = [];
  let seen = 0;
  const sweep = (where, fn) => {
    if (typeof fn !== 'function') return;
    copyOf(fn).forEach(s => {
      seen++;
      const w = offence(s);
      if (w) bad.push(where + ' — “' + w + '” in: ' + s);
    });
  };

  cardResponses.forEach(id => {
    sweep(id + '.text', C.RESPONSES[id].text);
    sweep(id + '.reason', C.RESPONSES[id].reason);
  });
  [...cardFacts].forEach(id => sweep(id + '.because', (factOf(id) || {}).because));
  C.GREETINGS.forEach(g => sweep('greeting ' + g.id, g.text));

  check('no card-reachable template, because or greeting writes a banned word anywhere in its source',
        !bad.length, list(bad));
  /* A sweep over nothing passes. This is the floor that says it read the real
     tables — every template has at least one sentence in it. */
  check('and the sweep really read the copy (' + seen + ' quoted runs across ' +
        cardResponses.length + ' templates, ' + cardFacts.size + ' facts, ' + C.GREETINGS.length + ' greetings)',
        seen >= 60 && cardResponses.length >= 12 && cardFacts.size >= 15);
}

/* ================= C. THE RENDERED SWEEP ================= */
section('C. the ban, against what the engine actually prints, imperial and metric');
const rendered = [];
{
  /* A card template rendered through the sheet is the same card template, so
     the router's answers are swept too whenever the intent behind them is one
     a card can reach. That is coverage, not scope creep: it is how a template
     nothing in these fixtures ranks onto a card still gets rendered. */
  const collect = (fixture, name, u, opens) => {
    const c = C.coach({ ...FIXTURES[fixture], u, opens });
    const take = (where, id, text, reason) => rendered.push({ at: name, where, id, text: text || '', reason: reason || '' });
    take('you', c.you.id, c.you.text, c.you.reason);
    take('train', c.train.id, c.train.text, c.train.reason);
    take('greet', c.greet.id, c.greet.text, '');
    if (c.lead) take('lead', c.lead.id, c.lead.label, '');
    C.ROUTE_IDS.forEach(r => {
      const a = c.ask(r);
      if (cardIntentIds.includes(a.id)) take('ask:' + r, a.id, a.text, a.reason);
    });
  };

  Object.keys(FIXTURES).forEach(fx => ['lb', 'kg'].forEach(u => {
    // The greeting pool is walked by the open counter, so every line in it is
    // rendered rather than whichever one open zero happens to land on.
    for (let opens = 0; opens < C.GREETINGS.length + 2; opens++) {
      collect(fx, fx + '/' + u + '/open' + opens, u, opens);
    }
  }));

  const bad = [];
  rendered.forEach(r => {
    [['text', r.text], ['reason', r.reason]].forEach(([part, s]) => {
      const w = offence(s);
      if (w) bad.push(r.at + ' ' + r.where + '/' + part + ' (' + r.id + ') — “' + w + '” in: ' + s);
    });
  });
  check('nothing a card prints, in either unit, carries a banned word', !bad.length, list(bad));

  /* Coverage, and it is the half that makes the check above worth anything:
     three checks over an engine that says nothing all pass. */
  const seenIds = new Set(rendered.map(r => r.id));
  const missed = cardIntentIds.filter(id => !seenIds.has(id));
  check('every card-reachable intent was rendered at least once across the fixtures',
        !missed.length, list(missed));
  check('and the sweep produced real sentences rather than empty strings (' + rendered.length + ' renders)',
        rendered.filter(r => r.text.length > 10).length > rendered.length * 0.9);
  /* Every line, not most of them. The pool is filtered by gates and walked by
     the open counter, so a line nothing here satisfies is a line the ban above
     never saw — and the fix for that is a fixture, which is what this check
     asks for by failing.

     It has a dependency worth naming, because it is invisible from here: the
     rotation stays inside the data-aware lines once two of them qualify, so
     the seven generics are reached only through the THIN fixtures — the ones
     with fewer than two. They are what keeps this check honest, and a fixture
     sweep that gave every account plenty to say would take the generics out of
     reach and hollow this out rather than turning it red. If it ever fails on
     a generic line, that is where to look first. */
  const greeted = new Set(rendered.filter(r => r.where === 'greet').map(r => r.id));
  check('every greeting line in the pool was rendered by the rotation, so the ban above saw all of them',
        C.GREETINGS.every(g => greeted.has(g.id)),
        list(C.GREETINGS.filter(g => !greeted.has(g.id)).map(g => g.id)));

  /* The two halves are both here because neither one is enough on its own, and
     these are the two checks that say so out loud.

     The rendered half reaches copy assembled out of pieces — a sentence built
     by concatenation holds the banned word while no single literal in the
     source does. */
  const ALL_LITERALS = new Set(literals(CODE));
  const composed = rendered.filter(r => r.text && !ALL_LITERALS.has(r.text));
  check('most of what a card prints is assembled and appears in no literal, which is why section B is not enough',
        composed.length > rendered.length * 0.5, composed.length + ' of ' + rendered.length + ' renders');

  // And the source half reaches branches no log here takes — a template that
  // renders one of its two sentences on these fixtures still gets both swept.
  const blob = rendered.map(r => r.text + ' ' + r.reason).join('\n');
  const unrendered = [];
  cardResponses.forEach(id => ['text', 'reason'].forEach(part => {
    const fn = C.RESPONSES[id][part];
    if (typeof fn !== 'function') return;
    copyOf(fn).forEach(s => { if (s.trim().length > 12 && !blob.includes(s)) unrendered.push(id + '.' + part + ': ' + s); });
  }));
  check('and some card copy lives in a branch none of these logs takes, which is why section C is not enough either',
        unrendered.length > 0, list(unrendered));
}

/* ================= D. THE CARD COPY THAT IS NOT A TEMPLATE ================= */
section('D. coach-ui.js — the card copy that is written in the view rather than in a template');
{
  const UI = src('coach-ui.js');

  /* From the brace that opens the BODY, not the one in `opts = {}`. */
  const bodyOf = name => {
    const at = UI.indexOf(name + '(');
    if (at === -1) return '';
    let depth = 0;
    for (let j = UI.indexOf(') {', at) + 2; j < UI.length; j++) {
      if (UI[j] === '{') depth++;
      else if (UI[j] === '}' && --depth === 0) return UI.slice(at, j + 1);
    }
    return '';
  };

  /* coachCard writes three states' worth of copy itself, and hands three
     helpers the rest of what the card says: the Pro count in the bottom row,
     the COACH ME label, and the lock's two aria strings. All four are card
     copy and all four are bound by the rule — the template sweep above cannot
     see any of them, because none of them is a template. */
  const FNS = ['export function coachCard', 'function leadText', 'function goRow', 'function header'];
  const bodies = FNS.map(bodyOf);
  const body = bodies.join('\n');
  check('every function in coach-ui.js that writes card copy was located',
        bodies.every(b => b.length > 40), list(FNS.map((n, i) => n + '=' + bodies[i].length)));

  /* The three states, identified by the branch that draws each rather than by
     the words in it — the words are the thing under test. */
  check('and coachCard still holds all three of the states this section exists for: ' +
        'the loading skeleton, the engine-threw fallback and the half-loaded substitution',
        /coachLogKnown\(\)/.test(bodies[0]) && /catch\s*\{/.test(bodies[0]) && /card_state_clear/.test(bodies[0]));

  const strings = literals(decomment(body));
  // Class names, ids and tag names are not copy. Prose is what carries a voice.
  const prose = strings.filter(s => /\s/.test(s) && /[a-z]{3}/.test(s) && !/^coach-/.test(s));
  check('and prose was actually extracted from them (' + prose.length + ' strings), so this is not a sweep over class names',
        prose.length >= 5, list(prose));

  const bad = strings.map(s => ({ s, w: offence(s) })).filter(x => x.w);
  /* Three of these only ever appear inside a race window — a slow read, a throw
     that cannot happen — so no human review will ever see them on a screen.
     A verifier is the only thing that will. */
  check('no string the card draws carries a banned word', !bad.length,
        list(bad.map(x => '“' + x.w + '” in: ' + x.s)));
}

/* ================= E. STALLED_LIFT IS ANSWER-ONLY ================= */
section('E. stalled_lift answers a question and never volunteers');
{
  const it = byId('stalled_lift');
  check('it is still registered', !!it && it.kind === 'finding');
  check('and its surfaces array is exactly the sheet',
        JSON.stringify(it.surfaces) === '["sheet"]', JSON.stringify(it.surfaces));
  check('and it still has a response behind it',
        !!C.RESPONSES[it.response], it.response);
  check('ask_stall is still a route the engine answers', C.ROUTE_IDS.includes('ask_stall'));

  const a = C.coach({ ...FIXTURES.stalled, u: 'lb' }).ask('ask_stall');
  check('and on a log with a stalled lift, ask_stall still routes to it', a.id === 'stalled_lift', a.id);
  check('and the answer is a real sentence rather than a shrug',
        a.text.length > 20 && !/^Nothing to say/.test(a.text), a.text);

  /* Driven rather than asserted off the table: the surfaces array is the rule,
     and this is the rule having its intended effect on every log here. */
  const onCard = [];
  rendered.forEach(r => { if ((r.where === 'you' || r.where === 'train') && r.id === 'stalled_lift') onCard.push(r.at); });
  check('and across every fixture in this file, in both units, it never reaches a card',
        !onCard.length, list(onCard));
  check('the sheet is where the answer lives, and the card fixture that CAN produce it proves the point',
        C.coach({ ...FIXTURES.stalled, u: 'lb' }).you.id !== 'stalled_lift',
        C.coach({ ...FIXTURES.stalled, u: 'lb' }).you.id);
}

/* ================= F. THE STALL ANSWER IS STAGE TWO'S READING =================
   Updated deliberately in v49. This section used to pin the stall sentence as
   a figure and a date, with a clause added when his own goal pointed down.
   SHIP-V49-PROMPT §3.10 replaces that sentence: "Anything stalled?" now
   answers with coach-overlap.js's reading of the same lift — a plateau, a cut
   that is holding, a slide, a lift trained too rarely to say, or "Coach needs
   weigh-ins to tell" — because a flat figure with nothing beside it was still a
   guess about the most sensitive thing Coach reads. What stays pinned: a real
   figure through units.js in both units, and the direction the account stated
   (never a direction nobody stated). What is new: "cut" only when his aim or
   his own food targets say so, and a cut that is holding never called a stall. */
section('F. the stall answer — stage two’s reading, a figure through units.js, and "cut" only under the rule');
{
  const stall = (extra, u) => C.coach({ ...FIXTURES.stalled, u: u || 'lb', ...extra }).ask('ask_stall');
  const plain = stall({}).text;
  const plainKg = stall({}, 'kg').text;

  check('with no weigh-ins, the answer says it cannot separate a cut from a plateau, and asks for none of it by name',
        /Coach needs a couple of weigh-ins/.test(plain) && !/\bcut\b|plateau|\bstall/i.test(plain), plain);
  const lbNum = Number((/([\d.]+) lb/.exec(plain) || [, NaN])[1]);
  check('it names his estimated max, and a real one', Number.isFinite(lbNum) && lbNum > 50, plain);
  check('through units.js — the kilo answer says the same figure converted once, and never lb',
        plainKg.includes(U.labelW(lbNum, 'kg')) && !/\blb\b/.test(plainKg), plainKg);
  const r = stall({}).reason;
  check('and the standing best rides in the evidence, as a figure, so the old readout is still there to check',
        /Your best estimated max on it is [\d.]+ lb\./.test(r), r);

  // A level bench through a cut that is holding: weigh-ins 212 → 205.
  const level = sort([40, 30, 20, 10, 4].map(a => sess(a, [['bench', three(225, 5)]], 'h')));
  const falling = Array.from({ length: 24 }, (_, i) => ({ lb: Math.round((212 - 7 * i / 23) * 10) / 10, t: NOW - (46 - 2 * i) * DAY }));
  const held = (answers, goalDir) => stall({ sessions: level, weighIns: falling,
    weight: { latestLb: 205, latestAt: NOW - DAY, rateWk: -1, rateDays: 45, goalDir, goalRateWk: null },
    settings: { v: 1, mute: {}, answers, asked: {}, lastGreet: '' } }).text;
  const cutAim = held({ q_goal_aim: 'cut' }, null);
  check('a level lift while he loses weight on purpose is holding, and "that’s the win" — never a stall or a plateau',
        /that’s the win/.test(cutAim) && !/stall|plateau/i.test(cutAim), cutAim);
  const noAim = held({}, null);
  check('the same log with no aim and no direction says his weight came down — never "cut"',
        /your weight has come down/.test(noAim) && !/\bcut/i.test(noAim), noAim);
  check('his own food targets set to lose are what let it say "cut"', /In a cut/.test(held({}, -1)), held({}, -1));
  check('and a direction pointing up or holding does not', [1, 0].every(g => !/\bcut/i.test(held({}, g))));
  check('and it renders on kilos too, in the reader’s unit',
        !/\blb\b/.test(C.coach({ ...FIXTURES.stalled, u: 'kg', sessions: level, weighIns: falling,
          weight: { latestLb: 205, latestAt: NOW - DAY, rateWk: -1, rateDays: 45, goalDir: -1, goalRateWk: null } }).ask('ask_stall').text));
}

/* ================= G. THE WORKOUT BUILDER ================= */
section('G. the workout builder — sheet-only, and under the ban anyway');
{
  /* Everything above exempts sheet-only copy, on the argument that somebody who
     asked a question is owed its answer in the words the answer needs. The
     builder is sheet-only and is NOT exempt, and the reason is what it is: a
     proposal is Coach putting a plan in front of him, with his own numbers on
     it, about to be lifted from. That is the most prescription-shaped thing in
     Coach and the place a judgement would land hardest — "you only managed 6",
     "still at 185" — so its copy is held to the card's rule, all of it, with no
     exemption list: every literal in coach-build.js, every template an intent in
     the builder's category answers with, and everything a proposal renders to. */
  const BCODE = decomment(src('coach-build.js'));
  const lits = literals(BCODE).filter(t => /[a-z]{3}/i.test(t));
  const srcBad = lits.map(t => ({ t, w: offence(t) })).filter(x => x.w);
  check('no literal in coach-build.js carries a banned word (' + lits.length + ' read)',
        lits.length >= 25 && !srcBad.length, list(srcBad.map(x => '“' + x.w + '” in: ' + x.t)));

  const buildIntents = C.INTENTS.filter(i => i.category === 'build');
  const tplBad = [];
  buildIntents.forEach(i => {
    const r = C.RESPONSES[i.response] || {};
    ['text', 'reason'].forEach(part => copyOf(r[part] || '').forEach(t => {
      const w = offence(t); if (w) tplBad.push(i.response + '.' + part + ' — “' + w + '” in: ' + t);
    }));
  });
  check('no template the builder’s own intents answer with carries one either', !tplBad.length, list(tplBad));

  /* Rendered, across the proposals a person can reach: the default, every swap
     and focus it offers, fewer, a layoff, a hidden and a deleted exercise, his
     routine by name, a set taken to failure, a swap into a lift he has never
     logged — imperial and metric. */
  const R = { 'barbell-bench-press': ['Barbell Bench Press', 'chest', 'barbell'],
              'cable-crossover': ['Cable Crossover', 'chest', 'cable'],
              'triceps-pushdown-rope': ['Triceps Pushdown (Rope)', 'arms', 'cable'],
              'barbell-row': ['Barbell Row', 'back', 'barbell'],
              'barbell-curl': ['Barbell Curl', 'arms', 'barbell'],
              'back-squat-high-bar': ['Back Squat (High Bar)', 'legs', 'barbell'],
              'incline-dumbbell-bench-press': ['Incline Dumbbell Bench Press', 'chest', 'dumbbell'],
              'custom-gone-press-x1y2z': ['Gone Press', 'chest', 'barbell'] };
  const VLIB = {};
  Object.keys(R).filter(id => id !== 'cable-crossover' && id !== 'custom-gone-press-x1y2z')
    .forEach(id => { VLIB[id] = { name: R[id][0], group: R[id][1], equipment: R[id][2] }; });
  const vex = (id, rows) => ({ exId: id, name: R[id][0], group: R[id][1], equipment: R[id][2],
    sets: rows.map(([w, r, t]) => ({ w: String(w), r: String(r), type: t || 'N', done: true })) });
  const vs = (id, ago, exs) => ({ id, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises: exs });
  const VLOG = [];
  for (let k = 0; k < 10; k++) {
    VLOG.push(vs('p' + k, 9 + 7 * k, [vex('barbell-bench-press', [[135, 10, 'W'], [185, 8], [185, 8], [185, 6, 'F']]),
                                     vex('cable-crossover', [[40, 12], [40, 12]]),
                                     vex('custom-gone-press-x1y2z', [[95, 10], [95, 10]]),
                                     vex('triceps-pushdown-rope', [[50, 12], [50, 12]])]));
    VLOG.push(vs('b' + k, 4 + 7 * k, [vex('barbell-row', [[155, 8], [155, 8]]), vex('barbell-curl', [[65, 10], [65, 10]])]));
    VLOG.push(vs('l' + k, 6 + 7 * k, [vex('back-squat-high-bar', [[245, 5], [245, 5], [245, 5]])]));
  }
  const vin = extra => base({ sessions: sort(VLOG), lib: VLIB, hidden: ['cable-crossover'], libReady: true,
    routines: [{ id: 'r1', name: 'Pull Day', exercises: [{ exId: 'barbell-row', group: 'back' }, { exId: 'barbell-curl', group: 'arms' }] }],
    ...extra });

  const said = [];
  const take = (name, pp) => {
    if (!pp) return;
    [pp.headline, pp.reason.join(' '), pp.routineLine, pp.layoffLine, pp.leftOutLine]
      .concat(pp.exercises.flatMap(e => [e.line, e.note, e.name]))
      .concat(pp.focuses.map(f => f.label), pp.exercises.flatMap(e => e.swaps.map(x => x.name)))
      .filter(Boolean).forEach(t => said.push({ name, t }));
  };
  ['lb', 'kg'].forEach(u => {
    [['plain', vin({ u })], ['layoff', vin({ u, now: NOW + 30 * DAY })]].forEach(([name, fx]) => {
      const cc = C.coach(fx);
      const pp = cc.build({});
      take(name + '/' + u, pp);
      if (!pp) return;
      pp.focuses.forEach(f => take(name + '/' + u + '/' + f.label, cc.build(f.opts)));
      pp.exercises.forEach(e => e.swaps.forEach(x => take(name + '/' + u + '/swap ' + x.exId, cc.build(x.opts))));
      if (pp.fewer) take(name + '/' + u + '/fewer', cc.build(pp.fewer));
      buildIntents.forEach(i => {
        const route = C.ROUTE_IDS.find(r => cc.ask(r).id === i.id);
        if (route) { const a = cc.ask(route); said.push({ name: name + '/' + u + '/' + route, t: a.text + ' ' + a.reason }); }
      });
    });
    const live = C.coach(vin({ u, live: { active: true } })).buildLive();
    if (live) said.push({ name: 'live/' + u, t: live });
  });
  const bad = said.map(x => ({ ...x, w: offence(x.t) })).filter(x => x.w);
  check('nothing a proposal renders, in either unit, carries a banned word', !bad.length,
        list(bad.map(x => x.name + ' — “' + x.w + '” in: ' + x.t)));
  // Coverage, so the check above cannot pass on silence.
  const blob = said.map(x => x.t).join('\n');
  check('and the sweep reached every kind of line a proposal has (' + said.length + ' rendered)',
        said.length >= 60 && /Built from/.test(blob) && /Left out:/.test(blob) && /hidden in your library/.test(blob) &&
        /not in your library/.test(blob) && /You have a routine for this: Pull Day/.test(blob) &&
        /Your last session was/.test(blob) && /taken to failure/.test(blob) && /reached/.test(blob) &&
        /A workout is running/.test(blob),
        said.length + ' lines');

  /* And the sheet's own words for the proposal — the four buttons, the three
     follow-ups, "Swap X for Y", and the line for a focus that cannot build —
     which live in coach-ui.js rather than in a template. The section of that
     file that draws the proposal is read and nothing else of it: the rest of
     the sheet is ordinary sheet copy, exempt for the reason at the top. */
  const UIS = src('coach-ui.js');
  const from = UIS.indexOf('/* ================= THE PROPOSAL =================');
  const to = UIS.indexOf('/* ================= THE SETTINGS SECTION');
  const uiCopy = from !== -1 && to > from ? literals(decomment(UIS.slice(from, to))).filter(t => /[a-z]{3}/i.test(t) && /\s/.test(t)) : [];
  const uiBad = uiCopy.map(t => ({ t, w: offence(t) })).filter(x => x.w);
  check('the proposal’s own copy in coach-ui.js was found and read (' + uiCopy.length + ' strings)',
        uiCopy.length >= 6 && ['Start with Coach’s targets', 'Start it', 'Start with my last numbers', 'Save as routine',
                               'Change something'].every(l => uiCopy.includes(l)), list(uiCopy));
  check('and carries no banned word', !uiBad.length, list(uiBad.map(x => '“' + x.w + '” in: ' + x.t)));

  /* The nudge is a readout and never a push. A set taken to failure is SAID,
     not answered — no "try", no "go up", no next weight — which is the whole
     of what "progression is a nudge, never baked in" means in a sentence. */
  const PUSH = [/\btry\b/i, /\bgo up\b/i, /\bnext time\b/i, /\baim\b/i, /\bshould\b/i, /\bincrease\b/i,
                /\badd\b/i, /\bmore\b/i, /\bbeat\b/i, /\bpush (it|harder)\b/i];
  const notes = said.filter(x => /last time/.test(x.t));
  const pushy = notes.filter(x => PUSH.some(re => re.test(x.t)));
  check('no progression note names a next step — it says what the log shows and stops',
        notes.length > 0 && !pushy.length, list(pushy.map(x => x.t)));
}

/* ================= H. THE IN-SESSION READ ================= */
section('H. the in-session read — unprompted under a bar, and under the ban with no exemption');
{
  /* The nudge under a finished exercise arrives without being asked for, in
     the most sensitive place Coach speaks, so every line coach-live.js can
     produce — the nudge, the answer and the why behind it — is held to the
     card's rule. And to the health line coach-silence.mjs draws for every
     sentence: no instruction about eating, no max attempt, nothing medical. */
  const LCODE = decomment(src('coach-live.js'));
  const lits = literals(LCODE).filter(t => /[a-z]{3}/i.test(t) && /\s/.test(t));
  const srcBad = lits.map(t => ({ t, w: offence(t) })).filter(x => x.w);
  check('no literal in coach-live.js carries a banned word (' + lits.length + ' read)',
        lits.length >= 20 && !srcBad.length, list(srcBad.map(x => '“' + x.w + '” in: ' + x.t)));

  /* The battery: twelve weeks of a chest-and-arms day, a back-and-arms day and
     a leg day, with a warm-up on the bench and a bodyweight lift in the log,
     and a spread of live sessions that between them reach all four answers —
     next, another, switch, done by length and done by fatigue. Mirrored in
     coach-live.mjs, which proves each answer is the RIGHT one; here the only
     question is what the words and the numbers look like. */
  const LLIB = {
    bench:    { name: 'Barbell Bench Press',          group: 'chest', equipment: 'barbell' },
    incline:  { name: 'Incline Dumbbell Bench Press', group: 'chest', equipment: 'dumbbell' },
    fly:      { name: 'Cable Crossover',              group: 'chest', equipment: 'cable' },
    dips:     { name: 'Chest Dip',                    group: 'chest', equipment: 'bodyweight' },
    curl:     { name: 'Barbell Curl',                 group: 'arms',  equipment: 'barbell' },
    pushdown: { name: 'Triceps Pushdown (Rope)',      group: 'arms',  equipment: 'cable' },
    row:      { name: 'Barbell Row',                  group: 'back',  equipment: 'barbell' },
    pulldown: { name: 'Lat Pulldown',                 group: 'back',  equipment: 'cable' },
    squat:    { name: 'Back Squat (High Bar)',        group: 'legs',  equipment: 'barbell' },
    rdl:      { name: 'Romanian Deadlift',            group: 'back',  equipment: 'barbell' }
  };
  const LLOAD = { bench: '185', incline: '65', fly: '40', dips: '0', curl: '75', pushdown: '50',
                  row: '155', pulldown: '140', squat: '245', rdl: '205' };
  const LREPS = { bench: 8, incline: 10, fly: 12, dips: 10, curl: 10, pushdown: 12, row: 8, pulldown: 10, squat: 5, rdl: 8 };
  const lx = (id, n, warm) => ({ exId: id, name: LLIB[id].name, group: LLIB[id].group, equipment: LLIB[id].equipment,
    sets: (warm ? [{ w: '95', r: '10', type: 'W', done: true }] : [])
      .concat(Array.from({ length: n }, () => ({ w: LLOAD[id], r: String(LREPS[id]), type: 'N', done: true }))) });
  const ls = (tag, ago, rows) => ({ id: tag + ago, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises: rows });
  const LHIST = [];
  for (let k = 0; k < 10; k++) {
    LHIST.push(ls('push', 3 + 7 * k, k === 4 || k === 7
      ? [lx('bench', 4, true), lx('incline', 3), lx('dips', 3), lx('curl', 3)]
      : [lx('bench', 4, true), lx('incline', 3), lx('fly', 3), lx('curl', 3), lx('pushdown', 3)]));
    LHIST.push(ls('pull', 5 + 7 * k, [lx('row', 4), lx('pulldown', 3), lx('curl', 3)]));
    LHIST.push(ls('legs', 1 + 7 * k, [lx('squat', 4), lx('rdl', 3)]));
  }
  const liveOf = rows => ({ id: 'wl', startedAt: NOW - 30 * 60 * 1000, exercises: rows.map(([id, sets]) => ({
    exId: id, name: LLIB[id].name, group: LLIB[id].group, equipment: LLIB[id].equipment,
    sets: sets.map(([w, r, type]) => ({ w: String(w), r: String(r), type: type || 'N', done: true })) })) });
  const nx = (id, c) => Array.from({ length: c }, () => [LLOAD[id], LREPS[id]]);
  const LIVES = [
    ['next',     liveOf([['bench', nx('bench', 4)], ['incline', nx('incline', 3)]]), undefined],
    ['another',  liveOf([['bench', nx('bench', 3)]]), undefined],
    ['switch',   liveOf([['bench', nx('bench', 4)], ['incline', nx('incline', 3)], ['fly', nx('fly', 3)]]), undefined],
    ['length',   liveOf([['bench', nx('bench', 4)], ['incline', nx('incline', 3)], ['fly', nx('fly', 3)],
                         ['curl', nx('curl', 3)], ['pushdown', nx('pushdown', 3)]]), undefined],
    ['fatigue',  liveOf([['bench', [[185, 8], [185, 8], [185, 6, 'F']]], ['incline', [[65, 10], [65, 10], [65, 7]]]]), undefined],
    ['pull',     liveOf([['row', nx('row', 4)], ['pulldown', nx('pulldown', 3)]]), undefined],
    ['hint',     liveOf([['bench', nx('bench', 3)], ['incline', nx('incline', 3)]]), { current: 0 }]
  ];
  const liveAll = u => LIVES.map(([name, s, opts]) => {
    const a = C.coach(base({ u, sessions: sort(LHIST), lib: LLIB, hidden: [], live: { active: true } })).live(s, opts);
    return { name, a };
  });

  const said = [];
  ['lb', 'kg'].forEach(u => liveAll(u).forEach(({ name, a }) => {
    if (a) [a.text, a.short].concat(a.why).forEach(t => said.push({ name: name + '/' + u, t }));
  }));
  const bad = said.map(x => ({ ...x, w: offence(x.t) })).filter(x => x.w);
  check('nothing the read renders, in either unit, carries a banned word (' + said.length + ' lines)',
        said.length >= 40 && !bad.length, list(bad.map(x => x.name + ' — “' + x.w + '” in: ' + x.t)));
  const HEALTH = [/\beat (less|more|fewer)\b/i, /\bshould (eat|train|lift|rest|stop)\b/i,
                  /\b(one[- ]rep max|test your max|go for a max|max attempt)\b/i, /\b(doctor|diagnos|injur|physio|pain|hurt)/i,
                  /\b(recommended|healthy range|guideline|most people|average person)\b/i];
  const health = said.filter(x => HEALTH.some(re => re.test(x.t)));
  check('and none of it is an instruction about food, a max attempt, medicine or a population norm',
        !health.length, list(health.map(x => x.t)));
  check('the sweep reached all four answers',
        ['next', 'another', 'switch', 'done'].every(k => liveAll('lb').some(x => x.a && x.a.kind === k)));

  /* And the words the view writes around them — the chip, the question, the
     waiting line, the buttons and the nudge's own prefix — which live in
     coach-ui.js's IN THE GYM section rather than in a template. */
  const UIS = src('coach-ui.js');
  // From the marker's own opening, so the section's header comment is still a
  // whole comment and decomment() takes it off rather than reading its prose.
  const at = UIS.indexOf('/* ================= IN THE GYM =================');
  const gym = at === -1 ? '' : UIS.slice(at);
  const gymCopy = literals(decomment(gym)).filter(t => /[a-z]{3}/i.test(t));
  const gymBad = gymCopy.map(t => ({ t, w: offence(t) })).filter(x => x.w);
  check('the in-session copy in coach-ui.js was found and read (' + gymCopy.length + ' strings)',
        ['What should I do next?', 'Why?', 'Add it'].every(l => gymCopy.includes(l)), list(gymCopy));
  check('and carries no banned word', !gymBad.length, list(gymBad.map(x => '“' + x.w + '” in: ' + x.t)));
}

/* ================= I. PATTERNS ================= */
section('I. Patterns — two groups side by side, and never a cause');
{
  /* Patterns is sheet-only, so the card's ban above does not bind it — but it
     is the one place in Coach that sets two groups of his days beside each
     other, which is the exact shape of sentence that slides into a claim about
     why. So it has a ban of its own: no word that says one thing brings about
     another, and no word that says what he ought to do about it. Applied to
     every literal the Patterns response and the eight facts are built from,
     and to everything they render, in both units. */
  const CAUSAL = [/\bbecause\b/i, /\bhelps?\b/i, /\bmakes?\b/i, /\bleads? to\b/i, /\bboosts?\b/i, /\bso you\b/i,
                  /\bcauses?\b/i, /\bdue to\b/i, /\bresults? in\b/i, /\bthanks to\b/i, /\bdrives?\b/i];
  const ADVICE = [/\bshould\b/i, /\btry\b/i, /\baim\b/i, /\beat (more|less)\b/i, /\bbetter\b/i, /\bworse\b/i, /\bimprove/i];
  const at = CODE.indexOf('resp_patterns: {');
  let depth = 0, end = -1;
  for (let j = CODE.indexOf('{', at); at !== -1 && j < CODE.length; j++) {
    if (CODE[j] === '{') depth++;
    else if (CODE[j] === '}' && --depth === 0) { end = j; break; }
  }
  const respCopy = at === -1 ? [] : literals(CODE.slice(at, end + 1)).filter(t => /[a-z]{3}/i.test(t));
  const factCopy = C.PATTERN_FACTS.flatMap(id => copyOf(factOf(id).because));
  const srcCopy = respCopy.concat(factCopy);
  const srcBad = srcCopy.filter(t => CAUSAL.concat(ADVICE).some(re => re.test(t)));
  check('the Patterns response and its eight facts were read (' + srcCopy.length + ' strings)',
        respCopy.length >= 20 && factCopy.length >= 8, list(srcCopy.slice(0, 3)));
  check('and no literal in them says why, or what to do', !srcBad.length, list(srcBad));

  /* A twenty-six-week log on which all eight patterns clear — the same
     construction as coach-patterns.mjs, which proves each number right; here
     the only question is what the words look like. Dates and hours are built
     in the local zone, the one the engine reads them in. */
  const PLIB = { bench: { name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell' },
                 row:   { name: 'Barbell Row',         group: 'back',  equipment: 'barbell' } };
  const hourOn = (i, h, m = 0) => { const x = new Date(NOW - i * DAY); x.setHours(h, m, 0, 0); return x.getTime(); };
  const pset = (n, w, r) => Array.from({ length: n }, () => ({ w: String(w), r: String(r), type: 'N', done: true }));
  const PS = [], PSUM = {}, PSTEP = {}, PFOOD = {}, PWEIGH = [];
  for (let i = 1; i <= 181; i++) {
    const k = key(NOW - i * DAY);
    const quiet = Math.floor((i - 1) / 7) % 3 === 2;
    const trains = i % 7 === 1 || (!quiet && (i % 7 === 3 || i % 7 === 5));
    PSUM[k] = { cal: 2000 + (i % 3) * 300, p: i % 2 ? 190 : 150, c: 250, f: 70 };
    PSTEP[k] = { steps: (trains ? 9000 : 6000) + (i % 3) * 100 };
    PWEIGH.push({ lb: 180 + i * 0.05, t: hourOn(i, 6, 30) });
    if (!trains) continue;
    const am = i % 7 === 1;
    PS.push({ id: 'pp' + i, startedAt: hourOn(i, am ? 7 : 17), _date: k, exercises: [
      { exId: 'bench', ...PLIB.bench, sets: pset(4, 180 + (i % 4) * 10 + (am ? 0 : 5), 5) },
      { exId: 'row', ...PLIB.row, sets: pset(i % 2 ? 3 : 4, 155, 8) }] });
    PFOOD[k] = hourOn(i, i % 5 === 0 ? 20 : 6);
  }
  PS.sort((a, b) => a.startedAt - b.startedAt);
  const patternLines = u => {
    const a = C.coach(base({ u, sessions: PS, lib: PLIB, summaries: PSUM, steps: { days: PSTEP }, weighIns: PWEIGH,
      foodFirst: PFOOD, targets: { cal: 2300, p: 170, f: 70 }, targetsSet: true,
      settings: { v: 1, mute: {}, on: { patterns: true }, answers: {}, asked: {} } })).ask('ask_patterns');
    return a.id === 'patterns_in_data' ? [{ text: a.text, reason: a.reason }].concat(a.more || []) : [];
  };

  const said = ['lb', 'kg'].flatMap(u => patternLines(u).flatMap(l => [u + ': ' + l.text, u + ': ' + l.reason]));
  check('all eight render, in both units (' + said.length + ' lines)', said.length === 32, String(said.length));
  const causal = said.filter(t => CAUSAL.some(re => re.test(t)));
  check('no causal word in anything they say: because, helps, makes, leads to, boosts, so you', !causal.length, list(causal));
  const advice = said.filter(t => ADVICE.some(re => re.test(t)));
  check('and no advice: should, try, aim, better, worse', !advice.length, list(advice));
}

/* ================= J. THE TARGETS ================= */
section('J. v48 — every target Coach names, under the ban and the words this ship adds to it');
{
  /* Tonight Coach names a weight to put on a bar. Its sentences are
     sheet-only, so the card's exemption would let them off — and they are the
     sentences least entitled to it: a target that says "try" or "push" is the
     push the builder's note was fenced against for three ships. So they carry
     the shipped list with NO exemption, plus the words SHIP-V48-PROMPT.md §9
     bans (try, should, push, beat, go for, aim for, easy, must), a max attempt
     in any form, a claim of cause, a pound on a kilo account, and a straight
     apostrophe where Coach's own files write the curly one.

     The lines are the ones tools-check/coach-prog.mjs's battery produces,
     imported rather than rebuilt here, so the two files read the same
     targets. That battery also sweeps thousands of generated histories through
     the same list; this section adds what only coach.js and coach-build.js
     say around the targets. */
  const PROG = await import(pathToFileURL(join(HERE, 'coach-prog.mjs')).href);
  const P = await PROG.stageProg();
  const EXTRA = [/\btry\b/i, /\bshould\b/i, /\bpush\b/i, /\bbeat\b/i, /\bgo for\b/i, /\baim for\b/i, /\beasy\b/i, /\bmust\b/i,
                 /\b(1\s*rm|one[- ]rep max) (test|attempt)|\bmax(ing)? out\b|\bgo for a (single|max)\b|\btest your max\b/i,
                 /\b(because (you|your)|caused|due to (your|the)|that'?s why)\b/i];
  /* v54, on purpose: "way too easy" is HIS rating's label (Micah, 24 Sep
     2026), and a target moved by it says so — "Last time you rated 185 lb × 8
     way too easy." — quoting him, the way the compare answer quotes his
     "120%+". The ban on "easy" is about Coach calling a jump easy, so it holds
     for every other use of the word, and the quote is taken out first — in a
     rendered sentence after "rated", and in the source as the literal that
     follows "rated " + the set (a literal that begins with it). */
  const hits = (t0, u) => { const t = String(t0).replace(/\brated ([^.]*?)way too easy\b/g, 'rated $1')
    .replace(/^\s*way too easy\b/, '');
    return BANNED.concat(EXTRA).filter(re => re.test(t)).map(re => (t.match(re) || [''])[0])
    .concat(u === 'kg' && /\d ?lb\b/.test(t) ? ['lb on a kilo account'] : [])
    .concat(/'/.test(t) ? ['a straight apostrophe'] : []); };

  const said = [];
  PROG.cases().forEach(c => {
    const { t } = PROG.run(P, c);
    if (t) [t.line].concat(t.why).forEach(x => said.push({ id: c.id, u: c.u, t: x }));
  });
  const modes = new Set(PROG.cases().map(c => (PROG.run(P, c).t || {}).mode).filter(Boolean));
  check('the battery’s targets were read — every mode (' + said.length + ' lines)',
        said.length >= 150 && ['add', 'reps', 'hold', 'reduce', 'reenter', 'first', 'bodyweight', 'defer'].every(m => modes.has(m)),
        [...modes].join(', '));

  // What coach.js and coach-build.js say around them, on a log with targets.
  const TLIB = { 'barbell-bench-press': ['Barbell Bench Press', 'chest', 'barbell'],
                 'triceps-pushdown-rope': ['Triceps Pushdown (Rope)', 'arms', 'cable'],
                 'barbell-row': ['Barbell Row', 'back', 'barbell'], 'barbell-curl': ['Barbell Curl', 'arms', 'barbell'],
                 'back-squat-high-bar': ['Back Squat (High Bar)', 'legs', 'barbell'] };
  const TL = Object.fromEntries(Object.entries(TLIB).map(([id, [name, group, equipment]]) => [id, { name, group, equipment }]));
  const tx = (id, rows) => ({ exId: id, ...TL[id], sets: rows.map(([w, r]) => ({ w: String(w), r: String(r), type: 'N', done: true })) });
  const TLOG = [];
  for (let k = 0; k < 10; k++) {
    TLOG.push(vsT('p' + k, 9 + 7 * k, [tx('barbell-bench-press', [[185 - 5 * (k >> 1), k % 2 ? 8 : 12], [185 - 5 * (k >> 1), k % 2 ? 8 : 12]]),
                                        tx('triceps-pushdown-rope', [[50, 12], [50, 12]])]));
    TLOG.push(vsT('b' + k, 4 + 7 * k, [tx('barbell-row', [[155, 8], [155, 8]]), tx('barbell-curl', [[65, 10], [65, 10]])]));
    TLOG.push(vsT('l' + k, 6 + 7 * k, [tx('back-squat-high-bar', [[245, 5], [245, 5], [245, 5]])]));
  }
  function vsT(id, ago, exs) { return { id, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY), exercises: exs }; }
  ['lb', 'kg'].forEach(u => {
    const cc = C.coach(base({ u, sessions: sort(TLOG), lib: TL, hidden: [], libReady: true }));
    const a = cc.ask('ask_targets');
    if (a.id === 'lift_targets') {
      said.push({ id: 'answer/' + u, u, t: a.text }, { id: 'answer/' + u, u, t: a.reason });
      (a.more || []).forEach(m => said.push({ id: 'more/' + u, u, t: m.text }, { id: 'more/' + u, u, t: m.reason }));
    }
    const pp = cc.build({});
    (pp ? pp.exercises : []).forEach(e => e.target && [e.target.line].concat(e.target.why).forEach(x => said.push({ id: 'row/' + u, u, t: x })));
  });
  C.QUESTIONS.filter(q => q.where === 'targets').forEach(q => [q.text, q.ack].forEach(x => said.push({ id: q.id, u: 'lb', t: x })));
  check('the targets answer, its bubbles, the proposal’s target lines and both goal questions were read',
        said.some(x => /^Targets for your /.test(x.t)) && said.some(x => x.id === 'q_goal_aim') && said.some(x => x.id === 'q_experience') &&
        said.some(x => x.id === 'row/kg'), String(said.length));
  const bad = said.map(x => ({ ...x, w: hits(x.t, x.u) })).filter(x => x.w.length);
  check('not one of them carries a banned word, a max attempt, a cause, a pound in kilos or a straight apostrophe',
        !bad.length, list(bad.map(x => x.id + ' [' + x.u + '] ' + x.w.join('/') + ' in: ' + x.t)));

  /* The line the builder writes when a target is built from another day is
     coach-build.js copy, and so are the words coach-ui.js draws around a
     target — read from source too, so a branch no fixture reaches is still
     under the ban. */
  const BSRC = literals(decomment(src('coach-build.js'))).filter(t => /Worked out from|the last time you did/.test(t));
  const PSRC = literals(decomment(src('coach-prog.js'))).filter(t => /[a-z]{3}/i.test(t) && /\s/.test(t));
  const srcBad = BSRC.concat(PSRC).map(t => ({ t, w: hits(t, 'lb').filter(w => w !== 'a straight apostrophe') })).filter(x => x.w.length);
  check('and no literal in coach-prog.js, nor the builder’s “worked out from” line, carries one either (' +
        (BSRC.length + PSRC.length) + ' read)', PSRC.length >= 40 && BSRC.length >= 1 && !srcBad.length,
        list(srcBad.map(x => x.w.join('/') + ' in: ' + x.t)));
}

/* ================= K. v49 — THE CARD ONLY ENCOURAGES ================= */
section('K. v49 — the card ban over every string a card can draw, and the new answers under the ban');
{
  /* THE CARD. It draws the earned line and its evidence clause, the greeting,
     and the blocking and fall-through states — and every one of those is held
     to the card ban: the shipped list and the corrective vocabulary above
     (CARD_BANNED), in both units, on the rendered string and on the source,
     so a branch no log here reaches is under it too. */
  const cardBan = s => BANNED.concat(CARD_BANNED).filter(re => re.test(s)).map(re => (s.match(re) || [''])[0]);
  const { EXERCISES } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);
  const REAL = {};
  EXERCISES.forEach(x => { REAL[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
  const rset = (w, r, t) => ({ w: String(w), r: String(r), type: t || 'N', done: true });
  const rsess = (ago, rows, hour) => { const d = new Date(NOW - ago * DAY); d.setHours(hour || 7, 0, 0, 0); const t = d.getTime();
    return { id: 'k' + ago + '-' + rows.map(r => r[0]).join(''), startedAt: t, endedAt: t + 36e5, _date: key(t),
             exercises: rows.map(([id, n, w, r]) => ({ exId: id, name: REAL[id].name, group: REAL[id].group, equipment: REAL[id].equipment,
                                                     sets: Array.from({ length: n }, () => rset(w, r)) })) }; };
  const food = n => Object.fromEntries(Array.from({ length: n }, (_, k) => [key(NOW - (k + 1) * DAY), { cal: 2300, p: 190, c: 250, f: 70 }]));
  // A log that earns most of the card's lines at once: climbing lifts, a new
  // best yesterday, three days running, a milestone, a fortnight of food, a
  // gain on pace for Build muscle.
  const earn = [];
  for (let k = 0; k < 22; k++) earn.push(rsess(3 + 3 * (21 - k), [['barbell-bench-press', 3, 185 + 2.5 * k, 5], ['barbell-row', 3, 155, 8]]));
  earn.push(rsess(1, [['barbell-bench-press', 3, 245, 5]]), rsess(0, [['barbell-curl', 3, 65, 10]]), rsess(2, [['back-squat-high-bar', 3, 245, 5]]));
  const EARN = base({ sessions: sort(earn), lib: REAL, libReady: true, hidden: [], summaries: food(16),
    targets: { cal: 2300, p: 180, f: 74 }, targetsSet: true,
    weight: { latestLb: 180, latestAt: NOW, rateWk: 0.5, rateDays: 30, goalDir: 1, goalRateWk: 0.5 },
    settings: { v: 1, mute: {}, answers: { q_goal_aim: 'muscle' }, asked: {}, lastGreet: '' } });
  const drawn = [];
  /* v53: and the same log before today's session. A session today puts the
     finish line first on the card all day (SHIP-V53-PROMPT §4.4), so EARN
     alone now draws that and the recovery line; the day before, the card
     walks the rest of its lines, and every one of them is read here too. */
  const EARN_BEFORE = { ...EARN, sessions: EARN.sessions.filter(x => x.startedAt < NOW - DAY / 2) };
  const logs = Object.entries(FIXTURES).concat([['earn', EARN], ['earn-before', EARN_BEFORE]]);
  logs.forEach(([name, fx]) => ['lb', 'kg'].forEach(u => {
    for (let opens = 0; opens < 12; opens++) {
      const c = C.coach({ ...fx, u, opens, recentHype: [] });
      ['you', 'train'].forEach(w => drawn.push({ at: name + '/' + u + '/' + w, id: c.card[w].id, state: c.card[w].state,
                                                  text: c.card[w].text || '', why: c.card[w].reason || '' }));
      drawn.push({ at: name + '/' + u + '/greet', id: c.greet.id, state: 'greet', text: c.greet.text, why: '' });
    }
  }));
  const earned = new Set(drawn.filter(x => x.state === 'earned').map(x => x.id));
  check('the fixtures put earned lines on the card — ' + earned.size + ' of the ' + C.HYPE.length + ' registered',
        earned.size >= 6, [...earned].join(', '));
  const bad = drawn.flatMap(x => [x.text, x.why].map(t => ({ ...x, t, w: cardBan(t) }))).filter(x => x.w.length);
  check('nothing a card draws — earned line, its evidence, greeting or state — carries the card ban, both units (' + drawn.length + ' paints)',
        !bad.length, list(bad.map(x => x.at + ' (' + x.id + ') “' + x.w.join('/') + '” in: ' + x.t)));
  const srcBad = [];
  C.HYPE.forEach(h => ['text', 'why'].forEach(k => copyOf(h[k]).forEach(t => { const w = cardBan(t); if (w.length) srcBad.push(h.id + '.' + k + ' “' + w + '” in: ' + t); })));
  C.GREETINGS.forEach(g => copyOf(g.text).forEach(t => { const w = cardBan(t); if (w.length) srcBad.push(g.id + ' “' + w + '” in: ' + t); }));
  // v53: the warm lines took card_state_clear's place on the card, under the same ban.
  C.WARM.forEach(g => copyOf(g.text).forEach(t => { const w = cardBan(t); if (w.length) srcBad.push(g.id + ' “' + w + '” in: ' + t); }));
  ['resp_state_thin', 'resp_state_clear', 'resp_state_locked', 'resp_log_unreadable', 'resp_first_run', 'resp_live_session']
    .forEach(r => ['text', 'reason'].forEach(k => copyOf(C.RESPONSES[r][k]).forEach(t => { const w = cardBan(t); if (w.length) srcBad.push(r + '.' + k + ' “' + w + '” in: ' + t); })));
  const UI = decomment(src('coach-ui.js'));
  const cardFns = ['export function coachCard', 'function leadText', 'function goRow', 'function header'].map(n => {
    const at = UI.indexOf(n + '('); if (at < 0) return '';
    let depth = 0;
    for (let j = UI.indexOf(') {', at) + 2; j < UI.length; j++) { if (UI[j] === '{') depth++; else if (UI[j] === '}' && --depth === 0) return UI.slice(at, j + 1); }
    return '';
  }).join('\n');
  literals(cardFns).filter(t => /\s/.test(t) && /[a-z]{3}/.test(t)).forEach(t => { const w = cardBan(t); if (w.length) srcBad.push('coach-ui.js “' + w + '” in: ' + t); });
  check('the paints drew warm lines too, and they were read (' + drawn.filter(x => x.state === 'warm').length + ')',
        drawn.some(x => x.state === 'warm'));
  check('and none in the source of any earned line, warm line, greeting, card state or the card’s own copy in coach-ui.js',
        !srcBad.length, list(srcBad));
  check('"N days since chest" and "N days since a session" are gone from the greetings — they read as "you haven’t"',
        !C.GREETINGS.some(g => g.id === 'g_since_group' || g.id === 'g_away') && C.GREETINGS.length >= 4);

  /* THE NEW ANSWERS. Sheet-only, so the card's exemption would let them off —
     and the plateau-or-cut reading is the most loaded thing Coach says. So
     every one of them carries the shipped list, the causal words Patterns
     is held to, "should", "try" and "eat", in both units. */
  const CAUSE = [/\bbecause\b/i, /\bcaused?\b/i, /\bdue to\b/i, /\bthat'?s why\b/i, /\bso you\b/i, /\bleads? to\b/i,
                 /\bmakes? you\b/i, /\bresults? in\b/i, /\bthanks to\b/i];
  const SHEET = BANNED.concat(CAUSE, [/\bshould\b/i, /\btry\b/i, /\beat\b/i, /\beating\b/i, /\bmust\b/i]);
  const said = [];
  const ROUTES = ['ask_lifts', 'ask_record_day', 'ask_lighter', 'ask_compare', 'ask_next', 'ask_goal', 'ask_stall'];
  const postEARN = { ...EARN, now: NOW, sessions: sort(earn.concat([(() => { const x = rsess(0, [['barbell-bench-press', 3, 250, 5]], 1); x.startedAt = NOW - 2 * 36e5; x.endedAt = NOW - 36e5; return x; })()])) };
  logs.concat([['post', postEARN]]).forEach(([name, fx]) => ['lb', 'kg'].forEach(u => {
    const c = C.coach({ ...fx, u });
    ROUTES.forEach(r => {
      const a = c.ask(r);
      if (a.id === r) return;
      [a.text, a.reason].concat((a.more || []).flatMap(m => [m.text, m.reason])).filter(Boolean)
        .forEach(t => said.push({ at: name + '/' + u + '/' + r, u, t }));
      if (a.question) said.push({ at: name + '/' + u + '/' + r + '/q', u, t: a.question.text });
    });
    if (c.question) said.push({ at: name + '/' + u + '/opener', u, t: c.question.text });
  }));
  C.QUESTIONS.filter(q => /^q_(focus_group|goal_check_)/.test(q.id)).forEach(q => {
    if (typeof q.text === 'string') said.push({ at: q.id, u: 'lb', t: q.text });
    said.push({ at: q.id + '.ack', u: 'lb', t: q.ack });
    q.options.forEach(o => said.push({ at: q.id + '.option', u: 'lb', t: o.label }));
  });
  const answered = new Set(said.map(x => x.at.split('/')[2]).filter(Boolean));
  check('the new answers were read, in both units — ' + [...answered].join(', '),
        ['ask_lifts', 'ask_compare', 'ask_next', 'ask_goal'].every(r => answered.has(r)) && said.some(x => x.u === 'kg'), String(said.length));
  const sBad = said.map(x => ({ ...x, w: SHEET.filter(re => re.test(x.t)).map(re => (x.t.match(re) || [''])[0])
    .concat(x.u === 'kg' && /\d ?lb\b/.test(x.t) ? ['lb on a kilo account'] : [])
    .concat(/'/.test(x.t) ? ['a straight apostrophe'] : []) })).filter(x => x.w.length);
  check('not one carries a banned word, a cause, "should", "try" or "eat", a pound in kilos or a straight apostrophe',
        !sBad.length, list(sBad.map(x => x.at + ' “' + x.w.join('/') + '” in: ' + x.t)));
  check('and every question the goal machinery asks is a question, never a verdict',
        C.QUESTIONS.filter(q => /^q_goal_check_/.test(q.id)).every(q => typeof q.text === 'function') &&
        said.filter(x => /opener/.test(x.at)).every(x => /\?$/.test(x.t)));
}

/* ================= L. v52 — STAGE FOUR'S SENTENCES, UNDER THE BAN ================= */
section('L. v52 — every sentence stage four can say: rest, recovery, readiness, what was different, the mark');
{
  /* Everything below is sheet-only, and it is where Coach says REST, reads
     a bad day, and lists what was different about a session — so it carries
     the shipped list, the causal words, and SHIP-V52-PROMPT §11's must-never
     scan (max attempts, body norms, eating, medical words, guilt, "AI"), in
     both units. The chip labels are his voice ("Didn’t feel well") and are
     exempt, as v48 decided; every sentence Coach says is not. */
  const RD = await import(pathToFileURL(join(dir, 'coach-ready.mjs')).href);
  const { EXERCISES } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);
  const RL = {};
  EXERCISES.forEach(x => { RL[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
  const HOUR = new Date(NOW).getHours();
  const at = (ago, h, m) => { const d = new Date(NOW - ago * DAY); d.setHours(h, m || 0, 0, 0); return d.getTime(); };
  let n = 0;
  const S = (ago, rows, o) => { const t = o && o.at != null ? o.at : at(ago, o && o.hour != null ? o.hour : HOUR, o && o.min);
    const mins = (o && o.mins) || 60;
    return { id: (o && o.id) || 'v' + (++n), startedAt: t, endedAt: t + mins * 6e4, durationSec: mins * 60, _date: key(t),
      exercises: rows.map(([id, k, w, r, ty]) => ({ exId: id, name: RL[id].name, group: RL[id].group, equipment: RL[id].equipment,
        sets: Array.from({ length: k }, (_, j) => ({ w: String(w), r: String(Array.isArray(r) ? r[j] : r), type: Array.isArray(ty) ? ty[j] : ty || 'N', done: true })) })) }; };
  const every = (first, gaps, until) => { const out = []; let a = first, k = 0; while (a <= until) { out.push(a); a += gaps[k % gaps.length]; k++; } return out; };
  const UP = [['barbell-bench-press', 3, 185, 8], ['barbell-row', 3, 155, 8], ['overhead-press', 3, 95, 8]];
  const LO = [['back-squat-high-bar', 3, 245, 5], ['leg-press', 3, 300, 10], ['leg-extension', 3, 100, 12], ['bulgarian-split-squat', 3, 40, 10]];
  const LO_BIG = LO.map(([id, k, w, r]) => [id, 6, w, r]);
  const AR = [['barbell-curl', 3, 65, 10], ['triceps-pushdown-rope', 3, 50, 12], ['cable-crunch', 3, 60, 15]];
  const inp = x => base({ lib: RL, libReady: true, hidden: [], recentHype: [], weighIns: [], ...x });
  const logs = [];
  // a big legs day yesterday, the upper day recovered
  logs.push(['big', inp({ sessions: sort(every(5, [3, 4], 82).map(a => S(a, LO)).concat([S(1, LO_BIG)], every(4, [3, 4], 81).map(a => S(a, UP)))) })]);
  // the legs day the shipped stalest shape, skipped
  logs.push(['skipped', inp({ sessions: sort(every(10, [7], 80).map(a => S(a, LO.concat([['cable-crunch', 3, 60, 12]]))).concat([S(1, LO_BIG)], every(4, [3, 4], 81).map(a => S(a, UP)))) })]);
  // two on, one off, then four straight — rest
  { const on = []; for (let a = 7; a <= 82; a += 3) on.push(a, a + 1);
    logs.push(['rest', inp({ sessions: sort(on.map((a, k) => S(a, k % 2 ? LO : UP)).concat([0, 1, 2, 3].map(a => S(a, a % 2 ? LO : UP, { hour: Math.max(0, HOUR - 3) })))) })]); }
  // runs of three, then five straight with two lifts falling — lighter, with failures
  { const ss = []; for (let a = 10; a <= 82; a += 5) ss.push(S(a + 2, UP), S(a + 1, LO), S(a, AR)); ss.push(S(8, AR));
    [[4, UP], [3, LO], [2, UP], [1, LO], [0, UP]].forEach(([a, rows]) => ss.push(S(a, rows.map(([id, k, w, r]) =>
      [id, k, /bench|squat/.test(id) ? Math.round(w * 0.9 / 5) * 5 : w, r, ['N', 'F', 'F']]), { hour: Math.max(0, HOUR - 3) })));
    logs.push(['lighter', inp({ sessions: sort(ss) })]); }
  // a group call: legs recovered, the upper day and core yesterday
  logs.push(['group', inp({ sessions: sort(every(4, [3, 4], 81).map(a => S(a, LO.concat([['cable-crunch', 3, 60, 15]])))
    .concat(every(1, [3, 4], 82).map(a => S(a, a === 1 ? UP.concat([['cable-crunch', 3, 60, 15]]) : UP)))) })]);
  // arms three times, yesterday the last — the labelled starting window
  logs.push(['t3', inp({ sessions: sort(every(2, [3, 4], 70).map((a, k) => S(a, k % 2 ? LO : UP))
    .concat([15, 8, 1].map(a => S(a, [['barbell-curl', 3, 65, 10], ['triceps-pushdown-rope', 3, 50, 12]])))) })]);
  // after a session: below, above and marked, at odd hours and lengths, with a weigh-in
  const xl = o => { const ss = []; let k = 0;
    every(3, [4, 5, 3], 82).forEach(a => { ss.push(S(a, UP, { hour: 16 + (k % 3), mins: 55 + 5 * (k % 3) })); k++; });
    every(1, [3, 4], 82).forEach(a => { ss.push(S(a, LO.map(([id, c, w, r]) => [id, c + (k % 2), w, r]), { hour: 16 + (k % 3), mins: 55 + 5 * (k % 3) })); k++; });
    const t = at(0, o.hour);
    const kept = ss.filter(x => !o.rest || x.startedAt < at(o.rest, 0));
    kept.push(S(0, UP.map(([id, c, w, r]) => [id, c, Math.round(w * o.scale / 5) * 5, r]), { at: t, mins: o.mins || 60, id: 'today' }));
    const wi = []; for (let a = 8; a >= 1; a--) wi.push({ lb: 200, t: at(a, 5) }); wi.push({ lb: o.lb || 200, t: at(0, 5) });
    return inp({ sessions: sort(kept), now: t + ((o.mins || 60) + 60) * 6e4, weighIns: wi, settings: { v: 1, mute: {}, answers: {}, asked: {}, lastGreet: '', ...(o.marks ? { marks: o.marks } : {}) } }); };
  logs.push(['below', xl({ scale: 0.85, hour: 18 })]);
  logs.push(['above', xl({ scale: 1.1, hour: 6, mins: 20, rest: 10, lb: 204 })]);
  logs.push(['marked', xl({ scale: 0.85, hour: 18, marks: { today: { r: 'unwell', d: key(at(0, 18)) } } })]);
  // a bench whose last session is marked: the target from before it
  { const ss = []; const head = [160, 165, 170, 175, 180, 185]; let a = 30;
    head.forEach(w => { ss.push(S(a, [['barbell-bench-press', 3, w, 8], ['barbell-row', 3, 155, 8], ['overhead-press', 3, 95, 8]])); a -= 4; });
    ss.push(S(1, [['barbell-bench-press', 3, 190, [6, 5, 5]], ['barbell-row', 3, 155, 8], ['overhead-press', 3, 95, 8]], { id: 'bad' }));
    logs.push(['markedTarget', inp({ sessions: sort(ss), settings: { v: 1, mute: {}, answers: {}, asked: {}, lastGreet: '', marks: { bad: { r: 'sleep', d: key(at(1, HOUR)) } } } })]); }

  const MUST_NEVER = [
    /\b(1\s*rm|one[- ]rep max) (test|attempt)|\bmax(ing)? out\b|\bgo for a (single|max)\b|\btest your max\b/i,
    /\b(because (you|your)|caused|due to (your|the)|led to|made you|that'?s why|despite|even though)\b/i,
    /\b(healthy (weight|range)|bmi|body ?fat|safe rate|too (fat|thin))\b/i,
    /\beat\b|\b(cut (your )?calories|skip (a )?meal|fast(ed|ing)?\b|carb[- ]?load(ed|ing)?|supplement|under-?fuel)/i,
    /\b(injur(y|ed)|diagnos|pain\b|push through)\b/i,
    /\b(you should have|you missed|slacking|lazy)\b/i,
    /\b(ai|artificial intelligence|machine learning)\b/i
  ];
  const CAUSE = [/\bbecause\b/i, /\bcaused?\b/i, /\bdue to\b/i, /\bthat'?s why\b/i, /\bso you\b/i, /\bleads? to\b/i, /\bmakes? you\b/i, /\bresults? in\b/i, /\bthanks to\b/i];
  const RULES = BANNED.concat(CAUSE, MUST_NEVER, [/\bshould\b/i, /\btry\b/i, /\bmust\b/i]);
  const said = [];
  const push = (where, u, t) => { if (t) said.push({ where, u, t: String(t) }); };
  const answer = (where, u, a) => { if (!a || !a.id) return; [a.text, a.reason].concat((a.more || []).flatMap(m => [m.text, m.reason])).forEach(t => push(where, u, t));
    if (a.mark) { push(where + '/mark', u, a.mark.text); a.mark.options.forEach(o => push(where + '/ack', u, o.ack)); } };
  const reached = new Set();
  logs.forEach(([name, fx]) => ['lb', 'kg'].forEach(u => {
    const x = { ...fx, u };
    const c = C.coach(x);
    ['ask_shape', 'ask_lighter', 'ask_targets', 'ask_build_now', 'ask_build_anyway', 'ask_compare', 'ask_next'].forEach(id => {
      const a = c.ask(id); reached.add(a.id); answer(name + '/' + u + '/' + id, u, a); });
    c.buildMenu().forEach(m => { const k = c.buildCaution(m.opts); if (k) { reached.add('caution'); push(name + '/' + u + '/caution', u, k.text); push(name + '/' + u + '/caution', u, k.reason); } });
    const p = c.build({});
    (p ? p.exercises : []).forEach(e => { if (e.target) { if (e.target.marked) reached.add('marked'); push(name + '/' + u + '/target', u, e.target.line); e.target.why.forEach(w => push(name + '/' + u + '/why', u, w)); } });
    push(name + '/' + u + '/reason', u, p && p.reason.join(' '));
    const ri = C.readyInput(x);
    RD.readinessRows(ri, x.now).forEach(r => { if (r.text) { reached.add('row:' + r.id); push(name + '/' + u + '/row', u, r.text); } });
    const last = ri.overlap.shaped[ri.overlap.shaped.length - 1];
    if (last) RD.sessionRows(ri, last).forEach(r => { reached.add('diff:' + r.id); push(name + '/' + u + '/diff', u, r.text); });
  }));
  push('clear', 'lb', C.MARK_ASK.clear.ack);
  /* Phase B: "Am I fueled?" and its two follow-ups, on a month of food
     logged as he goes (so far today, lighter and heavier), logged in a batch
     late at night, nothing logged today, and today's log unreadable. */
  { const fa = (ago, h, m) => at(ago, h, m);
    const REALF = [[8, 0, 600, 60], [12, 0, 800, 90], [15, 0, 400, 50], [20, 0, 700, 80]];
    const BAT = [[21, 30, 600, 60], [21, 45, 800, 90], [22, 0, 400, 50], [22, 15, 700, 80]];
    const monthF = (pat, now, todayScale, todayLog) => {
      const sessions = [], summaries = {}, foodLog = {};
      for (let a = 1; a <= 60; a += 2) sessions.push(S(a, a % 4 === 1 ? UP : LO, { hour: 16 + (a % 3) }));
      for (let a = 1; a <= 30; a++) {
        const w = 0.9 + ((a * 7) % 5) * 0.05;
        const es = pat.map(([h, m, cal, c]) => ({ t: fa(a, h, m), cal: Math.round(cal * w), p: 30, c: Math.round(c * w) }));
        summaries[key(fa(a, 12))] = { cal: es.reduce((x, e) => x + e.cal, 0), p: 120, c: es.reduce((x, e) => x + e.c, 0), f: 70 };
        if (a % 2 === 1) foodLog[key(fa(a, 12))] = es;
      }
      const es = pat.map(([h, m, cal, c]) => ({ t: fa(0, h, m), cal: Math.round(cal * todayScale), p: 30, c: Math.round(c * todayScale) }))
        .filter(e => e.t <= now - 3600e3);
      if (todayScale && es.length) summaries[key(now)] = { cal: es.reduce((x, e) => x + e.cal, 0), p: 50, c: es.reduce((x, e) => x + e.c, 0), f: 20 };
      if (todayLog !== undefined) foodLog[key(now)] = todayLog; else if (es.length) foodLog[key(now)] = es;
      return inp({ sessions: sort(sessions), summaries, foodLog, now,
                   weight: { latestLb: 182, latestAt: now, rateWk: -1, rateDays: 30, goalDir: -1, goalRateWk: -1 } });
    };
    const T = fa(0, 13, 30);
    [['fuelLight', monthF(REALF, T, 0.4)], ['fuelHeavy', monthF(REALF, T, 1.6)], ['fuelUsual', monthF(REALF, T, 1)],
     ['fuelBatch', monthF(BAT, fa(0, 23), 1)], ['fuelEmpty', monthF(REALF, T, 0)], ['fuelUnread', monthF(REALF, T, 1, null)]]
      .forEach(([name, fx]) => ['lb', 'kg'].forEach(u => {
        const x = { ...fx, u };
        const c = C.coach(x);
        ['ask_fueled', 'ask_fed_unlogged', 'ask_fed_none', 'ask_lighter'].forEach(id => {
          const a = c.ask(id); reached.add(a.id); answer(name + '/' + u + '/' + id, u, a);
          if (a.question) { push(name + '/' + u + '/q', u, a.question.text); push(name + '/' + u + '/q', u, a.question.ack); }
        });
      })); }
  const want = ['rest_day', 'group_ready', 'readiness', 'lift_targets', 'session_compare', 'caution', 'marked', 'build_menu',
                'fuel_fueled', 'fuel_empty', 'fuel_fed_unlogged', 'fuel_fed_none'];
  check('the sweep reaches every new answer — ' + want.filter(w => reached.has(w)).join(', ') + ' (' + said.length + ' strings)',
        want.every(w => reached.has(w)) && said.some(x => x.u === 'kg'), want.filter(w => !reached.has(w)).join(', '));
  check('and every readiness row and every "what was different" component',
        ['recovery', 'streak', 'load', 'failure', 'lifts', 'time', 'weighin'].every(r => reached.has('row:' + r)) &&
        ['rest', 'streak', 'week', 'start', 'length', 'weighin'].every(r => reached.has('diff:' + r)),
        [...reached].filter(x => /^(row|diff):/.test(x)).join(', '));
  const bad = said.map(x => ({ ...x, w: RULES.filter(re => re.test(x.t)).map(re => (x.t.match(re) || [''])[0])
    .concat(x.u === 'kg' && /\d ?lb\b/.test(x.t) ? ['lb on a kilo account'] : [])
    .concat(/'/.test(x.t) ? ['a straight apostrophe'] : []).concat(/!/.test(x.t) ? ['an exclamation mark'] : []) })).filter(x => x.w.length);
  check('not one carries the shipped ban, a cause, a max attempt, a body norm, eating, a medical word, guilt, "AI", "should", "try" or "must" — both units',
        !bad.length, list(bad.map(x => x.where + ' “' + x.w.join('/') + '” in: ' + x.t)));
  const lowFood = said.filter(x => /^fuel/.test(x.where) && /\blow\b/i.test(x.t));
  check('and no food sentence says "low" — a light day is "on the light side", a half-logged one "not fully logged"', !lowFood.length,
        list(lowFood.map(x => x.where + ': ' + x.t)));
  check('"Didn’t" is his voice, on a chip, and never Coach’s in a sentence',
        C.MARK_ASK.options.some(o => /Didn’t/.test(o.label)) && !said.some(x => /\bdidn[’']t\b/i.test(x.t)));
  const sources = src('coach-ready.js');
  // The unit TOKEN (u === 'kg' ? 'kg' : 'lb') selects a unit and is never
  // printed; coach-units.mjs strips it the same way before it reads copy.
  const copy = decomment(sources).replace(/=== '(kg|lb)' \? '(kg|lb)' : '(kg|lb)'/g, '').replace(/=== '(kg|lb)'/g, '');
  check('coach-ready.js prints every weight through units.js — no unit word typed into it',
        !/'[^'\n]*\b(lb|lbs|kg|pounds?|kilos?)\b[^'\n]*'/.test(copy), (copy.match(/.*'[^'\n]*\b(lb|lbs|kg|pounds?|kilos?)\b[^'\n]*'.*/) || [''])[0].trim());
}

/* ================= M. v53 — THE FINISH LINE, UNDER EVERY BAN ================= */
section('M. v53 — every sentence of the finish line, on the recap, the card and the sheet, both units');
{
  /* The finish line is the first thing he reads after a workout, on three
     surfaces, one of them the card — so it carries the card ban as well as
     the shipped list, the causal words, "eat", "should", "try" and "must",
     and SHIP-V53-PROMPT §4.2's own: never a percentage, "down", "under",
     "below", "lighter", "only", "still" or "!". Read on the source, so a
     branch no log reaches is under it too, and on what finishRead() says. */
  const CAUSE = [/\bbecause\b/i, /\bcaused?\b/i, /\bdue to\b/i, /\bthat'?s why\b/i, /\bso you\b/i, /\bleads? to\b/i,
                 /\bmakes? you\b/i, /\bresults? in\b/i, /\bthanks to\b/i];
  const NEVER = [/%/, /\bdown\b/i, /\bunder\b/i, /\bbelow\b/i, /\blighter\b/i, /\bonly\b/i, /\bstill\b/i, /!/];
  const RULES = BANNED.concat(CARD_BANNED, CAUSE, NEVER, [/\beat\b/i, /\beating\b/i, /\bshould\b/i, /\btry\b/i, /\bmust\b/i]);
  const hits = t => RULES.filter(re => re.test(t)).map(re => (t.match(re) || [''])[0]);
  const COACH = src('coach.js');
  // From the opening of the section's own comment, so decomment() sees it whole.
  const from = COACH.lastIndexOf('/*', COACH.indexOf('7c. THE FINISH LINE')), to = COACH.lastIndexOf('/*', COACH.indexOf('8.  THE SHEET\'S TOPICS'));
  const part = from > 0 && to > from ? decomment(COACH.slice(from, to)) : '';
  const lits = literals(part).filter(t => /[a-z]{3}/i.test(t));
  const srcBad = lits.map(t => ({ t, w: hits(t) })).filter(x => x.w.length);
  check('the finish line’s source was found and read (' + lits.length + ' strings), and none carries a ban',
        lits.length >= 20 && !srcBad.length, list(srcBad.map(x => '“' + x.w.join('/') + '” in: ' + x.t)));
  check('and it types no unit word: every weight goes through units.js',
        !/'[^'\n]*\b(lb|lbs|kg|pounds?|kilos?)\b[^'\n]*'/.test(part.replace(/=== '(kg|lb)'/g, '')));
  // What it says: every fixture's latest session as though just finished,
  // rated every way and marked, on both tiers and both units.
  const said = [];
  const FEELS = [null, { e: 9 }, { s: 120 }, { s: 80 }, { e: 2 }, { e: 5, s: 100 }];
  Object.entries(FIXTURES).forEach(([name, fx]) => {
    const ss = (fx.sessions || []).slice();
    if (!ss.length) return;
    const last = ss[ss.length - 1];
    FEELS.forEach((feel, k) => ['lb', 'kg'].forEach(u => [true, false].forEach(pro => {
      const rec = { ...last, id: 'fin' + k, startedAt: NOW - 2 * 36e5, endedAt: NOW - 36e5, _date: key(NOW - 2 * 36e5), ...(feel ? { feel } : {}) };
      const marks = k === 3 ? { [rec.id]: { r: 'sleep', d: key(rec.startedAt) } } : {};
      const inp = { ...fx, u, tier: { pro }, sessions: ss.slice(0, -1).concat([rec]),
                    settings: { ...(fx.settings || {}), marks } };
      const f = C.finishRead(inp, rec);
      [f.headline, f.line, f.why].forEach(t => said.push({ where: name + '/' + u + '/' + k, u, t }));
      const c = C.coach(inp);
      if (c.card.you.id === 'hype_finish') [c.card.you.text, c.card.you.reason].forEach(t => said.push({ where: name + '/card', u, t }));
      if (c.opening.id === 'finish') [c.opening.text, c.opening.reason].forEach(t => said.push({ where: name + '/sheet', u, t }));
    })));
  });
  const heads = new Set(said.filter(x => /\/\d+$/.test(x.where)).map(x => x.t).filter(t => /^(Great workout|Good work)\.$/.test(t)));
  check('the sweep reads both headlines, the card and the sheet (' + said.length + ' strings)',
        heads.size === 2 && said.some(x => /card$/.test(x.where)) && said.some(x => /sheet$/.test(x.where)), [...heads].join(', '));
  const bad = said.map(x => ({ ...x, w: hits(x.t).concat(x.u === 'kg' && /\d ?lb\b/.test(x.t) ? ['lb on a kilo account'] : [])
    .concat(/'/.test(x.t) ? ['a straight apostrophe'] : []) })).filter(x => x.w.length);
  check('not one carries a ban, a cause, "eat", a percentage, "down", "under", "below", "lighter", "only", "still" or "!" — both units',
        !bad.length, list(bad.map(x => x.where + ' “' + x.w.join('/') + '” in: ' + x.t)));

  /* v53's other new sentences, sheet-only: his rating under "How did today
     compare?" (feelLine) and the three energy patterns. The shipped list, the
     causal words, "eat", "should", "try" and "must" — never the card ban's
     "below", which "By the numbers it was below your usual" quotes as
     compareSession() says it. Source here; rendered in feel.mjs E and
     coach-patterns.mjs I. */
  const SHEET = BANNED.concat(CAUSE, [/\beat\b/i, /\beating\b/i, /\bshould\b/i, /\btry\b/i, /\bmust\b/i]);
  const fl = COACH.indexOf('function feelLine(');
  const feelSrc = fl > 0 ? decomment(COACH.slice(COACH.lastIndexOf('/*', fl), COACH.indexOf('\n}\n', fl))) : '';
  const say = [...COACH.matchAll(/say\('feel\.[a-zA-Z]+'[\s\S]*?\);\n/g)].map(m => m[0]).join('\n');
  const newLits = literals(feelSrc + '\n' + say).filter(t => /[a-z]{3}/i.test(t));
  const newBad = newLits.filter(t => SHEET.some(re => re.test(t)));
  check('his rating on "How did today compare?" and the three energy patterns were read (' + newLits.length + ' strings), and none carries a ban',
        !!feelSrc && (say.match(/say\('feel\./g) || []).length === 3 && newLits.length >= 12 && !newBad.length, list(newBad));
  const fx = Object.values(FIXTURES).find(x => (x.sessions || []).length >= 6) || null;
  const ratedSaid = [];
  if (fx) ['lb', 'kg'].forEach(u => [{ e: 8, s: 110 }, { s: 80, e: 2 }, { e: 5 }, { s: 120 }].forEach(feel => {
    const ss = fx.sessions.slice();
    const last = { ...ss[ss.length - 1], id: 'rated', startedAt: NOW - 2 * 36e5, endedAt: NOW - 36e5, _date: key(NOW - 2 * 36e5), feel };
    const a = C.coach({ ...fx, u, sessions: ss.slice(0, -1).concat([last]) }).ask('ask_compare');
    (a.more || []).filter(m => /rated it/.test(m.text)).forEach(m => ratedSaid.push(m.text, m.reason));
  }));
  check('and as said: his rating beside the numbers, in both units, under the same ban (' + ratedSaid.length + ' strings)',
        ratedSaid.length >= 8 && !ratedSaid.some(t => SHEET.some(re => re.test(t)) || /!/.test(t)), list(ratedSaid));
}

/* ================= N. v54 — IN THE GYM: THE NEXT SET, AND WHAT COACH SAYS AFTER A TAP ================= */
section('N. v54 — the next set, its why, "How was it?" and Coach’s answer after a tap: warm first, both units, under the ban');
{
  /* Stage five speaks mid-set, the most sensitive place Coach speaks. Every
     sentence it can build is held to the shipped list, the causal words, the
     words the targets were held to (should, try, must, push, eat), SHIP-V54-
     PROMPT §8 (never "AI", no exclamation mark, nothing about health or the
     body, no eating advice), and in kilos no pound anywhere. Read on the
     source — coach-live.js's v54 half and coach-prog.js's section 6 — and on
     what the engine says across rated live sessions. The three chip labels
     are his words ("way too easy" is Micah's), as every chip label is. */
  const CAUSE = [/\bbecause\b/i, /\bcaused?\b/i, /\bdue to\b/i, /\bthat'?s why\b/i, /\bleads? to\b/i, /\bmakes? you\b/i, /\bresults? in\b/i];
  const GYM = BANNED.concat(CAUSE, [/\bshould\b/i, /\btry\b/i, /\bmust\b/i, /\bpush\b/i, /\beat\b/i, /\beating\b/i, /\bfood\b/i,
    /\bAI\b/, /\bartificial intelligence\b/i, /!/, /\b(health|healthy|injur|pain|hurt|posture|joint|doctor|physio|recovery)\b/i,
    /\b(1\s*rm|one[- ]rep max|max out|test your max)\b/i]);
  const hits = t => GYM.filter(re => re.test(t)).map(re => (t.match(re) || [''])[0]);
  const LSRC = src('coach-live.js');
  const LV54 = decomment(LSRC.slice(LSRC.lastIndexOf('/*', LSRC.indexOf('THE SET IN HAND, AND THE NEXT ONE'))));
  const PSRC = src('coach-prog.js');
  const PV54 = decomment(PSRC.slice(PSRC.lastIndexOf('/*', PSRC.indexOf('6.  THE NEXT SET'))));
  const labels = ['Way too easy', 'About right', 'Too hard'];
  const lits = literals(LV54).concat(literals(PV54)).filter(t => /[a-z]{3}/i.test(t) && !labels.includes(t));
  const srcBad = lits.map(t => ({ t, w: hits(t) })).filter(x => x.w.length);
  check('the in-gym source was found and read (' + lits.length + ' strings), and none carries a ban',
        lits.length >= 20 && lits.some(t => /Next set: /.test(t)) && lits.some(t => /How was it\?/.test(t)) && !srcBad.length,
        list(srcBad.map(x => '“' + x.w.join('/') + '” in: ' + x.t)));
  // A unit handed TO units.js (wIn(P, 'kg')) is a units.js call, not copy.
  check('and neither half types a unit word: every weight goes through units.js',
        !/'[^'\n]*\b(lb|lbs|kg|pounds?|kilos?)\b[^'\n]*'/.test((LV54 + PV54).replace(/=== '(kg|lb)' \? '(kg|lb)' : '(kg|lb)'/g, '')
          .replace(/=== '(kg|lb)'/g, '').replace(/\b(wIn|wOut)\([^()]*\)/g, '')),
        ((LV54 + PV54).match(/'[^'\n]*\b(lb|lbs|kg|pounds?|kilos?)\b[^'\n]*'/g) || []).join(' '));
  // What it says: a log climbing by his own steps, typed in each unit, and
  // live sessions of every kind of next set, each rated every way.
  const NL = { 'barbell-bench-press': { name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell' },
               'back-squat-high-bar': { name: 'Back Squat (High Bar)', group: 'legs', equipment: 'barbell' } };
  const said = [];
  const kinds = new Set();
  ['lb', 'kg'].forEach(u => {
    const st = L => (u === 'kg' ? String(U.wIn(L, 'kg')) : String(L));
    const plan = u === 'kg' ? { 'barbell-bench-press': [77.5, 80, 80, 82.5, 82.5, 85, 85, 85], 'back-squat-high-bar': [95, 100, 100, 105, 105, 110, 115, 115] }
                            : { 'barbell-bench-press': [170, 175, 175, 180, 180, 185, 185, 185], 'back-squat-high-bar': [225, 235, 235, 245, 245, 255, 255, 255] };
    const reps = { 'barbell-bench-press': 8, 'back-squat-high-bar': 5 };
    const log = [];
    for (let k = 0; k < 8; k++) log.push({ id: 'n' + k, startedAt: NOW - (3 + 7 * (7 - k)) * DAY, _date: key(NOW - (3 + 7 * (7 - k)) * DAY),
      exercises: Object.keys(NL).map(id => ({ exId: id, ...NL[id], sets: Array.from({ length: 3 }, () => ({ w: st(plan[id][k]), r: String(reps[id]), type: 'N', done: true })) })) });
    const eng = C.coach(base({ u, sessions: sort(log), lib: NL, hidden: [], live: { active: true } }));
    Object.keys(NL).forEach(id => {
      const top = plan[id][7], step = plan[id][7] - plan[id][6] || plan[id][6] - plan[id][5];
      const T = top + step;
      const shapes = [[], [[T, reps[id]]], [[T, reps[id] + 2]], [[T, reps[id], 'F']], [[T, reps[id]], [T, Math.floor(reps[id] * 0.7)]],
                      [[T, reps[id] - 2]], [[T, reps[id] + 2], [T + step, reps[id]]], [[top, reps[id]]]];
      shapes.forEach(rows => [null, 4, 2, 0].forEach(rir => {
        const sets = rows.map(([w, r, type], i) => ({ w: st(w), r: String(r), type: type || 'N', done: true, ...(rir != null && i === rows.length - 1 ? { rir } : null) }))
          .concat([{ w: '', r: '', type: 'N', done: false }]);
        const s = { id: 'wn', name: 'N', startedAt: NOW - 1800e3, exercises: [{ exId: id, ...NL[id], sets }] };
        const got = eng.liveSet(s, { current: 0 });
        if (!got) return;
        if (got.next) { kinds.add(got.next.kind); said.push({ u, t: got.next.text }, ...got.next.why.map(t => ({ u, t }))); }
        if (got.rated) said.push({ u, t: C.rateAsk(got.rated, u) });
        [4, 2, 0, null].forEach(v => said.push({ u, t: C.rateAnswer(v, got.next, u) }));
      }));
    });
  });
  const bad = said.map(x => ({ ...x, w: hits(x.t).concat(x.u === 'kg' && /\d ?lb\b/.test(x.t) ? ['lb on a kilo account'] : []) })).filter(x => x.w.length);
  check('every kind of next set was said — target, same, up, down, stop — and the line and answers around them (' + said.length + ' strings)',
        ['target', 'same', 'up', 'down', 'stop'].every(k => kinds.has(k)) && said.length > 300, [...kinds].join(', '));
  check('not one carries a banned word, a cause, a health or body word, "AI", an exclamation mark, or a pound in kilos',
        !bad.length, list(bad.map(x => '[' + x.u + '] “' + x.w.join('/') + '” in: ' + x.t)));
  check('and every answer after a tap opens warm — "Strong set.", "Good." or "Noted." — or says it cleared, before any number',
        said.filter(x => /^(Strong set|Good|Noted|Cleared)\./.test(x.t) || !/^(Strong|Good|Noted|Cleared)/.test(x.t)).length === said.length &&
        said.filter(x => /Next one|Same again|Stay at|Saved with the set|Cleared/.test(x.t)).every(x => /^(Strong set|Good|Noted|Cleared)\./.test(x.t)));
  // The target's why when his rating moved or held it (coach-prog.js decide()).
  const rated = ['Last time 185 lb × 12 felt too hard, so it’s the same again.', 'Last time you rated 185 lb for 10, 10, 9 way too easy.'];
  const ratedSrc = literals(decomment(PSRC)).filter(t => /felt too hard|way too easy|you rated/.test(t));
  check('the target’s why when his rating moved or held it is in his words, under the same ban (' + ratedSrc.length + ' literals)',
        ratedSrc.length >= 3 && rated.every(t => !hits(t.replace(/\brated ([^.]*?)way too easy\b/, 'rated $1')).length) &&
        !ratedSrc.some(t => hits(t.replace(/^\s*way too easy\b/, '')).filter(w => w !== 'easy').length));
}

/* ---------- report ---------- */
console.log('\nCoach describes the numbers, and never the person, on a card nobody asked\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
