#!/usr/bin/env node
//
// Verifier for the verbatim-port guarantee.
//
//   node tools-check/coach-pure.mjs
//
// coach.js exists to be COPIED. The native client gets the same engine byte for
// byte and rewrites only coach-data.js, which is the impure half — the reads,
// the clock, the entitlement gate. That promise is worth exactly as much as the
// purity behind it, and purity is the kind of property that decays one
// convenient import at a time: a Date.now() here because the argument was
// awkward to thread, a store.js read there because the caller did not have the
// node to hand, and six months later the file cannot be copied at all.
//
// So this file is a fence rather than a test. It reads coach.js's source and
// refuses:
//
//   A  any import outside the three allowed modules, and any named import from
//      analytics.js beyond its session MATH — loadAll and allSessions are the
//      impure half of that file and are the whole reason the list is closed
//   B  any clock of its own, any randomness, any DOM, any storage
//   C  any module-level mutable state — a `let` at the top of a pure module is
//      a cache, and a cache is a thing that answers differently the second time
//   D  and then it drives the real engine to prove the fence is doing its job:
//      the same input twice is the same sentence, and moving the wall clock
//      without moving `now` moves nothing at all
//
// The stubbed store.js underneath analytics.js is itself part of the check. It
// answers every read with the fallback and nothing else — so if coach.js ever
// did reach for one, every downstream number would come out empty rather than
// wrong, and section D would fail.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);

const dir = mkdtempSync(join(tmpdir(), 'rack-coach-pure-'));
writeFileSync(join(dir, 'store-stub.mjs'), `
export async function read(_p, fallback) { return fallback; }
export function todayKey(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
`);
writeFileSync(join(dir, 'analytics.mjs'), src('analytics.js')
  .replace("from './store.js'", "from './store-stub.mjs'")
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './ui.js'", 'from ' + real('ui.js'))
  .replace("from './units.js'", 'from ' + real('units.js')));
/* coach-goal.js and coach-prog.js — v48's targets — are staged the same way:
   coach-build.js imports coach-prog.js, which takes the same session math
   through the stub, and coach-goal.js imports nothing at all. */
