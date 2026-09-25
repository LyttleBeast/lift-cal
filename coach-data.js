// What Coach is allowed to see, and the one file that fetches it.
//
// coach.js is pure and stays that way: it takes a plain object and gives back
// sentences. This is the other half — the impure gatherer that reads the
// database, asks the weight model and the entitlement gate what they think, and
// hands the engine one frozen snapshot. It is WEB-ONLY. The native port rewrites
// this file against its own store and copies coach.js byte for byte; that split
// is the whole reason the two exist separately.
//
// ONE WAVE PER APP OPEN, AND NOTHING PER PAINT. The You tab already issues
// around seven live GETs every time it renders, and Coach sits at the top of it
// — a card that read anything on its own would multiply that by every repaint
// the unawaited loads trigger. So everything lands once, in initCoachData(),
// and coachInput() is synchronous from then on. The seven reads that pass go
// out together rather than one after the other: none of them needs an answer
// from the one before it, and four stacked latencies under the first card on
// the screen measured over three seconds of skeleton on the live site.
//
// WHY IT READS `workouts` ITSELF instead of calling analytics.allSessions().
// allSessions() resolves to [] when the read FAILS — it falls back through
// read(), which folds "the node isn't there" into "the node couldn't be
// reached" — so an unreadable log and a brand-new account are the same answer
// through that path. They are not the same thing to Coach: one means "say
// nothing at all", the other means "say hello and explain what you need".
// readExact() is the only read in store.js that tells them apart, so this reads
// the tree itself and flattens it with the same twelve lines allSessions()
// uses. The cost is one whole-tree GET at boot that duplicates the one You
// already makes, and it is written down in COACH-REPORT.md as the follow-up it
// is. The alternative — inferring reachability from some cheaper node — would
// have shown card_first_run to an account with two hundred sessions the first
// time a GET timed out, which is exactly the wrong number this ship exists to
// refuse.
//
// Imports store.js, tdee.js, insights.js, picker.js, access.js and coach.js.
// Nothing imports back except the two surfaces (coach-ui.js and settings.js).

import { read, readExact, write, wu, LS } from './store.js';
import { EXERCISES } from './exercises.js';
import { allExercises, hiddenIds, libraryReady } from './picker.js';
import { maintenance, effectiveMaint, trendRate, sortedEntries } from './tdee.js';
import { goalDirection } from './insights.js';
import { capabilities } from './access.js';
import { normSettings, isMuted, patternFoodDays, fuelDays, CATEGORIES, finishRead } from './coach.js';

/* ================= STATE =================
   Everything here is set once by initCoachData() and read synchronously
   afterwards. `ready` is not the same as "there is data" — it is "the loads
   have finished", and every surface paints a skeleton until it flips. */
let ready       = false;
let logKnown    = false;       // the workouts read has settled; the rest may not have
let logState    = 'unknown';   // 'readable' | 'empty' | 'unknown' — see coach.js §3.2
let sessions    = [];
let targetsSet  = null;        // true | false | null. null is a read that failed
let targets     = null;
let summaries   = {};
let entries     = {};
let stepDays    = {};
let routines    = [];
let settings    = normSettings(null);
let settingsRead = false;      // false means the node has never been read cleanly
// Patterns only: when each day's first food entry was logged, for the days the
// first pattern asks about. A day read and found empty is null; a day not read
// is absent. See loadPatternFood().
let foodFirst   = {};
// v53: the same reads, each day kept whole as [{ t, cal }] — the three energy
// patterns want every entry's time and calories on a rated session's date.
let foodDays    = {};
// v52: "Am I fueled?" — the food log days loadFuel() has read this app open,
// { date: [{ t, cal, p, c }] | null }, null a day that could not be read; and
// the summary today's was read against, so today is read again only when it
// has moved. See loadFuel().
let foodLog     = {};
let fuelToday   = null;

