// t10-dl.mjs — track 10 research helper. Downloads the first N iPhone screenshots
// of a saved App Store page through fetch.mjs (so §14's host list still applies),
// at a small width for study only. Writes a SOURCES.txt line per file.
// Usage: node t10-dl.mjs <saved.html> <prefix> <from> <to> [width]
import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const [page, prefix, from, to, width = '400'] = process.argv.slice(2);
const html = readFileSync(page, 'utf8');
const re = /https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/PurpleSource[^"'\s,)]+?\.(?:png|jpg|jpeg)\/[^"'\s,)]*/g;
const bases = [];
for (const m of html.matchAll(re)) {
  const base = m[0].replace(/\/[^/]*$/, '');
  if (!bases.includes(base)) bases.push(base);
}
const dir = '/Users/micahflunker/dev/vibes-night/research/refs/10';
for (let i = Number(from); i <= Number(to) && i < bases.length; i++) {
  const url = `${bases[i]}/${width}x0w.png`;
  const out = `${dir}/${prefix}-${String(i).padStart(2, '0')}.png`;
  try {
    const r = execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', url, out]).toString();
    appendFileSync(`${dir}/SOURCES.txt`, `${out.split('/').pop()}\t${url}\n`);
    console.log(i, JSON.parse(r).bytes);
  } catch (e) { console.log(i, 'FAIL', String(e.stdout || e.message).slice(0, 200)); }
}
