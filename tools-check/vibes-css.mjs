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
//      gives it — read through index.js valueOf(), so a key v1 leaves out (the
//      look params) is its role's default, and a role whose v1 value is null
//      (the status strip, a photo band: nothing drawn) is not declared at all
//      (hex compared case-insensitively, channel lists and the spaces
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
//   E  the engine v2 sites (the first four vibe specs' shared asks) spend
//      their roles' tokens in rack.css: the set badge's W / F / D letters
//      (tagInk), "+ Drop"'s 12px words (inkOf.pBlue, the one shared rule
//      that sets small text in a data colour), the calorie runway's hatching
//      and edge (tint.runway /
//      runwayEdge), and the rings round the calorie head and dashed target
//      and their guide swatches (shadow.calHead / calTarget). A vibe with a
//      band (colors.band) gets the status strip generated after its tokens.
//      Engine v3's two colour roles (the toggle's knob, the greeting's name)
//      are anchored in ROLES `at` and held by D; its type.tag preset writes
//      --type-tag-* tokens only where a vibe sets it (v1's is null).
//   E3 the engine v3 sites: the caps tag's sites in rack.css and auth.css
//      spend --type-tag-* with v1's literal as the fallback, and the page
//      modules carry the hooks the contract names ([data-lead], [data-hero],
//      [data-tag]). A vibe that sets the tag, or a stripe other than 'side',
//      gets its rules generated after its tokens (tagRules, stripeRules).
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
const { ROLES, IDS, at, sideOf, hexToRgb, valueOf } = I;
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

/* One role's CSS text in a definition: undefined when the definition does not
   give it and the role says nothing a definition without it takes (a missing
   role), null when its value is null (nothing is drawn: no token is written,
   so the site keeps v1's drawing). The value is index.js valueOf()'s — the
   definition's own, else the role's `or` or `dflt` — the one reading the
   engines share. Throws on a value of the wrong shape. */
function cssText(def, role) {
  const v = valueOf(def, role.path);
  if (v === undefined) return undefined;
  if (v === null) return null;
  // a value that names a colour role (tagInk, inkOf, a shape ink or fill)
  if (role.ref === 'color') return colourOf(def, v);
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
    case 'tint':                                                  // a role at an alpha, as rgba()
      if (!v || typeof v.color !== 'string' || typeof v.a !== 'number') throw new Error(`${role.path}: not { color, a }`);
      return colourOf(def, v.color, v.a);
    case 'shape':                                                 // a look param: px, or a switch as 1 / 0
      if (typeof v === 'number') return len(v);
      if (typeof v === 'boolean') return v ? '1' : '0';
      throw new Error(`${role.path}: not a number or a switch`);
    case 'image':                                                 // a photo band's height (images.<slot>.band), px
      if (typeof v === 'number') return len(v);
      throw new Error(`${role.path}: not a number`);
    case 'type':                                                  // a preset's key (type.tag.*), spelled by its unit
      if (typeof v !== 'number') throw new Error(`${role.path}: not a number`);
      if (role.unit === 'case') return v ? 'uppercase' : 'none';
      return num(v) + (role.unit || '');
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
    if (t === undefined) missing.push(r.path); else if (t !== null) out.push([r.web, t]);
  }
  return { out, missing };
}

const BEGIN = id => `/* vibes-css:begin — generated from vibes/defs/${id}.js by tools-check/vibes-css.mjs. Do not edit between the markers: change the definition, then run it with --write. */`;
const END = '/* vibes-css:end */';

/* The status strip (colors.band, engine v2). An installed web app draws its
   status text white whatever the page is (index.html's black-translucent
   meta, fixed at launch), so a light vibe keeps the top inset dark: a fixed
   strip the height of --safe-top in --band, over everything (the workout bar
   runs under the status bar, the tour overlay is 210, the toast 300), taking
   no touches. In a Safari tab the inset is 0 and the strip is nothing.
   It is generated here, not written in rack.css, because v1 draws no strip:
   a rule in rack.css would give v1 an html::before of its own, where this
   exists only under a vibe whose definition sets a band. One line, so no
   reader of the block's declarations (vibe-setting.mjs's tile check) takes
   it for a token. */
const bandRule = id => `:root[data-vibe="${id}"]::before { content: ''; position: fixed; top: 0; left: 0; right: 0; ` +
  'height: var(--safe-top); background: var(--band); pointer-events: none; z-index: 400; }';

