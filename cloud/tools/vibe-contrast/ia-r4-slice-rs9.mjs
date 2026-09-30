// Iron Age contrast round 4 (rs9): print a scene's rows from the first row
// whose text (or raw/ctx) matches a regex, for n rows — to read a chart's
// marks in order next to the words above it.
//   node ia-r4-slice-rs9.mjs <json> <sceneRe> <startRe> [n] [kindsRe]
import { readFileSync } from 'node:fs';
const [file, sre, rre, n = '30', kre = '.'] = process.argv.slice(2);
const J = JSON.parse(readFileSync(file, 'utf8'));
const scenes = J.scenes ? J.scenes.map(s => ({ name: s.pass + ':' + s.name, rows: s.rows }))
  : J.results.filter(r => !r.error).map(r => ({ name: r.scene + '@' + r.width, rows: r.rows }));
const S = new RegExp(sre), R = new RegExp(rre), K = new RegExp(kre);
const fmt = x => `${x.kind} ${x.ratio} ${x.fg} on ${x.bg} raw ${x.raw}${x.sw != null ? ' sw' + x.sw : ''}${x.text ? ' ' + JSON.stringify(x.text).slice(0, 60) : ''} | ${String(x.ctx).slice(0, 80)} ${(x.fl || []).join(',')}${x.svgCtx ? ' svg:' + x.svgCtx.slice(0, 80) : ''}`;
for (const s of scenes) {
  if (!S.test(s.name)) continue;
  const i = s.rows.findIndex(x => R.test([x.text || '', x.raw, x.ctx].join(' ')));
  if (i < 0) continue;
  console.log('--- ' + s.name + ' from row ' + i);
  let shown = 0;
  for (let j = i; j < s.rows.length && shown < +n; j++) if (K.test(s.rows[j].kind)) { console.log('  ' + fmt(s.rows[j])); shown++; }
  break;
}
