// r02-sources.mjs — research track 2: replace <!--SHOTS--> in research/02-fitness-apps.md with the
// App Store page + screenshot URLs recorded in each research/refs/<app>/sources.txt. Local only.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const R = '/Users/micahflunker/dev/vibes-night/research';
const doc = R + '/02-fitness-apps.md';
const apps = readdirSync(R + '/refs').filter(d => existsSync(`${R}/refs/${d}/sources.txt`)).sort();
const out = [];
let n = 0;
for (const a of apps) {
  const lines = readFileSync(`${R}/refs/${a}/sources.txt`, 'utf8').split('\n').filter(Boolean);
  const page = (lines.find(l => l.startsWith('# App Store page:')) || '').replace('# App Store page:', '').trim();
  out.push(`- **${a}**: App Store page ${page}`);
  for (const l of lines.filter(l => !l.startsWith('#'))) {
    const [f, url] = l.split('\t');
    out.push(`  - \`refs/${a}/${f}\`: ${url}`); n++;
  }
}
const text = readFileSync(doc, 'utf8');
if (!text.includes('<!--SHOTS-->')) { console.error('placeholder missing'); process.exit(1); }
writeFileSync(doc, text.replace('<!--SHOTS-->', out.join('\n')));
console.log('apps', apps.length, 'images', n);
