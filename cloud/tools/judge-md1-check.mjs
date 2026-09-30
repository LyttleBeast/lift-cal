// Judge 1 of 2, meet-day: recompute the contrast and CVD numbers the two
// concepts claim, plus the pairs they did not report. Read-only; prints only.
import { contrast, over, simulate, dE, rgbToHex } from './colour/colour-lib.mjs';

const f = x => x.toFixed(2);
const mix = (fg, a, bg) => { const r = over(fg, a, bg); return typeof r === 'string' ? r : rgbToHex(r); };

const A = { rack: '#07080a', bar: '#16181d', collar: '#26292f', knurl: '#70767f', chalk: '#f5f0e3', steel: '#a8a295', dim: '#9097a3',
  raised: '#202329', track: '#2a2d33', grip: '#70767f', well: '#07080a', accent: '#f5f0e3', warn: '#ffe14d', bad: '#ff5a3c', good: '#4be38a',
  pRed: '#ff5a3c', pBlue: '#4d97ff', pYellow: '#ffe14d', pGreen: '#3cc4a0', pWhite: '#f2f2f2', pChrome: '#858c96' };
const B = { rack: '#07080a', bar: '#111317', collar: '#1d2026', knurl: '#666c77', chalk: '#f5f0e3', steel: '#a8a295', dim: '#9097a3',
  raised: '#1d2026', track: '#23262d', grip: '#6f7580', well: '#07080a', accent: '#f5f0e3', warn: '#ffa42e', bad: '#ff5a3c', good: '#4be38a',
  pRed: '#ff5a3c', pBlue: '#4d97ff', pYellow: '#ffe14d', pGreen: '#3cc4a0', pWhite: '#f2f2f2', pChrome: '#858c96' };

for (const [name, P] of [['A', A], ['B', B]]) {
  console.log(`\n=== concept ${name} ===`);
  console.log('bar/rack', f(contrast(P.bar, P.rack)), 'raised/rack', f(contrast(P.raised, P.rack)), 'raised/bar', f(contrast(P.raised, P.bar)),
    'track/bar', f(contrast(P.track, P.bar)), ' dE00 bar-rack', f(dE(P.bar, P.rack)), 'raised-bar', f(dE(P.raised, P.bar)));
  console.log('knurl on bar/rack/raised', f(contrast(P.knurl, P.bar)), f(contrast(P.knurl, P.rack)), f(contrast(P.knurl, P.raised)));
  console.log('grip on bar (handle)', f(contrast(P.grip, P.bar)));
  for (const ink of ['chalk', 'steel', 'dim', 'pChrome', 'pRed', 'pBlue', 'warn']) {
    console.log(`  ${ink.padEnd(8)} bar ${f(contrast(P[ink], P.bar))} raised ${f(contrast(P[ink], P.raised))} track ${f(contrast(P[ink], P.track))} rack ${f(contrast(P[ink], P.rack))}`);
  }
  // Washes over a row (bar): the coach pulse peak (.38), the set flash (.28)
  for (const [lbl, a] of [['pulse .38', 0.38], ['flash .28', 0.28], ['pulse base .14', 0.14]]) {
    const g = mix(P.accent, a, P.bar);
    console.log(`  over ${lbl} (${g}): chalk ${f(contrast(P.chalk, g))} steel ${f(contrast(P.steel, g))} dim ${f(contrast(P.dim, g))}`);
  }
  // Placeholder targets sit in the wells (rack); the pulse may wash the well too
  const gw = mix(P.accent, 0.38, P.well);
  console.log(`  pulse .38 over well (${gw}): dim ${f(contrast(P.dim, gw))} chalk ${f(contrast(P.chalk, gw))}`);
  // The toggle: v1 draws the off knob in steel on a grip track, on the sheet (bar)
  console.log('  toggle off: steel knob on grip', f(contrast(P.steel, P.grip)), '| grip track on sheet', f(contrast(P.grip, P.bar)),
    '| lamp knob on grip', f(contrast(P.chalk, P.grip)));
  const onTrack = mix(P.accent, 0.28, P.bar);
  console.log('  toggle on: lamp knob on lamp .28 track', f(contrast(P.accent, onTrack)), '| on-track vs sheet', f(contrast(onTrack, P.bar)));
  // lit vs unlit lamp
  console.log('  lamp lit vs unlit fill', f(contrast(P.chalk, P.track)), '| unlit ring (grip) vs well', f(contrast(P.grip, P.well)), 'vs bar', f(contrast(P.grip, P.bar)));
  // warn / bad / good under CVD
  for (const k of ['normal', 'deutan', 'protan']) {
    const s = h => simulate(h, k);
    console.log(`  ${k.padEnd(12)} good/bad ${f(dE(s(P.good), s(P.bad)))} warn/bad ${f(dE(s(P.warn), s(P.bad)))} good/warn ${f(dE(s(P.good), s(P.warn)))} warn/legs ${f(dE(s(P.warn), s(P.pYellow)))}`);
  }
}

// Flap halves (A): pRed / pBlue / chalk on the top (track) and bottom (raised) halves
console.log('\nA flap: pRed top', f(contrast(A.pRed, A.track)), 'pBlue top', f(contrast(A.pBlue, A.track)), 'chalk top', f(contrast(A.chalk, A.track)),
  '| halves apart', f(contrast(A.track, A.raised)), 'seam rack vs raised', f(contrast(A.rack, A.raised)));

// Six groups, pairwise min, per vision
const G = { chest: '#ff5a3c', back: '#4d97ff', legs: '#ffe14d', shoulders: '#3cc4a0', arms: '#f2f2f2', core: '#858c96' };
for (const k of ['normal', 'deutan', 'protan']) {
  let min = [1e9, ''];
  const ks = Object.keys(G);
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const s = h => simulate(h, k);
    const d = dE(s(G[ks[i]]), s(G[ks[j]]));
    if (d < min[0]) min = [d, ks[i] + '/' + ks[j]];
  }
  console.log(`groups ${k}: min ${f(min[0])} ${min[1]}`);
}
// v1 vs meet-day grounds
console.log('v1 ground #14161a vs rack', f(dE('#14161a', '#07080a')), '| v1 card #1c1f26 vs A bar', f(dE('#1c1f26', A.bar)), 'vs B bar', f(dE('#1c1f26', B.bar)));
