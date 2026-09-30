// List every row matching kind/raw/fg filters in a vibe-contrast json, with
// scene and full context (iron-age contrast gate, rs9).
// node ia-rs9-find.mjs <json> <kind> <rawRe> [fgRe] [--max n]
import { readFileSync } from 'node:fs';
const MAX = +(process.argv.includes('--max') ? process.argv[process.argv.indexOf('--max') + 1] : 40);
const pos = process.argv.slice(2).filter((a, i, A) => a !== '--max' && A[i - 1] !== '--max');
const [file, kind, rawRe, fgRe] = pos;
const J = JSON.parse(readFileSync(file, 'utf8'));
const rows = [];
if (J.results) for (const r of J.results) if (!r.error) for (const x of r.rows) rows.push({ ...x, scene: r.scene + '@' + r.width });
if (J.scenes) for (const s of J.scenes) for (const x of s.rows) rows.push({ ...x, scene: s.pass + ':' + s.name });
const R = new RegExp(rawRe, 'i'), F = fgRe && fgRe !== '-' ? new RegExp(fgRe, 'i') : null;
const hits = rows.filter(x => x.kind === kind && R.test(String(x.raw)) && (!F || F.test(x.fg)));
const by = new Map();
for (const x of hits) { const k = x.ctx + ' | ' + x.fg + ' on ' + x.bg + ' ' + x.ratio + (x.text ? ' "' + x.text + '"' : '') + (x.size ? ' ' + x.size : '') + (x.inner ? ' inner ' + x.inner + ' fillVsOuter ' + x.fillVsOuter : ''); const g = by.get(k) || new Set(); g.add(x.scene); by.set(k, g); }
console.log(hits.length, 'rows', by.size, 'groups');
for (const [k, s] of [...by].slice(0, MAX)) console.log(k + '\n    ' + [...s].slice(0, 8).join(' ; ') + (s.size > 8 ? ' …' + s.size : ''));
