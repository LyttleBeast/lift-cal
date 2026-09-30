// S (native) fixer round 1: plant one mistake in a scratch copy of the settings tree and run
// tools/verify-vibe-setting.mjs against it (--root), to prove its checks can fail.
// The builder's plants (s-nat-plant.mjs), with the two whose lines this round changed updated,
// plus this round's: the three reviewed bugs put back, and near misses of each fix.
// usage: node s-nat-fix1-plant.mjs <plant name | all | new>   ("control" is an unplanted copy, which must pass)
import fs from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const TREE = '/Users/micahflunker/dev/vibes-night/wt/nat-settings';
const NM = '/Users/micahflunker/dev/rack-mobile/node_modules';
const NEW = {
  control: [],
  // FINDING 1 as found: the JS splash drawn from T, so in his vibe
  'splash-follows-vibe': [['src/ui/Splash.jsx', '  const v1 = look();\n', '  const v1 = T;\n']],
  // the splash v1, but the status bar over it left the vibe's
  'splash-no-bar': [['src/ui/Splash.jsx', '      {T.chrome.statusBar !== v1.chrome.statusBar ? <StatusBar style={v1.chrome.statusBar} /> : null}\n', '']],
  // the splash's own status bar mounted under v1 too (it would move v1's Splash scene)
  'splash-bar-always': [['src/ui/Splash.jsx', '{T.chrome.statusBar !== v1.chrome.statusBar ? <StatusBar', '{true ? <StatusBar']],
  // FINDING 2 as found: a card whose face failed drawn in the current face
  'face-fallback': [['src/ui/settings/vibes.jsx', 'shown={!!own(meta.id)}', 'shown={!!faces}']],
  // FINDING 3 as found, the sheet half: the marked card ignores his tap
  'current-tap-ignored': [['src/ui/settings/vibes.jsx', 'onPress={() => { chooseVibe(meta.id); }}', 'onPress={() => { if (!current) chooseVibe(meta.id); }}']],
  // FINDING 3 as found, the API half: the worn vibe short-circuits before switchVibe
  'short-circuit': [['src/state/vibeAccount.js', '  const was = vibe();\n  const worn = await switchVibe(next);\n',
                     '  const was = vibe();\n  if (next === was) return next;\n  const worn = await switchVibe(next);\n']],
  // the fix gone too far: the vibe he wears written again on every tap
  'rewrite-current': [['src/state/vibeAccount.js', 'if (worn !== next || next === was) return worn;', 'if (worn !== next) return worn;']],
  // the builder's face-early, on this round's line: a numeral drawn in its face before it is registered
  'face-early': [['src/ui/settings/vibes.jsx', 'face={own(meta.id) || fallback} shown={!!own(meta.id)}', 'face={t.loadNum(35).fontFamily} shown={!!own(meta.id)}']]
};
const OLD = {
  'after-setUser': [['app/_layout.jsx',
    '    if (acc.state === APPROVED && !paused) await switchVibe(storedVibe());\n\n    setUser(u);\n',
    '    setUser(u);\n    if (acc.state === APPROVED && !paused) await switchVibe(storedVibe());\n\n']],
  'gates-worn': [['app/_layout.jsx', 'if (acc.state === APPROVED && !paused) await switchVibe', 'if (u) await switchVibe']],
  'object-write': [['src/state/vibeAccount.js', 'await write(PATH, next);', 'await write(PATH, { id: next });']],
  'no-revert': [['src/state/vibeAccount.js', '    if (vibe() === next) return switchVibe(storedVibe());\n', '']],
  'revert-always': [['src/state/vibeAccount.js', 'if (vibe() === next) return switchVibe(storedVibe());', 'return switchVibe(storedVibe());']],
  'raw-mirror': [['src/state/vibeAccount.js', "return resolveVibe(LS.get('mirror:' + PATH, null));", "return LS.get('mirror:' + PATH, null) || 'v1';"]],
  'no-reset': [['src/state/reset.js', '  resetVibe();       // the look back to v1', '  // resetVibe();    // the look back to v1']],
  'no-initVibe': [['app/(app)/_layout.jsx', '      await initVibe();\n', '']],
  'no-ring': [['src/ui/settings/vibes.jsx', "borderColor: current ? T.colors.chalk : 'transparent'", "borderColor: 'transparent'"]],
  'colour-only': [['src/ui/settings/vibes.jsx', '        {current ? (\n          <View pointerEvents="none"', '        {false ? (\n          <View pointerEvents="none"'],
                  ['src/ui/settings/vibes.jsx', 'accessibilityState={{ selected: current }}', 'accessibilityState={{ selected: false }}']],
  'cards-from-T': [['src/ui/settings/vibes.jsx', 'backgroundColor: t.colors.rack,', 'backgroundColor: T.colors.rack,']],
  'ghost-card': [['src/ui/settings/vibes.jsx', '.filter(meta => resolveVibe(meta.id) === meta.id)', '.filter(meta => !!meta.id)']]
};
const PLANTS = { ...NEW, ...OLD };
const arg = process.argv[2];
const names = arg === 'all' ? Object.keys(PLANTS) : arg === 'new' ? Object.keys(NEW) : arg === 'old' ? Object.keys(OLD) : [arg];
for (const name of names) {
  if (!PLANTS[name]) { console.log('unknown plant; one of ' + Object.keys(PLANTS).join(', ')); process.exit(2); }
  const dst = '/Users/micahflunker/dev/vibes-night/tmp/s-nat-fix1-plant-' + name;
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(join(dst, 'tools'), { recursive: true });
  for (const d of ['app', 'src']) fs.cpSync(join(TREE, d), join(dst, d), { recursive: true });
  fs.cpSync(join(TREE, 'tools/lib'), join(dst, 'tools/lib'), { recursive: true });
  fs.copyFileSync(join(TREE, 'package.json'), join(dst, 'package.json'));
  let missed = false;
  for (const [f, from, to] of PLANTS[name]) {
    const p = join(dst, f);
    const s = fs.readFileSync(p, 'utf8');
    if (s.split(from).length !== 2) { console.log('PLANT MISSED (' + name + '): ' + f + ' has ' + (s.split(from).length - 1) + ' of ' + JSON.stringify(from)); missed = true; continue; }
    fs.writeFileSync(p, s.replace(from, to));
  }
  if (missed) continue;
  const r = spawnSync(process.execPath, [join(TREE, 'tools/verify-vibe-setting.mjs'), '--root', dst],
                      { env: { ...process.env, NODE_PATH: NM }, encoding: 'utf8', maxBuffer: 1 << 26 });
  const lines = (r.stdout + '\n' + r.stderr).split('\n');
  console.log('plant ' + name + ': exit ' + r.status + '  ' + (lines.find(l => /passed, /.test(l)) || '').trim());
  lines.filter(l => /✗/.test(l)).slice(0, 6).forEach(l => console.log('    ' + l.trim().slice(0, 220)));
  fs.rmSync(dst, { recursive: true, force: true });
}
