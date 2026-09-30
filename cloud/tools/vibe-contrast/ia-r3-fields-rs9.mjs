// Iron Age contrast round 3 (rs9): every native TextInput's edge rows (its own
// borders and the host it sits in), grouped by colour and scene, with the
// placeholder beside it — which fields draw a 3:1 edge and which do not.
//   node ia-r3-fields-rs9.mjs <nat json>
import { readFileSync } from 'node:fs';
const J = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const g = new Map();
for (const s of J.scenes) {
  const rows = s.rows;
  rows.forEach((x, i) => {
    if (!/^TextInput/.test(String(x.ctx)) || x.kind !== 'border') return;
    let ph = '';
    for (let j = Math.max(0, i - 3); j <= Math.min(rows.length - 1, i + 3); j++) if (rows[j].kind === 'placeholder' || (rows[j].kind === 'text' && /^TextInput/.test(rows[j].ctx))) { ph = rows[j].text; break; }
    const k = [x.fg, x.bg, x.ratio, (x.fl || []).join(',')].join('|');
    const G = g.get(k) || { x, n: 0, ph: new Set(), scenes: new Set() };
    G.n++; G.ph.add(String(ph).slice(0, 30)); G.scenes.add(s.name.replace(/^seeded · /, ''));
    g.set(k, G);
  });
}
for (const G of [...g.values()].sort((a, b) => a.x.ratio - b.x.ratio)) {
  console.log(`${G.x.ratio} ${G.x.fg} on ${G.x.bg} ${(G.x.fl || []).join(',')} n${G.n} | ${[...G.ph].slice(0, 6).map(p => JSON.stringify(p)).join(' ')}`);
  console.log('    ' + [...G.scenes].slice(0, 6).join(' ; '));
}
