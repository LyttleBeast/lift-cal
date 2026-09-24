#!/usr/bin/env node
//
// What a card paint costs, on a year-long, 200-session log — rack-v52 against
// the working tree (SHIP-V52-PROMPT §1: "the budget is +1 ms"; v53 keeps it).
//
//   node report/coach-paint/bench.mjs            v52 and the working tree
//   node report/coach-paint/bench.mjs <rev>...   any commits, by name
//
// v53: timed in three moments, because the finish line (finishRead()) is
// worked out on a paint in two of them only — `post`, an hour after a
// session, and `done_today`, hours after one — and not at all otherwise.
//
// A card paint is what coach-ui.js's coachCard() asks of the engine: one
// coach() call, then the two cards, the greeting, the lead question and (for
// Basic) the teaser — all of which coach() works out before it returns. The
// log is a real lifter's year: four recurring days (upper, lower, push, pull)
// on a rhythm that drifts, lifts climbing and stalling, food logged most
// days, weigh-ins most mornings, an aim set. Each paint is timed after a
// warm-up, many times, and the median printed: a paint is short enough that
// one timing is noise.
//
// Not a verifier (tools-check/ holds those, and a timing is no pass or fail):
// a measurement, kept so the next run can repeat it.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);
const FILES = ['analytics.js', 'coach-goal.js', 'coach-prog.js', 'coach-overlap.js', 'coach-build.js', 'coach-live.js',
               'coach-ready.js', 'coach-fuel.js', 'coach.js'];

