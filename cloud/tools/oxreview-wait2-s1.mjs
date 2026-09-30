// Waits (up to 9.5 min) until the wrapper's output has one more "exit" line
// than argv[3], and prints the run.log tail of the newest review run dir.
import { readFileSync, readdirSync, statSync } from 'node:fs';
const f = process.argv[2], seen = +(process.argv[3] || 0);
const P = '/Users/micahflunker/dev/vibes-night/proof/';
const t0 = Date.now();
while (Date.now() - t0 < 570e3) {
  let s = '';
  try { s = readFileSync(f, 'utf8'); } catch {}
  const n = (s.match(/^exit /mg) || []).length;
  if (n > seen) { console.log('exits ' + n); process.exit(0); }
  await new Promise(r => setTimeout(r, 10000));
}
const dirs = readdirSync(P).filter(d => d.startsWith('v-oxblood-review-s1-r1')).map(d => [d, statSync(P + d).mtimeMs]).sort((a, b) => b[1] - a[1]);
for (const [d] of dirs.slice(0, 1)) {
  let log = '';
  try { log = readFileSync(P + d + '/run.log', 'utf8'); } catch { console.log(d + ': no run.log yet'); continue; }
  const lines = log.split('\n').filter(l => !/lock: waiting/.test(l));
  console.log(d + ' (' + lines.length + ' lines)\n' + lines.slice(-6).join('\n'));
}
