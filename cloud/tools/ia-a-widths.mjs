// Iron Age A: advance widths (no kerning, as coach-view.js measures) of the longest strings the
// Besley roles carry, at the spec's sizes, on the native statics (wdth 100: native ignores width).
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const opentype = require('opentype.js');
const load = f => { const b = fs.readFileSync(f); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const EB = load('/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/Besley-ExtraBold.ttf');
const SB = load('/Users/micahflunker/dev/vibes-night/design/iron-age/scratch-a/fonts/Besley-SemiBold.ttf');
const IT = load('/Users/micahflunker/dev/vibes-night/design/iron-age/scratch-a/fonts/Besley-Italic.ttf');
const w = (font, s, pt, track = 0, upper = false) => { const t = upper ? s.toUpperCase() : s; let u = 0; for (const ch of t) u += font.charToGlyph(ch).advanceWidth; return u / font.unitsPerEm * pt + track * pt * (t.length - 1); };
const rows = [
  ['greeting line 1', EB, 'Good afternoon,', 28], ['greeting line 1', EB, 'Good afternoon,', 30], ['greeting line 1', EB, 'Good evening,', 30],
  ['masthead Train', EB, 'September 2026', 28], ['masthead Train', EB, 'November 2026', 28], ['masthead Fuel (past day)', EB, 'Wed, Sep 30', 28], ['masthead Fuel', EB, 'Today', 28],
  ['sheet title', EB, 'Where this comes from', 19], ['sheet title', EB, 'Daily targets', 19],
  ['section caps', SB, 'How you’re doing', 13, 0.10, true], ['section caps', SB, 'Weekly review', 13, 0.10, true], ['section caps', SB, 'Rack noticed', 13, 0.10, true],
  ['card head', SB, 'Against your targets', 15], ['card head', SB, 'Working sets by muscle · 64 sets', 15], ['card head', SB, 'Strongest lifts · all time', 15],
  ['italic meta', IT, 'rolling 7 days', 14], ['italic meta', IT, 'Member since Aug 21, 2025 · 400 days', 14],
  ['challenge figure (Fuel)', EB, '1,950', 40], ['challenge figure (Weight maint.)', EB, '≈ 2,450', 32], ['statement figure (You)', EB, '1,950', 28], ['statement figure (You)', EB, '191.2', 28],
  ['picker', EB, '315', 32],
];
for (const [what, font, s, pt, tr = 0, up = false] of rows) console.log(`${what.padEnd(34)} ${JSON.stringify(up ? s.toUpperCase() : s).padEnd(40)} ${pt}pt${tr ? ' +' + tr + 'em' : ''}: ${w(font, s, pt, tr, up).toFixed(1)} pt`);
// Archivo 800 reference for the same hero figure (v1 .load-num is wdth 118 on the web; native draws wdth 100)
const AR = load('/Users/micahflunker/dev/vibes-night/research/fonts/besley/upstream/Besley-ExtraBold.ttf');
