// Samples pixels (display coords x1.266) from the oxblood judge shots.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PNG } = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs');
const dir = '/Users/micahflunker/dev/vibes-night/proof/v-oxblood/judge-s1-r1-s1/';
const S = 1170 / 924;
const pts = {
  'you.png': { ground: [20, 900], card: [300, 500], name: [230, 280], coachEyebrow: [140, 450], dimCaps: [100, 890], greenRule: [400, 1030], yellowRule: [400, 1642], avatar: [70, 210], bodyDim: [300, 1212] },
  'fuel.png': { hero350: [110, 430], budgetBar: [300, 550], fatBar: [400, 862], logFood: [300, 1700], carbs: [400, 808] },
  'weight.png': { lineYellow: [300, 1316], fillTop: [300, 1340], fillBot: [300, 1540], log: [760, 480], delta: [690, 860] },
  'summary.png': { save: [150, 1300], prBorder: [40, 1560], prCard: [300, 1680] },
  'session-drop.png': { tick: [790, 640], input: [200, 660], rowDone: [60, 700] },
  'auth.png': { btn: [200, 1320], field: [300, 990] },
};
const hex = (p, x, y) => { const i = (p.width * Math.round(y * S) + Math.round(x * S)) << 2; return '#' + [0, 1, 2].map(k => p.data[i + k].toString(16).padStart(2, '0')).join(''); };
for (const [f, m] of Object.entries(pts)) {
  const p = PNG.sync.read(fs.readFileSync(dir + f));
  console.log(f, Object.entries(m).map(([k, [x, y]]) => `${k}=${hex(p, x, y)}`).join(' '));
}
