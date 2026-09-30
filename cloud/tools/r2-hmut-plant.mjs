#!/usr/bin/env node
/* r2-hmut-plant — Pnat round-2 coverage reviewer's scratch tool.
 * Plants engine-like mistakes into the build-58 scratch worktree nat-hmut, so
 * `verify-vibe-v1 --root nat-hmut` can be asked which of them it sees.
 *   node r2-hmut-plant.mjs plant [ids…]   plant all (or the named) mutations
 *   node r2-hmut-plant.mjs restore        write every touched file back from HEAD
 *   node r2-hmut-plant.mjs list
 * Each `from` must occur exactly once in the file, or nothing is written.
 * Restore writes `git show HEAD:<path>` back byte for byte, then prints status.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const TREE = '/Users/micahflunker/dev/vibes-night/wt/nat-hmut';
const git = (...a) => execFileSync('git', ['-C', TREE, ...a], { encoding: 'utf8', maxBuffer: 64e6 });

/* expect: 'caught' = a host prop moves; 'silent' = no host prop moves */
export const M = [
  { id: 'M1-samehex', expect: 'silent', why: 'same-hex token swap pGreen -> good (theme lens\'s job)',
    file: 'app/(app)/(tabs)/workout/session.jsx',
    from: "borderColor: ticked ? T.colors.pGreen : T.colors.knurl,",
    to:   "borderColor: ticked ? T.colors.good : T.colors.knurl," },
  { id: 'M2-keyorder', expect: 'silent', why: 'style key order: borderRadius moved after borderColor (canon sorts keys)',
    file: 'app/(app)/(tabs)/food.jsx',
    from: "        { width: 34, height: 34, borderRadius: T.radius.sm,\n          backgroundColor: T.colors.bar,\n          borderWidth: 1, borderColor: T.colors.collar,\n",
    to:   "        { width: 34, height: 34,\n          backgroundColor: T.colors.bar,\n          borderWidth: 1, borderColor: T.colors.collar, borderRadius: T.radius.sm,\n" },
  { id: 'M3a-undefkey-view', expect: 'caught', why: 'an undefined-valued style key on Stat\'s tile View',
    file: 'src/ui/Stat.jsx',
    from: "borderRadius: T.radius.sm, padding: T.space.m10 }}>",
    to:   "borderRadius: T.radius.sm, padding: T.space.m10, overflow: undefined }}>" },
  { id: 'M3b-undefkey-text', expect: 'caught', why: 'fontFamily: undefined on the exercise block\'s ⋯ Text (a systemFace spread gone wrong)',
    file: 'app/(app)/(tabs)/workout/session.jsx',
    from: "          <Text style={{ fontSize: 18, lineHeight: 22, color: T.colors.dim,\n                         paddingHorizontal: T.space.s6 }}>⋯</Text>",
    to:   "          <Text style={{ fontFamily: undefined, fontSize: 18, lineHeight: 22, color: T.colors.dim,\n                         paddingHorizontal: T.space.s6 }}>⋯</Text>" },
  { id: 'M4-wrapper', expect: 'caught', why: 'an empty absolute View as Card\'s first child (an image slot that draws a layer with no photo)',
    file: 'src/ui/Card.jsx',
    from: "    }, style]}>\n      {children}",
    to:   "    }, style]}>\n      <View pointerEvents=\"none\" style={{ position: 'absolute' }} />\n      {children}" },
  { id: 'M5-nullchild', expect: 'silent', why: 'a {null} child before Btn\'s Text (the engine\'s heroPhoto(null) shape)',
    file: 'src/ui/Btn.jsx',
    from: "      <Text style={[large ? T.text.btnLg : T.text.btn, { color: FG[k] }, textStyle]}>",
    to:   "      {null}\n      <Text style={[large ? T.text.btnLg : T.text.btn, { color: FG[k] }, textStyle]}>" },
  { id: 'M6a-unexec-savecheck', expect: 'silent', why: 'a WRONG colour (pRed) in SaveCheck\'s on=true branch, which no scene draws',
    file: 'src/ui/food/common.jsx',
    from: "backgroundColor: on ? T.colors.pYellow : T.colors.rack,",
    to:   "backgroundColor: on ? T.colors.pRed : T.colors.rack," },
  { id: 'M6b-unexec-nudge', expect: 'silent', why: 'a WRONG colour (pRed) in NudgeLine, which no scene draws',
    file: 'src/ui/coach/live.jsx',
    from: "style={{ fontSize: 10, lineHeight: 14, letterSpacing: 0.4, color: T.colors.pYellow }}>",
    to:   "style={{ fontSize: 10, lineHeight: 14, letterSpacing: 0.4, color: T.colors.pRed }}>" },
  { id: 'M6c-unexec-resume', expect: 'silent', why: 'Train\'s Resume button made a ghost button — the session-parked Train screen is never drawn',
    file: 'app/(app)/(tabs)/workout/index.jsx',
    from: "        <Btn kind=\"primary\" block large\n             onPress={() => router.navigate('/workout/session')}>",
    to:   "        <Btn kind=\"ghost\" block large\n             onPress={() => router.navigate('/workout/session')}>" },
  { id: 'M7-pressed', expect: 'caught', why: 'Btn\'s pressed scale press -> pressHard (only in the pressed style)',
    file: 'src/ui/Btn.jsx',
    from: "transform: [{ scale: pressed && !disabled ? T.motion.press : 1 }]",
    to:   "transform: [{ scale: pressed && !disabled ? T.motion.pressHard : 1 }]" },
  { id: 'M8-pressedchildren', expect: 'caught', why: 'ProposedRow Save\'s pressed ink chalk -> pWhite (children-as-function, pressed only)',
    file: 'src/ui/food/common.jsx',
    from: "color: pressed ? T.colors.chalk : T.colors.steel })}>Save</Text>",
    to:   "color: pressed ? T.colors.pWhite : T.colors.steel })}>Save</Text>" },
  { id: 'M9-theme-undrawn', expect: 'caught', why: 'theme.js pYellowPressed off by one (a token the $theme scene holds)',
    file: 'src/ui/theme.js',
    from: "pYellowPressed: '#d9a90f',",
    to:   "pYellowPressed: '#d9a90e'," },
  { id: 'M10-inertkey', expect: 'caught', why: 'an added key with the default value (opacity: 1) on Chip',
    file: 'src/ui/Chip.jsx',
    from: null, to: null },
  { id: 'M12-fragment', expect: 'silent', why: 'Steps\' header View wrapped in a fragment (a composite with no host, like ScreenTitle / KeepPath)',
    file: 'app/(app)/(tabs)/steps.jsx',
    from: "        <View>\n          <Eyebrow>Movement</Eyebrow>\n          <Text style={T.text.h1}>Steps</Text>\n        </View>",
    to:   "        <><View>\n          <Eyebrow>Movement</Eyebrow>\n          <Text style={T.text.h1}>Steps</Text>\n        </View></>" },
  { id: 'M13-arrayorder', expect: 'caught', why: 'Stat\'s value style array reversed, so the preset\'s chalk wins over a passed colour',
    file: 'src/ui/Stat.jsx',
    from: "<Text style={[T.text.statVal, color ? { color } : { color: T.colors.chalk }]}>",
    to:   "<Text style={[color ? { color } : { color: T.colors.chalk }, T.text.statVal]}>" },
  { id: 'M15-worklet', expect: 'caught', why: 'SetRow\'s flash worklet paints pickSel instead of setFlash',
    file: 'src/ui/train/SetRow.jsx',
    from: "      ? T.tint.setFlash\n",
    to:   "      ? T.tint.pickSel\n" },
  { id: 'M16-duration', expect: 'caught', why: 'the tick flash\'s fade 600 -> 601 ms',
    file: 'src/ui/train/SetRow.jsx',
    from: "withTiming(0, { duration: 600, easing",
    to:   "withTiming(0, { duration: 601, easing" },
  { id: 'M18-statusbar', expect: 'caught', why: '<StatusBar style> light -> auto',
    file: 'app/_layout.jsx',
    from: "<StatusBar style=\"light\" />",
    to:   "<StatusBar style=\"auto\" />" },
  /* batch 2 */
  { id: 'M6d-unexec-savecheck-off', expect: 'silent', why: 'a WRONG colour (bar) in SaveCheck\'s on=false branch, which no scene draws',
    file: 'src/ui/food/common.jsx',
    from: "backgroundColor: on ? T.colors.pYellow : T.colors.rack,",
    to:   "backgroundColor: on ? T.colors.pYellow : T.colors.bar," },
  { id: 'M19-nullinarray', expect: 'silent', why: 'a null entry in Card\'s style array',
    file: 'src/ui/Card.jsx',
    from: "      marginBottom: T.space.m12\n    }, style]}>",
    to:   "      marginBottom: T.space.m12\n    }, null, style]}>" },
  { id: 'M22-applayout-pathname', expect: 'silent', why: 'AppLayout subscribes to usePathname() (64a5f06\'s shape: one extra layout render per route change)',
    file: 'app/(app)/_layout.jsx',
    from: "  const [phase, setPhase]   = useState('checking');   // checking|setup|booting|ready",
    to:   "  const planted = usePathname();\n  const [phase, setPhase]   = useState('checking');   // checking|setup|booting|ready" },
  { id: 'M22b-import', expect: 'silent', why: '(M22\'s import)',
    file: 'app/(app)/_layout.jsx',
    from: "import { Stack, router } from 'expo-router';",
    to:   "import { Stack, router, usePathname } from 'expo-router';" }
];

