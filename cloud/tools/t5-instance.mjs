// Track 5: pin a variable font to a static instance with hb-subset (subset-font), keeping every
// codepoint and every layout feature. Usage: node t5-instance.mjs <in.ttf> <out.ttf> axis=value [axis=value...]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const subsetFont = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/subset-font');
const hb = await require('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs');
const [src, out, ...pins] = process.argv.slice(2);
const buf = readFileSync(src);
const blob = hb.createBlob(buf), face = hb.createFace(blob, 0);
const text = [...face.collectUnicodes()].map(c => String.fromCodePoint(c)).join('');
face.destroy(); blob.destroy();
const variationAxes = Object.fromEntries(pins.map(p => { const [k, v] = p.split('='); return [k, +v]; }));
const res = await subsetFont(buf, text, { targetFormat: 'sfnt', variationAxes, preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17] });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, res);
console.log(JSON.stringify({ src: src.split('/').pop(), out, bytes: res.length, variationAxes }));
