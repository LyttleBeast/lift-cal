// resolve-oxblood-navy.mjs — resolve the merge of main (Navy) into vibes/oxblood: every hunk keeps both
// vibes, in registry order (v1, chalk, navy, oxblood). Explicit per-hunk resolutions, no generic "take both".
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const W = '/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood/', N = '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood/';
const blocks = src => { const re = /<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> main\n/g; return [...src.matchAll(re)]; };
const resolve = (file, fns) => {
  let src = readFileSync(file, 'utf8'); const bs = blocks(src);
  if (bs.length !== fns.length) throw new Error(`${file}: ${bs.length} hunks, expected ${fns.length}`);
  let i = 0; src = src.replace(/<<<<<<< HEAD\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> main\n/g, (_, ours, theirs) => fns[i++](ours, theirs));
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(src)) throw new Error(file + ': markers left');
  writeFileSync(file, src); console.log('resolved', file, bs.length);
};
const both = (ours, theirs) => theirs + ours;
const entries = (ours, theirs) => theirs.replace(/\n$/, ',\n') + ours;   // VIBES: navy's line gains the comma
resolve(W + 'index.html', [
  (o, t) => { if (!/navy: '#0a183b'/.test(t) || !/oxblood: '#1a0f11'/.test(o)) throw new Error('THEME'); return t.replace("navy: '#0a183b' }", "navy: '#0a183b', oxblood: '#1a0f11' }"); },
  both,
]);
resolve(W + 'vibe.js', [(o, t) => {
  const imp = s => s.split('\n').filter(l => l.startsWith('import ')).join('\n');
  return imp(t) + '\n' + imp(o) + '\n' + t.slice(t.indexOf('\n\n'))
    .replace('navy: NAVY }', 'navy: NAVY, oxblood: OXBLOOD }').replace('navy: NAVY_ICONS }', 'navy: NAVY_ICONS, oxblood: OXBLOOD_ICONS }').replace(/^\n/, '');
}]);
resolve(W + 'vibes/defs/index.js', [entries]);
resolve(N + 'src/pure/vibes/defs/index.js', [entries]);
resolve(N + 'src/state/vibe.js', [both, (o, t) => t + '      };\n    }\n  },\n' + o]);
const webIdx = readFileSync(W + 'vibes/defs/index.js'), natIdx = readFileSync(N + 'src/pure/vibes/defs/index.js');
if (!webIdx.equals(natIdx)) throw new Error('index.js differs between trees');
const sha = createHash('sha256').update(natIdx).digest('hex');
resolve(N + 'tools/verify-vibes-verbatim.mjs', [
  (o, t) => t.replace("// icons/navy.js (only `spark`, the same two-wave ≈).\n",
    "// icons/navy.js (only `spark`, the same two-wave ≈). Oxblood: defs/oxblood.js,\n// and icons/oxblood.js (only `spark`, the same two-wave ≈); re-pinned when the\n// web's copy dropped the status band and gave the banners dark ink.\n")
    .replace(/'defs\/index\.js': '[0-9a-f]{64}'/, `'defs/index.js': '${sha}'`),
  entries,
]);
console.log('index.js sha256', sha);
