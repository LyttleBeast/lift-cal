// S (native) scratch: plant one mistake in a scratch copy of the settings tree and run
// tools/verify-vibe-setting.mjs against it (--root), to prove its checks can fail.
// usage: node s-nat-plant.mjs <plant name | all>   ("control" is an unplanted copy, which must pass)
import fs from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const TREE = '/Users/micahflunker/dev/vibes-night/wt/nat-settings';
const NM = '/Users/micahflunker/dev/rack-mobile/node_modules';
const PLANTS = {
  control: [],
  // the account's vibe put on AFTER setUser: a frame drawn with a user in v1
  'after-setUser': [['app/_layout.jsx',
    '    if (acc.state === APPROVED && !paused) await switchVibe(storedVibe());\n\n    setUser(u);\n',
    '    setUser(u);\n    if (acc.state === APPROVED && !paused) await switchVibe(storedVibe());\n\n']],
  // the gates wearing the vibe
  'gates-worn': [['app/_layout.jsx', 'if (acc.state === APPROVED && !paused) await switchVibe', 'if (u) await switchVibe']],
  // a record written, not the plain string
  'object-write': [['src/state/vibeAccount.js', 'await write(PATH, next);', 'await write(PATH, { id: next });']],
  // a refusal that keeps the refused vibe on
  'no-revert': [['src/state/vibeAccount.js', '    if (vibe() === next) return switchVibe(storedVibe());\n', '']],
  // a late refusal that undoes a later pick
  'revert-always': [['src/state/vibeAccount.js', 'if (vibe() === next) return switchVibe(storedVibe());', 'return switchVibe(storedVibe());']],
  // the mirror trusted raw: garbage worn as an id
  'raw-mirror': [['src/state/vibeAccount.js', "return resolveVibe(LS.get('mirror:' + PATH, null));", "return LS.get('mirror:' + PATH, null) || 'v1';"]],
  // sign-out leaves the vibe on
  'no-reset': [['src/state/reset.js', '  resetVibe();       // the look back to v1', '  // resetVibe();    // the look back to v1']],
  // boot never takes the database's word
  'no-initVibe': [['app/(app)/_layout.jsx', '      await initVibe();\n', '']],
  // the current card marked by nothing but its check (the ring gone)
  'no-ring': [['src/ui/settings/vibes.jsx', "borderColor: current ? T.colors.chalk : 'transparent'", "borderColor: 'transparent'"]],
  // the current card marked by colour alone: no check, no selected
  'colour-only': [['src/ui/settings/vibes.jsx', '        {current ? (\n          <View pointerEvents="none"', '        {false ? (\n          <View pointerEvents="none"'],
                  ['src/ui/settings/vibes.jsx', 'accessibilityState={{ selected: current }}', 'accessibilityState={{ selected: false }}']],
  // a card drawn from T, not from its own vibe
  'cards-from-T': [['src/ui/settings/vibes.jsx', 'backgroundColor: t.colors.rack,', 'backgroundColor: T.colors.rack,']],
  // a numeral drawn in its face before the face is registered
  'face-early': [['src/ui/settings/vibes.jsx', "face={faces ? faces[meta.id] || fallback : fallback}", "face={t.loadNum(35).fontFamily}"]],
  // an unwearable id drawn as a card
  'ghost-card': [['src/ui/settings/vibes.jsx', '.filter(meta => resolveVibe(meta.id) === meta.id)', '.filter(meta => !!meta.id)']],
  // tapping the current card writes it again
  'tap-current': [['src/ui/settings/vibes.jsx', 'onPress={() => { if (!current) chooseVibe(meta.id); }}', 'onPress={() => { chooseVibe(meta.id); }}'],
                  ['src/state/vibeAccount.js', '  if (next === vibe()) return next;\n', '']]
};
const names = process.argv[2] === 'all' ? Object.keys(PLANTS) : [process.argv[2]];
for (const name of names) {
  if (!PLANTS[name]) { console.log('unknown plant; one of ' + Object.keys(PLANTS).join(', ')); process.exit(2); }
  const dst = '/Users/micahflunker/dev/vibes-night/tmp/s-nat-plant-' + name;
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
  lines.filter(l => /✗/.test(l)).slice(0, 6).forEach(l => console.log('    ' + l.trim().slice(0, 200)));
  fs.rmSync(dst, { recursive: true, force: true });
}
