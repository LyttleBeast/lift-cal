#!/usr/bin/env node
//
// Verifier for Save as meal, off the estimate sheet (v55).
//
//   node tools-check/save-as-meal.mjs
//
// Micah, 16 Sep 2026: on the estimate result, where each row says whether it
// came from the database or the AI, "a checkbox/button to save that item (or
// plate) as a saved meal for quick re-logging later". Decided in
// SHIP-V55-PROMPT §4. What has to hold:
//
//   THE PATH THAT EXISTS.  Saved meals already exist — food/meals, the meal
//        builder, persistMeal. "Save as meal" (the plate) and each row's own
//        "Save" open that builder, pre-filled, and save through that write.
//        No new node.
//   AS SHOWN.  The plate is saved as it stands when he taps — his corrections
//        to a row included — and the name box opens with the venue and the
//        item ("Panda Express · Grilled teriyaki chicken ×3.5"), or the
//        plate's first two items. He can rename it before it is saved.
//   NOTHING WITHOUT HIS TAP.  Opening the builder writes nothing; Cancel
//        writes nothing; Save writes once. The estimate sheet stays open
//        under it, and logging the plate is exactly what it was.
//   PROVENANCE THE WAY A SAVED MEAL CARRIES IT.  A saved ingredient is what
//        cleanIng keeps — name, amount, the numbers, the micros — so a row the
//        model priced is saved with its numbers, and re-logging it from My
//        meals is a saved meal like any other: src 'meal', no estimate spent.
//   FOOD HAS NO KG OR LB.  The same save and the same log on a kilo account.
//
// NO COPY OF ANY RULE LIVES HERE. The sheet, the builder, persistMeal,
// logMeal, the meals list and addEntries are lifted verbatim out of ../food.js
// and run against a DOM shim, a model of the store's write() and the real
// ui.js; estimate-origin.js is imported for real.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => pathToFileURL(join(ROOT, p)).href;
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

