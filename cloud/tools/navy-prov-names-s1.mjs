// Reads the name table of navy's shipped native TTFs: family, copyright, licence strings.
import opentype from '/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js/dist/opentype.module.js';
import { readFileSync } from 'node:fs';
const N = '/Users/micahflunker/dev/vibes-night/wt/nat-v-navy/assets/fonts/Overpass/';
for (const w of [400, 600, 700, 800]) {
  const b = readFileSync(N + `Overpass_${w}.ttf`);
  const f = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const n = f.names;
  const g = k => (n[k] && (n[k].en || Object.values(n[k])[0])) || '';
  console.log(w, '|', g('fontFamily'), '|', g('postScriptName'), '|', g('copyright'), '|', g('license'), '|', g('licenseURL'), '| wt', f.tables.os2.usWeightClass, '| glyphs', f.glyphs.length);
}
