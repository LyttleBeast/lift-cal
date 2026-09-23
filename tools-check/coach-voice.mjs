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
//   F  the stall sentence   a readout: a figure, a date, and the goal's own
//                           direction — with unknown left unknown

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
/* coach-build.js, the workout builder, is staged the same way: coach.js
   imports it, and it takes analytics.js's session math through the same stub. */
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-live.js, the in-session read (ship three), is staged the same way:
   coach.js imports it too, and it takes the same session math through the stub. */
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-build.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href))
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

/* ================= F. THE STALL SENTENCE IS A READOUT ================= */
section('F. the stall sentence — a figure, a date, and the goal’s own direction');
{
  const stallText = (weight, u) =>
    C.coach({ ...FIXTURES.stalled, u, weight: { ...FIXTURES.stalled.weight, ...weight } }).ask('ask_stall').text;

  const plain = stallText({}, 'lb');
  const plainKg = stallText({}, 'kg');

  // A figure, through units.js, exactly as units.js prints one anywhere else.
  const lbNum = Number((/([\d.]+) lb/.exec(plain) || [, NaN])[1]);
  check('it names a weight, and a real one', Number.isFinite(lbNum) && lbNum > 50, plain);
  check('and the weight is units.js’s own rendering', plain.includes(U.labelW(lbNum, 'lb')), plain);
  check('it reads differently on kilos — the number moves and the word with it',
        plainKg !== plain && plainKg.includes(U.labelW(lbNum, 'kg')) && !/\blb\b/.test(plainKg), plainKg);

  // And a date: WHEN the figure was last matched, read out of the log.
  check('it names when the figure was last matched', /last matched/.test(plain), plain);
  const nearer = C.coach({
    ...FIXTURES.stalled, u: 'lb',
    sessions: sort([
      sess(35, [['bench', three(225, 5)]], 'n'),
      sess(30, [['bench', three(215, 5)]], 'n'),
      sess(20, [['bench', three(210, 5)]], 'n'),
      sess(10, [['bench', three(205, 5)]], 'n'),
      sess(4,  [['bench', three(200, 5)]], 'n')
    ])
  }).ask('ask_stall').text;
  check('and the date is read from the log rather than printed from a constant — ' +
        'the same figure matched five days later reads differently',
        nearer !== plain && nearer.includes(U.labelW(lbNum, 'lb')), nearer);

  /* The direction branch, which is the third half of the same defect. A flat
     estimated max on an account whose own goal points DOWN and whose rate
     agrees is a lift held through a deficit, and reading it the other way is a
     wrong number about the most sensitive thing Coach looks at. */
  const down = stallText({ goalDir: -1, rateWk: -0.9, rateDays: 21 }, 'lb');
  check('with the account’s own goal pointing down and the rate agreeing, the reading is different',
        down !== plain && down.length > plain.length, down);
  check('and the readout underneath is untouched — the direction is a clause added, not a verdict substituted',
        down.startsWith(plain) && /last matched/.test(down), down);
  check('and the down branch renders on kilos too, in the reader’s unit',
        stallText({ goalDir: -1, rateWk: -0.9, rateDays: 21 }, 'kg').includes(U.labelW(lbNum, 'kg')));

  /* Unknown stays unknown. weight.goalDir is the account's own stated
     direction and null means nobody stated one — a sentence that read a
     direction out of a rate nobody declared would be Coach guessing at the
     goal, which is the thing the fact's own comment forbids. */
  check('goalDir null does not move the sentence, however the weight is going',
        stallText({ goalDir: null, rateWk: -0.9, rateDays: 21 }, 'lb') === plain);
  check('and neither does a goal pointing the other way',
        stallText({ goalDir: 1, rateWk: -0.9, rateDays: 21 }, 'lb') === plain &&
        stallText({ goalDir: 0, rateWk: -0.9, rateDays: 21 }, 'lb') === plain);
  check('nor a stated down goal with no rate behind it — both halves, or neither',
        stallText({ goalDir: -1, rateWk: null }, 'lb') === plain);
  check('nor a stated down goal the account is moving against',
        stallText({ goalDir: -1, rateWk: 0.9, rateDays: 21 }, 'lb') === plain);
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
        uiCopy.length >= 6 && ['Start it', 'Start with my last numbers', 'Save as routine', 'Change something']
          .every(l => uiCopy.includes(l)), list(uiCopy));
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
}

/* ---------- report ---------- */
console.log('\nCoach describes the numbers, and never the person, on a card nobody asked\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
