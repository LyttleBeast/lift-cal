// Emits one line as each re-prove output lands; exits when the given last one does.
import { existsSync, readFileSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/proof/';
const names = process.argv.slice(2);
const seen = new Set();
for (;;) {
  for (const n of names) if (!seen.has(n) && existsSync(P + n + '.out')) {
    seen.add(n);
    const t = readFileSync(P + n + '.out', 'utf8').trimEnd().split('\n');
    console.log(n + ': ' + t.slice(-2).join(' | ').slice(0, 300));
  }
  if (seen.size === names.length) process.exit(0);
  await new Promise(r => setTimeout(r, 15000));
}
