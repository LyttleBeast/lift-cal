// vibe-contrast/analyze.mjs — group the pairs web.mjs / native.mjs read and
// say which fail. node analyze.mjs <json> [--kinds text,placeholder] [--all] [--min 4.5] [--grep re]
import { readFileSync } from 'node:fs';
const argv = process.argv.slice(2);
const file = argv[0];
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const J = JSON.parse(readFileSync(file, 'utf8'));
const kinds = arg('--kinds', null) ? arg('--kinds').split(',') : null;
const ALL = argv.includes('--all');
const GREP = arg('--grep', null) ? new RegExp(arg('--grep')) : null;
const LIMIT = +arg('--limit', 60);
const rows = [];
if (J.results) for (const r of J.results) { if (r.error) { console.log('ERR', r.group, r.scene, r.error); continue; } for (const x of r.rows) rows.push({ ...x, scene: r.scene, vibe: r.vibe }); }
if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
const TEXT = new Set(['text', 'placeholder', 'svg-text', 'text-pressed']);
const need = x => TEXT.has(x.kind) ? (x.large ? 3 : 4.5) : 3;
const groups = new Map();
for (const x of rows) {
  if (kinds && !kinds.includes(x.kind)) continue;
  if (x.ratio == null) { const k = 'NA|' + x.kind + '|' + (x.raw || x.text || ''); const g = groups.get(k) || { ...x, scenes: new Set(), ctxs: new Set(), n: 0 }; g.n++; g.scenes.add(x.scene); g.ctxs.add(x.ctx); groups.set(k, g); continue; }
  const fail = x.ratio < need(x);
  if (!ALL && !fail) continue;
  if (GREP && !GREP.test(x.ctx + ' ' + (x.text || '') + ' ' + (x.svgCtx || ''))) continue;
  const k = [x.kind, x.fg, x.bg, x.large ? 'L' : '', x.raw].join('|');
  const g = groups.get(k) || { ...x, scenes: new Set(), ctxs: new Set(), texts: new Set(), fls: new Set(), n: 0 };
  g.n++; g.scenes.add(x.scene); g.ctxs.add(x.ctx); if (x.text) g.texts.add(x.text); (x.fl || []).forEach(f => g.fls.add(f));
  groups.set(k, g);
}
const out = [...groups.values()].sort((a, b) => (a.ratio || 0) - (b.ratio || 0));
console.log(file, 'rows', rows.length, 'groups', out.length);
for (const g of out.slice(0, LIMIT)) {
  console.log(`${g.kind} ${g.ratio} fg ${g.fg} bg ${g.bg} raw ${g.raw} ${g.large ? 'LARGE' : ''} fs ${g.fs ?? ''} w ${g.w ?? ''} ${g.size || g.bw || ''} n${g.n} ${g.control ? 'CONTROL' : ''}${g.inner ? ' inner ' + g.inner + ' vsInner ' + g.vsInner + ' fillVsOuter ' + g.fillVsOuter : ''}`);
  console.log('   scenes: ' + [...g.scenes].slice(0, 5).join(', ') + (g.scenes.size > 5 ? ' …' + g.scenes.size : ''));
  console.log('   ctx: ' + [...g.ctxs].slice(0, 3).join('  ||  ').slice(0, 400));
  if (g.texts && g.texts.size) console.log('   text: ' + [...g.texts].slice(0, 4).map(t => JSON.stringify(t)).join(', '));
  if (g.fls && g.fls.size) console.log('   flags: ' + [...g.fls].slice(0, 6).join(', '));
  if (g.svgCtx) console.log('   svg: ' + g.svgCtx.slice(0, 160));
}
