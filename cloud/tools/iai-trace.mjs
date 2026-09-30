// V/icons (Iron Age, V59 §11): step 2, the trace. For each cropped source (icons-ia/src/<id>.png, made by
// iai-crop.mjs with sips): grayscale (Rec. 601 luma), blank the masks, threshold ink at luminance < T,
// optionally close the engraving's hatching into a solid silhouette (a disc dilate then erode of radius R,
// then fill every hole not reachable from the border, then keep the K largest components), and trace the
// binary image with imagetracerjs 1.2.6 (public domain) with fixed options, so every run gives the same
// paths. Writes icons-ia/trace/<id>.svg (the tracer's own SVG, the record), <id>.json (the outer contours
// as polylines in crop pixels) and <id>-bin.png (what was traced). Nothing here is AI: thresholds,
// morphology and a deterministic tracer only.
//   node tools/iai-trace.mjs [id ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PNG } from '/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs/lib/png.js';
import { SOURCES } from './iai-sources.mjs';
const require = createRequire(import.meta.url);
const ImageTracer = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/imagetracerjs/imagetracer_v1.2.6.js');

// Per-source preprocessing. T: ink threshold; R: closing radius (0 = trace the line art as drawn);
// K: components kept (0 = all); fill: fill holes.
export const PRE = {
  'globe-bell': { T: 150, R: 4, K: 1, fill: true },
  globe:        { T: 150, R: 4, K: 1, fill: true },
  'bar-bell':   { T: 150, R: 0, K: 0, fill: false },
  club:         { T: 205, R: 4, K: 1, fill: true, capTop: true },
  ring:         { T: 150, R: 3, K: 1, fill: false },
  exerciser:    { T: 150, R: 0, K: 0, fill: false },
  'dial-scale': { T: 175, R: 3, K: 1, fill: true },
  gears:        { T: 150, R: 2, K: 0, fill: true },
  padlock:      { T: 185, R: 3, K: 1, fill: true },
  fork:         { T: 150, R: 2, K: 1, fill: true },
  tumbler:      { T: 150, R: 3, K: 1, fill: true },
  carafe:       { T: 150, R: 3, K: 1, fill: true },
  nib:          { T: 150, R: 2, K: 1, fill: true },
  insole:       { T: 150, R: 3, K: 1, fill: true },
  fist:         { T: 150, R: 3, K: 1, fill: true },
  fist422:      { T: 150, R: 2, K: 1, fill: true },
  book:         { T: 150, R: 4, K: 1, fill: true },
  camera:       { T: 150, R: 4, K: 1, fill: true },
  calendar:     { T: 150, R: 4, K: 1, fill: true }
};
export const TRACE_OPTS = { ltres: 1, qtres: 1, pathomit: 8, rightangleenhance: false, colorsampling: 0, numberofcolors: 2,
  pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }], mincolorratio: 0, colorquantcycles: 1,
  layering: 0, blurradius: 0, strokewidth: 1, linefilter: false, scale: 1, roundcoords: 1, viewbox: true, desc: false };

