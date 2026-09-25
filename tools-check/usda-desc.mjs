#!/usr/bin/env node
//
// Verifier for the long USDA names, shown short (v58).
//
//   node tools-check/usda-desc.mjs
//
// THE CONTRACT (SHIP-V58-PROMPT §C; the Worker's half is rack-worker
// tools/FOOD4-PROMPT.md, which this tree cannot see). A generic row's `name`
// becomes a short everyday name — "Sirloin steak" — and USDA's own
// description moves to a new optional field, `src.desc` — "Beef, steak,
// sirloin, NS as to fat eaten". Both are additive: an older answer, or a
// cached one, has no `src.desc`, and its `name` is the long one.
//
// THE CLIENT'S HALF, and what has to hold:
//
//   A. estimate-origin.js carries `desc` on the row's origin, and only on a row
//      USDA published — a menu row, another publisher, a model row or a junk
//      value carries none. A row without one is rack-v57's row exactly
//      (rack-v57's module, from git, is the control).
//   B. The fix-it sheet a row's tap opens shows "USDA: <desc>" as a small line
//      under the name, only when it is there — and not once the row has been
//      corrected by hand, which is when its provenance line goes too. The
//      "Which one?" result is the same screen, and a pick carries it.
//   C. Nothing else changes. What is logged is whatever `name` says, and no
//      `desc` is written anywhere — the day log, the food memory.
//   D. recall.js keys the typed sentence on what was typed. It ALSO files
//      every logged food under its own name (rememberEntry, which addEntries
//      calls for each row the sheet logs) — the brief said it keys only on what
//      was typed, and that half is not so. Pinned here as it is, not changed:
//      with the short name, "sirloin steak" typed alone finds the 8 oz he
//      logged, free; under the long name it found nothing.
//
// NO COPY OF ANY RULE LIVES HERE. openAiReview, openProposedEdit, addEntries
// and what they call are lifted verbatim out of ../food.js and run against a
// DOM shim and the real ui.js, as save-as-meal.mjs does; estimate-origin.js
// and estimate-ask.js are imported for real, and recall.js is staged with a
// stub store, as recall-matcher.mjs does.

import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..');
const src  = p => readFileSync(join(ROOT, p), 'utf8');
const real = p => pathToFileURL(join(ROOT, p)).href;
const clone = v => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const V57 = 'f985823';                       // rack-v57

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
const A  = await import(real('estimate-ask.js'));

// rack-v57's estimate-origin.js, the control: it imports nothing, so it loads from a file of its own.
const dir = mkdtempSync(join(tmpdir(), 'rack-usda-desc-'));
writeFileSync(join(dir, 'origin57.mjs'), execFileSync('git', ['show', V57 + ':estimate-origin.js'], { cwd: ROOT, encoding: 'utf8' }));
const O57 = await import(pathToFileURL(join(dir, 'origin57.mjs')).href);

/* ---------- lifting the real functions out of food.js ---------- */
const FSRC = src('food.js');
function lift(name) {
  const m = new RegExp('^(?:export )?(?:async )?function ' + name + '\\(', 'm').exec(FSRC);
  if (!m) throw new Error('usda-desc: ' + name + '() is gone from food.js — the sheet or this check is stale');
  return FSRC.slice(m.index, FSRC.indexOf('\n}\n', m.index) + 2).replace(/^export /, '');
}
const constOf = (head, end) => { const a = FSRC.indexOf(head); if (a === -1) throw new Error('usda-desc: ' + head.trim() + ' is gone');
  return FSRC.slice(a, FSRC.indexOf(end, a) + end.length); };
const LIFTED = ['defaultMeal', 'fmtViewDate', 'newEntryId', 'addEntries', 'mealChips', 'normalizeImport', 'readMacros',
  'openAiReview', 'openProposedEdit'];

