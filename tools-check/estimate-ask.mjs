#!/usr/bin/env node
//
// Verifier for "Which one?" — the client half of the estimator's ask (v55).
//
//   node tools-check/estimate-ask.mjs
//
// The contract (SHIP-V55-PROMPT.md, copied whole into NEXT-NATIVE-V55.md) is
// fixed and the Worker is building its half against it now; this client
// cannot reach it. So every reply here is shaped EXACTLY as the contract's
// example, and then broken the ways the brief names: no options, one option,
// an option without an item, `at` out of range — and two asks, which is not
// broken but has to be shown in turn. What has to hold:
//
//   ASKED ON TEXT, NEVER ON A PHOTO.  A text estimate sends `ask: 1`; "None of
//        these" and a photo do not, and a request without it is today's
//        request byte for byte (ai.js, against rack-v54's out of git).
//   A QUESTION IS DRAWN ONLY WHOLE.  Every part of a reply's ask must read, or
//        none of it is drawn: the sentence goes back as today's estimate, and
//        an empty question is never on screen.
//   A PICK IS EXACT.  Its row goes in at `at`, before the row it names, the
//        asks answered in order; the result screen reads it as a menu row with
//        its own calories, which are the chip's; the client never multiplies.
//   "NONE OF THESE" IS TODAY'S PATH, AND SAYS WHAT IT COSTS.  The sentence
//        re-sent without `ask`: one estimate, and the chip's second line says
//        so. The chips are 44px or taller and hold at 320px (touch-target.mjs
//        has the height; the CSS is checked here).
//
// NO COPY OF ANY RULE LIVES HERE. estimate-ask.js and estimate-origin.js are
// imported for real; ai.js is staged against a stubbed store with fetch
// captured; food.js's runEstimate, the question sheet and the result sheet are
// lifted verbatim and run against a DOM shim.

import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => pathToFileURL(join(ROOT, p)).href;
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const BEFORE = '2e8da18';   // rack-v54: what a request without `ask` must still be

/* ================= THE FAKE DOCUMENT ================= */
function mkEl(tag) {
  const n = {
    tag, className: '', textContent: '', value: '', placeholder: '', title: '', type: '',
    children: [], parent: null, attrs: {}, style: {}, dataset: {}, disabled: false, onclick: null,
    classList: {
      add(...cs) { cs.forEach(c => { if (!n.classList.contains(c)) n.className = (n.className + ' ' + c).trim(); }); },
      remove(...cs) { n.className = n.className.split(' ').filter(x => x && !cs.includes(x)).join(' '); },
      contains: c => n.className.split(' ').includes(c)
    },
    setAttribute(k, v) { n.attrs[k] = String(v); },
    getAttribute(k) { return k in n.attrs ? n.attrs[k] : null; },
    appendChild(c) { c.parent = n; n.children.push(c); return c; },
    append(...cs) { cs.forEach(c => n.appendChild(c)); },
    remove() { if (n.parent) n.parent.children = n.parent.children.filter(x => x !== n); n.parent = null; },
    focus() {},
    querySelectorAll(sel) { return walk(n).filter(x => x.classList.contains(sel.replace(/^\./, ''))); }
  };
  Object.defineProperty(n, 'innerHTML', { get: () => '', set: () => { n.children.forEach(c => { c.parent = null; }); n.children = []; } });
  return n;
}
function walk(n, out = []) { n.children.forEach(c => { out.push(c); walk(c, out); }); return out; }
const body = mkEl('body');
globalThis.document = {
  body, createElement: t => mkEl(t), createElementNS: (_ns, t) => mkEl(t), createTextNode: t => ({ ...mkEl('#text'), textContent: t }),
  querySelector: sel => walk(body).find(x => x.classList.contains(sel.replace(/^\./, ''))) || null,
  querySelectorAll: () => [], getElementById: () => null
};
globalThis.window = { addEventListener() {} };

