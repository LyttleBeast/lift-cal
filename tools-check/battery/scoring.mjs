// The scoring scheme — ok / miss / wrong, per decision, against the truth
// the generator wrote down. This file is the contract: every code below is
// named, has one sentence saying what it catches, and says which verdict it
// carries. The harness only calls these; it never decides a verdict itself.
//
//   ok     Coach said something true and useful, or was silent where silence
//          was right (nothing to go on)
//   miss   Coach was safe but said less than the truth allowed: a defer where
//          a target was clearly possible, "the next setting up" where the step
//          was learnable, a hold where a jump was earned, a false "done" or a
//          false "stop" (safe direction), a thin read with enough log
//   wrong  a confident wrong number, or advice that would harm: a jump above
//          the safe limit, a weight he cannot load, heavier after a layoff, a
//          heavier single, a warm-up quoted as the next working set, "one more
//          set" after failure, warm-ups counted as volume, a record day on a
//          marked or just-returned lift, a plateau called on a climbing lift,
//          a stored answer contradicted. WRONG MUST BE 0 TO SHIP.
//
// Some wrong codes can only be judged once Coach v2 has the answer the lifter
// would have given (an injury, a deload he chose). They carry `needsAnswer`
// so the baseline can report them honestly as "wrong, but unanswerable
// today" rather than hide them or blame v1 for not asking.

const LB_PER_KG = 2.2046226218;
const TOL = 0.011;
export const e1rm = (w, r) => { const W = parseFloat(w), R = parseInt(r, 10); if (!W || !R || R < 1) return 0; return R === 1 ? Math.round(W) : Math.round(W * (1 + R / 30)); };
const onGrid = (x, g) => g > 0 && Math.abs(x - Math.round(x / g) * g) < TOL;
const toDisp = (lb, u) => (u === 'kg' ? lb / LB_PER_KG : lb);

/* Phrases no Coach sentence may carry (the shipped ban in
   tools-check/coach-voice.mjs is longer; these are the ones that would be
   harm, not tone). */
export const BANNED = [
  /\bmax(ing)? out\b/i, /\btest your max\b/i, /\b(1\s*rm|one[- ]rep max)\b/i, /\bgo for a (single|max)\b/i,
  /\bpush through\b/i, /\bno pain no gain\b/i, /\byou should\b/i, /\byou must\b/i, /\bbeat your\b/i
];
export function textOffences(texts, u) {
  const out = [];
  for (const t of texts) {
    if (typeof t !== 'string') continue;
    for (const re of BANNED) if (re.test(t)) out.push(String(t.match(re)[0]));
    if (u === 'kg' && /\d ?lb\b/.test(t)) out.push('lb on a kilo account');
  }
  return out;
}

