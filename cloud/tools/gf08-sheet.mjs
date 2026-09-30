// gf08-sheet.mjs — study-only contact sheet of IA pages. Fetches BookReader page previews
// (archive.org/download/<id>/page/n<N>_w<W>.jpg; redirects followed only inside archive.org, a §14 host),
// converts with sips, tiles with pngjs. Output: research/scratch-gf08/sheets/<name>-sheet.png (never an asset).
// Usage: node gf08-sheet.mjs <identifier> <outname> <width> <from> <to> [step]   (0-based n indices, inclusive)
//    or: node gf08-sheet.mjs <identifier> <outname> <width> list n1,n2,...
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const [id, name, w, a, b, step = '1'] = process.argv.slice(2);
const dir = '/Users/micahflunker/dev/vibes-night/research/scratch-gf08/sheets';
mkdirSync(dir, { recursive: true });
let pages = [];
if (a === 'list') pages = b.split(',').map(Number);
else for (let i = Number(a); i <= Number(b); i += Number(step)) pages.push(i);
async function grab(n) {
  const jpg = `${dir}/${name}-${n}.jpg`, png = `${dir}/${name}-${n}.png`;
  if (existsSync(png)) return png;
  let cur = `https://archive.org/download/${encodeURIComponent(id)}/page/n${n}_w${w}.jpg`, res;
  for (let hop = 0; hop < 6; hop++) {
    const h = new URL(cur).hostname;
    if (!(h === 'archive.org' || h.endsWith('.archive.org'))) throw new Error('host ' + h);
    res = await fetch(cur, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
    if (res.status >= 300 && res.status < 400) { cur = new URL(res.headers.get('location'), cur).href; continue; }
    break;
  }
  if (!res.ok) throw new Error('HTTP ' + res.status);
  writeFileSync(jpg, Buffer.from(await res.arrayBuffer()));
  execFileSync('sips', ['-s', 'format', 'png', jpg, '--out', png], { stdio: 'ignore' });
  return png;
}
const tiles = [];
const queue = [...pages];
async function worker() {
  while (queue.length) {
    const n = queue.shift();
    try { const p = await grab(n); tiles.push({ n, img: PNG.sync.read(readFileSync(p)) }); }
    catch (e) { console.log(n, 'FAILED', e.message); }
  }
}
await Promise.all([worker(), worker(), worker()]);
tiles.sort((x, y) => x.n - y.n);
if (!tiles.length) process.exit(1);
const cols = Math.min(10, tiles.length), rows = Math.ceil(tiles.length / cols);
const tw = Math.max(...tiles.map(t => t.img.width)), th = Math.max(...tiles.map(t => t.img.height));
const sheet = new PNG({ width: cols * (tw + 6), height: rows * (th + 6) });
sheet.data.fill(128);
tiles.forEach((t, i) => {
  const ox = (i % cols) * (tw + 6), oy = Math.floor(i / cols) * (th + 6);
  for (let y = 0; y < t.img.height; y++) for (let x = 0; x < t.img.width; x++) {
    const s = (y * t.img.width + x) * 4, d = ((oy + y) * sheet.width + ox + x) * 4;
    for (let c = 0; c < 4; c++) sheet.data[d + c] = t.img.data[s + c];
  }
});
writeFileSync(`${dir}/${name}-sheet.png`, PNG.sync.write(sheet));
console.log('sheet', `${dir}/${name}-sheet.png`, 'cols', cols, 'order', tiles.map(t => t.n).join(','));
