// Concept A (oxblood / newsprint grotesk): measure Schibsted Grotesk against
// Archivo for the spec. Read-only; instances the variable fonts with
// subset-font (hb-subset, variationAxes pinned) and reads advances with
// opentype.js, kerning OFF (coach-view.js's convention). Prints JSON-ish text.
// usage: node oxA-measure.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const subsetFont = require('subset-font');
const opentype = require('opentype.js');

const SCH = '/Users/micahflunker/dev/vibes-night/research/fonts/schibstedgrotesk/SchibstedGrotesk[wght].ttf';
const SCH_XB = '/Users/micahflunker/dev/vibes-night/research/fonts/schibstedgrotesk/upstream/SchibstedGrotesk-ExtraBold.ttf';
const ARC = '/Users/micahflunker/dev/vibes-night/tools/fonts/archivo/Archivo-wdth-wght.ttf';

const CHARS = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~’‘“”—–…×·•°→↑↓−±÷✓✕⋯↳⚙⚠✎';

async function inst(file, axes) {
  const buf = fs.readFileSync(file);
  const out = await subsetFont(buf, CHARS, { targetFormat: 'truetype', variationAxes: axes });
  return opentype.parse(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
}
const width = (f, s, size) => {
  let w = 0;
  for (const ch of s) { const g = f.charToGlyph(ch); w += g.advanceWidth; }
  return w / f.unitsPerEm * size;
};
const has = (f, ch) => f.charToGlyph(ch).index !== 0;

const raw = opentype.parse(fs.readFileSync(SCH).buffer);
const hh = raw.tables.hhea, os2 = raw.tables.os2;
console.log('Schibsted UPM', raw.unitsPerEm, 'hhea asc/desc/gap', hh.ascender, hh.descender, hh.lineGap,
  'ratio', ((hh.ascender - hh.descender + hh.lineGap) / raw.unitsPerEm).toFixed(3),
  'OS2 typo', os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap, 'win', os2.usWinAscent, os2.usWinDescent,
  'xh', os2.sxHeight, 'cap', os2.sCapHeight, 'fvar', JSON.stringify(raw.tables.fvar && raw.tables.fvar.axes.map(a => [a.tag, a.minValue, a.defaultValue, a.maxValue])));
const xb = opentype.parse(fs.readFileSync(SCH_XB).buffer);
console.log('ExtraBold static PS name', xb.names.postScriptName && xb.names.postScriptName.en,
  'hhea', xb.tables.hhea.ascender, xb.tables.hhea.descender, xb.tables.hhea.lineGap);
const miss = [...'→↑↓−±÷×✓✕⋯↳⚙⚠✎‹›·…—–’“”'].filter(ch => !has(xb, ch));
console.log('ExtraBold static missing:', miss.join(' '));

const S = {}, A = {};
for (const w of [400, 500, 600, 700, 800]) S[w] = await inst(SCH, { wght: w });
A.h = await inst(ARC, { wdth: 78, wght: 800 });
A.n800 = await inst(ARC, { wdth: 100, wght: 800 });
A.w600 = await inst(ARC, { wdth: 100, wght: 600 });
A.w96_600 = await inst(ARC, { wdth: 96, wght: 600 });
A.w400 = await inst(ARC, { wdth: 100, wght: 400 });
A.load = await inst(ARC, { wdth: 118, wght: 800 });
A.w88_700 = await inst(ARC, { wdth: 88, wght: 700 });

// tabular digits
for (const w of [400, 600, 700, 800]) {
  const f = S[w];
  const adv = [...'0123456789'].map(d => {
    const g = f.charToGlyph(d);
    return g.advanceWidth;
  });
  console.log(`Schibsted ${w} default digit advances`, adv.join(','));
}

// h1 fit: web v1 = Archivo wdth 78 / 800 at 26px
const heads = ['September 2026', 'February 2026', 'Wed, Sep 24', 'Today', 'Weight', 'Steps', 'Great workout.', 'Strongest lifts', 'Conventional Deadlift', 'Incline Dumbbell Bench Press'];
console.log('\nh1 widths (px): v1 web Arch78/800@26 | v1 native Arch100/800@26 | Sch800@26 | Sch700@26 | Sch700@25 | Sch700@24');
for (const h of heads) {
  console.log(h.padEnd(30), [width(A.h, h, 26), width(A.n800, h, 26), width(S[800], h, 26), width(S[700], h, 26), width(S[700], h, 25), width(S[700], h, 24)].map(x => x.toFixed(1)).join(' | '));
}
// h2 18
const h2s = ['Where this comes from', 'Log food', 'How did that feel?', 'Fuel settings', 'Vibes'];
console.log('\nh2 widths: v1 web Arch78/800@18 | Sch700@18 | Sch800@18');
for (const h of h2s) console.log(h.padEnd(30), [width(A.h, h, 18), width(S[700], h, 18), width(S[800], h, 18)].map(x => x.toFixed(1)).join(' | '));

// load-num: v1 web Arch 118/800; native Arch 100/800
const nums = ['1,950', '191.2', '12,480', '−350', '2,450'];
console.log('\nhero figures @34: v1 web Arch118/800 | v1 native Arch100/800 | Sch800 | Sch900?');
S[900] = await inst(SCH, { wght: 900 });
for (const n of nums) console.log(n.padEnd(10), [width(A.load, n, 34), width(A.n800, n, 34), width(S[800], n, 34), width(S[900], n, 34)].map(x => x.toFixed(1)).join(' | '));

// eyebrow / labels: v1 10px caps .16em Arch88/700 vs Sch600@13 sentence
const labs = ['Against your targets', 'How you\'re doing', 'Found in your log', 'Micronutrients', 'Against last week', 'Rack noticed'];
console.log('\nlabels: v1 caps 10px Arch88/700 +.16em | Sch600@13 sentence | Sch600@12');
for (const l of labs) {
  const up = l.toUpperCase();
  const v1 = width(A.w88_700, up, 10) + up.length * 1.6;
  console.log(l.padEnd(26), [v1, width(S[600], l, 13), width(S[600], l, 12)].map(x => x.toFixed(1)).join(' | '));
}

// Coach card faces: line = 600 (web wdth 96 / native 100), why = 400
const sents = ['Great workout. New best on Incline Dumbbell Bench Press.', 'The trend is pointing down.', 'Protein under target 6 of 6 days', 'Averaging 142 g against 200 — on a cut that is the number that decides whether the weight you lose is fat.'];
console.log('\ncoach line @14: Arch100/600 | Arch96/600 (web) | Sch600 ; why @12: Arch400 | Sch400');
for (const s of sents) console.log(s.slice(0, 40).padEnd(42), [width(A.w600, s, 14), width(A.w96_600, s, 14), width(S[600], s, 14), width(A.w400, s, 12), width(S[400], s, 12)].map(x => x.toFixed(1)).join(' | '));
