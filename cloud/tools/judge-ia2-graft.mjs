// Read-only judge helper (iron-age slot, judge 2): test the graft options on concept A's plates,
// and whether A's neutral pill ink reads as "grey". Prints only.
import { contrast, dE, simulate, lab } from '/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs';
const f = x => x.toFixed(2);
const kinds = ['normal', 'deutan', 'protan'];
function worst(g) {
  const k = Object.keys(g); const out = [];
  for (const kind of kinds) {
    let w = [1e9, ''];
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
      const d = dE(simulate(g[k[i]], kind), simulate(g[k[j]], kind)); if (d < w[0]) w = [d, k[i] + '/' + k[j]];
    }
    out.push(`${kind} ${f(w[0])} ${w[1]}`);
  }
  return out.join(' | ');
}
const base = { chest: '#82180c', back: '#1f4a72', legs: '#8b6600', shoulders: '#0e5f40', arms: '#2a241d', core: '#6a6d6c' };
const opts = {
  'A as specified': base,
  'A + B core #3a4450': { ...base, core: '#3a4450' },
  'A + B legs #785c00 + B core': { ...base, legs: '#785c00', core: '#3a4450' },
  'A + B legs #785c00 only': { ...base, legs: '#785c00' },
};
for (const [n, g] of Object.entries(opts)) console.log(n.padEnd(30), worst(g));
for (const h of ['#3a4450', '#785c00', '#8b6600'])
  console.log(h, 'text on rack', f(contrast(h, '#e6dec9')), 'grain', f(contrast(h, '#e0d8c4')), 'raised', f(contrast(h, '#d2cab7')));
// Chroma (CIELAB C*) of the candidate "grey" inks
for (const [n, h] of Object.entries({ 'A steel': '#4a3f31', 'A dim': '#5f5343', 'B dim': '#5a554d', 'v1 dim': '#5c6270' })) {
  const [L, a, b] = lab(h); console.log(n.padEnd(8), h, 'L*', f(L), 'C*', f(Math.hypot(a, b)), 'h', f((Math.atan2(b, a) * 180 / Math.PI + 360) % 360));
}
console.log('B dim as pill text on neutral .06 ink wash over bar ~', f(contrast('#5a554d', '#e0d9c4')));
