// 08a-locfiles.mjs — print every file variant LoC lists for a saved item JSON (research/scratch-08a/loc-<id>.json).
import { readFileSync } from 'node:fs';
for (const id of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/research/scratch-08a/loc-${id}.json`, 'utf8'));
  console.log('==', id);
  for (const r of (j.resources || [])) {
    console.log(' RES', r.url);
    for (const fl of (r.files || [])) for (const x of fl) console.log('   ', x.mimetype, x.width || '', x.height || '', x.size || '', x.url);
  }
}
