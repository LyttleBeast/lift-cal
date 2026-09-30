// 08a-locitem.mjs — fetch LoC item JSON (loc.gov only) for each id, save to research/scratch-08a, print a summary.
// Usage: node 08a-locitem.mjs <lccn> [...]
import { writeFileSync } from 'node:fs';
const SCR = '/Users/micahflunker/dev/vibes-night/research/scratch-08a';
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const id of process.argv.slice(2)) {
  const u = `https://www.loc.gov/item/${id}/?fo=json`;
  if (!new URL(u).hostname.endsWith('loc.gov')) throw new Error('host');
  let j;
  for (let a = 0; a < 4; a++) {
    try { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } }); j = await r.json(); break; }
    catch (e) { await sleep(4000); }
  }
  if (!j) { console.log('FAILED', id); continue; }
  writeFileSync(`${SCR}/loc-${id}.json`, JSON.stringify(j));
  const it = j.item || {};
  console.log(`== ${id} | ${it.title}`);
  console.log('  date:', it.date, '| created_published:', JSON.stringify(it.created_published));
  console.log('  creator:', JSON.stringify(it.contributor_names || it.creator || it.contributors));
  console.log('  rights:', it.rights_advisory || it.rights_information);
  console.log('  call:', it.call_number, '| repro:', JSON.stringify(it.reproduction_number));
  console.log('  medium:', JSON.stringify(it.medium), '| collection:', it.source_collection);
  console.log('  notes:', String(JSON.stringify(it.notes)).slice(0, 900));
  if (!it.rights_advisory) console.log('  rights(other):', JSON.stringify(it.rights), JSON.stringify(j.item?.rights_information), JSON.stringify(it.access_advisory));
  for (const r of (j.resources || [])) {
    console.log('  RES', r.url);
    for (const fl of (r.files || [])) {
      const big = fl.filter(x => x.mimetype === 'image/tiff' || (x.mimetype === 'image/jpeg' && (x.width || 0) >= 1000));
      for (const x of big) console.log('    ', x.mimetype, x.width || '', 'x', x.height || '', x.size || '', x.url);
    }
  }
  await sleep(800);
}
