// Canaries for contract v2's section F: copy a tree's vibes/ modules into
// scratch, plant one fault, and run the tree's contract verifier against it
// (VIBES_CONTRACT_DEFS). Every canary must FAIL. Scratch only.
// usage: node cv2-canary.mjs web|nat <tree>
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const [side, tree] = process.argv.slice(2);
const src = side === 'web' ? join(tree, 'vibes') : join(tree, 'src/pure/vibes');
const verifier = side === 'web' ? join(tree, 'tools-check/vibes-contract.mjs') : join(tree, 'tools/verify-vibes-contract.mjs');
const files = ['defs/v1.js', 'defs/index.js', 'icons/v1.js', 'defs/vocab.js'];
const CANARIES = {
  'v1 names a look': ['defs/v1.js', s => s.replace("sessionChrome: 'v1'", "sessionChrome: 'slab'")],
  'v1 misses a block': ['defs/v1.js', s => s.replace("    addTile: 'v1', sessionChrome: 'v1'\n", "    addTile: 'v1'\n")],
  'v1 holds a param': ['defs/v1.js', s => s.replace('shape: {},', 'shape: { gutter: 2 },')],
  'vocab look without grade': ['defs/vocab.js', s => s.replace("square: { grade: 'shape', look: 'square corners (radius.chip); otherwise v1'", "square: { look: 'square corners (radius.chip); otherwise v1'")],
  'vocab param ink not a role': ['defs/vocab.js', s => s.replace("ink: 'knurl',   //", "ink: 'nope',   //")],
  'vocab reads a missing role': ['defs/vocab.js', s => s.replace("reads: ['type.note']", "reads: ['type.nope']")],
  'vocab imports': ['defs/vocab.js', s => "import x from './v1.js';\n" + s],
  'vocab unfrozen': ['defs/vocab.js', s => s.replace('export default deepFreeze({', 'export default ({')]
};
let bad = 0;
for (const [name, [f, fn]] of Object.entries(CANARIES)) {
  const dir = '/Users/micahflunker/dev/vibes-night/tmp/cv2-canary-' + side;
  rmSync(dir, { recursive: true, force: true });
  for (const g of files) { mkdirSync(join(dir, 'vibes', g, '..'), { recursive: true }); writeFileSync(join(dir, 'vibes', g), readFileSync(join(src, g))); }
  const before = readFileSync(join(dir, 'vibes', f), 'utf8'), after = fn(before);
  if (after === before) { console.log('NOT PLANTED ' + name); bad++; continue; }
  writeFileSync(join(dir, 'vibes', f), after);
  const r = spawnSync(process.execPath, [verifier], { cwd: tree, env: { ...process.env, VIBES_CONTRACT_DEFS: dir }, encoding: 'utf8', maxBuffer: 1 << 26 });
  const failLines = (r.stdout || '').split('\n').filter(l => /✗|FAIL/.test(l)).slice(0, 3);
  console.log((r.status === 0 ? 'MISSED ' : 'caught ') + name + (failLines.length ? '\n     ' + failLines.map(l => l.trim().slice(0, 200)).join('\n     ') : ''));
  if (r.status === 0) bad++;
  rmSync(dir, { recursive: true, force: true });
}
console.log(bad ? bad + ' canaries not caught' : 'all canaries caught');
process.exit(bad ? 1 : 0);
