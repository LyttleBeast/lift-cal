// Ledger v1 gate (g1-d1): wait until a file exists (or maxMin passes), then print
// the tails of the gate's logs. Usage: node ledger-v1g-g1-d1-wait.mjs <file> [maxMin=28]
import { existsSync, readFileSync } from 'node:fs';
const [file, maxMin = '28'] = process.argv.slice(2);
const end = Date.now() + +maxMin * 60e3;
while (!existsSync(file) && Date.now() < end) await new Promise(r => setTimeout(r, 15000));
console.log(existsSync(file) ? 'READY ' + file : 'TIMEOUT waiting for ' + file);
const P = '/Users/micahflunker/dev/vibes-night/proof/';
for (const f of ['v-ledger-v1-absent-g1-d1/run.log', 'v-ledger-v1-datavibe-g1-d1/run.log']) {
  if (!existsSync(P + f)) { console.log('== ' + f + ' (none yet)'); continue; }
  const t = readFileSync(P + f, 'utf8').trim().split('\n');
  console.log('== ' + f + ' (' + t.length + ' lines)\n' + t.slice(-4).join('\n'));
}
