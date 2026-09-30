// gf08-download.mjs — gap-fill (critic round) downloads for Track 8a, through the night's only downloader
// (fetch.mjs, §14 hosts). Appends each result to research/scratch-gf08/downloads.jsonl. Skips files present.
import { execFileSync } from 'node:child_process';
import { existsSync, appendFileSync, mkdirSync } from 'node:fs';
const OUT = '/Users/micahflunker/dev/vibes-night/research/iron-age/originals';
const LOG = '/Users/micahflunker/dev/vibes-night/research/scratch-gf08/downloads.jsonl';
mkdirSync('/Users/micahflunker/dev/vibes-night/research/scratch-gf08', { recursive: true });
const AND = 'https://archive.org/download/andersonsphysica00andeiala/andersonsphysica00andeiala_jp2.zip/andersonsphysica00andeiala_jp2%2Fandersonsphysica00andeiala_';
export const list = [
  ['anderson-pulleys-woman-front-1897.jp2', `${AND}0032.jp2`],
  ['anderson-pulleys-woman-bend-1897.jp2', `${AND}0033.jp2`],
  ['anderson-pulleys-man-front-1897.jp2', `${AND}0062.jp2`],
  ['anderson-pulleys-man-back-1897.jp2', `${AND}0063.jp2`],
  ['anderson-pulleys-man-lunge-1897.jp2', `${AND}0100.jp2`],
  ['anderson-pulleys-man-spread-1897.jp2', `${AND}0101.jp2`],
  ...(process.env.EXTRA ? JSON.parse(process.env.EXTRA) : []),
];
const only = process.argv.slice(2);
for (const [name, url] of list) {
  if (only.length && !only.includes(name)) continue;
  const out = `${OUT}/${name}`;
  if (existsSync(out)) { console.log('have', name); continue; }
  for (let a = 0; a < 3; a++) {
    try {
      const r = execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', url, out], { encoding: 'utf8', maxBuffer: 1 << 20, timeout: 900000 });
      appendFileSync(LOG, JSON.stringify({ name, ...JSON.parse(r.trim()), retrieved: new Date().toISOString() }) + '\n');
      console.log('ok', name, r.trim().slice(0, 220));
      break;
    } catch (e) { console.log('retry', name, a, String(e.stdout || e.message).slice(0, 200)); }
  }
}
console.log('done');