/* Every code, documented once. `v` is the verdict it carries. */
export const CODES = Object.freeze({
  // ---------- targets (coach-prog.js targetFor, before a session) ----------
  T_JUMP:      { v: 'wrong', s: 'target more than two of the lift’s true steps over the last top load (one step on anything but a lower-body barbell lift)' },
  T_GRID:      { v: 'wrong', s: 'target weight not on the lifter’s own plate / stack grid — a weight he cannot load' },
  T_LAYOFF_UP: { v: 'wrong', s: 'heavier than the last top load after 15+ days off the group or 21+ days off the lift' },
  T_MAX:       { v: 'wrong', s: 'a heavier single or double prescribed — a max attempt in all but name' },
  T_UNREACH:   { v: 'wrong', s: 'target’s estimated max more than 15% over the lifter’s true capacity that day' },
  T_BW_LOAD:   { v: 'wrong', s: 'a loaded target on a bodyweight-only lift' },
  T_CARDIO:    { v: 'wrong', s: 'a target on cardio' },
  T_GHOST:     { v: 'wrong', s: 'a blank ghost weight on a set that had a weight logged — ticking it records 0' },
  T_UNIT:      { v: 'wrong', s: 'a kilo account shown a weight that is not a half-kilo step' },
  T_MARK:      { v: 'wrong', s: 'the last session is marked a bad day and the target still counts it' },
  T_TEXT:      { v: 'wrong', s: 'a banned phrase, or lb on a kilo account, in the target’s words' },
  T_INJURED:   { v: 'wrong', s: 'heavier on a group the lifter said is injured', needsAnswer: true },
  T_DEFER:     { v: 'miss',  s: 'no target where the last two sessions were straight sets of the same scheme, no layoff, no single' },
  T_NONUM:     { v: 'miss',  s: '“the next setting up” on a barbell or dumbbell lift with four or more sessions logged' },
  T_HOLD:      { v: 'miss',  s: 'held at the same weight though the top of the range was reached twice running (and the aim is not a cut or maintain)' },
  T_NULL:      { v: 'miss',  s: 'no target object at all on a lift with history' },
  // ---------- the next set (coach-prog.js nextSet via coach-overlap.js nextSetFor, mid-session) ----------
  N_HEAVY:     { v: 'wrong', s: 'next set more than one true step over the heaviest set done today' },
  N_STOPPED:   { v: 'wrong', s: 'heavier after a set to failure, a set rated too hard, or a true rep drop among the working sets' },
  N_UNEARNED:  { v: 'wrong', s: 'a step up after a set that fell short of both the lifter’s own range and Coach’s own target reps' },
  N_WARMUP:    { v: 'wrong', s: 'a warm-up set quoted as the next working set (“Next set: 45 lb × 8” mid-ramp)' },
  N_WARMUP_WORK:{ v: 'wrong', s: 'a working set read as a warm-up (“Warming up…” after a true working set)' },
  N_GRID:      { v: 'wrong', s: 'next set not on the lifter’s own grid' },
  N_BW:        { v: 'wrong', s: 'a loaded next set on a bodyweight-only lift' },
  N_REPS:      { v: 'wrong', s: 'next set reps outside anything the lifter has shown (over the top of the range by 4+)' },
  N_TEXT:      { v: 'wrong', s: 'a banned phrase, or lb on a kilo account, in the next-set words' },
  N_FALSE_STOP:{ v: 'miss',  s: '“nothing heavier today” with no failure, no too-hard rating and no rep drop among the true working sets — read off warm-up noise' },
  N_NULL:      { v: 'miss',  s: 'no next set on a straight-sets lift that had a numeric target' },
  N_NOSTEP:    { v: 'miss',  s: 'a step up was earned but no step is known' },
  // ---------- the in-session read (coach-live.js liveRead) ----------
  L_ANOTHER_F: { v: 'wrong', s: '“one more set” on an exercise with a set to failure or rated too hard today' },
  L_ANOTHER_DROP:{ v: 'wrong', s: '“one more set” after a true rep drop of a quarter or more' },
  L_TEXT:      { v: 'wrong', s: 'a banned phrase in the live read' },
  L_DONE_EARLY:{ v: 'miss',  s: '“you’re probably done” with under half the planned working sets done' },
  // ---------- weekly volume (coach-volume.js volumeRead) ----------
  V_OVER:      { v: 'wrong', s: 'a group’s hard sets counted more than 2 (or 25%) over the true working sets — warm-ups counted as volume' },
  V_UNDER:     { v: 'wrong', s: 'a group’s hard sets counted more than 2 (or 25%) under the true working sets — real work dropped' },
  V_THIN:      { v: 'miss',  s: 'volume read says thin with 21+ days of log' },
  // ---------- the record day (coach-overlap.js recordDay) ----------
  R_LAYOFF:    { v: 'wrong', s: 'a record day on a lift whose group has had 15+ days off' },
  R_MARK:      { v: 'wrong', s: 'a record day on a lift whose last session is marked a bad day' },
  R_RAMP:      { v: 'wrong', s: 'a record day at a load that was only ever a warm-up' },
  R_MAX:       { v: 'wrong', s: 'a record day under three reps' },
  R_UNREACH:   { v: 'wrong', s: 'a record day whose estimated max is 12%+ over the lifter’s true capacity (a best from before a layoff, read as current)' },
  R_F:         { v: 'wrong', s: 'a record day on a lift whose last session had a set to failure' },
  R_INJURED:   { v: 'wrong', s: 'a record day on a group the lifter said is injured', needsAnswer: true },
  // ---------- plateau or cut (coach-overlap.js readLift) ----------
  P_FALSE:     { v: 'wrong', s: 'a plateau or slide called over a window in which the bar went up two steps or more while his true capacity climbed' },
  P_REPS:      { v: 'miss',  s: 'a plateau called over a window in which reps at the top load went up three or more (under twelve) — a climb read as flat' },
  P_MISS:      { v: 'miss',  s: 'no call on a lift frozen for six weeks or more with enough sessions to read' },
  // ---------- properties ----------
  X_NONDET:    { v: 'wrong', s: 'the same input gave two different answers' },
  X_THROW:     { v: 'wrong', s: 'a pure module threw' }
});

