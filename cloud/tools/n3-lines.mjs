// N3 scratch: line counts of the given files (no wc in this session).
import fs from 'node:fs';
for (const f of process.argv.slice(2)) {
  try { console.log(fs.readFileSync(f, 'utf8').split('\n').length, f); }
  catch (e) { console.log('ERR', f, e.message); }
}
