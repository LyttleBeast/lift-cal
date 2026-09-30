// r02-px.mjs — research track 2: sample colours (5x5 mean) from study screenshots converted
// to PNG by sips. Local files only; no network. JPEG-sourced, so expect ±2–4 per channel.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/micahflunker/dev/vibes-night/tools/');
const { PNG } = require('pngjs');
const D = '/Users/micahflunker/dev/vibes-night/research/refs/_px/';
const pts = [
  ['mfw-05', 'MF Workouts page', 480, 430], ['mfw-05', 'MF Workouts card', 270, 915], ['mfw-05', 'MF Workouts orange bar', 265, 1000], ['mfw-05', 'MF Workouts lower page', 480, 850],
  ['mfw-03', 'MF Workouts logger page', 450, 470], ['mfw-03', 'MF Workouts input box', 300, 648], ['mfw-03', 'MF Workouts RIR0 chip', 115, 895], ['mfw-03', 'MF Workouts keypad bg', 190, 1043],
  ['mf-05', 'MacroFactor page', 450, 470], ['mf-05', 'MacroFactor row card', 380, 556], ['mf-05', 'MacroFactor yellow bar', 170, 705], ['mf-05', 'MacroFactor target zone', 400, 705],
  ['bc-04', 'Boostcamp sheet', 450, 580], ['bc-04', 'Boostcamp input', 368, 832], ['bc-04', 'Boostcamp Finish yellow', 455, 440], ['bc-04', 'Boostcamp check yellow', 494, 808],
  ['fb-06', 'Fitbod page', 450, 440], ['fb-06', 'Fitbod card', 330, 872], ['fb-04', 'Fitbod pink button', 360, 1080],
  ['sv-02', 'Strava page', 300, 1000], ['sv-02', 'Strava tab bar', 240, 1142], ['sv-02', 'Strava orange icon', 135, 1093],
  ['af-01', 'Apple Fitness page', 400, 355], ['af-01', 'Apple Fitness tile', 250, 690],
  ['wh-03', 'WHOOP ground', 150, 420], ['wh-03', 'WHOOP recovery green', 351, 459], ['wh-03', 'WHOOP list panel', 400, 845],
  ['ap-03', 'Alpha Progression page', 300, 1050], ['ap-03', 'Alpha Progression rec row', 160, 740], ['ap-03', 'Alpha Progression check green', 462, 676],
  ['ap-04', 'Alpha Progression page', 300, 500], ['ap-04', 'Alpha Progression grouped cell', 450, 625], ['ap-04', 'Alpha Progression Save blue', 180, 1143],
  ['st-01', 'Strong page', 300, 700], ['st-01', 'Strong done row', 272, 876], ['st-01', 'Strong Finish blue', 440, 468],
  ['hv-02', 'Hevy done row', 300, 600],
];
const cache = {};
const hex = v => v.toString(16).padStart(2, '0');
for (const [f, label, x, y] of pts) {
  const png = cache[f] ||= PNG.sync.read(readFileSync(D + f + '.png'));
  let r = 0, g = 0, b = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const i = ((y + dy) * png.width + (x + dx)) * 4;
    r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++;
  }
  const c = [r, g, b].map(v => Math.round(v / n));
  console.log(`${label.padEnd(34)} #${c.map(hex).join('')}  (${f} @${x},${y})`);
}
