// t10-contrast.mjs — track 10 research helper. WCAG 2.x contrast ratios for pairs.
// Usage: node t10-contrast.mjs fg:bg [fg:bg ...]   (hex without #)
const lum = h => {
  const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
for (const p of process.argv.slice(2)) {
  const [a, b] = p.split(':');
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  console.log(p, ((l1 + 0.05) / (l2 + 0.05)).toFixed(2));
}
