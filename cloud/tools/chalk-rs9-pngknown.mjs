// Is a PNG one some other proof run already produced (a known raster state)?
// Walks ~/dev/vibes-night/proof/*/{A,B}/<width>/ for <scene>*.png and prints
// each file whose sha256 equals one of the given run's A/B PNG for that scene.
// Usage: node chalk-rs9-pngknown.mjs <runDir> <scene> <width>
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const [run, scene, w] = process.argv.slice(2);
const P = '/Users/micahflunker/dev/vibes-night/proof';
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const pick = d => existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.png') && (f === scene + '.png' || f.startsWith(scene + '.'))).map(f => join(d, f)) : [];
const mine = {};
for (const side of ['A', 'B']) for (const f of pick(join(run, side, w))) mine[f] = sha(f);
console.log('this run:'); for (const [f, h] of Object.entries(mine)) console.log('  ' + h.slice(0, 16) + ' ' + f.slice(P.length));
const want = new Map(Object.entries(mine).map(([f, h]) => [h, f]));
const hits = {};
for (const r of readdirSync(P)) {
  const rd = join(P, r);
  if (rd === run || !statSync(rd).isDirectory()) continue;
  for (const side of ['A', 'B']) for (const f of pick(join(rd, side, w))) {
    const h = sha(f);
    if (want.has(h)) (hits[h] = hits[h] || []).push(r + '/' + side);
  }
}
for (const [h, f] of want) console.log(h.slice(0, 16) + ' ' + f.slice(P.length) + ' also produced by: ' + ((hits[h] || []).join(', ') || 'NONE'));
