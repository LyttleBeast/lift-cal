// Round-2 review (js lens): the module graph from app.js — how many modules,
// and how deep the import waterfall is (a cold load discovers each level only
// after the one above it has arrived) — base vs engine.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
const T = { base: '/Users/micahflunker/dev/vibes-night/wt/web-base/', eng: '/Users/micahflunker/dev/vibes-night/wt/web-engine/' };
function graph(root) {
  const deps = new Map();
  const load = f => {
    if (deps.has(f)) return;
    deps.set(f, []);
    const src = readFileSync(join(root, f), 'utf8');
    const out = [];
    for (const m of src.matchAll(/^\s*(?:import|export)\s[^;]*?from\s*['"](\.[^'"]+)['"]/gm)) out.push(normalize(join(dirname(f), m[1])));
    for (const m of src.matchAll(/^\s*import\s*['"](\.[^'"]+)['"]/gm)) out.push(normalize(join(dirname(f), m[1])));
    deps.set(f, out.filter(x => existsSync(join(root, x))));
    deps.get(f).forEach(load);
  };
  load('app.js');
  // BFS level = the round trip in which a cold load first discovers the module.
  const level = new Map([['app.js', 1]]); const q = ['app.js'];
  while (q.length) { const f = q.shift(); for (const d of deps.get(f)) if (!level.has(d)) { level.set(d, level.get(f) + 1); q.push(d); } }
  return { n: deps.size, depth: Math.max(...level.values()), level };
}
const b = graph(T.base), e = graph(T.eng);
console.log('base  : modules', b.n, 'waterfall levels', b.depth);
console.log('engine: modules', e.n, 'waterfall levels', e.depth);
for (const [f, l] of e.level) if (!b.level.has(f)) console.log('  new', f, 'at level', l);
for (const [f, l] of e.level) if (b.level.has(f) && b.level.get(f) !== l) console.log('  moved', f, b.level.get(f), '->', l);
