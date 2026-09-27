#!/usr/bin/env node
//
// Verifier that the vibe contract is true: that vibes/defs/v1.js,
// vibes/defs/index.js and vibes/icons/v1.js say what rack-v58 actually draws.
//
//   node tools-check/vibes-contract.mjs
//
// v1 is the promise the whole Vibes night rests on — "v1 is today, to the
// pixel" — and this file is where that promise is first made checkable. The
// three modules are data: every colour, alpha, shadow, radius, font and icon
// the app spends, as a role with a value. If one value in them is wrong, the
// web engine and the native engine both build a v1 that is not rack-v58 and
// both proofs chase a difference nobody introduced.
//
// So nothing is copied into this file except the census (below), which is a
// snapshot like touch-target.snapshot.json, and the few names V59 §5 gives
// the engine. Every value is read out of the tree AT 928a65e — rack-v58, the
// base the engine starts from — with `git show`, so the check keeps its
// meaning after the engine rewrites rack.css, index.html and the call sites
// to spend the tokens instead.
//
//   A  the four modules — the three above and vibes/defs/vocab.js, the
//      component vocabulary — import nothing (they are copied into native
//      verbatim)
//   B  every colour is 6-digit hex, except v1's listed legacy spellings; every
//      reference names a role; v1's switches are all v1; fixed roles are v1's
//      in every vibe; every definition is frozen; the icon set's shape
//   C  every role resolves in v1, every v1 value is covered by a role, and
//      every web name is the one its role's path gives it
//   D  v1 equals rack-v58: the :root tokens, the split roles' sources and
//      sites, every raw colour literal (the census) and the channel each
//      rgba() needs, shadows and scrims (both surveyed complete), radii,
//      fonts, focus, the launch colours, the data tables, every icon at its
//      site (the list complete), every glyph (the survey complete), every hue
//      the copy names, every colour the pinned modules paint, and every
//      role's `at` read
//   E  the registry: normVibe (on a probe registry too), validId, list,
//      hexToRgb, at, and that none of it can be changed by a caller
//   F  the component vocabulary: well-formed and frozen, its blocks the
//      contract's variant blocks, every role a block reads a v1 role, every
//      param default of its kind; v1 names 'v1' in every block and holds no
//      shape param; every definition names only looks its blocks accept and
//      sets only params the vocabulary has
//
// A mutation run (a copy of vibes/ with one value made wrong, read through
// VIBES_CONTRACT_DEFS) is how a check here is proven to bite.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BASE = '928a65e';   // rack-v58
// Where the three modules are read from. Only a canary sets it: a copy of
// vibes/ with one value made wrong, to prove this file notices.
const DEFS = process.env.VIBES_CONTRACT_DEFS || ROOT;
const shown = new Map();
const show = f => {
  if (!shown.has(f)) shown.set(f, execFileSync('git', ['-C', ROOT, 'show', `${BASE}:${f}`], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  return shown.get(f);
};
const lines = f => show(f).split('\n');
const lineAt = site => { const i = site.lastIndexOf(':'); return lines(site.slice(0, i))[+site.slice(i + 1) - 1]; };
const FILES = ['vibes/defs/v1.js', 'vibes/defs/index.js', 'vibes/icons/v1.js', 'vibes/defs/vocab.js'];

let checks = 0; const fails = [];
const ok = m => { checks++; if (process.env.VERBOSE) console.log('  ✓ ' + m); };
const bad = m => { checks++; fails.push(m); console.log('  ✗ ' + m); };
const expect = (cond, m) => (cond ? ok(m) : bad(m));
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const section = t => console.log('\n' + t);
const kebab = s => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

const I = await import(pathToFileURL(join(DEFS, 'vibes/defs/index.js')).href);
const V1 = (await import(pathToFileURL(join(DEFS, 'vibes/defs/v1.js')).href)).default;
const IC = (await import(pathToFileURL(join(DEFS, 'vibes/icons/v1.js')).href)).default;
const { ROLES, LEGACY_EXACT, HUE_NAMED, at, sideOf, hexToRgb } = I;
const roleOf = p => ROLES.find(r => r.path === p);
const webVarOf = name => (roleOf('colors.' + name) || {}).web;
// The custom property rack-v58 spends for a colour role's job: a split role's
// source (accent -> --p-yellow), else its own name.
const baseVarOf = name => { const r = roleOf('colors.' + name) || {}; return (r.from && r.from.web) || r.web; };

/* ================= A ================= */
section('A  the four modules import nothing');
/* Read on the code alone — comments, strings, templates and regex bodies
   blanked by the lexer in D.12 — so an import anywhere is seen: at a line's
   start or after a statement or a comment on the same line, `import{…}from`
   with no space, import(), import.meta; and the word in a comment or a
   string is not. A line-anchored regex saw only the first of those. */
for (const f of FILES) {
  const code = codeOnly(readFileSync(join(DEFS, f), 'utf8'));
  expect(!/\bimport\b/.test(code), f + ' has no import — static, dynamic or import.meta — anywhere in its code');
  expect(!/\bexport\s*\*/.test(code) && !/\bexport\s*\{[^}]*\}\s*from\b/.test(code), f + ' re-exports nothing');
  expect(!/\brequire\b/.test(code), f + ' requires nothing');
}

/* ================= B ================= */
section('B  colours are 6-digit hex, except v1\'s legacy spellings');
const NAMED = new Set('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peru pink plum powderblue purple rebeccapurple red rosybrown saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(' '));
const HEX6 = /^#[0-9a-fA-F]{6}$/;
const looksColour = s => typeof s === 'string' && (/^#/.test(s) || /^(rgba?|hsla?)\(/i.test(s) || NAMED.has(s.toLowerCase()));
function leaves(o, p = '', out = []) {
  if (o && typeof o === 'object' && (Array.isArray(o) ? o.length : Object.keys(o).length)) {
    for (const [k, v] of Object.entries(o)) leaves(v, p ? p + '.' + k : k, out);
  } else out.push([p, o]);
  return out;
}
const underLegacy = p => LEGACY_EXACT.some(L => p === L || p.startsWith(L + '.'));
const isDeepFrozen = o => !o || typeof o !== 'object' || (Object.isFrozen(o) && Object.values(o).every(isDeepFrozen));
const defs = {};
for (const id of I.IDS) defs[id] = (await import(pathToFileURL(join(DEFS, `vibes/defs/${id}.js`)).href)).default;
const COLOR_KEYS = new Set(Object.keys(V1.colors));
// The hue families a sentence can name (HUE_NAMED): wide enough that a vibe
// can move a colour, narrow enough that "the blue band" is still blue.
const hsl = hex => {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
};
const HUE_FAMILY = {
  red:    c => c.s >= 0.35 && (c.h >= 345 || c.h <= 15),
  amber:  c => c.s >= 0.35 && c.h >= 30 && c.h <= 60,
  yellow: c => c.s >= 0.35 && c.h >= 35 && c.h <= 65,
  green:  c => c.s >= 0.25 && c.h >= 75 && c.h <= 165,
  blue:   c => c.s >= 0.25 && c.h >= 185 && c.h <= 250,
  white:  c => c.l >= 0.85 && c.s <= 0.4,
  grey:   c => c.s <= 0.25 && c.l > 0.15 && c.l < 0.85
};
for (const [id, def] of Object.entries(defs)) {
  const offHue = HUE_NAMED.filter(h => { const v = sideOf(at(def, h.role), 'web'); return !HUE_FAMILY[h.hue] || !HEX6.test(v) || !HUE_FAMILY[h.hue](hsl(v)); });
  expect(!offHue.length, `${id}: every role the copy names by hue is that hue (${HUE_NAMED.length})` + (offHue.length ? ' — not: ' + offHue.map(h => h.role + ' ' + h.hue).join(', ') : ''));
  const colourLeaves = leaves(def).filter(([, v]) => looksColour(v));
  const odd = colourLeaves.filter(([p, v]) => !HEX6.test(v) && !(id === 'v1' && underLegacy(p)));
  expect(!odd.length, `${id}: every colour string is 6-digit hex${id === 'v1' ? ' or a listed legacy spelling' : ''}` +
    (odd.length ? ' — not: ' + odd.map(([p, v]) => p + '=' + v).join(', ') : ` (${colourLeaves.length} colour strings)`));
  if (id !== 'v1') expect(!LEGACY_EXACT.some(L => at(def, L) !== undefined && !HEX6.test(at(def, L))), id + ' uses no legacy spelling');
  // a channel token is its own role's channels: --p-blue-rgb is pBlue's, in every vibe
  const rgbOff = Object.entries(def.web.rgb).filter(([k, v]) => k !== v);
  expect(!rgbOff.length, `${id}: every web.rgb channel names its own role` + (rgbOff.length ? ' — not: ' + rgbOff.map(([k, v]) => k + '=' + v).join(', ') : ''));
  // a helper named for a role (accent, danger, warn) tints that role
  const alphaOff = Object.entries(def.alpha).filter(([k, v]) => COLOR_KEYS.has(k) && k !== v);
  expect(!alphaOff.length, `${id}: every alpha helper named for a role tints that role` + (alphaOff.length ? ' — not: ' + alphaOff.map(([k, v]) => k + '=' + v).join(', ') : ''));
  // the three hex tables follow their roles, so paint() and T.group() agree
  for (const r of ROLES.filter(x => x.follows)) {
    const t = at(def, r.path), f = r.follows;
    const shape = eq(Object.keys(t), Object.keys(f));
    const off = shape ? Object.keys(f).filter(k => String(t[k]).toLowerCase() !== String(sideOf(def.colors[f[k]], 'web')).toLowerCase()) : ['(shape)'];
    expect(shape && !off.length, `${id}: every ${r.path} entry is the colour of the role it follows` + (off.length ? ' — not: ' + off.join(', ') : ''));
  }
  // a fixed role is a fact about a build, an install or rack.css, so every vibe holds v1's
  if (id !== 'v1') {
    const moved = ROLES.filter(r => r.fixed && !eq(at(def, r.path), at(V1, r.path)));
    expect(!moved.length, `${id}: every fixed role is v1's` + (moved.length ? ' — not: ' + moved.map(r => r.path).join(', ') : ''));
  }
  // one caller writing into a definition would change it for every caller after
  expect(isDeepFrozen(def), `${id}: the definition is frozen all the way down`);
}
expect(isDeepFrozen(IC), 'the v1 icon set is frozen all the way down');
{
  // The icon set's shape: exactly what a renderer knows how to draw, nothing
  // it would have to guess at, and nothing listed that nobody draws.
  const EL_KEYS = { path: ['tag', 'd'], circle: ['tag', 'cx', 'cy', 'r'], rect: ['tag', 'x', 'y', 'width', 'height', 'rx'] };
  const ICON_KEYS = ['viewBox', 'stroke', 'fill', 'linecap', 'linejoin', 'els'];
  expect(eq(Object.keys(IC), ['id', 'icons', 'sites', 'glyphs', 'prose']), 'the icon set is { id, icons, sites, glyphs, prose }');
  const badIcons = Object.entries(IC.icons).filter(([, i]) => !eq(Object.keys(i), ICON_KEYS) || typeof i.stroke !== 'number' || !Array.isArray(i.els) ||
    !i.els.length || !i.els.every(e => EL_KEYS[e.tag] && eq(Object.keys(e), EL_KEYS[e.tag])));
  expect(!badIcons.length, `every icon is { ${ICON_KEYS.join(', ')} }, each element exactly its tag's attributes` +
    (badIcons.length ? ' — not: ' + badIcons.map(([k]) => k).join(', ') : ''));
  const WEB_SITE = ['at', 'css', 'size', 'stroke', 'strokeFrom', 'ariaHidden'], NAT_SITE = ['at', 'size', 'stroke', 'props', 'attr', 'color'];
  const badSites = [];
  for (const [k, s] of Object.entries(IC.sites)) {
    const names = [].concat(s.icon);
    // attr says how a circle or rect's numbers are passed, so it is there exactly when an <Svg> site draws one
    const shapes = names.every(n => IC.icons[n]) && names.some(n => IC.icons[n].els.some(e => e.tag !== 'path'));
    if (!eq(Object.keys(s), ['icon', 'web', 'native'])) badSites.push(k);
    if (s.web && (Object.keys(s.web).some(x => !WEB_SITE.includes(x)) || ('strokeFrom' in s.web && s.web.strokeFrom !== 'css') ||
        ('ariaHidden' in s.web && s.web.ariaHidden !== true))) badSites.push(k + '.web');
    if (s.native !== null && (!s.native || typeof s.native !== 'object' || Object.keys(s.native).some(x => !NAT_SITE.includes(x)) ||
        !['path', 'svg', 'mixed'].includes(s.native.props) ||
        (s.native.props === 'svg' && shapes ? !['number', 'string'].includes(s.native.attr) : 'attr' in s.native))) badSites.push(k + '.native');
  }
  expect(!badSites.length, `every site holds only what a renderer reads (web: ${WEB_SITE.join(', ')}; native: ${NAT_SITE.join(', ')}), ` +
    `attr 'number' or 'string' exactly where an <Svg> site draws a circle or rect` + (badSites.length ? ' — not: ' + badSites.join(', ') : ''));
  const drawnIcons = new Set(Object.values(IC.sites).flatMap(s => [].concat(s.icon)));
  const undrawn = Object.keys(IC.icons).filter(k => !drawnIcons.has(k));
  expect(!undrawn.length, `every one of the ${Object.keys(IC.icons).length} icons is drawn at a site` + (undrawn.length ? ' — not: ' + undrawn.join(', ') : ''));
  const badGlyphs = Object.entries(IC.glyphs).filter(([, g]) => !eq(Object.keys(g), ['char', 'web', 'native']) || typeof g.char !== 'string' ||
    !Array.isArray(g.web) || !Array.isArray(g.native) || !(g.web.length + g.native.length));
  const badProse = Object.entries(IC.prose).filter(([, g]) => !eq(Object.keys(g), ['web', 'native']) || !Array.isArray(g.web) ||
    !Array.isArray(g.native) || !(g.web.length + g.native.length));
  expect(!badGlyphs.length && !badProse.length, 'every glyph is { char, web, native } and every prose character { web, native }, each drawn somewhere' +
    (badGlyphs.length + badProse.length ? ' — not: ' + [...badGlyphs, ...badProse].map(([k]) => k).join(', ') : ''));
}
for (const L of LEGACY_EXACT) {
  const v = at(V1, L);
  const vals = Array.isArray(v) ? v : [v];
  expect(v !== undefined && vals.every(s => typeof s === 'string' && !HEX6.test(s)),
    `LEGACY_EXACT ${L} exists in v1 and is genuinely not 6-digit (${JSON.stringify(v)})`);
}
// v1's switches: every building block is its v1 branch, and there is no photo
const VARIANT_KEYS = ROLES.filter(r => r.kind === 'variant').map(r => r.path.slice('variants.'.length));
expect(eq(Object.keys(V1.variants), VARIANT_KEYS) && Object.values(V1.variants).every(v => v === 'v1'),
  `v1's ${VARIANT_KEYS.length} building blocks are all their v1 branch`);
expect(V1.images && typeof V1.images === 'object' && !Array.isArray(V1.images) && Object.keys(V1.images).length === 0, 'v1 has no image slots filled');
expect(V1.icons === 'v1' && IC.id === 'v1', 'v1 draws the v1 icon set');
// every colour reference names a colour role
const refs = [];
for (const [k, t] of Object.entries(V1.tint)) {
  refs.push(['tint.' + k + '.color', t.color]);
  expect(typeof t.a === 'number' && t.a >= 0 && t.a <= 1, `tint.${k}.a is a number in 0..1`);
}
for (const [k, v] of Object.entries(V1.alpha)) refs.push(['alpha.' + k, v]);
for (const [k, v] of Object.entries(V1.type)) if ('color' in v) refs.push(['type.' + k + '.color', v.color]);
for (const [k, s] of Object.entries(V1.shadow)) (s.web || []).forEach((l, i) => {
  refs.push([`shadow.${k}.web.${i}.color`, l.color]);
  expect(l.a === undefined || (typeof l.a === 'number' && l.a >= 0 && l.a <= 1), `shadow.${k}.web.${i}.a is absent or in 0..1`);
});
V1.scrim.tour.stops.forEach((s, i) => refs.push(['scrim.tour.stops.' + i + '.color', s.color]));
for (const [k, v] of Object.entries(V1.web.rgb)) refs.push(['web.rgb.' + k, v]);
for (const [k, v] of Object.entries(V1.importGroups)) refs.push(['importGroups.' + k, v]);
V1.mark.forEach((v, i) => refs.push(['mark.' + i, v]));
for (const [k, v] of Object.entries(V1.subjects)) refs.push(['subjects.' + k, v]);
for (const [k, v] of Object.entries(V1.kpi)) refs.push(['kpi.' + k + '.color', v.color]);
for (const [k, v] of Object.entries(V1.admin.aiSplit)) refs.push(['admin.aiSplit.' + k, v]);
V1.admin.families.forEach((v, i) => refs.push(['admin.families.' + i, v]));
for (const [k, v] of Object.entries(V1.admin.pill.native)) refs.push(['admin.pill.native.' + k, v]);
for (const [k, v] of Object.entries(V1.admin.flag)) refs.push(['admin.flag.' + k, v]);
for (const [k, v] of Object.entries(V1.conf)) refs.push(['conf.' + k, v]);
for (const [k, s] of Object.entries(IC.sites)) if (s.native && s.native.color) {
  const c = s.native.color; (typeof c === 'string' ? [c] : Object.values(c)).forEach(v => refs.push(['icons.sites.' + k, v]));
}
for (const r of ROLES.filter(x => x.follows)) for (const [k, v] of Object.entries(r.follows)) refs.push([`ROLES ${r.path}.follows.${k}`, v]);
{
  // an `except` hands its sites to another role of the same kind
  const excepts = ROLES.filter(x => x.except).flatMap(r => r.except.map(e => [r, e]));
  const badExcept = excepts.filter(([r, e]) => !roleOf(e.role) || roleOf(e.role).kind !== r.kind || e.role === r.path);
  expect(excepts.length > 0 && !badExcept.length, `every except (${excepts.length}) names another role of its own kind` +
    (badExcept.length ? ' — not: ' + badExcept.map(([r, e]) => r.path + ' -> ' + e.role).join(', ') : ''));
}
for (const h of HUE_NAMED) refs.push(['HUE_NAMED ' + h.role, h.role.replace(/^colors\./, '')]);
for (const p of I.PINNED_PAINT) refs.push(['PINNED_PAINT ' + p.web + ' ' + p.role, /^colors\./.test(p.role) ? p.role.slice(7) : p.role]);
const badRefs = refs.filter(([, v]) => !COLOR_KEYS.has(v));
expect(!badRefs.length, `all ${refs.length} colour references name a colour role` +
  (badRefs.length ? ' — not: ' + badRefs.map(([p, v]) => p + '=' + v).join(', ') : ''));
for (const k of ['sheet', 'dock', 'wkBar']) expect(V1.scrim[k].tint in V1.tint, `scrim.${k}.tint names a tint`);
for (const [k, v] of Object.entries(V1.web.rgb)) expect(!!hexToRgb(sideOf(V1.colors[v], 'web')), `channel ${k} -> ${v} is a 6-digit colour, so hexToRgb can spell it`);

/* ================= C ================= */
section('C  every role resolves, every v1 value is covered, every web name is its path\'s');
const KINDS = new Set(['color', 'alpha', 'tint', 'radius', 'shadow', 'scrim', 'font', 'type', 'face', 'chrome',
  'table', 'image', 'variant', 'shape', 'meta', 'layout', 'motion']);
const unresolved = ROLES.filter(r => at(V1, r.path) === undefined);
expect(!unresolved.length, `all ${ROLES.length} ROLES resolve to a value in v1` + (unresolved.length ? ' — not: ' + unresolved.map(r => r.path).join(', ') : ''));
expect(ROLES.every(r => KINDS.has(r.kind)), 'every role has a known kind');
const paths = ROLES.map(r => r.path);
expect(new Set(paths).size === paths.length, 'no role path is listed twice');
const webNames = ROLES.map(r => r.web).filter(w => w && w.startsWith('--'));
expect(new Set(webNames).size === webNames.length, `no two roles emit the same custom property (${webNames.length} names)`);
expect(ROLES.filter(r => r.kind === 'face').every(r => r.input === r.path.split('.').pop()),
  'every face role names the input it is to face() or type(): its own key');
const natKeys = ROLES.filter(r => r.native).map(r => r.native + (r.input ? '#' + r.input : ''));
expect(new Set(natKeys).size === natKeys.length, `no two roles land on the same native path and input (${natKeys.length})` +
  (new Set(natKeys).size === natKeys.length ? '' : ' — twice: ' + [...new Set(natKeys.filter((k, i) => natKeys.indexOf(k) !== i))].join(', ')));
const uncovered = leaves(V1).filter(([p]) => !paths.some(r => p === r || p.startsWith(r + '.')));
expect(!uncovered.length, `every one of v1's ${leaves(V1).length} values is covered by a role` +
  (uncovered.length ? ' — not: ' + uncovered.map(([p]) => p).join(', ') : ''));
for (const r of ROLES.filter(r => r.alias)) {
  expect(at(V1, r.alias) !== undefined && sideOf(at(V1, r.alias), 'native') === sideOf(at(V1, r.path), 'native'),
    `${r.path} carries the same value as its job's role ${r.alias}`);
}
expect(ROLES.filter(r => r.channel).every(r => r.web.endsWith('-rgb')), 'every channel token is named --*-rgb');
for (const r of ROLES.filter(r => r.ref)) expect(r.native === null && r.ref === 'tint' && typeof at(V1, r.path) === 'string' && at(V1, r.path) in V1.tint,
  `${r.path} names a tint, and lands only through it`);
// The web names. V59 §5 E.1-2 names these tokens for the engine to add, and
// the one-offs among them are not the kebab of their role:
const ONE_OFF = { 'colors.onAccent': '--ink', 'colors.onPlate': '--ink-plate', 'colors.onDone': '--ink-go',
  'colors.accentPressed': '--accent-press', 'chrome.camera': '--video-bg', 'face.web.font': '--font', 'face.web.mono': '--font-mono' };
const PROMPT_NAMES = ['--rack-rgb', '--accent-rgb', '--p-red-rgb', '--p-blue-rgb', '--p-green-rgb', '--p-white-rgb', '--shade-rgb',
  '--lift-rgb', '--ink', '--ink-plate', '--ink-go', '--accent-press', '--on-danger', '--video-bg', '--accent', '--focus', '--font', '--font-mono'];
const MARKERS = new Set(['meta:theme-color', 'meta:apple-mobile-web-app-status-bar-style', '@import', 'color-scheme', 'paint()', 'var()', 'rgb()']);
const colourWebName = k => { const p = 'colors.' + k; return ONE_OFF[p] || '--' + kebab(k); };
function webNameFor(r) {
  if (ONE_OFF[r.path]) return ONE_OFF[r.path];
  const [head, a, b] = r.path.split('.');
  if (head === 'colors') return colourWebName(a);
  if (head === 'web' && a === 'rgb') return ((roleOf('colors.' + b) || {}).web || '--' + kebab(b)) + '-rgb';
  if (head === 'radius') return a === 'r' ? '--r' : '--r-' + kebab(a);
  if (head === 'shadow') return '--shadow-' + kebab(a);
  if (head === 'scrim') return b === 'filter' ? '--blur-' + kebab(a) : a === 'tour' ? '--scrim-tour' : null;
  return null;
}
{
  const wrongName = [];
  for (const r of ROLES.filter(r => r.web)) {
    if (!r.web.startsWith('--')) { if (!MARKERS.has(r.web)) wrongName.push(r.path + ' ' + r.web); continue; }
    if (r.path.startsWith('web.root.')) continue;   // fixed; held to rack.css's :root in D.1
    if (r.web !== webNameFor(r)) wrongName.push(`${r.path} ${r.web} (its path gives ${webNameFor(r)})`);
  }
  expect(!wrongName.length, 'every web name is the one its role\'s path gives it' + (wrongName.length ? ' — not: ' + wrongName.join(', ') : ''));
  const missingNamed = PROMPT_NAMES.filter(n => !webNames.includes(n));
  expect(!missingNamed.length, `every token V59 §5 E.1-2 names is a role's (${PROMPT_NAMES.length})` + (missingNamed.length ? ' — missing: ' + missingNamed.join(', ') : ''));
}
for (const r of ROLES.filter(r => r.kind === 'table')) {
  expect(['paint()', 'var()', 'rgb()'].includes(r.web), `${r.path} lands on the web (${r.web})`);
  const t = at(V1, r.path);
  if (r.web === 'paint()') expect(!!r.follows && Object.values(r.follows).every(v => (roleOf('colors.' + v) || {}).web), `${r.path}: paint() has a var for every role it follows`);
  if (r.web === 'var()') {
    const names = leaves(t).map(([, v]) => v).filter(v => COLOR_KEYS.has(v));
    expect(names.length > 0 && names.every(v => webVarOf(v)), `${r.path}: every role it names has a custom property`);
  }
  if (r.web === 'rgb()') expect(Object.values(t).every(e => e.color in V1.web.rgb), `${r.path}: every role it names has a channel token`);
}
{
  // paint() maps a v1 hex to one role; two tables must never send one hex two ways
  const seen = new Map(), clash = [];
  for (const r of ROLES.filter(x => x.follows)) {
    const t = at(V1, r.path);
    for (const k of Object.keys(r.follows)) {
      const h = String(t[k]).toLowerCase();
      if (seen.has(h) && seen.get(h) !== r.follows[k]) clash.push(`${h}: ${seen.get(h)} and ${r.follows[k]}`);
      seen.set(h, r.follows[k]);
    }
  }
  expect(!clash.length, `paint()'s hex -> role map is one role per hex (${seen.size} hexes)` + (clash.length ? ' — not: ' + clash.join('; ') : ''));
}

/* ================= D ================= */
section('D  v1 is rack-v58 (read at ' + BASE + ')');

// A role's web anchors, as a list; reading one marks it read, and D.15 holds
// that every anchor a role carries was read by some check below.
const atRead = new Set();
const webAt = r => { atRead.add(r.path); const a = r.at.web; return Array.isArray(a) && Array.isArray(a[0]) ? a : [a]; };

// ---- a small CSS reader: every declaration with its rule, file and line ----
function cssDecls(file) {
  const raw = show(file);
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, ' '));
  const lineAt0 = i => src.slice(0, i).split('\n').length;
  const out = [], stack = [];
  let buf = '', bufStart = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') { stack.push(buf.trim().replace(/\s+/g, ' ')); buf = ''; bufStart = i + 1; }
    else if (c === '}' || c === ';') {
      const k = buf.indexOf(':');
      if (k > 0 && stack.length && !stack[stack.length - 1].startsWith('@')) {
        const at0 = bufStart + buf.search(/\S/);
        out.push({ file, line: lineAt0(at0), sel: stack[stack.length - 1], media: stack.slice(0, -1).join(' '),
                   prop: buf.slice(0, k).trim(), val: buf.slice(k + 1).trim() });
      }
      buf = ''; bufStart = i + 1;
      if (c === '}') stack.pop();
    } else buf += c;
  }
  return out;
}
const CSS = [...cssDecls('rack.css'), ...cssDecls('auth.css')];
const decl = (file, sel, prop) => CSS.find(d => d.file === file && d.sel === sel && d.prop === prop && !d.media);
const ROOTV = Object.fromEntries(CSS.filter(d => d.file === 'rack.css' && d.sel === ':root').map(d => [d.prop, d.val]));
const rgbaOf = s => { const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/.exec(s); return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null; };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const norm = h => { h = h.toLowerCase(); return h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h; };
const colourWeb = name => sideOf(V1.colors[name], 'web');

