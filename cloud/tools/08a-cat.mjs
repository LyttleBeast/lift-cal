// 08a-cat.mjs — list Commons category members (files + subcats) via the API (commons.wikimedia.org only, a §14 host).
// Usage: node 08a-cat.mjs "Category:Strongmen" ["Category:..."]
import { commonsGet } from './08a-api.mjs';
for (const cat of process.argv.slice(2)) {
  let cont = {};
  const files = [], subs = [];
  for (let i = 0; i < 5; i++) {
    const j = await commonsGet({ action: 'query', list: 'categorymembers', cmtitle: cat, cmlimit: '500', cmtype: 'file|subcat', ...cont });
    for (const m of (j.query?.categorymembers || [])) (m.ns === 14 ? subs : files).push(m.title);
    if (j.continue?.cmcontinue) cont = { cmcontinue: j.continue.cmcontinue }; else break;
  }
  console.log(`== ${cat}: ${files.length} files, ${subs.length} subcats`);
  for (const s of subs) console.log('  SUB', s);
  for (const f of files) console.log('  ', f);
}