/* Engine v3's drawings a definition switches on. Like the strip, each exists
   only under a vibe whose definition asks for it — v1, and every vibe that
   leaves them out, gets none, and rack.css and auth.css keep v1's text — and
   each is one line.
   The caps tag (type.tag). The small caps outside the blocks that v1 sets in
   full (size, tracking, case, width, weight) read --type-tag-* in rack.css
   and auth.css, falling back to v1's literal. These are the sites that have
   no literal to fall back to:
     - [data-tag]: a string written in lower case that v1 shows in capitals
       through a preset (the eyebrows under Fuel's and Steps' figures and the
       rest the page modules mark, the plate strip's "bar only"). Without a
       tag it keeps the vibe's own preset, which is no token, so the rule is
       only here. (0,3,0), to beat a vibe's preset rule for the eyebrow; a
       vibe's rule written for that one site still wins.
     - .ai-cost and .cal-legend-item, the two caps sites v1 gives no width or
       weight (theirs is inherited): the tag's width and weight.
     - the plate chip's figures and the calendar's day numbers: the tag's size
       as a floor, never below their own (10px, 12px). :where(), so a vibe's
       own size for either still wins.
   A key the preset leaves out is left out here too.
   The side stripe (shape.stripe). 'side' is v1's drawing — the tour tip's 2px
   and the Coach sheet's asking bubble's 3px accent stripe down the left — and
   writes nothing. 'top' moves it to a rule across the top edge, 'keyline' to
   an outline all round, each shape.keyline.width wide in the accent the
   stripe was, as native TourOverlay and coach/sheets.jsx draw it from
   T.shape.stripe. The tip's square corners follow the rule. */
const TAG_DECLS = [
  ['size', 'font-size', 'var(--type-tag-size)'],
  ['ls', 'letter-spacing', 'var(--type-tag-ls)'],
  ['upper', 'text-transform', 'var(--type-tag-upper)']
];
function tagRules(id, def) {
  const tag = valueOf(def, 'type.tag');
  if (tag === null || tag === undefined) return [];
  if (typeof tag !== 'object') throw new Error('type.tag: not { size, wdth, wght, ls, upper }');
  const S = `:root[data-vibe="${id}"]`, has = k => typeof tag[k] === 'number';
  const axes = [has('wdth') ? `'wdth' var(--type-tag-wdth)` : null, has('wght') ? `'wght' var(--type-tag-wght)` : null].filter(Boolean);
  const fvs = axes.length ? `font-variation-settings: ${axes.join(', ')};` : null;
  const all = [...TAG_DECLS.filter(([k]) => has(k)).map(([, p, v]) => `${p}: ${v};`), fvs].filter(Boolean);
  const out = [];
  if (all.length) out.push(`${S} [data-tag] { ${all.join(' ')} }`);
  if (fvs) out.push(`${S} :where(.ai-cost, .cal-legend-item) { ${fvs} }`);
  if (has('size')) {
    out.push(`${S} :where(.plate-chip) { font-size: max(10px, var(--type-tag-size)); }`);
    out.push(`${S} :where(.cal-daynum) { font-size: max(12px, var(--type-tag-size)); }`);
  }
  return out;
}
function stripeRules(id, def) {
  const s = at(def, 'shape.stripe');
  if (s === undefined || s === 'side') return [];
  const S = `:root[data-vibe="${id}"]`, both = `${S} .ob-tip, ${S} .coach-bub.ask`;
  if (s === 'top') return [`${both} { border-left: 0; border-top: var(--shape-keyline-width) solid var(--accent); }`,
    `${S} .ob-tip { border-radius: 0 0 var(--r-sm) var(--r-sm); }`];
  if (s === 'keyline') return [`${both} { border: var(--shape-keyline-width) solid var(--accent); }`,
    `${S} .ob-tip { border-radius: var(--r-sm); }`];
  throw new Error(`shape.stripe: '${s}' is not 'side', 'top' or 'keyline'`);
}

