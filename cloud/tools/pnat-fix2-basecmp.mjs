// pnat-fix2-basecmp.mjs — the re-captured v1 baseline against the one it replaces.
// Strips the two new host fields (sn, fn) and the one new scene from the new
// baseline and asks whether what is left is the old baseline, scene for scene
// and host for host. Also counts the hosts that carry sn / fn.
//
//   node pnat-fix2-basecmp.mjs <proof tree> <old commit>
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [tree, oldRev] = process.argv.slice(2);
const oldText = execFileSync('git', ['-C', tree, 'show', oldRev + ':tools/vibe-v1.baseline.json'], { encoding: 'utf8', maxBuffer: 1 << 30 });
const newText = readFileSync(join(tree, 'tools/vibe-v1.baseline.json'), 'utf8');
const A = JSON.parse(oldText), B = JSON.parse(newText);
const canon = v => (v === null || typeof v !== 'object') ? JSON.stringify(v)
  : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
const strip = h => { const { sn, fn, ...rest } = h; return rest; };
const oldNames = new Set(A.scenes.map(s => s.name));
const added = B.scenes.filter(s => !oldNames.has(s.name)).map(s => s.name);
const gone = A.scenes.filter(s => !B.scenes.some(t => t.name === s.name)).map(s => s.name);
const byNew = new Map(B.scenes.map(s => [s.name, s]));
let same = 0, differ = [];
let sn = 0, fn = 0, snList = new Map();
for (const s of B.scenes) for (const h of s.hosts) {
  if (h.fn) fn++;
  if (h.sn) { sn++; const k = h.t + ' ' + h.sn; snList.set(k, (snList.get(k) || 0) + 1); }
}
for (const s of A.scenes) {
  const t = byNew.get(s.name);
  if (!t) continue;
  const x = canon({ errors: s.errors, calls: s.calls, hosts: s.hosts });
  const y = canon({ errors: t.errors, calls: t.calls, hosts: t.hosts.map(strip) });
  if (x === y) same++; else differ.push(s.name);
}
console.log('old ' + oldRev + ': ' + A.scenes.length + ' scenes / ' + A.meta.hosts + ' hosts; new: ' + B.scenes.length + ' scenes / ' + B.meta.hosts + ' hosts');
console.log('scenes added: ' + JSON.stringify(added) + '; scenes gone: ' + JSON.stringify(gone));
console.log('old scenes identical once sn/fn are stripped: ' + same + ' of ' + A.scenes.length + (differ.length ? '; DIFFER: ' + differ.slice(0, 10).join(' | ') : ''));
console.log('hosts with fn: ' + fn + '; hosts with sn: ' + sn + ' ' + JSON.stringify([...snList]));
process.exit(differ.length || gone.length ? 1 : 0);
