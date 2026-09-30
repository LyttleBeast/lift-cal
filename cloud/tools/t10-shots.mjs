// t10-shots.mjs — track 10 research helper. Lists the iPhone screenshot URLs
// and description snippets (theme / icon / appearance) in a saved App Store page.
// Usage: node t10-shots.mjs <saved.html>
import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const re = /https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^"'\s,)]+?\.(?:png|jpg|jpeg)\/[^"'\s,)]*/g;
const seen = new Map();
for (const m of html.matchAll(re)) {
  const u = m[0];
  const base = u.replace(/\/[^/]*$/, '');
  if (!seen.has(base)) seen.set(base, u);
}
console.log('screens:', seen.size);
for (const [base, u] of seen) console.log(base);
// description snippets
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const words = /(theme|icon|appearance|color|colour|dark mode|customi[sz])/gi;
const out = new Set();
for (const m of text.matchAll(words)) {
  const s = Math.max(0, m.index - 160), e = Math.min(text.length, m.index + 200);
  out.add(text.slice(s, e));
  if (out.size > 25) break;
}
console.log('--- snippets ---');
for (const s of out) console.log('*', s);
