// r3: engine paint() for every baked hex, resolved through the engine :root,
// against the hex itself (what rack-v58 painted).
import { paint } from '/Users/micahflunker/dev/vibes-night/wt/web-engine/vibe.js';
import { load, rootMap, subst } from './r3css-lib.mjs';
const root = rootMap(load('/Users/micahflunker/dev/vibes-night/wt/web-engine/rack.css'));
const hexes = ['#D6252B', '#2E7FD9', '#F0BE1E', '#2AA85C', '#E8E5DE', '#A8AEB8', '#d6252b', '#2e7fd9', '#f0be1e', '#2aa85c', '#e8e5de', '#a8aeb8', '#8d939f', 'var(--dim)', '#141414', '#14161a', '#fff'];
let bad = 0;
for (const h of hexes) {
  const p = paint(h);
  const r = subst(p, n => root.get(n)).value;
  const ok = r.toLowerCase() === h.toLowerCase() || (h.startsWith('var(') && p === h);
  if (!ok) bad++;
  console.log((ok ? 'ok  ' : 'BAD ') + h + ' -> ' + p + ' -> ' + r);
}
console.log(bad ? bad + ' BAD' : 'all equal');
