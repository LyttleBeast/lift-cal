// met8b.mjs — track 8b: The Met Open Access search (collectionapi.metmuseum.org only, V59 §14).
// Usage: node met8b.mjs search '<q>' [departmentId] [max]   |  node met8b.mjs object <id>
const [mode, a, dep, max = 25] = process.argv.slice(2);
const B = 'https://collectionapi.metmuseum.org/public/collection/v1';
const H = { headers: { 'user-agent': 'Mozilla/5.0 vibes-night research' } };
if (mode === 'search') {
  const u = new URL(B + '/search');
  u.searchParams.set('q', a); u.searchParams.set('hasImages', 'true');
  if (dep) u.searchParams.set('departmentId', dep);
  const j = await (await fetch(u, H)).json();
  console.log('total ' + j.total);
  for (const id of (j.objectIDs || []).slice(0, +max)) {
    const o = await (await fetch(`${B}/objects/${id}`, H)).json();
    console.log(`${id} | PD ${o.isPublicDomain} | ${o.objectDate} | ${String(o.title).slice(0, 70)} | ${String(o.artistDisplayName).slice(0, 30)} ${o.artistEndDate || ''} | ${o.medium ? String(o.medium).slice(0, 40) : ''} | ${o.classification}`);
  }
} else {
  const o = await (await fetch(`${B}/objects/${a}`, H)).json();
  for (const k of ['objectID', 'isPublicDomain', 'title', 'objectName', 'objectDate', 'objectBeginDate', 'objectEndDate', 'artistDisplayName', 'artistBeginDate', 'artistEndDate', 'artistRole', 'medium', 'dimensions', 'creditLine', 'accessionNumber', 'classification', 'department', 'rightsAndReproduction', 'objectURL', 'primaryImage', 'repository'])
    console.log(`${k}: ${o[k]}`);
}
