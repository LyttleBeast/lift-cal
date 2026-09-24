#!/usr/bin/env node
//
// Verifier for the finish line — coach.js's finishRead() (v53).
//
//   node tools-check/finish.mjs
//
// Micah, 24 Sep 2026, the evening after a whole workout done exactly as Coach
// built it: "I am expecting a lot of encouragement … the ending said -30%
// which was super discouraging." And the day before: "This coach should be at
// the level where I can trust it." Both hold here, and this file is where that
// is proven:
//
//   IT IS WARM.     The headline after a workout is one of two, "Great
//                   workout." or "Good work.", and never a number that stings:
//                   no percentage, no "down", "under", "below", "lighter",
//                   "only", "still", no exclamation mark.
//   IT IS EARNED.   "Great workout." appears only with evidence behind it — a
//                   record, every Coach target met, a milestone, above his
//                   usual, his own rating, a comeback — in that order, and
//                   never without a non-empty `evidence`.
//   IT AGREES.      The recap, the card and the sheet read the one decision:
//                   handed the recap's own records or working them out itself,
//                   finishRead() reaches the same answer.
//
// Scored as every Coach battery is — ok / miss / wrong, and WRONG MUST BE 0 —
// on the rows of SHIP-V53-PROMPT §6.6, then properties over generated
// histories. NO COPY OF ANY RULE LIVES HERE: coach.js and everything it
// imports are staged and driven for real, and the records the recap hands in
// are worked out with analytics.js's own detectPRs() and sessionMilestones(),
// exactly as workout.js's runFinish() does.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

/* ================= STAGING ================= */
const dir = mkdtempSync(join(tmpdir(), 'rack-finish-'));
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
const COACH_DEPS = ['coach-prog', 'coach-overlap', 'coach-fuel', 'coach-ready', 'coach-build', 'coach-live'];
const stageOne = name => writeFileSync(join(dir, name + '.mjs'), src(name + '.js')
  .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (n === 'analytics' || COACH_DEPS.includes(n) || n === 'coach'
    ? at(n + '.mjs') : real(n + '.js'))));
COACH_DEPS.concat(['coach']).forEach(stageOne);
const C = await import(JSON.parse(at('coach.mjs')));
const A = await import(JSON.parse(at('analytics.mjs')));
const U = await import(JSON.parse(real('units.js')));
const { EXERCISES } = await import(JSON.parse(real('exercises.js')));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 6).join(' | ') + (xs.length > 6 ? ' … (' + xs.length + ')' : '');
const battery = [];
function row(id, fn) {
  let r;
  try { r = fn(); } catch (e) { r = { v: 'wrong', said: 'threw: ' + (e && e.stack || e) }; }
  battery.push({ id, ...r });
}
// ok when `ok`; a miss when Coach said less than the row wants (a "Good work."
// where the row earns "Great workout."); otherwise wrong.
const grade = (ok, silent, said) => ({ v: ok ? 'ok' : silent ? 'miss' : 'wrong', said: String(said) });

/* ================= FIXTURES =================
   Real library names, a fixed epoch, sessions at a fixed local hour, the real
   record shape — string w and r, set types, done, id, volume, durationSec. */
const DAY = 864e5;
const NOW = 1789307130123;
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const localAt = (ago, hour) => { const d = new Date(NOW - ago * DAY); d.setHours(hour, 0, 0, 0); return d.getTime(); };
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const BENCH = 'barbell-bench-press', INCLINE = 'incline-dumbbell-bench-press', SQUAT = 'back-squat-high-bar',
      LEGP = 'leg-press', CURL = 'barbell-curl', PUSH = 'triceps-pushdown-rope', ROW = 'barbell-row';
