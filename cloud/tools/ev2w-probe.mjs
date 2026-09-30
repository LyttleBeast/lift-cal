// ev2w-probe.mjs <web-wt> — a scratch copy of the web tree with the four spec
// definitions (and their icon sets) registered, to see the web engine v2 read
// them: vibes-css --write (the generated blocks, the status strip), then
// vibes-css, vibes-scope, vibe-js and vibes-contract in check mode. Writes only
// under ~/dev/vibes-night/tmp; the worktree is untouched.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const WT = process.argv[2];
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/ev2w-probe';
const DESIGN = '/Users/micahflunker/dev/vibes-night/wt/web-design/vibes';
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
for (const f of readdirSync(WT)) {
  if (f === '.git' || f === 'node_modules' || f === 'report') continue;
  cpSync(join(WT, f), join(TMP, f), { recursive: true });
}
const ids = [['chalk', 'Chalk', 'Chalk-white page, dark ink.', 'light'], ['iron-age', 'Iron Age', 'Ink on cream, circa 1900.', 'light'],
  ['navy', 'Navy', 'Deep navy ground, pale ink.', 'dark'], ['oxblood', 'Oxblood', 'Oxblood and ice blue.', 'dark']];
for (const [id] of ids) {
  cpSync(join(DESIGN, 'defs', id + '.js'), join(TMP, 'vibes/defs', id + '.js'));
  if (existsSync(join(DESIGN, 'icons', id + '.js'))) cpSync(join(DESIGN, 'icons', id + '.js'), join(TMP, 'vibes/icons', id + '.js'));
}
const p = join(TMP, 'vibes/defs/index.js');
writeFileSync(p, readFileSync(p, 'utf8').replace("scheme: 'dark' }\n]);",
  "scheme: 'dark' },\n" + ids.map(([id, n, f, s]) => `  { id: '${id}', name: '${n}', feel: '${f}', experimental: false, scheme: '${s}' }`).join(',\n') + '\n]);'));
const v = join(TMP, 'vibe.js');
const cam = id => id.replace(/-(\w)/g, (m, c) => c.toUpperCase());
let vj = readFileSync(v, 'utf8');
const defImports = ids.map(([id]) => `import D_${cam(id)} from './vibes/defs/${id}.js';`).join('\n');
const icoIds = ids.map(([id]) => id).filter(id => existsSync(join(TMP, 'vibes/icons', id + '.js')));
const icoImports = icoIds.map(id => `import I_${cam(id)} from './vibes/icons/${id}.js';`).join('\n');
vj = vj.replace("import V1_ICONS from './vibes/icons/v1.js';\n", "import V1_ICONS from './vibes/icons/v1.js';\n" + defImports + '\n' + icoImports + '\n')
  .replace('const DEFS = { v1: V1 };', 'const DEFS = { v1: V1, ' + ids.map(([id]) => `'${id}': D_${cam(id)}`).join(', ') + ' };')
  .replace('const ICON_SETS = { v1: V1_ICONS };', 'const ICON_SETS = { v1: V1_ICONS, ' + icoIds.map(id => `'${id}': I_${cam(id)}`).join(', ') + ' };');
writeFileSync(v, vj);
// index.html: link each vibe stylesheet after auth.css, as the orchestrator will
const ih = join(TMP, 'index.html');
writeFileSync(ih, readFileSync(ih, 'utf8').replace('<link rel="stylesheet" href="auth.css">\n',
  '<link rel="stylesheet" href="auth.css">\n' + ids.map(([id]) => `<link rel="stylesheet" href="vibes/${id}.css">\n`).join('')));
const run = (s, args = []) => { const r = spawnSync('node', [join(TMP, s), ...args], { cwd: TMP, encoding: 'utf8', env: { ...process.env, TZ: 'UTC', VIBES_CONTRACT_DEFS: TMP } });
  console.log(`== ${s} ${args.join(' ')}: exit ${r.status}`);
  for (const l of (r.stdout + r.stderr).split('\n').filter(l => /✗|Error/.test(l)).slice(0, 30)) console.log('   ' + l.trim().slice(0, 400));
  return r; };
run('tools-check/vibes-css.mjs', ['--write']);
for (const [id] of ids) {
  const css = readFileSync(join(TMP, 'vibes', id + '.css'), 'utf8').split('\n');
  const pick = css.filter(l => /::before|--band|--tag-ink|--ink-of-p-yellow|--font-num|--shadow-cal|--tint-runway|--photo-band|--shape-rule-sub-0|--shape-lead/.test(l));
  console.log(`-- vibes/${id}.css (${css.length} lines):\n   ` + pick.join('\n   '));
}
for (const s of ['tools-check/vibes-css.mjs', 'tools-check/vibes-scope.mjs', 'tools-check/vibe-js.mjs', 'tools-check/vibes-contract.mjs', 'tools-check/colour-literals.mjs']) run(s);
