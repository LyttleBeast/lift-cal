// Meet Day concept A: hhea / OS2 metrics, default vs tnum digit advances, and
// string advances at a size, for the two native statics and the variable font.
// usage: node mdA-metrics.mjs <font> [<font>...]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js');
const hb = await require('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs');
const samples = ['0123456789', '191.2', '1,950', '87%', '25:00', '1:02:33', 'HOW YOU’RE DOING', 'RACK NOTICED', 'WEEKLY REVIEW',
  'AGAINST YOUR TARGETS', 'STRONGEST LIFTS · ALL TIME', 'BACK SQUAT (HIGH BAR)', 'Conventional Deadlift', 'Barbell Bench Press',
  'September 2026', 'Today', 'Good evening,', 'kcal left today', 'Session complete'];
for (const p of process.argv.slice(2)) {
  const buf = fs.readFileSync(p);
  const ot = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const upm = ot.unitsPerEm, hh = ot.tables.hhea, os2 = ot.tables.os2;
  const blob = hb.createBlob(buf), face = hb.createFace(blob, 0), font = hb.createFont(face);
  const adv = (t, f, vars) => { if (vars) font.setVariations(vars); const b = hb.createBuffer(); b.addText(t); b.guessSegmentProperties(); hb.shape(font, b, f); const j = b.json(); b.destroy(); return j.reduce((s, g) => s + g.ax, 0) / upm; };
  const vars = process.env.VARS ? JSON.parse(process.env.VARS) : null;
  const def = [...'0123456789'].map(d => adv(d, '-kern', vars) * upm);
  console.log(JSON.stringify({ file: p.split('/').pop(), upm, hheaAsc: hh.ascender, hheaDesc: hh.descender, lineGap: hh.lineGap,
    minLh: +((hh.ascender - hh.descender) / upm).toFixed(3), capH: os2.sCapHeight, xH: os2.sxHeight, vars,
    defaultDigits: def.join(','), tnumEm: +(adv('0', 'tnum', vars)).toFixed(3) }));
  for (const s of samples) console.log('  ' + JSON.stringify(s) + ' em(tnum,kern)=' + adv(s, 'tnum', vars).toFixed(3));
  font.destroy(); face.destroy(); blob.destroy();
}
