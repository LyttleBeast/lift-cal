// 08a-ziplist.mjs — parse an IA view_archive.php HTML listing; print entries by 0-based image index.
// Usage: node 08a-ziplist.mjs <file.html> [n n n ...]
import { readFileSync } from 'node:fs';
const [f, ...ns] = process.argv.slice(2);
const html = readFileSync(f, 'utf8');
const hrefs = [...html.matchAll(/href="([^"]+\.(?:tif|jp2|jpg))"/gi)].map(m => m[1]);
console.log('images:', hrefs.length, '| first:', hrefs[0], '| last:', hrefs.at(-1));
if (!hrefs.length) { const i = html.indexOf('.tif'); console.log(html.slice(Math.max(0, i - 400), i + 200)); }
for (const n of ns.map(Number)) console.log(n, hrefs[n]);
