// Side check: every innerHTML icon site the engine rewrote, base literal vs
// the engine's iconHtml() with v1 (no DOM: def() falls back to v1).
import { readFileSync } from 'node:fs';
const BASE = '/Users/micahflunker/dev/vibes-night/wt/web-base/';
const { iconHtml } = await import('/Users/micahflunker/dev/vibes-night/wt/web-engine/vibe.js');
const lit = (file, anchor) => {
  const src = readFileSync(BASE + file, 'utf8');
  const i = src.indexOf(anchor); if (i < 0) throw new Error(file + ': anchor missing ' + anchor);
  const start = src.indexOf('=', i + anchor.length - 1) + 1;
  const end = src.indexOf(';', src.indexOf('</svg>', start));
  return new Function('return (' + src.slice(start, end).trim() + ')')();
};
const cases = [
  ['food.js gear', lit('food.js', "gear.setAttribute('aria-label', 'Fuel settings');\n  gear.innerHTML"), iconHtml('gear')],
  ['steps.js gear', lit('steps.js', "gear.setAttribute('aria-label', 'Step settings');\n  gear.innerHTML"), iconHtml('gear')],
  ['you.js gear', lit('you.js', "gear.setAttribute('aria-label', 'Settings');\n  gear.innerHTML"), iconHtml('gearYou', { ariaHidden: true })],
  ['workout.js calendar', lit('workout.js', "cal.title = 'Calendar';\n    cal.innerHTML"), iconHtml('calendar')],
];
let bad = 0;
for (const [k, a, b] of cases) { const same = a === b; if (!same) bad++; console.log((same ? 'SAME ' : 'DIFF ') + k + (same ? '' : '\n  base:   ' + a + '\n  engine: ' + b)); }
process.exit(bad ? 1 : 0);
