#!/usr/bin/env node
//
// Verifier for the ranking rule — which single finding reaches the card.
//
//   node tools-check/coach-rank.mjs
//
// The You card has one finding slot and Coach usually has several true things
// it could put in it. Everything about which one wins is in coach.js's rank(),
// and the two properties that matter are not "it picks a good one" — that is a
// judgement — but these, which are checkable:
//
//   IT IS TOTAL.  Every key in the sort tuple is deterministic and the last of
//                 them is a unique id, so a tie is impossible. Two devices
//                 reading one account show the same sentence, and a repaint
//                 does not reshuffle the card under somebody's thumb.
//   IT IS HONEST. Band 1 belongs to the three blocking states and nothing else
//                 may occupy it; a muted category vanishes rather than being
//                 quietly reordered; a finding another finding supersedes is
//                 gone rather than demoted; and a free account is told how many
//                 findings it is not being shown rather than being shown a
//                 shorter list with no explanation.
//
// Every case below is driven against the real engine. Nothing here holds a copy
// of the sort or of the registries.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-rank-'));
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

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(', ') + (xs.length > 8 ? ' … (' + xs.length + ')' : '');

/* ---------- one fixture, driven every way ---------- */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => {
  const d = new Date(ms), p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};
const LIB = {
  bench: { group: 'chest', equipment: 'barbell' }, row: { group: 'back', equipment: 'barbell' },
  squat: { group: 'legs', equipment: 'barbell' }, press: { group: 'shoulders', equipment: 'barbell' },
  curl:  { group: 'arms', equipment: 'dumbbell' }, bike: { group: 'legs', equipment: 'cardio' }
};
const sets = (n, w, r) => Array.from({ length: n }, () => ({ w: String(w), r: String(r), type: 'N', done: true }));
const sess = (ago, rows, tag) => ({
  id: 's' + ago + (tag || ''), startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY),
  exercises: rows.map(([ex, n, w, r]) => ({
    exId: ex, name: ex, group: LIB[ex].group, equipment: LIB[ex].equipment, sets: sets(n, w, r || 5)
  }))
});
const summaries = {};
for (let i = 1; i <= 8; i++) summaries[key(NOW - i * DAY)] = { cal: 2450, p: 110, c: 310, f: 95 };
summaries[key(NOW)] = { cal: 900, p: 70, c: 90, f: 30 };

const training = [];
for (let w = 0; w < 12; w++) {
  if (w > 1) training.push(sess(w * 7 + 2, [['bench', 3, 185 + w], ['press', 3, 95, 8]]));
  training.push(sess(w * 7 + 4, [['row', 3, 155, 8], ['curl', 3, 40, 10]]));
  training.push(sess(w * 7 + 6, [['squat', 3, 245]]));
}
const BASE = {
  now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable',
  sessions: training.slice().sort((a, b) => a.startedAt - b.startedAt),
  lib: LIB, routines: [], live: { active: false }, tier: { pro: true },
  targets: { cal: 2300, p: 210, f: 74, auto: { rateWk: -1 } }, targetsSet: true,
  summaries,
  steps: { days: Object.fromEntries([0, 1, 2, 3, 4].map(i => [key(NOW - i * DAY), { steps: i ? 9100 : 4200 }])) },
  weight: { latestLb: 186.4, latestAt: NOW - 9 * DAY, rateWk: -0.8, rateDays: 21, goalDir: -1, goalRateWk: -1 },
  settings: { v: 1, mute: {}, answers: {}, asked: {}, lastGreet: '' }
};
const on = extra => C.coach({ ...BASE, ...extra });

/* Everything that CAN fire on this fixture, by asking the router for each
   intent's own route — the ranked card shows one, and this is how the rest are
   known to exist. */
const FINDINGS = C.INTENTS.filter(i => i.kind === 'finding').map(i => i.id);

