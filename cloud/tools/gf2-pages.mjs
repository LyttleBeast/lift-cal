// gf2-pages.mjs — 08b gap-fill resume: IA inside-book OCR search (archive.org only, V59 §14), reporting only
// the hits whose OCR text contains EVERY word of the query (inside.php ORs them), grouped by leaf.
// Usage: node gf2-pages.mjs <identifier> '<query>' [minLeaf] [maxLeaf]
const [id, q, lo = 0, hi = 1e9] = process.argv.slice(2);
const meta = await (await fetch(`https://archive.org/metadata/${id}`)).json();
const djvu = (meta.files || []).find(f => /_djvu\.xml$/.test(f.name));
const doc = djvu ? djvu.name.replace(/_djvu\.xml$/, '') : id;
const u = new URL(`https://${meta.server}/fulltext/inside.php`);
u.searchParams.set('item_id', id); u.searchParams.set('doc', doc); u.searchParams.set('path', meta.dir); u.searchParams.set('q', q);
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 vibes-night research' } });
const j = JSON.parse(await r.text());
const words = q.toLowerCase().split(/[\s-]+/).filter(Boolean);
const by = new Map();
for (const m of j.matches || []) {
  const p = m.par && m.par[0]; if (!p) continue;
  if (p.page < +lo || p.page > +hi) continue;
  const t = String(m.text).replace(/<\/?IA_FTS_MATCH>/g, '').replace(/\s+/g, ' ');
  const tl = t.toLowerCase();
  if (!words.every(w => tl.includes(w))) continue;
  const b = p.boxes && p.boxes[0];
  if (!by.has(p.page)) by.set(p.page, []);
  by.get(p.page).push(`y${b && b.t} :: ${t.slice(0, 150)}`);
}
console.log(`${id} q="${q}" all-word hits on ${by.size} leaves (of ${(j.matches || []).length} raw)`);
for (const [pg, arr] of [...by.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(`leaf ${pg}:`); for (const s of arr.slice(0, 4)) console.log('   ' + s);
}
