// fit-analyze.mjs <fit.json> [--spills] — summarise a fit run's compare.new by kind, with details.
import { readFileSync } from 'node:fs';
const [file, ...rest] = process.argv.slice(2);
const j = JSON.parse(readFileSync(file, 'utf8'));
console.log('sha', j.sha, 'dirty', j.dirty, 'vibe', j.vibe, 'totals', JSON.stringify(j.totals));
const errs = Object.entries(j.scenes).filter(([, x]) => x.error);
errs.forEach(([k, x]) => console.log('ERROR', k, x.error));
const nw = (j.compare && j.compare.new) || [];
const byKind = {};
for (const k of nw) { const kind = k.split('|')[1]; (byKind[kind] = byKind[kind] || []).push(k); }
console.log('new by kind', Object.fromEntries(Object.entries(byKind).map(([a, b]) => [a, b.length])), 'gone', j.compare && j.compare.gone);
const find = (id, kind, path) => {
  const x = j.scenes[id];
  if (kind === 'overflow') return x.overflow.find(y => y.path === path);
  if (kind === 'small') return x.small.find(y => y.path === path);
  if (kind === 'docOverflow') return { docScrollWidth: x.docScrollWidth, vw: x.vw };
  return x.clipped.find(y => y.path === path && y.how === kind);
};
for (const kind of Object.keys(byKind)) {
  if (kind === 'spills' && !rest.includes('--spills')) {
    // group spills: by cls, max excess
    const g = {};
    for (const k of byKind[kind]) {
      const [id, , path] = k.split('|');
      const d = find(id, kind, path);
      const key = d.cls + ' axis=' + d.axis + ' h=' + d.height;
      const ex = Math.max(d.content[0] - d.box[0], d.content[1] - d.box[1]);
      g[key] = g[key] || { n: 0, max: 0, ex: '' };
      g[key].n++; if (ex > g[key].max) { g[key].max = ex; g[key].ex = id + ' ' + JSON.stringify(d.text) + ' box ' + d.box + ' content ' + d.content; }
    }
    Object.entries(g).sort((a, b) => b[1].max - a[1].max).forEach(([k, v]) => console.log('SPILLS', v.n, 'maxExcess', v.max, k, '|', v.ex));
    continue;
  }
  for (const k of byKind[kind]) {
    const [id, , path] = k.split('|');
    console.log(kind.toUpperCase(), id, path || '', JSON.stringify(find(id, kind, path)));
  }
}
