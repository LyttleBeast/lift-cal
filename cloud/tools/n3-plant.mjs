// N3 scratch: plant one fault in a scratch copy of the engine tree and run
// verify-vibe-switch against it (--root), to prove its checks can fail.
// usage: node n3-plant.mjs <plant name>   (or "control" for an unplanted copy)
import fs from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ENGINE = '/Users/micahflunker/dev/vibes-night/wt/nat-engine';
const NM = '/Users/micahflunker/dev/rack-mobile/node_modules';
const name = process.argv[2];
const PLANTS = {
  control: [],
  'no-key': [['app/(app)/_layout.jsx', "<Stack key={'vibe-' + vibeKey}", '<Stack']],
  'no-return': [['app/(app)/_layout.jsx', 'setTarget(here.current || restoreRoute());', '/* planted: no return */']],
  'pip-unsubscribed': [['src/ui/SyncPip.jsx', "  useVibe();   // a root sibling, outside the keyed Stack: repaints on a switch itself\n", '']],
  'sheet-unsubscribed': [['src/ui/Sheet.jsx', '  useVibe();\n  const [stack, setStack]', '  const [stack, setStack]']],
  'no-font-gate': [['src/state/vibe.js', 'if (unregistered.length) {', 'if (false) {']],
  'apply-first': [['src/state/vibe.js', 'if (unregistered.length) {', 'if (false) {'],
                  ['src/state/vibeFonts.js', 'const mine = ++ticket;', 'const mine = ++ticket; setVibe(id);']],
  'mutate-in-place': [['src/ui/theme.js', 'for (const k of Object.keys(obj)) T[k] = obj[k];',
    'for (const k of Object.keys(obj)) { if (T[k] && typeof T[k] === "object" && !Array.isArray(T[k])) Object.assign(T[k], obj[k]); else T[k] = obj[k]; }']],
  'no-last-wins': [['src/state/vibeFonts.js', 'if (mine !== ticket) return vibe();', '']],
  'picker-loads-all': [['src/state/vibeFonts.js', 'await Font.loadAsync({ [p.key]: p.source });', 'await loadVibeFonts(id);']]
};
if (!PLANTS[name]) { console.log('unknown plant; one of ' + Object.keys(PLANTS).join(', ')); process.exit(2); }
const dst = '/Users/micahflunker/dev/vibes-night/tmp/n3-plant-' + name;
fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync(join(dst, 'tools'), { recursive: true });
for (const d of ['app', 'src']) fs.cpSync(join(ENGINE, d), join(dst, d), { recursive: true });
fs.cpSync(join(ENGINE, 'tools/lib'), join(dst, 'tools/lib'), { recursive: true });
fs.copyFileSync(join(ENGINE, 'tools/theme-v1.baseline.json'), join(dst, 'tools/theme-v1.baseline.json'));
fs.copyFileSync(join(ENGINE, 'package.json'), join(dst, 'package.json'));
for (const [f, from, to] of PLANTS[name]) {
  const p = join(dst, f);
  const s = fs.readFileSync(p, 'utf8');
  if (!s.includes(from)) { console.log('PLANT MISSED: ' + f + ' has no ' + JSON.stringify(from)); process.exit(2); }
  fs.writeFileSync(p, s.replace(from, to));
}
const r = spawnSync(process.execPath, [join(ENGINE, 'tools/verify-vibe-switch.mjs'), '--root', dst],
                    { env: { ...process.env, NODE_PATH: NM }, encoding: 'utf8', maxBuffer: 1 << 26 });
const lines = (r.stdout + '\n' + r.stderr).split('\n');
console.log('plant ' + name + ': exit ' + r.status);
lines.filter(l => /✗|passed, |Error/.test(l)).slice(0, 30).forEach(l => console.log('  ' + l.slice(0, 260)));
