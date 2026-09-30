// Judge 1, iron-age slot: re-check the numbers the three concepts quote.
// Read-only; prints to stdout. Uses track 4's colour library.
import { contrast as C, over, simulate, dE } from './colour/colour-lib.mjs';

const f = x => x.toFixed(2);
const line = (label, a, b) => console.log(label.padEnd(58), f(C(a, b)));

console.log('--- Concept A (r2g) ---');
const A = { rack: '#e6dec9', bar: '#ebe4ce', raised: '#d2cab7', grain: '#e0d8c4', chalk: '#1c1712', dim: '#5f5343',
  accent: '#a1374f', pY: '#8b6600', pC: '#6a6d6c', pB: '#1f4a72', good: '#0e5f40', warn: '#6e4d08', bad: '#82180c', knurl: '#7b6c52' };
line('A accent on rack', A.accent, A.rack);
line('A accent on grain darkest', A.accent, A.grain);
line('A accent on raised (claimed 4.05 fail)', A.accent, A.raised);
line('A pYellow on rack (claimed 3.92)', A.pY, A.rack);
line('A pYellow on grain darkest', A.pY, A.grain);
line('A pChrome on rack', A.pC, A.rack);
line('A dim on grain darkest', A.dim, A.grain);
line('A knurl on rack', A.knurl, A.rack);
line('A dropRail pBlue .75 over rack', over(A.pB, 0.75, A.rack), A.rack);
const pillUp = over(A.good, 0.10, A.rack);
line('A good text on pillUp (.10 over rack)', A.good, pillUp);
line('A bad text on pillDown', A.bad, over(A.bad, 0.10, A.rack));
line('A warn on pillWarn', A.warn, over(A.warn, 0.10, A.rack));
line('A accent on setDone (done .07 over rack)', A.accent, over(A.good, 0.07, A.rack));
const scrimA = over(A.rack, 0.536, A.chalk);
line('A ink on stock-scrim .536 over solid ink', A.chalk, scrimA);
line('A photo kept (ink-under-scrim vs stock-under-scrim)', scrimA, A.rack);
const inkPlate = over(A.chalk, 0.60, A.rack);
line('A knockout #ebe4ce on ink plate .60 over stock', '#ebe4ce', inkPlate);

console.log('--- Concept B (r2g, fresh grain) ---');
const B = { rack: '#e6dec9', bar: '#ebe4ce', well: '#e8ddd1', raised: '#dad4bf', grain: '#e3dcc7', dim: '#5a554d', accent: '#a1374f',
  pR: '#772020', pB: '#2b6189', pY: '#785c00', pG: '#016d50', pW: '#181412', pC: '#3a4450', chalk: '#1c1712' };
for (const k of ['pR', 'pB', 'pY', 'pG', 'pW', 'pC']) line('B ' + k + ' on grain darkest', B[k], B.grain);
line('B pYellow on raised (claimed 4.25)', B.pY, B.raised);
line('B good(pG) on well', B.pG, B.well);
line('B accent on grain', B.accent, B.grain);
line('B dim on raised', B.dim, B.raised);
const setDoneB = over('#fffcf2', 0.5, B.rack);
line('B done strip vs rack (visibility of done row)', setDoneB, B.rack);
const scrimB = over(B.rack, 0.54, B.chalk);
line('B ink on stock-scrim .54 over solid ink', B.chalk, scrimB);

console.log('--- Concept C (r2g, original plates) ---');
const Cc = { rack: '#e6dec9', bar: '#ebe4ce', well: '#e0d7c0', raised: '#dbd1b8', knurl: '#84775f', collar: '#cfc4a9', dim: '#5f5343', accent: '#a1374f',
  pY: '#90620b', pC: '#6a6d6c', good: '#0e5f40', steel: '#4a3f31', chalk: '#1c1712' };
line('C pYellow on rack (claimed 3.98)', Cc.pY, Cc.rack);
line('C knurl on rack (claimed 3.27)', Cc.knurl, Cc.rack);
line('C knurl on bar', Cc.knurl, Cc.bar);
line('C dim on setDone (done .10 over rack; claimed 4.82)', Cc.dim, over(Cc.good, 0.10, Cc.rack));
line('C accent on well', Cc.accent, Cc.well);
line('C accent on grain est #e4dcc7', Cc.accent, '#e4dcc7');
line('C steel on rack (notes, Old Standard 13)', Cc.steel, Cc.rack);
line('C reviewBorder accent .78 over bar vs bar', over(Cc.accent, 0.78, Cc.bar), Cc.bar);

console.log('--- CVD: worst pairwise dE00 among the six groups ---');
const sets = {
  A: ['#82180c', '#1f4a72', '#8b6600', '#0e5f40', '#2a241d', '#6a6d6c'],
  B: ['#772020', '#2b6189', '#785c00', '#016d50', '#181412', '#3a4450'],
  C: ['#82180c', '#1f4a72', '#90620b', '#0e5f40', '#2a241d', '#6a6d6c']
};
const names = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
for (const [k, s] of Object.entries(sets)) {
  for (const kind of ['normal', 'deutan', 'protan']) {
    let min = 1e9, pair = '';
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
      const d = dE(simulate(s[i], kind), simulate(s[j], kind));
      if (d < min) { min = d; pair = names[i] + '/' + names[j]; }
    }
    console.log((k + ' ' + kind).padEnd(30), f(min), pair);
  }
}
console.log('--- good vs bad under CVD ---');
for (const [k, g, b] of [['A/C', '#0e5f40', '#82180c'], ['B', '#016d50', '#772020']]) {
  for (const kind of ['normal', 'deutan', 'protan']) console.log((k + ' ' + kind).padEnd(30), f(dE(simulate(g, kind), simulate(b, kind))));
}
console.log('--- the "yellow" plates: hue check (OKLCH-ish via hex) ---');
for (const h of ['#8b6600', '#785c00', '#90620b']) console.log(h, 'dE00 to #f0be1e (v1 yellow)', f(dE(h, '#f0be1e')), ' to #6e4d08 (warn)', f(dE(h, '#6e4d08')));
