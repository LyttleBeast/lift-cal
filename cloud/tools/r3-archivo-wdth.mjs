// r3-archivo-wdth.mjs — track 3 research helper (read-only; writes nothing).
// Pins Archivo's variable font (tools/fonts/archivo) at several wdth/wght instances with
// harfbuzz (via subset-font's variationAxes), then measures digit advances with opentype.js,
// so we know how many tabular digits fit a 358pt phone measure at each width.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const subsetFont = require('subset-font');
const opentype = require('opentype.js');

const src = readFileSync('/Users/micahflunker/dev/vibes-night/tools/fonts/archivo/Archivo-wdth-wght.ttf');
const text = '0123456789.,:–−×/ %°lbkgsetrmhABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const f0 = opentype.parse(src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength));
const fvar = f0.tables.fvar;
if (fvar) console.log('axes', fvar.axes.map(a => `${a.tag} ${a.minValue}..${a.maxValue} def ${a.defaultValue}`).join(' | '));

const combos = [];
for (const wdth of [62, 75, 87.5, 100, 112.5, 125]) for (const wght of [400, 700, 800, 900]) combos.push({ wdth, wght });
console.log('wdth wght | digit adv (em) | tab digits per 358pt @17/@28/@48/@88 | cap-height em | "191.2" em | "1,950" em | "PROTEIN" em');
for (const c of combos) {
  let buf;
  try { buf = await subsetFont(src, text, { targetFormat: 'truetype', variationAxes: c }); }
  catch (e) { console.log(c, 'ERR', e.message); continue; }
  const f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const upm = f.unitsPerEm;
  const d = Math.max(...'0123456789'.split('').map(ch => f.charToGlyph(ch).advanceWidth)) / upm;
  const fit = s => Math.floor(358 / (d * s));
  const w = s => (f.getAdvanceWidth(s, 1, { kerning: true })).toFixed(3);
  const cap = f.tables.os2 ? (f.tables.os2.sCapHeight / upm).toFixed(3) : '?';
  console.log(`${String(c.wdth).padEnd(5)} ${c.wght} | ${d.toFixed(3)} | ${fit(17)}/${fit(28)}/${fit(48)}/${fit(88)} | ${cap} | ${w('191.2')} | ${w('1,950')} | ${w('PROTEIN')}`);
}
