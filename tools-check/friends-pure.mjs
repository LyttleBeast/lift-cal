#!/usr/bin/env node
//
// Verifier for Friends' two pure modules (rack-v67): friends-core.js (codes,
// kinds, names, the switches, the routine payload) and friends-summary.js
// (what one account shows another, built and read back, and the boards).
//
//   node tools-check/friends-pure.mjs
//
//   A  codes: the shape is the rules' key, generation is uniform (rejection
//      sampling, not a biased modulo), typing is forgiving and guessing is
//      not, and the lifetime is the rules' own number
//   B  names, kinds and the switches: what is cleaned, what is live, what is
//      on by default and what "absent" means
//   C  my own node, read back: unknown kinds hidden, leftovers found
//   D  the routine payload: only the plan travels, the bounds are the rules',
//      and a routine received is re-checked and re-homed in my library
//   E  the summaries: built from the app's own numbers — PR events from the
//      REAL analytics.js prTimeline() — small, bounded, and exactly what the
//      checkbox implies
//   F  reading a friend's: a stale summary shifts and goes unknown rather
//      than zero, and a hostile one is clamped or dropped
//   G  the boards: ranking, ties, me always on, the missing named
//   H  every payload these modules build is one the REAL rules accept, and
//      the bounds written down here are the rules' bounds
//
// Pure modules are imported as they are; analytics.js is staged over the
// shared fake store (lib/stage.mjs). The rules are read from the file Micah
// pastes and run by lib/rules-engine.mjs.

import { readFileSync } from 'node:fs';
import { stage, harness, J } from './lib/stage.mjs';
import { createDb, SERVER_TIMESTAMP as TS } from './lib/rules-engine.mjs';

const { check, section, done } = harness('Friends: the pure modules');
const C = await import(new URL('../friends-core.js', import.meta.url).href);
const S = await import(new URL('../friends-summary.js', import.meta.url).href);
const X = await import(new URL('../exercises.js', import.meta.url).href);
const RULES = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8'));
const SOCIAL = RULES.rules.social;
const st = stage(['analytics.js', 'exercises.js', 'ui.js', 'units.js']);
const A = await st.load('analytics.js');

