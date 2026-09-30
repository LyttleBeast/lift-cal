// rpox: every file under web vibes/defs and vibes/icons (web-p-oxblood) against
// native src/pure/vibes (nat-p-oxblood), byte for byte.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-p-oxblood/vibes';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-p-oxblood/src/pure/vibes';
const h = f => createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
let bad = 0;
for (const d of ['defs', 'icons']) {
  const names = new Set([...readdirSync(`${W}/${d}`), ...readdirSync(`${N}/${d}`)]);
  for (const n of [...names].sort()) {
    const a = existsSync(`${W}/${d}/${n}`) ? h(`${W}/${d}/${n}`) : '-';
    const b = existsSync(`${N}/${d}/${n}`) ? h(`${N}/${d}/${n}`) : '-';
    if (a !== b) bad++;
    console.log((a === b ? 'same ' : 'DIFF ') + d + '/' + n + ' ' + a + ' ' + b);
  }
}
console.log(bad ? bad + ' differ' : 'all identical');
