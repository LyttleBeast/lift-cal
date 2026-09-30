// Iron Age contrast round 4 (rs9): every native TextInput row (text or
// placeholder) with NO border row on the same host or the host right above it
// in the same scene — a field that may have no 3:1 edge. Prints the field's
// ground against the surface under it (fillVsOuter is not available without a
// border, so the nearest mark row for that ctx is shown if any).
//   node ia-r4-noedge-rs9.mjs <nat json>
import { readFileSync } from 'node:fs';
const J = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = new Map();
for (const s of J.scenes) {
  const rows = s.rows;
  rows.forEach((x, i) => {
    if (!/^TextInput/.test(String(x.ctx)) || !(x.kind === 'text' || x.kind === 'placeholder')) return;
    // border rows are emitted at the host's own index, before its text: look back a few rows
    let edged = false;
    for (let j = Math.max(0, i - 6); j < Math.min(rows.length, i + 4); j++) if (rows[j].kind === 'border' && /^TextInput|^View/.test(rows[j].ctx) && rows[j].ratio >= 3) edged = true;
    if (edged) return;
    const k = s.name.replace(/ ·.*/, '') + '|' + x.text;
    const g = out.get(k) || { x, scenes: new Set(), prev: rows.slice(Math.max(0, i - 3), i).map(r => r.kind + ' ' + r.ratio + ' ' + r.fg + '/' + r.bg + ' ' + String(r.ctx).slice(0, 50)) };
    g.scenes.add(s.pass + ':' + s.name); out.set(k, g);
  });
}
for (const [k, g] of out) {
  console.log(g.x.kind, g.x.ratio, g.x.fg, 'on', g.x.bg, JSON.stringify(g.x.text), '|', [...g.scenes].slice(0, 2).join(', '));
  for (const p of g.prev) console.log('     ' + p);
}
console.log('fields without an edge row nearby:', out.size);
