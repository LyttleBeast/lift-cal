// Compares a vibe fit.json with a v1 fit.json of the same tree: new clipped,
// new small targets, new spills (grouped by class), and watched boxes
// (.coach-card, .btn, chips) whose height or content overflow changed.
import { readFileSync, writeFileSync } from 'node:fs';
const [, , refPath, vibePath, outPath] = process.argv;
const ref = JSON.parse(readFileSync(refPath, 'utf8')), vib = JSON.parse(readFileSync(vibePath, 'utf8'));
const out = { newClipped: [], newSmall: [], newSpillsByCls: {}, spillSamples: {}, watchChanged: [], coach: [], docOverflow: [], overflow: [], errors: [] };
for (const [id, x] of Object.entries(vib.scenes)) {
  if (x.error) { out.errors.push(id + ' ' + x.error); continue; }
  const r = ref.scenes[id];
  if (!r || r.error) { out.errors.push(id + ' no ref'); continue; }
  if (x.docOverflow) out.docOverflow.push(id + ' ' + x.docScrollWidth);
  x.overflow.forEach(o => out.overflow.push(id + ' ' + o.path + ' ' + o.cls + ' ' + o.right));
  const key = (y) => y.path;
  const rc = new Set(r.clipped.filter(y => y.how === 'clipped').map(key));
  const rs = new Set(r.clipped.filter(y => y.how === 'spills').map(key));
  const rsm = new Set(r.small.map(key));
  for (const y of x.clipped) {
    if (y.how === 'clipped' && !rc.has(key(y))) out.newClipped.push({ id, ...y });
    if (y.how === 'spills' && !rs.has(key(y))) {
      out.newSpillsByCls[y.cls] = (out.newSpillsByCls[y.cls] || 0) + 1;
      (out.spillSamples[y.cls] ||= []).length < 3 && out.spillSamples[y.cls].push({ id, path: y.path, text: y.text, axis: y.axis, box: y.box, content: y.content, height: y.height });
    }
  }
  for (const y of x.small) if (!rsm.has(key(y))) out.newSmall.push({ id, ...y });
  const rw = new Map(r.watch.map(w => [w.path, w]));
  for (const w of x.watch) {
    if (/coach-card/.test(w.cls)) out.coach.push({ id, cls: w.cls, h: w.h, box: w.box, content: w.content, v1: rw.get(w.path) ? [rw.get(w.path).h, rw.get(w.path).content] : null });
    const o = rw.get(w.path);
    if (!o) continue;
    const over = w.content[1] > w.box[1] + 1 || w.content[0] > w.box[0] + 1;
    const overV1 = o.content[1] > o.box[1] + 1 || o.content[0] > o.box[0] + 1;
    if ((w.h < 44 && Math.abs(w.h - o.h) > 0.5) || (over && !overV1)) out.watchChanged.push({ id, path: w.path, cls: w.cls, h: w.h, v1h: o.h, box: w.box, content: w.content, v1box: o.box, v1content: o.content });
  }
}
out.totals = { ref: ref.totals, vibe: vib.totals, newClipped: out.newClipped.length, newSmall: out.newSmall.length, newSpills: Object.values(out.newSpillsByCls).reduce((a, b) => a + b, 0), watchChanged: out.watchChanged.length, errors: out.errors.length };
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.totals));
console.log('docOverflow', out.docOverflow.length, 'overflow', out.overflow.length);
console.log('newClipped:'); out.newClipped.forEach(y => console.log('  ' + y.id + ' ' + y.cls + ' "' + y.text + '" ' + y.axis + ' box ' + y.box + ' content ' + y.content + ' h ' + y.height + ' ov ' + y.overflow + ' ell ' + y.ellipsis + ' | ' + y.path));
const smallBy = {}; out.newSmall.forEach(y => { const k = y.cls + ' h' + y.h; (smallBy[k] ||= []).push(y.id); });
console.log('newSmall by cls:'); Object.entries(smallBy).forEach(([k, v]) => console.log('  ' + k + ' x' + v.length + ' e.g. ' + v.slice(0, 3).join(',')));
console.log('newSpills by cls:'); Object.entries(out.newSpillsByCls).sort((a, b) => b[1] - a[1]).slice(0, 40).forEach(([k, v]) => console.log('  ' + k + ' x' + v + ' ' + JSON.stringify(out.spillSamples[k][0])));
console.log('watchChanged:'); out.watchChanged.slice(0, 60).forEach(w => console.log('  ' + w.id + ' ' + w.cls + ' h ' + w.h + ' (v1 ' + w.v1h + ') box ' + w.box + ' content ' + w.content + ' v1 ' + w.v1box + '/' + w.v1content));
const ch = {}; out.coach.forEach(c => { const k = c.cls + ' h' + c.h + ' box' + c.box + ' content' + c.content + ' v1 ' + JSON.stringify(c.v1); (ch[k] ||= []).push(c.id); });
console.log('coach cards:'); Object.entries(ch).forEach(([k, v]) => console.log('  ' + k + ' x' + v.length + ' e.g. ' + v.slice(0, 3).join(',')));
