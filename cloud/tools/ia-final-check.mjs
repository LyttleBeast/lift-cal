// Iron Age final spec (Phase D): the checks the orchestrator asked for, run on
// the pure definition and the icon set as written. Read-only; prints a report
// and exits 1 on any hard failure.
//
//   node ia-final-check.mjs
//
// 1. Shape: every leaf key path of v1.js is present in iron-age.js (a v1
//    legacy-exact path is skipped; a v1 { web, native } split may be one
//    value), meta set, experimental false, all colour strings 6-digit hex, no
//    legacy spelling, fixed roles v1's, tables follow their roles, hue-named
//    roles in their hue families (the same HSL families as
//    tools-check/vibes-contract.mjs), every role name resolves, every variant
//    a name vocab.js accepts, frozen, imports nothing.
// 2. Contrast: every text role on every surface role (and the surfaces the
//    tints and the grain make), every graphic on what it sits on. Lists every
//    pair under 4.5 (text) / 3 (graphics) and says whether the vibe produces it.
// 3. Colour vision: Machado 2009 deuteranopia / protanopia, the six group
//    colours' pairwise ΔE00, good vs bad, the accent's nearest.
// 4. Icons: every v1 icon name present, the glyph keys, element shapes.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { contrast, over, simulate, dE, hexToRgb, toLin } from '/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs';
import { nearestTW } from '/Users/micahflunker/dev/vibes-night/tools/colour/tailwind.mjs';

const WT = '/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/';
const I = await import(pathToFileURL(WT + 'defs/index.js').href);
const V1 = (await import(pathToFileURL(WT + 'defs/v1.js').href)).default;
const IA = (await import(pathToFileURL(WT + 'defs/iron-age.js').href)).default;
const VOCAB = (await import(pathToFileURL(WT + 'defs/vocab.js').href)).default;
const V1IC = (await import(pathToFileURL(WT + 'icons/v1.js').href)).default;
const IAIC = (await import(pathToFileURL(WT + 'icons/iron-age.js').href)).default;
const { ROLES, LEGACY_EXACT, HUE_NAMED, at, sideOf } = I;

let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('  ✗ ' + m); } else if (process.env.VERBOSE) console.log('  ✓ ' + m); return c; };
const f2 = n => n.toFixed(2);