const set = (w, r, type) => ({ w: String(w), r: String(r), type: type || 'N', done: true });
const xN = (n, w, r, type) => Array.from({ length: n }, () => set(w, r, type));
const volOf = exs => Math.round(exs.reduce((a, e) => a + e.sets.filter(s => s.type !== 'W').reduce((b, s) => b + parseFloat(s.w) * parseInt(s.r, 10), 0), 0));
let sid = 0;
const record = (startedAt, rows, extra) => {
  const exercises = rows.map(([id, sets]) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment, sets }));
  return { id: 'f' + (++sid), name: 'Workout', startedAt, endedAt: startedAt + 3600e3, durationSec: 3600,
           volume: volOf(exercises), groups: [...new Set(exercises.map(e => e.group))], exercises, ...(extra || {}) };
};
const sess = (ago, rows, hour) => { const t = localAt(ago, hour == null ? 7 : hour); return { ...record(t, rows), _date: key(t) }; };
// The session just finished: started two hours ago, ended an hour ago — the
// post moment in every zone, whatever the local hour.
const justNow = (rows, extra) => record(NOW - 2 * 3600e3, rows, extra);
const sortS = ss => ss.slice().sort((a, b) => a.startedAt - b.startedAt);
const input = extra => ({
  now: NOW, opens: 0, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions: [], lib: LIB, hidden: [],
  libReady: true, routines: [], live: { active: false }, tier: { pro: true }, targets: null, targetsSet: null,
  summaries: {}, steps: { days: {} }, weighIns: [],
  weight: { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null },
  settings: { v: 1, mute: {}, answers: {}, asked: {} },
  ...extra
});
// The records exactly as runFinish() works them out: against every session
// that started before this one, with the account's unit.
const extrasFor = (inp, rec) => {
  const prior = inp.sessions.filter(s => s.id !== rec.id && s.startedAt < rec.startedAt);
  const found = A.detectPRs(rec, prior);
  return { prs: found.prs, firsts: found.firsts, milestones: A.sessionMilestones(rec, prior, inp.u === 'kg' ? 'kg' : 'lb') };
};
// The recap's read: the sessions as coach-data.js holds them straight after
// Finish (the record not in them yet), the record, and the recap's records.
const recap = (inp, rec) => C.finishRead({ ...inp, sessions: inp.sessions.filter(s => s.id !== rec.id) }, rec, extrasFor(inp, rec));
// The card's and the sheet's: the record in the sessions, no records in hand.
const later = (inp, rec) => C.finishRead({ ...inp, sessions: sortS(inp.sessions.filter(s => s.id !== rec.id).concat([rec])) }, rec);
const said = f => f.headline + ' ' + f.line + ' (' + f.why + ') [' + f.evidence.join(',') + ']';
const answers = [];
const keep = (id, f) => { answers.push({ id, f }); return f; };

/* ---------- the logs ---------- */
// N1: incline dumbbell bench at 65 × 8 for weeks, 70 × 7 once, and today 70 × 8.
const inclineLog = () => [40, 33, 26, 19, 12].map(a => sess(a, [[INCLINE, xN(3, 65, 8)], [CURL, xN(3, 65, 10)]]))
  .concat([sess(5, [[INCLINE, [set(70, 7), set(65, 8), set(65, 8)]], [CURL, xN(3, 65, 10)]])]);
// N2: bench climbing to 3 × 12 at 185 (target next: 3 × 8 at 190 — a new
// heaviest, which would lead with the record), so the two lifts here are holds
// met at their own last weights, which are no record: the squat back after a
// gap its group did not have (coach-hype.mjs C's), and the row held after a
// miss. Neither lift beats its best, so the line is the targets'.
const holdsLog = () => {
  const squat = [[60, xN(3, 225, 8)], [45, xN(3, 225, 10)], [21, xN(3, 225, 10)]].map(([a, s]) => sess(a, [[SQUAT, s]]));
  const legs = [4, 9, 16].map(a => sess(a, [[LEGP, xN(3, 360, 10)]]));
  const rows = [[30, xN(3, 155, 8)], [23, xN(3, 155, 8)], [16, xN(3, 155, 8)], [9, [set(155, 8), set(155, 8), set(155, 6)]]]
    .map(([a, s]) => sess(a, [[ROW, s]]));
  return squat.concat(legs, rows);
};
// N3: chest and arms, the same session every week for eight weeks: no record,
// no milestone, his usual — 18 working sets.
const CHEST_ARMS = () => [[BENCH, xN(4, 185, 5)], [INCLINE, xN(4, 60, 10)], [CURL, xN(5, 65, 10)], [PUSH, xN(5, 50, 12)]];
const sameLog = () => Array.from({ length: 8 }, (_, k) => sess(3 + 7 * k, CHEST_ARMS()));

