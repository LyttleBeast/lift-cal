// iav-curve.mjs "x,y;x,y;..." [closed] [sharp=i,j,...] [mirror=cx] [dp=2]
// The hand step: points read off a trace (iav-fit.mjs output) joined by a Catmull-Rom spline as cubic
// Beziers, sharp (straight in, straight out) at the listed indices. mirror=cx appends the same points
// reflected about x = cx in reverse order (a symmetric outline drawn from one traced side) and closes it.
const [ptsArg, ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.map(a => { const i = a.indexOf('='); return i < 0 ? [a, true] : [a.slice(0, i), a.slice(i + 1)]; }));
let p = ptsArg.split(';').map(s => s.split(',').map(Number));
// flipx=c reflects every point about x = c (the other foot of a pair); affine=sx,sy,ox,oy then maps
// x' = x*sx+ox, y' = y*sy+oy (placing a traced piece on the grid). Both are recorded with the drawing.
if (opt.flipx) p = p.map(([x, y]) => [2 * +opt.flipx - x, y]);
if (opt.affine) { const [sx, sy, ox, oy] = opt.affine.split(',').map(Number); p = p.map(([x, y]) => [x * sx + ox, y * sy + oy]); }
let sharp = new Set((opt.sharp || '').split(',').filter(Boolean).map(Number));
let closed = !!opt.closed;
if (opt.mirror) {
  const cx = +opt.mirror, n = p.length;
  const m = p.slice().reverse().map(([x, y]) => [2 * cx - x, y]);
  const ms = [...sharp].map(i => 2 * n - 1 - i);
  // drop a mirrored point that lands on the axis twice
  if (Math.abs(p[n - 1][0] - cx) < 1e-9) m.shift();
  p = p.concat(m); for (const i of ms) sharp.add(i - (Math.abs(p[n - 1][0] - cx) < 1e-9 ? 1 : 0)); closed = true;
}
const dp = +(opt.dp || 2);
const f = v => { const r = +v.toFixed(dp); return String(Object.is(r, -0) ? 0 : r).replace(/^0\./, '.').replace(/^-0\./, '-.'); };
const pair = q => f(q[0]) + ' ' + f(q[1]);
const n = p.length, at = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
const isSharp = i => sharp.has(((i % n) + n) % n) || (!closed && (i <= 0 || i >= n - 1));
const tan = i => isSharp(i) ? [0, 0] : [(at(i + 1)[0] - at(i - 1)[0]) / 6, (at(i + 1)[1] - at(i - 1)[1]) / 6];
let d = 'M' + pair(p[0]);
for (let i = 0; i < (closed ? n : n - 1); i++) {
  const a = at(i), b = at(i + 1), ta = tan(i), tb = tan(i + 1);
  if (!ta[0] && !ta[1] && !tb[0] && !tb[1]) { d += 'L' + pair(b); continue; }
  d += 'C' + pair([a[0] + ta[0], a[1] + ta[1]]) + ' ' + pair([b[0] - tb[0], b[1] - tb[1]]) + ' ' + pair(b);
}
console.log(d + (closed ? 'Z' : ''));
