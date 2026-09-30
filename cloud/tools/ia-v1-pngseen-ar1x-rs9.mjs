// Look for given PNG shas among every proof run's <side>/<width>/<scene>.png
// (and any re-boot PNGs named <scene>*.png), and say which runs/sides produced
// them and which tree each side served.
// Usage: node ia-v1-pngseen-ar1x-rs9.mjs <scene> <width> <sha>[,<sha>…]
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const [scene, width, shaArg] = process.argv.slice(2);
const want = new Set(shaArg.split(','));
const P = '/Users/micahflunker/dev/vibes-night/proof';
const hits = [];
let scanned = 0;
for (const run of readdirSync(P)) {
  const rd = join(P, run);
  try { if (!statSync(rd).isDirectory()) continue; } catch { continue; }
  let S = null;
  try { S = JSON.parse(readFileSync(join(rd, 'summary.json'), 'utf8')); } catch {}
  for (const side of ['A', 'B']) {
    const d = join(rd, side, width);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      if (!f.endsWith('.png') || !(f === scene + '.png' || f.startsWith(scene + '.'))) continue;
      scanned++;
      const h = createHash('sha256').update(readFileSync(join(d, f))).digest('hex');
      if (want.has(h)) hits.push([h.slice(0, 12), run, side, f, S && S[side] ? (S[side].sha || '').slice(0, 7) + ' ' + (S[side].repo || '').split('/').pop() : '?']);
    }
  }
}
console.log('scanned', scanned);
for (const h of hits) console.log(h.join('  '));