writeFileSync(join(dir, 'coach-prog.mjs'), src('coach-prog.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-build.js, the workout builder, is staged the same way: coach.js
   imports it, and it takes analytics.js's session math through the same stub. */
writeFileSync(join(dir, 'coach-build.mjs'), src('coach-build.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './blocks.js'", 'from ' + real('blocks.js'))
  .replace("from './coach-tags.js'", 'from ' + real('coach-tags.js'))
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
/* coach-live.js, the in-session read (ship three), is staged the same way:
   coach.js imports it too, and it takes the same session math through the stub. */
writeFileSync(join(dir, 'coach-live.mjs'), src('coach-live.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
  .replace("from './coach-build.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-build.mjs')).href))
  .replace("from './coach-live.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-live.mjs')).href))
  .replace("from './coach-goal.js'", 'from ' + real('coach-goal.js'))
  .replace("from './coach-prog.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'coach-prog.mjs')).href))
  .replace("from './analytics.js'", 'from ' + JSON.stringify(pathToFileURL(join(dir, 'analytics.mjs')).href)));
const C = await import(pathToFileURL(join(dir, 'coach.mjs')).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const list = xs => xs.slice(0, 6).join(' | ') + (xs.length > 6 ? ' … (' + xs.length + ')' : '');

const RAW = src('coach.js');
/* Comments stripped, because several of them name the very things this file
   forbids in order to explain WHY they are forbidden. weigh-time.mjs does the
   same, for the same reason. */
const CODE = RAW.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');

/* ================= A. THE IMPORT LIST ================= */
section('A. three imports, and the analytics one is a closed list');
{
  const imports = [...RAW.matchAll(/^import\s+(?:([^;]*?)\s+from\s+)?['"]([^'"]+)['"];?$/gm)]
    .map(m => ({ names: (m[1] || '').trim(), from: m[2] }));

  // coach-build.js is the fourth and coach-live.js the fifth, and each is held
  // to this file's own rules in sections F and G below — a pure module
  // importing another pure module is still a pure module, and only while that
  // stays true. coach-goal.js is the sixth (v48): the goal's facts read its
  // aims and its energy context, and section I holds it to the same rules.
  // coach-prog.js is reached through the builder, never from here.
  const ALLOWED = ['./exercises.js', './analytics.js', './units.js', './coach-build.js', './coach-live.js',
                   './coach-goal.js'];
  const extra = imports.map(i => i.from).filter(f => !ALLOWED.includes(f));
  check('coach.js imports nothing outside exercises.js, analytics.js, units.js, coach-build.js, coach-live.js and coach-goal.js',
        !extra.length, list(extra));
  check('and imports none of them twice',
        new Set(imports.map(i => i.from)).size === imports.length);

  // The named list from analytics, spelled out. This is the fence that keeps
  // the port honest: e1rm and the merge invariant must NOT be restated in
  // coach.js (two copies of the set row's arithmetic is how they drift), and
  // loadAll/allSessions must never be reachable from it.
  const PURE = ['e1rm', 'isWorking', 'setVolume', 'mergeSessionExercises', 'exerciseIndex'];
  const IMPURE = ['loadAll', 'allSessions', 'invalidate', 'lineChart', 'barChart', 'ring',
                  'sparkline', 'donut', 'heatStrip', 'emptyChart', 'legend', 'prTimeline', 'prDetail'];
  const a = imports.find(i => i.from === './analytics.js');
  const named = a ? a.names.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean) : [];
  check('it takes only session math from analytics.js', named.every(n => PURE.includes(n)), list(named));
  IMPURE.forEach(n => {
    if (n === 'loadAll' || n === 'allSessions') {
      check('it never reaches for analytics.' + n + ' — that is the impure half',
            !named.includes(n) && !new RegExp('\\b' + n + '\\s*\\(').test(CODE));
    }
  });
  // CODE, not RAW: several of coach.js's comments name these files in order
  // to explain why it does not reach for them. A verifier that failed on its
  // own subject's documentation would teach everybody to delete the comments.
  check('and it never names store.js at all',
        !/store\.js/.test(CODE) && !/\bread\s*\(|\breadExact\s*\(|\bwrite\s*\(/.test(CODE));
  check('nor any of the app’s impure modules',
        !/(food|weight|workout|steps|water|picker|routines|settings|access|usage|admin|tdee|insights|coach-data|ui)\.js/
          .test(CODE));
}

/* ================= B. NO CLOCK, NO DICE, NO DOM ================= */
section('B. the clock is an argument, and there is no other way in');
{
  check('no Date.now()', !/Date\.now\s*\(/.test(CODE), (CODE.match(/.*Date\.now.*/) || [''])[0].trim());
  // new Date(ms) is fine and is used — new Date() with nothing in it is the
  // clock wearing a different hat.
  const argless = [...CODE.matchAll(/new\s+Date\s*\(\s*\)/g)];
  check('no argless new Date() — new Date(ms) is fine and is how date keys are built', !argless.length);
  check('no performance.now(), no Date.parse of "now"', !/performance\s*\.\s*now/.test(CODE));
  check('no Math.random() — two devices reading one log have to agree on the greeting',
        !/Math\s*\.\s*random/.test(CODE));
  ['document', 'window', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest']
    .forEach(g => check('no ' + g, !new RegExp('\\b' + g + '\\b').test(CODE),
                        (CODE.match(new RegExp('.*\\b' + g + '\\b.*')) || [''])[0].trim()));
  check('no console', !/\bconsole\s*\./.test(CODE));
  check('no setTimeout or setInterval', !/\bset(Timeout|Interval)\s*\(/.test(CODE));
  check('`now` arrives on the input rather than being taken',
        /input\.now/.test(CODE));
  /* The rotation counter is device state and it arrives the same way the clock
     does. The old seed was a TIMESTAMP divided by a thousand, which is a hash
     of the second somebody opened the app rather than a rotation — this refuses
     both the name and the arithmetic, so no caller can quietly hand a clock
     back. tools-check/coach-rotation.mjs proves the counter actually rotates. */
  check('the greeting counter arrives on the input too, and no timestamp does',
        /input\.opens/.test(CODE) && !/openMs/.test(CODE));
  check('and the rotation is a counter, not clock arithmetic',
        /function rotate\(counter, n\)/.test(CODE) && !/seed\s*\/\s*1000/.test(CODE));
}

/* ================= C. NO MODULE STATE ================= */
section('C. nothing in the file remembers anything between calls');
{
  const topLevel = CODE.split('\n').filter(l => /^(export\s+)?(let|var)\s/.test(l));
  check('no top-level let or var — a cache in a pure module answers differently the second time',
        !topLevel.length, list(topLevel.map(l => l.trim())));

  const exported = Object.keys(C).filter(k => typeof C[k] === 'object' && C[k] !== null);
  const unfrozen = exported.filter(k => !Object.isFrozen(C[k]));
  check('every exported table is frozen, so no caller can edit a registry at runtime',
        !unfrozen.length, list(unfrozen));
}

/* ================= D. DRIVEN: THE SAME INPUT IS THE SAME ANSWER ================= */
section('D. driven — same log, same clock, same sentence');
{
  const DAY = 864e5;
  // A fixed epoch, and every session below is an offset from it, so this file
  // answers the same at 2 AM in Auckland as at noon in New York.
  const NOW = 1789307130123;
  const key = ms => {
    const d = new Date(ms), p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  };
  const sets = (n, w) => Array.from({ length: n }, () => ({ w: String(w), r: '5', type: 'N', done: true }));
  const sess = (ago, rows) => ({
    id: 's' + ago, startedAt: NOW - ago * DAY, _date: key(NOW - ago * DAY),
    exercises: rows.map(([exId, group, n, w]) => ({ exId, name: exId, group, equipment: 'barbell', sets: sets(n, w) }))
  });
  const sessions = [];
  for (let w = 0; w < 11; w++) {
    sessions.push(sess(w * 7 + 3, [['barbell-bench-press', 'chest', 3, 185 + w]]));
    sessions.push(sess(w * 7 + 5, [['barbell-row', 'back', 3, 155]]));
    sessions.push(sess(w * 7 + 7, [['back-squat-high-bar', 'legs', 4, 245]]));
  }
  sessions.sort((a, b) => a.startedAt - b.startedAt);

  const input = {
    now: NOW, opens: 0, recentGreets: [], u: 'lb', log: 'readable', sessions,
    lib: {
      'barbell-bench-press': { group: 'chest', equipment: 'barbell' },
      'barbell-row':         { group: 'back',  equipment: 'barbell' },
      'back-squat-high-bar': { group: 'legs',  equipment: 'barbell' }
    },
    routines: [], live: { active: false }, tier: { pro: true },
    targets: { cal: 2300, p: 210, f: 74, auto: { rateWk: -1 } }, targetsSet: true,
    summaries: {}, steps: { days: {} },
    weight: { latestLb: 186.4, latestAt: NOW - 3 * DAY, rateWk: -0.8, rateDays: 21, goalDir: -1, goalRateWk: -1 },
    settings: { v: 1, mute: {}, answers: {}, asked: {}, lastGreet: '' }
  };
  const shot = i => {
    const c = C.coach(i);
    return JSON.stringify({
      you: [c.you.id, c.you.state, c.you.text, c.you.reason],
      train: [c.train.id, c.train.state, c.train.text],
      greet: c.greet, lead: c.lead && c.lead.id, locked: c.lockedCount,
      asks: ['topic_train', 'topic_fuel', 'topic_weight', 'topic_steps'].map(x => c.ask(x).text)
    });
  };

  const a = shot(input);
  check('the engine says something at all on a real log', a.includes('finding'), a.slice(0, 160));

  const b = shot(input);
  check('called twice with the same object, it answers identically', a === b);
  check('called on a deep copy, it answers identically', a === shot(JSON.parse(JSON.stringify(input))));

  // The thing purity is FOR: the wall clock moving does not move the answer.
  // Nothing here sleeps; the point is that `now` is the only clock in play, so
  // two calls separated by any amount of real time are the same call.
  const before = Date.now();
  const c1 = shot(input);
  while (Date.now() === before) { /* spin past a millisecond of real time */ }
  check('and again after the real clock has moved on', c1 === shot(input));

  // Moving `now` by a day DOES move it — otherwise the check above would pass
  // on an engine that ignores its input entirely.
  const tomorrow = shot({ ...input, now: NOW + DAY });
  check('moving `now` a day forward does change what it says', tomorrow !== a);

  /* The greeting is keyed on the open COUNTER and on nothing else in the clock,
     so the four or five repaints the You tab makes as its reads land cannot
     rotate the line under the reader's thumb. */
  const g1 = C.coach(input).greet.id;
  const g2 = C.coach({ ...input, now: NOW + 45000 }).greet.id;
  check('the greeting is keyed on the app OPEN, so a repaint mid-load cannot change it', g1 === g2);
  const g3 = C.coach({ ...input, opens: 1 }).greet.id;
  check('and the next open moves it', typeof g3 === 'string' && g3.length > 0 && g3 !== g1);

  // Proof the stub never got asked for anything: every number below came out of
  // the fixture, so a read would have produced an empty answer rather than this.
  check('every number in the answer came from the input, not from a read',
        /186|days|sessions|week/.test(a));
}

/* ================= E. THE PORT'S OWN CHECKLIST ================= */
section('E. what the native port copies, and what it rewrites');
{
  check('coach.js has no default export — the port copies the named tables',
        !/export\s+default/.test(CODE));
  check('the settings shape is exported from coach.js, so both halves agree on it without a second copy',
        typeof C.normSettings === 'function' && typeof C.COACH_SETTINGS_VERSION === 'number');
  check('normSettings fails safe on junk, a half-written node and null alike',
        [null, undefined, 0, 'x', [], { mute: 'no' }, { answers: { q_goal_direction: 'sideways' } }]
          .every(v => {
            const s = C.normSettings(v);
            return s && typeof s.mute === 'object' && typeof s.answers === 'object' &&
                   typeof s.asked === 'object';
          }));
  /* lastGreet is NOT in here any more, and a stored one from v42 is dropped on
     the way through. It was an async database write fired as the app opened,
     which is the one moment the page is most likely to be closed before it
     lands — so the rotation that needed it lost it exactly when it mattered.
     It is device storage on both clients now; see NEXT-NATIVE-V43.md. */
  check('and settings/coach no longer carries the greeting — that is device state on both clients',
        C.normSettings({ lastGreet: 'g_hello' }).lastGreet === undefined);
  check('and refuses an answer that is not one of the question’s own options',
        C.normSettings({ answers: { q_goal_direction: 'sideways' } }).answers.q_goal_direction === undefined &&
        C.normSettings({ answers: { q_goal_direction: 'down' } }).answers.q_goal_direction === 'down');
  check('and refuses a mute on a category that is not mutable',
        C.normSettings({ mute: { core: true, safety: true, fuel: true } }).mute.core === undefined &&
        C.normSettings({ mute: { core: true, safety: true, fuel: true } }).mute.safety === undefined &&
        C.normSettings({ mute: { fuel: true } }).mute.fuel === true);
  check('isMuted() answers false for the two categories nobody may switch off',
        C.isMuted({ mute: { core: true, safety: true } }, 'core') === false &&
        C.isMuted({ mute: { core: true, safety: true } }, 'safety') === false);

  // coach-data.js is the file the port REWRITES, and the split only holds if it
  // is the one doing the reading.
  const D = src('coach-data.js').replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  check('coach-data.js is the only half that reads the database',
        /from '\.\/store\.js'/.test(D) && /readExact\(/.test(D));
  check('and it never writes through mergeUpdate(), which swallows PERMISSION_DENIED',
        !/mergeUpdate/.test(D));
  check('and it writes settings/coach, never a new top-level node',
        /write\('settings\/coach'/.test(D) && !/write\('coach/.test(D));

  /* The rotation is device state on this client and MMKV on the next one. Both
     halves are here rather than in settings/coach because the write happens as
     the app opens and the app is routinely closed a second later — the async
     database write died with the page exactly when the value was wanted. */
  check('the greeting counter and the recent lines are device storage, not settings/coach',
        /LS\.set\(LS_OPENS/.test(D) && /LS\.set\(LS_GREETS/.test(D) &&
        !/lastGreet/.test(D) && !/patch\(\{ lastGreet/.test(D));
  check('and rememberGreeting writes synchronously, so closing the app a second after opening it keeps the line',
        /export function rememberGreeting[\s\S]{0,400}LS\.set\(LS_GREETS, recentGreets\);/.test(D) &&
        !/export function rememberGreeting[\s\S]{0,400}await/.test(D));
  check('the counter moves once per app OPEN, not once per paint',
        /export function initCoachData\(\) \{[\s\S]{0,300}readRotation\(\);/.test(D) &&
        !/export function coachInput[\s\S]{0,600}readRotation\(/.test(D));

  /* The reads go out together. Four awaited round trips in a row put the first
     card on the screen the app opens to behind three seconds of skeleton, and
     not one of them needed an answer from the one before it. */
  // Scoped to load(), which is the boot path. patchNow() and reread() await a
  // readExact each and are right to: both are one read answering one question.
  const LOAD = (D.split('async function load()')[1] || '').split('\nfunction ')[0];
  check('the load is one wave, not four — nothing awaits a read it does not depend on',
        /await Promise\.all\(\[pLog, pSettings\]\)/.test(LOAD) &&
        /await Promise\.all\(\[pTargets, pRest\]\)/.test(LOAD) &&
        !/await readExact\(/.test(LOAD) && !/await read\(/.test(LOAD));
  check('and the log has a readiness of its own, so the card speaks before food and steps land',
        /export function coachLogKnown/.test(D) && /logKnown = true;/.test(D));

  /* The snapshot is gathered once per app open, so staying current is its own
     problem. The two cheap hooks take what a caller has ALREADY read — zero
     extra requests — and the expensive one exists for the single moment that
     is worth paying for. */
  check('the two zero-cost hooks exist, so a finished workout does not leave the card a session behind',
        /export function noteCoachSessions/.test(D) && /export function noteCoachData/.test(D));
  check('noteCoachSessions refuses an empty list — allSessions() answers [] on a FAILED read too, ' +
        'and Coach must never learn "empty" from a path that cannot tell it from "unreachable"',
        /if \(!Array\.isArray\(list\) \|\| !list\.length\) return false;/.test(D));
  check('noteCoachData only ever moves targetsSet toward true, which is the only direction read() can state honestly',
        /targetsSet = true;/.test(D) && !/targetsSet = false/.test(D.split('noteCoachData')[1] || ''));
  check('a refresh that FAILS keeps the last good snapshot rather than flipping to unreadable',
        /const tree = await readExact\('workouts'\);[\s\S]{0,200}\} catch \{\}/.test(D));
  check('and the expensive refresh is coalesced, so moving a session between months reads the tree once',
        /if \(!refreshing\) refreshing = reread\(\)/.test(D));

  // The two tabs that draw the card are the ones that feed it.
  const Y = src('you.js'), W = src('workout.js');
  check('you.js hands Coach the sessions it just had out of analytics',
        /noteCoachSessions\(next\)/.test(Y));
  check('and the four small nodes it just re-read',
        /noteCoachData\(\{ entries, targets, summaries, stepDays \}\)/.test(Y));
  check('workout.js tells Coach when a session lands, is edited or is deleted',
        (W.match(/refreshCoachSessions\(\)/g) || []).length >= 2);
  check('and neither of them reads anything for Coach on a paint',
        !/initCoachData\(\)/.test(Y.split('function build()')[1] || '') &&
        !/coachInput\(/.test(Y) && !/coachInput\(/.test(W));
}

/* ================= F. COACH-BUILD.JS IS HELD TO THE SAME FENCE =================
   The workout builder is the second file the native port copies verbatim
   (src/pure/coach-build.js), so everything above applies to it too — and one
   thing more: it must never import coach.js. coach.js imports IT, and a ring
   between the two is a module graph that loads in one order on one client and
   not on the other. */
section('F. coach-build.js — the builder is copied byte for byte as well');
{
  const BRAW = src('coach-build.js');
  const BCODE = BRAW.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const imports = [...BRAW.matchAll(/^import\s+(?:([^;]*?)\s+from\s+)?['"]([^'"]+)['"];?$/gm)]
    .map(m => ({ names: (m[1] || '').trim(), from: m[2] }));
  // coach-prog.js is the sixth (v48): the targets on each row are its
  // prescribe(), and section H holds it to these same rules.
  const ALLOWED = ['./exercises.js', './analytics.js', './units.js', './blocks.js', './coach-tags.js',
                   './coach-prog.js'];
  const extra = imports.map(i => i.from).filter(f => !ALLOWED.includes(f));
  check('it imports nothing outside the six pure modules it needs', !extra.length, list(extra));
  check('and never coach.js — coach.js imports it, and a ring is a load order',
        !imports.some(i => i.from === './coach.js') && !/coach\.js'/.test(BCODE.replace(/coach-(build|tags)\.js'/g, '')));
  const a = imports.find(i => i.from === './analytics.js');
  const named = a ? a.names.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean) : [];
  check('it takes only session math from analytics.js',
        named.length > 0 && named.every(n => ['e1rm', 'isWorking', 'setVolume', 'mergeSessionExercises', 'exerciseIndex'].includes(n)),
        list(named));
  check('and never names store.js, reads or writes',
        !/store\.js/.test(BCODE) && !/\bread\s*\(|\breadExact\s*\(|\bwrite\s*\(/.test(BCODE));
  check('no clock at all — not even an argless new Date()',
        !/Date\.now\s*\(/.test(BCODE) && ![...BCODE.matchAll(/new\s+Date\s*\(\s*\)/g)].length &&
        !/performance\s*\.\s*now/.test(BCODE));
  check('no Math.random() — the same log has to build the same workout on both clients',
        !/Math\s*\.\s*random/.test(BCODE));
  ['document', 'window', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest']
    .forEach(g => check('no ' + g, !new RegExp('\\b' + g + '\\b').test(BCODE),
                        (BCODE.match(new RegExp('.*\\b' + g + '\\b.*')) || [''])[0].trim()));
  check('no console, no timers', !/\bconsole\s*\./.test(BCODE) && !/\bset(Timeout|Interval)\s*\(/.test(BCODE));
  const topLevel = BCODE.split('\n').filter(l => /^(export\s+)?(let|var)\s/.test(l));
  check('no top-level let or var — nothing remembered between proposals',
        !topLevel.length, list(topLevel.map(l => l.trim())));
  check('no default export — the port copies named functions',
        !/export\s+default/.test(BCODE));
  check('propose() is what it exports, and coach.js is what calls it',
        /export function propose\(input, opts\)/.test(BCODE) &&
        /import \{[^}]*\bpropose\b[^}]*\} from '\.\/coach-build\.js'/.test(RAW));
}

/* ================= G. COACH-LIVE.JS IS HELD TO THE SAME FENCE =================
   The in-session read is the third file the native port copies verbatim
   (src/pure/coach-live.js). Everything F asks of the builder it asks of this,
   and one thing that matters more here than anywhere: no clock of its own. A
   read of a workout in progress is exactly where Date.now() is the easy thing
   to reach for, and exactly where two renders a second apart would then
   disagree about what he should do next. */
section('G. coach-live.js — the in-session read is copied byte for byte as well');
{
  const LRAW = src('coach-live.js');
  const LCODE = LRAW.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const imports = [...LRAW.matchAll(/^import\s+(?:([^;]*?)\s+from\s+)?['"]([^'"]+)['"];?$/gm)]
    .map(m => ({ names: (m[1] || '').trim(), from: m[2] }));
  const ALLOWED = ['./exercises.js', './analytics.js', './units.js'];
  const extra = imports.map(i => i.from).filter(f => !ALLOWED.includes(f));
  check('it imports nothing outside exercises.js, analytics.js and units.js', !extra.length, list(extra));
  check('and never coach.js or coach-build.js — coach.js imports IT',
        !imports.some(i => /coach/.test(i.from)));
  const a = imports.find(i => i.from === './analytics.js');
  const named = a ? a.names.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean) : [];
  check('it takes only session math from analytics.js',
        named.length > 0 && named.every(n => ['e1rm', 'isWorking', 'setVolume', 'mergeSessionExercises', 'exerciseIndex'].includes(n)),
        list(named));
  check('and never names store.js, reads or writes',
        !/store\.js/.test(LCODE) && !/\bread\s*\(|\breadExact\s*\(|\bwrite\s*\(/.test(LCODE));
  check('no clock at all — not even an argless new Date()',
        !/Date\.now\s*\(/.test(LCODE) && ![...LCODE.matchAll(/new\s+Date\s*\(/g)].length &&
        !/performance\s*\.\s*now/.test(LCODE));
  check('no Math.random() — the same session has to read the same on both clients',
        !/Math\s*\.\s*random/.test(LCODE));
  ['document', 'window', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest']
    .forEach(g => check('no ' + g, !new RegExp('\\b' + g + '\\b').test(LCODE),
                        (LCODE.match(new RegExp('.*\\b' + g + '\\b.*')) || [''])[0].trim()));
  check('no console, no timers', !/\bconsole\s*\./.test(LCODE) && !/\bset(Timeout|Interval)\s*\(/.test(LCODE));
  const topLevel = LCODE.split('\n').filter(l => /^(export\s+)?(let|var)\s/.test(l));
  check('no top-level let or var — nothing remembered between reads',
        !topLevel.length, list(topLevel.map(l => l.trim())));
  check('no default export — the port copies named functions', !/export\s+default/.test(LCODE));
  check('liveRead() is what it exports, and coach.js is what calls it',
        /export function liveRead\(input\)/.test(LCODE) &&
        /import \{[^}]*\bliveRead\b[^}]*\} from '\.\/coach-live\.js'/.test(RAW));
  check('and it never writes to the live session it is handed — no assignment through `session.` or `.sets`',
        !/\bsession\.[\w.]+\s*=[^=]/.test(LCODE) && !/\.sets\s*=[^=]/.test(LCODE) &&
        !/\.(push|splice|pop|shift|unshift|sort|reverse)\(/.test(
          (LCODE.match(/i\.session[^\n]*/g) || []).join('\n')));
}

/* ================= H. COACH-PROG.JS IS HELD TO THE SAME FENCE =================
   v48's targets are the fourth file the native port copies verbatim
   (src/pure/coach-prog.js), and the one that names a weight to put on a bar —
   so a clock or a cache here is a target that changes between two paints. It
   may reach coach-goal.js, units.js, exercises.js, coach-tags.js and the pure
   half of analytics.js, and nothing else; coach-build.js imports it, and
   nothing reaches back. */
section('H. coach-prog.js — the targets are copied byte for byte as well');
{
  const PRAW = src('coach-prog.js');
  const PCODE = PRAW.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const imports = [...PRAW.matchAll(/^import\s+(?:([^;]*?)\s+from\s+)?['"]([^'"]+)['"];?$/gm)]
    .map(m => ({ names: (m[1] || '').trim(), from: m[2] }));
  const ALLOWED = ['./coach-goal.js', './units.js', './exercises.js', './coach-tags.js', './analytics.js'];
  const extra = imports.map(i => i.from).filter(f => !ALLOWED.includes(f));
  check('it imports nothing outside coach-goal.js, units.js, exercises.js, coach-tags.js and analytics.js',
        !extra.length, list(extra));
  check('and never coach.js, coach-build.js or coach-live.js — the builder imports IT',
        !imports.some(i => /coach(-build|-live)?\.js$/.test(i.from)));
  const a = imports.find(i => i.from === './analytics.js');
  const named = a ? a.names.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean) : [];
  check('it takes only the pure half of analytics.js — e1rm, isWorking, mergeSessionExercises',
        named.length > 0 && named.every(n => ['e1rm', 'isWorking', 'mergeSessionExercises'].includes(n)), list(named));
  check('and never names store.js, reads or writes',
        !/store\.js/.test(PCODE) && !/\bread\s*\(|\breadExact\s*\(|\bwrite\s*\(/.test(PCODE) &&
        !/\b(loadAll|allSessions)\s*\(/.test(PCODE));
  check('no clock of its own — no Date.now(), no argless new Date(), no performance.now()',
        !/Date\.now\s*\(/.test(PCODE) && ![...PCODE.matchAll(/new\s+Date\s*\(\s*\)/g)].length &&
        !/performance\s*\.\s*now/.test(PCODE));
  check('`now` arrives on the context rather than being taken', /c\.now/.test(PCODE));
  check('no Math.random() — the same log has to name the same weight on both clients',
        !/Math\s*\.\s*random/.test(PCODE));
  ['document', 'window', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest']
    .forEach(g => check('no ' + g, !new RegExp('\\b' + g + '\\b').test(PCODE),
                        (PCODE.match(new RegExp('.*\\b' + g + '\\b.*')) || [''])[0].trim()));
  check('no console, no timers', !/\bconsole\s*\./.test(PCODE) && !/\bset(Timeout|Interval)\s*\(/.test(PCODE));
  const topLevel = PCODE.split('\n').filter(l => /^(export\s+)?(let|var)\s/.test(l));
  check('no top-level let or var — nothing remembered between targets', !topLevel.length, list(topLevel.map(l => l.trim())));
  check('no default export — the port copies named functions', !/export\s+default/.test(PCODE));
  check('prescribe() and exposuresFor() are what it exports',
        /export function prescribe\(ex, ctx\)/.test(PRAW) && /export function exposuresFor\(sessions, exId\)/.test(PRAW));

  // Driven: the same log is the same target, the wall clock moves nothing,
  // and `now` does.
  const P = await import(pathToFileURL(join(dir, 'coach-prog.mjs')).href);
  const DAY = 864e5, NOW = 1789307130123;
  const set = (w, r) => ({ w: String(w), r: String(r), type: 'N', done: true });
  const log = [175, 180, 180, 185, 185].map((w, i) => ({ id: 'p' + i, startedAt: NOW - (19 - 4 * i) * DAY,
    exercises: [{ exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell',
                  sets: [set(w, i % 2 ? 8 : 12), set(w, i % 2 ? 8 : 12), set(w, i % 2 ? 8 : 12)] }] }));
  const ex = { exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell',
               exposures: P.exposuresFor(log, 'barbell-bench-press'), groupDaysSince: 3 };
  const shot = now => JSON.stringify(P.prescribe(ex, { now, u: 'lb' }));
  const one = shot(NOW);
  check('the engine names a target on a real log', /Target:/.test(one), one.slice(0, 120));
  const before = Date.now();
  while (Date.now() === before) { /* spin past a millisecond of real time */ }
  check('and the same one again after the real clock has moved', one === shot(NOW));
  check('moving `now` three weeks moves it — the clock it reads is the argument',
        one !== shot(NOW + 21 * DAY));
}

/* ================= I. COACH-GOAL.JS — THE DIALS, AND NOTHING ELSE ================= */
section('I. coach-goal.js — imports nothing, remembers nothing, and its tables cannot be edited');
{
  const GRAW = src('coach-goal.js');
  const GCODE = GRAW.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const imports = [...GRAW.matchAll(/^import\s+(?:([^;]*?)\s+from\s+)?['"]([^'"]+)['"];?$/gm)].map(m => m[2]);
  check('it imports nothing, or units.js at most', imports.every(f => f === './units.js'), list(imports));
  check('no clock at all, no dice, no DOM, no storage, no console',
        !/Date\.|new\s+Date|performance\s*\.|Math\s*\.\s*random|\b(document|window|navigator|localStorage|sessionStorage|fetch)\b|\bconsole\s*\./.test(GCODE));
  check('no top-level let or var', !GCODE.split('\n').some(l => /^(export\s+)?(let|var)\s/.test(l)));
  check('no default export', !/export\s+default/.test(GCODE));
  const G = await import(pathToFileURL(join(ROOT, 'coach-goal.js')).href);
  const tables = Object.keys(G).filter(k => typeof G[k] === 'object' && G[k] !== null);
  check('every exported table is frozen (' + tables.join(', ') + ')',
        tables.length >= 3 && tables.every(k => Object.isFrozen(G[k])), list(tables.filter(k => !Object.isFrozen(G[k]))));
  check('and the only modules importing it are coach.js and coach-prog.js — nothing it imports reaches back',
        /from '\.\/coach-goal\.js'/.test(src('coach.js')) && /from '\.\/coach-goal\.js'/.test(src('coach-prog.js')) &&
        !/from '\.\/coach-goal\.js'/.test(src('coach-build.js')) && !/from '\.\/coach-goal\.js'/.test(src('coach-live.js')));
}

/* ---------- report ---------- */
console.log('\ncoach.js can still be copied byte for byte\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
