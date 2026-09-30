// Iron Age A: can pYellow read more "yellow" (copy names "the yellow line", "Yellow — hold")
// while keeping 3:1 as a graphic on the r2g stock and >= 12 dE00 under CVD?
import { contrast, simulate, dE, hexToRgb, toLin, over } from './colour/colour-lib.mjs';
function oklch(hex) {
  const [R, G, B] = hexToRgb(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  let h = Math.atan2(Bb, A) * 180 / Math.PI; if (h < 0) h += 360; return [L, Math.hypot(A, Bb), h];
}
const rack = '#e6dec9', bar = '#ebe4ce';
const others = { chest: '#82180c', back: '#1f4a72', shoulders: '#0e5f40', arms: '#2a241d', core: '#6a6d6c' };
for (const y of ['#90620b', '#8a6b00', '#8c6d05', '#886c00', '#8f6a00', '#846800', '#8b6600', '#937000']) {
  const [L, C, h] = oklch(y);
  const worst = {};
  for (const k of ['normal', 'deutan', 'protan']) worst[k] = Math.min(...Object.values(others).map(o => dE(simulate(y, k), simulate(o, k))));
  const all = {};
  for (const k of ['deutan', 'protan']) { const cols = [y, ...Object.values(others)]; let m = 99; for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) m = Math.min(m, dE(simulate(cols[i], k), simulate(cols[j], k))); all[k] = m; }
  const zone = over(y, 0.30, rack); const [zl, zc, zh] = oklch(zone);
  console.log(`${y} L ${L.toFixed(3)} C ${C.toFixed(3)} h ${h.toFixed(0)} | vs rack ${contrast(y, rack).toFixed(2)} bar ${contrast(y, bar).toFixed(2)} | legs vs others min n/d/p ${worst.normal.toFixed(1)}/${worst.deutan.toFixed(1)}/${worst.protan.toFixed(1)} | whole-set min d/p ${all.deutan.toFixed(1)}/${all.protan.toFixed(1)} | zone .30 ${zone} C ${zc.toFixed(3)} h ${zh.toFixed(0)}`);
}
// zone tints: what alpha makes each band read as its named hue on the r2g stock?
for (const [n, c] of [['blue', '#1f4a72'], ['yellow', '#90620b'], ['red', '#82180c']]) for (const a of [0.14, 0.2, 0.25, 0.3, 0.35]) { const z = over(c, a, rack); const [L, C, h] = oklch(z); console.log(`zone ${n} a ${a}: ${z} L ${L.toFixed(3)} C ${C.toFixed(3)} h ${h.toFixed(0)} | ink on it ${contrast('#1c1712', z).toFixed(2)} | white head #fffaf2 vs it ${contrast('#fffaf2', z).toFixed(2)}`); }
