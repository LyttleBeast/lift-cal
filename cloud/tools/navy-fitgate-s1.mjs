// Fit gate analysis (navy, s1): compares a vibe fit.json against a v1 fit.json of the same tree.
import { readFileSync } from 'node:fs';
const [refP, vibeP, mode] = process.argv.slice(2);
const A = JSON.parse(readFileSync(refP, 'utf8')), B = JSON.parse(readFileSync(vibeP, 'utf8'));
console.log('ref', A.vibe, A.head || A.commit || '', 'totals', JSON.stringify(A.totals));
console.log('vib', B.vibe, 'totals', JSON.stringify(B.totals));
const idx = (arr) => new Map(arr.map(x => [x.path, x]));
const out = { newClip: [], newSpill: [], worseSpill: [], newSmall: [], smallerSmall: [], overflow: [], docOverflow: [], watch: [], errors: [] };
for (const [id, b] of Object.entries(B.scenes)) {
  const a = A.scenes[id];
  if (b.error) { out.errors.push(id + ' ' + b.error); continue; }
  if (!a || a.error) { out.errors.push(id + ' ref missing/error'); continue; }
  if (b.docOverflow) out.docOverflow.push(id + ' ' + b.docScrollWidth);
  const ao = idx(a.overflow);
  b.overflow.forEach(y => { if (!ao.has(y.path)) out.overflow.push({ id, ...y }); });
  const ac = idx(a.clipped);
  for (const y of b.clipped) {
    const dy = y.content[1] - y.box[1], dx = y.content[0] - y.box[0];
    const x = ac.get(y.path);
    const rec = { id, how: y.how, cls: y.cls, text: y.text, axis: y.axis, box: y.box, content: y.content, dy, dx, height: y.height, ov: y.overflow, ell: y.ellipsis, clamp: y.clamp, path: y.path };
    if (!x) (y.how === 'clipped' ? out.newClip : out.newSpill).push(rec);
    else {
      const ady = x.content[1] - x.box[1], adx = x.content[0] - x.box[0];
      if (dy > ady + 1 || dx > adx + 1 || (y.how === 'clipped' && x.how !== 'clipped')) out.worseSpill.push({ ...rec, ref: { how: x.how, box: x.box, content: x.content } });
    }
  }
  const as = idx(a.small);
  // v1 heights of every element: small list only; elements not in v1 small were >= 44 or absent.
  for (const y of b.small) {
    const x = as.get(y.path);
    if (!x) out.newSmall.push({ id, ...y });
    else if (y.h < x.h - 0.01) out.smallerSmall.push({ id, ...y, v1h: x.h, v1w: x.w });
  }
  const aw = idx(a.watch || []);
  for (const y of b.watch || []) {
    const x = aw.get(y.path);
    const cOver = y.content[1] > y.box[1] + 1 || y.content[0] > y.box[0] + 1;
    const aOver = x && (x.content[1] > x.box[1] + 1 || x.content[0] > x.box[0] + 1);
    const coach = /coach-card/.test(y.cls);
    if ((cOver && !aOver) || (coach && x && Math.abs(y.h - x.h) > 0.01) || (x && y.h < x.h - 0.01 && y.h < 44)) out.watch.push({ id, cls: y.cls, h: y.h, w: y.w, box: y.box, content: y.content, v1: x ? { h: x.h, w: x.w, box: x.box, content: x.content } : null, path: y.path });
  }
}
for (const k of Object.keys(out)) console.log(k, out[k].length);
const byCls = (arr) => { const m = new Map(); for (const r of arr) { const k = r.cls + ' [' + r.how + ' ' + r.axis + ']'; const e = m.get(k) || { n: 0, maxdy: -1e9, maxdx: -1e9, ex: r }; e.n++; if (r.dy > e.maxdy) { e.maxdy = r.dy; e.ex = r; } e.maxdx = Math.max(e.maxdx, r.dx); m.set(k, e); } return [...m.entries()].sort((a, b) => b[1].n - a[1].n); };
if (mode === 'detail' || !mode) {
  for (const k of ['newClip', 'worseSpill', 'newSpill']) {
    console.log('\n== ' + k + ' by class');
    for (const [c, e] of byCls(out[k]).slice(0, 60)) console.log(String(e.n).padStart(5), c, 'maxdy', e.maxdy, 'maxdx', e.maxdx, '| ex', e.ex.id, JSON.stringify(e.ex.text), 'box', e.ex.box, 'content', e.ex.content, 'h', e.ex.height, e.ex.ref ? 'v1 ' + JSON.stringify(e.ex.ref) : '');
  }
  const hist = {}; out.newSpill.forEach(r => { const k = Math.max(r.dy, r.dx); hist[k] = (hist[k] || 0) + 1; }); console.log('\nnewSpill max(dy,dx) histogram', JSON.stringify(hist));
  console.log('\n== overflow'); out.overflow.slice(0, 30).forEach(r => console.log(JSON.stringify(r)));
  console.log('\n== newSmall'); out.newSmall.slice(0, 60).forEach(r => console.log(r.id, r.cls, JSON.stringify(r.text), r.w + 'x' + r.h));
  console.log('\n== smallerSmall'); out.smallerSmall.slice(0, 60).forEach(r => console.log(r.id, r.cls, JSON.stringify(r.text), r.w + 'x' + r.h, 'v1', r.v1w + 'x' + r.v1h));
  console.log('\n== watch'); out.watch.slice(0, 60).forEach(r => console.log(JSON.stringify(r)));
  console.log('\n== errors'); out.errors.forEach(e => console.log(e));
}
if (mode && mode.startsWith('grep:')) { const re = new RegExp(mode.slice(5)); for (const k of ['newClip', 'worseSpill', 'newSpill']) out[k].filter(r => re.test(r.cls) || re.test(r.text)).slice(0, 40).forEach(r => console.log(k, JSON.stringify(r))); }
