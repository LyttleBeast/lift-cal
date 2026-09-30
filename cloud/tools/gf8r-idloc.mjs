// gf8r-idloc.mjs — critic-round gap fill (08a/09). LoC name authority lookups on id.loc.gov (a loc.gov subdomain,
// so a §14 host). Usage: node gf8r-idloc.mjs "<name query>" [more queries...]
//   Prints each suggestion (label, uri); then, for the top hits, the authority's MADS label and any birth/death dates.
const qs = process.argv.slice(2);
const UA = { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch', accept: 'application/json' } };
for (const q of qs) {
  const u = `https://id.loc.gov/authorities/names/suggest2?q=${encodeURIComponent(q)}&searchtype=keyword&count=8`;
  const r = await fetch(u, UA);
  const j = await r.json().catch(() => null);
  console.log(`\n== ${q} (HTTP ${r.status}) ${u}`);
  for (const h of (j?.hits || []).slice(0, 8)) {
    console.log(`- ${h.aLabel} | ${h.uri}`);
  }
}
