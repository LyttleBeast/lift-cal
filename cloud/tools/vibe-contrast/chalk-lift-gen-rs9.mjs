// Chalk heat lift, round 2 (rs9): the table native's theme.js lift() makes for
// { d, below }, printed as vibes/chalk.css rules (equal values grouped), so the
// two clients share one formula. Also checks it is monotonic.
//   node chalk-lift-gen-rs9.mjs <d> <below>
const d = +process.argv[2], below = +process.argv[3];
const lift = a => (a < below ? Math.round((a + d * (below - a) / (below - 0.28)) * 100) / 100 : a);
const groups = [];
let prev = 0, mono = true;
for (let k = 28; k <= 100; k++) {
  const a = Number((k / 100).toFixed(2)), v = lift(a);
  if (v < prev) mono = false; prev = v;
  if (v === a) continue;
  const g = groups[groups.length - 1];
  if (g && g.v === v) g.s.push(a); else groups.push({ v, s: [a] });
}
const f = n => n.toFixed(2), fv = n => '.' + f(n).split('.')[1];
for (const g of groups) {
  console.log(g.s.map(a => `[data-vibe="chalk"] .heat rect[fill-opacity="${f(a)}"]`).join(',\n') + ` { fill-opacity: ${fv(g.v)}; }`);
}
console.log('/* monotonic', mono, '*/');
