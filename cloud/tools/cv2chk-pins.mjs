import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-cv2/';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-cv2/src/pure/';
const pins = {
  'vibes/defs/v1.js': '9cc8946afea8ac8f19c9bf778f9dfc0f4d6899d69372cc49722d7743fe7b442e',
  'vibes/defs/index.js': '76e01df738f3441ad43a71a25f7b6bc388e45462a945a300605fdfbc8bdb92a1',
  'vibes/icons/v1.js': 'ac776960f63eb15fba9db9a51e6a05a7265edb717cc12c631d6e80d38cb2a818',
  'vibes/defs/vocab.js': 'ecd14ea58bb07735ffbb629cf22c25513059d9a0f587908ab3efbff5fedafd3f',
};
const h = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
for (const [f, pin] of Object.entries(pins)) {
  const a = h(W + f), b = h(N + f);
  const src = readFileSync(W + f, 'utf8');
  const imports = [...src.matchAll(/^\s*(import|export\s+\*|export\s+\{[^}]*\}\s+from)[^\n]*/gm)].map(m => m[0]);
  const dyn = /\bimport\s*\(/.test(src) || /\brequire\s*\(/.test(src);
  console.log(f, 'web==pin', a === pin, 'nat==pin', b === pin, 'imports', JSON.stringify(imports), 'dyn', dyn);
}
// design/vocab.js source?
try { console.log('design/vocab.js == vibes/defs/vocab.js', h('/Users/micahflunker/dev/vibes-night/design/vocab.js') === h(W + 'vibes/defs/vocab.js')); } catch (e) { console.log('design/vocab.js', e.message); }
// the verbatim verifier's pins in native
const vv = readFileSync('/Users/micahflunker/dev/vibes-night/wt/nat-cv2/tools/verify-vibes-verbatim.mjs', 'utf8');
for (const [f, pin] of Object.entries(pins)) console.log('verbatim pin present', f, vv.includes(pin));
// semantics
const vocab = await import(pathToFileURL(W + 'vibes/defs/vocab.js'));
const v1 = await import(pathToFileURL(W + 'vibes/defs/v1.js'));
const idx = await import(pathToFileURL(W + 'vibes/defs/index.js'));
console.log('vocab exports', Object.keys(vocab));
console.log('v1 exports', Object.keys(v1));
console.log('index exports', Object.keys(idx));
const V = v1.default || v1.V1 || v1.v1 || Object.values(v1)[0];
console.log('v1 keys', Object.keys(V));
console.log('v1.variants', JSON.stringify(V.variants));
console.log('v1.shape', JSON.stringify(V.shape), Object.isFrozen(V.shape));
const voc = vocab.default || vocab.VOCAB || Object.values(vocab)[0];
const blocks = voc.blocks || voc;
const bnames = Array.isArray(blocks) ? blocks.map(b => b.key || b.name || b.id) : Object.keys(blocks);
console.log('vocab blocks', bnames.length, JSON.stringify(bnames));
const vk = Object.keys(V.variants);
console.log('variants count', vk.length, 'same order', JSON.stringify(vk) === JSON.stringify(bnames), 'same set', vk.length === bnames.length && bnames.every(b => V.variants[b] === 'v1'));
console.log('VARIANTS', JSON.stringify(idx.VARIANTS));