/* ================= A. STEP 0 ================= */
section('A. step 0 — three blocking states, mutually exclusive, ahead of everything');
{
  const normal = on({});
  check('on a full log, the card shows a finding rather than a state',
        normal.you.state === 'finding', normal.you.state + ' ' + normal.you.id);

  const unreadable = on({ log: 'unknown' });
  check('an unreadable log shows guard_log_unreadable and nothing else',
        unreadable.you.state === 'guard_log_unreadable' && unreadable.train.state === 'guard_log_unreadable',
        unreadable.you.id + ' / ' + unreadable.train.id);
  check('and it outranks a log full of findings — the same sessions are still there',
        unreadable.you.id !== normal.you.id && BASE.sessions.length > 20);
  check('and no other rule answers either: every route returns the guard',
        C.ROUTE_IDS.every(r => unreadable.ask(r).id === 'guard_log_unreadable'),
        list(C.ROUTE_IDS.filter(r => unreadable.ask(r).id !== 'guard_log_unreadable')));

  const empty = on({ log: 'empty', sessions: [] });
  check('an empty log shows card_first_run',
        empty.you.state === 'card_first_run', empty.you.id);
  check('and card_first_run states what it needs without a placeholder number',
        !/\d/.test(empty.you.text), empty.you.text);

  const live = on({ live: { active: true } });
  check('a live session outranks every finding on the log',
        live.you.state === 'card_live_session' && live.train.state === 'card_live_session', live.you.id);

  // Mutually exclusive: the order in step 0 is fixed, so an unreadable log with
  // a live session on the device is still an unreadable log.
  const both = on({ log: 'unknown', live: { active: true } });
  check('unreadable beats live, and the order is the table’s rather than the caller’s',
        both.you.id === 'guard_log_unreadable', both.you.id);
  const emptyLive = on({ log: 'empty', sessions: [], live: { active: true } });
  check('and first-run beats live', emptyLive.you.id === 'card_first_run', emptyLive.you.id);

  // Nothing but those three may reach band 1, and this is the driven version of
  // the registry's structural check.
  const band1 = C.INTENTS.filter(i => i.priorityBand === 1).map(i => i.id);
  check('band 1 holds only the blocking states and the fall-through states',
        band1.every(id => /^(guard_log_unreadable|card_first_run|card_live_session|card_state_)/.test(id)),
        list(band1));
}

/* ================= B. A TIE IS IMPOSSIBLE ================= */
section('B. the sort is total — two devices show the same sentence');
{
  const sev = C.INTENTS.filter(i => i.kind === 'finding').map(i => i.priorityBand + ':' + i.severity);
  check('no two findings share a band and a severity, so the tuple decides before it reaches recency',
        new Set(sev).size === sev.length,
        list(sev.filter((x, i) => sev.indexOf(x) !== i)));

  const ids = C.INTENTS.map(i => i.id);
  check('and the last key is a unique id, so even a full tie has one answer',
        new Set(ids).size === ids.length);

  // The input's own order must not matter. analytics.allSessions() hands them
  // over sorted; a client that did not would otherwise get a different card.
  const shuffled = BASE.sessions.slice().reverse();
  const a = on({}), b = on({ sessions: shuffled });
  check('reversing the session list changes nothing about the answer',
        a.you.id === b.you.id && a.you.text === b.you.text, a.you.id + ' vs ' + b.you.id);

  // Object key order is not a key in the tuple either.
  const reKeyed = { ...BASE };
  const flipped = {};
  Object.keys(BASE.summaries).reverse().forEach(k => { flipped[k] = BASE.summaries[k]; });
  reKeyed.summaries = flipped;
  check('and neither does the order of the food summaries',
        C.coach(reKeyed).you.text === a.you.text);

  check('two calls in a row are identical, key for key',
        JSON.stringify(on({}).you) === JSON.stringify(on({}).you));
}

/* ================= C. SUPERSEDES ================= */
section('C. a superseded finding is gone, not demoted');
{
  // A fortnight of chest on top of the regular log: the caution finding fires
  // and names every do-more finding in its supersedes.
  const overused = on({
    sessions: BASE.sessions.concat([0, 1, 3, 5, 7, 9, 11].map(d => sess(d, [['bench', 3, 185]], 'x')))
      .sort((a, b) => a.startedAt - b.startedAt)
  });
  check('the caution finding takes the card', overused.you.id === 'same_group_overused', overused.you.id);
  check('and it is marked as a caution, which is what withholds a cheerful greeting',
        overused.you.tone === 'caution', overused.you.tone);

  const beaten = C.INTENTS.find(i => i.id === 'same_group_overused').supersedes;
  check('it names at least the four do-more findings', beaten.length >= 4, list(beaten));
  check('none of them reaches the You card', !beaten.includes(overused.you.id));
  check('and none of them reaches the Train card either — superseding is not demotion',
        !beaten.includes(overused.train.id), overused.train.id);

  // The headline subsumes the two sentences it is built out of.
  const plain = on({});
  if (plain.you.id === 'train_today_recommendation') {
    const sub = C.INTENTS.find(i => i.id === 'train_today_recommendation').supersedes;
    check('when the training headline fires, the shape and group sentences it is built from are gone',
          !sub.includes(plain.train.id), plain.train.id + ' vs ' + list(sub));
  } else {
    check('the fixture produced the training headline to test superseding against',
          false, 'got ' + plain.you.id);
  }

  /* Superseding governs the RANKED slot, not the router: somebody who taps
     "What's overdue?" asked, and gets an answer even though the card had
     already folded it into a bigger sentence. */
  check('but a superseded finding still answers when it is asked for directly',
        plain.ask('ask_overdue').id === 'group_overdue', plain.ask('ask_overdue').id);
}

