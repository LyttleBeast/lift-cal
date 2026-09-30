// 08a-ia.mjs — print an Internet Archive item's metadata (archive.org only, a §14 host) and its main files.
// Usage: node 08a-ia.mjs <identifier> [...]
import { writeFileSync } from 'node:fs';
const SCR = '/Users/micahflunker/dev/vibes-night/research/scratch-08a';
for (const id of process.argv.slice(2)) {
  const u = `https://archive.org/metadata/${encodeURIComponent(id)}`;
  if (!new URL(u).hostname.endsWith('archive.org')) throw new Error('host');
  const j = await (await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } })).json();
  writeFileSync(`${SCR}/ia-${id}.json`, JSON.stringify(j));
  const m = j.metadata || {};
  const pick = ['identifier', 'title', 'creator', 'date', 'year', 'publisher', 'contributor', 'sponsor', 'scanningcenter', 'possible-copyright-status', 'rights', 'licenseurl', 'imagecount', 'ppi', 'source', 'description', 'language', 'call_number', 'collection', 'camera', 'scandate'];
  console.log('==', id);
  for (const k of pick) if (m[k] !== undefined) console.log(`  ${k}:`, String(JSON.stringify(m[k])).slice(0, 400));
  const files = (j.files || []).filter(f => /jp2\.zip$|\.pdf$|_tif\.zip$|\.tar$|_jpg\.zip$|_orig_jp2\.tar$/i.test(f.name));
  for (const f of files) console.log('   file:', f.name, f.size, f.format);
  console.log('  server:', j.server, j.dir);
}
