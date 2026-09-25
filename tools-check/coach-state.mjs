#!/usr/bin/env node
//
// Verifier for the moment the sheet is opened in — coach.js's stateOf() and
// the topic tables that follow from it (v49, spec §9.1).
//
//   node tools-check/coach-state.mjs
//
// The sheet adapts to the moment: before a workout it offers what to train,
// straight after one how it compared and what is next, later in the day what
// to train next, and in a live session exactly what it offered before. Four
// states, read from the input alone:
//
//   live        a session running on this device
//   post        none running, the last one ended three hours ago or less
//   done_today  a session today, ended more than three hours ago
//   pre         otherwise
//
// So this file drives stateOf() at its edges — 2:59 and 3:01 after the end,
// across local midnight, with and without endedAt, live — and then the real
// engine's topics in every state on both surfaces, against the table in
// coach.js (STATE_TOPICS) filtered by what actually answers. Nothing here
// holds a copy of a rule.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= STAGING ================= */
/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-coach-state-'));
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
  .replace("from './coach-volume.js'", 'from ' + at('coach-volume.mjs'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
// v54: coach-volume.js, the whole week, staged the same way (the staging edit
// the brief allows everywhere): coach.js imports it.
writeFileSync(join(dir, 'coach-volume.mjs'), src('coach-volume.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './analytics.js'", 'from ' + at('analytics.mjs')));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);
const { EXERCISES } = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);


/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 10).join(', ') + (xs.length > 10 ? ' … (' + xs.length + ')' : '');

/* ================= A. THE FOUR STATES, AT THEIR EDGES ================= */
section('A. stateOf() — pre, post, done_today and live, at their boundaries');
const H = 36e5, M = 6e4, DAY = 864e5;
// Today at a local hour, on a fixed date, in whatever zone this runs in.
const today = (h, m) => new Date(2026, 8, 17, h, m || 0, 0, 0).getTime();
const rec = (start, end, extra) => ({ id: 'x' + start, startedAt: start, ...(end != null ? { endedAt: end } : null),
  _date: (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date(start)),
  exercises: [], ...(extra || {}) });
const st = (sessions, now, live) => C.stateOf({ sessions, live: { active: !!live } }, now);
{
  const now = today(15);
  check('ended 2:59 ago — post', st([rec(today(11), now - (2 * H + 59 * M))], now) === 'post');
  check('ended exactly 3:00 ago — still post (three hours or less)', st([rec(today(11), now - 3 * H)], now) === 'post');
  check('ended 3:01 ago, earlier today — done_today', st([rec(today(10), now - (3 * H + M))], now) === 'done_today');
  check('no endedAt: its start and its duration say when it ended',
        st([rec(today(12), null, { durationSec: 3600 })], now) === 'post' &&
        st([rec(today(10), null, { durationSec: 3600 })], now) === 'done_today');
  check('an end before its own start is junk, and the duration is read instead',
        st([rec(today(12), today(11), { durationSec: 3600 })], now) === 'post');
  check('an end that says it is after now reads as just finished — post', st([rec(today(14), today(16))], now) === 'post');
  const yday = today(22, 30) - DAY;
  check('across local midnight: ended 23:30 last night, 1:00 now — post', st([rec(yday, yday + H)], today(1)) === 'post');
  check('and at 3:00 — three and a half hours, nothing today — pre', st([rec(yday, yday + H)], today(3)) === 'pre');
  check('a session yesterday afternoon and nothing today — pre', st([rec(today(15) - DAY, today(16) - DAY)], now) === 'pre');
  check('a session dated later than now is not the last session — pre', st([rec(today(18), today(19))], now) === 'pre');
  check('nothing logged at all — pre', st([], now) === 'pre');
  check('a live session outranks everything — live', st([rec(today(11), now - 5 * M)], now, true) === 'live' && st([], now, true) === 'live');
  check('the latest session decides, not the first: an early one long done and one just ended — post',
        st([rec(today(7), today(8)), rec(today(13), now - 30 * M)], now) === 'post');
  check('and c.state is the engine’s own reading of the input', C.coach({ now, sessions: [rec(today(11), now - H)], log: 'readable',
        live: { active: false }, settings: { v: 1, mute: {}, answers: {}, asked: {} } }).state === 'post');
}

/* ================= B. THE TOPICS, STATE BY STATE ================= */
section('B. the topics in every state, on both surfaces — the table, filtered to what answers');
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const NOW = today(15);
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const set = (w, r) => ({ w: String(w), r: String(r), type: 'N', done: true });
const xN = (n, w, r) => Array.from({ length: n }, () => set(w, r));
const ex = (id, sets) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment, sets });
const log = [];
for (let w = 0; w < 12; w++) {
  const t = NOW - (w * 7 + 2) * DAY;
  log.push({ id: 'p' + w, startedAt: t, endedAt: t + H, _date: key(t), exercises: [ex('barbell-bench-press', xN(3, 185 + (11 - w) * 2.5, 5)), ex('overhead-press', xN(3, 95, 8))] });
  const t2 = NOW - (w * 7 + 4) * DAY;
  log.push({ id: 'r' + w, startedAt: t2, endedAt: t2 + H, _date: key(t2), exercises: [ex('barbell-row', xN(3, 155, 8)), ex('barbell-curl', xN(3, 65, 10))] });
  const t3 = NOW - (w * 7 + 6) * DAY;
  log.push({ id: 'l' + w, startedAt: t3, endedAt: t3 + H, _date: key(t3), exercises: [ex('back-squat-high-bar', xN(3, 245, 5))] });
}
const summaries = {};
for (let i = 0; i <= 8; i++) summaries[key(NOW - i * DAY)] = { cal: 2400, p: 150, c: 280, f: 80 };
const base = extra => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', lib: LIB, hidden: [], libReady: true,
  routines: [], live: { active: false }, tier: { pro: true }, targets: { cal: 2300, p: 180, f: 70 }, targetsSet: true,
  summaries, steps: { days: {} }, weighIns: [],
  weight: { latestLb: 186, latestAt: NOW - DAY, rateWk: -0.5, rateDays: 30, goalDir: -1, goalRateWk: -0.5 },
  settings: { v: 1, mute: {}, answers: { q_goal_aim: 'strength' }, asked: {} },
  sessions: log.slice().sort((a, b) => a.startedAt - b.startedAt),
  ...extra
});
// A bench session this morning, and one that ended an hour ago.
const todays = (start, end) => ({ id: 'today', startedAt: start, endedAt: end, _date: key(start),
  exercises: [ex('barbell-bench-press', xN(3, 215, 5)), ex('overhead-press', xN(3, 95, 8))] });