async function stage(rev) {
  const dir = mkdtempSync(join(tmpdir(), 'rack-paint-'));
  const at = f => JSON.stringify(pathToFileURL(join(dir, f)).href);
  const read = f => {
    try {
      return rev ? execFileSync('git', ['show', rev + ':' + f], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
                 : readFileSync(join(ROOT, f), 'utf8');
    } catch { return null; }
  };
  writeFileSync(join(dir, 'store-stub.mjs'), 'export async function read(_p, f) { return f; }\nexport function todayKey() { return ""; }\n');
  const have = new Set(FILES.filter(f => read(f) != null));
  have.forEach(f => writeFileSync(join(dir, f.replace(/\.js$/, '.mjs')), read(f)
    .replace("from './store.js'", "from './store-stub.mjs'")
    .replace(/from '\.\/([\w-]+)\.js'/g, (w, n) => 'from ' + (have.has(n + '.js') ? at(n + '.mjs') : real(n + '.js')))));
  return { C: await import(JSON.parse(at('coach.mjs'))),
           R: have.has('coach-ready.js') ? await import(JSON.parse(at('coach-ready.mjs'))) : null };
}

/* ---------- the year ---------- */
const { EXERCISES } = await import(JSON.parse(real('exercises.js')));
const LIB = {};
EXERCISES.forEach(x => { LIB[x.id] = { name: x.name, group: x.group, equipment: x.equipment }; });
const DAY = 864e5, NOW = 1789307130123;
const key = ms => { const d = new Date(ms), p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const DAYS = [
  [['barbell-bench-press', 185, 8], ['barbell-row', 155, 8], ['overhead-press', 95, 8], ['barbell-curl', 65, 10]],
  [['back-squat-high-bar', 245, 5], ['romanian-deadlift', 185, 8], ['leg-press', 300, 10], ['leg-extension', 100, 12]],
  [['incline-dumbbell-bench-press', 60, 10], ['dumbbell-shoulder-press', 50, 10], ['triceps-pushdown-rope', 50, 12], ['cable-crunch', 60, 15]],
  [['conventional-deadlift', 315, 5], ['lat-pulldown', 140, 10], ['seated-cable-row', 130, 10], ['hammer-curl', 35, 10]]
];
const sessions = [];
let ago = 364, k = 0;
while (sessions.length < 200 && ago >= 0) {
  const day = DAYS[k % DAYS.length];
  const t = (() => { const d = new Date(NOW - ago * DAY); d.setHours(7 + Math.floor(rnd() * 12), Math.floor(rnd() * 60), 0, 0); return d.getTime(); })();
  const grow = 1 + (364 - ago) / 364 * 0.15;
  sessions.push({ id: 'y' + sessions.length, startedAt: t, endedAt: t + 3600e3, durationSec: 3600, _date: key(t),
    exercises: day.map(([id, w, r]) => ({ exId: id, name: LIB[id].name, group: LIB[id].group, equipment: LIB[id].equipment,
      sets: [1, 2, 3].map(() => ({ w: String(Math.round(w * grow / 5) * 5), r: String(r - (rnd() < 0.2 ? 1 : 0)), type: rnd() < 0.05 ? 'F' : 'N', done: true })) })) });
  k++;
  ago -= 1 + (rnd() < 0.82 ? 1 : 0);
}
const summaries = {};
for (let a = 0; a < 365; a++) if (rnd() < 0.8) summaries[key(NOW - a * DAY)] = { cal: 2200 + Math.round(rnd() * 600), p: 170, c: 250, f: 70 };
const weighIns = [];
for (let a = 365; a >= 0; a--) if (rnd() < 0.7) weighIns.push({ lb: 190 - a * 0.01 + rnd(), t: NOW - a * DAY - 5 * 3600e3 });
const INPUT = {
  now: NOW, opens: 3, recentGreets: [], recentHype: [], u: 'lb', log: 'readable', sessions, lib: LIB, hidden: [], libReady: true,
  routines: [], live: { active: false }, tier: { pro: true }, targets: { cal: 2400, p: 180, f: 70, auto: { rateWk: -0.5 } }, targetsSet: true,
  summaries, steps: { days: {} }, weighIns, foodFirst: {},
  weight: { latestLb: 186, latestAt: NOW - 5 * 3600e3, rateWk: -0.4, rateSeWk: 0.1, rateDays: 42, goalDir: -1, goalRateWk: -0.5 },
  settings: { v: 1, mute: {}, answers: { q_goal_aim: 'strength', q_experience: 'some' }, asked: {} }
};

/* ---------- the paint ---------- */
function paint(C, input) {
  const c = C.coach(input);
  return [c.card.you.text, c.card.train.text, c.greet && c.greet.text, c.lead && c.lead.id, c.teaser && c.teaser.text].join('|');
}
function time(C, input) {
  for (let i = 0; i < 30; i++) paint(C, input);
  const ts = [];
  for (let i = 0; i < 200; i++) { const t = process.hrtime.bigint(); paint(C, input); ts.push(Number(process.hrtime.bigint() - t) / 1e6); }
  ts.sort((a, b) => a - b);
  return { median: ts[ts.length >> 1], p90: ts[Math.floor(ts.length * 0.9)] };
}

const revs = process.argv.slice(2);
const targets = revs.length ? revs.map(r => [r, r]) : [['rack-v52 (6f76c3b)', '6f76c3b'], ['working tree', null]];
// The three moments: the year as it is (no session today), an hour after a
// session, and five hours after one — the same session on top of the year.
const before = sessions.filter(s => s.startedAt < NOW - 12 * 3600e3);
const today = (start, end) => ({ ...sessions[sessions.length - 4], id: 'today', startedAt: NOW - start * 3600e3,
  endedAt: NOW - end * 3600e3, durationSec: (start - end) * 3600, _date: key(NOW - start * 3600e3) });
const MOMENTS = [['pre', { ...INPUT, sessions: before }],
                 ['post', { ...INPUT, sessions: before.concat([today(2, 1)]) }],
                 ['done_today', { ...INPUT, sessions: before.concat([today(6, 5)]) }]];
console.log('\na card paint, ' + sessions.length + ' sessions over ' + Math.round((NOW - sessions[0].startedAt) / DAY) + ' days\n');
for (const [label, rev] of targets) {
  const { C, R } = await stage(rev);
  for (const [m, inp] of MOMENTS) {
    const pro = time(C, inp), basic = time(C, { ...inp, tier: { pro: false } });
    console.log('  ' + label.padEnd(22) + '  ' + m.padEnd(10) + '  Pro ' + pro.median.toFixed(2) + ' ms (p90 ' + pro.p90.toFixed(2) + ')   Basic ' +
                basic.median.toFixed(2) + ' ms (p90 ' + basic.p90.toFixed(2) + ')' +
                (C.coach(inp).card && C.coach(inp).card.you ? '   card: ' + C.coach(inp).card.you.id : ''));
  }
  /* v52's adherence replay — answer-time only, never on a paint; its own
     budget is 150 ms (SHIP-V52-PROMPT §4.5). A fresh input each time, so the
     memo it rides on cannot answer for it. */
  if (R && C.readyInput) {
    const ts = [];
    for (let k = 0; k < 20; k++) { const ri = C.readyInput(INPUT); const t = process.hrtime.bigint(); R.replay(ri, NOW);
                                   ts.push(Number(process.hrtime.bigint() - t) / 1e6); }
    ts.sort((a, b) => a - b);
    console.log('  ' + ''.padEnd(22) + '  the replay (an answer, not a paint): ' + ts[ts.length >> 1].toFixed(1) + ' ms median, ' +
                ts[ts.length - 1].toFixed(1) + ' ms slowest of ' + ts.length);
  }
}
console.log('');
