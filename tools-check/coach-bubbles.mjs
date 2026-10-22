#!/usr/bin/env node
//
// Verifier for the starter bubbles that read the day (rack-v76,
// COACH-V2-SPEC.md §8, SHIP-V74-PROMPT.md §4).
//
//   node tools-check/coach-bubbles.mjs
//
// coach.js topicsFor() scores the state's list from the day — the hour, the
// days since his last session, a record in the last three days, his aim, a
// caution on the opener, what he has not logged, the last five bubbles he
// tapped — adds at most one question bubble, and picks the first three by
// category, a fourth only at 60% of the top's score. Driven here through the
// real engine (coach().topicsFor), on a log built in this file, at clock
// times built in local time so the hours mean the same in every zone:
//
//   A  the properties, swept: deterministic; never a muted category; a
//      bubble only when it answers; the first never a question before a
//      session; at most one question; the first three of three categories
//   B  the five worked examples (03-conversation-design.md §6.5, mapped to
//      the routes this app has)
//   C  the device memory: coach-data.js keeps the taps five deep, newest
//      first, and hands them to the engine as recentTaps

import { stage, harness, J, readSrc } from './lib/stage.mjs';

const { check, section, done } = harness('coach.js topicsFor — the starter bubbles read the day (v76)');
const st = stage(['analytics.js', 'exercises.js', 'ui.js', 'units.js', 'coach-tags.js', 'coach-goal.js', 'coach-ramp.js', 'coach-ask.js',
  'coach-prog.js', 'coach-build.js', 'coach-live.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach.js', 'blocks.js']);
const C = await st.load('coach.js');
const { EXERCISES } = await st.load('exercises.js');

const DAY = 864e5, H = 36e5, M = 6e4;
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
// Local wall-clock times on fixed dates: Tue 15 Sep 2026, Sat 19 Sep 2026.
const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi || 0, 0, 0).getTime();
const TUE = (h, mi) => at(2026, 9, 15, h, mi), SAT = (h, mi) => at(2026, 9, 19, h, mi);
const S = (w, r) => ({ w: String(w), r: String(r), type: 'N', done: true });
const xN = (n, w, r) => Array.from({ length: n }, () => S(w, r));
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const ex = (id, sets) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment, sets });
let sid = 0;
const sess = (start, rows, mins) => ({ id: 's' + (++sid), name: 'Session', startedAt: start, endedAt: start + (mins || 60) * M,
  durationSec: (mins || 60) * 60, _date: key(start), exercises: rows, volume: 0, groups: [] });
// A push / pull / legs rotation, every `gap` days at 6 pm, ending `lastAgo`
// days before `now` (by local date), twelve weeks deep. The bench climbs
// 2.5 lb a push day, so the last push is his best.
const DAYS = [
  k => [ex('barbell-bench-press', xN(3, 150 + 2.5 * k, 8)), ex('overhead-press', xN(3, 95, 8)), ex('triceps-pushdown-rope', xN(3, 50, 12))],
  k => [ex('barbell-row', xN(3, 155, 8)), ex('lat-pulldown', xN(3, 120, 10)), ex('barbell-curl', xN(3, 65, 10))],
  k => [ex('back-squat-high-bar', xN(3, 245, 5)), ex('romanian-deadlift', xN(3, 205, 8)), ex('leg-press', xN(3, 360, 10))]
];
function logOf(now, lastAgo, gap) {
  const out = [];
  const d0 = new Date(now); d0.setHours(18, 0, 0, 0);
  for (let i = 0, ago = lastAgo; ago < 84; i++, ago += gap) {
    const start = d0.getTime() - ago * DAY;
    if (start > now) continue;
    const n = Math.floor((84 - ago) / gap);
    out.push(sess(start, DAYS[n % 3](Math.floor(n / 3))));
  }
  return out.sort((a, b) => a.startedAt - b.startedAt);
}
const SETTINGS = extra => ({ v: 2, mute: {}, on: {}, answers: { q_goal_aim: 'strength', q_experience: 'some' }, asked: {}, ...(extra || {}) });
// The weight read that makes the opener's question (q_goal_direction) eligible:
// a rate to read and no direction to read it against.
const ASKING = { latestLb: 186, latestAt: null, rateWk: -0.5, rateDays: 30, goalDir: null, goalRateWk: null };
const inputOf = (now, sessions, extra) => ({
  now, opens: 0, recentGreets: [], recentHype: [], recentTaps: [], u: 'lb', log: 'readable', sessions,
  lib: LIB, hidden: [], libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
  summaries: {}, steps: { days: {} }, weighIns: [], weight: { ...ASKING, latestAt: now - DAY },
  settings: SETTINGS(), ...(extra || {})
});
const ids = l => l.map(t => t.id);
const first = l => l.filter(t => !t.more);
const isQ = t => String(t.id).startsWith(C.QUESTION_BUBBLE);

