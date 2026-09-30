// Meet Day concept A: do the figures fit their cells? Advance widths (tnum on)
// of real v1 strings in the shipped statics, at the sizes the spec sets, against
// the cell each one sits in at 320 and 390 pt. usage: node mdA-fit.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const hb = await require('/Users/micahflunker/dev/vibes-night/tools/node_modules/harfbuzzjs');
const dir = '/Users/micahflunker/dev/vibes-night/design/meet-day/scratch-A/';
const load = f => { const buf = fs.readFileSync(dir + f); const blob = hb.createBlob(buf); const face = hb.createFace(blob, 0); return { font: hb.createFont(face), upm: face.upem }; };
const XC = load('ArchivoExtraCondensed-ExtraBold.latin.ttf'), CB = load('ArchivoCondensed-Bold.latin.ttf');
const w = (F, t, size, feat = 'tnum') => { const b = hb.createBuffer(); b.addText(t); b.guessSegmentProperties(); hb.shape(F.font, b, feat); const j = b.json(); b.destroy(); return j.reduce((s, g) => s + g.ax, 0) / F.upm * size; };
// digits proportional by default? (tnum must be on)
console.log('XC 0-9 default', w(XC, '0123456789', 1000, '').toFixed(0), 'tnum', w(XC, '0123456789', 1000).toFixed(0));
// Cells. The page is W wide; screen-pad 16 each side; a panel's inner padding 14;
// a board strip bleeds to the panel's edges and splits it into n cells with 2px
// gutters, each cell padded 10 each side.
const cell = (W, n, bleed = true) => { const inner = W - 32 - (bleed ? 0 : 28); return (inner - 2 * (n - 1)) / n - 20; };
const rows = [
  ['stat strip, 3 cells (statVal 28, XC)', XC, 28, ['58.3k', '1h 00m', '190.7', '191.8', 'Nov 30', '2 yr +', '112.2k', '48.4k', '−0.9', '+12%', '1,950'], n => cell(n, 3)],
  ['KPI 2x2 cell (kpiVal 30, XC) value alone', XC, 30, ['1,950', '191.8', '6,930', '2', '12,480'], n => cell(n, 2)],
  ['You headline (30, XC) in a panel', XC, 30, ['191.2', '1,950', '0.9', '–'], n => n - 32 - 28],
  ['Fuel hero (loadNum at 1.0 x 40 = 40, XC) beside its words', XC, 40, ['350', '1,350', '12,350'], n => (n - 32 - 28) * 0.45],
  ['Steps hero (48, XC)', XC, 48, ['6,000', '12,480', '24,000'], n => (n - 32 - 28) * 0.5],
  ['top-bar clock (timer 24, XC) in its inverted slot', XC, 24, ['25:00', '1:02:33', '12:45:10'], n => 84 - 16],
  ['rest pill time (timer 24, XC)', XC, 24, ['1:30', '12:00'], n => 64],
  ['set input (setInput 15, CB) in a 1fr column', CB, 15, ['185', '1025.5', '12'], n => ((n - 32 - 28) - 30 - 42 - 38 - 4 * 2) / 2 - 16],
  ['h1 (30, CB)', CB, 30, ['September 2026', 'Today', 'Weight', 'Steps', 'Great workout.'], n => n - 32 - 2 * 44 - 12],
  ['band head (eyebrow 13, CB) left of meta', CB, 13, ['Strongest lifts · all time', 'Compared with sessions like this', 'Last 7 days — working sets', 'Against your targets'], n => (n - 32 - 28) - 110],
  ['greeting (youGreet 30, CB) between avatar and gear', CB, 30, ['Good afternoon,', 'Christopher'], n => n - 32 - 52 - 36 - 24]
];
for (const [label, F, size, strings, avail] of rows) {
  for (const W of [320, 390]) {
    const a = avail(W);
    const worst = strings.map(s => [s, w(F, s, size)]).sort((x, y) => y[1] - x[1]);
    console.log(`${label} @${W}: room ${a.toFixed(0)} | widest ${worst[0][0]} ${worst[0][1].toFixed(1)} ${worst[0][1] <= a ? 'fits' : 'OVER'} | ` + worst.slice(1, 4).map(([s, v]) => `${s} ${v.toFixed(1)}`).join(', '));
  }
}
