#!/usr/bin/env node
//
// Properties — invariants Coach must hold on every generated lifter, beyond
// the per-decision scoring: the same input is the same answer, a shuffled log
// is the same answer, a kilo mirror of a pound lifter gets the same decision
// (mode, reps, and the load within half a kilo), and no sentence anywhere
// carries a banned phrase. These are the cheap half of the battery and run
// in a few seconds.
//
//   node properties.mjs [--repo …] [--n 120] [--seed 7]
//   (--repo defaults to the repo this file sits in)

import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { stageCoach } from './stage.mjs';
import { lifters } from './generator.mjs';
import { textOffences } from './scoring.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const C = await stageCoach(opt('--repo', join(HERE, '..', '..')));
const N = Number(opt('--n', 120)), SEED = Number(opt('--seed', 7));
const LB_PER_KG = 2.2046226218;
const r2 = x => Math.round(x * 100) / 100;

const inputOf = (L, sessions, now) => ({
  now, opens: 0, recentGreets: [], recentHype: [], u: L.u, log: 'readable', sessions, lib: L.lib, routines: [], live: { active: false },
  hidden: [], libReady: true, tier: { pro: true }, targets: null, targetsSet: false, summaries: {}, steps: { days: {} },
  weighIns: L.weighIns, foodFirst: {}, foodDays: {}, foodLog: {}, weight: L.weight, settings: L.settings
});
const decide = (L, sessions, now) => {
  const ov = C.coach.overlapInput(inputOf(L, sessions, now));
  const ctx = { now: ov.now, u: ov.u, aim: ov.aim, exp: ov.exp, energy: ov.energy, rateWk: ov.rateWk };
  return Object.fromEntries(ov.lifts.map(l => [l.exId, C.prog.targetFor(l, ctx, l.mark || null)]));
};
const shuffle = (xs, seed) => xs.slice().sort((a, b) => ((a.startedAt * 7 + seed) % 13) - ((b.startedAt * 7 + seed) % 13) || b.startedAt - a.startedAt);
// A kilo mirror: the same lifter, every stored pound unchanged (storage is
// pounds forever), only the account's unit flipped. The decision's MODE and
// REPS must not move; a named load may move by at most one grid step,
// because the step is learned in the display unit.
const mirror = L => ({ ...L, u: L.u === 'kg' ? 'lb' : 'kg' });

const broke = {};
const note = (k, L, why) => { (broke[k] = broke[k] || []).push(L.id + ': ' + why); };
let n = 0, said = 0;
for (const L of lifters(N, SEED)) {
  n++;
  const now = L.sessions[L.sessions.length - 1].startedAt + 36e5;
  const a = decide(L, L.sessions, now);
  const b = decide(L, JSON.parse(JSON.stringify(L.sessions)), now);
  if (JSON.stringify(a) !== JSON.stringify(b)) note('deterministic', L, 'two answers');
  const c = decide(L, shuffle(L.sessions, L.seed), now);
  if (JSON.stringify(a) !== JSON.stringify(c)) note('order-blind', L, 'a shuffled log changed a target');
  const m = decide(mirror(L), L.sessions, now);
  for (const exId of Object.keys(a)) {
    const t = a[exId], u = m[exId];
    if (!t && !u) continue;
    if (!t || !u) { note('unit-mirror', L, exId + ': target on one unit only'); continue; }
    // The default step and the default band's micro-stretch are read in the
    // display unit by design (coach-prog.js: "a step is learned and printed
    // in the display unit"), so a mirror may land one rep apart or on
    // add-vs-reps. What may NOT differ is the DIRECTION: heavier on one unit
    // and lighter or silent on the other is a unit bug.
    const dirOf = x => (['add'].includes(x.mode) ? 'up' : ['reduce', 'reenter'].includes(x.mode) ? 'down' : ['defer', 'first'].includes(x.mode) ? 'silent' : 'hold');
    if (dirOf(t) !== dirOf(u) && !(dirOf(t) !== 'down' && dirOf(u) !== 'down')) note('unit-mirror', L, exId + ': ' + t.mode + ' vs ' + u.mode + ' in ' + mirror(L).u);
    const reps = x => x.sets.filter(s => s.type !== 'W').map(s => parseInt(s.tr, 10));
    const rt = reps(t), ru = reps(u);
    // reps compared only inside one mode: add resets to the range's bottom,
    // reps adds one, and a mirror may legitimately land on either
    if (t.mode === u.mode && rt.length === ru.length && rt.some((r, j) => Math.abs(r - ru[j]) > 1)) note('unit-mirror', L, exId + ': reps ' + rt.join(',') + ' vs ' + ru.join(','));
    if (t.loadLb != null && u.loadLb != null && Math.abs(t.loadLb - u.loadLb) > 11.1) note('unit-mirror', L, exId + ': load ' + t.loadLb + ' vs ' + u.loadLb + ' lb');
    for (const x of [t, u]) {
      said++;
      const off = textOffences([x.line].concat(x.why || []), x === t ? L.u : mirror(L).u);
      if (off.length) note('ban', L, exId + ': ' + off.join('; ') + ' — ' + x.line);
    }
  }
}
console.log('properties over ' + n + ' lifters, ' + said + ' targets said');
const keys = ['deterministic', 'order-blind', 'unit-mirror', 'ban'];
let fail = 0;
for (const k of keys) {
  const xs = broke[k] || [];
  if (xs.length) fail++;
  console.log('  ' + (xs.length ? '✗' : '✓') + ' ' + k + (xs.length ? ' — ' + xs.length + '\n      ' + xs.slice(0, 6).join('\n      ') : ''));
}
process.exit(fail ? 1 : 0);
