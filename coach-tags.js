// The exercise tag sidecar — movement pattern, angle, load and side.
//
// A SIDECAR, on purpose, and not an edit to exercises.js. That file is copied
// verbatim into the native tree and every logged set in the database is keyed
// on the ids it mints, so editing it in place means re-copying and re-verifying
// a file both clients depend on — and a slipped comma in a tagging pass would
// reach the picker, the calendar plate colours and the history index. Nothing
// in here can break anything but Coach.
//
// WHY IT EXISTS AT ALL. exercises.js has SIX muscle groups and that is a hard
// ceiling: chest, back, legs, shoulders, arms, core. There is no biceps/triceps
// split and no quads/hamstrings split, so "you're behind on chest" is
// computable and "you never train hamstrings" is not. Movement pattern is the
// only finer signal Rack will ever have, and this is where it lives.
//
// INERT TONIGHT beyond its verifier. Ship two — the workout builder — is what
// reads it. It is built now so that ship starts without a preparation run.
//
// FIVE CLOSED DIMENSIONS. A value outside a vocabulary is a verifier failure,
// not a warning:
//
//   pattern    the movement. Fifteen values, and the list does not grow without
//              a matching pass over every row below
//   angle      incline | flat | decline | overhead, or null where the exercise
//              has no meaningful one — a row, a squat, a curl, a carry
//   load       compound (more than one joint under load) or isolation
//   side       bilateral or unilateral
//   equipment  NOT HERE. It is carried from exercises.js and must not be
//              re-derived; two records of one fact is one too many
//
// CUSTOM EXERCISES GET NO TAGS, and that is not an omission. A custom exercise
// is classified by the primary group its owner already assigned it, with a null
// pattern, and it stays fully usable everywhere — in the picker, in a routine,
// in history, in every count Coach makes. Nothing in Rack may exclude somebody's
// own exercise from anything.
//
// Keyed by the same id exercises.js mints, so the sidecar and the library
// cannot drift: tools-check/coach-tags.mjs fails unless the two id sets are
// exactly equal.
//
// A word on the compromises, because a closed vocabulary over 231 exercises is
// lossy by construction and the losses should be written down rather than
// discovered:
//
//   Every plank, rollout, dead bug and hanging leg raise is `crunch`. They are
//   anti-extension braces rather than spinal flexion, and `crunch` is the
//   nearest legal bucket in a fifteen-word vocabulary. The alternative was a
//   sixteenth word for one family.
//   Shrugs are `raise`. Sled work is `lunge` — a loaded alternating stride.
//   Deadlifts are `hinge` and their primary group is `back`, which is why the
//   agreement table below allows hinge on back as well as on legs.
//   Dips, JM presses and diamond push-ups filed under arms are `extension`:
//   they are elbow-extension exercises whatever the torso is doing.
//
// This module imports nothing and reads nothing.

/* The vocabularies, exported so the verifier checks against THIS list rather
   than against a copy of it. */
export const PATTERNS = Object.freeze([
  'press', 'row', 'pulldown', 'fly', 'raise', 'curl', 'extension', 'hinge',
  'squat', 'lunge', 'carry', 'bridge', 'crunch', 'rotation', 'cardio'
]);
export const ANGLES = Object.freeze(['incline', 'flat', 'decline', 'overhead']);
export const LOADS  = Object.freeze(['compound', 'isolation']);
export const SIDES  = Object.freeze(['bilateral', 'unilateral']);

/* Which primary groups each pattern is allowed to appear on. This is the
   agreement table, and it is the check with teeth: a tagging mistake shows up
   here as a pattern on a group it cannot possibly belong to.

   `hinge` allows back because exercises.js files every deadlift, good morning
   and back extension under back — they are hip hinges whose primary group, in
   this app, is back, and a table that refused them would fail seventeen correct
   rows to keep a tidier rule. */
