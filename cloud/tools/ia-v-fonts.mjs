// V/fonts for Iron Age (V59 §11, §14; design/iron-age.md §6).
// Reads the upstream Besley v4 files fetched (by tools/fetch.mjs) into
// ~/dev/vibes-night/fonts-ia/src, confirms their sha256 against the spec,
// builds:
//   web    — three latin woff2 subsets, each keeping a wght axis, wdth pinned 100
//   native — three latin TTF subsets of the upstream statics (names, hints and
//            every layout feature kept)
// then re-opens every OUTPUT file (woff2 decompressed with fontverter) with
// opentype.js and checks: axes, names, weight class, tnum, and the glyphs the
// app draws. Writes the files, OFL.txt and FONTS.json into both worktrees.
// Usage: node ia-v-fonts.mjs [--write]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const NM = '/Users/micahflunker/dev/vibes-night/tools/node_modules/';
const subsetFont = require(NM + 'subset-font');
const fontverter = require(NM + 'fontverter');
const opentype = require(NM + 'opentype.js');
const ver = n => require(NM + n + '/package.json').version;

const WRITE = process.argv.includes('--write');
const SRC = '/Users/micahflunker/dev/vibes-night/fonts-ia/src/';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age/vibes/iron-age/fonts/';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age/assets/fonts/Besley/';
const NATJ = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age/assets/vibes/iron-age/';
const COMMIT = '99d5b97fcb863c4a667571ac8f86f745c345d3ab';
const RAW = `https://raw.githubusercontent.com/indestructible-type/Besley/${COMMIT}/`;

const sha = b => createHash('sha256').update(b).digest('hex');
const EXPECT = {   // design/iron-age.md §6, and the licence
  'Besley-VF.ttf': ['fonts/variable/Besley%5Bwdth,wght%5D.ttf', '12d70d6287c9a93975afef302bf7e41187fe3c88fac55a20a467e76ceeb70dd9'],
  'Besley-Italic-VF.ttf': ['fonts/variable/Besley-Italic%5Bwdth,wght%5D.ttf', '304fb2bb39263d6bf395f8540f3d33d415fd30c38385c9cb37004cac0c1f595d'],
  'Besley-SemiBold.ttf': ['fonts/ttf/Besley-SemiBold.ttf', '3e9ef08c657fd1fd4af8a6754115cb5021466d923e8426f30fa0597937347334'],
  'Besley-ExtraBold.ttf': ['fonts/ttf/Besley-ExtraBold.ttf', '11304ee2f5e3e3998a0fc84baa51f1c8ff7b37b85d41e384bbf450fd09f76306'],
  'Besley-Italic.ttf': ['fonts/ttf/Besley-Italic.ttf', '8300f5f6346d4d8312623accb0c5bb30c2b47df1bd28d0e6492bd46c2ea1f2ac'],
  'OFL.txt': ['OFL.txt', '9276de391a2e4fc667adb36766a265ec77af43a92df2938c52a62bd7e2beea15']
};
const src = {};
for (const [f, [, want]] of Object.entries(EXPECT)) {
  const b = readFileSync(SRC + f); src[f] = b;
  if (sha(b) !== want) { console.error('SHA MISMATCH', f, sha(b)); process.exit(1); }
}
console.log('sources: all six match the spec\'s sha256');

// ---- the licence: OFL 1.1, and a Reserved Font Name declared or not ----
const ofl = src['OFL.txt'].toString('utf8');
const head = ofl.split('-----------------------------------------------------------')[0];
const copyright = head.split('\n')[0].trim();
const rfnDecl = /Reserved Font Name/i.test(head);
const isOfl11 = /SIL OPEN FONT LICENSE Version 1\.1 - 26 February 2007/.test(ofl);
const meta = readFileSync(SRC + 'gf-METADATA.pb', 'utf8');
const gfOfl = readFileSync(SRC + 'gf-OFL.txt', 'utf8');
const gfHead = gfOfl.split('-----------------------------------------------------------')[0];
console.log('OFL 1.1:', isOfl11, '| RFN declared in header:', rfnDecl, '| copyright:', copyright);
console.log('google/fonts METADATA.pb license:', (/license:\s*"([^"]+)"/.exec(meta) || [])[1], '| its OFL RFN:', /Reserved Font Name/i.test(gfHead), '| its copyright:', gfHead.split('\n')[0].trim());
if (!isOfl11 || rfnDecl) { console.error('licence check failed'); process.exit(1); }

// ---- the subset: Google's latin range (as the spec's ia-final-subset2) ----
const ranges = [[0x20, 0x7e], [0xa0, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x304, 0x304], [0x308, 0x308], [0x329, 0x329], [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193],
  [0x2212, 0x2212], [0x2215, 0x2215], [0x2248, 0x2248], [0xfeff, 0xfeff], [0xfffd, 0xfffd]];
let latin = ''; for (const [a, b] of ranges) for (let c = a; c <= b; c++) latin += String.fromCodePoint(c);
const DIGITS = '0123456789,.≈ ';
const NAME_IDS = Array.from({ length: 26 }, (_, i) => i);   // native: keep every name record

