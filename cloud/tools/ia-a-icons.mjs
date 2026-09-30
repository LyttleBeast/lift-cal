// Iron Age A ("The manual page"): the engraved icon set as 24x24 path data, plus a tiny
// deterministic rasterizer to judge legibility at 22 pt (66 px @3x, 44 px @2x) and at small sizes.
// Absolute commands only (M L H V C Q Z), circles and rects as elements, like icons/v1.js.
// Study output: design/iron-age/scratch-a/icons-*.png and icons-a.json. Never an asset.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const OUT = '/Users/micahflunker/dev/vibes-night/design/iron-age/scratch-a';
const r2 = n => Math.round(n * 100) / 100;
const P = (...pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`).join(' ');

// ---- computed shapes ----
// Spur gear: 8 square-shouldered teeth (outer 9.6, root 7.2), rim closed, hub circle r 2.6. Grant 1893 (#11) proportions, no spokes at 16 pt.
function gear(cx = 12, cy = 12, n = 8, ro = 9.6, ri = 7.2, tw = 0.36) {
  const pts = [];
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * 2 * Math.PI - Math.PI / 2, step = 2 * Math.PI / n;
    const aTop0 = a0 - tw * step / 2 * 1.0, aTop1 = a0 + tw * step / 2 * 1.0;       // tooth top
    const aRoot0 = a0 - tw * step / 2 * 1.45, aRoot1 = a0 + tw * step / 2 * 1.45;   // flank foot (slight taper)
    pts.push([cx + ri * Math.cos(aRoot0), cy + ri * Math.sin(aRoot0)]);
    pts.push([cx + ro * Math.cos(aTop0), cy + ro * Math.sin(aTop0)]);
    pts.push([cx + ro * Math.cos(aTop1), cy + ro * Math.sin(aTop1)]);
    pts.push([cx + ri * Math.cos(aRoot1), cy + ri * Math.sin(aRoot1)]);
  }
  return P(...pts) + ' Z';
}
// Nib at 45 degrees (Sears No. 112 p. 99, #21): tip to the lower left, shoulders, slit, vent hole.
function nib() {
  const loc = [[0, 9.2], [-3.4, 0.5], [-3.4, -6.2], [3.4, -6.2], [3.4, 0.5]];
  const a = Math.PI / 4, c = Math.cos(a), s = Math.sin(a), T = ([x, y]) => [12 + x * c - y * s, 12 + x * s + y * c];
  const outline = P(...loc.map(T)) + ' Z';
  const slit = P(T([0, 9.2]), T([0, 2.2]));
  const shoulder = P(T([-3.4, -3.2]), T([3.4, -3.2]));
  const [hx, hy] = T([0, 1.0]);
  return { outline, slit, shoulder, hole: { cx: r2(hx), cy: r2(hy), r: 0.9 } };
}
const N = nib();

const icon = (stroke, els, extra = {}) => ({ viewBox: '0 0 24 24', stroke, fill: 'none', linecap: 'square', linejoin: 'miter', els, ...extra });
const path = d => ({ tag: 'path', d });
const circle = (cx, cy, r) => ({ tag: 'circle', cx, cy, r });
const rect = (x, y, width, height) => ({ tag: 'rect', x, y, width, height, rx: 0 });

// Shared forms
const GEAR = [circle(12, 12, 2.6), path(gear())];
const LOCK_BODY = path('M5 10.5 H19 V13.5 C19 17.3 15.9 20.1 12 21 C8.1 20.1 5 17.3 5 13.5 Z'); // shield body, Mallory No. 10 (#17)
const KEYHOLE = [circle(12, 14.4, 1.2), path('M12 15.6 V17.6')];
const SOLE = (dx, dy, flip) => {
  // hair insole outline (Sears No. 112 p. 936, #25): broad ball, narrow waist, round heel; inner edge straighter
  const pts = [[7.1, 2.8], [9.1, 3.3], [10.2, 5.2], [10.1, 7.6], [9.3, 9.8], [8.9, 11.6], [9.2, 13.4], [9.5, 15.4], [9.2, 17.4], [8.1, 18.6], [6.7, 18.8], [5.4, 18.2], [4.8, 16.6], [5.0, 14.6], [5.2, 12.6], [4.6, 10.4], [3.9, 8.0], [4.2, 5.1], [5.4, 3.4]];
  const t = pts.map(([x, y]) => [(flip ? 14.1 - x : x) + dx, y + dy]); // flip mirrors the sole about its own centre line
  return P(...t) + ' Z';
};

const ICONS = {
  // Dock: 22 pt, stroke from CSS (1.5 here)
  you: icon(1.5, [circle(12, 7.4, 3.4), path('M10.4 10.5 V13.2 M13.6 10.5 V13.2'), path('M4.5 20.5 C4.9 16.4 7.4 14.3 10.2 13.8 L12 15.8 L13.8 13.8 C16.6 14.3 19.1 16.4 19.5 20.5 Z')]),
  workout: icon(1.5, [circle(5, 12, 3.6), circle(19, 12, 3.6), path('M8.6 12 H15.4'), path('M9.6 10.2 V13.8 M14.4 10.2 V13.8'), path('M3.3 10.6 C3.7 9.7 4.4 9.2 5.2 9.2 M17.3 10.6 C17.7 9.7 18.4 9.2 19.2 9.2')]),
  food: icon(1.5, [path('M4.5 3 V8 M7 3 V8 M9.5 3 V8'), path('M4.5 8 C4.5 10 5.6 10.8 7 10.8 C8.4 10.8 9.5 10 9.5 8'), path('M7 10.8 V21'), path('M13.8 6.5 H20.5 L19.4 20.5 H14.9 Z'), path('M14.4 16.5 H19.9')]),
  weight: icon(1.5, [path('M3.5 17.5 H20.5 V20.5 H3.5 Z'), path('M7 17.5 V4'), path('M5.6 4 H8.4'), path('M7 6 H20.5 V8.2'), rect(11.8, 4.6, 2.8, 2.8), circle(20.5, 10, 1.4)]),
  steps: icon(1.5, [path(SOLE(-0.8, 2.4, true)), path(SOLE(9.6, 0.2, false))]),
  // Add sheet (19 pt), Foods / Meals buttons (16 pt): 1.5
  plus: icon(1.5, [path('M12 5 V19'), path('M5 12 H19')]),
  camera: icon(1.5, [path('M4 7 H20 V19.5 H4 Z'), circle(12, 13.6, 3.6), path('M5.8 8.8 H8.8 V11 H5.8 Z'), path('M9.6 7 V4.8 H14.4 V7')]),
  pen: icon(1.5, [path(N.outline), path(N.slit), circle(N.hole.cx, N.hole.cy, N.hole.r)]),
  barcode: icon(1.5, [rect(3, 6, 1.4, 12), path('M7.3 6 V18'), path('M10.3 6 V14'), rect(12.9, 6, 1.4, 12), path('M17.3 6 V14'), path('M20.4 6 V18')]),
  keypad: icon(1.5, [path('M3.5 4.5 H20.5 V19.5 H3.5 Z'), circle(8, 9, 1.1), circle(12, 9, 1.1), circle(16, 9, 1.1), circle(8, 12.6, 1.1), circle(12, 12.6, 1.1), circle(16, 12.6, 1.1), path('M8 16.4 H16')]),
  book: icon(1.5, [path('M12 6.2 C10 5 7 4.6 3.5 5 V19 C7 18.6 10 19 12 20.2 C14 19 17 18.6 20.5 19 V5 C17 4.6 14 5 12 6.2 Z'), path('M12 6.2 V20.2'), path('M5.8 9.5 H9.6 M5.8 13 H9.6 M14.4 9.5 H18.2 M14.4 13 H18.2')]),
  // three dinner plates stacked, seen edge-on in side elevation: rim line, sloped wall, foot (hand-drawn, no source)
  stack: icon(1.5, [path('M3 6.5 H21 L18.6 9 H5.4 Z'), path('M3 11.5 H21 L18.6 14 H5.4 Z'), path('M3 16.5 H21 L18.6 19 H5.4 Z')]),
  // Spark: a manicule pointing right at the notice's sentence (Polhemus 1895, #26/#27). Drawn at 16 with a 1.6 stroke by its sites.
  spark: icon(1.6, [path('M2.5 8.2 H6.2 V16.8 H2.5 Z'), path('M6.2 9.3 C7.8 8.4 9.6 8.2 11.2 8.6 H20.3 C21.3 8.6 21.9 9.2 21.9 10 C21.9 10.8 21.3 11.4 20.3 11.4 H13.4'), path('M13.4 11.4 C14.3 11.8 14.3 13.2 13.3 13.5 C14.1 14 13.9 15.3 12.9 15.5 C13.3 16.2 12.9 16.9 12 16.9 H6.2'), path('M10 11.4 H13.4')]),
  // Gear (Fuel / Steps 16 pt, You 17 pt): 1.75
  gear: icon(1.75, GEAR),
  gearYou: icon(1.75, GEAR),
  // Calendar (19 pt): desk-calendar leaf on its wire stand, no numerals, no month (Sears No. 112 p. 158, #23)
  calendar: icon(1.75, [path('M4.5 5.5 H19.5 V17.5 H4.5 Z'), path('M4.5 9.5 H19.5'), path('M8.5 3 V7.5 M15.5 3 V7.5'), path('M8 17.5 L6.5 21 M16 17.5 L17.5 21'), path('M4.5 21 H19.5')]),
  // Coach (15 card / 14 chip): speech balloon, oval with a straight tail — never the manicule
  bubble: icon(1.75, [path('M12 4 C16.8 4 20.5 6.9 20.5 10.5 C20.5 14.1 16.8 17 12 17 C11.2 17 10.4 16.9 9.7 16.8 L5 20.4 L6.6 15.6 C4.7 14.4 3.5 12.6 3.5 10.5 C3.5 6.9 7.2 4 12 4 Z')]),
  lock: icon(1.75, [LOCK_BODY, ...KEYHOLE, path('M8 10.5 V7.4 C8 5.2 9.8 3.4 12 3.4 C14.2 3.4 16 5.2 16 7.4 V10.5')]),
  unlock: icon(1.75, [LOCK_BODY, ...KEYHOLE, path('M8 10.5 V6.4 C8 4.2 9.8 2.4 12 2.4 C14.2 2.4 16 4.2 16 6.4 V7.4')]),
};

// Glyph keys drawn as icons (the contract's `glyphs`, routed through icon() where a site allows it)
const GLYPHS = {
  prev: icon(1.75, [path('M14.5 5.5 L8 12 L14.5 18.5')]),
  next: icon(1.75, [path('M9.5 5.5 L16 12 L9.5 18.5')]),
  back: icon(1.75, [path('M14.5 5.5 L8 12 L14.5 18.5')]),
  go:   icon(1.75, [path('M9.5 5.5 L16 12 L9.5 18.5')]),
  close:   icon(1.75, [path('M6.5 6.5 L17.5 17.5 M17.5 6.5 L6.5 17.5')]),
  dismiss: icon(1.75, [path('M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5')]),
  more: icon(1.75, [circle(5.5, 12, 1.05), circle(12, 12, 1.05), circle(18.5, 12, 1.05)]),
  check: icon(1.75, [path('M5 12.8 L9.6 17.2 L19 6.8')]),
  drop: icon(1.75, [path('M7.5 4.5 V12.5 C7.5 14.1 8.7 15.3 10.3 15.3 H18'), path('M14.6 11.9 L18 15.3 L14.6 18.7')]),
  edit: icon(1.75, [path(N.outline), path(N.slit)]),
  gear: icon(1.75, GEAR),
  minus: icon(1.75, [path('M5.5 12 H18.5')]),
  plus: icon(1.75, [path('M12 5.5 V18.5'), path('M5.5 12 H18.5')]),
  expand: icon(1.75, [path('M6 9.5 L12 15.5 L18 9.5')]),
  collapse: icon(1.75, [path('M6 14.5 L12 8.5 L18 14.5')]),
  warn: icon(1.75, [path('M12 4 L21 19.5 H3 Z'), path('M12 9.5 V14'), circle(12, 16.7, 0.55)]),
};

// Tailpiece ornament (one per screen, end of a long scroll): a short rule, a triangular dinkus, a short rule.
// viewBox 96 x 12, drawn at 96 x 12 pt in ink. Distinct from `more` (three points in a row, a control).
const TAILPIECE = { viewBox: '0 0 96 12', stroke: 1, fill: 'none', linecap: 'butt', linejoin: 'miter',
  els: [path('M0 6 H38 M58 6 H96'), circle(48, 3.2, 1.25), circle(44.6, 8.6, 1.25), circle(51.4, 8.6, 1.25)] };

// Water vessel: a carafe (Sears No. 112 p. 645, #20), viewBox 104 x 168 like v1's; silhouette only.
// insideBottom / insideTop replace v1's 154 / 22, so the level stays linear in the day's fraction (R1.4).
const VESSEL = {
  viewBox: '0 0 104 168',
  // rim flare 30-74 at y 6; neck 40-64 from y 16 to y 50; shoulder into a round bowl (centre 52,106, r 46); flat foot 34-70 at y 160
  outline: 'M30 6 H74 L64 16 V50 C64 54 70 57 76 61 C90 70 98 86 98 106 C98 127 86 143 70 150 L72 160 H32 L34 150 C18 143 6 127 6 106 C6 86 14 70 28 61 C34 57 40 54 40 50 V16 Z',
  insideBottom: 150, insideTop: 58, stroke: 3,
};

fs.writeFileSync(`${OUT}/icons-a.json`, JSON.stringify({ icons: ICONS, glyphs: GLYPHS, tailpiece: TAILPIECE, vessel: VESSEL }, null, 1));

// ---------------- rasterizer ----------------
function flatten(d) { // -> array of subpaths, each {pts:[[x,y]...], closed}
  const tok = d.match(/[MLHVCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi); let i = 0, cur = [0, 0], start = [0, 0], cmd = null; const subs = []; let sp = null;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/[A-Za-z]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'M') { cur = [num(), num()]; start = cur; sp = { pts: [cur], closed: false }; subs.push(sp); cmd = 'L'; }
    else if (cmd === 'L') { cur = [num(), num()]; sp.pts.push(cur); }
    else if (cmd === 'H') { cur = [num(), cur[1]]; sp.pts.push(cur); }
    else if (cmd === 'V') { cur = [cur[0], num()]; sp.pts.push(cur); }
    else if (cmd === 'C') { const p1 = [num(), num()], p2 = [num(), num()], p3 = [num(), num()]; for (let t = 1; t <= 16; t++) { const u = t / 16, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, e = u ** 3; sp.pts.push([a * cur[0] + b * p1[0] + c * p2[0] + e * p3[0], a * cur[1] + b * p1[1] + c * p2[1] + e * p3[1]]); } cur = p3; }
    else if (cmd === 'Q') { const p1 = [num(), num()], p2 = [num(), num()]; for (let t = 1; t <= 12; t++) { const u = t / 12; sp.pts.push([(1 - u) ** 2 * cur[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) ** 2 * cur[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]]); } cur = p2; }
    else if (cmd === 'Z' || cmd === 'z') { sp.closed = true; sp.pts.push(start); cur = start; cmd = null; }
    else { i++; }
  }
  return subs;
}
function segsOf(ic) {
  const segs = []; // [x1,y1,x2,y2]
  const addPoly = (pts, closed, square, hw) => {
    let p = pts.slice();
    if (!closed && square && p.length >= 2) { // square caps: extend both ends by half the stroke
      const ext = (a, b) => { const dx = a[0] - b[0], dy = a[1] - b[1], L = Math.hypot(dx, dy) || 1; return [a[0] + dx / L * hw, a[1] + dy / L * hw]; };
      p[0] = ext(p[0], p[1]); p[p.length - 1] = ext(p[p.length - 1], p[p.length - 2]);
    }
    for (let k = 0; k + 1 < p.length; k++) segs.push([...p[k], ...p[k + 1]]);
    if (p.length === 1) segs.push([...p[0], ...p[0]]);
  };
  const hw = ic.stroke / 2, sq = ic.linecap === 'square';
  for (const e of ic.els) {
    if (e.tag === 'path') for (const s of flatten(e.d)) addPoly(s.pts, s.closed, sq, hw);
    else if (e.tag === 'circle') { const pts = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * 2 * Math.PI; pts.push([e.cx + e.r * Math.cos(a), e.cy + e.r * Math.sin(a)]); } addPoly(pts, true, false, hw); }
    else if (e.tag === 'rect') addPoly([[e.x, e.y], [e.x + e.width, e.y], [e.x + e.width, e.y + e.height], [e.x, e.y + e.height], [e.x, e.y]], true, false, hw);
  }
  return segs;
}
function dseg(px, py, [x1, y1, x2, y2]) { const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy; let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0; t = Math.max(0, Math.min(1, t)); const qx = x1 + t * dx - px, qy = y1 + t * dy - py; return Math.hypot(qx, qy); }
function render(ic, size, strokeOverride) {
  const vb = ic.viewBox.split(' ').map(Number), sc = size / vb[2], H = Math.round(vb[3] * sc);
  const hw = (strokeOverride ?? ic.stroke) / 2; const segs = segsOf({ ...ic, stroke: strokeOverride ?? ic.stroke });
  const SS = 4, SW = size * SS, SH = H * SS; const hit = new Uint8Array(SW * SH);
  for (const s of segs) { // per segment, only the subsamples inside its padded bbox
    const x0 = Math.max(0, Math.floor((Math.min(s[0], s[2]) - hw) * sc * SS)), x1 = Math.min(SW - 1, Math.ceil((Math.max(s[0], s[2]) + hw) * sc * SS));
    const y0 = Math.max(0, Math.floor((Math.min(s[1], s[3]) - hw) * sc * SS)), y1 = Math.min(SH - 1, Math.ceil((Math.max(s[1], s[3]) + hw) * sc * SS));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const i = yy * SW + xx; if (hit[i]) continue; if (dseg((xx + 0.5) / SS / sc, (yy + 0.5) / SS / sc, s) <= hw) hit[i] = 1; }
  }
  const out = new Float64Array(size * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < size; x++) { let c = 0; for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) c += hit[(y * SS + sy) * SW + x * SS + sx]; out[y * size + x] = c / (SS * SS); }
  return { w: size, h: H, cov: out };
}
function sheet(entries, size, file, stroke) {
  const pad = 10, cols = Math.min(entries.length, 10), rows = Math.ceil(entries.length / cols);
  const maxH = Math.max(...entries.map(([, ic]) => { const vb = ic.viewBox.split(' ').map(Number); return Math.round(vb[3] * size / vb[2]); }));
  const cellW = size + pad * 2, cellH = maxH + pad * 2;
  const W = cols * cellW, Ht = rows * cellH; const png = new PNG({ width: W, height: Ht });
  const bg = [0xe6, 0xde, 0xc9], ink = [0x1c, 0x17, 0x12];
  for (let i = 0; i < W * Ht; i++) png.data.set([...bg, 255], i * 4);
  entries.forEach(([name, ic], idx) => {
    const r = render(ic, size, stroke); const ox = (idx % cols) * cellW + pad, oy = Math.floor(idx / cols) * cellH + pad;
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const c = r.cov[y * r.w + x]; if (!c) continue; const di = ((oy + y) * W + ox + x) * 4; png.data.set(bg.map((b, k) => Math.round(b * (1 - c) + ink[k] * c)).concat(255), di); }
  });
  fs.writeFileSync(`${OUT}/${file}`, PNG.sync.write(png)); console.log('wrote', file, W, 'x', Ht, entries.map(e => e[0]).join(' '));
}
const all = [...Object.entries(ICONS), ...Object.entries(GLYPHS).map(([k, v]) => ['g.' + k, v])];
sheet(all, 66, 'icons-66.png');           // 22 pt @3x
sheet(all, 44, 'icons-44.png');           // 22 pt @2x
sheet(all.filter(([k]) => /spark|gear|bubble|lock|g\./.test(k)), 48, 'icons-16pt-3x.png'); // 16 pt @3x
sheet([['tailpiece', TAILPIECE]], 288, 'tailpiece.png');
sheet([['vessel', { viewBox: VESSEL.viewBox, stroke: VESSEL.stroke, fill: 'none', linecap: 'butt', linejoin: 'miter', els: [path(VESSEL.outline), path(`M16 ${VESSEL.insideTop} H88`), path(`M16 ${VESSEL.insideBottom} H88`)] }]], 208, 'vessel.png');
