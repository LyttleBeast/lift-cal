globalThis.fetch = async u => { throw new Error('no network: ' + u) };
//
// Verifier for what the app sends the estimator, how long it waits, and the
// line it prints under an answer.
//
//   node tools-check/estimate-limits.mjs
//
// P7 audit findings this pins (all measured on rack-v61 first):
//
//   CL-02 / C4-01 / F2-04  A description over 600 characters was CUT, silently,
//       in ai.js before sending: `(text || '').slice(0, 600)`. A 668-character
//       dinner went out as 600 and "…20 almonds, a tablespoon of peanut butter,
//       and a can of regular coke" never reached the estimator, so the logged
//       day came out short and nothing on screen said so. Now it is refused,
//       never cut, and the box counts as it fills.
//   CL-03 (web half)  ai.js had no timeout at all: a request that never
//       answered left a sealed busy sheet on screen for good.
//   F3-4 (client half)  an error reply's `usage` / `left` were dropped, so a
//       failed attempt that still used one of today's estimates said nothing.
//   CL-06  every account saw "$0.0517 of credit" under an answer; the dollar
//       figure is the owner's alone, and a reply without a number never prints
//       "$0.0000".
//
// This drives the REAL ai.js through a stub store and a stub Worker URL (its
// two impure imports, pointed at data: URLs, so nothing is written to disk),
// and a fetch stub that records what would have been sent. No request leaves
// this process. estimate-limits.js is pure and is imported as it is.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const dataUrl = s => 'data:text/javascript,' + encodeURIComponent(s);

const STORE = `
export async function idToken() { return 'stub-token'; }
export const LS = { get: (_k, d) => d, set() {}, del() {} };
`;
const CONFIG = `export const AI_PROXY_URL = 'https://worker.stub.invalid';`;

// Every relative import of ai.js: the two impure ones to stubs, anything else
// (estimate-limits.js) to the real file.
const aiSrc = readFileSync(join(ROOT, 'ai.js'), 'utf8').replace(/from '\.\/([\w-]+\.js)'/g, (_, f) =>
  'from ' + JSON.stringify(f === 'store.js' ? dataUrl(STORE)
                         : f === 'ai-config.js' ? dataUrl(CONFIG)
                         : pathToFileURL(join(ROOT, f)).href));
const ai = await import(dataUrl(aiSrc));

let limits = null;
try { limits = await import(pathToFileURL(join(ROOT, 'estimate-limits.js')).href); }
catch (e) { limits = null; }

const fail = [];
let checks = 0;
const ok  = m => { checks++; console.log('  ok    ' + m); };
const bad = m => { checks++; fail.push(m); console.log('  FAIL  ' + m); };

/* ---------- the fake Worker ----------
   `sent` holds every request body ai.js tried to send. `reply` decides the
   answer; by default a 200 with one row, which is all ai.js needs. */
let sent = [];
let reply = () => new Response(JSON.stringify({ ok: true, items: [{ name: 'x', cal: 1 }] }), { status: 200 });
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), body: init && init.body ? JSON.parse(init.body) : null, signal: init && init.signal });
  return reply(init);
};
async function attempt(fn) {
  sent = [];
  try { return { res: await fn(), err: null, sent }; }
  catch (err) { return { res: null, err, sent }; }
}

/* ---------- 1. long descriptions are refused, never cut ---------- */
console.log('\n1  a description over 600 characters');

const DINNER = 'For dinner I had a big bowl of homemade chicken curry with about a cup and a half of ' +
  'basmati rice, two pieces of garlic naan brushed with butter, a side salad with ranch, then later a ' +
  'protein shake with whole milk and two scoops of whey, a handful of pretzels, a greek yogurt with honey ' +
  'and granola, a slice of cheddar on crackers, three squares of dark chocolate, a banana, 20 almonds, ' +
  'a tablespoon of peanut butter, and a can of regular coke 12 oz, plus another glass of whole milk before ' +
  'bed and a second handful of pretzels because I was still hungry after all that, and some grapes, ' +
  'and one more chocolate chip cookie';
if (DINNER.length <= 600) { console.log('DINNER must be over 600 characters for this to mean anything'); process.exit(1); }
let r = await attempt(() => ai.estimateText(DINNER));
if (r.sent.length) {
  const out = r.sent[0].body.text;
  bad('a ' + DINNER.length + '-character description was SENT as ' + out.length + ' characters; never sent: "' +
      DINNER.slice(out.length).trim() + '"');
} else if (r.err && r.err.code === 'too_long') {
  ok('a ' + DINNER.length + '-character description is refused before any request: "' + r.err.message + '"');
} else bad('a ' + DINNER.length + '-character description: no request, but no too_long refusal either (' + (r.err && r.err.code) + ')');

