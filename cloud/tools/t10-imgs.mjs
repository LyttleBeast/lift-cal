// t10-imgs.mjs — track 10 research helper. Lists <img>/<source> URLs (with alt text)
// in a saved HTML page, optionally filtered by a regex.
// Usage: node t10-imgs.mjs <saved.html> [filter]
import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const f = process.argv[3] ? new RegExp(process.argv[3], 'i') : null;
const re = /<(img|source)\b[^>]*>/gi;
for (const m of html.matchAll(re)) {
  const tag = m[0];
  const src = (tag.match(/\s(?:src|srcset|data-src)="([^"]+)"/i) || [])[1];
  const alt = (tag.match(/\salt="([^"]*)"/i) || [])[1] || '';
  if (!src) continue;
  if (f && !f.test(src + ' ' + alt)) continue;
  console.log(src.split(' ')[0], '|', alt);
}
