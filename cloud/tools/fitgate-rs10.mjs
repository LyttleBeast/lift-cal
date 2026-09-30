// Summarise a vibe fit.json against a v1 fit.json of the same tree (V59 §13.3).
// usage: node fitgate-rs10.mjs <vibe fit.json> <v1 fit.json>
import { readFileSync } from 'node:fs';
const [vf, rf] = process.argv.slice(2);
const V = JSON.parse(readFileSync(vf, 'utf8')), R = JSON.parse(readFileSync(rf, 'utf8'));
console.log('vibe run', V.run, V.sha, 'dirty', V.dirty, 'vibe', V.vibe, 'vibeJs', V.vibeJs);
console.log('ref  run', R.run, R.sha, 'dirty', R.dirty, 'vibe', R.vibe);
console.log('vibe totals', JSON.stringify(V.totals));
console.log('ref  totals', JSON.stringify(R.totals));
const errs = Object.entries(V.scenes).filter(([, x]) => x.error);
console.log('scene errors:', errs.map(([k, x]) => k + ' ' + x.error).join('; ') || 'none');
// by class+text rather than path (paths can shift by one when an element is added)
// (the icon set replaces typed glyphs with drawings, so text is not part of the key)
const keyOf = (id, y) => id + '|' + (y.cls || y.path);
const idx = (sc, pick) => { const m = new Map(); for (const [id, x] of Object.entries(sc)) { if (x.error) continue; for (const y of pick(x)) { const k = keyOf(id, y), o = m.get(k); if (!o || (y.w || 0) * (y.h || 0) < (o.w || 0) * (o.h || 0)) m.set(k, y); } } return m; };
const sections = {
  overflow: x => x.overflow,
  clipped: x => x.clipped.filter(y => y.how === 'clipped'),
  small: x => x.small,
  spillX: x => x.clipped.filter(y => y.how === 'spills' && y.axis !== 'y'),
};
for (const [name, pick] of Object.entries(sections)) {
  const a = idx(V.scenes, pick), b = idx(R.scenes, pick);
  const nu = [...a.keys()].filter(k => !b.has(k));
  console.log('\n== ' + name + ': vibe ' + a.size + ', v1 ' + b.size + ', new ' + nu.length);
  const byCls = {}; for (const k of nu) { const c = k.split('|')[1] + ' ' + JSON.stringify([a.get(k).w, a.get(k).h]); byCls[c] = (byCls[c] || 0) + 1; }
  console.log('  new by class: ' + JSON.stringify(byCls));
  for (const k of nu.slice(0, 25)) console.log('  NEW ' + k + ' ' + JSON.stringify(a.get(k)).slice(0, 260));
  if (name === 'small') {
    // same key in both but smaller in the vibe
    const worse = [...a.keys()].filter(k => b.has(k) && (a.get(k).w < b.get(k).w - 0.5 || a.get(k).h < b.get(k).h - 0.5));
    console.log('  smaller than v1: ' + worse.length);
    for (const k of worse.slice(0, 40)) console.log('  SMALLER ' + k + ' vibe ' + a.get(k).w + 'x' + a.get(k).h + ' v1 ' + b.get(k).w + 'x' + b.get(k).h);
  }
  if (name === 'clipped') for (const k of [...a.keys()]) console.log('  ALL ' + k + ' ' + JSON.stringify(a.get(k)).slice(0, 260));
}
// the vertical spills: count and the largest
const sp = [];
for (const [id, x] of Object.entries(V.scenes)) if (!x.error) for (const y of x.clipped) if (y.how === 'spills' && y.axis === 'y') sp.push([id, y, y.content[1] - y.box[1]]);
sp.sort((p, q) => q[2] - p[2]);
console.log('\nvertical spills ' + sp.length + '; >=5px ' + sp.filter(s => s[2] >= 5).length + '; largest:');
for (const [id, y, d] of sp.slice(0, 15)) console.log('  +' + d + ' ' + id + ' ' + y.cls + ' "' + (y.text || '').slice(0, 30) + '" box ' + y.box + ' content ' + y.content);
// the watched fixed boxes (the Coach card, full-width buttons): height vs v1 and content vs box
const wv = idx(V.scenes, x => x.watch || []), wr = idx(R.scenes, x => x.watch || []);
const coach = { 190: 0, 164: 0, other: [] };
let wbad = 0;
for (const [k, y] of wv) {
  const r = wr.get(k);
  if (y.cls && y.cls.includes('coach-card')) { if (y.h === 190 || y.h === 164) coach[y.h]++; else coach.other.push(k + ' ' + y.h); }
  const over = y.content[0] > y.box[0] + 0.5 || y.content[1] > y.box[1] + 0.5;
  const diffH = r && Math.abs(r.h - y.h) > 0.5;
  if (over || diffH || !r) { wbad++; if (wbad <= 30) console.log('  WATCH ' + k + ' vibe ' + y.w + 'x' + y.h + ' box ' + y.box + ' content ' + y.content + (r ? ' v1 ' + r.w + 'x' + r.h : ' (not in v1)')); }
}
console.log('\nwatched boxes ' + wv.size + ' (v1 ' + wr.size + '), flagged ' + wbad + '; coach cards 190: ' + coach[190] + ', 164: ' + coach[164] + ', other: ' + JSON.stringify(coach.other));
// the doc overflow per scene
console.log('\ndocOverflow vibe:', JSON.stringify(V.totals.docOverflow), ' ref:', JSON.stringify(R.totals.docOverflow));
// keys the fit records per scene besides the lists, for the coach card etc.
const any = Object.values(V.scenes).find(x => !x.error);
console.log('scene keys:', Object.keys(any).join(','));
if (V.compare) console.log('harness compare: new ' + V.compare.new.length + ', gone ' + V.compare.gone + ', new kinds ' + JSON.stringify(V.compare.new.reduce((m, k) => (m[k.split('|')[1]] = (m[k.split('|')[1]] || 0) + 1, m), {})));
