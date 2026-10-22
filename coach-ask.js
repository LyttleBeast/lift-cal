// Coach's questions, and what it learned by asking them.
//
// "Coach can read the numbers but it can't read you unless it asks questions"
// (Micah, 21 Oct 2026). The engine reads the log; this file is the one place
// it asks, and the one place it keeps an answer the log cannot supply. Three
// things live here (COACH-V2-SPEC.md §3, §4):
//
//   THE FACTS      what he told Coach, each { v, c, at, n } — the value, how
//                  sure (1 answered once, 2 twice the same, 3 three times),
//                  when, and the run of consistent answers (1–9, back to 1
//                  when the answer changes). Scalar facts sit at
//                  settings/coach.know.<key>; per-lift (or per-shape) facts at
//                  settings/coach.knowBy.<key>.<id>. Expiry is a TTL per key
//                  and is never stored: an expired fact keeps its value as a
//                  prior and reads as c: 1. normKnow() is the only reader of
//                  the stored shape and drops junk, never throws.
//   THE CATALOG    every question Coach may ask — the seven that shipped before
//                  v72 (moved here from coach.js, unchanged in meaning; coach.js
//                  QUESTIONS is the `answers` subset of this table) and the two
//                  the recap asks: were those your warm-ups, and did that record
//                  have more in it. A question names the rules its answer
//                  changes (`changes`), and tools-check/coach-registry.mjs
//                  fails one that changes nothing — a survey is not a question.
//   THE ENGINE     pickQuestion(): one question for one moment, scored and
//                  budgeted — two stored answers a day, six a week, counted
//                  from the `asked` stamps alone; debriefPlan(): the recap's
//                  three slots (confirm, feel, question); warmRamp(): the lift
//                  on a finished record whose untagged ramp is worth asking
//                  about.
//
// PURE, and copied into the native tree verbatim (src/pure/coach-ask.js). It
// imports units.js (every weight it prints) and coach-ramp.js (the ramp model)
// and nothing else — not coach.js, which imports IT — so the two one-liners it
// needs from coach.js (daysBetween on noon anchors, rotate) are written here
// again, by hand, and held equal by tools-check/coach-ask.mjs. No clock: `now`
// is always an argument. No reads, no writes: coach-data.js's learn(),
// learnBy(), learnTally() and markAsked() are the writers, and workout.js
// writes the record a "Yes, tag them" retypes.

import { labelW, labelRate, fmtW, wIn } from './units.js';
import { rampOf } from './coach-ramp.js';

const DAY = 864e5;

/* ---------- dates, as coach.js keeps them ----------
   The same five lines as coach.js's dayKey/noon/daysBetween: whole days are
   measured between NOON anchors so a clock change never turns seven days into
   six and three quarters. Copied, not imported — see the header. */