function harness() {
  const S = { writes: [], toasts: [], recalled: [], remembered: [] };
  const stubs = {
    el: UI.el, sheet: UI.sheet, toast: m => S.toasts.push(String(m)), noteEl: UI.noteEl, segmented: UI.segmented,
    r1: UI.r1, trimNum: UI.trimNum, clamp: UI.clamp, within: UI.within, LIMITS: UI.LIMITS,
    estimateOrigin: O.estimateOrigin, originHeading: O.originHeading, EDITED: O.EDITED, mealName: O.mealName,
    write: async (p, v) => { S.writes.push({ p, v: clone(v) }); },
    isToday: () => true, bump: () => {}, saveDay: () => {}, render: () => {},
    recallRemember: (q, list, kind) => { S.recalled.push({ q, list: clone(list), kind }); },
    kindForSrc: s => 'kind-of-' + s,
    // What recall.js would file each logged food under — D drives the real one.
    rememberEntry: e => { S.remembered.push(clone(e)); },
    openAiError: e => { S.error = e; }, saveAsMeal: () => {}
  };
  const NAMES = Object.keys(stubs);
  const api = new Function(...NAMES, `
let items = {}, dayLog = {}, viewDate = new Date(2026, 8, 25, 12);
${constOf('\nconst MEALS = [', '\n];')}
${constOf('\nconst MICROS = [', '\n];')}
${constOf('\nconst CONF = {', '\n};')}
${LIFTED.map(lift).join('\n')}
return { review: (res, ctx) => openAiReview(res, ctx), day: () => dayLog };`)(...NAMES.map(k => stubs[k]));
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
const reset = () => { body.children.length = 0; };
const rowsOf = sh => buttonsIn(sh).filter(b => b.classList.contains('pe-body'));
const texts = n => walk(n).map(x => x.textContent || '');

/* ================= THE REPLIES =================
   Shaped as the Worker sends a generic: kind 'curated', `from` the FDC page a
   human can open (estimate-origin.mjs C has the code path), `asOf`, `stale` —
   and, from FOOD4 on, `desc`. */
const FDC = 'https://fdc.nal.usda.gov/food-details/172688/nutrients';
const DESC = 'Beef, steak, sirloin, NS as to fat eaten';
const RICE_DESC = 'Rice, white, long-grain, regular, enriched, cooked';
const gen = (name, qty, cal, p, c, f, desc) => ({ name, qty, cal, p, c, f,
  src: { kind: 'curated', from: FDC, asOf: '2026-04-23', stale: false, ...(desc === undefined ? null : { desc }) } });
const reply = (items, extra) => ({ ok: true, mode: 'text', source: 'curated', confidence: 'high', note: '', usage: { usd: 0 }, items, ...(extra || null) });

// After FOOD4: the short name, and USDA's description beside it.
const NEW  = reply([gen('Sirloin steak', '8 oz', 460, 64, 0, 21, DESC)]);
// The same row without `src.desc` — the control for "desc changes nothing written".
const BARE = reply([gen('Sirloin steak', '8 oz', 460, 64, 0, 21)]);
// Before FOOD4, or cached from then: the long name, no desc.
const OLD  = reply([gen(DESC, '8 oz', 460, 64, 0, 21)]);
// A residual answer: a generic with its desc, and a row the model priced.
const MIXED = reply([gen('White rice', '1 cup', 205, 4.3, 45, 0.4, RICE_DESC),
  { name: 'Homemade chimichurri', qty: '2 tbsp', cal: 150, p: 0, c: 1, f: 16,
    src: { kind: 'ai', model: 'claude-sonnet-5', searched: false, desc: 'not USDA’s' } }], { source: 'mixed', confidence: 'medium' });
const CTX = { meal: 'dinner', mode: 'text', text: '8 oz steak' };

/* ================= A. THE PURE HALF ================= */
section('A. estimate-origin.js: a USDA row carries its description, nothing else does, and a row without one is rack-v57’s');
{
  const row = res => O.estimateOrigin(res).rows[0];
  const one = s => O.estimateOrigin({ items: [{ name: 'x', src: s }] }).rows[0];
  check('the new answer’s row: origin usda, "USDA · published Apr 2026", and desc "' + row(NEW).desc + '"',
        row(NEW).origin === 'usda' && row(NEW).label === 'USDA · published Apr 2026' && row(NEW).desc === DESC, J(row(NEW)));
  check('an older or cached answer — no src.desc — has no desc key at all, and is otherwise the same row',
        !('desc' in row(OLD)) && J(row(OLD)) === J({ origin: 'usda', venue: '', label: 'USDA · published Apr 2026' }), J(row(OLD)));
  check('the heading does not move for it: "From published nutrition" either way',
        O.estimateOrigin(NEW).heading === 'From published nutrition' && O.estimateOrigin(OLD).heading === 'From published nutrition');
  check('a publisher that reads "USDA" written plainly carries it too', one({ kind: 'curated', from: 'USDA', desc: DESC }).desc === DESC);
  check('trimmed, as the Worker’s other words are', one({ kind: 'curated', from: FDC, desc: '  ' + DESC + '\n' }).desc === DESC);

  const NOT = {
    'a menu row (Panda’s)': { kind: 'curated', venue: 'panda-express', from: 'https://www.pandaexpress.com/nutrition', desc: DESC },
    'another publisher’s row': { kind: 'curated', from: 'https://www.example-dairy.com/nutrition?id=4', desc: DESC },
    'a published row that names no publisher': { kind: 'curated', desc: DESC },
    'a row the model priced': { kind: 'ai', model: 'claude-sonnet-5', searched: false, desc: DESC },
    'a cache row': { kind: 'cache', desc: DESC },
    'a kind this build does not know': { kind: 'scanned', from: FDC, desc: DESC },
    'an empty desc': { kind: 'curated', from: FDC, desc: '' },
    'a desc of spaces': { kind: 'curated', from: FDC, desc: '   ' },
    'a number': { kind: 'curated', from: FDC, desc: 12 },
    'an object': { kind: 'curated', from: FDC, desc: { text: DESC } },
    'null': { kind: 'curated', from: FDC, desc: null }
  };
  const carried = Object.entries(NOT).filter(([, s]) => 'desc' in one(s)).map(([k]) => k);
  check('and none on ' + Object.keys(NOT).join(', ') + ' — "USDA:" would be untrue of some, and the rest have nothing to show',
        !carried.length, carried.join(', '));
  check('a whole-reply food answer with no per-item src (an older Worker) carries none', !('desc' in O.estimateOrigin({ source: 'parsed', items: [{ name: 'x' }] }).rows[0]));
  check('a row corrected by hand carries none — EDITED is frozen and has no desc', !('desc' in O.EDITED) && Object.isFrozen(O.EDITED));

  // The control: rack-v57's module, from git. Every reply without a desc gives
  // the same rows; with one, the same rows plus `desc` and nothing else.
  const ALL = { NEW, BARE, OLD, MIXED, ...Object.fromEntries(Object.entries(NOT).map(([k, s]) => [k, { items: [{ name: 'x', src: s }] }])) };
  const diff = Object.entries(ALL).filter(([, res]) => {
    const now = O.estimateOrigin(res), was = O57.estimateOrigin(res);
    const strip = r => { const { desc, ...rest } = r; return rest; };
    return J({ ...now, rows: now.rows.map(strip) }) !== J(was);
  }).map(([k]) => k);
  check('against rack-v57’s estimate-origin.js, all ' + Object.keys(ALL).length + ' replies: the same heading and rows, desc aside — it is additive',
        !diff.length, diff.join(', '));
  check('and with no desc anywhere, byte for byte rack-v57’s',
        [BARE, OLD].every(res => J(O.estimateOrigin(res)) === J(O57.estimateOrigin(res))));
  // The alignment trap, with a desc on the row below the gap.
  const gap = { source: 'mixed', items: [gen('White rice', '1 cup', 205, 4.3, 45, 0.4, RICE_DESC),
    { qty: '1', cal: 90, p: 0, c: 20, f: 0, src: { kind: 'ai' } }, gen('Sirloin steak', '8 oz', 460, 64, 0, 21, DESC)] };
  check('one row per item, the nameless one included, so each desc stays on its own row',
        J(O.estimateOrigin(gap).rows.map(r => r.desc || null)) === J([RICE_DESC, null, DESC]));
}

/* ================= B. THE SHEET ================= */
section('B. the fix-it sheet shows "USDA: …" under the name when the row has it, and only then');
{
  const fixOf = (res, i = 0, ctx = CTX) => { reset(); const h = harness(); h.api.review(clone(res), { ...ctx }); const sh = top();
    rowsOf(sh)[i].onclick(); return { h, sh, fix: top() }; };
  const descLines = n => find(n, 'pe-desc');
  {
    const { sh, fix } = fixOf(NEW);
    const d = descLines(fix);
    const field = d[0] && d[0].parent;
    const nameIn = field && field.children.find(x => x.tag === 'input');
    check('tapping the new row: one small line, "USDA: ' + DESC + '"', d.length === 1 && d[0].textContent === 'USDA: ' + DESC &&
          d[0].classList.contains('fe-sub'), J(d.map(x => x.textContent)));
    check('under the name: in the Name field, after its box, and the box holds the short name, "Sirloin steak"',
          !!field && (field.children[0] || {}).textContent === 'Name' && field.children.indexOf(d[0]) === field.children.indexOf(nameIn) + 1 &&
          nameIn.value === 'Sirloin steak', field && J(field.children.map(x => x.tag + ':' + (x.textContent || x.value))));
    check('and the estimate screen itself does not show it — the row says "Sirloin steak" and where its number came from, nothing more',
          !texts(sh).some(t => /^USDA:/.test(t)) && texts(sh).includes('Sirloin steak') && texts(sh).includes('USDA · published Apr 2026'));
    // Closed with nothing changed: the row keeps its provenance, and the line.
    tap(fix, 'Cancel');
    rowsOf(sh)[0].onclick();
    check('closed without a change and opened again: still there', descLines(top()).length === 1);
    // Corrected: the row is his numbers now, and says so; the line goes with its provenance.
    const ins = walk(top()).filter(x => x.tag === 'input');
    ins[2].value = '520';
    tap(top(), 'Done');
    rowsOf(sh)[0].onclick();
    check('corrected by hand ("edited by hand" on the row): gone — it would say whose row the numbers came from, and they are his now',
          texts(sh).includes('edited by hand') && descLines(top()).length === 0);
  }
  {
    const { fix } = fixOf(OLD);
    const nameIn = walk(fix).find(x => x.tag === 'input' && x.type === 'text');
    check('an older or cached answer: no line, and the name box holds the long name it has always held',
          descLines(fix).length === 0 && !texts(fix).some(t => /^USDA:/.test(t)) && nameIn.value === DESC);
  }
  {
    const r = fixOf(MIXED, 0).fix, a = fixOf(MIXED, 1).fix;
    check('a residual answer: the rice shows "USDA: ' + RICE_DESC + '", the row the model priced shows none, whatever its src says',
          descLines(r).length === 1 && descLines(r)[0].textContent === 'USDA: ' + RICE_DESC && descLines(a).length === 0);
  }
  {
    const panda = reply([{ name: 'Grilled teriyaki chicken', qty: '1 × entrée', cal: 275, p: 36, c: 8, f: 10,
      src: { kind: 'curated', venue: 'panda-express', from: 'https://www.pandaexpress.com/nutrition', asOf: '2026-09', stale: false, desc: DESC } }]);
    check('a menu row, even one sent a desc: none', descLines(fixOf(panda).fix).length === 0);
  }
  {
    // "Which one?": the result is openAiReview, and a pick is the option's row, src and all (withPicks).
    const ASK = reply([gen('White rice', '1 cup', 205, 4.3, 45, 0.4, RICE_DESC)], {
      ask: [{ seg: 'steak', at: 0, question: 'Which steak?', options: [
        { id: 'sirloin', label: 'Sirloin', item: gen('Sirloin steak', '8 oz', 460, 64, 0, 21, DESC) },
        { id: 'ribeye', label: 'Ribeye', item: gen('Ribeye steak', '8 oz', 620, 54, 0, 44, 'Beef, rib eye steak, boneless, lip off, separable lean and fat, trimmed to 0" fat, all grades, cooked, grilled') }] }] });
    const a = A.readAsk(ASK);
    const next = a.kind === 'ask' ? A.withPicks(ASK, a.asks, [0]) : null;
    const { fix } = fixOf(next, 0);
    check('"Which one?", Sirloin picked: the result’s first row is the pick, and its fix-it sheet shows "USDA: ' + DESC + '"',
          !!next && next.items[0].name === 'Sirloin steak' && descLines(fix).length === 1 && descLines(fix)[0].textContent === 'USDA: ' + DESC);
    check('and the answer it came with keeps its own: the rice, second, shows "USDA: ' + RICE_DESC + '"',
          descLines(fixOf(next, 1).fix)[0].textContent === 'USDA: ' + RICE_DESC);
  }
  const fn = lift('openAiReview'), pe = lift('openProposedEdit');
  check('the sheet hands the row’s own origin’s desc to the fix-it sheet, and the fix-it sheet prints it under the name, and nothing else prints it',
        /\}, o && o\.desc\);/.test(fn) && /if \(desc\) name\.appendChild\(el\('div', 'fe-sub pe-desc', 'USDA: ' \+ desc\)\);/.test(pe) &&
        (FSRC.match(/'USDA: '/g) || []).length === 1);
  check('"Found in your log" opens the fix-it sheet with no desc — a remembered row has none to give',
        /openProposedEdit\(e, paint\);/.test(lift('openRecallHit')));
}

