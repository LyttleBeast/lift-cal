// Iron Age, concept A ("The manual page"): every colour number the spec quotes.
// Uses track 4's colour library (WCAG 2.x contrast, sRGB-encoded alpha blend,
// Machado 2009 CVD at severity 1 in linear RGB, CIEDE2000) and its Tailwind v3/v4 lists.
// Deterministic, no network. Run: node tools/ia-a-palette.mjs [stock=r2g|orig]
import { contrast, over, simulate, lab, dE, lum, hexToRgb, toLin, toGam, rgbToHex } from './colour/colour-lib.mjs';
import { nearestTW } from './colour/tailwind.mjs';
import { nearestV4 } from './colour/tailwind4.mjs';

const which = (process.argv[2] || 'stock=r2g').split('=')[1];
const STOCKS = {
  r2g:  { rack: '#e6dec9', bar: '#ebe4ce', well: '#e8ddd1', pressed: '#e2d7c7' },
  orig: { rack: '#ede3cc', bar: '#f6efdd', well: '#f1e4d2', pressed: '#e7d8c4' },
};
const S = STOCKS[which];
const INK = '#1c1712';
const C = {
  rack: S.rack, bar: S.bar, well: S.rack,
  raised: over(INK, 0.10, S.rack), grip: '#7b6c52', track: '#d6c8a8',
  collar: '#c4b79b', knurl: '#7b6c52',
  chalk: INK, steel: '#4a3f31', dim: '#5f5343', faint: '#5f5343',
  inverse: INK, knockout: S.bar, calMark: '#fffaf2',
  accent: '#a1374f', accentPressed: '#8e3548', onAccent: '#f6efdd', focus: '#a1374f',
  danger: '#82180c', onDanger: '#f6efdd', done: '#0e5f40', onDone: '#f6efdd',
  good: '#0e5f40', warn: '#6e4d08', bad: '#82180c', onWarn: '#f6efdd',
  pRed: '#82180c', pBlue: '#1f4a72', pYellow: '#8b6600', pGreen: '#0e5f40', pWhite: '#2a241d', pChrome: '#6a6d6c',
  onPlate: '#f6efdd', shade: INK, lift: INK, tileHero: S.rack, tileLit: S.rack,
  band: INK, pressedStock: S.pressed,
};
const f2 = n => n.toFixed(2), f1 = n => n.toFixed(1);

// OKLCH (for hue / chroma statements)
function oklch(hex) {
  const [R, G, B] = hexToRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  let h = Math.atan2(Bb, A) * 180 / Math.PI; if (h < 0) h += 360; return [L, Math.hypot(A, Bb), h];
}
const lch = h => { const [L, Cc, hh] = oklch(h); return `L ${L.toFixed(3)} C ${Cc.toFixed(3)} h ${hh.toFixed(0)}`; };

console.log(`# Iron Age A palette, stock = ${which}`);
console.log('\n## Grounds and accent: OKLCH, distance from v1, Tailwind v3 / v4 nearest');
for (const k of ['rack', 'bar', 'well', 'raised', 'pressedStock', 'accent', 'accentPressed', 'chalk', 'dim', 'warn', 'pYellow']) {
  const [n3, d3] = nearestTW(C[k]); const v4 = nearestV4 ? nearestV4(C[k]) : null;
  console.log(`${k.padEnd(13)} ${C[k]}  ${lch(C[k])}  v3 ${n3} ${f2(d3)}  v4 ${v4 ? v4[0] + ' ' + f2(v4[1]) : '-'}`);
}
console.log(`rack vs v1 #14161a dE00 ${f1(dE(C.rack, '#14161a'))}; R-B ${hexToRgb(C.rack)[0] - hexToRgb(C.rack)[2]}, min channel 0x${Math.min(...hexToRgb(C.rack)).toString(16)}`);
console.log(`AI creams: ` + ['#f4f1ea', '#f7f1e4', '#f5f1e8', '#faf8f5', '#f0ebe0'].map(h => `${h} ${f2(dE(C.rack, h))}`).join(', '));
console.log(`accent vs clay #d97757 ${f1(dE(C.accent, '#d97757'))}, vs #d9622b ${f1(dE(C.accent, '#d9622b'))}, vs v1 accent ${f1(dE(C.accent, '#f0be1e'))}`);

console.log('\n## Surfaces as luminance steps');
for (const [a, b] of [['bar', 'rack'], ['well', 'rack'], ['raised', 'rack'], ['pressedStock', 'rack'], ['collar', 'rack'], ['collar', 'bar'], ['track', 'rack']]) console.log(`${a} vs ${b}: ${f2(contrast(C[a], C[b]))}`);

