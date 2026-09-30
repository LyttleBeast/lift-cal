// 08a-met.mjs — search the Met collection API (collectionapi.metmuseum.org, a §14 host); print public-domain hits.
// Usage: node 08a-met.mjs "<query>" [max]
const [q, max = '25'] = process.argv.slice(2);
const base = 'https://collectionapi.metmuseum.org/public/collection/v1';
const s = await (await fetch(`${base}/search?hasImages=true&q=${encodeURIComponent(q)}`)).json();
console.log(`== ${q}: ${s.total} hits`);
for (const id of (s.objectIDs || []).slice(0, Number(max))) {
  const o = await (await fetch(`${base}/objects/${id}`)).json();
  if (!/Photograph/i.test(o.classification || '') && !/photograph/i.test(o.medium || '')) continue;
  console.log(`${id} | PD=${o.isPublicDomain} | ${o.objectDate} | ${o.artistDisplayName} (${o.artistBeginDate}-${o.artistEndDate}) | ${o.title} | ${o.medium} | ${o.primaryImage}`);
  await new Promise(r => setTimeout(r, 300));
}
