#!/usr/bin/env node
//
// Verifier that composition (V59 §12) is what it says: the block vocabulary in
// vibes/defs/vocab.js `compose`, the one reading of it (index.js arrange()),
// every definition's `compose` held to the grammar, and the web's call sites
// tagging exactly the blocks the vocabulary names.
//
//   node tools-check/vibes-compose.mjs
//
// Reads the real modules; no rule lives in this file except the grammar's own
// words, which are the ones vocab.js `compose.grammar` says. The canaries at
// the end feed check() definitions with one thing made wrong each, to prove
// the checks can fail.
//
//   A  the vocabulary: ten screens, each block named once, first / alone /
//      before naming only its own blocks, frozen
//   B  v1 composes nothing ({}), and only an experimental vibe holds more
//   C  every composing definition: names every screen, a fallback screen
//      holds nothing else, an order names every block of its screen once, the
//      `first` blocks lead, every `before` pair holds, a group is a run of two
//      or more adjacent in order, in no other run, never holding an `alone`
//      block, and no key outside the grammar
//   D  arrange(): v1's order for {}, a fallback screen and an entry it cannot
//      read; a block not drawn is skipped where it stands; a group that is
//      not whole, adjacent or alone is dropped; fresh arrays; never throws
//   E  the web: every blk('<screen>', '<name>') names a block the vocabulary
//      has, every composable screen calls composeScreen, and v1 is inert
//   F  canaries: each rule is refused when broken

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const imp = f => import(pathToFileURL(join(ROOT, f)).href).then(m => m.default ?? m);
const I = await import(pathToFileURL(join(ROOT, 'vibes/defs/index.js')).href);
const VOC = await imp('vibes/defs/vocab.js');
const defs = {};
for (const id of I.IDS) defs[id] = await imp(`vibes/defs/${id}.js`);
const SCREENS = VOC.compose.screens;
const SNAMES = Object.keys(SCREENS);

let failed = 0, total = 0;
const expect = (ok, label) => { total++; if (!ok) { failed++; console.log('  ✗ ' + label); } };
const head = t => console.log('\n' + t);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isFrozen = o => !o || typeof o !== 'object' || (Object.isFrozen(o) && Object.values(o).every(isFrozen));

/* The grammar, as a function of one definition's compose. Returns a list of
   what is wrong with it (empty: fine). */
function check(def) {
  const bad = [];
  const c = def.compose === undefined ? {} : def.compose;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return ['compose is not an object'];
  const keys = Object.keys(c);
  if (!keys.length) return bad;
  if (def.experimental !== true) bad.push('only an experimental vibe composes');
  for (const k of keys) if (!SNAMES.includes(k)) bad.push(`${k}: not a screen of the vocabulary (the dock is no screen)`);
  for (const s of SNAMES) {
    const e = c[s], V = SCREENS[s];
    if (!e || typeof e !== 'object') { bad.push(`${s}: not named`); continue; }
    if (e.fallback === true) { if (Object.keys(e).length !== 1) bad.push(`${s}: a fallback screen holds nothing else`); continue; }
    if (e.fallback !== false) { bad.push(`${s}: fallback is true or false`); continue; }
    for (const k of Object.keys(e)) if (!['fallback', 'order', 'groups'].includes(k)) bad.push(`${s}: key ${k} is outside the grammar`);
    const o = e.order;
    if (!Array.isArray(o) || o.length !== V.blocks.length || new Set(o).size !== o.length || !o.every(n => V.blocks.includes(n))) {
      bad.push(`${s}: order names every block exactly once`); continue;
    }
    V.first.forEach((n, i) => { if (o[i] !== n) bad.push(`${s}: ${n} leads`); });
    for (const [a, b] of V.before) if (o.indexOf(a) > o.indexOf(b)) bad.push(`${s}: ${a} stays above ${b}`);
    const used = new Set();
    for (const g of e.groups === undefined ? [] : e.groups) {
      if (!Array.isArray(g) || g.length < 2) { bad.push(`${s}: a group is two or more blocks`); continue; }
      const i = o.indexOf(g[0]);
      if (i < 0 || !g.every((n, k) => o[i + k] === n)) bad.push(`${s}: group ${g} is a run, adjacent and in order`);
      if (g.some(n => used.has(n))) bad.push(`${s}: group ${g} shares a block with another`);
      if (g.some(n => V.alone.includes(n))) bad.push(`${s}: group ${g} holds a block that is alone`);
      g.forEach(n => used.add(n));
    }
  }
  return bad;
}

