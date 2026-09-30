// r02-desc.mjs — research track 2: print an App Store page's description and "What's New"
// text from a page already saved by fetch.mjs. Local file only; no network.
import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const words = (process.argv[3] || '').split(',').filter(Boolean);
// The page embeds JSON; descriptions sit in "paragraphText" / "text" strings.
const strs = [];
for (const m of html.matchAll(/"(?:paragraphText|text|description)":"((?:[^"\\]|\\.){80,})"/g)) {
  let s; try { s = JSON.parse('"' + m[1] + '"'); } catch { continue; }
  if (!strs.includes(s)) strs.push(s);
}
for (const s of strs.slice(0, 6)) console.log('---\n' + s.slice(0, 2500));
if (words.length) {
  console.log('=== keyword hits');
  for (const w of words) {
    const re = new RegExp('.{0,120}' + w + '.{0,160}', 'gi');
    const hits = [...new Set(strs.join('\n').match(re) || [])].slice(0, 4);
    console.log('#', w, hits.length); hits.forEach(h => console.log('  ', h.replace(/\s+/g, ' ')));
  }
}
