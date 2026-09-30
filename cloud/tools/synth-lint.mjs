// Synthesis self-check (read-only): leftover markers, Q-key definitions vs uses, size.
import { readFileSync } from 'node:fs';
const f = '/Users/micahflunker/dev/vibes-night/research/SYNTHESIS.md';
const t = readFileSync(f, 'utf8');
const lines = t.split('\n');
console.log('bytes', Buffer.byteLength(t), 'lines', lines.length);
lines.forEach((l, i) => { if (/PART-|TODO|XXX/.test(l)) console.log('marker at', i + 1, l.slice(0, 80)); });
const defined = new Set();
lines.forEach((l) => { const m = l.match(/^- \*\*(Q-[A-Z]\d+)/); if (m) defined.add(m[1]); });
const used = new Map();
lines.forEach((l, i) => { for (const m of l.matchAll(/Q-([A-Z])(\d+)(?:–Q-[A-Z](\d+))?/g)) { const k = `Q-${m[1]}${m[2]}`; if (!used.has(k)) used.set(k, i + 1); if (m[3]) for (let n = +m[2]; n <= +m[3]; n++) if (!used.has(`Q-${m[1]}${n}`)) used.set(`Q-${m[1]}${n}`, i + 1); } });
console.log('defined', [...defined].sort().join(' '));
for (const [k, ln] of used) if (!defined.has(k)) console.log('USED BUT UNDEFINED', k, 'first at line', ln);
const heads = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /^#{2,3} /.test(l));
for (const [n, l] of heads) console.log(n, l.slice(0, 90));
