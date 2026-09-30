// Width of the mini-stat figure's prefixes + an ellipsis in Oxblood's native static (ExtraBold), 14px, tnum digits.
import opentype from 'opentype.js';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
const dir = '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood/assets/fonts';
let file = null;
for (const fam of readdirSync(dir)) for (const f of readdirSync(join(dir, fam))) if (/Schibsted.*800/.test(f)) file = join(dir, fam, f);
console.log('file', file);
const font = opentype.loadSync(file);
const upm = font.unitsPerEm;
const adv = (s, tnum) => [...s].reduce((a, ch) => {
  const g = font.charToGlyph(ch);
  let w = g.advanceWidth;
  return a + w;
}, 0) * 14 / upm;
for (const s of ['48.5k', '48.5', '48.', '48', '…']) console.log(JSON.stringify(s), adv(s).toFixed(2));
