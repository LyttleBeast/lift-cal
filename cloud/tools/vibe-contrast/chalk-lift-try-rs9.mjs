// Try a { d, below } lift against r2-calc-rs9's test (same arithmetic): every
// trained cell .28–1.00, ink and Steps' green, >= min(3, v1's) against the
// untrained well and on the card.  node chalk-lift-try-rs9.mjs <tree> <d> <below>
import { pathToFileURL } from 'node:url';
const [TREE, d, below] = [process.argv[2], +process.argv[3], +process.argv[4]];
const C = (await import(pathToFileURL(TREE + '/vibes/defs/chalk.js').href)).default.colors;
const V = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default.colors;
const hx = v => (typeof v === 'string' ? v : v.web);
const rgb = h => { h = hx(h).replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => +((Math.max(Y(a), Y(b)) + 0.05) / (Math.min(Y(a), Y(b)) + 0.05)).toFixed(2);
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const lift = a => (a < below ? Math.round((a + d * (below - a) / (below - 0.28)) * 100) / 100 : a);
const bar = hx(C.bar), vbar = hx(V.bar);
const fails = [];
for (const [label, cF, vF] of [['ink', C.chalk, V.pYellow], ['steps', C.pGreen, V.pGreen]]) {
  let prev = 0;
  for (let k = 28; k <= 100; k++) {
    const s = Number((k / 100).toFixed(2)), a = lift(s);
    if (a < prev) fails.push(label + ' not monotonic at ' + s); prev = a;
    const cell = mix(cF, a, bar), vcell = mix(vF, s, vbar);
    const tu = CR(cell, C.well), vtu = CR(vcell, V.collar), b = CR(cell, bar), vb = CR(vcell, vbar);
    if (tu < Math.min(3, vtu) || b < Math.min(3, vb)) fails.push(`${label} ${s}->${a} tu ${tu} (v1 ${vtu}) bar ${b} (v1 ${vb})`);
  }
}
console.log('d', d, 'below', below, 'lift .28', lift(0.28), '.64', lift(0.64), 'fails', fails.length ? fails : 'none');
