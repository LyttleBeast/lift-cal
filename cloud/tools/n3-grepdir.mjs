// N3 scratch: list files under a directory whose text matches a regex (no grep -r in this session).
// usage: node n3-grepdir.mjs <dir> <regex> [maxLinesPerFile]
import fs from 'node:fs';
import { join } from 'node:path';
const [dir, re, max = '3'] = process.argv.slice(2);
const rx = new RegExp(re);
const walk = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
    if (!/\.(js|mjs|cjs|jsx|ts|tsx)$/.test(e.name) || /\.map$|\.d\.ts$/.test(e.name)) continue;
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    const hits = lines.map((l, i) => [i + 1, l]).filter(([, l]) => rx.test(l));
    if (hits.length) { console.log(p + ' (' + hits.length + ')'); hits.slice(0, +max).forEach(([n, l]) => console.log('  ' + n + ': ' + l.trim().slice(0, 200))); }
  }
};
walk(dir);
