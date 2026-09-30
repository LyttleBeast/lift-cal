// r3-shots.mjs — track 3 research helper: list iPhone screenshot URLs in a saved App Store page.
// Usage: node r3-shots.mjs <saved.html>
import { readFileSync } from 'node:fs';
const html = readFileSync(process.argv[2], 'utf8');
const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
console.log('TITLE', title);
const urls = new Set();
const re = /https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^"'\s)]+?\/[0-9]+x[0-9]+[a-z]*\.(?:png|jpg|webp)/g;
for (const m of html.matchAll(re)) urls.add(m[0]);
// group by the path before the size suffix
const byBase = new Map();
for (const u of urls) {
  const base = u.replace(/\/[0-9]+x[0-9]+[a-z]*\.(png|jpg|webp)$/, '');
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(u);
}
let i = 0;
for (const [base, list] of byBase) {
  const big = list.sort((a, b) => {
    const s = x => { const m = x.match(/\/([0-9]+)x([0-9]+)/); return +m[1] * +m[2]; };
    return s(b) - s(a);
  })[0];
  console.log(String(i++).padStart(2, '0'), big);
}
