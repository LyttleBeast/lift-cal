// gf08-casnip.mjs — Chronicling America (loc.gov) search, then print an OCR snippet per page hit.
// One search request only (loc.gov JSON API allows 20/min, 1-hour block on excess);
// the OCR comes from tile.loc.gov text-services (150/min), derived from each hit's image_url,
// and is throttled to one request per 600 ms.
// Usage: node gf08-casnip.mjs "query" "YYYY/YYYY" [count] [regex] [ctx] [page]
const [q, dates = '', c = '25', pat = '', ctxArg = '160', sp = '1'] = process.argv.slice(2);
const ctx = Number(ctxArg);
const ua = { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } };
const sleep = ms => new Promise(s => setTimeout(s, ms));
async function get(u, asText) {
  if (!new URL(u).hostname.endsWith('loc.gov')) throw new Error('host ' + u);
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(u, ua);
      if (r.status === 429) { console.log('429 — stop'); process.exit(9); }
      if (!r.ok) return null;
      return asText ? await r.text() : JSON.parse(await r.text());
    } catch (e) { await sleep(2000); }
  }
  return null;
}
let u = `https://www.loc.gov/collections/chronicling-america/?q=${encodeURIComponent(q)}&fo=json&c=${c}&sp=${sp}&at=results,pagination`;
if (dates) u += `&dates=${dates}`;
const j = await get(u);
if (!j) { console.log('search failed', u); process.exit(1); }
console.log(`== ${q} [${dates}] ${j.pagination?.of} total; page ${sp}`);
const re = new RegExp(pat || q.replace(/"/g, '').split(' ')[0], 'gi');
for (const x of j.results || []) {
  const page = (x.id || x.url).replace('http://', 'https://');
  const title = String((x.partof_title || x.title || [''])[0] || '').slice(0, 40);
  const img = (x.image_url || [])[0] || '';
  const m0 = img.match(/iiif\/(service:ndnp:[^/]+)\/full/);
  let t = '';
  if (m0) {
    const seg = '/' + m0[1].split(':').join('/') + '.xml';
    await sleep(600);
    t = await get(`https://tile.loc.gov/text-services/word-coordinates-service?segment=${seg}&format=alto_xml&full_text=1`, true) || '';
    if (t.trim().startsWith('{')) { try { const o = JSON.parse(t); t = Object.values(o).map(v => v?.full_text || '').join(' '); } catch {} }
  }
  t = t.replace(/\s+/g, ' ');
  const snips = [];
  let m; re.lastIndex = 0;
  while ((m = re.exec(t)) && snips.length < 2) snips.push(t.slice(Math.max(0, m.index - ctx), m.index + ctx));
  console.log(`\n# ${x.date} | ${title} | ${page}\n   img ${m0 ? m0[1] : '-'}`);
  for (const s of snips) console.log('   ~ ' + s);
}
