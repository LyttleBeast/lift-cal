// Iron Age A: the paper-grain tile, re-rendered on the r2g stock, with a "manual" preset
// measured from Sandow 1897's own body pages (track 7 G.2.1, row "Sandow 1897 (n12)").
// The generator is track 7's texproto.mjs `grain` recipe verbatim (seeded mulberry32 octave noise,
// NNLS fit to the sigma-by-scale profile, zero-mean, clip at 3.5 sigma, applied per channel to the
// stock's code values) with two changes only: STOCK is a parameter, and a third target set.
// Study output only (design/iron-age/scratch-a/), never an asset.
//   node tools/ia-a-grain.mjs <fresh|manual|book> <2|3> <seed> [stock=#e6dec9]
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const OUT = '/Users/micahflunker/dev/vibes-night/design/iron-age/scratch-a';
mkdirSync(OUT, { recursive: true });
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const parse = h => [1, 3, 5].map(i => parseInt(h.replace('#', '').slice(i - 1, i + 1), 16));
const hex = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
const lumRGB = ([r, g, b]) => 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
const cr = (a, b) => { const [x, y] = [lumRGB(a), lumRGB(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rnd) { let u = 0; while (u === 0) u = rnd(); const v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const [preset, sS, seedS, stockArg] = process.argv.slice(2);
const S = Number(sS), seed = Number(seedS);
const STOCK = (stockArg || 'stock=#e6dec9').split('=')[1];
// IA-A text tokens (every colour that is ever text on the grained ground)
const TEXT = { chalk: '#1c1712', steel: '#4a3f31', dim: '#5f5343', accent: '#a1374f', good: '#0e5f40', warn: '#6e4d08', bad: '#82180c', pBlue: '#1f4a72', pWhite: '#2a241d' };
const TARGET = {
  fresh:  { src: 'Physical Culture 1908 blank leaf, 500 ppi (track 7 G.2.1)', px: 0.302, 0.1: 0.293, 0.25: 0.260, 0.5: 0.219, 1: 0.171, 2: 0.122 },
  manual: { src: 'Sandow 1897 (n12), 300 ppi, 1 patch 21.7 mm (track 7 G.2.1; px taken = its 0.1 mm value, as for saxon)', px: 0.744, 0.1: 0.744, 0.25: 0.666, 0.5: 0.564, 1: 0.400, 2: 0.263 },
  book:   { src: 'Bornstein 1889 title page, 600 ppi (track 7 G.2.1)', px: 1.115, 0.1: 1.092, 0.25: 0.856, 0.5: 0.642, 1: 0.422, 2: 0.274 },
}[preset];
const T = 72 * S;
const umPerPx = S === 3 ? 25400 / 460 : 25400 / 326;
const pitches = S === 3 ? [1, 2, 4, 9, 18, 36] : [1, 3, 6, 12, 24];
const scales = ['px', 0.1, 0.25, 0.5, 1, 2];
const bpx = s => s === 'px' ? 1 : Math.max(1, Math.round(s * 1000 / umPerPx));
const rnd = mulberry32(seed);
const fields = pitches.map(p => {
  const n = T / p, lat = Float64Array.from({ length: n * n }, () => gauss(rnd)), f = new Float64Array(T * T);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const gx = x / p, gy = y / p, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const L = (i, j) => lat[((j % n + n) % n) * n + ((i % n + n) % n)];
    f[y * T + x] = (1 - fx) * (1 - fy) * L(x0, y0) + fx * (1 - fy) * L(x0 + 1, y0) + (1 - fx) * fy * L(x0, y0 + 1) + fx * fy * L(x0 + 1, y0 + 1);
  }
  const m = f.reduce((s, v) => s + v, 0) / f.length, sd = Math.sqrt(f.reduce((s, v) => s + (v - m) ** 2, 0) / f.length);
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - m) / sd; return f;
});
const blockVar = (f, B) => { const bm = []; for (let by = 0; by + B <= T; by += B) for (let bx = 0; bx + B <= T; bx += B) { let s = 0; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) s += f[(by + y) * T + bx + x]; bm.push(s / (B * B)); } const m = bm.reduce((s, v) => s + v, 0) / bm.length; return bm.reduce((s, v) => s + (v - m) ** 2, 0) / bm.length; };
const V = fields.map(f => scales.map(s => blockVar(f, bpx(s))));
const tau = scales.map(s => (TARGET[s] / 100) ** 2);
const Am = scales.map((_, j) => V.map(v => v[j] / tau[j]));
let w = pitches.map(() => 0);
for (let it = 0; it < 20000; it++) for (let k = 0; k < w.length; k++) {
  let num = 0, den = 0; Am.forEach(row => { const r = row.reduce((s, x, kk) => s + x * w[kk], 0) - 1; num += row[k] * r; den += row[k] * row[k]; });
  w[k] = Math.max(0, w[k] - num / den);
}
const n = new Float64Array(T * T); fields.forEach((f, k) => { const g = Math.sqrt(w[k]); for (let i = 0; i < n.length; i++) n[i] += g * f[i]; });
let m = n.reduce((s, v) => s + v, 0) / n.length; for (let i = 0; i < n.length; i++) n[i] -= m;
const sdn = Math.sqrt(n.reduce((s, v) => s + v * v, 0) / n.length); const CL = 3.5 * sdn; for (let i = 0; i < n.length; i++) n[i] = Math.max(-CL, Math.min(CL, n[i]));
const base = parse(STOCK), png = new PNG({ width: T, height: T, colorType: 2, inputColorType: 2, inputHasAlpha: false });
png.data = Buffer.alloc(T * T * 3);
const luma = new Float64Array(T * T); let dark = null, light = null, dY = 1e9, lY = -1;
for (let i = 0; i < T * T; i++) { const c = base.map(v => Math.max(0, Math.min(255, Math.round(v * (1 + n[i]))))); png.data.set(c, i * 3); luma[i] = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; const Yl = lumRGB(c); if (Yl < dY) { dY = Yl; dark = c; } if (Yl > lY) { lY = Yl; light = c; } }
const buf = PNG.sync.write(png, { colorType: 2, inputColorType: 2, inputHasAlpha: false, deflateLevel: 9 });
const file = `${OUT}/grain-${preset}-${STOCK.slice(1)}@${S}x.png`; writeFileSync(file, buf);
const lm = luma.reduce((s, v) => s + v, 0) / luma.length; const lumaN = Float64Array.from(luma, v => v / lm - 1);
console.log(`# grain ${preset} @${S}x seed ${seed} on ${STOCK}: ${T}x${T} px, ${buf.length} bytes -> ${file}`);
console.log(`  target (${TARGET.src}): ` + scales.map(s => `${s}: ${TARGET[s].toFixed(3)}%`).join('  '));
console.log(`  achieved: ` + scales.map(s => `${s}: ${(100 * Math.sqrt(blockVar(lumaN, bpx(s)))).toFixed(3)}%`).join('  '));
console.log(`  mean luma ${lm.toFixed(2)} vs flat ${(0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2]).toFixed(2)} | darkest ${hex(dark)} lightest ${hex(light)}`);
console.log('  text: flat -> darkest pixel: ' + Object.entries(TEXT).map(([k, h]) => `${k} ${cr(parse(h), base).toFixed(2)}->${cr(parse(h), dark).toFixed(2)}`).join(' | '));
