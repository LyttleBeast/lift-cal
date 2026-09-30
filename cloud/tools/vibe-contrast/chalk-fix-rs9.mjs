// Fix-round arithmetic for chalk (gates-1-rs9): heat strip, dim bar, ticks, admin pill.
import { pathToFileURL } from 'node:url';
const TREE = '/Users/micahflunker/dev/vibes-night/wt/web-v-chalk';
const C = (await import(pathToFileURL(TREE + '/vibes/defs/chalk.js').href)).default.colors;
const V = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default.colors;
const rgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const hx = v => (typeof v === 'string' ? v : v.native || v.web);
const arg = process.argv[2] || 'all';
const ops = [0.28, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

if (arg === 'heat' || arg === 'all') {
  const vRow = ops.map(a => CR(mix(V.pYellow, a, V.bar), V.bar));
  console.log('v1 heat on bar  ', ops.map((a, i) => a + ':' + vRow[i]).join(' '), '| faint vs untrained', CR(mix(V.pYellow, .28, V.bar), V.collar), '| untrained on bar', CR(V.collar, V.bar));
  const trained = (process.argv[3] || 'pYellow,warn,pWhite,chalk,steel,dim').split(',');
  const untrained = (process.argv[4] || 'collar,well,raised,track').split(',');
  for (const t of trained) {
    const tc = C[t] ? hx(C[t]) : t;
    const row = ops.map(a => CR(mix(tc, a, hx(C.bar)), hx(C.bar)));
    const ok = row.every((r, i) => r >= Math.min(3, vRow[i]));
    console.log(t.padEnd(8), tc, ops.map((a, i) => a + ':' + row[i]).join(' '), ok ? 'OK>=v1/3' : 'BELOW');
    for (const u of untrained) {
      const uc = C[u] ? hx(C[u]) : u;
      console.log('   untrained', u.padEnd(7), uc, 'faint vs untrained', CR(mix(tc, .28, hx(C.bar)), uc), 'untrained on bar', CR(uc, hx(C.bar)));
    }
  }
}
if (arg === 'dim' || arg === 'all') {
  const bg = hx(C.bar), vbg = V.bar;
  for (const k of ['pYellow', 'pWhite', 'pChrome', 'pGreen', 'pBlue', 'pRed']) {
    const v1 = CR(mix(V[k], .38, vbg), vbg);
    const row = [0.38, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7].map(a => a + ':' + CR(mix(hx(C[k]), a, bg), bg));
    console.log('dim', k.padEnd(8), 'v1 .38', v1, '| chalk', row.join(' '));
  }
}
if (arg === 'tick' || arg === 'all') {
  for (const [z, col, a] of [['cut', 'pBlue', 0.16], ['hold', 'pYellow', 0.18], ['gain', 'pRed', 0.16]]) {
    const zc = mix(hx(C[col]), a, hx(C.track));
    const tick = mix(hx(C.calMark), .85, zc);
    const ring = mix(hx(C.chalk), .7, zc);
    console.log('tick', z, 'zone', zc, 'tick', tick, CR(tick, zc), '| ring chalk .7', ring, 'ring on zone', CR(ring, zc), 'tick on ring', CR(tick, ring));
  }
  const gt = hx(C.track), tick = mix(hx(C.calMark), .85, gt), ring = mix(hx(C.chalk), .7, gt);
  console.log('guide tick on track', tick, CR(tick, gt), '| ring', ring, CR(ring, gt), 'tick on ring', CR(tick, ring));
}
if (arg === 'pill' || arg === 'all') {
  for (const k of ['pYellow', 'warn', 'pBlue', 'accent', 'chalk']) {
    console.log('pill', k.padEnd(7), hx(C[k]), 'on rack', CR(hx(C[k]), hx(C.rack)), 'on raised', CR(hx(C[k]), hx(C.raised)), 'on #dde0e0', CR(hx(C[k]), '#dde0e0'), 'on #e8ebeb', CR(hx(C[k]), '#e8ebeb'));
  }
}
