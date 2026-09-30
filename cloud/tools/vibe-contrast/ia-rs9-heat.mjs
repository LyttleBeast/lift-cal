// Iron Age heat strip (fix gates-1-rs9): trained cells in colour `on` at a
// remapped opacity a' = F + (1 - F)(a - .28)/.72 (linear, monotonic, 1 at 1),
// untrained in collar. Finds the smallest F (2 decimals) with every cell at
// 3:1 on the page and on the grain's darkest pixel, prints the CSS table.
import { pathToFileURL } from 'node:url';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const D = (await import(pathToFileURL(TREE + '/vibes/defs/iron-age.js').href)).default.colors;
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const GRAIN = '#e0d8c4', rack = D.rack, bar = D.bar, collar = D.collar;
const map = (a, F) => Math.round((F + (1 - F) * (a - 0.28) / 0.72) * 100) / 100;
const worst = (on, F) => {
  let m = 99;
  for (let i = 28; i <= 100; i++) { const a2 = map(i / 100, F); for (const g of [rack, GRAIN]) m = Math.min(m, CR(mix(on, a2, g), g)); }
  return m;
};
const out = {};
for (const [n, on] of [['pYellow', D.pYellow], ['warn', D.warn], ['pGreen', D.pGreen]]) {
  let F = 0.28; while (F < 1 && worst(on, F) < 3) F = Math.round((F + 0.01) * 100) / 100;
  out[n] = F;
  const faint = mix(on, F, rack);
  console.log(`${n} ${on}: full on rack ${CR(on, rack).toFixed(2)}; .28 as-is ${CR(mix(on, .28, rack), rack).toFixed(2)}; floor F=${F} -> ${faint} rack ${CR(faint, rack).toFixed(2)} grain ${CR(mix(on, F, GRAIN), GRAIN).toFixed(2)} vs collar ${CR(faint, collar).toFixed(2)}`);
}
const F = Math.max(out.warn, out.pGreen);
console.log('shared floor', F, 'warn worst', worst(D.warn, F).toFixed(2), 'pGreen worst', worst(D.pGreen, F).toFixed(2));
// the steps between neighbouring volumes that the remap keeps apart
const distinct = new Set(); for (let i = 28; i <= 100; i++) distinct.add(map(i / 100, F));
console.log('distinct opacities after the remap', distinct.size, 'of 73');
if (process.argv[2] === 'css') {
  const groups = {};
  for (let i = 28; i < 100; i++) { const a = (i / 100).toFixed(2), a2 = map(i / 100, F).toFixed(2); (groups[a2] ||= []).push(a); }
  for (const [a2, as] of Object.entries(groups)) console.log(as.map(a => `[data-vibe="iron-age"] .heat rect[fill-opacity="${a}"]`).join(',\n') + ` { fill-opacity: ${a2.replace(/^0/, '')}; }`);
}
