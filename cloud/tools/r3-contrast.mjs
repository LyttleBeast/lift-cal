// r3-contrast.mjs — track 3 research helper: WCAG 2.x contrast ratios for v1 text colours on v1 grounds.
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const grounds = { rack: '#14161a', bar: '#1c1f26' };
const inks = { chalk: '#f2f0eb', steel: '#8d939f', dim: '#5c6270', knurl: '#333844', collar: '#262a33',
  pRed: '#d6252b', pBlue: '#2e7fd9', pYellow: '#f0be1e', pGreen: '#2aa85c', pWhite: '#e8e5de', pChrome: '#a8aeb8' };
for (const [gn, g] of Object.entries(grounds)) {
  console.log(`on ${gn} ${g}: ` + Object.entries(inks).map(([n, c]) => `${n} ${cr(c, g).toFixed(2)}`).join(' | '));
}