/* ================= 1. shape ================= */
console.log('\n1. SHAPE');
const leaves = (o, p = '', out = []) => {
  if (o && typeof o === 'object' && (Array.isArray(o) ? o.length : Object.keys(o).length)) {
    for (const [k, v] of Object.entries(o)) leaves(v, p ? p + '.' + k : k, out);
  } else out.push([p, o]);
  return out;
};
const underLegacy = p => LEGACY_EXACT.some(L => p === L || p.startsWith(L + '.'));
const isSplit = v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length && Object.keys(v).every(k => k === 'web' || k === 'native');
const v1Leaves = leaves(V1);
const missing = [];
for (const [p] of v1Leaves) {
  if (underLegacy(p)) continue;
  if (at(IA, p) !== undefined) continue;
  // a v1 { web, native } split may be one value in another vibe
  const parent = p.split('.').slice(0, -1).join('.');
  if (isSplit(at(V1, parent)) && at(IA, parent) !== undefined && !isSplit(at(IA, parent))) continue;
  // a list (shadow layers) may be shorter in another vibe: [] is none; a layer's alpha is optional (no a = solid)
  const segs = p.split('.');
  const arrAt = segs.findIndex((_, i) => Array.isArray(at(V1, segs.slice(0, i + 1).join('.'))));
  if (arrAt >= 0 && arrAt < segs.length - 1 && Array.isArray(at(IA, segs.slice(0, arrAt + 1).join('.')))) {
    const idx = +segs[arrAt + 1], layer = at(IA, segs.slice(0, arrAt + 2).join('.'));
    if (layer === undefined || segs[segs.length - 1] === 'a') continue;
  }
  missing.push(p);
}
ok(!missing.length, `every v1 leaf path is in iron-age (${v1Leaves.length} leaves)` + (missing.length ? ' — missing: ' + missing.join(', ') : ''));
for (const k of ['id', 'name', 'feel', 'experimental', 'scheme', 'icons', 'images', 'variants', 'themeColor']) ok(IA[k] !== undefined, 'meta ' + k + ' set');
ok(IA.id === 'iron-age' && IA.experimental === false && IA.scheme === 'light' && IA.icons === 'iron-age', 'id iron-age, experimental false, scheme light, icons iron-age');
ok(I.validId(IA.id), 'the id is a valid vibe id');
const NAMED = new Set('black white red green blue yellow gray grey navy olive silver tan linen teal maroon purple orange pink gold'.split(' '));
const looksColour = s => typeof s === 'string' && (/^#/.test(s) || /^(rgba?|hsla?)\(/i.test(s) || NAMED.has(s.toLowerCase()));
const HEX6 = /^#[0-9a-fA-F]{6}$/;
const colourLeaves = leaves(IA).filter(([, v]) => looksColour(v));
const odd = colourLeaves.filter(([, v]) => !HEX6.test(v));
ok(!odd.length, `every colour string is 6-digit hex (${colourLeaves.length})` + (odd.length ? ' — not: ' + odd.map(([p, v]) => p + '=' + v).join(', ') : ''));
ok(!LEGACY_EXACT.some(L => at(IA, L) !== undefined && !HEX6.test(at(IA, L))), 'no legacy spelling at any LEGACY_EXACT path');
ok(!leaves(IA).some(([p]) => /\.exact(\.|$)/.test(p)), 'no `exact` key anywhere');
const moved = ROLES.filter(r => r.fixed && JSON.stringify(at(IA, r.path)) !== JSON.stringify(at(V1, r.path)));
ok(!moved.length, 'every fixed role is v1\'s' + (moved.length ? ' — not: ' + moved.map(r => r.path).join(', ') : ''));
for (const r of ROLES.filter(x => x.follows)) {
  const t = at(IA, r.path), fo = r.follows;
  const off = Object.keys(fo).filter(k => String(t[k]).toLowerCase() !== String(IA.colors[fo[k]]).toLowerCase());
  ok(JSON.stringify(Object.keys(t)) === JSON.stringify(Object.keys(fo)) && !off.length, r.path + ' follows its roles' + (off.length ? ' — not: ' + off : ''));
}
ok(Object.entries(IA.web.rgb).every(([k, v]) => k === v), 'web.rgb channels name their own roles');
ok(Object.entries(IA.alpha).every(([k, v]) => !(k in IA.colors) || k === v), 'alpha helpers named for a role tint that role');
// hue families (vibes-contract.mjs's)
const hsl = hex => {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
};
const HUE_FAMILY = {
  red: c => c.s >= 0.35 && (c.h >= 345 || c.h <= 15), amber: c => c.s >= 0.35 && c.h >= 30 && c.h <= 60,
  yellow: c => c.s >= 0.35 && c.h >= 35 && c.h <= 65, green: c => c.s >= 0.25 && c.h >= 75 && c.h <= 165,
  blue: c => c.s >= 0.25 && c.h >= 185 && c.h <= 250, white: c => c.l >= 0.85 && c.s <= 0.4, grey: c => c.s <= 0.25 && c.l > 0.15 && c.l < 0.85
};
for (const h of HUE_NAMED) { const v = sideOf(at(IA, h.role), 'web'), c = hsl(v); ok(HUE_FAMILY[h.hue](c), `${h.role} ${v} is ${h.hue} (h ${c.h.toFixed(0)}, s ${f2(c.s)}, l ${f2(c.l)})`); }
// every role name resolves
const roleNames = new Set(Object.keys(IA.colors));
const refs = [];
for (const [k, t] of Object.entries(IA.tint)) refs.push(['tint.' + k, t.color]);
for (const [k, t] of Object.entries(IA.type)) if (t.color) refs.push(['type.' + k, t.color]);
for (const [k, s] of Object.entries(IA.shadow)) for (const l of s.web || []) refs.push(['shadow.' + k, l.color]);
for (const s of IA.scrim.tour.stops) refs.push(['scrim.tour', s.color]);
for (const [k, img] of Object.entries(IA.images)) for (const s of img.scrim.stops) refs.push(['images.' + k, s.color]);
for (const t of ['importGroups', 'subjects', 'conf']) for (const [k, v] of Object.entries(IA[t])) refs.push([t + '.' + k, v]);
IA.mark.forEach((v, i) => refs.push(['mark.' + i, v]));
for (const [k, v] of Object.entries(IA.kpi)) refs.push(['kpi.' + k, v.color]);
for (const [k, v] of Object.entries(IA.alpha)) refs.push(['alpha.' + k, v]);
for (const [k, v] of Object.entries(IA.admin.aiSplit)) refs.push(['admin.aiSplit.' + k, v]);
IA.admin.families.forEach((v, i) => refs.push(['admin.families.' + i, v]));
for (const [k, v] of Object.entries(IA.admin.pill.native)) refs.push(['admin.pill.native.' + k, v]);
for (const [k, v] of Object.entries(IA.admin.flag)) refs.push(['admin.flag.' + k, v]);
for (const [k, v] of Object.entries(IA.inkOf)) refs.push(['inkOf.' + k, v]);
refs.push(['shape.rule.ink', IA.shape.rule.ink], ['shape.leader.ink', IA.shape.leader.ink], ['shape.keyline.ink', IA.shape.keyline.ink],
  ['shape.band.fill', IA.shape.band.fill], ['shape.band.ink', IA.shape.band.ink]);
for (const k of ['sheet', 'dock', 'wkBar']) refs.push(['scrim.' + k + '.tint(tint)', IA.tint[IA.scrim[k].tint] ? IA.tint[IA.scrim[k].tint].color : '??']);
const bad = refs.filter(([, r]) => !roleNames.has(r));
ok(!bad.length, `every role reference resolves (${refs.length})` + (bad.length ? ' — not: ' + bad.map(x => x.join('=')).join(', ') : ''));
// variants
const blocks = Object.keys(VOCAB.blocks);
ok(JSON.stringify(Object.keys(IA.variants).sort()) === JSON.stringify([...blocks].sort()), `a look for every one of vocab.js's ${blocks.length} blocks`);
const badLook = Object.entries(IA.variants).filter(([b, l]) => !(VOCAB.blocks[b] && VOCAB.blocks[b].variants.includes(l)));
ok(!badLook.length, 'every look is one its block accepts' + (badLook.length ? ' — not: ' + badLook.map(x => x.join('.')).join(', ') : ''));
const gradeOff = Object.entries(IA.variants).filter(([b, l]) => !VOCAB.allowed.ironAge.includes(VOCAB.blocks[b].looks[l].grade));
ok(!gradeOff.length, 'every look is a grade Iron Age may name');
// native face bands: no Archivo wdth falls in a band; every Besley preset lands in one
const band = w => (IA.face.bands || []).find(b => w >= b.min && w <= b.max);
const NATIVE_WDTH = [78, 88, 90, 92, 94, 96, 100, 104, 108, 110, 112, 118];
ok(!NATIVE_WDTH.some(band), 'no wdth a native literal site passes falls in a Besley band');
const faceOf = t => { const b = band(t.wdth == null ? 100 : t.wdth); return b ? b.family : IA.face.family; };
console.log('  presets by face: ' + Object.entries(IA.type).filter(([k]) => k !== 'mono').map(([k, t]) => k + '=' + faceOf(t)).join(' ') + ' loadNum=' + faceOf(IA.loadNum));
const weightKey = (t) => { const b = band(t.wdth == null ? 100 : t.wdth); const w = t.wght || 400;
  if (!b) { const s = IA.face.snap[w]; return IA.face.family + '_' + (s || Math.round(w / IA.face.step) * IA.face.step); }
  return b.family + '_' + b.weights.reduce((best, x) => (Math.abs(x - w) < Math.abs(best - w) || (Math.abs(x - w) === Math.abs(best - w) && x > best) ? x : best), b.weights[0]); };
const keysNeeded = new Set([...Object.entries(IA.type).filter(([k]) => k !== 'mono').map(([, t]) => weightKey(t)), weightKey(IA.loadNum)]);
const keysHave = new Set([...IA.face.keys, ...IA.face.bands.flatMap(b => b.keys)]);
ok([...keysNeeded].every(k => keysHave.has(k)), 'every preset resolves to a registered face key: ' + [...keysNeeded].join(', '));
ok(IA.face.bands.flatMap(b => b.keys).length <= 4, 'native: ' + IA.face.bands.flatMap(b => b.keys).length + ' vibe TTFs (≤ 4, picker face included)');
// frozen, imports nothing
const deepFrozen = o => !o || typeof o !== 'object' || (Object.isFrozen(o) && Object.values(o).every(deepFrozen));
ok(deepFrozen(IA) && deepFrozen(IAIC), 'the definition and the icon set are frozen all the way down');
for (const f of ['defs/iron-age.js', 'icons/iron-age.js']) {
  const code = readFileSync(WT + f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`[^`]*`/g, "''");
  ok(!/\bimport\b/.test(code) && !/\brequire\b/.test(code), f + ' imports nothing');
}

/* ================= 2. contrast ================= */
console.log('\n2. CONTRAST (WCAG 2.x; alpha composited in encoded sRGB, rounded to 8 bits)');
const C = IA.colors, T = IA.tint;
const GRAIN = '#e0d8c4';   // the `manual` grain tile's darkest pixel on this stock (concept A, ia-a-grain.mjs manual 3 1897)
const tintOver = (name, bg) => over(C[T[name].color], T[name].a, bg);
const S = {
  rack: C.rack, 'rack·grain': GRAIN, bar: C.bar, raised: C.raised,
  'pressed (rowPress/rack)': tintOver('rowPress', C.rack), 'done row (setDone/rack)': tintOver('setDone', C.rack),
  'done row on grain': tintOver('setDone', GRAIN), 'chosen row (pickSel/bar)': tintOver('pickSel', C.bar),
  'flash peak (setFlash/rack)': tintOver('setFlash', C.rack),
  'pill base (pillBase/grain)': tintOver('pillBase', GRAIN), 'pill up (pillUp/grain)': tintOver('pillUp', GRAIN),
  'pill down (pillDown/grain)': tintOver('pillDown', GRAIN), 'pill warn (pillWarn/grain)': tintOver('pillWarn', GRAIN),
  'ai-warn box (warn .10/bar)': over(C.warn, 0.10, C.bar), 'trial bar web (warn .12/rack)': over(C.warn, 0.12, C.rack),
  'photo worst pixel (stock .54 over ink)': over(C.rack, 0.54, C.chalk)
};
const TEXT = ['chalk', 'steel', 'dim', 'accent', 'good', 'warn', 'bad', 'danger', 'pRed', 'pBlue', 'pGreen', 'pWhite', 'pYellow', 'pChrome'];
// which text-on-surface pairs the vibe produces (from the spec §5's site walk); the rest are listed but not produced
const PRODUCED = {
  accent: ['rack', 'rack·grain', 'bar', 'chosen row (pickSel/bar)'],
  pYellow: [], pChrome: [],   // never small text: inkOf sends them to warn / steel
  good: ['rack', 'rack·grain', 'bar', 'pill up (pillUp/grain)', 'done row (setDone/rack)', 'done row on grain'],
  bad: ['rack', 'rack·grain', 'bar', 'pill down (pillDown/grain)', 'done row (setDone/rack)', 'done row on grain'],
  warn: ['rack', 'rack·grain', 'bar', 'pill warn (pillWarn/grain)', 'done row (setDone/rack)', 'done row on grain', 'ai-warn box (warn .10/bar)', 'trial bar web (warn .12/rack)'],
  dim: Object.keys(S).filter(s => !s.startsWith('photo') && !s.startsWith('pill ') && !s.startsWith('ai-') && !s.startsWith('trial')).concat(['pill base (pillBase/grain)']),
  chalk: Object.keys(S), steel: Object.keys(S).filter(s => !s.startsWith('photo'))
};
const produced = (t, s) => (PRODUCED[t] || Object.keys(S).filter(x => !x.startsWith('photo') && !x.startsWith('pill') && !x.startsWith('ai-') && !x.startsWith('trial'))).includes(s);
const table = {};
const under = [];
for (const t of TEXT) {
  table[t] = {};
  for (const [sn, sv] of Object.entries(S)) {
    const r = contrast(C[t], sv); table[t][sn] = f2(r);
    if (r < 4.5) under.push({ t, sn, r, produced: produced(t, sn) });
  }
}
console.log('  surfaces: ' + Object.entries(S).map(([k, v]) => k + ' ' + v).join(' | '));
for (const t of TEXT) console.log('  ' + t.padEnd(8) + ' ' + Object.values(table[t]).map(v => v.padStart(5)).join(' '));
console.log('  columns: ' + Object.keys(S).join(' | '));
console.log('\n  text pairs under 4.5:');
for (const u of under) console.log(`    ${u.t} on ${u.sn}: ${f2(u.r)} — ${u.produced ? 'PRODUCED: FIX' : 'not produced (policed: see spec §5)'}`);
ok(!under.some(u => u.produced), 'no produced text pair under 4.5:1');
// fills: the ink on a filled ground
console.log('\n  ink on fills:');
const fills = [
  ['knockout on inverse', C.knockout, C.inverse], ['onAccent on accent', C.onAccent, C.accent], ['onAccent on accentPressed', C.onAccent, C.accentPressed],
  ['onDanger on danger', C.onDanger, C.danger], ['onDone on done', C.onDone, C.done], ['onWarn on warn', C.onWarn, C.warn],
  ...['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'].map(p => ['onPlate on ' + p, C.onPlate, C[p]]),
  ['white on band', '#ffffff', C.band], ['banner white on pRed', IA.banner.devText, C.pRed], ['banner white on pGreen', IA.banner.guardText, C.pGreen],
  ['chalk on calMark', C.chalk, C.calMark], ['bar (tour card) vs tour veil', C.bar, over(C.shade, 0.8, C.rack)],
  ['chalk on tour card', C.chalk, C.bar], ['ink on the stock scrim thumb (worst)', C.chalk, over(C.rack, 0.54, C.chalk)]
];
for (const [n, a, b] of fills) { const r = contrast(a, b); console.log(`    ${n.padEnd(38)} ${f2(r)}`); ok(r >= 4.5, n + ' ≥ 4.5'); }
// large text only
console.log('\n  large text only (≥ 18pt, or 14pt bold; 3:1):');
for (const [n, a, b] of [['pYellow on rack (Fuel hold figure, Weight figures 28–40pt)', C.pYellow, C.rack], ['pYellow on grain', C.pYellow, GRAIN],
  ['pYellow on bar (the lead plate)', C.pYellow, C.bar], ['pChrome on rack', C.pChrome, C.rack]]) {
  const r = contrast(a, b); console.log(`    ${n.padEnd(58)} ${f2(r)}`); ok(r >= 3, n + ' ≥ 3');
}
// graphics
console.log('\n  graphics (3:1):');
const G = [
  ['knurl (control edge) on rack', C.knurl, C.rack], ['knurl on grain', C.knurl, GRAIN], ['knurl on bar', C.knurl, C.bar],
  ['grip (grab handle) on bar', C.grip, C.bar], ['focus on rack', C.focus, C.rack], ['focus on bar', C.focus, C.bar],
  ['ink rules on grain', C.chalk, GRAIN], ['dock icon at rest (dim) on bar', C.dim, C.bar], ['dock icon active (chalk) on bar', C.chalk, C.bar],
  ['tourLit (accent) on dock bar', C.accent, C.bar], ['drop rail (pBlue .75) on rack', tintOver('dropRail', C.rack), C.rack],
  ...['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'].map(p => [p + ' mark on rack', C[p], C.rack]),
  ...['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'].map(p => [p + ' fill on track', C[p], C.track]),
  ['pGreen ring arc on its bar disc', C.pGreen, C.bar], ['done check fill on rack', C.done, C.rack],
  ['calMark ink edge (chalk) on track', C.chalk, C.track], ['calMark ink edge on the eaten fill (pBlue)', C.chalk, C.calMark],
  ['heat strip: trained (pYellow) vs untrained (collar)', C.pYellow, C.collar], ['heat strip: trained (pYellow) on rack', C.pYellow, C.rack],
  ['coach pulse peak (coachHigh) vs rack', tintOver('coachHigh', C.rack), C.rack]
];
const deco = new Set(['coach pulse peak (coachHigh) vs rack', 'heat strip: trained (pYellow) vs untrained (collar)']);
for (const [n, a, b] of G) { const r = contrast(a, b); console.log(`    ${n.padEnd(52)} ${f2(r)}${r < 3 ? (deco.has(n) ? '  (not a 3:1 pair: see note)' : '  ✗') : ''}`); if (!deco.has(n)) ok(r >= 3, n + ' ≥ 3'); }
console.log('    decorative (no minimum): collar on rack ' + f2(contrast(C.collar, C.rack)) + ', track on rack ' + f2(contrast(C.track, C.rack)) +
  ', calMark on rack ' + f2(contrast(C.calMark, C.rack)) + ', raised on rack ' + f2(contrast(C.raised, C.rack)) + ', bar on rack ' + f2(contrast(C.bar, C.rack)));

/* ================= 3. colour vision ================= */
console.log('\n3. COLOUR VISION (Machado 2009, severity 1; CIEDE2000)');
const GROUPS = { chest: C.pRed, back: C.pBlue, legs: C.pYellow, shoulders: C.pGreen, arms: C.pWhite, core: C.pChrome };
const KIND = { deuteranopia: 'deutan', protanopia: 'protan' };
const sim = (h, k) => k === 'normal' ? h : simulate(h, KIND[k]);
const cvd = {};
for (const k of ['normal', 'deuteranopia', 'protanopia']) {
  const pairs = [];
  const names = Object.keys(GROUPS);
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    pairs.push([names[i] + '/' + names[j], dE(sim(GROUPS[names[i]], k), sim(GROUPS[names[j]], k))]);
  }
  pairs.sort((a, b) => a[1] - b[1]);
  cvd[k] = pairs[0][1];
  const gb = dE(sim(C.good, k), sim(C.bad, k));
  const acc = Object.entries({ ...GROUPS, good: C.good, warn: C.warn, bad: C.bad }).map(([n, h]) => [n, dE(sim(C.accent, k), sim(h, k))]).sort((a, b) => a[1] - b[1])[0];
  console.log(`  ${k.padEnd(13)} worst group pairs: ${pairs.slice(0, 3).map(([n, d]) => n + ' ' + f2(d)).join(', ')} | good vs bad ${f2(gb)} | accent's nearest ${acc[0]} ${f2(acc[1])}`);
}
ok(Math.min(cvd.normal, cvd.deuteranopia, cvd.protanopia) >= 12, 'worst group ΔE00 across normal, deutan, protan ≥ 12 (R2.5): ' + f2(Math.min(cvd.normal, cvd.deuteranopia, cvd.protanopia)));
// lit vs unlit spark bars: pinned analytics paints unlit bars knurl
for (const k of ['normal', 'deuteranopia', 'protanopia']) {
  console.log(`  lit vs unlit spark bars (${k}): pYellow/knurl ${f2(dE(sim(C.pYellow, k), sim(C.knurl, k)))}, pBlue/knurl ${f2(dE(sim(C.pBlue, k), sim(C.knurl, k)))}, pWhite/knurl ${f2(dE(sim(C.pWhite, k), sim(C.knurl, k)))}`);
}
console.log('  lit vs unlit spark bars, luminance: pYellow/knurl ' + f2(contrast(C.pYellow, C.knurl)) + ', pBlue/knurl ' + f2(contrast(C.pBlue, C.knurl)) + ', pWhite/knurl ' + f2(contrast(C.pWhite, C.knurl)));

/* OKLCH and the guard, for the spec */
const oklch = hex => {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return `L ${L.toFixed(3)} C ${Math.hypot(A, B).toFixed(3)} h ${((Math.atan2(B, A) * 180 / Math.PI + 360) % 360).toFixed(0)}`;
};
console.log('\n  OKLCH: ' + ['rack', 'bar', 'chalk', 'steel', 'dim', 'knurl', 'accent', 'pYellow', 'warn', 'pBlue'].map(k => k + ' ' + oklch(C[k])).join(' | '));
console.log('  zone washes (fallback tints) over track, OKLCH: ' + ['zoneCut', 'zoneHold', 'zoneGain'].map(k => k + ' ' + oklch(tintOver(k, C.track))).join(' | '));
console.log('  Tailwind v3 guard (R2.7): ' + ['rack', 'bar', 'accent', 'accentPressed', 'knurl', 'dim'].map(k => k + ' ' + nearestTW(C[k])[0] + ' ' + f2(nearestTW(C[k])[1])).join(' | '));
console.log('  accent vs Claude clay #d97757: ' + f2(dE(C.accent, '#d97757')) + ' | rack vs v1 rack: ' + f2(dE(C.rack, V1.colors.rack)));

/* ================= 4. icons ================= */
console.log('\n4. ICONS');
const EL_KEYS = { path: ['tag', 'd'], circle: ['tag', 'cx', 'cy', 'r'], rect: ['tag', 'x', 'y', 'width', 'height', 'rx'] };
const ICON_KEYS = ['viewBox', 'stroke', 'fill', 'linecap', 'linejoin', 'els'];
const v1Names = Object.keys(V1IC.icons), iaNames = Object.keys(IAIC.icons);
ok(JSON.stringify(v1Names) === JSON.stringify(iaNames), `the same ${v1Names.length} icon names as v1's set, in order`);
ok(JSON.stringify(Object.keys(V1IC.glyphs).sort()) === JSON.stringify(Object.keys(IAIC.glyphs).sort()), 'a drawing (or null) for every v1 glyph key');
const allIcons = [...Object.entries(IAIC.icons), ...Object.entries(IAIC.glyphs).filter(([, v]) => v)];
const shapeBad = allIcons.filter(([, ic]) => JSON.stringify(Object.keys(ic)) !== JSON.stringify(ICON_KEYS) || ic.viewBox !== '0 0 24 24' || ic.fill !== 'none' ||
  !(ic.stroke > 0) || !ic.els.length || ic.els.some(e => !EL_KEYS[e.tag] || JSON.stringify(Object.keys(e)) !== JSON.stringify(EL_KEYS[e.tag])));
ok(!shapeBad.length, `every icon is { viewBox 0 0 24 24, stroke, fill none, linecap, linejoin, els } of path / circle / rect (${allIcons.length})` + (shapeBad.length ? ' — not: ' + shapeBad.map(x => x[0]).join(', ') : ''));
ok(allIcons.every(([, ic]) => ic.linecap === 'square' && ic.linejoin === 'miter'), 'square caps and miter joins throughout');
console.log('  strokes: ' + allIcons.map(([k, ic]) => k + ' ' + ic.stroke).join(', '));
ok(!!IAIC.icons.spark && IAIC.icons.spark !== V1IC.icons.spark, 'spark is defined and is not v1\'s sparkle (R8.8)');
ok(IAIC.vessel && IAIC.vessel.insideBottom > IAIC.vessel.insideTop, 'the vessel carries its own insideBottom / insideTop');
ok(Object.keys(IAIC.sources).length >= iaNames.length, 'every icon names its source');

console.log(`\n${fails ? fails + ' FAILED' : 'All passed'} — ${checks} checks.`);
process.exit(fails ? 1 : 0);
