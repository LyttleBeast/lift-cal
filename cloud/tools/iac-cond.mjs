// Concept C: Besley Condensed (upstream v4) — width against the normal width, and tnum digit advances.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js/dist/opentype.js');
const load = p => { const b = readFileSync(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const U = '/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/';
const F = { 'Besley-Black': load(U + 'Besley-Black.ttf'), 'BesleyCondensed-Black': load(U + 'BesleyCondensed-Black.ttf'), 'Besley-ExtraBold': load(U + 'Besley-ExtraBold.ttf') };
const w = (f, s) => [...s].reduce((t, ch) => t + f.charToGlyph(ch).advanceWidth, 0) / f.unitsPerEm;
for (const [k, f] of Object.entries(F)) {
  let tnum = null;
  try {
    const subs = f.substitution.getFeature({ tag: 'tnum', script: 'DFLT', language: 'dflt' }) || f.substitution.getFeature({ tag: 'tnum', script: 'latn', language: 'dflt' });
    if (subs) tnum = [...'0123456789'].map(d => { const g = f.charToGlyph(d).index; const hit = subs.find(s => s.sub === g || (s.sub && s.sub[0] === g)); const gi = hit ? (Array.isArray(hit.by) ? hit.by[0] : hit.by) : g; return f.glyphs.get(gi).advanceWidth; });
  } catch (e) { tnum = 'n/a: ' + e.message; }
  console.log(`${k}: ps ${f.names.postScriptName.en}; "September 2026" ${w(f, 'September 2026').toFixed(3)} em; "12,480" ${w(f, '12,480').toFixed(3)} em; hhea ${((f.tables.hhea.ascender - f.tables.hhea.descender) / f.unitsPerEm).toFixed(3)}; tnum digits ${Array.isArray(tnum) ? tnum.join(' ') : tnum}`);
}
console.log('condensed / normal width (Black):', (w(F['BesleyCondensed-Black'], 'September 2026') / w(F['Besley-Black'], 'September 2026')).toFixed(3));
