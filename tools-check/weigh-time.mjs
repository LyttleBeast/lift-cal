#!/usr/bin/env node
//
// Verifier for when a weigh-in says it happened.
//
//   node tools-check/weigh-time.mjs
//
// v41 let the log sheet correct a weigh-in's time, because the trend model
// LEARNS HOW WEIGHT MOVES THROUGH THE DAY from `t` — a morning weight typed in
// at 9 PM teaches it the body was two pounds lighter after dinner than it was,
// and that error is multiplied by roughly 500 on its way into the maintenance
// estimate. Letting the time be typed is therefore worth a control, and worth a
// bound: a typo'd year must not plant a weigh-in in 2006.
//
// weighTime() is lifted out of weightmodel.js by text rather than imported,
// because that module reaches for store.js at load and the rule under test uses
// nothing but its own two constants. Nothing here holds a copy of it.
//
// `now` is an argument to the function, so EVERY case below is derived from one
// fixed epoch and this file answers the same at 2 AM in Auckland as at noon in
// New York. That is not decoration: a native verifier filed a fixture under
// "today" while the code filed it under the day it started, and failed between
// midnight and 3 AM.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');

/* ---------- lift ---------- */
const WM = src('weightmodel.js');
const bodyOf = head => {
  const at = WM.indexOf(head);
  if (at === -1) throw new Error('weightmodel.js no longer declares ' + head + ' — this verifier has nothing to drive');
  let depth = 0, end = -1;
  for (let j = WM.indexOf('{', at + head.length - 1); j < WM.length; j++) {
    if (WM[j] === '{') depth++;
    else if (WM[j] === '}' && --depth === 0) { end = j; break; }
  }
  return WM.slice(at, end + 1).replace(/^export /, '');
};
const constLine = name => {
  const m = new RegExp('export const ' + name + ' = ([^;]+);').exec(WM);
  if (!m) throw new Error('weightmodel.js no longer exports ' + name);
  return 'export const ' + name + ' = ' + m[1] + ';';
};

const dir = mkdtempSync(join(tmpdir(), 'rack-weigh-'));
const file = join(dir, 'weightime.mjs');
writeFileSync(file,
  constLine('WEIGH_SKEW_MS') + '\n' +
  constLine('WEIGH_BACK_MS') + '\n' +
  'export ' + bodyOf('export function weighTime(') + '\n');
