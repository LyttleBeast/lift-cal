// V/icons (Iron Age): step 3, the simplification. Takes a traced contour (icons-ia/trace/<id>.json, crop
// pixels, from iai-trace.mjs) and maps it onto the icon's grid: an optional clip to a y-range of the crop
// (dropping lettering, a clamp, a neighbour), an optional horizontal flip and rotation, a uniform scale that
// fits the contour's box into the target box (centred), then Ramer-Douglas-Peucker at `eps` grid units, and
// prints the path. Every number comes from the trace; nothing is invented here. The hand step (which lines
// to keep, what defining line to add) is done in the icon module, where each drawing says what it took.
//   node iav-fit.mjs <id> box=x0,y0,x1,y1 [eps=0.2] [flip] [rot=deg] [clipY=a,b] [clipX=a,b] [pick=n|largest]
//        [pts=x,y;x,y]  (crop-pixel points to map through the same transform) [circle] [open] [dp=2] [curve]
import { readFileSync } from 'node:fs';
const [id, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => { const i = a.indexOf('='); return i < 0 ? [a, true] : [a.slice(0, i), a.slice(i + 1)]; }));
const tr = JSON.parse(readFileSync(`/Users/micahflunker/dev/vibes-night/icons-ia/trace/${id}.json`, 'utf8'));
const outers = tr.paths.map((p, i) => ({ ...p, i })).filter(p => !p.hole);
const area = p => (p.bbox[2] - p.bbox[0]) * (p.bbox[3] - p.bbox[1]);
const pickN = opt.pick && opt.pick !== 'largest' ? opt.pick.split(',').map(Number) : null;
const chosen = pickN ? pickN.map(n => tr.paths[n]) : [outers.sort((a, b) => area(b) - area(a))[0]];
if (opt.list) { tr.paths.forEach((p, i) => console.log(i, p.hole ? 'hole' : 'outer', p.bbox.join(','), p.pts.length)); process.exit(0); }

