// Round-2 review (js lens): paint() over every hex the pinned modules bake,
// resolved through the engine's rack.css :root, against the hex itself.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const ENG = '/Users/micahflunker/dev/vibes-night/wt/web-engine/';
const { paint, paintSvg } = await import(pathToFileURL(ENG + 'vibe.js').href);
const css = readFileSync(ENG + 'rack.css', 'utf8');
const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
const tok = {};
for (const m of root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tok[m[1]] = m[2].trim();
const res = v => { const m = /^var\((--[\w-]+)\)$/.exec(v); return m ? tok[m[1]] : v; };
const { GROUPS } = await import(pathToFileURL(ENG + 'exercises.js').href);
const A = await import(pathToFileURL(ENG + 'analytics.js').href).catch(e => ({ err: e }));
const hexes = new Set();
for (const g of Object.values(GROUPS)) hexes.add(g.color);
for (const g of ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'mobility', undefined, 'constructor', '__proto__'])
  if (A.groupColor) hexes.add(A.groupColor(g));
for (const h of ['#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8', '#8d939f', 'var(--dim)', undefined, '', 'constructor', '__proto__', 'toString'])
  hexes.add(h);
let bad = 0;
for (const h of hexes) {
  const p = paint(h);
  const r = res(p);
  const same = typeof h === 'string' && /^#/.test(h) ? String(r).toLowerCase() === h.toLowerCase() : p === h;
  if (!same) bad++;
  console.log(same ? 'ok  ' : 'DIFF', JSON.stringify(h), '->', JSON.stringify(p), '=', JSON.stringify(r));
}
if (A.err) console.log('analytics import failed:', A.err.message);
console.log(bad ? bad + ' differ' : 'all same');