const JOBS = [
  { client: 'web', out: WEB + 'iron-age-besley.woff2', family: 'iron-age Besley', from: 'Besley-VF.ttf', text: latin, fmt: 'woff2',
    axes: { wght: { min: 600, max: 800 }, wdth: 100 }, weights: [600, 800], use: 'face.web.display — heads, card heads, greeting, exercise name, challenge figure' },
  { client: 'web', out: WEB + 'iron-age-besley-italic.woff2', family: 'iron-age Besley Italic', from: 'Besley-Italic-VF.ttf', text: latin, fmt: 'woff2',
    axes: { wght: { min: 400, max: 500 }, wdth: 100 }, weights: [400], use: 'face.web.italic — the running meta' },
  { client: 'web', out: WEB + 'iron-age-besley-digits.woff2', family: 'iron-age Besley Digits', from: 'Besley-VF.ttf', text: DIGITS, fmt: 'woff2',
    axes: { wght: { min: 600, max: 800 }, wdth: 100 }, weights: [800], use: 'face.web.num — the Vibes card figure (prefetched for the picker)' },
  { client: 'native', out: NAT + 'Besley-SemiBold.ttf', key: 'Besley_600', from: 'Besley-SemiBold.ttf', text: latin, fmt: 'truetype', weights: [600], use: 'eyebrow (card/sheet heads), exercise name' },
  { client: 'native', out: NAT + 'Besley-ExtraBold.ttf', key: 'Besley_800', from: 'Besley-ExtraBold.ttf', text: latin, fmt: 'truetype', weights: [800], use: 'h1-h3, headline, youGreet, loadNum; the picker face' },
  { client: 'native', out: NAT + 'Besley-Italic.ttf', key: 'BesleyItalic_400', from: 'Besley-Italic.ttf', text: latin, fmt: 'truetype', weights: [400], use: 'meta (the running meta)' }
];

// The characters the app draws that a face may be asked for (the brief's list).
const APP = ['’', '—', '·', '–', '…', '×', '“', '”', '→', '⚙', '›', '✕', '⋯', '✓', '−', '‹', '↳', '↑', '↓', '÷', '±', '≈', '%'];

const toAB = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
function digitsReport(f) {
  const adv = ch => { const g = f.charToGlyph(ch); return g ? g.advanceWidth : null; };
  const def = [...'0123456789'].map(adv);
  let tn = null;
  try {
    const subs = f.substitution.getSingle('tnum', 'DFLT', 'dflt') || f.substitution.getSingle('tnum', 'latn', 'dflt') || [];
    const map = new Map(subs.map(s => [s.sub, s.by]));
    tn = [...'0123456789'].map(ch => { const g = f.charToGlyph(ch); const i = map.has(g.index) ? map.get(g.index) : g.index; return f.glyphs.get(i).advanceWidth; });
  } catch (e) { tn = 'err ' + e.message; }
  return { def, tn };
}
function features(f) {
  const g = f.tables.gsub; if (!g) return [];
  return [...new Set(g.features.map(x => x.tag))].sort();
}

const results = [];
for (const j of JOBS) {
  const opts = { targetFormat: j.fmt };
  if (j.axes) opts.variationAxes = j.axes;
  if (j.client === 'native') opts.preserveNameIds = NAME_IDS;
  const out = await subsetFont(src[j.from], j.text, opts);
  // re-open the exact bytes that ship
  const ttf = j.fmt === 'woff2' ? await fontverter.convert(out, 'truetype') : out;
  const f = opentype.parse(toAB(Buffer.from(ttf)));
  const axes = (f.tables.fvar && f.tables.fvar.axes || []).map(a => `${a.tag} ${a.minValue}-${a.maxValue}`);
  const n = f.names;
  const has = APP.filter(c => f.charToGlyph(c).index !== 0);
  const lacks = APP.filter(c => f.charToGlyph(c).index === 0);
  const d = digitsReport(f);
  const r = {
    client: j.client, file: j.out.split('/').slice(-1)[0], family: j.family, key: j.key, from: j.from, use: j.use,
    bytes: out.length, sha256: sha(out), axes, glyphs: f.numGlyphs,
    ps: n.postScriptName && n.postScriptName.en, fam: n.fontFamily && n.fontFamily.en, sub: n.fontSubfamily && n.fontSubfamily.en,
    typoFam: n.preferredFamily && n.preferredFamily.en, weightClass: f.tables.os2.usWeightClass, italicBit: !!(f.tables.os2.fsSelection & 1),
    upm: f.unitsPerEm, hhea: [f.tables.hhea.ascender, f.tables.hhea.descender, f.tables.hhea.lineGap],
    gsub: features(f), digitsDefault: d.def, digitsTnum: d.tn, has, lacks,
    hinted: !!(f.tables.fpgm || f.tables.prep || (f.tables.cvt && f.tables.cvt.length))
  };
  results.push(r);
  console.log('\n' + j.client, r.file, r.bytes, 'B', r.sha256);
  console.log('  axes:', axes.join(', ') || 'none (static)', '| glyphs', r.glyphs, '| ps', r.ps, '| family', r.fam, '/', r.sub, '| typo', r.typoFam, '| wght class', r.weightClass, '| italic bit', r.italicBit, '| hinted', r.hinted);
  console.log('  upm', r.upm, 'hhea', r.hhea.join(' / '), '| gsub', r.gsub.join(' '));
  console.log('  digits default', JSON.stringify(r.digitsDefault), 'tnum', JSON.stringify(r.digitsTnum));
  console.log('  has', has.join(' '), '| lacks (falls back)', lacks.join(' '));
  if (WRITE) { mkdirSync(j.out.split('/').slice(0, -1).join('/'), { recursive: true }); writeFileSync(j.out, out); }
}
const webTotal = results.filter(r => r.client === 'web').reduce((s, r) => s + r.bytes, 0);
const natTotal = results.filter(r => r.client === 'native').reduce((s, r) => s + r.bytes, 0);
console.log('\nweb total', webTotal, 'B (each @font-face family is budgeted apart at 120,000; all three together also fit)', '| native total', natTotal, 'B');