function disc(r) { const o = []; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) o.push([dx, dy]); return o; }
function morph(b, W, H, r, dil) {
  const out = new Uint8Array(W * H), k = disc(r);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = dil ? 0 : 1;
    for (const [dx, dy] of k) { const X = x + dx, Y = y + dy; const s = X < 0 || Y < 0 || X >= W || Y >= H ? 0 : b[Y * W + X];
      if (dil && s) { v = 1; break; } if (!dil && !s) { v = 0; break; } }
    out[y * W + x] = v;
  }
  return out;
}
function fillHoles(b, W, H) {
  const seen = new Uint8Array(W * H), st = [];
  for (let x = 0; x < W; x++) { st.push(x, (H - 1) * W + x); } for (let y = 0; y < H; y++) { st.push(y * W, y * W + W - 1); }
  while (st.length) { const p = st.pop(); if (seen[p] || b[p]) continue; seen[p] = 1; const x = p % W, y = (p / W) | 0;
    if (x > 0) st.push(p - 1); if (x < W - 1) st.push(p + 1); if (y > 0) st.push(p - W); if (y < H - 1) st.push(p + W); }
  const out = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) out[p] = b[p] || !seen[p] ? 1 : 0; return out;
}
function keepLargest(b, W, H, K) {
  const lab = new Int32Array(W * H), sizes = [0]; let n = 0;
  for (let p = 0; p < W * H; p++) if (b[p] && !lab[p]) { n++; let c = 0; const st = [p]; lab[p] = n;
    while (st.length) { const q = st.pop(); c++; const x = q % W, y = (q / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const r = Y * W + X; if (b[r] && !lab[r]) { lab[r] = n; st.push(r); } } } sizes.push(c); }
  const keep = new Set(sizes.map((s, i) => [s, i]).slice(1).sort((a, b) => b[0] - a[0]).slice(0, K).map(a => a[1]));
  const out = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) out[p] = keep.has(lab[p]) ? 1 : 0; return out;
}
function polyOf(path) {
  const pts = [];
  for (const s of path.segments) {
    if (!pts.length) pts.push([s.x1, s.y1]);
    if (s.type === 'L') pts.push([s.x2, s.y2]);
    else for (let t = 1; t <= 4; t++) { const u = t / 4, v = 1 - u; pts.push([v * v * s.x1 + 2 * v * u * s.x2 + u * u * s.x3, v * v * s.y1 + 2 * v * u * s.y2 + u * u * s.y3]); }
  }
  return pts;
}

const only = process.argv.slice(2);
// Run only when called, not when another script imports PRE / TRACE_OPTS (iav-prov.mjs).
const main = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (main) for (const s of SOURCES) {
  if (only.length && !only.includes(s.id)) continue;
  const P = PRE[s.id];
  const im = PNG.sync.read(readFileSync(`/Users/micahflunker/dev/vibes-night/icons-ia/src/${s.id}.png`));
  const W = im.width, H = im.height;
  let b = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) b[p] = (0.299 * im.data[p * 4] + 0.587 * im.data[p * 4 + 1] + 0.114 * im.data[p * 4 + 2]) < P.T ? 1 : 0;
  for (const m of s.masks || []) for (let y = m.y; y < m.y + m.h; y++) for (let x = m.x; x < m.x + m.w; x++) if (x < W && y < H) b[y * W + x] = 0;
  // capTop: an outline that runs off the crop's top edge (the club's neck, cut by the holder's clamp) is
  // closed with a 3-px rule between its outermost ink in the top row band, so the hole fill sees one shape.
  if (P.capTop) { let lo = W, hi = -1; for (let y = 0; y < 6; y++) for (let x = 0; x < W; x++) if (b[y * W + x]) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
    for (let y = 0; y < 3; y++) for (let x = lo; x <= hi; x++) b[y * W + x] = 1; }
  if (P.R) b = morph(morph(b, W, H, P.R, true), W, H, P.R, false);
  if (P.fill) b = fillHoles(b, W, H);
  if (P.K) b = keepLargest(b, W, H, P.K);
  const img = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) };
  for (let p = 0; p < W * H; p++) { const v = b[p] ? 0 : 255; img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = v; img.data[p * 4 + 3] = 255; }
  const td = ImageTracer.imagedataToTracedata(img, TRACE_OPTS);
  writeFileSync(`/Users/micahflunker/dev/vibes-night/icons-ia/trace/${s.id}.svg`, ImageTracer.getsvgstring(td, TRACE_OPTS));
  const ink = td.palette.findIndex(c => c.r < 128);
  const paths = td.layers[ink].map(p => ({ hole: !!p.isholepath, bbox: p.boundingbox, pts: polyOf(p) }));
  writeFileSync(`/Users/micahflunker/dev/vibes-night/icons-ia/trace/${s.id}.json`, JSON.stringify({ id: s.id, W, H, pre: P, paths }));
  const out = new PNG({ width: W, height: H }); out.data.set(img.data);
  writeFileSync(`/Users/micahflunker/dev/vibes-night/icons-ia/trace/${s.id}-bin.png`, PNG.sync.write(out));
  console.log(s.id, W + 'x' + H, 'paths', paths.length, 'outer', paths.filter(p => !p.hole).length);
}
