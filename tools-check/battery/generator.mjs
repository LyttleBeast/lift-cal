#!/usr/bin/env node
//
// The lifter simulator — synthetic Rack-format workout histories, with truth.
//
//   node generator.mjs [--n 300] [--seed 1] [--out out/lifters.jsonl] [--archetype X] [--list]
//
// Each line of the JSONL is one lifter:
//
//   { id, seed, archetype, u, lib, settings, weight, weighIns, sessions, truth }
//
//   sessions   finished session records exactly as workouts/{YYYY-MM}/{DD}/{id}
//              stores them (AGENTS.md): id, name, startedAt, endedAt,
//              durationSec, volume, groups, exercises[{ exId, name, group,
//              equipment, sets[{ w, r, type, done, rir?, dp? }] }], plus the
//              `_date` / `_mk` / `_dd` keys coach-data.js's flatten() adds —
//              w and r are STRINGS, loads are stored POUNDS even on a kilo
//              account (units.js wIn), warm-ups are W, failure F, drops D (+dp)
//   lib        exId -> { name, group, equipment, pattern?, angle? } for every
//              exercise this lifter used, customs included (the merged
//              library coach-data.js hands coach.js)
//   settings   settings/coach: answers (q_goal_aim, q_experience,
//              q_focus_group), asked, marks (bad-day marks, v52)
//   weight     coach-data.js's weight block (latestLb, rateWk, rateDays, …)
//   weighIns   [{ lb, t }] oldest first
//   truth      what was really going on, for the scorer:
//     exercises[exId]   { step, grid, repLo, repHi, lowerBodyBarbell, rampStyle,
//                         tagsW, scheme, bodyweight, assisted, cardio }
//     sessions[i]       { id, startedAt, phase, badDay, marked, layoffDays
//                         (days since the previous session), exercises:[{ exId,
//                         W (true working load, display unit), workIdx (indexes
//                         into the record's sets that are true working sets),
//                         rampIdx (true warm-up sets, tagged or not), ramp
//                         [{w,r}], reps (working reps), hitTop, plannedSets,
//                         single (a heavy single/double/triple day) }] }
//     progression[exId] { ratePctWk } — the true slope of the working load
//                       over the last 8 weeks, % per week
//
// SEEDED. `seed` → the lifter's own generator; the same seed is the same
// lifter byte for byte. Nothing here reads Coach: the simulator is the world,
// Coach is what is tested against it.
//
// LOCAL TIME. Sessions start between 06:00 and 20:00 local, built with the
// local Date constructor, so the day keys and noon-anchored day counts line
// up however the machine is set. Re-running under another TZ gives the same
// *days*, not the same epoch numbers.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rngOf, hash32 } from './rng.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DAY = 864e5;
const LB_PER_KG = 2.2046226218;
const r2 = x => Math.round(x * 100) / 100;
// units.js wIn(), restated for one reason only: the generator must not import
// the app it is simulating. Pounds stored, two decimals.
const wIn = (v, u) => (u === 'kg' ? r2(v * LB_PER_KG) : v);
const wOut = (lb, u) => (u === 'kg' ? lb / LB_PER_KG : lb);

/* ================================================================
   THE EXERCISE POOL — ids from exercises.js, starting loads and steps
   ================================================================ */
