// gf08-caold.mjs — one probe of the legacy Chronicling America search API (chroniclingamerica.loc.gov, a loc.gov
// subdomain, so a §14 host). Prints status and, if JSON, the hits (date | title | id) with an OCR snippet.
// Usage: node gf08-caold.mjs "<andtext>" <date1 MM/DD/YYYY> <date2> [rows] [phrase]
const [and, d1, d2, rows = '20', phrase = ''] = process.argv.slice(2);
const u = `https://chroniclingamerica.loc.gov/search/pages/results/?dateFilterType=range&date1=${encodeURIComponent(d1)}&date2=${encodeURIComponent(d2)}&andtext=${encodeURIComponent(and)}&phrasetext=${encodeURIComponent(phrase)}&rows=${rows}&searchType=advanced&format=json`;
const r = await fetch(u, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
console.log('HTTP', r.status, r.headers.get('location') || '', r.headers.get('content-type'));
const t = await r.text();
if (!/json/.test(r.headers.get('content-type') || '')) { console.log(t.slice(0, 300)); process.exit(0); }
const j = JSON.parse(t);
console.log('total', j.totalItems);
for (const it of j.items || []) {
  const ocr = (it.ocr_eng || '').replace(/\s+/g, ' ');
  const k = ocr.toLowerCase().indexOf((phrase || and.split(' ')[0]).toLowerCase());
  console.log(`\n# ${it.date} | ${String(it.title).slice(0, 50)} | seq ${it.sequence} | https://chroniclingamerica.loc.gov${it.id}`);
  if (k >= 0) console.log('   ~ ' + ocr.slice(Math.max(0, k - 200), k + 250));
}
