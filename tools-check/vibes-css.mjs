#!/usr/bin/env node
//
// Verifier (and, with --write, the generator) for the vibe tokens: the one
// place a vibe's CSS custom properties come from.
//
//   node tools-check/vibes-css.mjs            check — exits 1 on any difference
//   node tools-check/vibes-css.mjs --write    regenerate every vibes/<id>.css's
//                                             generated block, then check
//
// A vibe is a pure definition, vibes/defs/<id>.js, with the shape v1.js has.
// vibes/defs/index.js ROLES says where each of its values lands on the web:
// most are a custom property ('--accent'), and a few land elsewhere (a
// <meta>, rack.css line 1, color-scheme). This file turns a definition into
// CSS text the same way every time, so a colour is written down once — in
// the definition — and the stylesheet can never quietly disagree with it.
//
// It is NOT a runtime build step. The app never runs it and nothing is built
// on deploy: the generated text is committed, and this file fails if what is
// committed is not what the definition says. Like touch-target's snapshot and
// the rules generator, a change is made at the source and regenerated here.
//
//   A  v1 — rack.css's :root IS v1's definition. Every role that lands on a
//      custom property is declared in rack.css's :root with the value v1.js
//      gives it (hex compared case-insensitively, channel lists and the spaces
//      inside a shadow or gradient ignored, a shadow's `inset` wherever it
//      sits), every custom property in that :root is some role's, and each is
//      declared once. rack.css line 1 is the @import of face.web.importUrl,
//      index.html's theme-color and status-bar metas are v1's, and there is
//      no color-scheme anywhere because v1's is null. There is no
//      vibes/v1.css: v1 is the stylesheet itself.
//   B  every other vibe — vibes/<id>.css begins with the block generated from
//      its definition, between the two marker comments, byte for byte. Its
//      hand-written rules sit below the end marker and are not this file's
//      business (tools-check/vibes-scope.mjs lints them). The definition's id
//      is its file name, it gives every role the block needs (a missing one
//      would silently inherit v1's value), and no vibes/<id>.css exists
//      without a registered vibe behind it.
//   D  every declaration the contract anchors in rack.css or auth.css (ROLES
//      `at.web` — the calorie bar's marks, each shadow, glass and scrim, the
//      two font stacks) spends its role's custom property, and each colour
//      role's `except` site keeps spending the role it names (.wpe-row
//      input:focus stays --p-blue), so a token nobody spends cannot pass.
//   C  canaries — the checks above fail on a definition with one colour
//      changed, on a block with one byte changed and on an anchored site
//      moved off its token, so a pass means something.
//
// With no vibe but v1 registered, B has nothing to check and says so.

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const read = f => readFileSync(join(ROOT, f), 'utf8');

const I = await import(pathToFileURL(join(ROOT, 'vibes/defs/index.js')).href);
const { ROLES, IDS, at, sideOf, hexToRgb } = I;
const defOf = async id => (await import(pathToFileURL(join(ROOT, `vibes/defs/${id}.js`)).href)).default;

let checks = 0; const fails = [];
const ok = m => { checks++; if (process.env.VERBOSE) console.log('  ✓ ' + m); };
const bad = m => { checks++; fails.push(m); console.log('  ✗ ' + m); };
const expect = (c, m) => (c ? ok(m) : bad(m));
const section = t => console.log('\n' + t);

/* ================= the generator ================= */

// The roles that land on a custom property. `fixed` ones (layout and motion,
// §5.1) are v1's alone: rack.css declares them and no vibe sets them.
const PROPS = ROLES.filter(r => r.web && r.web.startsWith('--'));

const num = n => String(n).replace(/^(-?)0\./, '$1.');           // .45, as rack.css spells alphas
const len = n => (n === 0 ? '0' : num(n) + 'px');
function colourOf(def, role, a) {
  const hex = sideOf(def.colors[role], 'web');
  if (typeof hex !== 'string') throw new Error(`no colour role '${role}'`);
  if (a === undefined) return hex;
  const rgb = hexToRgb(hex);
  if (!rgb) throw new Error(`colour role '${role}' is '${hex}', which has no channels (6-digit hex only)`);
  return `rgba(${rgb.join(',')},${num(a)})`;
}

/* One role's CSS text in a definition, or undefined when the definition does
   not give it. Throws on a value of the wrong shape. */
