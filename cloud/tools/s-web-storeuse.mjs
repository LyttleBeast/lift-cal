// For each tools-check/*.mjs: the lines naming store.js / settings.js / app.js, to see
// which verifiers load the REAL module (copied to a tmpdir or imported) vs a stub.
// Usage: node s-web-storeuse.mjs <repo> [regex]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const [repo, pat] = process.argv.slice(2);
const re = new RegExp(pat || "store\\.js|settings\\.js|'\\./app\\.js'|vibe\\.js|vibes/");
for (const f of readdirSync(join(repo, 'tools-check')).filter(f => f.endsWith('.mjs')).sort()) {
  const lines = readFileSync(join(repo, 'tools-check', f), 'utf8').split('\n');
  const hits = lines.map((l, i) => [i + 1, l]).filter(([, l]) => re.test(l));
  if (!hits.length) continue;
  console.log('== ' + f + ' (' + hits.length + ')');
  for (const [n, l] of hits.slice(0, 8)) console.log('  ' + n + ': ' + l.trim().slice(0, 200));
}
