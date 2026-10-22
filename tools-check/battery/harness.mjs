#!/usr/bin/env node
//
// The Coach battery harness — drives Coach's pure modules over generated
// lifters at many cut-off points and scores every decision ok / miss / wrong.
//
//   node harness.mjs [--repo <repo root>] [--n 300] [--seed 1]
//                    [--archetype X] [--cuts 6] [--in out/lifters.jsonl]
//                    [--out out/report.json] [--misses 25] [--quiet]
//                    [--gate engine|all]
//
// --repo defaults to the repo this file sits in (tools-check/battery/../..).
// --gate says which wrongs fail the run: `engine` (rack-v69's gate) exits 1 on
// any wrong whose cause is `engine`; `all` (run-all.sh's default since rack-v70)
// exits 1 on any wrong whose codes are not all `needsAnswer` — and since v76,
// when T_INJURED and R_INJURED lost that flag (scoring.mjs), on any wrong at
// all. Both counts are printed either way; this script's own default stays
// `engine`.
//
// For each lifter, for each cut-off (a session index), the log before the
// cut-off is what Coach sees and the session AT the cut-off is the truth
// about what happened next. Coach is asked, at that moment:
//
//   target     targetFor() for every lift in the next session, before it
//   nextSet    nextSetFor() after each ticked set of the next session, set by
//              set, as the live screen would ask it (warm-ups ticked too —
//              that is how a lifter who does not tag W presents to Coach)
//   live       coach().live() after each ticked set — the four-answer read
//   volume     volumeRead() over the log at the cut-off, against the true
//              working-set count of the last seven days
//   record     recordDay() at the cut-off
//   plateau    readLift() per lift
//
// Each is scored by scoring.mjs; wrong is fatal (exit 1). The report lists
// every wrong with the lifter id, seed, session and the reproduction command,
// and a sample of misses. No copy of any Coach rule lives here: Coach's own
// files are staged from --repo and driven for real.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stageCoach } from './stage.mjs';
import { lifters, makeLifter, ARCHETYPE_IDS } from './generator.mjs';
import { CODES, verdictOf, scoreTarget, scoreNextSet, scoreLive, scoreChips, scoreVolume, scoreRecord, scorePlateau,
         deadEndOf, deadTarget, scoreFallback } from './scoring.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DAY = 864e5;
const LB_PER_KG = 2.2046226218;
const TOL = 0.011;
const r2 = x => Math.round(x * 100) / 100;
const noon = ms => { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); };
const daysBetween = (a, b) => Math.round((noon(b) - noon(a)) / DAY);

/* ================================================================
   INPUT, AS coach-data.js BUILDS IT
   ================================================================ */
function inputOf(L, sessions, now, live) {
  return {
    now, opens: 0, recentGreets: [], recentHype: [], u: L.u, log: sessions.length ? 'readable' : 'empty',
    sessions, lib: L.lib, routines: [], live: { active: !!live }, hidden: [], libReady: true, tier: { pro: true },
    targets: null, targetsSet: false, summaries: {}, steps: { days: {} },
    weighIns: L.weighIns.filter(w => w.t <= now), foodFirst: {}, foodDays: {}, foodLog: {},
    weight: weightAt(L, now), settings: settingsAt(L, now)
  };
}
function weightAt(L, now) {
  const ins = L.weighIns.filter(w => w.t <= now);
  if (!ins.length) return { latestLb: null, latestAt: null, rateWk: null, rateDays: null, goalDir: null, goalRateWk: null };
  const last = ins[ins.length - 1];
  return { ...L.weight, latestLb: last.lb, latestAt: last.t, rateAgeDays: Math.round((now - last.t) / DAY), rateDays: Math.min(21, ins.length) };
}
function settingsAt(L, now) {
  const s = L.settings;
  const marks = {};
  const ids = new Set(L.sessions.filter(x => x.startedAt <= now).map(x => x.id));
  Object.keys(s.marks || {}).forEach(id => { if (ids.has(id)) marks[id] = s.marks[id]; });
  /* v76: an answer he gave on a recap (knowBy.hold, the drop question) is in
     the settings from its `at` on, never before — a cut-off before the drop
     has not been asked anything. */
  const hold = s.knowBy && s.knowBy.hold ? s.knowBy.hold : null;
  if (!hold) return { ...s, marks };
  const kept = Object.fromEntries(Object.entries(hold).filter(([, f]) => f && f.at <= now));
  const knowBy = { ...s.knowBy };
  if (Object.keys(kept).length) knowBy.hold = kept; else delete knowBy.hold;
  return { ...s, marks, knowBy };
}

/* ================================================================
   TRUTH AT A CUT-OFF
   ================================================================
   What the simulator knows about one lift as of the session at `k`. */