export function verdictOf(codes) {
  if (!codes.length) return 'ok';
  if (codes.some(c => CODES[c].v === 'wrong')) return 'wrong';
  return 'miss';
}

/* ================================================================
   TARGETS
   ================================================================
   t      targetFor()'s answer (or null)
   lift   { exId, equipment, exposures (Coach's), group }
   tr     the truth for this lift at this cut-off:
          { lastTopLb, stepLb, gridDisp, lo, hi, lowerBB, bodyweight, assisted,
            cardio, capE1rm, groupGapDays, liftGapDays, exposures, lastTwoStraight,
            lastSingle, hitTopTwice, lastMarked, preMarkTopLb, injuredGroup,
            aim, u, loggedWs (set of logged weight strings) } */
export function scoreTarget(t, tr) {
  const codes = [], notes = [];
  const u = tr.u;
  if (tr.cardio) { if (t) codes.push('T_CARDIO'); return { codes, notes }; }
  if (!t) { if (tr.exposures >= 1) codes.push('T_NULL'); return { codes, notes }; }
  const texts = [t.line].concat(t.why || []);
  const off = textOffences(texts, u);
  if (off.length) { codes.push('T_TEXT'); notes.push(off.join('; ')); }
  const load = t.loadLb;
  const sets = Array.isArray(t.sets) ? t.sets : [];
  if (tr.bodyweight && load != null) codes.push('T_BW_LOAD');
  // ghost: a set logged with a weight whose target has a blank tw
  // (a target from before a marked session has that session's shape, not
  // the marked one's — the builder draws its sets, so no ghost is read)
  // v70: a target's rows are last time's less any W row heavier than a reduced
  // top (dropped, never clamped), so the two lists are walked together — a W
  // row with no row of its own in the target is a dropped one, not a ghost.
  if (sets.length && tr.lastAll && !t.marked) {
    let j = 0;
    const dirW = tr.assisted ? -1 : 1;
    tr.lastAll.forEach(s => {
      const row = sets[j];
      if (s.type === 'W' && !(row && row.type === 'W' && String(row.tw) === String(s.w))) {
        // dropped: only ever a W heavier than a reduced or re-entered top
        if (!(['reduce', 'reenter'].includes(t.mode) && load != null && dirW * ((parseFloat(s.w) || 0) - load) > TOL)) codes.push('T_GHOST');
        return;
      }
      if (s.w !== '' && s.w != null && (!row || row.tw === '')) codes.push('T_GHOST');
      j++;
    });
  }
  if (load != null && !tr.bodyweight) {
    const L = toDisp(load, u);
    if (!onGrid(L, tr.gridDisp)) { codes.push('T_GRID'); notes.push('load ' + L.toFixed(2) + ' ' + u + ' off a ' + tr.gridDisp + ' grid'); }
    if (u === 'kg' && !onGrid(L, 0.5)) codes.push('T_UNIT');
    const dir = tr.assisted ? -1 : 1;
    const over = dir * (load - tr.lastTopLb);            // pounds above last top (for assisted: less help)
    const stepLb = Math.abs(tr.stepLb);
    if (stepLb > 0 && over > 2 * stepLb + TOL) { codes.push('T_JUMP'); notes.push('+' + over.toFixed(1) + ' lb over ' + tr.lastTopLb + ', step ' + stepLb); }
    else if (stepLb > 0 && !tr.lowerBB && over > stepLb + TOL && t.mode === 'add') { codes.push('T_JUMP'); notes.push('two steps on a non-lower-body lift'); }
    if (over > TOL && (tr.groupGapDays >= 15 || tr.liftGapDays >= 21)) { codes.push('T_LAYOFF_UP'); notes.push('group ' + tr.groupGapDays + 'd, lift ' + tr.liftGapDays + 'd off'); }
    if (over > TOL && tr.injuredGroup) codes.push('T_INJURED');
    const topReps = sets.filter(s => s.type !== 'W' && Math.abs(parseFloat(s.tw) - load) < TOL).map(s => parseInt(s.tr, 10)).filter(n => n >= 1);
    if (topReps.length) {
      const minR = Math.min(...topReps), maxR = Math.max(...topReps);
      if (over > TOL && maxR <= 2) codes.push('T_MAX');
      if (!tr.assisted && tr.capE1rm > 0 && minR >= 4 && e1rm(load, Math.min(maxR, 12)) > tr.capE1rm * 1.15) {
        codes.push('T_UNREACH'); notes.push('e1rm ' + e1rm(load, Math.min(maxR, 12)) + ' vs cap ' + tr.capE1rm);
      }
    }
    if (tr.lastMarked && !t.marked) codes.push('T_MARK');
  }
  // misses
  if ((t.mode === 'defer' || t.mode === 'first') && tr.exposures >= 3 && tr.lastTwoStraight && !tr.lastSingle &&
      tr.liftGapDays < 15 && tr.groupGapDays < 15 && !tr.lastMarked) { codes.push('T_DEFER'); notes.push('defer:' + t.code); }
  if (['add', 'reduce', 'reenter'].includes(t.mode) && load == null && !tr.bodyweight && !tr.assisted &&
      ['barbell', 'dumbbell'].includes(tr.equipment) && tr.exposures >= 4 && tr.gridKnown) codes.push('T_NONUM');
  if (t.mode === 'hold' && t.code === 'confirm' && tr.hitTopTwice && !['cut', 'maintain'].includes(tr.aim) && tr.energy !== 'deep') codes.push('T_HOLD');
  return { codes, notes };
}

