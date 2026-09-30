// gfmeta.mjs — fetch google/fonts METADATA.pb for families (via fetch.mjs) and print licence, axes, files, designer.
// Usage: node gfmeta.mjs ofl/montaguslab ofl/oldstandardtt apache/ultra ...
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const dir = '/Users/micahflunker/dev/vibes-night/research/iron-age-period/gf';
for (const p of process.argv.slice(2)) {
  const out = `${dir}/${p.replace('/', '__')}.METADATA.pb`;
  try {
    execFileSync('node', ['/Users/micahflunker/dev/vibes-night/tools/fetch.mjs', `https://raw.githubusercontent.com/google/fonts/main/${p}/METADATA.pb`, out], { stdio: 'ignore' });
  } catch { console.log('==', p, 'NOT FOUND'); continue; }
  const t = readFileSync(out, 'utf8');
  const g = re => [...t.matchAll(re)].map(m => m[1]);
  console.log('==', p, '| name:', g(/^name: "([^"]+)"/gm)[0], '| license:', g(/^license: "([^"]+)"/gm)[0], '| designer:', g(/^designer: "([^"]+)"/gm)[0], '| added:', g(/^date_added: "([^"]+)"/gm)[0]);
  console.log('   files:', g(/filename: "([^"]+)"/g).join(', '));
  const axes = [...t.matchAll(/axes \{\s*tag: "(\w+)"\s*min_value: ([\d.]+)\s*max_value: ([\d.]+)/g)].map(m => `${m[1]} ${m[2]}-${m[3]}`);
  console.log('   axes:', axes.join('; ') || '(static)');
  console.log('   copyright:', (g(/copyright: "([^"]+)"/g)[0] || '').slice(0, 160));
  console.log('   subsets:', g(/^subsets: "([^"]+)"/gm).join(','));
}
