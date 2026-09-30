// locitem.mjs — summarise a loc.gov item JSON (?fo=json): title, date, creator, rights, image URLs.
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const it = j.item || {};
  console.log('==', f.split('/').pop());
  for (const k of ['title', 'date', 'created_published', 'contributor_names', 'medium', 'rights_advisory', 'notes', 'call_number', 'reproduction_number']) {
    const v = it[k]; if (v) console.log(`  ${k}: ${JSON.stringify(v).slice(0, 400)}`);
  }
  const urls = new Set();
  for (const r of (j.resources || [])) for (const fl of (r.files || []).flat()) if (fl && fl.url) urls.add(`${fl.url} ${fl.width || ''}x${fl.height || ''} ${fl.mimetype || ''}`);
  [...urls].slice(0, 12).forEach(u => console.log('   - ' + u));
}