export const PATTERN_GROUPS = Object.freeze({
  press:     Object.freeze(['chest', 'shoulders', 'arms']),
  fly:       Object.freeze(['chest', 'shoulders']),
  row:       Object.freeze(['back', 'shoulders']),
  pulldown:  Object.freeze(['back']),
  hinge:     Object.freeze(['back', 'legs']),
  squat:     Object.freeze(['legs']),
  lunge:     Object.freeze(['legs']),
  bridge:    Object.freeze(['legs']),
  curl:      Object.freeze(['arms', 'legs']),
  extension: Object.freeze(['arms', 'legs', 'back']),
  raise:     Object.freeze(['shoulders', 'legs', 'core', 'back']),
  carry:     Object.freeze(['arms', 'core']),
  crunch:    Object.freeze(['core']),
  rotation:  Object.freeze(['core', 'back']),
  cardio:    Object.freeze(['legs', 'back'])
});

/* Format: [id, pattern, angle, load, side]
   Order follows exercises.js, group by group, so the two files read side by
   side and a row added there has an obvious place here. */
const RAW = [

  // ---------- CHEST ----------
  ['barbell-bench-press', 'press', 'flat', 'compound', 'bilateral'],
  ['barbell-bench-press-paused', 'press', 'flat', 'compound', 'bilateral'],
  ['close-grip-bench-press', 'press', 'flat', 'compound', 'bilateral'],
  ['wide-grip-bench-press', 'press', 'flat', 'compound', 'bilateral'],
  ['incline-barbell-bench-press', 'press', 'incline', 'compound', 'bilateral'],
  ['decline-barbell-bench-press', 'press', 'decline', 'compound', 'bilateral'],
  ['floor-press', 'press', 'flat', 'compound', 'bilateral'],
  ['board-press', 'press', 'flat', 'compound', 'bilateral'],
  ['spoto-press', 'press', 'flat', 'compound', 'bilateral'],
  ['larsen-press', 'press', 'flat', 'compound', 'bilateral'],
  ['pin-press', 'press', 'flat', 'compound', 'bilateral'],
  ['dumbbell-bench-press', 'press', 'flat', 'compound', 'bilateral'],
  ['incline-dumbbell-bench-press', 'press', 'incline', 'compound', 'bilateral'],
  ['decline-dumbbell-bench-press', 'press', 'decline', 'compound', 'bilateral'],
  ['dumbbell-floor-press', 'press', 'flat', 'compound', 'bilateral'],
  ['dumbbell-flye', 'fly', 'flat', 'isolation', 'bilateral'],
  ['incline-dumbbell-flye', 'fly', 'incline', 'isolation', 'bilateral'],
  ['cable-flye-high-to-low', 'fly', 'decline', 'isolation', 'bilateral'],
  ['cable-flye-low-to-high', 'fly', 'incline', 'isolation', 'bilateral'],
  ['cable-flye-mid', 'fly', 'flat', 'isolation', 'bilateral'],
  ['cable-crossover', 'fly', 'flat', 'isolation', 'bilateral'],
  ['pec-deck', 'fly', 'flat', 'isolation', 'bilateral'],
  ['machine-chest-press', 'press', 'flat', 'compound', 'bilateral'],
  ['incline-machine-press', 'press', 'incline', 'compound', 'bilateral'],
  ['smith-machine-bench-press', 'press', 'flat', 'compound', 'bilateral'],
  ['push-up', 'press', 'flat', 'compound', 'bilateral'],
  ['weighted-push-up', 'press', 'flat', 'compound', 'bilateral'],
  ['deficit-push-up', 'press', 'flat', 'compound', 'bilateral'],
  ['chest-dip', 'press', 'decline', 'compound', 'bilateral'],
  ['weighted-chest-dip', 'press', 'decline', 'compound', 'bilateral'],
  ['svend-press', 'press', 'flat', 'compound', 'bilateral'],
  ['landmine-press', 'press', 'incline', 'compound', 'bilateral'],

  // ---------- BACK ----------
  ['conventional-deadlift', 'hinge', null, 'compound', 'bilateral'],
  ['sumo-deadlift', 'hinge', null, 'compound', 'bilateral'],
  ['deficit-deadlift', 'hinge', null, 'compound', 'bilateral'],
  ['block-pull', 'hinge', null, 'compound', 'bilateral'],
  ['rack-pull', 'hinge', null, 'compound', 'bilateral'],
  ['snatch-grip-deadlift', 'hinge', null, 'compound', 'bilateral'],
  ['stiff-leg-deadlift', 'hinge', null, 'compound', 'bilateral'],
  ['romanian-deadlift', 'hinge', null, 'compound', 'bilateral'],
  ['dumbbell-romanian-deadlift', 'hinge', null, 'compound', 'bilateral'],
  ['trap-bar-deadlift', 'hinge', null, 'compound', 'bilateral'],
  ['pull-up', 'pulldown', null, 'compound', 'bilateral'],
  ['weighted-pull-up', 'pulldown', null, 'compound', 'bilateral'],
  ['chin-up', 'pulldown', null, 'compound', 'bilateral'],
  ['weighted-chin-up', 'pulldown', null, 'compound', 'bilateral'],
  ['neutral-grip-pull-up', 'pulldown', null, 'compound', 'bilateral'],
  ['assisted-pull-up', 'pulldown', null, 'compound', 'bilateral'],
  ['lat-pulldown', 'pulldown', null, 'compound', 'bilateral'],
  ['close-grip-lat-pulldown', 'pulldown', null, 'compound', 'bilateral'],
  ['neutral-grip-lat-pulldown', 'pulldown', null, 'compound', 'bilateral'],
  ['reverse-grip-lat-pulldown', 'pulldown', null, 'compound', 'bilateral'],
  ['single-arm-lat-pulldown', 'pulldown', null, 'compound', 'unilateral'],
  ['straight-arm-pulldown', 'pulldown', null, 'isolation', 'bilateral'],
  ['barbell-row', 'row', null, 'compound', 'bilateral'],
  ['pendlay-row', 'row', null, 'compound', 'bilateral'],
  ['yates-row', 'row', null, 'compound', 'bilateral'],
  ['t-bar-row', 'row', null, 'compound', 'bilateral'],
  ['chest-supported-row', 'row', null, 'compound', 'bilateral'],
  ['seal-row', 'row', null, 'compound', 'bilateral'],
  ['dumbbell-row', 'row', null, 'compound', 'unilateral'],
  ['chest-supported-dumbbell-row', 'row', null, 'compound', 'bilateral'],
  ['seated-cable-row', 'row', null, 'compound', 'bilateral'],
  ['wide-grip-seated-cable-row', 'row', null, 'compound', 'bilateral'],
  ['single-arm-cable-row', 'row', null, 'compound', 'unilateral'],
  ['machine-row', 'row', null, 'compound', 'bilateral'],
  ['meadows-row', 'row', null, 'compound', 'unilateral'],
  ['landmine-row', 'row', null, 'compound', 'bilateral'],
  ['inverted-row', 'row', null, 'compound', 'bilateral'],
  ['barbell-shrug', 'raise', null, 'isolation', 'bilateral'],
  ['dumbbell-shrug', 'raise', null, 'isolation', 'bilateral'],
  ['trap-bar-shrug', 'raise', null, 'isolation', 'bilateral'],
  ['cable-shrug', 'raise', null, 'isolation', 'bilateral'],
  ['back-extension', 'hinge', null, 'compound', 'bilateral'],
  ['weighted-back-extension', 'hinge', null, 'compound', 'bilateral'],
  ['reverse-hyperextension', 'hinge', null, 'compound', 'bilateral'],
  ['good-morning', 'hinge', null, 'compound', 'bilateral'],
  ['rope-face-pull', 'row', null, 'compound', 'bilateral'],
  ['kroc-row', 'row', null, 'compound', 'unilateral'],
  ['rowing-machine', 'cardio', null, 'compound', 'bilateral'],

  // ---------- LEGS ----------
  ['back-squat-high-bar', 'squat', null, 'compound', 'bilateral'],
  ['back-squat-low-bar', 'squat', null, 'compound', 'bilateral'],
  ['front-squat', 'squat', null, 'compound', 'bilateral'],
  ['pause-squat', 'squat', null, 'compound', 'bilateral'],
  ['box-squat', 'squat', null, 'compound', 'bilateral'],
  ['safety-bar-squat', 'squat', null, 'compound', 'bilateral'],
  ['zercher-squat', 'squat', null, 'compound', 'bilateral'],
  ['overhead-squat', 'squat', null, 'compound', 'bilateral'],
  ['smith-machine-squat', 'squat', null, 'compound', 'bilateral'],
  ['hack-squat', 'squat', null, 'compound', 'bilateral'],
  ['pendulum-squat', 'squat', null, 'compound', 'bilateral'],
  ['belt-squat', 'squat', null, 'compound', 'bilateral'],
  ['goblet-squat', 'squat', null, 'compound', 'bilateral'],
  ['bulgarian-split-squat', 'lunge', null, 'compound', 'unilateral'],
  ['barbell-split-squat', 'lunge', null, 'compound', 'unilateral'],
  ['walking-lunge', 'lunge', null, 'compound', 'unilateral'],
  ['reverse-lunge', 'lunge', null, 'compound', 'unilateral'],
  ['forward-lunge', 'lunge', null, 'compound', 'unilateral'],
  ['lateral-lunge', 'lunge', null, 'compound', 'unilateral'],
  ['step-up', 'lunge', null, 'compound', 'unilateral'],
  ['leg-press', 'squat', null, 'compound', 'bilateral'],
  ['single-leg-press', 'squat', null, 'compound', 'unilateral'],
  ['leg-extension', 'extension', null, 'isolation', 'bilateral'],
  ['single-leg-extension', 'extension', null, 'isolation', 'unilateral'],
  ['lying-leg-curl', 'curl', null, 'isolation', 'bilateral'],
  ['seated-leg-curl', 'curl', null, 'isolation', 'bilateral'],
  ['standing-leg-curl', 'curl', null, 'isolation', 'bilateral'],
  ['nordic-ham-curl', 'curl', null, 'isolation', 'bilateral'],
  ['glute-ham-raise', 'hinge', null, 'compound', 'bilateral'],
  ['hip-thrust', 'bridge', null, 'compound', 'bilateral'],
  ['single-leg-hip-thrust', 'bridge', null, 'compound', 'unilateral'],
  ['glute-bridge', 'bridge', null, 'compound', 'bilateral'],
  ['cable-pull-through', 'hinge', null, 'compound', 'bilateral'],
  ['cable-kickback', 'raise', null, 'isolation', 'unilateral'],
  ['hip-abduction-machine', 'raise', null, 'isolation', 'bilateral'],
  ['hip-adduction-machine', 'raise', null, 'isolation', 'bilateral'],
  ['standing-calf-raise', 'raise', null, 'isolation', 'bilateral'],
  ['seated-calf-raise', 'raise', null, 'isolation', 'bilateral'],
  ['leg-press-calf-raise', 'raise', null, 'isolation', 'bilateral'],
  ['smith-machine-calf-raise', 'raise', null, 'isolation', 'bilateral'],
  ['dumbbell-calf-raise', 'raise', null, 'isolation', 'bilateral'],
  ['sissy-squat', 'squat', null, 'compound', 'bilateral'],
  ['sled-push', 'lunge', null, 'compound', 'bilateral'],
  ['sled-drag', 'lunge', null, 'compound', 'bilateral'],
  ['kettlebell-swing', 'hinge', null, 'compound', 'bilateral'],
  ['treadmill-walk-incline', 'cardio', null, 'compound', 'bilateral'],
  ['treadmill-run', 'cardio', null, 'compound', 'bilateral'],
  ['stair-climber', 'cardio', null, 'compound', 'bilateral'],
  ['stationary-bike', 'cardio', null, 'compound', 'bilateral'],
  ['elliptical', 'cardio', null, 'compound', 'bilateral'],
  ['assault-bike', 'cardio', null, 'compound', 'bilateral'],
  ['jump-rope', 'cardio', null, 'compound', 'bilateral'],
  ['outdoor-walk', 'cardio', null, 'compound', 'bilateral'],

  // ---------- SHOULDERS ----------
  ['overhead-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['push-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['seated-barbell-overhead-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['behind-the-neck-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['z-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['dumbbell-shoulder-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['seated-dumbbell-shoulder-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['arnold-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['single-arm-dumbbell-press', 'press', 'overhead', 'compound', 'unilateral'],
  ['machine-shoulder-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['smith-machine-shoulder-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['dumbbell-lateral-raise', 'raise', null, 'isolation', 'bilateral'],
  ['cable-lateral-raise', 'raise', null, 'isolation', 'bilateral'],
  ['machine-lateral-raise', 'raise', null, 'isolation', 'bilateral'],
  ['leaning-lateral-raise', 'raise', null, 'isolation', 'unilateral'],
  ['lu-raise', 'raise', null, 'isolation', 'bilateral'],
  ['dumbbell-front-raise', 'raise', null, 'isolation', 'bilateral'],
  ['plate-front-raise', 'raise', null, 'isolation', 'bilateral'],
  ['cable-front-raise', 'raise', null, 'isolation', 'bilateral'],
  ['dumbbell-rear-delt-flye', 'fly', null, 'isolation', 'bilateral'],
  ['cable-rear-delt-flye', 'fly', null, 'isolation', 'bilateral'],
  ['reverse-pec-deck', 'fly', null, 'isolation', 'bilateral'],
  ['upright-row', 'row', null, 'compound', 'bilateral'],
  ['cable-upright-row', 'row', null, 'compound', 'bilateral'],
  ['barbell-cuban-press', 'press', 'overhead', 'compound', 'bilateral'],
  ['band-pull-apart', 'fly', null, 'isolation', 'bilateral'],
  ['handstand-push-up', 'press', 'overhead', 'compound', 'bilateral'],
  ['pike-push-up', 'press', 'incline', 'compound', 'bilateral'],

  // ---------- ARMS ----------
  ['barbell-curl', 'curl', null, 'isolation', 'bilateral'],
  ['ez-bar-curl', 'curl', null, 'isolation', 'bilateral'],
  ['wide-grip-barbell-curl', 'curl', null, 'isolation', 'bilateral'],
  ['close-grip-barbell-curl', 'curl', null, 'isolation', 'bilateral'],
  ['dumbbell-curl', 'curl', null, 'isolation', 'bilateral'],
  ['alternating-dumbbell-curl', 'curl', null, 'isolation', 'unilateral'],
  ['hammer-curl', 'curl', null, 'isolation', 'bilateral'],
  ['cross-body-hammer-curl', 'curl', null, 'isolation', 'unilateral'],
  ['incline-dumbbell-curl', 'curl', 'incline', 'isolation', 'bilateral'],
  ['concentration-curl', 'curl', null, 'isolation', 'unilateral'],
  ['preacher-curl', 'curl', null, 'isolation', 'bilateral'],
  ['dumbbell-preacher-curl', 'curl', null, 'isolation', 'bilateral'],
  ['machine-preacher-curl', 'curl', null, 'isolation', 'bilateral'],
  ['spider-curl', 'curl', null, 'isolation', 'bilateral'],
  ['cable-curl', 'curl', null, 'isolation', 'bilateral'],
  ['rope-hammer-curl', 'curl', null, 'isolation', 'bilateral'],
  ['bayesian-cable-curl', 'curl', null, 'isolation', 'unilateral'],
  ['reverse-curl', 'curl', null, 'isolation', 'bilateral'],
  ['zottman-curl', 'curl', null, 'isolation', 'bilateral'],
  ['21s', 'curl', null, 'isolation', 'bilateral'],
  ['triceps-pushdown-bar', 'extension', null, 'isolation', 'bilateral'],
  ['triceps-pushdown-rope', 'extension', null, 'isolation', 'bilateral'],
  ['triceps-pushdown-v-bar', 'extension', null, 'isolation', 'bilateral'],
  ['reverse-grip-pushdown', 'extension', null, 'isolation', 'bilateral'],
  ['overhead-cable-extension', 'extension', 'overhead', 'isolation', 'bilateral'],
  ['overhead-dumbbell-extension', 'extension', 'overhead', 'isolation', 'bilateral'],
  ['single-arm-overhead-extension', 'extension', 'overhead', 'isolation', 'unilateral'],
  ['skullcrusher', 'extension', null, 'isolation', 'bilateral'],
  ['dumbbell-skullcrusher', 'extension', null, 'isolation', 'bilateral'],
  ['jm-press', 'extension', null, 'isolation', 'bilateral'],
  ['triceps-dip', 'extension', null, 'compound', 'bilateral'],
  ['bench-dip', 'extension', null, 'compound', 'bilateral'],
  ['diamond-push-up', 'extension', 'flat', 'compound', 'bilateral'],
  ['dumbbell-kickback', 'extension', null, 'isolation', 'unilateral'],
  ['cable-kickback-triceps', 'extension', null, 'isolation', 'unilateral'],
  ['machine-triceps-extension', 'extension', null, 'isolation', 'bilateral'],
  ['wrist-curl', 'curl', null, 'isolation', 'bilateral'],
  ['reverse-wrist-curl', 'curl', null, 'isolation', 'bilateral'],
  ['behind-the-back-wrist-curl', 'curl', null, 'isolation', 'bilateral'],
  ['farmer-s-walk', 'carry', null, 'compound', 'bilateral'],
  ['plate-pinch-hold', 'carry', null, 'compound', 'bilateral'],
  ['dead-hang', 'carry', null, 'compound', 'bilateral'],

  // ---------- CORE ----------
  ['plank', 'crunch', null, 'isolation', 'bilateral'],
  ['weighted-plank', 'crunch', null, 'isolation', 'bilateral'],
  ['side-plank', 'rotation', null, 'isolation', 'unilateral'],
  ['rkc-plank', 'crunch', null, 'isolation', 'bilateral'],
  ['ab-wheel-rollout', 'crunch', null, 'isolation', 'bilateral'],
  ['barbell-rollout', 'crunch', null, 'isolation', 'bilateral'],
  ['hanging-leg-raise', 'crunch', null, 'isolation', 'bilateral'],
  ['hanging-knee-raise', 'crunch', null, 'isolation', 'bilateral'],
  ['captain-s-chair-leg-raise', 'crunch', null, 'isolation', 'bilateral'],
  ['lying-leg-raise', 'crunch', null, 'isolation', 'bilateral'],
  ['toes-to-bar', 'crunch', null, 'isolation', 'bilateral'],
  ['cable-crunch', 'crunch', null, 'isolation', 'bilateral'],
  ['machine-crunch', 'crunch', null, 'isolation', 'bilateral'],
  ['crunch', 'crunch', null, 'isolation', 'bilateral'],
  ['weighted-crunch', 'crunch', null, 'isolation', 'bilateral'],
  ['sit-up', 'crunch', null, 'isolation', 'bilateral'],
  ['decline-sit-up', 'crunch', 'decline', 'isolation', 'bilateral'],
  ['russian-twist', 'rotation', null, 'isolation', 'bilateral'],
  ['pallof-press', 'rotation', null, 'isolation', 'bilateral'],
  ['cable-woodchop', 'rotation', null, 'isolation', 'bilateral'],
  ['landmine-twist', 'rotation', null, 'isolation', 'bilateral'],
  ['dead-bug', 'crunch', null, 'isolation', 'bilateral'],
  ['bird-dog', 'crunch', null, 'isolation', 'bilateral'],
  ['hollow-body-hold', 'crunch', null, 'isolation', 'bilateral'],
  ['suitcase-carry', 'carry', null, 'compound', 'unilateral'],
  ['copenhagen-plank', 'rotation', null, 'isolation', 'unilateral'],
  ['stir-the-pot', 'crunch', null, 'isolation', 'bilateral'],
  ['dragon-flag', 'crunch', null, 'isolation', 'bilateral']
];

export const TAGS = Object.freeze(Object.fromEntries(
  RAW.map(([id, pattern, angle, load, side]) => [id, Object.freeze({
    id, pattern, angle, load, side
  })])
));

export const TAG_IDS = Object.freeze(RAW.map(r => r[0]));

/* The one accessor. A custom exercise, a hidden one, an id from a build older
   than this file — all of them come back with a null pattern and no angle, and
   every caller has to cope with that rather than assume a tag exists. Group is
   NOT supplied here: it belongs to the library (and to the account's own
   overrides of it), and this file having an opinion about it is how the two
   would drift. */
export function tagsFor(exId) {
  return TAGS[exId] || null;
}

export function patternOf(exId) {
  const t = TAGS[exId];
  return t ? t.pattern : null;
}

// Everything tagged with one pattern, ids only. Ship two's builder picks from
// these; nothing tonight calls it.
export function idsWithPattern(pattern) {
  return TAG_IDS.filter(id => TAGS[id].pattern === pattern);
}