/* ================= THE ROTATION, AND WHY IT IS ON THE DEVICE =================
   The greeting rotates once per app OPEN, and both halves of that live in
   localStorage rather than in settings/coach.

   `opens` is a counter. It replaces a seed taken off the wall clock, which was
   not a rotation at all — `Date.now()/1000 % n` is a hash of the second
   somebody happened to open the app, and a hash repeats. Three consecutive
   reloads on the live site gave the same greeting AND the same lead question.
   A counter cannot do that.

   `recentGreets` is the last three lines Coach opened with. It used to be one
   id in settings/coach, written asynchronously as the app opened — which is
   exactly the moment the page is most likely to be closed before the write
   lands. A per-device display nicety is not worth a round trip it cannot rely
   on, and getting it wrong costs a repeated greeting rather than a wrong
   number, so the device is the right place for both.

   LS is namespaced by uid (store.js:106), so a shared phone keeps two
   accounts' counters apart without anything here having to think about it.

   Both are read and bumped ONCE, in initCoachData(), before the first await —
   coachInput() is called on every paint and a counter that moved on a paint
   would change the line under the reader's thumb as the loads land. */
const LS_OPENS  = 'coachOpens';
const LS_GREETS = 'coachGreets';
/* v49: the card's earned lines keep the same kind of memory, for the same
   reason, under their own key in the same per-account namespace — a sibling
   of the greeting's, written once per app open. */
const LS_HYPE   = 'coachHype';

let opens        = 0;
let recentGreets = [];
let recentHype   = [];
let rotationRead = false;

function readRotation() {
  if (rotationRead) return;
  rotationRead = true;
  const n = LS.get(LS_OPENS, 0);
  // Wraps well short of anything that loses integer precision, and the engine
  // only ever takes it modulo a small pool — a dozen lines at the outside, and
  // usually just the two or three data-aware ones that passed their gates.
  opens = (Number.isFinite(n) ? Math.floor(n) : 0) + 1;
  if (opens < 0 || opens > 1e9) opens = 0;
  LS.set(LS_OPENS, opens);
  const g = LS.get(LS_GREETS, []);
  recentGreets = Array.isArray(g) ? g.filter(x => typeof x === 'string' && x).slice(0, 3) : [];
  const h = LS.get(LS_HYPE, []);
  recentHype = Array.isArray(h) ? h.map(hypeEntry).filter(Boolean).slice(0, 8) : [];
}

/* v53: an entry of the card's memory, { id, key, at } — the line, the fact
   value it quoted, and when it was shown. A v49 entry was the id alone, and
   reads as { id, key: id, at: 0 }, which the 24-hour rule never matches. */
function hypeEntry(x) {
  if (typeof x === 'string' && x) return { id: x, key: x, at: 0 };
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id) return null;
  return { id: x.id, key: typeof x.key === 'string' && x.key ? x.key : x.id,
           at: Number.isFinite(x.at) && x.at > 0 ? x.at : 0 };
}

export function coachReady() { return ready; }

/* Whether the LOG is known — which is a different and much earlier question
   than whether every node has landed. The card can say something true the
   moment this flips: whether the log is readable at all, whether the account
   is new, and every training finding. Fuel, weight and steps arrive with
   coachReady() a moment later, and until then their rules are silent because
   their facts are null, which is the same silence a thin log gets. */
export function coachLogKnown() { return logKnown; }

/* ================= THE LOAD =================
   Idempotent, and it has to be: You and Train both want the snapshot and both
   repaint when it lands, and two callers each firing their own pass would
   double every read this file makes. The first call does the work and every
   later one gets the same promise back, so `initCoachData().then(render)` is
   the right thing for a tab to write whether or not it is the first tab up. */
let inFlight = null;
let logSettled = null;
let markLogSettled = () => {};

export function initCoachData() {
  if (!inFlight) {
    // Before the first await, so the counter is settled by the time the very
    // first paint asks for a snapshot.
    readRotation();
    logSettled = new Promise(res => { markLogSettled = res; });
    inFlight = load();
  }
  return inFlight;
}

/* The earlier of the two repaints. A tab that only hangs render() off
   initCoachData() never draws at the log phase at all, which makes
   coachLogKnown() a flag nothing reads — You repaints four or five times on
   its own as its loads land and would get there by luck, and Train renders
   once and then only when somebody touches it. Both attach this as well.

   In the ordinary online case the whole-tree read is the last of the seven to
   come home and the two fire in the same tick; this is the tail case, where a
   small node stalls behind it. */
export function coachLogReady() {
  initCoachData();
  return logSettled;
}

