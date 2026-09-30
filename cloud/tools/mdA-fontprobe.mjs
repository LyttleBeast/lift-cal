// Meet Day concept A: name table, metrics, tnum, GSUB features and glyph
// coverage for the candidate native statics (read-only).
// usage: node mdA-fontprobe.mjs <font.ttf> [...]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js');
const hb = await require('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs');
const crypto = await import('node:crypto');
const GLYPHS = { minus: 0x2212, hyphen: 0x2d, endash: 0x2013, emdash: 0x2014, times: 0xd7, middot: 0xb7, ellipsis: 0x2026,
  approx: 0x2248, plusminus: 0xb1, arrowR: 0x2192, arrowU: 0x2191, arrowD: 0x2193, arrowHook: 0x21b3, check: 0x2713,
  cross: 0x2715, midEllipsis: 0x22ef, gear: 0x2699, warn: 0x26a0, pencil: 0x270e, lsaquo: 0x2039, rsaquo: 0x203a,
  percent: 0x25, degree: 0xb0, rsquo: 0x2019, nbsp: 0xa0, thinsp: 0x2009 };
for (const p of process.argv.slice(2)) {
  const buf = fs.readFileSync(p);
  const ot = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const n = ot.names;
  const en = k => (n[k] && (n[k].en || Object.values(n[k])[0])) || null;
  const upm = ot.unitsPerEm, hh = ot.tables.hhea, os2 = ot.tables.os2;
  const blob = hb.createBlob(buf), face = hb.createFace(blob, 0), font = hb.createFont(face);
  const adv = (t, f) => { const b = hb.createBuffer(); b.addText(t); b.guessSegmentProperties(); hb.shape(font, b, f); const j = b.json(); b.destroy(); return j.map(g => g.ax); };
  const def = adv('0123456789', '-kern');
  const tn = adv('0123456789', 'tnum,-kern');
  const feats = [...new Set((ot.tables.gsub && ot.tables.gsub.features || []).map(f => f.tag))].sort().join(' ');
  const cov = Object.entries(GLYPHS).filter(([, cp]) => !ot.charToGlyphIndex(String.fromCodePoint(cp))).map(([k]) => k);
  const fvar = ot.tables.fvar ? ot.tables.fvar.axes.map(a => `${a.tag} ${a.minValue}-${a.maxValue}`).join(', ') : 'static';
  console.log(JSON.stringify({
    file: p.split('/').pop(), bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    family: en('fontFamily'), sub: en('fontSubfamily'), prefFamily: en('preferredFamily'), prefSub: en('preferredSubfamily'),
    ps: en('postScriptName'), version: en('version'), copyright: en('copyright'), license: (en('license') || '').slice(0, 90),
    upm, hheaAsc: hh.ascender, hheaDesc: hh.descender, lineGap: hh.lineGap, minLh: +((hh.ascender - hh.descender) / upm).toFixed(3),
    capH: os2.sCapHeight, xH: os2.sxHeight, wght: os2.usWeightClass, wdthClass: os2.usWidthClass, fvar,
    digitsDefault: def.join(','), digitsTnum: tn.join(','), tnumUniform: new Set(tn).size === 1, features: feats, missing: cov.join(' ')
  }, null, 1));
  font.destroy(); face.destroy(); blob.destroy();
}
