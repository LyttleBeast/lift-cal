// fontcheck.mjs — OpenType features, figure widths, x-height and glyph coverage for candidate fonts (research track 7).
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const opentype = require('opentype.js');
const need = '’ — · – … × “ ” → ⚙ › ✕ ⋯ ✓ − ‹ ↳ ↑ ↓ ÷ ±'.split(' ');
for (const f of process.argv.slice(2)) {
  let font; try { font = opentype.loadSync(f); } catch (e) { console.log('==', f, 'PARSE FAIL', e.message); continue; }
  const feats = new Set(((font.tables.gsub && font.tables.gsub.features) || []).map(x => x.tag));
  const upm = font.unitsPerEm; const os2 = font.tables.os2 || {};
  const digits = '0123456789'.split('').map(d => font.charToGlyph(d).advanceWidth);
  const missing = need.filter(ch => { const g = font.charToGlyph(ch); return !g || g.index === 0; });
  const axes = font.tables.fvar ? font.tables.fvar.axes.map(a => `${a.tag} ${a.minValue}-${a.defaultValue}-${a.maxValue}`).join('; ') : 'static';
  console.log('==', f.split('/').pop(), '| upm', upm, '| axes', axes);
  console.log('   features:', [...feats].sort().join(' '));
  console.log('   default digit advances:', [...new Set(digits)].join('/'), digits.every(w => w === digits[0]) ? '(default figures are tabular)' : '(default figures are proportional)');
  console.log('   xHeight/upm', os2.sxHeight ? (os2.sxHeight / upm).toFixed(3) : '?', '| capHeight/upm', os2.sCapHeight ? (os2.sCapHeight / upm).toFixed(3) : '?', '| avg char width/upm', os2.xAvgCharWidth ? (os2.xAvgCharWidth / upm).toFixed(3) : '?');
  console.log('   missing of the §4 glyph list:', missing.join(' ') || 'none');
}
