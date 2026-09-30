// gf8r-ia.mjs — critic-round gap fill (08a/09). Internet Archive advancedsearch (a §14 host).
// Usage: node gf8r-ia.mjs "<lucene query>" [rows]
const [q, rows = '50'] = process.argv.slice(2);
const fl = ['identifier', 'title', 'date', 'year', 'creator', 'publisher', 'mediatype', 'collection', 'possible-copyright-status', 'rights', 'licenseurl'];
const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&${fl.map(f => 'fl[]=' + f).join('&')}&rows=${rows}&output=json`;
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
const j = await r.json();
console.log('HTTP', r.status, 'numFound', j.response?.numFound, u);
for (const d of j.response?.docs || []) {
  const s = v => Array.isArray(v) ? v.join('; ') : (v ?? '');
  console.log(`- ${d.identifier} | ${s(d.title).slice(0, 90)} | ${s(d.date || d.year).slice(0, 10)} | ${s(d.creator).slice(0, 40)} | ${s(d.publisher).slice(0, 40)} | ${d.mediatype} | ${s(d.collection).slice(0, 60)} | pcs=${s(d['possible-copyright-status'])} | rights=${s(d.rights).slice(0, 60)} ${s(d.licenseurl)}`);
}
