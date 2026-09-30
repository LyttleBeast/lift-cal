// V/icons: a contact sheet of every page of IA fairbanksdialsca00fair (Fairbanks Dial Scales, 1919),
// to find a dial scale cut. Fetches the BookReader previews through tools/fetch.mjs (allowed hosts only),
// converts them to PNG with sips, tiles them with pngjs. Research only; nothing here ships.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PNG } from '/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs/lib/png.js';

const D = '/Users/micahflunker/dev/vibes-night/icons-ia/src/fds';
execFileSync('mkdir', ['-p', D]);
const N = 36, TW = 200, TH = 280, COLS = 9;
const sheet = new PNG({ width: COLS * TW, height: Math.ceil(N / COLS) * TH });
sheet.data.fill(255);
for (let n = 0; n < N; n++) {
  const jpg = `${D}/n${n}.jpg`, png = `${D}/n${n}.png`;
  if (!existsSync(jpg)) execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs',
    `https://archive.org/download/fairbanksdialsca00fair/page/n${n}_w${TW}.jpg`, jpg], { stdio: 'ignore' });
  execFileSync('sips', ['-s', 'format', 'png', jpg, '--out', png], { stdio: 'ignore' });
  const im = PNG.sync.read(readFileSync(png));
  const ox = (n % COLS) * TW, oy = Math.floor(n / COLS) * TH;
  for (let y = 0; y < Math.min(im.height, TH - 14); y++) for (let x = 0; x < Math.min(im.width, TW - 2); x++) {
    const s = (y * im.width + x) * 4, t = ((oy + y) * sheet.width + ox + x) * 4;
    sheet.data[t] = im.data[s]; sheet.data[t + 1] = im.data[s + 1]; sheet.data[t + 2] = im.data[s + 2];
  }
  // a tick of n's parity so pages can be counted on the sheet: n dots under the tile, in rows of 10
  for (let k = 0; k <= n; k++) { const dx = ox + 4 + (k % 18) * 10, dy = oy + TH - 12 + Math.floor(k / 18) * 5;
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { const t = ((dy + a) * sheet.width + dx + b) * 4; sheet.data[t] = 200; sheet.data[t + 1] = 0; sheet.data[t + 2] = 0; } }
}
writeFileSync('/Users/micahflunker/dev/vibes-night/icons-ia/sheets/fds-contact.png', PNG.sync.write(sheet));
console.log('ok');