function liftTruth(L, k, exId, now) {
  const T = L.truth;
  const te = T.exercises[exId];
  if (!te) return null;
  const u = L.u;
  const prior = [];      // truth rows of earlier sessions holding the lift
  let lastAny = null, lastGroup = null;
  for (let i = 0; i < k; i++) {
    const s = T.sessions[i];
    const row = s.exercises.find(e => e.exId === exId);
    if (row) { prior.push({ s, row, rec: L.sessions[i] }); lastAny = s; }
    if (s.exercises.some(e => T.exercises[e.exId] && T.exercises[e.exId].group === te.group && !T.exercises[e.exId].cardio)) lastGroup = s;
  }
  const last = prior[prior.length - 1] || null;
  const prev = prior[prior.length - 2] || null;
  const dispToLb = (x, unit) => (unit === 'kg' ? r2(x * LB_PER_KG) : x);
  const topLb = p => (p ? dispToLb(p.row.W, p.s.unit) : null);
  const gridDisp = te.cardio ? 0 : last ? (last.s.unit === u ? te.grid : (u === 'kg' ? te.grid / LB_PER_KG : te.grid * LB_PER_KG)) : te.grid;
  // The grid, in the display unit: 0.5 lb/kg is the finest Coach may name; a
  // lifter who loaded pounds on a kilo account has an off-grid history, and
  // the truth says so (gridKnown false) rather than fault Coach for silence.
  const gridKnown = !last || last.s.unit === u;
  const isStraight = p => p && !p.row.single && (te.scheme === 'straight' || te.bodyweight || te.assisted);
  const injuredNow = T.injured && now >= T.startMs + T.injured.at * DAY && now < T.startMs + (T.injured.at + T.injured.len) * DAY && te.group === T.injured.group;
  const hitTopTwice = !!(last && prev && last.row.hitTop && prev.row.hitTop && Math.abs(last.row.W - prev.row.W) < TOL);
  // the last session's working loads and whether it had an F
  const lastF = !!(last && last.rec.exercises.some(e => e.exId === exId && e.sets.some(s => s.type === 'F')));
  const workLoadsLb = new Set();
  prior.forEach(p => p.row.workIdx.forEach(i => { if (i >= 0) { const s = p.rec.exercises.find(e => e.exId === exId).sets[i]; if (s) workLoadsLb.add(parseFloat(s.w) || 0); } }));
  // the target from before a marked last session: the top the session before it
  const preMark = last && last.s.marked ? prev : null;
  return {
    exId, u, equipment: te.equipment, group: te.group,
    cardio: te.cardio, bodyweight: te.bodyweight, assisted: te.assisted, lowerBB: te.lowerBodyBarbell,
    exposures: prior.length,
    lastTopLb: topLb(last), stepLb: te.cardio ? 0 : dispToLb(Math.abs(te.step), u), gridDisp, gridKnown,
    lo: te.repLo, hi: te.repHi,
    capE1rm: last && last.row.capLb != null ? Math.round(last.row.capLb) : 0,
    groupGapDays: lastGroup ? daysBetween(lastGroup.startedAt, now) : 999,
    liftGapDays: lastAny ? daysBetween(lastAny.startedAt, now) : 999,
    lastTwoStraight: isStraight(last) && isStraight(prev) && !!prev,
    lastSingle: !!(last && last.row.single),
    hitTopTwice, lastMarked: !!(last && last.s.marked), preMarkTopLb: preMark ? topLb(preMark) : null,
    injuredGroup: !!injuredNow, aim: T.aim, energy: T.energy,
    lastAll: last ? last.rec.exercises.find(e => e.exId === exId).sets : null,
    lastF, workLoadsLb: [...workLoadsLb],
    // v72: he told Coach he logs no warm-ups on this lift (settings.knowBy.warm no)
    warmNo: !!te.warmNo,
    usualReps: (() => { const rs = prior.slice(-3).flatMap(p => p.row.single ? [] : p.row.reps); if (!rs.length) return null; const v = rs.slice().sort((a, b) => a - b); return v[v.length >> 1]; })(),
    ratePctWk: (T.progression[exId] || {}).ratePctWk, phase: last ? last.s.phase : 'normal',
    // how far the LOGGED top load has climbed over the last eight weeks, in
    // the lift's own steps: what a lifter would call "I've been adding weight"
    loadRiseSteps: (() => {
      const eight = prior.filter(p => now - p.s.startedAt <= 56 * DAY && !p.row.single);
      if (eight.length < 2 || !te.step) return 0;
      return (eight[eight.length - 1].row.W - eight[0].row.W) / Math.abs(te.step);
    })(),
    // the same two climbs inside a window Coach names (readLift's start..end)
    climbIn: (a, b) => {
      const rows = prior.filter(p => p.s.startedAt >= a && p.s.startedAt <= b && !p.row.single);
      if (rows.length < 2) return { steps: 0, reps: 0 };
      const steps = te.step ? (rows[rows.length - 1].row.W - rows[0].row.W) / Math.abs(te.step) : 0;
      const atTop = rows.filter(p => Math.abs(p.row.W - rows[rows.length - 1].row.W) < TOL);
      const minR = p => Math.min(...p.row.reps);
      // reps count only under twelve: past twelve Coach's estimated max is a
      // floor by design (E1RM_MAX_REPS), so a climb there is invisible to it
      // and a plateau call on a 15-to-17-rep set is not a harm
      const reps = atTop.length >= 2 && minR(atTop[atTop.length - 1]) <= 12 ? minR(atTop[atTop.length - 1]) - minR(atTop[0]) : 0;
      // and the logged estimated max (Epley on W × the least reps, capped at
      // twelve as Coach caps it) first to last: a bar that went up while the
      // reps fell is not a climb
      const em = p => p.row.W * (1 + Math.min(12, minR(p)) / 30);
      const e1Pct = em(rows[0]) > 0 ? (em(rows[rows.length - 1]) / em(rows[0]) - 1) * 100 : 0;
      return { steps, reps, e1Pct };
    },
    plateauWeeks: T.plateau && now >= T.startMs + T.plateau.at * DAY ? (now - (T.startMs + T.plateau.at * DAY)) / DAY / 7 : 0,
    exposures8w: prior.filter(p => now - p.s.startedAt <= 56 * DAY).length
  };
}

