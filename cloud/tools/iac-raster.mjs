// Concept C (iron-age): a tiny deterministic stroke rasterizer for 24-unit icon data, so the icon
// set can be looked at at 22 pt before anyone builds it. Not a production renderer: strokes are
// drawn as distance-field lines (round joins; square caps by extending open ends), which is close
// enough to judge legibility. Writes PNGs with pngjs.
// node iac-raster.mjs <icons-module.mjs> <out.png>
import { PNG } from '/Users/micahflunker/dev/vibes-night/tools/node_modules/pngjs/lib/png.js';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const [modPath, out] = process.argv.slice(2);
const set = (await import(pathToFileURL(modPath).href)).default;

const INK = [0x1c, 0x17, 0x12], STOCK = [0xe6, 0xde, 0xc9], ACC = [0xa1, 0x37, 0x4f];

// ---- path parsing and flattening into polylines ----
function flatten(d) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const subs = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0, cmd = '', i = 0, lcx = 0, lcy = 0;
  const num = () => +toks[i++];
  const push = (px, py) => { cur.pts.push([px, py]); x = px; y = py; };
  const cubic = (x1, y1, x2, y2, x3, y3) => { const x0 = x, y0 = y; for (let t = 1; t <= 16; t++) { const s = t / 16, u = 1 - s; push(u * u * u * x0 + 3 * u * u * s * x1 + 3 * u * s * s * x2 + s * s * s * x3, u * u * u * y0 + 3 * u * u * s * y1 + 3 * u * s * s * y2 + s * s * s * y3); } lcx = x2; lcy = y2; };
  const quad = (x1, y1, x2, y2) => { const x0 = x, y0 = y; for (let t = 1; t <= 12; t++) { const s = t / 12, u = 1 - s; push(u * u * x0 + 2 * u * s * x1 + s * s * x2, u * u * y0 + 2 * u * s * y1 + s * s * y2); } lcx = x1; lcy = y1; };
  const arc = (rx, ry, phi, fa, fs, x2, y2) => {
    const x1 = x, y1 = y; if (rx === 0 || ry === 0) return push(x2, y2);
    const p = phi * Math.PI / 180, cp = Math.cos(p), sp = Math.sin(p);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
    rx = Math.abs(rx); ry = Math.abs(ry); const lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const sign = fa === fs ? -1 : 1; const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p; const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const co = sign * Math.sqrt(Math.max(0, num2 / den)); const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
    const cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry); let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const n = Math.max(8, Math.ceil(Math.abs(dt) / (Math.PI / 16)));
    for (let k = 1; k <= n; k++) { const t = t1 + dt * k / n; push(cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp); }
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'M') { const nx = num() + ox, ny = num() + oy; cur = { pts: [[nx, ny]], closed: false }; subs.push(cur); x = sx = nx; y = sy = ny; cmd = rel ? 'l' : 'L'; }
    else if (C === 'L') push(num() + ox, num() + oy);
    else if (C === 'H') push(num() + ox, y);
    else if (C === 'V') push(x, num() + oy);
    else if (C === 'C') { const a = num() + ox, b = num() + oy, c = num() + ox, d2 = num() + oy, e = num() + ox, f = num() + oy; cubic(a, b, c, d2, e, f); }
    else if (C === 'S') { const c = num() + ox, d2 = num() + oy, e = num() + ox, f = num() + oy; cubic(2 * x - lcx, 2 * y - lcy, c, d2, e, f); }
    else if (C === 'Q') { const a = num() + ox, b = num() + oy, e = num() + ox, f = num() + oy; quad(a, b, e, f); }
    else if (C === 'A') { const rx = num(), ry = num(), ph = num(), fa = num(), fs = num(), e = num() + ox, f = num() + oy; arc(rx, ry, ph, fa, fs, e, f); }
    else if (C === 'Z') { cur.closed = true; x = sx; y = sy; cur = { pts: [[x, y]], closed: false }; subs.push(cur); }
    else throw new Error('unsupported ' + cmd);
  }
  return subs.filter(s => s.pts.length > 1 || s.closed);
}
function elToSubs(el) {
  if (el.tag === 'path') return flatten(el.d);
  if (el.tag === 'circle') { const pts = []; for (let k = 0; k <= 48; k++) { const t = k / 48 * 2 * Math.PI; pts.push([el.cx + el.r * Math.cos(t), el.cy + el.r * Math.sin(t)]); } return [{ pts, closed: true }]; }
  if (el.tag === 'rect') { const { x, y, width: w, height: h } = el; return [{ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], closed: true }]; }
  return [];
}
function segmentsOf(ic, halfW, square) {
  const segs = [];
  for (const el of ic.els) for (const s of elToSubs(el)) {
    const p = s.pts.slice();
    if (s.closed && (p[0][0] !== p[p.length - 1][0] || p[0][1] !== p[p.length - 1][1])) p.push(p[0]);
    if (!s.closed && square && p.length > 1) {                      // square caps: extend both ends by half the width
      const ext = (a, b) => { const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1; return [a[0] + dx / L * halfW, a[1] + dy / L * halfW]; };
      p[0] = ext(p[0], p[1]); p[p.length - 1] = ext(p[p.length - 1], p[p.length - 2]);
    }
    if (p.length === 1) p.push([p[0][0] + 0.001, p[0][1]]);
    for (let k = 0; k < p.length - 1; k++) segs.push([p[k][0], p[k][1], p[k + 1][0], p[k + 1][1]]);
  }
  return segs;
}
const dseg = (px, py, [x1, y1, x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy; let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); };

