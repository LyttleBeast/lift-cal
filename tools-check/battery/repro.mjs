#!/usr/bin/env node
//
// Reproduce one decision the harness flagged, in full.
//
//   node repro.mjs --archetype X --seed N --session K [--ex exId] [--repo …] [--dump]
//   (--repo defaults to the repo this file sits in)
//
// Prints the lifter's log of that lift up to the cut-off (every set, typed),
// the truth row for the session at the cut-off, and Coach's target, next-set
// and live answers set by set. --dump writes the whole lifter to
// out/repro-<archetype>-<seed>.json for a regression case.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stageCoach } from './stage.mjs';
import { makeLifter } from './generator.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const arch = opt('--archetype'), seed = Number(opt('--seed')), k = Number(opt('--session')), exId = opt('--ex', null);
const C = await stageCoach(opt('--repo', join(HERE, '..', '..')));
const L = makeLifter(seed, arch);
const next = L.sessions[k], nextT = L.truth.sessions[k];
const before = L.sessions.slice(0, k);
const now = next.startedAt - 30 * 60e3;
const input = { now, opens: 0, recentGreets: [], recentHype: [], u: L.u, log: 'readable', sessions: before, lib: L.lib, routines: [],
  live: { active: false }, hidden: [], libReady: true, tier: { pro: true }, targets: null, targetsSet: false, summaries: {}, steps: { days: {} },
  weighIns: L.weighIns.filter(w => w.t <= now), foodFirst: {}, foodDays: {}, foodLog: {}, weight: L.weight, settings: L.settings };
const ov = C.coach.overlapInput(input);
const ctx = { now: ov.now, u: ov.u, aim: ov.aim, exp: ov.exp, energy: ov.energy, rateWk: ov.rateWk };
const fmt = s => s.type + (s.dp ? '+' : '') + s.w + '×' + s.r + (s.rir != null ? '(rir' + s.rir + ')' : '');
console.log(L.id, L.u, 'aim', L.truth.aim, 'exp', L.truth.exp, 'tagW', L.truth.tagW, 'ramp', L.truth.ramp, 'mods', L.truth.mods.join(','));
console.log('cut-off session', k, next._date, 'phase', nextT.phase, nextT.badDay ? 'BAD DAY' : '', nextT.marked ? 'MARKED' : '', 'gap', nextT.layoffDays, 'd');
const ids = exId ? [exId] : next.exercises.map(e => e.exId);
for (const id of ids) {
  console.log('\n== ' + id + ' ' + JSON.stringify(L.truth.exercises[id]));
  before.forEach((s, i) => s.exercises.filter(e => e.exId === id).forEach(e => {
    const t = L.truth.sessions[i];
    console.log('  s' + i + ' ' + s._date + (t.marked ? ' M' : '') + (t.badDay ? ' bad' : '') + ' gap' + t.layoffDays + '  ' + e.sets.map(fmt).join(' '));
  }));
  const tr = nextT.exercises.find(t => t.exId === id);
  console.log('  NEXT s' + k + ' ' + next._date + '  ' + next.exercises.filter(e => e.exId === id).map(e => e.sets.map(fmt).join(' ')).join(' | '));
  console.log('  truth', JSON.stringify(tr));
  const lift = ov.lifts.find(l => l.exId === id);
  const t = lift ? C.prog.targetFor(lift, ctx, lift.mark || null) : null;
  console.log('  TARGET', t ? t.mode + (t.code ? '(' + t.code + ')' : '') + ' loadLb ' + t.loadLb + ' | ' + t.line + ' | ' + (t.why || []).join(' / ') : null);
  if (t) console.log('  sets', JSON.stringify(t.sets));
  const ex = next.exercises.find(e => e.exId === id);
  const today = [];
  (ex ? ex.sets : []).forEach((s, si) => {
    today.push({ w: s.w, r: s.r, type: s.type, ...(s.rir != null ? { rir: s.rir } : null) });
    if (s.type === 'W') return;
    const n = C.overlap.nextSetFor(ov, id, today.filter(x => x.type !== 'W'), C.live.REP_DROP);
    console.log('  after set' + si + ' ' + fmt(s) + ' → ' + (n ? n.kind + ': ' + n.text + ' / ' + (n.why || []).join(' / ') : 'null'));
  });
  console.log('  readLift', JSON.stringify(lift ? C.overlap.readLift(lift, ctx, ov) : null).slice(0, 300));
}
console.log('\nrecordDay', JSON.stringify(C.overlap.recordDay(ov, now)));
const vr = C.volume.volumeRead(C.coach.volumeInput(input));
console.log('volume', vr.state, (vr.groups || []).map(g => g.group + ':' + g.sets).join(' '));
if (args.includes('--dump')) {
  mkdirSync(join(HERE, 'out'), { recursive: true });
  const p = join(HERE, 'out', 'repro-' + arch + '-' + seed + '.json');
  writeFileSync(p, JSON.stringify(L));
  console.log('dumped → ' + p);
}
