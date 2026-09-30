// gf08-tiletext.mjs — OCR text of Chronicling America pages straight from tile.loc.gov text-services
// (150/min limit; separate from the www.loc.gov JSON API). Input: IIIF service ids as printed by gf08-ca.mjs
// (service:ndnp:...:0408). Prints snippets around a regex. Throttled to one request per 700 ms; stops on 429.
// Usage: node gf08-tiletext.mjs <regex> <ctx> <service-id> [<service-id> ...]
const [pat, ctxA, ...ids] = process.argv.slice(2);
const ctx = Number(ctxA);
const sleep = ms => new Promise(s => setTimeout(s, ms));
for (const id of ids) {
  const seg = '/' + id.replace(/^service:/, 'service:').split(':').join('/') + '.xml';
  const u = `https://tile.loc.gov/text-services/word-coordinates-service?segment=${seg}&format=alto_xml&full_text=1`;
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
  if (r.status === 429) { console.log('429 — stop'); process.exit(9); }
  let t = await r.text();
  try { const o = JSON.parse(t); t = Object.values(o).map(v => v?.full_text || '').join(' '); } catch {}
  t = t.replace(/\s+/g, ' ');
  console.log(`\n# ${id} (HTTP ${r.status}, ${t.length} chars)`);
  const re = new RegExp(pat, 'gi'); let m, n = 0;
  while ((m = re.exec(t)) && n < 4) { n++; console.log('   ~ ' + t.slice(Math.max(0, m.index - ctx), m.index + ctx)); }
  await sleep(700);
}
