// iasearch8b.mjs — track 8b: Internet Archive advanced search (archive.org only, V59 §14).
// Usage: node iasearch8b.mjs '<lucene query>' [rows]
const q = process.argv[2];
const rows = process.argv[3] || 40;
const u = new URL('https://archive.org/advancedsearch.php');
u.searchParams.set('q', q);
for (const f of ['identifier', 'title', 'date', 'creator', 'publisher', 'imagecount', 'collection']) u.searchParams.append('fl[]', f);
u.searchParams.set('rows', rows);
u.searchParams.set('output', 'json');
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 vibes-night research' } });
const j = await r.json();
console.log('found ' + j.response.numFound);
for (const d of j.response.docs) {
  const c = Array.isArray(d.collection) ? d.collection.slice(0, 3).join(',') : d.collection;
  console.log(`${d.identifier} | ${String(d.title).slice(0, 110)} | ${d.date || ''} | ${String(d.creator || '').slice(0, 50)} | ${String(d.publisher || '').slice(0, 50)} | img ${d.imagecount || ''} | ${c}`);
}
