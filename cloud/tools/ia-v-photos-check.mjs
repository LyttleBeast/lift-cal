// ia-v-photos-check.mjs — the measurements behind Iron Age's photo files
// (V59 §11, §13.1, §14; design/iron-age.md §10). Reads the FINAL files and
// measures their actual pixels; nothing here is estimated from tokens alone.
//
//   1. the file: PNG signature, IHDR (4-bit, indexed), palette size, dims,
//      bytes (<= 150 KB each), sha256; the set's total (<= 1.5 MB a client).
//   2. the face rule (Q-Q2) at every box the slot is drawn in: native widths
//      288 / 343 / 358 / 398 and web 288 / 358, each 80 pt tall (band mode;
//      the band is 80 pt at every text size), the crop computed by native
//      src/ui/HeroPhoto.jsx coverAt() read out of the native worktree and
//      evaluated (focal .5 / .5, the definition's), which is also CSS
//      `background-size: cover; background-position: center`. A head box,
//      grown 15 % of its height above and below and 10 % of its width each
//      side, must be wholly visible; no lettering box may touch the crop.
//      The thumbnail's box is the Vibes card's 112 x 88.
//   3. contrast, WCAG 2.2 relative luminance, unrounded:
//      - band mode: no word is drawn on a plate (the box's padding grows by
//        the band). Recorded: the plate's own ink-to-stock range.
//      - the declared fallback (STOCK_SCRIM: rack #e6dec9 at .54 over the
//        whole box, every word in ink #1c1712), in case a client draws the
//        scrim instead of the band: ink text against the darkest scrimmed
//        pixel of each box's visible window, in three compositing models —
//        encoded sRGB 8-bit (Chrome's, measured in research 8a H.6), linear
//        light, and encoded at .53 (Chrome's run-time layer loses about .01).
//      - the thumbnail: `315` (loadNum 35, ink) over the thumb under the same
//        .54 scrim, measured against the darkest scrimmed pixel of the whole
//        thumbnail (the number's rect is inside it, so this bounds it).
//   node ia-v-photos-check.mjs [outDir]   -> <outDir>/check.json (default ia-photos/out)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { JOBS, STOCK, INK, PALETTE, hex, LIN, lumRGB } from './ia-v-photos.mjs';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const { PNG } = require('pngjs');

const OUT = process.argv[2] || '/Users/micahflunker/dev/vibes-night/ia-photos/out';
const HP = readFileSync('/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age/src/ui/HeroPhoto.jsx', 'utf8');
const at = HP.indexOf('export function coverAt(');
const coverAt = new Function(HP.slice(at, HP.indexOf('\n}\n', at) + 3).replace('export ', '') + '\nreturn coverAt;')();
const sha = b => createHash('sha256').update(b).digest('hex');
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const enc = l => Math.round(255 * (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055));
const S = hex(STOCK), K = hex(INK), Lk = lumRGB(...K), Ls = lumRGB(...S);
const SCRIM = 0.54;
const over = (p, a, model) => model === 'lin'
  ? [0, 1, 2].map(i => enc(LIN[S[i]] * a + LIN[p[i]] * (1 - a)))
  : [0, 1, 2].map(i => Math.round(S[i] * a + p[i] * (1 - a)));

const BAND = 80;
const BOXES = { band: [...[288, 343, 358, 398].map(w => ({ client: 'native', w, h: BAND })), ...[288, 358].map(w => ({ client: 'web', w, h: BAND }))],
                thumb: [{ client: 'both', w: 112, h: 88 }] };

function ihdr(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), bitDepth: buf[24], colourType: buf[25] };
}
function plteCount(buf) { let o = 8; while (o < buf.length) { const len = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8); if (t === 'PLTE') return len / 3; o += 12 + len; } return 0; }

