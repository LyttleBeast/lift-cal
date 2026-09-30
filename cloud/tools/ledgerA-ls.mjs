// List a directory (optionally recursive to depth), with sizes. Read-only.
// usage: node ledgerA-ls.mjs <dir> [depth]
import fs from 'node:fs';
import path from 'node:path';
const [, , dir, depthArg] = process.argv;
const maxDepth = Number(depthArg || 1);
function walk(d, depth) {
  let ents;
  try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { console.log('ERR', d, e.message); return; }
  for (const e of ents.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      console.log('  '.repeat(depth - 1) + e.name + '/');
      if (depth < maxDepth && e.name !== 'node_modules' && e.name !== '.git') walk(p, depth + 1);
    } else {
      let s = 0; try { s = fs.statSync(p).size; } catch {}
      console.log('  '.repeat(depth - 1) + e.name + '  ' + s);
    }
  }
}
walk(dir, 1);
