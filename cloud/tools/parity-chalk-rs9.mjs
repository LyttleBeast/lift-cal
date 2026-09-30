// Parity gate (chalk, round 2-rs9): native T.chart against vibes/chalk.css's chart rules,
// and the in-card / card-edge seams under Chalk and v1. Read-only.
import { readFileSync } from 'node:fs';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-chalk';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-chalk';
const { open } = await import(NAT + '/tools/lib/vibe-snap.mjs');
const H = await open(NAT);
const { R } = H;
const THEME = R.load('src/ui/theme.js');
const V = R.load('src/state/vibe.js');
const e = V.VIBE_DEFS.chalk;
THEME.applyTheme(THEME.build(e.def, { images: e.images, fit: e.fit, chart: e.chart }));
const T = THEME.default;
console.log('T.chart:', JSON.stringify(T.chart, (k, v) => typeof v === 'function' ? 'fn' : v));
const css = readFileSync(WEB + '/vibes/chalk.css', 'utf8');
// parse the heat opacity table
const table = {};
const re = /((?:\[data-vibe="chalk"\] \.heat rect\[fill-opacity="[0-9.]+"\],?\s*)+)\{ fill-opacity: ([0-9.]+); \}/g;
let m;
while ((m = re.exec(css))) {
  for (const s of m[1].matchAll(/fill-opacity="([0-9.]+)"/g)) table[s[1]] = Number(m[2]);
}
let bad = 0, n = 0;
for (let i = 0; i <= 72; i++) {
  const a = Number((0.28 + i / 100).toFixed(2));
  const key = a.toFixed(2);
  const web = key in table ? table[key] : a;
  const nat = T.chart.heat.lift(a);
  n++;
  if (Math.abs(web - nat) > 1e-9) { bad++; console.log('LIFT DIFF', key, 'web', web, 'nat', nat); }
}
console.log('lift compared', n, 'opacities (.28-1.00), diffs', bad);
const dimWeb = /\.chart-bar-dim \{ opacity: ([0-9.]+); \}/.exec(css);
console.log('dimOp web', dimWeb && dimWeb[1], 'nat', T.chart.dimOp);
console.log('heat on nat', T.chart.heat.on, 'T.colors.chalk', T.colors.chalk, '| off nat', T.chart.heat.off, 'T.colors.well', T.colors.well);
console.log('ring.calTick', JSON.stringify(T.ring.calTick));
const tickWeb = /--shadow-cal-tick:\s*([^;]+);/.exec(css);
console.log('web --shadow-cal-tick', tickWeb && tickWeb[1]);
const F = R.load('src/ui/Field.jsx');
const C = R.load('src/ui/Card.jsx');
console.log('chalk inCardEdge', JSON.stringify(F.inCardEdge()), 'cardEdge', JSON.stringify(C.cardEdge()), 'capsTrack(1.6)', F.capsTrack(1.6));
const v1 = V.VIBE_DEFS.v1;
THEME.applyTheme(THEME.build(v1.def, { images: v1.images, fit: v1.fit, chart: v1.chart }));
console.log('v1 inCardEdge', JSON.stringify(F.inCardEdge()), 'cardEdge', JSON.stringify(C.cardEdge()), 'capsTrack(1.6)', F.capsTrack(1.6), 'T.chart', T.chart);
