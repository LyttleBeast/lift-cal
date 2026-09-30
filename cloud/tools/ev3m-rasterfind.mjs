// ev3m: has any A side (a base tree) on record produced this exact PNG?
//   node ev3m-rasterfind.mjs <width> <scene> <sha256> [<sha256>…]
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [w, scene, ...want] = process.argv.slice(2);
const root = '/Users/micahflunker/dev/vibes-night/proof';
const hits = new Map(want.map(s => [s, []]));
let seen = 0;
for (const run of readdirSync(root)) {
  for (const side of ['A', 'B']) {
    const d = `${root}/${run}/${side}/${w}`;
    if (!existsSync(d) || !statSync(d).isDirectory()) continue;
    for (const f of readdirSync(d)) {
      if (!(f === scene + '.png' || f.startsWith(scene + '.alt-'))) continue;
      seen++;
      const sha = createHash('sha256').update(readFileSync(`${d}/${f}`)).digest('hex');
      if (hits.has(sha)) hits.get(sha).push(`${run}/${side}/${w}/${f}`);
    }
  }
}
console.log('pngs hashed', seen);
for (const [s, h] of hits) console.log(s.slice(0, 16), h.length ? h.join(' ') : 'NOT FOUND');