// [exId, group, equipment, startLb, stepLb, lowerBodyBarbell, kgStart, kgStep]
const POOL = [
  ['barbell-bench-press',           'chest',     'barbell',   135, 5,  false, 60,  2.5],
  ['incline-barbell-bench-press',   'chest',     'barbell',   115, 5,  false, 50,  2.5],
  ['back-squat-high-bar',           'legs',      'barbell',   185, 10, true,  80,  5],
  ['back-squat-low-bar',            'legs',      'barbell',   205, 10, true,  90,  5],
  ['front-squat',                   'legs',      'barbell',   155, 10, true,  70,  5],
  ['conventional-deadlift',         'back',      'barbell',   225, 10, true,  100, 5],
  ['romanian-deadlift',             'back',      'barbell',   165, 10, true,  75,  5],
  ['barbell-row',                   'back',      'barbell',   135, 5,  false, 60,  2.5],
  ['overhead-press',                'shoulders', 'barbell',   85,  5,  false, 40,  2.5],
  ['barbell-curl',                  'arms',      'barbell',   65,  5,  false, 30,  2.5],
  ['hip-thrust',                    'legs',      'barbell',   185, 10, true,  80,  5],
  ['dumbbell-bench-press',          'chest',     'dumbbell',  50,  5,  false, 22,  2],
  ['incline-dumbbell-bench-press',  'chest',     'dumbbell',  45,  5,  false, 20,  2],
  ['dumbbell-row',                  'back',      'dumbbell',  55,  5,  false, 24,  2],
  ['seated-dumbbell-shoulder-press','shoulders', 'dumbbell',  35,  5,  false, 16,  2],
  ['dumbbell-lateral-raise',        'shoulders', 'dumbbell',  15,  5,  false, 6,   2],
  ['hammer-curl',                   'arms',      'dumbbell',  25,  5,  false, 12,  2],
  ['bulgarian-split-squat',         'legs',      'dumbbell',  30,  5,  false, 14,  2],
  ['goblet-squat',                  'legs',      'dumbbell',  50,  5,  false, 22,  2],
  ['leg-press',                     'legs',      'machine',   270, 20, false, 120, 10],
  ['leg-extension',                 'legs',      'machine',   90,  10, false, 40,  5],
  ['lying-leg-curl',                'legs',      'machine',   70,  10, false, 30,  5],
  ['hack-squat',                    'legs',      'machine',   180, 20, false, 80,  10],
  ['seated-cable-row',              'back',      'cable',     110, 10, false, 50,  5],
  ['lat-pulldown',                  'back',      'cable',     120, 10, false, 55,  5],
  ['triceps-pushdown-rope',         'arms',      'cable',     50,  10, false, 22.5, 2.5],
  ['pec-deck',                      'chest',     'machine',   100, 10, false, 45,  5],
  ['machine-chest-press',           'chest',     'machine',   120, 10, false, 55,  5],
  ['cable-lateral-raise',           'shoulders', 'cable',     15,  5,  false, 7.5, 2.5],
  ['rope-face-pull',                'back',      'cable',     40,  10, false, 17.5, 2.5],
  ['standing-calf-raise',           'legs',      'machine',   140, 10, false, 60,  5],
  ['pull-up',                       'back',      'bodyweight', 0,  0,  false, 0,   0],
  ['push-up',                       'chest',     'bodyweight', 0,  0,  false, 0,   0],
  ['chest-dip',                     'chest',     'bodyweight', 0,  0,  false, 0,   0],
  ['weighted-pull-up',              'back',      'bodyweight', 25, 5,  false, 10,  2.5],
  ['weighted-chest-dip',            'chest',     'bodyweight', 25, 5,  false, 10,  2.5],
  ['assisted-pull-up',              'back',      'machine',   60,  -10, false, 27.5, -5],
  ['treadmill-run',                 'legs',      'cardio',    0,   0,  false, 0,   0]
];
const BY_ID = Object.fromEntries(POOL.map(p => [p[0], p]));
const NAMES = {
  'barbell-bench-press': 'Barbell Bench Press', 'incline-barbell-bench-press': 'Incline Barbell Bench Press',
  'back-squat-high-bar': 'Back Squat (High Bar)', 'back-squat-low-bar': 'Back Squat (Low Bar)', 'front-squat': 'Front Squat',
  'conventional-deadlift': 'Conventional Deadlift', 'romanian-deadlift': 'Romanian Deadlift', 'barbell-row': 'Barbell Row',
  'overhead-press': 'Overhead Press', 'barbell-curl': 'Barbell Curl', 'hip-thrust': 'Hip Thrust',
  'dumbbell-bench-press': 'Dumbbell Bench Press', 'incline-dumbbell-bench-press': 'Incline Dumbbell Bench Press',
  'dumbbell-row': 'Dumbbell Row', 'seated-dumbbell-shoulder-press': 'Seated Dumbbell Shoulder Press',
  'dumbbell-lateral-raise': 'Dumbbell Lateral Raise', 'hammer-curl': 'Hammer Curl', 'bulgarian-split-squat': 'Bulgarian Split Squat',
  'goblet-squat': 'Goblet Squat', 'leg-press': 'Leg Press', 'leg-extension': 'Leg Extension', 'lying-leg-curl': 'Lying Leg Curl',
  'hack-squat': 'Hack Squat', 'seated-cable-row': 'Seated Cable Row', 'lat-pulldown': 'Lat Pulldown',
  'triceps-pushdown-rope': 'Triceps Pushdown (Rope)', 'pec-deck': 'Pec Deck', 'machine-chest-press': 'Machine Chest Press',
  'cable-lateral-raise': 'Cable Lateral Raise', 'rope-face-pull': 'Rope Face Pull', 'standing-calf-raise': 'Standing Calf Raise',
  'pull-up': 'Pull-Up', 'push-up': 'Push-Up', 'chest-dip': 'Chest Dip', 'weighted-pull-up': 'Weighted Pull-Up',
  'weighted-chest-dip': 'Weighted Chest Dip', 'assisted-pull-up': 'Assisted Pull-Up', 'treadmill-run': 'Treadmill Run'
};
// Custom exercises a lifter may invent. `pattern`/`angle` are v56's own-movement tags, sometimes set.
const CUSTOMS = [
  ['Safety Bar Squat', 'legs', 'barbell', 185, 10, true, 'squat', null],
  ['Cable Press', 'chest', 'cable', 70, 5, false, 'press', 'flat'],
  ['Landmine Press', 'shoulders', 'barbell', 70, 5, false, null, null],
  ['Belt Squat', 'legs', 'machine', 150, 10, false, 'squat', null],
  ['Spanish Squat', 'legs', 'band', 0, 0, false, null, null],
  ['Viking Press', 'shoulders', 'machine', 90, 10, false, 'press', 'overhead'],
  ['Trap Bar Row', 'back', 'barbell', 155, 10, false, 'row', null]
];

const SHAPES = {
  // the split a lifter runs: each entry is one session shape, the groups and how many lifts of each
  ppl:   [{ chest: 2, shoulders: 1, arms: 1 }, { back: 2, arms: 1 }, { legs: 3 }],
  ul:    [{ chest: 2, back: 2, shoulders: 1 }, { legs: 3, core: 0 }],
  full:  [{ legs: 1, chest: 1, back: 1 }, { legs: 1, shoulders: 1, back: 1 }],
  bro:   [{ chest: 3 }, { back: 3 }, { legs: 3 }, { shoulders: 2, arms: 2 }],
  pl:    [{ legs: 2, back: 1 }, { chest: 2, shoulders: 1 }, { back: 2, legs: 1 }, { chest: 2, arms: 1 }],
  bw:    [{ back: 1, chest: 2 }, { legs: 1, back: 1, chest: 1 }]
};

/* ================================================================
   THE ARCHETYPES — a base, plus modifiers
   ================================================================ */
