// Track 5: build fetch jobs for METADATA.pb + OFL.txt (or LICENSE.txt under apache/ufl) per google/fonts family dir.
// Usage: node t5-mkjobs-meta.mjs <out.json> <licdir> name1 name2 ...
import { writeFileSync } from 'node:fs';
const [out, lic, ...names] = process.argv.slice(2);
const R = '/Users/micahflunker/dev/vibes-night/research/fonts';
const base = n => `https://raw.githubusercontent.com/google/fonts/main/${lic}/${n}/`;
const jobs = [];
for (const n of names) {
  const dir = lic === 'ofl' ? `${R}/${n}` : `${R}/${n}/_${lic}`;
  jobs.push([base(n) + 'METADATA.pb', `${dir}/METADATA.pb`]);
  jobs.push([base(n) + (lic === 'ofl' ? 'OFL.txt' : 'LICENSE.txt'), `${dir}/${lic === 'ofl' ? 'OFL.txt' : 'LICENSE.txt'}`]);
}
writeFileSync(out, JSON.stringify(jobs, null, 1));
console.log(jobs.length, 'jobs ->', out);
