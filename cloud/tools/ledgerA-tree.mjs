// Print paths in a saved GitHub tree JSON that match a substring. Read-only.
// usage: node ledgerA-tree.mjs <tree.json> <substr> [substr2]
import fs from 'node:fs';
const [, , file, ...subs] = process.argv;
const j = JSON.parse(fs.readFileSync(file, 'utf8'));
const tree = j.tree || j;
console.log('sha', j.sha || '', 'truncated', j.truncated);
for (const t of tree) {
  if (subs.every(s => t.path.includes(s))) console.log(t.path, t.size || '');
}
