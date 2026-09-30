// Meet Day concept A: pull the definition block out of concept-A.md, evaluate
// it, and walk every role in the v2 contract (wt/web-design2 vibes/defs/index.js
// ROLES) with valueOf(): report any role with no value, every colour that is
// not 6-digit hex, and every key v1.js has that the definition lacks.
// Read-only. usage: node mdA-roles.mjs
import fs from 'node:fs';
const idx = await import('/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/defs/index.js');
const v1 = (await import('/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/defs/v1.js')).default;
const vocab = (await import('/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/defs/vocab.js')).default;
const md = fs.readFileSync('/Users/micahflunker/dev/vibes-night/design/meet-day/concept-A.md', 'utf8');
const block = md.split('```js\n')[1].split('\n```')[0];
const src = block.replace('export default deepFreeze(', 'return (');
const def = new Function(src)();
const missing = [], badHex = [], badLook = [];
for (const r of idx.ROLES) {
  const v = idx.valueOf(def, r.path);
  if (v === undefined && r.kind !== 'image') missing.push(r.path);
  if (r.kind === 'color' && !r.channel && !r.ref && v !== null && v !== undefined) {
    for (const c of (typeof v === 'object' ? Object.values(v) : [v])) if (!/^#[0-9a-f]{6}$/i.test(c) && !idx.hexToRgb(def.colors && def.colors[c])) badHex.push(r.path + '=' + c);
  }
}
for (const [b, look] of Object.entries(def.variants)) if (!vocab.blocks[b] || !vocab.blocks[b].variants.includes(look)) badLook.push(b + ':' + look);
const keysOf = (o, p = '') => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) ? [p + k, ...keysOf(v, p + k + '.')] : [p + k]);
const v1keys = new Set(keysOf(v1)), mdkeys = new Set(keysOf(def));
const lacks = [...v1keys].filter(k => !mdkeys.has(k) && !/\.exact$|^tint\.[a-zA-Z]+\.exact|^scrim\.tour\.native\.exact|kpi\.steps\.exact/.test(k));
console.log('roles', idx.ROLES.length, '| missing', missing.length, missing.join(', '));
console.log('non-hex colours', badHex.length, badHex.join(', '));
console.log('looks not in vocab', badLook.length, badLook.join(', '));
console.log('v1 keys the definition lacks (legacy exact strings excluded)', lacks.length, lacks.join(', '));
console.log('variants named', Object.keys(def.variants).length, '| shape keys', Object.keys(def.shape).join(','));
