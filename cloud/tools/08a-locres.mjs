// 08a-locres.mjs — list download URLs a loc.gov resource page offers (via ?fo=json), loc.gov only.
// Usage: node 08a-locres.mjs <resource id e.g. ds.10956>
const [rid] = process.argv.slice(2);
const u = `https://www.loc.gov/resource/${rid}/?fo=json`;
const raw = await (await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 RackVibesResearch' } })).text();
const urls = [...new Set([...raw.matchAll(/https:\/\/tile\.loc\.gov\/[^"\\\s]+/g)].map(m => m[0]))];
for (const x of urls) console.log(x);
