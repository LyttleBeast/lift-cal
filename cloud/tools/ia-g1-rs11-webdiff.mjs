// Diff the analyze.mjs group headers of two web contrast runs (gate fix gates-1-rs11).
import { execFileSync } from 'node:child_process';
const A = '/Users/micahflunker/dev/vibes-night/tools/vibe-contrast/analyze.mjs';
const heads = f => new Set(execFileSync('node', [A, f], { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n').filter(l => l && !l.startsWith(' ') && !l.startsWith('/'))
  .map(l => l.replace(/ n\d+ .*$/, '').replace(/ n\d+$/, '')));
const a = heads(process.argv[2]), b = heads(process.argv[3]);
for (const h of a) if (!b.has(h)) console.log('GONE ', h);
for (const h of b) if (!a.has(h)) console.log('NEW  ', h);
console.log('before', a.size, 'after', b.size);
