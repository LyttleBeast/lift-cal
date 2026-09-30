// List proof dirs whose name matches an argument, with fit.json presence and its head facts.
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const root = process.argv[2], pat = new RegExp(process.argv[3] || '.');
for (const d of readdirSync(root).sort()) {
  if (!pat.test(d)) continue;
  const f = join(root, d, 'fit.json');
  let info = '';
  if (existsSync(f)) {
    try { const j = JSON.parse(readFileSync(f, 'utf8')); info = 'fit vibe=' + j.vibe + ' head=' + (j.head || j.commit || JSON.stringify(Object.keys(j).slice(0, 8))) + ' totals=' + JSON.stringify(j.totals) + ' safe=' + JSON.stringify(j.safeArea) + ' harness=' + JSON.stringify(j.harness); } catch (e) { info = 'fit.json unreadable ' + e.message; }
  }
  console.log(d, new Date(statSync(join(root, d)).mtimeMs).toISOString(), info);
}
