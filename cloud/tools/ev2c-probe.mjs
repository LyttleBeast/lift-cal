// ev2c-probe.mjs <web-wt> — the four spec definitions registered in a scratch
// copy of vibes/, run through tools-check/vibes-contract.mjs, and each built
// into CSS tokens with index.js valueOf(), to see the engine-v2 contract read
// them. Scratch; writes only under ~/dev/vibes-night/tmp.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const WT = process.argv[2];
const TMP = '/Users/micahflunker/dev/vibes-night/tmp/ev2c-probe';
const DESIGN = '/Users/micahflunker/dev/vibes-night/wt/web-design/vibes/defs';
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
cpSync(join(WT, 'vibes'), join(TMP, 'vibes'), { recursive: true });
const ids = [['chalk', 'Chalk', 'Chalk-white page, dark ink.', 'light'], ['iron-age', 'Iron Age', 'Ink on cream, circa 1900.', 'light'],
  ['navy', 'Navy', 'Deep navy ground, pale ink.', 'dark'], ['oxblood', 'Oxblood', 'Oxblood and ice blue.', 'dark']];
for (const [id] of ids) cpSync(join(DESIGN, id + '.js'), join(TMP, 'vibes/defs', id + '.js'));
const p = join(TMP, 'vibes/defs/index.js');
writeFileSync(p, readFileSync(p, 'utf8').replace("scheme: 'dark' }\n]);",
  "scheme: 'dark' },\n" + ids.map(([id, n, f, s]) => `  { id: '${id}', name: '${n}', feel: '${f}', experimental: false, scheme: '${s}' }`).join(',\n') + '\n]);'));
const r = spawnSync('node', [join(WT, 'tools-check/vibes-contract.mjs')], { env: { ...process.env, VIBES_CONTRACT_DEFS: TMP }, encoding: 'utf8' });
console.log('vibes-contract with the four registered: exit ' + r.status);
for (const l of r.stdout.split('\n').filter(l => l.includes('✗'))) console.log('   ' + l.trim().slice(0, 300));
const I = await import(pathToFileURL(p).href);
for (const [id] of ids) {
  const def = (await import(pathToFileURL(join(TMP, 'vibes/defs', id + '.js')).href)).default;
  const pick = ['colors.band', 'tagInk.W', 'inkOf.pYellow', 'shape.rule.head.0', 'shape.rule.sub.0', 'shape.lead.keyline', 'face.web.num', 'type.meta', 'tint.runway',
    'shadow.calHead', 'images.youHero.band', 'face.bands'];
  console.log(id + ': ' + pick.map(k => k + '=' + JSON.stringify(I.valueOf(def, k))).join('  '));
}
rmSync(TMP, { recursive: true, force: true });
