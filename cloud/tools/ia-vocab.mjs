// Print vocab.js's look text for each block's look named by a def.
// usage: node ia-vocab.mjs <tree> <defId>
import { join } from 'node:path';
const [tree, id] = process.argv.slice(2);
const V = (await import(join(tree, 'src/pure/vibes/defs/vocab.js'))).default;
const D = (await import(join(tree, 'src/pure/vibes/defs', id + '.js'))).default;
for (const [b, v] of Object.entries(D.variants)) {
  if (v === 'v1') continue;
  const L = V.blocks[b] && V.blocks[b].looks && V.blocks[b].looks[v];
  console.log('## ' + b + ' · ' + v + '\n' + (L ? L.look : '?') + (L && L.params ? '\n  params: ' + JSON.stringify(L.params) : '') + '\n');
}
console.log('PARAMS', JSON.stringify(D.shape));
