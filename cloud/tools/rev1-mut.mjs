#!/usr/bin/env node
/* rev1-mut — plant engine-like mistakes, one at a time, in a scratch checkout
 * of 1cb6498 and ask the v1 proof whether it sees each one (Pnat adversarial
 * reviewer, coverage lens). Every file is written back byte for byte after its
 * run, and the checkout's cleanliness is checked at the end.
 *
 * usage: node rev1-mut.mjs <scratch tree> <proof tree> <log dir> [id …]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const [TREE, PROOF, LOGS, ...ONLY] = process.argv.slice(2);
mkdirSync(LOGS, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');

const M = [
  // --- kinds of mistake an engine rewrite makes, and whether the proof sees them ---
  { id: 'same-hex-token', file: 'src/ui/Dock.jsx', find: 'backgroundColor: T.colors.pYellow,', repl: 'backgroundColor: T.colors.warn,',
    expect: 'missed', why: 'Dock focus mark reads warn (same hex as pYellow): identical bytes, the theme lens\'s job' },
  { id: 'style-key-order', file: 'src/ui/Card.jsx',
    find: '      backgroundColor: T.colors.bar,\n      borderWidth: 1, borderColor: T.colors.collar,\n      borderRadius: T.radius.r,\n',
    repl: '      borderRadius: T.radius.r,\n      borderColor: T.colors.collar, borderWidth: 1,\n      backgroundColor: T.colors.bar,\n',
    expect: 'missed', why: 'canon() sorts keys; RN resolves a flattened style by key, not order' },
  { id: 'undefined-key', file: 'src/ui/Card.jsx', find: '      marginBottom: T.space.m12\n    }, style]}>',
    repl: '      marginBottom: T.space.m12,\n      borderStyle: undefined\n    }, style]}>', expect: 'caught', why: 'val() writes $undefined' },
  { id: 'undefined-override', file: 'src/ui/Card.jsx', find: '    }, style]}>\n      {children}',
    repl: '    }, { borderColor: undefined }, style]}>\n      {children}', expect: 'caught', why: 'an undefined later in the array wipes the border colour' },
  { id: 'extra-empty-view-at-slot', file: 'src/ui/Card.jsx', find: '    }, style]}>\n      {children}',
    repl: '    }, style]}>\n      <View pointerEvents="none" />\n      {children}', expect: 'caught', why: 'a photo slot that renders an empty View' },
  { id: 'wrapper-view-at-slot', file: 'src/ui/Card.jsx', find: '    }, style]}>\n      {children}\n    </View>',
    repl: '    }, style]}>\n      <View>{children}</View>\n    </View>', expect: 'caught', why: 'a wrapper around the box contents' },
  { id: 'prop-leak-undefined', file: 'src/ui/Card.jsx', find: '    <View style={[{\n      backgroundColor: T.colors.bar,',
    repl: '    <View photo={undefined} style={[{\n      backgroundColor: T.colors.bar,', expect: 'caught', why: 'a slot prop passed through to the host, undefined' },
  { id: 'systemface-undefined', file: 'src/ui/chart/EmptyChart.jsx', find: "<Text style={{ textAlign: 'center', fontSize: 12, color: T.colors.dim }}>",
    repl: "<Text style={{ fontFamily: undefined, textAlign: 'center', fontSize: 12, color: T.colors.dim }}>", expect: 'caught',
    why: 'a system-face spread that yields { fontFamily: undefined } rather than nothing' },
  { id: 'fragment-at-slot', file: 'src/ui/Card.jsx', find: '    }, style]}>\n      {children}',
    repl: '    }, style]}>\n      <>{null}</>\n      {children}', expect: 'missed', why: 'no host at all: invisible here and on the phone' },
  { id: 'list-key-change', file: 'src/ui/Splash.jsx', find: '<Plate key={c} colour={c}', repl: '<Plate key={i} colour={c}',
    expect: 'missed', why: 'keys are not props' },
  { id: 'pressed-style', file: 'src/ui/you/Hero.jsx', find: 'backgroundColor: pressed ? T.colors.collar : T.colors.bar,',
    repl: 'backgroundColor: pressed ? T.colors.knurl : T.colors.bar,', expect: 'caught', why: 'sp, the style function at pressed:true' },
  { id: 'status-bar', file: 'app/_layout.jsx', find: '<StatusBar style="light" />', repl: '<StatusBar style="dark" />',
    expect: 'caught', why: 'StatusBar is a prop-recording stand-in' },
  { id: 'worklet-done-branch', file: 'src/ui/train/SetRow.jsx', find: "(done ? T.tint.setDone : 'transparent')",
    repl: "(done ? T.tint.pickSel : 'transparent')", expect: 'caught', why: 'the worklet runs at the current values (done rows) and at 1' },
  { id: 'worklet-interpolate', file: 'src/ui/train/SetRow.jsx', find: '[T.tint.coachLow, T.tint.coachHigh]',
    repl: '[T.tint.coachHigh, T.tint.coachLow]', expect: 'caught', why: 'interpolateColor records its arguments' },
  { id: 'theme-value-at-boot', file: 'src/ui/theme.js', find: "pYellowPressed: '#d9a90f'", repl: "pYellowPressed: '#d9a90e'",
    expect: 'caught', why: '$theme dumps build 58\'s tables' },
  { id: 'theme-new-key', file: 'src/ui/theme.js', find: "  fallback: '#8d939f'       // analytics.js groupColor() default\n};",
    repl: "  fallback: '#8d939f',      // analytics.js groupColor() default\n  accent: '#abcdef'\n};",
    expect: 'missed', why: 'a key build 58 lacks is not in $theme (by design: new slots allowed)' },
  // --- the engine-changed call sites no scene executes (rev1-cov), each with a WRONG value planted ---
  { id: 'gap-streak-ring', file: 'app/(app)/(tabs)/steps.jsx', find: 'cur > 0 && { backgroundColor: T.alpha.yellow(0.16),',
    repl: 'cur > 0 && { backgroundColor: T.alpha.yellow(0.26),', expect: 'missed', why: 'StreakCard cur > 0 never drawn' },
  { id: 'gap-steps-over-ring', file: 'app/(app)/(tabs)/steps.jsx', find: 'stroke={T.colors.pYellow}', repl: 'stroke={T.colors.pRed}',
    expect: 'missed', why: 'StepRing over-goal arc never drawn' },
  { id: 'gap-btn-plain', file: 'src/ui/Btn.jsx', find: 'plain:   T.colors.collar', repl: 'plain:   T.colors.knurl',
    expect: 'missed', why: 'no call site passes kind plain (dead default)' },
  { id: 'gap-resume-btn', file: 'app/(app)/(tabs)/workout/index.jsx',
    find: "<Btn kind=\"primary\" block large\n             onPress={() => router.navigate('/workout/session')}>",
    repl: "<Btn kind=\"ghost\" block large\n             onPress={() => router.navigate('/workout/session')}>",
    expect: 'missed', why: 'Train with a live session (Resume) never drawn' },
  { id: 'gap-goal-chip-on', file: 'src/ui/coach/goal.jsx', find: 'borderColor: on ? T.colors.pYellow : T.colors.collar,',
    repl: 'borderColor: on ? T.colors.pRed : T.colors.collar,', expect: 'missed', why: 'a chosen goal chip never drawn' },
  { id: 'gap-lift-target-open', file: 'src/ui/coach/goal.jsx', find: 'borderColor: open ? T.colors.pYellow : T.colors.collar,',
    repl: 'borderColor: open ? T.colors.pRed : T.colors.collar,', expect: 'missed', why: 'LiftTarget open never drawn' },
  { id: 'gap-savecheck-off', file: 'src/ui/food/common.jsx', find: 'backgroundColor: on ? T.colors.pYellow : T.colors.rack,',
    repl: 'backgroundColor: on ? T.colors.pYellow : T.colors.bar,', expect: 'missed', why: 'SaveCheck unticked never drawn' },
  { id: 'gap-nudge-line', file: 'src/ui/coach/live.jsx', find: 'letterSpacing: 0.4, color: T.colors.pYellow }}>',
    repl: 'letterSpacing: 0.4, color: T.colors.pRed }}>', expect: 'missed', why: 'NudgeLine never drawn' },
  { id: 'gap-admin-everything-chart', file: 'app/(app)/(tabs)/you/admin.jsx',
    find: ': <LineChart points={pts} color={T.colors.pYellow} height={168}', repl: ': <LineChart points={pts} color={T.colors.pRed} height={168}',
    expect: 'missed', why: '"Everything, per day" with 2+ days never drawn' },
  { id: 'gap-usda-desc', file: 'src/ui/food/estimator.jsx', find: "color: T.colors.dim, marginTop: 5 }}>\n              {'USDA: ' + desc}",
    repl: "color: T.colors.steel, marginTop: 5 }}>\n              {'USDA: ' + desc}", expect: 'missed', why: 'ProposedEdit with a USDA desc never drawn' },
  { id: 'gap-android-pane', file: 'src/ui/steps/sheets.jsx', find: 'borderRadius: 11,\n                         backgroundColor: T.colors.collar,',
    repl: 'borderRadius: 11,\n                         backgroundColor: T.colors.knurl,', expect: 'missed', why: 'AndroidPane never drawn (iOS)' },
  { id: 'gap-block-unticked', file: 'app/(app)/(tabs)/workout/session.jsx', find: 'borderColor: ticked ? T.colors.pGreen : T.colors.knurl,',
    repl: 'borderColor: ticked ? T.colors.pGreen : T.colors.collar,', expect: 'missed', why: 'LiftingBlock tick-all unticked never drawn' },
  { id: 'gap-traj-warn-ring', file: 'src/ui/you/verdicts.jsx', find: ": t.status ? 'rgba(240,190,30,0.18)' : 'transparent';",
    repl: ": t.status ? 'rgba(240,190,30,0.28)' : 'transparent';", expect: 'missed', why: 'trajectory dot with a warn status never drawn' },
  { id: 'gap-finishfit', file: 'src/pure/coach-view.js', find: '2 * (CARD_GUTTER + CARD_PAD + CARD_BORDER)',
    repl: '2 * (CARD_GUTTER + CARD_PAD)', expect: 'missed', why: 'no scene draws the Coach card\'s finish line (finishFit); verify-coach-surface is its proof' }
];

const results = [];
const touched = new Map();
for (const m of M) {
  if (ONLY.length && !ONLY.includes(m.id)) continue;
  const path = join(TREE, m.file);
  const orig = readFileSync(path);
  if (!touched.has(path)) touched.set(path, sha(orig));
  const text = orig.toString('utf8');
  const n = text.split(m.find).length - 1;
  if (n !== 1) { results.push({ id: m.id, error: 'find string occurs ' + n + ' times in ' + m.file }); continue; }
  let r;
  try {
    writeFileSync(path, text.replace(m.find, m.repl));
    r = spawnSync(process.execPath, [join(PROOF, 'tools/verify-vibe-v1.mjs'), '--root', TREE, '--max', '4'],
                  { encoding: 'utf8', maxBuffer: 1 << 26 });
  } finally {
    writeFileSync(path, orig);
  }
  const out = (r.stdout || '') + (r.stderr || '');
  writeFileSync(join(LOGS, m.id + '.log'), out);
  const tally = (out.match(/(\d+) passed, (\d+) failed/) || [])[0] || '?';
  const caught = r.status !== 0;
  const moved = (out.match(/^ {4,}.*scene.*$/m) || [''])[0].trim().slice(0, 200);
  results.push({ id: m.id, file: m.file, expect: m.expect, got: caught ? 'caught' : 'missed', tally, as: m.expect === (caught ? 'caught' : 'missed'), why: m.why, first: moved });
}
// Every file back as it was, and the checkout clean.
const restored = [...touched].every(([p, s]) => sha(readFileSync(p)) === s);
const status = execFileSync('git', ['-C', TREE, 'status', '--porcelain'], { encoding: 'utf8' }).split('\n').filter(Boolean);
for (const x of results) console.log(JSON.stringify(x));
console.log('restored byte for byte: ' + restored + '; git status: ' + JSON.stringify(status));
writeFileSync(join(LOGS, 'summary.json'), JSON.stringify({ results, restored, status }, null, 1));