/* SEVEN READS, ONE WAVE. This used to be four awaits in a row — the whole
   workouts tree, then food/targets, then settings/coach, then a Promise.all of
   the four small nodes — and none of them needs an answer from the one before
   it. Every read in store.js is a real round trip when the device is online
   (store.js:707, store.js:729), so four in a row is four latencies stacked
   under a card that is the first thing on the screen the app opens to. It was
   measured on the live site at over three seconds of skeleton. They all go out
   together now and the wave costs the slowest one, which is the tree.

   The tree is also why `logKnown` flips separately and earlier than `ready`:
   it is the read that decides whether Coach may say anything at all, and every
   training finding hangs off it, so the card paints the moment it and the
   settings node have landed rather than waiting on food and steps. The rules
   that need those stay silent until they arrive, which is the same silence
   they give a log that is simply too thin — absent, never guessed. */
async function load() {
  // The one read that has to tell absent from unreachable. Everything else can
  // fall back to a default without lying; this one cannot.
  const pLog = readExact('workouts').then(
    tree => { sessions = flatten(tree); logState = sessions.length ? 'readable' : 'empty'; },
    ()   => { sessions = []; logState = 'unknown'; });

  /* food/targets gets the same treatment for the same reason. food.js leaves a
     MODULE DEFAULT of 2,700 kcal in memory when onboarding is skipped
     (food.js:54), so "is there a target" can never be answered by looking at
     the number — only by looking at whether the node exists. And a failed read
     is not an absent node: it is null here, and every fuel rule stays silent
     on null rather than announcing that nobody set any targets. */
  const pTargets = readExact('food/targets').then(
    t  => { targets = t || null;
            targetsSet = !!(t && typeof t === 'object' && Number.isFinite(t.cal) && t.cal > 0); },
    () => { targets = null; targetsSet = null; });

  // Coach's own settings. A failed read leaves the defaults in place AND leaves
  // settingsRead false, which is what the Settings section reads to say out
  // loud that the switches it is showing are defaults rather than stored state.
  // It is in the first wave because a card painted before it landed would be a
  // card showing a category the account has switched off.
  const pSettings = readExact('settings/coach').then(
    v  => { settings = normSettings(v); settingsRead = true; },
    () => { settings = normSettings(null); settingsRead = false; });

  // The rest are mirror-cached and none of them can lie in a way that matters:
  // an absent summaries node and an unreadable one both mean "no food average",
  // and every rule that quotes one has a min-data gate in front of it.
  const pRest = Promise.all([
    read('food/daySummaries', null),
    read('weight/entries',    null),
    read('steps',             null),
    read('routines',          null)
  ]).then(([ds, we, sd, rt]) => {
    summaries = ds || {};
    entries   = we || {};
    stepDays  = sd || {};
    routines  = routineList(rt);
  }, () => {});

  await Promise.all([pLog, pSettings]);
  logKnown = true;
  markLogSettled();

  await Promise.all([pTargets, pRest]);
  ready = true;
  // After the wave, never in it, and only for an account that asked for
  // Patterns: nothing on the card waits on these, and most accounts never
  // pay for them at all.
  if (!isMuted(settings, 'patterns')) loadPatternFood();
  return ready;
}

/* THE ONE READ PATTERNS ADDS, and it is paid only by an account that switched
   Patterns on. The first of the eight asks whether food was logged before a
   session started, and daySummaries has no times in it — so the food log of
   each day that pattern would count is read, and reduced to the moment of its
   first entry. Which days is the pure layer's answer (patternFoodDays), so this
   reads what coach.js asks for and nothing more: the sessions of one lift over
   the pattern window, on days whose summary says food was logged.

   read(), not readExact(): a failed read and an empty day both come back null
   here, and both mean the same thing to the pattern — that day is left out.
   Nothing is guessed from a day that could not be read. Once per app open,
   and not awaited by anything: the pattern is silent until its days land, the
   same silence a thin log gets.

   v53: the pure layer's list also names the rated sessions' dates (forty at
   most), for the three energy patterns, and each day read is kept whole as
   well — `foodDays`, every entry's time and calories — beside `foodFirst`,
   which is computed exactly as it was for the shipped patterns. */
let patternFood = null;
function loadPatternFood() {
  if (patternFood) return patternFood;
  let days = [];
  try { days = patternFoodDays(coachInput({})); } catch { days = []; }
  patternFood = Promise.all(days.map(k => read('food/log/' + k, null).then(v => {
    const es = Object.values(v && typeof v === 'object' ? v : {}).filter(e => e && Number.isFinite(e.t));
    const ts = es.map(e => e.t);
    foodFirst = { ...foodFirst, [k]: ts.length ? Math.min(...ts) : null };
    foodDays = { ...foodDays, [k]: es.map(e => ({ t: e.t, cal: Number(e.cal) || 0 })) };
  }, () => {}))).then(() => true, () => false);
  return patternFood;
}

