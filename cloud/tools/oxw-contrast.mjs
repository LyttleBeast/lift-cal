// Oxblood web agent: contrast arithmetic for the grip re-tune (item 7).
// node oxw-contrast.mjs
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const fl = x => Math.floor(x * 100) / 100;
const toHex = rgb => '#' + rgb.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hex(a).map(v => v * 255), B = hex(b).map(v => v * 255); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };

const O = { rack: '#1a0f11', bar: '#241518', raised: '#352125', knurl: '#846368', steel: '#bcaaa4', chalk: '#f3ece2', dim: '#9c8a85', track: '#352125', oldGrip: '#503a3e' };
const V1 = { rack: '#14161a', bar: '#1c1f26', grip: '#333844', steel: '#8d939f', track: '#262a33' };

console.log('v1: handle grip/bar', fl(cr(V1.grip, V1.bar)), ' tog track/rack', fl(cr(V1.grip, V1.rack)), ' knob steel/grip', fl(cr(V1.steel, V1.grip)), ' runway grip/track', fl(cr(V1.grip, V1.track)));
const report = g => console.log(g, ' handle/bar', fl(cr(g, O.bar)), ' tog/rack', fl(cr(g, O.rack)), ' knob steel/grip', fl(cr(O.steel, g)), ' runway grip/track', fl(cr(g, O.track)), ' tag steel/grip', fl(cr(O.steel, g)), ' chalk/grip', fl(cr(O.chalk, g)));
report(O.oldGrip);
report(O.knurl);
// walk from oldGrip to knurl along the line; first value whose floored handle ratio is >= 3
for (let t = 0; t <= 1.0001; t += 0.01) {
  const g = mix(O.oldGrip, O.knurl, t);
  if (fl(cr(g, O.bar)) >= 3) { console.log('first passing on the old-grip→knurl line, t=' + t.toFixed(2)); report(g); break; }
}
console.log('steel/raised', fl(cr(O.steel, O.raised)), ' chalk/raised', fl(cr(O.chalk, O.raised)));