/* ================= D. MUTED CATEGORIES ================= */
section('D. a muted category vanishes');
{
  const seen = [];
  let s = { ...BASE.settings, mute: {} };
  // Mute whatever is on the card, repeatedly, and watch it walk down the list.
  for (let i = 0; i < 8; i++) {
    const c = on({ settings: s });
    if (c.you.state !== 'finding') break;
    seen.push(c.you.id);
    const cat = C.INTENTS.find(x => x.id === c.you.id).category;
    const row = C.CATEGORIES.find(x => x.id === cat);
    if (!row.mutable) break;
    s = { ...s, mute: { ...s.mute, [cat]: true } };
  }
  check('muting the category on the card hands the slot to the next finding, not to nothing',
        seen.length >= 3 && new Set(seen).size === seen.length, list(seen));

  const allMuted = {};
  C.CATEGORIES.filter(c => c.mutable).forEach(c => { allMuted[c.id] = true; });
  const quiet = on({ settings: { ...BASE.settings, mute: allMuted } });
  check('with every mutable category off, the card falls through to a state rather than a finding',
        quiet.you.state !== 'finding', quiet.you.state + ' ' + quiet.you.id);
  check('and it says what it checked rather than pretending there was nothing there',
        quiet.you.state === 'card_state_clear' || quiet.you.state === 'card_state_thin',
        quiet.you.state);

  // core and safety are not mutable, and a mute written into the node by hand
  // must not take them off either.
  const forced = on({ settings: { ...BASE.settings, mute: { core: true, safety: true } } });
  check('a mute on core does not stop the card saying it cannot read the log',
        on({ log: 'unknown', settings: { ...BASE.settings, mute: { core: true } } }).you.id === 'guard_log_unreadable');
  const overusedMuted = C.coach({
    ...BASE,
    settings: { ...BASE.settings, mute: { safety: true } },
    sessions: BASE.sessions.concat([0, 1, 3, 5, 7, 9, 11].map(d => sess(d, [['bench', 3, 185]], 'x')))
      .sort((a, b) => a.startedAt - b.startedAt)
  });
  check('and a mute on safety does not switch off the caution finding',
        overusedMuted.you.id === 'same_group_overused', overusedMuted.you.id);
  check('normSettings drops both of those keys before they are ever written',
        C.normSettings({ mute: { core: true, safety: true } }).mute.core === undefined &&
        C.normSettings({ mute: { core: true, safety: true } }).mute.safety === undefined);
  check('a mute on a category that does not exist is dropped rather than stored',
        C.normSettings({ mute: { nonsense: true } }).mute.nonsense === undefined && forced.you.state.length > 0);
}

