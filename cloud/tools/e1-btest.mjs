// E1 scratch: exercise vibes-css.mjs path B (and vibes-scope.mjs, colour-literals.mjs
// when present) on a throwaway copy of the tree with one fake vibe registered.
//   node e1-btest.mjs <tree>
import { mkdirSync, cpSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const TREE = process.argv[2];
const T = '/Users/micahflunker/dev/vibes-night/tmp/e1-btest';
rmSync(T, { recursive: true, force: true });
mkdirSync(join(T, 'tools-check'), { recursive: true });
for (const f of ['rack.css', 'auth.css', 'index.html']) cpSync(join(TREE, f), join(T, f));
cpSync(join(TREE, 'vibes'), join(T, 'vibes'), { recursive: true });
for (const f of ['vibes-css.mjs', 'vibes-scope.mjs']) if (existsSync(join(TREE, 'tools-check', f))) cpSync(join(TREE, 'tools-check', f), join(T, 'tools-check', f));

// register a fake vibe 'probe': v1's values with the accent and the well changed
const idx = readFileSync(join(T, 'vibes/defs/index.js'), 'utf8').replace(
  "{ id: 'v1', name: 'v1', feel: 'The original Rack look.', experimental: false, scheme: 'dark' }",
  "{ id: 'v1', name: 'v1', feel: 'The original Rack look.', experimental: false, scheme: 'dark' },\n  { id: 'probe', name: 'Probe', feel: 'x', experimental: false, scheme: 'dark' }");
writeFileSync(join(T, 'vibes/defs/index.js'), idx);
const v1 = readFileSync(join(T, 'vibes/defs/v1.js'), 'utf8');
writeFileSync(join(T, 'vibes/defs/probe.js'), v1.replace("id: 'v1'", "id: 'probe'").replace("accent:        '#f0be1e'", "accent:        '#e05a00'").replace("well:          '#14161a'", "well:          '#101112'"));
writeFileSync(join(T, 'vibes/probe.css'), '[data-vibe="probe"] .card { border-width: 2px; }\n');

const run = (f, args = []) => { try { return [0, execFileSync('node', [join(T, 'tools-check', f), ...args], { encoding: 'utf8' })]; } catch (e) { return [e.status, e.stdout + e.stderr]; } };
const tail = s => s.trim().split('\n').slice(-3).join('\n');
let [c, o] = run('vibes-css.mjs');
console.log('1. before --write (expect fail):', c, '\n' + tail(o));
[c, o] = run('vibes-css.mjs', ['--write']);
console.log('2. --write:', c, '\n' + tail(o));
console.log('--- vibes/probe.css head ---\n' + readFileSync(join(T, 'vibes/probe.css'), 'utf8').split('\n').slice(0, 6).join('\n') + '\n...\n' + readFileSync(join(T, 'vibes/probe.css'), 'utf8').split('\n').slice(-6).join('\n'));
[c, o] = run('vibes-css.mjs');
console.log('3. check after write (expect pass):', c, '\n' + tail(o));
const p = readFileSync(join(T, 'vibes/probe.css'), 'utf8');
writeFileSync(join(T, 'vibes/probe.css'), p.replace('--accent: #e05a00;', '--accent: #e05a01;'));
[c, o] = run('vibes-css.mjs');
console.log('4. hand-edited block (expect fail):', c, '\n' + o.split('\n').filter(l => /✗/.test(l)).join('\n'));
writeFileSync(join(T, 'vibes/probe.css'), p);
if (existsSync(join(T, 'tools-check/vibes-scope.mjs'))) {
  [c, o] = run('vibes-scope.mjs');
  console.log('5. scope lint on the generated file (expect pass):', c, '\n' + tail(o));
  writeFileSync(join(T, 'vibes/probe.css'), p + '\n.card, [data-vibe="probe"] .x { color: red; }\n@font-face { font-family: Archivo; src: url(probe/a.woff2); }\n@keyframes setFlash { to { opacity: 1; } }\n[data-vibe="probe"] [class^="set-row"] { color: red; }\n');
  [c, o] = run('vibes-scope.mjs');
  console.log('6. scope lint on bad rules (expect fail):', c, '\n' + o.split('\n').filter(l => /✗/.test(l)).join('\n'));
}
