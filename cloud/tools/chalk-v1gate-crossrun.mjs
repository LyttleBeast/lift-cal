// Cross-run check for the Chalk v1 gate: the chalk run's B dumps against a
// reference run's B dumps (ev2-v1-absent: B was 2645c53, whose tree is byte for
// byte main 58ac3be), and A against A (both web-base 928a65e). If chalk adds
// nothing to v1 beyond what main already has, every B pair is 0 differences.
// Usage: node chalk-v1gate-crossrun.mjs <refRunDir> <runDir>
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const H = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const [ref, run] = process.argv.slice(2);
let pairs = 0, differ = 0;
for (const side of ['A', 'B']) {
  for (const w of ['390', '320']) {
    const dr = join(ref, side, w), dn = join(run, side, w);
    const names = readdirSync(dn).filter(f => f.endsWith('.dump.json.gz'));
    const refNames = new Set(readdirSync(dr).filter(f => f.endsWith('.dump.json.gz')));
    for (const n of names) {
      if (!refNames.has(n)) { console.log(side, w, n, 'NOT IN REF'); differ++; continue; }
      pairs++;
      const r = H.compareDumps(H.readGz(join(dr, n)), H.readGz(join(dn, n)), 5);
      const counts = Object.fromEntries(H.DIFF_KINDS.filter(k => r[k] && r[k].count).map(k => [k, r[k].count]));
      if (Object.keys(counts).length) {
        differ++;
        console.log(side, w, n, JSON.stringify(counts));
        for (const k of Object.keys(counts)) console.log('   ', k, JSON.stringify(r[k].first).slice(0, 1200));
      }
    }
    for (const n of refNames) if (!names.includes(n)) { console.log(side, w, n, 'ONLY IN REF'); differ++; }
  }
}
console.log('pairs compared ' + pairs + ', differing ' + differ);
process.exit(differ ? 3 : 0);
