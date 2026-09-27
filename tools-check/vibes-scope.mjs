#!/usr/bin/env node
//
// Verifier that a vibe's stylesheet can only ever touch that vibe.
//
//   node tools-check/vibes-scope.mjs
//
// Every vibes/<id>.css is linked from index.html for everyone, all the time,
// so it is cached while online. What keeps v1 v1 is that nothing in those
// files matches unless <html> carries data-vibe="<id>". One unscoped selector
// and every account on every vibe gets it. So:
//
//   A  rack.css and auth.css contain no [data-vibe] at all. They are v1, and
//      a vibe's overrides live only in its own file.
//   B  in every vibes/<id>.css —
//      - the id is a well-formed vibe id (vibes/defs/index.js validId);
//      - every selector of every rule, inside @media and @supports too,
//        starts with :root[data-vibe="<id>"] or [data-vibe="<id>"] — each
//        selector of a list on its own, so `.a, [data-vibe="x"] .b` fails;
//      - the only at-rules are @media, @supports, @font-face, @keyframes and
//        @charset. @import would load for everyone; @property, @layer and
//        the rest act on the whole page;
//      - every @keyframes name starts with "<id>-", because keyframes are
//        global and a vibe's `setFlash` would replace rack.css's for v1 too;
//      - every @font-face family starts with the id and never says
//        "Archivo", so a vibe cannot swap v1's face out from under it; a
//        vibe's own face downloads only when a rule of that vibe asks for it;
//      - every url() is a data: URL or a file under vibes/<id>/ that exists
//        (nothing remote: a vibe must work offline once cached);
//      - each @font-face family's files come to at most 120 KB (120,000
//        bytes), V59 §14's web budget: vibe.js fetches the active vibe's
//        faces, and every vibe's picker face, onto every device;
//      - no class-substring selector ([class^=…], [class*=…], [class|=…])
//        that would match both the workout's .set-row and the settings
//        hub's .set-row-nav (below).
//      There is no other CSS under vibes/: a vibe's stylesheet is one file.
//   C  canaries — each rule above fails on a sample that breaks it.
//
// FOR VIBE AUTHORS — THE .set-row / .set-row-nav CLASH. Two unrelated
// families share a prefix. `.set-row` (with .set-hd, .set-idx, .set-check,
// .set-e1rm) is the workout's set table: one row per set of an exercise.
// `.set-row-nav`, `.set-row-tog`, `.set-row-l`, `.set-row-v`, `.set-row-x`
// and `.set-row-sub` are the settings hub's tappable rows (rack.css, "the
// settings hub"). A class selector is exact, so `.set-row` never matches
// `.set-row-nav` — but a vibe that means "settings rows" and writes
// `.set-row` restyles every set of every exercise instead, and one that
// writes [class^="set-row"] gets both. This lint catches the second; it
// cannot know which one you meant by the first. Scope set-table rules under
// .ex-block or .rt-sets (the workout card and the routine editor), and
// settings rules under .set-list, and check both screens at 320px.
// Specificity: a vibe rule must match or beat the rule it overrides, e.g.
// `.set-row.drop .set-idx` is (0,3,0), so [data-vibe="x"] .set-row.drop
// .set-idx (0,4,0) wins where [data-vibe="x"] .set-idx (0,2,0) does not.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
const { validId } = await import(pathToFileURL(join(ROOT, 'vibes/defs/index.js')).href);

let checks = 0; const fails = [];
const ok = m => { checks++; if (process.env.VERBOSE) console.log('  ✓ ' + m); };
const bad = m => { checks++; fails.push(m); console.log('  ✗ ' + m); };
const expect = (c, m) => (c ? ok(m) : bad(m));
const section = t => console.log('\n' + t);

const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
const lineAt = (s, i) => s.slice(0, i).split('\n').length;

// Split on commas outside parentheses and brackets.
function splitTop(s) {
  const out = []; let d = 0, cur = '';
  for (const c of s) { if (c === '(' || c === '[') d++; else if (c === ')' || c === ']') d--; if (c === ',' && !d) { out.push(cur); cur = ''; } else cur += c; }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}

/* The lint itself: the problems in one vibe stylesheet, as strings.
   `exists(rel)` answers whether vibes/<rel> is a file; `sizeOf(rel)`, its
   size in bytes. */
