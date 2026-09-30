// Spot check (gate parity, clear-sky, round 1-d1): (A) the pure vibe files
// byte for byte, web worktree against native worktree; (B) the web's generated
// token block (vibes/clear-sky.css between the vibes-css markers) against the
// native build (theme.js build() of the same definition), role by role; (C) a
// few type presets: the web's hand-written preset CSS against native T.text.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-clear-sky';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-clear-sky';
if (process.env.TZ !== 'America/New_York') { console.log('run with TZ=America/New_York'); process.exit(2); }
let bad = 0;
const sha = p => createHash('sha256').update(readFileSync(p)).digest('hex');
console.log('A  pure files, byte for byte');
for (const f of ['defs/clear-sky.js', 'icons/clear-sky.js', 'defs/index.js', 'defs/vocab.js', 'defs/v1.js', 'icons/v1.js']) {
  const w = sha(WEB + '/vibes/' + f), n = sha(NAT + '/src/pure/vibes/' + f);
  if (w !== n) bad++;
  console.log((w === n ? 'ok  ' : 'DIFF') + '  ' + f.padEnd(20) + ' ' + w.slice(0, 16) + ' ' + n.slice(0, 16));
}

const { open } = await import(NAT + '/tools/lib/vibe-snap.mjs');
const H = await open(NAT);
const R = H.R;
const THEME = R.load('src/ui/theme.js');
const T = THEME.default;
const V = R.load('src/state/vibe.js');
const e = V.VIBE_DEFS['clear-sky'];
THEME.applyTheme(THEME.build(e.def, { images: e.images, fit: e.fit, chart: e.chart }));

const css = readFileSync(WEB + '/vibes/clear-sky.css', 'utf8');
const block = css.slice(css.indexOf('vibes-css:begin'), css.indexOf('vibes-css:end'));
const tok = {};
for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) tok[m[1]] = m[2].trim();
const px = s => (s == null ? s : Number(String(s).replace(/px$/, '')));
const rgbaW = s => s && s.replace(/\s+/g, '').replace(/,\./g, ',0.');
const rgbaN = s => s && s.replace(/\s+/g, '');

console.log('\nB  web token block vs native T');
const rows = [
  ['rack (page)', tok['rack'], T.colors.rack],
  ['bar (slip)', tok['bar'], T.colors.bar],
  ['collar', tok['collar'], T.colors.collar],
  ['knurl (rule)', tok['knurl'], T.colors.knurl],
  ['chalk (ink)', tok['chalk'], T.colors.chalk],
  ['steel', tok['steel'], T.colors.steel],
  ['dim', tok['dim'], T.colors.dim],
  ['accent', tok['accent'], T.colors.accent],
  ['accentPress', tok['accent-press'], T.colors.accentPressed],
  ['knob', tok['knob'], T.colors.knob],
  ['greetName', tok['greet-name'], T.colors.greetName],
  ['raised', tok['raised'], T.colors.raised],
  ['track', tok['track'], T.colors.track],
  ['grip', tok['grip'], T.colors.grip],
  ['well', tok['well'], T.colors.well],
  ['inverse', tok['inverse'], T.colors.inverse],
  ['knockout', tok['knockout'], T.colors.knockout],
  ['danger', tok['danger'], T.colors.danger],
  ['good', tok['good'], T.colors.good],
  ['pYellow', tok['p-yellow'], T.colors.pYellow],
  ['tagInk W', tok['tag-ink-w'], T.tagInk.W],
  ['tagInk F', tok['tag-ink-f'], T.tagInk.F],
  ['tagInk D', tok['tag-ink-d'], T.tagInk.D],
  ['radius r', px(tok['r']), T.radius.r],
  ['radius sm', px(tok['r-sm']), T.radius.sm],
  ['radius chip', px(tok['r-chip']), T.radius.chip],
  ['radius tile', px(tok['r-tile']), T.radius.tile],
  ['radius plate', px(tok['r-plate']), T.radius.plate],
  ['radius mark', px(tok['r-mark']), T.radius.mark],
  ['radius idx', px(tok['r-idx']), T.radius.idx],
  ['radius sheet', px(tok['r-sheet']), T.radius.sheet],
  ['tint runway', rgbaW(tok['tint-runway']), rgbaN(T.tint && T.tint.runway)],
  ['ring calHead', tok['shadow-cal-head'], T.ring && T.ring.calHead && JSON.stringify(T.ring.calHead)],
];
for (const [k, w, n] of rows) {
  const ok = String(w).toLowerCase() === String(n).toLowerCase();
  if (!ok && k !== 'ring calHead') bad++;
  console.log((ok ? 'ok  ' : (k === 'ring calHead' ? 'info' : 'DIFF')) + '  ' + k.padEnd(16) + ' web ' + String(w).padEnd(28) + ' native ' + n);
}
console.log('T.shape keys:', T.shape ? Object.keys(T.shape).join(',') : '(none)');
if (T.shape) {
  const S = T.shape;
  const col = v => (v && T.colors[v] ? T.colors[v] : v);
  const sh = [
    ['rule.ink', tok['shape-rule-ink'], col(S.rule && S.rule.ink)],
    ['rule.hair', px(tok['shape-rule-hair']), S.rule && S.rule.hair],
    ['keyline.ink', tok['shape-keyline-ink'], col(S.keyline && S.keyline.ink)],
    ['cue.ink', tok['shape-cue-ink'], col(S.cue && S.cue.ink)],
    ['band.fill', tok['shape-band-fill'], col(S.band && S.band.fill)],
  ];
  for (const [k, w, n] of sh) {
    const ok = String(w).toLowerCase() === String(n).toLowerCase();
    if (!ok) bad++;
    console.log((ok ? 'ok  ' : 'DIFF') + '  ' + k.padEnd(16) + ' web ' + String(w).padEnd(28) + ' native ' + n);
  }
}
console.log('\nC  type presets (native T.text)');
for (const k of ['hero', 'headline', 'h1', 'eyebrow', 'statLbl', 'kpiVal', 'youGreet', 'tag', 'dockLbl', 'chip', 'segBtn', 'btnLg']) console.log(k.padEnd(9), JSON.stringify(T.text[k]));
console.log('fonts native:', T.fonts.keys.join(','), '| web --font', tok['font']);
console.log('chrome', JSON.stringify(T.chrome));
console.log(bad ? bad + ' DIFF' : 'all equal');
process.exit(bad ? 1 : 0);
