// Concept C (iron-age) exploration: candidate surfaces, pYellow and pChrome on the r2g stock.
// node iac-explore.mjs
import { contrast, dE, simulate, lab, hexToRgb, rgbToHex, lum } from './colour/colour-lib.mjs';
import { nearestTW } from './colour/tailwind.mjs';

const f = n => n.toFixed(2);
const STOCK = '#e6dec9';
const AI_CREAMS = ['#f4f1ea', '#f7f1e4', '#f5f1e8', '#faf8f5', '#f0ebe0'];
const creamBand = h => { const [r, g, b] = hexToRgb(h); return Math.min(r, g, b) >= 0xe0 && r - b >= 5 && r - b <= 24; };

console.log('== bar (plate paper) candidates, on stock ' + STOCK);
for (const b of ['#ebe4ce', '#ede6d1', '#efe8d4', '#f0e9d5', '#f1ebd8', '#eee7d0', '#f2ecd6']) {
  const tw = nearestTW(b);
  const near = AI_CREAMS.map(c => [c, dE(b, c)]).sort((x, y) => x[1] - y[1])[0];
  console.log(`  ${b}: vs stock ${f(contrast(b, STOCK))}:1, dE ${f(dE(b, STOCK))}; nearest TW ${tw[0]} ${f(tw[1])}; nearest AI cream ${near[0]} ${f(near[1])}; creamBand ${creamBand(b)}; ink ${f(contrast('#1c1712', b))} accent ${f(contrast('#a1374f', b))} dim ${f(contrast('#5f5343', b))}`);
}

console.log('\n== inset / raised / well candidates (darker than stock)');
for (const w of ['#e0d7c0', '#ddd4bc', '#dbd1b8', '#d8cdb3', '#d5caaf', '#e2d9c3']) {
  const tw = nearestTW(w);
  console.log(`  ${w}: vs stock ${f(contrast(w, STOCK))}; TW ${tw[0]} ${f(tw[1])}; ink ${f(contrast('#1c1712', w))} steel ${f(contrast('#4a3f31', w))} dim ${f(contrast('#5f5343', w))} accent ${f(contrast('#a1374f', w))}`);
}

const plates = { chest: '#82180c', back: '#1f4a72', legs: '#90620b', shoulders: '#0e5f40', arms: '#2a241d', core: '#6a6d6c' };
const worst = p => {
  const ks = Object.keys(p); let out = { normal: 99, deutan: 99, protan: 99 }, pair = {};
  for (const kind of ['normal', 'deutan', 'protan'])
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const d = dE(simulate(p[ks[i]], kind), simulate(p[ks[j]], kind));
      if (d < out[kind]) { out[kind] = d; pair[kind] = ks[i] + '/' + ks[j]; }
    }
  return { out, pair };
};
const w0 = worst(plates);
console.log('\n== research plates on r2g: worst', JSON.stringify(w0));
for (const [k, v] of Object.entries(plates)) console.log(`  ${k} ${v}: on stock ${f(contrast(v, STOCK))} on #ebe4ce ${f(contrast(v, '#ebe4ce'))}`);

// search pYellow (legs) and pChrome (core) that reach 4.5 on stock, keep hue family, maximise worst CVD dE
const cand = [];
for (let r = 0x70; r <= 0x90; r += 2) for (let g = 0x48; g <= 0x64; g += 2) for (let b = 0x00; b <= 0x14; b += 4) {
  const h = rgbToHex([r, g, b]);
  if (contrast(h, STOCK) < 4.5 || contrast(h, '#ebe4ce') < 4.5) continue;
  const L = lab(h); const hue = Math.atan2(L[2], L[1]) * 180 / Math.PI; const C = Math.hypot(L[1], L[2]);
  if (hue < 62 || hue > 80 || C < 45) continue;             // stay an ochre / yellow, chroma kept
  const w = worst({ ...plates, legs: h });
  cand.push([h, Math.min(w.out.normal, w.out.deutan, w.out.protan), w, f(contrast(h, STOCK)), hue.toFixed(0), C.toFixed(0), L[0].toFixed(1)]);
}
cand.sort((a, b) => b[1] - a[1]);
console.log('\n== pYellow candidates (>=4.5 on stock and plate paper, hue 62-80, C>=45), best worst-CVD first');
for (const c of cand.slice(0, 8)) console.log(`  ${c[0]} worst ${f(c[1])} ${JSON.stringify(c[2].pair)} on stock ${c[3]} hue ${c[4]} C ${c[5]} L* ${c[6]}`);

const cc = [];
for (let v = 0x50; v <= 0x6a; v++) for (const tint of [[0, 2, 1], [0, 1, 0], [2, 2, 0], [0, 0, 0], [1, 2, 3], [3, 2, 0]]) {
  const h = rgbToHex([v + tint[0], v + tint[1], v + tint[2]]);
  if (contrast(h, STOCK) < 4.5 || contrast(h, '#ebe4ce') < 4.5) continue;
  for (const y of cand.slice(0, 4).map(c => c[0])) {
    const w = worst({ ...plates, legs: y, core: h });
    cc.push([h, y, Math.min(w.out.normal, w.out.deutan, w.out.protan), w]);
  }
}
cc.sort((a, b) => b[2] - a[2]);
console.log('\n== pChrome candidates (neutral, >=4.5 on stock), paired with the top pYellows');
for (const c of cc.slice(0, 8)) console.log(`  core ${c[0]} legs ${c[1]} worst ${f(c[2])} ${JSON.stringify(c[3].out)} ${JSON.stringify(c[3].pair)}`);