/* ================= THE ROWS ================= */
section('N. the rows — SHIP-V53-PROMPT §6.6, scored ok / miss / wrong');

row('N1', () => {
  const rec = justNow([[INCLINE, xN(3, 70, 8)], [CURL, xN(3, 65, 10)]]);
  const inp = input({ sessions: sortS(inclineLog().concat([rec])) });
  const f = keep('N1', recap(inp, rec));
  const ok = f.headline === 'Great workout.' && f.line === 'New best on Incline Dumbbell Bench Press: 70 x 8.' &&
             f.why === 'Your best at 70 lb was 7 reps.' && f.evidence[0] === 'pr' && f.earned === true;
  return grade(ok, f.headline === 'Good work.', said(f));
});

row('N2', () => {
  const met = justNow([[SQUAT, xN(3, 225, 10)], [ROW, xN(3, 155, 8)]]);
  const inp = input({ sessions: sortS(holdsLog().concat([met])) });
  const f = keep('N2', recap(inp, met));
  // 1 of 1: the row alone, met — not this evidence, whatever else is.
  const one = justNow([[ROW, xN(3, 155, 8)]]);
  const inp1 = input({ sessions: sortS(holdsLog().filter(s => !s.exercises.some(e => e.exId === SQUAT)).concat([one])) });
  const f1 = keep('N2 1 of 1', recap(inp1, one));
  const replay = C.coach({ ...inp, now: NOW }).ask('ask_compare');
  const two = (replay.more || []).some(m => m.text === '2 of 2 Coach targets met.');
  const ok = two && f.headline === 'Great workout.' && f.line === 'Every Coach target met: 2 of 2.' && f.evidence[0] === 'targets' &&
             !f1.evidence.includes('targets');
  return grade(ok, !two, said(f) + ' · 1 of 1: ' + said(f1) + ' · compare: ' + (replay.more || []).map(m => m.text).join(' / '));
});

const n3 = () => { const rec = justNow(CHEST_ARMS()); return { rec, inp: input({ sessions: sortS(sameLog().concat([rec])) }) }; };
row('N3', () => {
  const { rec, inp } = n3();
  const f = keep('N3', recap(inp, rec));
  const ok = f.headline === 'Good work.' && f.line === 'Chest and arms done: 18 sets.' && !f.earned && !f.evidence.length;
  return grade(ok, false, said(f));
});

row('N4', () => {
  const { rec, inp } = n3();
  const f = keep('N4', recap(inp, { ...rec, feel: { e: 8, at: NOW - 60e3 } }));
  const ok = f.headline === 'Great workout.' && f.line === 'You rated it 8 out of 10.' && JSON.stringify(f.evidence) === '["rating"]';
  return grade(ok, f.headline === 'Good work.', said(f));
});

row('N5', () => {
  const { rec, inp } = n3();
  const f = keep('N5', recap(inp, { ...rec, feel: { s: 90, at: NOW - 60e3 } }));
  const e3 = keep('N5 energy 3', recap(inp, { ...rec, feel: { e: 3, at: NOW - 60e3 } }));
  const ok = f.headline === 'Good work.' && f.line === 'Showing up on a harder day counts.' && !f.evidence.length &&
             e3.line === 'Showing up on a harder day counts.' && C.feelHarder({ s: 90 }) && C.feelHarder({ e: 3 }) &&
             !C.feelHarder({ s: 100, e: 4 }) && !C.feelHarder(null);
  return grade(ok, false, said(f) + ' · energy 3: ' + said(e3));
});

row('N6', () => {
  const rec = justNow([[INCLINE, xN(3, 70, 8)], [CURL, xN(3, 65, 10)]]);
  const inp = input({ sessions: sortS(inclineLog().concat([rec])),
                      settings: { v: 1, mute: {}, answers: {}, asked: {}, marks: { [rec.id]: { r: 'sleep', d: key(rec.startedAt) } } } });
  const f = keep('N6', recap(inp, rec));
  const ok = f.headline === 'Great workout.' && f.evidence[0] === 'pr';
  return grade(ok, f.headline === 'Good work.', said(f));
});

