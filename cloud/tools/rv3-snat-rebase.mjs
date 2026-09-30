// rv3-snat-rebase — for each re-baselined scene, the host-level diff between
// the 1cb6498 baseline and the re-baseline. Read-only.
import { readFileSync } from 'node:fs';
const W = '/Users/micahflunker/dev/vibes-night/wt/nat-settings/tools/';
const base = JSON.parse(readFileSync(W + 'vibe-v1.baseline.json', 'utf8'));
const reb = JSON.parse(readFileSync(W + 'vibe-v1.rebaseline.json', 'utf8'));
const key = x => JSON.stringify(x, Object.keys(x).sort());
const canon = h => JSON.stringify(h, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(q => [q, v[q]])) : v));
for (const sc of reb.scenes) {
  const b = base.scenes.find(s => s.name === sc.name);
  if (!b) { console.log(sc.name, ': NOT IN BASELINE'); continue; }
  const A = b.hosts.map(canon), B = sc.hosts.map(canon);
  // LCS
  const n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const del = [], add = [];
  let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) del.push(A[i++]); else add.push(B[j++]); }
  while (i < n) del.push(A[i++]); while (j < m) add.push(B[j++]);
  console.log('\n' + sc.name + ': base ' + n + ' hosts, rebaseline ' + m + '; removed ' + del.length + ', added ' + add.length);
  del.forEach(x => console.log('  - ' + x.slice(0, 260)));
  add.forEach(x => console.log('  + ' + x.slice(0, 260)));
  const other = ['errors', 'calls'].filter(k => canon(b[k]) !== canon(sc[k]));
  if (other.length) console.log('  other fields differ: ' + other.join(', '));
}
