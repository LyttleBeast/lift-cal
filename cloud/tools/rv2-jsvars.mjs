// Round-2 review (js lens): every var(--name) the engine's JS and HTML spell
// (css-static reads only the stylesheets; a JS path no scene reaches could
// hold a misspelt token), each checked against the engine's :root, and the
// resolved value against what base wrote at the same place.
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const { rootOf } = await import(pathToFileURL('/Users/micahflunker/dev/vibes-night/wt/web-harness/report/btn-44/css-static.mjs').href);
const E = '/Users/micahflunker/dev/vibes-night/wt/web-engine/', B = '/Users/micahflunker/dev/vibes-night/wt/web-base/';
const rootE = rootOf(readFileSync(E + 'rack.css', 'utf8')), rootB = rootOf(readFileSync(B + 'rack.css', 'utf8'));
const files = [...readdirSync(E).filter(f => f.endsWith('.js') || f.endsWith('.html')), 'vibes/defs/index.js', 'vibes/defs/v1.js'];
const names = new Map();
for (const f of files) {
  readFileSync(E + f, 'utf8').split('\n').forEach((l, i) => {
    for (const m of l.matchAll(/var\(\s*(--[\w-]+)/g)) { if (!names.has(m[1])) names.set(m[1], []); names.get(m[1]).push(f + ':' + (i + 1)); }
  });
}
const LOCAL = new Set(['--kpi-rgb', '--fill']);
let bad = 0;
for (const [n, at] of names) {
  if (rootE.has(n) || LOCAL.has(n)) continue;
  bad++; console.log('NOT IN :root', n, at.slice(0, 6).join(' '));
}
console.log(names.size + ' names, ' + bad + ' not declared in the engine :root (outside the two local ones)');
// Tokens base did not have, used from JS: their value must equal what base wrote there.
for (const [n, at] of names) if (!rootB.has(n) && rootE.has(n)) {
  const js = at.filter(a => !a.startsWith('vibes/'));
  if (js.length) console.log('new token from JS', n, '=', rootE.get(n), 'at', js.join(' '));
}