function block(id, def) {
  const { out, missing } = tokensOf(def, { fixed: false });
  const lines = out.map(([k, v]) => `  ${k}: ${v};`);
  const cs = sideOf(at(def, 'chrome.colorScheme'), 'web');
  if (typeof cs === 'string') lines.push(`  color-scheme: ${cs};`);
  const band = valueOf(def, 'colors.band');
  const extra = [...(typeof band === 'string' ? [bandRule(id)] : []), ...tagRules(id, def), ...stripeRules(id, def)];
  return { text: [BEGIN(id), `:root[data-vibe="${id}"] {`, ...lines, '}', ...extra, END].join('\n'), missing };
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
    // null in v1: nothing is drawn, so rack.css declares no token for it
    if (want === null) { if (declared.has(r.web)) errs.push(`${r.web} is declared in rack.css's :root, but v1's ${r.path} is null — nothing drawn`); else n++; continue; }
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

/* ================= E: the engine v2 sites ================= */
// The roles engine v2 added (the shared asks of the first four vibe specs)
// that rack.css spends. Each rule below spends its role's token, and in v1
// each token is the value the declaration had (or, where rack-v58 had no
// declaration, the property's initial value: --shadow-cal-* are none), so v1
// draws what it drew. They are listed here rather than as ROLES `at` anchors
// because index.js is pinned byte for byte into the native tree: the anchors
// can move into ROLES when both trees take a new index.js together.
const ENGINE2 = [
  ['tagInk.W', ['rack.css', '.set-idx.t-W', 'color']],
  ['tagInk.F', ['rack.css', '.set-idx.t-F', 'color']],
  ['tagInk.D', ['rack.css', '.set-idx.t-D', 'color']],
  // the one shared rule that sets small text (12px) in a data colour; the
  // JS sites that ink text in one (.stat-val, the load figures) are 20px and
  // up — large, so they keep the role itself
  ['inkOf.pBlue', ['rack.css', '.drop-add', 'color']],
  ['tint.runway', ['rack.css', '.cal-runway', 'background']],
  ['tint.runwayEdge', ['rack.css', '.cal-runway', 'border-right']],
  ['shadow.calHead', ['rack.css', '.cal-head', 'box-shadow']],
  ['shadow.calHead', ['rack.css', '.guide-sw.head::after', 'box-shadow']],
  ['shadow.calTarget', ['rack.css', '.cal-target', 'box-shadow']],
  ['shadow.calTarget', ['rack.css', '.guide-sw.target::after', 'box-shadow']]
];
function engineSites(sheets) {
  const errs = [];
  for (const [path, [file, sel, prop]] of ENGINE2) {
    const token = webOf(path);
    const decls = siteDecls(sheets[file], sel, prop);
    if (!decls.length) errs.push(`${path}: ${file} has no top-level ${sel} { ${prop} } — engine v2 spends ${token} there`);
    else if (!decls.every(v => v.includes(`var(${token})`))) errs.push(`${path}: ${file} ${sel} { ${prop}: ${decls.join(' / ')} } does not spend var(${token})`);
  }
  return { errs };
}
section('E  every engine v2 site in rack.css spends its role\'s token');
{
  const { errs } = engineSites(SHEETS);
  for (const e of errs) bad(e);
  expect(!errs.length && ENGINE2.every(([p]) => typeof webOf(p) === 'string'),
    `all ${ENGINE2.length} engine v2 declarations spend their role's custom property: the W / F / D letters, "+ Drop"'s small blue words, the runway's hatching and edge, the rings round the calorie head and target and their guide swatches`);
}

/* ================= E3: the engine v3 sites ================= */
// The caps tag's sites that v1 sets in full: each spends --type-tag-* with
// v1's literal as the fallback (`var(--type-tag-size, 9px)`), so v1 and every
// vibe without a tag draw what they drew. .ai-cost and .cal-legend-item set
// no width or weight in v1 (their tag rule is generated: tagRules above). And
// the page modules' hooks the contract names: the three lead cards
// (.card[data-lead]), the three hero figures ([data-hero]) and the preset
// sites that show a string written in lower case in capitals ([data-tag]).
const TAG_PROPS = [['font-size', '--type-tag-size'], ['letter-spacing', '--type-tag-ls'], ['text-transform', '--type-tag-upper'],
  ['font-variation-settings', '--type-tag-wdth'], ['font-variation-settings', '--type-tag-wght']];
const TAG_SITES = [
  ['rack.css', '.sync-pip'], ['rack.css', '.trial-bar'], ['rack.css', '.add-tile .tag'], ['rack.css', '.adm-flag'], ['rack.css', '.conf'],
  ['rack.css', '.group-pill'], ['rack.css', '.mini-stat-l'], ['rack.css', '.chart-sub'], ['rack.css', '.you-since'],
  ['auth.css', '.gate-sep'], ['auth.css', '.ob-kicker'], ['auth.css', '.ob-item-t'],
  ['rack.css', '.ai-cost', 3], ['rack.css', '.cal-legend-item', 3]
];
function tagSites(sheets) {
  const errs = [];
  for (const [file, sel, n = 5] of TAG_SITES) for (const [prop, token] of TAG_PROPS.slice(0, n)) {
    const decls = siteDecls(sheets[file], sel, prop);
    if (!decls.length) errs.push(`type.tag: ${file} has no top-level ${sel} { ${prop} }`);
    else if (!decls.every(v => v.includes(`var(${token}, `))) errs.push(`type.tag: ${file} ${sel} { ${prop}: ${decls.join(' / ')} } does not spend var(${token}, <v1's literal>)`);
  }
  return { errs };
}
const MARKS = [
  ['food.js', /card\.dataset\.lead = 'fuelSummary'/, 'Fuel\'s summary is .card[data-lead="fuelSummary"]'],
  ['steps.js', /card\.dataset\.lead = 'stepsToday'/, 'Steps\' today card is .card[data-lead="stepsToday"]'],
  ['weight.js', /log\.dataset\.lead = 'weightLog'/, 'Weight\'s log card is .card[data-lead="weightLog"]'],
  ['food.js', /const big = el\('div', 'load-num num'\);\n(?:.*\n){0,2}\s*big\.dataset\.hero = '';/, 'Fuel\'s summary figure is [data-hero]'],
  ['steps.js', /const big = el\('div', 'load-num num',[^\n]*\n(?:.*\n){0,2}\s*big\.dataset\.hero = '';/, 'Steps\' today figure is [data-hero]'],
  ['you.js', /'headline-v num', fmtRate\([^\n]*\)\)\.dataset\.hero = '';[\s\S]{0,300}'headline-v num', '–'\)\)\.dataset\.hero = '';/, 'the Goal\'s .headline-v is [data-hero], with a pace or without'],
  ['food.js', /'kcal left today'\)\)\.dataset\.tag = '';/, '"kcal left today" / "kcal over target" is [data-tag]'],
  ['food.js', /'kcal \/ day'\)\)\.dataset\.tag = '';/, 'the targets preview\'s "kcal / day" is [data-tag]'],
  ['steps.js', /'to go'\)\)\.dataset\.tag = '';/, '"to go" / "goal met" is [data-tag]'],
  ['weight.js', /' heavier by ' \+ hr\)\)\.dataset\.tag = '';/, '"lb heavier by …" is [data-tag]'],
  ['weight.js', /' kcal'\)\)\.dataset\.tag = '';/, '"± … kcal" is [data-tag]'],
  ['water.js', /fmtWater\(goal\)\)\)\.dataset\.tag = '';/, '"ml of …" is [data-tag]'],
  ['workout.js', /'bar only'\)\)\.dataset\.tag = '';/, '"bar only" is [data-tag]']
];
section('E3 every engine v3 site spends its role, and the page modules carry its hooks');
{
  const { errs } = tagSites(SHEETS);
  for (const e of errs) bad(e);
  expect(!errs.length, `all ${TAG_SITES.length} caps-tag sites spend --type-tag-* with v1's literal as the fallback (${TAG_SITES.reduce((n, s) => n + (s[2] || 5), 0)} declarations)`);
  for (const [file, re, what] of MARKS) expect(re.test(read(file)), `${file}: ${what}`);
  const probe = JSON.parse(JSON.stringify(V1)); probe.id = 'probe';
  expect(!/\[data-tag\]|\.ob-tip|max\(/.test(block('probe', probe).text), 'v1\'s values generate no tag rule and no stripe rule (its tag is null, its stripe side)');
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
  // engine v2: a null role writes no token, a set one does; a left-out one takes its role's default
  expect(!gen.has('--band') && compareV1(V1, [...rootDecls, ['--band', '#111416']]).errs.some(e => /--band is declared/.test(e)),
    'v1\'s null status strip writes no --band, and a :root that declares one fails A');
  const lit = JSON.parse(JSON.stringify(V1));
  lit.id = 'probe2'; lit.colors.band = '#111416'; lit.tagInk.W = 'warn'; lit.shape = { rule: { head: [3, 2, 1.2] }, lead: { keyline: true } };
  delete lit.inkOf; delete lit.face.web.num;
  const g2 = new Map(block('probe2', lit).text.split('\n').slice(2, -2).map(l => { const m = /^ {2}(--[\w-]+): (.*);$/.exec(l); return m ? [m[1], m[2]] : [l, l]; }));
  expect(g2.get('--band') === '#111416' && g2.get('--tag-ink-w') === V1.colors.warn && g2.get('--shape-rule-head-0') === '3px' &&
    g2.get('--shape-rule-head-1') === '2px' && g2.get('--shape-rule-head-2') === '1.2px' && g2.get('--shape-rule-sub-0') === '2px' &&
    g2.get('--shape-lead-keyline') === '1' && g2.get('--ink-of-p-yellow') === V1.colors.pYellow && g2.get('--font-num') === V1.face.web.font,
    'a vibe that sets the strip, a badge ink and two look params gets exactly those; one that leaves inkOf and face.web.num out gets each role\'s default');
  // a photo slot in band mode: its band's height, in px (Iron Age's 80pt)
  const banded = JSON.parse(JSON.stringify(lit));
  banded.images = { youHero: { file: 'img/you.png', band: 80 }, thumb: { file: 'img/pick.png' } };
  const g3 = block('probe2', banded).text;
  expect(g3.includes('  --photo-band-you-hero: 80px;') && !/--photo-band-(summary|steps|weight|coach|start|fuel)/.test(g3) && !g2.has('--photo-band-you-hero'),
    'a photo slot in band mode writes --photo-band-<slot> in px (80 → 80px); a slot with no band, or no photo, writes none');
  // the strip itself: one rule, only where a band is set, scoped, after the tokens
  const t2 = block('probe2', lit).text.split('\n');
  expect(t2[t2.length - 2] === bandRule('probe2') && t2[t2.length - 3] === '}' && t2.filter(l => l.includes('::before')).length === 1 &&
    /^:root\[data-vibe="probe2"\]::before \{ content: ''; position: fixed; top: 0;.*height: var\(--safe-top\); background: var\(--band\); pointer-events: none;/.test(bandRule('probe2')) &&
    !g.text.includes('::before'),
    'a vibe with a band gets the status strip — one scoped ::before, --safe-top tall, in --band, taking no touches — after its tokens; v1\'s values (no band) get none');
  // engine v3: a vibe without a knob or a greeting ink takes its own steel and
  // accent (`or`); one that sets the tag preset gets its five tokens, each
  // spelled by its unit, and v1's null preset writes none
  const v3 = JSON.parse(JSON.stringify(V1));
  v3.id = 'probe3'; delete v3.colors.knob; delete v3.colors.greetName; v3.colors.steel = '#777777'; v3.colors.accent = '#aa5500';
  v3.type.tag = { size: 11, wdth: 100, wght: 600, ls: 0.06, upper: 1 };
  v3.shape = { cue: { ink: 'accent' }, chosen: { tick: true }, stripe: 'top' };
  const g4 = new Map(block('probe3', v3).text.split('\n').slice(2, -2).map(l => { const m = /^ {2}(--[\w-]+): (.*);$/.exec(l); return m ? [m[1], m[2]] : [l, l]; }));
  expect(g4.get('--knob') === '#777777' && g4.get('--greet-name') === '#aa5500' && g4.get('--type-tag-size') === '11px' && g4.get('--type-tag-ls') === '.06em' &&
    g4.get('--type-tag-upper') === 'uppercase' && g4.get('--type-tag-wdth') === '100' && g4.get('--type-tag-wght') === '600' &&
    g4.get('--shape-cue-ink') === '#aa5500' && g4.get('--shape-chosen-tick') === '1' && ![...g4.keys()].some(k => /stripe|slab/.test(k)) &&
    ![...gen.keys()].some(k => /^--type-/.test(k)),
    'a vibe without a knob or greeting ink takes its steel and accent; its tag preset writes --type-tag-size / ls / upper / wdth / wght (11px, .06em, uppercase, 100, 600); its cue and chosen params their tokens, its stripe none; v1 writes no --type-* token');
  const e2 = engineSites({ 'rack.css': RACK.replace(/(\.set-idx\.t-W \{[^}]*color: )var\(--tag-ink-w\)/, '$1var(--p-yellow)'), 'auth.css': AUTH });
  expect(e2.errs.length === 1 && /tagInk\.W: rack\.css \.set-idx\.t-W/.test(e2.errs[0]), 'a W badge letter back on --p-yellow fails E, on exactly that site' + (e2.errs.length === 1 ? '' : ' — got: ' + (e2.errs.join('; ') || 'nothing')));
  const e3 = engineSites({ 'rack.css': RACK.replace(/(\.cal-target \{[^}]*)box-shadow: var\(--shadow-cal-target\);\s*/, '$1'), 'auth.css': AUTH });
  expect(e3.errs.length === 1 && /shadow\.calTarget: rack\.css has no top-level \.cal-target \{ box-shadow \}/.test(e3.errs[0]), 'the target ring taken off .cal-target fails E' + (e3.errs.length === 1 ? '' : ' — got: ' + (e3.errs.join('; ') || 'nothing')));
  // engine v3: a caps site back on its literal, or on the token with no
  // fallback, fails E3 on exactly that site
  const t1 = tagSites({ 'rack.css': RACK.replace(/(\.sync-pip \{[^}]*)font-size: var\(--type-tag-size, 9px\)/, '$1font-size: 9px'), 'auth.css': AUTH });
  expect(t1.errs.length === 1 && /\.sync-pip \{ font-size: 9px \}/.test(t1.errs[0]), '.sync-pip back on a literal 9px fails E3, on exactly that site' + (t1.errs.length === 1 ? '' : ' — got: ' + (t1.errs.join('; ') || 'nothing')));
  const t2a = tagSites({ 'rack.css': RACK, 'auth.css': AUTH.replace(/(\.ob-kicker \{[^}]*)var\(--type-tag-wght, 700\)/, '$1var(--type-tag-wght)') });
  expect(t2a.errs.length === 1 && /auth\.css \.ob-kicker \{ font-variation-settings/.test(t2a.errs[0]), '.ob-kicker\'s weight on the token with no v1 fallback fails E3');
  // the generated rules: a tag writes the four, each key it gives and no
  // other; a top or keyline stripe writes its two; a stripe it cannot draw
  // is refused
  const tg = JSON.parse(JSON.stringify(V1)); tg.id = 'probe4';
  tg.type.tag = { size: 11, wdth: 100, wght: 600, ls: 0.06, upper: 1 }; tg.shape = { stripe: 'top' };
  const tl = block('probe4', tg).text.split('\n');
  const S4 = ':root[data-vibe="probe4"]';
  expect(tl.includes(`${S4} [data-tag] { font-size: var(--type-tag-size); letter-spacing: var(--type-tag-ls); text-transform: var(--type-tag-upper); font-variation-settings: 'wdth' var(--type-tag-wdth), 'wght' var(--type-tag-wght); }`) &&
    tl.includes(`${S4} :where(.ai-cost, .cal-legend-item) { font-variation-settings: 'wdth' var(--type-tag-wdth), 'wght' var(--type-tag-wght); }`) &&
    tl.includes(`${S4} :where(.plate-chip) { font-size: max(10px, var(--type-tag-size)); }`) &&
    tl.includes(`${S4} :where(.cal-daynum) { font-size: max(12px, var(--type-tag-size)); }`) &&
    tl.includes(`${S4} .ob-tip, ${S4} .coach-bub.ask { border-left: 0; border-top: var(--shape-keyline-width) solid var(--accent); }`) &&
    tl[tl.length - 1] === END && tl.indexOf('}') < tl.findIndex(l => l.includes('[data-tag]')),
    'a vibe with a tag gets the [data-tag], width-and-weight and two floor rules, and with a top stripe its rule across the top, after its tokens');
  tg.type.tag = { size: 12 }; tg.shape = { stripe: 'keyline' };
  const tk = block('probe4', tg).text;
  expect(tk.includes(`${S4} [data-tag] { font-size: var(--type-tag-size); }`) && !tk.includes(':where(.ai-cost') &&
    tk.includes(`${S4} .ob-tip, ${S4} .coach-bub.ask { border: var(--shape-keyline-width) solid var(--accent); }`) && tk.includes(`${S4} .ob-tip { border-radius: var(--r-sm); }`),
    'a tag with a size alone spends the size alone; a keyline stripe is an outline all round');
  tg.shape = { stripe: 'left' };
  let threw = false; try { block('probe4', tg); } catch (e) { threw = /shape\.stripe/.test(e.message); }
  expect(threw, 'a stripe other than side, top or keyline is refused');
}

console.log('\n' + (fails.length ? `${fails.length} of ${checks} checks failed.`
  : `All checks passed. ${checks} checks. v1 is rack.css's :root (${PROPS.length} roles); ${others.length} other vibe${others.length === 1 ? '' : 's'}${WRITE ? `, ${wrote} file${wrote === 1 ? '' : 's'} written` : ''}.`));
process.exit(fails.length ? 1 : 0);