function cssText(def, role) {
  const v = at(def, role.path);
  if (v === undefined || v === null) return undefined;
  if (role.channel) {
    const rgb = hexToRgb(sideOf(def.colors[v], 'web'));
    if (!rgb) throw new Error(`${role.path}: '${v}' is not a 6-digit colour role`);
    return rgb.join(',');
  }
  switch (role.kind) {
    case 'radius': return typeof v === 'number' ? len(v) : String(v);
    case 'shadow': {
      const layers = sideOf(v, 'web');
      if (!Array.isArray(layers)) throw new Error(`${role.path}: no web layers`);
      if (!layers.length) return 'none';
      return layers.map(l => [l.inset ? 'inset' : null, len(l.x), len(l.y), len(l.blur),
        l.spread ? len(l.spread) : null, colourOf(def, l.color, l.a)].filter(Boolean).join(' ')).join(', ');
    }
    case 'scrim':
      if (typeof v === 'string') return v;                        // a backdrop-filter
      if (v && Array.isArray(v.stops)) {
        return `linear-gradient(${v.dir}, ${v.stops.map(s => `${colourOf(def, s.color, s.a)} ${num(Math.round(s.at * 1000) / 10)}%`).join(', ')})`;
      }
      throw new Error(`${role.path}: not a filter or a gradient`);
    default: {
      const s = sideOf(v, 'web');
      if (typeof s !== 'string') throw new Error(`${role.path}: not a string`);
      return s;
    }
  }
}

/* Every custom property a definition sets, in ROLES order. */
function tokensOf(def, { fixed }) {
  const out = [], missing = [];
  for (const r of PROPS) {
    if (r.fixed && !fixed) continue;
    const t = cssText(def, r);
    if (t === undefined) missing.push(r.path); else out.push([r.web, t]);
  }
  return { out, missing };
}

const BEGIN = id => `/* vibes-css:begin — generated from vibes/defs/${id}.js by tools-check/vibes-css.mjs. Do not edit between the markers: change the definition, then run it with --write. */`;
const END = '/* vibes-css:end */';
function block(id, def) {
  const { out, missing } = tokensOf(def, { fixed: false });
  const lines = out.map(([k, v]) => `  ${k}: ${v};`);
  const cs = sideOf(at(def, 'chrome.colorScheme'), 'web');
  if (typeof cs === 'string') lines.push(`  color-scheme: ${cs};`);
  return { text: [BEGIN(id), `:root[data-vibe="${id}"] {`, ...lines, '}', END].join('\n'), missing };
}

/* ================= reading CSS ================= */

// Declarations of one top-level rule, by exact selector, outside any @-block.
function declsOf(css, selector) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const out = [];
  let depth = 0, head = '', i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '{') {
      const sel = head.trim().replace(/\s+/g, ' ');
      if (depth === 0 && sel === selector) {
        let j = i + 1, d = 1, body = '';
        while (j < src.length && d) { if (src[j] === '{') d++; else if (src[j] === '}') d--; if (d) body += src[j]; j++; }
        let dp = 0, cur = '';
        const parts = [];
        for (const ch of body) { if (ch === '(') dp++; else if (ch === ')') dp--; if (ch === ';' && !dp) { parts.push(cur); cur = ''; } else cur += ch; }
        parts.push(cur);
        for (const p of parts) { const k = p.indexOf(':'); if (k > 0) out.push([p.slice(0, k).trim(), p.slice(k + 1).trim().replace(/\s+/g, ' ')]); }
        i = j; head = ''; continue;
      }
      depth++; head = '';
    } else if (c === '}') { depth--; head = ''; }
    else if (c === ';' && depth === 0) head = '';
    else head += c;
    i++;
  }
  return out;
}

// Comparison: case-insensitive hex, numbers inside rgba() by value, no
// spaces after commas or around parentheses, and a shadow's `inset` first.
function norm(role, s) {
  if (role.channel) return s.replace(/\s+/g, '');
  let t = s.trim().toLowerCase()
    .replace(/rgba?\(([^()]*)\)/g, (m, inner) => 'rgba(' + inner.split(',').map(x => String(Number(x.trim()))).join(',') + ')')
    .replace(/\s*,\s*/g, ',').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ');
  if (role.kind === 'shadow') {
    const layers = []; let d = 0, cur = '';
    for (const ch of t) { if (ch === '(') d++; else if (ch === ')') d--; if (ch === ',' && !d) { layers.push(cur); cur = ''; } else cur += ch; }
    layers.push(cur);
    t = layers.map(l => { const w = l.trim().split(' '); return w.includes('inset') ? ['inset', ...w.filter(x => x !== 'inset')].join(' ') : w.join(' '); }).join(',');
  }
  return t;
}

