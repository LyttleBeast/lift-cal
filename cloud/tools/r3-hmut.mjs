#!/usr/bin/env node
/* r3-hmut — Pnat round-3 coverage reviewer's scratch tool.
 * Plants ONE engine-like mistake at a time into the build-58 scratch worktree
 * wt/nat-hmut (detached 1cb6498), runs the proof's verify-vibe-v1 with
 * --root nat-hmut, records whether it went red, and writes the file back
 * byte for byte before the next one. At the start and the end every file any
 * mutation names is written back from `git show HEAD:<path>`, and the tree's
 * status is printed (only `?? node_modules` is clean).
 *   node r3-hmut.mjs <outDir> [ids…]
 * expect: 'caught' = a host prop / call moves;  'silent' = nothing the proof records moves.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const TREE = '/Users/micahflunker/dev/vibes-night/wt/nat-hmut';
const PROOF = '/Users/micahflunker/dev/vibes-night/wt/nat-proof/tools/verify-vibe-v1.mjs';
const git = (...a) => execFileSync('git', ['-C', TREE, ...a], { encoding: 'utf8', maxBuffer: 64e6 });
const [OUT, ...only] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });

const M = [
  /* A. what round 3's proof added — sn, fn — and the calls channel */
  { id: 'A1-sn-undefined', expect: 'caught', why: 'Steps title View handed style={undefined} (round 2 finding 3 shape)',
    file: 'app/(app)/(tabs)/steps.jsx', edits: [["        <View>\n          <Eyebrow>Movement</Eyebrow>", "        <View style={undefined}>\n          <Eyebrow>Movement</Eyebrow>"]] },
  { id: 'A2-sn-null', expect: 'caught', why: 'Fuel title View handed style={null}',
    file: 'app/(app)/(tabs)/food.jsx', edits: [["        <View>\n          <Eyebrow>Fuel</Eyebrow>", "        <View style={null}>\n          <Eyebrow>Fuel</Eyebrow>"]] },
  { id: 'A3-emptyarray-style', expect: 'caught', why: 'Steps title View handed style={[]} (a flattened empty style)',
    file: 'app/(app)/(tabs)/steps.jsx', edits: [["        <View>\n          <Eyebrow>Movement</Eyebrow>", "        <View style={[]}>\n          <Eyebrow>Movement</Eyebrow>"]] },
  { id: 'A4-fn-gained', expect: 'caught', why: 'Stat tile View gains an onLayout handler',
    file: 'src/ui/Stat.jsx', edits: [["    <View style={{ flex: 1, backgroundColor: T.colors.bar,", "    <View onLayout={() => {}} style={{ flex: 1, backgroundColor: T.colors.bar,"]] },
  { id: 'A5-fn-lost', expect: 'caught', why: 'Chip\'s Pressable loses onPress',
    file: 'src/ui/Chip.jsx', edits: [["    <Pressable\n      onPress={onPress}\n      accessibilityRole=\"button\"", "    <Pressable\n      accessibilityRole=\"button\""]] },
  { id: 'A6-fn-vhost', expect: 'caught', why: 'SheetHost\'s Modal (a recording vhost) gains onShow',
    file: 'src/ui/Sheet.jsx', edits: [["    <Modal visible transparent animationType=\"slide\"\n", "    <Modal visible transparent animationType=\"slide\" onShow={() => {}}\n"]] },
  { id: 'A7-badge-ownkey', expect: 'caught', why: 'SetTypeBadge guarded with an own-key lookup (draws where build 58 threw)',
    file: 'src/ui/train/SetRow.jsx', edits: [["  const [bg, fg] = TINT[type] || [T.colors.collar, T.colors.steel];",
      "  const [bg, fg] = (Object.prototype.hasOwnProperty.call(TINT, type) && TINT[type]) || [T.colors.collar, T.colors.steel];"]] },
  { id: 'A8-timer', expect: 'caught', why: 'Splash plate effect sets an extra 4.321 s timer (the calls channel)',
    file: 'src/ui/Splash.jsx', edits: [["  useEffect(() => {\n    Animated.timing(a, {", "  useEffect(() => {\n    setTimeout(() => {}, 4321);\n    Animated.timing(a, {"]] },
  { id: 'A9-net-bypass', expect: 'silent', why: 'Btn hands onPress through WITHOUT guarded() — the tap net is gone (what a press does, not a prop)',
    file: 'src/ui/Btn.jsx', edits: [["      onPress={disabled ? undefined : guarded(onPress)}", "      onPress={disabled ? undefined : onPress}"]] },

  /* B. wrong tokens at the call sites the engine changed that NO scene draws */
  { id: 'B1-streak-running', expect: 'silent', why: 'Steps StreakCard with a streak running (cur > 0): yellow .16 -> red .16',
    file: 'app/(app)/(tabs)/steps.jsx', edits: [["cur > 0 && { backgroundColor: T.alpha.yellow(0.16),", "cur > 0 && { backgroundColor: T.alpha.red(0.16),"]] },
  { id: 'B2-goalchip-on', expect: 'silent', why: 'Your goal: a SELECTED chip\'s border pYellow -> pRed',
    file: 'src/ui/coach/goal.jsx', edits: [["borderColor: on ? T.colors.pYellow : T.colors.collar,", "borderColor: on ? T.colors.pRed : T.colors.collar,"]] },
  { id: 'B3-lifttarget-open', expect: 'silent', why: 'Your goal: the lift target OPEN, border pYellow -> pRed',
    file: 'src/ui/coach/goal.jsx', edits: [["borderColor: open ? T.colors.pYellow : T.colors.collar,", "borderColor: open ? T.colors.pRed : T.colors.collar,"]] },
  { id: 'B4-androidpane', expect: 'silent', why: 'Steps automation, Android pane step circle collar -> pRed',
    file: 'src/ui/steps/sheets.jsx', edits: [["          <View style={{ width: 22, height: 22, borderRadius: 11,\n                         backgroundColor: T.colors.collar,",
      "          <View style={{ width: 22, height: 22, borderRadius: 11,\n                         backgroundColor: T.colors.pRed,"]] },
  { id: 'B5-proposededit-usda', expect: 'silent', why: 'Estimator row edit, the USDA line dim -> pRed',
    file: 'src/ui/food/estimator.jsx', edits: [["<Text style={{ fontSize: 11, lineHeight: 15, color: T.colors.dim, marginTop: 5 }}>\n              {'USDA: ' + desc}",
      "<Text style={{ fontSize: 11, lineHeight: 15, color: T.colors.pRed, marginTop: 5 }}>\n              {'USDA: ' + desc}"]] },
  { id: 'B6-trajwarn-spelling', expect: 'silent', why: 'Trajectory dot ring for a warn status: the same colour spelled rgba() with spaces',
    file: 'src/ui/you/verdicts.jsx', edits: [[": t.status ? 'rgba(240,190,30,0.18)' : 'transparent';", ": t.status ? 'rgba(240, 190, 30, 0.18)' : 'transparent';"]] },
  { id: 'B7-subject-fallback', expect: 'silent', why: 'Every finding row\'s unknown-subject fallback steel -> pRed (3 sites)',
    file: 'src/ui/you/verdicts.jsx', all: true, edits: [["] || T.colors.steel}", "] || T.colors.pRed}"]] },
  { id: 'B8-typepill-fallback', expect: 'silent', why: 'Admin TypePill unknown-type fallback dim -> pRed',
    file: 'src/ui/admin/sheets.jsx', edits: [["const c = color || PILL[type] || T.colors.dim;", "const c = color || PILL[type] || T.colors.pRed;"]] },
  { id: 'B9-block-unticked', expect: 'silent', why: 'Session block tick NOT ticked: border knurl -> pRed',
    file: 'app/(app)/(tabs)/workout/session.jsx', edits: [["borderColor: ticked ? T.colors.pGreen : T.colors.knurl,", "borderColor: ticked ? T.colors.pGreen : T.colors.pRed,"]] },
  { id: 'B10-group-fallback', expect: 'silent', why: 'Train calendar day cell, unknown group dim -> pRed',
    file: 'app/(app)/(tabs)/workout/index.jsx', edits: [["backgroundColor: (GROUPS[g] || {}).color || T.colors.dim }} />", "backgroundColor: (GROUPS[g] || {}).color || T.colors.pRed }} />"]] },
  { id: 'B11-finishfit-box', expect: 'silent', why: 'coach-view.js finishFit() box one point narrower (the Coach card\'s finish line path)',
    file: 'src/pure/coach-view.js', edits: [["- 2 * (CARD_GUTTER + CARD_PAD + CARD_BORDER);", "- 2 * (CARD_GUTTER + CARD_PAD + CARD_BORDER + 1);"]] },

  /* C. the engine's own structural shapes, in isolation */
  { id: 'C1-splash-key', expect: 'silent', why: 'Splash plates keyed by place, not colour (the engine\'s change)',
    file: 'src/ui/Splash.jsx', edits: [["<Plate key={c} colour={c}", "<Plate key={i} colour={c}"]] },
  { id: 'C2-applayout-fragment', expect: 'silent', why: '(app) layout returns a fragment: a host-less leaf + a keyed Stack (KeepPath\'s shape)',
    file: 'app/(app)/_layout.jsx', edits: [
      ["  return (\n    <Stack screenOptions={{ headerShown: false,", "  return (\n    <><Leaf />\n    <Stack key={'vibe-' + 0} screenOptions={{ headerShown: false,"],
      ["    </Stack>\n  );\n}\n\n/* The real one now", "    </Stack></>\n  );\n}\nfunction Leaf() { return null; }\n\n/* The real one now"]] }
];

