import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2).map(f => JSON.parse(readFileSync(f, 'utf8')));
const idx = o => { const m = new Map(); o.runs.forEach(r => (r.buttons || []).forEach(x => m.set(r.width + ' ' + x.key, { ...x, extra: r.extra, scene: r.scene, width: r.width }))); return m; };
const A = idx(a), B = idx(b);
const onlyA = [...A.keys()].filter(k => !B.has(k)), onlyB = [...B.keys()].filter(k => !A.has(k));
let n = 0; const widthMoved = [], xMoved = [], lines = [], clip = [], over = [], under = [], grew = {}, off = [];
for (const [k, x] of A) {
  const y = B.get(k); if (!y) continue; n++;
  if (Math.abs(x.w - y.w) > 0.01) widthMoved.push([k, x.w, y.w]);
  if (Math.abs(x.x - y.x) > 0.01) xMoved.push([k, x.x, y.x]);
  if (x.lines !== y.lines) lines.push([k, x.lines, y.lines]);
  if (!x.clipped && y.clipped) clip.push([k, y.clipped]);
  if (!x.overflowX && y.overflowX) over.push(k);
  if (!x.spill && y.spill) (globalThis.spills = globalThis.spills || []).push([k, y.spill]);
  if ((!x.offRight && y.offRight) || (!x.offLeft && y.offLeft)) off.push(k);
  if (y.h < 43.99) under.push([k, x.h, y.h]);
  const site = k.split(' | ').slice(2, 3)[0] + ' @' + k.split(' | ')[1].split(' < ')[0];
  const d = +(y.h - x.h).toFixed(2);
  const g = grew[site] = grew[site] || { n: 0, before: new Set(), after: new Set(), d: new Set() };
  g.n++; g.before.add(x.h); g.after.add(y.h); g.d.add(d);
}
console.log('buttons paired', n, '| only before', onlyA.length, '| only after', onlyB.length);
onlyA.slice(0, 10).forEach(k => console.log('  only-before', k)); onlyB.slice(0, 10).forEach(k => console.log('  only-after', k));
console.log('width changed', widthMoved.length); widthMoved.slice(0, 20).forEach(r => console.log('  W', r.join(' → ')));
console.log('x-in-parent changed', xMoved.length); xMoved.slice(0, 20).forEach(r => console.log('  X', r.join(' → ')));
console.log('line count changed', lines.length); lines.slice(0, 20).forEach(r => console.log('  L', r.join(' → ')));
console.log('newly clipped', clip.length); clip.forEach(r => console.log('  C', r.join(' by ')));
console.log('newly spilling out of parent', (globalThis.spills || []).length); (globalThis.spills || []).forEach(r => console.log('  S', r.join(' out of ')));
console.log('newly overflowing text', over.length); over.forEach(r => console.log('  O', r));
console.log('newly off-screen', off.length); off.forEach(r => console.log('  OFF', r));
console.log('under 44 after', under.length); under.slice(0, 30).forEach(r => console.log('  U', r.join(' : ')));
console.log('\nheight by class @ parent (before → after):');
Object.entries(grew).sort((p, q) => Math.max(...q[1].d) - Math.max(...p[1].d)).forEach(([s, g]) =>
  console.log('  ' + s.padEnd(64) + ' n=' + String(g.n).padStart(3) + '  ' + [...g.before].map(v => v.toFixed(1)).join('/') + ' → ' + [...g.after].map(v => v.toFixed(1)).join('/')));
console.log('\nsheets: fit before → scrolls after');
for (const [k, x] of A) {
  if (!k.endsWith('__sheets')) continue;
  const y = B.get(k); if (!y) continue;
  (x.sheets || []).forEach((s, i) => {
    const t = (y.sheets || [])[i]; if (!t) return;
    const fitB = s.sh <= s.ch + 1, fitA = t.sh <= t.ch + 1;
    const tag = fitB && !fitA ? 'NOW SCROLLS' : !fitB ? 'already scrolled' : 'fits';
    if (tag !== 'fits' || process.env.ALL) console.log('  ' + tag.padEnd(16) + k.replace(' | __sheets', '').padEnd(34) + ' ' + s.cls.padEnd(22) + ' ' + s.ch + 'x' + s.sh + ' → ' + t.ch + 'x' + t.sh + ' (' + s.ov + ')');
  });
}
