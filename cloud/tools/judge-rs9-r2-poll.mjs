// Poll the judge screenshot dir until PNGs appear and run.log stops growing, or timeout.
import fs from 'node:fs';
const d = '/Users/micahflunker/dev/vibes-night/proof/v-iron-age/judge-rs9-r2-rs9';
const limit = Number(process.argv[2] || 540) * 1000;
const t0 = Date.now();
let lastSize = -1, stable = 0;
function snap() {
  let files = [];
  try { files = fs.readdirSync(d); } catch {}
  let log = '';
  try { log = fs.readFileSync(d + '/run.log', 'utf8'); } catch {}
  return { files, log };
}
while (Date.now() - t0 < limit) {
  const { files, log } = snap();
  const pngs = files.filter(f => f.endsWith('.png'));
  const done = /\b(done|finished|complete|released|exit)\b/i.test(log.split('\n').slice(-4).join('\n'));
  if (log.length === lastSize) stable++; else stable = 0;
  lastSize = log.length;
  if (pngs.length && (done || stable >= 6)) break;
  await new Promise(r => setTimeout(r, 10000));
}
const { files, log } = snap();
console.log(files.join('\n'));
console.log('---- log tail');
console.log(log.split('\n').slice(-15).join('\n'));
