// How wide Clear sky's hero figure is in Archivo Light (the native static 300),
// at 76 and 64px, for the widest strings its two sites can draw.
import opentype from 'opentype.js';
const f = opentype.loadSync('/Users/micahflunker/dev/vibes-night/wt/nat-v-clear-sky/assets/fonts/Archivo/Archivo_300.ttf');
const upm = f.unitsPerEm;
const adv = s => [...s].reduce((n, ch) => n + f.charToGlyph(ch).advanceWidth, 0);
for (const s of ['300,000', '100,000', '15,000', '-15,000', '9,999', '−2,450', '1.00', '0.75']) {
  const u = adv(s);
  console.log(JSON.stringify(s), '76px:', (u / upm * 76 * (1) - 0.02 * 76 * (s.length - 1)).toFixed(1), ' 64px:', (u / upm * 64 - 0.02 * 64 * (s.length - 1)).toFixed(1));
}
