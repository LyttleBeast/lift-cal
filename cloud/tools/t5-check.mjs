// Track 5: quick report on arbitrary font files: size, sha256, cmap count, test-glyph coverage,
// GSUB features, axes, name/version, and whether tnum digits are uniform.
// Usage: node t5-check.mjs <file> [file...]
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js');
const hb = await require('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs');
const TEST = '’ — · – … × “ ” → ⚙ › ✕ ⋯ ✓ − ‹ ↳ ↑ ↓ ÷ ±'.split(' ');
for (const p of process.argv.slice(2)) {
  const buf = readFileSync(p);
  const blob = hb.createBlob(buf), face = hb.createFace(blob, 0), font = hb.createFont(face);
  const unis = new Set(face.collectUnicodes());
  const shape = (t, f) => { const b = hb.createBuffer(); b.addText(t); b.guessSegmentProperties(); hb.shape(font, b, f); const j = b.json(); b.destroy(); return j.map(g => g.ax); };
  let ot = null, feats = [], names = {};
  try {
    ot = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    feats = [...new Set((ot.tables.gsub?.features || []).map(f => f.tag))].sort();
    names = { family: ot.names.fontFamily?.en, sub: ot.names.fontSubfamily?.en, ps: ot.names.postScriptName?.en, version: ot.names.version?.en, typoFamily: ot.names.preferredFamily?.en, typoSub: ot.names.preferredSubfamily?.en };
  } catch (e) { names.err = String(e).slice(0, 100); }
  const tn = shape('0123456789', '-kern,tnum');
  console.log(JSON.stringify({ file: p.split('/').slice(-2).join('/'), bytes: statSync(p).size, sha256: createHash('sha256').update(buf).digest('hex').slice(0, 16),
    cmap: unis.size, axes: face.getAxisInfos(), missing: TEST.filter(c => !unis.has(c.codePointAt(0))).join(''),
    gsub: feats.join(','), tnumDigits: new Set(tn).size > 1 ? '0-9: ' + tn.join(',') : String(tn[0]), wClass: ot?.tables.os2?.usWeightClass, ...names }));
  font.destroy(); face.destroy(); blob.destroy();
}