const NOTE = 'Grilled ribeye about 14 oz cooked medium rare in a cast iron pan with two tablespoons of butter. '.repeat(7);
r = await attempt(() => ai.estimatePhoto({ media_type: 'image/jpeg', data: 'AAAA' }, NOTE));
if (r.sent.length) bad('a ' + NOTE.trim().length + '-character photo note was SENT as ' + r.sent[0].body.text.length + ' characters');
else if (r.err && r.err.code === 'too_long') ok('a ' + NOTE.trim().length + '-character photo note is refused before any request');
else bad('a long photo note: no request, but no too_long refusal (' + (r.err && r.err.code) + ')');

const EXACT = 'x'.repeat(600);
r = await attempt(() => ai.estimateText(EXACT));
if (r.sent.length === 1 && r.sent[0].body.text === EXACT) ok('exactly 600 characters is sent whole');
else bad('exactly 600 characters was not sent whole (' + (r.err ? r.err.code : r.sent.length + ' requests') + ')');

const PADDED = '   ' + EXACT + '\n\n';
r = await attempt(() => ai.estimateText(PADDED));
if (r.sent.length === 1 && r.sent[0].body.text === EXACT) ok('surrounding spaces do not count, as the Worker trims them too');
else bad('600 characters with surrounding spaces: ' + (r.err ? 'refused (' + r.err.code + ')'
        : 'sent with ' + (r.sent[0].body.text.match(/x/g) || []).length + ' of the 600 typed characters (the spaces were counted, the end was cut)'));

// Counted the way the Worker counts: String.length, so an emoji is two.
r = await attempt(() => ai.estimateText('🍕'.repeat(300)));
const r2 = await attempt(() => ai.estimateText('🍕'.repeat(301)));
if (r.sent.length === 1 && r.sent[0].body.text === '🍕'.repeat(300) && !r2.sent.length && r2.err && r2.err.code === 'too_long')
  ok('counted as the Worker counts (.length): 300 emoji (600) sent whole, 301 (602) refused');
else bad('emoji counting differs from the Worker: 300 -> ' + (r.sent.length ? r.sent[0].body.text.length + ' sent' : 'refused') +
         ', 301 -> ' + (r2.sent.length ? r2.sent[0].body.text.length + ' sent' : (r2.err && r2.err.code)));

// The Worker refuses too (P7 guard: 413; input-guards branch: 400). Either way
// the app shows the Worker's words, whatever the status.
for (const status of [413, 400]) {
  reply = () => new Response(JSON.stringify({ error: 'too_long', message: 'From the Worker: too long.' }), { status });
  r = await attempt(() => ai.estimateText('short'));
  if (r.err && r.err.code === 'too_long' && r.err.message === 'From the Worker: too long.') ok('the Worker\'s own too_long (' + status + ') reaches the screen in its words');
  else bad('the Worker\'s too_long (' + status + ') arrives as ' + (r.err ? r.err.code + ' "' + r.err.message + '"' : 'a result'));
}
reply = () => new Response(JSON.stringify({ ok: true, items: [{ name: 'x', cal: 1 }] }), { status: 200 });

/* ---------- 2. the counter under the box ---------- */
console.log('\n2  the counter (estimate-limits.js describeCount)');
if (!limits) bad('estimate-limits.js is missing: there is no counter, and nothing says where the limit is');
else {
  const { describeCount, MAX_DESCRIBE } = limits;
  const a = describeCount('two eggs'), b = describeCount('y'.repeat(540)), c = describeCount('y'.repeat(612));
  if (MAX_DESCRIBE === 600) ok('the limit is 600, the Worker\'s MAX_TEXT'); else bad('MAX_DESCRIBE is ' + MAX_DESCRIBE);
  if (!a.show && !a.over) ok('a short note shows no counter'); else bad('a short note shows ' + JSON.stringify(a));
  if (b.show && !b.over && b.line === '540 / 600') ok('540 characters shows "540 / 600"'); else bad('540 characters: ' + JSON.stringify(b));
  if (c.show && c.over && /^612 \/ 600/.test(c.line) && /split/i.test(c.line)) ok('612 characters is over, and says what to do: "' + c.line + '"');
  else bad('612 characters: ' + JSON.stringify(c));
  if (describeCount('  ' + 'y'.repeat(600) + '  ').over === false) ok('the counter trims, as the send does'); else bad('the counter counts surrounding spaces');
}

