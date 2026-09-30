// Iron Age contrast round 3 (rs9): every text / svg-text / placeholder row in a
// web json that sits inside an element painting a background-image, grouped by
// that element (so text over a photo band, a hatch or a texture is found), with
// the lowest ratio the collector read on the flat ground.
//   node ia-r3-bgimg-rs9.mjs <web json>
import { readFileSync } from 'node:fs';
const J = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const g = new Map();
for (const r of J.results) {
  if (r.error || !r.vibe) continue;
  for (const x of r.rows) {
    if (!TEXT.has(x.kind)) continue;
    for (const f of x.fl || []) {
      const m = /^bg-image@(.+)$/.exec(f);
      if (!m || m[1] === 'body' || m[1] === 'html' || /^body\./.test(m[1])) continue;
      const k = m[1];
      const G = g.get(k) || { n: 0, min: 99, ex: null, scenes: new Set() };
      G.n++; G.scenes.add(r.scene + '@' + r.width);
      if (x.ratio < G.min) { G.min = x.ratio; G.ex = x; }
      g.set(k, G);
    }
  }
}
for (const [k, G] of [...g].sort((a, b) => a[1].min - b[1].min)) console.log(k.padEnd(48), 'n' + G.n, 'min', G.min, JSON.stringify(G.ex.text || '').slice(0, 40), G.ex.fg, 'on', G.ex.bg, '|', [...G.scenes].slice(0, 3).join(','));
