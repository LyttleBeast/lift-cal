// Spot-check: the web's generated token block (vibes/iron-age.css) vs native T built from the same def.
import { readFileSync } from 'node:fs';
const NAT = '/Users/micahflunker/dev/vibes-night/wt/nat-v-iron-age';
const WEB = '/Users/micahflunker/dev/vibes-night/wt/web-v-iron-age';
const { open } = await import(NAT + '/tools/lib/vibe-snap.mjs');
const H = await open(NAT);
const { R } = H;
const THEME = R.load('src/ui/theme.js');
const V = R.load('src/state/vibe.js');
const entry = V.VIBE_DEFS['iron-age'];
const T = THEME.build(entry.def, { images: entry.images, fit: entry.fit });
const css = readFileSync(WEB + '/vibes/iron-age.css', 'utf8');
const block = css.slice(0, css.indexOf('/* vibes-css:end */'));
const vars = {};
for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
const px = v => (v === '0' ? 0 : parseFloat(v));
const rgbaN = s => s.replace(/\s+/g, '');
const rows = [
  ['colors.chalk', T.colors.chalk, vars['chalk']],
  ['colors.bar', T.colors.bar, vars['bar']],
  ['colors.rack', T.colors.rack, vars['rack']],
  ['colors.collar', T.colors.collar, vars['collar']],
  ['colors.accent', T.colors.accent, vars['accent']],
  ['colors.inverse', T.colors.inverse, vars['inverse']],
  ['colors.knockout', T.colors.knockout, vars['knockout']],
  ['colors.raised', T.colors.raised, vars['raised']],
  ['colors.warn', T.colors.warn, vars['warn']],
  ['colors.pYellow', T.colors.pYellow, vars['p-yellow']],
  ['tagInk.W', T.tagInk.W, vars['tag-ink-w']],
  ['tagInk.F', T.tagInk.F, vars['tag-ink-f']],
  ['tagInk.D', T.tagInk.D, vars['tag-ink-d']],
  ['inkOf.pYellow', T.inkOf.pYellow, vars['ink-of-p-yellow']],
  ['inkOf.pChrome', T.inkOf.pChrome, vars['ink-of-p-chrome']],
  ['radius.r', T.radius.r, px(vars['r'])],
  ['radius.plate', T.radius.plate, px(vars['r-plate'])],
  ['radius.chip', T.radius.chip, px(vars['r-chip'])],
  ['shape.rule.ink', T.shape.rule.ink, vars['shape-rule-ink']],
  ['shape.rule.hair', T.shape.rule.hair, px(vars['shape-rule-hair'])],
  ['shape.rule.head', JSON.stringify(T.shape.rule.head), JSON.stringify([0, 1, 2].map(i => px(vars['shape-rule-head-' + i])))],
  ['shape.rule.sub[0]', [].concat(T.shape.rule.sub)[0], px(vars['shape-rule-sub-0'])],
  ['shape.keyline.ink', T.shape.keyline.ink, vars['shape-keyline-ink']],
  ['shape.keyline.width', T.shape.keyline.width, px(vars['shape-keyline-width'])],
  ['shape.leader.ink', T.shape.leader.ink, vars['shape-leader-ink']],
  ['shape.leader.dot', T.shape.leader.dot, px(vars['shape-leader-dot'])],
  ['ring.calHead', JSON.stringify(T.ring.calHead), JSON.stringify({ borderWidth: 1, borderColor: (vars['shadow-cal-head'].match(/#[0-9a-f]{6}/) || [])[0] }) + ' (web: ' + vars['shadow-cal-head'] + ')'],
  ['tint.runway', rgbaN(String(T.tint.runway)), rgbaN(vars['tint-runway']).replace(/,\./g, ',0.')],
  ['images.summaryHero.band', T.images.summaryHero && T.images.summaryHero.band, px(vars['photo-band-summary-hero'])],
  ['chrome.shadow', T.chrome.shadow, vars['chalk']]
];
let bad = 0;
for (const [k, n, w] of rows) {
  const ok = String(n) === String(w) || (k === 'ring.calHead' && w.startsWith(String(n)));
  if (!ok) bad++;
  console.log((ok ? 'ok  ' : 'DIFF') + '  ' + k + '  native=' + n + '  web=' + w);
}
console.log('web font-display:', vars['font-display'], '| native faces:', T.fonts.keys.join(','));
console.log('web-only images slots:', Object.keys(T.images || {}).join(','));
console.log(bad ? bad + ' differ' : 'all agree');
process.exit(0);
