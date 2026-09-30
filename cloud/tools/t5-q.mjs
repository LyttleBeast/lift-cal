// Track 5: query _measure.json. Usage: node t5-q.mjs <dirRegex> [field,field,...]
import { readFileSync } from 'node:fs';
const m = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/research/fonts/_measure.json', 'utf8'));
const s = JSON.parse(readFileSync('/Users/micahflunker/dev/vibes-night/research/fonts/_sizes.json', 'utf8'));
const re = new RegExp(process.argv[2] || '.');
const fields = (process.argv[3] || 'axes,hhea,typo,win,useTypo,minLh,xh,cap,xhVsArchivo,sizeAdjustToMatchArchivoXh,headVsH1,digVsLoadNum,wdthRange,missing,tnum,gsub').split(',');
for (const [k, v] of Object.entries(m)) {
  if (k.startsWith('_') || !re.test(k)) continue;
  const o = {};
  for (const f of fields) {
    if (f === 'per') { o.per = Object.fromEntries(Object.entries(v.per || {}).map(([w, p]) => [w, `txt${p.textRatio} caps${p.capsRatio} tnumW${p.tnumWidth} tnum×${p.tnumRatio} uni${p.tnumUniform ? 1 : 0} def${p.digitsDefaultUniform ? 1 : 0}`])); continue; }
    if (f === 'axes') { o.axes = Object.entries(v.axes || {}).map(([t, a]) => `${t} ${a.min}-${a.max} d${a.default}`).join('; '); continue; }
    if (f === 'gsub') { o.gsub = (v.gsub || []).filter(t => /tnum|pnum|lnum|onum|zero|case|ss0|frac|sups|cv/.test(t)).join(','); continue; }
    if (f === 'size') { o.size = Object.entries(s).filter(([sk]) => sk.startsWith(k)).map(([sk, sv]) => `${sk.includes('@') ? sk.split(' ').pop() : 'full'}=${sv}KB`).join(' '); continue; }
    o[f] = v[f];
  }
  console.log(k, JSON.stringify(o));
}
