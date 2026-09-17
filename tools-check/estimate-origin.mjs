#!/usr/bin/env node
//
// Verifier for what the estimate sheet SAYS about where its numbers came from.
//
//   node tools-check/estimate-origin.mjs
//
// Two halves, and the second is the one that has to hold.
//
//   1. THE WORDS. estimate-origin.js is pure and imports nothing, so it is
//      imported for real and driven with the reply shapes the deployed Worker
//      actually sends. The heading, the per-row line, a stale row, and the
//      reply from an older Worker that says nothing about itself at all —
//      which must read as an estimate and NEVER as a menu. Claiming a source a
//      number does not have is a wrong number in words.
//
//      THE FIXTURES ARE THE WHOLE VERIFIER, and the first set of them was
//      wrong. They were built from a commission that said model rows carry no
//      `src`; the Worker has always sent one on every row (`{ kind:'ai', model,
//      searched }`, index.js:752 and :1434), so a module that read `src`'s mere
//      presence as "published" passed 54 checks while heading a pure model
//      answer "From published nutrition". Each reply below now matches a real
//      code path in ~/dev/rack-worker, named in its comment. Sections B2 and B3
//      are the ones that failed before the rule became kind-based.
//
//   2. WHAT IS WRITTEN DOES NOT MOVE. The stored `src` string is the shipped
//      iOS rule verbatim and both clients read it back, so the entry this sheet
//      logs has to be byte-identical to the one v40 logged for the same reply.
//      That is checked by building it BOTH ways from real source text: v40's
//      expression lifted out of `git show 9c1f0af:food.js`, v41's lifted out of
//      the working tree. Nothing here carries a copy of either.
//
// The alignment case is the one worth staring at. normalizeImport drops an item
// with no name; estimate-origin's rows are one per item the Worker sent. If
// those two lists are zipped naively, a nameless row in the middle slides
// Panda's provenance onto a number the model guessed.

import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const real = p => JSON.stringify(pathToFileURL(join(ROOT, p)).href);
const BASE = '9c1f0af';   // rack-v40, the build this must not change the log of

const O = await import(pathToFileURL(join(ROOT, 'estimate-origin.js')).href);

