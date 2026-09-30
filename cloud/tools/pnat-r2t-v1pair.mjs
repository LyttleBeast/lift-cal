// Pnat round-2 theme lens: the T the app boots with (build(V1) inside theme.js)
// against the T a switch back to v1 puts on (build(defs/v1.js)), key for key,
// every function sampled. Uses the staged copies from pnat-r2t-grid.mjs.
import { pathToFileURL } from 'node:url';
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r2-theme/grid/';
const E = await import(pathToFileURL(TMP + 'engine-theme.mjs').href);
const V1 = (await import(pathToFileURL(TMP + 'v1.mjs').href)).default;
const TE = E.default, TD = E.build(V1);
const J = v => JSON.stringify(v, (k, x) => (typeof x === 'function' ? 'FN' : x === undefined ? '__u' : x));
const bad = [];
const keysE = Object.keys(TE), keysD = Object.keys(TD);
if (J(keysE) !== J(keysD)) bad.push('top-level keys differ: ' + J(keysE) + ' vs ' + J(keysD));
for (const k of keysE) {
  const a = TE[k], b = TD[k];
  if (typeof a === 'function') continue;
  if (J(a) !== J(b)) bad.push(k + ': ' + J(a).slice(0, 300) + '  vs  ' + J(b).slice(0, 300));
  if (a && typeof a === 'object') for (const kk of Object.keys(a)) if (J(Object.keys(a[kk] || {})) !== J(Object.keys((b || {})[kk] || {}))) bad.push(k + '.' + kk + ' key order');
}
const NAMES = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'fallback', 'cardio', '', null, undefined, 'constructor', 'toString', '__proto__',
  'fuel', 'weight', 'train', 'steps', 'water', 'prot', 'carb', 'fat', 'all', 'default', 'high', 'medium', 'low', 0, 1, 2, 3, 4, 5, 6, -1,
  'youHero', 'coachCard', 'startWorkout', 'summaryHero', 'fuelSummary', 'stepsToday', 'weightLog'];
for (const f of ['group', 'groupPlate', 'plate', 'subject', 'kpi', 'image'])
  for (const n of NAMES) { const a = J(TE[f](n)), b = J(TD[f](n)); if (a !== b) bad.push(f + '(' + J(n) + '): ' + a + ' vs ' + b); }
for (const o of [undefined, {}, { radius: 'sm' }, { radius: 'pill' }, { radius: 7 }, { border: false }, { radius: 'nope' }])
  { const a = J(TE.cardSkin(o)), b = J(TD.cardSkin(o)); if (a !== b) bad.push('cardSkin(' + J(o) + '): ' + a + ' vs ' + b); }
for (const k of Object.keys(TE.alpha)) for (const x of [0, 0.07, 0.5, 1]) if (TE.alpha[k](x) !== TD.alpha[k](x)) bad.push('alpha.' + k);
console.log('differences', bad.length);
bad.slice(0, 30).forEach(x => console.log('  ' + x));
console.log('top-level keys', keysE.length, keysE.join(' '));