const UI = await import(real('ui.js'));
const O  = await import(real('estimate-origin.js'));
const K  = await import(real('estimate-ask.js'));

/* ---------- harness ---------- */
let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
  if (ok) { pass++; results.push('  ✓ ' + label); }
  else    { fail++; results.push('  ✗ ' + label + (detail ? '  — ' + detail : '')); }
}
function section(t) { results.push('\n' + t); }
const J = v => JSON.stringify(v);
const find = (n, cls) => walk(n).filter(x => x.classList.contains(cls));
const buttonsIn = n => walk(n).filter(x => x.tag === 'button');
const sheets = () => body.children.filter(x => x.classList.contains('sheet'));
const top = () => sheets()[sheets().length - 1] || null;
const flush = () => new Promise(r => setTimeout(r, 0));

/* ================= THE CONTRACT'S EXAMPLE =================
   Panda publishes Teriyaki chicken at 340 and Grilled teriyaki chicken at
   275; he said 3.5 of them, so each option's row is already ×3.5 (1190 and
   962.5 — the client never multiplies). The fried rice resolved free. */
const pandaSrc = { kind: 'curated', venue: 'panda-express', from: 'https://www.pandaexpress.com/nutrition', asOf: '2026-09', stale: false };
const row = (name, qty, cal, p, c, f) => ({ name, qty, cal, p, c, f, src: { ...pandaSrc } });
const TERI = row('Teriyaki chicken', '3.5 × entrée', 1190, 147, 49, 42);
const GRILL = row('Grilled teriyaki chicken', '3.5 × entrée', 962.5, 126, 28, 35);
const RICE = row('Fried rice', '1 × side', 520, 11, 85, 16);
const EXAMPLE = () => ({
  ok: true,
  ask: [{
    seg: '3.5 teriyaki chicken', at: 0, question: 'Which teriyaki chicken?',
    options: [
      { id: 'panda-express-teriyaki-chicken', label: 'Teriyaki chicken', item: clone(TERI) },
      { id: 'panda-express-grilled-teriyaki-chicken', label: 'Grilled teriyaki chicken', item: clone(GRILL) }
    ]
  }],
  items: [clone(RICE)],
  confidence: 'high', note: '', model: '', mode: 'text', source: 'curated', venue: 'panda-express',
  usage: { in: 0, out: 0, searches: 0, usd: 0 }, left: { kind: 'text', day: 18 }, spend: { usd: 0 }
});

