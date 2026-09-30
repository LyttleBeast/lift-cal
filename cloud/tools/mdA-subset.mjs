// Meet Day concept A: measure what the two native statics weigh subset to
// Latin plus the arrows, minus sign and approx sign Rack's figures carry.
// Writes only under ~/dev/vibes-night/design/meet-day/scratch-A. usage: node mdA-subset.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const subsetFont = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/subset-font');
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js');
const dir = '/Users/micahflunker/dev/vibes-night/design/meet-day/scratch-A/';
// Google's css2 "latin" range, plus U+2190-2193 (← ↑ → ↓: → is not in it), U+2248 ≈, U+2264-2265 ≤ ≥.
const ranges = [[0x20, 0x7e], [0xa0, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2190, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215], [0x2248, 0x2248], [0x2264, 0x2265]];
let text = '';
for (const [a, b] of ranges) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);
for (const f of ['ArchivoExtraCondensed-ExtraBold.gstatic.ttf', 'ArchivoCondensed-Bold.gstatic.ttf']) {
  const src = fs.readFileSync(dir + f);
  const out = await subsetFont(src, text, { targetFormat: 'truetype', preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17] });
  const name = f.replace('.gstatic.ttf', '.latin.ttf');
  fs.writeFileSync(dir + name, out);
  const ot = opentype.parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
  const has = ch => !!ot.charToGlyphIndex(ch);
  const feats = [...new Set((ot.tables.gsub && ot.tables.gsub.features || []).map(x => x.tag))].sort().join(' ');
  console.log(name, out.length, 'bytes', crypto.createHash('sha256').update(out).digest('hex').slice(0, 16),
    'ps', ot.names.postScriptName && ot.names.postScriptName.en, '| has − → ↑ ↓ ≈ ± × · …:', ['−', '→', '↑', '↓', '≈', '±', '×', '·', '…'].map(has).join(','), '| gsub', feats);
}