/* ================================================================
   ONE LIFTER, ONE CUT-OFF
   ================================================================ */
export function cutPointsOf(L, nCuts) {
  const n = L.sessions.length;
  if (n < 4) return [];
  // spread over the log, always including the last session; never the first three
  const pts = new Set([n - 1]);
  for (let i = 1; i < nCuts; i++) pts.add(Math.max(3, Math.round(3 + (n - 4) * i / nCuts)));
  return [...pts].sort((a, b) => a - b);
}

export function runCut(C, L, k, acc) {
  const next = L.sessions[k];
  const nextT = L.truth.sessions[k];
  const before = L.sessions.slice(0, k);
  // "now" is the morning of the next session, before it starts
  const now = next.startedAt - 30 * 60e3;
  const input = inputOf(L, before, now, false);
  const note = (surface, exId, sc, extra) => {
    if (!sc.codes.length) { acc.tally(surface, 'ok'); return; }
    const v = verdictOf(sc.codes);
    acc.tally(surface, v);
    acc.record({ v, surface, codes: sc.codes, notes: sc.notes, lifter: L.id, seed: L.seed, archetype: L.archetype, u: L.u, tagW: L.truth.tagW,
                 session: k, date: next._date, exId, ...extra });
  };
  const safe = (surface, fn) => { try { return fn(); } catch (e) { acc.tally(surface, 'wrong'); acc.record({ v: 'wrong', surface, codes: ['X_THROW'], notes: [String(e && e.stack || e).split('\n').slice(0, 2).join(' | ')], lifter: L.id, seed: L.seed, archetype: L.archetype, u: L.u, session: k, date: next._date }); return undefined; } };

  const ov = safe('target', () => C.coach.overlapInput(input));
  if (!ov) return;
  const ctx = { now: ov.now, u: ov.u, aim: ov.aim, exp: ov.exp, energy: ov.energy, rateWk: ov.rateWk };
  const liftOf = exId => ov.lifts.find(l => l.exId === exId) || null;

  // ---------- targets, for every lift in the next session ----------
  const targets = {};
  for (const ex of next.exercises) {
    if (targets[ex.exId] !== undefined) continue;
    const tr = liftTruth(L, k, ex.exId, now);
    if (!tr) continue;
    const lift = liftOf(ex.exId);
    const t = safe('target', () => (lift ? C.prog.targetFor(lift, ctx, lift.mark || null) : null));
    if (t === undefined) continue;
    // determinism: the same call again
    const t2 = lift ? C.prog.targetFor(lift, ctx, lift.mark || null) : null;
    if (JSON.stringify(t) !== JSON.stringify(t2)) note('target', ex.exId, { codes: ['X_NONDET'], notes: [] });
    targets[ex.exId] = t;
    // v74: a target drawn with nothing he can use — a defer with no last time beside it
    if (t) acc.deadTarget(deadTarget(t, typeof C.prog.targetSaid === 'function' ? C.prog.targetSaid(t) : t.line), { lifter: L.id, session: k, exId: ex.exId, line: t.line });
    if (!lift && tr.exposures === 0) { acc.tally('target', 'ok'); continue; }     // first time: nothing to judge
    note('target', ex.exId, scoreTarget(t, tr), { mode: t && t.mode, code: t && t.code, line: t && t.line, truth: brief(tr) });
  }

  // ---------- volume, record day, plateau at the cut-off ----------
  safe('volume', () => {
    const vi = C.coach.volumeInput(input);
    const read = C.volume.volumeRead(vi);
    const byGroup = {};
    for (let i = 0; i < k; i++) {
      const s = L.truth.sessions[i];
      if (daysBetween(s.startedAt, now) > 6 || daysBetween(s.startedAt, now) < 0) continue;
      s.exercises.forEach(t => {
        const te = L.truth.exercises[t.exId];
        if (!te || te.cardio) return;
        const n = t.workIdx.length;
        byGroup[te.group] = (byGroup[te.group] || 0) + n;
        // Secondary groups take their share, as coach-volume.js counts them
        // (its own exported SECONDARY, the library's own secondary list) —
        // read from the real modules, never restated.
        const built = C.exercises.EXERCISE_BY_ID[t.exId];
        if (built) (built.secondary || []).forEach(g => { if (g !== te.group) byGroup[g] = (byGroup[g] || 0) + n * C.volume.SECONDARY; });
      });
    }
    const first = L.truth.sessions[0];
    note('volume', null, scoreVolume(read, { byGroup, ageDays: daysBetween(first.startedAt, now) }), { read: read && read.state });
  });
  safe('record', () => {
    const r = C.overlap.recordDay(ov, now);
    note('record', r && r.exId, scoreRecord(r, exId => liftTruth(L, k, exId, now)), r ? { text: r.text } : {});
  });
  safe('plateau', () => {
    for (const l of ov.lifts) {
      const tr = liftTruth(L, k, l.exId, now);
      if (!tr || tr.cardio || tr.assisted || tr.bodyweight) continue;
      const read = C.overlap.readLift(l, ctx, ov);
      note('plateau', l.exId, scorePlateau(read, tr), { call: read && read.call, because: read && read.because });
    }
  });

  // ---------- the next session, ticked set by set ----------
  // The live session is the next session's record with every set unticked,
  // then ticked in order. Targets ride as tw/tr the way the builder sets
  // them; the lifter's own numbers go in the boxes as he ticks.
  const live = { startedAt: next.startedAt, exercises: next.exercises.map(e => ({ exId: e.exId, name: e.name, group: e.group, equipment: e.equipment,
    sets: e.sets.map(s => ({ w: '', r: '', type: s.type, done: false, ...(s.dp === 1 ? { dp: 1 } : null) })) })) };
  const liveInput = inputOf(L, before, next.startedAt + 20 * 60e3, true);
  const coachLive = safe('live', () => C.coach.coach(liveInput));
  if (!coachLive) return;
  const asks = new Set();     // (exIdx) seen with a working set, for 'another'/'next' asks
  /* v74: THE SHEET AS HE OPENS IT, at any moment — before the first set of an
     exercise, after a warm-up (tagged or not), after a working set: what
     coach-ui.js openLiveSheet would draw (another, the habit read, the next
     set, and the fallback where all three are silent), and whether it is a
     dead end (scoring.mjs deadEndOf). And the same engine with an answer to
     "what are you going for?" on every lift of the session — same / ease /
     more, rotated per cut — so the quote chips that answer brings are scored
     as quotes of last time (scoreFallback). */
  const WANTS = ['same', 'ease', 'push'];
  const want = WANTS[k % 3];
  const steerSettings = { ...liveInput.settings, knowBy: { ...((liveInput.settings || {}).knowBy || {}),
    wantNext: Object.fromEntries(next.exercises.map(e => [e.exId, { v: want, c: 1, at: next.startedAt + 10 * 60e3, n: 1 }])) } };
  const coachSteer = typeof coachLive.fallback === 'function' ? safe('live', () => C.coach.coach({ ...liveInput, settings: steerSettings })) : null;
  const probe = (xi, e, moment, si) => {
    const at = { current: xi };
    const an = safe('live', () => coachLive.another(live, at));
    let a = safe('live', () => coachLive.live(live, at));
    if (an && a && (a.kind === 'done' || a.kind === 'another')) a = null;
    const ls = safe('live', () => coachLive.liveSet(live, at));
    const nx = !an && ls ? ls.next : null;
    const fb = !an && !a && !nx && typeof coachLive.fallback === 'function' ? safe('live', () => coachLive.fallback(live, at)) : null;
    const de = deadEndOf({ an, live: a, next: nx, fb });
    acc.deadSheet(moment, de, { lifter: L.id, archetype: L.archetype, seed: L.seed, session: k, exId: e.exId, set: si,
      text: (an || a || nx || fb || {}).text || null });
    if (!coachSteer || !((fb && fb.steer) || (an && an.steer))) return;
    const sets = live.exercises[xi].sets.filter(x => x.done);
    const main = sets.filter(x => x.type !== 'W').map(x => parseFloat(x.w) || 0);
    const stopToday = sets.some(x => x.type === 'F' || x.type === 'D' || x.rir === 0) || main.some((x, j) => j > 0 && x < main[j - 1] - TOL);
    const tr = liftTruth(L, k, e.exId, now);
    const fb2 = fb ? safe('live', () => coachSteer.fallback(live, at)) : safe('live', () => coachSteer.another(live, at));
    if (fb2) { acc.dead.steered++; acc.dead.quoteChips += (fb2.chips || []).filter(c => c.id === 'last_time').length; }
    if (fb2) note('live', e.exId, scoreFallback({ ...fb2, chips: (fb2.chips || []).filter(c => c.id === 'last_time') }, { u: L.u, lastAll: tr && tr.lastAll, stopToday }),
                  { set: si, kind: 'fallback:' + (fb2.kind || fb2.answer) + ':' + want, text: fb2.text, chips: (fb2.chips || []).map(c => c.id + (c.tw != null ? '=' + c.tw + 'x' + c.tr : '')).join(' ') });
  };
  next.exercises.forEach((e, xi) => {
    const tr = liftTruth(L, k, e.exId, now);
    const tRow = nextT.exercises.find(t => t.exId === e.exId);
    if (!tr || !tRow) return;
    const lift = liftOf(e.exId);
    const t = targets[e.exId];
    const straight = !!(t && t.loadLb != null && t.sets.filter(s => s.type !== 'W' && Math.abs(parseFloat(s.tw) - t.loadLb) < TOL).length >= 2);
    const workIdx = new Set(tRow.workIdx);
    const rampIdx = new Set(tRow.rampIdx);
    const doneLoads = [], mainLoads = [];     // v73: mainLoads — the working-typed sets that are not a drop set's strips
    let stopped = false, firstWorkReps = null, firstWorkLoad = null, lastRepsUnderLo = false, earnedUp = false, lastMainLb = null;
    probe(xi, e, 'before', -1);
    e.sets.forEach((s, si) => {
      // tick it
      const ls = live.exercises[xi].sets[si];
      ls.w = s.w; ls.r = s.r; ls.done = true; if (s.rir != null) ls.rir = s.rir;
      const isWork = workIdx.has(si), isRamp = rampIdx.has(si);
      probe(xi, e, isWork ? 'work' : 'warmup', si);
      const r = parseInt(s.r, 10), w = parseFloat(s.w) || 0;
      if (isWork) {
        if (s.type !== 'W') doneLoads.push(w);
        if (s.type !== 'W' && s.type !== 'D' && !s.dp) mainLoads.push(w);
        if (s.type === 'F' || s.rir === 0) stopped = true;
        if (s.type !== 'D' && !s.dp) {
          if (firstWorkReps == null) { firstWorkReps = r; firstWorkLoad = w; }
          else if (r <= firstWorkReps * (1 - C.live.REP_DROP) && w <= firstWorkLoad + TOL) stopped = true;
          // "under the range" as the lifter has shown it: under the bottom of
          // his own band AND a quarter under what he usually gets on this lift
          lastRepsUnderLo = r < tr.lo && tr.usualReps != null && r < tr.usualReps * 0.75; earnedUp = r >= tr.hi + 2; lastMainLb = w;
        }
      } else if (s.type !== 'W') doneLoads.push(w);
      if (s.type === 'W' && !isWork) return;      // a tagged warm-up ticks silently: Coach is not asked after one
      // the next set, as the live sheet asks it after this tick
      const today = live.exercises[xi].sets.filter(x => x.done && x.type !== 'W').map(x => ({ w: x.w, r: x.r, type: x.type, ...(x.rir != null ? { rir: x.rir } : null) }));
      const n = safe('nextSet', () => C.overlap.nextSetFor(ov, e.exId, today, C.live.REP_DROP));
      const st = { doneLoadsLb: doneLoads.slice(), lastDone: { w, r, isRamp, isWork }, stoppedTruth: stopped, lastRepsUnderLo,
                   trueWLb: tRow.unit === 'kg' ? r2(tRow.W * LB_PER_KG) : tRow.W, stepLb: tr.stepLb, gridDisp: tr.gridDisp, lo: tr.lo, hi: tr.hi,
                   bodyweight: tr.bodyweight, assisted: tr.assisted, u: L.u, hadTarget: !!(t && t.loadLb != null), targetLb: t && t.loadLb != null ? t.loadLb : null,
                   straight, exposures: tr.exposures, earnedUp, lastMainLb,
                   targetReps: t && t.sets && t.sets[si] && t.sets[si].type !== 'W' ? parseInt(t.sets[si].tr, 10) || null : null,
                   // v73: a working set ticked lighter than the one before it today — no heavier chip after one.
                   // A drop set's strips (D) fall by design and are not a step down (coach-prog.js reads `done` without them).
                   steppedDown: mainLoads.some((x, j) => j > 0 && x < mainLoads[j - 1] - TOL),
                   lastTopLb: tr.lastTopLb };
      if (n !== undefined) {
        note('nextSet', e.exId, scoreNextSet(n, st), { set: si, kind: n && n.kind, text: n && n.text, ticked: s.type + s.w + '×' + s.r, target: st.targetLb, mode: t && t.mode, today: today.map(x => x.type + x.w + '×' + x.r).join(' '), truth: { isWork, isRamp, stopped, W: tRow.W } });
      }
      // the four-answer read, and (v73) the one answer with chips — "another set, and at what weight?"
      const doneSets = live.exercises[xi].sets.filter(x => x.done);
      const curF = doneSets.some((x, j) => (x.type === 'F' || x.rir === 0) && workIdx.has(j));
      const workDone = live.exercises.reduce((acc2, ex2, xj) => acc2 + ex2.sets.filter((x, j) => x.done && (nextT.exercises.find(q => q.exId === ex2.exId) || { workIdx: [] }).workIdx.includes(j)).length, 0);
      const planned = nextT.exercises.reduce((acc2, q) => acc2 + q.workIdx.filter(i => i >= 0).length, 0);
      const liveSt = { curF, curDrop: stopped && !curF, workDone, planned, u: L.u };
      if (isWork || isRamp) {
        const a = safe('live', () => coachLive.live(live, { current: xi }));
        if (a !== undefined) note('live', e.exId, scoreLive(a, liveSt), { set: si, kind: a && a.kind, text: a && a.short });
      }
      const an = safe('live', () => coachLive.another(live, { current: xi }));
      if (an !== undefined) {
        const an2 = coachLive.another(live, { current: xi });
        const sc = scoreLive(an, liveSt);
        const chips = scoreChips(an, st);
        if (JSON.stringify(an) !== JSON.stringify(an2)) sc.codes.push('X_NONDET');
        note('live', e.exId, { codes: sc.codes.concat(chips.codes), notes: sc.notes.concat(chips.notes) },
             { set: si, kind: an && 'another:' + an.answer, text: an && an.short, chips: an && an.chips.map(c => c.id + (c.tw != null ? '=' + c.tw + 'x' + c.tr : '')).join(' '),
               ticked: s.type + s.w + '×' + s.r, today: today.map(x => x.type + x.w + '×' + x.r).join(' '), truth: { isWork, isRamp, stopped, W: tRow.W } });
      }
    });
    asks.add(xi);
  });
}