/* ================= A. THE PROPERTIES ================= */
section('A. swept over hours, gaps, states, open counts, taps and switches: the rules hold every time');
{
  const bad = { det: [], muted: [], answer: [], qFirst: [], qTwo: [], cats: [], count: [] };
  let n = 0;
  const MUTES = [{}, { progression: true }, { volume: true }, { rest: true, recency: true }];
  for (let h = 0; h < 24; h += 1) for (const lastAgo of [0, 1, 2, 5, 15]) for (const opens of [0, 1, 2]) {
    const now = TUE(h, 20);
    const sessions = logOf(now, lastAgo, 2);
    const mute = MUTES[(h + lastAgo + opens) % MUTES.length];
    const taps = opens === 2 ? ['ask_shape', 'ask_build', 'topic_fuel'] : [];
    const inp = inputOf(now, sessions, { opens, recentTaps: taps, settings: SETTINGS({ mute }) });
    const c = C.coach(inp);
    for (const surface of ['train', 'you']) {
      n++;
      const where = surface + ' ' + h + 'h ' + lastAgo + 'd o' + opens + ' ' + c.state;
      const l = c.topicsFor(surface);
      if (J(l) !== J(C.coach(inp).topicsFor(surface))) bad.det.push(where);
      l.forEach(t => {
        if (C.isMuted(inp.settings, t.category)) bad.muted.push(where + ': ' + t.id);
        if (isQ(t) || t.id === 'ask_patterns') return;
        const a = c.ask(t.id);
        if (!a || a.id === t.id && !C.TOPICS.some(x => x.id === t.id)) bad.answer.push(where + ': ' + t.id);
      });
      if (l.length && isQ(l[0]) && c.state !== 'post') bad.qFirst.push(where);
      if (l.filter(isQ).length > 1) bad.qTwo.push(where);
      const f = first(l);
      const cats = f.slice(0, 3).map(t => t.category);
      if (new Set(cats).size !== cats.length) bad.cats.push(where + ': ' + ids(f).join(','));
      const distinct = new Set(l.map(t => t.category)).size;
      if (l.length && (f.length > 4 || (distinct >= 3 && f.length < 3 && !(surface === 'you' && f.some(t => t.id === 'ask_patterns'))))) bad.count.push(where + ': ' + f.length);
    }
  }
  check('deterministic: the same input twice is the same list (' + n + ' sheets)', !bad.det.length, bad.det.slice(0, 5).join('; '));
  check('never a bubble of a muted category', !bad.muted.length, bad.muted.slice(0, 5).join('; '));
  check('a bubble only when it answers (the shipped filter)', !bad.answer.length, bad.answer.slice(0, 5).join('; '));
  check('before a session the first bubble is never a question — something he can ask', !bad.qFirst.length, bad.qFirst.slice(0, 5).join('; '));
  check('at most one question bubble', !bad.qTwo.length, bad.qTwo.slice(0, 5).join('; '));
  check('the first three are three categories', !bad.cats.length, bad.cats.slice(0, 5).join('; '));
  check('three show first, four at the most (fewer only when the categories run out)', !bad.count.length, bad.count.slice(0, 5).join('; '));
  // Questions switched off: no question bubble anywhere.
  const off = C.coach(inputOf(TUE(7, 40), logOf(TUE(7, 40), 2, 2), { settings: SETTINGS({ mute: { questions: true } }) }));
  check('questions switched off: no question bubble on either sheet', !off.topicsFor('train').some(isQ) && !off.topicsFor('you').some(isQ));
}

