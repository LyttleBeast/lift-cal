// gf08-iafind.mjs — Internet Archive advancedsearch (archive.org, a §14 host).
// Usage: node gf08-iafind.mjs "<lucene query>" [rows]
const [q, rows = '50'] = process.argv.slice(2);
const fl = ['identifier', 'title', 'date', 'year', 'creator', 'publisher', 'collection', 'possible-copyright-status', 'rights', 'licenseurl', 'imagecount', 'mediatype'];
const u = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&${fl.map(f => 'fl[]=' + f).join('&')}&rows=${rows}&output=json&sort[]=year+asc`;
if (!new URL(u).hostname.endsWith('archive.org')) throw new Error('host');
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
const j = JSON.parse(await r.text());
console.log(`== ${q}: ${j.response?.numFound}`);
for (const d of j.response?.docs || []) {
  const col = [].concat(d.collection || []).slice(0, 3).join(',');
  console.log(`${d.identifier} | ${d.year || d.date || ''} | ${String(d.title).slice(0, 90)} | ${String(d.creator || '').slice(0, 40)} | ${String(d.publisher || '').slice(0, 40)} | ${col} | pcs:${d['possible-copyright-status'] || ''} | ${String(d.rights || d.licenseurl || '').slice(0, 60)} | ${d.imagecount || ''} | ${d.mediatype}`);
}
