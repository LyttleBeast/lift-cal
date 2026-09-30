// Synthesis check (read-only, computed): what track 7 G.2's `book` grain costs on
// track 4's r2g stock, and the CIE76 distance behind C8.
// The grain is baked multiplicatively per channel (07 G.2.2: c' = round(c * (1 + n))).
// The darkest `book` pixel on #ede3cc is #e4dac4 (07 G.2.3); its per-channel factor
// is applied to #e6dec9 here. Uses track 4's colour-lib.
import { hexToRgb, rgbToHex, contrast, lab, de76, dE } from './colour/colour-lib.mjs';

const flat = '#ede3cc', dark = '#e4dac4';
const f = hexToRgb(flat), d = hexToRgb(dark);
const k = d.map((v, i) => v / f[i]);
console.log('book darkest-pixel factors on #ede3cc', k.map((x) => x.toFixed(4)).join(' '));

const r2g = '#e6dec9';
const r2gDark = rgbToHex(hexToRgb(r2g).map((v, i) => Math.round(v * k[i])));
console.log('r2g stock', r2g, '-> darkest book pixel (scaled)', r2gDark);

const toks = {
  ink: '#1c1712', steel: '#4a3f31', dim: '#5f5343', accent: '#a1374f',
  pRed: '#82180c', pBlue: '#1f4a72', pGreen: '#0e5f40', warn: '#6e4d08',
  pWhite: '#2a241d', pYellow: '#90620b', pChrome: '#6a6d6c',
};
console.log('token | on #ede3cc flat | on #e4dac4 | on r2g flat | on r2g darkest');
for (const [n, h] of Object.entries(toks)) {
  const row = [flat, dark, r2g, r2gDark].map((g) => contrast(h, g).toFixed(2));
  console.log(n, h, row.join(' | '));
}

console.log('C8: #0b0b0b vs #07080a  dE00', dE('#0b0b0b', '#07080a').toFixed(2),
  ' dE76 (CIE76, dE*ab)', de76(lab('#0b0b0b'), lab('#07080a')).toFixed(2));