const STATES = {
  pre: base({}),
  post: base({ sessions: log.concat([todays(NOW - 2 * H, NOW - H)]).sort((a, b) => a.startedAt - b.startedAt) }),
  done_today: base({ sessions: log.concat([todays(today(8), today(9))]).sort((a, b) => a.startedAt - b.startedAt) }),
  live: base({ live: { active: true } })
};
const GENERAL = C.TOPICS.map(t => t.id);
{
  Object.entries(STATES).forEach(([name, inp]) => {
    const c = C.coach(inp);
    check('the ' + name + ' fixture really is ' + name, c.state === name, c.state);
    ['train', 'you'].forEach(surface => {
      const got = c.topicsFor(surface).map(t => t.id);
      // What answers, asked of the engine: the general three are offered on
      // data, every narrower id when its own route has an answer.
      const answers = id => (GENERAL.includes(id) ? true : c.ask(id).id !== id);
      let want = C.STATE_TOPICS[surface][name].filter(answers);
      if (surface === 'you' && c.ask('ask_patterns').id !== 'ask_patterns') want = want.concat('ask_patterns');
      if (surface === 'train' && !want.length) want = GENERAL;
      check(name + ' / ' + surface + ': ' + list(got), got.join(',') === want.join(','), 'want ' + list(want));
    });
  });
  const pre = C.coach(STATES.pre);
  check('before a workout Train leads with "What should I train today?", "Make me a workout" second — his decided order',
        pre.topicsFor('train')[0].id === 'ask_shape' && pre.topicsFor('train')[1].id === 'ask_build', list(pre.topicsFor('train').map(t => t.id)));
  const post = C.coach(STATES.post);
  check('after one, both sheets lead with "How did today compare?"',
        post.topicsFor('train')[0].id === 'ask_compare' && post.topicsFor('you')[0].id === 'ask_compare');
  check('and Train offers "What’s next time?" second', post.topicsFor('train')[1].id === 'ask_next', list(post.topicsFor('train').map(t => t.id)));
  const done = C.coach(STATES.done_today);
  const shape = done.topicsFor('train').find(t => t.id === 'ask_shape');
  check('later the same day, "What should I train today?" is asked as "What should I train next?" — the same route',
        !!shape && shape.label === 'What should I train next?' && done.topicsFor('train')[0].id === 'ask_compare');
  check('and You leads with "How did today compare?", then the pre-workout set', done.topicsFor('you')[0].id === 'ask_compare' &&
        done.topicsFor('you').slice(1).map(t => t.id).join(',') === pre.topicsFor('you').map(t => t.id).join(','));
  const live = C.coach(STATES.live);
  check('in a live session the card is the live state, and the sheet keeps its shipped topics',
        live.card.you.state === 'card_live_session' && live.topicsFor('you').map(t => t.id).join(',') === GENERAL.join(','),
        live.card.you.state + ' / ' + list(live.topicsFor('you').map(t => t.id)));
  check('"More" holds the rest: four show, and before a workout a list can run past four',
        C.TOPICS_SHOWN === 4 && (pre.topicsFor('train').length > C.TOPICS_SHOWN || pre.topicsFor('you').length > C.TOPICS_SHOWN),
        pre.topicsFor('train').length + ' / ' + pre.topicsFor('you').length);
  check('Patterns stays last on You whenever it answers',
        (() => { const p = C.coach({ ...STATES.pre, settings: { ...STATES.pre.settings, on: { patterns: true } } }).topicsFor('you');
                 return !p.some(t => t.id === 'ask_patterns') || p[p.length - 1].id === 'ask_patterns'; })());
}

