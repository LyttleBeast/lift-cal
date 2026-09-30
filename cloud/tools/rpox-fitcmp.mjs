// rpox: two fit.json files, flagged element sets compared (scene|kind|path),
// including each clipped/spill entry's text and box so a changed box shows.
//   node rpox-fitcmp.mjs <a fit.json> <b fit.json>
import { readFileSync } from 'node:fs';
const [A, B] = process.argv.slice(2);
const keys = f => {
  const j = JSON.parse(readFileSync(f, 'utf8')), m = new Map();
  for (const [scene, s] of Object.entries(j.scenes)) {
    for (const kind of Object.keys(s)) {
      if (!Array.isArray(s[kind])) continue;
      for (const e of s[kind]) {
        if (!e || typeof e !== 'object') continue;
        const k = scene + '|' + kind + '|' + (e.how || '') + '|' + (e.path || '');
        m.set(k, e);
      }
    }
  }
  return [j, m];
};
const [ja, a] = keys(A), [jb, b] = keys(B);
console.log('A', ja.run, ja.sha, ja.vibe, JSON.stringify(ja.totals));
console.log('B', jb.run, jb.sha, jb.vibe, JSON.stringify(jb.totals));
const onlyA = [...a.keys()].filter(k => !b.has(k)), onlyB = [...b.keys()].filter(k => !a.has(k));
console.log('only A', onlyA.length, 'only B', onlyB.length, 'both', [...a.keys()].filter(k => b.has(k)).length);
for (const k of onlyA.slice(0, 30)) console.log('  A-only ' + k + ' ' + JSON.stringify(a.get(k).text || '').slice(0, 60));
for (const k of onlyB.slice(0, 30)) console.log('  B-only ' + k + ' ' + JSON.stringify(b.get(k).text || '').slice(0, 60));
let changed = 0;
const ex = [];
for (const [k, e] of b) {
  const f = a.get(k); if (!f) continue;
  const s1 = JSON.stringify([f.box, f.content, f.text]), s2 = JSON.stringify([e.box, e.content, e.text]);
  if (s1 !== s2) { changed++; if (ex.length < 25) ex.push(k + '  ' + s1 + ' -> ' + s2); }
}
console.log('same key, box/content/text changed:', changed);
for (const x of ex) console.log('  ' + x.slice(0, 300));
