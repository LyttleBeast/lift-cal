// Oxblood web agent: summarise a fit.json against a reference one.
// node oxw-fit-look.mjs <fit.json> [<ref fit.json>] [kind] [scene-filter]
import { readFileSync } from 'node:fs';
const [a, b, kind, scene] = process.argv.slice(2);
const A = JSON.parse(readFileSync(a, 'utf8'));
const show = (o, d = 0) => Object.entries(o).slice(0, 12).map(([k, v]) => '  '.repeat(d) + k + ': ' + (v && typeof v === 'object' ? (Array.isArray(v) ? `[${v.length}] ` + JSON.stringify(v[0])?.slice(0, 300) : '{' + Object.keys(v).slice(0, 8).join(',') + '}') : JSON.stringify(v))).join('\n');
if (!kind) { console.log(show(A)); if (b) console.log('--- ref\n' + show(JSON.parse(readFileSync(b, 'utf8')))); process.exit(0); }
const B = b && b !== '-' ? JSON.parse(readFileSync(b, 'utf8')) : null;
const items = x => (x.items || x.findings || x[kind] || []);
const list = o => (Array.isArray(o[kind]) ? o[kind] : items(o)).filter(i => !scene || JSON.stringify(i).includes(scene));
const la = list(A), lb = B ? list(B) : [];
console.log(kind, 'A', la.length, 'B', lb.length);
for (const i of la.slice(0, 40)) console.log(JSON.stringify(i).slice(0, 400));
