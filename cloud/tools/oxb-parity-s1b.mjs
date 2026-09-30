// Ten-role spot check: the web's generated block (vibes/oxblood.css) vs the native build (theme.js build()).
import { readFileSync } from 'node:fs';
const NROOT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood';
const css = readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood/vibes/oxblood.css', 'utf8');
const cv = n => { const m = css.match(new RegExp('\\s' + n.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+);')); return m ? m[1].trim() : null; };
const L = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0); };
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
console.log('grip #7c5d62 on bar #241518 (sheet ground):', cr('#7c5d62', '#241518').toFixed(2));
console.log('knurl #846368 on bar #241518:', cr('#846368', '#241518').toFixed(2));
console.log('grip on rack #1a0f11:', cr('#7c5d62', '#1a0f11').toFixed(2));
console.log('steel on raised (flat tag):', cr('#bcaaa4', '#352125').toFixed(2));

const { open } = await import(NROOT + '/tools/lib/vibe-snap.mjs');
const H = await open(NROOT);
const R = H.R;
const THEME = R.load('src/ui/theme.js');
const V = R.load('src/state/vibe.js');
const e = V.VIBE_DEFS.oxblood;
const B = THEME.build(e.def, { images: e.images, fit: e.fit, chart: e.chart });
const rgbOf = s => s.replace(/\s/g, '');
const rows = [
  ['colors.bar', cv('--bar'), B.colors.bar],
  ['colors.collar', cv('--collar'), B.colors.collar],
  ['colors.knurl', cv('--knurl'), B.colors.knurl],
  ['colors.grip', cv('--grip'), B.colors.grip],
  ['colors.accent', cv('--accent'), B.colors.accent],
  ['colors.onAccent (--ink)', cv('--ink'), B.colors.onAccent],
  ['colors.inverse', cv('--inverse'), B.colors.inverse],
  ['colors.raised', cv('--raised'), B.colors.raised],
  ['colors.pChrome', cv('--p-chrome'), B.colors.pChrome],
  ['tagInk.W', cv('--tag-ink-w'), B.tagInk && B.tagInk.W],
  ['tint.dockGlass (rack-rgb @ .82)', 'rgba(' + cv('--rack-rgb') + ',0.82)', B.tint.dockGlass],
  ['radius.r', cv('--r'), B.radius.r + 'px'],
  ['radius.sm', cv('--r-sm'), B.radius.sm + 'px'],
  ['radius.plate', cv('--r-plate'), B.radius.plate + 'px'],
  ['face (web --font head / native text.body family)', cv('--font'), B.text && B.text.body && B.text.body.fontFamily],
];
for (const [k, w, n] of rows) {
  const same = rgbOf(String(w).toLowerCase()) === rgbOf(String(n).toLowerCase());
  console.log((same ? 'SAME ' : 'LOOK ') + k + '  web=' + w + '  native=' + n);
}
process.exit(0);