/* ================================================================
   THE NEXT SET
   ================================================================
   n       nextSet's answer or null
   st      { doneLoadsLb (every ticked working-typed set's load so far, as
             logged), lastDone { w (lb), r, isRamp, isWork }, stoppedTruth
             (F / rir 0 / true rep drop among TRUE working sets), lastRepsUnderLo,
             trueWLb, stepLb, gridDisp, lo, hi, bodyweight, u, hadTarget,
             targetLb (the day's target load, pounds, or null — v70),
             straight, exposures, earnedUp (last true working set reps ≥ hi+2) } */
export function scoreNextSet(n, st) {
  const codes = [], notes = [];
  if (!n) {
    if (st.hadTarget && st.straight && st.exposures >= 3 && !st.bodyweight && !st.assisted && st.lastDone && st.lastDone.isWork) codes.push('N_NULL');
    return { codes, notes };
  }
  const off = textOffences([n.text].concat(n.why || []), st.u);
  if (off.length) { codes.push('N_TEXT'); notes.push(off.join('; ')); }
  // v70: "Warming up. The target when you get there: …" names the target, not
  // a next set, so it is judged on one thing only: was the set just ticked
  // really a warm-up? On a true ramp set it is ok; on a true working set it is
  // a working set read as a warm-up.
  if (n.kind === 'warmup') {
    if (st.lastDone && st.lastDone.isWork) { codes.push('N_WARMUP_WORK'); notes.push(n.text); }
    return { codes, notes };
  }
  const load = n.loadLb;
  if (st.bodyweight && load != null && load > 0) codes.push('N_BW');
  if (load != null && !st.bodyweight) {
    const L = toDisp(load, st.u);
    if (!onGrid(L, st.gridDisp)) codes.push('N_GRID');
    const heaviest = st.doneLoadsLb.length ? Math.max(...st.doneLoadsLb) : null;
    if (heaviest != null && st.stepLb > 0 && load > heaviest + st.stepLb + TOL) { codes.push('N_HEAVY'); notes.push(load + ' over ' + heaviest + ' by more than ' + st.stepLb); }
    if (n.kind === 'up' || (st.lastMainLb != null && load > st.lastMainLb + TOL && n.kind !== 'target')) {
      if (st.stoppedTruth) codes.push('N_STOPPED');
      // unearned: the set was under the lifter's own range AND under the reps
      // Coach itself asked for on it — a step up on a set that fell short
      if (st.lastRepsUnderLo && st.lastDone && st.targetReps != null && st.lastDone.r < st.targetReps) codes.push('N_UNEARNED');
    }
    // v70: the number quoted has to be the ramp set's. When it is the day's
    // own target load — he ticked a set AT the weight Coach planned, and Coach
    // repeated the plan — that is the sentence the `target` kind says before
    // anything is ticked, which this code never judged; the target itself was
    // judged on its own surface. A target that sits on his warm-up weight is a
    // low target, not a recited warm-up.
    if (st.lastDone && st.lastDone.isRamp && ['same', 'stop', 'down'].includes(n.kind) && load < st.trueWLb * 0.8 &&
        !(st.targetLb != null && Math.abs(load - st.targetLb) < TOL)) {
      codes.push('N_WARMUP'); notes.push(n.text);
    }
  }
  const reps = parseInt(n.tr, 10);
  if (Number.isFinite(reps) && (reps < 1 || reps > st.hi + 4)) codes.push('N_REPS');
  if (n.kind === 'stop' && !st.stoppedTruth) { codes.push('N_FALSE_STOP'); notes.push((n.why || [])[0] || ''); }
  if (n.kind === 'same' && st.earnedUp && !st.stoppedTruth && st.lastDone && st.lastDone.isWork && /doesn’t know this lift’s steps/.test((n.why || []).join(' '))) codes.push('N_NOSTEP');
  return { codes, notes };
}

