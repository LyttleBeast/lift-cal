// iameta.mjs — summarise an Internet Archive metadata JSON (research track 7).
// Usage: node iameta.mjs <meta.json> [...]
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const m = j.metadata || {};
  const pick = k => (m[k] === undefined ? '' : (Array.isArray(m[k]) ? m[k].join(' | ') : String(m[k])));
  console.log('==', f.split('/').pop());
  for (const k of ['identifier', 'title', 'creator', 'date', 'publisher', 'scanner', 'scanningcenter', 'contributor', 'sponsor', 'possible-copyright-status', 'licenseurl', 'rights', 'imagecount', 'ppi', 'camera', 'collection']) {
    const v = pick(k); if (v) console.log(`  ${k}: ${v.slice(0, 200)}`);
  }
  const files = (j.files || []).filter(x => !/_meta|_files\.xml|\.sqlite|_archive\.torrent/.test(x.name));
  for (const x of files.slice(0, 40)) console.log(`   - ${x.name} [${x.format}] ${x.size || ''}`);
  if (files.length > 40) console.log(`   ... ${files.length - 40} more`);
}
