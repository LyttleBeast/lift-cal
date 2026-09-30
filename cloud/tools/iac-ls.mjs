// Concept C (iron-age) listing helper: node iac-ls.mjs <dir> [regex]
// Recursively lists files under <dir> whose path matches regex (case-insensitive), with byte sizes.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [dir, pat] = process.argv.slice(2);
const re = pat ? new RegExp(pat, 'i') : null;
const walk = d => {
  let ents;
  try { ents = readdirSync(d, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') walk(p); }
    else if (!re || re.test(p)) console.log(statSync(p).size + '\t' + p);
  }
};
walk(dir);
