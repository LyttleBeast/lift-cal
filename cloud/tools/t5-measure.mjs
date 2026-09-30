// Track 5: measure every downloaded candidate against Archivo.
// Method: HarfBuzz (harfbuzzjs, the shaper browsers and Android use) shapes fixed strings at pinned
// axis values; advances are summed WITHOUT kerning (features "-kern") so the numbers are comparable
// to native coach-view.js's no-kerning advance tables. x-height/cap-height come from OS/2 and from the
// outlines of 'x'/'H' (opentype.js, default instance). Output: research/fonts/_measure.json + a table.
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js');
const hb = await require('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs');
const R = '/Users/micahflunker/dev/vibes-night/research/fonts';
const ARCHIVO = '/Users/micahflunker/dev/vibes-night/tools/fonts/archivo/Archivo-wdth-wght.ttf';
const TEST = '’ — · – … × “ ” → ⚙ › ✕ ⋯ ✓ − ‹ ↳ ↑ ↓ ÷ ±'.split(' ');
const TEXT = 'Bench press 5 x 102.5 kg, next time 105 kg. The quick brown fox jumps over the lazy dog 0123456789';
const CAPS = 'SETS REPS WEIGHT VOLUME TODAY BODYWEIGHT';
const DIG = '0123456789';

function load(path) {
  const buf = readFileSync(path);
  const blob = hb.createBlob(buf);
  const face = hb.createFace(blob, 0);
  const font = hb.createFont(face);
  return { buf, blob, face, font, upem: face.upem, axes: face.getAxisInfos(), unis: new Set(face.collectUnicodes()) };
}
function free(f) { f.font.destroy(); f.face.destroy(); f.blob.destroy(); }
function adv(f, text, vars = {}, feats = '-kern') {
  const v = {};
  for (const [k, val] of Object.entries(vars)) if (f.axes[k]) v[k] = Math.min(f.axes[k].max, Math.max(f.axes[k].min, val));
  f.font.setVariations(v);
  const b = hb.createBuffer(); b.addText(text); b.guessSegmentProperties();
  hb.shape(f.font, b, feats);
  const g = b.json(); b.destroy();
  return { sum: g.reduce((s, x) => s + x.ax, 0) * 1000 / f.upem, each: g.map(x => Math.round(x.ax * 1000 / f.upem)), notdef: g.filter(x => x.g === 0).length };
}
function otInfo(path) {
  const buf = readFileSync(path);
  const ot = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const os2 = ot.tables.os2, hh = ot.tables.hhea, upm = ot.unitsPerEm;
  const bb = ch => { try { const g = ot.charToGlyph(ch); return g && g.index ? g.getBoundingBox() : null; } catch { return null; } };
  const x = bb('x'), H = bb('H');
  let feats = [];
  try { feats = [...new Set((ot.tables.gsub?.features || []).map(f => f.tag))].sort(); } catch {}
  let gpos = [];
  try { gpos = [...new Set((ot.tables.gpos?.features || []).map(f => f.tag))].sort(); } catch {}
  const name = id => { try { return ot.names[id]?.en; } catch { return undefined; } };
  return {
    upm, weightClass: os2.usWeightClass, widthClass: os2.usWidthClass,
    xh_os2: os2.sxHeight ? +(os2.sxHeight / upm).toFixed(3) : null, cap_os2: os2.sCapHeight ? +(os2.sCapHeight / upm).toFixed(3) : null,
    xh: x ? +(x.y2 / upm).toFixed(3) : null, cap: H ? +(H.y2 / upm).toFixed(3) : null,
    hhea: [hh.ascender, hh.descender, hh.lineGap], minLh: +((hh.ascender - hh.descender) / upm).toFixed(3),
    typo: [os2.sTypoAscender, os2.sTypoDescender, os2.sTypoLineGap], win: [os2.usWinAscent, os2.usWinDescent], useTypo: !!(os2.fsSelection & 128),
    gsub: feats, gpos, version: name('version'), family: name('fontFamily'), glyphs: ot.numGlyphs,
  };
}

const A = load(ARCHIVO);
const Ainfo = otInfo(ARCHIVO);
const ref = {};
for (const w of [400, 600, 700, 800]) ref[w] = { text: adv(A, TEXT, { wdth: 100, wght: w }).sum, caps: adv(A, CAPS, { wdth: 100, wght: w }).sum, dig: adv(A, DIG, { wdth: 100, wght: w }, '-kern,tnum').sum / 10 };
ref.head78 = adv(A, CAPS, { wdth: 78, wght: 800 }).sum; // rack.css h1-h3
ref.num118 = adv(A, DIG, { wdth: 118, wght: 800 }, '-kern,tnum').sum / 10; // .load-num
ref.lab88 = adv(A, CAPS, { wdth: 88, wght: 700 }).sum; // labels

