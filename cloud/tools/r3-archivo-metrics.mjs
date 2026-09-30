// r3-archivo-metrics.mjs — track 3 research helper (read-only).
// Measures the static Archivo TTFs native ships: digit advances, tnum/lnum/zero/case/frac
// feature presence, x-height, cap height, and how many tabular digits fit a 358pt measure.
// Also lists any font files already under ~/dev/vibes-night (read-only walk).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/package.json');
const opentype = require('opentype.js');

const base = '/Users/micahflunker/dev/rack-mobile/node_modules/@expo-google-fonts/archivo';
const files = {
  400: `${base}/400Regular/Archivo_400Regular.ttf`,
  600: `${base}/600SemiBold/Archivo_600SemiBold.ttf`,
  700: `${base}/700Bold/Archivo_700Bold.ttf`,
  800: `${base}/800ExtraBold/Archivo_800ExtraBold.ttf`,
};

function toAB(buf) { return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength); }

for (const [w, p] of Object.entries(files)) {
  let f;
  try { f = opentype.parse(toAB(readFileSync(p))); } catch (e) { console.log(w, 'ERR', e.message); continue; }
  const upm = f.unitsPerEm;
  const os2 = f.tables.os2;
  const feats = new Set();
  const gsub = f.tables.gsub;
  if (gsub && gsub.features) for (const ft of gsub.features) feats.add(ft.tag);
  const adv = ch => { const g = f.charToGlyph(ch); return g ? g.advanceWidth : null; };
  const digits = '0123456789'.split('').map(adv);
  const uniq = [...new Set(digits)];
  console.log(`\n== Archivo ${w}  upm=${upm}  version=${f.names.version && f.names.version.en}`);
  console.log('  xHeight', os2.sxHeight, `(${(os2.sxHeight / upm).toFixed(3)} em)`, 'capHeight', os2.sCapHeight, `(${(os2.sCapHeight / upm).toFixed(3)} em)`);
  console.log('  hhea asc/desc', f.tables.hhea.ascender, f.tables.hhea.descender);
  console.log('  default digit advances', digits.join(','), uniq.length === 1 ? '(TABULAR by default)' : '(PROPORTIONAL by default)');
  console.log('  GSUB features', [...feats].sort().join(' '));
  // tnum substitution: find lookup for tnum and report substituted advance widths
  if (gsub && feats.has('tnum')) {
    try {
      const subs = f.substitution.getFeature('tnum', 'latn', 'dflt') || f.substitution.getFeature('tnum', 'DFLT', 'dflt');
      const map = new Map();
      if (subs) for (const s of subs) if (s.sub !== undefined && typeof s.sub === 'number') map.set(s.sub, s.by);
      const tn = '0123456789'.split('').map(ch => { const gi = f.charToGlyphIndex(ch); const to = map.has(gi) ? map.get(gi) : gi; return f.glyphs.get(to).advanceWidth; });
      console.log('  tnum digit advances', tn.join(','));
    } catch (e) { console.log('  tnum parse err', e.message); }
  }
  const others = { 'en-dash –': '–', 'em-dash —': '—', 'minus −': '−', 'times ×': '×', 'middot ·': '·', 'figure space': ' ', 'thin space': ' ', 'degree °': '°', 'percent %': '%', 'comma ,': ',', 'period .': '.', 'slash /': '/', 'space': ' ' };
  const o = [];
  for (const [k, ch] of Object.entries(others)) { const g = f.charToGlyph(ch); o.push(`${k}=${g && g.unicode !== undefined ? g.advanceWidth : 'MISSING'}`); }
  console.log('  ', o.join('  '));
  const d = uniq.length === 1 ? uniq[0] : Math.max(...digits);
  const sizes = [11, 13, 15, 17, 20, 22, 28, 34, 48, 64, 88];
  console.log('  digit width in pt at size / tabular digits per 358pt:', sizes.map(s => `${s}pt:${(d / upm * s).toFixed(2)}pt/${Math.floor(358 / (d / upm * s))}`).join('  '));
  // String widths (default features) for a few Rack-like strings at size 1em
  const strs = ['1,950', '191.2', '362 lb', '8 × 5', '100 × 5', '0.9 lb / week', 'Nov 30', '1h 00m', '48.5k'];
  console.log('  string widths (em, default features):', strs.map(s => `${s}=${(f.getAdvanceWidth(s, 1, { kerning: true }) ).toFixed(3)}`).join('  '));
}

// list font files already under vibes-night (read-only)
const root = '/Users/micahflunker/dev/vibes-night';
const found = [];
function walk(d, depth) {
  if (depth > 6) return;
  let ents; try { ents = readdirSync(d); } catch { return; }
  for (const e of ents) {
    if (e === 'node_modules' || e === '.git' || e === 'wt') continue;
    const p = join(d, e); let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, depth + 1);
    else if (/\.(ttf|otf|woff2?)$/i.test(e)) found.push(`${p} ${st.size}`);
  }
}
walk(root, 0);
console.log('\nfont files under vibes-night (excluding wt/, node_modules):');
for (const x of found) console.log('  ', x);
