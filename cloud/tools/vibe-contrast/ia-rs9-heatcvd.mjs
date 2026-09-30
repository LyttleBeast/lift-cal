// Iron Age fix round gates-1-rs9: the heat strip after the remap — the
// faintest trained cell (warn at .70; Steps' green at .70) against an
// untrained one (collar), on the page and on bar, in ΔE00 normal / deutan /
// protan (colour-lib), beside cvd.mjs's model of the pinned default (.28).
import { pathToFileURL } from 'node:url';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const C = (await import(pathToFileURL(TREE + '/vibes/defs/iron-age.js').href)).default.colors;
const V1 = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default.colors;
const LIB = await import('/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs');
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const row = (label, a, b) => console.log(label.padEnd(44), a, 'vs', b, CR(a, b).toFixed(2) + ':1', 'ΔE00',
  [LIB.dE(a, b), LIB.dE(LIB.simulate(a, 'deutan'), LIB.simulate(b, 'deutan')), LIB.dE(LIB.simulate(a, 'protan'), LIB.simulate(b, 'protan'))].map(x => x.toFixed(2)).join(' / '));
for (const g of ['rack', 'bar']) {
  row(`warn .70 on ${g} vs collar`, mix(C.warn, 0.7, C[g]), C.collar);
  row(`pGreen .70 on ${g} vs collar`, mix(C.pGreen, 0.7, C[g]), C.collar);
  row(`(before) pYellow .28 on ${g} vs collar`, mix(C.pYellow, 0.28, C[g]), C.collar);
}
row('v1: pYellow .28 on bar vs collar', mix(V1.pYellow, 0.28, V1.bar), V1.collar);
