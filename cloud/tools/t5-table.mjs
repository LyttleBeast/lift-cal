// Track 5: emit markdown table rows from _measure.json/_sizes.json/_meta.json for given keys.
// Usage: node t5-table.mjs key[=Label] ...   (key = dir/file as in _measure.json)
import { readFileSync } from 'node:fs';
const R = '/Users/micahflunker/dev/vibes-night/research/fonts';
const m = JSON.parse(readFileSync(`${R}/_measure.json`, 'utf8'));
const s = JSON.parse(readFileSync(`${R}/_sizes.json`, 'utf8'));
const meta = JSON.parse(readFileSync(`${R}/_meta.json`, 'utf8'));
const f3 = x => (x == null ? '–' : (+x).toFixed(2));
console.log('| Family · file | Licence · RFN | Axes (web) | tnum | Missing of the 21 | x-ht ×A | Text ×A @400 | Caps ×A @800 | Tab digit ×A @800 | rack.css h1 / .load-num ×A | hhea line ratio | Latin woff2 |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const arg of process.argv.slice(2)) {
  const [key, label] = arg.split('=');
  const r = m[key];
  if (!r) { console.log(`| ${key} | NOT MEASURED |`); continue; }
  const md = meta[r.dir] || {};
  const lic = (md.license || '?') + ' · ' + (key.includes('upstream/') ? 'none (upstream OFL.txt)' : (md.rfn ? md.rfn.replace(/\|/g, '/').replace(/Reserved Font Names? ?/i, 'RFN ') : 'none'));
  const axes = Object.entries(r.axes || {}).map(([t, a]) => `${t} ${a.min}–${a.max}`).join(', ') || 'static';
  const per = r.per || {};
  const p4 = per[400] || per[Object.keys(per)[0]];
  const p8 = per[800] || per[Object.keys(per).slice(-1)[0]];
  const tn = r.tnum ? (p4.tnumUniform && p8.tnumUniform ? 'yes' : 'feature present, NOT uniform') : (p4.digitsDefaultUniform ? 'no feature; digits tabular by default' : 'NO (proportional digits)');
  const size = s[key] != null ? s[key] + ' KB' : (s[`${key} @wdth100`] ? s[`${key} @wdth100`] + ' KB' : 'n/m');
  const miss = r.missing.length ? r.missing.join(' ') : '—';
  console.log(`| ${label || r.family || r.dir} · \`${key.split('/').pop()}\` | ${lic} | ${axes} | ${tn} | ${miss} | ${f3(r.xhVsArchivo)} | ${f3(p4.textRatio)} | ${f3(p8.capsRatio)} | ${f3(p8.tnumRatio)} | ${f3(r.headVsH1)} / ${f3(r.digVsLoadNum)} | ${f3(r.minLh)} | ${size} |`);
}
