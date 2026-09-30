// ev3k: compare nat-build-main.json with nat-build-ev3.json: every path main
// has must hold the same value on ev3 (v1, Chalk, the static T); list added paths.
import { readFileSync } from 'node:fs';
const D = '/Users/micahflunker/dev/vibes-night/tmp/ev3k/';
const m = JSON.parse(readFileSync(D + 'nat-build-main.json', 'utf8'));
const e = JSON.parse(readFileSync(D + 'nat-build-ev3.json', 'utf8'));
for (const k of ['v1', 'chalk', 'T']) {
  const moved = Object.keys(m[k]).filter(p => e[k][p] !== m[k][p]);
  const added = Object.keys(e[k]).filter(p => !(p in m[k]));
  console.log(`${k}: ${Object.keys(m[k]).length} main paths, moved ${moved.length}${moved.length ? ': ' + moved.map(p => p + ' main=' + m[k][p].slice(0, 120) + ' ev3=' + String(e[k][p]).slice(0, 120)).join(' ;; ') : ''}`);
  console.log(`   added: ${added.map(p => p + '=' + e[k][p].slice(0, 90)).join(' ;; ')}`);
}
console.log('scratch:', JSON.stringify(e.scratch, null, 1));
console.log('chalk v3:', JSON.stringify(e.chalkV3));
