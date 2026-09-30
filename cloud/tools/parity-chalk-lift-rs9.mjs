// Read-only probe: Chalk's web heat-strip opacity table (vibes/chalk.css) against
// native theme.js's lift formula with the registry's { d, below }, every 2dp
// opacity heatStrip can paint (0.28..1.00). Also dimOp.
import fs from 'node:fs';
const css = fs.readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-v-chalk/vibes/chalk.css', 'utf8');
const table = {};
const re = /((?:\[data-vibe="chalk"\] \.heat rect\[fill-opacity="[0-9.]+"\],?\s*)+)\{\s*fill-opacity:\s*([0-9.]+);\s*\}/g;
let m;
while ((m = re.exec(css))) {
  for (const k of m[1].matchAll(/fill-opacity="([0-9.]+)"/g)) table[k[1]] = Number(m[2]);
}
const lf = { d: 0.04, below: 0.70 };
const lift = a => (a < lf.below ? Math.round((a + lf.d * (lf.below - a) / (lf.below - 0.28)) * 100) / 100 : a);
let diffs = 0, n = 0;
for (let i = 28; i <= 100; i++) {
  const s = (i / 100).toFixed(2);
  const web = s in table ? table[s] : Number(s);
  const nat = lift(Number(s));
  n++;
  if (Math.abs(web - nat) > 1e-9) { diffs++; console.log('DIFF', s, 'web', web, 'nat', nat); }
}
console.log('table entries', Object.keys(table).length, 'compared', n, 'diffs', diffs);
const dim = css.match(/\.chart-bar-dim\s*\{\s*opacity:\s*([0-9.]+)/);
console.log('web dimOp', dim && dim[1]);
const reg = fs.readFileSync('/Users/micahflunker/dev/vibes-night/wt/nat-v-chalk/src/state/vibe.js', 'utf8');
console.log('native registry', (reg.match(/heat: \{[^\n]*\n\s*dimOp: [0-9.]+/) || [''])[0]);
