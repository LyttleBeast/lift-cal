// Fit gate analysis (chalk, round 1): what the vibe's fit run has that the v1
// reference does not, grouped. Usage: node fit-gate-chalk.mjs <vibe fit.json> <v1 fit.json>
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2);
const V = JSON.parse(readFileSync(a, 'utf8')), R = JSON.parse(readFileSync(b, 'utf8'));
console.log('vibe', V.vibe, V.sha, 'totals', JSON.stringify(V.totals));
console.log('ref ', R.vibe, R.sha, 'totals', JSON.stringify(R.totals));
const idx = (list, f) => new Map(list.map(x => [f(x), x]));
const groups = { clipped: {}, spills: {}, small: {}, overflow: {} };
const add = (kind, cls, rec) => { (groups[kind][cls] = groups[kind][cls] || []).push(rec); };
const watchDiff = [];
for (const [id, x] of Object.entries(V.scenes)) {
  const y = R.scenes[id];
  if (x.error) { console.log('ERROR', id, x.error); continue; }
  if (!y || y.error) { console.log('no ref', id); continue; }
  if (x.docOverflow) console.log('DOC OVERFLOW', id, x.docScrollWidth, x.vw);
  const yo = new Set(y.overflow.map(z => z.path));
  x.overflow.filter(z => !yo.has(z.path)).forEach(z => add('overflow', z.cls, { id, ...z }));
  const yc = idx(y.clipped, z => z.how + '|' + z.path);
  for (const z of x.clipped) {
    const w = yc.get(z.how + '|' + z.path);
    if (w) {
      // present in both: worse if the overflow grew
      const grow = [(z.content[0] - z.box[0]) - (w.content[0] - w.box[0]), (z.content[1] - z.box[1]) - (w.content[1] - w.box[1])];
      if (z.how === 'clipped' && (grow[0] > 1 || grow[1] > 1)) add('clipped', z.cls + ' (worse)', { id, text: z.text, box: z.box, content: z.content, ref: [w.box, w.content], axis: z.axis, ellipsis: z.ellipsis, clamp: z.clamp });
      continue;
    }
    add(z.how, z.cls, { id, text: z.text, box: z.box, content: z.content, axis: z.axis, ellipsis: z.ellipsis, clamp: z.clamp, overflow: z.overflow, path: z.path });
  }
  const ys = new Set(y.small.map(z => z.path));
  x.small.filter(z => !ys.has(z.path)).forEach(z => add('small', z.cls, { id, text: z.text, w: z.w, h: z.h, path: z.path }));
  const yw = idx(y.watch || [], z => z.path);
  for (const z of x.watch || []) {
    const w = yw.get(z.path);
    if (!w) continue;
    if (Math.abs(z.h - w.h) > 0.01 || (z.content[1] > z.box[1] + 1 && !(w.content[1] > w.box[1] + 1)) || (z.content[0] > z.box[0] + 1 && !(w.content[0] > w.box[0] + 1)))
      watchDiff.push({ id, cls: z.cls, h: z.h, refH: w.h, box: z.box, content: z.content, refContent: w.content });
  }
}
const mode = process.argv[4] || 'summary';
for (const kind of Object.keys(groups)) {
  const g = groups[kind];
  const n = Object.values(g).reduce((s, l) => s + l.length, 0);
  console.log('\n== NEW ' + kind + ': ' + n + ' in ' + Object.keys(g).length + ' classes');
  for (const [cls, l] of Object.entries(g).sort((p, q) => q[1].length - p[1].length)) {
    const ex = l[0];
    const maxOver = l.reduce((m, r) => r.content ? Math.max(m, r.content[1] - r.box[1], r.content[0] - r.box[0]) : m, 0);
    console.log('  ' + l.length + '× ' + cls + (ex.content ? ' maxOver ' + maxOver + ' axis ' + ex.axis : '') + ' e.g. ' + ex.id + ' ' + JSON.stringify(ex.text).slice(0, 50) + ' ' + JSON.stringify(ex.box || [ex.w, ex.h]) + '→' + JSON.stringify(ex.content || '') + (ex.overflow ? ' ov ' + ex.overflow : '') + (ex.clamp && ex.clamp !== 'none' ? ' clamp ' + ex.clamp : '') + (ex.ellipsis ? ' ellipsis' : ''));
    if (mode === 'full' || kind !== 'spills') l.slice(0, mode === 'full' ? 50 : 6).forEach(r => console.log('      ' + r.id + ' ' + JSON.stringify(r.text).slice(0, 60) + ' ' + JSON.stringify(r.box || [r.w, r.h]) + '→' + JSON.stringify(r.content || '') + (r.ref ? ' ref ' + JSON.stringify(r.ref) : '') + ' ' + (r.path || '')));
  }
}
console.log('\n== watch (coach-card / btn / chip) height or overflow changes: ' + watchDiff.length);
const wg = {};
for (const w of watchDiff) (wg[w.cls] = wg[w.cls] || []).push(w);
for (const [cls, l] of Object.entries(wg)) console.log('  ' + l.length + '× ' + cls + ' e.g. ' + l[0].id + ' h ' + l[0].h + ' ref ' + l[0].refH + ' box ' + JSON.stringify(l[0].box) + ' content ' + JSON.stringify(l[0].content) + ' refContent ' + JSON.stringify(l[0].refContent));
