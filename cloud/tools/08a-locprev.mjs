// 08a-locprev.mjs — save a small study preview (largest listed service JPEG, else the 640px 'r' JPEG) of each
// saved LoC item into research/scratch-08a/prev-<id>-<n>.jpg. Scratch only; never an asset.
import { readFileSync, writeFileSync } from 'node:fs';
const SCR = '/Users/micahflunker/dev/vibes-night/research/scratch-08a';
for (const id of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(`${SCR}/loc-${id}.json`, 'utf8'));
  let n = 0;
  for (const r of (j.resources || [])) {
    const all = (r.files || []).flat();
    let jp = all.filter(x => x.mimetype === 'image/jpeg').sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    let url = jp?.url;
    if (!url) {
      const tif = all.find(x => x.mimetype === 'image/tiff');
      if (tif) url = tif.url.replace('/master/', '/service/').replace(/u\.tif$/, 'r.jpg');
    }
    if (!url || !new URL(url).hostname.endsWith('loc.gov')) { console.log('no preview', id); continue; }
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
    if (!res.ok) { console.log('fail', id, res.status, url); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const out = `${SCR}/prev-${id}-${n++}.jpg`;
    writeFileSync(out, buf);
    console.log(out, buf.length, url);
  }
}
