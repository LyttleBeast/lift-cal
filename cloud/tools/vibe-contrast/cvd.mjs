// vibe-contrast/cvd.mjs — V59 §13.2 for a vibe, and the definition-level pairs
// the render walk cannot see as one number (a tint over another tint, the
// heat strip's faintest trained cell against an untrained one). Its own
// Machado 2009 (severity 1.0, linear RGB) and CIEDE2000, checked against
// tools/colour/colour-lib.mjs so neither can drift alone.
//   node cvd.mjs <web tree> <vibe id>
import { pathToFileURL } from 'node:url';
const [TREE, ID] = process.argv.slice(2);
const V = (await import(pathToFileURL(TREE + '/vibes/defs/' + ID + '.js').href)).default;
const V1 = (await import(pathToFileURL(TREE + '/vibes/defs/v1.js').href)).default;
const LIB = await import('/Users/micahflunker/dev/vibes-night/tools/colour/colour-lib.mjs');

const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = v => { v = Math.max(0, Math.min(1, v)); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055); };
const Y = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const CR = (a, b) => { const x = Y(a), y = Y(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const mix = (fg, a, bg) => hex(rgb(fg).map((v, i) => v * a + rgb(bg)[i] * (1 - a)));
const M = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]
};
const sim = (h, k) => { const l = rgb(h).map(lin); return hex(M[k].map(r => gam(r[0] * l[0] + r[1] * l[1] + r[2] * l[2]))); };
const lab = h => {
  const [r, g, b] = rgb(h).map(lin);
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047, Yy = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b, Z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
  const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(Yy) - 16, 500 * (f(X) - f(Yy)), 200 * (f(Yy) - f(Z))];
};
function de00(h1, h2) {
  const [L1, a1, b1] = lab(h1), [L2, a2, b2] = lab(h2);
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (b, a) => { if (b === 0 && a === 0) return 0; const x = Math.atan2(b, a) / rad; return x < 0 ? x + 360 : x; };
  const h1p = hp(b1, a1p), h2p = hp(b2, a2p);
  const dL = L2 - L1, dC = C2p - C1p;
  let dh = 0; if (C1p * C2p) { dh = h2p - h1p; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh / 2 * rad);
  const Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p; if (C1p * C2p) { if (Math.abs(h1p - h2p) > 180) hb += h1p + h2p < 360 ? 360 : -360; hb /= 2; }
  const Tt = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const dT = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * Tt, RT = -Math.sin(2 * dT * rad) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
// cross-check against the night's library
let worst = 0;
for (const a of Object.values(V.groups)) for (const b of Object.values(V.groups)) for (const k of ['deutan', 'protan']) {
  worst = Math.max(worst, Math.abs(de00(a, b) - LIB.dE(a, b)), Math.abs(de00(sim(a, k), sim(b, k)) - LIB.dE(LIB.simulate(a, k), LIB.simulate(b, k))));
}
console.log('cross-check against colour-lib: largest ΔE00 disagreement ' + worst.toFixed(4));

const SIX = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
for (const [nm, D] of [[ID, V], ['v1', V1]]) {
  console.log('\n== ' + nm + ' — the six muscle groups, pairwise ΔE00 (normal / deuteranopia / protanopia)');
  const rows = [];
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    const a = D.groups[SIX[i]], b = D.groups[SIX[j]];
    rows.push([SIX[i] + '/' + SIX[j], de00(a, b), de00(sim(a, 'deutan'), sim(b, 'deutan')), de00(sim(a, 'protan'), sim(b, 'protan'))]);
  }
  rows.forEach(r => console.log('  ' + r[0].padEnd(18) + r.slice(1).map(x => x.toFixed(2).padStart(7)).join('')));
  for (const k of [1, 2, 3]) { const m = rows.reduce((a, b) => (b[k] < a[k] ? b : a)); console.log('  min ' + ['', 'normal', 'deutan', 'protan'][k] + ': ' + m[k].toFixed(2) + ' (' + m[0] + ')'); }
  console.log('  simulated: ' + SIX.map(g => g + ' ' + D.groups[g] + ' d' + sim(D.groups[g], 'deutan') + ' p' + sim(D.groups[g], 'protan')).join(' | '));
  const c = D.colors;
  const pair = (l, a, b) => console.log('  ' + l.padEnd(40) + [de00(a, b), de00(sim(a, 'deutan'), sim(b, 'deutan')), de00(sim(a, 'protan'), sim(b, 'protan'))].map(x => x.toFixed(2).padStart(7)).join('') + '   L* ' + lab(a)[0].toFixed(1) + ' / ' + lab(b)[0].toFixed(1) + '  deut L* ' + lab(sim(a, 'deutan'))[0].toFixed(1) + ' / ' + lab(sim(b, 'deutan'))[0].toFixed(1));
  console.log('  status pairs (normal / deut / protan ΔE00):');
  pair('good vs bad (up / down)', c.good, c.bad);
  pair('good vs warn', c.good, c.warn);
  pair('warn vs bad', c.warn, c.bad);
  pair('done vs danger', c.done, c.danger);
  pair('zone cut (pBlue) vs gain (pRed)', c.pBlue, c.pRed);
  pair('zone hold (pYellow) vs gain (pRed)', c.pYellow, c.pRed);
  pair('zone hold (pYellow) vs cut (pBlue)', c.pYellow, c.pBlue);
  pair('protein (pRed) vs carbs (pYellow)', c.pRed, c.pYellow);
  pair('carbs (pYellow) vs fat (pBlue)', c.pYellow, c.pBlue);
  pair('accent vs pRed', c.accent, c.pRed);
  pair('accent vs good', c.accent, c.good);
  // the heat strip: faintest trained cell (.28) against an untrained (collar), both on bar
  const faint = mix(c.pYellow, 0.28, c.bar);
  console.log('  heat strip: trained .28 ' + faint + ' vs untrained collar ' + c.collar + ': ' + CR(faint, c.collar).toFixed(2) + ':1, ΔE00 ' + de00(faint, c.collar).toFixed(2) + ' (deut ' + de00(sim(faint, 'deutan'), sim(c.collar, 'deutan')).toFixed(2) + '); full ' + CR(c.pYellow, c.collar).toFixed(2) + ':1; trained .28 vs bar ' + CR(faint, c.bar).toFixed(2));
  // the dimmed bar (a day not over, .38) on its .35 track backdrop over bar
  const back = mix(c.track, 0.35, c.bar);
  for (const k of ['pYellow', 'pBlue', 'pRed', 'pWhite', 'pGreen', 'pChrome']) console.log('  dim bar .38 ' + k.padEnd(8) + mix(c[k], 0.38, back) + ' on ' + back + ': ' + CR(mix(c[k], 0.38, back), back).toFixed(2) + '   full ' + CR(c[k], back).toFixed(2));
  // cal ticks without a ring: calMark at .85 over each zone band (flattened over track)
  for (const [z, k] of [['zoneCut', 'pBlue'], ['zoneHold', 'pYellow'], ['zoneGain', 'pRed']]) {
    const band = mix(c[k], D.tint[z].a, c.track);
    console.log('  cal tick .85 on ' + z + ' ' + band + ': ' + CR(mix(c.calMark, 0.85, band), band).toFixed(2) + '   (a ring in chalk .7 would be ' + CR(mix(c.chalk, 0.7, band), band).toFixed(2) + ')');
  }
  console.log('  cal head (calMark) on track: ' + CR(c.calMark, c.track).toFixed(2) + '; head ring in chalk .9 on track ' + CR(mix(c.chalk, 0.9, c.track), c.track).toFixed(2));
}
