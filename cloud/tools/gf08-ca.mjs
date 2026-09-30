// gf08-ca.mjs — search Chronicling America through loc.gov (a §14 host) and print page hits.
// Usage: node gf08-ca.mjs "query" "YYYY-MM-DD/YYYY-MM-DD" [count] [extra-params]
// Prints: date | paper | page url | image url (if any)
const [q, dates = '', c = '25', extra = ''] = process.argv.slice(2);
let u = `https://www.loc.gov/collections/chronicling-america/?q=${encodeURIComponent(q)}&fo=json&c=${c}&at=results,pagination${extra}`;
if (dates) u += `&dates=${dates}`;
if (!new URL(u).hostname.endsWith('loc.gov')) throw new Error('host');
let j, lastErr;
for (let i = 0; i < 4 && !j; i++) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
    if (!r.ok) { lastErr = 'HTTP ' + r.status; continue; }
    j = JSON.parse(await r.text());
  } catch (e) { lastErr = String(e.cause?.code || e.message); await new Promise(s => setTimeout(s, 2000)); }
}
if (!j) { console.log('FAILED', lastErr, u); process.exit(1); }
console.log(`== ${q} [${dates}]: ${j.pagination?.of} total  (${u})`);
for (const x of j.results || []) {
  const img = (x.image_url || [])[0] || '';
  const title = (x.partof_title || x.title || '');
  console.log(`${x.date || ''} | ${String(Array.isArray(title) ? title[0] : title).slice(0, 60)} | ${x.id || x.url} | ${img.slice(0, 160)}`);
}
