// Pounds and kilos, inches and centimetres — the whole of it.
//
// Rack stores ONE unit and has always stored one: pounds, and inches. That is
// not going to change. 219 sessions were logged before anybody asked for kilos
// and none of them carries a unit tag, so there is no honest migration — only a
// guess applied to real history. computeVolume, detectPRs and sessionMilestones
// all do arithmetic *across* that history, the published .validate rules bound
// `w` to pound-scale ranges, and the native port has to agree byte for byte.
// Mixed-unit storage would make every consumer unit-aware and make the mixing
// permanent. So `settings/units` is a display-and-input preference and nothing
// else: parse the person's unit on the way in, format it on the way out.
//
// THE ONE RULE. Everything in memory and in storage is pounds and inches.
// Conversion happens only in the expression that builds a string, or in the one
// that reads an input. A value that has been through wOut/fmtW/volOut/rateOut/
// perOut/hOut is a DISPLAY value and must never be handed to another one of
// them — double conversion is the single most likely bug in this file's blast
// radius, and it is silent: 100 becomes 220 becomes 486 and every one of those
// looks like a weight.
//
// This module imports nothing and reads nothing. Every function takes the unit
// as an argument rather than reaching for a setting, so the native port copies
// it into src/pure/units.js verbatim and drives it from its own store.

export const LB_PER_KG = 2.2046226218;   // exact-enough inverse of 0.45359237
export const IN_PER_CM = 0.3937007874;   // exact-enough inverse of 2.54

const isKg = u => u === 'kg';
const isCm = u => u === 'cm';

// Two decimals is the resolution everything stored gets on the way back in.
// It is what keeps a converted set weight out of the database as the string
// "220.46226218", and it is fine enough that a round trip through it lands
// back on the number that was typed once the display rounds to one decimal.
const r2 = x => Math.round(x * 100) / 100;

// One decimal, trailing .0 dropped. Deliberately identical to ui.js's trimNum,
// because that is what every one of these numbers was formatted with before
// this module existed and imperial has to come out byte for byte the same.
const trim1 = x => String(Math.round(x * 10) / 10).replace(/\.0$/, '');
const trim2 = x => String(Math.round(x * 100) / 100).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');