/* ================================================================
   THE LIVE READ
   ================================================================
   a    liveRead's answer or null
   st   { curF (F or rir 0 among the current exercise's done sets), curDrop
          (true rep drop among its true working sets), workDone, planned, u } */
export function scoreLive(a, st) {
  const codes = [], notes = [];
  if (!a) return { codes, notes };
  const off = textOffences([a.text, a.short].concat(a.why || []), st.u);
  if (off.length) { codes.push('L_TEXT'); notes.push(off.join('; ')); }
  if (a.kind === 'another') {
    if (st.curF) codes.push('L_ANOTHER_F');
    if (st.curDrop) codes.push('L_ANOTHER_DROP');
  }
  if (a.kind === 'done' && st.planned > 0 && st.workDone < st.planned * 0.5) { codes.push('L_DONE_EARLY'); notes.push(st.workDone + ' of ' + st.planned); }
  return { codes, notes };
}

/* ================================================================
   VOLUME
   ================================================================
   read   volumeRead's answer; truth { byGroup: { g: trueSets }, ageDays } */
export function scoreVolume(read, truth) {
  const codes = [], notes = [];
  if (!read) return { codes, notes };
  if (read.state === 'thin') { if (truth.ageDays >= 21) codes.push('V_THIN'); return { codes, notes }; }
  for (const g of read.groups || []) {
    if (g.group === 'core') continue;
    const want = truth.byGroup[g.group] || 0, got = g.sets || 0;
    const tol = Math.max(2, want * 0.25);
    if (got > want + tol) { codes.push('V_OVER'); notes.push(g.group + ' ' + got + ' vs ' + want); }
    else if (got < want - tol) { codes.push('V_UNDER'); notes.push(g.group + ' ' + got + ' vs ' + want); }
  }
  return { codes: [...new Set(codes)], notes };
}

