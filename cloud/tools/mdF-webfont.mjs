// mdF-webfont.mjs — Meet Day final (Phase D): measure the two self-hosted web
// faces the spec names, and prove web/native parity on the figures.
//   meet-day-archivo  latin variable woff2 of the pinned google/fonts
//                     Archivo[wdth,wght].ttf, cut to wdth 62-100, wght 400-800
//   meet-day-num      the same, digits 0-9 only, wdth 62-75, wght 700-800
// Source: tools/fonts/archivo/Archivo-wdth-wght.ttf (the §7.1 pinned file,
// sha256 0e094a7d…, fetched by tools/fetch.mjs, VIBES-LOG line 41).
// Writes the two measured files ONLY under design/meet-day/final/ (scratch;
// Phase V rebuilds them into the vibe folder with its own recorded script).
// Usage: node mdF-webfont.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const subsetFont = require('subset-font');
const hb = await require('harfbuzzjs');
const sha = b => createHash('sha256').update(b).digest('hex');

const SRC = '/Users/micahflunker/dev/vibes-night/tools/fonts/archivo/Archivo-wdth-wght.ttf';
const OUT = '/Users/micahflunker/dev/vibes-night/design/meet-day/final/';
const NAT = '/Users/micahflunker/dev/vibes-night/design/meet-day/scratch-A/';
mkdirSync(OUT, { recursive: true });

// The same latin range Chalk shipped (Google's latin slice, plus ← ↑ → ↓,
// −, ∕, ≈, ≤ ≥ that Rack's figures and deltas print).
const RANGES = [[0x20, 0xff], [0x131, 0x131], [0x152, 0x153], [0x2bb, 0x2bc], [0x2c6, 0x2c6], [0x2da, 0x2da], [0x2dc, 0x2dc],
  [0x304, 0x304], [0x308, 0x308], [0x329, 0x329], [0x2000, 0x206f], [0x20ac, 0x20ac], [0x2122, 0x2122], [0x2190, 0x2193],
  [0x2212, 0x2212], [0x2215, 0x2215], [0x2248, 0x2248], [0x2264, 0x2265], [0xfeff, 0xfeff], [0xfffd, 0xfffd]];
let TEXT = '';
for (const [a, b] of RANGES) for (let c = a; c <= b; c++) TEXT += String.fromCodePoint(c);

const src = readFileSync(SRC);
console.log(`source ${SRC.split('/').pop()} ${src.length} B sha256 ${sha(src)}`);

const builds = [
  ['meet-day-archivo-latin.woff2', TEXT, { wdth: { min: 62, max: 100 }, wght: { min: 400, max: 800 } }],
  ['meet-day-num.woff2', '0123456789', { wdth: { min: 62, max: 75 }, wght: { min: 700, max: 800 } }]
];
const files = {};
for (const [name, text, axes] of builds) {
  const woff2 = await subsetFont(src, text, { targetFormat: 'woff2', variationAxes: axes });
  const sfnt = await subsetFont(src, text, { targetFormat: 'sfnt', variationAxes: axes });
  writeFileSync(OUT + name, woff2);
  files[name] = sfnt;
  console.log(`${name}: ${woff2.length} B woff2 (${(woff2.length / 1024).toFixed(1)} KiB) sha256 ${sha(woff2)}; axes ${JSON.stringify(axes)}`);
}

// Shape with harfbuzz at a width and weight: advances in font units.
const adv = (buf, text, feats, vars) => {
  const blob = hb.createBlob(buf), face = hb.createFace(blob, 0), font = hb.createFont(face);
  if (vars) font.setVariations(vars);
  const b = hb.createBuffer(); b.addText(text); b.guessSegmentProperties(); hb.shape(font, b, feats);
  const j = b.json(); const glyphs = j.map(g => g.g);
  b.destroy(); font.destroy(); face.destroy(); blob.destroy();
  return { ax: j.map(g => g.ax), glyphs };
};
const lat = files['meet-day-archivo-latin.woff2'], num = files['meet-day-num.woff2'];
const digits = '0123456789';
for (const [label, buf, vars] of [['web latin @ wdth 62.5 · 800', lat, { wdth: 62.5, wght: 800 }], ['web num @ wdth 62.5 · 800', num, { wdth: 62.5, wght: 800 }],
  ['web latin @ wdth 75 · 700', lat, { wdth: 75, wght: 700 }], ['web num @ wdth 75 · 700', num, { wdth: 75, wght: 700 }],
  ['web latin @ wdth 100 · 400 (body, the Coach card)', lat, { wdth: 100, wght: 400 }], ['pinned source @ wdth 100 · 400', src, { wdth: 100, wght: 400 }],
  ['web latin @ wdth 100 · 600 (the Coach card line)', lat, { wdth: 100, wght: 600 }], ['pinned source @ wdth 100 · 600', src, { wdth: 100, wght: 600 }]]) {
  const d = adv(buf, digits, 'tnum,-kern', vars), p = adv(buf, digits, '-kern', vars);
  console.log(`${label}: tnum ${[...new Set(d.ax)].join('/')} (uniform ${new Set(d.ax).size === 1}); default ${p.ax.join(',')}`);
}
for (const [label, f] of [['native ExtraCondensed-ExtraBold (latin subset)', 'ArchivoExtraCondensed-ExtraBold.latin.ttf'], ['native Condensed-Bold (latin subset)', 'ArchivoCondensed-Bold.latin.ttf']]) {
  const buf = readFileSync(NAT + f);
  const d = adv(buf, digits, 'tnum,-kern');
  console.log(`${label}: tnum ${[...new Set(d.ax)].join('/')}`);
}
// A card-line sample at wdth 100: the web face must advance exactly as the
// pinned source (the file v1's Google Archivo is cut from) does.
const sample = 'New best on Conventional Deadlift — estimated max 362 lb. The trend is pointing down.';
for (const [w, g] of [[100, 400], [100, 600]]) {
  const a = adv(lat, sample, '', { wdth: w, wght: g }).ax.reduce((x, y) => x + y, 0);
  const b = adv(src, sample, '', { wdth: w, wght: g }).ax.reduce((x, y) => x + y, 0);
  console.log(`card sample @ ${w} · ${g}: web ${a} vs pinned ${b} units (${a === b ? 'identical' : 'DIFFER'})`);
}
// Coverage of the signs Rack prints in figures and deltas
const need = ['−', '→', '↑', '↓', '≈', '±', '×', '·', '…', '‹', '›', '’', '°', '½'];
const cmap = adv(lat, need.join(''), '', { wdth: 62.5, wght: 800 }).glyphs;
console.log('latin face has ' + need.map((ch, i) => ch + (cmap[i] ? '' : '(MISSING)')).join(' '));
console.log('the widest figure strings at 62.5 · 800, in em: ' + ['12,480', '24,000', '1:02:33', '1025.5', '1h 00m', '315'].map(s =>
  s + ' ' + (adv(lat, s, 'tnum', { wdth: 62.5, wght: 800 }).ax.reduce((x, y) => x + y, 0) / 1000).toFixed(3)).join(' · '));
console.log('h1 "September 2026" at 75 · 700, em: ' + (adv(lat, 'September 2026', '', { wdth: 75, wght: 700 }).ax.reduce((x, y) => x + y, 0) / 1000).toFixed(3) +
  '; greeting "Good afternoon," em: ' + (adv(lat, 'Good afternoon,', '', { wdth: 75, wght: 700 }).ax.reduce((x, y) => x + y, 0) / 1000).toFixed(3));