/* v52: THE READS "AM I FUELED?" ADDS — on an ask, for Pro, with Food on,
   and never at boot or on a paint. Which days is the pure layer's answer
   (coach.js fuelDays(): today, the latest session's date, then the most
   recent complete training dates in the four weeks — fifteen at most), and
   each is read once per app open: a past day's log does not move. Today does,
   so it is read again only when its summary has changed since the read it
   was last read against. At most fifteen reads on the first ask of an open,
   one more after a food change, and none otherwise.

   read(), not readExact(), exactly as loadPatternFood() reads the same
   nodes: a value is the day's entries ([] for an empty day), and a failed
   read is null — a day Coach could not read, which coach-fuel.js leaves out
   of every baseline and never reads as empty. The reads go out together,
   and two asks in flight share one wave, like refreshCoachSessions(). Kept
   apart from loadPatternFood(), whose boot read is Patterns' own. */
function fuelPlan() {
  if (logState !== 'readable' || !hasPro() || isMuted(settings, 'fuel')) return [];
  let days = [];
  try { days = fuelDays(coachInput({})); } catch { days = []; }
  const today = days[0];
  const sumNow = JSON.stringify(summaries[today] || null);
  return days.filter(d => !(d in foodLog) || (d === today && sumNow !== fuelToday));
}
export function fuelNeedsRead() { return fuelPlan().length > 0; }
let fueling = null;
export function loadFuel() {
  if (fueling) return fueling;
  const plan = fuelPlan();
  if (!plan.length) return Promise.resolve(true);
  const today = fuelDays(coachInput({}))[0];
  const sumAt = JSON.stringify(summaries[today] || null);
  fueling = Promise.all(plan.map(d => readFoodDay(d).then(v => { foodLog = { ...foodLog, [d]: v }; })))
    .then(() => { if (plan.includes(today)) fuelToday = sumAt; return true; }, () => false)
    .finally(() => { fueling = null; });
  return fueling;
}
function readFoodDay(d) {
  return read('food/log/' + d, null).then(v => (v && typeof v === 'object'
    ? Object.values(v).filter(e => e && typeof e === 'object')
        .map(e => ({ t: Number(e.t), cal: Number(e.cal) || 0, p: Number(e.p) || 0, c: Number(e.c) || 0 }))
    : null), () => null);
}

// The routines node is keyed by id; Coach wants a list that carries the id.
// One conversion, used by the boot read and by noteCoachData alike, so the two
// cannot hand the engine different shapes of the same node.
function routineList(rt) {
  return rt && typeof rt === 'object' ? Object.entries(rt).map(([id, r]) => ({ id, ...(r || {}) })) : [];
}

/* The same flatten analytics.allSessions() does, and it has to stay the same:
   `_date` is the key every recency derivation in coach.js counts days from, and
   two files disagreeing about which day a session happened on would be the
   worst kind of wrong number. Kept here rather than imported because the whole
   point of this read is that it is NOT allSessions(). */
function flatten(tree) {
  const out = [];
  const t = tree && typeof tree === 'object' ? tree : {};
  for (const mk of Object.keys(t)) {
    const month = t[mk] || {};
    for (const dd of Object.keys(month)) {
      const day = month[dd] || {};
      for (const id of Object.keys(day)) {
        const s = day[id];
        if (!s || !s.startedAt) continue;
        out.push({ ...s, _mk: mk, _dd: dd, _date: mk + '-' + dd });
      }
    }
  }
  out.sort((a, b) => a.startedAt - b.startedAt);
  return out;
}

/* ================= THE SNAPSHOT =================
   Synchronous, and cheap enough to call on every paint: the only work here is
   rebuilding the exercise index, which is a couple of hundred assignments.
   It is rebuilt rather than cached on purpose — picker.js's library moves when
   somebody renames, refiles or hides an exercise, and a Coach sentence naming a
   group the user refiled last week would be quoting a library that no longer
   exists. */