const out = { _method: 'harfbuzzjs shaping, kerning off; widths in 1/1000 em; ratios vs Archivo at wdth 100 and the same wght', _archivo: { ...Ainfo, ref, axes: A.axes } };
const rows = [];
const dirs = readdirSync(R).filter(d => !d.startsWith('_') && statSync(`${R}/${d}`).isDirectory()).sort();
for (const d of dirs) {
  const files = readdirSync(`${R}/${d}`).filter(f => /\.(ttf|otf)$/i.test(f));
  try { for (const u of readdirSync(`${R}/${d}/upstream`)) if (/\.(ttf|otf)$/i.test(u)) files.push('upstream/' + u); } catch {}
  for (const file of files) {
    const p = `${R}/${d}/${file}`;
    let f, info;
    try { f = load(p); info = otInfo(p); } catch (e) { out[`${d}/${file}`] = { error: String(e) }; console.log('ERR', d, file, String(e).slice(0, 120)); continue; }
    const isVar = !!f.axes.wght;
    const weights = isVar ? [400, 600, 700, 800] : [info.weightClass];
    const per = {};
    for (const w of weights) {
      const vars = { wght: w };
      if (f.axes.wdth) vars.wdth = 100; // clamped by adv() to the axis range
      const t = adv(f, TEXT, vars), c = adv(f, CAPS, vars);
      const dDef = adv(f, DIG, vars), dTab = adv(f, DIG, vars, '-kern,tnum');
      const rw = ref[w] || ref[w >= 750 ? 800 : w >= 650 ? 700 : w >= 500 ? 600 : 400];
      per[w] = {
        text: Math.round(t.sum), textRatio: +(t.sum / rw.text).toFixed(3), capsRatio: +(c.sum / rw.caps).toFixed(3),
        digitsDefault: dDef.each, digitsDefaultUniform: new Set(dDef.each).size === 1,
        digitsTnum: dTab.each, tnumUniform: new Set(dTab.each).size === 1, tnumWidth: dTab.each[0], tnumRatio: +(dTab.sum / 10 / rw.dig).toFixed(3),
      };
    }
    // width range for axis fonts, at wght 800
    let wdthRange = null;
    if (f.axes.wdth) {
      const lo = adv(f, CAPS, { wdth: f.axes.wdth.min, wght: 800 }).sum, hi = adv(f, DIG, { wdth: f.axes.wdth.max, wght: 800 }, '-kern,tnum').sum / 10;
      wdthRange = { minCapsVsArchivoH1: +(lo / ref.head78).toFixed(3), maxDigitVsLoadNum: +(hi / ref.num118).toFixed(3) };
    }
    // What rack.css would draw if this face replaced Archivo with every declaration unchanged:
    // h1-h3 are 'wdth' 78 'wght' 800; .load-num is 'wdth' 118 'wght' 800. A missing axis is ignored.
    const headVsH1 = +(adv(f, CAPS, { wght: 800, wdth: 78 }).sum / ref.head78).toFixed(3);
    const digVsLoadNum = +(adv(f, DIG, { wght: 800, wdth: 118 }, '-kern,tnum').sum / 10 / ref.num118).toFixed(3);
    const missing = TEST.filter(ch => !f.unis.has(ch.codePointAt(0)));
    const xh = info.xh || info.xh_os2;
    const rec = {
      dir: d, file, bytes: statSync(p).size, axes: f.axes, ...info,
      xhVsArchivo: xh ? +(xh / (Ainfo.xh || Ainfo.xh_os2)).toFixed(3) : null,
      sizeAdjustToMatchArchivoXh: xh ? Math.round(100 * (Ainfo.xh || Ainfo.xh_os2) / xh) + '%' : null,
      missing, has: TEST.filter(ch => f.unis.has(ch.codePointAt(0))),
      tnum: info.gsub.includes('tnum'), per, wdthRange, headVsH1, digVsLoadNum, cmapCount: f.unis.size,
    };
    out[`${d}/${file}`] = rec;
    const p4 = per[400] || per[weights[0]];
    rows.push([d, file.slice(0, 34), isVar ? Object.entries(f.axes).map(([k, v]) => `${k}${v.min}-${v.max}`).join(' ') : 'static w' + info.weightClass,
      'xh ' + xh + ' (' + rec.xhVsArchivo + ')', 'txt×' + p4.textRatio, 'caps×' + p4.capsRatio, 'tnum:' + (rec.tnum ? 'Y' : 'n') + (p4.tnumUniform ? '/uni' : '/NOT-uni') + (p4.digitsDefaultUniform ? ' def-uni' : ''),
      'minLh ' + info.minLh, 'miss ' + missing.length + ':' + missing.join(''), rec.bytes].join(' | '));
    free(f);
  }
}
writeFileSync(`${R}/_measure.json`, JSON.stringify(out, null, 1));
console.log('ARCHIVO', JSON.stringify({ xh: Ainfo.xh, xh_os2: Ainfo.xh_os2, cap: Ainfo.cap, minLh: Ainfo.minLh, gsub: Ainfo.gsub, missing: TEST.filter(ch => !A.unis.has(ch.codePointAt(0))), ref }));
for (const r of rows) console.log(r);
