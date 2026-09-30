// Compare a vibe fit.json with a v1 fit.json of the same tree: new findings,
// the watch list (coach card, .btn, chips) heights, and small targets that got
// smaller than v1 drew them. Read-only; prints a report.
import { readFileSync } from 'node:fs';
const [refPath, vibPath] = process.argv.slice(2);
const ref = JSON.parse(readFileSync(refPath, 'utf8')), vib = JSON.parse(readFileSync(vibPath, 'utf8'));
console.log('ref', ref.vibe, ref.sha, JSON.stringify(ref.totals));
console.log('vib', vib.vibe, vib.sha, JSON.stringify(vib.totals));
if (vib.compare) { console.log('compare.new', vib.compare.new.length, 'gone', vib.compare.gone); vib.compare.new.slice(0, 80).forEach(k => console.log('  NEW', k)); }
const errs = Object.entries(vib.scenes).filter(([, x]) => x.error);
errs.forEach(([k, x]) => console.log('ERR', k, x.error));
let coach = [], shrink = [], smaller = [], clipped = [], missingScene = [];
for (const [k, x] of Object.entries(vib.scenes)) {
  if (x.error) continue;
  const r = ref.scenes[k];
  if (!r || r.error) { missingScene.push(k); continue; }
  const rw = new Map(r.watch.map(w => [w.path, w]));
  for (const w of x.watch) {
    if (/coach-card/.test(w.cls)) coach.push(k + ' ' + w.cls + ' h=' + w.h + ' box=' + w.box + ' content=' + w.content + (rw.get(w.path) ? ' v1h=' + rw.get(w.path).h : ' (no v1 match)'));
    const v = rw.get(w.path);
    if (v && w.h < v.h - 0.5 && w.h < 43.99) shrink.push(k + ' ' + w.cls + ' ' + v.h + '→' + w.h);
    if (w.content[1] > w.box[1] + 1 || w.content[0] > w.box[0] + 1) clipped.push(k + ' watch ' + w.cls + ' box=' + w.box + ' content=' + w.content);
  }
  const rs = new Map(r.small.map(s => [s.path, s]));
  for (const s of x.small) { const v = rs.get(s.path); if (v && s.h < v.h - 0.5) smaller.push(k + ' ' + s.cls + ' "' + s.text + '" ' + v.h + '→' + s.h); }
  for (const c of x.clipped.filter(c => c.how === 'clipped')) clipped.push(k + ' ' + c.cls + ' ' + JSON.stringify(c.text) + ' box=' + c.box + ' content=' + c.content + ' ell=' + c.ellipsis);
}
const uniq = a => [...new Set(a)];
console.log('\nCOACH CARD (' + coach.length + ')'); uniq(coach).forEach(l => console.log('  ' + l));
console.log('\nWATCH SHRINK below v1 and <44 (' + shrink.length + ')'); shrink.forEach(l => console.log('  ' + l));
console.log('\nSMALL TARGETS smaller than v1 (' + smaller.length + ')'); smaller.slice(0, 60).forEach(l => console.log('  ' + l));
console.log('\nCLIPPED (' + clipped.length + ')'); clipped.forEach(l => console.log('  ' + l));
console.log('\nscenes missing in ref', missingScene.length, missingScene.slice(0, 10).join(' '));
// spills new vs ref by path, text sample
const spills = [];
for (const [k, x] of Object.entries(vib.scenes)) { if (x.error) continue; const r = ref.scenes[k]; const rp = new Set((r && r.clipped || []).map(c => c.path)); x.clipped.filter(c => c.how === 'spills' && !rp.has(c.path)).forEach(c => spills.push(k + ' ' + c.cls + ' ' + JSON.stringify(c.text) + ' ' + c.axis + ' box=' + c.box + ' content=' + c.content + ' h=' + c.height)); }
console.log('\nNEW SPILLS (' + spills.length + ')'); spills.slice(0, 80).forEach(l => console.log('  ' + l));
