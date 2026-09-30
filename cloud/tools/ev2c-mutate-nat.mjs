// ev2c-mutate-nat.mjs <nat-wt> — mutation runs of native's
// tools/verify-vibes-contract.mjs for the engine-v2 checks: a scratch copy of
// src/pure/vibes/ with one value wrong, read through VIBES_CONTRACT_DEFS.
// Scratch; writes only under ~/dev/vibes-night/tmp.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const WT = process.argv[2];
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/ev2c-mut-nat';
const runs = [
  ['tagInk.F off', 'defs/v1.js', s => s.replace("F: 'pRed', D: 'pBlue' }", "F: 'danger', D: 'pBlue' }")],
  ['vessel insideTop off', 'icons/v1.js', s => s.replace('insideTop: 22,', 'insideTop: 20,')],
  ['cap off', 'icons/v1.js', s => s.replace("cap: { tag: 'rect', x: 38, y: 2, width: 28, height: 10, rx: 3 }", "cap: { tag: 'rect', x: 38, y: 2, width: 28, height: 10, rx: 2 }")],
  ['bands in v1', 'defs/v1.js', s => s.replace('bands: [],', "bands: [{ max: 80, family: 'X', keys: ['X_800'] }],")],
  ['calTarget ringed', 'defs/v1.js', s => s.replace('calTarget:  { web: [] }', "calTarget:  { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'rack' }] }")],
  ['index native path for tagInk moved', 'defs/index.js', s => s.replace("'--tag-ink-' + k.toLowerCase(), 'tagInk.' + k,", "'--tag-ink-' + k.toLowerCase(), 'badge.' + k,")]
];
for (const [label, file, edit] of runs) {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  cpSync(join(WT, 'src/pure/vibes'), join(TMP, 'vibes'), { recursive: true });
  const p = join(TMP, 'vibes', file), s = readFileSync(p, 'utf8'), t = edit(s);
  if (t === s) { console.log(`## ${label}: EDIT DID NOT APPLY`); continue; }
  writeFileSync(p, t);
  const r = spawnSync('node', [join(WT, 'tools/verify-vibes-contract.mjs')], { cwd: WT, env: { ...process.env, VIBES_CONTRACT_DEFS: TMP }, encoding: 'utf8' });
  const bad = r.stdout.split('\n').filter(l => l.includes('FAIL'));
  console.log(`## ${label}: exit ${r.status}, ${bad.length} failing`);
  for (const l of bad) console.log('   ' + l.trim().slice(0, 240));
}
rmSync(TMP, { recursive: true, force: true });
