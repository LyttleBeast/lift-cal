// Read-only: list, for each VOCAB block, the looks it offers (judge helper, iron-age slot).
import fs from 'fs';
const t = fs.readFileSync('/Users/micahflunker/dev/vibes-night/design/VOCAB.md', 'utf8').split('\n');
const want = process.argv.slice(2);
t.forEach((l, i) => {
  if (want.some(w => l.includes(w))) console.log(String(i + 1).padStart(4) + ': ' + l.slice(0, 260));
});
