// 08a-iasearch.mjs — search inside an IA book's OCR (archive.org only) and print page hits.
// Usage: node 08a-iasearch.mjs <identifier> <server> <dir> "<query>" ["<query>"...]
const [id, server, dir, ...qs] = process.argv.slice(2);
for (const q of qs) {
  const u = `https://${server}/fulltext/inside.php?item_id=${encodeURIComponent(id)}&doc=${encodeURIComponent(id)}&path=${encodeURIComponent(dir)}&q=${encodeURIComponent(q)}`;
  if (!new URL(u).hostname.endsWith('archive.org')) throw new Error('host');
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { console.log('== ', q, 'non-JSON', t.slice(0, 200)); continue; }
  console.log(`== ${q}: ${j.matches?.length || 0} hits`);
  for (const m of (j.matches || []).slice(0, 25)) {
    const pages = [...new Set((m.par || []).map(p => p.page))];
    console.log('  p', pages.join(','), '|', (m.text || '').replace(/\s+/g, ' ').slice(0, 160));
  }
}
