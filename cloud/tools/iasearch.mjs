// iasearch.mjs — query Internet Archive advancedsearch and print a compact list (research track 7).
// The download itself goes through fetch.mjs (the night's only downloader).
// Usage: node iasearch.mjs '<lucene query>' <outfile.json> [rows]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const [q, out, rows = 40] = process.argv.slice(2);
const fl = ['identifier', 'title', 'date', 'creator', 'scanner', 'contributor', 'imagecount'];
const u = new URL('https://archive.org/advancedsearch.php');
u.searchParams.set('q', q);
for (const f of fl) u.searchParams.append('fl[]', f);
u.searchParams.set('rows', rows); u.searchParams.set('output', 'json'); u.searchParams.set('sort[]', 'date asc');
execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', u.href, out], { stdio: 'ignore' });
const j = JSON.parse(readFileSync(out, 'utf8'));
console.log('numFound', j.response.numFound);
for (const d of j.response.docs) {
  const s = k => (Array.isArray(d[k]) ? d[k].join('|') : (d[k] ?? ''));
  console.log([s('identifier'), String(s('date')).slice(0, 10), s('scanner'), String(s('contributor')).slice(0, 40), s('imagecount'), String(s('title')).slice(0, 70), String(s('creator')).slice(0, 40)].join(' ; '));
}