/* ================= A ================= */
section('A. codes');
{
  // The source the app hands in: crypto.getRandomValues, a byte at a time.
  const pool = new Uint8Array(1); const rnd = () => { globalThis.crypto.getRandomValues(pool); return pool[0]; };
  const codes = Array.from({ length: 4000 }, () => C.makeCode(rnd));
  check('every code is the rules\' key shape, XXXX-XXXX', codes.every(c => C.CODE_RE.test(c)));
  check('CODE_RE is the regex the rules hold codes to, character for character',
    SOCIAL.codes.$code['.validate'].includes(C.CODE_RE.source.replace(/\//g, '')) &&
    SOCIAL.people.$uid.req.$from.c['.validate'].includes(C.CODE_RE.source));
  check('the alphabet has no 0 O 1 I L', ![...'0O1IL'].some(ch => C.CODE_ALPHABET.includes(ch)) && C.CODE_ALPHABET.length === 31);
  const counts = {};
  for (const c of codes) for (const ch of c.replace('-', '')) counts[ch] = (counts[ch] || 0) + 1;
  const n = codes.length * 8, exp = n / 31;
  const chi = Object.values(counts).reduce((s, k) => s + (k - exp) ** 2 / exp, 0);
  check('generation is uniform across the alphabet (chi² ' + chi.toFixed(1) + ' on 30 df; a 1-in-1000 tail is 59.7)', Object.keys(counts).length === 31 && chi < 59.7);
  // the modulo bias rejection sampling removes: bytes 248..255
  let k = 0; const seq = [255, 250, 248, 0, 1, 2, 3, 4, 5, 6, 7];
  check('bytes 248–255 are thrown away, not folded into the first letters', C.makeCode(() => seq[k++]) === '2345-6789', 'got ' + (k = 0, C.makeCode(() => seq[k++])));
  let threw = false; try { C.makeCode(() => 255); } catch { threw = true; }
  check('a source that never yields a usable byte throws rather than looping or making a weak code', threw);
  check('typing is forgiving: lower case, spaces, no hyphen', C.normCode(' abcd efgh ') === 'ABCD-EFGH' && C.normCode('abcdefgh') === 'ABCD-EFGH' && C.normCode('ABCD-EFGH') === 'ABCD-EFGH');
  check('a character the alphabet lacks is a wrong code, never a guess at what was meant', ['ABCD-EFG0', 'ABCD-EFGO', 'ABCD-EFG1', 'ABCD-EFGI', 'ABCD-EFGL'].every(x => C.normCode(x) === null));
  check('the wrong length is no code', [null, '', 'ABC', 'ABCD-EFGHJ', 'ABCD-EFG', 42].every(x => C.normCode(x) === null));
  check('CODE_TTL_MS is the rules\' own day (86400000), in the code\'s read rule and the request\'s',
    C.CODE_TTL_MS === 86400000 && SOCIAL.codes.$code['.read'].includes('now - 86400000') && SOCIAL.people.$uid.req.$from['.write'].includes('now - 86400000'));
  const at = 1790000000000;
  check('codeLeft counts down from the server stamp and stops at 0', C.codeLeft(at, at) === C.CODE_TTL_MS && C.codeLeft(at, at + 3600e3) === C.CODE_TTL_MS - 3600e3 && C.codeLeft(at, at + C.CODE_TTL_MS) === 0 && C.codeLeft(at, at + 9e9) === 0);
  check('and a code with no readable time has none left', C.codeLeft(null, at) === 0 && C.codeLeft(NaN, at) === 0 && C.codeLeft('x', at) === 0);
  check('leftWords reads like a person', C.leftWords(23.5 * 3600e3) === '23 h' && C.leftWords(40 * 60e3) === '40 min' && C.leftWords(30e3) === 'under a minute' && C.leftWords(0) === 'expired');
}

/* ================= B ================= */
section('B. names, kinds and the switches');
{
  check('a name is trimmed and its inner whitespace collapsed', C.cleanName('  Ann   Marie \n Smith ') === 'Ann Marie Smith');
  check('control and bidi-override characters are taken out (no reversed or hidden text)', C.cleanName('Ann‮evil\u0000​') === 'Annevil');
  check('at most 40 UTF-16 units — the stricter reading of the rules\' .length — and never half an emoji',
    C.cleanName('😀'.repeat(50)).length === 40 && C.cleanName('a' + '😀'.repeat(50)).length === 39 && C.fit('ab😀', 3) === 'ab');
  check('never empty', C.cleanName('   ') === 'A friend' && C.cleanName(null, 'X') === 'X');
  check('NAME_MAX is the rules\' bound on every `n`', C.NAME_MAX === 40 && SOCIAL.codes.$code.n['.validate'].includes('<= 40') && SOCIAL.shared.$uid.me.n['.validate'].includes('<= 40'));
  check('initials', C.initialsOf('Ann Marie Smith') === 'AS' && C.initialsOf('bob') === 'B' && C.initialsOf('') === '–');
  check('friend is the only live kind; coach and team are reserved, not live', C.liveKind('friend') === 'friend' && C.liveKind('coach') === null && C.liveKind('team') === null && C.liveKind('constructor') === null && C.liveKind(undefined) === null);
  check('and the rules agree: a code accepts no kind but friend', SOCIAL.codes.$code.k['.validate'] === "newData.val() === 'friend'");
  check('the five switches, in order: PRs, training days, steps, macros, weight', J(C.SHARE_IDS) === J(['pr', 'td', 'st', 'mac', 'wt']));
  check('and they are exactly the switches the rules name', J(Object.keys(SOCIAL.people.$uid.share.$fid).filter(k => !k.startsWith('.') && k !== '$other').sort()) === J(C.SHARE_IDS.slice().sort()));
  check('on by default: PRs, training days and steps; off: macros and weight', J(C.defaultShare()) === J({ pr: true, td: true, st: true, mac: false, wt: false }));
  check('only `true` is on — absent, "yes", 1 and null are off, as the rules read it',
    J(C.normShare({ pr: 'yes', td: 1, st: null, mac: true })) === J({ pr: false, td: false, st: false, mac: true, wt: false }) && J(C.normShare(null)) === J(C.normShare({})));
  check('the node written holds only the switches that are on, and nothing at all when none is', J(C.shareNode({ pr: true, wt: false })) === J({ pr: true }) && C.shareNode({}) === null);
  check('a category is published when at least one friend has it on, and only then',
    J(C.wantedCats({ a: { pr: true }, b: { wt: true, pr: true }, c: {} })) === J(['pr', 'wt']) && J(C.wantedCats({})) === J([]));
  let bad = false; try { C.PATH.link('a/b', 'c'); } catch { bad = true; }
  check('a path is never built from an id with a / . # $ [ ] in it', bad && C.PATH.slot('x', 'y') === 'social/inbox/x/y');
}

/* ================= C ================= */
section('C. my own node, read back');
{
  const node = {
    code: 'ABCD-EFGH',
    list: { b: { k: 'friend', n: '  Bob ', at: 5 }, z: { k: 'coach', n: 'Zed', at: 6 }, j: null },
    share: { b: { pr: true }, gone: { pr: true } },
    req: { c: { n: 'Cat', c: 'ABCD-EFGH', k: 'friend', at: 9 }, b: { n: 'Bob', c: 'X', k: 'friend', at: 1 }, q: { n: 'Q', k: 'team', at: 2 } },
    out: { d: { n: 'Dan', at: 3 }, b: { n: 'Bob', at: 1 } }
  };
  const p = C.readPeople(node);
  check('a connection of a kind this build does not offer is not drawn (fails closed)', J(p.friends.map(f => f.uid)) === J(['b']));
  check('names are cleaned on the way in', p.friends[0].name === 'Bob');
  check('each friend carries my switches for them', p.friends[0].share.pr === true && p.friends[0].share.wt === false);
  check('a request from somebody already a friend is flagged for tidying; one of an unknown kind is dropped', J(p.incoming.map(r => [r.uid, r.already])) === J([['c', false], ['b', true]]));
  check('so is my request to somebody already a friend', J(p.outgoing.map(o => [o.uid, o.already])) === J([['d', false], ['b', true]]));
  check('switches left for nobody (declined, cancelled) are found', J(p.orphanShares) === J(['gone']));
  check('the pointer is read only when it is a code', p.code === 'ABCD-EFGH' && C.readPeople({ code: '../x' }).code === null);
  check('an empty or junk node is no friends, not a throw', C.readPeople(null).friends.length === 0 && C.readPeople({ list: 'x', req: [1] }).friends.length === 0);
}

/* ================= D ================= */
section('D. the routine payload — only the plan travels');
{
  const mine = {
    id: 'r1', name: '  Push A  ', note: 'Heavy', created: 1, lastUsed: 99, uses: 12, secret: 'x',
    exercises: [
      { exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', equipment: 'barbell', block: 1, history: [1],
        sets: [{ tw: '225', tr: '5', type: 'W', w: '135', done: true, rir: 2 }, { tw: 185, tr: 8, type: 'D' }, { tw: '135', tr: '6', type: 'D', dp: 1 }, { tw: '95', tr: '5', type: 'N', dp: 1 }] },
      { exId: 'custom-my-kickback-ab12c', name: 'My Kickback', group: 'arms', equipment: 'cable', sets: [] },
      { exId: 'Imported Thing!', name: 'Imported Thing', group: 'nope', sets: [{ type: 'Q', tw: 'abc', tr: '1e9' }] }
    ]
  };
  const p = C.routinePayload(mine);
  check('it builds', p.ok, p.why);
  const r = p.r;
  check('only name, note and exercises travel — not when I used it, how often, or anything else', J(Object.keys(r).sort()) === J(['exercises', 'name', 'note']) && r.name === 'Push A');
  check('an exercise is its id, name, group, equipment, block and sets — no history', J(Object.keys(r.exercises[0]).sort()) === J(['block', 'equipment', 'exId', 'group', 'name', 'sets']));
  check('a set is its targets and type — not done, not a logged weight, not an effort rating', J(Object.keys(r.exercises[0].sets[0]).sort()) === J(['tr', 'tw', 'type']));
  check('targets travel as the text a routine stores', r.exercises[0].sets[1].tw === '185' && r.exercises[0].sets[1].tr === '8');
  check('a drop continues the drop set above it only as a D under a D', r.exercises[0].sets[2].dp === 1 && !('dp' in r.exercises[0].sets[3]));
  check('an exercise with no sets goes with one blank one (the rules want sets)', r.exercises[1].sets.length === 1 && r.exercises[1].sets[0].type === 'N');
  check('an id the rules cannot take travels as a custom id of the name; a group that is not the app\'s as core; a junk target as blank',
    r.exercises[2].exId === 'custom-imported-thing' && r.exercises[2].group === 'core' && r.exercises[2].sets[0].tw === '' && r.exercises[2].sets[0].type === 'N' && !('equipment' in r.exercises[2]));
  const many = { name: 'Big', exercises: Array.from({ length: 31 }, () => ({ exId: 'squat', name: 'Squat', group: 'legs', sets: [{ type: 'N' }] })) };
  check('31 exercises is refused in words, with the limit', !C.routinePayload(many).ok && /at most 30/.test(C.routinePayload(many).why));
  const longSets = { name: 'Big', exercises: [{ exId: 'squat', name: 'Squat', group: 'legs', sets: Array.from({ length: 31 }, () => ({ type: 'N' })) }] };
  check('so is an exercise of 31 sets', !C.routinePayload(longSets).ok && /31 sets/.test(C.routinePayload(longSets).why));
  check('an empty routine is refused, and so is nothing', !C.routinePayload({ name: 'x', exercises: [] }).ok && !C.routinePayload(null).ok);
  check('ROUTINE_MAX is the rules\' bound', C.ROUTINE_MAX.exercises === 30 && C.ROUTINE_MAX.sets === 30 &&
    SOCIAL.inbox.$to.$from.r.exercises.$e['.validate'].includes('/^[12]?[0-9]$/') && SOCIAL.inbox.$to.$from.r.exercises.$e.sets.$s['.validate'].includes('/^[12]?[0-9]$/'));

  // Receiving it.
  const lib = [...X.EXERCISES.slice(0, 50), { id: 'custom-kick-zz999', name: 'My Kickback', group: 'arms', equipment: 'cable', custom: true }];
  let made = 0;
  const makeCustom = (name, group, equipment) => ({ ...X.makeCustomExercise(name, group, equipment), id: 'custom-new-' + (++made) });
  const got = C.receivedRoutine({ n: 'Sam', r }, { library: lib, makeCustom, newId: 'rNEW', nowMs: 5, fromName: 'Sam' });
  check('it becomes a routine of mine, with my id and fresh counters', got && got.routine.id === 'rNEW' && got.routine.uses === 0 && got.routine.lastUsed === 0 && got.routine.created === 5);
  check('a built-in keeps its id', got.routine.exercises[0].exId === 'barbell-bench-press');
  check('the sender\'s custom is matched to mine by name and group, not by their id', got.routine.exercises[1].exId === 'custom-kick-zz999');
  check('one I have nothing like becomes a new custom of mine — and is handed back, to add first and to name on screen',
    got.customs.length === 1 && got.customs[0].name === 'Imported Thing' && got.routine.exercises[2].exId === got.customs[0].id && got.customs[0].custom === true);
  check('my note says who it came from when it carried none', C.receivedRoutine({ r: { ...r, note: undefined } }, { library: lib, makeCustom, newId: 'r2', fromName: 'Sam' }).routine.note === 'From Sam');
  check('the drop set survives the trip', got.routine.exercises[0].sets[2].dp === 1);
  check('a junk payload is nothing, not a throw', C.receivedRoutine(null, {}) === null && C.receivedRoutine({ r: { name: 'x', exercises: 'no' } }, {}) === null);
  // The database hands back a sparse list as an object keyed '0', '1', …
  const asObj = { name: 'Obj', exercises: { 0: { exId: 'barbell-squat', name: 'Squat', group: 'legs', sets: { 1: { tw: '1', tr: '2', type: 'N' }, 0: { tw: '3', tr: '4', type: 'W' } } } } };
  const po = C.routinePayload(asObj);
  check('a list read back as an index-keyed object is read as the list, in index order', po.ok && po.r.exercises.length === 1 && J(po.r.exercises[0].sets.map(x => x.type)) === J(['W', 'N']));
}

/* ================= E ================= */
section('E. the summaries — the app\'s own numbers, small');
{
  const TODAY = '2026-10-20';
  // The real prTimeline over a fixture: three bench sessions, rising.
  const sess = (date, w, r) => ({ _date: date, startedAt: Date.parse(date + 'T10:00:00'), exercises: [
    { exId: 'barbell-bench-press', name: 'Barbell Bench Press', group: 'chest', sets: [{ w: String(w), r: String(r), type: 'N', done: true }] }] });
  const sessions = [sess('2026-08-01', 185, 5), sess('2026-10-05', 205, 5), sess('2026-10-18', 225, 5), sess('2026-10-19', 225, 3)];
  const tl = A.prTimeline(sessions);
  const pr = S.prPart(tl, TODAY);
  check('PR events come from analytics.js prTimeline() — the app\'s one definition — inside the 35 days only',
    pr.ev.length === 2 && pr.ev[0].d === '2026-10-18' && pr.ev[1].d === '2026-10-05', J(pr.ev));
  check('each is the lift, its weight and reps, and the date — nothing more', J(Object.keys(pr.ev[0]).sort()) === J(['d', 'r', 'w', 'x']) && pr.ev[0].w === 225 && pr.ev[0].r === 5);
  const flood = Array.from({ length: 60 }, (_, i) => ({ date: S.addDays(TODAY, -(i % 30)), name: 'Lift ' + i, kind: 'weight', value: 100 + i }));
  check('at most 30, newest first', S.prPart(flood, TODAY).ev.length === 30 && S.prPart(flood, TODAY).ev[0].d === TODAY);
  const td = S.trainedPart(sessions.map(s => s._date), TODAY);
  check('training days: 35 characters ending today, a 1 for each day trained', td.end === TODAY && td.b.length === 35 && td.b[34] === '0' && td.b[33] === '1' && td.b[32] === '1' && (td.b.match(/1/g) || []).length === 3);
  const steps = {}; for (let i = 0; i < 40; i++) steps[S.addDays(TODAY, -i)] = { steps: i === 3 ? 0 : 100000 + i };
  const stp = S.stepsPart(steps, TODAY);
  check('steps: 35 fields, a day with none empty, each capped at 100,000', stp.d.split(',').length === 35 && stp.d.split(',')[31] === '' && stp.d.split(',')[34] === '100000');
  check('and at its very longest it is ' + stp.d.length + ' characters — inside the rules\' 250', stp.d.length <= 250);
  const sums = {
    [S.addDays(TODAY, -1)]: { cal: 2400, p: 190 },   // both
    [S.addDays(TODAY, -2)]: { cal: 2400, p: 100 },   // calories only
    [S.addDays(TODAY, -3)]: { cal: 3500, p: 190 },   // protein only
    [S.addDays(TODAY, -4)]: { cal: 3500, p: 50 },    // neither
    [TODAY]: { cal: 2400, p: 190 }                   // today: not complete, not counted
  };
  const mac = S.macroPart(sums, { cal: 2400, p: 200 }, TODAY);
  check('macros: 30 complete days ending yesterday, one letter each', mac.end === S.addDays(TODAY, -1) && mac.b.length === 30 && mac.b.slice(-4) === 'xpcb' && mac.b.slice(0, 26) === '.'.repeat(26));
  check('calories land within 10%, protein at 90% (the app\'s protein rule)',
    S.macroPart({ [S.addDays(TODAY, -1)]: { cal: 2640, p: 180 } }, { cal: 2400, p: 200 }, TODAY).b.endsWith('b') &&
    S.macroPart({ [S.addDays(TODAY, -1)]: { cal: 2641, p: 179 } }, { cal: 2400, p: 200 }, TODAY).b.endsWith('x'));
  check('no targets is no summary — not thirty misses', S.macroPart(sums, null, TODAY) === null && S.macroPart(sums, { cal: 0 }, TODAY) === null);
  check('and it carries no calorie, no gram, no target', J(Object.keys(mac).sort()) === J(['b', 'end']));
  check('weight: the trend, its rate, the goal and its direction — rounded, and nothing else',
    J(S.weightPart({ tw: 182.437, rateWk: -0.8123, goalLb: 175.04, dir: -1 })) === J({ tw: 182.4, rate: -0.81, goal: 175, dir: -1 }));
  check('no trend, no weight summary; a goal or a rate out of range is left out', S.weightPart({ tw: null }) === null &&
    J(S.weightPart({ tw: 180, rateWk: 50, goalLb: 9000 })) === J({ tw: 180, rate: 10 }));
}

/* ================= F ================= */
section('F. reading a friend\'s — shifted, unknown not zero, hostile clamped');
{
  const TODAY = '2026-10-20';
  const td = { end: S.addDays(TODAY, -3), b: '0'.repeat(30) + '11011' };
  const r = S.readTrained(td, TODAY, 7);
  // b ends …11011 on day end = today−3: today−6 is b[31] = 1, today−5 b[32] = 0,
  // today−4 b[33] = 1, today−3 b[34] = 1, and the last three it never saw.
  check('a summary three days old covers four of my seven days; the other three are unknown (null), not untrained', J(r.strip) === J([1, 0, 1, 1, null, null, null]), J(r.strip));
  check('and counts only what it covers', r.value === (r.strip.filter(x => x === 1).length) && r.known === 4);
  check('a strip of the wrong shape is nothing', S.readTrained({ end: TODAY, b: '1'.repeat(34) }, TODAY, 7) === null && S.readTrained({ end: 'x', b: '1'.repeat(35) }, TODAY, 7) === null);
  const st = { end: TODAY, d: Array(35).fill('').map((_, i) => (i >= 28 ? '999999' : '')).join(',') };
  const s7 = S.readSteps(st, TODAY, 7);
  check('steps are clamped to 100,000 a day however they were written', s7.best === 100000 && s7.value === 700000 && s7.logged === 7);
  check('steps of the wrong shape are nothing', S.readSteps({ end: TODAY, d: '1,2,3' }, TODAY, 7) === null && S.readSteps({ end: TODAY, d: Array(35).fill('1234567').join(',') }, TODAY, 7) === null);
  const pr = { ev: { 0: { d: TODAY, x: 'X'.repeat(500), w: 99999, r: -4 }, 1: { d: '2020-01-01', x: 'Old', w: 100, r: 1 }, 2: { d: TODAY, x: 'Bad', w: 'heavy', r: 1 }, 3: 'junk' } };
  const rp = S.readPRs(pr, TODAY, 7);
  check('a PR read back is cut, clamped, and only inside the window; junk events are dropped', rp.value === 1 && rp.list[0].x.length === 60 && rp.list[0].w === 2000 && rp.list[0].r === 0);
  check('macros count what they say', J(S.readMacros({ end: TODAY, b: '.'.repeat(26) + 'xpcb' })) === J({ end: TODAY, strip: [...('.'.repeat(26) + 'xpcb')], logged: 4, cal: 2, p: 2, both: 1 }));
  check('weight read back is clamped, and nothing without a trend', J(S.readWeight({ tw: 180, rate: -99, goal: 20000, dir: 7 })) === J({ tw: 180, rate: -10, goal: null, dir: null }) && S.readWeight({ tw: 5 }) === null);
  check('how long ago, from the server stamp', S.agoWords(1e12, 1e12 + 1000) === 'today' && S.agoWords(1e12, 1e12 + 864e5) === 'yesterday' && S.agoWords(1e12, 1e12 + 5 * 864e5) === '5 days ago' && S.agoWords(null, 1) === null);
}

/* ================= G ================= */
section('G. the boards');
{
  const TODAY = '2026-10-20';
  const tdOf = n => ({ end: TODAY, b: '0'.repeat(35 - n) + '1'.repeat(n) });
  const people = [
    { uid: 'me', name: 'Micah', me: true, data: { td: tdOf(3) } },
    { uid: 'a', name: 'Ann', data: { td: tdOf(5) } },
    { uid: 'b', name: 'Bob', data: { td: tdOf(3) } },
    { uid: 'c', name: 'Cat', data: { td: tdOf(1) } },
    { uid: 'd', name: 'Dan', data: {} }
  ];
  const b = S.board('td', people, TODAY, 7);
  check('ranked by value, highest first, with standard competition ranks (1, 2, 2, 4)', J(b.rows.map(r => [r.name, r.value, r.rank])) === J([['Ann', 5, 1], ['Bob', 3, 2], ['Micah', 3, 2], ['Cat', 1, 4]]));
  check('a friend who does not show it is named, not drawn at zero', J(b.missing) === J(['Dan']));
  check('I am on my own board even with nothing to show', S.board('st', [{ uid: 'me', name: 'Micah', me: true, data: {} }], TODAY, 7).rows[0].me === true);
  const st = { end: TODAY, d: Array(35).fill('10000').join(',') };
  const sb = S.board('st', [{ uid: 'me', name: 'M', me: true, data: { st } }], TODAY, 30);
  check('steps rank by the window\'s total', sb.rows[0].value === 300000 && sb.rows[0].read.avg === 10000);
  check('weight and macros are never boards', J(S.BOARDS.map(x => x.id)) === J(['pr', 'td', 'st']) && S.board('wt', people, TODAY, 7).rows.length === 0 && S.board('mac', people, TODAY, 7).rows.length === 0);
  check('the windows are a week and thirty days', J(S.WINDOWS.map(w => w.days)) === J([7, 30]));
}

/* ================= H ================= */
section('H. every payload built here is one the real rules accept');
{
  const db = createDb(RULES, { now: 1790000000000 });
  for (const u of ['uA', 'uB']) db.poke('access/approved/' + u, { at: 1, via: 'owner' });
  const a = db.client({ uid: 'uA' }), b = db.client({ uid: 'uB' });
  let i = 0; const seq = () => [3, 9, 27, 81, 243, 200, 100, 50][i++ % 8];
  const code = C.makeCode(seq);
  const r1 = a.update('', { [C.PATH.code(code)]: { u: 'uA', n: C.cleanName('😀'.repeat(60)), k: 'friend', at: TS }, [C.PATH.myCode('uA')]: code });
  check('a generated code, with the longest name cleanName() allows, is accepted', r1.ok, r1.why);
  const r2 = b.update('', {
    [C.PATH.req('uA', 'uB')]: { n: C.cleanName('B'), c: code, k: 'friend', at: TS }, [C.PATH.code(code)]: null,
    [C.PATH.out('uB', 'uA')]: { n: 'A', at: TS }, [C.PATH.share('uB', 'uA')]: C.shareNode(C.defaultShare())
  });
  check('a request with the default switches is accepted', r2.ok, r2.why);
  const r3 = a.update('', {
    [C.PATH.link('uA', 'uB')]: { k: 'friend', n: 'B', at: TS }, [C.PATH.link('uB', 'uA')]: { k: 'friend', n: 'A', at: TS },
    [C.PATH.req('uA', 'uB')]: null, [C.PATH.out('uB', 'uA')]: null, [C.PATH.share('uA', 'uB')]: C.shareNode({ pr: true, td: true, st: true, mac: true, wt: true })
  });
  check('a confirm with every switch on is accepted', r3.ok, r3.why);
  const TODAY = '2026-10-20';
  const flood = Array.from({ length: 60 }, (_, k) => ({ date: S.addDays(TODAY, -(k % 34)), name: 'L'.repeat(80), kind: 'e1rm', value: 0, set: { w: '1999.99', r: '100' } }));
  const steps = {}; for (let k = 0; k < 40; k++) steps[S.addDays(TODAY, -k)] = { steps: 100000 };
  const sums = {}; for (let k = 0; k < 40; k++) sums[S.addDays(TODAY, -k)] = { cal: 2400 + k, p: 200 };
  const parts = {
    me: { n: C.cleanName('M'.repeat(80)) },
    pr: S.prPart(flood, TODAY),
    td: S.trainedPart(Array.from({ length: 40 }, (_, k) => S.addDays(TODAY, -k)), TODAY),
    st: S.stepsPart(steps, TODAY),
    mac: S.macroPart(sums, { cal: 2400, p: 200 }, TODAY),
    wt: S.weightPart({ tw: 999.99, rateWk: -10, goalLb: 40, dir: 0 })
  };
  for (const [cat, v] of Object.entries(parts)) {
    const r = a.set(C.PATH.shared('uA', cat), { ...v, at: TS });
    check(cat + ': the largest summary the module can build is accepted', r.ok, r.why);
    check(cat + ': and the friend it is switched on for can read it', b.get(C.PATH.shared('uA', cat)).ok);
  }
  check('an empty PR summary (no records in five weeks) is accepted too', a.set(C.PATH.shared('uA', 'pr'), { ...S.prPart([], TODAY), at: TS }).ok);
  const big = { name: 'R'.repeat(90), note: 'N'.repeat(400), exercises: Array.from({ length: 30 }, (_, k) => ({
    exId: 'custom-' + 'x'.repeat(100), name: 'E'.repeat(90), group: 'shoulders', equipment: 'kettlebell', block: 30,
    sets: Array.from({ length: 30 }, (_, j) => ({ tw: '1234567.8901', tr: '123456', type: j % 2 ? 'D' : 'D', dp: 1 })) })) };
  const p = C.routinePayload(big);
  check('the largest routine routinePayload() lets through is built', p.ok, p.why);
  const r4 = a.set(C.PATH.slot('uB', 'uA'), { at: TS, n: 'A', r: p.r });
  check('and accepted by the rules', r4.ok, r4.why);
  check('and it is ' + Math.round(JSON.stringify(p.r).length / 1024) + ' KB — the most a friend can put in an inbox, ever, at once', JSON.stringify(p.r).length < 64 * 1024);
  const got = C.receivedRoutine(db.peek(C.PATH.slot('uB', 'uA')), { library: X.EXERCISES, makeCustom: X.makeCustomExercise, newId: 'rX', fromName: 'A' });
  check('and the receiver can take it back in', !!got && got.routine.exercises.length === 30);
}

done(st.cleanup);
