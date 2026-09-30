// gf8r-ca.mjs — critic-round gap fill (08a/09). Search Chronicling America through the loc.gov JSON API
// (a §14 host). Prints: date | paper | page id | first image url | OCR snippet around the query words.
// Usage: node gf8r-ca.mjs "query" "YYYY-MM-DD/YYYY-MM-DD" [count] [snippet-regex] [extra-params]
const [q, dates = '', c = '25', pat = '', extra = ''] = process.argv.slice(2);
let u = `https://www.loc.gov/collections/chronicling-america/?q=${encodeURIComponent(q)}&fo=json&c=${c}${extra}`;
if (dates) u += `&dates=${dates}`;
if (!new URL(u).hostname.endsWith('loc.gov')) throw new Error('host');
let j, lastErr;
for (let i = 0; i < 4 && !j; i++) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
    if (!r.ok) { lastErr = 'HTTP ' + r.status; await new Promise(s => setTimeout(s, 3000)); continue; }
    j = JSON.parse(await r.text());
  } catch (e) { lastErr = String(e.cause?.code || e.message); await new Promise(s => setTimeout(s, 3000)); }
}
if (!j) { console.log('FAILED', lastErr, u); process.exit(1); }
console.log(`== ${q} [${dates}]: ${j.pagination?.of} total  (${u})`);
for (const x of j.results || []) {
  const img = (x.image_url || [])[0] || '';
  const title = (x.partof_title || x.title || '');
  console.log(`\n${x.date || ''} | ${String(Array.isArray(title) ? title[0] : title).slice(0, 60)} | ${x.id || x.url}`);
  console.log(`   img ${img.slice(0, 200)}`);
  const d = Array.isArray(x.description) ? x.description.join(' ') : String(x.description || '');
  const t = d.replace(/\s+/g, ' ');
  if (pat) {
    const re = new RegExp(pat, 'gi'); let m, n = 0;
    while ((m = re.exec(t)) && n < 3) { n++; console.log('   ~ ' + t.slice(Math.max(0, m.index - 160), m.index + 220)); }
  } else console.log('   ~ ' + t.slice(0, 300));
}
