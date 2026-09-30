// iav-try.mjs <module.mjs> <out.png> [names,...] — draw each drawing of the module's default export
// ({ name: { viewBox, stroke, els, linecap? } }, or an icon set: its icons / glyphs / ornaments) at 66, 44, 22 and
// 16 px per 24 units, ink on the Iron Age stock, one row each. For looking at, not a production renderer.
import { PNG } from '/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs/lib/png.js';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { draw } from './iav-raster-lib.mjs';
const [mod, out, only] = process.argv.slice(2);
const m = (await import(pathToFileURL(mod).href + '?' + Date.now())).default;
let items = m.icons ? [...Object.entries(m.icons), ...Object.entries(m.glyphs || {}).map(([k, v]) => ['g.' + k, v]),
  ...Object.entries(m.ornaments || {}).map(([k, v]) => ['o.' + k, v])] : Object.entries(m);
items = items.filter(([k, v]) => v && (!only || only.split(',').includes(k)));
const INK = [0x1c, 0x17, 0x12], STOCK = [0xf1, 0xea, 0xd8];
const sizes = [66, 44, 22, 16];
const rowH = it => { const [, , vw, vh] = it.viewBox.split(' ').map(Number); return Math.ceil(66 * vh / 24) + 12; };
const colW = it => { const [, , vw] = it.viewBox.split(' ').map(Number); return sizes.map(s => Math.ceil(s * vw / 24) + 14); };
const W = Math.max(...items.map(([, it]) => colW(it).reduce((a, b) => a + b, 0))) + 10;
const H = items.reduce((a, [, it]) => a + rowH(it), 0) + 10;
const png = new PNG({ width: W, height: H });
for (let k = 0; k < W * H; k++) { png.data[k * 4] = STOCK[0]; png.data[k * 4 + 1] = STOCK[1]; png.data[k * 4 + 2] = STOCK[2]; png.data[k * 4 + 3] = 255; }
let y = 6;
for (const [name, it] of items) {
  const [, , vw, vh] = it.viewBox.split(' ').map(Number);
  let x = 6; const cw = colW(it);
  sizes.forEach((s, i) => { draw(png.data, W, { linecap: 'square', ...it }, x, y, Math.round(s * Math.max(vw, vh) / 24), it.stroke, INK); x += cw[i]; });
  for (let i = 0; i < W; i++) { const o = ((y + rowH(it) - 6) * W + i) * 4; png.data[o] = 200; png.data[o + 1] = 190; png.data[o + 2] = 170; }
  y += rowH(it);
}
writeFileSync(out, PNG.sync.write(png));
console.log('wrote', out, W + 'x' + H, items.map(i => i[0]).join(' '));
