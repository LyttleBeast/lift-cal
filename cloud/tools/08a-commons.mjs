// 08a-commons.mjs — for each Commons file title, print size, url, sha1, license templates, and the
// wikitext's information block (author, date, source) so PD-US-expired + PD-old-70/100 can be checked.
// Usage: node 08a-commons.mjs "File:X.jpg" ["File:Y.jpg"]  [--full]
import { commonsGet } from './08a-api.mjs';
const args = process.argv.slice(2);
const full = args.includes('--full');
for (const t of args.filter(a => a !== '--full')) {
  const j = await commonsGet({ action: 'query', titles: t, prop: 'imageinfo|templates|revisions', rvprop: 'content', rvslots: 'main', iiprop: 'url|size|sha1|mime|extmetadata', tllimit: '500' });
  const p = Object.values(j.query.pages)[0];
  if (p.missing !== undefined) { console.log('MISSING', t); continue; }
  const ii = p.imageinfo[0];
  const tpl = (p.templates || []).map(x => x.title.replace('Template:', ''));
  const lic = tpl.filter(x => /^PD|^Cc|^CC|^LOC|^No restrictions|^Flickr|^Licen|^GFDL|^Public domain|^Rijks|^Met|^Smithsonian|^Anonymous/i.test(x));
  const wt = p.revisions?.[0]?.slots?.main?.['*'] || '';
  console.log(`== ${t}\n  ${ii.width}x${ii.height} ${ii.size}B ${ii.mime} sha1=${ii.sha1}\n  url=${ii.url}\n  page=${ii.descriptionurl}`);
  console.log('  license-templates:', lic.join(', '));
  console.log(full ? wt : '  wikitext:\n' + wt.slice(0, 1800).split('\n').map(l => '    | ' + l).join('\n'));
}