/* The v1 comparison, as a function, so the canary can run it on a changed copy. */
function compareV1(def, rootDecls) {
  const errs = [];
  const declared = new Map();
  for (const [p, v] of rootDecls) if (p.startsWith('--')) {
    if (declared.has(p)) errs.push(`${p} is declared twice in rack.css's :root`);
    declared.set(p, v);
  }
  let n = 0;
  for (const r of PROPS) {
    let want;
    try { want = cssText(def, r); } catch (e) { errs.push(`${r.path}: ${e.message}`); continue; }
    if (want === undefined) { errs.push(`${r.path} has no value in v1.js`); continue; }
    if (!declared.has(r.web)) { errs.push(`${r.web} (${r.path}) is not declared in rack.css's :root`); continue; }
    n++;
    if (norm(r, declared.get(r.web)) !== norm(r, want)) errs.push(`${r.web}: rack.css says '${declared.get(r.web)}', v1.js (${r.path}) says '${want}'`);
  }
  const roleNames = new Set(PROPS.map(r => r.web));
  for (const p of declared.keys()) if (!roleNames.has(p)) errs.push(`${p} in rack.css's :root is no role's — add it to vibes/defs/index.js ROLES (and v1.js) or take it out`);
  return { errs, n };
}

/* ================= A: v1 is rack.css ================= */
section('A  v1 — rack.css\'s :root is vibes/defs/v1.js');
const V1 = await defOf('v1');
const RACK = read('rack.css'), AUTH = read('auth.css'), INDEX = read('index.html');
const rootDecls = declsOf(RACK, ':root');
{
  const { errs, n } = compareV1(V1, rootDecls);
  for (const e of errs) bad(e);
  expect(!errs.length, `all ${PROPS.length} custom-property roles are declared in rack.css's :root with v1's value (${n} compared), and nothing else is`);
}
expect(RACK.split('\n')[0] === `@import url('${V1.face.web.importUrl}');`, 'rack.css line 1 is the @import of v1\'s face.web.importUrl');
expect((/<meta name="theme-color" content="([^"]+)">/.exec(INDEX) || [])[1] === V1.themeColor, `index.html's theme-color meta is v1's themeColor (${V1.themeColor})`);
expect((/<meta name="apple-mobile-web-app-status-bar-style" content="([^"]+)">/.exec(INDEX) || [])[1] === V1.chrome.webStatusBar,
  `index.html's status-bar meta is v1's chrome.webStatusBar (${V1.chrome.webStatusBar})`);
{
  const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
  const cs = /(^|[;{\s])color-scheme\s*:/.test(noComments(RACK)) || /(^|[;{\s])color-scheme\s*:/.test(noComments(AUTH)) || /name="color-scheme"/.test(INDEX);
  expect(V1.chrome.colorScheme === null && !cs, 'v1\'s color-scheme is null, and neither stylesheet nor index.html sets one');
}
expect(!existsSync(join(ROOT, 'vibes/v1.css')), 'there is no vibes/v1.css — v1 is rack.css itself');

/* ================= B: every other vibe ================= */
section('B  every other vibe — vibes/<id>.css begins with its generated block');
const others = IDS.filter(id => id !== 'v1');
let wrote = 0;
for (const id of others) {
  let def;
  try { def = await defOf(id); } catch (e) { bad(`${id}: vibes/defs/${id}.js does not load (${e.message})`); continue; }
  expect(def && def.id === id, `${id}: the definition's id is its file name`);
  let gen;
  try { gen = block(id, def); } catch (e) { bad(`${id}: ${e.message}`); continue; }
  expect(!gen.missing.length, `${id}: the definition gives every role the block needs` +
    (gen.missing.length ? ' — missing: ' + gen.missing.join(', ') : ` (${PROPS.filter(r => !r.fixed).length})`));
  const file = join(ROOT, `vibes/${id}.css`);
  if (WRITE) {
    const cur = existsSync(file) ? readFileSync(file, 'utf8') : null;
    let next;
    if (cur === null) next = gen.text + '\n';
    else if (cur.startsWith('/* vibes-css:begin')) {
      const e = cur.indexOf(END);
      next = e < 0 ? gen.text + '\n\n' + cur : gen.text + cur.slice(e + END.length);
    } else next = gen.text + '\n\n' + cur;
    if (next !== cur) { writeFileSync(file, next); wrote++; console.log(`  wrote vibes/${id}.css`); }
  }
  if (!existsSync(file)) { bad(`${id}: vibes/${id}.css does not exist — run node tools-check/vibes-css.mjs --write`); continue; }
  const src = readFileSync(file, 'utf8');
  const same = src.startsWith(gen.text) && (src.length === gen.text.length || src[gen.text.length] === '\n');
  if (same) ok(`${id}: vibes/${id}.css begins with the block generated from vibes/defs/${id}.js`);
  else {
    const a = src.split('\n'), b = gen.text.split('\n');
    const k = b.findIndex((l, i) => a[i] !== l);
    bad(`${id}: vibes/${id}.css does not begin with its generated block — line ${k + 1} is '${a[k]}', the definition says '${b[k]}'. ` +
      'Change vibes/defs/' + id + '.js, not the block, then run node tools-check/vibes-css.mjs --write');
  }
}
if (!others.length) ok('no vibe but v1 is registered yet, so there is no block to generate');
{
  const cssFiles = existsSync(join(ROOT, 'vibes')) ? readdirSync(join(ROOT, 'vibes')).filter(f => f.endsWith('.css')) : [];
  const orphans = cssFiles.map(f => f.slice(0, -4)).filter(id => !others.includes(id));
  expect(!orphans.length, `every vibes/<id>.css belongs to a registered vibe other than v1 (${cssFiles.length} file${cssFiles.length === 1 ? '' : 's'})` +
    (orphans.length ? ' — not: ' + orphans.map(o => `vibes/${o}.css`).join(', ') : ''));
}

/* ================= D: the anchored sites ================= */
// A role that names where it lands in the stylesheets (ROLES `at.web`:
// [file, selector, property], or a list of them) is spent there as its own
// custom property; a colour role's `except` site keeps spending the role it
// names. Top-level rules only; a selector matches a rule whose selector list
// is it or includes it.
function siteDecls(css, selector, prop) {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const out = [];
  let head = '', i = 0;
  const want = selector.trim().replace(/\s+/g, ' ');
  while (i < src.length) {
    const c = src[i];
    if (c === '{') {
      // A whole block at a time, so an @media's rules are never looked into.
      const sel = head.trim().replace(/\s+/g, ' ');
      let j = i + 1, d = 1, body = '';
      while (j < src.length && d) { if (src[j] === '{') d++; else if (src[j] === '}') d--; if (d) body += src[j]; j++; }
      if (sel === want || sel.split(',').map(s => s.trim()).includes(want)) {
        let dp = 0, cur = '';
        const parts = [];
        for (const ch of body) { if (ch === '(') dp++; else if (ch === ')') dp--; if (ch === ';' && !dp) { parts.push(cur); cur = ''; } else cur += ch; }
        parts.push(cur);
        for (const p of parts) { const k = p.indexOf(':'); if (k > 0 && p.slice(0, k).trim() === prop) out.push(p.slice(k + 1).trim().replace(/\s+/g, ' ')); }
      }
      i = j; head = '';
      continue;
    } else if (c === '}' || c === ';') head = '';
    else head += c;
    i++;
  }
  return out;
}
const SHEETS = { 'rack.css': RACK, 'auth.css': AUTH };
const webOf = path => (ROLES.find(r => r.path === path) || {}).web;
function anchoredSites(sheets) {
  const errs = [], seen = [];
  const one = (role, token, a, why) => {
    if (!Array.isArray(a) || a.length !== 3 || !(a[0] in sheets)) return;
    const [file, sel, prop] = a;
    const decls = siteDecls(sheets[file], sel, prop);
    seen.push(`${file} ${sel} ${prop}`);
    if (!decls.length) errs.push(`${role}: ${file} has no top-level ${sel} { ${prop} } — the contract anchors ${why} there`);
    else if (!decls.every(v => v.includes(`var(${token})`))) errs.push(`${role}: ${file} ${sel} { ${prop}: ${decls.join(' / ')} } does not spend var(${token}) (${why})`);
  };
  for (const r of ROLES) {
    const w = r.at && r.at.web;
    if (w && typeof r.web === 'string' && r.web.startsWith('--')) for (const a of Array.isArray(w[0]) ? w : [w]) one(r.path, r.web, a, 'its site');
    for (const x of r.except || []) {
      const t = webOf(x.role);
      if (Array.isArray(x.at) && typeof t === 'string' && t.startsWith('--')) one(r.path, t, x.at, `an exception that stays ${x.role}`);
    }
  }
  return { errs, seen };
}
section('D  every site the contract anchors in the stylesheets spends its role\'s token');
{
  const { errs, seen } = anchoredSites(SHEETS);
  for (const e of errs) bad(e);
  expect(!errs.length && seen.length > 20, `all ${seen.length} anchored declarations in rack.css and auth.css spend their role's custom property`);
}

/* ================= C: canaries ================= */
section('C  canaries — the checks can fail');
{
  const moved = RACK.replace(/(\.cal-head \{[^}]*background: )var\(--cal-mark\)/, '$1var(--chalk)');
  const hitD = anchoredSites({ 'rack.css': moved, 'auth.css': AUTH }).errs;
  expect(moved !== RACK && hitD.length === 1 && /colors\.calMark: rack\.css \.cal-head \{ background: var\(--chalk\) \}/.test(hitD[0]),
    'a .cal-head painted var(--chalk) again fails D, on exactly that site' + (hitD.length === 1 ? '' : ' — got: ' + (hitD.join('; ') || 'nothing')));
  const unfocused = RACK.replace(/(\.wpe-row input:focus \{[^}]*border-color: )var\(--p-blue\)/, '$1var(--focus)');
  expect(unfocused !== RACK && anchoredSites({ 'rack.css': unfocused, 'auth.css': AUTH }).errs.some(e => /colors\.focus: .*\.wpe-row input:focus/.test(e)),
    'the water field\'s focus border moved onto --focus fails D (focus\'s exception keeps it --p-blue)');
  const changed = JSON.parse(JSON.stringify(V1));
  changed.colors.accent = '#f0be1f';
  const { errs } = compareV1(changed, rootDecls);
  const hit = errs.map(e => (/^(--[\w-]+):/.exec(e) || [])[1]).sort();
  expect(JSON.stringify(hit) === JSON.stringify(['--accent', '--accent-rgb', '--shadow-flame', '--shadow-tour-lit']),
    'a v1.js with the accent one step off fails A on --accent and on exactly the three tokens drawn from it (' + hit.join(', ') + ')');
  const shadowed = JSON.parse(JSON.stringify(V1));
  shadowed.shadow.fab.web[1].a = 0.36;
  expect(compareV1(shadowed, rootDecls).errs.some(e => /--shadow-fab:/.test(e)), 'a v1.js with one shadow alpha changed fails A on that shadow');
  const extra = [...rootDecls, ['--stray', '#000']];
  expect(compareV1(V1, extra).errs.some(e => /--stray/.test(e)), 'a custom property in :root that no role names fails A');
  const probe = { ...JSON.parse(JSON.stringify(V1)), id: 'probe' };
  const g = block('probe', probe);
  expect(!g.missing.length && g.text.startsWith(BEGIN('probe') + '\n:root[data-vibe="probe"] {\n') && g.text.endsWith('\n}\n' + END),
    'v1\'s values, generated as a vibe, make a complete block between the markers');
  const gen = new Map(g.text.split('\n').slice(2, -2).map(l => { const m = /^ {2}(--[\w-]+): (.*);$/.exec(l); return [m[1], m[2]]; }));
  const back = compareV1(V1, [...gen].concat(rootDecls.filter(([p]) => PROPS.some(r => r.fixed && r.web === p))));
  expect(!back.errs.length, 'and that block, with v1\'s fixed layout tokens, is rack.css\'s :root again — the generator and the check agree');
  const tampered = g.text.replace('--accent: #f0be1e;', '--accent: #f0be1f;');
  expect(tampered !== g.text && !(tampered.startsWith(g.text)), 'a committed block with one byte changed would not pass B');
}

console.log('\n' + (fails.length ? `${fails.length} of ${checks} checks failed.`
  : `All checks passed. ${checks} checks. v1 is rack.css's :root (${PROPS.length} roles); ${others.length} other vibe${others.length === 1 ? '' : 's'}${WRITE ? `, ${wrote} file${wrote === 1 ? '' : 's'} written` : ''}.`));
process.exit(fails.length ? 1 : 0);