/* ================= C. WHAT IS WRITTEN ================= */
section('C. nothing else changes: what is logged is whatever `name` says, and no desc is written');
{
  const logOf = res => { reset(); const h = harness(); h.api.review(clone(res), { ...CTX }); tap(top(), 'Log it');
    return { h, day: Object.values(h.api.day()).map(({ id, t, ...e }) => e) }; };
  const n = logOf(NEW), b = logOf(BARE), o = logOf(OLD);
  check('the new answer logs "Sirloin steak" — its name, as sent', n.day.length === 1 && n.day[0].name === 'Sirloin steak', J(n.day));
  check('and exactly what the same answer without src.desc logs, key for key: ' + J(n.day[0]),
        J(n.day) === J(b.day));
  check('no desc in the day log, in what the food memory is handed, or in what it files under a name',
        ![n.day, n.h.S.recalled, n.h.S.remembered].some(v => J(v).includes('NS as to fat') || /"desc"/.test(J(v))));
  check('the food memory is handed the sentence he typed, "8 oz steak", with the short name in its answer',
        n.h.S.recalled.length === 1 && n.h.S.recalled[0].q === '8 oz steak' && J(n.h.S.recalled[0].list.map(i => i.name)) === J(['Sirloin steak']));
  check('an older answer logs its long name, as it always has', o.day[0].name === DESC && J({ ...o.day[0], name: 'x' }) === J({ ...n.day[0], name: 'x' }));
  check('and normalizeImport, which builds every entry, reads no desc', !/\bdesc\b/.test(lift('normalizeImport')) && !/\bdesc\b/.test(lift('addEntries')));
}