function dayKey(ms) {
  const d = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function noon(ms) { const d = new Date(ms); d.setHours(12, 0, 0, 0); return d.getTime(); }
function daysBetween(fromMs, toMs) { return Math.round((noon(toMs) - noon(fromMs)) / DAY); }
// The ISO week a moment falls in, Monday first, as the key of its Monday.
function weekKey(ms) {
  const d = new Date(noon(ms));
  const back = (d.getDay() + 6) % 7;
  return dayKey(noon(ms) - back * DAY);
}
// coach.js's rotate(): the open counter walked round a list of n.
function rotate(counter, n) {
  if (!n) return 0;
  const c = Number.isFinite(counter) ? Math.floor(counter) : 0;
  return ((c % n) + n) % n;
}
const plural = (n, word) => n + ' ' + word + (Number(n) === 1 ? '' : 's');
// coach-prog.js rirOf(): his rating of a set is an integer 0–5, or unknown.
const rirOf = s => { const v = s && s.rir; return Number.isInteger(v) && v >= 0 && v <= 5 ? v : null; };
// An assisted lift, decided the one way coach-prog.js liftOf() decides it.
const assistedOf = (ex, lib) => String(ex && ex.exId) === 'assisted-pull-up' ||
  /assist/i.test(String((lib && lib[ex.exId] && lib[ex.exId].name) || (ex && ex.name) || ''));

/* ================================================================
   1.  THE FACTS
   ================================================================ */

/* Every fact Coach may hold, and its bounds. `options` or `range` is what `v`
   may be; `ttlDays` is how long an answer stands before it reads as a prior
   (c: 1) — a warm-up habit changes slowly, a reason for being away expires
   with the next session. `by` names the id a keyed fact is stored under.
   Every stored weight is pounds, so `step` is too. */
export const KNOW_KEYS = Object.freeze({
  // scalar facts, settings/coach.know.<key>
  back:     Object.freeze({ options: Object.freeze(['elsewhere', 'off']), ttlDays: 14 }),
  // keyed facts, settings/coach.knowBy.<key>.<id>
  warm:     Object.freeze({ by: 'exId',  options: Object.freeze(['yes', 'no']),            ttlDays: 180 }),
  /* v73: what he said one step up is on a machine, cable or plate lift
     (q_equipment_step), in stored pounds on the two-decimal grid. Read by
     coach-prog.js stepOf() only where the log has no jump seen twice — THE LOG
     WINS, and a told step the log later contradicts is inert without a write
     on paint (the house rule); it is replaced the next time the question is
     answered on that lift, whose gate reopens whenever the step in use is not
     the log's own. */
  step:     Object.freeze({ by: 'exId',  range: Object.freeze([0.5, 100000]),              ttlDays: 365 }),
  hold:     Object.freeze({ by: 'exId',  options: Object.freeze(['hold', 'light', 'day']), ttlDays: 42 }),
  wantNext: Object.freeze({ by: 'shape', options: Object.freeze(['same', 'push', 'ease']), ttlDays: 14 })
});
// An id's shape (coach.js MARK_ID's), and a shape key's (group+group).
export const ID_RE = /^[A-Za-z0-9_-]{1,40}$/, SHAPE_RE = /^[a-z]+(\+[a-z]+){0,5}$/;
// A fact key's or a tally key's shape — the native rules' $k.
const KEY_RE = /^[a-z][A-Za-z0-9]{0,23}$/;
const MAX_C = 3, MAX_N = 9, MAX_IDS = 60, MAX_TALLY = 999;

const idOk = (spec, id) => (spec.by === 'shape' ? SHAPE_RE.test(id) && id.length <= 40 : ID_RE.test(id));
// v73: a ranged fact is a stored weight (`step`, pounds), so it is any number
// on the two-decimal grid every stored weight sits on — a 2.5-lb step, or a
// kilo account's 1 kg stored as 2.2 — not an integer, which v72's bounds said.
const valueOk = (spec, v) => (spec.options ? spec.options.includes(v)
  : Number.isFinite(v) && Math.round(v * 100) / 100 === v && v >= spec.range[0] && v <= spec.range[1]);

// One stored fact, read: { v, c, at, n } or null for anything off the shape.
function normFact(spec, raw) {
  if (!spec || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!valueOk(spec, raw.v)) return null;
  if (!Number.isInteger(raw.c) || raw.c < 1 || raw.c > MAX_C) return null;
  if (!Number.isInteger(raw.n) || raw.n < 1 || raw.n > MAX_N) return null;
  if (!Number.isFinite(raw.at) || raw.at <= 0) return null;
  return { v: raw.v, c: raw.c, at: raw.at, n: raw.n };
}

/* The stored shape, read: { know, knowBy, tally }, each {} when nothing
   survives (normSettings() adds a key only when something does). Junk is
   dropped, never thrown: a value off its options, a confidence of 7, an id
   with a slash, a tally that is not a count. More than MAX_IDS ids under one
   keyed fact: the oldest `at` go. */
export function normKnow(raw) {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const know = {};
  const rawK = o.know && typeof o.know === 'object' && !Array.isArray(o.know) ? o.know : {};
  Object.keys(rawK).forEach(k => {
    const spec = KNOW_KEYS[k];
    if (!spec || spec.by || !KEY_RE.test(k)) return;
    const f = normFact(spec, rawK[k]);
    if (f) know[k] = f;
  });
  const knowBy = {};
  const rawB = o.knowBy && typeof o.knowBy === 'object' && !Array.isArray(o.knowBy) ? o.knowBy : {};
  Object.keys(rawB).forEach(k => {
    const spec = KNOW_KEYS[k];
    if (!spec || !spec.by || !KEY_RE.test(k)) return;
    const byId = rawB[k];
    if (!byId || typeof byId !== 'object' || Array.isArray(byId)) return;
    const kept = [];
    Object.keys(byId).forEach(id => {
      if (!idOk(spec, id)) return;
      const f = normFact(spec, byId[id]);
      if (f) kept.push([id, f]);
    });
    if (!kept.length) return;
    // Over the cap, the oldest `at` go; what stays keeps its stored order.
    const keep = new Set(kept.slice().sort((a, b) => b[1].at - a[1].at || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).slice(0, MAX_IDS).map(x => x[0]));
    knowBy[k] = Object.fromEntries(kept.filter(x => keep.has(x[0])));
  });
  const tally = {};
  const rawT = o.tally && typeof o.tally === 'object' && !Array.isArray(o.tally) ? o.tally : {};
  Object.keys(rawT).forEach(k => {
    const v = rawT[k];
    if (KEY_RE.test(k) && Number.isInteger(v) && v >= 0 && v <= MAX_TALLY) tally[k] = v;
  });
  return { know, knowBy, tally };
}

/* THE ONE READ PATH. A fact as the engine reads it: { v, c, n, at, expired },
   or null. `id` is ignored for a scalar key. Past its TTL a fact keeps its
   value as a prior and reads as c: 1. The settings handed in may be raw or
   normalised — the fact is read through normFact() either way. */
export function knowOf(settings, key, id, now) {
  const spec = KNOW_KEYS[key];
  if (!spec || !settings || typeof settings !== 'object') return null;
  let raw;
  if (spec.by) {
    if (typeof id !== 'string' || !idOk(spec, id)) return null;
    raw = settings.knowBy && settings.knowBy[key] ? settings.knowBy[key][id] : null;
  } else {
    raw = settings.know ? settings.know[key] : null;
  }
  const f = normFact(spec, raw);
  if (!f) return null;
  const expired = Number.isFinite(now) ? daysBetween(f.at, now) > spec.ttlDays : false;
  return { v: f.v, c: expired ? 1 : f.c, n: f.n, at: f.at, expired };
}

/* The fact after one more answer: the same value climbs the ladder (n up to
   9, c = min(3, n)); a different one starts over at 1. `prev` may be null or
   anything normFact() would drop. */
export function nextFact(prev, v, now) {
  const p = prev && typeof prev === 'object' && prev.v === v && Number.isInteger(prev.n) && prev.n >= 1 ? prev : null;
  const n = p ? Math.min(MAX_N, p.n + 1) : 1;
  return { v, c: Math.min(MAX_C, n), at: now, n };
}

/* How he logs warm-ups, account-wide, derived from his per-lift answers and
   never stored: three lifts "yes" and none "no" → 'ramp' (the recap's row
   becomes one tap); three "no" and none "yes" → 'none' (no detection asked
   about at all); anything else he has said → 'mixed'; nothing said → null. */
export function warmStyle(settings) {
  const by = settings && settings.knowBy && settings.knowBy.warm;
  let yes = 0, no = 0;
  Object.keys(by && typeof by === 'object' ? by : {}).forEach(id => {
    const f = normFact(KNOW_KEYS.warm, by[id]);
    if (!f) return;
    if (f.v === 'yes') yes++; else if (f.v === 'no') no++;
  });
  if (!yes && !no) return null;
  if (yes >= 3 && !no) return 'ramp';
  if (no >= 3 && !yes) return 'none';
  return 'mixed';
}

/* His answer about warm-ups on one lift, as the ramp model takes it — 'yes',
   'no', or null when he has not said or the answer has expired. */
export function warmAnswer(settings, exId, now) {
  const k = knowOf(settings, 'warm', exId, now);
  return k && !k.expired ? k.v : null;
}

/* ================================================================
   2.  THE BUDGET
   ================================================================
   Two stored answers a day, six a week, counted from the `asked` stamps of the
   D-questions alone — no counter, no write on open. A confirmation (C) is
   logging and is never counted, nor is the bad-day mark (coach.js MARK_ASK). */
export const DAY_BUDGET = 2, WEEK_BUDGET = 6;

// The stamps one question owns: its id, and its per-item stamps ('q_pr_how:<recordId>',
// one per record it was asked on) — so a question asked on three records in a
// week counts three times, not once.
const stampsOf = (asked, q) => Object.keys(asked).filter(k => (k === q.id || k.startsWith(q.id + ':')) && Number.isFinite(asked[k])).map(k => asked[k]);
export function budgetOf(settings, now) {
  const asked = (settings && settings.asked) || {};
  const today = dayKey(now), week = weekKey(now);
  let day = 0, wk = 0;
  ASK_QUESTIONS.forEach(q => {
    if (q.budget !== 'D') return;
    stampsOf(asked, q).forEach(at => {
      if (dayKey(at) === today) day++;
      if (weekKey(at) === week) wk++;
    });
  });
  return { dayLeft: Math.max(0, DAY_BUDGET - day), weekLeft: Math.max(0, WEEK_BUDGET - wk) };
}

/* ================================================================
   3.  THE CATALOG
   ================================================================
   Each row: { id, moments, text, options, writes, key?, changes, cooldownDays,
   budget, ack } plus, for the seven that shipped before v72, the fields their
   readers kept: `fact`, `when`, `stale`, `always`, `settings`, `where`.

     moments    where it may be asked: 'open' (the sheet's opener),
                'under:<where>' (under the answer it refines), 'debrief' (the
                recap), 'live' (mid-session; none yet). moments[0] is its
                first-choice moment and its lane for "one at a time".
     writes     'answers' (settings/coach.answers, the shipped way), 'know',
                'knowBy' (a fact above), or 'record' (the session record itself,
                through workout.js).
     changes    the registered rules the answer moves — never empty.
     budget     'D' counts against the day and week; 'C' is a confirmation and
                does not.
     when(d, ctx)  the gate, on the fact store and the moment's context.
     text(d, u, ctx) or a string.
     stampOf(ctx)  the `asked` key when it is not the id (per lift). */

const CHECK_OPTIONS = Object.freeze([
  Object.freeze({ value: 'update', label: 'Yes, update my goal' }),
  Object.freeze({ value: 'temp',   label: 'No, it’s temporary' }),
  Object.freeze({ value: 'keep',   label: 'It’s on purpose' })
]);
// Temporary (and "update", which reads like it afterwards) goes quiet for four
// weeks from the moment it was asked; "on purpose" stays quiet until setAim()
// clears it.
const CHECK_QUIET_DAYS = 28;
// Behaviour needs time to follow a new goal.
const CHECK_AIM_DAYS = 14;
function checkStale(answer, askedAt, d) {
  if (answer === 'keep') return false;
  return !Number.isFinite(askedAt) || daysBetween(askedAt, d.now) >= CHECK_QUIET_DAYS;
}
function goalCheckOpen(d) {
  if (d.f('meta.tierPro') !== true || d.f('coach.aim') == null) return false;
  const at = ((d.input.settings && d.input.settings.asked) || {}).q_goal_aim;
  return !Number.isFinite(at) || daysBetween(at, d.now) >= CHECK_AIM_DAYS;
}
// An aim as the question offers it: "Build muscle", "Lose fat, keep strength".
export function aimLabel(aim) {
  const q = ASK_QUESTIONS.find(x => x.id === 'q_goal_aim');
  const o = q && q.options.find(x => x.value === aim);
  return o ? o.label : 'a goal';
}
// The warm-up confirmation's cooldown per lift, and the stamp it is kept under.
export const WARM_ASK_DAYS = 28;
export const warmStamp = exId => 'warm:' + exId;

/* The probable loads, said: up to three — "45, 135 and 225 lb"; more than
   three as a span — "45 to 315 lb (6 sets)". Every one through units.js. */
export function rampLoadsText(loads, u) {
  const lb = (Array.isArray(loads) ? loads : []).map(w => parseFloat(w)).filter(Number.isFinite);
  if (!lb.length) return '';
  if (lb.length === 1) return labelW(lb[0], u);
  const sorted = lb.slice().sort((a, b) => a - b);
  if (lb.length === 2) return fmtW(sorted[0], u) + ' and ' + labelW(sorted[1], u);
  if (lb.length === 3) return fmtW(sorted[0], u) + ', ' + fmtW(sorted[1], u) + ' and ' + labelW(sorted[2], u);
  return fmtW(sorted[0], u) + ' to ' + labelW(sorted[sorted.length - 1], u) + ' (' + plural(lb.length, 'set') + ')';
}

/* ---------- v73: the step question's gate, in one place ----------
   stepAskLift(lifts, settings, now, u) -> the lift to ask about, or null.

     lifts   the moment's candidates, in the order they stand on screen: the
             lift in hand (live) or today's plan (under the targets), each
             { exId, name, equipment, exposures (a count), step ({ source } or
             null — coach-prog.js's, from the target or the baselines) }

   One is asked about when it is loaded from a stack or a rack Coach cannot
   guess the step of — a machine, a cable, a plate-loaded lift, or a dumbbell
   on a kilo account (defaultStep() has no kilo dumbbell) — with three or more
   exposures, when the step in use is not the log's own (`source !== 'yours'`:
   the log wins and then there is nothing to ask), when he has not told Coach
   inside the fact's TTL, and not inside its 28-day stamp. The first that
   passes is the one; the catalog's `when` reads `ctx.step`. */
export const STEP_ASK_MIN_EXPOSURES = 3;
export const STEP_ASK_DAYS = 28;
export const STEP_EQUIPMENT = Object.freeze(['machine', 'cable', 'plate']);
export const stepStamp = exId => 'q_equipment_step:' + exId;
export function stepAskLift(lifts, settings, now, u) {
  const asked = (settings && settings.asked) || {};
  for (const l of Array.isArray(lifts) ? lifts : []) {
    if (!l || typeof l.exId !== 'string' || !ID_RE.test(l.exId)) continue;
    const eq = l.equipment;
    if (!(STEP_EQUIPMENT.includes(eq) || (u === 'kg' && eq === 'dumbbell'))) continue;
    if (!(Number(l.exposures) >= STEP_ASK_MIN_EXPOSURES)) continue;
    if (l.step && l.step.source === 'yours') continue;
    const told = knowOf(settings, 'step', l.exId, now);
    if (told && !told.expired) continue;
    const at = asked[stepStamp(l.exId)];
    if (Number.isFinite(at) && Number.isFinite(now) && daysBetween(at, now) < STEP_ASK_DAYS) continue;
    return { exId: l.exId, name: String(l.name || l.exId), equipment: eq };
  }
  return null;
}
/* Its chips, in the display unit: the common stack and plate steps, each
   value the POUNDS stored — a kilo chip's through wIn(), never a typed
   constant — and its label through labelW(). *Not sure* stores nothing. */
const STEP_CHOICES = Object.freeze({ lb: Object.freeze([2.5, 5, 10, 15]), kg: Object.freeze([1, 2.5, 5]) });
export function stepOptions(u) {
  const unit = u === 'kg' ? 'kg' : 'lb';
  return STEP_CHOICES[unit].map(v => { const lb = wIn(v, unit); return { value: lb, label: labelW(lb, unit) }; })
    .concat([{ value: null, label: 'Not sure', ack: null }]);
}

export const ASK_QUESTIONS = Object.freeze([
  /* ---------- the seven that shipped before v72, unchanged in meaning ---------- */
  {
    id: 'q_goal_direction',
    moments: Object.freeze(['open']),
    text: 'Which way are you trying to go right now?',
    options: Object.freeze([
      { value: 'down', label: 'Down' },
      { value: 'hold', label: 'Holding' },
      { value: 'up',   label: 'Up' }
    ]),
    // Two rules now, not one: the stall readout reads differently through a
    // deficit, and a question that unlocks something has to say everything it
    // unlocks or the list stops being true.
    changes: Object.freeze(['weight_rate_vs_goal', 'stalled_lift']),
    writes: 'answers', cooldownDays: 7, budget: 'D',
    fact: 'weight.goalDir',
    ack: 'Noted. That changes how I read your weight.',
    // Only worth asking when the answer would really unlock something: there is
    // a rate to read and no direction to read it against.
    when: d => d.f('weight.rateWk') != null && d.f('weight.goalDir') == null
  },
  {
    id: 'q_goal_aim',
    moments: Object.freeze(['under:targets']),
    text: 'What are you training for right now?',
    options: Object.freeze([
      { value: 'strength',     label: 'Get stronger' },
      { value: 'powerlifting', label: 'Powerlifting' },
      { value: 'muscle',       label: 'Build muscle' },
      { value: 'cut',          label: 'Lose fat, keep strength' },
      { value: 'recomp',       label: 'Recomp' },
      { value: 'maintain',     label: 'Stay consistent' }
    ]),
    changes: Object.freeze(['lift_targets']),
    writes: 'answers', cooldownDays: 7, budget: 'D',
    fact: 'coach.aim',
    always: true,
    where: 'targets',
    ack: 'Noted. I’ll set your targets with that in mind.',
    when: d => d.f('coach.aim') == null
  },
  {
    id: 'q_experience',
    moments: Object.freeze(['under:targets']),
    text: 'How long have you been lifting consistently?',
    // Spelled out: every figure in this file's copy is computed from the log,
    // and tools-check/coach-units.mjs refuses a typed one.
    options: Object.freeze([
      { value: 'new',   label: 'Under six months' },
      { value: 'some',  label: 'Six months to two years' },
      { value: 'years', label: 'Two years or more' }
    ]),
    changes: Object.freeze(['lift_targets']),
    writes: 'answers', cooldownDays: 7, budget: 'D',
    fact: 'coach.experience',
    always: true,
    where: 'targets',
    ack: 'Noted. That sets how big a jump I’ll suggest.',
    when: d => d.f('coach.aim') != null && d.f('coach.experience') == null
  },
  /* v49. The focus group: asked under "How am I tracking toward my goal?"
     (where: 'goal'), never as the opener, and shown in Settings → Your goal
     like the aim. It changes what goal pace reads, and (v54, stage five) the
     weekly volume answer — its range up 30%, its line first — and the
     builder, where its exercises come first. */
  {
    id: 'q_focus_group',
    moments: Object.freeze(['under:goal']),
    text: 'Is there one muscle group you most want to bring up?',
    options: Object.freeze([
      { value: 'chest',     label: 'Chest' },
      { value: 'back',      label: 'Back' },
      { value: 'legs',      label: 'Legs' },
      { value: 'shoulders', label: 'Shoulders' },
      { value: 'arms',      label: 'Arms' },
      { value: 'core',      label: 'Core' },
      { value: 'none',      label: 'No focus' }
    ]),
    changes: Object.freeze(['goal_pace', 'week_volume', 'build_workout']),
    writes: 'answers', cooldownDays: 7, budget: 'D',
    fact: 'coach.focus',
    always: true,
    where: 'goal',
    ack: 'Noted. I’ll read that group’s sets and lifts when you ask how you’re tracking.',
    when: d => d.f('coach.aim') != null && d.f('coach.focus') == null
  },
  /* v49. "DID YOUR GOAL CHANGE?" — two questions, asked as the sheet's opener
     through the shipped machinery, each a question and never a verdict. Pro
     only: "Yes" opens Your goal, which is Pro only, and the opener is drawn
     before the Pro gate for Basic, so the tier is checked in `when`. Both need
     three weeks of weigh-ins (coach-goal.js's goalChecks()) and fourteen days
     since the aim was set: behaviour needs time to follow a new goal.

       update  opens Your goal, and then reads like temp
       temp    quiet for 28 days from its asked stamp (`stale`)
       keep    quiet until the aim changes — setAim() clears both answers

     `text` is a function here, resolved with his numbers through units.js;
     `settings: false` keeps them out of Settings' answer rows, which would
     otherwise draw them as a three-way switch. */
  {
    id: 'q_goal_check_weight',
    moments: Object.freeze(['open']),
    text: (d, u) => {
      const w = (d.f('coach.goalChecks') || {}).weeks || [];
      const moved = w.length ? w[w.length - 1].to - w[0].from : 0;
      const aim = aimLabel(d.f('coach.aim'));
      const way = moved < 0 ? 'come down' : 'gone up';
      return 'You set ' + aim + ', and your weight has ' + way + ' about ' + labelW(Math.abs(moved), u) +
             ' over the last ' + plural(w.length, 'week') + '. Did the goal change?';
    },
    options: CHECK_OPTIONS,
    changes: Object.freeze(['goal_pace']),
    writes: 'answers', cooldownDays: 7, budget: 'D',
    fact: 'coach.goalCheckWeight',
    settings: false,
    ack: 'Noted. I won’t ask about that again for a while.',
    stale: (answer, askedAt, d) => checkStale(answer, askedAt, d),
    when: d => goalCheckOpen(d) && (d.f('coach.goalChecks') || {}).weight === true
  },
  {
    id: 'q_goal_check_targets',
    moments: Object.freeze(['open']),
    text: (d, u) => {
      const g = d.f('weight.goalRateWk');
      return 'You set ' + aimLabel(d.f('coach.aim')) + ', and your food targets are set to ' +
             (g < 0 ? 'lose' : 'gain') + ' about ' + labelRate(Math.abs(g), u) + ' a week. Did the goal change?';
    },
    options: CHECK_OPTIONS,
    changes: Object.freeze(['goal_pace']),
    writes: 'answers', cooldownDays: 7, budget: 'D',
    fact: 'coach.goalCheckTargets',
    settings: false,
    ack: 'Noted. I won’t ask about that again for a while.',
    stale: (answer, askedAt, d) => checkStale(answer, askedAt, d),
    when: d => goalCheckOpen(d) && (d.f('coach.goalChecks') || {}).targets === true
  },
  /* v52. How he logs food — asked under "Am I fueled?" (where: 'fuel'), once,
     when his entries look batch-logged and he has not said. It is a
     preference, not a daily state, so it is kept; and it is its own fact, so
     the registry can drive it. As I go: the hour's reads come on; Later: the
     day's totals alone. */
  {
    id: 'q_log_timing',
    moments: Object.freeze(['under:fuel']),
    text: 'Do you usually log food as you go, or later in the day?',
    options: Object.freeze([
      { value: 'live',  label: 'As I go' },
      { value: 'later', label: 'Later' }
    ]),
    changes: Object.freeze(['fuel_fueled']),
    writes: 'answers', cooldownDays: 7, budget: 'D',
    fact: 'coach.logTiming',
    where: 'fuel',
    ack: 'Noted. I read your food by the hour when you log as you go, and by the day when you log later.',
    when: d => { const r = d.f('fuel.read'); return !!r && !!r.a && r.a.detected === 'batch' && d.f('coach.logTiming') == null; }
  },

  /* ---------- v72: the recap's two ---------- */
  /* THE WARM-UP CONFIRMATION. The ramp model (coach-ramp.js) can see a
     probable untagged ramp on a finished record; only he can say it was one.
     Yes retypes those sets W on the record (workout.js retagWarmups) and
     writes knowBy.warm.<exId> = yes; No writes knowBy.warm.<exId> = no, which
     switches detection off for that lift (rampOf `warm: 'no'`); Not now
     stamps `asked` only. Asked once in 28 days per lift, never counted
     against the day: it is logging. `ctx.ramp` is warmRamp()'s row. */
  {
    id: 'q_warm_confirm',
    moments: Object.freeze(['debrief']),
    text: (d, u, ctx) => (ctx && ctx.ramp
      ? 'Were ' + rampLoadsText(ctx.ramp.loads, u) + ' your warm-ups on ' + ctx.ramp.name + '?' : ''),
    options: Object.freeze([
      { value: 'yes',  label: 'Yes, tag them',    ack: 'Tagged. They won’t count as working sets.' },
      { value: 'no',   label: 'No, working sets', ack: 'Noted. I’ll read them as work on this lift.' },
      { value: null,   label: 'Not now',          ack: null }
    ]),
    writes: 'record', key: 'warm',
    // The three readers of the split a retag moves: the targets (coach-prog.js
    // readExposure), the week's hard sets (coach-volume.js) and the live read.
    changes: Object.freeze(['lift_targets', 'week_volume', 'live_read']),
    cooldownDays: WARM_ASK_DAYS, budget: 'C',
    stampOf: ctx => (ctx && ctx.ramp ? warmStamp(ctx.ramp.exId) : 'q_warm_confirm'),
    ack: 'Tagged. They won’t count as working sets.',
    when: (d, ctx) => !!(ctx && ctx.ramp)
  },
  /* THE RECORD'S EFFORT. A new best this session whose set he has not rated:
     one tap stores `rir` on that set (4 / 2 / 0, the live sheet's three), the
     same whole-record write as the tags, and the shipped rir rules read it —
     the next target from how hard the record was. Once per record; the gate
     is the record itself, so no cooldown. `ctx.pr` is prSetOf()'s row. */
  {
    id: 'q_pr_how',
    moments: Object.freeze(['debrief']),
    text: (d, u, ctx) => (ctx && ctx.pr ? 'New best on ' + ctx.pr.name + '. Did it feel like there was more in it?' : ''),
    options: Object.freeze([
      { value: 4, label: 'Plenty left' },
      { value: 2, label: 'Just about' },
      { value: 0, label: 'That was everything' }
    ]),
    writes: 'record', key: 'rir',
    changes: Object.freeze(['lift_targets']),
    cooldownDays: 0, budget: 'D',
    // Stamped per record, so the budget counts every record it was asked on.
    stampOf: ctx => (ctx && ctx.pr && ctx.pr.recId ? 'q_pr_how:' + ctx.pr.recId : 'q_pr_how'),
    ack: 'Noted. I’ll read the next target from that.',
    when: (d, ctx) => !!(ctx && ctx.pr)
  },

  /* ---------- v73: in the gym ---------- */
  /* THE STEP ON A STACK. Machines, cables and plate-loaded lifts have no
     default step (coach-prog.js defaultStep: "vary too much to guess"), so
     until the log shows one twice their target reads "the next setting up" and
     the live sheet names no heavier set. He can read the step off the machine
     in one glance. Asked in the live sheet about the lift in hand, or under
     "What should I lift today?" about a lift on the plan (stepAskLift, above);
     the answer is knowBy.step.<exId> in pounds, which stepOf() uses only until
     the log learns another. `options` is the pound row — the catalog's shape;
     the sheet draws optionsFor(u), the same values in his unit. */
  {
    id: 'q_equipment_step',
    moments: Object.freeze(['live', 'under:targets']),
    text: (d, u, ctx) => (ctx && ctx.step ? 'On ' + ctx.step.name + ', what’s one step up?' : ''),
    options: Object.freeze(stepOptions('lb')),
    optionsFor: u => stepOptions(u),
    writes: 'knowBy', key: 'step',
    // The two readers of a step: the targets (coach-prog.js stepOf) and the
    // live sheet's heavier chip (nextSet's `up`).
    changes: Object.freeze(['lift_targets', 'live_read']),
    cooldownDays: STEP_ASK_DAYS, budget: 'D',
    stampOf: ctx => (ctx && ctx.step ? stepStamp(ctx.step.exId) : 'q_equipment_step'),
    ack: 'Noted. I’ll use that as the step here until your log shows me another.',
    when: (d, ctx) => !!(ctx && ctx.step)
  }
]);

const BY_ID = Object.freeze(Object.fromEntries(ASK_QUESTIONS.map(q => [q.id, q])));
export const askQuestion = id => BY_ID[id] || null;

/* ================================================================
   4.  THE ENGINE
   ================================================================ */

// How long an asked-and-unanswered question counts as a repeat against itself.
const REPEAT_DAYS = 28;

// An answered question whose answer has gone stale counts as unanswered.
function isStale(q, answer, askedAt, d) {
  if (typeof q.stale !== 'function') return false;
  try { return !!q.stale(answer, askedAt, d); } catch { return false; }
}
const answered = (q, settings, d) => {
  if (q.writes !== 'answers') return false;
  const a = ((settings && settings.answers) || {})[q.id];
  if (a == null) return false;
  return !isStale(q, a, ((settings && settings.asked) || {})[q.id], d);
};

/* One question for one moment, or null.

     d         coach.js's fact store (d.f(), d.now, d.input)
     moment    'open' | 'debrief' | 'live' | 'under:<where>'
     settings  settings/coach, normalised or raw
     now       the clock
     opens     the device's open counter — the tie-breaker
     ctx       the moment's context: { ramp, pr, prs } on the recap

   A candidate is a row whose moments hold this one, not muted, with budget
   room (D rows), outside its cooldown (its own `asked` stamp, or the per-lift
   one), unanswered (or stale), and whose gate passes. Scored:
     value      min(3, changes.length)
     urgency    3 on the recap or mid-session, 1 elsewhere
     staleness  2 when the fact it would write has expired, 1 when c is 1
     momentFit  2 when this is its first-choice moment, 1 otherwise
   less
     repeat     1 when it was asked and not answered inside 28 days
     fatigue    2 when a D-question was asked today, 1 when yesterday
   Highest wins; ties go round on the open counter. */
export function pickQuestion(d, moment, settings, now, opens, ctx) {
  const s = settings && typeof settings === 'object' ? settings : {};
  if (s.mute && s.mute.questions === true) return null;
  if (typeof moment !== 'string' || !moment) return null;
  // After a bad-day mark on a session today, one bad-day line and nothing
  // else (03 §1.2): no question in any lane for the rest of the day.
  const today = dayKey(now);
  if (Object.values(s.marks && typeof s.marks === 'object' ? s.marks : {}).some(m => m && m.d === today)) return null;
  const asked = s.asked || {};
  const budget = budgetOf(s, now);
  const stampDays = at => (Number.isFinite(at) ? daysBetween(at, now) : null);
  // Fatigue: the most recent D-question stamp, today or yesterday.
  let fatigue = 0;
  ASK_QUESTIONS.forEach(q => {
    if (q.budget !== 'D') return;
    stampsOf(asked, q).forEach(at => {
      const ago = stampDays(at);
      if (ago === 0) fatigue = Math.max(fatigue, 2);
      else if (ago === 1) fatigue = Math.max(fatigue, 1);
    });
  });
  const scored = [];
  ASK_QUESTIONS.forEach(q => {
    if (!q.moments.includes(moment)) return;
    if (q.budget === 'D' && (budget.dayLeft <= 0 || budget.weekLeft <= 0)) return;
    const stamp = typeof q.stampOf === 'function' ? q.stampOf(ctx) : q.id;
    const ago = stampDays(asked[stamp]);
    if (q.cooldownDays > 0 && ago != null && ago < q.cooldownDays) return;
    if (answered(q, s, d)) return;
    let ok = false;
    try { ok = !!q.when(d, ctx); } catch { ok = false; }
    if (!ok) return;
    let staleness = 0;
    if (q.writes === 'know' || q.writes === 'knowBy') {
      const f = knowOf(s, q.key, ctx && ctx.id, now);
      staleness = f ? (f.expired ? 2 : f.c === 1 ? 1 : 0) : 0;
    } else if (q.writes === 'answers') {
      const a = (s.answers || {})[q.id];
      staleness = a != null && isStale(q, a, asked[q.id], d) ? 2 : 0;
    }
    const repeat = q.writes === 'answers' && ago != null && ago < REPEAT_DAYS && (s.answers || {})[q.id] == null ? 1 : 0;
    const score = Math.min(3, q.changes.length) + (moment === 'debrief' || moment === 'live' ? 3 : 1) +
                  staleness + (q.moments[0] === moment ? 2 : 1) - repeat - fatigue;
    scored.push({ q, score });
  });
  if (!scored.length) return null;
  const top = Math.max(...scored.map(x => x.score));
  const ties = scored.filter(x => x.score === top).map(x => x.q);
  return ties[rotate(opens, ties.length)];
}

/* The lift on a finished record worth asking "were those your warm-ups?"
   about, as [{ exIdx, exId, name, idx, loads }] — one entry at most, the
   exercise with the most probable warm-ups (ties by position) — or [].

   Over the RAW exercises, never merged: `exIdx` has to map back to the stored
   row the retag rewrites, so a duplicated block is two entries and each is
   read alone. A lift he said he logs no warm-ups on (knowBy.warm no, unexpired)
   is never read as a ramp — rampOf's own rule; one asked about inside
   WARM_ASK_DAYS is skipped. `lib` is the merged library, for the name. */
export function warmRamp(record, settings, now, lib) {
  const rows = record && Array.isArray(record.exercises) ? record.exercises : [];
  const asked = (settings && settings.asked) || {};
  const out = [];
  rows.forEach((ex, exIdx) => {
    if (!ex || !ex.exId || !Array.isArray(ex.sets)) return;
    const id = String(ex.exId);
    const at = asked[warmStamp(id)];
    if (Number.isFinite(at) && Number.isFinite(now) && daysBetween(at, now) < WARM_ASK_DAYS) return;
    const r = rampOf(ex.sets, { assisted: assistedOf(ex, lib), warm: warmAnswer(settings, id, now) });
    if (!r.probable) return;
    const idx = [];
    ex.sets.forEach((s, j) => { if (r.warmIdx.has(j) && s && s.type !== 'W') idx.push(j); });
    if (!idx.length) return;
    out.push({ exIdx, exId: id, name: String((lib && lib[id] && lib[id].name) || ex.name || id),
               idx, loads: idx.map(j => String(ex.sets[j].w == null ? '' : ex.sets[j].w)) });
  });
  if (!out.length) return [];
  out.sort((a, b) => b.idx.length - a.idx.length || a.exIdx - b.exIdx);
  return [out[0]];
}

/* The record set "did it have more in it?" would rate: the first record this
   session that carries a weight (an estimated max, or the heaviest ever), as
   { exIdx, setIdx, exId, name } in the RAW record, or null when its set is
   rated already or cannot be found. detectPRs() hands the e1RM record its set
   by reference; a weight record's is the heaviest working set of the lift. */
export function prSetOf(record, prs) {
  const rows = record && Array.isArray(record.exercises) ? record.exercises : [];
  const list = (Array.isArray(prs) ? prs : []).filter(p => p && (p.kind === 'e1rm' || p.kind === 'weight'));
  for (const p of list) {
    let hit = null;
    rows.forEach((ex, exIdx) => {
      if (hit || !ex || ex.exId !== p.exId || !Array.isArray(ex.sets)) return;
      if (p.kind === 'e1rm' && p.set) {
        const j = ex.sets.indexOf(p.set);
        if (j >= 0) hit = { exIdx, setIdx: j };
        return;
      }
      let best = -1, bw = -Infinity;
      ex.sets.forEach((s, j) => {
        if (!s || s.type === 'W') return;
        const w = parseFloat(s.w) || 0;
        if (w > bw) { bw = w; best = j; }
      });
      if (best >= 0 && Math.abs(bw - (parseFloat(p.value) || 0)) < 0.011) hit = { exIdx, setIdx: best };
    });
    if (!hit) continue;
    const set = rows[hit.exIdx].sets[hit.setIdx];
    if (rirOf(set) != null) return null;     // rated already: nothing to ask
    const recId = record.id != null && ID_RE.test(String(record.id)) ? String(record.id) : null;
    return { ...hit, exId: p.exId, name: String(p.name || p.exId), recId };
  }
  return null;
}

/* THE RECAP'S THREE SLOTS (COACH-V2-SPEC §4): { confirm, feel, question }.

     d         the fact store with the record among its sessions
     record    the session just saved
     settings  settings/coach
     now, opens
     ctx       { prs, harder, marked, u } — the records workout.js worked out
               for this session, feelHarder(record.feel), whether the session
               is marked, and the display unit

   confirm   warmRamp()'s row, or null; null account-wide when warmStyle is
             'none'; with warmStyle 'ramp' it carries oneTap: true (the row is
             one chip, "Tag n warm-ups").
   feel      !mute.feel — the shipped card draws itself.
   question  null on a record under three working sets (after the split) or
             of cardio alone; on the second session of its day; when he rated
             it harder or marked it (the shipped MARK_ASK owns the slot then);
             else pickQuestion(d, 'debrief', …) — q_pr_how only when a record
             was set on this session and its set is unrated. Never
             q_warm_confirm: that is the confirm slot, and the two are never
             both drawn. The question view carries `pr` for the writer. */
export function debriefPlan(d, record, settings, now, opens, ctx) {
  const s = settings && typeof settings === 'object' ? settings : {};
  const c = ctx || {};
  const lib = (d && d.input && d.input.lib) || {};
  const style = warmStyle(s);
  const ramp = style === 'none' ? null : (warmRamp(record, s, now, lib)[0] || null);
  // The confirm slot carries its own words and chips — q_warm_confirm's — so
  // the screen draws what the catalog says and restates nothing.
  const wq = BY_ID.q_warm_confirm;
  let wtext = '';
  if (ramp) { try { wtext = String(wq.text(d, c.u === 'kg' ? 'kg' : 'lb', { ramp }) || ''); } catch { wtext = ''; } }
  const confirm = ramp && wtext ? { ...ramp, text: wtext, options: wq.options, ...(style === 'ramp' ? { oneTap: true } : null) } : null;
  const feel = !(s.mute && s.mute.feel === true);
  const out = { confirm, feel, question: null };
  const rows = record && Array.isArray(record.exercises) ? record.exercises : [];
  const equipOf = ex => (lib[ex.exId] && lib[ex.exId].equipment) || ex.equipment || null;
  let work = 0, lifting = 0;
  rows.forEach(ex => {
    if (!ex || !Array.isArray(ex.sets)) return;
    if (equipOf(ex) === 'cardio') return;
    lifting++;
    work += rampOf(ex.sets, { assisted: assistedOf(ex, lib), warm: warmAnswer(s, String(ex.exId || ''), now) }).workIdx.size;
  });
  if (!lifting || work < 3) return out;
  const date = (record && record._date) || dayKey(record && Number.isFinite(record.startedAt) ? record.startedAt : now);
  const all = d && typeof d.all === 'function' ? d.all() : [];
  if (all.some(sh => sh && sh.session !== record && sh.date === date &&
                     !(record && record.id != null && sh.session && sh.session.id === record.id))) return out;
  if (c.harder || c.marked) return out;
  const pr = prSetOf(record, c.prs);
  const q = pickQuestion(d, 'debrief', s, now, opens, { pr, ramp: null });
  if (!q) return out;
  let text = q.text;
  if (typeof text === 'function') { try { text = String(text(d, c.u === 'kg' ? 'kg' : 'lb', { pr }) || ''); } catch { text = ''; } }
  if (!text) return out;
  out.question = { id: q.id, text, options: q.options, ack: q.ack || null, writes: q.writes,
                   stamp: typeof q.stampOf === 'function' ? q.stampOf({ pr }) : q.id, ...(q.id === 'q_pr_how' ? { pr } : null) };
  return out;
}
