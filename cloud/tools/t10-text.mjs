// t10-text.mjs — track 10 research helper. Strips a saved HTML page to text and
// prints the windows around each match of a regex.
// Usage: node t10-text.mjs <saved.html> <regex> [radius]
import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&#39;|&rsquo;/g, '’').replace(/\s+/g, ' ');
const re = new RegExp(process.argv[3], 'gi');
const r = Number(process.argv[4] || 300);
let last = -1e9, n = 0;
for (const m of text.matchAll(re)) {
  if (m.index - last < r) continue;
  last = m.index;
  console.log('*', text.slice(Math.max(0, m.index - r), m.index + r));
  if (++n > 20) break;
}
