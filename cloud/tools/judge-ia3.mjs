// Judge 3 of 3, iron-age slot: recompute the numbers the three concepts quote.
// Read-only; prints to stdout.
import { contrast, over, simulate, dE, hexToRgb, toLin } from './colour/colour-lib.mjs';

const f = x => x.toFixed(2);
const oklch = hex => {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
  const C = Math.hypot(A, B);
  let h = Math.atan2(B, A) * 180 / Math.PI; if (h < 0) h += 360;
  return `L ${L.toFixed(3)} C ${C.toFixed(3)} h ${h.toFixed(0)}`;
};

const concepts = {
  A: { rack: '#e6dec9', bar: '#ebe4ce', raised: '#d2cab7', grainDark: '#e0d8c4', chalk: '#1c1712', steel: '#4a3f31', dim: '#5f5343',
       accent: '#a1374f', good: '#0e5f40', warn: '#6e4d08', bad: '#82180c', knurl: '#7b6c52',
       plates: { chest: '#82180c', back: '#1f4a72', legs: '#8b6600', shoulders: '#0e5f40', arms: '#2a241d', core: '#6a6d6c' },
       zones: [['pBlue', '#1f4a72', .18], ['pYellow', '#8b6600', .20], ['pRed', '#82180c', .16]] },
  B: { rack: '#e6dec9', bar: '#ebe4ce', raised: '#dad4bf', well: '#e8ddd1', grainDark: '#e3dcc7', chalk: '#1c1712', steel: '#4a3f31', dim: '#5a554d',
       accent: '#a1374f', good: '#016d50', warn: '#6e4d08', bad: '#772020', knurl: '#7b6c52',
       plates: { chest: '#772020', back: '#2b6189', legs: '#785c00', shoulders: '#016d50', arms: '#181412', core: '#3a4450' },
       zones: [['pBlue', '#2b6189', .14], ['pYellow', '#785c00', .16], ['pRed', '#772020', .14]] },
  C: { rack: '#e6dec9', bar: '#ebe4ce', raised: '#dbd1b8', well: '#e0d7c0', grainDark: '#e4dcc7', chalk: '#1c1712', steel: '#4a3f31', dim: '#5f5343',
       accent: '#a1374f', good: '#0e5f40', warn: '#6e4d08', bad: '#82180c', knurl: '#84775f',
       plates: { chest: '#82180c', back: '#1f4a72', legs: '#90620b', shoulders: '#0e5f40', arms: '#2a241d', core: '#6a6d6c' },
       zones: [['pBlue', '#1f4a72', .14], ['pYellow', '#90620b', .18], ['pRed', '#82180c', .12]] },
};

for (const [k, c] of Object.entries(concepts)) {
  console.log(`\n=== Concept ${k} ===`);
  const grounds = { rack: c.rack, bar: c.bar, raised: c.raised, grainDark: c.grainDark };
  if (c.well) grounds.well = c.well;
  for (const role of ['chalk', 'steel', 'dim', 'accent', 'good', 'warn', 'bad']) {
    console.log(role.padEnd(7), Object.entries(grounds).map(([g, h]) => `${g} ${f(contrast(c[role], h))}`).join('  '));
  }
  console.log('knurl on rack/bar', f(contrast(c.knurl, c.rack)), f(contrast(c.knurl, c.bar)));
  console.log('plates as text on rack / grainDark / bar:');
  for (const [g, h] of Object.entries(c.plates)) console.log('  ', g.padEnd(9), h, f(contrast(h, c.rack)), f(contrast(h, c.grainDark)), f(contrast(h, c.bar)), oklch(h));
  // CVD minimum pairwise
  for (const kind of ['normal', 'deutan', 'protan']) {
    const e = Object.entries(c.plates).map(([g, h]) => [g, simulate(h, kind)]);
    let min = [99]; for (let i = 0; i < e.length; i++) for (let j = i + 1; j < e.length; j++) { const d = dE(e[i][1], e[j][1]); if (d < min[0]) min = [d, e[i][0], e[j][0]]; }
    console.log(`CVD ${kind}: min ${f(min[0])} ${min[1]}/${min[2]}   good/bad ${f(dE(simulate(c.good, kind), simulate(c.bad, kind)))}`);
  }
  console.log('accent->chest normal', f(dE(c.accent, c.plates.chest)));
  console.log('zone washes over bar (named blue / yellow / red):');
  for (const [n, h, a] of c.zones) { const x = over(h, a, c.bar); console.log('  ', n, a, x, oklch(x)); }
  console.log('arms vs chalk dE', f(dE(c.plates.arms, c.chalk)));
}
console.log('\nYellow hues: A', oklch('#8b6600'), '| B', oklch('#785c00'), '| C', oklch('#90620b'), '| research fill #dcbc33', oklch('#dcbc33'));
console.log('v1 yellow #f0be1e', oklch('#f0be1e'));
// B setDone strip vs rack; A/C done wash
console.log('B done strip #f3edde vs rack', f(contrast('#f3edde', '#e6dec9')), '| B inked box vs strip', f(contrast('#1c1712', '#f3edde')));
console.log('A done wash .07 over rack', over('#0e5f40', .07, '#e6dec9'), f(contrast(over('#0e5f40', .07, '#e6dec9'), '#e6dec9')), '| viridian box vs rack', f(contrast('#0e5f40', '#e6dec9')));
console.log('C done wash .10 over rack', over('#0e5f40', .10, '#e6dec9'), f(contrast(over('#0e5f40', .10, '#e6dec9'), '#e6dec9')));
// C set-check edge in knurl
console.log('C check edge knurl #84775f on rack', f(contrast('#84775f', '#e6dec9')));
// photo scrim: ink over the scrimmed darkest pixel
for (const a of [.526, .536, .54]) { const px = over('#e6dec9', a, '#1c1712'); console.log('scrim', a, px, 'ink text', f(contrast('#1c1712', px)), 'photo keeps (stock vs darkest)', f(contrast('#e6dec9', px))); }
// B free band .30
{ const px = over('#e6dec9', .30, '#1c1712'); console.log('B free band .30 photo keeps', f(contrast('#e6dec9', px))); }
// A ink plate baked .60 knockout
{ const px = over('#1c1712', .60, '#e6dec9'); console.log('A ink plate .60 lightest px', px, 'knockout #ebe4ce on it', f(contrast('#ebe4ce', px))); }
