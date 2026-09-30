// Oxblood web agent: what is NEW in a fit run against its reference, grouped.
// node oxw-fit-new.mjs <fit.json> [kind] [cls-filter]
import { readFileSync } from 'node:fs';
const [f, kindF, clsF] = process.argv.slice(2);
const A = JSON.parse(readFileSync(f, 'utf8'));
const R = JSON.parse(readFileSync(A.compare.reference, 'utf8'));
console.log('totals', JSON.stringify(A.totals), '\nref   ', JSON.stringify(R.totals));
const find = (scene, kind, path) => {
  const s = A.scenes[scene]; if (!s) return null;
  const arr = s[kind === 'small' ? 'smallTargets' : kind] || s[kind + 's'] || [];
  return Array.isArray(arr) ? arr.find(x => x.path === path) : null;
};
const groups = new Map();
for (const n of A.compare.new) {
  const [scene, kind, path] = n.split('|');
  if (kindF && kind !== kindF) continue;
  const it = find(scene, kind, path) || {};
  const key = kind + ' ' + (it.cls || '?');
  if (clsF && !key.includes(clsF)) continue;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ scene, it });
}
console.log('new', A.compare.new.length, 'gone', A.compare.gone.length);
for (const [k, v] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
  console.log(v.length, k, '| e.g.', v[0].scene, JSON.stringify(v[0].it).slice(0, 260));
}