/* ================= A. READING AN ASK ================= */
section('A. a reply’s ask is drawn only when every part of it reads — the contract’s example, and every way the brief breaks it');
{
  const a = K.readAsk(EXAMPLE());
  check('the contract’s example: one question, "Which teriyaki chicken?", two options in the venue’s order, the pick before the fried rice',
        a.kind === 'ask' && a.asks.length === 1 && a.asks[0].question === 'Which teriyaki chicken?' && a.asks[0].at === 0 &&
        J(a.asks[0].options.map(o => o.label)) === J(['Teriyaki chicken', 'Grilled teriyaki chicken']) &&
        a.asks[0].options[1].item.cal === 962.5 && a.asks[0].seg === '3.5 teriyaki chicken', J(a));
  check('no ask at all — every reply from an older Worker, or one that did not need to ask: nothing to draw, the reply as it always was',
        K.readAsk({ ok: true, items: [RICE] }).kind === 'none' && K.readAsk({ ok: true, items: [RICE], ask: null }).kind === 'none' &&
        K.readAsk(null).kind === 'none');
  const broken = (label, f) => { const r = EXAMPLE(); f(r); const got = K.readAsk(r); check(label + ' → not drawn (' + (got.why || got.kind) + ')', got.kind === 'bad', J(got)); };
  broken('no options', r => { r.ask[0].options = []; });
  broken('options missing', r => { delete r.ask[0].options; });
  broken('one option', r => { r.ask[0].options = r.ask[0].options.slice(0, 1); });
  broken('five options', r => { r.ask[0].options = [0, 1, 2, 3, 4].map(k => ({ id: 'x' + k, label: 'Option ' + k, item: clone(GRILL) })); });
  broken('an option without an item', r => { delete r.ask[0].options[1].item; });
  broken('an option whose item has no name', r => { r.ask[0].options[1].item.name = ''; });
  broken('an option whose item has no calories', r => { delete r.ask[0].options[0].item.cal; });
  broken('an option with no label', r => { r.ask[0].options[0].label = '  '; });
  broken('`at` out of range, past the end (2 with one row)', r => { r.ask[0].at = 2; });
  broken('`at` out of range, below zero', r => { r.ask[0].at = -1; });
  broken('`at` not a whole number (0.5)', r => { r.ask[0].at = 0.5; });
  broken('`at` a string ("0")', r => { r.ask[0].at = '0'; });
  broken('a question with no words', r => { r.ask[0].question = ''; });
  broken('an ask that is not a list', r => { r.ask = r.ask[0]; });
  broken('an empty list of asks', r => { r.ask = []; });
  broken('three asks — the contract allows two', r => { r.ask = [r.ask[0], clone(r.ask[0]), clone(r.ask[0])]; });
  broken('no items list', r => { delete r.items; });
  check('`at` at the very end is a place in the list: after the fried rice', (() => { const r = EXAMPLE(); r.ask[0].at = 1; return K.readAsk(r).kind === 'ask'; })());
  const two = EXAMPLE();
  two.ask.push({ seg: 'orange chicken', at: 2, question: 'Which orange chicken?', options: [
    { id: 'panda-express-orange-chicken', label: 'Orange chicken', item: row('Orange chicken', '1 × entrée', 490, 25, 51, 23) },
    { id: 'panda-express-orange-chicken-cub-meal', label: 'Orange chicken cub meal', item: row('Orange chicken cub meal', '1 × cub meal', 330, 17, 34, 15) }] });
  check('two asks: both read, the second’s `at` counting the first’s pick (2 = after the teriyaki and the rice)',
        K.readAsk(two).kind === 'ask' && K.readAsk(two).asks.length === 2);
  const twoBad = clone(two); twoBad.ask[1].at = 3;
  check('and a second `at` past the end of the list as it will stand is out of range', K.readAsk(twoBad).kind === 'bad');
}

