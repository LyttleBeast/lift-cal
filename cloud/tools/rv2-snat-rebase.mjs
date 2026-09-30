#!/usr/bin/env node
/* rv2-snat-rebase — for every scene in <tree>/tools/vibe-v1.rebaseline.json,
 * diff its hosts against the pinned baseline's scene of the same name
 * (LCS over canonical host lines). Prints what was added/removed per scene.
 * Usage: node rv2-snat-rebase.mjs <tree>
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const ROOT = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/nat-settings';
const rawBase = readFileSync(join(ROOT, 'tools/vibe-v1.baseline.json'));
console.log('baseline sha256 ' + createHash('sha256').update(rawBase).digest('hex'));
const base = JSON.parse(rawBase.toString('utf8'));
const over = JSON.parse(readFileSync(join(ROOT, 'tools/vibe-v1.rebaseline.json'), 'utf8'));
console.log('overlay meta: ' + JSON.stringify(over.meta).slice(0, 600));
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k2 => [k2, x[k2]])) : x));
const by = new Map(base.scenes.map(s => [s.name, s]));
function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(['-', i, a[i]]); i++; }
    else { out.push(['+', j, b[j]]); j++; }
  }
  while (i < n) { out.push(['-', i, a[i]]); i++; }
  while (j < m) { out.push(['+', j, b[j]]); j++; }
  return out;
}
for (const s of over.scenes) {
  const b = by.get(s.name);
  if (!b) { console.log('\n## ' + s.name + ': NOT IN BASELINE'); continue; }
  const A = b.hosts.map(canon), B = s.hosts.map(canon);
  const d = lcsDiff(A, B);
  const other = canon([b.errors, b.calls]) === canon([s.errors, s.calls]) ? '' : '  (errors/calls differ: ' + canon([b.errors, b.calls]).slice(0, 200) + ' vs ' + canon([s.errors, s.calls]).slice(0, 200) + ')';
  console.log('\n## ' + s.name + ': base ' + A.length + ' hosts, now ' + B.length + ', ' + d.filter(x => x[0] === '-').length + ' removed, ' + d.filter(x => x[0] === '+').length + ' added' + other);
  d.forEach(([op, k, line]) => console.log('  ' + op + ' [' + k + '] ' + line.slice(0, 400)));
}
