// List a native/web contrast JSON's rows for one scene (regex), optionally
// filtered by kind and a regex over raw/fg/bg/ctx. Round 2 (rs9) helper.
//   node r2-scene-rs9.mjs <json> <sceneRe> [kindsCsv|-] [filterRe]
import { readFileSync } from 'node:fs';
const [file, sre, kinds, fre] = process.argv.slice(2);
const J = JSON.parse(readFileSync(file, 'utf8'));
const S = new RegExp(sre), F = fre ? new RegExp(fre) : null;
const K = kinds && kinds !== '-' ? kinds.split(',') : null;
const scenes = J.scenes ? J.scenes.map(s => ({ name: s.pass + ':' + s.name, rows: s.rows }))
  : J.results.filter(r => !r.error).map(r => ({ name: r.scene + '@' + r.width, rows: r.rows }));
const seen = new Map();
for (const s of scenes) {
  if (!S.test(s.name)) continue;
  for (const x of s.rows) {
    if (K && !K.includes(x.kind)) continue;
    const line = `${x.kind} ${x.ratio} fg ${x.fg} bg ${x.bg} raw ${x.raw} ${x.bw || x.sw || ''} ${x.wh || ''} ${x.text ? JSON.stringify(x.text) : ''} | ${String(x.ctx).slice(0, 110)} ${(x.fl || []).join(',')}`;
    if (F && !F.test(line)) continue;
    const k = s.name.split('@')[0] + '§' + line;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
}
for (const [k, n] of seen) console.log('x' + n + ' ' + k);
