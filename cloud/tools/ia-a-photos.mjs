// Iron Age A: the photo candidates' key fields from the draft provenance (read-only).
import fs from 'node:fs';
const P = '/Users/micahflunker/dev/vibes-night/research/iron-age/PROVENANCE.photos.draft.json';
const raw = JSON.parse(fs.readFileSync(P, 'utf8'));
const list = Array.isArray(raw) ? raw : (raw.entries || raw.items || Object.values(raw));
const want = process.argv.slice(2);
for (const e of list) {
  const id = e.file || e.slug || e.id;
  if (want.length && !want.some(w => String(id).includes(w))) continue;
  const pick = k => e[k] === undefined ? '' : (typeof e[k] === 'object' ? JSON.stringify(e[k]) : String(e[k]));
  console.log(`== ${id} | tier ${pick('tier')} conf ${pick('confidence')} | dims ${pick('dims')} | medium ${pick('medium')}`);
  console.log(`   title: ${pick('title').slice(0, 110)}`);
  console.log(`   creator ${pick('creator').slice(0, 60)} died ${pick('creator_died')} | published ${pick('first_published').slice(0, 90)}`);
  console.log(`   focal ${pick('focal')} crop_hint ${pick('crop_hint')} | hero_crops ${pick('hero_crops').slice(0, 160)}`);
  console.log(`   clothing ${pick('clothing_check').slice(0, 110)} | source ${pick('source_url')}`);
  if (e.notes) console.log(`   notes: ${pick('notes').slice(0, 260)}`);
}
console.log('entries:', list.length, 'keys of first:', Object.keys(list[0]).join(','));
