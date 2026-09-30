// Track 5: parse every research/fonts/<dir>/METADATA.pb + OFL.txt into _meta.json, and print a compact table.
import { readFileSync, readdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
const R = '/Users/micahflunker/dev/vibes-night/research/fonts';
const out = {};
for (const d of readdirSync(R).sort()) {
  if (d.startsWith('_') || !statSync(`${R}/${d}`).isDirectory()) continue;
  const mp = existsSync(`${R}/${d}/METADATA.pb`) ? `${R}/${d}/METADATA.pb` : existsSync(`${R}/${d}/_apache/METADATA.pb`) ? `${R}/${d}/_apache/METADATA.pb` : null;
  if (!mp) continue;
  const pb = readFileSync(mp, 'utf8');
  const g = re => (pb.match(re) || [])[1];
  const fonts = [...pb.matchAll(/fonts \{([\s\S]*?)\n\}/g)].map(m => ({
    style: (m[1].match(/style: "(\w+)"/) || [])[1],
    weight: +(m[1].match(/weight: (\d+)/) || [])[1],
    filename: (m[1].match(/filename: "([^"]+)"/) || [])[1],
    copyright: (m[1].match(/copyright: "([^"]*)"/) || [])[1],
  }));
  const axes = [...pb.matchAll(/axes \{\s*tag: "(\w+)"\s*min_value: ([\d.-]+)\s*max_value: ([\d.-]+)/g)].map(m => `${m[1]} ${+m[2]}–${+m[3]}`);
  const subsets = [...pb.matchAll(/subsets: "([\w-]+)"/g)].map(m => m[1]);
  const rec = {
    dir: d, metadata: mp.replace(R + '/', ''), name: g(/^name: "([^"]+)"/m), designer: g(/designer: "([^"]+)"/), license: g(/license: "(\w+)"/),
    category: g(/category: "(\w+)"/), date_added: g(/date_added: "([^"]+)"/), axes, subsets,
    files: fonts.map(f => `${f.filename}`).filter((v, i, a) => a.indexOf(v) === i),
    styles: fonts.map(f => `${f.style[0]}${f.weight}`),
    copyright: fonts[0]?.copyright, repo: g(/repository_url: "([^"]+)"/), commit: g(/commit: "([^"]+)"/),
    stat_in_meta: /static/.test(pb),
  };
  const lp = existsSync(`${R}/${d}/OFL.txt`) ? `${R}/${d}/OFL.txt` : null;
  if (lp) {
    const t = readFileSync(lp, 'utf8');
    const head = t.split(/This Font Software is licensed under/i)[0];
    rec.ofl_head = head.trim().replace(/\s+/g, ' ');
    const rfn = head.match(/Reserved\s+Font\s+Names?\s*[:"“]?[^\n]*/gi);
    rec.rfn = rfn ? rfn.map(s => s.trim()).join(' | ') : null;
    rec.ofl_version = (t.match(/Version\s+(1\.\d)/) || [])[1];
  }
  out[d] = rec;
}
writeFileSync(`${R}/_meta.json`, JSON.stringify(out, null, 1));
for (const r of Object.values(out)) {
  console.log([r.dir, r.license, r.category, r.date_added, r.axes.join(',') || 'static', r.styles.length + ' styles', r.files.slice(0, 3).join(' '), 'RFN=' + (r.rfn || '-'), r.repo || ''].join(' | '));
}
