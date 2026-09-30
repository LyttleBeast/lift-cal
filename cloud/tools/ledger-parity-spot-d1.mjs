// Spot check (gate parity, ledger, round 1-d1): the web's generated token block
// (vibes/ledger.css, between the vibes-css markers) against the native build
// (theme.js build() of the same definition), role by role.
import { readFileSync } from 'node:fs';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-ledger';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-ledger';
if (process.env.TZ !== 'America/New_York') { console.log('run with TZ=America/New_York'); process.exit(2); }
const { open } = await import(NAT + '/tools/lib/vibe-snap.mjs');
const H = await open(NAT);
const R = H.R;
const THEME = R.load('src/ui/theme.js');
const T = THEME.default;
const V = R.load('src/state/vibe.js');
const e = V.VIBE_DEFS.ledger;
THEME.applyTheme(THEME.build(e.def, { images: e.images, fit: e.fit, chart: e.chart }));

const css = readFileSync(WEB + '/vibes/ledger.css', 'utf8');
const block = css.slice(css.indexOf('vibes-css:begin'), css.indexOf('vibes-css:end'));
const tok = {};
for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) tok[m[1]] = m[2].trim();
const px = s => (s == null ? s : Number(String(s).replace(/px$/, '')));
const rgbaW = s => s && s.replace(/\s+/g, '').replace(/,\./g, ',0.');
const rgbaN = s => s && s.replace(/\s+/g, '');

const rows = [
  ['rack (ground)', tok['rack'], T.colors.rack],
  ['bar (card)', tok['bar'], T.colors.bar],
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
  ['danger', tok['danger'], T.colors.danger],
  ['tagInk W', tok['tag-ink-w'], T.tagInk.W],
  ['radius r', px(tok['r']), T.radius.r],
  ['radius sm', px(tok['r-sm']), T.radius.sm],
  ['radius chip', px(tok['r-chip']), T.radius.chip],
  ['radius tile', px(tok['r-tile']), T.radius.tile],
  ['radius sheet', px(tok['r-sheet']), T.radius.sheet],
  ['tint runway', rgbaW(tok['tint-runway']), rgbaN(T.tint && T.tint.runway)],
];
let bad = 0;
for (const [k, w, n] of rows) {
  const ok = String(w).toLowerCase() === String(n).toLowerCase();
  if (!ok) bad++;
  console.log((ok ? 'ok  ' : 'DIFF') + '  ' + k.padEnd(16) + ' web ' + String(w).padEnd(22) + ' native ' + n);
}
// shape params: T.shape if the native build carries it
console.log('T.shape keys:', T.shape ? Object.keys(T.shape).join(',') : '(none)');
if (T.shape) {
  const S = T.shape;
  const sh = [
    ['rule.ink', tok['shape-rule-ink'], S.rule && S.rule.ink],
    ['leader.ink', tok['shape-leader-ink'], S.leader && S.leader.ink],
    ['band.fill', tok['shape-band-fill'], S.band && S.band.fill],
    ['keyline.ink', tok['shape-keyline-ink'], S.keyline && S.keyline.ink],
    ['cue.ink', tok['shape-cue-ink'], S.cue && S.cue.ink],
    ['rule.hair', px(tok['shape-rule-hair']), S.rule && S.rule.hair],
    ['leader.pitch', px(tok['shape-leader-pitch']), S.leader && S.leader.pitch],
  ];
  for (const [k, w, n] of sh) {
    const ok = String(w).toLowerCase() === String(n).toLowerCase();
    if (!ok) bad++;
    console.log((ok ? 'ok  ' : 'DIFF') + '  ' + k.padEnd(16) + ' web ' + String(w).padEnd(22) + ' native ' + n);
  }
}
console.log('fonts native:', T.fonts.keys.join(','), '| web --font', tok['font'], '| --font-display', tok['font-display']);
console.log('text.title', JSON.stringify(T.text.title), '| text.hero', JSON.stringify(T.text.hero), '| text.body', JSON.stringify(T.text.body));
console.log('tint keys sample', T.tint ? Object.keys(T.tint).slice(0, 40).join(',') : '');
console.log(bad ? bad + ' DIFF' : 'all equal');
process.exit(bad ? 1 : 0);
