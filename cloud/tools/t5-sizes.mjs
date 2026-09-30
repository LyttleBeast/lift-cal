// Track 5: Latin woff2 size per candidate file (same text set as t5-subsettest: GF latin range + Rack's glyphs).
// Writes research/fonts/_sizes.json. Variable fonts keep every axis (full range) unless noted.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const subsetFont = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/subset-font');
const R = '/Users/micahflunker/dev/vibes-night/research/fonts';
const ranges = [[0x20, 0x7e], [0xa0, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215]];
let text = '';
for (const [a, b] of ranges) for (let c = a; c <= b; c++) text += String.fromCodePoint(c);
text += '→↳⋯✓✕⚙÷±×';
let out = {};
try { out = JSON.parse(readFileSync(`${R}/_sizes.json`, 'utf8')); } catch {}
const only = new Set(process.argv.slice(2));
for (const d of readdirSync(R).filter(d => !d.startsWith('_') && statSync(`${R}/${d}`).isDirectory()).sort()) {
  if (only.size && !only.has(d)) continue;
  const list = readdirSync(`${R}/${d}`).filter(f => /\.ttf$/i.test(f));
  try { for (const u of readdirSync(`${R}/${d}/upstream`)) if (/\.ttf$/i.test(u)) list.push('upstream/' + u); } catch {}
  for (const f of list) {
    if (out[`${d}/${f}`] != null) continue;
    try {
      const buf = readFileSync(`${R}/${d}/${f}`);
      const w2 = await subsetFont(buf, text, { targetFormat: 'woff2' });
      out[`${d}/${f}`] = +(w2.length / 1024).toFixed(1);
      // Rack draws wght 400..900 and (for wdth fonts) could pin width: also report a trimmed variant.
      if (/\[/.test(f) && /wdth/.test(f)) {
        const t = await subsetFont(buf, text, { targetFormat: 'woff2', variationAxes: { wdth: 100 } });
        out[`${d}/${f} @wdth100`] = +(t.length / 1024).toFixed(1);
      }
    } catch (e) { out[`${d}/${f}`] = 'ERR ' + String(e).slice(0, 80); }
    console.log(d, f, out[`${d}/${f}`]);
  }
}
writeFileSync(`${R}/_sizes.json`, JSON.stringify(out, null, 1));