const BASES = {
  novice:       { aim: 'strength', exp: 'new', reps: [5, 5], sets: [3, 3], perWeek: 3, months: [3, 6], gain: 0.03, split: 'full', pool: 'barbell', ramp: 'plates', tagW: 0.5, scheme: 'straight' },
  intermediate: { aim: ['muscle', 'strength', 'recomp'], exp: 'some', reps: [[8, 12], [6, 10]], sets: [3, 4], perWeek: 4, months: [4, 8], gain: 0.004, split: ['ppl', 'ul'], pool: 'mixed', ramp: 'pct', tagW: 0.7, scheme: 'straight' },
  powerlifter:  { aim: 'powerlifting', exp: 'years', reps: [[3, 5], [4, 6]], sets: [3, 5], perWeek: 4, months: [6, 9], gain: 0.003, split: 'pl', pool: 'barbell', ramp: 'plates-long', tagW: [0, 0.5, 1], scheme: ['top-backoff', 'straight', 'ramp-to-top'], singles: 0.2 },
  bodybuilder:  { aim: 'muscle', exp: 'years', reps: [[10, 15], [8, 12]], sets: [4, 5], perWeek: 5, months: [4, 8], gain: 0.002, split: 'bro', pool: 'machines', ramp: 'pct-short', tagW: 0.6, scheme: 'straight', failure: 0.4, drops: 0.3 },
  bodyweight:   { aim: 'maintain', exp: 'some', reps: [[6, 12]], sets: [3, 4], perWeek: 3, months: [3, 6], gain: 0.006, split: 'bw', pool: 'bodyweight', ramp: 'none', tagW: 0.3, scheme: 'straight' }
};
export const ARCHETYPES = {
  novice_linear:       { base: 'novice' },
  intermediate_double: { base: 'intermediate' },
  powerlifter_ramp:    { base: 'powerlifter' },
  bodybuilder_volume:  { base: 'bodybuilder' },
  returning_layoff:    { base: 'intermediate', mods: ['layoff'] },
  injured_lighter:     { base: 'intermediate', mods: ['injured'] },
  inconsistent:        { base: 'intermediate', mods: ['inconsistent'] },
  cut_phase:           { base: 'intermediate', mods: ['cut'], aim: 'cut' },
  bulk_phase:          { base: 'intermediate', mods: ['bulk'], aim: 'muscle' },
  plateau:             { base: 'intermediate', mods: ['plateau'] },
  bad_day:             { base: 'intermediate', mods: ['baddays'] },
  custom_exercises:    { base: 'intermediate', mods: ['customs'] },
  unit_kg:             { base: 'intermediate', u: 'kg' },
  unit_switch:         { base: 'intermediate', mods: ['unitswitch'], u: 'kg' },
  bodyweight_only:     { base: 'bodyweight' },
  drop_sets:           { base: 'bodybuilder', drops: 0.9 },
  never_tags_warmups:  { base: 'powerlifter', tagW: 0, ramp: 'plates-long' },
  tags_everything:     { base: 'powerlifter', tagW: 1, mods: ['rates'] },
  powerlifter_kg:      { base: 'powerlifter', u: 'kg', tagW: [0, 1] },
  novice_untagged:     { base: 'novice', tagW: 0 },
  bodybuilder_layoff:  { base: 'bodybuilder', mods: ['layoff'] },
  novice_baddays:      { base: 'novice', mods: ['baddays', 'rates'] }
};
export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);

/* ================================================================
   ONE LIFTER
   ================================================================ */
function choice(R, v) { return Array.isArray(v) ? R.pick(v) : v; }
const gridOf = (equipment, u, micro) => {
  if (equipment === 'barbell') return u === 'kg' ? (micro ? 1.25 : 2.5) : (micro ? 2.5 : 5);
  if (equipment === 'dumbbell') return u === 'kg' ? 2 : 5;
  if (equipment === 'bodyweight') return u === 'kg' ? 2.5 : 5;
  if (equipment === 'cardio') return 0;
  return u === 'kg' ? 2.5 : 5;      // machine, cable, band, plate stacks
};
const snap = (x, g) => (g > 0 ? Math.round(x / g) * g : x);
const PLATES_LB = [45, 95, 135, 185, 225, 275, 315, 365, 405, 455, 495, 545];
const PLATES_KG = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240];

