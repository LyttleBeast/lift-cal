// Look at a full-page PNG: its size, and colour runs down one column (device px).
//   node hsens-png.mjs <png> [--x <device x>] [--from <y>] [--to <y>]
import { readFileSync } from 'node:fs';
import { decodePNG } from '/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs';
const [file, ...rest] = process.argv.slice(2);
const opt = k => { const i = rest.indexOf('--' + k); return i >= 0 ? +rest[i + 1] : null; };
const P = decodePNG(readFileSync(file));
console.log(file.split('/').slice(-3).join('/'), 'size', P.width + 'x' + P.height, 'bpp', P.bpp);
const x = opt('x') ?? 3;
const y0 = opt('from') ?? 0, y1 = Math.min(opt('to') ?? P.height, P.height);
let run = null;
const px = y => { const i = (y * P.width + x) * P.bpp; return [P.data[i], P.data[i + 1], P.data[i + 2]].join(','); };
for (let y = y0; y < y1; y++) {
  const c = px(y);
  if (!run || run.c !== c) { if (run) console.log('  y ' + run.y + '-' + (y - 1) + ' (' + (y - run.y) + ' px, css ' + (run.y / 3).toFixed(1) + '-' + ((y - 1) / 3).toFixed(1) + '): rgb(' + run.c + ')'); run = { y, c }; }
}
if (run) console.log('  y ' + run.y + '-' + (y1 - 1) + ' (' + (y1 - run.y) + ' px, css ' + (run.y / 3).toFixed(1) + '-' + ((y1 - 1) / 3).toFixed(1) + '): rgb(' + run.c + ')');