/* ================= B. THE FIVE WORKED EXAMPLES ================= */
section('B. the five worked examples');
{
  // (1) Tuesday 07:40, no session today, the last two days ago, aim strength, a question eligible.
  const now1 = TUE(7, 40);
  const in1 = inputOf(now1, logOf(now1, 2, 2));
  const c1 = C.coach(in1);
  const t1 = c1.topicsFor('train');
  const q1 = t1.findIndex(isQ);
  check('(1) Tuesday 07:40, two days since: "What should I train today?" first, and the question offered but not first',
        c1.state === 'pre' && t1[0].id === 'ask_shape' && q1 > 0 && t1[q1].label === 'Which way are you going?' && t1[q1].question.id === 'q_goal_direction',
        J(t1.map(t => t.id + (t.more ? '…' : ''))));
  check('    and the question bubble carries the opener question itself, to draw when he taps it',
        q1 > 0 && t1[q1].question.text === 'Which way are you trying to go right now?' && t1[q1].question.options.length === 3);

  // (2) 18:10, a session that ended twenty minutes ago, with a record in it.
  const now2 = TUE(18, 10);
  const log2 = logOf(now2, 2, 2);
  const best = log2.filter(s => s.exercises[0].exId === 'barbell-bench-press').pop();
  const top = parseFloat(best.exercises[0].sets[0].w) + 10;
  log2.push(sess(now2 - 70 * M, [ex('barbell-bench-press', xN(3, top, 8)), ex('overhead-press', xN(3, 95, 8)), ex('triceps-pushdown-rope', xN(3, 50, 12))], 50));
  const c2 = C.coach(inputOf(now2, log2));
  const t2 = c2.topicsFor('train');
  check('(2) 18:10, twenty minutes after a session with a record: "How did today compare?" first, and "Any records lately?" in the three',
        c2.state === 'post' && t2[0].id === 'ask_compare' && first(t2).slice(0, 3).some(t => t.id === 'ask_records'),
        J(t2.map(t => t.id + (t.more ? '…' : ''))));

  // (3) Saturday noon, the third day running, the rest read says rest: no records bubble, no question.
  const now3 = SAT(12, 0);
  const full = k => [ex('barbell-bench-press', xN(4, 185, 8)), ex('barbell-row', xN(4, 155, 8)), ex('back-squat-high-bar', xN(4, 245, 5)),
                     ex('overhead-press', xN(4, 95, 8)), ex('barbell-curl', xN(3, 65, 10))];
  const log3 = [];
  const d3 = new Date(now3); d3.setHours(18, 0, 0, 0);
  for (let ago = 84; ago >= 4; ago -= 3) log3.push(sess(d3.getTime() - ago * DAY, full()));
  [2, 1].forEach(ago => log3.push(sess(d3.getTime() - ago * DAY, full())));
  log3.sort((a, b) => a.startedAt - b.startedAt);
  const c3 = C.coach(inputOf(now3, log3));
  const caution = ['rest_day'].includes(c3.ask('ask_shape').id) || ['rest_day', 'lighter_week'].includes(c3.ask('ask_lighter').id);
  const t3 = c3.topicsFor('train');
  check('(3) Saturday noon, the third day running and the rest read fires: no records bubble among the first, and no question at all',
        caution && !first(t3).some(t => ['ask_record_day', 'ask_records'].includes(t.id)) && !t3.some(isQ) && !!c3.question,
        J([caution, c3.ask('ask_shape').id, t3.map(t => t.id + (t.more ? '…' : '')), c3.question && c3.question.id]));

  // (4) The first open in fifteen days.
  const now4 = TUE(9, 15);
  const c4 = C.coach(inputOf(now4, logOf(now4, 15, 2)));
  const t4 = c4.topicsFor('train');
  check('(4) first open in fifteen days: "What should I train today?" first — and under its answer, where he trained',
        t4[0].id === 'ask_shape' && !!c4.ask('ask_shape').question && c4.ask('ask_shape').question.id === 'q_back_what',
        J([t4.map(t => t.id), c4.ask('ask_shape').question && c4.ask('ask_shape').question.id]));

  // (5) A tapped bubble gives way to one it ties with on the next open.
  const f1 = first(t1).map(t => t.id);
  const tapped = f1.find(id => id === 'ask_build');
  const c5 = C.coach({ ...in1, recentTaps: [tapped] });
  const f5 = first(c5.topicsFor('train')).map(t => t.id);
  check('(5) "Make me a workout", tapped, is out of the first three on the next open — the bubble it tied with takes its place',
        !!tapped && !f5.slice(0, 3).includes(tapped) && f5[0] === 'ask_shape', J([f1, f5]));
  check('    and taps past the last five are forgotten: the sixth back counts for nothing',
        J(first(C.coach({ ...in1, recentTaps: ['a_one', 'a_two', 'a_three', 'a_four', 'a_five', tapped] }).topicsFor('train')).map(t => t.id)) === J(f1));
}

/* ================= C. THE DEVICE MEMORY ================= */
section('C. coach-data.js: rememberTap writes to the device, five deep, newest first, and coachInput hands them on');
{
  const src = readSrc('coach-data.js');
  check('rememberTap is synchronous and device-local: LS.set, no await, no write()',
        /export function rememberTap[\s\S]{0,400}LS\.set\(LS_TAPS, recentTaps\);/.test(src) && !/export function rememberTap[\s\S]{0,400}(await|write\()/.test(src));
  check('the key is coachTaps, beside coachGreets; five deep; route ids only',
        /const LS_TAPS\s*=\s*'coachTaps'/.test(src) && /\.slice\(0, 5\)/.test(src.slice(src.indexOf('export function rememberTap'))) &&
        /\[a-z_\]\{1,40\}/.test(src.slice(src.indexOf('export function rememberTap'))));
  check('coachInput hands recentTaps to the engine', /recentTaps: recentTaps\.slice\(\)/.test(src));
}

done(st.cleanup);