const brief = tr => ({ lastTopLb: tr.lastTopLb, stepLb: tr.stepLb, grid: tr.gridDisp, lo: tr.lo, hi: tr.hi, exposures: tr.exposures,
                       groupGap: tr.groupGapDays, liftGap: tr.liftGapDays, marked: tr.lastMarked, single: tr.lastSingle, cap: tr.capE1rm });

/* ================================================================
   THE RUN
   ================================================================ */
export function makeAcc() {
  return {
    counts: {}, byCode: {}, byArch: {}, byCause: {}, wrongs: [], misses: [], n: 0, sessions: 0, cuts: 0,
    // v74: the dead-end rates — the live sheet by moment, and the targets
    dead: { sheet: {}, targets: { n: 0, dead: 0 }, samples: [], steered: 0, quoteChips: 0 },
    deadSheet(moment, kind, info) {
      const m = this.dead.sheet[moment] || (this.dead.sheet[moment] = { n: 0, dead: 0, by: {} });
      m.n++;
      if (kind) { m.dead++; m.by[kind] = (m.by[kind] || 0) + 1; if (this.dead.samples.length < 40) this.dead.samples.push({ moment, kind, ...info }); }
    },
    deadTarget(dead, info) { this.dead.targets.n++; if (dead) { this.dead.targets.dead++; if (this.dead.samples.length < 40) this.dead.samples.push({ moment: 'target', kind: 'defer', ...info }); } },
    tally(surface, v) { const c = this.counts[surface] || (this.counts[surface] = { ok: 0, miss: 0, wrong: 0 }); c[v]++; },
    record(r) {
      // Why it went wrong, where the harness can say: an untagged warm-up
      // (a W the lifter never typed, on a lifter who does not tag them), or
      // an answer v1 never asked. v70: a `shape` defer is no longer put down
      // to the ramp — with the ramp model in, every one left is a real top
      // load that moved more than 15% between two sessions (a coarse grid on
      // a light lift, a bad day), which the ramp cannot explain.
      const UNTAGGED = ['N_WARMUP', 'V_OVER', 'N_FALSE_STOP', 'L_ANOTHER_DROP', 'R_RAMP', 'N_STOPPED'];
      if (r.codes.every(c => CODES[c].needsAnswer)) r.cause = 'needs-answer';
      else if (r.tagW != null && r.tagW < 1 && r.codes.some(c => UNTAGGED.includes(c))) r.cause = 'untagged-warmup';
      else r.cause = 'engine';
      this.byCause[r.v + ':' + r.cause] = (this.byCause[r.v + ':' + r.cause] || 0) + 1;
      r.codes.forEach(c => {
        const b = this.byCode[c] || (this.byCode[c] = { n: 0, v: CODES[c].v, needsAnswer: !!CODES[c].needsAnswer, archetypes: {} });
        b.n++; b.archetypes[r.archetype] = (b.archetypes[r.archetype] || 0) + 1;
      });
      const a = this.byArch[r.archetype] || (this.byArch[r.archetype] = { miss: 0, wrong: 0 });
      a[r.v]++;
      (r.v === 'wrong' ? this.wrongs : this.misses).push(r);
    }
  };
}

