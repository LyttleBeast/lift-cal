// Concept C (iron-age): the Coach card in Old Standard TT — build the advance table the way
// coach-view.js's CARD_FACE was built (1000ths of an em, no kerning, from the NATIVE TTFs that
// would ship: OldStandard-Bold for the line, OldStandard-Regular for the reason), then run the
// real rack-mobile coach-view.js textLines()/cardLayout() with and without it over a corpus.
// Read-only on both trees. Writes design/iron-age/concept-C/coach-face.json.
// node iac-coachfit.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const opentype = require('/Users/micahflunker/dev/vibes-night/tools/node_modules/opentype.js/dist/opentype.js');

const load = p => { const b = readFileSync(p); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const R = '/Users/micahflunker/dev/vibes-night/research/fonts/oldstandardtt/';
const bold = load(R + 'OldStandard-Bold.ttf'), reg = load(R + 'OldStandard-Regular.ttf');

// coach-view.js imports the store through its pure siblings, so load ONLY its card-fitting section,
// sliced verbatim from the file (CARD_H .. finishFit), which is self-contained.
const SRC = readFileSync('/Users/micahflunker/dev/rack-mobile/src/pure/coach-view.js', 'utf8');
const a0 = SRC.indexOf('export const CARD_H'), a1 = SRC.indexOf('/* ================================================================\n   THE CHIP\'S TARGET');
if (a0 < 0 || a1 < 0) { console.log('fit section not found'); process.exit(1); }
const TMP = '/Users/micahflunker/dev/vibes-night/tools/scratch-iac/';
mkdirSync(TMP, { recursive: true });
writeFileSync(TMP + 'coach-fit-slice.mjs', SRC.slice(a0, a1));
const CV = await import(pathToFileURL(TMP + 'coach-fit-slice.mjs').href);

const chars = CV.CARD_FACE.chars;
const adv = (f, ch) => { const g = f.charToGlyph(ch); return Math.round(g.advanceWidth * 1000 / f.unitsPerEm); };
// Concept C sets the whole card in OldStandard-Regular (its only text weight): both tables from it.
const face = { chars, line: [...chars].map(ch => adv(reg, ch)), why: [...chars].map(ch => adv(reg, ch)) };
const missing = [...chars].filter(ch => !reg.charToGlyph(ch).index);
// Only the two 10 pt rows move, to 11 pt (R4.2); their line boxes grow 14 -> 15, which at scale 1 changes
// neither the header (max(CARD_ICON 15, 15)) nor the go row (goX 18 dominates).
const metrics = { face, type: { title: { size: 11, lh: 15 }, goT: { size: 11, lh: 15 } } };
writeFileSync('/Users/micahflunker/dev/vibes-night/design/iron-age/concept-C/coach-face.json',
  JSON.stringify({ note: 'Concept C Coach metrics. Old Standard TT v3.000 (google/fonts ofl/oldstandardtt, OldStandard-Regular.ttf): line and why both from the Regular; 1000ths of an em, no kerning; same chars as CARD_FACE. pad 14 and border 1 unchanged. Regenerate from the vendored TTF with tools/lib/ttf-advance.mjs before shipping.', metrics }, null, 1));
console.log('layout at scale 1 / 1.6, You:', JSON.stringify(CV.cardLayout({ fontScale: 1 }).lines), '->', JSON.stringify(CV.cardLayout({ fontScale: 1 }, metrics).lines),
  '|', JSON.stringify(CV.cardLayout({ fontScale: 1.6 }).lines), '->', JSON.stringify(CV.cardLayout({ fontScale: 1.6 }, metrics).lines));
console.log('layout at scale 1 / 1.6, Train:', JSON.stringify(CV.cardLayout({ tight: true, fontScale: 1 }).lines), '->', JSON.stringify(CV.cardLayout({ tight: true, fontScale: 1 }, metrics).lines),
  '|', JSON.stringify(CV.cardLayout({ tight: true, fontScale: 1.6 }).lines), '->', JSON.stringify(CV.cardLayout({ tight: true, fontScale: 1.6 }, metrics).lines));

const corpus = [
  'Bench press is up 5 lb since last month.', 'Next time 185 × 5 on the squat.', 'Three sessions this week — legs twice, back once.',
  'You are eating about 2,150 kcal against 2,400 maintenance.', 'Great workout. New best on Incline Dumbbell Bench Press.',
  'Good work. Four sets of Romanian Deadlift at 225 lb.', 'Your squat has stalled for three weeks.', 'Rest a day: your legs were hit hard yesterday.',
  'Protein is short by 40 g on most days.', 'Chest has had no hard sets in ten days.', 'Weight is down 1.4 lb this week, on pace.',
  'Deadlift 315 × 3 last time; try 320 × 3.', 'Overhead press is flat at 115 lb since August.', 'Nine hard sets for back this week, your normal is 12.',
  '“Lighter week” — volume down a third, on purpose.', 'Pull-ups: 3 × 8 last session, 3 × 9 next.'
];
const reasons = ['Across your last six sessions, measured from your own sets.', 'Your three best sets at this weight, compared week on week.',
  'From the food days you logged, not a guess.', 'Estimated max 362 lb from 315 × 5 last Tuesday.'];
let worse = 0, better = 0, same = 0; const diffs = [], overBudget = [];
for (const width of [320, 375, 390, 430]) for (const fs of [1, 1.235, 1.353, 1.6]) for (const tight of [false, true]) {
  const L0 = CV.cardLayout({ tight, fontScale: fs }), L1 = CV.cardLayout({ tight, fontScale: fs }, metrics);
  const box = width - 2 * (CV.CARD_GUTTER + CV.CARD_PAD + CV.CARD_BORDER);
  for (const [k, list] of [['line', corpus], ['why', reasons]]) for (const t of list) {
    const size = CV.CARD_TYPE[k].size * L0.scale;
    const a = CV.textLines(t, k, size, box), b = CV.textLines(t, k, size, box, metrics);
    const cap = L1.lines[k] || 0;
    if (b > cap && a <= (L0.lines[k] || 0)) overBudget.push(`${width}pt ×${fs} ${tight ? 'Train' : 'You'} ${k} (budget ${cap}): "${t}" Archivo ${a} → Old Standard ${b}`);
    if (b > a) { worse++; diffs.push(`${width}pt ×${fs} ${tight ? 'Train' : 'You'} ${k}: "${t}" Archivo ${a} → Old Standard ${b}`); }
    else if (b < a) better++; else same++;
  }
}
console.log('CARD_FACE chars missing from Old Standard:', missing.length ? missing.join(' ') : 'none');
console.log(`line-count comparison over ${worse + better + same} cases: same ${same}, fewer lines in Old Standard ${better}, MORE lines in Old Standard ${worse}`);
for (const d of diffs.slice(0, 12)) console.log('  ' + d);
console.log(`cases that fit their line budget in Archivo but NOT in Old Standard: ${overBudget.length}`);
for (const d of overBudget) console.log('  ' + d);
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log('mean advance: line', mean(face.line).toFixed(1), 'vs Archivo 600', mean(CV.CARD_FACE.line).toFixed(1), '| why', mean(face.why).toFixed(1), 'vs Archivo 400', mean(CV.CARD_FACE.why).toFixed(1));