/* ================= C. THE ANSWERS BELONG TO THEIR MOMENT ================= */
section('C. "How did today compare?" and "What’s next time?" answer after a workout, not before one');
{
  const pre = C.coach(STATES.pre), post = C.coach(STATES.post), done = C.coach(STATES.done_today);
  check('before a workout neither answers', pre.ask('ask_compare').id !== 'session_compare' && pre.ask('ask_next').id !== 'next_targets');
  check('an hour after one both do, about that session',
        post.ask('ask_compare').id === 'session_compare' && /today/.test(post.ask('ask_compare').text) &&
        post.ask('ask_next').id === 'next_targets' && /today’s session/.test(post.ask('ask_next').text),
        post.ask('ask_compare').text + ' / ' + post.ask('ask_next').text);
  check('and later that day too', done.ask('ask_compare').id === 'session_compare' && done.ask('ask_next').id === 'next_targets');
  check('the answer names each lift of that session in its bubbles',
        (post.ask('ask_compare').more || []).some(m => /^Barbell Bench Press: (above|below|about) your usual/.test(m.text)) ||
        /^Barbell Bench Press: /.test(post.ask('ask_compare').text), JSON.stringify(post.ask('ask_compare')));
  check('and says what Coach cannot see, with no reason for the day given',
        (post.ask('ask_compare').more || []).some(m => m.text === 'Coach can’t see sleep, stress or soreness.') &&
        !/because|due to|tired|sleep(y|ing)? badly/i.test(post.ask('ask_compare').text));
}

/* ================= D. v52 — THE TOPIC TABLES, CHANGED ON PURPOSE ================= */
section('D. v52 — "Should I rest or go lighter?" before the record, and the live list exactly rack-v51’s');
{
  // SHIP-V52-PROMPT §6.4 and §10: the pre-workout Train list, with "Am I
  // fueled?" and then the rest question ahead of "Good day for a record?" —
  // his decided first three unmoved.
  // v54, on purpose (SHIP-V54-PROMPT §7): the whole week's two answers after
  // everything that was there — past the first four, so under "More".
  check('Train before a workout: shape, build, targets, fueled, rest-or-lighter, record, lifts, overdue, volume — and v54’s weekly volume and balance',
        C.STATE_TOPICS.train.pre.join(',') === 'ask_shape,ask_build,ask_targets,ask_fueled,ask_lighter,ask_record_day,ask_lifts,ask_overdue,ask_volume,ask_week_volume,ask_balance',
        C.STATE_TOPICS.train.pre.join(','));
  check('"Am I fueled?" and its two follow-ups are routes, and only "Am I fueled?" is a topic',
        ['ask_fueled', 'ask_fed_unlogged', 'ask_fed_none'].every(id => C.ROUTE_IDS.includes(id)) &&
        C.ALL_TOPICS.some(t => t.id === 'ask_fueled' && t.label === 'Am I fueled?') &&
        !C.ALL_TOPICS.some(t => t.id === 'ask_fed_unlogged' || t.id === 'ask_fed_none'));
  check('and the question reads "Should I rest or go lighter?" — the same route id, so native’s matcher keeps one',
        C.TRAIN_TOPICS.find(t => t.id === 'ask_lighter').label === 'Should I rest or go lighter?' &&
        C.ALL_TOPICS.find(t => t.id === 'ask_lighter').label === 'Should I rest or go lighter?');
  // The live list is written out now, and it is rack-v51's: read out of git,
  // where it was derived from v51's TRAIN_TOPICS.
  const V51 = execFileSync('git', ['show', '99b49ea:coach.js'], { cwd: ROOT, encoding: 'utf8' });
  const block = /export const TRAIN_TOPICS = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(V51);
  const v51Ids = block ? [...block[1].matchAll(/id: '([a-z_]+)'/g)].map(m => m[1]) : [];
  check('Train during a live session is exactly rack-v51’s list (' + v51Ids.join(', ') + ')',
        v51Ids.length === 8 && C.STATE_TOPICS.train.live.join(',') === v51Ids.join(','), C.STATE_TOPICS.train.live.join(','));
  check('You is unchanged in every state — no new id joins it, so no card paint asks a new route',
        JSON.stringify(C.STATE_TOPICS.you) === JSON.stringify({
          pre: ['topic_train', 'topic_fuel', 'topic_weight', 'ask_goal', 'ask_lifts'],
          post: ['ask_compare', 'topic_fuel', 'topic_weight', 'ask_goal'],
          done_today: ['ask_compare', 'topic_train', 'topic_fuel', 'topic_weight', 'ask_goal', 'ask_lifts'],
          live: ['topic_train', 'topic_fuel', 'topic_weight'] }));
  check('and "Train anyway" is a route, not a topic — it follows a rest answer, and opens the builder’s menu',
        C.ROUTE_IDS.includes('ask_build_anyway') && !C.ALL_TOPICS.some(t => t.id === 'ask_build_anyway'));
}

console.log('\nthe sheet adapts to the moment it is opened in\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
