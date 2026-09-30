// Compare one scene's dump across two runs (or sides): counts by kind, first few.
// Usage: node chalk-g3-rs9-pair.mjs <dumpA.json.gz> <dumpB.json.gz>
const H = await import('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/harness-lib.mjs');
const [a, b] = process.argv.slice(2);
const r = H.compareDumps(H.readGz(a), H.readGz(b), 5);
const counts = Object.fromEntries(H.DIFF_KINDS.filter(k => r[k] && r[k].count).map(k => [k, r[k].count]));
console.log(JSON.stringify(counts));
for (const k of Object.keys(counts)) console.log('  ', k, JSON.stringify(r[k].first).slice(0, 800));