/* ================= E. THE TIER ================= */
section('E. a free account is told what it is not being shown');
{
  const pro  = on({ tier: { pro: true } });
  const free = on({ tier: { pro: false } });

  check('Pro counts nothing as locked', pro.lockedCount === 0);
  check('a free account has some findings behind the tier', free.lockedCount > 0, String(free.lockedCount));

  const proFindings = C.INTENTS.filter(i => i.kind === 'finding' && i.tier === 'pro').map(i => i.id);
  check('nothing on the free card is a Pro finding',
        free.you.state !== 'finding' || !proFindings.includes(free.you.id), free.you.id);
  check('and nothing on the free Train card is either',
        free.train.state !== 'finding' || !proFindings.includes(free.train.id), free.train.id);
  check('the free card still shows a real finding rather than only a lock',
        free.you.state === 'finding' || free.you.state === 'card_state_locked', free.you.state);
  check('the count is of findings that really would have fired, not of the whole Pro list',
        free.lockedCount <= proFindings.length, free.lockedCount + ' of ' + proFindings.length);

  // The count has to move with the data. Muting a Pro category takes it out of
  // the locked count too — somebody who switched a category off is not being
  // sold it back.
  const mutedPro = on({ tier: { pro: false }, settings: { ...BASE.settings, mute: { recency: true } } });
  check('muting a category reduces what is counted as locked',
        mutedPro.lockedCount < free.lockedCount, mutedPro.lockedCount + ' vs ' + free.lockedCount);

  // The free readouts are the same sentences the Pro account gets — the tier
  // decides WHICH findings, never how honest one of them is.
  const freeIds = C.INTENTS.filter(i => i.kind === 'finding' && i.tier === 'free').map(i => i.id);
  check('the free tier keeps the readouts and Pro adds the comparisons',
        freeIds.length >= 4 && proFindings.length >= 6, freeIds.length + ' free, ' + proFindings.length + ' pro');
}

/* ================= F. DEDUPE ACROSS SURFACES ================= */
section('F. the You card claims first, and the Train card takes what is left');
{
  const c = on({});
  check('the two cards never show the same finding in one paint',
        !(c.you.state === 'finding' && c.train.state === 'finding' && c.you.id === c.train.id),
        c.you.id + ' / ' + c.train.id);
  check('and the Train card shows a TRAINING finding rather than a food one',
        c.train.state !== 'finding' ||
        C.INTENTS.find(i => i.id === c.train.id).surfaces.includes('train'), c.train.id);

  // A card that had nothing left to show must say a state, not repeat.
  const oneOnly = on({
    sessions: [sess(2, [['bench', 3, 185]], 'a'), sess(5, [['bench', 3, 185]], 'b')],
    summaries: {}, steps: { days: {} },
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null }
  });
  check('with almost nothing logged, both cards fall through to a state',
        oneOnly.you.state !== 'finding' && oneOnly.train.state !== 'finding',
        oneOnly.you.state + ' / ' + oneOnly.train.state);

  /* v49 (updated deliberately): the sheet still opens on the ranked finding,
     c.you — but the CARD reads c.card now, which is an earned line or a
     state and never a finding. So the card encourages and the sheet opens on
     the finding, and the two no longer show the same line. */
  check('the sheet’s opening bubble is the ranked finding, c.you, exactly as v48 computed it',
        c.opening.id === c.you.id && c.opening.text === c.you.text);
  check('and neither card shows a finding any more — c.card is an earned line or a state',
        c.card.you.state !== 'finding' && c.card.train.state !== 'finding' &&
        (c.card.you.state === 'earned' || /^card_|^guard_/.test(c.card.you.state)),
        c.card.you.state + ' / ' + c.card.train.state);
}

/* ================= G. THE LEAD QUESTION ================= */
section('G. the lead question only offers topics that have data behind them');
{
  const you = c => c.topicsFor('you');
  const full = on({});
  /* v49: the You sheet's topics are the pre-workout table now — the general
     three, then the goal and the lifts — but the card's lead question is
     still drawn from the general three alone (updated deliberately). */
  check('a full account is offered one of the three general topics as its lead',
        full.lead && C.TOPICS.some(t => t.id === full.lead.id) &&
        you(full).slice(0, 3).map(t => t.id).join(',') === C.TOPICS.map(t => t.id).join(','),
        full.lead && full.lead.id);
  check('and never the one the card is already showing',
        !full.lead || !(full.you.state === 'finding' && full.lead.category === full.you.category),
        (full.lead && full.lead.category) + ' vs ' + full.you.category);

  const noFood = on({ targetsSet: false, targets: null, summaries: {} });
  check('an account with no food logged is not invited to ask about food',
        !you(noFood).some(t => t.id === 'topic_fuel'), list(you(noFood).map(t => t.id)));
  const noWeight = on({
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null }
  });
  check('and one that has never weighed in is not invited to ask about weight',
        !you(noWeight).some(t => t.id === 'topic_weight'), list(you(noWeight).map(t => t.id)));
  const nothing = on({
    log: 'empty', sessions: [], targetsSet: false, targets: null, summaries: {}, steps: { days: {} },
    weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null }
  });
  check('a brand-new account is offered nothing at all rather than three dead ends',
        !you(nothing).length && nothing.lead === null, list(you(nothing).map(t => t.id)));
  check('steps is never a topic bubble, and is still reachable as a follow-up',
        !you(full).some(t => t.id === 'topic_steps') && C.ROUTE_IDS.includes('ask_steps'));
}

