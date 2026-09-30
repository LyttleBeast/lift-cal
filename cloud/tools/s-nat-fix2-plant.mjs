// S (native) fixer round 2: plant one mistake in a scratch copy of the settings tree and run
// tools/verify-vibe-setting.mjs against it (--root), to prove its checks can fail.
// Round 1's plants (s-nat-fix1-plant.mjs), with the ones whose lines this round changed updated,
// plus this round's: the reviewed bug put back in each of its places, and near misses of the fix.
// usage: node s-nat-fix2-plant.mjs <plant name | all | new | old>   ("control" is an unplanted copy, which must pass)
import fs from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const TREE = '/Users/micahflunker/dev/vibes-night/wt/nat-settings';
const NM = '/Users/micahflunker/dev/rack-mobile/node_modules';
const NEW = {
  control: [],
  // THE FINDING as found: resetVibe() leaves every switch in flight alone
  'no-epoch-bump': [['src/state/vibe.js', '  epoch++;\n  return setVibe(DEFAULT);', '  return setVibe(DEFAULT);']],
  // switchVibe checks before its wait but not after (the faces landing after sign-out)
  'switch-no-recheck': [['src/state/vibeFonts.js', 'if (mine !== ticket || since !== vibeEpoch()) return vibe();', 'if (mine !== ticket) return vibe();']],
  // a stale switch takes a ticket, and so drops the next session's switch
  'switch-no-precheck': [['src/state/vibeFonts.js', '  if (since !== vibeEpoch()) return vibe();\n  const mine = ++ticket;', '  const mine = ++ticket;']],
  // initVibe takes its epoch after the read (the reviewer's S3)
  'init-late-capture': [['src/state/vibeAccount.js', '  const since = vibeEpoch();\n  return switchVibe(resolveVibe(await read(PATH, null)), since);',
                         '  return switchVibe(resolveVibe(await read(PATH, null)));']],
  // a refusal's revert takes a fresh epoch
  'revert-no-since': [['src/state/vibeAccount.js', 'return switchVibe(storedVibe(), since);', 'return switchVibe(storedVibe());']],
  // a pick of v1 overtaken by a reset still written
  'choose-writes-after-reset': [['src/state/vibeAccount.js', ' || since !== vibeEpoch()) return worn;', ') return worn;']],
  // the watchAuth callback's switch takes a fresh epoch
  'callback-late-capture': [['app/_layout.jsx', 'await switchVibe(storedVibe(), vibeSince)', 'await switchVibe(storedVibe())']],
  // the callback takes it, but only after accessState has answered
  'callback-capture-after-access': [['app/_layout.jsx', '    const vibeSince = vibeEpoch();\n    let acc;\n', '    let acc;\n'],
                                    ['app/_layout.jsx', '    const paused = acc.state === APPROVED && isAccessPaused',
                                     '    const vibeSince = vibeEpoch();\n    const paused = acc.state === APPROVED && isAccessPaused']]
};
const OLD = {
  // round 1
  'splash-follows-vibe': [['src/ui/Splash.jsx', '  const v1 = look();\n', '  const v1 = T;\n']],
  'splash-no-bar': [['src/ui/Splash.jsx', '      {T.chrome.statusBar !== v1.chrome.statusBar ? <StatusBar style={v1.chrome.statusBar} /> : null}\n', '']],
  'splash-bar-always': [['src/ui/Splash.jsx', '{T.chrome.statusBar !== v1.chrome.statusBar ? <StatusBar', '{true ? <StatusBar']],
  'face-fallback': [['src/ui/settings/vibes.jsx', 'shown={!!own(meta.id)}', 'shown={!!faces}']],
  'current-tap-ignored': [['src/ui/settings/vibes.jsx', 'onPress={() => { chooseVibe(meta.id); }}', 'onPress={() => { if (!current) chooseVibe(meta.id); }}']],
  'short-circuit': [['src/state/vibeAccount.js', '  const was = vibe();\n  const worn = await switchVibe(next, since);\n',
                     '  const was = vibe();\n  if (next === was) return next;\n  const worn = await switchVibe(next, since);\n']],
  'rewrite-current': [['src/state/vibeAccount.js', 'if (worn !== next || next === was || since !== vibeEpoch()) return worn;',
                       'if (worn !== next || since !== vibeEpoch()) return worn;']],
  'face-early': [['src/ui/settings/vibes.jsx', 'face={own(meta.id) || fallback} shown={!!own(meta.id)}', 'face={t.loadNum(35).fontFamily} shown={!!own(meta.id)}']],
  // the builder's
  'after-setUser': [['app/_layout.jsx',
    '    if (acc.state === APPROVED && !paused) await switchVibe(storedVibe(), vibeSince);\n\n    setUser(u);\n',
    '    setUser(u);\n    if (acc.state === APPROVED && !paused) await switchVibe(storedVibe(), vibeSince);\n\n']],
  'gates-worn': [['app/_layout.jsx', 'if (acc.state === APPROVED && !paused) await switchVibe', 'if (u) await switchVibe']],
  'object-write': [['src/state/vibeAccount.js', 'await write(PATH, next);', 'await write(PATH, { id: next });']],
  'no-revert': [['src/state/vibeAccount.js', '    if (vibe() === next) return switchVibe(storedVibe(), since);\n', '']],
  'revert-always': [['src/state/vibeAccount.js', 'if (vibe() === next) return switchVibe(storedVibe(), since);', 'return switchVibe(storedVibe(), since);']],
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
  const dst = '/Users/micahflunker/dev/vibes-night/tmp/s-nat-fix2-plant-' + name;
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
  if (missed) { fs.rmSync(dst, { recursive: true, force: true }); continue; }
  const r = spawnSync(process.execPath, [join(TREE, 'tools/verify-vibe-setting.mjs'), '--root', dst],
                      { env: { ...process.env, NODE_PATH: NM }, encoding: 'utf8', maxBuffer: 1 << 26 });
  const lines = (r.stdout + '\n' + r.stderr).split('\n');
  console.log('plant ' + name + ': exit ' + r.status + '  ' + (lines.find(l => /passed, /.test(l)) || '').trim());
  lines.filter(l => /✗/.test(l)).slice(0, 8).forEach(l => console.log('    ' + l.trim().slice(0, 200)));
  fs.rmSync(dst, { recursive: true, force: true });
}
