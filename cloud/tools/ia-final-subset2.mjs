// Iron Age final spec: the web subsets again, each KEEPING a wght axis (§10:
// web faces are variable with a wght axis), wdth pinned at 100. Read-only;
// prints sizes only.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const subsetFont = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/subset-font');
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js');
const R = '/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/';
const A = '/Users/micahflunker/dev/vibes-night/design/iron-age/scratch-a/fonts/';
const roman = readFileSync(R + 'Besley[wdth,wght].ttf'), italic = readFileSync(A + 'Besley-Italic[wdth,wght].ttf');
const ranges = [[0x20, 0x7e], [0xa0, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x304, 0x304], [0x308, 0x308], [0x329, 0x329], [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193],
  [0x2212, 0x2212], [0x2215, 0x2215], [0x2248, 0x2248], [0xfeff, 0xfeff], [0xfffd, 0xfffd]];
let latin = ''; for (const [a, b] of ranges) for (let c = a; c <= b; c++) latin += String.fromCodePoint(c);
const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 16);
let total = 0;
for (const [lbl, b, text, axes] of [
  ['roman   wght 600-800, wdth 100', roman, latin, { wght: { min: 600, max: 800 }, wdth: 100 }],
  ['italic  wght 400-500, wdth 100', italic, latin, { wght: { min: 400, max: 500 }, wdth: 100 }],
  ['digits  wght 600-800, wdth 100', roman, '0123456789,.≈ ', { wght: { min: 600, max: 800 }, wdth: 100 }]
]) {
  const out = await subsetFont(b, text, { targetFormat: 'woff2', variationAxes: axes });
  // the axes that survive, read back from a TTF of the same subset
  const ttf = await subsetFont(b, text, { targetFormat: 'truetype', variationAxes: axes });
  const f = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
  const axesLeft = (f.tables.fvar && f.tables.fvar.axes || []).map(a => `${a.tag} ${a.minValue}-${a.maxValue}`).join(', ') || 'none';
  total += out.length;
  console.log(lbl.padEnd(34), out.length, 'B', sha(out), '| axes kept:', axesLeft);
}
console.log('family total', total, 'B', (total / 1024).toFixed(1), 'KiB');
