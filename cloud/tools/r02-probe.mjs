// r02-probe.mjs — research track 2: look inside a saved App Store page for screenshot URLs.
// Reads a local file only; no network.
import { readFileSync } from 'node:fs';
const f = process.argv[2];
const html = readFileSync(f, 'utf8');
const re = /https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^"'\s)\\,]+/g;
const all = html.match(re) || [];
const uniq = [...new Set(all)];
console.log('total', all.length, 'unique', uniq.length);
// group by base (strip final size segment)
const bases = new Map();
for (const u of uniq) {
  const i = u.lastIndexOf('/');
  const base = u.slice(0, i);
  if (!bases.has(base)) bases.set(base, []);
  bases.get(base).push(u.slice(i + 1));
}
let n = 0;
for (const [b, sizes] of bases) {
  if (n++ > 60) break;
  console.log(b.slice(-90), '|', sizes.slice(0, 4).join(' '));
}
// look for key words near screenshots
for (const k of ['customAttributes', 'screenshots', 'iphone_d73', 'iphone_6_5', 'iphone67', 'iphone_d74', '"platform"', 'mediaType']) {
  const i = html.indexOf(k);
  console.log(k, i, i >= 0 ? html.slice(i, i + 200).replace(/\s+/g, ' ') : '');
}
