// Provenance gate (navy, round 1-s1): hashes every shipped navy font and OFL in both trees,
// compares with FONTS.json, looks for any PROVENANCE.json / image under the navy folders.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-v-navy';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-v-navy';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const out = [];
const log = (...a) => { out.push(a.join(' ')); console.log(...a); };
function walk(d, acc = []) {
  if (!existsSync(d)) return acc;
  for (const f of readdirSync(d)) {
    if (f === 'node_modules' || f === '.git') continue;
    const p = join(d, f); const s = statSync(p);
    if (s.isDirectory()) walk(p, acc); else acc.push(p);
  }
  return acc;
}
for (const [tree, fj] of [[W, 'vibes/navy/fonts/FONTS.json'], [N, 'assets/vibes/navy/FONTS.json']]) {
  const j = JSON.parse(readFileSync(join(tree, fj), 'utf8'));
  for (const e of [...j.web, ...j.native]) {
    const p = join(tree, e.file);
    if (!existsSync(p)) { log('ABSENT-in-this-tree', tree.split('/').pop(), e.file); continue; }
    const h = sha(p), b = statSync(p).size;
    log(h === e.sha256 && b === e.bytes ? 'OK' : 'MISMATCH', tree.split('/').pop(), e.file, b, h);
  }
}
const oflW = join(W, 'vibes/navy/fonts/OFL.txt'), oflN = join(N, 'assets/fonts/Overpass/OFL.txt');
log('OFL web', sha(oflW)); log('OFL nat', sha(oflN));
const up = process.argv[2];
if (up && existsSync(up)) log('OFL upstream', sha(up));
if (process.argv[3] && existsSync(process.argv[3])) log('METADATA upstream', sha(process.argv[3]), readFileSync(process.argv[3], 'utf8'));
// any provenance / images for navy
const cand = [...walk(join(W, 'vibes')), ...walk(join(N, 'assets')), ...walk(join(N, 'src/pure/vibes'))]
  .filter(p => /navy/i.test(p));
for (const p of cand) log('navy-file', p.replace('/Users/micahflunker/dev/vibes-night/wt/', ''), statSync(p).size);
const prov = [...walk(W), ...walk(N)].filter(p => /PROVENANCE/i.test(p));
log('PROVENANCE files anywhere in either tree:', prov.length ? prov.join(', ') : 'none');