let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ok   ' + label); }
  else    { fail++; results.push('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const shape = v => JSON.stringify(v);

/* ================= LIFTING THE REAL EXPRESSIONS =================
   Same rig as tools-check/units.mjs section D: the code under test is read out
   of the file by text rather than restated here, because a verifier holding its
   own copy proves only that the copy agrees with itself. */

const blockOf = (text, head) => {
  const at = text.indexOf(head);
  if (at === -1) throw new Error('cannot find ' + JSON.stringify(head) + ' — this verifier has nothing to drive');
  let depth = 0, end = -1;
  for (let j = text.indexOf('{', at); j < text.length; j++) {
    if (text[j] === '{') depth++;
    else if (text[j] === '}' && --depth === 0) { end = j; break; }
  }
  return text.slice(at, end + 1);
};
const constOf = (text, head) => {
  const at = text.indexOf(head);
  if (at === -1) throw new Error('cannot find ' + JSON.stringify(head));
  const end = text.indexOf('\n];', at);
  return text.slice(at, end + 3);
};
const sliceOf = (text, from, to) => {
  const a = text.indexOf(from);
  if (a === -1) throw new Error('cannot find ' + JSON.stringify(from));
  const b = text.indexOf(to, a);
  if (b === -1) throw new Error('cannot find ' + JSON.stringify(to));
  return text.slice(a, b + to.length);
};

const newSrc = readFileSync(join(ROOT, 'food.js'), 'utf8');
const oldSrc = execFileSync('git', ['show', BASE + ':food.js'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });

const dir = mkdtempSync(join(tmpdir(), 'rack-origin-'));

// Everything normalizeImport reaches for, lifted from the same file it is
// lifted from, so the old build is driven by the old build's helpers.
const stage = (name, text, body) => {
  writeFileSync(join(dir, name),
    'import { r1, clamp, LIMITS } from ' + real('ui.js') + ';\n' +
    'import { estimateOrigin } from ' + real('estimate-origin.js') + ';\n' +
    constOf(text, '\nconst MEALS = [') + '\n' +
    constOf(text, '\nconst MICROS = [') + '\n' +
    blockOf(text, '\nfunction defaultMeal(') + '\n' +
    blockOf(text, '\nfunction normalizeImport(') + '\n' +
    body + '\n');
  return import(pathToFileURL(join(dir, name)).href);
};

const OLD = await stage('v40.mjs', oldSrc,
  'export function build(res, src) {\n' +
  sliceOf(oldSrc, '  const entries = normalizeImport({ items: res.items })',
                  ".map(e => ({ ...e, src }));") + '\n' +
  '  return { entries, origins: null };\n}');

const NEW = await stage('v41.mjs', newSrc,
  'export function build(res, src) {\n' +
  sliceOf(newSrc, '  const prov = estimateOrigin(res);',
                  '  }).map(e => ({ ...e, src }));') + '\n' +
  '  return { entries, origins };\n}');

// And the src expression itself, the one thing written that this ship must not
// move. Lifted from both builds and compared case by case.
const srcExpr = text => {
  const body = sliceOf(text, "  const src = (res.source === 'curated'",
                             "'ai-photo' : 'ai-text';");
  return new Function('res', 'ctx', body + '\n  return src;');
};
const oldSrcOf = srcExpr(oldSrc), newSrcOf = srcExpr(newSrc);

/* ================= THE REPLIES ================= */

const item = (name, extra) => ({ name, qty: '1 serving', cal: 340, p: 17, c: 38, f: 14,
                                 meal: 'dinner', ...(extra || null) });

const REPLIES = {
  // What happened last night: the food layer priced it off Panda's published
  // row, no model ran, $0.0000. lookup.js withSrc() always stamps `stale`.
  panda: { mode: 'text', model: '', source: 'curated', confidence: 'high',
           usage: { usd: 0 },
           items: [item('Sesame Chicken',
             { src: { kind: 'curated', venue: 'panda-express',
                      from: 'https://www.pandaexpress.com/nutrition',
                      asOf: '2026-09', stale: false } })] },

  // Published nutrition with no venue behind it — a generic, not a menu.
  usda: { mode: 'text', model: '', source: 'curated',
          items: [item('Greek Yogurt, plain',
            { src: { kind: 'curated', from: 'USDA', asOf: '2024-04-01', stale: false } })] },

  // A row the food layer itself marked old.
  stale: { mode: 'text', model: '', source: 'curated',
           items: [item('Burrito Bowl',
             { src: { kind: 'curated', venue: 'chipotle', asOf: '2023-01', stale: true } })] },

  // A residual answer: the food layer knew the bowl, the model priced the side
  // it had never heard of. The estimated row carries kind 'ai', and because the
  // rows disagree sourceOf() calls the whole reply 'mixed'.
  mixed: { mode: 'text', model: 'claude-sonnet-5', source: 'mixed',
           items: [item('Burrito Bowl',
                     { src: { kind: 'curated', venue: 'chipotle', asOf: '2026-08', stale: false } }),
                   item('A friend’s homemade salsa',
                     { src: { kind: 'ai', model: 'claude-sonnet-5', searched: false } })] },

  // The model ran, now. EVERY row carries a src — index.js:1434. This is the
  // reply the presence test called "From published nutrition".
  ai: { mode: 'text', model: 'claude-sonnet-5', source: 'ai', confidence: 'medium',
        usage: { usd: 0.0031 },
        items: [item('Chicken and rice',
          { src: { kind: 'ai', model: 'claude-sonnet-5', searched: false } })] },

  // The model ran earlier and the sentence cache answered. free.js:37 keeps a
  // row's original src where it had one, so a remembered model answer still
  // reads 'ai' on the row and 'cache' at the top of the reply.
  cache: { mode: 'text', model: 'claude-sonnet-5', source: 'cache',
           usage: { usd: 0 },
           items: [item('Chicken and rice',
             { src: { kind: 'ai', model: 'claude-sonnet-5', searched: true } })] },

  // Remembered from before per-item provenance existed: no original src to
  // keep, so free.js stamps kind 'cache' itself.
  cacheOld: { mode: 'text', model: 'claude-sonnet-5', source: 'cache', usage: { usd: 0 },
              items: [item('Chicken and rice', { src: { kind: 'cache' } })] },

  // A remembered answer whose row came off a menu. Being remembered does not
  // un-publish a number: the row is still Panda's, and nothing was spent either
  // way, so the menu is what the sheet has to say.
  cacheMenu: { mode: 'text', model: '', source: 'cache', usage: { usd: 0 },
               items: [item('Sesame Chicken',
                 { src: { kind: 'curated', venue: 'panda-express', asOf: '2026-09', stale: false } })] },

  // No per-item src at all, and the venue at the top of the reply — a Worker
  // from before per-item provenance, where the whole reply is all there is.
  parsedWhole: { mode: 'text', model: '', source: 'parsed', venue: 'chipotle',
                 items: [item('Burrito Bowl'), item('Chips')] },

  // An older Worker: no source, no per-item src, nothing about itself at all.
  older: { mode: 'text', model: 'claude-sonnet-5', items: [item('Chicken and rice')] },

  // A top-level source this client has never heard of.
  unknown: { mode: 'text', model: 'claude-sonnet-5', source: 'pool', items: [item('Chicken and rice')] },

  // A KIND this client has never heard of — a tier added to the Worker after
  // this build shipped, dressed in every field a curated row has. It must read
  // as an estimate: a provenance you cannot read is one you cannot repeat.
  unknownKind: { mode: 'text', model: '', source: 'scanned',
                 items: [item('Clif Bar',
                   { src: { kind: 'scanned', venue: 'clif', from: 'openfoodfacts',
                            asOf: '2026-05', stale: false } })] },

  // The alignment trap: a nameless item in the middle, which normalizeImport
  // drops and estimate-origin still counts.
  gap: { mode: 'text', model: 'claude-sonnet-5', source: 'mixed',
         items: [item('Burrito Bowl', { src: { kind: 'curated', venue: 'chipotle', stale: false } }),
                 { qty: '1', cal: 90, p: 0, c: 20, f: 0,
                   src: { kind: 'ai', model: 'claude-sonnet-5', searched: false } },
                 item('A friend’s homemade salsa',
                   { src: { kind: 'ai', model: 'claude-sonnet-5', searched: false } })] }
};

/* ================= A. THE HEADINGS ================= */
section('A. the heading names the source, or names Claude, and never both wrongly');
{
  const h = k => O.estimateOrigin(REPLIES[k]).heading;
  check('a venue the food layer priced is named: "From the Panda Express menu"',
        h('panda') === 'From the Panda Express menu', h('panda'));
  check('published nutrition with no venue does not invent a menu',
        h('usda') === 'From published nutrition', h('usda'));
  check('the model reads as Claude’s estimate, as it always has',
        h('ai') === 'Claude’s estimate', h('ai'));
  check('a residual answer says it is both',
        h('mixed') === 'Part menu, part estimate', h('mixed'));
  check('a cached answer is still Claude’s estimate — a model did produce it',
        h('cache') === 'Claude’s estimate', h('cache'));
  check('and says so on the second line: answered earlier, nothing spent',
        O.estimateOrigin(REPLIES.cache).sub === 'answered earlier, nothing spent',
        O.estimateOrigin(REPLIES.cache).sub);
  check('nothing else carries that second line',
        ['panda', 'usda', 'ai', 'mixed', 'older', 'unknownKind', 'cacheMenu']
          .every(k => O.estimateOrigin(REPLIES[k]).sub === ''));
  check('a remembered answer stamped kind cache reads the same as one that kept its ai row',
        shape(O.estimateOrigin(REPLIES.cacheOld)) === shape(O.estimateOrigin(REPLIES.cache)),
        shape(O.estimateOrigin(REPLIES.cacheOld)));
  check('a remembered MENU row is still the menu — being remembered does not un-publish it',
        h('cacheMenu') === 'From the Panda Express menu', h('cacheMenu'));
  check('a whole-reply venue with no per-item src still names the venue',
        h('parsedWhole') === 'From the Chipotle menu', h('parsedWhole'));
  check('a mixed answer with no venue anywhere says published, not menu',
        O.originHeading([{ origin: 'usda', venue: '', label: 'published nutrition' },
                         { origin: 'ai', venue: '', label: 'estimate' }]).heading
        === 'Part published, part estimate');
  check('two venues in one answer name neither over the other',
        O.originHeading([{ origin: 'menu', venue: 'Chipotle', label: '' },
                         { origin: 'menu', venue: 'Panda Express', label: '' }]).heading
        === 'From the menu');
  check('no rows at all falls back to the estimate wording',
        O.originHeading([]).heading === 'Claude’s estimate' &&
        O.estimateOrigin({}).heading === 'Claude’s estimate');
}

/* ================= B. NEVER A MENU ON NO EVIDENCE ================= */
section('B. an answer that says nothing about itself reads as an estimate');
{
  const rows = k => O.estimateOrigin(REPLIES[k]).rows;
  check('an older Worker with no source and no per-item src: every row an estimate',
        rows('older').every(r => r.origin === 'ai'), shape(rows('older')));
  check('and its heading never says menu or published',
        !/menu|published/i.test(O.estimateOrigin(REPLIES.older).heading));
  check('a source this client has never heard of falls back to the model path',
        rows('unknown').every(r => r.origin === 'ai'), shape(rows('unknown')));
  check('an empty reply, a null reply and a reply whose items are not a list',
        O.estimateOrigin(null).rows.length === 0 &&
        O.estimateOrigin({ items: null }).rows.length === 0 &&
        O.estimateOrigin({ items: { name: 'x' } }).rows.length === 0);
  check('an item src that is a STRING is not an object and is not provenance',
        O.estimateOrigin({ items: [{ name: 'x', src: 'food-db' }] }).rows[0].origin === 'ai');
}

/* ================= B2. A `src` IS NOT A PUBLICATION =================
   The defect this section exists for. Every row the Worker sends carries a
   `src` — model rows included, index.js:752 and :1434 — so a module that tests
   that object for PRESENCE calls the model's own guess published nutrition. It
   did, until 17 Sep 2026: the commission it was built from said model rows were
   src-less. Only kind 'curated' may claim a source. */
section('B2. only kind curated may claim a published source');
{
  const rows = k => O.estimateOrigin(REPLIES[k]).rows;
  const one = src => O.estimateOrigin({ items: [{ name: 'x', src }] }).rows[0];

  check('a pure model answer is an estimate on every row, though every row has a src',
        REPLIES.ai.items.every(i => i.src) && rows('ai').every(r => r.origin === 'ai'),
        shape(rows('ai')));
  check('and its heading never says menu or published',
        !/menu|published/i.test(O.estimateOrigin(REPLIES.ai).heading),
        O.estimateOrigin(REPLIES.ai).heading);
  check('and no row of it claims a source in words',
        rows('ai').every(r => r.label === 'estimate' && r.venue === ''), shape(rows('ai')));

  check('a kind this build has never heard of is an estimate, not a claim',
        rows('unknownKind').every(r => r.origin === 'ai' && r.label === 'estimate'),
        shape(rows('unknownKind')));
  check('even though that row carried a venue, a from and an asOf to claim',
        REPLIES.unknownKind.items[0].src.venue && REPLIES.unknownKind.items[0].src.asOf &&
        !/clif|openfoodfacts|2026/i.test(rows('unknownKind')[0].label),
        shape(rows('unknownKind')[0]));
  check('and its heading names Claude, not the tier it could not read',
        O.estimateOrigin(REPLIES.unknownKind).heading === 'Claude’s estimate',
        O.estimateOrigin(REPLIES.unknownKind).heading);

  // The kind is matched exactly. A near miss is a kind this build does not
  // know, and the whole point is that those do not get the benefit of a doubt.
  const NOT_CURATED = ['ai', 'cache', 'scanned', 'pool', '', ' curated', 'curated ',
                       'CURATED', 'Curated', 'food-db', 'parsed'];
  check('every kind but curated reads as an estimate, matched exactly',
        NOT_CURATED.every(k => one({ kind: k, venue: 'panda-express', asOf: '2026-09' }).origin !== 'menu'),
        shape(NOT_CURATED.filter(k => one({ kind: k, venue: 'panda-express' }).origin === 'menu')));
  check('a src with no kind at all claims nothing either',
        one({ venue: 'panda-express', asOf: '2026-09' }).origin === 'ai' &&
        one({ kind: null, from: 'USDA' }).origin === 'ai',
        shape(one({ venue: 'panda-express' })));
  check('and curated still does claim one, so this is a rule and not a mute button',
        one({ kind: 'curated', venue: 'panda-express', asOf: '2026-09' }).origin === 'menu');
}

/* ================= B3. THE RESIDUAL ANSWER =================
   source 'mixed' is the Worker's word for rows that disagree with each other,
   so it is the one top-level source that can never speak for a row. Under the
   presence test the estimated half of this answer read "published nutrition"
   beneath a Panda heading — the lie the module was written to stop, printed by
   the module itself. */
section('B3. the estimated half of a residual answer does not inherit the menu');
{
  const m = O.estimateOrigin(REPLIES.mixed);
  check('the reply says mixed and the rows are tagged one at a time',
        REPLIES.mixed.source === 'mixed' &&
        m.rows.length === 2 && m.rows[0].origin === 'menu' && m.rows[1].origin === 'ai',
        shape(m.rows));
  check('the estimated row names no venue, so it cannot pull one into the heading',
        m.rows[1].venue === '' && !/chipotle|published/i.test(m.rows[1].label), shape(m.rows[1]));
  check('the heading says both and neither alone',
        m.heading === 'Part menu, part estimate', m.heading);

  // The same shape with the venue at the TOP of the reply as well: foodRow
  // falls back to res.venue, and a model row must not reach that fallback.
  const withTop = { ...REPLIES.mixed, venue: 'chipotle' };
  check('a top-level venue does not reach the estimated row either',
        O.estimateOrigin(withTop).rows[1].label === 'estimate',
        shape(O.estimateOrigin(withTop).rows));
  check('and source mixed never turns a src-less row into a food row',
        O.estimateOrigin({ source: 'mixed', venue: 'chipotle', items: [{ name: 'x' }] })
          .rows[0].origin === 'ai');
}

/* ================= C. THE ROWS ================= */
section('C. each row says where its own number came from');
{
  const rows = k => O.estimateOrigin(REPLIES[k]).rows;
  check('Panda’s row: "Panda Express · published Sep 2026"',
        rows('panda')[0].label === 'Panda Express · published Sep 2026', rows('panda')[0].label);
  check('and its origin is a menu',
        rows('panda')[0].origin === 'menu');
  check('the USDA row names its source and its year: "USDA · published Apr 2024"',
        rows('usda')[0].label === 'USDA · published Apr 2024', rows('usda')[0].label);
  check('and its origin is published nutrition, not a menu',
        rows('usda')[0].origin === 'usda');
  check('a stale row says so on the row',
        rows('stale')[0].label === 'Chipotle · published Jan 2023 · may be out of date',
        rows('stale')[0].label);
  check('a model row says "estimate" and nothing more',
        rows('ai')[0].label === 'estimate' && rows('ai')[0].origin === 'ai');
  check('a cached row says when: "estimate · answered earlier"',
        rows('cache')[0].label === 'estimate · answered earlier' && rows('cache')[0].origin === 'cache');

  const m = rows('mixed');
  check('a mixed answer tags its rows individually, not as a block',
        m.length === 2 && m[0].origin === 'menu' && m[1].origin === 'ai', shape(m));
  check('the menu row keeps its venue and the estimated row claims none',
        m[0].label === 'Chipotle · published Aug 2026' && m[1].label === 'estimate', shape(m.map(r => r.label)));

  check('a date the Worker wrote some other way is passed through, not guessed at',
        O.estimateOrigin({ items: [{ name: 'x', src: { kind: 'curated', venue: 'joe', asOf: 'spring 2026' } }] })
          .rows[0].label === 'Joe · published spring 2026');
  check('a venue written out in full is not re-cased',
        O.estimateOrigin({ items: [{ name: 'x', src: { kind: 'curated', venue: 'McDonald’s' } }] })
          .rows[0].label === 'McDonald’s');
  check('a food-layer row with nothing on it at all still says published nutrition',
        O.estimateOrigin({ items: [{ name: 'x', src: { kind: 'curated' } }] })
          .rows[0].label === 'published nutrition');
  check('no row label ever contains a dollar figure or a model name',
        Object.keys(REPLIES).every(k => O.estimateOrigin(REPLIES[k]).rows
          .every(r => !/\$|claude|sonnet|haiku/i.test(r.label))));
}

/* ================= C2. A ROW SOMEBODY CORRECTED ================= */
section('C2. a corrected row stops claiming a source it no longer has');
{
  const menu = O.estimateOrigin(REPLIES.panda).rows[0];
  check('the corrected row says whose numbers they now are',
        O.EDITED.origin === 'edited' && O.EDITED.label === 'edited by hand', shape(O.EDITED));
  check('it names no venue, so it cannot put one in the heading',
        O.EDITED.venue === '');
  check('it is frozen — one shared row object cannot be mutated from a screen',
        Object.isFrozen(O.EDITED));
  check('correcting the only row leaves nobody’s estimate on the screen',
        O.originHeading([O.EDITED]).heading === 'Your numbers');
  check('correcting one row of two does not turn a menu answer into an estimate',
        O.originHeading([menu, O.EDITED]).heading === 'From the Panda Express menu');
  check('and a corrected row does not vote a cached answer out of its second line',
        O.originHeading([{ origin: 'cache', venue: '', label: 'estimate · answered earlier' }, O.EDITED]).sub
        === 'answered earlier, nothing spent');
  check('the sheet swaps the row’s origin only when something actually changed',
        /const was = \[e\.name, e\.qty, e\.cal, e\.p, e\.c, e\.f\]\.join\('\|'\);/.test(newSrc) &&
        /origins\[i\] = EDITED;/.test(newSrc));
}

/* ================= D. THE MONTH, UNDER ANY CLOCK ================= */
section('D. asOf is parsed as text — no Date, so no timezone');
{
  // `new Date('2026-09-01')` is UTC midnight and prints as 31 August west of
  // Greenwich. This is the bug a native verifier hit last night; the module
  // avoids it by never building a Date at all.
  const lab = v => O.estimateOrigin(
    { items: [{ name: 'x', src: { kind: 'curated', from: 'X', asOf: v } }] }).rows[0].label;
  check('the first of a month does not slip back a month', lab('2026-09-01') === 'X · published Sep 2026', lab('2026-09-01'));
  check('the last of a month does not slip forward', lab('2026-12-31') === 'X · published Dec 2026', lab('2026-12-31'));
  check('a bare year-month works', lab('2026-01') === 'X · published Jan 2026', lab('2026-01'));
  check('a month out of range is not turned into rubbish', lab('2026-13') === 'X · published 2026', lab('2026-13'));
  // Comments are stripped first: the one above says `new Date` in order to
  // explain why the module does not.
  const MOD = readFileSync(join(ROOT, 'estimate-origin.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  check('estimate-origin.js builds no Date and reads no clock',
        !/new Date|Date\.now|getHours|toLocale/.test(MOD), (MOD.match(/.*new Date.*/) || [''])[0]);
  check('and imports nothing, so the native port copies it verbatim',
        !/^\s*import\s/m.test(MOD));
}

/* ================= E. WHAT IS WRITTEN DOES NOT MOVE ================= */
section('E. the logged entry is byte-identical to v40’s, for every reply');
{
  const KEYS = Object.keys(REPLIES);
  const bad = [];
  KEYS.forEach(k => {
    const res = REPLIES[k];
    const ctx = { mode: 'text' };
    const s = newSrcOf(res, ctx);
    if (s !== oldSrcOf(res, ctx)) bad.push(k + ': src ' + s + ' vs ' + oldSrcOf(res, ctx));
    const a = OLD.build(res, s).entries;
    const b = NEW.build(res, s).entries;
    if (shape(a) !== shape(b)) bad.push(k + ': ' + shape(a) + ' vs ' + shape(b));
  });
  check('all ' + KEYS.length + ' replies build the same entries, key for key and value for value',
        bad.length === 0, bad.join(' | '));

  check('the src string itself is untouched — food-db for the food layer, ai-* for the model',
        newSrcOf(REPLIES.panda, { mode: 'text' }) === 'food-db' &&
        newSrcOf(REPLIES.parsedWhole, { mode: 'text' }) === 'food-db' &&
        newSrcOf(REPLIES.cache, { mode: 'text' }) === 'ai-text' &&
        newSrcOf(REPLIES.ai, { mode: 'photo' }) === 'ai-text' &&
        newSrcOf(REPLIES.older, { mode: 'photo' }) === 'ai-text' &&
        newSrcOf({}, { mode: 'photo' }) === 'ai-photo');

  const built = NEW.build(REPLIES.panda, 'food-db');
  check('no origin key is anywhere on an entry — the day log is spread from these',
        built.entries.every(e => !('origin' in e) && !('label' in e) && !('prov' in e)),
        shape(built.entries[0]));
  check('an entry still carries exactly the keys v40 wrote',
        shape(Object.keys(built.entries[0])) ===
        shape(Object.keys(OLD.build(REPLIES.panda, 'food-db').entries[0])),
        shape(Object.keys(built.entries[0])));

  // THE ALIGNMENT. A nameless item is dropped by normalizeImport and counted by
  // estimate-origin, so a naive zip puts Chipotle's provenance on the salsa.
  const gap = NEW.build(REPLIES.gap, 'ai-text');
  check('a nameless item in the middle is dropped from the entries, as before',
        gap.entries.length === 2 && shape(gap.entries.map(e => e.name)) ===
        shape(OLD.build(REPLIES.gap, 'ai-text').entries.map(e => e.name)));
  check('and the provenance does not slide onto the row below it',
        gap.origins.length === 2 && gap.origins[0].origin === 'menu' && gap.origins[1].origin === 'ai',
        shape(gap.origins));
  check('one origin per entry, always, for every reply',
        KEYS.every(k => {
          const r = NEW.build(REPLIES[k], 'ai-text');
          return r.origins.length === r.entries.length;
        }));
}

/* ================= F. THE SHEET ================= */
section('F. the sheet reads it, and reads nothing else differently');
{
  check('the confidence pill is still exactly what the Worker sent',
        newSrc.includes('const conf = CONF[res.confidence] || CONF.medium;') &&
        oldSrc.includes('const conf = CONF[res.confidence] || CONF.medium;'));
  check('the heading is no longer a literal on the estimate sheet',
        !/'eyebrow', 'Claude’s estimate'/.test(newSrc) &&
        /'eyebrow', 'Claude’s estimate'/.test(oldSrc));
  check('it comes from the rows still on screen, so a delete cannot leave it lying',
        newSrc.includes('const head = originHeading(origins);'));
  check('the two lists are spliced together',
        /entries\.splice\(i, 1\);\s*\n\s*origins\.splice\(i, 1\);/.test(newSrc));
  check('"Found in your log" is untouched — that sheet was already honest',
        newSrc.includes("el('div', 'eyebrow', 'Found in your log')"));
}

/* ---------- report ---------- */
console.log('\nthe estimate sheet says where the number came from\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
