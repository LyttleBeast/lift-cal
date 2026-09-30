// D.1 scratch: WCAG 2.x contrast of a few v1 pairs cited in design/ROLES.md.
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const pairs = [
  ['dim on bar', '#5c6270', '#1c1f26'], ['dim on rack', '#5c6270', '#14161a'],
  ['steel on bar', '#8d939f', '#1c1f26'], ['chalk on bar', '#f2f0eb', '#1c1f26'],
  ['collar on bar', '#262a33', '#1c1f26'], ['knurl on bar', '#333844', '#1c1f26'],
  ['grip on bar (grab handle)', '#333844', '#1c1f26'], ['accent on bar', '#f0be1e', '#1c1f26'],
  ['onAccent on accent', '#141414', '#f0be1e'], ['knockout on inverse', '#14161a', '#f2f0eb'],
  ['pRed on bar', '#d6252b', '#1c1f26'], ['faint on bar', '#333844', '#1c1f26']
];
for (const [k, a, b] of pairs) console.log(k.padEnd(28), cr(a, b).toFixed(2));
