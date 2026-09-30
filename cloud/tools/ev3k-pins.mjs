// ev3k: the contract's pure files byte-identical across the ev3 trees, and pinned.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-ev3';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-ev3';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const ver = readFileSync(`${N}/tools/verify-vibes-verbatim.mjs`, 'utf8');
const files = ['vibes/defs/v1.js', 'vibes/defs/index.js', 'vibes/defs/vocab.js', 'vibes/icons/v1.js'];
for (const f of files) {
  const a = sha(`${W}/${f}`), b = sha(`${N}/src/pure/${f}`);
  console.log(f, a === b ? 'SAME' : 'DIFF', a, 'pinned:', ver.includes(a) ? 'yes' : 'NO');
}
// every file under each tree's vibes dirs
for (const d of ['vibes/defs', 'vibes/icons']) {
  const wa = readdirSync(`${W}/${d}`).sort(), na = readdirSync(`${N}/src/pure/${d}`).sort();
  console.log(d, 'web:', wa.join(','), '| nat:', na.join(','));
  for (const f of wa) if (na.includes(f)) { const a = sha(`${W}/${d}/${f}`), b = sha(`${N}/src/pure/${d}/${f}`); console.log('  ', f, a === b ? 'SAME' : 'DIFF', 'pinned:', ver.includes(a) ? 'yes' : 'NO'); }
}
// pinned pure modules untouched vs mains