const FONT_BUDGET = 120000;   // V59 §14: a vibe's web fonts, at most 120 KB a family
function lint(id, css, exists, sizeOf = () => 0) {
  const probs = [];
  const faces = [];   // [line, family, url] for every @font-face url()
  if (!validId(id)) probs.push(`"${id}" is not a well-formed vibe id`);
  const src = stripComments(css);
  const scopes = [`:root[data-vibe="${id}"]`, `[data-vibe="${id}"]`];
  const scoped = sel => scopes.some(p => sel.startsWith(p));
  const block = from => { let d = 0; for (let j = from; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) return j; } } return src.length; };
  const urls = [];
  const walk = (s, e) => {
    let k = s;
    while (k < e) {
      const open = src.indexOf('{', k);
      if (open < 0 || open >= e) {
        const rest = src.slice(k, e);
        for (const m of rest.matchAll(/@(import|charset|layer|namespace)\b[^;]*;?/g)) {
          if (m[1] !== 'charset') probs.push(`line ${lineAt(src, k + m.index)}: @${m[1]} is not allowed in a vibe's file`);
        }
        break;
      }
      let head = src.slice(k, open);
      // statement at-rules (no block) that sit before this rule
      for (const m of head.matchAll(/@(import|charset|layer|namespace)\b[^;]*;/g)) {
        if (m[1] !== 'charset') probs.push(`line ${lineAt(src, k + m.index)}: @${m[1]} is not allowed in a vibe's file`);
      }
      head = head.replace(/@(import|charset|layer|namespace)\b[^;]*;/g, '').trim().replace(/\s+/g, ' ');
      const close = block(open);
      const ln = lineAt(src, open);
      const body = src.slice(open + 1, close);
      if (head.startsWith('@')) {
        const name = (/^@([\w-]+)/.exec(head) || [])[1];
        if (name === 'media' || name === 'supports') walk(open + 1, close);
        else if (name === 'keyframes' || name === '-webkit-keyframes') {
          const kf = head.replace(/^@[\w-]+\s*/, '').replace(/["']/g, '').trim();
          if (!kf.startsWith(id + '-')) probs.push(`line ${ln}: @keyframes ${kf} — a vibe's keyframes are named "${id}-…", because keyframes are global and this one would replace a v1 animation for everyone`);
        } else if (name === 'font-face') {
          const fam = (/font-family\s*:\s*([^;]+)/.exec(body) || [])[1];
          const f = fam ? fam.trim().replace(/^["']|["']$/g, '') : '';
          if (!f) probs.push(`line ${ln}: @font-face with no font-family`);
          else {
            if (!f.toLowerCase().startsWith(id)) probs.push(`line ${ln}: @font-face "${f}" — a vibe's face is named for the vibe, "${id} …"`);
            if (/archivo/i.test(f)) probs.push(`line ${ln}: @font-face "${f}" — never "Archivo": that is v1's face, and redefining it changes v1`);
          }
          for (const m of body.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/g)) { urls.push([ln, m[2]]); faces.push([ln, f.toLowerCase(), m[2]]); }
        } else probs.push(`line ${ln}: @${name} is not allowed in a vibe's file (only @media, @supports, @font-face, @keyframes)`);
      } else if (head) {
        for (const sel of splitTop(head)) {
          if (!scoped(sel)) probs.push(`line ${ln}: "${sel}" is not scoped — it must start with :root[data-vibe="${id}"] or [data-vibe="${id}"]`);
        }
        for (const m of head.matchAll(/\[\s*class\s*([\^*|])=\s*["']?([^"'\]]*)["']?\s*\]/g)) {
          const [, op, v] = m;
          const hits = c => (op === '^' ? c.startsWith(v) : op === '*' ? c.includes(v) : c === v || c.startsWith(v + '-'));
          if (hits('set-row') && hits('set-row-nav')) probs.push(`line ${ln}: [class${op}="${v}"] matches the workout's .set-row and the settings hub's .set-row-nav alike — see this file's header`);
        }
        for (const m of body.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/g)) urls.push([ln, m[2]]);
      }
      k = close + 1;
    }
  };
  walk(0, src.length);
  for (const [ln, u] of urls) {
    if (/^data:/i.test(u)) continue;
    // A paint server vibe.js puts in the page itself (<svg id="vibe-patterns">,
    // one <pattern id="vibe-hatch-<token>"> per colour token, under a chart
    // look that hatches): a fragment of this document, not a file. Any other
    // fragment names something no vibe owns.
    if (/^#vibe-hatch-[a-z0-9-]+$/.test(u)) continue;
    const n = normalize(u);
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.startsWith('/') || u.startsWith('//') || n.startsWith('..') || !n.startsWith(id + '/')) {
      probs.push(`line ${ln}: url(${u}) — a vibe's files are under vibes/${id}/ (or a data: URL); nothing remote, nothing outside its folder`);
    } else if (!exists(n)) probs.push(`line ${ln}: url(${u}) — vibes/${n} does not exist`);
  }
  // The budget, per family: its files (each counted once), and a data: face at its length.
  const perFamily = new Map();
  for (const [ln, fam, u] of faces) {
    const e = perFamily.get(fam) || { ln, files: new Set(), bytes: 0 };
    const key = /^data:/i.test(u) ? u : normalize(u);
    if (!e.files.has(key)) {
      e.files.add(key);
      e.bytes += /^data:/i.test(u) ? u.length : (exists(key) ? sizeOf(key) : 0);
    }
    perFamily.set(fam, e);
  }
  for (const [fam, e] of perFamily) {
    if (e.bytes > FONT_BUDGET) probs.push(`line ${e.ln}: @font-face "${fam}" — its files come to ${e.bytes} bytes, over the ${FONT_BUDGET}-byte budget a family (V59 §14); subset it to latin`);
  }
  return probs;
}

/* ================= A ================= */
section('A  rack.css and auth.css are v1: no [data-vibe] in either');
for (const f of ['rack.css', 'auth.css']) {
  const src = stripComments(read(f));
  const at = src.search(/data-vibe/);
  expect(at < 0, `${f} has no [data-vibe]` + (at < 0 ? '' : ` — line ${lineAt(src, at)}`));
}

/* ================= B ================= */
section('B  every vibes/<id>.css touches only its own vibe');
const VIBES = join(ROOT, 'vibes');
const all = [];
const walkDir = (d, rel) => { for (const e of readdirSync(d)) { const p = join(d, e), r = rel ? rel + '/' + e : e; if (statSync(p).isDirectory()) walkDir(p, r); else all.push(r); } };
if (existsSync(VIBES)) walkDir(VIBES, '');
const sheets = all.filter(f => /^[^/]+\.css$/.test(f));
const deeper = all.filter(f => f.endsWith('.css') && f.includes('/'));
expect(!deeper.length, 'no CSS under vibes/ but vibes/<id>.css — a vibe\'s stylesheet is one file' + (deeper.length ? ' — not: ' + deeper.map(f => 'vibes/' + f).join(', ') : ''));
for (const f of sheets) {
  const id = f.slice(0, -4);
  const probs = lint(id, readFileSync(join(VIBES, f), 'utf8'), rel => existsSync(join(VIBES, rel)) && statSync(join(VIBES, rel)).isFile(),
    rel => statSync(join(VIBES, rel)).size);
  for (const p of probs) bad(`vibes/${f} ${p}`);
  if (!probs.length) ok(`vibes/${f}: every selector is scoped to ${id}, and its fonts, keyframes and files are its own`);
}
if (!sheets.length) ok('no vibe stylesheet yet — nothing to lint beyond A');

/* ================= C ================= */
section('C  canaries — each rule fails on a sample that breaks it');
{
  const yes = () => true, no = () => false;
  const good = `/* vibes-css:begin */\n:root[data-vibe="t"] { --accent: #e05a00; }\n/* vibes-css:end */\n` +
    `[data-vibe="t"] .card, :root[data-vibe="t"] .btn:is(.a, .b) { border-radius: 0; }\n` +
    `@media (max-width: 380px) { [data-vibe="t"] .card { padding: 10px; } }\n` +
    `@font-face { font-family: 't Display'; src: url(t/display.woff2) format('woff2'); }\n` +
    `@keyframes t-pulse { to { opacity: .5; } }\n[data-vibe="t"] .hero { background: url('t/hero.jpg'); }\n` +
    `[data-vibe="t"] .ex-block .set-row, [data-vibe="t"] [class^="set-row-"] { color: var(--chalk); }\n` +
    `[data-vibe="t"] rect.chart-bar-dim { fill: url(#vibe-hatch-p-blue); }\n`;
  expect(!lint('t', good, yes).length, 'a well-scoped sample passes' + (lint('t', good, yes).length ? ' — ' + lint('t', good, yes).join('; ') : ''));
  const cases = [
    ['.card { color: red; }', /not scoped/, 'a bare selector'],
    ['[data-vibe="t"] .a, .b { color: red; }', /"\.b" is not scoped/, 'an unscoped selector after a comma'],
    ['[data-vibe="tt"] .a { color: red; }', /not scoped/, 'another vibe\'s scope'],
    ['@media (min-width: 1px) { .a { color: red; } }', /not scoped/, 'an unscoped rule inside @media'],
    ['@import url("t/x.css");', /@import is not allowed/, '@import'],
    ['@property --accent { syntax: "<color>"; inherits: true; initial-value: red; }', /@property is not allowed/, '@property'],
    ['@keyframes setFlash { to { opacity: 1; } }', /@keyframes setFlash/, 'keyframes not named for the vibe'],
    ['@font-face { font-family: Archivo; src: url(t/a.woff2); }', /named for the vibe/, 'a face not named for the vibe'],
    ['@font-face { font-family: "t Archivo"; src: url(t/a.woff2); }', /never "Archivo"/, 'a face called Archivo'],
    ['[data-vibe="t"] .a { background: url(https://example.com/x.jpg); }', /nothing remote/, 'a remote url()'],
    ['[data-vibe="t"] .a { background: url(../v1/x.jpg); }', /nothing remote|outside its folder/, 'a url() outside the vibe\'s folder'],
    ['[data-vibe="t"] .a { background: url(t/missing.jpg); }', /does not exist/, 'a url() to a missing file'],
    ['[data-vibe="t"] .a { fill: url(#someone-else); }', /nothing outside its folder/, 'a url(#fragment) that is not one of vibe.js\'s hatch patterns'],
    ['[data-vibe="t"] [class^="set-row"] { color: red; }', /matches the workout's \.set-row/, 'a [class^="set-row"] that catches the settings rows'],
    ['[data-vibe="t"] [class*="set-"] { color: red; }', /matches the workout's \.set-row/, 'a [class*="set-"] that catches both']
  ];
  for (const [css, re, what] of cases) {
    const p = lint('t', css, css.includes('missing') ? no : yes);
    expect(p.some(x => re.test(x)), `fails on ${what}` + (p.some(x => re.test(x)) ? '' : ' — got: ' + (p.join('; ') || 'nothing')));
  }
  expect(lint('T', '[data-vibe="T"] .a { color: red; }', yes).some(x => /not a well-formed vibe id/.test(x)), 'fails on a malformed id (vibes/T.css)');
  // The font budget: a family's files summed, each file once, other families apart.
  const two = `@font-face { font-family: 't Grot'; src: url(t/grot.woff2) format('woff2'); font-weight: 300 900; }\n` +
    `@font-face { font-family: "t Grot"; src: url(t/grot-i.woff2) format('woff2'); font-style: italic; }\n` +
    `@font-face { font-family: 't Slab'; src: url(t/slab.woff2) format('woff2'); }\n`;
  const sizes = m => rel => m[rel] || 0;
  const under = lint('t', two, yes, sizes({ 't/grot.woff2': 60000, 't/grot-i.woff2': 60000, 't/slab.woff2': 110000 }));
  expect(!under.length, 'a family exactly at 120,000 bytes, and another under it, pass' + (under.length ? ' — ' + under.join('; ') : ''));
  const over = lint('t', two, yes, sizes({ 't/grot.woff2': 60000, 't/grot-i.woff2': 60001, 't/slab.woff2': 1000 }));
  expect(over.length === 1 && /"t grot" — its files come to 120001 bytes/.test(over[0]), 'fails on a family one byte over the §14 budget, and only that family' + (over.length === 1 ? '' : ' — got: ' + (over.join('; ') || 'nothing')));
  const again = lint('t', `@font-face { font-family: 't A'; src: url(t/a.woff2); }\n@font-face { font-family: 't A'; src: url(t/a.woff2); font-weight: 700; }\n`, yes, sizes({ 't/a.woff2': 70000 }));
  expect(!again.length, 'a file two rules share counts once');
}

console.log('\n' + (fails.length ? `${fails.length} of ${checks} checks failed.`
  : `All checks passed. ${checks} checks. ${sheets.length} vibe stylesheet${sheets.length === 1 ? '' : 's'}; rack.css and auth.css hold no [data-vibe].`));
process.exit(fails.length ? 1 : 0);