row('N7', () => {
  // A steady log that stops twenty days ago, and today a lighter session: no
  // record, no milestone, not above his usual — only the comeback.
  const steady = [48, 41, 34, 27, 20].map(a => sess(a, CHEST_ARMS()));
  // On the 14:00 clock, so the session is today's in every zone and the gap
  // is twenty dates exactly.
  const T = localAt(0, 14);
  const rec = record(T - 2 * 3600e3, [[BENCH, xN(3, 165, 5)], [CURL, xN(3, 55, 10)]]);
  const inp = input({ now: T, sessions: sortS(steady.concat([rec])) });
  const f = keep('N7', recap(inp, rec));
  const ok = f.headline === 'Great workout.' && f.line === 'First session in 20 days.' && JSON.stringify(f.evidence) === '["back"]';
  return grade(ok, f.headline === 'Good work.', said(f));
});

row('N8', () => {
  const met = justNow([[SQUAT, xN(3, 225, 10)], [ROW, xN(3, 155, 8)]]);
  const inp = input({ sessions: sortS(holdsLog().concat([met])), tier: { pro: false } });
  const f = keep('N8', recap(inp, met));
  const ok = !f.evidence.includes('targets') && !f.evidence.includes('compare') && f.line !== 'Every Coach target met: 2 of 2.' &&
             (f.headline === 'Good work.' || f.evidence.length > 0);
  return grade(ok, false, said(f));
});

row('N9', () => {
  // On kilos: typed as 30 kg, 32.5 × 7 once, and today 32.5 × 8 — stored in
  // pounds through units.js, as the set row stores them.
  const kg = v => String(U.wIn(v, 'kg'));
  const log = [40, 33, 26, 19, 12].map(a => sess(a, [[INCLINE, xN(3, kg(30), 8)]]))
    .concat([sess(5, [[INCLINE, [set(kg(32.5), 7), set(kg(30), 8), set(kg(30), 8)]]])]);
  const rec = justNow([[INCLINE, xN(3, kg(32.5), 8)]]);
  const inp = input({ u: 'kg', sessions: sortS(log.concat([rec])) });
  const f = keep('N9', recap(inp, rec));
  const ok = f.headline === 'Great workout.' && f.line === 'New best on Incline Dumbbell Bench Press: 32.5 x 8.' &&
             f.why === 'Your best at 32.5 kg was 7 reps.' && !/\blb\b/.test(f.line + f.why);
  return grade(ok, f.headline === 'Good work.', said(f));
});

row('N10', () => {
  const rec = justNow([[INCLINE, xN(3, 70, 8)], [CURL, xN(3, 65, 10)]]);
  const inp = input({ sessions: sortS(inclineLog()), log: 'unknown' });
  const withRecords = keep('N10', C.finishRead(inp, rec, extrasFor({ ...inp, sessions: sortS(inclineLog().concat([rec])) }, rec)));
  const bare = keep('N10 bare', C.finishRead(inp, rec));
  const junk = [C.finishRead(null, rec), C.finishRead(inp, null), C.finishRead(inp, { id: 'x', exercises: 'junk' }),
                C.finishRead({ ...inp, sessions: 'junk' }, rec, 'junk'), C.finishRead(inp, rec, { prs: 'junk', milestones: [null] })];
  const two = ['Great workout.', 'Good work.'];
  const ok = withRecords.headline === 'Great workout.' && withRecords.evidence[0] === 'pr' &&
             bare.headline === 'Good work.' && bare.line === 'Chest and arms done: 6 sets.' &&
             junk.every(f => two.includes(f.headline) && typeof f.line === 'string');
  return grade(ok, false, said(withRecords) + ' · bare: ' + said(bare) + ' · junk: ' + junk.map(f => f.headline + ' ' + f.line).join(' / '));
});

