// Iron Age contrast, round after-revise-3-rs10: panel round 3 inks a Steps day
// short of the goal in the Steps subject's plate (pWhite) and the goal met in
// good. The two against each other (normal / deutan / protan ΔE00, and their
// luminance ratio), each on the page and bar, and the heat strip's faintest
// remapped cell (pWhite .70) against an untrained one (collar). v1 beside it.
import { pathToFileURL } from 'node:url';
const TREE = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const C = (await import(pathToFileURL(TREE + '/vibes/defs/iron-age.js').href)).default.colors;
const V1 = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default.colors;
const LIB = await import('/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs');
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const row = (label, a, b) => console.log(label.padEnd(46), a, 'vs', b, CR(a, b).toFixed(2) + ':1', 'ΔE00',
  [LIB.dE(a, b), LIB.dE(LIB.simulate(a, 'deutan'), LIB.simulate(b, 'deutan')), LIB.dE(LIB.simulate(a, 'protan'), LIB.simulate(b, 'protan'))].map(x => x.toFixed(2)).join(' / '));
console.log('== iron-age');
row('met (good) vs short (pWhite)', C.good, C.pWhite);
for (const g of ['rack', 'bar']) { row(`short pWhite on ${g}`, C.pWhite, C[g]); row(`met good on ${g}`, C.good, C[g]); }
for (const g of ['rack', 'bar']) row(`heat pWhite .70 on ${g} vs collar`, mix(C.pWhite, 0.7, C[g]), C.collar);
row('heat pWhite .70 vs pWhite 1 (on bar)', mix(C.pWhite, 0.7, C.bar), C.pWhite);
row('ring arc short pWhite vs knurl ticks', C.pWhite, C.knurl);
row('ring arc met good vs knurl ticks', C.good, C.knurl);
console.log('== v1');
row('met (good) vs short (pGreen)', V1.good, V1.pGreen);