export function coachInput(extra) {
  const e = extra || {};
  const rate = safe(() => trendRate(entries), { rateWk: null, days: null });
  const est  = safe(() => maintenance(entries, summaries), null);
  const maint = safe(() => effectiveMaint(targets, est), null);
  const last = lastWeighIn();

  return {
    now: Date.now(),
    /* The rotation's two inputs. `opens` replaces the openMs timestamp the
       engine used to be seeded on — a timestamp is a hash, not a rotation, and
       nothing passes one in any more. */
    opens,
    recentGreets,
    recentHype,
    u: wu(),
    log: logKnown ? logState : 'unknown',
    sessions,
    lib: libIndex(),
    routines,
    live: { active: !!e.live },
    /* The builder's two extra questions of the library: what has been taken
       out of the picker, and whether the picker has read anything yet. Asked
       of picker.js's memory, never of the database — no read per paint. */
    hidden: safe(() => hiddenIds(), []),
    libReady: safe(() => libraryReady(), false) === true,
    tier: { pro: hasPro() },
    targets,
    targetsSet,
    summaries,
    steps: { days: stepDays },
    // Patterns' two extra inputs: every weigh-in, for the weekly rate (the
    // snapshot below carries only the latest), and foodFirst, above.
    weighIns: safe(() => sortedEntries(entries).map(e => ({ lb: e.lb, t: e.t })), []),
    foodFirst,
    // v53: the same days, whole, for the three energy patterns.
    foodDays,
    // v52: the food log days loadFuel() has read, and only those.
    foodLog,
    weight: {
      latestLb: last ? last.lb : null,
      latestAt: last ? last.t : null,
      rateWk:   Number.isFinite(rate.rateWk) ? rate.rateWk : null,
      // v49: how sure the trend is of that rate, which trendRate() already
      // returns and this used to drop — the goal answer's range is read off it.
      rateSeWk: Number.isFinite(rate.seWk) ? rate.seWk : null,
      rateDays: Number.isFinite(rate.days) ? rate.days : null,
      // The maintenance NUMBER: goalDirection compares it to targets.cal, and
      // handed effectiveMaint's whole object every account without an auto
      // goal read no direction at all (tools-check/coach-boot.mjs F).
      goalDir:  safe(() => goalDirection(targets, maint && maint.cal), null),
      goalRateWk: targets && targets.auto && Number.isFinite(targets.auto.rateWk)
        ? targets.auto.rateWk : null
    },
    settings
  };
}

function safe(fn, fallback) { try { const v = fn(); return v == null ? fallback : v; } catch { return fallback; } }

function lastWeighIn() {
  const list = safe(() => sortedEntries(entries), []);
  const e = list.length ? list[list.length - 1] : null;
  return e && Number.isFinite(e.lb) && Number.isFinite(e.t) ? e : null;
}

/* The merged effective library, reduced to the three fields Coach asks of it.
   picker.js owns the merge — built-ins, the account's customs, its renames and
   refiles, minus anything hidden — and this is the same list the picker itself
   shows. A hidden exercise is therefore NOT in here, and nothing needs it to
   be: coach.js falls back to what the session record stored for an id this
   cannot resolve, so a session that trained a hidden lift still trained that
   group. The name is the builder's: a proposal carries the name the picker
   shows today, the way an exercise added from the picker would.

   The fallback to EXERCISES matters at boot: You starts loading before Train
   does, so allExercises() can legitimately answer with the built-ins alone for
   the first paint or two. Coach reading a library that is missing somebody's
   custom exercises for half a second costs a session's group falling back to
   what the record itself stored, which is what coach.js does with an
   unresolved id anyway.

   v56: and the movement he set on a custom exercise, `pattern` and `angle`,
   carried as stored. coach-tags.js ownMovement() is what reads them, against
   the row's group, and anything it does not recognise is no movement at all —
   so nothing here judges them, and a row without them keeps the shipped
   three fields. */
function libIndex() {
  const list = safe(() => allExercises(), null) || EXERCISES;
  const out = {};
  (list.length ? list : EXERCISES).forEach(x => {
    if (!x || !x.id) return;
    out[x.id] = { name: x.name, group: x.group, equipment: x.equipment,
                  ...(typeof x.pattern === 'string' ? { pattern: x.pattern } : null),
                  ...(typeof x.angle === 'string' ? { angle: x.angle } : null) };
  });
  return out;
}

/* Whether this account has Pro, for the one surface that has to know before
   it draws anything at all: the Coach chip in a live session, which a basic
   account does not get — not a lock, not a teaser. Cheap and synchronous, so
   the session screen can ask on every paint without building a snapshot. */
export function coachPro() { return hasPro(); }

