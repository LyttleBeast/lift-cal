// iav-globes.mjs — measure the maple dumb-bell's globes off the trace (icons-ia/trace/globe-bell.json):
// a least-squares circle through the outer contour's points near each of the four globes (only the arc
// facing away from the handles, so the handle joins do not pull the fit), then one dumb-bell's centre
// spacing in radii. That ratio places the workout icon's and the You tailpiece's globes.
import { readFileSync } from 'node:fs';
const tr = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/icons-ia/trace/globe-bell.json', 'utf8'));
const P = tr.paths.filter(p => !p.hole).sort((a, b) => b.pts.length - a.pts.length)[0].pts;
function kasa(pts) {
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0; const n = pts.length;
  for (const [x, y] of pts) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; }
  const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], v = [sxz, syz, sz];
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M), s = [0, 1, 2].map(c => det(M.map((r, i) => r.map((e, j) => j === c ? v[i] : e))) / D);
  const cx = s[0] / 2, cy = s[1] / 2; return { cx, cy, r: Math.sqrt(s[2] + cx * cx + cy * cy), n };
}
// quadrant boxes and the direction the globe faces away from the crossing (outward)
const Q = { TL: [0, 0, 330, 300, -1, -1], TR: [510, 0, 836, 300, 1, -1], BL: [0, 300, 330, 592, -1, 1], BR: [510, 300, 836, 592, 1, 1] };
const out = {};
for (const [k, [x0, y0, x1, y1, dx, dy]] of Object.entries(Q)) {
  const inQ = P.filter(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  const c0 = kasa(inQ);
  const away = inQ.filter(([x, y]) => (x - c0.cx) * dx + (y - c0.cy) * dy > -0.2 * c0.r);
  out[k] = kasa(away);
  console.log(k, 'c', out[k].cx.toFixed(1), out[k].cy.toFixed(1), 'r', out[k].r.toFixed(1), 'pts', out[k].n);
}
for (const [a, b] of [['TL', 'BR'], ['BL', 'TR']]) {
  const d = Math.hypot(out[a].cx - out[b].cx, out[a].cy - out[b].cy), r = (out[a].r + out[b].r) / 2;
  console.log(a + '-' + b, 'centre spacing', d.toFixed(1), 'px =', (d / r).toFixed(2), 'radii');
}
