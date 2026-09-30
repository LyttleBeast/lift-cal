// Heat strip remap search for chalk (gates-1-rs9): trained cells in `on` at a
// lifted opacity a' = a + d(B - a)/(B - .28) below B (monotonic, tapering to
// no lift at B), untrained in `off`. Prints the table the web CSS carries.
import { pathToFileURL } from 'node:url';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/web-v-chalk';
const V = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default.colors;
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const on = process.argv[2] || '#111416', off = process.argv[3] || '#e8ebeb', d = +(process.argv[4] || 0.03), B = +(process.argv[5] || 0.52);
const bar = '#f8fafa';
const lift = a => (a < B ? Math.round((a + d * (B - a) / (B - 0.28)) * 100) / 100 : a);
const short = [], table = [];
let prev = -1, mono = true;
for (let i = 28; i <= 100; i++) {
  const a = i / 100, a2 = lift(a);
  if (a2 < prev) mono = false;
  prev = a2;
  if (a2 !== a) table.push([a.toFixed(2), a2]);
  const v1 = CR(mix(V.pYellow, a, V.bar), V.bar), c = CR(mix(on, a2, bar), bar);
  if (c < Math.min(3, v1)) short.push(a.toFixed(2) + '→' + a2 + ' ' + c.toFixed(2) + '<' + Math.min(3, v1).toFixed(2));
}
const faint = mix(on, lift(0.28), bar);
console.log('on', on, 'off', off, 'd', d, 'B', B, 'monotonic', mono);
console.log('faint', faint, 'vs off', CR(faint, off).toFixed(2), '(v1 1.69) faint on bar', CR(faint, bar).toFixed(2), 'off on bar', CR(off, bar).toFixed(2), '(v1', CR(V.collar, V.bar).toFixed(2) + ')');
console.log(short.length ? 'SHORT: ' + short.join(', ') : 'every trained cell >= min(3, v1) at its opacity');
console.log('lifted:', table.length, JSON.stringify(table));