export async function runBattery(opts) {
  const C = await stageCoach(opts.repo);
  const acc = makeAcc();
  const source = opts.in ? readFileSync(opts.in, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l))
                         : [...lifters(opts.n, opts.seed, opts.archetype)];
  const t0 = Date.now();
  for (const L of source) {
    if (opts.archetype && L.archetype !== opts.archetype) continue;
    acc.n++; acc.sessions += L.sessions.length;
    for (const k of cutPointsOf(L, opts.cuts)) { acc.cuts++; runCut(C, L, k, acc); }
  }
  const ms = Date.now() - t0;
  return { C, acc, ms, source: source.length };
}

function summary(acc, ms, opts) {
  const lines = [];
  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n) => String(s).padStart(n);
  lines.push('Coach battery — ' + acc.n + ' lifters, ' + acc.sessions + ' sessions, ' + acc.cuts + ' cut-offs, ' + (ms / 1000).toFixed(1) + 's');
  lines.push('repo: ' + opts.repo);
  lines.push('');
  lines.push(pad('surface', 10) + num('decisions', 10) + num('ok', 8) + num('miss', 8) + num('wrong', 8) + num('ok%', 8));
  let T = { ok: 0, miss: 0, wrong: 0 };
  for (const s of ['target', 'nextSet', 'live', 'volume', 'record', 'plateau']) {
    const c = acc.counts[s] || { ok: 0, miss: 0, wrong: 0 };
    const n = c.ok + c.miss + c.wrong;
    T.ok += c.ok; T.miss += c.miss; T.wrong += c.wrong;
    lines.push(pad(s, 10) + num(n, 10) + num(c.ok, 8) + num(c.miss, 8) + num(c.wrong, 8) + num(n ? (c.ok / n * 100).toFixed(1) : '-', 8));
  }
  const n = T.ok + T.miss + T.wrong;
  lines.push(pad('TOTAL', 10) + num(n, 10) + num(T.ok, 8) + num(T.miss, 8) + num(T.wrong, 8) + num(n ? (T.ok / n * 100).toFixed(1) : '-', 8));
  lines.push('');
  // v74: how often an ask ends in nothing he can act on
  const pct = (a, b) => (b ? (a / b * 100).toFixed(2) + '%' : '-');
  const sh = acc.dead.sheet, all = Object.values(sh).reduce((x, m) => ({ n: x.n + m.n, dead: x.dead + m.dead }), { n: 0, dead: 0 });
  lines.push('dead ends (v74): live sheet ' + all.dead + ' of ' + all.n + ' asks = ' + pct(all.dead, all.n) +
             '  [' + ['before', 'warmup', 'work'].map(m => m + ' ' + ((sh[m] || {}).dead || 0) + '/' + ((sh[m] || {}).n || 0) +
               (sh[m] && Object.keys(sh[m].by).length ? ' (' + Object.entries(sh[m].by).map(([k, v]) => k + ' ' + v).join(', ') + ')' : '')).join('; ') + ']');
  lines.push('                  targets ' + acc.dead.targets.dead + ' of ' + acc.dead.targets.n + ' = ' + pct(acc.dead.targets.dead, acc.dead.targets.n));
  lines.push('                  answered "what are you going for?" ' + acc.dead.steered + ' times, ' + acc.dead.quoteChips + ' quote chips of last time scored');
  lines.push('');
  lines.push('by cause: ' + Object.keys(acc.byCause).sort().map(k => k + ' ' + acc.byCause[k]).join('  '));
  lines.push('engine wrongs: ' + (acc.byCause['wrong:engine'] || 0) + ', untagged-warmup wrongs: ' + (acc.byCause['wrong:untagged-warmup'] || 0) +
             ', needs-answer wrongs: ' + (acc.byCause['wrong:needs-answer'] || 0) + '  (gate: ' + opts.gate + ')');
  lines.push('  (untagged-warmup: a W the lifter never typed — Coach v1 has no ramp model, so these are Coach v2’s ramp learning to fix;');
  lines.push('   needs-answer: judged against a fact v1 never asked for; engine: a rule as shipped)');
  lines.push('');
  lines.push('by code (wrong first):');
  const codes = Object.keys(acc.byCode).sort((a, b) => (acc.byCode[a].v === acc.byCode[b].v ? acc.byCode[b].n - acc.byCode[a].n : acc.byCode[a].v === 'wrong' ? -1 : 1));
  for (const c of codes) {
    const b = acc.byCode[c];
    const top = Object.entries(b.archetypes).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([a, k]) => a + ' ' + k).join(', ');
    lines.push('  ' + pad(b.v.toUpperCase(), 6) + pad(c, 14) + num(b.n, 6) + (b.needsAnswer ? '  (needs a v2 answer)' : '') + '  ' + CODES[c].s);
    lines.push('        ' + top);
  }
  lines.push('');
  lines.push('by archetype (miss / wrong):');
  for (const a of ARCHETYPE_IDS) { const b = acc.byArch[a]; if (b) lines.push('  ' + pad(a, 22) + num(b.miss, 6) + num(b.wrong, 6)); }
  return lines.join('\n');
}

