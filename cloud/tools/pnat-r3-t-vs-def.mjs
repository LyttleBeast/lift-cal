// Round-3: the engine's default T (theme.js V1) against build(defs/v1.js), key
// by key at every data path, and the key sets of both. A switch back to v1
// applies build(defs/v1.js), so any difference is a v1 that is not build 58.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/pnat-r3/grid';
mkdirSync(TMP, { recursive: true });
const src = readFileSync(ENG + '/src/ui/theme.js', 'utf8').replace("import { Platform } from 'react-native';",
  "const Platform = { OS: 'ios', select: o => o.ios };");
writeFileSync(TMP + '/eng2.mjs', src);
const E = await import(pathToFileURL(TMP + '/eng2.mjs').href);
const V1 = (await import(pathToFileURL(ENG + '/src/pure/vibes/defs/v1.js').href)).default;
const a = E.default, b = E.build(V1, { images: {}, fit: undefined });
const diffs = [];
const walk = (x, y, p) => {
  if (typeof x === 'function' || typeof y === 'function') {
    if (typeof x !== typeof y) diffs.push(p + ': ' + typeof x + ' vs ' + typeof y);
    return;
  }
  if (x && y && typeof x === 'object' && typeof y === 'object') {
    const kx = Object.keys(x), ky = Object.keys(y);
    if (kx.join() !== ky.join()) diffs.push(p + ' keys: ' + kx.join() + ' | ' + ky.join());
    for (const k of new Set([...kx, ...ky])) walk(x[k], y[k], p + '.' + k);
    return;
  }
  if (!Object.is(x, y)) diffs.push(p + ': ' + JSON.stringify(x) + ' vs ' + JSON.stringify(y));
};
walk(a, b, 'T');
// the functions that are not v1's table-free ones, sampled
const S = ['pRed', 'accent', 'nope', 'fallback', 'constructor', 'toString', '__proto__', 'all', 'prot', 'chest', 'legs', undefined, null, 0, 1, 5, 6, -1];
for (const f of ['group', 'groupPlate', 'plate', 'subject', 'kpi', 'image']) for (const s of S) {
  let x, y; try { x = a[f](s); } catch (e) { x = 'THREW ' + e.message; } try { y = b[f](s); } catch (e) { y = 'THREW ' + e.message; }
  if (!Object.is(x, y) && JSON.stringify(x) !== JSON.stringify(y)) diffs.push(f + '(' + String(s) + '): ' + String(x) + ' vs ' + String(y));
}
for (const o of [undefined, {}, { radius: 'sm' }, { radius: 'pill' }, { border: false }, { radius: 7 }])
  if (JSON.stringify(a.cardSkin(o)) !== JSON.stringify(b.cardSkin(o))) diffs.push('cardSkin ' + JSON.stringify(o));
console.log('differences', diffs.length);
diffs.slice(0, 60).forEach(d => console.log('  ' + d));
