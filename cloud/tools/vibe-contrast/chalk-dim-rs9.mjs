// The dimmed bar (a day not over) for chalk (gates-1-rs9): each data colour at
// opacity `op` on its .35 track backdrop over bar, against v1 at .38.
import { pathToFileURL } from 'node:url';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/web-v-chalk';
const C = (await import(pathToFileURL(TREE + '/vibes/defs/chalk.js').href)).default.colors;
const V = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default.colors;
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
for (const op of process.argv.slice(2).map(Number)) {
  const vb = mix(V.track, 0.35, V.bar), cb = mix(C.track, 0.35, C.bar);
  const row = ['pYellow', 'pBlue', 'pRed', 'pWhite', 'pGreen', 'pChrome'].map(k => {
    const v1 = CR(mix(V[k], 0.38, vb), vb), c = CR(mix(C[k], op, cb), cb), onBar = CR(mix(C[k], op, C.bar), C.bar), full = CR(C[k], cb);
    return k + ' ' + c.toFixed(2) + (c >= Math.min(3, v1) ? '' : '!') + ' (v1 ' + v1.toFixed(2) + ', on bar ' + onBar.toFixed(2) + ', full ' + full.toFixed(2) + ')';
  });
  console.log('op ' + op + ': ' + row.join(' | '));
}