const fmtOne = r => {
  const extra = r.line || r.text || '';
  return '  [' + r.codes.join(',') + '] ' + r.surface + ' ' + r.lifter + ' s' + r.session + ' ' + (r.exId || '') + (r.set != null ? ' set' + r.set : '') +
    (r.kind ? ' ' + r.kind : '') + (r.mode ? ' ' + r.mode + (r.code ? '(' + r.code + ')' : '') : '') +
    (r.notes && r.notes.length ? ' — ' + r.notes.join('; ') : '') + (extra ? '\n      ' + extra : '') +
    (r.truth ? '\n      truth ' + JSON.stringify(r.truth) : '') +
    '\n      repro: node tools-check/battery/repro.mjs --archetype ' + r.archetype + ' --seed ' + r.seed + ' --session ' + r.session + (r.exId ? ' --ex ' + r.exId : '');
};

const MAIN = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (MAIN) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const opts = {
    repo: opt('--repo', join(HERE, '..', '..')), n: Number(opt('--n', 300)), seed: Number(opt('--seed', 1)),
    archetype: opt('--archetype', null), cuts: Number(opt('--cuts', 6)), in: opt('--in', null),
    out: opt('--out', join(HERE, 'out', 'report.json')), missN: Number(opt('--misses', 25)), quiet: args.includes('--quiet'),
    gate: opt('--gate', 'engine')
  };
  if (!['engine', 'all'].includes(opts.gate)) { console.error('--gate must be engine or all'); process.exit(2); }
  const { acc, ms } = await runBattery(opts);
  const text = summary(acc, ms, opts);
  console.log(text);
  console.log('\nEVERY WRONG (' + acc.wrongs.length + '):');
  acc.wrongs.forEach(r => console.log(fmtOne(r)));
  console.log('\nA SAMPLE OF MISSES (' + Math.min(opts.missN, acc.misses.length) + ' of ' + acc.misses.length + '):');
  // spread the sample across codes
  const seen = {};
  const sample = acc.misses.filter(r => { const c = r.codes[0]; seen[c] = (seen[c] || 0) + 1; return seen[c] <= Math.ceil(opts.missN / Math.max(1, Object.keys(acc.byCode).filter(k => acc.byCode[k].v === 'miss').length)); }).slice(0, opts.missN);
  sample.forEach(r => console.log(fmtOne(r)));
  mkdirSync(dirname(opts.out), { recursive: true });
  writeFileSync(opts.out, JSON.stringify({ opts, counts: acc.counts, dead: acc.dead, byCode: acc.byCode, byArch: acc.byArch, byCause: acc.byCause, wrongs: acc.wrongs, misses: acc.misses, ms }, null, 1));
  console.log('\nreport → ' + opts.out);
  // The gate. `engine`: any wrong a shipped rule caused fails the run; the
  // untagged-warmup wrongs are reported and wait for the ramp model (v70).
  // `all`: any wrong whose codes are not all needsAnswer fails it (v76: no
  // code carries needsAnswer, so every wrong fails it — needs-answer included).
  const hardWrong = acc.wrongs.filter(r => !r.codes.every(c => CODES[c].needsAnswer));
  const gateWrong = opts.gate === 'engine' ? acc.wrongs.filter(r => r.cause === 'engine') : hardWrong;
  // v74: and under `all`, no dead end in the live sheet — the answer to "I
  // don't have a number" is never "I have nothing". Off with --no-dead-gate
  // (to measure a build from before v74).
  const deadN = Object.values(acc.dead.sheet).reduce((a, m) => a + m.dead, 0);
  const deadFail = opts.gate === 'all' && !args.includes('--no-dead-gate') && deadN > 0;
  if (deadN) { console.log('\nDEAD ENDS, a sample (' + Math.min(10, acc.dead.samples.length) + '):'); acc.dead.samples.filter(x => x.moment !== 'target').slice(0, 10).forEach(x => console.log('  ' + JSON.stringify(x))); }
  console.log('gate ' + opts.gate + ': ' + (gateWrong.length ? 'FAIL (' + gateWrong.length + ' wrong)' : deadFail ? 'FAIL (' + deadN + ' dead ends in the live sheet)' : 'PASS'));
  process.exit(gateWrong.length || deadFail ? 1 : 0);
}