// Draw icon into canvas at (ox, oy), size px, viewBox w x h units, stroke in units, colour.
function draw(img, W, ic, ox, oy, px, stroke, col) {
  const [vx, vy, vw, vh] = (ic.viewBox || '0 0 24 24').split(' ').map(Number);
  const scale = px / Math.max(vw, vh), hw = stroke / 2;
  const segs = segmentsOf(ic, hw, (ic.linecap || 'square') === 'square');
  const pxW = Math.ceil(vw * scale), pxH = Math.ceil(vh * scale);
  for (let j = 0; j < pxH; j++) for (let i = 0; i < pxW; i++) {
    const ux = vx + (i + 0.5) / scale, uy = vy + (j + 0.5) / scale;
    let d = Infinity; for (const s of segs) { const q = dseg(ux, uy, s); if (q < d) d = q; }
    const cov = Math.max(0, Math.min(1, (hw - d) * scale + 0.5));
    if (cov <= 0) continue;
    const o = ((oy + j) * W + (ox + i)) * 4;
    for (let c = 0; c < 3; c++) img[o + c] = Math.round(img[o + c] * (1 - cov) + col[c] * cov);
  }
}

// ---- contact sheet: each icon at 66 px (22 pt @3x), 44 px (22 pt @2x) and 22 px (22 pt @1x); spark at 48/16 ----
const rows = [
  ...Object.entries(set.icons).map(([k, v]) => ['icons.' + k, v]),
  ...Object.entries(set.glyphs).map(([k, v]) => ['glyphs.' + k, v])
];
const cols = 6, cell = 150, orn = Object.entries(set.ornaments || {});
const rowsN = Math.ceil(rows.length / cols) + (orn.length ? 1 : 0) + 1;
const W = cols * cell, H = rowsN * cell;
const png = new PNG({ width: W, height: H });
for (let k = 0; k < W * H; k++) { png.data[k * 4] = STOCK[0]; png.data[k * 4 + 1] = STOCK[1]; png.data[k * 4 + 2] = STOCK[2]; png.data[k * 4 + 3] = 255; }
rows.forEach(([name, ic], n) => {
  const cx = (n % cols) * cell, cy = Math.floor(n / cols) * cell;
  const isSpark = name === 'icons.spark';
  draw(png.data, W, ic, cx + 8, cy + 8, isSpark ? 48 : 66, ic.stroke, name === 'icons.camera' ? ACC : INK);
  draw(png.data, W, ic, cx + 82, cy + 8, isSpark ? 32 : 44, ic.stroke, INK);
  draw(png.data, W, ic, cx + 82, cy + 62, isSpark ? 16 : 22, ic.stroke, INK);
  draw(png.data, W, ic, cx + 8, cy + 80, 60, ic.stroke, INK);   // a second 20 pt @3x copy, for the add-tile / nav sizes
});
// ornaments row
orn.forEach(([k, o], n) => {
  const cx = (n % cols) * cell, cy = (Math.ceil(rows.length / cols)) * cell;
  const [, , vw, vh] = o.viewBox.split(' ').map(Number);
  draw(png.data, W, { ...o, linecap: 'square' }, cx + 8, cy + 20, Math.round(Math.max(vw, vh) / Math.max(vw, vh) * 96 * (Math.max(vw, vh) / 48)), o.stroke, INK);
});
// the water vessel, at native size (76 x 123 pt @2x = 152 x 246 px, shown at 123 px tall here)
if (set.vessel) {
  const v = set.vessel, cy = (rowsN - 1) * cell;
  draw(png.data, W, { viewBox: v.viewBox, linecap: 'square', els: [{ tag: 'path', d: v.shape }, { tag: 'rect', ...v.cap }] }, 8, cy + 4, 140, v.stroke, INK);
}
writeFileSync(out, PNG.sync.write(png));
console.log('wrote', out, W + 'x' + H, rows.length, 'icons', orn.length, 'ornaments');
