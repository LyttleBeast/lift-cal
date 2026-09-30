// The web's heat lift table (vibes/chalk.css) against native's formula
// (theme.js T.chart.heat.lift, from src/state/vibe.js VIBE_DEFS.chalk.chart):
// every trained opacity .28-1.00 must land on the same value on both clients.
import { readFileSync } from 'node:fs';
const css = readFileSync('/Users/micahflunker/dev/vibes-night/wt/web-v-chalk/vibes/chalk.css', 'utf8');
const web = {};
for (const m of css.matchAll(/((?:\[data-vibe="chalk"\] \.heat rect\[fill-opacity="[0-9.]+"\],?\s*)+)\{ fill-opacity: ([0-9.]+); \}/g)) {
  for (const k of m[1].matchAll(/fill-opacity="([0-9.]+)"/g)) web[k[1]] = +m[2];
}
const d = 0.03, below = 0.52;
const lift = a => (a < below ? Math.round((a + d * (below - a) / (below - 0.28)) * 100) / 100 : a);
const bad = [];
for (let i = 28; i <= 100; i++) {
  const s = (i / 100).toFixed(2), a = Number(s);
  const w = web[s] != null ? web[s] : a, n = lift(a);
  if (w !== n) bad.push(s + ' web ' + w + ' native ' + n);
}
console.log(Object.keys(web).length + ' web rules; ' + (bad.length ? 'MISMATCH ' + bad.join(', ') : 'web and native agree at every opacity .28-1.00'));
process.exit(bad.length ? 1 : 0);