/* ---------- 3. how long it waits ---------- */
console.log('\n3  a request that never answers');

// Long timers fire at once here, so the app's own timeout is reached without
// waiting it out. A 3-second real timer decides "it never gave up".
const realSetTimeout = globalThis.setTimeout;
let longest = 0;
globalThis.setTimeout = (fn, ms, ...rest) => {
  if (ms > longest) longest = ms;
  return realSetTimeout(fn, ms >= 30000 ? 0 : ms, ...rest);
};
reply = init => new Promise((_, rej) => {
  if (init && init.signal) init.signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
});
const hung = await Promise.race([
  attempt(() => ai.estimateText('two eggs')),
  new Promise(res => realSetTimeout(() => res('still waiting'), 3000))
]);
globalThis.setTimeout = realSetTimeout;
reply = () => new Response(JSON.stringify({ ok: true, items: [{ name: 'x', cal: 1 }] }), { status: 200 });
if (hung === 'still waiting') bad('no timeout: a request that never answers keeps the sealed busy sheet up for good');
else if (hung.err && hung.err.code === 'timeout' && !/connection/i.test(hung.err.message)) {
  ok('it stops waiting with its own words, not the connection\'s: "' + hung.err.message + '"');
  if (limits && longest === limits.WAIT_MS) ok('it waits WAIT_MS = ' + limits.WAIT_MS / 1000 + ' s');
  else bad('the longest timer was ' + longest + ' ms, not WAIT_MS');
} else bad('a request that never answers ends as ' + (hung.err ? hung.err.code + ' "' + hung.err.message + '"' : 'a result'));
if (limits && limits.WAIT_MS >= 145000) ok('WAIT_MS outlasts the guarded Worker (2 calls x 60 s + KV) with room to spare');
else if (limits) bad('WAIT_MS ' + limits.WAIT_MS + ' is shorter than the Worker can take');

/* ---------- 4. a failed attempt still says what is left ---------- */
console.log('\n4  an error reply that carries usage and left');
reply = () => new Response(JSON.stringify({ error: 'upstream', message: 'Claude did not answer in time. Try again.',
  usage: { usd: 0.029 }, left: { day: 2, kind: 'text' } }), { status: 502 });
r = await attempt(() => ai.estimateText('two eggs'));
reply = () => new Response(JSON.stringify({ ok: true, items: [{ name: 'x', cal: 1 }] }), { status: 200 });
if (r.err && r.err.code === 'upstream' && r.err.usage && r.err.usage.usd === 0.029 && r.err.left && r.err.left.day === 2)
  ok('the error keeps the reply\'s usage and left, for the error sheet\'s line');
else bad('the error drops the reply\'s usage/left (' + JSON.stringify({ usage: r.err && r.err.usage, left: r.err && r.err.left }) + ')');

/* ---------- 5. the line under an answer ---------- */
console.log('\n5  the cost line (estimate-limits.js costLine)');
if (!limits || typeof limits.costLine !== 'function') bad('estimate-limits.js has no costLine: every account still sees the dollar figure');
else {
  const { costLine } = limits;
  const res = { usage: { usd: 0.0517 }, left: { day: 2, kind: 'text' } };
  const own = costLine(res, true), them = costLine(res, false);
  if (own === '$0.0517 of credit   ·   2 describes left today') ok('the owner sees "' + own + '"'); else bad('the owner sees "' + own + '"');
  if (them === '2 describes left today') ok('everyone else sees "' + them + '"'); else bad('everyone else sees "' + them + '"');
  const noUsd = costLine({ usage: { in: 10 }, left: { day: 1, kind: 'photo' } }, true);
  if (!/\$/.test(noUsd) && noUsd === '1 photo left today') ok('a reply without a dollar number never prints "$0.0000": "' + noUsd + '"');
  else bad('a reply without usage.usd prints "' + noUsd + '"');
  const free = costLine({ usage: { usd: 0 }, left: { day: 3, kind: 'text' } }, true);
  if (free === '$0.0000 of credit   ·   3 describes left today') ok('a free answer still reads $0.0000 to the owner, because it was'); else bad('a free answer reads "' + free + '"');
  if (costLine({}, true) === '' && costLine(null, true) === '') ok('no usage, no line'); else bad('a reply with no usage still draws a line');
}

console.log('');
if (fail.length) console.log(fail.length + ' of ' + checks + ' check(s) failed.');
else console.log('All ' + checks + ' checks passed: nothing is cut, nothing hangs, and the cost line is the owner\'s.');
process.exit(fail.length ? 1 : 0);
