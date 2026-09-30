// Print byte and line counts for files: node ian-sizes.mjs <root> <rel>...
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [root, ...rels] = process.argv.slice(2);
for (const r of rels) {
  try {
    const p = join(root, r);
    const b = readFileSync(p);
    const lines = b.toString('utf8').split('\n').length;
    console.log(String(b.length).padStart(8), String(lines).padStart(6), r);
  } catch (e) { console.log('    MISSING', r); }
}
