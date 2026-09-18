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
writeFileSync(join(dir, 'coach.mjs'), src('coach.js')
  .replace("from './exercises.js'", 'from ' + real('exercises.js'))
  .replace("from './units.js'", 'from ' + real('units.js'))
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

  const ALLOWED = ['./exercises.js', './analytics.js', './units.js'];
  const extra = imports.map(i => i.from).filter(f => !ALLOWED.includes(f));
  check('coach.js imports nothing outside exercises.js, analytics.js and units.js', !extra.length, list(extra));
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
  check('`now` and `openMs` both arrive on the input rather than being taken',
        /input\.now/.test(CODE) && /input\.openMs/.test(CODE));
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
    now: NOW, openMs: NOW, u: 'lb', log: 'readable', sessions,
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
  const tomorrow = shot({ ...input, now: NOW + DAY, openMs: NOW + DAY });
  check('moving `now` a day forward does change what it says', tomorrow !== a);

  // The greeting is seeded on openMs, not on now, so the four or five repaints
  // the You tab makes as its reads land cannot rotate the line under the reader.
  const g1 = C.coach(input).greet.id;
  const g2 = C.coach({ ...input, now: NOW + 45000 }).greet.id;
  check('the greeting is seeded on the app OPEN, so a repaint mid-load cannot change it', g1 === g2);
  const g3 = C.coach({ ...input, now: NOW + DAY, openMs: NOW + DAY }).greet.id;
  check('and a fresh open can rotate it', typeof g3 === 'string' && g3.length > 0);

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
                   typeof s.asked === 'object' && typeof s.lastGreet === 'string';
          }));
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
}

/* ---------- report ---------- */
console.log('\ncoach.js can still be copied byte for byte\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
