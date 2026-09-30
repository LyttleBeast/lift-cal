// S (native) fixer round 3: plant one mistake in a scratch copy of the settings tree and run
// tools/verify-vibe-setting.mjs against it (--root), to prove its checks can fail.
// NEW: each of this round's fixes removed, piece by piece. OLD: rounds 1-2's plants
// (s-nat-fix2-plant.mjs), with the ones whose lines this round rewrote brought up to date.
// Two of round 2's are retired, and the reasons are in the list below.
// usage: node s-nat-fix3-plant.mjs <plant name | all | new | old> [--log <file>]   ("control" is an unplanted copy, which must pass)
import fs from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const TREE = '/Users/micahflunker/dev/vibes-night/wt/nat-settings';
const NM = '/Users/micahflunker/dev/rack-mobile/node_modules';
const VA = 'src/state/vibeAccount.js';
const NEW = {
  control: [],
  /* ---- finding 1: a refusal ends on the account's value ---- */
  // the fix removed: the revert reads write()'s per-call mirror rollback, as before
  'revert-to-mirror': [[VA, '  if (r.held === undefined) LS.del(MIRROR); else LS.set(MIRROR, r.held);\n  return switchVibe(resolveVibe(r.held), since);',
                        '  return switchVibe(storedVibe(), since);']],
  // the look goes back but the mirror keeps the refused pick (an offline relaunch wears it)
  'no-mirror-fix': [[VA, '  if (r.held === undefined) LS.del(MIRROR); else LS.set(MIRROR, r.held);\n', '']],
  // a refusal reverts at once, without waiting for the rest of the run
  'no-run-wait': [[VA, 'if (--r.picks || !r.refused || !openSince(since)) return vibe();', 'if ((--r.picks, false) || !r.refused || !openSince(since)) return vibe();']],
  // a pick the database takes never becomes the account's value
  'held-never-taken': [[VA, "  if (order > r.heldAt) { r.held = next; r.heldAt = order; }\n", '']],
  // every pick starts a run of its own
  'run-per-pick': [[VA, "  if (!run || !run.picks || run.since !== since) {", "  if (true) {"]],
  /* ---- findings 2 and 3: only the app wears one; the sheet closes itself ---- */
  // a tap is not checked against the app being open
  'choose-no-door': [[VA, '  if (!openSince(since)) return vibe();\n  if (!run', '  if (!run']],
  // the door never closes: it ignores the epoch
  'door-ignores-epoch': [[VA, 'const openSince = since => since === openedIn && since === vibeEpoch();', 'const openSince = since => openedIn >= 0 && since === vibeEpoch();']],
  // the sheet does not close itself when the app closes
  'no-close-on-reset': [['src/ui/settings/vibes.jsx', '  off = onResetVibe(close);\n', '']],
  // resetVibe tells nobody
  'reset-tells-nobody': [['src/state/vibe.js', "  [...resets].forEach(f => { try { f(); } catch {} });\n", '']],
  // the sheet opens over a gate or sign-in
  'open-when-closed': [['src/ui/settings/vibes.jsx', '  if (!appIsOpen()) return;\n  let off', '  let off']],
  // initVibe asked after the app closed still puts its answer on
  'init-no-door': [[VA, '  if (!openSince(since)) return vibe();\n  return switchVibe(resolveVibe(await read(PATH, null)), since);',
                    '  return switchVibe(resolveVibe(await read(PATH, null)), since);']],
  // the (app) layout never opens the app
  'no-appOpened': [['app/(app)/_layout.jsx', '    appOpened();\n', '']],
  // it opens it only after its first wait
  'appOpened-late': [['app/(app)/_layout.jsx', '    appOpened();\n', ''], ['app/(app)/_layout.jsx', '      await initUnits();\n', '      await initUnits();\n      appOpened();\n']],
  /* ---- finding 4: a live sign-in ---- */
  // the fix removed: every sign-in switches before setUser
  'live-switch': [['app/_layout.jsx', ' && !paused && launching.current) await switchVibe', ' && !paused) await switchVibe']],
  // sign-out does not end the launch, so the first sign-in after a launch on sign-in is taken for one
  'launch-not-ended-by-signout': [['app/_layout.jsx', '      resetAll();\n      launching.current = false;\n', '      resetAll();\n']]
};
const OLD = {
  // round 2 (s-nat-fix2-plant.mjs), current text
  'no-epoch-bump': [['src/state/vibe.js', '  epoch++;\n  const worn = setVibe(DEFAULT);', '  const worn = setVibe(DEFAULT);']],
  'switch-no-recheck': [['src/state/vibeFonts.js', 'if (mine !== ticket || since !== vibeEpoch()) return vibe();', 'if (mine !== ticket) return vibe();']],
  'switch-no-precheck': [['src/state/vibeFonts.js', '  if (since !== vibeEpoch()) return vibe();\n  const mine = ++ticket;', '  const mine = ++ticket;']],
  'init-late-capture': [[VA, '  const since = vibeEpoch();\n  if (!openSince(since)) return vibe();\n  return switchVibe(resolveVibe(await read(PATH, null)), since);',
                         '  const since = vibeEpoch();\n  if (!openSince(since)) return vibe();\n  return switchVibe(resolveVibe(await read(PATH, null)));']],
  // was 'choose-writes-after-reset': a pick a reset overtook is still written
  'pick-writes-after-reset': [[VA, 'if (worn !== next || next === was || !openSince(since)) return;', 'if (worn !== next || next === was) return;']],
  'callback-late-capture': [['app/_layout.jsx', 'await switchVibe(storedVibe(), vibeSince)', 'await switchVibe(storedVibe())']],
  'callback-capture-after-access': [['app/_layout.jsx', '    const vibeSince = vibeEpoch();\n    let acc;\n', '    let acc;\n'],
                                    ['app/_layout.jsx', '    const paused = acc.state === APPROVED && isAccessPaused',
                                     '    const vibeSince = vibeEpoch();\n    const paused = acc.state === APPROVED && isAccessPaused']],
  // RETIRED from round 2: 'revert-no-since'. The revert now runs only while openSince(since) holds,
  //   and switchVibe's default `since` is read at the call, before its one wait, so passing it or not is the same.
  // round 1
  'splash-follows-vibe': [['src/ui/Splash.jsx', '  const v1 = look();\n', '  const v1 = T;\n']],
  'splash-no-bar': [['src/ui/Splash.jsx', '      {T.chrome.statusBar !== v1.chrome.statusBar ? <StatusBar style={v1.chrome.statusBar} /> : null}\n', '']],
  'splash-bar-always': [['src/ui/Splash.jsx', '{T.chrome.statusBar !== v1.chrome.statusBar ? <StatusBar', '{true ? <StatusBar']],
  'face-fallback': [['src/ui/settings/vibes.jsx', 'shown={!!own(meta.id)}', 'shown={!!faces}']],
  'current-tap-ignored': [['src/ui/settings/vibes.jsx', 'onPress={() => { chooseVibe(meta.id); }}', 'onPress={() => { if (!current) chooseVibe(meta.id); }}']],
  'short-circuit': [[VA, '  const was = vibe();\n  const worn = await switchVibe(next, since);\n',
                     '  const was = vibe();\n  if (next === was) return;\n  const worn = await switchVibe(next, since);\n']],
  'rewrite-current': [[VA, 'if (worn !== next || next === was || !openSince(since)) return;', 'if (worn !== next || !openSince(since)) return;']],
  'face-early': [['src/ui/settings/vibes.jsx', 'face={own(meta.id) || fallback} shown={!!own(meta.id)}', 'face={t.loadNum(35).fontFamily} shown={!!own(meta.id)}']],
  // the builder's: the switch after setUser (and so for every sign-in)
  'after-setUser': [['app/_layout.jsx',
    '    if (acc.state === APPROVED && !paused && launching.current) await switchVibe(storedVibe(), vibeSince);\n\n    launching.current = false;\n    setUser(u);\n',
    '    launching.current = false;\n    setUser(u);\n    if (acc.state === APPROVED && !paused) await switchVibe(storedVibe(), vibeSince);\n\n']],
  'gates-worn': [['app/_layout.jsx', 'if (acc.state === APPROVED && !paused && launching.current) await switchVibe', 'if (u && launching.current) await switchVibe']],
  'object-write': [[VA, 'await write(PATH, next);', 'await write(PATH, { id: next });']],
  // was 'no-revert': a refusal puts nothing back
  'no-revert': [[VA, '  r.refused = false;\n  if (r.held === undefined) LS.del(MIRROR); else LS.set(MIRROR, r.held);\n  return switchVibe(resolveVibe(r.held), since);\n',
                 '  return vibe();\n']],
  // RETIRED from round 1: 'revert-always'. Reverting at the end of every run, refused or not, now goes back to the last
  //   pick the database took, which is the one worn. That is no longer a mistake.
  'raw-mirror': [[VA, "return resolveVibe(LS.get('mirror:' + PATH, null));", "return LS.get('mirror:' + PATH, null) || 'v1';"]],
  'no-reset': [['src/state/reset.js', '  resetVibe();       // the look back to v1', '  // resetVibe();    // the look back to v1']],
  'no-initVibe': [['app/(app)/_layout.jsx', '      await initVibe();\n', '']],
  'no-ring': [['src/ui/settings/vibes.jsx', "borderColor: current ? T.colors.chalk : 'transparent'", "borderColor: 'transparent'"]],
  'colour-only': [['src/ui/settings/vibes.jsx', '        {current ? (\n          <View pointerEvents="none"', '        {false ? (\n          <View pointerEvents="none"'],
                  ['src/ui/settings/vibes.jsx', 'accessibilityState={{ selected: current }}', 'accessibilityState={{ selected: false }}']],
  'cards-from-T': [['src/ui/settings/vibes.jsx', 'backgroundColor: t.colors.rack,', 'backgroundColor: T.colors.rack,']],
  'ghost-card': [['src/ui/settings/vibes.jsx', '.filter(meta => resolveVibe(meta.id) === meta.id)', '.filter(meta => !!meta.id)']]
};
const PLANTS = { ...NEW, ...OLD };
const argv = process.argv.slice(2);
const li = argv.indexOf('--log');
const LOG = li >= 0 ? argv[li + 1] : null;
const arg = argv.filter((a, i) => i !== li && i !== li + 1)[0];
const say = t => { console.log(t); if (LOG) fs.appendFileSync(LOG, t + '\n'); };
const names = arg === 'all' ? Object.keys(PLANTS) : arg === 'new' ? Object.keys(NEW) : arg === 'old' ? Object.keys(OLD) : arg.split(',');
for (const name of names) {
  if (!PLANTS[name]) { say('unknown plant ' + name + '; one of ' + Object.keys(PLANTS).join(', ')); process.exit(2); }
  const dst = '/Users/micahflunker/dev/vibes-night/tmp/s-nat-fix3-plant-' + name;
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(join(dst, 'tools'), { recursive: true });
  for (const d of ['app', 'src']) fs.cpSync(join(TREE, d), join(dst, d), { recursive: true });
  fs.cpSync(join(TREE, 'tools/lib'), join(dst, 'tools/lib'), { recursive: true });
  fs.copyFileSync(join(TREE, 'package.json'), join(dst, 'package.json'));
  let missed = false;
  for (const [f, from, to] of PLANTS[name]) {
    const p = join(dst, f);
    const s = fs.readFileSync(p, 'utf8');
    if (s.split(from).length !== 2) { say('PLANT MISSED (' + name + '): ' + f + ' has ' + (s.split(from).length - 1) + ' of ' + JSON.stringify(from)); missed = true; break; }
    fs.writeFileSync(p, s.replace(from, to));
  }
  if (missed) { fs.rmSync(dst, { recursive: true, force: true }); continue; }
  const r = spawnSync(process.execPath, [join(TREE, 'tools/verify-vibe-setting.mjs'), '--root', dst],
                      { env: { ...process.env, NODE_PATH: NM }, encoding: 'utf8', maxBuffer: 1 << 26 });
  const lines = (r.stdout + '\n' + r.stderr).split('\n');
  say('plant ' + name + ': exit ' + r.status + '  ' + (lines.find(l => /passed, /.test(l)) || '').trim());
  lines.filter(l => /✗/.test(l)).slice(0, 6).forEach(l => say('    ' + l.trim().slice(0, 220)));
  fs.rmSync(dst, { recursive: true, force: true });
}