const { weighTime, WEIGH_SKEW_MS, WEIGH_BACK_MS } = await import(pathToFileURL(file).href);

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail++; results.push('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const shape = v => JSON.stringify(v);

// One fixed epoch, and every case below is an offset from it. Never a clock.
// 2026-09-17T13:45:30.123Z, chosen only because it is not midnight and not on a
// round second — a bound that only works on tidy numbers is not a bound.
const NOW = 1789307130123;
const MIN = 60000, DAY = 864e5;

/* ================= A. NOTHING TYPED ================= */
section('A. nothing typed is exactly what the app did before this existed');
{
  [null, undefined, '', NaN, 'not a date'].forEach(v => {
    const r = weighTime(v, NOW);
    check('weighTime(' + shape(v) + ') is now, and says so', r.t === NOW && r.reason === 'none', shape(r));
  });
  check("the empty string is NOTHING TYPED, not 1970 — Number('') is 0, not NaN",
        weighTime('', NOW).reason === 'none', shape(weighTime('', NOW)));
  check('and 0 itself, which is 1970, is refused as too old rather than taken',
        weighTime(0, NOW).reason === 'old', shape(weighTime(0, NOW)));
}

/* ================= B. THE FUTURE ================= */
section('B. a weigh-in cannot have happened yet');
{
  check('two minutes of clock skew is allowed — phones and laptops disagree by seconds',
        WEIGH_SKEW_MS === 2 * MIN);
  check('now exactly is taken', weighTime(NOW, NOW).t === NOW && weighTime(NOW, NOW).reason === '');
  check('a second into the future is taken', weighTime(NOW + 1000, NOW).reason === '');
  check('the skew limit exactly is taken', weighTime(NOW + WEIGH_SKEW_MS, NOW).reason === '');
  check('one millisecond past it is refused', weighTime(NOW + WEIGH_SKEW_MS + 1, NOW).reason === 'future',
        shape(weighTime(NOW + WEIGH_SKEW_MS + 1, NOW)));
  check('tomorrow is refused', weighTime(NOW + DAY, NOW).reason === 'future');
  check('a typo that lands in 2126 is refused', weighTime(NOW + 100 * 365 * DAY, NOW).reason === 'future');
}

/* ================= C. THE PAST ================= */
section('C. fourteen days back, and not one more');
{
  check('the window is 14 days', WEIGH_BACK_MS === 14 * DAY);
  check('this morning is taken, to the millisecond',
        weighTime(NOW - 7 * 3600e3 - 37, NOW).t === NOW - 7 * 3600e3 - 37);
  check('yesterday is taken', weighTime(NOW - DAY, NOW).reason === '');
  check('thirteen days back is taken', weighTime(NOW - 13 * DAY, NOW).reason === '');
  check('fourteen days back exactly is taken', weighTime(NOW - WEIGH_BACK_MS, NOW).reason === '');
  check('one millisecond further is refused', weighTime(NOW - WEIGH_BACK_MS - 1, NOW).reason === 'old',
        shape(weighTime(NOW - WEIGH_BACK_MS - 1, NOW)));
  check('a month back is refused', weighTime(NOW - 30 * DAY, NOW).reason === 'old');
  // The case the bound exists for: a year typed as 2006 instead of 2026.
  const typo = Date.UTC(2006, 8, 17, 13, 45);
  check('a typo’d year is refused rather than planted twenty years back',
        weighTime(typo, NOW).reason === 'old' && weighTime(typo, NOW).t === NOW,
        shape(weighTime(typo, NOW)));
}

/* ================= D. REFUSED, NOT CLAMPED ================= */
section('D. a refused time is never quietly moved onto the nearest legal one');
{
  const out = [NOW + DAY, NOW - 30 * DAY, 0, Date.UTC(2006, 0, 1)];
  check('every refused time comes back as `now`, not as the edge of the window',
        out.every(v => weighTime(v, NOW).t === NOW &&
                       weighTime(v, NOW).t !== NOW - WEIGH_BACK_MS &&
                       weighTime(v, NOW).t !== NOW + WEIGH_SKEW_MS),
        shape(out.map(v => weighTime(v, NOW))));
  check('and every refusal carries a reason the screen can say out loud',
        out.every(v => ['future', 'old'].includes(weighTime(v, NOW).reason)),
        shape(out.map(v => weighTime(v, NOW).reason)));
  check('an accepted time carries no reason at all',
        weighTime(NOW - DAY, NOW).reason === '');
}

/* ================= E. IT IS PURE ================= */
section('E. no clock inside, so the answer depends only on its arguments');
{
  const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  const fn = strip(bodyOf('export function weighTime('));
  check('weighTime builds no Date and reads no clock',
        !/Date\.now|new Date|getTimezoneOffset|toISOString/.test(fn), fn);
  check('the same arguments give the same answer, a thousand times over',
        Array.from({ length: 1000 }, (_, i) => weighTime(NOW - i * MIN, NOW))
          .every((r, i) => r.t === (i * MIN <= WEIGH_BACK_MS ? NOW - i * MIN : NOW)));
  check('it answers about a `now` that is not this machine’s — 1970, and 2099',
        weighTime(1000, 2000).reason === '' && weighTime(1000, 2000).t === 1000 &&
        weighTime(4090000000000, 4090000000000).reason === '');
  check('a fractional millisecond is rounded rather than written as a fraction',
        Number.isInteger(weighTime(NOW - 0.4, NOW).t), String(weighTime(NOW - 0.4, NOW).t));
}

/* ================= F. INSIDE THE RULES ================= */
section('F. every `t` this can produce is inside the tighter of the two rule sets');
{
  // The published rules (database.rules.json) put no .validate under weight at
  // all, so anything lands. The PROPOSED set in the native tree —
  // web-patches/database.rules.PROPOSED.json, read at 695d996 — bounds it:
  //
  //   weight/entries/$id/t  newData.isNumber() && val >= 0 && val <= 4102444800000
  //
  // 4102444800000 is 2100-01-01Z. That is the tighter of the two, so it is the
  // one to stay inside, and it is written out here rather than read across
  // repositories so this file runs in a clone that has only this tree.
  const T_MAX = 4102444800000;
  const rules = JSON.parse(src('database.rules.json'));
  const weight = rules.rules.users.$uid.weight;
  check('the published rules still have no .validate under weight — so the proposed set is the bound',
        Object.keys(weight).join(',') === '.write', shape(Object.keys(weight)));

  const NOWS = [1000, NOW, 4090000000000];
  const TRIES = [null, '', NaN, 0, -1, -1e12, 1e15, 4102444800001, NOW, NOW - DAY, NOW + DAY,
                 NOW - WEIGH_BACK_MS, NOW - WEIGH_BACK_MS - 1, NOW + WEIGH_SKEW_MS];
  const outside = [];
  NOWS.forEach(n => TRIES.forEach(v => {
    const r = weighTime(v, n);
    if (!(Number.isFinite(r.t) && r.t >= 0 && r.t <= T_MAX)) outside.push(shape([v, n, r]));
  }));
  check('no combination of typed time and clock produces a `t` the proposed rules would refuse',
        outside.length === 0, outside.slice(0, 2).join(' | '));
  check('a number far past 2100 is refused as the future long before the rules see it',
        weighTime(4102444800001, NOW).reason === 'future');
  check('a negative millisecond is refused even when `now` is close enough to 1970 to allow it',
        weighTime(-1, 1000).reason === 'old' && weighTime(-1, 1000).t === 1000,
        shape(weighTime(-1, 1000)));
}

/* ================= G. THE SHEET ================= */
section('G. the control is optional, collapsed, and off the untouched path');
{
  const W = src('weight.js');
  check('nothing exists until it is asked for — `when` starts as null',
        /let when = null;/.test(W));
  check('the picker is built only inside the button’s handler',
        W.indexOf("when.type = 'datetime-local'") > W.indexOf('whenBtn.onclick'));
  check('untouched, the write still takes one Date.now() at save',
        W.includes('weighTime(when ? Date.parse(when.value) : null, Date.now())'));
  check('the stored shape is still { lb, t } — no third key',
        W.includes('{ lb: r1(lb), t: w.t }'));
  check('a refused time stops the save rather than landing somewhere else',
        /if \(w\.reason === 'future'\) \{ toast\([^)]*\); return; \}/.test(W) &&
        /if \(w\.reason === 'old'\) \{ toast\([^)]*\); return; \}/.test(W));
  // Comments stripped: two of them say `toISOString` in order to explain why
  // the file does not call it.
  const code = W.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  check('the picker opens on LOCAL now — toISOString would open it on yesterday',
        W.includes('when.value = localStamp(new Date(now));') && !/toISOString/.test(code),
        (code.match(/.*toISOString.*/) || [''])[0]);
  check('and it tells the browser the same bounds the rule holds',
        W.includes('when.min = localStamp(new Date(now - WEIGH_BACK_MS));') &&
        W.includes('when.max = localStamp(new Date(now + WEIGH_SKEW_MS));'));
  check('the recent list still prints the time that was stored',
        W.includes("d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })"));
  check('editing an existing weigh-in’s time is still not a thing this screen does',
        !/confirmSheet[\s\S]{0,600}datetime-local/.test(W));

  // localStamp is the other half of the timezone trap, so it is driven rather
  // than read: a Date built from local parts must format back to those parts.
  const localStamp = new Function('d',
    'const p = n => String(n).padStart(2, "0");' +
    'return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());');
  check('the picker’s stamp round-trips through the local clock, whatever it is set to',
        [[2026, 8, 17, 7, 5], [2026, 0, 1, 0, 0], [2026, 11, 31, 23, 59]].every(([y, m, d, h, mi]) =>
          localStamp(new Date(y, m, d, h, mi)) === Date.parse(localStamp(new Date(y, m, d, h, mi))) &&
          false || Date.parse(localStamp(new Date(y, m, d, h, mi))) === new Date(y, m, d, h, mi).getTime()));
  check('and weight.js builds it exactly that way',
        W.includes("'T' + p(d.getHours()) + ':' + p(d.getMinutes());"));
}

/* ---------- report ---------- */
console.log('\na weigh-in can say when it happened\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
