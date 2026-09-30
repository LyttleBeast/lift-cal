// Finds PNGs under proof/ dirs whose name matches a dir filter and a file filter.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const [, , dirRe, fileRe] = process.argv;
const P = '/Users/micahflunker/dev/vibes-night/proof';
const walk = (d, depth) => { let out = []; for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory() && depth < 4) out = out.concat(walk(p, depth + 1)); else if (n.endsWith('.png') && new RegExp(fileRe).test(p)) out.push(p + ' ' + s.mtime.toISOString()); } return out; };
for (const d of readdirSync(P)) if (new RegExp(dirRe).test(d)) walk(join(P, d), 0).slice(0, 30).forEach(x => console.log(x));