/* N12 — the card and the sheet after a workout. */
row('N12', () => {
  const rec = justNow([[INCLINE, xN(3, 70, 8)], [CURL, xN(3, 65, 10)]]);
  const inp = input({ sessions: sortS(inclineLog().concat([rec])) });
  const bad = [];
  for (let opens = 0; opens < 8; opens++) {
    const c = C.coach({ ...inp, opens });
    if (c.state !== 'post') bad.push('state ' + c.state);
    if (c.card.you.id !== 'hype_finish') bad.push('open ' + opens + ': ' + c.card.you.id);
  }
  const c = C.coach(inp);
  const f = later(inp, rec);
  if (!c.card.you.text.startsWith('Great workout.')) bad.push('card ' + c.card.you.text);
  if (c.opening.id !== 'finish' || c.opening.text !== f.headline + ' ' + f.line) bad.push('opening ' + c.opening.text);
  if (!c.openingNext || c.openingNext.text !== c.you.text) bad.push('openingNext');
  // Shown an hour ago, it is still the line: finish keys are exempt while the moment lasts.
  const again = C.coach({ ...inp, opens: 3, recentHype: [{ id: 'hype_finish', key: 'finish:' + rec.id, at: NOW - 3600e3 }] });
  if (again.card.you.id !== 'hype_finish') bad.push('exempt: ' + again.card.you.id);
  // Three days running: the recovery line takes the card, and the sheet
  // still opens on the finish line.
  // On a clock where the session is today's in every zone — 14:00 local —
  // since a streak counts dates and a session is dated by its start.
  const T = localAt(0, 14);
  const runRec = record(T - 2 * 3600e3, [[INCLINE, xN(3, 70, 8)], [CURL, xN(3, 65, 10)]]);
  const run = sortS(inclineLog().concat([1, 2].map(k => ({ ...record(T - k * DAY - 2 * 3600e3, [[CURL, xN(3, 65, 10)]]),
                                                             _date: key(T - k * DAY - 2 * 3600e3) })), [runRec]));
  const cr = C.coach(input({ now: T, sessions: run }));
  if (cr.card.you.id !== 'hype_recovery') bad.push('streak card ' + cr.card.you.id);
  if (cr.opening.id !== 'finish') bad.push('streak opening ' + cr.opening.id);
  // Recovery shown in the last day: the finish line is next.
  const rk = cr.card.you.key;
  const cr2 = C.coach(input({ now: T, sessions: run, recentHype: [{ id: 'hype_recovery', key: rk, at: T - 3600e3 }] }));
  if (cr2.card.you.id !== 'hype_finish') bad.push('after recovery ' + cr2.card.you.id);
  // Five hours on (done_today) it is still first; a day on (pre) it is gone.
  const five = C.coach({ ...inp, now: NOW + 5 * 3600e3 });
  if (!['done_today', 'pre'].includes(five.state) || (five.state === 'done_today' && five.card.you.id !== 'hype_finish')) bad.push('done_today ' + five.card.you.id);
  const tomorrow = C.coach({ ...inp, now: NOW + DAY + 12 * 3600e3 });
  if (tomorrow.state !== 'pre' || tomorrow.card.you.id === 'hype_finish' || tomorrow.opening.id === 'finish') bad.push('next day ' + tomorrow.card.you.id);
  return grade(!bad.length, false, bad.join(' | ') || c.card.you.text + ' / ' + c.card.you.reason + ' · ' + cr.card.you.text);
});

/* N11 — every answer above, the words it may never use. Read after the rows. */
const NEVER = [/%/, /\bdown\b/i, /\bunder\b/i, /\bbelow\b/i, /\blighter\b/i, /\bonly\b/i, /\bstill\b/i, /!/];
row('N11', () => {
  const bad = answers.filter(a => NEVER.some(re => re.test(a.f.headline + ' ' + a.f.line)))
    .map(a => a.id + ': ' + a.f.headline + ' ' + a.f.line);
  return grade(answers.length >= 12 && !bad.length, false, bad.join(' | ') || answers.length + ' answers read, every one clean');
});