const res = { stock: STOCK, ink: INK, scrim: SCRIM, coverAt: 'rack-mobile src/ui/HeroPhoto.jsx (vibes/iron-age worktree), evaluated', files: [], totalBytes: 0, pass: true };
const fail = (why) => { res.pass = false; console.log('FAIL', why); };
for (const j of JOBS) {
  const buf = readFileSync(`${OUT}/${j.out}`), hd = ihdr(buf), pal = plteCount(buf);
  const png = PNG.sync.read(buf), W = png.width, H = png.height;
  const f = { file: j.out, slot: j.slot, plate: j.plate, bytes: buf.length, sha256: sha(buf), dims: `${W}x${H}`, bitDepth: hd.bitDepth, colourType: hd.colourType, paletteColours: pal };
  res.totalBytes += buf.length;
  if (hd.colourType !== 3 || hd.bitDepth !== 4) fail(j.out + ' is not 4-bit indexed');
  if (buf.length > 150 * 1024) fail(j.out + ' over 150 KB');
  if (W !== j.size[0] || H !== j.size[1]) fail(j.out + ' dims');
  // the pixels, and the palette they use
  let mn = 1, mx = 0; const used = new Set();
  for (let i = 0; i < W * H; i++) { const r = png.data[i * 4], g = png.data[i * 4 + 1], b = png.data[i * 4 + 2]; used.add((r << 16) | (g << 8) | b); const L = lumRGB(r, g, b); if (L < mn) mn = L; if (L > mx) mx = L; }
  f.coloursUsed = used.size;
  f.paletteIsInkStockLine = [...used].every(c => PALETTE.some(p => ((p[0] << 16) | (p[1] << 8) | p[2]) === c));
  if (!f.paletteIsInkStockLine) fail(j.out + ' has a colour off the ink-stock line');
  f.plateRange = +ratio(mn, mx).toFixed(2);
  f.darkestIsInk = Math.abs(mn - Lk) < 1e-9; f.lightestIsStock = Math.abs(mx - Ls) < 1e-9;
  // the boxes
  const sx = W / j.crop.w, sy = H / j.crop.h;
  const toAsset = r => ({ x0: (r.x0 - j.crop.x) * sx, y0: (r.y0 - j.crop.y) * sy, x1: (r.x1 - j.crop.x) * sx, y1: (r.y1 - j.crop.y) * sy });
  const grown = j.faces.map(fb => { const h = fb.y1 - fb.y0, w = fb.x1 - fb.x0; return toAsset({ x0: fb.x0 - 0.1 * w, x1: fb.x1 + 0.1 * w, y0: fb.y0 - 0.15 * h, y1: fb.y1 + 0.15 * h }); });
  f.lettering = j.lettering.map(l => ({ what: l.what, outsideCrop: l.x1 <= j.crop.x || l.x0 >= j.crop.x + j.crop.w || l.y1 <= j.crop.y || l.y0 >= j.crop.y + j.crop.h }));
  for (const l of f.lettering) if (!l.outsideCrop) fail(j.out + ' crop touches ' + l.what);
  f.boxes = [];
  for (const box of BOXES[j.slot === 'thumb' ? 'thumb' : 'band']) {
    const c = coverAt({ w: W, h: H }, { w: box.w, h: box.h }, { x: 0.5, y: 0.5 });
    // the visible window, in asset px
    const win = { x0: -c.x / c.w * W, y0: -c.y / c.h * H, x1: (-c.x + box.w) / c.w * W, y1: (-c.y + box.h) / c.h * H };
    const faces = grown.map(g => ({ grown: Object.fromEntries(Object.entries(g).map(([k, v]) => [k, +v.toFixed(1)])),
      margin: +Math.min(g.x0 - win.x0, win.x1 - g.x1, g.y0 - win.y0, win.y1 - g.y1).toFixed(1) }));
    for (const fc of faces) if (fc.margin < 0) fail(`${j.out} cuts a face at ${box.client} ${box.w}x${box.h}`);
    // the declared fallback: ink over the scrimmed darkest pixel of the window
    const X0 = Math.floor(win.x0), X1 = Math.ceil(win.x1), Y0 = Math.floor(win.y0), Y1 = Math.ceil(win.y1);
    let dark = null, dL = 2;
    for (let y = Math.max(0, Y0); y < Math.min(H, Y1); y++) for (let x = Math.max(0, X0); x < Math.min(W, X1); x++) { const i = (y * W + x) * 4, L = lumRGB(png.data[i], png.data[i + 1], png.data[i + 2]); if (L < dL) { dL = L; dark = [png.data[i], png.data[i + 1], png.data[i + 2]]; } }
    const m = {};
    for (const [name, a, model] of [['encoded', SCRIM, 'enc'], ['linear', SCRIM, 'lin'], ['encoded_minus_01', SCRIM - 0.01, 'enc']]) {
      const p = over(dark, a, model); m[name] = { worstPixel: '#' + p.map(v => v.toString(16).padStart(2, '0')).join(''), ink: +ratio(Lk, lumRGB(...p)).toFixed(3) };
    }
    const worst = Math.min(...Object.values(m).map(v => v.ink));
    if (j.slot === 'thumb' && worst < 4.5) fail(`${j.out}: 315 at ${worst}`);
    f.boxes.push({ client: box.client, box: `${box.w}x${box.h}`, windowPx: Object.fromEntries(Object.entries(win).map(([k, v]) => [k, +v.toFixed(1)])), faces,
      textOnPlate: j.slot === 'thumb' ? '315 (loadNum 35, chalk ink) over the scrimmed thumbnail' : 'none (band mode: the box grows its padding by the band)',
      [j.slot === 'thumb' ? 'text315' : 'fallbackScrimInkText']: m, worst: +worst.toFixed(3) });
  }
  res.files.push(f);
  console.log(j.out, f.dims, f.bytes + ' B', 'range', f.plateRange, 'colours', f.coloursUsed, 'faceMin', Math.min(...f.boxes.flatMap(b => b.faces.map(x => x.margin)), Infinity), 'worstInk', Math.min(...f.boxes.map(b => b.worst)).toFixed(3));
}
if (res.totalBytes > 1.5 * 1024 * 1024) fail('imagery over 1.5 MB');
console.log('total', res.totalBytes, 'B', res.pass ? 'PASS' : 'FAIL');
writeFileSync(`${OUT}/check.json`, JSON.stringify(res, null, 1));
process.exit(res.pass ? 0 : 1);
