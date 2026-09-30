// 08a-locsearch.mjs — search LoC photos (loc.gov only, a §14 host) and print id, date, title, rights head.
// Usage: node 08a-locsearch.mjs "query" [count] [extra-params]
const [q, c = '40', extra = ''] = process.argv.slice(2);
const u = `https://www.loc.gov/photos/?q=${encodeURIComponent(q)}&fo=json&c=${c}${extra}`;
if (!new URL(u).hostname.endsWith('loc.gov')) throw new Error('host');
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
const j = await r.json();
console.log(`== ${q}: ${j.pagination?.of} total`);
for (const x of j.results || []) {
  const rights = (x.item?.rights_advisory || x.rights || x.item?.rights || '');
  console.log(`${(x.id || '').replace('http://www.loc.gov/item/', '').replace('https://www.loc.gov/item/', '')} | ${x.date || ''} | ${(x.title || '').slice(0, 150)} | ${String(rights).slice(0, 50)} | ${(x.partof || []).filter(p => typeof p === 'string').slice(0, 2).join(';')}`);
}