/* ---------- A ---------- */
head('A  the vocabulary');
expect(eq(SNAMES, ['you', 'workout', 'food', 'weight', 'steps', 'recap', 'session', 'sessionBar', 'sessionTitle', 'exercise']), 'ten screens, the five tab landings, the recap and the live session\'s zones');
expect(SNAMES.every(s => { const V = SCREENS[s]; return new Set(V.blocks).size === V.blocks.length && V.blocks.length >= 2 && V.blocks.every(n => /^[a-z][A-Za-z0-9]*$/.test(n)); }), 'each screen names its blocks once');
expect(SNAMES.every(s => { const V = SCREENS[s]; return V.first.every(n => V.blocks.includes(n)) && V.alone.every(n => V.blocks.includes(n)) && V.before.every(p => p.length === 2 && p.every(n => V.blocks.includes(n))); }), 'first, alone and before name only their own blocks');
expect(isFrozen(VOC.compose), 'the vocabulary is frozen all the way down');
expect(!SNAMES.includes('dock') && SNAMES.every(s => !SCREENS[s].blocks.some(n => /dock|fab|tail/i.test(n))), 'the dock, the floating buttons and the tailpiece are no block');

/* ---------- B, C ---------- */
head('B  v1 composes nothing; only an experimental vibe composes');
expect(eq(defs.v1.compose, {}) && Object.isFrozen(defs.v1.compose), 'v1 holds compose: {}');
for (const [id, d] of Object.entries(defs)) {
  const holds = d.compose !== undefined && Object.keys(d.compose).length > 0;
  expect(!holds || d.experimental === true, `${id}: ${holds ? 'composes and is experimental' : 'composes nothing'}`);
}
head('C  every composing definition holds the grammar');
for (const [id, d] of Object.entries(defs)) {
  if (!d.compose || !Object.keys(d.compose).length) continue;
  const bad = check(d);
  expect(!bad.length, `${id}: compose holds the grammar` + (bad.length ? ' — ' + bad.join('; ') : ''));
}

/* ---------- D ---------- */
head('D  arrange()');
const N = ['a', 'b', 'c', 'd'];
const C = { s: { fallback: false, order: ['d', 'a', 'b', 'c'], groups: [['a', 'b']] } };
expect(eq(I.arrange({}, 's', N), { order: N, groups: [] }), '{} is v1\'s order');
expect(eq(I.arrange({ s: { fallback: true } }, 's', N), { order: N, groups: [] }), 'a fallback screen is v1\'s order');
expect(eq(I.arrange(C, 's', N), { order: ['d', 'a', 'b', 'c'], groups: [['a', 'b']] }), 'an entry is read: the order and the group');
expect(eq(I.arrange(C, 's', ['a', 'c', 'd']), { order: ['d', 'a', 'c'], groups: [] }), 'a block not drawn is skipped where it stands, and a group left with one is dropped');
expect(eq(I.arrange({ s: { fallback: false, order: ['d', 'a', 'b'], groups: [] } }, 's', N), { order: N, groups: [] }), 'an order that leaves out a drawn block draws v1\'s');
expect(eq(I.arrange({ s: { fallback: false, order: ['a', 'a', 'b', 'c', 'd'] } }, 's', N), { order: N, groups: [] }), 'an order that names a block twice draws v1\'s');
expect(eq(I.arrange({ s: { fallback: false, order: ['a', 'b', 'c', 'd'], groups: [['a', 'c']] } }, 's', N).groups, []), 'a group that is not adjacent is dropped');
expect(eq(I.arrange({ s: { fallback: false, order: ['a', 'b', 'c', 'd'], groups: [['a', 'b'], ['b', 'c']] } }, 's', N).groups, [['a', 'b']]), 'a block in two groups stays in the first');
expect(eq(I.arrange(C, 'other', N), { order: N, groups: [] }), 'a screen it does not name is v1\'s order');
{
  const r1 = I.arrange({}, 's', N), r2 = I.arrange({}, 's', N);
  expect(r1.order !== r2.order && r1.order !== N, 'fresh arrays every call');
  let threw = false;
  for (const bad of [null, undefined, 5, 'x', [], { s: null }, { s: 5 }, { s: { fallback: false } }, { s: { fallback: false, order: 'abc' } }, { s: { fallback: false, order: ['a'], groups: 7 } }, { s: { fallback: false, order: N, groups: [null, 3, ['a']] } }]) {
    for (const names of [N, null, undefined, 5, [1, 2], []]) { try { const r = I.arrange(bad, 's', names); if (!Array.isArray(r.order) || !Array.isArray(r.groups)) threw = true; } catch { threw = true; } }
  }
  expect(!threw, 'never throws, and always returns { order, groups } arrays');
  const inherited = Object.create({ s: { fallback: false, order: ['d', 'a', 'b', 'c'] } });
  expect(eq(I.arrange(inherited, 's', N), { order: N, groups: [] }), 'an inherited key is no screen entry');
}
for (const [id, d] of Object.entries(defs)) {
  if (!d.compose || !Object.keys(d.compose).length) continue;
  for (const s of SNAMES) {
    const names = SCREENS[s].blocks.slice(), r = I.arrange(d.compose, s, names);
    expect(r.order.length === names.length && new Set(r.order).size === names.length && r.order.every(n => names.includes(n)), `${id}/${s}: arrange() keeps every block once`);
    expect(d.compose[s].fallback ? eq(r.order, names) && !r.groups.length : eq(r.order, d.compose[s].order), `${id}/${s}: arrange() returns ${d.compose[s].fallback ? 'v1\'s order' : 'the definition\'s order'}`);
  }
}

