// Iron Age A: probe font files with opentype.js — coverage of the characters IA-A's Besley roles
// can meet, metrics (UPM, hhea, cap height, x-height), tnum digit advances, PostScript name, GSUB features.
//   node tools/ia-a-fontprobe.mjs <ttf> [<ttf> ...]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const opentype = require('opentype.js');
const CHARS = ['0123456789', ',', '.', '−', '-', '+', '±', '≈', '×', '·', '%', '’', '“', '”', '—', '–', '…', '/', '→', '↑', '↓', '✓', '✕', '⋯', '⚙', '↳', '✎', '⚠', '▾', '▴', '‹', '›', 'é', 'ü', '½', '¼'];
for (const f of process.argv.slice(2)) {
  const buf = fs.readFileSync(f);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const upm = font.unitsPerEm, hh = font.tables.hhea, os2 = font.tables.os2;
  const has = c => [...c].every(ch => font.charToGlyphIndex(ch) > 0);
  const missing = CHARS.filter(c => !has(c));
  const H = font.charToGlyph('H').getBoundingBox(), x = font.charToGlyph('x').getBoundingBox();
  const feats = [...new Set((font.tables.gsub?.features || []).map(ft => ft.tag))].sort();
  // tnum: find substitutions for digits under the tnum feature (lookup type 1) and read advances
  const digAdv = [...'0123456789'].map(d => font.charToGlyph(d).advanceWidth);
  let tnumAdv = null;
  try {
    const subs = font.substitution.getFeature('tnum', 'latn', 'dflt') || font.substitution.getFeature('tnum', 'DFLT', 'dflt');
    if (subs) {
      const map = new Map(subs.map(s => [s.sub, s.by]));
      tnumAdv = [...'0123456789'].map(d => { const gi = font.charToGlyphIndex(d); const to = map.get(gi); return font.glyphs.get(to ?? gi).advanceWidth; });
    }
  } catch (e) { tnumAdv = 'err ' + e.message; }
  console.log(`== ${f.split('/').pop()} (${buf.length} B)`);
  console.log(`  names: family "${font.names.fontFamily?.en}" sub "${font.names.fontSubfamily?.en}" postscript "${font.names.postScriptName?.en}" version "${font.names.version?.en}"`);
  console.log(`  UPM ${upm} hhea ${hh.ascender}/${hh.descender}/${hh.lineGap} -> ratio ${((hh.ascender - hh.descender + hh.lineGap) / upm).toFixed(3)} | capH ${(H.y2 / upm).toFixed(3)} (OS/2 ${os2.sCapHeight / upm}) xH ${(x.y2 / upm).toFixed(3)}`);
  console.log(`  default digit advances: ${digAdv.join(' ')}  | tnum: ${Array.isArray(tnumAdv) ? tnumAdv.join(' ') : tnumAdv}`);
  console.log(`  GSUB: ${feats.join(' ')}`);
  console.log(`  missing of ${CHARS.length}: ${missing.join(' ') || 'none'}`);
  console.log(`  fvar: ${font.tables.fvar ? font.tables.fvar.axes.map(a => `${a.tag} ${a.minValue}-${a.maxValue} (def ${a.defaultValue})`).join(', ') : 'static'}`);
  const lic = font.names.license?.en || ''; const cp = font.names.copyright?.en || '';
  console.log(`  copyright: ${cp.slice(0, 140)}`);
  console.log(`  licence: ${lic.slice(0, 120)}`);
}
