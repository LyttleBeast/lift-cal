// One-off pair arithmetic for the chalk contrast gate (rs9): the pairs the
// render walks cannot read (native Switch track/thumb, :active states whose
// background the collector could not parse).
import { pathToFileURL } from 'node:url';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/web-v-chalk';
const C = (await import(pathToFileURL(TREE + '/vibes/defs/chalk.js').href)).default.colors;
const V = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default.colors;
const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const hx = v => (typeof v === 'string' ? v : v.native || v.web);
for (const [n, c] of [['chalk', C], ['v1', V]]) {
  const bar = hx(c.bar), acc = hx(c.accent);
  const on = mix(acc, 0.28, bar);
  console.log(`[${n}] Switch off: thumb steel ${c.steel} on grip ${c.grip} ${CR(c.steel, c.grip)}; grip on bar ${CR(c.grip, bar)}`);
  console.log(`[${n}] Switch on: track accent .28 ${on} on bar ${CR(on, bar)}; thumb accent on it ${CR(acc, on)}; thumb accent on bar ${CR(acc, bar)}`);
  const dz = mix(hx(c.danger), 0.12, bar), az = mix(acc, 0.12, bar);
  console.log(`[${n}] .ex-del:active danger on danger .12 ${dz}: ${CR(hx(c.danger), dz)}; .ex-edit:active accent on accent .12 ${az}: ${CR(acc, az)}`);
  const lf = mix(hx(c.lift), n === 'chalk' ? 0.05 : 0.04, bar);
  console.log(`[${n}] .set-row-nav:active ground ${lf}: chalk ink ${CR(hx(c.chalk), lf)}, dim ${CR(hx(c.dim), lf)}`);
  console.log(`[${n}] pYellow text on rack ${CR(hx(c.pYellow), hx(c.rack))}, on bar ${CR(hx(c.pYellow), bar)}; warn on rack ${CR(hx(c.warn), hx(c.rack))}; accent on rack ${CR(acc, hx(c.rack))}`);
}
