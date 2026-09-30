// iafts8b.mjs — track 8b: Internet Archive full-text (inside books) search across items (archive.org only, V59 §14).
// Usage: node iafts8b.mjs '"kettle bell"' [hits]
const q = process.argv[2];
const n = process.argv[3] || 40;
const u = new URL('https://archive.org/services/search/beta/page_production/');
u.searchParams.set('service_backend', 'fts');
u.searchParams.set('user_query', q);
u.searchParams.set('hits_per_page', n);
u.searchParams.set('page', '1');
const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 vibes-night research' } });
const t = await r.text();
let j; try { j = JSON.parse(t); } catch { console.log('non-JSON', r.status, t.slice(0, 400)); process.exit(1); }
const hits = j?.response?.body?.hits?.hits || [];
console.log(`status ${r.status} total ${j?.response?.body?.hits?.total} shown ${hits.length}`);
for (const h of hits) {
  const f = h.fields || {};
  const hl = (h.highlight && (h.highlight.text || [])[0]) || '';
  console.log(`${f.identifier} | ${String(f.title).slice(0, 90)} | ${f.date || f.year || ''} | ${String(f.creator || '').slice(0, 40)} :: ${String(hl).replace(/\s+/g, ' ').slice(0, 140)}`);
}