const mode = process.argv[2];
if (mode === 'list') { M.forEach(m => console.log(m.id, m.expect, m.file, '—', m.why)); process.exit(0); }
if (mode === 'restore') {
  const files = [...new Set(M.map(m => m.file))];
  for (const f of files) writeFileSync(join(TREE, f), git('show', 'HEAD:' + f));
  console.log('restored', files.length, 'files from HEAD');
  console.log('status:', JSON.stringify(git('status', '--porcelain')));
  process.exit(0);
}
if (mode !== 'plant') { console.error('usage: plant [ids] | restore | list'); process.exit(2); }
const want = process.argv.slice(3);
const pick = want.length ? M.filter(m => want.includes(m.id)) : M;
const byFile = new Map();
for (const m of pick) {
  if (!byFile.has(m.file)) byFile.set(m.file, readFileSync(join(TREE, m.file), 'utf8'));
  let s = byFile.get(m.file);
  if (m.id === 'M10-inertkey') {
    // Chip's pill style: find its first `borderRadius: T.radius.pill` and add opacity: 1 beside it
    const at = s.indexOf('borderRadius: T.radius.pill');
    if (at < 0 || s.indexOf('borderRadius: T.radius.pill', at + 1) >= 0) { console.error('SKIP ' + m.id + ': not exactly one borderRadius: T.radius.pill'); continue; }
    s = s.slice(0, at) + 'opacity: 1, ' + s.slice(at);
  } else {
    const n = s.split(m.from).length - 1;
    if (n !== 1) { console.error('SKIP ' + m.id + ': `from` occurs ' + n + ' times in ' + m.file); continue; }
    s = s.replace(m.from, () => m.to);
  }
  byFile.set(m.file, s);
  console.log('planted', m.id, '(' + m.expect + ')', m.file);
}
for (const [f, s] of byFile) writeFileSync(join(TREE, f), s);
console.log('status:', JSON.stringify(git('status', '--porcelain')));
