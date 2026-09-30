// Track 9 helper: WCAG 2.x contrast ratios for Rack v1 tokens (native theme.js / rack.css).
// Prints a markdown table. No network, no writes.
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = hex => { const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
const ratio = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const grounds = { 'rack #14161a': '#14161a', 'bar #1c1f26': '#1c1f26', 'collar #262a33': '#262a33' };
const fg = {
  'chalk #f2f0eb (primary text)': '#f2f0eb',
  'steel #8d939f (secondary text)': '#8d939f',
  'dim #5c6270 (tertiary text, labels, idle dock)': '#5c6270',
  'pRed #d6252b (chest / bad)': '#d6252b',
  'pBlue #2e7fd9 (back)': '#2e7fd9',
  'pYellow #f0be1e (legs / accent / warn)': '#f0be1e',
  'pGreen #2aa85c (shoulders / good)': '#2aa85c',
  'pWhite #e8e5de (arms)': '#e8e5de',
  'pChrome #a8aeb8 (core)': '#a8aeb8',
  'knurl #333844 (raised border)': '#333844',
  'collar #262a33 (border/divider)': '#262a33'
};
const names = Object.keys(grounds);
console.log('| foreground | ' + names.join(' | ') + ' |');
console.log('|---|' + names.map(() => '---').join('|') + '|');
for (const [k, v] of Object.entries(fg)) {
  console.log('| ' + k + ' | ' + names.map(n => ratio(v, grounds[n]).toFixed(2) + ':1').join(' | ') + ' |');
}
// text on colour
const onc = [['onYellow #141414 on pYellow', '#141414', '#f0be1e'], ['onGreen #0d1a11 on pGreen', '#0d1a11', '#2aa85c'],
  ['onPlate #14161a on pRed', '#14161a', '#d6252b'], ['onPlate #14161a on pBlue', '#14161a', '#2e7fd9'],
  ['white #ffffff on pRed', '#ffffff', '#d6252b'], ['chalk on pBlue', '#f2f0eb', '#2e7fd9']];
console.log('');
for (const [k, a, b] of onc) console.log('| ' + k + ' | ' + ratio(a, b).toFixed(2) + ':1 |');