/* ================= THE AGREEMENT ================= */
section('A. one decision, three surfaces — the recap, the card and the sheet agree');
{
  const cases = [];
  const r1 = justNow([[INCLINE, xN(3, 70, 8)], [CURL, xN(3, 65, 10)]]);
  cases.push(['a record', input({ sessions: sortS(inclineLog().concat([r1])) }), r1]);
  const r2 = justNow([[SQUAT, xN(3, 225, 10)], [ROW, xN(3, 155, 8)]]);
  cases.push(['targets met', input({ sessions: sortS(holdsLog().concat([r2])) }), r2]);
  const { rec: r3, inp: i3 } = n3();
  cases.push(['good work', i3, r3]);
  cases.push(['kilos', { ...i3, u: 'kg' }, r3]);
  cases.push(['basic', { ...cases[1][1], tier: { pro: false } }, r2]);
  const off = cases.filter(([, inp, rec]) => JSON.stringify(recap(inp, rec)) !== JSON.stringify(later(inp, rec)));
  check('handed the recap’s own records, or working them out itself, finishRead() says the same thing (' + cases.length + ' logs)',
        !off.length, off.map(([n]) => n).join(', '));
  const sheet = cases.filter(([, inp, rec]) => { const c = C.coach(inp), f = later(inp, rec);
    return c.opening.text !== f.headline + ' ' + f.line || c.opening.reason !== f.why || !c.card.you.text.startsWith(f.headline); });
  check('and the sheet’s first bubble is its headline and line, and the card leads with its headline', !sheet.length,
        sheet.map(([n, inp]) => n + ': ' + C.coach(inp).opening.text + ' / ' + C.coach(inp).card.you.text).join(' | '));
  // The card's form: the evidence beside the headline when both fit, and a
  // long name leaves the headline alone — the evidence in the reason line.
  const c1 = C.coach(cases[0][1]);
  check('the headline and its evidence side by side when the two fit the card — nine words, one number',
        c1.card.you.text === 'Great workout. New best on Incline Dumbbell Bench Press.' && c1.card.you.reason === 'Your best at 70 lb was 7 reps.',
        c1.card.you.text + ' / ' + c1.card.you.reason);
  const LONG = 'Paused Close Grip Competition Barbell Bench Press On The Floor';
  const longLib = { ...LIB, [INCLINE]: { ...LIB[INCLINE], name: LONG } };
  const named = x => ({ ...x, exercises: x.exercises.map(e => (e.exId === INCLINE ? { ...e, name: LONG } : e)) });
  const cl = C.coach({ ...cases[0][1], lib: longLib, sessions: cases[0][1].sessions.map(named) });
  check('a long lift name leaves "Great workout." alone on the card, and the evidence goes in the reason line, whole',
        cl.card.you.text === 'Great workout.' && cl.card.you.reason === 'New best on ' + LONG + ': 70 x 8.',
        cl.card.you.text + ' / ' + cl.card.you.reason);
  const c3 = C.coach(i3);
  check('and a line that fits sits beside it: "Good work. Chest and arms done: 18 sets."',
        c3.card.you.text === 'Good work. Chest and arms done: 18 sets.', c3.card.you.text);
  // An answer that repeats the finding is marked against the finding, never
  // against the finish bubble.
  const withFinding = C.coach(cases[2][1]);
  const same = C.ROUTE_IDS.filter(id => withFinding.ask(id).text === withFinding.openingNext.text);
  const wrong = C.ROUTE_IDS.filter(id => !!withFinding.ask(id).repeats !== (withFinding.ask(id).text === withFinding.openingNext.text));
  check('`repeats` is keyed to the finding (openingNext) after a workout — ' + same.length + ' answer(s) repeat it, and only those are marked',
        !wrong.length && !C.ROUTE_IDS.some(id => withFinding.ask(id).text === withFinding.opening.text), list(wrong));
  // The recap's safe answer, from coach-data.js, when anything throws.
  const DATA = src('coach-data.js');
  check('coach-data.js exports coachFinishRead(), which calls finishRead() on coachInput() and falls back to "Good work."',
        /export function coachFinishRead\(record, extras\)/.test(DATA) && /finishRead\(coachInput\(\{\}\), record, extras/.test(DATA) &&
        /headline: 'Good work\.'/.test(DATA));
}

/* ================= THE PAINT ================= */
section('S. the paint spy — a card paint works the finish line out in post and done_today, and never otherwise');
{
  /* SHIP-V53-PROMPT §1: "nothing new on a card paint beyond finishRead() in
     the two states that need it". analytics.js is staged behind a proxy that
     counts detectPRs() and sessionMilestones() — which only the finish line
     calls on a paint — and coach.js a second time, importing the proxy. */
  const names = Object.keys(A).filter(k => typeof A[k] === 'function');
  writeFileSync(join(dir, 'analytics-spy.mjs'),
    'import * as A from ' + at('analytics.mjs') + ';\nexport const calls = {};\n' +
    names.map(n => 'export function ' + n + '(...a) { calls.' + n + ' = (calls.' + n + ' || 0) + 1; return A.' + n + '(...a); }').join('\n') + '\n' +
    Object.keys(A).filter(k => typeof A[k] !== 'function').map(k => 'export const ' + k + ' = A.' + k + ';').join('\n') + '\n');
  writeFileSync(join(dir, 'coach-spied.mjs'), readFileSync(join(dir, 'coach.mjs'), 'utf8')
    .replace('from ' + at('analytics.mjs'), 'from ' + at('analytics-spy.mjs')));
  const SPY = await import(JSON.parse(at('analytics-spy.mjs')));
  const CS = await import(JSON.parse(at('coach-spied.mjs')));
  const paint = inp => { Object.keys(SPY.calls).forEach(k => { delete SPY.calls[k]; });
    const c = CS.coach(inp);
    void [c.card.you.text, c.card.train.text, c.greet && c.greet.text, c.lead && c.lead.id, c.teaser && c.teaser.text];
    return { state: c.state, prs: SPY.calls.detectPRs || 0, ms: SPY.calls.sessionMilestones || 0 }; };
  const rec = justNow([[INCLINE, xN(3, 70, 8)], [CURL, xN(3, 65, 10)]]);
  const withRec = input({ sessions: sortS(inclineLog().concat([rec])) });
  const moments = [
    ['post', withRec],
    // Four hours on: done_today where the date has not turned, pre where it has.
    ['four hours on', { ...withRec, now: NOW + 4 * 3600e3 }],
    ['pre', input({ sessions: sortS(inclineLog()) })],
    ['pre, a day on', { ...withRec, now: NOW + DAY + 12 * 3600e3 }],
    ['live', { ...withRec, live: { active: true } }]
  ];
  const seen = moments.map(([n, inp]) => [n, ...['lb', 'kg'].flatMap(u => [true, false].map(pro => paint({ ...inp, u, tier: { pro } })))]);
  const wrong = [];
  seen.forEach(([n, ...ps]) => ps.forEach(p => {
    const after = p.state === 'post' || p.state === 'done_today';
    if (after && (p.prs !== 1 || p.ms !== 1)) wrong.push(n + ' (' + p.state + '): ' + p.prs + ' / ' + p.ms);
    if (!after && (p.prs || p.ms)) wrong.push(n + ' (' + p.state + '): ' + p.prs + ' / ' + p.ms);
  }));
  check('after a workout a paint works the records out once — and in pre, the next day or mid-session, never (' + seen.length * 4 + ' paints)',
        !wrong.length && seen.some(([, ...ps]) => ps.some(p => p.state === 'post')) && seen.some(([, ...ps]) => ps.some(p => p.state === 'pre')), list(wrong));
}

/* ================= THE PROPERTIES ================= */
section('P. properties — generated histories, both units, both tiers');
{
  let seed = 53;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = xs => xs[Math.floor(rnd() * xs.length)];
  const LIFTS = [BENCH, INCLINE, SQUAT, LEGP, CURL, PUSH, ROW, 'lat-pulldown', 'overhead-press', 'treadmill'].filter(id => LIB[id]);
  const N_GEN = 400;
  const seen = { great: 0, good: 0, harder: 0 }, byEvidence = {};
  const bad = { great: [], two: [], det: [], never: [], agree: [] };
  for (let g = 0; g < N_GEN; g++) {
    const n = 2 + Math.floor(rnd() * 30);
    const lifts = Array.from({ length: 2 + Math.floor(rnd() * 3) }, () => pick(LIFTS));
    const ss = [];
    let ago = 3 + Math.floor(rnd() * 25);
    for (let k = 0; k < n; k++) {
      ss.push(sess(ago + Math.floor(rnd() * 3), lifts.map(id => [id, Array.from({ length: 1 + Math.floor(rnd() * 4) },
        () => set(LIB[id].equipment === 'cardio' ? 0 : 40 + 5 * Math.floor(rnd() * 30), 1 + Math.floor(rnd() * 12), rnd() < 0.1 ? 'W' : rnd() < 0.1 ? 'F' : 'N'))]),
        6 + Math.floor(rnd() * 12)));
      ago += 1 + Math.floor(rnd() * 5);
    }
    const rec = justNow(lifts.map(id => [id, Array.from({ length: 1 + Math.floor(rnd() * 5) },
      () => set(LIB[id].equipment === 'cardio' ? 0 : 40 + 5 * Math.floor(rnd() * 34), 1 + Math.floor(rnd() * 12)))]),
      rnd() < 0.5 ? { feel: { e: 1 + Math.floor(rnd() * 10), s: pick([80, 90, 100, 110, 120, undefined]), at: NOW } } : null);
    const marks = rnd() < 0.2 ? { [rec.id]: { r: pick(['sleep', 'stress', 'sore', 'unwell']), d: key(rec.startedAt) } } : {};
    const inp = input({ sessions: sortS(ss.concat([rec])), u: rnd() < 0.5 ? 'kg' : 'lb', tier: { pro: rnd() < 0.6 },
                        settings: { v: 1, mute: rnd() < 0.2 ? { targets: true } : {}, answers: {}, asked: {}, marks } });
    const f = recap(inp, rec);
    if (f.headline === 'Great workout.') seen.great++; else seen.good++;
    if (f.line === 'Showing up on a harder day counts.') seen.harder++;
    f.evidence.forEach(e => { byEvidence[e] = (byEvidence[e] || 0) + 1; });
    if ((f.headline === 'Great workout.') !== (f.evidence.length > 0) || f.earned !== (f.headline === 'Great workout.')) bad.great.push(g + ': ' + said(f));
    if (!['Great workout.', 'Good work.'].includes(f.headline)) bad.two.push(g + ': ' + f.headline);
    if (JSON.stringify(f) !== JSON.stringify(recap(inp, rec))) bad.det.push(String(g));
    if (NEVER.some(re => re.test(f.headline + ' ' + f.line))) bad.never.push(g + ': ' + f.headline + ' ' + f.line);
    if (JSON.stringify(f) !== JSON.stringify(later(inp, rec))) bad.agree.push(g + ': ' + said(f) + ' / ' + said(later(inp, rec)));
  }
  check('both headlines occur — ' + seen.great + ' "Great workout.", ' + seen.good + ' "Good work." (' + seen.harder + ' on a harder day), and every kind of evidence: ' +
        Object.entries(byEvidence).map(([k, v]) => k + ' ' + v).join(', '),
        seen.great > 20 && seen.good > 20 && seen.harder > 5 && ['pr', 'milestone', 'rating', 'compare'].every(k => byEvidence[k] > 0), JSON.stringify(byEvidence));
  check('"Great workout." never appears without a non-empty evidence, and "Good work." never with one', !bad.great.length, list(bad.great));
  check('every headline is one of the two', !bad.two.length, list(bad.two));
  check('deterministic: the same history, the same answer', !bad.det.length, list(bad.det));
  check('and never a percentage, "down", "under", "below", "lighter", "only", "still" or "!" in the headline or line', !bad.never.length, list(bad.never));
  check('the recap’s records and the engine’s own agree on every one of them', !bad.agree.length, list(bad.agree));
}

/* ================= THE BATTERY ================= */
section('the battery — ok / miss / wrong');
{
  battery.forEach(b => results.push('  ' + (b.v === 'ok' ? '✓' : b.v === 'miss' ? '·' : '✗') + ' ' + b.id + ' [' + b.v + '] ' + b.said.slice(0, 500)));
  const n = v => battery.filter(b => b.v === v).length;
  results.push('\n  ok: ' + n('ok') + '   miss: ' + n('miss') + '   wrong: ' + n('wrong'));
  check('wrong: 0 — no row celebrates without evidence, stings, or says what the row does not', n('wrong') === 0,
        battery.filter(b => b.v === 'wrong').map(b => b.id).join(', '));
}

console.log('\nafter a workout, the first thing is warm — and "Great workout." is earned\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
