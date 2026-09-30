// Parity spot-check for oxblood (round 2-s1): pure files byte for byte between
// the web and native worktrees, and ten+ roles from the web's generated token
// block against native's built T.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-oxblood';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-oxblood';
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
let bad = 0;
const say = (ok, m) => { if (!ok) bad++; console.log((ok ? 'ok   ' : 'FAIL ') + m); };

for (const f of ['defs/index.js', 'defs/oxblood.js', 'icons/oxblood.js', 'defs/vocab.js', 'defs/v1.js', 'defs/chalk.js', 'icons/v1.js', 'icons/chalk.js']) {
  const a = sha(join(WEB, 'vibes', f)), b = sha(join(NAT, 'src/pure/vibes', f));
  say(a === b, f + ' web ' + a.slice(0, 12) + ' native ' + b.slice(0, 12));
}

// The web's generated token block.
const css = readFileSync(join(WEB, 'vibes/oxblood.css'), 'utf8');
const block = css.slice(0, css.indexOf('/* vibes-css:end */'));
const tok = {};
for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) tok[m[1]] = m[2].trim();

// Native: the vibe's real build.
const snap = await import(pathToFileURL(join(NAT, 'tools/lib/vibe-snap.mjs')).href);
const H = await snap.open(NAT);
const R = H.R;
const THEME = R.load('src/ui/theme.js');
const V = R.load('src/state/vibe.js');
const INDEX = R.load('src/pure/vibes/defs/index.js');
const entry = V.VIBE_DEFS.oxblood;
const built = THEME.build(entry.def, { images: entry.images, fit: entry.fit, chart: entry.chart });
THEME.applyTheme(built);
const T = THEME.default;

const pairs = [
  ['rack', T.colors.rack], ['bar', T.colors.bar], ['collar', T.colors.collar], ['knurl', T.colors.knurl],
  ['chalk', T.colors.chalk], ['steel', T.colors.steel], ['dim', T.colors.dim], ['p-chrome', T.colors.pChrome],
  ['accent', T.colors.accent], ['accent-press', T.colors.accentPressed], ['grip', T.colors.grip], ['raised', T.colors.raised],
  ['well', T.colors.well], ['inverse', T.colors.inverse], ['knockout', T.colors.knockout], ['cal-mark', T.colors.calMark],
  ['danger', T.colors.danger], ['on-danger', T.colors.onDanger], ['faint', T.colors.faint],
  ['tag-ink-w', T.tagInk && T.tagInk.W], ['tag-ink-f', T.tagInk && T.tagInk.F], ['tag-ink-d', T.tagInk && T.tagInk.D],
  ['r', T.radius.r + 'px'], ['r-sm', T.radius.sm + 'px'], ['r-tile', T.radius.tile + 'px'], ['r-plate', T.radius.plate + 'px'],
  ['r-chip', T.radius.chip + 'px'], ['r-idx', T.radius.idx + 'px'], ['r-sheet', T.radius.sheet + 'px'], ['r-pill', T.radius.pill + 'px']
];
for (const [k, n] of pairs) say(tok[k] != null && String(tok[k]).toLowerCase() === String(n).toLowerCase(), '--' + k + ' web ' + tok[k] + ' native ' + n);

// Tints the def omits (valueOf fills them): does native equal valueOf's?
const v1 = R.load('src/pure/vibes/defs/v1.js').default;
const missingTints = Object.keys(v1.tint).filter(k => !(k in entry.def.tint));
console.log('tints oxblood leaves to valueOf: ' + missingTints.join(', '));
for (const k of missingTints) {
  const t = INDEX.valueOf(entry.def, 'tint.' + k);
  console.log('  ' + k + ' valueOf ' + JSON.stringify(t) + ' native T.tint ' + JSON.stringify(T.tint[k]));
}
const missingColors = Object.keys(v1.colors).filter(k => !(k in entry.def.colors));
console.log('colours oxblood leaves to valueOf: ' + missingColors.join(', '));
for (const k of missingColors) console.log('  ' + k + ' valueOf ' + JSON.stringify(INDEX.valueOf(entry.def, 'colors.' + k)) + ' native ' + JSON.stringify(T.colors[k]));
// Fonts: web family vs native family.
console.log('web --font ' + tok['font'] + ' | native body face ' + T.text.body.fontFamily + ' | coach measured ' + JSON.stringify(T.fit && T.fit.metrics));
console.log('native toggle-off knob (registry entry keys): ' + Object.keys(entry).join(', '));
console.log(bad ? bad + ' FAILED' : 'all equal');
process.exit(bad ? 1 : 0);
