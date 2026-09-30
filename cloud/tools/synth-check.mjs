// Phase R synthesis: cross-track checks. Read-only; prints numbers only.
// Uses track 4's colour-lib (WCAG contrast, CIEDE2000, Machado CVD).
import { contrast, lum, dE, simulate, hexToRgb } from './colour/colour-lib.mjs';

const hsl = hex => {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  let h = 0;
  if (d) h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  if (h < 0) h += 360;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, s * 100, l * 100];
};
const f = n => n.toFixed(2);

console.log('\n== A. Light grounds vs track 1 AI creams (dE00; N3 literal band = all ch >= 0xEE and 5 <= R-B <= 24)');
const creams = ['#f4f1ea', '#f7f1e4', '#f5f1e8', '#faf8f5', '#f0ebe0'];
const lights = {
  'chalk rack (T4)': '#e8ebeb', 'whiteboard rack (T4)': '#eef0f0', 'paper rack (T4)': '#f4f2ec', 'paper bar (T4)': '#fdfcf9',
  'IA cream rack (T4)': '#ede3cc', 'IA cream bar (T4)': '#f6efdd', 'IA stock (T7)': '#f8efe0', 'IA stock-2 (T7)': '#f1e4d2',
  'IA stock-3 (T7)': '#e7d8c4', 'MeetDay card paper (T6)': '#f3f2ee', 'LoC Trocadero margin, calibrated (T7)': '#d8ccbc',
  'LoC Cyr border (T7)': '#e2d1ba', 'Bornstein 1889 p9 (T7)': '#ebd7b4'
};
for (const [k, v] of Object.entries(lights)) {
  const [r, g, b] = hexToRgb(v);
  const band = r >= 0xee && g >= 0xee && b >= 0xee && r - b >= 5 && r - b <= 24;
  const d = creams.map(c => dE(v, c));
  const m = Math.min(...d);
  console.log(`${k.padEnd(40)} ${v}  min dE00 to AI creams ${f(m)} (${creams[d.indexOf(m)]})  literal-band ${band ? 'IN' : 'out'}  R-B ${r - b}`);
}

console.log('\n== B. Accents: HSL hue/sat, dE00 to Claude clay #d97757/#d9622b, to indigo-500 #6366f1, violet-600 #7c3aed');
const accents = {
  'v1 yellow': '#f0be1e', 'chalk petrol': '#005f73', 'navy gold': '#e2b04a', 'navy aqua alt': '#7fe3f0', 'oxblood ice': '#a8d8ff',
  'paper ultramarine': '#10069f', 'club pink': '#ffb3c8', 'IA cream carmine (T4)': '#a8163f', 'IA ink rose (T4)': '#ff8fb0',
  'IA vermilion (T7)': '#b3392d', 'IA poster vermilion dark (T7)': '#dc604c', 'meet-day sodium (T4)': '#ff8f1a', 'whiteboard plum': '#9c1f5e'
};
for (const [k, v] of Object.entries(accents)) {
  const [h, s, l] = hsl(v);
  console.log(`${k.padEnd(30)} ${v}  hue ${h.toFixed(0).padStart(3)} sat ${s.toFixed(0).padStart(3)}% light ${l.toFixed(0).padStart(3)}%  clay ${f(dE(v, '#d97757'))}/${f(dE(v, '#d9622b'))}  indigo ${f(dE(v, '#6366f1'))} violet ${f(dE(v, '#7c3aed'))}  vs v1 ${f(dE(v, '#f0be1e'))}`);
}

console.log('\n== C. Dark grounds: relative luminance (track 1 N1 near-black threshold <= 0.014)');
const darks = { v1: '#14161a', navy: '#0b1a3e', oxblood: '#1a0f11', club: '#0e1813', 'IA ink (T4)': '#1a1209', 'IA poster ground (T7)': '#1b1611', 'meet-day (T4)': '#07080a', 'meet-day board (T6)': '#0b0b0b' };
for (const [k, v] of Object.entries(darks)) console.log(`${k.padEnd(24)} ${v}  lum ${lum(v).toFixed(4)}  ${lum(v) <= 0.014 ? 'near-black by N1' : 'above N1'}  dE00 to #0b0b0b ${f(dE(v, '#0b0b0b'))}  to #111111 ${f(dE(v, '#111111'))}`);

console.log('\n== D. Meet Day (track 6) tokens on its three surfaces');
const md = { board: '#0b0b0b', cell: '#161616', band: '#202020' };
const mdT = { lamp: '#f5f0e3', ink2: '#a8a295', ink3: '#8c8579', good: '#4be38a', bad: '#f03a3f', blue: '#2f88ea', yellow: '#f5c518', green: '#20b861', white: '#ece7da', chrome: '#a9afb8' };
for (const [k, v] of Object.entries(mdT)) console.log(`${k.padEnd(7)} ${v}  ` + Object.entries(md).map(([s, b]) => `${s} ${f(contrast(v, b))}`).join('  '));
console.log('good vs bad dE00 normal/deutan/protan:', ['normal', 'deutan', 'protan'].map(k => f(dE(simulate('#4be38a', k), simulate('#f03a3f', k)))).join(' / '));
console.log('lamp vs bad dE00 normal/deutan/protan:', ['normal', 'deutan', 'protan'].map(k => f(dE(simulate('#f5f0e3', k), simulate('#f03a3f', k)))).join(' / '));
console.log('meet-day sodium accent #ff8f1a vs legs #ffe14d / chest #ff5a3c (T4 plates) dE00 normal/deutan:', ['normal', 'deutan'].map(k => f(dE(simulate('#ff8f1a', k), simulate('#ffe14d', k))) + '|' + f(dE(simulate('#ff8f1a', k), simulate('#ff5a3c', k)))).join(' / '));

console.log('\n== E. Iron Age track 7 tokens: accent vs chest (R4 wants >= 10 dE00 from every data colour)');
console.log('T7 spot vermilion #b3392d == T7 chest plate #b3392d: dE00', f(dE('#b3392d', '#b3392d')));
console.log('T7 vermilion vs T4 Indian-red chest #82180c:', f(dE('#b3392d', '#82180c')), ' deutan', f(dE(simulate('#b3392d', 'deutan'), simulate('#82180c', 'deutan'))));
for (const [k, v] of Object.entries({ ink: '#241c17', 'ink-2': '#584e45', 'ink-3': '#71675d', vermilion: '#b3392d', ochre: '#876114', 'bottle-green': '#39603b', prussian: '#274f7a' }))
  console.log(`T7 ${k.padEnd(12)} ${v} on stock #f8efe0 ${f(contrast(v, '#f8efe0'))}  on T4 rack #ede3cc ${f(contrast(v, '#ede3cc'))}  on T4 bar #f6efdd ${f(contrast(v, '#f6efdd'))}  on calibrated #d8ccbc ${f(contrast(v, '#d8ccbc'))}`);
console.log('#ffffff on T7 stock #f8efe0 (status-bar seam):', f(contrast('#ffffff', '#f8efe0')));
