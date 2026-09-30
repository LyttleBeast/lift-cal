// Print a font's axes, named instances, GSUB/GPOS feature tags, digit advances
// and whether given characters have glyphs. Research helper (Phase R, track 6).
// Usage: node fontinfo.mjs <font.ttf> [chars]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const opentype = require('opentype.js');
const [file, chars = '0123456789'] = process.argv.slice(2);
const f = opentype.loadSync(file);
const names = f.names;
console.log('family:', names.fontFamily?.en, '| version:', names.version?.en);
console.log('unitsPerEm:', f.unitsPerEm, '| xHeight:', f.tables.os2?.sxHeight, '| capHeight:', f.tables.os2?.sCapHeight);
const fvar = f.tables.fvar;
if (fvar) {
  console.log('axes:', fvar.axes.map(a => `${a.tag} ${a.minValue}-${a.maxValue} (default ${a.defaultValue})`).join('; '));
  console.log('named instances:', fvar.instances.length, fvar.instances.slice(0, 80).map(i => i.name?.en).join(', '));
}
const feats = t => [...new Set((f.tables[t]?.features || []).map(x => x.tag))].join(' ');
console.log('GSUB features:', feats('gsub'));
console.log('GPOS features:', feats('gpos'));
const adv = [...'0123456789'].map(c => f.charToGlyph(c).advanceWidth);
console.log('default digit advances:', adv.join(' '), adv.every(a => a === adv[0]) ? '(tabular by default)' : '(proportional by default)');
const missing = [...chars].filter(c => f.charToGlyph(c).index === 0);
console.log('missing of given chars:', missing.length ? missing.join(' ') : 'none');