// text pairs: every text role on every surface it can land on
const surf = { rack: C.rack, bar: C.bar, well: C.well, raised: C.raised, pressed: C.pressedStock,
  'setDone/bar': over(C.done, 0.07, C.bar), 'setDone/rack': over(C.done, 0.07, C.rack),
  'setFlash .14/rack': over(C.accent, 0.14, C.rack), 'pickSel(ink .06)/bar': over(C.chalk, 0.06, C.bar),
  'rowPress .04/rack': over(C.lift, 0.04, C.rack), 'rowPress .04/bar': over(C.lift, 0.04, C.bar),
  'reviewBg(ink .04)/rack': over(C.chalk, 0.04, C.rack), 'grain darkest (manual)': '#e0d8c4' };
const TEXT = ['chalk', 'steel', 'dim', 'accent', 'good', 'warn', 'bad', 'pRed', 'pBlue', 'pWhite', 'danger'];
console.log('\n## Text on surfaces (need 4.5; * = below 4.5)');
console.log('| text | ' + Object.keys(surf).join(' | ') + ' |');
for (const t of TEXT) console.log(`| ${t} ${C[t]} | ` + Object.values(surf).map(s => { const r = contrast(C[t], s); return f2(r) + (r < 4.5 ? '*' : ''); }).join(' | ') + ' |');
console.log('surface hexes: ' + Object.entries(surf).map(([k, v]) => `${k} ${v}`).join(', '));

console.log('\n## Ink on fills (need 4.5)');
const fills = [['knockout on inverse (primary btn, chosen chip, toast, FAB)', C.knockout, C.inverse], ['onAccent on accent', C.onAccent, C.accent], ['onAccent on accentPressed', C.onAccent, C.accentPressed],
  ['onDanger on danger (swipe delete)', C.onDanger, C.danger], ['onDone on done (set tick)', C.onDone, C.done], ['onWarn on warn (native trial bar)', C.onWarn, C.warn],
  ...['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'].map(k => [`onPlate on ${k}`, C.onPlate, C[k]]),
  ['chalk on calMark (white head)', C.chalk, C.calMark], ['#ffffff on band (web status bar)', '#ffffff', C.band],
  ['knockout on accent? (n/a)', C.knockout, C.accent]];
for (const [l, f, b] of fills) console.log(`${l}: ${f2(contrast(f, b))}`);

console.log('\n## Graphics (need 3.0)');
const gr = [['knurl (control edge) vs rack', C.knurl, C.rack], ['knurl vs bar', C.knurl, C.bar], ['grip (grab handle) vs bar', C.grip, C.bar], ['focus vs rack', C.focus, C.rack], ['focus vs bar', C.focus, C.bar],
  ['ink rules vs rack', C.chalk, C.rack], ['ink rules vs bar', C.chalk, C.bar], ['dim icons vs bar (dock rest)', C.dim, C.bar], ['steel icons vs rack', C.steel, C.rack],
  ['dropRail pBlue .60 over rack', over(C.pBlue, 0.60, C.rack), C.rack], ['dropRail pBlue .45 over rack', over(C.pBlue, 0.45, C.rack), C.rack],
  ...['pRed', 'pBlue', 'pYellow', 'pGreen', 'pWhite', 'pChrome'].flatMap(k => [[`${k} vs rack`, C[k], C.rack], [`${k} vs bar`, C[k], C.bar]]),
  ['good vs rack', C.good, C.rack], ['warn vs rack', C.warn, C.rack], ['bad vs rack', C.bad, C.rack],
  ['calMark vs rack (needs ink keyline)', C.calMark, C.rack], ['collar vs rack (decorative)', C.collar, C.rack], ['track vs rack (decorative)', C.track, C.rack],
  ['toggle off: grip vs rack', C.grip, C.rack]];
for (const [l, f, b] of gr) console.log(`${l}: ${f2(contrast(f, b))}${contrast(f, b) < 3 ? '  (<3)' : ''}`);

console.log('\n## Large text (>= 18pt or 14pt bold): need 3.0');
for (const k of ['pYellow', 'pChrome']) for (const s of ['rack', 'bar']) console.log(`${k} on ${s}: ${f2(contrast(C[k], C[s]))}`);

console.log('\n## Tints over rack (zone washes, meter)');
for (const [n, role, a] of [['zoneCut', 'pBlue', 0.14], ['zoneHold', 'pYellow', 0.20], ['zoneGain', 'pRed', 0.14], ['zoneCut v1a', 'pBlue', 0.10], ['zoneHold v1a', 'pYellow', 0.12]]) {
  const h = over(C[role], a, C.rack); console.log(`${n} ${role} .${String(a).slice(2)} -> ${h} ${lch(h)}; chalk on it ${f2(contrast(C.chalk, h))}`);
}
console.log(`backdrop ink .45 over bar -> ${over(C.shade, 0.45, C.bar)}; over rack ${over(C.shade, 0.45, C.rack)}`);