/* Pro, through the one choke point and no other route. access.js caches
   accounts.js's answer for the signed-in account; accounts.js fails open, so a
   record that could not be read is a basic account with the readouts and
   without the comparisons — never a locked-out one. */
function hasPro() {
  try {
    const c = capabilities();
    return !!(c && c.features && c.features.advanced === true);
  } catch {
    return false;
  }
}

/* ================= WRITES =================
   settings/coach and nothing else. The node needs no rules change: `settings`
   carries a section-level .write and the `$other: { ".validate": false }` deny
   is nested inside `units`, not on `settings` itself, so any other child of it
   lands. That is why Coach's state lives here and not at users/{uid}/coach,
   which has no grant at all and would fail silently.

   Every write is read-merge-write, and module state is assigned only AFTER
   write() resolves. Assigning first and writing second is how a refused write
   leaves the app showing a setting the database never took. And it is never
   mergeUpdate(): that swallows every error including PERMISSION_DENIED, which
   is precisely the failure this shape exists to surface. */
// Serialised, so two quick taps in the settings sheet cannot interleave a read
// with the other one's write and lose a toggle. A queue of one is enough: these
// are user-initiated and there are never more than a handful.
let chain = Promise.resolve();
function patch(change) {
  const next = chain.then(() => patchNow(change), () => patchNow(change));
  chain = next.catch(() => {});
  return next;
}

async function patchNow(change) {
  let fresh;
  try { fresh = normSettings(await readExact('settings/coach')); settingsRead = true; }
  catch { return false; }

  const next = normSettings({
    ...fresh,
    ...change,
    mute:    { ...fresh.mute,    ...(change.mute    || {}) },
    on:      { ...fresh.on,      ...(change.on      || {}) },
    answers: { ...fresh.answers, ...(change.answers || {}) },
    asked:   { ...fresh.asked,   ...(change.asked   || {}) },
    // v52: merged like answers — a key set to null is dropped by
    // normSettings() — and every mark past six months pruned on every write,
    // here, where the clock is.
    marks:   { ...(fresh.marks || {}), ...(change.marks || {}), ...staleMarks(fresh.marks) }
  });

  try {
    await write('settings/coach', next);
  } catch {
    return false;            // write() already put the red bar up and kept the payload
  }
  settings = next;
  return true;
}

/* v52: THE SIX MONTHS Micah decided, counted in whole days noon to noon —
   every stored mark older than that, set to null so normSettings() drops it.
   The engine ignores the same marks by its own clock argument, so a node
   nobody has written to since still reads right. */
const MARK_KEEP_DAYS = 182;
function staleMarks(marks) {
  const out = {};
  const today = new Date(); today.setHours(12, 0, 0, 0);
  Object.keys(marks || {}).forEach(id => {
    const d = marks[id] && marks[id].d;
    const at = typeof d === 'string' ? new Date(d + 'T12:00:00').getTime() : NaN;
    if (!Number.isFinite(at) || Math.round((today.getTime() - at) / 864e5) > MARK_KEEP_DAYS) out[id] = null;
  });
  return out;
}

/* ================= STAYING CURRENT =================
   The snapshot is gathered once per app open, and the app can outlive a lot of
   changes: a workout finished, a weigh-in logged, targets edited. A card that
   said "16 days since chest" straight after somebody trained chest would be a
   wrong number on the screen the app opens on, which is the one thing nothing
   in Coach may be.

   So these exist, and the shape of them is the point: the two cheap ones take
   what a CALLER HAS ALREADY READ and cost nothing at all. you.js re-reads
   weight, targets, summaries and steps whenever it comes back to the tab, and
   asks analytics for the sessions again; handing those over is free, and it
   means Coach's numbers are exactly as fresh as the ones drawn underneath it
   rather than a second opinion about the same nodes. */

/* Sessions, from a caller that has just had them out of analytics.
   Accepted only when there is something in the list. allSessions() resolves []
   on a FAILED read as well as on an empty log, and Coach has no way to tell
   those apart through that path — which is the whole reason initCoachData()
   reads the tree itself. A log emptied to zero inside one app open therefore
   keeps its last snapshot until the next one; deleting every session you have
   ever logged is rare, and showing one stale finding is a much smaller wrong
   than showing card_first_run to somebody whose read just timed out. */
export function noteCoachSessions(list) {
  if (!Array.isArray(list) || !list.length) return false;
  sessions = list;
  logState = 'readable';
  return true;
}

