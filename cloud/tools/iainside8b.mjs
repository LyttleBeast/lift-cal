// iainside8b.mjs — track 8b: search the OCR text inside an Internet Archive book (archive.org only, V59 §14).
// Prints each hit's leaf/page index and the OCR box, so an illustration's page can be found.
// Usage: node iainside8b.mjs <identifier> '<query>' [maxHits]
const [id, q, max = 30] = process.argv.slice(2);
const meta = await (await fetch(`https://archive.org/metadata/${id}`)).json();
const server = meta.server, dir = meta.dir;
// the doc name is the base of the _jp2.zip / _djvu.xml
const djvu = (meta.files || []).find(f => /_djvu\.xml$/.test(f.name));
const doc = djvu ? djvu.name.replace(/_djvu\.xml$/, '') : id;
const u = new URL(`https://${server}/fulltext/inside.php`);
u.searchParams.set('item_id', id); u.searchParams.set('doc', doc); u.searchParams.set('path', dir); u.searchParams.set('q', q);
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 vibes-night research' } });
const t = await r.text();
let j; try { j = JSON.parse(t); } catch { console.log('non-JSON', r.status, t.slice(0, 300)); process.exit(1); }
const ms = j.matches || [];
console.log(`${id} q=${q} hits=${ms.length}`);
for (const m of ms.slice(0, +max)) {
  const p = m.par && m.par[0];
  const b = p && p.boxes && p.boxes[0];
  console.log(`page ${p && p.page} (w${p && p.page_width} h${p && p.page_height}) box l${b && b.l} t${b && b.t} r${b && b.r} b${b && b.b} :: ${String(m.text).replace(/\s+/g, ' ').slice(0, 160)}`);
}
