// Navy polish: WCAG ratios for the pairs this pass touches.
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = h => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const f = x => Math.floor(x * 100) / 100;
const pairs = [
  ['knob steel on grip (Navy)', '#b3bfd6', '#6a80bb'],
  ['knob chalk on grip (Navy)', '#f4f0e8', '#6a80bb'],
  ['knob steel on grip (v1)', '#8d939f', '#333844'],
  ['greet name chalk on page', '#f4f0e8', '#0a183b'],
  ['greet name accent on page (before)', '#acdc9c', '#0a183b'],
  ['dim on card', '#8f9eb9', '#0f223f'],
  ['steel on raised', '#b3bfd6', '#1d3463'],
  ['dim on page', '#8f9eb9', '#0a183b'],
];
for (const [n, a, b] of pairs) console.log(n.padEnd(40), f(cr(a, b)));