/* The small nodes, from a caller that has just re-read them — you.js hands in
   four, and workout.js hands in `routines` whenever routines.js's list changes.
   `targetsSet` moves only in the direction that can be stated honestly: a
   non-null object out of read() can only have come from the server or from the
   mirror, and both mean the node exists. A null is ambiguous — read() folds
   "absent" into "unreachable" — so it leaves the flag exactly where
   initCoachData()'s readExact put it. */
export function noteCoachData(patch) {
  const p = patch || {};
  if (p.entries   && typeof p.entries === 'object')   entries   = p.entries;
  if (p.summaries && typeof p.summaries === 'object') summaries = p.summaries;
  if (p.stepDays  && typeof p.stepDays === 'object')  stepDays  = p.stepDays;
  // The routines node, from routines.js the moment it changes (workout.js hands
  // it on). An empty object is a real answer here — his last routine deleted —
  // and the list it makes is simply empty.
  if (p.routines  && typeof p.routines === 'object')  routines  = routineList(p.routines);
  if (p.targets   && typeof p.targets === 'object') {
    targets = p.targets;
    if (Number.isFinite(p.targets.cal) && p.targets.cal > 0) targetsSet = true;
  }
}

/* v53: THE FINISH LINE, for the recap — finishRead() on this snapshot, the
   session just saved and the records workout.js worked out for it. Nothing
   new is read: straight after Finish the re-read has not landed, and the
   engine adds the record itself. Anything that throws is "Good work." from
   the record alone, because the recap is the screen he sees after every
   session and it must never be the one that breaks. */
export function coachFinishRead(record, extras) {
  try {
    return finishRead(coachInput({}), record, extras || null);
  } catch {
    const n = (record && Array.isArray(record.exercises) ? record.exercises : []).reduce((a, ex) =>
      a + (ex && Array.isArray(ex.sets) ? ex.sets : []).filter(x => x && x.type !== 'W').length, 0);
    const line = n ? 'Session done: ' + n + (n === 1 ? ' set.' : ' sets.') : 'Session done.';
    return { headline: 'Good work.', line, why: '', earned: false, evidence: [], short: line,
             id: record && record.id != null ? String(record.id) : '' };
  }
}

/* v53: ONE DAY'S SUMMARY, from food.js the moment it writes one — and
   nothing else. loadFuel() re-reads today only when today's summary has moved,
   and `summaries` used to move only when the You tab repainted, so food logged
   after the first "Am I fueled?" of an open was never seen by the second. A
   copy, not a mutation: the object may be the one you.js handed in. */
export function noteCoachFood(dateKey, summary) {
  if (typeof dateKey !== 'string' || !dateKey || !summary || typeof summary !== 'object') return;
  summaries = { ...summaries, [dateKey]: summary };
}

/* The one that does cost a read, for the one moment that is worth it: a session
   has just been written, moved or deleted, and the Train card is sitting under
   the button that did it.

   A failure here KEEPS the last good snapshot rather than flipping to
   'unknown'. That is the difference between init and refresh: at init a failed
   read means Coach has never seen the log and must say so; here it has, this
   session, successfully, and replacing a real finding with "can't read your
   training log" on one flaky request would be the worse answer. */
let refreshing = null;
export function refreshCoachSessions() {
  // Coalesced. Moving a session between months writes two whole months and
  // would otherwise ask for the tree twice for one change.
  if (!refreshing) refreshing = reread().finally(() => { refreshing = null; });
  return refreshing;
}

async function reread() {
  try {
    const tree = await readExact('workouts');
    sessions = flatten(tree);
    logState = sessions.length ? 'readable' : 'empty';
  } catch {}
  return ready;
}

export function coachSettings() { return settings; }

/* Whether the toggles on screen are the account's real stored state or this
   file's defaults. The Settings section says so out loud when it is false — a
   row of switches that silently shows defaults for a node nobody could read is
   a screen that invites somebody to "fix" a setting that was never broken. */
export function coachSettingsKnown() { return settingsRead; }