/* ---------- E ---------- */
head('E  the web tags the blocks the vocabulary names');
const FILES = ['you.js', 'workout.js', 'steps.js', 'food.js', 'weight.js'];
const tagged = {};
const composeCalls = new Set();
for (const f of FILES) {
  const t = readFileSync(join(ROOT, f), 'utf8');
  for (const m of t.matchAll(/blk\('(\w+)', '(\w+)'/g)) (tagged[m[1]] = tagged[m[1]] || new Set()).add(m[2]);
  for (const m of t.matchAll(/composeScreen\('(\w+)'/g)) composeCalls.add(m[1]);
}
expect(Object.entries(tagged).every(([s, names]) => SCREENS[s] && [...names].every(n => SCREENS[s].blocks.includes(n))), 'every blk() names a block of its screen');
const composable = new Set();
for (const d of Object.values(defs)) for (const [s, e] of Object.entries(d.compose || {})) if (e.fallback === false) composable.add(s);
expect([...composable].every(s => composeCalls.has(s) && tagged[s]), `every screen a vibe composes (${[...composable].join(', ')}) is tagged and arranged at its end`);
{
  // a block the vocabulary names that a composable screen draws must be tagged: list the ones never tagged
  const untagged = [...composable].flatMap(s => SCREENS[s].blocks.filter(n => !tagged[s].has(n)).map(n => `${s}.${n}`));
  expect(!untagged.length, 'no block of a composable screen is left untagged' + (untagged.length ? ' — ' + untagged.join(', ') : ''));
}
{
  const t = readFileSync(join(ROOT, 'vibe.js'), 'utf8');
  expect(/export function blk\(screen, name, node\) \{\n  if \(node && node\.dataset && composeOf\(screen\)\)/.test(t), 'blk() touches a node only when the active vibe composes that screen');
  expect(/function composeOf\(screen\) \{[\s\S]*e && e\.fallback === false \? c : null;/.test(t), 'composeOf() is null for v1, a {} and a fallback screen');
  expect(/const c = parent \? composeOf\(screen\) : null;\n  if \(!c\) return parent;/.test(t), 'composeScreen() returns at once when nothing composes');
  expect(!/\.style\.order|\.order\s*=/.test(t.slice(t.indexOf('function composeOf'), t.indexOf('/* ---------- the dock'))), 'the engine moves nodes, never CSS order');
}

/* ---------- F: canaries ---------- */
head('F  canaries — the checks can fail');
// The good case: an experimental definition holding Meet Day's composition,
// written out here (cloud/design/COMPOSE.md) so the canaries do not depend on
// any vibe being registered.
const good = {
  experimental: true,
  compose: {
    you:          { fallback: false, order: ['hero', 'since', 'coach', 'doing', 'goal', 'week', 'noticed', 'trends', 'review', 'app'], groups: [['hero', 'since']] },
    workout:      { fallback: false, order: ['head', 'dow', 'grid', 'monthStats', 'legend', 'weekVolume', 'coach', 'start', 'split', 'statistics'], groups: [['dow', 'grid', 'monthStats']] },
    food:         { fallback: true },
    weight:       { fallback: true },
    steps:        { fallback: false, order: ['head', 'today', 'streaks', 'trend', 'stats', 'consistency', 'weekdays', 'recent'], groups: [['today', 'streaks']] },
    recap:        { fallback: false, order: ['hero', 'feel', 'wins', 'did', 'stats', 'like', 'buttons'], groups: [['did', 'stats']] },
    session:      { fallback: true },
    sessionBar:   { fallback: true },
    sessionTitle: { fallback: false, order: ['clock', 'name'] },
    exercise:     { fallback: false, order: ['head', 'prev', 'columns', 'rows', 'plates', 'hint', 'actions'] }
  }
};
const mut = f => { const c = JSON.parse(JSON.stringify(good)); f(c); return c; };
const refused = (label, d, re) => expect(check(d).some(m => re.test(m)), `refused: ${label}`);
expect(check(good).length === 0, 'the good case passes');
refused('v1-shaped vibe composing', mut(c => { c.experimental = false; }), /only an experimental/);
refused('the dock as a screen', mut(c => { c.compose.dock = { fallback: true }; }), /dock is no screen/);
refused('a screen left unnamed', mut(c => { delete c.compose.weight; }), /weight: not named/);
refused('a fallback holding an order', mut(c => { c.compose.food = { fallback: true, order: [] }; }), /food: a fallback screen holds nothing else/);
refused('fallback not a boolean', mut(c => { c.compose.food = { fallback: 'yes' }; }), /food: fallback is true or false/);
refused('a block removed', mut(c => { c.compose.you.order = c.compose.you.order.filter(n => n !== 'app'); }), /you: order names every block/);
refused('a block twice', mut(c => { c.compose.you.order[9] = 'hero'; }), /you: order names every block/);
refused('a block added', mut(c => { c.compose.you.order.push('fab'); }), /you: order names every block/);
refused('merge', mut(c => { c.compose.you.merge = [['goal', 'noticed']]; }), /key merge is outside the grammar/);
refused('split', mut(c => { c.compose.food = { fallback: false, order: SCREENS.food.blocks, split: {} }; }), /key split is outside the grammar/);
refused('within', mut(c => { c.compose.you.within = {}; }), /key within is outside the grammar/);
refused('the lead block moved', mut(c => { const o = c.compose.you.order; [o[0], o[1]] = [o[1], o[0]]; }), /you: hero leads/);
refused('trend under stats', mut(c => { const o = c.compose.steps.order; [o[3], o[4]] = [o[4], o[3]]; }), /steps: trend stays above stats/);
refused('plates above the rows', mut(c => { c.compose.exercise.order = ['head', 'prev', 'columns', 'plates', 'rows', 'hint', 'actions']; }), /exercise: rows stays above plates/);
refused('a group of one', mut(c => { c.compose.you.groups = [['hero']]; }), /a group is two or more/);
refused('a group that is not adjacent', mut(c => { c.compose.you.groups = [['hero', 'coach']]; }), /run, adjacent and in order/);
refused('a group in the wrong order', mut(c => { c.compose.you.groups = [['since', 'hero']]; }), /run, adjacent and in order/);
refused('overlapping groups', mut(c => { c.compose.workout.groups = [['dow', 'grid'], ['grid', 'monthStats']]; }), /shares a block/);
refused('the coach card in a group', mut(c => { c.compose.you.groups = [['since', 'coach']]; }), /block that is alone/);

console.log('\n' + (failed ? `${failed} of ${total} checks failed.` : `All checks passed. ${total} checks.`));
process.exit(failed ? 1 : 0);
