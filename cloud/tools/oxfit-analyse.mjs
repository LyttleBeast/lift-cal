// Compare a vibe fit.json with a v1 fit.json of the same tree: what is new, by kind, grouped.
import { readFileSync } from 'node:fs';
const [vf, rf] = process.argv.slice(2);
const V = JSON.parse(readFileSync(vf, 'utf8')), R = JSON.parse(readFileSync(rf, 'utf8'));
console.log('vibe', V.vibe, V.sha, 'dirty', V.dirty, 'ref', R.vibe, R.sha, 'dirty', R.dirty);
console.log('totals vibe', JSON.stringify(V.totals));
console.log('totals ref ', JSON.stringify(R.totals));
const keyed = (arr, f) => new Map(arr.map(x => [f(x), x]));
const agg = { overflow: [], clipped: [], spills: [], small: [], watch: [] };
for (const [id, x] of Object.entries(V.scenes)) {
  if (x.error) { console.log('ERROR', id, x.error); continue; }
  const r = R.scenes[id];
  if (!r || r.error) { console.log('no ref for', id); continue; }
  if (x.docOverflow) console.log('DOC OVERFLOW', id, x.docScrollWidth, 'vw', x.vw);
  const ro = keyed(r.overflow, y => y.path);
  x.overflow.forEach(y => { if (!ro.has(y.path)) agg.overflow.push([id, y]); });
  const rc = keyed(r.clipped, y => y.how + '|' + y.path);
  x.clipped.forEach(y => {
    const old = rc.get(y.how + '|' + y.path);
    if (y.how === 'clipped') { if (!old || (y.content[1] - y.box[1]) > (old.content[1] - old.box[1]) + 1 || (y.content[0] - y.box[0]) > (old.content[0] - old.box[0]) + 1) agg.clipped.push([id, y, old]); }
    else if (!old) agg.spills.push([id, y]);
  });
  const rs = keyed(r.small, y => y.path);
  x.small.forEach(y => { const o = rs.get(y.path); if (!o || y.h < o.h - 0.01) agg.small.push([id, y, o]); });
  const rw = keyed(r.watch, y => y.path);
  x.watch.forEach(y => { const o = rw.get(y.path); if (o && (Math.abs(o.h - y.h) > 0.01 || Math.abs(o.w - y.w) > 0.01)) agg.watch.push([id, y, o]); });
}
console.log('\nNEW OVERFLOW', agg.overflow.length); agg.overflow.slice(0, 30).forEach(([id, y]) => console.log(' ', id, y.cls, JSON.stringify(y.text), y.left, y.right));
console.log('\nNEW/WORSE CLIPPED', agg.clipped.length); agg.clipped.forEach(([id, y, o]) => console.log(' ', id, y.cls, y.axis, 'box', y.box, 'content', y.content, 'ov', y.overflow, 'ell', y.ellipsis, 'clamp', y.clamp, JSON.stringify(y.text), o ? 'ref box ' + o.box + ' content ' + o.content : 'NEW', y.path));
console.log('\nNEW/SHORTER SMALL TARGETS', agg.small.length); agg.small.slice(0, 60).forEach(([id, y, o]) => console.log(' ', id, y.cls, JSON.stringify(y.text), y.w + 'x' + y.h, o ? 'ref ' + o.w + 'x' + o.h : 'NEW', y.path));
// spills grouped by class and axis with the max overshoot
const g = new Map();
for (const [id, y] of agg.spills) {
  const k = y.cls + ' ' + y.axis;
  const over = Math.max(y.content[1] - y.box[1], y.content[0] - y.box[0]);
  const e = g.get(k) || { n: 0, max: 0, ex: null, fixed: new Set() };
  e.n++; if (over > e.max) { e.max = over; e.ex = [id, y]; }
  if (y.height && y.height !== 'auto') e.fixed.add(y.height);
  g.set(k, e);
}
console.log('\nNEW SPILLS', agg.spills.length, 'in', g.size, 'groups (class axis: count, max overshoot px, example)');
[...g.entries()].sort((a, b) => b[1].max - a[1].max).forEach(([k, e]) => console.log(' ', k, e.n, 'max', e.max, e.ex[0], JSON.stringify(e.ex[1].text), 'box', e.ex[1].box, 'content', e.ex[1].content, 'h', e.ex[1].height));
console.log('\nWATCH SIZE CHANGES (.coach-card, .btn, chips)', agg.watch.length);
const wg = new Map();
for (const [id, y, o] of agg.watch) { const k = y.cls + ' ' + o.w + 'x' + o.h + ' -> ' + y.w + 'x' + y.h; const e = wg.get(k) || { n: 0, ex: id, content: y.content, box: y.box }; e.n++; wg.set(k, e); }
[...wg.entries()].forEach(([k, e]) => console.log(' ', k, 'x' + e.n, e.ex, 'box', e.box, 'content', e.content));
// coach cards: all watch entries with coach-card
console.log('\nCOACH CARDS');
for (const [id, x] of Object.entries(V.scenes)) if (!x.error) x.watch.filter(y => /coach-card/.test(y.cls)).forEach(y => console.log(' ', id, y.cls, y.w + 'x' + y.h, 'box', y.box, 'content', y.content));
