// What Coach is allowed to see, and the one file that fetches it.
//
// coach.js is pure and stays that way: it takes a plain object and gives back
// sentences. This is the other half — the impure gatherer that reads the
// database, asks the weight model and the entitlement gate what they think, and
// hands the engine one frozen snapshot. It is WEB-ONLY. The native port rewrites
// this file against its own store and copies coach.js byte for byte; that split
// is the whole reason the two exist separately.
//
// TWO READS PER APP OPEN, AND NONE PER PAINT. The You tab already issues around
// seven live GETs every time it renders, and Coach sits at the top of it — a
// card that read anything on its own would multiply that by every repaint the
// unawaited loads trigger. So everything lands once, in initCoachData(), and
// coachInput() is synchronous from then on.
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
import { allExercises } from './picker.js';
import { maintenance, effectiveMaint, trendRate, sortedEntries } from './tdee.js';
import { goalDirection } from './insights.js';
import { capabilities } from './access.js';
import { normSettings } from './coach.js';

/* ================= STATE =================
   Everything here is set once by initCoachData() and read synchronously
   afterwards. `ready` is not the same as "there is data" — it is "the loads
   have finished", and every surface paints a skeleton until it flips. */
let ready       = false;
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

/* The rotation seed. Captured ONCE, at init, and never re-read — the greeting
   rotates on each app OPEN, and the You tab repaints four or five times as its
   loads land. Seeding on the clock instead would change the line under the
   reader's thumb between one paint and the next. */
let openedAt = 0;

export function coachReady() { return ready; }

/* ================= THE LOAD =================
   Idempotent, and it has to be: You and Train both want the snapshot and both
   repaint when it lands, and two callers each firing their own pass would
   double every read this file makes. The first call does the work and every
   later one gets the same promise back, so `initCoachData().then(render)` is
   the right thing for a tab to write whether or not it is the first tab up. */
let inFlight = null;

export function initCoachData() {
  if (!inFlight) inFlight = load();
  return inFlight;
}

async function load() {
  openedAt = Date.now();

  // The one read that has to tell absent from unreachable. Everything else can
  // fall back to a default without lying; this one cannot.
  try {
    const tree = await readExact('workouts');
    sessions = flatten(tree);
    logState = sessions.length ? 'readable' : 'empty';
  } catch {
    sessions = [];
    logState = 'unknown';
  }

  /* food/targets gets the same treatment for the same reason. food.js leaves a
     MODULE DEFAULT of 2,700 kcal in memory when onboarding is skipped
     (food.js:54), so "is there a target" can never be answered by looking at
     the number — only by looking at whether the node exists. And a failed read
     is not an absent node: it is null here, and every fuel rule stays silent
     on null rather than announcing that nobody set any targets. */
  try {
    const t = await readExact('food/targets');
    targets = t || null;
    targetsSet = !!(t && typeof t === 'object' && Number.isFinite(t.cal) && t.cal > 0);
  } catch {
    targets = null;
    targetsSet = null;
  }

  // Coach's own settings. A failed read leaves the defaults in place AND leaves
  // settingsRead false, which is what the Settings section reads to say out
  // loud that the switches it is showing are defaults rather than stored state.
  try {
    settings = normSettings(await readExact('settings/coach'));
    settingsRead = true;
  } catch {
    settings = normSettings(null);
    settingsRead = false;
  }

  // The rest are mirror-cached and none of them can lie in a way that matters:
  // an absent summaries node and an unreadable one both mean "no food average",
  // and every rule that quotes one has a min-data gate in front of it.
  const [ds, we, sd, rt] = await Promise.all([
    read('food/daySummaries', null),
    read('weight/entries',    null),
    read('steps',             null),
    read('routines',          null)
  ]);
  summaries = ds || {};
  entries   = we || {};
  stepDays  = sd || {};
  routines  = rt ? Object.entries(rt).map(([id, r]) => ({ id, ...(r || {}) })) : [];

  ready = true;
  return ready;
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
    openMs: openedAt,
    u: wu(),
    log: ready ? logState : 'unknown',
    sessions,
    lib: libIndex(),
    routines,
    live: { active: !!e.live },
    tier: { pro: hasPro() },
    targets,
    targetsSet,
    summaries,
    steps: { days: stepDays },
    weight: {
      latestLb: last ? last.lb : null,
      latestAt: last ? last.t : null,
      rateWk:   Number.isFinite(rate.rateWk) ? rate.rateWk : null,
      rateDays: Number.isFinite(rate.days) ? rate.days : null,
      goalDir:  safe(() => goalDirection(targets, maint), null),
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

/* The merged effective library, reduced to the two fields Coach asks of it.
   picker.js owns the merge — built-ins, the account's customs, its renames and
   refiles, minus anything hidden — and this is the same list the picker itself
   shows. A hidden exercise is deliberately still in here when picker has it:
   hiding takes something out of the PICKER, not out of history, and a session
   that trained it still trained that group.

   The fallback to EXERCISES matters at boot: You starts loading before Train
   does, so allExercises() can legitimately answer with the built-ins alone for
   the first paint or two. Coach reading a library that is missing somebody's
   custom exercises for half a second costs a session's group falling back to
   what the record itself stored, which is what coach.js does with an
   unresolved id anyway. */
function libIndex() {
  const list = safe(() => allExercises(), null) || EXERCISES;
  const out = {};
  (list.length ? list : EXERCISES).forEach(x => {
    if (!x || !x.id) return;
    out[x.id] = { group: x.group, equipment: x.equipment };
  });
  return out;
}

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
    answers: { ...fresh.answers, ...(change.answers || {}) },
    asked:   { ...fresh.asked,   ...(change.asked   || {}) }
  });

  try {
    await write('settings/coach', next);
  } catch {
    return false;            // write() already put the red bar up and kept the payload
  }
  settings = next;
  return true;
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
export function setCategoryMuted(categoryId, muted) {
  return patch({ mute: { [categoryId]: muted === true } });
}

export function answerQuestion(id, value) {
  return patch({ answers: { [id]: value }, asked: { [id]: Date.now() } });
}

export function markAsked(id) {
  return patch({ asked: { [id]: Date.now() } });
}

/* The greeting Coach opened with. Written at most once per app open, and only
   when it actually changed — the pool drops the previous line so the same one
   never runs twice, and that is the only thing this value is for. A failed
   write costs a possible repeat and nothing else. */
let greetWritten = false;
export function rememberGreeting(id) {
  if (greetWritten || !id || id === settings.lastGreet) return;
  greetWritten = true;
  patch({ lastGreet: id }).catch(() => {});
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
