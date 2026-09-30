// Round-3 theme-lens census: every diff hunk (1cb6498..engine HEAD, app/ and
// src/ui/, theme.js excluded) whose colour tokens changed, grouped by the
// old -> new token pair. Read-only: runs git diff in the engine worktree.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const TREE = process.argv[2] || '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const OUT = process.argv[3] || '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/census.txt';
const raw = execFileSync('git', ['-C', TREE, 'diff', '-U0', '--no-color', '1cb6498', 'HEAD', '--', 'app', 'src/ui', ':!src/ui/theme.js'],
  { encoding: 'utf8', maxBuffer: 1 << 28 });

const TOK = /\bT\.(colors|alpha|tint|signIn|banner|chrome)\.([A-Za-z0-9_]+)|\bT\.(group|groupPlate|plate|subject|kpi|mark|cardSkin|admin|conf|systemFace|shadow|scrim)\b|#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
const toks = s => {
  const out = [];
  let m;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(s))) out.push(m[1] ? m[1] + '.' + m[2] : m[3] ? 'T.' + m[3] : m[0].toLowerCase());
  return out;
};

const hunks = [];
let file = null, cur = null;
for (const line of raw.split('\n')) {
  if (line.startsWith('+++ ')) { file = line.slice(6); continue; }
  if (line.startsWith('--- ')) continue;
  const h = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (h) { cur = { file, old: +h[1], neu: +h[2], minus: [], plus: [] }; hunks.push(cur); continue; }
  if (!cur) continue;
  if (line.startsWith('-')) cur.minus.push(line.slice(1));
  else if (line.startsWith('+')) cur.plus.push(line.slice(1));
}

const bag = a => { const m = new Map(); a.forEach(x => m.set(x, (m.get(x) || 0) + 1)); return m; };
const lines = [];
const pairs = new Map();
let changed = 0;
for (const h of hunks) {
  const a = h.minus.flatMap(toks), b = h.plus.flatMap(toks);
  const A = bag(a), B = bag(b);
  const gone = [], came = [];
  for (const [k, n] of A) { const d = n - (B.get(k) || 0); for (let i = 0; i < d; i++) gone.push(k); }
  for (const [k, n] of B) { const d = n - (A.get(k) || 0); for (let i = 0; i < d; i++) came.push(k); }
  if (!gone.length && !came.length) continue;
  changed++;
  const key = [...new Set(gone)].sort().join('+') + ' -> ' + [...new Set(came)].sort().join('+');
  if (!pairs.has(key)) pairs.set(key, []);
  pairs.get(key).push(h.file + ':' + h.neu);
  lines.push('=== ' + h.file + ':' + h.neu + ' (was :' + h.old + ')   ' + key);
  h.minus.forEach(l => lines.push('  - ' + l.trim().slice(0, 220)));
  h.plus.forEach(l => lines.push('  + ' + l.trim().slice(0, 220)));
}
const summary = [...pairs.entries()].sort((x, y) => y[1].length - x[1].length)
  .map(([k, v]) => v.length + '  ' + k + '\n      ' + v.join(' '));
writeFileSync(OUT, 'hunks with a token change: ' + changed + ' of ' + hunks.length + '\n\n' + summary.join('\n') + '\n\n' + lines.join('\n') + '\n');
console.log('hunks', hunks.length, 'changed', changed, 'pairs', pairs.size, '->', OUT);
