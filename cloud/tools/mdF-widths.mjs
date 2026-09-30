// mdF-widths.mjs — Meet Day final (Phase D), read-only: each type preset's
// widest real strings at Meet Day's setting against the same string at v1's
// setting, both shaped by harfbuzz on the pinned Archivo[wdth,wght].ttf (the
// file v1's Google Archivo and Meet Day's self-hosted face are both cut from).
// A Meet Day string no wider than v1's cannot overflow a box v1's fits in.
// Tracking is applied as v1 and Meet Day set it (ls × size per glyph); caps
// are applied where v1's preset is upper: 1 (Meet Day's never are).
// Usage: node mdF-widths.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const hb = await require('harfbuzzjs');
const WT = '/Users/micahflunker/dev/vibes-night/wt/web-design2/vibes/defs/';
const V1 = (await import(WT + 'v1.js')).default;
const MD = (await import(WT + 'meet-day.js')).default;
const SRC = readFileSync('/Users/micahflunker/dev/vibes-night/tools/fonts/archivo/Archivo-wdth-wght.ttf');

const blob = hb.createBlob(SRC), face = hb.createFace(blob, 0);
const px = (text, p) => {
  const font = hb.createFont(face);
  font.setVariations({ wdth: p.wdth ?? 100, wght: p.wght ?? 400 });
  const s = p.upper ? text.toUpperCase() : text;
  const b = hb.createBuffer(); b.addText(s); b.guessSegmentProperties(); hb.shape(font, b, p.tnum ? 'tnum' : '');
  const j = b.json(); b.destroy(); font.destroy();
  const adv = j.reduce((a, g) => a + g.ax, 0) / 1000 * p.size;
  return adv + (p.ls || 0) * p.size * [...s].length;
};

const CASES = {
  statVal: ['1h 00m', '12,480', '58.3k', '1025.5'],
  kpiVal: ['12,480', '1,950', '191.8', '6,930'],
  headline: ['191.2', '0.9', '12,350'],
  timer: ['1:02:33', '25:00'],
  h1: ['September 2026', 'Session complete', 'Training log'],
  h2: ['Where this comes from', 'Compared with sessions like this', 'Estimate with a photo'],
  h3: ['How you’re doing', 'Weekly review', 'Rack noticed'],
  eyebrow: ['Against your targets', 'Compared with sessions like this', 'Against last week', 'Strongest lifts'],
  btn: ['+ Add Lifting Block', '+ Add exercise', 'Discard workout', 'Save as routine', 'See statistics', 'Weighed earlier?', 'Set total', '+ Set'],
  btnLg: ['Start workout', 'Finish', 'Save'],
  dockLbl: ['Weight', 'Train', 'Steps', 'Fuel', 'You'],
  fieldLbl: ['Target calories', 'Body weight', 'Exercise name'],
  statLbl: ['Working sets', 'Volume lb', '7-day avg', 'At this pace', 'Trend today', 'lb / week'],
  chip: ['Last 30 days', 'Shoulders', 'Bodyweight'],
  segBtn: ['Month', 'Week', 'Year', '90 days'],
  youGreet: ['Good afternoon,', 'Good evening,'],
  setInput: ['1025.5', '185'],
  note: ['Swipe a set left to delete it'],
  meta: ['Member since Aug 21, 2025  ·  400 days', 'rolling 7 days']
};
const fmt = x => x.toFixed(1).padStart(6);
let wider = 0;
for (const [role, strs] of Object.entries(CASES)) {
  const a = V1.type[role] || V1.type.note, b = MD.type[role];
  for (const s of strs) {
    const v = px(s, a), m = px(s, b);
    const flag = m > v + 0.05 ? `  WIDER by ${(m - v).toFixed(1)} (${((m / v - 1) * 100).toFixed(0)}%)` : '';
    if (flag) wider++;
    console.log(`${role.padEnd(9)} ${JSON.stringify(s).padEnd(38)} v1 ${fmt(v)}  meet-day ${fmt(m)}${flag}`);
  }
}
// loadNum: a function of the call site's size; same size both sides
for (const [s, size] of [['12,350', 40], ['24,000', 48], ['34', 34], ['2,700', 32]]) {
  const v = px(s, { ...V1.loadNum, size }), m = px(s, { ...MD.loadNum, size });
  console.log(`loadNum   ${JSON.stringify(s).padEnd(38)} v1 ${fmt(v)}  meet-day ${fmt(m)} (at ${size})${m > v ? '  WIDER' : ''}`);
  if (m > v) wider++;
}
console.log(`\n${wider} string(s) wider than v1's at the same site`);