// CVD
const G = [['pRed', 'chest'], ['pBlue', 'back'], ['pYellow', 'legs'], ['pGreen', 'shoulders'], ['pWhite', 'arms'], ['pChrome', 'core']];
console.log('\n## CVD (Machado 2009, severity 1)');
for (const kind of ['normal', 'deutan', 'protan', 'tritan']) {
  const sim = G.map(([k, g]) => [g, simulate(C[k], kind)]);
  const prs = []; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) prs.push([`${sim[i][0]}/${sim[j][0]}`, dE(sim[i][1], sim[j][1])]);
  prs.sort((a, b) => a[1] - b[1]);
  const gb = dE(simulate(C.good, kind), simulate(C.bad, kind));
  const accNear = [...G.map(([k, g]) => [g, C[k]]), ['good', C.good], ['warn', C.warn], ['bad', C.bad], ['danger', C.danger]].map(([g, h]) => [g, dE(simulate(C.accent, kind), simulate(h, kind))]).sort((a, b) => a[1] - b[1])[0];
  console.log(`${kind.padEnd(6)} sims: ${sim.map(s => s[0] + ' ' + s[1]).join(', ')}`);
  console.log(`       worst three: ${prs.slice(0, 3).map(p => p[0] + ' ' + f1(p[1])).join(', ')} | good/bad ${f1(gb)} (dL ${f1(Math.abs(lab(simulate(C.good, kind))[0] - lab(simulate(C.bad, kind))[0]))}) | accent nearest ${accNear[0]} ${f1(accNear[1])}`);
  if (kind === 'deutan' || kind === 'normal' || kind === 'protan') console.log('       all pairs: ' + prs.map(p => p[0] + ' ' + f1(p[1])).join(', '));
}

// Photo scrim thresholds: worst pixel of a halftone scrimmed by stock is the scrimmed ink dot.
// Encoded model: over() in sRGB code values (what Chrome does). Linear model: blend in linear light.
const overLin = (fg, a, bg) => { const f = hexToRgb(fg).map(toLin), b = hexToRgb(bg).map(toLin); return rgbToHex(f.map((v, i) => toGam(v * a + b[i] * (1 - a)) * 255)); };
// dark text must be darker than every scrimmed pixel: the darkest is the scrimmed ink dot
const minAlpha = (text, need, model) => { for (let a = 0; a <= 1.0001; a += 0.001) { const px = model(C.rack, a, INK); if (lum(text) < lum(px) && contrast(text, px) >= need) return a; } return null; };
const photoKeeps = (a, model) => contrast(model(C.rack, a, INK), model(C.rack, a, over(INK, 0.04, C.rack)));
console.log('\n## Photo scrim (stock over the halftone), per text colour');
console.log('| text | need | min a encoded | min a linear | a for both | photo keeps (enc) at that a |');
for (const [t, need] of [['chalk', 4.5], ['chalk', 3.0], ['pWhite', 3.0], ['pBlue', 3.0], ['pRed', 3.0], ['pYellow', 3.0], ['good', 3.0], ['steel', 4.5], ['dim', 4.5], ['accent', 4.5]]) {
  const e = minAlpha(C[t], need, over), l = minAlpha(C[t], need, overLin);
  const both = e == null || l == null ? null : Math.max(e, l);
  console.log(`| ${t} | ${need} | ${e == null ? 'none' : e.toFixed(3)} | ${l == null ? 'none' : l.toFixed(3)} | ${both == null ? 'none' : both.toFixed(3)} | ${both == null ? '-' : f2(photoKeeps(both, over))} |`);
}
for (const a of [0.513, 0.526, 0.536, 0.60, 0.65, 0.70]) console.log(`stock scrim a=${a}: worst px ${over(C.rack, a, INK)}; ink text ${f2(contrast(INK, over(C.rack, a, INK)))}; pYellow ${f2(contrast(C.pYellow, over(C.rack, a, INK)))}; pBlue ${f2(contrast(C.pBlue, over(C.rack, a, INK)))}; pRed ${f2(contrast(C.pRed, over(C.rack, a, INK)))}; good ${f2(contrast(C.good, over(C.rack, a, INK)))}; photo keeps ${f2(photoKeeps(a, over))}`);
// ink plate (Start workout): label in bar colour over ink-scrimmed photo; worst pixel = scrimmed highlight (4 % dot)
const hl = over(INK, 0.04, C.rack);
for (const a of [0.59, 0.60, 0.62, 0.84]) console.log(`ink plate a=${a}: worst px ${over(INK, a, hl)} (lin ${overLin(INK, a, hl)}); bar label ${f2(contrast(C.bar, over(INK, a, hl)))} enc / ${f2(contrast(C.bar, overLin(INK, a, hl)))} lin; photo keeps ${f2(contrast(over(INK, a, hl), over(INK, a, INK)))}`);