// ---- 1. the 26 :root tokens ----
const rootNames = Object.keys(ROOTV);
expect(rootNames.length === 26, `rack.css :root has the 26 tokens the contract was written against (${rootNames.length})`);
for (const name of rootNames) {
  const r = ROLES.find(x => x.web === name);
  if (!r) { bad(`${name} has no role`); continue; }
  let v = sideOf(at(V1, r.path), 'web');
  if (r.kind === 'radius') v = typeof v === 'number' ? v + 'px' : v;
  expect(v === ROOTV[name], `${name}: ${ROOTV[name]} is ${r.path}`);
}
// ---- 2. split roles copy their source ----
for (const r of ROLES.filter(r => r.from && r.from.web)) {
  expect(ROOTV[r.from.web] === sideOf(at(V1, r.path), 'web'), `${r.path} starts as ${r.from.web} (${ROOTV[r.from.web]})`);
}
for (const r of ROLES.filter(r => r.except)) for (const e of r.except.filter(e => Array.isArray(e.at))) {
  const d = decl(...e.at);
  expect(!!d && d.val === `var(${webVarOf(e.role.replace(/^colors\./, ''))})`,
    `${r.path} except ${e.at.join(' ')}: that declaration spends ${e.role} (${d ? d.val : 'not found'})`);
}
// a colour role's own web sites spend, today, the custom property it starts from
for (const r of ROLES.filter(r => r.path.startsWith('colors.') && r.at && r.at.web)) {
  const want = `var(${(r.from && r.from.web) || r.web})`;
  for (const a of webAt(r)) {
    const d = decl(...a);
    expect(!!d && d.val.includes(want), `${r.path} is ${a.join(' ')}, which spends ${want} today (${d ? d.val : 'not found'})`);
  }
}