const today = new Date().toISOString().slice(0, 10);
const J = {
  vibe: 'iron-age',
  note: 'One file for both clients, byte-identical in web vibes/iron-age/fonts/FONTS.json and native assets/vibes/iron-age/FONTS.json. Archivo (the text face) is v1\'s and is not listed: this vibe adds only Besley.',
  families: [{
    family: 'Besley',
    designer: 'Owen Earl (name ID 9 of every source file; METADATA.pb)',
    version: 'Version 4.000 (name ID 5 of every source file), upstream commit ' + COMMIT,
    source_repo: 'https://github.com/indestructible-type/Besley',
    commit: COMMIT,
    licence: 'SIL Open Font License 1.1',
    licence_confirmed_from: [
      { file: 'OFL.txt', url: RAW + 'OFL.txt', sha256: sha(src['OFL.txt']), finding: 'OFL 1.1 text; header declares no Reserved Font Name' },
      { file: 'METADATA.pb (google/fonts ofl/besley, main as fetched ' + today + ')', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/besley/METADATA.pb', sha256: sha(Buffer.from(meta)), finding: 'license: "OFL"; source repository_url https://github.com/indestructible-type/Besley (google/fonts ships an older commit, eb8b1b7, wght-only; these files are upstream ' + COMMIT.slice(0, 7) + ', which adds the wdth axis)' }
    ],
    copyright: copyright,
    reserved_font_name: null,
    retrieved: today,
    retrieved_with: 'tools/fetch.mjs (V59 §14 hosts)',
    sources: Object.entries(EXPECT).filter(([f]) => f !== 'OFL.txt').map(([f, [p, s]]) => ({ file: decodeURIComponent(p.split('/').pop()), url: RAW + p, bytes: src[f].length, sha256: s })),
    subset: {
      tool: 'subset-font ' + ver('subset-font') + ' (harfbuzzjs ' + ver('harfbuzzjs') + ' hb-subset; fontverter ' + ver('fontverter') + ' for woff2), run by tools/ia-v-fonts.mjs',
      unicodes: 'Google Fonts latin: U+0020-007E, U+00A0-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+2248, U+FEFF, U+FFFD (digits face: 0-9 , . ≈ space)',
      layout_features: 'all kept', names: 'web: hb-subset default (IDs 0-6); native: every record, IDs 0-25', checked_with: 'opentype.js ' + ver('opentype.js') + ' on the output bytes (woff2 decompressed)'
    },
    files: results.map(r => ({
      client: r.client, path: r.client === 'web' ? 'vibes/iron-age/fonts/' + r.file : 'assets/fonts/Besley/' + r.file,
      ...(r.family ? { css_family: r.family } : { native_key: r.key }),
      from: r.from, bytes: r.bytes, sha256: r.sha256, axes: r.axes.length ? r.axes : 'static',
      postscript_name: r.ps, weight_class: r.weightClass, italic: r.italicBit, use: r.use,
      lacks: r.lacks
    })),
    totals: { web_bytes: webTotal, web_budget_per_family: 120000, native_bytes: natTotal, native_static_ttfs: 3, native_limit: 4 }
  }]
};
const json = JSON.stringify(J, null, 2) + '\n';
if (WRITE) {
  mkdirSync(NATJ, { recursive: true }); mkdirSync(NAT, { recursive: true });
  writeFileSync(WEB + 'OFL.txt', src['OFL.txt']); writeFileSync(NAT + 'OFL.txt', src['OFL.txt']);
  writeFileSync(WEB + 'FONTS.json', json); writeFileSync(NATJ + 'FONTS.json', json);
  console.log('written: web fonts + OFL.txt + FONTS.json; native TTFs + OFL.txt; native FONTS.json');
}
