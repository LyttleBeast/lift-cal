// iameta8b.mjs — track 8b: print an Internet Archive item's key metadata.
// Only talks to archive.org (V59 §14 asset host). Saves raw JSON under research/iron-age/scratch-08b.
// Usage: node iameta8b.mjs <identifier> [more identifiers...]
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = '/Users/micahflunker/dev/vibes-night/research/iron-age/scratch-08b';
mkdirSync(OUT, { recursive: true });
for (const id of process.argv.slice(2)) {
  const url = `https://archive.org/metadata/${encodeURIComponent(id)}`;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 vibes-night research' } });
    const j = await r.json();
    writeFileSync(`${OUT}/meta-${id}.json`, JSON.stringify(j, null, 1));
    const m = j.metadata || {};
    const pick = k => (Array.isArray(m[k]) ? m[k].join(' | ') : m[k]);
    console.log('=== ' + id + '  status ' + r.status);
    for (const k of ['title', 'creator', 'date', 'year', 'publisher', 'volume', 'contributor', 'sponsor',
      'collection', 'rights', 'possible-copyright-status', 'licenseurl', 'imagecount', 'ppi', 'scanner',
      'access-restricted-item', 'identifier-bib', 'call_number', 'mediatype', 'description', 'notes']) {
      if (m[k] !== undefined) console.log(`  ${k}: ${String(pick(k)).slice(0, 400)}`);
    }
    const files = (j.files || []).filter(f => /\.(zip|pdf|tar|jp2)$/i.test(f.name) || /scandata|page_numbers/i.test(f.name));
    for (const f of files) console.log(`  file: ${f.name}  ${f.size || ''} ${f.format || ''}`);
    console.log(`  server: ${j.server} dir: ${j.dir}`);
  } catch (e) { console.log('=== ' + id + ' ERR ' + e.message); }
}