/* ================= G2. THE SHEET KNOWS WHICH CARD OPENED IT =================
   Both surfaces used to be offered the same three, so the first thing under
   somebody's thumb on the way into a workout was "How's my food?". Train gets
   a training-first set now, and every id in it is one the router already
   answers — these are promotions, not new routes, so a bubble with no rule
   behind it is not constructible. */
section('G2. the topic set belongs to the surface that opened the sheet');
{
  const full = on({});
  const youSet   = full.topicsFor('you').map(t => t.id);
  const trainSet = full.topicsFor('train').map(t => t.id);

  /* Updated deliberately in v49 (SHIP-V49-PROMPT §6): before a workout the
     You sheet offers the general three, then "How am I tracking toward my
     goal?" and "How are my lifts moving?" — each only when it answers. */
  check('You gets the general three first, then the goal and the lifts (v49’s pre table)',
        youSet.join(',') === ['topic_train', 'topic_fuel', 'topic_weight'].concat(
          ['ask_goal', 'ask_lifts'].filter(id => full.ask(id).id !== id)).join(','),
        list(youSet));
  check('Train gets a different set, and a training-first one',
        trainSet.join(',') !== youSet.join(',') &&
        trainSet.every(id => C.TRAIN_TOPICS.some(t => t.id === id)), list(trainSet));
  /* v52 (SHIP-V52-PROMPT §10): "Am I fueled?" joins Train before a workout —
     the one food question there, and a question about the workout. Every
     other food and weight question stays off Train. */
  check('and not one of Train’s bubbles is about food or weight — bar "Am I fueled?", which is about the workout',
        !trainSet.some(id => id !== 'ask_fueled' && /fuel|weight|cal|protein|macro|rate|weighin/.test(id)), list(trainSet));
  check('every Train bubble is an id the router already answers',
        C.TRAIN_TOPICS.every(t => C.ROUTE_IDS.includes(t.id)),
        list(C.TRAIN_TOPICS.map(t => t.id)));
  check('and every one offered has a rule that actually fires behind it',
        trainSet.every(id => { const a = full.ask(id); return a && !/^Nothing to say/.test(a.text); }),
        list(trainSet));
  /* THE BUILDER, ship two. In ship one this was a check that no chip promised
     a workout, because nothing could build one. It can now, so the check is the
     rule every Train bubble lives by, applied to it: offered exactly when there
     is a proposal behind it, and never otherwise. */
  const built = on({ libReady: true, hidden: [] });
  const offers = x => x.topicsFor('train').some(t => t.id === 'ask_build');
  /* v46, from walking the builder: "What should I train today?" leads and
     "Make me a workout" follows it, and "Make me a workout" ASKS what to train
     before it builds. "Build it" — after an answer that already named it —
     does not ask. */
  check('"What should I train today?" is first in Train’s own table, "Make me a workout" second',
        C.TRAIN_TOPICS[0] && C.TRAIN_TOPICS[0].id === 'ask_shape' &&
        C.TRAIN_TOPICS[1] && C.TRAIN_TOPICS[1].id === 'ask_build', list(C.TRAIN_TOPICS.map(t => t.id)));
  check('offered, second, when the log builds a proposal',
        !!built.build({}) && built.topicsFor('train')[0].id === 'ask_shape' &&
        built.topicsFor('train')[1].id === 'ask_build', list(built.topicsFor('train').map(t => t.id)));
  const asks = built.ask('ask_build');
  check('and its answer is a question — what to train — with the choices under it',
        asks.id === 'build_menu' && asks.text === 'What do you want to train?' && built.buildMenu().length > 0,
        asks.id + ': ' + asks.text);
  check('whose first choice is Coach’s own, the proposal "Build it" makes',
        built.buildMenu()[0].label === 'Tell me what to train' &&
        JSON.stringify(built.build(built.buildMenu()[0].opts)) === JSON.stringify(built.build({})));
  const now = built.ask('ask_build_now');
  check('"Build it" asks nothing: its answer is the proposal’s own first line',
        now.id === 'build_workout' && now.text === built.build({}).headline, now.text);
  check('NOT offered while the library is unread — no proposal, no bubble',
        full.build({}) === null && !offers(full), list(trainSet));
  check('not offered during a live session',
        !offers(on({ libReady: true, hidden: [], live: { active: true } })));
  check('not offered on a log too thin to build from',
        !offers(on({ libReady: true, hidden: [], sessions: BASE.sessions.slice(-5) })));
  check('never on the You sheet', !built.topicsFor('you').some(t => t.id === 'ask_build'));

  /* The switch. Absent means on — every account that predates the category has
     it without a byte written — and off takes the bubble and the follow-up
     both. */
  check('an account with no `build` key at all has the builder on',
        C.normSettings({ v: 1, mute: { fuel: true } }).mute.build === undefined &&
        !C.isMuted(C.normSettings({ v: 1, mute: { fuel: true } }), 'build') && offers(built));
  const off = on({ libReady: true, hidden: [], settings: { ...BASE.settings, mute: { build: true } } });
  check('switched off, the bubble goes', !offers(off) && C.isMuted(C.normSettings({ mute: { build: true } }), 'build'));

  /* "Build it", after the two answers that name what to train. */
  const fu = (x, id) => x.ask(id).followups.map(f => f.id);
  check('the answer to "What should I train today?" offers "Build it" when a proposal exists',
        fu(built, 'ask_shape').includes('ask_build_now') && !fu(full, 'ask_shape').includes('ask_build_now'),
        list(fu(built, 'ask_shape')));
  const bi = built.ask('ask_shape').followups.find(f => f.id === 'ask_build_now') || {};
  check('and labels it so, standing for "Make me a workout" so the two are never drawn side by side',
        bi.label === 'Build it' && bi.stands === 'ask_build', JSON.stringify(bi));
  check('and not when the builder is switched off', !fu(off, 'ask_shape').includes('ask_build_now'));
  // Reached through "How's my training?" rather than through ask_shape, whose
  // own list already carries it — so this is FOLLOWUPS_AFTER doing the work.
  const today = built.ask('topic_train');
  check('train_today_recommendation offers it too, whichever button reached it',
        today.id === 'train_today_recommendation' && today.followups.some(f => f.id === 'ask_build_now'),
        today.id + ': ' + list(today.followups.map(f => f.id)));

  // A log too thin for any of the promotions falls back rather than showing an
  // empty sheet — a broader question beats no way to ask anything.
  const thin = on({ sessions: [], log: 'empty' });
  check('a sheet with no training answer falls back to the general set rather than to nothing',
        thin.topicsFor('train').length === thin.topicsFor('you').length);
}

