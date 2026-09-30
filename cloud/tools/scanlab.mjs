// scanlab.mjs — research track 7: sample paper/ink colours and measure halftone screen rulings from scans.
// Deterministic; reads PNGs made by sips from the downloaded JPEGs. Nothing here edits an image.
// Usage:
//   node scanlab.mjs colour <png> [x0,y0,x1,y1 as fractions]       -> paper + ink medians
//   node scanlab.mjs region <png> x0,y0,x1,y1                        -> median colour of a region
//   node scanlab.mjs screen <png> <ppi> x0,y0 (pixels) [N=256]        -> 2D FFT peak -> lpi + angle
//   node scanlab.mjs info <png>
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');

const [mode, file, a3, a4, a5] = process.argv.slice(2);
const img = PNG.sync.read(readFileSync(file));
const { width: W, height: H, data } = img;
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const Y = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const med = arr => { const s = Float64Array.from(arr).sort(); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
function box(spec, def) {
  const f = (spec || def).split(',').map(Number);
  return [Math.floor(f[0] * W), Math.floor(f[1] * H), Math.floor(f[2] * W), Math.floor(f[3] * H)];
}
function pixels(b) {
  const out = [];
  for (let y = b[1]; y < b[3]; y++) for (let x = b[0]; x < b[2]; x++) {
    const i = (y * W + x) * 4; out.push([data[i], data[i + 1], data[i + 2]]);
  }
  return out;
}
function medColour(px) { return [0, 1, 2].map(c => med(px.map(p => p[c]))); }

if (mode === 'info') { console.log(W, H); }
else if (mode === 'runs') { // node scanlab.mjs runs <png> x0,x1 y0,y1 thresh : ink/blank column runs + ink row extent
  const [x0, x1] = a3.split(',').map(Number), [y0, y1] = a4.split(',').map(Number); const th = Number(a5 || 140);
  const colInk = x => { for (let y = y0; y <= y1; y++) { const i = (y * W + x) * 4; if (Y(data[i], data[i + 1], data[i + 2]) < th) return true; } return false; };
  const rowInk = y => { for (let x = x0; x <= x1; x++) { const i = (y * W + x) * 4; if (Y(data[i], data[i + 1], data[i + 2]) < th) return true; } return false; };
  let rows = []; for (let y = y0; y <= y1; y++) if (rowInk(y)) rows.push(y);
  const runs = []; let cur = colInk(x0), start = x0;
  for (let x = x0 + 1; x <= x1 + 1; x++) { const v = x <= x1 ? colInk(x) : !cur; if (v !== cur) { runs.push((cur ? 'I' : '.') + (x - start)); cur = v; start = x; } }
  console.log('ink rows', rows[0], '-', rows[rows.length - 1], 'height', rows.length ? rows[rows.length - 1] - rows[0] + 1 : 0);
  console.log(runs.join(' '));
}
else if (mode === 'stats') { // node scanlab.mjs stats <png> x0,y0 (pixels) [N=256]: luminance mean/std, fine grain vs 16px-block mottling
  const [x0, y0] = a3.split(',').map(Number); const N = Number(a4 || 256);
  const v = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = ((y0 + y) * W + x0 + x) * 4; v.push(Y(data[i], data[i + 1], data[i + 2])); }
  const mean = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  const B = 16, bm = []; for (let by = 0; by < N; by += B) for (let bx = 0; bx < N; bx += B) { let s = 0; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) s += v[(by + y) * N + bx + x]; bm.push(s / (B * B)); }
  const bmean = bm.reduce((a, b) => a + b, 0) / bm.length, bsd = Math.sqrt(bm.reduce((a, b) => a + (b - bmean) ** 2, 0) / bm.length);
  console.log(`mean Y ${mean.toFixed(1)}  pixel sd ${sd.toFixed(2)} (${(100 * sd / mean).toFixed(2)}%)  16px-block sd ${bsd.toFixed(2)} (${(100 * bsd / mean).toFixed(2)}%)`);
}
else if (mode === 'leading') { // node scanlab.mjs leading <png> <ppi> x0,x1 y0,y1 : autocorrelation of row darkness -> line pitch
  const ppi = Number(a3); const [x0, x1] = a4.split(',').map(Number), [y0, y1] = a5.split(',').map(Number);
  const r = []; for (let y = y0; y <= y1; y++) { let s = 0; for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; s += 255 - Y(data[i], data[i + 1], data[i + 2]); } r.push(s / (x1 - x0)); }
  const m = r.reduce((a, b) => a + b, 0) / r.length; const d = r.map(v => v - m);
  let best = 0, bl = 0; const out = [];
  for (let lag = 20; lag <= 120; lag++) { let s = 0; for (let i = 0; i + lag < d.length; i++) s += d[i] * d[i + lag]; s /= (d.length - lag); out.push([lag, s]); if (s > best) { best = s; bl = lag; } }
  // refine with parabolic interpolation
  const k = out.findIndex(o => o[0] === bl); let frac = 0; if (k > 0 && k < out.length - 1) { const [a, b, c] = [out[k - 1][1], out[k][1], out[k + 1][1]]; frac = 0.5 * (a - c) / (a - 2 * b + c); }
  const px = bl + frac; console.log(`line pitch ${px.toFixed(2)} px = ${(px / ppi * 72).toFixed(2)} pt (baseline-to-baseline)`);
}
else if (mode === 'profile') { // node scanlab.mjs profile <png> x0,x1 y0,y1 (pixels): mean luminance per row
  const [x0, x1] = a3.split(',').map(Number), [y0, y1] = a4.split(',').map(Number);
  for (let y = y0; y <= y1; y++) { let s = 0; for (let x = x0; x < x1; x++) { const i = (y * W + x) * 4; s += Y(data[i], data[i + 1], data[i + 2]); } console.log(y, (s / (x1 - x0)).toFixed(0)); }
}
else if (mode === 'kmeans') { // node scanlab.mjs kmeans <png> x0,y0,x1,y1(fractions) [k]
  const px = pixels(box(a3)); const k = Number(a4 || 3);
  let cs = Array.from({ length: k }, (_, i) => px[Math.floor((i + 0.5) * px.length / k)].slice());
  // seed by luminance order for stability
  const byY = px.slice().sort((p, q) => Y(...p) - Y(...q)); cs = cs.map((_, i) => byY[Math.floor((i + 0.5) * byY.length / k)].slice());
  let lab = new Int32Array(px.length);
  for (let it = 0; it < 25; it++) {
    const sum = cs.map(() => [0, 0, 0, 0]);
    px.forEach((p, i) => { let best = 0, bd = Infinity; cs.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = j; } }); lab[i] = best; const s = sum[best]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
    cs = sum.map((s, j) => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cs[j]);
  }
  const counts = cs.map((_, j) => lab.reduce((a, l) => a + (l === j), 0));
  // report per-cluster medians (robust) with share
  cs.forEach((c, j) => { const mem = px.filter((_, i) => lab[i] === j); console.log(`cluster ${j}: median ${hex(medColour(mem))} share ${(100 * counts[j] / px.length).toFixed(1)}%`); });
}
else if (mode === 'region') {
  const px = pixels(box(a3));
  console.log('region', a3, 'n', px.length, 'median', hex(medColour(px)));
} else if (mode === 'colour') {
  const px = pixels(box(a3, '0.1,0.08,0.9,0.92'));
  px.forEach(p => { p.y = Y(p[0], p[1], p[2]); });
  px.sort((p, q) => p.y - q.y);
  const n = px.length, q = f => px[Math.min(n - 1, Math.floor(f * n))];
  const paper = px.slice(Math.floor(0.6 * n), Math.floor(0.99 * n));
  const ink05 = px.slice(0, Math.max(1, Math.floor(0.005 * n)));
  const ink2 = px.slice(0, Math.max(1, Math.floor(0.02 * n)));
  console.log(JSON.stringify({ file: file.split('/').pop(), W, H, n,
    paper_p60_99_median: hex(medColour(paper)), paper_p50: hex(q(0.5)), paper_p90: hex(q(0.9)),
    ink_darkest0_5pct_median: hex(medColour(ink05)), ink_darkest2pct_median: hex(medColour(ink2)) }));
} else if (mode === 'screen') {
  const ppi = Number(a3); const [x0, y0] = a4.split(',').map(Number); const N = Number(a5 || 256);
  // grayscale crop, mean-removed, Hann-windowed
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  let mean = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = ((y0 + y) * W + x0 + x) * 4; const v = Y(data[i], data[i + 1], data[i + 2]); re[y * N + x] = v; mean += v; }
  mean /= N * N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const w = (0.5 - 0.5 * Math.cos(2 * Math.PI * x / (N - 1))) * (0.5 - 0.5 * Math.cos(2 * Math.PI * y / (N - 1)));
    re[y * N + x] = (re[y * N + x] - mean) * w;
  }
  function fft1(r, m, off, stride) { // in-place radix-2 on a strided line
    const n = N; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { const a = off + i * stride, b = off + j * stride; [r[a], r[b]] = [r[b], r[a]]; [m[a], m[b]] = [m[b], m[a]]; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len; for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k); const a = off + (i + k) * stride, b = off + (i + k + len / 2) * stride;
      const tr = r[b] * wr - m[b] * wi, ti = r[b] * wi + m[b] * wr; r[b] = r[a] - tr; m[b] = m[a] - ti; r[a] += tr; m[a] += ti; } }
  }
  for (let y = 0; y < N; y++) fft1(re, im, y * N, 1);
  for (let x = 0; x < N; x++) fft1(re, im, x, N);
  const peaks = [];
  for (let v = 0; v < N; v++) for (let u = 0; u < N; u++) {
    const fu = u < N / 2 ? u : u - N, fv = v < N / 2 ? v : v - N; const r = Math.hypot(fu, fv);
    if (r < Number(process.env.MINR || 6) || fv < 0 || (fv === 0 && fu < 0)) continue;
    peaks.push({ fu, fv, r, p: re[v * N + u] ** 2 + im[v * N + u] ** 2 });
  }
  peaks.sort((a, b) => b.p - a.p);
  for (const pk of peaks.slice(0, 6)) {
    const cyclesPerPx = pk.r / N; const lpi = cyclesPerPx * ppi; const ang = Math.atan2(pk.fv, pk.fu) * 180 / Math.PI;
    console.log(`peak fu=${pk.fu} fv=${pk.fv} period=${(1 / cyclesPerPx).toFixed(2)}px -> ${lpi.toFixed(1)} lines/in @ ${ppi}ppi, angle ${ang.toFixed(1)} deg, power ${pk.p.toExponential(2)}`);
  }
}
