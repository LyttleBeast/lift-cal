// Ledger v1 gate (d1): list prove runs whose A is web-base 928a65e, with B's
// sha, B's tree, verdict, flags (data-vibe) — to find a reference run whose B
// served web main a78ec39's tree (11b51d6).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const P = '/Users/micahflunker/dev/vibes-night/proof';
const treeOf = sha => { try { return execFileSync('git', ['-C', '/Users/micahflunker/dev/ship-v59', 'rev-parse', sha + '^{tree}'], { encoding: 'utf8' }).trim(); } catch { return '?'; } };
for (const d of readdirSync(P)) {
  const f = P + '/' + d + '/summary.json';
  if (!existsSync(f)) continue;
  let s; try { s = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  if (!s.A || !s.B || !s.B.sha) continue;
  const t = treeOf(s.B.sha);
  if (process.argv[2] && t !== process.argv[2]) continue;
  console.log(d, s.verdict, 'A', (s.A.sha || '').slice(0, 7), 'B', s.B.sha.slice(0, 7), 'tree', t.slice(0, 7), 'dv', s.dataVibe ?? s.DATA_VIBE ?? JSON.stringify(s.options || s.conditions || '').slice(0, 160), 'cmp', s.totals && s.totals.compared);
}