/* ================= THE FAKE DOCUMENT ================= */
function mkEl(tag) {
  const n = {
    tag, className: '', textContent: '', innerHTML: '', value: '', placeholder: '', title: '', type: '', checked: false,
    children: [], parent: null, attrs: {}, style: {}, dataset: {}, disabled: false, onclick: null, onchange: null, oninput: null,
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
  // innerHTML = '' empties the element, the one use food.js makes of it.
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

/* ---------- lifting the real functions out of food.js ---------- */
const FSRC = src('food.js');
function liftFrom(SRC, file, name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(SRC);
  if (!m) throw new Error('save-as-meal: ' + name + '() is gone from ' + file + ' — Save as meal or this check is stale');
  return SRC.slice(m.index, SRC.indexOf('\n}\n', m.index) + 2).replace(/^export /, '');
}
const constOf = (head, end) => { const a = FSRC.indexOf(head); if (a === -1) throw new Error('save-as-meal: ' + head.trim() + ' is gone');
  return FSRC.slice(a, FSRC.indexOf(end, a) + end.length); };
// v56: and "Found in your log" (openRecallHit), which gains Save as meal (E).
const LIFTED = ['defaultMeal', 'fmtViewDate', 'macroTotals', 'newEntryId', 'addEntries', 'mealChips', 'normalizeImport', 'readMacros',
  'blankMeal', 'cleanIng', 'openMealsSheet', 'openMealBuilder', 'persistMeal', 'logMeal', 'saveAsMeal', 'openAiReview', 'openProposedEdit',
  'openRecallHit'];

function harness(o = {}) {
  const S = { writes: [], toasts: [], recalled: [], estimates: 0, db: {} };
  const stubs = {
    el: UI.el, sheet: UI.sheet, toast: m => S.toasts.push(String(m)), noteEl: UI.noteEl, confirmSheet: UI.confirmSheet,
    segmented: UI.segmented, r1: UI.r1, trimNum: UI.trimNum, clamp: UI.clamp, within: UI.within, LIMITS: UI.LIMITS,
    estimateOrigin: O.estimateOrigin, originHeading: O.originHeading, EDITED: O.EDITED, mealName: O.mealName,
    write: async (p, v) => { S.writes.push({ p, v: clone(v) }); S.db[p] = clone(v); },
    todayKey: () => '2026-09-25', isToday: () => true, bump: () => {},
    recallRemember: (q, list, kind) => { S.recalled.push({ q, list: clone(list), kind }); },
    kindForSrc: s => 'kind-of-' + s, rememberEntry: () => {}, saveDay: () => {}, render: () => {},
    openAiError: e => { S.error = e; }, openIngredient: () => {}, openIngredientSource: () => {},
    // Food has no weight unit. Handed in so a kilo account can be proven to change nothing.
    wu: () => o.u || 'lb',
    // No estimate is ever spent re-logging a saved meal: anything that asks for one is counted.
    estimateText: () => { S.estimates++; return Promise.reject(new Error('no')); },
    estimatePhoto: () => { S.estimates++; return Promise.reject(new Error('no')); },
    // v56: "Found in your log" hands "Not this — ask Claude" to the paid estimate. Counted the same way.
    runEstimate: () => { S.estimates++; }
  };
  const NAMES = Object.keys(stubs);
  const api = new Function(...NAMES, `
let meals = {}, items = {}, dayLog = {}, viewDate = new Date(2026, 8, 25, 12);
${constOf('\nconst MEALS = [', '\n];')}
${constOf('\nconst MICROS = [', '\n];')}
${constOf('\nconst CONF = {', '\n};')}
${LIFTED.map(n => liftFrom(FSRC, 'food.js', n)).join('\n')}
return {
  review: (res, ctx) => openAiReview(res, ctx), mealsSheet: m => openMealsSheet(m), recall: (hit, ctx) => openRecallHit(hit, ctx),
  meals: () => meals, day: () => dayLog, clearDay: () => { dayLog = {}; }
};`)(...NAMES.map(k => stubs[k]));
  return { api, S };
}

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
const tap = (sh, label) => { const b = buttonsIn(sh).find(x => x.textContent === label); if (!b) throw new Error('no button ' + label); return b.onclick(); };
const flush = () => new Promise(r => setTimeout(r, 0));
const reset = () => { body.children.length = 0; };

/* ================= THE REPLIES =================
   Shaped as the Worker sends them (estimate-origin.mjs has the code paths):
   a Panda order the food layer priced off the published menu, and a
   residual one where the model priced the rest. */
const panda = (name, qty, cal, p, c, f) => ({ name, qty, cal, p, c, f,
  src: { kind: 'curated', venue: 'panda-express', from: 'https://www.pandaexpress.com/nutrition', asOf: '2026-09', stale: false } });
const PLATE = { ok: true, mode: 'text', source: 'curated', venue: 'panda-express', confidence: 'high', note: '',
  usage: { in: 0, out: 0, searches: 0, usd: 0 },
  items: [panda('Grilled teriyaki chicken', '3.5 × entrée', 963, 126, 28, 35), panda('Fried rice', '1 × side', 520, 11, 85, 16)] };
const MIXED = { ok: true, mode: 'text', source: 'mixed', venue: 'panda-express', confidence: 'medium', note: '',
  usage: { in: 800, out: 200, searches: 0, usd: 0.0041 },
  items: [panda('Fried rice', '1 × side', 520, 11, 85, 16),
          { name: 'Homemade egg roll', qty: '2 rolls', cal: 380, p: 12, c: 40, f: 18, micro: { sodium: 900 }, src: { kind: 'ai', model: 'm', searched: false } }] };
const CTX = { meal: 'dinner', mode: 'text', text: 'Panda Express 3.5 grilled teriyaki chicken, side fried rice' };

/* ================= A. THE NAME IT OPENS WITH ================= */
section('A. the name box opens with the venue and the item, or the plate’s first two items — never a number the reply did not say');
{
  const prov = O.estimateOrigin(PLATE).rows;
  check('one row: "Panda Express · Grilled teriyaki chicken ×3.5"',
        O.mealName([PLATE.items[0]], [prov[0]], PLATE) === 'Panda Express · Grilled teriyaki chicken ×3.5', O.mealName([PLATE.items[0]], [prov[0]], PLATE));
  check('the plate: "Panda Express · Grilled teriyaki chicken, Fried rice"',
        O.mealName(PLATE.items, prov, PLATE) === 'Panda Express · Grilled teriyaki chicken, Fried rice');
  const three = PLATE.items.concat([panda('Chow mein', '1 × side', 510, 13, 80, 20)]);
  check('three items: the first two only', O.mealName(three, O.estimateOrigin({ ...PLATE, items: three }).rows, PLATE) === 'Panda Express · Grilled teriyaki chicken, Fried rice');
  const mp = O.estimateOrigin(MIXED).rows;
  check('a row the model priced, on a Panda order: the order’s venue, and its own name — "Panda Express · Homemade egg roll"',
        O.mealName([MIXED.items[1]], [mp[1]], MIXED) === 'Panda Express · Homemade egg roll');
  const home = { ok: true, mode: 'text', items: [{ name: 'Chicken and rice', qty: '1 bowl', cal: 650, p: 52, c: 78, f: 12 }] };
  check('no venue anywhere: the item alone — "Chicken and rice"', O.mealName(home.items, O.estimateOrigin(home).rows, home) === 'Chicken and rice');
  const q = qty => O.mealName([{ name: 'Rice', qty }], [null], null);
  check('a count only where the amount starts with one: "2 servings" ×2, "2 x bowl" ×2, "1 × side" none, "3.5 oz" none, "a bowl" none',
        q('2 servings') === 'Rice ×2' && q('2 x bowl') === 'Rice ×2' && q('1 × side') === 'Rice' && q('3.5 oz') === 'Rice' && q('a bowl') === 'Rice' && q('') === 'Rice');
  check('nothing to name: an empty box, never a guess', O.mealName([], [], PLATE) === '' && O.mealName(null, null, null) === '');
}

/* ================= B. THE ESTIMATE SHEET ================= */
section('B. on the estimate sheet: "Save as meal" for the plate and "Save" on each row — and logging the plate is exactly what it was');
let savedPlate;
{
  reset();
  const h = harness();
  h.api.review(clone(PLATE), { ...CTX });
  const sh = top();
  const saves = buttonsIn(sh).filter(b => b.classList.contains('pe-save'));
  check('each row carries a small "Save", labelled for what it does, and the plate one "Save as meal"',
        saves.length === 2 && saves.every(b => b.textContent === 'Save') &&
        saves[0].getAttribute('aria-label') === 'Save Grilled teriyaki chicken as a meal' &&
        buttonsIn(sh).filter(b => b.textContent === 'Save as meal').length === 1);
  const order = buttonsIn(sh).filter(b => b.classList.contains('btn')).map(b => b.textContent);
  check('under "Log it", and before the rest: ' + order.join(' · '), order.indexOf('Save as meal') === order.indexOf('Log it') + 1);
  check('and the row keeps the line saying where its number came from', find(sh, 'fe-sub').some(x => x.textContent === 'Panda Express · published Sep 2026'));

  // A correction first, through the row's own fix-it sheet: the fried rice was a large side.
  buttonsIn(sh).filter(b => b.classList.contains('pe-body'))[1].onclick();
  const fix = top();
  const ins = walk(fix).filter(x => x.tag === 'input');
  ins[1].value = '1 × large side'; ins[2].value = '780'; ins[3].value = '16'; ins[4].value = '128'; ins[5].value = '24';
  tap(fix, 'Done');
  check('a row corrected by hand says so, and the plate reads the new numbers', find(sh, 'fe-sub').some(x => x.textContent === 'edited by hand') &&
        walk(sh).some(x => x.tag === 'h2' && x.textContent === '1,743 kcal  ·  2 items'));

  // Save as meal: the builder, pre-filled, in its save-only form.
  const before = h.S.writes.length;
  tap(sh, 'Save as meal');
  const b = top();
  const nameIn = walk(b).find(x => x.tag === 'input' && x.type === 'text');
  check('the meal builder opens over the sheet, the sheet still open beneath it', sheets().length === 2 && b !== sh && sheets()[0] === sh);
  check('its name box reads "Panda Express · Grilled teriyaki chicken, Fried rice"', nameIn && nameIn.value === 'Panda Express · Grilled teriyaki chicken, Fried rice', nameIn && nameIn.value);
  check('the plate as shown: both rows, the corrected one at its corrected numbers',
        walk(b).filter(x => x.classList.contains('fe-name')).map(x => x.textContent).join() === 'Grilled teriyaki chicken,Fried rice' &&
        walk(b).some(x => x.classList.contains('fe-cal') && x.textContent === '780') &&
        (find(b, 'entry-readout')[0] || {}).textContent === '1,743 kcal   ·   P 142   C 156   F 59', (find(b, 'entry-readout')[0] || {}).textContent);
  const labels = buttonsIn(b).filter(x => x.classList.contains('btn')).map(x => x.textContent);
  check('in its save-only form: "Save meal" and Cancel — no Log meal, no Save without logging, no meal slot, no "Log it as"',
        labels.includes('Save meal') && labels.includes('Cancel') && !labels.some(l => /^Log meal/.test(l)) && !labels.includes('Save without logging') &&
        !find(b, 'filter-row').length && !find(b, 'seg').length && !find(b, 'save-check').length, labels.join(' · '));
  check('and one plain line: "It keeps these numbers, so logging it again from My meals is free."',
        find(b, 'note').some(x => x.textContent === 'It keeps these numbers, so logging it again from My meals is free.'));
  check('opening it wrote nothing', h.S.writes.length === before);
  tap(b, 'Cancel');
  check('Cancel writes nothing and leaves the estimate sheet where it was', h.S.writes.length === before && sheets().length === 1 && top() === sh);

  // Again, renamed, and saved.
  tap(sh, 'Save as meal');
  const b2 = top();
  const n2 = walk(b2).find(x => x.tag === 'input' && x.type === 'text');
  n2.value = ''; n2.oninput({ target: n2 });
  await tap(b2, 'Save meal');
  check('an empty name: "Give it a name first", and nothing written', h.S.toasts.pop() === 'Give it a name first' && h.S.writes.length === before);
  n2.value = 'Panda night'; n2.oninput({ target: n2 });
  await tap(b2, 'Save meal');
  const w = h.S.writes.slice(before);
  savedPlate = Object.values(h.api.meals())[0];
  check('renamed and saved: one write, to food/meals — the node saved meals already live in', w.length === 1 && w[0].p === 'food/meals', J(w.map(x => x.p)));
  check('holding "Panda night" and the two rows as shown', !!savedPlate && savedPlate.name === 'Panda night' &&
        J(savedPlate.items.map(i => [i.name, i.qty, i.cal, i.p, i.c, i.f])) === J([['Grilled teriyaki chicken', '3.5 × entrée', 963, 126, 28, 35], ['Fried rice', '1 × large side', 780, 16, 128, 24]]),
        J(savedPlate));
  check('"Saved to my meals", the builder closed, and the estimate sheet still there', h.S.toasts.pop() === 'Saved to my meals' && sheets().length === 1 && top() === sh);
  check('each saved row is a saved meal’s ingredient — name, amount, the numbers — and no src, no meal slot, no provenance line',
        savedPlate.items.every(i => Object.keys(i).every(k => ['name', 'qty', 'cal', 'p', 'c', 'f', 'micro', 'itemId', 'amt', 'unit'].includes(k))));

  // One row, saved on its own. A meal's id is the millisecond it was begun
  // (blankMeal), so this waits one out: no thumb opens two in the same one.
  await new Promise(r => setTimeout(r, 3));
  tap(sh, 'Save'); // the first row's
  const b3 = top();
  check('a row’s "Save": the builder with that row alone, named "Panda Express · Grilled teriyaki chicken ×3.5"',
        walk(b3).filter(x => x.classList.contains('fe-name')).length === 1 &&
        walk(b3).find(x => x.tag === 'input' && x.type === 'text').value === 'Panda Express · Grilled teriyaki chicken ×3.5');
  await tap(b3, 'Save meal');
  const two = Object.values(h.api.meals());
  check('saved as a second meal of one ingredient, at 963 — the estimate’s number', two.length === 2 &&
        two.some(m => m.name === 'Panda Express · Grilled teriyaki chicken ×3.5' && m.items.length === 1 && m.items[0].cal === 963));

  // And the plate, logged from the sheet, exactly as without any of this.
  tap(sh, 'Log it');
  const logged = Object.values(h.api.day()).map(({ id, t, ...e }) => e);
  const hc = harness(); reset();
  hc.api.review(clone(PLATE), { ...CTX });
  const sc = top();
  buttonsIn(sc).filter(b_ => b_.classList.contains('pe-body'))[1].onclick();
  const fx = top(), ii = walk(fx).filter(x => x.tag === 'input');
  ii[1].value = '1 × large side'; ii[2].value = '780'; ii[3].value = '16'; ii[4].value = '128'; ii[5].value = '24';
  tap(fx, 'Done');
  tap(sc, 'Log it');
  const control = Object.values(hc.api.day()).map(({ id, t, ...e }) => e);
  check('logging the plate afterwards writes exactly what it writes when nothing was saved: the same entries, src and all',
        J(logged) === J(control) && logged.length === 2 && logged.every(e => e.src === 'food-db'), J(logged));
  check('and the sentence is remembered for the food memory exactly as before', J(h.S.recalled) === J(hc.S.recalled) && h.S.recalled.length === 1);
}

/* ================= C. FROM MY MEALS ================= */
section('C. it is in My meals, and logging it gives the same numbers — no estimate spent');
{
  reset();
  const h = harness();
  h.api.review(clone(MIXED), { ...CTX });
  const sh = top();
  tap(sh, 'Save as meal');
  await tap(top(), 'Save meal');
  const m = Object.values(h.api.meals())[0];
  check('a residual answer saved whole: the menu row and the row the model priced, each with its numbers and micros',
        !!m && m.name === 'Panda Express · Fried rice, Homemade egg roll' && m.items.length === 2 &&
        m.items[1].cal === 380 && J(m.items[1].micro) === J({ sodium: 900 }), J(m));
  reset();
  h.api.mealsSheet('lunch');
  const list = top();
  const row = buttonsIn(list).find(b => b.classList.contains('rt-item'));
  check('My meals lists it: "Panda Express · Fried rice, Homemade egg roll", 2 ingredients, 900 kcal',
        !!row && (find(row, 'rt-name')[0] || {}).textContent === 'Panda Express · Fried rice, Homemade egg roll' &&
        /^2 ingredients  ·  900 kcal  ·  P 23/.test((find(row, 'rt-meta')[0] || {}).textContent), row && (find(row, 'rt-meta')[0] || {}).textContent);
  row.onclick();
  const bld = top();
  check('opened, it is the builder as any saved meal opens: "Saved meal", with Log meal', find(bld, 'eyebrow')[0].textContent === 'Saved meal' &&
        buttonsIn(bld).some(b => /^Log meal/.test(b.textContent)));
  // Log meal awaits persistMeal first — a saved meal keeps its changes by default.
  await tap(bld, buttonsIn(bld).find(b => /^Log meal/.test(b.textContent)).textContent);
  const day = Object.values(h.api.day());
  const sum = k => day.reduce((a, e) => a + (e[k] || 0), 0);
  check('logged: the same macros the estimate had — 900 kcal, P 23, C 125, F 34 — as two saved-meal entries (src "meal")',
        day.length === 2 && sum('cal') === 900 && UI.r1(sum('p')) === 23 && UI.r1(sum('c')) === 125 && UI.r1(sum('f')) === 34 &&
        day.every(e => e.src === 'meal' && e.meal === 'lunch'), J(day));
  check('with no estimate asked for — re-logging his own saved meal is free', h.S.estimates === 0);
}

/* ================= D. WHERE IT IS NOT, AND KILOS ================= */
section('D. not while building a meal already, and a kilo account saves and logs the very same');
{
  reset();
  const h = harness();
  h.api.review(clone(PLATE), { ...CTX, onPick: () => {} });
  check('from inside the meal builder (an ingredient being described): no "Save", no "Save as meal" — it is a meal already',
        !buttonsIn(top()).some(b => b.classList.contains('pe-save') || b.textContent === 'Save as meal'));
  const run = async u => {
    reset();
    const k = harness({ u });
    k.api.review(clone(PLATE), { ...CTX });
    tap(top(), 'Save as meal');
    await tap(top(), 'Save meal');
    reset();
    k.api.mealsSheet('dinner');
    buttonsIn(top()).find(b => b.classList.contains('rt-item')).onclick();
    await tap(top(), buttonsIn(top()).find(b => /^Log meal/.test(b.textContent)).textContent);
    return { meals: Object.values(k.api.meals()).map(({ id, last, ...x }) => x), day: Object.values(k.api.day()).map(({ id, t, ...e }) => e) };
  };
  const lb = await run('lb'), kg = await run('kg');
  check('pounds or kilos: the saved meal and the logged entries are identical — food carries no weight unit', J(lb) === J(kg) && lb.day.length === 2, J(kg));
  const bodyOf = n => liftFrom(FSRC, 'food.js', n);
  check('and nothing on this path converts a unit: no units.js call in the sheet, the builder, the save or the log',
        ['openAiReview', 'saveAsMeal', 'openMealBuilder', 'persistMeal', 'logMeal', 'cleanIng'].every(n => !/\b(wOut|wIn|fmtW|labelW|unitW|wu)\(/.test(bodyOf(n))));
  check('and no new node: every write on this path is food/meals, the node AGENTS.md documents',
        !/write\('food\/(?!meals')/.test(bodyOf('persistMeal')) && /await write\('food\/meals', meals\);/.test(bodyOf('persistMeal')));
}

/* ================= E. "FOUND IN YOUR LOG" (v56) =================
   SHIP-V56-PROMPT §4.4: the free answer out of his own log gets Save as meal
   too — the same saveAsMeal, the same save-only builder — and logging it is
   exactly what it was. */
section('E. v56 — "Found in your log" has Save as meal too: the same path, the same builder, and logging exactly as it was');
{
  const HIT = { q: 'chucks bowl', kind: 'ai', n: 3, last: Date.UTC(2026, 8, 20, 12), exact: true,
                items: [{ name: 'Rice', qty: '1 cup', cal: 200, p: 4, c: 45, f: 0 }, { name: 'Ground beef 85/15', qty: '4 oz', cal: 240, p: 21, c: 0, f: 17 }] };
  const RCTX = { meal: 'lunch', mode: 'text', text: 'chucks bowl' };
  const correct = sh => {
    buttonsIn(sh).filter(b => b.classList.contains('pe-body'))[0].onclick();
    const fix = top(), ins = walk(fix).filter(x => x.tag === 'input');
    ins[1].value = '1.5 cup'; ins[2].value = '300'; ins[3].value = '6'; ins[4].value = '67'; ins[5].value = '1';
    tap(fix, 'Done');
  };
  reset();
  const h = harness();
  h.api.recall(clone(HIT), { ...RCTX });
  const sh = top();
  check('the sheet is "Found in your log"', (find(sh, 'eyebrow')[0] || {}).textContent === 'Found in your log');
  const order = buttonsIn(sh).filter(b => b.classList.contains('btn')).map(b => b.textContent);
  check('"Save as meal" sits under "Log it", as it does on the estimate sheet: ' + order.join(' · '),
        order.indexOf('Save as meal') === order.indexOf('Log it') + 1 && order.filter(l => l === 'Save as meal').length === 1);
  correct(sh);
  const before = h.S.writes.length;
  tap(sh, 'Save as meal');
  const b = top();
  const nameIn = walk(b).find(x => x.tag === 'input' && x.type === 'text');
  check('the same save-only builder opens over it — "Save meal" and Cancel, no Log meal — named as the estimate sheet names a plate: "Rice, Ground beef 85/15"',
        sheets().length === 2 && sheets()[0] === sh && nameIn && nameIn.value === 'Rice, Ground beef 85/15' &&
        buttonsIn(b).some(x => x.textContent === 'Save meal') && !buttonsIn(b).some(x => /^Log meal/.test(x.textContent)), nameIn && nameIn.value);
  check('holding the rows as shown, the corrected one at its corrected numbers',
        walk(b).filter(x => x.classList.contains('fe-name')).map(x => x.textContent).join() === 'Rice,Ground beef 85/15' &&
        walk(b).some(x => x.classList.contains('fe-cal') && x.textContent === '300'));
  check('opening it wrote nothing', h.S.writes.length === before);
  tap(b, 'Cancel');
  check('Cancel writes nothing, and "Found in your log" is where it was', h.S.writes.length === before && sheets().length === 1 && top() === sh);
  tap(sh, 'Save as meal');
  await tap(top(), 'Save meal');
  const w = h.S.writes.slice(before);
  const m = Object.values(h.api.meals())[0];
  check('saved through the same write: one, to food/meals', w.length === 1 && w[0].p === 'food/meals', J(w.map(x => x.p)));
  check('as saved meals are: each row an ingredient — name, amount, the numbers — no src "recall", no meal slot',
        !!m && m.name === 'Rice, Ground beef 85/15' && J(m.items.map(i => [i.name, i.qty, i.cal])) === J([['Rice', '1.5 cup', 300], ['Ground beef 85/15', '4 oz', 240]]) &&
        m.items.every(i => Object.keys(i).every(k => ['name', 'qty', 'cal', 'p', 'c', 'f', 'micro', 'itemId', 'amt', 'unit'].includes(k))), J(m));
  check('"Saved to my meals", and the sheet still open under it', h.S.toasts.pop() === 'Saved to my meals' && sheets().length === 1 && top() === sh);
  tap(sh, 'Log it');
  const logged = Object.values(h.api.day()).map(({ id, t, ...e }) => e);
  reset();
  const hc = harness();
  hc.api.recall(clone(HIT), { ...RCTX });
  correct(top());
  tap(top(), 'Log it');
  const control = Object.values(hc.api.day()).map(({ id, t, ...e }) => e);
  check('logging it afterwards writes exactly what it writes when nothing was saved — src "recall", and no estimate spent',
        J(logged) === J(control) && logged.length === 2 && logged.every(e => e.src === 'recall' && e.meal === 'lunch') && h.S.estimates === 0, J(logged));
  check('and the sentence is remembered exactly as before', J(h.S.recalled) === J(hc.S.recalled) && h.S.recalled.length === 1);
  reset();
  harness().api.recall(clone(HIT), { ...RCTX, onPick: () => {} });
  check('not while building a meal already: no "Save as meal"', !buttonsIn(top()).some(x => x.textContent === 'Save as meal'));
  check('and the button is the estimate sheet’s own call: saveAsMeal, with mealName', /keep\.onclick = \(\) => saveAsMeal\(entries, mealName\(entries, \[\], null\),/.test(liftFrom(FSRC, 'food.js', 'openRecallHit')));
}

console.log('\nsave as meal: the plate or a row, through the builder that exists, and only on his tap\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
