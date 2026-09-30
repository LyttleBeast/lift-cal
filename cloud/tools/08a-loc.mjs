// 08a-loc.mjs — summarise a saved LoC item JSON (?fo=json) for Track 8a.
// Usage: node 08a-loc.mjs <file.json> [...]
import { readFileSync } from 'node:fs';
for (const f of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const it = j.item || {};
  const out = {
    file: f.split('/').pop(),
    title: it.title,
    date: it.date, created_published: it.created_published,
    creator: it.creator || it.contributors || it.contributor_names,
    rights: it.rights_advisory || it.rights, rights_info: j.item && j.item.rights_information,
    call_number: it.call_number, reproduction_number: it.reproduction_number,
    medium: it.medium, notes: it.notes, summary: it.summary,
    repository: it.repository, source_collection: it.source_collection,
    id: it.id, library_of_congress_control_number: it.library_of_congress_control_number,
  };
  console.log(JSON.stringify(out, null, 1));
  const res = j.resources || [];
  for (const r of res) {
    console.log('RESOURCE', r.url || '', r.image || '');
    for (const fl of (r.files || [])) for (const x of fl) {
      console.log('  ', x.mimetype, x.width || '', 'x', x.height || '', x.size || '', x.url);
    }
  }
}
