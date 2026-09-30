#!/usr/bin/env node
/* r2-dumpdiff — compare two verify-vibe-v1 --dump files scene by scene with an
 * LCS over host lines, and attribute each difference to a planted mutation by
 * signature. usage: node r2-dumpdiff.mjs <base.txt> <other.txt> [--show N] */
import { readFileSync } from 'node:fs';

const [A, B] = process.argv.slice(2);
const SHOW = +(process.argv[process.argv.indexOf('--show') + 1] || 0) || 0;
const parse = f => {
  const out = new Map(); let cur = null;
  for (const l of readFileSync(f, 'utf8').split('\n')) {
    if (!l) continue;
    if (l.startsWith('{"calls"')) { const h = JSON.parse(l); cur = { h: l, name: h.name, hosts: [] }; out.set(h.name, cur); }
    else cur.hosts.push(l);
  }
  return out;
};
const a = parse(A), b = parse(B);
const lcs = (x, y) => {
  const n = x.length, m = y.length;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) { i++; j++; continue; }
    if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) ops.push(['+', y[j++]]);
    else ops.push(['-', x[i++]]);
  }
  return ops;
};
const SIG = [
  ['M3a-undefkey-view', l => l.includes('"overflow":"$undefined"')],
  ['M3b-undefkey-text', l => l.includes('"fontFamily":"$undefined"')],
  ['M4-wrapper', l => l === l && /"p":\{"pointerEvents":"none"\},"s":\{"position":"absolute"\},"t":"View"\}$/.test(l)],
  ['M18-statusbar', l => l.includes('"style":"auto"')],
  ['M9-theme-undrawn', l => l.includes('d9a90e')],
  ['M10-inertkey', l => /"opacity":1[,}]/.test(l) && l.includes('"borderRadius":999')],
  ['M16-duration', l => l.includes('601')],
  ['M8-pressedchildren', l => l.includes('"cp"') && l.includes('#e8e5de')],
  ['M7-pressed', l => l.includes('"sp"') && l.includes('0.94')],
  ['M15-worklet', l => l.includes('rgba(240, 190, 30, 0.08)') && !l.includes('0.28')],
  ['M13-arrayorder', l => l.includes('"fontSize":20') && l.includes('#f2f0eb')]
];
const tally = new Map(), unknown = [];
let headerDiffs = 0;
for (const [name, sa] of a) {
  const sb = b.get(name);
  if (!sb) { unknown.push('scene missing in B: ' + name); continue; }
  if (sa.h !== sb.h) { headerDiffs++; const who = SIG.find(([, f]) => f(sb.h)); tally.set((who ? who[0] : 'UNKNOWN') + ' (scene header/calls)', (tally.get((who ? who[0] : 'UNKNOWN') + ' (scene header/calls)') || 0) + 1); if (!who) unknown.push(name + ' HEADER\n  - ' + sa.h.slice(0, 400) + '\n  + ' + sb.h.slice(0, 400)); }
  if (sa.hosts.join('\n') === sb.hosts.join('\n')) continue;
  const ops = lcs(sa.hosts, sb.hosts);
  const plus = ops.filter(o => o[0] === '+').map(o => o[1]);
  const minus = ops.filter(o => o[0] === '-').map(o => o[1]);
  for (const l of plus) {
    const who = SIG.find(([, f]) => f(l));
    const k = who ? who[0] : 'UNKNOWN+';
    if (!tally.has(k)) tally.set(k, 0);
    tally.set(k, tally.get(k) + 1);
    if (!who) unknown.push(name + '\n  + ' + l.slice(0, 500));
    if (who && SHOW && tally.get(k) <= SHOW) console.log('[' + k + '] ' + name + '\n  + ' + l.slice(0, 400));
  }
  // a removed line with no signature-matching added line is only suspicious if nothing was added in its place
  if (minus.length > plus.length) unknown.push(name + ': ' + (minus.length - plus.length) + ' more removed than added');
}
for (const n of b.keys()) if (!a.has(n)) unknown.push('scene only in B: ' + n);
console.log('\nper mutation signature (added/changed host lines, and scene headers):');
for (const [k, v] of [...tally].sort()) console.log('  ' + k + ': ' + v);
console.log('scene headers differing:', headerDiffs);
console.log('unattributed:', unknown.length);
unknown.slice(0, 40).forEach(u => console.log('  ' + u));
