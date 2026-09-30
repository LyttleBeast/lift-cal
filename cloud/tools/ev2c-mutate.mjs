// ev2c-mutate.mjs <web-wt> — mutation runs for the engine-v2 contract checks.
// Copies the worktree's vibes/ into a scratch dir under ~/dev/vibes-night/tmp,
// makes one value wrong per run, and runs tools-check/vibes-contract.mjs
// against it (VIBES_CONTRACT_DEFS), printing the failing lines. Also a probe
// with navy registered (the meta-key fix). Scratch; writes only under tmp/.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const WT = process.argv[2];
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/ev2c-mut';
const runs = [
  ['tagInk.W off', 'defs/v1.js', s => s.replace("tagInk: { W: 'pYellow'", "tagInk: { W: 'warn'")],
  ['vessel stroke off', 'icons/v1.js', s => s.replace('stroke: 2.5,', 'stroke: 2.4,')],
  ['vocab sub default off', 'defs/vocab.js', s => s.replace('sub: [2],', 'sub: [3],')],
  ['runway alpha off', 'defs/v1.js', s => s.replace("runway:       { color: 'rack',   a: 0.55 }", "runway:       { color: 'rack',   a: 0.5 }")],
  ['meta not note', 'defs/v1.js', s => s.replace("meta:     { size: 12, wght: 400, lh: 1.5, color: 'dim' }", "meta:     { size: 13, wght: 400, lh: 1.5, color: 'dim' }")],
  ['band set in v1', 'defs/v1.js', s => s.replace('band:          null', "band:          '#111416'")],
  ['calHead ringed in v1', 'defs/v1.js', s => s.replace('calHead:    { web: [] }', "calHead:    { web: [{ x: 0, y: 0, blur: 0, spread: 1, color: 'chalk' }] }")],
  ['ornament in v1', 'icons/v1.js', s => s.replace('ornaments: {}', "ornaments: { you: null }")],
  ['inkOf not identity', 'defs/v1.js', s => s.replace("pYellow: 'pYellow', pGreen", "pYellow: 'warn', pGreen")],
  ['list too long', 'defs/vocab.js', s => s.replace("head: [2],", "head: [2, 1, 1, 1],")]
];
function run(label, file, edit, extra) {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  cpSync(join(WT, 'vibes'), join(TMP, 'vibes'), { recursive: true });
  if (file) {
    const p = join(TMP, 'vibes', file), s = readFileSync(p, 'utf8'), t = edit(s);
    if (t === s) { console.log(`## ${label}: EDIT DID NOT APPLY`); return; }
    writeFileSync(p, t);
  }
  if (extra) extra();
  const r = spawnSync('node', [join(WT, 'tools-check/vibes-contract.mjs')], { env: { ...process.env, VIBES_CONTRACT_DEFS: TMP }, encoding: 'utf8' });
  const bad = r.stdout.split('\n').filter(l => l.includes('✗'));
  console.log(`## ${label}: exit ${r.status}, ${bad.length} failing`);
  for (const l of bad) console.log('   ' + l.trim().slice(0, 240));
}
for (const [l, f, e] of runs) run(l, f, e);
// navy registered: the meta-key fix
run('navy registered (should pass bar the registry entry)', null, null, () => {
  cpSync('/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/defs/navy.js', join(TMP, 'vibes/defs/navy.js'));
  const p = join(TMP, 'vibes/defs/index.js');
  writeFileSync(p, readFileSync(p, 'utf8').replace("scheme: 'dark' }\n]);", "scheme: 'dark' },\n  { id: 'navy', name: 'Navy', feel: 'Deep navy ground, pale ink.', experimental: false, scheme: 'dark' }\n]);"));
});
rmSync(TMP, { recursive: true, force: true });
