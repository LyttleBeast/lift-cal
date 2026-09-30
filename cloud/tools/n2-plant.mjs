// N2 scratch proof: each Vibes lint goes red on a violation planted, alone,
// in a scratch copy of the engine tree's app/ and src/ under ~/dev/vibes-night/tmp.
// Not part of any tree. Usage: node n2-plant.mjs
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ENGINE = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const TMP = '/Users/micahflunker/dev/vibes-night/tmp';

function scratch(name) {
  const dir = join(TMP, 'n2-plant-' + name);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  for (const d of ['app', 'src']) cpSync(join(ENGINE, d), join(dir, d), { recursive: true });
  return dir;
}
function plant(dir, rel, from, to) {
  const p = join(dir, rel);
  const s = readFileSync(p, 'utf8');
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(rel + ': expected the plant site once, found ' + n);
  writeFileSync(p, s.replace(from, to));
}
function lint(tool, dir) {
  const r = spawnSync(process.execPath, [join(ENGINE, 'tools', tool), '--root', dir], { encoding: 'utf8' });
  const lines = r.stdout.split('\n').filter(l => /✗|· src|· app|passed,/.test(l));
  return { code: r.status, lines };
}

const PLANTS = [
  ['colour', 'verify-no-colour-literals.mjs', 'src/ui/Chip.jsx',
    "borderWidth: 1, borderColor: on ? T.colors.inverse : T.colors.collar",
    "borderWidth: 1, borderColor: on ? T.colors.inverse : '#262a33'"],
  ['module', 'verify-no-module-scope-theme.mjs', 'src/ui/Dock.jsx',
    "import T from './theme';",
    "import T from './theme';\nexport const DOCK_H = T.layout.dockH;"],
  ['worklet', 'verify-no-theme-in-worklet.mjs', 'src/ui/train/SetRow.jsx',
    '[low, high])',
    '[T.tint.coachLow, T.tint.coachHigh])']
];

const control = scratch('control');
for (const [, tool] of PLANTS) {
  const r = lint(tool, control);
  console.log('control  ' + tool + '  exit ' + r.code + '  ' + r.lines.filter(l => /passed,/.test(l)).join(''));
}
for (const [name, tool, rel, from, to] of PLANTS) {
  const dir = scratch(name);
  plant(dir, rel, from, to);
  for (const [, t] of PLANTS) {
    const r = lint(t, dir);
    console.log('plant ' + name.padEnd(8) + t.padEnd(36) + 'exit ' + r.code);
    if (t === tool) r.lines.forEach(l => console.log('      ' + l.trim()));
  }
}
