// Oxblood web agent: which characters does Schibsted's tnum widen, besides digits?
// node oxw-tnum-punct.mjs [font]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const NM = '/Users/micahflunker/dev/vibes-night/tools/node_modules/';
const hb = await require(NM + 'harfbuzzjs');
const file = process.argv[2] || '/Users/micahflunker/dev/vibes-night/tools/oxblood-fonts-s1/src/gf/SchibstedGrotesk-wght.ttf';
let buf = readFileSync(file);
if (file.endsWith('.woff2')) { const fv = require(NM + 'fontverter'); buf = await fv.convert(buf, 'truetype'); }
const face = hb.createFace(hb.createBlob(buf), 0);
const font = hb.createFont(face); font.setVariations({ wght: 800 });
const adv = (ch, feat) => { const b = hb.createBuffer(); b.addText(ch); b.guessSegmentProperties(); hb.shape(font, b, feat); const j = b.json(); b.destroy(); return j.map(g => g.g + ':' + g.ax).join(' '); };
const chars = ' ,.:;/-–—−+×·%$€£()[]\'"’kKlbmsx';
for (const c of chars) {
  const a = adv(c, ''), t = adv(c, 'tnum');
  if (a !== t) console.log(JSON.stringify(c), 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), 'default', a, 'tnum', t);
}
console.log('done');