// A private copy of ui.js's compact(), for the same reason: this module cannot
// import from the app. If one of the two ever changes, change both — volume on
// the You tab and volume on Train stats are the same number.
const compact1 = n => {
  const v = Math.abs(n);
  if (v >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
};

/* ---------- the setting ----------
   Absent, half-written, or carrying anything this file does not recognise all
   mean imperial. An offline queue that lands a partial node must not be able to
   produce a blank unit word on screen. */
export function normUnits(v) {
  const o = v && typeof v === 'object' ? v : {};
  return {
    weight: o.weight === 'kg' ? 'kg' : 'lb',
    height: o.height === 'cm' ? 'cm' : 'in'
  };
}

/* ---------- body weight, set weight, goal weight ---------- */
export function wOut(lb, u) { return isKg(u) ? lb / LB_PER_KG : lb; }
export function wIn(v, u)   { return isKg(u) ? r2(v * LB_PER_KG) : v; }
export function fmtW(lb, u) { return trim1(wOut(lb, u)); }
export function unitW(u)    { return isKg(u) ? 'kg' : 'lb'; }
// The number and its word together. Most of the app wants exactly this, and
// building it here is one fewer place for a kilo number to end up beside the
// word "lb".
export function labelW(lb, u) { return fmtW(lb, u) + ' ' + unitW(u); }

// Set weights are a special case and they are the one place precision is not
// the app's to decide. `w` is stored as the STRING the box held — "225",
// "227.5", "227.55" — and a set row has always printed it back to the digit.
// On pounds that is exactly what this still does, character for character, so
// nothing an account on pounds typed is quietly re-rounded on the way to the
// screen. On kilos the number is a conversion anyway, and one decimal is the
// precision every other weight in the app gets.
// The blank guard is load-bearing and not defensive decoration: '' coerces to
// 0 in the division and undefined coerces to NaN, so without it an unset
// routine target would read as "0" on kilos and an absent one as "NaN" — a
// promise of a weight where there is none.
export function fmtSetW(w, u) {
  if (w === '' || w == null) return '';
  return isKg(u) ? trim1(wOut(w, u)) : String(w);
}

/* ---------- volume and e1RM totals ----------
   Sums of weights, so they convert like weights and not like counts. The
   abbreviation comes last: convert, then compact. Compacting first and
   converting the "41.3k" is not a thing that can be done. */
export function volOut(lb, u)   { return isKg(u) ? lb / LB_PER_KG : lb; }
export function fmtVol(lb, u)   { return compact1(volOut(lb, u)); }
export function labelVol(lb, u) { return fmtVol(lb, u) + ' ' + unitW(u); }

/* ---------- rate of change, per week ----------
   The same scale factor as a weight — it is a weight, divided by a week — but
   named apart so a call site says which of the two it meant, and so the native
   port maps one to one.

   Metric gets two decimals where weight gets one. A cut runs at 0.3 lb a week
   and that is 0.14 kg: rounded to one decimal it becomes 0.1, which is a
   different bar. */
export function rateOut(lbWk, u)   { return isKg(u) ? lbWk / LB_PER_KG : lbWk; }
export function rateIn(v, u)       { return isKg(u) ? r2(v * LB_PER_KG) : v; }
export function fmtRate(lbWk, u)   { return isKg(u) ? trim2(rateOut(lbWk, u)) : trim1(lbWk); }
export function labelRate(lbWk, u) { return fmtRate(lbWk, u) + ' ' + unitW(u); }

/* ---------- grams of protein or fat per unit of bodyweight ----------
   The one conversion that runs the other way. A target of 1 g per POUND is
   2.2 g per KILO, because there are more pounds in a body than kilos — so this
   multiplies where wOut divides. Getting it backwards gives a metric user a
   protein target of 45 g, which is the kind of wrong this ship exists to
   avoid. Sanity check: 1.0 g/lb at 220 lb is 220 g; 2.2046 g/kg at 100 kg is
   the same 220 g. */
export function perOut(gPerLb, u) { return isKg(u) ? gPerLb * LB_PER_KG : gPerLb; }
export function perIn(v, u)       { return isKg(u) ? r2(v / LB_PER_KG) : v; }
export function fmtPer(gPerLb, u) { return isKg(u) ? trim2(perOut(gPerLb, u)) : trim2(gPerLb); }

/* ---------- what goes IN an input box ----------
   Not the same job as fmtW. A formatter is allowed to round, because a sentence
   only has to read right. An input box is read back and saved, so on pounds it
   hands back exactly what is stored and touches nothing — otherwise opening
   Daily targets and pressing Save would quietly re-round a rate somebody typed.
   On kilos the number came out of a conversion anyway, and two decimals is
   finer than any of these inputs' steps while still round-tripping to the
   stored value. */
export function boxW(lb, u)       { return isKg(u) ? r2(wOut(lb, u)) : lb; }
export function boxRate(lbWk, u)  { return isKg(u) ? r2(rateOut(lbWk, u)) : lbWk; }
export function boxPer(gPerLb, u) { return isKg(u) ? r2(perOut(gPerLb, u)) : gPerLb; }

/* ---------- height ---------- */
export function hOut(inches, u) { return isCm(u) ? inches / IN_PER_CM : inches; }
export function hIn(v, u)       { return isCm(u) ? r2(v * IN_PER_CM) : v; }
export function unitH(u)        { return isCm(u) ? 'cm' : 'in'; }
// Whole centimetres on screen. Storage keeps hundredths of an inch for a metric
// account rather than whole inches, because 175 cm and 176 cm both round to 69
// inches — somebody would type 176, save, reopen and be told they are 175.
export function fmtH(inches, u) { return isCm(u) ? String(Math.round(hOut(inches, u))) : trim1(inches); }

/* ---------- limits ----------
   A LIMITS pair from ui.js, in the unit on screen, for input.min/max and for
   the "between X and Y" toast.

   Rounded INWARD — the floor up, the ceiling down — so every number the browser
   will accept is one the clamp will also accept. Rounding outward would let
   somebody type the ceiling the input showed them and have it silently pulled
   back to something else. Two decimals, because a rate ceiling of 5 lb/week is
   2.26 kg/week and one decimal would quietly move the bar. Imperial is
   identity: every limit in the app is already inside two decimals. */
const limFor = ([lo, hi], u, out) => [
  Math.ceil(out(lo, u) * 100) / 100,
  Math.floor(out(hi, u) * 100) / 100
];
export function limW(limit, u)    { return limFor(limit, u, wOut); }
export function limRate(limit, u) { return limFor(limit, u, rateOut); }
export function limPer(limit, u)  { return limFor(limit, u, perOut); }
export function limH(limit, u)    { return limFor(limit, u, hOut); }

/* ---------- the calories in a unit of bodyweight ----------
   The "3,500 kcal a pound" rule of thumb, in the reader's unit. 3500 × 2.2046
   is 7,716. The number in the sentence converts; the arithmetic behind the
   sentence never does, because every calorie figure in this app is derived
   from stored pounds. */
export function kcalPerUnit(u) { return isKg(u) ? 7716 : 3500; }
