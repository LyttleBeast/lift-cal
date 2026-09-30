// commons8b.mjs — track 8b: search Wikimedia Commons files, or dump one file's licence templates.
// commons.wikimedia.org only (V59 §14 asset host).
// Usage: node commons8b.mjs search '<terms>' [limit]
//        node commons8b.mjs info 'File:Name.jpg'
const [mode, arg, lim = 30] = process.argv.slice(2);
const api = 'https://commons.wikimedia.org/w/api.php';
const H = { headers: { 'user-agent': 'vibes-night-research/1.0 (Rack provenance check; contact micahflunker)' } };
if (mode === 'search') {
  const u = new URL(api);
  Object.entries({ action: 'query', list: 'search', srnamespace: '6', srsearch: arg, srlimit: lim, format: 'json' }).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u, H)).json();
  for (const s of j.query.search) console.log(s.title + '  ::  ' + s.snippet.replace(/<[^>]+>/g, '').slice(0, 120));
} else {
  const u = new URL(api);
  Object.entries({ action: 'query', titles: arg, prop: 'imageinfo|categories|templates', iiprop: 'url|size|sha1|extmetadata', tllimit: '100', cllimit: '100', format: 'json' }).forEach(([k, v]) => u.searchParams.set(k, v));
  const j = await (await fetch(u, H)).json();
  for (const p of Object.values(j.query.pages)) {
    const ii = (p.imageinfo || [])[0] || {};
    console.log(p.title, ii.width + 'x' + ii.height, ii.size, ii.url);
    const em = ii.extmetadata || {};
    for (const k of ['Artist', 'DateTimeOriginal', 'Credit', 'LicenseShortName', 'UsageTerms', 'ImageDescription'])
      if (em[k]) console.log(`  ${k}: ${String(em[k].value).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 300)}`);
    console.log('  templates: ' + (p.templates || []).map(t => t.title.replace('Template:', '')).filter(t => /PD|Public|CC|old|expired|anon|Licen/i.test(t)).join(', '));
    console.log('  cats: ' + (p.categories || []).map(c => c.title.replace('Category:', '')).join(' | ').slice(0, 400));
  }
  // raw wikitext for the source/permission fields
  const w = new URL(api);
  Object.entries({ action: 'parse', page: arg, prop: 'wikitext', format: 'json' }).forEach(([k, v]) => w.searchParams.set(k, v));
  const wj = await (await fetch(w, H)).json();
  console.log('--- wikitext ---\n' + String(wj.parse && wj.parse.wikitext && wj.parse.wikitext['*']).slice(0, 1800));
}