/* ================= H. COACH'S OWN QUESTION ================= */
section('H. at most one question, and only one that changes a rule');
{
  const noDir = on({
    targets: { cal: 2300, p: 210, f: 74 },
    weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null }
  });
  check('with a rate and no stated direction, Coach has a question',
        noDir.question && noDir.question.id === 'q_goal_direction', noDir.question && noDir.question.id);
  check('and the rule it unlocks really is silent until then',
        noDir.ask('ask_rate').id !== 'weight_rate_vs_goal', noDir.ask('ask_rate').id);

  const answered = on({
    targets: { cal: 2300, p: 210, f: 74 },
    weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null },
    settings: { ...BASE.settings, answers: { q_goal_direction: 'down' } }
  });
  check('once answered, the question is gone', answered.question === null);
  check('and the rule it unlocks now answers',
        answered.ask('ask_rate').id === 'weight_rate_vs_goal', answered.ask('ask_rate').id);

  const withDir = on({});
  check('an account whose own goal states a direction is never asked', withDir.question === null);

  const waiting = on({
    targets: { cal: 2300, p: 210, f: 74 },
    weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null },
    settings: { ...BASE.settings, asked: { q_goal_direction: NOW - DAY } }
  });
  check('a question already asked and not answered is not asked again',
        waiting.question === null);

  /* And it does not go away for good either. Somebody who opened the sheet
     looking for something else and closed it has not refused the question, so
     it goes quiet and comes back — the difference between being asked and being
     nagged is entirely in this gap. */
  const cold = on({
    targets: { cal: 2300, p: 210, f: 74 },
    weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null },
    settings: { ...BASE.settings, asked: { q_goal_direction: NOW - 30 * DAY } }
  });
  check('but one asked long ago and still unanswered comes back',
        cold.question && cold.question.id === 'q_goal_direction', cold.question && cold.question.id);
  const answeredLongAgo = on({
    targets: { cal: 2300, p: 210, f: 74 },
    weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null },
    settings: { ...BASE.settings, asked: { q_goal_direction: NOW - 30 * DAY },
                answers: { q_goal_direction: 'hold' } }
  });
  check('and one that WAS answered never comes back, however long ago',
        answeredLongAgo.question === null);
  check('a junk timestamp on `asked` is not treated as a live question',
        on({
          targets: { cal: 2300, p: 210, f: 74 },
          weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null },
          settings: { ...BASE.settings, asked: { q_goal_direction: 'yesterday' } }
        }).question !== null);

  const muted = on({
    targets: { cal: 2300, p: 210, f: 74 },
    weight: { latestLb: 186.4, latestAt: NOW - DAY, rateWk: -0.8, rateDays: 21, goalDir: null, goalRateWk: null },
    settings: { ...BASE.settings, mute: { questions: true } }
  });
  check('and switching Questions off in Settings stops it asking anything at all',
        muted.question === null);

  check('there is never more than one question live',
        [noDir, answered, withDir, waiting, muted].every(c => c.question === null || typeof c.question.id === 'string'));
}