/* ================= B. PUTTING A PICK IN ================= */
section('B. a pick goes in at `at`, the asks in order, and the reply comes back as a free answer');
{
  const r = EXAMPLE();
  const a = K.readAsk(r).asks;
  const got = K.withPicks(r, a, [1]);
  check('Grilled picked: the plate in the order he typed it — the teriyaki, then the fried rice',
        J(got.items.map(i => i.name)) === J(['Grilled teriyaki chicken', 'Fried rice']) && got.items[0].cal === 962.5);
  check('the question is off the reply, and everything else on it is as sent (source, confidence, usage, left)',
        !('ask' in got) && got.source === 'curated' && got.confidence === 'high' && J(got.usage) === J(r.usage) && J(got.left) === J(r.left));
  check('nothing handed in is changed, and the picked row is a copy', J(r) === J(EXAMPLE()) && got.items[0] !== a[0].options[1].item);
  const two = EXAMPLE();
  two.items.push(row('Chow mein', '1 × side', 510, 13, 80, 20));
  two.ask.push({ seg: 'orange chicken', at: 3, question: 'Which orange chicken?', options: [
    { id: 'oc', label: 'Orange chicken', item: row('Orange chicken', '1 × entrée', 490, 25, 51, 23) },
    { id: 'occ', label: 'Orange chicken cub meal', item: row('Orange chicken cub meal', '1 × cub meal', 330, 17, 34, 15) }] });
  const g2 = K.withPicks(two, K.readAsk(two).asks, [0, 0]);
  check('two asks: the first pick in at 0, then the second at 3 of the list as it now stands',
        J(g2.items.map(i => i.name)) === J(['Teriyaki chicken', 'Fried rice', 'Chow mein', 'Orange chicken']));
  check('a pick that is not one of its options, or one pick short: null, never a guess',
        K.withPicks(r, a, [2]) === null && K.withPicks(r, a, []) === null && K.withPicks(r, a, ['1']) === null);
  check('the chip’s words: "Grilled teriyaki chicken · 963 cal"', K.optionText('Grilled teriyaki chicken', 963) === 'Grilled teriyaki chicken · 963 cal');
  check('and the one chip the client writes whole: "None of these, estimate it" / "Uses one of today’s estimates"',
        K.NONE_LABEL === 'None of these, estimate it' && K.NONE_NOTE === 'Uses one of today’s estimates');
  const ASRC = src('estimate-ask.js');
  const code = ASRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"\\])\/\/.*$/, '$1')).join('\n');
  check('estimate-ask.js is pure: no import, no clock, no store, nothing global — the port copies it verbatim',
        !/^\s*import\b/m.test(code) && !/Date\.now|new Date|Math\.random|localStorage|document|window|fetch\(/.test(code));
  check('and its words carry no "AI", no "Claude", no exclamation mark',
        ![K.NONE_LABEL, K.NONE_NOTE].some(t => /\bAI\b|Claude|!/.test(t)));
}

/* ================= C. THE REQUEST ================= */
section('C. the request: `ask: 1` on a text estimate, and without it exactly today’s request');
{
  const dir = mkdtempSync(join(tmpdir(), 'rack-ask-'));
  const stage = (name, text) => {
    writeFileSync(join(dir, name), text
      .replace("from './store.js'", "from './store-stub.mjs'")
      .replace("from './ai-config.js'", 'from ' + JSON.stringify(real('ai-config.js'))));
    return import(pathToFileURL(join(dir, name)).href);
  };
  writeFileSync(join(dir, 'store-stub.mjs'), `
export async function idToken() { return 'tok'; }
export const LS = { get: (k, f) => (k === 'aiProxy' ? 'https://worker.example' : f), set() {}, del() {} };
`);
  const NOW = await stage('ai-now.mjs', src('ai.js'));
  const OLDAI = await stage('ai-v54.mjs', execFileSync('git', ['show', BEFORE + ':ai.js'], { cwd: ROOT, encoding: 'utf8' }));
  const sent = [];
  globalThis.fetch = async (url, init) => { sent.push({ url, body: init.body }); return { ok: true, status: 200, json: async () => ({ ok: true, items: [] }) }; };
  await NOW.estimateText('Panda Express 3.5 teriyaki chicken, side fried rice');
  check('a text estimate asks: {"mode":"text","text":"…","ask":1}',
        sent[0].url === 'https://worker.example/estimate' && J(JSON.parse(sent[0].body)) === J({ mode: 'text', text: 'Panda Express 3.5 teriyaki chicken, side fried rice', ask: 1 }), sent[0].body);
  await NOW.estimateText('Panda Express 3.5 teriyaki chicken, side fried rice', { ask: false });
  await OLDAI.estimateText('Panda Express 3.5 teriyaki chicken, side fried rice');
  check('"None of these": the same sentence without `ask`, byte for byte rack-v54’s request', sent[1].body === sent[2].body && !/"ask"/.test(sent[1].body), sent[1].body + ' / ' + sent[2].body);
  const shot = { media_type: 'image/jpeg', data: 'AAAA' };
  await NOW.estimatePhoto(shot, 'teriyaki');
  await OLDAI.estimatePhoto(shot, 'teriyaki');
  check('a photo never asks, and is byte for byte rack-v54’s', sent[3].body === sent[4].body && !/"ask"/.test(sent[3].body));
}

/* ================= D. ON SCREEN ================= */
section('D. the question on screen: one chip per option with its calories, "None of these" under them, and a pick is the result screen');
const FSRC = src('food.js');
function liftFrom(SRC, file, name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(SRC);
  if (!m) throw new Error('estimate-ask: ' + name + '() is gone from ' + file + ' — "Which one?" or this check is stale');
  return SRC.slice(m.index, SRC.indexOf('\n}\n', m.index) + 2).replace(/^export /, '');
}
const constOf = (head, end) => { const a = FSRC.indexOf(head); if (a === -1) throw new Error('estimate-ask: ' + head.trim() + ' is gone');
  return FSRC.slice(a, FSRC.indexOf(end, a) + end.length); };
const LIFTED = ['defaultMeal', 'fmtViewDate', 'macroTotals', 'newEntryId', 'addEntries', 'mealChips', 'normalizeImport', 'readMacros',
  'blankMeal', 'cleanIng', 'openMealBuilder', 'persistMeal', 'saveAsMeal', 'openAiReview', 'openProposedEdit',
  'runEstimate', 'plainEstimate', 'openEstimating', 'openAiError', 'openWhichOne'];
function harness(replies) {
  const S = { calls: [], bumps: [], toasts: [], recalled: [] };
  const queue = replies.slice();
  const stubs = {
    el: UI.el, sheet: UI.sheet, toast: m => S.toasts.push(String(m)), noteEl: UI.noteEl, confirmSheet: UI.confirmSheet,
    segmented: UI.segmented, r1: UI.r1, trimNum: UI.trimNum, clamp: UI.clamp, within: UI.within, LIMITS: UI.LIMITS,
    estimateOrigin: O.estimateOrigin, originHeading: O.originHeading, EDITED: O.EDITED, mealName: O.mealName,
    readAsk: K.readAsk, withPicks: K.withPicks, optionText: K.optionText, NONE_LABEL: K.NONE_LABEL, NONE_NOTE: K.NONE_NOTE,
    write: async () => {}, todayKey: () => '2026-09-25', isToday: () => true, bump: k => S.bumps.push(k),
    recallRemember: (q, list, kind) => { S.recalled.push({ q, list: clone(list), kind }); },
    kindForSrc: s => 'kind-of-' + s, rememberEntry: () => {}, saveDay: () => {}, render: () => {},
    openIngredient: () => {}, openIngredientSource: () => {}, openManual: () => {}, openAiSettings: () => {},
    // The Worker, modelled by the replies handed in, one per request — and every request recorded.
    estimateText: (text, opts) => { S.calls.push({ text, ask: !(opts && opts.ask === false) }); return Promise.resolve(clone(queue.shift())); },
    estimatePhoto: () => { S.calls.push({ photo: true }); return Promise.resolve(clone(queue.shift())); }
  };
  const NAMES = Object.keys(stubs);
  const api = new Function(...NAMES, `
let meals = {}, items = {}, dayLog = {}, viewDate = new Date(2026, 8, 25, 12);
${constOf('\nconst MEALS = [', '\n];')}
${constOf('\nconst MICROS = [', '\n];')}
${constOf('\nconst CONF = {', '\n};')}
${LIFTED.map(n => liftFrom(FSRC, 'food.js', n)).join('\n')}
return {
  describe: text => runEstimate({ meal: 'dinner', mode: 'text', busy: 'Working out the macros…', text,
                                  run: () => estimateText(text), retry: () => {} }),
  photo: () => runEstimate({ meal: 'dinner', busy: 'Reading your plate…', text: '', run: () => estimatePhoto({}, '') }),
  day: () => dayLog
};`)(...NAMES.map(k => stubs[k]));
  return { api, S };
}
const TEXT = 'Panda Express 3.5 teriyaki chicken, side fried rice';
const MODEL = { ok: true, mode: 'text', source: 'ai', confidence: 'medium', note: '', usage: { in: 900, out: 300, searches: 1, usd: 0.0062 },
  items: [{ name: 'Teriyaki chicken', qty: '3.5 servings', cal: 1100, p: 130, c: 40, f: 38, src: { kind: 'ai', model: 'm', searched: true } }, clone(RICE)] };
{
  body.children.length = 0;
  const h = harness([EXAMPLE()]);
  await h.api.describe(TEXT); await flush();
  const q = top();
  const chips = q ? buttonsIn(q).filter(b => b.classList.contains('ask-opt')) : [];
  check('the Worker’s question, as it wrote it: "Which teriyaki chicken?"', !!q && walk(q).some(x => x.tag === 'h2' && x.textContent === 'Which teriyaki chicken?'));
  check('one chip per option, its calories through the result rows’ own formatter: "Teriyaki chicken · 1190 cal", "Grilled teriyaki chicken · 963 cal"',
        J(chips.slice(0, 2).map(b => (find(b, 'ob-choice-t')[0] || {}).textContent)) === J(['Teriyaki chicken · 1190 cal', 'Grilled teriyaki chicken · 963 cal']),
        J(chips.map(b => (find(b, 'ob-choice-t')[0] || {}).textContent)));
  check('and under them "None of these, estimate it", saying in plain words what it costs',
        chips.length === 3 && (find(chips[2], 'ob-choice-t')[0] || {}).textContent === 'None of these, estimate it' &&
        (find(chips[2], 'ob-choice-d')[0] || {}).textContent === 'Uses one of today’s estimates');
  check('nothing else in the client’s words on it: no eyebrow, no "AI", no "Claude", no "!"',
        !find(q, 'eyebrow').length && !walk(q).some(x => /\bAI\b|Claude|!/.test(x.textContent || '')));
  check('the question was free: one request, and it asked', h.S.calls.length === 1 && h.S.calls[0].ask === true);
  chips[1].onclick(); await flush();
  const r = top();
  const names = r ? find(r, 'fe-name').map(x => x.textContent) : [];
  check('Grilled picked: the result screen, the teriyaki first as he typed it, then the fried rice', J(names) === J(['Grilled teriyaki chicken', 'Fried rice']), J(names));
  check('reading all menu — "From the Panda Express menu" — the teriyaki at 963, the chip’s own number, with its menu line',
        (find(r, 'eyebrow')[0] || {}).textContent === 'From the Panda Express menu' && find(r, 'fe-cal')[0].textContent === '963' &&
        find(r, 'fe-sub').filter(x => x.textContent === 'Panda Express · published Sep 2026').length === 2);
  check('the question sheet is gone, and still one request', sheets().length === 1 && h.S.calls.length === 1);
  const go = buttonsIn(r).find(b => b.textContent === 'Log it');
  await go.onclick();
  const day = Object.values(h.api.day());
  check('logged: 963 + 520, as a free answer (food-db) — and the sentence remembered, so asking again is free too',
        day.length === 2 && day.reduce((a, e) => a + e.cal, 0) === 1483 && day.every(e => e.src === 'food-db') &&
        h.S.recalled.length === 1 && h.S.recalled[0].q === TEXT);
}
{
  body.children.length = 0;
  const h = harness([EXAMPLE(), MODEL]);
  await h.api.describe(TEXT); await flush();
  const none = buttonsIn(top()).filter(b => b.classList.contains('ask-opt'))[2];
  none.onclick(); await flush(); await flush();
  const r = top();
  check('"None of these": the same sentence sent again without `ask` — today’s estimate, one more request',
        h.S.calls.length === 2 && h.S.calls[1].text === TEXT && h.S.calls[1].ask === false && h.S.bumps.filter(b => b === 'aiText').length === 2);
  check('and the model’s answer on the result screen, as ever', !!r && (find(r, 'eyebrow')[0] || {}).textContent === 'Part menu, part estimate' &&
        find(r, 'fe-name').map(x => x.textContent).join() === 'Teriyaki chicken,Fried rice');
}
{
  body.children.length = 0;
  const two = EXAMPLE();
  two.ask.push({ seg: 'orange chicken', at: 2, question: 'Which orange chicken?', options: [
    { id: 'oc', label: 'Orange chicken', item: row('Orange chicken', '1 × entrée', 490, 25, 51, 23) },
    { id: 'occ', label: 'Orange chicken cub meal', item: row('Orange chicken cub meal', '1 × cub meal', 330, 17, 34, 15) }] });
  const h = harness([two]);
  await h.api.describe(TEXT + ', orange chicken'); await flush();
  const first = top();
  check('two asks: the first question first', walk(first).some(x => x.tag === 'h2' && x.textContent === 'Which teriyaki chicken?'));
  buttonsIn(first).filter(b => b.classList.contains('ask-opt'))[0].onclick(); await flush();
  const second = top();
  check('then the second, in the same sheet, before any result', second === first && walk(second).some(x => x.tag === 'h2' && x.textContent === 'Which orange chicken?') &&
        !find(second, 'fe-name').length);
  buttonsIn(second).filter(b => b.classList.contains('ask-opt'))[0].onclick(); await flush();
  check('then the result: both picks where they go — Teriyaki chicken, Fried rice, Orange chicken',
        find(top(), 'fe-name').map(x => x.textContent).join() === 'Teriyaki chicken,Fried rice,Orange chicken' && h.S.calls.length === 1);
}
{
  const cases = [
    ['no options', r => { r.ask[0].options = []; }],
    ['one option', r => { r.ask[0].options = r.ask[0].options.slice(0, 1); }],
    ['an option without an item', r => { delete r.ask[0].options[0].item; }],
    ['`at` out of range', r => { r.ask[0].at = 5; }]
  ];
  for (const [label, f] of cases) {
    body.children.length = 0;
    const bad = EXAMPLE(); f(bad);
    const h = harness([bad, MODEL]);
    await h.api.describe(TEXT); await flush(); await flush();
    const shown = sheets();
    check(label + ': no question drawn — the sentence sent again without `ask`, and today’s answer shown',
          !walk(body).some(x => x.classList.contains('ask-opt')) && h.S.calls.length === 2 && h.S.calls[1].ask === false &&
          shown.length === 1 && find(shown[0], 'fe-name').map(x => x.textContent).join() === 'Teriyaki chicken,Fried rice',
          J(h.S.calls) + ' ' + shown.length);
  }
  body.children.length = 0;
  const h = harness([EXAMPLE()]);
  await h.api.photo(); await flush();
  check('a photo’s reply is never asked of — even one carrying an ask is drawn as its rows', !walk(body).some(x => x.classList.contains('ask-opt')) &&
        find(top(), 'fe-name').map(x => x.textContent).join() === 'Fried rice');
  body.children.length = 0;
  const hs = harness([{ ok: true, mode: 'text', source: 'curated', venue: 'panda-express', confidence: 'high', items: [clone(RICE)], usage: { usd: 0 } }]);
  await hs.api.describe('side fried rice'); await flush();
  check('a reply that asks nothing: the result screen exactly as before, one request', !walk(body).some(x => x.classList.contains('ask-opt')) &&
        find(top(), 'fe-name').map(x => x.textContent).join() === 'Fried rice' && hs.S.calls.length === 1);
}
{
  const css = src('rack.css');
  check('the chips are a 44px target in rack.css, and a long label wraps inside its chip rather than running off a 320px screen',
        /\.ask-opt \{[^}]*min-height: 44px/.test(css) && /\.ask-opt \.ob-choice-t \{[^}]*overflow-wrap: anywhere/.test(css) &&
        /\.ob-choice \{[^}]*width: 100%/.test(src('auth.css')));
}

console.log('\n"which one?": asked only when every part of it reads, picked exactly, and "none of these" is today’s estimate\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
