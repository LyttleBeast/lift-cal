// s-nat-rebase-diff: node s-nat-rebase-diff.mjs <tree>
// For each scene in <tree>/tools/vibe-v1.rebaseline.json, compare with the pinned baseline as an
// INSERTION: the longest common prefix and suffix of hosts (canonical JSON, byte for byte), and
// what sits between them. Prints the inserted hosts and whether prefix + suffix is the whole
// baseline scene (i.e. nothing else moved but its position).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const tree = process.argv[2];
const canon = v => Array.isArray(v) ? '[' + v.map(canon).join(',') + ']'
  : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v);
const base = JSON.parse(readFileSync(join(tree, 'tools/vibe-v1.baseline.json'), 'utf8'));
const over = JSON.parse(readFileSync(join(tree, 'tools/vibe-v1.rebaseline.json'), 'utf8'));
const by = new Map(base.scenes.map(s => [s.name, s]));
console.log('overlay meta: ' + JSON.stringify(over.meta.rebaselined));
for (const s of over.scenes) {
  const b = by.get(s.name);
  const A = b.hosts.map(canon), B = s.hosts.map(canon);
  let p = 0; while (p < A.length && p < B.length && A[p] === B[p]) p++;
  let q = 0; while (q < A.length - p && q < B.length - p && A[A.length - 1 - q] === B[B.length - 1 - q]) q++;
  const removed = A.length - p - q, added = B.length - p - q;
  const callsSame = canon(b.calls || []) === canon(s.calls || []) && canon(b.errors) === canon(s.errors);
  console.log('\n' + s.name + ': ' + A.length + ' -> ' + B.length + ' hosts; common prefix ' + p + ', common suffix ' + q +
    '; removed ' + removed + ', inserted ' + added + (removed === 0 ? ' — a pure insertion, every other host byte-identical' : ' — NOT a pure insertion') +
    (callsSame ? '; calls and errors unchanged' : '; CALLS OR ERRORS DIFFER'));
  for (let i = p; i < p + added; i++) {
    const h = s.hosts[i];
    const st = h.s ? Object.entries(h.s).map(([k, v]) => k + ':' + JSON.stringify(v)).join(' ') : '';
    console.log('   + d' + h.d + ' ' + h.t + (h.x != null && h.x !== '' ? ' "' + h.x + '"' : '') + (h.p ? ' ' + JSON.stringify(h.p) : '') + (h.fn ? ' fn:' + h.fn : '') + (st ? '  {' + st + '}' : ''));
  }
  if (removed) for (let i = p; i < p + removed; i++) console.log('   - ' + A[i].slice(0, 200));
}
