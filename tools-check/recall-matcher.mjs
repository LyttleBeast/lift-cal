#!/usr/bin/env node
//
// Verifier for the two near-miss gates in recall.js — quantities() and
// negations().
//
//   node tools-check/recall-matcher.mjs
//
// Both gates guard the same failure: lookup() hands back a stored row whose
// macros are confidently wrong, with nothing on screen saying so. A wrong
// recall hit is not a missing answer — it is a number the cut is then tracked
// off for two weeks (AGENTS.md: a stale daySummary skews TDEE), so the cost of
// a false hit is much higher than the fraction of a cent a missed one spends.
// Neither bug is visible from the outside, which is why it is pinned here.
//
// This loads the REAL recall.js — no copy of the matcher lives in this file,
// which is the only way a verifier stays true when the file changes — by
// rewriting its one import specifier to a stub store and seeding the module's
// private `recall` map through initRecall(). quantities() and negations() are
// not exported and are not meant to be; everything below goes through lookup(),
// which is the behaviour that actually reaches a person.
//
// Then it runs the same scenarios through LEGACY_lookup, the pre-fix web
// matcher kept below, and fails if that one DOESN'T return the wrong row. A
// verifier that cannot go red on the bug it covers is decoration.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE   = fileURLToPath(new URL('.', import.meta.url));
const RECALL = join(HERE, '..', 'recall.js');

/* ---------- the fake store ----------
   recall.js pulls four names out of store.js and touches nothing else, so the
   stub is four names. `read` serves whatever the current fixture is; the write
   side is inert because nothing below writes — lookup() is a pure read over
   module state. */

let fixture = {};

const STUB = `
export async function read(_path, fallback) { return globalThis.__recallFixture ?? fallback; }
export function watch() { return () => {}; }
export function mergeUpdate() {}
export const LS = { get: (_k, d) => d, set() {}, del() {} };
`;

const dir = mkdtempSync(join(tmpdir(), 'rack-recall-'));
writeFileSync(join(dir, 'store-stub.mjs'), STUB);
writeFileSync(
  join(dir, 'recall.mjs'),
  readFileSync(RECALL, 'utf8').replace("from './store.js'", "from './store-stub.mjs'")
);
const recall = await import(pathToFileURL(join(dir, 'recall.mjs')).href);

// MIN_SCORE is a module constant and is not exported. It is duplicated here for
// the legacy matcher alone; the real code below never reads this copy.
const MIN_SCORE = 0.74;

/* ---------- the pre-fix matcher ----------
   What the web app ran before these two gates existed, reconstructed from the
   divergence notes in native-ref/src/pure/recall.js. It deliberately reuses the
   REAL normalize() and keyOf(), because normalisation is not what changed —
   FILLER, NUMWORD and the slug are byte-identical across both clients and both
   eras, and the stored key is the deduplication for a node two clients share.
   Only the selection logic differs, so only the selection logic is copied. */

function LEGACY_tokens(text) {
  const n = recall.normalize(text);
  return n ? n.split(' ') : [];
}

// The multiset. It throws away WHICH food each number counted.
function LEGACY_numbersIn(list) {
  return list.filter(t => /^[0-9]/.test(t)).sort().join(',');
}

function LEGACY_score(a, b) {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let hit = 0;
  sa.forEach(t => { if (sb.has(t)) hit++; });
  return (2 * hit) / (sa.size + sb.size);
}

function LEGACY_lookup(rows, text) {
  const key = recall.keyOf(text);
  if (!key) return null;
  const exact = rows[key];
  if (exact && exact.items && exact.items.length) return { key, ...exact, score: 1, exact: true };

  const mine = LEGACY_tokens(text);
  const myNum = LEGACY_numbersIn(mine);
  if (mine.length < 2) return null;

  let best = null;
  for (const [k, r] of Object.entries(rows)) {
    if (!r || !r.q || !r.items || !r.items.length) continue;
    const theirs = LEGACY_tokens(r.q);
    if (LEGACY_numbersIn(theirs) !== myNum) continue;   // the only gate there was
    const s = LEGACY_score(mine, theirs);
    if (s >= MIN_SCORE && (!best || s > best.score)) best = { key: k, ...r, score: s, exact: false };
  }
  return best;
}