// `false` rather than a delete: normSettings keeps only `=== true`, so the key
// is dropped on the way through and the stored node never grows a row that
// means "on", which is already what an absent key means.
//
// An opt-in category (Patterns) is stored the other way round, under `on`,
// where absent means OFF — so switching it off drops its key the same way,
// and the node holds a row only for what was deliberately switched on.
export function setCategoryMuted(categoryId, muted) {
  const c = CATEGORIES.find(x => x.id === categoryId);
  if (c && c.optIn) {
    return patch({ on: { [categoryId]: muted !== true } }).then(ok => {
      if (ok && muted !== true && ready) loadPatternFood();
      return ok;
    });
  }
  return patch({ mute: { [categoryId]: muted === true } });
}

export function answerQuestion(id, value) {
  return patch({ answers: { [id]: value }, asked: { [id]: Date.now() } });
}

/* v49: THE AIM, SET. Its answer and its asked stamp — the moment the goal was
   set, which the goal-change questions count fourteen days from — and both of
   those questions' answers cleared in the same patch: a changed goal is a new
   goal, and "it's on purpose" was said about the old one. Settings, the sheet
   and onboarding all set the aim through here and nowhere else. */
export function setAim(aim) {
  return patch({
    answers: { q_goal_aim: aim, q_goal_check_weight: null, q_goal_check_targets: null },
    asked: { q_goal_aim: Date.now() }
  });
}

/* v49: THE LIFT TARGET, replaced whole — { exId, lb, reps, at }, pounds — or
   cleared with null. normSettings() drops anything that does not survive
   coach-goal.js's normGoalLift(), so a bad value is never written. */
export function setGoalLift(v) {
  return patch({ goalLift: v || null });
}

export function markAsked(id) {
  return patch({ asked: { [id]: Date.now() } });
}

/* v52: A BAD-DAY MARK (Micah's decision #9), on one session, by its own
   record id: { r, d } with d the session's own date key, or null to clear it.
   The answer to "Anything Coach can’t see?" and nothing else writes one, and
   "Nothing" writes nothing at all. settings/coach carries a section-level
   .write in the published rules, so the node takes it as it is. */
export function markSession(session, r) {
  const id = session && session.id != null ? String(session.id) : '';
  if (!id) return Promise.resolve(false);
  return patch({ marks: { [id]: r ? { r, d: String(session.date || '') } : null } });
}

/* The greeting Coach opened with. Written at most once per app open, to the
   DEVICE — synchronously, and that is the whole point of the move. The
   database version of this fired an async write as the app opened and then
   died with the page when somebody closed it a second later, which is exactly
   the pattern that needs it: open, glance, close, open again.

   Three ids rather than one. The counter in readRotation() is what makes
   consecutive opens different; this list is what covers the case the counter
   cannot, which is an eligible pool that changed size between two opens
   because a gate stopped passing. Newest first, so the engine can just take
   the head when it wants the last one. */
let greetWritten = false;
export function rememberGreeting(id) {
  if (greetWritten || !id) return;
  greetWritten = true;
  if (recentGreets[0] === id) return;
  recentGreets = [id].concat(recentGreets.filter(x => x !== id)).slice(0, 3);
  LS.set(LS_GREETS, recentGreets);
}

/* v49: the card's earned line, the same way and for the same reasons —
   synchronously, to the device.

   v53: { id, key, at }, newest first, eight deep, one entry per fact value.
   ONE ENTRY PER APP OPEN, AND THE LAST ONE DRAWN: the line is not pinned the
   way the greeting is, and it can change as food and weight land, so the
   entry is replaced while the open lasts rather than written once — the
   line remembered is the line he read. And the memory the ENGINE reads is
   the one read at open, never this open's own entry: with the 24-hour rule,
   a memory that moved on a paint would take the line off the card on the
   very next repaint. */
let hypeShown = null;
export function rememberHype(id, key) {
  if (!id) return;
  const k = typeof key === 'string' && key ? key : id;
  if (hypeShown && hypeShown.id === id && hypeShown.key === k) return;
  hypeShown = { id, key: k, at: Date.now() };
  LS.set(LS_HYPE, [hypeShown].concat(recentHype.filter(x => x.key !== k)).slice(0, 8));
}

/* The live session, read from the device rather than from the database. A
   workout in progress lives in localStorage until it is saved (workout.js
   stores it under `activeSession`), so there is nothing in `workouts` to see —
   which is exactly why card_live_session exists. Both surfaces pass
   hasActiveSession() in instead of this being reached for here, so coach-data
   never imports workout.js and the module graph stays one-way; this is the
   fallback for a caller that has no opinion. */
export function liveSessionOnDevice() {
  const s = LS.get('activeSession', null);
  return !!s && !s._edit;
}
