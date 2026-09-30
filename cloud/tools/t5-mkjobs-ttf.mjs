// Track 5: fetch jobs for each OFL family's upright font file(s) from google/fonts main.
// Variable: the upright [axes].ttf. Static: the 400 upright plus the heaviest upright <= 900 (for native).
import { readFileSync, writeFileSync } from 'node:fs';
const R = '/Users/micahflunker/dev/vibes-night/research/fonts';
const meta = JSON.parse(readFileSync(`${R}/_meta.json`, 'utf8'));
const skip = new Set(process.argv.slice(3));
const jobs = [];
for (const [d, m] of Object.entries(meta)) {
  if (m.license !== 'OFL' || skip.has(d)) continue;
  const pb = readFileSync(`${R}/${d}/METADATA.pb`, 'utf8');
  const fonts = [...pb.matchAll(/fonts \{([\s\S]*?)\n\}/g)].map(x => ({
    style: (x[1].match(/style: "(\w+)"/) || [])[1], weight: +(x[1].match(/weight: (\d+)/) || [])[1],
    filename: (x[1].match(/filename: "([^"]+)"/) || [])[1] }));
  const up = fonts.filter(f => f.style === 'normal');
  const pick = new Set();
  const vf = up.find(f => f.filename.includes('['));
  if (vf) pick.add(vf.filename);
  else {
    const r = up.find(f => f.weight === 400) || up[0];
    pick.add(r.filename);
    const heavy = up.filter(f => f.weight >= 600).sort((a, b) => a.weight - b.weight);
    for (const h of heavy) pick.add(h.filename); // all heavier statics (small files)
  }
  for (const f of pick) jobs.push([`https://raw.githubusercontent.com/google/fonts/main/ofl/${d}/${encodeURIComponent(f)}`, `${R}/${d}/${f}`]);
}
writeFileSync(process.argv[2], JSON.stringify(jobs, null, 1));
console.log(jobs.length, 'jobs');
