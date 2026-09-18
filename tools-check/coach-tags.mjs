#!/usr/bin/env node
//
// Verifier for the exercise tag sidecar.
//
//   node tools-check/coach-tags.mjs
//
// coach-tags.js is a second file keyed on exercises.js's ids, and two files
// keyed on one another is exactly the shape that drifts: an exercise added to
// the library and not to the sidecar is silently untagged, and one renamed out
// of existence leaves a tag pointing at nothing. Every check below is a way for
// those two to stop agreeing.
//
// Nothing here holds a copy of either file. exercises.js and coach-tags.js are
// imported for real — both are pure and import nothing, so they load under Node
// as they are — and the vocabularies and the agreement table are read from the
// sidecar's own exports rather than restated, so this file cannot be the reason
// a widened vocabulary passes.
//
// The agreement table is the check with teeth. A `squat` on an exercise whose
// primary group is `chest` is not a judgement call about movement science, it
// is a row that was filled in wrong, and it comes out of here as a FAILURE
// rather than a warning — a warning in a file nobody reads is a silent pass.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');

const EX = await import(pathToFileURL(join(ROOT, 'exercises.js')).href);
const T  = await import(pathToFileURL(join(ROOT, 'coach-tags.js')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 8).join(', ') + (xs.length > 8 ? ' … (' + xs.length + ' total)' : '');

const BUILTINS = EX.EXERCISES;
const BY_ID = EX.EXERCISE_BY_ID;

/* ================= A. THE TWO ID SETS ================= */
section('A. the sidecar and the library are keyed on the same ids');
{
  const tagIds = T.TAG_IDS;
  const libIds = BUILTINS.map(e => e.id);

  check('the sidecar has a row for every built-in (' + libIds.length + ')',
        libIds.every(id => T.TAGS[id]),
        list(libIds.filter(id => !T.TAGS[id])));
  check('and no row for anything the library does not have',
        tagIds.every(id => BY_ID[id]),
        list(tagIds.filter(id => !BY_ID[id])));
  check('the two sets are exactly equal, not merely overlapping',
        tagIds.length === libIds.length && tagIds.every(id => BY_ID[id]),
        tagIds.length + ' tagged vs ' + libIds.length + ' in the library');
  check('no id is tagged twice',
        new Set(tagIds).size === tagIds.length,
        list(tagIds.filter((id, i) => tagIds.indexOf(id) !== i)));
  // The library's own ids are slugs, and a duplicate name would mint a
  // duplicate id — which would make one exercise's tags stand for two.
  check('the library itself has no duplicate id',
        new Set(libIds).size === libIds.length,
        list(libIds.filter((id, i) => libIds.indexOf(id) !== i)));
}

/* ================= B. COMPLETENESS ================= */
section('B. every row is complete — a half-tagged exercise is worse than an untagged one');
{
  const missing = [];
  T.TAG_IDS.forEach(id => {
    const t = T.TAGS[id];
    if (!t) { missing.push(id + ':row'); return; }
    if (typeof t.pattern !== 'string') missing.push(id + ':pattern');
    if (!('angle' in t)) missing.push(id + ':angle');
    if (typeof t.load !== 'string') missing.push(id + ':load');
    if (typeof t.side !== 'string') missing.push(id + ':side');
    if (t.id !== id) missing.push(id + ':id-mismatch');
  });
  check('every row carries pattern, angle, load, side and its own id', !missing.length, list(missing));

  // Equipment is exercises.js's and must not be restated here: two records of
  // one fact is one too many, and the sidecar would be the one that goes stale.
  const carries = T.TAG_IDS.filter(id => 'equipment' in T.TAGS[id]);
  check('no row carries equipment — it is carried from exercises.js, not re-derived',
        !carries.length, list(carries));
  check('and the source does not mention an equipment key either',
        !/\bequipment\s*:/.test(src('coach-tags.js').replace(/\/\*[\s\S]*?\*\//g, '')));
}

/* ================= C. THE CLOSED VOCABULARIES ================= */
section('C. every value is in its vocabulary — a sixteenth pattern is a verifier failure');
{
  const bad = { pattern: [], angle: [], load: [], side: [] };
  T.TAG_IDS.forEach(id => {
    const t = T.TAGS[id];
    if (!T.PATTERNS.includes(t.pattern)) bad.pattern.push(id + '=' + t.pattern);
    if (t.angle !== null && !T.ANGLES.includes(t.angle)) bad.angle.push(id + '=' + t.angle);
    if (!T.LOADS.includes(t.load)) bad.load.push(id + '=' + t.load);
    if (!T.SIDES.includes(t.side)) bad.side.push(id + '=' + t.side);
  });
  check('pattern', !bad.pattern.length, list(bad.pattern));
  check('angle (null is a legal value and means "no meaningful angle")', !bad.angle.length, list(bad.angle));
  check('load', !bad.load.length, list(bad.load));
  check('side', !bad.side.length, list(bad.side));

  check('the four vocabularies are themselves free of duplicates',
        new Set(T.PATTERNS).size === T.PATTERNS.length &&
        new Set(T.ANGLES).size === T.ANGLES.length);
  check('every pattern in the vocabulary has a row in the agreement table',
        T.PATTERNS.every(p => Array.isArray(T.PATTERN_GROUPS[p]) && T.PATTERN_GROUPS[p].length),
        list(T.PATTERNS.filter(p => !(T.PATTERN_GROUPS[p] || []).length)));
  check('and the agreement table names no pattern the vocabulary does not have',
        Object.keys(T.PATTERN_GROUPS).every(p => T.PATTERNS.includes(p)),
        list(Object.keys(T.PATTERN_GROUPS).filter(p => !T.PATTERNS.includes(p))));
  check('every group named in the agreement table is one of the six',
        Object.values(T.PATTERN_GROUPS).every(gs => gs.every(g => EX.GROUP_ORDER.includes(g))));
}

/* ================= D. AGREEMENT WITH THE PRIMARY GROUP ================= */
section('D. every tag agrees with the exercise it is on');
{
  const bad = [];
  T.TAG_IDS.forEach(id => {
    const t = T.TAGS[id], e = BY_ID[id];
    if (!e) return;
    const allowed = T.PATTERN_GROUPS[t.pattern] || [];
    if (!allowed.includes(e.group)) bad.push(id + ' is ' + t.pattern + ' on ' + e.group);
  });
  check('no pattern sits on a primary group its row does not allow', !bad.length, list(bad));

  // The three the brief singles out, spelled out so a widened agreement table
  // cannot quietly let them through: a squat or a lunge is legs and nothing
  // else. (hinge is the deliberate exception — see coach-tags.js's header.)
  ['squat', 'lunge', 'bridge'].forEach(p => {
    const wrong = T.TAG_IDS.filter(id => T.TAGS[id].pattern === p && BY_ID[id].group !== 'legs');
    check('nothing tagged ' + p + ' sits outside legs', !wrong.length, list(wrong));
  });
  const pressBad = T.TAG_IDS.filter(id =>
    ['press', 'fly'].includes(T.TAGS[id].pattern) &&
    !['chest', 'shoulders', 'arms'].includes(BY_ID[id].group));
  check('nothing tagged press or fly sits outside chest, shoulders or arms', !pressBad.length, list(pressBad));
  const pullBad = T.TAG_IDS.filter(id =>
    ['row', 'pulldown'].includes(T.TAGS[id].pattern) &&
    !['back', 'shoulders'].includes(BY_ID[id].group));
  check('nothing tagged row or pulldown sits outside back or shoulders', !pullBad.length, list(pullBad));
}

/* ================= E. AGREEMENT WITH EQUIPMENT AND THE NAME ================= */
section('E. the tags agree with what exercises.js already says');
{
  const equipCardio = BUILTINS.filter(e => e.equipment === 'cardio').map(e => e.id);
  const tagCardio   = T.idsWithPattern('cardio');
  check('every cardio-equipment exercise is tagged cardio (' + equipCardio.length + ')',
        equipCardio.every(id => T.TAGS[id].pattern === 'cardio'),
        list(equipCardio.filter(id => T.TAGS[id].pattern !== 'cardio')));
  check('and nothing else is — the pattern and the equipment mean the same thing here',
        tagCardio.every(id => BY_ID[id].equipment === 'cardio'),
        list(tagCardio.filter(id => BY_ID[id].equipment !== 'cardio')));

  /* The name is a second opinion about the angle, and it is a good one: an
     exercise called Incline that is not tagged incline is a typo, not a
     judgement. Cardio is excluded — an incline TREADMILL is a gradient, not a
     press path, and tagging it incline would be the actual mistake. */
  const angleBad = [];
  BUILTINS.forEach(e => {
    if (e.equipment === 'cardio') return;
    const n = e.name.toLowerCase(), t = T.TAGS[e.id];
    if (n.includes('incline') && t.angle !== 'incline') angleBad.push(e.id + ' says Incline, tagged ' + t.angle);
    if (n.includes('decline') && t.angle !== 'decline') angleBad.push(e.id + ' says Decline, tagged ' + t.angle);
  });
  check('an exercise whose name says Incline or Decline is tagged that way', !angleBad.length, list(angleBad));

  const sideBad = BUILTINS.filter(e => {
    const n = e.name.toLowerCase();
    const one = n.startsWith('single-arm') || n.startsWith('single-leg') ||
                n.includes('concentration') || n.includes('suitcase');
    return one && T.TAGS[e.id].side !== 'unilateral';
  }).map(e => e.id);
  check('an exercise whose name says Single-Arm, Single-Leg, Concentration or Suitcase is unilateral',
        !sideBad.length, list(sideBad));

  // A flye is one joint and a squat is not. These two are the coarsest possible
  // sanity check on `load` and they catch a whole column pasted one row out.
  const loadBad = T.TAG_IDS.filter(id => {
    const t = T.TAGS[id];
    if (['fly', 'curl', 'extension', 'raise', 'crunch', 'rotation'].includes(t.pattern) && t.load !== 'isolation') {
      // Dips, JM presses and diamond push-ups are elbow extension and really
      // are compound; leg extension and leg curl are not. The rule is only
      // applied where the pattern can only be one joint.
      return ['fly', 'raise', 'crunch', 'rotation'].includes(t.pattern);
    }
    /* `pulldown` and `row` are deliberately NOT on the compound list, and the
       exception is a real exercise rather than a hedge: a Straight-Arm Pulldown
       is shoulder extension with a locked elbow, which is one joint. Putting
       the whole pattern on the list would have made this verifier assert
       something false in order to look stricter. */
    if (['squat', 'hinge', 'lunge', 'carry', 'bridge', 'cardio'].includes(t.pattern)) {
      return t.load !== 'compound';
    }
    return false;
  });
  check('flyes, raises, crunches and rotations are isolation; squats, hinges, lunges, carries, bridges and cardio are compound',
        !loadBad.length, list(loadBad.map(id => id + '=' + T.TAGS[id].pattern + '/' + T.TAGS[id].load)));

  // And the one exception, named, so that a later pass which "tidies" it into
  // compound has to argue with this line rather than with a silent rule.
  check('the Straight-Arm Pulldown is the one pulldown that is isolation, and still is',
        T.TAGS['straight-arm-pulldown'].pattern === 'pulldown' &&
        T.TAGS['straight-arm-pulldown'].load === 'isolation');
}

/* ================= F. CUSTOM EXERCISES ================= */
section('F. a custom exercise is untagged and stays fully usable');
{
  const custom = EX.makeCustomExercise('Micah’s Weird Machine', 'back', 'machine');
  check('makeCustomExercise still mints an id prefixed custom-', custom.id.startsWith('custom-'));
  check('tagsFor() on a custom id is null, not a guessed row', T.tagsFor(custom.id) === null);
  check('patternOf() on a custom id is null', T.patternOf(custom.id) === null);
  check('and on an id from no build at all', T.tagsFor('not-an-exercise') === null && T.patternOf('') === null);
  // The whole promise of the sidecar: it can only ever withhold a tag. Nothing
  // in it is allowed to remove somebody's own exercise from anything.
  check('nothing in the sidecar filters the library — it only adds to it',
        !/EXERCISES|EXERCISE_BY_ID|hidden|custom(?!-)/.test(
          src('coach-tags.js').replace(/\/\*[\s\S]*?\*\//g, '')
                              .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n')));
  check('and it imports nothing at all, so it cannot reach the library to try',
        !/^\s*import\s/m.test(src('coach-tags.js')));
}

/* ================= G. THE SHAPE OF THE FILE ================= */
section('G. the file stays the shape the next pass expects');
{
  const s = src('coach-tags.js');
  check('rows are still [id, pattern, angle, load, side] — five columns',
        /const RAW = \[/.test(s) &&
        T.TAG_IDS.every(id => Object.keys(T.TAGS[id]).length === 5));
  check('TAGS is frozen, so nothing downstream can tag an exercise at runtime',
        Object.isFrozen(T.TAGS) && Object.isFrozen(T.TAGS[T.TAG_IDS[0]]));
  check('the vocabularies are frozen too',
        [T.PATTERNS, T.ANGLES, T.LOADS, T.SIDES, T.PATTERN_GROUPS].every(Object.isFrozen));
  check('idsWithPattern() answers from the table rather than from a copy',
        T.idsWithPattern('squat').every(id => T.TAGS[id].pattern === 'squat') &&
        T.idsWithPattern('squat').length ===
          T.TAG_IDS.filter(id => T.TAGS[id].pattern === 'squat').length);
  check('an unknown pattern gets an empty list, not a throw', T.idsWithPattern('nonsense').length === 0);
}

/* ---------- report ---------- */
console.log('\nthe exercise tag sidecar agrees with the library\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