/* ---------- harness ---------- */

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + name); }
  else    { fail++; results.push('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}

// Rows are keyed the way the app keys them, so the exact path behaves here
// exactly as it does against the real node.
function row(q, items) {
  return [recall.keyOf(q), { q, kind: 'ai', items, n: 1, last: Date.now() }];
}

async function seed(...rows) {
  fixture = Object.fromEntries(rows);
  globalThis.__recallFixture = fixture;
  await recall.initRecall();
  return fixture;
}

const EGGS_BACON  = [{ name: '2 eggs, 3 slices bacon', qty: '', cal: 480, p: 30, c: 2, f: 38 }];
const BOWL_CHEESE = [{ name: 'Chipotle bowl', qty: '1 bowl', cal: 790, p: 45, c: 82, f: 30 }];
const PIZZA_2     = [{ name: '2 slices pizza', qty: '2 slices', cal: 570, p: 24, c: 66, f: 22 }];

/* ---------- 1. transposed quantities ----------
   The case the multiset could not see. Both sentences reduce to "2,3" under
   LEGACY_numbersIn, and their token SETS are identical, so Dice scores exactly
   1.0 — the top of the range, which is what makes it so bad: no threshold on
   the score could ever have caught it. */

{
  const stored = '2 eggs and 3 slices of bacon';
  const asked  = '3 eggs and 2 slices of bacon';
  await seed(row(stored, EGGS_BACON));

  const now = recall.lookup(asked);
  check('transposed quantities: rejected', now === null,
        now ? 'matched ' + now.key + ' at ' + now.score : '');

  const then = LEGACY_lookup(fixture, asked);
  check('transposed quantities: the old matcher really did hit',
        !!then && then.key === recall.keyOf(stored),
        then ? 'score ' + then.score : 'legacy returned null — this verifier can no longer go red');

  // Named separately because it is the reason the bug was invisible.
  check('transposed quantities: the old hit scored 1.0, so no threshold would have helped',
        !!then && then.score === 1);

  check('transposed quantities: the keys were always distinct',
        recall.keyOf(stored) !== recall.keyOf(asked));
}

/* ---------- 2. differing quantities ----------
   The gate the multiset DID hold. "3 slices" against a stored "2 slices" gives
   "3" vs "2" and was rejected before the fix too. It is here as a control: the
   new pair-binding form must not have lost the plain case while fixing the
   transposed one. */

{
  await seed(row('2 slices of pizza', PIZZA_2));
  const asked = '3 slices of pizza';

  check('differing quantities: rejected', recall.lookup(asked) === null);
  check('differing quantities: the old matcher rejected these too',
        LEGACY_lookup(fixture, asked) === null);
}

/* ---------- 3. the negation ----------
   'no' is not in FILLER, so it survives normalisation as a token — and because
   Dice counts SHARED tokens, the negated sentence shares every food word with
   the stored one and then adds a word. Saying "no cheese" scored the pair MORE
   similar than omitting cheese would have. Negation was making a match more
   likely, which is the whole shape of the bug. */

{
  const stored = 'chicken burrito bowl with white rice black beans and cheese';
  const asked  = 'chicken burrito bowl with white rice black beans and no cheese';
  await seed(row(stored, BOWL_CHEESE));

  const now = recall.lookup(asked);
  check('negation: "no cheese" does not match the with-cheese row', now === null,
        now ? 'matched ' + now.key + ' at ' + now.score : '');

  const then = LEGACY_lookup(fixture, asked);
  check('negation: the old matcher returned the with-cheese macros',
        !!then && then.key === recall.keyOf(stored),
        then ? 'score ' + then.score : 'legacy returned null — this verifier can no longer go red');

  check('negation: and it cleared MIN_SCORE comfortably',
        !!then && then.score >= MIN_SCORE,
        then ? 'score ' + then.score.toFixed(3) : '');
}

/* ---------- 4. the negation must be symmetric ----------
   Rejecting in one direction only would leave the same wrong macros reachable
   by asking the other way round. */

{
  const stored = 'chicken burrito bowl with white rice black beans and no cheese';
  const asked  = 'chicken burrito bowl with white rice black beans and cheese';
  await seed(row(stored, BOWL_CHEESE));

  check('negation: a plain sentence does not match a stored "no cheese" row',
        recall.lookup(asked) === null);
  check('negation: the old matcher hit in this direction as well',
        !!LEGACY_lookup(fixture, asked));
}

/* ---------- 5. 'no' must stay out of FILLER ----------
   The tempting one-line version of the negation fix is to drop 'no' as a filler
   word, and it is wrong in a way that does not show up as a wrong number. The
   key IS the deduplication for a node the web app and the phone both write
   (AGENTS.md: `food/recall`), so dropping 'no' would collapse "no cheese" onto
   the with-cheese key — the two orders would share one row and overwrite each
   other's macros — while also forking every key against the other client.
   The fix has to live in the matcher, where it is a per-lookup read-side
   decision that is written nowhere. */

{
  check("normalisation keeps 'no' as a token",
        recall.normalize('burrito bowl with no cheese').split(' ').includes('no'));
  check('a negated sentence keys differently from its plain form',
        recall.keyOf('burrito bowl with no cheese') !== recall.keyOf('burrito bowl with cheese'));
}

/* ---------- 6. the gates must not eat legitimate hits ----------
   A guard that blocks the answer it was meant to serve is a bug, not caution.
   These are the near-misses the cache exists for, and every one of them must
   still come back without a round trip. */

{
  const rows = await seed(
    row('chicken burrito bowl with white rice and black beans', BOWL_CHEESE),
    row('2 slices of pizza', PIZZA_2)
  );
  const bowlKey  = Object.keys(rows)[0];
  const pizzaKey = Object.keys(rows)[1];

  const reordered = recall.lookup('burrito bowl with chicken white rice and black beans');
  check('reordered words still hit', !!reordered && reordered.key === bowlKey);

  const extra = recall.lookup('2 slices of pepperoni pizza');
  check('an extra word with the same quantity still hits',
        !!extra && extra.key === pizzaKey,
        extra ? '' : 'rejected');

  const exact = recall.lookup('chicken burrito bowl with white rice and black beans');
  check('the exact path is untouched', !!exact && exact.exact === true && exact.score === 1);
}

/* ---------- 7. matching exclusions still match ----------
   The rule is that two sentences may only match if they exclude the SAME
   things — not that a negated sentence can never match anything. */

{
  const rows = await seed(row('burrito bowl with white rice black beans and no cheese', BOWL_CHEESE));
  const key  = Object.keys(rows)[0];

  const same = recall.lookup('chicken burrito bowl with white rice black beans and no cheese');
  check('two sentences excluding the same thing still match', !!same && same.key === key,
        same ? '' : 'rejected');

  const verbatim = recall.lookup('burrito bowl with white rice black beans and no cheese');
  check('a negated sentence still hits itself exactly',
        !!verbatim && verbatim.exact === true);
}

/* ---------- report ---------- */

console.log('\nrecall near-miss gates\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