/* ================= D. WHAT recall.js KEYS ON ================= */
section('D. recall.js: the typed sentence is keyed on what was typed — and every logged food on its own name, as it always was');
{
  const STUB = `
export async function read(_path, fallback) { return fallback; }
export function watch() { return () => {}; }
export function mergeUpdate() {}
export const LS = { get: (_k, d) => d, set() {}, del() {} };
`;
  writeFileSync(join(dir, 'store-stub.mjs'), STUB);
  writeFileSync(join(dir, 'recall.mjs'), src('recall.js').replace("from './store.js'", "from './store-stub.mjs'"));
  const R = await import(pathToFileURL(join(dir, 'recall.mjs')).href);
  await R.initRecall();
  const entry = { name: 'Sirloin steak', qty: '8 oz', cal: 460, p: 64, c: 0, f: 21, src: 'food-db', meal: 'dinner' };

  R.remember('8 oz steak', [entry], 'curated');
  const typed = R.lookup('8 oz steak'), byName = R.lookup('sirloin steak');
  check('the sentence is filed under what was typed, "' + R.keyOf('8 oz steak') + '" — "8 oz steak" finds it exactly',
        !!typed && typed.exact && typed.key === R.keyOf('8 oz steak'));
  check('and the names in its answer are not in its key: "sirloin steak" does not find it', byName === null, J(byName));

  R.forgetAll();
  R.rememberEntry(entry);
  const hit = R.lookup('sirloin steak');
  check('BUT each logged food is also filed under its own name (rememberEntry): "sirloin steak" typed alone now finds the 8 oz he logged — exact, free, "Found in your log"',
        !!hit && hit.exact && hit.key === R.keyOf('Sirloin steak') && hit.items[0].qty === '8 oz');
  check('and the estimate sheet’s Log reaches it: addEntries calls rememberEntry for every entry it logs',
        /dayLog\[id\] = \{ id, t: now \+ i, \.\.\.entry \};\n\s*rememberEntry\(entry\);/.test(lift('addEntries')) && /addEntries\(entries\);/.test(lift('openAiReview')));
  R.forgetAll();
  R.rememberEntry({ ...entry, name: DESC });
  const before = R.lookup('sirloin steak');
  check('under the long name it was filed as "' + R.keyOf(DESC) + '", and "sirloin steak" found nothing — that is what the short name changes, and this ship leaves it',
        before === null, J(before));
  check('a quantity typed with it still has to match: "12 oz sirloin steak" does not take the 8 oz row',
        (() => { R.forgetAll(); R.rememberEntry(entry); return R.lookup('12 oz sirloin steak') === null; })());
  R.forgetAll();
}

console.log('\nthe long USDA names, shown short: USDA’s own description on the fix-it sheet, and nothing else changed\n');
console.log(results.join('\n'));
console.log('\n' + pass + ' passed, ' + fail + ' failed\n');
process.exit(fail ? 1 : 0);
