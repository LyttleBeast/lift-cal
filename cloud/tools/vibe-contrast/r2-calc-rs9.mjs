// Chalk contrast round 2 (rs9): the chart arithmetic, read from the tree's own
// files — the heat strip's opacity lift from vibes/chalk.css, the dim-bar
// opacity from the same, the colours from the definitions. Checks every cell
// opacity .28–1.00 the pinned modules can emit (op.toFixed(2)) for both the
// Train heat strip (pYellow -> ink) and Steps' (pGreen), against v1's.
//   node r2-calc-rs9.mjs <web tree>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const TREE = process.argv[2];
const C = (await import(pathToFileURL(TREE + '/vibes/defs/chalk.js').href)).default.colors;
const V = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default.colors;
const css = readFileSync(TREE + '/vibes/chalk.css', 'utf8');
const hx = v => (typeof v === 'string' ? v : v.web);
const rgb = h => { h = hx(h).replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => +((Math.max(Y(a), Y(b)) + 0.05) / (Math.min(Y(a), Y(b)) + 0.05)).toFixed(2);
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));

// the lift table, from the stylesheet: every rule's selector list -> value
const lift = new Map();
for (const m of css.matchAll(/((?:\[data-vibe="chalk"\] \.heat rect\[fill-opacity="[0-9.]+"\],?\s*)+)\{\s*fill-opacity:\s*([0-9.]+)\s*;\s*\}/g)) {
  for (const s of m[1].matchAll(/fill-opacity="([0-9.]+)"/g)) lift.set(s[1], +m[2]);
}
const inkRule = /\.heat rect\[fill="var\(--p-yellow\)"\]\s*\{\s*fill:\s*var\(--chalk\)/.test(css);
const wellRule = /\.heat rect\[fill="var\(--collar\)"\]\s*\{\s*fill:\s*var\(--well\)/.test(css);
const dimM = css.match(/\[data-vibe="chalk"\] \.chart-bar-dim\s*\{\s*opacity:\s*([0-9.]+)/);
console.log('css: ink rule', inkRule, 'well rule', wellRule, 'lift entries', lift.size, 'dim', dimM && dimM[1]);

const bar = hx(C.bar), vbar = hx(V.bar);
let worst = { tu: Infinity, bar: Infinity }, fails = [];
for (const [label, cFill, vFill] of [['train (ink)', inkRule ? C.chalk : C.pYellow, V.pYellow], ['steps (pGreen)', C.pGreen, V.pGreen]]) {
  const un = wellRule ? C.well : C.collar;
  let prevA = 0, mono = true;
  for (let k = 28; k <= 100; k++) {
    const s = (k / 100).toFixed(2), a = lift.has(s) ? lift.get(s) : +s;
    if (a < prevA) mono = false; prevA = a;
    const cell = mix(cFill, a, bar), vcell = mix(vFill, +s, vbar);
    const r = { s, a, tu: CR(cell, un), vtu: CR(vcell, V.collar), bar: CR(cell, bar), vbar: CR(vcell, vbar) };
    const okTU = r.tu >= Math.min(3, r.vtu), okBar = r.bar >= Math.min(3, r.vbar);
    if (!okTU || !okBar) fails.push(label + ' ' + JSON.stringify(r));
    if (k === 28 || k === 40 || k === 52 || k === 76 || k === 100) console.log(label.padEnd(15), s, '->', a, 'cell', cell, 'vs untrained', r.tu, '(v1', r.vtu + ')', 'on card', r.bar, '(v1', r.vbar + ')');
  }
  console.log(label, 'monotonic', mono);
}
console.log('untrained vs card: chalk', CR(wellRule ? C.well : C.collar, bar), 'v1', CR(V.collar, vbar));
console.log('heat fails:', fails.length ? fails : 'none');

// the dimmed bar: each plate at the dim opacity over the bar's .35 track backdrop on the card
const dim = dimM ? +dimM[1] : 0.38;
const back = mix(C.track, 0.35, bar), vback = mix(V.track, 0.35, vbar);
for (const k of ['pYellow', 'pBlue', 'pRed', 'pWhite', 'pGreen', 'pChrome']) {
  const c = CR(mix(C[k], dim, back), back), v = CR(mix(V[k], 0.38, vback), vback), cb = CR(mix(C[k], dim, bar), bar), vb = CR(mix(V[k], 0.38, vbar), vbar);
  console.log('dim bar', k.padEnd(8), 'on track', c, '(v1', v + ')', 'on card', cb, '(v1', vb + ')', c >= Math.min(3, v) && cb >= Math.min(3, vb) ? 'ok' : 'WORSE');
  // and the finished bar still reads apart from the dimmed one
  console.log('         full vs dim', CR(C[k], mix(C[k], dim, bar)), '(v1', CR(V[k], mix(V[k], 0.38, vbar)) + ')');
}
// cal ring arithmetic: tick ring chalk .7, head/target chalk .9, on the track
const track = hx(C.track);
console.log('tick ring chalk .7 on track', CR(mix(C.chalk, 0.7, track), track), '; at .85 group opacity', CR(mix(C.chalk, 0.7 * 0.85, track), track));
console.log('head/target ring chalk .9 on track', CR(mix(C.chalk, 0.9, track), track));
for (const [z, k, a] of [['cut', 'pBlue', 0.16], ['hold', 'pYellow', 0.18], ['gain', 'pRed', 0.16]]) {
  const band = mix(C[k], a, track);
  console.log('tick ring .7 over zone', z, band, CR(mix(C.chalk, 0.7 * 0.85, band), band));
}
