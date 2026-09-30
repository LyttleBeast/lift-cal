// 08a-iaprev.mjs — save IA BookReader page previews (archive.org only) to research/scratch-08a for study.
// Usage: node 08a-iaprev.mjs <identifier> <width> <n> [<n>...]   (n = page index as IA's page/n<N> uses)
import { writeFileSync } from 'node:fs';
const SCR = '/Users/micahflunker/dev/vibes-night/research/scratch-08a';
const [id, w, ...ns] = process.argv.slice(2);
for (const n of ns) {
  const u = `https://archive.org/download/${encodeURIComponent(id)}/page/n${n}_w${w}.jpg`;
  let res, cur = u;
  for (let hop = 0; hop < 6; hop++) {
    if (!new URL(cur).hostname.endsWith('archive.org')) { console.log('REFUSED host', cur); break; }
    res = await fetch(cur, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
    if (res.status >= 300 && res.status < 400) { cur = new URL(res.headers.get('location'), cur).href; continue; }
    break;
  }
  if (!res?.ok) { console.log('fail', n, res?.status, cur); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const out = `${SCR}/ia-${id.slice(0, 12)}-n${n}.jpg`;
  writeFileSync(out, buf);
  console.log(out, buf.length);
}
