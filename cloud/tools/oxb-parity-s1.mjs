// Parity spot-check for oxblood, round 2-s1: web def vs native def bytes, web CSS tokens vs native build.
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood/';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood/';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const pairs = [
  ['vibes/defs/oxblood.js', 'src/pure/vibes/defs/oxblood.js'],
  ['vibes/defs/index.js', 'src/pure/vibes/defs/index.js'],
  ['vibes/defs/vocab.js', 'src/pure/vibes/defs/vocab.js'],
  ['vibes/icons/oxblood.js', 'src/pure/vibes/icons/oxblood.js'],
];
for (const [w, n] of pairs) {
  const a = existsSync(W + w) ? sha(W + w) : 'MISSING', b = existsSync(N + n) ? sha(N + n) : 'MISSING';
  console.log((a === b ? 'SAME ' : 'DIFF ') + w + ' ' + a.slice(0, 16) + ' ' + b.slice(0, 16));
}
const def = (await import(pathToFileURL(W + 'vibes/defs/oxblood.js').href)).default;
const IDX = await import(pathToFileURL(W + 'vibes/defs/index.js').href);
console.log('colors', JSON.stringify(def.colors));
console.log('radius', JSON.stringify(def.radius));
console.log('variants', JSON.stringify(def.variants));
console.log('face', JSON.stringify(def.face));
console.log('tagInk', JSON.stringify(def.tagInk), 'shape', JSON.stringify(def.shape), 'icons', def.icons);
console.log('chrome', JSON.stringify(def.chrome));
console.log('tint', JSON.stringify(def.tint));
const css = readFileSync(W + 'vibes/oxblood.css', 'utf8');
const i = css.indexOf('BEGIN'); const j = css.indexOf('END', i);
console.log('CSS generated block present:', i >= 0, j > i);
const block = i >= 0 ? css.slice(i, j) : css.slice(0, 6000);
const vars = {};
for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
console.log('css vars', Object.keys(vars).length);
console.log(JSON.stringify(vars));