/* ================================================================
   RECORD DAY
   ================================================================
   r      recordDay's answer or null; tr the lift's truth (as for targets) plus
          workLoadsLb (set of true working loads ever) and lastF */
export function scoreRecord(r, trOf) {
  const codes = [], notes = [];
  if (!r) return { codes, notes };
  const tr = trOf(r.exId);
  if (!tr) return { codes, notes };
  if (tr.groupGapDays >= 15) codes.push('R_LAYOFF');
  if (tr.lastMarked) codes.push('R_MARK');
  if (tr.injuredGroup) codes.push('R_INJURED');
  if (r.reps < 3) codes.push('R_MAX');
  const loadLb = parseFloat(r.w);
  if (!tr.workLoadsLb.some(x => Math.abs(x - loadLb) < TOL)) { codes.push('R_RAMP'); notes.push(r.w + ' never a working load'); }
  if (tr.capE1rm > 0 && e1rm(loadLb, Math.min(r.reps, 12)) > tr.capE1rm * 1.12) { codes.push('R_UNREACH'); notes.push('would ' + e1rm(loadLb, Math.min(r.reps, 12)) + ' vs cap ' + tr.capE1rm); }
  if (tr.lastF) codes.push('R_F');
  return { codes, notes };
}

/* ================================================================
   PLATEAU OR CUT
   ================================================================ */
export function scorePlateau(read, tr) {
  const codes = [], notes = [];
  if (!read) return { codes, notes };
  const stalled = ['plateau', 'sliding', 'small_slide', 'holding_cut'].includes(read.call);
  // Wrong when the lifter has visibly been adding weight (two steps or more
  // in eight weeks) AND his true capacity is climbing: a plateau called on a
  // lift that is moving on the bar. Capacity rising under a frozen bar is a
  // plateau in every sense that matters to him, so that alone is not wrong.
  if (stalled && tr.phase === 'normal' && Number.isFinite(read.start) && Number.isFinite(read.end)) {
    const c = tr.climbIn(read.start, read.end);
    // WRONG: the bar went up two steps inside the window Coach read AND his
    // true capacity is climbing — a plateau called against the visible log.
    // MISS: reps at the top load went up three or more (a real climb Coach
    // read as flat); a wrong read, not a harmful number.
    if (c.steps >= 2 && c.e1Pct >= 3 && tr.ratePctWk != null && tr.ratePctWk >= 0.4) { codes.push('P_FALSE'); notes.push(read.call + ': bar up ' + c.steps.toFixed(1) + ' steps and logged e1rm +' + c.e1Pct.toFixed(1) + '% in the window, capacity +' + tr.ratePctWk + '%/wk'); }
    else if (c.reps >= 3 && c.steps >= 0) { codes.push('P_REPS'); notes.push(read.call + ': reps at the top load up ' + c.reps + ' in the window'); }
  }
  if (read.call === 'none' && tr.plateauWeeks >= 6 && tr.exposures8w >= 6 && ['thin', 'recent', 'progressing', 'rising'].includes(read.because)) {
    codes.push('P_MISS'); notes.push(read.because);
  }
  return { codes, notes };
}
