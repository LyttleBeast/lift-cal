#!/usr/bin/env node
//
// Verifier for the one-time card for a typed target under the safety floor
// (P5 B5; the v40 pattern; DECISION floorOk, DECISIONS-FOR-MICAH #4).
//
//   node tools-check/floor-card.mjs
//
// An account with auto targets OFF whose own target sits under the new safety
// floor keeps it: nothing stored is rewritten. So Fuel asks once, under the
// calorie bar. The v40 pattern (weight.js maintAskEl): the card shows only
// while its condition holds; each answer breaks the condition for good;
// dismissing writes nothing and the card comes back; every write re-reads
// with readExact, refuses when the re-read is missing or has no calories,
// and writes the fresh object spread.
//
//   condition: auto.on === false, cal > 0, cal < safeFloor(who).kcal, and
//              floorOk !== cal.
//   "Move to F": { ...cur, cal: F }.
//   "Keep N":    { ...cur, floorOk: N } — adults only, and only when N >= 800
//                (under 800 is a very-low-calorie diet: no Keep).
//
// food/targets.floorOk is the run's one new key (Micah's OK pending: the
// commit that adds it starts "DECISION floorOk:" so he can drop it). The
// published rules put no validation under food/targets, so it lands with
// database.rules.json untouched.
//
// What it proves, driving the REAL food.js:
//   - the condition table; minors get no Keep; an adult at 500 gets no Keep;
//   - Move and Keep write exactly the spread object;
//   - a missing or unreachable re-read writes nothing and says so;
//   - the card is drawn under the calorie bar from floorCard(targets, who).

import { stage, harness, setNow, at, J, resetDb, fake, readSrc, toasts, clearToasts } from './lib/stage.mjs';

const { check, section, done } = harness('floor-card — a typed target under the floor is asked about once');
const cleanups = [];
setNow(at(2026, 10, 6, 9));
const REAL = ['ui.js', 'units.js', 'weightmodel.js', 'tdee.js', 'insights.js', 'food.js'];
const fresh = () => { const s = stage(REAL); cleanups.push(s.cleanup); return s; };
const OFF = { on: false, rateWk: -1, pPerLb: 1, fPerLb: 0.35, floor: 0 };
const WOMAN = { sex: 'f', age: 40 }, MAN = { sex: 'm', age: 40 }, GIRL = { sex: 'f', age: 14 };

const F0 = await fresh().load('food.js');
const has = typeof F0.floorCard === 'function';
check('food.js exports floorCard', has);

section('When the card shows');
if (has) {
  const C = F0.floorCard;
  check('auto ON: no card (B3 lifts it instead)', C({ cal: 1160, p: 120, f: 40, auto: { ...OFF, on: true } }, WOMAN) === null);
  const w = C({ cal: 1160, p: 120, f: 40, auto: OFF }, WOMAN);
  check('a woman\'s typed 1,160: the card', !!w && w.move === 1200 && w.keep === 1160, J(w));
  check('its words: "Below the safety floor" / "Your daily target is 1,160 kcal. The lowest daily target Rack sets is 1,200."',
    w && w.eyebrow === 'Below the safety floor' && w.note === 'Your daily target is 1,160 kcal. The lowest daily target Rack sets is 1,200.', J(w));
  check('floorOk 1,160 (kept before): no card', C({ cal: 1160, p: 120, f: 40, floorOk: 1160, auto: OFF }, WOMAN) === null);
  check('floorOk 1,160 but the target since changed to 1,100: the card again', !!C({ cal: 1100, p: 120, f: 40, floorOk: 1160, auto: OFF }, WOMAN));
  const g = C({ cal: 1730, p: 110, f: 39, auto: OFF }, GIRL);
  check('a girl of 14 at 1,730: the card, Move to 1,800, and no Keep', !!g && g.move === 1800 && g.keep === null, J(g));
  check('the minors\' words: the Dietary Guidelines line',
    g && g.note === 'Your daily target is 1,730 kcal. Under 18, Rack does not plan a deficit; the least the Dietary Guidelines give for your age is 1,800.', J(g));
  const a5 = C({ cal: 500, p: 60, f: 20, auto: OFF }, WOMAN);
  check('an adult at 500: the card with no Keep (under 800)', !!a5 && a5.keep === null && a5.move === 1200, J(a5));
  check('a man at 1,400: the card, Move to 1,500', C({ cal: 1400, p: 180, f: 60, auto: OFF }, MAN).move === 1500);
  check('at the floor exactly: no card', C({ cal: 1200, p: 120, f: 40, auto: OFF }, WOMAN) === null);
  check('anything unexpected shows no card: no auto node, no calories, a string, null',
    C({ cal: 1000 }, WOMAN) === null && C({ cal: 0, auto: OFF }, WOMAN) === null && C({ cal: 'x', auto: OFF }, WOMAN) === null && C(null, WOMAN) === null);
}

