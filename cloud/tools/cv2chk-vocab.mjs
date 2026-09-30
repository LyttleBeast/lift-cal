import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-cv2/';
const voc = (await import(pathToFileURL(W + 'vibes/defs/vocab.js'))).default;
console.log('top keys', Object.keys(voc));
const blocks = voc.blocks;
const src = readFileSync('/Users/micahflunker/dev/vibes-night/wt/nat-cv2/src/ui/variant.js', 'utf8');
const m = src.match(/export const VARIANTS = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
const nat = {};
for (const l of m[1].split('\n')) { const k = l.match(/^\s*(\w+):\s*Object\.freeze\(\[(.*)\]\)/); if (k) nat[k[1]] = k[2].split(',').map(s => s.trim().replace(/'/g, '')); }
const sample = Object.entries(blocks)[0];
console.log('sample block', sample[0], JSON.stringify(sample[1]).slice(0, 600));
for (const [b, def] of Object.entries(blocks)) {
  const looks = def.looks ? (Array.isArray(def.looks) ? def.looks.map(l => l.name || l.id || l) : Object.keys(def.looks)) : null;
  const n = nat[b];
  const eq = looks && n && JSON.stringify(['v1', ...looks.filter(x => x !== 'v1')]) === JSON.stringify(n);
  if (!eq) console.log('MISMATCH', b, JSON.stringify(looks), JSON.stringify(n));
}
console.log('nat blocks', Object.keys(nat).length, 'vocab blocks', Object.keys(blocks).length);
console.log('params', JSON.stringify(voc.params).slice(0, 800));