/* ================= I. AN ANSWER THAT REPEATS THE OPENING ================= */
section('I. an answer that would repeat the sheet’s opening bubble is marked, and only then');
{
  /* v46, from the phone: the sheet opens on the You card's finding, and a
     question whose answer IS that finding printed the same sentence twice,
     one above the other. The engine marks such an answer `repeats`; the sheet
     prints nothing and hangs the answer's follow-ups under the opening bubble
     (coach-surface.mjs J). Decided here, by the text itself, word for word. */
  const c = on({});
  const same = C.ROUTE_IDS.filter(id => c.ask(id).text === c.opening.text);
  check('the fixture has a question answered by the opening bubble word for word',
        same.length > 0, c.opening.id + ': ' + list(same));
  const wrong = C.ROUTE_IDS.filter(id => !!c.ask(id).repeats !== (c.ask(id).text === c.opening.text));
  check('every such answer is marked `repeats`, and no other answer is', !wrong.length, list(wrong));
  const a = c.ask(same[0]);
  check('the mark changes nothing else — the answer keeps its id, words and follow-ups',
        a.id === c.opening.id && a.reason === c.opening.reason && Array.isArray(a.followups), a.id);
  // Move the opening and the same answer stops being a repeat: the mark is
  // about the sheet in front of him, not about the answer on its own.
  const cat = (C.INTENTS.find(i => i.id === c.opening.id) || {}).category;
  const moved = on({ settings: { ...BASE.settings, mute: { [cat]: true } } });
  check('mute the opening’s category and the opening moves; the same answer is then not a repeat',
        moved.opening.text !== c.opening.text && !moved.ask(same[0]).repeats,
        moved.opening.id + ' / ' + moved.ask(same[0]).id);
}

/* ================= J. v52 — ONE CATEGORY IN, NO FINDING MOVED ================= */
section('J. v52 — readiness joins the toggle table after rest, and every other category keeps its order');
{
  /* The category index is the ranking's fourth key, and only the ORDER of
     categories reaches it. So "no finding's rank moves" is exactly: every
     category rack-v51 had is in the same order relative to the others. Read
     against v51's own table, out of git. */
  const v51 = execFileSync('git', ['show', '99b49ea:coach.js'], { cwd: ROOT, encoding: 'utf8' });
  const table = /export const CATEGORIES = Object\.freeze\(\[([\s\S]*?)\n\]\);/.exec(v51);
  const was = table ? [...table[1].matchAll(/\{ id: '([a-z]+)'/g)].map(m => m[1]) : [];
  const now = C.CATEGORIES.map(c => c.id);
  check('readiness sits directly after rest', now.indexOf('readiness') === now.indexOf('rest') + 1, now.join(','));
  check('and every rack-v51 category keeps its order relative to the others (' + was.length + ' of them)',
        was.length >= 14 && JSON.stringify(now.filter(id => id !== 'readiness')) === JSON.stringify(was), now.join(','));
  check('nothing in readiness can compete for a card — its one intent is a selector',
        C.INTENTS.filter(i => i.category === 'readiness').every(i => i.kind === 'selector'));
}

/* ---------- report ---------- */
console.log('\nthe ranking rule is total, and it is honest about what it dropped\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
