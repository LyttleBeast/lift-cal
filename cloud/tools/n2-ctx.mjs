// N2: print a few lines around each file:line given, from the engine tree.
import { readFileSync } from 'node:fs';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/nat-engine/';
const before = +(process.env.B || 4), after = +(process.env.A || 2);
for (const spec of process.argv.slice(2)) {
  const [f, l] = [spec.slice(0, spec.lastIndexOf(':')), +spec.slice(spec.lastIndexOf(':') + 1)];
  const lines = readFileSync(TREE + f, 'utf8').split('\n');
  console.log('==== ' + spec);
  for (let i = Math.max(1, l - before); i <= Math.min(lines.length, l + after); i++) console.log((i === l ? '>' : ' ') + String(i).padStart(5) + ' ' + lines[i - 1]);
}
