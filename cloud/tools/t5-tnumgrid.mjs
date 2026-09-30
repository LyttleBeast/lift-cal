// Track 5: are the tabular figures really tabular across the design space, and do they survive static instancing?
// Live: HarfBuzz shaping of the VF at pinned axes with 'tnum'. Static: hb-subset instance at the same point, then shaped.
// Usage: node t5-tnumgrid.mjs <font> [--static]
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const hb = await require('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs');
const subsetFont = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/subset-font');
const [src, flag] = process.argv.slice(2);
const buf = readFileSync(src);
function digits(b, vars) {
  const blob = hb.createBlob(b), face = hb.createFace(blob, 0), font = hb.createFont(face);
  if (vars) font.setVariations(vars);
  const s = hb.createBuffer(); s.addText('0123456789'); s.guessSegmentProperties(); hb.shape(font, s, 'tnum,-kern');
  const j = s.json().map(g => Math.round(g.ax * 1000 / face.upem)); s.destroy(); font.destroy(); face.destroy(); blob.destroy();
  return j;
}
const blob = hb.createBlob(buf), face = hb.createFace(blob, 0);
const axes = face.getAxisInfos(); face.destroy(); blob.destroy();
const wghts = axes.wght ? [400, 600, 700, 800, 900].filter(w => w >= axes.wght.min && w <= axes.wght.max) : [null];
const wdths = axes.wdth ? [...new Set([axes.wdth.min, 78, 88, 100, 118, axes.wdth.max].map(w => Math.min(axes.wdth.max, Math.max(axes.wdth.min, w))))] : [null];
const bad = [], okc = { live: 0, stat: 0 };
for (const w of wghts) for (const d of wdths) {
  const vars = {}; if (w) vars.wght = w; if (d) vars.wdth = d;
  const live = digits(buf, vars);
  if (new Set(live).size > 1) bad.push(`LIVE ${JSON.stringify(vars)} ${live.join(',')}`); else okc.live++;
  if (flag === '--static' && Object.keys(vars).length) {
    const text = '0123456789';
    const inst = await subsetFont(buf, text, { targetFormat: 'sfnt', variationAxes: vars });
    const st = digits(inst);
    if (new Set(st).size > 1) bad.push(`STATIC ${JSON.stringify(vars)} ${st.join(',')}`); else okc.stat++;
  }
}
console.log(src.split('/').pop(), JSON.stringify({ axes: Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, `${v.min}-${v.max} d${v.default}`])), uniformLive: okc.live, uniformStatic: okc.stat, problems: bad }));