export function makeLifter(seed, archetypeId, opts = {}) {
  const A = ARCHETYPES[archetypeId];
  if (!A) throw new Error('unknown archetype ' + archetypeId);
  const B = BASES[A.base];
  const R = rngOf(seed);
  const mods = new Set(A.mods || []);
  const u = A.u || (R.chance(0.15) ? 'kg' : 'lb');
  const aim = A.aim || choice(R, B.aim);
  const exp = A.exp || B.exp;
  const tagW = A.tagW != null ? choice(R, A.tagW) : choice(R, B.tagW);
  const ramp = A.ramp || B.ramp;
  const scheme = choice(R, B.scheme);
  const months = R.int(B.months[0], B.months[1]);
  const split = SHAPES[choice(R, B.split)];
  const micro = R.chance(0.3);
  const failureP = A.failure != null ? A.failure : (B.failure || 0.05);
  const dropsP = A.drops != null ? A.drops : (B.drops || 0);
  const singlesP = B.singles || 0;
  const rates = mods.has('rates') || R.chance(0.15);

  // ---------- the exercises this lifter runs ----------
  const lib = {};
  const EX = {};         // exId -> live state
  const truthEx = {};
  const custom = [];
  const pickPool = (group, n, used) => {
    let cands = POOL.filter(p => p[1] === group && p[2] !== 'cardio' && !used.has(p[0]));
    if (B.pool === 'barbell') cands = cands.filter(p => p[2] === 'barbell' || (R.chance(0.3) && p[2] !== 'bodyweight'));
    if (B.pool === 'machines') cands = cands.filter(p => p[2] !== 'barbell' || R.chance(0.35)).filter(p => p[2] !== 'bodyweight' || R.chance(0.3));
    if (B.pool === 'bodyweight') cands = cands.filter(p => p[2] === 'bodyweight' || p[0] === 'assisted-pull-up');
    if (!cands.length) cands = POOL.filter(p => p[1] === group && p[2] !== 'cardio' && !used.has(p[0]));
    const out = [];
    while (out.length < n && cands.length) {
      const p = cands.splice(Math.floor(R.f() * cands.length), 1)[0];
      out.push(p); used.add(p[0]);
    }
    return out;
  };
  const addEx = (p, isCustom) => {
    const [exId, group, equipment, startLb, stepLb, lowerBB, kgStart, kgStep] = p;
    const bodyweight = equipment === 'bodyweight' && startLb === 0 || equipment === 'band' && startLb === 0;
    const assisted = exId === 'assisted-pull-up';
    const cardio = equipment === 'cardio';
    const step = cardio ? 0 : u === 'kg' ? kgStep : stepLb;
    const grid = cardio ? 0 : Math.abs(step) < gridOf(equipment, u, micro) && step !== 0 ? Math.abs(step) : gridOf(equipment, u, micro);
    const repBand = Array.isArray(B.reps[0]) ? choice(R, B.reps) : B.reps;
    const isolation = ['dumbbell-lateral-raise', 'cable-lateral-raise', 'hammer-curl', 'barbell-curl', 'triceps-pushdown-rope',
                       'leg-extension', 'lying-leg-curl', 'pec-deck', 'rope-face-pull', 'standing-calf-raise'].includes(exId);
    const [lo, hi] = isolation && !bodyweight ? [Math.max(8, repBand[0] + 4), repBand[1] + 4] : repBand.slice();
    let W = u === 'kg' ? kgStart : startLb;
    W = snap(W * (0.8 + R.f() * 0.5), grid || 1);
    if (bodyweight) W = 0;
    // capacity: the load he could do for `hi` reps right now sits a little under where he is
    const repsNow = bodyweight ? R.int(lo, hi) : lo + R.int(0, Math.max(0, hi - lo));
    EX[exId] = {
      exId, group, equipment, step, grid, lo, hi, lowerBB, bodyweight, assisted, cardio, isCustom: !!isCustom,
      W, cap: bodyweight ? repsNow : (assisted ? null : W * (1 + repsNow / 30)),
      bwCap: repsNow, helpCap: assisted ? W : null,
      sets: R.int(B.sets[0], B.sets[1]), misses: 0, hits: 0,
      // ramp habits: how many bar/plate sets, whether he doubles the bar and the first plate
      rampDoubles: R.chance(0.5), rampBarTwice: R.chance(0.4), rampN: R.int(2, 4),
      lastTopHit: false, injuredUntil: null, plateauFrom: null,
      scheme: equipment === 'barbell' && !bodyweight ? scheme : 'straight'
    };
    lib[exId] = { name: p.name || NAMES[exId] || exId, group, equipment };
    if (isCustom) { if (p.pattern) lib[exId].pattern = p.pattern; if (p.angle) lib[exId].angle = p.angle; custom.push(exId); }
    truthEx[exId] = { step, grid, repLo: lo, repHi: hi, lowerBodyBarbell: lowerBB, rampStyle: ramp, tagsW: tagW,
                      scheme: EX[exId].scheme, bodyweight, assisted, cardio, custom: !!isCustom, group, equipment };
  };
  const used = new Set();
  const sessionsOf = split.map(shape => {
    const list = [];
    Object.keys(shape).forEach(g => pickPool(g, shape[g], used).forEach(p => { addEx(p); list.push(p[0]); }));
    return list;
  });
  if (mods.has('customs')) {
    const n = R.int(1, 3);
    for (let i = 0; i < n; i++) {
      const c = R.pick(CUSTOMS);
      const slug = c[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const id = 'custom-' + slug + '-' + Math.floor(R.f() * 1679616).toString(36).padStart(5, '0');
      const p = [id, c[1], c[2], c[3], c[4], c[5], Math.round(c[3] / 2.2 / 2.5) * 2.5, c[4] / 2];
      p.name = c[0]; if (R.chance(0.6)) { p.pattern = c[6]; p.angle = c[7]; }
      addEx(p, true);
      // put it in the session shape with its group, or the first one
      const k = sessionsOf.findIndex(l => l.some(x => EX[x].group === c[1]));
      sessionsOf[k >= 0 ? k : 0].push(id);
    }
  }
  if (R.chance(0.25)) { addEx(BY_ID['treadmill-run']); sessionsOf[R.int(0, sessionsOf.length - 1)].push('treadmill-run'); }
  if (B.pool === 'bodyweight' && R.chance(0.5)) { addEx(BY_ID['weighted-pull-up']); sessionsOf[0].push('weighted-pull-up'); }

  // ---------- the calendar ----------
  const END = opts.now || Date.UTC(2026, 9, 20, 12);     // the run's "now"
  const totalDays = months * 30;
  const start = new Date(END - totalDays * DAY);
  const days = [];               // the days he trains, as offsets from start
  const perWeek = B.perWeek;
  let d = R.int(0, 2);
  // Layoff, injury, plateau and the like are scheduled as windows in days.
  const layoff = mods.has('layoff') ? { at: Math.floor(totalDays * (0.4 + R.f() * 0.3)), len: R.int(21, 60) } : null;
  const injured = mods.has('injured') ? { at: Math.floor(totalDays * (0.35 + R.f() * 0.3)), len: R.int(28, 56), group: R.pick(['legs', 'back', 'chest', 'shoulders']) } : null;
  const plateau = mods.has('plateau') ? { at: Math.floor(totalDays * 0.4) } : null;
  const unitSwitchAt = mods.has('unitswitch') ? Math.floor(totalDays * (0.4 + R.f() * 0.3)) : null;
  while (d < totalDays) {
    if (layoff && d >= layoff.at && d < layoff.at + layoff.len) { d = layoff.at + layoff.len; continue; }
    days.push(d);
    let gap;
    if (mods.has('inconsistent')) gap = R.weighted([[1, 2], [2, 4], [3, 3], [4, 2], [6, 2], [9, 1], [14, 1], [19, 0.5]]);
    else gap = perWeek >= 5 ? R.weighted([[1, 5], [2, 2]]) : perWeek === 4 ? R.weighted([[1, 2], [2, 4], [3, 1]]) : R.weighted([[2, 4], [3, 3], [1, 0.5], [4, 0.5]]);
    if (R.chance(0.03)) gap += R.int(5, 12);     // a week away now and then, everybody
    d += gap;
  }
  // the last session is 0–3 days before now, so "today" reads naturally
  const shift = totalDays - days[days.length - 1] - R.int(0, 3);
  for (let i = 0; i < days.length; i++) days[i] += shift;

  // ---------- bodyweight ----------
  const bw0 = u === 'kg' ? R.int(60, 100) * LB_PER_KG : R.int(140, 230);
  const bwRate = mods.has('cut') ? -(0.4 + R.f() * 0.8) * bw0 / 100 : mods.has('bulk') ? (0.2 + R.f() * 0.4) * bw0 / 100 : (R.f() - 0.5) * 0.3;
  const weighIns = [];
  for (let dd = 0; dd <= totalDays; dd++) {
    if (!R.chance(aim === 'cut' || mods.has('bulk') ? 0.7 : 0.35)) continue;
    const t = new Date(start.getTime() + dd * DAY); t.setHours(7, R.int(0, 59), 0, 0);
    weighIns.push({ lb: r2(bw0 + bwRate * dd / 7 + R.gauss() * 1.2), t: t.getTime() });
  }
  const latest = weighIns[weighIns.length - 1];
  const energy = mods.has('cut') ? (Math.abs(bwRate) / bw0 * 100 >= 0.75 ? 'deep' : 'deficit') : mods.has('bulk') ? 'surplus' : 'hold';

  // ---------- settings ----------
  const askedAt = start.getTime() + R.int(0, 10) * DAY;
  const settings = { v: 1, mute: {}, answers: { q_goal_aim: aim, q_experience: exp }, asked: { q_goal_aim: askedAt, q_experience: askedAt }, marks: {} };
  if (R.chance(0.3)) settings.answers.q_focus_group = R.pick(['chest', 'back', 'legs', 'shoulders', 'arms']);

  // ---------- the sessions ----------
  const sessions = [];
  const truthSessions = [];
  let shapeIdx = R.int(0, sessionsOf.length - 1);
  let prevDay = null;
  const idOf = () => 'w' + Math.floor(R.f() * 2176782336).toString(36).padStart(6, '0');
  const storeW = (L, uNow) => (L <= 0 ? '0' : String(uNow === 'kg' ? wIn(L, 'kg') : r2(L)));

  for (let si = 0; si < days.length; si++) {
    const dOff = days[si];
    const uNow = unitSwitchAt != null && dOff < unitSwitchAt ? 'lb' : u;
    const when = new Date(start.getTime() + dOff * DAY); when.setHours(R.int(6, 20), R.int(0, 59), 0, 0);
    const startedAt = when.getTime();
    const gapDays = prevDay == null ? null : dOff - prevDay;
    prevDay = dOff;
    const list = sessionsOf[shapeIdx]; shapeIdx = (shapeIdx + 1) % sessionsOf.length;
    const badDay = mods.has('baddays') ? R.chance(0.2) : R.chance(0.04);
    const inInjury = injured && dOff >= injured.at && dOff < injured.at + injured.len;
    const phase = layoff && gapDays != null && gapDays >= 21 ? 'return' : inInjury ? 'injured' : plateau && dOff >= plateau.at ? 'plateau'
      : mods.has('cut') ? 'cut' : mods.has('bulk') ? 'bulk' : 'normal';
    const exercises = [];
    const tEx = [];
    const id = idOf();

    for (const exId of list) {
      const e = EX[exId];
      // Which unit the lifter THINKS in this session: a kg account logs kg
      // plates; before a unit switch he logged pounds.
      const uEx = uNow;
      // the lifter's internal numbers are in the account's unit `u`; a session logged before a unit switch is in the other one
      const toDisplay = L => (uEx === u ? L : u === 'kg' ? L * LB_PER_KG : L / LB_PER_KG);
      const gridNow = e.cardio ? 0 : gridOf(e.equipment, uEx, micro);
      const stepNow = uEx === u ? e.step : (u === 'kg' ? e.step * LB_PER_KG : e.step / LB_PER_KG);
      // Layoff: the capacity slips, and the lifter either re-enters lighter or grinds at the old weight.
      if (gapDays != null && gapDays >= 15 && !e.bodyweight && !e.cardio) {
        const f = Math.max(0.7, 1 - gapDays / 30 * 0.08);
        if (e.cap != null) e.cap *= f;
        if (R.chance(0.65)) e.W = snap(e.W * (gapDays >= 30 ? 0.8 : 0.9), e.grid);
        e.misses = 0;
      }
      if (gapDays != null && gapDays >= 15 && e.bodyweight) e.bwCap = Math.max(1, Math.round(e.bwCap * 0.85));
      // Injury: one group's lifts drop hard and are held.
      if (injured && dOff >= injured.at && e.injuredUntil == null && e.group === injured.group) {
        e.injuredUntil = injured.at + injured.len;
        if (!e.bodyweight && !e.cardio) { e.W = snap(e.W * (0.6 + R.f() * 0.1), e.grid); }
        if (e.cap != null) e.cap *= 0.78;
      }
      const injuredNow = e.injuredUntil != null && dOff < e.injuredUntil;
      // Capacity drift per session, by phase.
      const decay = B.base === 'novice' ? Math.max(0.3, 1.5 - dOff / totalDays * 1.4) : 1;
      const gain = (phase === 'plateau' ? 0 : phase === 'cut' ? -0.0005 : phase === 'bulk' ? B.gain * 1.5 : injuredNow ? 0.004 : B.gain * decay);
      if (e.cap != null) e.cap *= 1 + gain;
      if (e.bodyweight) e.bwCap = Math.min(25, e.bwCap + gain * 12);
      const dayFactor = badDay ? 0.94 : 1 + R.gauss() * 0.012;

      const sets = [];
      const t = { exId, W: null, workIdx: [], rampIdx: [], ramp: [], reps: [], hitTop: false, plannedSets: e.sets, single: false,
                  capLb: e.cap == null ? null : r2(u === 'kg' ? e.cap * LB_PER_KG : e.cap), unit: uNow };

      if (e.cardio) {
        sets.push({ w: '0', r: String(R.int(15, 40)), type: 'N', done: true });
        exercises.push({ exId, name: lib[exId].name, group: e.group, equipment: e.equipment, sets });
        t.W = 0; t.workIdx = [0];
        tEx.push(t);
        continue;
      }

      if (e.bodyweight) {
        // reps progress; the odd session adds a weighted variant via load, never here
        const k = e.sets;
        for (let j = 0; j < k; j++) {
          const r = Math.max(1, Math.round(e.bwCap * dayFactor - j * 0.9 + R.gauss() * 0.7));
          sets.push({ w: '0', r: String(r), type: j === k - 1 && R.chance(failureP) ? 'F' : 'N', done: true });
          t.workIdx.push(sets.length - 1); t.reps.push(r);
        }
        t.W = 0;
        if (Math.min(...t.reps) >= e.hi) { e.bwCap = Math.min(25, e.bwCap + 0.3); t.hitTop = true; }
        if (rates) sets.forEach((s, j) => { if (!s.done) return; s.rir = s.type === 'F' ? 0 : t.reps[j] >= e.hi ? 4 : t.reps[j] < e.lo ? 0 : 2; });
        exercises.push({ exId, name: lib[exId].name, group: e.group, equipment: e.equipment, sets });
        tEx.push(t);
        continue;
      }

      if (e.assisted) {
        // assistance comes DOWN as he gets stronger; the help is the load
        const k = e.sets;
        const r0 = e.lo + R.int(0, e.hi - e.lo);
        for (let j = 0; j < k; j++) {
          const r = Math.max(1, Math.round(r0 * dayFactor - j * 0.4 + R.gauss() * 0.5));
          sets.push({ w: storeW(toDisplay(e.W), u), r: String(r), type: 'N', done: true });
          t.workIdx.push(sets.length - 1); t.reps.push(r);
        }
        t.W = e.W;
        if (Math.min(...t.reps) >= e.hi) { e.W = Math.max(0, e.W + e.step); t.hitTop = true; }
        exercises.push({ exId, name: lib[exId].name, group: e.group, equipment: e.equipment, sets });
        tEx.push(t);
        continue;
      }

      // ---- a loaded lift ----
      // The working weight in the unit he is loading today.
      const Wd = snap(toDisplay(e.W), gridNow);
      const single = singlesP > 0 && R.chance(singlesP) && e.equipment === 'barbell';
      // The warm-up ramp, as he really does it.
      const rampSets = rampFor(R, e, Wd, uEx, ramp, single, gridNow);
      rampSets.forEach(rs => {
        const tagged = tagW >= 1 ? true : tagW <= 0 ? false : R.chance(tagW);
        sets.push({ w: storeW(rs.w, uEx), r: String(rs.r), type: tagged ? 'W' : 'N', done: true });
        t.rampIdx.push(sets.length - 1); t.ramp.push({ w: rs.w, r: rs.r, tagged });
      });
      t.W = Wd;
      // capacity in today's unit
      const capD = toDisplay(e.cap) * dayFactor;
      const repsAt = L => Math.max(0, 30 * (capD / L - 1));
      if (single) {
        // a heavy single / double / triple, then back-offs
        const sr = R.weighted([[1, 3], [2, 2], [3, 2]]);
        const topL = snap(capD / (1 + sr / 30) * (0.97 + R.f() * 0.03), gridNow);
        sets.push({ w: storeW(topL, uEx), r: String(sr), type: 'N', done: true });
        t.workIdx.push(sets.length - 1); t.reps.push(sr); t.W = topL; t.single = true;
        const bo = snap(topL * 0.85, gridNow);
        for (let j = 0; j < 3; j++) {
          const r = Math.max(1, Math.round(Math.min(repsAt(bo), 8) - j * 0.5 + R.gauss() * 0.5));
          sets.push({ w: storeW(bo, uEx), r: String(r), type: 'N', done: true });
          t.workIdx.push(sets.length - 1); t.reps.push(r);
        }
      } else if (e.scheme === 'top-backoff') {
        const r = Math.max(1, Math.round(Math.min(repsAt(Wd), e.hi + 2) + R.gauss() * 0.7));
        sets.push({ w: storeW(Wd, uEx), r: String(r), type: 'N', done: true });
        t.workIdx.push(sets.length - 1); t.reps.push(r);
        const bo = snap(Wd * 0.9, gridNow);
        for (let j = 0; j < e.sets - 1; j++) {
          const rb = Math.max(1, Math.round(Math.min(repsAt(bo), e.hi + 2) - j * 0.5 + R.gauss() * 0.6));
          sets.push({ w: storeW(bo, uEx), r: String(rb), type: 'N', done: true });
          t.workIdx.push(sets.length - 1); t.reps.push(rb);
        }
        t.hitTop = r >= e.hi;
      } else if (e.scheme === 'ramp-to-top') {
        // 3 climbing working sets, the last the top
        const k = Math.max(3, e.sets);
        for (let j = 0; j < k; j++) {
          const L = snap(Wd * (0.85 + 0.15 * j / (k - 1)), gridNow);
          const r = Math.max(1, Math.round(Math.min(repsAt(L), e.hi + 2) + R.gauss() * 0.6));
          sets.push({ w: storeW(L, uEx), r: String(r), type: 'N', done: true });
          t.workIdx.push(sets.length - 1); t.reps.push(r);
        }
        t.hitTop = t.reps[t.reps.length - 1] >= e.hi;
      } else {
        // straight sets at Wd
        const k = e.sets;
        const fatigue = 0.4 + R.f() * 0.6;
        for (let j = 0; j < k; j++) {
          const ceil = e.lo === e.hi ? e.hi + (R.chance(0.25) ? 1 : 0) : e.hi + 3;
          const r = Math.max(1, Math.round(Math.min(repsAt(Wd) - j * fatigue + R.gauss() * 0.7, ceil)));
          const last = j === k - 1;
          const type = last && R.chance(failureP) ? 'F' : 'N';
          sets.push({ w: storeW(Wd, uEx), r: String(r), type, done: true });
          t.workIdx.push(sets.length - 1); t.reps.push(r);
        }
        t.hitTop = t.reps.every(r => r >= e.hi);
        // drop sets: the last set becomes a D with drops under it
        if (R.chance(dropsP)) {
          const j = sets.length - 1;
          sets[j].type = 'D';
          let L = Wd;
          const n = R.int(1, 2);
          for (let q = 0; q < n; q++) {
            L = snap(L * 0.75, gridNow || 1);
            const r = Math.max(1, Math.round(repsAt(L) * 0.5 + R.gauss() * 0.8));
            sets.push({ w: storeW(L, uEx), r: String(r), type: 'D', done: true, dp: 1 });
            t.workIdx.push(sets.length - 1); t.reps.push(r);
          }
        }
      }
      if (rates) t.workIdx.forEach((i, j) => {
        if (sets[i].type === 'D' && sets[i].dp === 1) return;
        const r = t.reps[j];
        // a planned heavy single is rated as it was planned: about right
        sets[i].rir = sets[i].type === 'F' ? 0 : single && j === 0 ? 2 : r >= e.hi + 1 ? 4 : r < e.lo ? 0 : 2;
      });
      // the lifter's own loading decision for next time
      const minR = Math.min(...t.reps.filter((r, j) => sets[t.workIdx[j]].type !== 'D' || !sets[t.workIdx[j]].dp));
      if (phase === 'plateau') { /* frozen */ }
      else if (single) { /* no change */ }
      else if (B.base === 'novice') {
        if (minR >= e.lo) { e.W += e.step; e.misses = 0; } else if (++e.misses >= 2) { e.W = snap(e.W * 0.9, e.grid); e.misses = 0; }
      } else if (t.hitTop && (B.base !== 'powerlifter' || e.lastTopHit || R.chance(0.6))) { e.W += e.step; e.lastTopHit = false; }
      else if (t.hitTop) e.lastTopHit = true;
      else if (minR < e.lo && ++e.misses >= 2) { e.W = Math.max(e.grid, e.W - (R.chance(0.5) ? e.step : 2 * e.step)); e.misses = 0; }
      if (injuredNow) e.W = Math.min(e.W, snap(toDisplay(e.cap) / (1 + e.hi / 30), e.grid));
      exercises.push({ exId, name: lib[exId].name, group: e.group, equipment: e.equipment, sets });
      tEx.push(t);
    }

    // Now and then the same lift twice in one session (a duplicated block):
    // the merge invariant is every consumer's to hold.
    if (R.chance(0.04) && exercises.length) {
      const k = R.int(0, exercises.length - 1);
      const src = exercises[k];
      const extra = src.sets.filter(s => s.type === 'N').slice(-1).map(s => ({ ...s }));
      if (extra.length) {
        exercises.push({ ...src, sets: extra, block: 2 });
        tEx[k].workIdx.push(-1);     // marker: one more working set lives in a later block
      }
    }

    const working = exercises.flatMap(e => e.sets.filter(s => s.type !== 'W'));
    const volume = Math.round(working.reduce((a, s) => a + (parseFloat(s.w) || 0) * (parseInt(s.r, 10) || 0), 0));
    const durationSec = 1800 + R.int(0, 4800);
    const endedAt = startedAt + durationSec * 1000;
    const mk = when.getFullYear() + '-' + String(when.getMonth() + 1).padStart(2, '0');
    const dd = String(when.getDate()).padStart(2, '0');
    const rec = {
      id, name: R.pick(['Session', 'Push day', 'Pull day', 'Legs', 'Upper', 'Lower', 'Evening session', 'Morning']),
      startedAt, endedAt, durationSec, volume,
      groups: [...new Set(exercises.map(e => e.group))],
      exercises, _mk: mk, _dd: dd, _date: mk + '-' + dd
    };
    // v53 feel, sometimes
    if (rates && R.chance(0.6)) rec.feel = { e: badDay ? R.int(2, 4) : R.int(5, 9), s: badDay ? 90 : 100, at: endedAt + 60000 };
    let marked = false;
    if (badDay && (mods.has('baddays') ? R.chance(0.6) : R.chance(0.2))) {
      settings.marks[id] = { r: R.pick(['sleep', 'stress', 'sore', 'unwell']), d: rec._date };
      marked = true;
    }
    sessions.push(rec);
    truthSessions.push({ id, startedAt, date: rec._date, phase, badDay, marked, layoffDays: gapDays, unit: uNow, exercises: tEx });
  }

  // ---------- truth: the progression rate per lift over the last 8 weeks ----------
  const progression = {};
  Object.keys(EX).forEach(exId => {
    const pts = [];
    // The TRUE rate is the capacity's (the simulator's own e1rm), not the
    // bar's: a lifter adding weight while his reps fall is not progressing.
    truthSessions.forEach(s => s.exercises.forEach(t => {
      if (t.exId !== exId) return;
      const ago = (END - s.startedAt) / DAY;
      if (ago > 56) return;
      if (t.capLb != null && t.capLb > 0) pts.push({ x: -ago / 7, y: t.capLb });
      else if (EX[exId].bodyweight) pts.push({ x: -ago / 7, y: Math.max(...t.reps) });
    }));
    if (pts.length < 3) { progression[exId] = { ratePctWk: null, points: pts.length }; return; }
    // least squares slope in % of the mean per week
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length, my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const sxx = pts.reduce((a, p) => a + (p.x - mx) ** 2, 0), sxy = pts.reduce((a, p) => a + (p.x - mx) * (p.y - my), 0);
    progression[exId] = { ratePctWk: sxx > 0 && my > 0 ? r2(sxy / sxx / my * 100) : 0, points: pts.length };
  });

  const weight = latest ? {
    latestLb: latest.lb, latestAt: latest.t,
    rateWk: r2(bwRate), rateSeWk: 0.3, rateDays: Math.min(21, weighIns.length), rateSpanDays: 21,
    rateAgeDays: Math.round((END - latest.t) / DAY),
    goalDir: mods.has('cut') ? -1 : mods.has('bulk') ? 1 : 0, goalRateWk: mods.has('cut') ? -1 : mods.has('bulk') ? 0.5 : null
  } : { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null };

  return {
    id: archetypeId + '-' + seed, seed, archetype: archetypeId, u, now: END,
    lib, settings, weight, weighIns, sessions,
    truth: { base: A.base, mods: [...mods], aim, exp, energy, tagW, ramp, micro, layoff, injured, plateau, startMs: start.getTime(), totalDays, unitSwitchAt: unitSwitchAt != null ? start.getTime() + unitSwitchAt * DAY : null,
             exercises: truthEx, sessions: truthSessions, progression, custom }
  };
}

/* The warm-up ramp a lifter really does before working load W (display
   unit): plate-math for barbells (45, 135, 225, …), a short percentage ramp
   for everything else, nothing for a lifter who does none. Reps taper. */
function rampFor(R, e, W, u, style, single, gridNow) {
  if (style === 'none' || W <= 0) return [];
  const out = [];
  const bar = u === 'kg' ? 20 : 45;
  if ((style === 'plates' || style === 'plates-long') && e.equipment === 'barbell') {
    const plates = (u === 'kg' ? PLATES_KG : PLATES_LB).filter(p => p < W * (single ? 0.93 : 0.86));
    const cap = style === 'plates-long' ? (single ? 6 : 5) : 3;
    const keep = plates.length <= cap ? plates : [plates[0]].concat(plates.slice(-(cap - 1)));
    keep.forEach((p, i) => {
      const n = i === 0 ? (e.rampBarTwice ? 2 : 1) : (e.rampDoubles && i === 1 ? 2 : 1);
      const reps = i === 0 ? 5 + R.int(0, 5) : Math.max(1, 5 - i - (single ? 1 : 0));
      for (let k = 0; k < n; k++) out.push({ w: p, r: reps });
    });
    // a last single near 90% on a heavy day
    if (single && W >= (u === 'kg' ? 120 : 275)) out.push({ w: Math.round(W * 0.9 / (u === 'kg' ? 2.5 : 5)) * (u === 'kg' ? 2.5 : 5), r: 1 });
    return out;
  }
  const pcts = style === 'pct-short' ? [0.6] : style === 'pct' ? [0.5, 0.75] : [0.5, 0.7, 0.85];
  const grid = gridNow || e.grid || 5;
  pcts.forEach((p, i) => {
    const L = Math.round(W * p / grid) * grid;
    if (L > 0 && L < W - grid / 2) out.push({ w: L, r: i === 0 ? R.int(6, 10) : 3 + R.int(0, 2) });
  });
  if (e.equipment === 'barbell' && R.chance(0.5)) out.unshift({ w: bar, r: R.int(5, 10) });
  return out;
}

/* ================================================================
   THE BATTERY FILE
   ================================================================ */
export function* lifters(n, seed0 = 1, only = null) {
  const ids = only ? [only] : ARCHETYPE_IDS;
  for (let i = 0; i < n; i++) {
    const arch = ids[i % ids.length];
    const seed = (hash32(arch) ^ (seed0 * 2654435761 + i * 40503)) >>> 0 || 1;
    yield makeLifter(seed, arch);
  }
}

const MAIN = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (MAIN) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  if (args.includes('--list')) { console.log(ARCHETYPE_IDS.join('\n')); process.exit(0); }
  const n = Number(opt('--n', 300)), seed = Number(opt('--seed', 1)), only = opt('--archetype', null);
  const out = opt('--out', join(HERE, 'out', 'lifters.jsonl'));
  mkdirSync(dirname(out), { recursive: true });
  const lines = [];
  let sessionsTotal = 0;
  for (const L of lifters(n, seed, only)) { lines.push(JSON.stringify(L)); sessionsTotal += L.sessions.length; }
  writeFileSync(out, lines.join('\n') + '\n');
  console.log('wrote ' + lines.length + ' lifters, ' + sessionsTotal + ' sessions → ' + out);
}
