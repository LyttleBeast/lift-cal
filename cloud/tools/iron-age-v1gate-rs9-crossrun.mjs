// Cross-run check for the Iron Age v1 gate (a copy of chalk-v1gate-crossrun.mjs
// that writes its full report to a file and prints a compact summary): the
// iron-age run's B dumps against a reference run's B dumps (ev2-v1-absent /
// ev2-v1-datavibe: B was 2645c53, whose tree is byte for byte main 58ac3be), and
// A against A (both web-base 928a65e). If Iron Age adds nothing to v1 beyond what
// main already has, every B pair is 0 differences.
// Usage: node iron-age-v1gate-rs9-crossrun.mjs <refRunDir> <runDir> <outFile>
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const H = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const [ref, run, outFile] = process.argv.slice(2);
let pairs = 0, differ = 0;
const lines = [], compact = [];
for (const side of ['A', 'B']) {
  for (const w of ['390', '320']) {
    const dr = join(ref, side, w), dn = join(run, side, w);
    const names = readdirSync(dn).filter(f => f.endsWith('.dump.json.gz'));
    const refNames = new Set(readdirSync(dr).filter(f => f.endsWith('.dump.json.gz')));
    for (const n of names) {
      if (!refNames.has(n)) { lines.push(side + ' ' + w + ' ' + n + ' NOT IN REF'); compact.push(lines.at(-1)); differ++; continue; }
      pairs++;
      const r = H.compareDumps(H.readGz(join(dr, n)), H.readGz(join(dn, n)), 40);
      const counts = Object.fromEntries(H.DIFF_KINDS.filter(k => r[k] && r[k].count).map(k => [k, r[k].count]));
      if (Object.keys(counts).length) {
        differ++;
        lines.push(side + ' ' + w + ' ' + n + ' ' + JSON.stringify(counts));
        compact.push(lines.at(-1));
        for (const k of Object.keys(counts)) lines.push('    ' + k + ' ' + JSON.stringify(r[k].first));
      }
    }
    for (const n of refNames) if (!names.includes(n)) { lines.push(side + ' ' + w + ' ' + n + ' ONLY IN REF'); compact.push(lines.at(-1)); differ++; }
  }
}
lines.push('pairs compared ' + pairs + ', differing ' + differ);
writeFileSync(outFile, lines.join('\n') + '\n');
console.log(compact.join('\n'));
console.log('pairs compared ' + pairs + ', differing ' + differ);