section('What the buttons write');
async function bootAnswer(db, kind, opts = {}) {
  resetDb(db);
  fake.readExactThrows = !!opts.throws;
  const F = await fresh().load('food.js');
  await F.initFood();
  if (opts.after) opts.after();
  fake.writes.length = 0; clearToasts();
  const r = await F.answerFloorCard(kind);
  fake.readExactThrows = false;
  return { r, writes: fake.writes.filter(w => w.path === 'food/targets').map(w => w.value), toasts: toasts() };
}
if (has && typeof F0.answerFloorCard === 'function') {
  const T = { cal: 1160, p: 120, f: 40, maint: 2100, maintSrc: 'pinned', goalLb: 130, auto: OFF };
  const prof = { sex: 'f', birthYear: 1986 };
  const mv = await bootAnswer({ 'food/targets': T, profile: prof }, 'move');
  check('Move: exactly { ...stored, cal: 1,200 }', mv.writes.length === 1 && J(mv.writes[0]) === J({ ...T, cal: 1200 }), J(mv.writes));
  const kp = await bootAnswer({ 'food/targets': T, profile: prof }, 'keep');
  check('Keep: exactly { ...stored, floorOk: 1,160 }', kp.writes.length === 1 && J(kp.writes[0]) === J({ ...T, floorOk: 1160 }), J(kp.writes));
  // The re-read is what is spread, not the copy the screen holds: a field
  // another device added since boot survives.
  const fr = await bootAnswer({ 'food/targets': T, profile: prof }, 'move', { after: () => fake.db.set('food/targets', { ...T, goalLb: 125 }) });
  check('the FRESH node is spread (a change made elsewhere since boot survives)', fr.writes.length === 1 && fr.writes[0].goalLb === 125 && fr.writes[0].cal === 1200, J(fr.writes));
  const gone = await bootAnswer({ 'food/targets': T, profile: prof }, 'move', { after: () => fake.db.delete('food/targets') });
  check('a missing re-read writes nothing', gone.writes.length === 0, J(gone.writes));
  check('and says "Couldn’t reach your targets — try again in a moment."', gone.toasts.includes('Couldn’t reach your targets — try again in a moment.'), J(gone.toasts));
  const off = await bootAnswer({ 'food/targets': T, profile: prof }, 'move', { throws: true });
  check('an unreachable re-read writes nothing', off.writes.length === 0, J(off.writes));
  const nocal = await bootAnswer({ 'food/targets': T, profile: prof }, 'move', { after: () => fake.db.set('food/targets', { ...T, cal: 0 }) });
  check('a re-read with no calories writes nothing', nocal.writes.length === 0, J(nocal.writes));
  const minorKeep = await bootAnswer({ 'food/targets': { ...T, cal: 1730 }, profile: { sex: 'f', birthYear: 2012 } }, 'keep');
  check('Keep is not available to a minor: nothing written', minorKeep.writes.length === 0, J(minorKeep.writes));
  const lowKeep = await bootAnswer({ 'food/targets': { ...T, cal: 500 }, profile: prof }, 'keep');
  check('Keep is not available under 800: nothing written', lowKeep.writes.length === 0, J(lowKeep.writes));
} else check('food.js exports answerFloorCard (the buttons\' write)', false);

section('Where it is drawn');
{
  const FOOD = readSrc('food.js');
  check('renderCalMeter draws floorCard(targets, who) under the bar', /floorCard\(targets, who\)/.test(FOOD));
  check('the doctor / pregnancy line is not in it (it waits for Micah\'s own words)',
    !/doctor/i.test((FOOD.match(/export function floorCard[\s\S]*?\n}\n/) || [''])[0]));
  check('database.rules.json is untouched by the new key', !/floorOk/.test(readSrc('database.rules.json')));
  check('AGENTS.md documents food/targets.floorOk', /floorOk/.test(readSrc('AGENTS.md')));
}

done(...cleanups);
