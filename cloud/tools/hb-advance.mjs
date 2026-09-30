// Measure a string's advance width in a variable font at given axis settings,
// using harfbuzzjs. Research helper (Phase R, track 6).
// Usage: node hb-advance.mjs <font.ttf> "<text>" "wdth=62,wght=800" ["wdth=100,wght=800" ...]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const hbPromise = require('harfbuzzjs');
const [file, text, ...settings] = process.argv.slice(2);
const hb = await hbPromise;
const blob = hb.createBlob(readFileSync(file));
const face = hb.createFace(blob, 0);
const upem = face.upem;
for (const s of settings) {
  const font = hb.createFont(face);
  const vars = Object.fromEntries(s.split(',').map(kv => { const [k, v] = kv.split('='); return [k, +v]; }));
  font.setVariations(vars);
  const buf = hb.createBuffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(font, buf, 'tnum');
  const adv = buf.json().reduce((a, g) => a + g.ax, 0);
  console.log(`${s}: ${adv} units = ${(adv / upem).toFixed(3)} em for "${text}" (${(adv / upem / [...text].length).toFixed(3)} em/char)`);
  buf.destroy(); font.destroy();
}
face.destroy(); blob.destroy();