const [cy0, cy1] = opt.clipY ? opt.clipY.split(',').map(Number) : [-1e9, 1e9];
const [cx0, cx1] = opt.clipX ? opt.clipX.split(',').map(Number) : [-1e9, 1e9];
// each chosen contour -> runs of consecutive points inside the clip (a clip opens the loop)
let runs = [];
for (const p of chosen) {
  let pts = p.pts.slice(); if (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop();
  const inside = q => q[1] >= cy0 && q[1] <= cy1 && q[0] >= cx0 && q[0] <= cx1;
  if (pts.every(inside)) { runs.push({ pts, closed: !opt.open }); continue; }
  const k0 = pts.findIndex(q => !inside(q)); const rot = pts.slice(k0).concat(pts.slice(0, k0));
  let cur = []; for (const q of rot) { if (inside(q)) cur.push(q); else { if (cur.length > 1) runs.push({ pts: cur, closed: false }); cur = []; } }
  if (cur.length > 1) runs.push({ pts: cur, closed: false });
}
const rad = (+opt.rot || 0) * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
const T0 = ([x, y]) => { if (opt.flip) x = tr.W - x; return [x * c - y * s, x * s + y * c]; };
const all = runs.flatMap(r => r.pts.map(T0));
const xs = all.map(q => q[0]), ys = all.map(q => q[1]);
const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
const [X0, Y0, X1, Y1] = opt.box.split(',').map(Number);
const k = Math.min((X1 - X0) / (bx1 - bx0), (Y1 - Y0) / (by1 - by0));
const ox = X0 + ((X1 - X0) - (bx1 - bx0) * k) / 2 - bx0 * k, oy = Y0 + ((Y1 - Y0) - (by1 - by0) * k) / 2 - by0 * k;
const T = q => { const [x, y] = T0(q); return [x * k + ox, y * k + oy]; };
const eps = +(opt.eps || 0.2), dp = +(opt.dp || 2);
function rdp(p, e) {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p.at(-1)]; let im = 0, dm = 0;
  for (let i = 1; i < p.length - 1; i++) { const d = dist(p[i], a, b); if (d > dm) { dm = d; im = i; } }
  return dm > e ? rdp(p.slice(0, im + 1), e).slice(0, -1).concat(rdp(p.slice(im), e)) : [a, b];
}
function dist(q, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return L ? Math.abs(dy * q[0] - dx * q[1] + b[0] * a[1] - b[1] * a[0]) / L : Math.hypot(q[0] - a[0], q[1] - a[1]); }
const f = v => { const r = +v.toFixed(dp); return String(Object.is(r, -0) ? 0 : r).replace(/^0\./, '.').replace(/^-0\./, '-.'); };
const pair = q => f(q[0]) + ' ' + f(q[1]);
const out = [];
// curve: a Catmull-Rom spline through the simplified points (cubic Beziers), except at a corner (the turn
// there over `corner` degrees, default 55), which stays sharp: the engraving's curves stay curves, its
// cut corners stay corners.
const corner = +(opt.corner || 55) * Math.PI / 180;
function curve(p, closed) {
  const n = p.length, at = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
  const sharp = i => { if (!closed && (i === 0 || i === n - 1)) return true; const a = at(i - 1), b = at(i), c2 = at(i + 1);
    const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]), t2 = Math.atan2(c2[1] - b[1], c2[0] - b[0]); let d = Math.abs(t2 - t1); if (d > Math.PI) d = 2 * Math.PI - d; return d > corner; };
  const tan = i => sharp(i) ? [0, 0] : [(at(i + 1)[0] - at(i - 1)[0]) / 6, (at(i + 1)[1] - at(i - 1)[1]) / 6];
  let d = 'M' + pair(p[0]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = at(i), b = at(i + 1), ta = tan(i), tb = tan(i + 1);
    if (!ta[0] && !ta[1] && !tb[0] && !tb[1]) { d += 'L' + pair(b); continue; }
    d += 'C' + pair([a[0] + ta[0], a[1] + ta[1]]) + ' ' + pair([b[0] - tb[0], b[1] - tb[1]]) + ' ' + pair(b);
  }
  return d + (closed ? 'Z' : '');
}
for (const r of runs) {
  let p = r.pts.map(T);
  if (r.closed) { // split the loop at its two farthest-apart points so RDP has anchors
    let ia = 0, ib = 0, dm = 0; for (let i = 0; i < p.length; i += Math.max(1, p.length >> 6)) for (let j = i; j < p.length; j += Math.max(1, p.length >> 6)) { const d = Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1]); if (d > dm) { dm = d; ia = i; ib = j; } }
    const A = rdp(p.slice(ia, ib + 1), eps), B = rdp(p.slice(ib).concat(p.slice(0, ia + 1)), eps);
    p = A.concat(B.slice(1, -1));
    out.push({ d: opt.curve ? curve(p, true) : 'M' + p.map(pair).join('L') + 'Z', n: p.length });
  } else { p = rdp(p, eps); out.push({ d: opt.curve ? curve(p, false) : 'M' + p.map(pair).join('L'), n: p.length }); }
}
console.log(JSON.stringify({ id, scale: +k.toFixed(5), offset: [+ox.toFixed(3), +oy.toFixed(3)], flip: !!opt.flip, rot: +opt.rot || 0, clipY: opt.clipY || null, clipX: opt.clipX || null, eps }));
for (const o of out) console.log(`(${o.n} pts) ${o.d}`);
if (opt.pts) for (const q of opt.pts.split(';')) { const [x, y] = q.split(',').map(Number); console.log('pt', q, '->', pair(T([x, y]))); }
if (opt.circle) for (const p of chosen) { // Kasa least-squares circle through the contour
  const P = p.pts; let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0; const n = P.length;
  for (const [x, y] of P) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; }
  const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], v = [sxz, syz, sz];
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M), sol = [0, 1, 2].map(col => det(M.map((row, i) => row.map((e, j) => j === col ? v[i] : e))) / D);
  const cx = sol[0] / 2, cyy = sol[1] / 2, r = Math.sqrt(sol[2] + cx * cx + cyy * cyy);
  const rms = Math.sqrt(P.reduce((a, [x, y]) => a + (Math.hypot(x - cx, y - cyy) - r) ** 2, 0) / n);
  console.log('circle (crop px) c', cx.toFixed(1), cyy.toFixed(1), 'r', r.toFixed(1), 'rms', rms.toFixed(2), '-> grid c', pair(T([cx, cyy])), 'r', f(r * k));
}
