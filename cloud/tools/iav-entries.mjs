// iav-entries.mjs — list research/iron-age/PROVENANCE.engravings.draft.json entries, 1-based (#n)
import fs from 'fs';
const j = JSON.parse(fs.readFileSync('/Users/micahflunker/dev/vibes-night/research/iron-age/PROVENANCE.engravings.draft.json', 'utf8'));
const want = process.argv.slice(2).map(Number);
j.entries.forEach((e, i) => {
  if (want.length && !want.includes(i + 1)) return;
  console.log('#' + (i + 1), e.file.replace('originals/', ''), e.dims, JSON.stringify(e.crop), '|', e.title);
  if (want.length) console.log('   ', e.traceability, '\n    notes:', e.notes, '\n    src:', e.source_url, '\n    creator:', e.creator, '|', e.creator_died);
});