const files = [...new Set(M.map(m => m.file))];
const restoreAll = () => { for (const f of files) writeFileSync(join(TREE, f), git('show', 'HEAD:' + f)); return git('status', '--porcelain').trim(); };
console.log('start: restored ' + files.length + ' files; status: ' + JSON.stringify(restoreAll()));
const results = [];
for (const m of M) {
  if (only.length && !only.includes(m.id)) continue;
  const abs = join(TREE, m.file);
  const orig = readFileSync(abs, 'utf8');
  let s = orig, bad = null;
  for (const [from, to] of m.edits) {
    const n = s.split(from).length - 1;
    if (m.all ? n < 1 : n !== 1) { bad = '`from` occurs ' + n + ' times'; break; }
    s = m.all ? s.split(from).join(to) : s.replace(from, () => to);
  }
  if (bad) { results.push({ id: m.id, expect: m.expect, got: 'SKIPPED', detail: bad }); console.log('SKIP', m.id, bad); continue; }
  writeFileSync(abs, s);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [PROOF, '--root', TREE, '--max', '6'], { encoding: 'utf8', maxBuffer: 64e6 });
  writeFileSync(abs, orig);
  const out = (r.stdout || '') + (r.stderr || '');
  writeFileSync(join(OUT, m.id + '.log'), out);
  const tally = (/(\d+) passed, (\d+) failed/.exec(out) || []).slice(1).join('/');
  const differ = (/\d+ scene\(s\) differ: [^\n]*/.exec(out) || [''])[0];
  const threw = (/✗ \d+ scenes drawn[^\n]*/.exec(out) || [''])[0];
  const got = r.status === 0 ? 'silent' : 'caught';
  const firstDiff = out.split('\n').filter(l => /^\s{6}\S/.test(l) || /#\d+ /.test(l)).slice(0, 6).join(' | ');
  results.push({ id: m.id, expect: m.expect, got, ok: got === m.expect, exit: r.status, tally, ms: Date.now() - t0, why: m.why, differ: differ.slice(0, 300), threw: threw.slice(0, 200), firstDiff: firstDiff.slice(0, 700) });
  console.log((got === m.expect ? 'as expected ' : 'UNEXPECTED  ') + m.id + ': ' + got + ' (' + tally + ', exit ' + r.status + ') ' + differ.slice(0, 160));
  const st = git('status', '--porcelain').trim();
  if (st !== '?? node_modules') { console.log('  tree not clean after restore: ' + st); break; }
}
const end = restoreAll();
const same = files.every(f => readFileSync(join(TREE, f), 'utf8') === git('show', 'HEAD:' + f));
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ results, endStatus: end, filesEqualHead: same }, null, 1));
console.log('end status: ' + JSON.stringify(end) + '; every touched file equals HEAD: ' + same);
