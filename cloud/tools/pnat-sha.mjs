// pnat-sha.mjs — sha256 and byte size of each file named; says whether they all match.
//   node pnat-sha.mjs <file> [<file> …]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const rows = process.argv.slice(2).map(f => {
  const b = readFileSync(f);
  return { f, bytes: b.length, sha: createHash('sha256').update(b).digest('hex') };
});
for (const r of rows) console.log(`${r.sha}  ${String(r.bytes).padStart(9)}  ${r.f}`);
console.log(new Set(rows.map(r => r.sha)).size === 1 ? 'ALL IDENTICAL' : 'DIFFERENT');
