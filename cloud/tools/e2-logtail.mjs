// e2-logtail.mjs <dir> <name...> — print the last N lines (env N, default 25) of each verifier log.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const [dir, ...names] = process.argv.slice(2);
const N = +(process.env.N || 25);
for (const n of names) {
  const f = join(dir, /\.(log|out)$/.test(n) ? n : n + '.log');
  let t = '';
  try { t = readFileSync(f, 'utf8'); } catch (e) { console.log('=== ' + n + ': ' + e.message); continue; }
  const L = t.split('\n');
  console.log('=== ' + n + ' (' + L.length + ' lines)');
  console.log(L.slice(-N).join('\n'));
}
