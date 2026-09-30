// Print the sites of the transitions whose key matches argv[2] (a regex),
// deduped by host type + label + prop path, with one scene each.
import { readFileSync } from 'node:fs';
const T = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/transitions.json', 'utf8')).transitions;
const re = new RegExp(process.argv[2]);
const max = +(process.argv[3] || 60);
for (const [k, v] of Object.entries(T)) {
  if (!re.test(k)) continue;
  console.log('== ' + k + '  (' + v.n + ')');
  const seen = new Map();
  for (const s of v.sites) {
    const m = /^\[(.*) #(\d+) (\S+)(?: "(.*)")?\] (.*)$/.exec(s);
    const key = m ? m[3] + ' "' + (m[4] || '') + '" ' + m[5] : s;
    if (!seen.has(key)) seen.set(key, { n: 0, scene: m ? m[1] + ' #' + m[2] : '' });
    seen.get(key).n++;
  }
  let i = 0;
  for (const [key, x] of seen) { if (i++ >= max) { console.log('   … ' + (seen.size - max) + ' more'); break; } console.log('  ' + String(x.n).padStart(4) + ' ' + key + '   {' + x.scene + '}'); }
}
