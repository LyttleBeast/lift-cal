// e2-icons.mjs — does vibe.js iconHtml() reproduce, character for character,
// the innerHTML each site wrote at 928a65e? And do the element sites' attribute
// lists match? node e2-icons.mjs <engineTree> <baseTree>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [ENG, BASE] = process.argv.slice(2);
const V = await import(pathToFileURL(join(ENG, 'vibe.js')).href);
const base = f => readFileSync(join(BASE, f), 'utf8');
// The string expression after `<lhs>.innerHTML =`, up to its semicolon, evaluated.
function innerAt(file, lhs, nth = 0) {
  const src = base(file);
  let i = -1;
  for (let k = 0; k <= nth; k++) i = src.indexOf(lhs + '.innerHTML =', i + 1);
  const expr = src.slice(i + (lhs + '.innerHTML =').length, src.indexOf(';\n', i));
  return Function('return (' + expr + ')')();
}
let fails = 0;
const eq = (a, b, m) => { if (a === b) console.log('  ok  ' + m); else { fails++; console.log('  XX  ' + m + '\n      got  ' + a + '\n      want ' + b); } };
eq(V.iconHtml('gear'), innerAt('food.js', 'gear'), 'food.js gear');
eq(V.iconHtml('gear'), innerAt('steps.js', 'gear'), 'steps.js gear');
eq(V.iconHtml('gearYou', { ariaHidden: true }), innerAt('you.js', 'gear'), 'you.js gear');
eq(V.iconHtml('calendar'), innerAt('workout.js', 'cal'), 'workout.js calendar');
// coach-ui: the attributes it set, then its innerHTML
const cu = base('coach-ui.js');
const bubblePath = /s\.innerHTML = '(<path[^']*)';/.exec(cu)[1];
const want = (w, inner) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
eq(V.iconHtml('bubble', { ariaHidden: true }), want('1.9', bubblePath), 'coach-ui bubble');
const lockM = /s\.innerHTML = '(<rect[^']*)' \+\s*\(pro \? '([^']*)' : '([^']*)'\);/.exec(cu);
eq(V.iconHtml('unlock', { ariaHidden: true }), want('1.9', lockM[1] + lockM[2]), 'coach-ui lock (pro, open)');
eq(V.iconHtml('lock', { ariaHidden: true }), want('1.9', lockM[1] + lockM[3]), 'coach-ui lock (shut)');
// food.js icon(name, width)
const fj = base('food.js');
const paths = Function('return ' + /const ICON_PATHS = (\{[\s\S]*?\n\});/.exec(fj)[1])();
for (const [name, ds] of Object.entries(paths)) for (const w of [undefined, '1.6', '2.6']) {
  const inner = ds.map(d => '<path d="' + d + '"/>').join('');
  const svg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || '1.8') + '" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  eq(V.iconHtml(name, w ? { stroke: w } : undefined), svg, `food.js icon('${name}'${w ? ", '" + w + "'" : ''})`);
}
// paint
const P = V.paint;
for (const [a, b] of [['#d6252b', 'var(--p-red)'], ['#D6252B', 'var(--p-red)'], ['#2E7FD9', 'var(--p-blue)'], ['#f0be1e', 'var(--p-yellow)'],
  ['#2AA85C', 'var(--p-green)'], ['#e8e5de', 'var(--p-white)'], ['#A8AEB8', 'var(--p-chrome)'], ['#8d939f', 'var(--steel)'],
  ['var(--dim)', 'var(--dim)'], [undefined, undefined], ['#123456', '#123456']]) eq(P(a), b, `paint(${a})`);
console.log(fails ? fails + ' FAIL' : 'ALL OK');
process.exit(fails ? 1 : 0);
