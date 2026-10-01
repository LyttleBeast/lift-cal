globalThis.fetch = async u => { throw new Error('no network: ' + u) };
//
// Verifier that food memory never answers a question with a different or a
// shortened meal.
//
//   node tools-check/recall-whole.mjs
//
// recall.js answers a described meal out of the account's own log before any
// request is spent, and says so on screen: "Found in your log · exact match ·
// this one cost nothing". Two silent cuts made that claim false (P7 audit,
// CL-01, measured on this file):
//
//   1. keyOf() keeps 150 characters of the slug. Every sentence that shares its
//      first ~160 typed characters lands on one key, and the exact path handed
//      back whatever was stored there -- the longer order's chips, queso and
//      lemonade simply absent, or the cookies counted as 2 when 4 were typed.
//   2. cleanItems() kept 12 rows of an answer the Worker sends up to 20 of, so
//      a 14-row plate came back as 12 rows, still "exact match".
//
// Either one is a wrong number shown as fact, which is the one thing Rack's
// rules put below no number at all.
//
// This drives the REAL recall.js, the same way recall-matcher.mjs does: its one
// import is pointed at a stub store, here through a data: URL so nothing is
// written to disk. No copy of the rule lives in this file. All kcal values are
// SYNTHETIC -- round numbers chosen so a missing row shows in the total.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const STUB = `
export async function read(_path, fallback) { return globalThis.__recallFixture ?? fallback; }
export function watch() { return () => {}; }
export function mergeUpdate() {}
export const LS = { get: (_k, d) => d, set() {}, del() {} };
`;
const dataUrl = s => 'data:text/javascript,' + encodeURIComponent(s);
const src = readFileSync(join(ROOT, 'recall.js'), 'utf8');
if (!src.includes("from './store.js'")) { console.log('recall.js no longer imports ./store.js -- update this verifier'); process.exit(1); }
const recall = await import(dataUrl(src.replace("from './store.js'", 'from ' + JSON.stringify(dataUrl(STUB)))));

const fail = [];
let checks = 0;
const ok  = m => { checks++; console.log('  ok    ' + m); };
const bad = m => { checks++; fail.push(m); console.log('  FAIL  ' + m); };

// A fresh memory for each scenario. initRecall() is the only door into the
// module's private map, so the fixture goes through it, as a stored node would.
async function fresh(rows) {
  globalThis.__recallFixture = rows || null;
  await recall.initRecall();
}
const rows = (n, kcal) => Array.from({ length: n }, (_, i) =>
  ({ name: 'Item ' + (i + 1), qty: '1', cal: kcal, p: 1, c: 1, f: 1 }));
const sum  = items => (items || []).reduce((t, x) => t + (x.cal || 0), 0);
const desc = hit => !hit ? 'no hit (falls through to a real estimate)'
  : (hit.exact ? 'EXACT match' : 'close match') + ', ' + hit.items.length + ' rows, ' + sum(hit.items) + ' kcal';

/* ---------- 1. sentences that differ only after the key's 150 characters ---------- */
console.log('\n1  two different orders that share the first ~160 typed characters');

const BOWL = 'chipotle burrito bowl with double chicken, white rice, black beans, fajita veggies, ' +
             'fresh tomato salsa, roasted chili corn salsa, sour cream, cheese, romaine lettuce and guacamole on top';
const A = BOWL;
const B = BOWL + ', plus a side of chips and queso blanco and a large lemonade';
const bowlRows = [
  ['Chicken (double)', 360], ['White rice', 210], ['Black beans', 130], ['Fajita veggies', 20],
  ['Tomato salsa', 25], ['Corn salsa', 80], ['Sour cream', 110], ['Cheese', 110],
  ['Romaine', 5], ['Guacamole', 230]
].map(([name, cal]) => ({ name, qty: '1', cal, p: 1, c: 1, f: 1 }));   // SYNTHETIC

// The precondition is what makes the rest mean anything: the two sentences
// really do share one key today.
if (recall.keyOf(A) === recall.keyOf(B) && recall.keyOf(A).length === 150) {
  ok('precondition: A (' + A.length + ' chars) and B (' + B.length + ' chars) share one 150-char key');
} else {
  bad('precondition: A and B do not share a 150-char key -- this scenario no longer tests the cut');
}

await fresh();
recall.remember(A, bowlRows, 'ai');
let hit = recall.lookup(B);
if (hit && hit.items.length === bowlRows.length && sum(hit.items) === sum(bowlRows)) {
  bad('B (A + chips, queso, lemonade) is answered with A\'s ' + desc(hit) +
      ' -- the chips, queso and lemonade are missing, on a screen that says "exact match"');
} else ok('B is not answered with A\'s rows: ' + desc(hit));

hit = recall.lookup(A);
if (hit && hit.exact && hit.items.length === bowlRows.length) ok('A itself is still remembered: ' + desc(hit));
else bad('A itself is no longer answered from memory: ' + desc(hit) + ' -- the fix must not cost the memory');

// The drink swap and the quantity change V-CL measured, both after char 150.
const LONG = 'panda express bigger plate with half chow mein and half fried rice, orange chicken, ' +
             'beijing beef, honey walnut shrimp, a side of super greens, an egg roll, two cream cheese rangoons, ' +
             'two packets of sweet and sour sauce, ';
const lem  = LONG + 'and a large lemonade';
const coke = LONG + 'and a large coke';
const cookies2 = LONG + 'and 2 chocolate chip cookies';
const cookies4 = LONG + 'and 4 chocolate chip cookies';
if (recall.keyOf(lem) === recall.keyOf(coke) && recall.keyOf(cookies2) === recall.keyOf(cookies4)) {
  ok('precondition: the lemonade/coke pair and the 2/4 cookies pair each share one key (' + LONG.length + '-char shared start)');
} else {
  bad('precondition: the drink or cookie pair no longer shares a key -- lengthen LONG');
}
await fresh();
recall.remember(lem, [...rows(6, 100), { name: 'Lemonade (large)', qty: '1', cal: 300, p: 0, c: 75, f: 0 }], 'ai');
hit = recall.lookup(coke);
if (hit && hit.items.some(x => /lemonade/i.test(x.name))) bad('"…large coke" is answered with the lemonade order: ' + desc(hit));
else ok('"…large coke" is not answered with the lemonade order: ' + desc(hit));

await fresh();
recall.remember(cookies2, [...rows(6, 100), { name: 'Cookies', qty: 'x2', cal: 340, p: 4, c: 44, f: 16 }], 'ai');
hit = recall.lookup(cookies4);
if (hit && hit.items.some(x => x.qty === 'x2')) bad('"…4 chocolate chip cookies" is answered with the x2 cookies row: ' + desc(hit));
else ok('"…4 chocolate chip cookies" is not answered with the x2 row: ' + desc(hit));

// What the recall screen's Log does: remember the STORED question again. The
// row must still answer the typed sentence afterwards.
await fresh();
recall.remember(B, bowlRows.concat([{ name: 'Chips & queso', qty: '1', cal: 780, p: 1, c: 1, f: 1 },
                                    { name: 'Lemonade (large)', qty: '1', cal: 300, p: 0, c: 75, f: 0 }]), 'ai');
let first = recall.lookup(B);
if (first) recall.remember(first.q, first.items, first.kind);
hit = recall.lookup(B);
if (hit && hit.exact && hit.items.length === 12) ok('a long order survives the recall screen\'s own re-remember (q kept whole): ' + desc(hit));
else bad('a long order is lost after the recall screen re-remembers it under hit.q: ' + desc(hit));

/* ---------- 2. answers longer than the memory keeps ---------- */
console.log('\n2  an answer with more rows than the memory used to keep');

await fresh();
const Q14 = 'thanksgiving plate turkey stuffing mashed potatoes gravy cranberry green bean casserole rolls';
recall.remember(Q14, rows(14, 100), 'ai');
hit = recall.lookup(Q14);
if (hit && hit.items.length < 14) bad('a 14-row answer (1400 kcal) comes back as ' + desc(hit));
else ok('a 14-row answer is never served shortened: ' + desc(hit));

await fresh();
const Q25 = 'whole day of eating breakfast lunch dinner snacks';
recall.remember(Q25, rows(25, 100), 'ai');
hit = recall.lookup(Q25);
if (hit && hit.items.length < 25) bad('a 25-row answer (2500 kcal) comes back as ' + desc(hit));
else ok('a 25-row answer is never served shortened: ' + desc(hit));

/* ---------- 3. rows already stored by older clients ---------- */
console.log('\n3  rows written before this fix (and by phone builds that do not have it yet)');

// What the old remember() wrote for B: the 150-char key, q cut to 200, no proof.
const legacyKey = recall.keyOf(B);
await fresh({ [legacyKey]: { q: B.slice(0, 200).trim(), kind: 'ai', items: bowlRows, n: 3, last: 1 } });
hit = recall.lookup(B);
if (hit && hit.exact) bad('an old row under a cut key is still served as an exact match: ' + desc(hit));
else ok('an old row under a cut key is not trusted: ' + desc(hit));

await fresh({ [recall.keyOf(Q14)]: { q: Q14, kind: 'ai', items: rows(12, 100), n: 2, last: 1 } });
hit = recall.lookup(Q14);
if (hit) bad('an old 12-row row (it may have been 14) is still served: ' + desc(hit));
else ok('an old 12-row row is not trusted: ' + desc(hit));

const SHORT = 'two eggs and toast';
await fresh({ [recall.keyOf(SHORT)]: { q: SHORT, kind: 'ai', items: rows(2, 150), n: 4, last: 1 } });
hit = recall.lookup('2 eggs toast');
if (hit && hit.exact && hit.items.length === 2) ok('an old short row still answers its sentence, re-phrased: ' + desc(hit));
else bad('an old short row no longer answers "2 eggs toast": ' + desc(hit) + ' -- the fix must not throw away existing memory');

await fresh();
recall.remember(SHORT, rows(2, 150), 'ai');
hit = recall.lookup('Two eggs, and toast.');
if (hit && hit.exact) ok('a new short row answers its sentence, re-phrased: ' + desc(hit));
else bad('a new short row no longer answers its own sentence re-phrased: ' + desc(hit));

/* ---------- 4. sentences that differ only in what normalize() throws away ----------
   normalize() keeps [a-z0-9.] and spaces and nothing else, so "1-2" and "1/2",
   "+guac" and "-guac", and every word in another script or an emoji, vanish
   from the key AND from the sentence compare. Measured on rack-v61: "2 банана"
   was answered with the stored "2 яйца" as an exact match (both key "2").
   The sentences below are each a different meal from the one stored. */
console.log('\n4  different meals that differ only in characters normalize() drops');
const DIFFER = [
  ['1-2 tbsp peanut butter', '1/2 tbsp peanut butter'],
  ['chipotle bowl -guac +rice', 'chipotle bowl +guac -rice'],
  ['2-3 slices pepperoni pizza', '2/3 slices pepperoni pizza'],
  ['big mac +cheese', 'big mac -cheese'],
  ['2 яйца', '2 банана'],
  ['2 🍕', '2 🌮'],
  ['ラーメン 1杯', 'カレー 1杯']
];
for (const [stored, typed] of DIFFER) {
  await fresh();
  recall.remember(stored, [{ name: stored, qty: '1', cal: 500, p: 1, c: 1, f: 1 }], 'ai');   // SYNTHETIC
  hit = recall.lookup(typed);
  if (hit) bad('"' + typed + '" is answered with the stored "' + stored + '": ' + desc(hit));
  else ok('"' + typed + '" is not answered with "' + stored + '"');
}
const SAME = [['two eggs and toast', '2 eggs, toast.'], ['café latte', 'cafe latte'], ["mcdonald's big mac", 'McDonald’s Big Mac!']];
for (const [stored, typed] of SAME) {
  await fresh();
  recall.remember(stored, [{ name: stored, qty: '1', cal: 300, p: 1, c: 1, f: 1 }], 'ai');
  hit = recall.lookup(typed);
  if (hit && hit.exact) ok('"' + typed + '" still finds "' + stored + '" (same meal): ' + desc(hit));
  else bad('"' + typed + '" no longer finds "' + stored + '", the same meal: ' + desc(hit));
}

console.log('');
if (fail.length) console.log(fail.length + ' of ' + checks + ' check(s) failed.');
else console.log('All ' + checks + ' checks passed: food memory answers only with the whole question\'s whole answer.');
process.exit(fail.length ? 1 : 0);
