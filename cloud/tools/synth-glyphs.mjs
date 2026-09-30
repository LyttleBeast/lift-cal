// Synthesis check (read-only, computed): cmap coverage of glyphs no track measured
// (⚠ U+26A0, ✎ U+270E, ▾ U+25BE, ▴ U+25B4) plus the 21-glyph set's ⚙ ✓ ✕, in every
// font file tracks 3, 5 and 6 downloaded for the picks. opentype.js from tools/node_modules.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import opentype from 'opentype.js';

const roots = [
  '/Users/micahflunker/dev/vibes-night/research/fonts',
  '/Users/micahflunker/dev/vibes-night/tools/fonts',
  '/Users/micahflunker/dev/vibes-night/research/scratch-06',
];
const want = { '⚠': 0x26a0, '✎': 0x270e, '▾': 0x25be, '▴': 0x25b4, '⚙': 0x2699, '✓': 0x2713, '✕': 0x2715, '×': 0x00d7, '−': 0x2212 };
const pick = /(sofia|overpass|schibsted|saira|source.?serif|alumni|besley|archivo|oldstandard|vollkorn)/i;

function walk(d, out) {
  let names = [];
  try { names = readdirSync(d); } catch { return; }
  for (const n of names) {
    const p = `${d}/${n}`;
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ttf|otf)$/i.test(n) && pick.test(n)) out.push(p);
  }
}
const files = [];
roots.forEach((r) => walk(r, files));
for (const f of files) {
  try {
    const buf = readFileSync(f);
    const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    const cmap = font.tables.cmap.glyphIndexMap;
    const miss = Object.entries(want).filter(([, cp]) => !cmap[cp]).map(([c]) => c).join(' ');
    console.log(f.replace('/Users/micahflunker/dev/vibes-night/', ''), '| missing:', miss || '(none)');
  } catch (e) {
    console.log(f, 'ERR', e.message);
  }
}
