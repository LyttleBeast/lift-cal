// gf8r-caocr.mjs — critic-round gap fill (08a/09). Chronicling America search via loc.gov (a §14 host), then the
// OCR text of each hit page from tile.loc.gov text-services, printing snippets around a regex. Throttled.
// Only pages whose OCR matches the regex are printed (compact).
// Usage: node gf8r-caocr.mjs "query" "YYYY-MM-DD/YYYY-MM-DD" <count> <regex> [ctx] [page] [flags]
//   flags: regex flags, default "gi"; pass "g" for case-sensitive (captions are often in capitals).
const [q, dates, c = '20', pat, ctxA = '160', sp = '1', flags = 'gi'] = process.argv.slice(2);
const ctx = Number(ctxA);
const sleep = ms => new Promise(s => setTimeout(s, ms));
const UA = { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } };
let u = `https://www.loc.gov/collections/chronicling-america/?q=${encodeURIComponent(q)}&fo=json&c=${c}&sp=${sp}`;
if (dates) u += `&dates=${dates}`;
let j;
for (let i = 0; i < 4 && !j; i++) {
  try { const r = await fetch(u, UA); if (r.ok) j = JSON.parse(await r.text()); else { console.log('HTTP', r.status); await sleep(4000); } }
  catch (e) { console.log('ERR', e.cause?.code || e.message); await sleep(4000); }
}
if (!j) process.exit(1);
console.log(`== ${q} [${dates}] ${j.pagination?.of} total, page ${sp}, ${(j.results || []).length} hits; showing matches of /${pat}/${flags}`);
let shown = 0;
for (const x of j.results || []) {
  const img = (x.image_url || [])[0] || '';
  const m = img.match(/iiif\/(service:[^/]+)\//);
  if (!m) continue;
  const id = m[1];
  const seg = '/' + id.split(':').join('/') + '.xml';
  const tu = `https://tile.loc.gov/text-services/word-coordinates-service?segment=${seg}&format=alto_xml&full_text=1`;
  let t = '';
  for (let k = 0; k < 2 && !t; k++) {
    try {
      const r = await fetch(tu, UA);
      if (r.status === 429) { console.log('429 — stop'); process.exit(9); }
      t = await r.text();
      try { const o = JSON.parse(t); t = Object.values(o).map(v => v?.full_text || '').join(' '); } catch {}
    } catch (e) { await sleep(2000); }
  }
  t = t.replace(/\s+/g, ' ');
  const re = new RegExp(pat, flags); let mm, n = 0; const out = [];
  while ((mm = re.exec(t)) && n < 2) { n++; out.push('   ~ ' + t.slice(Math.max(0, mm.index - ctx), mm.index + ctx)); }
  if (out.length) {
    shown++;
    const title = String(Array.isArray(x.partof_title) ? x.partof_title[0] : (x.partof_title || x.title || '')).slice(0, 40);
    console.log(`\n# ${x.date} | ${title} | ${x.id}\n   iiif ${id}\n${out.join('\n')}`);
  }
  await sleep(700);
}
console.log(`\n(${shown} pages matched)`);
