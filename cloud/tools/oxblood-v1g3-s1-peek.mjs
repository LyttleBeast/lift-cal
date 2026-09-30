// Oxblood v1 gate (round 2-s1, fresh): for every prove run on record, the peek
// scene's pixel result and B's head — is peek's dock-raster difference one
// that main's own runs show too? Also prints the summary's notes on forgiving.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/proof';
for (const d of readdirSync(P).sort()) {
  const f = P + '/' + d + '/summary.json';
  if (!existsSync(f)) continue;
  let s; try { s = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  if (!s.scenes || s.mode !== 'prove') continue;
  const pk = Object.entries(s.scenes).filter(([k]) => k.startsWith('peek@')).map(([k, v]) => k + ':' + (v.pixelsEqual ? 'eq' : v.diffPixels) + (v.forgiven ? '/forgiven' : ''));
  console.log(d.padEnd(40), (s.B && s.B.sha || '').slice(0, 8), (s.A && s.A.sha || '').slice(0, 8), 'dv=' + s.dataVibe, s.verdict, 'pxDiff=' + (s.totals || {}).pixelDifferent, pk.join(' '));
}
const s = JSON.parse(readFileSync(P + '/' + (process.argv[2] || 'v-oxblood-v1-absent-r2-s1') + '/summary.json', 'utf8'));
const v = s.scenes['peek@390'];
console.log(Object.keys(v).join(','));
console.log(JSON.stringify(s.notes || '').slice(0, 3000));