// ---- 3. the census: every raw colour literal a renderer sees, and its role ----
/* The scanner: strings in JS/JSON, declaration values in CSS; in HTML the
   attribute values, and each <style> and inline <script> body through the CSS
   and JS branches — comments skipped. rack-mobile's
   tools/verify-vibes-contract.mjs has the JS branch. */
function scanColours(text, file) {
  const colours = s => {
    const out = []; const re = /#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z_-])|\brgba?\(\s*\d[^)]*\)|\bhsla?\(\s*\d[^)]*\)/g; let m;
    while ((m = re.exec(s))) {
      if (m[0][0] === '#' && (![4, 5, 7, 9].includes(m[0].length) || s[m.index - 1] === '&')) continue;
      out.push({ i: m.index, lit: m[0] });
    }
    return out;
  };
  const lineOf = (t, i) => t.slice(0, i).split('\n').length;
  const hits = [];
  if (/\.css$/.test(file)) {
    const src = text.replace(/\/\*[\s\S]*?\*\//g, s => s.replace(/[^\n]/g, ' '));
    let depth = 0, start = -1;
    for (let i = 0; i < src.length; i++) {
      const c = src[i];
      if (c === '{') { depth++; start = i + 1; }
      else if (c === '}' || c === ';') {
        if (depth > 0 && start >= 0) {
          const d = src.slice(start, i), k = d.indexOf(':');
          if (k > 0) {
            const v0 = start + k + 1, val = d.slice(k + 1);
            for (const col of colours(val)) hits.push({ at: v0 + col.i, lit: col.lit });
            for (const m of val.replace(/var\([^)]*\)/g, ' ').matchAll(/[A-Za-z][A-Za-z-]*/g)) if (NAMED.has(m[0].toLowerCase())) hits.push({ at: v0 + m.index, lit: m[0] });
            const ch = val.trim(); if (/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(ch)) hits.push({ at: v0 + val.indexOf(ch), lit: ch });
          }
        }
        if (c === '}') depth--; start = i + 1;
      }
    }
    return hits.map(h => ({ line: lineOf(src, h.at), lit: h.lit })).sort((a, b) => a.line - b.line);
  }
  if (/\.html$/.test(file)) {
    let src = text.replace(/<!--[\s\S]*?-->/g, s => s.replace(/[^\n]/g, ' '));
    const out = [];
    for (const m of src.matchAll(/<(style|script)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)) {
      const body0 = m.index + m[0].indexOf('>') + 1, first = lineOf(src, body0);
      if (m[1].toLowerCase() === 'script' && /\bsrc=/.test(m[2])) continue;
      for (const h of scanColours(m[3], m[1].toLowerCase() === 'style' ? 'body.css' : 'body.js')) out.push({ line: first + h.line - 1, lit: h.lit });
    }
    src = src.replace(/(<(style|script)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, (s, a, b, body, z) => a + body.replace(/[^\n]/g, ' ') + z);
    for (const m of src.matchAll(/\s[a-zA-Z-]+="([^"]*)"/g)) { const v0 = m.index + m[0].indexOf('"') + 1; for (const c of colours(m[1])) out.push({ line: lineOf(src, v0 + c.i), lit: c.lit }); }
    return out.sort((a, b) => a.line - b.line);
  }
  let i = 0; const n = text.length;
  while (i < n) {
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { while (i < n && text[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      const q = c, start = ++i; let body = '';
      while (i < n && text[i] !== q) {
        if (text[i] === '\\') { body += text[i] + (text[i + 1] || ''); i += 2; continue; }
        if (q !== '`' && text[i] === '\n') break;
        if (q === '`' && text[i] === '$' && text[i + 1] === '{') { let depth = 0; while (i < n) { if (text[i] === '{') depth++; else if (text[i] === '}') { depth--; if (depth === 0) { i++; break; } } body += ' '; i++; } continue; }
        body += text[i]; i++;
      }
      i++;
      for (const col of colours(body)) hits.push({ at: start + col.i, lit: col.lit });
      if (NAMED.has(body.toLowerCase())) hits.push({ at: start, lit: body });
      if (/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/.test(body)) hits.push({ at: start, lit: body });
      continue;
    }
    i++;
  }
  return hits.map(h => ({ line: lineOf(text, h.at), lit: h.lit })).sort((a, b) => a.line - b.line);
}

/* Every colour literal in every file the phone loads, at rack-v58, and the
   role it becomes. The pinned pure modules (exercises.js, analytics.js, …) are
   out of scope — their tables are checked below — and so are the three
   deliberate exceptions in EXEMPT. Generated from the scan above and
   classified by hand: accent is the call to action, pYellow the data, warn
   the verdict (V59 §5.2). */
const CENSUS = [
  ['access.js', 315, '#d6252b', 'mark.0'], ['access.js', 315, '#2e7fd9', 'mark.1'], ['access.js', 315, '#f0be1e', 'mark.2'],
  ['access.js', 315, '#2aa85c', 'mark.3'], ['access.js', 315, '#e8e5de', 'mark.4'], ['access.js', 315, '#a8aeb8', 'mark.5'],
  ['access.js', 389, '#d6252b', 'mark.0'], ['access.js', 389, '#2e7fd9', 'mark.1'], ['access.js', 389, '#f0be1e', 'mark.2'],
  ['access.js', 389, '#2aa85c', 'mark.3'], ['access.js', 389, '#e8e5de', 'mark.4'], ['access.js', 389, '#a8aeb8', 'mark.5'],
  ['auth.css', 24, '#141414', 'colors.onAccent'],
  ['auth.css', 134, 'rgba(20,22,26,.55)', 'scrim.tour'],
  ['auth.css', 134, 'rgba(20,22,26,.94)', 'scrim.tour'],
  ['auth.css', 153, 'rgba(0,0,0,.55)', 'shadow.tourCard'],
  ['index.html', 6, '#14161a', 'themeColor'],
  ['index.html', 27, '#d6252b', 'mark.0'], ['index.html', 28, '#2e7fd9', 'mark.1'], ['index.html', 29, '#f0be1e', 'mark.2'],
  ['index.html', 30, '#2aa85c', 'mark.3'], ['index.html', 31, '#e8e5de', 'mark.4'], ['index.html', 32, '#a8aeb8', 'mark.5'],
  ['manifest.json', 9, '#14161a', 'chrome.launch'],          // fixed: an installed PWA reads it once
  ['manifest.json', 10, '#14161a', 'chrome.manifestTheme'],  // fixed
  ['rack.css', 6, '#14161a', 'colors.rack'], ['rack.css', 7, '#1c1f26', 'colors.bar'],
  ['rack.css', 8, '#262a33', 'colors.collar'], ['rack.css', 9, '#333844', 'colors.knurl'],
  ['rack.css', 12, '#f2f0eb', 'colors.chalk'], ['rack.css', 13, '#8d939f', 'colors.steel'],
  ['rack.css', 14, '#5c6270', 'colors.dim'], ['rack.css', 17, '#d6252b', 'colors.pRed'],
  ['rack.css', 18, '#2e7fd9', 'colors.pBlue'], ['rack.css', 19, '#f0be1e', 'colors.pYellow'],
  ['rack.css', 20, '#2aa85c', 'colors.pGreen'], ['rack.css', 21, '#e8e5de', 'colors.pWhite'],
  ['rack.css', 22, '#a8aeb8', 'colors.pChrome'], ['rack.css', 24, '#2aa85c', 'colors.good'],
  ['rack.css', 25, '#f0be1e', 'colors.warn'], ['rack.css', 26, '#d6252b', 'colors.bad'],
  ['rack.css', 121, 'rgba(20,22,26,.82)', 'tint.dockGlass'],        // .dock
  ['rack.css', 204, '#141414', 'colors.onAccent'],                  // .btn-primary
  ['rack.css', 326, 'rgba(0,0,0,.6)', 'tint.backdrop'],             // .sheet-backdrop
  ['rack.css', 377, 'rgba(0,0,0,.45)', 'shadow.peek'],
  ['rack.css', 406, 'rgba(20,22,26,.9)', 'tint.wkBarGlass'],        // .wk-bar
  ['rack.css', 442, 'rgba(0,0,0,.45)', 'shadow.rest'],
  ['rack.css', 473, 'rgba(42,168,92,.07)', 'tint.setDone'],
  ['rack.css', 476, 'rgba(240,190,30,.28)', 'tint.setFlash'],       // @keyframes setFlash 0%
  ['rack.css', 477, 'rgba(42,168,92,.07)', 'tint.setDone'],         // setFlash 100%
  ['rack.css', 486, 'rgba(240,190,30,.16)', 'tint.tagW'],
  ['rack.css', 487, 'rgba(214,37,43,.16)', 'tint.tagF'],
  ['rack.css', 488, 'rgba(46,127,217,.16)', 'tint.tagD'],
  ['rack.css', 509, '#0d1a11', 'colors.onDone'],                    // .set-check.on
  ['rack.css', 526, 'rgba(240,190,30,.14)', 'tint.coachBase'],
  ['rack.css', 530, 'rgba(240,190,30,.07)', 'tint.coachLow'],
  ['rack.css', 531, 'rgba(240,190,30,.38)', 'tint.coachHigh'],
  ['rack.css', 549, 'rgba(46,127,217,.45)', 'tint.dropRail'],
  ['rack.css', 553, 'rgba(46,127,217,.35)', 'tint.dropAdd'],
  ['rack.css', 561, 'rgba(240,190,30,.03)', 'tint.block'],           // .wk-block
  ['rack.css', 597, '#14161a', 'colors.onPlate'],                   // .plate-chip
  ['rack.css', 642, 'rgba(240,190,30,.08)', 'tint.pickSel'],        // .ex-item.sel
  ['rack.css', 658, 'rgba(0,0,0,.5)', 'shadow.toast'],
  ['rack.css', 680, 'rgba(240,190,30,.10)', 'colors.warn'],         // .trial-bar (its ink is --warn)
  ['rack.css', 681, 'rgba(240,190,30,.34)', 'colors.warn'],
  ['rack.css', 729, '#000', 'chrome.camera'],                       // .scan-video
  ['rack.css', 807, '#fff', 'colors.onDanger'],                     // .swipe-del
  ['rack.css', 894, 'rgba(240,190,30,.4)', 'colors.accent'],        // .pr-card
  ['rack.css', 895, 'rgba(240,190,30,.09)', 'colors.accent'],
  ['rack.css', 960, 'rgba(240,190,30,.09)', 'colors.accent'],       // .sess-row.is-pr
  ['rack.css', 1063, 'rgba(46,127,217,.16)', 'tint.zoneCut'],
  ['rack.css', 1064, 'rgba(240,190,30,.18)', 'tint.zoneHold'],
  ['rack.css', 1065, 'rgba(214,37,43,.16)', 'tint.zoneGain'],
  ['rack.css', 1077, 'rgba(20,22,26,.55)', 'shadow.calTick'],
  ['rack.css', 1238, 'rgba(240,190,30,.03)', 'tint.block'],         // .rt-pv-block
  ['rack.css', 1290, 'rgba(240,190,30,.16)', 'colors.accent'],      // .st-flame.on
  ['rack.css', 1291, 'rgba(240,190,30,.35)', 'shadow.flame'],
  ['rack.css', 1398, 'rgba(255,255,255,.04)', 'tint.rowPress'],     // .set-row-nav:active
  ['rack.css', 1439, 'rgba(42,168,92,.45)', 'colors.good'],         // .adm-flag.on
  ['rack.css', 1440, 'rgba(214,37,43,.45)', 'colors.bad'],          // .adm-flag.off
  ['rack.css', 1445, 'rgba(46,127,217,.45)', 'colors.pBlue'],       // .adm-flag.lit
  ['rack.css', 1446, 'rgba(240,190,30,.45)', 'colors.warn'],        // .adm-flag.warn
  ['rack.css', 1453, 'rgba(240,190,30,.32)', 'colors.accent'],      // .install-card
  ['rack.css', 1454, 'rgba(240,190,30,.10)', 'colors.accent'],
  ['rack.css', 1454, 'rgba(240,190,30,0)', 'colors.accent'],
  ['rack.css', 1521, '#141414', 'colors.onAccent'],                 // .fuel-fab
  ['rack.css', 1526, 'rgba(0, 0, 0, .58)', 'shadow.fab'],
  ['rack.css', 1526, 'rgba(0, 0, 0, .35)', 'shadow.fab'],
  ['rack.css', 1535, '#d9a90f', 'colors.accentPressed'],            // .fuel-fab:active
  ['rack.css', 1536, 'rgba(0, 0, 0, .5)', 'shadow.fabPressed'],
  ['rack.css', 1587, 'rgba(240, 190, 30, .42)', 'colors.accent'],   // .add-tile.hero
  ['rack.css', 1588, 'rgba(240, 190, 30, .13)', 'colors.accent'],
  ['rack.css', 1588, 'rgba(240, 190, 30, 0)', 'colors.accent'],
  ['rack.css', 1590, '#141414', 'colors.onAccent'],                 // .add-tile.hero .ic
  ['rack.css', 1592, 'rgba(240, 190, 30, .22)', 'colors.accent'],   // .add-tile.lit
  ['rack.css', 1593, 'rgba(240, 190, 30, .06)', 'colors.accent'],
  ['rack.css', 1593, 'rgba(240, 190, 30, 0)', 'colors.accent'],
  ['rack.css', 1602, 'rgba(240, 190, 30, .32)', 'colors.warn'],     // .ai-warn (its ink is --warn)
  ['rack.css', 1603, 'rgba(240, 190, 30, .07)', 'colors.warn'],
  ['rack.css', 1627, 'rgba(214, 37, 43, .12)', 'colors.danger'],    // .ex-del:active
  ['rack.css', 1712, 'rgba(240, 190, 30, .12)', 'colors.accent'],   // .ex-edit:active
  ['rack.css', 1894, 'rgba(20,22,26,.55)', 'colors.rack'],          // .cal-runway hatching
  ['rack.css', 1895, 'rgba(20,22,26,.7)', 'colors.rack'],
  ['rack.css', 1913, '141,147,159', 'kpi.default'],                 // .kpi --kpi-rgb
  ['rack.css', 1922, 'rgba(255,255,255,.05)', 'tint.pillBase'],
  ['rack.css', 1924, 'rgba(42,168,92,.16)', 'tint.pillUp'],
  ['rack.css', 1925, 'rgba(214,37,43,.16)', 'tint.pillDown'],
  ['rack.css', 1926, 'rgba(240,190,30,.16)', 'tint.pillWarn'],
  ['rack.css', 1959, 'rgba(46,127,217,.45)', 'colors.pBlue'],       // .guide-sw.cut
  ['rack.css', 1960, 'rgba(240,190,30,.45)', 'colors.pYellow'],     // .guide-sw.hold
  ['rack.css', 1961, 'rgba(214,37,43,.45)', 'colors.pRed'],         // .guide-sw.gain
  ['rack.css', 2006, 'rgba(42,168,92,.18)', 'shadow.trajGood'],
  ['rack.css', 2007, 'rgba(240,190,30,.18)', 'shadow.trajWarn'],
  ['rack.css', 2008, 'rgba(214,37,43,.18)', 'shadow.trajBad'],
  ['rack.css', 2023, 'rgba(240,190,30,.07)', 'tint.reviewBg'],      // .review-take
  ['rack.css', 2023, 'rgba(240,190,30,.18)', 'tint.reviewBorder'],
  ['rack.css', 2159, 'rgba(240,190,30,.12)', 'colors.accent'],      // .coach-bub.you
  ['rack.css', 2160, 'rgba(240,190,30,.26)', 'colors.accent'],
  ['rack.css', 2175, 'rgba(240,190,30,.10)', 'colors.accent'],      // .coach-bub.pro
  ['rack.css', 2176, 'rgba(240,190,30,.24)', 'colors.accent'],
  ['rack.css', 2284, 'rgba(240,190,30,.28)', 'colors.accent'],      // .tog.on
  ['workout.js', 1386, '#d6252b', 'plates.0'], ['workout.js', 1386, '#2e7fd9', 'plates.1'],
  ['workout.js', 1386, '#f0be1e', 'plates.2'], ['workout.js', 1387, '#2aa85c', 'plates.3'],
  ['workout.js', 1387, '#e8e5de', 'plates.4'], ['workout.js', 1387, '#a8aeb8', 'plates.5'],
  ['you.js', 868, '240,190,30', 'kpi.fuel'], ['you.js', 877, '240,190,30', 'kpi.weight'],
  ['you.js', 884, '46,127,217', 'kpi.train'], ['you.js', 891, '232,229,222', 'kpi.steps']
];
/* Deliberately NOT tokenised (V59 §5, codemap §9): 404.html is a standalone
   page with its own copy of the tokens (its <style> :root and .btn ink, its
   theme-color and its mark), and store.js's write-refused banner is off-theme
   on purpose — it must be legible whatever the theme is doing. */
const EXEMPT = [
  ['404.html', 6, '#14161a'],
  ['404.html', 12, '#14161a'], ['404.html', 12, '#1c1f26'], ['404.html', 12, '#262a33'],
  ['404.html', 13, '#f2f0eb'], ['404.html', 13, '#8d939f'], ['404.html', 13, '#5c6270'],
  ['404.html', 14, '#d6252b'], ['404.html', 14, '#2e7fd9'], ['404.html', 14, '#f0be1e'],
  ['404.html', 15, '#2aa85c'], ['404.html', 15, '#e8e5de'], ['404.html', 15, '#a8aeb8'],
  ['404.html', 65, '#141414'],
  ['404.html', 91, '#d6252b'], ['404.html', 92, '#2e7fd9'], ['404.html', 93, '#f0be1e'],
  ['404.html', 94, '#2aa85c'], ['404.html', 95, '#e8e5de'], ['404.html', 96, '#a8aeb8'],
  ['store.js', 520, '#7f1d1d'], ['store.js', 520, '#fff'], ['store.js', 522, 'rgba(0,0,0,.45)'],
  ['store.js', 528, '#fff'], ['store.js', 528, '#7f1d1d']
];
const PINNED = ['exercises.js', 'analytics.js', 'tdee.js', 'units.js', 'accounts.js', 'insights.js',
  'estimate-origin.js', 'estimate-ask.js', 'coach.js', 'coach-build.js', 'coach-live.js', 'coach-prog.js',
  'coach-goal.js', 'coach-overlap.js', 'coach-ready.js', 'coach-fuel.js', 'coach-volume.js', 'coach-tags.js'];
const scanned = [];
const baseFiles = execFileSync('git', ['-C', ROOT, 'ls-tree', '--name-only', BASE], { encoding: 'utf8' }).split('\n')
  .filter(f => /^[^/]+\.(js|css|html|json)$/.test(f) && !/^database\.rules/.test(f) && !PINNED.includes(f)).sort();
for (const f of baseFiles) for (const h of scanColours(show(f), f)) scanned.push([f, h.line, h.lit]);
const key = r => r.slice(0, 3).join('|');
const want = [...CENSUS, ...EXEMPT].map(key), got = scanned.map(key);
const missing = got.filter(k => !want.includes(k)), extra = want.filter(k => !got.includes(k));
expect(!missing.length && !extra.length && want.length === got.length,
  `the census is complete: ${got.length} colour literals in ${baseFiles.length} phone-loaded files at ${BASE}, ` +
  `${CENSUS.length} with a role and ${EXEMPT.length} exempt` +
  (missing.length ? ' — no role for: ' + missing.join(', ') : '') + (extra.length ? ' — not in the tree: ' + extra.join(', ') : ''));
function literalMatches(lit, role) {
  const [head] = role.split('.');
  const hex = /^#/.test(lit), rgba = rgbaOf(lit), chan = /^\d/.test(lit) ? lit.split(',').map(Number) : null;
  const colourFor = name => colourWeb(name);
  if (head === 'tint') {
    const t = at(V1, role); return !!rgba && eq(rgba.rgb, hexToRgb(colourFor(t.color))) && near(rgba.a, t.a);
  }
  if (head === 'shadow') return !!rgba && at(V1, role).web.some(l => l.a !== undefined && eq(rgba.rgb, hexToRgb(colourFor(l.color))) && near(rgba.a, l.a));
  if (head === 'scrim') return !!rgba && V1.scrim.tour.stops.some(s => eq(rgba.rgb, hexToRgb(colourFor(s.color))) && near(rgba.a, s.a));
  if (head === 'kpi') return !!chan && eq(chan, hexToRgb(colourFor(at(V1, role).color)));
  let v = at(V1, role);
  if (head === 'mark') v = colourFor(v);
  v = sideOf(v, 'web');
  if (hex) return norm(lit) === norm(v) && (!underLegacy(role + '.web') && !underLegacy(role) || lit === v);
  if (rgba) return eq(rgba.rgb, hexToRgb(v));
  return false;
}
const wrong = CENSUS.filter(([f, n, lit, role]) => !literalMatches(lit, role));
expect(!wrong.length, `every census literal is its role's v1 value (${CENSUS.length})` +
  (wrong.length ? ' — not: ' + wrong.map(r => r.join(' ')).join('; ') : ''));
{
  // Every rgba() literal becomes rgba(var(--<role>-rgb), a), so each colour
  // role one resolves to needs its channel token, in web.rgb and in ROLES.
  // And no channel is carried that nothing spends: an rgba() here, a kpi
  // tint (rgb()), or a name V59 §5 E.1 gives the engine.
  const need = new Map();
  for (const [f, n, lit, role] of CENSUS) {
    if (!/^rgba?\(/.test(lit)) continue;
    const head = role.split('.')[0], v = at(V1, role);
    const cols = head === 'tint' ? [v.color] : head === 'shadow' ? v.web.filter(l => l.a !== undefined).map(l => l.color)
      : head === 'scrim' ? v.stops.map(s => s.color) : head === 'colors' ? [role.slice(7)] : ['(' + role + ' is not a colour)'];
    for (const c of cols) need.set(c, (need.get(c) || []).concat(f + ':' + n));
  }
  const noChannel = [...need.keys()].filter(c => !(c in V1.web.rgb) || !(roleOf('web.rgb.' + c) || {}).channel);
  expect(!noChannel.length, `every colour an rgba() literal becomes has its channel token (${need.size}: ${[...need.keys()].join(', ')})` +
    (noChannel.length ? ' — none for: ' + noChannel.map(c => c + ' (' + need.get(c).join(' ') + ')').join(', ') : ''));
  const kpiCh = new Set(Object.values(V1.kpi).map(k => k.color));
  const unspent = Object.keys(V1.web.rgb).filter(c => !need.has(c) && !kpiCh.has(c) && !PROMPT_NAMES.includes((roleOf('web.rgb.' + c) || {}).web));
  expect(!unspent.length, `every channel token is spent: by an rgba(), a kpi tint, or V59 §5's naming it (${Object.keys(V1.web.rgb).length})` +
    (unspent.length ? ' — not: ' + unspent.join(', ') : ''));
}
// A table the web spends as channel strings today (you.js's --kpi-rgb, .kpi's
// own) is rgb(); one spent as hex or var() strings is not.
for (const r of ROLES.filter(r => r.kind === 'table')) {
  const rows = CENSUS.filter(c => c[3] === r.path || c[3].startsWith(r.path + '.'));
  const chan = rows.length > 0 && rows.every(c => /^\d/.test(c[2]));
  expect((r.web === 'rgb()') === chan, `${r.path} is ${r.web} on the web: rack-v58 spends it as ${chan ? 'channel strings' : rows.length ? 'colours' : 'var() strings or a pinned table'}`);
}
// the tints the web spends are the tints native precomputes, alpha for alpha
for (const [k, t] of Object.entries(V1.tint)) {
  const rows = CENSUS.filter(r => r[3] === 'tint.' + k);
  if (rows.length) ok(`tint.${k} is ${rows.map(r => r[0] + ':' + r[1]).join(', ')} on the web`);
}
// a legacy spelling the web spends reaches its stylesheet verbatim (the
// `exact` and `native` ones are native's spellings of what the web writes its
// own way; rack-mobile's verifier holds those)
{
  const webLegacy = LEGACY_EXACT.filter(L => !/(^|\.)(native|exact)(\.|$)/.test(L))
    .map(L => [L, CENSUS.filter(r => L === r[3] || L.startsWith(r[3] + '.'))]).filter(([, rows]) => rows.length);
  expect(webLegacy.every(([L, rows]) => rows.every(r => r[2] === at(V1, L))) &&
    LEGACY_EXACT.filter(L => /\.web(\.|$)/.test(L)).every(L => webLegacy.some(([x]) => x === L)),
    `every legacy spelling the web spends is its stylesheet's, character for character: ${webLegacy.map(([L]) => L).join(', ')}`);
}

// ---- 4. shadows ----
function shadowLayers(val) {
  if (val.trim() === 'none') return [];
  const parts = []; let depth = 0, cur = '';
  for (const c of val) { if (c === '(') depth++; if (c === ')') depth--; if (c === ',' && !depth) { parts.push(cur); cur = ''; } else cur += c; }
  parts.push(cur);
  return parts.map(p => {
    const toks = p.match(/rgba?\([^)]*\)|var\([^)]*\)|\S+/g);
    const nums = toks.filter(t => /^-?[\d.]+(px)?$/.test(t)).map(t => parseFloat(t));
    const col = toks.find(t => /^(rgba?|var)\(/.test(t));
    return { x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, inset: toks.includes('inset'), col };
  });
}
for (const r of ROLES.filter(r => r.kind === 'shadow')) {
  const [file, sel, prop] = webAt(r)[0];
  const d = decl(file, sel, prop);
  if (!d) { bad(`${r.path}: ${file} ${sel} {${prop}} not found`); continue; }
  const gotL = shadowLayers(d.val), wantL = at(V1, r.path).web;
  const same = gotL.length === wantL.length && gotL.every((g, i) => {
    const w = wantL[i];
    if (g.x !== w.x || g.y !== w.y || g.blur !== w.blur || g.spread !== w.spread || g.inset !== !!w.inset) return false;
    if (/^var\(/.test(g.col)) return w.a === undefined && norm(ROOTV[g.col.slice(4, -1).trim()]) === norm(colourWeb(w.color));
    const c = rgbaOf(g.col); return w.a !== undefined && eq(c.rgb, hexToRgb(colourWeb(w.color))) && near(c.a, w.a);
  });
  expect(same, `${r.path} is ${file} ${sel} {box-shadow: ${d.val}}`);
}
{
  // and the other way: every box-shadow in either stylesheet is one role's
  const claimed = new Map(ROLES.filter(r => r.kind === 'shadow').map(r => [r.at.web.join('|'), r.path]));
  const all = CSS.filter(d => /(^|-)box-shadow$/.test(d.prop));
  const unclaimed = all.filter(d => d.media || !claimed.has([d.file, d.sel, d.prop].join('|')));
  expect(!unclaimed.length && all.length === claimed.size, `every box-shadow in rack.css and auth.css is a shadow role's (${all.length} declarations, ${claimed.size} roles)` +
    (unclaimed.length ? ' — no role: ' + unclaimed.map(d => `${d.file}:${d.line} ${d.sel}`).join(', ') : ''));
}

// ---- 5. scrims and glass ----
const glassSel = new Set();
for (const k of ['sheet', 'dock', 'wkBar']) {
  const s = V1.scrim[k], t = V1.tint[s.tint];
  const ta = webAt(roleOf(`scrim.${k}.tint`))[0], fa = webAt(roleOf(`scrim.${k}.filter`))[0];
  const bg = rgbaOf((decl(...ta) || {}).val || '');
  expect(!!bg && eq(bg.rgb, hexToRgb(colourWeb(t.color))) && near(bg.a, t.a), `scrim.${k}: ${ta.join(' ')} is tint.${s.tint}`);
  expect((decl(...fa) || {}).val === s.filter, `scrim.${k}: ${fa.join(' ')} is '${s.filter}'`);
  // the -webkit- twin is there exactly where webkit says: Safari before 18 reads only it
  const wk = decl(fa[0], fa[1], '-webkit-' + fa[2]);
  expect(typeof s.webkit === 'boolean' && !!wk === s.webkit && (!wk || wk.val === s.filter),
    `scrim.${k}: ${fa[1]} ${s.webkit ? 'has' : 'has no'} -webkit-${fa[2]} twin` + (wk ? ` (${wk.val})` : ''));
  glassSel.add(fa[0] + '|' + fa[1]);
}
{
  // every backdrop-filter, prefixed or not, is one of those three scrims'
  const all = CSS.filter(d => /(^|-)backdrop-filter$/.test(d.prop));
  const stray = all.filter(d => d.media || !glassSel.has(d.file + '|' + d.sel));
  expect(all.length > 0 && !stray.length, `every backdrop-filter in rack.css and auth.css is a scrim's (${all.length})` +
    (stray.length ? ' — not: ' + stray.map(d => `${d.file}:${d.line} ${d.sel}`).join(', ') : ''));
}
{
  const [tf, ts, tp] = webAt(roleOf('scrim.tour'))[0];
  const d = decl(tf, ts, tp);
  const m = d && /^linear-gradient\(([^,]+),\s*(rgba\([^)]*\))\s+([\d.]+)%,\s*(rgba\([^)]*\))\s+([\d.]+)%\)$/.exec(d.val);
  const t = V1.scrim.tour;
  expect(!!m && m[1].trim() === t.dir && [[m[2], m[3]], [m[4], m[5]]].every(([c, p], i) => {
    const x = rgbaOf(c), s = t.stops[i]; return eq(x.rgb, hexToRgb(colourWeb(s.color))) && near(x.a, s.a) && near(+p / 100, s.at);
  }) && t.stops.length === 2, 'scrim.tour is #onboard.ob-tour\'s gradient, stop for stop');
}

// ---- 6. radii ----
const radii = CSS.filter(d => d.prop === 'border-radius');
const count = v => radii.filter(d => d.val === v).length;
const RAD = V1.radius;
const rWeb = v => (typeof v === 'number' ? v + 'px' : v);
for (const [v, n] of [['var(--r-sm)', 33], ['var(--r)', 11], ['999px', 16], ['2px', 15], ['50%', 15], ['3px', 5], ['4px', 5], ['1px', 4]]) {
  expect(count(v) === n, `border-radius: ${v} ×${n}, as v1.js's radius comment says (${count(v)})`);
}
expect(radii.length === 116, `116 border-radius declarations in rack.css + auth.css (${radii.length})`);
const rVals = new Set(Object.values(RAD).map(rWeb));
const unnamed = [];
for (const d of radii) for (const part of d.val.split(/\s+/)) if (part !== '0' && !/^var\(/.test(part) && !rVals.has(part)) unnamed.push(d.file + ':' + d.line + ' ' + part);
expect(!unnamed.length, 'every px and % in every border-radius is a radius role' + (unnamed.length ? ' — not: ' + unnamed.join(', ') : ''));
expect(rWeb(RAD.r) === ROOTV['--r'] && rWeb(RAD.sm) === ROOTV['--r-sm'], 'radius.r and radius.sm are --r and --r-sm');
expect(!!decl('rack.css', '.sheet', 'border-radius') && decl('rack.css', '.sheet', 'border-radius').val === `${RAD.sheet}px ${RAD.sheet}px 0 0`, 'radius.sheet is .sheet\'s top corners');
expect(decl('auth.css', '.badge', 'border-radius').val === rWeb(RAD.badge), 'radius.badge is auth.css .badge');
expect(decl('rack.css', '.add-tile .ic', 'border-radius').val === rWeb(RAD.tile), 'radius.tile is .add-tile .ic');
expect(decl('rack.css', '.set-idx', 'border-radius').val === rWeb(RAD.idx), 'radius.idx is .set-idx');
expect(decl('rack.css', '.coach-bub', 'border-radius').val.startsWith(rWeb(RAD.bubble)), 'radius.bubble is .coach-bub');

// ---- 7. fonts ----
expect(lines('rack.css')[0] === `@import url('${V1.face.web.importUrl}');`, 'rack.css line 1 is the Archivo @import of face.web.importUrl');
for (const k of ['font', 'mono']) {
  const a = webAt(roleOf('face.web.' + k))[0];
  expect((decl(...a) || {}).val === V1.face.web[k], `face.web.${k} is ${a.join(' ')}`);
}
expect((decl('rack.css', '.adm-uid', 'font-family') || {}).val === V1.face.web.mono, 'face.web.mono is .adm-uid\'s font-family too');
const families = new Set(CSS.filter(d => d.prop === 'font-family').map(d => d.val));
expect([...families].every(f => f === 'inherit' || f === V1.face.web.font || f === V1.face.web.mono), 'no other font-family in either stylesheet');

// ---- 8. page chrome ----
const idx = show('index.html');
{
  // themeColor's anchor: [index.html, meta[name=…], content]
  const [f, sel, attr] = webAt(roleOf('themeColor'))[0];
  const name = (/^meta\[name=([\w-]+)\]$/.exec(sel) || [])[1];
  const m = f === 'index.html' && name && new RegExp(`<meta name="${name}" ${attr}="([^"]+)">`).exec(idx);
  expect(!!m && m[1] === V1.themeColor, `themeColor is ${f} ${sel} ${attr} (${m ? m[1] : 'not found'})`);
}
{
  // the fixed launch colours: manifest.json, read once at install
  const man = JSON.parse(show('manifest.json'));
  expect(man.background_color === V1.chrome.launch && man.theme_color === V1.chrome.manifestTheme,
    'chrome.launch is manifest.json background_color and chrome.manifestTheme its theme_color');
  for (const [k, key] of [['launch', 'background_color'], ['manifestTheme', 'theme_color']]) {
    const r = roleOf('chrome.' + k);
    for (const a of webAt(r)) expect(r.fixed === true && typeof a === 'string' && lineAt(a).includes(`"${key}": "${V1.chrome[k]}"`), `chrome.${k} is ${a}, "${key}", fixed`);
  }
}
expect((/<meta name="apple-mobile-web-app-status-bar-style" content="([^"]+)">/.exec(idx) || [])[1] === V1.chrome.webStatusBar, 'chrome.webStatusBar is the status-bar meta');
expect(V1.chrome.colorScheme === null && !CSS.some(d => d.prop === 'color-scheme') && !/name="color-scheme"/.test(idx), 'no color-scheme anywhere, so chrome.colorScheme is null');
expect(norm(decl('rack.css', '.scan-video', 'background').val) === norm(V1.chrome.camera), 'chrome.camera is .scan-video\'s background');

// ---- 9. focus: every colour a :focus rule spends is the focus colour, but the listed ones ----
{
  const focusRole = roleOf('colors.focus');
  const exceptKeys = (focusRole.except || []).filter(e => Array.isArray(e.at)).map(e => e.at.join('|'));
  const focusDecls = CSS.filter(d => /:focus/.test(d.sel) && /var\(--|#|rgba?\(/.test(d.val));
  const off = focusDecls.filter(d => !exceptKeys.includes([d.file, d.sel, d.prop].join('|')) && !d.val.includes(`var(${focusRole.from.web})`));
  expect(focusDecls.length > 0 && !off.length && exceptKeys.every(k => focusDecls.some(d => [d.file, d.sel, d.prop].join('|') === k)),
    `colors.focus is every :focus colour at rack-v58 (${focusDecls.length - exceptKeys.length}), and its ${exceptKeys.length} except the rest` +
    (off.length ? ' — not: ' + off.map(d => `${d.file}:${d.line} ${d.sel} {${d.prop}: ${d.val}}`).join(', ') : ''));
}

// ---- 10. the data tables ----
const src = f => show(f);
const evalLit = s => Function('"use strict"; return (' + s + ');')();
{
  const a = src('analytics.js');
  const pal = evalLit(/const PALETTE = (\{[\s\S]*?\});/.exec(a)[1]);
  const { fallback, ...groups } = V1.groups;
  expect(eq(pal, groups), 'groups is analytics.js PALETTE, key for key, lowercase');
  expect((/PALETTE\[g\] \|\| '(#[0-9a-fA-F]{6})'/.exec(a) || [])[1] === fallback, 'groups.fallback is groupColor()\'s fallback');
  const ex = src('exercises.js');
  const gp = Object.fromEntries([...ex.matchAll(/(\w+):\s*\{\s*label:\s*'[^']*',\s*color:\s*'(#[0-9A-Fa-f]{6})'/g)].map(m => [m[1], m[2]]));
  expect(eq(gp, V1.groupPlates), 'groupPlates is exercises.js GROUPS[g].color, uppercase kept');
  const w = src('workout.js');
  const pl = [.../\nconst PLATES = \[([\s\S]*?)\];/.exec(w)[1].matchAll(/c: '(#[0-9a-fA-F]{6})'/g)].map(m => m[1]);
  expect(eq(pl, V1.plates), 'plates is workout.js PLATES[].c, in order');
  const ig = /const COLORS = (\{[\s\S]*?\});[\s\S]*?COLORS\[g\] \|\| 'var\((--[\w-]+)\)'/.exec(src('importer.js'));
  const igMap = ig && evalLit(ig[1]);
  const { fallback: igFall, ...igGroups } = V1.importGroups;
  expect(!!ig && eq(Object.keys(igMap), Object.keys(igGroups)) && Object.entries(igGroups).every(([k, v]) => igMap[k] === `var(${baseVarOf(v)})`) &&
    ig[2] === baseVarOf(igFall), 'importGroups is importer.js COLORS and its fallback, as rack-v58 spends them');
  const markIdx = [...idx.matchAll(/<i style="background:(#[0-9a-fA-F]{6});animation-delay:\d+ms"><\/i>/g)].map(m => m[1]);
  expect(eq(markIdx, V1.mark.map(colourWeb)), 'mark is index.html\'s .auth-mark, plate for plate');
  const acc = lines('access.js');
  for (const n of [315, 389]) expect(eq([...acc[n - 1].matchAll(/'(#[0-9a-fA-F]{6})'/g)].map(m => m[1]), V1.mark.map(colourWeb)), `mark is access.js:${n}'s gate mark`);
  const you = src('you.js');
  const cs = Object.fromEntries([...you.matchAll(/const C_(\w+)\s*=\s*'var\((--[\w-]+)\)'/g)].map(m => [m[1].toLowerCase(), m[2]]));
  const sc = /const SUBJECT_COLOR = \{([\s\S]*?)\};/.exec(you);
  const scMap = sc && Object.fromEntries([...sc[1].matchAll(/(\w+):\s*(?:C_(\w+)|'var\((--[\w-]+)\)')/g)].map(m => [m[1], m[2] ? cs[m[2].toLowerCase()] : m[3]]));
  const webSubjects = { ...cs, ...scMap };
  const { fallback: subjFall, ...subjects } = V1.subjects;
  expect(eq(Object.keys(webSubjects).sort(), Object.keys(subjects).sort()) && Object.entries(subjects).every(([k, v]) => webSubjects[k] === baseVarOf(v)),
    'subjects is you.js C_* and SUBJECT_COLOR, key for key, `all` included');
  // an unknown subject: every SUBJECT_COLOR lookup in the web's modules falls back the same way
  const looks = baseFiles.filter(f => f.endsWith('.js')).flatMap(f => [...src(f).matchAll(/SUBJECT_COLOR\[[^\]]*\](?:\s*\|\|\s*'([^']*)')?/g)].map(m => [f, m[1]]));
  expect(looks.length > 0 && looks.every(([, fb]) => fb === `var(${baseVarOf(subjFall)})`),
    `subjects.fallback is every SUBJECT_COLOR lookup's || (${looks.length}: ${[...new Set(looks.map(([, fb]) => fb))].join(', ')})`);
  const kp = [...you.matchAll(/color: C_(\w+), rgb: '([\d,]+)'/g)].map(m => [m[1].toLowerCase(), m[2]]);
  expect(kp.length === 4 && kp.every(([k, rgb]) => V1.kpi[k] && V1.kpi[k].color === V1.subjects[k] && hexToRgb(colourWeb(V1.kpi[k].color)).join(',') === rgb),
    'kpi: you.js passes each tile its subject\'s channels');
  expect(eq(Object.keys(V1.kpi).sort(), ['default', ...kp.map(([k]) => k)].sort()), `kpi is .kpi's default and you.js's ${kp.length} tiles, and nothing else`);
  expect(hexToRgb(colourWeb(V1.kpi.default.color)).join(',') === decl('rack.css', '.kpi', '--kpi-rgb').val, 'kpi.default is .kpi\'s own --kpi-rgb');
  const kd = CSS.find(d => d.file === 'rack.css' && d.sel === '.kpi' && d.prop === 'background' && d.val.includes('var(--kpi-rgb)'));
  const kbg = kd && rgbaOf(kd.val.replace('var(--kpi-rgb)', '0,0,0'));
  expect(!!kbg && Object.values(V1.kpi).every(k => near(k.a, kbg.a)), 'every kpi tint is .kpi\'s .14');
  const ad = src('admin.js');
  const split = Object.fromEntries([...ad.matchAll(/\['(\w+)',\s*'[^']*',\s*'var\((--[\w-]+)\)'\]/g)].map(m => [m[1], m[2]]));
  expect(Object.keys(V1.admin.aiSplit).length === Object.keys(split).length && Object.entries(V1.admin.aiSplit).every(([k, v]) => split[k] === baseVarOf(v)), 'admin.aiSplit is admin.js AI_SPLIT');
  const fam = [...ad.matchAll(/\['[^']*',\s*'var\((--[\w-]+)\)',\s*'(?:main|more)'/g)].map(m => m[1]);
  expect(eq(fam, V1.admin.families.map(baseVarOf)), 'admin.families is admin.js FAMILIES, in order');
  expect(eq(evalLit(/const PILL = (\{[^}]*\});/.exec(ad)[1]), V1.admin.pill.web), 'admin.pill.web is admin.js PILL');
  for (const [cls, role] of Object.entries(V1.admin.flag)) {
    const c = decl('rack.css', '.adm-flag.' + cls, 'color'), b = decl('rack.css', '.adm-flag.' + cls, 'border-color');
    const bb = b && rgbaOf(b.val);
    expect(!!c && c.val === `var(${baseVarOf(role)})` && !!bb && eq(bb.rgb, hexToRgb(colourWeb(role))) && near(bb.a, 0.45),
      `admin.flag.${cls} is .adm-flag.${cls}'s ink, and its border at .45`);
  }
  const conf = Object.fromEntries([...src('food.js').matchAll(/(high|medium|low):\s*\['var\((--[\w-]+)\)'/g)].map(m => [m[1], m[2]]));
  expect(Object.entries(V1.conf).every(([k, v]) => conf[k] === baseVarOf(v)), 'conf is food.js CONF');
}

// ---- 11. icons, site by site ----
const svgEls = s => [...s.matchAll(/<(svg|path|circle|rect)\b([^>]*?)\/?>/g)].map(m => ({ tag: m[1], ...Object.fromEntries([...m[2].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map(a => [a[1], a[2]])) }));
const elsMatch = (gotE, icon) => gotE.length === icon.els.length && gotE.every((g, i) => {
  const w = icon.els[i]; if (g.tag !== w.tag) return false;
  return Object.entries(w).filter(([k]) => k !== 'tag').every(([k, v]) => g[k] === String(v)) && Object.keys(g).length === Object.keys(w).length;
});
const svgRootOk = (a, icon, stroke, aria) => a.viewBox === icon.viewBox && a.fill === icon.fill && a.stroke === 'currentColor' &&
  a['stroke-linecap'] === icon.linecap && a['stroke-linejoin'] === icon.linejoin &&
  (stroke === null ? !('stroke-width' in a) : a['stroke-width'] === String(stroke)) && (aria ? a['aria-hidden'] === 'true' : !('aria-hidden' in a));
const cssSize = (sel, size) => { const w = decl('rack.css', sel, 'width'), h = decl('rack.css', sel, 'height'); return !!w && !!h && w.val === size + 'px' && h.val === size + 'px'; };
const food = src('food.js');
const ICON_PATHS = evalLit(/const ICON_PATHS = (\{[\s\S]*?\n\});/.exec(food)[1]);
for (const [k, ds] of Object.entries(ICON_PATHS)) expect(!!IC.icons[k] && eq(IC.icons[k].els, ds.map(d => ({ tag: 'path', d }))), `icons.${k} is food.js ICON_PATHS.${k}`);
const iconFn = /function icon\(name, width\) \{([\s\S]*?)\n\}/.exec(food)[1];
const ICON_DEFAULT = (/'stroke-width': width \|\| '([\d.]+)'/.exec(iconFn) || [])[1];
expect(/viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',/.test(iconFn) && /'stroke-linecap': 'round', 'stroke-linejoin': 'round'/.test(iconFn) &&
  !/aria-hidden/.test(iconFn) && Object.keys(ICON_PATHS).every(k => String(IC.icons[k].stroke) === ICON_DEFAULT),
  `food.js icon() draws ICON_PATHS at ${ICON_DEFAULT} unless told otherwise, with no aria-hidden`);
function innerSvg(file, line) {
  const t = lines(file); let s = '';
  for (let i = line - 1; i < t.length && i < line + 8; i++) { s += t[i] + '\n'; if (/<\/svg>'/.test(t[i])) break; }
  return svgEls([...s.matchAll(/'([^']*)'/g)].map(m => m[1]).join(''));
}
const cu = src('coach-ui.js');
const coachAttrs = fn => Object.fromEntries([...(new RegExp('function ' + fn + '[\\s\\S]*?return s;').exec(cu)[0]).matchAll(/s\.setAttribute\('([\w-]+)', '([^']*)'\)/g)].map(m => [m[1], m[2]]));
{
  const bub = svgEls(/function bubbleIcon[\s\S]*?s\.innerHTML = '([^']*)'/.exec(cu)[1]);
  expect(elsMatch(bub, IC.icons.bubble), 'icons.bubble is bubbleIcon()\'s path');
  const lk = /function lockIcon[\s\S]*?s\.innerHTML = '([^']*)' \+\s*\(pro \? '([^']*)' : '([^']*)'\)/.exec(cu);
  expect(elsMatch(svgEls(lk[1] + lk[3]), IC.icons.lock) && elsMatch(svgEls(lk[1] + lk[2]), IC.icons.unlock), 'icons.lock / unlock are lockIcon(false / true): the shackle is the only difference');
}
for (const [k, site] of Object.entries(IC.sites)) {
  const w = site.web, names = [].concat(site.icon);
  expect(names.length > 0 && names.every(n => n in IC.icons), `sites.${k} names icons that exist (${names.join(', ')})`);
  if (!w) { bad(`sites.${k} has no web side, and every icon site is drawn on the web`); continue; }
  expect(cssSize(w.css, w.size), `sites.${k}: ${w.css} is ${w.size}px square`);
  const ats = [].concat(w.at), file = ats[0].split(':')[0];
  if (file === 'index.html') {
    const m = new RegExp(`data-view="${site.icon}"[\\s\\S]*?(<svg[\\s\\S]*?<\\/svg>)`).exec(idx);
    const els = m ? svgEls(m[1]) : [];
    const sw = decl('rack.css', w.css, 'stroke-width');
    expect(!!m && lineAt(w.at).includes(`data-view="${site.icon}"`) && svgRootOk(els[0], IC.icons[site.icon], null, !!w.ariaHidden) &&
      elsMatch(els.slice(1), IC.icons[site.icon]) && w.strokeFrom === 'css' && !!sw && sw.val === String(w.stroke) && IC.icons[site.icon].stroke === w.stroke,
      `sites.${k}: ${w.at} is the dock's ${site.icon}, path for path, stroked ${w.stroke} by ${w.css}`);
  } else if (/\bicon\((ic|')/.test(lineAt(ats[0]))) {
    const calls = ats.map(a => /\bicon\((ic|'(\w+)')(?:, '([\d.]+)')?\)/.exec(lineAt(a)));
    expect(calls.every(c => !!c && (c[2] ? names.length === 1 && c[2] === names[0] : c[1] === 'ic') && (c[3] || ICON_DEFAULT) === String(w.stroke)) && !w.ariaHidden && !w.strokeFrom,
      `sites.${k}: ${ats.join(', ')} draw${ats.length > 1 ? '' : 's'} ${names.join(' / ')} through icon() at ${w.stroke}`);
  } else if (file === 'coach-ui.js') {
    const fn = names[0] === 'bubble' ? 'bubbleIcon' : 'lockIcon';
    const a = coachAttrs(fn);
    expect(ats.every(s => new RegExp('\\b' + fn + '\\(').test(lineAt(s))) && names.every(n => svgRootOk(a, IC.icons[n], w.stroke, !!w.ariaHidden) && IC.icons[n].stroke === w.stroke),
      `sites.${k}: ${w.at} draws ${fn}() — ${names.join(' / ')} at ${w.stroke}${w.ariaHidden ? ', aria-hidden' : ''}`);
  } else {
    const [f, line] = w.at.split(':');
    const els = innerSvg(f, +line);
    expect(els.length > 1 && svgRootOk(els[0], IC.icons[site.icon], w.stroke, !!w.ariaHidden) && IC.icons[site.icon].stroke === w.stroke && elsMatch(els.slice(1), IC.icons[site.icon]),
      `sites.${k}: ${w.at} draws icons.${site.icon} at ${w.stroke}${w.ariaHidden ? ', aria-hidden' : ''}`);
  }
}
{
  // the add tiles: every icon a tile() call draws, and every icon(ic) that draws one
  const tileIcons = [...new Set([...food.matchAll(/\btile\((?:'[\w-]+'|null),\s*'(\w+)'/g)].map(m => m[1]))].sort();
  expect(eq(tileIcons, [].concat(IC.sites.addTile.icon).sort()), `sites.addTile.icon is every icon a tile() call draws: ${tileIcons.join(', ')}`);
  const icAt = lines('food.js').map((l, i) => /\bicon\(ic\)/.test(l) ? 'food.js:' + (i + 1) : null).filter(Boolean);
  expect(eq(icAt, IC.sites.addTile.web.at), `sites.addTile.web.at is every icon(ic): ${icAt.join(', ')}`);
}
expect(Object.values(IC.icons).every(i => i.viewBox === '0 0 24 24' && i.fill === 'none' && i.linecap === 'round' && i.linejoin === 'round'),
  `all ${Object.keys(IC.icons).length} icons are 24x24, unfilled, round caps and joins`);

// ---- 12. glyphs: the survey is complete ----
/* A small JS lexer: the string and template segments of a source text, with
   absolute offsets, comments skipped and template expressions lexed
   recursively. It is only ever run on the tree at 928a65e, where it finds
   exactly the StringLiteral and TemplateElement ranges @babel/parser finds
   (proven when this was written: 45 files, 15,789 segments, no difference). */
function jsSegments(text, comments = false) {
  const segs = [], n = text.length;
  const KW = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await', 'instanceof']);
  const frames = [{ type: 'code', depth: 0, tpl: false }];
  let i = 0, prev = '';
  while (i < n) {
    const f = frames[frames.length - 1];
    if (f.type === 'tpl') {
      const s = i;
      while (i < n && text[i] !== '`' && !(text[i] === '$' && text[i + 1] === '{')) i += text[i] === '\\' ? 2 : 1;
      segs.push({ kind: 'tpl', start: s, end: i });
      if (text[i] === '`') { frames.pop(); i++; prev = 'val'; continue; }
      frames.push({ type: 'code', depth: 0, tpl: true }); i += 2; prev = 'op'; continue;
    }
    const c = text[i], d = text[i + 1];
    if (c === '/' && d === '/') { const s = i; while (i < n && text[i] !== '\n') i++; if (comments) segs.push({ kind: 'comment', start: s, end: i }); continue; }
    if (c === '/' && d === '*') { const s = i, e = text.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; if (comments) segs.push({ kind: 'comment', start: s, end: i }); continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === "'" || c === '"') {
      const s = ++i;
      while (i < n && text[i] !== c && text[i] !== '\n') i += text[i] === '\\' ? 2 : 1;
      segs.push({ kind: 'str', start: s, end: i }); i++; prev = 'val'; continue;
    }
    if (c === '`') { frames.push({ type: 'tpl' }); i++; continue; }
    if (c === '/') {
      if (prev === '' || prev === 'op' || prev === 'kw') {
        const s = ++i; let cls = false;
        while (i < n && text[i] !== '\n') {
          if (text[i] === '\\') { i += 2; continue; }
          if (text[i] === '[') cls = true; else if (text[i] === ']') cls = false;
          else if (text[i] === '/' && !cls) break;
          i++;
        }
        segs.push({ kind: 're', start: s, end: i }); i++;
        while (i < n && /[a-z]/i.test(text[i])) i++;
        prev = 'val'; continue;
      }
      i++; prev = 'op'; continue;
    }
    if (c === '{') { f.depth++; i++; prev = 'op'; continue; }
    if (c === '}') {
      if (f.tpl && f.depth === 0) { frames.pop(); i++; continue; }
      f.depth--; i++; prev = 'op'; continue;
    }
    if (/[A-Za-z_$0-9]/.test(c)) {
      const s = i; while (i < n && /[A-Za-z_$0-9]/.test(text[i])) i++;
      prev = KW.has(text.slice(s, i)) ? 'kw' : 'val'; continue;
    }
    if (c === ')' || c === ']') { i++; prev = 'val'; continue; }
    i++; prev = 'op';
  }
  return segs;
}
// A source text with its comments, strings, template text and regex bodies
// blanked (newlines kept): what is left is code.
function codeOnly(text) {
  const out = text.split('');
  for (const s of jsSegments(text, true)) for (let i = s.start; i < s.end; i++) if (out[i] !== '\n') out[i] = ' ';
  return out.join('');
}
const ENT = { lsaquo: '‹', rsaquo: '›', times: '×', minus: '−', rarr: '→', uarr: '↑', darr: '↓', check: '✓' };
const decode = s => s.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|&#x([0-9a-fA-F]+);|&#(\d+);|&([a-z]+);/g,
  (m, a, b, c, d, e) => a || b || c ? String.fromCodePoint(parseInt(a || b || c, 16)) : d ? String.fromCodePoint(+d) : (ENT[e] || m));
/* Every line of code text in the web's own modules and index.html — strings,
   templates, HTML text and attribute values; not comments, not the pinned
   pure modules, not the standalone 404.html — with Unicode escapes and HTML
   entities (food.js:1127's minus, admin.js:1562's &#8249;) decoded. */
const TEXT_FILES = baseFiles.filter(f => /\.js$/.test(f) || f === 'index.html');
const textLines = [];   // [file, line, decoded text]
for (const f of TEXT_FILES) {
  const t = show(f);
  let ranges;
  if (f.endsWith('.html')) {
    const s = t.replace(/<!--[\s\S]*?-->/g, x => x.replace(/[^\n]/g, ' '));
    ranges = [...[...s.matchAll(/>([^<]+)</g)].map(m => [m.index + 1, m.index + 1 + m[1].length]),
              ...[...s.matchAll(/="([^"]*)"/g)].map(m => [m.index + 2, m.index + 2 + m[1].length])];
  } else ranges = jsSegments(t).filter(s => s.kind !== 're').map(s => [s.start, s.end]);
  const starts = [0]; for (let i = 0; i < t.length; i++) if (t[i] === '\n') starts.push(i + 1);
  const lineOf = i => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= i) lo = m; else hi = m - 1; } return lo + 1; };
  for (const [s, e] of ranges) { let off = s; for (const part of t.slice(s, e).split('\n')) { textLines.push([f, lineOf(off), decode(part)]); off += part.length + 1; } }
}
{
  const listed = new Map();   // 'file:line|char' -> where
  const add = (s, ch, where) => listed.set(s + '|' + ch, (listed.get(s + '|' + ch) || []).concat(where));
  for (const [k, g] of Object.entries(IC.glyphs)) for (const s of g.web) add(s, g.char, 'glyphs.' + k);
  for (const [ch, g] of Object.entries(IC.prose)) for (const s of g.web) add(s, ch, 'prose ' + ch);
  const CHARS = [...new Set([...Object.values(IC.glyphs).map(g => g.char), ...Object.keys(IC.prose)])].filter(c => c !== '+');
  const found = new Set();
  for (const [f, n, t] of textLines) for (const ch of CHARS) if (t.includes(ch)) found.add(`${f}:${n}|${ch}`);
  // '+' is ASCII, a sign and an operator: only a glyph-only button is surveyed — el(tag, class, '+')
  for (const f of TEXT_FILES.filter(x => x.endsWith('.js'))) lines(f).forEach((l, i) => { if (/\bel\('\w+',\s*(?:'[^']*'|null),\s*'\+'\)/.test(l)) found.add(`${f}:${i + 1}|+`); });
  const unlisted = [...found].filter(k => !listed.has(k));
  const stale = [...listed.keys()].filter(k => !found.has(k));
  const twice = [...listed.entries()].filter(([, w]) => w.length > 1).map(([k, w]) => k + ' ' + w.join(' + '));
  expect(!unlisted.length && !stale.length && !twice.length,
    `the web glyph survey is complete: ${found.size} glyph and prose sites in ${TEXT_FILES.length} files, each listed once` +
    (unlisted.length ? ' — not listed: ' + unlisted.join(', ') : '') + (stale.length ? ' — listed but not there: ' + stale.join(', ') : '') +
    (twice.length ? ' — listed twice: ' + twice.join(', ') : ''));
}

// ---- 12b. the icon sites: the list is complete ----
{
  /* Every place the web draws an icon at rack-v58: an <svg> in index.html's
     markup or in a JS string (innerHTML), and every call of food.js icon()
     or coach-ui.js bubbleIcon() / lockIcon() — definitions aside, read on
     the code alone. An <svg> literal belongs to the site anchored on its line
     or the line before (the button, the innerHTML assignment). Each must be
     a site's, and each site's `at` must be one of them. */
  const drawn = [];
  idx.replace(/<!--[\s\S]*?-->/g, s => s.replace(/[^\n]/g, ' ')).split('\n').forEach((l, i) => { if (/<svg\b/.test(l)) drawn.push(['index.html', i + 1, 'svg']); });
  for (const [f, n, t] of textLines) if (f.endsWith('.js') && /<svg\b/.test(t)) drawn.push([f, n, 'svg']);
  for (const f of TEXT_FILES.filter(x => x.endsWith('.js'))) {
    codeOnly(show(f)).split('\n').forEach((l, i) => {
      for (const m of l.matchAll(/(?<![\w$.])(icon|bubbleIcon|lockIcon)\s*\(/g)) if (!/\bfunction\s+$/.test(l.slice(0, m.index))) drawn.push([f, i + 1, m[1]]);
    });
  }
  const siteAts = Object.entries(IC.sites).flatMap(([k, s]) => (s.web ? [].concat(s.web.at) : []).map(a => [k, a]));
  const claims = ([f, n, kind]) => siteAts.filter(([, a]) => a === `${f}:${n}` || (kind === 'svg' && a === `${f}:${n - 1}`));
  const unlisted = drawn.filter(d => claims(d).length !== 1);
  const stale = siteAts.filter(([, a]) => !drawn.some(d => claims(d).some(([, x]) => x === a)));
  expect(drawn.length > 0 && !unlisted.length && !stale.length,
    `every web icon site is listed once: ${drawn.length} draws (${drawn.filter(d => d[2] === 'svg').length} <svg>, ` +
    `${drawn.filter(d => d[2] !== 'svg').length} calls), ${siteAts.length} anchors` +
    (unlisted.length ? ' — not listed once: ' + unlisted.map(d => d[0] + ':' + d[1] + ' ' + d[2]).join(', ') : '') +
    (stale.length ? ' — listed but drawing nothing: ' + stale.map(([k, a]) => k + ' ' + a).join(', ') : ''));
}

// ---- 13. the hues the copy names ----
{
  // a hue as a word: not inside a name like --p-yellow, p-green or white-space
  const HUE = /(?<![\w-])(red|blue|yellow|green|amber|grey|gray|white|orange|black|purple|pink|brown|gold|golden|silver|teal|violet)(?![\w-])/gi;
  const found = new Set();
  for (const [f, n, t] of textLines) for (const m of t.matchAll(HUE)) found.add(`${f}:${n}|${m[1].toLowerCase()}`);
  const listed = new Map();
  for (const h of HUE_NAMED) for (const s of h.web) { const k = s + '|' + h.hue; listed.set(k, (listed.get(k) || []).concat(h.role)); }
  const unlisted = [...found].filter(k => !listed.has(k)), stale = [...listed.keys()].filter(k => !found.has(k));
  const twice = [...listed.entries()].filter(([, r]) => r.length > 1).map(([k, r]) => k + ' ' + r.join(' + '));
  expect(!unlisted.length && !stale.length && !twice.length,
    `every hue the web's copy names is listed with its role (${found.size} sites, ${HUE_NAMED.length} roles)` +
    (unlisted.length ? ' — not listed: ' + unlisted.join(', ') : '') + (stale.length ? ' — listed but not there: ' + stale.join(', ') : '') +
    (twice.length ? ' — listed twice: ' + twice.join(', ') : ''));
}

// ---- 14. what the pinned modules paint ----
{
  /* Every var() string in the pinned web modules at rack-v58 is one
     PINNED_PAINT entry: the custom property it names is its role's own, the
     function it sits in is `fn`, and `reach` says whether an option reaches
     it. For a default, `takenBy` is exactly the web calls that take it. */
  const found = [];
  for (const f of PINNED) {
    const t = show(f), starts = [0];
    for (let i = 0; i < t.length; i++) if (t[i] === '\n') starts.push(i + 1);
    const lineOf0 = i => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= i) lo = m; else hi = m - 1; } return lo + 1; };
    for (const s of jsSegments(t).filter(x => x.kind === 'str' || x.kind === 'tpl')) {
      for (const m of t.slice(s.start, s.end).matchAll(/var\((--[\w-]+)\)/g)) found.push(`${f}:${lineOf0(s.start + m.index)}|${m[1]}`);
    }
  }
  const PP = I.PINNED_PAINT, listed = PP.map(p => p.web + '|' + p.spends);
  const unlisted = found.filter(k => listed.filter(x => x === k).length !== 1), stale = listed.filter(k => !found.includes(k));
  expect(!unlisted.length && !stale.length && found.length === listed.length,
    `every var() the pinned modules paint is one PINNED_PAINT entry (${found.length})` +
    (unlisted.length ? ' — not listed once: ' + unlisted.join(', ') : '') + (stale.length ? ' — listed but not there: ' + stale.join(', ') : ''));
  // the web calls of a pinned chart function: files that import it from analytics.js, its opts argument's text
  const callsOf = fn => {
    const out = [];
    for (const f of TEXT_FILES.filter(x => x.endsWith('.js'))) {
      const t = show(f), code = codeOnly(t);
      const imp = /import\s*\{([^}]*)\}\s*from\s*'\.\/analytics\.js'/.exec(t);
      if (!imp || !imp[1].split(',').map(s => s.trim()).includes(fn)) continue;
      for (const m of code.matchAll(new RegExp(`(?<![\\w$.])${fn}\\s*\\(`, 'g'))) {
        if (/\bfunction\s+$/.test(code.slice(Math.max(0, m.index - 12), m.index))) continue;
        const args = []; let depth = 0, cur = '', i = m.index + m[0].length;
        for (; i < t.length; i++) {
          const c = code[i];
          if ('([{'.includes(c)) depth++;
          if (')]}'.includes(c)) { if (depth === 0) break; depth--; }
          if (c === ',' && depth === 0) { args.push(cur); cur = ''; } else cur += t[i];
        }
        args.push(cur);
        out.push({ at: `${f}:${t.slice(0, m.index).split('\n').length}`, opts: args[1] === undefined ? null : args[1].trim() });
      }
    }
    return out;
  };
  const has = (opts, key) => new RegExp(`(?<![\\w$])${key}\\s*[:,}]`).test(opts);
  for (const p of PP) {
    const r = roleOf(p.role), line = lineAt(p.web);
    const fnAt = lines(p.web.split(':')[0]).slice(0, +p.web.split(':')[1]).reverse().find(l => /^export function \w+/.test(l));
    const isDefault = p.opt ? new RegExp(`(?<![\\w$])${p.opt}\\s*=\\s*'var\\(${p.spends}\\)'`).test(line) : false;
    let ok = !!r && r.kind === 'color' && r.web === p.spends && !r.from && !!fnAt && fnAt.startsWith(`export function ${p.fn}(`) &&
      (p.reach === 'fixed' ? !p.opt && !/=\s*'var\(/.test(line) : p.reach === 'default' && isDefault);
    let taken = [];
    if (ok && p.reach === 'default') {
      const calls = callsOf(p.fn);
      // an opts that is not an object literal cannot be read here, so it fails rather than guess
      ok = calls.length > 0 && calls.every(c => c.opts === null || c.opts.startsWith('{'));
      taken = calls.filter(c => c.opts === null || (!has(c.opts, p.opt) && (!p.when || has(c.opts, p.when)))).map(c => c.at);
      ok = ok && eq(taken, p.takenBy);
    }
    expect(ok, `PINNED_PAINT ${p.web} ${p.fn}() ${p.spends}: ${p.role}'s own property, reach ${p.reach}` +
      (p.reach === 'default' ? `, taken by ${taken.length ? taken.join(', ') : 'no call'}` : ''));
  }
}

// ---- 15. every anchor is read ----
{
  const unread = ROLES.filter(r => r.at && r.at.web && !atRead.has(r.path)).map(r => r.path);
  expect(!unread.length, `every role's web \`at\` is read by a check above (${ROLES.filter(r => r.at && r.at.web).length})` +
    (unread.length ? ' — not: ' + unread.join(', ') : ''));
}

/* ================= E ================= */
section('E  the registry');
expect(I.VIBES[0].id === 'v1' && eq(I.IDS, I.VIBES.map(v => v.id)), 'v1 is first, and IDS is the registry\'s ids in order');
const meta = ['id', 'name', 'feel', 'experimental', 'scheme'];
expect(I.VIBES.every(v => eq(Object.keys(v), meta) && eq(meta.map(k => v[k]), meta.map(k => defs[v.id][k]))), 'each registry entry is its definition\'s id, name, feel, experimental and scheme');
expect(eq(I.RESERVED, ['defs', 'icons']), 'defs and icons are reserved folder names');
for (const [x, want] of [[undefined, 'v1'], [null, 'v1'], ['', 'v1'], ['V1', 'v1'], [' v1', 'v1'], ['v1 ', 'v1'], ['nope', 'v1'],
  ['defs', 'v1'], ['icons', 'v1'], [42, 'v1'], [{}, 'v1'], [['v1'], 'v1'], ['v1', 'v1'], ['a'.repeat(33), 'v1'],
  // well-formed but unregistered (the ones a later phase registers drop out of this list)
  ...['v2', 'iron-age', 'paper', 'zz-unregistered'].filter(x => !I.IDS.includes(x)).map(x => [x, 'v1'])]) {
  let gotV; try { gotV = I.normVibe(x); } catch (e) { gotV = 'THREW ' + e.message; }
  expect(gotV === want, `normVibe(${JSON.stringify(x) === undefined ? 'undefined' : JSON.stringify(x).slice(0, 40)}) is ${want}`);
}
for (const id of I.IDS) expect(I.normVibe(id) === id, `normVibe('${id}') is itself: ${id} is registered`);
{
  /* With only v1 registered, every answer above is also DEFAULT, so a
     normVibe that ignored its argument, or lower-cased it, would pass them
     all. So the same index.js, with one more vibe appended to VIBES, is
     loaded from a scratch copy: a registered id must come back as itself,
     and only that exact spelling of it. */
  const text = readFileSync(join(DEFS, 'vibes/defs/index.js'), 'utf8');
  const probeText = text.replace(/(export const VIBES = deepFreeze\(\[[\s\S]*?)(\n\]\);)/,
    "$1,\n  { id: 'zz-probe', name: 'probe', feel: 'probe', experimental: false, scheme: 'light' }$2");
  if (probeText === text) bad('index.js: the VIBES literal the probe appends to is not where it was');
  else {
    const dir = mkdtempSync(join(tmpdir(), 'rack-vibes-probe-'));
    let P;
    try { writeFileSync(join(dir, 'index.mjs'), probeText); P = await import(pathToFileURL(join(dir, 'index.mjs')).href); }
    finally { rmSync(dir, { recursive: true, force: true }); }
    for (const [x, want] of [['zz-probe', 'zz-probe'], ['v1', 'v1'], ['ZZ-PROBE', 'v1'], ['Zz-probe', 'v1'], [' zz-probe', 'v1'],
      ['zz-probe ', 'v1'], ['zz-probe2', 'v1'], ['zz', 'v1'], [undefined, 'v1']]) {
      let g; try { g = P.normVibe(x); } catch (e) { g = 'THREW ' + e.message; }
      expect(g === want, `with zz-probe registered, normVibe(${x === undefined ? 'undefined' : JSON.stringify(x)}) is ${want}`);
    }
    expect(eq(P.IDS, [...I.IDS, 'zz-probe']) && eq(P.list().map(v => v.id), [...I.IDS, 'zz-probe']), 'with zz-probe registered, IDS and list() are the registry, then zz-probe');
  }
}
for (const [x, want] of [['v1', true], ['iron-age', true], ['a', true], ['9lives', true], ['a'.repeat(32), true], ['a'.repeat(33), false],
  ['-a', false], ['A', false], ['a_b', false], ['a b', false], ['defs', false], ['icons', false], ['', false], [7, false], [null, false]]) {
  expect(I.validId(x) === want, `validId(${JSON.stringify(x).slice(0, 40)}) is ${want}`);
}
const l1 = I.list(); l1[0].name = 'changed'; l1.reverse();
expect(eq(I.list().map(v => v.id), I.IDS) && I.list()[0].name === 'v1', 'list() is the registry in order, and a caller cannot change it');
for (const [x, want] of [['#f0be1e', [240, 190, 30]], ['#D6252B', [214, 37, 43]], ['#000000', [0, 0, 0]], ['#ffffff', [255, 255, 255]],
  ['#fff', null], ['#000', null], ['f0be1e', null], ['#f0be1', null], ['#f0be1e0', null], ['#gggggg', null], ['rgba(0,0,0,.5)', null],
  ['accent', null], [undefined, null], [null, null], [240, null], [' #f0be1e', null], ['#f0be1e ', null], ['#f0be1e\n', null]]) {
  let gotV; try { gotV = I.hexToRgb(x); } catch (e) { gotV = 'THREW'; }
  expect(eq(gotV, want), `hexToRgb(${JSON.stringify(x)}) is ${JSON.stringify(want)}`);
}
expect(I.at(V1, 'tint.setDone.a') === 0.07 && I.at(V1, 'plates.2') === '#f0be1e' && I.at(V1, 'nope.nothing') === undefined, 'at() walks a dot path');
expect(['constructor', 'toString', '__proto__', 'hasOwnProperty', 'colors.constructor', 'plates.map'].every(p => I.at(V1, p) === undefined),
  'at() reads own properties only: an inherited name is not a role');
expect(sideOf(V1.colors.onDanger, 'web') === '#fff' && sideOf(V1.colors.onDanger, 'native') === '#ffffff' && sideOf(V1.colors.rack, 'web') === '#14161a',
  'sideOf() splits a { web, native } value and passes anything else through');
{
  // nothing a caller does to an export changes what the next caller is told
  const deepFrozen = o => !o || typeof o !== 'object' || (Object.isFrozen(o) && Object.values(o).every(deepFrozen));
  expect([I.VIBES, I.IDS, I.RESERVED, I.ROLES, I.LEGACY_EXACT, I.HUE_NAMED, I.PINNED_PAINT].every(deepFrozen),
    'VIBES, IDS, RESERVED, ROLES, LEGACY_EXACT, HUE_NAMED and PINNED_PAINT are frozen all the way down');
  const before = V1.colors.rack;
  try { V1.colors.rack = '#ffffff'; } catch { /* frozen: a module's write throws */ }
  expect(V1.colors.rack === before, 'a caller that writes into v1 changes nothing for the next');
  const tries = [() => I.IDS.push('nope'), () => { I.RESERVED.length = 0; }, () => { I.VIBES[0].name = 'poisoned'; },
    () => { I.ROLES[0].web = '--x'; }, () => { I.LEGACY_EXACT.pop(); }];
  for (const t of tries) { try { t(); } catch { /* strict mode throws on a frozen write; either way it must not land */ } }
  expect(I.normVibe('nope') === 'v1' && I.validId('defs') === false && I.list()[0].name === 'v1' && I.ROLES[0].web === null &&
    I.LEGACY_EXACT.length === 22, 'a caller that pushes an id, empties RESERVED, renames v1 or edits ROLES changes nothing');
}

/* ================= F ================= */
section('F  the component vocabulary (vocab.js): well-formed, and v1 names every block\'s v1');
{
  /* vocab.js is data, like v1.js: the blocks a vibe may re-draw, the looks
     each accepts by name, and the params a look reads. Nothing in it can move
     a v1 pixel, because v1 names 'v1' in every block and holds no param —
     which is what the last checks here hold. The same checks run in
     rack-mobile's tools/verify-vibes-contract.mjs on the same bytes. */
  const VOC = (await import(pathToFileURL(join(DEFS, 'vibes/defs/vocab.js')).href)).default;
  const str = s => typeof s === 'string' && s.trim().length > 0;
  const strs = (a, min = 0) => Array.isArray(a) && a.length >= min && a.every(str);
  const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const WORD = /^[a-z][A-Za-z0-9]*$/;
  expect(eq(Object.keys(VOC), ['version', 'grades', 'allowed', 'rules', 'params', 'blocks']) && VOC.version === 1,
    'vocab.js is { version: 1, grades, allowed, rules, params, blocks }');
  expect(isDeepFrozen(VOC), 'vocab.js is frozen all the way down');
  const GRADES = Object.keys(VOC.grades);
  expect(eq(GRADES, ['v1', 'shape', 'deep']) && Object.values(VOC.grades).every(str), 'its grades are v1, shape and deep, each described');
  expect(isObj(VOC.allowed) && Object.keys(VOC.allowed).length > 0 &&
    Object.values(VOC.allowed).every(a => strs(a, 1) && a[0] === 'v1' && a.every(g => GRADES.includes(g)) && new Set(a).size === a.length),
    'every class of vibe may name v1, and only grades that exist (' + Object.keys(VOC.allowed).join(', ') + ')');
  expect(strs(VOC.rules, 1), `its rules (${VOC.rules.length}) are each a sentence`);
  // the params: every key a look reads, with its default; a colour names a colour role
  const P = VOC.params;
  const PARAM_SHAPE = { rule: ['ink', 'hair', 'head', 'place'], leader: ['ink', 'dot', 'pitch', 'min'], band: ['fill', 'ink', 'height'],
    gutter: null, keyline: ['ink', 'width'] };
  const COLOUR_PARAM = k => k === 'ink' || k === 'fill';
  const paramOk = (k, v, dflt) => {
    if (COLOUR_PARAM(k)) return typeof v === 'string' && COLOR_KEYS.has(v);
    if (k === 'place') return v === 'above' || v === 'below';
    if (Array.isArray(dflt)) return Array.isArray(v) && v.length > 0 && v.every(n => typeof n === 'number' && n > 0);
    return typeof v === 'number' && v > 0;
  };
  const paramBad = [];
  expect(eq(Object.keys(P), Object.keys(PARAM_SHAPE)), 'its params are rule, leader, band, gutter and keyline');
  for (const [k, sub] of Object.entries(PARAM_SHAPE)) {
    if (sub === null) { if (!paramOk(k, P[k], P[k])) paramBad.push(k); continue; }
    if (!isObj(P[k]) || !eq(Object.keys(P[k]), sub)) { paramBad.push(k + ' (keys)'); continue; }
    for (const s of sub) if (!paramOk(s, P[k][s], P[k][s])) paramBad.push(k + '.' + s);
  }
  expect(!paramBad.length, 'every param default is a positive number, a list of them, above/below, or a colour role v1 defines' +
    (paramBad.length ? ' — not: ' + paramBad.join(', ') : ''));
  // the blocks
  const BLOCKS = Object.keys(VOC.blocks);
  const sameSet = (a, b) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');
  expect(sameSet(BLOCKS, VARIANT_KEYS), `its ${BLOCKS.length} blocks are index.js ROLES' ${VARIANT_KEYS.length} variant blocks, and no other`);
  const BLOCK_KEYS = ['label', 'web', 'native', 'switches', 'add', 'slots', 'reads', 'type', 'variants', 'v1', 'looks', 'keeps'];
  const shapeBad = [], lookBad = [], readBad = [], siteBad = [];
  for (const [b, B] of Object.entries(VOC.blocks)) {
    if (!eq(Object.keys(B), BLOCK_KEYS) || !str(B.label) || !strs(B.web, 1) || !strs(B.native, 1) || !strs(B.keeps, 1) ||
        !strs(B.switches) || !strs(B.add) || !strs(B.slots) || !strs(B.reads, 1) || !strs(B.type)) { shapeBad.push(b); continue; }
    const v = B.variants;
    if (!strs(v, 2) || v[0] !== 'v1' || B.v1 !== 'v1' || new Set(v).size !== v.length || !v.every(n => WORD.test(n)) || !eq(Object.keys(B.looks), v)) lookBad.push(b + ' (names)');
    else for (const n of v) {
      const L = B.looks[n];
      const okL = n === 'v1' ? eq(Object.keys(L), ['grade', 'look']) && L.grade === 'v1' && str(L.look)
        : eq(Object.keys(L), ['grade', 'look', 'for']) && L.grade !== 'v1' && GRADES.includes(L.grade) && str(L.look) && strs(L.for);
      if (!okL) lookBad.push(b + '.' + n);
    }
    for (const r of B.reads) if (at(V1, r) === undefined) readBad.push(b + ' ' + r);
    if (!(B.switches.length + B.add.length)) siteBad.push(b);
  }
  expect(!shapeBad.length, 'every block is { ' + BLOCK_KEYS.join(', ') + ' }, each list of words, the web, native, reads and keeps lists never empty' +
    (shapeBad.length ? ' — not: ' + shapeBad.join(', ') : ''));
  expect(!lookBad.length, 'every block accepts \'v1\' first and at least one other look, each a plain word, each described with its grade — ' +
    'v1 graded v1, every other look shape or deep, with the directions that ask for it' + (lookBad.length ? ' — not: ' + lookBad.join(', ') : ''));
  expect(!readBad.length, 'every role a block says it reads resolves in v1' + (readBad.length ? ' — not: ' + readBad.join(', ') : ''));
  expect(!siteBad.length, 'every block names where it branches on native: a switch that exists, or one to open' + (siteBad.length ? ' — not: ' + siteBad.join(', ') : ''));
  const slots = Object.values(VOC.blocks).flatMap(B => B.slots);
  expect(slots.length === 7 && new Set(slots).size === 7, 'the seven hero slots (V59 §11) are each carried by exactly one block: ' + slots.join(', '));
  // v1, and every definition, against it
  expect(sameSet(Object.keys(V1.variants), BLOCKS) && BLOCKS.every(b => V1.variants[b] === VOC.blocks[b].v1 && V1.variants[b] === 'v1'),
    `v1 names every one of the ${BLOCKS.length} blocks, each its 'v1' look, and no block the vocabulary lacks`);
  expect(isObj(V1.shape) && Object.keys(V1.shape).length === 0, 'v1 holds no shape param: it names no look, so it reads none');
  for (const [id, def] of Object.entries(defs)) {
    const off = Object.entries(def.variants || {}).filter(([b, n]) => !VOC.blocks[b] || !VOC.blocks[b].variants.includes(n)).map(([b, n]) => b + '=' + n);
    expect(isObj(def.variants) && !off.length, `${id}: every look it names is one its block accepts` + (off.length ? ' — not: ' + off.join(', ') : ''));
    const S = def.shape, sBad = [];
    if (!isObj(S)) sBad.push('(not an object)');
    else for (const [k, v] of Object.entries(S)) {
      if (!(k in P)) { sBad.push(k); continue; }
      if (isObj(P[k])) {
        if (!isObj(v)) { sBad.push(k); continue; }
        for (const [s, sv] of Object.entries(v)) if (!(s in P[k]) || !paramOk(s, sv, P[k][s])) sBad.push(k + '.' + s);
      } else if (!paramOk(k, v, P[k])) sBad.push(k);
    }
    expect(!sBad.length, `${id}: its shape sets only params the vocabulary has, each of its default's kind, a colour as a role it defines` +
      (sBad.length ? ' — not: ' + sBad.join(', ') : ''));
  }
}

console.log('\n' + (fails.length ? `${fails.length} of ${checks} checks failed.`
  : `All checks passed. ${checks} checks. v1 is rack-v58: ${ROLES.length} roles, ${CENSUS.length} colour literals, ${Object.keys(IC.icons).length} icons.`));
process.exit(fails.length ? 1 : 0);
