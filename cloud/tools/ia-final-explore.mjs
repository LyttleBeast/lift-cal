// Iron Age final spec: quick exploration of the grafted palette before the def is
// written. Read-only, prints only.
import { contrast, over, simulate, dE, lab, hexToRgb, toLin } from '/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs';
import { nearestTW } from '/Users/micahflunker/dev/vibes-night/tools/colour/tailwind.mjs';

const oklch = hex => {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360].map(v => +v.toFixed(3));
};
const f = n => n.toFixed(2);
const rack = '#e6dec9', bar = '#ebe4ce', raised = '#d2cab7', grain = '#e0d8c4', ink = '#1c1712';
for (const [n, h] of [['dimA', '#5f5343'], ['dimB', '#5a554d'], ['steel', '#4a3f31'], ['pYellow', '#8b6600'], ['warn', '#6e4d08'], ['accent', '#a1374f']]) {
  console.log(n, h, 'oklch', oklch(h).join(' '), '| rack', f(contrast(h, rack)), 'bar', f(contrast(h, bar)), 'raised', f(contrast(h, raised)),
    'grain', f(contrast(h, grain)), 'done-row', f(contrast(h, over('#0e5f40', 0.07, rack))), 'press', f(contrast(h, over(ink, 0.04, rack))),
    'pillBase', f(contrast(h, over(ink, 0.06, rack))), 'chosen', f(contrast(h, over(ink, 0.06, bar))));
}
console.log('scrim .54 over ink (encoded):', over(rack, 0.54, ink), 'ink on it', f(contrast(ink, over(rack, 0.54, ink))), 'photo kept', f(contrast(rack, over(rack, 0.54, ink))));
for (const [n, h, a] of [['pillUp good', '#0e5f40', 0.1], ['pillDown bad', '#82180c', 0.1], ['pillWarn warn', '#6e4d08', 0.1]]) {
  const bg = over(h, a, rack);
  console.log(n, bg, 'text', f(contrast(h, bg)), '| on grain-based', f(contrast(h, over(h, a, grain))));
}
console.log('dim on pillBase (grain)', f(contrast('#5a554d', over(ink, 0.06, grain))));
console.log('TW', ['#5a554d', '#a1374f', rack, bar].map(h => h + ' ' + nearestTW(h).join(' ')).join(' | '));
