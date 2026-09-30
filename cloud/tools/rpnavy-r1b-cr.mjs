// Re-prove Navy polish r1: the pairs its changed colours make, through the
// night's colour library (independent of the fixer's own arithmetic).
import { contrast, dE, simulate } from './colour/colour-lib.mjs';
const f = x => (Math.floor(x * 100) / 100).toFixed(2);
const N = { rack: '#0a183b', bar: '#0f223f', raised: '#1d3463', grip: '#6a80bb', chalk: '#f4f0e8', steel: '#b3bfd6', accent: '#acdc9c' };
const V1 = { knob: '#8d939f', grip: '#333844' };
const pairs = [
  ['greetName on page (rack)', N.chalk, N.rack, 4.5],
  ['greetName on bar', N.chalk, N.bar, 4.5],
  ['greetName on raised', N.chalk, N.raised, 4.5],
  ['knob (off) on grip track', N.chalk, N.grip, 3],
  ['knob before (steel) on grip', N.steel, N.grip, 3],
  ['v1 knob on v1 grip', V1.knob, V1.grip, 3],
  ['knob on bar (outside track)', N.chalk, N.bar, 3],
  ['knob on page', N.chalk, N.rack, 3]
];
for (const [n, a, b, min] of pairs) {
  const r = contrast(a, b);
  console.log(n.padEnd(32), a, 'on', b, f(r), r >= min ? 'ok' : 'UNDER ' + min);
}
// The greeting's two words used to differ by hue (chalk + accent); now both
// are chalk, so there is no CVD pair left in it. Knob vs the on-state thumb:
for (const t of ['deutan', 'protan', 'tritan']) {
  try { console.log('knob off vs on thumb ΔE00', t, dE(simulate(N.chalk, t), simulate(N.accent, t)).toFixed(1)); } catch (e) { console.log('simulate', t, e.message); break; }
}
